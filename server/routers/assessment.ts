import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys } from "../db";
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
import { eq, and, desc, isNull, notInArray } from "drizzle-orm";
import { nanoid } from "nanoid";

// ─── Signal Scoring Engine ────────────────────────────────────────────────────
// Implements the canonical signal delta scoring from the question bank spec.
// Each answer carries signal_deltas (e.g. { execution_quality: 4, prioritisation_quality: 2 })
// We accumulate these across all answers to produce per-signal scores.

interface SignalAccumulator {
  [signal: string]: number;
}

function computeSignalScores(
  answers: Array<{ signalDeltasJson: string | null; outcomeClass: string | null }>
): SignalAccumulator {
  const acc: SignalAccumulator = {};
  for (const answer of answers) {
    if (!answer.signalDeltasJson) continue;
    try {
      const deltas = JSON.parse(answer.signalDeltasJson) as Record<string, number>;
      for (const [signal, delta] of Object.entries(deltas)) {
        acc[signal] = (acc[signal] ?? 0) + delta;
      }
    } catch {}
  }
  return acc;
}

// Map signal names to capability areas for the score breakdown
const SIGNAL_TO_CAPABILITY: Record<string, string> = {
  execution_quality: "execution",
  prioritisation_quality: "prioritisation",
  validation_quality: "validation",
  judgement_quality: "judgement",
  governance_quality: "governance",
  appropriateness_quality: "appropriateness",
  data_interpretation_quality: "data_interpretation",
  timing_integrity: "execution",
  over_reliance_risk: "governance",
  over_caution_risk: "judgement",
  avoidance_risk: "judgement",
  blind_acceptance_risk: "governance",
};

function computeCapabilityScores(
  signalScores: SignalAccumulator,
  totalItems: number
): Record<string, number> {
  // Group signals by capability, normalise to 0-100
  const capAccum: Record<string, { sum: number; count: number }> = {};

  for (const [signal, delta] of Object.entries(signalScores)) {
    const cap = SIGNAL_TO_CAPABILITY[signal] ?? "execution";
    if (!capAccum[cap]) capAccum[cap] = { sum: 0, count: 0 };
    capAccum[cap].sum += delta;
    capAccum[cap].count += 1;
  }

  const result: Record<string, number> = {};
  for (const [cap, { sum, count }] of Object.entries(capAccum)) {
    // Normalise: max possible per signal is 4 per item, min is -4
    // We map to 0-100 where 0 signal delta = 50
    const avgDelta = count > 0 ? sum / count : 0;
    const normalised = Math.max(0, Math.min(100, 50 + avgDelta * 12.5));
    result[cap] = Math.round(normalised);
  }

  return result;
}

function computeOverallScore(capabilityScores: Record<string, number>): number {
  const caps = Object.values(capabilityScores);
  if (caps.length === 0) return 50;
  return Math.round(caps.reduce((s, v) => s + v, 0) / caps.length);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const assessmentRouter = router({
  // List published blueprints
  blueprints: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select()
      .from(assessmentBlueprints)
      .where(eq(assessmentBlueprints.status, "published"));
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
          // Strip scoring data from options sent to learner
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

      // Check for existing in-progress session
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

      // Get total item count for the blueprint
      const allItems = await db
        .select({ id: assessmentItems.id })
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

      // Get next unanswered item
      let nextItem = null;
      if (session[0].state === "in_progress" && answeredCount < totalItems) {
        const unanswered = allItems.filter(i => !answeredItemIds.includes(i.id));
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

            // Parse metadata to get title, scenario, constraint
            let meta: any = {};
            try { meta = JSON.parse((nextItemFull[0].metadataJson as string | null) ?? "{}"); } catch {}

            nextItem = {
              id: nextItemFull[0].id,
              itemType: nextItemFull[0].itemType,
              prompt: nextItemFull[0].prompt,
              difficulty: nextItemFull[0].difficulty,
              title: meta.title ?? "",
              scenario: meta.scenario ?? "",
              constraint: meta.constraint ?? "",
              capability: meta.capability ?? "",
              capabilityKey: meta.capability_key ?? "",
              workflow: meta.workflow ?? "",
              riskLevel: meta.risk_level ?? "",
              interactionId: meta.interaction_id ?? "",
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

  // Submit an answer with signal delta scoring
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

      // Find the selected option with scoring data
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

  // Complete assessment and compute signal-based scores
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

      // ── Signal Delta Scoring ──────────────────────────────────────────────
      const signalScores = computeSignalScores(
        answers.map(a => ({
          signalDeltasJson: (a as any).signalDeltasJson ?? null,
          outcomeClass: (a as any).outcomeClass ?? null,
        }))
      );

      const capabilityScores = computeCapabilityScores(signalScores, answers.length);
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
      const primaryState =
        overallScore >= 75 ? "safe" :
        overallScore >= 55 ? "at_risk" :
        overallScore >= 35 ? "unsafe" : "unknown";

      const scoreBreakdown = {
        correct,
        total,
        overallScore,
        capabilityScores,
        signalScores,
      };

      // Persist assessment score
      await db.insert(assessmentScores).values({
        id: nanoid(),
        sessionId: input.sessionId,
        overallScore: overallScore.toFixed(2) as any,
        scoreBreakdownJson: JSON.stringify(scoreBreakdown),
        signalScoresJson: JSON.stringify(signalScores),
        modelVersion: "v2-signal-delta",
      });

      // Persist credibility score
      await db.insert(credibilityScores).values({
        id: nanoid(),
        userId: ctx.user.id,
        assessmentSessionId: input.sessionId,
        credibilityScore: credibilityScore.toFixed(4) as any,
        band: credibilityBand,
        reasonJson: JSON.stringify({ calibrationDiff, avgConfidence, accuracyRate }),
        modelVersion: "v2-signal-delta",
      });

      // Persist risk score
      await db.insert(riskScores).values({
        id: nanoid(),
        userId: ctx.user.id,
        riskScore: riskScore.toFixed(4) as any,
        band: riskBand,
        reasonJson: JSON.stringify({ speedRisk, scoreRisk, avgTime }),
        modelVersion: "v2-signal-delta",
      });

      // Update user state
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
          capabilityScores,
          signalScores,
        }),
      });

      // Log decision
      await db.insert(decisionLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        decisionType: "assessment_completion",
        inputSnapshotJson: JSON.stringify({ sessionId: input.sessionId, answers: answers.length }),
        outputSnapshotJson: JSON.stringify({ overallScore, credibilityScore, riskScore, capabilityScores }),
        precedenceAppliedJson: JSON.stringify({ modelVersion: "v2-signal-delta" }),
      });

      // Mark session complete
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
          return { ...s, score: score[0] ?? null };
        })
      );

      return withScores;
    }),
});
