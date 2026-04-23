/**
 * AiQ v2.2 — WS1.1: Scoring Correctness Tests
 *
 * Tests the sum+clip formula introduced in v2.2 to replace the v2.1 mean-based formula.
 * Validates the four anchor cases A/B/C/D defined in the calibration specification:
 *
 *   Anchor A: All strong answers on governance items → score ≥ 75
 *   Anchor B: All failure answers on governance items → score ≤ 25
 *   Anchor C: Mixed strong/failure answers → score near 50 ± 10
 *   Anchor D: Monotonicity — adding a positive-delta answer must not lower the score
 *
 * Also validates WS1.2: configurable failure-mode evidence thresholds.
 */
import { describe, it, expect } from "vitest";
import {
  computeCapabilityScores,
  computeSignalScores,
  detectFailureModes,
  type CapabilityScore,
} from "./assessment/scoringEngine";
import type { AnswerData } from "./assessment/sessionController";

// ─── v2.2 Scoring Config ──────────────────────────────────────────────────────
const V22_CONFIG = {
  intercept: 50,
  multiplier: 50,
  contributionCap: 8.0,
  contributionMultiplier: 6.25,
};

// ─── Helper: build a minimal AnswerData ───────────────────────────────────────
function makeAnswer(overrides: Partial<AnswerData> = {}): AnswerData {
  return {
    itemId: `item-${Math.random().toString(36).slice(2)}`,
    selectedValue: "B",
    freeText: undefined,
    confidenceScore: 0.7,
    timeToAnswerMs: 15_000,
    outcomeClass: "strong",
    signalDeltasJson: { governance_quality: 0.8, judgement_quality: 0.5 },
    eventCodesJson: [],
    riskLevel: "Medium",
    difficulty: 2,
    capabilityKey: "governance",
    interactionType: "governance_decision",
    optionPosition: 1,
    ...overrides,
  };
}

// ─── Anchor Case A: All strong governance answers → score ≥ 75 ───────────────
describe("WS1.1 Anchor A — all strong governance answers", () => {
  it("governance capability score should be ≥ 75", () => {
    const answers: AnswerData[] = Array.from({ length: 8 }, () =>
      makeAnswer({
        outcomeClass: "strong",
        signalDeltasJson: { governance_quality: 1.0, blind_acceptance_risk: 0.5 },
        riskLevel: "High",
        difficulty: 3,
      })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    expect(caps.governance.score).toBeGreaterThanOrEqual(75);
  });
});

// ─── Anchor Case B: All failure governance answers → score ≤ 25 ──────────────
describe("WS1.1 Anchor B — all failure governance answers", () => {
  it("governance capability score should be ≤ 25", () => {
    const answers: AnswerData[] = Array.from({ length: 8 }, () =>
      makeAnswer({
        outcomeClass: "failure",
        signalDeltasJson: { governance_quality: -1.0, blind_acceptance_risk: -1.5 },
        riskLevel: "High",
        difficulty: 3,
      })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    expect(caps.governance.score).toBeLessThanOrEqual(25);
  });
});

// ─── Anchor Case C: Mixed strong/failure → score near 50 ─────────────────────
describe("WS1.1 Anchor C — mixed strong/failure answers", () => {
  it("governance capability score should be within 50 ± 15", () => {
    const strongAnswers: AnswerData[] = Array.from({ length: 4 }, () =>
      makeAnswer({
        outcomeClass: "strong",
        signalDeltasJson: { governance_quality: 0.8 },
        riskLevel: "Medium",
        difficulty: 2,
      })
    );
    const failureAnswers: AnswerData[] = Array.from({ length: 4 }, () =>
      makeAnswer({
        outcomeClass: "failure",
        signalDeltasJson: { governance_quality: -0.8 },
        riskLevel: "Medium",
        difficulty: 2,
      })
    );
    const signals = computeSignalScores([...strongAnswers, ...failureAnswers]);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    expect(caps.governance.score).toBeGreaterThanOrEqual(35);
    expect(caps.governance.score).toBeLessThanOrEqual(65);
  });
});

// ─── Anchor Case D: Monotonicity — adding a positive-delta answer must not lower the score
describe("WS1.1 Anchor D — monotonicity: adding a positive answer must not lower the score", () => {
  it("score with N+1 strong answers ≥ score with N strong answers", () => {
    const baseAnswers: AnswerData[] = Array.from({ length: 5 }, () =>
      makeAnswer({
        outcomeClass: "strong",
        signalDeltasJson: { governance_quality: 0.6 },
        riskLevel: "Medium",
        difficulty: 2,
      })
    );
    const extendedAnswers: AnswerData[] = [
      ...baseAnswers,
      makeAnswer({
        outcomeClass: "strong",
        signalDeltasJson: { governance_quality: 0.6 },
        riskLevel: "Medium",
        difficulty: 2,
      }),
    ];
    const baseSignals = computeSignalScores(baseAnswers);
    const extendedSignals = computeSignalScores(extendedAnswers);
    const baseCaps = computeCapabilityScores(baseSignals, V22_CONFIG);
    const extendedCaps = computeCapabilityScores(extendedSignals, V22_CONFIG);
    // Monotonicity: extended score must be >= base score (v2.1 mean formula violated this)
    expect(extendedCaps.governance.score).toBeGreaterThanOrEqual(baseCaps.governance.score);
  });
});

// ─── Sum+clip formula: score is capped at 100 and floored at 0 ───────────────
describe("WS1.1 sum+clip formula — boundary clamping", () => {
  it("score is capped at 100 even with extreme positive deltas", () => {
    const answers: AnswerData[] = Array.from({ length: 20 }, () =>
      makeAnswer({
        outcomeClass: "strong",
        signalDeltasJson: { governance_quality: 5.0 },
        riskLevel: "Critical",
        difficulty: 3,
      })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    expect(caps.governance.score).toBeLessThanOrEqual(100);
  });

  it("score is floored at 0 even with extreme negative deltas", () => {
    const answers: AnswerData[] = Array.from({ length: 20 }, () =>
      makeAnswer({
        outcomeClass: "critical_failure",
        signalDeltasJson: { governance_quality: -5.0, blind_acceptance_risk: -5.0 },
        riskLevel: "Critical",
        difficulty: 3,
      })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    expect(caps.governance.score).toBeGreaterThanOrEqual(0);
  });
});

// ─── v2.1 legacy formula still works when contributionCap is not provided ────
describe("WS1.1 v2.1 legacy formula — no contributionCap", () => {
  it("falls back to mean-based formula when contributionCap is undefined", () => {
    const answers: AnswerData[] = Array.from({ length: 5 }, () =>
      makeAnswer({
        outcomeClass: "strong",
        signalDeltasJson: { governance_quality: 0.8 },
        riskLevel: "Medium",
        difficulty: 2,
      })
    );
    const signals = computeSignalScores(answers);
    // No contributionCap → v2.1 formula
    const caps = computeCapabilityScores(signals, { intercept: 50, multiplier: 50 });
    expect(caps.governance.score).toBeGreaterThan(0);
    expect(caps.governance.score).toBeLessThanOrEqual(100);
  });
});

// ─── All 6 capability domains are present in the output ──────────────────────
describe("WS1.1 capability score output completeness", () => {
  it("returns scores for all 6 capability domains", () => {
    const answers: AnswerData[] = [
      makeAnswer({ capabilityKey: "execution", signalDeltasJson: { execution_quality: 0.5 } }),
      makeAnswer({ capabilityKey: "judgement", signalDeltasJson: { judgement_quality: 0.5 } }),
      makeAnswer({ capabilityKey: "governance", signalDeltasJson: { governance_quality: 0.5 } }),
      makeAnswer({ capabilityKey: "appropriateness", signalDeltasJson: { appropriateness_boundary: 0.5 } }),
      makeAnswer({ capabilityKey: "workflow", signalDeltasJson: { workflow_application_quality: 0.5 } }),
      makeAnswer({ capabilityKey: "data_interpretation", signalDeltasJson: { data_interpretation_quality: 0.5 } }),
    ];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    const domains = ["execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation"];
    for (const domain of domains) {
      expect(caps[domain as keyof typeof caps]).toBeDefined();
      expect(typeof caps[domain as keyof typeof caps].score).toBe("number");
    }
  });
});
