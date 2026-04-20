import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys } from "../db";
import {
  credibilityScores,
  riskScores,
  userStates,
  decisionLogs,
  revalidationSchedules,
} from "../../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

export const scoringRouter = router({
  // Get user's current state
  userState: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const targetUserId = input.userId ?? ctx.user.id;

      // Check permission if viewing another user
      if (targetUserId !== ctx.user.id) {
        const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
        if (
          !myRoles.some(r =>
            ["platform_super_admin", "tenant_admin", "hr_leader", "manager", "auditor"].includes(r)
          )
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      const state = await db
        .select()
        .from(userStates)
        .where(and(eq(userStates.userId, targetUserId), isNull(userStates.effectiveTo)))
        .orderBy(desc(userStates.effectiveFrom))
        .limit(1);

      const credibility = await db
        .select()
        .from(credibilityScores)
        .where(eq(credibilityScores.userId, targetUserId))
        .orderBy(desc(credibilityScores.generatedAt))
        .limit(1);

      const risk = await db
        .select()
        .from(riskScores)
        .where(eq(riskScores.userId, targetUserId))
        .orderBy(desc(riskScores.generatedAt))
        .limit(1);

      const revalidation = await db
        .select()
        .from(revalidationSchedules)
        .where(
          and(
            eq(revalidationSchedules.userId, targetUserId),
            eq(revalidationSchedules.status, "pending")
          )
        )
        .orderBy(revalidationSchedules.dueAt)
        .limit(1);

      return {
        state: state[0] ?? null,
        credibility: credibility[0] ?? null,
        risk: risk[0] ?? null,
        revalidation: revalidation[0] ?? null,
      };
    }),

  // Get credibility score history
  credibilityHistory: protectedProcedure
    .input(z.object({ userId: z.string().optional(), limit: z.number().int().max(50).default(10) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const targetUserId = input.userId ?? ctx.user.id;

      return db
        .select()
        .from(credibilityScores)
        .where(eq(credibilityScores.userId, targetUserId))
        .orderBy(desc(credibilityScores.generatedAt))
        .limit(input.limit);
    }),

  // Get risk score history
  riskHistory: protectedProcedure
    .input(z.object({ userId: z.string().optional(), limit: z.number().int().max(50).default(10) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const targetUserId = input.userId ?? ctx.user.id;

      return db
        .select()
        .from(riskScores)
        .where(eq(riskScores.userId, targetUserId))
        .orderBy(desc(riskScores.generatedAt))
        .limit(input.limit);
    }),

  // Get decision log for user
  decisionLog: protectedProcedure
    .input(z.object({ userId: z.string().optional(), limit: z.number().int().max(50).default(20) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      const targetUserId = input.userId ?? ctx.user.id;

      if (
        targetUserId !== ctx.user.id &&
        !myRoles.some(r =>
          ["platform_super_admin", "tenant_admin", "hr_leader", "auditor"].includes(r)
        )
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db
        .select()
        .from(decisionLogs)
        .where(
          and(
            eq(decisionLogs.userId, targetUserId),
            eq(decisionLogs.tenantId, ctx.user.tenantId)
          )
        )
        .orderBy(desc(decisionLogs.createdAt))
        .limit(input.limit);
    }),

  // Schedule revalidation
  scheduleRevalidation: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        dueAt: z.number(), // Unix timestamp ms
        triggerReason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (
        !myRoles.some(r =>
          ["platform_super_admin", "tenant_admin", "hr_leader", "manager"].includes(r)
        )
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const scheduleId = nanoid();
      await db.insert(revalidationSchedules).values({
        id: scheduleId,
        userId: input.userId,
        dueAt: new Date(input.dueAt),
        triggerReason: input.triggerReason,
        status: "pending",
      });

      return { scheduleId };
    }),
});
