/**
 * AiQ Level Scale Utilities
 *
 * 5-level scale: 1 Emerging → 2 Developing → 3 Capable → 4 Strong → 5 AI Ready
 * Score is 0-100 (raw assessment score).
 *
 * Colour definitions are in shared/brand.ts — this file re-exports them
 * and provides helper functions used across the frontend.
 */
import { LEVEL_COLOURS as _BRAND_LEVEL_COLOURS, LEVEL_LABELS as _BRAND_LEVEL_LABELS } from "@shared/brand";

// Re-export for legacy imports (same shape: { bg, text })
export const LEVEL_COLOURS: Record<number, { bg: string; text: string }> = _BRAND_LEVEL_COLOURS as Record<number, { bg: string; text: string }>;
export const LEVEL_LABELS: Record<number, string> = _BRAND_LEVEL_LABELS as Record<number, string>;

/** Convert raw 0-100 score to integer level 1-5 */
export function getLevelFromScore(score: number): number {
  const s = score / 10;
  if (s >= 7.5) return 5;
  if (s >= 6.0) return 4;
  if (s >= 5.0) return 3;
  if (s >= 3.5) return 2;
  return 1;
}

/** Convert raw 0-100 score to precise level string e.g. "7.6" */
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
 * Returns the hex accent colour for the integer level.
 */
export function getLevelBarColour(preciseLevel: number): string {
  const level = Math.min(5, Math.max(1, Math.ceil(preciseLevel)));
  return (_BRAND_LEVEL_COLOURS as Record<number, { hex: string }>)[level]?.hex ?? "#22C55E";
}

/**
 * Get text colour for a heatmap cell based on level.
 */
export function getLevelCellTextColour(level: number): string {
  return LEVEL_COLOURS[level]?.text ?? "#FFFFFF";
}
