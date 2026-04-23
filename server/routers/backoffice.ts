/**
 * Back-Office Router — super_admin only
 * Provides full platform management: orgs, users, role assignment, password reset
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tenants, users, userRoles, roles, assessmentAnswers, assessmentSessions, assessmentItems } from "../../drizzle/schema";
import { eq, and, like, or, desc, asc, ne, isNotNull, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword, generateResetToken } from "../auth";

// ─── Guard: super_admin only ──────────────────────────────────────────────────
async function assertSuperAdmin(userId: string, tenantId: string, db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const roleRows = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId)));
  const keys = roleRows.map(r => r.key);
  if (!keys.includes("super_admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super admin access required" });
  }
}

export const backofficeRouter = router({
  // ── Orgs ──────────────────────────────────────────────────────────────────

  listOrgs: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertSuperAdmin(ctx.user.id, ctx.user.tenantId, db);
      const allTenants = await db.select().from(tenants).orderBy(asc(tenants.name));
      // Attach user counts
      const result = await Promise.all(
        allTenants.map(async (t) => {
          const userCount = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.tenantId, t.id));
          return { ...t, userCount: userCount.length };
        })
      );
      const search = input?.search?.toLowerCase();
      if (search) {
        return result.filter(t =>
          t.name?.toLowerCase().includes(search) ||
          t.slug?.toLowerCase().includes(search) ||
          t.primaryDomain?.toLowerCase().includes(search)
        );
      }
      return result;
    }),

  createOrg: protectedProcedure
    .input(z.object({
      name: z.string().min(2).max(200),
      slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
      primaryDomain: z.string().optional(),
      status: z.enum(["active", "trial", "suspended", "archived"]).default("trial"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertSuperAdmin(ctx.user.id, ctx.user.tenantId, db);
      // Check slug uniqueness
      const existing = await db.select().from(tenants).where(eq(tenants.slug, input.slug)).limit(1);
      if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "Organisation slug already exists" });
      const tenantId = `tenant-${nanoid(12)}`;
      await db.insert(tenants).values({
        id: tenantId,
        name: input.name,
        slug: input.slug,
        primaryDomain: input.primaryDomain ?? null,
        status: input.status,
      });
      return { tenantId, slug: input.slug };
    }),

  updateOrg: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      name: z.string().min(2).max(200).optional(),
      primaryDomain: z.string().optional(),
      status: z.enum(["active", "trial", "suspended", "archived"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertSuperAdmin(ctx.user.id, ctx.user.tenantId, db);
      const { tenantId, ...updates } = input;
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.primaryDomain !== undefined) updateData.primaryDomain = updates.primaryDomain;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (Object.keys(updateData).length === 0) return { success: true };
      await db.update(tenants).set(updateData).where(eq(tenants.id, tenantId));
      return { success: true };
    }),

  deleteOrg: protectedProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertSuperAdmin(ctx.user.id, ctx.user.tenantId, db);
      // Prevent deleting the lumi platform tenant
      const tenant = await db.select().from(tenants).where(eq(tenants.id, input.tenantId)).limit(1);
      if (!tenant[0]) throw new TRPCError({ code: "NOT_FOUND" });
      if (tenant[0].slug === "lumi") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete the platform tenant" });
      // Archive instead of hard delete
      await db.update(tenants).set({ status: "archived" }).where(eq(tenants.id, input.tenantId));
      return { success: true };
    }),

  // ── Users ─────────────────────────────────────────────────────────────────

  listUsers: protectedProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertSuperAdmin(ctx.user.id, ctx.user.tenantId, db);
      const allUsers = await db
        .select({
          id: users.id,
          tenantId: users.tenantId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          status: users.status,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
          jobFunction: users.jobFunction,
          experienceLevel: users.experienceLevel,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      // Attach tenant name and roles
      const tenantMap = new Map<string, string>();
      const allTenants = await db.select({ id: tenants.id, name: tenants.name, slug: tenants.slug }).from(tenants);
      for (const t of allTenants) tenantMap.set(t.id, `${t.name} (${t.slug})`);

      const enriched = await Promise.all(allUsers.map(async (u) => {
        const roleRows = await db
          .select({ key: roles.key, label: roles.label })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, u.id));
        return {
          ...u,
          tenantName: tenantMap.get(u.tenantId) ?? u.tenantId,
          roles: roleRows.map(r => r.key),
        };
      }));

      // Filter
      let filtered = enriched;
      if (input?.tenantId) filtered = filtered.filter(u => u.tenantId === input.tenantId);
      if (input?.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(u =>
          u.email.toLowerCase().includes(s) ||
          u.firstName.toLowerCase().includes(s) ||
          u.lastName.toLowerCase().includes(s)
        );
      }

      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 50;
      const total = filtered.length;
      const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
      return { users: paginated, total, page, pageSize };
    }),

  createUser: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      email: z.string().email(),
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      password: z.string().min(8),
      roleKey: z.string().default("learner"),
      jobFunction: z.string().optional(),
      experienceLevel: z.enum(["junior", "mid", "senior", "principal"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertSuperAdmin(ctx.user.id, ctx.user.tenantId, db);
      // Check email uniqueness within tenant
      const existing = await db.select().from(users)
        .where(and(eq(users.tenantId, input.tenantId), eq(users.email, input.email)))
        .limit(1);
      if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "Email already exists in this organisation" });
      // Find role
      const roleRow = await db.select().from(roles).where(eq(roles.key, input.roleKey)).limit(1);
      if (!roleRow[0]) throw new TRPCError({ code: "NOT_FOUND", message: `Role '${input.roleKey}' not found` });
      const userId = `user-${nanoid(12)}`;
      const passwordHash = await hashPassword(input.password);
      await db.insert(users).values({
        id: userId,
        tenantId: input.tenantId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        status: "active",
        onboardingCompleted: false,
        jobFunction: input.jobFunction ?? null,
        experienceLevel: input.experienceLevel ?? null,
      });
      const urId = nanoid();
      await db.insert(userRoles).values({
        id: urId,
        tenantId: input.tenantId,
        userId,
        roleId: roleRow[0].id,
      });
      return { userId, email: input.email };
    }),

  updateUser: protectedProcedure
    .input(z.object({
      userId: z.string(),
      firstName: z.string().min(1).max(100).optional(),
      lastName: z.string().min(1).max(100).optional(),
      status: z.enum(["active", "pending", "suspended", "deactivated"]).optional(),
      jobFunction: z.string().optional(),
      experienceLevel: z.enum(["junior", "mid", "senior", "principal"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertSuperAdmin(ctx.user.id, ctx.user.tenantId, db);
      const { userId, ...updates } = input;
      const updateData: Record<string, unknown> = {};
      if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
      if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.jobFunction !== undefined) updateData.jobFunction = updates.jobFunction;
      if (updates.experienceLevel !== undefined) updateData.experienceLevel = updates.experienceLevel;
      if (Object.keys(updateData).length > 0) {
        await db.update(users).set(updateData).where(eq(users.id, userId));
      }
      return { success: true };
    }),

  assignRole: protectedProcedure
    .input(z.object({
      userId: z.string(),
      tenantId: z.string(),
      roleKey: z.string(),
      replace: z.boolean().default(false), // if true, remove all existing roles first
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertSuperAdmin(ctx.user.id, ctx.user.tenantId, db);
      const roleRow = await db.select().from(roles).where(eq(roles.key, input.roleKey)).limit(1);
      if (!roleRow[0]) throw new TRPCError({ code: "NOT_FOUND", message: `Role '${input.roleKey}' not found` });
      if (input.replace) {
        await db.delete(userRoles).where(and(eq(userRoles.userId, input.userId), eq(userRoles.tenantId, input.tenantId)));
      }
      const urId = nanoid();
      await db.insert(userRoles).values({
        id: urId,
        tenantId: input.tenantId,
        userId: input.userId,
        roleId: roleRow[0].id,
      }).onDuplicateKeyUpdate({ set: { roleId: roleRow[0].id } });
      return { success: true };
    }),

  resetPassword: protectedProcedure
    .input(z.object({
      userId: z.string(),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertSuperAdmin(ctx.user.id, ctx.user.tenantId, db);
      const passwordHash = await hashPassword(input.newPassword);
      await db.update(users)
        .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  listRoles: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await assertSuperAdmin(ctx.user.id, ctx.user.tenantId, db);
    return db.select().from(roles).orderBy(asc(roles.key));
  }),

  // ── Reasoning Review ─────────────────────────────────────────────────────────
  listReasoningAnswers: protectedProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      userId: z.string().optional(),
      capability: z.string().optional(),
      interactionType: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertSuperAdmin(ctx.user.id, ctx.user.tenantId, db);

      // Fetch all answers where reasoning_text is present
      const answers = await db
        .select({
          answerId: assessmentAnswers.id,
          sessionId: assessmentAnswers.sessionId,
          itemId: assessmentAnswers.itemId,
          reasoningText: assessmentAnswers.reasoningText,
          selectedValueJson: assessmentAnswers.selectedValueJson,
          outcomeClass: assessmentAnswers.outcomeClass,
          confidenceScore: assessmentAnswers.confidenceScore,
          timeToAnswerMs: assessmentAnswers.timeToAnswerMs,
          signalDeltasJson: assessmentAnswers.signalDeltasJson,
          submittedAt: assessmentAnswers.submittedAt,
          sessionTenantId: assessmentSessions.tenantId,
          sessionUserId: assessmentSessions.userId,
          sessionState: assessmentSessions.state,
          sessionCompletedAt: assessmentSessions.completedAt,
          itemPrompt: assessmentItems.prompt,
          itemDifficulty: assessmentItems.difficulty,
          itemMetadataJson: assessmentItems.metadataJson,
        })
        .from(assessmentAnswers)
        .innerJoin(assessmentSessions, eq(assessmentAnswers.sessionId, assessmentSessions.id))
        .leftJoin(assessmentItems, eq(assessmentAnswers.itemId, assessmentItems.id))
        .where(isNotNull(assessmentAnswers.reasoningText))
        .orderBy(desc(assessmentAnswers.submittedAt));

      if (answers.length === 0) {
        return { records: [], total: 0, page: input?.page ?? 1, pageSize: input?.pageSize ?? 50 };
      }

      // Enrich with user details
      const userIds = Array.from(new Set(answers.map(a => a.sessionUserId)));
      const userRows = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, tenantId: users.tenantId })
        .from(users)
        .where(inArray(users.id, userIds));
      const userMap = new Map(userRows.map(u => [u.id, u]));

      // Enrich with tenant details
      const tenantIds = Array.from(new Set(answers.map(a => a.sessionTenantId)));
      const tenantRows = await db
        .select({ id: tenants.id, name: tenants.name, slug: tenants.slug })
        .from(tenants)
        .where(inArray(tenants.id, tenantIds));
      const tenantMap = new Map(tenantRows.map(t => [t.id, t]));

      // Build enriched records
      let enriched = answers.map(a => {
        const meta = (a.itemMetadataJson ?? {}) as Record<string, unknown>;
        const interactionType = String(meta.interactionType ?? meta.interaction_type ?? "situational_judgement");
        const capability = String(meta.capability ?? meta.capabilityKey ?? "unknown");
        const user = userMap.get(a.sessionUserId);
        const tenant = tenantMap.get(a.sessionTenantId);
        return {
          answerId: a.answerId,
          sessionId: a.sessionId,
          itemId: a.itemId,
          reasoningText: a.reasoningText ?? "",
          selectedValue: a.selectedValueJson as string | null,
          outcomeClass: a.outcomeClass ?? "unknown",
          confidenceScore: a.confidenceScore ? parseFloat(String(a.confidenceScore)) : null,
          timeToAnswerMs: a.timeToAnswerMs,
          signalDeltas: a.signalDeltasJson as Record<string, number> | null,
          submittedAt: a.submittedAt,
          sessionState: a.sessionState,
          sessionCompletedAt: a.sessionCompletedAt,
          itemPrompt: a.itemPrompt ?? "(LLM-generated item)",
          itemDifficulty: a.itemDifficulty ?? 2,
          interactionType,
          capability,
          userId: a.sessionUserId,
          userName: user ? `${user.firstName} ${user.lastName}`.trim() : "Unknown",
          userEmail: user?.email ?? "",
          tenantId: a.sessionTenantId,
          tenantName: tenant?.name ?? "Unknown Org",
          tenantSlug: tenant?.slug ?? "",
        };
      });

      // Apply optional filters
      if (input?.tenantId) enriched = enriched.filter(r => r.tenantId === input.tenantId);
      if (input?.userId) enriched = enriched.filter(r => r.userId === input.userId);
      if (input?.capability) enriched = enriched.filter(r => r.capability === input.capability);
      if (input?.interactionType) enriched = enriched.filter(r => r.interactionType === input.interactionType);

      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 50;
      const total = enriched.length;
      const paginated = enriched.slice((page - 1) * pageSize, page * pageSize);
      return { records: paginated, total, page, pageSize };
    }),

  // ── Platform stats ─────────────────────────────────────────────────────────
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await assertSuperAdmin(ctx.user.id, ctx.user.tenantId, db);
    const allTenants = await db.select({ id: tenants.id, status: tenants.status }).from(tenants);
    const allUsers = await db.select({ id: users.id, status: users.status, createdAt: users.createdAt }).from(users);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      totalOrgs: allTenants.length,
      activeOrgs: allTenants.filter(t => t.status === "active").length,
      trialOrgs: allTenants.filter(t => t.status === "trial").length,
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.status === "active").length,
      newUsersLast30Days: allUsers.filter(u => new Date(u.createdAt) > thirtyDaysAgo).length,
    };
  }),
});
