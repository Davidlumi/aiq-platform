/**
 * AIQ Norm Group Percentile Engine
 *
 * Addresses CPO credibility concern: "A score of 62 means nothing without knowing
 * what the distribution looks like across a relevant population."
 *
 * This engine provides percentile ranks so every capability score is contextualised
 * relative to a reference population. The reference distributions are synthetic
 * bootstraps derived from the scoring model's expected range — they represent a
 * reasonable prior until real completion data is available for recalibration.
 *
 * Architecture:
 * - Distributions are parameterised per role family × seniority tier × capability
 * - Each distribution is a normal approximation (mean, stdDev) from which percentile
 *   is computed analytically using the error function (no lookup tables needed)
 * - normGroupVersion is stamped on every result so future real-data recalibrations
 *   are traceable and results from different norm versions are not compared directly
 *
 * Recalibration path (when real data is available):
 * 1. Aggregate completed session scores per role family × seniority tier
 * 2. Compute empirical mean and stdDev per capability
 * 3. Replace the SYNTHETIC_NORMS entries below with empirical values
 * 4. Increment NORM_GROUP_VERSION
 * 5. Store normGroupVersion on assessmentScores rows going forward
 */

import type { CapabilityKey } from "./roleArchetypes";

// ─── Norm Group Version ───────────────────────────────────────────────────────

/**
 * Increment this when norm distributions are recalibrated with real data.
 * Stored on every assessmentScores row so results from different norm versions
 * are not directly compared.
 */
export const NORM_GROUP_VERSION = "synthetic-v1";

// ─── Role Family × Seniority Tier ────────────────────────────────────────────

export type RoleFamily =
  | "generalist"
  | "specialist"
  | "analytics"
  | "leadership"
  | "coordinator";

export type SeniorityTier = "junior" | "mid" | "senior";

// ─── Distribution Parameters ──────────────────────────────────────────────────

interface NormDistribution {
  mean: number;
  stdDev: number;
}

/**
 * Synthetic baseline distributions per role family × seniority tier × capability.
 *
 * Derivation rationale:
 * - The scoring model produces scores on a 0–100 scale centred at 50 (neutral).
 * - A competent professional with moderate AI literacy is expected to score ~62–68.
 * - Junior practitioners are expected to score ~52–58 (less experience with AI tools).
 * - Senior practitioners are expected to score ~68–75 (more exposure, better calibration).
 * - Governance and appropriateness have higher variance because they depend heavily
 *   on organisational context and training, not just individual ability.
 * - Data interpretation has lower mean for generalists (less frequent use of analytics).
 * - These parameters will be replaced with empirical values once 200+ completions
 *   per role family × seniority tier are available.
 */
const SYNTHETIC_NORMS: Record<
  RoleFamily,
  Record<SeniorityTier, Record<CapabilityKey, NormDistribution>>
> = {
  generalist: {
    junior: {
      execution:          { mean: 54, stdDev: 11 },
      judgement:          { mean: 52, stdDev: 12 },
      governance:         { mean: 50, stdDev: 13 },
      appropriateness:    { mean: 53, stdDev: 12 },
      workflow:           { mean: 55, stdDev: 10 },
      data_interpretation:{ mean: 49, stdDev: 12 },
    },
    mid: {
      execution:          { mean: 62, stdDev: 10 },
      judgement:          { mean: 60, stdDev: 11 },
      governance:         { mean: 58, stdDev: 12 },
      appropriateness:    { mean: 61, stdDev: 11 },
      workflow:           { mean: 63, stdDev: 10 },
      data_interpretation:{ mean: 56, stdDev: 11 },
    },
    senior: {
      execution:          { mean: 70, stdDev: 9 },
      judgement:          { mean: 68, stdDev: 10 },
      governance:         { mean: 66, stdDev: 11 },
      appropriateness:    { mean: 69, stdDev: 10 },
      workflow:           { mean: 71, stdDev: 9 },
      data_interpretation:{ mean: 64, stdDev: 10 },
    },
  },
  specialist: {
    junior: {
      execution:          { mean: 56, stdDev: 11 },
      judgement:          { mean: 55, stdDev: 12 },
      governance:         { mean: 58, stdDev: 12 },
      appropriateness:    { mean: 57, stdDev: 11 },
      workflow:           { mean: 54, stdDev: 11 },
      data_interpretation:{ mean: 52, stdDev: 12 },
    },
    mid: {
      execution:          { mean: 63, stdDev: 10 },
      judgement:          { mean: 62, stdDev: 11 },
      governance:         { mean: 65, stdDev: 11 },
      appropriateness:    { mean: 64, stdDev: 10 },
      workflow:           { mean: 61, stdDev: 10 },
      data_interpretation:{ mean: 58, stdDev: 11 },
    },
    senior: {
      execution:          { mean: 71, stdDev: 9 },
      judgement:          { mean: 70, stdDev: 10 },
      governance:         { mean: 73, stdDev: 10 },
      appropriateness:    { mean: 72, stdDev: 9 },
      workflow:           { mean: 68, stdDev: 9 },
      data_interpretation:{ mean: 66, stdDev: 10 },
    },
  },
  analytics: {
    junior: {
      execution:          { mean: 55, stdDev: 11 },
      judgement:          { mean: 54, stdDev: 12 },
      governance:         { mean: 52, stdDev: 12 },
      appropriateness:    { mean: 53, stdDev: 11 },
      workflow:           { mean: 56, stdDev: 11 },
      data_interpretation:{ mean: 61, stdDev: 11 },
    },
    mid: {
      execution:          { mean: 63, stdDev: 10 },
      judgement:          { mean: 62, stdDev: 11 },
      governance:         { mean: 60, stdDev: 11 },
      appropriateness:    { mean: 61, stdDev: 10 },
      workflow:           { mean: 64, stdDev: 10 },
      data_interpretation:{ mean: 70, stdDev: 10 },
    },
    senior: {
      execution:          { mean: 71, stdDev: 9 },
      judgement:          { mean: 70, stdDev: 10 },
      governance:         { mean: 68, stdDev: 10 },
      appropriateness:    { mean: 69, stdDev: 9 },
      workflow:           { mean: 72, stdDev: 9 },
      data_interpretation:{ mean: 78, stdDev: 9 },
    },
  },
  leadership: {
    junior: {
      execution:          { mean: 55, stdDev: 12 },
      judgement:          { mean: 56, stdDev: 12 },
      governance:         { mean: 57, stdDev: 13 },
      appropriateness:    { mean: 56, stdDev: 12 },
      workflow:           { mean: 54, stdDev: 11 },
      data_interpretation:{ mean: 52, stdDev: 12 },
    },
    mid: {
      execution:          { mean: 64, stdDev: 10 },
      judgement:          { mean: 65, stdDev: 11 },
      governance:         { mean: 66, stdDev: 11 },
      appropriateness:    { mean: 65, stdDev: 10 },
      workflow:           { mean: 62, stdDev: 10 },
      data_interpretation:{ mean: 60, stdDev: 11 },
    },
    senior: {
      execution:          { mean: 72, stdDev: 9 },
      judgement:          { mean: 73, stdDev: 10 },
      governance:         { mean: 74, stdDev: 10 },
      appropriateness:    { mean: 73, stdDev: 9 },
      workflow:           { mean: 70, stdDev: 9 },
      data_interpretation:{ mean: 68, stdDev: 10 },
    },
  },
  coordinator: {
    junior: {
      execution:          { mean: 52, stdDev: 11 },
      judgement:          { mean: 50, stdDev: 12 },
      governance:         { mean: 49, stdDev: 12 },
      appropriateness:    { mean: 51, stdDev: 11 },
      workflow:           { mean: 53, stdDev: 11 },
      data_interpretation:{ mean: 47, stdDev: 11 },
    },
    mid: {
      execution:          { mean: 59, stdDev: 10 },
      judgement:          { mean: 57, stdDev: 11 },
      governance:         { mean: 56, stdDev: 11 },
      appropriateness:    { mean: 58, stdDev: 10 },
      workflow:           { mean: 60, stdDev: 10 },
      data_interpretation:{ mean: 53, stdDev: 11 },
    },
    senior: {
      execution:          { mean: 67, stdDev: 9 },
      judgement:          { mean: 65, stdDev: 10 },
      governance:         { mean: 63, stdDev: 10 },
      appropriateness:    { mean: 66, stdDev: 9 },
      workflow:           { mean: 68, stdDev: 9 },
      data_interpretation:{ mean: 61, stdDev: 10 },
    },
  },
};

// ─── Role Family Mapping ──────────────────────────────────────────────────────

/**
 * Maps role archetype family strings to the norm engine's RoleFamily enum.
 * Role archetypes use strings like "generalist", "specialist", "analytics", etc.
 */
export function resolveRoleFamily(roleFamily: string | null | undefined): RoleFamily {
  if (!roleFamily) return "generalist";
  const f = roleFamily.toLowerCase();
  if (f.includes("analytic") || f.includes("data")) return "analytics";
  if (f.includes("leader") || f.includes("director") || f.includes("head") || f.includes("vp") || f.includes("chief")) return "leadership";
  if (f.includes("specialist") || f.includes("er ") || f.includes("employee relation")) return "specialist";
  if (f.includes("coordinator") || f.includes("admin") || f.includes("assistant")) return "coordinator";
  return "generalist";
}

/**
 * Maps seniority level strings to the norm engine's SeniorityTier enum.
 */
export function resolveSeniorityTier(seniority: string | null | undefined): SeniorityTier {
  if (!seniority) return "mid";
  const s = seniority.toLowerCase();
  if (s.includes("junior") || s.includes("entry") || s.includes("graduate") || s.includes("assistant")) return "junior";
  if (s.includes("senior") || s.includes("director") || s.includes("head") || s.includes("vp") || s.includes("chief") || s.includes("lead")) return "senior";
  return "mid";
}

// ─── Error Function (erf) for Normal CDF ─────────────────────────────────────

/**
 * Approximation of the error function using Abramowitz & Stegun formula 7.1.26.
 * Maximum error: 1.5 × 10^-7. Sufficient for percentile display purposes.
 */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

/**
 * Normal cumulative distribution function.
 * Returns P(X ≤ x) for X ~ N(mean, stdDev).
 */
function normalCDF(x: number, mean: number, stdDev: number): number {
  if (stdDev <= 0) return x >= mean ? 1 : 0;
  return 0.5 * (1 + erf((x - mean) / (stdDev * Math.SQRT2)));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * S5: Coarse percentile band to replace precise synthetic percentile display.
 * Precise percentiles are retained internally but the UI should show bands only
 * until real-data recalibration is complete.
 */
export type PercentileBand = "bottom_quartile" | "lower_mid" | "upper_mid" | "top_quartile";

export const PERCENTILE_BAND_LABELS: Record<PercentileBand, string> = {
  bottom_quartile: "Bottom quartile",
  lower_mid:       "Lower-mid range",
  upper_mid:       "Upper-mid range",
  top_quartile:    "Top quartile",
};

export function scoreToPercentileBand(percentile: number): PercentileBand {
  if (percentile < 25) return "bottom_quartile";
  if (percentile < 50) return "lower_mid";
  if (percentile < 75) return "upper_mid";
  return "top_quartile";
}

export interface PercentileResult {
  percentile: number;        // 1–99 integer percentile rank (internal use only)
  /** S5: Coarse band — use this for display until empirical recalibration */
  percentileBand: PercentileBand;
  percentileBandLabel: string;
  label: string;             // Human-readable label, e.g. "54th percentile" (internal)
  normGroupLabel: string;    // e.g. "mid-level HR Generalists"
  normGroupVersion: string;  // e.g. "synthetic-v1"
  isSynthetic: boolean;      // true until replaced with empirical data
}

/**
 * Compute the percentile rank of a score within the reference distribution
 * for the given role family, seniority tier, and capability.
 *
 * @param score         0–100 capability score from computeCapabilityScores
 * @param capabilityKey One of the 6 canonical capability keys
 * @param roleFamily    Role family string (from roleArchetype.family or raw input)
 * @param seniority     Seniority level string (from roleArchetype.seniority or raw input)
 */
export function computePercentile(
  score: number,
  capabilityKey: CapabilityKey,
  roleFamily?: string | null,
  seniority?: string | null
): PercentileResult {
  const family = resolveRoleFamily(roleFamily);
  const tier = resolveSeniorityTier(seniority);
  const dist = SYNTHETIC_NORMS[family]?.[tier]?.[capabilityKey];

  if (!dist) {
    // Fallback: use generalist mid-level distribution
    const fallback = SYNTHETIC_NORMS.generalist.mid[capabilityKey];
    const p = Math.round(normalCDF(score, fallback.mean, fallback.stdDev) * 100);
    const percentile = Math.max(1, Math.min(99, p));
    const band = scoreToPercentileBand(percentile);
    return {
      percentile,
      percentileBand: band,
      percentileBandLabel: PERCENTILE_BAND_LABELS[band],
      label: `${percentile}${ordinalSuffix(percentile)} percentile`,
      normGroupLabel: "mid-level HR professionals (fallback)",
      normGroupVersion: NORM_GROUP_VERSION,
      isSynthetic: true,
    };
  }

  const p = Math.round(normalCDF(score, dist.mean, dist.stdDev) * 100);
  const percentile = Math.max(1, Math.min(99, p));
  const normGroupLabel = `${tier}-level ${familyLabel(family)}`;
  const band = scoreToPercentileBand(percentile);

  return {
    percentile,
    percentileBand: band,
    percentileBandLabel: PERCENTILE_BAND_LABELS[band],
    label: `${percentile}${ordinalSuffix(percentile)} percentile`,
    normGroupLabel,
    normGroupVersion: NORM_GROUP_VERSION,
    isSynthetic: true,
  };
}

/**
 * Compute percentile ranks for all 6 capabilities at once.
 */
export function computeAllPercentiles(
  capabilityScores: Record<CapabilityKey, { score: number }>,
  roleFamily?: string | null,
  seniority?: string | null
): Record<CapabilityKey, PercentileResult> {
  const ALL_CAPS: CapabilityKey[] = [
    "execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation",
  ];
  return Object.fromEntries(
    ALL_CAPS.map(cap => [
      cap,
      computePercentile(capabilityScores[cap]?.score ?? 50, cap, roleFamily, seniority),
    ])
  ) as Record<CapabilityKey, PercentileResult>;
}

/**
 * Return norm distribution means for a given role family × seniority tier.
 * Used by the getBenchmarks tRPC procedure to show role-level and platform
 * averages alongside the user's own scores in the results UI.
 */
export function getNormMeans(
  roleFamily?: string | null,
  seniority?: string | null
): Record<CapabilityKey, { roleMean: number; platformMean: number; stdDev: number }> {
  const family = resolveRoleFamily(roleFamily);
  const tier = resolveSeniorityTier(seniority);
  const ALL_CAPS: CapabilityKey[] = [
    "execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation",
  ];
  const result = {} as Record<CapabilityKey, { roleMean: number; platformMean: number; stdDev: number }>;
  for (const cap of ALL_CAPS) {
    const roleDist = SYNTHETIC_NORMS[family]?.[tier]?.[cap] ?? SYNTHETIC_NORMS.generalist.mid[cap];
    // Platform mean = average across all role families for this seniority tier
    const allFamilyMeans = (Object.values(SYNTHETIC_NORMS) as Record<SeniorityTier, Record<CapabilityKey, NormDistribution>>[]).map(
      f => f[tier]?.[cap]?.mean ?? 60
    );
    const platformMean = Math.round(allFamilyMeans.reduce((a, b) => a + b, 0) / allFamilyMeans.length);
    result[cap] = { roleMean: roleDist.mean, platformMean, stdDev: roleDist.stdDev };
  }
  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function familyLabel(family: RoleFamily): string {
  const labels: Record<RoleFamily, string> = {
    generalist:  "HR Generalists",
    specialist:  "HR Specialists",
    analytics:   "People Analytics professionals",
    leadership:  "HR Leaders",
    coordinator: "HR Coordinators",
  };
  return labels[family] ?? "HR professionals";
}
