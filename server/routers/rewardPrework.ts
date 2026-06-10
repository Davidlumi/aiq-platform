/**
 * Reward Pre-work router
 *
 * Function-specific Stage 1 pre-work for Reward mode.
 * Procedures:
 *   get           — fetch current pre-work (any authed user in reward tenant)
 *   save          — upsert fields (autosave on blur)
 *   complete      — mark pre-work as completed (unlocks Stage 2)
 *   reassess      — start a re-assessment (increments counter, clears completedAt)
 *   getStatus     — returns { companyProfileComplete, preworkComplete, canStart }
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { strategyRewardProcedure as protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { companyProfile, rewardPrework } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const RewardPreworkSaveSchema = z.object({
  // Block A
  rewardFunctionSize: z.number().int().positive().optional(),
  rewardFunctionMaturityRating: z.number().int().min(1).max(4).optional(),
  aiMaturityInRewardToday: z.number().int().min(1).max(4).optional(),
  rewardAiAmbition: z.number().int().min(1).max(4).optional(),
  // Block B
  payEquityCapability: z.string().max(50).optional(),
  payStructureMaturity: z.string().max(50).optional(),
  ukGenderPayGapStatus: z.string().max(50).optional(),
  pensionSchemeArchitecture: z.string().max(50).optional(),
  // Block C
  externalCompDataSources: z.array(z.string()).optional(),
  aiToolsCurrentlyInRewardUse: z.array(z.string()).optional(),
  compManagementPlatform: z.string().max(50).optional(),
  unionWorksCouncilCoverage: z.string().max(50).optional(),
  // Block D
  primaryTriggerForRewardAiStrategy: z.string().max(50).optional(),
  topRewardPrioritiesNext12Months: z.array(z.string()).max(3, "Maximum 3 priorities").optional(),
  strategicTimeline: z.string().max(50).optional(),
  // Block E
  existingProgrammesToCoexistWith: z.array(z.string()).optional(),
  // Block F (conditional)
  aiTalentRetentionConcern: z.string().max(50).optional(),
  recentRemunerationVoteConcerns: z.string().max(50).optional(),
  nationalLivingWageExposure: z.string().max(50).optional(),
});

// ── Router ────────────────────────────────────────────────────────────────────

export const rewardPreworkRouter = router({
  /** Check whether Company Profile is complete and pre-work can start */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    const [profile] = await db
      .select({ isCompleted: companyProfile.isCompleted, completedAt: companyProfile.completedAt })
      .from(companyProfile)
      .where(eq(companyProfile.tenantId, tenantId));

    const [prework] = await db
      .select({ isCompleted: rewardPrework.isCompleted })
      .from(rewardPrework)
      .where(eq(rewardPrework.tenantId, tenantId));

    const companyProfileComplete = (profile?.isCompleted ?? 0) === 1;
    const preworkComplete = (prework?.isCompleted ?? 0) === 1;

    // D9 gate: pre-work cannot start until Company Profile is complete
    const canStart = companyProfileComplete;
    const canStartMessage = companyProfileComplete
      ? null
      : "Company Profile must be completed by an admin before Reward Pre-work can begin.";

    // 12-month reassessment timer: flag if profile was completed more than 12 months ago
    const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;
    const profileCompletedAt = profile?.completedAt ?? null;
    const isDueReassessment =
      companyProfileComplete &&
      profileCompletedAt !== null &&
      Date.now() - profileCompletedAt > TWELVE_MONTHS_MS;

    return {
      companyProfileComplete,
      preworkComplete,
      canStart,
      canStartMessage,
      isDueReassessment,
      profileCompletedAt,
    };
  }),

  /** Fetch current reward pre-work for this tenant */
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const [prework] = await db
      .select()
      .from(rewardPrework)
      .where(eq(rewardPrework.tenantId, ctx.user.tenantId));
    return prework ?? null;
  }),

  /** Autosave: upsert pre-work fields */
  save: protectedProcedure
    .input(RewardPreworkSaveSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;
      const now = Date.now();

      const [existing] = await db
        .select({ tenantId: rewardPrework.tenantId })
        .from(rewardPrework)
        .where(eq(rewardPrework.tenantId, tenantId));

      const fields = { ...input, updatedAt: now };

      if (existing) {
        await db
          .update(rewardPrework)
          .set(fields)
          .where(eq(rewardPrework.tenantId, tenantId));
      } else {
        await db.insert(rewardPrework).values({
          tenantId,
          userId: ctx.user.id,
          ...fields,
        });
      }

      return { ok: true };
    }),

  /** Mark pre-work as completed — validates required fields */
  complete: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;
    const now = Date.now();

    // Check company profile is complete first
    const [profile] = await db
      .select({ isCompleted: companyProfile.isCompleted })
      .from(companyProfile)
      .where(eq(companyProfile.tenantId, tenantId));

    if (!profile || profile.isCompleted !== 1) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Company Profile must be completed before finalising Reward Pre-work.",
      });
    }

    const [prework] = await db
      .select()
      .from(rewardPrework)
      .where(eq(rewardPrework.tenantId, tenantId));

    if (!prework) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Reward Pre-work must be saved before completing.",
      });
    }

    // Validate required fields
    const requiredFields: (keyof typeof prework)[] = [
      "rewardFunctionSize",
      "rewardFunctionMaturityRating",
      "aiMaturityInRewardToday",
      "rewardAiAmbition",
      "payEquityCapability",
      "payStructureMaturity",
      "ukGenderPayGapStatus",
      "pensionSchemeArchitecture",
      "externalCompDataSources",
      "aiToolsCurrentlyInRewardUse",
      "compManagementPlatform",
      "unionWorksCouncilCoverage",
      "primaryTriggerForRewardAiStrategy",
      "topRewardPrioritiesNext12Months",
      "strategicTimeline",
    ];

    const missing = requiredFields.filter((f) => prework[f] == null);
    if (missing.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    await db
      .update(rewardPrework)
      .set({ isCompleted: 1, completedAt: now, updatedAt: now })
      .where(eq(rewardPrework.tenantId, tenantId));

    return { ok: true };
  }),

  /** Start a re-assessment: increment counter, clear completedAt */
  reassess: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;
    const now = Date.now();

    const [prework] = await db
      .select({ reassessmentCount: rewardPrework.reassessmentCount })
      .from(rewardPrework)
      .where(eq(rewardPrework.tenantId, tenantId));

    if (!prework) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No pre-work found to re-assess." });
    }

    await db
      .update(rewardPrework)
      .set({
        isCompleted: 0,
        completedAt: null,
        reassessmentCount: (prework.reassessmentCount ?? 0) + 1,
        lastReassessedAt: now,
        updatedAt: now,
      })
      .where(eq(rewardPrework.tenantId, tenantId));

    return { ok: true, reassessmentCount: (prework.reassessmentCount ?? 0) + 1 };
  }),
});
