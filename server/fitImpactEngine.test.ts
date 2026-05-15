/**
 * Tests for the Fit+Impact Engine and Initiative Library
 * Covers: scoring logic, value formulas, initiative library structure
 */
import { describe, it, expect } from "vitest";
import {
  evaluateAllInitiatives,
  evaluateInitiative,
  type FitImpactEngineInputs,
} from "./services/fitImpactEngine";
import { INITIATIVE_LIBRARY } from "../shared/initiativeLibrary";
import { VALUE_FORMULA_REGISTRY } from "../shared/valueFormulas";
import { INITIATIVE_CONFIG } from "../shared/initiativeConfig";

// ── Baseline inputs for testing ───────────────────────────────────────────────
// Uses the nested section structure that the engine actually expects
const baseInputs: FitImpactEngineInputs = {
  sectionB: {
    // Include all sub-functions so no initiative fails the hard gate in baseline tests
    hrSubFunctions: [
      "resourcing",
      "hr_operations",
      "talent_management",
      "learning_development",
      "performance_management",
      "employee_experience",
      "people_analytics",
    ],
  },
  sectionA: {
    totalHeadcount: 2000,
    sectorSpecificRegulation: ["FCA", "GDPR"],
    ownershipStructure: "plc",
  },
  sectionC: {
    hrisSystem: "Workday",
    atsSystem: "Greenhouse",
    lmsSystem: "Cornerstone",
    dataQualityRating: "good",
    hrSystemIntegrationMaturity: "mostly_integrated",
    yearsOfHrisData: 4,
    workforceDigitalAccess: "all",
  },
  sectionD: {
    annualHires: 200,
    adminTimePerHire: 12,
    attritionRate: 15,
    avgTimeToFill: 45,
    annualApplicationVolume: 10000,
    costPerExternalHire: 8000,
    monthlyHrQueryVolume: 1500,
    internalHirePercent: 20,
    annualLDSpend: 500000,
    annualRevenue: 100000000,
    currentEngagementScore: 62,
    hrFteCount: 45,
    totalHrBudget: 2500000,
  },
  sectionI: {
    workforceWorkType: "knowledge",
    managerCapabilityForInsights: "Mixed",
    pivotalJobFamilies: ["Data Science", "Engineering", "Product"],
  },
  sectionF: {
    changeReadiness: "moderate",
  },
  sectionG: {
    ai_ethics_trust: 6,
  },
};

// ── Initiative Library ────────────────────────────────────────────────────────
describe("Initiative Library", () => {
  it("has exactly 12 initiatives", () => {
    expect(INITIATIVE_LIBRARY).toHaveLength(12);
  });

  it("each initiative has required fields", () => {
    for (const init of INITIATIVE_LIBRARY) {
      expect(init.id, `${init.id} missing id`).toBeTruthy();
      expect(init.label, `${init.id} missing label`).toBeTruthy();
      expect(init.category, `${init.id} missing category`).toBeTruthy();
      expect(init.softFitFactors, `${init.id} missing softFitFactors`).toBeDefined();
      expect(init.timeToValueMonths, `${init.id} missing timeToValueMonths`).toBeDefined();
      expect(typeof init.phase, `${init.id} phase not a number`).toBe("number");
      expect(init.valueFormulaKey, `${init.id} missing valueFormulaKey`).toBeTruthy();
    }
  });

  it("all initiative IDs are unique", () => {
    const ids = INITIATIVE_LIBRARY.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has value formula for each initiative", () => {
    for (const init of INITIATIVE_LIBRARY) {
      expect(VALUE_FORMULA_REGISTRY[init.valueFormulaKey], `No formula for ${init.id}`).toBeDefined();
      expect(typeof VALUE_FORMULA_REGISTRY[init.valueFormulaKey]).toBe("function");
    }
  });

  it("each initiative has at least one soft fit factor", () => {
    for (const init of INITIATIVE_LIBRARY) {
      expect(init.softFitFactors.length, `${init.id} has no soft fit factors`).toBeGreaterThan(0);
    }
  });
});

// ── Fit+Impact Engine ─────────────────────────────────────────────────────────
describe("Fit+Impact Engine", () => {
  it("returns results for all 12 initiatives", () => {
    const results = evaluateAllInitiatives(baseInputs);
    expect(results).toHaveLength(12);
  });

  it("each result has required fields", () => {
    const results = evaluateAllInitiatives(baseInputs);
    for (const r of results) {
      expect(r.id, "missing id").toBeTruthy();
      expect(r.label, "missing label").toBeTruthy();
      expect(typeof r.fitScore, "fitScore not a number").toBe("number");
      expect(r.fitStatus, "missing fitStatus").toBeTruthy();
      expect(r.fitRationale, "missing fitRationale").toBeTruthy();
      expect(Array.isArray(r.riskFlags), "riskFlags not an array").toBe(true);
      expect(Array.isArray(r.hardGateFailReasons), "hardGateFailReasons not an array").toBe(true);
    }
  });

  it("fit scores are between 0 and 100", () => {
    const results = evaluateAllInitiatives(baseInputs);
    for (const r of results) {
      expect(r.fitScore, `${r.id} fitScore out of range`).toBeGreaterThanOrEqual(0);
      expect(r.fitScore, `${r.id} fitScore out of range`).toBeLessThanOrEqual(100);
    }
  });

  it("results are sorted: STRONG_FIT first, then POSSIBLE_FIT, then POOR_FIT, then HARD_GATE_FAIL", () => {
    const results = evaluateAllInitiatives(baseInputs);
    const statusOrder: Record<string, number> = {
      STRONG_FIT: 0,
      POSSIBLE_FIT: 1,
      POOR_FIT: 2,
      HARD_GATE_FAIL: 3,
    };
    for (let i = 0; i < results.length - 1; i++) {
      const a = statusOrder[results[i].fitStatus];
      const b = statusOrder[results[i + 1].fitStatus];
      expect(a, `Sort order violated at index ${i}`).toBeLessThanOrEqual(b);
    }
  });

  it("evaluateInitiative returns HARD_GATE_FAIL when sub-functions are missing", () => {
    // high_volume_hiring_ai requires "resourcing" sub-function
    const inputs: FitImpactEngineInputs = {
      ...baseInputs,
      sectionB: { hrSubFunctions: [] }, // no sub-functions
    };
    const result = evaluateInitiative("high_volume_hiring_ai", inputs);
    expect(result.fitStatus).toBe("HARD_GATE_FAIL");
    expect(result.fitScore).toBe(0);
    expect(result.hardGateFailReasons.length).toBeGreaterThan(0);
  });

  it("poor data quality reduces fit score for data-intensive initiatives", () => {
    const goodData = evaluateInitiative("attrition_prediction", {
      ...baseInputs,
      sectionC: { ...baseInputs.sectionC, dataQualityRating: "excellent" },
    });
    const poorData = evaluateInitiative("attrition_prediction", {
      ...baseInputs,
      sectionC: { ...baseInputs.sectionC, dataQualityRating: "poor" },
    });
    expect(goodData.fitScore).toBeGreaterThan(poorData.fitScore);
  });

  it("regulatory sectors increase fit score for bias_monitoring", () => {
    const withRegs = evaluateInitiative("bias_monitoring", {
      ...baseInputs,
      sectionA: { ...baseInputs.sectionA, sectorSpecificRegulation: ["FCA", "GDPR", "EU AI Act"] },
    });
    const withoutRegs = evaluateInitiative("bias_monitoring", {
      ...baseInputs,
      sectionA: { ...baseInputs.sectionA, sectorSpecificRegulation: [] },
    });
    expect(withRegs.fitScore).toBeGreaterThan(withoutRegs.fitScore);
  });

  it("value range is non-null for non-hard-gate initiatives with sufficient data", () => {
    const result = evaluateInitiative("hr_chatbot", baseInputs);
    if (result.fitStatus !== "HARD_GATE_FAIL") {
      expect(result.valueRange).not.toBeNull();
      if (result.valueRange) {
        expect(result.valueRange.low).toBeGreaterThanOrEqual(0);
        expect(result.valueRange.high).toBeGreaterThanOrEqual(result.valueRange.low);
        expect(result.valueRange.currency).toBe("GBP");
      }
    }
  });

  it("high hire volume improves fit for interview_scheduling", () => {
    const highVolume = evaluateInitiative("interview_scheduling", {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, annualHires: 1000 },
    });
    const lowVolume = evaluateInitiative("interview_scheduling", {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, annualHires: 10 },
    });
    expect(highVolume.fitScore).toBeGreaterThan(lowVolume.fitScore);
  });

  it("low engagement score improves fit for engagement_ai", () => {
    const lowEngagement = evaluateInitiative("engagement_ai", {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, currentEngagementScore: 40 },
    });
    const highEngagement = evaluateInitiative("engagement_ai", {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, currentEngagementScore: 85 },
    });
    expect(lowEngagement.fitScore).toBeGreaterThan(highEngagement.fitScore);
  });

  it("risk flags are generated for poor conditions", () => {
    const result = evaluateInitiative("attrition_prediction", {
      ...baseInputs,
      sectionC: { ...baseInputs.sectionC, yearsOfHrisData: 1 }, // insufficient data
      sectionI: { ...baseInputs.sectionI, managerCapabilityForInsights: "Weak" },
    });
    expect(result.riskFlags.length).toBeGreaterThan(0);
  });

  it("returns at least one STRONG_FIT or POSSIBLE_FIT initiative for well-configured org", () => {
    const results = evaluateAllInitiatives(baseInputs);
    const goodFit = results.filter(r => r.fitStatus === "STRONG_FIT" || r.fitStatus === "POSSIBLE_FIT");
    expect(goodFit.length).toBeGreaterThan(0);
  });

  it("throws when evaluating an unknown initiative ID", () => {
    expect(() => evaluateInitiative("nonexistent_initiative", baseInputs)).toThrow();
  });
});

// ── Value Formulas ────────────────────────────────────────────────────────────
describe("Value Formulas", () => {
  it("highVolumeHiring returns positive value for valid inputs", () => {
    const result = VALUE_FORMULA_REGISTRY.highVolumeHiring(baseInputs);
    expect(result.low).toBeGreaterThan(0);
    expect(result.high).toBeGreaterThan(result.low);
    expect(result.currency).toBe("GBP");
  });

  it("hrChatbot returns positive value for valid inputs", () => {
    const result = VALUE_FORMULA_REGISTRY.hrChatbot(baseInputs);
    expect(result.low).toBeGreaterThan(0);
    expect(result.high).toBeGreaterThan(result.low);
  });

  it("attritionPrediction returns positive value for valid inputs", () => {
    const result = VALUE_FORMULA_REGISTRY.attritionPrediction(baseInputs);
    expect(result.low).toBeGreaterThan(0);
    expect(result.high).toBeGreaterThan(result.low);
  });

  it("ldPersonalisation returns positive value for valid inputs", () => {
    const result = VALUE_FORMULA_REGISTRY.ldPersonalisation(baseInputs);
    expect(result.low).toBeGreaterThan(0);
  });

  it("offerGeneration returns positive value for valid inputs", () => {
    const result = VALUE_FORMULA_REGISTRY.offerGeneration(baseInputs);
    expect(result.low).toBeGreaterThan(0);
  });

  it("interviewScheduling returns positive value for valid inputs", () => {
    const result = VALUE_FORMULA_REGISTRY.interviewScheduling(baseInputs);
    expect(result.low).toBeGreaterThan(0);
  });

  it("onboardingPersonalisation returns positive value for valid inputs", () => {
    const result = VALUE_FORMULA_REGISTRY.onboardingPersonalisation(baseInputs);
    expect(result.low).toBeGreaterThan(0);
  });

  it("skillsInference returns positive value for valid inputs", () => {
    const result = VALUE_FORMULA_REGISTRY.skillsInference(baseInputs);
    expect(result.low).toBeGreaterThan(0);
  });

  it("biasMonitoring returns scenario-based value", () => {
    const result = VALUE_FORMULA_REGISTRY.biasMonitoring(baseInputs);
    expect(result.low).toBeGreaterThan(0);
    expect(result.high).toBeGreaterThan(0);
    expect(result.isIndicative).toBe(false);
  });

  it("value scales with headcount for performanceAI", () => {
    const smallOrg = VALUE_FORMULA_REGISTRY.performanceAI({
      ...baseInputs,
      sectionA: { ...baseInputs.sectionA, totalHeadcount: 100 },
    });
    const largeOrg = VALUE_FORMULA_REGISTRY.performanceAI({
      ...baseInputs,
      sectionA: { ...baseInputs.sectionA, totalHeadcount: 10000 },
    });
    expect(largeOrg.low).toBeGreaterThan(smallOrg.low);
  });

  it("value scales with hire volume for highVolumeHiring", () => {
    const smallHires = VALUE_FORMULA_REGISTRY.highVolumeHiring({
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, annualHires: 20, adminTimePerHire: 10 },
    });
    const largeHires = VALUE_FORMULA_REGISTRY.highVolumeHiring({
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, annualHires: 500, adminTimePerHire: 15 },
    });
    expect(largeHires.low).toBeGreaterThan(smallHires.low);
  });

  it("all formulas return valid ValueRange shape", () => {
    for (const [key, fn] of Object.entries(VALUE_FORMULA_REGISTRY)) {
      const result = fn(baseInputs);
      expect(result.currency, `${key}: missing currency`).toBe("GBP");
      expect(typeof result.low, `${key}: low not a number`).toBe("number");
      expect(typeof result.high, `${key}: high not a number`).toBe("number");
      expect(result.high, `${key}: high < low`).toBeGreaterThanOrEqual(result.low);
      expect(typeof result.isIndicative, `${key}: isIndicative not boolean`).toBe("boolean");
      expect(typeof result.narrative, `${key}: narrative not string`).toBe("string");
    }
  });
});

// ── Initiative Config ─────────────────────────────────────────────────────────
describe("Initiative Config", () => {
  it("has manager capability multipliers", () => {
    expect(INITIATIVE_CONFIG.managerCapabilityMultipliers).toBeDefined();
    expect(INITIATIVE_CONFIG.managerCapabilityMultipliers.strong).toBe(0.7);
    expect(INITIATIVE_CONFIG.managerCapabilityMultipliers.mixed).toBe(0.5);
    expect(INITIATIVE_CONFIG.managerCapabilityMultipliers.variable).toBe(0.45);
    expect(INITIATIVE_CONFIG.managerCapabilityMultipliers.weak).toBe(0.3);
  });

  it("has ambition tier multipliers", () => {
    expect(INITIATIVE_CONFIG.ambitionTierMultipliers).toBeDefined();
    expect(INITIATIVE_CONFIG.ambitionTierMultipliers.conservative).toBeLessThan(
      INITIATIVE_CONFIG.ambitionTierMultipliers.transformative
    );
    expect(INITIATIVE_CONFIG.ambitionTierMultipliers.pragmatic).toBe(0.8);
    expect(INITIATIVE_CONFIG.ambitionTierMultipliers.innovator).toBe(1.0);
  });

  it("has data quality multipliers", () => {
    expect(INITIATIVE_CONFIG.dataQualityMultipliers).toBeDefined();
    expect(INITIATIVE_CONFIG.dataQualityMultipliers.poor).toBeLessThan(
      INITIATIVE_CONFIG.dataQualityMultipliers.excellent
    );
    expect(INITIATIVE_CONFIG.dataQualityMultipliers.good).toBe(0.8);
    expect(INITIATIVE_CONFIG.dataQualityMultipliers.fair).toBe(0.6);
  });

  it("ambition tier multipliers are in ascending order", () => {
    const m = INITIATIVE_CONFIG.ambitionTierMultipliers;
    expect(m.conservative).toBeLessThan(m.pragmatic);
    expect(m.pragmatic).toBeLessThan(m.innovator);
    expect(m.innovator).toBeLessThan(m.transformative);
  });

  it("data quality multipliers are in ascending order", () => {
    const m = INITIATIVE_CONFIG.dataQualityMultipliers;
    expect(m.poor).toBeLessThan(m.fair);
    expect(m.fair).toBeLessThan(m.good);
    expect(m.good).toBeLessThan(m.excellent);
  });

  it("has fit scoring thresholds", () => {
    expect(INITIATIVE_CONFIG.fitScoring.strongFitThreshold).toBeGreaterThan(
      INITIATIVE_CONFIG.fitScoring.possibleFitThreshold
    );
  });

  it("has working time constants", () => {
    expect(INITIATIVE_CONFIG.annualWorkingHours).toBeGreaterThan(0);
    expect(INITIATIVE_CONFIG.workingDaysPerYear).toBeGreaterThan(0);
  });
});
