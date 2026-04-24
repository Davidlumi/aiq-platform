/**
 * Dashboard Router — AiQ Platform
 *
 * Provides data for all five role-specific dashboards:
 *   learner   — personal capability scores, learning progress, revalidation
 *   manager   — team readiness, risk hotspots, revalidation alerts
 *   hr        — org-wide KPIs, capability breakdown, compliance, incidents
 *   auditor   — evidence surface, policy incidents, audit log
 *   admin     — platform health, scoring config, system activity
 */
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys, getTenantPlan, planAtLeast } from "../db";
import { notifyOwner } from "../_core/notification";
import {
  users,
  userStates,
  credibilityScores,
  riskScores,
  assessmentSessions,
  assessmentScores,
  learningPlans,
  learningPlanItems,
  learningModules,
  contentProgress,
  policyEvaluations,
  revalidationSchedules,
  auditLogs,
  scoringConfig,
  tenantSettings,
  assessmentAnswers,
  contentScenarios,
} from "../../drizzle/schema";
import { eq, and, desc, isNull, sql, gte } from "drizzle-orm";

// ─── Capability keys (v10 taxonomy) ──────────────────────────────────────────
const CAPABILITY_KEYS = [
  "ai_interaction",
  "ai_output_evaluation",
  "ai_workflow_design",
  "workforce_ai_readiness",
  "ai_ethics_trust",
  "ai_change_leadership",
] as const;
type CapKey = typeof CAPABILITY_KEYS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract capability scores from a scoreBreakdownJson blob */
function extractCapabilityScores(breakdown: unknown): Record<CapKey, number> | null {
  if (!breakdown || typeof breakdown !== "object") return null;
  const bd = breakdown as Record<string, unknown>;
  const cap = bd.capabilityScores;
  if (!cap || typeof cap !== "object") return null;
  const result = {} as Record<CapKey, number>;
  for (const key of CAPABILITY_KEYS) {
    const v = (cap as Record<string, unknown>)[key];
    result[key] = typeof v === "number" ? v : 0;
  }
  return result;
}

/** Extract readiness classification from a scoreBreakdownJson blob */
function extractReadiness(breakdown: unknown): string | null {
  if (!breakdown || typeof breakdown !== "object") return null;
  const bd = breakdown as Record<string, unknown>;
  const r = bd.readiness;
  if (!r || typeof r !== "object") return null;
  return (r as Record<string, unknown>).state as string ?? null;
}

export const dashboardRouter = router({
  // ─── Learner Dashboard ──────────────────────────────────────────────────────
  learner: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const userId = ctx.user.id;

    // Current state
    const state = await db
      .select()
      .from(userStates)
      .where(and(eq(userStates.userId, userId), isNull(userStates.effectiveTo)))
      .orderBy(desc(userStates.effectiveFrom))
      .limit(1);

    // Latest credibility
    const credibility = await db
      .select()
      .from(credibilityScores)
      .where(eq(credibilityScores.userId, userId))
      .orderBy(desc(credibilityScores.generatedAt))
      .limit(1);

    // Latest risk
    const risk = await db
      .select()
      .from(riskScores)
      .where(eq(riskScores.userId, userId))
      .orderBy(desc(riskScores.generatedAt))
      .limit(1);

    // Active learning plan + progress
    const plan = await db
      .select()
      .from(learningPlans)
      .where(and(eq(learningPlans.userId, userId), eq(learningPlans.state, "active")))
      .orderBy(desc(learningPlans.generatedAt))
      .limit(1);

    let planProgress = null;
    if (plan[0]) {
      const items = await db
        .select()
        .from(learningPlanItems)
        .where(eq(learningPlanItems.learningPlanId, plan[0].id));
      const completed = items.filter(i => i.status === "completed").length;
      const inProgress = items.filter(i => i.status === "in_progress").length;
      planProgress = {
        total: items.length,
        completed,
        inProgress,
        percent: items.length > 0 ? Math.round((completed / items.length) * 100) : 0,
      };
    }

    // Revalidation schedule
    const revalidation = await db
      .select()
      .from(revalidationSchedules)
      .where(and(eq(revalidationSchedules.userId, userId), eq(revalidationSchedules.status, "pending")))
      .orderBy(revalidationSchedules.dueAt)
      .limit(1);

    // Last 5 completed assessments (score history)
    const recentSessions = await db
      .select({ id: assessmentSessions.id, completedAt: assessmentSessions.completedAt })
      .from(assessmentSessions)
      .where(and(eq(assessmentSessions.userId, userId), eq(assessmentSessions.state, "completed")))
      .orderBy(desc(assessmentSessions.completedAt))
      .limit(5);

    const scoreHistory: Array<{
      sessionId: string;
      completedAt: Date | null;
      overallScore: number;
      capabilityScores: Record<CapKey, number> | null;
      readiness: string | null;
    }> = [];

    for (const session of recentSessions) {
      const score = await db
        .select()
        .from(assessmentScores)
        .where(eq(assessmentScores.sessionId, session.id))
        .limit(1);
      if (score[0]) {
        scoreHistory.push({
          sessionId: session.id,
          completedAt: session.completedAt,
          overallScore: parseFloat(score[0].overallScore as unknown as string),
          capabilityScores: extractCapabilityScores(score[0].scoreBreakdownJson),
          readiness: extractReadiness(score[0].scoreBreakdownJson),
        });
      }
    }

    const latestCapabilityScores = scoreHistory[0]?.capabilityScores ?? null;
    const latestOverallScore = scoreHistory[0]?.overallScore ?? null;
    const latestReadiness = scoreHistory[0]?.readiness ?? null;

    const totalCompleted = await db
      .select({ count: sql<number>`count(*)` })
      .from(assessmentSessions)
      .where(and(eq(assessmentSessions.userId, userId), eq(assessmentSessions.state, "completed")));

    // ── Scenario callbacks: last session's answered items with outcome class ──
    let scenarioCallbacks: Array<{
      itemId: string;
      outcomeClass: string | null;
      capabilityKey: string | null;
      title: string | null;
    }> = [];
    if (recentSessions[0]) {
      const answers = await db
        .select({
          itemId: assessmentAnswers.itemId,
          outcomeClass: assessmentAnswers.outcomeClass,
        })
        .from(assessmentAnswers)
        .where(eq(assessmentAnswers.sessionId, recentSessions[0].id))
        .limit(20);
      // Enrich with scenario metadata where available (pre-authored items only)
      for (const ans of answers) {
        const scenario = await db
          .select({ title: contentScenarios.title, capabilityKey: contentScenarios.capabilityKey })
          .from(contentScenarios)
          .where(eq(contentScenarios.interactionId, ans.itemId))
          .limit(1);
        scenarioCallbacks.push({
          itemId: ans.itemId,
          outcomeClass: ans.outcomeClass,
          capabilityKey: scenario[0]?.capabilityKey ?? null,
          title: scenario[0]?.title ?? null,
        });
      }
    }

    // ── LLM narrative from latest score breakdown ──────────────────────────────
    let llmNarrative: { opening: string; strengths: string; development: string } | null = null;
    if (scoreHistory[0]) {
      const latestScore = await db
        .select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson })
        .from(assessmentScores)
        .where(eq(assessmentScores.sessionId, scoreHistory[0].sessionId))
        .limit(1);
      const bd = latestScore[0]?.scoreBreakdownJson as Record<string, unknown> | null;
      const raw = bd?.llmNarrative;
      if (raw && typeof raw === "object") {
        const n = raw as Record<string, unknown>;
        if (typeof n.opening === "string" && typeof n.strengths === "string" && typeof n.development === "string") {
          llmNarrative = { opening: n.opening, strengths: n.strengths, development: n.development };
        }
      }
    }

    return {
      state: state[0] ?? null,
      credibility: credibility[0] ?? null,
      risk: risk[0] ?? null,
      planProgress,
      revalidation: revalidation[0] ?? null,
      scoreHistory,
      latestCapabilityScores,
      latestOverallScore,
      latestReadiness,
      totalAssessmentsCompleted: Number(totalCompleted[0]?.count ?? 0),
      scenarioCallbacks,
      llmNarrative,
    };
  }),

  // ─── Manager Dashboard (B4: requires Readiness plan or above) ──────────────────────────────────────────
  manager: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader", "manager"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const tenantPlan = await getTenantPlan(ctx.user.tenantId);
    if (!planAtLeast(tenantPlan, "readiness")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Team dashboards require the Readiness plan or above" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const allUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        status: users.status,
        jobFunction: users.jobFunction,
        roleFamily: users.roleFamily,
      })
      .from(users)
      .where(eq(users.tenantId, ctx.user.tenantId));

    const teamData = await Promise.all(
      allUsers.map(async u => {
        const state = await db
          .select()
          .from(userStates)
          .where(and(eq(userStates.userId, u.id), isNull(userStates.effectiveTo)))
          .limit(1);
        const credibility = await db
          .select()
          .from(credibilityScores)
          .where(eq(credibilityScores.userId, u.id))
          .orderBy(desc(credibilityScores.generatedAt))
          .limit(1);
        const risk = await db
          .select()
          .from(riskScores)
          .where(eq(riskScores.userId, u.id))
          .orderBy(desc(riskScores.generatedAt))
          .limit(1);
        const recentSessions = await db
          .select({ id: assessmentSessions.id, completedAt: assessmentSessions.completedAt })
          .from(assessmentSessions)
          .where(and(eq(assessmentSessions.userId, u.id), eq(assessmentSessions.state, "completed")))
          .orderBy(desc(assessmentSessions.completedAt))
          .limit(5);
        let latestScore: number | null = null;
        let latestReadiness: string | null = null;
        const scoreHistory: Array<{ sessionId: string; completedAt: Date | null; overallScore: number; readiness: string | null }> = [];
        for (const sess of recentSessions) {
          const score = await db
            .select()
            .from(assessmentScores)
            .where(eq(assessmentScores.sessionId, sess.id))
            .limit(1);
          if (score[0]) {
            const s = parseFloat(score[0].overallScore as unknown as string);
            const r = extractReadiness(score[0].scoreBreakdownJson);
            scoreHistory.push({ sessionId: sess.id, completedAt: sess.completedAt, overallScore: s, readiness: r });
            if (scoreHistory.length === 1) { latestScore = s; latestReadiness = r; }
          }
        }
        const latestSession = recentSessions[0] ? [recentSessions[0]] : [];
        const reval = await db
          .select()
          .from(revalidationSchedules)
          .where(and(eq(revalidationSchedules.userId, u.id), eq(revalidationSchedules.status, "pending")))
          .orderBy(revalidationSchedules.dueAt)
          .limit(1);

        // Per-member capability shape (band per domain from latest score)
        let capabilityShape: Record<CapKey, number> | null = null;
        if (scoreHistory[0]) {
          const latestScoreRow = await db
            .select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson })
            .from(assessmentScores)
            .where(eq(assessmentScores.sessionId, scoreHistory[0].sessionId))
            .limit(1);
          capabilityShape = extractCapabilityScores(latestScoreRow[0]?.scoreBreakdownJson) ?? null;
        }

        // Active learning module (first in-progress item in active plan)
        let activeModule: { title: string; capability: string; progressPercent: number; durationMins: number } | null = null;
        const activePlan = await db
          .select({ id: learningPlans.id })
          .from(learningPlans)
          .where(and(eq(learningPlans.userId, u.id), eq(learningPlans.state, "active")))
          .orderBy(desc(learningPlans.generatedAt))
          .limit(1);
        if (activePlan[0]) {
          const inProgressItem = await db
            .select({ contentItemId: learningPlanItems.contentItemId })
            .from(learningPlanItems)
            .where(and(
              eq(learningPlanItems.learningPlanId, activePlan[0].id),
              eq(learningPlanItems.status, "in_progress")
            ))
            .orderBy(learningPlanItems.orderIndex)
            .limit(1);
          if (inProgressItem[0]) {
            const mod = await db
              .select({ title: learningModules.title, capability: learningModules.capability, durationMins: learningModules.durationMins })
              .from(learningModules)
              .where(eq(learningModules.id, inProgressItem[0].contentItemId))
              .limit(1);
            const prog = await db
              .select({ progressPercent: contentProgress.progressPercent })
              .from(contentProgress)
              .where(and(eq(contentProgress.userId, u.id), eq(contentProgress.contentItemId, inProgressItem[0].contentItemId)))
              .limit(1);
            if (mod[0]) {
              activeModule = {
                title: mod[0].title,
                capability: mod[0].capability,
                durationMins: mod[0].durationMins,
                progressPercent: prog[0] ? parseFloat(prog[0].progressPercent as unknown as string) : 0,
              };
            }
          }
        }

        // Conversation-due indicator: revalidation overdue or risk band high
        const conversationDue =
          (reval[0]?.dueAt && new Date(reval[0].dueAt) < new Date()) ||
          (risk[0] as any)?.band === "high";

        return {
          ...u,
          state: state[0] ?? null,
          credibility: credibility[0] ?? null,
          risk: risk[0] ?? null,
          latestScore,
          latestReadiness,
          scoreHistory,
          capabilityShape,
          activeModule,
          conversationDue: conversationDue ?? false,
          revalidationDue: reval[0]?.dueAt ?? null,
          lastAssessedAt: latestSession[0]?.completedAt ?? null,
        };
      })
    );

    const distribution = {
      total: teamData.length,
      safe: teamData.filter(u => u.latestReadiness === "safe").length,
      atRisk: teamData.filter(u => u.latestReadiness === "at_risk").length,
      unsafe: teamData.filter(u => u.latestReadiness === "unsafe").length,
      unknown: teamData.filter(u => !u.latestReadiness).length,
      highRisk: teamData.filter(u => u.risk?.band === "high").length,
      lowCredibility: teamData.filter(u => u.credibility?.band === "low").length,
      revalidationDueSoon: teamData.filter(u => {
        if (!u.revalidationDue) return false;
        const daysLeft = Math.ceil((new Date(u.revalidationDue).getTime() - Date.now()) / 86400000);
        return daysLeft <= 14;
      }).length,
    };

    // Capability gap analysis across team
    const capabilityAverages: Record<CapKey, { total: number; count: number }> = {} as any;
    for (const key of CAPABILITY_KEYS) capabilityAverages[key] = { total: 0, count: 0 };

    for (const member of teamData) {
      const latestSession = await db
        .select({ id: assessmentSessions.id })
        .from(assessmentSessions)
        .where(and(eq(assessmentSessions.userId, member.id), eq(assessmentSessions.state, "completed")))
        .orderBy(desc(assessmentSessions.completedAt))
        .limit(1);
      if (latestSession[0]) {
        const score = await db
          .select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson })
          .from(assessmentScores)
          .where(eq(assessmentScores.sessionId, latestSession[0].id))
          .limit(1);
        if (score[0]) {
          const caps = extractCapabilityScores(score[0].scoreBreakdownJson);
          if (caps) {
            for (const key of CAPABILITY_KEYS) {
              capabilityAverages[key].total += caps[key];
              capabilityAverages[key].count += 1;
            }
          }
        }
      }
    }

    const capabilityGaps = CAPABILITY_KEYS.map(key => ({
      capability: key,
      avgScore: capabilityAverages[key].count > 0
        ? Math.round(capabilityAverages[key].total / capabilityAverages[key].count)
        : null,
    })).sort((a, b) => (a.avgScore ?? 100) - (b.avgScore ?? 100));

    // P2-CC-3: Quarterly re-verification notification trigger
    // If quarterly review is enabled and there are overdue revalidations, notify the owner
    try {
      const settings = await db
        .select()
        .from(tenantSettings)
        .where(eq(tenantSettings.tenantId, ctx.user.tenantId))
        .limit(1);
      const quarterlyEnabled = (settings[0] as any)?.quarterlyReviewEnabled ?? false;
      const overdueCount = teamData.filter(u => u.revalidationDue && new Date(u.revalidationDue) < new Date()).length;
      if (quarterlyEnabled && overdueCount > 0) {
        // Fire-and-forget notification — don't block the response
        notifyOwner({
          title: `Revalidation Alert — ${overdueCount} team member${overdueCount !== 1 ? "s" : ""} overdue`,
          content: `${overdueCount} team member${overdueCount !== 1 ? "s" : ""} in your organisation ${overdueCount !== 1 ? "have" : "has"} overdue capability revalidations. Quarterly re-verification is enabled. Please review the Manager Dashboard and prompt the relevant employees to complete their reassessment.`,
        }).catch(() => {/* ignore notification failures */});
      }
    } catch { /* ignore settings fetch errors */ }

    return { team: teamData, distribution, capabilityGaps };
  }),

  // ─── HR Leader Dashboard ────────────────────────────────────────────────────
  hr: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const allUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, ctx.user.tenantId));

    const states = await Promise.all(
      allUsers.map(async u => {
        const state = await db
          .select()
          .from(userStates)
          .where(and(eq(userStates.userId, u.id), isNull(userStates.effectiveTo)))
          .limit(1);
        return state[0] ?? null;
      })
    );
    const validStates = states.filter(Boolean) as NonNullable<typeof states[0]>[];

    // Readiness distribution from latest assessment scores
    const readinessCounts = { safe: 0, at_risk: 0, unsafe: 0, unknown: 0 };
    const capabilityTotals: Record<CapKey, { total: number; count: number }> = {} as any;
    for (const key of CAPABILITY_KEYS) capabilityTotals[key] = { total: 0, count: 0 };

    for (const u of allUsers) {
      const latestSession = await db
        .select({ id: assessmentSessions.id })
        .from(assessmentSessions)
        .where(and(eq(assessmentSessions.userId, u.id), eq(assessmentSessions.state, "completed")))
        .orderBy(desc(assessmentSessions.completedAt))
        .limit(1);
      if (latestSession[0]) {
        const score = await db
          .select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson })
          .from(assessmentScores)
          .where(eq(assessmentScores.sessionId, latestSession[0].id))
          .limit(1);
        if (score[0]) {
          const readiness = extractReadiness(score[0].scoreBreakdownJson);
          if (readiness === "safe") readinessCounts.safe++;
          else if (readiness === "at_risk") readinessCounts.at_risk++;
          else if (readiness === "unsafe") readinessCounts.unsafe++;
          else readinessCounts.unknown++;
          const caps = extractCapabilityScores(score[0].scoreBreakdownJson);
          if (caps) {
            for (const key of CAPABILITY_KEYS) {
              capabilityTotals[key].total += caps[key];
              capabilityTotals[key].count += 1;
            }
          }
        } else {
          readinessCounts.unknown++;
        }
      } else {
        readinessCounts.unknown++;
      }
    }

    const capabilityBreakdown = CAPABILITY_KEYS.map(key => ({
      capability: key,
      avgScore: capabilityTotals[key].count > 0
        ? Math.round(capabilityTotals[key].total / capabilityTotals[key].count)
        : null,
      assessedCount: capabilityTotals[key].count,
    }));

    const complianceDistribution = {
      compliant: validStates.filter(s => s.complianceState === "compliant").length,
      atRisk: validStates.filter(s => s.complianceState === "at_risk").length,
      breach: validStates.filter(s => s.complianceState === "breach").length,
      noData: allUsers.length - validStates.length,
    };

    const riskDistribution = {
      low: validStates.filter(s => s.riskState === "low").length,
      medium: validStates.filter(s => s.riskState === "medium").length,
      high: validStates.filter(s => s.riskState === "high").length,
    };

    const allRevals = await db
      .select()
      .from(revalidationSchedules)
      .where(eq(revalidationSchedules.status, "pending"))
      .orderBy(revalidationSchedules.dueAt);
    const now = new Date();
    const revalidationStats = {
      overdue: allRevals.filter(r => new Date(r.dueAt) < now).length,
      dueSoon: allRevals.filter(r => {
        const d = new Date(r.dueAt);
        const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
        return days >= 0 && days <= 14;
      }).length,
      total: allRevals.length,
    };

    const incidents = await db
      .select()
      .from(policyEvaluations)
      .orderBy(desc(policyEvaluations.createdAt))
      .limit(8);
    const triggeredIncidents = incidents.filter(e => e.result !== "no_action");

    const recentAudit = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, ctx.user.tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(8);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const recentAssessments = await db
      .select({ count: sql<number>`count(*)` })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.tenantId, ctx.user.tenantId),
        eq(assessmentSessions.state, "completed"),
        gte(assessmentSessions.completedAt, thirtyDaysAgo)
      ));

    return {
      totalUsers: allUsers.length,
      readinessDistribution: { ...readinessCounts, total: allUsers.length },
      capabilityBreakdown,
      complianceDistribution,
      riskDistribution,
      revalidationStats,
      recentIncidents: triggeredIncidents,
      recentAudit,
      assessmentsLast30Days: Number(recentAssessments[0]?.count ?? 0),
    };
  }),

  // ─── A1: Org Readiness Trajectory (CPO view) ───────────────────────────────
  // Monthly average overall score for the last 12 months + linear projection to
  // the 70-point "safe" threshold.
  orgTrajectory: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader", "manager"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const twelveMonthsAgo = new Date(Date.now() - 365 * 86400000);
    const sessions = await db
      .select({ id: assessmentSessions.id, completedAt: assessmentSessions.completedAt })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.tenantId, ctx.user.tenantId),
        eq(assessmentSessions.state, "completed"),
        gte(assessmentSessions.completedAt, twelveMonthsAgo),
      ))
      .orderBy(assessmentSessions.completedAt);
    const monthBuckets: Record<string, { total: number; count: number }> = {};
    for (const sess of sessions) {
      if (!sess.completedAt) continue;
      const score = await db
        .select({ overallScore: assessmentScores.overallScore })
        .from(assessmentScores)
        .where(eq(assessmentScores.sessionId, sess.id))
        .limit(1);
      if (!score[0]) continue;
      const d = new Date(sess.completedAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthBuckets[monthKey]) monthBuckets[monthKey] = { total: 0, count: 0 };
      monthBuckets[monthKey].total += parseFloat(String(score[0].overallScore));
      monthBuckets[monthKey].count += 1;
    }
    const dataPoints = Object.entries(monthBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { total, count }]) => ({
        month,
        avgScore: Math.round(total / count),
        assessmentCount: count,
      }));
    const SAFE_THRESHOLD = 70;
    let projectedMonthsToSafe: number | null = null;
    if (dataPoints.length >= 2) {
      const recent = dataPoints.slice(-3);
      const n = recent.length;
      const avgSlope = n >= 2
        ? (recent[n - 1].avgScore - recent[0].avgScore) / Math.max(n - 1, 1)
        : 0;
      const latestScore = recent[n - 1].avgScore;
      if (avgSlope > 0 && latestScore < SAFE_THRESHOLD) {
        projectedMonthsToSafe = Math.ceil((SAFE_THRESHOLD - latestScore) / avgSlope);
      } else if (latestScore >= SAFE_THRESHOLD) {
        projectedMonthsToSafe = 0;
      }
    }
    return {
      dataPoints,
      safeThreshold: SAFE_THRESHOLD,
      projectedMonthsToSafe,
      currentAvgScore: dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].avgScore : null,
      dataPointCount: dataPoints.length,
    };
  }),

  // ─── A2: Strategic Mismatch (CPO view) ───────────────────────────────────────
  // Compares org capability averages against AI ambition level (1-5) from
  // tenant_settings to surface domains where workforce is below strategy.
  orgStrategicMismatch: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader", "manager"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const settings = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, ctx.user.tenantId))
      .limit(1);
    const aiAmbitionLevel: number = Math.min(5, Math.max(1, (settings[0] as any)?.aiAmbitionLevel ?? 3));
    // Required score per domain per ambition level [L1..L5]
    const AMBITION_THRESHOLDS: Record<string, number[]> = {
      ai_interaction:         [40, 50, 60, 68, 75],
      ai_output_evaluation:   [45, 55, 63, 70, 78],
      ai_workflow_design:     [35, 45, 55, 65, 72],
      workforce_ai_readiness: [35, 45, 55, 65, 72],
      ai_ethics_trust:        [50, 58, 65, 72, 78],
      ai_change_leadership:   [40, 50, 58, 65, 72],
    };
    const CAP_LABELS: Record<string, string> = {
      ai_interaction: "AI Interaction",
      ai_output_evaluation: "Output Evaluation",
      ai_workflow_design: "Workflow Design",
      workforce_ai_readiness: "Workforce Readiness",
      ai_ethics_trust: "Ethics & Trust",
      ai_change_leadership: "Change Leadership",
    };
    const allUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, ctx.user.tenantId));
    const capTotals: Record<string, { total: number; count: number }> = {};
    for (const key of CAPABILITY_KEYS) capTotals[key] = { total: 0, count: 0 };
    for (const u of allUsers) {
      const latestSession = await db
        .select({ id: assessmentSessions.id })
        .from(assessmentSessions)
        .where(and(eq(assessmentSessions.userId, u.id), eq(assessmentSessions.state, "completed")))
        .orderBy(desc(assessmentSessions.completedAt))
        .limit(1);
      if (!latestSession[0]) continue;
      const score = await db
        .select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson })
        .from(assessmentScores)
        .where(eq(assessmentScores.sessionId, latestSession[0].id))
        .limit(1);
      if (!score[0]) continue;
      const caps = extractCapabilityScores(score[0].scoreBreakdownJson);
      if (!caps) continue;
      for (const key of CAPABILITY_KEYS) {
        capTotals[key].total += caps[key];
        capTotals[key].count += 1;
      }
    }
    const domains = CAPABILITY_KEYS.map(key => {
      const avg = capTotals[key].count > 0
        ? Math.round(capTotals[key].total / capTotals[key].count)
        : null;
      const required = AMBITION_THRESHOLDS[key]?.[aiAmbitionLevel - 1] ?? 55;
      const gap = avg !== null ? required - avg : null;
      const severity: "none" | "minor" | "moderate" | "critical" =
        gap === null ? "none"
        : gap <= 0 ? "none"
        : gap <= 8 ? "minor"
        : gap <= 18 ? "moderate"
        : "critical";
      return { key, label: CAP_LABELS[key] ?? key, avgScore: avg, requiredScore: required, gap, severity };
    });
    const mismatches = domains.filter(d => d.severity !== "none");
    const AMBITION_LABELS = ["Exploratory", "Developing", "Scaling", "Advanced", "AI-Native"];
    return {
      aiAmbitionLevel,
      aiAmbitionLabel: AMBITION_LABELS[aiAmbitionLevel - 1] ?? "Scaling",
      domains,
      mismatchCount: mismatches.length,
      criticalMismatches: mismatches.filter(d => d.severity === "critical").length,
      assessedUserCount: allUsers.length,
    };
  }),

  // ─── Auditor Dashboard (B4: requires Enterprise plan) ──────────────────────────────────────────
  auditor: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "auditor"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const tenantPlan = await getTenantPlan(ctx.user.tenantId);
    if (!planAtLeast(tenantPlan, "enterprise")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Audit log access requires the Enterprise plan" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const recentLogs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, ctx.user.tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);

    const allIncidents = await db
      .select()
      .from(policyEvaluations)
      .orderBy(desc(policyEvaluations.createdAt))
      .limit(50);
    const policyIncidents = allIncidents.filter(e => e.result !== "no_action");

    const totalAuditEvents = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, ctx.user.tenantId));
    const totalIncidents = await db
      .select({ count: sql<number>`count(*)` })
      .from(policyEvaluations)
      .where(sql`result != 'no_action'`);
    const totalSessions = await db
      .select({ count: sql<number>`count(*)` })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.tenantId, ctx.user.tenantId),
        eq(assessmentSessions.state, "completed")
      ));

    const incidentsByType: Record<string, number> = {};
    for (const inc of policyIncidents) {
      const t = inc.result ?? "unknown";
      incidentsByType[t] = (incidentsByType[t] ?? 0) + 1;
    }

    return {
      recentLogs,
      policyIncidents,
      evidenceCounts: {
        auditEvents: Number(totalAuditEvents[0]?.count ?? 0),
        policyIncidents: Number(totalIncidents[0]?.count ?? 0),
        completedSessions: Number(totalSessions[0]?.count ?? 0),
      },
      incidentsByType,
    };
  }),

  // ─── Admin Dashboard ────────────────────────────────────────────────────────
  admin: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const allUsers = await db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.tenantId, ctx.user.tenantId));
    const allTenants = await db.select({ tenantId: users.tenantId }).from(users);
    const uniqueTenants = new Set(allTenants.map(t => t.tenantId)).size;

    const totalSessions = await db
      .select({ count: sql<number>`count(*)` })
      .from(assessmentSessions)
      .where(eq(assessmentSessions.tenantId, ctx.user.tenantId));
    const completedSessions = await db
      .select({ count: sql<number>`count(*)` })
      .from(assessmentSessions)
      .where(and(eq(assessmentSessions.tenantId, ctx.user.tenantId), eq(assessmentSessions.state, "completed")));
    const inProgressSessions = await db
      .select({ count: sql<number>`count(*)` })
      .from(assessmentSessions)
      .where(and(eq(assessmentSessions.tenantId, ctx.user.tenantId), eq(assessmentSessions.state, "in_progress")));

    const incidents = await db
      .select()
      .from(policyEvaluations)
      .orderBy(desc(policyEvaluations.createdAt))
      .limit(5);

    const recentActivity = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, ctx.user.tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20);

    const activeCfg = await db
      .select()
      .from(scoringConfig)
      .where(eq(scoringConfig.isActive, true))
      .limit(1);

    const activeUsers = allUsers.filter(u => u.status === "active").length;
    const pendingUsers = allUsers.filter(u => u.status === "pending").length;
    const suspendedUsers = allUsers.filter(u => u.status === "suspended").length;

    return {
      totalUsers: allUsers.length,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      totalTenants: uniqueTenants,
      totalSessions: Number(totalSessions[0]?.count ?? 0),
      completedSessions: Number(completedSessions[0]?.count ?? 0),
      inProgressSessions: Number(inProgressSessions[0]?.count ?? 0),
      policyIncidents: incidents.filter(e => e.result !== "no_action").length,
      recentActivity,
      activeScoringConfig: activeCfg[0] ? {
        version: activeCfg[0].version,
        calibrationSource: activeCfg[0].calibrationSource,
        contributionCap: activeCfg[0].contributionCap,
        contributionMultiplier: activeCfg[0].contributionMultiplier,
        blockingFailureMinItems: activeCfg[0].blockingFailureMinItems,
        downgradeFailureMinItems: activeCfg[0].downgradeFailureMinItems,
      } : null,
    };
  }),
});
