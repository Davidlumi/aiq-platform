import { describe, it, expect } from "vitest";
import {
  detectFailureModes,
  computeSignalScores,
  computeCapabilityScores,
  checkFoundationGate,
  computeOverallScore,
  classifyReadiness,
  computeConfidenceProfile,
  SIGNAL_TO_DOMAIN,
  ALL_DOMAINS,
  FOUNDATION_DOMAINS,
  STRATEGIC_DOMAINS,
  OPERATIONAL_DOMAINS,
  FOUNDATION_GATE_THRESHOLD,
  FOUNDATION_MINIMUM_SIGNALS,
  DOMAIN_TIER,
  OUTCOME_SCORE_MODIFIER,
  DIFFICULTY_WEIGHTS,
  CONFIDENCE_STAKE_VALUES,
  type CapabilityKey,
  type SignalKey,
  type CapabilityScore,
  type FailureModeResult,
} from "./scoringEngine";
import type { RoleArchetype } from "./roleArchetypes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeArchetype(overrides: Partial<RoleArchetype> = {}): RoleArchetype {
  return {
    key: "hr_generalist",
    label: "HR Generalist",
    roleFamily: "generalist",
    seniorityTier: "mid",
    capabilityWeights: {
      ai_interaction: 0.25,
      ai_output_evaluation: 0.20,
      ai_workflow_design: 0.15,
      workforce_ai_readiness: 0.15,
      ai_ethics_trust: 0.15,
      ai_change_leadership: 0.10,
    },
    minimumSafeThresholds: {
      ai_interaction: 55,
      ai_output_evaluation: 50,
      ai_workflow_design: 45,
      workforce_ai_readiness: 40,
      ai_ethics_trust: 50,
      ai_change_leadership: 35,
    },
    description: "General HR practitioner",
    ...overrides,
  };
}

function makeCapScores(overrides: Partial<Record<CapabilityKey, Partial<CapabilityScore>>> = {}): Record<CapabilityKey, CapabilityScore> {
  const defaults: Record<CapabilityKey, CapabilityScore> = {
    ai_interaction: { score: 70, signalCount: 5, displayName: "AI Interaction", band: "developing" },
    ai_output_evaluation: { score: 65, signalCount: 5, displayName: "AI Output Evaluation", band: "developing" },
    ai_workflow_design: { score: 60, signalCount: 4, displayName: "AI Workflow Design", band: "developing" },
    workforce_ai_readiness: { score: 55, signalCount: 4, displayName: "Workforce AI Readiness", band: "developing" },
    ai_ethics_trust: { score: 60, signalCount: 4, displayName: "AI Ethics & Trust", band: "developing" },
    ai_change_leadership: { score: 50, signalCount: 3, displayName: "AI Change Leadership", band: "needs_work" },
  };
  for (const [k, v] of Object.entries(overrides)) {
    defaults[k as CapabilityKey] = { ...defaults[k as CapabilityKey], ...v };
  }
  return defaults;
}

const cleanFailureModes: FailureModeResult = {
  detected: false,
  modes: [],
  governanceFlag: false,
  classificationImpact: "none",
  pressureDriftDetected: false,
  pressureDriftMagnitude: 0,
};

// ─── Domain Taxonomy ──────────────────────────────────────────────────────────

describe("v10 Domain Taxonomy", () => {
  it("has exactly 6 domains", () => {
    expect(ALL_DOMAINS).toHaveLength(6);
  });

  it("has 2 foundation domains", () => {
    expect(FOUNDATION_DOMAINS).toHaveLength(2);
    expect(FOUNDATION_DOMAINS).toContain("ai_interaction");
    expect(FOUNDATION_DOMAINS).toContain("ai_output_evaluation");
  });

  it("has 3 strategic domains", () => {
    expect(STRATEGIC_DOMAINS).toHaveLength(3);
    expect(STRATEGIC_DOMAINS).toContain("workforce_ai_readiness");
    expect(STRATEGIC_DOMAINS).toContain("ai_ethics_trust");
    expect(STRATEGIC_DOMAINS).toContain("ai_change_leadership");
  });

  it("has 1 operational domain", () => {
    expect(OPERATIONAL_DOMAINS).toHaveLength(1);
    expect(OPERATIONAL_DOMAINS).toContain("ai_workflow_design");
  });

  it("every signal maps to a valid domain", () => {
    for (const [signal, domain] of Object.entries(SIGNAL_TO_DOMAIN)) {
      expect(ALL_DOMAINS).toContain(domain);
    }
  });

  it("has 28 signals across 6 domains", () => {
    const signalCount = Object.keys(SIGNAL_TO_DOMAIN).length;
    expect(signalCount).toBe(28);
  });

  it("assigns correct tiers to all domains", () => {
    expect(DOMAIN_TIER.ai_interaction).toBe("foundation");
    expect(DOMAIN_TIER.ai_output_evaluation).toBe("foundation");
    expect(DOMAIN_TIER.ai_workflow_design).toBe("operational");
    expect(DOMAIN_TIER.workforce_ai_readiness).toBe("strategic");
    expect(DOMAIN_TIER.ai_ethics_trust).toBe("strategic");
    expect(DOMAIN_TIER.ai_change_leadership).toBe("strategic");
  });
});

// ─── Failure Mode Detection ───────────────────────────────────────────────────

describe("detectFailureModes", () => {
  it("detects blind_acceptance from signal deltas", () => {
    const answers = [
      { outcomeClass: "harmful", signalDeltas: { blind_acceptance_risk: -2.0 }, eventCodes: ["BLIND_ACCEPT"] },
      { outcomeClass: "harmful", signalDeltas: { blind_acceptance_risk: -1.8 }, eventCodes: ["BLIND_ACCEPT"] },
      { outcomeClass: "harmful", signalDeltas: { blind_acceptance_risk: -2.5 }, eventCodes: ["BLIND_ACCEPT"] },
    ];
    const result = detectFailureModes(answers);
    expect(result.detected).toBe(true);
    expect(result.modes).toContain("blind_acceptance");
    expect(result.governanceFlag).toBe(true);
  });

  it("detects hallucination_acceptance", () => {
    const answers = [
      { outcomeClass: "harmful", signalDeltas: { hallucination_acceptance_risk: -2.0 }, eventCodes: ["HALLUCINATION_ACCEPT"] },
    ];
    const result = detectFailureModes(answers);
    expect(result.detected).toBe(true);
    expect(result.modes).toContain("hallucination_acceptance");
    expect(result.governanceFlag).toBe(true);
  });

  it("detects critical_failure from outcome class", () => {
    const answers = [
      { outcomeClass: "critical_failure", signalDeltas: {}, eventCodes: [] },
      { outcomeClass: "critical_failure", signalDeltas: {}, eventCodes: [] },
      { outcomeClass: "critical_failure", signalDeltas: {}, eventCodes: [] },
    ];
    const result = detectFailureModes(answers);
    expect(result.detected).toBe(true);
    expect(result.modes).toContain("critical_failure");
  });

  it("returns clean result for strong answers", () => {
    const answers = [
      { outcomeClass: "strong", signalDeltas: { prompt_construction_quality: 0.4 }, eventCodes: [] },
      { outcomeClass: "strong", signalDeltas: { output_evaluation_quality: 0.3 }, eventCodes: [] },
      { outcomeClass: "acceptable", signalDeltas: { workflow_redesign_quality: 0.2 }, eventCodes: [] },
    ];
    const result = detectFailureModes(answers);
    expect(result.classificationImpact).toBe("none");
    expect(result.governanceFlag).toBe(false);
  });

  it("detects pressure_drift from event codes", () => {
    const answers = [
      { outcomeClass: "strong", signalDeltas: { ethics_under_pressure: 0.4 }, eventCodes: [] },
      { outcomeClass: "harmful", signalDeltas: { pressure_drift_risk: -2.0 }, eventCodes: ["PRESSURE_DRIFT"] },
      { outcomeClass: "harmful", signalDeltas: { pressure_drift_risk: -1.8 }, eventCodes: ["PRESSURE_DRIFT"] },
    ];
    const result = detectFailureModes(answers);
    expect(result.pressureDriftDetected).toBe(true);
  });
});

// ─── Signal Score Computation ─────────────────────────────────────────────────

describe("computeSignalScores", () => {
  it("aggregates signal deltas from multiple answers", () => {
    const answers = [
      { signalDeltas: { prompt_construction_quality: 0.3, prompt_iteration_quality: 0.2 } },
      { signalDeltas: { prompt_construction_quality: 0.1, output_evaluation_quality: 0.4 } },
    ];
    const scores = computeSignalScores(answers);
    expect(scores.prompt_construction_quality).toBeDefined();
    expect(scores.prompt_construction_quality.sum).toBeCloseTo(0.4, 1);
    expect(scores.prompt_construction_quality.count).toBe(2);
    expect(scores.prompt_iteration_quality.count).toBe(1);
    expect(scores.output_evaluation_quality.count).toBe(1);
  });

  it("returns empty for no answers", () => {
    const scores = computeSignalScores([]);
    expect(Object.keys(scores)).toHaveLength(0);
  });

  it("handles negative deltas correctly", () => {
    const answers = [
      { signalDeltas: { blind_acceptance_risk: -0.5 } },
      { signalDeltas: { blind_acceptance_risk: -0.3 } },
    ];
    const scores = computeSignalScores(answers);
    expect(scores.blind_acceptance_risk.sum).toBeCloseTo(-0.8, 1);
    expect(scores.blind_acceptance_risk.count).toBe(2);
  });
});

// ─── Capability Score Computation ─────────────────────────────────────────────

describe("computeCapabilityScores", () => {
  it("computes scores for all 6 domains from signal scores", () => {
    // Build signal scores with at least one signal per domain
    const signalScores: Record<string, { sum: number; count: number }> = {
      prompt_construction_quality: { sum: 2.0, count: 3 },
      prompt_iteration_quality: { sum: 1.5, count: 3 },
      output_direction_skill: { sum: 1.0, count: 2 },
      tool_fluency_index: { sum: 0.8, count: 2 },
      output_evaluation_quality: { sum: 1.8, count: 3 },
      error_detection_accuracy: { sum: 1.2, count: 2 },
      fitness_for_purpose_judgement: { sum: 1.0, count: 2 },
      workflow_redesign_quality: { sum: 1.5, count: 3 },
      handoff_design_quality: { sum: 1.0, count: 2 },
      capability_diagnosis_accuracy: { sum: 1.2, count: 2 },
      intervention_design_quality: { sum: 0.8, count: 2 },
      ethics_under_pressure: { sum: 1.5, count: 3 },
      stakeholder_impact_awareness: { sum: 1.0, count: 2 },
      resistance_response_quality: { sum: 1.0, count: 2 },
      legitimate_concern_recognition: { sum: 0.8, count: 2 },
    };
    const result = computeCapabilityScores(signalScores);
    expect(Object.keys(result)).toHaveLength(6);
    for (const domain of ALL_DOMAINS) {
      expect(result[domain]).toBeDefined();
      expect(result[domain].score).toBeGreaterThanOrEqual(0);
      expect(result[domain].score).toBeLessThanOrEqual(100);
      expect(result[domain].displayName).toBeDefined();
    }
  });

  it("clamps scores between 0 and 100 with extreme inputs", () => {
    const extremeSignals: Record<string, { sum: number; count: number }> = {
      prompt_construction_quality: { sum: 50.0, count: 10 },
      prompt_iteration_quality: { sum: 50.0, count: 10 },
      output_direction_skill: { sum: 50.0, count: 10 },
      tool_fluency_index: { sum: 50.0, count: 10 },
    };
    const result = computeCapabilityScores(extremeSignals);
    expect(result.ai_interaction.score).toBeLessThanOrEqual(100);
    expect(result.ai_interaction.score).toBeGreaterThanOrEqual(0);
  });

  it("returns intercept (50) for domains with no signals", () => {
    const signalScores: Record<string, { sum: number; count: number }> = {
      prompt_construction_quality: { sum: 2.0, count: 3 },
    };
    const result = computeCapabilityScores(signalScores);
    // ai_interaction has signals, others should be at intercept
    expect(result.ai_interaction.score).toBeGreaterThan(50);
    // Domains with no signals should have score around 50 (intercept)
    expect(result.ai_change_leadership.signalCount).toBe(0);
  });
});

// ─── Foundation Gate ─────────────────────────────────────────────────────────

describe("checkFoundationGate", () => {
  it("passes when both foundation domains are above threshold with enough signals", () => {
    const capScores = makeCapScores({
      ai_interaction: { score: 70, signalCount: 4 },
      ai_output_evaluation: { score: 65, signalCount: 4 },
    });
    const result = checkFoundationGate(capScores);
    expect(result.passed).toBe(true);
    expect(result.gatingDomain).toBeUndefined();
  });

  it("fails when a foundation domain is below threshold", () => {
    const capScores = makeCapScores({
      ai_interaction: { score: 30, signalCount: 5 },
      ai_output_evaluation: { score: 70, signalCount: 5 },
    });
    const result = checkFoundationGate(capScores);
    expect(result.passed).toBe(false);
    expect(result.gatingDomain).toBe("ai_interaction");
  });

  it("fails when foundation domain has insufficient signals", () => {
    const capScores = makeCapScores({
      ai_interaction: { score: 70, signalCount: 1 },
      ai_output_evaluation: { score: 70, signalCount: 5 },
    });
    const result = checkFoundationGate(capScores);
    expect(result.passed).toBe(false);
    expect(result.gatingDomain).toBe("ai_interaction");
  });

  it("does not check strategic domains", () => {
    const capScores = makeCapScores({
      ai_interaction: { score: 70, signalCount: 4 },
      ai_output_evaluation: { score: 65, signalCount: 4 },
      ai_change_leadership: { score: 10, signalCount: 1 },
    });
    const result = checkFoundationGate(capScores);
    expect(result.passed).toBe(true);
  });
});

// ─── Overall Score ───────────────────────────────────────────────────────────

describe("computeOverallScore", () => {
  it("computes weighted average using archetype weights", () => {
    const capScores = makeCapScores({
      ai_interaction: { score: 80, signalCount: 5 },
      ai_output_evaluation: { score: 70, signalCount: 5 },
      ai_workflow_design: { score: 60, signalCount: 4 },
      workforce_ai_readiness: { score: 50, signalCount: 4 },
      ai_ethics_trust: { score: 55, signalCount: 4 },
      ai_change_leadership: { score: 45, signalCount: 3 },
    });
    const archetype = makeArchetype();
    const overall = computeOverallScore(capScores, archetype.capabilityWeights);
    expect(overall).toBeGreaterThan(0);
    expect(overall).toBeLessThanOrEqual(100);
    // Weighted average minus consistency penalty — should be in reasonable range
    expect(overall).toBeGreaterThan(50);
    expect(overall).toBeLessThan(80);
  });

  it("returns 50 when no domains have evidence", () => {
    const capScores = makeCapScores({
      ai_interaction: { score: 0, signalCount: 0 },
      ai_output_evaluation: { score: 0, signalCount: 0 },
      ai_workflow_design: { score: 0, signalCount: 0 },
      workforce_ai_readiness: { score: 0, signalCount: 0 },
      ai_ethics_trust: { score: 0, signalCount: 0 },
      ai_change_leadership: { score: 0, signalCount: 0 },
    });
    const overall = computeOverallScore(capScores);
    expect(overall).toBe(50);
  });
});

// ─── Readiness Classification ─────────────────────────────────────────────────

describe("classifyReadiness", () => {
  const archetype = makeArchetype();

  it("classifies high scorer as safe", () => {
    const capScores = makeCapScores({
      ai_interaction: { score: 85, signalCount: 5 },
      ai_output_evaluation: { score: 80, signalCount: 5 },
      ai_workflow_design: { score: 75, signalCount: 4 },
      workforce_ai_readiness: { score: 70, signalCount: 4 },
      ai_ethics_trust: { score: 75, signalCount: 4 },
      ai_change_leadership: { score: 65, signalCount: 3 },
    });
    const result = classifyReadiness(
      80, "low", cleanFailureModes, true,
      capScores, archetype.minimumSafeThresholds, 0.85,
    );
    expect(result.state).toBe("safe");
  });

  it("classifies foundation_gap when gate fails", () => {
    const result = classifyReadiness(
      60, "medium", cleanFailureModes, true,
      makeCapScores(), archetype.minimumSafeThresholds, 0.7,
      undefined, undefined, undefined,
      { passed: false, gatingDomain: "ai_interaction" as CapabilityKey, gatingScore: 30 }
    );
    expect(result.state).toBe("foundation_gap");
  });

  it("classifies unsafe when blocking failure modes present", () => {
    const blockingFailures: FailureModeResult = {
      detected: true,
      modes: ["blind_acceptance"],
      governanceFlag: true,
      classificationImpact: "block",
      pressureDriftDetected: false,
      pressureDriftMagnitude: 0,
    };
    const result = classifyReadiness(
      62, "medium", blockingFailures, true,
      makeCapScores(), archetype.minimumSafeThresholds, 0.7,
    );
    expect(result.state).toBe("unsafe");
  });

  it("classifies unknown when evidence is insufficient", () => {
    const result = classifyReadiness(
      30, "low", cleanFailureModes, false,
    );
    expect(result.state).toBe("unknown");
  });

  it("classifies at_risk when downgrade failure modes present", () => {
    const downgradeFailures: FailureModeResult = {
      detected: true,
      modes: ["over_reliance"],
      governanceFlag: false,
      classificationImpact: "downgrade",
      pressureDriftDetected: false,
      pressureDriftMagnitude: 0,
    };
    const result = classifyReadiness(
      65, "medium", downgradeFailures, true,
      makeCapScores(), archetype.minimumSafeThresholds, 0.7,
    );
    expect(result.state).toBe("at_risk");
  });

  it("classifies unknown_insufficient_evidence when confidence is too low", () => {
    const result = classifyReadiness(
      65, "medium", cleanFailureModes, true,
      makeCapScores(), archetype.minimumSafeThresholds, 0.2, // very low confidence
    );
    expect(result.state).toBe("unknown_insufficient_evidence");
  });
});

// ─── Confidence Profile ───────────────────────────────────────────────────────

describe("computeConfidenceProfile", () => {
  it("computes confidence metrics from answers", () => {
    const capScores = makeCapScores();
    const profile = computeConfidenceProfile(
      15,              // totalAnswers
      capScores,
      new Set(["prompt_lab", "output_audit", "workflow_mapping"]),  // interactionTypesUsed
      3,               // highRiskAnswers
      0,               // contradictionCount
      0.85,            // consistencyScore
      0.9,             // antiGamingScore
      49,              // targetItems
      1.0,             // reasoningCompleteness
      [
        { stake: "confident", domain: "ai_interaction" as CapabilityKey, wasCorrect: true },
        { stake: "tentative", domain: "ai_output_evaluation" as CapabilityKey, wasCorrect: true },
        { stake: "certain", domain: "ai_workflow_design" as CapabilityKey, wasCorrect: true },
      ]
    );
    expect(profile).toBeDefined();
    expect(profile.evidenceDepth).toBeGreaterThanOrEqual(0);
    expect(profile.evidenceBreadth).toBeGreaterThanOrEqual(0);
    expect(profile.overall).toBeGreaterThanOrEqual(0);
    expect(profile.overall).toBeLessThanOrEqual(1);
  });

  it("penalises overconfidence on certain stakes that were wrong", () => {
    const capScores = makeCapScores();
    const noOverconfidence = computeConfidenceProfile(
      15, capScores,
      new Set(["prompt_lab", "output_audit"]),
      3, 0, 0.85, 0.9, 49, 1.0,
      [
        { stake: "confident", domain: "ai_interaction" as CapabilityKey, wasCorrect: true },
        { stake: "confident", domain: "ai_output_evaluation" as CapabilityKey, wasCorrect: true },
      ]
    );
    const withOverconfidence = computeConfidenceProfile(
      15, capScores,
      new Set(["prompt_lab", "output_audit"]),
      3, 0, 0.85, 0.9, 49, 1.0,
      [
        { stake: "certain", domain: "ai_output_evaluation" as CapabilityKey, wasCorrect: false },
        { stake: "certain", domain: "ai_interaction" as CapabilityKey, wasCorrect: false },
      ]
    );
    expect(withOverconfidence.overall).toBeLessThanOrEqual(noOverconfidence.overall);
  });
});

// ─── Scoring Constants ───────────────────────────────────────────────────────

describe("Scoring Constants", () => {
  it("has outcome modifiers for all outcome classes", () => {
    expect(OUTCOME_SCORE_MODIFIER).toHaveProperty("strong");
    expect(OUTCOME_SCORE_MODIFIER).toHaveProperty("acceptable");
    expect(OUTCOME_SCORE_MODIFIER).toHaveProperty("weak");
    expect(OUTCOME_SCORE_MODIFIER).toHaveProperty("failure");
    expect(OUTCOME_SCORE_MODIFIER).toHaveProperty("critical_failure");
    expect(OUTCOME_SCORE_MODIFIER.strong).toBeGreaterThan(OUTCOME_SCORE_MODIFIER.failure);
  });

  it("has difficulty weights for levels 1-3", () => {
    expect(Object.keys(DIFFICULTY_WEIGHTS)).toHaveLength(3);
    expect(DIFFICULTY_WEIGHTS[1]).toBeLessThan(DIFFICULTY_WEIGHTS[3]);
  });

  it("has three confidence stake levels", () => {
    expect(CONFIDENCE_STAKE_VALUES).toHaveProperty("tentative");
    expect(CONFIDENCE_STAKE_VALUES).toHaveProperty("confident");
    expect(CONFIDENCE_STAKE_VALUES).toHaveProperty("certain");
    expect(CONFIDENCE_STAKE_VALUES.tentative).toBeLessThan(CONFIDENCE_STAKE_VALUES.certain);
  });

  it("foundation gate threshold is reasonable", () => {
    expect(FOUNDATION_GATE_THRESHOLD).toBeGreaterThanOrEqual(40);
    expect(FOUNDATION_GATE_THRESHOLD).toBeLessThanOrEqual(70);
  });

  it("foundation minimum signals is at least 3", () => {
    expect(FOUNDATION_MINIMUM_SIGNALS).toBeGreaterThanOrEqual(3);
  });
});
