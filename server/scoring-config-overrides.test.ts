/**
 * WS1.2 Item 1: Scoring Config Overrides Test Suite
 *
 * Verifies that the six previously hard-coded scoring constants are now read
 * from the active scoring_config row and honoured by the engine.
 *
 * Each test passes a non-default value for exactly one constant and asserts
 * that the engine behaves differently from the default. This proves the
 * constant is consumed, not ignored.
 *
 * Constants under test:
 *   baseFailureThresholdMagnitude  (default 1.5)
 *   catastrophicMarginMultiplier   (default 1.5)
 *   atRiskConfidenceFloor          (default 0.35)
 *   provisionalConfidenceThreshold (default 0.40)
 *   confidenceFloor                (default 0.50)
 *   minimumSafeClassificationConfidence (default 0.55)
 */

import { describe, it, expect } from "vitest";
import { detectFailureModes } from "./assessment/scoringEngine";
import { classifyReadiness } from "./assessment/scoringEngine";
import { applyClassificationConfidenceGate } from "./assessment/classificationConfidenceGate";

// ─── Shared answer fixtures ───────────────────────────────────────────────────

/** One answer with blind_acceptance_risk delta = -1.6 (just above default threshold of 1.5) */
const BLIND_ACCEPT_DELTA_1_6 = [
  {
    outcomeClass: "failure" as const,
    signalDeltas: { blind_acceptance_risk: -1.6 },
    eventCodes: [],
  },
  {
    outcomeClass: "failure" as const,
    signalDeltas: { blind_acceptance_risk: -1.6 },
    eventCodes: [],
  },
];

/** One answer with blind_acceptance_risk delta = -1.4 (just below default threshold of 1.5) */
const BLIND_ACCEPT_DELTA_1_4 = [
  {
    outcomeClass: "failure" as const,
    signalDeltas: { blind_acceptance_risk: -1.4 },
    eventCodes: [],
  },
  {
    outcomeClass: "failure" as const,
    signalDeltas: { blind_acceptance_risk: -1.4 },
    eventCodes: [],
  },
];

// ─── Test 1: baseFailureThresholdMagnitude ────────────────────────────────────

describe("baseFailureThresholdMagnitude override", () => {
  it("default 1.5: delta -1.6 triggers blind_ai_acceptance (downgrade — single mode, no catastrophic)", () => {
    // Two identical blind_ai_acceptance answers: blockCount=2, distinctModes=1, no catastrophic item.
    // Quality gate requires distinctModes>=2 OR catastrophic item → fails → classificationImpact=downgrade.
    const result = detectFailureModes(BLIND_ACCEPT_DELTA_1_6);
    expect(result.modes).toContain("blind_ai_acceptance");
    expect(result.classificationImpact).toBe("downgrade");
  });

  it("raised to 2.0: delta -1.6 no longer triggers blind_ai_acceptance", () => {
    const result = detectFailureModes(BLIND_ACCEPT_DELTA_1_6, {
      baseFailureThresholdMagnitude: 2.0,
    });
    // -1.6 is above -2.0 threshold, so blind_ai_acceptance should NOT fire
    expect(result.modes).not.toContain("blind_ai_acceptance");
    expect(result.classificationImpact).toBe("none");
  });

  it("lowered to 1.0: delta -1.4 now triggers blind_ai_acceptance", () => {
    const result = detectFailureModes(BLIND_ACCEPT_DELTA_1_4, {
      baseFailureThresholdMagnitude: 1.0,
    });
    // -1.4 is below -1.0 threshold, so blind_ai_acceptance SHOULD fire
    expect(result.modes).toContain("blind_ai_acceptance");
  });
});

// ─── Test 2: catastrophicMarginMultiplier ─────────────────────────────────────

describe("catastrophicMarginMultiplier override", () => {
  /**
   * With base=1.5 and margin=1.5, catastrophic threshold = 2.25.
   * A delta of 2.0 is below 2.25 → NOT catastrophic.
   * With margin=1.0, catastrophic threshold = 1.5 × 1.0 = 1.5.
   * A delta of 2.0 is above 1.5 → IS catastrophic.
   *
   * Use a single-answer scenario (blockCount=1, distinctModes=1) so
   * the quality gate only passes via the catastrophic path.
   */
  const SINGLE_BLIND_ACCEPT_2_0 = [
    {
      outcomeClass: "failure" as const,
      signalDeltas: { blind_acceptance_risk: -2.0 },
      eventCodes: [],
    },
  ];

  it("default margin 1.5: single item delta 2.0 does NOT trigger block (not catastrophic)", () => {
    const result = detectFailureModes(SINGLE_BLIND_ACCEPT_2_0, {
      blockingFailureMinItems: 1, // lower item gate so blockCount passes
    });
    // delta 2.0 < 2.25 catastrophic threshold → qualityGate fails → no block
    expect(result.classificationImpact).not.toBe("block");
  });

  it("margin lowered to 1.0: single item delta 2.0 IS catastrophic → block", () => {
    const result = detectFailureModes(SINGLE_BLIND_ACCEPT_2_0, {
      blockingFailureMinItems: 1,
      catastrophicMarginMultiplier: 1.0, // threshold = 1.5 × 1.0 = 1.5; 2.0 >= 1.5
    });
    expect(result.classificationImpact).toBe("block");
  });
});

// ─── Test 3: atRiskConfidenceFloor ────────────────────────────────────────────

describe("atRiskConfidenceFloor override", () => {
  it("default 0.35: at_risk with confidence 0.33 → insufficient_evidence", () => {
    const result = applyClassificationConfidenceGate("at_risk", 0.33);
    expect(result.state).toBe("insufficient_evidence");
    expect(result.wasDowngraded).toBe(true);
  });

  it("default 0.35: at_risk with confidence 0.36 → stays at_risk", () => {
    const result = applyClassificationConfidenceGate("at_risk", 0.36);
    expect(result.state).toBe("at_risk");
    expect(result.wasDowngraded).toBe(false);
  });

  it("raised to 0.45: at_risk with confidence 0.40 → insufficient_evidence", () => {
    const result = applyClassificationConfidenceGate("at_risk", 0.40, undefined, 0.45);
    expect(result.state).toBe("insufficient_evidence");
    expect(result.wasDowngraded).toBe(true);
  });

  it("raised to 0.45: at_risk with confidence 0.46 → stays at_risk", () => {
    const result = applyClassificationConfidenceGate("at_risk", 0.46, undefined, 0.45);
    expect(result.state).toBe("at_risk");
    expect(result.wasDowngraded).toBe(false);
  });
});

// ─── Test 4: minimumSafeClassificationConfidence ─────────────────────────────

describe("minimumSafeClassificationConfidence override", () => {
  it("default 0.55: safe with confidence 0.52 → downgraded to at_risk", () => {
    const result = applyClassificationConfidenceGate("safe", 0.52);
    expect(result.state).toBe("at_risk");
    expect(result.wasDowngraded).toBe(true);
  });

  it("default 0.55: safe with confidence 0.56 → stays safe", () => {
    const result = applyClassificationConfidenceGate("safe", 0.56);
    expect(result.state).toBe("safe");
    expect(result.wasDowngraded).toBe(false);
  });

  it("lowered to 0.45: safe with confidence 0.48 → stays safe", () => {
    const result = applyClassificationConfidenceGate("safe", 0.48, 0.45);
    expect(result.state).toBe("safe");
    expect(result.wasDowngraded).toBe(false);
  });

  it("raised to 0.70: safe with confidence 0.65 → downgraded to at_risk", () => {
    const result = applyClassificationConfidenceGate("safe", 0.65, 0.70);
    expect(result.state).toBe("at_risk");
    expect(result.wasDowngraded).toBe(true);
  });
});

// ─── Test 5: provisionalConfidenceThreshold ──────────────────────────────────

describe("provisionalConfidenceThreshold override (classifyReadiness)", () => {
  const BASE_ARGS = {
    overallScore: 80,
    riskBand: "low" as const,
    failureModes: { detected: false, modes: [], governanceFlag: false, classificationImpact: "none" as const },
    evidenceSufficient: true,
  };

  it("default 0.40: confidence 0.38 → unknown_insufficient_evidence", () => {
    const result = classifyReadiness(
      BASE_ARGS.overallScore, BASE_ARGS.riskBand, BASE_ARGS.failureModes,
      BASE_ARGS.evidenceSufficient, undefined, undefined, 0.38
    );
    expect(result.state).toBe("unknown_insufficient_evidence");
  });

  it("default 0.40: confidence 0.41 → safe (not unknown)", () => {
    const result = classifyReadiness(
      BASE_ARGS.overallScore, BASE_ARGS.riskBand, BASE_ARGS.failureModes,
      BASE_ARGS.evidenceSufficient, undefined, undefined, 0.41
    );
    expect(result.state).toBe("safe");
  });

  it("raised to 0.50: confidence 0.45 → unknown_insufficient_evidence", () => {
    const result = classifyReadiness(
      BASE_ARGS.overallScore, BASE_ARGS.riskBand, BASE_ARGS.failureModes,
      BASE_ARGS.evidenceSufficient, undefined, undefined, 0.45,
      undefined, 0.50 // provisionalThreshold
    );
    expect(result.state).toBe("unknown_insufficient_evidence");
  });

  it("raised to 0.50: confidence 0.51 → safe (not unknown)", () => {
    const result = classifyReadiness(
      BASE_ARGS.overallScore, BASE_ARGS.riskBand, BASE_ARGS.failureModes,
      BASE_ARGS.evidenceSufficient, undefined, undefined, 0.51,
      undefined, 0.50 // provisionalThreshold
    );
    expect(result.state).toBe("safe");
  });
});

// ─── Test 6: confidenceFloor (isProvisional band) ────────────────────────────

describe("confidenceFloor override (isProvisional band in classifyReadiness)", () => {
  const BASE_ARGS = {
    overallScore: 80,
    riskBand: "low" as const,
    failureModes: { detected: false, modes: [], governanceFlag: false, classificationImpact: "none" as const },
    evidenceSufficient: true,
  };

  it("default floor 0.50: confidence 0.45 → isProvisional=true", () => {
    const result = classifyReadiness(
      BASE_ARGS.overallScore, BASE_ARGS.riskBand, BASE_ARGS.failureModes,
      BASE_ARGS.evidenceSufficient, undefined, undefined, 0.45
    );
    expect(result.state).toBe("safe");
    expect(result.isProvisional).toBe(true);
  });

  it("default floor 0.50: confidence 0.51 → isProvisional=false", () => {
    const result = classifyReadiness(
      BASE_ARGS.overallScore, BASE_ARGS.riskBand, BASE_ARGS.failureModes,
      BASE_ARGS.evidenceSufficient, undefined, undefined, 0.51
    );
    expect(result.state).toBe("safe");
    expect(result.isProvisional).toBe(false);
  });

  it("floor raised to 0.65: confidence 0.60 → isProvisional=true", () => {
    const result = classifyReadiness(
      BASE_ARGS.overallScore, BASE_ARGS.riskBand, BASE_ARGS.failureModes,
      BASE_ARGS.evidenceSufficient, undefined, undefined, 0.60,
      undefined, undefined, 0.65 // confidenceFloorOverride
    );
    expect(result.state).toBe("safe");
    expect(result.isProvisional).toBe(true);
  });

  it("floor raised to 0.65: confidence 0.66 → isProvisional=false", () => {
    const result = classifyReadiness(
      BASE_ARGS.overallScore, BASE_ARGS.riskBand, BASE_ARGS.failureModes,
      BASE_ARGS.evidenceSufficient, undefined, undefined, 0.66,
      undefined, undefined, 0.65 // confidenceFloorOverride
    );
    expect(result.state).toBe("safe");
    expect(result.isProvisional).toBe(false);
  });
});

// ─── Test 7: Default-identity — all overrides at default values produce same result ──

describe("Default-identity: overrides at default values produce identical results", () => {
  it("detectFailureModes: explicit defaults = no opts", () => {
    const withDefaults = detectFailureModes(BLIND_ACCEPT_DELTA_1_6, {
      baseFailureThresholdMagnitude: 1.5,
      catastrophicMarginMultiplier: 1.5,
      blockingFailureMinItems: 2,
      downgradeFailureMinItems: 1,
    });
    const withoutOpts = detectFailureModes(BLIND_ACCEPT_DELTA_1_6);
    expect(withDefaults.classificationImpact).toBe(withoutOpts.classificationImpact);
    expect(withDefaults.modes).toEqual(withoutOpts.modes);
  });

  it("applyClassificationConfidenceGate: explicit defaults = no opts", () => {
    const withDefaults = applyClassificationConfidenceGate("safe", 0.52, 0.55, 0.35);
    const withoutOpts = applyClassificationConfidenceGate("safe", 0.52);
    expect(withDefaults.state).toBe(withoutOpts.state);
    expect(withDefaults.wasDowngraded).toBe(withoutOpts.wasDowngraded);
  });
});
