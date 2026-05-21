/**
 * Reward Stage 10 — Outputs Router
 *
 * Procedures:
 *   get                — assemble and return the full report (live, recomputed)
 *   generateSummary    — AI-generate the strategy-level executive summary
 *   affordance         — Expand/Refine/Challenge/Suggest on the executive summary
 *   setAudience        — set board/remco/leadership audience
 *   markSummaryStale   — called when upstream stages change
 *   keepSummaryAsIs    — resolve stale banner without regenerating
 *   saveSummary        — autosave edited summary text
 *   exportPdf          — generate and return a PDF download URL
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  rewardOutputs,
  rewardBusinessCase,
  rewardInitiativePortfolio,
  rewardVision,
  rewardStrategy,
  rewardPrinciples,
  rewardPrework,
  companyProfile,
  rewardCustomInitiative,
  rewardSuccessMeasures,
  rewardSuccessMeasuresStage,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import {
  assembleReport,
  buildStage10PromptData,
  computeStateHash,
  type Audience,
} from "../services/rewardOutputs";
import type { CostValueOverrides, ProgrammeFundingAssumptions } from "../services/rewardBusinessCaseEngine";

// ── Vocabulary blacklist ──────────────────────────────────────────────────────
const VOCAB_BLACKLIST = [
  "leverage", "synergy", "paradigm", "holistic", "ecosystem", "robust",
  "scalable", "best-in-class", "world-class", "cutting-edge", "game-changer",
  "transformational", "impactful", "seamless", "empower", "unlock potential",
  "drive value", "move the needle", "boil the ocean",
];
function enforceVocab(text: string): string {
  let result = text;
  for (const word of VOCAB_BLACKLIST) {
    const re = new RegExp(`\\b${word}\\b`, "gi");
    result = result.replace(re, "");
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

// ── Context builder ───────────────────────────────────────────────────────────
async function buildContext(tenantId: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

  const [profile]     = await db.select().from(companyProfile).where(eq(companyProfile.tenantId, tenantId));
  const [prework]     = await db.select().from(rewardPrework).where(eq(rewardPrework.tenantId, tenantId));
  const [vision]      = await db.select().from(rewardVision).where(eq(rewardVision.tenantId, tenantId));
  const [strategy]    = await db.select().from(rewardStrategy).where(eq(rewardStrategy.tenantId, tenantId));
  const [principles]  = await db.select().from(rewardPrinciples).where(eq(rewardPrinciples.tenantId, tenantId));
  const [portfolio]   = await db.select().from(rewardInitiativePortfolio).where(eq(rewardInitiativePortfolio.tenantId, tenantId));
  const [bc]          = await db.select().from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId));
  const [outputs]     = await db.select().from(rewardOutputs).where(eq(rewardOutputs.tenantId, tenantId));
  const customs       = await db.select().from(rewardCustomInitiative).where(eq(rewardCustomInitiative.tenantId, tenantId));
  // Stage 6
  const [s6stage]     = await db.select().from(rewardSuccessMeasuresStage).where(eq(rewardSuccessMeasuresStage.tenantId, tenantId));
  const s6measures    = await db.select().from(rewardSuccessMeasures)
    .where(eq(rewardSuccessMeasures.tenantId, tenantId));

  return { db, profile, prework, vision, strategy, principles, portfolio, bc, outputs, customs, s6stage, s6measures };
}

// ── Router ────────────────────────────────────────────────────────────────────

export const rewardOutputsRouter = router({

  // ── get ─────────────────────────────────────────────────────────────────────
  get: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const { profile, prework, vision, strategy, principles, portfolio, bc, outputs, customs, s6stage, s6measures } =
      await buildContext(tenantId);

    const report = assembleReport({
      profile,
      prework,
      vision,
      strategy,
      principles,
      portfolio,
      businessCase: bc
        ? {
            ...bc,
            costValueOverridesJson: bc.costValueOverridesJson as CostValueOverrides | null,
            programmeFundingAssumptionsJson: bc.programmeFundingAssumptionsJson as ProgrammeFundingAssumptions | null,
          }
        : undefined,
      customInitiatives: customs,
      successMeasures: s6measures,
      successMeasuresStage: s6stage,
    });

    // Compute current state hash
    const currentHash = computeStateHash({ profile, prework, vision, strategy, principles, portfolio, businessCase: bc, successMeasuresStage: s6stage });

    return {
      report,
      outputs: outputs ?? null,
      audience: (outputs?.audience ?? "board") as Audience,
      execSummaryText: outputs?.execSummaryText ?? null,
      isSummaryStale: !!outputs?.isSummaryStale,
      lastExportAt: outputs?.lastExportAt ?? null,
      currentHash,
      isExportStale: outputs?.lastExportStateHash
        ? outputs.lastExportStateHash !== currentHash
        : false,
    };
  }),

  // ── generateSummary ──────────────────────────────────────────────────────────
  generateSummary: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const { db, profile, prework, vision, strategy, principles, portfolio, bc, outputs, customs, s6stage, s6measures } =
      await buildContext(tenantId);

    if (!portfolio?.isCompleted) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Complete Stage 5 (portfolio) before generating the strategy summary.",
      });
    }

    const report = assembleReport({
      profile, prework, vision, strategy, principles, portfolio,
      businessCase: bc
        ? {
            ...bc,
            costValueOverridesJson: bc.costValueOverridesJson as CostValueOverrides | null,
            programmeFundingAssumptionsJson: bc.programmeFundingAssumptionsJson as ProgrammeFundingAssumptions | null,
          }
        : undefined,
      customInitiatives: customs,
      successMeasures: s6measures,
      successMeasuresStage: s6stage,
    });

    const audience = (outputs?.audience ?? "board") as Audience;
    const promptData = buildStage10PromptData(report, audience);

    const audienceFocus: Record<Audience, string> = {
      board: "Emphasise strategic value, investment return, competitive positioning, and risk governance.",
      remco: "Emphasise governance, fairness, regulatory compliance, principles alignment, and any executive compensation considerations.",
      leadership: "Emphasise people-strategy alignment, team capability, change management, and delivery confidence.",
    };

    const systemPrompt = `You are a senior Reward Director writing the executive summary of a board-ready Reward AI strategy document.
CRITICAL RULES:
1. Use ONLY the financial figures provided in the data payload. Do not estimate, invent, or modify any numbers.
2. This is a STRATEGY-LEVEL summary (vision + programme + investment + delivery) — broader than a business case summary.
3. Write in the voice of an internal Reward Director presenting to ${audience === "board" ? "a board" : audience === "remco" ? "a RemCo" : "senior leadership"}.
4. ${audienceFocus[audience]}
5. Avoid: leverage, synergy, paradigm, holistic, ecosystem, robust, scalable, best-in-class, world-class, cutting-edge, game-changer, transformational, impactful, seamless, empower, unlock potential, drive value, move the needle.
6. Write 3–5 paragraphs of plain text (no markdown, no bullet lists, no headers).
7. Lead with the strategic rationale, then the programme, then the investment headline, then the ask.
8. If the conservative scenario is net-negative, acknowledge it honestly — frame it as a risk-mitigation investment where the financial case is strongest in the expected scenario.`;

    const userPrompt = `Write the strategy-level executive summary for this Reward AI programme.
Data:
${JSON.stringify(promptData, null, 2)}
Return a single string: 3–5 paragraphs of plain text.`;

    let summaryText: string;
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
      });
      const raw = response.choices?.[0]?.message?.content;
      summaryText = typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
      summaryText = enforceVocab(summaryText);
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AI summary generation failed. You can write the executive summary manually.",
      });
    }

    const now = Date.now();
    if (outputs) {
      await db.update(rewardOutputs)
        .set({ execSummaryText: summaryText, execSummaryAiOriginal: summaryText, isSummaryStale: 0, updatedAt: now })
        .where(eq(rewardOutputs.tenantId, tenantId));
    } else {
      await db.insert(rewardOutputs).values({
        tenantId,
        userId: ctx.user.id,
        audience,
        execSummaryText: summaryText,
        execSummaryAiOriginal: summaryText,
        isSummaryStale: 0,
        updatedAt: now,
      });
    }

    return { execSummaryText: summaryText };
  }),

  // ── affordance ───────────────────────────────────────────────────────────────
  affordance: protectedProcedure
    .input(z.object({
      action: z.enum(["expand", "refine", "challenge", "suggest"]),
      currentText: z.string().max(8000),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const { profile, prework, vision, strategy, principles, portfolio, bc, outputs, customs, s6stage, s6measures } =
        await buildContext(tenantId);

      const report = assembleReport({
        profile, prework, vision, strategy, principles, portfolio,
        businessCase: bc
          ? {
              ...bc,
              costValueOverridesJson: bc.costValueOverridesJson as CostValueOverrides | null,
              programmeFundingAssumptionsJson: bc.programmeFundingAssumptionsJson as ProgrammeFundingAssumptions | null,
            }
          : undefined,
        customInitiatives: customs,
        successMeasures: s6measures,
        successMeasuresStage: s6stage,
      });

      const audience = (outputs?.audience ?? "board") as Audience;
      const promptData = buildStage10PromptData(report, audience);

      const actionInstructions: Record<string, string> = {
        expand: "Expand the summary with more strategic context and supporting detail. Keep the same structure but add depth.",
        refine: "Tighten and sharpen the summary. Remove any redundancy, make every sentence earn its place.",
        challenge: "Identify any claims in the summary that are overstated, unsupported, or that a sceptical board member might push back on. Rewrite those passages more carefully.",
        suggest: "Suggest an alternative framing or emphasis for the executive summary that might resonate better with the audience.",
      };

      const systemPrompt = `You are a senior Reward Director editing a board-ready strategy executive summary.
CRITICAL RULES:
1. Use ONLY the financial figures provided in the data payload. Do not estimate, invent, or modify any numbers.
2. ${actionInstructions[input.action]}
3. Avoid: leverage, synergy, paradigm, holistic, ecosystem, robust, scalable, best-in-class, world-class, cutting-edge, game-changer, transformational, impactful, seamless, empower.
4. Return plain text only (no markdown, no bullet lists).`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Current summary:\n${input.currentText}\n\nData context:\n${JSON.stringify(promptData, null, 2)}` },
        ],
      });

      const raw = response.choices?.[0]?.message?.content;
      const result = enforceVocab(typeof raw === "string" ? raw : JSON.stringify(raw ?? ""));
      return { text: result };
    }),

  // ── saveSummary ──────────────────────────────────────────────────────────────
  saveSummary: protectedProcedure
    .input(z.object({ text: z.string().max(10000) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const { db, outputs } = await buildContext(tenantId);
      const now = Date.now();
      if (outputs) {
        await db.update(rewardOutputs)
          .set({ execSummaryText: input.text, updatedAt: now })
          .where(eq(rewardOutputs.tenantId, tenantId));
      } else {
        await db.insert(rewardOutputs).values({
          tenantId,
          userId: ctx.user.id,
          execSummaryText: input.text,
          updatedAt: now,
        });
      }
      return { ok: true };
    }),

  // ── setAudience ──────────────────────────────────────────────────────────────
  setAudience: protectedProcedure
    .input(z.object({ audience: z.enum(["board", "remco", "leadership"]) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const { db, outputs } = await buildContext(tenantId);
      const now = Date.now();
      if (outputs) {
        await db.update(rewardOutputs)
          .set({ audience: input.audience, isSummaryStale: 1, updatedAt: now })
          .where(eq(rewardOutputs.tenantId, tenantId));
      } else {
        await db.insert(rewardOutputs).values({
          tenantId,
          userId: ctx.user.id,
          audience: input.audience,
          updatedAt: now,
        });
      }
      return { ok: true };
    }),

  // ── markSummaryStale ─────────────────────────────────────────────────────────
  markSummaryStale: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const { db, outputs } = await buildContext(tenantId);
    if (outputs) {
      await db.update(rewardOutputs)
        .set({ isSummaryStale: 1, updatedAt: Date.now() })
        .where(eq(rewardOutputs.tenantId, tenantId));
    }
    return { ok: true };
  }),

  // ── keepSummaryAsIs ──────────────────────────────────────────────────────────
  keepSummaryAsIs: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const { db, outputs } = await buildContext(tenantId);
    if (outputs) {
      await db.update(rewardOutputs)
        .set({ isSummaryStale: 0, updatedAt: Date.now() })
        .where(eq(rewardOutputs.tenantId, tenantId));
    }
    return { ok: true };
  }),

  // ── recordExport ─────────────────────────────────────────────────────────────
  recordExport: protectedProcedure
    .input(z.object({ audience: z.enum(["board", "remco", "leadership"]), stateHash: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const { db, outputs } = await buildContext(tenantId);
      const now = Date.now();
      if (outputs) {
        await db.update(rewardOutputs)
          .set({
            lastExportAt: now,
            lastExportAudience: input.audience,
            lastExportStateHash: input.stateHash,
            updatedAt: now,
          })
          .where(eq(rewardOutputs.tenantId, tenantId));
      } else {
        await db.insert(rewardOutputs).values({
          tenantId,
          userId: ctx.user.id,
          audience: input.audience,
          lastExportAt: now,
          lastExportAudience: input.audience,
          lastExportStateHash: input.stateHash,
          updatedAt: now,
        });
      }
      return { ok: true };
    }),
});
