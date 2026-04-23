/**
 * AiQ v2.2 — WS1.2: Failure Mode Detection Tests
 *
 * Tests configurable blocking/downgrade thresholds introduced in v2.2.
 * Default thresholds: blockingMin=2, downgradeMin=1
 *
 * Also validates:
 * - Two-item evidence requirement for blocking classification
 * - Unique failure mode counting (not per-answer)
 * - Governance flag detection
 */
import { describe, it, expect } from "vitest";
import { detectFailureModes } from "./assessment/scoringEngine";

// ─── Helper: build a minimal answer for detectFailureModes ───────────────────
function makeAnswer(overrides: {
  outcomeClass?: string;
  signalDeltas?: Record<string, number>;
  eventCodes?: string[];
} = {}) {
  return {
    outcomeClass: overrides.outcomeClass ?? "acceptable",
    signalDeltas: overrides.signalDeltas ?? {},
    eventCodes: overrides.eventCodes ?? [],
  };
}

// ─── Default thresholds (blockingMin=2, downgradeMin=1) ──────────────────────
describe("WS1.2 detectFailureModes — default thresholds", () => {
  it("returns no impact when no failure modes detected", () => {
    const answers = [
      makeAnswer({ outcomeClass: "strong", signalDeltas: { governance_quality: 0.8 } }),
      makeAnswer({ outcomeClass: "acceptable" }),
    ];
    const result = detectFailureModes(answers);
    expect(result.detected).toBe(false);
    expect(result.classificationImpact).toBe("none");
    expect(result.governanceFlag).toBe(false);
  });

  it("returns downgrade (not block) for a single blocking failure mode", () => {
    // One blind_acceptance answer → 1 unique blocking mode → downgrade (not block)
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ outcomeClass: "acceptable" }),
    ];
    const result = detectFailureModes(answers);
    expect(result.detected).toBe(true);
    expect(result.classificationImpact).toBe("downgrade");
    expect(result.governanceFlag).toBe(true);
  });

  it("returns block for two distinct blocking failure modes (default blockingMin=2)", () => {
    // blind_acceptance + hallucination_acceptance = 2 unique blocking modes → block
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { hallucination_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
    expect(result.governanceFlag).toBe(true);
  });

  it("counts unique failure modes, not per-answer occurrences", () => {
    // Same failure mode repeated 5 times → still only 1 unique blocking mode → downgrade
    const answers = Array.from({ length: 5 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } })
    );
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("downgrade");
    expect(result.modes.filter(m => m === "blind_ai_acceptance").length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Configurable thresholds ─────────────────────────────────────────────────
describe("WS1.2 detectFailureModes — configurable thresholds", () => {
  it("blockingMin=1 causes a single blocking mode to trigger block", () => {
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers, { blockingFailureMinItems: 1, downgradeFailureMinItems: 1 });
    expect(result.classificationImpact).toBe("block");
  });

  it("blockingMin=3 requires 3 distinct blocking modes to trigger block", () => {
    // Only 2 distinct blocking modes → should be downgrade, not block
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { hallucination_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers, { blockingFailureMinItems: 3, downgradeFailureMinItems: 1 });
    expect(result.classificationImpact).toBe("downgrade");
  });

  it("downgradeMin=2 suppresses downgrade for a single blocking mode", () => {
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers, { blockingFailureMinItems: 3, downgradeFailureMinItems: 2 });
    expect(result.classificationImpact).toBe("none");
  });

  it("blockingMin=3 with 3 distinct modes triggers block", () => {
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { hallucination_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { unsafe_hr_decision_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers, { blockingFailureMinItems: 3, downgradeFailureMinItems: 1 });
    expect(result.classificationImpact).toBe("block");
  });
});

// ─── Event code triggers ──────────────────────────────────────────────────────
describe("WS1.2 detectFailureModes — event code triggers", () => {
  it("BLIND_ACCEPT event code triggers blind_ai_acceptance failure mode", () => {
    const answers = [makeAnswer({ eventCodes: ["BLIND_ACCEPT"] })];
    const result = detectFailureModes(answers);
    expect(result.modes).toContain("blind_ai_acceptance");
    expect(result.governanceFlag).toBe(true);
  });

  it("GOVERNANCE_BYPASS event code triggers governance_bypass failure mode", () => {
    const answers = [makeAnswer({ eventCodes: ["GOVERNANCE_BYPASS"] })];
    const result = detectFailureModes(answers);
    expect(result.modes).toContain("governance_bypass");
    expect(result.governanceFlag).toBe(true);
  });

  it("critical_failure outcomeClass triggers critical_failure_response mode", () => {
    const answers = [makeAnswer({ outcomeClass: "critical_failure" })];
    const result = detectFailureModes(answers);
    expect(result.modes).toContain("critical_failure_response");
    expect(result.governanceFlag).toBe(true);
  });
});

// ─── Non-blocking failure modes ──────────────────────────────────────────────
describe("WS1.2 detectFailureModes — non-blocking failure modes", () => {
  it("poor_validation does not set governanceFlag", () => {
    const answers = [makeAnswer({ signalDeltas: { validation_accuracy: -2.5 } })];
    const result = detectFailureModes(answers);
    expect(result.modes).toContain("poor_validation");
    // poor_validation is not a governance-blocking mode
    expect(result.governanceFlag).toBe(false);
  });

  it("over_reliance does not trigger block on its own", () => {
    const answers = [makeAnswer({ signalDeltas: { over_reliance_risk: -1.5 } })];
    const result = detectFailureModes(answers);
    expect(result.modes).toContain("over_reliance");
    expect(result.classificationImpact).toBe("none");
  });
});
