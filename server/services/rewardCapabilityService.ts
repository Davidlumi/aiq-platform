/**
 * Stage 8 — Capability Assessment Service
 *
 * Pure computation functions (no DB access) for the capability assessment engine.
 * All DB access lives in the router.
 */

import { REWARD_INITIATIVE_LIBRARY, CapabilityProfile } from "../../shared/rewardInitiativeLibrary.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CapabilityLevel = "low" | "medium" | "high";
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

const LEVEL_ORDER: Record<CapabilityLevel, number> = { low: 0, medium: 1, high: 2 };

function maxLevel(levels: CapabilityLevel[]): CapabilityLevel {
  if (levels.length === 0) return "low";
  return levels.reduce((max, l) => LEVEL_ORDER[l] > LEVEL_ORDER[max] ? l : max, "low" as CapabilityLevel);
}

// ─── computeRequiredLevels ────────────────────────────────────────────────────

/**
 * Derive the required capability level for each dimension from the portfolio.
 * Takes the maximum demand across all selected initiatives.
 * team_skills is derived from portfolio breadth (number of initiatives).
 */
export function computeRequiredLevels(
  initiativeIds: string[]
): DimensionRequirement[] {
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

    // data_foundations ← dataIntensity
    dimensionData.data_foundations.levels.push(cp.dataIntensity);
    if (cp.dataIntensity === "high") dimensionData.data_foundations.drivingIds.push(initiative.id);

    // change_management ← changeImpact
    dimensionData.change_management.levels.push(cp.changeImpact);
    if (cp.changeImpact === "high") dimensionData.change_management.drivingIds.push(initiative.id);

    // systems_integration ← integrationNeed
    dimensionData.systems_integration.levels.push(cp.integrationNeed);
    if (cp.integrationNeed === "high") dimensionData.systems_integration.drivingIds.push(initiative.id);

    // governance ← governanceSensitivity
    dimensionData.governance.levels.push(cp.governanceSensitivity);
    if (cp.governanceSensitivity === "high") dimensionData.governance.drivingIds.push(initiative.id);
  }

  // team_skills: derived from portfolio breadth
  // 1-3 initiatives → low, 4-6 → medium, 7+ → high
  const n = profiles.length;
  const teamSkillsLevel: CapabilityLevel = n >= 7 ? "high" : n >= 4 ? "medium" : "low";
  dimensionData.team_skills.levels.push(teamSkillsLevel);
  // All initiatives drive team skills
  dimensionData.team_skills.drivingIds.push(...profiles.map((i) => i.id));

  return CAPABILITY_DIMENSIONS.map((dim) => ({
    dimension: dim,
    requiredLevel: maxLevel(dimensionData[dim].levels),
    label: DIMENSION_META[dim].label,
    description: DIMENSION_META[dim].description,
    drivingInitiativeIds: dimensionData[dim].drivingIds,
  }));
}

// ─── deriveGapStatus ─────────────────────────────────────────────────────────

/**
 * Derive gap status from required vs current level.
 * Returns null if currentLevel is not yet assessed.
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
 *   - "blocked" if any dimension has a significant_gap
 *   - "needs_enablement" if any dimension has a minor_gap
 *   - "ready" otherwise (or if not yet assessed)
 *
 * Only considers dimensions that the initiative's capabilityProfile rates as "high".
 * This is advisory only — Maya can proceed regardless.
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
 */
export function computeEnablementCost(
  dimensionAssessments: Array<{
    dimension: CapabilityDimension;
    gapStatus: GapStatus | null;
  }>
): EnablementCostEstimate {
  // Cost bands per dimension per gap type (£)
  const COST_BANDS: Record<CapabilityDimension, { minor: [number, number]; significant: [number, number] }> = {
    data_foundations:    { minor: [50_000, 150_000],  significant: [150_000, 500_000] },
    change_management:   { minor: [30_000, 100_000],  significant: [100_000, 350_000] },
    systems_integration: { minor: [40_000, 120_000],  significant: [120_000, 400_000] },
    governance:          { minor: [20_000, 60_000],   significant: [60_000, 200_000]  },
    team_skills:         { minor: [25_000, 75_000],   significant: [75_000, 250_000]  },
  };

  let totalLow = 0;
  let totalHigh = 0;
  const gapDimensions: string[] = [];

  for (const { dimension, gapStatus } of dimensionAssessments) {
    if (!gapStatus || gapStatus === "no_gap") continue;
    const band = COST_BANDS[dimension][gapStatus === "significant_gap" ? "significant" : "minor"];
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
