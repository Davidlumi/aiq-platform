/**
 * Reward Initiatives router — Stage 5
 *
 * Procedures:
 *   getRecommendations  — run/cache engine, return full recommendation list
 *   getPortfolio        — fetch current portfolio (selected + custom + dismissed)
 *   addToPortfolio      — add a library initiative to portfolio
 *   removeFromPortfolio — remove a library initiative from portfolio
 *   dismiss             — dismiss a library initiative with reason
 *   undismiss           — undo a dismissal
 *   addCustom           — add a custom initiative
 *   editCustom          — edit a custom initiative
 *   removeCustom        — remove a custom initiative
 *   complete            — mark Stage 5 as complete (gate for Stage 6)
 *   getStatus           — returns { preworkComplete, portfolioComplete, canStart }
 */

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  companyProfile,
  rewardPrework,
  rewardInitiativePortfolio,
  rewardCustomInitiative,
  rewardRecommendationRun,
} from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import {
  runRewardRecommendationEngine,
  buildEngineInputs,
} from "../services/rewardRecommendationEngine";
import { REWARD_INITIATIVE_IDS } from "../../shared/rewardInitiativeLibrary";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const CustomInitiativeSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  subDomain: z.string().max(50),
  phase: z.enum(["Foundation", "Build", "Optimise"]),
  complexity: z.enum(["Low", "Medium", "High", "Highest"]),
  valueLow: z.number().int().min(0),
  valueHigh: z.number().int().min(0),
  costLow: z.number().int().min(0).optional(),
  costHigh: z.number().int().min(0).optional(),
  principlesAlignment: z.string().max(500).optional(),
  risks: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

const DismissSchema = z.object({
  initiativeId: z.string(),
  reason: z.enum([
    "already_doing_this",
    "not_relevant_to_our_context",
    "too_complex_for_now",
    "budget_constraints",
    "other",
  ]),
  freeText: z.string().max(300).optional(),
});

// ─── Helper: get or create portfolio row ─────────────────────────────────────

async function getOrCreatePortfolio(db: Awaited<ReturnType<typeof getDb>>, tenantId: string, userId: string) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  const [existing] = await db
    .select()
    .from(rewardInitiativePortfolio)
    .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

  if (existing) return existing;

  await db.insert(rewardInitiativePortfolio).values({
    tenantId,
    userId,
    selectedInitiativesJson: [],
    dismissedInitiativesJson: [],
    isCompleted: 0,
    updatedAt: Date.now(),
  });

  const [created] = await db
    .select()
    .from(rewardInitiativePortfolio)
    .where(eq(rewardInitiativePortfolio.tenantId, tenantId));
  return created!;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const rewardInitiativesRouter = router({

  /** Check whether Stage 5 can start (prework must be complete) */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    const [prework] = await db
      .select({ isCompleted: rewardPrework.isCompleted, completedAt: rewardPrework.completedAt })
      .from(rewardPrework)
      .where(eq(rewardPrework.tenantId, tenantId));

    const preworkComplete = Boolean(prework?.isCompleted);

    const [portfolio] = await db
      .select({ isCompleted: rewardInitiativePortfolio.isCompleted })
      .from(rewardInitiativePortfolio)
      .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

    const portfolioComplete = Boolean(portfolio?.isCompleted);

    return {
      canStart: preworkComplete,
      canStartMessage: preworkComplete
        ? null
        : "Complete the Reward Pre-work (Stage 1) before building your initiative portfolio.",
      preworkComplete,
      portfolioComplete,
    };
  }),

  /** Run the recommendation engine (with cache) and return results */
  getRecommendations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    // Fetch Company Profile
    const [profile] = await db
      .select()
      .from(companyProfile)
      .where(eq(companyProfile.tenantId, tenantId));

    if (!profile?.isCompleted) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Company Profile must be completed before running recommendations.",
      });
    }

    // Fetch Reward Pre-work
    const [prework] = await db
      .select()
      .from(rewardPrework)
      .where(eq(rewardPrework.tenantId, tenantId));

    if (!prework?.isCompleted) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Reward Pre-work must be completed before running recommendations.",
      });
    }

    // Build inputs and check cache
    const inputs = buildEngineInputs(
      profile as Record<string, unknown>,
      prework as Record<string, unknown>
    );

    // Check for cached run with same inputs hash
    const { createHash } = await import("crypto");
    const inputsHash = createHash("sha256").update(JSON.stringify(inputs)).digest("hex");

    const [cachedRun] = await db
      .select()
      .from(rewardRecommendationRun)
      .where(
        and(
          eq(rewardRecommendationRun.tenantId, tenantId),
          eq(rewardRecommendationRun.inputsHash, inputsHash)
        )
      );

    if (cachedRun?.recommendationsJson) {
      return cachedRun.recommendationsJson as ReturnType<typeof runRewardRecommendationEngine>;
    }

    // Run engine
    const output = runRewardRecommendationEngine(inputs);

    // Cache result
    await db.insert(rewardRecommendationRun).values({
      id: randomUUID(),
      tenantId,
      userId: ctx.user.id,
      ranAt: Date.now(),
      inputsHash,
      recommendationsJson: output as unknown as Record<string, unknown>,
      engineVersion: output.engineVersion,
    });

    return output;
  }),

  /** Get current portfolio state */
  getPortfolio: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    const portfolio = await getOrCreatePortfolio(db, tenantId, ctx.user.id);

    const customInitiatives = await db
      .select()
      .from(rewardCustomInitiative)
      .where(eq(rewardCustomInitiative.tenantId, tenantId));

    return {
      selectedInitiatives: portfolio.selectedInitiativesJson ?? [],
      dismissedInitiatives: portfolio.dismissedInitiativesJson ?? [],
      customInitiatives,
      isCompleted: Boolean(portfolio.isCompleted),
      completedAt: portfolio.completedAt,
    };
  }),

  /** Add a library initiative to the portfolio */
  addToPortfolio: protectedProcedure
    .input(z.object({ initiativeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;

      if (!REWARD_INITIATIVE_IDS.includes(input.initiativeId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown initiative ID." });
      }

      const portfolio = await getOrCreatePortfolio(db, tenantId, ctx.user.id);
      const selected = portfolio.selectedInitiativesJson ?? [];

      if (selected.includes(input.initiativeId)) return { success: true }; // idempotent

      // Remove from dismissed if present
      const dismissed = (portfolio.dismissedInitiativesJson ?? []).filter(
        (d) => d.initiativeId !== input.initiativeId
      );

      await db
        .update(rewardInitiativePortfolio)
        .set({
          selectedInitiativesJson: [...selected, input.initiativeId],
          dismissedInitiativesJson: dismissed,
          updatedAt: Date.now(),
        })
        .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

      return { success: true };
    }),

  /** Remove a library initiative from the portfolio */
  removeFromPortfolio: protectedProcedure
    .input(z.object({ initiativeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;

      const portfolio = await getOrCreatePortfolio(db, tenantId, ctx.user.id);
      const selected = (portfolio.selectedInitiativesJson ?? []).filter(
        (id) => id !== input.initiativeId
      );

      await db
        .update(rewardInitiativePortfolio)
        .set({ selectedInitiativesJson: selected, updatedAt: Date.now() })
        .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

      return { success: true };
    }),

  /** Dismiss a library initiative with a reason */
  dismiss: protectedProcedure
    .input(DismissSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;

      if (!REWARD_INITIATIVE_IDS.includes(input.initiativeId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown initiative ID." });
      }

      const portfolio = await getOrCreatePortfolio(db, tenantId, ctx.user.id);

      // Remove from selected
      const selected = (portfolio.selectedInitiativesJson ?? []).filter(
        (id) => id !== input.initiativeId
      );

      // Add to dismissed (replace if already dismissed)
      const dismissed = [
        ...(portfolio.dismissedInitiativesJson ?? []).filter(
          (d) => d.initiativeId !== input.initiativeId
        ),
        {
          initiativeId: input.initiativeId,
          reason: input.reason,
          freeText: input.freeText,
          dismissedAt: Date.now(),
        },
      ];

      await db
        .update(rewardInitiativePortfolio)
        .set({
          selectedInitiativesJson: selected,
          dismissedInitiativesJson: dismissed,
          updatedAt: Date.now(),
        })
        .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

      return { success: true };
    }),

  /** Undo a dismissal — moves initiative back to recommended list */
  undismiss: protectedProcedure
    .input(z.object({ initiativeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;

      const portfolio = await getOrCreatePortfolio(db, tenantId, ctx.user.id);
      const dismissed = (portfolio.dismissedInitiativesJson ?? []).filter(
        (d) => d.initiativeId !== input.initiativeId
      );

      await db
        .update(rewardInitiativePortfolio)
        .set({ dismissedInitiativesJson: dismissed, updatedAt: Date.now() })
        .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

      return { success: true };
    }),

  /** Add a custom initiative */
  addCustom: protectedProcedure
    .input(CustomInitiativeSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;

      const id = randomUUID();
      const now = Date.now();

      await db.insert(rewardCustomInitiative).values({
        id,
        tenantId,
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        subDomain: input.subDomain,
        phase: input.phase,
        complexity: input.complexity,
        valueLow: input.valueLow,
        valueHigh: input.valueHigh,
        costLow: input.costLow ?? null,
        costHigh: input.costHigh ?? null,
        principlesAlignment: input.principlesAlignment ?? null,
        risks: input.risks ?? null,
        notes: input.notes ?? null,
        inPortfolio: 1,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, id };
    }),

  /** Edit a custom initiative */
  editCustom: protectedProcedure
    .input(z.object({ id: z.string() }).merge(CustomInitiativeSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;

      const { id, ...fields } = input;

      const [existing] = await db
        .select({ id: rewardCustomInitiative.id })
        .from(rewardCustomInitiative)
        .where(
          and(
            eq(rewardCustomInitiative.id, id),
            eq(rewardCustomInitiative.tenantId, tenantId)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Custom initiative not found." });
      }

      await db
        .update(rewardCustomInitiative)
        .set({ ...fields, updatedAt: Date.now() })
        .where(eq(rewardCustomInitiative.id, id));

      return { success: true };
    }),

  /** Remove a custom initiative */
  removeCustom: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;

      const [existing] = await db
        .select({ id: rewardCustomInitiative.id })
        .from(rewardCustomInitiative)
        .where(
          and(
            eq(rewardCustomInitiative.id, input.id),
            eq(rewardCustomInitiative.tenantId, tenantId)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Custom initiative not found." });
      }

      await db
        .delete(rewardCustomInitiative)
        .where(eq(rewardCustomInitiative.id, input.id));

      return { success: true };
    }),

  /** Mark Stage 5 as complete — gate for Stage 6 */
  complete: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    const portfolio = await getOrCreatePortfolio(db, tenantId, ctx.user.id);
    const selected = portfolio.selectedInitiativesJson ?? [];

    const customCount = await db
      .select({ id: rewardCustomInitiative.id })
      .from(rewardCustomInitiative)
      .where(
        and(
          eq(rewardCustomInitiative.tenantId, tenantId),
          eq(rewardCustomInitiative.inPortfolio, 1)
        )
      );

    const totalInPortfolio = selected.length + customCount.length;

    if (totalInPortfolio < 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Add at least one initiative to your portfolio before completing Stage 5.",
      });
    }

    await db
      .update(rewardInitiativePortfolio)
      .set({ isCompleted: 1, completedAt: Date.now(), updatedAt: Date.now() })
      .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

    return { success: true };
  }),

  /** Reopen Stage 5 for editing */
  reopen: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    await db
      .update(rewardInitiativePortfolio)
      .set({ isCompleted: 0, completedAt: null, updatedAt: Date.now() })
      .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

    return { success: true };
  }),
});
