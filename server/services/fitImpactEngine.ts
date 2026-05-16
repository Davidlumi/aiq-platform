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

import { INITIATIVE_LIBRARY, type FitStatus, type InitiativeDefinition } from "../../shared/initiativeLibrary";
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
  const map: Record<string, number> = {
    all: 1.0,
    most: 0.75,
    some: 0.4,
    limited: 0.1,
  };
  return Math.round(maxScore * (map[access ?? "some"] ?? 0.4));
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

function scoreHrisDataYears(inputs: FitImpactEngineInputs, maxScore: number): number {
  const years = inputs.sectionC.yearsOfHrisData ?? 0;
  if (years >= 5) return maxScore;
  if (years >= 3) return Math.round(maxScore * 0.7);
  if (years >= 2) return Math.round(maxScore * 0.4);
  return 0;
}

function scoreManagerCapability(inputs: FitImpactEngineInputs, maxScore: number): number {
  const level = inputs.sectionI.managerCapabilityForInsights;
  const map: Record<string, number> = {
    Strong: 1.0,
    Mixed: 0.6,
    Variable: 0.4,
    Weak: 0.1,
  };
  return Math.round(maxScore * (map[level ?? "Mixed"] ?? 0.6));
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
  const map: Record<string, number> = {
    global: 1.0,
    multi_country: 0.8,
    uk_multi_site: 0.6,
    uk_single_site: 0.2,
  };
  return Math.round(maxScore * (map[geo ?? "uk_multi_site"] ?? 0.6));
}

function scoreSkillsFramework(inputs: FitImpactEngineInputs, maxScore: number): number {
  const status = inputs.sectionI.skillsFrameworkStatus;
  const map: Record<string, number> = {
    mature: 1.0,
    partial: 0.6,
    early: 0.3,
    none: 0.0,
  };
  return Math.round(maxScore * (map[status ?? "none"] ?? 0.0));
}

function scoreGrowthDirection(inputs: FitImpactEngineInputs, maxScore: number): number {
  const dir = inputs.sectionI.businessDirectionType;
  const map: Record<string, number> = {
    scaling: 1.0,
    steady_state: 0.6,
    transformation: 0.7,
    restructuring: 0.3,
    contraction: 0.1,
  };
  return Math.round(maxScore * (map[dir ?? "steady_state"] ?? 0.6));
}

function scoreTransformationDirection(inputs: FitImpactEngineInputs, maxScore: number): number {
  const dir = inputs.sectionI.businessDirectionType;
  const map: Record<string, number> = {
    transformation: 1.0,
    restructuring: 0.9,
    scaling: 0.6,
    steady_state: 0.4,
    contraction: 0.8,
  };
  return Math.round(maxScore * (map[dir ?? "steady_state"] ?? 0.4));
}

function scoreWeakManagerCapability(inputs: FitImpactEngineInputs, maxScore: number): number {
  const level = inputs.sectionI.managerCapabilityForInsights;
  // Inverse: weak managers = high need for this tool
  const map: Record<string, number> = {
    Weak: 1.0,
    Variable: 0.8,
    Mixed: 0.5,
    Strong: 0.1,
  };
  return Math.round(maxScore * (map[level ?? "Mixed"] ?? 0.5));
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
  scorePivotalJobs,
  scoreFrontlineComposition,
  scoreFrontlinePercent,
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
        if ((c.yearsOfHrisData ?? 0) < 2) flags.push("Less than 2 years of HRIS data — insufficient for reliable attrition prediction models.");
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

// ─── Hard gate check ──────────────────────────────────────────────────────────

function checkHardGates(initiative: InitiativeDefinition, inputs: FitImpactEngineInputs): string[] {
  const failures: string[] = [];
  const subFunctions = inputs.sectionB?.hrSubFunctions ?? [];

  for (const required of initiative.requiredSubFunctions) {
    if (!subFunctions.includes(required)) {
      failures.push(`Sub-function "${required}" not in scope for this HR team.`);
    }
  }

  for (const field of initiative.requiredDataFields) {
    const parts = field.split(".");
    let val: unknown = inputs;
    for (const part of parts) {
      val = (val as Record<string, unknown>)?.[part];
    }
    // Check sectionD directly for flat field names
    if (val === undefined || val === null) {
      const sectionDVal = (inputs.sectionD as Record<string, unknown>)[field];
      if (sectionDVal === undefined || sectionDVal === null) {
        failures.push(`Required data field "${field}" not provided in Section D.`);
      }
    }
  }

  return failures;
}

// ─── Fit rationale builder ────────────────────────────────────────────────────

function buildFitRationale(initiative: InitiativeDefinition, fitStatus: FitStatus, fitScore: number, inputs: FitImpactEngineInputs): string {
  if (fitStatus === "HARD_GATE_FAIL") return "Required sub-functions or data fields are missing — cannot evaluate fit.";

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
  return `Poor fit — most fit conditions are not met at this time. Soft fit score: ${fitScore}/100.`;
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

  // 1. Hard gate check
  const hardGateFailReasons = checkHardGates(initiative, inputs);
  if (hardGateFailReasons.length > 0) {
    return {
      id: initiative.id,
      label: initiative.label,
      category: initiative.category,
      fitStatus: "HARD_GATE_FAIL",
      fitScore: 0,
      fitRationale: "Required sub-functions or data fields are missing — cannot evaluate fit.",
      valueRange: null,
      valueNarrative: "Value estimate not available — hard gate conditions not met.",
      isIndicative: false,
      confidence: "LOW",
      timeToValueMonths: initiative.timeToValueMonths,
      phase: initiative.phase,
      caseStudyAnchor: initiative.caseStudyAnchor,
      riskFlags: [],
      hardGateFailReasons,
      scoredFactors: initiative.softFitFactors.map((f) => ({ key: f.key, label: f.label, score: 0, maxScore: f.maxScore })),
      hardGatesPassed: [],
      y1CostRange: initiative.y1CostRange,
    };
  }

  // 2. Soft fit scoring
  let fitScore = 0;
  const scoredFactors: Array<{ key: string; label: string; score: number; maxScore: number }> = [];
  for (const factor of initiative.softFitFactors) {
    const evaluator = EVALUATORS[factor.evaluator];
    const score = evaluator ? evaluator(inputs, factor.maxScore) : 0;
    fitScore += score;
    scoredFactors.push({ key: factor.key, label: factor.label, score, maxScore: factor.maxScore });
  }
  fitScore = Math.min(100, Math.max(0, fitScore));

  // 3. Fit status classification
  const cfg = INITIATIVE_CONFIG.fitScoring;
  let fitStatus: FitStatus;
  if (fitScore >= cfg.strongFitThreshold) {
    fitStatus = "STRONG_FIT";
  } else if (fitScore >= cfg.possibleFitThreshold) {
    fitStatus = "POSSIBLE_FIT";
  } else {
    fitStatus = "POOR_FIT";
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
    fitScore,
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
    hardGatesPassed: [
      ...initiative.requiredSubFunctions.map((sf) => `Sub-function "${sf}" in scope`),
      ...initiative.requiredDataFields.map((f) => `Data field "${f}" provided`),
    ],
    y1CostRange: initiative.y1CostRange,
  };
}

/**
 * Evaluate all 49 initiatives and return sorted results.
 * Sort order: STRONG_FIT → POSSIBLE_FIT → POOR_FIT → HARD_GATE_FAIL, then by fitScore desc.
 */
export function evaluateAllInitiatives(inputs: FitImpactEngineInputs): InitiativeOutputCard[] {
  const results = INITIATIVE_LIBRARY.map((initiative) =>
    evaluateInitiative(initiative.id, inputs)
  );

  const statusOrder: Record<FitStatus, number> = {
    STRONG_FIT: 0,
    POSSIBLE_FIT: 1,
    POOR_FIT: 2,
    HARD_GATE_FAIL: 3,
  };

  return results.sort((a, b) => {
    const statusDiff = statusOrder[a.fitStatus] - statusOrder[b.fitStatus];
    if (statusDiff !== 0) return statusDiff;
    return b.fitScore - a.fitScore;
  });
}
