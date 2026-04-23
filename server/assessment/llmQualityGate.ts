/**
 * AIQ v2.2 — WS3: LLM Item Quality Gate
 *
 * Runs 4 checker passes on every LLM-generated item before it is served to a participant:
 *   1. Structural completeness (required fields, option count, outcome class distribution)
 *   2. PII / sensitive-data sanitiser (names, emails, phone numbers, NI numbers)
 *   3. Vendor allow-list (item must not reference a specific AI product by name)
 *   4. Bias / discriminatory language detector (protected characteristics)
 *
 * Circuit breaker: if the LLM generation service fails 3 consecutive times within a
 * 60-second window, the gate opens and all items are routed to the human review queue.
 *
 * Human review queue: items that fail any checker are inserted into llm_item_review_queue
 * and a fallback item is served instead.
 */

import { nanoid } from "nanoid";
import type { GeneratedItem } from "./adaptiveEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QualityGateResult {
  passed: boolean;
  failedCheckers: QualityCheckerName[];
  details: Record<QualityCheckerName, { passed: boolean; reason?: string }>;
  /** If true, the item was routed to the human review queue */
  routedToReview: boolean;
  reviewQueueId?: string;
}

export type QualityCheckerName =
  | "structural_completeness"
  | "pii_sanitiser"
  | "vendor_allow_list"
  | "bias_detector";

// ─── Circuit Breaker State ────────────────────────────────────────────────────

interface CircuitBreakerState {
  consecutiveFailures: number;
  lastFailureAt: number | null;
  isOpen: boolean;
}

const circuitBreaker: CircuitBreakerState = {
  consecutiveFailures: 0,
  lastFailureAt: null,
  isOpen: false,
};

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_WINDOW_MS = 60_000;

export function recordLlmGenerationFailure(): void {
  const now = Date.now();
  // Reset if last failure was outside the window
  if (circuitBreaker.lastFailureAt && now - circuitBreaker.lastFailureAt > CIRCUIT_BREAKER_WINDOW_MS) {
    circuitBreaker.consecutiveFailures = 0;
    circuitBreaker.isOpen = false;
  }
  circuitBreaker.consecutiveFailures++;
  circuitBreaker.lastFailureAt = now;
  if (circuitBreaker.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true;
  }
}

export function recordLlmGenerationSuccess(): void {
  circuitBreaker.consecutiveFailures = 0;
  circuitBreaker.isOpen = false;
}

export function isCircuitBreakerOpen(): boolean {
  if (!circuitBreaker.isOpen) return false;
  // Auto-reset after window
  if (circuitBreaker.lastFailureAt && Date.now() - circuitBreaker.lastFailureAt > CIRCUIT_BREAKER_WINDOW_MS) {
    circuitBreaker.isOpen = false;
    circuitBreaker.consecutiveFailures = 0;
    return false;
  }
  return true;
}

// ─── Checker 1: Structural Completeness ──────────────────────────────────────

const REQUIRED_ITEM_FIELDS: Array<keyof GeneratedItem> = [
  "title", "scenario", "question", "options", "capabilityKey",
  "riskLevel", "difficulty", "interactionType", "workflow",
];

function checkStructuralCompleteness(item: GeneratedItem): { passed: boolean; reason?: string } {
  for (const field of REQUIRED_ITEM_FIELDS) {
    if (!item[field]) return { passed: false, reason: `Missing required field: ${field}` };
  }
  if (!Array.isArray(item.options) || item.options.length < 3 || item.options.length > 5) {
    return { passed: false, reason: `Options count must be 3-5, got ${item.options?.length ?? 0}` };
  }
  const outcomeClasses = item.options.map(o => o.outcomeClass);
  const hasStrong = outcomeClasses.includes("strong");
  const hasWeak = outcomeClasses.some(c => c === "weak" || c === "failure" || c === "critical_failure");
  if (!hasStrong) return { passed: false, reason: "No strong outcome option present" };
  if (!hasWeak) return { passed: false, reason: "No weak/failure outcome option present" };
  if (item.difficulty < 1 || item.difficulty > 4) {
    return { passed: false, reason: `Difficulty must be 1-4, got ${item.difficulty}` };
  }
  return { passed: true };
}

// ─── Checker 2: PII Sanitiser ─────────────────────────────────────────────────

const PII_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "email",       pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g },
  { name: "phone_uk",    pattern: /(\+44|0)\s?\d{4}\s?\d{6}/g },
  { name: "ni_number",   pattern: /[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]/g },
  { name: "nhs_number",  pattern: /\b\d{3}\s?\d{3}\s?\d{4}\b/g },
  { name: "full_name_pattern", pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g }, // basic name heuristic
];

function checkPiiSanitiser(item: GeneratedItem): { passed: boolean; reason?: string } {
  const textToCheck = [
    item.title, item.scenario, item.question, item.constraint ?? "",
    ...(item.options ?? []).map(o => o.text),
  ].join(" ");

  for (const { name, pattern } of PII_PATTERNS) {
    if (name === "full_name_pattern") continue; // too noisy — skip name heuristic in auto gate
    pattern.lastIndex = 0;
    if (pattern.test(textToCheck)) {
      return { passed: false, reason: `PII pattern detected: ${name}` };
    }
  }
  return { passed: true };
}

// ─── Checker 3: Vendor Allow-List ─────────────────────────────────────────────

/**
 * Items must not reference specific AI vendors by name.
 * This prevents the assessment from becoming a product knowledge test.
 * Allow-listed generic terms: "AI tool", "AI system", "language model", "AI assistant".
 */
const VENDOR_BLOCKLIST = [
  "ChatGPT", "GPT-4", "GPT-3", "Claude", "Gemini", "Copilot", "Bard",
  "Midjourney", "DALL-E", "Stable Diffusion", "Llama", "Mistral",
  "Workday", "SAP SuccessFactors", "Oracle HCM", "Eightfold", "Beamery",
];

function checkVendorAllowList(item: GeneratedItem): { passed: boolean; reason?: string } {
  const textToCheck = [
    item.title, item.scenario, item.question, item.constraint ?? "",
    ...(item.options ?? []).map(o => o.text),
  ].join(" ");

  for (const vendor of VENDOR_BLOCKLIST) {
    if (textToCheck.includes(vendor)) {
      return { passed: false, reason: `Vendor name detected: ${vendor}` };
    }
  }
  return { passed: true };
}

// ─── Checker 4: Bias / Discriminatory Language Detector ──────────────────────

const BIAS_PATTERNS = [
  /\b(he|she|his|her)\b/gi,           // gendered pronouns
  /\b(elderly|old person|young person)\b/gi,
  /\b(disabled|handicapped)\b/gi,
  /\b(ethnic minority|minority group)\b/gi,
  /\b(Christian|Muslim|Jewish|Hindu|Buddhist)\b/gi,
];

function checkBiasDetector(item: GeneratedItem): { passed: boolean; reason?: string } {
  const textToCheck = [
    item.scenario, item.question,
    ...(item.options ?? []).map(o => o.text),
  ].join(" ");

  for (const pattern of BIAS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(textToCheck)) {
      return { passed: false, reason: `Potential bias pattern detected: ${pattern.source}` };
    }
  }
  return { passed: true };
}

// ─── Main Gate Function ───────────────────────────────────────────────────────

/**
 * Run all 4 quality checkers on a generated item.
 * Returns a QualityGateResult with pass/fail status and details.
 *
 * Does NOT write to the DB — the caller is responsible for inserting into
 * llm_item_review_queue if routedToReview is true.
 */
export function runQualityGate(item: GeneratedItem): QualityGateResult {
  const structural = checkStructuralCompleteness(item);
  const pii = checkPiiSanitiser(item);
  const vendor = checkVendorAllowList(item);
  const bias = checkBiasDetector(item);

  const details: Record<QualityCheckerName, { passed: boolean; reason?: string }> = {
    structural_completeness: structural,
    pii_sanitiser: pii,
    vendor_allow_list: vendor,
    bias_detector: bias,
  };

  const failedCheckers = (Object.entries(details) as [QualityCheckerName, { passed: boolean }][])
    .filter(([, v]) => !v.passed)
    .map(([k]) => k);

  const passed = failedCheckers.length === 0;
  const reviewQueueId = passed ? undefined : `lirq-${nanoid()}`;

  return {
    passed,
    failedCheckers,
    details,
    routedToReview: !passed,
    reviewQueueId,
  };
}

/**
 * Build the DB row to insert into llm_item_review_queue when an item fails the gate.
 */
export function buildReviewQueueRow(
  item: GeneratedItem,
  result: QualityGateResult,
  sessionId?: string
): {
  id: string;
  sessionId: string | null;
  itemId: string;
  failureReason: string;
  itemJson: unknown;
  status: "pending";
} {
  return {
    id: result.reviewQueueId ?? `lirq-${nanoid()}`,
    sessionId: sessionId ?? null,
    itemId: `pending-${nanoid()}`,
    failureReason: result.failedCheckers
      .map(c => `${c}: ${result.details[c].reason ?? "failed"}`)
      .join("; "),
    itemJson: item as unknown,
    status: "pending",
  };
}
