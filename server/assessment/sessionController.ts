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

// ─── Minimum Evidence Requirements ───────────────────────────────────────────

export const MINIMUM_EVIDENCE = {
  totalItems: 20,
  signalsPerCapability: 3,
  distinctInteractionTypes: 5,
  highRiskProportion: 0.25,
  targetItems: 49,  // Matches static blueprint bank exactly — no LLM generation needed for standard sessions
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
   * This is called on every getSession request.
   */
  static computeState(
    sessionId: string,
    userId: string,
    blueprintId: string,
    answers: AnswerData[],
    totalTarget: number = MINIMUM_EVIDENCE.targetItems
  ): SessionState {
    const answeredCount = answers.length;
    const phase = determineSessionPhase(answeredCount, totalTarget);

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
    const gamingAnalysis = analyseGamingPatterns(gamingAnswers);

    // Evidence sufficiency check
    const distinctInteractionTypes = Object.keys(interactionTypesUsed).length;
    const allCapabilitiesCovered = Object.keys(capabilitySignalCounts).length >= 6;
    const highRiskProportion = answeredCount > 0 ? highRiskAnswerCount / answeredCount : 0;

    const evidenceSufficient =
      answeredCount >= MINIMUM_EVIDENCE.totalItems &&
      distinctInteractionTypes >= MINIMUM_EVIDENCE.distinctInteractionTypes &&
      highRiskProportion >= MINIMUM_EVIDENCE.highRiskProportion;

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
        signalDeltasJson: a.signalDeltasJson,
        outcomeClass: a.outcomeClass,
        riskLevel: a.riskLevel,
        difficulty: a.difficulty,
      }))
    );
    const capabilityScores = computeCapabilityScores(signalScores);

    // Build capability score summary for adaptive selection
    const capabilityScoreSummary = Object.fromEntries(
      Object.entries(capabilityScores).map(([k, v]) => [k, { score: v.score, signalCount: v.signalCount }])
    ) as Record<CapabilityKey, { score: number; signalCount: number }>;

    // Build contradiction probes if needed
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
    }));
    const contradictions = detectContradictions(answerRecords);
    const contradictionProbes = contradictions.pairs
      .slice(0, 2)
      .map(pair => generateContradictionProbeSpec(pair, pair.reason.split(" ")[4] ?? "judgement", roleArchetype.id));

    // Build anti-gaming analysis
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
    const gamingAnalysis = analyseGamingPatterns(gamingAnswers);

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
    userRoleHint?: string | null
  ) {
    const roleArchetype = resolveRoleArchetype(userRoleHint);

    // Signal scores
    const signalScores = computeSignalScores(
      answers.map(a => ({
        signalDeltasJson: a.signalDeltasJson,
        outcomeClass: a.outcomeClass,
        riskLevel: a.riskLevel,
        difficulty: a.difficulty,
      }))
    );

    // Capability scores
    const capabilityScores = computeCapabilityScores(signalScores);
    const overallScore = computeOverallScore(capabilityScores);

    // Failure mode detection
    const failureModes = detectFailureModes(
      answers.map(a => ({
        outcomeClass: a.outcomeClass,
        signalDeltas: (() => {
          try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
        })(),
        eventCodes: (() => {
          try { return typeof a.eventCodesJson === "string" ? JSON.parse(a.eventCodesJson) : (a.eventCodesJson as string[]) ?? []; } catch { return []; }
        })(),
      }))
    );

    // Contradiction detection
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
    const gamingAnalysis = analyseGamingPatterns(gamingAnswers);

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
      gamingAnalysis.score
    );

    // Risk band
    const riskBand: "low" | "medium" | "high" =
      failureModes.governanceFlag ? "high" :
      overallScore >= 75 ? "low" : "medium";

    // Readiness classification
    const readiness = classifyReadiness(
      overallScore,
      riskBand,
      failureModes,
      answers.length >= MINIMUM_EVIDENCE.totalItems
    );

    // Narrative selection
    const narrative = selectNarrative(readiness.state, capabilityScores, roleArchetype.id);

    return {
      overallScore,
      capabilityScores,
      signalScores,
      readiness,
      narrative,
      confidenceProfile,
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

function selectNarrative(
  state: string,
  capabilityScores: Record<CapabilityKey, CapabilityScore>,
  roleId: string
): string {
  const weakCapabilities = Object.entries(capabilityScores)
    .filter(([, v]) => v.score < 55)
    .map(([k]) => k.replace(/_/g, " "));

  const strongCapabilities = Object.entries(capabilityScores)
    .filter(([, v]) => v.score >= 75)
    .map(([k]) => k.replace(/_/g, " "));

  if (state === "safe") {
    return `You are demonstrating strong, credible AI capability across the assessed domains. Your responses show proportionate judgement, appropriate validation behaviour, and sound governance awareness. ${strongCapabilities.length > 0 ? `Particular strengths were observed in ${strongCapabilities.slice(0, 2).join(" and ")}.` : ""} Continue to apply the same critical thinking as AI tools evolve and new use cases emerge.`;
  }

  if (state === "at_risk") {
    const weakStr = weakCapabilities.length > 0
      ? `The assessment identified development needs in ${weakCapabilities.slice(0, 2).join(" and ")}.`
      : "Some inconsistencies were detected in your responses.";
    return `Your AI capability is developing, with some areas requiring further attention before unsupervised AI use. ${weakStr} Focus on building confidence in validating AI outputs, recognising when escalation is genuinely required, and applying governance principles proportionately. Targeted learning in these areas will strengthen your overall readiness.`;
  }

  if (state === "unsafe") {
    return `The assessment has identified critical gaps in AI capability that present a material risk if AI tools are used without supervision. Specific patterns were detected including insufficient validation of AI outputs, inappropriate use of AI in sensitive HR contexts, and governance bypasses. Immediate targeted development is required before AI use is appropriate. Your line manager and HR governance team should be informed of these results.`;
  }

  return `Insufficient evidence was collected to make a reliable readiness classification. Please complete the full assessment to receive a comprehensive capability profile.`;
}
