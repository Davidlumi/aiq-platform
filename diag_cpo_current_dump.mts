/**
 * CPO Engine Current State Dump
 * Shows what fitImpactEngine + valueFormulas currently produce per CPO initiative
 * for a representative company profile.
 *
 * Run: npx tsx diag_cpo_current_dump.mts
 */
import { INITIATIVE_LIBRARY } from "./shared/initiativeLibrary.js";
import { evaluateAllInitiatives } from "./server/services/fitImpactEngine.js";
import type { FitImpactEngineInputs } from "./server/services/fitImpactEngine.js";

// ── Representative CPO company profile ───────────────────────────────────────
// "Meridian Retail Group" — UK multi-site retailer, 12,000 employees
const MERIDIAN_INPUTS: FitImpactEngineInputs = {
  mode: "cpo",
  sectionA: {
    totalHeadcount: 12_000,
    ukSitesCount: 85,
    sector: "retail",
    ownershipStructure: "listed",
    sectorSpecificRegulations: [],
  },
  sectionB: {
    hrSubFunctions: ["TA", "L&D", "HR_OPS", "WORKFORCE_PLANNING", "EMPLOYEE_EXPERIENCE", "PERFORMANCE"],
  },
  sectionC: {
    hrisSystem: "Workday",
    atsSystem: "Greenhouse",
    lmsSystem: "Cornerstone",
    dataQualityRating: "good",
    workforceDigitalAccess: "mixed_access",
    hrSystemIntegrationMaturity: "integrated",
    yearsOfHrisData: "5_to_10_years",
    engagementSurveyTool: "Peakon",
  },
  sectionD: {
    annualHires: 2_400,
    adminTimePerHire: 12,
    adminTimePerHireIsEstimate: false,
    totalHrBudget: 8_500_000,
    totalHrBudgetIsEstimate: false,
    attritionRate: 0.22,
    attritionRateIsEstimate: false,
    avgTimeToFill: 38,
    annualApplicationVolume: 72_000,
    costPerExternalHire: 4_200,
    costPerExternalHireIsEstimate: false,
    annualContractorSpend: 1_800_000,
    annualContractorSpendIsEstimate: false,
    monthlyHrQueryVolume: 3_200,
    internalHirePercent: 0.28,
    annualLDSpend: 2_100_000,
    annualLDSpendIsEstimate: false,
    annualRevenue: 1_400_000_000,
    annualRevenueIsEstimate: false,
    currentEngagementScore: 62,
    hrFteCount: 48,
  },
  sectionI: {
    workforceWorkType: "mixed",
    workforceComposition: "mixed",
    workforceEmploymentMix: "permanent_majority",
    businessDirectionType: "growth",
    geographicDistribution: "multi_region_uk",
    managerCapabilityForInsights: "developing",
    skillsFrameworkStatus: "in_progress",
    skillsInventoryCompleteness: "partial",
    employeeExperienceState: "improving",
    frontlineHeadcountPercent: 68,
    topBusinessPriorities: ["cost_efficiency", "talent_retention", "customer_experience"],
  },
  sectionF: { changeReadiness: "moderate" },
  sectionG: { ai_ethics_trust: 65 },
  sectionK: {
    performanceReviewCadence: "annual",
    internalMobilityApproach: "informal",
    onboardingModel: "structured",
    hrHelpdeskModel: "shared_service",
    hiringProcessStructure: "structured",
    hiringVolumeProfile: ["volume", "specialist"],
    lAndDDeliveryModel: "blended",
    rewardCycleModel: "annual",
  },
  companyProfile: {
    sector: "retail",
    headcount: 12_000,
    geographicFootprint: "uk_multi_site",
    ownershipStructure: "listed",
    businessAiAmbition: 7,
    hris: "Workday",
    workforceKnowledgePct: 32,
    workforceFrontlinePct: 68,
    annualPayrollCostGbp: 320_000_000,
  },
};

// ── Run the engine ────────────────────────────────────────────────────────────
const results = evaluateAllInitiatives(MERIDIAN_INPUTS);

// Filter to CPO-mode initiatives only (exclude reward-only)
const cpoResults = results.filter(r => {
  const init = INITIATIVE_LIBRARY.find(i => i.id === r.id);
  const scope = init?.functionScope ?? "cpo";
  return scope === "cpo" || scope === "both";
});

// Print summary table
console.log("\n=== CPO ENGINE CURRENT STATE DUMP ===");
console.log(`Company: Meridian Retail Group | Headcount: 12,000 | Sector: Retail`);
console.log(`Total CPO initiatives evaluated: ${cpoResults.length}\n`);

console.log("ID | Label | FitStatus | FitScore | ValueLow | ValueHigh | y1CostLow(k) | y1CostHigh(k) | Phase | TimeToValue");
console.log("-".repeat(140));

for (const r of cpoResults) {
  const init = INITIATIVE_LIBRARY.find(i => i.id === r.id)!;
  const vLow = r.valueRange?.low ?? null;
  const vHigh = r.valueRange?.high ?? null;
  console.log(
    `${r.id.padEnd(40)} | ${r.fitStatus.padEnd(14)} | ${String(r.fitScore).padStart(3)} | ${vLow !== null ? String(vLow).padStart(10) : "        N/A"} | ${vHigh !== null ? String(vHigh).padStart(10) : "        N/A"} | ${String(init.y1CostRange.low).padStart(6)} | ${String(init.y1CostRange.high).padStart(6)} | ph${init.phase} | ${init.timeToValueMonths.min}-${init.timeToValueMonths.max}mo`
  );
}

// Full JSON dump of first 5 applicable results
console.log("\n=== FULL JSON (first 5 applicable results) ===");
const applicable = cpoResults.filter(r => r.fitStatus !== "NOT_APPLICABLE" && r.fitStatus !== "HARD_GATE_FAIL").slice(0, 5);
console.log(JSON.stringify(applicable, null, 2));
