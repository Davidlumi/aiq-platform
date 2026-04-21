/**
 * Adaptive Difficulty Engine v2 (ADE-2)
 * Six independent difficulty dimensions that adjust across simulations.
 * Extends ADE-1 (within-session item difficulty) to cross-simulation calibration.
 */

import { nanoid } from "nanoid";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { ailDifficultyProfiles } from "../../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DifficultyProfile {
  signalClarity: number;           // 1-5: 5=very clear AI errors, 1=extremely subtle
  ambiguity: number;               // 1-5: 1=clear single answer, 5=multiple defensible answers
  politicalComplexity: number;     // 1-5: 1=moderate pressure, 5=maximum CEO/board pressure
  informationalCompleteness: number; // 1-5: 5=complete data provided, 1=significant gaps
  timePressure: number;            // 1-5: 1=no deadline, 5=real-time decision required
  consequenceVisibility: number;   // 1-5: 5=consequences explained, 1=not explained
}

export interface SimulationPerformance {
  // Per-dimension performance scores (0-1)
  signalDetectionRate: number;     // % of AI errors correctly identified
  ambiguityHandlingScore: number;  // quality of decisions in ambiguous situations
  pressureResistanceScore: number; // maintained correct position under pressure
  dataInterpretationScore: number; // quality of data interpretation
  timeDecisionQuality: number;     // quality of decisions under time pressure
  consequenceAwarenessScore: number; // awareness of downstream consequences
  // Overall
  overallScore: number;
  failureModesTriggered: string[];
}

// Adjustment rules — how each dimension changes based on performance
const ADJUSTMENT_RULES: Record<keyof DifficultyProfile, {
  increaseThreshold: number;  // performance above this → increase difficulty
  decreaseThreshold: number;  // performance below this → decrease difficulty
  performanceKey: keyof SimulationPerformance;
}> = {
  signalClarity: {
    increaseThreshold: 0.8,
    decreaseThreshold: 0.4,
    performanceKey: "signalDetectionRate",
  },
  ambiguity: {
    increaseThreshold: 0.75,
    decreaseThreshold: 0.35,
    performanceKey: "ambiguityHandlingScore",
  },
  politicalComplexity: {
    increaseThreshold: 0.8,
    decreaseThreshold: 0.4,
    performanceKey: "pressureResistanceScore",
  },
  informationalCompleteness: {
    increaseThreshold: 0.75,
    decreaseThreshold: 0.35,
    performanceKey: "dataInterpretationScore",
  },
  timePressure: {
    increaseThreshold: 0.8,
    decreaseThreshold: 0.4,
    performanceKey: "timeDecisionQuality",
  },
  consequenceVisibility: {
    increaseThreshold: 0.75,
    decreaseThreshold: 0.35,
    performanceKey: "consequenceAwarenessScore",
  },
};

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Get the current difficulty profile for a user.
 * Creates a default profile if none exists.
 */
export async function getDifficultyProfile(
  userId: string,
  tenantId: string
): Promise<DifficultyProfile> {
  const db = await getDb();
  if (!db) return getDefaultDifficultyProfile();

  const existing = await db
    .select()
    .from(ailDifficultyProfiles)
    .where(eq(ailDifficultyProfiles.userId, userId))
    .limit(1);

  if (!existing[0]) {
    // Create default profile
    const defaultProfile = getDefaultDifficultyProfile();
    await db.insert(ailDifficultyProfiles).values({
      id: nanoid(),
      userId,
      tenantId,
      ...defaultProfile,
      dimensionPerformanceJson: JSON.stringify({}),
      adjustmentHistoryJson: JSON.stringify([]),
    });
    return defaultProfile;
  }

  return {
    signalClarity: existing[0].signalClarity,
    ambiguity: existing[0].ambiguity,
    politicalComplexity: existing[0].politicalComplexity,
    informationalCompleteness: existing[0].informationalCompleteness,
    timePressure: existing[0].timePressure,
    consequenceVisibility: existing[0].consequenceVisibility,
  };
}

/**
 * Update the difficulty profile after a simulation completes.
 * Each dimension adjusts independently based on performance.
 */
export async function updateDifficultyProfile(
  userId: string,
  tenantId: string,
  simulationId: string,
  performance: SimulationPerformance
): Promise<DifficultyProfile> {
  const db = await getDb();
  if (!db) return getDefaultDifficultyProfile();

  const current = await getDifficultyProfile(userId, tenantId);
  const adjustments: Partial<DifficultyProfile> = {};
  const adjustmentLog: Array<{ dimension: string; from: number; to: number; reason: string }> = [];

  for (const [dimension, rules] of Object.entries(ADJUSTMENT_RULES)) {
    const dim = dimension as keyof DifficultyProfile;
    const perfScore = performance[rules.performanceKey] as number;
    const currentVal = current[dim];

    let newVal = currentVal;
    let reason = "no change";

    if (perfScore >= rules.increaseThreshold && currentVal < 5) {
      // Performance is strong → increase difficulty
      newVal = Math.min(5, currentVal + 1);
      reason = `Performance ${(perfScore * 100).toFixed(0)}% ≥ threshold ${(rules.increaseThreshold * 100).toFixed(0)}%`;
    } else if (perfScore <= rules.decreaseThreshold && currentVal > 1) {
      // Performance is weak → decrease difficulty
      newVal = Math.max(1, currentVal - 1);
      reason = `Performance ${(perfScore * 100).toFixed(0)}% ≤ threshold ${(rules.decreaseThreshold * 100).toFixed(0)}%`;
    }

    // Special rule: if critical failure modes triggered, reduce ambiguity and signal clarity
    if (performance.failureModesTriggered.includes("blind_acceptance") && dim === "signalClarity") {
      newVal = Math.max(1, currentVal - 1);
      reason = "Critical failure: blind acceptance — reducing signal clarity to aid learning";
    }
    if (performance.failureModesTriggered.includes("governance_bypass") && dim === "politicalComplexity") {
      newVal = Math.min(5, currentVal + 1);
      reason = "Critical failure: governance bypass — increasing political complexity for retest";
    }

    adjustments[dim] = newVal;
    if (newVal !== currentVal) {
      adjustmentLog.push({ dimension, from: currentVal, to: newVal, reason });
    }
  }

  // Get existing history and append
  const existing = await db
    .select()
    .from(ailDifficultyProfiles)
    .where(eq(ailDifficultyProfiles.userId, userId))
    .limit(1);

  const history = JSON.parse(existing[0]?.adjustmentHistoryJson ?? "[]") as Array<unknown>;
  history.push({
    simulationId,
    timestamp: new Date().toISOString(),
    adjustments: adjustmentLog,
    performance: {
      overall: performance.overallScore,
      failureModes: performance.failureModesTriggered,
    },
  });

  // Update dimension performance tracking
  const dimPerf = JSON.parse(existing[0]?.dimensionPerformanceJson ?? "{}") as Record<string, number[]>;
  for (const [dim, rules] of Object.entries(ADJUSTMENT_RULES)) {
    const perfScore = performance[rules.performanceKey] as number;
    if (!dimPerf[dim]) dimPerf[dim] = [];
    dimPerf[dim].push(perfScore);
    // Keep last 10 scores per dimension
    if (dimPerf[dim].length > 10) dimPerf[dim] = dimPerf[dim].slice(-10);
  }

  await db
    .update(ailDifficultyProfiles)
    .set({
      ...adjustments,
      dimensionPerformanceJson: JSON.stringify(dimPerf),
      adjustmentHistoryJson: JSON.stringify(history.slice(-20)), // keep last 20
      updatedAt: new Date(),
    })
    .where(eq(ailDifficultyProfiles.userId, userId));

  return { ...current, ...adjustments };
}

/**
 * Convert difficulty profile to simulation configuration parameters.
 * These parameters are passed to the simulation engine to configure the next simulation.
 */
export function difficultyProfileToSimulationConfig(profile: DifficultyProfile): {
  aiErrorSubtlety: "obvious" | "moderate" | "subtle" | "very_subtle" | "expert_only";
  numberOfDefensibleAnswers: 1 | 2 | 3;
  stakeholderPressureLevel: "low" | "moderate" | "high" | "maximum";
  dataCompleteness: "complete" | "mostly_complete" | "partial" | "incomplete";
  hasDeadline: boolean;
  deadlineUrgency: "days" | "hours" | "minutes" | null;
  consequencesExplained: boolean;
} {
  const subtletyMap: Record<number, "obvious" | "moderate" | "subtle" | "very_subtle" | "expert_only"> = {
    5: "obvious",
    4: "moderate",
    3: "subtle",
    2: "very_subtle",
    1: "expert_only",
  };

  const defensibleAnswersMap: Record<number, 1 | 2 | 3> = {
    1: 1, 2: 1, 3: 2, 4: 2, 5: 3,
  };

  const pressureMap: Record<number, "low" | "moderate" | "high" | "maximum"> = {
    1: "low", 2: "moderate", 3: "high", 4: "high", 5: "maximum",
  };

  const dataCompletenessMap: Record<number, "complete" | "mostly_complete" | "partial" | "incomplete"> = {
    5: "complete", 4: "mostly_complete", 3: "partial", 2: "partial", 1: "incomplete",
  };

  return {
    aiErrorSubtlety: subtletyMap[profile.signalClarity] ?? "moderate",
    numberOfDefensibleAnswers: defensibleAnswersMap[profile.ambiguity] ?? 1,
    stakeholderPressureLevel: pressureMap[profile.politicalComplexity] ?? "moderate",
    dataCompleteness: dataCompletenessMap[profile.informationalCompleteness] ?? "mostly_complete",
    hasDeadline: profile.timePressure >= 2,
    deadlineUrgency:
      profile.timePressure >= 5 ? "minutes" :
      profile.timePressure >= 4 ? "hours" :
      profile.timePressure >= 2 ? "days" : null,
    consequencesExplained: profile.consequenceVisibility >= 3,
  };
}

function getDefaultDifficultyProfile(): DifficultyProfile {
  return {
    signalClarity: 4,
    ambiguity: 2,
    politicalComplexity: 2,
    informationalCompleteness: 4,
    timePressure: 2,
    consequenceVisibility: 4,
  };
}
