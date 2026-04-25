/**
 * AiQ Dashboard Specification v1.1 — Shared Constants
 *
 * Single source of truth for readiness ratings, domain definitions,
 * role family taxonomy, and display mappings used across all three dashboards.
 */

// ─── Capability Domains (fixed order per spec §1.2) ─────────────────────────
export const DOMAIN_KEYS = [
  "ai_interaction",
  "ai_output_evaluation",
  "ai_workflow_design",
  "workforce_ai_readiness",
  "ai_ethics_trust",
  "ai_change_leadership",
] as const;
export type DomainKey = (typeof DOMAIN_KEYS)[number];

export const DOMAIN_LABELS: Record<DomainKey, string> = {
  ai_interaction: "AI Interaction",
  ai_output_evaluation: "AI Output Evaluation",
  ai_workflow_design: "AI Workflow Design",
  workforce_ai_readiness: "Workforce AI Readiness",
  ai_ethics_trust: "AI Ethics & Trust",
  ai_change_leadership: "AI Change Leadership",
};

export const DOMAIN_DESCRIPTIONS: Record<DomainKey, string> = {
  ai_interaction: "How effectively you communicate with and direct AI systems to achieve intended outcomes.",
  ai_output_evaluation: "Your ability to critically assess AI-generated outputs for accuracy, bias, and fitness for purpose.",
  ai_workflow_design: "How well you design human-AI workflows that balance efficiency with appropriate oversight.",
  workforce_ai_readiness: "Your preparedness to lead and support teams through AI-driven workplace transformation.",
  ai_ethics_trust: "Your capability to navigate ethical considerations and build trust in AI-augmented processes.",
  ai_change_leadership: "Your ability to lead organisational change in the context of AI adoption and transformation.",
};

/** Domain colours per Design System v2.2 §6.3 */
export const DOMAIN_COLOURS: Record<DomainKey, string> = {
  ai_interaction: "#3B82F6",
  ai_output_evaluation: "#8B5CF6",
  ai_workflow_design: "#10B981",
  workforce_ai_readiness: "#F59E0B",
  ai_ethics_trust: "#EF4444",
  ai_change_leadership: "#06B6D4",
};

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
  // Check if it's already a key
  if (ROLE_FAMILY_LABELS[lower as RoleFamilyKey]) return lower as RoleFamilyKey;
  // Check display labels
  for (const [key, label] of Object.entries(ROLE_FAMILY_LABELS)) {
    if (label.toLowerCase().replace(/[\s&-]+/g, "_") === lower) return key as RoleFamilyKey;
  }
  // Check archetype mapping
  return ARCHETYPE_TO_FAMILY[lower] ?? "business_partnering";
}

// ─── Sequential Navy Palette (for heatmap cell backgrounds) ──────────────────
/** Score-based background colour using sequential navy palette per Design System v2.2 */
export function scoreToNavyBg(score: number): string {
  if (score >= 80) return "#0F172A"; // navy-900 — strong
  if (score >= 70) return "#1E293B"; // navy-800
  if (score >= 60) return "#334155"; // navy-700
  if (score >= 50) return "#475569"; // navy-600
  if (score >= 40) return "#64748B"; // navy-500
  if (score >= 30) return "#94A3B8"; // navy-400
  return "#CBD5E1"; // navy-300 — weak
}

export function scoreToNavyText(score: number): string {
  return score >= 50 ? "#F8FAFC" : "#1E293B";
}

/** Gap-based background colour (higher gap = stronger colour to draw attention) */
export function gapToColour(gap: number): string {
  if (gap >= 20) return "#7F1D1D"; // red-900
  if (gap >= 15) return "#991B1B"; // red-800
  if (gap >= 10) return "#B91C1C"; // red-700
  if (gap >= 5) return "#DC2626"; // red-600
  if (gap > 0) return "#F59E0B"; // amber-500
  return "#10B981"; // green-500 — at or above target
}

export function gapToTextColour(gap: number): string {
  return gap >= 10 ? "#FFFFFF" : "#1E293B";
}
