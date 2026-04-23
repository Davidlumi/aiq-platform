/**
 * AiQ v2.2 — WS1.2: Failure Mode Detection Tests
 *
 * Tests configurable blocking/downgrade thresholds introduced in v2.2.
 * Default thresholds: blockingMin=2, downgradeMin=1
 *
 * Completion Pass: Tests updated to reflect item-counting semantics.
 * The engine counts per-answer occurrences of failure mode triggers, not
 * unique mode identifiers. This means 2 answers triggering the same blocking
 * mode will produce a block (blockCount=2 >= blockingMin=2), whereas under
 * the old unique-mode counting they would not (uniqueBlockCount=1 < 2).
 *
 * Also validates:
 * - Two-item evidence requirement for blocking classification
 * - Per-answer item counting (not unique-mode counting)
 * - Governance flag detection
 * - Event code triggers
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

  it("returns downgrade (not block) for a single blocking failure mode trigger", () => {
    // blockCount=1 < blockingMin=2 → downgrade, not block
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ outcomeClass: "acceptable" }),
    ];
    const result = detectFailureModes(answers);
    expect(result.detected).toBe(true);
    expect(result.classificationImpact).toBe("downgrade");
    expect(result.governanceFlag).toBe(true);
  });

  it("returns block for two blocking failure mode triggers (default blockingMin=2)", () => {
    // Two answers each triggering a blocking mode → blockCount=2 >= blockingMin=2 → block
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { hallucination_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
    expect(result.governanceFlag).toBe(true);
  });

  it("5 answers triggering same blocking mode → block (item counting, not unique-mode counting)", () => {
    // Item counting: blockCount=5 >= blockingMin=2 → block
    // Unique-mode counting would give uniqueBlockCount=1 < 2 → would not block (wrong)
    const answers = Array.from({ length: 5 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } })
    );
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
    // uniqueModes should still deduplicate — only one unique mode name
    expect(result.modes).toEqual(["blind_ai_acceptance"]);
  });
});

// ─── Configurable thresholds ─────────────────────────────────────────────────
describe("WS1.2 detectFailureModes — configurable thresholds", () => {
  it("blockingMin=1 causes a single blocking mode trigger to produce block", () => {
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers, { blockingFailureMinItems: 1, downgradeFailureMinItems: 1 });
    expect(result.classificationImpact).toBe("block");
  });

  it("blockingMin=3 requires 3 blocking triggers to produce block (2 triggers → downgrade)", () => {
    // 2 blocking triggers < blockingMin=3 → downgrade, not block
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { hallucination_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers, { blockingFailureMinItems: 3, downgradeFailureMinItems: 1 });
    expect(result.classificationImpact).toBe("downgrade");
  });

  it("downgradeMin=2 suppresses downgrade for a single mode trigger (allModeCount=1 < 2)", () => {
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers, { blockingFailureMinItems: 3, downgradeFailureMinItems: 2 });
    // blockCount=1 < blockingMin=3 → not block
    // allModeCount=1 < downgradeMin=2 → not downgrade
    expect(result.classificationImpact).toBe("none");
  });

  it("blockingMin=3 with 3 blocking triggers produces block", () => {
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
    expect(result.governanceFlag).toBe(false);
  });

  it("over_reliance alone produces downgrade (non-blocking, allModeCount=1 >= downgradeMin=1)", () => {
    const answers = [makeAnswer({ signalDeltas: { over_reliance_risk: -1.5 } })];
    const result = detectFailureModes(answers);
    expect(result.modes).toContain("over_reliance");
    // over_reliance is non-blocking (does not increment blockCount)
    // but allModeCount=1 >= downgradeMin=1 → downgrade
    expect(result.classificationImpact).toBe("downgrade");
  });
});

// ─── Item-counting regression (WS1.2 Completion Pass) ────────────────────────
describe("WS1.2 detectFailureModes — item-counting semantics (Completion Pass)", () => {
  it("10 answers all triggering blind_ai_acceptance → block (blockCount=10 >= blockingMin=2)", () => {
    const answers = Array.from({ length: 10 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } })
    );
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
    expect(result.governanceFlag).toBe(true);
    // uniqueModes deduplicates — only one unique mode name
    expect(result.modes).toEqual(["blind_ai_acceptance"]);
  });

  it("1 answer triggering blind_ai_acceptance → downgrade (blockCount=1 < blockingMin=2)", () => {
    const answers = [makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } })];
    const result = detectFailureModes(answers);
    // blockCount=1 < blockingMin=2 → not block
    // allModeCount=1 >= downgradeMin=1 → downgrade
    expect(result.classificationImpact).toBe("downgrade");
  });

  it("2 answers triggering same blocking mode → block (item counting; unique counting would not block)", () => {
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
    expect(result.modes).toEqual(["blind_ai_acceptance"]);
  });

  it("custom blockingFailureMinItems=5: 4 triggers → downgrade (not block)", () => {
    const answers = Array.from({ length: 4 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } })
    );
    const result = detectFailureModes(answers, { blockingFailureMinItems: 5 });
    // blockCount=4 < blockingMin=5 → not block
    expect(result.classificationImpact).toBe("downgrade");
  });

  it("custom blockingFailureMinItems=5: 5 triggers → block", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } })
    );
    const result = detectFailureModes(answers, { blockingFailureMinItems: 5 });
    expect(result.classificationImpact).toBe("block");
  });
});
