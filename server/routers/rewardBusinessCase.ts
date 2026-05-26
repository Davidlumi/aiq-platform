/**
 * Reward Stage 7 — Business Case Router
 *
 * Procedures:
 *   getStatus          — returns { portfolioComplete, bcState, canStart, model }
 *   generateNarrative  — AI-generate all four narrative sections from computed model
 *   affordance         — apply Expand/Refine/Challenge/Suggest to a narrative section
 *   saveNarrative      — autosave a narrative section text
 *   setOverride        — set cost/value override for a specific initiative
 *   clearOverride      — remove override for a specific initiative
 *   setAssumptions     — update programme funding assumptions
 *   setScenario        — set the recommended scenario
 *   confirm            — mark business case as confirmed
 *   markStale          — called when Stage 5 portfolio changes
 *   keepAsIs           — resolve stale banner without changes
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  rewardBusinessCase,
  rewardInitiativePortfolio,
  rewardVision,
  rewardStrategy,
  rewardPrinciples,
  rewardPrework,
  companyProfile,
  rewardPrincipleTemplates,
  rewardCustomInitiative,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import {
  computeBusinessCase,
  buildNarrativePromptData,
  type CostValueOverrides,
  type ProgrammeFundingAssumptions,
  type Scenario,
  type CustomInitiativeInput,
} from "../services/rewardBusinessCaseEngine";

import { VOCAB_BLACKLIST, sanitizeOutput as enforceVocab } from "../../shared/vocabBlacklist";

// ── Narrative section keys ────────────────────────────────────────────────────
const NARRATIVE_SECTIONS = ["execSummary", "investmentRationale", "valueNarrative", "riskAssumptions"] as const;
type NarrativeSection = typeof NARRATIVE_SECTIONS[number];

const SECTION_LABELS: Record<NarrativeSection, string> = {
  execSummary:          "Executive Summary",
  investmentRationale:  "Investment Rationale",
  valueNarrative:       "Value Narrative",
  riskAssumptions:      "Risk and Assumptions",
};

// ── Context builder ───────────────────────────────────────────────────────────

async function buildContext(tenantId: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

  const [profile] = await db.select().from(companyProfile).where(eq(companyProfile.tenantId, tenantId));
  const [prework]  = await db.select().from(rewardPrework).where(eq(rewardPrework.tenantId, tenantId));
  const [vision]   = await db.select().from(rewardVision).where(eq(rewardVision.tenantId, tenantId));
  const [strategy] = await db.select().from(rewardStrategy).where(eq(rewardStrategy.tenantId, tenantId));
  const [principles] = await db.select().from(rewardPrinciples).where(eq(rewardPrinciples.tenantId, tenantId));
  const [portfolio]  = await db.select().from(rewardInitiativePortfolio).where(eq(rewardInitiativePortfolio.tenantId, tenantId));
  // Custom initiatives in portfolio (inPortfolio = 1, costLow/costHigh/valueLow/valueHigh provided)
  const customInits = await db.select().from(rewardCustomInitiative)
    .where(eq(rewardCustomInitiative.tenantId, tenantId));
  const customInitiativesInPortfolio = customInits
    .filter(c => c.inPortfolio === 1 && c.costLow != null && c.valueLow != null);

  return { db, profile, prework, vision, strategy, principles, portfolio, customInitiativesInPortfolio };
}

// ── Compute model helper ──────────────────────────────────────────────────────

function computeModel(
  portfolio: { selectedInitiativesJson?: string[] | null },
  profile: { sector?: string | null; ukEmployeeHeadcount?: number | null; annualPayrollCostGbp?: number | null } | undefined,
  overrides: CostValueOverrides,
  programmeFundingAssumptions: ProgrammeFundingAssumptions,
  customInitiativesInPortfolio: Array<{ id: string; title: string; subDomain: string; phase: string; costLow: number | null; costHigh: number | null; valueLow: number; valueHigh: number }> = []
) {
  const selectedIds = portfolio?.selectedInitiativesJson ?? [];
  const inputs = {
    sector: profile?.sector ?? "",
    totalEmployeeHeadcount: profile?.ukEmployeeHeadcount ?? 3000,
    totalPayrollGbp: profile?.annualPayrollCostGbp ?? 0,
  };
  const customInputs: CustomInitiativeInput[] = customInitiativesInPortfolio.map(c => ({
    id: c.id,
    title: c.title,
    subDomain: c.subDomain,
    phase: c.phase,
    costLow:  c.costLow  ?? 0,
    costHigh: c.costHigh ?? c.costLow ?? 0,
    valueLow:  c.valueLow,
    valueHigh: c.valueHigh,
  }));
  return computeBusinessCase(selectedIds, inputs, overrides, programmeFundingAssumptions, customInputs);
}

// ─────────────────────────────────────────────────────────────────────────────

export const rewardBusinessCaseRouter = router({

  // ── getStatus ───────────────────────────────────────────────────────────────
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
        const { db, profile, portfolio, principles, customInitiativesInPortfolio } = await buildContext(tenantId);
    const [bc] = await db.select().from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId));
    const portfolioComplete = !!(portfolio?.isCompleted);
    const bcState = bc?.isConfirmed ? "confirmed" : bc?.isStale ? "stale" : bc ? "unconfirmed" : "unconfirmed";
    // Compute model for display
    const overrides: CostValueOverrides = bc?.costValueOverridesJson ?? {};
    const programmeFundingAssumptions: ProgrammeFundingAssumptions = bc?.programmeFundingAssumptionsJson ?? {};
    const model = computeModel(portfolio ?? { selectedInitiativesJson: [] }, profile, overrides, programmeFundingAssumptions, customInitiativesInPortfolio);

    // Confirmed principle titles for narrative context
    const confirmedPrincipleIds: string[] = [];
    if (principles?.principlesJson) {
      for (const p of principles.principlesJson as Array<{ selected?: boolean; principleId?: string }>) {
        if (p.selected && p.principleId) confirmedPrincipleIds.push(p.principleId);
      }
    }
    const allTemplates = await db.select().from(rewardPrincipleTemplates);
    const confirmedPrincipleTitles = confirmedPrincipleIds
      .map(id => allTemplates.find(t => t.principleId === id)?.text)
      .filter((t): t is string => !!t);

    return {
      portfolioComplete,
      bcState,
      canStart: portfolioComplete,
      blockedReason: portfolioComplete ? null : "Complete Stage 5 (Portfolio) before building your Business Case.",
      model,
      narratives: {
        execSummary:         bc?.execSummaryText ?? null,
        investmentRationale: bc?.investmentRationaleText ?? null,
        valueNarrative:      bc?.valueNarrativeText ?? null,
        riskAssumptions:     bc?.riskAssumptionsText ?? null,
      },
      overrides,
      programmeFundingAssumptions,
      recommendedScenario: (bc?.recommendedScenario ?? "central") as Scenario,
      confirmedPrincipleTitles,
      isConfirmed: !!bc?.isConfirmed,
      isStale: !!bc?.isStale,
      updatedAt: bc?.updatedAt ?? null,
    };
  }),

  // ── generateNarrative ───────────────────────────────────────────────────────
  generateNarrative: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
        const { db, profile, portfolio, vision, strategy, principles, customInitiativesInPortfolio } = await buildContext(tenantId);
    if (!portfolio?.isCompleted) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete Stage 5 before generating the Business Case narrative." });
    }

    const [bc] = await db.select().from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId));
    const overrides: CostValueOverrides = bc?.costValueOverridesJson ?? {};
    const programmeFundingAssumptions: ProgrammeFundingAssumptions = bc?.programmeFundingAssumptionsJson ?? {};
        const model = computeModel(portfolio, profile, overrides, programmeFundingAssumptions, customInitiativesInPortfolio);
    // Confirmed principle titles
    const confirmedPrincipleIds: string[] = [];
    if (principles?.principlesJson) {
      for (const p of principles.principlesJson as Array<{ selected?: boolean; principleId?: string }>) {
        if (p.selected && p.principleId) confirmedPrincipleIds.push(p.principleId);
      }
    }
    const allTemplates = await db.select().from(rewardPrincipleTemplates);
    const confirmedPrincipleTitles = confirmedPrincipleIds
      .map(id => allTemplates.find(t => t.principleId === id)?.text)
      .filter((t): t is string => !!t);

    // Strategy shifts
    const strategyShifts = (strategy?.strategicShiftsJson as Array<{ title: string }> | null) ?? null;

    const promptData = buildNarrativePromptData(
      model,
      profile?.companyName ?? "the organisation",
      vision?.visionText ?? null,
      strategyShifts,
      confirmedPrincipleTitles,
      (bc?.recommendedScenario ?? "central") as Scenario,
      profile?.annualRevenueGbp ?? null
    );

    const systemPrompt = `You are a senior Reward Director writing a CFO-ready business case for an AI-powered Reward transformation programme.

CRITICAL RULES:
1. Use ONLY the financial figures provided in the data payload. Do not estimate, invent, or modify any numbers.
2. Write in the voice of an internal Reward Director presenting to a CFO — confident, evidence-based, no consultant-speak.
3. Avoid: leverage, synergy, paradigm, holistic, ecosystem, robust, scalable, best-in-class, world-class, cutting-edge, game-changer, transformational, impactful, seamless, empower, unlock potential, drive value, move the needle.
4. Each section should be 2–4 paragraphs. No bullet lists.
5. Return a JSON object with exactly these keys: execSummary, investmentRationale, valueNarrative, riskAssumptions.

Tone guidance:
- Executive Summary: crisp, confident, 3yr headline numbers up front
- Investment Rationale: why this programme, why now, link to strategic shifts
- Value Narrative: what the numbers mean in practice — fairness, retention, manager confidence, compliance risk reduction
- Risk and Assumptions: honest about what could move the numbers, name the overlap discount, call out programme funding separately`;

    const userPrompt = `Generate the four business case narrative sections for this Reward AI programme.

Data:
${JSON.stringify(promptData, null, 2)}

Return a JSON object with keys: execSummary, investmentRationale, valueNarrative, riskAssumptions.
Each value is a string containing 2–4 paragraphs of plain text (no markdown, no bullet points).`;

    let narratives: Record<string, string>;
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "business_case_narratives",
            strict: true,
            schema: {
              type: "object",
              properties: {
                execSummary:         { type: "string" },
                investmentRationale: { type: "string" },
                valueNarrative:      { type: "string" },
                riskAssumptions:     { type: "string" },
              },
              required: ["execSummary", "investmentRationale", "valueNarrative", "riskAssumptions"],
              additionalProperties: false,
            },
          },
        },
      });
      const raw = typeof response.choices?.[0]?.message?.content === "string"
        ? response.choices[0].message.content
        : JSON.stringify(response.choices?.[0]?.message?.content ?? {});
      narratives = JSON.parse(raw);
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AI narrative generation failed. You can write the business case sections manually.",
      });
    }

    const clean = (s: string) => enforceVocab(s ?? "");
    const now = Date.now();

    const upsertData = {
      tenantId,
      userId: ctx.user.id,
      execSummaryText:              clean(narratives.execSummary),
      execSummaryAiOriginal:        clean(narratives.execSummary),
      investmentRationaleText:      clean(narratives.investmentRationale),
      investmentRationaleAiOriginal: clean(narratives.investmentRationale),
      valueNarrativeText:           clean(narratives.valueNarrative),
      valueNarrativeAiOriginal:     clean(narratives.valueNarrative),
      riskAssumptionsText:          clean(narratives.riskAssumptions),
      riskAssumptionsAiOriginal:    clean(narratives.riskAssumptions),
      isConfirmed: 0 as const,
      isStale: 0 as const,
      updatedAt: now,
    };

    if (bc) {
      await db.update(rewardBusinessCase).set(upsertData).where(eq(rewardBusinessCase.tenantId, tenantId));
    } else {
      await db.insert(rewardBusinessCase).values(upsertData);
    }

    return {
      execSummary:         clean(narratives.execSummary),
      investmentRationale: clean(narratives.investmentRationale),
      valueNarrative:      clean(narratives.valueNarrative),
      riskAssumptions:     clean(narratives.riskAssumptions),
    };
  }),

  // ── affordance ──────────────────────────────────────────────────────────────
  affordance: protectedProcedure
    .input(z.object({
      section:    z.enum(["execSummary", "investmentRationale", "valueNarrative", "riskAssumptions"]),
      actionType: z.enum(["expand", "refine", "challenge", "suggest"]),
      currentText: z.string().min(1).max(8000),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
            const { db, profile, portfolio, vision, strategy, principles, customInitiativesInPortfolio } = await buildContext(tenantId);
      const [bc] = await db.select().from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId));
      const overrides: CostValueOverrides = bc?.costValueOverridesJson ?? {};
      const programmeFundingAssumptions: ProgrammeFundingAssumptions = bc?.programmeFundingAssumptionsJson ?? {};
      const model = computeModel(portfolio ?? { selectedInitiativesJson: [] }, profile, overrides, programmeFundingAssumptions, customInitiativesInPortfolio);
      const confirmedPrincipleIds: string[] = [];
      if (principles?.principlesJson) {
        for (const p of principles.principlesJson as Array<{ selected?: boolean; principleId?: string }>) {
          if (p.selected && p.principleId) confirmedPrincipleIds.push(p.principleId);
        }
      }
      const allTemplates = await db.select().from(rewardPrincipleTemplates);
      const confirmedPrincipleTitles = confirmedPrincipleIds
        .map(id => allTemplates.find(t => t.principleId === id)?.text)
        .filter((t): t is string => !!t);

      const strategyShifts = (strategy?.strategicShiftsJson as Array<{ title: string }> | null) ?? null;
      const promptData = buildNarrativePromptData(
        model,
        profile?.companyName ?? "the organisation",
        vision?.visionText ?? null,
        strategyShifts,
        confirmedPrincipleTitles,
        (bc?.recommendedScenario ?? "central") as Scenario,
        profile?.annualRevenueGbp ?? null
      );

      const actionInstructions: Record<string, string> = {
        expand:    "Expand this section with additional supporting evidence, specific examples, or deeper analysis. Keep the same tone and financial figures.",
        refine:    "Refine this section for clarity and concision. Tighten the language, remove any redundancy, and sharpen the argument.",
        challenge: "Identify the weakest assumptions in this section and rewrite to acknowledge them honestly, while maintaining a positive overall case.",
        suggest:   "Suggest an alternative framing for this section that emphasises a different aspect of the value proposition.",
      };

      const systemPrompt = `You are a senior Reward Director editing a CFO-ready business case.
CRITICAL: Use ONLY the financial figures in the data payload. Do not invent or modify numbers.
Avoid consultant-speak: leverage, synergy, paradigm, holistic, ecosystem, robust, scalable, best-in-class, world-class, cutting-edge, game-changer, transformational, impactful, seamless, empower.
Return only the revised text for the section — no preamble, no JSON wrapper.`;

      const userPrompt = `Section: ${SECTION_LABELS[input.section as NarrativeSection]}
Action: ${actionInstructions[input.actionType]}

Current text:
${input.currentText}

Financial data context:
${JSON.stringify(promptData, null, 2)}

Return only the revised section text (2–4 paragraphs, plain text, no markdown).`;

      let result: string;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userPrompt },
          ],
        });
        result = enforceVocab(
          typeof response.choices?.[0]?.message?.content === "string"
            ? response.choices[0].message.content
            : JSON.stringify(response.choices?.[0]?.message?.content ?? "")
        );
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Affordance failed. You can edit the text manually.",
        });
      }

      return { result };
    }),

  // ── saveNarrative ───────────────────────────────────────────────────────────
  saveNarrative: protectedProcedure
    .input(z.object({
      section: z.enum(["execSummary", "investmentRationale", "valueNarrative", "riskAssumptions"]),
      text: z.string().max(8000),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [bc] = await db.select().from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId));
      const now = Date.now();

      const fieldMap: Record<NarrativeSection, string> = {
        execSummary:         "execSummaryText",
        investmentRationale: "investmentRationaleText",
        valueNarrative:      "valueNarrativeText",
        riskAssumptions:     "riskAssumptionsText",
      };
      const field = fieldMap[input.section as NarrativeSection];

      if (bc) {
        await db.update(rewardBusinessCase)
          .set({ [field]: input.text, isStale: 0, updatedAt: now })
          .where(eq(rewardBusinessCase.tenantId, tenantId));
      } else {
        await db.insert(rewardBusinessCase).values({
          tenantId,
          userId: ctx.user.id,
          [field]: input.text,
          isConfirmed: 0,
          isStale: 0,
          updatedAt: now,
        });
      }
      return { ok: true };
    }),

  // ── setOverride ─────────────────────────────────────────────────────────────
  setOverride: protectedProcedure
    .input(z.object({
      initiativeId: z.string().min(1),
      year1Low:     z.number().min(0).optional(),
      year1High:    z.number().min(0).optional(),
      ongoingLow:   z.number().min(0).optional(),
      ongoingHigh:  z.number().min(0).optional(),
      valueLow:     z.number().min(0).optional(),
      valueHigh:    z.number().min(0).optional(),
      overrideNote: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [bc] = await db.select().from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId));
      const existing: CostValueOverrides = bc?.costValueOverridesJson ?? {};

      const { initiativeId, ...overrideFields } = input;
      const updated: CostValueOverrides = {
        ...existing,
        [initiativeId]: { ...existing[initiativeId], ...overrideFields },
      };
      const now = Date.now();

      if (bc) {
        await db.update(rewardBusinessCase)
          .set({ costValueOverridesJson: updated, isStale: 0, updatedAt: now })
          .where(eq(rewardBusinessCase.tenantId, tenantId));
      } else {
        await db.insert(rewardBusinessCase).values({
          tenantId,
          userId: ctx.user.id,
          costValueOverridesJson: updated,
          isConfirmed: 0,
          isStale: 0,
          updatedAt: now,
        });
      }
      return { ok: true };
    }),

  // ── clearOverride ───────────────────────────────────────────────────────────
  clearOverride: protectedProcedure
    .input(z.object({ initiativeId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [bc] = await db.select().from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId));
      const existing: CostValueOverrides = bc?.costValueOverridesJson ?? {};
      const updated = { ...existing };
      delete updated[input.initiativeId];

      await db.update(rewardBusinessCase)
        .set({ costValueOverridesJson: updated, updatedAt: Date.now() })
        .where(eq(rewardBusinessCase.tenantId, tenantId));
      return { ok: true };
    }),

  // ── setAssumptions ──────────────────────────────────────────────────────────
  setAssumptions: protectedProcedure
    .input(z.object({
      offBandPopulationPct: z.number().min(0).max(100).optional(),
      programmeFundingNote: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [bc] = await db.select().from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId));
      const existing: ProgrammeFundingAssumptions = bc?.programmeFundingAssumptionsJson ?? {};
      const updated = { ...existing, ...input };
      const now = Date.now();

      if (bc) {
        await db.update(rewardBusinessCase)
          .set({ programmeFundingAssumptionsJson: updated, updatedAt: now })
          .where(eq(rewardBusinessCase.tenantId, tenantId));
      } else {
        await db.insert(rewardBusinessCase).values({
          tenantId,
          userId: ctx.user.id,
          programmeFundingAssumptionsJson: updated,
          isConfirmed: 0,
          isStale: 0,
          updatedAt: now,
        });
      }
      return { ok: true };
    }),

  // ── setScenario ─────────────────────────────────────────────────────────────
  setScenario: protectedProcedure
    .input(z.object({ scenario: z.enum(["conservative", "central", "optimistic"]) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [bc] = await db.select().from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId));
      const now = Date.now();

      if (bc) {
        await db.update(rewardBusinessCase)
          .set({ recommendedScenario: input.scenario, updatedAt: now })
          .where(eq(rewardBusinessCase.tenantId, tenantId));
      } else {
        await db.insert(rewardBusinessCase).values({
          tenantId,
          userId: ctx.user.id,
          recommendedScenario: input.scenario,
          isConfirmed: 0,
          isStale: 0,
          updatedAt: now,
        });
      }
      return { ok: true };
    }),

  // ── confirm ─────────────────────────────────────────────────────────────────
  confirm: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const [bc] = await db.select().from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId));
    if (!bc) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Generate the Business Case before confirming." });
    }

    const hasNarrative = !!(bc.execSummaryText && bc.investmentRationaleText && bc.valueNarrativeText && bc.riskAssumptionsText);
    if (!hasNarrative) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "All four narrative sections must be populated before confirming." });
    }

    const now = Date.now();
    await db.update(rewardBusinessCase)
      .set({ isConfirmed: 1, confirmedAt: now, isStale: 0, updatedAt: now })
      .where(eq(rewardBusinessCase.tenantId, tenantId));

    return { ok: true, confirmedAt: now };
  }),

  // ── markStale ───────────────────────────────────────────────────────────────
  markStale: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const [bc] = await db.select().from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId));
    if (bc && bc.isConfirmed) {
      await db.update(rewardBusinessCase)
        .set({ isStale: 1, updatedAt: Date.now() })
        .where(eq(rewardBusinessCase.tenantId, tenantId));
    }
    return { ok: true };
  }),

  // ── keepAsIs ────────────────────────────────────────────────────────────────
  keepAsIs: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    await db.update(rewardBusinessCase)
      .set({ isStale: 0, updatedAt: Date.now() })
      .where(eq(rewardBusinessCase.tenantId, tenantId));
    return { ok: true };
  }),
});
