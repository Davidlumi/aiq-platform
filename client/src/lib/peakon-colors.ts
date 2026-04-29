/**
 * AiQ Design System v2.2 — Score & Rating Colour Utilities
 *
 * Capability score scale: single-hue sequential navy (neutral → deep navy)
 * Rating colours: categorical, distinct hues (green / blue / amber / red / grey)
 *
 * Scores are 0–100 internally; display as 0.0–10.0 where needed.
 */

// ── Sequential capability score scale (single-hue navy) ──────────────────────
// Mirrors Design System v2.2 §2.3

const SCORE_STOPS: Array<{ min: number; bg: string; text: string }> = [
  { min: 85, bg: "#1F3A5F", text: "#FFFFFF" }, // Very high
  { min: 75, bg: "#2E4C7A", text: "#FFFFFF" }, // High
  { min: 65, bg: "#3F5F94", text: "#FFFFFF" }, // Above average
  { min: 55, bg: "#557DAE", text: "#FFFFFF" }, // Average
  { min: 40, bg: "#94A3B8", text: "#FFFFFF" }, // Below average
  { min: 20, bg: "#D1D5DB", text: "#374151" }, // Low
  { min:  1, bg: "#E5E7EB", text: "#374151" }, // Very low
  { min:  0, bg: "#F3F4F6", text: "#6B7280" }, // No data / insufficient
];

/** Convert a 0-100 score to the Design System v2.2 sequential navy bg + text colour */
export function scoreToColor(score: number): { bg: string; text: string } {
  const s = Math.max(0, Math.min(100, score));
  for (const stop of SCORE_STOPS) {
    if (s >= stop.min) return { bg: stop.bg, text: stop.text };
  }
  return { bg: "#F3F4F6", text: "#6B7280" };
}

/** Convert a 0-100 score to a lighter tinted background for cards/badges */
export function scoreToTint(score: number): { bg: string; text: string; border: string } {
  const s = Math.max(0, Math.min(100, score));
  if (s >= 75) return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" };
  if (s >= 55) return { bg: "#f0f9ff", text: "#0369a1", border: "#bae6fd" };
  if (s >= 40) return { bg: "#fafafa", text: "#374151", border: "#e5e7eb" };
  if (s >= 20) return { bg: "#fffbeb", text: "#b45309", border: "#fde68a" };
  return { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" };
}

/** Format a 0-100 score as a decimal (e.g. 5.5, 8.7) */
export function formatPeakonScore(score: number): string {
  return (score / 10).toFixed(1);
}

/** Get a readiness label for a 0-100 score */
export function scoreToReadinessLabel(score: number): string {
  if (score >= 75) return "AI Ready";
  if (score >= 60) return "Strong Developing";
  if (score >= 50) return "Developing";
  if (score >= 40) return "Weak Developing";
  if (score >= 30) return "Not Yet Ready";
  return "Foundation Gap";
}

// ── Categorical rating colours ────────────────────────────────────────────────
// Design System v2.2 §2.2 — distinct hues, never gradations

export const RATING_COLORS = {
  ai_ready:             { bg: "#047857", text: "#FFFFFF", tintBg: "#f0fdf4", tintText: "#047857", tintBorder: "#bbf7d0" },
  developing:           { bg: "#2563EB", text: "#FFFFFF", tintBg: "#eff6ff", tintText: "#1d4ed8", tintBorder: "#bfdbfe" },
  not_yet_ready:        { bg: "#D97706", text: "#FFFFFF", tintBg: "#fffbeb", tintText: "#b45309", tintBorder: "#fde68a" },
  foundation_gap:       { bg: "#DC2626", text: "#FFFFFF", tintBg: "#fef2f2", tintText: "#b91c1c", tintBorder: "#fecaca" },
  insufficient_evidence:{ bg: "#6B7280", text: "#FFFFFF", tintBg: "#F9FAFB", tintText: "#6B7280", tintBorder: "#D1D5DB" },
} as const;

// ── Domain identification colours ─────────────────────────────────────────────
// Design System v2.2 §6.3 — fixed per domain, NOT used for ratings

export const DOMAIN_ID_COLORS = {
  ai_interaction:        "#0EA5E9", // sky blue
  ai_output_evaluation:  "#8B5CF6", // violet
  ai_workflow_design:    "#10B981", // emerald
  workforce_ai_readiness:"#F59E0B", // amber
  ai_ethics_trust:       "#EC4899", // pink
  ai_change_leadership:  "#EF4444", // red
} as const;
