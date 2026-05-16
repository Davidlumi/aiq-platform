/**
 * Fit + Impact Engine
 *
 * Evaluates each of the 49 initiatives against a CPO's background inputs and returns
 * a structured per-initiative output card. Called during draft generation on completePrework
 * and completeSession (second pass).
 *
 * Architecture:
 *   1. Hard gate check — if required sub-functions or data fields are missing → HARD_GATE_FAIL
 *   2. Soft fit scoring — evaluate each SoftFitFactor and sum to 0–100
 *   3. Fit status classification — STRONG_FIT / POSSIBLE_FIT / POOR_FIT
 *   4. Value calculation — call the registered formula from valueFormulas.ts
 *   5. Confidence labelling — HIGH / MEDIUM / LOW based on isEstimate flags
 *   6. Risk flags — evaluate risk flag conditions
 *   7. Return InitiativeOutputCard
 */

import { INITIATIVE_LIBRARY, type FitStatus, type HardGate, type InitiativeDefinition } from "../../shared/initiativeLibrary";
import { VALUE_FORMULA_REGISTRY, type ValueFormulaInputs } from "../../shared/valueFormulas";
import { INITIATIVE_CONFIG } from "../../shared/initiativeConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type InitiativeOutputCard = {
  id: string;
  label: string;
  category: string;
  fitStatus: FitStatus;
  fitScore: number;               // 0–100 soft score (0 for HARD_GATE_FAIL)
  fitRationale: string;           // One-sentence explanation of fit status
  valueRange: { low: number; high: number; currency: "GBP" } | null;
  valueNarrative: string;
  isIndicative: boolean;
  confidence: ConfidenceLevel;
  timeToValueMonths: { min: number; max: number };
  phase: 1 | 2 | 3;
  caseStudyAnchor: string;
  riskFlags: string[];
  hardGateFailReasons: string[];
  /** Per-factor scores for the Why-this-fits drawer section */
  scoredFactors: Array<{ key: string; label: string; score: number; maxScore: number }>;
  /** Hard gate checks that passed (for drawer display) */
  hardGatesPassed: string[];
  /** Y1 cost range in GBP thousands (from initiative library) */
  y1CostRange: { low: number; high: number };
};

export type FitImpactEngineInputs = ValueFormulaInputs & {
  sectionB?: { hrSubFunctions?: string[] };
  sectionG?: { [domain: string]: number };
  sectionF?: { changeReadiness?: string };
  sectionJ?: {
    budgetCeiling?: string;
    timelineConstraint?: string;
    riskTolerance?: string;
    quickWinsPreference?: string;
  };
  sectionK?: {
    onboardingModel?: string;
    internalMobilityApproach?: string;
    performanceReviewCadence?: string;
    hrHelpdeskModel?: string;
    hiringProcessStructure?: string;
    hiringVolumeProfile?: string[];
    lAndDDeliveryModel?: string;
    rewardCycleModel?: string;
  };
};

// ─── Soft factor evaluators ───────────────────────────────────────────────────

function scoreApplicationVolume(inputs: FitImpactEngineInputs, maxScore: number): number {
  const vol = inputs.sectionD.annualApplicationVolume ?? 0;
  if (vol >= 50000) return maxScore;
  if (vol >= 20000) return Math.round(maxScore * 0.8);
  if (vol >= 5000) return Math.round(maxScore * 0.5);
  if (vol >= 1000) return Math.round(maxScore * 0.2);
  return 0;
}

function scoreQueryVolume(inputs: FitImpactEngineInputs, maxScore: number): number {
  const vol = inputs.sectionD.monthlyHrQueryVolume ?? 0;
  if (vol >= 5000) return maxScore;
  if (vol >= 2000) return Math.round(maxScore * 0.8);
  if (vol >= 500) return Math.round(maxScore * 0.5);
  if (vol >= 200) return Math.round(maxScore * 0.2);
  return 0;
}

function scoreHireVolume(inputs: FitImpactEngineInputs, maxScore: number): number {
  const hires = inputs.sectionD.annualHires ?? 0;
  if (hires >= 500) return maxScore;
  if (hires >= 200) return Math.round(maxScore * 0.8);
  if (hires >= 50) return Math.round(maxScore * 0.5);
  if (hires >= 20) return Math.round(maxScore * 0.3);
  return 0;
}

function scoreAdminTime(inputs: FitImpactEngineInputs, maxScore: number): number {
  const hours = inputs.sectionD.adminTimePerHire ?? 0;
  if (hours >= 20) return maxScore;
  if (hours >= 10) return Math.round(maxScore * 0.7);
  if (hours >= 5) return Math.round(maxScore * 0.4);
  return Math.round(maxScore * 0.1);
}

function scoreHeadcount(inputs: FitImpactEngineInputs, maxScore: number): number {
  const hc = inputs.sectionA.totalHeadcount ?? 0;
  if (hc >= 10000) return maxScore;
  if (hc >= 5000) return Math.round(maxScore * 0.8);
  if (hc >= 1000) return Math.round(maxScore * 0.6);
  if (hc >= 500) return Math.round(maxScore * 0.4);
  return Math.round(maxScore * 0.2);
}

function scoreDataQuality(inputs: FitImpactEngineInputs, maxScore: number): number {
  const quality = inputs.sectionC.dataQualityRating;
  const map: Record<string, number> = {
    excellent: 1.0,
    good: 0.75,
    fair: 0.5,
    poor: 0.2,
  };
  return Math.round(maxScore * (map[quality ?? "fair"] ?? 0.5));
}

function scoreDigitalAccess(inputs: FitImpactEngineInputs, maxScore: number): number {
  const access = inputs.sectionC.workforceDigitalAccess;
  // v3 enum values: all_laptops, mixed_access, frontline_mobile, limited
  // v2 fallback values: all, most, some, limited
  const map: Record<string, number> = {
    all_laptops: 1.0,
    mixed_access: 0.75,
    frontline_mobile: 0.35, // frontline-only mobile = low general digital access
    limited: 0.1,
    // v2 fallbacks
    all: 1.0,
    most: 0.75,
    some: 0.4,
  };
  return Math.round(maxScore * (map[access ?? "mixed_access"] ?? 0.4));
}

/**
 * Inverted digital access scorer for initiatives specifically designed for
 * frontline/mobile-only workers (fw_frontline_communication, fw_frontline_learning).
 * "frontline_mobile" = full score (exact target audience).
 */
function scoreFrontlineDigitalAccess(inputs: FitImpactEngineInputs, maxScore: number): number {
  const access = inputs.sectionC.workforceDigitalAccess;
  const map: Record<string, number> = {
    frontline_mobile: 1.0,  // perfect fit — designed for this
    mixed_access: 0.7,      // partial frontline = good fit
    all_laptops: 0.3,       // desk-based workforce — lower need
    limited: 0.5,           // limited access = still a need
    // v2 fallbacks
    some: 0.7,
    most: 0.3,
    all: 0.2,
  };
  return Math.round(maxScore * (map[access ?? "mixed_access"] ?? 0.5));
}

function scoreAtspresent(inputs: FitImpactEngineInputs, maxScore: number): number {
  return inputs.sectionC.atsSystem && inputs.sectionC.atsSystem !== "None" ? maxScore : 0;
}

function scoreHrisPresent(inputs: FitImpactEngineInputs, maxScore: number): number {
  return inputs.sectionC.hrisSystem && inputs.sectionC.hrisSystem !== "None" ? maxScore : 0;
}

function scoreLmsPresent(inputs: FitImpactEngineInputs, maxScore: number): number {
  return inputs.sectionC.lmsSystem && inputs.sectionC.lmsSystem !== "None" ? maxScore : 0;
}

function scoreIntegrationMaturity(inputs: FitImpactEngineInputs, maxScore: number): number {
  const maturity = inputs.sectionC.hrSystemIntegrationMaturity;
  const map: Record<string, number> = {
    fully_integrated: 1.0,
    mostly_integrated: 0.75,
    partial: 0.4,
    siloed: 0.1,
    none: 0,
  };
  return Math.round(maxScore * (map[maturity ?? "partial"] ?? 0.4));
}

/** Normalise yearsOfHrisData to a numeric value for comparisons.
 * v2: stored as a number. v3: stored as enum string e.g. "2_to_5_years", "5_plus_years".
 */
function normaliseHrisYears(raw: number | string | undefined): number {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === "number") return raw;
  const map: Record<string, number> = {
    none: 0,
    less_than_1_year: 0.5,
    "1_to_2_years": 1.5,
    "2_to_5_years": 3,
    "5_plus_years": 6,
  };
  return map[raw] ?? 0;
}

function scoreHrisDataYears(inputs: FitImpactEngineInputs, maxScore: number): number {
  const years = normaliseHrisYears(inputs.sectionC.yearsOfHrisData);
  if (years >= 5) return maxScore;
  if (years >= 3) return Math.round(maxScore * 0.7);
  if (years >= 2) return Math.round(maxScore * 0.4);
  return 0;
}

function scoreManagerCapability(inputs: FitImpactEngineInputs, maxScore: number): number {
  const level = inputs.sectionI.managerCapabilityForInsights;
  // v4.2 enum values: strong, mixed, weak, variable (lowercase)
  const map: Record<string, number> = {
    strong: 1.0,
    mixed: 0.6,
    variable: 0.4,
    weak: 0.1,
  };
  return Math.round(maxScore * (map[level ?? "mixed"] ?? 0.6));
}

function scoreAttritionRate(inputs: FitImpactEngineInputs, maxScore: number): number {
  const rate = inputs.sectionD.attritionRate ?? 0;
  if (rate >= 25) return maxScore;
  if (rate >= 15) return Math.round(maxScore * 0.7);
  if (rate >= 10) return Math.round(maxScore * 0.4);
  return Math.round(maxScore * 0.1);
}

function scoreLDSpend(inputs: FitImpactEngineInputs, maxScore: number): number {
  const spend = inputs.sectionD.annualLDSpend ?? 0;
  if (spend >= 1000000) return maxScore;
  if (spend >= 500000) return Math.round(maxScore * 0.7);
  if (spend >= 100000) return Math.round(maxScore * 0.4);
  return Math.round(maxScore * 0.1);
}

function scoreEngagementLevel(inputs: FitImpactEngineInputs, maxScore: number): number {
  const score = inputs.sectionD.currentEngagementScore ?? 70;
  // Higher value if engagement is lower (more room to improve)
  if (score <= 50) return maxScore;
  if (score <= 60) return Math.round(maxScore * 0.7);
  if (score <= 70) return Math.round(maxScore * 0.4);
  return Math.round(maxScore * 0.1);
}

function scoreRevenuePresent(inputs: FitImpactEngineInputs, maxScore: number): number {
  return (inputs.sectionD.annualRevenue ?? 0) > 0 ? maxScore : 0;
}

function scoreInternalHireRate(inputs: FitImpactEngineInputs, maxScore: number): number {
  const rate = inputs.sectionI.workforceWorkType;
  // Use internal hire percent if available
  const pct = inputs.sectionD.internalHirePercent ?? 0;
  if (pct <= 20) return maxScore; // Low internal hire rate = high opportunity
  if (pct <= 35) return Math.round(maxScore * 0.6);
  return Math.round(maxScore * 0.2);
}

function scoreWorkforceType(inputs: FitImpactEngineInputs, maxScore: number): number {
  const type = inputs.sectionI.workforceWorkType;
  const map: Record<string, number> = {
    knowledge: 1.0,
    mixed: 0.7,
    frontline: 0.3,
    field: 0.4,
  };
  return Math.round(maxScore * (map[type ?? "mixed"] ?? 0.7));
}

function scoreRegulation(inputs: FitImpactEngineInputs, maxScore: number): number {
  const regs = inputs.sectionA.sectorSpecificRegulation ?? [];
  if (regs.length >= 3) return maxScore;
  if (regs.length >= 1) return Math.round(maxScore * 0.6);
  return Math.round(maxScore * 0.2);
}

function scoreChangeReadiness(inputs: FitImpactEngineInputs, maxScore: number): number {
  const readiness = inputs.sectionF?.changeReadiness;
  const map: Record<string, number> = {
    high: 1.0,
    moderate: 0.6,
    low: 0.2,
    resistant: 0.0,
  };
  return Math.round(maxScore * (map[readiness ?? "moderate"] ?? 0.6));
}

function scoreEthicsCapability(inputs: FitImpactEngineInputs, maxScore: number): number {
  const score = inputs.sectionG?.ai_ethics_trust ?? 5;
  return Math.round(maxScore * (score / 10));
}

function scoreFrontlineComposition(inputs: FitImpactEngineInputs, maxScore: number): number {
  const comp = inputs.sectionI.workforceComposition;
  const map: Record<string, number> = {
    frontline_heavy: 1.0,
    mixed: 0.6,
    knowledge_heavy: 0.1,
  };
  return Math.round(maxScore * (map[comp ?? "mixed"] ?? 0.6));
}

/**
 * Scores based on the precise percentage of frontline headcount (Section I).
 * Provides continuous differentiation that the categorical workforceComposition
 * field cannot supply — e.g. 25% vs 70% frontline both map to "mixed" but
 * have very different ROI profiles for frontline-targeted initiatives.
 *
 * Scale: ≥60% → full | 40–59% → 75% | 20–39% → 45% | 1–19% → 20% | 0/unknown → 0
 */
function scoreFrontlinePercent(inputs: FitImpactEngineInputs, maxScore: number): number {
  const pct = inputs.sectionI.frontlineHeadcountPercent;
  if (pct === undefined || pct === null) return 0;
  if (pct >= 60) return maxScore;
  if (pct >= 40) return Math.round(maxScore * 0.75);
  if (pct >= 20) return Math.round(maxScore * 0.45);
  if (pct >= 1)  return Math.round(maxScore * 0.20);
  return 0;
}

function scoreGeographicSpread(inputs: FitImpactEngineInputs, maxScore: number): number {
  const geo = inputs.sectionI.geographicDistribution;
  // v4.2 enum values: single_site, multi_site_single_country, multi_country, global
  const map: Record<string, number> = {
    global: 1.0,
    multi_country: 0.8,
    multi_site_single_country: 0.6,
    single_site: 0.2,
  };
  return Math.round(maxScore * (map[geo ?? "multi_site_single_country"] ?? 0.6));
}

function scoreSkillsFramework(inputs: FitImpactEngineInputs, maxScore: number): number {
  const status = inputs.sectionI.skillsFrameworkStatus;
  // v4.2 enum values: formal_taxonomy, informal_role_based, in_development, none, unknown
  const map: Record<string, number> = {
    formal_taxonomy: 1.0,
    informal_role_based: 0.6,
    in_development: 0.3,
    none: 0.0,
    unknown: 0.0,
  };
  return Math.round(maxScore * (map[status ?? "none"] ?? 0.0));
}

function scoreGrowthDirection(inputs: FitImpactEngineInputs, maxScore: number): number {
  const dir = inputs.sectionI.businessDirectionType;
  // v4.2 enum values: growing, transforming, optimising, defending, mixed
  const map: Record<string, number> = {
    growing: 1.0,
    transforming: 0.7,
    mixed: 0.6,
    optimising: 0.5,
    defending: 0.3,
  };
  return Math.round(maxScore * (map[dir ?? "mixed"] ?? 0.6));
}

function scoreTransformationDirection(inputs: FitImpactEngineInputs, maxScore: number): number {
  const dir = inputs.sectionI.businessDirectionType;
  // v4.2 enum values: growing, transforming, optimising, defending, mixed
  const map: Record<string, number> = {
    transforming: 1.0,
    defending: 0.9,
    mixed: 0.6,
    growing: 0.5,
    optimising: 0.4,
  };
  return Math.round(maxScore * (map[dir ?? "mixed"] ?? 0.6));
}

function scoreWeakManagerCapability(inputs: FitImpactEngineInputs, maxScore: number): number {
  const level = inputs.sectionI.managerCapabilityForInsights;
  // Inverse: weak managers = high need for this tool
  // v4.2 enum values: strong, mixed, weak, variable (lowercase)
  const map: Record<string, number> = {
    weak: 1.0,
    variable: 0.8,
    mixed: 0.5,
    strong: 0.1,
  };
  return Math.round(maxScore * (map[level ?? "mixed"] ?? 0.5));
}

function scoreHireCost(inputs: FitImpactEngineInputs, maxScore: number): number {
  const cost = inputs.sectionD.costPerExternalHire ?? 0;
  if (cost >= 15000) return maxScore;
  if (cost >= 8000) return Math.round(maxScore * 0.7);
  if (cost >= 4000) return Math.round(maxScore * 0.4);
  return Math.round(maxScore * 0.1);
}

function scoreSitesCount(inputs: FitImpactEngineInputs, maxScore: number): number {
  const sites = inputs.sectionA.ukSitesCount ?? 0;
  if (sites >= 100) return maxScore;
  if (sites >= 30) return Math.round(maxScore * 0.7);
  if (sites >= 10) return Math.round(maxScore * 0.4);
  if (sites >= 3) return Math.round(maxScore * 0.2);
  return 0;
}

function scorePivotalJobs(inputs: FitImpactEngineInputs, maxScore: number): number {
  const jobs = inputs.sectionI.pivotalJobFamilies ?? [];
  if (jobs.length >= 3) return maxScore;
  if (jobs.length >= 1) return Math.round(maxScore * 0.5);
  return 0;
}

/**
 * Scores based on current AI capability level (sectionG.aiCapabilityLevel).
 * Lower capability = higher need for capability building = higher fit score.
 * Values: none | developing | established | advanced
 */
function scoreAiCapabilityLevel(inputs: FitImpactEngineInputs, maxScore: number): number {
  const level = (inputs.sectionG as any)?.aiCapabilityLevel ?? "developing";
  const map: Record<string, number> = {
    none: 1.0,        // No AI capability — highest need
    developing: 0.85, // Building capability — high need
    established: 0.5, // Capability in place — moderate need (refresh/advance)
    advanced: 0.2,    // Strong capability — low need (advanced programme only)
  };
  return Math.round(maxScore * (map[level] ?? 0.85));
}

// ─── Evaluator registry ───────────────────────────────────────────────────────

const EVALUATORS: Record<string, (inputs: FitImpactEngineInputs, maxScore: number) => number> = {
  scoreApplicationVolume,
  scoreQueryVolume,
  scoreHireVolume,
  scoreAdminTime,
  scoreHeadcount,
  scoreDataQuality,
  scoreDigitalAccess,
  scoreAtspresent,
  scoreHrisPresent,
  scoreLmsPresent,
  scoreIntegrationMaturity,
  scoreHrisDataYears,
  scoreManagerCapability,
  scoreAttritionRate,
  scoreLDSpend,
  scoreEngagementLevel,
  scoreRevenuePresent,
  scoreInternalHireRate,
  scoreWorkforceType,
  scoreRegulation,
  scoreChangeReadiness,
  scoreEthicsCapability,
  scoreAiCapabilityLevel,
  scorePivotalJobs,
  scoreFrontlineComposition,
  scoreFrontlinePercent,
  scoreFrontlineDigitalAccess,
  scoreGeographicSpread,
  scoreSkillsFramework,
  scoreGrowthDirection,
  scoreTransformationDirection,
  scoreWeakManagerCapability,
  scoreHireCost,
  scoreSitesCount,
};

// ─── Risk flag evaluators ─────────────────────────────────────────────────────

function evaluateRiskFlags(initiative: InitiativeDefinition, inputs: FitImpactEngineInputs): string[] {
  const flags: string[] = [];
  const d = inputs.sectionD;
  const c = inputs.sectionC;

  for (const flagKey of initiative.riskFlagKeys) {
    switch (flagKey) {
      case "low_application_volume":
        if ((d.annualApplicationVolume ?? 0) < 5000) flags.push("Application volume below 5,000/year — AI screening impact may be limited.");
        break;
      case "no_ats":
        if (!c.atsSystem || c.atsSystem === "None") flags.push("No ATS in place — integration complexity will increase implementation cost.");
        break;
      case "poor_data_quality":
        if (c.dataQualityRating === "poor") flags.push("Data quality rated poor — model accuracy will be affected until data quality improves.");
        break;
      case "low_query_volume":
        if ((d.monthlyHrQueryVolume ?? 0) < 500) flags.push("Monthly HR query volume below 500 — chatbot ROI may be marginal at this scale.");
        break;
      case "poor_digital_access":
        if (c.workforceDigitalAccess === "limited") flags.push("Limited workforce digital access — adoption will require device/access investment.");
        break;
      case "no_hris":
        if (!c.hrisSystem || c.hrisSystem === "None") flags.push("No HRIS in place — chatbot will have limited self-service capability without HR data integration.");
        break;
      case "small_org":
        if ((inputs.sectionA.totalHeadcount ?? 0) < 500) flags.push("Organisation size below 500 — internal mobility platform may not reach critical mass.");
        break;
      case "low_internal_hire_rate":
        if ((d.internalHirePercent ?? 0) >= 40) flags.push("Internal hire rate already above 40% — incremental gain from marketplace may be modest.");
        break;
      case "poor_skills_data":
        if (c.dataQualityRating === "poor" || c.dataQualityRating === "fair") flags.push("Skills data quality is limited — marketplace matching accuracy will be affected.");
        break;
      case "insufficient_hris_data":
        if (normaliseHrisYears(c.yearsOfHrisData) < 2) flags.push("Less than 2 years of HRIS data — insufficient for reliable attrition prediction models.");
        break;
      case "weak_manager_capability":
        if (inputs.sectionI.managerCapabilityForInsights === "Weak") flags.push("Manager capability rated weak — intervention effectiveness will be significantly reduced.");
        break;
      case "low_attrition_rate":
        if ((d.attritionRate ?? 0) < 8) flags.push("Attrition rate below 8% — financial impact of prediction will be modest.");
        break;
      case "low_ld_spend":
        if ((d.annualLDSpend ?? 0) < 100000) flags.push("L&D spend below £100K — efficiency gains may not justify platform investment.");
        break;
      case "no_lms":
        if (!c.lmsSystem || c.lmsSystem === "None") flags.push("No LMS in place — personalisation engine will require LMS integration or replacement.");
        break;
      case "poor_change_readiness":
        if (inputs.sectionF?.changeReadiness === "resistant") flags.push("Culture rated resistant to change — adoption risk is high without change management investment.");
        break;
      case "high_engagement_already":
        if ((d.currentEngagementScore ?? 0) >= 80) flags.push("Engagement score already above 80 — uplift potential is limited.");
        break;
      case "low_hire_volume":
        if ((d.annualHires ?? 0) < 50) flags.push("Annual hire volume below 50 — automation ROI may not justify implementation cost.");
        break;
      case "complex_regulation_without_legal_review":
        if ((inputs.sectionA.sectorSpecificRegulation ?? []).length >= 2) flags.push("High regulatory complexity — AI-generated contracts must be reviewed by legal before deployment.");
        break;
      case "insufficient_hire_volume_for_statistical_significance":
        if ((d.annualHires ?? 0) < 100) flags.push("Hire volume below 100/year — bias detection may lack statistical significance.");
        break;
      case "low_ethics_capability":
        if ((inputs.sectionG?.ai_ethics_trust ?? 5) < 4) flags.push("AI ethics & trust capability rated low — governance framework must be established before deployment.");
        break;
      case "poor_calendar_integration":
        if (c.hrSystemIntegrationMaturity === "siloed" || c.hrSystemIntegrationMaturity === "none") flags.push("HR systems are siloed — calendar integration will require custom development.");
        break;
      case "brand_voice_consistency":
        flags.push("AI-generated content must be reviewed for brand voice and tone before deployment.");
        break;
      case "ai_bias_in_assessment":
        if ((inputs.sectionG?.ai_ethics_trust ?? 5) < 5) flags.push("AI ethics capability is limited — video assessment scoring must be validated for bias before go-live.");
        break;
      case "tool_adoption_risk":
        if (inputs.sectionF?.changeReadiness === "low" || inputs.sectionF?.changeReadiness === "resistant") flags.push("Low change readiness — adoption programme required to realise productivity gains.");
        break;
    }
  }

  return flags;
}

// ─── Hard gate check (v3) ────────────────────────────────────────────────────

/**
 * Resolve a dot-path like "sectionI.workforceComposition" against the engine inputs.
 * Returns undefined if any segment is missing.
 */
function resolvePath(inputs: FitImpactEngineInputs, path: string): unknown {
  const parts = path.split(".");
  let val: unknown = inputs;
  for (const part of parts) {
    if (val === null || val === undefined) return undefined;
    val = (val as Record<string, unknown>)[part];
  }
  return val;
}

/**
 * Evaluate a single v3 hard gate expression against engine inputs.
 * Returns true if the gate passes (condition is met).
 */
function evaluateHardGate(gate: HardGate, inputs: FitImpactEngineInputs): boolean {
  switch (gate.type) {
    case "field_in_array": {
      const val = resolvePath(inputs, gate.path);
      if (val === undefined || val === null) return false;
      // val may itself be an array (e.g. sectorSpecificRegulations)
      if (Array.isArray(val)) return val.some((v) => gate.values.includes(String(v)));
      return gate.values.includes(String(val));
    }
    case "field_not_in_array": {
      const val = resolvePath(inputs, gate.path);
      if (val === undefined || val === null) return true; // absent = not in array
      if (Array.isArray(val)) return !val.some((v) => gate.values.includes(String(v)));
      return !gate.values.includes(String(val));
    }
    case "field_gt": {
      const val = resolvePath(inputs, gate.path);
      if (val === undefined || val === null) return false;
      return Number(val) > gate.value;
    }
    case "field_gte": {
      const val = resolvePath(inputs, gate.path);
      if (val === undefined || val === null) return false;
      return Number(val) >= gate.value;
    }
    case "field_lt": {
      const val = resolvePath(inputs, gate.path);
      if (val === undefined || val === null) return false;
      return Number(val) < gate.value;
    }
    case "field_includes": {
      const val = resolvePath(inputs, gate.path);
      if (!Array.isArray(val)) return false;
      return val.map(String).includes(gate.value);
    }
    case "field_not_equals": {
      const val = resolvePath(inputs, gate.path);
      if (val === undefined || val === null) return true; // absent = not equals
      return String(val) !== String(gate.value);
    }
    case "field_populated": {
      const val = resolvePath(inputs, gate.path);
      if (val === undefined || val === null) return false;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === "string") return val.trim().length > 0;
      return true;
    }
    case "field_or": {
      return gate.gates.some((g) => evaluateHardGate(g, inputs));
    }
    default:
      return true; // unknown gate type: pass by default
  }
}

/**
 * Check all hard gates for an initiative.
 * v3: uses initiative.hardGates (structured expressions) if present;
 * falls back to legacy requiredSubFunctions + requiredDataFields.
 * Returns array of failure reason strings (empty = all gates passed).
 */
function checkHardGates(
  initiative: InitiativeDefinition,
  inputs: FitImpactEngineInputs
): { failures: string[]; passed: string[] } {
  const failures: string[] = [];
  const passed: string[] = [];

  // v3 path: evaluate structured HardGate expressions.
  // An empty hardGates array means "no gates — universal initiative" (all pass).
  // Use v3 path whenever hardGates is defined, regardless of length.
  if (initiative.hardGates !== undefined) {
    for (const gate of initiative.hardGates) {
      if (evaluateHardGate(gate, inputs)) {
        passed.push(gate.label);
      } else {
        failures.push(gate.label);
      }
    }
    return { failures, passed };
  }

  // Legacy path: requiredSubFunctions + requiredDataFields
  const subFunctions = inputs.sectionB?.hrSubFunctions ?? [];
  for (const required of initiative.requiredSubFunctions) {
    if (subFunctions.includes(required)) {
      passed.push(`Sub-function "${required}" in scope`);
    } else {
      failures.push(`Sub-function "${required}" not in scope for this HR team.`);
    }
  }
  for (const field of initiative.requiredDataFields) {
    const parts = field.split(".");
    let val: unknown = inputs;
    for (const part of parts) {
      val = (val as Record<string, unknown>)?.[part];
    }
    if (val === undefined || val === null) {
      const sectionDVal = (inputs.sectionD as Record<string, unknown>)[field];
      if (sectionDVal === undefined || sectionDVal === null) {
        failures.push(`Required data field "${field}" not provided.`);
      } else {
        passed.push(`Data field "${field}" provided`);
      }
    } else {
      passed.push(`Data field "${field}" provided`);
    }
  }
  return { failures, passed };
}

// ─── Fit rationale builder ────────────────────────────────────────────────────

function buildFitRationale(initiative: InitiativeDefinition, fitStatus: FitStatus, fitScore: number, inputs: FitImpactEngineInputs): string {
  if (fitStatus === "NOT_APPLICABLE" || fitStatus === "HARD_GATE_FAIL") {
    return "One or more required conditions are not met for this organisation — initiative not applicable.";
  }

  const topFactor = initiative.softFitFactors.reduce((best, factor) => {
    const evaluator = EVALUATORS[factor.evaluator];
    if (!evaluator) return best;
    const score = evaluator(inputs, factor.maxScore);
    const pct = score / factor.maxScore;
    return pct > (best.pct ?? 0) ? { label: factor.label, pct } : best;
  }, { label: "", pct: 0 });

  if (fitStatus === "STRONG_FIT") {
    return `Strong fit — ${topFactor.label} is a key driver. Soft fit score: ${fitScore}/100.`;
  }
  if (fitStatus === "POSSIBLE_FIT") {
    return `Possible fit — some conditions are met but gaps exist. Soft fit score: ${fitScore}/100.`;
  }
  return `Weak fit — most fit conditions are not met at this time. Soft fit score: ${fitScore}/100.`;
}

// ─── Confidence labelling ─────────────────────────────────────────────────────

function labelConfidence(inputs: FitImpactEngineInputs): ConfidenceLevel {
  const d = inputs.sectionD;
  const estimateCount = [
    d.adminTimePerHireIsEstimate,
    d.totalHrBudgetIsEstimate,
    d.attritionRateIsEstimate,
    d.costPerExternalHireIsEstimate,
    d.annualContractorSpendIsEstimate,
    d.annualLDSpendIsEstimate,
    d.annualRevenueIsEstimate,
  ].filter(Boolean).length;

  const cfg = INITIATIVE_CONFIG.confidence;
  if (estimateCount <= cfg.highMaxEstimateCount) return "HIGH";
  if (estimateCount <= cfg.mediumMaxEstimateCount) return "MEDIUM";
  return "LOW";
}

// ─── Main engine function ─────────────────────────────────────────────────────

export function evaluateInitiative(
  initiativeId: string,
  inputs: FitImpactEngineInputs
): InitiativeOutputCard {
  const initiative = INITIATIVE_LIBRARY.find((i) => i.id === initiativeId);
  if (!initiative) throw new Error(`Initiative "${initiativeId}" not found in library.`);

  // 1. Hard gate check (v3)
  const { failures: hardGateFailReasons, passed: hardGatesPassed } = checkHardGates(initiative, inputs);
  if (hardGateFailReasons.length > 0) {
    return {
      id: initiative.id,
      label: initiative.label,
      category: initiative.category,
      fitStatus: "NOT_APPLICABLE",
      fitScore: 0,
      fitRationale: "One or more required conditions are not met for this organisation — initiative not applicable.",
      valueRange: null,
      valueNarrative: "Value estimate not available — required conditions not met.",
      isIndicative: false,
      confidence: "LOW",
      timeToValueMonths: initiative.timeToValueMonths,
      phase: initiative.phase,
      caseStudyAnchor: initiative.caseStudyAnchor,
      riskFlags: [],
      hardGateFailReasons,
      scoredFactors: initiative.softFitFactors.map((f) => ({ key: f.key, label: f.label, score: 0, maxScore: f.maxScore })),
      hardGatesPassed,
      y1CostRange: initiative.y1CostRange,
    };
  }

  // 2. Soft fit scoring — first pass (excludes co-deployment signals)
  let fitScore = 0;
  const scoredFactors: Array<{ key: string; label: string; score: number; maxScore: number }> = [];
  for (const factor of initiative.softFitFactors) {
    // Skip co-deployment signals on first pass (resolved in second pass by evaluateAllInitiatives)
    if (factor.evaluator === "scoreCoDeployment") {
      scoredFactors.push({ key: factor.key, label: factor.label, score: 0, maxScore: factor.maxScore });
      continue;
    }
    const evaluator = EVALUATORS[factor.evaluator];
    const score = evaluator ? evaluator(inputs, factor.maxScore) : 0;
    fitScore += score;
    scoredFactors.push({ key: factor.key, label: factor.label, score, maxScore: factor.maxScore });
  }
  fitScore = Math.min(150, Math.max(0, fitScore)); // v3: cap at 150 before clamping to 100

  // 3. Fit status classification (v3 thresholds: 80/50)
  const cfg = INITIATIVE_CONFIG.fitScoring;
  let fitStatus: FitStatus;
  if (fitScore >= cfg.strongFitThreshold) {
    fitStatus = "STRONG_FIT";
  } else if (fitScore >= cfg.possibleFitThreshold) {
    fitStatus = "POSSIBLE_FIT";
  } else {
    fitStatus = "WEAK_FIT";
  }

  // 4. Value calculation
  const formulaFn = VALUE_FORMULA_REGISTRY[initiative.valueFormulaKey];
  const valueResult = formulaFn ? formulaFn(inputs) : null;

  // 5. Confidence
  const confidence = labelConfidence(inputs);

  // 6. Risk flags
  const riskFlags = evaluateRiskFlags(initiative, inputs);

  // 7. Fit rationale
  const fitRationale = buildFitRationale(initiative, fitStatus, fitScore, inputs);

  return {
    id: initiative.id,
    label: initiative.label,
    category: initiative.category,
    fitStatus,
    fitScore: Math.min(100, fitScore), // clamp to 100 for display
    fitRationale,
    valueRange: valueResult ? { low: valueResult.low, high: valueResult.high, currency: valueResult.currency } : null,
    valueNarrative: valueResult?.narrative ?? "Value estimate not available.",
    isIndicative: valueResult?.isIndicative ?? false,
    confidence,
    timeToValueMonths: initiative.timeToValueMonths,
    phase: initiative.phase,
    caseStudyAnchor: initiative.caseStudyAnchor,
    riskFlags,
    hardGateFailReasons: [],
    scoredFactors,
    hardGatesPassed,
    y1CostRange: initiative.y1CostRange,
  };
}

/**
 * Evaluate all 49 initiatives and return sorted results.
 *
 * v3 two-pass algorithm:
 *   Pass 1: evaluate all soft signals except co-deployment signals.
 *   Determine candidate set (applicable + fitScore >= possibleFitThreshold).
 *   Pass 2: add co-deployment bonuses for initiatives whose co-deployment partners
 *           are in the candidate set.
 *
 * Sort order: STRONG_FIT → POSSIBLE_FIT → WEAK_FIT → NOT_APPLICABLE, then by fitScore desc.
 */
export function evaluateAllInitiatives(inputs: FitImpactEngineInputs): InitiativeOutputCard[] {
  // Pass 1: evaluate all initiatives (co-deployment signals score 0 in first pass)
  const results = INITIATIVE_LIBRARY.map((initiative) =>
    evaluateInitiative(initiative.id, inputs)
  );

  // Build candidate set: applicable initiatives with fitScore >= possibleFitThreshold
  const possibleThreshold = INITIATIVE_CONFIG.fitScoring.possibleFitThreshold;
  const strongThreshold = INITIATIVE_CONFIG.fitScoring.strongFitThreshold;
  const candidateIds = new Set(
    results
      .filter((r) => r.fitStatus !== "NOT_APPLICABLE" && r.fitStatus !== "HARD_GATE_FAIL" && r.fitScore >= possibleThreshold)
      .map((r) => r.id)
  );

  // Pass 2: apply co-deployment bonuses
  for (const result of results) {
    if (result.fitStatus === "NOT_APPLICABLE" || result.fitStatus === "HARD_GATE_FAIL") continue;
    const initiative = INITIATIVE_LIBRARY.find((i) => i.id === result.id)!;
    let coDeployBonus = 0;
    for (const factor of initiative.softFitFactors) {
      if (factor.evaluator !== "scoreCoDeployment") continue;
      // The fieldPath for co-deployment factors encodes the partner initiative ID
      const partnerId = factor.fieldPath;
      if (candidateIds.has(partnerId)) {
        coDeployBonus += factor.maxScore;
        // Update the scored factor entry
        const sf = result.scoredFactors.find((f) => f.key === factor.key);
        if (sf) sf.score = factor.maxScore;
      }
    }
    if (coDeployBonus > 0) {
      const newScore = Math.min(100, result.fitScore + coDeployBonus);
      result.fitScore = newScore;
      // Re-classify fit status after co-deployment bonus
      if (newScore >= strongThreshold) {
        result.fitStatus = "STRONG_FIT";
      } else if (newScore >= possibleThreshold) {
        result.fitStatus = "POSSIBLE_FIT";
      } else {
        result.fitStatus = "WEAK_FIT";
      }
      result.fitRationale = buildFitRationale(initiative, result.fitStatus, newScore, inputs);
    }
  }

  const statusOrder: Record<string, number> = {
    STRONG_FIT: 0,
    POSSIBLE_FIT: 1,
    WEAK_FIT: 2,
    POOR_FIT: 2, // legacy alias
    NOT_APPLICABLE: 3,
    HARD_GATE_FAIL: 3, // legacy alias
  };

  return results.sort((a, b) => {
    const statusDiff = (statusOrder[a.fitStatus] ?? 4) - (statusOrder[b.fitStatus] ?? 4);
    if (statusDiff !== 0) return statusDiff;
    return b.fitScore - a.fitScore;
  });
}
