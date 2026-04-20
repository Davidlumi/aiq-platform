import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys } from "../db";
import { auditLogs, events, adminOverrides, policyEvaluations } from "../../drizzle/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

export const auditRouter = router({
  // Get audit log (auditor, admin, hr_leader)
  logs: protectedProcedure
    .input(
      z.object({
        action: z.string().optional(),
        targetType: z.string().optional(),
        actorUserId: z.string().optional(),
        fromDate: z.number().optional(),
        toDate: z.number().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
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

      const offset = (input.page - 1) * input.pageSize;

      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, ctx.user.tenantId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      return { logs, page: input.page, pageSize: input.pageSize };
    }),

  // Get events stream
  events: protectedProcedure
    .input(
      z.object({
        eventType: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
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

      const offset = (input.page - 1) * input.pageSize;

      const evts = await db
        .select()
        .from(events)
        .where(eq(events.tenantId, ctx.user.tenantId))
        .orderBy(desc(events.occurredAt))
        .limit(input.pageSize)
        .offset(offset);

      return { events: evts, page: input.page, pageSize: input.pageSize };
    }),

  // Get admin overrides
  overrides: protectedProcedure
    .input(
      z.object({
        active: z.boolean().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
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

      const offset = (input.page - 1) * input.pageSize;

      const overrides = await db
        .select()
        .from(adminOverrides)
        .where(eq(adminOverrides.tenantId, ctx.user.tenantId))
        .orderBy(desc(adminOverrides.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      return { overrides, page: input.page, pageSize: input.pageSize };
    }),

  // Get policy evaluation incidents
  policyIncidents: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        triggeredOnly: z.boolean().default(true),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
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

      const offset = (input.page - 1) * input.pageSize;

      const evaluations = await db
        .select()
        .from(policyEvaluations)
        .orderBy(desc(policyEvaluations.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      const filtered = input.triggeredOnly
        ? evaluations.filter(e => e.result !== "no_action")
        : evaluations;

      return { evaluations: filtered, page: input.page, pageSize: input.pageSize };
    }),
});
