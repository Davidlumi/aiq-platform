import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  learningPlans,
  learningPlanItems,
  contentItems,
  contentItemTags,
  contentProgress,
  assessmentScores,
  assessmentSessions,
  decisionLogs,
  auditLogs,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// ─── Helper: capability-mapped plan generator ────────────────────────────────
async function buildCapabilityMappedPlan(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  targetUserId: string,
  tenantId: string,
  sessionId: string | undefined
): Promise<{
  planId: string;
  itemCount: number;
  overallScore: number;
  credibilityBand: string;
  riskBand: string;
  capabilityScoresForPlan: Record<string, number>;
}> {
  let overallScore = 50;
  let credibilityBand = "medium";
  let riskBand = "low";
  let capabilityScoresForPlan: Record<string, number> = {};

  if (sessionId) {
    const score = await db
      .select()
      .from(assessmentScores)
      .where(eq(assessmentScores.sessionId, sessionId))
      .limit(1);
    if (score[0]) {
      overallScore = parseFloat(String(score[0].overallScore));
      const signals = typeof score[0].signalScoresJson === "string"
        ? JSON.parse(score[0].signalScoresJson as string)
        : score[0].signalScoresJson;
      if (signals?.credibility >= 0.75) credibilityBand = "high";
      else if (signals?.credibility >= 0.5) credibilityBand = "medium";
      else credibilityBand = "low";
      if (signals?.risk >= 0.6) riskBand = "high";
      else if (signals?.risk >= 0.3) riskBand = "medium";
      else riskBand = "low";

      // I3: Load capability scores from scoreBreakdownJson.capabilityScores to identify weakest areas
      try {
        const breakdown = (typeof score[0].scoreBreakdownJson === "string"
          ? JSON.parse(score[0].scoreBreakdownJson as string)
          : (score[0].scoreBreakdownJson ?? {})) as Record<string, unknown>;
        const rawCaps = breakdown.capabilityScores as Record<string, unknown> | undefined;
        if (rawCaps) {
          for (const [k, v] of Object.entries(rawCaps)) {
            capabilityScoresForPlan[k] = typeof v === "number" ? v : (v as any)?.score ?? 50;
          }
        }
      } catch {}
    }
  }

  // Get all published content items with their capability tags
  const allContent = await db
    .select()
    .from(contentItems)
    .where(eq(contentItems.status, "published"));

  const allTags = await db
    .select()
    .from(contentItemTags)
    .where(eq(contentItemTags.tagType, "capability"));

  // Build map: contentItemId -> capabilityKey[]
  const itemCapabilityMap = new Map<string, string[]>();
  for (const tag of allTags) {
    const existing = itemCapabilityMap.get(tag.contentItemId) ?? [];
    existing.push(tag.tagValue);
    itemCapabilityMap.set(tag.contentItemId, existing);
  }

  // Sort capabilities by score ascending (weakest first)
  const weakestCapabilities = Object.entries(capabilityScoresForPlan)
    .sort(([, a], [, b]) => a - b)
    .map(([k]) => k);

  // Determine difficulty band from overall score
  const maxDifficulty = overallScore < 50 ? 2 : overallScore < 70 ? 3 : 4;

  // I3: Capability-mapped selection — prioritise content tagged to weakest capabilities
  const selectedIds = new Set<string>();
  const selectedContent: typeof allContent = [];

  // Pass 1: up to 2 items per weakest capability (top 3 weak caps), respecting difficulty
  for (const capKey of weakestCapabilities.slice(0, 3)) {
    const capItems = allContent.filter(c =>
      c.difficulty <= maxDifficulty &&
      (itemCapabilityMap.get(c.id) ?? []).includes(capKey) &&
      !selectedIds.has(c.id)
    );
    for (const item of capItems.slice(0, 2)) {
      selectedContent.push(item);
      selectedIds.add(item.id);
    }
  }

  // Pass 2: fill remaining slots with general difficulty-appropriate content
  const remaining = allContent.filter(c =>
    c.difficulty <= maxDifficulty && !selectedIds.has(c.id)
  );
  for (const item of remaining) {
    if (selectedContent.length >= 6) break;
    selectedContent.push(item);
    selectedIds.add(item.id);
  }

  // Pass 3: high-risk — ensure at least 1 scenario/simulation item
  if (riskBand === "high" && selectedContent.length < 6) {
    const riskContent = allContent.filter(c =>
      ["scenario_practice", "simulation", "scenario"].includes(c.contentType) &&
      !selectedIds.has(c.id)
    );
    for (const item of riskContent.slice(0, 2)) {
      if (selectedContent.length >= 6) break;
      selectedContent.push(item);
      selectedIds.add(item.id);
    }
  }

  const finalContent = selectedContent.slice(0, 6);

  // Supersede existing active plans
  await db
    .update(learningPlans)
    .set({ state: "superseded" })
    .where(
      and(
        eq(learningPlans.userId, targetUserId),
        eq(learningPlans.tenantId, tenantId),
        eq(learningPlans.state, "active")
      )
    );

  const planId = nanoid();
  await db.insert(learningPlans).values({
    id: planId,
    tenantId,
    userId: targetUserId,
    sourceAssessmentSessionId: sessionId ?? null,
    state: "active",
    generatorVersion: "v2-capability-mapped",
    summaryJson: JSON.stringify({
      overallScore,
      credibilityBand,
      riskBand,
      itemCount: finalContent.length,
      weakestCapabilities: weakestCapabilities.slice(0, 3),
    }),
  });

  // Insert plan items with capability reason
  for (let i = 0; i < finalContent.length; i++) {
    const itemCaps = itemCapabilityMap.get(finalContent[i].id) ?? [];
    const targetedCap = weakestCapabilities.find(c => itemCaps.includes(c)) ?? null;
    await db.insert(learningPlanItems).values({
      id: nanoid(),
      learningPlanId: planId,
      contentItemId: finalContent[i].id,
      orderIndex: i + 1,
      required: i < 3,
      reasonJson: JSON.stringify({
        score: overallScore,
        credibilityBand,
        riskBand,
        contentType: finalContent[i].contentType,
        targetedCapability: targetedCap,
      }),
      status: "assigned",
    });
  }

  // Log decision
  await db.insert(decisionLogs).values({
    id: nanoid(),
    tenantId,
    userId: targetUserId,
    decisionType: "learning_plan_generation",
    inputSnapshotJson: JSON.stringify({ overallScore, credibilityBand, riskBand, weakestCapabilities: weakestCapabilities.slice(0, 3) }),
    outputSnapshotJson: JSON.stringify({ planId, itemCount: finalContent.length }),
    precedenceAppliedJson: JSON.stringify({ generatorVersion: "v2-capability-mapped" }),
  });

  await db.insert(auditLogs).values({
    id: nanoid(),
    tenantId,
    actorUserId: targetUserId,
    action: "learning.plan.generated",
    targetType: "learning_plan",
    targetId: planId,
    metadataJson: JSON.stringify({ targetUserId, itemCount: finalContent.length, trigger: "capability_mapped" }),
  });

  return { planId, itemCount: finalContent.length, overallScore, credibilityBand, riskBand, capabilityScoresForPlan };
}

export const learningRouter = router({
  // Get active learning plan for user
  activePlan: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const targetUserId = input.userId ?? ctx.user.id;

      const plans = await db
        .select()
        .from(learningPlans)
        .where(
          and(
            eq(learningPlans.userId, targetUserId),
            eq(learningPlans.tenantId, ctx.user.tenantId),
            eq(learningPlans.state, "active")
          )
        )
        .orderBy(desc(learningPlans.generatedAt))
        .limit(1);

      if (!plans[0]) return null;

      const items = await db
        .select()
        .from(learningPlanItems)
        .where(eq(learningPlanItems.learningPlanId, plans[0].id))
        .orderBy(learningPlanItems.orderIndex);

      const itemsWithContent = await Promise.all(
        items.map(async item => {
          const content = await db
            .select()
            .from(contentItems)
            .where(eq(contentItems.id, item.contentItemId))
            .limit(1);

          const progress = await db
            .select()
            .from(contentProgress)
            .where(
              and(
                eq(contentProgress.userId, targetUserId),
                eq(contentProgress.contentItemId, item.contentItemId)
              )
            )
            .limit(1);

          return {
            ...item,
            content: content[0] ?? null,
            progress: progress[0] ?? null,
          };
        })
      );

      return { ...plans[0], items: itemsWithContent };
    }),

  // Generate a new learning plan based on assessment results
  generatePlan: protectedProcedure
    .input(
      z.object({
        assessmentSessionId: z.string().optional(),
        userId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const targetUserId = input.userId ?? ctx.user.id;

      // Get latest assessment session if no sessionId provided
      const latestSession = await db
        .select()
        .from(assessmentSessions)
        .where(
          and(
            eq(assessmentSessions.userId, targetUserId),
            eq(assessmentSessions.state, "completed")
          )
        )
        .orderBy(desc(assessmentSessions.completedAt))
        .limit(1);

      const sessionId = input.assessmentSessionId ?? latestSession[0]?.id;

      const result = await buildCapabilityMappedPlan(db, targetUserId, ctx.user.tenantId, sessionId);
      return { planId: result.planId, itemCount: result.itemCount };
    }),

  // Update content progress
  updateProgress: protectedProcedure
    .input(
      z.object({
        contentItemId: z.string(),
        progressPercent: z.number().min(0).max(100),
        status: z.enum(["not_started", "in_progress", "completed"]),
        planItemId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db
        .select()
        .from(contentProgress)
        .where(
          and(
            eq(contentProgress.userId, ctx.user.id),
            eq(contentProgress.contentItemId, input.contentItemId)
          )
        )
        .limit(1);

      const now = new Date();

      if (existing[0]) {
        await db
          .update(contentProgress)
          .set({
            progressPercent: input.progressPercent.toFixed(2) as any,
            status: input.status,
            startedAt: existing[0].startedAt ?? now,
            completedAt: input.status === "completed" ? now : existing[0].completedAt,
          })
          .where(eq(contentProgress.id, existing[0].id));
      } else {
        await db.insert(contentProgress).values({
          id: nanoid(),
          userId: ctx.user.id,
          contentItemId: input.contentItemId,
          progressPercent: input.progressPercent.toFixed(2) as any,
          status: input.status,
          startedAt: now,
          completedAt: input.status === "completed" ? now : null,
        });
      }

      // Update plan item status if provided
      if (input.planItemId && input.status === "completed") {
        await db
          .update(learningPlanItems)
          .set({ status: "completed", completedAt: now })
          .where(eq(learningPlanItems.id, input.planItemId));

        // I9: Check if all required plan items are now complete — auto-regenerate if so
        try {
          // Find the plan this item belongs to
          const planItem = await db
            .select({ learningPlanId: learningPlanItems.learningPlanId })
            .from(learningPlanItems)
            .where(eq(learningPlanItems.id, input.planItemId))
            .limit(1);

          if (planItem[0]) {
            const planId = planItem[0].learningPlanId;
            const allPlanItems = await db
              .select({ status: learningPlanItems.status, required: learningPlanItems.required })
              .from(learningPlanItems)
              .where(eq(learningPlanItems.learningPlanId, planId));

            const requiredItems = allPlanItems.filter(i => i.required);
            const allRequiredComplete = requiredItems.length > 0 &&
              requiredItems.every(i => i.status === "completed");
            const allItemsComplete = allPlanItems.every(i => i.status === "completed");

            if (allItemsComplete || allRequiredComplete) {
              // Mark the plan as completed
              await db
                .update(learningPlans)
                .set({ state: "completed" })
                .where(eq(learningPlans.id, planId));

              // I9: Auto-regenerate a new plan based on the latest assessment
              const latestSession = await db
                .select({ id: assessmentSessions.id })
                .from(assessmentSessions)
                .where(
                  and(
                    eq(assessmentSessions.userId, ctx.user.id),
                    eq(assessmentSessions.state, "completed")
                  )
                )
                .orderBy(desc(assessmentSessions.completedAt))
                .limit(1);

              if (latestSession[0]) {
                await buildCapabilityMappedPlan(
                  db,
                  ctx.user.id,
                  ctx.user.tenantId,
                  latestSession[0].id
                );
              }
            }
          }
        } catch (planErr) {
          // Non-fatal — log but do not block progress update
          console.warn("[learning.updateProgress] I9: Auto-regenerate failed (non-fatal):", planErr);
        }
      }

      return { success: true };
    }),

  // Get a single content item by ID
  getContentItem: protectedProcedure
    .input(z.object({ contentItemId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const item = await db
        .select()
        .from(contentItems)
        .where(eq(contentItems.id, input.contentItemId))
        .limit(1);
      if (!item[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Content item not found" });
      const progress = await db
        .select()
        .from(contentProgress)
        .where(
          and(
            eq(contentProgress.userId, ctx.user.id),
            eq(contentProgress.contentItemId, input.contentItemId)
          )
        )
        .limit(1);
      return { ...item[0], progress: progress[0] ?? null };
    }),

  // Get content library
  contentLibrary: protectedProcedure
    .input(
      z.object({
        contentType: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(200).default(24),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const allItems = await db
        .select()
        .from(contentItems)
        .where(eq(contentItems.status, "published"));

      const filtered = input.contentType
        ? allItems.filter(c => c.contentType === input.contentType)
        : allItems;

      const offset = (input.page - 1) * input.pageSize;
      const page = filtered.slice(offset, offset + input.pageSize);

      // Attach user progress
      const withProgress = await Promise.all(
        page.map(async item => {
          const progress = await db
            .select()
            .from(contentProgress)
            .where(
              and(
                eq(contentProgress.userId, ctx.user.id),
                eq(contentProgress.contentItemId, item.id)
              )
            )
            .limit(1);
          return { ...item, progress: progress[0] ?? null };
        })
      );

      return {
        items: withProgress,
        total: filtered.length,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),
});
