/**
 * AIQ Adaptive Assessment Engine — Deterministic Scoring Engine
 *
 * Implements the full signal system, anchor framework, failure mode detection,
 * risk weighting, and capability score computation per the AIQ specification.
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
  Low:    { positive: 0.80, negative: 0.80 },
  Medium: { positive: 1.00, negative: 1.15 },
  High:   { positive: 1.05, negative: 1.35 },
};

export const DIFFICULTY_WEIGHTS: Record<number, number> = {
  1: 0.80,
  2: 1.00,
  3: 1.20,
};

// ─── Outcome Classes ─────────────────────────────────────────────────────────

export type OutcomeClass =
  | "strong"
  | "acceptable"
  | "weak"
  | "failure"
  | "critical_failure";

export const OUTCOME_SCORE_MODIFIER: Record<OutcomeClass, number> = {
  strong:           1.0,
  acceptable:       0.6,
  weak:            -0.3,
  failure:         -0.7,
  critical_failure: -1.5,
};

// ─── Failure Mode Detection ───────────────────────────────────────────────────

export interface FailureModeResult {
  detected: boolean;
  modes: string[];
  governanceFlag: boolean;
  classificationImpact: "none" | "downgrade" | "block";
}

export function detectFailureModes(
  answers: Array<{ outcomeClass: string | null; signalDeltas: Record<string, number>; eventCodes: string[] }>
): FailureModeResult {
  const modes: string[] = [];
  let governanceFlag = false;
  let blockCount = 0;

  for (const a of answers) {
    const deltas = a.signalDeltas;
    const codes = a.eventCodes;

    // Blind AI acceptance
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
  const classificationImpact: "none" | "downgrade" | "block" =
    blockCount >= 3 ? "block" : blockCount >= 1 ? "downgrade" : "none";

  return {
    detected: uniqueModes.length > 0,
    modes: uniqueModes,
    governanceFlag,
    classificationImpact,
  };
}

// ─── Signal Score Computation ─────────────────────────────────────────────────

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

    const riskMult = RISK_MULTIPLIERS[answer.riskLevel] ?? RISK_MULTIPLIERS.Medium;
    const diffWeight = DIFFICULTY_WEIGHTS[answer.difficulty] ?? 1.0;

    // Apply outcome class modifier to all deltas
    const outcomeMod = OUTCOME_SCORE_MODIFIER[(answer.outcomeClass as OutcomeClass) ?? "acceptable"] ?? 0.6;

    for (const [signal, baseDelta] of Object.entries(deltas)) {
      const multiplier = baseDelta >= 0 ? riskMult.positive : riskMult.negative;
      const weightedDelta = baseDelta * multiplier * diffWeight * outcomeMod;
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

    // ── T1-4: Time-to-Answer Scoring ─────────────────────────────────────────
    // Fast correct answers indicate fluency; very slow answers may indicate
    // uncertainty or gaming. Applied to timing_integrity signal.
    const timeMs = answer.timeToAnswerMs;
    if (timeMs !== undefined && timeMs > 0) {
      let timingDelta = 0;
      if (outcome === "strong" && timeMs < 30000) {
        timingDelta = 0.5;   // Fast and correct — demonstrates fluency
      } else if (outcome === "strong" && timeMs > 120000) {
        timingDelta = -0.2;  // Very slow even when correct — slight uncertainty
      } else if ((outcome === "failure" || outcome === "critical_failure") && timeMs < 8000) {
        timingDelta = -0.5;  // Extremely fast failure — not reading carefully
      } else if (timeMs > 180000) {
        timingDelta = -0.3;  // Excessively long (> 3 min) — minor penalty
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

function scoreBand(score: number): "strong" | "developing" | "needs_work" | "critical" {
  if (score >= 75) return "strong";
  if (score >= 55) return "developing";
  if (score >= 35) return "needs_work";
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
    const score = Math.max(0, Math.min(100, Math.round(50 + avgDelta * 12.5)));
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

export function computeOverallScore(capabilityScores: Record<CapabilityKey, CapabilityScore>): number {
  const scores = Object.values(capabilityScores).map(c => c.score);
  if (scores.length === 0) return 50;
  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
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

export function classifyReadiness(
  overallScore: number,
  riskBand: "low" | "medium" | "high",
  failureModes: FailureModeResult,
  evidenceSufficient: boolean
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

  if (failureModes.classificationImpact === "block" || (riskBand === "high" && overallScore < 45)) {
    return {
      state: "unsafe",
      label: "Unsafe to Deploy",
      description: "Critical failure modes or high-risk patterns detected. Immediate remediation required before AI use.",
      colour: "#EF4444",
      governanceAction: "governance_hold",
    };
  }

  if (failureModes.classificationImpact === "downgrade" || riskBand === "high" || overallScore < 45) {
    return {
      state: "at_risk",
      label: "At Risk",
      description: "Significant gaps or risk patterns detected. Supervised use only with mandatory remediation.",
      colour: "#F59E0B",
      governanceAction: "restricted_use",
    };
  }

  if (overallScore >= 75 && (riskBand === "low" || riskBand === "medium")) {
    return {
      state: "safe",
      label: "Safe to Deploy",
      description: "Strong, credible AI capability demonstrated across assessed domains.",
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
  antiGamingScore: number
): ConfidenceProfile {
  // Evidence depth: how many answers vs minimum required (50)
  const evidenceDepth = Math.min(1, totalAnswers / 50);

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
