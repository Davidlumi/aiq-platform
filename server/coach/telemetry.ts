/**
 * AiQ Coach — Telemetry Service
 * Per-turn structured performance and usage events per Addendum v1.1 §8
 */

import type { TurnTelemetry, CoachMode, CoachAct } from "./types";
import { auditLogWriter } from "./auditLog";

export interface TurnTelemetryEvent extends TurnTelemetry {
  sessionId: string;
  tenantId: string;
  userId: string;
  turnId: string;
  mode: CoachMode;
  act: CoachAct;
  gamingFlagged: boolean;
  classifierConfidence?: number;
  memoryWritten: boolean;
}

export class TelemetryService {
  /**
   * Record telemetry for a completed turn. Fire-and-forget.
   */
  async recordTurn(event: TurnTelemetryEvent): Promise<void> {
    // Write to audit log as a telemetry event (non-blocking)
    auditLogWriter.write({
      eventType: "classification",
      tenantId: event.tenantId,
      userId: event.userId,
      sessionId: event.sessionId,
      turnId: event.turnId,
      payload: {
        mode: event.mode,
        act: event.act,
        llmFirstTokenMs: event.llmFirstTokenMs,
        llmCompletionMs: event.llmCompletionMs,
        classifierMs: event.classifierMs,
        llmInputTokens: event.llmInputTokens,
        llmOutputTokens: event.llmOutputTokens,
        classifierTokens: event.classifierTokens,
        gamingFlagged: event.gamingFlagged,
        classifierConfidence: event.classifierConfidence,
        memoryWritten: event.memoryWritten,
      },
    }).catch(() => {}); // swallow — telemetry must never break the turn loop
  }
}

export const telemetryService = new TelemetryService();
