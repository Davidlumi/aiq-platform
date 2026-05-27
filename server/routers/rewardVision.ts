/**
 * Reward Stage 2 — Vision Router
 *
 * Procedures:
 *   get            — fetch current vision state
 *   save           — autosave vision text
 *   generate       — AI-generate initial draft from Stage 1 inputs
 *   affordance     — apply Expand/Refine/Challenge/Suggest to the vision block
 *   confirm        — mark vision as confirmed (triggers staleness cascade on Strategy + Principles)
 *   markStale      — called by upstream when Stage 1 changes materially
 *   keepAsIs       — resolve stale banner without changes (returns to confirmed)
 *   getStatus      — returns { preworkComplete, visionState, canStart }
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  rewardPrework,
  companyProfile,
  rewardVision,
  rewardStrategy,
  rewardPrinciples,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { assertLLMRateLimit } from "../_core/llmRateLimit";
import { TRPCError } from "@trpc/server";
import { VOCAB_BLACKLIST, sanitizeOutput as enforceVocab } from "../../shared/vocabBlacklist";

// Vocab blacklist and sanitizeOutput imported from shared/vocabBlacklist

// ── Ambition ladder ───────────────────────────────────────────────────────────
const AMBITION_LADDER: Record<number, string> = {
  1: "targeted, proven applications — remove manual effort, improve consistency",
  2: "solid capability — AI handles routine analysis, the team focuses on judgement",
  3: "Reward leads — demonstrate AI elevating fairness, transparency, and decision quality",
  4: "fundamental reshaping — reward as a continuously intelligent system",
};

// ── Build context string from Stage 1 inputs ─────────────────────────────────
async function buildStage1Context(tenantId: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

  const [profile] = await db
    .select()
    .from(companyProfile)
    .where(eq(companyProfile.tenantId, tenantId));

  const [prework] = await db
    .select()
    .from(rewardPrework)
    .where(eq(rewardPrework.tenantId, tenantId));

  const parts: string[] = [];

  if (profile) {
    parts.push(`Company: ${profile.companyName ?? "Unknown"}`);
    if (profile.sector) parts.push(`Sector: ${profile.sector}`);
    if (profile.geographicFootprint) parts.push(`Geography: ${profile.geographicFootprint}`);
    if (profile.ownershipStructure) parts.push(`Ownership: ${profile.ownershipStructure}`);
    if (profile.ukEmployeeHeadcount) parts.push(`Headcount: ~${profile.ukEmployeeHeadcount} employees`);
    if (profile.businessAiAmbition) {
      parts.push(`Business AI ambition: ${profile.businessAiAmbition}/4`);
    }
  }

  if (prework) {
    if (prework.rewardAiAmbition) {
      const ladder = AMBITION_LADDER[prework.rewardAiAmbition] ?? "";
      parts.push(`Reward AI ambition: ${prework.rewardAiAmbition}/4 — ${ladder}`);
    }
    if (prework.rewardFunctionSize) parts.push(`Reward team size: ${prework.rewardFunctionSize}`);
    if (prework.rewardFunctionMaturityRating) {
      parts.push(`Reward function maturity: ${prework.rewardFunctionMaturityRating}/4`);
    }
    if (prework.aiMaturityInRewardToday) {
      parts.push(`Current AI maturity in Reward: ${prework.aiMaturityInRewardToday}/4`);
    }
    if (prework.primaryTriggerForRewardAiStrategy) {
      parts.push(`Primary trigger: ${prework.primaryTriggerForRewardAiStrategy}`);
    }
    if (prework.topRewardPrioritiesNext12Months && Array.isArray(prework.topRewardPrioritiesNext12Months)) {
      parts.push(`Top priorities: ${(prework.topRewardPrioritiesNext12Months as string[]).join(", ")}`);
    }
    if (prework.payEquityCapability) parts.push(`Pay equity capability: ${prework.payEquityCapability}`);
    if (prework.payStructureMaturity) parts.push(`Pay structure maturity: ${prework.payStructureMaturity}`);
    if (prework.ukGenderPayGapStatus) parts.push(`UK gender pay gap status: ${prework.ukGenderPayGapStatus}`);
    if (prework.strategicTimeline) parts.push(`Strategic timeline: ${prework.strategicTimeline}`);
  }

  return parts.join("\n");
}

// ── Router ────────────────────────────────────────────────────────────────────

export const rewardVisionRouter = router({
  /** Get current vision state */
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const [vision] = await db
      .select()
      .from(rewardVision)
      .where(eq(rewardVision.tenantId, ctx.user.tenantId));
    return vision ?? null;
  }),

  /** Check whether Stage 2 can start */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    const [prework] = await db
      .select({ isCompleted: rewardPrework.isCompleted })
      .from(rewardPrework)
      .where(eq(rewardPrework.tenantId, tenantId));

    const [vision] = await db
      .select({ state: rewardVision.state })
      .from(rewardVision)
      .where(eq(rewardVision.tenantId, tenantId));

    const preworkComplete = (prework?.isCompleted ?? 0) === 1;
    const visionState = vision?.state ?? "unconfirmed";

    return {
      preworkComplete,
      visionState,
      canStart: preworkComplete,
      canStartMessage: preworkComplete
        ? null
        : "Stage 1 Pre-work must be completed before you can build your Vision.",
    };
  }),

  /** Autosave vision text */
  save: protectedProcedure
    .input(z.object({ visionText: z.string().max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;
      const now = Date.now();

      const [existing] = await db
        .select({ state: rewardVision.state })
        .from(rewardVision)
        .where(eq(rewardVision.tenantId, tenantId));

      if (existing) {
        await db
          .update(rewardVision)
          .set({ visionText: input.visionText, updatedAt: now })
          .where(eq(rewardVision.tenantId, tenantId));
      } else {
        await db.insert(rewardVision).values({
          tenantId,
          userId: ctx.user.id,
          visionText: input.visionText,
          state: "unconfirmed",
          updatedAt: now,
        });
      }

      return { ok: true };
    }),

  /** AI-generate initial vision draft from Stage 1 inputs */
  generate: protectedProcedure.mutation(async ({ ctx }) => {
    assertLLMRateLimit(ctx.user.id); // PROD-2.1
    const tenantId = ctx.user.tenantId;
    const context = await buildStage1Context(tenantId);

    const systemPrompt = `You are a senior Reward Director writing board-ready strategic content.
Write in direct, confident prose. No bullet points. No consultant-speak.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY the vision statement — no preamble, no labels, no markdown.`;

    const userPrompt = `Write a Reward AI vision statement for this organisation.

Context:
${context}

Requirements:
- 2-4 sentences (soft guidance, not hard limit)
- Outcome-stated: what Reward AI will achieve, not how
- CHRO-ready: clear, direct, no jargon
- Calibrated to the stated Reward AI ambition level
- Reference the actual sector, priorities, and trigger where relevant
- Do NOT use any blacklisted vocabulary
- Do NOT use bullet points or headers

Write the vision statement now:`;

    let visionText: string;
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      visionText = enforceVocab(
        ((response.choices?.[0]?.message?.content as string | undefined) ?? "").trim()
      );
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AI generation failed. You can write your vision manually.",
      });
    }

    if (!visionText) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AI generation returned empty content. You can write your vision manually.",
      });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const now = Date.now();

    const [existing] = await db
      .select({ tenantId: rewardVision.tenantId })
      .from(rewardVision)
      .where(eq(rewardVision.tenantId, tenantId));

    if (existing) {
      await db
        .update(rewardVision)
        .set({ visionText, aiGeneratedOriginal: visionText, state: "unconfirmed", updatedAt: now })
        .where(eq(rewardVision.tenantId, tenantId));
    } else {
      await db.insert(rewardVision).values({
        tenantId,
        userId: ctx.user.id,
        visionText,
        aiGeneratedOriginal: visionText,
        state: "unconfirmed",
        updatedAt: now,
      });
    }

    return { visionText };
  }),

  /** Apply an affordance (Expand/Refine/Challenge/Suggest) to the vision block */
  affordance: protectedProcedure
    .input(z.object({
      affordance: z.enum(["expand", "refine", "challenge", "suggest"]),
      currentText: z.string().max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const context = await buildStage1Context(tenantId);

      const affordanceInstructions: Record<string, string> = {
        expand: "Elaborate on this vision — add depth, specificity, and concrete outcomes. Keep it outcome-stated.",
        refine: "Tighten this vision without changing its meaning. Remove any vagueness or redundancy.",
        challenge: "Offer a constructive counter-perspective on this vision. What might Maya be missing? What assumption could be questioned? Be constructive, not adversarial.",
        suggest: "Propose an alternative version of this vision that takes a different angle while staying true to the context.",
      };

      const systemPrompt = `You are a senior Reward Director reviewing strategic content.
Write in direct, confident prose. No bullet points. No consultant-speak.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY the result — no preamble, no labels, no markdown.`;

      const userPrompt = `Context:
${context}

Current vision:
${input.currentText}

Task: ${affordanceInstructions[input.affordance]}

Output the result now:`;

      let result: string;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        result = enforceVocab(
          ((response.choices?.[0]?.message?.content as string | undefined) ?? "").trim()
        );
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Couldn't apply that — please retry.",
        });
      }

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Couldn't apply that — please retry.",
        });
      }

      return { result };
    }),

  /** Confirm vision — marks as confirmed, triggers staleness cascade on Strategy + Principles */
  confirm: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    // Server-side gate: Stage 1 (Pre-work) must be completed before Stage 2 can be confirmed
    const [prework] = await db
      .select({ isCompleted: rewardPrework.isCompleted })
      .from(rewardPrework)
      .where(eq(rewardPrework.tenantId, tenantId));
    if (!prework?.isCompleted) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Stage 1 (Reward Pre-work) must be completed before confirming your vision.",
      });
    }

    const [vision] = await db
      .select({ visionText: rewardVision.visionText })
      .from(rewardVision)
      .where(eq(rewardVision.tenantId, tenantId));

    if (!vision?.visionText?.trim()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Vision cannot be empty. Please write or generate a vision before confirming.",
      });
    }

    const now = Date.now();

    // Mark vision confirmed
    await db
      .update(rewardVision)
      .set({ state: "confirmed", updatedAt: now })
      .where(eq(rewardVision.tenantId, tenantId));

    // Staleness cascade: mark Strategy and Principles as stale (if they exist and are confirmed)
    const [strategy] = await db
      .select({ state: rewardStrategy.state })
      .from(rewardStrategy)
      .where(eq(rewardStrategy.tenantId, tenantId));

    if (strategy?.state === "confirmed") {
      await db
        .update(rewardStrategy)
        .set({ state: "stale", updatedAt: now })
        .where(eq(rewardStrategy.tenantId, tenantId));
    }

    const [principles] = await db
      .select({ state: rewardPrinciples.state })
      .from(rewardPrinciples)
      .where(eq(rewardPrinciples.tenantId, tenantId));

    if (principles?.state === "confirmed") {
      await db
        .update(rewardPrinciples)
        .set({ state: "stale", updatedAt: now })
        .where(eq(rewardPrinciples.tenantId, tenantId));
    }

    return { ok: true };
  }),

  /** Mark vision as stale (called when Stage 1 inputs change materially) */
  markStale: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    const [vision] = await db
      .select({ state: rewardVision.state })
      .from(rewardVision)
      .where(eq(rewardVision.tenantId, tenantId));

    if (vision?.state === "confirmed") {
      await db
        .update(rewardVision)
        .set({ state: "stale", updatedAt: Date.now() })
        .where(eq(rewardVision.tenantId, tenantId));
    }

    return { ok: true };
  }),

  /** Resolve stale banner without changes — return to confirmed */
  keepAsIs: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    await db
      .update(rewardVision)
      .set({ state: "confirmed", updatedAt: Date.now() })
      .where(eq(rewardVision.tenantId, ctx.user.tenantId));

    return { ok: true };
  }),
});
