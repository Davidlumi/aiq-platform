/**
 * Adaptive Learning Path Generator — AiQ Platform
 *
 * Implements the 4-Stage Learning Prescription Engine per Adaptive Learning v1.0 §2.2:
 *   Stage 1 — Block Resolution: blocking failure modes addressed first
 *   Stage 2 — Foundation Before Strategy: foundation domains first; Foundation Gap state stops here
 *   Stage 3 — Regulatory and Operational Urgency: UK regulatory requirements before strategic
 *   Stage 4 — Strategic Development: remaining gaps by gap magnitude × role weight × strategic importance
 *
 * Transfer Evidence (§5.1): completionState: not_started | opened | partial | completed | completed_with_engagement
 * No-Transfer Findings (§5.4): noTransferCount tracked per plan item; after 2 → honest_disclosure
 * Learning-Aware Reassessment (§6): buildLearningAwareContext() for next assessment session
 */

import type { CapabilityGap, GapAnalysisResult, CapabilityKey } from "./gapAnalysisEngine";

export type Modality = "tutorial" | "practical" | "case_study" | "quiz" | "scenario" | "video" | "reflection" | "coaching";
export type Phase = "foundation" | "development" | "practice" | "validation";
export type PrescriptionStage = 1 | 2 | 3 | 4;

export interface ModuleCandidate {
  id: string;
  key: string;
  title: string;
  capability: string;
  signalKeys?: string;
  modality: Modality;
  difficulty: number;
  durationMins: number;
  levelLabel: string;
  isBlockResolution?: boolean;
  regulatoryTags?: string;
}

export interface PlanItem {
  moduleId: string;
  orderIndex: number;
  phase: Phase;
  required: boolean;
  unlockAfterModuleId: string | null;
  reasonJson: {
    capability: string;
    gapSeverity: string;
    modalityReason: string;
    roleRelevance: string;
    difficultyRationale: string;
    prescriptionStage: PrescriptionStage;
    signalConnection?: string;
    regulatoryDriver?: string;
  };
}

export interface LearningAwareContext {
  moduleId: string;
  title: string;
  signals: string[];
  completedAt: number;
}

export type TransferFinding = "clean_transfer" | "broad_development" | "no_transfer" | "attention_warranted";

const FOUNDATION_DOMAINS: CapabilityKey[] = ["ai_interaction", "ai_output_evaluation"];
const BLOCKING_FAILURE_MODES = ["blind_acceptance", "hallucination_acceptance", "critical_failure"];

const MODALITY_PHASE: Record<Modality, Phase> = {
  tutorial: "foundation", video: "foundation", quiz: "validation",
  reflection: "development", coaching: "development",
  practical: "practice", case_study: "practice", scenario: "practice",
};

const MODALITY_REASONS: Record<Modality, string> = {
  tutorial:   "Builds foundational conceptual knowledge before practical application",
  video:      "Provides visual demonstration of key concepts and real-world examples",
  quiz:       "Validates knowledge retention and identifies remaining gaps",
  reflection: "Connects new knowledge to existing experience through guided reflection",
  coaching:   "Provides personalised guidance and addresses specific misconceptions",
  practical:  "Develops hands-on skills through structured exercises with real HR scenarios",
  case_study: "Applies knowledge to complex, realistic HR situations requiring judgement",
  scenario:   "Practises situational judgement in high-stakes HR decision contexts",
};

function getDifficultyRange(severity: string): [number, number] {
  switch (severity) {
    case "critical":   return [1, 3];
    case "developing": return [2, 4];
    case "proficient": return [3, 4];
    case "advanced":   return [4, 5];
    default:           return [1, 3];
  }
}

function addModules(
  planItems: PlanItem[],
  usedModuleIds: Set<string>,
  modules: ModuleCandidate[],
  gap: CapabilityGap,
  stage: PrescriptionStage,
  required: boolean,
  extra: Partial<PlanItem["reasonJson"]> = {}
): void {
  for (const mod of modules) {
    if (usedModuleIds.has(mod.id)) continue;
    const signals = mod.signalKeys ? mod.signalKeys.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
    planItems.push({
      moduleId: mod.id,
      orderIndex: planItems.length + 1,
      phase: MODALITY_PHASE[mod.modality as Modality] ?? "foundation",
      required,
      unlockAfterModuleId: null,
      reasonJson: {
        capability: gap.label,
        gapSeverity: gap.severity,
        modalityReason: MODALITY_REASONS[mod.modality as Modality],
        roleRelevance: `Addresses ${gap.severity} gap in ${gap.label} (score: ${gap.score} vs benchmark: ${gap.benchmark})`,
        difficultyRationale: `Difficulty ${mod.difficulty} appropriate for ${gap.severity} gap`,
        prescriptionStage: stage,
        signalConnection: signals.length ? `Targets signal(s): ${signals.join(", ")}` : undefined,
        ...extra,
      },
    });
    usedModuleIds.add(mod.id);
  }
}

export function generateAdaptivePlan(
  gapAnalysis: GapAnalysisResult,
  availableModules: ModuleCandidate[],
  options: {
    maxModules?: number;
    includeOptional?: boolean;
    roleKey?: string;
    blockingFailureModes?: string[];
    foundationGapState?: boolean;
    ukRegulatoryFrameworks?: string[];
    timeBudgetMinutes?: number;
  } = {}
): PlanItem[] {
  const {
    maxModules = 30,
    includeOptional = true,
    blockingFailureModes = [],
    foundationGapState = false,
    ukRegulatoryFrameworks = [],
    timeBudgetMinutes,
  } = options;

  const planItems: PlanItem[] = [];
  const usedModuleIds = new Set<string>();
  const prioritisedCaps = gapAnalysis.priorityOrder as CapabilityKey[];

  // Stage 1: Block Resolution
  const hasBlockingFailure = blockingFailureModes.some(m => BLOCKING_FAILURE_MODES.includes(m));
  if (hasBlockingFailure) {
    for (const cap of FOUNDATION_DOMAINS) {
      const gap = gapAnalysis.capabilityGaps[cap];
      if (!gap) continue;
      const mods = availableModules.filter(m =>
        m.capability === cap && (m.isBlockResolution === true || m.key?.includes("block_resolution"))
      ).slice(0, 2);
      addModules(planItems, usedModuleIds, mods, gap, 1, true, {
        roleRelevance: "Block-resolution module — must be completed before any other development",
      });
    }
  }

  // Stage 2: Foundation Before Strategy
  for (const cap of FOUNDATION_DOMAINS) {
    const gap = gapAnalysis.capabilityGaps[cap];
    if (!gap || !["critical", "developing"].includes(gap.severity)) continue;
    const [minDiff, maxDiff] = getDifficultyRange(gap.severity);
    const practiceCount = gap.severity === "critical" ? 3 : 2;
    addModules(planItems, usedModuleIds,
      availableModules.filter(m => m.capability === cap && ["tutorial","video"].includes(m.modality) && m.difficulty <= minDiff + 1 && !usedModuleIds.has(m.id)).slice(0, 2),
      gap, 2, true);
    addModules(planItems, usedModuleIds,
      availableModules.filter(m => m.capability === cap && ["reflection","coaching"].includes(m.modality) && !usedModuleIds.has(m.id)).slice(0, 1),
      gap, 2, gap.severity === "critical");
    addModules(planItems, usedModuleIds,
      availableModules.filter(m => m.capability === cap && ["practical","case_study","scenario"].includes(m.modality) && m.difficulty >= minDiff && m.difficulty <= maxDiff && !usedModuleIds.has(m.id)).slice(0, practiceCount),
      gap, 2, gap.severity === "critical");
  }

  if (foundationGapState) {
    applyUnlockDependencies(planItems, availableModules);
    const finalItems = planItems.slice(0, maxModules);
    finalItems.forEach((item, i) => { item.orderIndex = i + 1; });
    return applyTimeBudget(finalItems, availableModules, timeBudgetMinutes);
  }

  // Stage 3: Regulatory and Operational Urgency
  if (ukRegulatoryFrameworks.length > 0) {
    const strategicCaps = prioritisedCaps.filter(c => !FOUNDATION_DOMAINS.includes(c));
    for (const cap of strategicCaps) {
      const gap = gapAnalysis.capabilityGaps[cap];
      if (!gap || !["critical", "developing"].includes(gap.severity)) continue;
      const [minDiff, maxDiff] = getDifficultyRange(gap.severity);
      const regMods = availableModules.filter(m =>
        m.capability === cap &&
        m.regulatoryTags && ukRegulatoryFrameworks.some(f => m.regulatoryTags!.includes(f)) &&
        m.difficulty >= minDiff && m.difficulty <= maxDiff && !usedModuleIds.has(m.id)
      ).slice(0, 2);
      addModules(planItems, usedModuleIds, regMods, gap, 3, true, {
        regulatoryDriver: `Required by: ${ukRegulatoryFrameworks.join(", ")}`,
        roleRelevance: "Regulatory readiness requirement — operationally urgent",
      });
    }
  }

  // Stage 4: Strategic Development
  const remainingCaps = prioritisedCaps.filter(c => !FOUNDATION_DOMAINS.includes(c));
  for (const cap of remainingCaps) {
    const gap = gapAnalysis.capabilityGaps[cap];
    if (!gap) continue;
    const [minDiff, maxDiff] = getDifficultyRange(gap.severity);
    const practiceCount = gap.severity === "critical" ? 3 : gap.severity === "developing" ? 2 : 1;
    addModules(planItems, usedModuleIds,
      availableModules.filter(m => m.capability === cap && ["tutorial","video"].includes(m.modality) && m.difficulty <= minDiff + 1 && !usedModuleIds.has(m.id)).slice(0, 1),
      gap, 4, gap.severity === "critical");
    addModules(planItems, usedModuleIds,
      availableModules.filter(m => m.capability === cap && ["reflection","coaching"].includes(m.modality) && !usedModuleIds.has(m.id)).slice(0, 1),
      gap, 4, gap.severity === "critical");
    addModules(planItems, usedModuleIds,
      availableModules.filter(m => m.capability === cap && ["practical","case_study","scenario"].includes(m.modality) && m.difficulty >= minDiff && m.difficulty <= maxDiff && !usedModuleIds.has(m.id)).slice(0, practiceCount),
      gap, 4, gap.severity === "critical");
    if (includeOptional) {
      addModules(planItems, usedModuleIds,
        availableModules.filter(m => m.capability === cap && m.modality === "quiz" && !usedModuleIds.has(m.id)).slice(0, 1),
        gap, 4, false);
    }
  }

  applyUnlockDependencies(planItems, availableModules);
  const finalItems = planItems.slice(0, maxModules);
  finalItems.forEach((item, i) => { item.orderIndex = i + 1; });
  return applyTimeBudget(finalItems, availableModules, timeBudgetMinutes);
}

function applyUnlockDependencies(planItems: PlanItem[], availableModules: ModuleCandidate[]): void {
  const foundationByCapability = new Map<string, string>();
  for (const item of planItems) {
    if (item.phase === "foundation") {
      const mod = availableModules.find(m => m.id === item.moduleId);
      if (mod) foundationByCapability.set(mod.capability, item.moduleId);
    }
  }
  for (const item of planItems) {
    if (item.phase === "practice") {
      const mod = availableModules.find(m => m.id === item.moduleId);
      if (mod && foundationByCapability.has(mod.capability)) {
        item.unlockAfterModuleId = foundationByCapability.get(mod.capability)!;
      }
    }
  }
}

function applyTimeBudget(planItems: PlanItem[], availableModules: ModuleCandidate[], timeBudgetMinutes?: number): PlanItem[] {
  if (!timeBudgetMinutes) return planItems;
  let totalMins = 0;
  return planItems.map(item => {
    const mod = availableModules.find(m => m.id === item.moduleId);
    const duration = mod?.durationMins ?? 20;
    if (item.required || totalMins + duration <= timeBudgetMinutes) {
      totalMins += duration;
      return item;
    }
    return { ...item, required: false };
  });
}

export function buildLearningAwareContext(
  completedPlanItems: Array<{ moduleId: string; completedAt: number | null; completionState: string }>,
  availableModules: ModuleCandidate[]
): LearningAwareContext[] {
  return completedPlanItems
    .filter(item => item.completionState === "completed_with_engagement" && item.completedAt)
    .map(item => {
      const mod = availableModules.find(m => m.id === item.moduleId);
      const signals = mod?.signalKeys ? mod.signalKeys.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
      return { moduleId: item.moduleId, title: mod?.title ?? item.moduleId, signals, completedAt: item.completedAt! };
    });
}

export function classifyTransferFinding(
  targetedSignals: string[],
  priorSignalScores: Record<string, number>,
  postSignalScores: Record<string, number>
): TransferFinding {
  if (targetedSignals.length === 0) return "no_transfer";
  const IMPROVEMENT_THRESHOLD = 0.05;
  const DECLINE_THRESHOLD = -0.05;
  const targetedImproved = targetedSignals.filter(s => (postSignalScores[s] ?? 0) - (priorSignalScores[s] ?? 0) >= IMPROVEMENT_THRESHOLD);
  const nonTargetedSignals = Object.keys(postSignalScores).filter(s => !targetedSignals.includes(s));
  const nonTargetedImproved = nonTargetedSignals.filter(s => (postSignalScores[s] ?? 0) - (priorSignalScores[s] ?? 0) >= IMPROVEMENT_THRESHOLD);
  const nonTargetedDeclined = nonTargetedSignals.filter(s => (postSignalScores[s] ?? 0) - (priorSignalScores[s] ?? 0) <= DECLINE_THRESHOLD);
  const targetedImprovedRatio = targetedImproved.length / targetedSignals.length;
  const nonTargetedDeclinedRatio = nonTargetedSignals.length > 0 ? nonTargetedDeclined.length / nonTargetedSignals.length : 0;
  if (targetedImprovedRatio >= 0.5 && nonTargetedDeclinedRatio < 0.3) {
    return nonTargetedImproved.length > nonTargetedSignals.length * 0.3 ? "broad_development" : "clean_transfer";
  }
  if (targetedImprovedRatio < 0.3 && nonTargetedDeclinedRatio >= 0.3) return "attention_warranted";
  return "no_transfer";
}

export function getNoTransferResponse(
  noTransferCount: number,
  currentModality: Modality
): { action: "alternative_modality" | "add_scaffolding" | "honest_disclosure"; alternativeModality?: Modality; message: string } {
  const MODALITY_ALTERNATIVES: Partial<Record<Modality, Modality>> = {
    scenario: "coaching", coaching: "scenario", tutorial: "reflection",
    reflection: "tutorial", practical: "case_study", case_study: "practical", video: "coaching",
  };
  if (noTransferCount === 0) {
    const alt = MODALITY_ALTERNATIVES[currentModality] ?? "coaching";
    return { action: "alternative_modality", alternativeModality: alt, message: `We have prescribed an alternative learning approach (${alt}) to address this capability signal differently.` };
  }
  if (noTransferCount === 1) {
    return { action: "add_scaffolding", message: "We have added foundational scaffolding modules to support this capability area before retrying." };
  }
  return { action: "honest_disclosure", message: "After two learning approaches, this capability has not yet developed through the available modules. Coaching, mentoring, or external development may be more effective for your context." };
}

export interface SpacedRepetitionUpdate {
  nextDueAt: number;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
}

export function computeNextReview(
  score: number,
  currentIntervalDays: number,
  currentEaseFactor: number,
  currentRepetitions: number
): SpacedRepetitionUpdate {
  const quality = Math.round((score / 100) * 5);
  let newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(1.3, Math.min(2.5, newEaseFactor));
  let newIntervalDays: number;
  let newRepetitions: number;
  if (quality < 3) { newIntervalDays = 1; newRepetitions = 0; }
  else if (currentRepetitions === 0) { newIntervalDays = 1; newRepetitions = 1; }
  else if (currentRepetitions === 1) { newIntervalDays = 6; newRepetitions = 2; }
  else { newIntervalDays = Math.round(currentIntervalDays * newEaseFactor); newRepetitions = currentRepetitions + 1; }
  return { nextDueAt: Date.now() + newIntervalDays * 24 * 60 * 60 * 1000, intervalDays: newIntervalDays, easeFactor: newEaseFactor, repetitions: newRepetitions };
}
