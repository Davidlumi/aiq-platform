/**
 * AiQ Design System v2.2 — Level Scale Utilities
 *
 * 5-level scale: 1 Emerging → 2 Developing → 3 Capable → 4 Strong → 5 AI Ready
 * Score is 0–100 (raw assessment score).
 * Precise level = score / 10 (e.g. score 26 → Level 2.6).
 *
 * Colour palette (from wireframe shared.css):
 *   Level 1: #E5E7EB bg / #4B5563 text
 *   Level 2: #94A3B8 bg / #FFFFFF text
 *   Level 3: #557DAE bg / #FFFFFF text
 *   Level 4: #2E4C7A bg / #FFFFFF text
 *   Level 5: #1F3A5F bg / #FFFFFF text
 */

export const LEVEL_COLOURS: Record<number, { bg: string; text: string }> = {
  1: { bg: "#E5E7EB", text: "#4B5563" },
  2: { bg: "#94A3B8", text: "#FFFFFF" },
  3: { bg: "#557DAE", text: "#FFFFFF" },
  4: { bg: "#2E4C7A", text: "#FFFFFF" },
  5: { bg: "#1F3A5F", text: "#FFFFFF" },
};

export const LEVEL_LABELS: Record<number, string> = {
  1: "Emerging",
  2: "Developing",
  3: "Capable",
  4: "Strong",
  5: "AI Ready",
};

/** Convert raw 0–100 score to integer level 1–5 */
export function getLevelFromScore(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

/** Convert raw 0–100 score to precise level string e.g. "2.6" */
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
  return LEVEL_COLOURS[level]?.bg ?? "#94A3B8";
}

/**
 * Get text colour for a heatmap cell based on level.
 * Levels 1 use dark text; levels 2–5 use white.
 */
export function getLevelCellTextColour(level: number): string {
  return level <= 1 ? "#0F2547" : "#FFFFFF";
}
