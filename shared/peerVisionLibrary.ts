/**
 * Peer Vision Library — curated starting-point vision statements for Stage 2.
 * Each entry is anonymised and sector/size tagged.
 * CPO selects one as inspiration; original author is never shown.
 */

export type PeerVisionEntry = {
  id: string;
  visionText: string;
  /** Sectors this entry is relevant to */
  sectors: string[];
  /** Size bands this entry is relevant to */
  sizeBands: Array<"lt500" | "500_5k" | "5k_25k" | "25k_plus">;
  /** Optional workforce composition filter */
  workforceCompositions?: string[];
  /** Archetype hint for the Strategy stage */
  archetypeHint?: "augmentation" | "transformation" | "differentiation" | "efficiency" | "defensive";
};

export const PEER_VISION_LIBRARY: PeerVisionEntry[] = [
  // ── Retail / Frontline ────────────────────────────────────────────────────
  {
    id: "pv_retail_frontline_01",
    visionText:
      "By 2027, every store manager spends less time on scheduling and compliance and more time developing their team — because AI handles the routine so our people can focus on the work that matters.",
    sectors: ["retail", "hospitality_leisure", "logistics_transport"],
    sizeBands: ["5k_25k", "25k_plus"],
    workforceCompositions: ["frontline_heavy", "mixed"],
    archetypeHint: "efficiency",
  },
  {
    id: "pv_retail_frontline_02",
    visionText:
      "HR uses AI to give every frontline employee the same quality of support and development opportunity as our head-office colleagues — removing the postcode lottery of people management quality.",
    sectors: ["retail", "hospitality_leisure"],
    sizeBands: ["5k_25k", "25k_plus"],
    workforceCompositions: ["frontline_heavy"],
    archetypeHint: "differentiation",
  },
  // ── Financial Services ────────────────────────────────────────────────────
  {
    id: "pv_fs_01",
    visionText:
      "By 2026, our HR function operates as a trusted AI-enabled partner — using data and intelligent tools to give business leaders faster, more accurate people insights while maintaining the human judgement that our regulatory environment demands.",
    sectors: ["financial_services"],
    sizeBands: ["500_5k", "5k_25k", "25k_plus"],
    archetypeHint: "augmentation",
  },
  {
    id: "pv_fs_02",
    visionText:
      "We will build an HR function where AI augments every significant people decision — from hiring to succession — while our team retains full accountability for outcomes and our regulators can always see the human in the loop.",
    sectors: ["financial_services"],
    sizeBands: ["500_5k", "5k_25k"],
    archetypeHint: "augmentation",
  },
  // ── Healthcare / Public Sector ────────────────────────────────────────────
  {
    id: "pv_health_01",
    visionText:
      "AI frees our HR team from administrative burden so they can spend more time supporting the wellbeing, development and retention of the clinical workforce that our patients depend on.",
    sectors: ["healthcare", "public_sector"],
    sizeBands: ["5k_25k", "25k_plus"],
    archetypeHint: "efficiency",
  },
  {
    id: "pv_health_02",
    visionText:
      "By 2027, every HR professional in our organisation is AI-literate — able to critically evaluate AI-generated insights, identify bias, and make better decisions for our diverse workforce.",
    sectors: ["healthcare", "public_sector", "education"],
    sizeBands: ["500_5k", "5k_25k", "25k_plus"],
    archetypeHint: "transformation",
  },
  // ── Technology ────────────────────────────────────────────────────────────
  {
    id: "pv_tech_01",
    visionText:
      "HR leads the organisation's AI capability agenda — not just deploying AI tools in our own function, but building the workforce AI literacy, governance frameworks, and change capability the whole business needs to compete.",
    sectors: ["technology"],
    sizeBands: ["500_5k", "5k_25k"],
    archetypeHint: "transformation",
  },
  {
    id: "pv_tech_02",
    visionText:
      "We will use AI to make our talent acquisition genuinely predictive — reducing time-to-fill, improving quality-of-hire, and eliminating the structural bias that has historically limited our candidate diversity.",
    sectors: ["technology", "professional_services"],
    sizeBands: ["500_5k", "5k_25k"],
    archetypeHint: "differentiation",
  },
  // ── Professional Services ─────────────────────────────────────────────────
  {
    id: "pv_ps_01",
    visionText:
      "By 2026, our HR function is the most data-informed it has ever been — using AI to surface the skills gaps, flight risks, and development opportunities that our partners need to build the next generation of client-facing talent.",
    sectors: ["professional_services"],
    sizeBands: ["500_5k", "5k_25k"],
    archetypeHint: "differentiation",
  },
  {
    id: "pv_ps_02",
    visionText:
      "AI enables our HR team to shift from reactive case management to proactive people strategy — spending less time on process and more time on the advisory work that creates genuine competitive advantage.",
    sectors: ["professional_services", "financial_services"],
    sizeBands: ["lt500", "500_5k"],
    archetypeHint: "augmentation",
  },
  // ── Manufacturing / Energy ────────────────────────────────────────────────
  {
    id: "pv_mfg_01",
    visionText:
      "AI supports our safety-critical workforce planning — ensuring the right skills are in the right place at the right time, reducing compliance risk, and giving our site managers better visibility of workforce readiness.",
    sectors: ["manufacturing", "energy_utilities"],
    sizeBands: ["5k_25k", "25k_plus"],
    workforceCompositions: ["frontline_heavy", "mixed"],
    archetypeHint: "efficiency",
  },
  // ── SME / General ─────────────────────────────────────────────────────────
  {
    id: "pv_sme_01",
    visionText:
      "As a growing business, AI lets our small HR team punch above its weight — automating the routine so we can focus on the culture, development, and retention work that will define who we are as an employer.",
    sectors: ["technology", "professional_services", "retail", "other"],
    sizeBands: ["lt500", "500_5k"],
    archetypeHint: "efficiency",
  },
  {
    id: "pv_sme_02",
    visionText:
      "We will use AI responsibly and transparently — building employee trust in our people processes by being clear about when AI is involved, what it decides, and how humans stay accountable.",
    sectors: ["technology", "financial_services", "professional_services", "other"],
    sizeBands: ["lt500", "500_5k", "5k_25k"],
    archetypeHint: "defensive",
  },
  // ── Transformation-focused ────────────────────────────────────────────────
  {
    id: "pv_transform_01",
    visionText:
      "HR will lead the organisation's transformation to an AI-native way of working — not by deploying tools, but by building the human capabilities, governance structures, and cultural conditions that make AI work for our people.",
    sectors: ["technology", "financial_services", "professional_services", "retail"],
    sizeBands: ["5k_25k", "25k_plus"],
    archetypeHint: "transformation",
  },
];
