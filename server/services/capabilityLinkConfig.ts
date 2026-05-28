/**
 * Capability Link — Configuration and Team Aggregation Service
 *
 * This module is the single source of truth for:
 *   1. CAPABILITY_LINK_CONFIG — the founder-tunable mapping between individual-assessment
 *      domains and Stage 8 people-dimensions, plus the score→level thresholds.
 *   2. aggregateTeamCapability — a pure function that takes per-user domain scores and
 *      returns per-domain means, coverage, derived Stage 8 levels, and provenance strings.
 *
 * Design principles:
 *   - All weights, thresholds, and mappings live in CAPABILITY_LINK_CONFIG.
 *     The founder can adjust them without touching any other file.
 *   - The service is pure (no DB access). DB reads/writes live in the router.
 *   - Low coverage (<LOW_COVERAGE_THRESHOLD) shows a caveat, not a confident level.
 *   - Manual values are never silently overwritten; this service only produces a
 *     "suggested" level — the router decides whether to apply it.
 *
 * Scope: Reward engine only. CPO engine is out of scope for this build.
 */

import type { CapabilityLevel } from "./rewardCapabilityService.js";
import { LEVEL_ORDER } from "./rewardCapabilityService.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** The six individual-assessment domains from scoringEngine.ts */
export type AssessmentDomain =
  | "ai_interaction"
  | "ai_output_evaluation"
  | "ai_workflow_design"
  | "workforce_ai_readiness"
  | "ai_ethics_trust"
  | "ai_change_leadership";

/** The three Stage 8 people-dimensions informed by individual assessments */
export type PeopleDimension = "team_skills" | "change_management" | "reward_governance";

export interface DomainWeight {
  domain: AssessmentDomain;
  /** Relative weight (will be normalised to sum to 1.0 within the dimension) */
  weight: number;
}

export interface DimensionMapping {
  /** Human-readable label for this dimension */
  label: string;
  /** Which assessment domains inform this dimension and their relative weights */
  domains: DomainWeight[];
}

export interface ScoreThresholds {
  /**
   * Minimum weighted-mean score (0–100) to reach each level.
   * Scores below the lowest threshold map to 'low'.
   */
  medium: number;  // score >= medium → medium
  high: number;    // score >= high → high
  very_high: number; // score >= very_high → very_high
}

export interface CapabilityLinkConfig {
  /**
   * Mapping from Stage 8 people-dimension to the assessment domains that inform it.
   * The founder can adjust weights here without a code change.
   */
  dimensionMappings: Record<PeopleDimension, DimensionMapping>;

  /**
   * Score → CapabilityLevel thresholds (0–100 scale).
   * Applied uniformly across all dimensions.
   * The founder can adjust these without a code change.
   */
  scoreThresholds: ScoreThresholds;

  /**
   * Minimum fraction of team members who must have a completed assessment
   * before a confident level is derived (0.0–1.0).
   * Below this threshold, the level is returned as null with a caveat.
   */
  lowCoverageThreshold: number;
}

// ─── CAPABILITY_LINK_CONFIG ───────────────────────────────────────────────────
/**
 * Founder-tunable configuration object.
 *
 * Default mapping (from spec):
 *   team_skills      → mean of ai_interaction (w=1), ai_output_evaluation (w=1), ai_workflow_design (w=1)
 *   change_management → ai_change_leadership (w=2) + workforce_ai_readiness (w=1)
 *   reward_governance → ai_ethics_trust (w=1)
 *
 * Default thresholds (0–100 scale):
 *   score < 40  → low
 *   score ≥ 40  → medium
 *   score ≥ 65  → high
 *   score ≥ 82  → very_high
 *
 * Default low-coverage threshold: 0.50 (50% of team must be assessed)
 */
export const CAPABILITY_LINK_CONFIG: CapabilityLinkConfig = {
  dimensionMappings: {
    data_foundations: {
      label: "Data Foundations",
      domains: [
        { domain: "ai_output_evaluation", weight: 2 },
        { domain: "ai_workflow_design",   weight: 1 },
      ],
    },
    systems_integration: {
      label: "Systems Integration",
      domains: [
        { domain: "ai_workflow_design",   weight: 2 },
        { domain: "ai_interaction",       weight: 1 },
      ],
    },
    team_skills: {
      label: "Team & Skills",
      domains: [
        { domain: "ai_interaction",       weight: 1 },
        { domain: "ai_output_evaluation", weight: 1 },
        { domain: "ai_workflow_design",   weight: 1 },
      ],
    },
    change_management: {
      label: "Change Management",
      domains: [
        { domain: "ai_change_leadership",   weight: 2 },
        { domain: "workforce_ai_readiness", weight: 1 },
      ],
    },
    reward_governance: {
      label: "Governance & Compliance",
      domains: [
        { domain: "ai_ethics_trust", weight: 1 },
      ],
    },
  },

  scoreThresholds: {
    medium:   40,
    high:     65,
    very_high: 82,
  },

  lowCoverageThreshold: 0.50,
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Map a 0–100 score to a CapabilityLevel using the config thresholds */
export function scoreToLevel(
  score: number,
  thresholds: ScoreThresholds = CAPABILITY_LINK_CONFIG.scoreThresholds
): CapabilityLevel {
  if (score >= thresholds.very_high) return "very_high";
  if (score >= thresholds.high)      return "high";
  if (score >= thresholds.medium)    return "medium";
  return "low";
}

/** Compute the weighted mean of domain scores for a single dimension */
export function weightedMean(
  domainMeans: Record<string, number | null>,
  domainWeights: DomainWeight[]
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const { domain, weight } of domainWeights) {
    const score = domainMeans[domain];
    if (score == null) continue;
    weightedSum += score * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return null;
  return weightedSum / totalWeight;
}

// ─── TeamCapabilityAggregateInput ─────────────────────────────────────────────

/**
 * Per-user domain scores as produced by assessmentScores.scoreBreakdownJson.
 * Each score is 0–100 (null if the domain was not assessed in the session).
 */
export interface UserDomainScores {
  userId: string;
  /** Domain scores, 0–100 scale. Missing key = not assessed. */
  scores: Partial<Record<AssessmentDomain, number>>;
}

// ─── TeamCapabilityAggregate ──────────────────────────────────────────────────

export interface TeamCapabilityAggregate {
  /** Total number of users in the team */
  teamSize: number;

  /** Number of users with at least one completed assessment */
  assessedCount: number;

  /** Coverage fraction: assessedCount / teamSize */
  coverageFraction: number;

  /** Whether coverage is below the low-coverage threshold */
  isLowCoverage: boolean;

  /**
   * Per-domain mean scores (0–100).
   * null if no team member has a score for that domain.
   */
  domainMeans: Record<AssessmentDomain, number | null>;

  /**
   * Per-domain sample counts (how many users contributed to each mean).
   */
  domainCounts: Record<AssessmentDomain, number>;

  /**
   * Derived Stage 8 levels for the three people-dimensions.
   * null when coverage is below LOW_COVERAGE_THRESHOLD or no data.
   */
  derivedLevels: Record<PeopleDimension, CapabilityLevel | null>;

  /**
   * Human-readable provenance strings per people-dimension.
   * e.g. "Medium — derived from 6 of 8 team assessments (coverage: 75%)"
   */
  provenance: Record<PeopleDimension, string>;
}

// ─── aggregateTeamCapability ──────────────────────────────────────────────────

/**
 * Pure function: aggregate individual assessment scores into team-level
 * capability metrics and derive Stage 8 people-dimension levels.
 *
 * @param teamMembers  All users in the team (with or without assessments).
 *                     Pass an empty array for "no team members" — returns all-null.
 * @param userScores   Per-user domain scores for those who have been assessed.
 *                     Users not in this list are counted as "not assessed".
 * @param config       The capability link config (defaults to CAPABILITY_LINK_CONFIG).
 */
export function aggregateTeamCapability(
  teamMembers: Array<{ userId: string }>,
  userScores: UserDomainScores[],
  config: CapabilityLinkConfig = CAPABILITY_LINK_CONFIG
): TeamCapabilityAggregate {
  const ALL_DOMAINS: AssessmentDomain[] = [
    "ai_interaction",
    "ai_output_evaluation",
    "ai_workflow_design",
    "workforce_ai_readiness",
    "ai_ethics_trust",
    "ai_change_leadership",
  ];

  const teamSize = teamMembers.length;
  const assessedUserIds = new Set(userScores.map(u => u.userId));
  const assessedCount = teamMembers.filter(m => assessedUserIds.has(m.userId)).length;
  const coverageFraction = teamSize > 0 ? assessedCount / teamSize : 0;
  const isLowCoverage = coverageFraction < config.lowCoverageThreshold;

  // Per-domain: accumulate sums and counts
  const domainSums: Record<string, number> = {};
  const domainCounts: Record<AssessmentDomain, number> = {} as Record<AssessmentDomain, number>;
  for (const d of ALL_DOMAINS) {
    domainSums[d] = 0;
    domainCounts[d] = 0;
  }

  for (const user of userScores) {
    // Only count users who are actually team members
    if (!assessedUserIds.has(user.userId)) continue;
    for (const d of ALL_DOMAINS) {
      const score = user.scores[d];
      if (score != null && isFinite(score)) {
        domainSums[d] += score;
        domainCounts[d]++;
      }
    }
  }

  const domainMeans: Record<AssessmentDomain, number | null> = {} as Record<AssessmentDomain, number | null>;
  for (const d of ALL_DOMAINS) {
    domainMeans[d] = domainCounts[d] > 0
      ? Math.round((domainSums[d] / domainCounts[d]) * 10) / 10
      : null;
  }

  // Derive Stage 8 levels for the three people-dimensions
  const derivedLevels: Record<PeopleDimension, CapabilityLevel | null> = {
    team_skills: null,
    change_management: null,
    reward_governance: null,
  };
  const provenance: Record<PeopleDimension, string> = {
    team_skills: "",
    change_management: "",
    reward_governance: "",
  };

  const PEOPLE_DIMENSIONS: PeopleDimension[] = ["team_skills", "change_management", "reward_governance"];

  for (const dim of PEOPLE_DIMENSIONS) {
    const mapping = config.dimensionMappings[dim];
    const wMean = weightedMean(domainMeans, mapping.domains);

    if (wMean == null) {
      derivedLevels[dim] = null;
      provenance[dim] = `${mapping.label}: no assessment data available`;
      continue;
    }

    if (isLowCoverage) {
      // Compute the level but flag it as low-confidence
      const level = scoreToLevel(wMean, config.scoreThresholds);
      derivedLevels[dim] = null; // null = don't auto-apply
      const pct = Math.round(coverageFraction * 100);
      provenance[dim] = `${capitalise(level)} (indicative only — low coverage: ${assessedCount} of ${teamSize} team members assessed, ${pct}%). Assess more team members for a confident level.`;
    } else {
      const level = scoreToLevel(wMean, config.scoreThresholds);
      derivedLevels[dim] = level;
      const pct = Math.round(coverageFraction * 100);
      provenance[dim] = `${capitalise(level)} — derived from ${assessedCount} of ${teamSize} team assessments (coverage: ${pct}%, weighted mean score: ${wMean.toFixed(1)})`;
    }
  }

  return {
    teamSize,
    assessedCount,
    coverageFraction,
    isLowCoverage,
    domainMeans,
    domainCounts,
    derivedLevels,
    provenance,
  };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

// ─── Estimate months to close a gap ──────────────────────────────────────────

/**
 * Rough estimate of months to close a capability gap.
 * Based on gap severity and number of contributing domains.
 * These are indicative order-of-magnitude estimates only.
 */
export function estimateMonthsToClose(
  gapStatus: "minor_gap" | "significant_gap",
  domainCount: number
): number {
  const base = gapStatus === "significant_gap" ? 6 : 3;
  // Each additional domain adds ~1 month
  return base + Math.max(0, domainCount - 1);
}
