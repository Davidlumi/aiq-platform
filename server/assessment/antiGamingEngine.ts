/**
 * AIQ Adaptive Assessment Engine — Anti-Gaming Engine
 *
 * Detects gaming patterns (always safe, always escalate, always cautious,
 * pattern gaming, inconsistent responses, polished but shallow behaviour)
 * and responds by injecting traps, varying formats, and increasing scrutiny.
 *
 * Improvements (Batch A):
 * A1: always_cautious pattern detection implemented
 * A2: Per-interaction-type speed thresholds (replaces flat 4000ms)
 * A3: Semantic outcome-class cycling detection added
 * A4: Max injections raised to 3 when scrutinyLevel="high"
 * A5: Injection spec added for always_cautious pattern
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
  | "option_position_bias" // always picks A, B, etc.
  | "speed_gaming"         // answers too fast
  | "inconsistent_responses"
  | "polished_shallow"     // strong governance language but weak execution
  | "pattern_cycling"      // cycles through A→B→C→D positions
  | "outcome_cycling"      // cycles through outcome classes (strong→acceptable→weak→strong)
  // WS2.1: Outcome-conditional patterns
  | "outcome_conditional_safe"   // always picks safe on high-risk items, strong on low-risk
  | "seniority_inconsistent";    // WS2.2: answers inconsistent with declared seniority

/**
 * WS2.1: Feature flag — enable outcome-conditional anti-gaming detection.
 * Disabled by default until calibration data is available.
 */
// WS2.1: Outcome-conditional detection defaults ON; set ANTI_GAMING_OUTCOME_CONDITIONAL=false to disable
export const ANTI_GAMING_OUTCOME_CONDITIONAL =
  process.env.ANTI_GAMING_OUTCOME_CONDITIONAL !== "false" && process.env.ANTI_GAMING_OUTCOME_CONDITIONAL !== "0";

/**
 * WS2.2: Role-aware anti-gaming thresholds.
 * Keyed by role family (e.g. "specialist", "generalist", "leader").
 * Falls back to DEFAULT_THRESHOLDS if role family not found.
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

// WS2.2: Specialist roles are expected to be more decisive — tighter thresholds
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
 * Mirrors the thresholds in scoringEngine.ts INTERACTION_TYPE_TIMING_MS.
 * Used to detect speed gaming with appropriate sensitivity per type.
 */
const SPEED_THRESHOLDS_BY_TYPE: Record<string, number> = {
  situational_judgement:   8_000,
  scenario_critique:      12_000,
  output_improvement:     12_000,
  error_detection:        12_000,
  prioritisation:          8_000,
  risk_judgement:         10_000,
  data_interpretation:    12_000,
  governance_decision:     8_000,
  multi_step_workflow:    10_000,
  contradiction_probe:    10_000,
  confidence_calibration:  8_000,
};
const DEFAULT_SPEED_THRESHOLD = 8_000;

/**
 * WS2.3: Extended anti-gaming audit event codes.
 * These are appended to the eventCodesJson on the answer record when a pattern is detected.
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
};

/**
 * Analyse answer history for gaming patterns.
 * WS2.2: Accepts optional roleFamily for role-aware thresholds.
 * WS2.2: Accepts optional declaredSeniority for seniority-inconsistency suppression.
 */
export function analyseGamingPatterns(
  answers: Array<{
    selectedValue: string | null;
    optionPosition: number | null; // 0=A, 1=B, 2=C, 3=D
    timeToAnswerMs: number;
    outcomeClass: string | null;
    confidenceScore: number;
    signalDeltas: Record<string, number>;
    interactionType: string;
    riskLevel?: string; // WS2.1: needed for outcome-conditional detection
  }>,
  /** WS2.2: Role family for role-aware thresholds (e.g. "specialist", "generalist") */
  roleFamily?: string,
  /** WS2.2: Declared seniority level (1-4) for seniority-inconsistency suppression */
  declaredSeniority?: number
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

  // WS2.2: Resolve role-aware thresholds
  const thresholds = ROLE_GAMING_THRESHOLDS[roleFamily ?? ""] ?? DEFAULT_GAMING_THRESHOLDS;

  // ── Pattern 1: Always safe choice ────────────────────────────────────────
  // If >75% of outcomes are "acceptable" (never strong, never weak), user is playing safe
  const acceptableRate = answers.filter(a => a.outcomeClass === "acceptable").length / answers.length;
  const strongRate = answers.filter(a => a.outcomeClass === "strong").length / answers.length;
  if (acceptableRate > thresholds.alwaysSafeAcceptableRate && strongRate < thresholds.alwaysSafeStrongMax) {
    patterns.push("always_safe_choice");
    injections.push({
      type: "trap",
      targetPattern: "always_safe_choice",
      targetCapability: "judgement",
      riskLevel: "High",
      interactionType: "risk_judgement",
    });
  }

  // ── Pattern 2: Always escalate ────────────────────────────────────────────
  const escalateSignals = answers.filter(a => (a.signalDeltas.over_caution_risk ?? 0) < -0.5).length;
  if (escalateSignals / answers.length > thresholds.alwaysEscalateRate) {
    patterns.push("always_escalate");
    injections.push({
      type: "clean_case",
      targetPattern: "always_escalate",
      targetCapability: "execution",
      riskLevel: "Low",
      interactionType: "situational_judgement",
    });
  }

  // ── Pattern 3: Always cautious (A1) ──────────────────────────────────────
  // High proportion of answers with over_caution_risk OR avoidance_risk signals
  // Distinct from always_escalate: caution is about avoidance, escalation is about deferral
  const cautiousSignals = answers.filter(a =>
    (a.signalDeltas.over_caution_risk ?? 0) < -0.5 ||
    (a.signalDeltas.avoidance_risk ?? 0) < -0.5
  ).length;
  if (cautiousSignals / answers.length > thresholds.alwaysCautiousRate && !patterns.includes("always_escalate")) {
    patterns.push("always_cautious");
    injections.push({
      type: "clean_case",
      targetPattern: "always_cautious",
      targetCapability: "execution",
      riskLevel: "Low",
      interactionType: "situational_judgement",
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
      targetCapability: "execution",
      riskLevel: "Medium",
      interactionType: "scenario_critique",
    });
  }

  // ── Pattern 5: Speed gaming (A2) ─────────────────────────────────────────
  // Use per-interaction-type thresholds instead of flat 4000ms average.
  // A user is speed gaming if >50% of their answers are below the tooFast threshold for that type.
  const speedGamingCount = answers.filter(a => {
    const threshold = SPEED_THRESHOLDS_BY_TYPE[a.interactionType] ?? DEFAULT_SPEED_THRESHOLD;
    return a.timeToAnswerMs < threshold;
  }).length;
  if (speedGamingCount / answers.length > thresholds.speedGamingRate) {
    patterns.push("speed_gaming");
    injections.push({
      type: "trap",
      targetPattern: "speed_gaming",
      targetCapability: "governance",
      riskLevel: "High",
      interactionType: "governance_decision",
    });
  }

  // ── Pattern 6: Inconsistent responses ────────────────────────────────────
  // High variance in outcome class within same capability
  const outcomeVariance = computeOutcomeVariance(answers);
  if (outcomeVariance > 0.7) {
    patterns.push("inconsistent_responses");
  }

  // ── Pattern 7: Polished but shallow ──────────────────────────────────────
  // Strong governance signals but weak execution signals
  const avgGovernance = average(answers.map(a => a.signalDeltas.governance_quality ?? 0));
  const avgExecution = average(answers.map(a => a.signalDeltas.execution_quality ?? 0));
  if (avgGovernance > 1.0 && avgExecution < -0.5) {
    patterns.push("polished_shallow");
    injections.push({
      type: "comparable_scenario",
      targetPattern: "polished_shallow",
      targetCapability: "execution",
      riskLevel: "Medium",
      interactionType: "output_improvement",
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
  // Detects when the user cycles through outcome classes in a predictable pattern
  // e.g. strong → acceptable → weak → strong → acceptable → weak
  if (answers.length >= 9) {
    const outcomes = answers.map(a => a.outcomeClass ?? "acceptable");
    const outcomeValues: Record<string, number> = {
      strong: 3, acceptable: 2, weak: 1, failure: 0, critical_failure: -1,
    };
    const vals = outcomes.map(o => outcomeValues[o] ?? 2);
    // Detect repeating 3-cycle pattern: look for windows of 6 where first 3 ≈ last 3
    let semanticCycleCount = 0;
    for (let i = 0; i < vals.length - 5; i++) {
      const firstHalf = vals.slice(i, i + 3);
      const secondHalf = vals.slice(i + 3, i + 6);
      const diff = firstHalf.reduce((s, v, j) => s + Math.abs(v - secondHalf[j]), 0);
      if (diff <= 1) semanticCycleCount++; // near-identical 3-cycles
    }
    if (semanticCycleCount > (vals.length - 5) * 0.4) {
      patterns.push("outcome_cycling");
    }
  }

  // ── Pattern 10: Outcome-conditional safe (WS2.1) ─────────────────────────
  // Detects users who pick safe/acceptable on high-risk items but strong on low-risk items
  // This is a sign of strategic gaming: appearing competent on easy items, deferring on hard ones
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
          targetCapability: "governance",
          riskLevel: "High",
          interactionType: "governance_decision",
        });
      }
    }
  }

  // ── Pattern 11: Seniority-inconsistent (WS2.2) ───────────────────────────
  // Suppresses seniority-inconsistent flags for junior users (seniority level 1)
  // who are expected to be more cautious and less decisive
  if (declaredSeniority !== undefined && declaredSeniority >= 3) {
    // Senior users (level 3+) should not be consistently picking weak/failure outcomes
    const weakRate = answers.filter(a => a.outcomeClass === "weak" || a.outcomeClass === "failure").length / answers.length;
    if (weakRate > 0.50) {
      patterns.push("seniority_inconsistent");
    }
  }

  // ── Compute anti-gaming score ─────────────────────────────────────────────
  const score = Math.max(0, 1 - patterns.length * 0.15);
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
