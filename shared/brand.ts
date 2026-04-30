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
// Paul Tol Bright palette — colorblind-safe, vibrant on dark backgrounds

/** Primary accent colour per domain */
export const DOMAIN_COLOURS: Record<DomainKey, string> = {
  ai_interaction:         "#4477AA",  // Tol blue
  ai_output_evaluation:   "#EE6677",  // Tol rose
  ai_workflow_design:     "#228833",  // Tol green
  workforce_ai_readiness: "#CCBB44",  // Tol yellow
  ai_ethics_trust:        "#AA3377",  // Tol purple
  ai_change_leadership:   "#66CCEE",  // Tol cyan
};

/** Translucent background fill (12% opacity) for cards/chips */
export const DOMAIN_BG_COLOURS: Record<DomainKey, string> = {
  ai_interaction:         "rgba(68,119,170,0.12)",
  ai_output_evaluation:   "rgba(238,102,119,0.12)",
  ai_workflow_design:     "rgba(34,136,51,0.12)",
  workforce_ai_readiness: "rgba(204,187,68,0.12)",
  ai_ethics_trust:        "rgba(170,51,119,0.12)",
  ai_change_leadership:   "rgba(102,204,238,0.12)",
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
// 5-level scale: 1 Emerging → 2 Developing → 3 Capable → 4 Strong → 5 AI Ready
// Scores are 0–10 (precise level) or 0–100 (raw assessment score).

export type LevelKey = 1 | 2 | 3 | 4 | 5;

/** Display label for each level */
export const LEVEL_LABELS: Record<LevelKey, string> = {
  1: "Emerging",
  2: "Developing",
  3: "Capable",
  4: "Strong",
  5: "AI Ready",
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
 * Used in the team capability heatmap and any score-coloured cell.
 */
export const HEATMAP_THRESHOLDS = [
  { min: 7.5, level: 5 as LevelKey },  // AI Ready
  { min: 6.0, level: 4 as LevelKey },  // Strong
  { min: 5.0, level: 3 as LevelKey },  // Capable
  { min: 3.5, level: 2 as LevelKey },  // Developing
  { min: 0,   level: 1 as LevelKey },  // Emerging / Gap
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

// ─── Readiness States (3-band legacy) ────────────────────────────────────────
// Used in the People table and HR dashboard for quick traffic-light status.

export const READINESS_COLOURS: Record<string, string> = {
  safe:    LEVEL_COLOURS[5].hex,   // green
  at_risk: LEVEL_COLOURS[2].hex,   // amber
  unsafe:  LEVEL_COLOURS[1].hex,   // red
};

export const READINESS_LABELS: Record<string, string> = {
  safe:    "AI Ready",
  at_risk: "Developing",
  unsafe:  "Not Yet Ready",
};
