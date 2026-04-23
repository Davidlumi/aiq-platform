/**
 * Adaptive Learning Path Generator — AiQ Platform
 *
 * Generates a bespoke, sequenced learning plan from a gap analysis result
 * using the 70/20/10 model and spaced repetition principles.
 *
 * 70/20/10 Model Implementation:
 *   70% — Experiential: scenarios, practicals, case studies (phase: practice)
 *   20% — Social/Reflective: coaching, reflections, peer scenarios (phase: development)
 *   10% — Formal: tutorials, videos, quizzes (phase: foundation)
 *
 * Sequencing Rules:
 *   1. Foundation modules first (tutorials/videos) — build conceptual knowledge
 *   2. Development modules next (reflections/coaching) — connect to experience
 *   3. Practice modules last (scenarios/practicals/case studies) — apply & consolidate
 *   4. Validation quiz at the end of each capability cluster
 *
 * Difficulty Progression:
 *   - Critical gaps: start at difficulty 1-2, progress to 3-4
 *   - Developing gaps: start at difficulty 2-3, progress to 4
 *   - Proficient: start at difficulty 3, add stretch modules at 4-5
 *   - Advanced: optional challenge modules at difficulty 4-5
 *
 * Spaced Repetition (SM-2 algorithm):
 *   - After completing a module, schedule a review based on score
 *   - Score >= 80%: interval × 2.5 (ease factor increase)
 *   - Score 60-79%: interval × 1.5 (ease factor unchanged)
 *   - Score < 60%: reset to 1 day (ease factor decrease)
 */

import type { CapabilityGap, GapAnalysisResult, CapabilityKey } from "./gapAnalysisEngine";

export type Modality = "tutorial" | "practical" | "case_study" | "quiz" | "scenario" | "video" | "reflection" | "coaching";
export type Phase = "foundation" | "development" | "practice" | "validation";

export interface ModuleCandidate {
  id: string;
  key: string;
  title: string;
  capability: string;
  modality: Modality;
  difficulty: number;
  durationMins: number;
  levelLabel: string;
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
  };
}

// ─── Modality → Phase mapping ─────────────────────────────────────────────────
const MODALITY_PHASE: Record<Modality, Phase> = {
  tutorial:   "foundation",
  video:      "foundation",
  quiz:       "validation",
  reflection: "development",
  coaching:   "development",
  practical:  "practice",
  case_study: "practice",
  scenario:   "practice",
};

// ─── Modality reasons ─────────────────────────────────────────────────────────
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

// ─── Difficulty selection by severity ────────────────────────────────────────
function getDifficultyRange(severity: string): [number, number] {
  switch (severity) {
    case "critical":    return [1, 3];
    case "developing":  return [2, 4];
    case "proficient":  return [3, 4];
    case "advanced":    return [4, 5];
    default:            return [1, 3];
  }
}

// ─── Core Generator ───────────────────────────────────────────────────────────

export function generateAdaptivePlan(
  gapAnalysis: GapAnalysisResult,
  availableModules: ModuleCandidate[],
  options: {
    maxModules?: number;
    includeOptional?: boolean;
    roleKey?: string;
  } = {}
): PlanItem[] {
  const { maxModules = 30, includeOptional = true } = options;
  const planItems: PlanItem[] = [];
  const usedModuleIds = new Set<string>();

  // Process capabilities in priority order (most critical first)
  const prioritisedCaps = gapAnalysis.priorityOrder;

  // Phase 1: Foundation — 1-2 tutorial/video per critical/developing capability
  for (const cap of prioritisedCaps) {
    const gap = gapAnalysis.capabilityGaps[cap as CapabilityKey];
    if (!["critical", "developing"].includes(gap.severity)) continue;

    const [minDiff] = getDifficultyRange(gap.severity);
    const foundationModules = availableModules.filter(m =>
      m.capability === cap &&
      ["tutorial", "video"].includes(m.modality) &&
      m.difficulty <= minDiff + 1 &&
      !usedModuleIds.has(m.id)
    ).slice(0, 2);

    for (const mod of foundationModules) {
      planItems.push({
        moduleId: mod.id,
        orderIndex: planItems.length + 1,
        phase: "foundation",
        required: gap.severity === "critical",
        unlockAfterModuleId: null,
        reasonJson: {
          capability: gap.label,
          gapSeverity: gap.severity,
          modalityReason: MODALITY_REASONS[mod.modality as Modality],
          roleRelevance: `Addresses ${gap.severity} gap in ${gap.label} (score: ${gap.score} vs benchmark: ${gap.benchmark})`,
          difficultyRationale: `Starting at difficulty ${mod.difficulty} appropriate for ${gap.severity} gap`,
        },
      });
      usedModuleIds.add(mod.id);
    }
  }

  // Phase 2: Development — 1 reflection/coaching per capability with gaps
  for (const cap of prioritisedCaps) {
    const gap = gapAnalysis.capabilityGaps[cap as CapabilityKey];
    if (!["critical", "developing", "proficient"].includes(gap.severity)) continue;

    const devModules = availableModules.filter(m =>
      m.capability === cap &&
      ["reflection", "coaching"].includes(m.modality) &&
      !usedModuleIds.has(m.id)
    ).slice(0, 1);

    for (const mod of devModules) {
      planItems.push({
        moduleId: mod.id,
        orderIndex: planItems.length + 1,
        phase: "development",
        required: gap.severity === "critical",
        unlockAfterModuleId: null,
        reasonJson: {
          capability: gap.label,
          gapSeverity: gap.severity,
          modalityReason: MODALITY_REASONS[mod.modality as Modality],
          roleRelevance: `Connects learning to your HR practice context`,
          difficultyRationale: `Reflective practice to consolidate foundational knowledge`,
        },
      });
      usedModuleIds.add(mod.id);
    }
  }

  // Phase 3: Practice — 2-3 practical/case_study/scenario per critical/developing cap
  for (const cap of prioritisedCaps) {
    const gap = gapAnalysis.capabilityGaps[cap as CapabilityKey];
    const [minDiff, maxDiff] = getDifficultyRange(gap.severity);
    const practiceCount = gap.severity === "critical" ? 3 : gap.severity === "developing" ? 2 : 1;

    const practiceModules = availableModules.filter(m =>
      m.capability === cap &&
      ["practical", "case_study", "scenario"].includes(m.modality) &&
      m.difficulty >= minDiff && m.difficulty <= maxDiff &&
      !usedModuleIds.has(m.id)
    ).slice(0, practiceCount);

    for (const mod of practiceModules) {
      planItems.push({
        moduleId: mod.id,
        orderIndex: planItems.length + 1,
        phase: "practice",
        required: gap.severity === "critical",
        unlockAfterModuleId: null,
        reasonJson: {
          capability: gap.label,
          gapSeverity: gap.severity,
          modalityReason: MODALITY_REASONS[mod.modality as Modality],
          roleRelevance: `Builds applied capability through realistic HR scenarios`,
          difficultyRationale: `Difficulty ${mod.difficulty} matches your current capability level`,
        },
      });
      usedModuleIds.add(mod.id);
    }
  }

  // Phase 4: Validation — 1 quiz per capability cluster
  for (const cap of prioritisedCaps.slice(0, 4)) {
    const gap = gapAnalysis.capabilityGaps[cap as CapabilityKey];
    const quizModules = availableModules.filter(m =>
      m.capability === cap &&
      m.modality === "quiz" &&
      !usedModuleIds.has(m.id)
    ).slice(0, 1);

    for (const mod of quizModules) {
      planItems.push({
        moduleId: mod.id,
        orderIndex: planItems.length + 1,
        phase: "validation",
        required: false,
        unlockAfterModuleId: null,
        reasonJson: {
          capability: gap.label,
          gapSeverity: gap.severity,
          modalityReason: MODALITY_REASONS.quiz,
          roleRelevance: `Validates learning progress and identifies remaining gaps`,
          difficultyRationale: `Knowledge check appropriate after completing practice modules`,
        },
      });
      usedModuleIds.add(mod.id);
    }
  }

  // Add unlock dependencies: practice modules unlock after foundation
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

  // Re-index and cap
  const finalItems = planItems.slice(0, maxModules);
  finalItems.forEach((item, i) => { item.orderIndex = i + 1; });

  return finalItems;
}

// ─── SM-2 Spaced Repetition ───────────────────────────────────────────────────

export interface SpacedRepetitionUpdate {
  nextDueAt: number;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
}

export function computeNextReview(
  score: number, // 0-100
  currentIntervalDays: number,
  currentEaseFactor: number,
  currentRepetitions: number
): SpacedRepetitionUpdate {
  // Normalise score to SM-2 quality (0-5)
  const quality = Math.round((score / 100) * 5);

  let newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(1.3, Math.min(2.5, newEaseFactor));

  let newIntervalDays: number;
  let newRepetitions: number;

  if (quality < 3) {
    // Failed — reset
    newIntervalDays = 1;
    newRepetitions = 0;
  } else if (currentRepetitions === 0) {
    newIntervalDays = 1;
    newRepetitions = 1;
  } else if (currentRepetitions === 1) {
    newIntervalDays = 6;
    newRepetitions = 2;
  } else {
    newIntervalDays = Math.round(currentIntervalDays * newEaseFactor);
    newRepetitions = currentRepetitions + 1;
  }

  const nextDueAt = Date.now() + newIntervalDays * 24 * 60 * 60 * 1000;

  return {
    nextDueAt,
    intervalDays: newIntervalDays,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
  };
}
