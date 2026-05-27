/**
 * AiQ Design System v3.1 - Score & Rating Colour Utilities
 *
 * Theme-aware: all colours use CSS variables so they respond to light/dark mode.
 * Scores are 0-100 internally; display as 0.0-10.0 where needed.
 *
 * ─── CANONICAL SCORE FORMATTING ───────────────────────────────────────────────
 * All score display MUST go through these functions. No inline /10 conversions.
 * This is the SINGLE source of truth for score → display conversion (A1 fix).
 */

// ─── Capping log (engineering review) ─────────────────────────────────────────
let _capCount = 0;
function logCap(raw: number, context?: string): void {
  _capCount++;
  if (_capCount <= 20) {
    console.warn(`[ScoreCap] Raw score ${raw} capped to 10.0${context ? ` (${context})` : ""}`);
  }
}

/**
 * Format a 0-100 raw score as a /10 decimal string (e.g. "5.5", "8.7").
 * Caps at 10.0 — no "10.8/10" bugs.
 * This is the ONLY function that should perform /100 → /10 conversion.
 */
export function formatScore(score: number | null | undefined, context?: string): string {
  if (score == null || score <= 0) return "—";
  const capped = Math.min(score, 100);
  if (score > 100) logCap(score, context);
  return (capped / 10).toFixed(1);
}

/**
 * Format a score delta (0-100 scale) as a signed /10 string (e.g. "+0.6", "-3.6").
 */
export function formatScoreDelta(delta: number | null | undefined): string {
  if (delta == null) return "—";
  const d10 = delta / 10;
  const sign = d10 > 0 ? "+" : "";
  return `${sign}${d10.toFixed(1)}`;
}

/**
 * Get the numeric /10 value from a raw 0-100 score (for charts, calculations).
 * Caps at 10.0.
 */
export function scoreToDecimal(score: number | null | undefined): number {
  if (score == null || score <= 0) return 0;
  return Math.min(score, 100) / 10;
}

// ─── COLOUR UTILITIES ─────────────────────────────────────────────────────────

/** Convert a 0-100 score to a theme-aware sequential bg + text colour */
export function scoreToColor(score: number): { bg: string; text: string } {
  const s = Math.max(0, Math.min(100, score));
  if (s >= 75) return { bg: "var(--score-ai-ready-bg)",   text: "var(--score-ai-ready-text)" };
  if (s >= 60) return { bg: "var(--score-strong-bg)",     text: "var(--score-strong-text)" };
  if (s >= 45) return { bg: "var(--score-capable-bg)",    text: "var(--score-capable-text)" };
  if (s >= 30) return { bg: "var(--score-developing-bg)", text: "var(--score-developing-text)" };
  if (s >=  1) return { bg: "var(--score-gap-bg)",        text: "var(--score-gap-text)" };
  return { bg: "var(--muted)", text: "var(--muted-foreground)" };
}

/** Convert a 0-100 score to a semi-transparent tinted background for cards/badges */
export function scoreToTint(score: number): { bg: string; text: string; border: string } {
  const s = Math.max(0, Math.min(100, score));
  if (s >= 75) return { bg: "var(--score-ai-ready-bg)",   text: "var(--score-ai-ready-text)",   border: "var(--score-ai-ready-text)" };
  if (s >= 55) return { bg: "var(--score-strong-bg)",     text: "var(--score-strong-text)",     border: "var(--score-strong-text)" };
  if (s >= 40) return { bg: "var(--score-capable-bg)",    text: "var(--score-capable-text)",    border: "var(--score-capable-text)" };
  if (s >= 20) return { bg: "var(--score-developing-bg)", text: "var(--score-developing-text)", border: "var(--score-developing-text)" };
  return { bg: "var(--score-gap-bg)", text: "var(--score-gap-text)", border: "var(--score-gap-text)" };
}

/**
 * Legacy alias — kept for backward compatibility.
 * @deprecated Use formatScore() instead.
 */
export function formatPeakonScore(score: number): string {
  return formatScore(score);
}

/** Get a readiness label for a 0-100 score */
export function scoreToReadinessLabel(score: number): string {
  if (score >= 75) return "Expert";
  if (score >= 60) return "Strong Developing";
  if (score >= 50) return "Developing";
  if (score >= 40) return "Weak Developing";
  if (score >= 30) return "Not Yet Ready";
  return "Foundation Gap";
}

// -- Categorical rating colours (CSS variable references) ----------------------
export const RATING_COLORS = {
  ai_ready:              { bg: "var(--score-ai-ready-bg)",   text: "var(--score-ai-ready-text)",   tintBg: "var(--score-ai-ready-bg)",   tintText: "var(--score-ai-ready-text)",   tintBorder: "var(--score-ai-ready-text)" },
  developing:            { bg: "var(--score-developing-bg)", text: "var(--score-developing-text)", tintBg: "var(--score-developing-bg)", tintText: "var(--score-developing-text)", tintBorder: "var(--score-developing-text)" },
  not_yet_ready:         { bg: "var(--score-capable-bg)",    text: "var(--score-capable-text)",    tintBg: "var(--score-capable-bg)",    tintText: "var(--score-capable-text)",    tintBorder: "var(--score-capable-text)" },
  foundation_gap:        { bg: "var(--score-gap-bg)",        text: "var(--score-gap-text)",        tintBg: "var(--score-gap-bg)",        tintText: "var(--score-gap-text)",        tintBorder: "var(--score-gap-text)" },
  insufficient_evidence: { bg: "var(--muted)",               text: "var(--muted-foreground)",      tintBg: "var(--muted)",               tintText: "var(--muted-foreground)",      tintBorder: "var(--border)" },
} as const;

// -- Domain identification colours (Paul Tol palette -- works on both themes) ---
// These are intentional brand/data colours -- consistent across light and dark
export const DOMAIN_ID_COLORS = {
  ai_interaction:        "#4477AA", // Paul Tol blue
  ai_output_evaluation:  "#EE6677", // Paul Tol rose
  ai_workflow_design:    "#228833", // Paul Tol green
  workforce_ai_readiness:"#CCBB44", // Paul Tol yellow
  ai_ethics_trust:       "#AA3377", // Paul Tol purple
  ai_change_leadership:  "#66CCEE", // Paul Tol cyan
} as const;
