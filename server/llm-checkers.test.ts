/**
 * AiQ v2.2 — WS3: LLM Quality Gate Tests
 *
 * Tests all 4 quality checkers and the circuit breaker:
 *   1. Structural completeness (required fields, option count, outcome distribution)
 *   2. PII sanitiser (emails, phone numbers, NI numbers)
 *   3. Vendor allow-list (no specific AI product names)
 *   4. Bias / discriminatory language detector
 *   5. Circuit breaker (3 consecutive failures in 60s opens the gate)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  runQualityGate,
  buildReviewQueueRow,
  recordLlmGenerationFailure,
  recordLlmGenerationSuccess,
  isCircuitBreakerOpen,
} from "./assessment/llmQualityGate";
import type { GeneratedItem } from "./assessment/adaptiveEngine";

// ─── Helper: build a valid GeneratedItem ─────────────────────────────────────
function makeValidItem(overrides: Partial<GeneratedItem> = {}): GeneratedItem {
  return {
    title: "AI Output Review: Recruitment Email Draft",
    scenario: "Your AI tool has drafted a recruitment email for a senior HR role.",
    constraint: "You have 10 minutes before the email is scheduled to send.",
    question: "What is the most significant problem with this output?",
    interactionType: "governance_decision",
    capability: "AI Risk & Governance",
    capabilityKey: "governance",
    workflow: "Recruitment & Selection",
    riskLevel: "High",
    difficulty: 2,
    options: [
      {
        label: "A",
        text: "The email uses informal language.",
        outcomeClass: "acceptable",
        signalDeltas: { governance_quality: 0.3 },
        eventCodes: [],
        rationale: "Minor issue.",
      },
      {
        label: "B",
        text: "The email contains no salary range, which is legally required.",
        outcomeClass: "strong",
        signalDeltas: { governance_quality: 0.8 },
        eventCodes: ["GOV-01"],
        rationale: "Correct — compliance gap.",
      },
      {
        label: "C",
        text: "The email is too long.",
        outcomeClass: "weak",
        signalDeltas: { validation_accuracy: -0.2 },
        eventCodes: [],
        rationale: "Minor cosmetic issue.",
      },
    ],
    metadata: {} as GeneratedItem["metadata"],
    ...overrides,
  } as GeneratedItem;
}

// ─── Checker 1: Structural Completeness ──────────────────────────────────────
describe("WS3 Checker 1 — structural completeness", () => {
  it("passes a fully valid item", () => {
    const result = runQualityGate(makeValidItem());
    expect(result.passed).toBe(true);
    expect(result.failedCheckers).not.toContain("structural_completeness");
  });

  it("fails when a required field is missing (scenario)", () => {
    const item = makeValidItem({ scenario: "" });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
  });

  it("fails when options array has fewer than 3 items", () => {
    const item = makeValidItem({
      options: [
        { label: "A", text: "Option A", outcomeClass: "strong", signalDeltas: {}, eventCodes: [], rationale: "" },
        { label: "B", text: "Option B", outcomeClass: "weak", signalDeltas: {}, eventCodes: [], rationale: "" },
      ],
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
  });

  it("fails when options array has more than 5 items", () => {
    const item = makeValidItem({
      options: Array.from({ length: 6 }, (_, i) => ({
        label: String.fromCharCode(65 + i),
        text: `Option ${i}`,
        outcomeClass: "acceptable" as const,
        signalDeltas: {},
        eventCodes: [],
        rationale: "",
      })),
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
  });

  it("fails when no strong outcome option is present", () => {
    const item = makeValidItem({
      options: [
        { label: "A", text: "Option A", outcomeClass: "acceptable", signalDeltas: {}, eventCodes: [], rationale: "" },
        { label: "B", text: "Option B", outcomeClass: "weak", signalDeltas: {}, eventCodes: [], rationale: "" },
        { label: "C", text: "Option C", outcomeClass: "acceptable", signalDeltas: {}, eventCodes: [], rationale: "" },
      ],
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
  });

  it("fails when no weak/failure outcome option is present", () => {
    const item = makeValidItem({
      options: [
        { label: "A", text: "Option A", outcomeClass: "strong", signalDeltas: {}, eventCodes: [], rationale: "" },
        { label: "B", text: "Option B", outcomeClass: "acceptable", signalDeltas: {}, eventCodes: [], rationale: "" },
        { label: "C", text: "Option C", outcomeClass: "acceptable", signalDeltas: {}, eventCodes: [], rationale: "" },
      ],
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
  });

  it("fails when difficulty is out of range (0)", () => {
    const item = makeValidItem({ difficulty: 0 as unknown as 1 });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
  });

  it("fails when difficulty is out of range (5)", () => {
    const item = makeValidItem({ difficulty: 5 as unknown as 1 });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
  });
});

// ─── Checker 2: PII Sanitiser ─────────────────────────────────────────────────
describe("WS3 Checker 2 — PII sanitiser", () => {
  it("passes a clean item with no PII", () => {
    const result = runQualityGate(makeValidItem());
    expect(result.failedCheckers).not.toContain("pii_sanitiser");
  });

  it("fails when scenario contains an email address", () => {
    const item = makeValidItem({
      scenario: "The HR manager sarah.jones@acmecorp.com has drafted a policy.",
    });
    const result = runQualityGate(item);
    expect(result.failedCheckers).toContain("pii_sanitiser");
  });

  it("fails when scenario contains a UK phone number", () => {
    const item = makeValidItem({
      scenario: "Please call the candidate on 07700 900123 to discuss the offer.",
    });
    const result = runQualityGate(item);
    expect(result.failedCheckers).toContain("pii_sanitiser");
  });

  it("fails when scenario contains a National Insurance number", () => {
    const item = makeValidItem({
      scenario: "The employee's NI number is AB 12 34 56 C.",
    });
    const result = runQualityGate(item);
    expect(result.failedCheckers).toContain("pii_sanitiser");
  });
});

// ─── Checker 3: Vendor Allow-List ─────────────────────────────────────────────
describe("WS3 Checker 3 — vendor allow-list", () => {
  it("passes a clean item with no vendor names", () => {
    const result = runQualityGate(makeValidItem());
    expect(result.failedCheckers).not.toContain("vendor_allow_list");
  });

  it("fails when scenario mentions ChatGPT", () => {
    const item = makeValidItem({
      scenario: "Your team has been using ChatGPT to draft performance reviews.",
    });
    const result = runQualityGate(item);
    expect(result.failedCheckers).toContain("vendor_allow_list");
  });

  it("fails when scenario mentions Claude", () => {
    const item = makeValidItem({
      scenario: "The HR director has asked you to evaluate Claude for recruitment use.",
    });
    const result = runQualityGate(item);
    expect(result.failedCheckers).toContain("vendor_allow_list");
  });

  it("fails when scenario mentions Copilot", () => {
    const item = makeValidItem({
      scenario: "Your organisation has deployed Copilot for HR workflows.",
    });
    const result = runQualityGate(item);
    expect(result.failedCheckers).toContain("vendor_allow_list");
  });

  it("passes when item uses generic 'AI tool' language", () => {
    const item = makeValidItem({
      scenario: "Your AI tool has drafted a recruitment email for a senior HR role.",
    });
    const result = runQualityGate(item);
    expect(result.failedCheckers).not.toContain("vendor_allow_list");
  });
});

// ─── Checker 4: Bias Detector ─────────────────────────────────────────────────
describe("WS3 Checker 4 — bias / discriminatory language detector", () => {
  it("passes a clean item with no bias patterns", () => {
    const result = runQualityGate(makeValidItem());
    expect(result.failedCheckers).not.toContain("bias_detector");
  });

  it("fails when scenario contains gendered pronouns (he/she)", () => {
    const item = makeValidItem({
      scenario: "The candidate said he would accept the offer if the salary was higher.",
    });
    const result = runQualityGate(item);
    expect(result.failedCheckers).toContain("bias_detector");
  });

  it("fails when scenario contains 'elderly' language", () => {
    const item = makeValidItem({
      scenario: "The elderly employee has raised a concern about the new AI policy.",
    });
    const result = runQualityGate(item);
    expect(result.failedCheckers).toContain("bias_detector");
  });

  it("fails when scenario contains 'disabled' language", () => {
    const item = makeValidItem({
      scenario: "The disabled applicant requires reasonable adjustments.",
    });
    const result = runQualityGate(item);
    expect(result.failedCheckers).toContain("bias_detector");
  });
});

// ─── Circuit Breaker ──────────────────────────────────────────────────────────
describe("WS3 circuit breaker", () => {
  beforeEach(() => {
    // Reset circuit breaker state before each test
    recordLlmGenerationSuccess(); // resets consecutiveFailures to 0
  });

  it("circuit breaker is closed after success", () => {
    recordLlmGenerationSuccess();
    expect(isCircuitBreakerOpen()).toBe(false);
  });

  it("circuit breaker opens after 3 consecutive failures", () => {
    recordLlmGenerationFailure();
    recordLlmGenerationFailure();
    expect(isCircuitBreakerOpen()).toBe(false); // 2 failures — not yet open
    recordLlmGenerationFailure();
    expect(isCircuitBreakerOpen()).toBe(true);  // 3 failures — open
  });

  it("circuit breaker resets after a success", () => {
    recordLlmGenerationFailure();
    recordLlmGenerationFailure();
    recordLlmGenerationFailure();
    expect(isCircuitBreakerOpen()).toBe(true);
    recordLlmGenerationSuccess();
    expect(isCircuitBreakerOpen()).toBe(false);
  });
});

// ─── buildReviewQueueRow ──────────────────────────────────────────────────────
describe("WS3 buildReviewQueueRow", () => {
  it("builds a valid review queue row for a failed item", () => {
    const item = makeValidItem({ scenario: "The candidate said he would accept." });
    const gateResult = runQualityGate(item);
    expect(gateResult.passed).toBe(false);
    const row = buildReviewQueueRow(item, gateResult, "session-001");
    expect(row.sessionId).toBe("session-001");
    expect(row.status).toBe("pending");
    expect(row.failureReason).toContain("bias_detector");
    expect(row.id).toBeDefined();
  });

  it("routedToReview is true when any checker fails", () => {
    const item = makeValidItem({ scenario: "Your team has been using ChatGPT." });
    const gateResult = runQualityGate(item);
    expect(gateResult.routedToReview).toBe(true);
    expect(gateResult.reviewQueueId).toBeDefined();
  });

  it("routedToReview is false when all checkers pass", () => {
    const item = makeValidItem();
    const gateResult = runQualityGate(item);
    expect(gateResult.routedToReview).toBe(false);
    expect(gateResult.reviewQueueId).toBeUndefined();
  });
});
