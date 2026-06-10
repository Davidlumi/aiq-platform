/**
 * Reward Stage 6 — Success Measures Router
 *
 * Procedures:
 *   getStatus            — returns { canStart, stage, measures[], strategyOutcomes }
 *   generateMeasures     — AI pre-populate suggested measures for all portfolio initiatives
 *   saveMeasure          — create or update a single measure (upsert by measureId)
 *   deleteMeasure        — soft-delete (archive) a measure
 *   reorderMeasures      — update sort_order for measures within an initiative
 *   affordance           — apply Expand/Refine/Challenge/Suggest to a measure field
 *   saveStrategyOutcomes — save strategy-level outcome statements
 *   confirm              — mark Stage 6 as confirmed (gate for Stage 7)
 *   markStale            — called when Stage 5 portfolio changes
 *   keepAsIs             — resolve stale banner without changes
 */

import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { strategyRewardProcedure as protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  companyProfile,
  rewardPrework,
  rewardVision,
  rewardStrategy,
  rewardInitiativePortfolio,
  rewardSuccessMeasures,
  rewardSuccessMeasuresStage,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { assertLLMRateLimit } from "../_core/llmRateLimit";
import { TRPCError } from "@trpc/server";
import {
  getRewardInitiative,
  REWARD_INITIATIVE_LIBRARY,
  type SuggestedMeasure,
} from "../../shared/rewardInitiativeLibrary";
import { VOCAB_BLACKLIST, sanitizeOutput as enforceVocab } from "../../shared/vocabBlacklist";

// ── Measure soft cap ──────────────────────────────────────────────────────────
const MAX_MEASURES_PER_INITIATIVE = 3;

// ── Value link options ────────────────────────────────────────────────────────
const VALUE_LINK_OPTIONS = ["efficiency", "decision_quality", "risk_mitigation", "retention", "strategic"] as const;
type ValueLink = typeof VALUE_LINK_OPTIONS[number];

// ── Context builder ───────────────────────────────────────────────────────────
async function buildContextString(tenantId: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

  const [profile] = await db.select().from(companyProfile).where(eq(companyProfile.tenantId, tenantId));
  const [prework] = await db.select().from(rewardPrework).where(eq(rewardPrework.tenantId, tenantId));
  const [vision] = await db.select({ visionText: rewardVision.visionText }).from(rewardVision).where(eq(rewardVision.tenantId, tenantId));
  const [strategy] = await db.select({ strategicShiftsJson: rewardStrategy.strategicShiftsJson }).from(rewardStrategy).where(eq(rewardStrategy.tenantId, tenantId));

  const parts: string[] = [];
  if (profile) {
    parts.push(`Company: ${profile.companyName ?? "Unknown"}`);
    if (profile.sector) parts.push(`Sector: ${profile.sector}`);
    if (profile.ukEmployeeHeadcount) parts.push(`Headcount: ~${profile.ukEmployeeHeadcount}`);
  }
  if (prework) {
    if (prework.rewardAiAmbition) parts.push(`Reward AI ambition: ${prework.rewardAiAmbition}/4`);
    if (prework.primaryTriggerForRewardAiStrategy) parts.push(`Primary trigger: ${prework.primaryTriggerForRewardAiStrategy}`);
  }
  if (vision?.visionText) parts.push(`\nConfirmed vision:\n${vision.visionText}`);
  if (strategy?.strategicShiftsJson) {
    const shifts = strategy.strategicShiftsJson as Array<{ text: string }>;
    if (shifts.length) parts.push(`\nConfirmed strategic shifts:\n${shifts.map(s => `- ${s.text}`).join("\n")}`);
  }
  return parts.join("\n");
}

// ── Measure row type ──────────────────────────────────────────────────────────
export interface MeasureRow {
  measureId: string;
  initiativeId: string;
  name: string;
  baselineType: "to_be_established" | "known" | "external_reference";
  baselineValue: string | null;
  baselineSourceNote: string | null;
  target: string | null;
  timeframe: string | null;
  howMeasured: string | null;
  valueLink: ValueLink | null;
  isChallenged: boolean;
  challengeNote: string | null;
  isEdited: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  rejectionReason: string | null;
  sortOrder: number;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number | null;
}

function rowToMeasure(r: typeof rewardSuccessMeasures.$inferSelect): MeasureRow {
  return {
    measureId: r.measureId,
    initiativeId: r.initiativeId,
    name: r.name,
    baselineType: (r.baselineType as MeasureRow["baselineType"]) ?? "to_be_established",
    baselineValue: r.baselineValue ?? null,
    baselineSourceNote: r.baselineSourceNote ?? null,
    target: r.target ?? null,
    timeframe: r.timeframe ?? null,
    howMeasured: r.howMeasured ?? null,
    valueLink: (r.valueLink as ValueLink | null) ?? null,
    isChallenged: !!r.isChallenged,
    challengeNote: r.challengeNote ?? null,
    isEdited: !!r.isEdited,
    isAccepted: !!r.isAccepted,
    isRejected: !!r.isRejected,
    rejectionReason: r.rejectionReason ?? null,
    sortOrder: r.sortOrder,
    isArchived: !!r.isArchived,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export const rewardSuccessMeasuresRouter = router({

  // ── getStatus ───────────────────────────────────────────────────────────────
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const [portfolio] = await db
      .select({ isCompleted: rewardInitiativePortfolio.isCompleted, selectedInitiativesJson: rewardInitiativePortfolio.selectedInitiativesJson })
      .from(rewardInitiativePortfolio)
      .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

    const portfolioComplete = !!portfolio?.isCompleted;
    const selectedIds: string[] = portfolio?.selectedInitiativesJson ?? [];

    const [stage] = await db
      .select()
      .from(rewardSuccessMeasuresStage)
      .where(eq(rewardSuccessMeasuresStage.tenantId, tenantId));

    // Load all non-archived measures for this tenant
    const allMeasures = await db
      .select()
      .from(rewardSuccessMeasures)
      .where(and(
        eq(rewardSuccessMeasures.tenantId, tenantId),
        eq(rewardSuccessMeasures.isArchived, 0),
      ));

    // Staleness cascade: archive measures for removed initiatives, note new ones
    const existingInitiativeIds = new Set(allMeasures.map(m => m.initiativeId));
    const selectedSet = new Set(selectedIds);

    const removedIds = Array.from(existingInitiativeIds).filter(id => !selectedSet.has(id));
    if (removedIds.length > 0) {
      await db.update(rewardSuccessMeasures)
        .set({ isArchived: 1, updatedAt: Date.now() })
        .where(and(
          eq(rewardSuccessMeasures.tenantId, tenantId),
          inArray(rewardSuccessMeasures.initiativeId, removedIds),
        ));
    }

    const newInitiativeIds = selectedIds.filter(id => !existingInitiativeIds.has(id));

    // Reload after archive
    const activeMeasures = await db
      .select()
      .from(rewardSuccessMeasures)
      .where(and(
        eq(rewardSuccessMeasures.tenantId, tenantId),
        eq(rewardSuccessMeasures.isArchived, 0),
      ));

    const stageState = stage?.isConfirmed
      ? (stage.isStale ? "stale" : "confirmed")
      : (stage ? "unconfirmed" : "not_started");

    return {
      canStart: portfolioComplete,
      blockedReason: portfolioComplete ? null : "Complete Stage 5 (Portfolio) before defining success measures.",
      stageState,
      isConfirmed: !!stage?.isConfirmed,
      isStale: !!stage?.isStale,
      selectedInitiativeIds: selectedIds,
      newInitiativeIds,
      measures: activeMeasures.map(rowToMeasure),
      strategyOutcomes: (stage?.strategyOutcomesJson as Array<{ id: string; text: string }> | null) ?? [],
      updatedAt: stage?.updatedAt ?? null,
    };
  }),

  // ── generateMeasures ────────────────────────────────────────────────────────
  generateMeasures: protectedProcedure
    .input(z.object({
      initiativeIds: z.array(z.string()).min(1).max(12),
    }))
    .mutation(async ({ ctx, input }) => {
      assertLLMRateLimit(ctx.user.id); // PROD-2.1
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [portfolio] = await db
        .select({ isCompleted: rewardInitiativePortfolio.isCompleted })
        .from(rewardInitiativePortfolio)
        .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

      if (!portfolio?.isCompleted) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete Stage 5 before generating success measures." });
      }

      const context = await buildContextString(tenantId);
      const now = Date.now();
      const created: MeasureRow[] = [];

      for (const initiativeId of input.initiativeIds) {
        // Check existing count for this initiative
        const existing = await db
          .select({ measureId: rewardSuccessMeasures.measureId })
          .from(rewardSuccessMeasures)
          .where(and(
            eq(rewardSuccessMeasures.tenantId, tenantId),
            eq(rewardSuccessMeasures.initiativeId, initiativeId),
            eq(rewardSuccessMeasures.isArchived, 0),
          ));

        if (existing.length >= MAX_MEASURES_PER_INITIATIVE) continue;

        const initiative = getRewardInitiative(initiativeId);
        if (!initiative) continue;

        const suggested: SuggestedMeasure[] = initiative.suggestedMeasures ?? [];
        const slotsAvailable = MAX_MEASURES_PER_INITIATIVE - existing.length;
        const toCreate = suggested.slice(0, slotsAvailable);

        // Try AI refinement of the suggested measures
        let refinedMeasures: Array<{
          name: string;
          baselineType: "to_be_established" | "external_reference";
          baselineValue: string | null;
          baselineSourceNote: string | null;
          target: string | null;
          timeframe: string | null;
          howMeasured: string | null;
          valueLink: string | null;
        }> = toCreate.map(s => ({
          name: s.name,
          baselineType: "to_be_established" as const,
          baselineValue: null,
          baselineSourceNote: null,
          target: s.suggestedTarget ?? null,
          timeframe: s.suggestedTimeframe ?? null,
          howMeasured: s.howMeasured ?? null,
          valueLink: s.valueLink ?? null,
        }));

        try {
          const systemPrompt = `You are a senior Reward Director defining success measures for an AI-powered Reward initiative.

CRITICAL RULES:
1. NEVER invent a baseline figure. If you don't know the organisation's actual baseline, set baselineType to "to_be_established".
2. If you suggest an industry-typical reference point, set baselineType to "external_reference" and explain the source in baselineSourceNote. Label it clearly as an external reference, NOT the organisation's actual figure.
3. Targets must be specific and measurable. Avoid vague targets like "improve" or "increase".
4. howMeasured must explain exactly how the metric is collected (system, frequency, who measures it).
5. Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
6. Output ONLY a JSON array — no preamble, no markdown fences.`;

          const userPrompt = `Organisation context:
${context}

Initiative: ${initiative.title}
Description: ${initiative.shortDescription}

Suggested measures (refine these for this specific organisation):
${JSON.stringify(toCreate, null, 2)}

For each measure, output a JSON object with these fields:
- name: string (concise, specific)
- baselineType: "to_be_established" | "external_reference" (NEVER "known" — only Maya knows her actual baseline)
- baselineValue: string | null (only if external_reference — label as industry reference)
- baselineSourceNote: string | null (source of external reference if used)
- target: string (specific and measurable)
- timeframe: string (e.g. "12 months post-go-live")
- howMeasured: string (system, frequency, owner)
- valueLink: "${VALUE_LINK_OPTIONS.join('" | "')}" | null

Output as a JSON array of ${toCreate.length} objects.`;

          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          });

          const raw = (response.choices?.[0]?.message?.content as string | undefined) ?? "{}";
          const parsed = JSON.parse(raw);
          const arr = Array.isArray(parsed) ? parsed : (parsed.measures ?? parsed.items ?? []);

          if (Array.isArray(arr) && arr.length > 0) {
            refinedMeasures = arr.slice(0, toCreate.length).map((m: Record<string, unknown>, i: number) => ({
              name: enforceVocab(String(m.name ?? toCreate[i]?.name ?? "")),
              baselineType: (m.baselineType === "external_reference" ? "external_reference" : "to_be_established") as "to_be_established" | "external_reference",
              baselineValue: m.baselineType === "external_reference" ? (String(m.baselineValue ?? "")) : null,
              baselineSourceNote: m.baselineType === "external_reference" ? (String(m.baselineSourceNote ?? "")) : null,
              target: enforceVocab(String(m.target ?? toCreate[i]?.suggestedTarget ?? "")),
              timeframe: enforceVocab(String(m.timeframe ?? toCreate[i]?.suggestedTimeframe ?? "")),
              howMeasured: enforceVocab(String(m.howMeasured ?? toCreate[i]?.howMeasured ?? "")),
              valueLink: VALUE_LINK_OPTIONS.includes(m.valueLink as ValueLink) ? (m.valueLink as string) : (toCreate[i]?.valueLink ?? null),
            }));
          }
        } catch {
          // AI failed — fall back to library defaults (still valid, no fabrication)
        }

        // Insert measures
        for (let i = 0; i < refinedMeasures.length; i++) {
          const m = refinedMeasures[i];
          const measureId = randomUUID();
          await db.insert(rewardSuccessMeasures).values({
            tenantId,
            measureId,
            initiativeId,
            name: m.name,
            baselineType: m.baselineType,
            baselineValue: m.baselineValue,
            baselineSourceNote: m.baselineSourceNote,
            target: m.target,
            timeframe: m.timeframe,
            howMeasured: m.howMeasured,
            valueLink: m.valueLink,
            isChallenged: 0,
            isEdited: 0,
            isAccepted: 0,
            isRejected: 0,
            sortOrder: existing.length + i + 1,
            isArchived: 0,
            createdAt: now,
            updatedAt: now,
          });

          const [inserted] = await db
            .select()
            .from(rewardSuccessMeasures)
            .where(and(
              eq(rewardSuccessMeasures.tenantId, tenantId),
              eq(rewardSuccessMeasures.measureId, measureId),
            ));
          if (inserted) created.push(rowToMeasure(inserted));
        }
      }

      return { created };
    }),

  // ── saveMeasure ─────────────────────────────────────────────────────────────
  saveMeasure: protectedProcedure
    .input(z.object({
      measureId: z.string().uuid().optional(), // omit to create new
      initiativeId: z.string().min(1),
      name: z.string().min(1).max(200),
      baselineType: z.enum(["to_be_established", "known", "external_reference"]),
      baselineValue: z.string().max(200).optional().nullable(),
      baselineSourceNote: z.string().max(400).optional().nullable(),
      target: z.string().max(200).optional().nullable(),
      timeframe: z.string().max(200).optional().nullable(),
      howMeasured: z.string().max(2000).optional().nullable(),
      valueLink: z.enum(VALUE_LINK_OPTIONS).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const now = Date.now();

      if (input.measureId) {
        // Update existing
        await db.update(rewardSuccessMeasures)
          .set({
            name: input.name,
            baselineType: input.baselineType,
            baselineValue: input.baselineValue ?? null,
            baselineSourceNote: input.baselineSourceNote ?? null,
            target: input.target ?? null,
            timeframe: input.timeframe ?? null,
            howMeasured: input.howMeasured ?? null,
            valueLink: input.valueLink ?? null,
            isEdited: 1,
            // C3: editing a challenged measure resolves the challenge flag
            isChallenged: 0,
            challengeNote: null,
            updatedAt: now,
          })
          .where(and(
            eq(rewardSuccessMeasures.tenantId, tenantId),
            eq(rewardSuccessMeasures.measureId, input.measureId),
          ));

        const [updated] = await db
          .select()
          .from(rewardSuccessMeasures)
          .where(and(
            eq(rewardSuccessMeasures.tenantId, tenantId),
            eq(rewardSuccessMeasures.measureId, input.measureId),
          ));
        return { measure: updated ? rowToMeasure(updated) : null };
      } else {
        // Create new — check soft cap
        const existing = await db
          .select({ measureId: rewardSuccessMeasures.measureId })
          .from(rewardSuccessMeasures)
          .where(and(
            eq(rewardSuccessMeasures.tenantId, tenantId),
            eq(rewardSuccessMeasures.initiativeId, input.initiativeId),
            eq(rewardSuccessMeasures.isArchived, 0),
          ));

        if (existing.length >= MAX_MEASURES_PER_INITIATIVE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Maximum ${MAX_MEASURES_PER_INITIATIVE} measures per initiative. Remove one before adding another.`,
          });
        }

        const measureId = randomUUID();
        await db.insert(rewardSuccessMeasures).values({
          tenantId,
          measureId,
          initiativeId: input.initiativeId,
          name: input.name,
          baselineType: input.baselineType,
          baselineValue: input.baselineValue ?? null,
          baselineSourceNote: input.baselineSourceNote ?? null,
          target: input.target ?? null,
          timeframe: input.timeframe ?? null,
          howMeasured: input.howMeasured ?? null,
          valueLink: input.valueLink ?? null,
          isChallenged: 0,
          isEdited: 1,
          isAccepted: 0,
          isRejected: 0,
          sortOrder: existing.length + 1,
          isArchived: 0,
          createdAt: now,
          updatedAt: now,
        });

        const [inserted] = await db
          .select()
          .from(rewardSuccessMeasures)
          .where(and(
            eq(rewardSuccessMeasures.tenantId, tenantId),
            eq(rewardSuccessMeasures.measureId, measureId),
          ));
        return { measure: inserted ? rowToMeasure(inserted) : null };
      }
    }),

  // ── deleteMeasure ────────────────────────────────────────────────────────────
  deleteMeasure: protectedProcedure
    .input(z.object({ measureId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.update(rewardSuccessMeasures)
        .set({ isArchived: 1, updatedAt: Date.now() })
        .where(and(
          eq(rewardSuccessMeasures.tenantId, tenantId),
          eq(rewardSuccessMeasures.measureId, input.measureId),
        ));

      return { ok: true };
    }),

  // ── reorderMeasures ──────────────────────────────────────────────────────────
  reorderMeasures: protectedProcedure
    .input(z.object({
      initiativeId: z.string(),
      orderedMeasureIds: z.array(z.string().uuid()).max(MAX_MEASURES_PER_INITIATIVE),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const now = Date.now();
      for (let i = 0; i < input.orderedMeasureIds.length; i++) {
        await db.update(rewardSuccessMeasures)
          .set({ sortOrder: i + 1, updatedAt: now })
          .where(and(
            eq(rewardSuccessMeasures.tenantId, tenantId),
            eq(rewardSuccessMeasures.measureId, input.orderedMeasureIds[i]),
            eq(rewardSuccessMeasures.initiativeId, input.initiativeId),
          ));
      }
      return { ok: true };
    }),

  // ── affordance ───────────────────────────────────────────────────────────────
  affordance: protectedProcedure
    .input(z.object({
      measureId: z.string().uuid(),
      field: z.enum(["name", "target", "howMeasured"]),
      actionType: z.enum(["expand", "refine", "challenge", "suggest"]),
      currentText: z.string().max(500),
      initiativeTitle: z.string().max(200),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const context = await buildContextString(tenantId);

      const fieldLabels: Record<string, string> = {
        name: "measure name",
        target: "target",
        howMeasured: "how measured",
      };

      const actionInstructions: Record<string, string> = {
        expand: `Expand this ${fieldLabels[input.field]} with more specificity. Make it more actionable and measurable.`,
        refine: `Tighten this ${fieldLabels[input.field]} for clarity. Remove vagueness. Keep it concise.`,
        challenge: `Challenge this ${fieldLabels[input.field]}. Is it a vanity metric? Is it gameable? Could it be gamed by hitting the number without achieving the underlying goal? Rewrite to be more robust.`,
        suggest: `Suggest an alternative ${fieldLabels[input.field]} that measures the same underlying outcome from a different angle.`,
      };

      const systemPrompt = `You are a senior Reward Director reviewing success measures for an AI Reward initiative.
CRITICAL: Never invent baseline figures. Focus on what is measurable and not gameable.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY the revised text — no preamble, no labels, no markdown.`;

      const userPrompt = `Organisation context:
${context}

Initiative: ${input.initiativeTitle}
Field: ${fieldLabels[input.field]}
Current text: ${input.currentText}

Task: ${actionInstructions[input.actionType]}

Output the result now (one sentence or short phrase):`;

      let result: string;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
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

      // Mark the measure as challenged if action is "challenge"
      if (input.actionType === "challenge") {
        const db = await getDb();
        if (db) {
          await db.update(rewardSuccessMeasures)
            .set({ isChallenged: 1, challengeNote: result, updatedAt: Date.now() })
            .where(and(
              eq(rewardSuccessMeasures.tenantId, tenantId),
              eq(rewardSuccessMeasures.measureId, input.measureId),
            ));
        }
      }

      return { result };
    }),

  // ── acceptMeasure / rejectMeasure ────────────────────────────────────────────
  acceptMeasure: protectedProcedure
    .input(z.object({ measureId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.update(rewardSuccessMeasures)
        .set({ isAccepted: 1, isRejected: 0, updatedAt: Date.now() })
        .where(and(
          eq(rewardSuccessMeasures.tenantId, tenantId),
          eq(rewardSuccessMeasures.measureId, input.measureId),
        ));

      return { ok: true };
    }),

  rejectMeasure: protectedProcedure
    .input(z.object({
      measureId: z.string().uuid(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.update(rewardSuccessMeasures)
        .set({ isRejected: 1, isAccepted: 0, rejectionReason: input.reason ?? null, isArchived: 1, updatedAt: Date.now() })
        .where(and(
          eq(rewardSuccessMeasures.tenantId, tenantId),
          eq(rewardSuccessMeasures.measureId, input.measureId),
        ));

      return { ok: true };
    }),

  // ── saveStrategyOutcomes ─────────────────────────────────────────────────────
  saveStrategyOutcomes: protectedProcedure
    .input(z.object({
      outcomes: z.array(z.object({
        id: z.string(),
        text: z.string().min(1).max(500),
      })).max(3),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const now = Date.now();
      const [existing] = await db
        .select({ tenantId: rewardSuccessMeasuresStage.tenantId })
        .from(rewardSuccessMeasuresStage)
        .where(eq(rewardSuccessMeasuresStage.tenantId, tenantId));

      if (existing) {
        await db.update(rewardSuccessMeasuresStage)
          .set({ strategyOutcomesJson: input.outcomes, updatedAt: now })
          .where(eq(rewardSuccessMeasuresStage.tenantId, tenantId));
      } else {
        await db.insert(rewardSuccessMeasuresStage).values({
          tenantId,
          userId: ctx.user.id,
          strategyOutcomesJson: input.outcomes,
          isConfirmed: 0,
          isStale: 0,
          updatedAt: now,
        });
      }

      return { ok: true };
    }),

  // ── generateStrategyOutcomes ─────────────────────────────────────────────────
  generateStrategyOutcomes: protectedProcedure.mutation(async ({ ctx }) => {
    assertLLMRateLimit(ctx.user.id); // PROD-2.1
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const context = await buildContextString(tenantId);

    const [portfolio] = await db
      .select({ selectedInitiativesJson: rewardInitiativePortfolio.selectedInitiativesJson })
      .from(rewardInitiativePortfolio)
      .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

    const selectedIds: string[] = portfolio?.selectedInitiativesJson ?? [];
    const initiativeTitles = selectedIds
      .map(id => getRewardInitiative(id)?.title)
      .filter(Boolean)
      .join(", ");

    const systemPrompt = `You are a senior Reward Director writing strategy-level outcome statements for a board pack.
Each outcome must be a single, specific, measurable sentence describing what success looks like for the overall Reward AI strategy.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY a JSON array of 2-3 outcome strings — no preamble, no markdown fences.`;

    const userPrompt = `Organisation context:
${context}

Portfolio initiatives: ${initiativeTitles}

Write 2-3 strategy-level outcome statements. Each should describe a measurable state the organisation will be in after successful delivery of the programme.

Examples of strong Reward AI strategy outcomes:
- "Within 18 months, 100% of pay decisions will be supported by AI-generated equity analysis, reducing unexplained pay gaps by 60%."
- "The annual merit cycle will be completed in 4 weeks (down from 14), with AI handling data gathering, modelling, and compliance checks."
- "Manager confidence in making fair pay decisions will increase from 45% to 85%, measured through quarterly pulse surveys."

Output as JSON array: ["outcome 1", "outcome 2", "outcome 3"]`;

    let outcomes: Array<{ id: string; text: string }> = [];
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });
      const raw = (response.choices?.[0]?.message?.content as string | undefined) ?? "[]";
      const parsed = JSON.parse(raw);
      const arr: string[] = Array.isArray(parsed) ? parsed : (parsed.outcomes ?? []);
      outcomes = arr.slice(0, 3).map((text: string) => ({
        id: randomUUID(),
        text: enforceVocab(text),
      }));
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Couldn't generate strategy outcomes — you can write them manually.",
      });
    }

    // Save AI originals
    const now = Date.now();
    const [existing] = await db
      .select({ tenantId: rewardSuccessMeasuresStage.tenantId })
      .from(rewardSuccessMeasuresStage)
      .where(eq(rewardSuccessMeasuresStage.tenantId, tenantId));

    if (existing) {
      await db.update(rewardSuccessMeasuresStage)
        .set({ strategyOutcomesJson: outcomes, strategyOutcomesAiOriginal: outcomes, updatedAt: now })
        .where(eq(rewardSuccessMeasuresStage.tenantId, tenantId));
    } else {
      await db.insert(rewardSuccessMeasuresStage).values({
        tenantId,
        userId: ctx.user.id,
        strategyOutcomesJson: outcomes,
        strategyOutcomesAiOriginal: outcomes,
        isConfirmed: 0,
        isStale: 0,
        updatedAt: now,
      });
    }

    return { outcomes };
  }),

  // ── confirm ──────────────────────────────────────────────────────────────────
  confirm: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    // Must have at least one measure for at least one initiative
    const [portfolio] = await db
      .select({ selectedInitiativesJson: rewardInitiativePortfolio.selectedInitiativesJson, isCompleted: rewardInitiativePortfolio.isCompleted })
      .from(rewardInitiativePortfolio)
      .where(eq(rewardInitiativePortfolio.tenantId, tenantId));

    if (!portfolio?.isCompleted) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete Stage 5 before confirming Stage 6." });
    }

    const activeMeasures = await db
      .select({ measureId: rewardSuccessMeasures.measureId })
      .from(rewardSuccessMeasures)
      .where(and(
        eq(rewardSuccessMeasures.tenantId, tenantId),
        eq(rewardSuccessMeasures.isArchived, 0),
      ));

    if (activeMeasures.length === 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Define at least one success measure before confirming Stage 6.",
      });
    }

    const now = Date.now();
    const [existing] = await db
      .select({ tenantId: rewardSuccessMeasuresStage.tenantId })
      .from(rewardSuccessMeasuresStage)
      .where(eq(rewardSuccessMeasuresStage.tenantId, tenantId));

    if (existing) {
      await db.update(rewardSuccessMeasuresStage)
        .set({ isConfirmed: 1, confirmedAt: now, isStale: 0, updatedAt: now })
        .where(eq(rewardSuccessMeasuresStage.tenantId, tenantId));
    } else {
      await db.insert(rewardSuccessMeasuresStage).values({
        tenantId,
        userId: ctx.user.id,
        isConfirmed: 1,
        confirmedAt: now,
        isStale: 0,
        updatedAt: now,
      });
    }

    return { ok: true, confirmedAt: now };
  }),

  // ── markStale ────────────────────────────────────────────────────────────────
  markStale: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const [stage] = await db
      .select({ isConfirmed: rewardSuccessMeasuresStage.isConfirmed })
      .from(rewardSuccessMeasuresStage)
      .where(eq(rewardSuccessMeasuresStage.tenantId, tenantId));

    if (stage?.isConfirmed) {
      await db.update(rewardSuccessMeasuresStage)
        .set({ isStale: 1, updatedAt: Date.now() })
        .where(eq(rewardSuccessMeasuresStage.tenantId, tenantId));
    }

    return { ok: true };
  }),

  // ── keepAsIs ─────────────────────────────────────────────────────────────────
  keepAsIs: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    await db.update(rewardSuccessMeasuresStage)
      .set({ isStale: 0, updatedAt: Date.now() })
      .where(eq(rewardSuccessMeasuresStage.tenantId, tenantId));

    return { ok: true };
  }),
});
