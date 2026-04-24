/**
 * AIQ Adaptive Assessment Engine — Session Controller
 *
 * Orchestrates the 3-phase adaptive session:
 * Phase 1 (Baseline): Broad sampling across all 6 capabilities, 5 interaction types
 * Phase 2 (Adaptive): Deep probing of weaknesses, anti-gaming injections, contradiction detection
 * Phase 3 (Validation): Confirmation probes, contradiction resolution, final evidence gathering
 *
 * Minimum Evidence Model:
 * - At least 3 signal contributions per capability domain
 * - At least 5 distinct interaction types used
 * - At least 30% of items at High risk level
 * - At least 1 contradiction probe if contradictions detected
 * - Minimum 20 items before any classification attempt
 *
 * Improvements (Batch D):
 * D1: selectNarrative is now a fallback only — LLM narrative is preferred at results level
 * D2: computeState receives roleArchetype-aware evidence thresholds
 * D3: Contradiction probe count cap raised to 3 when scrutinyLevel is "high"
 */

import type { CapabilityKey } from "./roleArchetypes";
import { resolveRoleArchetype } from "./roleArchetypes";
import type { InteractionType } from "./adaptiveEngine";
import {
  selectNextGenerationVariables,
  generateAdaptiveItem,
  determineSessionPhase,
  DEFAULT_ORG_INTENT,
  type AdaptiveSelectionContext,
  type GeneratedItem,
} from "./adaptiveEngine";
import {
  computeSignalScores,
  computeCapabilityScores,
  computeOverallScore,
  classifyReadiness,
  computeConfidenceProfile,
  detectFailureModes,
  type CapabilityScore,
} from "./scoringEngine";
import { detectContradictions, generateContradictionProbeSpec, type AnswerRecord } from "./contradictionEngine";
import { analyseGamingPatterns } from "./antiGamingEngine";
import { computeAllPercentiles, NORM_GROUP_VERSION } from "./normEngine";
import { applyClassificationConfidenceGate } from "./classificationConfidenceGate";

// ─── Minimum Evidence Requirements ───────────────────────────────────────────

/** @deprecated D1: MINIMUM_EVIDENCE is now configurable via scoring_config.
 * Use getActiveScoringConfig() and read the evidence_* fields directly in the router.
 * This constant is kept for backward compatibility with any code that has not yet been migrated.
 * The values here are the original defaults and will not reflect DB overrides.
 */
export const MINIMUM_EVIDENCE = {
  totalItems: 20,
  signalsPerCapability: 3,
  distinctInteractionTypes: 5,
  highRiskProportion: 0.25,
  targetItems: 49,
};

// ─── Session State ────────────────────────────────────────────────────────────

export interface SessionState {
  sessionId: string;
  userId: string;
  blueprintId: string;
  phase: "baseline" | "adaptive" | "validation";
  answeredCount: number;
  totalTarget: number;
  evidenceSufficient: boolean;
  canComplete: boolean;
  interactionTypesUsed: Record<string, number>;
  capabilitySignalCounts: Record<string, number>;
  highRiskAnswerCount: number;
  contradictionCount: number;
  gamingScrutinyLevel: "normal" | "elevated" | "high";
  currentItem: GeneratedItem | null;
  completionBlockers: string[];
}

// ─── Answer Data ──────────────────────────────────────────────────────────────

export interface AnswerData {
  itemId: string;
  selectedValue: string | null;
  freeText?: string;
  confidenceScore: number;
  timeToAnswerMs: number;
  // Resolved from item metadata
  outcomeClass: string | null;
  signalDeltasJson: unknown;
  eventCodesJson: unknown;
  riskLevel: string;
  difficulty: number;
  capabilityKey: string;
  interactionType: string;
  optionPosition: number | null;
}

// ─── Session Controller ───────────────────────────────────────────────────────

export class SessionController {
  /**
   * Compute the current session state from answers and items.
   * D2: Accepts optional userRoleHint to apply role-specific minimum safe thresholds.
   * When a role is resolved, its minimumSafeThresholds are used for evidence sufficiency
   * instead of the global MINIMUM_EVIDENCE constants.
   */
  static computeState(
    sessionId: string,
    userId: string,
    blueprintId: string,
    answers: AnswerData[],
    totalTarget: number = MINIMUM_EVIDENCE.targetItems,
    userRoleHint?: string | null
  ): SessionState {
    const answeredCount = answers.length;
    const phase = determineSessionPhase(answeredCount, totalTarget);

    // D2: Resolve role archetype for role-aware evidence thresholds
    const roleArchetype = resolveRoleArchetype(userRoleHint);

    // Compute interaction type usage
    const interactionTypesUsed: Record<string, number> = {};
    for (const a of answers) {
      interactionTypesUsed[a.interactionType] = (interactionTypesUsed[a.interactionType] ?? 0) + 1;
    }

    // Compute capability signal counts
    const capabilitySignalCounts: Record<string, number> = {};
    for (const a of answers) {
      let deltas: Record<string, number> = {};
      try {
        deltas = typeof a.signalDeltasJson === "string"
          ? JSON.parse(a.signalDeltasJson)
          : (a.signalDeltasJson as Record<string, number>) ?? {};
      } catch {}
      capabilitySignalCounts[a.capabilityKey] = (capabilitySignalCounts[a.capabilityKey] ?? 0) + Object.keys(deltas).length;
    }

    // High risk answer count
    const highRiskAnswerCount = answers.filter(a => a.riskLevel === "High").length;

    // Contradiction detection
    // D2/B5: Include declaredSeniority from resolved role archetype for seniority-inconsistency detection
    const answerRecords: AnswerRecord[] = answers.map(a => ({
      itemId: a.itemId,
      capabilityKey: a.capabilityKey,
      outcomeClass: a.outcomeClass,
      signalDeltas: (() => {
        try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
      })(),
      confidenceScore: a.confidenceScore,
      interactionType: a.interactionType,
      riskLevel: a.riskLevel,
      declaredSeniority: roleArchetype.seniority,
    }));
    const contradictions = detectContradictions(answerRecords);

    // Anti-gaming analysis
    const gamingAnswers = answers.map(a => ({
      selectedValue: a.selectedValue,
      optionPosition: a.optionPosition,
      timeToAnswerMs: a.timeToAnswerMs,
      outcomeClass: a.outcomeClass,
      confidenceScore: a.confidenceScore,
      signalDeltas: (() => {
        try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
      })(),
      interactionType: a.interactionType,
    }));
    // A2: Pass roleFamily and seniority to enable role-aware gaming thresholds
    const _seniorityLevel = roleArchetype.seniority === "junior" ? 1 : roleArchetype.seniority === "mid" ? 2 : roleArchetype.seniority === "senior" ? 3 : 4;
    const gamingAnalysis = analyseGamingPatterns(gamingAnswers, roleArchetype.gamingFamily, _seniorityLevel);

    // Evidence sufficiency check
    const distinctInteractionTypes = Object.keys(interactionTypesUsed).length;
    const highRiskProportion = answeredCount > 0 ? highRiskAnswerCount / answeredCount : 0;

    // R1: Per-capability coverage
    // D2: Use role-specific minimum safe thresholds when available.
    // High-governance roles (HRBP, ER Specialist) require stronger evidence in governance/judgement.
    // The threshold is: max(global_minimum, role_minimum_safe_threshold / 20) signals per capability.
    // Dividing by 20 converts the 0-100 score threshold to a proportional signal count threshold.
    const ALL_CAPABILITIES: CapabilityKey[] = ["ai_interaction", "ai_output_evaluation", "ai_workflow_design", "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership"];
    const uncoveredCapabilities = ALL_CAPABILITIES.filter(cap => {
      const signalCount = capabilitySignalCounts[cap] ?? 0;
      const roleThreshold = roleArchetype.minimumSafeThresholds[cap];
      // Convert role score threshold (0-100) to a signal count requirement:
      // higher score threshold → more signals needed to be confident.
      // Scale: threshold 60 → 3 signals, threshold 70 → 3.5 → 4, threshold 80 → 4
      const roleSignalRequirement = roleThreshold ? Math.ceil(roleThreshold / 20) : MINIMUM_EVIDENCE.signalsPerCapability;
      const required = Math.max(MINIMUM_EVIDENCE.signalsPerCapability, roleSignalRequirement);
      return signalCount < required;
    });
    const allCapabilitiesCovered = uncoveredCapabilities.length === 0;

    // R6: Contradiction resolution — if contradictions block classification, evidence is not sufficient
    const contradictionBlocksClassification = contradictions.blockClassification === true;

    const evidenceSufficient =
      answeredCount >= MINIMUM_EVIDENCE.totalItems &&
      distinctInteractionTypes >= MINIMUM_EVIDENCE.distinctInteractionTypes &&
      highRiskProportion >= MINIMUM_EVIDENCE.highRiskProportion &&
      allCapabilitiesCovered &&
      !contradictionBlocksClassification;

    // Completion blockers
    const completionBlockers: string[] = [];
    if (answeredCount < MINIMUM_EVIDENCE.totalItems) {
      completionBlockers.push(`Minimum ${MINIMUM_EVIDENCE.totalItems} items required (${answeredCount} answered)`);
    }
    if (distinctInteractionTypes < MINIMUM_EVIDENCE.distinctInteractionTypes) {
      completionBlockers.push(`At least ${MINIMUM_EVIDENCE.distinctInteractionTypes} interaction types required (${distinctInteractionTypes} used)`);
    }
    if (highRiskProportion < MINIMUM_EVIDENCE.highRiskProportion) {
      completionBlockers.push(`At least 25% high-risk items required`);
    }
    if (!allCapabilitiesCovered) {
      completionBlockers.push(`Insufficient evidence in: ${uncoveredCapabilities.join(", ")} (need ≥${MINIMUM_EVIDENCE.signalsPerCapability} signals each)`);
    }
    if (contradictionBlocksClassification) {
      completionBlockers.push(`Unresolved contradictions detected — contradiction probe required before classification`);
    }

    const canComplete = completionBlockers.length === 0;

    return {
      sessionId,
      userId,
      blueprintId,
      phase,
      answeredCount,
      totalTarget,
      evidenceSufficient,
      canComplete,
      interactionTypesUsed,
      capabilitySignalCounts,
      highRiskAnswerCount,
      contradictionCount: contradictions.count,
      gamingScrutinyLevel: gamingAnalysis.scrutinyLevel,
      currentItem: null,
      completionBlockers,
    };
  }

  /**
   * Generate the next adaptive item for the session.
   */
  static async generateNextItem(
    state: SessionState,
    answers: AnswerData[],
    userRoleHint?: string | null
  ): Promise<GeneratedItem> {
    const roleArchetype = resolveRoleArchetype(userRoleHint);

    // Build capability scores from answers so far
    const signalScores = computeSignalScores(
      answers.map(a => ({
        signalDeltas: (() => {
          try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
        })(),
      }))
    );
    const capabilityScores = computeCapabilityScores(signalScores);

    // Build capability score summary for adaptive selection
    const capabilityScoreSummary = Object.fromEntries(
      Object.entries(capabilityScores).map(([k, v]) => [k, { score: v.score, signalCount: v.signalCount }])
    ) as Record<CapabilityKey, { score: number; signalCount: number }>;

    // Build contradiction probes if needed
    // B5: Include declaredSeniority from resolved role archetype for seniority-inconsistency detection
    const answerRecords: AnswerRecord[] = answers.map(a => ({
      itemId: a.itemId,
      capabilityKey: a.capabilityKey,
      outcomeClass: a.outcomeClass,
      signalDeltas: (() => {
        try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
      })(),
      confidenceScore: a.confidenceScore,
      interactionType: a.interactionType,
      riskLevel: a.riskLevel,
      declaredSeniority: roleArchetype.seniority,
    }));
    // Build anti-gaming analysis (must come before contradiction probes — D3 uses scrutinyLevel)
    const gamingAnswers = answers.map(a => ({
      selectedValue: a.selectedValue,
      optionPosition: a.optionPosition,
      timeToAnswerMs: a.timeToAnswerMs,
      outcomeClass: a.outcomeClass,
      confidenceScore: a.confidenceScore,
      signalDeltas: (() => {
        try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
      })(),
      interactionType: a.interactionType,
    }));
    // A2: Pass roleFamily and seniority to enable role-aware gaming thresholds
    const _seniorityLevel = roleArchetype.seniority === "junior" ? 1 : roleArchetype.seniority === "mid" ? 2 : roleArchetype.seniority === "senior" ? 3 : 4;
    const gamingAnalysis = analyseGamingPatterns(gamingAnswers, roleArchetype.gamingFamily, _seniorityLevel);

    // D3: Raise probe cap to 3 when scrutiny is high
    const probeLimit = gamingAnalysis.scrutinyLevel === "high" ? 3 : 2;
    const contradictions = detectContradictions(answerRecords);
    const contradictionProbes = contradictions.pairs
      .slice(0, probeLimit)
      .map(pair => generateContradictionProbeSpec(pair, roleArchetype.id));

    // Build risk exposure counts
    const riskExposure = {
      Low: answers.filter(a => a.riskLevel === "Low").length,
      Medium: answers.filter(a => a.riskLevel === "Medium").length,
      High: answers.filter(a => a.riskLevel === "High").length,
    };

    // Build interaction types used
    const interactionTypesUsed = Object.fromEntries(
      Object.entries(state.interactionTypesUsed)
    ) as Record<InteractionType, number>;

    const ctx: AdaptiveSelectionContext = {
      answeredCount: state.answeredCount,
      totalTarget: state.totalTarget,
      capabilityScores: capabilityScoreSummary,
      interactionTypesUsed,
      riskExposure,
      gamingAnalysis,
      contradictionProbes,
      roleArchetype,
      orgIntent: DEFAULT_ORG_INTENT,
    };

    const generationVars = selectNextGenerationVariables(ctx);
    return generateAdaptiveItem(generationVars);
  }

  /**
   * Compute the full results object for a completed session.
   */
  static computeResults(
    answers: AnswerData[],
    userRoleHint?: string | null,
    /** WS1.1/WS1.2: Active scoring config (intercept + multiplier + v2.2 sum+clip + failure thresholds + configurable constants) */
    scoringCfg?: { intercept: number; multiplier: number; contributionCap?: number; contributionMultiplier?: number; blockingFailureMinItems?: number; downgradeFailureMinItems?: number; baseFailureThresholdMagnitude?: number; catastrophicMarginMultiplier?: number; atRiskConfidenceFloor?: number; provisionalConfidenceThreshold?: number; confidenceFloor?: number; minimumSafeClassificationConfidence?: number },
    /** S10: Org-level capability threshold overrides */
    orgThresholdOverrides?: Partial<Record<CapabilityKey, number>>,
    /** S4: Proportion of required-reasoning items that received adequate reasoning */
    reasoningCompleteness: number = 1.0
  ) {
    const roleArchetype = resolveRoleArchetype(userRoleHint);

    // Signal scores
    const signalScores = computeSignalScores(
      answers.map(a => ({
        signalDeltas: (() => {
          try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
        })(),
      }))
    );

    // Capability scores — WS1.1: use versioned scoring config (v2.2 sum+clip if params present)
    const capabilityScores = computeCapabilityScores(
      signalScores,
      scoringCfg?.intercept,
      scoringCfg?.contributionCap,
      scoringCfg?.contributionMultiplier
    );
    // R10: Use role-specific capability weights for overall score
    const overallScore = computeOverallScore(capabilityScores, roleArchetype.capabilityWeights);

    // Failure mode detection — WS1.2: pass configurable thresholds from scoring config
    const failureModes = detectFailureModes(
      answers.map(a => ({
        outcomeClass: a.outcomeClass,
        signalDeltas: (() => {
          try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
        })(),
        eventCodes: (() => {
          try { return typeof a.eventCodesJson === "string" ? JSON.parse(a.eventCodesJson) : (a.eventCodesJson as string[]) ?? []; } catch { return []; }
        })(),
      })),
      // WS1.2: pass configurable thresholds from scoring_config (Item 1: also pass delta constants)
      {
        blockingFailureMinItems: scoringCfg?.blockingFailureMinItems,
        downgradeFailureMinItems: scoringCfg?.downgradeFailureMinItems,
        baseFailureThresholdMagnitude: scoringCfg?.baseFailureThresholdMagnitude,
        catastrophicMarginMultiplier: scoringCfg?.catastrophicMarginMultiplier,
      }
    );

    // Contradiction detection
    // D2/B5: Include declaredSeniority from resolved role archetype for seniority-inconsistency detection
    const answerRecords: AnswerRecord[] = answers.map(a => ({
      itemId: a.itemId,
      capabilityKey: a.capabilityKey,
      outcomeClass: a.outcomeClass,
      signalDeltas: (() => {
        try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
      })(),
      confidenceScore: a.confidenceScore,
      interactionType: a.interactionType,
      riskLevel: a.riskLevel,
      declaredSeniority: roleArchetype.seniority,
    }));
    const contradictions = detectContradictions(answerRecords);

    // Anti-gaming analysis
    const gamingAnswers = answers.map(a => ({
      selectedValue: a.selectedValue,
      optionPosition: a.optionPosition,
      timeToAnswerMs: a.timeToAnswerMs,
      outcomeClass: a.outcomeClass,
      confidenceScore: a.confidenceScore,
      signalDeltas: (() => {
        try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
      })(),
      interactionType: a.interactionType,
    }));
    // A2: Pass roleFamily and seniority to enable role-aware gaming thresholds
    const _seniorityLevel = roleArchetype.seniority === "junior" ? 1 : roleArchetype.seniority === "mid" ? 2 : roleArchetype.seniority === "senior" ? 3 : 4;
    const gamingAnalysis = analyseGamingPatterns(gamingAnswers, roleArchetype.gamingFamily, _seniorityLevel);

    // Confidence profile
    const interactionTypesUsed = new Set(answers.map(a => a.interactionType));
    const highRiskAnswers = answers.filter(a => a.riskLevel === "High").length;
    const avgConfidence = answers.length > 0
      ? answers.reduce((s, a) => s + a.confidenceScore, 0) / answers.length
      : 0.5;
    const consistencyScore = 1 - (contradictions.count * 0.15);

    const confidenceProfile = computeConfidenceProfile(
      answers.length,
      capabilityScores,
      interactionTypesUsed,
      highRiskAnswers,
      contradictions.count,
      consistencyScore,
      gamingAnalysis.score,
      MINIMUM_EVIDENCE.targetItems,  // R2: pass actual target for evidence depth normalisation
      reasoningCompleteness           // S4: reasoning completeness factor
    );

    // Risk band
    const riskBand: "low" | "medium" | "high" =
      failureModes.governanceFlag ? "high" :
      overallScore >= 75 ? "low" : "medium";

    // Readiness classification (R3 + S2 + S10: pass capability scores, role thresholds, confidence, org overrides)
    const readiness = classifyReadiness(
      overallScore,
      riskBand,
      failureModes,
      answers.length >= MINIMUM_EVIDENCE.totalItems,
      capabilityScores,
      roleArchetype.minimumSafeThresholds,
      confidenceProfile.overall,  // S2: confidence floor check
      orgThresholdOverrides,      // S10: org threshold overrides
      // WS1.2 Item 1: pass configurable confidence thresholds from scoring_config
      scoringCfg?.provisionalConfidenceThreshold,
      scoringCfg?.confidenceFloor
    );

    // F4: Apply classification confidence gate
    // A "safe" classification requires compositeConfidence >= 0.55.
    // Below that threshold the classification is downgraded to "at_risk" with a caveat.
    // "unsafe" is never suppressed — risk signals are always surfaced.
    // Map scoringEngine's "unknown" state to the gate's "insufficient_evidence" state.
    const gateInputState: "safe" | "at_risk" | "unsafe" | "insufficient_evidence" =
      (readiness.state === "unknown" || readiness.state === "unknown_insufficient_evidence")
        ? "insufficient_evidence"
        : readiness.state === "foundation_gap"
          ? "at_risk"  // Foundation gap is treated as at_risk for confidence gating
          : readiness.state as "safe" | "at_risk" | "unsafe" | "insufficient_evidence";
    const gateResult = applyClassificationConfidenceGate(
      gateInputState,
      confidenceProfile.overall,
      // WS1.2 Item 1: pass configurable confidence thresholds from scoring_config
      scoringCfg?.minimumSafeClassificationConfidence,
      scoringCfg?.atRiskConfidenceFloor
    );
    const gatedReadiness = gateResult.wasDowngraded
      ? { ...readiness, state: gateResult.state as typeof readiness.state }
      : readiness;

    // F3: Compute percentile ranks for all 6 capabilities
    const percentileRanks = computeAllPercentiles(
      capabilityScores,
      roleArchetype.family,
      roleArchetype.seniority
    );

    // D1: Narrative — static template is a fallback only; LLM narrative is preferred
    // and surfaced at the results level (assessment.ts completeSession)
    const narrative = selectNarrative(gatedReadiness.state, capabilityScores, roleArchetype.id);

    return {
      overallScore,
      capabilityScores,
      signalScores,
      readiness: gatedReadiness,
      narrative,
      confidenceProfile,
      confidenceGate: gateResult,
      percentileRanks,
      normGroupVersion: NORM_GROUP_VERSION,
      failureModes,
      contradictions,
      gamingAnalysis,
      roleArchetype,
      totalAnswers: answers.length,
      avgConfidence,
      riskBand,
    };
  }
}

// ─── Narrative Templates ──────────────────────────────────────────────────────

/**
 * C1.4: Narrative leads with the weakest domain when at_risk or unsafe.
 * Sorted by score ascending so the lowest-scoring domain is named first.
 * This ensures the narrative is actionable rather than generic.
 */
function selectNarrative(
  state: string,
  capabilityScores: Record<CapabilityKey, CapabilityScore>,
  roleId: string
): string {
  // Sort capabilities by score ascending to identify weakest first
  const sortedByScore = Object.entries(capabilityScores)
    .sort(([, a], [, b]) => a.score - b.score);

  const weakCapabilities = sortedByScore
    .filter(([, v]) => v.score < 45)
    .map(([, v]) => v.displayName);

  const developingCapabilities = sortedByScore
    .filter(([, v]) => v.score >= 45 && v.score < 75)
    .map(([, v]) => v.displayName);

  const strongCapabilities = sortedByScore
    .filter(([, v]) => v.score >= 75)
    .reverse() // Highest score first for strengths
    .map(([, v]) => v.displayName);

  // Weakest domain is the first entry in sortedByScore
  const weakestDomain = sortedByScore[0]?.[1]?.displayName ?? "AI capability";
  const weakestScore = sortedByScore[0]?.[1]?.score ?? 0;

  if (state === "safe") {
    const strengthStr = strongCapabilities.length > 0
      ? `Particular strengths were observed in ${strongCapabilities.slice(0, 2).join(" and ")}.`
      : "";
    const developStr = developingCapabilities.length > 0
      ? ` Continue to develop ${developingCapabilities[0]} to maintain readiness as AI use cases expand.`
      : "";
    return `You are demonstrating strong, credible AI capability across the assessed domains. Your responses show proportionate judgement, appropriate validation behaviour, and sound governance awareness. ${strengthStr}${developStr} Continue to apply the same critical thinking as AI tools evolve and new use cases emerge.`;
  }

  if (state === "at_risk") {
    // C1.4: Lead with the weakest domain
    const leadStr = weakCapabilities.length > 0
      ? `The most significant development need identified is in ${weakCapabilities[0]} (score: ${weakestScore}/100).`
      : developingCapabilities.length > 0
      ? `The area most in need of development is ${developingCapabilities[0]}.`
      : "Some inconsistencies were detected in your responses.";
    const additionalStr = weakCapabilities.length > 1
      ? ` Additional gaps were identified in ${weakCapabilities.slice(1, 3).join(" and ")}.`
      : "";
    return `Your AI capability is developing, with targeted improvement needed before unsupervised AI use. ${leadStr}${additionalStr} Focus on building confidence in validating AI outputs, recognising when escalation is genuinely required, and applying governance principles proportionately. Targeted learning in these areas will strengthen your overall readiness.`;
  }

  if (state === "unsafe") {
    // C1.4: Lead with the weakest domain for unsafe classification
    const criticalStr = weakCapabilities.length > 0
      ? `The most critical gap is in ${weakCapabilities[0]} (score: ${weakestScore}/100), which presents a material risk in AI-assisted HR decisions.`
      : `Critical patterns were detected in ${weakestDomain} that present a material risk.`;
    return `The assessment has identified critical gaps in AI capability that require immediate attention. ${criticalStr} Specific patterns detected include insufficient validation of AI outputs, inappropriate use of AI in sensitive HR contexts, and governance bypasses. Immediate targeted development is required before AI use is appropriate. Your line manager and HR governance team should be informed of these results.`;
  }

  return `Insufficient evidence was collected to make a reliable readiness classification. Please complete the full assessment to receive a comprehensive capability profile.`;
}
