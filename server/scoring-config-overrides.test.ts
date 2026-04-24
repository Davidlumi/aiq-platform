/**
 * WS1.2 Item 1: Scoring Config Overrides Test Suite (v10 migration)
 *
 * Verifies that the six previously hard-coded scoring constants are now read
 * from the active scoring_config row and honoured by the engine.
 *
 * v10 migration notes:
 *   - blind_ai_acceptance → blind_acceptance
 *   - detectFailureModes returns v10 FailureModeResult (pressureDriftDetected/pressureDriftMagnitude)
 *   - classifyReadiness "safe" requires allDomainsAssessed (capabilityScores with >= 2 signals each)
 *     so tests that expect "safe" must pass capabilityScores
 *   - FailureModeResult no longer has hasBlockingFailure; uses classificationImpact
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
import { detectFailureModes, classifyReadiness, ALL_DOMAINS, type CapabilityScore, type CapabilityKey } from "./assessment/scoringEngine";
import { applyClassificationConfidenceGate } from "./assessment/classificationConfidenceGate";

// ─── Helper: build full capabilityScores for "safe" classification ───────────
function makeSafeCapabilityScores(overallScore: number = 80): Record<CapabilityKey, CapabilityScore> {
  const result: Record<string, CapabilityScore> = {};
  for (const domain of ALL_DOMAINS) {
    result[domain] = {
      score: overallScore,
      band: overallScore >= 75 ? "strong" : "developing",
      signalCount: 5,
      signalSum: 3.0,
      displayName: domain,
    };
  }
  return result as Record<CapabilityKey, CapabilityScore>;
}

// ─── Shared answer fixtures ───────────────────────────────────────────────────

/** Two answers with blind_acceptance_risk delta = -1.6 (just above default threshold of 1.5) */
const BLIND_ACCEPT_DELTA_1_6 = [
  {
    outcomeClass: "failure" as const,
    signalDeltas: { blind_acceptance_risk: -1.6 },
    eventCodes: [] as string[],
  },
  {
    outcomeClass: "failure" as const,
    signalDeltas: { blind_acceptance_risk: -1.6 },
    eventCodes: [] as string[],
  },
];

/** Two answers with blind_acceptance_risk delta = -1.4 (just below default threshold of 1.5) */
const BLIND_ACCEPT_DELTA_1_4 = [
  {
    outcomeClass: "failure" as const,
    signalDeltas: { blind_acceptance_risk: -1.4 },
    eventCodes: [] as string[],
  },
  {
    outcomeClass: "failure" as const,
    signalDeltas: { blind_acceptance_risk: -1.4 },
    eventCodes: [] as string[],
  },
];

// ─── Test 1: baseFailureThresholdMagnitude ────────────────────────────────────

describe("baseFailureThresholdMagnitude override", () => {
  it("default 1.5: delta -1.6 triggers blind_acceptance (downgrade — single mode, no catastrophic)", () => {
    const result = detectFailureModes(BLIND_ACCEPT_DELTA_1_6);
    expect(result.modes).toContain("blind_acceptance");
    expect(result.classificationImpact).toBe("downgrade");
  });

  it("raised to 2.0: delta -1.6 no longer triggers blind_acceptance", () => {
    const result = detectFailureModes(BLIND_ACCEPT_DELTA_1_6, {
      baseFailureThresholdMagnitude: 2.0,
    });
    // -1.6 is above -2.0 threshold, so blind_acceptance should NOT fire
    expect(result.modes).not.toContain("blind_acceptance");
    // over_reliance still fires because blind_acceptance_risk < -1.0
    // but no blocking modes → check if over_reliance alone causes downgrade
    expect(result.classificationImpact).toBe("downgrade"); // over_reliance causes downgrade
  });

  it("lowered to 1.0: delta -1.4 now triggers blind_acceptance", () => {
    const result = detectFailureModes(BLIND_ACCEPT_DELTA_1_4, {
      baseFailureThresholdMagnitude: 1.0,
    });
    // -1.4 is below -1.0 threshold, so blind_acceptance SHOULD fire
    expect(result.modes).toContain("blind_acceptance");
  });
});

// ─── Test 2: catastrophicMarginMultiplier ─────────────────────────────────────

describe("catastrophicMarginMultiplier override", () => {
  const SINGLE_BLIND_ACCEPT_2_0 = [
    {
      outcomeClass: "failure" as const,
      signalDeltas: { blind_acceptance_risk: -2.0 },
      eventCodes: [] as string[],
    },
  ];

  it("default margin 1.5: single item delta 2.0 does NOT trigger block (not catastrophic)", () => {
    const result = detectFailureModes(SINGLE_BLIND_ACCEPT_2_0, {
      blockingFailureMinItems: 1,
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
  const noFailures = {
    detected: false, modes: [] as string[], governanceFlag: false,
    classificationImpact: "none" as const,
    pressureDriftDetected: false, pressureDriftMagnitude: 0,
  };

  it("default 0.40: confidence 0.38 → unknown_insufficient_evidence", () => {
    const result = classifyReadiness(
      80, "low", noFailures, true,
      undefined, undefined, 0.38
    );
    expect(result.state).toBe("unknown_insufficient_evidence");
  });

  it("default 0.40: confidence 0.41 → safe (with full capabilityScores)", () => {
    const caps = makeSafeCapabilityScores(80);
    const result = classifyReadiness(
      80, "low", noFailures, true,
      caps, undefined, 0.41
    );
    expect(result.state).toBe("safe");
  });

  it("raised to 0.50: confidence 0.45 → unknown_insufficient_evidence", () => {
    const result = classifyReadiness(
      80, "low", noFailures, true,
      undefined, undefined, 0.45,
      undefined, 0.50 // provisionalThreshold
    );
    expect(result.state).toBe("unknown_insufficient_evidence");
  });

  it("raised to 0.50: confidence 0.51 → safe (with full capabilityScores)", () => {
    const caps = makeSafeCapabilityScores(80);
    const result = classifyReadiness(
      80, "low", noFailures, true,
      caps, undefined, 0.51,
      undefined, 0.50 // provisionalThreshold
    );
    expect(result.state).toBe("safe");
  });
});

// ─── Test 6: confidenceFloor (isProvisional band) ────────────────────────────

describe("confidenceFloor override (isProvisional band in classifyReadiness)", () => {
  const noFailures = {
    detected: false, modes: [] as string[], governanceFlag: false,
    classificationImpact: "none" as const,
    pressureDriftDetected: false, pressureDriftMagnitude: 0,
  };

  it("default floor 0.50: confidence 0.45 → isProvisional=true", () => {
    const caps = makeSafeCapabilityScores(80);
    const result = classifyReadiness(
      80, "low", noFailures, true,
      caps, undefined, 0.45
    );
    expect(result.state).toBe("safe");
    expect(result.isProvisional).toBe(true);
  });

  it("default floor 0.50: confidence 0.51 → isProvisional=false", () => {
    const caps = makeSafeCapabilityScores(80);
    const result = classifyReadiness(
      80, "low", noFailures, true,
      caps, undefined, 0.51
    );
    expect(result.state).toBe("safe");
    expect(result.isProvisional).toBe(false);
  });

  it("floor raised to 0.65: confidence 0.60 → isProvisional=true", () => {
    const caps = makeSafeCapabilityScores(80);
    const result = classifyReadiness(
      80, "low", noFailures, true,
      caps, undefined, 0.60,
      undefined, undefined, 0.65 // confidenceFloorOverride
    );
    expect(result.state).toBe("safe");
    expect(result.isProvisional).toBe(true);
  });

  it("floor raised to 0.65: confidence 0.66 → isProvisional=false", () => {
    const caps = makeSafeCapabilityScores(80);
    const result = classifyReadiness(
      80, "low", noFailures, true,
      caps, undefined, 0.66,
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
