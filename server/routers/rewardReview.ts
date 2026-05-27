/**
 * Reward Stage 9 — Review & Lock Router
 *
 * Procedures:
 *   getStatus          — returns { review, canLock, blockingCheckIds, lockState }
 *   runReview          — execute all 12 checks (S1, C1-C4, H1-H4, R1-R4) and persist results
 *   acknowledge        — acknowledge a soft flag (keyed to checkId + resultStateHash)
 *   affordance         — Expand/Refine/Challenge/Suggest on the review summary
 *   generateSummary    — AI-generate the review narrative summary
 *   lock               — lock the strategy (requires canLock=true)
 *   unlock             — unlock the strategy (always allowed; marks Stage 10 as draft)
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  rewardReview,
  rewardPrework,
  rewardVision,
  rewardStrategy,
  rewardPrinciples,
  rewardInitiativePortfolio,
  rewardCustomInitiative,
  rewardSuccessMeasures,
  rewardSuccessMeasuresStage,
  rewardBusinessCase,
  rewardCapabilityStage,
  rewardCapabilityDimensions,
  rewardWontDoTemplates,
  rewardOutputs,
  companyProfile,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { assertLLMRateLimit } from "../_core/llmRateLimit";
import { TRPCError } from "@trpc/server";
import {
  computeBusinessCase,
  type BusinessCaseModel,
} from "../services/rewardBusinessCaseEngine";
import {
  runStalenessChecks,
  runCompletenessChecks,
  runCoherenceChecks,
  runReadinessChecks,
  runH1ShiftCoverageSync,
  canLock as computeCanLock,
  pruneStaleAcknowledgments,
  ackKey,
  type CheckResult,
  type AcknowledgmentsMap,
  type StageStateData,
} from "../services/rewardReviewService";
import { computeStateHash } from "../services/rewardOutputs";
import { VOCAB_BLACKLIST, sanitizeOutput as enforceVocab } from "../../shared/vocabBlacklist";

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
  const customs       = await db.select().from(rewardCustomInitiative).where(eq(rewardCustomInitiative.tenantId, tenantId));
  const [s6stage]     = await db.select().from(rewardSuccessMeasuresStage).where(eq(rewardSuccessMeasuresStage.tenantId, tenantId));
  const s6measures    = await db.select().from(rewardSuccessMeasures).where(eq(rewardSuccessMeasures.tenantId, tenantId));
  const [bc]          = await db.select().from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId));
  const [s8stage]     = await db.select().from(rewardCapabilityStage).where(eq(rewardCapabilityStage.tenantId, tenantId));
  const s8dims        = await db.select().from(rewardCapabilityDimensions).where(eq(rewardCapabilityDimensions.tenantId, tenantId));
  const wontDoTemplates = await db.select().from(rewardWontDoTemplates);
  const [review]      = await db.select().from(rewardReview).where(eq(rewardReview.tenantId, tenantId));

  return { db, profile, prework, vision, strategy, principles, portfolio, customs, s6stage, s6measures, bc, s8stage, s8dims, wontDoTemplates, review };
}

// ── Build StageStateData from context ────────────────────────────────────────
function buildStageStateData(ctx: Awaited<ReturnType<typeof buildContext>>): {
  stageData: StageStateData;
  bcModel: BusinessCaseModel | null;
} {
  const { profile, prework, vision, strategy, principles, portfolio, customs, s6stage, s6measures, bc, s8stage, s8dims } = ctx;

  // Compute business case model if portfolio + profile available
  let bcModel: BusinessCaseModel | null = null;
  if (portfolio?.selectedInitiativesJson && bc?.isConfirmed) {
    const selectedIds = portfolio.selectedInitiativesJson as string[];
    const inputs = {
      sector: profile?.sector ?? "",
      totalEmployeeHeadcount: profile?.ukEmployeeHeadcount ?? 3000,
      totalPayrollGbp: profile?.annualPayrollCostGbp ?? 0,
    };
    const overrides = (bc.costValueOverridesJson ?? {}) as Record<string, {
      year1Low?: number; year1High?: number; ongoingLow?: number; ongoingHigh?: number;
      valueLow?: number; valueHigh?: number; overrideNote?: string;
    }>;
    const pfAssumptions = (bc.programmeFundingAssumptionsJson ?? {}) as {
      offBandPopulationPct?: number; programmeFundingNote?: string;
    };
    // Include custom initiatives in portfolio with user-provided figures
    const customInputs = (ctx.customs ?? []).filter(c => c.inPortfolio === 1 && c.costLow != null && c.valueLow != null).map(c => ({
      id: c.id,
      title: c.title,
      subDomain: c.subDomain,
      phase: c.phase,
      costLow:  c.costLow  ?? 0,
      costHigh: c.costHigh ?? c.costLow ?? 0,
      valueLow:  c.valueLow!,
      valueHigh: c.valueHigh,
    }));
    bcModel = computeBusinessCase(selectedIds, inputs, overrides, pfAssumptions, customInputs);
  }

  const stageData: StageStateData = {
    prework: prework ? {
      isCompleted: prework.isCompleted === 1,
      rewardAiAmbition: prework.rewardAiAmbition ?? null,
      topRewardPrioritiesNext12Months: (prework.topRewardPrioritiesNext12Months as string[] | null) ?? null,
    } : null,
    vision: vision ? { state: vision.state } : null,
    strategy: strategy ? {
      state: strategy.state,
      strategicShiftsJson: (strategy.strategicShiftsJson as Array<{ id: string; text: string }> | null) ?? null,
    } : null,
    principles: principles ? {
      state: principles.state,
      principlesJson: (principles.principlesJson as Array<{ id: string; principleId: string | null; text: string; selected: boolean }> | null) ?? null,
      wontDosJson: (principles.wontDosJson as Array<{ id: string; wontDoId: string | null; text: string; selected: boolean }> | null) ?? null,
    } : null,
    portfolio: portfolio ? {
      isCompleted: portfolio.isCompleted === 1,
      selectedInitiativesJson: (portfolio.selectedInitiativesJson as string[] | null) ?? null,
    } : null,
    customInitiatives: customs.map(c => ({
      id: c.id,
      title: c.title,
      inPortfolio: c.inPortfolio === 1,
      dataIntensity: c.capDataIntensity ?? null,
      changeImpact: c.capChangeImpact ?? null,
      integrationNeed: c.capIntegrationNeed ?? null,
      governanceSensitivity: c.capGovernanceSensitivity ?? null,
      year1CostLow: c.costLow ?? null,
      year1CostHigh: c.costHigh ?? null,
      valueLow: c.valueLow ?? null,
      valueHigh: c.valueHigh ?? null,
    })),
    successMeasuresStage: s6stage ? {
      isConfirmed: s6stage.isConfirmed === 1,
      isStale: s6stage.isStale === 1,
    } : null,
    successMeasures: s6measures.map(m => ({
      initiativeId: m.initiativeId,
      isArchived: m.isArchived === 1,
    })),
    businessCase: bc ? {
      isConfirmed: bc.isConfirmed === 1,
      isStale: bc.isStale === 1,
    } : null,
    businessCaseModel: bcModel ? {
      rollup: {
        conservative: { netBenefit3yr: bcModel.rollup.conservative.netBenefit3yr },
      },
      programmeFundingLines: bcModel.programmeFundingLines.map(pf => ({ initiativeId: pf.initiativeId })),
    } : null,
    capabilityStage: s8stage ? {
      isConfirmed: s8stage.isConfirmed === 1,
      isStale: s8stage.isStale === 1,
      enablementCostJson: (s8stage.enablementCostJson as { low: number; high: number; note: string } | null) ?? null,
    } : null,
    capabilityDimensions: s8dims.map(d => ({
      dimension: d.dimension,
      currentLevel: d.currentLevel ?? null,
      requiredLevel: d.requiredLevel ?? null,
      gapStatus: d.gapStatus ?? null,
      actionNote: d.actionNote ?? null,
    })),
  };

  return { stageData, bcModel };
}

// ── H1 AI shift coverage check ────────────────────────────────────────────────
async function runH1WithAI(stageData: StageStateData, profile: { companyName?: string | null } | undefined): Promise<CheckResult> {
  const shifts = stageData.strategy?.strategicShiftsJson ?? [];
  const selectedIds = stageData.portfolio?.selectedInitiativesJson ?? [];

  if (shifts.length === 0) {
    return runH1ShiftCoverageSync(stageData);
  }
  if (selectedIds.length === 0) {
    const d = { shiftCount: shifts.length, initiativeCount: 0 };
    return { checkId: "H1", category: "coherence", status: "flag", flagType: "soft",
      message: "No initiatives selected — shifts cannot be served.", sourceStage: 5,
      resultStateHash: JSON.stringify(d).slice(0, 16) };
  }

  // Build initiative titles for context
  const { getRewardInitiative } = await import("../../shared/rewardInitiativeLibrary");
  const initiativeTitles = selectedIds.map(id => {
    const lib = getRewardInitiative(id);
    return lib?.title ?? id;
  });

  const systemPrompt = `You are a senior reward strategy consultant. Assess whether the selected initiatives collectively address all the strategic shifts. Return JSON only: { "covered": boolean, "uncoveredShifts": string[], "reasoning": string }. Keep reasoning under 60 words. Vocabulary blacklist: ${VOCAB_BLACKLIST.join(", ")}.`;
  const userPrompt = `Organisation: ${profile?.companyName ?? "the organisation"}
Strategic shifts:
${shifts.map((s, i) => `${i + 1}. ${s.text}`).join("\n")}

Selected initiatives:
${initiativeTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Do the selected initiatives collectively address all the strategic shifts?`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "shift_coverage",
          strict: true,
          schema: {
            type: "object",
            properties: {
              covered: { type: "boolean" },
              uncoveredShifts: { type: "array", items: { type: "string" } },
              reasoning: { type: "string" },
            },
            required: ["covered", "uncoveredShifts", "reasoning"],
            additionalProperties: false,
          },
        },
      },
    });
    const raw = response.choices?.[0]?.message?.content as string | undefined;
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) throw new Error("Empty AI response");

    const d = { shifts: shifts.map(s => s.text), initiativeTitles, covered: parsed.covered, uncoveredShifts: parsed.uncoveredShifts };
    const hash = JSON.stringify(d).slice(0, 16);

    if (parsed.covered) {
      return { checkId: "H1", category: "coherence", status: "pass", flagType: null,
        message: "All strategic shifts are addressed by the selected initiatives.", sourceStage: null, resultStateHash: hash };
    }
    return { checkId: "H1", category: "coherence", status: "flag", flagType: "soft",
      message: `${parsed.uncoveredShifts.length} strategic shift${parsed.uncoveredShifts.length > 1 ? "s" : ""} may not be addressed by the current portfolio. ${enforceVocab(parsed.reasoning)}`,
      sourceStage: 5, resultStateHash: hash };
  } catch {
    // Fallback to sync check on AI failure
    return runH1ShiftCoverageSync(stageData);
  }
}

// ── Context string for AI summary ─────────────────────────────────────────────
function buildContextString(ctx: Awaited<ReturnType<typeof buildContext>>): string {
  const { profile, prework, vision, strategy, portfolio } = ctx;
  const lines: string[] = [];
  if (profile?.companyName) lines.push(`Company: ${profile.companyName}`);
  if (profile?.sector) lines.push(`Sector: ${profile.sector}`);
  if (vision?.visionText) lines.push(`Vision: ${vision.visionText}`);
  if (strategy?.strategicShiftsJson) {
    const shifts = strategy.strategicShiftsJson as Array<{ id: string; text: string }>;
    lines.push(`Strategic shifts: ${shifts.map(s => s.text).join(" | ")}`);
  }
  const selectedIds = (portfolio?.selectedInitiativesJson as string[] | null) ?? [];
  if (selectedIds.length > 0) lines.push(`Portfolio: ${selectedIds.length} initiatives`);
  if (prework?.rewardAiAmbition) lines.push(`AI ambition: ${prework.rewardAiAmbition}/5`);
  return lines.join("\n");
}

// ── Router ────────────────────────────────────────────────────────────────────
export const rewardReviewRouter = router({

  // ── getStatus ───────────────────────────────────────────────────────────────
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const context = await buildContext(tenantId);
    const { review } = context;

    const checkResults = (review?.checkResultsJson as CheckResult[] | null) ?? [];
    const acknowledgments = (review?.acknowledgmentsJson as AcknowledgmentsMap | null) ?? {};
    const { canLock: lockable, blockingCheckIds } = computeCanLock(checkResults, acknowledgments);

    return {
      review: review ? {
        checkResults,
        acknowledgments,
        reviewSummaryText: review.reviewSummaryText ?? null,
        strategyLocked: review.strategyLocked === 1,
        lockedAt: review.lockedAt ?? null,
        lastRunAt: review.lastRunAt ?? null,
      } : null,
      canLock: lockable,
      blockingCheckIds,
    };
  }),

  // ── runReview ────────────────────────────────────────────────────────────────
  runReview: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const context = await buildContext(tenantId);
    const { db, profile, review } = context;
    const { stageData } = buildStageStateData(context);

    // Run all checks
    const stalenessResults = runStalenessChecks(stageData);
    const completenessResults = runCompletenessChecks(stageData);
    const h1Result = await runH1WithAI(stageData, profile);
    const coherenceResults = runCoherenceChecks(stageData, context.wontDoTemplates, h1Result);
    const readinessResults = runReadinessChecks(stageData);

    const allResults: CheckResult[] = [
      ...stalenessResults,
      ...completenessResults,
      ...coherenceResults,
      ...readinessResults,
    ];

    // Prune stale acknowledgments
    const existingAcks = (review?.acknowledgmentsJson as AcknowledgmentsMap | null) ?? {};
    const prunedAcks = pruneStaleAcknowledgments(allResults, existingAcks);

    const now = Date.now();
    const { canLock: lockable, blockingCheckIds } = computeCanLock(allResults, prunedAcks);

    await db.insert(rewardReview).values({
      tenantId,
      userId: ctx.user.id,
      checkResultsJson: allResults,
      acknowledgmentsJson: prunedAcks,
      reviewSummaryText: review?.reviewSummaryText ?? null,
      reviewSummaryAiOriginal: review?.reviewSummaryAiOriginal ?? null,
      strategyLocked: review?.strategyLocked ?? 0,
      lockedAt: review?.lockedAt ?? null,
      lockedStateHash: review?.lockedStateHash ?? null,
      lastRunAt: now,
      updatedAt: now,
    }).onDuplicateKeyUpdate({
      set: {
        checkResultsJson: allResults,
        acknowledgmentsJson: prunedAcks,
        lastRunAt: now,
        updatedAt: now,
      },
    });

    return { checkResults: allResults, canLock: lockable, blockingCheckIds };
  }),

  // ── acknowledge ──────────────────────────────────────────────────────────────
  acknowledge: protectedProcedure
    .input(z.object({
      checkId: z.string(),
      resultStateHash: z.string(),
      rationale: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const context = await buildContext(tenantId);
      const { db, review } = context;

      if (!review) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Run the review first before acknowledging." });
      }

      const checkResults = (review.checkResultsJson as CheckResult[] | null) ?? [];
      const check = checkResults.find(c => c.checkId === input.checkId && c.resultStateHash === input.resultStateHash);
      if (!check) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Check not found or result has changed — re-run the review." });
      }
      if (check.flagType !== "soft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only soft flags can be acknowledged." });
      }

      const key = ackKey(input.checkId, input.resultStateHash);
      const existingAcks = (review.acknowledgmentsJson as AcknowledgmentsMap | null) ?? {};
      const updatedAcks: AcknowledgmentsMap = {
        ...existingAcks,
        [key]: { acknowledgedAt: Date.now(), rationale: input.rationale ?? null },
      };

      const { canLock: lockable, blockingCheckIds } = computeCanLock(checkResults, updatedAcks);

      await db.update(rewardReview)
        .set({ acknowledgmentsJson: updatedAcks, updatedAt: Date.now() })
        .where(eq(rewardReview.tenantId, tenantId));

      return { canLock: lockable, blockingCheckIds };
    }),

  // ── generateSummary ──────────────────────────────────────────────────────────
  generateSummary: protectedProcedure.mutation(async ({ ctx }) => {
    assertLLMRateLimit(ctx.user.id); // PROD-2.1
    const tenantId = ctx.user.tenantId;
    const context = await buildContext(tenantId);
    const { db, review } = context;

    if (!review?.checkResultsJson) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Run the review first before generating a summary." });
    }

    const checkResults = review.checkResultsJson as CheckResult[];
    const flags = checkResults.filter(c => c.status === "flag");
    const passes = checkResults.filter(c => c.status === "pass");
    const hardFlags = flags.filter(c => c.flagType === "hard");
    const softFlags = flags.filter(c => c.flagType === "soft");
    const acks = (review.acknowledgmentsJson as AcknowledgmentsMap | null) ?? {};
    const acknowledgedCount = softFlags.filter(c => !!acks[ackKey(c.checkId, c.resultStateHash)]).length;

    const contextStr = buildContextString(context);

    const systemPrompt = `You are a senior reward strategy consultant writing a pre-lock review summary. Write in direct, confident prose. 2-3 paragraphs. No bullet points. No markdown headers. Vocabulary blacklist: ${VOCAB_BLACKLIST.join(", ")}.`;
    const userPrompt = `Organisation context:
${contextStr}

Review results:
- ${passes.length} checks passed
- ${hardFlags.length} hard flags (blocking)
- ${softFlags.length} soft flags (${acknowledgedCount} acknowledged)

${flags.length > 0 ? `Outstanding issues:\n${flags.map(f => `- [${f.flagType?.toUpperCase()}] ${f.checkId}: ${f.message}`).join("\n")}` : "No outstanding issues."}

Write a concise review summary that:
1. Confirms what is in good shape
2. Clearly names any outstanding issues without minimising them
3. States whether the strategy is ready to lock or what must be resolved first`;

    let summaryText: string;
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      summaryText = enforceVocab((response.choices?.[0]?.message?.content as string | undefined) ?? "");
      if (!summaryText) throw new Error("Empty response");
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Couldn't generate the review summary — you can write it manually.",
      });
    }

    await db.update(rewardReview)
      .set({ reviewSummaryText: summaryText, reviewSummaryAiOriginal: summaryText, updatedAt: Date.now() })
      .where(eq(rewardReview.tenantId, tenantId));

    return { reviewSummaryText: summaryText };
  }),

  // ── saveSummary ──────────────────────────────────────────────────────────────
  saveSummary: protectedProcedure
    .input(z.object({ text: z.string().max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.insert(rewardReview).values({
        tenantId,
        userId: ctx.user.id,
        reviewSummaryText: input.text,
        updatedAt: Date.now(),
      }).onDuplicateKeyUpdate({
        set: { reviewSummaryText: input.text, updatedAt: Date.now() },
      });

      return { ok: true };
    }),

  // ── affordance ───────────────────────────────────────────────────────────────
  affordance: protectedProcedure
    .input(z.object({
      action: z.enum(["expand", "refine", "challenge", "suggest"]),
      currentText: z.string().max(3000).optional(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const context = await buildContext(tenantId);
      const contextStr = buildContextString(context);

      const actionInstructions: Record<string, string> = {
        expand: "Expand the review summary with more specific detail about the outstanding issues and what resolving them would mean for the strategy.",
        refine: "Refine the review summary to be more precise and concise. Remove vague language.",
        challenge: "Challenge the review summary: identify if it is too optimistic about unresolved issues or too pessimistic about what is working. Return a revised version that is more honest.",
        suggest: "Suggest a fresh review summary grounded in the organisation context and check results.",
      };

      const systemPrompt = `You are a senior reward strategy consultant. Respond with ONLY the revised text — no preamble, no quotes, no markdown. Vocabulary blacklist: ${VOCAB_BLACKLIST.join(", ")}.`;
      const userPrompt = `Organisation context:
${contextStr}

Current review summary: ${input.currentText ?? "(none)"}
Task: ${actionInstructions[input.action]}${input.reason ? `\nAdditional context: ${input.reason}` : ""}`;

      let result: string;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        result = enforceVocab((response.choices?.[0]?.message?.content as string | undefined) ?? "");
        if (!result) throw new Error("Empty response");
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Couldn't ${input.action} the review summary — you can edit the text manually.`,
        });
      }

      return { result };
    }),

  // ── lock ─────────────────────────────────────────────────────────────────────
  lock: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const context = await buildContext(tenantId);
    const { db, review, profile, prework, vision, strategy, principles, portfolio, bc, s6stage, s8stage } = context;

    if (!review) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Run the review first before locking." });
    }

    const checkResults = (review.checkResultsJson as CheckResult[] | null) ?? [];
    const acknowledgments = (review.acknowledgmentsJson as AcknowledgmentsMap | null) ?? {};
    const { canLock: lockable, blockingCheckIds } = computeCanLock(checkResults, acknowledgments);

    if (!lockable) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot lock — ${blockingCheckIds.length} check${blockingCheckIds.length > 1 ? "s" : ""} must be resolved first: ${blockingCheckIds.join(", ")}.`,
      });
    }

    // Compute state hash at lock time
    const stateHash = computeStateHash({
      profile, prework, vision, strategy, principles, portfolio,
      businessCase: bc, successMeasuresStage: s6stage, capabilityStage: s8stage,
    });

    const now = Date.now();
    await db.update(rewardReview)
      .set({ strategyLocked: 1, lockedAt: now, lockedStateHash: stateHash, updatedAt: now })
      .where(eq(rewardReview.tenantId, tenantId));

    return { strategyLocked: true, lockedAt: now, lockedStateHash: stateHash };
  }),

  // ── unlock ───────────────────────────────────────────────────────────────────
  unlock: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const now = Date.now();
    await db.update(rewardReview)
      .set({ strategyLocked: 0, lockedAt: null, lockedStateHash: null, updatedAt: now })
      .where(eq(rewardReview.tenantId, tenantId));

    // Mark Stage 10 summary as stale
    await db.update(rewardOutputs)
      .set({ isSummaryStale: 1, updatedAt: now })
      .where(eq(rewardOutputs.tenantId, tenantId));

    return { strategyLocked: false };
  }),
});
