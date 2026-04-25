/**
 * Peakon-style colour scale — shared across the entire AiQ platform.
 *
 * Smooth gradient from deep red (low) → amber (mid) → rich green (high).
 * Scores are 0–100 internally; display as 0.0–10.0 where needed.
 */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Convert a 0-100 score to a Peakon gradient background + text colour */
export function scoreToColor(score: number): { bg: string; text: string } {
  const t = Math.max(0, Math.min(100, score)) / 100;

  let r: number, g: number, b: number;

  if (t < 0.3) {
    const p = t / 0.3;
    r = lerp(220, 239, p);
    g = lerp(53, 108, p);
    b = lerp(69, 96, p);
  } else if (t < 0.45) {
    const p = (t - 0.3) / 0.15;
    r = lerp(239, 245, p);
    g = lerp(108, 166, p);
    b = lerp(96, 84, p);
  } else if (t < 0.55) {
    const p = (t - 0.45) / 0.1;
    r = lerp(245, 210, p);
    g = lerp(166, 200, p);
    b = lerp(84, 90, p);
  } else if (t < 0.7) {
    const p = (t - 0.55) / 0.15;
    r = lerp(210, 130, p);
    g = lerp(200, 195, p);
    b = lerp(90, 100, p);
  } else {
    const p = (t - 0.7) / 0.3;
    r = lerp(130, 67, p);
    g = lerp(195, 160, p);
    b = lerp(100, 71, p);
  }

  return { bg: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`, text: "#FFFFFF" };
}

/** Convert a 0-100 score to a lighter tinted background for cards/badges */
export function scoreToTint(score: number): { bg: string; text: string; border: string } {
  const t = Math.max(0, Math.min(100, score)) / 100;

  if (t >= 0.7)  return { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" };
  if (t >= 0.55) return { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" };
  if (t >= 0.45) return { bg: "#FEFCE8", text: "#854D0E", border: "#FDE68A" };
  if (t >= 0.3)  return { bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA" };
  return { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" };
}

/** Format a 0-100 score as a Peakon-style decimal (e.g. 5.5, 8.7) */
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
