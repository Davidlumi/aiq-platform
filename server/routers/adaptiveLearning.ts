/**
 * Adaptive Learning Router — AiQ Platform
 *
 * Procedures:
 *   getGapAnalysis        — get or generate gap analysis for latest assessment
 *   getAdaptivePlan       — get or generate adaptive learning plan
 *   getModuleDetail       — get full module content for the player
 *   markModuleComplete    — mark a module done, update spaced repetition
 *   updateModuleProgress  — update in-progress state
 *   getDueReviews         — get spaced repetition queue items due today
 *   getCapabilityProgress — get progress per capability over time
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { assessmentProcedure as protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  gapAnalyses,
  adaptiveLearningPlans,
  adaptivePlanItems,
  learningModules,
  learningModuleTags,
  spacedRepetitionQueue,
  assessmentScores,
  assessmentSessions,
} from "../../drizzle/schema";
import { eq, and, desc, lte, asc, gte, inArray, sql, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { computeGapAnalysis, type CapabilityKey } from "../learning/gapAnalysisEngine";
import { notifyOwner } from "../_core/notification";
import { pushNotification } from "../sse";
import { generateAdaptivePlan, computeNextReview, type ModuleCandidate } from "../learning/learningPathGenerator";
import { getUserRoleKeys } from "../db";
import {
  modulePersonalisationCache,
  formativeQuizResults,
  learningStreaks,
  managerTeamMembers,
  learningNudges,
  learningMilestones,
  users,
  userStates,
  ailOrgContext,
  auditLogs,
  moduleEngagementEvents,
  coachingConversations,
  strategies,
  strategyInitiatives,
  strategyInitiativeLibrary,
  moduleFeedback,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { assertLLMRateLimit } from "../_core/llmRateLimit";

// ─── Helper: resolve seniority tier from session metadata ────────────────────
function resolveSeniorityTier(sessionMetaJson: unknown): string {
  try {
    if (!sessionMetaJson) return "mid";
    const meta = typeof sessionMetaJson === "string"
      ? JSON.parse(sessionMetaJson as string)
      : (sessionMetaJson ?? {}) as Record<string, unknown>;
    const seniority = String(meta?.seniorityLevel ?? "").toLowerCase();
    if (seniority.includes("junior") || seniority.includes("entry")) return "junior";
    if (seniority.includes("senior") || seniority.includes("lead") || seniority.includes("head")) return "senior";
    if (seniority.includes("director") || seniority.includes("vp") || seniority.includes("chief")) return "lead";
    return "mid";
  } catch {
    return "mid";
  }
}

// ─── Helper: extract capability scores from assessment score row ──────────────
function extractCapabilityScores(scoreRow: { scoreBreakdownJson: unknown }): Partial<Record<CapabilityKey, number>> {
  try {
    const breakdown = typeof scoreRow.scoreBreakdownJson === "string"
      ? JSON.parse(scoreRow.scoreBreakdownJson as string)
      : (scoreRow.scoreBreakdownJson ?? {}) as Record<string, unknown>;
    const rawCaps = breakdown.capabilityScores as Record<string, unknown> | undefined;
    if (!rawCaps) return {};
    const result: Partial<Record<CapabilityKey, number>> = {};
    for (const [k, v] of Object.entries(rawCaps)) {
      result[k as CapabilityKey] = typeof v === "number" ? v : (v as any)?.score ?? 50;
    }
    return result;
  } catch {
    return {};
  }
}

export const adaptiveLearningRouter = router({

  // ─── Get or generate gap analysis ─────────────────────────────────────────
  getGapAnalysis: protectedProcedure
    .input(z.object({
      sessionId: z.string().optional(),
      forceRegenerate: z.boolean().default(false),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Find the target session
      let sessionId = input.sessionId;
      let sessionRow: { id: string; metadataJson: unknown } | null = null;

      if (sessionId) {
        const rows = await db.select({ id: assessmentSessions.id, sessionMetadataJson: assessmentSessions.sessionMetadataJson }).from(assessmentSessions).where(eq(assessmentSessions.id, sessionId)).limit(1);
        sessionRow = rows[0] ? { id: rows[0].id, metadataJson: rows[0].sessionMetadataJson } : null;
      } else {
        const rows = await db.select({ id: assessmentSessions.id, sessionMetadataJson: assessmentSessions.sessionMetadataJson }).from(assessmentSessions)
          .where(and(eq(assessmentSessions.userId, ctx.user.id), eq(assessmentSessions.state, "completed")))
          .orderBy(desc(assessmentSessions.completedAt))
          .limit(1);
        sessionRow = rows[0] ? { id: rows[0].id, metadataJson: rows[0].sessionMetadataJson } : null;
        sessionId = sessionRow?.id;
      }

      // Check for existing gap analysis (unless forced regeneration)
      if (!input.forceRegenerate && sessionId) {
        const existing = await db.select().from(gapAnalyses)
          .where(and(eq(gapAnalyses.userId, ctx.user.id), eq(gapAnalyses.sessionId, sessionId)))
          .orderBy(desc(gapAnalyses.generatedAt))
          .limit(1);
        if (existing[0]) return existing[0];
      }

      // Get assessment scores
      let capabilityScores: Partial<Record<CapabilityKey, number>> = {};
      let overallScore = 50;
      if (sessionId) {
        const scores = await db.select().from(assessmentScores)
          .where(eq(assessmentScores.sessionId, sessionId))
          .limit(1);
        if (scores[0]) {
          capabilityScores = extractCapabilityScores(scores[0]);
          overallScore = parseFloat(String(scores[0].overallScore));
        }
      }

      // Resolve seniority tier
      const seniorityTier = resolveSeniorityTier((sessionRow as any)?.metadataJson);

      // Compute gap analysis
      const analysis = computeGapAnalysis(capabilityScores, seniorityTier);

      // Persist
      const gapId = nanoid();
      await db.insert(gapAnalyses).values({
        id: gapId,
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
        sessionId: sessionId ?? null,
        capabilityGapsJson: JSON.stringify(analysis.capabilityGaps) as any,
        priorityOrderJson: JSON.stringify(analysis.priorityOrder) as any,
        overallReadinessScore: analysis.overallReadinessScore.toFixed(2) as any,
        readinessBand: analysis.readinessBand,
        generatedAt: Date.now(),
      });

      const row = await db.select().from(gapAnalyses).where(eq(gapAnalyses.id, gapId)).limit(1);
      return row[0];
    }),

  // ─── Get or generate adaptive learning plan ───────────────────────────────
  getAdaptivePlan: protectedProcedure
    .input(z.object({
      sessionId: z.string().optional(),
      forceRegenerate: z.boolean().default(false),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check for existing active plan
      if (!input.forceRegenerate) {
        const existing = await db.select().from(adaptiveLearningPlans)
          .where(and(eq(adaptiveLearningPlans.userId, ctx.user.id), eq(adaptiveLearningPlans.state, "active")))
          .orderBy(desc(adaptiveLearningPlans.generatedAt))
          .limit(1);

        if (existing[0]) {
          return await enrichPlan(db, existing[0], ctx.user.id);
        }
      }

      // Get or generate gap analysis first
      let sessionId = input.sessionId;
      if (!sessionId) {
        const latestSession = await db.select().from(assessmentSessions)
          .where(and(eq(assessmentSessions.userId, ctx.user.id), eq(assessmentSessions.state, "completed")))
          .orderBy(desc(assessmentSessions.completedAt))
          .limit(1);
        sessionId = latestSession[0]?.id;
      }

      // Get or create gap analysis
      let gapRow = sessionId
        ? (await db.select().from(gapAnalyses)
            .where(and(eq(gapAnalyses.userId, ctx.user.id), eq(gapAnalyses.sessionId, sessionId)))
            .orderBy(desc(gapAnalyses.generatedAt))
            .limit(1))[0]
        : null;

      if (!gapRow) {
        // Generate gap analysis inline
        let capabilityScores: Partial<Record<CapabilityKey, number>> = {};
        let sessionMetaJson: unknown = {};
        if (sessionId) {
          const scores = await db.select().from(assessmentScores).where(eq(assessmentScores.sessionId, sessionId)).limit(1);
          if (scores[0]) capabilityScores = extractCapabilityScores(scores[0]);
          const sess = await db.select({ sessionMetadataJson: assessmentSessions.sessionMetadataJson }).from(assessmentSessions).where(eq(assessmentSessions.id, sessionId)).limit(1);
          sessionMetaJson = sess[0]?.sessionMetadataJson;
        }
        const seniorityTier = resolveSeniorityTier(sessionMetaJson);
        const analysis = computeGapAnalysis(capabilityScores, seniorityTier);
        const gapId = nanoid();
        await db.insert(gapAnalyses).values({
          id: gapId,
          userId: ctx.user.id,
          tenantId: ctx.user.tenantId,
          sessionId: sessionId ?? null,
          capabilityGapsJson: JSON.stringify(analysis.capabilityGaps) as any,
          priorityOrderJson: JSON.stringify(analysis.priorityOrder) as any,
          overallReadinessScore: analysis.overallReadinessScore.toFixed(2) as any,
          readinessBand: analysis.readinessBand,
          generatedAt: Date.now(),
        });
        const rows = await db.select().from(gapAnalyses).where(eq(gapAnalyses.id, gapId)).limit(1);
        gapRow = rows[0];
      }

      if (!gapRow) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate gap analysis" });

      // Load all published modules
      const allModules = await db.select().from(learningModules).where(eq(learningModules.status, "published"));
      const moduleCandidates: ModuleCandidate[] = allModules.map(m => ({
        id: m.id,
        key: m.key,
        title: m.title,
        capability: m.capability,
        signalKeys: (m as any).signalKeysJson ? (() => { try { return JSON.parse((m as any).signalKeysJson as string).join(","); } catch { return undefined; } })() : undefined,
        modality: m.modality as any,
        difficulty: m.difficulty,
        durationMins: m.durationMins,
        levelLabel: m.levelLabel,
        isBlockResolution: (m as any).isBlockResolution ?? false,
        regulatoryTags: (m as any).regulatoryTags ?? undefined,
      }));

      // Parse gap analysis
      const capabilityGaps = typeof gapRow.capabilityGapsJson === "string"
        ? JSON.parse(gapRow.capabilityGapsJson as string)
        : gapRow.capabilityGapsJson;
      const priorityOrder = typeof gapRow.priorityOrderJson === "string"
        ? JSON.parse(gapRow.priorityOrderJson as string)
        : gapRow.priorityOrderJson;

      const gapAnalysisResult = {
        capabilityGaps,
        priorityOrder,
        overallReadinessScore: parseFloat(String(gapRow.overallReadinessScore)),
        readinessBand: gapRow.readinessBand as any,
        criticalCount: Object.values(capabilityGaps).filter((g: any) => g.severity === "critical").length,
        developingCount: Object.values(capabilityGaps).filter((g: any) => g.severity === "developing").length,
        proficientCount: Object.values(capabilityGaps).filter((g: any) => g.severity === "proficient").length,
        advancedCount: Object.values(capabilityGaps).filter((g: any) => g.severity === "advanced").length,
        topGap: null as any,
        recommendedFocusAreas: [] as string[],
      };

      // Fetch org context for regulatory frameworks
      const orgCtxRows = await db.select().from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .orderBy(desc(ailOrgContext.updatedAt))
        .limit(1);
      const orgCtx = orgCtxRows[0];
      const ukRegulatoryFrameworks: string[] = orgCtx?.ukRegulatoryFrameworksJson
        ? (() => { try { return JSON.parse(orgCtx.ukRegulatoryFrameworksJson as string); } catch { return []; } })()
        : [];
      // Fetch user state for foundation gap detection
      const userStateRows = await db.select().from(userStates)
        .where(eq(userStates.userId, ctx.user.id))
        .orderBy(desc(userStates.effectiveFrom))
        .limit(1);
      const userState = userStateRows[0];
      const foundationGapState = userState?.primaryState === "foundation_gap";
      // Fetch blocking failure modes from latest session scores (stored in scoreBreakdownJson.failureModes)
      let blockingFailureModes: string[] = [];
      if (sessionId) {
        const scoreRows = await db.select().from(assessmentScores)
          .where(eq(assessmentScores.sessionId, sessionId)).limit(1);
        if (scoreRows[0]?.scoreBreakdownJson) {
          try {
            const breakdown = typeof scoreRows[0].scoreBreakdownJson === "string"
              ? JSON.parse(scoreRows[0].scoreBreakdownJson as string)
              : (scoreRows[0].scoreBreakdownJson as Record<string, unknown>);
            const fmRaw = (breakdown as any)?.failureModes;
            blockingFailureModes = (Array.isArray(fmRaw) ? fmRaw : [])
              .filter((fm: any) => fm.classificationImpact === "blocking")
              .map((fm: any) => fm.mode as string);
          } catch { /* ignore parse errors */ }
        }
      }
      // Generate plan items with 4-stage prescription engine
      const planItems = generateAdaptivePlan(gapAnalysisResult, moduleCandidates, {
        maxModules: 30,
        blockingFailureModes,
        foundationGapState,
        ukRegulatoryFrameworks,
      });

      // Supersede existing active plans
      await db.update(adaptiveLearningPlans)
        .set({ state: "superseded" })
        .where(and(eq(adaptiveLearningPlans.userId, ctx.user.id), eq(adaptiveLearningPlans.state, "active")));

      const totalMins = planItems.reduce((sum, item) => {
        const mod = allModules.find(m => m.id === item.moduleId);
        return sum + (mod?.durationMins ?? 0);
      }, 0);

      const planId = nanoid();
      await db.insert(adaptiveLearningPlans).values({
        id: planId,
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
        gapAnalysisId: gapRow.id,
        sessionId: sessionId ?? null,
        state: "active",
        generatorVersion: "v3-adaptive",
        totalModules: planItems.length,
        completedModules: 0,
        estimatedTotalMins: totalMins,
        summaryJson: JSON.stringify({
          readinessBand: gapRow.readinessBand,
          overallReadinessScore: gapRow.overallReadinessScore,
          phaseBreakdown: {
            foundation: planItems.filter(i => i.phase === "foundation").length,
            development: planItems.filter(i => i.phase === "development").length,
            practice: planItems.filter(i => i.phase === "practice").length,
            validation: planItems.filter(i => i.phase === "validation").length,
          },
        }) as any,
        generatedAt: Date.now(),
      });

      // Insert plan items — items with unlockAfterModuleId start as 'locked'
      for (const item of planItems) {
        const hasUnlockDependency = !!item.unlockAfterModuleId;
        await db.insert(adaptivePlanItems).values({
          id: nanoid(),
          planId,
          moduleId: item.moduleId,
          orderIndex: item.orderIndex,
          phase: item.phase,
          required: item.required,
          unlockAfterModuleId: item.unlockAfterModuleId ?? null,
          status: hasUnlockDependency ? "locked" : "available",
          reasonJson: JSON.stringify(item.reasonJson) as any,
          assignedAt: Date.now(),
        });
      }

      const plan = await db.select().from(adaptiveLearningPlans).where(eq(adaptiveLearningPlans.id, planId)).limit(1);
      return await enrichPlan(db, plan[0], ctx.user.id);
    }),

  // ─── Get module detail ─────────────────────────────────────────────────────
  getModuleDetail: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const mod = await db.select().from(learningModules).where(eq(learningModules.id, input.moduleId)).limit(1);
      if (!mod[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const tags = await db.select().from(learningModuleTags).where(eq(learningModuleTags.moduleId, input.moduleId));

      // Get user's spaced repetition state for this module
      const srq = await db.select().from(spacedRepetitionQueue)
        .where(and(eq(spacedRepetitionQueue.userId, ctx.user.id), eq(spacedRepetitionQueue.moduleId, input.moduleId)))
        .limit(1);

      return { ...mod[0], tags, spacedRepetition: srq[0] ?? null };
    }),

  // ─── Mark module complete ──────────────────────────────────────────────────
  markModuleComplete: protectedProcedure
    .input(z.object({
      moduleId: z.string(),
      planItemId: z.string().optional(),
      score: z.number().min(0).max(100).default(75),
      timeSpentMins: z.number().min(0).default(0),
      reflectionText: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = Date.now();

      // P3-LL-3: Derive completionState from engagement depth (time-on-task vs expected duration)
      const modRow = await db.select({ durationMins: learningModules.durationMins })
        .from(learningModules).where(eq(learningModules.id, input.moduleId)).limit(1);
      const expectedMins = modRow[0]?.durationMins ?? 10;
      const timeRatio = input.timeSpentMins > 0 ? input.timeSpentMins / expectedMins : 0;
      const hasReflection = !!(input.reflectionText && input.reflectionText.trim().length > 20);
      let completionState: "completed" | "completed_with_engagement" | "partial" | "opened";
      if (timeRatio >= 0.8 && (hasReflection || input.score >= 70)) {
        completionState = "completed_with_engagement"; // deep engagement: time + reflection/score
      } else if (timeRatio >= 0.5) {
        completionState = "completed"; // adequate engagement
      } else if (timeRatio >= 0.2) {
        completionState = "partial"; // opened and partially engaged
      } else {
        completionState = "opened"; // barely engaged
      }

      // AL-07: Mastery gate threshold — score must meet 70% to unlock next-stage items
      const MASTERY_GATE_THRESHOLD = 70;
      let masteryGateBlocked = false;
      let masteryGateMessage: string | null = null;

      // Update plan item
      if (input.planItemId) {
        // Retrieve current item's prescription stage from reasonJson
        const currentItemRow = await db.select({
          reasonJson: adaptivePlanItems.reasonJson,
          planId: adaptivePlanItems.planId,
        }).from(adaptivePlanItems).where(eq(adaptivePlanItems.id, input.planItemId)).limit(1);

        const currentReasonJson = (() => {
          try {
            const rj = currentItemRow[0]?.reasonJson;
            return typeof rj === "string" ? JSON.parse(rj) : (rj ?? {});
          } catch { return {}; }
        })() as Record<string, unknown>;
        const currentStage = (currentReasonJson.prescriptionStage as number) ?? 1;

        await db.update(adaptivePlanItems)
          .set({
            status: "completed",
            completedAt: now,
            completionState: completionState as any,
            scoreJson: JSON.stringify({
              score: input.score,
              timeSpentMins: input.timeSpentMins,
              reflectionText: input.reflectionText,
              completionState,
              timeRatio: Math.round(timeRatio * 100),
              masteryGateBlocked: input.score < MASTERY_GATE_THRESHOLD,
            }) as any,
          })
          .where(eq(adaptivePlanItems.id, input.planItemId));

        // Unlock next items in the plan — but only if mastery gate passes
        const planId = currentItemRow[0]?.planId ?? null;

        if (planId) {
          if (input.score >= MASTERY_GATE_THRESHOLD) {
            // Score meets threshold — unlock dependent items
            await db.update(adaptivePlanItems)
              .set({ status: "available" })
              .where(and(
                eq(adaptivePlanItems.planId, planId),
                eq(adaptivePlanItems.unlockAfterModuleId, input.moduleId),
                eq(adaptivePlanItems.status, "locked"),
              ));
          } else {
            // Score below threshold — keep dependent items locked (mastery gate blocked)
            masteryGateBlocked = true;
            masteryGateMessage = `Your score of ${input.score}% is below the ${MASTERY_GATE_THRESHOLD}% mastery threshold. ` +
              `Retake this module to unlock the next stage. Focus on areas where you scored lowest.`;
          }

          // Update plan completion count
          const allItems = await db.select({ status: adaptivePlanItems.status })
            .from(adaptivePlanItems).where(eq(adaptivePlanItems.planId, planId));
          const completedCount = allItems.filter(i => i.status === "completed").length;
          const allComplete = allItems.every(i => ["completed", "skipped"].includes(i.status));

          await db.update(adaptiveLearningPlans)
            .set({
              completedModules: completedCount,
              state: allComplete ? "completed" : "active",
              completedAt: allComplete ? now : null,
            })
            .where(eq(adaptiveLearningPlans.id, planId));
        }
      }

      // Update spaced repetition queue
      const existing = await db.select().from(spacedRepetitionQueue)
        .where(and(eq(spacedRepetitionQueue.userId, ctx.user.id), eq(spacedRepetitionQueue.moduleId, input.moduleId)))
        .limit(1);

      if (existing[0]) {
        const update = computeNextReview(
          input.score,
          parseFloat(String(existing[0].intervalDays)),
          parseFloat(String(existing[0].easeFactor)),
          existing[0].repetitions,
        );
        await db.update(spacedRepetitionQueue)
          .set({
            nextDueAt: update.nextDueAt,
            intervalDays: update.intervalDays.toFixed(2) as any,
            easeFactor: update.easeFactor.toFixed(3) as any,
            repetitions: update.repetitions,
            lastScore: input.score.toFixed(2) as any,
            updatedAt: now,
          })
          .where(eq(spacedRepetitionQueue.id, existing[0].id));
      } else {
        const update = computeNextReview(input.score, 1, 2.5, 0);
        await db.insert(spacedRepetitionQueue).values({
          id: nanoid(),
          userId: ctx.user.id,
          moduleId: input.moduleId,
          planItemId: input.planItemId ?? null,
          nextDueAt: update.nextDueAt,
          intervalDays: update.intervalDays.toFixed(2) as any,
          easeFactor: update.easeFactor.toFixed(3) as any,
          repetitions: update.repetitions,
          lastScore: input.score.toFixed(2) as any,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Update learning streak
      const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const streakModRow = await db.select({ durationMins: learningModules.durationMins })
        .from(learningModules).where(eq(learningModules.id, input.moduleId)).limit(1);
      const durationMins = streakModRow[0]?.durationMins ?? 0;

      const streakRow = await db.select().from(learningStreaks)
        .where(eq(learningStreaks.userId, ctx.user.id)).limit(1);

      if (streakRow[0]) {
        const lastDate = streakRow[0].lastActivityDate;
        const yesterday = new Date(now - 86400000).toISOString().slice(0, 10);
        const newStreak = lastDate === todayStr
          ? (streakRow[0].currentStreak ?? 0)
          : lastDate === yesterday
            ? (streakRow[0].currentStreak ?? 0) + 1
            : 1; // streak broken — reset to 1
        const newLongest = Math.max(streakRow[0].longestStreak ?? 0, newStreak);
        const newTotal = (streakRow[0].totalModulesCompleted ?? 0) + 1;
        const newMins = (streakRow[0].totalMinsLearned ?? 0) + (input.timeSpentMins || durationMins);

        // Check for new milestones
        const MILESTONES = [1, 5, 10, 25, 50, 100];
        const existingMilestones = (streakRow[0].milestonesJson as string[] | null) ?? [];
        const newMilestones = MILESTONES
          .filter(m => newTotal >= m && !existingMilestones.includes(`modules_${m}`))
          .map(m => `modules_${m}`);
        const allMilestones = [...existingMilestones, ...newMilestones];

        await db.update(learningStreaks)
          .set({
            currentStreak: newStreak,
            longestStreak: newLongest,
            lastActivityDate: todayStr,
            totalModulesCompleted: newTotal,
            totalMinsLearned: newMins,
            milestonesJson: allMilestones as any,
            updatedAt: now,
          })
          .where(eq(learningStreaks.userId, ctx.user.id));
      } else {
        await db.insert(learningStreaks).values({
          id: nanoid(),
          userId: ctx.user.id,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: todayStr,
          totalModulesCompleted: 1,
          totalMinsLearned: input.timeSpentMins || durationMins,
          milestonesJson: ["modules_1"] as any,
          updatedAt: now,
        });
      }

      // SSE real-time notification: milestone or completion event
      if (!masteryGateBlocked) {
        pushNotification(ctx.user.id, {
          type: "milestone",
          title: "Module completed!",
          body: input.score >= 80 ? `Great score: ${input.score}%` : `Score: ${input.score}%`,
          link: "/learning",
        });
      }
      return {
        success: true,
        masteryGateBlocked,
        masteryGateMessage,
        masteryGateThreshold: MASTERY_GATE_THRESHOLD,
        score: input.score,
      };
    }),
  // ─── Get due reviews ────────────────────────────────────────────────────────
  getDueReviews: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = Date.now();
      const dueItems = await db.select().from(spacedRepetitionQueue)
        .where(and(eq(spacedRepetitionQueue.userId, ctx.user.id), lte(spacedRepetitionQueue.nextDueAt, now)))
        .orderBy(asc(spacedRepetitionQueue.nextDueAt))
        .limit(10);

      const withModules = await Promise.all(dueItems.map(async item => {
        const mod = await db.select().from(learningModules).where(eq(learningModules.id, item.moduleId)).limit(1);
        return { ...item, module: mod[0] ?? null };
      }));

      return withModules;
    }),

  // ─── Get capability progress ───────────────────────────────────────────────
  getCapabilityProgress: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get active plan
      const plan = await db.select().from(adaptiveLearningPlans)
        .where(and(eq(adaptiveLearningPlans.userId, ctx.user.id), eq(adaptiveLearningPlans.state, "active")))
        .orderBy(desc(adaptiveLearningPlans.generatedAt))
        .limit(1);

      if (!plan[0]) return { capabilities: {}, totalProgress: 0 };

      const items = await db.select().from(adaptivePlanItems)
        .where(eq(adaptivePlanItems.planId, plan[0].id));

      const moduleIds = items.map(i => i.moduleId);
      const modulesRaw = moduleIds.length > 0
        ? await db.select().from(learningModules).where(inArray(learningModules.id, moduleIds))
        : [];
      const moduleMap = new Map(modulesRaw.map(m => [m.id, m]));

      // Group by capability
      const capProgress: Record<string, { total: number; completed: number; inProgress: number }> = {};
      for (let i = 0; i < items.length; i++) {
        const mod = moduleMap.get(items[i].moduleId);
        if (!mod) continue;
        const cap = mod.capability;
        if (!capProgress[cap]) capProgress[cap] = { total: 0, completed: 0, inProgress: 0 };
        capProgress[cap].total++;
        if (items[i].status === "completed") capProgress[cap].completed++;
        if (items[i].status === "in_progress") capProgress[cap].inProgress++;
      }

      const totalItems = items.length;
      const completedItems = items.filter(i => i.status === "completed").length;
      const totalProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return { capabilities: capProgress, totalProgress, planId: plan[0].id };
    }),

  // ─── List all modules (for content library) ────────────────────────────────
  listModules: protectedProcedure
    .input(z.object({
      capability: z.string().optional(),
      modality: z.string().optional(),
      difficulty: z.number().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(24),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const all = await db.select().from(learningModules).where(eq(learningModules.status, "published"));

      let filtered = all;
      if (input.capability) filtered = filtered.filter(m => m.capability === input.capability);
      if (input.modality) filtered = filtered.filter(m => m.modality === input.modality);
      if (input.difficulty) filtered = filtered.filter(m => m.difficulty === input.difficulty);

      const offset = (input.page - 1) * input.pageSize;
      return {
        items: filtered.slice(offset, offset + input.pageSize),
        total: filtered.length,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // ─── Improvement 1: LLM-personalised module content ───────────────────────
  getPersonalisedModuleContext: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check cache first
      const cached = await db.select().from(modulePersonalisationCache)
        .where(and(
          eq(modulePersonalisationCache.userId, ctx.user.id),
          eq(modulePersonalisationCache.moduleId, input.moduleId),
        )).limit(1);
      if (cached[0]) return cached[0];

      // Get module details
      const mod = await db.select().from(learningModules).where(eq(learningModules.id, input.moduleId)).limit(1);
      if (!mod[0]) throw new TRPCError({ code: "NOT_FOUND" });

      // Get user's latest gap analysis for context
      const gap = await db.select().from(gapAnalyses)
        .where(eq(gapAnalyses.userId, ctx.user.id))
        .orderBy(desc(gapAnalyses.generatedAt)).limit(1);

      // Get user's session metadata for role context
      const sess = await db.select({ sessionMetadataJson: assessmentSessions.sessionMetadataJson })
        .from(assessmentSessions)
        .where(and(eq(assessmentSessions.userId, ctx.user.id), eq(assessmentSessions.state, "completed")))
        .orderBy(desc(assessmentSessions.completedAt)).limit(1);

      const sessionMeta = sess[0]?.sessionMetadataJson as Record<string, unknown> | null ?? {};
      const roleArchetype = String(sessionMeta?.roleArchetype ?? sessionMeta?.roleTitle ?? "HR Professional");
      const seniorityLevel = String(sessionMeta?.seniorityLevel ?? "Mid-level");

      const capabilityGaps = gap[0]?.capabilityGapsJson
        ? (typeof gap[0].capabilityGapsJson === "string" ? JSON.parse(gap[0].capabilityGapsJson as string) : gap[0].capabilityGapsJson) as Record<string, { score: number; severity: string }>
        : {};

      const capabilityGap = capabilityGaps[mod[0].capability];
      const gapContext = capabilityGap
        ? `Current score: ${(capabilityGap.score / 10).toFixed(1)}/10 (${capabilityGap.severity} gap)`
        : "No specific gap data available";

      // Generate personalised content via LLM
      const prompt = `You are an expert HR learning designer. Generate personalised learning context for an HR professional.

Learner profile:
- Role: ${roleArchetype}
- Seniority: ${seniorityLevel}
- Capability being studied: ${mod[0].capability}
- ${gapContext}

Module: "${mod[0].title}" (${mod[0].modality}, Level ${mod[0].difficulty})

Generate a JSON response with:
1. personalisedIntro: A 2-3 sentence personalised introduction explaining WHY this module matters specifically for their role and gap (mention their role explicitly)
2. contextualExamples: Array of 2 role-specific examples showing how this capability applies in their day-to-day work
3. failureModeCallouts: Array of 1-2 specific failure modes this module will help them avoid, framed as "Without this skill, you might..." statements

Be specific, practical, and directly relevant to ${roleArchetype} at ${seniorityLevel} level.
CONSTRAINTS: Do NOT use encouragement-machine language. Do NOT make generic recommendations. DO name specific initiatives, frameworks, and sector contexts where relevant.`;

      let personalisedIntro = "";
      let contextualExamples: string[] = [];
      let failureModeCallouts: string[] = [];

      try {
        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert HR learning designer. Always respond with valid JSON." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "personalised_context",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  personalisedIntro: { type: "string" },
                  contextualExamples: { type: "array", items: { type: "string" } },
                  failureModeCallouts: { type: "array", items: { type: "string" } },
                },
                required: ["personalisedIntro", "contextualExamples", "failureModeCallouts"],
                additionalProperties: false,
              },
            },
          },
        });
        const parsed = JSON.parse(llmResponse.choices[0].message.content as string);
        personalisedIntro = parsed.personalisedIntro ?? "";
        contextualExamples = parsed.contextualExamples ?? [];
        failureModeCallouts = parsed.failureModeCallouts ?? [];
      } catch {
        personalisedIntro = `As a ${roleArchetype}, mastering ${mod[0].capability.replace(/_/g, " ")} is essential for effective AI-augmented HR practice.`;
        contextualExamples = [];
        failureModeCallouts = [];
      }

      // Cache the result
      const cacheId = nanoid();
      await db.insert(modulePersonalisationCache).values({
        id: cacheId,
        userId: ctx.user.id,
        moduleId: input.moduleId,
        roleArchetype,
        seniorityLevel,
        personalisedIntro,
        contextualExamples: contextualExamples as any,
        failureModeCallouts: failureModeCallouts as any,
        generatedAt: Date.now(),
      });

      const row = await db.select().from(modulePersonalisationCache).where(eq(modulePersonalisationCache.id, cacheId)).limit(1);
      return row[0];
    }),

  // ─── Improvement 3: Submit formative quiz ─────────────────────────────────
  submitFormativeQuiz: protectedProcedure
    .input(z.object({
      moduleId: z.string(),
      planItemId: z.string().optional(),
      answers: z.array(z.object({
        questionIndex: z.number(),
        selectedAnswer: z.string(),
        isCorrect: z.boolean(),
        timeTakenSecs: z.number().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const correct = input.answers.filter(a => a.isCorrect).length;
      const total = input.answers.length;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      const passed = score >= 70 ? 1 : 0;

      const id = nanoid();
      await db.insert(formativeQuizResults).values({
        id,
        userId: ctx.user.id,
        moduleId: input.moduleId,
        planItemId: input.planItemId ?? null,
        score,
        totalQuestions: total,
        answersJson: input.answers as any,
        passed,
        attemptedAt: Date.now(),
      });

      // If passed, update spaced repetition with higher ease factor
      if (passed) {
        const existing = await db.select().from(spacedRepetitionQueue)
          .where(and(eq(spacedRepetitionQueue.userId, ctx.user.id), eq(spacedRepetitionQueue.moduleId, input.moduleId)))
          .limit(1);
        if (existing[0]) {
          const newEase = Math.min(3.5, parseFloat(String(existing[0].easeFactor)) + 0.15);
          await db.update(spacedRepetitionQueue)
            .set({ easeFactor: newEase.toFixed(3) as any, updatedAt: Date.now() })
            .where(eq(spacedRepetitionQueue.id, existing[0].id));
        }
      }

      return { id, score, passed: passed === 1, correct, total };
    }),

  // ─── Improvement 4: Performance-driven spaced repetition update ───────────
  updateSpacedRepetition: protectedProcedure
    .input(z.object({
      moduleId: z.string(),
      quality: z.number().min(0).max(5), // SM-2 quality: 0=blackout, 5=perfect
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db.select().from(spacedRepetitionQueue)
        .where(and(eq(spacedRepetitionQueue.userId, ctx.user.id), eq(spacedRepetitionQueue.moduleId, input.moduleId)))
        .limit(1);

      if (!existing[0]) return { updated: false };

      const next = computeNextReview(
        input.quality * 20, // convert 0-5 quality to 0-100 score
        parseFloat(String(existing[0].intervalDays)),
        parseFloat(String(existing[0].easeFactor)),
        existing[0].repetitions,
      );

      await db.update(spacedRepetitionQueue)
        .set({
          intervalDays: next.intervalDays.toFixed(2) as any,
          easeFactor: next.easeFactor.toFixed(3) as any,
          repetitions: next.repetitions,
          nextDueAt: next.nextDueAt,
          lastScore: input.quality.toFixed(2) as any,
          updatedAt: Date.now(),
        })
        .where(eq(spacedRepetitionQueue.id, existing[0].id));

      return { updated: true, nextDueAt: next.nextDueAt, intervalDays: next.intervalDays };
    }),

  // ─── Improvement 5: Contextual trigger — regenerate plan after new assessment
  triggerPlanRegeneration: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Supersede existing active plans
      await db.update(adaptiveLearningPlans)
        .set({ state: "superseded" })
        .where(and(
          eq(adaptiveLearningPlans.userId, ctx.user.id),
          eq(adaptiveLearningPlans.state, "active"),
        ));

      // Clear personalisation cache so new role context is used
      // (just mark as stale by deleting — will be regenerated on next module open)
      // Note: we don't delete here to avoid breaking in-flight requests

      return { triggered: true, message: "Plan regeneration queued. Refresh your learning plan to see updated recommendations." };
    }),

  // ─── Improvement 8: Manager team dashboard ────────────────────────────────
  getTeamLearningProgress: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get team members
      const members = await db.select().from(managerTeamMembers)
        .where(eq(managerTeamMembers.managerId, ctx.user.id));

      if (members.length === 0) return { members: [], totalMembers: 0 };

      const memberIds = members.map(m => m.memberId);

      // Get progress for each member
      const memberProgress = await Promise.all(memberIds.map(async (memberId) => {
        const userRow = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
          .from(users).where(eq(users.id, memberId)).limit(1);

        const plan = await db.select().from(adaptiveLearningPlans)
          .where(and(eq(adaptiveLearningPlans.userId, memberId), eq(adaptiveLearningPlans.state, "active")))
          .orderBy(desc(adaptiveLearningPlans.generatedAt)).limit(1);

        const streak = await db.select().from(learningStreaks)
          .where(eq(learningStreaks.userId, memberId)).limit(1);

        const gap = await db.select().from(gapAnalyses)
          .where(eq(gapAnalyses.userId, memberId))
          .orderBy(desc(gapAnalyses.generatedAt)).limit(1);

        return {
          userId: memberId,
          name: userRow[0] ? `${userRow[0].firstName} ${userRow[0].lastName}`.trim() : "Unknown",
          email: userRow[0]?.email ?? "",
          plan: plan[0] ? {
            totalModules: plan[0].totalModules,
            completedModules: plan[0].completedModules,
            progressPct: plan[0].totalModules > 0
              ? Math.round((plan[0].completedModules / plan[0].totalModules) * 100)
              : 0,
          } : null,
          streak: streak[0] ? {
            currentStreak: streak[0].currentStreak,
            totalModulesCompleted: streak[0].totalModulesCompleted,
            totalMinsLearned: streak[0].totalMinsLearned,
          } : null,
          readinessBand: gap[0]?.readinessBand ?? null,
          overallScore: gap[0]?.overallReadinessScore ? parseFloat(String(gap[0].overallReadinessScore)) : null,
        };
      }));

      return { members: memberProgress, totalMembers: members.length };
    }),

  addTeamMember: protectedProcedure
    .input(z.object({ memberEmail: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const member = await db.select().from(users).where(and(eq(users.email, input.memberEmail), eq(users.tenantId, ctx.user.tenantId))).limit(1);
      if (!member[0]) throw new TRPCError({ code: "NOT_FOUND", message: "User not found in your organisation" });
      if (member[0].id === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot add yourself" });

      const existing = await db.select().from(managerTeamMembers)
        .where(and(eq(managerTeamMembers.managerId, ctx.user.id), eq(managerTeamMembers.memberId, member[0].id)))
        .limit(1);
      if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "Already a team member" });

      const id = nanoid();
      await db.insert(managerTeamMembers).values({
        id,
        managerId: ctx.user.id,
        memberId: member[0].id,
        addedAt: Date.now(),
      });

      return { id, memberName: `${member[0].firstName} ${member[0].lastName}`.trim(), memberEmail: member[0].email };
    }),

  // ─── Improvement 9: Learning streaks and milestones ───────────────────────
  getLearningStreak: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const streak = await db.select().from(learningStreaks)
        .where(eq(learningStreaks.userId, ctx.user.id)).limit(1);

      if (!streak[0]) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          totalModulesCompleted: 0,
          totalMinsLearned: 0,
          milestones: [],
          nextMilestone: { label: "Complete your first module", target: 1, current: 0 },
        };
      }

      const s = streak[0];
      const milestones = (s.milestonesJson as string[] | null) ?? [];
      const completed = s.totalModulesCompleted ?? 0;

      const MILESTONE_THRESHOLDS = [
        { target: 1, label: "First Step" },
        { target: 5, label: "Getting Started" },
        { target: 10, label: "Building Momentum" },
        { target: 25, label: "Quarter Century" },
        { target: 50, label: "Halfway Hero" },
        { target: 100, label: "Century Learner" },
      ];

      const nextMilestone = MILESTONE_THRESHOLDS.find(m => completed < m.target)
        ?? { target: completed, label: "Master Learner" };

      return {
        currentStreak: s.currentStreak ?? 0,
        longestStreak: s.longestStreak ?? 0,
        totalModulesCompleted: completed,
        totalMinsLearned: s.totalMinsLearned ?? 0,
        milestones,
        nextMilestone: { ...nextMilestone, current: completed },
      };
    }),

  // ─── Phase 3: Record no-transfer finding ──────────────────────────────────
  recordNoTransfer: protectedProcedure
    .input(z.object({
      planItemId: z.string(),
      moduleId: z.string(),
      capability: z.string(),
      noTransferReason: z.enum(["no_engagement", "partial_engagement", "completed_no_change", "regression"]),
      attemptCount: z.number().int().min(1).default(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = Date.now();

      // Update plan item with no-transfer state
      await db.update(adaptivePlanItems)
        .set({
          completionState: "no_transfer" as any,
          noTransferCount: 1,
          scoreJson: JSON.stringify({ noTransfer: true, reason: input.noTransferReason, attemptCount: input.attemptCount }) as any,
        })
        .where(eq(adaptivePlanItems.id, input.planItemId));

      // Find an alternative modality module for the same capability
      const currentMod = await db.select({ modality: learningModules.modality, difficulty: learningModules.difficulty })
        .from(learningModules).where(eq(learningModules.id, input.moduleId)).limit(1);

      const MODALITY_ALTERNATIVES: Record<string, string[]> = {
        tutorial: ["video", "case_study"],
        video: ["tutorial", "practical"],
        case_study: ["scenario", "coaching"],
        practical: ["reflection", "case_study"],
        scenario: ["practical", "coaching"],
        quiz: ["tutorial", "practical"],
        reflection: ["coaching", "scenario"],
        coaching: ["scenario", "reflection"],
      };

      const currentModality = currentMod[0]?.modality ?? "tutorial";
      const alternatives = MODALITY_ALTERNATIVES[currentModality] ?? ["video", "coaching"];

      // Find alternative module
      const allMods = await db.select().from(learningModules)
        .where(and(
          eq(learningModules.status, "published"),
          eq(learningModules.capability, input.capability),
        ));

      const altMod = allMods.find(m =>
        alternatives.includes(m.modality) &&
        m.id !== input.moduleId &&
        Math.abs((m.difficulty ?? 1) - (currentMod[0]?.difficulty ?? 1)) <= 1
      );

      return {
        recorded: true,
        alternativeModuleId: altMod?.id ?? null,
        alternativeModality: altMod?.modality ?? null,
        alternativeTitle: altMod?.title ?? null,
        message: altMod
          ? `We've found an alternative ${altMod.modality} module that may work better for you.`
          : "We've noted this. A learning coach can help identify the right approach.",
      };
    }),

  // ─── Phase 3: Get learning-aware reassessment context ────────────────────────
  getLearningAwareContext: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get recently completed modules (last 30 days)
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recentItems = await db.select({
        moduleId: adaptivePlanItems.moduleId,
        completedAt: adaptivePlanItems.completedAt,
        completionState: adaptivePlanItems.completionState,
        scoreJson: adaptivePlanItems.scoreJson,
      })
        .from(adaptivePlanItems)
        .where(and(
          eq(adaptivePlanItems.status, "completed"),
        ))
        .orderBy(desc(adaptivePlanItems.completedAt))
        .limit(20);

      // Filter to user's plan items
      const activePlan = await db.select({ id: adaptiveLearningPlans.id })
        .from(adaptiveLearningPlans)
        .where(and(
          eq(adaptiveLearningPlans.userId, ctx.user.id),
          eq(adaptiveLearningPlans.state, "active"),
        ))
        .orderBy(desc(adaptiveLearningPlans.generatedAt))
        .limit(1);

      if (!activePlan[0]) return { recentlyLearnedSignals: [], learningAwareMode: false, noTransferModules: [] };

      const planItems = await db.select()
        .from(adaptivePlanItems)
        .where(and(
          eq(adaptivePlanItems.planId, activePlan[0].id),
          eq(adaptivePlanItems.status, "completed"),
        ));

      const recentlyLearnedModuleIds = planItems
        .filter(i => i.completedAt && i.completedAt > thirtyDaysAgo)
        .map(i => i.moduleId);

      const noTransferItems = planItems.filter(i => (i as any).completionState === "no_transfer");

      // Get signal keys for recently learned modules
      const recentModules = recentlyLearnedModuleIds.length > 0
        ? await Promise.all(recentlyLearnedModuleIds.map(id =>
            db.select({ id: learningModules.id, capability: learningModules.capability, signalKeysJson: (learningModules as any).signalKeysJson })
              .from(learningModules).where(eq(learningModules.id, id)).limit(1).then(r => r[0])
          ))
        : [];

      const recentlyLearnedSignals = recentModules
        .filter(Boolean)
        .flatMap(m => {
          try { return m?.signalKeysJson ? JSON.parse(m.signalKeysJson as string) : []; }
          catch { return []; }
        });

      return {
        learningAwareMode: recentlyLearnedModuleIds.length > 0,
        recentlyLearnedSignals: Array.from(new Set(recentlyLearnedSignals)) as string[],
        noTransferModules: noTransferItems.map(i => ({
          planItemId: i.id,
          moduleId: i.moduleId,
          reason: (i as any).noTransferReason ?? "unknown",
        })),
      };
    }),

  // ─── Phase 3: Get transfer findings for a plan ───────────────────────────────
  getTransferFindings: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const plan = await db.select().from(adaptiveLearningPlans)
        .where(and(
          eq(adaptiveLearningPlans.userId, ctx.user.id),
          eq(adaptiveLearningPlans.state, "active"),
        ))
        .orderBy(desc(adaptiveLearningPlans.generatedAt))
        .limit(1);

      if (!plan[0]) return { findings: [], summary: null };

      const items = await db.select().from(adaptivePlanItems)
        .where(eq(adaptivePlanItems.planId, plan[0].id));

      const noTransferItems = items.filter(i => (i as any).completionState === "no_transfer");
      const withEngagementItems = items.filter(i => (i as any).completionState === "completed_with_engagement");
      const completedItems = items.filter(i => i.status === "completed" && (i as any).completionState !== "no_transfer");

      const findings = await Promise.all(noTransferItems.map(async item => {
        const mod = await db.select({ title: learningModules.title, capability: learningModules.capability, modality: learningModules.modality })
          .from(learningModules).where(eq(learningModules.id, item.moduleId)).limit(1);
        return {
          planItemId: item.id,
          moduleId: item.moduleId,
          moduleTitle: mod[0]?.title ?? "Unknown module",
          capability: mod[0]?.capability ?? "unknown",
          modality: mod[0]?.modality ?? "unknown",
          reason: (item as any).noTransferReason ?? "unknown",
          noTransferCount: (item as any).noTransferCount ?? 1,
        };
      }));

      return {
        findings,
        summary: {
          totalModules: items.length,
          completedModules: completedItems.length,
          noTransferModules: noTransferItems.length,
          withEngagementModules: withEngagementItems.length,
          transferRate: items.length > 0
            ? Math.round(((completedItems.length + withEngagementItems.length) / items.length) * 100)
            : 0,
        },
      };
    }),

  // ─── Improvement 10: Peer benchmarking signals ────────────────────────────
  getPeerBenchmarks: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get user's gap analysis
      const myGap = await db.select().from(gapAnalyses)
        .where(eq(gapAnalyses.userId, ctx.user.id))
        .orderBy(desc(gapAnalyses.generatedAt)).limit(1);

      // Get user's streak
      const myStreak = await db.select().from(learningStreaks)
        .where(eq(learningStreaks.userId, ctx.user.id)).limit(1);

      // Get platform-wide stats (anonymised)
      const allStreaks = await db.select({
        totalModulesCompleted: learningStreaks.totalModulesCompleted,
        totalMinsLearned: learningStreaks.totalMinsLearned,
      }).from(learningStreaks);

      const allGaps = await db.select({
        overallReadinessScore: gapAnalyses.overallReadinessScore,
        readinessBand: gapAnalyses.readinessBand,
      }).from(gapAnalyses);

      const avgModulesCompleted = allStreaks.length > 0
        ? Math.round(allStreaks.reduce((sum, s) => sum + (s.totalModulesCompleted ?? 0), 0) / allStreaks.length)
        : 0;

      const avgMinsLearned = allStreaks.length > 0
        ? Math.round(allStreaks.reduce((sum, s) => sum + (s.totalMinsLearned ?? 0), 0) / allStreaks.length)
        : 0;

      const avgReadinessScore = allGaps.length > 0
        ? Math.round(allGaps.reduce((sum, g) => sum + parseFloat(String(g.overallReadinessScore ?? 50)), 0) / allGaps.length)
        : 50;

      const bandCounts = allGaps.reduce((acc, g) => {
        const band = g.readinessBand ?? "developing";
        acc[band] = (acc[band] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const myModulesCompleted = myStreak[0]?.totalModulesCompleted ?? 0;
      const myScore = myGap[0]?.overallReadinessScore ? parseFloat(String(myGap[0].overallReadinessScore)) : 0;

      const modulesPercentile = allStreaks.length > 1
        ? Math.round((allStreaks.filter(s => (s.totalModulesCompleted ?? 0) < myModulesCompleted).length / (allStreaks.length - 1)) * 100)
        : 0;

      const scorePercentile = allGaps.length > 1
        ? Math.round((allGaps.filter(g => parseFloat(String(g.overallReadinessScore ?? 0)) < myScore).length / (allGaps.length - 1)) * 100)
        : 0;

      return {
        myStats: {
          modulesCompleted: myModulesCompleted,
          minsLearned: myStreak[0]?.totalMinsLearned ?? 0,
          readinessScore: myScore,
          readinessBand: myGap[0]?.readinessBand ?? null,
        },
        platformAverages: {
          avgModulesCompleted,
          avgMinsLearned,
          avgReadinessScore,
          totalLearners: allStreaks.length,
          bandDistribution: bandCounts,
        },
        percentiles: {
          modulesCompleted: modulesPercentile,
          readinessScore: scorePercentile,
        },
      };
    }),

  // ─── Improvement 9: Manager nudges ─────────────────────────────────────────
  // B2 governance: max 5 active nudges per learner per manager per rolling 7 days
  // Decline mechanism: declineNudge procedure below
  // Audit visibility: getTeamNudgeAudit procedure below (HR/CPO accessible)
  sendNudge: protectedProcedure
    .input(z.object({
      learnerId: z.string(),
      moduleId: z.string(),
      message: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Verify learner is on manager's team
      const member = await db.select().from(managerTeamMembers)
        .where(and(eq(managerTeamMembers.managerId, ctx.user.id), eq(managerTeamMembers.memberId, input.learnerId)))
        .limit(1);
      if (member.length === 0) throw new TRPCError({ code: "FORBIDDEN", message: "Learner is not on your team" });
      // B2: Rate limit — max 5 nudges per learner per manager per rolling 7 days
      const MAX_NUDGES_PER_WEEK = 5;
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentNudges = await db.select({ id: learningNudges.id })
        .from(learningNudges)
        .where(and(
          eq(learningNudges.managerId, ctx.user.id),
          eq(learningNudges.learnerId, input.learnerId),
          gte(learningNudges.sentAt, oneWeekAgo),
        ));
      if (recentNudges.length >= MAX_NUDGES_PER_WEEK) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Nudge limit reached: maximum ${MAX_NUDGES_PER_WEEK} nudges per learner per week to prevent coercive environments`,
        });
      }
      // Verify module exists
      const mod = await db.select({ id: learningModules.id, title: learningModules.title })
        .from(learningModules).where(eq(learningModules.id, input.moduleId)).limit(1);
      if (mod.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      const nudgeId = nanoid();
      await db.insert(learningNudges).values({
        id: nudgeId,
        managerId: ctx.user.id,
        learnerId: input.learnerId,
        moduleId: input.moduleId,
        message: input.message ?? null,
        sentAt: Date.now(),
        status: "sent",
      });
      // B2: Audit log — nudge send is always recorded
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "learning.nudge.sent",
        targetType: "learning_nudge",
        targetId: nudgeId,
        metadataJson: JSON.stringify({ learnerId: input.learnerId, moduleId: input.moduleId, moduleTitle: mod[0].title }),
      });
      // Push real-time notification to the learner via SSE
      pushNotification(input.learnerId, {
        type: "nudge",
        title: "Learning Nudge",
        body: input.message || `Your manager suggested you look at: ${mod[0].title}`,
      });
      return { sent: true, moduleTitle: mod[0].title };
    }),

  getMyNudges: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const nudges = await db.select({
        id: learningNudges.id,
        moduleId: learningNudges.moduleId,
        message: learningNudges.message,
        sentAt: learningNudges.sentAt,
        status: learningNudges.status,
        managerId: learningNudges.managerId,
        moduleTitle: learningModules.title,
        moduleCapability: learningModules.capability,
      })
        .from(learningNudges)
        .leftJoin(learningModules, eq(learningNudges.moduleId, learningModules.id))
        .where(eq(learningNudges.learnerId, ctx.user.id))
        .orderBy(desc(learningNudges.sentAt))
        .limit(20);
      // Mark unviewed nudges as viewed
      const unviewedIds = nudges.filter(n => n.status === "sent").map(n => n.id);
      if (unviewedIds.length > 0) {
        await db.update(learningNudges).set({ status: "viewed" })
          .where(inArray(learningNudges.id, unviewedIds));
      }
      return nudges;
    }),

  // A5/B2: Nudge decline — learner can decline a nudge, recorded for manager audit visibility
  declineNudge: protectedProcedure
    .input(z.object({ nudgeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Verify the nudge belongs to this learner
      const nudge = await db.select({ id: learningNudges.id, status: learningNudges.status, managerId: learningNudges.managerId, moduleId: learningNudges.moduleId })
        .from(learningNudges)
        .where(and(eq(learningNudges.id, input.nudgeId), eq(learningNudges.learnerId, ctx.user.id)))
        .limit(1);
      if (!nudge[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Nudge not found" });
      if (nudge[0].status === "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot decline a completed nudge" });
      }
      await db.update(learningNudges)
        .set({ status: "declined" })
        .where(eq(learningNudges.id, input.nudgeId));
      // B2: Audit log — decline is recorded for manager and HR visibility
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "learning.nudge.declined",
        targetType: "learning_nudge",
        targetId: input.nudgeId,
        metadataJson: JSON.stringify({ managerId: nudge[0].managerId, moduleId: nudge[0].moduleId }),
      });
      return { success: true };
    }),

  // B2: getTeamNudgeAudit — HR/CPO visibility into all nudge activity across the org
  getTeamNudgeAudit: protectedProcedure
    .input(z.object({
      managerId: z.string().optional(), // filter by specific manager
      learnerId: z.string().optional(), // filter by specific learner
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Only HR leaders, tenant admins, and managers (for their own team) can view
      const roleKeys = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      const isHROrAdmin = roleKeys.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r));
      const isManager = roleKeys.includes("manager");
      if (!isHROrAdmin && !isManager) throw new TRPCError({ code: "FORBIDDEN" });
      // Managers can only see their own nudges
      const effectiveManagerId = isHROrAdmin ? (input.managerId ?? undefined) : ctx.user.id;
      const conditions = [
        eq(learningNudges.managerId, effectiveManagerId ?? ctx.user.id),
      ];
      if (input.learnerId) conditions.push(eq(learningNudges.learnerId, input.learnerId));
      const nudges = await db.select({
        id: learningNudges.id,
        managerId: learningNudges.managerId,
        learnerId: learningNudges.learnerId,
        moduleId: learningNudges.moduleId,
        message: learningNudges.message,
        sentAt: learningNudges.sentAt,
        status: learningNudges.status,
        moduleTitle: learningModules.title,
        moduleCapability: learningModules.capability,
      })
        .from(learningNudges)
        .leftJoin(learningModules, eq(learningNudges.moduleId, learningModules.id))
        .where(effectiveManagerId ? and(...conditions) : (input.learnerId ? eq(learningNudges.learnerId, input.learnerId) : sql`1=1`))
        .orderBy(desc(learningNudges.sentAt))
        .limit(input.limit);
      // Enrich with manager and learner names
      const allUserIds = Array.from(new Set([...nudges.map(n => n.managerId), ...nudges.map(n => n.learnerId)].filter(Boolean)));
      const userRows = allUserIds.length > 0
        ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users).where(inArray(users.id, allUserIds))
        : [];
      const userMap = Object.fromEntries(userRows.map(u => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()]));
      return nudges.map(n => ({
        ...n,
        managerName: userMap[n.managerId] ?? n.managerId,
        learnerName: userMap[n.learnerId] ?? n.learnerId,
      }));
    }),

  getMilestones: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const milestones = await db.select().from(learningMilestones)
        .where(eq(learningMilestones.userId, ctx.user.id))
        .orderBy(desc(learningMilestones.achievedAt))
        .limit(50);
      return milestones;
    }),

  // ─── Improvement 10: Weekly digest ──────────────────────────────────────────
  getWeeklyDigest: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      // Modules completed this week (use updatedAt as proxy for last completion)
      const recentCompletions = await db.select({
        moduleId: spacedRepetitionQueue.moduleId,
        completedAt: spacedRepetitionQueue.updatedAt,
        title: learningModules.title,
        capability: learningModules.capability,
        durationMins: learningModules.durationMins,
      })
        .from(spacedRepetitionQueue)
        .leftJoin(learningModules, eq(spacedRepetitionQueue.moduleId, learningModules.id))
        .where(and(
          eq(spacedRepetitionQueue.userId, ctx.user.id),
          gte(spacedRepetitionQueue.updatedAt, oneWeekAgo),
        ))
        .orderBy(desc(spacedRepetitionQueue.updatedAt))
        .limit(10);
      // Due reviews this week
      const dueReviews = await db.select({
        moduleId: spacedRepetitionQueue.moduleId,
        dueAt: spacedRepetitionQueue.nextDueAt,
        title: learningModules.title,
        capability: learningModules.capability,
      })
        .from(spacedRepetitionQueue)
        .leftJoin(learningModules, eq(spacedRepetitionQueue.moduleId, learningModules.id))
        .where(and(
          eq(spacedRepetitionQueue.userId, ctx.user.id),
          lte(spacedRepetitionQueue.nextDueAt, Date.now() + 7 * 24 * 60 * 60 * 1000),
          gte(spacedRepetitionQueue.nextDueAt, Date.now()),
        ))
        .orderBy(asc(spacedRepetitionQueue.nextDueAt))
        .limit(5);
      // Streak
      const streak = await db.select().from(learningStreaks)
        .where(eq(learningStreaks.userId, ctx.user.id)).limit(1);
      // Gap analysis for priority capability
      const gap = await db.select().from(gapAnalyses)
        .where(eq(gapAnalyses.userId, ctx.user.id))
        .orderBy(desc(gapAnalyses.generatedAt)).limit(1);
      const gapData = gap[0]?.capabilityGapsJson as any;
      const capKeys = gapData ? Object.keys(gapData) : [];
      const topGap = capKeys.length > 0 ? { capability: capKeys[0], gap: gapData[capKeys[0]]?.gap ?? 0 } : null;
      return {
        weekCompletions: recentCompletions.length,
        totalMinsThisWeek: recentCompletions.reduce((s, c) => s + (c.durationMins ?? 0), 0),
        completedModules: recentCompletions,
        dueReviews,
        currentStreak: streak[0]?.currentStreak ?? 0,
        topPriorityCapability: topGap ? { capability: topGap.capability, gap: topGap.gap } : null,
      };
    }),

  // ─── Trending modules (most completed in last 30 days across platform) ───────
  // ─── Post-completion: suggest next module ──────────────────────────────────
  getNextModuleSuggestion: protectedProcedure
    .input(z.object({ completedModuleId: z.string(), capability: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const userId = ctx.user.id;
      // Get next available plan items, excluding the just-completed module
      const nextItems = await db.select({
        planItemId: adaptivePlanItems.id,
        moduleId: adaptivePlanItems.moduleId,
        phase: adaptivePlanItems.phase,
        title: learningModules.title,
        capability: learningModules.capability,
        modality: learningModules.modality,
        difficulty: learningModules.difficulty,
        levelLabel: learningModules.levelLabel,
        durationMins: learningModules.durationMins,
        subtitle: learningModules.subtitle,
      })
        .from(adaptivePlanItems)
        .leftJoin(learningModules, eq(adaptivePlanItems.moduleId, learningModules.id))
        .leftJoin(adaptiveLearningPlans, eq(adaptivePlanItems.planId, adaptiveLearningPlans.id))
        .where(and(
          eq(adaptiveLearningPlans.userId, userId),
          eq(adaptiveLearningPlans.state, "active"),
          eq(adaptivePlanItems.status, "available"),
          ne(adaptivePlanItems.moduleId, input.completedModuleId),
        ))
        .orderBy(asc(adaptivePlanItems.orderIndex))
        .limit(3);
      if (nextItems.length === 0) return null;
      // Prefer same capability first, then any
      const sameCap = nextItems.find(i => i.capability === input.capability);
      return sameCap ?? nextItems[0];
    }),

  getTrendingModules: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      // Count completions per module in last 30 days
      const trending = await db.select({
        moduleId: spacedRepetitionQueue.moduleId,
        completionCount: sql<number>`count(*)`,
        title: learningModules.title,
        capability: learningModules.capability,
        durationMins: learningModules.durationMins,
        difficulty: learningModules.difficulty,
        levelLabel: learningModules.levelLabel,
      })
        .from(spacedRepetitionQueue)
        .leftJoin(learningModules, eq(spacedRepetitionQueue.moduleId, learningModules.id))
        .where(gte(spacedRepetitionQueue.updatedAt, thirtyDaysAgo.getTime()))
        .groupBy(spacedRepetitionQueue.moduleId, learningModules.title, learningModules.capability, learningModules.durationMins, learningModules.difficulty, learningModules.levelLabel)
        .orderBy(desc(sql<number>`count(*)`))
        .limit(10);
      return trending;
    }),

  // ─── AL-09: Share with team ─────────────────────────────────────────────────
  shareWithTeam: protectedProcedure
    .input(z.object({
      moduleId: z.string(),
      moduleTitle: z.string(),
      capability: z.string(),
      score: z.number().min(0).max(100),
      reflection: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Fetch the sharer's name
      const userRow = await db.select({ firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const name = userRow[0] ? `${userRow[0].firstName} ${userRow[0].lastName}` : ctx.user.email;

      // Build nudge content
      const capLabel = input.capability.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const reflectionText = input.reflection?.trim()
        ? `\n\n💬 Their reflection: "${input.reflection.trim()}"`
        : "";
      const nudgeContent = `${name} just completed "${input.moduleTitle}" (${capLabel}) with a score of ${input.score}%.${reflectionText}\n\nConsider sharing this learning with your team or discussing it in your next 1:1.`;

      // Persist as a learning nudge (manager = sharer, learner = sharer for social share)
      await db.insert(learningNudges).values({
        id: nanoid(),
        managerId: ctx.user.id,
        learnerId: ctx.user.id,
        moduleId: input.moduleId,
        message: nudgeContent,
        status: "sent",
      });

       // Notify the platform owner
      await notifyOwner({
        title: `Team Learning Share: ${input.moduleTitle}`,
        content: nudgeContent,
      }).catch(() => { /* non-blocking */ });
      // SSE real-time nudge notification to the sharer
      pushNotification(ctx.user.id, {
        type: "nudge",
        title: "Shared with your team!",
        body: `"${input.moduleTitle}" — your reflection has been shared.`,
        link: "/learning",
      });
      return { shared: true, message: nudgeContent };
    }),

  // AL-08: Track per-section engagement for adaptive difficulty (data collection layer)
  trackSectionEngagement: protectedProcedure
    .input(z.object({
      moduleId: z.string(),
      sectionIndex: z.number().int().min(0),
      sectionType: z.string().optional(),
      timeOnSectionMs: z.number().int().min(0),
      scrollDepthPct: z.number().int().min(0).max(100),
      quizCorrect: z.boolean().optional(),
      completedSection: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { tracked: false };
      await db.insert(moduleEngagementEvents).values({
        id: nanoid(),
        userId: ctx.user.id,
        moduleId: input.moduleId,
        sectionIndex: input.sectionIndex,
        sectionType: input.sectionType ?? null,
        timeOnSectionMs: input.timeOnSectionMs,
        scrollDepthPct: input.scrollDepthPct,
        quizCorrect: input.quizCorrect ?? null,
        completedSection: input.completedSection,
        recordedAt: Date.now(),
      });
      return { tracked: true };
    }),

  // AL-10: Content Freshness — flag modules older than 6 months for review
  // LLM-based auto-generation is Phase 3; this is the data layer.
  getStaleModules: protectedProcedure
    .input(z.object({
      staleDays: z.number().int().min(1).default(180), // 6 months
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { modules: [], total: 0 };
      const cutoff = Date.now() - input.staleDays * 24 * 60 * 60 * 1000;
      const stale = await db
        .select({
          id: learningModules.id,
          title: learningModules.title,
          modality: learningModules.modality,
          capability: learningModules.capability,
          difficulty: learningModules.difficulty,
          updatedAt: learningModules.updatedAt,
          createdAt: learningModules.createdAt,
        })
        .from(learningModules)
        .where(lte(learningModules.updatedAt, cutoff))
        .orderBy(asc(learningModules.updatedAt))
        .limit(input.limit);
      return {
        modules: stale.map(m => ({
          ...m,
          staleDays: Math.floor((Date.now() - m.updatedAt) / (24 * 60 * 60 * 1000)),
          flaggedForReview: true,
        })),
        total: stale.length,
        cutoffDate: new Date(cutoff).toISOString(),
      };
    }),

  // ─── v1.4 Change 1: get journey context for personalisation panel ─────────
  getJourneyContext: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Get the module
      const [mod] = await db.select().from(learningModules).where(eq(learningModules.id, input.moduleId)).limit(1);
      if (!mod) return null;
      // Get user's active plan items for this capability to determine position
      const plan = await db.select().from(adaptiveLearningPlans)
        .where(and(eq(adaptiveLearningPlans.userId, ctx.user.id), eq(adaptiveLearningPlans.state, "active")))
        .orderBy(desc(adaptiveLearningPlans.generatedAt)).limit(1);
      let journeyPosition = "";
      let moduleIndexInDomain = 0;
      let totalModulesInDomain = 0;
      if (plan[0]) {
        const items = await db.select().from(adaptivePlanItems)
          .where(eq(adaptivePlanItems.planId, plan[0].id));
        const moduleIds = items.map(i => i.moduleId);
        const mods = moduleIds.length > 0
          ? await db.select({ id: learningModules.id, capability: learningModules.capability, difficulty: learningModules.difficulty })
              .from(learningModules).where(inArray(learningModules.id, moduleIds))
          : [];
        const domainMods = mods.filter(m => m.capability === mod.capability);
        totalModulesInDomain = domainMods.length;
        const sortedDomainMods = domainMods.sort((a, b) => (a.difficulty ?? 1) - (b.difficulty ?? 1));
        const idx = sortedDomainMods.findIndex(m => m.id === input.moduleId);
        moduleIndexInDomain = idx >= 0 ? idx + 1 : 1;
        const completedCount = items.filter(i => {
          const m = mods.find(m => m.id === i.moduleId && m.capability === mod.capability);
          return m && i.status === "completed";
        }).length;
        const LEVEL_LABELS: Record<number, string> = { 1: "Foundation", 2: "Developing", 3: "Practitioner", 4: "Advanced", 5: "Expert" };
        const levelLabel = LEVEL_LABELS[mod.difficulty ?? 1] ?? `Level ${mod.difficulty}`;
        journeyPosition = `Module ${moduleIndexInDomain} of ${totalModulesInDomain} in ${levelLabel} — ${completedCount} completed so far`;
      }
      // Get user's latest strategy for initiative linkage
      let strategyLinkage: { initiativeName: string; phase: string; status: string } | null = null;
      const linkedIds = (mod.linkedInitiativeIds as string[] | null) ?? [];
      if (linkedIds.length > 0) {
        const latestStrategy = await db.select().from(strategies)
          .where(eq(strategies.createdByUserId, ctx.user.id))
          .orderBy(desc(strategies.updatedAt)).limit(1);
        if (latestStrategy[0]) {
          const initiatives = await db.select({
            id: strategyInitiatives.id,
            initiativeId: strategyInitiatives.initiativeId,
            targetQuarter: strategyInitiatives.targetQuarter,
            name: strategyInitiativeLibrary.name,
            category: strategyInitiativeLibrary.category,
          })
          .from(strategyInitiatives)
          .innerJoin(strategyInitiativeLibrary, eq(strategyInitiatives.initiativeId, strategyInitiativeLibrary.id))
          .where(eq(strategyInitiatives.strategyId, latestStrategy[0].id));
          const matched = initiatives.find(i => linkedIds.includes(i.initiativeId));
          if (matched) {
            strategyLinkage = {
              initiativeName: matched.name,
              phase: matched.targetQuarter ?? "In planning",
              status: "Active",
            };
          }
        }
      }
      // Get user's collapse preference
      const [userRow] = await db.select({ modulePersonalisationCollapsed: users.modulePersonalisationCollapsed })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      return {
        moduleId: input.moduleId,
        capability: mod.capability,
        difficulty: mod.difficulty,
        journeyPosition,
        moduleIndexInDomain,
        totalModulesInDomain,
        strategyLinkage,
        collapsed: userRow?.modulePersonalisationCollapsed === 1,
        primingTextV2: mod.primingTextV2 ?? null,
      };
    }),

  // ─── v1.4 Change 1: persist collapse preference ───────────────────────────
  setPersonalisationCollapsed: protectedProcedure
    .input(z.object({ collapsed: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users)
        .set({ modulePersonalisationCollapsed: input.collapsed ? 1 : 0 })
        .where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  // ─── v1.4 Change 5: domain pathway view ──────────────────────────────────
  getDomainPathway: protectedProcedure
    .input(z.object({ domainId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const DOMAIN_META: Record<string, { name: string; description: string }> = {
        ai_interaction: { name: "AI Interaction", description: "Prompting, dialogue, and effective use of AI tools in HR workflows" },
        ai_output_evaluation: { name: "AI Output Evaluation", description: "Critically assessing AI outputs for accuracy, bias, and fitness for purpose" },
        ai_workflow_design: { name: "AI Workflow Design", description: "Designing and integrating AI into HR processes and decision flows" },
        ai_ethics_trust: { name: "AI Ethics & Trust", description: "Governance, fairness, transparency, and responsible AI deployment" },
        workforce_ai_readiness: { name: "Workforce AI Readiness", description: "Building organisational capability and managing AI-driven change" },
        ai_change_leadership: { name: "AI Change Leadership", description: "Leading AI transformation, stakeholder engagement, and strategic alignment" },
      };
      const LEVEL_META: Record<number, { name: string; unlockThreshold: number }> = {
        1: { name: "Foundation",   unlockThreshold: 0 },
        2: { name: "Developing",   unlockThreshold: 3.0 },
        3: { name: "Practitioner", unlockThreshold: 4.5 },
        4: { name: "Advanced",     unlockThreshold: 6.0 },
        5: { name: "Expert",       unlockThreshold: 7.5 },
        6: { name: "Master",       unlockThreshold: 8.5 },
      };
      const domainMeta = DOMAIN_META[input.domainId] ?? { name: input.domainId, description: "" };
      // Get all published modules for this domain
      const allMods = await db.select().from(learningModules)
        .where(and(eq(learningModules.capability, input.domainId), eq(learningModules.status, "published")));
      // Get user's plan items for completion status
      const plan = await db.select().from(adaptiveLearningPlans)
        .where(and(eq(adaptiveLearningPlans.userId, ctx.user.id), eq(adaptiveLearningPlans.state, "active")))
        .orderBy(desc(adaptiveLearningPlans.generatedAt)).limit(1);
      let completedModuleIds = new Set<string>();
      let completedAtMap = new Map<string, number>();
      if (plan[0]) {
        const items = await db.select().from(adaptivePlanItems)
          .where(and(eq(adaptivePlanItems.planId, plan[0].id), eq(adaptivePlanItems.status, "completed")));
        items.forEach(i => { completedModuleIds.add(i.moduleId); completedAtMap.set(i.moduleId, i.completedAt ?? 0); });
      }
      // Get user's capability score for this domain
      const latestScore = await db.select().from(assessmentScores)
        .innerJoin(assessmentSessions, eq(assessmentScores.sessionId, assessmentSessions.id))
        .where(and(eq(assessmentSessions.userId, ctx.user.id), eq(assessmentSessions.state, "completed")))
        .orderBy(desc(assessmentSessions.completedAt)).limit(1);
      let capabilityScore = 0;
      if (latestScore[0]) {
        const breakdown = latestScore[0].assessment_scores.scoreBreakdownJson as Record<string, number> | null;
        if (breakdown) capabilityScore = breakdown[input.domainId] ?? 0;
      }
      // Build levels
      const levels = Object.entries(LEVEL_META).map(([levelStr, meta]) => {
        const level = parseInt(levelStr);
        const levelMods = allMods.filter(m => (m.difficulty ?? 1) === level);
        const completedCount = levelMods.filter(m => completedModuleIds.has(m.id)).length;
        const totalCount = levelMods.length;
        // Determine if locked: Foundation always unlocked; others require 75%+ of prior level OR score threshold
        let locked = false;
        let lockReason: string | null = null;
        if (level > 1) {
          const priorLevelMods = allMods.filter(m => (m.difficulty ?? 1) === level - 1);
          const priorCompleted = priorLevelMods.filter(m => completedModuleIds.has(m.id)).length;
          const priorPct = priorLevelMods.length > 0 ? priorCompleted / priorLevelMods.length : 0;
          const scoreUnlocks = capabilityScore >= meta.unlockThreshold;
          const completionUnlocks = priorPct >= 0.75;
          if (!scoreUnlocks && !completionUnlocks) {
            locked = true;
            lockReason = `Complete 75% of ${LEVEL_META[level - 1]?.name ?? `Level ${level - 1}`} modules to unlock`;
          }
        }
        // Is this the current active level?
        const isCurrentLevel = !locked && completedCount < totalCount && (level === 1 || (() => {
          const priorMods = allMods.filter(m => (m.difficulty ?? 1) === level - 1);
          const priorCompleted = priorMods.filter(m => completedModuleIds.has(m.id)).length;
          return priorCompleted / Math.max(priorMods.length, 1) >= 0.75;
        })());
        return {
          id: `level-${level}`,
          level,
          name: meta.name,
          modules: levelMods.sort((a, b) => a.title.localeCompare(b.title)).map(m => ({
            id: m.id,
            title: m.title,
            format: m.modality,
            durationMins: m.durationMins,
            completed: completedModuleIds.has(m.id),
            completedAt: completedAtMap.get(m.id) ?? null,
          })),
          completionCount: completedCount,
          totalModules: totalCount,
          complete: totalCount > 0 && completedCount === totalCount,
          locked,
          lockReason,
          isCurrentLevel,
        };
      }).filter(l => l.totalModules > 0);
      // Find next recommended module (first incomplete in current level)
      const currentLevel = levels.find(l => l.isCurrentLevel);
      const nextRecommendedModule = currentLevel?.modules.find(m => !m.completed) ?? null;
      // Strategy context
      let strategyContext: { linkedInitiative: string; capabilityRelevance: string } | null = null;
      const latestStrategy = await db.select().from(strategies)
        .where(eq(strategies.createdByUserId, ctx.user.id))
        .orderBy(desc(strategies.updatedAt)).limit(1);
      if (latestStrategy[0]) {
        const initiatives = await db.select({
          id: strategyInitiatives.id,
          name: strategyInitiativeLibrary.name,
          category: strategyInitiativeLibrary.category,
        })
        .from(strategyInitiatives)
        .innerJoin(strategyInitiativeLibrary, eq(strategyInitiatives.initiativeId, strategyInitiativeLibrary.id))
        .where(eq(strategyInitiatives.strategyId, latestStrategy[0].id))
        .limit(3);
        if (initiatives.length > 0) {
          strategyContext = {
            linkedInitiative: initiatives[0].name,
            capabilityRelevance: `Relevant to your ${initiatives.map(i => i.category).join(", ")} initiatives`,
          };
        }
      }
      return {
        domain: { id: input.domainId, ...domainMeta },
        levels,
        nextRecommendedModule,
        strategyContext,
        capabilityScore,
      };
    }),

  // ─── v1.4 Change 4: coaching conversation persistence ────────────────────
  getCoachingConversation: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [conv] = await db.select().from(coachingConversations)
        .where(and(eq(coachingConversations.userId, ctx.user.id), eq(coachingConversations.moduleId, input.moduleId)))
        .limit(1);
      return conv ?? null;
    }),

  saveCoachingConversation: protectedProcedure
    .input(z.object({
      moduleId: z.string(),
      messages: z.array(z.object({ role: z.string(), content: z.string(), createdAt: z.number() })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [existing] = await db.select({ id: coachingConversations.id })
        .from(coachingConversations)
        .where(and(eq(coachingConversations.userId, ctx.user.id), eq(coachingConversations.moduleId, input.moduleId)))
        .limit(1);
      const now = Date.now();
      if (existing) {
        await db.update(coachingConversations)
          .set({ conversationJson: input.messages as any, updatedAt: now })
          .where(eq(coachingConversations.id, existing.id));
      } else {
        await db.insert(coachingConversations).values({
          id: nanoid(),
          userId: ctx.user.id,
          moduleId: input.moduleId,
          conversationJson: input.messages as any,
          createdAt: now,
          updatedAt: now,
        });
      }
      return { ok: true };
    }),

  // ─── v1.4 Change 4: inline module coach chat ─────────────────────────────
  moduleCoachChat: protectedProcedure
    .input(z.object({
      moduleId: z.string(),
      message: z.string().min(1).max(2000),
      history: z.array(z.object({ role: z.string(), content: z.string().max(5000) })).max(20),
      // Context passed from the module page
      moduleTitle: z.string(),
      moduleFormat: z.string(),
      moduleDifficulty: z.number().optional(),
      moduleCapability: z.string(),
      journeyPosition: z.string().optional(),
      strategyLinkage: z.object({ initiativeName: z.string(), phase: z.string() }).optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertLLMRateLimit(ctx.user.id); // PROD-2.1
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Get user org context for sector/headcount
      const tenantIdForOrg = ctx.user.tenantId ?? ctx.user.id;
      const [orgCtx] = await db.select().from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, tenantIdForOrg)).limit(1);
      const sector = orgCtx?.sector ?? "HR";
      const headcount = orgCtx?.headcount ? `${orgCtx.headcount}+ employees` : "";
      const LEVEL_LABELS: Record<number, string> = { 1: "Foundation", 2: "Developing", 3: "Practitioner", 4: "Advanced", 5: "Expert" };
      const levelLabel = LEVEL_LABELS[input.moduleDifficulty ?? 1] ?? `Level ${input.moduleDifficulty}`;
      const domainLabel = ({
        ai_interaction: "AI Interaction",
        ai_output_evaluation: "AI Output Evaluation",
        ai_workflow_design: "AI Workflow Design",
        ai_ethics_trust: "AI Ethics & Trust",
        workforce_ai_readiness: "Workforce AI Readiness",
        ai_change_leadership: "AI Change Leadership",
      } as Record<string, string>)[input.moduleCapability] ?? input.moduleCapability;
      const strategyLine = input.strategyLinkage
        ? `Their strategy context: ${input.strategyLinkage.initiativeName} initiative (${input.strategyLinkage.phase}).`
        : "No active strategy linked.";
      const journeyLine = input.journeyPosition
        ? `Their journey context: ${input.journeyPosition}.`
        : "";
      const systemPrompt = `You are the AiQ Coach. The user is engaging with the module '${input.moduleTitle}' (${input.moduleFormat}, ${levelLabel}, ${domainLabel}). ${journeyLine} ${strategyLine} Their organisational context: ${sector} sector${headcount ? `, ${headcount} headcount` : ""}. Help them apply this module to their specific work context. Use mastery framing — focus on the capability they're building. Reference specifics from their strategy where relevant. Keep responses concise (2-4 paragraphs typical) unless they ask for depth. Never mention capability scores or gap numbers.`;
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          ...input.history.slice(-10).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user", content: input.message },
        ],
      });
      const reply = (response.choices?.[0]?.message?.content as string) ?? "I'm here to help you apply this module. What would you like to explore?";
      return { reply };
    }),

  // ─── A2 + B1: generateModuleFeedback ─────────────────────────────────────────
  // Generates AI coaching feedback for a reflection or practical exercise response.
  // Persists the feedback to module_feedback table and returns it.
  generateModuleFeedback: protectedProcedure
    .input(z.object({
      moduleId: z.string(),
      moduleTitle: z.string(),
      moduleDomain: z.string(),
      formatType: z.enum(["reflection", "practical_exercise"]),
      promptIndex: z.number().int().min(0).default(0),
      promptText: z.string().max(2000),
      userResponse: z.string().min(10).max(5000),
      strategyLinkage: z.object({
        initiativeName: z.string(),
        phase: z.string(),
      }).nullable().optional(),
      journeyPosition: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertLLMRateLimit(ctx.user.id); // PROD-2.1
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const strategyContext = input.strategyLinkage
        ? `\n\nStrategy context: This module supports the learner's active AI strategy initiative "${input.strategyLinkage.initiativeName}" (${input.strategyLinkage.phase} phase). Where relevant, connect your feedback to how this skill will be applied in that initiative.`
        : "";
      const journeyContext = input.journeyPosition
        ? `\n\nLearner journey: ${input.journeyPosition}`
        : "";

      let systemPrompt: string;
      if (input.formatType === "reflection") {
        systemPrompt = `You are an expert HR leadership coach and AI capability advisor. Your role is to provide personalised, constructive feedback on a learner's reflection response within the AiQ HR capability development platform.

Module: "${input.moduleTitle}" (Domain: ${input.moduleDomain})${strategyContext}${journeyContext}

Feedback principles:
- Acknowledge what the learner has identified well — be specific, not generic
- Offer one or two genuinely novel angles or considerations they may not have thought of
- Connect their reflection to real-world HR practice or their organisation's AI journey where possible
- Ask one forward-looking question to deepen their thinking (do not demand an answer)
- Keep the tone warm, direct, and collegial — like a trusted senior colleague, not a marking rubric
- Length: 150–220 words. No bullet points. Use flowing prose.
- Do not repeat the question back to the learner
- Do not use phrases like "Great reflection!" or "Well done" — start with substance
- Do NOT use encouragement-machine language: avoid "fantastic", "impressive", "excellent", "well done", "great job"
- Do NOT use templated openings: avoid "It's wonderful to see...", "I'm delighted to note..."
- DO reference the learner's specific context: their role, sector, and any strategy initiatives mentioned`;
      } else {
        systemPrompt = `You are an expert HR leadership coach and AI capability advisor. Your role is to provide personalised, constructive feedback on a learner's practical exercise response within the AiQ HR capability development platform.

Module: "${input.moduleTitle}" (Domain: ${input.moduleDomain})${strategyContext}${journeyContext}

Feedback principles:
- Assess whether the learner's approach is likely to work in practice — be honest but constructive
- Identify the strongest element of their response and explain why it matters
- Highlight one specific gap, risk, or missed consideration that would improve the outcome
- Where relevant, suggest a concrete next action they could take in their own organisation
- Keep the tone direct and practical — like a senior practitioner reviewing a colleague's work plan
- Length: 180–250 words. No bullet points. Use flowing prose.
- Do not restate the exercise instructions
- Do not use generic praise — start with a substantive observation about their specific response
- Do NOT use encouragement-machine language: avoid "fantastic", "impressive", "excellent", "well done", "great job"
- Do NOT make generic recommendations: avoid "consider exploring", "perhaps starting with", "you might want to look into"
- DO reference the learner's specific context: their role, sector, and any strategy initiatives mentioned`;
      }

      const userMessage = `Reflection prompt: "${input.promptText}"\n\nLearner's response:\n${input.userResponse}`;
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });
      const feedbackText = (response.choices?.[0]?.message?.content as string) ?? "Thank you for your thoughtful response. Keep reflecting on how these ideas apply in your context.";

      const id = nanoid();
      await db.insert(moduleFeedback).values({
        id,
        userId: ctx.user.id,
        moduleId: input.moduleId,
        promptIndex: input.promptIndex,
        feedbackText,
        formatType: input.formatType,
        userResponseSnapshot: input.userResponse.slice(0, 2000),
        modelUsed: "default",
        libraryVersion: "v1.4",
        generatedAt: Date.now(),
      });
      return { feedbackId: id, feedbackText };
    }),

  // ─── A3 helper: getModuleFeedback ─────────────────────────────────────────
  getModuleFeedback: protectedProcedure
    .input(z.object({
      moduleId: z.string(),
      promptIndex: z.number().int().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select()
        .from(moduleFeedback)
        .where(and(
          eq(moduleFeedback.userId, ctx.user.id),
          eq(moduleFeedback.moduleId, input.moduleId),
          eq(moduleFeedback.promptIndex, input.promptIndex),
        ))
        .orderBy(desc(moduleFeedback.generatedAt))
        .limit(1);
      return rows[0] ?? null;
    }),

  // ─── v2 Learning Dashboard: greeting + focus context ─────────────────────
  getLearningDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const userId = ctx.user.id;

      // Get user name
      const [userRow] = await db.select({ firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, userId)).limit(1);
      const firstName = userRow?.firstName ?? "there";

      // Get active plan
      const [plan] = await db.select().from(adaptiveLearningPlans)
        .where(and(eq(adaptiveLearningPlans.userId, userId), eq(adaptiveLearningPlans.state, "active")))
        .orderBy(desc(adaptiveLearningPlans.generatedAt)).limit(1);

      let totalModules = 0;
      let completedModules = 0;
      let firstModuleTitle: string | null = null;
      let firstModuleCapability: string | null = null;
      let firstModuleId: string | null = null;
      let firstModuleLevelLabel: string | null = null;
      let firstModuleReasonJson: Record<string, unknown> | null = null;
      let lastActivityDomain: string | null = null;
      let lastActivityAt: number | null = null;

      if (plan) {
        const items = await db.select().from(adaptivePlanItems)
          .where(eq(adaptivePlanItems.planId, plan.id))
          .orderBy(asc(adaptivePlanItems.orderIndex));
        totalModules = items.length;
        completedModules = items.filter(i => i.status === "completed").length;

        // Find last activity domain (most recent completion in last 14 days)
        const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const recentCompleted = items
          .filter(i => i.status === "completed" && (i.completedAt ?? 0) >= fourteenDaysAgo)
          .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
        if (recentCompleted.length > 0) {
          const modIds = recentCompleted.map(i => i.moduleId);
          const mods = await db.select({ id: learningModules.id, capability: learningModules.capability })
            .from(learningModules).where(inArray(learningModules.id, modIds));
          const modMap = Object.fromEntries(mods.map(m => [m.id, m.capability]));
          lastActivityDomain = modMap[recentCompleted[0].moduleId] ?? null;
          lastActivityAt = recentCompleted[0].completedAt ?? null;
        }

        // Find first available/in-progress module
        const nextItem = items.find(i => i.status === "in_progress" || i.status === "available");
        if (nextItem) {
          const [mod] = await db.select({ title: learningModules.title, capability: learningModules.capability, levelLabel: learningModules.levelLabel })
            .from(learningModules).where(eq(learningModules.id, nextItem.moduleId)).limit(1);
          if (mod) {
            firstModuleTitle = mod.title;
            firstModuleCapability = mod.capability;
            firstModuleLevelLabel = mod.levelLabel;
            firstModuleId = nextItem.moduleId;
            firstModuleReasonJson = nextItem.reasonJson as Record<string, unknown> | null;
          }
        }
      }

      // Get user's latest strategy and in-flight initiatives
      const [latestStrategy] = await db.select().from(strategies)
        .where(eq(strategies.createdByUserId, userId))
        .orderBy(desc(strategies.updatedAt)).limit(1);

      let focusDomain: string | null = lastActivityDomain;
      let focusInitiative: { name: string; phase: string; status: string } | null = null;
      let strategyExists = false;

      if (latestStrategy) {
        strategyExists = true;
        const initiatives = await db.select({
          id: strategyInitiatives.id,
          initiativeId: strategyInitiatives.initiativeId,
          targetQuarter: strategyInitiatives.targetQuarter,
          status: strategyInitiatives.status,
          name: strategyInitiativeLibrary.name,
          category: strategyInitiativeLibrary.category,
        })
        .from(strategyInitiatives)
        .innerJoin(strategyInitiativeLibrary, eq(strategyInitiatives.initiativeId, strategyInitiativeLibrary.id))
        .where(eq(strategyInitiatives.strategyId, latestStrategy.id));

        const inFlight = initiatives.filter(i => i.status === "in_progress");

        // If no recent activity domain, pick domain most linked to in-flight initiatives
        if (!focusDomain && inFlight.length > 0 && plan) {
          const planItems = await db.select({ moduleId: adaptivePlanItems.moduleId })
            .from(adaptivePlanItems).where(eq(adaptivePlanItems.planId, plan.id));
          const moduleIds = planItems.map(i => i.moduleId);
          if (moduleIds.length > 0) {
            const mods = await db.select({ id: learningModules.id, capability: learningModules.capability, linkedInitiativeIds: learningModules.linkedInitiativeIds })
              .from(learningModules).where(inArray(learningModules.id, moduleIds));
            const initiativeIds = inFlight.map(i => i.initiativeId);
            const domainCounts: Record<string, number> = {};
            for (const mod of mods) {
              const linked = (mod.linkedInitiativeIds as string[] | null) ?? [];
              if (linked.some(id => initiativeIds.includes(id))) {
                domainCounts[mod.capability] = (domainCounts[mod.capability] ?? 0) + 1;
              }
            }
            const topDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0];
            if (topDomain) focusDomain = topDomain[0];
          }
        }

        // Fallback: firstModuleCapability
        if (!focusDomain) focusDomain = firstModuleCapability;

        // Find initiative linked to focus domain
        if (inFlight.length > 0) {
          const linked = inFlight[0];
          focusInitiative = {
            name: linked.name,
            phase: linked.targetQuarter ?? "In planning",
            status: linked.status.replace(/_/g, " "),
          };
        }
      } else {
        if (!focusDomain) focusDomain = firstModuleCapability ?? "ai_workflow_design";
      }

      if (!focusDomain) focusDomain = "ai_workflow_design";

      // B2: Build domain → top initiative map for clickable connects-to on domain cards
      // Uses capability-based matching via weightsJson (primary) or linkedInitiativeIds (if populated)
      const DOMAIN_KEYS_ORDER = [
        "ai_interaction", "ai_output_evaluation", "ai_workflow_design",
        "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership",
      ];
      const domainInitiativeMap: Record<string, { initiativeId: string; name: string }> = {};
      if (latestStrategy && plan) {
        const planItems = await db.select({ moduleId: adaptivePlanItems.moduleId })
          .from(adaptivePlanItems).where(eq(adaptivePlanItems.planId, plan.id));
        const moduleIds = planItems.map(i => i.moduleId);
        if (moduleIds.length > 0) {
          const mods = await db.select({
            id: learningModules.id,
            capability: learningModules.capability,
            linkedInitiativeIds: learningModules.linkedInitiativeIds,
          }).from(learningModules).where(inArray(learningModules.id, moduleIds));

          // Fetch all strategy initiatives + their weightsJson for capability matching
          const stratInits = await db.select({
            initiativeId: strategyInitiatives.initiativeId,
            name: strategyInitiativeLibrary.name,
            weightsJson: strategyInitiativeLibrary.weightsJson,
          })
          .from(strategyInitiatives)
          .innerJoin(strategyInitiativeLibrary, eq(strategyInitiatives.initiativeId, strategyInitiativeLibrary.id))
          .where(eq(strategyInitiatives.strategyId, latestStrategy.id));

          // Build initiative → covered domains map via weightsJson
          const initCoveredDomains: Record<string, Set<string>> = {};
          for (const si of stratInits) {
            const weights = (si.weightsJson as number[] | null) ?? [];
            const covered = new Set<string>(DOMAIN_KEYS_ORDER.filter((_, i) => (weights[i] ?? 0) > 0));
            initCoveredDomains[si.initiativeId] = covered.size > 0 ? covered : new Set(DOMAIN_KEYS_ORDER);
          }
          const initNameMap = Object.fromEntries(stratInits.map(i => [i.initiativeId, i.name]));

          // Count initiative occurrences per domain (capability-based matching)
          const domainInitCounts: Record<string, Record<string, number>> = {};
          for (const mod of mods) {
            // Primary: use linkedInitiativeIds if populated
            const linked = (mod.linkedInitiativeIds as string[] | null) ?? [];
            if (linked.length > 0) {
              for (const initId of linked) {
                if (!initNameMap[initId]) continue;
                if (!domainInitCounts[mod.capability]) domainInitCounts[mod.capability] = {};
                domainInitCounts[mod.capability][initId] = (domainInitCounts[mod.capability][initId] ?? 0) + 1;
              }
            } else {
              // Fallback: capability-based matching via weightsJson
              for (const si of stratInits) {
                const covered = initCoveredDomains[si.initiativeId];
                if (covered?.has(mod.capability)) {
                  if (!domainInitCounts[mod.capability]) domainInitCounts[mod.capability] = {};
                  domainInitCounts[mod.capability][si.initiativeId] = (domainInitCounts[mod.capability][si.initiativeId] ?? 0) + 1;
                }
              }
            }
          }
          for (const [domain, counts] of Object.entries(domainInitCounts)) {
            const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
            if (top) domainInitiativeMap[domain] = { initiativeId: top[0], name: initNameMap[top[0]] };
          }
        }
      }

      return {
        firstName,
        totalModules,
        completedModules,
        focusDomain,
        focusInitiative,
        strategyExists,
        firstModuleTitle,
        firstModuleCapability,
        firstModuleLevelLabel,
        firstModuleId,
        firstModuleReasonJson,
        lastActivityAt,
        domainInitiativeMap,
      };
    }),

  // ─── v2 Learning Dashboard: in-flight strategy initiatives ───────────────
  getInFlightInitiatives: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const userId = ctx.user.id;

      const [latestStrategy] = await db.select().from(strategies)
        .where(eq(strategies.createdByUserId, userId))
        .orderBy(desc(strategies.updatedAt)).limit(1);
      if (!latestStrategy) return { hasStrategy: false, initiatives: [] };

      const initiatives = await db.select({
        id: strategyInitiatives.id,
        initiativeId: strategyInitiatives.initiativeId,
        targetQuarter: strategyInitiatives.targetQuarter,
        status: strategyInitiatives.status,
        criticality: strategyInitiatives.criticality,
        name: strategyInitiativeLibrary.name,
        category: strategyInitiativeLibrary.category,
        description: strategyInitiativeLibrary.description,
      })
      .from(strategyInitiatives)
      .innerJoin(strategyInitiativeLibrary, eq(strategyInitiatives.initiativeId, strategyInitiativeLibrary.id))
      .where(eq(strategyInitiatives.strategyId, latestStrategy.id));

      const [plan] = await db.select().from(adaptiveLearningPlans)
        .where(and(eq(adaptiveLearningPlans.userId, userId), eq(adaptiveLearningPlans.state, "active")))
        .orderBy(desc(adaptiveLearningPlans.generatedAt)).limit(1);

      const modulesByInitiative: Record<string, { total: number; completed: number }> = {};
      if (plan) {
        const items = await db.select({ moduleId: adaptivePlanItems.moduleId, status: adaptivePlanItems.status })
          .from(adaptivePlanItems).where(eq(adaptivePlanItems.planId, plan.id));
        const moduleIds = items.map(i => i.moduleId);
        if (moduleIds.length > 0) {
          const mods = await db.select({ id: learningModules.id, linkedInitiativeIds: learningModules.linkedInitiativeIds })
            .from(learningModules).where(inArray(learningModules.id, moduleIds));
          const statusMap = Object.fromEntries(items.map(i => [i.moduleId, i.status]));
          for (const mod of mods) {
            const linked = (mod.linkedInitiativeIds as string[] | null) ?? [];
            for (const initId of linked) {
              if (!modulesByInitiative[initId]) modulesByInitiative[initId] = { total: 0, completed: 0 };
              modulesByInitiative[initId].total++;
              if (statusMap[mod.id] === "completed") modulesByInitiative[initId].completed++;
            }
          }
        }
      }

      return {
        hasStrategy: true,
        initiatives: initiatives.map(i => ({
          id: i.id,
          initiativeId: i.initiativeId,
          name: i.name,
          category: i.category,
          description: i.description,
          phase: i.targetQuarter ?? "In planning",
          status: i.status,
          criticality: i.criticality,
          moduleCount: modulesByInitiative[i.initiativeId]?.total ?? 0,
          completedCount: modulesByInitiative[i.initiativeId]?.completed ?? 0,
        })),
      };
    }),

  // ─── v2 Learning Dashboard: modules filtered by initiative ───────────────
  getModulesByInitiative: protectedProcedure
    .input(z.object({ initiativeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const userId = ctx.user.id;

      // Resolve initiative name + capability domains via weightsJson
      // weightsJson is an array of 6 numbers indexed by DOMAIN_KEYS order
      const DOMAIN_KEYS_ORDER = [
        "ai_interaction", "ai_output_evaluation", "ai_workflow_design",
        "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership",
      ] as const;
      const [initRow] = await db.select({ name: strategyInitiativeLibrary.name, weightsJson: strategyInitiativeLibrary.weightsJson })
        .from(strategyInitiativeLibrary).where(eq(strategyInitiativeLibrary.id, input.initiativeId)).limit(1);

      // Derive capability domains this initiative covers (weight > 0)
      const weights = (initRow?.weightsJson as number[] | null) ?? [];
      const coveredDomains = new Set<string>(
        DOMAIN_KEYS_ORDER.filter((_, i) => (weights[i] ?? 0) > 0)
      );
      // Fallback: if no weights, include all domains (show all plan modules)
      const matchAll = coveredDomains.size === 0;

      const [plan] = await db.select().from(adaptiveLearningPlans)
        .where(and(eq(adaptiveLearningPlans.userId, userId), eq(adaptiveLearningPlans.state, "active")))
        .orderBy(desc(adaptiveLearningPlans.generatedAt)).limit(1);
      if (!plan) return { initiativeName: initRow?.name ?? null, items: [] };

      const items = await db.select().from(adaptivePlanItems)
        .where(eq(adaptivePlanItems.planId, plan.id))
        .orderBy(asc(adaptivePlanItems.orderIndex));
      const moduleIds = items.map(i => i.moduleId);
      if (moduleIds.length === 0) return { initiativeName: initRow?.name ?? null, items: [] };

      const mods = await db.select().from(learningModules)
        .where(inArray(learningModules.id, moduleIds));
      const modMap = Object.fromEntries(mods.map(m => [m.id, m]));

      // Primary: match by linkedInitiativeIds (populated for newer modules)
      // Fallback: match by capability domain overlap with initiative weightsJson
      const filtered = items.filter(item => {
        const mod = modMap[item.moduleId];
        if (!mod) return false;
        const linked = (mod.linkedInitiativeIds as string[] | null) ?? [];
        if (linked.length > 0) return linked.includes(input.initiativeId);
        // Fallback: capability-based matching
        return matchAll || coveredDomains.has(mod.capability);
      });

      return {
        initiativeName: initRow?.name ?? null,
        items: filtered.map(item => ({ ...item, module: modMap[item.moduleId] ?? null })),
      };
    }),

  // ─── v2 Learning Dashboard: recent completions (last 30 days) ────────────
  getRecentCompletions: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const userId = ctx.user.id;
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      const [plan] = await db.select().from(adaptiveLearningPlans)
        .where(and(eq(adaptiveLearningPlans.userId, userId), eq(adaptiveLearningPlans.state, "active")))
        .orderBy(desc(adaptiveLearningPlans.generatedAt)).limit(1);
      if (!plan) return { completions: [], totalLast30Days: 0, withCoachingFeedback: 0 };

      const items = await db.select().from(adaptivePlanItems)
        .where(and(
          eq(adaptivePlanItems.planId, plan.id),
          eq(adaptivePlanItems.status, "completed"),
          gte(adaptivePlanItems.completedAt, thirtyDaysAgo),
        ))
        .orderBy(desc(adaptivePlanItems.completedAt))
        .limit(10);

      if (items.length === 0) return { completions: [], totalLast30Days: 0, withCoachingFeedback: 0 };

      const moduleIds = items.map(i => i.moduleId);
      const mods = await db.select({ id: learningModules.id, title: learningModules.title, capability: learningModules.capability, durationMins: learningModules.durationMins, levelLabel: learningModules.levelLabel })
        .from(learningModules).where(inArray(learningModules.id, moduleIds));
      const modMap = Object.fromEntries(mods.map(m => [m.id, m]));

      const feedbackRows = await db.select({ moduleId: moduleFeedback.moduleId })
        .from(moduleFeedback).where(and(
          eq(moduleFeedback.userId, userId),
          inArray(moduleFeedback.moduleId, moduleIds),
        ));
      const feedbackModuleIds = new Set(feedbackRows.map(f => f.moduleId));

      const completions = items.map(item => ({
        id: item.id,
        moduleId: item.moduleId,
        completedAt: item.completedAt,
        title: modMap[item.moduleId]?.title ?? "Module",
        capability: modMap[item.moduleId]?.capability ?? null,
        durationMins: modMap[item.moduleId]?.durationMins ?? null,
        levelLabel: modMap[item.moduleId]?.levelLabel ?? null,
        hasCoachingFeedback: feedbackModuleIds.has(item.moduleId),
      }));

      return {
        completions,
        totalLast30Days: completions.length,
        withCoachingFeedback: completions.filter(c => c.hasCoachingFeedback).length,
      };
    }),

  // ─── v2 Learning Dashboard: active coaching conversations ────────────────
  getActiveCoachingConversations: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const userId = ctx.user.id;

      const convs = await db.select().from(coachingConversations)
        .where(eq(coachingConversations.userId, userId))
        .orderBy(desc(coachingConversations.updatedAt))
        .limit(10);

      if (convs.length === 0) return [];

      const moduleIds = convs.map(c => c.moduleId).filter(Boolean) as string[];
      const mods = moduleIds.length > 0
        ? await db.select({ id: learningModules.id, title: learningModules.title, capability: learningModules.capability })
            .from(learningModules).where(inArray(learningModules.id, moduleIds))
        : [];
      const modMap = Object.fromEntries(mods.map(m => [m.id, m]));

      return convs.map(conv => {
        const messages = (conv.conversationJson as Array<{ role: string; content: string; createdAt: number }> | null) ?? [];
        return {
          id: conv.id,
          moduleId: conv.moduleId,
          moduleTitle: conv.moduleId ? (modMap[conv.moduleId]?.title ?? "Module") : "General coaching",
          moduleCapability: conv.moduleId ? (modMap[conv.moduleId]?.capability ?? null) : null,
          messageCount: messages.length,
          lastActiveAt: conv.updatedAt,
          lastMessage: messages.length > 0 ? messages[messages.length - 1].content.slice(0, 100) : null,
        };
      });
    }),
});
// ─── Helper: enrich plan with items and modules ────────────────────────────────
async function enrichPlan(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  plan: typeof adaptiveLearningPlans.$inferSelect,
  userId: string
) {
  const items = await db.select().from(adaptivePlanItems)
    .where(eq(adaptivePlanItems.planId, plan.id))
    .orderBy(asc(adaptivePlanItems.orderIndex));

  // Batch-fetch modules and spaced repetition rows to avoid N+1 queries
  const moduleIds = items.map(i => i.moduleId);
  const [allMods, allSrq] = moduleIds.length > 0
    ? await Promise.all([
        db.select().from(learningModules).where(inArray(learningModules.id, moduleIds)),
        db.select().from(spacedRepetitionQueue)
          .where(and(eq(spacedRepetitionQueue.userId, userId), inArray(spacedRepetitionQueue.moduleId, moduleIds))),
      ])
    : [[], []];

  const modMap = Object.fromEntries(allMods.map(m => [m.id, m]));
  const srqMap = Object.fromEntries(allSrq.map(s => [s.moduleId, s]));

  const itemsWithModules = items.map(item => ({
    ...item,
    module: modMap[item.moduleId] ?? null,
    spacedRepetition: srqMap[item.moduleId] ?? null,
  }));

  return {
    ...plan,
    items: itemsWithModules,
    // Expose auto-regeneration timestamp for the "plan updated" banner
    autoRegeneratedAt: (plan as any).autoRegeneratedAt ?? null,
  };
}
