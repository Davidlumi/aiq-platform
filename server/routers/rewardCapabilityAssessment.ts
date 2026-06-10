/**
 * Reward Stage 8 — Capability Assessment Router
 *
 * Procedures:
 *   getStatus            — returns { canStart, stage, dimensions[], sequencingFlags, enablementCost }
 *   generateAssessment   — AI seeds required levels + gap statements + action notes (suggest, never auto-confirm)
 *   saveDimension        — update a single dimension's currentLevel, gapStatement, actionNote, owner
 *   affordance           — Expand / Refine / Challenge / Suggest on gapStatement or actionNote
 *   confirm              — mark Stage 8 as confirmed
 *   markStale            — called when Stage 5 portfolio changes
 *   keepAsIs             — resolve stale banner without changes
 */

import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { strategyRewardProcedure as protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  companyProfile,
  rewardPrework,
  rewardVision,
  rewardStrategy,
  rewardInitiativePortfolio,
  rewardCapabilityDimensions,
  rewardCapabilityStage,
  rewardCustomInitiative,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import { getRewardInitiative, REWARD_INITIATIVE_LIBRARY } from "../../shared/rewardInitiativeLibrary";
import {
  CAPABILITY_DIMENSIONS,
  DIMENSION_META,
  computeRequiredLevels,
  seedCurrentLevelsFromMaturity,
  deriveGapStatus,
  deriveSequencingFlags,
  computeEnablementCost,
  buildCapabilityRiskNote,
  type CapabilityDimension,
  type CapabilityLevel,
  type GapStatus,
  type CustomInitiativeCapabilityProfile,
} from "../services/rewardCapabilityService";

import { VOCAB_BLACKLIST, sanitizeOutput as enforceVocab } from "../../shared/vocabBlacklist";
import {
  aggregateTeamCapability,
  CAPABILITY_LINK_CONFIG,
  type UserDomainScores,
  type AssessmentDomain,
} from "../services/capabilityLinkConfig";
import {
  rewardTeamCapabilitySnapshots,
  assessmentSessions,
  assessmentScores,
  users,
} from "../../drizzle/schema";
import { desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// ── Context builder ───────────────────────────────────────────────────────────
async function buildContextString(tenantId: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

  const [profile] = await db.select().from(companyProfile).where(eq(companyProfile.tenantId, tenantId));
  const [prework] = await db.select().from(rewardPrework).where(eq(rewardPrework.tenantId, tenantId));
  const [vision] = await db.select({ visionText: rewardVision.visionText }).from(rewardVision).where(eq(rewardVision.tenantId, tenantId));

  const parts: string[] = [];
  if (profile) {
    parts.push(`Company: ${profile.companyName ?? "Unknown"}`);
    if (profile.sector) parts.push(`Sector: ${profile.sector}`);
    if (profile.ukEmployeeHeadcount) parts.push(`Headcount: ~${profile.ukEmployeeHeadcount}`);
    if (profile.hris) parts.push(`HRIS: ${profile.hris}`);  // companyProfile.hris
  }
  if (prework) {
    if (prework.rewardAiAmbition) parts.push(`Reward AI ambition: ${prework.rewardAiAmbition}/4`);
    if (prework.rewardFunctionMaturityRating) parts.push(`Reward function maturity: ${prework.rewardFunctionMaturityRating}/4`);
    if (prework.aiMaturityInRewardToday) parts.push(`AI maturity today: ${prework.aiMaturityInRewardToday}/4`);
  }
  if (vision?.visionText) parts.push(`Vision: ${vision.visionText}`);

  return parts.join("\n");
}

// ── Row → client shape ────────────────────────────────────────────────────────
function rowToDimension(row: {
  dimension: string;
  requiredLevel: string;
  currentLevel: string | null;
  gapStatus: string | null;
  gapStatement: string | null;
  gapStatementAiOriginal: string | null;
  actionNote: string | null;
  actionNoteAiOriginal: string | null;
  isChallenged: number;
  challengeNote: string | null;
  owner: string | null;
  updatedAt: number | null;
}) {
  return {
    dimension: row.dimension as CapabilityDimension,
    label: DIMENSION_META[row.dimension as CapabilityDimension]?.label ?? row.dimension,
    description: DIMENSION_META[row.dimension as CapabilityDimension]?.description ?? "",
    requiredLevel: row.requiredLevel as CapabilityLevel,
    currentLevel: (row.currentLevel as CapabilityLevel | null) ?? null,
    gapStatus: (row.gapStatus as GapStatus | null) ?? null,
    gapStatement: row.gapStatement ?? null,
    gapStatementAiOriginal: row.gapStatementAiOriginal ?? null,
    actionNote: row.actionNote ?? null,
    actionNoteAiOriginal: row.actionNoteAiOriginal ?? null,
    isChallenged: row.isChallenged === 1,
    challengeNote: row.challengeNote ?? null,
    owner: row.owner ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

// ── Router ────────────────────────────────────────────────────────────────────
export const rewardCapabilityAssessmentRouter = router({

  // ── getStatus ───────────────────────────────────────────────────────────────
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    // Check Stage 5 is complete
    const [portfolio] = await db
      .select({ selectedInitiativesJson: rewardInitiativePortfolio.selectedInitiativesJson, isCompleted: rewardInitiativePortfolio.isCompleted })
      .from(rewardInitiativePortfolio)
      .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

    const canStart = !!portfolio?.isCompleted;
    const initiativeIds: string[] = portfolio?.selectedInitiativesJson ?? [];

    // Load saved dimension rows
    const savedRows = await db
      .select()
      .from(rewardCapabilityDimensions)
      .where(eq(rewardCapabilityDimensions.tenantId, tenantId));

    // Load stage row
    const [stage] = await db
      .select()
      .from(rewardCapabilityStage)
      .where(eq(rewardCapabilityStage.tenantId, tenantId));

    // Compute required levels from portfolio
    // Load FCA flag from company profile
    const [profileForGate] = await db
      .select({ fcaSysc19InScope: companyProfile.fcaSysc19InScope })
      .from(companyProfile)
      .where(eq(companyProfile.tenantId, tenantId));
    const fcaSysc19 = profileForGate?.fcaSysc19InScope === "yes";

    // Load custom initiatives in portfolio and build their capability profiles
    const customInPortfolio = await db
      .select()
      .from(rewardCustomInitiative)
      .where(and(eq(rewardCustomInitiative.tenantId, tenantId), eq(rewardCustomInitiative.inPortfolio, 1)));
    const customProfiles: CustomInitiativeCapabilityProfile[] = customInPortfolio.map((ci) => ({
      id: ci.id,
      capabilityProfile: {
        dataIntensity: (ci.capDataIntensity ?? "medium") as "low" | "medium" | "high",
        changeImpact: (ci.capChangeImpact ?? "medium") as "low" | "medium" | "high",
        integrationNeed: (ci.capIntegrationNeed ?? "medium") as "low" | "medium" | "high",
        governanceSensitivity: (ci.capGovernanceSensitivity ?? "medium") as "low" | "medium" | "high",
      },
    }));

    // Merge library IDs + custom initiative IDs for portfolio breadth
    const allIds = [...initiativeIds, ...customInPortfolio.map((ci) => ci.id)];
    const requirements = computeRequiredLevels(allIds, { fcaSysc19, customProfiles });

    // Merge saved rows with requirements
    const dimensions = requirements.map((req) => {
      const saved = savedRows.find((r) => r.dimension === req.dimension);
      if (saved) {
        return rowToDimension({ ...saved, requiredLevel: req.requiredLevel });
      }
      return {
        dimension: req.dimension,
        label: req.label,
        description: req.description,
        requiredLevel: req.requiredLevel,
        currentLevel: null,
        gapStatus: null,
        gapStatement: null,
        gapStatementAiOriginal: null,
        actionNote: null,
        actionNoteAiOriginal: null,
        isChallenged: false,
        challengeNote: null,
        owner: null,
        updatedAt: null,
      };
    });

    // Derive sequencing flags from current assessments
    const assessedDimensions = dimensions.map((d) => ({
      dimension: d.dimension,
      gapStatus: d.gapStatus,
      requiredLevel: d.requiredLevel,
    }));
    const sequencingFlags = deriveSequencingFlags(initiativeIds, assessedDimensions);

    // Compute enablement cost (pass requiredLevel for very_high critical band)
    const enablementCost = stage?.enablementCostJson ?? computeEnablementCost(assessedDimensions);

    return {
      canStart,
      stage: {
        isConfirmed: stage?.isConfirmed === 1,
        confirmedAt: stage?.confirmedAt ?? null,
        isStale: stage?.isStale === 1,
        sequencingFlagsJson: stage?.sequencingFlagsJson ?? null,
        capabilityRiskNoteJson: stage?.capabilityRiskNoteJson ?? null,
      },
      dimensions,
      sequencingFlags,
      enablementCost,
      initiativeIds,
    };
  }),

  // ── generateAssessment ──────────────────────────────────────────────────────
  generateAssessment: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const [portfolio] = await db
      .select({ selectedInitiativesJson: rewardInitiativePortfolio.selectedInitiativesJson, isCompleted: rewardInitiativePortfolio.isCompleted })
      .from(rewardInitiativePortfolio)
      .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

    if (!portfolio?.isCompleted) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete Stage 5 before generating capability assessment." });
    }

    const initiativeIds: string[] = portfolio.selectedInitiativesJson ?? [];

    // Load FCA flag and Stage 1 maturity inputs for seeding
    const [profileForGen] = await db
      .select({ fcaSysc19InScope: companyProfile.fcaSysc19InScope })
      .from(companyProfile)
      .where(eq(companyProfile.tenantId, tenantId));
    const [preworkForGen] = await db
      .select({
        rewardFunctionMaturityRating: rewardPrework.rewardFunctionMaturityRating,
        aiMaturityInRewardToday: rewardPrework.aiMaturityInRewardToday,
      })
      .from(rewardPrework)
      .where(eq(rewardPrework.tenantId, tenantId));

    const fcaSysc19ForGen = profileForGen?.fcaSysc19InScope === "yes";
    const seededLevels = seedCurrentLevelsFromMaturity(
      preworkForGen?.rewardFunctionMaturityRating,
      preworkForGen?.aiMaturityInRewardToday,
    );

    // Load custom initiatives in portfolio
    const customInPortfolioForGen = await db
      .select()
      .from(rewardCustomInitiative)
      .where(and(eq(rewardCustomInitiative.tenantId, tenantId), eq(rewardCustomInitiative.inPortfolio, 1)));
    const customProfilesForGen: CustomInitiativeCapabilityProfile[] = customInPortfolioForGen.map((ci) => ({
      id: ci.id,
      capabilityProfile: {
        dataIntensity: (ci.capDataIntensity ?? "medium") as "low" | "medium" | "high",
        changeImpact: (ci.capChangeImpact ?? "medium") as "low" | "medium" | "high",
        integrationNeed: (ci.capIntegrationNeed ?? "medium") as "low" | "medium" | "high",
        governanceSensitivity: (ci.capGovernanceSensitivity ?? "medium") as "low" | "medium" | "high",
      },
    }));
    const allIdsForGen = [...initiativeIds, ...customInPortfolioForGen.map((ci) => ci.id)];

    const requirements = computeRequiredLevels(allIdsForGen, { fcaSysc19: fcaSysc19ForGen, customProfiles: customProfilesForGen });
    const context = await buildContextString(tenantId);

    const libraryTitles = initiativeIds
      .map((id) => getRewardInitiative(id)?.title)
      .filter(Boolean);
    const customTitles = customInPortfolioForGen.map((ci) => ci.title + " (custom)");
    const initiativeTitles = [...libraryTitles, ...customTitles].join(", ");

    const dimensionSummary = requirements
      .map((r) => `${r.label} (required: ${r.requiredLevel})`)
      .join(", ");

    const systemPrompt = `You are a senior HR technology consultant assessing an organisation's capability to deliver a Reward AI programme.
For each capability dimension, write:
1. A concise gap statement (1-2 sentences) describing the likely current state and gap. If the organisation's data maturity or change capacity is known, reference it. Do NOT invent specific numbers.
2. A concise action note (1-2 sentences) describing the most important enablement action.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY valid JSON matching the schema provided.`;

    const userPrompt = `Organisation context:
${context}

Portfolio initiatives: ${initiativeTitles}

Capability dimensions to assess: ${dimensionSummary}

For each dimension, provide a gap_statement and action_note. Be specific to the organisation context where possible. Do not fabricate baseline numbers.

Output JSON:
{
  "dimensions": [
    {
      "dimension": "<dimension_id>",
      "gap_statement": "<1-2 sentence gap statement>",
      "action_note": "<1-2 sentence action>"
    }
  ]
}`;

    type AiDimension = { dimension: string; gap_statement: string; action_note: string };
    let aiDimensions: AiDimension[] = [];

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
      aiDimensions = (parsed.dimensions ?? []) as AiDimension[];
    } catch {
      // Fall through — return empty AI suggestions, manual entry still works
    }

    const now = Date.now();
    const created: ReturnType<typeof rowToDimension>[] = [];

    for (const req of requirements) {
      const aiData = aiDimensions.find((d) => d.dimension === req.dimension);
      const gapStatement = aiData?.gap_statement ? enforceVocab(aiData.gap_statement) : null;
      const actionNote = aiData?.action_note ? enforceVocab(aiData.action_note) : null;

      // Check if row already exists
      const [existing] = await db
        .select()
        .from(rewardCapabilityDimensions)
        .where(and(
          eq(rewardCapabilityDimensions.tenantId, tenantId),
          eq(rewardCapabilityDimensions.dimension, req.dimension),
        ));

      if (existing) {
        // Only update required level and AI originals — don't overwrite Maya's edits
        await db.update(rewardCapabilityDimensions)
          .set({
            requiredLevel: req.requiredLevel,
            gapStatementAiOriginal: gapStatement,
            actionNoteAiOriginal: actionNote,
            // Only set gapStatement/actionNote if Maya hasn't edited them yet
            ...(existing.gapStatement === null && gapStatement ? { gapStatement } : {}),
            ...(existing.actionNote === null && actionNote ? { actionNote } : {}),
            updatedAt: now,
          })
          .where(and(
            eq(rewardCapabilityDimensions.tenantId, tenantId),
            eq(rewardCapabilityDimensions.dimension, req.dimension),
          ));
      } else {
        // Seed current level from Stage 1 maturity inputs (provisional estimate)
        const seeded = seededLevels[req.dimension as CapabilityDimension];
        const seededCurrentLevel = seeded?.level ?? null;
        const seededGapStatus = deriveGapStatus(req.requiredLevel, seededCurrentLevel);

        await db.insert(rewardCapabilityDimensions).values({
          tenantId,
          dimension: req.dimension,
          userId: ctx.user.id,
          requiredLevel: req.requiredLevel,
          currentLevel: seededCurrentLevel,
          gapStatus: seededGapStatus,
          gapStatement,
          gapStatementAiOriginal: gapStatement,
          actionNote,
          actionNoteAiOriginal: actionNote,
          isChallenged: 0,
          challengeNote: null,
          owner: null,
          updatedAt: now,
        });
      }

      const [row] = await db
        .select()
        .from(rewardCapabilityDimensions)
        .where(and(
          eq(rewardCapabilityDimensions.tenantId, tenantId),
          eq(rewardCapabilityDimensions.dimension, req.dimension),
        ));
      if (row) created.push(rowToDimension(row));
    }

    return { dimensions: created };
  }),

  // ── saveDimension ────────────────────────────────────────────────────────────
  saveDimension: protectedProcedure
    .input(z.object({
      dimension: z.enum(CAPABILITY_DIMENSIONS),
      currentLevel: z.enum(["low", "medium", "high", "very_high"]).optional().nullable(),
      gapStatement: z.string().max(2000).optional().nullable(),
      actionNote: z.string().max(2000).optional().nullable(),
      owner: z.string().max(255).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const now = Date.now();

      // Compute gap status from required level
      const [existing] = await db
        .select()
        .from(rewardCapabilityDimensions)
        .where(and(
          eq(rewardCapabilityDimensions.tenantId, tenantId),
          eq(rewardCapabilityDimensions.dimension, input.dimension),
        ));

      const requiredLevel = (existing?.requiredLevel ?? "medium") as CapabilityLevel;
      const currentLevel = (input.currentLevel ?? existing?.currentLevel ?? null) as CapabilityLevel | null;
      const gapStatus = deriveGapStatus(requiredLevel, currentLevel);

      const updateData = {
        ...(input.currentLevel !== undefined ? { currentLevel: input.currentLevel } : {}),
        ...(gapStatus !== null ? { gapStatus } : {}),
        ...(input.gapStatement !== undefined ? {
          gapStatement: input.gapStatement,
          // Editing clears challenge flag
          isChallenged: 0 as const,
          challengeNote: null,
        } : {}),
        ...(input.actionNote !== undefined ? { actionNote: input.actionNote } : {}),
        ...(input.owner !== undefined ? { owner: input.owner } : {}),
        updatedAt: now,
      };

      if (existing) {
        await db.update(rewardCapabilityDimensions)
          .set(updateData)
          .where(and(
            eq(rewardCapabilityDimensions.tenantId, tenantId),
            eq(rewardCapabilityDimensions.dimension, input.dimension),
          ));
      } else {
        // Create row with defaults
        const [portfolio] = await db
          .select({ selectedInitiativesJson: rewardInitiativePortfolio.selectedInitiativesJson })
          .from(rewardInitiativePortfolio)
          .where(eq(rewardInitiativePortfolio.tenantId, tenantId));
        const initiativeIds: string[] = portfolio?.selectedInitiativesJson ?? [];
        const requirements = computeRequiredLevels(initiativeIds);
        const req = requirements.find((r) => r.dimension === input.dimension);

        await db.insert(rewardCapabilityDimensions).values({
          tenantId,
          dimension: input.dimension,
          userId: ctx.user.id,
          requiredLevel: req?.requiredLevel ?? "medium",
          currentLevel: input.currentLevel ?? null,
          gapStatus,
          gapStatement: input.gapStatement ?? null,
          gapStatementAiOriginal: null,
          actionNote: input.actionNote ?? null,
          actionNoteAiOriginal: null,
          isChallenged: 0,
          challengeNote: null,
          owner: input.owner ?? null,
          updatedAt: now,
        });
      }

      const [updated] = await db
        .select()
        .from(rewardCapabilityDimensions)
        .where(and(
          eq(rewardCapabilityDimensions.tenantId, tenantId),
          eq(rewardCapabilityDimensions.dimension, input.dimension),
        ));

      return { dimension: updated ? rowToDimension(updated) : null };
    }),

  // ── affordance ───────────────────────────────────────────────────────────────
  affordance: protectedProcedure
    .input(z.object({
      dimension: z.enum(CAPABILITY_DIMENSIONS),
      field: z.enum(["gapStatement", "actionNote"]),
      action: z.enum(["expand", "refine", "challenge", "suggest"]),
      currentText: z.string().max(2000).optional(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const context = await buildContextString(tenantId);
      const dimMeta = DIMENSION_META[input.dimension];

      const fieldLabel = input.field === "gapStatement" ? "gap statement" : "action note";

      const actionInstructions: Record<string, string> = {
        expand: `Expand the ${fieldLabel} with more specific detail. Keep it factual and grounded in the organisation context.`,
        refine: `Refine the ${fieldLabel} to be more precise and concise. Remove vague language.`,
        challenge: `Challenge the ${fieldLabel}: identify if it overstates the gap, understates the risk, or contains assumptions that need validation. Return a revised version that is more honest.`,
        suggest: `Suggest a fresh ${fieldLabel} for this dimension, grounded in the organisation context.`,
      };

      const systemPrompt = `You are a senior HR technology consultant. Respond with ONLY the revised text — no preamble, no quotes, no markdown.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.`;

      const userPrompt = `Organisation context:
${context}

Capability dimension: ${dimMeta.label} — ${dimMeta.description}

Current ${fieldLabel}: ${input.currentText ?? "(none)"}

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
          message: `Couldn't ${input.action} the ${fieldLabel} — you can edit the text manually.`,
        });
      }

      // For "challenge" action, mark dimension as challenged
      if (input.action === "challenge") {
        await db.update(rewardCapabilityDimensions)
          .set({ isChallenged: 1, challengeNote: result, updatedAt: Date.now() })
          .where(and(
            eq(rewardCapabilityDimensions.tenantId, tenantId),
            eq(rewardCapabilityDimensions.dimension, input.dimension),
          ));
      }

      return { result };
    }),

  // ── confirm ──────────────────────────────────────────────────────────────────
  confirm: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const [portfolio] = await db
      .select({ selectedInitiativesJson: rewardInitiativePortfolio.selectedInitiativesJson, isCompleted: rewardInitiativePortfolio.isCompleted })
      .from(rewardInitiativePortfolio)
      .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

    if (!portfolio?.isCompleted) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete Stage 5 before confirming Stage 8." });
    }

    const initiativeIds: string[] = portfolio.selectedInitiativesJson ?? [];

    // Must have at least one dimension assessed
    const assessedRows = await db
      .select()
      .from(rewardCapabilityDimensions)
      .where(eq(rewardCapabilityDimensions.tenantId, tenantId));

    if (assessedRows.length === 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Assess at least one capability dimension before confirming Stage 8.",
      });
    }

    // Compute final sequencing flags and enablement cost
    // Load requirements for requiredLevel (needed for very_high critical band in enablement cost)
    const [portfolioForConfirm] = await db
      .select({ selectedInitiativesJson: rewardInitiativePortfolio.selectedInitiativesJson })
      .from(rewardInitiativePortfolio)
      .where(eq(rewardInitiativePortfolio.tenantId, tenantId));
    const [profileForConfirm] = await db
      .select({ fcaSysc19InScope: companyProfile.fcaSysc19InScope })
      .from(companyProfile)
      .where(eq(companyProfile.tenantId, tenantId));
    const requirementsForConfirm = computeRequiredLevels(
      portfolioForConfirm?.selectedInitiativesJson ?? [],
      { fcaSysc19: profileForConfirm?.fcaSysc19InScope === "yes" }
    );
    const reqMap = new Map(requirementsForConfirm.map((r) => [r.dimension, r.requiredLevel]));

    const assessedDimensions = assessedRows.map((r) => ({
      dimension: r.dimension as CapabilityDimension,
      gapStatus: (r.gapStatus as GapStatus | null) ?? null,
      requiredLevel: (reqMap.get(r.dimension as CapabilityDimension) ?? r.requiredLevel) as CapabilityLevel,
    }));
    const sequencingFlags = deriveSequencingFlags(initiativeIds, assessedDimensions);
    const enablementCost = computeEnablementCost(assessedDimensions);
    const capabilityRiskNote = buildCapabilityRiskNote(sequencingFlags);

    const now = Date.now();
    const [existing] = await db
      .select({ tenantId: rewardCapabilityStage.tenantId })
      .from(rewardCapabilityStage)
      .where(eq(rewardCapabilityStage.tenantId, tenantId));

    if (existing) {
      await db.update(rewardCapabilityStage)
        .set({
          isConfirmed: 1,
          confirmedAt: now,
          isStale: 0,
          sequencingFlagsJson: sequencingFlags,
          enablementCostJson: enablementCost,
          capabilityRiskNoteJson: capabilityRiskNote ?? undefined,
          updatedAt: now,
        })
        .where(eq(rewardCapabilityStage.tenantId, tenantId));
    } else {
      await db.insert(rewardCapabilityStage).values({
        tenantId,
        userId: ctx.user.id,
        isConfirmed: 1,
        confirmedAt: now,
        isStale: 0,
        sequencingFlagsJson: sequencingFlags,
        enablementCostJson: enablementCost,
        capabilityRiskNoteJson: capabilityRiskNote ?? undefined,
        updatedAt: now,
      });
    }

    return { ok: true, confirmedAt: now, sequencingFlags, enablementCost };
  }),

  // ── markStale ────────────────────────────────────────────────────────────────
  markStale: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const [stage] = await db
      .select({ isConfirmed: rewardCapabilityStage.isConfirmed })
      .from(rewardCapabilityStage)
      .where(eq(rewardCapabilityStage.tenantId, tenantId));

    if (stage?.isConfirmed) {
      await db.update(rewardCapabilityStage)
        .set({ isStale: 1, updatedAt: Date.now() })
        .where(eq(rewardCapabilityStage.tenantId, tenantId));
    }

    return { ok: true };
  }),

  // ── keepAsIs ─────────────────────────────────────────────────────────────────
  keepAsIs: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    await db.update(rewardCapabilityStage)
      .set({ isStale: 0, updatedAt: Date.now() })
      .where(eq(rewardCapabilityStage.tenantId, tenantId));

    return { ok: true };
  }),

  // ── rateCustomInitiative ────────────────────────────────────────────────────────────
  /** Save user-supplied capability ratings for a custom initiative (E2) */
  rateCustomInitiative: protectedProcedure
    .input(z.object({
      id: z.string(),
      dataIntensity: z.enum(["low", "medium", "high"]),
      changeImpact: z.enum(["low", "medium", "high"]),
      integrationNeed: z.enum(["low", "medium", "high"]),
      governanceSensitivity: z.enum(["low", "medium", "high"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [ci] = await db
        .select({ id: rewardCustomInitiative.id })
        .from(rewardCustomInitiative)
        .where(and(eq(rewardCustomInitiative.id, input.id), eq(rewardCustomInitiative.tenantId, tenantId)));
      if (!ci) throw new TRPCError({ code: "NOT_FOUND", message: "Custom initiative not found" });

      await db.update(rewardCustomInitiative)
        .set({
          capDataIntensity: input.dataIntensity,
          capChangeImpact: input.changeImpact,
          capIntegrationNeed: input.integrationNeed,
          capGovernanceSensitivity: input.governanceSensitivity,
          capabilityRated: 1,
          updatedAt: Date.now(),
        })
        .where(and(eq(rewardCustomInitiative.id, input.id), eq(rewardCustomInitiative.tenantId, tenantId)));

      // Mark Stage 8 as stale so required levels recompute
      await db.update(rewardCapabilityStage)
        .set({ isStale: 1, updatedAt: Date.now() })
        .where(eq(rewardCapabilityStage.tenantId, tenantId));

      return { ok: true };
    }),

  // ── computeFromAssessments ─────────────────────────────────────────────────
  /**
   * Aggregate team assessment scores into a team capability snapshot and
   * derive suggested Stage 8 people-dimension levels.
   *
   * This procedure:
   *   1. Loads all active users in the tenant.
   *   2. For each user, fetches their most recent completed assessment score.
   *   3. Calls aggregateTeamCapability (pure) to compute domain means + derived levels.
   *   4. Persists a reward_team_capability_snapshots row.
   *   5. Returns the snapshot + suggested levels + provenance strings.
   *
   * The caller (Stage 8 UI) decides whether to apply the suggested levels to
   * reward_capability_dimensions rows — this procedure never writes to that table.
   */
  computeFromAssessments: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    // 1. Load all active users in tenant
    const teamMembers = await db
      .select({ userId: users.id })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.status, "active")));

    // 2. For each user, fetch their most recent completed assessment score
    const userScores: UserDomainScores[] = [];
    for (const member of teamMembers) {
      // Find the most recent completed session
      const [latestSession] = await db
        .select({ id: assessmentSessions.id })
        .from(assessmentSessions)
        .where(and(
          eq(assessmentSessions.userId, member.userId),
          eq(assessmentSessions.tenantId, tenantId),
          eq(assessmentSessions.state, "completed"),
        ))
        .orderBy(desc(assessmentSessions.completedAt))
        .limit(1);

      if (!latestSession) continue;

      // Fetch the score for that session
      const [scoreRow] = await db
        .select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson })
        .from(assessmentScores)
        .where(eq(assessmentScores.sessionId, latestSession.id))
        .limit(1);

      if (!scoreRow) continue;

      // Parse domain scores from scoreBreakdownJson
      const breakdown = typeof scoreRow.scoreBreakdownJson === "string"
        ? JSON.parse(scoreRow.scoreBreakdownJson as string)
        : (scoreRow.scoreBreakdownJson ?? {}) as Record<string, unknown>;
      const rawCaps = breakdown.capabilityScores as Record<string, unknown> | undefined;
      if (!rawCaps) continue;

      const scores: Partial<Record<AssessmentDomain, number>> = {};
      for (const [k, v] of Object.entries(rawCaps)) {
        const num = typeof v === "number" ? v : (v as any)?.score;
        if (typeof num === "number" && isFinite(num)) {
          scores[k as AssessmentDomain] = Math.min(100, Math.max(0, num));
        }
      }

      userScores.push({ userId: member.userId, scores });
    }

    // 3. Aggregate
    const aggregate = aggregateTeamCapability(teamMembers, userScores, CAPABILITY_LINK_CONFIG);

    // 4. Persist snapshot
    const snapshotId = nanoid();
    const now = Date.now();
    await db.insert(rewardTeamCapabilitySnapshots).values({
      id: snapshotId,
      tenantId,
      teamSize: aggregate.teamSize,
      assessedCount: aggregate.assessedCount,
      coverageFraction: String(aggregate.coverageFraction) as any,
      domainMeansJson: aggregate.domainMeans as any,
      domainCountsJson: aggregate.domainCounts as any,
      derivedLevelsJson: aggregate.derivedLevels as any,
      provenanceJson: aggregate.provenance as any,
      computedAt: now,
    });

    // 5. Return snapshot + suggested levels + provenance
    return {
      snapshotId,
      teamSize: aggregate.teamSize,
      assessedCount: aggregate.assessedCount,
      coverageFraction: aggregate.coverageFraction,
      isLowCoverage: aggregate.isLowCoverage,
      domainMeans: aggregate.domainMeans,
      domainCounts: aggregate.domainCounts,
      suggestedLevels: aggregate.derivedLevels,
      provenance: aggregate.provenance,
      computedAt: now,
    };
  }),

  // ── getLatestSnapshot ─────────────────────────────────────────────────────────
  /** Return the most recent team capability snapshot for this tenant, if any. */
  getLatestSnapshot: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const [row] = await db
      .select()
      .from(rewardTeamCapabilitySnapshots)
      .where(eq(rewardTeamCapabilitySnapshots.tenantId, tenantId))
      .orderBy(desc(rewardTeamCapabilitySnapshots.computedAt))
      .limit(1);

    if (!row) return null;

    return {
      snapshotId: row.id,
      teamSize: row.teamSize,
      assessedCount: row.assessedCount,
      coverageFraction: parseFloat(String(row.coverageFraction)),
      isLowCoverage: parseFloat(String(row.coverageFraction)) < CAPABILITY_LINK_CONFIG.lowCoverageThreshold,
      domainMeans: row.domainMeansJson as Record<string, number | null>,
      domainCounts: row.domainCountsJson as Record<string, number>,
      suggestedLevels: row.derivedLevelsJson as Record<string, string | null>,
      provenance: row.provenanceJson as Record<string, string>,
      computedAt: row.computedAt,
    };
  }),

  // ── getCustomInitiativeCapability ──────────────────────────────────────────────────
  /** Get capability ratings for all custom initiatives in portfolio (for E2 UI prompt) */
  getCustomInitiativeCapability: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const rows = await db
      .select({
        id: rewardCustomInitiative.id,
        title: rewardCustomInitiative.title,
        capabilityRated: rewardCustomInitiative.capabilityRated,
        capDataIntensity: rewardCustomInitiative.capDataIntensity,
        capChangeImpact: rewardCustomInitiative.capChangeImpact,
        capIntegrationNeed: rewardCustomInitiative.capIntegrationNeed,
        capGovernanceSensitivity: rewardCustomInitiative.capGovernanceSensitivity,
      })
      .from(rewardCustomInitiative)
      .where(and(eq(rewardCustomInitiative.tenantId, tenantId), eq(rewardCustomInitiative.inPortfolio, 1)));

    return rows.map((ci) => ({
      id: ci.id,
      title: ci.title,
      isRated: ci.capabilityRated === 1,
      dataIntensity: (ci.capDataIntensity ?? "medium") as "low" | "medium" | "high",
      changeImpact: (ci.capChangeImpact ?? "medium") as "low" | "medium" | "high",
      integrationNeed: (ci.capIntegrationNeed ?? "medium") as "low" | "medium" | "high",
      governanceSensitivity: (ci.capGovernanceSensitivity ?? "medium") as "low" | "medium" | "high",
    }));
  }),
});
