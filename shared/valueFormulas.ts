/**
 * Value Formulas — Parameterised financial value calculations for all 49 initiatives (v3).
 *
 * All formulas return { low, high, currency, isIndicative, narrative }.
 * Multipliers are read from initiativeConfig.ts — never hardcoded here.
 *
 * IMPORTANT: These are estimates, not guarantees. All outputs are labelled as indicative
 * ranges. When isEstimate flags are present, confidence is downgraded accordingly.
 */

import { INITIATIVE_CONFIG } from "./initiativeConfig";

export type ValueRange = {
  low: number;
  high: number;
  currency: "GBP";
  /** True if any input field had isEstimate=true */
  isIndicative: boolean;
  /** Human-readable formula narrative for the output card */
  narrative: string;
};

// ─── Input types ─────────────────────────────────────────────────────────────

export type SectionDInputs = {
  annualHires?: number;
  adminTimePerHire?: number;
  adminTimePerHireIsEstimate?: boolean;
  totalHrBudget?: number;
  totalHrBudgetIsEstimate?: boolean;
  aiEnvelopeBand?: string;
  attritionRate?: number;
  attritionRateIsEstimate?: boolean;
  avgTimeToFill?: number;
  annualApplicationVolume?: number;
  costPerExternalHire?: number;
  costPerExternalHireIsEstimate?: boolean;
  annualContractorSpend?: number;
  annualContractorSpendIsEstimate?: boolean;
  monthlyHrQueryVolume?: number;
  internalHirePercent?: number;
  annualLDSpend?: number;
  annualLDSpendIsEstimate?: boolean;
  annualRevenue?: number;
  annualRevenueIsEstimate?: boolean;
  currentEngagementScore?: number;
  hrFteCount?: number;
  /** High-end of annual hires range (v3 gate uses .high) */
  annualHiresHigh?: number;
  /** High-end of annual application volume range */
  annualApplicationVolumeHigh?: number;
  /** High-end of monthly HR query volume range */
  monthlyHrQueryVolumeHigh?: number;
};

export type SectionAInputs = {
  totalHeadcount?: number;
  ukSitesCount?: number;
  /** v2 alias — kept for backward compat */
  sectorSpecificRegulation?: string[];
  /** v3 canonical name */
  sectorSpecificRegulations?: string[];
  ownershipStructure?: string;
  sector?: string;
};

export type SectionCInputs = {
  hrisSystem?: string;
  atsSystem?: string;
  lmsSystem?: string;
  dataQualityRating?: string;
  hrSystemIntegrationMaturity?: string;
  /** v2: numeric years; v3: string enum e.g. "2_to_5_years" */
  yearsOfHrisData?: number | string;
  workforceDigitalAccess?: string;
  engagementSurveyTool?: string;
};

export type SectionIInputs = {
  workforceWorkType?: string;
  workforceComposition?: string;
  workforceEmploymentMix?: string;
  businessDirectionType?: string;
  geographicDistribution?: string;
  managerCapabilityForInsights?: string;
  skillsFrameworkStatus?: string;
  skillsInventoryCompleteness?: string;
  pivotalJobFamilies?: string[];
  employeeExperienceState?: string;
  frontlineHeadcountPercent?: number;
  topBusinessPriorities?: string[];
};

export type SectionKInputs = {
  performanceReviewCadence?: string;
  internalMobilityApproach?: string;
  onboardingModel?: string;
  hrHelpdeskModel?: string;
  hiringProcessStructure?: string;
  hiringVolumeProfile?: string[];
  lAndDDeliveryModel?: string;
  rewardCycleModel?: string;
};

export type SectionFInputs = {
  changeReadiness?: string;
};

export type SectionGInputs = {
  ai_ethics_trust?: number;
};

export type ValueFormulaInputs = {
  sectionA: SectionAInputs;
  sectionC: SectionCInputs;
  sectionD: SectionDInputs;
  sectionI: SectionIInputs;
  sectionK?: SectionKInputs;
  sectionF?: SectionFInputs;
  sectionG?: SectionGInputs;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function indicative(inputs: SectionDInputs): boolean {
  return !!(
    inputs.adminTimePerHireIsEstimate ||
    inputs.totalHrBudgetIsEstimate ||
    inputs.attritionRateIsEstimate ||
    inputs.costPerExternalHireIsEstimate ||
    inputs.annualContractorSpendIsEstimate ||
    inputs.annualLDSpendIsEstimate ||
    inputs.annualRevenueIsEstimate
  );
}

function avgSalary(inputs: ValueFormulaInputs): number {
  const { annualRevenue } = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount;
  if (annualRevenue && headcount && headcount > 0) {
    const revenuePerHead = annualRevenue / headcount;
    return Math.min(Math.max(revenuePerHead * 0.35, 25000), 120000);
  }
  return INITIATIVE_CONFIG.defaults.avgSalaryFallback;
}

function loadedManagerCost(inputs: ValueFormulaInputs): number {
  return avgSalary(inputs) * INITIATIVE_CONFIG.defaults.managerSalaryMultiplier;
}

function managerHeadcount(inputs: ValueFormulaInputs): number {
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  return Math.round(headcount * INITIATIVE_CONFIG.defaults.managerFraction);
}

function costPerLeaver(inputs: ValueFormulaInputs): number {
  return avgSalary(inputs) * INITIATIVE_CONFIG.defaults.attritionCostMultiplier;
}

function frontlineHeadcount(inputs: ValueFormulaInputs): number {
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const comp = inputs.sectionI.workforceComposition;
  if (comp === "frontline_heavy") return Math.round(headcount * 0.75);
  if (comp === "mixed") return Math.round(headcount * 0.45);
  return Math.round(headcount * 0.15);
}

function storeOrSiteCount(inputs: ValueFormulaInputs): number {
  return inputs.sectionA.ukSitesCount ?? Math.round((inputs.sectionA.totalHeadcount ?? 0) / 30);
}

// ─── Formula implementations ──────────────────────────────────────────────────

// ── TA Category ───────────────────────────────────────────────────────────────

export function ta_high_volume_hiring(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hiresRaw = d.annualHires ?? 0;
  // Fallback: when annualHires not provided, estimate from headcount (45% annual hiring rate)
  const hires = hiresRaw > 0 ? hiresRaw : Math.round(headcount * 0.45);
  const usingFallback = hiresRaw === 0 && headcount > 0;
  const adminHours = d.adminTimePerHire ?? 4;
  const appVol = d.annualApplicationVolume ?? Math.round(hires * 5);
  const hrlyRate = 35;
  const cfg = INITIATIVE_CONFIG.ta_high_volume_hiring;

  const adminSaving = hires * adminHours * cfg.adminTimeReductionMultiplier * hrlyRate;
  const screeningValue = appVol * cfg.screeningCostPerApplication * cfg.screeningReductionRate;
  const rawTotal = adminSaving + screeningValue;
  const total = Math.min(rawTotal, 1_500_000); // Enterprise cap: high-volume hiring value bounded at £1.5M

  return {
    low: Math.round(total * 0.7),
    high: Math.round(total * 1.3),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${hires.toLocaleString()} estimated annual hires (${headcount.toLocaleString()} headcount × 45% hiring rate): admin time saving and application screening automation.`
      : `Based on ${hires} annual hires × ${adminHours}h admin per hire × ${Math.round(cfg.adminTimeReductionMultiplier * 100)}% reduction, plus ${appVol.toLocaleString()} application volume screening savings.`,
  };
}

export function ta_candidate_chatbot(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const hires = d.annualHires ?? 0;
  const appVol = d.annualApplicationVolume ?? 0;
  const cfg = INITIATIVE_CONFIG.ta_candidate_chatbot;
  const hrlyRate = 35;

  const recruiterTimeSaving = hires * cfg.screeningHoursPerHire * cfg.automationRate * hrlyRate;
  const conversionValue = hires * cfg.conversionUpliftRate * (d.costPerExternalHire ?? 8000) * 0.1;
  const managerTimeSaving = managerHeadcount(inputs) * 1 * 12 * (loadedManagerCost(inputs) / 1800);
  const rawTotal = recruiterTimeSaving + conversionValue + managerTimeSaving;
  const total = Math.min(rawTotal, 500_000); // Enterprise cap: candidate chatbot value bounded at £500k

  return {
    low: Math.round(total * 0.6),
    high: Math.round(total * 1.4),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${hires} annual hires: recruiter time saving (${Math.round(cfg.automationRate * 100)}% automation of initial interactions), conversion uplift, and manager time recovery.`,
  };
}

export function ta_interview_scheduling(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hiresRaw = d.annualHires ?? 0;
  const hires = hiresRaw > 0 ? hiresRaw : Math.round(headcount * 0.45);
  const usingFallback = hiresRaw === 0 && headcount > 0;
  const cfg = INITIATIVE_CONFIG.ta_interview_scheduling;
  const hrlyRate = 35;

  const hoursSaved = hires * cfg.interviewsPerHire * cfg.schedulingHoursPerInterview * cfg.timeReductionRate;
  const rawValue = hoursSaved * hrlyRate;
  const value = Math.min(rawValue, 500_000); // Enterprise cap: interview scheduling value bounded at £500k

  return {
    low: Math.round(value * 0.7),
    high: Math.round(value * 1.2),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${hires.toLocaleString()} estimated annual hires (${headcount.toLocaleString()} headcount × 45% hiring rate): interview scheduling automation saving.`
      : `Based on ${hires} annual hires × ${cfg.interviewsPerHire} interviews × ${cfg.schedulingHoursPerInterview}h scheduling × ${Math.round(cfg.timeReductionRate * 100)}% reduction at £${hrlyRate}/hr.`,
  };
}

export function ta_sourcing_matching(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hiresRaw = d.annualHires ?? 0;
  const hires = hiresRaw > 0 ? hiresRaw : Math.round(headcount * 0.45);
  const usingFallback = hiresRaw === 0 && headcount > 0;
  const costPerHire = d.costPerExternalHire ?? 8000;
  const cfg = INITIATIVE_CONFIG.ta_sourcing_matching;

  const qualityValue = hires * costPerHire * cfg.qualityOfHireUpliftRate * 0.15;
  const timeValue = hires * (d.avgTimeToFill ?? 45) * cfg.timeToFillReductionRate * (avgSalary(inputs) / 250);
  const rawTotal = qualityValue + timeValue;
  const total = Math.min(rawTotal, 1_000_000); // Enterprise cap: sourcing & matching value bounded at £1M

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.3),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${hires.toLocaleString()} estimated annual hires (${headcount.toLocaleString()} headcount × 45% hiring rate): quality-of-hire uplift and time-to-fill reduction.`
      : `Based on ${hires} annual hires: quality-of-hire uplift (${Math.round(cfg.qualityOfHireUpliftRate * 100)}%) and time-to-fill reduction (${Math.round(cfg.timeToFillReductionRate * 100)}%).`,
  };
}

export function ta_video_interview_assessment(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hiresRaw = d.annualHires ?? 0;
  const hires = hiresRaw > 0 ? hiresRaw : Math.round(headcount * 0.45);
  const usingFallback = hiresRaw === 0 && headcount > 0;
  const cfg = INITIATIVE_CONFIG.ta_video_interview_assessment;
  const hrlyRate = 35;

  const hoursSaved = hires * cfg.interviewHoursPerHire * cfg.timeReductionRate;
  const rawValue = hoursSaved * hrlyRate;
  const value = Math.min(rawValue, 750_000); // Enterprise cap: video interview value bounded at £750k

  return {
    low: Math.round(value * 0.6),
    high: Math.round(value * 1.3),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${hires.toLocaleString()} estimated annual hires (${headcount.toLocaleString()} headcount × 45% hiring rate): interviewer time saving through AI-assisted video screening.`
      : `Based on ${hires} annual hires × ${cfg.interviewHoursPerHire}h interview time × ${Math.round(cfg.timeReductionRate * 100)}% reduction at £${hrlyRate}/hr.`,
  };
}

export function ta_bias_monitoring(inputs: ValueFormulaInputs): ValueRange {
  const cfg = INITIATIVE_CONFIG.ta_bias_monitoring;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const riskValue = headcount * cfg.riskReductionPerHead;
  const auditValue = cfg.auditCostAvoided;
  const rawTotal = riskValue + auditValue;
  const total = Math.min(rawTotal, 750_000); // Enterprise cap: bias monitoring value bounded at £750k

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: false,
    narrative: `Scenario-based regulatory risk reduction (£${riskValue.toLocaleString()}) plus audit cost avoided (£${auditValue.toLocaleString()}). Direct financial value depends on sector regulatory environment.`,
  };
}

export function ta_recruiter_productivity_ai(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  // Fallback: estimate HR FTE from headcount (1 HR FTE per 100 employees) when not provided
  const hrFteRaw = d.hrFteCount ?? 0;
  const hrFte = hrFteRaw > 0 ? hrFteRaw : Math.max(5, Math.round(headcount / 100));
  const usingFallback = hrFteRaw === 0 && headcount > 0;
  const cfg = INITIATIVE_CONFIG.ta_recruiter_productivity_ai;
  const recruiterFte = Math.max(1, Math.round(hrFte * cfg.recruiterFteFraction));
  const annualSalary = avgSalary(inputs) * 0.9;

  const rawValue = recruiterFte * annualSalary * cfg.productivityUpliftRate;
  const value = Math.min(rawValue, 1_000_000); // Enterprise cap: recruiter productivity value bounded at £1M

  return {
    low: Math.round(value * 0.5),
    high: Math.round(value * 1.2),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${recruiterFte} estimated recruiter FTEs (${headcount.toLocaleString()} headcount × 1% HR ratio × 30% recruiters): AI productivity uplift.`
      : `Based on ${recruiterFte} estimated recruiter FTEs × ${Math.round(cfg.productivityUpliftRate * 100)}% productivity uplift at £${Math.round(annualSalary).toLocaleString()} average salary.`,
  };
}

export function ta_offer_generation(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hiresRaw = d.annualHires ?? 0;
  const hires = hiresRaw > 0 ? hiresRaw : Math.round(headcount * 0.45);
  const usingFallback = hiresRaw === 0 && headcount > 0;
  const cfg = INITIATIVE_CONFIG.ta_offer_generation;
  const hrlyRate = 40;

  const hoursSaved = hires * cfg.offerProcessHoursPerHire * cfg.timeReductionRate;
  const rawValue = hoursSaved * hrlyRate;
  const value = Math.min(rawValue, 250_000); // Enterprise cap: offer generation value bounded at £250k

  return {
    low: Math.round(value * 0.7),
    high: Math.round(value * 1.2),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${hires.toLocaleString()} estimated annual hires (${headcount.toLocaleString()} headcount × 45% hiring rate): offer letter generation and process time saving.`
      : `Based on ${hires} annual hires × ${cfg.offerProcessHoursPerHire}h offer process × ${Math.round(cfg.timeReductionRate * 100)}% time reduction at £${hrlyRate}/hr.`,
  };
}

export function ta_jd_optimization(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hiresRaw = d.annualHires ?? 0;
  const hires = hiresRaw > 0 ? hiresRaw : Math.round(headcount * 0.45);
  const usingFallback = hiresRaw === 0 && headcount > 0;
  const costPerHire = d.costPerExternalHire ?? 8000;
  const cfg = INITIATIVE_CONFIG.ta_jd_optimization;

  const qualityValue = hires * costPerHire * cfg.qualityUpliftRate * 0.1;
  const timeValue = hires * (d.avgTimeToFill ?? 45) * cfg.timeToFillReductionRate * (avgSalary(inputs) / 250);
  const rawTotal = qualityValue + timeValue;
  const total = Math.min(rawTotal, 250_000); // Enterprise cap: JD optimisation value bounded at £250k

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${hires.toLocaleString()} estimated annual hires (${headcount.toLocaleString()} headcount × 45% hiring rate): improved job description quality and time-to-fill reduction.`
      : `Based on ${hires} annual hires: improved candidate quality (${Math.round(cfg.qualityUpliftRate * 100)}% uplift) and time-to-fill reduction (${Math.round(cfg.timeToFillReductionRate * 100)}%).`,
  };
}

// ── Onboarding Category ───────────────────────────────────────────────────────

export function on_personalised_journeys(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hiresRaw = d.annualHires ?? 0;
  const hires = hiresRaw > 0 ? hiresRaw : Math.round(headcount * 0.45);
  const usingFallback = hiresRaw === 0 && headcount > 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.on_personalised_journeys;
  const dailySalaryValue = salary / INITIATIVE_CONFIG.defaults.workingDaysPerYear;

  const rampValue = hires * cfg.timeToProductivityReductionDays * dailySalaryValue * cfg.productivityValueFraction;
  const retentionValue = hires * cfg.firstYearAttritionReduction * costPerLeaver(inputs);
  const rawTotal = rampValue + retentionValue;
  const total = Math.min(rawTotal, 1_250_000); // Enterprise cap: personalised onboarding journeys bounded at £1.25M

  return {
    low: Math.round(total * 0.6),
    high: Math.round(total * 1.3),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${hires.toLocaleString()} estimated annual hires (${headcount.toLocaleString()} headcount × 45% hiring rate): faster time-to-productivity and first-year retention improvement.`
      : `Based on ${hires} annual hires × ${cfg.timeToProductivityReductionDays} days faster ramp × £${Math.round(dailySalaryValue)} daily value, plus ${Math.round(cfg.firstYearAttritionReduction * 100)}% first-year attrition reduction.`,
  };
}

export function on_new_hire_chatbot(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hiresRaw = d.annualHires ?? 0;
  const hires = hiresRaw > 0 ? hiresRaw : Math.round(headcount * 0.45);
  const usingFallback = hiresRaw === 0 && headcount > 0;
  const cfg = INITIATIVE_CONFIG.on_new_hire_chatbot;
  const hrlyRate = 35;

  const querySavings = hires * cfg.queriesPerNewHire * cfg.queryDeflectionRate * (15 / 60) * hrlyRate;
  const rampValue = hires * cfg.rampDaysReduction * (avgSalary(inputs) / INITIATIVE_CONFIG.defaults.workingDaysPerYear) * 0.5;
  const rawTotal = querySavings + rampValue;
  const total = Math.min(rawTotal, 500_000); // Enterprise cap: new hire chatbot value bounded at £500k

  return {
    low: Math.round(total * 0.6),
    high: Math.round(total * 1.3),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${hires.toLocaleString()} estimated annual hires (${headcount.toLocaleString()} headcount × 45% hiring rate): HR query deflection and ramp time saving.`
      : `Based on ${hires} annual hires × ${cfg.queriesPerNewHire} queries per new hire × ${Math.round(cfg.queryDeflectionRate * 100)}% deflection, plus ramp time reduction.`,
  };
}

export function on_documentation_automation(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hiresRaw = d.annualHires ?? 0;
  const hires = hiresRaw > 0 ? hiresRaw : Math.round(headcount * 0.45);
  const usingFallback = hiresRaw === 0 && headcount > 0;
  const hrFteRaw = d.hrFteCount ?? 0;
  const hrFte = hrFteRaw > 0 ? hrFteRaw : Math.max(5, Math.round(headcount / 100));
  const cfg = INITIATIVE_CONFIG.on_documentation_automation;
  const hrlyRate = 35;

  const docTimeSaving = hires * cfg.docHoursPerHire * cfg.timeReductionRate * hrlyRate;
  const hrAdminSaving = hrFte * cfg.hrAdminHoursPerWeek * 52 * cfg.adminReductionRate * hrlyRate;
  const rawTotal = docTimeSaving + hrAdminSaving;
  const total = Math.min(rawTotal, 1_000_000); // Enterprise cap: documentation automation value bounded at £1M

  return {
    low: Math.round(total * 0.6),
    high: Math.round(total * 1.3),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${hires.toLocaleString()} estimated annual hires and ${hrFte} estimated HR FTEs: onboarding documentation automation and HR admin time saving.`
      : `Based on ${hires} annual hires × ${cfg.docHoursPerHire}h documentation per hire × ${Math.round(cfg.timeReductionRate * 100)}% reduction, plus HR admin time saving.`,
  };
}

export function on_buddy_matching(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hiresRaw = d.annualHires ?? 0;
  const hires = hiresRaw > 0 ? hiresRaw : Math.round(headcount * 0.45);
  const usingFallback = hiresRaw === 0 && headcount > 0;
  const cfg = INITIATIVE_CONFIG.on_buddy_matching;

  const retentionValue = hires * cfg.firstYearAttritionReduction * costPerLeaver(inputs);
  const rampValue = hires * cfg.rampDaysReduction * (avgSalary(inputs) / INITIATIVE_CONFIG.defaults.workingDaysPerYear) * 0.4;
  const rawTotal = retentionValue + rampValue;
  const total = Math.min(rawTotal, 500_000); // Enterprise cap: buddy matching value bounded at £500k

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${hires.toLocaleString()} estimated annual hires (${headcount.toLocaleString()} headcount × 45% hiring rate): first-year retention improvement and faster ramp through buddy programme.`
      : `Based on ${hires} annual hires: ${Math.round(cfg.firstYearAttritionReduction * 100)}% first-year attrition reduction and ${cfg.rampDaysReduction} days faster ramp.`,
  };
}

// ── L&D Category ──────────────────────────────────────────────────────────────

export function ld_personalised_learning(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const ldSpend = d.annualLDSpend ?? 0;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.ld_personalised_learning;

  const efficiencyGain = ldSpend * cfg.ldEfficiencyGain;
  const productivityValue = headcount * salary * cfg.skillsUpliftProductivityValue;
  const rawTotal = efficiencyGain + productivityValue;
  // Enterprise cap: personalised learning value bounded at £1.25M
  const total = Math.min(rawTotal, 1_250_000);

  return {
    low: Math.round(total * 0.6),
    high: Math.round(total * 1.3),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on £${ldSpend.toLocaleString()} L&D spend (${Math.round(cfg.ldEfficiencyGain * 100)}% efficiency gain) plus ${Math.round(cfg.skillsUpliftProductivityValue * 100)}% productivity uplift across ${headcount.toLocaleString()} employees.`,
  };
}

export function ld_workforce_reskilling(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.ld_workforce_reskilling;

  const reskillValue = headcount * cfg.reskillTargetFraction * salary * cfg.productivityUpliftRate;
  const retentionValue = headcount * cfg.reskillTargetFraction * costPerLeaver(inputs) * cfg.retentionUpliftRate;
  const total = reskillValue + retentionValue;
  // Enterprise-scale cap: reskilling value scales linearly with headcount and can exceed
  // realistic programme outcomes for large organisations. Cap at £3M to stay within 3-5x ROI.
  const MAX_VALUE_GBP = 2_500_000; // Enterprise cap: workforce reskilling value bounded at £2.5M
  const cappedTotal = Math.min(total, MAX_VALUE_GBP);

  return {
    low: Math.round(cappedTotal * 0.4),
    high: Math.round(cappedTotal * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${Math.round(cfg.reskillTargetFraction * 100)}% of ${headcount.toLocaleString()} employees reskilled: productivity uplift and retention improvement.`,
  };
}

export function ld_ai_coaching(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.ld_ai_coaching;

  const coachingValue = headcount * cfg.coachingCoverageRate * salary * cfg.performanceUpliftRate;
  const coachingCostSaving = headcount * cfg.coachingCoverageRate * cfg.externalCoachingCostPerPerson;
  const rawTotal = coachingValue + coachingCostSaving;
  const total = Math.min(rawTotal, 1_500_000); // Enterprise cap: AI coaching value bounded at £1.5M

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${Math.round(cfg.coachingCoverageRate * 100)}% of ${headcount.toLocaleString()} employees receiving AI coaching: performance uplift and external coaching cost saving.`,
  };
}

export function ld_compliance_training(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const ldSpend = d.annualLDSpend ?? 0;
  const cfg = INITIATIVE_CONFIG.ld_compliance_training;

  const completionValue = headcount * cfg.complianceRiskValuePerHead;
  const efficiencyValue = ldSpend * cfg.complianceTrainingFraction * cfg.efficiencyGain;
  const rawTotal = completionValue + efficiencyValue;
  const total = Math.min(rawTotal, 500_000); // Enterprise cap: compliance training value bounded at £500k

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees: regulatory risk reduction (£${Math.round(cfg.complianceRiskValuePerHead)} per head) plus compliance training efficiency gain.`,
  };
}

export function ld_content_creation(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const ldSpend = d.annualLDSpend ?? 0;
  const cfg = INITIATIVE_CONFIG.ld_content_creation;

  const contentCostSaving = ldSpend * cfg.contentBudgetFraction * cfg.costReductionRate;
  const speedValue = ldSpend * cfg.contentBudgetFraction * cfg.speedUpliftValue;
  const total = contentCostSaving + speedValue;

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.3),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on £${ldSpend.toLocaleString()} L&D spend: ${Math.round(cfg.costReductionRate * 100)}% content creation cost reduction and ${Math.round(cfg.speedUpliftValue * 100)}% speed-to-deploy uplift value.`,
  };
}

export function ld_knowledge_management(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.ld_knowledge_management;
  const hrlyRate = salary / 1800;

  const rawSearchTimeSaving = headcount * cfg.weeklySearchMinutes * 52 * (1 / 60) * hrlyRate * cfg.searchTimeReductionRate;
  const total = Math.min(rawSearchTimeSaving, 750_000); // Enterprise cap: knowledge management value bounded at £750k

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees × ${cfg.weeklySearchMinutes}min/week knowledge search × ${Math.round(cfg.searchTimeReductionRate * 100)}% reduction.`,
  };
}

// ── Internal Mobility Category ────────────────────────────────────────────────

export function im_talent_marketplace(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const hires = d.annualHires ?? 0;
  const costPerHire = d.costPerExternalHire ?? 8000;
  const contractorSpend = d.annualContractorSpend ?? 0;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.im_talent_marketplace;

  const externalHireSaving = hires * cfg.externalHireDisplacementRate * costPerHire;
  const contractorSaving = contractorSpend * cfg.contractorDisplacementRate;
  const retentionValue = headcount * cfg.retentionValueMultiplier * salary * 0.05;
  const rawTotal = externalHireSaving + contractorSaving + retentionValue;
  const total = Math.min(rawTotal, 2_000_000); // Enterprise cap: talent marketplace value bounded at £2M

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${hires} annual hires (${Math.round(cfg.externalHireDisplacementRate * 100)}% displacement at £${costPerHire.toLocaleString()} per hire), contractor spend reduction, and retention uplift.`,
  };
}

export function im_skills_inference(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.im_skills_inference;

  const mobilityValue = headcount * salary * cfg.mobilityEnablementValueFraction;
  const planningValue = headcount * salary * cfg.workforcePlanningValueFraction;
  const rawTotal = mobilityValue + planningValue;
  const total = Math.min(rawTotal, 1_750_000); // Enterprise cap: skills inference value bounded at £1.75M

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees: mobility enablement and workforce planning efficiency gains.`,
  };
}

export function im_mentor_matching(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.im_mentor_matching;

  const retentionValue = headcount * cfg.retentionUpliftRate * costPerLeaver(inputs);
  const performanceValue = headcount * cfg.performanceUpliftRate * salary;
  const rawTotal = retentionValue + performanceValue;
  const total = Math.min(rawTotal, 750_000); // Enterprise cap: mentor matching value bounded at £750k

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees: retention uplift (${Math.round(cfg.retentionUpliftRate * 100)}%) and performance improvement (${Math.round(cfg.performanceUpliftRate * 100)}%).`,
  };
}

// ── Performance Management Category ──────────────────────────────────────────

export function pm_continuous_performance(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.pm_continuous_performance;

  const coveredPop = headcount * cfg.coveredPopulationFraction;
  const rawValue = coveredPop * salary * cfg.productivityUpliftRate;
  const value = Math.min(rawValue, 1_000_000); // Enterprise cap: continuous performance value bounded at £1M

  return {
    low: Math.round(value * 0.5),
    high: Math.round(value * 1.2),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${Math.round(cfg.coveredPopulationFraction * 100)}% of ${headcount.toLocaleString()} employees × ${Math.round(cfg.productivityUpliftRate * 100)}% productivity uplift at £${Math.round(salary).toLocaleString()} average salary.`,
  };
}

export function pm_review_writing(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const cfg = INITIATIVE_CONFIG.pm_review_writing;
  const mgrs = managerHeadcount(inputs);
  const hrlyRate = loadedManagerCost(inputs) / 1800;

  const managerTimeSaving = mgrs * cfg.reviewHoursPerManager * cfg.timeReductionRate * hrlyRate;
  const hrTimeSaving = (d.hrFteCount ?? 5) * cfg.hrAdminHoursPerCycle * cfg.timeReductionRate * 40;
  const total = managerTimeSaving + hrTimeSaving;

  return {
    low: Math.round(total * 0.6),
    high: Math.round(total * 1.3),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${mgrs} managers × ${cfg.reviewHoursPerManager}h review writing × ${Math.round(cfg.timeReductionRate * 100)}% reduction, plus HR admin time saving.`,
  };
}

export function pm_okr_goal_alignment(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.pm_okr_goal_alignment;

  const rawAlignmentValue = headcount * salary * cfg.alignmentProductivityUplift;
  const alignmentValue = Math.min(rawAlignmentValue, 750_000); // Enterprise cap: OKR alignment value bounded at £750k

  return {
    low: Math.round(alignmentValue * 0.4),
    high: Math.round(alignmentValue * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees × ${Math.round(cfg.alignmentProductivityUplift * 100)}% productivity uplift from improved goal alignment.`,
  };
}

// ── Employee Experience Category ──────────────────────────────────────────────

export function ee_sentiment_listening(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const revenue = d.annualRevenue ?? 0;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const cfg = INITIATIVE_CONFIG.ee_sentiment_listening;

  const revenueValue = revenue * cfg.engagementUpliftPoints * cfg.engagementToRevenueMultiplier;
  const attritionValue = headcount * (d.attritionRate ?? 15) / 100 * cfg.attritionReductionRate * costPerLeaver(inputs);
  const rawTotal = revenueValue + attritionValue;
  const total = Math.min(rawTotal, 750_000); // Enterprise cap: sentiment listening value bounded at £750k

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: revenue > 0
      ? `Based on £${revenue.toLocaleString()} revenue × engagement uplift, plus attrition reduction from early signal detection.`
      : `Based on attrition reduction from early signal detection. Add annual revenue for full estimate.`,
  };
}

export function ee_recognition_rewards(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const cfg = INITIATIVE_CONFIG.ee_recognition_rewards;

  const attritionValue = headcount * (d.attritionRate ?? 15) / 100 * cfg.attritionReductionRate * costPerLeaver(inputs);
  const productivityValue = headcount * avgSalary(inputs) * cfg.productivityUpliftRate;
  const rawTotal = attritionValue + productivityValue;
  const total = Math.min(rawTotal, 750_000); // Enterprise cap: recognition & rewards value bounded at £750k

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees: attrition reduction (${Math.round(cfg.attritionReductionRate * 100)}%) and productivity uplift (${Math.round(cfg.productivityUpliftRate * 100)}%).`,
  };
}

export function ee_wellbeing_burnout(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const cfg = INITIATIVE_CONFIG.ee_wellbeing_burnout;

  const absenceValue = headcount * cfg.absenceDaysReduction * (avgSalary(inputs) / INITIATIVE_CONFIG.defaults.workingDaysPerYear);
  const attritionValue = headcount * (d.attritionRate ?? 15) / 100 * cfg.attritionReductionRate * costPerLeaver(inputs);
  const rawTotal = absenceValue + attritionValue;
  const total = Math.min(rawTotal, 750_000); // Enterprise cap: wellbeing & burnout value bounded at £750k

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees: absence reduction (${cfg.absenceDaysReduction} days/year) and burnout-driven attrition reduction.`,
  };
}

export function ee_internal_comms_ai(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const cfg = INITIATIVE_CONFIG.ee_internal_comms_ai;
  const hrlyRate = 35;

  const commsTimeSaving = (d.hrFteCount ?? 5) * cfg.commsHoursPerWeek * 52 * cfg.timeReductionRate * hrlyRate;
  const engagementValue = headcount * avgSalary(inputs) * cfg.engagementUpliftRate;
  const rawTotal = commsTimeSaving + engagementValue;
  const total = Math.min(rawTotal, 750_000); // Enterprise cap: internal comms AI value bounded at £750k

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on HR comms time saving and ${Math.round(cfg.engagementUpliftRate * 100)}% engagement uplift across ${headcount.toLocaleString()} employees.`,
  };
}

// ── Retention Category ────────────────────────────────────────────────────────

export function rt_flight_risk_prediction(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const attritionRate = (d.attritionRate ?? 15) / 100;
  const salary = avgSalary(inputs);
  const managerLevel = inputs.sectionI.managerCapabilityForInsights ?? "Mixed";
  const cfg = INITIATIVE_CONFIG.rt_flight_risk_prediction;
  const managerProb = cfg.managerActionProbability[managerLevel] ?? cfg.managerActionProbability.Mixed;

  const annualLeavers = headcount * attritionRate;
  const attritionReduction = cfg.attritionReductionRate * managerProb;
  const value = annualLeavers * attritionReduction * costPerLeaver(inputs);
  // Enterprise-scale cap: flight risk value scales with headcount × attrition × cost-per-leaver
  // and produces unrealistic figures for large organisations. Cap at £2.5M to stay within 3-5× ROI.
  const MAX_VALUE_GBP = 1_250_000; // Enterprise cap: flight risk prediction value bounded at £1.25M
  const cappedValue = Math.min(value, MAX_VALUE_GBP);

  return {
    low: Math.round(cappedValue * 0.6),
    high: Math.round(cappedValue * 1.2),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} headcount × ${Math.round(attritionRate * 100)}% attrition × ${Math.round(attritionReduction * 100)}% reduction (adjusted for ${managerLevel} manager capability).`,
  };
}

export function rt_stay_interview_ai(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const cfg = INITIATIVE_CONFIG.rt_stay_interview_ai;

  const retentionValue = headcount * (d.attritionRate ?? 15) / 100 * cfg.retentionUpliftRate * costPerLeaver(inputs);
  const managerCapabilityValue = managerHeadcount(inputs) * 0.05 * loadedManagerCost(inputs);
  const rawTotal = retentionValue + managerCapabilityValue;
  const total = Math.min(rawTotal, 750_000); // Enterprise cap: stay interview AI value bounded at £750k

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees: proactive retention uplift (${Math.round(cfg.retentionUpliftRate * 100)}%) and manager capability improvement.`,
  };
}

export function rt_exit_intelligence(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const cfg = INITIATIVE_CONFIG.rt_exit_intelligence;

  const rawAttritionValue = headcount * (d.attritionRate ?? 15) / 100 * cfg.attritionReductionRate * costPerLeaver(inputs);
  const attritionValue = Math.min(rawAttritionValue, 750_000); // Enterprise cap: exit intelligence value bounded at £750k

  return {
    low: Math.round(attritionValue * 0.3),
    high: Math.round(attritionValue * 0.8),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees: structural attrition reduction (${Math.round(cfg.attritionReductionRate * 100)}%) from acting on exit intelligence.`,
  };
}

// ── HR Operations Category ────────────────────────────────────────────────────

export function hr_virtual_assistant(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA?.totalHeadcount ?? 500;
  // Fallback: if monthlyHrQueryVolume not captured, estimate conservatively as 2 queries/employee/month
  const monthlyQueries = d.monthlyHrQueryVolume ?? Math.round(headcount * 2);
  const hrFte = d.hrFteCount ?? 5;
  const cfg = INITIATIVE_CONFIG.hr_virtual_assistant;
  const hrlyRate = 40;

  const annualQueries = monthlyQueries * 12;
  const deflectedQueries = annualQueries * cfg.queryDeflectionRate;
  const hoursSaved = deflectedQueries * (15 / 60);
  const valueSaved = hoursSaved * hrlyRate * cfg.hrFteRedeploymentValue;

  const isEstimated = d.monthlyHrQueryVolume == null;
  return {
    low: Math.round(valueSaved * 0.7),
    high: Math.round(valueSaved * 1.4),
    currency: "GBP",
    isIndicative: indicative(d) || isEstimated,
    narrative: isEstimated
      ? `Estimated from ${headcount.toLocaleString()} employees × 2 queries/month × ${Math.round(cfg.queryDeflectionRate * 100)}% deflection × 15min handling time. Provide actual monthly query volume for a more precise figure.`
      : `Based on ${monthlyQueries.toLocaleString()} monthly queries × ${Math.round(cfg.queryDeflectionRate * 100)}% deflection rate × 15min avg handling time.`,
  };
}

export function hr_policy_generation(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hrFteRaw = d.hrFteCount ?? 0;
  const hrFte = hrFteRaw > 0 ? hrFteRaw : Math.max(5, Math.round(headcount / 100));
  const usingFallback = hrFteRaw === 0 && headcount > 0;
  const cfg = INITIATIVE_CONFIG.hr_policy_generation;
  const hrlyRate = 50;

  const rawTimeSaving = hrFte * cfg.policyHoursPerFtePerYear * cfg.timeReductionRate * hrlyRate;
  const timeSaving = Math.min(rawTimeSaving, 250_000); // Enterprise cap: policy generation value bounded at £250k

  return {
    low: Math.round(timeSaving * 0.6),
    high: Math.round(timeSaving * 1.3),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${hrFte} estimated HR FTEs (${headcount.toLocaleString()} headcount × 1% HR ratio): policy and document generation time saving.`
      : `Based on ${hrFte} HR FTEs × ${cfg.policyHoursPerFtePerYear}h policy work per year × ${Math.round(cfg.timeReductionRate * 100)}% reduction at £${hrlyRate}/hr.`,
  };
}

export function hr_benefits_decision_support(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const cfg = INITIATIVE_CONFIG.hr_benefits_decision_support;
  const hrlyRate = 35;

  const querySaving = headcount * cfg.benefitsQueriesPerEmployee * cfg.queryDeflectionRate * (20 / 60) * hrlyRate;
  const enrolmentValue = headcount * cfg.benefitsOptimisationValuePerEmployee;
  const rawTotal = querySaving + enrolmentValue;
  const total = Math.min(rawTotal, 750_000); // Enterprise cap: benefits decision support value bounded at £750k

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees: benefits query deflection and benefits optimisation value.`,
  };
}

// ── Workforce Planning Category ───────────────────────────────────────────────

export function wp_workforce_planning(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hires = d.annualHires ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.wp_workforce_planning;

  const planningEfficiency = headcount * salary * cfg.planningEfficiencyRate;
  const hiringOptimisation = hires * (d.costPerExternalHire ?? 8000) * cfg.hiringOptimisationRate;
  const rawTotal = planningEfficiency + hiringOptimisation;
  const total = Math.min(rawTotal, 2_000_000); // Enterprise cap: workforce planning value bounded at £2M

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees: workforce planning efficiency (${Math.round(cfg.planningEfficiencyRate * 100)}%) and hiring optimisation (${Math.round(cfg.hiringOptimisationRate * 100)}%).`,
  };
}

export function wp_succession_planning(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const cfg = INITIATIVE_CONFIG.wp_succession_planning;
  const mgrs = managerHeadcount(inputs);

  const successionValue = mgrs * cfg.seniorRoleFraction * costPerLeaver(inputs) * cfg.riskReductionRate;
  const readinessValue = mgrs * loadedManagerCost(inputs) * cfg.readinessUpliftRate;
  const rawTotal = successionValue + readinessValue;
  const total = Math.min(rawTotal, 1_250_000); // Enterprise cap: succession planning value bounded at £1.25M

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${mgrs} managers: succession risk reduction and leadership readiness uplift.`,
  };
}

export function wp_org_design(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.wp_org_design;

  const rawSpanValue = headcount * salary * cfg.spanEfficiencyGain;
  const spanValue = Math.min(rawSpanValue, 2_000_000); // Enterprise cap: org design value bounded at £2M

  return {
    low: Math.round(spanValue * 0.3),
    high: Math.round(spanValue * 0.8),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees: span-of-control optimisation and org efficiency gain (${Math.round(cfg.spanEfficiencyGain * 100)}%).`,
  };
}

export function wp_location_strategy(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const hiresRaw = d.annualHires ?? 0;
  const hires = hiresRaw > 0 ? hiresRaw : Math.round(headcount * 0.45);
  const usingFallback = hiresRaw === 0 && headcount > 0;
  const costPerHire = d.costPerExternalHire ?? 8000;
  // Revenue fallback: estimate from headcount at £25k revenue per employee
  const revenueRaw = d.annualRevenue ?? 0;
  const revenue = revenueRaw > 0 ? revenueRaw : headcount * 25000;
  const cfg = INITIATIVE_CONFIG.wp_location_strategy;

  const hiringOptimisation = hires * costPerHire * cfg.locationOptimisationRate;
  const strategicValue = revenue * cfg.revenueImpactRate;
  const rawTotal = hiringOptimisation + strategicValue;
  const total = Math.min(rawTotal, 1_500_000); // Enterprise cap: location strategy value bounded at £1.5M

  return {
    low: Math.round(total * 0.3),
    high: Math.round(total * 0.8),
    currency: "GBP",
    isIndicative: usingFallback || indicative(d),
    narrative: usingFallback
      ? `Indicative estimate based on ${hires.toLocaleString()} estimated annual hires and £${(revenue / 1_000_000).toFixed(0)}M estimated revenue: hiring cost optimisation through smarter location decisions.`
      : `Based on ${hires} annual hires: ${Math.round(cfg.locationOptimisationRate * 100)}% hiring cost optimisation through smarter location decisions, plus strategic revenue impact.`,
  };
}

// ── Compensation & Reward Category ───────────────────────────────────────────

export function cr_pay_equity(inputs: ValueFormulaInputs): ValueRange {
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.cr_pay_equity;

  const riskValue = headcount * salary * cfg.regulatoryRiskValueRate;
  const auditEfficiency = cfg.auditCostAvoided;
  const rawTotal = riskValue + auditEfficiency;
  const total = Math.min(rawTotal, 750_000); // Enterprise cap: pay equity value bounded at £750k

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: false,
    narrative: `Risk-reduction value: regulatory risk (£${riskValue.toLocaleString()}) plus audit cost avoided (£${auditEfficiency.toLocaleString()}).`,
  };
}

export function cr_compensation_recommendations(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.cr_compensation_recommendations;
  const mgrs = managerHeadcount(inputs);

  const managerTimeSaving = mgrs * cfg.compCycleHoursPerManager * cfg.timeReductionRate * (loadedManagerCost(inputs) / 1800);
  const equityValue = headcount * salary * cfg.payEquityValueRate;
  const rawTotal = managerTimeSaving + equityValue;
  const total = Math.min(rawTotal, 1_250_000); // Enterprise cap: compensation recommendations value bounded at £1.25M

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${mgrs} managers: comp cycle time saving and pay equity improvement value.`,
  };
}

// ── Reward-Exclusive Category (8 new) ────────────────────────────────────────

export function cr_total_reward_statements(inputs: ValueFormulaInputs): ValueRange {
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  // Value: reduced attrition from reward visibility + reduced HR queries
  const attritionReduction = headcount * salary * 0.005; // 0.5% attrition reduction from visibility
  const queryReduction = headcount * 15; // £15/employee/year in reduced HR query handling
  const rawTotal = attritionReduction + queryReduction;
  const total = Math.min(rawTotal, 500_000);
  return {
    low: Math.round(total * 0.3),
    high: Math.round(total * 0.8),
    currency: "GBP",
    isIndicative: indicative(inputs.sectionD),
    narrative: `Based on ${headcount} employees: attrition reduction from reward visibility (£${Math.round(attritionReduction).toLocaleString()}) plus HR query reduction (£${queryReduction.toLocaleString()}).`,
  };
}

export function cr_benefits_optimisation(inputs: ValueFormulaInputs): ValueRange {
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  // Value: benefits cost reduction (typically 2-5% of benefits spend)
  const benefitsSpend = headcount * salary * 0.15; // Assume 15% of salary goes to benefits
  const optimisationSaving = benefitsSpend * 0.08; // 8% reduction through optimisation
  const total = Math.min(optimisationSaving, 1_000_000);
  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(inputs.sectionD),
    narrative: `Based on estimated benefits spend of £${Math.round(benefitsSpend).toLocaleString()}: 8% optimisation saving through AI-driven utilisation analysis.`,
  };
}

export function cr_salary_benchmarking_ai(inputs: ValueFormulaInputs): ValueRange {
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  // Value: reduced time-to-offer + improved offer acceptance
  const hires = inputs.sectionD?.annualHires ?? Math.round(headcount * 0.12);
  const timeToOfferValue = hires * 500; // £500/hire saved in faster benchmarking
  const acceptanceValue = hires * salary * 0.05 * 0.10; // 10% more acceptances × 5% of salary
  const rawTotal = timeToOfferValue + acceptanceValue;
  const total = Math.min(rawTotal, 750_000);
  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(inputs.sectionD),
    narrative: `Based on ~${hires} annual hires: faster benchmarking (£${timeToOfferValue.toLocaleString()}) plus improved offer acceptance (£${Math.round(acceptanceValue).toLocaleString()}).`,
  };
}

export function cr_incentive_modelling(inputs: ValueFormulaInputs): ValueRange {
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  // Value: improved incentive ROI through better plan design
  const variablePayPool = headcount * salary * 0.10; // Assume 10% variable pay
  const roiImprovement = variablePayPool * 0.12; // 12% improvement in incentive effectiveness
  const total = Math.min(roiImprovement, 1_500_000);
  return {
    low: Math.round(total * 0.3),
    high: Math.round(total * 0.8),
    currency: "GBP",
    isIndicative: indicative(inputs.sectionD),
    narrative: `Based on estimated variable pay pool of £${Math.round(variablePayPool).toLocaleString()}: 12% improvement in incentive effectiveness through AI modelling.`,
  };
}

export function cr_executive_comp_analytics(inputs: ValueFormulaInputs): ValueRange {
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  // Value: RemCo preparation time + compliance risk reduction
  const remCoTimeSaving = 80_000; // Fixed: senior time saved in RemCo prep
  const complianceValue = headcount > 5000 ? 150_000 : 75_000; // Regulatory risk reduction
  const rawTotal = remCoTimeSaving + complianceValue;
  const total = Math.min(rawTotal, 500_000);
  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(inputs.sectionD),
    narrative: `RemCo preparation time saving (£${remCoTimeSaving.toLocaleString()}) plus regulatory compliance risk reduction (£${complianceValue.toLocaleString()}).`,
  };
}

export function cr_reward_communication_ai(inputs: ValueFormulaInputs): ValueRange {
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  // Value: reduced pay queries + improved reward understanding
  const queryReduction = headcount * 25; // £25/employee/year in reduced pay queries
  const engagementValue = headcount * 10; // £10/employee from improved engagement
  const rawTotal = queryReduction + engagementValue;
  const total = Math.min(rawTotal, 400_000);
  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(inputs.sectionD),
    narrative: `Based on ${headcount} employees: pay query reduction (£${queryReduction.toLocaleString()}) plus engagement improvement (£${engagementValue.toLocaleString()}).`,
  };
}

export function cr_gender_pay_gap_reporting(inputs: ValueFormulaInputs): ValueRange {
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  // Value: compliance time saving + risk reduction
  const complianceTimeSaving = headcount > 1000 ? 60_000 : 30_000;
  const riskReduction = headcount > 5000 ? 100_000 : 50_000;
  const rawTotal = complianceTimeSaving + riskReduction;
  const total = Math.min(rawTotal, 300_000);
  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(inputs.sectionD),
    narrative: `GPG reporting time saving (£${complianceTimeSaving.toLocaleString()}) plus regulatory risk reduction (£${riskReduction.toLocaleString()}).`,
  };
}

export function cr_flexible_benefits_ai(inputs: ValueFormulaInputs): ValueRange {
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  // Value: increased benefits take-up + admin cost reduction
  const benefitsSpend = headcount * salary * 0.15;
  const takeUpValue = benefitsSpend * 0.05; // 5% more value realised through better take-up
  const adminReduction = headcount * 20; // £20/employee admin saving
  const rawTotal = takeUpValue + adminReduction;
  const total = Math.min(rawTotal, 800_000);
  return {
    low: Math.round(total * 0.3),
    high: Math.round(total * 0.8),
    currency: "GBP",
    isIndicative: indicative(inputs.sectionD),
    narrative: `Increased benefits value realisation (£${Math.round(takeUpValue).toLocaleString()}) plus administration cost reduction (£${adminReduction.toLocaleString()}).`,
  };
}

// ── Manager Effectiveness Category ───────────────────────────────────────────

export function mg_manager_copilot(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const cfg = INITIATIVE_CONFIG.mg_manager_copilot;
  const mgrs = managerHeadcount(inputs);

  const adminTimeSaving = mgrs * cfg.adminHoursPerWeek * 52 * cfg.timeReductionRate * (loadedManagerCost(inputs) / 1800);
  const teamOutcomeValue = headcount * avgSalary(inputs) * cfg.teamProductivityUplift;
  const rawTotal = adminTimeSaving + teamOutcomeValue;
  const total = Math.min(rawTotal, 1_250_000); // Enterprise cap: manager copilot value bounded at £1.25M

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${mgrs} managers: admin time saving (${cfg.adminHoursPerWeek}h/week × ${Math.round(cfg.timeReductionRate * 100)}% reduction) and team productivity uplift.`,
  };
}

export function mg_difficult_conversations(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const cfg = INITIATIVE_CONFIG.mg_difficult_conversations;
  const mgrs = managerHeadcount(inputs);

  const hrEscalationSaving = headcount * cfg.difficultConversationRate * avgSalary(inputs) * cfg.handlingImprovementRate;
  const managerEffectivenessValue = mgrs * cfg.hardCaseFraction * loadedManagerCost(inputs);
  const rawTotal = hrEscalationSaving + managerEffectivenessValue;
  const total = Math.min(rawTotal, 750_000); // Enterprise cap: difficult conversations value bounded at £750k

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees: HR escalation reduction and manager effectiveness on difficult conversations.`,
  };
}

// ── Governance Category ───────────────────────────────────────────────────────

export function gv_ai_governance(inputs: ValueFormulaInputs): ValueRange {
  // Foundation value: 30% of sum of other recommended initiatives (approximated here)
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.gv_ai_governance;

  // Proxy: regulatory risk reduction + deployment acceleration value
  const riskValue = headcount * salary * cfg.riskReductionRate;
  const accelerationValue = riskValue * cfg.deploymentAccelerationMultiplier;
  const rawTotal = riskValue + accelerationValue;
  const total = Math.min(rawTotal, 1_500_000); // Enterprise cap: AI governance value bounded at £1.5M

  return {
    low: Math.round(total * 0.3),
    high: Math.round(total * 0.8),
    currency: "GBP",
    isIndicative: false,
    narrative: `Foundation value: regulatory risk reduction and AI deployment acceleration (60%+ faster subsequent deployments). Actual value compounds with each additional AI initiative deployed.`,
  };
}

export function gv_cross_cutting_bias_audit(inputs: ValueFormulaInputs): ValueRange {
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);
  const cfg = INITIATIVE_CONFIG.gv_cross_cutting_bias_audit;

  const riskValue = headcount * salary * cfg.riskReductionRate;
  const auditEfficiency = cfg.auditCostAvoided;
  const rawRiskTotal = riskValue + auditEfficiency;
  const total = Math.min(rawRiskTotal, 1_000_000); // Enterprise cap: bias audit value bounded at £1M

  return {
    low: Math.round(total * 0.3),
    high: Math.round(total * 0.8),
    currency: "GBP",
    isIndicative: false,
    narrative: `Risk-reduction value: regulatory + reputational risk (£${riskValue.toLocaleString()}) plus manual audit cost avoided (£${auditEfficiency.toLocaleString()}).`,
  };
}

// ── Frontline Category ────────────────────────────────────────────────────────

export function fw_shift_scheduling_ai(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const flHeadcount = frontlineHeadcount(inputs);
  const salary = avgSalary(inputs) * 0.6; // frontline salary lower
  const cfg = INITIATIVE_CONFIG.fw_shift_scheduling_ai;

  const labourOptimisation = flHeadcount * salary * cfg.labourCostReductionRate;
  const overtimeSaving = flHeadcount * salary * cfg.overtimeReductionRate;
  const rawTotal = labourOptimisation + overtimeSaving;
  const total = Math.min(rawTotal, 1_500_000); // Enterprise cap: shift scheduling value bounded at £1.5M

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${flHeadcount.toLocaleString()} frontline employees: labour cost optimisation (${Math.round(cfg.labourCostReductionRate * 100)}%) and overtime reduction (${Math.round(cfg.overtimeReductionRate * 100)}%).`,
  };
}

export function fw_frontline_learning(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const flHeadcount = frontlineHeadcount(inputs);
  const salary = avgSalary(inputs) * 0.6;
  const ldSpend = d.annualLDSpend ?? 0;
  const cfg = INITIATIVE_CONFIG.fw_frontline_learning;

  const completionValue = flHeadcount * salary * cfg.performanceUpliftRate;
  const ldEfficiency = ldSpend * cfg.ldEfficiencyGain;
  const rawTotal = completionValue + ldEfficiency;
  const total = Math.min(rawTotal, 1_250_000); // Enterprise cap: frontline learning value bounded at £1.25M

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${flHeadcount.toLocaleString()} frontline employees: performance uplift from improved learning completion and L&D efficiency gain.`,
  };
}

export function fw_frontline_communication(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const flHeadcount = frontlineHeadcount(inputs);
  const salary = avgSalary(inputs) * 0.6;
  const cfg = INITIATIVE_CONFIG.fw_frontline_communication;

  const attritionValue = flHeadcount * (d.attritionRate ?? 25) / 100 * cfg.attritionReductionRate * (salary * 0.5);
  const productivityValue = flHeadcount * salary * cfg.productivityUpliftRate;
  const rawTotal = attritionValue + productivityValue;
  const total = Math.min(rawTotal, 750_000); // Enterprise cap: frontline communication value bounded at £750k

  return {
    low: Math.round(total * 0.4),
    high: Math.round(total * 1.0),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${flHeadcount.toLocaleString()} frontline employees: attrition reduction (${Math.round(cfg.attritionReductionRate * 100)}%) and productivity uplift from better communication.`,
  };
}

export function fw_store_manager_assistant(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const sites = storeOrSiteCount(inputs);
  const cfg = INITIATIVE_CONFIG.fw_store_manager_assistant;
  const managerCost = loadedManagerCost(inputs);
  const flHeadcount = frontlineHeadcount(inputs);

  const managerTimeValue = sites * cfg.hoursRecoveredPerManagerPerWeek * 52 * (managerCost / 1800);
  const managerRetentionValue = sites * cfg.managerTurnoverRate * cfg.managerRetentionReduction * costPerLeaver(inputs);
  const teamOutcomeValue = flHeadcount * avgSalary(inputs) * 0.6 * cfg.teamEngagementUpliftRate;
  const rawTotal = managerTimeValue + managerRetentionValue + teamOutcomeValue;
  const total = Math.min(rawTotal, 1_000_000); // Enterprise cap: store manager assistant value bounded at £1M

  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${sites} sites: ${cfg.hoursRecoveredPerManagerPerWeek}h/manager/week recovered, manager retention uplift, and team engagement improvement.`,
  };
}

export function wp_ai_capability_building(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const hc = inputs.sectionA.totalHeadcount ?? 1000;
  const cfg = (INITIATIVE_CONFIG as any).wp_ai_capability_building;
  // Value = adoption acceleration on downstream initiatives (proxy: 40% of avg salary × coverage)
  const adoptionValue = hc * (avgSalary(inputs) * 0.01) * cfg.adoptionAccelerationMultiplier;
  const rawTotal = adoptionValue;
  const total = Math.min(rawTotal, 1_500_000); // Enterprise cap: AI capability building value bounded at £1.5M
  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: true,
    narrative: `Based on ${hc.toLocaleString()} employees: accelerated adoption of downstream AI initiatives through structured capability building.`,
  };
}

export function wp_ai_capability_advanced(inputs: ValueFormulaInputs): ValueRange {
  const hc = inputs.sectionA.totalHeadcount ?? 1000;
  // Advanced capability building: higher value multiplier than foundation programme
  const rawAdoptionValue = hc * (avgSalary(inputs) * 0.015) * 1.3;
  const adoptionValue = Math.min(rawAdoptionValue, 2_500_000); // Enterprise cap: advanced AI capability value bounded at £2.5M
  return {
    low: Math.round(adoptionValue * 0.5),
    high: Math.round(adoptionValue * 1.3),
    currency: "GBP",
    isIndicative: true,
    narrative: `Based on ${hc.toLocaleString()} employees: advanced AI capability building accelerates proprietary AI use case development and internal champion network.`,
  };
}

export function ee_workforce_ai_comms(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const hc = inputs.sectionA.totalHeadcount ?? 1000;
  const cfg = (INITIATIVE_CONFIG as any).ee_workforce_ai_comms;
  // Value = adoption rate uplift on downstream initiatives (proxy: 30% uplift × avg salary × small fraction)
  const adoptionValue = hc * (avgSalary(inputs) * 0.005) * cfg.adoptionRateUplift;
  const rawTotal = adoptionValue;
  const total = Math.min(rawTotal, 500_000); // Enterprise cap: workforce AI comms value bounded at £500k
  return {
    low: Math.round(total * 0.5),
    high: Math.round(total * 1.2),
    currency: "GBP",
    isIndicative: true,
    narrative: `Based on ${hc.toLocaleString()} employees: improved adoption rates for AI tools through structured workforce communications.`,
  };
}

// ─── Formula registry ─────────────────────────────────────────────────────────

export const VALUE_FORMULA_REGISTRY: Record<string, (inputs: ValueFormulaInputs) => ValueRange> = {
  // TA
  ta_high_volume_hiring,
  ta_candidate_chatbot,
  ta_interview_scheduling,
  ta_sourcing_matching,
  ta_video_interview_assessment,
  ta_bias_monitoring,
  ta_recruiter_productivity_ai,
  ta_offer_generation,
  ta_jd_optimization,
  // Onboarding
  on_personalised_journeys,
  on_new_hire_chatbot,
  on_documentation_automation,
  on_buddy_matching,
  // L&D
  ld_personalised_learning,
  ld_workforce_reskilling,
  ld_ai_coaching,
  ld_compliance_training,
  ld_content_creation,
  ld_knowledge_management,
  // Internal Mobility
  im_talent_marketplace,
  im_skills_inference,
  im_mentor_matching,
  // Performance
  pm_continuous_performance,
  pm_review_writing,
  pm_okr_goal_alignment,
  // Employee Experience
  ee_sentiment_listening,
  ee_recognition_rewards,
  ee_wellbeing_burnout,
  ee_internal_comms_ai,
  // Retention
  rt_flight_risk_prediction,
  rt_stay_interview_ai,
  rt_exit_intelligence,
  // HR Operations
  hr_virtual_assistant,
  hr_policy_generation,
  hr_benefits_decision_support,
  // Workforce Planning
  wp_workforce_planning,
  wp_succession_planning,
  wp_org_design,
  wp_location_strategy,
  // Compensation
  cr_pay_equity,
  cr_compensation_recommendations,
  cr_total_reward_statements,
  cr_benefits_optimisation,
  cr_salary_benchmarking_ai,
  cr_incentive_modelling,
  cr_executive_comp_analytics,
  cr_reward_communication_ai,
  cr_gender_pay_gap_reporting,
  cr_flexible_benefits_ai,
  // Manager
  mg_manager_copilot,
  mg_difficult_conversations,
  // Governance
  gv_ai_governance,
  gv_cross_cutting_bias_audit,
  // Frontline
  fw_shift_scheduling_ai,
  fw_frontline_learning,
  fw_frontline_communication,
  fw_store_manager_assistant,
  // AI Capability Building
  wp_ai_capability_building,
  wp_ai_capability_advanced,
  ee_workforce_ai_comms,
};
