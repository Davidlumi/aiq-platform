/**
 * Peakon-style colour scale — shared across the entire AiQ platform.
 *
 * Muted, desaturated palette inspired by Peakon/Workday:
 * - Low scores: dusty rose / muted terracotta
 * - Mid scores: warm sand / muted amber
 * - High scores: sage green / muted teal
 *
 * Scores are 0–100 internally; display as 0.0–10.0 where needed.
 */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Convert a 0-100 score to a Peakon-style muted gradient background + text colour */
export function scoreToColor(score: number): { bg: string; text: string } {
  const t = Math.max(0, Math.min(100, score)) / 100;

  let r: number, g: number, b: number;

  // 0–30: muted terracotta → dusty rose
  if (t < 0.3) {
    const p = t / 0.3;
    r = lerp(196, 210, p);
    g = lerp(100, 120, p);
    b = lerp(95, 110, p);
  // 30–45: dusty rose → warm sand
  } else if (t < 0.45) {
    const p = (t - 0.3) / 0.15;
    r = lerp(210, 215, p);
    g = lerp(120, 160, p);
    b = lerp(110, 100, p);
  // 45–55: warm sand → muted amber
  } else if (t < 0.55) {
    const p = (t - 0.45) / 0.1;
    r = lerp(215, 200, p);
    g = lerp(160, 175, p);
    b = lerp(100, 95, p);
  // 55–70: muted amber → sage
  } else if (t < 0.7) {
    const p = (t - 0.55) / 0.15;
    r = lerp(200, 130, p);
    g = lerp(175, 175, p);
    b = lerp(95, 110, p);
  // 70–100: sage → muted teal green
  } else {
    const p = (t - 0.7) / 0.3;
    r = lerp(130, 80, p);
    g = lerp(175, 160, p);
    b = lerp(110, 120, p);
  }

  return { bg: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`, text: "#FFFFFF" };
}

/** Convert a 0-100 score to a lighter tinted background for cards/badges (Peakon muted style) */
export function scoreToTint(score: number): { bg: string; text: string; border: string } {
  const t = Math.max(0, Math.min(100, score)) / 100;

  // Muted sage green — high scores
  if (t >= 0.7)  return { bg: "#F0F4F0", text: "#2D5A3D", border: "#B8CEB8" };
  // Soft sage — upper mid
  if (t >= 0.55) return { bg: "#F3F4EE", text: "#3D5230", border: "#C8D0B0" };
  // Warm sand — mid
  if (t >= 0.45) return { bg: "#F7F3EC", text: "#6B4F1E", border: "#D8C89A" };
  // Dusty rose — lower mid
  if (t >= 0.3)  return { bg: "#F5EFEE", text: "#6B3030", border: "#D4B0A8" };
  // Muted terracotta — low
  return { bg: "#F4EEEC", text: "#6B2E2E", border: "#CCA898" };
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
