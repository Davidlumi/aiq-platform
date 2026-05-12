/**
 * Shared currency formatting utilities for AiQ platform.
 *
 * All monetary values displayed to users MUST use these functions to ensure
 * consistent output across the Overview, Investment & Risk, and Value pages.
 *
 * Brief spec: £XXk (under £1M), £X.XM (under £1B), £X.XB (£1B+)
 * "Estimated" is the user-facing word for midpoint values.
 */

/**
 * Format a GBP value in pounds (not thousands).
 * Examples:
 *   formatGbp(660_000)        → "£660k"
 *   formatGbp(33_000_000)     → "£33.0M"
 *   formatGbp(1_200_000_000)  → "£1.2B"
 *   formatGbp(500)            → "£500"
 */
export function formatGbp(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  if (n >= 1_000_000_000) return `£${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `£${Math.round(n / 1_000)}k`;
  return `£${Math.round(n)}`;
}

/**
 * Format the midpoint of a low–high range.
 * Rounds the midpoint before formatting.
 */
export function formatGbpMidpoint(low: number, high: number): string {
  return formatGbp(Math.round((low + high) / 2));
}

/**
 * Format a range as "£XXk–£XXk" or "£X.XM–£X.XM".
 */
export function formatGbpRange(low: number, high: number): string {
  return `${formatGbp(low)}–${formatGbp(high)}`;
}

/**
 * Format a value in thousands (i.e. the input is already in £k).
 * Used when engine returns values in £k units.
 */
export function formatGbpK(nk: number): string {
  return formatGbp(nk * 1_000);
}

/**
 * Format midpoint of a low–high range where inputs are in £k.
 */
export function formatGbpKMidpoint(lowK: number, highK: number): string {
  return formatGbpMidpoint(lowK * 1_000, highK * 1_000);
}

/**
 * Format a range where inputs are in £k.
 */
export function formatGbpKRange(lowK: number, highK: number): string {
  return formatGbpRange(lowK * 1_000, highK * 1_000);
}
