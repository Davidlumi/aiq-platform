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
import { protectedProcedure, router } from "../_core/trpc";
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
import { eq, and, desc, lte, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { computeGapAnalysis, type CapabilityKey } from "../learning/gapAnalysisEngine";
import { generateAdaptivePlan, computeNextReview, type ModuleCandidate } from "../learning/learningPathGenerator";

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
        modality: m.modality as any,
        difficulty: m.difficulty,
        durationMins: m.durationMins,
        levelLabel: m.levelLabel,
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

      // Generate plan items
      const planItems = generateAdaptivePlan(gapAnalysisResult, moduleCandidates, { maxModules: 30 });

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

      // Insert plan items
      for (const item of planItems) {
        await db.insert(adaptivePlanItems).values({
          id: nanoid(),
          planId,
          moduleId: item.moduleId,
          orderIndex: item.orderIndex,
          phase: item.phase,
          required: item.required,
          unlockAfterModuleId: item.unlockAfterModuleId ?? null,
          status: "available",
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

      // Update plan item
      if (input.planItemId) {
        await db.update(adaptivePlanItems)
          .set({
            status: "completed",
            completedAt: now,
            scoreJson: JSON.stringify({ score: input.score, timeSpentMins: input.timeSpentMins, reflectionText: input.reflectionText }) as any,
          })
          .where(eq(adaptivePlanItems.id, input.planItemId));

        // Unlock next items in the plan
        const planItem = await db.select({ planId: adaptivePlanItems.planId })
          .from(adaptivePlanItems).where(eq(adaptivePlanItems.id, input.planItemId)).limit(1);

        if (planItem[0]) {
          // Unlock items that were waiting for this module
          await db.update(adaptivePlanItems)
            .set({ status: "available" })
            .where(and(
              eq(adaptivePlanItems.planId, planItem[0].planId),
              eq(adaptivePlanItems.unlockAfterModuleId, input.moduleId),
              eq(adaptivePlanItems.status, "locked"),
            ));

          // Update plan completion count
          const allItems = await db.select({ status: adaptivePlanItems.status })
            .from(adaptivePlanItems).where(eq(adaptivePlanItems.planId, planItem[0].planId));
          const completedCount = allItems.filter(i => i.status === "completed").length;
          const allComplete = allItems.every(i => ["completed", "skipped"].includes(i.status));

          await db.update(adaptiveLearningPlans)
            .set({
              completedModules: completedCount,
              state: allComplete ? "completed" : "active",
              completedAt: allComplete ? now : null,
            })
            .where(eq(adaptiveLearningPlans.id, planItem[0].planId));
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

      return { success: true };
    }),

  // ─── Get due reviews ───────────────────────────────────────────────────────
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
      const modules = moduleIds.length > 0
        ? await Promise.all(moduleIds.map(id => db.select().from(learningModules).where(eq(learningModules.id, id)).limit(1).then(r => r[0])))
        : [];

      // Group by capability
      const capProgress: Record<string, { total: number; completed: number; inProgress: number }> = {};
      for (let i = 0; i < items.length; i++) {
        const mod = modules[i];
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
      pageSize: z.number().int().min(1).max(100).default(24),
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
});

// ─── Helper: enrich plan with items and modules ───────────────────────────────
async function enrichPlan(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  plan: typeof adaptiveLearningPlans.$inferSelect,
  userId: string
) {
  const items = await db.select().from(adaptivePlanItems)
    .where(eq(adaptivePlanItems.planId, plan.id))
    .orderBy(asc(adaptivePlanItems.orderIndex));

  const itemsWithModules = await Promise.all(items.map(async item => {
    const mod = await db.select().from(learningModules).where(eq(learningModules.id, item.moduleId)).limit(1);
    const srq = await db.select().from(spacedRepetitionQueue)
      .where(and(eq(spacedRepetitionQueue.userId, userId), eq(spacedRepetitionQueue.moduleId, item.moduleId)))
      .limit(1);
    return {
      ...item,
      module: mod[0] ?? null,
      spacedRepetition: srq[0] ?? null,
    };
  }));

  return { ...plan, items: itemsWithModules };
}
