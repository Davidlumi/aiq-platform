/**
 * AIQ Adaptive Assessment Engine — Deterministic Scoring Engine
 *
 * Implements the full signal system, anchor framework, failure mode detection,
 * risk weighting, and capability score computation per the AIQ specification.
 *
 * Improvements (Batch E):
 * E1: Timing map updated to match all 11 current InteractionType enum values
 * E2: Capability score scale factor is dynamic (prevents dilution with many signals)
 * E3 (Completion Pass): blockCount counts per-answer occurrences (item counting), not unique modes
 */

import type { CapabilityKey } from "./roleArchetypes";

// ─── Signal System ────────────────────────────────────────────────────────────

export type SignalKey =
  | "execution_quality"
  | "prioritisation_quality"
  | "validation_accuracy"
  | "judgement_quality"
  | "discrimination_quality"
  | "governance_quality"
  | "appropriateness_boundary"
  | "workflow_application_quality"
  | "data_interpretation_quality"
  | "timing_integrity"
  | "over_reliance_risk"
  | "over_caution_risk"
  | "avoidance_risk"
  | "automation_expansion_risk"
  | "blind_acceptance_risk"
  | "consistency_index"
  | "calibration_index"
  | "contradiction_index"
  | "cosmetic_focus_risk"
  | "unsafe_hr_decision_risk"
  | "governance_bypass_risk"
  | "hallucination_acceptance_risk";

export const SIGNAL_TO_CAPABILITY: Record<SignalKey, CapabilityKey> = {
  execution_quality:            "execution",
  prioritisation_quality:       "execution",
  validation_accuracy:          "execution",
  timing_integrity:             "execution",
  consistency_index:            "execution",
  judgement_quality:            "judgement",
  discrimination_quality:       "judgement",
  over_caution_risk:            "judgement",
  avoidance_risk:               "judgement",
  calibration_index:            "judgement",
  governance_quality:           "governance",
  over_reliance_risk:           "governance",
  blind_acceptance_risk:        "governance",
  contradiction_index:          "governance",
  governance_bypass_risk:       "governance",
  appropriateness_boundary:     "appropriateness",
  automation_expansion_risk:    "appropriateness",
  cosmetic_focus_risk:          "appropriateness",
  unsafe_hr_decision_risk:      "appropriateness",
  workflow_application_quality: "workflow",
  data_interpretation_quality:  "data_interpretation",
  hallucination_acceptance_risk:"governance",
};

export const SIGNAL_DISPLAY: Record<SignalKey, string> = {
  execution_quality:            "Execution Quality",
  prioritisation_quality:       "Prioritisation Quality",
  validation_accuracy:          "Validation Accuracy",
  timing_integrity:             "Timing Integrity",
  consistency_index:            "Consistency",
  judgement_quality:            "Judgement Quality",
  discrimination_quality:       "Discrimination Quality",
  over_caution_risk:            "Over-Caution Risk",
  avoidance_risk:               "Avoidance Risk",
  calibration_index:            "Confidence Calibration",
  governance_quality:           "Governance Quality",
  over_reliance_risk:           "Over-Reliance Risk",
  blind_acceptance_risk:        "Blind Acceptance Risk",
  contradiction_index:          "Contradiction Index",
  governance_bypass_risk:       "Governance Bypass Risk",
  appropriateness_boundary:     "Appropriateness Boundary",
  automation_expansion_risk:    "Automation Expansion Risk",
  cosmetic_focus_risk:          "Cosmetic Focus Risk",
  unsafe_hr_decision_risk:      "Unsafe HR Decision Risk",
  workflow_application_quality: "Workflow Application Quality",
  data_interpretation_quality:  "Data Interpretation Quality",
  hallucination_acceptance_risk:"Hallucination Acceptance Risk",
};

export const RISK_SIGNALS: ReadonlyArray<SignalKey> = [
  "over_reliance_risk",
  "over_caution_risk",
  "avoidance_risk",
  "automation_expansion_risk",
  "blind_acceptance_risk",
  "contradiction_index",
  "cosmetic_focus_risk",
  "unsafe_hr_decision_risk",
  "governance_bypass_risk",
  "hallucination_acceptance_risk",
];

// ─── Risk & Difficulty Multipliers ───────────────────────────────────────────

export const RISK_MULTIPLIERS: Record<string, { positive: number; negative: number }> = {
  Low:      { positive: 0.80, negative: 0.80 },
  Medium:   { positive: 1.00, negative: 1.15 },
  High:     { positive: 1.05, negative: 1.35 },
  // C1.6: Critical tier — highest positive reward, significantly higher negative penalty
  Critical: { positive: 1.15, negative: 1.55 },
};

export const DIFFICULTY_WEIGHTS: Record<number, number> = {
  1: 0.80,
  2: 1.00,
  3: 1.20,
  // C1.6: Level 4 — advanced items with elevated weight
  4: 1.35,
};

// ─── Outcome Classes ─────────────────────────────────────────────────────────

export type OutcomeClass =
  | "strong"
  | "acceptable"
  | "weak"
  | "failure"
  | "critical_failure";

/**
 * C1.1: Outcome class modifiers carry the sign of the contribution.
 * Stored signal deltas in item options MUST be unsigned magnitudes (0.0–3.0).
 * The sign is determined entirely by this modifier:
 *   positive modifier → delta contributes positively to the capability score
 *   negative modifier → delta contributes negatively to the capability score
 *
 * This prevents the double-sign problem: a failure option storing a negative
 * delta would be multiplied by a negative modifier, producing an incorrect
 * positive contribution to the capability score.
 */
export const OUTCOME_SCORE_MODIFIER: Record<OutcomeClass, number> = {
  strong:           1.0,   // Full positive contribution
  acceptable:       0.6,   // Partial positive contribution
  weak:            -0.3,   // Small negative contribution
  failure:         -0.7,   // Significant negative contribution
  critical_failure: -1.5,  // Large negative contribution (can exceed base delta)
};

// ─── Failure Mode Detection ───────────────────────────────────────────────────

export interface FailureModeResult {
  detected: boolean;
  modes: string[];
  governanceFlag: boolean;
  classificationImpact: "none" | "downgrade" | "block";
}

/**
 * C1.8: Failure mode detection.
 *
 * IMPORTANT — threshold units: all numeric thresholds (e.g. < -1.5) are
 * per-answer weighted signal deltas, NOT session-level sums. Each answer's
 * signalDeltas are the raw (unsigned magnitude) values from the item option,
 * already multiplied by the outcome modifier, risk multiplier, and difficulty
 * weight before being passed here. A threshold of -1.5 therefore means:
 * "this single answer's weighted contribution to this signal was -1.5 or worse".
 */
export function detectFailureModes(
  answers: Array<{ outcomeClass: string | null; signalDeltas: Record<string, number>; eventCodes: string[] }>,
  /** WS1.2: Configurable thresholds from scoring_config. Defaults: blocking=2, downgrade=1, base=1.5, margin=1.5 */
  opts?: { blockingFailureMinItems?: number; downgradeFailureMinItems?: number; baseFailureThresholdMagnitude?: number; catastrophicMarginMultiplier?: number }
): FailureModeResult {
  const modes: string[] = [];
  let governanceFlag = false;
  let blockCount = 0;
  // E3 hybrid: track per-answer blocking deltas for the catastrophic-single-item margin check.
  // Key = blocking mode name, value = array of per-answer delta magnitudes that triggered it.
  const blockingDeltas: Record<string, number[]> = {};

  for (const a of answers) {
    const deltas = a.signalDeltas;
    const codes = a.eventCodes;

    // WS1.2 Item 1: use configurable base threshold (default 1.5 preserves existing behaviour)
    const baseThr = opts?.baseFailureThresholdMagnitude ?? 1.5;
    // Blind AI acceptance (per-answer threshold: weighted delta < -baseThr)
    if ((deltas.blind_acceptance_risk ?? 0) < -baseThr || codes.includes("BLIND_ACCEPT")) {
      modes.push("blind_ai_acceptance");
      governanceFlag = true;
      blockCount++;
      (blockingDeltas["blind_ai_acceptance"] ??= []).push(Math.abs(deltas.blind_acceptance_risk ?? baseThr));
    }
    // Hallucination acceptance
    if ((deltas.hallucination_acceptance_risk ?? 0) < -baseThr || codes.includes("HALLUCINATION_ACCEPT")) {
      modes.push("hallucination_acceptance");
      governanceFlag = true;
      blockCount++;
      (blockingDeltas["hallucination_acceptance"] ??= []).push(Math.abs(deltas.hallucination_acceptance_risk ?? baseThr));
    }
    // Unsafe HR decisioning
    if ((deltas.unsafe_hr_decision_risk ?? 0) < -baseThr || codes.includes("UNSAFE_HR_DECISION")) {
      modes.push("unsafe_hr_decisioning");
      governanceFlag = true;
      blockCount++;
      (blockingDeltas["unsafe_hr_decisioning"] ??= []).push(Math.abs(deltas.unsafe_hr_decision_risk ?? baseThr));
    }
    // Governance bypass
    if ((deltas.governance_bypass_risk ?? 0) < -baseThr || codes.includes("GOVERNANCE_BYPASS")) {
      modes.push("governance_bypass");
      governanceFlag = true;
      blockCount++;
      (blockingDeltas["governance_bypass"] ??= []).push(Math.abs(deltas.governance_bypass_risk ?? baseThr));
    }
    // Critical failure outcome
    if (a.outcomeClass === "critical_failure") {
      modes.push("critical_failure_response");
      governanceFlag = true;
      blockCount++;
      (blockingDeltas["critical_failure_response"] ??= []).push(baseThr); // no delta magnitude for outcome-class triggers
    }
    // Poor validation
    if ((deltas.validation_accuracy ?? 0) < -2.0) {
      modes.push("poor_validation");
    }
    // Over-reliance pattern
    if ((deltas.over_reliance_risk ?? 0) < -1.0) {
      modes.push("over_reliance");
    }
    // Inappropriate AI usage
    if ((deltas.appropriateness_boundary ?? 0) < -1.5 || codes.includes("INAPPROPRIATE_AI")) {
      modes.push("inappropriate_ai_usage");
      governanceFlag = true;
    }
    // Weak judgement masked as best practice
    if (a.outcomeClass === "weak" && (deltas.judgement_quality ?? 0) < -0.5 && (deltas.governance_quality ?? 0) > 0.5) {
      modes.push("weak_judgement_masked");
    }
  }

  const uniqueModes = modes.filter((v, i, a) => a.indexOf(v) === i);
  const allModeCount = modes.length;

  // E3 Hybrid Resolution (v2.2 + E3 concern):
  // A block requires BOTH:
  //   (a) blockCount >= blockingMin (item-counting gate, per v2.2 spec), AND
  //   (b) at least one of:
  //       (b1) the blocking items span >= 2 distinct blocking mode types, OR
  //       (b2) at least one blocking item has a delta magnitude >= 1.5x the base threshold (2.25)
  //            — this catches catastrophic single-category failures.
  // This prevents a single mild-repeated pattern from blocking (E3's concern) while
  // still blocking genuinely severe or multi-domain failures (v2.2 spec's concern).
  // WS1.2 Item 1: use configurable constants from opts; defaults preserve existing behaviour
  const BASE_THRESHOLD_MAGNITUDE = opts?.baseFailureThresholdMagnitude ?? 1.5;
  const CATASTROPHIC_MARGIN = opts?.catastrophicMarginMultiplier ?? 1.5; // multiplier: base × margin = catastrophic threshold
  const blockingMin = opts?.blockingFailureMinItems ?? 2;
  const downgradeMin = opts?.downgradeFailureMinItems ?? 1;

  const distinctBlockingModeCount = Object.keys(blockingDeltas).length;
  const hasCatastrophicItem = Object.values(blockingDeltas).some(deltas =>
    deltas.some(d => d >= BASE_THRESHOLD_MAGNITUDE * CATASTROPHIC_MARGIN)
  );
  const itemGatePassed = blockCount >= blockingMin;
  const qualityGatePassed = distinctBlockingModeCount >= 2 || hasCatastrophicItem;

  const classificationImpact: "none" | "downgrade" | "block" =
    (itemGatePassed && qualityGatePassed) ? "block" :
    allModeCount >= downgradeMin ? "downgrade" : "none";

  return {
    detected: uniqueModes.length > 0,
    modes: uniqueModes,
    governanceFlag,
    classificationImpact,
  };
}

// ─── Signal Score Computation ─────────────────────────────────────────────────

/**
 * R7: Per-interaction-type timing thresholds (milliseconds).
 * Different interaction types have different expected completion times.
 * scenario_critique and risk_judgement require more reading time than quick_fire.
 */
// E1: Timing map aligned to all 11 current InteractionType enum values.
// Old stale keys (ethical_dilemma, priority_ranking, output_evaluation, tool_selection,
// quick_fire, governance_check) removed; all 11 canonical types added.
const INTERACTION_TYPE_TIMING_MS: Record<string, { fast: number; slow: number; tooFast: number }> = {
  situational_judgement:   { fast: 30_000, slow: 120_000, tooFast:  8_000 },
  scenario_critique:       { fast: 45_000, slow: 150_000, tooFast: 12_000 },
  output_improvement:      { fast: 45_000, slow: 150_000, tooFast: 12_000 },
  error_detection:         { fast: 40_000, slow: 150_000, tooFast: 12_000 },
  prioritisation:          { fast: 35_000, slow: 120_000, tooFast:  8_000 },
  risk_judgement:          { fast: 40_000, slow: 140_000, tooFast: 10_000 },
  data_interpretation:     { fast: 40_000, slow: 150_000, tooFast: 12_000 },
  governance_decision:     { fast: 30_000, slow: 120_000, tooFast:  8_000 },
  multi_step_workflow:     { fast: 35_000, slow: 130_000, tooFast: 10_000 },
  contradiction_probe:     { fast: 35_000, slow: 130_000, tooFast: 10_000 },
  confidence_calibration:  { fast: 25_000, slow: 100_000, tooFast:  8_000 },
};
const DEFAULT_TIMING_MS = { fast: 30_000, slow: 120_000, tooFast: 8_000 };

export function computeSignalScores(
  answers: Array<{
    signalDeltasJson: unknown;
    outcomeClass: string | null;
    riskLevel: string;
    difficulty: number;
    /** Optional: 0.0–1.0 confidence score from confidence slider */
    confidenceScore?: number;
    /** Optional: milliseconds taken to answer */
    timeToAnswerMs?: number;
    /** R7: Optional interaction type for per-type timing thresholds */
    interactionType?: string;
  }>
): Record<SignalKey, number> {
  const acc: Record<string, number> = {};

  for (const answer of answers) {
    let deltas: Record<string, number> = {};
    try {
      deltas = typeof answer.signalDeltasJson === "string"
        ? JSON.parse(answer.signalDeltasJson)
        : (answer.signalDeltasJson as Record<string, number>) ?? {};
    } catch { continue; }

    // C1.6: Explicit warnings for unknown risk/difficulty values
    if (!(answer.riskLevel in RISK_MULTIPLIERS)) {
      console.warn(`[scoringEngine] Unknown riskLevel "${answer.riskLevel}" — falling back to Medium`);
    }
    if (!(answer.difficulty in DIFFICULTY_WEIGHTS)) {
      console.warn(`[scoringEngine] Unknown difficulty "${answer.difficulty}" — falling back to 1.0`);
    }
    const riskMult = RISK_MULTIPLIERS[answer.riskLevel] ?? RISK_MULTIPLIERS.Medium;
    const diffWeight = DIFFICULTY_WEIGHTS[answer.difficulty] ?? 1.0;

    // C1.1: Outcome class modifier carries the sign.
    // Stored deltas are treated as unsigned magnitudes (Math.abs applied).
    // The modifier determines whether the contribution is positive or negative.
    const outcomeMod = OUTCOME_SCORE_MODIFIER[(answer.outcomeClass as OutcomeClass) ?? "acceptable"] ?? 0.6;

    for (const [signal, baseDelta] of Object.entries(deltas)) {
      // Use absolute value of stored delta — sign comes entirely from outcomeMod
      const magnitude = Math.abs(baseDelta);
      // Risk multiplier direction follows the outcome modifier sign
      const multiplier = outcomeMod >= 0 ? riskMult.positive : riskMult.negative;
      const weightedDelta = magnitude * multiplier * diffWeight * outcomeMod;
      acc[signal] = (acc[signal] ?? 0) + weightedDelta;
    }

    // ── T1-1: Confidence Calibration Signal ──────────────────────────────────
    // Adds calibration_index delta based on confidence-correctness alignment.
    // High confidence + strong outcome = well-calibrated (positive signal)
    // High confidence + failure outcome = overconfident (negative signal)
    const conf = answer.confidenceScore ?? 0.5;
    const outcome = answer.outcomeClass ?? "acceptable";
    let calibrationDelta = 0;
    if (conf > 0.7 && outcome === "strong") {
      calibrationDelta = 1.0;  // Confident and correct — well calibrated
    } else if (conf > 0.7 && (outcome === "failure" || outcome === "critical_failure")) {
      calibrationDelta = -1.5; // Confident and wrong — overconfident failure
    } else if (conf > 0.7 && outcome === "weak") {
      calibrationDelta = -0.5; // Confident but weak — mild overconfidence
    } else if (conf < 0.3 && outcome === "strong") {
      calibrationDelta = 0.5;  // Humble but correct — under-confident
    } else if (conf < 0.3 && (outcome === "failure" || outcome === "critical_failure")) {
      calibrationDelta = -0.3; // Low confidence and wrong — at least self-aware
    }
    if (calibrationDelta !== 0) {
      const calibMult = calibrationDelta >= 0 ? riskMult.positive : riskMult.negative;
      acc["calibration_index"] = (acc["calibration_index"] ?? 0) + calibrationDelta * calibMult * diffWeight;
    }

    // ── T1-4 + R7: Time-to-Answer Scoring with per-interaction-type thresholds ──
    // Fast correct answers indicate fluency; very slow answers may indicate
    // uncertainty or gaming. Applied to timing_integrity signal.
    const timeMs = answer.timeToAnswerMs;
    if (timeMs !== undefined && timeMs > 0) {
      // R7: Use per-type thresholds if interactionType is provided
      const timingThresholds = (answer.interactionType && INTERACTION_TYPE_TIMING_MS[answer.interactionType])
        ? INTERACTION_TYPE_TIMING_MS[answer.interactionType]
        : DEFAULT_TIMING_MS;
      let timingDelta = 0;
      if (outcome === "strong" && timeMs < timingThresholds.fast) {
        timingDelta = 0.5;   // Fast and correct — demonstrates fluency
      } else if (outcome === "strong" && timeMs > timingThresholds.slow) {
        timingDelta = -0.2;  // Very slow even when correct — slight uncertainty
      } else if ((outcome === "failure" || outcome === "critical_failure") && timeMs < timingThresholds.tooFast) {
        timingDelta = -0.5;  // Extremely fast failure — not reading carefully
      } else if (timeMs > timingThresholds.slow * 1.5) {
        timingDelta = -0.3;  // Excessively long — minor penalty
      }
      if (timingDelta !== 0) {
        const timeMult = timingDelta >= 0 ? riskMult.positive : riskMult.negative;
        acc["timing_integrity"] = (acc["timing_integrity"] ?? 0) + timingDelta * timeMult * diffWeight;
      }
    }
  }

  return acc as Record<SignalKey, number>;
}

// ─── Capability Score Computation ─────────────────────────────────────────────

export interface CapabilityScore {
  score: number;
  displayName: string;
  colour: string;
  band: "strong" | "developing" | "needs_work" | "critical";
  signalCount: number;
  signalSum: number;
}

export const CAPABILITY_DISPLAY: Record<CapabilityKey, string> = {
  execution:          "AI Execution",
  judgement:          "AI Judgement",
  governance:         "AI Risk & Governance",
  appropriateness:    "AI Appropriateness",
  workflow:           "AI Workflow Application",
  data_interpretation:"AI Data & Insight",
};

export const CAPABILITY_COLOURS: Record<CapabilityKey, string> = {
  execution:          "#4477AA",
  judgement:          "#AA3377",
  governance:         "#228833",
  appropriateness:    "#EE6677",
  workflow:           "#CCBB44",
  data_interpretation:"#66CCEE",
};

/**
 * C1.3: Score bands aligned with readiness classification thresholds.
 * strong    ≥ 75  (matches "safe" readiness threshold)
 * developing 45–74 (matches "at_risk" zone)
 * needs_work 20–44 (lower at_risk zone)
 * critical   < 20  (well below unsafe threshold)
 */
function scoreBand(score: number): "strong" | "developing" | "needs_work" | "critical" {
  if (score >= 75) return "strong";
  if (score >= 45) return "developing";
  if (score >= 20) return "needs_work";
  return "critical";
}

/**
 * WS1.1: v2.2 sum+clip formula replaces the v2.1 mean-based formula.
 * Formula: score = intercept + clip(Σ weighted_deltas, -cap, +cap) × contributionMultiplier
 * This fixes the monotonicity bug in v2.1 where adding a positive-delta answer could
 * lower the score by reducing the average.
 *
 * Defaults: intercept=50, contributionCap=8.0, contributionMultiplier=6.25
 * (v2.1 legacy params intercept/multiplier accepted but ignored in v2.2 path)
 */
export function computeCapabilityScores(
  signalScores: Record<string, number>,
  scoringCfg?: { intercept: number; multiplier: number; contributionCap?: number; contributionMultiplier?: number }
): Record<CapabilityKey, CapabilityScore> {
  const intercept = scoringCfg?.intercept ?? 50;
  // WS1.1: v2.2 sum+clip parameters (fall back to v2.1 behaviour if not provided)
  const contributionCap = scoringCfg?.contributionCap;
  const contributionMultiplier = scoringCfg?.contributionMultiplier;
  const useV22Formula = contributionCap !== undefined && contributionMultiplier !== undefined;

  const capAccum: Record<string, { sum: number; count: number }> = {};

  for (const signalEntry of Object.entries(signalScores)) {
    const signal = signalEntry[0];
    const delta = signalEntry[1];
    const cap = SIGNAL_TO_CAPABILITY[signal as SignalKey] ?? "execution";
    if (!capAccum[cap]) capAccum[cap] = { sum: 0, count: 0 };
    capAccum[cap].sum += delta;
    capAccum[cap].count += 1;
  }

  const ALL_CAPS: CapabilityKey[] = ["execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation"];
  for (const cap of ALL_CAPS) {
    if (!capAccum[cap]) capAccum[cap] = { sum: 0, count: 0 };
  }

  const result = {} as Record<CapabilityKey, CapabilityScore>;
  for (const cap of ALL_CAPS) {
    const { sum, count } = capAccum[cap];
    let score: number;
    if (useV22Formula) {
      // WS1.1 v2.2: sum+clip formula — monotonicity preserved
      const clipped = Math.max(-contributionCap!, Math.min(contributionCap!, sum));
      score = Math.max(0, Math.min(100, Math.round(intercept + clipped * contributionMultiplier!)));
    } else {
      // v2.1 legacy mean-based formula (preserved for in-flight sessions pinned to v2.1 config)
      const multiplier = scoringCfg?.multiplier ?? 50;
      const avgDelta = count > 0 ? sum / count : 0;
      const baseScale = multiplier / 4;
      const scaleFactor = count <= 3 ? baseScale : Math.max(baseScale * 0.4, baseScale / Math.sqrt(count / 3));
      score = Math.max(0, Math.min(100, Math.round(intercept + avgDelta * scaleFactor)));
    }
    result[cap as CapabilityKey] = {
      score,
      displayName: CAPABILITY_DISPLAY[cap as CapabilityKey],
      colour: CAPABILITY_COLOURS[cap as CapabilityKey],
      band: scoreBand(score),
      signalCount: count,
      signalSum: sum,
    };
  }
  return result;
}

/**
 * R10: Capability-weighted overall score.
 * Uses role archetype's capabilityWeights if provided; falls back to equal weighting.
 */
export function computeOverallScore(
  capabilityScores: Record<CapabilityKey, CapabilityScore>,
  capabilityWeights?: Record<CapabilityKey, number>
): number {
  const ALL_CAPS: CapabilityKey[] = ["execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation"];
  if (!capabilityWeights) {
    // Equal weighting fallback
    const scores = ALL_CAPS.map(cap => capabilityScores[cap]?.score ?? 50);
    return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  }
  // Weighted sum — weights should sum to 1.0
  let weightedSum = 0;
  let totalWeight = 0;
  for (const cap of ALL_CAPS) {
    const w = capabilityWeights[cap] ?? (1 / ALL_CAPS.length);
    weightedSum += (capabilityScores[cap]?.score ?? 50) * w;
    totalWeight += w;
  }
  return Math.round(totalWeight > 0 ? weightedSum / totalWeight : 50);
}

// ─── Readiness Classification ─────────────────────────────────────────────────

/**
 * S2: Extended readiness state.
 * unknown_insufficient_evidence is returned when composite confidence < 0.50,
 * regardless of the raw classification signal. It is distinct from "unknown"
 * (which is returned when evidence count is below minimum).
 */
export type ReadinessState = "safe" | "at_risk" | "unsafe" | "unknown" | "unknown_insufficient_evidence";

export interface ReadinessClassification {
  state: ReadinessState;
  label: string;
  description: string;
  colour: string;
  governanceAction: string | null;
  /** S3: The single capability that drove the classification (weakest for safe, governing for others) */
  governingConstraint?: {
    capability: string;
    score: number;
    band: string;
    thresholdRequired: number;
    gap: number;
    droveClassification: boolean;
  };
  /** S2: Diagnostic payload when confidence is insufficient */
  confidenceDiagnostic?: {
    weakestFactors: string[];
    suggestedActions: string[];
  };
  /**
   * Addition B: True when compositeConfidence is in the provisional band [0.40, 0.50).
   * The result is shown but flagged as provisional — the participant should be
   * encouraged to complete a follow-up assessment for a confirmed classification.
   */
  isProvisional?: boolean;
}

/**
 * R3: Role-specific readiness classification.
 * Uses role archetype's minimumSafeThresholds to detect capability-specific failures,
 * in addition to the global score-based gates.
 */
/** S2: Confidence floor — below this the result is unknown_insufficient_evidence */
export const CONFIDENCE_FLOOR = 0.50;
/**
 * Addition B: Provisional threshold — at or above this but below CONFIDENCE_FLOOR,
 * the result is shown with an isProvisional flag. This is the 0.40 floor referenced
 * in the v2.2 architecture spec Section 9.2.
 */
export const PROVISIONAL_CONFIDENCE_THRESHOLD = 0.40;

export function classifyReadiness(
  overallScore: number,
  riskBand: "low" | "medium" | "high",
  failureModes: FailureModeResult,
  evidenceSufficient: boolean,
  /** R3: Per-capability scores to check against role-specific minimum safe thresholds */
  capabilityScores?: Record<CapabilityKey, CapabilityScore>,
  /** R3: Role archetype minimum safe thresholds */
  minimumSafeThresholds?: Record<CapabilityKey, number>,
  /** S2: Composite confidence score — if < CONFIDENCE_FLOOR, returns unknown_insufficient_evidence */
  compositeConfidence?: number,
  /** S10: Organisation-override thresholds (per capability) */
  orgThresholdOverrides?: Partial<Record<CapabilityKey, number>>,
  /** WS1.2 Item 1: configurable provisional threshold (default: PROVISIONAL_CONFIDENCE_THRESHOLD = 0.40) */
  provisionalThreshold?: number,
  /** WS1.2 Item 1: configurable confidence floor (default: CONFIDENCE_FLOOR = 0.50) */
  confidenceFloorOverride?: number
): ReadinessClassification {
  if (!evidenceSufficient) {
    return {
      state: "unknown",
      label: "Insufficient Evidence",
      description: "Not enough evidence has been collected to make a reliable readiness classification.",
      colour: "#94A3B8",
      governanceAction: null,
    };
  }

  // S2 + Addition B: Confidence floor check — before the precedence hierarchy.
  // Values below PROVISIONAL_CONFIDENCE_THRESHOLD (0.40) return unknown_insufficient_evidence.
  // Values in [0.40, 0.50) fall through to normal classification with isProvisional=true.
  // WS1.2 Item 1: use configurable thresholds; fall back to module constants
  const provThreshold = provisionalThreshold ?? PROVISIONAL_CONFIDENCE_THRESHOLD;
  const confFloor = confidenceFloorOverride ?? CONFIDENCE_FLOOR;
  if (compositeConfidence !== undefined && compositeConfidence < provThreshold) {
    // Identify the two weakest confidence factors to guide the participant
    const factorScores: Array<{ name: string; score: number }> = [
      { name: "evidence depth", score: compositeConfidence * 1.2 }, // proxy
      { name: "interaction diversity", score: compositeConfidence * 0.9 },
      { name: "consistency", score: compositeConfidence * 1.1 },
    ];
    const weakestFactors = factorScores
      .sort((a, b) => a.score - b.score)
      .slice(0, 2)
      .map(f => f.name);
    return {
      state: "unknown_insufficient_evidence",
      label: "Result Unavailable",
      description: "The assessment could not produce a reliable classification because the confidence level was too low. This may be due to inconsistent responses, limited interaction variety, or insufficient evidence depth.",
      colour: "#94A3B8",
      governanceAction: null,
      confidenceDiagnostic: {
        weakestFactors,
        suggestedActions: [
          "Complete the full assessment without rushing",
          "Ensure you attempt all interaction types including scenario critique and risk judgement",
          "Review and reconsider any answers where you were guessing",
        ],
      },
    };
  }

  // Addition B: Compute provisional flag — shown when confidence is in [provThreshold, confFloor)
  // Item 2 Option A: narrow semantics — only fires in the provisional band, not on gate-downgrade.
  // The result is surfaced but flagged as provisional; participant encouraged to repeat.
  const isProvisional = compositeConfidence !== undefined
    && compositeConfidence >= provThreshold
    && compositeConfidence < confFloor;

  // R3 + S10: Check role-specific minimum safe thresholds (org overrides take precedence)
  const thresholdFailures: CapabilityKey[] = [];
  const criticalThresholdFailures: CapabilityKey[] = [];
  const ALL_CAPS: CapabilityKey[] = ["execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation"];
  if (capabilityScores && minimumSafeThresholds) {
    for (const cap of ALL_CAPS) {
      const score = capabilityScores[cap]?.score ?? 50;
      // S10: org override must be >= archetype default; use the higher of the two
      const archetypeThreshold = minimumSafeThresholds[cap] ?? 60;
      const orgOverride = orgThresholdOverrides?.[cap];
      const threshold = orgOverride !== undefined ? Math.max(archetypeThreshold, orgOverride) : archetypeThreshold;
      if (score < threshold - 15) criticalThresholdFailures.push(cap);
      else if (score < threshold) thresholdFailures.push(cap);
    }
  }

  // S3: Compute governing constraint (weakest domain for safe, governing domain for others)
  const computeGoverningConstraint = (state: string) => {
    if (!capabilityScores || !minimumSafeThresholds) return undefined;
    const sorted = ALL_CAPS
      .map(cap => ({
        capability: cap,
        score: capabilityScores[cap]?.score ?? 50,
        band: capabilityScores[cap]?.band ?? "needs_work",
        thresholdRequired: (() => {
          const archetypeT = minimumSafeThresholds[cap] ?? 60;
          const orgT = orgThresholdOverrides?.[cap];
          return orgT !== undefined ? Math.max(archetypeT, orgT) : archetypeT;
        })(),
      }))
      .map(c => ({ ...c, gap: c.thresholdRequired - c.score }))
      .sort((a, b) => b.gap - a.gap); // highest gap first
    const governing = state === "safe" ? sorted[sorted.length - 1] : sorted[0]; // weakest for safe
    if (!governing) return undefined;
    return {
      capability: governing.capability,
      score: governing.score,
      band: governing.band,
      thresholdRequired: governing.thresholdRequired,
      gap: governing.gap,
      droveClassification: state !== "safe" && governing.gap > 0,
    };
  };

  if (failureModes.classificationImpact === "block" || (riskBand === "high" && overallScore < 45) || criticalThresholdFailures.length >= 2) {
    const roleNote = criticalThresholdFailures.length >= 2
      ? ` Critical gaps detected in ${criticalThresholdFailures.slice(0, 2).map(c => c.replace(/_/g, " ")).join(" and ")} relative to your role profile.`
      : "";
    // S6: Softened language — no "Unsafe to Deploy", no "governance_hold"
    return {
      state: "unsafe",
      label: "Not Yet Ready",
      description: `Significant AI capability gaps identified. Structured development and supervised AI use is recommended before independent deployment.${roleNote}`,
      colour: "#EF4444",
      governanceAction: "development_required",
      governingConstraint: computeGoverningConstraint("unsafe"),
      isProvisional,
    };
  }

  if (failureModes.classificationImpact === "downgrade" || riskBand === "high" || overallScore < 45 || criticalThresholdFailures.length >= 1 || thresholdFailures.length >= 2) {
    const roleNote = (criticalThresholdFailures.length + thresholdFailures.length) > 0
      ? ` Your role profile indicates further development is needed in ${[...criticalThresholdFailures, ...thresholdFailures].slice(0, 2).map(c => c.replace(/_/g, " ")).join(" and ")}.`
      : "";
    // S6: Softened language — no "mandatory remediation", no "restricted_use"
    return {
      state: "at_risk",
      label: "Developing",
      description: `Emerging AI capability identified with areas for development. Supervised use with structured learning recommended.${roleNote}`,
      colour: "#F59E0B",
      governanceAction: "supervised_use_recommended",
      governingConstraint: computeGoverningConstraint("at_risk"),
      isProvisional,
    };
  }

  if (overallScore >= 75 && thresholdFailures.length === 0 && (riskBand === "low" || riskBand === "medium")) {
    return {
      state: "safe",
      label: "AI-Ready",
      description: "Strong, credible AI capability demonstrated across assessed domains, meeting your role-specific thresholds.",
      colour: "#10B981",
      governanceAction: null,
      governingConstraint: computeGoverningConstraint("safe"),
      isProvisional,
    };
  }

  return {
    state: "at_risk",
    label: "Developing",
    description: "Capability is developing but not yet at the level required for independent AI use. Structured learning and supervised practice is recommended.",
    colour: "#F59E0B",
    governanceAction: "supervised_use_recommended",
    governingConstraint: computeGoverningConstraint("at_risk"),
    isProvisional,
  };
}

// ─── Confidence / Reliability Engine ─────────────────────────────────────────

export interface ConfidenceProfile {
  overall: number; // 0–1
  band: "high" | "medium" | "low";
  evidenceDepth: number;
  evidenceBreadth: number;
  interactionDiversity: number;
  riskExposure: number;
  consistencyScore: number;
  contradictionPenalty: number;
  antiGamingConfidence: number;
  rationale: string;
}

export function computeConfidenceProfile(
  totalAnswers: number,
  capabilityScores: Record<CapabilityKey, CapabilityScore>,
  interactionTypesUsed: Set<string>,
  highRiskAnswers: number,
  contradictionCount: number,
  consistencyScore: number,
  antiGamingScore: number,
  /** R2: Target item count for evidence depth normalisation. Defaults to 49 (MINIMUM_EVIDENCE.targetItems). */
  targetItems: number = 49,
  /** S4: Proportion of required-reasoning items that received adequate reasoning (>=40 chars). 0–1. */
  reasoningCompleteness: number = 1.0
): ConfidenceProfile {
  // Evidence depth: how many answers vs target item count (R2: was hard-coded to 50)
  const evidenceDepth = Math.min(1, totalAnswers / targetItems);

  // Evidence breadth: how many capabilities have at least 3 signal contributions
  const capabilitiesCovered = Object.values(capabilityScores).filter(c => c.signalCount >= 3).length;
  const evidenceBreadth = capabilitiesCovered / 6;

  // Interaction diversity: how many distinct interaction types used
  const interactionDiversity = Math.min(1, interactionTypesUsed.size / 7);

  // Risk exposure: proportion of high-risk answers
  const riskExposure = Math.min(1, highRiskAnswers / Math.max(1, totalAnswers * 0.3));

  // Contradiction penalty
  const contradictionPenalty = Math.max(0, 1 - (contradictionCount * 0.15));

  // Anti-gaming confidence
  const antiGamingConfidence = Math.max(0, antiGamingScore);

  // S4: Reasoning completeness factor (weight 0.05; evidence_depth reduced 0.25 -> 0.20)
  const reasoningCompletenessScore = Math.max(0, Math.min(1, reasoningCompleteness));

  // Overall confidence
  const overall = Math.min(1, (
    evidenceDepth * 0.20 +       // S4: reduced from 0.25 to accommodate reasoning_completeness
    evidenceBreadth * 0.20 +
    interactionDiversity * 0.15 +
    riskExposure * 0.15 +
    consistencyScore * 0.10 +
    contradictionPenalty * 0.10 +
    antiGamingConfidence * 0.05 +
    reasoningCompletenessScore * 0.05  // S4: new factor
  ));

  const band: "high" | "medium" | "low" =
    overall >= 0.75 ? "high" : overall >= 0.50 ? "medium" : "low";

  const rationale = [
    `Evidence depth: ${Math.round(evidenceDepth * 100)}%`,
    `Capability coverage: ${capabilitiesCovered}/6 domains`,
    `Interaction diversity: ${interactionTypesUsed.size} types`,
    contradictionCount > 0 ? `${contradictionCount} contradiction(s) detected` : null,
  ].filter(Boolean).join(". ");

  return {
    overall: Math.round(overall * 100) / 100,
    band,
    evidenceDepth,
    evidenceBreadth,
    interactionDiversity,
    riskExposure,
    consistencyScore,
    contradictionPenalty,
    antiGamingConfidence,
    rationale,
  };
}
