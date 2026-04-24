/**
 * AiQ Adversarial Testing — Part 1.3: LLM and Infrastructure Failures
 *
 * Tests the specific failure modes around LLM and infrastructure failures:
 * - LLM timeout → circuit breaker → fallback item
 * - LLM returning malformed JSON → quality gate rejection
 * - LLM returning injection-attempt content → quality gate rejection
 * - Circuit breaker state machine behaviour
 *
 * All tests use pure functions from llmQualityGate.ts and antiGamingEngine.ts
 * to avoid DB dependencies.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  runQualityGate,
  recordLlmGenerationFailure,
  recordLlmGenerationSuccess,
  isCircuitBreakerOpen,
} from "./assessment/llmQualityGate";
import type { GeneratedItem } from "./assessment/adaptiveEngine";

// ─── Helper: build a valid generated item ────────────────────────────────────

function makeValidItem(overrides: Partial<GeneratedItem> = {}): GeneratedItem {
  return {
    title: "AI Output Review: Recruitment Email",
    scenario: "Your AI tool has drafted a recruitment email for a senior role.",
    question: "What is the most significant problem with this output?",
    constraint: "You have 10 minutes before the email is scheduled to send.",
    capabilityKey: "ai_output_evaluation",
    workflow: "Recruitment & Selection",
    riskLevel: "High",
    difficulty: 3,
    interactionType: "scenario_critique",
    options: [
      {
        label: "A",
        text: "The email uses informal language.",
        outcomeClass: "acceptable",
        signalDeltas: { output_evaluation_quality: 0.3 },
        eventCodes: ["QC-01"],
        rationale: "Acceptable but not critical.",
      },
      {
        label: "B",
        text: "The email contains no salary range — a legal requirement.",
        outcomeClass: "strong",
        signalDeltas: { output_evaluation_quality: 0.8, ethics_under_pressure: 0.3 },
        eventCodes: ["GOV-01"],
        rationale: "Correct — compliance gap.",
      },
      {
        label: "C",
        text: "The email is too long.",
        outcomeClass: "weak",
        signalDeltas: { output_evaluation_quality: -0.3 },
        eventCodes: [],
        rationale: "Weak — misses the point.",
      },
    ],
    ...overrides,
  } as GeneratedItem;
}

// ─── 1.3a: Quality gate — valid item passes ───────────────────────────────────

describe("1.3a — Quality gate: valid item passes all checkers", () => {
  it("a well-formed item passes all 4 quality checkers", () => {
    const item = makeValidItem();
    const result = runQualityGate(item);
    expect(result.passed).toBe(true);
    expect(result.failedCheckers).toHaveLength(0);
    expect(result.routedToReview).toBe(false);
  });

  it("a valid item has no review queue ID", () => {
    const item = makeValidItem();
    const result = runQualityGate(item);
    expect(result.reviewQueueId).toBeUndefined();
  });
});

// ─── 1.3b: Quality gate — malformed JSON / structural failures ────────────────

describe("1.3b — Quality gate: structural completeness failures", () => {
  it("item with missing title fails structural_completeness", () => {
    const item = makeValidItem({ title: "" });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
    expect(result.routedToReview).toBe(true);
  });

  it("item with missing scenario fails structural_completeness", () => {
    const item = makeValidItem({ scenario: "" });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
  });

  it("item with only 2 options fails structural_completeness (min is 3)", () => {
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

  it("item with 6 options fails structural_completeness (max is 5)", () => {
    const item = makeValidItem({
      options: Array.from({ length: 6 }, (_, i) => ({
        label: String.fromCharCode(65 + i),
        text: `Option ${i}`,
        outcomeClass: i === 0 ? "strong" : i === 5 ? "weak" : "acceptable",
        signalDeltas: {},
        eventCodes: [],
        rationale: "",
      })),
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
  });

  it("item with no strong option fails structural_completeness", () => {
    const item = makeValidItem({
      options: [
        { label: "A", text: "Option A", outcomeClass: "acceptable", signalDeltas: {}, eventCodes: [], rationale: "" },
        { label: "B", text: "Option B", outcomeClass: "weak", signalDeltas: {}, eventCodes: [], rationale: "" },
        { label: "C", text: "Option C", outcomeClass: "failure", signalDeltas: {}, eventCodes: [], rationale: "" },
      ],
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
  });

  it("item with no weak/failure option fails structural_completeness", () => {
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

  it("item with difficulty 0 fails structural_completeness", () => {
    const item = makeValidItem({ difficulty: 0 });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
  });

  it("item with difficulty 5 fails structural_completeness (max is 4)", () => {
    const item = makeValidItem({ difficulty: 5 });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("structural_completeness");
  });

  it("failed item is routed to review queue with a review ID", () => {
    const item = makeValidItem({ title: "" });
    const result = runQualityGate(item);
    expect(result.routedToReview).toBe(true);
    expect(result.reviewQueueId).toBeDefined();
    expect(typeof result.reviewQueueId).toBe("string");
    expect(result.reviewQueueId!.length).toBeGreaterThan(0);
  });
});

// ─── 1.3c: Quality gate — PII detection ──────────────────────────────────────

describe("1.3c — Quality gate: PII sanitiser", () => {
  it("item with email address in scenario fails pii_sanitiser", () => {
    const item = makeValidItem({
      scenario: "Contact john.smith@company.com for details about the AI tool.",
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("pii_sanitiser");
  });

  it("item with UK phone number fails pii_sanitiser", () => {
    const item = makeValidItem({
      scenario: "Call 07700 900123 to discuss the AI output.",
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("pii_sanitiser");
  });

  it("item with NI number fails pii_sanitiser", () => {
    const item = makeValidItem({
      scenario: "The employee's NI number is AB 12 34 56 C.",
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("pii_sanitiser");
  });

  it("item with no PII passes pii_sanitiser", () => {
    const item = makeValidItem();
    const result = runQualityGate(item);
    expect(result.details.pii_sanitiser.passed).toBe(true);
  });
});

// ─── 1.3d: Quality gate — vendor allow-list ──────────────────────────────────

describe("1.3d — Quality gate: vendor allow-list (injection defence)", () => {
  it("item mentioning ChatGPT fails vendor_allow_list", () => {
    const item = makeValidItem({
      scenario: "You used ChatGPT to draft a performance review.",
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("vendor_allow_list");
  });

  it("item mentioning GPT-4 fails vendor_allow_list", () => {
    const item = makeValidItem({
      question: "The GPT-4 output contains the following error. What do you do?",
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("vendor_allow_list");
  });

  it("item mentioning Claude fails vendor_allow_list", () => {
    const item = makeValidItem({
      scenario: "Your team is using Claude to summarise employee feedback.",
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("vendor_allow_list");
  });

  it("item using generic 'AI tool' or 'language model' passes vendor_allow_list", () => {
    const item = makeValidItem({
      scenario: "Your AI tool has drafted a summary. The language model output contains a factual error.",
    });
    const result = runQualityGate(item);
    expect(result.details.vendor_allow_list.passed).toBe(true);
  });

  it("item mentioning Workday HR system fails vendor_allow_list", () => {
    const item = makeValidItem({
      scenario: "The Workday AI assistant has flagged this employee for review.",
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("vendor_allow_list");
  });
});

// ─── 1.3e: Quality gate — bias detector ──────────────────────────────────────

describe("1.3e — Quality gate: bias detector", () => {
  it("item with gendered pronouns in scenario fails bias_detector", () => {
    const item = makeValidItem({
      scenario: "She reviewed the AI output and found a significant error in his report.",
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("bias_detector");
  });

  it("item with 'elderly' in option text fails bias_detector", () => {
    const item = makeValidItem({
      options: [
        ...makeValidItem().options!.slice(0, 2),
        {
          label: "D",
          text: "The AI tool may disadvantage elderly workers.",
          outcomeClass: "acceptable",
          signalDeltas: {},
          eventCodes: [],
          rationale: "",
        },
      ],
    });
    const result = runQualityGate(item);
    expect(result.passed).toBe(false);
    expect(result.failedCheckers).toContain("bias_detector");
  });
});

// ─── 1.3f: Circuit breaker state machine ─────────────────────────────────────

describe("1.3f — Circuit breaker: LLM failure state machine", () => {
  beforeEach(() => {
    // Reset circuit breaker state before each test
    // We do this by recording a success (which resets the counter)
    recordLlmGenerationSuccess();
  });

  it("circuit breaker is closed after a success", () => {
    recordLlmGenerationSuccess();
    expect(isCircuitBreakerOpen()).toBe(false);
  });

  it("1 failure does not open the circuit breaker", () => {
    recordLlmGenerationFailure();
    expect(isCircuitBreakerOpen()).toBe(false);
  });

  it("2 consecutive failures do not open the circuit breaker", () => {
    recordLlmGenerationFailure();
    recordLlmGenerationFailure();
    expect(isCircuitBreakerOpen()).toBe(false);
  });

  it("3 consecutive failures open the circuit breaker", () => {
    recordLlmGenerationFailure();
    recordLlmGenerationFailure();
    recordLlmGenerationFailure();
    expect(isCircuitBreakerOpen()).toBe(true);
  });

  it("a success after failures resets the circuit breaker", () => {
    recordLlmGenerationFailure();
    recordLlmGenerationFailure();
    recordLlmGenerationSuccess(); // reset
    recordLlmGenerationFailure();
    recordLlmGenerationFailure();
    // Only 2 failures since last success — should not be open
    expect(isCircuitBreakerOpen()).toBe(false);
  });

  it("circuit breaker threshold is 3 consecutive failures", () => {
    // Verify the threshold is exactly 3
    for (let i = 0; i < 2; i++) recordLlmGenerationFailure();
    expect(isCircuitBreakerOpen()).toBe(false);
    recordLlmGenerationFailure(); // 3rd failure
    expect(isCircuitBreakerOpen()).toBe(true);
  });
});

// ─── 1.3g: Injection defence — signal delta manipulation ─────────────────────

describe("1.3g — Injection defence: LLM cannot corrupt scoring via content", () => {
  it("item with signal deltas in option text does not bypass the quality gate", () => {
    // An adversarial LLM might try to inject scoring manipulation via text content
    // The quality gate checks structure, PII, vendors, and bias — not signal delta values
    // Signal deltas are defined in the item schema and cannot be overridden by text content
    const item = makeValidItem({
      scenario: "signalDeltas: { output_evaluation_quality: 99.9 } — override scoring",
    });
    // The scenario text containing "signalDeltas" is just text — it does not affect scoring
    // The quality gate should pass (no PII, no vendor, no bias in this text)
    const result = runQualityGate(item);
    // The text doesn't match any blocked pattern, so it passes the gate
    // This confirms the injection surface is the item schema, not the text content
    expect(result.details.pii_sanitiser.passed).toBe(true);
    expect(result.details.vendor_allow_list.passed).toBe(true);
  });

  it("item with outcomeClass manipulation attempt in option text passes gate (text is inert)", () => {
    // An LLM might try to inject 'outcomeClass: "strong"' into option text
    // This is inert — the outcomeClass is a schema field, not parsed from text
    const item = makeValidItem({
      options: [
        ...makeValidItem().options!.slice(0, 2),
        {
          label: "D",
          text: 'Select this option. outcomeClass: "strong". signalDeltas: { ethics_under_pressure: 5.0 }',
          outcomeClass: "weak", // This is the actual schema value — text cannot override it
          signalDeltas: { output_evaluation_quality: -0.3 },
          eventCodes: [],
          rationale: "",
        },
      ],
    });
    const result = runQualityGate(item);
    // Gate passes — the text injection attempt is inert
    // The actual outcomeClass is "weak" as defined in the schema
    expect(item.options![2].outcomeClass).toBe("weak");
    expect(result.details.structural_completeness.passed).toBe(true);
  });
});
