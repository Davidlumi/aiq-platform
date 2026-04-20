import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys } from "../db";
import { tenants, tenantSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

function requireRole(roles: string[], ...allowed: string[]) {
  if (!allowed.some(r => roles.includes(r))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
  }
}

export const tenantRouter = router({
  // Get current tenant info
  current: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const result = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, ctx.user.tenantId))
      .limit(1);

    if (!result[0]) throw new TRPCError({ code: "NOT_FOUND" });
    return result[0];
  }),

  // Get tenant settings
  settings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const result = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, ctx.user.tenantId))
      .limit(1);

    return result[0] ?? null;
  }),

  // Update tenant settings (tenant_admin, hr_leader)
  updateSettings: protectedProcedure
    .input(
      z.object({
        credibilityThreshold: z.number().min(0).max(1).optional(),
        revalidationDaysLow: z.number().int().min(1).optional(),
        revalidationDaysMedium: z.number().int().min(1).optional(),
        revalidationDaysHigh: z.number().int().min(1).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const roles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      requireRole(roles, "tenant_admin", "platform_super_admin");

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updates: Record<string, unknown> = {};
      if (input.credibilityThreshold !== undefined)
        updates.credibilityThreshold = input.credibilityThreshold.toFixed(4);
      if (input.revalidationDaysLow !== undefined)
        updates.revalidationDaysLow = input.revalidationDaysLow;
      if (input.revalidationDaysMedium !== undefined)
        updates.revalidationDaysMedium = input.revalidationDaysMedium;
      if (input.revalidationDaysHigh !== undefined)
        updates.revalidationDaysHigh = input.revalidationDaysHigh;

      await db
        .update(tenantSettings)
        .set(updates as any)
        .where(eq(tenantSettings.tenantId, ctx.user.tenantId));

      return { success: true };
    }),
});
