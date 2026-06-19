/**
 * Dashboard V2 Router — AiQ Dashboard Specification v1.1
 *
 * Three role-based dashboards: Individual, Manager, Leader
 * Replaces the legacy dashboard router for the three primary surfaces.
 */
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys, getTenantPlan, planAtLeast } from "../db";
import {
  users,
  userStates,
  assessmentSessions,
  assessmentScores,
  assessmentAnswers,
  revalidationSchedules,
  adaptiveLearningPlans,
  adaptivePlanItems,
  learningModules,
  managerTeamMembers,
  auditLogs,
  canonicalSignals,
  gapAnalyses,
  contentScenarios,
  contentScenarioOptions,
  ailOrgContext,
} from "../../drizzle/schema";
import { eq, and, desc, isNull, sql, gte, inArray, asc } from "drizzle-orm";
import {
  DOMAIN_KEYS,
  DOMAIN_LABELS,
  DOMAIN_DESCRIPTIONS,
  DOMAIN_COLOURS,
  RATING_KEYS,
  RATING_LABELS,
  stateToRating,
  confidenceBand,
  archetypeToRoleFamily,
  roleFamilyFromUserField,
  ROLE_FAMILY_KEYS,
  ROLE_FAMILY_LABELS,
  type DomainKey,
  type RatingKey,
  type RoleFamilyKey,
  ANONYMISATION_THRESHOLD,
} from "../../shared/dashboard";
import { getSectorBenchmark, getAllSectorBenchmarks } from "../contentLibrary";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractCapabilityScores(breakdown: unknown): Record<DomainKey, number> | null {
  if (!breakdown || typeof breakdown !== "object") return null;
  const bd = breakdown as Record<string, unknown>;
  const cap = bd.capabilityScores;
  if (!cap || typeof cap !== "object") return null;
  const result = {} as Record<DomainKey, number>;
  for (const key of DOMAIN_KEYS) {
    const entry = (cap as Record<string, unknown>)[key];
    if (entry && typeof entry === "object" && "score" in (entry as any)) {
      result[key] = Number((entry as any).score) || 0;
    } else {
      const v = (cap as Record<string, unknown>)[key];
      result[key] = typeof v === "number" ? v : 0;
    }
  }
  return result;
}

function extractDomainRatings(breakdown: unknown): Record<DomainKey, { score: number; band: string; signalCount: number }> | null {
  if (!breakdown || typeof breakdown !== "object") return null;
  const bd = breakdown as Record<string, unknown>;
  const cap = bd.capabilityScores;
  if (!cap || typeof cap !== "object") return null;
  // totalAnswers at top level is used as a proxy for evidence depth
  const totalAnswers = Number(bd.totalAnswers) || 0;
  const result = {} as Record<DomainKey, { score: number; band: string; signalCount: number }>;
  for (const key of DOMAIN_KEYS) {
    const entry = (cap as Record<string, unknown>)[key];
    if (entry !== undefined && entry !== null) {
      if (typeof entry === "object") {
        // Rich object format: { score, band, signalCount }
        const e = entry as Record<string, unknown>;
        result[key] = {
          score: Number(e.score) || 0,
          band: (e.band as string) ?? "needs_work",
          signalCount: Number(e.signalCount) || totalAnswers,
        };
      } else {
        // Plain number format: score is the value directly
        const score = Number(entry) || 0;
        result[key] = {
          score,
          band: score >= 70 ? "good" : score >= 50 ? "developing" : "needs_work",
          signalCount: totalAnswers,
        };
      }
    } else {
      result[key] = { score: 0, band: "needs_work", signalCount: 0 };
    }
  }
  return result;
}

function extractReadinessState(breakdown: unknown): string | null {
  if (!breakdown || typeof breakdown !== "object") return null;
  const bd = breakdown as Record<string, unknown>;
  const r = bd.readiness;
  if (!r || typeof r !== "object") return null;
  return ((r as Record<string, unknown>).state as string) ?? null;
}

function extractReadinessLabel(breakdown: unknown): string | null {
  if (!breakdown || typeof breakdown !== "object") return null;
  const bd = breakdown as Record<string, unknown>;
  const r = bd.readiness;
  if (!r || typeof r !== "object") return null;
  return ((r as Record<string, unknown>).label as string) ?? null;
}

function extractReadinessDescription(breakdown: unknown): string | null {
  if (!breakdown || typeof breakdown !== "object") return null;
  const bd = breakdown as Record<string, unknown>;
  const r = bd.readiness;
  if (!r || typeof r !== "object") return null;
  return ((r as Record<string, unknown>).participantDescription as string) ?? null;
}

function extractCompositeConfidence(breakdown: unknown): number | null {
  if (!breakdown || typeof breakdown !== "object") return null;
  const bd = breakdown as Record<string, unknown>;
  const conf = bd.compositeConfidence;
  if (typeof conf === "number") return conf;
  // Also check inside readiness
  const r = bd.readiness;
  if (r && typeof r === "object") {
    const rc = (r as Record<string, unknown>).compositeConfidence;
    if (typeof rc === "number") return rc;
  }
  return null;
}

function extractSignalScores(signalScoresJson: unknown): Array<{ signalKey: string; score: number; level: string; description: string }> {
  if (!signalScoresJson || typeof signalScoresJson !== "object") return [];
  const signals = signalScoresJson as Record<string, unknown>;
  return Object.entries(signals).map(([key, val]) => {
    if (val && typeof val === "object") {
      const v = val as Record<string, unknown>;
      return {
        signalKey: key,
        score: Number(v.score) || 0,
        level: bandToLevel(Number(v.score) || 0),
        description: (v.description as string) ?? key.replace(/_/g, " "),
      };
    }
    return { signalKey: key, score: Number(val) || 0, level: "developing", description: key.replace(/_/g, " ") };
  });
}

function bandToLevel(score: number): string {
  if (score >= 75) return "Strong";
  if (score >= 55) return "Developing";
  return "Critical";
}

/** Generate contextual rating explanation */
function generateRatingExplanation(rating: RatingKey, domainScores: Record<DomainKey, number> | null): string {
  if (!domainScores) return RATING_LABELS[rating];
  const sorted = DOMAIN_KEYS.map(k => ({ key: k, score: domainScores[k] })).sort((a, b) => a.score - b.score);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];
  switch (rating) {
    case "ai_ready":
      return `AI Ready — strong capability demonstrated across all domains. Your strongest area is ${DOMAIN_LABELS[strongest.key]}.`;
    case "developing":
      return `Developing — your foundation is solid; targeted growth needed in ${DOMAIN_LABELS[weakest.key]}.`;
    case "not_yet_ready":
      return `Not Yet Ready — significant gaps identified, particularly in ${DOMAIN_LABELS[weakest.key]}. Structured development recommended.`;
    case "foundation_gap":
      return `Foundation Gap — core capability in ${DOMAIN_LABELS[weakest.key]} needs building before progressing to advanced domains.`;
    case "insufficient_evidence":
      return `Insufficient Evidence — more assessment data needed to produce a reliable capability profile.`;
  }
}

/** Get latest score breakdown for a user */
async function getLatestScoreData(db: any, userId: string) {
  const latestSession = await db
    .select({ id: assessmentSessions.id, completedAt: assessmentSessions.completedAt, roleArchetypeId: assessmentSessions.roleArchetypeId })
    .from(assessmentSessions)
    .where(and(eq(assessmentSessions.userId, userId), eq(assessmentSessions.state, "completed")))
    .orderBy(desc(assessmentSessions.completedAt))
    .limit(1);
  if (!latestSession[0]) return null;
  const score = await db
    .select()
    .from(assessmentScores)
    .where(eq(assessmentScores.sessionId, latestSession[0].id))
    .limit(1);
  if (!score[0]) return null;
  return {
    sessionId: latestSession[0].id,
    completedAt: latestSession[0].completedAt,
    roleArchetypeId: latestSession[0].roleArchetypeId,
    overallScore: parseFloat(String(score[0].overallScore)),
    scoreBreakdownJson: score[0].scoreBreakdownJson,
    signalScoresJson: score[0].signalScoresJson,
  };
}

// ─── Individual Dashboard ────────────────────────────────────────────────────

const individualRouter = router({
  /** Main Individual Dashboard data */
  main: protectedProcedure
    .input(z.object({ userId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const targetUserId = input?.userId ?? ctx.user.id;

      // If viewing another user, check permissions
      if (targetUserId !== ctx.user.id) {
        const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
        if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader", "manager"].includes(r))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      // User info
      const userRow = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
      if (!userRow[0]) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      const u = userRow[0];

      // All completed assessments (score history)
      const completedSessions = await db
        .select({ id: assessmentSessions.id, completedAt: assessmentSessions.completedAt })
        .from(assessmentSessions)
        .where(and(eq(assessmentSessions.userId, targetUserId), eq(assessmentSessions.state, "completed")))
        .orderBy(asc(assessmentSessions.completedAt));

      const assessmentHistory: Array<{
        sessionId: string;
        date: string;
        overallScore: number;
        rating: RatingKey;
      }> = [];

      let latestBreakdown: unknown = null;
      let latestSignalScores: unknown = null;
      let latestOverallScore: number | null = null;
      let latestRating: RatingKey = "insufficient_evidence";
      let latestConfidence: number | null = null;
      let ratingExplanation = "";
      let domainScores: Record<DomainKey, number> | null = null;
      let domainRatings: Record<DomainKey, { score: number; band: string; signalCount: number }> | null = null;

      for (const sess of completedSessions) {
        const score = await db
          .select()
          .from(assessmentScores)
          .where(eq(assessmentScores.sessionId, sess.id))
          .limit(1);
        if (score[0]) {
          const overall = parseFloat(String(score[0].overallScore));
          const state = extractReadinessState(score[0].scoreBreakdownJson);
          const rating = stateToRating(state);
          assessmentHistory.push({
            sessionId: sess.id,
            date: sess.completedAt?.toISOString() ?? new Date().toISOString(),
            overallScore: Math.round(overall),
            rating,
          });
          // Keep latest
          latestBreakdown = score[0].scoreBreakdownJson;
          latestSignalScores = score[0].signalScoresJson;
          latestOverallScore = Math.round(overall);
          latestRating = rating;
          latestConfidence = extractCompositeConfidence(score[0].scoreBreakdownJson);
          domainScores = extractCapabilityScores(score[0].scoreBreakdownJson);
          domainRatings = extractDomainRatings(score[0].scoreBreakdownJson);
        }
      }

      ratingExplanation = generateRatingExplanation(latestRating, domainScores);

      // Revalidation schedule
      const revalidation = await db
        .select()
        .from(revalidationSchedules)
        .where(and(eq(revalidationSchedules.userId, targetUserId), eq(revalidationSchedules.status, "pending")))
        .orderBy(revalidationSchedules.dueAt)
        .limit(1);

      // Build domain cards
      const domains = DOMAIN_KEYS.map(key => {
        const score = domainScores?.[key] ?? 0;
        const detail = domainRatings?.[key];
        const domainRating = detail ? stateToRating(
          score >= 75 ? "safe" : score >= 55 ? "at_risk" : score >= 40 ? "unsafe" : "foundation_gap"
        ) : "insufficient_evidence";
        return {
          key,
          name: DOMAIN_LABELS[key],
          description: DOMAIN_DESCRIPTIONS[key],
          colour: DOMAIN_COLOURS[key],
          score: Math.round(score),
          rating: domainRating,
          signalCount: detail?.signalCount ?? 0,
          hasEvidence: (detail?.signalCount ?? 0) >= 3,
        };
      });

      // Gap heatmap — targets from gap analysis
      const latestGap = await db
        .select()
        .from(gapAnalyses)
        .where(eq(gapAnalyses.userId, targetUserId))
        .orderBy(desc(gapAnalyses.generatedAt))
        .limit(1);
      const gapData = latestGap[0]?.capabilityGapsJson as Record<string, any> | null;

      // Build a flat lookup of all gap entries by capability key (gap analysis may use
      // different key names than DOMAIN_KEYS, e.g. "execution" vs "ai_interaction")
      const allGapEntries: Record<string, any> = {};
      if (gapData) {
        for (const [k, v] of Object.entries(gapData)) {
          allGapEntries[k] = v;
          // Also index by the "capability" field inside the entry if present
          if (v?.capability && v.capability !== k) allGapEntries[v.capability] = v;
        }
      }
      const gapHeatmap = DOMAIN_KEYS.map(key => {
        const current = domainScores?.[key] ?? null;
        // Try exact key first, then fall back to any entry whose capability field matches
        const gapEntry = allGapEntries[key] ?? null;
        const target = gapEntry?.benchmark ?? null;
        const gap = current !== null && target !== null ? target - current : null;
        return {
          domain: key,
          domainName: DOMAIN_LABELS[key],
          currentScore: current !== null ? Math.round(current) : null,
          targetScore: target !== null ? Math.round(target) : null,
          gapValue: gap !== null ? Math.round(gap) : null,
        };
      });
      // Also include any gap entries that don't map to DOMAIN_KEYS (e.g. HR-specific keys)
      const extraGapRows = Object.entries(allGapEntries)
        .filter(([k]) => !DOMAIN_KEYS.includes(k as any) && allGapEntries[k]?.benchmark != null)
        .map(([k, v]) => ({
          domain: k,
          domainName: v.label ?? k.replace(/_/g, " "),
          currentScore: v.score != null ? Math.round(v.score) : null,
          targetScore: Math.round(v.benchmark),
          gapValue: v.gap != null ? Math.round(v.gap) : null,
        }))
        // Deduplicate
        .filter((r, i, arr) => arr.findIndex(x => x.domain === r.domain) === i);
      const fullGapHeatmap = [...gapHeatmap.filter(r => r.currentScore !== null || r.targetScore !== null), ...extraGapRows];

      // Learning plan summary
      const activePlan = await db
        .select()
        .from(adaptiveLearningPlans)
        .where(and(eq(adaptiveLearningPlans.userId, targetUserId), eq(adaptiveLearningPlans.state, "active")))
        .orderBy(desc(adaptiveLearningPlans.generatedAt))
        .limit(1);

      let planSummary: { moduleCount: number; totalEstimatedMinutes: number; completionPercentage: number; generating: boolean } | null = null;
      if (activePlan[0]) {
        const items = await db
          .select()
          .from(adaptivePlanItems)
          .where(eq(adaptivePlanItems.planId, activePlan[0].id));
        const completed = items.filter(i => i.status === "completed").length;
        // Get estimated times from modules
        const moduleIds = items.map(i => i.moduleId);
        let totalMins = activePlan[0].estimatedTotalMins || 0;
        if (totalMins === 0 && moduleIds.length > 0) {
          const modules = await db
            .select({ durationMins: learningModules.durationMins })
            .from(learningModules)
            .where(inArray(learningModules.id, moduleIds));
          totalMins = modules.reduce((sum, m) => sum + (m.durationMins ?? 15), 0);
        }
        planSummary = {
          moduleCount: items.length,
          totalEstimatedMinutes: totalMins,
          completionPercentage: items.length > 0 ? Math.round((completed / items.length) * 100) : 0,
          generating: false,
        };
      }

      const lastAssessmentDate = completedSessions.length > 0
        ? completedSessions[completedSessions.length - 1].completedAt?.toISOString() ?? null
        : null;
      const nextReassessmentDate = revalidation[0]?.dueAt?.toISOString() ?? null;

      return {
        user: {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          roleFamily: u.roleFamily,
          jobFunction: u.jobFunction,
        },
        lastAssessmentDate,
        nextReassessmentDate,
        overallScore: latestOverallScore,
        overallRating: latestRating,
        ratingExplanation,
        confidenceBand: confidenceBand(latestConfidence),
        assessmentHistory,
        domains,
        gapHeatmap: fullGapHeatmap,
        planSummary,
        // For target line on score progress chart
        roleTarget: fullGapHeatmap.length > 0 ? Math.round(
          fullGapHeatmap.reduce((sum, r) => sum + (r.targetScore ?? 0), 0) / fullGapHeatmap.filter(r => r.targetScore !== null).length
        ) : null,
        businessContext: null, // Will be populated when AI roadmap is implemented
      };
    }),

  /** AI-generated personalised assessment summary paragraph */
  aiSummary: protectedProcedure
    .input(z.object({ userId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const targetUserId = input?.userId ?? ctx.user.id;
      const scoreData = await getLatestScoreData(db, targetUserId);
      if (!scoreData) return { summary: null };
      const userRow = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
      const u = userRow[0];
      const domainScores = extractCapabilityScores(scoreData.scoreBreakdownJson);
      const domainRatings = extractDomainRatings(scoreData.scoreBreakdownJson);
      const overallScore = Math.round(scoreData.overallScore);
      const readinessState = extractReadinessState(scoreData.scoreBreakdownJson);
      const rating = stateToRating(readinessState);
      const ratingLabel = generateRatingExplanation(rating, domainScores);
      const domainLines = domainScores
        ? DOMAIN_KEYS.map(k => `${DOMAIN_LABELS[k]}: ${Math.round(domainScores[k])}/100`).join(", ")
        : "";
      const jobFunction = u?.jobFunction ?? "HR professional";
      const prompt = `You are an expert AI capability coach. Write a single concise paragraph (3-4 sentences, max 80 words) summarising this person's AI capability profile. Be specific, warm, and actionable. Do not use bullet points or headers.

Profile:
- Name: ${u?.firstName ?? "the user"}
- Role: ${jobFunction}
- Overall score: ${overallScore}/100 (${ratingLabel})
- Domain scores: ${domainLines}

Focus on their strongest area, their biggest development opportunity, and one concrete next step.`;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a concise, expert AI capability coach. Write only the paragraph, no preamble." },
            { role: "user", content: prompt },
          ],
          maxTokens: 200,
          thinkingBudget: 0,
        });
        const raw = response?.choices?.[0]?.message?.content;
        const summary = typeof raw === "string" ? raw.trim() : null;
        return { summary };
      } catch {
        return { summary: null };
      }
    }),

  /** Domain drill-down: Light + Medium */
  domainDetail: protectedProcedure
    .input(z.object({ userId: z.string().optional(), domainKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const targetUserId = input.userId ?? ctx.user.id;
      const domainKey = input.domainKey as DomainKey;

      if (!DOMAIN_KEYS.includes(domainKey)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid domain key" });
      }

      // If viewing another user, check permissions
      if (targetUserId !== ctx.user.id) {
        const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
        if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader", "manager"].includes(r))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      const scoreData = await getLatestScoreData(db, targetUserId);
      if (!scoreData) {
        return {
          domainKey,
          domainName: DOMAIN_LABELS[domainKey],
          domainColour: DOMAIN_COLOURS[domainKey],
          score: null,
          rating: "insufficient_evidence" as RatingKey,
          confidenceBand: "low" as const,
          narrativeExplanation: "No assessment data available yet. Complete an assessment to see your capability profile for this domain.",
          gapStatement: null,
          signals: [],
          developmentModules: [],
        };
      }

      const domainRatings = extractDomainRatings(scoreData.scoreBreakdownJson);
      const domainDetail = domainRatings?.[domainKey];
      const score = domainDetail?.score ?? 0;
      const signalCount = domainDetail?.signalCount ?? 0;

      // Domain rating
      const domainRating = stateToRating(
        score >= 75 ? "safe" : score >= 55 ? "at_risk" : score >= 40 ? "unsafe" : "foundation_gap"
      );

      // Signal breakdown (Medium drill-down)
      const allSignals = extractSignalScores(scoreData.signalScoresJson);
      // Get canonical signals for this domain
      const canonicals = await db
        .select()
        .from(canonicalSignals)
        .where(eq(canonicalSignals.domain, domainKey));
      const canonicalKeys = new Set(canonicals.map(c => c.signalKey));
      const domainSignals = allSignals
        .filter(s => canonicalKeys.has(s.signalKey))
        .sort((a, b) => b.score - a.score)
        .map(s => {
          const isRisk = s.signalKey.endsWith("_risk");
          return {
            signalKey: s.signalKey,
            name: s.signalKey.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
            level: s.level,
            score: Math.round(s.score),
            description: s.description,
            isRiskSignal: isRisk,
            framing: isRisk ? `${s.signalKey.replace(/_risk$/, "").replace(/_/g, " ")}: lower is better; you are at ${s.level}.` : undefined,
          };
        });

      // Gap statement
      const latestGap = await db
        .select()
        .from(gapAnalyses)
        .where(eq(gapAnalyses.userId, targetUserId))
        .orderBy(desc(gapAnalyses.generatedAt))
        .limit(1);
      const gapData = latestGap[0]?.capabilityGapsJson as Record<string, any> | null;
      const gapEntry = gapData?.[domainKey];
      const target = gapEntry?.benchmark;
      const gapStatement = target
        ? `Your role requires this capability at level ${Math.round(target)} by the relevant business timeline. You are currently at level ${Math.round(score)}. Gap of ${Math.round(target - score)} points.`
        : null;

      // Narrative explanation (generated from data)
      const strongSignals = domainSignals.filter(s => s.level === "Strong").map(s => s.name.toLowerCase());
      const weakSignals = domainSignals.filter(s => s.level === "Critical").map(s => s.name.toLowerCase());
      let narrative = `Your ${DOMAIN_LABELS[domainKey]} score of ${Math.round(score)} reflects `;
      if (strongSignals.length > 0 && weakSignals.length > 0) {
        narrative += `strong performance on ${strongSignals.slice(0, 2).join(" and ")} and weaker performance on ${weakSignals.slice(0, 2).join(" and ")}.`;
      } else if (strongSignals.length > 0) {
        narrative += `consistently strong performance across the measured signals.`;
      } else if (weakSignals.length > 0) {
        narrative += `areas for development across several signals, particularly ${weakSignals.slice(0, 2).join(" and ")}.`;
      } else {
        narrative += `a developing capability profile across the measured signals.`;
      }

      // Development modules for this domain
      const activePlan = await db
        .select()
        .from(adaptiveLearningPlans)
        .where(and(eq(adaptiveLearningPlans.userId, targetUserId), eq(adaptiveLearningPlans.state, "active")))
        .orderBy(desc(adaptiveLearningPlans.generatedAt))
        .limit(1);

      let developmentModules: Array<{ moduleId: string; title: string; status: string }> = [];
      if (activePlan[0]) {
        const items = await db
          .select()
          .from(adaptivePlanItems)
          .where(eq(adaptivePlanItems.planId, activePlan[0].id));
        const domainItems = items.filter(i => {
          const reason = i.reasonJson as Record<string, unknown> | null;
          return reason?.capability === domainKey;
        });
        if (domainItems.length > 0) {
          const moduleIds = domainItems.map(i => i.moduleId);
          const modules = await db
            .select({ id: learningModules.id, title: learningModules.title })
            .from(learningModules)
            .where(inArray(learningModules.id, moduleIds));
          const moduleMap = new Map(modules.map(m => [m.id, m.title]));
          developmentModules = domainItems.map(i => ({
            moduleId: i.moduleId,
            title: moduleMap.get(i.moduleId) ?? "Module",
            status: i.status,
          }));
        }
      }

      return {
        domainKey,
        domainName: DOMAIN_LABELS[domainKey],
        domainColour: DOMAIN_COLOURS[domainKey],
        score: Math.round(score),
        rating: domainRating,
        confidenceBand: confidenceBand(null),
        narrativeExplanation: narrative,
        gapStatement,
        signals: domainSignals,
        developmentModules,
      };
    }),

  /** Domain drill-down: Deep — scenario evidence */
  domainEvidence: protectedProcedure
    .input(z.object({ userId: z.string().optional(), domainKey: z.string(), sessionId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const targetUserId = input.userId ?? ctx.user.id;
      const domainKey = input.domainKey as DomainKey;

      // If viewing another user, check permissions
      if (targetUserId !== ctx.user.id) {
        const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
        if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader", "manager"].includes(r))) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      // Get latest session
      const latestSession = await db
        .select({ id: assessmentSessions.id })
        .from(assessmentSessions)
        .where(and(eq(assessmentSessions.userId, targetUserId), eq(assessmentSessions.state, "completed")))
        .orderBy(desc(assessmentSessions.completedAt))
        .limit(1);

      if (!latestSession[0]) {
        return { scenarios: [], available: false, message: "No assessment data available." };
      }

      const sessionId = input.sessionId ?? latestSession[0].id;

      // Get answers for this session
      const answers = await db
        .select()
        .from(assessmentAnswers)
        .where(eq(assessmentAnswers.sessionId, sessionId))
        .limit(50);

      // Match answers to scenarios in this domain
      const scenarios: Array<{
        scenarioSummary: string;
        selectedOption: string;
        indication: string;
        signalContribution: string;
      }> = [];

      for (const ans of answers) {
        // Try to find matching content scenario
        const scenario = await db
          .select()
          .from(contentScenarios)
          .where(and(
            eq(contentScenarios.interactionId, ans.itemId),
            eq(contentScenarios.capabilityKey, domainKey),
          ))
          .limit(1);

        if (scenario[0]) {
          // Get the selected option details
          const selectedVal = ans.selectedValueJson as string | null;
          let optionText = selectedVal ?? "Response recorded";
          let indication = "Your response has been recorded for this scenario.";

          if (selectedVal) {
            const option = await db
              .select()
              .from(contentScenarioOptions)
              .where(and(
                eq(contentScenarioOptions.scenarioId, scenario[0].id),
                eq(contentScenarioOptions.value, selectedVal),
              ))
              .limit(1);
            if (option[0]) {
              optionText = option[0].label ?? optionText;
              // selectionIndication field — use if available, otherwise generate from outcome class
              indication = (option[0] as any).selectionIndication
                ?? `Your selection indicated ${ans.outcomeClass === "optimal" ? "strong" : ans.outcomeClass === "acceptable" ? "developing" : "emerging"} capability in this area.`;
            }
          }

          scenarios.push({
            scenarioSummary: scenario[0].title ?? "Assessment scenario",
            selectedOption: optionText,
            indication,
            signalContribution: scenario[0].capabilityKey ?? domainKey,
          });
        }
      }

      return {
        scenarios: scenarios.slice(0, 5),
        available: scenarios.length > 0,
        message: scenarios.length === 0
          ? "Detailed scenario evidence will be available in a future release. For now, see your signal breakdown above."
          : undefined,
      };
    }),
});

// ─── Manager Dashboard ───────────────────────────────────────────────────────

const managerRouter = router({
  /** Main Manager Dashboard data */
  main: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader", "manager"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Get direct reports via managerTeamMembers
    const teamLinks = await db
      .select()
      .from(managerTeamMembers)
      .where(eq(managerTeamMembers.managerId, ctx.user.id));

    const memberIds = teamLinks.map(t => t.memberId);

    // Fallback: if no team members linked, get all tenant users for hr_leader/admin
    let teamMembers: Array<{
      id: string; firstName: string; lastName: string; email: string;
      roleFamily: string | null; jobFunction: string | null;
    }> = [];

    if (memberIds.length > 0) {
      teamMembers = await db
        .select({
          id: users.id, firstName: users.firstName, lastName: users.lastName,
          email: users.email, roleFamily: users.roleFamily, jobFunction: users.jobFunction,
        })
        .from(users)
        .where(inArray(users.id, memberIds));
    } else if (myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      // Leaders see all tenant users
      teamMembers = await db
        .select({
          id: users.id, firstName: users.firstName, lastName: users.lastName,
          email: users.email, roleFamily: users.roleFamily, jobFunction: users.jobFunction,
        })
        .from(users)
        .where(eq(users.tenantId, ctx.user.tenantId));
    }

    // Build team data with scores
    const ratingCounts: Record<RatingKey, number> = {
      ai_ready: 0, developing: 0, not_yet_ready: 0, foundation_gap: 0, insufficient_evidence: 0,
    };
    const teamMembersByRating: Record<RatingKey, Array<{ id: string; name: string }>> = {
      ai_ready: [], developing: [], not_yet_ready: [], foundation_gap: [], insufficient_evidence: [],
    };

    interface TeamMemberData {
      id: string;
      name: string;
      role: string;
      roleFamily: string | null;
      domainScores: Record<DomainKey, number | null>;
      overallScore: number | null;
      rating: RatingKey;
      lastAssessmentDate: string | null;
    }

    const heatmapData: TeamMemberData[] = [];
    let lastTeamActivity: string | null = null;

    for (const member of teamMembers) {
      const scoreData = await getLatestScoreData(db, member.id);
      const domainScoresMap = scoreData ? extractCapabilityScores(scoreData.scoreBreakdownJson) : null;
      const readinessState = scoreData ? extractReadinessState(scoreData.scoreBreakdownJson) : null;
      const rating = stateToRating(readinessState);

      ratingCounts[rating]++;
      teamMembersByRating[rating].push({ id: member.id, name: `${member.firstName} ${member.lastName}` });

      const memberDomainScores: Record<DomainKey, number | null> = {} as any;
      for (const key of DOMAIN_KEYS) {
        memberDomainScores[key] = domainScoresMap?.[key] != null ? Math.round(domainScoresMap[key]) : null;
      }

      const completedAt = scoreData?.completedAt?.toISOString() ?? null;
      if (completedAt && (!lastTeamActivity || completedAt > lastTeamActivity)) {
        lastTeamActivity = completedAt;
      }

      heatmapData.push({
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        role: member.jobFunction ?? member.roleFamily ?? "HR Professional",
        roleFamily: member.roleFamily,
        domainScores: memberDomainScores,
        overallScore: scoreData ? Math.round(scoreData.overallScore) : null,
        rating,
        lastAssessmentDate: completedAt,
      });
    }

    // Manager info
    const managerUser = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    const managerName = managerUser[0] ? `${managerUser[0].firstName} ${managerUser[0].lastName}` : "Manager";

    const assessedInTeam = heatmapData.filter(m => m.overallScore !== null).length;
    const teamBelowThreshold = assessedInTeam < ANONYMISATION_THRESHOLD;
    // Suppress individual scores when below anonymisation threshold
    const safeHeatmapData = teamBelowThreshold
      ? heatmapData.map(m => ({ ...m, overallScore: null, domainScores: Object.fromEntries(DOMAIN_KEYS.map(k => [k, null])) as Record<DomainKey, number | null> }))
      : heatmapData;

    return {
      manager: {
        name: managerName,
        teamName: `${managerName.split(" ")[0]}'s team`,
      },
      teamSize: teamMembers.length,
      lastTeamActivity,
      ratingCounts,
      teamMembersByRating,
      heatmapData: safeHeatmapData,
      belowThreshold: teamBelowThreshold,
      anonymisationThreshold: ANONYMISATION_THRESHOLD,
    };
  }),

  /** Conversation prompts — 10 deterministic patterns */
  conversationPrompts: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader", "manager"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Get team members
    const teamLinks = await db
      .select()
      .from(managerTeamMembers)
      .where(eq(managerTeamMembers.managerId, ctx.user.id));
    let memberIds = teamLinks.map(t => t.memberId);

    if (memberIds.length === 0 && myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      const allUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.tenantId, ctx.user.tenantId));
      memberIds = allUsers.map(u => u.id);
    }

    if (memberIds.length === 0) return { prompts: [] };

    const prompts: Array<{
      memberId: string;
      memberName: string;
      observation: string;
      suggestedAction: string;
      priority: "high" | "medium" | "low";
      patternId: string;
      generatedAt: string;
    }> = [];

    const now = Date.now();
    const DAY_MS = 86400000;
    const memberPromptUsed = new Set<string>(); // max 1 prompt per member

    for (const memberId of memberIds) {
      if (memberPromptUsed.size >= 5) break; // max 5 prompts total

      const memberRow = await db.select().from(users).where(eq(users.id, memberId)).limit(1);
      if (!memberRow[0]) continue;
      const memberName = `${memberRow[0].firstName} ${memberRow[0].lastName}`;

      // Get assessment history (last 3)
      const sessions = await db
        .select({ id: assessmentSessions.id, completedAt: assessmentSessions.completedAt })
        .from(assessmentSessions)
        .where(and(eq(assessmentSessions.userId, memberId), eq(assessmentSessions.state, "completed")))
        .orderBy(desc(assessmentSessions.completedAt))
        .limit(3);

      if (sessions.length === 0) continue;

      const scores: Array<{ sessionId: string; completedAt: Date | null; overallScore: number; domainScores: Record<DomainKey, number> | null; readinessState: string | null }> = [];
      for (const sess of sessions) {
        const sc = await db.select().from(assessmentScores).where(eq(assessmentScores.sessionId, sess.id)).limit(1);
        if (sc[0]) {
          scores.push({
            sessionId: sess.id,
            completedAt: sess.completedAt,
            overallScore: parseFloat(String(sc[0].overallScore)),
            domainScores: extractCapabilityScores(sc[0].scoreBreakdownJson),
            readinessState: extractReadinessState(sc[0].scoreBreakdownJson),
          });
        }
      }

      if (scores.length === 0) continue;
      const latest = scores[0];
      const prior = scores.length > 1 ? scores[1] : null;

      // Get active learning plan
      const plan = await db
        .select()
        .from(adaptiveLearningPlans)
        .where(and(eq(adaptiveLearningPlans.userId, memberId), eq(adaptiveLearningPlans.state, "active")))
        .orderBy(desc(adaptiveLearningPlans.generatedAt))
        .limit(1);

      let planItems: any[] = [];
      if (plan[0]) {
        planItems = await db
          .select()
          .from(adaptivePlanItems)
          .where(eq(adaptivePlanItems.planId, plan[0].id));
      }

      const hasActivePlan = plan[0] != null;
      const planGeneratedAt = plan[0]?.generatedAt ?? 0;
      const completedItems = planItems.filter(i => i.status === "completed");
      const inProgressItems = planItems.filter(i => i.status === "in_progress");
      const lastActivity = Math.max(
        ...planItems.map(i => i.completedAt ?? i.startedAt ?? 0),
        0
      );

      // Pattern 1: regression_detected (High)
      if (prior && latest.domainScores && prior.domainScores && !memberPromptUsed.has(memberId)) {
        for (const domain of DOMAIN_KEYS) {
          const drop = (prior.domainScores[domain] ?? 0) - (latest.domainScores[domain] ?? 0);
          if (drop > 5) {
            const interventionClause = hasActivePlan && completedItems.length === 0 && planItems.length > 0
              ? `The personalised module generated ${Math.round((now - planGeneratedAt) / (7 * DAY_MS))} weeks ago hasn't been started.`
              : hasActivePlan && lastActivity > 0 && (now - lastActivity) > 14 * DAY_MS
              ? `The personalised module is in progress but hasn't shown completion activity in ${Math.round((now - lastActivity) / DAY_MS)} days.`
              : "No development intervention is currently active for this domain.";
            const contextClause = hasActivePlan && completedItems.length === 0
              ? "workload or barriers to completion"
              : "whether the development priorities still match their role focus";
            prompts.push({
              memberId,
              memberName,
              observation: `${memberName}'s last assessment showed regression on ${DOMAIN_LABELS[domain]} (score moved from ${Math.round(prior.domainScores[domain])} to ${Math.round(latest.domainScores[domain])}). ${interventionClause}`,
              suggestedAction: `Worth a conversation about ${contextClause}.`,
              priority: "high",
              patternId: "regression_detected",
              generatedAt: new Date().toISOString(),
            });
            memberPromptUsed.add(memberId);
            break;
          }
        }
      }

      // Pattern 2: plan_unstarted (High)
      if (!memberPromptUsed.has(memberId) && hasActivePlan && planItems.length > 0 && completedItems.length === 0 && inProgressItems.length === 0 && (now - planGeneratedAt) > 14 * DAY_MS) {
        prompts.push({
          memberId,
          memberName,
          observation: `${memberName} has a development plan generated ${Math.round((now - planGeneratedAt) / (7 * DAY_MS))} weeks ago that hasn't been opened. The plan contains ${planItems.length} modules targeting their capability gaps.`,
          suggestedAction: "Worth a conversation about whether they've seen the plan and what might be preventing them from starting.",
          priority: "high",
          patternId: "plan_unstarted",
          generatedAt: new Date().toISOString(),
        });
        memberPromptUsed.add(memberId);
      }

      // Pattern 3: plan_stalled (High)
      if (!memberPromptUsed.has(memberId) && hasActivePlan && (completedItems.length > 0 || inProgressItems.length > 0) && lastActivity > 0 && (now - lastActivity) > 14 * DAY_MS && planItems.some(i => i.status !== "completed")) {
        prompts.push({
          memberId,
          memberName,
          observation: `${memberName}'s development plan hasn't had any activity in ${Math.round((now - lastActivity) / DAY_MS)} days. ${planItems.length - completedItems.length} modules remain incomplete.`,
          suggestedAction: "Worth checking in about what's stalled and whether the plan needs adjusting.",
          priority: "high",
          patternId: "plan_stalled",
          generatedAt: new Date().toISOString(),
        });
        memberPromptUsed.add(memberId);
      }

      // Pattern 4: reassessment_overdue (Medium)
      if (!memberPromptUsed.has(memberId)) {
        const reval = await db
          .select()
          .from(revalidationSchedules)
          .where(and(eq(revalidationSchedules.userId, memberId), eq(revalidationSchedules.status, "pending")))
          .orderBy(revalidationSchedules.dueAt)
          .limit(1);
        if (reval[0] && new Date(reval[0].dueAt) < new Date() && completedItems.length > 0) {
          prompts.push({
            memberId,
            memberName,
            observation: `${memberName} completed development modules but their scheduled reassessment is overdue. Reassessment would measure whether the development investment has translated into capability improvement.`,
            suggestedAction: "Worth scheduling their reassessment to capture the development impact.",
            priority: "medium",
            patternId: "reassessment_overdue",
            generatedAt: new Date().toISOString(),
          });
          memberPromptUsed.add(memberId);
        }
      }

      // Pattern 5: foundation_gap_persisting (Medium)
      if (!memberPromptUsed.has(memberId) && scores.length >= 2) {
        const consecutiveFoundationGap = scores.filter(s => stateToRating(s.readinessState) === "foundation_gap").length;
        if (consecutiveFoundationGap >= 2) {
          prompts.push({
            memberId,
            memberName,
            observation: `${memberName} has been classified as Foundation Gap for ${consecutiveFoundationGap} consecutive assessments without movement. This suggests the current development approach may not be addressing the root capability gap.`,
            suggestedAction: "Consider reviewing their assessment evidence together to identify whether a different development approach is needed.",
            priority: "medium",
            patternId: "foundation_gap_persisting",
            generatedAt: new Date().toISOString(),
          });
          memberPromptUsed.add(memberId);
        }
      }

      // Pattern 6: sustained_developing (Medium)
      if (!memberPromptUsed.has(memberId) && scores.length >= 3) {
        const allDeveloping = scores.every(s => stateToRating(s.readinessState) === "developing");
        const scoreChange = Math.abs(scores[0].overallScore - scores[scores.length - 1].overallScore);
        if (allDeveloping && scoreChange < 3) {
          prompts.push({
            memberId,
            memberName,
            observation: `${memberName} has been Developing for ${scores.length} consecutive assessments with minimal score change (${Math.round(scoreChange)} points). Their current development plan may need recalibration.`,
            suggestedAction: "Consider reviewing whether their current responsibilities are surfacing capability stress or whether the development priorities need adjusting.",
            priority: "medium",
            patternId: "sustained_developing",
            generatedAt: new Date().toISOString(),
          });
          memberPromptUsed.add(memberId);
        }
      }

      // Pattern 10: new_member_first_assessment (Medium)
      if (!memberPromptUsed.has(memberId) && sessions.length === 1) {
        const completedAt = sessions[0].completedAt;
        if (completedAt && (now - completedAt.getTime()) < 7 * DAY_MS) {
          prompts.push({
            memberId,
            memberName,
            observation: `${memberName} completed their first assessment recently. Their initial rating is ${RATING_LABELS[stateToRating(latest.readinessState)]} with an overall score of ${Math.round(latest.overallScore)}.`,
            suggestedAction: "A good opportunity for an introductory conversation about their capability profile and development priorities.",
            priority: "medium",
            patternId: "new_member_first_assessment",
            generatedAt: new Date().toISOString(),
          });
          memberPromptUsed.add(memberId);
        }
      }

      // Pattern 9: intervention_succeeded (Low)
      if (!memberPromptUsed.has(memberId) && prior && latest.overallScore - prior.overallScore > 5 && completedItems.length > 0) {
        prompts.push({
          memberId,
          memberName,
          observation: `${memberName}'s most recent reassessment shows measurable capability improvement (score moved from ${Math.round(prior.overallScore)} to ${Math.round(latest.overallScore)}) following completed development modules. The development investment is producing results.`,
          suggestedAction: "Worth acknowledging their progress and discussing next development priorities.",
          priority: "low",
          patternId: "intervention_succeeded",
          generatedAt: new Date().toISOString(),
        });
        memberPromptUsed.add(memberId);
      }

      // Pattern 8: confidence_capability_gap (Low)
      if (!memberPromptUsed.has(memberId)) {
        // Check confidence vs capability divergence from score breakdown
        const bd = latest.domainScores;
        // Simplified: check if any domain has large gap between score and confidence
        // (would need confidence data per answer — approximate using overall)
        const latestScoreRow = await db.select().from(assessmentScores).where(eq(assessmentScores.sessionId, latest.sessionId)).limit(1);
        if (latestScoreRow[0]) {
          const comp = extractCompositeConfidence(latestScoreRow[0].scoreBreakdownJson);
          if (comp !== null) {
            const confAsScore = comp * 100;
            const divergence = Math.abs(confAsScore - latest.overallScore);
            if (divergence > 15) {
              const direction = confAsScore > latest.overallScore ? "overconfident" : "underconfident";
              prompts.push({
                memberId,
                memberName,
                observation: `${memberName}'s stated confidence diverges from measured capability by ${Math.round(divergence)} points (${direction}). ${direction === "overconfident" ? "They may not recognise their capability gaps." : "They may be underestimating their actual capability."}`,
                suggestedAction: `Worth a conversation about their self-perception and how it aligns with their assessment evidence.`,
                priority: "low",
                patternId: "confidence_capability_gap",
                generatedAt: new Date().toISOString(),
              });
              memberPromptUsed.add(memberId);
            }
          }
        }
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    prompts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return { prompts: prompts.slice(0, 5) };
  }),

  /** Team development overview */
  developmentOverview: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader", "manager"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const teamLinks = await db
      .select()
      .from(managerTeamMembers)
      .where(eq(managerTeamMembers.managerId, ctx.user.id));
    let memberIds = teamLinks.map(t => t.memberId);

    if (memberIds.length === 0 && myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      const allUsers = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, ctx.user.tenantId));
      memberIds = allUsers.map(u => u.id);
    }

    let activeModuleCount = 0;
    let totalModules = 0;
    let completedModules = 0;
    let onTrack = 0;
    let slipping = 0;
    let stalled = 0;
    let awaitingReassessment = 0;
    const now = Date.now();
    const DAY_MS = 86400000;

    for (const memberId of memberIds) {
      const plan = await db
        .select()
        .from(adaptiveLearningPlans)
        .where(and(eq(adaptiveLearningPlans.userId, memberId), eq(adaptiveLearningPlans.state, "active")))
        .orderBy(desc(adaptiveLearningPlans.generatedAt))
        .limit(1);

      if (!plan[0]) continue;

      const items = await db
        .select()
        .from(adaptivePlanItems)
        .where(eq(adaptivePlanItems.planId, plan[0].id));

      const completed = items.filter(i => i.status === "completed").length;
      const remaining = items.filter(i => i.status !== "completed" && i.status !== "skipped");
      totalModules += items.length;
      completedModules += completed;
      activeModuleCount += items.filter(i => i.status === "in_progress").length;

      if (remaining.length === 0) {
        awaitingReassessment++;
        continue;
      }

      const lastActivity = Math.max(...items.map(i => i.completedAt ?? i.startedAt ?? 0), 0);
      const daysSinceActivity = lastActivity > 0 ? (now - lastActivity) / DAY_MS : Infinity;

      if (daysSinceActivity <= 7) {
        onTrack++;
      } else if (daysSinceActivity <= 14) {
        slipping++;
      } else {
        stalled++;
      }
    }

    return {
      activeModuleCount,
      aggregateCompletionRate: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
      statusCounts: { onTrack, slipping, stalled, awaitingReassessment },
    };
  }),
});

// ─── Leader Dashboard ────────────────────────────────────────────────────────

const leaderRouter = router({
  /** Hero finding — 5 patterns */
  heroFinding: protectedProcedure.input(z.object({ roleFamily: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rfFilter = input?.roleFamily ?? null;

    // Check if org context (strategic business input / AI roadmap) has been configured
    const orgCtxRows = await db.select().from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    const orgCtx = orgCtxRows[0] ?? null;

    let allUsers = await db
      .select({ id: users.id, roleFamily: users.roleFamily, jobFunction: users.jobFunction })
      .from(users)
      .where(eq(users.tenantId, ctx.user.tenantId));
    if (rfFilter) {
      allUsers = allUsers.filter(u => roleFamilyFromUserField(u.roleFamily ?? u.jobFunction) === rfFilter);
    }

    let totalScore = 0;
    let assessedCount = 0;
    const ratingCounts: Record<RatingKey, number> = {
      ai_ready: 0, developing: 0, not_yet_ready: 0, foundation_gap: 0, insufficient_evidence: 0,
    };

    for (const u of allUsers) {
      const scoreData = await getLatestScoreData(db, u.id);
      if (scoreData) {
        totalScore += scoreData.overallScore;
        assessedCount++;
        const state = extractReadinessState(scoreData.scoreBreakdownJson);
        const rating = stateToRating(state);
        ratingCounts[rating]++;
      }
    }

    const functionScore = assessedCount > 0 ? Math.round(totalScore / assessedCount) : null;

    // Pattern 5: No strategic context configured
    if (!orgCtx) {
      return {
        readinessStatus: "not_configured" as const,
        statement: "Strategic context not yet captured. Your function\u2019s capability position is shown below, but readiness against business requirements requires capturing your AI roadmap.",
        cta: { label: "Configure AI roadmap", route: "/admin/org-context" },
        functionScore,
        assessedCount,
        totalHeadcount: allUsers.length,
      };
    }

    // Strategic context IS configured — determine the correct hero pattern
    const aiReadyPct = assessedCount > 0 ? Math.round((ratingCounts.ai_ready / assessedCount) * 100) : 0;
    const atRiskPct = assessedCount > 0 ? Math.round(((ratingCounts.not_yet_ready + ratingCounts.foundation_gap) / assessedCount) * 100) : 0;
    const developingPct = assessedCount > 0 ? Math.round((ratingCounts.developing / assessedCount) * 100) : 0;

    // Parse strategic priorities for context
    let strategicPriorities: string[] = [];
    try { strategicPriorities = JSON.parse(orgCtx.strategicPrioritiesJson ?? "[]"); } catch { /* ignore */ }

    const sector = orgCtx.sector ?? "other";
    const aiMaturity = orgCtx.aiMaturityLevel ?? "early_adopter";

    // Pattern 4: Partial data — less than 50% assessed
    if (assessedCount < allUsers.length * 0.5) {
      return {
        readinessStatus: "partial" as const,
        statement: `${assessedCount} of ${allUsers.length} employees assessed. Complete assessment coverage to unlock full strategic insights against your AI roadmap.`,
        cta: { label: "View assessment progress", route: "/admin/users" },
        functionScore,
        assessedCount,
        totalHeadcount: allUsers.length,
        strategicContext: { sector, aiMaturity, priorityCount: strategicPriorities.length },
      };
    }

    // Pattern 1: On track — majority AI Ready
    if (aiReadyPct >= 60) {
      return {
        readinessStatus: "on_track" as const,
        statement: `Your HR function is performing well. ${aiReadyPct}% of assessed employees are AI Ready, with a function score of ${functionScore}. Strategic alignment with your ${strategicPriorities.length} priority area${strategicPriorities.length !== 1 ? "s" : ""} is strong.`,
        cta: { label: "View strategic alignment", route: "/dashboard/leader" },
        functionScore,
        assessedCount,
        totalHeadcount: allUsers.length,
        strategicContext: { sector, aiMaturity, priorityCount: strategicPriorities.length },
      };
    }

    // Pattern 2: At risk — significant portion not ready
    if (atRiskPct >= 30) {
      return {
        readinessStatus: "at_risk" as const,
        statement: `${atRiskPct}% of assessed employees are Not Yet Ready or have Foundation Gaps. Function score is ${functionScore}. Immediate intervention is recommended to meet your AI roadmap objectives.`,
        cta: { label: "View risk areas", route: "/dashboard/leader" },
        functionScore,
        assessedCount,
        totalHeadcount: allUsers.length,
        strategicContext: { sector, aiMaturity, priorityCount: strategicPriorities.length },
      };
    }

    // Pattern 3: Mixed — majority developing
    return {
      readinessStatus: "mixed" as const,
      statement: `Your function shows a mixed readiness profile. ${developingPct}% are Developing, ${aiReadyPct}% are AI Ready, with a function score of ${functionScore}. Targeted development aligned to your ${strategicPriorities.length} strategic priorities will accelerate progress.`,
      cta: { label: "View development priorities", route: "/learning?tab=insights" },
      functionScore,
      assessedCount,
      totalHeadcount: allUsers.length,
      strategicContext: { sector, aiMaturity, priorityCount: strategicPriorities.length },
    };
  }),

  /** Function position summary */
  main: protectedProcedure.input(z.object({ roleFamily: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rfFilter = input?.roleFamily ?? null;

    let allUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, ctx.user.tenantId));
    // Apply role family filter if set
    if (rfFilter) {
      const allUsersWithRf = await db
        .select({ id: users.id, roleFamily: users.roleFamily, jobFunction: users.jobFunction })
        .from(users)
        .where(eq(users.tenantId, ctx.user.tenantId));
      allUsers = allUsersWithRf.filter(u => roleFamilyFromUserField(u.roleFamily ?? u.jobFunction) === rfFilter);
    }

    let totalScore = 0;
    let assessedCount = 0;
    const ratingCounts: Record<RatingKey, number> = {
      ai_ready: 0, developing: 0, not_yet_ready: 0, foundation_gap: 0, insufficient_evidence: 0,
    };
    // 5-level distribution (1=Emerging, 2=Developing, 3=Capable, 4=Strong, 5=AI Ready)
    const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // Per-domain aggregation
    const domainTotals: Record<DomainKey, { total: number; count: number }> = {} as any;
    for (const key of DOMAIN_KEYS) domainTotals[key] = { total: 0, count: 0 };

    // Per-domain rating distribution
    const domainRatingCounts: Record<DomainKey, Record<RatingKey, number>> = {} as any;
    for (const key of DOMAIN_KEYS) {
      domainRatingCounts[key] = { ai_ready: 0, developing: 0, not_yet_ready: 0, foundation_gap: 0, insufficient_evidence: 0 };
    }

    // Role family × domain heatmap
    const roleFamilyDomainData: Record<RoleFamilyKey, Record<DomainKey, { total: number; count: number }>> = {} as any;
    for (const rf of ROLE_FAMILY_KEYS) {
      roleFamilyDomainData[rf] = {} as any;
      for (const dk of DOMAIN_KEYS) {
        roleFamilyDomainData[rf][dk] = { total: 0, count: 0 };
      }
    }

    for (const u of allUsers) {
      const scoreData = await getLatestScoreData(db, u.id);
      if (!scoreData) {
        ratingCounts.insufficient_evidence++;
        for (const dk of DOMAIN_KEYS) domainRatingCounts[dk].insufficient_evidence++;
        continue;
      }

      totalScore += scoreData.overallScore;
      assessedCount++;

      const state = extractReadinessState(scoreData.scoreBreakdownJson);
      const rating = stateToRating(state);
      ratingCounts[rating]++;

      // 5-level bucket from raw score (0-100 scale)
      const rawS = scoreData.overallScore / 10;
      const lv = rawS >= 7.5 ? 5 : rawS >= 6.0 ? 4 : rawS >= 5.0 ? 3 : rawS >= 3.5 ? 2 : 1;
      levelCounts[lv]++;

      const domainScores = extractCapabilityScores(scoreData.scoreBreakdownJson);
      if (domainScores) {
        // Get user's role family
        const userRow = await db.select({ roleFamily: users.roleFamily, jobFunction: users.jobFunction }).from(users).where(eq(users.id, u.id)).limit(1);
        const rf = roleFamilyFromUserField(userRow[0]?.roleFamily ?? userRow[0]?.jobFunction);

        for (const dk of DOMAIN_KEYS) {
          const score = domainScores[dk];
          domainTotals[dk].total += score;
          domainTotals[dk].count++;

          // Domain-level rating
          const domainRating = stateToRating(
            score >= 75 ? "safe" : score >= 55 ? "at_risk" : score >= 40 ? "unsafe" : "foundation_gap"
          );
          domainRatingCounts[dk][domainRating]++;

          // Role family heatmap
          roleFamilyDomainData[rf][dk].total += score;
          roleFamilyDomainData[rf][dk].count++;
        }
      } else {
        for (const dk of DOMAIN_KEYS) domainRatingCounts[dk].insufficient_evidence++;
      }
    }

    const functionScore = assessedCount > 0 ? Math.round(totalScore / assessedCount) : null;
    const functionRating = stateToRating(
      functionScore === null ? null :
      functionScore >= 75 ? "safe" : functionScore >= 50 ? "at_risk" : functionScore >= 30 ? "unsafe" : "foundation_gap"
    );

    // 90-day trajectory
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    let trajectory90d: number | null = null;
    // Simplified: compare current avg to avg from 90 days ago
    const olderSessions = await db
      .select({ id: assessmentSessions.id, userId: assessmentSessions.userId })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.tenantId, ctx.user.tenantId),
        eq(assessmentSessions.state, "completed"),
        gte(assessmentSessions.completedAt, ninetyDaysAgo),
      ));
    // This is a simplified trajectory — in production would compare start vs end of period

    // Build domain distribution
    const domainDistribution = DOMAIN_KEYS.map(dk => ({
      domain: dk,
      domainName: DOMAIN_LABELS[dk],
      colour: DOMAIN_COLOURS[dk],
      avgScore: domainTotals[dk].count > 0 ? Math.round(domainTotals[dk].total / domainTotals[dk].count) : null,
      ratingCounts: domainRatingCounts[dk],
      totalAssessed: domainTotals[dk].count,
    }));

    // Build role family heatmap (suppress cells below anonymisation threshold)
    const heatmap = ROLE_FAMILY_KEYS.map(rf => ({
      roleFamily: rf,
      roleFamilyName: ROLE_FAMILY_LABELS[rf],
      domains: DOMAIN_KEYS.map(dk => {
        const cellCount = roleFamilyDomainData[rf][dk].count;
        const meetsThreshold = cellCount >= ANONYMISATION_THRESHOLD;
        return {
          domain: dk,
          avgScore: meetsThreshold && cellCount > 0
            ? Math.round((roleFamilyDomainData[rf][dk].total / cellCount) * 10) / 10
            : null,
          headcount: cellCount,
          belowThreshold: !meetsThreshold && cellCount > 0,
          target: null, // Will come from AI roadmap
          gap: null,
        };
      }),
    }));

    // Build 5-level distribution array
    const levelDistribution = [5, 4, 3, 2, 1].map(lv => ({
      level: lv,
      count: levelCounts[lv],
      pct: assessedCount > 0 ? Math.round((levelCounts[lv] / assessedCount) * 100) : 0,
    }));

    return {
      functionScore,
      functionRating,
      targetScore: null, // Will come from AI roadmap
      gap: null,
      trajectory90d,
      aggregateConfidence: null,
      totalHeadcount: allUsers.length,
      assessedCount,
      ratingCounts,
      levelDistribution,
      domainDistribution,
      heatmap,
    };
  }),

  /** Per-domain function-wide trajectory (6 time series) */
  domainTrajectory: protectedProcedure.input(z.object({ roleFamily: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rfFilter = input?.roleFamily ?? null;

    // Build a set of user IDs matching the filter for session lookup
    let filteredUserIds: Set<string> | null = null;
    if (rfFilter) {
      const allUsersRf = await db
        .select({ id: users.id, roleFamily: users.roleFamily, jobFunction: users.jobFunction })
        .from(users)
        .where(eq(users.tenantId, ctx.user.tenantId));
      filteredUserIds = new Set(allUsersRf.filter(u => roleFamilyFromUserField(u.roleFamily ?? u.jobFunction) === rfFilter).map(u => u.id));
    }

    const twelveMonthsAgo = new Date(Date.now() - 365 * 86400000);
    const sessions = await db
      .select({ id: assessmentSessions.id, completedAt: assessmentSessions.completedAt, userId: assessmentSessions.userId })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.tenantId, ctx.user.tenantId),
        eq(assessmentSessions.state, "completed"),
        gte(assessmentSessions.completedAt, twelveMonthsAgo),
      ))
      .orderBy(assessmentSessions.completedAt);

    // Build monthly buckets per domain
    const monthlyDomain: Record<string, Record<DomainKey, { total: number; count: number }>> = {};

    for (const sess of sessions) {
      if (!sess.completedAt) continue;
      // Filter by role family if set
      if (filteredUserIds && !filteredUserIds.has(sess.userId)) continue;
      const score = await db
        .select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson })
        .from(assessmentScores)
        .where(eq(assessmentScores.sessionId, sess.id))
        .limit(1);
      if (!score[0]) continue;

      const domainScores = extractCapabilityScores(score[0].scoreBreakdownJson);
      if (!domainScores) continue;

      const d = new Date(sess.completedAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyDomain[monthKey]) {
        monthlyDomain[monthKey] = {} as any;
        for (const dk of DOMAIN_KEYS) monthlyDomain[monthKey][dk] = { total: 0, count: 0 };
      }

      for (const dk of DOMAIN_KEYS) {
        monthlyDomain[monthKey][dk].total += domainScores[dk];
        monthlyDomain[monthKey][dk].count++;
      }
    }

    const months = Object.keys(monthlyDomain).sort();

    const domains = DOMAIN_KEYS.map(dk => {
      const timeSeries = months.map(month => ({
        date: month,
        avgScore: monthlyDomain[month][dk].count > 0
          ? Math.round(monthlyDomain[month][dk].total / monthlyDomain[month][dk].count)
          : null,
        sampleSize: monthlyDomain[month][dk].count,
      }));

      const currentValue = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].avgScore : null;
      const threeMonthsAgo = timeSeries.length >= 3 ? timeSeries[timeSeries.length - 3].avgScore : null;
      const delta90d = currentValue !== null && threeMonthsAgo !== null ? currentValue - threeMonthsAgo : null;

      return {
        domain: dk,
        domainName: DOMAIN_LABELS[dk],
        colour: DOMAIN_COLOURS[dk],
        timeSeries,
        currentValue,
        delta90d,
        target: null, // Will come from AI roadmap
      };
    });

    return { domains };
  }),

  /** Strategic findings — 8 deterministic patterns */
  strategicFindings: protectedProcedure.input(z.object({ roleFamily: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rfFilter = input?.roleFamily ?? null;

    let allUsers = await db
      .select({ id: users.id, roleFamily: users.roleFamily, jobFunction: users.jobFunction })
      .from(users)
      .where(eq(users.tenantId, ctx.user.tenantId));
    if (rfFilter) {
      allUsers = allUsers.filter(u => roleFamilyFromUserField(u.roleFamily ?? u.jobFunction) === rfFilter);
    }

    // Collect per-user data
    const userData: Array<{
      id: string;
      roleFamily: RoleFamilyKey;
      overallScore: number;
      rating: RatingKey;
      domainScores: Record<DomainKey, number>;
      confidence: number | null;
    }> = [];

    for (const u of allUsers) {
      const scoreData = await getLatestScoreData(db, u.id);
      if (!scoreData) continue;
      const domainScores = extractCapabilityScores(scoreData.scoreBreakdownJson);
      if (!domainScores) continue;
      const state = extractReadinessState(scoreData.scoreBreakdownJson);
      const confidence = extractCompositeConfidence(scoreData.scoreBreakdownJson);
      userData.push({
        id: u.id,
        roleFamily: roleFamilyFromUserField(u.roleFamily ?? u.jobFunction),
        overallScore: scoreData.overallScore,
        rating: stateToRating(state),
        domainScores,
        confidence,
      });
    }

    const findings: Array<{
      patternId: string;
      observation: string;
      supportingData: string;
      strategicImplication: string;
      priority: "critical" | "high" | "medium" | "low";
      drillDownTarget: string | null;
    }> = [];

    const totalAssessed = userData.length;
    if (totalAssessed === 0) return { findings: [] };

    // Aggregate stats for patterns
    const avgScore = Math.round(userData.reduce((s, u) => s + u.overallScore, 0) / totalAssessed);
    const aiReadyCount = userData.filter(u => u.rating === "ai_ready").length;
    const aiReadyPct = Math.round((aiReadyCount / totalAssessed) * 100);
    const developingCount = userData.filter(u => u.rating === "developing").length;
    const developingPct = Math.round((developingCount / totalAssessed) * 100);
    const notReadyCount = userData.filter(u => u.rating === "not_yet_ready").length;
    const notReadyPct = Math.round((notReadyCount / totalAssessed) * 100);
    const foundationGapCount = userData.filter(u => u.rating === "foundation_gap").length;
    const foundationGapPct = Math.round((foundationGapCount / totalAssessed) * 100);

    // Pattern 1: Readiness distribution insight (always fires)
    if (notReadyPct + foundationGapPct > 10) {
      findings.push({
        patternId: "readiness_risk_concentration",
        observation: `${notReadyPct + foundationGapPct}% of your function (${notReadyCount + foundationGapCount} people) are classified as Not Yet Ready or Foundation Gap. These individuals may pose governance risk if they are using AI tools without adequate capability.`,
        supportingData: `Not Yet Ready: ${notReadyCount} (${notReadyPct}%), Foundation Gap: ${foundationGapCount} (${foundationGapPct}%) of ${totalAssessed} assessed.`,
        strategicImplication: "Prioritise these individuals for immediate foundation-level development. Consider whether AI tool access should be restricted or supervised until capability improves.",
        priority: "high",
        drillDownTarget: null,
      });
    } else if (aiReadyPct < 50) {
      findings.push({
        patternId: "ai_readiness_below_target",
        observation: `Only ${aiReadyPct}% of your function is AI Ready. The majority (${developingPct}% Developing) still need targeted development to reach full capability.`,
        supportingData: `AI Ready: ${aiReadyCount} (${aiReadyPct}%), Developing: ${developingCount} (${developingPct}%) of ${totalAssessed} assessed.`,
        strategicImplication: "Focus development investment on moving the Developing cohort to AI Ready. Identify what specific domain gaps are holding them back and target interventions accordingly.",
        priority: "high",
        drillDownTarget: null,
      });
    }

    // Pattern 2: Domain weakness — find the weakest domain
    const domainAvgs: { dk: DomainKey; avg: number }[] = DOMAIN_KEYS.map(dk => {
      const scores = userData.map(u => u.domainScores[dk]);
      return { dk, avg: scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0 };
    }).sort((a, b) => a.avg - b.avg);
    const weakest = domainAvgs[0];
    const strongest = domainAvgs[domainAvgs.length - 1];
    if (weakest && strongest && strongest.avg - weakest.avg > 3) {
      findings.push({
        patternId: "domain_capability_gap",
        observation: `${DOMAIN_LABELS[weakest.dk]} is your function's weakest domain at ${weakest.avg} avg, ${strongest.avg - weakest.avg} points below your strongest (${DOMAIN_LABELS[strongest.dk]} at ${strongest.avg}).`,
        supportingData: `Domain averages range from ${weakest.avg} (${DOMAIN_LABELS[weakest.dk]}) to ${strongest.avg} (${DOMAIN_LABELS[strongest.dk]}).`,
        strategicImplication: `If ${DOMAIN_LABELS[weakest.dk]} is critical to your AI strategy, this gap needs targeted intervention. Consider whether this domain is being adequately covered in current development plans.`,
        priority: "high",
        drillDownTarget: weakest.dk,
      });
    }

    // Pattern 3: development_investment_underconsumed (High)
    let totalPlanModules = 0;
    let completedPlanModules = 0;
    for (const u of userData) {
      const plan = await db
        .select()
        .from(adaptiveLearningPlans)
        .where(and(eq(adaptiveLearningPlans.userId, u.id), eq(adaptiveLearningPlans.state, "active")))
        .limit(1);
      if (plan[0]) {
        const items = await db.select().from(adaptivePlanItems).where(eq(adaptivePlanItems.planId, plan[0].id));
        totalPlanModules += items.length;
        completedPlanModules += items.filter(i => i.status === "completed").length;
      }
    }
    const completionRate = totalPlanModules > 0 ? Math.round((completedPlanModules / totalPlanModules) * 100) : 0;
    if (totalPlanModules > 0) {
      if (completionRate < 50) {
        findings.push({
          patternId: "development_investment_underconsumed",
          observation: `Active development plans across the function have an aggregate completion rate of ${completionRate}%. Development investment is being made but not fully consumed.`,
          supportingData: `${completedPlanModules} of ${totalPlanModules} modules completed across all active plans.`,
          strategicImplication: "Consider whether development time is being protected in workload planning, whether the modules are relevant to daily work, or whether a different delivery format would improve engagement.",
          priority: completionRate < 25 ? "high" : "medium",
          drillDownTarget: null,
        });
      } else {
        findings.push({
          patternId: "development_engagement_positive",
          observation: `Development plan completion rate is ${completionRate}% across the function. This suggests reasonable engagement with the learning programme.`,
          supportingData: `${completedPlanModules} of ${totalPlanModules} modules completed across all active plans.`,
          strategicImplication: "Maintain momentum by ensuring new modules are added as people complete existing ones. Consider whether completion is translating into measurable capability improvement.",
          priority: "low",
          drillDownTarget: null,
        });
      }
    }

    // Pattern 4: sustained_function_stall (Medium)
    if (developingPct > 40) {
      findings.push({
        patternId: "sustained_function_stall",
        observation: `${developingPct}% of your function is classified as Developing. ${developingPct > 60 ? "This high concentration suggests the function may be plateauing." : "While progress is being made, a significant portion still needs to advance."}`,
        supportingData: `${developingCount} of ${totalAssessed} assessed individuals at Developing level. Function average: ${avgScore}.`,
        strategicImplication: "Consider whether the current development approach is producing measurable capability change, or whether a different intervention strategy is needed to move people from Developing to AI Ready.",
        priority: developingPct > 60 ? "medium" : "low",
        drillDownTarget: null,
      });
    }

    // Pattern 5: Role family disparity
    const rfScores: Record<string, { total: number; count: number }> = {};
    for (const u of userData) {
      if (!rfScores[u.roleFamily]) rfScores[u.roleFamily] = { total: 0, count: 0 };
      rfScores[u.roleFamily].total += u.overallScore;
      rfScores[u.roleFamily].count++;
    }
    const rfAvgs = Object.entries(rfScores)
      .filter(([, v]) => v.count >= 2)
      .map(([rf, v]) => ({ rf, avg: Math.round(v.total / v.count), count: v.count }))
      .sort((a, b) => a.avg - b.avg);
    if (rfAvgs.length >= 2) {
      const lowestRf = rfAvgs[0];
      const highestRf = rfAvgs[rfAvgs.length - 1];
      const gap = highestRf.avg - lowestRf.avg;
      if (gap > 5) {
        findings.push({
          patternId: "role_family_disparity",
          observation: `There is a ${gap}-point gap between your highest-performing role family (${ROLE_FAMILY_LABELS[highestRf.rf as RoleFamilyKey] ?? highestRf.rf} at ${highestRf.avg}) and lowest (${ROLE_FAMILY_LABELS[lowestRf.rf as RoleFamilyKey] ?? lowestRf.rf} at ${lowestRf.avg}).`,
          supportingData: `${ROLE_FAMILY_LABELS[highestRf.rf as RoleFamilyKey] ?? highestRf.rf}: ${highestRf.avg} avg (${highestRf.count} people). ${ROLE_FAMILY_LABELS[lowestRf.rf as RoleFamilyKey] ?? lowestRf.rf}: ${lowestRf.avg} avg (${lowestRf.count} people).`,
          strategicImplication: "Investigate whether the lower-performing role family has different development needs, less access to AI tools, or different job requirements that affect their capability profile.",
          priority: gap > 10 ? "high" : "medium",
          drillDownTarget: null,
        });
      }
    }

    // Pattern 6: confidence_capability_misalignment_pattern (Medium)
    const misaligned = userData.filter(u => {
      if (u.confidence === null) return false;
      return Math.abs(u.confidence * 100 - u.overallScore) > 12;
    });
    const misalignedPct = Math.round((misaligned.length / totalAssessed) * 100);
    if (misalignedPct > 15) {
      const overconfident = misaligned.filter(u => (u.confidence ?? 0) * 100 > u.overallScore).length;
      findings.push({
        patternId: "confidence_capability_misalignment_pattern",
        observation: `${misalignedPct}% of your function shows significant divergence between stated confidence and measured capability. ${overconfident} are overconfident; ${misaligned.length - overconfident} are underconfident.`,
        supportingData: `${misaligned.length} of ${totalAssessed} individuals with >12 point divergence.`,
        strategicImplication: "Overconfidence is a governance risk — people who believe they are more capable than they are may make unsupervised AI decisions they shouldn't. Consider whether to address this through awareness sessions or adjusted supervision levels.",
        priority: "medium",
        drillDownTarget: null,
      });
    }

    // Pattern 7: strongest_capability_concentration (Low)
    for (const dk of DOMAIN_KEYS) {
      const domainScores = userData.map(u => ({ id: u.id, score: u.domainScores[dk], rf: u.roleFamily }));
      const sorted = [...domainScores].sort((a, b) => b.score - a.score);
      const top20pct = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.2)));
      if (top20pct.length >= 2) {
        const rfCounts: Record<string, number> = {};
        for (const t of top20pct) {
          rfCounts[t.rf] = (rfCounts[t.rf] ?? 0) + 1;
        }
        const dominant = Object.entries(rfCounts).sort(([, a], [, b]) => b - a)[0];
        if (dominant && dominant[1] / top20pct.length > 0.5) {
          findings.push({
            patternId: "strongest_capability_concentration",
            observation: `Your function's strongest performers on ${DOMAIN_LABELS[dk]} are concentrated in the ${ROLE_FAMILY_LABELS[dominant[0] as RoleFamilyKey] ?? dominant[0]} role family. This is a strategic resource for upcoming initiatives requiring this capability.`,
            supportingData: `${dominant[1]} of ${top20pct.length} top performers in ${ROLE_FAMILY_LABELS[dominant[0] as RoleFamilyKey] ?? dominant[0]}.`,
            strategicImplication: "Consider whether these individuals could support cross-functional capability building or serve as mentors for role families with lower scores in this domain.",
            priority: "low",
            drillDownTarget: dk,
          });
          break;
        }
      }
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    findings.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return { findings: findings.slice(0, 5) };
  }),

  /** Strategic Alignment — maps business priorities to capability readiness */
  strategicAlignment: protectedProcedure.input(z.object({ roleFamily: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rfFilter = input?.roleFamily ?? null;

    // Load org context
    const orgCtxRows = await db.select().from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    const orgCtx = orgCtxRows[0] ?? null;
    if (!orgCtx) {
      return {
        configured: false as const,
        priorities: [],
        challenges: [],
        overallAlignment: null,
        governanceReadiness: null,
        hrInfluence: null,
        aiMaturity: null,
      };
    }

    let strategicPriorities: string[] = [];
    let currentChallenges: string[] = [];
    try { strategicPriorities = JSON.parse(orgCtx.strategicPrioritiesJson ?? "[]"); } catch {}
    try { currentChallenges = JSON.parse(orgCtx.currentChallengesJson ?? "[]"); } catch {}

    // Get all users and their capability scores
    let allUsers = await db
      .select({ id: users.id, roleFamily: users.roleFamily, jobFunction: users.jobFunction })
      .from(users)
      .where(eq(users.tenantId, ctx.user.tenantId));
    if (rfFilter) {
      allUsers = allUsers.filter(u => roleFamilyFromUserField(u.roleFamily ?? u.jobFunction) === rfFilter);
    }

    // Aggregate domain scores across all assessed users
    const domainTotals: Record<DomainKey, { total: number; count: number }> = {} as any;
    for (const dk of DOMAIN_KEYS) domainTotals[dk] = { total: 0, count: 0 };
    let assessedCount = 0;
    let totalScore = 0;

    for (const u of allUsers) {
      const scoreData = await getLatestScoreData(db, u.id);
      if (!scoreData) continue;
      assessedCount++;
      totalScore += scoreData.overallScore;
      const domainScores = extractCapabilityScores(scoreData.scoreBreakdownJson);
      if (domainScores) {
        for (const dk of DOMAIN_KEYS) {
          domainTotals[dk].total += domainScores[dk];
          domainTotals[dk].count++;
        }
      }
    }

    const functionAvg = assessedCount > 0 ? Math.round(totalScore / assessedCount) : null;
    const domainAvgs: Record<DomainKey, number | null> = {} as any;
    for (const dk of DOMAIN_KEYS) {
      domainAvgs[dk] = domainTotals[dk].count > 0 ? Math.round(domainTotals[dk].total / domainTotals[dk].count) : null;
    }

    // Map each strategic priority to the most relevant capability domains
    // This is a heuristic mapping based on keyword analysis
    const PRIORITY_DOMAIN_MAP: Record<string, DomainKey[]> = {
      recruit: ["ai_interaction", "ai_output_evaluation"],
      hiring: ["ai_interaction", "ai_output_evaluation"],
      screening: ["ai_interaction", "ai_output_evaluation"],
      automat: ["ai_workflow_design", "ai_interaction"],
      workflow: ["ai_workflow_design"],
      process: ["ai_workflow_design", "ai_interaction"],
      ethic: ["ai_ethics_trust"],
      trust: ["ai_ethics_trust"],
      bias: ["ai_ethics_trust", "ai_output_evaluation"],
      fairness: ["ai_ethics_trust"],
      governance: ["ai_ethics_trust", "ai_change_leadership"],
      compliance: ["ai_ethics_trust"],
      regulat: ["ai_ethics_trust"],
      transform: ["ai_change_leadership", "workforce_ai_readiness"],
      change: ["ai_change_leadership"],
      adopt: ["ai_change_leadership", "workforce_ai_readiness"],
      train: ["workforce_ai_readiness", "ai_interaction"],
      learn: ["workforce_ai_readiness"],
      upskill: ["workforce_ai_readiness", "ai_interaction"],
      reskill: ["workforce_ai_readiness"],
      talent: ["workforce_ai_readiness", "ai_interaction"],
      analytic: ["ai_output_evaluation", "ai_workflow_design"],
      data: ["ai_output_evaluation", "ai_workflow_design"],
      decision: ["ai_output_evaluation"],
      output: ["ai_output_evaluation"],
      quality: ["ai_output_evaluation"],
      evaluat: ["ai_output_evaluation"],
      leader: ["ai_change_leadership"],
      strateg: ["ai_change_leadership", "workforce_ai_readiness"],
      innovat: ["ai_workflow_design", "ai_change_leadership"],
      productiv: ["ai_workflow_design", "ai_interaction"],
      efficien: ["ai_workflow_design"],
    };

    function mapPriorityToDomains(priority: string): DomainKey[] {
      const lower = priority.toLowerCase();
      const matched = new Set<DomainKey>();
      for (const [keyword, domains] of Object.entries(PRIORITY_DOMAIN_MAP)) {
        if (lower.includes(keyword)) {
          for (const d of domains) matched.add(d);
        }
      }
      // Default: all domains if no match
      if (matched.size === 0) return [...DOMAIN_KEYS].slice(0, 3);
      return Array.from(matched);
    }

    const priorities = strategicPriorities.map((p, idx) => {
      const relevantDomains = mapPriorityToDomains(p);
      const domainDetails = relevantDomains.map(dk => ({
        domain: dk,
        domainName: DOMAIN_LABELS[dk],
        avgScore: domainAvgs[dk],
        colour: DOMAIN_COLOURS[dk],
      }));
      const avgRelevantScore = domainDetails.filter(d => d.avgScore !== null).length > 0
        ? Math.round(domainDetails.filter(d => d.avgScore !== null).reduce((sum, d) => sum + (d.avgScore ?? 0), 0) / domainDetails.filter(d => d.avgScore !== null).length)
        : null;
      const alignmentStatus: "aligned" | "partial" | "gap" | "unknown" =
        avgRelevantScore === null ? "unknown" :
        avgRelevantScore >= 70 ? "aligned" :
        avgRelevantScore >= 50 ? "partial" : "gap";
      return {
        priority: p,
        index: idx,
        relevantDomains: domainDetails,
        avgRelevantScore,
        alignmentStatus,
      };
    });

    // Governance readiness signal
    const governanceScore = (
      (orgCtx.aiGovernanceFramework ? 25 : 0) +
      (orgCtx.aiEthicsCommittee ? 25 : 0) +
      (orgCtx.hasDataProtectionPolicy ? 15 : 0) +
      ((orgCtx as any).aiPolicyStatus === "approved" || (orgCtx as any).aiPolicyStatus === "embedded" ? 25 : (orgCtx as any).aiPolicyStatus === "draft" ? 10 : 0) +
      (orgCtx.hasEdiPolicy ? 5 : 0) +
      (orgCtx.hasWhistleblowingPolicy ? 5 : 0)
    );
    const governanceReadiness: "strong" | "developing" | "weak" =
      governanceScore >= 70 ? "strong" : governanceScore >= 40 ? "developing" : "weak";

    // Overall alignment
    const alignedCount = priorities.filter(p => p.alignmentStatus === "aligned").length;
    const gapCount = priorities.filter(p => p.alignmentStatus === "gap").length;
    const overallAlignment: "aligned" | "partial" | "misaligned" | null =
      priorities.length === 0 ? null :
      alignedCount === priorities.length ? "aligned" :
      gapCount > priorities.length / 2 ? "misaligned" : "partial";

    return {
      configured: true as const,
      priorities,
      challenges: currentChallenges,
      overallAlignment,
      governanceReadiness,
      governanceScore,
      hrInfluence: orgCtx.hrInfluence,
      aiMaturity: orgCtx.aiMaturityLevel,
      functionAvg,
      assessedCount,
      totalHeadcount: allUsers.length,
    };
  }),

  /** Teams view */
  teams: protectedProcedure.input(z.object({ roleFamily: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rfFilter = input?.roleFamily ?? null;

    // Build set of filtered user IDs for member filtering
    let filteredUserIds: Set<string> | null = null;
    if (rfFilter) {
      const allUsersRf = await db
        .select({ id: users.id, roleFamily: users.roleFamily, jobFunction: users.jobFunction })
        .from(users)
        .where(eq(users.tenantId, ctx.user.tenantId));
      filteredUserIds = new Set(allUsersRf.filter(u => roleFamilyFromUserField(u.roleFamily ?? u.jobFunction) === rfFilter).map(u => u.id));
    }

    // Find all managers (users who have team members)
    const allLinks = await db.select().from(managerTeamMembers);
    const managerIds = Array.from(new Set(allLinks.map(l => l.managerId)));

    const teams: Array<{
      managerId: string;
      managerName: string;
      teamSize: number;
      avgScore: number | null;
      ratingDistribution: Record<RatingKey, number>;
    }> = [];

    for (const managerId of managerIds) {
      const managerRow = await db.select().from(users).where(eq(users.id, managerId)).limit(1);
      if (!managerRow[0]) continue;

      const memberLinks = allLinks.filter(l => l.managerId === managerId);
      let memberIds = memberLinks.map(l => l.memberId);
      // Filter members by role family if set
      if (filteredUserIds) {
        memberIds = memberIds.filter(id => filteredUserIds!.has(id));
        if (memberIds.length === 0) continue; // Skip teams with no matching members
      }

      let totalScore = 0;
      let assessedCount = 0;
      const ratingDist: Record<RatingKey, number> = {
        ai_ready: 0, developing: 0, not_yet_ready: 0, foundation_gap: 0, insufficient_evidence: 0,
      };

      for (const memberId of memberIds) {
        const scoreData = await getLatestScoreData(db, memberId);
        if (scoreData) {
          totalScore += scoreData.overallScore;
          assessedCount++;
          const state = extractReadinessState(scoreData.scoreBreakdownJson);
          ratingDist[stateToRating(state)]++;
        } else {
          ratingDist.insufficient_evidence++;
        }
      }

      teams.push({
        managerId,
        managerName: `${managerRow[0].firstName} ${managerRow[0].lastName}`,
        teamSize: memberIds.length,
        avgScore: assessedCount > 0 ? Math.round(totalScore / assessedCount) : null,
        ratingDistribution: ratingDist,
      });
    }

    return { teams };
  }),

  /** Team × Domain heatmap — returns per-team per-domain average scores */
  teamsHeatmap: protectedProcedure.input(z.object({ roleFamily: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rfFilter = input?.roleFamily ?? null;
    let filteredUserIds: Set<string> | null = null;
    if (rfFilter) {
      const allUsersRf = await db.select({ id: users.id, roleFamily: users.roleFamily, jobFunction: users.jobFunction }).from(users).where(eq(users.tenantId, ctx.user.tenantId));
      filteredUserIds = new Set(allUsersRf.filter(u => roleFamilyFromUserField(u.roleFamily ?? u.jobFunction) === rfFilter).map(u => u.id));
    }
    const allLinks = await db.select().from(managerTeamMembers);
    const managerIds = Array.from(new Set(allLinks.map(l => l.managerId)));
    const rows: Array<{
      managerId: string;
      managerName: string;
      teamSize: number;
      domainScores: Record<string, number | null>;
      overallAvg: number | null;
    }> = [];
    for (const managerId of managerIds) {
      const managerRow = await db.select().from(users).where(eq(users.id, managerId)).limit(1);
      if (!managerRow[0]) continue;
      const memberLinks = allLinks.filter(l => l.managerId === managerId);
      let memberIds = memberLinks.map(l => l.memberId);
      if (filteredUserIds) {
        memberIds = memberIds.filter(id => filteredUserIds!.has(id));
        if (memberIds.length === 0) continue;
      }
      const domainTotals: Record<string, { sum: number; count: number }> = {};
      for (const key of DOMAIN_KEYS) domainTotals[key] = { sum: 0, count: 0 };
      let overallSum = 0; let overallCount = 0;
      for (const memberId of memberIds) {
        const scoreData = await getLatestScoreData(db, memberId);
        if (scoreData) {
          const ds = extractCapabilityScores(scoreData.scoreBreakdownJson);
          overallSum += scoreData.overallScore; overallCount++;
          if (ds) {
            for (const key of DOMAIN_KEYS) {
              if (ds[key] != null) { domainTotals[key].sum += ds[key]; domainTotals[key].count++; }
            }
          }
        }
      }
      const domainScores: Record<string, number | null> = {};
      for (const key of DOMAIN_KEYS) {
        domainScores[key] = domainTotals[key].count > 0 ? Math.round(domainTotals[key].sum / domainTotals[key].count) : null;
      }
      rows.push({
        managerId,
        managerName: `${managerRow[0].firstName} ${managerRow[0].lastName}`,
        teamSize: memberIds.length,
        domainScores,
        overallAvg: overallCount > 0 ? Math.round(overallSum / overallCount) : null,
      });
    }
    return { teams: rows, domains: DOMAIN_KEYS.map(k => ({ key: k, label: DOMAIN_LABELS[k] })) };
  }),

  /** BA-01/BA-02: Readiness vs Ambition gap — org-level and per-priority */
  ambitionGap: protectedProcedure.input(z.object({ roleFamily: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const orgCtxRows = await db.select().from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    const orgCtx = orgCtxRows[0] ?? null;

    const ambitionTargetScore: number | null = (orgCtx as any)?.ambitionTargetScore ?? null;
    const ambitionTargetDate: string | null = (orgCtx as any)?.ambitionTargetDate ?? null;
    const ambitionTargetLabel: string | null = (orgCtx as any)?.ambitionTargetLabel ?? null;
    const strategicPriorities: string[] = (() => {
      try { return JSON.parse(orgCtx?.strategicPrioritiesJson ?? "[]") as string[]; } catch { return []; }
    })();

    const rfFilter = input?.roleFamily ?? null;
    const allUsers = await db
      .select({
        id: users.id,
        scoreBreakdownJson: assessmentScores.scoreBreakdownJson,
        overallScore: assessmentScores.overallScore,
        completedAt: assessmentSessions.completedAt,
      })
      .from(users)
      .innerJoin(assessmentSessions, and(
        eq(assessmentSessions.userId, users.id),
        eq(assessmentSessions.tenantId, users.tenantId),
        eq(assessmentSessions.state, "completed"),
      ))
      .innerJoin(assessmentScores, eq(assessmentScores.sessionId, assessmentSessions.id))
      .where(and(
        eq(users.tenantId, ctx.user.tenantId),
        rfFilter ? eq(users.roleFamily, rfFilter) : undefined,
      ))
      .orderBy(desc(assessmentSessions.completedAt));

    const seenUsers = new Set<string>();
    const userData: { id: string; overallScore: number; domainScores: Record<DomainKey, number> }[] = [];
    for (const u of allUsers) {
      if (seenUsers.has(u.id)) continue;
      seenUsers.add(u.id);
      const domainScores: Record<DomainKey, number> = {} as any;
      try {
        const raw = u.scoreBreakdownJson; const breakdown = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {});
        const caps = (breakdown as any).capabilityScores ?? breakdown; for (const dk of DOMAIN_KEYS) domainScores[dk] = (caps as any)[dk] ?? 50;
      } catch { for (const dk of DOMAIN_KEYS) domainScores[dk] = 50; }
      if (u.overallScore !== null) userData.push({ id: u.id, overallScore: parseFloat(String(u.overallScore)), domainScores });
    }

    const assessedCount = userData.length;
    const functionAvgRaw = assessedCount > 0
      ? Math.round(userData.reduce((s, u) => s + u.overallScore, 0) / assessedCount)
      : null;

    const domainAvgs: Record<DomainKey, number | null> = {} as any;
    for (const dk of DOMAIN_KEYS) {
      const vals = userData.map(u => u.domainScores[dk]);
      domainAvgs[dk] = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
    }

    const gapRaw = (functionAvgRaw !== null && ambitionTargetScore !== null)
      ? ambitionTargetScore - functionAvgRaw : null;

    let verdict: "on_track" | "gap" | "exceeds" | "no_target" = "no_target";
    if (gapRaw !== null) {
      if (gapRaw <= 0) verdict = "exceeds";
      else if (gapRaw <= 10) verdict = "on_track";
      else verdict = "gap";
    }

    const PRIORITY_DOMAIN_MAP: Record<string, DomainKey[]> = {
      recruit: ["ai_interaction", "ai_output_evaluation"], hiring: ["ai_interaction", "ai_output_evaluation"],
      screening: ["ai_interaction", "ai_output_evaluation"], automat: ["ai_workflow_design", "ai_interaction"],
      workflow: ["ai_workflow_design"], process: ["ai_workflow_design", "ai_interaction"],
      ethic: ["ai_ethics_trust"], trust: ["ai_ethics_trust"], bias: ["ai_ethics_trust", "ai_output_evaluation"],
      fairness: ["ai_ethics_trust"], governance: ["ai_ethics_trust", "ai_change_leadership"],
      compliance: ["ai_ethics_trust"], regulat: ["ai_ethics_trust"],
      transform: ["ai_change_leadership", "workforce_ai_readiness"], change: ["ai_change_leadership"],
      adopt: ["ai_change_leadership", "workforce_ai_readiness"], train: ["workforce_ai_readiness", "ai_interaction"],
      learn: ["workforce_ai_readiness"], upskill: ["workforce_ai_readiness", "ai_interaction"],
      reskill: ["workforce_ai_readiness"], talent: ["workforce_ai_readiness", "ai_interaction"],
      analytic: ["ai_output_evaluation", "ai_workflow_design"], data: ["ai_output_evaluation", "ai_workflow_design"],
      decision: ["ai_output_evaluation"], output: ["ai_output_evaluation"], quality: ["ai_output_evaluation"],
      evaluat: ["ai_output_evaluation"], leader: ["ai_change_leadership"],
      strateg: ["ai_change_leadership", "workforce_ai_readiness"],
      innovat: ["ai_workflow_design", "ai_change_leadership"], productiv: ["ai_workflow_design", "ai_interaction"],
      efficien: ["ai_workflow_design"],
    };
    function mapPriorityToDomains2(priority: string): DomainKey[] {
      const lower = priority.toLowerCase();
      const matched = new Set<DomainKey>();
      for (const [keyword, domains] of Object.entries(PRIORITY_DOMAIN_MAP)) {
        if (lower.includes(keyword)) for (const d of domains) matched.add(d);
      }
      if (matched.size === 0) return [...DOMAIN_KEYS].slice(0, 3);
      return Array.from(matched);
    }

    const priorityGaps = strategicPriorities.map((p, idx) => {
      const relevantDomains = mapPriorityToDomains2(p);
      const domainDetails = relevantDomains.map(dk => ({
        domain: dk, domainName: DOMAIN_LABELS[dk], currentScore: domainAvgs[dk], colour: DOMAIN_COLOURS[dk],
      }));
      const scoredDomains = domainDetails.filter(d => d.currentScore !== null);
      const avgCurrentScore = scoredDomains.length > 0
        ? Math.round(scoredDomains.reduce((s, d) => s + (d.currentScore ?? 0), 0) / scoredDomains.length) : null;
      const requiredScore = ambitionTargetScore;
      const gap = (avgCurrentScore !== null && requiredScore !== null) ? requiredScore - avgCurrentScore : null;
      const status: "aligned" | "partial" | "gap" | "unknown" =
        gap === null ? "unknown" : gap <= 0 ? "aligned" : gap <= 15 ? "partial" : "gap";
      return { priority: p, index: idx, relevantDomains: domainDetails, avgCurrentScore, requiredScore, gap, status };
    });

    return {
      configured: ambitionTargetScore !== null,
      ambitionTargetScore, ambitionTargetDate, ambitionTargetLabel,
      functionAvgRaw, gapRaw, verdict, assessedCount, priorityGaps,
    };
  }),

  /**
   * Function-level heatmap: groups users by role_family, returns avg domain scores
   * per function + individual member scores for drill-down.
   */
  functionHeatmap: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Fetch all users in this tenant
    const allUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        jobFunction: users.jobFunction,
        roleFamily: users.roleFamily,
      })
      .from(users)
      .where(eq(users.tenantId, ctx.user.tenantId));

    // Fetch latest completed assessment score for each user
    const allScores = await db
      .select({
        userId: assessmentSessions.userId,
        scoreBreakdownJson: assessmentScores.scoreBreakdownJson,
        overallScore: assessmentScores.overallScore,
        completedAt: assessmentSessions.completedAt,
      })
      .from(assessmentSessions)
      .innerJoin(assessmentScores, eq(assessmentScores.sessionId, assessmentSessions.id))
      .where(
        and(
          eq(assessmentSessions.tenantId, ctx.user.tenantId),
          eq(assessmentSessions.state, "completed")
        )
      )
      .orderBy(desc(assessmentSessions.completedAt));

    // Keep only the latest score per user
    const latestScoreByUser = new Map<string, { overallScore: number | null; domainScores: Record<string, number> }>();
    for (const s of allScores) {
      if (latestScoreByUser.has(s.userId)) continue;
      const domainScores: Record<string, number> = {};
      try {
        const raw = s.scoreBreakdownJson; const breakdown = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
        const caps = breakdown.capabilityScores ?? {};
        for (const [k, v] of Object.entries(caps)) {
          domainScores[k] = typeof v === "number" ? v : ((v as any)?.score ?? 0);
        }
      } catch { /* ignore */ }
      latestScoreByUser.set(s.userId, {
        overallScore: s.overallScore ? Number(s.overallScore) : null,
        domainScores,
      });
    }

    // Group users by role_family
    const functionMap = new Map<string, {
      key: string;
      label: string;
      members: Array<{
        id: string;
        name: string;
        jobFunction: string | null;
        domainScores: Record<string, number>;
        overallScore: number | null;
      }>;
    }>();

    for (const u of allUsers) {
      const rf = u.roleFamily ?? "other";
      if (!functionMap.has(rf)) {
        functionMap.set(rf, {
          key: rf,
          label: ROLE_FAMILY_LABELS[rf as RoleFamilyKey] ?? rf.replace(/_/g, " "),
          members: [],
        });
      }
      const scoreData = latestScoreByUser.get(u.id) ?? { overallScore: null, domainScores: {} };
      functionMap.get(rf)!.members.push({
        id: u.id,
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
        jobFunction: u.jobFunction,
        domainScores: scoreData.domainScores,
        overallScore: scoreData.overallScore,
      });
    }

    // Compute function-level averages
    const functions = Array.from(functionMap.values()).map(fn => {
      const assessed = fn.members.filter(m => m.overallScore !== null);
      // Suppress scores if below anonymisation threshold (privacy protection)
      const meetsThreshold = assessed.length >= ANONYMISATION_THRESHOLD;
      const domainAvgs: Record<string, number | null> = {};
      for (const dk of DOMAIN_KEYS) {
        if (!meetsThreshold) {
          domainAvgs[dk] = null;
        } else {
          const vals = assessed.map(m => m.domainScores[dk]).filter((v): v is number => v != null && !isNaN(v));
          domainAvgs[dk] = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
        }
      }
      const overallVals = assessed.map(m => m.overallScore).filter((v): v is number => v != null);
      const overallAvg = meetsThreshold && overallVals.length > 0
        ? Math.round((overallVals.reduce((a, b) => a + b, 0) / overallVals.length) * 10) / 10
        : null;
      return {
        key: fn.key,
        label: fn.label,
        memberCount: fn.members.length,
        assessedCount: assessed.length,
        // Suppress individual member scores below threshold
        members: meetsThreshold ? fn.members : fn.members.map(m => ({ ...m, overallScore: null, domainScores: {} as Record<string, number> })),
        domainAvgs,
        overallAvg,
        belowThreshold: !meetsThreshold,
        anonymisationThreshold: ANONYMISATION_THRESHOLD,
      };
    }).sort((a, b) => b.memberCount - a.memberCount);

    return {
      functions,
      domains: DOMAIN_KEYS.map(k => ({ key: k, label: DOMAIN_LABELS[k] })),
    };
  }),

  /** Benchmark comparison — tenant domain scores vs industry percentiles */
  benchmarkComparison: protectedProcedure
    .input(z.object({ sectorOverride: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get tenant sector from org context
      const orgCtxRows = await db.select().from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      const orgCtx = orgCtxRows[0] ?? null;
      const tenantSector = input?.sectorOverride ?? orgCtx?.sector ?? "other";

      // Get sector benchmark data
      const benchmark = getSectorBenchmark(tenantSector);
      const allBenchmarks = getAllSectorBenchmarks();
      const availableSectors = allBenchmarks.map(b => ({ id: b.sector_id, name: b.display_name }));

      // Calculate tenant's current domain averages
      const allUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.tenantId, ctx.user.tenantId));

      const domainTotals: Record<string, { total: number; count: number }> = {};
      for (const key of DOMAIN_KEYS) domainTotals[key] = { total: 0, count: 0 };
      let overallTotal = 0;
      let overallCount = 0;

      for (const u of allUsers) {
        const latestSession = await db
          .select({ id: assessmentSessions.id })
          .from(assessmentSessions)
          .where(and(eq(assessmentSessions.userId, u.id), eq(assessmentSessions.state, "completed")))
          .orderBy(desc(assessmentSessions.completedAt))
          .limit(1);
        if (!latestSession[0]) continue;
        const score = await db
          .select()
          .from(assessmentScores)
          .where(eq(assessmentScores.sessionId, latestSession[0].id))
          .limit(1);
        if (!score[0]) continue;
        const domainScores = extractCapabilityScores(score[0].scoreBreakdownJson);
        if (!domainScores) continue;
        overallTotal += parseFloat(String(score[0].overallScore));
        overallCount++;
        for (const key of DOMAIN_KEYS) {
          if (domainScores[key] != null) {
            domainTotals[key].total += domainScores[key];
            domainTotals[key].count++;
          }
        }
      }

      // Map benchmark domain keys (ai_ethics_and_trust → ai_ethics_trust)
      const mapBenchmarkKey = (k: string): string => {
        if (k === "ai_ethics_and_trust") return "ai_ethics_trust";
        return k;
      };

      // Build comparison per domain
      const domainComparison = DOMAIN_KEYS.map(dk => {
        const tenantAvg = domainTotals[dk].count > 0
          ? Math.round((domainTotals[dk].total / domainTotals[dk].count) * 10) / 10
          : null;
        let benchmarkData: { p25: number; p50: number; p75: number } | null = null;
        if (benchmark) {
          const icb = benchmark.individual_capability_benchmarks;
          for (const [bk, bv] of Object.entries(icb)) {
            if (mapBenchmarkKey(bk) === dk) {
              benchmarkData = { p25: bv.p25, p50: bv.p50, p75: bv.p75 };
              break;
            }
          }
        }
        let percentilePosition: string | null = null;
        if (tenantAvg !== null && benchmarkData) {
          const tenantScaled = tenantAvg / 10;
          if (tenantScaled >= benchmarkData.p75) percentilePosition = "top_quartile";
          else if (tenantScaled >= benchmarkData.p50) percentilePosition = "above_median";
          else if (tenantScaled >= benchmarkData.p25) percentilePosition = "below_median";
          else percentilePosition = "bottom_quartile";
        }
        return {
          domain: dk,
          domainName: DOMAIN_LABELS[dk],
          colour: DOMAIN_COLOURS[dk],
          tenantScore: tenantAvg,
          benchmarkP25: benchmarkData ? benchmarkData.p25 * 10 : null,
          benchmarkP50: benchmarkData ? benchmarkData.p50 * 10 : null,
          benchmarkP75: benchmarkData ? benchmarkData.p75 * 10 : null,
          percentilePosition,
          assessedCount: domainTotals[dk].count,
        };
      });

      const tenantOverall = overallCount > 0 ? Math.round((overallTotal / overallCount) * 10) / 10 : null;
      const overallBenchmark = benchmark?.overall_individual_benchmark ?? null;
      let overallPercentile: string | null = null;
      if (tenantOverall !== null && overallBenchmark) {
        const tenantScaled = tenantOverall / 10;
        if (tenantScaled >= overallBenchmark.p75) overallPercentile = "top_quartile";
        else if (tenantScaled >= overallBenchmark.p50) overallPercentile = "above_median";
        else if (tenantScaled >= overallBenchmark.p25) overallPercentile = "below_median";
        else overallPercentile = "bottom_quartile";
      }

      return {
        sector: tenantSector,
        sectorName: benchmark?.display_name ?? tenantSector.replace(/_/g, " "),
        availableSectors,
        tenantOverallScore: tenantOverall,
        overallBenchmark: overallBenchmark ? {
          p25: overallBenchmark.p25 * 10,
          p50: overallBenchmark.p50 * 10,
          p75: overallBenchmark.p75 * 10,
        } : null,
        overallPercentile,
        domainComparison,
        assessedCount: overallCount,
        totalHeadcount: allUsers.length,
        organisationalMaturity: benchmark?.organisational_maturity_benchmark ?? null,
      };
    }),
});

// ─── Export combined router ──────────────────────────────────────────────────

export const dashboardV2Router = router({
  individual: individualRouter,
  manager: managerRouter,
  leader: leaderRouter,
});
