/**
 * AiQ Dashboard Specification v1.2 — Shared Constants
 *
 * Domain labels, colours, and keys are now sourced from brand.ts.
 * This file adds dashboard-specific types (ratings, role families, heatmap utils).
 */

// ─── Re-export canonical domain constants from brand.ts ──────────────────────
export type { DomainKey } from "./brand";
export {
  DOMAIN_KEYS,
  DOMAIN_LABELS,
  DOMAIN_SHORT_LABELS,
  DOMAIN_COLOURS,
  DOMAIN_BG_COLOURS,
  DOMAIN_DESCRIPTIONS,
  LEVEL_LABELS,
  LEVEL_COLOURS,
  HEATMAP_THRESHOLDS,
  scoreToLevel,
  rawScoreToLevel,
  scoreColours,
  READINESS_COLOURS,
  READINESS_LABELS,
} from "./brand";

// Legacy alias
export { DOMAIN_KEYS as CAPABILITY_KEYS } from "./brand";
// Legacy CapabilityKey alias
export type { DomainKey as CapabilityKey } from "./brand";

// ─── Readiness Ratings (5-state per spec §1.2) ──────────────────────────────
export const RATING_KEYS = [
  "ai_ready",
  "developing",
  "not_yet_ready",
  "foundation_gap",
  "insufficient_evidence",
] as const;
export type RatingKey = (typeof RATING_KEYS)[number];

export const RATING_LABELS: Record<RatingKey, string> = {
  ai_ready: "AI Ready",
  developing: "Developing",
  not_yet_ready: "Not Yet Ready",
  foundation_gap: "Foundation Gap",
  insufficient_evidence: "Insufficient Evidence",
};

/** Dual-audience individual token set — restrained, non-alarming */
export const RATING_COLOURS_INDIVIDUAL: Record<RatingKey, { bg: string; text: string; border: string; dot: string }> = {
  ai_ready:              { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0", dot: "#10B981" },
  developing:            { bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA", dot: "#F59E0B" },
  not_yet_ready:         { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA", dot: "#EF4444" },
  foundation_gap:        { bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74", dot: "#F97316" },
  insufficient_evidence: { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1", dot: "#94A3B8" },
};

/** Dual-audience organisation token set — clear visual urgency */
export const RATING_COLOURS_ORG: Record<RatingKey, { bg: string; text: string; border: string; dot: string }> = {
  ai_ready:              { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0", dot: "#10B981" },
  developing:            { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", dot: "#F59E0B" },
  not_yet_ready:         { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA", dot: "#EF4444" },
  foundation_gap:        { bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74", dot: "#F97316" },
  insufficient_evidence: { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1", dot: "#94A3B8" },
};

/** Map internal readiness state to spec rating key */
export function stateToRating(state: string | null | undefined): RatingKey {
  switch (state) {
    case "safe": return "ai_ready";
    case "at_risk": return "developing";
    case "unsafe": return "not_yet_ready";
    case "foundation_gap": return "foundation_gap";
    case "unknown":
    case "unknown_insufficient_evidence":
    default: return "insufficient_evidence";
  }
}

/** Confidence band from composite confidence score */
export function confidenceBand(compositeConfidence: number | null | undefined): "high" | "moderate" | "low" {
  if (compositeConfidence == null) return "low";
  if (compositeConfidence >= 0.70) return "high";
  if (compositeConfidence >= 0.50) return "moderate";
  return "low";
}

// ─── Role Family Taxonomy (fixed v1.0 per spec §1.2) ────────────────────────
export const ROLE_FAMILY_KEYS = [
  "business_partnering",
  "talent_acquisition",
  "learning_development",
  "reward_analytics",
  "er_specialists",
  "operations_tech",
  "hr_leadership",
] as const;
export type RoleFamilyKey = (typeof ROLE_FAMILY_KEYS)[number];

export const ROLE_FAMILY_LABELS: Record<RoleFamilyKey, string> = {
  business_partnering: "Business Partnering",
  talent_acquisition: "Talent Acquisition",
  learning_development: "Learning & Development",
  reward_analytics: "Reward & Analytics",
  er_specialists: "ER & Specialists",
  operations_tech: "Operations & Tech",
  hr_leadership: "HR Leadership",
};

/** Deterministic mapping: role archetype → role family */
const ARCHETYPE_TO_FAMILY: Record<string, RoleFamilyKey> = {
  hrbp: "business_partnering",
  hr_generalist: "business_partnering",
  hr_advisor: "business_partnering",
  hr_professional: "business_partnering",
  talent_acquisition: "talent_acquisition",
  ld_specialist: "learning_development",
  reward: "reward_analytics",
  people_analytics: "reward_analytics",
  er_specialist: "er_specialists",
  od_specialist: "er_specialists",
  hr_ops: "operations_tech",
  shared_services: "operations_tech",
  hris_hr_tech: "operations_tech",
  hr_leader: "hr_leadership",
};

export function archetypeToRoleFamily(archetype: string | null | undefined): RoleFamilyKey {
  if (!archetype) return "business_partnering";
  const normalised = archetype.toLowerCase().replace(/[\s-]+/g, "_");
  return ARCHETYPE_TO_FAMILY[normalised] ?? "business_partnering";
}

/** Also map roleFamily string from users table (which may be a display label) */
export function roleFamilyFromUserField(roleFamily: string | null | undefined): RoleFamilyKey {
  if (!roleFamily) return "business_partnering";
  const lower = roleFamily.toLowerCase().replace(/[\s&-]+/g, "_");
  if (ROLE_FAMILY_LABELS[lower as RoleFamilyKey]) return lower as RoleFamilyKey;
  for (const [key, label] of Object.entries(ROLE_FAMILY_LABELS)) {
    if (label.toLowerCase().replace(/[\s&-]+/g, "_") === lower) return key as RoleFamilyKey;
  }
  return ARCHETYPE_TO_FAMILY[lower] ?? "business_partnering";
}

// ─── Sequential Navy Palette (for heatmap cell backgrounds) ──────────────────
export function scoreToNavyBg(score: number): string {
  if (score >= 80) return "#0F172A";
  if (score >= 70) return "#1E293B";
  if (score >= 60) return "#334155";
  if (score >= 50) return "#475569";
  if (score >= 40) return "#64748B";
  if (score >= 30) return "#94A3B8";
  return "#CBD5E1";
}

export function scoreToNavyText(score: number): string {
  return score >= 50 ? "#F8FAFC" : "#1E293B";
}

export function gapToColour(gap: number): string {
  if (gap >= 20) return "#7F1D1D";
  if (gap >= 15) return "#991B1B";
  if (gap >= 10) return "#B91C1C";
  if (gap >= 5) return "#DC2626";
  if (gap > 0) return "#F59E0B";
  return "#10B981";
}

export function gapToTextColour(gap: number): string {
  return gap >= 10 ? "#FFFFFF" : "#1E293B";
}
