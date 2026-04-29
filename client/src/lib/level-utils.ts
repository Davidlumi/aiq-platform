/**
 * AiQ Design System v2.2 - Level Scale Utilities
 *
 * 5-level scale: 1 Emerging → 2 Developing → 3 Capable → 4 Strong → 5 AI Ready
 * Score is 0-100 (raw assessment score).
 * Precise level = score / 10 (e.g. score 26 → Level 2.6).
 *
 * Colour palette (dark navy theme — readable on #0d1117 background):
 *   Level 1: #2D3748 bg / #A0AEC0 text  (muted slate — emerging)
 *   Level 2: #2C4A6E bg / #90CDF4 text  (cool blue — developing)
 *   Level 3: #1E5A4E bg / #68D391 text  (teal-green — capable)
 *   Level 4: #276749 bg / #9AE6B4 text  (green — strong)
 *   Level 5: #22543D bg / #68D391 text  (deep green — AI Ready)
 */

export const LEVEL_COLOURS: Record<number, { bg: string; text: string }> = {
  1: { bg: "#2D3748", text: "#A0AEC0" },  // Emerging — muted slate
  2: { bg: "#2C4A6E", text: "#90CDF4" },  // Developing — cool blue
  3: { bg: "#1E5A4E", text: "#68D391" },  // Capable — teal-green
  4: { bg: "#276749", text: "#9AE6B4" },  // Strong — green
  5: { bg: "#22543D", text: "#68D391" },  // AI Ready — deep green
};

export const LEVEL_LABELS: Record<number, string> = {
  1: "Emerging",
  2: "Developing",
  3: "Capable",
  4: "Strong",
  5: "AI Ready",
};

/** Convert raw 0-100 score to integer level 1-5 */
export function getLevelFromScore(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

/** Convert raw 0-100 score to precise level string e.g. "2.6" */
export function getPreciseLevel(score: number): string {
  return (score / 10).toFixed(1);
}

/** Get level chip colour pair for a given integer level */
export function getLevelChipStyle(level: number): { bg: string; text: string } {
  return LEVEL_COLOURS[level] ?? LEVEL_COLOURS[2];
}

/** Get level label for a given integer level */
export function getLevelLabel(level: number): string {
  return LEVEL_LABELS[level] ?? "Developing";
}

/**
 * Get the bar fill colour for a precise level (used in heatmap cells).
 * Returns the bg colour for the integer level.
 */
export function getLevelBarColour(preciseLevel: number): string {
  const level = Math.min(5, Math.max(1, Math.ceil(preciseLevel)));
  return LEVEL_COLOURS[level]?.bg ?? "#2C4A6E";
}

/**
 * Get text colour for a heatmap cell based on level.
 * All levels use their palette text colour on dark backgrounds.
 */
export function getLevelCellTextColour(level: number): string {
  return LEVEL_COLOURS[level]?.text ?? "#FFFFFF";
}
