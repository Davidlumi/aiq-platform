import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys } from "../db";
import {
  policyRules,
  policyEvaluations,
  userStates,
  credibilityScores,
  riskScores,
  auditLogs,
  adminOverrides,
} from "../../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

export const policyRouter = router({
  // List policy rules for tenant
  list: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (
      !myRoles.some(r =>
        ["platform_super_admin", "tenant_admin", "hr_leader", "auditor"].includes(r)
      )
    ) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return db
      .select()
      .from(policyRules)
      .where(eq(policyRules.tenantId, ctx.user.tenantId))
      .orderBy(policyRules.severity);
  }),

  // Evaluate policies for a user (runtime check)
  evaluate: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        contextType: z.string(),
        contextId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get user's current state
      const state = await db
        .select()
        .from(userStates)
        .where(and(eq(userStates.userId, input.userId), isNull(userStates.effectiveTo)))
        .limit(1);

      const credibility = await db
        .select()
        .from(credibilityScores)
        .where(eq(credibilityScores.userId, input.userId))
        .orderBy(desc(credibilityScores.generatedAt))
        .limit(1);

      const risk = await db
        .select()
        .from(riskScores)
        .where(eq(riskScores.userId, input.userId))
        .orderBy(desc(riskScores.generatedAt))
        .limit(1);

      // Get published policies
      const policies = await db
        .select()
        .from(policyRules)
        .where(
          and(
            eq(policyRules.tenantId, ctx.user.tenantId),
            eq(policyRules.status, "published")
          )
        );

      const evaluations: Array<{
        policyId: string;
        policyKey: string;
        actionType: string;
        result: string;
        triggered: boolean;
        explanation: string;
      }> = [];

      for (const policy of policies) {
        const conditions = typeof policy.conditionsJson === 'string'
          ? JSON.parse(policy.conditionsJson)
          : policy.conditionsJson;
        const consequences = typeof policy.consequencesJson === 'string'
          ? JSON.parse(policy.consequencesJson)
          : policy.consequencesJson;

        let triggered = false;
        let explanation = "";

        // Evaluate conditions
        if (conditions.credibility_band && credibility[0]) {
          triggered = credibility[0].band === conditions.credibility_band;
          explanation = `Credibility band is ${credibility[0].band}`;
        } else if (conditions.risk_band && risk[0]) {
          triggered = risk[0].band === conditions.risk_band;
          explanation = `Risk band is ${risk[0].band}`;
        } else if (conditions.compliance_state && state[0]) {
          triggered = state[0].complianceState === conditions.compliance_state;
          explanation = `Compliance state is ${state[0].complianceState}`;
        }

        const result = triggered ? policy.actionType : "no_action";

        // Record evaluation
        await db.insert(policyEvaluations).values({
          id: nanoid(),
          userId: input.userId,
          policyRuleId: policy.id,
          contextType: input.contextType,
          contextId: input.contextId ?? null,
          result,
          explanationJson: JSON.stringify({
            triggered,
            explanation,
            message: triggered ? consequences.message : "Policy not triggered",
          }),
        });

        evaluations.push({
          policyId: policy.id,
          policyKey: policy.key,
          actionType: policy.actionType,
          result,
          triggered,
          explanation: triggered ? consequences.message : "Policy not triggered",
        });
      }

      // Log audit
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "policy.evaluated",
        targetType: "user",
        targetId: input.userId,
        metadataJson: JSON.stringify({
          contextType: input.contextType,
          triggeredCount: evaluations.filter(e => e.triggered).length,
        }),
      });

      return {
        evaluations,
        hardBlocked: evaluations.some(e => e.triggered && e.actionType === "hard_block"),
        warnings: evaluations.filter(e => e.triggered && e.actionType === "warning"),
      };
    }),

  // Get policy evaluation history for a user
  evaluationHistory: protectedProcedure
    .input(z.object({ userId: z.string().optional(), limit: z.number().int().max(50).default(20) }))
    .query(async ({ input, ctx }) => {
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

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return db
        .select()
        .from(policyEvaluations)
        .where(eq(policyEvaluations.userId, targetUserId))
        .orderBy(desc(policyEvaluations.createdAt))
        .limit(input.limit);
    }),

  // Create admin override
  createOverride: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string(),
        overrideType: z.string(),
        reason: z.string().min(10),
        beforeSnapshot: z.record(z.string(), z.unknown()),
        afterSnapshot: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const overrideId = nanoid();
      await db.insert(adminOverrides).values({
        id: overrideId,
        tenantId: ctx.user.tenantId,
        targetUserId: input.targetUserId,
        overrideType: input.overrideType,
        reason: input.reason,
        beforeSnapshotJson: input.beforeSnapshot,
        afterSnapshotJson: input.afterSnapshot,
        createdBy: ctx.user.id,
        active: true,
      });

      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "admin.override.created",
        targetType: "user",
        targetId: input.targetUserId,
        metadataJson: JSON.stringify({ overrideType: input.overrideType, reason: input.reason }),
      });

      return { overrideId };
    }),

  // Create a new policy rule
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        action: z.enum(["hard_block", "warning", "remediation_trigger", "escalate", "force_revalidation"]),
        priority: z.number().int().min(1).max(100).default(50),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const id = nanoid();
      const key = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 80) + "_" + id.slice(0, 6);
      const severity = input.priority <= 33 ? "low" : input.priority <= 66 ? "medium" : "high";
      await db.insert(policyRules).values({
        id,
        tenantId: ctx.user.tenantId,
        key,
        name: input.name,
        actionType: input.action,
        severity,
        status: "draft",
        version: 1,
        conditionsJson: {},
        consequencesJson: { message: input.description ?? "" },
      });
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "policy.created",
        targetType: "policy",
        targetId: id,
        metadataJson: JSON.stringify({ name: input.name, action: input.action }),
      });
      return { id };
    }),
});
