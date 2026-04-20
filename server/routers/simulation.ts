import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  simulations,
  simulationNodes,
  simulationChoices,
  simulationTransitions,
  simulationSessions,
  simulationSessionEvents,
  simulationResults,
  auditLogs,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const simulationRouter = router({
  // List published simulations
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select()
      .from(simulations)
      .where(eq(simulations.status, "published"));
  }),

  // Get simulation with nodes
  get: protectedProcedure
    .input(z.object({ simulationId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const sim = await db
        .select()
        .from(simulations)
        .where(eq(simulations.id, input.simulationId))
        .limit(1);
      if (!sim[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const nodes = await db
        .select()
        .from(simulationNodes)
        .where(eq(simulationNodes.simulationId, input.simulationId))
        .orderBy(simulationNodes.nodeOrder);

      const nodesWithChoices = await Promise.all(
        nodes.map(async node => {
          const choices = await db
            .select()
            .from(simulationChoices)
            .where(eq(simulationChoices.nodeId, node.id))
            .orderBy(simulationChoices.choiceOrder);
          return { ...node, choices };
        })
      );

      const transitions = await db
        .select()
        .from(simulationTransitions)
        .where(eq(simulationTransitions.simulationId, input.simulationId));

      return { ...sim[0], nodes: nodesWithChoices, transitions };
    }),

  // Start a simulation session
  startSession: protectedProcedure
    .input(
      z.object({
        simulationId: z.string(),
        learningPlanId: z.string().optional(),
        mode: z.enum(["standard", "guided"]).default("standard"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const sim = await db
        .select()
        .from(simulations)
        .where(eq(simulations.id, input.simulationId))
        .limit(1);
      if (!sim[0]) throw new TRPCError({ code: "NOT_FOUND" });

      // Find start node
      const startNode = await db
        .select()
        .from(simulationNodes)
        .where(
          and(
            eq(simulationNodes.simulationId, input.simulationId),
            eq(simulationNodes.isStart, true)
          )
        )
        .limit(1);

      const sessionId = nanoid();
      await db.insert(simulationSessions).values({
        id: sessionId,
        simulationId: input.simulationId,
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        learningPlanId: input.learningPlanId ?? null,
        state: "in_progress",
        mode: input.mode,
        currentNodeId: startNode[0]?.id ?? null,
      });

      await db.insert(simulationSessionEvents).values({
        id: nanoid(),
        sessionId,
        nodeId: startNode[0]?.id ?? null,
        eventType: "session_started",
        payloadJson: JSON.stringify({ simulationId: input.simulationId, mode: input.mode }),
      });

      return { sessionId, startNodeId: startNode[0]?.id ?? null };
    }),

  // Get current session state
  session: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const session = await db
        .select()
        .from(simulationSessions)
        .where(
          and(
            eq(simulationSessions.id, input.sessionId),
            eq(simulationSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND" });

      let currentNode = null;
      if (session[0].currentNodeId) {
        const nodes = await db
          .select()
          .from(simulationNodes)
          .where(eq(simulationNodes.id, session[0].currentNodeId))
          .limit(1);
        if (nodes[0]) {
          const choices = await db
            .select()
            .from(simulationChoices)
            .where(eq(simulationChoices.nodeId, nodes[0].id))
            .orderBy(simulationChoices.choiceOrder);
          currentNode = { ...nodes[0], choices };
        }
      }

      const events = await db
        .select()
        .from(simulationSessionEvents)
        .where(eq(simulationSessionEvents.sessionId, input.sessionId))
        .orderBy(simulationSessionEvents.occurredAt);

      return { session: session[0], currentNode, events };
    }),

  // Make a choice in simulation
  makeChoice: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        nodeId: z.string(),
        choiceId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const session = await db
        .select()
        .from(simulationSessions)
        .where(
          and(
            eq(simulationSessions.id, input.sessionId),
            eq(simulationSessions.userId, ctx.user.id),
            eq(simulationSessions.state, "in_progress")
          )
        )
        .limit(1);

      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const choice = await db
        .select()
        .from(simulationChoices)
        .where(eq(simulationChoices.id, input.choiceId))
        .limit(1);

      if (!choice[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Choice not found" });

      // Find next node via transition
      const transition = await db
        .select()
        .from(simulationTransitions)
        .where(
          and(
            eq(simulationTransitions.fromNodeId, input.nodeId),
            eq(simulationTransitions.choiceId, input.choiceId)
          )
        )
        .limit(1);

      const newScore =
        parseFloat(String(session[0].totalScore)) + parseFloat(String(choice[0].scoreDelta));
      const nextNodeId = transition[0]?.toNodeId ?? null;

      // Log event
      await db.insert(simulationSessionEvents).values({
        id: nanoid(),
        sessionId: input.sessionId,
        nodeId: input.nodeId,
        choiceId: input.choiceId,
        eventType: "choice_made",
        payloadJson: JSON.stringify({
          choiceKey: choice[0].choiceKey,
          outcomeType: choice[0].outcomeType,
          scoreDelta: choice[0].scoreDelta,
          riskDelta: choice[0].riskDelta,
        }),
      });

      // Update session
      await db
        .update(simulationSessions)
        .set({
          currentNodeId: nextNodeId,
          totalScore: newScore.toFixed(2) as any,
        })
        .where(eq(simulationSessions.id, input.sessionId));

      // Check if next node is end
      let isEnd = false;
      if (nextNodeId) {
        const nextNode = await db
          .select()
          .from(simulationNodes)
          .where(eq(simulationNodes.id, nextNodeId))
          .limit(1);
        isEnd = nextNode[0]?.isEnd ?? false;
      } else {
        isEnd = true;
      }

      return {
        nextNodeId,
        isEnd,
        scoreDelta: parseFloat(String(choice[0].scoreDelta)),
        outcomeType: choice[0].outcomeType,
      };
    }),

  // Complete simulation session
  completeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const session = await db
        .select()
        .from(simulationSessions)
        .where(
          and(
            eq(simulationSessions.id, input.sessionId),
            eq(simulationSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const totalScore = parseFloat(String(session[0].totalScore));
      const passed = totalScore >= 60; // 60% pass threshold

      await db.insert(simulationResults).values({
        id: nanoid(),
        sessionId: input.sessionId,
        totalScore: totalScore.toFixed(2) as any,
        scoreBreakdownJson: JSON.stringify({ totalScore }),
        passed,
        riskImpactJson: JSON.stringify({}),
        feedbackJson: JSON.stringify({
          message: passed
            ? "Well done! You passed this simulation."
            : "You did not meet the pass threshold. Review the learning materials and try again.",
        }),
      });

      const finalState = passed ? "passed" : "failed";
      await db
        .update(simulationSessions)
        .set({ state: finalState, completedAt: new Date() })
        .where(eq(simulationSessions.id, input.sessionId));

      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "simulation.session.completed",
        targetType: "simulation_session",
        targetId: input.sessionId,
        metadataJson: JSON.stringify({ totalScore, passed }),
      });

      return { totalScore, passed };
    }),

  // Get user's simulation history
  history: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const targetUserId = input.userId ?? ctx.user.id;

      const sessions = await db
        .select()
        .from(simulationSessions)
        .where(
          and(
            eq(simulationSessions.userId, targetUserId),
            eq(simulationSessions.tenantId, ctx.user.tenantId)
          )
        )
        .orderBy(desc(simulationSessions.startedAt))
        .limit(20);

      return sessions;
    }),
});
