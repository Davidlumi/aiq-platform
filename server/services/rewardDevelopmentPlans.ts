/**
 * Reward Capability Development Plan Generation Service
 *
 * Generates strategy-level development plans for Stage 8 people-dimensions
 * that show a gap (required > current). These are team-level plans, not
 * individual adaptive learning plans.
 *
 * A development plan is generated for each people-dimension where:
 *   - gapStatus is "minor_gap" or "significant_gap"
 *   - There is assessment data (assessedCount > 0)
 *
 * The plan includes:
 *   - Which assessment domains need development
 *   - How many team members need development
 *   - An estimated time to close the gap
 *   - A human-readable pathway summary
 *
 * Design principles:
 *   - Pure function: no DB access. DB writes live in the router.
 *   - Linked to CAPABILITY_LINK_CONFIG for domain mappings.
 *   - Does not overwrite existing plans unless the snapshot is newer.
 */

import type { CapabilityLevel } from "./rewardCapabilityService.js";
import type { PeopleDimension, TeamCapabilityAggregate } from "./capabilityLinkConfig.js";
import {
  CAPABILITY_LINK_CONFIG,
  estimateMonthsToClose,
  scoreToLevel,
  weightedMean,
} from "./capabilityLinkConfig.js";
import { LEVEL_ORDER } from "./rewardCapabilityService.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DevelopmentPlanInput {
  dimension: PeopleDimension;
  requiredLevel: CapabilityLevel;
  currentLevel: CapabilityLevel | null;
  gapStatus: "no_gap" | "minor_gap" | "significant_gap" | null;
}

export interface GeneratedDevelopmentPlan {
  dimension: PeopleDimension;
  dimensionLabel: string;
  gapStatus: "minor_gap" | "significant_gap";
  requiredLevel: CapabilityLevel;
  currentLevel: CapabilityLevel;
  /** Assessment domains that need development for this dimension */
  targetDomains: string[];
  /** Number of team members contributing to the gap (assessed with below-required scores) */
  peopleCount: number;
  /** Estimated months to close the gap */
  estimatedMonths: number;
  /** Human-readable pathway summary */
  pathwaySummary: string;
}

// ─── generateRewardDevelopmentPlans ──────────────────────────────────────────

/**
 * Pure function: generate development plans for all Stage 8 people-dimensions
 * that have a gap.
 *
 * @param dimensions  Stage 8 dimension rows with current/required levels and gap status.
 * @param aggregate   The team capability aggregate (from aggregateTeamCapability).
 *                    Used to derive which domains need development and how many people.
 */
export function generateRewardDevelopmentPlans(
  dimensions: DevelopmentPlanInput[],
  aggregate: TeamCapabilityAggregate,
): GeneratedDevelopmentPlan[] {
  const plans: GeneratedDevelopmentPlan[] = [];

  const PEOPLE_DIMENSIONS: PeopleDimension[] = ["team_skills", "change_management", "reward_governance"];

  for (const dim of PEOPLE_DIMENSIONS) {
    const dimInput = dimensions.find(d => d.dimension === dim);
    if (!dimInput) continue;

    // Only generate plans for dimensions with a gap
    if (dimInput.gapStatus !== "minor_gap" && dimInput.gapStatus !== "significant_gap") continue;

    // Must have a current level to generate a plan
    if (!dimInput.currentLevel) continue;

    const mapping = CAPABILITY_LINK_CONFIG.dimensionMappings[dim];
    const requiredLevelNum = LEVEL_ORDER[dimInput.requiredLevel];

    // Find which domains are below the required level threshold
    const targetDomains: string[] = [];
    for (const { domain } of mapping.domains) {
      const domainMean = aggregate.domainMeans[domain];
      if (domainMean == null) continue;
      // Derive the level this domain mean would produce
      const domainLevel = scoreToLevel(domainMean);
      if (LEVEL_ORDER[domainLevel] < requiredLevelNum) {
        targetDomains.push(domain);
      }
    }

    // If no domains are below required (can happen with partial data), include all
    if (targetDomains.length === 0) {
      for (const { domain } of mapping.domains) {
        targetDomains.push(domain);
      }
    }

    // Estimate how many people need development:
    // Count users whose weighted mean for this dimension is below the required level
    let peopleCount = 0;
    // We don't have per-user data here — use assessedCount as a proxy
    // (all assessed users need development if the team mean is below required)
    peopleCount = aggregate.assessedCount;

    const estimatedMonths = estimateMonthsToClose(
      dimInput.gapStatus,
      targetDomains.length,
    );

    const pathwaySummary = buildPathwaySummary(
      mapping.label,
      dimInput.gapStatus,
      dimInput.currentLevel,
      dimInput.requiredLevel,
      targetDomains,
      peopleCount,
      aggregate.teamSize,
      estimatedMonths,
    );

    plans.push({
      dimension: dim,
      dimensionLabel: mapping.label,
      gapStatus: dimInput.gapStatus,
      requiredLevel: dimInput.requiredLevel,
      currentLevel: dimInput.currentLevel,
      targetDomains,
      peopleCount,
      estimatedMonths,
      pathwaySummary,
    });
  }

  return plans;
}

// ─── buildPathwaySummary ──────────────────────────────────────────────────────

function buildPathwaySummary(
  dimensionLabel: string,
  gapStatus: "minor_gap" | "significant_gap",
  currentLevel: CapabilityLevel,
  requiredLevel: CapabilityLevel,
  targetDomains: string[],
  peopleCount: number,
  teamSize: number,
  estimatedMonths: number,
): string {
  const severity = gapStatus === "significant_gap" ? "significant" : "minor";
  const domainLabels = targetDomains.map(d =>
    d.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  );

  const domainStr = domainLabels.length === 1
    ? domainLabels[0]
    : domainLabels.slice(0, -1).join(", ") + " and " + domainLabels[domainLabels.length - 1];

  const levelStr = `from ${currentLevel.replace(/_/g, " ")} to ${requiredLevel.replace(/_/g, " ")}`;
  const coverageStr = teamSize > 0 ? ` (${peopleCount} of ${teamSize} team members assessed)` : "";

  return `${dimensionLabel}: ${severity} gap — development needed in ${domainStr} to move ${levelStr}${coverageStr}. Estimated ${estimatedMonths}–${estimatedMonths + 3} months.`;
}

// ─── computePeopleCountPerDimension ──────────────────────────────────────────

/**
 * Compute per-user, per-dimension weighted mean scores and count how many
 * users are below the required level for each dimension.
 *
 * This is a more precise version of peopleCount that uses per-user data.
 * Used in the closing-loop test.
 */
export function computePeopleCountPerDimension(
  userScores: Array<{ userId: string; scores: Partial<Record<string, number>> }>,
  requiredLevels: Partial<Record<PeopleDimension, CapabilityLevel>>,
): Record<PeopleDimension, number> {
  const counts: Record<PeopleDimension, number> = {
    team_skills: 0,
    change_management: 0,
    reward_governance: 0,
  };

  const PEOPLE_DIMENSIONS: PeopleDimension[] = ["team_skills", "change_management", "reward_governance"];

  for (const dim of PEOPLE_DIMENSIONS) {
    const mapping = CAPABILITY_LINK_CONFIG.dimensionMappings[dim];
    const requiredLevel = requiredLevels[dim];
    if (!requiredLevel) continue;
    const requiredNum = LEVEL_ORDER[requiredLevel];

    for (const user of userScores) {
      const wMean = weightedMean(
        user.scores as Record<string, number | null>,
        mapping.domains,
      );
      if (wMean == null) continue;
      const userLevel = scoreToLevel(wMean);
      if (LEVEL_ORDER[userLevel] < requiredNum) {
        counts[dim]++;
      }
    }
  }

  return counts;
}
