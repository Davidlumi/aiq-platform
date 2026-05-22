/**
 * Stage 8 — Capability Assessment Service (v2)
 *
 * Pure computation functions (no DB access) for the capability assessment engine.
 * All DB access lives in the router.
 *
 * v2 changes:
 *   - 4-level scale: low | medium | high | very_high
 *   - Escalation rule: if peak demand is "high" AND ≥3 initiatives are "high" → escalate to "very_high"
 *   - FCA governance escalation: if fcaSysc19 flag is set, governance required += 1 (capped at very_high)
 *   - deriveGapStatus updated for 4-level scale
 *   - Sequencing flags remain gap-tied (fire on actual gap, not on high-demand alone)
 */

import { REWARD_INITIATIVE_LIBRARY, CapabilityProfile } from "../../shared/rewardInitiativeLibrary.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CapabilityLevel = "low" | "medium" | "high" | "very_high";
export type GapStatus = "no_gap" | "minor_gap" | "significant_gap";
export type SequencingStatus = "ready" | "needs_enablement" | "blocked";

export const CAPABILITY_DIMENSIONS = [
  "data_foundations",
  "change_management",
  "systems_integration",
  "governance",
  "team_skills",
] as const;
export type CapabilityDimension = typeof CAPABILITY_DIMENSIONS[number];

export interface DimensionRequirement {
  dimension: CapabilityDimension;
  requiredLevel: CapabilityLevel;
  /** Human-readable label */
  label: string;
  /** Brief description of what this dimension covers */
  description: string;
  /** Which initiatives drive the required level */
  drivingInitiativeIds: string[];
  /** Whether the level was escalated above the raw max */
  escalated: boolean;
  /** Human-readable reason for escalation, if any */
  escalationReason?: string;
}

export interface SequencingFlag {
  initiativeId: string;
  status: SequencingStatus;
  reason?: string;
}

export interface EnablementCostEstimate {
  low: number;
  high: number;
  note: string;
}

// ─── Dimension metadata ───────────────────────────────────────────────────────

export const DIMENSION_META: Record<CapabilityDimension, { label: string; description: string }> = {
  data_foundations: {
    label: "Data Foundations",
    description: "Quality, completeness, and accessibility of HR and pay data required to fuel AI models.",
  },
  change_management: {
    label: "Change Management",
    description: "Organisational readiness to adopt new tools, processes, and ways of working.",
  },
  systems_integration: {
    label: "Systems Integration",
    description: "Ability to connect AI tools with HRIS, payroll, and other core systems.",
  },
  governance: {
    label: "Governance & Compliance",
    description: "Frameworks for AI oversight, auditability, and regulatory compliance.",
  },
  team_skills: {
    label: "Team & Skills",
    description: "Reward team capability to configure, interpret, and act on AI outputs.",
  },
};

// ─── Level ordering ───────────────────────────────────────────────────────────

export const LEVEL_ORDER: Record<CapabilityLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  very_high: 3,
};

export const LEVEL_FROM_NUM: Record<number, CapabilityLevel> = {
  0: "low",
  1: "medium",
  2: "high",
  3: "very_high",
};

function maxLevel(levels: CapabilityLevel[]): CapabilityLevel {
  if (levels.length === 0) return "low";
  return levels.reduce((max, l) => LEVEL_ORDER[l] > LEVEL_ORDER[max] ? l : max, "low" as CapabilityLevel);
}

// ─── computeRequiredLevels ────────────────────────────────────────────────────

/**
 * Derive the required capability level for each dimension from the portfolio.
 *
 * Algorithm (v2):
 * 1. Base level = max demand across all selected initiatives for each dimension.
 * 2. Escalation rule: if base level is "high" AND ≥3 initiatives are "high" → escalate to "very_high".
 * 3. FCA governance escalation: if fcaSysc19=true, governance required += 1 (capped at very_high).
 * 4. team_skills: derived from portfolio breadth (1-3 → low, 4-6 → medium, 7+ → high). No escalation.
 */
export function computeRequiredLevels(
  initiativeIds: string[],
  options: { fcaSysc19?: boolean } = {}
): DimensionRequirement[] {
  const { fcaSysc19 = false } = options;

  const profiles = initiativeIds
    .map((id) => REWARD_INITIATIVE_LIBRARY.find((i) => i.id === id))
    .filter((i): i is NonNullable<typeof i> => i !== undefined);

  // Map from dimension to { levels, drivingIds }
  const dimensionData: Record<CapabilityDimension, { levels: CapabilityLevel[]; drivingIds: string[] }> = {
    data_foundations: { levels: [], drivingIds: [] },
    change_management: { levels: [], drivingIds: [] },
    systems_integration: { levels: [], drivingIds: [] },
    governance: { levels: [], drivingIds: [] },
    team_skills: { levels: [], drivingIds: [] },
  };

  for (const initiative of profiles) {
    const cp: CapabilityProfile = initiative.capabilityProfile;

    dimensionData.data_foundations.levels.push(cp.dataIntensity);
    if (cp.dataIntensity === "high") dimensionData.data_foundations.drivingIds.push(initiative.id);

    dimensionData.change_management.levels.push(cp.changeImpact);
    if (cp.changeImpact === "high") dimensionData.change_management.drivingIds.push(initiative.id);

    dimensionData.systems_integration.levels.push(cp.integrationNeed);
    if (cp.integrationNeed === "high") dimensionData.systems_integration.drivingIds.push(initiative.id);

    dimensionData.governance.levels.push(cp.governanceSensitivity);
    if (cp.governanceSensitivity === "high") dimensionData.governance.drivingIds.push(initiative.id);
  }

  // team_skills: derived from portfolio breadth
  const n = profiles.length;
  const teamSkillsLevel: CapabilityLevel = n >= 7 ? "high" : n >= 4 ? "medium" : "low";
  dimensionData.team_skills.levels.push(teamSkillsLevel);
  dimensionData.team_skills.drivingIds.push(...profiles.map((i) => i.id));

  const result: DimensionRequirement[] = [];

  for (const dim of CAPABILITY_DIMENSIONS) {
    const baseLevel = maxLevel(dimensionData[dim].levels);
    let requiredLevel: CapabilityLevel = baseLevel;
    let escalated = false;
    const escalationReasons: string[] = [];

    if (dim !== "team_skills") {
      // Escalation rule: peak is "high" AND ≥3 initiatives are "high" → very_high
      const highCount = dimensionData[dim].drivingIds.length;
      if (baseLevel === "high" && highCount >= 3) {
        requiredLevel = "very_high";
        escalated = true;
        escalationReasons.push(`${highCount} initiatives at high demand (≥3 threshold)`);
      }

      // FCA governance escalation: +1 for governance dimension
      if (dim === "governance" && fcaSysc19) {
        const currentNum = LEVEL_ORDER[requiredLevel];
        const escalatedNum = Math.min(3, currentNum + 1);
        if (escalatedNum > currentNum) {
          requiredLevel = LEVEL_FROM_NUM[escalatedNum];
          escalated = true;
          escalationReasons.push("FCA SYSC 19 regulatory requirement");
        }
      }
    }

    result.push({
      dimension: dim,
      requiredLevel,
      label: DIMENSION_META[dim].label,
      description: DIMENSION_META[dim].description,
      drivingInitiativeIds: dimensionData[dim].drivingIds,
      escalated,
      escalationReason: escalationReasons.length > 0 ? escalationReasons.join("; ") : undefined,
    });
  }

  return result;
}

// ─── seedCurrentLevelFromMaturity ────────────────────────────────────────────

/**
 * Seed a starting current-level estimate from Stage 1 maturity inputs.
 * These are provisional estimates — Maya must confirm or adjust them.
 *
 * Mapping:
 *   rewardFunctionMaturityRating (1-4) → team_skills, data_foundations
 *   aiMaturityInRewardToday (1-4)      → all dimensions (lower bound)
 *
 * Returns a map of dimension → { level, isProvisional: true }
 */
export function seedCurrentLevelsFromMaturity(
  rewardFunctionMaturityRating: number | null | undefined,
  aiMaturityInRewardToday: number | null | undefined,
): Record<CapabilityDimension, { level: CapabilityLevel; isProvisional: true }> {
  // Map 1-4 rating to level
  function ratingToLevel(rating: number | null | undefined): CapabilityLevel {
    if (!rating) return "low";
    if (rating >= 4) return "high";
    if (rating >= 3) return "medium";
    if (rating >= 2) return "low";
    return "low";
  }

  const rewardMaturityLevel = ratingToLevel(rewardFunctionMaturityRating);
  const aiMaturityLevel = ratingToLevel(aiMaturityInRewardToday);

  // Use the higher of the two as the base for each dimension
  function higherOf(a: CapabilityLevel, b: CapabilityLevel): CapabilityLevel {
    return LEVEL_ORDER[a] >= LEVEL_ORDER[b] ? a : b;
  }

  // Dimension-specific seeding logic:
  // - data_foundations: driven by reward function maturity (data quality) + AI maturity
  // - team_skills: driven by reward function maturity (team capability)
  // - change_management: driven by AI maturity (adoption readiness)
  // - systems_integration: driven by AI maturity (tech integration experience)
  // - governance: driven by AI maturity (governance frameworks)
  return {
    data_foundations: { level: higherOf(rewardMaturityLevel, aiMaturityLevel), isProvisional: true },
    team_skills: { level: rewardMaturityLevel, isProvisional: true },
    change_management: { level: aiMaturityLevel, isProvisional: true },
    systems_integration: { level: aiMaturityLevel, isProvisional: true },
    governance: { level: aiMaturityLevel, isProvisional: true },
  };
}

// ─── deriveGapStatus ─────────────────────────────────────────────────────────

/**
 * Derive gap status from required vs current level.
 * Works on the 4-level scale (low / medium / high / very_high).
 * Returns null if currentLevel is not yet assessed.
 *
 * Gap mapping:
 *   0 levels difference → no_gap
 *   1 level difference  → minor_gap
 *   2+ levels difference → significant_gap
 */
export function deriveGapStatus(
  requiredLevel: CapabilityLevel,
  currentLevel: CapabilityLevel | null | undefined
): GapStatus | null {
  if (!currentLevel) return null;
  const req = LEVEL_ORDER[requiredLevel];
  const cur = LEVEL_ORDER[currentLevel];
  if (cur >= req) return "no_gap";
  if (req - cur === 1) return "minor_gap";
  return "significant_gap";
}

// ─── deriveSequencingFlags ────────────────────────────────────────────────────

/**
 * Derive advisory sequencing flags for each initiative in the portfolio.
 * An initiative is:
 *   - "blocked" if any HIGH-demand dimension has a significant_gap
 *   - "needs_enablement" if any HIGH-demand dimension has a minor_gap
 *   - "ready" otherwise (or if not yet assessed)
 *
 * Only considers dimensions that the initiative's capabilityProfile rates as "high".
 * This is advisory only — Maya can proceed regardless.
 *
 * Gap-tied: flags fire on actual gap, not on high-demand alone.
 * A high-demand initiative that meets its required level is "ready".
 */
export function deriveSequencingFlags(
  initiativeIds: string[],
  dimensionAssessments: Array<{
    dimension: CapabilityDimension;
    gapStatus: GapStatus | null;
  }>
): SequencingFlag[] {
  const gapMap = new Map(dimensionAssessments.map((d) => [d.dimension, d.gapStatus]));

  return initiativeIds.map((id) => {
    const initiative = REWARD_INITIATIVE_LIBRARY.find((i) => i.id === id);
    if (!initiative) return { initiativeId: id, status: "ready" as SequencingStatus };

    const cp = initiative.capabilityProfile;
    const highDemandDimensions: CapabilityDimension[] = [];
    if (cp.dataIntensity === "high") highDemandDimensions.push("data_foundations");
    if (cp.changeImpact === "high") highDemandDimensions.push("change_management");
    if (cp.integrationNeed === "high") highDemandDimensions.push("systems_integration");
    if (cp.governanceSensitivity === "high") highDemandDimensions.push("governance");

    let worstGap: GapStatus | null = null;
    const blockingDimensions: string[] = [];

    for (const dim of highDemandDimensions) {
      const gap = gapMap.get(dim);
      if (!gap) continue;
      if (gap === "significant_gap") {
        worstGap = "significant_gap";
        blockingDimensions.push(DIMENSION_META[dim].label);
      } else if (gap === "minor_gap" && worstGap !== "significant_gap") {
        worstGap = "minor_gap";
        blockingDimensions.push(DIMENSION_META[dim].label);
      }
    }

    if (worstGap === "significant_gap") {
      return {
        initiativeId: id,
        status: "blocked",
        reason: `Significant gap in: ${blockingDimensions.join(", ")}. Enablement work recommended before deployment.`,
      };
    }
    if (worstGap === "minor_gap") {
      return {
        initiativeId: id,
        status: "needs_enablement",
        reason: `Minor gap in: ${blockingDimensions.join(", ")}. Can proceed with parallel enablement.`,
      };
    }
    return { initiativeId: id, status: "ready" };
  });
}

// ─── computeEnablementCost ────────────────────────────────────────────────────

/**
 * Estimate enablement cost from gap profile.
 * Band-only v1: uses fixed cost bands per gap type and dimension.
 * These are rough order-of-magnitude estimates for the board pack.
 *
 * v2: significant_gap on a very_high required dimension uses the "critical" band.
 */
export function computeEnablementCost(
  dimensionAssessments: Array<{
    dimension: CapabilityDimension;
    gapStatus: GapStatus | null;
    requiredLevel?: CapabilityLevel;
  }>
): EnablementCostEstimate {
  // Cost bands per dimension per gap type (£)
  const COST_BANDS: Record<CapabilityDimension, {
    minor: [number, number];
    significant: [number, number];
    critical: [number, number]; // significant_gap on very_high required
  }> = {
    data_foundations:    { minor: [50_000, 150_000],  significant: [150_000, 500_000],  critical: [300_000, 800_000]  },
    change_management:   { minor: [30_000, 100_000],  significant: [100_000, 350_000],  critical: [200_000, 600_000]  },
    systems_integration: { minor: [40_000, 120_000],  significant: [120_000, 400_000],  critical: [250_000, 700_000]  },
    governance:          { minor: [20_000, 60_000],   significant: [60_000, 200_000],   critical: [120_000, 400_000]  },
    team_skills:         { minor: [25_000, 75_000],   significant: [75_000, 250_000],   critical: [150_000, 450_000]  },
  };

  let totalLow = 0;
  let totalHigh = 0;
  const gapDimensions: string[] = [];

  for (const { dimension, gapStatus, requiredLevel } of dimensionAssessments) {
    if (!gapStatus || gapStatus === "no_gap") continue;
    const isCritical = gapStatus === "significant_gap" && requiredLevel === "very_high";
    const bandKey = isCritical ? "critical" : gapStatus === "significant_gap" ? "significant" : "minor";
    const band = COST_BANDS[dimension][bandKey];
    totalLow += band[0];
    totalHigh += band[1];
    gapDimensions.push(DIMENSION_META[dimension].label);
  }

  if (totalLow === 0) {
    return {
      low: 0,
      high: 0,
      note: "No capability gaps identified. No additional enablement investment required.",
    };
  }

  return {
    low: totalLow,
    high: totalHigh,
    note: `Estimated enablement investment to close gaps in: ${gapDimensions.join(", ")}. Figures are indicative order-of-magnitude estimates.`,
  };
}

// ─── buildCapabilityRiskNote ──────────────────────────────────────────────────

/**
 * Build a capability risk note for the Stage 7 risk feed.
 * Returns null if no significant gaps exist.
 */
export function buildCapabilityRiskNote(
  sequencingFlags: SequencingFlag[]
): { summary: string; affectedInitiativeIds: string[] } | null {
  const blocked = sequencingFlags.filter((f) => f.status === "blocked");
  const needsEnablement = sequencingFlags.filter((f) => f.status === "needs_enablement");

  if (blocked.length === 0 && needsEnablement.length === 0) return null;

  const parts: string[] = [];
  if (blocked.length > 0) {
    parts.push(`${blocked.length} initiative${blocked.length > 1 ? "s" : ""} flagged as blocked pending capability enablement`);
  }
  if (needsEnablement.length > 0) {
    parts.push(`${needsEnablement.length} initiative${needsEnablement.length > 1 ? "s" : ""} require parallel enablement work`);
  }

  return {
    summary: parts.join("; ") + ". See Stage 8 Capability Assessment for detail.",
    affectedInitiativeIds: [
      ...blocked.map((f) => f.initiativeId),
      ...needsEnablement.map((f) => f.initiativeId),
    ],
  };
}
