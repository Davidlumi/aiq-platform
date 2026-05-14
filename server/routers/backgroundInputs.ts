/**
 * Background Input Section — tRPC router
 *
 * Handles the 8-section pre-work + session wizard for the AiQ strategy diagnostic.
 * Sections A–D + H are editable by the CPO in pre-work mode.
 * Sections E–G are session-only, editable only when a platform_super_admin is present.
 * Facilitator notes are stored separately and visible only to platform_super_admin.
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { ailOrgContext } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

// ── Zod schemas for each section ─────────────────────────────────────────────

const SectionASchema = z.object({
  companyName: z.string().max(200).optional(),
  sector: z.string().optional(),
  subSector: z.string().optional(),
  headcountBand: z.enum(["lt500", "500_5k", "5k_25k", "25k_plus"]).optional(),
  geographies: z.array(z.string()).optional(),
  orgType: z.string().optional(),
  primaryRegulator: z.string().optional(),
});

const SectionBSchema = z.object({
  hrTeamSize: z.number().int().min(0).max(9999).optional(),
  hrSubFunctions: z.array(z.string()).optional(),
  hrReportsTo: z.enum(["ceo", "cfo", "coo", "board", "other"]).optional(),
  hrReportsToOther: z.string().max(100).optional(),
  hrInfluence: z.string().max(100).optional(),
  hrBudgetOwnership: z.enum(["full", "partial", "none"]).optional(),
});

const SectionCSchema = z.object({
  hrisSystem: z.string().max(100).optional(),
  atsSystem: z.string().max(100).optional(),
  lmsSystem: z.string().max(100).optional(),
  payrollSystem: z.string().max(100).optional(),
  existingAiTools: z.array(z.object({
    name: z.string().max(100),
    useCase: z.string().max(200).optional(),
    deployedSince: z.string().max(20).optional(),
  })).optional(),
  dataQualityRating: z.enum(["poor", "fair", "good", "excellent"]).optional(),
  hasDataWarehouse: z.boolean().optional(),
});

const SectionDSchema = z.object({
  annualHires: z.number().int().min(0).optional(),
  annualHiresIsEstimate: z.boolean().optional(),
  adminTimePerHireHours: z.number().min(0).optional(),
  adminTimeIsEstimate: z.boolean().optional(),
  hrBudgetGbp: z.number().min(0).optional(),
  hrBudgetIsEstimate: z.boolean().optional(),
  loadedFteCostGbp: z.number().min(0).optional(),
  loadedFteIsEstimate: z.boolean().optional(),
  aiInvestmentEnvelopeGbp: z.number().min(0).optional(),
  aiEnvelopeIsEstimate: z.boolean().optional(),
  voluntaryAttritionPct: z.number().min(0).max(100).optional(),
  attritionIsEstimate: z.boolean().optional(),
  timeToFillDays: z.number().min(0).optional(),
  timeToFillIsEstimate: z.boolean().optional(),
});

const SectionESchema = z.object({
  ambitionTier: z.enum(["conservative", "pragmatic", "innovator", "transformative"]).optional(),
  hrPosture: z.enum(["following", "pacing", "leading", "transformative"]).optional(),
  timeHorizonMonths: z.union([z.number().int().min(6).max(60), z.string()]).optional(),
  riskAppetite: z.enum(["conservative", "balanced", "aggressive"]).optional(),
  successNarrative: z.string().max(1000).optional(),
  topPainPoints: z.array(z.string().max(200)).max(3).optional(),
  strategicPriorities: z.array(z.string().max(200)).max(5).optional(),
});

const SectionFSchema = z.object({
  cultureDescriptors: z.array(z.string().max(100)).max(3).optional(),
  nonNegotiables: z.array(z.string().max(200)).max(5).optional(),
  changeReadiness: z.string().max(100).optional(),
  decisionMakingStyle: z.string().max(100).optional(),
  ceoStyle: z.string().max(100).optional(),
  cfoStyle: z.string().max(100).optional(),
});

const DomainRatingSchema = z.object({
  score: z.number().min(0).max(10),  // 0-10 scale per brief
  rationaleNotes: z.string().max(500).optional(),
});

const SectionGSchema = z.object({
  ai_interaction: DomainRatingSchema.optional(),
  ai_output_evaluation: DomainRatingSchema.optional(),
  ai_workflow_design: DomainRatingSchema.optional(),
  workforce_ai_readiness: DomainRatingSchema.optional(),
  ai_ethics_trust: DomainRatingSchema.optional(),
  ai_change_leadership: DomainRatingSchema.optional(),
  overallScore: z.number().min(0).max(10).optional(),
  maturityLabel: z.string().max(50).optional(),
});

const SectionHSchema = z.object({
  keyApprovers: z.array(z.object({
    name: z.string().max(100),
    role: z.string().max(100),
    influence: z.enum(["high", "medium", "low"]).optional(),
  })).max(10).optional(),
  aiLiteracyLevel: z.enum(["low", "mixed", "moderate", "high"]).optional(),
  languageResonates: z.array(z.string().max(100)).max(5).optional(),
  keyStakeholderConcerns: z.array(z.string().max(200)).max(5).optional(),
  boardAiInterest: z.enum(["none", "low", "moderate", "high"]).optional(),
});

const BackgroundInputsSchema = z.object({
  sectionA: SectionASchema.optional(),
  sectionB: SectionBSchema.optional(),
  sectionC: SectionCSchema.optional(),
  sectionD: SectionDSchema.optional(),
  sectionE: SectionESchema.optional(),
  sectionF: SectionFSchema.optional(),
  sectionH: SectionHSchema.optional(),
});

const FacilitatorNoteSchema = z.object({
  sectionId: z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "general"]),
  content: z.string().max(5000),
});

// ── Helper: get or create ailOrgContext row ───────────────────────────────────

async function getOrCreateOrgContext(tenantId: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

  const [existing] = await db
    .select()
    .from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, tenantId))
    .limit(1);

  if (existing) return { db, row: existing };

  const id = randomUUID();
  await db.insert(ailOrgContext).values({
    id,
    tenantId,
    sector: "other",
  });
  const [created] = await db
    .select()
    .from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, tenantId))
    .limit(1);
  return { db, row: created };
}

// ── Router ────────────────────────────────────────────────────────────────────

export const backgroundInputsRouter = router({

  /**
   * Get all background inputs + facilitator notes for the current tenant.
   * Facilitator notes are only returned if the caller is platform_super_admin.
   */
  getInputs: protectedProcedure.query(async ({ ctx }) => {
    const { row } = await getOrCreateOrgContext(ctx.user.tenantId);
    const isSuperAdmin = (ctx.user as any).role === "platform_super_admin";

    const backgroundInputs = row.backgroundInputsJson
      ? JSON.parse(row.backgroundInputsJson)
      : {};

    const capabilityAssessment = row.capabilityAssessmentJson
      ? JSON.parse(row.capabilityAssessmentJson)
      : {};

    const facilitatorNotes = isSuperAdmin && row.facilitatorNotesJson
      ? JSON.parse(row.facilitatorNotesJson)
      : {};

    return {
      backgroundInputs,
      capabilityAssessment,
      facilitatorNotes: isSuperAdmin ? facilitatorNotes : null,
      preworkCompletedAt: row.preworkCompletedAt,
      sessionCompletedAt: row.sessionCompletedAt,
      draftGenerationState: row.draftGenerationState ?? "none",
      isSuperAdmin,
    };
  }),

  /**
   * Save one or more sections of background inputs.
   * Sections E, F are session-only — only platform_super_admin can write them.
   * Section G (capability assessment) is stored separately.
   */
  saveInputs: protectedProcedure
    .input(z.object({
      sections: BackgroundInputsSchema,
      capabilityAssessment: SectionGSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const isSuperAdmin = (ctx.user as any).role === "platform_super_admin";
      const { db, row } = await getOrCreateOrgContext(ctx.user.tenantId);

      // Gate session-only sections
      if ((input.sections.sectionE || input.sections.sectionF) && !isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sections E and F are only editable during a facilitated session.",
        });
      }

      // Merge with existing
      const existing = row.backgroundInputsJson ? JSON.parse(row.backgroundInputsJson) : {};
      const merged = { ...existing };
      for (const [key, val] of Object.entries(input.sections)) {
        if (val !== undefined) {
          merged[key] = { ...(merged[key] ?? {}), ...val };
        }
      }

      const updates: Record<string, unknown> = {
        backgroundInputsJson: JSON.stringify(merged),
      };

      // Capability assessment stored separately
      if (input.capabilityAssessment) {
        const existingCap = row.capabilityAssessmentJson
          ? JSON.parse(row.capabilityAssessmentJson)
          : {};
        updates.capabilityAssessmentJson = JSON.stringify({
          ...existingCap,
          ...input.capabilityAssessment,
        });
      }

      // Mirror key fields into top-level ailOrgContext columns for LLM context
      if (input.sections.sectionA) {
        const a = input.sections.sectionA;
        if (a.sector) updates.sector = a.sector;
        if (a.subSector) updates.subSector = a.subSector;
        if (a.orgType) updates.orgType = a.orgType;
        if (a.primaryRegulator) updates.primaryRegulator = a.primaryRegulator;
        if (a.headcountBand) {
          const bandMap: Record<string, number> = {
            "lt500": 250, "500_5k": 2500, "5k_25k": 15000, "25k_plus": 50000,
          };
          updates.headcount = bandMap[a.headcountBand] ?? null;
        }
      }
      if (input.sections.sectionB) {
        const b = input.sections.sectionB;
        if (b.hrInfluence) updates.hrInfluence = b.hrInfluence;
      }
      if (input.sections.sectionE) {
        const e = input.sections.sectionE;
        if (e.riskAppetite) updates.riskAppetiteOverall = e.riskAppetite;
        if (e.strategicPriorities)
          updates.strategicPrioritiesJson = JSON.stringify(e.strategicPriorities);
      }
      if (input.sections.sectionF) {
        const f = input.sections.sectionF;
        if (f.decisionMakingStyle) updates.decisionMakingStyle = f.decisionMakingStyle;
        if (f.ceoStyle) updates.ceoStyle = f.ceoStyle;
        if (f.cfoStyle) updates.cfoStyle = f.cfoStyle;
      }

      await db.update(ailOrgContext)
        .set(updates as any)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

      return { ok: true };
    }),

  /**
   * Mark pre-work as complete. Validates required fields in A–D + H.
   */
  completePrework: protectedProcedure.mutation(async ({ ctx }) => {
    const { db, row } = await getOrCreateOrgContext(ctx.user.tenantId);
    const inputs = row.backgroundInputsJson ? JSON.parse(row.backgroundInputsJson) : {};

    // Minimal required fields
    const missing: string[] = [];
    if (!inputs.sectionA?.sector) missing.push("Industry (Section A)");
    if (!inputs.sectionA?.headcountBand) missing.push("Organisation size (Section A)");
    if (!inputs.sectionB?.hrTeamSize && inputs.sectionB?.hrTeamSize !== 0)
      missing.push("HR team size (Section B)");

    if (missing.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Please complete required fields before finishing pre-work: ${missing.join(", ")}`,
      });
    }

    await db.update(ailOrgContext)
      .set({ preworkCompletedAt: new Date() })
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

    return { ok: true };
  }),

  /**
   * Mark session as complete. Only platform_super_admin can call this.
   */
  completeSession: protectedProcedure.mutation(async ({ ctx }) => {
    if ((ctx.user as any).role !== "platform_super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only facilitators can complete a session." });
    }
    const { db } = await getOrCreateOrgContext(ctx.user.tenantId);
    await db.update(ailOrgContext)
      .set({ sessionCompletedAt: new Date() })
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
    return { ok: true };
  }),

  /**
   * Save a facilitator note for a specific section. platform_super_admin only.
   */
  saveFacilitatorNote: protectedProcedure
    .input(FacilitatorNoteSchema)
    .mutation(async ({ ctx, input }) => {
      if ((ctx.user as any).role !== "platform_super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only facilitators can add notes." });
      }
      const { db, row } = await getOrCreateOrgContext(ctx.user.tenantId);
      const existing = row.facilitatorNotesJson ? JSON.parse(row.facilitatorNotesJson) : {};
      existing[input.sectionId] = {
        content: input.content,
        updatedAt: new Date().toISOString(),
        tagged_private: true,
      };
      await db.update(ailOrgContext)
        .set({ facilitatorNotesJson: JSON.stringify(existing) })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { ok: true };
    }),

  /**
   * Update draft generation state. platform_super_admin only.
   */
  setDraftState: protectedProcedure
    .input(z.object({
      state: z.enum(["none", "generating", "initial_draft", "curated"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if ((ctx.user as any).role !== "platform_super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only facilitators can update draft state." });
      }
      const { db } = await getOrCreateOrgContext(ctx.user.tenantId);
      await db.update(ailOrgContext)
        .set({ draftGenerationState: input.state })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { ok: true };
    }),

  /**
   * Get the draft generation state for the current tenant (polling endpoint).
   */
  getDraftState: protectedProcedure.query(async ({ ctx }) => {
    const { row } = await getOrCreateOrgContext(ctx.user.tenantId);
    return {
      draftGenerationState: row.draftGenerationState ?? "none",
      preworkCompletedAt: row.preworkCompletedAt,
      sessionCompletedAt: row.sessionCompletedAt,
    };
  }),
});
