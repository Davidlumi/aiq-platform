/**
 * AiQ Coach — Coach Engine
 * Central orchestrator: state machine, mode registry, turn loop, streaming pipeline.
 * Addendum v1.1 §2, §3
 */

import { randomUUID } from "crypto";
import { eq, asc } from "drizzle-orm";
import { getDb } from "../db";
import { coachSessions, coachMessages } from "../../drizzle/schema";
import { auditLogWriter } from "./auditLog";
import { memoryService } from "./memory";
import { telemetryService } from "./telemetry";
import type {
  CoachMode,
  CoachSessionState,
  CoachAct,
  CoachSessionContext,
  ModeHandler,
  StreamEvent,
  MessageRole,
} from "./types";

export const PROMPT_VERSION = "1.0.0";

// ─── Session Persistence Helpers ──────────────────────────────────────────────

async function loadSession(sessionId: string): Promise<CoachSessionContext | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(coachSessions)
    .where(eq(coachSessions.id, sessionId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    sessionId: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    mode: row.mode as CoachMode,
    state: row.state as CoachSessionState,
    currentAct: (row.currentAct ?? "onboarding") as CoachAct,
    turnCount: row.turnCount,
    promptVersion: row.promptVersion,
    classifierVersion: row.classifierVersion,
    assessmentSessionId: row.assessmentSessionId ?? undefined,
    modeContext: (row.modeContextJson as Record<string, unknown>) ?? {},
  };
}

async function saveSession(session: CoachSessionContext): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(coachSessions)
    .set({
      mode: session.mode,
      state: session.state,
      currentAct: session.currentAct,
      turnCount: session.turnCount,
      modeContextJson: session.modeContext,
    })
    .where(eq(coachSessions.id, session.sessionId));
}

async function loadMessageHistory(
  sessionId: string
): Promise<Array<{ role: MessageRole; content: string }>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ role: coachMessages.role, content: coachMessages.content })
    .from(coachMessages)
    .where(eq(coachMessages.sessionId, sessionId))
    .orderBy(asc(coachMessages.createdAt));

  return rows.map((r) => ({
    role: r.role as MessageRole,
    content: r.content,
  }));
}

async function saveMessage(
  sessionId: string,
  tenantId: string,
  userId: string,
  role: MessageRole,
  content: string,
  clientTurnId?: string,
  extra?: {
    classificationJson?: unknown;
    flagsJson?: unknown;
    llmFirstTokenMs?: number;
    llmCompletionMs?: number;
    classifierMs?: number;
    llmInputTokens?: number;
    llmOutputTokens?: number;
    classifierTokens?: number;
  }
): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  if (!db) return id;

  await db.insert(coachMessages).values({
    id,
    sessionId,
    tenantId,
    userId,
    role,
    content,
    clientTurnId,
    classificationJson: extra?.classificationJson ?? null,
    flagsJson: extra?.flagsJson ?? null,
    llmFirstTokenMs: extra?.llmFirstTokenMs,
    llmCompletionMs: extra?.llmCompletionMs,
    classifierMs: extra?.classifierMs,
    llmInputTokens: extra?.llmInputTokens,
    llmOutputTokens: extra?.llmOutputTokens,
    classifierTokens: extra?.classifierTokens,
  });

  return id;
}

// ─── Coach Engine ─────────────────────────────────────────────────────────────

export class CoachEngine {
  private modeHandlers = new Map<CoachMode, ModeHandler>();

  registerMode(handler: ModeHandler): void {
    this.modeHandlers.set(handler.mode, handler);
  }

  /**
   * Create a new coach session.
   */
  async createSession(
    tenantId: string,
    userId: string,
    mode: CoachMode = "diagnostic",
    assessmentSessionId?: string
  ): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const sessionId = randomUUID();

    await db.insert(coachSessions).values({
      id: sessionId,
      tenantId,
      userId,
      mode,
      state: "active",
      currentAct: "onboarding",
      turnCount: 0,
      promptVersion: PROMPT_VERSION,
      classifierVersion: "1.0.0",
      assessmentSessionId,
      modeContextJson: {},
    });

    await auditLogWriter.write({
      eventType: "session.start",
      tenantId,
      userId,
      sessionId,
      payload: { mode, assessmentSessionId },
      promptVersion: PROMPT_VERSION,
    });

    return sessionId;
  }

  /**
   * Process a user turn. Returns an async generator of StreamEvents.
   * This is the main entry point for the turn loop.
   */
  async *processTurn(
    sessionId: string,
    userMessage: string,
    clientTurnId?: string
  ): AsyncGenerator<StreamEvent> {
    // Load session
    const session = await loadSession(sessionId);
    if (!session) {
      yield { type: "error", message: "Session not found", code: "SESSION_NOT_FOUND" };
      return;
    }

    if (session.state === "session_end" || session.state === "failed") {
      yield { type: "error", message: "Session is not active", code: "SESSION_INACTIVE" };
      return;
    }

    // Get mode handler
    const handler = this.modeHandlers.get(session.mode);
    if (!handler) {
      yield { type: "error", message: `No handler for mode: ${session.mode}`, code: "NO_HANDLER" };
      return;
    }

    // Save user message
    const userTurnId = await saveMessage(
      sessionId,
      session.tenantId,
      session.userId,
      "user",
      userMessage,
      clientTurnId
    );

    // Load message history (including the just-saved user message)
    const history = await loadMessageHistory(sessionId);

    // Process through mode handler
    const startMs = Date.now();
    let output;
    try {
      output = await handler.process({
        session,
        userMessage,
        messageHistory: history,
        clientTurnId,
      });
    } catch (err) {
      console.error("[CoachEngine] Mode handler error:", err);
      yield { type: "error", message: "Processing error", code: "HANDLER_ERROR" };
      return;
    }

    const completionMs = Date.now() - startMs;

    // Stream the response token by token (simulate streaming from the full text)
    // In production this would be true SSE streaming from the LLM
    const responseText = output.responseText;
    const words = responseText.split(" ");
    for (const word of words) {
      yield { type: "token", content: word + " " };
    }

    // Save assistant message
    const assistantTurnId = await saveMessage(
      sessionId,
      session.tenantId,
      session.userId,
      "assistant",
      responseText,
      undefined,
      {
        classificationJson: output.classificationResult ?? null,
        flagsJson: output.flags ?? null,
        llmCompletionMs: completionMs,
      }
    );

    // Apply memory proposals
    if (output.memoryProposals && output.memoryProposals.length > 0) {
      const gamingFlagged = output.flags?.gamingDetected ?? false;
      for (const proposal of output.memoryProposals) {
        await memoryService.proposeWrite(
          proposal,
          session.tenantId,
          session.userId,
          gamingFlagged
        );
      }
    }

    // Update session state
    const updatedSession: CoachSessionContext = {
      ...session,
      turnCount: session.turnCount + 1,
      currentAct: output.updatedAct ?? session.currentAct,
      modeContext: output.updatedModeContext ?? session.modeContext,
      state: output.sessionComplete ? "session_end" : session.state,
    };

    // Handle mode transition
    if (output.transitionToMode && output.transitionToMode !== session.mode) {
      updatedSession.mode = output.transitionToMode;
      updatedSession.currentAct = "onboarding";
      updatedSession.modeContext = {};

      await auditLogWriter.write({
        eventType: "mode.transition",
        tenantId: session.tenantId,
        userId: session.userId,
        sessionId,
        payload: {
          fromMode: session.mode,
          toMode: output.transitionToMode,
          turnCount: updatedSession.turnCount,
        },
      });

      yield {
        type: "mode_transition",
        newMode: output.transitionToMode,
        message: `Transitioning to ${output.transitionToMode} mode`,
      };
    }

    await saveSession(updatedSession);

    // Record telemetry
    await telemetryService.recordTurn({
      sessionId,
      tenantId: session.tenantId,
      userId: session.userId,
      turnId: assistantTurnId,
      mode: session.mode,
      act: updatedSession.currentAct,
      llmCompletionMs: completionMs,
      gamingFlagged: output.flags?.gamingDetected ?? false,
      classifierConfidence: output.classificationResult?.confidence,
      memoryWritten: (output.memoryProposals?.length ?? 0) > 0,
    });

    // Emit turn complete
    yield {
      type: "turn_complete",
      turnId: assistantTurnId,
      suggestedReplies: output.suggestedReplies,
    };

    // Emit session complete if done
    if (output.sessionComplete) {
      await auditLogWriter.write({
        eventType: "session.end",
        tenantId: session.tenantId,
        userId: session.userId,
        sessionId,
        payload: { turnCount: updatedSession.turnCount, mode: session.mode },
      });

      // Mark DB session as completed
      const db = await getDb();
      if (db) {
        await db
          .update(coachSessions)
          .set({ state: "session_end", completedAt: new Date() })
          .where(eq(coachSessions.id, sessionId));
      }

      yield { type: "session_complete", summaryMessage: "Session complete." };
    }
  }

  /**
   * Get the opening message for a new session (no user input needed).
   */
  async getOpeningMessage(sessionId: string): Promise<string> {
    const session = await loadSession(sessionId);
    if (!session) return "Hello! I'm your AiQ Coach. Let's get started.";

    const handler = this.modeHandlers.get(session.mode);
    if (!handler) return "Hello! I'm your AiQ Coach. Let's get started.";

    const systemPrompt = handler.getSystemPrompt(session);
    // Return the first line of the system prompt as a greeting placeholder
    // The actual opening is generated by the diagnostic mode handler
    return systemPrompt.split("\n")[0] || "Hello! I'm your AiQ Coach.";
  }

  /**
   * Pause a session.
   */
  async pauseSession(sessionId: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db
      .update(coachSessions)
      .set({ state: "paused", pausedAt: new Date() })
      .where(eq(coachSessions.id, sessionId));
  }

  /**
   * Resume a paused session.
   */
  async resumeSession(sessionId: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db
      .update(coachSessions)
      .set({ state: "active", pausedAt: null })
      .where(eq(coachSessions.id, sessionId));
  }
}

// Singleton engine — modes are registered at startup
export const coachEngine = new CoachEngine();
