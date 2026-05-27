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
  /** Platform mode this entry is relevant to (defaults to both) */
  mode?: "cpo" | "reward" | "both";
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
  // ── Logistics / Transport ──────────────────────────────────────────────
  {
    id: "pv_logistics_01",
    visionText:
      "We will use AI to make our workforce planning as dynamic as our operations — matching driver and warehouse capacity to demand in real time, reducing agency spend, and giving our people more predictable schedules without sacrificing service levels.",
    sectors: ["logistics_transport", "retail", "manufacturing"],
    sizeBands: ["5k_25k", "25k_plus"],
    workforceCompositions: ["frontline_heavy", "mixed"],
    archetypeHint: "efficiency",
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
  // ── Reward-specific Peer Visions ─────────────────────────────────────────────
  {
    id: "pv_reward_equity_01",
    visionText:
      "By 2027, every pay decision in our organisation is supported by AI that surfaces equity risks before they become problems — making fair pay the default, not the exception.",
    sectors: ["financial_services", "professional_services", "technology"],
    sizeBands: ["5k_25k", "25k_plus"],
    archetypeHint: "defensive",
    mode: "reward",
  },
  {
    id: "pv_reward_efficiency_01",
    visionText:
      "Our annual reward cycle will shrink from 14 weeks to 4 — AI handles the data gathering, modelling, and compliance checks so our Reward team can focus on the conversations that matter.",
    sectors: ["retail", "manufacturing", "financial_services"],
    sizeBands: ["5k_25k", "25k_plus"],
    archetypeHint: "efficiency",
    mode: "reward",
  },
  {
    id: "pv_reward_transparency_01",
    visionText:
      "Every employee will understand exactly how their total reward is constructed, why it's fair, and what they can do to grow it — because AI makes personalised reward communication possible at scale.",
    sectors: ["technology", "professional_services", "healthcare_pharma"],
    sizeBands: ["500_5k", "5k_25k", "25k_plus"],
    archetypeHint: "differentiation",
    mode: "reward",
  },
  {
    id: "pv_reward_retention_01",
    visionText:
      "We will use AI to identify compensation-driven flight risk 6 months before resignation — giving managers the insight and budget authority to retain critical talent before it's too late.",
    sectors: ["technology", "financial_services", "professional_services"],
    sizeBands: ["500_5k", "5k_25k", "25k_plus"],
    archetypeHint: "augmentation",
    mode: "reward",
  },
  {
    id: "pv_reward_market_01",
    visionText:
      "Our compensation benchmarking will move from annual surveys to continuous market intelligence — AI monitors competitor moves and alerts us to market shifts before we lose people.",
    sectors: ["technology", "financial_services", "retail"],
    sizeBands: ["5k_25k", "25k_plus"],
    archetypeHint: "augmentation",
    mode: "reward",
  },
  {
    id: "pv_reward_benefits_01",
    visionText:
      "AI will help us move from one-size-fits-all benefits to truly personalised packages — recommending the right benefits at the right life stage, increasing utilisation from 40% to 80%.",
    sectors: ["retail", "hospitality_leisure", "manufacturing", "technology"],
    sizeBands: ["5k_25k", "25k_plus"],
    archetypeHint: "differentiation",
    mode: "reward",
  },
  {
    id: "pv_reward_governance_01",
    visionText:
      "Every compensation decision will have a complete audit trail — AI ensures we can demonstrate pay equity compliance to any regulator, at any time, without a manual data pull.",
    sectors: ["financial_services", "healthcare_pharma", "energy_utilities"],
    sizeBands: ["5k_25k", "25k_plus"],
    archetypeHint: "defensive",
    mode: "reward",
  },
  {
    id: "pv_reward_global_01",
    visionText:
      "We will use AI to harmonise reward principles across 30+ countries while respecting local market norms — achieving global consistency without sacrificing local competitiveness.",
    sectors: ["manufacturing", "technology", "professional_services"],
    sizeBands: ["25k_plus"],
    archetypeHint: "efficiency",
    mode: "reward",
  },
  {
    id: "pv_reward_manager_01",
    visionText:
      "Line managers will have AI-powered reward guidance at the point of decision — seeing equity context, budget impact, and market data before making any pay or promotion recommendation.",
    sectors: ["retail", "financial_services", "technology", "professional_services"],
    sizeBands: ["500_5k", "5k_25k", "25k_plus"],
    archetypeHint: "augmentation",
    mode: "reward",
  },
  {
    id: "pv_reward_sales_comp_01",
    visionText:
      "AI will model sales compensation scenarios in real time — letting us adjust incentive structures quarterly rather than annually, keeping our sales force motivated and aligned to shifting business priorities.",
    sectors: ["technology", "financial_services", "retail"],
    sizeBands: ["500_5k", "5k_25k"],
    archetypeHint: "transformation",
    mode: "reward",
  },
  {
    id: "pv_reward_exec_comp_01",
    visionText:
      "Our executive compensation governance will be AI-augmented — modelling long-term incentive scenarios, peer benchmarking, and shareholder impact before any RemCo decision is made.",
    sectors: ["financial_services", "energy_utilities", "technology"],
    sizeBands: ["5k_25k", "25k_plus"],
    archetypeHint: "augmentation",
    mode: "reward",
  },
  {
    id: "pv_reward_cost_model_01",
    visionText:
      "The Reward function will become the organisation's workforce cost intelligence centre — using AI to model total people cost scenarios that inform every major business decision.",
    sectors: ["manufacturing", "retail", "logistics_transport", "financial_services"],
    sizeBands: ["5k_25k", "25k_plus"],
    archetypeHint: "transformation",
    mode: "reward",
  },
];
