/**
 * AIQ Adaptive Assessment Engine — Anti-Gaming Engine v10
 *
 * Detects 14 gaming patterns (11 preserved from v9.2 + 3 new v10 patterns)
 * and responds by injecting traps, varying formats, and increasing scrutiny.
 *
 * v10 Changes:
 * - Updated signal references to v10 26-signal taxonomy
 * - Updated capability/domain references to v10 6-domain taxonomy
 * - Added 3 new patterns: ethics_performative, advisory_generic, resistance_dismissive
 * - Updated injection specs to target v10 interaction types
 *
 * Preserved from v9.2:
 * A1: always_cautious pattern detection
 * A2: Per-interaction-type speed thresholds
 * A3: Semantic outcome-class cycling detection
 * A4: Max injections raised to 3 when scrutinyLevel="high"
 * A5: Injection spec for always_cautious
 * WS2.1: Outcome-conditional detection
 * WS2.2: Role-aware thresholds + seniority-inconsistency
 * WS2.3: Audit event codes
 */

export interface GamingAnalysis {
  score: number; // 0–1, higher = more authentic
  patterns: GamingPattern[];
  scrutinyLevel: "normal" | "elevated" | "high";
  injectionRequired: boolean;
  recommendedInjections: InjectionSpec[];
}

export type GamingPattern =
  | "always_safe_choice"
  | "always_escalate"
  | "always_cautious"
  | "option_position_bias"
  | "speed_gaming"
  | "inconsistent_responses"
  | "polished_shallow"
  | "pattern_cycling"
  | "outcome_cycling"
  | "outcome_conditional_safe"
  | "seniority_inconsistent"
  // v10 new patterns
  | "ethics_performative"      // Strong ethics language but weak ethical action under pressure
  | "advisory_generic"         // Generic advisory responses without role/context specificity
  | "resistance_dismissive";   // Dismisses legitimate employee concerns about AI

/**
 * WS2.1: Feature flag — enable outcome-conditional anti-gaming detection.
 */
export const ANTI_GAMING_OUTCOME_CONDITIONAL =
  process.env.ANTI_GAMING_OUTCOME_CONDITIONAL !== "false" && process.env.ANTI_GAMING_OUTCOME_CONDITIONAL !== "0";

/**
 * WS2.2: Role-aware anti-gaming thresholds.
 */
export interface RoleAwareGamingThresholds {
  alwaysSafeAcceptableRate: number;
  alwaysSafeStrongMax: number;
  speedGamingRate: number;
  alwaysEscalateRate: number;
  alwaysCautiousRate: number;
}

const DEFAULT_GAMING_THRESHOLDS: RoleAwareGamingThresholds = {
  alwaysSafeAcceptableRate: 0.75,
  alwaysSafeStrongMax: 0.10,
  speedGamingRate: 0.50,
  alwaysEscalateRate: 0.60,
  alwaysCautiousRate: 0.55,
};

const ROLE_GAMING_THRESHOLDS: Record<string, RoleAwareGamingThresholds> = {
  specialist: { ...DEFAULT_GAMING_THRESHOLDS, alwaysSafeAcceptableRate: 0.70, speedGamingRate: 0.45 },
  leader:     { ...DEFAULT_GAMING_THRESHOLDS, alwaysSafeAcceptableRate: 0.70, alwaysEscalateRate: 0.55 },
  generalist: DEFAULT_GAMING_THRESHOLDS,
  coordinator: DEFAULT_GAMING_THRESHOLDS,
};

export interface InjectionSpec {
  type: "trap" | "clean_case" | "comparable_scenario" | "format_variation";
  targetPattern: GamingPattern;
  targetCapability: string;
  riskLevel: "Low" | "Medium" | "High";
  interactionType: string;
}

/**
 * A2: Per-interaction-type speed thresholds (ms).
 * Updated for v10 15 interaction types.
 */
const SPEED_THRESHOLDS_BY_TYPE: Record<string, number> = {
  // Preserved types
  scenario_critique:        12_000,
  error_detection:          12_000,
  risk_judgement:           10_000,
  confidence_calibration:    8_000,
  contradiction_probe:      10_000,
  // New v10 types
  prompt_diagnosis:         10_000,
  prompt_construction:      15_000,
  process_redesign:         12_000,
  handoff_decision:         10_000,
  capability_diagnosis:     12_000,
  intervention_design:      12_000,
  leader_advisory:          12_000,
  ethical_pressure_test:    10_000,
  stakeholder_impact:       10_000,
  resistance_response:      10_000,
  legitimate_concern:       10_000,
};
const DEFAULT_SPEED_THRESHOLD = 8_000;

/**
 * WS2.3: Extended anti-gaming audit event codes.
 */
export const GAMING_AUDIT_EVENT_CODES: Record<GamingPattern, string> = {
  always_safe_choice:        "GAMING_ALWAYS_SAFE",
  always_escalate:           "GAMING_ALWAYS_ESCALATE",
  always_cautious:           "GAMING_ALWAYS_CAUTIOUS",
  option_position_bias:      "GAMING_POSITION_BIAS",
  speed_gaming:              "GAMING_SPEED",
  inconsistent_responses:    "GAMING_INCONSISTENT",
  polished_shallow:          "GAMING_POLISHED_SHALLOW",
  pattern_cycling:           "GAMING_PATTERN_CYCLE",
  outcome_cycling:           "GAMING_OUTCOME_CYCLE",
  outcome_conditional_safe:  "GAMING_OUTCOME_CONDITIONAL",
  seniority_inconsistent:    "GAMING_SENIORITY_INCONSISTENT",
  // v10 new patterns
  ethics_performative:       "GAMING_ETHICS_PERFORMATIVE",
  advisory_generic:          "GAMING_ADVISORY_GENERIC",
  resistance_dismissive:     "GAMING_RESISTANCE_DISMISSIVE",
};

/**
 * Analyse answer history for gaming patterns.
 * v10: Updated signal references and added 3 new pattern detectors.
 */
export function analyseGamingPatterns(
  answers: Array<{
    selectedValue: string | null;
    optionPosition: number | null;
    timeToAnswerMs: number;
    outcomeClass: string | null;
    confidenceScore: number;
    signalDeltas: Record<string, number>;
    interactionType: string;
    riskLevel?: string;
  }>,
  roleFamily?: string,
  declaredSeniority?: number,
  dbThresholds?: Partial<RoleAwareGamingThresholds>
): GamingAnalysis {
  if (answers.length < 5) {
    return {
      score: 1.0,
      patterns: [],
      scrutinyLevel: "normal",
      injectionRequired: false,
      recommendedInjections: [],
    };
  }

  const patterns: GamingPattern[] = [];
  const injections: InjectionSpec[] = [];

  const baseThresholds = ROLE_GAMING_THRESHOLDS[roleFamily ?? ""] ?? DEFAULT_GAMING_THRESHOLDS;
  const thresholds: RoleAwareGamingThresholds = dbThresholds
    ? { ...baseThresholds, ...dbThresholds }
    : baseThresholds;

  // ── Pattern 1: Always safe choice ────────────────────────────────────────
  const acceptableRate = answers.filter(a => a.outcomeClass === "acceptable").length / answers.length;
  const strongRate = answers.filter(a => a.outcomeClass === "strong").length / answers.length;
  if (acceptableRate > thresholds.alwaysSafeAcceptableRate && strongRate < thresholds.alwaysSafeStrongMax) {
    patterns.push("always_safe_choice");
    injections.push({
      type: "trap",
      targetPattern: "always_safe_choice",
      targetCapability: "ai_output_evaluation",
      riskLevel: "High",
      interactionType: "risk_judgement",
    });
  }

  // ── Pattern 2: Always escalate ────────────────────────────────────────────
  // v10: Uses automation_expansion_risk (was over_caution_risk)
  const escalateSignals = answers.filter(a =>
    (a.signalDeltas.automation_expansion_risk ?? 0) < -0.5 ||
    (a.signalDeltas.human_oversight_preservation ?? 0) > 0.8
  ).length;
  if (escalateSignals / answers.length > thresholds.alwaysEscalateRate) {
    patterns.push("always_escalate");
    injections.push({
      type: "clean_case",
      targetPattern: "always_escalate",
      targetCapability: "ai_interaction",
      riskLevel: "Low",
      interactionType: "prompt_construction",
    });
  }

  // ── Pattern 3: Always cautious (A1) ──────────────────────────────────────
  // v10: Uses automation_expansion_risk + generic_prescription_risk
  const cautiousSignals = answers.filter(a =>
    (a.signalDeltas.automation_expansion_risk ?? 0) < -0.5 ||
    (a.signalDeltas.generic_prescription_risk ?? 0) < -0.5
  ).length;
  if (cautiousSignals / answers.length > thresholds.alwaysCautiousRate && !patterns.includes("always_escalate")) {
    patterns.push("always_cautious");
    injections.push({
      type: "clean_case",
      targetPattern: "always_cautious",
      targetCapability: "ai_interaction",
      riskLevel: "Low",
      interactionType: "prompt_diagnosis",
    });
  }

  // ── Pattern 4: Option position bias ──────────────────────────────────────
  const positionCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const a of answers) {
    if (a.optionPosition !== null) {
      positionCounts[a.optionPosition] = (positionCounts[a.optionPosition] ?? 0) + 1;
    }
  }
  const maxPosition = Math.max(...Object.values(positionCounts));
  if (maxPosition / answers.length > 0.55) {
    patterns.push("option_position_bias");
    injections.push({
      type: "comparable_scenario",
      targetPattern: "option_position_bias",
      targetCapability: "ai_output_evaluation",
      riskLevel: "Medium",
      interactionType: "scenario_critique",
    });
  }

  // ── Pattern 5: Speed gaming (A2) ─────────────────────────────────────────
  const speedGamingCount = answers.filter(a => {
    const threshold = SPEED_THRESHOLDS_BY_TYPE[a.interactionType] ?? DEFAULT_SPEED_THRESHOLD;
    return a.timeToAnswerMs < threshold;
  }).length;
  if (speedGamingCount / answers.length > thresholds.speedGamingRate) {
    patterns.push("speed_gaming");
    injections.push({
      type: "trap",
      targetPattern: "speed_gaming",
      targetCapability: "ai_ethics_trust",
      riskLevel: "High",
      interactionType: "ethical_pressure_test",
    });
  }

  // ── Pattern 6: Inconsistent responses ────────────────────────────────────
  // NOTE: The outcome score range is [0, 1] with values {0, 0.1, 0.3, 0.6, 1.0}.
  // Maximum possible standard deviation is 0.5 (half strong, half critical_failure).
  // Threshold must be < 0.5 to be reachable. 0.38 fires when >30% of answers
  // alternate between strong (1.0) and weak/failure (0.1–0.3).
  const outcomeVariance = computeOutcomeVariance(answers);
  if (outcomeVariance > 0.38) {
    patterns.push("inconsistent_responses");
  }

  // ── Pattern 7: Polished but shallow ──────────────────────────────────────
  // v10: Strong ethics/governance language but weak interaction/output evaluation signals
  const avgEthics = average(answers.map(a => a.signalDeltas.ethics_under_pressure ?? 0));
  const avgInteraction = average(answers.map(a => a.signalDeltas.prompt_construction_quality ?? 0));
  const avgOutputEval = average(answers.map(a => a.signalDeltas.output_evaluation_quality ?? 0));
  if (avgEthics > 1.0 && (avgInteraction < -0.5 || avgOutputEval < -0.5)) {
    patterns.push("polished_shallow");
    injections.push({
      type: "comparable_scenario",
      targetPattern: "polished_shallow",
      targetCapability: "ai_interaction",
      riskLevel: "Medium",
      interactionType: "prompt_construction",
    });
  }

  // ── Pattern 8: Positional pattern cycling ────────────────────────────────
  if (answers.length >= 8) {
    const positions = answers.map(a => a.optionPosition ?? -1).filter(p => p >= 0);
    let cycleCount = 0;
    for (let i = 0; i < positions.length - 4; i++) {
      const window = positions.slice(i, i + 4);
      if (new Set(window).size === 4) cycleCount++;
    }
    if (cycleCount > positions.length * 0.4) {
      patterns.push("pattern_cycling");
    }
  }

  // ── Pattern 9: Outcome-class cycling (A3) ────────────────────────────────
  if (answers.length >= 8) {
    const outcomes = answers.map(a => a.outcomeClass ?? "acceptable");
    const outcomeValues: Record<string, number> = {
      strong: 3, acceptable: 2, weak: 1, failure: 0, critical_failure: -1,
    };
    const vals = outcomes.map(o => outcomeValues[o] ?? 2);
    let semanticCycleCount = 0;
    for (let i = 0; i < vals.length - 5; i++) {
      const firstHalf = vals.slice(i, i + 3);
      const secondHalf = vals.slice(i + 3, i + 6);
      const diff = firstHalf.reduce((s, v, j) => s + Math.abs(v - secondHalf[j]), 0);
      if (diff <= 1) semanticCycleCount++;
    }
    if (semanticCycleCount > (vals.length - 5) * 0.4) {
      patterns.push("outcome_cycling");
    }
  }

  // ── Pattern 10: Outcome-conditional safe (WS2.1) ─────────────────────────
  if (ANTI_GAMING_OUTCOME_CONDITIONAL && answers.length >= 8) {
    const highRiskAnswers = answers.filter(a => a.riskLevel === "High" || a.riskLevel === "Critical");
    const lowRiskAnswers = answers.filter(a => a.riskLevel === "Low");
    if (highRiskAnswers.length >= 3 && lowRiskAnswers.length >= 3) {
      const highRiskSafeRate = highRiskAnswers.filter(a => a.outcomeClass === "acceptable" || a.outcomeClass === "weak").length / highRiskAnswers.length;
      const lowRiskStrongRate = lowRiskAnswers.filter(a => a.outcomeClass === "strong").length / lowRiskAnswers.length;
      if (highRiskSafeRate > 0.70 && lowRiskStrongRate > 0.70) {
        patterns.push("outcome_conditional_safe");
        injections.push({
          type: "trap",
          targetPattern: "outcome_conditional_safe",
          targetCapability: "ai_ethics_trust",
          riskLevel: "High",
          interactionType: "ethical_pressure_test",
        });
      }
    }
  }

  // ── Pattern 11: Seniority-inconsistent (WS2.2) ───────────────────────────
  if (declaredSeniority !== undefined && declaredSeniority >= 3) {
    const weakRate = answers.filter(a => a.outcomeClass === "weak" || a.outcomeClass === "failure").length / answers.length;
    if (weakRate > 0.50) {
      patterns.push("seniority_inconsistent");
    }
  }

  // ── Pattern 12: Ethics performative (v10 NEW) ───────────────────────────
  // Strong ethics language (high stakeholder_impact_awareness, employee_transparency_advocacy)
  // but weak ethical action under pressure (low ethics_under_pressure, high pressure_drift_risk)
  if (answers.length >= 8) {
    const ethicsLanguageAnswers = answers.filter(a =>
      (a.signalDeltas.stakeholder_impact_awareness ?? 0) > 0.5 ||
      (a.signalDeltas.employee_transparency_advocacy ?? 0) > 0.5
    );
    const ethicsActionAnswers = answers.filter(a =>
      (a.signalDeltas.ethics_under_pressure ?? 0) < -0.3 ||
      (a.signalDeltas.pressure_drift_risk ?? 0) < -0.5
    );
    if (ethicsLanguageAnswers.length >= 3 && ethicsActionAnswers.length >= 2) {
      const languageRate = ethicsLanguageAnswers.length / answers.length;
      const actionFailRate = ethicsActionAnswers.length / answers.length;
      if (languageRate > 0.40 && actionFailRate > 0.25) {
        patterns.push("ethics_performative");
        injections.push({
          type: "trap",
          targetPattern: "ethics_performative",
          targetCapability: "ai_ethics_trust",
          riskLevel: "High",
          interactionType: "ethical_pressure_test",
        });
      }
    }
  }

  // ── Pattern 13: Advisory generic (v10 NEW) ──────────────────────────────
  // Generic advisory responses — high leader_advisory_quality but high generic_prescription_risk
  // Suggests user gives textbook answers without role/context specificity
  if (answers.length >= 6) {
    const advisoryAnswers = answers.filter(a =>
      a.interactionType === "leader_advisory" ||
      a.interactionType === "intervention_design" ||
      a.interactionType === "capability_diagnosis"
    );
    if (advisoryAnswers.length >= 3) {
      const genericRate = advisoryAnswers.filter(a =>
        (a.signalDeltas.generic_prescription_risk ?? 0) < -0.3
      ).length / advisoryAnswers.length;
      if (genericRate > 0.50) {
        patterns.push("advisory_generic");
        injections.push({
          type: "comparable_scenario",
          targetPattern: "advisory_generic",
          targetCapability: "workforce_ai_readiness",
          riskLevel: "Medium",
          interactionType: "capability_diagnosis",
        });
      }
    }
  }

  // ── Pattern 14: Resistance dismissive (v10 NEW) ─────────────────────────
  // Consistently dismisses legitimate employee concerns about AI
  // High dismissive_of_concern_risk across resistance/concern items
  if (answers.length >= 6) {
    const resistanceAnswers = answers.filter(a =>
      a.interactionType === "resistance_response" ||
      a.interactionType === "legitimate_concern"
    );
    if (resistanceAnswers.length >= 2) {
      const dismissiveRate = resistanceAnswers.filter(a =>
        (a.signalDeltas.dismissive_of_concern_risk ?? 0) < -0.3 ||
        (a.signalDeltas.legitimate_concern_recognition ?? 0) < -0.3
      ).length / resistanceAnswers.length;
      if (dismissiveRate > 0.60) {
        patterns.push("resistance_dismissive");
        injections.push({
          type: "comparable_scenario",
          targetPattern: "resistance_dismissive",
          targetCapability: "ai_change_leadership",
          riskLevel: "High",
          interactionType: "legitimate_concern",
        });
      }
    }
  }

  // ── Compute anti-gaming score ─────────────────────────────────────────────
  const score = Math.max(0, 1 - patterns.length * 0.12); // Slightly lower penalty per pattern (14 total now)
  const scrutinyLevel: "normal" | "elevated" | "high" =
    patterns.length >= 3 ? "high" : patterns.length >= 1 ? "elevated" : "normal";

  // A4: Raise injection cap to 3 when scrutiny is high
  const maxInjections = scrutinyLevel === "high" ? 3 : 2;

  return {
    score,
    patterns,
    scrutinyLevel,
    injectionRequired: injections.length > 0,
    recommendedInjections: injections.slice(0, maxInjections),
  };
}

function computeOutcomeVariance(answers: Array<{ outcomeClass: string | null }>): number {
  const outcomeValues: Record<string, number> = {
    strong: 1.0, acceptable: 0.6, weak: 0.3, failure: 0.1, critical_failure: 0.0,
  };
  const values = answers.map(a => outcomeValues[a.outcomeClass ?? "acceptable"] ?? 0.6);
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
