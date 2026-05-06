/**
 * AiQ Coach — Core Types
 * Architectural Addendum v1.1 §2, §3, §4
 */

// ─── Mode & State Enums ───────────────────────────────────────────────────────

export type CoachMode =
  | "diagnostic"
  | "debrief"
  | "learning"
  | "practice"
  | "apply"
  | "manager";

export type CoachSessionState =
  | "idle"
  | "active"
  | "paused"
  | "transitioning"
  | "session_end"
  | "error"
  | "failed";

export type CoachAct =
  | "onboarding"
  | "baseline"
  | "adaptive"
  | "validation"
  | "closing"
  | "debrief_intro"
  | "debrief_domain"
  | "debrief_plan"
  | "apply_commitment"
  | "apply_checkin"
  | "apply_evidence";

// ─── Session Context ──────────────────────────────────────────────────────────

export interface CoachSessionContext {
  sessionId: string;
  tenantId: string;
  userId: string;
  mode: CoachMode;
  state: CoachSessionState;
  currentAct: CoachAct;
  turnCount: number;
  promptVersion: string;
  classifierVersion: string;
  assessmentSessionId?: string;
  modeContext: Record<string, unknown>;
}

// ─── Message Types ────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface CoachTurn {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  clientTurnId?: string;
  classificationResult?: ClassificationResult;
  flags?: TurnFlags;
  telemetry?: TurnTelemetry;
  createdAt: Date;
}

// ─── Classification ───────────────────────────────────────────────────────────

/** Confidence thresholds per Addendum §4.2 */
export const CLASSIFIER_THRESHOLDS = {
  COMMIT: 0.65,
  PROBE: 0.45,
} as const;

export interface ClassificationResult {
  itemId: string;
  selectedOption: "A" | "B" | "C" | "D";
  confidence: number; // 0.0–1.0
  signalDeltas: Record<string, number>;
  rationale?: string;
  needsProbe: boolean;
  needsHumanReview: boolean;
  classifierVersion: string;
  latencyMs: number;
}

// ─── Anti-gaming / Contradiction Flags ───────────────────────────────────────

export interface TurnFlags {
  gamingDetected: boolean;
  gamingPatterns?: string[];
  contradictionDetected: boolean;
  contradictionSignals?: string[];
  suppressMemoryWrite: boolean;
  scrutinyLevel: "normal" | "elevated" | "high";
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export interface TurnTelemetry {
  llmFirstTokenMs?: number;
  llmCompletionMs?: number;
  classifierMs?: number;
  llmInputTokens?: number;
  llmOutputTokens?: number;
  classifierTokens?: number;
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export type CapabilityMemoryType =
  | "strength"
  | "gap"
  | "misconception"
  | "practice_result"
  | "apply_commitment"
  | "apply_evidence"
  | "confidence_shift"
  | "manager_note"
  | "recurring_misconception";

export interface MemoryWriteProposal {
  capabilityDomain: string;
  signalKey: string;
  memoryType: CapabilityMemoryType;
  confidence: number; // 0–100 integer
  summary: string;
  evidence: {
    turnId: string;
    sessionId: string;
    mode: CoachMode;
    classificationResult?: ClassificationResult;
  };
}

export interface MemoryWriteResult {
  written: boolean;
  memoryId?: string;
  reason?: "insufficient_confidence" | "conflict_detected" | "superseded" | "gaming_flagged" | "ok";
}

// ─── Mode Handler Interface ───────────────────────────────────────────────────

export interface ModeHandlerInput {
  session: CoachSessionContext;
  userMessage: string;
  messageHistory: Array<{ role: MessageRole; content: string }>;
  clientTurnId?: string;
}

export interface ModeHandlerOutput {
  responseText: string;
  updatedAct?: CoachAct;
  updatedModeContext?: Record<string, unknown>;
  classificationResult?: ClassificationResult;
  flags?: TurnFlags;
  memoryProposals?: MemoryWriteProposal[];
  transitionToMode?: CoachMode;
  sessionComplete?: boolean;
  suggestedReplies?: string[];
}

export interface ModeHandler {
  mode: CoachMode;
  process(input: ModeHandlerInput): Promise<ModeHandlerOutput>;
  getSystemPrompt(session: CoachSessionContext): string;
  isComplete(session: CoachSessionContext): boolean;
  onComplete(session: CoachSessionContext): Promise<void>;
}

// ─── Audit Log Event Types ────────────────────────────────────────────────────

export type AuditEventType =
  | "session.start"
  | "session.end"
  | "session.pause"
  | "session.resume"
  | "mode.transition"
  | "classification"
  | "memory.write"
  | "memory.conflict"
  | "gaming.detected"
  | "contradiction.detected"
  | "human.override"
  | "commitment.created"
  | "evidence.submitted"
  | "dispute.raised"
  | "error";

export interface AuditEvent {
  eventType: AuditEventType;
  tenantId: string;
  userId?: string;
  sessionId?: string;
  turnId?: string;
  payload: Record<string, unknown>;
  classifierVersion?: string;
  promptVersion?: string;
}

// ─── Streaming ────────────────────────────────────────────────────────────────

export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "turn_complete"; turnId: string; suggestedReplies?: string[] }
  | { type: "mode_transition"; newMode: CoachMode; message?: string }
  | { type: "session_complete"; summaryMessage?: string }
  | { type: "error"; message: string; code?: string };
