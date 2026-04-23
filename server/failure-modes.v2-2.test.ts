/**
 * AiQ v2.2 — WS1.2: Failure Mode Detection Tests
 *
 * Tests configurable blocking/downgrade thresholds introduced in v2.2.
 * Default thresholds: blockingMin=2, downgradeMin=1
 *
 * E3 Hybrid Resolution (Addition A — Claude feedback round 3):
 * E3 (Adaptivity Review, Apr 22 2026) introduced unique-mode counting to prevent
 * a single repeated pattern from inflating classification impact. The v2.2 spec
 * requires item-counting. The hybrid satisfies both:
 *
 *   BLOCK requires:
 *     (a) blockCount >= blockingMin (item-counting gate), AND
 *     (b) distinctBlockingModeCount >= 2  OR  hasCatastrophicItem (delta >= 2.25)
 *
 * This prevents mild-repeated-pattern inflation (E3's concern) while still
 * blocking multi-domain failures and catastrophic single-category failures.
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
    // blockCount=1 < blockingMin=2 → item gate fails → downgrade, not block
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ outcomeClass: "acceptable" }),
    ];
    const result = detectFailureModes(answers);
    expect(result.detected).toBe(true);
    expect(result.classificationImpact).toBe("downgrade");
    expect(result.governanceFlag).toBe(true);
  });

  it("returns block for two different blocking failure mode triggers", () => {
    // blockCount=2 >= blockingMin=2 (item gate passes)
    // distinctBlockingModeCount=2 >= 2 (quality gate passes)
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { hallucination_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
    expect(result.governanceFlag).toBe(true);
  });

  it("E3 concern: 5 answers same mild mode → downgrade (quality gate prevents block)", () => {
    // blockCount=5 >= blockingMin=2 (item gate passes)
    // distinctBlockingModeCount=1 < 2, hasCatastrophicItem=false (2.0 < 2.25)
    // → quality gate FAILS → downgrade, not block
    const answers = Array.from({ length: 5 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } })
    );
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("downgrade");
    expect(result.modes).toEqual(["blind_ai_acceptance"]);
  });

  it("E3 margin clause: 5 answers same mode with catastrophic delta → block", () => {
    // blockCount=5 >= blockingMin=2 (item gate passes)
    // delta=3.0 >= 2.25 (1.5 * 1.5) → hasCatastrophicItem=true → quality gate passes → block
    const answers = Array.from({ length: 5 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -3.0 } })
    );
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
    expect(result.modes).toEqual(["blind_ai_acceptance"]);
  });
});

// ─── Configurable thresholds ─────────────────────────────────────────────────
describe("WS1.2 detectFailureModes — configurable thresholds", () => {
  it("blockingMin=1 with catastrophic delta: single blocking trigger → block", () => {
    // blockCount=1 >= blockingMin=1 (item gate passes)
    // delta=3.0 >= 2.25 → hasCatastrophicItem=true → quality gate passes → block
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -3.0 } }),
    ];
    const result = detectFailureModes(answers, { blockingFailureMinItems: 1, downgradeFailureMinItems: 1 });
    expect(result.classificationImpact).toBe("block");
  });

  it("blockingMin=1 with mild delta: single trigger → downgrade (quality gate prevents block)", () => {
    // blockCount=1 >= blockingMin=1 (item gate passes)
    // distinctBlockingModeCount=1 < 2, hasCatastrophicItem=false (2.0 < 2.25)
    // → quality gate FAILS → downgrade
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers, { blockingFailureMinItems: 1, downgradeFailureMinItems: 1 });
    expect(result.classificationImpact).toBe("downgrade");
  });

  it("blockingMin=3 requires 3 blocking triggers across 2 modes to produce block", () => {
    // 3 triggers: 2 blind_acceptance + 1 hallucination → blockCount=3 >= 3, distinctModes=2 → block
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { hallucination_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers, { blockingFailureMinItems: 3, downgradeFailureMinItems: 1 });
    expect(result.classificationImpact).toBe("block");
  });

  it("blockingMin=3 with 2 triggers → downgrade (item gate fails)", () => {
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

// ─── E3 Hybrid Resolution tests (Addition A) ─────────────────────────────────
describe("WS1.2 detectFailureModes — E3 hybrid (item-counting + quality gate)", () => {
  it("2 answers same mild mode → downgrade (E3 concern: mild repeated single pattern does NOT block)", () => {
    // blockCount=2 >= blockingMin=2 (item gate passes)
    // distinctBlockingModeCount=1 < 2, hasCatastrophicItem=false (2.0 < 2.25)
    // → quality gate fails → downgrade, not block
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("downgrade");
    expect(result.modes).toEqual(["blind_ai_acceptance"]);
  });

  it("2 answers different blocking modes → block (multi-domain failure, quality gate passes)", () => {
    // blockCount=2 >= blockingMin=2 (item gate passes)
    // distinctBlockingModeCount=2 >= 2 → quality gate passes → block
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { hallucination_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
    expect(result.governanceFlag).toBe(true);
  });

  it("2 answers same mode with catastrophic delta (>=2.25) → block (margin clause)", () => {
    // blockCount=2 >= blockingMin=2 (item gate passes)
    // delta=3.0 >= 2.25 (1.5 * 1.5) → hasCatastrophicItem=true → quality gate passes → block
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -3.0 } }),
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -3.0 } }),
    ];
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
  });

  it("10 answers same mild mode → downgrade (E3 concern: inflation prevention)", () => {
    // blockCount=10 >= blockingMin=2 (item gate passes)
    // distinctBlockingModeCount=1 < 2, hasCatastrophicItem=false (2.0 < 2.25)
    // → quality gate fails → downgrade (E3's concern validated)
    const answers = Array.from({ length: 10 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } })
    );
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("downgrade");
    expect(result.modes).toEqual(["blind_ai_acceptance"]);
  });

  it("regression: 10 items triggering one mode with catastrophic delta → block", () => {
    // blockCount=10 >= blockingMin=2 (item gate passes)
    // delta=3.0 >= 2.25 → hasCatastrophicItem=true → quality gate passes → block
    const answers = Array.from({ length: 10 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -3.0 } })
    );
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
    expect(result.modes).toEqual(["blind_ai_acceptance"]);
  });

  it("custom blockingFailureMinItems=5: 4 triggers → downgrade (item gate fails)", () => {
    const answers = Array.from({ length: 4 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } })
    );
    const result = detectFailureModes(answers, { blockingFailureMinItems: 5 });
    // blockCount=4 < blockingMin=5 → item gate fails → not block
    expect(result.classificationImpact).toBe("downgrade");
  });

  it("custom blockingFailureMinItems=5: 5 triggers across 2 modes → block", () => {
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { hallucination_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { hallucination_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers, { blockingFailureMinItems: 5 });
    // blockCount=5 >= blockingMin=5 (item gate passes)
    // distinctBlockingModeCount=2 >= 2 → quality gate passes → block
    expect(result.classificationImpact).toBe("block");
  });
});
