/**
 * AIQ Adaptive Assessment Engine — tRPC Router
 *
 * Implements the full adaptive 3-phase assessment flow:
 * - Phase 1 (Baseline): Serves static V9.2 canonical items in order
 * - Phase 2 (Adaptive): LLM-generated items targeting weak capabilities
 * - Phase 3 (Validation): Contradiction probes and confirmation items
 */

import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  assessmentAnswers,
  assessmentBlueprints,
  assessmentItemOptions,
  assessmentItems,
  assessmentScores,
  assessmentSessions,
  auditLogs,
  credibilityScores,
  decisionLogs,
  riskScores,
  userStates,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import {
  computeCapabilityScores,
  computeOverallScore,
  computeSignalScores,
  classifyReadiness,
  computeConfidenceProfile,
  detectFailureModes,
} from "../assessment/scoringEngine";
import {
  SessionController,
  MINIMUM_EVIDENCE,
  type AnswerData,
} from "../assessment/sessionController";
import {
  determineSessionPhase,
  generateAdaptiveItem,
  selectNextGenerationVariables,
  DEFAULT_ORG_INTENT,
  type AdaptiveSelectionContext,
  type InteractionType,
} from "../assessment/adaptiveEngine";
import { resolveRoleArchetype } from "../assessment/roleArchetypes";
import { detectContradictions, generateContradictionProbeSpec, type AnswerRecord } from "../assessment/contradictionEngine";
import { analyseGamingPatterns } from "../assessment/antiGamingEngine";
import type { CapabilityKey } from "../assessment/roleArchetypes";

// ─── Capability Display + Colour Maps ────────────────────────────────────────

const CAPABILITY_DISPLAY: Record<string, string> = {
  execution:           "AI Execution",
  judgement:           "AI Judgement",
  governance:          "AI Risk & Governance",
  appropriateness:     "AI Appropriateness",
  workflow:            "AI Workflow Application",
  data_interpretation: "AI Data & Insight",
};

const CAPABILITY_COLOURS: Record<string, string> = {
  execution:           "#4477AA",
  judgement:           "#AA3377",
  governance:          "#228833",
  appropriateness:     "#EE6677",
  workflow:            "#CCBB44",
  data_interpretation: "#66CCEE",
};

// ─── Helper: Enrich answers with item metadata ────────────────────────────────

async function enrichAnswers(
  answers: Array<{
    id: string;
    itemId: string;
    selectedValueJson: unknown;
    freeText: string | null;
    confidenceScore: unknown;
    timeToAnswerMs: number;
    outcomeClass: string | null;
    signalDeltasJson: unknown;
    eventCodesJson: unknown;
    revisionCount: number;
  }>,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<AnswerData[]> {
  return Promise.all(
    answers.map(async (a) => {
      const item = await db
        .select({ difficulty: assessmentItems.difficulty, metadataJson: assessmentItems.metadataJson })
        .from(assessmentItems)
        .where(eq(assessmentItems.id, a.itemId))
        .limit(1);
      let riskLevel = "Medium";
      let capabilityKey = "execution";
      let interactionType = "situational_judgement";
      let optionPosition: number | null = null;
      try {
        const meta = (typeof item[0]?.metadataJson === "string"
          ? JSON.parse(item[0].metadataJson as string)
          : (item[0]?.metadataJson ?? {})) as Record<string, unknown>;
        riskLevel = (meta.risk_level as string) ?? "Medium";
        capabilityKey = (meta.capability_key as string) ?? "execution";
        interactionType = (meta.interaction_type as string) ?? "situational_judgement";
      } catch {}
      if (a.selectedValueJson) {
        try {
          const selectedVal = typeof a.selectedValueJson === "string"
            ? JSON.parse(a.selectedValueJson as string)
            : a.selectedValueJson;
          const opts = await db
            .select({ value: assessmentItemOptions.value, optionOrder: assessmentItemOptions.optionOrder })
            .from(assessmentItemOptions)
            .where(eq(assessmentItemOptions.itemId, a.itemId));
          const opt = opts.find(o => o.value === selectedVal);
          optionPosition = opt?.optionOrder ?? null;
        } catch {}
      }
      // Safe JSON parse: MySQL JSON columns may return already-parsed values
      function safeJsonParse(val: unknown): unknown {
        if (val === null || val === undefined) return null;
        if (typeof val !== "string") return val; // already parsed by MySQL driver
        try { return JSON.parse(val); } catch { return val; } // return raw string if not valid JSON
      }
      return {
        itemId: a.itemId,
        selectedValue: a.selectedValueJson ? safeJsonParse(a.selectedValueJson) as string : null,
        freeText: a.freeText ?? undefined,
        confidenceScore: parseFloat(String(a.confidenceScore ?? "0.5")),
        timeToAnswerMs: a.timeToAnswerMs,
        outcomeClass: a.outcomeClass ?? null,
        signalDeltasJson: a.signalDeltasJson ?? {},
        eventCodesJson: a.eventCodesJson ?? [],
        riskLevel,
        difficulty: item[0]?.difficulty ?? 2,
        capabilityKey,
        interactionType,
        optionPosition,
      };
    })
  );
}

// ─── Helper: Get next static item ────────────────────────────────────────────

async function getNextStaticItem(
  blueprintId: string,
  answeredItemIds: string[],
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const allStaticItems = await db
    .select({ id: assessmentItems.id, metadataJson: assessmentItems.metadataJson })
    .from(assessmentItems)
    .where(
      and(
        eq(assessmentItems.blueprintId, blueprintId),
        eq(assessmentItems.status, "published")
      )
    );
  const unanswered = allStaticItems
    .filter(i => !answeredItemIds.includes(i.id))
    .sort((a, b) => {
      let ma: Record<string, unknown> = {}, mb: Record<string, unknown> = {};
      try { ma = (typeof a.metadataJson === "string" ? JSON.parse(a.metadataJson as string) : (a.metadataJson ?? {})) as Record<string, unknown>; } catch {}
      try { mb = (typeof b.metadataJson === "string" ? JSON.parse(b.metadataJson as string) : (b.metadataJson ?? {})) as Record<string, unknown>; } catch {}
      return ((ma.display_order as number) ?? 999) - ((mb.display_order as number) ?? 999);
    });
  if (unanswered.length === 0) return null;
  const nextItemFull = await db
    .select()
    .from(assessmentItems)
    .where(eq(assessmentItems.id, unanswered[0].id))
    .limit(1);
  if (!nextItemFull[0]) return null;
  const options = await db
    .select()
    .from(assessmentItemOptions)
    .where(eq(assessmentItemOptions.itemId, nextItemFull[0].id))
    .orderBy(assessmentItemOptions.optionOrder);
  let meta: Record<string, unknown> = {};
  try { meta = (typeof nextItemFull[0].metadataJson === "string" ? JSON.parse(nextItemFull[0].metadataJson as string) : (nextItemFull[0].metadataJson ?? {})) as Record<string, unknown>; } catch {}
  return {
    id: nextItemFull[0].id,
    itemType: nextItemFull[0].itemType,
    prompt: nextItemFull[0].prompt,
    difficulty: nextItemFull[0].difficulty,
    title: (meta.title as string) ?? "",
    scenario: (meta.scenario as string) ?? "",
    constraint: (meta.constraint as string) ?? "",
    question: (meta.question as string) ?? "What do you do?",
    capability: (meta.capability as string) ?? "",
    capabilityKey: (meta.capability_key as string) ?? "execution",
    workflow: (meta.workflow as string) ?? "",
    riskLevel: (meta.risk_level as string) ?? "Medium",
    interactionType: (meta.interaction_type as string) ?? "situational_judgement",
    interactionId: (meta.interaction_id as string) ?? "",
    primarySignal: (meta.primary_signal as string) ?? "",
    displayOrder: (meta.display_order as number) ?? 0,
    isGenerated: false,
    options: options.map(({ isCorrect: _ic, scoreWeight: _sw, signalDeltasJson: _sd, eventCodesJson: _ec, outcomeClass: _oc, ...o }) => o),
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const assessmentRouter = router({
  // ── List published blueprints ──────────────────────────────────────────────
  blueprints: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select()
      .from(assessmentBlueprints)
      .where(eq(assessmentBlueprints.status, "published"));
  }),

  // ── Get default blueprint ──────────────────────────────────────────────────
  defaultBlueprint: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const bps = await db
      .select()
      .from(assessmentBlueprints)
      .where(eq(assessmentBlueprints.status, "published"))
      .orderBy(desc(assessmentBlueprints.createdAt))
      .limit(5);
    const v9 = bps.find(b => b.key === "aiq_v9_standard");
    const bp = v9 ?? bps[0] ?? null;
    if (!bp) return null;
    const items = await db
      .select({ id: assessmentItems.id })
      .from(assessmentItems)
      .where(
        and(
          eq(assessmentItems.blueprintId, bp.id),
          eq(assessmentItems.status, "published")
        )
      );
    return { ...bp, itemCount: items.length };
  }),

  // ── Get blueprint with items ───────────────────────────────────────────────
  blueprint: protectedProcedure
    .input(z.object({ blueprintId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const bp = await db
        .select()
        .from(assessmentBlueprints)
        .where(eq(assessmentBlueprints.id, input.blueprintId))
        .limit(1);
      if (!bp[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await db
        .select()
        .from(assessmentItems)
        .where(
          and(
            eq(assessmentItems.blueprintId, input.blueprintId),
            eq(assessmentItems.status, "published")
          )
        );
      const itemsWithOptions = await Promise.all(
        items.map(async item => {
          const options = await db
            .select()
            .from(assessmentItemOptions)
            .where(eq(assessmentItemOptions.itemId, item.id))
            .orderBy(assessmentItemOptions.optionOrder);
          return {
            ...item,
            options: options.map(({ isCorrect, scoreWeight, signalDeltasJson, eventCodesJson, outcomeClass, ...o }) => o),
          };
        })
      );
      return { ...bp[0], items: itemsWithOptions };
    }),

  // ── Start or resume a session ──────────────────────────────────────────────
  startSession: protectedProcedure
    .input(z.object({
      blueprintId: z.string(),
      roleHint: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db
        .select()
        .from(assessmentSessions)
        .where(
          and(
            eq(assessmentSessions.userId, ctx.user.id),
            eq(assessmentSessions.blueprintId, input.blueprintId),
            eq(assessmentSessions.state, "in_progress")
          )
        )
        .limit(1);
      if (existing[0]) return { sessionId: existing[0].id, resumed: true };
      const sessionId = nanoid();
      await db.insert(assessmentSessions).values({
        id: sessionId,
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        blueprintId: input.blueprintId,
        state: "in_progress",
        startedAt: new Date(),
        sessionMetadataJson: {
          blueprintId: input.blueprintId,
          roleHint: input.roleHint ?? null,
          engineVersion: "adaptive-v1",
        },
      });
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "assessment.session.started",
        targetType: "assessment_session",
        targetId: sessionId,
        metadataJson: JSON.stringify({ blueprintId: input.blueprintId, engineVersion: "adaptive-v1" }),
      });
      return { sessionId, resumed: false };
    }),

  // ── Get session state + next item (adaptive) ───────────────────────────────
  session: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const session = await db
        .select()
        .from(assessmentSessions)
        .where(
          and(
            eq(assessmentSessions.id, input.sessionId),
            eq(assessmentSessions.userId, ctx.user.id)
          )
        )
        .limit(1);
      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const rawAnswers = await db
        .select()
        .from(assessmentAnswers)
        .where(eq(assessmentAnswers.sessionId, input.sessionId));

      const answers = await enrichAnswers(rawAnswers, db);
      const answeredCount = answers.length;
      const answeredItemIds = rawAnswers.map(a => a.itemId);

      let roleHint: string | null = null;
      try {
        const meta = (typeof session[0].sessionMetadataJson === "string"
          ? JSON.parse(session[0].sessionMetadataJson as string)
          : (session[0].sessionMetadataJson ?? {})) as Record<string, unknown>;
        roleHint = (meta.roleHint as string) ?? null;
      } catch {}

      const phase = determineSessionPhase(answeredCount, MINIMUM_EVIDENCE.targetItems);
      const state = SessionController.computeState(
        session[0].id,
        ctx.user.id,
        session[0].blueprintId,
        answers,
        MINIMUM_EVIDENCE.targetItems
      );

      type NextItem = {
        id: string; itemType: string; prompt: string; difficulty: number;
        title: string; scenario: string; constraint: string; question: string;
        capability: string; capabilityKey: string; workflow: string; riskLevel: string;
        interactionType: string; interactionId: string; primarySignal: string;
        displayOrder: number; isGenerated: boolean;
        options: Array<{ id: string; label: string; value: string; optionOrder: number }>;
      };
      let nextItem: NextItem | null = null;

      if (session[0].state === "in_progress" && answeredCount < MINIMUM_EVIDENCE.targetItems) {
        if (phase === "baseline") {
          nextItem = await getNextStaticItem(session[0].blueprintId, answeredItemIds, db);
        }

        if ((phase === "adaptive" || phase === "validation") && !nextItem) {
          try {
            const signalScores = computeSignalScores(
              answers.map(a => ({
                signalDeltasJson: a.signalDeltasJson,
                outcomeClass: a.outcomeClass,
                riskLevel: a.riskLevel,
                difficulty: a.difficulty,
              }))
            );
            const capabilityScores = computeCapabilityScores(signalScores);
            const capabilityScoreSummary = Object.fromEntries(
              Object.entries(capabilityScores).map(([k, v]) => [k, { score: v.score, signalCount: v.signalCount }])
            ) as Record<CapabilityKey, { score: number; signalCount: number }>;

            const answerRecords: AnswerRecord[] = answers.map(a => ({
              itemId: a.itemId,
              capabilityKey: a.capabilityKey,
              outcomeClass: a.outcomeClass,
              signalDeltas: (() => {
                try { return (typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson as string) : (a.signalDeltasJson as Record<string, number>)) ?? {}; } catch { return {}; }
              })(),
              confidenceScore: a.confidenceScore,
              interactionType: a.interactionType,
              riskLevel: a.riskLevel,
            }));
            const contradictions = detectContradictions(answerRecords);

            const gamingAnswers = answers.map(a => ({
              selectedValue: a.selectedValue,
              optionPosition: a.optionPosition,
              timeToAnswerMs: a.timeToAnswerMs,
              outcomeClass: a.outcomeClass,
              confidenceScore: a.confidenceScore,
              signalDeltas: (() => {
                try { return (typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson as string) : (a.signalDeltasJson as Record<string, number>)) ?? {}; } catch { return {}; }
              })(),
              interactionType: a.interactionType,
            }));
            const gamingAnalysis = analyseGamingPatterns(gamingAnswers);
            const riskExposure = {
              Low: answers.filter(a => a.riskLevel === "Low").length,
              Medium: answers.filter(a => a.riskLevel === "Medium").length,
              High: answers.filter(a => a.riskLevel === "High").length,
            };
            const interactionTypesUsed = Object.fromEntries(
              Object.entries(state.interactionTypesUsed)
            ) as Record<InteractionType, number>;
            const roleArchetype = resolveRoleArchetype(roleHint);

            const ctx2: AdaptiveSelectionContext = {
              answeredCount,
              totalTarget: MINIMUM_EVIDENCE.targetItems,
              capabilityScores: capabilityScoreSummary,
              interactionTypesUsed,
              riskExposure,
              gamingAnalysis,
              contradictionProbes: contradictions.pairs.slice(0, 2).map(pair =>
                generateContradictionProbeSpec(pair, "execution", roleArchetype.id)
              ),
              roleArchetype,
              orgIntent: DEFAULT_ORG_INTENT,
            };

            const generationVars = selectNextGenerationVariables(ctx2);
            const generated = await generateAdaptiveItem(generationVars);

            const generatedItemId = `gen-${nanoid()}`;
            const generatedItemMetadata = {
              title: generated.title,
              scenario: generated.scenario,
              constraint: generated.constraint,
              question: generated.question,
              capability: CAPABILITY_DISPLAY[generated.capabilityKey] ?? generated.capabilityKey,
              capability_key: generated.capabilityKey,
              workflow: generated.workflow,
              risk_level: generated.riskLevel,
              interaction_type: generated.interactionType,
              interaction_id: `gen-${generatedItemId}`,
              primary_signal: generationVars.evidenceObjective,
              display_order: answeredCount + 1,
              generated: true,
              phase,
            };
            await db.insert(assessmentItems).values({
              id: generatedItemId,
              blueprintId: session[0].blueprintId,
              itemType: generated.interactionType,
              prompt: `${generated.scenario}\n\n${generated.constraint}\n\n${generated.question}`,
              metadataJson: generatedItemMetadata,
              difficulty: generated.difficulty,
              status: "published",
            });
            for (let i = 0; i < generated.options.length; i++) {
              const opt = generated.options[i];
              await db.insert(assessmentItemOptions).values({
                id: `${generatedItemId}-opt-${i}`,
                itemId: generatedItemId,
                label: opt.label,
                value: opt.label.toLowerCase(),
                optionOrder: i + 1,
                isCorrect: opt.outcomeClass === "strong",
                scoreWeight: (opt.outcomeClass === "strong" ? 1 : opt.outcomeClass === "acceptable" ? 0.5 : 0) as any,
                outcomeClass: opt.outcomeClass,
                signalDeltasJson: JSON.stringify(opt.signalDeltas),
                eventCodesJson: JSON.stringify(opt.eventCodes),
              });
            }
            nextItem = {
              id: generatedItemId,
              itemType: generated.interactionType,
              prompt: `${generated.scenario}\n\n${generated.constraint}\n\n${generated.question}`,
              difficulty: generated.difficulty,
              title: generated.title,
              scenario: generated.scenario,
              constraint: generated.constraint,
              question: generated.question,
              capability: CAPABILITY_DISPLAY[generated.capabilityKey] ?? generated.capabilityKey,
              capabilityKey: generated.capabilityKey,
              workflow: generated.workflow,
              riskLevel: generated.riskLevel,
              interactionType: generated.interactionType,
              interactionId: `gen-${generatedItemId}`,
              primarySignal: generationVars.evidenceObjective,
              displayOrder: answeredCount + 1,
              isGenerated: true,
              options: generated.options.map((opt, i) => ({
                id: `${generatedItemId}-opt-${i}`,
                label: opt.label,
                value: opt.label.toLowerCase(),
                optionOrder: i + 1,
              })),
            };
          } catch {
            nextItem = await getNextStaticItem(session[0].blueprintId, answeredItemIds, db);
          }
        }
      }

      const isComplete = session[0].state !== "in_progress" || (answeredCount >= MINIMUM_EVIDENCE.targetItems && !nextItem);

      return {
        session: session[0],
        answers: rawAnswers,
        totalItems: MINIMUM_EVIDENCE.targetItems,
        answeredCount,
        nextItem,
        isComplete,
        phase,
        sessionState: {
          canComplete: state.canComplete,
          completionBlockers: state.completionBlockers,
          evidenceSufficient: state.evidenceSufficient,
          interactionTypesUsed: state.interactionTypesUsed,
          contradictionCount: state.contradictionCount,
          gamingScrutinyLevel: state.gamingScrutinyLevel,
        },
      };
    }),

  // ── Submit an answer ───────────────────────────────────────────────────────
  submitAnswer: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        itemId: z.string(),
        selectedValue: z.string().nullable(),
        freeText: z.string().optional(),
        confidenceScore: z.number().min(0).max(1).optional(),
        timeToAnswerMs: z.number().int().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const session = await db
        .select()
        .from(assessmentSessions)
        .where(
          and(
            eq(assessmentSessions.id, input.sessionId),
            eq(assessmentSessions.userId, ctx.user.id),
            eq(assessmentSessions.state, "in_progress")
          )
        )
        .limit(1);
      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Active session not found" });

      let correctness: boolean | null = null;
      let outcomeClass: string | null = null;
      let signalDeltasJson: unknown = null;
      let eventCodesJson: unknown = null;

      if (input.selectedValue) {
        const options = await db
          .select()
          .from(assessmentItemOptions)
          .where(eq(assessmentItemOptions.itemId, input.itemId));
        const selected = options.find(o => o.value === input.selectedValue);
        if (selected) {
          correctness = selected.isCorrect ?? null;
          outcomeClass = selected.outcomeClass ?? null;
          signalDeltasJson = selected.signalDeltasJson ?? null;
          eventCodesJson = selected.eventCodesJson ?? null;
        }
      }

      await db.insert(assessmentAnswers).values({
        id: nanoid(),
        sessionId: input.sessionId,
        itemId: input.itemId,
        selectedValueJson: input.selectedValue ? JSON.stringify(input.selectedValue) : null,
        freeText: input.freeText ?? null,
        confidenceScore: input.confidenceScore?.toFixed(4) as any,
        timeToAnswerMs: input.timeToAnswerMs,
        correctness,
        outcomeClass: outcomeClass as any,
        signalDeltasJson,
        eventCodesJson,
      });

      return { success: true, correctness, outcomeClass };
    }),

  // ── Complete session and compute full adaptive scores ──────────────────────
  completeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const session = await db
        .select()
        .from(assessmentSessions)
        .where(
          and(
            eq(assessmentSessions.id, input.sessionId),
            eq(assessmentSessions.userId, ctx.user.id),
            eq(assessmentSessions.state, "in_progress")
          )
        )
        .limit(1);
      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const rawAnswers = await db
        .select()
        .from(assessmentAnswers)
        .where(eq(assessmentAnswers.sessionId, input.sessionId));

      const answers = await enrichAnswers(rawAnswers, db);

      let roleHint: string | null = null;
      try {
        const meta = (typeof session[0].sessionMetadataJson === "string"
          ? JSON.parse(session[0].sessionMetadataJson as string)
          : (session[0].sessionMetadataJson ?? {})) as Record<string, unknown>;
        roleHint = (meta.roleHint as string) ?? null;
      } catch {}

      const results = SessionController.computeResults(answers, roleHint);

      const capabilityScoresFlat: Record<string, number> = {};
      for (const [key, val] of Object.entries(results.capabilityScores)) {
        capabilityScoresFlat[key] = val.score;
      }

      const scoreBreakdown = {
        overallScore: results.overallScore,
        capabilityScores: capabilityScoresFlat,
        signalScores: results.signalScores,
        readiness: results.readiness,
        narrative: results.narrative,
        confidenceProfile: results.confidenceProfile,
        failureModes: results.failureModes,
        contradictions: {
          count: results.contradictions.count,
          pairs: results.contradictions.pairs,
        },
        // Results page format: contradictionProfile
        contradictionProfile: {
          detected: results.contradictions.count,
          pairs: results.contradictions.pairs.map((p: any) => ({
            itemA: p.itemAId,
            itemB: p.itemBId,
            description: p.description ?? "Inconsistent responses detected between two related items.",
          })),
        },
        // Results page format: governanceProfile
        governanceProfile: {
          score: results.failureModes.governanceFlag
            ? 30
            : Math.round((results.capabilityScores["governance" as CapabilityKey]?.score ?? 70)),
          band: results.failureModes.governanceFlag
            ? "critical"
            : (results.capabilityScores["governance" as CapabilityKey]?.score ?? 70) >= 75
              ? "strong"
              : "developing",
          bypasses: results.failureModes.governanceFlag ? 1 : 0,
        },
        credibilityBand: results.confidenceProfile.overall >= 0.75 ? "high" : results.confidenceProfile.overall >= 0.5 ? "medium" : "low",
        gamingAnalysis: {
          score: results.gamingAnalysis.score,
          scrutinyLevel: results.gamingAnalysis.scrutinyLevel,
          patterns: results.gamingAnalysis.patterns,
        },
        roleArchetype: results.roleArchetype.id,
        totalAnswers: results.totalAnswers,
        avgConfidence: results.avgConfidence,
        riskBand: results.riskBand,
        modelVersion: "adaptive-v1",
      };

      await db.insert(assessmentScores).values({
        id: nanoid(),
        sessionId: input.sessionId,
        overallScore: results.overallScore.toFixed(2) as any,
        scoreBreakdownJson: JSON.stringify(scoreBreakdown),
        signalScoresJson: JSON.stringify(results.signalScores),
        modelVersion: "adaptive-v1",
      });

      const credibilityScore = results.confidenceProfile.overall;
      const credibilityBand: "low" | "medium" | "high" =
        credibilityScore >= 0.75 ? "high" : credibilityScore >= 0.5 ? "medium" : "low";
      await db.insert(credibilityScores).values({
        id: nanoid(),
        userId: ctx.user.id,
        assessmentSessionId: input.sessionId,
        credibilityScore: credibilityScore.toFixed(4) as any,
        band: credibilityBand,
        reasonJson: JSON.stringify(results.confidenceProfile),
        modelVersion: "adaptive-v1",
      });

      const riskScore = results.riskBand === "high" ? 0.8 : results.riskBand === "medium" ? 0.5 : 0.2;
      await db.insert(riskScores).values({
        id: nanoid(),
        userId: ctx.user.id,
        riskScore: riskScore.toFixed(4) as any,
        band: results.riskBand,
        reasonJson: JSON.stringify({ failureModes: results.failureModes, contradictions: results.contradictions.count }),
        modelVersion: "adaptive-v1",
      });

      await db
        .update(userStates)
        .set({ effectiveTo: new Date() })
        .where(and(eq(userStates.userId, ctx.user.id), isNull(userStates.effectiveTo)));
      await db.insert(userStates).values({
        id: nanoid(),
        userId: ctx.user.id,
        primaryState: results.readiness.state as any,
        credibilityState: credibilityBand,
        riskState: results.riskBand,
        learningState: results.overallScore >= 70 ? "completed" : "in_progress",
        complianceState: results.failureModes.governanceFlag ? "at_risk" : "compliant",
        stateReasonJson: JSON.stringify({
          source: "assessment",
          sessionId: input.sessionId,
          capabilityScores: capabilityScoresFlat,
          signalScores: results.signalScores,
          modelVersion: "adaptive-v1",
        }),
      });

      await db.insert(decisionLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        decisionType: "assessment_completion",
        inputSnapshotJson: JSON.stringify({ sessionId: input.sessionId, answers: answers.length }),
        outputSnapshotJson: JSON.stringify({
          overallScore: results.overallScore,
          credibilityScore,
          riskScore,
          capabilityScores: capabilityScoresFlat,
          readiness: results.readiness,
        }),
        precedenceAppliedJson: JSON.stringify({ modelVersion: "adaptive-v1" }),
      });

      await db
        .update(assessmentSessions)
        .set({ state: "completed", completedAt: new Date() })
        .where(eq(assessmentSessions.id, input.sessionId));

      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "assessment.session.completed",
        targetType: "assessment_session",
        targetId: input.sessionId,
        metadataJson: JSON.stringify({
          overallScore: results.overallScore,
          credibilityBand,
          riskBand: results.riskBand,
          readiness: results.readiness.state,
          modelVersion: "adaptive-v1",
        }),
      });

      return {
        overallScore: results.overallScore,
        credibilityScore,
        credibilityBand,
        riskScore,
        riskBand: results.riskBand,
        readiness: results.readiness,
        capabilityScores: results.capabilityScores,
        signalScores: results.signalScores,
        narrative: results.narrative,
        confidenceProfile: results.confidenceProfile,
        failureModes: results.failureModes,
        contradictions: results.contradictions,
        gamingAnalysis: results.gamingAnalysis,
        modelVersion: "adaptive-v1",
      };
    }),

  // ── Get full results for a completed session ───────────────────────────────
  results: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const session = await db
        .select()
        .from(assessmentSessions)
        .where(
          and(
            eq(assessmentSessions.id, input.sessionId),
            eq(assessmentSessions.userId, ctx.user.id)
          )
        )
        .limit(1);
      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const score = await db
        .select()
        .from(assessmentScores)
        .where(eq(assessmentScores.sessionId, input.sessionId))
        .limit(1);
      if (!score[0]) return { session: session[0], score: null };

      let breakdown: Record<string, unknown> = {};
      try {
        breakdown = (typeof score[0].scoreBreakdownJson === "string"
          ? JSON.parse(score[0].scoreBreakdownJson as string)
          : (score[0].scoreBreakdownJson ?? {})) as Record<string, unknown>;
      } catch {}

      const rawCapScores = (breakdown.capabilityScores ?? {}) as Record<string, number>;
      const enrichedCapScores: Record<string, { score: number; displayName: string; colour: string }> = {};
      for (const [key, val] of Object.entries(rawCapScores)) {
        enrichedCapScores[key] = {
          score: val as number,
          displayName: CAPABILITY_DISPLAY[key] ?? key,
          colour: CAPABILITY_COLOURS[key] ?? "#4477AA",
        };
      }

      return {
        session: session[0],
        score: {
          ...score[0],
          overallScore: parseFloat(String(score[0].overallScore)),
          breakdown: {
            ...breakdown,
            capabilityScores: enrichedCapScores,
          },
        },
      };
    }),

  // ── Get user's assessment history ──────────────────────────────────────────
  history: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const targetUserId = input.userId ?? ctx.user.id;
      const sessions = await db
        .select()
        .from(assessmentSessions)
        .where(
          and(
            eq(assessmentSessions.userId, targetUserId),
            eq(assessmentSessions.tenantId, ctx.user.tenantId)
          )
        )
        .orderBy(desc(assessmentSessions.createdAt))
        .limit(20);
      const withScores = await Promise.all(
        sessions.map(async s => {
          const score = await db
            .select()
            .from(assessmentScores)
            .where(eq(assessmentScores.sessionId, s.id))
            .limit(1);
          let breakdown: Record<string, unknown> = {};
          try {
            breakdown = (typeof score[0]?.scoreBreakdownJson === "string"
              ? JSON.parse(score[0].scoreBreakdownJson as string)
              : (score[0]?.scoreBreakdownJson ?? {})) as Record<string, unknown>;
          } catch {}
          return {
            ...s,
            score: score[0] ? {
              ...score[0],
              overallScore: parseFloat(String(score[0].overallScore)),
              primaryState: (breakdown.readiness as { state?: string })?.state ?? null,
            } : null,
          };
        })
      );
      return withScores;
    }),

  // ── Admin: list assessment items (scenario browser) ──────────────────────
  adminItems: protectedProcedure
    .input(z.object({
      blueprintId: z.string().optional(),
      domain: z.string().optional(),
      riskLevel: z.string().optional(),
      difficulty: z.number().int().min(1).max(3).optional(),
      search: z.string().optional(),
      status: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions: ReturnType<typeof eq>[] = [];
      if (input.blueprintId) conditions.push(eq(assessmentItems.blueprintId, input.blueprintId));
      if (input.status) conditions.push(eq(assessmentItems.status, input.status as 'published' | 'draft' | 'archived'));
      if (input.difficulty) conditions.push(eq(assessmentItems.difficulty, input.difficulty));
      const allItems = await db
        .select()
        .from(assessmentItems)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(assessmentItems.createdAt))
        .limit(1000);
      // Apply JSON-based filters in memory
      const filtered = allItems.filter((item) => {
        const meta = (typeof item.metadataJson === 'object' ? item.metadataJson : {}) as Record<string, unknown>;
        if (input.domain && meta.domain !== input.domain) return false;
        if (input.riskLevel && meta.risk_level !== input.riskLevel) return false;
        if (input.search) {
          const q = input.search.toLowerCase();
          const title = ((meta.title as string) || item.prompt || '').toLowerCase();
          const scenario = ((meta.scenario as string) || '').toLowerCase();
          if (!title.includes(q) && !scenario.includes(q)) return false;
        }
        return true;
      });
      const total = filtered.length;
      const offset = (input.page - 1) * input.pageSize;
      const items = filtered.slice(offset, offset + input.pageSize);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // ── Admin: update assessment item status ────────────────────────────────────
  adminUpdateItemStatus: protectedProcedure
    .input(z.object({
      itemId: z.string(),
      status: z.enum(['published', 'draft', 'archived']),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(assessmentItems)
        .set({ status: input.status })
        .where(eq(assessmentItems.id, input.itemId));
      return { success: true };
    }),

  // ── Admin: get assessment item with options ──────────────────────────────────
  adminGetItem: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [item] = await db
        .select()
        .from(assessmentItems)
        .where(eq(assessmentItems.id, input.itemId));
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      const options = await db
        .select()
        .from(assessmentItemOptions)
        .where(eq(assessmentItemOptions.itemId, input.itemId))
        .orderBy(assessmentItemOptions.optionOrder);
      return { item, options };
    }),

  // ── Admin: list all sessions for a tenant ─────────────────────────────────
  adminSessions: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const sessions = await db
        .select()
        .from(assessmentSessions)
        .where(eq(assessmentSessions.tenantId, ctx.user.tenantId))
        .orderBy(desc(assessmentSessions.createdAt))
        .limit(input.limit);
      return sessions;
    }),
});
