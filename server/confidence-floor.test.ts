/**
 * AiQ v2.2 — Addition B: Confidence Floor Regression Tests
 *
 * Validates the three-threshold confidence model:
 *   < 0.40  → unknown_insufficient_evidence (CONFIDENCE_FLOOR check fails first)
 *   [0.40, 0.50) → result shown with isProvisional = true
 *   >= 0.50 → normal classification, isProvisional = false
 *
 * Also validates that the MINIMUM_SAFE_CLASSIFICATION_CONFIDENCE (0.55) in
 * classificationConfidenceGate.ts downgrades "safe" → "at_risk" below 0.55.
 */
import { describe, it, expect } from "vitest";
import {
  classifyReadiness,
  CONFIDENCE_FLOOR,
  PROVISIONAL_CONFIDENCE_THRESHOLD,
} from "./assessment/scoringEngine";
import {
  applyClassificationConfidenceGate,
  MINIMUM_SAFE_CLASSIFICATION_CONFIDENCE,
} from "./assessment/classificationConfidenceGate";

// ─── Helper: minimal FailureModeResult for a clean classification ─────────────
const noFailureModes = {
  detected: false,
  modes: [] as string[],
  classificationImpact: "none" as const,
  governanceFlag: false,
  eventCodes: [] as string[],
};

// ─── Constant sanity checks ───────────────────────────────────────────────────
describe("Confidence threshold constants", () => {
  it("PROVISIONAL_CONFIDENCE_THRESHOLD is 0.40", () => {
    expect(PROVISIONAL_CONFIDENCE_THRESHOLD).toBe(0.40);
  });

  it("CONFIDENCE_FLOOR is 0.50", () => {
    expect(CONFIDENCE_FLOOR).toBe(0.50);
  });

  it("MINIMUM_SAFE_CLASSIFICATION_CONFIDENCE is 0.55", () => {
    expect(MINIMUM_SAFE_CLASSIFICATION_CONFIDENCE).toBe(0.55);
  });

  it("thresholds are in ascending order: 0.40 < 0.50 < 0.55", () => {
    expect(PROVISIONAL_CONFIDENCE_THRESHOLD).toBeLessThan(CONFIDENCE_FLOOR);
    expect(CONFIDENCE_FLOOR).toBeLessThan(MINIMUM_SAFE_CLASSIFICATION_CONFIDENCE);
  });
});

// ─── classifyReadiness: unknown_insufficient_evidence (< 0.40) ───────────────
describe("classifyReadiness — below PROVISIONAL_CONFIDENCE_THRESHOLD", () => {
  it("confidence=0.39 → unknown_insufficient_evidence (not provisional)", () => {
    const result = classifyReadiness(70, "low", noFailureModes, true, undefined, undefined, 0.39);
    expect(result.state).toBe("unknown_insufficient_evidence");
    expect(result.isProvisional).toBeUndefined(); // confidence floor path returns early
  });

  it("confidence=0.00 → unknown_insufficient_evidence", () => {
    const result = classifyReadiness(80, "low", noFailureModes, true, undefined, undefined, 0.00);
    expect(result.state).toBe("unknown_insufficient_evidence");
  });

  it("confidence=0.399 → unknown_insufficient_evidence (just below provisional threshold)", () => {
    // 0.399 < PROVISIONAL_CONFIDENCE_THRESHOLD (0.40) → returns unknown_insufficient_evidence
    const result = classifyReadiness(80, "low", noFailureModes, true, undefined, undefined, 0.399);
    expect(result.state).toBe("unknown_insufficient_evidence");
  });
});

// ─── classifyReadiness: provisional band [0.40, 0.50) ────────────────────────
describe("classifyReadiness — provisional band [0.40, 0.50)", () => {
  it("confidence=0.40 → normal classification with isProvisional=true", () => {
    const result = classifyReadiness(70, "low", noFailureModes, true, undefined, undefined, 0.40);
    expect(result.state).not.toBe("unknown_insufficient_evidence");
    expect(result.isProvisional).toBe(true);
  });

  it("confidence=0.45 → normal classification with isProvisional=true", () => {
    const result = classifyReadiness(70, "low", noFailureModes, true, undefined, undefined, 0.45);
    expect(result.state).not.toBe("unknown_insufficient_evidence");
    expect(result.isProvisional).toBe(true);
  });

  it("confidence=0.499 → isProvisional=true (in provisional band [0.40, 0.50))", () => {
    // 0.499 >= 0.40 and < 0.50 → provisional band → isProvisional=true
    const result = classifyReadiness(70, "low", noFailureModes, true, undefined, undefined, 0.499);
    expect(result.state).not.toBe("unknown_insufficient_evidence");
    expect(result.isProvisional).toBe(true);
  });

  it("provisional flag is set regardless of classification state (at_risk)", () => {
    // score=40, riskBand=medium → overallScore < 45 → at_risk (not unsafe, because riskBand is not high)
    const result = classifyReadiness(40, "medium", noFailureModes, true, undefined, undefined, 0.42);
    expect(result.state).toBe("at_risk");
    expect(result.isProvisional).toBe(true);
  });
});

// ─── classifyReadiness: above CONFIDENCE_FLOOR (>= 0.50) ─────────────────────
describe("classifyReadiness — above CONFIDENCE_FLOOR", () => {
  it("confidence=0.50 → normal classification, isProvisional=false", () => {
    const result = classifyReadiness(70, "low", noFailureModes, true, undefined, undefined, 0.50);
    expect(result.state).not.toBe("unknown_insufficient_evidence");
    expect(result.isProvisional).toBe(false);
  });

  it("confidence=0.75 → normal classification, isProvisional=false", () => {
    const result = classifyReadiness(80, "low", noFailureModes, true, undefined, undefined, 0.75);
    expect(result.isProvisional).toBe(false);
  });

  it("confidence=undefined → isProvisional=false (no confidence data provided)", () => {
    const result = classifyReadiness(70, "low", noFailureModes, true);
    expect(result.isProvisional).toBe(false);
  });
});

// ─── classificationConfidenceGate: 0.55 safe downgrade ───────────────────────
describe("applyClassificationConfidenceGate — MINIMUM_SAFE_CLASSIFICATION_CONFIDENCE", () => {
  it("safe + confidence=0.54 → downgraded to at_risk (below 0.55)", () => {
    const result = applyClassificationConfidenceGate("safe", 0.54);
    expect(result.state).toBe("at_risk");
    expect(result.wasDowngraded).toBe(true);
  });

  it("safe + confidence=0.55 → remains safe (at threshold)", () => {
    const result = applyClassificationConfidenceGate("safe", 0.55);
    expect(result.state).toBe("safe");
    expect(result.wasDowngraded).toBe(false);
  });

  it("safe + confidence=0.40 → downgraded to at_risk (below 0.55)", () => {
    const result = applyClassificationConfidenceGate("safe", 0.40);
    expect(result.state).toBe("at_risk");
    expect(result.wasDowngraded).toBe(true);
  });

  it("at_risk + confidence=0.34 → downgraded to insufficient_evidence (below 0.35)", () => {
    const result = applyClassificationConfidenceGate("at_risk", 0.34);
    expect(result.state).toBe("insufficient_evidence");
    expect(result.wasDowngraded).toBe(true);
  });

  it("at_risk + confidence=0.35 → remains at_risk (at threshold)", () => {
    const result = applyClassificationConfidenceGate("at_risk", 0.35);
    expect(result.state).toBe("at_risk");
    expect(result.wasDowngraded).toBe(false);
  });

  it("unsafe is never downgraded regardless of confidence", () => {
    const result = applyClassificationConfidenceGate("unsafe", 0.10);
    expect(result.state).toBe("unsafe");
    expect(result.wasDowngraded).toBe(false);
  });
});
