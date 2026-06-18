/**
 * Back-Office Router — super_admin only
 * Provides full platform management: orgs, users, role assignment, password reset
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { superUserProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  tenants, users, userRoles, roles, assessmentAnswers, assessmentSessions, assessmentItems, assessmentBlueprints,
  scoringConfig, organisationCapabilityThresholds, sectorVocabulary, auditLogs,
  antiGamingThresholds, llmItemReviewQueue, assessmentReviewFlags,
  userPersonas, userStates, credibilityScores, riskScores, decisionLogs,
  revalidationSchedules, learningPlans, learningPlanItems, contentProgress,
  policyEvaluations, reportJobs, assessmentScores, assessmentAnswerTelemetry,
  ailUserIntelligenceProfiles, ailSignalLedger, ailRetestQueue, ailPersonaProfiles,
  ailNarrativeState, ailStakeholderRelationships, ailNarrativeEvents, ailNarrativeThreads,
  ailDifficultyProfiles, simulationSessions, simulationSessionEvents, simulationResults,
  tenantSettings,
  managerTeamMembers,
} from "../../drizzle/schema";
import { eq, and, like, or, desc, asc, ne, isNotNull, inArray, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword, generateResetToken } from "../auth";
import {
  isOutcomeConditionalAntiGamingEnabled,
  isValidationPhaseRandomised,
  isLlmCheckerEnabled,
  isSaveAndResumeEnabled,
  isPersonaAdaptationEnabled,
  isPersonaLabelSofteningEnabled,
} from "../assessment/featureFlags";

// ─── Guard: super_admin only ──────────────────────────────────────────────────
// assertSuperAdmin removed — all back-office procedures now use superUserProcedure middleware

export const backofficeRouter = router({
  // ── Orgs ──────────────────────────────────────────────────────────────────

  listOrgs: superUserProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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

  createOrg: superUserProcedure
    .input(z.object({
      name: z.string().min(2).max(200),
      slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
      primaryDomain: z.string().optional(),
      status: z.enum(["active", "trial", "suspended", "archived"]).default("trial"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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

  updateOrg: superUserProcedure
    .input(z.object({
      tenantId: z.string(),
      name: z.string().min(2).max(200).optional(),
      primaryDomain: z.string().optional(),
      status: z.enum(["active", "trial", "suspended", "archived"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { tenantId, ...updates } = input;
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.primaryDomain !== undefined) updateData.primaryDomain = updates.primaryDomain;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (Object.keys(updateData).length === 0) return { success: true };
      await db.update(tenants).set(updateData).where(eq(tenants.id, tenantId));
      return { success: true };
    }),

  deleteOrg: superUserProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Prevent deleting the lumi platform tenant
      const tenant = await db.select().from(tenants).where(eq(tenants.id, input.tenantId)).limit(1);
      if (!tenant[0]) throw new TRPCError({ code: "NOT_FOUND" });
      if (tenant[0].slug === "lumi") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete the platform tenant" });
      // Archive instead of hard delete
      await db.update(tenants).set({ status: "archived" }).where(eq(tenants.id, input.tenantId));
      return { success: true };
    }),

  // ── Users ─────────────────────────────────────────────────────────────────

  listUsers: superUserProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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

  createUser: superUserProcedure
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

  updateUser: superUserProcedure
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

  assignRole: superUserProcedure
    .input(z.object({
      userId: z.string(),
      tenantId: z.string(),
      roleKey: z.string(),
      replace: z.boolean().default(false), // if true, remove all existing roles first
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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

  resetPassword: superUserProcedure
    .input(z.object({
      userId: z.string(),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const passwordHash = await hashPassword(input.newPassword);
      await db.update(users)
        .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  listRoles: superUserProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(roles).orderBy(asc(roles.key));
  }),

  // ── Reasoning Review ─────────────────────────────────────────────────────────
  listReasoningAnswers: superUserProcedure
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

  // ── S1: Scoring Config Management ───────────────────────────────────────────

  listScoringConfigs: superUserProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(scoringConfig).orderBy(desc(scoringConfig.createdAt));
  }),

  createScoringConfig: superUserProcedure
    .input(z.object({
      version: z.string().min(1),
      intercept: z.number().min(0).max(100),
      multiplier: z.number().min(0.1).max(5),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Deactivate all existing configs
      await db.update(scoringConfig).set({ isActive: false });
      const id = nanoid();
      // scoringConfig uses int autoincrement id; version must be int
      const versionNum = parseInt(input.version, 10) || 1;
      await db.insert(scoringConfig).values({
        version: versionNum,
        capabilityScoreIntercept: input.intercept.toString() as any,
        capabilityScoreMultiplier: input.multiplier.toString() as any,
        isActive: true,
        notes: input.description ?? null,
        calibrationSource: "synthetic_default",
      });
            await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "config.scoring_config.created",
        targetType: "scoring_config",
        targetId: String(versionNum),
        metadataJson: JSON.stringify({ version: input.version, intercept: input.intercept, multiplier: input.multiplier }),
      });
      return { success: true };
    }),

  activateScoringConfig: superUserProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(scoringConfig).set({ isActive: false });
      const idNum = parseInt(input.id, 10);
      await db.update(scoringConfig).set({ isActive: true }).where(eq(scoringConfig.id, idNum));
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "config.scoring_config.activated",
        targetType: "scoring_config",
        targetId: input.id,
        metadataJson: JSON.stringify({ activatedConfigId: input.id }),
      });
      return { success: true };
    }),

  // ── S10: Org Capability Thresholds ─────────────────────────────────────────

  listOrgThresholds: superUserProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db
        .select()
        .from(organisationCapabilityThresholds)
        .where(eq(organisationCapabilityThresholds.orgId, input.orgId));
    }),

  upsertOrgThreshold: superUserProcedure
    .input(z.object({
      orgId: z.string(),
      archetypeId: z.string(),
      capability: z.string(),
      minimumSafeThreshold: z.number().min(0).max(100),
      rationale: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Check if row exists
      const existing = await db
        .select({ id: organisationCapabilityThresholds.id })
        .from(organisationCapabilityThresholds)
        .where(and(
          eq(organisationCapabilityThresholds.orgId, input.orgId),
          eq(organisationCapabilityThresholds.archetypeId, input.archetypeId),
          eq(organisationCapabilityThresholds.capability, input.capability)
        ));
      let thresholdId: string;
      if (existing.length > 0) {
        await db
          .update(organisationCapabilityThresholds)
          .set({
            minimumSafeThreshold: input.minimumSafeThreshold,
            updatedBy: ctx.user.id,
          })
          .where(eq(organisationCapabilityThresholds.id, existing[0].id));
        thresholdId = existing[0].id;
      } else {
        thresholdId = nanoid();
        await db.insert(organisationCapabilityThresholds).values({
          id: thresholdId,
          orgId: input.orgId,
          archetypeId: input.archetypeId,
          capability: input.capability,
          minimumSafeThreshold: input.minimumSafeThreshold,
          updatedBy: ctx.user.id,
        });
      }
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "config.capability_threshold.upserted",
        targetType: "capability_threshold",
        targetId: input.orgId,
        metadataJson: JSON.stringify({ orgId: input.orgId, archetypeId: input.archetypeId, capability: input.capability, threshold: input.minimumSafeThreshold, operation: existing.length > 0 ? "update" : "create" }),
      });
      return { id: thresholdId };
    }),

  deleteOrgThreshold: superUserProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(organisationCapabilityThresholds).where(eq(organisationCapabilityThresholds.id, input.id));
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "config.capability_threshold.deleted",
        targetType: "capability_threshold",
        targetId: input.id,
        metadataJson: JSON.stringify({ deletedId: input.id }),
      });
      return { success: true };
    }),
  // ── WS2.2: Anti-gaming threshold management ───────────────────────────────
  listAntiGamingThresholds: superUserProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(antiGamingThresholds).orderBy(asc(antiGamingThresholds.roleKey));
  }),
  upsertAntiGamingThreshold: superUserProcedure
    .input(z.object({
      roleKey: z.string().max(80),
      alwaysSafeChoiceRate: z.number().min(0).max(1),
      alwaysEscalateRate: z.number().min(0).max(1),
      alwaysCautiousRate: z.number().min(0).max(1),
      optionPositionBiasRate: z.number().min(0).max(1),
      strongAnswerMaxRate: z.number().min(0).max(1),
      outcomeConditionalRate: z.number().min(0).max(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select({ id: antiGamingThresholds.id })
        .from(antiGamingThresholds)
        .where(eq(antiGamingThresholds.roleKey, input.roleKey))
        .limit(1);
      if (existing[0]) {
        await db.update(antiGamingThresholds)
          .set({
            alwaysSafeChoiceRate: String(input.alwaysSafeChoiceRate),
            alwaysEscalateRate: String(input.alwaysEscalateRate),
            alwaysCautiousRate: String(input.alwaysCautiousRate),
            optionPositionBiasRate: String(input.optionPositionBiasRate),
            strongAnswerMaxRate: String(input.strongAnswerMaxRate),
            outcomeConditionalRate: String(input.outcomeConditionalRate),
            updatedAt: Date.now(),
          })
          .where(eq(antiGamingThresholds.id, existing[0].id));
        return { id: existing[0].id, action: "updated" };
      }
      const id = nanoid();
      await db.insert(antiGamingThresholds).values({
        id,
        roleKey: input.roleKey,
        alwaysSafeChoiceRate: String(input.alwaysSafeChoiceRate),
        alwaysEscalateRate: String(input.alwaysEscalateRate),
        alwaysCautiousRate: String(input.alwaysCautiousRate),
        optionPositionBiasRate: String(input.optionPositionBiasRate),
        strongAnswerMaxRate: String(input.strongAnswerMaxRate),
        outcomeConditionalRate: String(input.outcomeConditionalRate),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { id, action: "created" };
    }),
  deleteAntiGamingThreshold: superUserProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(antiGamingThresholds).where(eq(antiGamingThresholds.id, input.id));
      return { success: true };
    }),
  // ── WS3: LLM item review queue ───────────────────────────────────────────────
  listLlmReviewQueue: superUserProcedure
    .input(z.object({
      status: z.enum(["pending", "approved", "rejected", "auto_approved", "all"]).optional().default("pending"),
      limit: z.number().int().min(1).max(100).optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.status !== "all") {
        return db.select().from(llmItemReviewQueue)
          .where(eq(llmItemReviewQueue.status, input.status as "pending" | "approved" | "rejected" | "auto_approved"))
          .orderBy(desc(llmItemReviewQueue.createdAt))
          .limit(input.limit);
      }
      return db.select().from(llmItemReviewQueue)
        .orderBy(desc(llmItemReviewQueue.createdAt))
        .limit(input.limit);
    }),
  updateLlmReviewStatus: superUserProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["approved", "rejected"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(llmItemReviewQueue)
        .set({ status: input.status })
        .where(eq(llmItemReviewQueue.id, input.id));
      return { success: true };
    }),

  // ── WS3.1: LLM Quality Gate Stats ────────────────────────────────────────────
  qualityGateStats: superUserProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db.select().from(llmItemReviewQueue);
      const total = rows.length;
      const pending = rows.filter(r => r.status === "pending").length;
      const approved = rows.filter(r => r.status === "approved").length;
      const autoApproved = rows.filter(r => r.status === "auto_approved").length;
      const rejected = rows.filter(r => r.status === "rejected").length;
      const reviewed = approved + autoApproved + rejected;
      const passRate = reviewed > 0 ? Math.round(((approved + autoApproved) / reviewed) * 100) : null;
      const rejectionRate = reviewed > 0 ? Math.round((rejected / reviewed) * 100) : null;

      // Last 7 days daily trend
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recent = rows.filter(r => new Date(r.createdAt) >= sevenDaysAgo);
      const dailyMap: Record<string, { generated: number; passed: number; rejected: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        dailyMap[key] = { generated: 0, passed: 0, rejected: 0 };
      }
      for (const r of recent) {
        const key = new Date(r.createdAt).toISOString().slice(0, 10);
        if (!dailyMap[key]) continue;
        dailyMap[key].generated++;
        if (r.status === "approved" || r.status === "auto_approved") dailyMap[key].passed++;
        if (r.status === "rejected") dailyMap[key].rejected++;
      }
      const trend = Object.entries(dailyMap).map(([date, counts]) => ({ date, ...counts }));

      // Top failure reasons (from pending + rejected)
      const failureCounts: Record<string, number> = {};
      for (const r of rows.filter(r => r.status === "rejected" || r.status === "pending")) {
        const reason = (r.failureReason ?? "Unknown").slice(0, 80);
        failureCounts[reason] = (failureCounts[reason] ?? 0) + 1;
      }
      const topFailures = Object.entries(failureCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count }));

      return { total, pending, approved, autoApproved, rejected, reviewed, passRate, rejectionRate, trend, topFailures };
    }),

  // ── WS4.3: Session review flags queue ────────────────────────────────────────
  listSessionReviewFlags: superUserProcedure
    .input(z.object({
      status: z.enum(["pending", "reviewed", "all"]).optional().default("pending"),
      limit: z.number().int().min(1).max(100).optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.status !== "all") {
        return db.select().from(assessmentReviewFlags)
          .where(eq(assessmentReviewFlags.status, input.status))
          .orderBy(desc(assessmentReviewFlags.createdAt))
          .limit(input.limit);
      }
      return db.select().from(assessmentReviewFlags)
        .orderBy(desc(assessmentReviewFlags.createdAt))
        .limit(input.limit);
    }),
  resolveSessionReviewFlag: superUserProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(assessmentReviewFlags)
        .set({ status: "reviewed" })
        .where(eq(assessmentReviewFlags.id, input.id));
      return { success: true };
    }),
  // ── S8: Sector Vocabulary ─────────────────────────────────────────────────────
  listSectors: superUserProcedure.query(async ({ ctx }) => {    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(sectorVocabulary).orderBy(asc(sectorVocabulary.label));
  }),

   // ── Delete User (hard delete with full cascade) ────────────────────────────
  deleteUser: superUserProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot delete your own account." });
      }
      // 1. Cascade: session-linked data
      const sessions = await db
        .select({ id: assessmentSessions.id })
        .from(assessmentSessions)
        .where(eq(assessmentSessions.userId, input.userId));
      const sessionIds = sessions.map(s => s.id);
      if (sessionIds.length > 0) {
        await db.delete(assessmentAnswerTelemetry).where(inArray(assessmentAnswerTelemetry.sessionId, sessionIds));
        await db.delete(assessmentAnswers).where(inArray(assessmentAnswers.sessionId, sessionIds));
        await db.delete(assessmentScores).where(inArray(assessmentScores.sessionId, sessionIds));
        await db.delete(assessmentReviewFlags).where(inArray(assessmentReviewFlags.sessionId, sessionIds));
      }
      await db.delete(policyEvaluations).where(eq(policyEvaluations.userId, input.userId));
      await db.delete(assessmentSessions).where(eq(assessmentSessions.userId, input.userId));
      // 2. Simulation data
      const simSessions = await db
        .select({ id: simulationSessions.id })
        .from(simulationSessions)
        .where(eq(simulationSessions.userId, input.userId));
      const simSessionIds = simSessions.map(s => s.id);
      if (simSessionIds.length > 0) {
        await db.delete(simulationSessionEvents).where(inArray(simulationSessionEvents.sessionId, simSessionIds));
        await db.delete(simulationResults).where(inArray(simulationResults.sessionId, simSessionIds));
      }
      await db.delete(simulationSessions).where(eq(simulationSessions.userId, input.userId));
      // 3. Learning data
      const plans = await db
        .select({ id: learningPlans.id })
        .from(learningPlans)
        .where(eq(learningPlans.userId, input.userId));
      const planIds = plans.map(p => p.id);
      if (planIds.length > 0) {
        await db.delete(learningPlanItems).where(inArray(learningPlanItems.learningPlanId, planIds));
      }
      await db.delete(learningPlans).where(eq(learningPlans.userId, input.userId));
      await db.delete(contentProgress).where(eq(contentProgress.userId, input.userId));
      // 4. AIL / intelligence data
      await db.delete(ailSignalLedger).where(eq(ailSignalLedger.userId, input.userId));
      await db.delete(ailRetestQueue).where(eq(ailRetestQueue.userId, input.userId));
      await db.delete(ailPersonaProfiles).where(eq(ailPersonaProfiles.userId, input.userId));
      await db.delete(ailUserIntelligenceProfiles).where(eq(ailUserIntelligenceProfiles.userId, input.userId));
      await db.delete(ailNarrativeState).where(eq(ailNarrativeState.userId, input.userId));
      await db.delete(ailStakeholderRelationships).where(eq(ailStakeholderRelationships.userId, input.userId));
      await db.delete(ailNarrativeEvents).where(eq(ailNarrativeEvents.userId, input.userId));
      await db.delete(ailNarrativeThreads).where(eq(ailNarrativeThreads.userId, input.userId));
      await db.delete(ailDifficultyProfiles).where(eq(ailDifficultyProfiles.userId, input.userId));
      // 5. Scoring / state data
      await db.delete(credibilityScores).where(eq(credibilityScores.userId, input.userId));
      await db.delete(riskScores).where(eq(riskScores.userId, input.userId));
      await db.delete(userStates).where(eq(userStates.userId, input.userId));
      await db.delete(decisionLogs).where(eq(decisionLogs.userId, input.userId));
      await db.delete(revalidationSchedules).where(eq(revalidationSchedules.userId, input.userId));
      await db.delete(reportJobs).where(eq(reportJobs.requestedBy, input.userId));
      // 6. User profile data
      await db.delete(userPersonas).where(eq(userPersonas.userId, input.userId));
      await db.delete(userRoles).where(eq(userRoles.userId, input.userId));
      // 7. Finally delete the user
      await db.delete(users).where(eq(users.id, input.userId));
      // PROD-4.1: Audit log for GDPR erasure record
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "admin.user.deleted",
        targetType: "user",
        targetId: input.userId,
        metadataJson: JSON.stringify({ deletedBy: ctx.user.id }),
      });
      return { success: true };
    }),

  // ── Delete Company (hard delete with full cascade) ───────────────────────
  deleteCompany: superUserProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.tenantId === ctx.user.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot delete your own organisation." });
      }
      const tenant = await db.select().from(tenants).where(eq(tenants.id, input.tenantId)).limit(1);
      if (!tenant[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Organisation not found." });
      if (tenant[0].slug === "lumi") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete the platform tenant." });
      // Get all users in the tenant
      const tenantUsers = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, input.tenantId));
      const userIds = tenantUsers.map(u => u.id);
      if (userIds.length > 0) {
        const sessions = await db
          .select({ id: assessmentSessions.id })
          .from(assessmentSessions)
          .where(eq(assessmentSessions.tenantId, input.tenantId));
        const sessionIds = sessions.map(s => s.id);
        if (sessionIds.length > 0) {
          await db.delete(assessmentAnswerTelemetry).where(inArray(assessmentAnswerTelemetry.sessionId, sessionIds));
          await db.delete(assessmentAnswers).where(inArray(assessmentAnswers.sessionId, sessionIds));
          await db.delete(assessmentScores).where(inArray(assessmentScores.sessionId, sessionIds));
          await db.delete(assessmentReviewFlags).where(inArray(assessmentReviewFlags.sessionId, sessionIds));
        }
        await db.delete(policyEvaluations).where(inArray(policyEvaluations.userId, userIds));
        await db.delete(assessmentSessions).where(eq(assessmentSessions.tenantId, input.tenantId));
        const simSessions = await db
          .select({ id: simulationSessions.id })
          .from(simulationSessions)
          .where(eq(simulationSessions.tenantId, input.tenantId));
        const simSessionIds = simSessions.map(s => s.id);
        if (simSessionIds.length > 0) {
          await db.delete(simulationSessionEvents).where(inArray(simulationSessionEvents.sessionId, simSessionIds));
          await db.delete(simulationResults).where(inArray(simulationResults.sessionId, simSessionIds));
        }
        await db.delete(simulationSessions).where(eq(simulationSessions.tenantId, input.tenantId));
        const plans = await db
          .select({ id: learningPlans.id })
          .from(learningPlans)
          .where(eq(learningPlans.tenantId, input.tenantId));
        const planIds = plans.map(p => p.id);
        if (planIds.length > 0) {
          await db.delete(learningPlanItems).where(inArray(learningPlanItems.learningPlanId, planIds));
        }
        await db.delete(learningPlans).where(eq(learningPlans.tenantId, input.tenantId));
        await db.delete(contentProgress).where(inArray(contentProgress.userId, userIds));
        await db.delete(ailSignalLedger).where(inArray(ailSignalLedger.userId, userIds));
        await db.delete(ailRetestQueue).where(inArray(ailRetestQueue.userId, userIds));
        await db.delete(ailPersonaProfiles).where(inArray(ailPersonaProfiles.userId, userIds));
        await db.delete(ailUserIntelligenceProfiles).where(inArray(ailUserIntelligenceProfiles.userId, userIds));
        await db.delete(ailNarrativeState).where(inArray(ailNarrativeState.userId, userIds));
        await db.delete(ailStakeholderRelationships).where(inArray(ailStakeholderRelationships.userId, userIds));
        await db.delete(ailNarrativeEvents).where(inArray(ailNarrativeEvents.userId, userIds));
        await db.delete(ailNarrativeThreads).where(inArray(ailNarrativeThreads.userId, userIds));
        await db.delete(ailDifficultyProfiles).where(inArray(ailDifficultyProfiles.userId, userIds));
        await db.delete(credibilityScores).where(inArray(credibilityScores.userId, userIds));
        await db.delete(riskScores).where(inArray(riskScores.userId, userIds));
        await db.delete(userStates).where(inArray(userStates.userId, userIds));
        await db.delete(decisionLogs).where(eq(decisionLogs.tenantId, input.tenantId));
        await db.delete(revalidationSchedules).where(inArray(revalidationSchedules.userId, userIds));
        await db.delete(reportJobs).where(eq(reportJobs.tenantId, input.tenantId));
        await db.delete(userPersonas).where(inArray(userPersonas.userId, userIds));
        await db.delete(userRoles).where(eq(userRoles.tenantId, input.tenantId));
        await db.delete(users).where(eq(users.tenantId, input.tenantId));
      }
      // Tenant-level config
      await db.delete(organisationCapabilityThresholds).where(eq(organisationCapabilityThresholds.orgId, input.tenantId));
      await db.delete(tenantSettings).where(eq(tenantSettings.tenantId, input.tenantId));
      // Finally delete the tenant
      await db.delete(tenants).where(eq(tenants.id, input.tenantId));
      // PROD-4.1: Audit log for GDPR erasure record
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "admin.company.deleted",
        targetType: "tenant",
        targetId: input.tenantId,
        metadataJson: JSON.stringify({ deletedBy: ctx.user.id }),
      });
      return { success: true };
    }),

  // ── Feature Flags (TD-3) ───────────────────────────────────────────────
  getFeatureFlags: superUserProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return [
      {
        key: "LLM_CHECKER_ENABLED",
        label: "LLM Quality Gate",
        description: "AI-generated assessment items are passed through a multi-check quality gate before serving to participants.",
        defaultOn: true,
        enabled: isLlmCheckerEnabled(),
        category: "quality",
      },
      {
        key: "ANTI_GAMING_OUTCOME_CONDITIONAL",
        label: "Outcome-Conditional Anti-Gaming",
        description: "Stricter scrutiny for answer sequences that are suspiciously consistent with a single outcome class.",
        defaultOn: true,
        enabled: isOutcomeConditionalAntiGamingEnabled(),
        category: "integrity",
      },
      {
        key: "SAVE_AND_RESUME_ENABLED",
        label: "Save and Resume",
        description: "Participants can pause an in-progress assessment and resume within the 48-hour window.",
        defaultOn: true,
        enabled: isSaveAndResumeEnabled(),
        category: "ux",
      },
      {
        key: "VALIDATION_PHASE_ORDER_RANDOMISED",
        label: "Validation Phase Randomisation",
        description: "Validation-phase items are interleaved with adaptive items to reduce order effects and recency bias.",
        defaultOn: false,
        enabled: isValidationPhaseRandomised(),
        category: "assessment",
      },
      {
        key: "PERSONA_ADAPTATION_ENABLED",
        label: "AIL Persona Adaptation",
        description: "Assessment difficulty adapts based on detected participant persona patterns (requires 3+ prior sessions).",
        defaultOn: false,
        enabled: isPersonaAdaptationEnabled(),
        category: "assessment",
      },
      {
        key: "PERSONA_LABEL_SOFTENING_ENABLED",
        label: "Persona Label Softening",
        description: "Raw persona classification keys are replaced with participant-appropriate labels in all user-facing surfaces.",
        defaultOn: true,
        enabled: isPersonaLabelSofteningEnabled(),
        category: "ux",
      },
    ];
  }),

  // ── Platform stats ──────────────────────────────────────────────────
  stats: superUserProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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

  /**
   * Delete all assessment sessions for a user and seed a realistic completed one.
   * Used for demo/testing purposes.
   */
  seedCompletedAssessment: superUserProcedure
    .input(z.object({
      userId: z.string(),
      overallScore: z.number().min(0).max(100).default(78),
      capabilityScores: z.record(z.string(), z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Allow super_admin or hr_leader (demo seeding)
      const callerRoles = await db
        .select({ key: roles.key })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(userRoles.userId, ctx.user.id), eq(userRoles.tenantId, ctx.user.tenantId)));
      const callerKeys = callerRoles.map(r => r.key);
      if (!callerKeys.includes("super_admin") && !callerKeys.includes("hr_leader")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "HR Leader or Super Admin access required" });
      }

      // 1. Find all sessions for this user
      const existingSessions = await db
        .select({ id: assessmentSessions.id })
        .from(assessmentSessions)
        .where(eq(assessmentSessions.userId, input.userId));

      const sessionIds = existingSessions.map(s => s.id);

      // 2. Delete related records for all sessions
      if (sessionIds.length > 0) {
        await db.delete(assessmentAnswers).where(inArray(assessmentAnswers.sessionId, sessionIds));
        await db.delete(assessmentScores).where(inArray(assessmentScores.sessionId, sessionIds));
      }
      // Delete credibility/risk scores for user
      await db.delete(credibilityScores).where(eq(credibilityScores.userId, input.userId));
      await db.delete(riskScores).where(eq(riskScores.userId, input.userId));

      // 3. Delete all sessions
      await db.delete(assessmentSessions).where(eq(assessmentSessions.userId, input.userId));

      // 4. Find blueprint
      const bpRows = await db.select({ id: assessmentBlueprints.id }).from(assessmentBlueprints).orderBy(desc(assessmentBlueprints.createdAt)).limit(1);
      const blueprintId: string = bpRows[0]?.id ?? "bp-default";

      // 5. Find tenant
      const userRow = await db.select({ tenantId: users.tenantId }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!userRow.length) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      const tenantId = userRow[0].tenantId;

      // 6. Build capability scores
      const capKeys = ["ai_interaction", "ai_output_evaluation", "ai_workflow_design", "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership"];
      const defaultCaps: Record<string, number> = {
        ai_interaction: 82,
        ai_output_evaluation: 79,
        ai_workflow_design: 74,
        workforce_ai_readiness: 81,
        ai_ethics_trust: 76,
        ai_change_leadership: 80,
      };
      const capabilityScores = input.capabilityScores ?? defaultCaps;
      const capabilitySignalCounts: Record<string, number> = {};
      capKeys.forEach(k => { capabilitySignalCounts[k] = 8; });

      const scoreBreakdown = {
        overallScore: input.overallScore,
        capabilityScores,
        capabilitySignalCounts,
        signalScores: {},
        readiness: {
          state: "safe",
          label: "AI Capable",
          governanceAction: "monitor",
          governingConstraint: null,
        },
        narrative: {
          summary: "Strong AI capability profile across all six domains. Demonstrates confident, responsible AI use with particular strength in AI Interaction and Workforce AI Readiness.",
          gaps: "Some room to develop AI Workflow Design further.",
          priorities: "Focus on workflow automation and AI change leadership to reach AI Ready status.",
        },
        confidenceProfile: { overall: 0.82 },
        failureModes: { governanceFlag: false },
        contradictions: { count: 0, pairs: [] },
        contradictionProfile: { detected: 0, pairs: [] },
        governanceProfile: { score: 76, band: "strong", bypasses: 0 },
        credibilityBand: "high",
        gamingAnalysis: { score: 0.1, scrutinyLevel: "low", patterns: [] },
        roleArchetype: "hr_leader_senior",
        totalAnswers: 49,
        avgConfidence: 0.78,
        riskBand: "low",
        modelVersion: "adaptive-v2",
        llmNarrative: null,
        percentileRanks: {},
        normGroupVersion: "v1",
        classificationConfidence: { band: "high", label: "High confidence", wasDowngraded: false, caveat: null },
        targetItems: 49,
      };

      // 7. Create completed session
      const sessionId = nanoid();
      const completedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const startedAt = new Date(completedAt.getTime() - 38 * 60 * 1000); // 38 min before

      await db.insert(assessmentSessions).values({
        id: sessionId,
        tenantId,
        userId: input.userId,
        blueprintId,
        state: "completed",
        startedAt,
        completedAt,
        sessionMetadataJson: JSON.stringify({ answeredCount: 49, totalTarget: 49 }),
        normGroupVersion: "v1",
        localeCode: "en-GB",
        scoringConfigVersionAtStart: 1,
        roleArchetypeId: "hr_leader_senior",
        roleHintFreetext: "hr_leader::senior",
        createdAt: startedAt,
      });

      // 8. Build realistic signal scores from domain scores
      // Each domain score maps to its signals; we add some variance to make it realistic
      const DOMAIN_SIGNALS: Record<string, Array<{ key: string; isRisk: boolean }>> = {
        ai_interaction: [
          { key: "prompt_construction_quality", isRisk: false },
          { key: "prompt_iteration_quality", isRisk: false },
          { key: "output_direction_skill", isRisk: false },
          { key: "tool_fluency_index", isRisk: false },
        ],
        ai_output_evaluation: [
          { key: "output_evaluation_quality", isRisk: false },
          { key: "error_detection_accuracy", isRisk: false },
          { key: "fitness_for_purpose_judgement", isRisk: false },
          { key: "blind_acceptance_risk", isRisk: true },
          { key: "hallucination_acceptance_risk", isRisk: true },
          { key: "bias_detection_skill", isRisk: false },
          { key: "data_interpretation_quality", isRisk: false },
        ],
        ai_workflow_design: [
          { key: "workflow_redesign_quality", isRisk: false },
          { key: "handoff_design_quality", isRisk: false },
          { key: "human_oversight_preservation", isRisk: false },
          { key: "automation_expansion_risk", isRisk: true },
        ],
        workforce_ai_readiness: [
          { key: "capability_diagnosis_accuracy", isRisk: false },
          { key: "intervention_design_quality", isRisk: false },
          { key: "leader_advisory_quality", isRisk: false },
          { key: "generic_prescription_risk", isRisk: true },
        ],
        ai_ethics_trust: [
          { key: "ethics_under_pressure", isRisk: false },
          { key: "stakeholder_impact_awareness", isRisk: false },
          { key: "employee_transparency_advocacy", isRisk: false },
          { key: "pressure_drift_risk", isRisk: true },
          { key: "legal_vs_fair_distinction", isRisk: false },
        ],
        ai_change_leadership: [
          { key: "resistance_response_quality", isRisk: false },
          { key: "legitimate_concern_recognition", isRisk: false },
          { key: "change_pace_calibration", isRisk: false },
          { key: "dismissive_of_concern_risk", isRisk: true },
        ],
      };
      // Variance seeds for each signal position (deterministic but varied)
      const VARIANCE = [0.15, -0.10, 0.20, -0.05, 0.10, -0.15, 0.05];
      const seededSignalScores: Record<string, { sum: number; count: number }> = {};
      for (const [domain, signals] of Object.entries(DOMAIN_SIGNALS)) {
        const domainScore = (capabilityScores[domain] ?? 70) as number;
        // Convert domain score (0-100) to avg delta: (score - 50) / 25
        const baseDelta = (domainScore - 50) / 25;
        signals.forEach((sig, idx) => {
          const variance = VARIANCE[idx % VARIANCE.length];
          let delta = baseDelta + variance;
          // Risk signals: invert (positive delta = bad for risk signals)
          if (sig.isRisk) delta = -delta;
          // Clamp to reasonable range
          delta = Math.max(-1.6, Math.min(1.6, delta));
          // Store as sum/count (simulate 2 observations)
          seededSignalScores[sig.key] = { sum: parseFloat((delta * 2).toFixed(3)), count: 2 };
        });
      }

      // 8. Insert score record
      await db.insert(assessmentScores).values({
        id: nanoid(),
        sessionId,
        overallScore: input.overallScore.toFixed(2) as any,
        scoreBreakdownJson: scoreBreakdown as any,
        signalScoresJson: seededSignalScores as any,
        modelVersion: "adaptive-v2",
        scoringConfigVersion: 1,
      });

      // 9. Insert credibility score
      await db.insert(credibilityScores).values({
        id: nanoid(),
        userId: input.userId,
        assessmentSessionId: sessionId,
        credibilityScore: "0.8200" as any,
        band: "high",
        reasonJson: JSON.stringify({ overall: 0.82 }),
        modelVersion: "adaptive-v2",
      });

      // 10. Insert risk score
      await db.insert(riskScores).values({
        id: nanoid(),
        userId: input.userId,
        riskScore: "0.2000" as any,
        band: "low",
        reasonJson: JSON.stringify({ riskBand: "low" }),
      });

      return { success: true, sessionId, deletedCount: sessionIds.length };
    }),

  /**
   * Seed realistic manager-team-member links from existing users.
   * Groups users by roleFamily and assigns the first user in each group as manager.
   */
  seedManagerTeams: superUserProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const callerRoles = await db.select({ key: roles.key }).from(roles)
      .innerJoin(userRoles, eq(userRoles.roleId, roles.id))
      .where(and(eq(userRoles.userId, ctx.user.id), eq(userRoles.tenantId, ctx.user.tenantId)));
    const callerKeys = callerRoles.map(r => r.key);
    if (!callerKeys.some(k => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(k))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    // Delete existing links for this tenant's users
    const tenantUsers = await db.select({ id: users.id, roleFamily: users.roleFamily, jobFunction: users.jobFunction })
      .from(users).where(eq(users.tenantId, ctx.user.tenantId));
    const tenantUserIds = tenantUsers.map(u => u.id);
    if (tenantUserIds.length > 0) {
      for (const uid of tenantUserIds) {
        await db.delete(managerTeamMembers).where(eq(managerTeamMembers.managerId, uid));
      }
    }
    // Group by roleFamily
    const groups: Record<string, string[]> = {};
    for (const u of tenantUsers) {
      const rf = u.roleFamily ?? u.jobFunction ?? "general";
      if (!groups[rf]) groups[rf] = [];
      groups[rf].push(u.id);
    }
    let totalLinks = 0;
    for (const [, memberIds] of Object.entries(groups)) {
      if (memberIds.length < 2) continue;
      const managerId = memberIds[0];
      for (const memberId of memberIds.slice(1)) {
        await db.insert(managerTeamMembers).values({
          id: nanoid(),
          managerId,
          memberId,
        }).onDuplicateKeyUpdate({ set: { managerId } });
        totalLinks++;
      }
    }
    return { success: true, totalLinks, groups: Object.keys(groups).length };
  }),

  // ── Entitlements ──────────────────────────────────────────────────────────
  // Founder-set, permanent until changed via backoffice. Single source of truth for feature access.
  setEntitlements: superUserProcedure
    .input(z.object({
      tenantId: z.string(),
      strategyCompany: z.boolean(),
      strategyReward: z.boolean(),
      assessment: z.boolean(),
      // assessmentPaid is normally flipped by Stripe webhook; this allows manual override for backoffice
      assessmentPaid: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updatePayload: Record<string, unknown> = {
        entitlementStrategyCompany: input.strategyCompany,
        entitlementStrategyReward: input.strategyReward,
        entitlementAssessment: input.assessment,
      };
      if (input.assessmentPaid !== undefined) {
        updatePayload.entitlementAssessmentPaid = input.assessmentPaid;
      }
      await db.update(tenants).set(updatePayload).where(eq(tenants.id, input.tenantId));
      return { success: true };
    }),

  // ── Commerce instrumentation ─────────────────────────────────────────────
  getCommerceMetrics: superUserProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [totalRow] = await db.select({ n: count() }).from(tenants);
    const total = totalRow?.n ?? 0;

    const [freeRow] = await db
      .select({ n: count() })
      .from(tenants)
      .where(and(eq(tenants.entitlementAssessment, true), eq(tenants.entitlementAssessmentPaid, false)));
    const freeTier = freeRow?.n ?? 0;

    const [paidRow] = await db
      .select({ n: count() })
      .from(tenants)
      .where(eq(tenants.entitlementAssessmentPaid, true));
    const paidSubscribers = paidRow?.n ?? 0;

    const [activeRow] = await db
      .select({ n: count() })
      .from(tenants)
      .where(and(
        eq(tenants.entitlementAssessmentPaid, true),
        sql`${tenants.stripeSubscriptionStatus} IN ('active', 'trialing')`
      ));
    const activeSubscriptions = activeRow?.n ?? 0;

    const [cancelRow] = await db
      .select({ n: count() })
      .from(tenants)
      .where(and(eq(tenants.entitlementAssessmentPaid, true), eq(tenants.stripeCancelAtPeriodEnd, true)));
    const pendingCancellations = cancelRow?.n ?? 0;

    const [graceRow] = await db
      .select({ n: count() })
      .from(tenants)
      .where(and(
        eq(tenants.entitlementAssessmentPaid, false),
        sql`${tenants.paidAccessGraceUntil} IS NOT NULL AND ${tenants.paidAccessGraceUntil} > NOW()`
      ));
    const inGracePeriod = graceRow?.n ?? 0;

    const [monthlyRow] = await db
      .select({ n: count() })
      .from(tenants)
      .where(and(eq(tenants.entitlementAssessmentPaid, true), eq(tenants.stripePriceKey, "individualMonthly")));
    const monthlyPlan = monthlyRow?.n ?? 0;

    const [annualRow] = await db
      .select({ n: count() })
      .from(tenants)
      .where(and(eq(tenants.entitlementAssessmentPaid, true), eq(tenants.stripePriceKey, "individualAnnual")));
    const annualPlan = annualRow?.n ?? 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPaid = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        stripeSubscriptionStatus: tenants.stripeSubscriptionStatus,
        stripePriceKey: tenants.stripePriceKey,
        stripeCurrentPeriodEnd: tenants.stripeCurrentPeriodEnd,
        stripeCancelAtPeriodEnd: tenants.stripeCancelAtPeriodEnd,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .where(and(
        eq(tenants.entitlementAssessmentPaid, true),
        sql`${tenants.createdAt} >= ${thirtyDaysAgo}`
      ))
      .orderBy(desc(tenants.createdAt))
      .limit(20);

    return {
      total,
      freeTier,
      paidSubscribers,
      activeSubscriptions,
      pendingCancellations,
      inGracePeriod,
      monthlyPlan,
      annualPlan,
      recentPaid,
      estimatedMrr: (monthlyPlan * 50) + (annualPlan * 40),
    };
  }),
});
