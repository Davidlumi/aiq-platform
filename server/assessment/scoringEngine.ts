/**
 * AIQ Adaptive Assessment Engine — Deterministic Scoring Engine
 *
 * Implements the full signal system, anchor framework, failure mode detection,
 * risk weighting, and capability score computation per the AIQ specification.
 *
 * Improvements (Batch E):
 * E1: Timing map updated to match all 11 current InteractionType enum values
 * E2: Capability score scale factor is dynamic (prevents dilution with many signals)
 * E3: blockCount now counts unique failure modes only (prevents inflation)
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
  answers: Array<{ outcomeClass: string | null; signalDeltas: Record<string, number>; eventCodes: string[] }>
): FailureModeResult {
  const modes: string[] = [];
  let governanceFlag = false;
  let blockCount = 0;

  for (const a of answers) {
    const deltas = a.signalDeltas;
    const codes = a.eventCodes;

    // Blind AI acceptance (per-answer threshold: weighted delta < -1.5)
    if ((deltas.blind_acceptance_risk ?? 0) < -1.5 || codes.includes("BLIND_ACCEPT")) {
      modes.push("blind_ai_acceptance");
      governanceFlag = true;
      blockCount++;
    }
    // Hallucination acceptance
    if ((deltas.hallucination_acceptance_risk ?? 0) < -1.5 || codes.includes("HALLUCINATION_ACCEPT")) {
      modes.push("hallucination_acceptance");
      governanceFlag = true;
      blockCount++;
    }
    // Unsafe HR decisioning
    if ((deltas.unsafe_hr_decision_risk ?? 0) < -1.5 || codes.includes("UNSAFE_HR_DECISION")) {
      modes.push("unsafe_hr_decisioning");
      governanceFlag = true;
      blockCount++;
    }
    // Governance bypass
    if ((deltas.governance_bypass_risk ?? 0) < -1.5 || codes.includes("GOVERNANCE_BYPASS")) {
      modes.push("governance_bypass");
      governanceFlag = true;
      blockCount++;
    }
    // Critical failure outcome
    if (a.outcomeClass === "critical_failure") {
      modes.push("critical_failure_response");
      governanceFlag = true;
      blockCount++;
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
  // E3: blockCount now counts unique blocking failure modes only (not per-answer occurrences)
  // This prevents a single repeated pattern from inflating the classification impact.
  const uniqueBlockingModes = new Set(
    modes.filter(m => ["blind_ai_acceptance", "hallucination_acceptance", "unsafe_hr_decisioning", "governance_bypass", "critical_failure_response"].includes(m))
  );
  const uniqueBlockCount = uniqueBlockingModes.size;
  const classificationImpact: "none" | "downgrade" | "block" =
    uniqueBlockCount >= 3 ? "block" : uniqueBlockCount >= 1 ? "downgrade" : "none";

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

export function computeCapabilityScores(
  signalScores: Record<string, number>
): Record<CapabilityKey, CapabilityScore> {
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
    const avgDelta = count > 0 ? sum / count : 0;
    // E2: Dynamic scale factor prevents score dilution with many signals.
    // With few signals (count<=3) use 12.5 for sensitivity; with many signals
    // reduce the multiplier so extreme sums don't push past 0-100 bounds.
    const scaleFactor = count <= 3 ? 12.5 : Math.max(5.0, 12.5 / Math.sqrt(count / 3));
    const score = Math.max(0, Math.min(100, Math.round(50 + avgDelta * scaleFactor)));
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

export type ReadinessState = "safe" | "at_risk" | "unsafe" | "unknown";

export interface ReadinessClassification {
  state: ReadinessState;
  label: string;
  description: string;
  colour: string;
  governanceAction: string | null;
}

/**
 * R3: Role-specific readiness classification.
 * Uses role archetype's minimumSafeThresholds to detect capability-specific failures,
 * in addition to the global score-based gates.
 */
export function classifyReadiness(
  overallScore: number,
  riskBand: "low" | "medium" | "high",
  failureModes: FailureModeResult,
  evidenceSufficient: boolean,
  /** R3: Per-capability scores to check against role-specific minimum safe thresholds */
  capabilityScores?: Record<CapabilityKey, CapabilityScore>,
  /** R3: Role archetype minimum safe thresholds */
  minimumSafeThresholds?: Record<CapabilityKey, number>
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

  // R3: Check role-specific minimum safe thresholds
  const thresholdFailures: CapabilityKey[] = [];
  const criticalThresholdFailures: CapabilityKey[] = [];
  if (capabilityScores && minimumSafeThresholds) {
    const ALL_CAPS: CapabilityKey[] = ["execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation"];
    for (const cap of ALL_CAPS) {
      const score = capabilityScores[cap]?.score ?? 50;
      const threshold = minimumSafeThresholds[cap] ?? 60;
      if (score < threshold - 15) criticalThresholdFailures.push(cap);
      else if (score < threshold) thresholdFailures.push(cap);
    }
  }

  if (failureModes.classificationImpact === "block" || (riskBand === "high" && overallScore < 45) || criticalThresholdFailures.length >= 2) {
    const roleNote = criticalThresholdFailures.length >= 2
      ? ` Critical gaps detected in ${criticalThresholdFailures.slice(0, 2).map(c => c.replace(/_/g, " ")).join(" and ")} relative to your role profile.`
      : "";
    return {
      state: "unsafe",
      label: "Unsafe to Deploy",
      description: `Critical failure modes or high-risk patterns detected. Immediate remediation required before AI use.${roleNote}`,
      colour: "#EF4444",
      governanceAction: "governance_hold",
    };
  }

  if (failureModes.classificationImpact === "downgrade" || riskBand === "high" || overallScore < 45 || criticalThresholdFailures.length >= 1 || thresholdFailures.length >= 2) {
    const roleNote = (criticalThresholdFailures.length + thresholdFailures.length) > 0
      ? ` Your role profile requires stronger performance in ${[...criticalThresholdFailures, ...thresholdFailures].slice(0, 2).map(c => c.replace(/_/g, " ")).join(" and ")}.`
      : "";
    return {
      state: "at_risk",
      label: "At Risk",
      description: `Significant gaps or risk patterns detected. Supervised use only with mandatory remediation.${roleNote}`,
      colour: "#F59E0B",
      governanceAction: "restricted_use",
    };
  }

  if (overallScore >= 75 && thresholdFailures.length === 0 && (riskBand === "low" || riskBand === "medium")) {
    return {
      state: "safe",
      label: "Safe to Deploy",
      description: "Strong, credible AI capability demonstrated across assessed domains, meeting your role-specific thresholds.",
      colour: "#10B981",
      governanceAction: null,
    };
  }

  return {
    state: "at_risk",
    label: "Developing",
    description: "Capability is developing but not yet at the level required for unsupervised AI use.",
    colour: "#F59E0B",
    governanceAction: "supervised_use",
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
  targetItems: number = 49
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

  // Overall confidence
  const overall = Math.min(1, (
    evidenceDepth * 0.25 +
    evidenceBreadth * 0.20 +
    interactionDiversity * 0.15 +
    riskExposure * 0.15 +
    consistencyScore * 0.10 +
    contradictionPenalty * 0.10 +
    antiGamingConfidence * 0.05
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
