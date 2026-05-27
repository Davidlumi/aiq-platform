/**
 * Reward Stage 3 — Strategy Router
 *
 * Procedures:
 *   get              — fetch current strategy state
 *   getStatus        — returns { visionConfirmed, strategyState, canStart }
 *   save             — autosave strategic shifts array
 *   generate         — AI-generate initial draft (3-4 shifts) from Stage 1+2 inputs
 *   affordance       — apply affordance to a specific shift block
 *   suggestShift     — suggest an additional shift
 *   confirm          — mark strategy as confirmed (triggers staleness cascade on Principles)
 *   markStale        — called when Stage 2 changes
 *   keepAsIs         — resolve stale banner without changes
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

// ── Strategic shift selection rules (exact enum values from spec §4) ─────────
interface ShiftRule {
  id: string;
  label: string;
  condition: (prework: Record<string, unknown>, profile: Record<string, unknown>) => boolean;
}

const SHIFT_RULES: ShiftRule[] = [
  {
    id: "annual_to_continuous",
    label: "Annual → continuous",
    condition: (pw) => {
      const prio = (pw.topRewardPrioritiesNext12Months as string[] | null) ?? [];
      const equity = pw.payEquityCapability as string | null;
      return prio.includes("fix_pay_equity_gaps") ||
        ["none_no_capability", "ad_hoc_when_required", "annual_structured_audit"].includes(equity ?? "");
    },
  },
  {
    id: "gut_to_evidence",
    label: "Gut-feel → evidence-based",
    condition: (pw) => {
      const prio = (pw.topRewardPrioritiesNext12Months as string[] | null) ?? [];
      const maturity = pw.rewardFunctionMaturityRating as number | null;
      return prio.includes("modernise_comp_decisions") || (maturity !== null && maturity <= 2);
    },
  },
  {
    id: "opaque_to_transparent",
    label: "Opaque → transparent/explainable",
    condition: (pw) => {
      const prio = (pw.topRewardPrioritiesNext12Months as string[] | null) ?? [];
      return prio.includes("pay_transparency_readiness") || prio.includes("better_total_rewards_communication");
    },
  },
  {
    id: "reactive_to_proactive",
    label: "Reactive → proactive",
    condition: (pw) => {
      const prio = (pw.topRewardPrioritiesNext12Months as string[] | null) ?? [];
      const trigger = pw.primaryTriggerForRewardAiStrategy as string | null;
      return prio.includes("fix_pay_equity_gaps") || trigger === "regulatory_deadline_pressure";
    },
  },
  {
    id: "manual_to_augmented",
    label: "Manual → augmented",
    condition: (pw) => {
      const prio = (pw.topRewardPrioritiesNext12Months as string[] | null) ?? [];
      const size = pw.rewardFunctionSize as number | null;
      return prio.includes("reward_team_productivity") || (size !== null && size <= 5);
    },
  },
  {
    id: "one_size_to_personalised",
    label: "One-size-fits-all → personalised",
    condition: (pw) => {
      const prio = (pw.topRewardPrioritiesNext12Months as string[] | null) ?? [];
      const ambition = pw.rewardAiAmbition as number | null;
      return (ambition !== null && ambition >= 3) &&
        (prio.includes("pension_and_benefits_modernisation") || prio.includes("better_total_rewards_communication"));
    },
  },
  {
    id: "siloed_to_connected",
    label: "Siloed data → connected intelligence",
    condition: (pw) => {
      const maturity = pw.aiMaturityInRewardToday as number | null;
      return maturity !== null && maturity <= 2;
    },
  },
  {
    id: "compliance_to_strategic",
    label: "Compliance-scramble → strategic readiness",
    condition: (pw) => {
      const trigger = pw.primaryTriggerForRewardAiStrategy as string | null;
      const gpg = pw.ukGenderPayGapStatus as string | null;
      return trigger === "regulatory_deadline_pressure" || gpg === "mandatory_and_finding_it_hard";
    },
  },
];

const DEFAULT_SHIFTS = ["gut_to_evidence", "manual_to_augmented"];

function selectShifts(prework: Record<string, unknown>, profile: Record<string, unknown>): string[] {
  const matched = SHIFT_RULES
    .filter(r => r.condition(prework, profile))
    .map(r => r.id);

  // Ensure at least 3 shifts — pad with defaults if needed
  const result = Array.from(new Set(matched));
  for (const def of DEFAULT_SHIFTS) {
    if (result.length >= 3) break;
    if (!result.includes(def)) result.push(def);
  }
  return result.slice(0, 4); // cap at 4
}

// ── Build context string ──────────────────────────────────────────────────────
async function buildContext(tenantId: string): Promise<{
  contextStr: string;
  visionText: string | null;
  selectedShiftIds: string[];
  prework: Record<string, unknown>;
  profile: Record<string, unknown>;
}> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

  const [profile] = await db.select().from(companyProfile).where(eq(companyProfile.tenantId, tenantId));
  const [prework] = await db.select().from(rewardPrework).where(eq(rewardPrework.tenantId, tenantId));
  const [vision] = await db.select({ visionText: rewardVision.visionText }).from(rewardVision).where(eq(rewardVision.tenantId, tenantId));

  const pw = (prework ?? {}) as Record<string, unknown>;
  const pf = (profile ?? {}) as Record<string, unknown>;

  const parts: string[] = [];
  if (profile) {
    parts.push(`Company: ${profile.companyName ?? "Unknown"}`);
    if (profile.sector) parts.push(`Sector: ${profile.sector}`);
    if (profile.geographicFootprint) parts.push(`Geography: ${profile.geographicFootprint}`);
    if (profile.ukEmployeeHeadcount) parts.push(`Headcount: ~${profile.ukEmployeeHeadcount}`);
  }
  if (prework) {
    if (prework.rewardAiAmbition) parts.push(`Reward AI ambition: ${prework.rewardAiAmbition}/4`);
    if (prework.rewardFunctionSize) parts.push(`Reward team size: ${prework.rewardFunctionSize}`);
    if (prework.rewardFunctionMaturityRating) parts.push(`Reward maturity: ${prework.rewardFunctionMaturityRating}/4`);
    if (prework.aiMaturityInRewardToday) parts.push(`AI maturity today: ${prework.aiMaturityInRewardToday}/4`);
    if (prework.primaryTriggerForRewardAiStrategy) parts.push(`Primary trigger: ${prework.primaryTriggerForRewardAiStrategy}`);
    const prio = prework.topRewardPrioritiesNext12Months as string[] | null;
    if (prio?.length) parts.push(`Top priorities: ${prio.join(", ")}`);
    if (prework.payEquityCapability) parts.push(`Pay equity capability: ${prework.payEquityCapability}`);
    if (prework.payStructureMaturity) parts.push(`Pay structure maturity: ${prework.payStructureMaturity}`);
    if (prework.ukGenderPayGapStatus) parts.push(`UK gender pay gap: ${prework.ukGenderPayGapStatus}`);
  }

  const selectedShiftIds = selectShifts(pw, pf);

  return {
    contextStr: parts.join("\n"),
    visionText: vision?.visionText ?? null,
    selectedShiftIds,
    prework: pw,
    profile: pf,
  };
}

// ── Router ────────────────────────────────────────────────────────────────────

export const rewardStrategyRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const [strategy] = await db
      .select()
      .from(rewardStrategy)
      .where(eq(rewardStrategy.tenantId, ctx.user.tenantId));
    return strategy ?? null;
  }),

  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    const [vision] = await db
      .select({ state: rewardVision.state })
      .from(rewardVision)
      .where(eq(rewardVision.tenantId, tenantId));

    const [strategy] = await db
      .select({ state: rewardStrategy.state })
      .from(rewardStrategy)
      .where(eq(rewardStrategy.tenantId, tenantId));

    const visionConfirmed = vision?.state === "confirmed" || vision?.state === "stale";
    const strategyState = strategy?.state ?? "unconfirmed";

    return {
      visionConfirmed,
      strategyState,
      canStart: visionConfirmed,
      canStartMessage: visionConfirmed
        ? null
        : "Stage 2 Vision must be confirmed before you can build your Strategy.",
    };
  }),

  save: protectedProcedure
    .input(z.object({
      strategicShifts: z.array(z.object({
        id: z.string(),
        text: z.string().max(1000),
        aiGeneratedOriginal: z.string().max(1000),
      })).min(1).max(4),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;
      const now = Date.now();

      const [existing] = await db
        .select({ tenantId: rewardStrategy.tenantId })
        .from(rewardStrategy)
        .where(eq(rewardStrategy.tenantId, tenantId));

      if (existing) {
        await db
          .update(rewardStrategy)
          .set({ strategicShiftsJson: input.strategicShifts, updatedAt: now })
          .where(eq(rewardStrategy.tenantId, tenantId));
      } else {
        await db.insert(rewardStrategy).values({
          tenantId,
          userId: ctx.user.id,
          strategicShiftsJson: input.strategicShifts,
          state: "unconfirmed",
          updatedAt: now,
        });
      }

      return { ok: true };
    }),

  generate: protectedProcedure.mutation(async ({ ctx }) => {
    assertLLMRateLimit(ctx.user.id); // PROD-2.1
    const tenantId = ctx.user.tenantId;
    const { contextStr, visionText, selectedShiftIds } = await buildContext(tenantId);

    const shiftLabels = selectedShiftIds
      .map(id => SHIFT_RULES.find(r => r.id === id)?.label ?? id)
      .join(", ");

    const systemPrompt = `You are a senior Reward Director writing board-ready strategic content.
Write in direct, confident prose. No bullet points in the shift text itself.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY a JSON array — no preamble, no markdown fences.`;

    const userPrompt = `Write ${selectedShiftIds.length} strategic shifts for a Reward AI strategy.

Context:
${contextStr}

${visionText ? `Confirmed vision (do NOT restate this as a shift — express the moves that deliver it):\n${visionText}\n` : ""}

Shift themes to develop (in order of relevance):
${shiftLabels}

For each shift, write:
- A "from → to" headline (e.g. "Annual cycles → continuous insight")
- 1-2 sentences of rationale specific to this organisation

Output as JSON array:
[
  { "id": "shift_1", "headline": "...", "rationale": "..." },
  ...
]`;

    let shifts: Array<{ id: string; text: string; aiGeneratedOriginal: string }>;
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });
      const raw = (response.choices?.[0]?.message?.content as string | undefined) ?? "[]";
      let parsed: Array<{ id?: string; headline?: string; rationale?: string }>;
      try {
        const obj = JSON.parse(raw);
        parsed = Array.isArray(obj) ? obj : (obj.shifts ?? obj.items ?? []);
      } catch {
        parsed = [];
      }
      shifts = parsed.map((item, i) => {
        const text = enforceVocab(`${item.headline ?? ""}\n${item.rationale ?? ""}`.trim());
        return {
          id: randomUUID(),
          text,
          aiGeneratedOriginal: text,
        };
      });
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AI generation failed. You can write your strategic shifts manually.",
      });
    }

    if (!shifts.length) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AI generation returned empty content. You can write your strategic shifts manually.",
      });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const now = Date.now();

    const [existing] = await db
      .select({ tenantId: rewardStrategy.tenantId })
      .from(rewardStrategy)
      .where(eq(rewardStrategy.tenantId, tenantId));

    if (existing) {
      await db
        .update(rewardStrategy)
        .set({ strategicShiftsJson: shifts, state: "unconfirmed", updatedAt: now })
        .where(eq(rewardStrategy.tenantId, tenantId));
    } else {
      await db.insert(rewardStrategy).values({
        tenantId,
        userId: ctx.user.id,
        strategicShiftsJson: shifts,
        state: "unconfirmed",
        updatedAt: now,
      });
    }

    return { shifts };
  }),

  affordance: protectedProcedure
    .input(z.object({
      affordance: z.enum(["expand", "refine", "challenge", "suggest"]),
      blockId: z.string(),
      currentText: z.string().max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const { contextStr, visionText } = await buildContext(tenantId);

      const affordanceInstructions: Record<string, string> = {
        expand: "Elaborate on this strategic shift — add depth, specificity, and concrete implications for this organisation.",
        refine: "Tighten this strategic shift without changing its meaning. Remove vagueness.",
        challenge: "Offer a constructive counter-perspective on this shift. What might be missing or overstated? Be constructive, not adversarial.",
        suggest: "Propose an alternative version of this strategic shift that takes a different angle.",
      };

      const systemPrompt = `You are a senior Reward Director reviewing strategic content.
Write in direct, confident prose. No bullet points.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY the result — no preamble, no labels, no markdown.`;

      const userPrompt = `Context:
${contextStr}
${visionText ? `\nVision: ${visionText}` : ""}

Current strategic shift:
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
        result = enforceVocab(((response.choices?.[0]?.message?.content as string | undefined) ?? "").trim());
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

  suggestShift: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const { contextStr, visionText } = await buildContext(tenantId);

    const [strategy] = await (await getDb())!
      .select({ strategicShiftsJson: rewardStrategy.strategicShiftsJson })
      .from(rewardStrategy)
      .where(eq(rewardStrategy.tenantId, tenantId));

    const existing = (strategy?.strategicShiftsJson as Array<{ text: string }> | null) ?? [];
    const existingTexts = existing.map(s => s.text).join("\n---\n");

    const systemPrompt = `You are a senior Reward Director writing strategic content.
Write in direct, confident prose.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY a JSON object — no preamble, no markdown fences.`;

    const userPrompt = `Context:
${contextStr}
${visionText ? `\nVision: ${visionText}` : ""}

Existing shifts (do NOT repeat these):
${existingTexts}

Suggest one additional strategic shift that is meaningfully different from the existing ones.
Output as JSON: { "headline": "...", "rationale": "..." }`;

    let result: string;
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });
      const raw = (response.choices?.[0]?.message?.content as string | undefined) ?? "{}";
      const parsed = JSON.parse(raw);
      result = enforceVocab(`${parsed.headline ?? ""}\n${parsed.rationale ?? ""}`.trim());
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Couldn't suggest a shift — please retry.",
      });
    }

    return {
      shift: {
        id: randomUUID(),
        text: result,
        aiGeneratedOriginal: result,
      },
    };
  }),

  confirm: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    // Server-side gate: Stage 2 (Vision) must be confirmed before Stage 3 can be confirmed
    const [vision] = await db
      .select({ state: rewardVision.state })
      .from(rewardVision)
      .where(eq(rewardVision.tenantId, tenantId));
    if (vision?.state !== "confirmed") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Stage 2 (Vision) must be confirmed before confirming your strategy.",
      });
    }

    const [strategy] = await db
      .select({ strategicShiftsJson: rewardStrategy.strategicShiftsJson })
      .from(rewardStrategy)
      .where(eq(rewardStrategy.tenantId, tenantId));

    const shifts = (strategy?.strategicShiftsJson as unknown[]) ?? [];
    if (!shifts.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "At least one strategic shift is required before confirming.",
      });
    }

    const now = Date.now();

    await db
      .update(rewardStrategy)
      .set({ state: "confirmed", updatedAt: now })
      .where(eq(rewardStrategy.tenantId, tenantId));

    // Staleness cascade: mark Principles as stale if confirmed
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

  markStale: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    const [strategy] = await db
      .select({ state: rewardStrategy.state })
      .from(rewardStrategy)
      .where(eq(rewardStrategy.tenantId, tenantId));

    if (strategy?.state === "confirmed") {
      await db
        .update(rewardStrategy)
        .set({ state: "stale", updatedAt: Date.now() })
        .where(eq(rewardStrategy.tenantId, tenantId));
    }

    return { ok: true };
  }),

  keepAsIs: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    await db
      .update(rewardStrategy)
      .set({ state: "confirmed", updatedAt: Date.now() })
      .where(eq(rewardStrategy.tenantId, ctx.user.tenantId));

    return { ok: true };
  }),
});
