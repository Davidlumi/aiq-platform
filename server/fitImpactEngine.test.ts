/**
 * Fit + Impact Engine — Vitest test suite (v3, 49 initiatives)
 *
 * Tests:
 *   1. Initiative library structure (49 initiatives, unique IDs, valid formula keys)
 *   2. Engine scoring: hard gate failures, fit classification, sorting
 *   3. Specific initiative scoring behaviour
 *   4. Value formulas: all 49 return valid ValueRange shapes
 *   5. Config: multiplier tables present and ordered correctly
 */
import { describe, it, expect } from "vitest";
import {
  evaluateAllInitiatives,
  evaluateInitiative,
  type FitImpactEngineInputs,
} from "./services/fitImpactEngine";
import { INITIATIVE_LIBRARY, INITIATIVE_IDS } from "../shared/initiativeLibrary";
import { VALUE_FORMULA_REGISTRY } from "../shared/valueFormulas";
import { INITIATIVE_CONFIG } from "../shared/initiativeConfig";

// ── Baseline inputs ───────────────────────────────────────────────────────────

const baseInputs: FitImpactEngineInputs = {
  sectionB: {
    hrSubFunctions: [
      "resourcing",
      "hr_operations",
      "talent_management",
      "learning_development",
      "performance_management",
      "employee_experience",
      "people_analytics",
      "reward",
    ],
  },
  sectionA: {
    totalHeadcount: 3000,
    ukSitesCount: 15,
    sectorSpecificRegulation: ["gdpr", "equality_act"],
    ownershipStructure: "plc",
    sector: "financial_services",
  },
  sectionC: {
    hrisSystem: "Workday",
    atsSystem: "Greenhouse",
    lmsSystem: "Cornerstone",
    dataQualityRating: "good",
    hrSystemIntegrationMaturity: "mostly_integrated",
    yearsOfHrisData: 5,
    workforceDigitalAccess: "all",
  },
  sectionD: {
    annualHires: 300,
    adminTimePerHire: 12,
    adminTimePerHireIsEstimate: false,
    totalHrBudget: 2000000,
    totalHrBudgetIsEstimate: false,
    attritionRate: 18,
    attritionRateIsEstimate: false,
    avgTimeToFill: 45,
    annualApplicationVolume: 15000,
    costPerExternalHire: 8000,
    costPerExternalHireIsEstimate: false,
    annualContractorSpend: 500000,
    annualContractorSpendIsEstimate: false,
    monthlyHrQueryVolume: 1500,
    internalHirePercent: 25,
    annualLDSpend: 600000,
    annualLDSpendIsEstimate: false,
    annualRevenue: 500000000,
    annualRevenueIsEstimate: false,
    currentEngagementScore: 58,
    hrFteCount: 25,
  },
  sectionI: {
    workforceWorkType: "knowledge",
    workforceComposition: "mixed",
    businessDirectionType: "scaling",
    geographicDistribution: "uk_multi_site",
    managerCapabilityForInsights: "Mixed",
    skillsFrameworkStatus: "partial",
    skillsInventoryCompleteness: "partial",
    pivotalJobFamilies: ["engineering", "sales", "product"],
    employeeExperienceState: "developing",
  },
  sectionF: {
    changeReadiness: "moderate",
  },
  sectionG: {
    ai_ethics_trust: 7,
  },
};

// ── 1. Initiative Library ─────────────────────────────────────────────────────

describe("Initiative Library", () => {
  it("has exactly 49 initiatives", () => {
    expect(INITIATIVE_LIBRARY).toHaveLength(49);
  });

  it("exports INITIATIVE_IDS with 49 entries", () => {
    expect(INITIATIVE_IDS).toHaveLength(49);
  });

  it("all initiative IDs are unique", () => {
    const ids = INITIATIVE_LIBRARY.map((i) => i.id);
    expect(new Set(ids).size).toBe(49);
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

  it("every initiative has a registered value formula", () => {
    for (const init of INITIATIVE_LIBRARY) {
      expect(
        VALUE_FORMULA_REGISTRY[init.valueFormulaKey],
        `Missing formula for ${init.id} (key: ${init.valueFormulaKey})`
      ).toBeDefined();
    }
  });

  it("every initiative has at least one soft fit factor", () => {
    for (const init of INITIATIVE_LIBRARY) {
      expect(init.softFitFactors.length, `${init.id} has no soft fit factors`).toBeGreaterThan(0);
    }
  });

  it("soft fit factors for each initiative sum to exactly 100", () => {
    for (const init of INITIATIVE_LIBRARY) {
      const total = init.softFitFactors.reduce((sum, f) => sum + f.maxScore, 0);
      expect(total, `${init.id} soft fit factors sum to ${total}, expected 100`).toBe(100);
    }
  });

  it("every initiative has a valid category", () => {
    const validCategories = [
      "talent_acquisition", "onboarding", "learning_development", "internal_mobility",
      "performance_management", "employee_experience", "retention", "hr_operations",
      "workforce_planning", "compensation_reward", "manager_effectiveness", "governance",
      "frontline_workforce",
    ];
    for (const init of INITIATIVE_LIBRARY) {
      expect(validCategories, `${init.id} has invalid category: ${init.category}`).toContain(init.category);
    }
  });

  it("contains all expected v3 initiative IDs", () => {
    const expectedIds = [
      "ta_high_volume_hiring", "ta_candidate_chatbot", "ta_interview_scheduling",
      "ta_sourcing_matching", "ta_video_interview_assessment", "ta_bias_monitoring",
      "ta_recruiter_productivity_ai", "ta_offer_generation", "ta_jd_optimization",
      "on_personalised_journeys", "on_new_hire_chatbot", "on_documentation_automation", "on_buddy_matching",
      "ld_personalised_learning", "ld_workforce_reskilling", "ld_ai_coaching",
      "ld_compliance_training", "ld_content_creation", "ld_knowledge_management",
      "im_talent_marketplace", "im_skills_inference", "im_mentor_matching",
      "pm_continuous_performance", "pm_review_writing", "pm_okr_goal_alignment",
      "ee_sentiment_listening", "ee_recognition_rewards", "ee_wellbeing_burnout", "ee_internal_comms_ai",
      "rt_flight_risk_prediction", "rt_stay_interview_ai", "rt_exit_intelligence",
      "hr_virtual_assistant", "hr_policy_generation", "hr_benefits_decision_support",
      "wp_workforce_planning", "wp_succession_planning", "wp_org_design", "wp_location_strategy",
      "cr_pay_equity", "cr_compensation_recommendations",
      "mg_manager_copilot", "mg_difficult_conversations",
      "gv_ai_governance", "gv_cross_cutting_bias_audit",
      "fw_shift_scheduling_ai", "fw_frontline_learning", "fw_frontline_communication", "fw_store_manager_assistant",
    ];
    for (const id of expectedIds) {
      expect(INITIATIVE_IDS, `Missing initiative ID: ${id}`).toContain(id);
    }
  });
});

// ── 2. Engine: hard gate failures ────────────────────────────────────────────

describe("Engine: hard gate failures", () => {
  it("returns HARD_GATE_FAIL when required sub-function is missing", () => {
    const inputs: FitImpactEngineInputs = {
      ...baseInputs,
      sectionB: { hrSubFunctions: [] },
    };
    const result = evaluateInitiative("ta_high_volume_hiring", inputs);
    expect(result.fitStatus).toBe("HARD_GATE_FAIL");
    expect(result.fitScore).toBe(0);
    expect(result.hardGateFailReasons.length).toBeGreaterThan(0);
  });

  it("returns HARD_GATE_FAIL when required data field is missing", () => {
    const inputs: FitImpactEngineInputs = {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, annualHires: undefined, annualApplicationVolume: undefined },
    };
    const result = evaluateInitiative("ta_high_volume_hiring", inputs);
    expect(result.fitStatus).toBe("HARD_GATE_FAIL");
  });

  it("returns non-zero fitScore when all gates pass", () => {
    const result = evaluateInitiative("ta_high_volume_hiring", baseInputs);
    expect(result.fitStatus).not.toBe("HARD_GATE_FAIL");
    expect(result.fitScore).toBeGreaterThan(0);
  });

  it("throws when evaluating an unknown initiative ID", () => {
    expect(() => evaluateInitiative("nonexistent_initiative", baseInputs)).toThrow();
  });

  it("returns valueRange null for HARD_GATE_FAIL", () => {
    const inputs: FitImpactEngineInputs = {
      ...baseInputs,
      sectionB: { hrSubFunctions: [] },
    };
    const result = evaluateInitiative("ta_high_volume_hiring", inputs);
    expect(result.valueRange).toBeNull();
  });
});

// ── 3. Engine: fit classification and sorting ─────────────────────────────────

describe("Engine: fit classification and sorting", () => {
  it("returns exactly 49 results", () => {
    const results = evaluateAllInitiatives(baseInputs);
    expect(results).toHaveLength(49);
  });

  it("each result has required fields", () => {
    const results = evaluateAllInitiatives(baseInputs);
    for (const r of results) {
      expect(r.id, "missing id").toBeTruthy();
      expect(r.label, "missing label").toBeTruthy();
      expect(r.category, "missing category").toBeTruthy();
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

  it("sorts STRONG_FIT → POSSIBLE_FIT → POOR_FIT → HARD_GATE_FAIL", () => {
    const results = evaluateAllInitiatives(baseInputs);
    const statusOrder: Record<string, number> = {
      STRONG_FIT: 0, POSSIBLE_FIT: 1, POOR_FIT: 2, HARD_GATE_FAIL: 3,
    };
    for (let i = 0; i < results.length - 1; i++) {
      const a = statusOrder[results[i].fitStatus];
      const b = statusOrder[results[i + 1].fitStatus];
      expect(a, `Sort order violated at index ${i}`).toBeLessThanOrEqual(b);
    }
  });

  it("within same status, sorts by fitScore descending", () => {
    const results = evaluateAllInitiatives(baseInputs);
    const grouped: Record<string, typeof results> = {};
    for (const r of results) {
      if (!grouped[r.fitStatus]) grouped[r.fitStatus] = [];
      grouped[r.fitStatus].push(r);
    }
    for (const group of Object.values(grouped)) {
      for (let i = 0; i < group.length - 1; i++) {
        expect(group[i].fitScore).toBeGreaterThanOrEqual(group[i + 1].fitScore);
      }
    }
  });

  it("returns at least one STRONG_FIT or POSSIBLE_FIT for a well-configured org", () => {
    const results = evaluateAllInitiatives(baseInputs);
    const goodFit = results.filter((r) => r.fitStatus === "STRONG_FIT" || r.fitStatus === "POSSIBLE_FIT");
    expect(goodFit.length).toBeGreaterThan(0);
  });

  it("classifies STRONG_FIT when score >= 70", () => {
    const inputs: FitImpactEngineInputs = {
      ...baseInputs,
      sectionD: {
        ...baseInputs.sectionD,
        annualHires: 800,
        annualApplicationVolume: 80000,
        adminTimePerHire: 30,
      },
      sectionC: { ...baseInputs.sectionC, dataQualityRating: "excellent" },
      sectionI: { ...baseInputs.sectionI, workforceComposition: "frontline_heavy" },
    };
    const result = evaluateInitiative("ta_high_volume_hiring", inputs);
    expect(result.fitScore).toBeGreaterThanOrEqual(70);
    expect(result.fitStatus).toBe("STRONG_FIT");
  });

  it("returns non-null valueRange for non-HARD_GATE_FAIL initiatives", () => {
    const result = evaluateInitiative("hr_virtual_assistant", baseInputs);
    expect(result.fitStatus).not.toBe("HARD_GATE_FAIL");
    expect(result.valueRange).not.toBeNull();
    if (result.valueRange) {
      expect(result.valueRange.low).toBeGreaterThanOrEqual(0);
      expect(result.valueRange.high).toBeGreaterThanOrEqual(result.valueRange.low);
      expect(result.valueRange.currency).toBe("GBP");
    }
  });
});

// ── 4. Specific initiative scoring behaviour ──────────────────────────────────

describe("Specific initiative scoring", () => {
  it("rt_flight_risk_prediction scores higher with more HRIS data", () => {
    const lowData: FitImpactEngineInputs = {
      ...baseInputs,
      sectionC: { ...baseInputs.sectionC, yearsOfHrisData: 1 },
    };
    const highData: FitImpactEngineInputs = {
      ...baseInputs,
      sectionC: { ...baseInputs.sectionC, yearsOfHrisData: 7 },
    };
    const low = evaluateInitiative("rt_flight_risk_prediction", lowData);
    const high = evaluateInitiative("rt_flight_risk_prediction", highData);
    expect(high.fitScore).toBeGreaterThan(low.fitScore);
  });

  it("fw_shift_scheduling_ai scores higher with frontline_heavy composition", () => {
    const knowledge: FitImpactEngineInputs = {
      ...baseInputs,
      sectionI: { ...baseInputs.sectionI, workforceComposition: "knowledge_heavy" },
    };
    const frontline: FitImpactEngineInputs = {
      ...baseInputs,
      sectionI: { ...baseInputs.sectionI, workforceComposition: "frontline_heavy" },
    };
    const kResult = evaluateInitiative("fw_shift_scheduling_ai", knowledge);
    const fResult = evaluateInitiative("fw_shift_scheduling_ai", frontline);
    expect(fResult.fitScore).toBeGreaterThan(kResult.fitScore);
  });

  it("ld_workforce_reskilling scores higher with transformation direction", () => {
    const steady: FitImpactEngineInputs = {
      ...baseInputs,
      sectionI: { ...baseInputs.sectionI, businessDirectionType: "steady_state" },
    };
    const transform: FitImpactEngineInputs = {
      ...baseInputs,
      sectionI: { ...baseInputs.sectionI, businessDirectionType: "transformation" },
    };
    const sResult = evaluateInitiative("ld_workforce_reskilling", steady);
    const tResult = evaluateInitiative("ld_workforce_reskilling", transform);
    expect(tResult.fitScore).toBeGreaterThan(sResult.fitScore);
  });

  it("mg_difficult_conversations scores higher with Weak manager capability", () => {
    const strong: FitImpactEngineInputs = {
      ...baseInputs,
      sectionI: { ...baseInputs.sectionI, managerCapabilityForInsights: "Strong" },
    };
    const weak: FitImpactEngineInputs = {
      ...baseInputs,
      sectionI: { ...baseInputs.sectionI, managerCapabilityForInsights: "Weak" },
    };
    const sResult = evaluateInitiative("mg_difficult_conversations", strong);
    const wResult = evaluateInitiative("mg_difficult_conversations", weak);
    expect(wResult.fitScore).toBeGreaterThan(sResult.fitScore);
  });

  it("ta_bias_monitoring scores higher in regulated sectors", () => {
    const unregulated: FitImpactEngineInputs = {
      ...baseInputs,
      sectionA: { ...baseInputs.sectionA, sectorSpecificRegulation: [] },
    };
    const regulated: FitImpactEngineInputs = {
      ...baseInputs,
      sectionA: { ...baseInputs.sectionA, sectorSpecificRegulation: ["gdpr", "equality_act", "fca"] },
    };
    const uResult = evaluateInitiative("ta_bias_monitoring", unregulated);
    const rResult = evaluateInitiative("ta_bias_monitoring", regulated);
    expect(rResult.fitScore).toBeGreaterThan(uResult.fitScore);
  });

  it("im_skills_inference scores higher with more HRIS data", () => {
    const lowData: FitImpactEngineInputs = {
      ...baseInputs,
      sectionC: { ...baseInputs.sectionC, yearsOfHrisData: 1 },
    };
    const highData: FitImpactEngineInputs = {
      ...baseInputs,
      sectionC: { ...baseInputs.sectionC, yearsOfHrisData: 8 },
    };
    const lResult = evaluateInitiative("im_skills_inference", lowData);
    const hResult = evaluateInitiative("im_skills_inference", highData);
    expect(hResult.fitScore).toBeGreaterThan(lResult.fitScore);
  });

  it("ta_interview_scheduling scores higher with high hire volume", () => {
    const lowVol: FitImpactEngineInputs = {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, annualHires: 20 },
    };
    const highVol: FitImpactEngineInputs = {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, annualHires: 800 },
    };
    const lResult = evaluateInitiative("ta_interview_scheduling", lowVol);
    const hResult = evaluateInitiative("ta_interview_scheduling", highVol);
    expect(hResult.fitScore).toBeGreaterThan(lResult.fitScore);
  });

  it("poor data quality reduces fit score for data-intensive initiatives", () => {
    const goodData: FitImpactEngineInputs = {
      ...baseInputs,
      sectionC: { ...baseInputs.sectionC, dataQualityRating: "excellent" },
    };
    const poorData: FitImpactEngineInputs = {
      ...baseInputs,
      sectionC: { ...baseInputs.sectionC, dataQualityRating: "poor" },
    };
    const gResult = evaluateInitiative("rt_flight_risk_prediction", goodData);
    const pResult = evaluateInitiative("rt_flight_risk_prediction", poorData);
    expect(gResult.fitScore).toBeGreaterThan(pResult.fitScore);
  });

  it("risk flags are generated for poor conditions", () => {
    const result = evaluateInitiative("rt_flight_risk_prediction", {
      ...baseInputs,
      sectionC: { ...baseInputs.sectionC, yearsOfHrisData: 1 },
      sectionI: { ...baseInputs.sectionI, managerCapabilityForInsights: "Weak" },
    });
    expect(result.riskFlags.length).toBeGreaterThan(0);
  });
});

// ── 5. Value formulas ─────────────────────────────────────────────────────────

describe("Value Formulas", () => {
  it("VALUE_FORMULA_REGISTRY has exactly 49 entries", () => {
    expect(Object.keys(VALUE_FORMULA_REGISTRY)).toHaveLength(49);
  });

  it("all 49 registered formulas return valid ValueRange shapes", () => {
    for (const [key, fn] of Object.entries(VALUE_FORMULA_REGISTRY)) {
      const result = fn(baseInputs);
      expect(result.low, `${key}.low is not a number`).toBeTypeOf("number");
      expect(result.high, `${key}.high is not a number`).toBeTypeOf("number");
      expect(result.high, `${key}.high should be >= low`).toBeGreaterThanOrEqual(result.low);
      expect(result.currency, `${key}.currency should be GBP`).toBe("GBP");
      expect(typeof result.isIndicative, `${key}.isIndicative not boolean`).toBe("boolean");
      expect(result.narrative, `${key}.narrative should be a string`).toBeTypeOf("string");
      expect(result.narrative.length, `${key}.narrative should not be empty`).toBeGreaterThan(0);
    }
  });

  it("rt_flight_risk_prediction value scales with attrition rate", () => {
    const lowAttrition: FitImpactEngineInputs = {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, attritionRate: 5 },
    };
    const highAttrition: FitImpactEngineInputs = {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, attritionRate: 30 },
    };
    const lowResult = VALUE_FORMULA_REGISTRY.rt_flight_risk_prediction(lowAttrition);
    const highResult = VALUE_FORMULA_REGISTRY.rt_flight_risk_prediction(highAttrition);
    expect(highResult.high).toBeGreaterThan(lowResult.high);
  });

  it("ta_high_volume_hiring value scales with hire volume", () => {
    const smallHires: FitImpactEngineInputs = {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, annualHires: 50, annualApplicationVolume: 2000 },
    };
    const largeHires: FitImpactEngineInputs = {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, annualHires: 1000, annualApplicationVolume: 50000 },
    };
    const smallResult = VALUE_FORMULA_REGISTRY.ta_high_volume_hiring(smallHires);
    const largeResult = VALUE_FORMULA_REGISTRY.ta_high_volume_hiring(largeHires);
    expect(largeResult.high).toBeGreaterThan(smallResult.high);
  });

  it("hr_virtual_assistant value scales with query volume", () => {
    const lowQueries: FitImpactEngineInputs = {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, monthlyHrQueryVolume: 100 },
    };
    const highQueries: FitImpactEngineInputs = {
      ...baseInputs,
      sectionD: { ...baseInputs.sectionD, monthlyHrQueryVolume: 5000 },
    };
    const lowResult = VALUE_FORMULA_REGISTRY.hr_virtual_assistant(lowQueries);
    const highResult = VALUE_FORMULA_REGISTRY.hr_virtual_assistant(highQueries);
    expect(highResult.high).toBeGreaterThan(lowResult.high);
  });

  it("ld_personalised_learning value scales with headcount", () => {
    const small: FitImpactEngineInputs = {
      ...baseInputs,
      sectionA: { ...baseInputs.sectionA, totalHeadcount: 100 },
    };
    const large: FitImpactEngineInputs = {
      ...baseInputs,
      sectionA: { ...baseInputs.sectionA, totalHeadcount: 10000 },
    };
    const smallResult = VALUE_FORMULA_REGISTRY.ld_personalised_learning(small);
    const largeResult = VALUE_FORMULA_REGISTRY.ld_personalised_learning(large);
    expect(largeResult.high).toBeGreaterThan(smallResult.high);
  });
});

// ── 6. Config validation ──────────────────────────────────────────────────────

describe("Initiative Config", () => {
  it("has ambitionTierMultipliers with correct keys", () => {
    const m = INITIATIVE_CONFIG.ambitionTierMultipliers;
    expect(m).toBeDefined();
    expect(m.conservative).toBeDefined();
    expect(m.pragmatic).toBeDefined();
    expect(m.innovator).toBeDefined();
    expect(m.transformative).toBeDefined();
  });

  it("ambitionTierMultipliers are in ascending order", () => {
    const m = INITIATIVE_CONFIG.ambitionTierMultipliers;
    expect(m.conservative).toBeLessThanOrEqual(m.pragmatic);
    expect(m.pragmatic).toBeLessThanOrEqual(m.innovator);
    expect(m.innovator).toBeLessThanOrEqual(m.transformative);
  });

  it("has dataQualityMultipliers with correct keys", () => {
    const m = INITIATIVE_CONFIG.dataQualityMultipliers;
    expect(m).toBeDefined();
    expect(m.poor).toBeDefined();
    expect(m.fair).toBeDefined();
    expect(m.good).toBeDefined();
    expect(m.excellent).toBeDefined();
  });

  it("dataQualityMultipliers are in ascending order", () => {
    const m = INITIATIVE_CONFIG.dataQualityMultipliers;
    expect(m.poor).toBeLessThanOrEqual(m.fair);
    expect(m.fair).toBeLessThanOrEqual(m.good);
    expect(m.good).toBeLessThanOrEqual(m.excellent);
  });

  it("has managerCapabilityMultipliers with correct keys", () => {
    const m = INITIATIVE_CONFIG.managerCapabilityMultipliers;
    expect(m).toBeDefined();
    expect(m.Weak).toBeDefined();
    expect(m.Mixed).toBeDefined();
    expect(m.Strong).toBeDefined();
  });

  it("managerCapabilityMultipliers: Weak <= Mixed <= Strong", () => {
    const m = INITIATIVE_CONFIG.managerCapabilityMultipliers;
    expect(m.Weak).toBeLessThanOrEqual(m.Mixed);
    expect(m.Mixed).toBeLessThanOrEqual(m.Strong);
  });

  it("has fitScoring thresholds", () => {
    expect(INITIATIVE_CONFIG.fitScoring.strongFitThreshold).toBeGreaterThan(
      INITIATIVE_CONFIG.fitScoring.possibleFitThreshold
    );
  });

  it("has confidence thresholds", () => {
    expect(INITIATIVE_CONFIG.confidence.highMaxEstimateCount).toBeLessThan(
      INITIATIVE_CONFIG.confidence.mediumMaxEstimateCount
    );
  });

  it("has defaults with required fields", () => {
    const d = INITIATIVE_CONFIG.defaults;
    expect(d.avgSalaryFallback).toBeGreaterThan(0);
    expect(d.attritionCostMultiplier).toBeGreaterThan(0);
    expect(d.managerFraction).toBeGreaterThan(0);
    expect(d.workingDaysPerYear).toBeGreaterThan(0);
  });
});

// ── 7. scoreFrontlinePercent evaluator ───────────────────────────────────────

describe("scoreFrontlinePercent evaluator", () => {
  // Helper: build inputs with a given frontlineHeadcountPercent
  const withPercent = (pct: number | undefined): FitImpactEngineInputs => ({
    ...baseInputs,
    sectionI: { ...baseInputs.sectionI, frontlineHeadcountPercent: pct },
  });

  // ── Monotonicity: higher percent → higher score on frontline initiatives ──

  it("fw_shift_scheduling_ai scores increase monotonically with frontline percent", () => {
    const p0   = evaluateInitiative("fw_shift_scheduling_ai", withPercent(0));
    const p10  = evaluateInitiative("fw_shift_scheduling_ai", withPercent(10));
    const p30  = evaluateInitiative("fw_shift_scheduling_ai", withPercent(30));
    const p50  = evaluateInitiative("fw_shift_scheduling_ai", withPercent(50));
    const p70  = evaluateInitiative("fw_shift_scheduling_ai", withPercent(70));
    expect(p10.fitScore).toBeGreaterThan(p0.fitScore);
    expect(p30.fitScore).toBeGreaterThan(p10.fitScore);
    expect(p50.fitScore).toBeGreaterThan(p30.fitScore);
    expect(p70.fitScore).toBeGreaterThanOrEqual(p50.fitScore);
  });

  it("fw_frontline_learning scores increase monotonically with frontline percent", () => {
    const low  = evaluateInitiative("fw_frontline_learning", withPercent(5));
    const mid  = evaluateInitiative("fw_frontline_learning", withPercent(35));
    const high = evaluateInitiative("fw_frontline_learning", withPercent(75));
    expect(mid.fitScore).toBeGreaterThan(low.fitScore);
    expect(high.fitScore).toBeGreaterThan(mid.fitScore);
  });

  it("fw_frontline_communication scores increase monotonically with frontline percent", () => {
    const low  = evaluateInitiative("fw_frontline_communication", withPercent(5));
    const mid  = evaluateInitiative("fw_frontline_communication", withPercent(35));
    const high = evaluateInitiative("fw_frontline_communication", withPercent(75));
    expect(mid.fitScore).toBeGreaterThan(low.fitScore);
    expect(high.fitScore).toBeGreaterThan(mid.fitScore);
  });

  it("fw_store_manager_assistant scores increase monotonically with frontline percent", () => {
    const low  = evaluateInitiative("fw_store_manager_assistant", withPercent(5));
    const high = evaluateInitiative("fw_store_manager_assistant", withPercent(70));
    expect(high.fitScore).toBeGreaterThan(low.fitScore);
  });

  it("mg_manager_copilot scores increase monotonically with frontline percent", () => {
    const low  = evaluateInitiative("mg_manager_copilot", withPercent(5));
    const high = evaluateInitiative("mg_manager_copilot", withPercent(70));
    expect(high.fitScore).toBeGreaterThan(low.fitScore);
  });

  it("ee_recognition_rewards scores increase monotonically with frontline percent", () => {
    const low  = evaluateInitiative("ee_recognition_rewards", withPercent(5));
    const high = evaluateInitiative("ee_recognition_rewards", withPercent(70));
    expect(high.fitScore).toBeGreaterThan(low.fitScore);
  });

  it("ld_compliance_training scores increase monotonically with frontline percent", () => {
    const low  = evaluateInitiative("ld_compliance_training", withPercent(5));
    const high = evaluateInitiative("ld_compliance_training", withPercent(70));
    expect(high.fitScore).toBeGreaterThan(low.fitScore);
  });

  // ── Boundary: unknown/undefined percent returns 0 contribution ──

  it("fw_shift_scheduling_ai with undefined percent scores same as percent=0", () => {
    const undef  = evaluateInitiative("fw_shift_scheduling_ai", withPercent(undefined));
    const zero   = evaluateInitiative("fw_shift_scheduling_ai", withPercent(0));
    expect(undef.fitScore).toBe(zero.fitScore);
  });

  // ── Threshold bands: verify score brackets ──

  it("fw_frontline_learning: percent=60 earns full maxScore for frontline_percent factor (15 pts)", () => {
    // With percent=60 and all other factors at their base level, the frontline_percent
    // factor should contribute its full 15 pts. We verify the score is strictly higher
    // than percent=59 (which is in the 75% band = 11 pts).
    const p59 = evaluateInitiative("fw_frontline_learning", withPercent(59));
    const p60 = evaluateInitiative("fw_frontline_learning", withPercent(60));
    expect(p60.fitScore).toBeGreaterThan(p59.fitScore);
  });

  it("fw_frontline_learning: percent=40 earns 75% band (higher than percent=39)", () => {
    const p39 = evaluateInitiative("fw_frontline_learning", withPercent(39));
    const p40 = evaluateInitiative("fw_frontline_learning", withPercent(40));
    expect(p40.fitScore).toBeGreaterThan(p39.fitScore);
  });

  it("fw_frontline_learning: percent=20 earns 45% band (higher than percent=19)", () => {
    const p19 = evaluateInitiative("fw_frontline_learning", withPercent(19));
    const p20 = evaluateInitiative("fw_frontline_learning", withPercent(20));
    expect(p20.fitScore).toBeGreaterThan(p19.fitScore);
  });

  // ── Differentiation: percent provides extra signal beyond categorical composition ──

  it("fw_shift_scheduling_ai: 70% frontline scores higher than 25% even when both are 'mixed' composition", () => {
    const mixed25: FitImpactEngineInputs = {
      ...baseInputs,
      sectionI: { ...baseInputs.sectionI, workforceComposition: "mixed", frontlineHeadcountPercent: 25 },
    };
    const mixed70: FitImpactEngineInputs = {
      ...baseInputs,
      sectionI: { ...baseInputs.sectionI, workforceComposition: "mixed", frontlineHeadcountPercent: 70 },
    };
    expect(evaluateInitiative("fw_shift_scheduling_ai", mixed70).fitScore)
      .toBeGreaterThan(evaluateInitiative("fw_shift_scheduling_ai", mixed25).fitScore);
  });

  // ── Initiatives NOT using frontline_percent are unaffected ──

  it("ta_high_volume_hiring score is unaffected by frontlineHeadcountPercent", () => {
    const low  = evaluateInitiative("ta_high_volume_hiring", withPercent(5));
    const high = evaluateInitiative("ta_high_volume_hiring", withPercent(80));
    expect(low.fitScore).toBe(high.fitScore);
  });

  it("wp_workforce_planning score is unaffected by frontlineHeadcountPercent", () => {
    const low  = evaluateInitiative("wp_workforce_planning", withPercent(5));
    const high = evaluateInitiative("wp_workforce_planning", withPercent(80));
    expect(low.fitScore).toBe(high.fitScore);
  });
});
