/**
 * Reward Initiative Library — 30 Reward AI initiatives
 *
 * Each initiative includes:
 *   - Metadata (id, title, description, sub-domain, default phase, complexity)
 *   - Recommendation rules (sector_fit, workforce_fit, capability_fit, priority_fit)
 *   - Value calibration formula (base values + multipliers)
 *   - Bundling / prerequisite relationships
 *   - Reasoning templates (strong_fit, moderate_fit, weak_fit, not_recommended)
 *
 * Rules engine: four signals combined per spec §3.
 * Value calibration: log-scaled payroll + headcount + sector multiplier per spec §3.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type FitSignal = "STRONG_FIT" | "MODERATE_FIT" | "WEAK_FIT" | "NOT_RECOMMENDED";

export type RewardSubDomain =
  | "Compensation"
  | "Pay Equity"
  | "Pay Transparency"
  | "Benefits"
  | "Reward Operations"
  | "Executive Compensation"
  | "Sales Compensation";

export type RewardPhase = "Foundation" | "Build" | "Optimise";
export type RewardComplexity = "Low" | "Medium" | "High" | "Highest";

export interface SectorFitMap {
  financial_services?: FitSignal;
  technology?: FitSignal;
  professional_services?: FitSignal;
  retail?: FitSignal;
  manufacturing?: FitSignal;
  hospitality_leisure?: FitSignal;
  public_sector?: FitSignal;
  higher_education?: FitSignal;
  not_for_profit?: FitSignal;
  healthcare?: FitSignal;
  energy_utilities?: FitSignal;
  media_entertainment?: FitSignal;
  logistics_transport?: FitSignal;
  construction_real_estate?: FitSignal;
  pharmaceuticals_biotech?: FitSignal;
  default?: FitSignal;
}

export interface WorkforceFitRule {
  /** field on company profile or reward prework */
  field: "workforceFrontlinePct" | "workforceKnowledgePct" | "materialSalesWorkforce" | "criticalAiDigitalTalentPopulation";
  /** operator */
  op: "<" | ">=" | "==" | "!=" | "in" | "not_in";
  /** threshold value (number for pct fields, string for enum fields, string[] for in/not_in) */
  value: number | string | string[] | readonly string[];
  result: FitSignal;
}

export interface CapabilityFitRule {
  field:
    | "payEquityCapability"
    | "payStructureMaturity"
    | "aiMaturityInRewardToday"
    | "rewardFunctionMaturityRating"
    | "rewardAiAmbition"
    | "compManagementPlatform"
    | "aiToolsCurrentlyInRewardUse"
    | "externalCompDataSources"
    | "pensionSchemeArchitecture"
    | "unionWorksCouncilCoverage";
  op: "==" | "!=" | "in" | "not_in" | ">=" | "<";
  value: string | number | string[] | readonly string[];
  result: FitSignal;
  reasoning?: string;
}

export interface PriorityFitRule {
  field:
    | "topRewardPrioritiesNext12Months"
    | "primaryTriggerForRewardAiStrategy"
    | "ukGenderPayGapStatus"
    | "ownershipStructure"
    | "fcaSysc19InScope"
    | "strategicTimeline";
  op: "contains" | "==" | "!=" | "in" | "not_in";
  value: string | string[];
  result: FitSignal;
}

export interface ValueCalibration {
  base3yrLow: number;   // GBP
  base3yrHigh: number;  // GBP
  /** payroll multiplier: log10(payroll / baseline) * factor, added to 1 */
  payrollBaseline: number;
  payrollFactor: number;
  /** headcount multiplier: log10(headcount / baseline) * factor, added to 1 */
  headcountBaseline: number;
  headcountFactor: number;
  /** sector multiplier map */
  sectorMultipliers: Partial<Record<string, number>>;
  defaultSectorMultiplier: number;
}

/**
 * CostCalibration — implementation cost ranges for a 1,000-10,000 employee UK enterprise.
 *
 * Interpolation model (NOT a multiplier-on-top-of-range):
 *   position = clamp(log10(headcount / 1000) / 1, 0, 1)   // 0 at 1000hc, 1 at 10000hc
 *   estimated_cost = year1Low + position × (year1High − year1Low)
 *   then × sectorMultiplier (clamped 0.6-2×, applied after interpolation)
 *
 * Stage 7 TCO: 3yr_TCO = year1 + 2 × ongoingAnnual
 */
export interface CostCalibration {
  year1Low: number;              // GBP — Year 1 implementation cost, low end (small org)
  year1High: number;             // GBP — Year 1 implementation cost, high end (large org)
  ongoingAnnualLow: number;      // GBP — ongoing annual cost, low end
  ongoingAnnualHigh: number;     // GBP — ongoing annual cost, high end
  costType: 'annual' | 'project' | 'per_cycle' | 'per_deal';
  /** headcount at which position = 0 (low end of researched range) — 1,000 for all library initiatives */
  headcountMin: number;
  /** headcount at which position = 1 (high end of researched range) — 10,000 for all library initiatives */
  headcountMax: number;
  /** sector cost multipliers — applied after interpolation, clamped 0.6-2× */
  sectorMultipliers: Partial<Record<string, number>>;
  /** sub-domain multiplier (e.g. executive_compensation: 1.25) — applied instead of sector if more specific */
  subDomainMultiplier?: number;
  defaultSectorMultiplier: number;
  /** true when implementation cost excludes programme funding (payroll uplift, reward spend, etc.) */
  excludesProgrammeFunding?: boolean;
  /** human-readable note surfaced in Stage 7 business case */
  programmeFundingNote?: string;
  /** special-case note shown in UI (e.g. per-cycle, per-deal, incremental) */
  costNote?: string;
}

/**
 * Per-initiative capability demand profile for Stage 8 assessment.
 * Rates how demanding the initiative is on each capability dimension.
 * Team & skills is derived from overall portfolio complexity, not per-initiative.
 */
export interface CapabilityProfile {
  /** How data-intensive this initiative is — fuel requirement */
  dataIntensity: 'low' | 'medium' | 'high';
  /** How much change management / adoption effort this requires */
  changeImpact: 'low' | 'medium' | 'high';
  /** How deeply it needs to integrate with HRIS / systems estate */
  integrationNeed: 'low' | 'medium' | 'high';
  /** How sensitive it is to governance, auditability, and regulatory requirements */
  governanceSensitivity: 'low' | 'medium' | 'high';
}

/**
 * A default success measure for an initiative — pre-populated as an editable suggestion in Stage 6.
 * Maya owns the final set; these are never auto-confirmed.
 */
export interface SuggestedMeasure {
  /** Short name of the measure, e.g. "% pay decisions with documented rationale" */
  name: string;
  /** Which Stage 7 value category this measure evidences */
  valueLink: "efficiency" | "decision_quality" | "risk_mitigation" | "retention" | "strategic";
  /** Suggested target description, e.g. "95%" or "-30%" */
  suggestedTarget: string;
  /** Suggested timeframe, e.g. "12 months" */
  suggestedTimeframe: string;
  /** How it would typically be measured */
  howMeasured: string;
}

export interface ReasoningTemplates {
  strong_fit: string[];
  moderate_fit: string[];
  weak_fit: string[];
  not_recommended: string[];
}

export interface RewardInitiative {
  id: string;
  number: number;
  title: string;
  shortDescription: string;   // 2-3 sentence card description
  fullDescription: string;    // library detail
  subDomain: RewardSubDomain;
  defaultPhase: RewardPhase;
  complexity: RewardComplexity;
  sectorFit: SectorFitMap;
  workforceFitRules: WorkforceFitRule[];
  capabilityFitRules: CapabilityFitRule[];
  priorityFitRules: PriorityFitRule[];
  notRecommendedIf?: Array<{ condition: string; reasoning: string }>;
  valueCalibration: ValueCalibration;
  costCalibration: CostCalibration;
  bundleWith?: string;        // initiative id
  prerequisiteOf?: string[];  // this initiative is a prerequisite for these
  requiresPrerequisite?: string; // this initiative requires this other initiative
  reasoningTemplates: ReasoningTemplates;
  /**
   * Canonical principle IDs from Stage 4 that this initiative supports.
   * Used by the Stage 5 engine to boost fit score when the tenant has confirmed
   * those principles, and to render alignment notes on initiative cards.
   */
  supportsPrincipleIds?: string[];
  /**
   * Primary value type for Stage 7 business case categorisation.
   * efficiency | decision_quality | risk_mitigation | retention | strategic
   */
  primaryValueType: "efficiency" | "decision_quality" | "risk_mitigation" | "retention" | "strategic";
  /**
   * Months from project kick-off to first measurable value realisation.
   * Used for payback period calculation in Stage 7.
   * Defaults: Foundation=6, Build=12, Optimise=18
   */
  timeToFirstValueMonths: number;
  /**
   * 2–3 default success measures for Stage 6.
   * Pre-populated as editable suggestions; Maya owns the final set.
   * Never auto-confirmed.
   */
  suggestedMeasures: SuggestedMeasure[];
  /**
   * Capability demand profile for Stage 8 assessment.
   * Rates how demanding this initiative is on data, change, integration, and governance.
   * Team & skills requirement is derived from portfolio complexity, not per-initiative.
   */
  capabilityProfile: CapabilityProfile;
}

// ─── Library ──────────────────────────────────────────────────────────────────

export const REWARD_INITIATIVE_LIBRARY: RewardInitiative[] = [

  // ── #1 AI Compensation Recommendation Engine ─────────────────────────────
  {
    id: "ai_compensation_recommendation_engine",
    number: 1,
    title: "AI Compensation Recommendation Engine",
    shortDescription:
      "ML-driven pay recommendations at the point of hire, promotion, and merit review — surfacing market-aligned offers within your pay bands and flagging outliers before they become equity issues.",
    fullDescription:
      "Replaces manager intuition and HR manual lookups with a structured recommendation layer. The engine ingests live market data, internal equity position, and role-level pay band guidance to produce a recommended pay range and a rationale for every compensation decision. Reduces time-to-offer, improves pay equity at source, and creates an auditable trail for every pay decision.",
    subDomain: "Compensation",
    defaultPhase: "Build",
    complexity: "High",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "MODERATE_FIT",
      manufacturing: "MODERATE_FIT",
      hospitality_leisure: "WEAK_FIT",
      public_sector: "WEAK_FIT",
      higher_education: "WEAK_FIT",
      not_for_profit: "WEAK_FIT",
      healthcare: "MODERATE_FIT",
      energy_utilities: "MODERATE_FIT",
      pharmaceuticals_biotech: "STRONG_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "payStructureMaturity",
        op: "in",
        value: ["no_formal_bands", "informal_ranges_in_use"],
        result: "WEAK_FIT",
        reasoning: "A recommendation engine needs formal pay bands to anchor recommendations. Consider AI Pay Band Design (#6) first.",
      },
      {
        field: "payStructureMaturity",
        op: "in",
        value: ["formal_bands_not_refreshed_regularly", "formal_bands_actively_maintained"],
        result: "STRONG_FIT",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "modernise_comp_decisions", result: "STRONG_FIT" },
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "fix_pay_equity_gaps", result: "STRONG_FIT" },
      { field: "primaryTriggerForRewardAiStrategy", op: "==", value: "talent_attraction_retention_pressure", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 810000,
      base3yrHigh: 3060000,
      payrollBaseline: 50000000,
      payrollFactor: 0.3,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: { financial_services: 1.3, technology: 1.2, retail: 0.9, public_sector: 0.7 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 250000,
      year1High: 800000,
      ongoingAnnualLow: 120000,
      ongoingAnnualHigh: 350000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.0, professional_services: 1.1, retail: 0.95, public_sector: 0.85, higher_education: 0.85 },
      defaultSectorMultiplier: 1.0,
    },
    bundleWith: "ai_driven_merit_cycle_orchestration",
    prerequisiteOf: ["ai_bonus_pool_optimisation"],
    supportsPrincipleIds: ["explainable_pay", "evidence_based", "manager_authority"],
    primaryValueType: "decision_quality",
    timeToFirstValueMonths: 12,
    suggestedMeasures: [
      {
        name: "% pay decisions with documented AI rationale",
        valueLink: "decision_quality",
        suggestedTarget: "90%",
        suggestedTimeframe: "12 months",
        howMeasured: "Audit of pay decisions logged in the recommendation engine; % with rationale field completed",
      },
      {
        name: "Merit cycle pay equity gap (unexplained)",
        valueLink: "risk_mitigation",
        suggestedTarget: "<2% unexplained gap",
        suggestedTimeframe: "First merit cycle post-go-live",
        howMeasured: "Regression analysis of merit outcomes controlling for performance, level, and tenure",
      },
      {
        name: "Time-to-offer for external hires",
        valueLink: "efficiency",
        suggestedTarget: "-25% vs baseline",
        suggestedTimeframe: "12 months",
        howMeasured: "ATS data: days from offer approval to candidate acceptance; baseline to be established at go-live",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your sector ({sector}) and pay structure maturity make this a high-value initiative.",
        "Your 'modernise comp decisions' priority directly aligns with what this initiative delivers.",
        "Your HRIS ({hris}) supports vendor integration for most recommendation engine providers.",
      ],
      moderate_fit: [
        "Recommended, though your sector typically sees lower value than FS or Tech.",
        "Pay structure maturity suggests some groundwork needed before full deployment.",
      ],
      weak_fit: [
        "Pay band architecture needs strengthening before a recommendation engine can operate effectively. Consider AI Pay Band Design first.",
      ],
      not_recommended: [
        "Workforce composition or current capability suggests other initiatives should come first.",
      ],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'high',
      integrationNeed: 'high',
      governanceSensitivity: 'high',
    },
  },

  // ── #2 AI-Driven Merit Cycle Orchestration ───────────────────────────────
  {
    id: "ai_driven_merit_cycle_orchestration",
    number: 2,
    title: "AI-Driven Merit Cycle Orchestration",
    shortDescription:
      "End-to-end automation of the annual merit cycle — from budget modelling and manager guidance through to approval workflows and payroll handoff — reducing cycle time and improving consistency.",
    fullDescription:
      "Transforms the merit cycle from a manual, error-prone spreadsheet exercise into an orchestrated, AI-assisted process. Managers receive guided recommendations within budget, HR sees real-time budget consumption and equity flags, and the cycle closes faster with fewer errors. Integrates with HRIS and payroll systems.",
    subDomain: "Compensation",
    defaultPhase: "Build",
    complexity: "High",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "MODERATE_FIT",
      manufacturing: "MODERATE_FIT",
      public_sector: "WEAK_FIT",
      higher_education: "WEAK_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "payStructureMaturity",
        op: "in",
        value: ["no_formal_bands", "informal_ranges_in_use"],
        result: "WEAK_FIT",
        reasoning: "Merit orchestration requires formal pay bands to anchor manager guidance.",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "modernise_comp_decisions", result: "STRONG_FIT" },
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "reduce_reward_admin_burden", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 540000,
      base3yrHigh: 2040000,
      payrollBaseline: 50000000,
      payrollFactor: 0.35,
      headcountBaseline: 1000,
      headcountFactor: 0.25,
      sectorMultipliers: { financial_services: 1.3, technology: 1.2, public_sector: 0.7 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 200000,
      year1High: 500000,
      ongoingAnnualLow: 70000,
      ongoingAnnualHigh: 170000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.0, public_sector: 0.85 },
      defaultSectorMultiplier: 1.0,
      costNote: 'Incremental cost above Initiative #1 (AI Compensation Recommendation Engine).',
    },
    bundleWith: "ai_compensation_recommendation_engine",
    prerequisiteOf: [],
    supportsPrincipleIds: ["evidence_based", "manager_authority"],
    primaryValueType: "efficiency",
    timeToFirstValueMonths: 12,
    suggestedMeasures: [
      {
        name: "Merit cycle end-to-end duration",
        valueLink: "efficiency",
        suggestedTarget: "-30% vs prior year",
        suggestedTimeframe: "First cycle post-go-live",
        howMeasured: "Days from cycle open to payroll handoff; baseline from last completed cycle",
      },
      {
        name: "% manager submissions within budget",
        valueLink: "decision_quality",
        suggestedTarget: "98%",
        suggestedTimeframe: "First cycle post-go-live",
        howMeasured: "Cycle management system: count of manager submissions requiring budget override",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Paired with the Compensation Recommendation Engine, this completes the merit cycle modernisation.",
        "Your 'reduce reward admin burden' priority maps directly to what this initiative delivers.",
      ],
      moderate_fit: [
        "Merit cycle automation delivers value across most sectors, though FS and Tech see the highest ROI.",
      ],
      weak_fit: [
        "Pay structure maturity needs strengthening before merit orchestration can work effectively.",
      ],
      not_recommended: ["Current capability profile suggests foundational work is needed first."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'high',
      integrationNeed: 'high',
      governanceSensitivity: 'medium',
    },
  },

  // ── #3 AI Pay Equity Continuous Monitoring ───────────────────────────────
  {
    id: "ai_pay_equity_continuous_monitoring",
    number: 3,
    title: "AI Pay Equity Continuous Monitoring",
    shortDescription:
      "Always-on ML analysis of pay decisions across protected characteristics, surfacing emerging gaps as they develop rather than discovering them at annual audit.",
    fullDescription:
      "Moves pay equity from a point-in-time annual audit to a continuous monitoring capability. The system flags pay decisions that create or widen gaps across gender, ethnicity, disability, and other characteristics in real time, enabling HR to intervene before gaps compound. Substantially reduces annual GPG reporting effort and regulatory exposure.",
    subDomain: "Pay Equity",
    defaultPhase: "Foundation",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "STRONG_FIT",
      manufacturing: "MODERATE_FIT",
      public_sector: "STRONG_FIT",
      higher_education: "STRONG_FIT",
      not_for_profit: "MODERATE_FIT",
      healthcare: "STRONG_FIT",
      pharmaceuticals_biotech: "STRONG_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "payEquityCapability",
        op: "==",
        value: "continuous_monitoring",
        result: "NOT_RECOMMENDED",
        reasoning: "You already have continuous monitoring capability. Consider AI Multi-Characteristic Pay Gap Reporting (#4) to extend coverage.",
      },
      {
        field: "payEquityCapability",
        op: "in",
        value: ["no_formal_process", "ad_hoc_when_issues_arise"],
        result: "STRONG_FIT",
      },
      {
        field: "payEquityCapability",
        op: "==",
        value: "annual_structured_audit",
        result: "STRONG_FIT",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "fix_pay_equity_gaps", result: "STRONG_FIT" },
      { field: "primaryTriggerForRewardAiStrategy", op: "==", value: "regulatory_deadline_pressure", result: "STRONG_FIT" },
      { field: "ukGenderPayGapStatus", op: "==", value: "mandatory_and_finding_it_hard", result: "STRONG_FIT" },
      { field: "ukGenderPayGapStatus", op: "==", value: "mandatory_managing_ok", result: "MODERATE_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 360000,
      base3yrHigh: 1530000,
      payrollBaseline: 50000000,
      payrollFactor: 0.4,
      headcountBaseline: 1000,
      headcountFactor: 0.15,
      sectorMultipliers: { financial_services: 1.3, technology: 1.1, public_sector: 1.2, retail: 1.1 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 100000,
      year1High: 400000,
      ongoingAnnualLow: 55000,
      ongoingAnnualHigh: 190000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, public_sector: 1.1, technology: 1.0, retail: 0.95 },
      defaultSectorMultiplier: 1.0,
    },
    bundleWith: "ai_multi_characteristic_pay_gap_reporting",
    prerequisiteOf: [],
    supportsPrincipleIds: ["continuous_fairness", "equal_pay_commitment"],
    primaryValueType: "risk_mitigation",
    timeToFirstValueMonths: 6,
    suggestedMeasures: [
      {
        name: "Mean gender pay gap (%)",
        valueLink: "risk_mitigation",
        suggestedTarget: "Reduction to be defined after baseline established",
        suggestedTimeframe: "12 months",
        howMeasured: "HRIS/payroll: mean gender pay gap calculated monthly; baseline from last annual GPG report",
      },
      {
        name: "Number of pay equity anomalies detected and remediated",
        valueLink: "risk_mitigation",
        suggestedTarget: "100% of flagged anomalies reviewed within 30 days",
        suggestedTimeframe: "Ongoing",
        howMeasured: "Platform dashboard: count of anomalies flagged vs reviewed vs remediated; baseline to be established",
      },
      {
        name: "Time to produce annual gender pay gap report",
        valueLink: "efficiency",
        suggestedTarget: "-70% vs manual baseline",
        suggestedTimeframe: "First reporting cycle post-go-live",
        howMeasured: "Hours logged by Reward/HR team for GPG report preparation; baseline from last cycle",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your sector ({sector}) faces significant regulatory scrutiny on pay equity.",
        "Moving from annual audit to continuous monitoring is the natural next step given your current capability.",
        "Your GPG status ({ukGenderPayGapStatus}) means continuous monitoring will substantially ease annual reporting.",
        "This directly addresses your 'fix pay equity gaps' priority.",
      ],
      moderate_fit: [
        "Continuous monitoring delivers value across most organisations, particularly as regulatory expectations increase.",
      ],
      weak_fit: [
        "Your current pay equity capability suggests this may be more advanced than needed right now.",
      ],
      not_recommended: [
        "You already have continuous monitoring capability. Consider extending to multi-characteristic reporting instead.",
      ],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'medium',
      integrationNeed: 'medium',
      governanceSensitivity: 'high',
    },
  },

  // ── #4 AI Multi-Characteristic Pay Gap Reporting ─────────────────────────
  {
    id: "ai_multi_characteristic_pay_gap_reporting",
    number: 4,
    title: "AI Multi-Characteristic Pay Gap Reporting",
    shortDescription:
      "Automated reporting across gender, ethnicity, disability, and age pay gaps — going beyond mandatory GPG to voluntary disclosure and intersectional analysis.",
    fullDescription:
      "Extends pay gap reporting beyond the mandatory gender pay gap to cover ethnicity, disability, age, and intersectional combinations. AI-driven analysis identifies root causes, models remediation scenarios, and generates board-ready narrative. Positions the organisation ahead of anticipated mandatory ethnicity pay gap reporting.",
    subDomain: "Pay Equity",
    defaultPhase: "Foundation",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "STRONG_FIT",
      public_sector: "STRONG_FIT",
      higher_education: "STRONG_FIT",
      healthcare: "STRONG_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "payEquityCapability",
        op: "in",
        value: ["no_formal_process", "ad_hoc_when_issues_arise"],
        result: "MODERATE_FIT",
        reasoning: "Build continuous monitoring (#3) first, then extend to multi-characteristic reporting.",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "fix_pay_equity_gaps", result: "STRONG_FIT" },
      { field: "primaryTriggerForRewardAiStrategy", op: "==", value: "regulatory_deadline_pressure", result: "STRONG_FIT" },
      { field: "ukGenderPayGapStatus", op: "in", value: ["mandatory_and_finding_it_hard", "mandatory_managing_ok"], result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 270000,
      base3yrHigh: 1020000,
      payrollBaseline: 50000000,
      payrollFactor: 0.3,
      headcountBaseline: 1000,
      headcountFactor: 0.15,
      sectorMultipliers: { financial_services: 1.3, public_sector: 1.2, technology: 1.1 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 70000,
      year1High: 200000,
      ongoingAnnualLow: 25000,
      ongoingAnnualHigh: 90000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, public_sector: 1.1, technology: 1.0 },
      defaultSectorMultiplier: 1.0,
      costNote: 'Incremental cost above Initiative #3 (AI Pay Equity Continuous Monitoring).',
    },
    bundleWith: "ai_pay_equity_continuous_monitoring",
    prerequisiteOf: [],
    supportsPrincipleIds: ["continuous_fairness", "transparency_default"],
    primaryValueType: "risk_mitigation",
    timeToFirstValueMonths: 6,
    suggestedMeasures: [
      {
        name: "Number of protected characteristics with documented pay gap analysis",
        valueLink: "risk_mitigation",
        suggestedTarget: "All reportable characteristics covered",
        suggestedTimeframe: "6 months",
        howMeasured: "Annual reporting cycle: count of characteristics with published or board-reviewed analysis",
      },
      {
        name: "Time to produce multi-characteristic pay gap report",
        valueLink: "efficiency",
        suggestedTarget: "-60% vs manual baseline",
        suggestedTimeframe: "First reporting cycle post-go-live",
        howMeasured: "Hours logged by Reward team for report production; baseline to be established",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Often deployed alongside Pay Equity Continuous Monitoring (#3) for complete coverage.",
        "Anticipated mandatory ethnicity pay gap reporting makes this a forward-looking investment.",
      ],
      moderate_fit: ["Multi-characteristic reporting delivers value as disclosure expectations increase."],
      weak_fit: ["Consider building continuous monitoring capability first."],
      not_recommended: ["Current pay equity capability suggests foundational monitoring should come first."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'low',
      integrationNeed: 'medium',
      governanceSensitivity: 'medium', // Reporting tool, not live decision system — moderate governance
    },
  },

  // ── #5 AI Equal Pay Risk Audit ───────────────────────────────────────────
  {
    id: "ai_equal_pay_risk_audit",
    number: 5,
    title: "AI Equal Pay Risk Audit",
    shortDescription:
      "Automated equal pay risk assessment across job families — identifying where like-for-like pay comparisons could generate legal exposure before claims are filed.",
    fullDescription:
      "Uses ML to cluster roles by comparable worth, then analyses pay distributions within clusters for unexplained gaps. Produces a risk-ranked list of job families requiring attention, with modelled remediation costs. Enables proactive resolution before tribunal claims or regulatory scrutiny.",
    subDomain: "Pay Equity",
    defaultPhase: "Foundation",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      retail: "STRONG_FIT",
      public_sector: "STRONG_FIT",
      higher_education: "STRONG_FIT",
      healthcare: "STRONG_FIT",
      manufacturing: "MODERATE_FIT",
      technology: "MODERATE_FIT",
      professional_services: "MODERATE_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "payEquityCapability",
        op: "in",
        value: ["no_formal_process", "ad_hoc_when_issues_arise"],
        result: "STRONG_FIT",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "fix_pay_equity_gaps", result: "STRONG_FIT" },
      { field: "primaryTriggerForRewardAiStrategy", op: "==", value: "regulatory_deadline_pressure", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 180000,
      base3yrHigh: 680000,
      payrollBaseline: 50000000,
      payrollFactor: 0.25,
      headcountBaseline: 1000,
      headcountFactor: 0.15,
      sectorMultipliers: { financial_services: 1.2, public_sector: 1.2, retail: 1.1 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 200000,
      year1High: 700000,
      ongoingAnnualLow: 67000,
      ongoingAnnualHigh: 233000,
      costType: 'per_cycle',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, public_sector: 1.1, retail: 1.0 },
      defaultSectorMultiplier: 1.0,
      costNote: 'Cost is per audit cycle (typically every 2-3 years). Ongoing figure shown is amortised annually.',
    },
    supportsPrincipleIds: ["equal_pay_commitment"],
    primaryValueType: "risk_mitigation",
    timeToFirstValueMonths: 6,
    suggestedMeasures: [
      {
        name: "Number of high-risk job families identified and remediated",
        valueLink: "risk_mitigation",
        suggestedTarget: "100% of high-risk families with documented remediation plan",
        suggestedTimeframe: "12 months post-audit",
        howMeasured: "Audit output: risk-ranked job family list; remediation tracker updated quarterly",
      },
      {
        name: "Estimated equal pay tribunal exposure (modelled)",
        valueLink: "risk_mitigation",
        suggestedTarget: "Reduction to be defined after baseline audit",
        suggestedTimeframe: "Post-audit",
        howMeasured: "Modelled liability from audit output; baseline established at first audit",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your current pay equity capability ({payEquityCapability}) means equal pay risk may be unquantified.",
        "Proactive risk audit substantially reduces tribunal exposure.",
      ],
      moderate_fit: ["Equal pay risk audit is valuable as a periodic check even with existing equity processes."],
      weak_fit: ["Your existing equity monitoring may already cover this ground."],
      not_recommended: ["Existing continuous monitoring capability covers this."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'low',
      integrationNeed: 'medium',
      governanceSensitivity: 'medium', // Periodic audit tool, not live decision system — moderate governance
    },
  },

  // ── #6 AI Pay Band Design ────────────────────────────────────────────────
  {
    id: "ai_pay_band_design",
    number: 6,
    title: "AI Pay Band Design",
    shortDescription:
      "Data-driven pay band architecture using ML job evaluation and live market data — replacing manual job sizing with a defensible, market-anchored structure.",
    fullDescription:
      "Combines AI-powered job evaluation with live market benchmarking to design or refresh pay band architecture. The system clusters roles by complexity and scope, anchors bands to market percentiles, and models the cost of moving to the new structure. Produces a defensible, auditable pay framework that supports all downstream compensation decisions.",
    subDomain: "Compensation",
    defaultPhase: "Build",
    complexity: "High",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "STRONG_FIT",
      manufacturing: "STRONG_FIT",
      public_sector: "MODERATE_FIT",
      higher_education: "MODERATE_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "payStructureMaturity",
        op: "in",
        value: ["no_formal_bands", "informal_ranges_in_use"],
        result: "STRONG_FIT",
      },
      {
        field: "payStructureMaturity",
        op: "==",
        value: "formal_bands_not_refreshed_regularly",
        result: "MODERATE_FIT",
      },
      {
        field: "payStructureMaturity",
        op: "==",
        value: "formal_bands_actively_maintained",
        result: "NOT_RECOMMENDED",
        reasoning: "Your pay bands are actively maintained. Consider AI Market Data Intelligence (#7) to keep them current.",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "modernise_comp_decisions", result: "STRONG_FIT" },
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "fix_pay_equity_gaps", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 360000,
      base3yrHigh: 1360000,
      payrollBaseline: 50000000,
      payrollFactor: 0.3,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: { financial_services: 1.2, technology: 1.2, public_sector: 0.8 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 250000,
      year1High: 800000,
      ongoingAnnualLow: 15000,
      ongoingAnnualHigh: 40000,
      costType: 'project',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, professional_services: 1.1, public_sector: 0.9 },
      defaultSectorMultiplier: 1.0,
      excludesProgrammeFunding: true,
      programmeFundingNote: 'Excludes payroll uplift from moving employees onto new band minimums (typically 1-3% of payroll). Surface as a separate programme funding line in the business case.',
      costNote: 'Primarily a one-off design project; ongoing cost is minimal annual band refresh.',
    },
    prerequisiteOf: ["ai_skills_based_pay_modelling"],
    supportsPrincipleIds: ["clear_structure"],
    primaryValueType: "strategic",
    timeToFirstValueMonths: 12,
    suggestedMeasures: [
      {
        name: "% roles mapped to a defined pay band",
        valueLink: "strategic",
        suggestedTarget: "100%",
        suggestedTimeframe: "12 months",
        howMeasured: "HRIS audit: count of active roles with a valid pay band assignment",
      },
      {
        name: "% employees within band range",
        valueLink: "risk_mitigation",
        suggestedTarget: ">85%",
        suggestedTimeframe: "18 months",
        howMeasured: "HRIS: salary vs band range; baseline to be established at band launch",
      },
      {
        name: "Cost of moving employees to new band minimums (programme funding)",
        valueLink: "strategic",
        suggestedTarget: "Within approved programme budget",
        suggestedTimeframe: "12 months",
        howMeasured: "Payroll: total uplift cost vs approved programme funding envelope",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your pay structure maturity ({payStructureMaturity}) means formal pay bands are either absent or overdue for refresh.",
        "Pay band design is the foundation for most downstream compensation initiatives.",
      ],
      moderate_fit: ["Pay band refresh delivers value even with existing structures."],
      weak_fit: ["Your existing pay structure may not need a full redesign."],
      not_recommended: ["Your actively maintained pay bands mean this initiative's value is limited. Consider market data intelligence instead."],
    },
    capabilityProfile: {
      dataIntensity: 'medium',
      changeImpact: 'high',
      integrationNeed: 'medium',
      governanceSensitivity: 'medium',
    },
  },

  // ── #7 AI Market Data Intelligence ──────────────────────────────────────
  {
    id: "ai_market_data_intelligence",
    number: 7,
    title: "AI Market Data Intelligence",
    shortDescription:
      "Automated ingestion and synthesis of multiple pay survey sources into a single, always-current market view — replacing the annual survey cycle with continuous benchmarking.",
    fullDescription:
      "Aggregates data from multiple compensation surveys (Willis Towers Watson, Mercer, Radford, etc.) with real-time signals from job postings and offer data. AI normalises across methodologies, flags where your pay position has drifted from target, and surfaces emerging market movements before they affect hiring. Reduces survey administration by 60-80%.",
    subDomain: "Compensation",
    defaultPhase: "Build",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "MODERATE_FIT",
      manufacturing: "MODERATE_FIT",
      public_sector: "WEAK_FIT",
      higher_education: "WEAK_FIT",
      pharmaceuticals_biotech: "STRONG_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "externalCompDataSources",
        op: "not_in",
        value: ["none_no_external_data"],
        result: "STRONG_FIT",
        reasoning: "You already use external comp data — this initiative automates and enriches that process.",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "modernise_comp_decisions", result: "STRONG_FIT" },
      { field: "primaryTriggerForRewardAiStrategy", op: "==", value: "talent_attraction_retention_pressure", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 270000,
      base3yrHigh: 1020000,
      payrollBaseline: 50000000,
      payrollFactor: 0.25,
      headcountBaseline: 1000,
      headcountFactor: 0.15,
      sectorMultipliers: { financial_services: 1.3, technology: 1.2, pharmaceuticals_biotech: 1.2 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 40000,
      year1High: 160000,
      ongoingAnnualLow: 25000,
      ongoingAnnualHigh: 100000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1, public_sector: 0.85 },
      defaultSectorMultiplier: 1.0,
    },
    supportsPrincipleIds: ["evidence_based", "competitive_pay"],
    primaryValueType: "decision_quality",
    timeToFirstValueMonths: 12,
    suggestedMeasures: [
      {
        name: "Time to produce market benchmarking update",
        valueLink: "efficiency",
        suggestedTarget: "-70% vs annual survey cycle",
        suggestedTimeframe: "12 months",
        howMeasured: "Hours logged by Reward team for benchmarking refresh; baseline from last survey cycle",
      },
      {
        name: "% roles with current market data (within 6 months)",
        valueLink: "decision_quality",
        suggestedTarget: "95%",
        suggestedTimeframe: "12 months",
        howMeasured: "Platform dashboard: count of roles with market data refreshed in last 6 months",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "You already use {externalCompDataSources} — this initiative automates and enriches that process.",
        "Continuous market intelligence reduces the lag between market moves and your pay position.",
      ],
      moderate_fit: ["Market data intelligence delivers value across most organisations with competitive pay pressures."],
      weak_fit: ["Limited external data use suggests other priorities first."],
      not_recommended: ["Public sector pay structures typically don't benefit from market data automation."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'low',
      integrationNeed: 'medium',
      governanceSensitivity: 'low',
    },
  },

  // ── #8 AI Pay Transparency Engine ───────────────────────────────────────
  {
    id: "ai_pay_transparency_engine",
    number: 8,
    title: "AI Pay Transparency Engine",
    shortDescription:
      "Automated generation of pay range disclosures for job postings and employee-facing pay band communications — compliant with EU Pay Transparency Directive and emerging UK requirements.",
    fullDescription:
      "Prepares the organisation for mandatory pay transparency by automating the generation of pay range disclosures for job postings, internal role communications, and employee queries. Integrates with pay band architecture and market data to ensure disclosures are accurate, current, and legally compliant. Includes a manager-facing tool for handling pay questions.",
    subDomain: "Pay Transparency",
    defaultPhase: "Foundation",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "MODERATE_FIT",
      manufacturing: "MODERATE_FIT",
      public_sector: "STRONG_FIT",
      higher_education: "MODERATE_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "prepare_for_pay_transparency", result: "STRONG_FIT" },
      { field: "primaryTriggerForRewardAiStrategy", op: "==", value: "regulatory_deadline_pressure", result: "STRONG_FIT" },
      { field: "fcaSysc19InScope", op: "in", value: ["yes_in_scope", "yes_not_smcr"], result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 180000,
      base3yrHigh: 765000,
      payrollBaseline: 50000000,
      payrollFactor: 0.2,
      headcountBaseline: 1000,
      headcountFactor: 0.15,
      sectorMultipliers: { financial_services: 1.3, technology: 1.1, public_sector: 1.1 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 500000,
      year1High: 1800000,
      ongoingAnnualLow: 20000,
      ongoingAnnualHigh: 60000,
      costType: 'project',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, professional_services: 1.1, public_sector: 0.9 },
      defaultSectorMultiplier: 1.0,
      costNote: 'One-off architecture project; ongoing cost is minimal maintenance and taxonomy updates.',
    },
    supportsPrincipleIds: ["clear_structure", "transparency_default"],
    primaryValueType: "retention",
    timeToFirstValueMonths: 6,
    suggestedMeasures: [
      {
        name: "% job postings with compliant pay range disclosure",
        valueLink: "risk_mitigation",
        suggestedTarget: "100%",
        suggestedTimeframe: "6 months",
        howMeasured: "ATS audit: count of live postings with pay range field populated and within band",
      },
      {
        name: "Manager confidence in handling pay questions (survey)",
        valueLink: "decision_quality",
        suggestedTarget: ">70% confident",
        suggestedTimeframe: "12 months",
        howMeasured: "Annual manager survey question; baseline to be established at launch",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Pay transparency regulation is advancing — this initiative positions you ahead of mandatory requirements.",
        "Your regulatory context ({fcaSysc19InScope}) makes pay transparency a near-term priority.",
      ],
      moderate_fit: ["Pay transparency preparation is increasingly important across all sectors."],
      weak_fit: ["Transparency requirements may be less immediate for your sector."],
      not_recommended: ["Current regulatory context suggests limited near-term requirement."],
    },
    capabilityProfile: {
      dataIntensity: 'medium',
      changeImpact: 'high',
      integrationNeed: 'medium',
      governanceSensitivity: 'high',
    },
  },

  // ── #9 AI Executive Comp Peer Benchmarking ───────────────────────────────
  {
    id: "ai_executive_comp_peer_benchmarking",
    number: 9,
    title: "AI Executive Comp Peer Benchmarking",
    shortDescription:
      "Automated peer group analysis and executive pay benchmarking — replacing manual proxy statement analysis with AI-driven comparator tracking and remuneration committee support.",
    fullDescription:
      "Automates the collection and analysis of executive pay data from proxy statements, annual reports, and regulatory filings. AI identifies the most relevant peer group, tracks movements in total pay quantum and structure, and generates remuneration committee briefing materials. Reduces the cost and time of annual benchmarking exercises.",
    subDomain: "Executive Compensation",
    defaultPhase: "Optimise",
    complexity: "High",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "STRONG_FIT",
      manufacturing: "MODERATE_FIT",
      public_sector: "WEAK_FIT",
      higher_education: "WEAK_FIT",
      not_for_profit: "WEAK_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "executive_comp_refresh", result: "STRONG_FIT" },
      { field: "ownershipStructure", op: "in", value: ["ftse_100_listed", "ftse_250_listed", "aim_listed", "other_listed", "subsidiary_listed_group"], result: "STRONG_FIT" },
      { field: "ownershipStructure", op: "in", value: ["private_pe_backed", "private_vc_backed"], result: "MODERATE_FIT" },
    ],
    notRecommendedIf: [
      {
        condition: "ownershipStructure in ['public_sector', 'mutual_cooperative', 'not_for_profit']",
        reasoning: "Executive pay benchmarking against listed peers is not applicable for your ownership structure.",
      },
    ],
    valueCalibration: {
      base3yrLow: 360000,
      base3yrHigh: 1360000,
      payrollBaseline: 50000000,
      payrollFactor: 0.2,
      headcountBaseline: 1000,
      headcountFactor: 0.1,
      sectorMultipliers: { financial_services: 1.4, technology: 1.3, retail: 1.1 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 20000,
      year1High: 80000,
      ongoingAnnualLow: 20000,
      ongoingAnnualHigh: 80000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.0 },
      subDomainMultiplier: 1.25,
      defaultSectorMultiplier: 1.0,
      costNote: 'Incremental tooling cost above your existing exec comp advisor relationship. Does not include advisor fees (pre-existing cost).',
    },
    supportsPrincipleIds: ["competitive_pay"],
    primaryValueType: "decision_quality",
    timeToFirstValueMonths: 18,
    suggestedMeasures: [
      {
        name: "Time to prepare RemCo benchmarking pack",
        valueLink: "efficiency",
        suggestedTarget: "-50% vs manual baseline",
        suggestedTimeframe: "First RemCo cycle post-go-live",
        howMeasured: "Hours logged by Reward team for RemCo pack preparation; baseline from last cycle",
      },
      {
        name: "Number of peer comparators covered in benchmarking",
        valueLink: "decision_quality",
        suggestedTarget: "Full FTSE peer group",
        suggestedTimeframe: "12 months",
        howMeasured: "Platform dashboard: count of peer companies with current data",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "As a listed company, remuneration committee support and peer benchmarking are high-value activities.",
        "Your 'executive comp refresh' priority maps directly to what this initiative delivers.",
      ],
      moderate_fit: ["Executive benchmarking delivers value for PE/VC-backed organisations preparing for exit or IPO."],
      weak_fit: ["Executive benchmarking value is limited for your ownership structure."],
      not_recommended: ["Executive pay benchmarking against listed peers is not applicable for your ownership structure."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'low',
      integrationNeed: 'low',
      governanceSensitivity: 'high',
    },
  },

  // ── #10 AI Talent Pay Strategy ───────────────────────────────────────────
  {
    id: "ai_talent_pay_strategy",
    number: 10,
    title: "AI Talent Pay Strategy",
    shortDescription:
      "Data-driven pay strategy for AI and digital talent — modelling competitive positioning, equity implications, and retention risk for your critical AI workforce.",
    fullDescription:
      "Addresses the specific challenge of paying for AI and digital talent in a market where pay norms are still forming. Uses market data, internal equity analysis, and attrition modelling to design a pay strategy that attracts and retains critical AI talent without creating internal equity problems. Includes a framework for AI role levelling and pay band design.",
    subDomain: "Compensation",
    defaultPhase: "Foundation",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      pharmaceuticals_biotech: "STRONG_FIT",
      manufacturing: "MODERATE_FIT",
      retail: "MODERATE_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [
      {
        field: "criticalAiDigitalTalentPopulation",
        op: "==",
        value: "none_or_minimal",
        result: "NOT_RECOMMENDED",
      },
      {
        field: "criticalAiDigitalTalentPopulation",
        op: "in",
        value: ["emerging_small_population", "established_growing"],
        result: "STRONG_FIT",
      },
      {
        field: "criticalAiDigitalTalentPopulation",
        op: "==",
        value: "actively_fighting_in_market_for_ai_talent",
        result: "STRONG_FIT",
      },
    ],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "ai_talent_pay_strategy", result: "STRONG_FIT" },
      { field: "primaryTriggerForRewardAiStrategy", op: "==", value: "talent_attraction_retention_pressure", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 270000,
      base3yrHigh: 1020000,
      payrollBaseline: 50000000,
      payrollFactor: 0.25,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: { financial_services: 1.3, technology: 1.4, professional_services: 1.2 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 40000,
      year1High: 100000,
      ongoingAnnualLow: 30000,
      ongoingAnnualHigh: 80000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1, public_sector: 0.85 },
      defaultSectorMultiplier: 1.0,
    },
    supportsPrincipleIds: ["competitive_pay"],
    primaryValueType: "strategic",
    timeToFirstValueMonths: 6,
    suggestedMeasures: [
      {
        name: "AI talent voluntary attrition rate",
        valueLink: "retention",
        suggestedTarget: "Reduction to be defined after baseline established",
        suggestedTimeframe: "12 months",
        howMeasured: "HRIS: voluntary leavers in AI/digital roles as % of AI/digital headcount; baseline to be established",
      },
      {
        name: "% AI roles with documented pay positioning vs market",
        valueLink: "decision_quality",
        suggestedTarget: "100%",
        suggestedTimeframe: "6 months",
        howMeasured: "Reward team audit: AI role pay band vs market P50/P75 benchmark",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your AI talent population ({criticalAiDigitalTalentPopulation}) makes this a high-priority initiative.",
        "AI talent pay strategy is one of the most pressing Reward challenges in your sector ({sector}).",
      ],
      moderate_fit: ["AI talent pay strategy is increasingly relevant as AI roles grow."],
      weak_fit: ["Limited AI talent population reduces the urgency of this initiative."],
      not_recommended: ["Minimal AI talent population means this initiative has limited applicability right now."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'medium',
      integrationNeed: 'medium',
      governanceSensitivity: 'medium',
    },
  },

  // ── #11 AI Skills-Based Pay Modelling ────────────────────────────────────
  {
    id: "ai_skills_based_pay_modelling",
    number: 11,
    title: "AI Skills-Based Pay Modelling",
    shortDescription:
      "ML-powered modelling of skills-based pay structures — mapping skills to pay premiums and designing transition paths from job-based to skills-based compensation.",
    fullDescription:
      "Supports the transition to skills-based pay by using AI to identify which skills command market premiums, model the cost of skills-based pay structures, and design transition paths that manage internal equity. Requires formal pay band architecture as a foundation.",
    subDomain: "Compensation",
    defaultPhase: "Optimise",
    complexity: "Highest",
    sectorFit: {
      technology: "STRONG_FIT",
      financial_services: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      pharmaceuticals_biotech: "MODERATE_FIT",
      default: "WEAK_FIT",
    },
    workforceFitRules: [
      {
        field: "workforceKnowledgePct",
        op: "<",
        value: 50,
        result: "NOT_RECOMMENDED",
      },
      {
        field: "workforceKnowledgePct",
        op: ">=",
        value: 80,
        result: "STRONG_FIT",
      },
    ],
    capabilityFitRules: [
      {
        field: "payStructureMaturity",
        op: "!=",
        value: "formal_bands_actively_maintained",
        result: "NOT_RECOMMENDED",
        reasoning: "Skills-based pay requires mature pay band architecture as foundation. Build AI Pay Band Design (#6) first.",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "modernise_comp_decisions", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 540000,
      base3yrHigh: 2040000,
      payrollBaseline: 50000000,
      payrollFactor: 0.3,
      headcountBaseline: 1000,
      headcountFactor: 0.25,
      sectorMultipliers: { technology: 1.3, financial_services: 1.2 },
      defaultSectorMultiplier: 0.8,
    },
    costCalibration: {
      year1Low: 500000,
      year1High: 1500000,
      ongoingAnnualLow: 100000,
      ongoingAnnualHigh: 300000,
      costType: 'project',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1, public_sector: 0.9 },
      defaultSectorMultiplier: 1.0,
      costNote: 'High-uncertainty initiative; many deployments stall. Ongoing cost varies widely with scale and taxonomy maintenance requirements.',
    },
    requiresPrerequisite: "ai_pay_band_design",
    supportsPrincipleIds: ["clear_structure", "evidence_based"],
    primaryValueType: "strategic",
    timeToFirstValueMonths: 18,
    suggestedMeasures: [
      {
        name: "% roles with skills-based pay premium applied",
        valueLink: "strategic",
        suggestedTarget: "Pilot cohort defined at project start",
        suggestedTimeframe: "18 months",
        howMeasured: "HRIS: roles with skills premium flag vs total roles in scope",
      },
      {
        name: "Skills premium cost vs retention improvement (ROI)",
        valueLink: "retention",
        suggestedTarget: "Positive ROI within 24 months",
        suggestedTimeframe: "24 months",
        howMeasured: "Finance: skills premium payroll cost vs modelled attrition saving; baseline to be established",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your knowledge-worker workforce ({workforceKnowledgePct}% knowledge workers) and mature pay structure make this viable.",
        "Skills-based pay is a significant competitive differentiator in your sector.",
      ],
      moderate_fit: ["Skills-based pay modelling is increasingly relevant as workforce skills become the primary value driver."],
      weak_fit: ["Your workforce composition or pay structure maturity suggests this is premature."],
      not_recommended: ["Formal pay band architecture is required before skills-based pay modelling can work. Build AI Pay Band Design (#6) first."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'high',
      integrationNeed: 'medium',
      governanceSensitivity: 'medium',
    },
  },

  // ── #12 AI Total Rewards Personalisation ─────────────────────────────────
  {
    id: "ai_total_rewards_personalisation",
    number: 12,
    title: "AI Total Rewards Personalisation",
    shortDescription:
      "AI-driven personalisation of total rewards packages — modelling employee preferences and designing flexible benefits structures that maximise perceived value per pound spent.",
    fullDescription:
      "Uses preference modelling and conjoint analysis to understand what employees value most in their total rewards package, then designs flexible benefits structures that deliver higher perceived value at the same or lower cost. Particularly effective for knowledge-worker populations with diverse preferences.",
    subDomain: "Benefits",
    defaultPhase: "Optimise",
    complexity: "Highest",
    sectorFit: {
      technology: "STRONG_FIT",
      financial_services: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [
      {
        field: "workforceKnowledgePct",
        op: "<",
        value: 50,
        result: "WEAK_FIT",
      },
    ],
    capabilityFitRules: [
      {
        field: "aiMaturityInRewardToday",
        op: "<",
        value: 2,
        result: "WEAK_FIT",
        reasoning: "Total rewards personalisation requires foundational AI capability. Build AI maturity first.",
      },
      {
        field: "rewardAiAmbition",
        op: "<",
        value: 3,
        result: "WEAK_FIT",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "improve_employee_value_proposition", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 360000,
      base3yrHigh: 1530000,
      payrollBaseline: 50000000,
      payrollFactor: 0.3,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: { technology: 1.3, financial_services: 1.2 },
      defaultSectorMultiplier: 0.9,
    },
    costCalibration: {
      year1Low: 600000,
      year1High: 1800000,
      ongoingAnnualLow: 150000,
      ongoingAnnualHigh: 400000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1, public_sector: 0.85 },
      defaultSectorMultiplier: 1.0,
    },
    supportsPrincipleIds: ["individual_needs"],
    primaryValueType: "retention",
    timeToFirstValueMonths: 18,
    suggestedMeasures: [
      {
        name: "Employee perceived value of total rewards (survey)",
        valueLink: "retention",
        suggestedTarget: "+10pp vs baseline",
        suggestedTimeframe: "18 months",
        howMeasured: "Annual engagement survey: % rating total rewards as good or excellent; baseline to be established",
      },
      {
        name: "Benefits cost per employee vs perceived value score",
        valueLink: "efficiency",
        suggestedTarget: "Improved ratio vs baseline",
        suggestedTimeframe: "24 months",
        howMeasured: "Finance: total benefits cost / headcount vs survey perceived value score; baseline to be established",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your knowledge-worker population and high AI ambition make personalisation viable and high-value.",
      ],
      moderate_fit: ["Total rewards personalisation delivers value across most knowledge-worker organisations."],
      weak_fit: ["AI maturity or ambition level suggests this initiative is premature. Build foundational capability first."],
      not_recommended: ["Current AI maturity and ambition profile suggests other initiatives should come first."],
    },
    capabilityProfile: {
      dataIntensity: 'medium',
      changeImpact: 'medium',
      integrationNeed: 'high',
      governanceSensitivity: 'low',
    },
  },

  // ── #13 AI Total Rewards Statement Generation ─────────────────────────────
  {
    id: "ai_total_rewards_statement_generation",
    number: 13,
    title: "AI Total Rewards Statement Generation",
    shortDescription:
      "Automated, personalised total rewards statements — replacing annual PDF generation with always-current, employee-accessible statements that increase perceived total comp value.",
    fullDescription:
      "Generates personalised total rewards statements for every employee, showing the full value of their compensation package including salary, bonus, benefits, pension, and non-monetary elements. AI-driven narrative explains the value in plain language. Statements are always current, not just annual, and accessible via employee self-service.",
    subDomain: "Pay Transparency",
    defaultPhase: "Build",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "MODERATE_FIT",
      manufacturing: "MODERATE_FIT",
      public_sector: "MODERATE_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "improve_employee_value_proposition", result: "STRONG_FIT" },
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "prepare_for_pay_transparency", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 180000,
      base3yrHigh: 850000,
      payrollBaseline: 50000000,
      payrollFactor: 0.2,
      headcountBaseline: 1000,
      headcountFactor: 0.25,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 100000,
      year1High: 300000,
      ongoingAnnualLow: 35000,
      ongoingAnnualHigh: 120000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.1, technology: 1.0, public_sector: 0.9 },
      defaultSectorMultiplier: 1.0,
    },
    bundleWith: "ai_pay_decision_explainer",
    supportsPrincipleIds: ["explainable_pay", "transparency_default"],
    primaryValueType: "efficiency",
    timeToFirstValueMonths: 12,
    suggestedMeasures: [
      {
        name: "% employees with a current total rewards statement",
        valueLink: "efficiency",
        suggestedTarget: "100%",
        suggestedTimeframe: "12 months",
        howMeasured: "Platform dashboard: count of employees with statement generated in last 12 months",
      },
      {
        name: "Employee awareness of total rewards value (survey)",
        valueLink: "retention",
        suggestedTarget: "+15pp vs baseline",
        suggestedTimeframe: "12 months",
        howMeasured: "Annual engagement survey: % correctly estimating total rewards value; baseline to be established",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Total rewards statements are a high-impact, relatively low-complexity initiative that improves EVP perception.",
        "Often paired with AI Pay Decision Explainer (#14) for complete pay communication.",
      ],
      moderate_fit: ["Total rewards statements deliver value across most organisations."],
      weak_fit: ["Consider whether employee self-service infrastructure is in place."],
      not_recommended: ["Current capability profile suggests other priorities first."],
    },
    capabilityProfile: {
      dataIntensity: 'medium',
      changeImpact: 'low',
      integrationNeed: 'high',
      governanceSensitivity: 'low',
    },
  },

  // ── #14 AI Pay Decision Explainer ────────────────────────────────────────
  {
    id: "ai_pay_decision_explainer",
    number: 14,
    title: "AI Pay Decision Explainer",
    shortDescription:
      "AI-generated plain-language explanations for individual pay decisions — giving managers and employees clear, consistent answers to 'why is my pay what it is?'",
    fullDescription:
      "Generates personalised, plain-language explanations for every pay decision — merit increases, promotions, market adjustments, and bonus outcomes. Explanations are grounded in the actual decision factors (market position, performance, pay band, budget) and calibrated for the audience (manager-facing vs employee-facing). Reduces HR query volume and improves pay satisfaction.",
    subDomain: "Pay Transparency",
    defaultPhase: "Build",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "prepare_for_pay_transparency", result: "STRONG_FIT" },
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "improve_employee_value_proposition", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 144000,
      base3yrHigh: 595000,
      payrollBaseline: 50000000,
      payrollFactor: 0.2,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 40000,
      year1High: 120000,
      ongoingAnnualLow: 20000,
      ongoingAnnualHigh: 60000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.1, public_sector: 1.0 },
      defaultSectorMultiplier: 1.0,
      costNote: 'Incremental cost above Initiative #13 (AI Total Rewards Statement Generation).',
    },
    bundleWith: "ai_total_rewards_statement_generation",
    supportsPrincipleIds: ["explainable_pay", "transparency_default"],
    primaryValueType: "retention",
    timeToFirstValueMonths: 12,
    suggestedMeasures: [
      {
        name: "% pay decisions with employee-facing explanation generated",
        valueLink: "decision_quality",
        suggestedTarget: "100%",
        suggestedTimeframe: "First merit cycle post-go-live",
        howMeasured: "Platform dashboard: count of pay decisions with explanation generated vs total decisions",
      },
      {
        name: "Employee satisfaction with pay communication (survey)",
        valueLink: "retention",
        suggestedTarget: "+10pp vs baseline",
        suggestedTimeframe: "12 months",
        howMeasured: "Annual engagement survey: % satisfied with how pay decisions are communicated; baseline to be established",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Pay decision explainers reduce HR query volume and improve pay satisfaction — high ROI relative to complexity.",
      ],
      moderate_fit: ["Pay decision explainers deliver value across most organisations."],
      weak_fit: ["Consider whether pay band architecture is in place to support explanations."],
      not_recommended: ["Current capability profile suggests other priorities first."],
    },
    capabilityProfile: {
      dataIntensity: 'medium',
      changeImpact: 'medium',
      integrationNeed: 'medium',
      governanceSensitivity: 'high',
    },
  },

  // ── #15 AI Reward Operations Assistant ───────────────────────────────────
  {
    id: "ai_reward_operations_assistant",
    number: 15,
    title: "AI Reward Operations Assistant",
    shortDescription:
      "AI-powered assistant for the Reward team — handling routine queries, generating comp analysis, drafting job evaluations, and automating repetitive Reward admin tasks.",
    fullDescription:
      "A Reward-specific AI assistant that handles the high-volume, repetitive tasks that consume Reward team capacity: answering manager pay queries, generating comp analysis outputs, drafting job evaluation rationales, and producing standard reports. Frees the Reward team to focus on strategic work. Integrates with HRIS and comp management platform.",
    subDomain: "Reward Operations",
    defaultPhase: "Foundation",
    complexity: "Low",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "STRONG_FIT",
      manufacturing: "STRONG_FIT",
      public_sector: "STRONG_FIT",
      higher_education: "STRONG_FIT",
      default: "STRONG_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "aiToolsCurrentlyInRewardUse",
        op: "not_in",
        value: ["none_no_ai_yet"],
        result: "MODERATE_FIT",
        reasoning: "You already use some AI tools — this builds on that foundation.",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "reduce_reward_admin_burden", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 144000,
      base3yrHigh: 595000,
      payrollBaseline: 50000000,
      payrollFactor: 0.15,
      headcountBaseline: 1000,
      headcountFactor: 0.15,
      sectorMultipliers: {},
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 50000,
      year1High: 180000,
      ongoingAnnualLow: 25000,
      ongoingAnnualHigh: 90000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.1, technology: 1.0, public_sector: 0.9 },
      defaultSectorMultiplier: 1.0,
    },
    supportsPrincipleIds: ["amplify_team"],
    primaryValueType: "efficiency",
    timeToFirstValueMonths: 6,
    suggestedMeasures: [
      {
        name: "Reward team query resolution time (routine queries)",
        valueLink: "efficiency",
        suggestedTarget: "-50% vs baseline",
        suggestedTimeframe: "6 months",
        howMeasured: "Helpdesk/ticketing system: average time to resolve Reward queries; baseline to be established",
      },
      {
        name: "% routine Reward queries handled without specialist escalation",
        valueLink: "efficiency",
        suggestedTarget: "70%",
        suggestedTimeframe: "6 months",
        howMeasured: "Helpdesk: count of queries closed without escalation to Reward specialist",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "A Reward Operations Assistant is a quick win — low complexity, fast to deploy, immediate capacity release.",
        "Your 'reduce reward admin burden' priority maps directly to what this initiative delivers.",
      ],
      moderate_fit: ["Reward operations automation delivers value across all organisations."],
      weak_fit: ["Consider whether HRIS integration is in place to support the assistant."],
      not_recommended: ["Current capability profile suggests other priorities first."],
    },
    capabilityProfile: {
      dataIntensity: 'medium',
      changeImpact: 'medium',
      integrationNeed: 'medium',
      governanceSensitivity: 'low',
    },
  },

  // ── #16 AI Bonus Pool Optimisation ───────────────────────────────────────
  {
    id: "ai_bonus_pool_optimisation",
    number: 16,
    title: "AI Bonus Pool Optimisation",
    shortDescription:
      "ML-driven bonus pool allocation modelling — optimising the distribution of bonus budgets across business units, teams, and individuals to maximise retention and performance impact.",
    fullDescription:
      "Uses ML to model the retention and performance impact of different bonus allocation scenarios, enabling the Reward team to optimise pool distribution before the cycle begins. Integrates with performance data, attrition risk models, and market data to surface where bonus investment has the highest marginal impact.",
    subDomain: "Compensation",
    defaultPhase: "Optimise",
    complexity: "High",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "rewardAiAmbition",
        op: "<",
        value: 3,
        result: "WEAK_FIT",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "modernise_comp_decisions", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 540000,
      base3yrHigh: 2550000,
      payrollBaseline: 50000000,
      payrollFactor: 0.4,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: { financial_services: 1.4, technology: 1.2 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 140000,
      year1High: 360000,
      ongoingAnnualLow: 60000,
      ongoingAnnualHigh: 140000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1, public_sector: 0.85 },
      defaultSectorMultiplier: 1.0,
      costNote: 'Incremental cost above Initiative #2 (AI-Driven Merit Cycle Orchestration).',
    },
    requiresPrerequisite: "ai_compensation_recommendation_engine",
    supportsPrincipleIds: ["evidence_based"],
    primaryValueType: "decision_quality",
    timeToFirstValueMonths: 18,
    suggestedMeasures: [
      {
        name: "Bonus pool utilisation rate",
        valueLink: "efficiency",
        suggestedTarget: ">95%",
        suggestedTimeframe: "First bonus cycle post-go-live",
        howMeasured: "Finance: actual bonus paid vs approved pool; baseline from last cycle",
      },
      {
        name: "Correlation between bonus allocation and performance rating",
        valueLink: "decision_quality",
        suggestedTarget: "Statistically significant positive correlation",
        suggestedTimeframe: "First bonus cycle post-go-live",
        howMeasured: "Statistical analysis of bonus outcomes vs performance ratings; baseline to be established",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Bonus pool optimisation delivers significant value in your sector ({sector}) where bonus is a major component of total comp.",
        "Requires AI Compensation Recommendation Engine (#1) as a foundation.",
      ],
      moderate_fit: ["Bonus pool optimisation delivers value across most organisations with significant variable pay."],
      weak_fit: ["Reward AI ambition level suggests this initiative may be premature."],
      not_recommended: ["Current AI ambition profile suggests foundational initiatives should come first."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'high',
      integrationNeed: 'high',
      governanceSensitivity: 'high',
    },
  },

  // ── #17 AI Sales Compensation Plan Design ────────────────────────────────
  {
    id: "ai_sales_compensation_plan_design",
    number: 17,
    title: "AI Sales Compensation Plan Design",
    shortDescription:
      "Data-driven sales compensation plan design — using ML to model plan mechanics, quota attainment distributions, and cost-of-sales to design plans that drive the right behaviours.",
    fullDescription:
      "Applies ML to the design and optimisation of sales compensation plans. The system models how different plan mechanics (accelerators, thresholds, caps, SPIFs) affect quota attainment distributions and cost-of-sales, enabling the Reward team to design plans that drive desired behaviours within budget. Integrates with CRM and sales performance data.",
    subDomain: "Sales Compensation",
    defaultPhase: "Build",
    complexity: "High",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "MODERATE_FIT",
      manufacturing: "MODERATE_FIT",
      pharmaceuticals_biotech: "STRONG_FIT",
      default: "WEAK_FIT",
    },
    workforceFitRules: [
      {
        field: "materialSalesWorkforce",
        op: "==",
        value: "none_minimal",
        result: "NOT_RECOMMENDED",
      },
      {
        field: "materialSalesWorkforce",
        op: "==",
        value: "present_but_small",
        result: "MODERATE_FIT",
      },
      {
        field: "materialSalesWorkforce",
        op: "in",
        value: ["significant_named_seller_workforce", "predominantly_sales"],
        result: "STRONG_FIT",
      },
    ],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "sales_comp_redesign", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 450000,
      base3yrHigh: 2040000,
      payrollBaseline: 50000000,
      payrollFactor: 0.3,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: { financial_services: 1.3, technology: 1.3, pharmaceuticals_biotech: 1.2 },
      defaultSectorMultiplier: 0.9,
    },
    costCalibration: {
      year1Low: 190000,
      year1High: 600000,
      ongoingAnnualLow: 70000,
      ongoingAnnualHigh: 250000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1, professional_services: 1.1 },
      subDomainMultiplier: 1.2,
      defaultSectorMultiplier: 1.0,
    },
    supportsPrincipleIds: ["evidence_based"],
    primaryValueType: "decision_quality",
    timeToFirstValueMonths: 12,
    suggestedMeasures: [
      {
        name: "Quota attainment distribution (% sellers at 80-120% of quota)",
        valueLink: "decision_quality",
        suggestedTarget: ">60% in target zone",
        suggestedTimeframe: "First plan year post-redesign",
        howMeasured: "CRM/sales ops: attainment distribution; baseline from prior year",
      },
      {
        name: "Sales comp cost as % of revenue",
        valueLink: "efficiency",
        suggestedTarget: "Within approved cost-of-sales budget",
        suggestedTimeframe: "First plan year post-redesign",
        howMeasured: "Finance: total sales comp cost / total revenue; baseline from prior year",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your sales workforce composition ({materialSalesWorkforce}) makes sales comp design a high-value initiative.",
        "Your 'sales comp redesign' priority maps directly to what this initiative delivers.",
      ],
      moderate_fit: ["Sales compensation design delivers value where there is a meaningful sales workforce."],
      weak_fit: ["Limited sales workforce reduces the value of this initiative."],
      not_recommended: ["Minimal sales workforce means this initiative has limited applicability."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'high',
      integrationNeed: 'medium',
      governanceSensitivity: 'medium',
    },
  },

  // ── #18 AI LTIP Modelling ─────────────────────────────────────────────────
  {
    id: "ai_ltip_modelling",
    number: 18,
    title: "AI LTIP Modelling",
    shortDescription:
      "Automated modelling of long-term incentive plan outcomes — simulating TSR, EPS, and other performance conditions to support remuneration committee decision-making.",
    fullDescription:
      "Uses Monte Carlo simulation and ML to model the expected outcomes of LTIP performance conditions under different scenarios. Enables the remuneration committee to understand the probability distribution of vesting outcomes, the cost of the plan, and the alignment between executive pay and shareholder returns. Integrates with proxy advisor guidance.",
    subDomain: "Executive Compensation",
    defaultPhase: "Optimise",
    complexity: "Highest",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      retail: "STRONG_FIT",
      manufacturing: "MODERATE_FIT",
      professional_services: "MODERATE_FIT",
      public_sector: "WEAK_FIT",
      not_for_profit: "WEAK_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "executive_comp_refresh", result: "STRONG_FIT" },
      { field: "ownershipStructure", op: "in", value: ["ftse_100_listed", "ftse_250_listed", "aim_listed", "other_listed", "subsidiary_listed_group"], result: "STRONG_FIT" },
    ],
    notRecommendedIf: [
      {
        condition: "ownershipStructure in ['private_pe_backed', 'private_vc_backed', 'private_family_owned', 'mutual_cooperative', 'public_sector', 'not_for_profit']",
        reasoning: "LTIP modelling is designed for listed companies with public performance conditions. Not applicable for your ownership structure.",
      },
    ],
    valueCalibration: {
      base3yrLow: 360000,
      base3yrHigh: 1530000,
      payrollBaseline: 50000000,
      payrollFactor: 0.2,
      headcountBaseline: 1000,
      headcountFactor: 0.1,
      sectorMultipliers: { financial_services: 1.4, technology: 1.3 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 150000,
      year1High: 500000,
      ongoingAnnualLow: 40000,
      ongoingAnnualHigh: 150000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1 },
      subDomainMultiplier: 1.25,
      defaultSectorMultiplier: 1.0,
      costNote: 'Incremental tooling cost above your existing exec comp advisor relationship.',
    },
    supportsPrincipleIds: ["evidence_based"],
    primaryValueType: "strategic",
    timeToFirstValueMonths: 18,
    suggestedMeasures: [
      {
        name: "Time to model LTIP vesting scenarios for RemCo",
        valueLink: "efficiency",
        suggestedTarget: "-60% vs manual baseline",
        suggestedTimeframe: "First RemCo cycle post-go-live",
        howMeasured: "Hours logged by Reward/Finance team for LTIP scenario modelling; baseline from last cycle",
      },
      {
        name: "Number of LTIP scenarios modelled per RemCo cycle",
        valueLink: "decision_quality",
        suggestedTarget: ">5 scenarios per cycle",
        suggestedTimeframe: "First RemCo cycle post-go-live",
        howMeasured: "Platform dashboard: count of scenarios run per cycle",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "As a listed company, LTIP modelling is a high-value initiative for remuneration committee support.",
      ],
      moderate_fit: ["LTIP modelling delivers value for organisations with complex long-term incentive structures."],
      weak_fit: ["LTIP modelling value is limited for your ownership structure."],
      not_recommended: ["LTIP modelling is designed for listed companies. Not applicable for your ownership structure."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'low',
      integrationNeed: 'low',
      governanceSensitivity: 'high',
    },
  },

  // ── #19 AI Pension Engagement Optimisation ────────────────────────────────
  {
    id: "ai_pension_engagement_optimisation",
    number: 19,
    title: "AI Pension Engagement Optimisation",
    shortDescription:
      "AI-driven pension communication and engagement — personalising pension contribution nudges and investment education to improve employee retirement outcomes.",
    fullDescription:
      "Uses behavioural science and ML to personalise pension communications, contribution nudges, and investment education at scale. Identifies employees at risk of under-saving, models the impact of different contribution strategies, and delivers personalised guidance through digital channels. Improves employee financial wellbeing and reduces employer liability.",
    subDomain: "Benefits",
    defaultPhase: "Build",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      technology: "MODERATE_FIT",
      retail: "MODERATE_FIT",
      manufacturing: "MODERATE_FIT",
      public_sector: "MODERATE_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "pensionSchemeArchitecture",
        op: "in",
        value: ["defined_contribution_single_provider", "defined_contribution_multiple_providers", "hybrid_db_dc"],
        result: "STRONG_FIT",
      },
      {
        field: "pensionSchemeArchitecture",
        op: "==",
        value: "no_employer_pension",
        result: "NOT_RECOMMENDED",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "improve_employee_value_proposition", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 180000,
      base3yrHigh: 765000,
      payrollBaseline: 50000000,
      payrollFactor: 0.2,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: { financial_services: 1.2 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 80000,
      year1High: 260000,
      ongoingAnnualLow: 40000,
      ongoingAnnualHigh: 140000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.1, technology: 1.0, retail: 1.0, public_sector: 0.9 },
      defaultSectorMultiplier: 1.0,
      excludesProgrammeFunding: true,
      programmeFundingNote: 'Excludes the reward funding itself (typically 0.5-2% of payroll). Surface as a separate programme funding line in the business case.',
    },
    supportsPrincipleIds: ["individual_needs"],
    primaryValueType: "retention",
    timeToFirstValueMonths: 12,
    suggestedMeasures: [
      {
        name: "Average employee pension contribution rate",
        valueLink: "retention",
        suggestedTarget: "+0.5pp vs baseline",
        suggestedTimeframe: "12 months",
        howMeasured: "Payroll: average employee contribution as % of salary; baseline to be established at go-live",
      },
      {
        name: "% employees who have reviewed pension settings in last 12 months",
        valueLink: "retention",
        suggestedTarget: ">40%",
        suggestedTimeframe: "12 months",
        howMeasured: "Pension platform: count of employees with login/settings review in last 12 months",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your DC pension architecture ({pensionSchemeArchitecture}) is well-suited to AI-driven engagement.",
      ],
      moderate_fit: ["Pension engagement optimisation delivers value across most organisations with employer pension schemes."],
      weak_fit: ["Pension scheme architecture may limit the scope of AI-driven engagement."],
      not_recommended: ["No employer pension scheme means this initiative is not applicable."],
    },
    capabilityProfile: {
      dataIntensity: 'medium',
      changeImpact: 'medium',
      integrationNeed: 'high',
      governanceSensitivity: 'high',
    },
  },

  // ── #20 AI Benefits Utilisation Analytics ────────────────────────────────
  {
    id: "ai_benefits_utilisation_analytics",
    number: 20,
    title: "AI Benefits Utilisation Analytics",
    shortDescription:
      "ML analysis of benefits utilisation patterns — identifying underused benefits, modelling the cost of the benefits portfolio, and informing benefits strategy decisions.",
    fullDescription:
      "Analyses benefits utilisation data to identify which benefits are valued and used, which are underused relative to cost, and where there are gaps between employee needs and current provision. AI models the cost-effectiveness of the benefits portfolio and surfaces recommendations for optimisation. Supports annual benefits review and flex benefits design.",
    subDomain: "Benefits",
    defaultPhase: "Foundation",
    complexity: "Low",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "MODERATE_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "improve_employee_value_proposition", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 108000,
      base3yrHigh: 425000,
      payrollBaseline: 50000000,
      payrollFactor: 0.15,
      headcountBaseline: 1000,
      headcountFactor: 0.15,
      sectorMultipliers: { financial_services: 1.1, technology: 1.1 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 100000,
      year1High: 280000,
      ongoingAnnualLow: 40000,
      ongoingAnnualHigh: 120000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1, public_sector: 0.85 },
      defaultSectorMultiplier: 1.0,
      excludesProgrammeFunding: true,
      programmeFundingNote: 'Excludes retention spend (the pay awards themselves). Surface as a separate programme funding line in the business case.',
    },
    supportsPrincipleIds: ["individual_needs"],
    primaryValueType: "efficiency",
    timeToFirstValueMonths: 6,
    suggestedMeasures: [
      {
        name: "Benefits cost per employee",
        valueLink: "efficiency",
        suggestedTarget: "Reduction or reallocation to higher-value benefits",
        suggestedTimeframe: "12 months",
        howMeasured: "Finance: total benefits cost / headcount; baseline from current benefits spend",
      },
      {
        name: "% benefits with utilisation data available",
        valueLink: "decision_quality",
        suggestedTarget: "100%",
        suggestedTimeframe: "6 months",
        howMeasured: "Platform dashboard: count of benefits with utilisation data vs total benefits offered",
      },
    ],
    reasoningTemplates: {
      strong_fit: ["Benefits utilisation analytics is a low-complexity, high-insight initiative."],
      moderate_fit: ["Benefits analytics delivers value across most organisations."],
      weak_fit: ["Limited benefits data may constrain the analysis."],
      not_recommended: ["Current capability profile suggests other priorities first."],
    },
    capabilityProfile: {
      dataIntensity: 'medium',
      changeImpact: 'low',
      integrationNeed: 'medium',
      governanceSensitivity: 'low',
    },
  },

  // ── #21 AI Reward Governance Audit Trail ─────────────────────────────────
  {
    id: "ai_reward_governance_audit_trail",
    number: 21,
    title: "AI Reward Governance Audit Trail",
    shortDescription:
      "Automated audit trail for all reward decisions — creating an immutable, searchable record of every pay decision with the rationale, approvals, and market context.",
    fullDescription:
      "Creates a comprehensive, automated audit trail for every reward decision — hire, promotion, merit, market adjustment, bonus, and equity grant. Each record captures the decision, the rationale, the approvals obtained, and the market context at the time. Enables rapid response to equal pay claims, regulatory enquiries, and internal audit requests.",
    subDomain: "Reward Operations",
    defaultPhase: "Foundation",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      technology: "MODERATE_FIT",
      public_sector: "STRONG_FIT",
      healthcare: "STRONG_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "primaryTriggerForRewardAiStrategy", op: "==", value: "regulatory_deadline_pressure", result: "STRONG_FIT" },
      { field: "fcaSysc19InScope", op: "in", value: ["yes_in_scope", "yes_not_smcr"], result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 144000,
      base3yrHigh: 595000,
      payrollBaseline: 50000000,
      payrollFactor: 0.2,
      headcountBaseline: 1000,
      headcountFactor: 0.15,
      sectorMultipliers: { financial_services: 1.3, public_sector: 1.2 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 100000,
      year1High: 300000,
      ongoingAnnualLow: 25000,
      ongoingAnnualHigh: 100000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1, public_sector: 0.9 },
      defaultSectorMultiplier: 1.0,
      excludesProgrammeFunding: true,
      programmeFundingNote: 'Excludes payroll uplift if geographic differentials are introduced. Surface as a separate programme funding line in the business case.',
    },
    supportsPrincipleIds: ["transparency_default", "equal_pay_commitment"],
    primaryValueType: "risk_mitigation",
    timeToFirstValueMonths: 6,
    suggestedMeasures: [
      {
        name: "% pay decisions with complete audit record",
        valueLink: "risk_mitigation",
        suggestedTarget: "100%",
        suggestedTimeframe: "6 months",
        howMeasured: "Platform dashboard: count of pay decisions with rationale, approvals, and market context recorded",
      },
      {
        name: "Time to respond to equal pay information request",
        valueLink: "efficiency",
        suggestedTarget: "-70% vs manual baseline",
        suggestedTimeframe: "12 months",
        howMeasured: "Legal/HR ops: hours to compile pay history for a specific employee; baseline to be established",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your regulatory context ({fcaSysc19InScope}) makes a comprehensive audit trail a compliance necessity.",
        "Audit trail capability substantially reduces the cost of responding to equal pay claims.",
      ],
      moderate_fit: ["Reward governance audit trail delivers value across most organisations."],
      weak_fit: ["Current regulatory context suggests limited near-term urgency."],
      not_recommended: ["Current capability profile suggests other priorities first."],
    },
    capabilityProfile: {
      dataIntensity: 'medium',
      changeImpact: 'low',
      integrationNeed: 'high',
      governanceSensitivity: 'high',
    },
  },

  // ── #22 AI Reward Benchmarking Automation ─────────────────────────────────
  {
    id: "ai_reward_benchmarking_automation",
    number: 22,
    title: "AI Reward Benchmarking Automation",
    shortDescription:
      "Automated job matching and benchmarking against external pay surveys — replacing manual job matching with AI-driven role clustering and percentile positioning.",
    fullDescription:
      "Automates the most time-consuming part of compensation benchmarking: matching internal roles to survey jobs. AI clusters roles by scope and complexity, matches to survey equivalents, and calculates percentile positioning across multiple surveys simultaneously. Reduces benchmarking cycle time from weeks to hours.",
    subDomain: "Reward Operations",
    defaultPhase: "Foundation",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "externalCompDataSources",
        op: "not_in",
        value: ["none_no_external_data"],
        result: "STRONG_FIT",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "reduce_reward_admin_burden", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 180000,
      base3yrHigh: 680000,
      payrollBaseline: 50000000,
      payrollFactor: 0.2,
      headcountBaseline: 1000,
      headcountFactor: 0.15,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 90000,
      year1High: 280000,
      ongoingAnnualLow: 30000,
      ongoingAnnualHigh: 100000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1, public_sector: 0.85 },
      defaultSectorMultiplier: 1.0,
    },
    supportsPrincipleIds: ["competitive_pay", "evidence_based"],
    primaryValueType: "efficiency",
    timeToFirstValueMonths: 6,
    suggestedMeasures: [
      {
        name: "Benchmarking cycle time (roles matched and positioned)",
        valueLink: "efficiency",
        suggestedTarget: "-80% vs manual baseline",
        suggestedTimeframe: "First benchmarking cycle post-go-live",
        howMeasured: "Hours logged by Reward team for annual benchmarking cycle; baseline from last cycle",
      },
      {
        name: "% roles with current market positioning data",
        valueLink: "decision_quality",
        suggestedTarget: "95%",
        suggestedTimeframe: "12 months",
        howMeasured: "Platform dashboard: count of roles with market data updated in last 12 months",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "You already use external comp data — automating the benchmarking process delivers immediate capacity savings.",
      ],
      moderate_fit: ["Benchmarking automation delivers value across most organisations using external survey data."],
      weak_fit: ["Limited external data use reduces the value of this initiative."],
      not_recommended: ["No external comp data use means this initiative has limited applicability."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'low',
      integrationNeed: 'medium',
      governanceSensitivity: 'low',
    },
  },

  // ── #23 AI Reward Budget Forecasting ─────────────────────────────────────
  {
    id: "ai_reward_budget_forecasting",
    number: 23,
    title: "AI Reward Budget Forecasting",
    shortDescription:
      "ML-driven reward budget forecasting — predicting merit, bonus, and benefits costs under different scenarios to improve financial planning accuracy.",
    fullDescription:
      "Uses ML to forecast reward costs across merit, bonus, benefits, and equity under different business scenarios. Integrates with workforce planning data to model the impact of headcount changes, promotions, and attrition on reward costs. Enables more accurate financial planning and reduces end-of-year budget surprises.",
    subDomain: "Reward Operations",
    defaultPhase: "Build",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "MODERATE_FIT",
      manufacturing: "MODERATE_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "reduce_reward_admin_burden", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 180000,
      base3yrHigh: 765000,
      payrollBaseline: 50000000,
      payrollFactor: 0.3,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 100000,
      year1High: 320000,
      ongoingAnnualLow: 35000,
      ongoingAnnualHigh: 120000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.1, technology: 1.0, public_sector: 0.9 },
      defaultSectorMultiplier: 1.0,
    },
    supportsPrincipleIds: ["evidence_based"],
    primaryValueType: "decision_quality",
    timeToFirstValueMonths: 12,
    suggestedMeasures: [
      {
        name: "Reward budget forecast accuracy (merit + bonus)",
        valueLink: "decision_quality",
        suggestedTarget: "Within ±3% of actual spend",
        suggestedTimeframe: "First full forecast cycle post-go-live",
        howMeasured: "Finance: forecast vs actual reward spend at year-end; baseline from prior year variance",
      },
      {
        name: "Time to produce annual reward budget forecast",
        valueLink: "efficiency",
        suggestedTarget: "-50% vs baseline",
        suggestedTimeframe: "First cycle post-go-live",
        howMeasured: "Hours logged by Reward/Finance team for budget forecast; baseline to be established",
      },
    ],
    reasoningTemplates: {
      strong_fit: ["Reward budget forecasting delivers significant value in organisations with complex, multi-component reward structures."],
      moderate_fit: ["Budget forecasting automation delivers value across most organisations."],
      weak_fit: ["Consider whether workforce planning data is available to support forecasting."],
      not_recommended: ["Current capability profile suggests other priorities first."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'medium',
      integrationNeed: 'high',
      governanceSensitivity: 'medium',
    },
  },

  // ── #24 AI Pension Strategy Modelling ────────────────────────────────────
  {
    id: "ai_pension_strategy_modelling",
    number: 24,
    title: "AI Pension Strategy Modelling",
    shortDescription:
      "Scenario modelling for pension strategy decisions — DB to DC transition, contribution rate changes, provider consolidation — with cost and employee impact analysis.",
    fullDescription:
      "Uses actuarial modelling and ML to support major pension strategy decisions: DB to DC transition, contribution rate changes, provider consolidation, and auto-enrolment optimisation. Models the cost, employee impact, and regulatory implications of different scenarios. Supports trustee and board-level decision-making.",
    subDomain: "Benefits",
    defaultPhase: "Optimise",
    complexity: "High",
    sectorFit: {
      financial_services: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      manufacturing: "STRONG_FIT",
      public_sector: "STRONG_FIT",
      retail: "MODERATE_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "pensionSchemeArchitecture",
        op: "in",
        value: ["defined_benefit_closed_to_new", "hybrid_db_dc", "defined_benefit_open"],
        result: "STRONG_FIT",
      },
      {
        field: "pensionSchemeArchitecture",
        op: "==",
        value: "no_employer_pension",
        result: "NOT_RECOMMENDED",
      },
    ],
    priorityFitRules: [],
    valueCalibration: {
      base3yrLow: 270000,
      base3yrHigh: 1190000,
      payrollBaseline: 50000000,
      payrollFactor: 0.3,
      headcountBaseline: 1000,
      headcountFactor: 0.15,
      sectorMultipliers: { financial_services: 1.3, manufacturing: 1.2, public_sector: 1.2 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 200000,
      year1High: 800000,
      ongoingAnnualLow: 100000,
      ongoingAnnualHigh: 400000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, public_sector: 1.1, professional_services: 1.1 },
      defaultSectorMultiplier: 1.0,
      costNote: 'Includes actuarial consultancy costs alongside tooling. Figures assume an established pension scheme.',
    },
    supportsPrincipleIds: ["individual_needs"],
    primaryValueType: "strategic",
    timeToFirstValueMonths: 18,
    suggestedMeasures: [
      {
        name: "Number of pension strategy scenarios modelled for board/trustee",
        valueLink: "decision_quality",
        suggestedTarget: ">3 scenarios per strategic review",
        suggestedTimeframe: "First strategic review post-go-live",
        howMeasured: "Platform dashboard: count of scenarios run for each strategic decision",
      },
      {
        name: "Time to model pension strategy scenario",
        valueLink: "efficiency",
        suggestedTarget: "-60% vs manual/actuarial baseline",
        suggestedTimeframe: "First strategic review post-go-live",
        howMeasured: "Hours logged by Reward/Finance team for scenario modelling; baseline from last review",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your pension architecture ({pensionSchemeArchitecture}) involves significant strategic decisions that benefit from scenario modelling.",
      ],
      moderate_fit: ["Pension strategy modelling delivers value for organisations with complex pension arrangements."],
      weak_fit: ["Pension scheme architecture suggests limited scope for strategic modelling."],
      not_recommended: ["No employer pension scheme means this initiative is not applicable."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'low',
      integrationNeed: 'medium',
      governanceSensitivity: 'high',
    },
  },

  // ── #25 AI Reward Communications Generator ───────────────────────────────
  {
    id: "ai_reward_communications_generator",
    number: 25,
    title: "AI Reward Communications Generator",
    shortDescription:
      "AI-generated reward communications — producing personalised, plain-language communications for pay reviews, bonus outcomes, and benefits changes at scale.",
    fullDescription:
      "Generates personalised reward communications for every employee at key moments: pay review outcomes, bonus notifications, benefits enrolment, and total rewards updates. AI ensures communications are accurate, personalised, and in plain language. Reduces Reward team effort and improves employee understanding of their total rewards package.",
    subDomain: "Reward Operations",
    defaultPhase: "Foundation",
    complexity: "Low",
    sectorFit: {
      default: "MODERATE_FIT",
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      retail: "STRONG_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "improve_employee_value_proposition", result: "STRONG_FIT" },
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "reduce_reward_admin_burden", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 90000,
      base3yrHigh: 340000,
      payrollBaseline: 50000000,
      payrollFactor: 0.1,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: {},
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 150000,
      year1High: 700000,
      ongoingAnnualLow: 0,
      ongoingAnnualHigh: 0,
      costType: 'per_deal',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1, professional_services: 1.1 },
      defaultSectorMultiplier: 1.0,
      costNote: 'Cost is per-deal, not annual. Applies when a transaction is active. No standing ongoing cost.',
    },
    supportsPrincipleIds: ["explainable_pay", "transparency_default"],
    primaryValueType: "efficiency",
    timeToFirstValueMonths: 6,
    suggestedMeasures: [
      {
        name: "Time to produce reward communications at merit cycle",
        valueLink: "efficiency",
        suggestedTarget: "-80% vs manual baseline",
        suggestedTimeframe: "First merit cycle post-go-live",
        howMeasured: "Hours logged by Reward team for communications production; baseline from last cycle",
      },
      {
        name: "Employee open rate on personalised reward communications",
        valueLink: "retention",
        suggestedTarget: ">60%",
        suggestedTimeframe: "First cycle post-go-live",
        howMeasured: "Email platform: open rate on reward communications; baseline to be established",
      },
    ],
    reasoningTemplates: {
      strong_fit: ["Reward communications automation is a quick win — low complexity, immediate capacity release."],
      moderate_fit: ["Communications automation delivers value across most organisations."],
      weak_fit: ["Consider whether HRIS integration is in place to support personalisation."],
      not_recommended: ["Current capability profile suggests other priorities first."],
    },
    capabilityProfile: {
      dataIntensity: 'medium',
      changeImpact: 'medium',
      integrationNeed: 'medium',
      governanceSensitivity: 'low',
    },
  },

  // ── #26 AI Attrition Risk Modelling for Reward ───────────────────────────
  {
    id: "ai_attrition_risk_modelling_reward",
    number: 26,
    title: "AI Attrition Risk Modelling for Reward",
    shortDescription:
      "ML-driven attrition risk modelling focused on pay-related flight risk — identifying employees at risk of leaving due to pay dissatisfaction and modelling retention investment options.",
    fullDescription:
      "Uses ML to identify employees at risk of leaving due to pay-related dissatisfaction, modelling the relationship between pay position, market movement, and attrition probability. Enables targeted retention investment — pay adjustments, equity grants, or benefits changes — before employees reach the point of resignation. Integrates with HRIS and exit interview data.",
    subDomain: "Compensation",
    defaultPhase: "Build",
    complexity: "High",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      pharmaceuticals_biotech: "STRONG_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [
      {
        field: "criticalAiDigitalTalentPopulation",
        op: "in",
        value: ["established_growing", "actively_fighting_in_market_for_ai_talent"],
        result: "STRONG_FIT",
      },
    ],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "ai_talent_pay_strategy", result: "STRONG_FIT" },
      { field: "primaryTriggerForRewardAiStrategy", op: "==", value: "talent_attraction_retention_pressure", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 360000,
      base3yrHigh: 1530000,
      payrollBaseline: 50000000,
      payrollFactor: 0.35,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: { financial_services: 1.3, technology: 1.3, professional_services: 1.2 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 70000,
      year1High: 230000,
      ongoingAnnualLow: 20000,
      ongoingAnnualHigh: 80000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, public_sector: 1.1, technology: 1.0 },
      defaultSectorMultiplier: 1.0,
    },
    supportsPrincipleIds: ["competitive_pay", "evidence_based"],
    primaryValueType: "retention",
    timeToFirstValueMonths: 12,
    suggestedMeasures: [
      {
        name: "Voluntary attrition rate in high-risk cohort",
        valueLink: "retention",
        suggestedTarget: "-20% vs baseline in flagged cohort",
        suggestedTimeframe: "12 months",
        howMeasured: "HRIS: voluntary leavers in model-flagged high-risk cohort vs prior period; baseline to be established",
      },
      {
        name: "% high-risk employees who received targeted retention action",
        valueLink: "decision_quality",
        suggestedTarget: ">80%",
        suggestedTimeframe: "6 months",
        howMeasured: "Platform dashboard: count of flagged employees with documented retention action",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your AI talent population and sector make pay-related attrition risk a significant concern.",
        "Targeted retention investment based on risk modelling substantially outperforms across-the-board pay increases.",
      ],
      moderate_fit: ["Attrition risk modelling delivers value across most organisations with competitive talent markets."],
      weak_fit: ["Consider whether HRIS data quality supports attrition modelling."],
      not_recommended: ["Current talent profile suggests limited applicability."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'medium',
      integrationNeed: 'high',
      governanceSensitivity: 'medium',
    },
  },

  // ── #27 AI Job Architecture Rationalisation ───────────────────────────────
  {
    id: "ai_job_architecture_rationalisation",
    number: 27,
    title: "AI Job Architecture Rationalisation",
    shortDescription:
      "AI-driven rationalisation of job titles and job families — reducing proliferation, improving market comparability, and creating a foundation for consistent pay management.",
    fullDescription:
      "Uses NLP and ML to cluster existing job titles by role content, identify duplication and inconsistency, and propose a rationalised job architecture. Reduces job title proliferation (often 3-5x reduction), improves market benchmarking accuracy, and creates a cleaner foundation for pay band design and skills-based pay.",
    subDomain: "Compensation",
    defaultPhase: "Foundation",
    complexity: "Medium",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      retail: "MODERATE_FIT",
      manufacturing: "MODERATE_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "modernise_comp_decisions", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 180000,
      base3yrHigh: 680000,
      payrollBaseline: 50000000,
      payrollFactor: 0.2,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: { financial_services: 1.1, technology: 1.1 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 170000,
      year1High: 570000,
      ongoingAnnualLow: 60000,
      ongoingAnnualHigh: 200000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1, public_sector: 0.85 },
      defaultSectorMultiplier: 1.0,
    },
    supportsPrincipleIds: ["clear_structure"],
    primaryValueType: "strategic",
    timeToFirstValueMonths: 6,
    suggestedMeasures: [
      {
        name: "Number of distinct job titles (before vs after)",
        valueLink: "efficiency",
        suggestedTarget: "-60% vs baseline",
        suggestedTimeframe: "Project completion",
        howMeasured: "HRIS: count of distinct job titles; baseline from current HRIS extract",
      },
      {
        name: "% roles with a valid market benchmark match",
        valueLink: "decision_quality",
        suggestedTarget: ">90%",
        suggestedTimeframe: "6 months post-rationalisation",
        howMeasured: "Benchmarking platform: count of roles with matched survey equivalent",
      },
    ],
    reasoningTemplates: {
      strong_fit: ["Job architecture rationalisation is a foundational initiative that enables most downstream compensation improvements."],
      moderate_fit: ["Job architecture rationalisation delivers value across most organisations with complex role structures."],
      weak_fit: ["Consider whether job architecture complexity justifies this initiative."],
      not_recommended: ["Current capability profile suggests other priorities first."],
    },
    capabilityProfile: {
      dataIntensity: 'medium',
      changeImpact: 'high',
      integrationNeed: 'medium',
      governanceSensitivity: 'low',
    },
  },

  // ── #28 AI Manager Pay Conversation Coaching ─────────────────────────────
  {
    id: "ai_manager_pay_conversation_coaching",
    number: 28,
    title: "AI Manager Pay Conversation Coaching",
    shortDescription:
      "AI-powered coaching for managers on pay conversations — preparing them for merit, promotion, and market adjustment discussions with personalised scripts and objection handling.",
    fullDescription:
      "Provides managers with AI-generated preparation materials for pay conversations: personalised scripts based on the specific employee's pay history and market position, anticipated questions and objection handling, and guidance on what they can and cannot disclose. Reduces manager anxiety around pay conversations and improves consistency.",
    subDomain: "Reward Operations",
    defaultPhase: "Build",
    complexity: "Medium",
    sectorFit: {
      default: "MODERATE_FIT",
      financial_services: "MODERATE_FIT",
      technology: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "aiMaturityInRewardToday",
        op: "<",
        value: 2,
        result: "WEAK_FIT",
        reasoning: "Manager pay conversation coaching delivers more value once foundational AI capability is in place.",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "improve_employee_value_proposition", result: "STRONG_FIT" },
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "prepare_for_pay_transparency", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 144000,
      base3yrHigh: 510000,
      payrollBaseline: 50000000,
      payrollFactor: 0.15,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: {},
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 60000,
      year1High: 180000,
      ongoingAnnualLow: 25000,
      ongoingAnnualHigh: 70000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.1, technology: 1.0, public_sector: 0.9 },
      defaultSectorMultiplier: 1.0,
    },
    supportsPrincipleIds: ["amplify_team"],
    primaryValueType: "decision_quality",
    timeToFirstValueMonths: 12,
    suggestedMeasures: [
      {
        name: "Manager confidence in pay conversations (survey)",
        valueLink: "decision_quality",
        suggestedTarget: ">75% confident",
        suggestedTimeframe: "12 months",
        howMeasured: "Annual manager survey: % rating themselves confident in pay conversations; baseline to be established",
      },
      {
        name: "Employee satisfaction with pay conversation quality (survey)",
        valueLink: "retention",
        suggestedTarget: "+10pp vs baseline",
        suggestedTimeframe: "12 months",
        howMeasured: "Annual engagement survey: % satisfied with quality of pay conversations; baseline to be established",
      },
    ],
    reasoningTemplates: {
      strong_fit: ["Manager pay conversation coaching is a high-impact initiative for pay transparency readiness."],
      moderate_fit: ["Pay conversation coaching delivers value across most organisations."],
      weak_fit: ["Build foundational AI capability before investing in manager coaching tools."],
      not_recommended: ["Current AI maturity suggests foundational initiatives should come first."],
    },
    capabilityProfile: {
      dataIntensity: 'low',
      changeImpact: 'high',
      integrationNeed: 'low',
      governanceSensitivity: 'medium',
    },
  },

  // ── #29 AI Reward Analytics Dashboard ────────────────────────────────────
  {
    id: "ai_reward_analytics_dashboard",
    number: 29,
    title: "AI Reward Analytics Dashboard",
    shortDescription:
      "Integrated Reward analytics platform — combining pay equity, market position, budget consumption, and attrition risk into a single, always-current view for the Reward team and leadership.",
    fullDescription:
      "Creates a unified analytics layer across all Reward data: pay equity metrics, market position by job family, merit budget consumption, bonus pool utilisation, and attrition risk signals. AI-driven anomaly detection surfaces issues before they become problems. Provides board-ready reporting and supports data-driven Reward strategy.",
    subDomain: "Reward Operations",
    defaultPhase: "Build",
    complexity: "High",
    sectorFit: {
      financial_services: "STRONG_FIT",
      technology: "STRONG_FIT",
      professional_services: "STRONG_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [],
    capabilityFitRules: [
      {
        field: "rewardFunctionMaturityRating",
        op: "<",
        value: 2,
        result: "WEAK_FIT",
        reasoning: "Analytics dashboard delivers most value when foundational Reward processes are in place.",
      },
    ],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "reduce_reward_admin_burden", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 270000,
      base3yrHigh: 1020000,
      payrollBaseline: 50000000,
      payrollFactor: 0.25,
      headcountBaseline: 1000,
      headcountFactor: 0.2,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 175000,
      year1High: 580000,
      ongoingAnnualLow: 45000,
      ongoingAnnualHigh: 150000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { financial_services: 1.2, technology: 1.1, public_sector: 0.85 },
      defaultSectorMultiplier: 1.0,
    },
    supportsPrincipleIds: ["evidence_based", "transparency_default"],
    primaryValueType: "efficiency",
    timeToFirstValueMonths: 12,
    suggestedMeasures: [
      {
        name: "Time to produce monthly Reward metrics report",
        valueLink: "efficiency",
        suggestedTarget: "-90% vs manual baseline",
        suggestedTimeframe: "3 months post-go-live",
        howMeasured: "Hours logged by Reward team for monthly reporting; baseline to be established",
      },
      {
        name: "Number of Reward anomalies detected proactively (before escalation)",
        valueLink: "decision_quality",
        suggestedTarget: "Increase vs baseline",
        suggestedTimeframe: "12 months",
        howMeasured: "Platform dashboard: count of anomaly alerts acted on before manager/employee escalation; baseline to be established",
      },
    ],
    reasoningTemplates: {
      strong_fit: ["A unified Reward analytics dashboard delivers significant value once foundational data is in place."],
      moderate_fit: ["Reward analytics delivers value across most organisations."],
      weak_fit: ["Build foundational Reward processes before investing in analytics infrastructure."],
      not_recommended: ["Current Reward function maturity suggests foundational work is needed first."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'low',
      integrationNeed: 'high',
      governanceSensitivity: 'medium',
    },
  },

  // ── #30 AI Frontline Pay Optimisation ────────────────────────────────────
  {
    id: "ai_frontline_pay_optimisation",
    number: 30,
    title: "AI Frontline Pay Optimisation",
    shortDescription:
      "ML-driven pay optimisation for frontline and hourly workers — modelling the impact of pay rates, shift premiums, and NLW compliance on attraction, retention, and cost.",
    fullDescription:
      "Addresses the specific challenges of frontline pay management: NLW compliance, shift premium optimisation, high-volume hiring pay rates, and the cost-benefit of pay rate changes on retention and productivity. Uses ML to model the impact of different pay strategies on attraction, retention, and total cost. Particularly valuable for retail, hospitality, and logistics organisations.",
    subDomain: "Compensation",
    defaultPhase: "Foundation",
    complexity: "Medium",
    sectorFit: {
      retail: "STRONG_FIT",
      hospitality_leisure: "STRONG_FIT",
      logistics_transport: "STRONG_FIT",
      manufacturing: "STRONG_FIT",
      healthcare: "STRONG_FIT",
      financial_services: "WEAK_FIT",
      technology: "WEAK_FIT",
      professional_services: "WEAK_FIT",
      default: "MODERATE_FIT",
    },
    workforceFitRules: [
      {
        field: "workforceFrontlinePct",
        op: "<",
        value: 20,
        result: "NOT_RECOMMENDED",
      },
      {
        field: "workforceFrontlinePct",
        op: "<",
        value: 40,
        result: "WEAK_FIT",
      },
      {
        field: "workforceFrontlinePct",
        op: ">=",
        value: 60,
        result: "STRONG_FIT",
      },
    ],
    capabilityFitRules: [],
    priorityFitRules: [
      { field: "topRewardPrioritiesNext12Months", op: "contains", value: "frontline_workforce_pay", result: "STRONG_FIT" },
    ],
    valueCalibration: {
      base3yrLow: 360000,
      base3yrHigh: 1700000,
      payrollBaseline: 50000000,
      payrollFactor: 0.4,
      headcountBaseline: 1000,
      headcountFactor: 0.3,
      sectorMultipliers: { retail: 1.2, hospitality_leisure: 1.2, logistics_transport: 1.2 },
      defaultSectorMultiplier: 1.0,
    },
    costCalibration: {
      year1Low: 270000,
      year1High: 1000000,
      ongoingAnnualLow: 80000,
      ongoingAnnualHigh: 250000,
      costType: 'annual',
      headcountMin: 1000,
      headcountMax: 10000,
      sectorMultipliers: { retail: 1.0, hospitality_leisure: 0.95, manufacturing: 0.95, financial_services: 1.1, public_sector: 0.9 },
      defaultSectorMultiplier: 1.0,
      costNote: 'Higher than typical for complexity tier due to union consultation requirements and workforce scale factors.',
    },
    supportsPrincipleIds: ["competitive_pay", "equal_pay_commitment"],
    primaryValueType: "risk_mitigation",
    timeToFirstValueMonths: 6,
    suggestedMeasures: [
      {
        name: "NLW compliance rate across all frontline roles",
        valueLink: "risk_mitigation",
        suggestedTarget: "100%",
        suggestedTimeframe: "Immediate",
        howMeasured: "Payroll: count of employees paid below NLW threshold; baseline from current payroll audit",
      },
      {
        name: "Frontline voluntary attrition rate",
        valueLink: "retention",
        suggestedTarget: "Reduction to be defined after baseline established",
        suggestedTimeframe: "12 months",
        howMeasured: "HRIS: voluntary leavers in frontline roles as % of frontline headcount; baseline to be established",
      },
    ],
    reasoningTemplates: {
      strong_fit: [
        "Your frontline workforce ({workforceFrontlinePct}% frontline) makes this a high-value initiative.",
        "NLW compliance, shift premium optimisation, and frontline retention are significant cost drivers for your organisation.",
      ],
      moderate_fit: ["Frontline pay optimisation delivers value where there is a meaningful frontline workforce."],
      weak_fit: ["Limited frontline workforce reduces the value of this initiative."],
      not_recommended: ["Minimal frontline workforce means this initiative has limited applicability."],
    },
    capabilityProfile: {
      dataIntensity: 'high',
      changeImpact: 'medium',
      integrationNeed: 'high',
      governanceSensitivity: 'medium',
    },
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getRewardInitiative(id: string): RewardInitiative | undefined {
  return REWARD_INITIATIVE_LIBRARY.find((i) => i.id === id);
}

export function getAllRewardInitiatives(): RewardInitiative[] {
  return REWARD_INITIATIVE_LIBRARY;
}

export const REWARD_INITIATIVE_IDS = REWARD_INITIATIVE_LIBRARY.map((i) => i.id);
