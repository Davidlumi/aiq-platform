/**
 * AiQ Design System v2.2 - Score & Rating Colour Utilities
 *
 * Dark navy theme — all colours readable on #0d1117 background.
 * Scores are 0-100 internally; display as 0.0-10.0 where needed.
 */

// -- Sequential capability score scale (dark-navy-compatible) -----------------
// Higher scores → brighter green; lower scores → muted slate on dark bg

const SCORE_STOPS: Array<{ min: number; bg: string; text: string }> = [
  { min: 85, bg: "#22543D", text: "#68D391" }, // Very high  — deep green bg, bright green text
  { min: 75, bg: "#276749", text: "#9AE6B4" }, // High       — green bg, light green text
  { min: 65, bg: "#1E5A4E", text: "#68D391" }, // Above avg  — teal-green bg
  { min: 55, bg: "#2C4A6E", text: "#90CDF4" }, // Average    — cool blue bg
  { min: 40, bg: "#2D3748", text: "#A0AEC0" }, // Below avg  — slate bg
  { min: 20, bg: "#3D2C2C", text: "#FCA5A5" }, // Low        — dark red-tint bg
  { min:  1, bg: "#3D2C2C", text: "#FCA5A5" }, // Very low   — dark red-tint bg
  { min:  0, bg: "#1A2332", text: "#4A5568" }, // No data    — card bg, muted text
];

/** Convert a 0-100 score to a dark-theme sequential bg + text colour */
export function scoreToColor(score: number): { bg: string; text: string } {
  const s = Math.max(0, Math.min(100, score));
  for (const stop of SCORE_STOPS) {
    if (s >= stop.min) return { bg: stop.bg, text: stop.text };
  }
  return { bg: "#1A2332", text: "#4A5568" };
}

/** Convert a 0-100 score to a semi-transparent tinted background for cards/badges */
export function scoreToTint(score: number): { bg: string; text: string; border: string } {
  const s = Math.max(0, Math.min(100, score));
  if (s >= 75) return { bg: "rgba(34,197,94,0.10)",  text: "#68D391", border: "rgba(34,197,94,0.25)" };
  if (s >= 55) return { bg: "rgba(144,205,244,0.10)", text: "#90CDF4", border: "rgba(144,205,244,0.25)" };
  if (s >= 40) return { bg: "rgba(160,174,192,0.10)", text: "#A0AEC0", border: "rgba(160,174,192,0.25)" };
  if (s >= 20) return { bg: "rgba(245,158,11,0.10)",  text: "#F59E0B", border: "rgba(245,158,11,0.25)" };
  return { bg: "rgba(239,68,68,0.10)", text: "#FCA5A5", border: "rgba(239,68,68,0.25)" };
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

// -- Categorical rating colours (dark-navy-safe) --------------------------------
export const RATING_COLORS = {
  ai_ready:             { bg: "#22543D", text: "#68D391", tintBg: "rgba(34,197,94,0.10)",  tintText: "#68D391", tintBorder: "rgba(34,197,94,0.25)" },
  developing:           { bg: "#2C4A6E", text: "#90CDF4", tintBg: "rgba(144,205,244,0.10)",tintText: "#90CDF4", tintBorder: "rgba(144,205,244,0.25)" },
  not_yet_ready:        { bg: "#7C4A00", text: "#F59E0B", tintBg: "rgba(245,158,11,0.10)", tintText: "#F59E0B", tintBorder: "rgba(245,158,11,0.25)" },
  foundation_gap:       { bg: "#7C2D12", text: "#F97316", tintBg: "rgba(249,115,22,0.10)", tintText: "#F97316", tintBorder: "rgba(249,115,22,0.25)" },
  insufficient_evidence:{ bg: "#2D3748", text: "#9CA3AF", tintBg: "rgba(107,114,128,0.10)",tintText: "#9CA3AF", tintBorder: "rgba(107,114,128,0.25)" },
} as const;

// -- Domain identification colours (Paul Tol palette — dark-bg readable) ------
export const DOMAIN_ID_COLORS = {
  ai_interaction:        "#4477AA", // Paul Tol blue
  ai_output_evaluation:  "#EE6677", // Paul Tol rose
  ai_workflow_design:    "#228833", // Paul Tol green
  workforce_ai_readiness:"#CCBB44", // Paul Tol yellow
  ai_ethics_trust:       "#AA3377", // Paul Tol purple
  ai_change_leadership:  "#66CCEE", // Paul Tol cyan
} as const;
