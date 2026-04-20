import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys } from "../db";
import {
  learningPlans,
  learningPlanItems,
  contentItems,
  contentProgress,
  assessmentScores,
  assessmentSessions,
  credibilityScores,
  riskScores,
  decisionLogs,
  auditLogs,
} from "../../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

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

      // Get latest assessment score for the user
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

      let overallScore = 50;
      let credibilityBand = "medium";
      let riskBand = "low";

      if (sessionId) {
        const score = await db
          .select()
          .from(assessmentScores)
          .where(eq(assessmentScores.sessionId, sessionId))
          .limit(1);
        if (score[0]) {
          overallScore = parseFloat(String(score[0].overallScore));
          const signals = typeof score[0].signalScoresJson === 'string'
            ? JSON.parse(score[0].signalScoresJson)
            : score[0].signalScoresJson;
          if (signals?.credibility >= 0.75) credibilityBand = "high";
          else if (signals?.credibility >= 0.5) credibilityBand = "medium";
          else credibilityBand = "low";
          if (signals?.risk >= 0.6) riskBand = "high";
          else if (signals?.risk >= 0.3) riskBand = "medium";
          else riskBand = "low";
        }
      }

      // Get all published content items
      const allContent = await db
        .select()
        .from(contentItems)
        .where(eq(contentItems.status, "published"));

      // Select content based on score and risk profile
      let selectedContent = allContent;
      if (overallScore < 50) {
        // Needs support: prioritise foundational content
        selectedContent = allContent.filter(c => c.difficulty <= 2);
      } else if (overallScore < 70) {
        // Developing: mix of foundational and intermediate
        selectedContent = allContent.filter(c => c.difficulty <= 3);
      } else {
        // Proficient: advanced content
        selectedContent = allContent.filter(c => c.difficulty >= 2);
      }

      // High risk: add scenario and simulation content
      if (riskBand === "high") {
        const riskContent = allContent.filter(c =>
          ["scenario_practice", "simulation", "scenario"].includes(c.contentType)
        );
        const combined = [...selectedContent, ...riskContent];
        const seen = new Set<string>();
        selectedContent = combined.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
      }

      // Limit to 6 items
      selectedContent = selectedContent.slice(0, 6);

      // Supersede existing active plans
      await db
        .update(learningPlans)
        .set({ state: "superseded" })
        .where(
          and(
            eq(learningPlans.userId, targetUserId),
            eq(learningPlans.tenantId, ctx.user.tenantId),
            eq(learningPlans.state, "active")
          )
        );

      const planId = nanoid();
      await db.insert(learningPlans).values({
        id: planId,
        tenantId: ctx.user.tenantId,
        userId: targetUserId,
        sourceAssessmentSessionId: sessionId ?? null,
        state: "active",
        generatorVersion: "v1",
        summaryJson: JSON.stringify({
          overallScore,
          credibilityBand,
          riskBand,
          itemCount: selectedContent.length,
        }),
      });

      // Insert plan items
      for (let i = 0; i < selectedContent.length; i++) {
        await db.insert(learningPlanItems).values({
          id: nanoid(),
          learningPlanId: planId,
          contentItemId: selectedContent[i].id,
          orderIndex: i + 1,
          required: i < 3, // first 3 required
          reasonJson: JSON.stringify({
            score: overallScore,
            credibilityBand,
            riskBand,
            contentType: selectedContent[i].contentType,
          }),
          status: "assigned",
        });
      }

      // Log decision
      await db.insert(decisionLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        userId: targetUserId,
        decisionType: "learning_plan_generation",
        inputSnapshotJson: JSON.stringify({ overallScore, credibilityBand, riskBand }),
        outputSnapshotJson: JSON.stringify({ planId, itemCount: selectedContent.length }),
        precedenceAppliedJson: JSON.stringify({ generatorVersion: "v1" }),
      });

      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "learning.plan.generated",
        targetType: "learning_plan",
        targetId: planId,
        metadataJson: JSON.stringify({ targetUserId, itemCount: selectedContent.length }),
      });

      return { planId, itemCount: selectedContent.length };
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
      }

      return { success: true };
    }),

  // Get content library
  contentLibrary: protectedProcedure
    .input(
      z.object({
        contentType: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(12),
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
