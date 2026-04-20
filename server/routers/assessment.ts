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
import { eq, and, desc, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

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

  // Get a blueprint with its items
  blueprint: protectedProcedure
    .input(z.object({ blueprintId: z.string() }))
    .query(async ({ input, ctx }) => {
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
          // Strip isCorrect from options sent to learner
          return {
            ...item,
            options: options.map(({ isCorrect, scoreWeight, ...o }) => o),
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

  // Get session state (answers so far)
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

      return { session: session[0], answers };
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

      // Determine correctness
      let correctness: boolean | null = null;
      if (input.selectedValue) {
        const options = await db
          .select()
          .from(assessmentItemOptions)
          .where(eq(assessmentItemOptions.itemId, input.itemId));
        const selected = options.find(o => o.value === input.selectedValue);
        if (selected) correctness = selected.isCorrect ?? null;
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
      });

      return { success: true, correctness };
    }),

  // Complete assessment and compute scores
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

      // Compute overall score
      const total = answers.length;
      const correct = answers.filter(a => a.correctness === true).length;
      const overallScore = total > 0 ? (correct / total) * 100 : 0;

      // Compute credibility: based on confidence calibration and time patterns
      const avgConfidence =
        answers.filter(a => a.confidenceScore !== null).length > 0
          ? answers.reduce((s, a) => s + parseFloat(String(a.confidenceScore ?? 0)), 0) /
            answers.filter(a => a.confidenceScore !== null).length
          : 0.5;

      const accuracyRate = total > 0 ? correct / total : 0;
      // Credibility = calibration between confidence and accuracy
      const calibrationDiff = Math.abs(avgConfidence - accuracyRate);
      const credibilityScore = Math.max(0, 1 - calibrationDiff * 1.5);
      const credibilityBand: "low" | "medium" | "high" =
        credibilityScore >= 0.75 ? "high" : credibilityScore >= 0.5 ? "medium" : "low";

      // Compute risk: based on score and time taken
      const avgTime =
        total > 0
          ? answers.reduce((s, a) => s + a.timeToAnswerMs, 0) / total
          : 0;
      const speedRisk = avgTime < 3000 ? 0.3 : 0; // too fast = suspicious
      const scoreRisk = overallScore < 50 ? 0.4 : overallScore < 70 ? 0.2 : 0;
      const riskScore = Math.min(1, speedRisk + scoreRisk);
      const riskBand: "low" | "medium" | "high" =
        riskScore >= 0.6 ? "high" : riskScore >= 0.3 ? "medium" : "low";

      const scoreBreakdown = { correct, total, overallScore };
      const signalScores = { credibility: credibilityScore, risk: riskScore };

      // Persist assessment score
      await db.insert(assessmentScores).values({
        id: nanoid(),
        sessionId: input.sessionId,
        overallScore: overallScore.toFixed(2) as any,
        scoreBreakdownJson: JSON.stringify(scoreBreakdown),
        signalScoresJson: JSON.stringify(signalScores),
        modelVersion: "v1",
      });

      // Persist credibility score
      await db.insert(credibilityScores).values({
        id: nanoid(),
        userId: ctx.user.id,
        assessmentSessionId: input.sessionId,
        credibilityScore: credibilityScore.toFixed(4) as any,
        band: credibilityBand,
        reasonJson: JSON.stringify({ calibrationDiff, avgConfidence, accuracyRate }),
        modelVersion: "v1",
      });

      // Persist risk score
      await db.insert(riskScores).values({
        id: nanoid(),
        userId: ctx.user.id,
        riskScore: riskScore.toFixed(4) as any,
        band: riskBand,
        reasonJson: JSON.stringify({ speedRisk, scoreRisk, avgTime }),
        modelVersion: "v1",
      });

      // Update user state
      const primaryState =
        overallScore >= 70 ? "proficient" : overallScore >= 50 ? "developing" : "needs_support";
      const learningState = overallScore >= 70 ? "completed" : "in_progress";

      // Close previous state
      await db
        .update(userStates)
        .set({ effectiveTo: new Date() })
        .where(and(eq(userStates.userId, ctx.user.id), isNull(userStates.effectiveTo)));

      await db.insert(userStates).values({
        id: nanoid(),
        userId: ctx.user.id,
        primaryState,
        credibilityState: credibilityBand,
        riskState: riskBand,
        learningState,
        complianceState: "compliant",
        stateReasonJson: JSON.stringify({ source: "assessment", sessionId: input.sessionId }),
      });

      // Log decision
      await db.insert(decisionLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        decisionType: "assessment_completion",
        inputSnapshotJson: JSON.stringify({ sessionId: input.sessionId, answers: answers.length }),
        outputSnapshotJson: JSON.stringify({ overallScore, credibilityScore, riskScore }),
        precedenceAppliedJson: JSON.stringify({ modelVersion: "v1" }),
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
        metadataJson: JSON.stringify({ overallScore, credibilityBand, riskBand }),
      });

      return {
        overallScore,
        credibilityScore,
        credibilityBand,
        riskScore,
        riskBand,
        primaryState,
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
