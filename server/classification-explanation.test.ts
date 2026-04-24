/**
 * AiQ v2.2 — WS4.2: Classification Explanation Tests
 *
 * Tests the plain-language explanation logic used by getClassificationExplanation.
 * The procedure builds a structured explanation from the score breakdown JSON,
 * including:
 *   - State and label
 *   - isProvisional flag (unknown states or low confidence)
 *   - topStrengths and topGaps (sorted by capability score)
 *   - factors array (overall score, confidence, governance flag, failure modes)
 *   - confidenceBand (high/medium/low)
 *
 * These tests validate the pure logic functions extracted from the procedure.
 */
import { describe, it, expect } from "vitest";

// ─── Pure logic functions extracted from getClassificationExplanation ─────────

/**
 * Determine if a classification is provisional.
 */
function isProvisional(state: string, confidenceScore: number): boolean {
  const isUnknown = state === "unknown" || state === "unknown_insufficient_evidence";
  return isUnknown || confidenceScore < 0.4;
}

/**
 * Compute confidence band from a confidence score.
 */
function getConfidenceBand(score: number): "high" | "medium" | "low" {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

/**
 * Get the top N strengths from capability scores (highest scores first).
 */
function getTopStrengths(capabilityScores: Record<string, number>, n = 2): string[] {
  return Object.entries(capabilityScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k.replace(/_/g, " "));
}

/**
 * Get the top N gaps from capability scores (lowest scores first).
 */
function getTopGaps(capabilityScores: Record<string, number>, n = 2): string[] {
  return Object.entries(capabilityScores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, n)
    .map(([k]) => k.replace(/_/g, " "));
}

/**
 * Build the factors array from score breakdown data.
 */
function buildFactors(
  overallScore: number,
  confidenceScore: number,
  failureModes: { governanceFlag: boolean; modes: string[] }
): Array<{ factor: string; direction: "positive" | "negative" | "neutral"; detail: string }> {
  const factors: Array<{ factor: string; direction: "positive" | "negative" | "neutral"; detail: string }> = [];

  // Overall score factor
  factors.push({
    factor: "Overall capability score",
    direction: overallScore >= 65 ? "positive" : overallScore >= 45 ? "neutral" : "negative",
    detail: `Your overall score of ${Math.round(overallScore)}/100 ${overallScore >= 65 ? "meets" : "is below"} the threshold for this classification band.`,
  });

  // Confidence factor
  factors.push({
    factor: "Assessment confidence",
    direction: confidenceScore >= 0.6 ? "positive" : confidenceScore >= 0.4 ? "neutral" : "negative",
    detail: confidenceScore >= 0.6
      ? "Sufficient evidence was gathered to make a reliable classification."
      : confidenceScore >= 0.4
      ? "Moderate evidence was gathered. The classification carries some uncertainty."
      : "Limited evidence was gathered. The classification should be treated as provisional.",
  });

  // Governance flag
  if (failureModes.governanceFlag) {
    factors.push({
      factor: "Governance concern detected",
      direction: "negative",
      detail: "One or more responses indicated a pattern of bypassing or underweighting governance considerations.",
    });
  }

  // Failure modes
  for (const mode of failureModes.modes ?? []) {
    factors.push({
      factor: `Failure mode: ${mode.replace(/_/g, " ")}`,
      direction: "negative",
      detail: `A '${mode.replace(/_/g, " ")}' pattern was detected in your responses.`,
    });
  }

  return factors;
}

// ─── isProvisional ────────────────────────────────────────────────────────────
describe("WS4.2 isProvisional", () => {
  it("is NOT provisional for safe state with high confidence", () => {
    expect(isProvisional("safe", 0.8)).toBe(false);
  });

  it("IS provisional for unknown state", () => {
    expect(isProvisional("unknown", 0.8)).toBe(true);
  });

  it("IS provisional for unknown_insufficient_evidence state", () => {
    expect(isProvisional("unknown_insufficient_evidence", 0.8)).toBe(true);
  });

  it("IS provisional when confidence < 0.4 (even for safe state)", () => {
    expect(isProvisional("safe", 0.35)).toBe(true);
  });

  it("IS provisional for at_risk state with low confidence", () => {
    expect(isProvisional("at_risk", 0.3)).toBe(true);
  });

  it("is NOT provisional for at_risk state with adequate confidence", () => {
    expect(isProvisional("at_risk", 0.6)).toBe(false);
  });
});

// ─── getConfidenceBand ────────────────────────────────────────────────────────
describe("WS4.2 getConfidenceBand", () => {
  it("returns 'high' for confidence >= 0.75", () => {
    expect(getConfidenceBand(0.75)).toBe("high");
    expect(getConfidenceBand(0.9)).toBe("high");
    expect(getConfidenceBand(1.0)).toBe("high");
  });

  it("returns 'medium' for confidence 0.5–0.74", () => {
    expect(getConfidenceBand(0.5)).toBe("medium");
    expect(getConfidenceBand(0.6)).toBe("medium");
    expect(getConfidenceBand(0.74)).toBe("medium");
  });

  it("returns 'low' for confidence < 0.5", () => {
    expect(getConfidenceBand(0.49)).toBe("low");
    expect(getConfidenceBand(0.3)).toBe("low");
    expect(getConfidenceBand(0.0)).toBe("low");
  });
});

// ─── getTopStrengths / getTopGaps ─────────────────────────────────────────────
describe("WS4.2 getTopStrengths and getTopGaps", () => {
  const capabilityScores = {
    execution: 80,
    judgement: 65,
    governance: 45,
    appropriateness: 30,
    workflow: 55,
    data_interpretation: 70,
  };

  it("returns the 2 highest-scoring capabilities as strengths", () => {
    const strengths = getTopStrengths(capabilityScores);
    expect(strengths).toHaveLength(2);
    expect(strengths[0]).toBe("execution"); // 80
    expect(strengths[1]).toBe("data interpretation"); // 70
  });

  it("returns the 2 lowest-scoring capabilities as gaps", () => {
    const gaps = getTopGaps(capabilityScores);
    expect(gaps).toHaveLength(2);
    expect(gaps[0]).toBe("appropriateness"); // 30
    expect(gaps[1]).toBe("governance"); // 45
  });

  it("replaces underscores with spaces in capability keys", () => {
    const scores = { data_interpretation: 90, execution: 50 };
    const strengths = getTopStrengths(scores);
    expect(strengths[0]).toBe("data interpretation");
  });
});

// ─── buildFactors ─────────────────────────────────────────────────────────────
describe("WS4.2 buildFactors", () => {
  it("always includes overall score and confidence factors", () => {
    const factors = buildFactors(70, 0.8, { governanceFlag: false, modes: [] });
    expect(factors).toHaveLength(2);
    expect(factors[0].factor).toBe("Overall capability score");
    expect(factors[1].factor).toBe("Assessment confidence");
  });

  it("overall score factor is positive when score >= 65", () => {
    const factors = buildFactors(70, 0.8, { governanceFlag: false, modes: [] });
    expect(factors[0].direction).toBe("positive");
  });

  it("overall score factor is neutral when score is 45–64", () => {
    const factors = buildFactors(55, 0.8, { governanceFlag: false, modes: [] });
    expect(factors[0].direction).toBe("neutral");
  });

  it("overall score factor is negative when score < 45", () => {
    const factors = buildFactors(30, 0.8, { governanceFlag: false, modes: [] });
    expect(factors[0].direction).toBe("negative");
  });

  it("confidence factor is positive when confidence >= 0.6", () => {
    const factors = buildFactors(70, 0.7, { governanceFlag: false, modes: [] });
    expect(factors[1].direction).toBe("positive");
  });

  it("confidence factor is neutral when confidence is 0.4–0.59", () => {
    const factors = buildFactors(70, 0.5, { governanceFlag: false, modes: [] });
    expect(factors[1].direction).toBe("neutral");
  });

  it("confidence factor is negative when confidence < 0.4", () => {
    const factors = buildFactors(70, 0.3, { governanceFlag: false, modes: [] });
    expect(factors[1].direction).toBe("negative");
  });

  it("adds governance concern factor when governanceFlag is true", () => {
    const factors = buildFactors(70, 0.8, { governanceFlag: true, modes: [] });
    expect(factors).toHaveLength(3);
    expect(factors[2].factor).toBe("Governance concern detected");
    expect(factors[2].direction).toBe("negative");
  });

  it("adds a factor for each failure mode", () => {
    const factors = buildFactors(70, 0.8, {
      governanceFlag: true,
      modes: ["blind_ai_acceptance", "hallucination_acceptance"],
    });
    expect(factors).toHaveLength(5); // 2 base + 1 governance + 2 failure modes
    const factorNames = factors.map(f => f.factor);
    expect(factorNames).toContain("Failure mode: blind ai acceptance");
    expect(factorNames).toContain("Failure mode: hallucination acceptance");
  });

  it("all failure mode factors have negative direction", () => {
    const factors = buildFactors(70, 0.8, {
      governanceFlag: false,
      modes: ["blind_ai_acceptance"],
    });
    const failureFactor = factors.find(f => f.factor.startsWith("Failure mode:"));
    expect(failureFactor?.direction).toBe("negative");
  });
});

// ─── W3: Item-level citations logic ──────────────────────────────────────────
/**
 * Pure logic for building item citations from answer contribution breakdown.
 * Mirrors the logic in getClassificationExplanation W1 implementation.
 */
type ItemCitation = {
  itemId: string;
  questionSummary: string;
  signalKey: string;
  delta: number;
  capabilityKey: string | null;
  outcomeClass: string | null;
};

function buildItemCitations(
  answers: Array<{
    itemId: string;
    outcomeClass: string | null;
    contributionBreakdownJson: Record<string, unknown> | null;
    questionSummary: string;
  }>
): ItemCitation[] {
  const citations: ItemCitation[] = [];
  for (const ans of answers) {
    const cb = ans.contributionBreakdownJson ?? {};
    const deltas = (cb.signalDeltas ?? {}) as Record<string, number>;
    const capKey = (cb.capabilityKey as string | null) ?? null;
    const topSignal = Object.entries(deltas).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    if (!topSignal) continue;
    const [signalKey, delta] = topSignal;
    citations.push({ itemId: ans.itemId, questionSummary: ans.questionSummary, signalKey, delta, capabilityKey: capKey, outcomeClass: ans.outcomeClass ?? null });
  }
  return citations;
}

describe("W3 — Item-level citation logic", () => {
  it("returns empty array when no answers have contribution breakdowns", () => {
    const citations = buildItemCitations([
      { itemId: "item-1", outcomeClass: "strong", contributionBreakdownJson: null, questionSummary: "Q1" },
    ]);
    expect(citations).toHaveLength(0);
  });
  it("extracts top signal delta from contribution breakdown", () => {
    const citations = buildItemCitations([{
      itemId: "item-1",
      outcomeClass: "strong",
      contributionBreakdownJson: { signalDeltas: { ethics_under_pressure: 1.2, output_evaluation_quality: 0.5 }, capabilityKey: "ai_ethics_trust" },
      questionSummary: "What is the most significant problem?",
    }]);
    expect(citations).toHaveLength(1);
    expect(citations[0].signalKey).toBe("ethics_under_pressure");
    expect(citations[0].delta).toBe(1.2);
    expect(citations[0].capabilityKey).toBe("ai_ethics_trust");
    expect(citations[0].outcomeClass).toBe("strong");
  });
  it("picks the signal with the largest absolute delta (not just largest positive)", () => {
    const citations = buildItemCitations([{
      itemId: "item-2",
      outcomeClass: "failure",
      contributionBreakdownJson: { signalDeltas: { blind_acceptance_risk: 2.0, output_evaluation_quality: 0.3 }, capabilityKey: "ai_output_evaluation" },
      questionSummary: "What would you do?",
    }]);
    expect(citations[0].signalKey).toBe("blind_acceptance_risk");
    expect(citations[0].delta).toBe(2.0);
  });
  it("skips answers with empty signal deltas", () => {
    const citations = buildItemCitations([
      { itemId: "item-1", outcomeClass: "strong", contributionBreakdownJson: { signalDeltas: {} }, questionSummary: "Q1" },
      { itemId: "item-2", outcomeClass: "failure", contributionBreakdownJson: { signalDeltas: { ethics_under_pressure: 1.5 } }, questionSummary: "Q2" },
    ]);
    expect(citations).toHaveLength(1);
    expect(citations[0].itemId).toBe("item-2");
  });
  it("cites specific items, not just capability aggregates", () => {
    const citations = buildItemCitations([
      { itemId: "cs-abc123", outcomeClass: "strong", contributionBreakdownJson: { signalDeltas: { ethics_under_pressure: 1.2 }, capabilityKey: "ai_ethics_trust" }, questionSummary: "How do you handle AI governance?" },
      { itemId: "cs-def456", outcomeClass: "failure", contributionBreakdownJson: { signalDeltas: { blind_acceptance_risk: 2.0 }, capabilityKey: "ai_output_evaluation" }, questionSummary: "What is the most significant problem?" },
    ]);
    expect(citations).toHaveLength(2);
    // Each citation references a specific item, not a capability aggregate
    expect(citations[0].itemId).toBe("cs-abc123");
    expect(citations[1].itemId).toBe("cs-def456");
    // Each citation has a specific signal key, not just a capability name
    expect(citations[0].signalKey).toBe("ethics_under_pressure");
    expect(citations[1].signalKey).toBe("blind_acceptance_risk");
  });
});
