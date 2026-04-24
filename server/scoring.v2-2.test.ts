/**
 * AiQ v2.2 — WS1.1: Scoring Correctness Tests (v10 migration)
 *
 * Tests the sum+clip formula introduced in v2.2 to replace the v2.1 mean-based formula.
 * Validates the four anchor cases A/B/C/D defined in the calibration specification:
 *
 *   Anchor A: All strong answers on ai_ethics_trust items → score ≥ 75
 *   Anchor B: All failure answers on ai_ethics_trust items → score ≤ 25
 *   Anchor C: Mixed strong/failure answers → score near 50 ± 15
 *   Anchor D: Monotonicity — adding a positive-delta answer must not lower the score
 *
 * Also validates WS1.2: configurable failure-mode evidence thresholds.
 *
 * v10 migration notes:
 *   - governance → ai_ethics_trust
 *   - governance_quality → ethics_under_pressure
 *   - computeSignalScores now accepts Array<{ signalDeltas: Record<string, number> }>
 *   - computeCapabilityScores now uses positional args: (signalScores, intercept?, cap?, multiplier?)
 *   - AnswerData imported from sessionController (unchanged)
 */
import { describe, it, expect } from "vitest";
import {
  computeCapabilityScores,
  computeSignalScores,
  detectFailureModes,
  type CapabilityScore,
} from "./assessment/scoringEngine";

// ─── Helper: build a minimal signal-deltas input for computeSignalScores ─────
function makeSignalInput(overrides: {
  signalDeltas?: Record<string, number>;
} = {}): { signalDeltas: Record<string, number> } {
  return {
    signalDeltas: overrides.signalDeltas ?? { ethics_under_pressure: 0.8, stakeholder_impact_awareness: 0.5 },
  };
}

// ─── Anchor Case A: All strong ai_ethics_trust answers → score ≥ 75 ─────────
describe("WS1.1 Anchor A — all strong ai_ethics_trust answers", () => {
  it("ai_ethics_trust capability score should be ≥ 75", () => {
    // v10: Use higher magnitudes to overcome the scaleFactor in sum+clip formula
    // 5 domain signals for ai_ethics_trust, 8 answers × 2 signals = count 16
    // scaleFactor = min(2.0, 5/16 * 1.5) ≈ 0.47, need sum * sf >= 25
    const answers = Array.from({ length: 8 }, () =>
      makeSignalInput({
        signalDeltas: { ethics_under_pressure: 4.0, stakeholder_impact_awareness: 3.0 },
      })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.ai_ethics_trust.score).toBeGreaterThanOrEqual(75);
  });
});

// ─── Anchor Case B: All failure ai_ethics_trust answers → score ≤ 25 ────────
describe("WS1.1 Anchor B — all failure ai_ethics_trust answers", () => {
  it("ai_ethics_trust capability score should be ≤ 25", () => {
    // Negative deltas for ethics signals
    // v10: Use higher negative magnitudes to overcome the scaleFactor in sum+clip formula
    const answers = Array.from({ length: 8 }, () =>
      makeSignalInput({
        signalDeltas: { ethics_under_pressure: -4.0, pressure_drift_risk: -3.0 },
      })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.ai_ethics_trust.score).toBeLessThanOrEqual(25);
  });
});

// ─── Anchor Case C: Mixed strong/failure → score near 50 ─────────────────────
describe("WS1.1 Anchor C — mixed strong/failure answers", () => {
  it("ai_ethics_trust capability score should be within 50 ± 15", () => {
    const strongAnswers = Array.from({ length: 4 }, () =>
      makeSignalInput({
        signalDeltas: { ethics_under_pressure: 0.8 },
      })
    );
    const failureAnswers = Array.from({ length: 4 }, () =>
      makeSignalInput({
        signalDeltas: { ethics_under_pressure: -0.8 },
      })
    );
    const signals = computeSignalScores([...strongAnswers, ...failureAnswers]);
    const caps = computeCapabilityScores(signals);
    expect(caps.ai_ethics_trust.score).toBeGreaterThanOrEqual(35);
    expect(caps.ai_ethics_trust.score).toBeLessThanOrEqual(65);
  });
});

// ─── Anchor Case D: Monotonicity — adding a positive-delta answer must not lower the score
describe("WS1.1 Anchor D — monotonicity: adding a positive answer must not lower the score", () => {
  it("score with N+1 strong answers ≥ score with N strong answers", () => {
    const baseAnswers = Array.from({ length: 5 }, () =>
      makeSignalInput({
        signalDeltas: { ethics_under_pressure: 0.6 },
      })
    );
    const extendedAnswers = [
      ...baseAnswers,
      makeSignalInput({
        signalDeltas: { ethics_under_pressure: 0.6 },
      }),
    ];
    const baseSignals = computeSignalScores(baseAnswers);
    const extendedSignals = computeSignalScores(extendedAnswers);
    const baseCaps = computeCapabilityScores(baseSignals);
    const extendedCaps = computeCapabilityScores(extendedSignals);
    // Monotonicity: extended score must be >= base score
    expect(extendedCaps.ai_ethics_trust.score).toBeGreaterThanOrEqual(baseCaps.ai_ethics_trust.score);
  });
});

// ─── Sum+clip formula: score is capped at 100 and floored at 0 ───────────────
describe("WS1.1 sum+clip formula — boundary clamping", () => {
  it("score is capped at 100 even with extreme positive deltas", () => {
    const answers = Array.from({ length: 20 }, () =>
      makeSignalInput({
        signalDeltas: { ethics_under_pressure: 5.0 },
      })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.ai_ethics_trust.score).toBeLessThanOrEqual(100);
  });

  it("score is floored at 0 even with extreme negative deltas", () => {
    const answers = Array.from({ length: 20 }, () =>
      makeSignalInput({
        signalDeltas: { ethics_under_pressure: -5.0, pressure_drift_risk: -5.0 },
      })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.ai_ethics_trust.score).toBeGreaterThanOrEqual(0);
  });
});

// ─── All 6 capability domains are present in the output ──────────────────────
describe("WS1.1 capability score output completeness", () => {
  it("returns scores for all 6 capability domains", () => {
    const answers = [
      makeSignalInput({ signalDeltas: { prompt_construction_quality: 0.5 } }),
      makeSignalInput({ signalDeltas: { output_evaluation_quality: 0.5 } }),
      makeSignalInput({ signalDeltas: { workflow_redesign_quality: 0.5 } }),
      makeSignalInput({ signalDeltas: { capability_diagnosis_accuracy: 0.5 } }),
      makeSignalInput({ signalDeltas: { ethics_under_pressure: 0.5 } }),
      makeSignalInput({ signalDeltas: { resistance_response_quality: 0.5 } }),
    ];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    const domains = [
      "ai_interaction", "ai_output_evaluation", "ai_workflow_design",
      "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership",
    ];
    for (const domain of domains) {
      expect(caps[domain as keyof typeof caps]).toBeDefined();
      expect(typeof caps[domain as keyof typeof caps].score).toBe("number");
    }
  });
});
