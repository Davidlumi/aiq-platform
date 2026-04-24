/**
 * Organisation Router — C2: Organisation Context
 * Provides CRUD for organisations, profiles, and capability thresholds.
 * All operations are scoped to the current user's tenantId.
 */
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  organisations,
  organisationProfiles,
  organisationCapabilityThresholds,
  auditLogs,
} from "../../drizzle/schema";
import { nanoid } from "nanoid";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function assertOrgBelongsToTenant(orgId: string, tenantId: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  const [org] = await db
    .select({ id: organisations.id })
    .from(organisations)
    .where(and(eq(organisations.id, orgId), eq(organisations.tenantId, tenantId)))
    .limit(1);
  if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organisation not found" });
  return org;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const organisationRouter = router({
  // C2.2a: List organisations for the current tenant
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const orgs = await db
      .select()
      .from(organisations)
      .where(eq(organisations.tenantId, tenantId));
    return orgs;
  }),

  // C2.2a: Get a single organisation with its profile
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [org] = await db
        .select()
        .from(organisations)
        .where(and(eq(organisations.id, input.id), eq(organisations.tenantId, tenantId)))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organisation not found" });

      const [profile] = await db
        .select()
        .from(organisationProfiles)
        .where(eq(organisationProfiles.organisationId, input.id))
        .limit(1);

      const thresholds = await db
        .select()
        .from(organisationCapabilityThresholds)
        .where(eq(organisationCapabilityThresholds.orgId, input.id));

      return { ...org, profile: profile ?? null, thresholds };
    }),

  // C2.2a: Create a new organisation
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(200),
        slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const id = randomUUID();
      await db.insert(organisations).values({
        id,
        tenantId,
        name: input.name,
        slug: input.slug,
      });
      return { id };
    }),

  // C2.2a: Update organisation profile (sector, AI adoption stage, risk appetite, etc.)
  updateProfile: protectedProcedure
    .input(
      z.object({
        organisationId: z.string(),
        sector: z.string().optional(),
        aiAdoptionStage: z.enum(["exploring", "piloting", "scaling", "embedded"]).optional(),
        riskAppetite: z.enum(["conservative", "moderate", "progressive"]).optional(),
        governanceRegime: z.string().optional(),
        priorityCapabilities: z.array(z.string()).optional(),
        aiToolsJson: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await assertOrgBelongsToTenant(input.organisationId, tenantId);

      const [existing] = await db
        .select({ id: organisationProfiles.id })
        .from(organisationProfiles)
        .where(eq(organisationProfiles.organisationId, input.organisationId))
        .limit(1);

      const profileData = {
        organisationId: input.organisationId,
        sector: input.sector,
        aiAdoptionStage: input.aiAdoptionStage,
        riskAppetite: input.riskAppetite,
        governanceRegime: input.governanceRegime,
        priorityCapabilities: input.priorityCapabilities,
        aiToolsJson: input.aiToolsJson,
      };

      if (existing) {
        await db
          .update(organisationProfiles)
          .set(profileData)
          .where(eq(organisationProfiles.id, existing.id));
      } else {
        await db.insert(organisationProfiles).values({ id: randomUUID(), ...profileData } as typeof organisationProfiles.$inferInsert);
      }
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId,
        actorUserId: ctx.user.id,
        action: "config.organisation_profile.updated",
        targetType: "organisation_profile",
        targetId: input.organisationId,
        metadataJson: JSON.stringify({
          fields: Object.keys(input).filter(k => k !== "organisationId"),
          operation: existing ? "update" : "create",
        }),
      });
      return { ok: true };
    }),

  // S10.3: Upsert capability threshold override for an organisation
  upsertThreshold: protectedProcedure
    .input(
      z.object({
        organisationId: z.string(),
        capability: z.string(),
        archetypeId: z.string().optional(),
        minimumSafeThreshold: z.number().int().min(0).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await assertOrgBelongsToTenant(input.organisationId, tenantId);

      const [existing] = await db
        .select({ id: organisationCapabilityThresholds.id })
        .from(organisationCapabilityThresholds)
        .where(
          and(
            eq(organisationCapabilityThresholds.orgId, input.organisationId),
            eq(organisationCapabilityThresholds.capability, input.capability)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(organisationCapabilityThresholds)
          .set({ minimumSafeThreshold: input.minimumSafeThreshold })
          .where(eq(organisationCapabilityThresholds.id, existing.id));
      } else {
        await db.insert(organisationCapabilityThresholds).values({
          id: randomUUID(),
          orgId: input.organisationId,
          archetypeId: input.archetypeId ?? "default",
          capability: input.capability,
          minimumSafeThreshold: input.minimumSafeThreshold,
        });
      }
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId,
        actorUserId: ctx.user.id,
        action: "config.capability_threshold.upserted",
        targetType: "capability_threshold",
        targetId: input.organisationId,
        metadataJson: JSON.stringify({
          capability: input.capability,
          archetypeId: input.archetypeId ?? "default",
          minimumSafeThreshold: input.minimumSafeThreshold,
          operation: existing ? "update" : "create",
        }),
      });
      return { ok: true };
    }),

  // C2.2b: Get the organisation context for a session
  getSessionContext: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Returns the org profile linked to the session for context-aware scoring
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { assessmentSessions } = await import("../../drizzle/schema");
      const [session] = await db
        .select({ organisationId: assessmentSessions.organisationId })
        .from(assessmentSessions)
        .where(
          and(
            eq(assessmentSessions.id, input.sessionId),
            eq(assessmentSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!session?.organisationId) return null;

      const [profile] = await db
        .select()
        .from(organisationProfiles)
        .where(eq(organisationProfiles.organisationId, session.organisationId))
        .limit(1);

      return profile ?? null;
    }),
});
