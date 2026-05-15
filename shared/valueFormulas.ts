/**
 * Value Formulas — Parameterised financial value calculations for all 12 initiatives.
 *
 * All formulas return { low: number; high: number; currency: "GBP" } annual value ranges.
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
};

export type SectionAInputs = {
  totalHeadcount?: number;
  sectorSpecificRegulation?: string[];
  ownershipStructure?: string;
};

export type SectionCInputs = {
  hrisSystem?: string;
  atsSystem?: string;
  lmsSystem?: string;
  dataQualityRating?: string;
  hrSystemIntegrationMaturity?: string;
  yearsOfHrisData?: number;
  workforceDigitalAccess?: string;
};

export type SectionIInputs = {
  workforceWorkType?: string;
  managerCapabilityForInsights?: string;
  pivotalJobFamilies?: string[];
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
    // Revenue per head as a proxy, capped at reasonable salary range
    const revenuePerHead = annualRevenue / headcount;
    return Math.min(Math.max(revenuePerHead * 0.35, 25000), 120000);
  }
  return INITIATIVE_CONFIG.attritionPrediction.avgSalaryFallback;
}

// ─── Formula implementations ──────────────────────────────────────────────────

export function highVolumeHiring(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const hires = d.annualHires ?? 0;
  const adminHours = d.adminTimePerHire ?? 0;
  const cfg = INITIATIVE_CONFIG.highVolumeHiring;
  const hrlyRate = 35; // £35/hr recruiter blended rate

  const adminSavingHours = hires * adminHours * cfg.adminTimeReductionMultiplier;
  const adminSavingValue = adminSavingHours * hrlyRate;

  const low = Math.round(adminSavingValue * 0.7);
  const high = Math.round(adminSavingValue * 1.3);

  return {
    low,
    high,
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${hires} annual hires × ${adminHours}h admin per hire × ${Math.round(cfg.adminTimeReductionMultiplier * 100)}% reduction at £${hrlyRate}/hr blended recruiter rate.`,
  };
}

export function hrChatbot(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const monthlyQueries = d.monthlyHrQueryVolume ?? 0;
  const hrFte = d.hrFteCount ?? 5;
  const cfg = INITIATIVE_CONFIG.hrChatbot;
  const avgMinutesPerQuery = 15;
  const hrlyRate = 40; // £40/hr HR generalist blended rate

  const annualQueries = monthlyQueries * 12;
  const deflectedQueries = annualQueries * cfg.queryDeflectionRate;
  const hoursSaved = deflectedQueries * avgMinutesPerQuery * cfg.minutesToHours;
  const valueSaved = hoursSaved * hrlyRate * cfg.hrFteRedeploymentValue;

  const low = Math.round(valueSaved * 0.7);
  const high = Math.round(valueSaved * 1.4);

  return {
    low,
    high,
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${monthlyQueries.toLocaleString()} monthly queries × ${Math.round(cfg.queryDeflectionRate * 100)}% deflection rate × ${avgMinutesPerQuery}min avg handling time.`,
  };
}

export function internalMobility(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const cfg = INITIATIVE_CONFIG.internalMobility;
  const hires = d.annualHires ?? 0;
  const costPerHire = d.costPerExternalHire ?? 8000;
  const contractorSpend = d.annualContractorSpend ?? 0;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);

  const externalHireSaving = hires * cfg.externalHireDisplacementRate * costPerHire;
  const contractorSaving = contractorSpend * cfg.contractorDisplacementRate;
  const retentionValue = headcount * cfg.retentionValueMultiplier * salary * 0.05;

  const total = externalHireSaving + contractorSaving + retentionValue;
  const low = Math.round(total * 0.6);
  const high = Math.round(total * 1.3);

  return {
    low,
    high,
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${hires} annual hires (${Math.round(cfg.externalHireDisplacementRate * 100)}% displacement at £${costPerHire.toLocaleString()} per hire), contractor spend reduction, and attrition impact.`,
  };
}

export function attritionPrediction(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const cfg = INITIATIVE_CONFIG.attritionPrediction;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const attritionRate = (d.attritionRate ?? 15) / 100;
  const salary = avgSalary(inputs);
  const managerLevel = (inputs.sectionI.managerCapabilityForInsights ?? "Mixed") as string;
  const managerProb = cfg.managerActionProbability[managerLevel] ?? cfg.managerActionProbability.Mixed;

  const annualLeavers = headcount * attritionRate;
  const replacementCostPerLeaver = salary * cfg.attritionCostAsMultipleOfSalary;
  const attritionReduction = cfg.attritionReductionRate * managerProb;
  const value = annualLeavers * attritionReduction * replacementCostPerLeaver;

  const low = Math.round(value * 0.6);
  const high = Math.round(value * 1.2);

  return {
    low,
    high,
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} headcount × ${Math.round(attritionRate * 100)}% attrition × ${Math.round(attritionReduction * 100)}% reduction (adjusted for ${managerLevel} manager capability) × £${Math.round(salary * cfg.attritionCostAsMultipleOfSalary).toLocaleString()} replacement cost.`,
  };
}

export function ldPersonalisation(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const cfg = INITIATIVE_CONFIG.ldPersonalisation;
  const ldSpend = d.annualLDSpend ?? 0;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);

  const efficiencyGain = ldSpend * cfg.ldEfficiencyGain;
  const productivityValue = headcount * salary * cfg.skillsUpliftProductivityValue;
  const total = efficiencyGain + productivityValue;

  const low = Math.round(total * 0.6);
  const high = Math.round(total * 1.3);

  return {
    low,
    high,
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on £${ldSpend.toLocaleString()} L&D spend (${Math.round(cfg.ldEfficiencyGain * 100)}% efficiency gain) plus ${Math.round(cfg.skillsUpliftProductivityValue * 100)}% productivity uplift across ${headcount.toLocaleString()} employees.`,
  };
}

export function performanceAI(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const cfg = INITIATIVE_CONFIG.performanceAI;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);

  const coveredPop = headcount * cfg.coveredPopulationFraction;
  const value = coveredPop * salary * cfg.productivityUpliftRate;

  const low = Math.round(value * 0.5);
  const high = Math.round(value * 1.2);

  return {
    low,
    high,
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${Math.round(cfg.coveredPopulationFraction * 100)}% of ${headcount.toLocaleString()} employees × ${Math.round(cfg.productivityUpliftRate * 100)}% productivity uplift at £${Math.round(salary).toLocaleString()} average salary.`,
  };
}

export function engagementAI(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const cfg = INITIATIVE_CONFIG.engagementAI;
  const revenue = d.annualRevenue ?? 0;

  const revenueValue = revenue * cfg.engagementUpliftPoints * cfg.engagementToRevenueMultiplier;
  const low = Math.round(revenueValue * 0.5);
  const high = Math.round(revenueValue * 1.3);

  return {
    low,
    high,
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: revenue > 0
      ? `Based on £${revenue.toLocaleString()} annual revenue × ${cfg.engagementUpliftPoints} point engagement uplift × ${cfg.engagementToRevenueMultiplier * 100}% revenue multiplier (Gallup-derived).`
      : "Revenue data not provided — value estimate not available. Add annual revenue to Section D for a financial estimate.",
  };
}

export function offerGeneration(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const cfg = INITIATIVE_CONFIG.offerGeneration;
  const hires = d.annualHires ?? 0;
  const hrlyRate = 40; // £40/hr HR admin blended rate

  const hoursSaved = hires * cfg.offerProcessHoursPerHire * cfg.timeReductionRate;
  const value = hoursSaved * hrlyRate;

  const low = Math.round(value * 0.7);
  const high = Math.round(value * 1.2);

  return {
    low,
    high,
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${hires} annual hires × ${cfg.offerProcessHoursPerHire}h offer process × ${Math.round(cfg.timeReductionRate * 100)}% time reduction at £${hrlyRate}/hr.`,
  };
}

export function biasMonitoring(inputs: ValueFormulaInputs): ValueRange {
  const cfg = INITIATIVE_CONFIG.biasMonitoring;
  // Qualitative risk reduction — scenario-based value
  const low = Math.round(cfg.regulatoryRiskScenarioValue * 0.3);
  const high = cfg.regulatoryRiskScenarioValue;

  return {
    low,
    high,
    currency: "GBP",
    isIndicative: false,
    narrative: `Scenario-based regulatory risk reduction value. Direct financial value depends on sector regulatory environment and enforcement history.`,
  };
}

export function interviewScheduling(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const cfg = INITIATIVE_CONFIG.interviewScheduling;
  const hires = d.annualHires ?? 0;
  const hrlyRate = 35; // £35/hr blended rate

  const hoursSaved = hires * cfg.schedulingHoursPerInterview * cfg.interviewsPerHire * cfg.timeReductionRate;
  const value = hoursSaved * hrlyRate;

  const low = Math.round(value * 0.7);
  const high = Math.round(value * 1.2);

  return {
    low,
    high,
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${hires} annual hires × ${cfg.interviewsPerHire} interviews per hire × ${cfg.schedulingHoursPerInterview}h scheduling per interview × ${Math.round(cfg.timeReductionRate * 100)}% time reduction.`,
  };
}

export function onboardingPersonalisation(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const cfg = INITIATIVE_CONFIG.onboardingPersonalisation;
  const hires = d.annualHires ?? 0;
  const salary = avgSalary(inputs);
  const dailySalaryValue = salary / INITIATIVE_CONFIG.workingDaysPerYear;

  const value = hires * cfg.timeToProductivityReductionDays * dailySalaryValue * cfg.productivityValueFraction;

  const low = Math.round(value * 0.6);
  const high = Math.round(value * 1.3);

  return {
    low,
    high,
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${hires} annual hires × ${cfg.timeToProductivityReductionDays} days faster time-to-productivity × £${Math.round(dailySalaryValue)} daily salary value × ${Math.round(cfg.productivityValueFraction * 100)}% productivity fraction.`,
  };
}

export function skillsInference(inputs: ValueFormulaInputs): ValueRange {
  const d = inputs.sectionD;
  const cfg = INITIATIVE_CONFIG.skillsInference;
  const headcount = inputs.sectionA.totalHeadcount ?? 0;
  const salary = avgSalary(inputs);

  const mobilityValue = headcount * salary * cfg.mobilityEnablementValueFraction;
  const planningValue = headcount * salary * cfg.workforcePlanningValueFraction;
  const total = mobilityValue + planningValue;

  const low = Math.round(total * 0.4);
  const high = Math.round(total * 1.0);

  return {
    low,
    high,
    currency: "GBP",
    isIndicative: indicative(d),
    narrative: `Based on ${headcount.toLocaleString()} employees × mobility enablement and workforce planning efficiency gains at £${Math.round(salary).toLocaleString()} average salary.`,
  };
}

// ─── Formula registry ─────────────────────────────────────────────────────────

export const VALUE_FORMULA_REGISTRY: Record<string, (inputs: ValueFormulaInputs) => ValueRange> = {
  highVolumeHiring,
  hrChatbot,
  internalMobility,
  attritionPrediction,
  ldPersonalisation,
  performanceAI,
  engagementAI,
  offerGeneration,
  biasMonitoring,
  interviewScheduling,
  onboardingPersonalisation,
  skillsInference,
};
