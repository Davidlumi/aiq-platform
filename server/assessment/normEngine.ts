/**
 * AIQ Norm Group Percentile Engine — v10
 *
 * Provides percentile ranks for the v10 six-domain taxonomy so every capability
 * score is contextualised relative to a reference population. The reference
 * distributions are synthetic bootstraps derived from the scoring model's expected
 * range — they represent a reasonable prior until real completion data is available.
 *
 * Architecture:
 * - Distributions are parameterised per role family × seniority tier × domain
 * - Each distribution is a normal approximation (mean, stdDev) from which percentile
 *   is computed analytically using the error function
 * - normGroupVersion is stamped on every result for traceability
 */

import type { CapabilityKey } from "./roleArchetypes";
import { ALL_DOMAINS } from "./scoringEngine";

// ─── Norm Group Version ───────────────────────────────────────────────────────

export const NORM_GROUP_VERSION = "synthetic-v2";

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
 * Synthetic baseline distributions per role family × seniority tier × domain.
 *
 * v10 derivation rationale:
 * - Foundation domains (AI Interaction, AI Output Evaluation) have higher means
 *   for operational roles and lower for leadership (who use AI less hands-on)
 * - Strategic domains (Workforce Readiness, Ethics, Change Leadership) have higher
 *   means for leadership and lower for junior/operational roles
 * - AI Workflow Design sits in between — operational roles score higher
 * - Ethics & Trust has higher variance because it depends on organisational culture
 * - These parameters will be replaced with empirical values once 200+ completions
 *   per role family × seniority tier are available
 */
const SYNTHETIC_NORMS: Record<
  RoleFamily,
  Record<SeniorityTier, Record<CapabilityKey, NormDistribution>>
> = {
  generalist: {
    junior: {
      ai_interaction:         { mean: 55, stdDev: 11 },
      ai_output_evaluation:   { mean: 52, stdDev: 12 },
      ai_workflow_design:     { mean: 50, stdDev: 12 },
      workforce_ai_readiness: { mean: 45, stdDev: 13 },
      ai_ethics_trust:        { mean: 48, stdDev: 13 },
      ai_change_leadership:   { mean: 44, stdDev: 13 },
    },
    mid: {
      ai_interaction:         { mean: 63, stdDev: 10 },
      ai_output_evaluation:   { mean: 60, stdDev: 11 },
      ai_workflow_design:     { mean: 58, stdDev: 11 },
      workforce_ai_readiness: { mean: 53, stdDev: 12 },
      ai_ethics_trust:        { mean: 56, stdDev: 12 },
      ai_change_leadership:   { mean: 52, stdDev: 12 },
    },
    senior: {
      ai_interaction:         { mean: 70, stdDev: 9 },
      ai_output_evaluation:   { mean: 68, stdDev: 10 },
      ai_workflow_design:     { mean: 66, stdDev: 10 },
      workforce_ai_readiness: { mean: 62, stdDev: 11 },
      ai_ethics_trust:        { mean: 65, stdDev: 11 },
      ai_change_leadership:   { mean: 60, stdDev: 11 },
    },
  },
  specialist: {
    junior: {
      ai_interaction:         { mean: 57, stdDev: 11 },
      ai_output_evaluation:   { mean: 55, stdDev: 12 },
      ai_workflow_design:     { mean: 52, stdDev: 12 },
      workforce_ai_readiness: { mean: 46, stdDev: 13 },
      ai_ethics_trust:        { mean: 52, stdDev: 12 },
      ai_change_leadership:   { mean: 44, stdDev: 13 },
    },
    mid: {
      ai_interaction:         { mean: 64, stdDev: 10 },
      ai_output_evaluation:   { mean: 63, stdDev: 11 },
      ai_workflow_design:     { mean: 60, stdDev: 11 },
      workforce_ai_readiness: { mean: 54, stdDev: 12 },
      ai_ethics_trust:        { mean: 60, stdDev: 11 },
      ai_change_leadership:   { mean: 52, stdDev: 12 },
    },
    senior: {
      ai_interaction:         { mean: 72, stdDev: 9 },
      ai_output_evaluation:   { mean: 71, stdDev: 10 },
      ai_workflow_design:     { mean: 68, stdDev: 10 },
      workforce_ai_readiness: { mean: 62, stdDev: 11 },
      ai_ethics_trust:        { mean: 68, stdDev: 10 },
      ai_change_leadership:   { mean: 60, stdDev: 11 },
    },
  },
  analytics: {
    junior: {
      ai_interaction:         { mean: 58, stdDev: 11 },
      ai_output_evaluation:   { mean: 56, stdDev: 11 },
      ai_workflow_design:     { mean: 54, stdDev: 12 },
      workforce_ai_readiness: { mean: 46, stdDev: 13 },
      ai_ethics_trust:        { mean: 50, stdDev: 12 },
      ai_change_leadership:   { mean: 43, stdDev: 13 },
    },
    mid: {
      ai_interaction:         { mean: 66, stdDev: 10 },
      ai_output_evaluation:   { mean: 65, stdDev: 10 },
      ai_workflow_design:     { mean: 62, stdDev: 11 },
      workforce_ai_readiness: { mean: 55, stdDev: 12 },
      ai_ethics_trust:        { mean: 58, stdDev: 11 },
      ai_change_leadership:   { mean: 52, stdDev: 12 },
    },
    senior: {
      ai_interaction:         { mean: 74, stdDev: 9 },
      ai_output_evaluation:   { mean: 73, stdDev: 9 },
      ai_workflow_design:     { mean: 70, stdDev: 10 },
      workforce_ai_readiness: { mean: 63, stdDev: 11 },
      ai_ethics_trust:        { mean: 66, stdDev: 10 },
      ai_change_leadership:   { mean: 60, stdDev: 11 },
    },
  },
  leadership: {
    junior: {
      ai_interaction:         { mean: 52, stdDev: 12 },
      ai_output_evaluation:   { mean: 53, stdDev: 12 },
      ai_workflow_design:     { mean: 50, stdDev: 12 },
      workforce_ai_readiness: { mean: 52, stdDev: 13 },
      ai_ethics_trust:        { mean: 54, stdDev: 13 },
      ai_change_leadership:   { mean: 52, stdDev: 13 },
    },
    mid: {
      ai_interaction:         { mean: 60, stdDev: 10 },
      ai_output_evaluation:   { mean: 62, stdDev: 11 },
      ai_workflow_design:     { mean: 58, stdDev: 11 },
      workforce_ai_readiness: { mean: 62, stdDev: 11 },
      ai_ethics_trust:        { mean: 64, stdDev: 11 },
      ai_change_leadership:   { mean: 62, stdDev: 11 },
    },
    senior: {
      ai_interaction:         { mean: 68, stdDev: 9 },
      ai_output_evaluation:   { mean: 70, stdDev: 10 },
      ai_workflow_design:     { mean: 66, stdDev: 10 },
      workforce_ai_readiness: { mean: 72, stdDev: 10 },
      ai_ethics_trust:        { mean: 73, stdDev: 10 },
      ai_change_leadership:   { mean: 72, stdDev: 10 },
    },
  },
  coordinator: {
    junior: {
      ai_interaction:         { mean: 53, stdDev: 11 },
      ai_output_evaluation:   { mean: 50, stdDev: 12 },
      ai_workflow_design:     { mean: 52, stdDev: 12 },
      workforce_ai_readiness: { mean: 43, stdDev: 13 },
      ai_ethics_trust:        { mean: 46, stdDev: 12 },
      ai_change_leadership:   { mean: 42, stdDev: 13 },
    },
    mid: {
      ai_interaction:         { mean: 61, stdDev: 10 },
      ai_output_evaluation:   { mean: 58, stdDev: 11 },
      ai_workflow_design:     { mean: 60, stdDev: 11 },
      workforce_ai_readiness: { mean: 50, stdDev: 12 },
      ai_ethics_trust:        { mean: 53, stdDev: 11 },
      ai_change_leadership:   { mean: 49, stdDev: 12 },
    },
    senior: {
      ai_interaction:         { mean: 69, stdDev: 9 },
      ai_output_evaluation:   { mean: 66, stdDev: 10 },
      ai_workflow_design:     { mean: 68, stdDev: 10 },
      workforce_ai_readiness: { mean: 58, stdDev: 11 },
      ai_ethics_trust:        { mean: 61, stdDev: 10 },
      ai_change_leadership:   { mean: 57, stdDev: 11 },
    },
  },
};

// ─── Role Family Mapping ──────────────────────────────────────────────────────

export function resolveRoleFamily(roleFamily: string | null | undefined): RoleFamily {
  if (!roleFamily) return "generalist";
  const f = roleFamily.toLowerCase();
  if (f.includes("analytic") || f.includes("data")) return "analytics";
  if (f.includes("leader") || f.includes("director") || f.includes("head") || f.includes("vp") || f.includes("chief")) return "leadership";
  if (f.includes("specialist") || f.includes("er ") || f.includes("employee relation")) return "specialist";
  if (f.includes("coordinator") || f.includes("admin") || f.includes("assistant") || f.includes("shared service")) return "coordinator";
  return "generalist";
}

export function resolveSeniorityTier(seniority: string | null | undefined): SeniorityTier {
  if (!seniority) return "mid";
  const s = seniority.toLowerCase();
  if (s.includes("junior") || s.includes("entry") || s.includes("graduate") || s.includes("assistant")) return "junior";
  if (s.includes("senior") || s.includes("director") || s.includes("head") || s.includes("vp") || s.includes("chief") || s.includes("lead")) return "senior";
  return "mid";
}

// ─── Error Function (erf) for Normal CDF ─────────────────────────────────────

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

function normalCDF(x: number, mean: number, stdDev: number): number {
  if (stdDev <= 0) return x >= mean ? 1 : 0;
  return 0.5 * (1 + erf((x - mean) / (stdDev * Math.SQRT2)));
}

// ─── Public API ───────────────────────────────────────────────────────────────

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
  percentile: number;
  percentileBand: PercentileBand;
  percentileBandLabel: string;
  label: string;
  normGroupLabel: string;
  normGroupVersion: string;
  isSynthetic: boolean;
}

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
    const fallback = SYNTHETIC_NORMS.generalist.mid[capabilityKey] ?? { mean: 55, stdDev: 11 };
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

export function computeAllPercentiles(
  capabilityScores: Record<CapabilityKey, { score: number }>,
  roleFamily?: string | null,
  seniority?: string | null
): Record<CapabilityKey, PercentileResult> {
  return Object.fromEntries(
    ALL_DOMAINS.map(cap => [
      cap,
      computePercentile(capabilityScores[cap]?.score ?? 50, cap, roleFamily, seniority),
    ])
  ) as Record<CapabilityKey, PercentileResult>;
}

export function getNormMeans(
  roleFamily?: string | null,
  seniority?: string | null
): Record<CapabilityKey, { roleMean: number; platformMean: number; stdDev: number }> {
  const family = resolveRoleFamily(roleFamily);
  const tier = resolveSeniorityTier(seniority);
  const result = {} as Record<CapabilityKey, { roleMean: number; platformMean: number; stdDev: number }>;
  for (const cap of ALL_DOMAINS) {
    const roleDist = SYNTHETIC_NORMS[family]?.[tier]?.[cap] ?? SYNTHETIC_NORMS.generalist.mid[cap];
    const allFamilyMeans = (Object.values(SYNTHETIC_NORMS) as Record<SeniorityTier, Record<CapabilityKey, NormDistribution>>[]).map(
      f => f[tier]?.[cap]?.mean ?? 55
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
