import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  assessmentBlueprints,
  assessmentItems,
  assessmentItemOptions,
  assessmentSessions,
  assessmentAnswers,
  assessmentScores,
  credibilityScores,
  riskScores,
  userStates,
  decisionLogs,
  auditLogs,
} from "../../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

// ─── V9.2 Scoring Engine ──────────────────────────────────────────────────────
// Implements the canonical signal delta scoring from AIQ V9.2 specification.
// Ref: Volume 01 §16 Scoring System, §17 Signal Model

interface SignalAccumulator {
  [signal: string]: number;
}

// V9.2 risk multipliers (Vol 01 §16)
const RISK_MULTIPLIERS: Record<string, { positive: number; negative: number }> = {
  Low:    { positive: 1.00, negative: 1.00 },
  Medium: { positive: 1.00, negative: 1.15 },
  High:   { positive: 1.05, negative: 1.35 },
};

// V9.2 difficulty weights (Vol 01 §16)
const DIFFICULTY_WEIGHTS: Record<number, number> = {
  1: 0.85,
  2: 1.00,
  3: 1.20,
};

// Signal → Capability mapping (Vol 01 §17 + §6 Capability Framework)
const SIGNAL_TO_CAPABILITY: Record<string, string> = {
  execution_quality:            "execution",
  prioritisation_quality:       "execution",
  validation_accuracy:          "execution",
  judgement_quality:            "judgement",
  discrimination_quality:       "judgement",
  governance_quality:           "governance",
  appropriateness_boundary:     "appropriateness",
  workflow_application_quality: "workflow",
  data_interpretation_quality:  "data_interpretation",
  timing_integrity:             "execution",
  over_reliance_risk:           "governance",
  over_caution_risk:            "judgement",
  avoidance_risk:               "judgement",
  automation_expansion_risk:    "appropriateness",
  blind_acceptance_risk:        "governance",
  consistency_index:            "execution",
  calibration_index:            "judgement",
  contradiction_index:          "governance",
};

// Canonical capability display names
const CAPABILITY_DISPLAY: Record<string, string> = {
  execution:          "AI Execution",
  judgement:          "AI Judgement",
  governance:         "AI Risk & Governance",
  appropriateness:    "AI Appropriateness",
  workflow:           "AI Workflow Application",
  data_interpretation:"AI Data & Insight",
};

// Canonical capability colours (colorblind-safe palette)
const CAPABILITY_COLOURS: Record<string, string> = {
  execution:          "#4477AA",
  judgement:          "#AA3377",
  governance:         "#228833",
  appropriateness:    "#EE6677",
  workflow:           "#66CCEE",
  data_interpretation:"#BBBBBB",
};

// Narrative templates (Vol 02A Appendix C)
const NARRATIVE_TEMPLATES: Record<string, string> = {
  learner_safe:       "You are currently showing strong, credible evidence in this area. Keep using the checklist and practice patterns that are helping you make proportionate decisions with AI.",
  learner_at_risk:    "You are comfortable using AI, but the evidence shows that in higher-stakes situations you may trust it too quickly or challenge the wrong thing first. Your next plan focuses on the most important corrective behaviours.",
  learner_unsafe:     "The evidence suggests that your current AI use in this context creates material risk. Before reassessment, complete the required governance-first learning sequence and use the practice tools in your workflow.",
  learner_restricted: "Certain uses remain restricted for now because the current evidence does not yet support safe use in this context. The system will show what must be completed before access can be reconsidered.",
  manager_at_risk:    "This teammate would benefit from support in the specific workflow where risk is showing up. Use the guidance prompts to reinforce the right checks and boundaries rather than discussing the score abstractly.",
  manager_unsafe:     "This teammate should not be left to self-manage the risk theme alone. Support should focus on the real workflow context and on whether the required remediation is actually being applied at work.",
};

function getNarrative(primaryState: string, audience: "learner" | "manager" = "learner"): string {
  const key = `${audience}_${primaryState}`;
  return NARRATIVE_TEMPLATES[key] ?? NARRATIVE_TEMPLATES[`${audience}_at_risk`] ?? "";
}

/**
 * Compute weighted signal scores applying V9.2 risk and difficulty multipliers.
 */
function computeSignalScores(
  answers: Array<{
    signalDeltasJson: unknown;
    outcomeClass: string | null;
    riskLevel?: string | null;
    difficulty?: number | null;
  }>
): SignalAccumulator {
  const acc: SignalAccumulator = {};
  for (const answer of answers) {
    if (!answer.signalDeltasJson) continue;
    try {
      const raw = typeof answer.signalDeltasJson === "string"
        ? JSON.parse(answer.signalDeltasJson)
        : answer.signalDeltasJson;
      const deltas = raw as Record<string, number>;
      const riskLevel = answer.riskLevel ?? "Medium";
      const difficulty = answer.difficulty ?? 2;
      const riskMult = RISK_MULTIPLIERS[riskLevel] ?? RISK_MULTIPLIERS.Medium;
      const diffWeight = DIFFICULTY_WEIGHTS[difficulty] ?? 1.0;
      for (const [signal, baseDelta] of Object.entries(deltas)) {
        const multiplier = baseDelta >= 0 ? riskMult.positive : riskMult.negative;
        const weightedDelta = baseDelta * multiplier * diffWeight;
        acc[signal] = (acc[signal] ?? 0) + weightedDelta;
      }
    } catch {}
  }
  return acc;
}

/**
 * Aggregate signal scores into capability scores (0–100).
 */
function computeCapabilityScores(
  signalScores: SignalAccumulator
): Record<string, { score: number; displayName: string; colour: string; signalCount: number }> {
  const capAccum: Record<string, { sum: number; count: number }> = {};
  for (const [signal, delta] of Object.entries(signalScores)) {
    const cap = SIGNAL_TO_CAPABILITY[signal] ?? "execution";
    if (!capAccum[cap]) capAccum[cap] = { sum: 0, count: 0 };
    capAccum[cap].sum += delta;
    capAccum[cap].count += 1;
  }
  // Ensure all 6 capabilities are always present
  const allCaps = ["execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation"];
  for (const cap of allCaps) {
    if (!capAccum[cap]) capAccum[cap] = { sum: 0, count: 0 };
  }
  const result: Record<string, { score: number; displayName: string; colour: string; signalCount: number }> = {};
  for (const [cap, { sum, count }] of Object.entries(capAccum)) {
    const avgDelta = count > 0 ? sum / count : 0;
    const normalised = Math.max(0, Math.min(100, 50 + avgDelta * 12.5));
    result[cap] = {
      score: Math.round(normalised),
      displayName: CAPABILITY_DISPLAY[cap] ?? cap,
      colour: CAPABILITY_COLOURS[cap] ?? "#4477AA",
      signalCount: count,
    };
  }
  return result;
}

function computeOverallScore(capabilityScores: Record<string, { score: number }>): number {
  const scores = Object.values(capabilityScores).map(c => c.score);
  if (scores.length === 0) return 50;
  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
}

function determineReadinessState(overallScore: number, riskBand: string): string {
  if (riskBand === "high") return "unsafe";
  if (overallScore >= 75) return "safe";
  if (overallScore >= 55) return "at_risk";
  if (overallScore >= 35) return "unsafe";
  return "unknown";
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const assessmentRouter = router({
  // List published blueprints
  blueprints: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select()
      .from(assessmentBlueprints)
      .where(eq(assessmentBlueprints.status, "published"));
  }),

  // Get the default V9.2 blueprint
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
    return v9 ?? bps[0] ?? null;
  }),

  // Get a blueprint with its items (strips scoring data from options)
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

  // Start or resume an assessment session
  startSession: protectedProcedure
    .input(z.object({ blueprintId: z.string() }))
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
        sessionMetadataJson: { blueprintId: input.blueprintId },
      });
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "assessment.session.started",
        targetType: "assessment_session",
        targetId: sessionId,
        metadataJson: JSON.stringify({ blueprintId: input.blueprintId }),
      });
      return { sessionId, resumed: false };
    }),

  // Get session state + next unanswered item
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
      const answers = await db
        .select()
        .from(assessmentAnswers)
        .where(eq(assessmentAnswers.sessionId, input.sessionId));
      const allItems = await db
        .select({ id: assessmentItems.id, metadataJson: assessmentItems.metadataJson })
        .from(assessmentItems)
        .where(
          and(
            eq(assessmentItems.blueprintId, session[0].blueprintId),
            eq(assessmentItems.status, "published")
          )
        );
      const answeredItemIds = answers.map(a => a.itemId);
      const totalItems = allItems.length;
      const answeredCount = answeredItemIds.length;
      let nextItem = null;
      if (session[0].state === "in_progress" && answeredCount < totalItems) {
        const unanswered = allItems
          .filter(i => !answeredItemIds.includes(i.id))
          .sort((a, b) => {
            let ma: any = {}, mb: any = {};
            try { ma = typeof a.metadataJson === "string" ? JSON.parse(a.metadataJson) : (a.metadataJson ?? {}); } catch {}
            try { mb = typeof b.metadataJson === "string" ? JSON.parse(b.metadataJson) : (b.metadataJson ?? {}); } catch {}
            return (ma.display_order ?? 999) - (mb.display_order ?? 999);
          });
        if (unanswered.length > 0) {
          const nextItemFull = await db
            .select()
            .from(assessmentItems)
            .where(eq(assessmentItems.id, unanswered[0].id))
            .limit(1);
          if (nextItemFull[0]) {
            const options = await db
              .select()
              .from(assessmentItemOptions)
              .where(eq(assessmentItemOptions.itemId, nextItemFull[0].id))
              .orderBy(assessmentItemOptions.optionOrder);
            let meta: any = {};
            try { meta = typeof nextItemFull[0].metadataJson === "string" ? JSON.parse(nextItemFull[0].metadataJson as string) : (nextItemFull[0].metadataJson ?? {}); } catch {}
            nextItem = {
              id: nextItemFull[0].id,
              itemType: nextItemFull[0].itemType,
              prompt: nextItemFull[0].prompt,
              difficulty: nextItemFull[0].difficulty,
              title: meta.title ?? "",
              scenario: meta.scenario ?? "",
              constraint: meta.constraint ?? "",
              question: meta.question ?? "What do you do?",
              capability: meta.capability ?? "",
              capabilityKey: meta.capability_key ?? "",
              workflow: meta.workflow ?? "",
              riskLevel: meta.risk_level ?? "Medium",
              interactionId: meta.interaction_id ?? "",
              primarySignal: meta.primary_signal ?? "",
              displayOrder: meta.display_order ?? 0,
              options: options.map(({ isCorrect, scoreWeight, signalDeltasJson, eventCodesJson, outcomeClass, ...o }) => o),
            };
          }
        }
      }
      return {
        session: session[0],
        answers,
        totalItems,
        answeredCount,
        nextItem,
        isComplete: session[0].state !== "in_progress" || answeredCount >= totalItems,
      };
    }),

  // Submit an answer
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

  // Complete assessment and compute V9.2 signal-based scores
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
      const answers = await db
        .select()
        .from(assessmentAnswers)
        .where(eq(assessmentAnswers.sessionId, input.sessionId));
      // Enrich answers with item metadata for V9.2 multipliers
      const enrichedAnswers = await Promise.all(
        answers.map(async a => {
          const item = await db
            .select({ difficulty: assessmentItems.difficulty, metadataJson: assessmentItems.metadataJson })
            .from(assessmentItems)
            .where(eq(assessmentItems.id, a.itemId))
            .limit(1);
          let riskLevel = "Medium";
          try {
            const meta = typeof item[0]?.metadataJson === "string"
              ? JSON.parse(item[0].metadataJson)
              : (item[0]?.metadataJson ?? {});
            riskLevel = (meta as any).risk_level ?? "Medium";
          } catch {}
          return {
            signalDeltasJson: (a as any).signalDeltasJson ?? null,
            outcomeClass: (a as any).outcomeClass ?? null,
            riskLevel,
            difficulty: item[0]?.difficulty ?? 2,
          };
        })
      );
      // ── V9.2 Signal Delta Scoring ─────────────────────────────────────────
      const signalScores = computeSignalScores(enrichedAnswers);
      const capabilityScores = computeCapabilityScores(signalScores);
      const overallScore = computeOverallScore(capabilityScores);
      // ── Credibility Scoring ───────────────────────────────────────────────
      const total = answers.length;
      const correct = answers.filter(a => a.correctness === true).length;
      const accuracyRate = total > 0 ? correct / total : 0;
      const avgConfidence =
        answers.filter(a => a.confidenceScore !== null).length > 0
          ? answers.reduce((s, a) => s + parseFloat(String(a.confidenceScore ?? 0)), 0) /
            answers.filter(a => a.confidenceScore !== null).length
          : 0.5;
      const calibrationDiff = Math.abs(avgConfidence - accuracyRate);
      const credibilityScore = Math.max(0, 1 - calibrationDiff * 1.5);
      const credibilityBand: "low" | "medium" | "high" =
        credibilityScore >= 0.75 ? "high" : credibilityScore >= 0.5 ? "medium" : "low";
      // ── Risk Scoring ──────────────────────────────────────────────────────
      const avgTime = total > 0 ? answers.reduce((s, a) => s + a.timeToAnswerMs, 0) / total : 0;
      const speedRisk = avgTime < 3000 ? 0.3 : 0;
      const scoreRisk = overallScore < 50 ? 0.4 : overallScore < 70 ? 0.2 : 0;
      const riskScore = Math.min(1, speedRisk + scoreRisk);
      const riskBand: "low" | "medium" | "high" =
        riskScore >= 0.6 ? "high" : riskScore >= 0.3 ? "medium" : "low";
      // ── Readiness State ───────────────────────────────────────────────────
      const primaryState = determineReadinessState(overallScore, riskBand);
      const narrative = getNarrative(primaryState, "learner");
      const managerNarrative = getNarrative(primaryState, "manager");
      // Flat capability scores for storage
      const capabilityScoresFlat: Record<string, number> = {};
      for (const [key, val] of Object.entries(capabilityScores)) {
        capabilityScoresFlat[key] = val.score;
      }
      const scoreBreakdown = {
        correct,
        total,
        overallScore,
        capabilityScores: capabilityScoresFlat,
        signalScores,
        credibilityScore,
        riskScore,
        primaryState,
        narrative,
        managerNarrative,
        modelVersion: "v9.2",
      };
      await db.insert(assessmentScores).values({
        id: nanoid(),
        sessionId: input.sessionId,
        overallScore: overallScore.toFixed(2) as any,
        scoreBreakdownJson: JSON.stringify(scoreBreakdown),
        signalScoresJson: JSON.stringify(signalScores),
        modelVersion: "v9.2",
      });
      await db.insert(credibilityScores).values({
        id: nanoid(),
        userId: ctx.user.id,
        assessmentSessionId: input.sessionId,
        credibilityScore: credibilityScore.toFixed(4) as any,
        band: credibilityBand,
        reasonJson: JSON.stringify({ calibrationDiff, avgConfidence, accuracyRate }),
        modelVersion: "v9.2",
      });
      await db.insert(riskScores).values({
        id: nanoid(),
        userId: ctx.user.id,
        riskScore: riskScore.toFixed(4) as any,
        band: riskBand,
        reasonJson: JSON.stringify({ speedRisk, scoreRisk, avgTime }),
        modelVersion: "v9.2",
      });
      const learningState = overallScore >= 70 ? "completed" : "in_progress";
      await db
        .update(userStates)
        .set({ effectiveTo: new Date() })
        .where(and(eq(userStates.userId, ctx.user.id), isNull(userStates.effectiveTo)));
      await db.insert(userStates).values({
        id: nanoid(),
        userId: ctx.user.id,
        primaryState: primaryState as any,
        credibilityState: credibilityBand,
        riskState: riskBand,
        learningState,
        complianceState: "compliant",
        stateReasonJson: JSON.stringify({
          source: "assessment",
          sessionId: input.sessionId,
          capabilityScores: capabilityScoresFlat,
          signalScores,
        }),
      });
      await db.insert(decisionLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        decisionType: "assessment_completion",
        inputSnapshotJson: JSON.stringify({ sessionId: input.sessionId, answers: answers.length }),
        outputSnapshotJson: JSON.stringify({ overallScore, credibilityScore, riskScore, capabilityScores: capabilityScoresFlat }),
        precedenceAppliedJson: JSON.stringify({ modelVersion: "v9.2" }),
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
        metadataJson: JSON.stringify({ overallScore, credibilityBand, riskBand, primaryState }),
      });
      return {
        overallScore,
        credibilityScore,
        credibilityBand,
        riskScore,
        riskBand,
        primaryState,
        capabilityScores,
        signalScores,
        narrative,
        managerNarrative,
        modelVersion: "v9.2",
      };
    }),

  // Get full results for a completed session
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
      let breakdown: any = {};
      try {
        breakdown = typeof score[0].scoreBreakdownJson === "string"
          ? JSON.parse(score[0].scoreBreakdownJson)
          : (score[0].scoreBreakdownJson ?? {});
      } catch {}
      const rawCapScores = breakdown.capabilityScores ?? {};
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

  // Get user's assessment history
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
          let breakdown: any = {};
          try {
            breakdown = typeof score[0]?.scoreBreakdownJson === "string"
              ? JSON.parse(score[0].scoreBreakdownJson)
              : (score[0]?.scoreBreakdownJson ?? {});
          } catch {}
          return {
            ...s,
            score: score[0] ? {
              ...score[0],
              overallScore: parseFloat(String(score[0].overallScore)),
              primaryState: breakdown.primaryState ?? null,
            } : null,
          };
        })
      );
      return withScores;
    }),
});
