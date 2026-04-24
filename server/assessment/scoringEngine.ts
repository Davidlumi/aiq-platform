/**
 * AIQ Assessment Engine — Deterministic Scoring Engine v10
 *
 * Implements the v10.7 methodology:
 * - 6 capability domains (2 foundation, 1 operational, 3 strategic)
 * - 28 signals mapped to domains (22 capability + 6 risk)
 * - Foundation-first gating (strategic domains gated on foundation evidence)
 * - 7 failure modes (4 blocking, 3 downgrade)
 * - Five-state readiness classification including Foundation Gap
 * - Sum-and-clip scoring formula (v2.2 preserved)
 * - Domain-weighted confidence calibration with 3-level staking
 *
 * Non-negotiable: LLMs generate items. LLMs never score.
 * Every scoring decision follows pre-defined signal deltas.
 */

import type { CapabilityKey } from "./roleArchetypes";

// ─── v10 Domain Taxonomy ─────────────────────────────────────────────────────

export type DomainTier = "foundation" | "operational" | "strategic";

export const DOMAIN_TIER: Record<CapabilityKey, DomainTier> = {
  ai_interaction:         "foundation",
  ai_output_evaluation:   "foundation",
  ai_workflow_design:     "operational",
  workforce_ai_readiness: "strategic",
  ai_ethics_trust:        "strategic",
  ai_change_leadership:   "strategic",
};

export const FOUNDATION_DOMAINS: ReadonlyArray<CapabilityKey> = ["ai_interaction", "ai_output_evaluation"];
export const STRATEGIC_DOMAINS: ReadonlyArray<CapabilityKey> = ["workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership"];
export const OPERATIONAL_DOMAINS: ReadonlyArray<CapabilityKey> = ["ai_workflow_design"];
export const ALL_DOMAINS: ReadonlyArray<CapabilityKey> = [
  "ai_interaction", "ai_output_evaluation", "ai_workflow_design",
  "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership",
];

export const DOMAIN_DISPLAY: Record<CapabilityKey, string> = {
  ai_interaction:         "AI Interaction",
  ai_output_evaluation:   "AI Output Evaluation",
  ai_workflow_design:     "AI Workflow Design",
  workforce_ai_readiness: "Workforce AI Readiness",
  ai_ethics_trust:        "AI Ethics & Employee Trust",
  ai_change_leadership:   "AI Change Leadership",
};

export const DOMAIN_COLOURS: Record<CapabilityKey, string> = {
  ai_interaction:         "#3B82F6", // Blue
  ai_output_evaluation:   "#8B5CF6", // Violet
  ai_workflow_design:     "#10B981", // Emerald
  workforce_ai_readiness: "#F59E0B", // Amber
  ai_ethics_trust:        "#EF4444", // Red
  ai_change_leadership:   "#06B6D4", // Cyan
};

/** Foundation gate threshold — below this on either foundation domain → Foundation Gap */
export const FOUNDATION_GATE_THRESHOLD = 55;

/** Minimum signal contributions required per foundation domain before strategic routing */
export const FOUNDATION_MINIMUM_SIGNALS = 3;

// ─── v10 Signal System (28 signals: 22 capability + 6 risk) ──────────────────

export type SignalKey =
  // AI Interaction (4 signals)
  | "prompt_construction_quality"
  | "prompt_iteration_quality"
  | "output_direction_skill"
  | "tool_fluency_index"
  // AI Output Evaluation (7 signals)
  | "output_evaluation_quality"
  | "error_detection_accuracy"
  | "fitness_for_purpose_judgement"
  | "blind_acceptance_risk"
  | "hallucination_acceptance_risk"
  | "bias_detection_skill"
  | "data_interpretation_quality"
  // AI Workflow Design (4 signals)
  | "workflow_redesign_quality"
  | "handoff_design_quality"
  | "human_oversight_preservation"
  | "automation_expansion_risk"
  // Workforce AI Readiness (4 signals)
  | "capability_diagnosis_accuracy"
  | "intervention_design_quality"
  | "leader_advisory_quality"
  | "generic_prescription_risk"
  // AI Ethics & Employee Trust (5 signals)
  | "ethics_under_pressure"
  | "stakeholder_impact_awareness"
  | "employee_transparency_advocacy"
  | "pressure_drift_risk"
  | "legal_vs_fair_distinction"
  // AI Change Leadership (4 signals — 28 total: 22 capability + 6 risk signals)
  | "resistance_response_quality"
  | "legitimate_concern_recognition"
  | "change_pace_calibration"
  | "dismissive_of_concern_risk";

export const SIGNAL_TO_DOMAIN: Record<SignalKey, CapabilityKey> = {
  // AI Interaction
  prompt_construction_quality:    "ai_interaction",
  prompt_iteration_quality:       "ai_interaction",
  output_direction_skill:         "ai_interaction",
  tool_fluency_index:             "ai_interaction",
  // AI Output Evaluation
  output_evaluation_quality:      "ai_output_evaluation",
  error_detection_accuracy:       "ai_output_evaluation",
  fitness_for_purpose_judgement:   "ai_output_evaluation",
  blind_acceptance_risk:           "ai_output_evaluation",
  hallucination_acceptance_risk:   "ai_output_evaluation",
  bias_detection_skill:            "ai_output_evaluation",
  data_interpretation_quality:     "ai_output_evaluation",
  // AI Workflow Design
  workflow_redesign_quality:       "ai_workflow_design",
  handoff_design_quality:          "ai_workflow_design",
  human_oversight_preservation:    "ai_workflow_design",
  automation_expansion_risk:       "ai_workflow_design",
  // Workforce AI Readiness
  capability_diagnosis_accuracy:   "workforce_ai_readiness",
  intervention_design_quality:     "workforce_ai_readiness",
  leader_advisory_quality:         "workforce_ai_readiness",
  generic_prescription_risk:       "workforce_ai_readiness",
  // AI Ethics & Employee Trust
  ethics_under_pressure:           "ai_ethics_trust",
  stakeholder_impact_awareness:    "ai_ethics_trust",
  employee_transparency_advocacy:  "ai_ethics_trust",
  pressure_drift_risk:             "ai_ethics_trust",
  legal_vs_fair_distinction:       "ai_ethics_trust",
  // AI Change Leadership
  resistance_response_quality:     "ai_change_leadership",
  legitimate_concern_recognition:  "ai_change_leadership",
  change_pace_calibration:         "ai_change_leadership",
  dismissive_of_concern_risk:      "ai_change_leadership",
};

export const SIGNAL_DISPLAY: Record<SignalKey, string> = {
  prompt_construction_quality:    "Prompt Construction Quality",
  prompt_iteration_quality:       "Prompt Iteration Quality",
  output_direction_skill:         "Output Direction Skill",
  tool_fluency_index:             "Tool Fluency",
  output_evaluation_quality:      "Output Evaluation Quality",
  error_detection_accuracy:       "Error Detection Accuracy",
  fitness_for_purpose_judgement:   "Fitness-for-Purpose Judgement",
  blind_acceptance_risk:           "Blind Acceptance Risk",
  hallucination_acceptance_risk:   "Hallucination Acceptance Risk",
  bias_detection_skill:            "Bias Detection Skill",
  data_interpretation_quality:     "Data Interpretation Quality",
  workflow_redesign_quality:       "Workflow Redesign Quality",
  handoff_design_quality:          "Handoff Design Quality",
  human_oversight_preservation:    "Human Oversight Preservation",
  automation_expansion_risk:       "Automation Expansion Risk",
  capability_diagnosis_accuracy:   "Capability Diagnosis Accuracy",
  intervention_design_quality:     "Intervention Design Quality",
  leader_advisory_quality:         "Leader Advisory Quality",
  generic_prescription_risk:       "Generic Prescription Risk",
  ethics_under_pressure:           "Ethics Under Pressure",
  stakeholder_impact_awareness:    "Stakeholder Impact Awareness",
  employee_transparency_advocacy:  "Employee Transparency Advocacy",
  pressure_drift_risk:             "Pressure Drift Risk",
  legal_vs_fair_distinction:       "Legal vs Fair Distinction",
  resistance_response_quality:     "Resistance Response Quality",
  legitimate_concern_recognition:  "Legitimate Concern Recognition",
  change_pace_calibration:         "Change Pace Calibration",
  dismissive_of_concern_risk:      "Dismissive of Concern Risk",
};

/** Risk signals — negative deltas on these indicate risk behaviours */
export const RISK_SIGNALS: ReadonlyArray<SignalKey> = [
  "blind_acceptance_risk",
  "hallucination_acceptance_risk",
  "automation_expansion_risk",
  "generic_prescription_risk",
  "pressure_drift_risk",
  "dismissive_of_concern_risk",
];

// ─── Risk & Difficulty Multipliers (v10 spec) ────────────────────────────────

export const RISK_MULTIPLIERS: Record<string, { positive: number; negative: number }> = {
  Low:      { positive: 1.00, negative: 1.00 },
  Medium:   { positive: 1.00, negative: 1.15 },
  High:     { positive: 1.30, negative: 1.50 },
  Critical: { positive: 1.30, negative: 1.60 },
};

/** v10 difficulty weights: L1=1.0x, L2=1.3x, L3=1.6x */
export const DIFFICULTY_WEIGHTS: Record<number, number> = {
  1: 1.0,
  2: 1.3,
  3: 1.6,
};

// ─── Outcome Classes ─────────────────────────────────────────────────────────

export type OutcomeClass =
  | "strong"
  | "acceptable"
  | "weak"
  | "failure"
  | "critical_failure";

/**
 * Outcome class modifiers carry the sign of the contribution.
 * Stored signal deltas in item options MUST be unsigned magnitudes (0.0–3.0).
 * The sign is determined entirely by this modifier.
 */
export const OUTCOME_SCORE_MODIFIER: Record<OutcomeClass, number> = {
  strong:           1.0,
  acceptable:       0.6,
  weak:            -0.3,
  failure:         -0.7,
  critical_failure: -1.5,
};

// ─── Failure Mode Detection (v10: 7 modes) ──────────────────────────────────

export interface FailureModeResult {
  detected: boolean;
  modes: string[];
  governanceFlag: boolean;
  classificationImpact: "none" | "downgrade" | "block";
  /** v10: Pressure drift tracking */
  pressureDriftDetected: boolean;
  pressureDriftMagnitude: number;
}

/**
 * v10 Failure modes:
 * Blocking: blind_acceptance, hallucination_acceptance, critical_failure, pressure_drift
 * Downgrade: over_reliance, dismissive_of_concern, generic_prescription
 * Governance flag: unresolved cross-domain contradiction
 */
export function detectFailureModes(
  answers: Array<{ outcomeClass: string | null; signalDeltas: Record<string, number>; eventCodes: string[] }>,
  opts?: {
    blockingFailureMinItems?: number;
    downgradeFailureMinItems?: number;
    baseFailureThresholdMagnitude?: number;
    catastrophicMarginMultiplier?: number;
  }
): FailureModeResult {
  const modes: string[] = [];
  let governanceFlag = false;
  let blockCount = 0;
  let pressureDriftDetected = false;
  let pressureDriftMagnitude = 0;
  const blockingDeltas: Record<string, number[]> = {};

  const baseThr = opts?.baseFailureThresholdMagnitude ?? 1.5;

  for (const a of answers) {
    const deltas = a.signalDeltas;
    const codes = a.eventCodes;

    // ── Blocking failures ──

    // Blind acceptance (AI Output Evaluation domain)
    if ((deltas.blind_acceptance_risk ?? 0) < -baseThr || codes.includes("BLIND_ACCEPT")) {
      modes.push("blind_acceptance");
      governanceFlag = true;
      blockCount++;
      (blockingDeltas["blind_acceptance"] ??= []).push(Math.abs(deltas.blind_acceptance_risk ?? baseThr));
    }

    // Hallucination acceptance (AI Output Evaluation domain)
    if ((deltas.hallucination_acceptance_risk ?? 0) < -baseThr || codes.includes("HALLUCINATION_ACCEPT")) {
      modes.push("hallucination_acceptance");
      governanceFlag = true;
      blockCount++;
      (blockingDeltas["hallucination_acceptance"] ??= []).push(Math.abs(deltas.hallucination_acceptance_risk ?? baseThr));
    }

    // Critical failure outcome
    if (a.outcomeClass === "critical_failure") {
      modes.push("critical_failure");
      governanceFlag = true;
      blockCount++;
      (blockingDeltas["critical_failure"] ??= []).push(baseThr);
    }

    // Pressure drift (AI Ethics & Employee Trust domain) — v10 NEW blocking failure
    if ((deltas.pressure_drift_risk ?? 0) < -baseThr || codes.includes("PRESSURE_DRIFT")) {
      modes.push("pressure_drift");
      governanceFlag = true;
      blockCount++;
      pressureDriftDetected = true;
      const driftMag = Math.abs(deltas.pressure_drift_risk ?? baseThr);
      pressureDriftMagnitude = Math.max(pressureDriftMagnitude, driftMag);
      (blockingDeltas["pressure_drift"] ??= []).push(driftMag);
    }

    // ── Downgrade failures ──

    // Over-reliance pattern
    if ((deltas.blind_acceptance_risk ?? 0) < -1.0 || (deltas.hallucination_acceptance_risk ?? 0) < -1.0) {
      modes.push("over_reliance");
    }

    // Dismissive of concern (AI Change Leadership domain) — v10 NEW
    if ((deltas.dismissive_of_concern_risk ?? 0) < -1.0 || codes.includes("DISMISSIVE_OF_CONCERN")) {
      modes.push("dismissive_of_concern");
    }

    // Generic prescription (Workforce AI Readiness domain) — v10 NEW
    if ((deltas.generic_prescription_risk ?? 0) < -1.0 || codes.includes("GENERIC_PRESCRIPTION")) {
      modes.push("generic_prescription");
    }

    // ── Governance flags ──

    // Automation expansion without oversight
    if ((deltas.automation_expansion_risk ?? 0) < -baseThr && (deltas.human_oversight_preservation ?? 0) < 0) {
      modes.push("automation_without_oversight");
      governanceFlag = true;
    }
  }

  const uniqueModes = Array.from(new Set(modes));
  const blockingMin = opts?.blockingFailureMinItems ?? 2;
  const catastrophicMultiplier = opts?.catastrophicMarginMultiplier ?? 1.5;

  // Block requires: blockCount >= blockingMin AND either multiple mode types or catastrophic single
  let isBlocking = false;
  if (blockCount >= blockingMin) {
    const distinctBlockingTypes = Object.keys(blockingDeltas).length;
    const hasCatastrophicSingle = Object.values(blockingDeltas).some(
      deltas => deltas.some(d => d >= baseThr * catastrophicMultiplier)
    );
    isBlocking = distinctBlockingTypes >= 2 || hasCatastrophicSingle;
  }
  // Single catastrophic event also blocks
  if (!isBlocking && blockCount >= 1) {
    const hasCatastrophicSingle = Object.values(blockingDeltas).some(
      deltas => deltas.some(d => d >= baseThr * catastrophicMultiplier)
    );
    if (hasCatastrophicSingle) isBlocking = true;
  }

  const downgradeCount = uniqueModes.filter(m =>
    ["over_reliance", "dismissive_of_concern", "generic_prescription"].includes(m)
  ).length;
  const isDowngrade = !isBlocking && downgradeCount >= (opts?.downgradeFailureMinItems ?? 1);

  return {
    detected: uniqueModes.length > 0,
    modes: uniqueModes,
    governanceFlag,
    classificationImpact: isBlocking ? "block" : isDowngrade ? "downgrade" : "none",
    pressureDriftDetected,
    pressureDriftMagnitude,
  };
}

// ─── Signal Score Computation ────────────────────────────────────────────────

export interface CapabilityScore {
  score: number;
  band: "strong" | "developing" | "needs_work" | "critical";
  signalCount: number;
  signalSum: number;
  displayName: string;
}

function scoreBand(score: number): "strong" | "developing" | "needs_work" | "critical" {
  if (score >= 75) return "strong";
  if (score >= 55) return "developing";
  if (score >= 35) return "needs_work";
  return "critical";
}

/**
 * Compute per-signal accumulated deltas from all answers.
 * Each answer's signalDeltas are the raw (unsigned magnitude) values from the item option,
 * already multiplied by the outcome modifier, risk multiplier, and difficulty weight.
 */
export function computeSignalScores(
  answers: Array<{ signalDeltas: Record<string, number> }>
): Record<string, { sum: number; count: number }> {
  const signals: Record<string, { sum: number; count: number }> = {};
  for (const a of answers) {
    for (const [key, delta] of Object.entries(a.signalDeltas)) {
      if (!signals[key]) signals[key] = { sum: 0, count: 0 };
      signals[key].sum += delta;
      signals[key].count++;
    }
  }
  return signals;
}

/**
 * Compute capability scores from signal scores using sum-and-clip formula.
 * score = intercept + clip(sum_of_weighted_deltas, -cap, +cap) × contribution_multiplier
 */
export function computeCapabilityScores(
  signalScores: Record<string, { sum: number; count: number }>,
  intercept: number = 50,
  contributionCap: number = 40,
  contributionMultiplier: number = 1.0
): Record<CapabilityKey, CapabilityScore> {
  const result: Record<string, CapabilityScore> = {};

  for (const domain of ALL_DOMAINS) {
    // Find all signals that map to this domain
    const domainSignals = (Object.keys(SIGNAL_TO_DOMAIN) as SignalKey[])
      .filter(s => SIGNAL_TO_DOMAIN[s] === domain);

    let sum = 0;
    let count = 0;
    for (const sig of domainSignals) {
      const ss = signalScores[sig];
      if (ss) {
        sum += ss.sum;
        count += ss.count;
      }
    }

    // Dynamic scale factor to prevent dilution with many signals
    const expectedSignals = domainSignals.length;
    const scaleFactor = count > 0 ? Math.min(2.0, expectedSignals / Math.max(1, count) * 1.5) : 1.0;

    const clipped = Math.max(-contributionCap, Math.min(contributionCap, sum * scaleFactor));
    const score = Math.max(0, Math.min(100, Math.round(intercept + clipped * contributionMultiplier)));

    result[domain] = {
      score,
      band: scoreBand(score),
      signalCount: count,
      signalSum: sum,
      displayName: DOMAIN_DISPLAY[domain] ?? domain,
    };
  }

  return result as Record<CapabilityKey, CapabilityScore>;
}

/**
 * Foundation gate check — determines if strategic domains should be assessed.
 * Returns true if BOTH foundation domains have sufficient evidence AND score >= threshold.
 */
export function checkFoundationGate(
  capabilityScores: Record<CapabilityKey, CapabilityScore>,
  threshold: number = FOUNDATION_GATE_THRESHOLD,
  minimumSignals: number = FOUNDATION_MINIMUM_SIGNALS
): { passed: boolean; gatingDomain?: CapabilityKey; gatingScore?: number } {
  for (const domain of FOUNDATION_DOMAINS) {
    const cs = capabilityScores[domain];
    if (!cs || cs.signalCount < minimumSignals) {
      return { passed: false, gatingDomain: domain, gatingScore: cs?.score };
    }
    if (cs.score < threshold) {
      return { passed: false, gatingDomain: domain, gatingScore: cs.score };
    }
  }
  return { passed: true };
}

/**
 * Consistency penalty based on standard deviation of capability scores.
 * Penalises high-variance profiles.
 */
function computeConsistencyPenalty(scores: number[]): number {
  if (scores.length === 0) return 0;
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev <= 10) return 0;
  return Math.min(8, Math.round((stdDev - 10) / 2.5));
}

/**
 * Capability-weighted overall score.
 * Uses role archetype's capabilityWeights if provided; falls back to equal weighting.
 * Only includes domains that have been assessed (signalCount > 0).
 */
export function computeOverallScore(
  capabilityScores: Record<CapabilityKey, CapabilityScore>,
  capabilityWeights?: Record<CapabilityKey, number>
): number {
  // Only include domains with evidence
  const assessedDomains = ALL_DOMAINS.filter(d => (capabilityScores[d]?.signalCount ?? 0) > 0);
  if (assessedDomains.length === 0) return 50; // intercept

  const rawScores = assessedDomains.map(d => capabilityScores[d]?.score ?? 50);

  if (!capabilityWeights) {
    const avg = rawScores.reduce((s, v) => s + v, 0) / rawScores.length;
    const penalty = computeConsistencyPenalty(rawScores);
    return Math.max(0, Math.round(avg - penalty));
  }

  let weightedSum = 0;
  let totalWeight = 0;
  for (const domain of assessedDomains) {
    const w = capabilityWeights[domain] ?? (1 / ALL_DOMAINS.length);
    weightedSum += (capabilityScores[domain]?.score ?? 50) * w;
    totalWeight += w;
  }
  const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 50;
  const penalty = computeConsistencyPenalty(rawScores);
  return Math.max(0, Math.round(weightedAvg - penalty));
}

// ─── Five-State Readiness Classification (v10) ──────────────────────────────

/**
 * v10 Five readiness states:
 * 1. safe (AI-Ready) — overall ≥75, no critical failures, all 6 domains assessed
 * 2. at_risk (Developing) — overall 45-74, or threshold failures
 * 3. unsafe (Not Yet Ready) — blocking failures, high risk + score <45, or ≥2 critical threshold failures
 * 4. foundation_gap — foundation domain <55, strategic domains not assessed
 * 5. unknown_insufficient_evidence — composite confidence <0.50
 */
export type ReadinessState = "safe" | "at_risk" | "unsafe" | "foundation_gap" | "unknown" | "unknown_insufficient_evidence";

export interface ReadinessClassification {
  state: ReadinessState;
  label: string;
  /** Participant-facing label (translation layer) */
  participantLabel: string;
  description: string;
  /** Participant-facing description (dignity-preserving) */
  participantDescription: string;
  colour: string;
  governanceAction: string | null;
  governingConstraint?: {
    capability: string;
    score: number;
    band: string;
    thresholdRequired: number;
    gap: number;
    droveClassification: boolean;
  };
  confidenceDiagnostic?: {
    weakestFactors: string[];
    suggestedActions: string[];
  };
  isProvisional?: boolean;
  /** v10: Foundation gap details */
  foundationGapDetail?: {
    gatingDomain: string;
    gatingScore: number;
    threshold: number;
  };
}

export const CONFIDENCE_FLOOR = 0.50;
export const PROVISIONAL_CONFIDENCE_THRESHOLD = 0.40;

export function classifyReadiness(
  overallScore: number,
  riskBand: "low" | "medium" | "high",
  failureModes: FailureModeResult,
  evidenceSufficient: boolean,
  capabilityScores?: Record<CapabilityKey, CapabilityScore>,
  minimumSafeThresholds?: Record<CapabilityKey, number>,
  compositeConfidence?: number,
  orgThresholdOverrides?: Partial<Record<CapabilityKey, number>>,
  provisionalThreshold?: number,
  confidenceFloorOverride?: number,
  /** v10: Foundation gate result */
  foundationGateResult?: { passed: boolean; gatingDomain?: CapabilityKey; gatingScore?: number }
): ReadinessClassification {
  // Insufficient evidence
  if (!evidenceSufficient) {
    return {
      state: "unknown",
      label: "Insufficient Evidence",
      participantLabel: "Assessment In Progress",
      description: "Not enough evidence has been collected to make a reliable readiness classification.",
      participantDescription: "We need a bit more information to provide your capability profile. Please continue with the assessment.",
      colour: "#94A3B8",
      governanceAction: null,
    };
  }

  // Confidence floor check
  const provThreshold = provisionalThreshold ?? PROVISIONAL_CONFIDENCE_THRESHOLD;
  const confFloor = confidenceFloorOverride ?? CONFIDENCE_FLOOR;
  if (compositeConfidence !== undefined && compositeConfidence < provThreshold) {
    return {
      state: "unknown_insufficient_evidence",
      label: "Result Unavailable",
      participantLabel: "More Evidence Needed",
      description: "The assessment could not produce a reliable classification because the confidence level was too low.",
      participantDescription: "Your responses didn't give us enough consistent evidence to produce a reliable profile. This sometimes happens when responses vary significantly. A reassessment would help us build a clearer picture.",
      colour: "#94A3B8",
      governanceAction: null,
      confidenceDiagnostic: {
        weakestFactors: ["evidence depth", "interaction diversity"],
        suggestedActions: [
          "Complete the full assessment without rushing",
          "Ensure you attempt all interaction types",
          "Review and reconsider any answers where you were guessing",
        ],
      },
    };
  }

  const isProvisional = compositeConfidence !== undefined
    && compositeConfidence >= provThreshold
    && compositeConfidence < confFloor;

  // v10: Foundation Gap — foundation domain below threshold
  if (foundationGateResult && !foundationGateResult.passed && foundationGateResult.gatingDomain) {
    const gatingScore = foundationGateResult.gatingScore ?? 0;
    return {
      state: "foundation_gap",
      label: "Foundation Gap",
      participantLabel: "Foundation Capability In Progress",
      description: `Foundation domain ${DOMAIN_DISPLAY[foundationGateResult.gatingDomain]} scored ${gatingScore} (threshold: ${FOUNDATION_GATE_THRESHOLD}). Strategic domains were not assessed because foundation capability is insufficient.`,
      participantDescription: `Your assessment shows that building stronger foundations in ${DOMAIN_DISPLAY[foundationGateResult.gatingDomain]} will unlock the full assessment. This is a common starting point — targeted development in this area will help you progress quickly.`,
      colour: "#F97316", // Orange
      governanceAction: "foundation_development_required",
      isProvisional,
      foundationGapDetail: {
        gatingDomain: foundationGateResult.gatingDomain,
        gatingScore,
        threshold: FOUNDATION_GATE_THRESHOLD,
      },
    };
  }

  // Role-specific threshold checks
  const thresholdFailures: CapabilityKey[] = [];
  const criticalThresholdFailures: CapabilityKey[] = [];
  if (capabilityScores && minimumSafeThresholds) {
    for (const domain of ALL_DOMAINS) {
      const score = capabilityScores[domain]?.score ?? 50;
      const archetypeThreshold = minimumSafeThresholds[domain] ?? 60;
      const orgOverride = orgThresholdOverrides?.[domain];
      const threshold = orgOverride !== undefined ? Math.max(archetypeThreshold, orgOverride) : archetypeThreshold;
      if (score < threshold - 15) criticalThresholdFailures.push(domain);
      else if (score < threshold) thresholdFailures.push(domain);
    }
  }

  // Governing constraint computation
  const computeGoverningConstraint = (state: string) => {
    if (!capabilityScores || !minimumSafeThresholds) return undefined;
    const sorted = ALL_DOMAINS
      .filter(d => (capabilityScores[d]?.signalCount ?? 0) > 0)
      .map(domain => ({
        capability: domain,
        score: capabilityScores[domain]?.score ?? 50,
        band: capabilityScores[domain]?.band ?? "needs_work",
        thresholdRequired: (() => {
          const archetypeT = minimumSafeThresholds[domain] ?? 60;
          const orgT = orgThresholdOverrides?.[domain];
          return orgT !== undefined ? Math.max(archetypeT, orgT) : archetypeT;
        })(),
      }))
      .map(c => ({ ...c, gap: c.thresholdRequired - c.score }))
      .sort((a, b) => b.gap - a.gap);
    const governing = state === "safe" ? sorted[sorted.length - 1] : sorted[0];
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

  // Unsafe / Not Yet Ready
  if (failureModes.classificationImpact === "block" || (riskBand === "high" && overallScore < 45) || criticalThresholdFailures.length >= 2) {
    const roleNote = criticalThresholdFailures.length >= 2
      ? ` Critical gaps detected in ${criticalThresholdFailures.slice(0, 2).map(c => DOMAIN_DISPLAY[c] ?? c).join(" and ")}.`
      : "";
    return {
      state: "unsafe",
      label: "Not Yet Ready",
      participantLabel: "Foundation Development Required",
      description: `Significant AI capability gaps identified. Structured development and supervised AI use is recommended.${roleNote}`,
      participantDescription: `Your assessment has identified some important areas for development before you can work independently with AI tools. This is a valuable starting point — focused development in the highlighted areas will build the capability you need.`,
      colour: "#EF4444",
      governanceAction: "development_required",
      governingConstraint: computeGoverningConstraint("unsafe"),
      isProvisional,
    };
  }

  // At Risk / Developing
  if (failureModes.classificationImpact === "downgrade" || riskBand === "high" || overallScore < 45 || criticalThresholdFailures.length >= 1 || thresholdFailures.length >= 2) {
    const roleNote = (criticalThresholdFailures.length + thresholdFailures.length) > 0
      ? ` Further development needed in ${[...criticalThresholdFailures, ...thresholdFailures].slice(0, 2).map(c => DOMAIN_DISPLAY[c] ?? c).join(" and ")}.`
      : "";
    return {
      state: "at_risk",
      label: "Developing",
      participantLabel: "Developing",
      description: `Emerging AI capability identified with areas for development. Supervised use with structured learning recommended.${roleNote}`,
      participantDescription: `You're building solid AI capability with some areas that would benefit from further development. Structured learning in the highlighted domains will help you progress to full readiness.`,
      colour: "#F59E0B",
      governanceAction: "supervised_use_recommended",
      governingConstraint: computeGoverningConstraint("at_risk"),
      isProvisional,
    };
  }

  // Safe / AI-Ready — requires all 6 domains assessed
  const allDomainsAssessed = ALL_DOMAINS.every(d => (capabilityScores?.[d]?.signalCount ?? 0) >= 2);
  const isHighScorer = overallScore >= 82;
  const safeThresholdOk = thresholdFailures.length === 0 || (isHighScorer && thresholdFailures.length === 1 && criticalThresholdFailures.length === 0);

  if (overallScore >= 75 && safeThresholdOk && allDomainsAssessed && (riskBand === "low" || riskBand === "medium")) {
    const hasMinorGap = isHighScorer && thresholdFailures.length === 1;
    const gapNote = hasMinorGap
      ? ` One minor capability gap in ${DOMAIN_DISPLAY[thresholdFailures[0]] ?? thresholdFailures[0]} noted — targeted development recommended.`
      : "";
    return {
      state: "safe",
      label: "AI-Ready",
      participantLabel: "AI-Ready",
      description: `Strong, credible AI capability demonstrated across all assessed domains, meeting role-specific thresholds.${gapNote}`,
      participantDescription: `Congratulations — your assessment demonstrates strong AI capability across all domains. You're well-positioned to work effectively and safely with AI tools in your role.${hasMinorGap ? ` Continued development in ${DOMAIN_DISPLAY[thresholdFailures[0]] ?? thresholdFailures[0]} will further strengthen your profile.` : ""}`,
      colour: "#10B981",
      governanceAction: null,
      governingConstraint: computeGoverningConstraint("safe"),
      isProvisional,
    };
  }

  // Default: Developing
  return {
    state: "at_risk",
    label: "Developing",
    participantLabel: "Developing",
    description: "Capability is developing but not yet at the level required for independent AI use. Structured learning and supervised practice is recommended.",
    participantDescription: "You're making good progress in building your AI capability. Continued development through structured learning will help you reach full readiness.",
    colour: "#F59E0B",
    governanceAction: "supervised_use_recommended",
    governingConstraint: computeGoverningConstraint("at_risk"),
    isProvisional,
  };
}

// ─── Confidence / Reliability Engine ─────────────────────────────────────────

/** v10: Domain-weighted overconfidence multipliers for confidence calibration */
export const DOMAIN_OVERCONFIDENCE_WEIGHT: Record<CapabilityKey, number> = {
  ai_output_evaluation:   1.5,
  ai_ethics_trust:        1.3,
  ai_interaction:         1.0,
  ai_workflow_design:     1.0,
  workforce_ai_readiness: 0.9,
  ai_change_leadership:   0.8,
};

/** v10: Three-level confidence staking */
export type ConfidenceStake = "tentative" | "confident" | "certain";

export const CONFIDENCE_STAKE_VALUES: Record<ConfidenceStake, number> = {
  tentative: 0.3,
  confident: 0.6,
  certain:   0.9,
};

export interface ConfidenceProfile {
  overall: number;
  band: "high" | "medium" | "low";
  evidenceDepth: number;
  evidenceBreadth: number;
  interactionDiversity: number;
  riskExposure: number;
  consistencyScore: number;
  contradictionPenalty: number;
  antiGamingConfidence: number;
  /** v10: Overconfidence penalty from domain-weighted calibration */
  overconfidencePenalty: number;
  rationale: string;
}

/**
 * Compute confidence profile with v10 domain-weighted overconfidence calibration.
 */
export function computeConfidenceProfile(
  totalAnswers: number,
  capabilityScores: Record<CapabilityKey, CapabilityScore>,
  interactionTypesUsed: Set<string>,
  highRiskAnswers: number,
  contradictionCount: number,
  consistencyScore: number,
  antiGamingScore: number,
  targetItems: number = 49,
  reasoningCompleteness: number = 1.0,
  /** v10: Per-answer confidence stakes with domain context for overconfidence detection */
  confidenceStakes?: Array<{ stake: ConfidenceStake; domain: CapabilityKey; wasCorrect: boolean }>
): ConfidenceProfile {
  const evidenceDepth = Math.min(1, totalAnswers / targetItems);
  const capabilitiesCovered = Object.values(capabilityScores).filter(c => c.signalCount >= 3).length;
  const evidenceBreadth = capabilitiesCovered / ALL_DOMAINS.length;
  const interactionDiversity = Math.min(1, interactionTypesUsed.size / 10); // v10: 15 types, target 10
  const riskExposure = Math.min(1, highRiskAnswers / Math.max(1, totalAnswers * 0.3));
  const contradictionPenalty = Math.max(0, 1 - (contradictionCount * 0.15));
  const antiGamingConfidence = Math.max(0, antiGamingScore);
  const reasoningCompletenessScore = Math.max(0, Math.min(1, reasoningCompleteness));

  // v10: Compute domain-weighted overconfidence penalty
  let overconfidencePenalty = 0;
  if (confidenceStakes && confidenceStakes.length > 0) {
    let totalOverconfidence = 0;
    let stakeCount = 0;
    for (const cs of confidenceStakes) {
      if (cs.stake === "certain" && !cs.wasCorrect) {
        const domainWeight = DOMAIN_OVERCONFIDENCE_WEIGHT[cs.domain] ?? 1.0;
        totalOverconfidence += domainWeight;
        stakeCount++;
      } else if (cs.stake === "confident" && !cs.wasCorrect) {
        const domainWeight = DOMAIN_OVERCONFIDENCE_WEIGHT[cs.domain] ?? 1.0;
        totalOverconfidence += domainWeight * 0.5;
        stakeCount++;
      }
    }
    if (stakeCount > 0) {
      overconfidencePenalty = Math.min(0.15, (totalOverconfidence / confidenceStakes.length) * 0.2);
    }
  }

  const overall = Math.min(1, Math.max(0, (
    evidenceDepth * 0.18 +
    evidenceBreadth * 0.18 +
    interactionDiversity * 0.15 +
    riskExposure * 0.12 +
    consistencyScore * 0.12 +
    contradictionPenalty * 0.10 +
    antiGamingConfidence * 0.05 +
    reasoningCompletenessScore * 0.05 +
    (1 - overconfidencePenalty) * 0.05
  )));

  const band: "high" | "medium" | "low" =
    overall >= 0.75 ? "high" : overall >= 0.50 ? "medium" : "low";

  const rationale = [
    `Evidence depth: ${Math.round(evidenceDepth * 100)}%`,
    `Capability coverage: ${capabilitiesCovered}/${ALL_DOMAINS.length} domains`,
    `Interaction diversity: ${interactionTypesUsed.size} types`,
    contradictionCount > 0 ? `${contradictionCount} contradiction(s) detected` : null,
    overconfidencePenalty > 0 ? `Overconfidence penalty: ${Math.round(overconfidencePenalty * 100)}%` : null,
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
    overconfidencePenalty,
    rationale,
  };
}
