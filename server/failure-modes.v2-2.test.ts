/**
 * AiQ v2.2 — WS1.2: Failure Mode Detection Tests (v10 migration)
 *
 * Tests configurable blocking/downgrade thresholds introduced in v2.2.
 * Default thresholds: blockingMin=2, downgradeMin=1
 *
 * v10 migration notes:
 *   - blind_ai_acceptance → blind_acceptance
 *   - critical_failure_response → critical_failure
 *   - governance_bypass → (removed, replaced by pressure_drift)
 *   - poor_validation → (removed)
 *   - GOVERNANCE_BYPASS event code → no longer recognised; use PRESSURE_DRIFT
 *   - detectFailureModes now returns pressureDriftDetected/pressureDriftMagnitude
 *   - over_reliance detection now uses blind_acceptance_risk < -1.0
 *
 * E3 Hybrid Resolution (Addition A — Claude feedback round 3):
 * E3 (Adaptivity Review, Apr 22 2026) introduced unique-mode counting to prevent
 * a single repeated pattern from inflating classification impact. The v2.2 spec
 * requires item-counting. The hybrid satisfies both:
 *
 *   BLOCK requires:
 *     (a) blockCount >= blockingMin (item-counting gate), AND
 *     (b) distinctBlockingModeCount >= 2  OR  hasCatastrophicItem (delta >= 2.25)
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
      makeAnswer({ outcomeClass: "strong", signalDeltas: { ethics_under_pressure: 0.8 } }),
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
    expect(result.modes).toContain("blind_acceptance");
  });

  it("E3 margin clause: 5 answers same mode with catastrophic delta → block", () => {
    // blockCount=5 >= blockingMin=2 (item gate passes)
    // delta=3.0 >= 2.25 (1.5 * 1.5) → hasCatastrophicItem=true → quality gate passes → block
    const answers = Array.from({ length: 5 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -3.0 } })
    );
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
    expect(result.modes).toContain("blind_acceptance");
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
    // downgrade modes: over_reliance fires (blind_acceptance_risk < -1.0), count=1 < downgradeMin=2 → not downgrade
    expect(result.classificationImpact).toBe("none");
  });
});

// ─── Event code triggers ──────────────────────────────────────────────────────
describe("WS1.2 detectFailureModes — event code triggers", () => {
  it("BLIND_ACCEPT event code triggers blind_acceptance failure mode", () => {
    const answers = [makeAnswer({ eventCodes: ["BLIND_ACCEPT"] })];
    const result = detectFailureModes(answers);
    expect(result.modes).toContain("blind_acceptance");
    expect(result.governanceFlag).toBe(true);
  });

  it("PRESSURE_DRIFT event code triggers pressure_drift failure mode", () => {
    const answers = [makeAnswer({ eventCodes: ["PRESSURE_DRIFT"] })];
    const result = detectFailureModes(answers);
    expect(result.modes).toContain("pressure_drift");
    expect(result.governanceFlag).toBe(true);
    expect(result.pressureDriftDetected).toBe(true);
  });

  it("critical_failure outcomeClass triggers critical_failure mode", () => {
    const answers = [makeAnswer({ outcomeClass: "critical_failure" })];
    const result = detectFailureModes(answers);
    expect(result.modes).toContain("critical_failure");
    expect(result.governanceFlag).toBe(true);
  });
});

// ─── Non-blocking failure modes ──────────────────────────────────────────────
describe("WS1.2 detectFailureModes — non-blocking failure modes", () => {
  it("over_reliance alone produces downgrade (non-blocking, downgradeCount=1 >= downgradeMin=1)", () => {
    // over_reliance triggers when blind_acceptance_risk < -1.0
    const answers = [makeAnswer({ signalDeltas: { blind_acceptance_risk: -1.5 } })];
    const result = detectFailureModes(answers);
    expect(result.modes).toContain("over_reliance");
    // over_reliance is non-blocking (does not increment blockCount)
    // but downgradeCount=1 >= downgradeMin=1 → downgrade
    expect(result.classificationImpact).toBe("downgrade");
  });

  it("dismissive_of_concern produces downgrade", () => {
    const answers = [makeAnswer({ signalDeltas: { dismissive_of_concern_risk: -1.5 } })];
    const result = detectFailureModes(answers);
    expect(result.modes).toContain("dismissive_of_concern");
    expect(result.classificationImpact).toBe("downgrade");
  });

  it("generic_prescription produces downgrade", () => {
    const answers = [makeAnswer({ signalDeltas: { generic_prescription_risk: -1.5 } })];
    const result = detectFailureModes(answers);
    expect(result.modes).toContain("generic_prescription");
    expect(result.classificationImpact).toBe("downgrade");
  });
});

// ─── E3 Hybrid Resolution tests (Addition A) ─────────────────────────────────
describe("WS1.2 detectFailureModes — E3 hybrid (item-counting + quality gate)", () => {
  it("2 answers same mild mode → downgrade (E3 concern: mild repeated single pattern does NOT block)", () => {
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("downgrade");
    expect(result.modes).toContain("blind_acceptance");
  });

  it("2 answers different blocking modes → block (multi-domain failure, quality gate passes)", () => {
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } }),
      makeAnswer({ signalDeltas: { hallucination_acceptance_risk: -2.0 } }),
    ];
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
    expect(result.governanceFlag).toBe(true);
  });

  it("2 answers same mode with catastrophic delta (>=2.25) → block (margin clause)", () => {
    const answers = [
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -3.0 } }),
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -3.0 } }),
    ];
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
  });

  it("10 answers same mild mode → downgrade (E3 concern: inflation prevention)", () => {
    const answers = Array.from({ length: 10 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } })
    );
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("downgrade");
    expect(result.modes).toContain("blind_acceptance");
  });

  it("regression: 10 items triggering one mode with catastrophic delta → block", () => {
    const answers = Array.from({ length: 10 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -3.0 } })
    );
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("block");
    expect(result.modes).toContain("blind_acceptance");
  });

  it("custom blockingFailureMinItems=5: 4 triggers → downgrade (item gate fails)", () => {
    const answers = Array.from({ length: 4 }, () =>
      makeAnswer({ signalDeltas: { blind_acceptance_risk: -2.0 } })
    );
    const result = detectFailureModes(answers, { blockingFailureMinItems: 5 });
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
    expect(result.classificationImpact).toBe("block");
  });
});
