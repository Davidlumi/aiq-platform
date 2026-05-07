/**
 * AiQ Coach — tRPC Router
 * Addendum v1.1 §3 — Coach API surface
 *
 * Streaming is handled via a dedicated Express SSE endpoint (/api/coach/stream)
 * registered in server/_core/index.ts. This router handles session lifecycle
 * and non-streaming operations.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  coachSessions,
  coachMessages,
} from "../../drizzle/schema";
import { coachEngine } from "../coach/engine";
import type { CoachMode } from "../coach/types";

// ─── Procedures ───────────────────────────────────────────────────────────────

export const coachRouter = router({
  /**
   * Create or resume a coach session.
   * If an active session exists for this user+mode, returns it.
   * Otherwise creates a new one.
   */
  createOrResumeSession: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["diagnostic", "debrief", "learning", "practice", "apply", "strategy", "manager"]).default("diagnostic"),
        assessmentSessionId: z.string().optional(),
        forceNew: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const tenantId = ctx.user.tenantId ?? ctx.user.id;

      // Check for existing active session
      if (!input.forceNew) {
        const existing = await db
          .select()
          .from(coachSessions)
          .where(
            and(
              eq(coachSessions.userId, ctx.user.id),
              eq(coachSessions.mode, input.mode),
              eq(coachSessions.state, "active")
            )
          )
          .orderBy(desc(coachSessions.startedAt))
          .limit(1);

        if (existing[0]) {
          return {
            sessionId: existing[0].id,
            isNew: false,
            mode: existing[0].mode as CoachMode,
            turnCount: existing[0].turnCount,
          };
        }
      }

      // Create new session
      const sessionId = await coachEngine.createSession(
        tenantId,
        ctx.user.id,
        input.mode as CoachMode,
        input.assessmentSessionId
      );

      return {
        sessionId,
        isNew: true,
        mode: input.mode as CoachMode,
        turnCount: 0,
      };
    }),

  /**
   * Get the opening message for a new session.
   * Called immediately after createOrResumeSession when isNew=true.
   */
  getOpeningMessage: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify session belongs to user
      const session = await db
        .select()
        .from(coachSessions)
        .where(
          and(
            eq(coachSessions.id, input.sessionId),
            eq(coachSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND" });

      // If there are already messages, return null (session already started)
      const existingMessages = await db
        .select()
        .from(coachMessages)
        .where(eq(coachMessages.sessionId, input.sessionId))
        .limit(1);

      if (existingMessages.length > 0) {
        return { message: null };
      }

      const message = await coachEngine.getOpeningMessage(input.sessionId);
      return { message };
    }),

  /**
   * Send a message to the coach. Returns the full assistant response.
   * For streaming, use the /api/coach/stream SSE endpoint.
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        message: z.string().min(1).max(2000),
        clientTurnId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify session belongs to user
      const session = await db
        .select()
        .from(coachSessions)
        .where(
          and(
            eq(coachSessions.id, input.sessionId),
            eq(coachSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND" });
      if (session[0].state === "session_end") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Session has ended" });
      }

      // Collect all stream events to build the full response
      let responseText = "";
      let turnId = "";
      let suggestedReplies: string[] = [];
      let sessionComplete = false;
      let modeTransition: CoachMode | undefined;

      try {
        for await (const event of coachEngine.processTurn(
          input.sessionId,
          input.message,
          input.clientTurnId
        )) {
          if (event.type === "token") {
            responseText += event.content;
          } else if (event.type === "turn_complete") {
            turnId = event.turnId;
            suggestedReplies = event.suggestedReplies ?? [];
          } else if (event.type === "session_complete") {
            sessionComplete = true;
          } else if (event.type === "mode_transition") {
            modeTransition = event.newMode;
          } else if (event.type === "error") {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: event.message,
            });
          }
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process message",
        });
      }

      return {
        responseText: responseText.trim(),
        turnId,
        suggestedReplies,
        sessionComplete,
        modeTransition,
      };
    }),

  /**
   * Get the full message history for a session.
   */
  getHistory: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify session belongs to user
      const session = await db
        .select()
        .from(coachSessions)
        .where(
          and(
            eq(coachSessions.id, input.sessionId),
            eq(coachSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const messages = await db
        .select({
          id: coachMessages.id,
          role: coachMessages.role,
          content: coachMessages.content,
          suggestedReplies: coachMessages.flagsJson,
          createdAt: coachMessages.createdAt,
        })
        .from(coachMessages)
        .where(eq(coachMessages.sessionId, input.sessionId))
        .orderBy(asc(coachMessages.createdAt));

      return {
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: m.createdAt,
        })),
        session: {
          id: session[0].id,
          mode: session[0].mode as CoachMode,
          state: session[0].state,
          turnCount: session[0].turnCount,
          currentAct: session[0].currentAct,
        },
      };
    }),

  /**
   * Get all sessions for the current user.
   */
  listSessions: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["diagnostic", "debrief", "learning", "practice", "apply", "strategy", "manager"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { sessions: [] };

      const conditions = [eq(coachSessions.userId, ctx.user.id)];
      if (input?.mode) {
        conditions.push(eq(coachSessions.mode, input.mode));
      }

      const sessions = await db
        .select()
        .from(coachSessions)
        .where(and(...conditions))
        .orderBy(desc(coachSessions.startedAt))
        .limit(20);

      return {
        sessions: sessions.map((s) => ({
          id: s.id,
          mode: s.mode as CoachMode,
          state: s.state,
          turnCount: s.turnCount,
          currentAct: s.currentAct,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
        })),
      };
    }),

  /**
   * Pause a session.
   */
  pauseSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const session = await db
        .select()
        .from(coachSessions)
        .where(
          and(
            eq(coachSessions.id, input.sessionId),
            eq(coachSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND" });

      await coachEngine.pauseSession(input.sessionId);
      return { success: true };
    }),

  /**
   * Resume a paused session.
   */
  resumeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const session = await db
        .select()
        .from(coachSessions)
        .where(
          and(
            eq(coachSessions.id, input.sessionId),
            eq(coachSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND" });

      await coachEngine.resumeSession(input.sessionId);
      return { success: true };
    }),
});
