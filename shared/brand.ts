/**
 * AiQ Brand Constants — Single Source of Truth
 *
 * ALL domain colours, level colours, labels, and icons must be imported
 * from this file. Do NOT define them locally in page or component files.
 *
 * Domain palette: Paul Tol Bright (colorblind-safe)
 * Level palette:  Semantic traffic-light (red → green)
 */

// ─── Domain Keys ─────────────────────────────────────────────────────────────

export type DomainKey =
  | "ai_interaction"
  | "ai_output_evaluation"
  | "ai_workflow_design"
  | "workforce_ai_readiness"
  | "ai_ethics_trust"
  | "ai_change_leadership";

export const DOMAIN_KEYS: DomainKey[] = [
  "ai_interaction",
  "ai_output_evaluation",
  "ai_workflow_design",
  "workforce_ai_readiness",
  "ai_ethics_trust",
  "ai_change_leadership",
];

// ─── Domain Labels ────────────────────────────────────────────────────────────

/** Full display labels */
export const DOMAIN_LABELS: Record<DomainKey, string> = {
  ai_interaction:         "AI Interaction",
  ai_output_evaluation:   "AI Output Evaluation",
  ai_workflow_design:     "AI Workflow Design",
  workforce_ai_readiness: "Workforce AI Readiness",
  ai_ethics_trust:        "AI Ethics & Trust",
  ai_change_leadership:   "AI Change Leadership",
};

/** Compact labels for tight spaces (heatmap columns, chips) */
export const DOMAIN_SHORT_LABELS: Record<DomainKey, string> = {
  ai_interaction:         "Interaction",
  ai_output_evaluation:   "Output Eval",
  ai_workflow_design:     "Workflow",
  workforce_ai_readiness: "Workforce",
  ai_ethics_trust:        "Ethics & Trust",
  ai_change_leadership:   "Change",
};

// ─── Domain Colours ───────────────────────────────────────────────────────────
// v2 palette — spec'd hex values per brief (individual assessment dashboard v2)

/** Primary accent colour per domain */
export const DOMAIN_COLOURS: Record<DomainKey, string> = {
  ai_interaction:         "#3B82F6",  // blue-500
  ai_output_evaluation:   "#F59E0B",  // amber-400 (domain identity, NOT a low-score signal)
  ai_workflow_design:     "#10B981",  // emerald-500
  workforce_ai_readiness: "#F43F5E",  // rose-500
  ai_ethics_trust:        "#A855F7",  // purple-500
  ai_change_leadership:   "#6366F1",  // indigo-500
};

/** Translucent background fill (15% opacity) for icon boxes and chips */
export const DOMAIN_BG_COLOURS: Record<DomainKey, string> = {
  ai_interaction:         "rgba(59,130,246,0.15)",
  ai_output_evaluation:   "rgba(245,158,11,0.15)",
  ai_workflow_design:     "rgba(16,185,129,0.15)",
  workforce_ai_readiness: "rgba(244,63,94,0.15)",
  ai_ethics_trust:        "rgba(168,85,247,0.15)",
  ai_change_leadership:   "rgba(99,102,241,0.15)",
};

// ─── Domain Icons (Lucide names — import in client code) ──────────────────────
// Use these string keys to look up the icon component from lucide-react.
// The actual React components are in client/src/lib/brand-icons.ts

export const DOMAIN_ICON_NAMES: Record<DomainKey, string> = {
  ai_interaction:         "MessageSquare",   // Prompting / dialogue
  ai_output_evaluation:   "ScanSearch",      // Scrutinising outputs
  ai_workflow_design:     "Workflow",        // Process / flow design
  workforce_ai_readiness: "Users",           // Team / people
  ai_ethics_trust:        "ShieldCheck",     // Ethics / safety
  ai_change_leadership:   "TrendingUp",      // Growth / transformation
};

// ─── Domain Descriptions ─────────────────────────────────────────────────────

export const DOMAIN_DESCRIPTIONS: Record<DomainKey, string> = {
  ai_interaction:         "How effectively you communicate with AI tools — prompting, iterating, and directing AI to produce useful outputs.",
  ai_output_evaluation:   "Your ability to critically assess AI-generated content for accuracy, fitness for purpose, and hidden errors.",
  ai_workflow_design:     "How well you can identify where AI adds value in a process and design appropriate human-AI handoff points.",
  workforce_ai_readiness: "Your capability to diagnose team AI skill gaps, design interventions, and advise leaders on readiness.",
  ai_ethics_trust:        "How you navigate ethical dilemmas involving AI, maintain employee trust, and hold firm under pressure.",
  ai_change_leadership:   "Your ability to lead AI-driven change — managing resistance, calibrating pace, and designing sustainable transformation.",
};

// ─── Capability Levels ───────────────────────────────────────────────────────
// 5-level scale: 1 Emerging → 2 Developing → 3 Proficient → 4 Advanced → 5 Expert
// Scores are 0–10 (precise level) or 0–100 (raw assessment score).
// Cut-points are UNCHANGED from HEATMAP_THRESHOLDS — only label strings updated.

export type LevelKey = 1 | 2 | 3 | 4 | 5;

/** Display label for each level (D1 — research-aligned progression) */
export const LEVEL_LABELS: Record<LevelKey, string> = {
  1: "Emerging",
  2: "Developing",
  3: "Proficient",
  4: "Advanced",
  5: "Expert",
};

/**
 * Semantic colour pair per level.
 * bg  = filled background (chips, heatmap cells, donut segments)
 * text = foreground text / icon colour on that background
 * hex  = single accent hex for bars, borders, sparklines
 */
export const LEVEL_COLOURS: Record<LevelKey, { bg: string; text: string; hex: string }> = {
  1: { bg: "#3B1F1F", text: "#FCA5A5", hex: "#EF4444" },  // Emerging — red
  2: { bg: "#3B2A1F", text: "#FCD34D", hex: "#F59E0B" },  // Developing — amber
  3: { bg: "#2A3020", text: "#86EFAC", hex: "#22C55E" },  // Capable — light green
  4: { bg: "#1A3A2A", text: "#6EE7B7", hex: "#10B981" },  // Strong — teal-green
  5: { bg: "#1A3020", text: "#4ADE80", hex: "#16A34A" },  // AI Ready — deep green
};

/**
 * Heatmap score-to-level thresholds (scores are 0–10).
 * D1 canonical table — cut-points are LOCKED. Labels updated to research-aligned progression.
 * Used in the team capability heatmap and any score-coloured cell.
 */
export const HEATMAP_THRESHOLDS = [
  { min: 7.5, level: 5 as LevelKey },  // Expert
  { min: 6.0, level: 4 as LevelKey },  // Advanced
  { min: 5.0, level: 3 as LevelKey },  // Proficient
  { min: 3.5, level: 2 as LevelKey },  // Developing
  { min: 0,   level: 1 as LevelKey },  // Emerging
];

/** Convert a 0–10 score to a LevelKey */
export function scoreToLevel(score: number): LevelKey {
  for (const t of HEATMAP_THRESHOLDS) {
    if (score >= t.min) return t.level;
  }
  return 1;
}

/** Convert a 0–100 raw score to a LevelKey */
export function rawScoreToLevel(score: number): LevelKey {
  return scoreToLevel(score / 10);
}

/** Get the colour pair for a 0–10 score */
export function scoreColours(score: number): { bg: string; text: string; hex: string } {
  return LEVEL_COLOURS[scoreToLevel(score)];
}

// ─── D2: One band function, used everywhere ───────────────────────────────────
// bandOf(score) → band label string (the ONLY labelling path on the dashboard)
// gapToNext(score) → next band name + points to boundary (or top-band state)

/** D2 — Single band label function. Reads HEATMAP_THRESHOLDS. */
export function bandOf(score: number): string {
  return LEVEL_LABELS[scoreToLevel(score)];
}

export type GapToNext =
  | { isTop: false; nextBand: string; gap: number; pctThroughBand: number }
  | { isTop: true };

/**
 * D2 — Returns the gap to the next band boundary.
 * Tiebreak (D7b): when two domains share the same gap, caller picks the one
 * with the higher current score (closer to a more advanced band).
 * Returns { isTop: true } when score is already Expert (≥7.5).
 */
export function gapToNext(score: number): GapToNext {
  const level = scoreToLevel(score);
  if (level === 5) return { isTop: true };
  // Find the threshold for the NEXT level up
  const nextLevel = (level + 1) as LevelKey;
  const nextThreshold = HEATMAP_THRESHOLDS.find(t => t.level === nextLevel)!;
  const currentThreshold = HEATMAP_THRESHOLDS.find(t => t.level === level)!;
  const bandWidth = nextThreshold.min - currentThreshold.min;
  const gap = parseFloat((nextThreshold.min - score).toFixed(2));
  const pctThroughBand = Math.min(100, Math.round(((score - currentThreshold.min) / bandWidth) * 100));
  return {
    isTop: false,
    nextBand: LEVEL_LABELS[nextLevel],
    gap,
    pctThroughBand,
  };
}

// ─── Readiness States (3-band legacy) ────────────────────────────────────────
// Used in the People table and HR dashboard for quick traffic-light status.

export const READINESS_COLOURS: Record<string, string> = {
  safe:    LEVEL_COLOURS[5].hex,   // green
  at_risk: LEVEL_COLOURS[2].hex,   // amber
  unsafe:  LEVEL_COLOURS[1].hex,   // red
};

export const READINESS_LABELS: Record<string, string> = {
  safe:    "Expert",
  at_risk: "Developing",
  unsafe:  "Emerging",
};
