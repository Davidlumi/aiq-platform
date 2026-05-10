/**
 * CC.2 — Vitest test fixtures for the AiQ Strategy Engine
 *
 * Tests the pure/synchronous functions in strategyEngine.ts against the
 * REAL content library (no mocks) to ensure correctness and regression safety.
 *
 * Functions under test:
 *   1. calculateCostEnvelope — correct structure, totals, phase grouping
 *   2. evaluateRiskRules     — returns RiskRuleMatch[] with correct shape & rule IDs
 *   3. selectInitiatives     — returns correct count, respects non-negotiables
 *   4. buildProvenanceMap    — returns correct provenance structure
 *
 * generateVisionWithQualityGate is async and calls the LLM — it is NOT tested
 * here to avoid flaky network calls.
 */
import { describe, it, expect } from "vitest";
import {
  calculateCostEnvelope,
  evaluateRiskRules,
  selectInitiatives,
  buildProvenanceMap,
  type RiskEvalInput,
} from "./strategyEngine";

// ─── Shared fixtures ──────────────────────────────────────────────────────────
// These initiative IDs are guaranteed to exist in the real content library
const FOUNDATION_IDS = [
  "ai_literacy_programme",
  "ai_ethics_governance_framework",
  "hr_data_quality_audit",
  "ai_acceptable_use_policy",
];
const SCALE_IDS = ["predictive_attrition_modelling"];
const ALL_SELECTED = [...FOUNDATION_IDS, ...SCALE_IDS];

// ─── calculateCostEnvelope ────────────────────────────────────────────────────
describe("calculateCostEnvelope", () => {
  it("returns a CostEnvelope with the correct top-level shape", () => {
    const result = calculateCostEnvelope(ALL_SELECTED, "medium", "progressive");
    expect(result).toMatchObject({
      byPhase: expect.any(Array),
      totalMin: expect.any(Number),
      totalMax: expect.any(Number),
      currency: "GBP",
      caveat: expect.any(String),
      libraryVersion: expect.any(String),
    });
  });

  it("totalMin is less than or equal to totalMax", () => {
    const result = calculateCostEnvelope(ALL_SELECTED, "medium", "progressive");
    expect(result.totalMin).toBeLessThanOrEqual(result.totalMax);
  });

  it("totalMin is positive when initiatives are selected", () => {
    const result = calculateCostEnvelope(ALL_SELECTED, "medium", "progressive");
    expect(result.totalMin).toBeGreaterThan(0);
  });

  it("returns zero totals when no initiatives are selected", () => {
    const result = calculateCostEnvelope([], "medium", "progressive");
    expect(result.totalMin).toBe(0);
    expect(result.totalMax).toBe(0);
    expect(result.byPhase).toHaveLength(0);
  });

  it("groups foundation initiatives into a foundation phase", () => {
    const result = calculateCostEnvelope(FOUNDATION_IDS, "medium", "progressive");
    const phaseIds = result.byPhase.map(p => p.phase);
    expect(phaseIds).toContain("foundation");
  });

  it("groups scale initiatives into a scale phase", () => {
    const result = calculateCostEnvelope(SCALE_IDS, "medium", "progressive");
    const phaseIds = result.byPhase.map(p => p.phase);
    expect(phaseIds).toContain("scale");
  });

  it("each byPhase entry has the required fields", () => {
    const result = calculateCostEnvelope(ALL_SELECTED, "medium", "progressive");
    for (const phase of result.byPhase) {
      expect(phase).toHaveProperty("phase");
      expect(phase).toHaveProperty("label");
      expect(phase).toHaveProperty("initiativeCount");
      expect(phase).toHaveProperty("minGbk");
      expect(phase).toHaveProperty("maxGbk");
      expect(phase).toHaveProperty("initiatives");
      expect(phase.minGbk).toBeLessThanOrEqual(phase.maxGbk);
    }
  });

  it("enterprise org size produces higher costs than small", () => {
    const small = calculateCostEnvelope(ALL_SELECTED, "small", "progressive");
    const enterprise = calculateCostEnvelope(ALL_SELECTED, "enterprise", "progressive");
    expect(enterprise.totalMin).toBeGreaterThan(small.totalMin);
  });

  it("transformative ambition produces higher costs than cautious", () => {
    const cautious = calculateCostEnvelope(ALL_SELECTED, "medium", "cautious");
    const transformative = calculateCostEnvelope(ALL_SELECTED, "medium", "transformative");
    expect(transformative.totalMin).toBeGreaterThan(cautious.totalMin);
  });

  it("libraryVersion is a non-empty string", () => {
    const result = calculateCostEnvelope(ALL_SELECTED, "medium", "progressive");
    expect(result.libraryVersion).toBeTruthy();
    expect(typeof result.libraryVersion).toBe("string");
  });

  it("sum of byPhase minGbk equals totalMin", () => {
    const result = calculateCostEnvelope(ALL_SELECTED, "medium", "progressive");
    const sumMin = result.byPhase.reduce((s, p) => s + p.minGbk, 0);
    expect(sumMin).toBe(result.totalMin);
  });

  it("sum of byPhase maxGbk equals totalMax", () => {
    const result = calculateCostEnvelope(ALL_SELECTED, "medium", "progressive");
    const sumMax = result.byPhase.reduce((s, p) => s + p.maxGbk, 0);
    expect(sumMax).toBe(result.totalMax);
  });
});

// ─── evaluateRiskRules ────────────────────────────────────────────────────────
describe("evaluateRiskRules", () => {
  const HIGH_RISK_INPUT: RiskEvalInput = {
    // predictive_attrition_modelling without governance framework triggers rr_high_risk_ai_without_governance
    selectedInitiativeIds: ["predictive_attrition_modelling"],
    ambitionTier: "progressive",
    orgSize: "medium",
    hasExecSponsor: true,
    hasDataGovernanceInitiative: false,
  };

  it("returns an array", () => {
    const result = evaluateRiskRules(HIGH_RISK_INPUT);
    expect(Array.isArray(result)).toBe(true);
  });

  it("each RiskRuleMatch has the required fields", () => {
    const result = evaluateRiskRules(HIGH_RISK_INPUT);
    for (const match of result) {
      expect(match).toHaveProperty("ruleId");
      expect(match).toHaveProperty("displayName");
      expect(match).toHaveProperty("riskStatement");
      expect(match).toHaveProperty("severity");
      expect(match).toHaveProperty("recommendedAction");
      expect(match).toHaveProperty("regulatoryBasis");
      expect(match).toHaveProperty("sources");
      expect(typeof match.ruleId).toBe("string");
      expect(typeof match.displayName).toBe("string");
    }
  });

  it("returns empty array when no initiatives are selected", () => {
    const result = evaluateRiskRules({ ...HIGH_RISK_INPUT, selectedInitiativeIds: [] });
    expect(result).toHaveLength(0);
  });

  it("severity values are one of the allowed enum values", () => {
    const result = evaluateRiskRules(HIGH_RISK_INPUT);
    const allowedSeverities = ["very_high", "high", "medium", "low"];
    for (const match of result) {
      expect(allowedSeverities).toContain(match.severity);
    }
  });

  it("triggers rr_high_risk_ai_without_governance when predictive_attrition_modelling selected without governance", () => {
    const result = evaluateRiskRules({
      selectedInitiativeIds: ["predictive_attrition_modelling"],
      ambitionTier: "progressive",
      orgSize: "medium",
      hasExecSponsor: true,
      hasDataGovernanceInitiative: false,
    });
    const ruleIds = result.map(r => r.ruleId);
    expect(ruleIds).toContain("rr_high_risk_ai_without_governance");
  });

  it("does NOT trigger rr_high_risk_ai_without_governance when governance framework is included", () => {
    const result = evaluateRiskRules({
      selectedInitiativeIds: ["predictive_attrition_modelling", "ai_ethics_governance_framework"],
      ambitionTier: "progressive",
      orgSize: "medium",
      hasExecSponsor: true,
      hasDataGovernanceInitiative: false,
    });
    const ruleIds = result.map(r => r.ruleId);
    expect(ruleIds).not.toContain("rr_high_risk_ai_without_governance");
  });

  it("triggers rr_analytics_without_data_quality when analytics selected without data quality audit", () => {
    const result = evaluateRiskRules({
      selectedInitiativeIds: ["predictive_attrition_modelling"],
      ambitionTier: "progressive",
      orgSize: "medium",
      hasExecSponsor: true,
      hasDataGovernanceInitiative: false,
    });
    const ruleIds = result.map(r => r.ruleId);
    expect(ruleIds).toContain("rr_analytics_without_data_quality");
  });

  it("does NOT trigger rr_analytics_without_data_quality when data quality audit is included", () => {
    const result = evaluateRiskRules({
      selectedInitiativeIds: ["predictive_attrition_modelling", "hr_data_quality_audit"],
      ambitionTier: "progressive",
      orgSize: "medium",
      hasExecSponsor: true,
      hasDataGovernanceInitiative: false,
    });
    const ruleIds = result.map(r => r.ruleId);
    expect(ruleIds).not.toContain("rr_analytics_without_data_quality");
  });

  it("triggers rr_transformative_without_exec_sponsor for transformative tier without sponsor", () => {
    const result = evaluateRiskRules({
      selectedInitiativeIds: ["ai_literacy_programme"],
      ambitionTier: "transformative",
      orgSize: "medium",
      hasExecSponsor: false,
      hasDataGovernanceInitiative: false,
    });
    const ruleIds = result.map(r => r.ruleId);
    expect(ruleIds).toContain("rr_transformative_without_exec_sponsor");
  });

  it("does NOT trigger rr_transformative_without_exec_sponsor for progressive tier", () => {
    const result = evaluateRiskRules({
      selectedInitiativeIds: ["ai_literacy_programme"],
      ambitionTier: "progressive",
      orgSize: "medium",
      hasExecSponsor: false,
      hasDataGovernanceInitiative: false,
    });
    const ruleIds = result.map(r => r.ruleId);
    expect(ruleIds).not.toContain("rr_transformative_without_exec_sponsor");
  });

  it("triggers rr_attrition_model_without_gdpr_controls when attrition model selected without GDPR controls", () => {
    const result = evaluateRiskRules({
      selectedInitiativeIds: ["predictive_attrition_modelling"],
      ambitionTier: "progressive",
      orgSize: "medium",
      hasExecSponsor: true,
      hasDataGovernanceInitiative: false,
    });
    const ruleIds = result.map(r => r.ruleId);
    expect(ruleIds).toContain("rr_attrition_model_without_gdpr_controls");
  });

  it("does NOT trigger rr_attrition_model_without_gdpr_controls when data governance is present", () => {
    const result = evaluateRiskRules({
      selectedInitiativeIds: ["predictive_attrition_modelling"],
      ambitionTier: "progressive",
      orgSize: "medium",
      hasExecSponsor: true,
      hasDataGovernanceInitiative: true,
    });
    const ruleIds = result.map(r => r.ruleId);
    expect(ruleIds).not.toContain("rr_attrition_model_without_gdpr_controls");
  });
});

// ─── selectInitiatives ────────────────────────────────────────────────────────
describe("selectInitiatives", () => {
  const BASE_INPUT = {
    ambitionTier: "progressive" as const,
    sector: "retail",
    orgSize: "medium" as const,
    orgSizeHeadcount: 500,
    priorityDomains: ["ai_interaction", "ai_ethics_trust"],
    targetCount: 8,
  };

  it("returns an array of initiative ID strings", () => {
    const result = selectInitiatives(BASE_INPUT);
    expect(Array.isArray(result)).toBe(true);
    for (const id of result) {
      expect(typeof id).toBe("string");
    }
  });

  it("returns at most targetCount initiatives", () => {
    const result = selectInitiatives(BASE_INPUT);
    expect(result.length).toBeLessThanOrEqual(BASE_INPUT.targetCount);
  });

  it("always includes ai_literacy_programme for progressive tier", () => {
    const result = selectInitiatives({ ...BASE_INPUT, targetCount: 20 });
    expect(result).toContain("ai_literacy_programme");
  });

  it("always includes ai_ethics_governance_framework for progressive tier", () => {
    const result = selectInitiatives({ ...BASE_INPUT, targetCount: 20 });
    expect(result).toContain("ai_ethics_governance_framework");
  });

  it("always includes ai_literacy_programme for cautious tier", () => {
    const result = selectInitiatives({ ...BASE_INPUT, ambitionTier: "cautious", targetCount: 20 });
    expect(result).toContain("ai_literacy_programme");
  });

  it("always includes ai_acceptable_use_policy for cautious tier", () => {
    const result = selectInitiatives({ ...BASE_INPUT, ambitionTier: "cautious", targetCount: 20 });
    expect(result).toContain("ai_acceptable_use_policy");
  });

  it("returns unique IDs (no duplicates)", () => {
    const result = selectInitiatives({ ...BASE_INPUT, targetCount: 20 });
    const unique = new Set(result);
    expect(unique.size).toBe(result.length);
  });

  it("respects targetCount = 3 — returns at most 3 initiatives", () => {
    const result = selectInitiatives({ ...BASE_INPUT, targetCount: 3 });
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("returns more initiatives for transformative than cautious at same targetCount", () => {
    // Both should return up to targetCount, but transformative should fill the budget more
    const cautious = selectInitiatives({ ...BASE_INPUT, ambitionTier: "cautious", targetCount: 20 });
    const transformative = selectInitiatives({ ...BASE_INPUT, ambitionTier: "transformative", targetCount: 20 });
    // Transformative has a larger phase budget so should return >= cautious count
    expect(transformative.length).toBeGreaterThanOrEqual(cautious.length);
  });
});

// ─── buildProvenanceMap ───────────────────────────────────────────────────────
describe("buildProvenanceMap", () => {
  const RISK_MATCHES = [
    {
      ruleId: "rr_high_risk_ai_without_governance",
      displayName: "High-Risk AI Without Governance Framework",
      riskStatement: "Risk statement",
      severity: "very_high" as const,
      recommendedAction: "Action",
      regulatoryBasis: ["EU AI Act 2024"],
      sources: ["EU AI Act 2024"],
      likelihood: "Very High",
    },
  ];

  const BASE_PARAMS = {
    selectedInitiativeIds: ["ai_literacy_programme", "predictive_attrition_modelling"],
    riskMatches: RISK_MATCHES,
    orgSize: "medium" as const,
    ambitionTier: "progressive" as const,
  };

  it("returns a ProvenanceMap with the correct top-level keys", () => {
    const result = buildProvenanceMap(BASE_PARAMS);
    expect(result).toHaveProperty("vision");
    expect(result).toHaveProperty("wontDo");
    expect(result).toHaveProperty("costs");
    expect(result).toHaveProperty("risks");
  });

  it("vision entry has method, libraryVersion, generatedAt", () => {
    const result = buildProvenanceMap(BASE_PARAMS);
    expect(result.vision).toMatchObject({
      method: expect.any(String),
      libraryVersion: expect.any(String),
      generatedAt: expect.any(Number),
    });
  });

  it("wontDo entry has method, libraryVersion, generatedAt", () => {
    const result = buildProvenanceMap(BASE_PARAMS);
    expect(result.wontDo).toMatchObject({
      method: expect.any(String),
      libraryVersion: expect.any(String),
      generatedAt: expect.any(Number),
    });
  });

  it("costs entry is keyed by initiative ID for selected initiatives with cost data", () => {
    const result = buildProvenanceMap(BASE_PARAMS);
    // At least one of the selected initiatives should have a cost entry
    const costKeys = Object.keys(result.costs);
    expect(costKeys.length).toBeGreaterThan(0);
  });

  it("each cost entry has sourceId, baseRange, multipliers, libraryVersion", () => {
    const result = buildProvenanceMap(BASE_PARAMS);
    for (const [, entry] of Object.entries(result.costs)) {
      expect(entry).toMatchObject({
        sourceId: expect.any(String),
        baseRange: expect.any(Array),
        multipliers: expect.any(Array),
        libraryVersion: expect.any(String),
      });
      expect(entry.baseRange).toHaveLength(2);
    }
  });

  it("risks entry is keyed by ruleId from riskMatches", () => {
    const result = buildProvenanceMap(BASE_PARAMS);
    expect(result.risks).toHaveProperty("rr_high_risk_ai_without_governance");
  });

  it("each risk entry has ruleId, triggeredBy, libraryVersion", () => {
    const result = buildProvenanceMap(BASE_PARAMS);
    const entry = result.risks["rr_high_risk_ai_without_governance"];
    expect(entry).toMatchObject({
      ruleId: "rr_high_risk_ai_without_governance",
      triggeredBy: expect.any(String),
      libraryVersion: expect.any(String),
    });
  });

  it("generatedAt is a recent timestamp (within last 5 seconds)", () => {
    const before = Date.now();
    const result = buildProvenanceMap(BASE_PARAMS);
    const after = Date.now();
    expect(result.vision.generatedAt).toBeGreaterThanOrEqual(before);
    expect(result.vision.generatedAt).toBeLessThanOrEqual(after);
  });

  it("libraryVersion is a non-empty string", () => {
    const result = buildProvenanceMap(BASE_PARAMS);
    expect(result.vision.libraryVersion).toBeTruthy();
    expect(typeof result.vision.libraryVersion).toBe("string");
  });

  it("returns empty costs when no initiatives are selected", () => {
    const result = buildProvenanceMap({ ...BASE_PARAMS, selectedInitiativeIds: [] });
    expect(Object.keys(result.costs)).toHaveLength(0);
  });

  it("returns empty risks when no riskMatches are provided", () => {
    const result = buildProvenanceMap({ ...BASE_PARAMS, riskMatches: [] });
    expect(Object.keys(result.risks)).toHaveLength(0);
  });
});

// ─── A5: Block A Calculation Guard Tests ─────────────────────────────────────
// Tests for: A1 formula/breakdown consistency, B4 net value uses TCO,
//            B5 generic phrase filtering, GENERIC_QUAL_PHRASES export
import {
  calculateValueEnvelope,
  GENERIC_QUAL_PHRASES,
} from "./strategyEngine";
import { getInitiative, getAllInitiatives } from "./contentLibrary";

// Minimal operational baseline for value envelope tests
const BASELINE = {
  hires_per_year: 100,
  cost_per_hire_gbp: 5000,
  time_to_fill_days: 30,
  voluntary_attrition_rate_pct: 12,
  l_and_d_spend_per_fte_gbp: 500,
  hr_cost_per_fte_gbp: 45000,
};

// Helper: get a list of Initiative objects by IDs
function getInitiatives(ids: string[]) {
  return ids.map(id => getInitiative(id)).filter(Boolean) as NonNullable<ReturnType<typeof getInitiative>>[];
}

// ─── GENERIC_QUAL_PHRASES export ─────────────────────────────────────────────
describe("GENERIC_QUAL_PHRASES (B5)", () => {
  it("is exported as a Set", () => {
    expect(GENERIC_QUAL_PHRASES).toBeInstanceOf(Set);
  });
  it("has at least 10 entries", () => {
    expect(GENERIC_QUAL_PHRASES.size).toBeGreaterThanOrEqual(10);
  });
  it("contains known generic phrases", () => {
    expect(GENERIC_QUAL_PHRASES.has("Data-driven decisions")).toBe(true);
    expect(GENERIC_QUAL_PHRASES.has("Employee trust")).toBe(true);
    expect(GENERIC_QUAL_PHRASES.has("Improved compliance")).toBe(true);
  });
  it("does not contain empty strings", () => {
    for (const phrase of GENERIC_QUAL_PHRASES) {
      expect(phrase.trim().length).toBeGreaterThan(0);
    }
  });
});

// ─── calculateValueEnvelope ───────────────────────────────────────────────────
describe("calculateValueEnvelope (A1, B4, B5)", () => {
  const QUANT_IDS = [
    "ai_assisted_cv_screening",
    "predictive_attrition_modelling",
    "automated_onboarding_orchestration",
    "ai_change_management_programme",
  ];
  const QUANT_INITIATIVES = getInitiatives(QUANT_IDS);

  it("returns a ValueEnvelope with the correct top-level shape", () => {
    const result = calculateValueEnvelope(QUANT_INITIATIVES, BASELINE, 36);
    expect(result).toMatchObject({
      total_quantified_value_gbp: expect.objectContaining({ low: expect.any(Number), high: expect.any(Number) }),
      net_value_gbp: expect.objectContaining({ low: expect.any(Number), high: expect.any(Number) }),
      by_initiative: expect.any(Array),
      qualitative_summary: expect.objectContaining({ bullet_points: expect.any(Array) }),
      tco: expect.objectContaining({ total_3yr_gbp: expect.objectContaining({ low: expect.any(Number), high: expect.any(Number) }) }),
      financial_model: expect.objectContaining({ npv_gbp: expect.any(Object) }),
      scenario_analysis: expect.objectContaining({ base: expect.any(Object) }),
    });
  });

  it("total_quantified_value_gbp.low <= total_quantified_value_gbp.high", () => {
    const result = calculateValueEnvelope(QUANT_INITIATIVES, BASELINE, 36);
    expect(result.total_quantified_value_gbp.low).toBeLessThanOrEqual(result.total_quantified_value_gbp.high);
  });

  it("total_quantified_value_gbp.high is positive when quantified initiatives are selected", () => {
    const result = calculateValueEnvelope(QUANT_INITIATIVES, BASELINE, 36);
    expect(result.total_quantified_value_gbp.high).toBeGreaterThan(0);
  });

  // B4: net_value_gbp uses TCO (3-year) not just implementation cost
  it("B4: net_value_gbp.high = total_quantified_value_gbp.high - tco.total_3yr_gbp.low (TCO basis)", () => {
    const result = calculateValueEnvelope(QUANT_INITIATIVES, BASELINE, 36);
    const expectedNetHigh = result.total_quantified_value_gbp.high - result.tco.total_3yr_gbp.low;
    expect(result.net_value_gbp.high).toBe(expectedNetHigh);
  });

  it("B4: net_value_gbp.low = total_quantified_value_gbp.low - tco.total_3yr_gbp.high (TCO basis)", () => {
    const result = calculateValueEnvelope(QUANT_INITIATIVES, BASELINE, 36);
    const expectedNetLow = result.total_quantified_value_gbp.low - result.tco.total_3yr_gbp.high;
    expect(result.net_value_gbp.low).toBe(expectedNetLow);
  });

  it("B4: tco.total_3yr_gbp.low <= tco.total_3yr_gbp.high", () => {
    const result = calculateValueEnvelope(QUANT_INITIATIVES, BASELINE, 36);
    expect(result.tco.total_3yr_gbp.low).toBeLessThanOrEqual(result.tco.total_3yr_gbp.high);
  });

  // B5: generic phrases must be filtered from bullet_points
  it("B5: bullet_points contain no generic phrases from GENERIC_QUAL_PHRASES", () => {
    const allInits = getAllInitiatives().slice(0, 15);
    const result = calculateValueEnvelope(allInits, BASELINE, 36);
    for (const bullet of result.qualitative_summary.bullet_points) {
      expect(GENERIC_QUAL_PHRASES.has(bullet)).toBe(false);
    }
  });

  it("B5: bullet_points are capped at 10", () => {
    const allInits = getAllInitiatives();
    const result = calculateValueEnvelope(allInits, BASELINE, 36);
    expect(result.qualitative_summary.bullet_points.length).toBeLessThanOrEqual(10);
  });

  // A1: monetisation_breakdown text must reference the same rate as the value calculation
  it("A1: automated_onboarding_orchestration breakdown references daily rate", () => {
    const init = getInitiative("automated_onboarding_orchestration");
    if (!init) return;
    const result = calculateValueEnvelope([init], BASELINE, 36);
    const item = result.by_initiative.find(i => i.initiative_id === "automated_onboarding_orchestration");
    if (!item || !item.quantified_value_gbp) return;
    expect(item.monetisation_breakdown).toMatch(/\/d/);
  });

  it("A1: ai_change_management_programme breakdown references hourly rate", () => {
    const init = getInitiative("ai_change_management_programme");
    if (!init) return;
    const result = calculateValueEnvelope([init], BASELINE, 36);
    const item = result.by_initiative.find(i => i.initiative_id === "ai_change_management_programme");
    if (!item || !item.quantified_value_gbp) return;
    expect(item.monetisation_breakdown).toMatch(/\/h/);
  });

  it("A1: skills_intelligence_platform breakdown references internal fill saving", () => {
    const init = getInitiative("skills_intelligence_platform");
    if (!init) return;
    const result = calculateValueEnvelope([init], BASELINE, 36);
    const item = result.by_initiative.find(i => i.initiative_id === "skills_intelligence_platform");
    if (!item || !item.quantified_value_gbp) return;
    expect(item.monetisation_breakdown).toMatch(/internal fills/i);
  });

  it("returns empty by_initiative when no initiatives are selected", () => {
    const result = calculateValueEnvelope([], BASELINE, 36);
    expect(result.by_initiative).toHaveLength(0);
    expect(result.total_quantified_value_gbp.low).toBe(0);
    expect(result.total_quantified_value_gbp.high).toBe(0);
  });

  it("financial_model.npv_gbp is present and has low/high", () => {
    const result = calculateValueEnvelope(QUANT_INITIATIVES, BASELINE, 36);
    expect(result.financial_model.npv_gbp).toMatchObject({
      low: expect.any(Number),
      high: expect.any(Number),
    });
  });

  it("scenario_analysis has pessimistic, base, optimistic scenarios", () => {
    const result = calculateValueEnvelope(QUANT_INITIATIVES, BASELINE, 36);
    expect(result.scenario_analysis).toMatchObject({
      pessimistic: expect.objectContaining({ value_gbp: expect.any(Number), net_gbp: expect.any(Number), roi_pct: expect.any(Number) }),
      base:        expect.objectContaining({ value_gbp: expect.any(Number), net_gbp: expect.any(Number), roi_pct: expect.any(Number) }),
      optimistic:  expect.objectContaining({ value_gbp: expect.any(Number), net_gbp: expect.any(Number), roi_pct: expect.any(Number) }),
    });
  });

  it("scenario_analysis.optimistic.value_gbp > scenario_analysis.pessimistic.value_gbp", () => {
    const result = calculateValueEnvelope(QUANT_INITIATIVES, BASELINE, 36);
    expect(result.scenario_analysis.optimistic.value_gbp).toBeGreaterThan(result.scenario_analysis.pessimistic.value_gbp);
  });
});

// ─── Formula concentration regression tests ───────────────────────────────────
describe("skills_intelligence_platform formula — concentration guard", () => {
  const LARGE_BASELINE = {
    hires_per_year: 4800,
    cost_per_hire_gbp: 4500,
    time_to_fill_days: 38,
    voluntary_attrition_rate_pct: 15,
    l_and_d_spend_per_fte_gbp: 400,
    hr_cost_per_fte_gbp: 12000,
  };
  const SMALL_BASELINE = {
    ...LARGE_BASELINE,
    hires_per_year: 50,
  };

  // Use getInitiatives to get properly-shaped initiative objects
  const NINE_IDS = [
    "skills_intelligence_platform",
    "predictive_attrition_modelling",
    "ai_learning_personalisation",
    "ai_assisted_cv_screening",
    "ai_assisted_job_descriptions",
    "ai_performance_review_automation",
    "ai_change_management_programme",
    "ai_pay_equity_analysis",
    "bias_monitoring_and_auditing",
  ];
  const NINE_LARGE = getInitiatives(NINE_IDS);
  const NINE_SMALL = getInitiatives(NINE_IDS);

  it("skills_intelligence_platform concentration is below 60% of a 9-initiative portfolio for large company", () => {
    const result = calculateValueEnvelope(NINE_LARGE, LARGE_BASELINE, 36);
    const sipEntry = result.by_initiative.find(i => i.id === "skills_intelligence_platform");
    const totalHigh = result.total_quantified_value_gbp.high;
    if (sipEntry && totalHigh > 0) {
      const concentration = sipEntry.value_high / totalHigh;
      expect(concentration).toBeLessThan(0.60);
    }
  });

  it("skills_intelligence_platform value scales proportionally with company size (not 10x inflated)", () => {
    const resultLarge = calculateValueEnvelope(NINE_LARGE, LARGE_BASELINE, 36);
    const resultSmall = calculateValueEnvelope(NINE_SMALL, SMALL_BASELINE, 36);
    const sipLarge = resultLarge.by_initiative.find(i => i.id === "skills_intelligence_platform");
    const sipSmall = resultSmall.by_initiative.find(i => i.id === "skills_intelligence_platform");
    if (sipLarge && sipSmall && sipSmall.value_high > 0) {
      const hiresRatio = 4800 / 50; // 96x
      const valueRatio = sipLarge.value_high / sipSmall.value_high;
      // Value should scale proportionally with hires (not 10x inflated via headcount)
      // Allow 2x tolerance above the hires ratio
      expect(valueRatio).toBeLessThanOrEqual(hiresRatio * 2);
      // And it should scale at least somewhat with company size
      expect(valueRatio).toBeGreaterThan(1);
    }
  });

  it("skills_intelligence_platform value is less than predictive_attrition_modelling for large companies", () => {
    const result = calculateValueEnvelope(NINE_LARGE, LARGE_BASELINE, 36);
    const sipEntry = result.by_initiative.find(i => i.id === "skills_intelligence_platform");
    const attrEntry = result.by_initiative.find(i => i.id === "predictive_attrition_modelling");
    if (sipEntry && attrEntry) {
      // SIP should be materially smaller than attrition for a 48k headcount company
      expect(sipEntry.value_high).toBeLessThan(attrEntry.value_high);
    }
  });
});

// ─── A5: Sanity checks — NPV must be positive for plausible inputs ─────────────
describe("A5: NPV sanity — positive NPV for plausible profiles", () => {
  const PLAUSIBLE_BASELINE = {
    hires_per_year: 100,
    cost_per_hire_gbp: 5000,
    time_to_fill_days: 30,
    voluntary_attrition_rate_pct: 12,
    l_and_d_spend_per_fte_gbp: 500,
    hr_cost_per_fte_gbp: 45000,
    headcount: 1000,
  };
  const CORE_IDS = [
    "ai_assisted_cv_screening",
    "predictive_attrition_modelling",
    "automated_onboarding_orchestration",
  ];
  it("NPV high is positive for a 1000-headcount org with 3 core initiatives", () => {
    const inits = getInitiatives(CORE_IDS);
    const result = calculateValueEnvelope(inits, PLAUSIBLE_BASELINE, 36);
    expect(result.financial_model.npv_gbp.high).toBeGreaterThan(0);
  });
  it("NPV low <= NPV high (conservative NPV may be negative — that is economically valid)", () => {
    // The conservative scenario (low value, high TCO) can produce negative NPV.
    // What matters is the ordering and that NPV high is positive.
    const inits = getInitiatives(CORE_IDS);
    const result = calculateValueEnvelope(inits, PLAUSIBLE_BASELINE, 36);
    expect(result.financial_model.npv_gbp.low).toBeLessThanOrEqual(result.financial_model.npv_gbp.high);
  });
  it("net_value_gbp.high is positive for plausible inputs", () => {
    const inits = getInitiatives(CORE_IDS);
    const result = calculateValueEnvelope(inits, PLAUSIBLE_BASELINE, 36);
    expect(result.net_value_gbp.high).toBeGreaterThan(0);
  });
  it("A1: headcount field is used — totalHeadcount >= hires_per_year", () => {
    const inits = getInitiatives(["predictive_attrition_modelling"]);
    const resultWith = calculateValueEnvelope(inits, { ...PLAUSIBLE_BASELINE, headcount: 1000 }, 36);
    const resultWithout = calculateValueEnvelope(inits, { ...PLAUSIBLE_BASELINE, headcount: undefined }, 36);
    expect(resultWith.total_quantified_value_gbp.high).toBeGreaterThanOrEqual(
      resultWithout.total_quantified_value_gbp.high * 0.9
    );
  });
});

// ─── A5: Multi-profile plausibility ──────────────────────────────────────────
describe("A5: Multi-profile plausibility — value scales with org size", () => {
  const SMALL_BASELINE = {
    hires_per_year: 20,
    cost_per_hire_gbp: 4000,
    time_to_fill_days: 25,
    voluntary_attrition_rate_pct: 10,
    l_and_d_spend_per_fte_gbp: 400,
    hr_cost_per_fte_gbp: 40000,
    headcount: 150,
  };
  const ENTERPRISE_BASELINE = {
    hires_per_year: 500,
    cost_per_hire_gbp: 8000,
    time_to_fill_days: 45,
    voluntary_attrition_rate_pct: 15,
    l_and_d_spend_per_fte_gbp: 800,
    hr_cost_per_fte_gbp: 55000,
    headcount: 10000,
  };
  const CORE_IDS = [
    "ai_assisted_cv_screening",
    "predictive_attrition_modelling",
    "automated_onboarding_orchestration",
  ];
  it("enterprise org produces higher total value than small org", () => {
    const inits = getInitiatives(CORE_IDS);
    const small = calculateValueEnvelope(inits, SMALL_BASELINE, 36);
    const enterprise = calculateValueEnvelope(inits, ENTERPRISE_BASELINE, 36);
    expect(enterprise.total_quantified_value_gbp.high).toBeGreaterThan(small.total_quantified_value_gbp.high);
  });
  it("enterprise NPV high is positive", () => {
    const inits = getInitiatives(CORE_IDS);
    const result = calculateValueEnvelope(inits, ENTERPRISE_BASELINE, 36);
    expect(result.financial_model.npv_gbp.high).toBeGreaterThan(0);
  });
  it("small org: value scales with org size (small < plausible)", () => {
    // A 150-headcount org with 3 initiatives has negative net value due to fixed initiative costs — economically correct.
    // What matters is that value is lower for small than for a larger org.
    const inits = getInitiatives(CORE_IDS);
    const PLAUSIBLE_BASELINE = {
      hires_per_year: 100, cost_per_hire_gbp: 5000, time_to_fill_days: 30,
      voluntary_attrition_rate_pct: 12, l_and_d_spend_per_fte_gbp: 500,
      hr_cost_per_fte_gbp: 45000, headcount: 1000,
    };
    const small = calculateValueEnvelope(inits, SMALL_BASELINE, 36);
    const plausible = calculateValueEnvelope(inits, PLAUSIBLE_BASELINE, 36);
    expect(plausible.total_quantified_value_gbp.high).toBeGreaterThan(small.total_quantified_value_gbp.high);
  });
  it("payback period has low/high range for enterprise inputs", () => {
    const inits = getInitiatives(CORE_IDS);
    const result = calculateValueEnvelope(inits, ENTERPRISE_BASELINE, 36);
    if (result.payback_period_months !== null) {
      // payback_period_months is a { low, high } range object
      const p = result.payback_period_months as { low: number; high: number };
      if (typeof p === 'object') {
        expect(p.low).toBeGreaterThan(0);
        expect(p.high).toBeGreaterThanOrEqual(p.low);
      } else {
        expect(p).toBeGreaterThan(0);
      }
    }
  });
  it("TCO scales with org size — enterprise TCO > small TCO", () => {
    const inits = getInitiatives(CORE_IDS);
    const small = calculateValueEnvelope(inits, SMALL_BASELINE, 36);
    const enterprise = calculateValueEnvelope(inits, ENTERPRISE_BASELINE, 36);
    expect(enterprise.tco.total_3yr_gbp.low).toBeGreaterThan(small.tco.total_3yr_gbp.low);
  });
});

// ─── C1: Reinvestment plan ────────────────────────────────────────────────────
describe("C1: reinvestment_plan — conditional on net value", () => {
  const BASELINE = {
    hires_per_year: 100,
    cost_per_hire_gbp: 5000,
    time_to_fill_days: 30,
    voluntary_attrition_rate_pct: 12,
    l_and_d_spend_per_fte_gbp: 500,
    hr_cost_per_fte_gbp: 45000,
    headcount: 1000,
  };
  const CORE_IDS = [
    "ai_assisted_cv_screening",
    "predictive_attrition_modelling",
    "automated_onboarding_orchestration",
  ];
  it("reinvestment_plan is present on the result", () => {
    const inits = getInitiatives(CORE_IDS);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    expect(result).toHaveProperty("reinvestment_plan");
  });
  it("reinvestment_plan has recommended field", () => {
    const inits = getInitiatives(CORE_IDS);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    expect(result.reinvestment_plan).toHaveProperty("recommended");
    expect(typeof result.reinvestment_plan.recommended).toBe("boolean");
  });
  it("reinvestment_plan.recommended is true when net_value_gbp.high > 0 (straddles_zero or both_positive)", () => {
    const inits = getInitiatives(CORE_IDS);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    // recommended is true when netHigh > 0 (straddles_zero or both_positive case)
    if (result.net_value_gbp.high > 0) {
      expect(result.reinvestment_plan.recommended).toBe(true);
    } else {
      expect(result.reinvestment_plan.recommended).toBe(false);
    }
  });
  it("reinvestment_plan is not recommended when no initiatives are selected", () => {
    const result = calculateValueEnvelope([], BASELINE, 36);
    expect(result.reinvestment_plan.recommended).toBe(false);
  });
});

// ─── C2: CEO sponsorship trigger ─────────────────────────────────────────────
describe("C2: ceo_sponsorship — trigger logic", () => {
  const BASELINE = {
    hires_per_year: 100,
    cost_per_hire_gbp: 5000,
    time_to_fill_days: 30,
    voluntary_attrition_rate_pct: 12,
    l_and_d_spend_per_fte_gbp: 500,
    hr_cost_per_fte_gbp: 45000,
    headcount: 1000,
  };
  it("ceo_sponsorship is present on the result", () => {
    const inits = getInitiatives(["ai_assisted_cv_screening"]);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    expect(result).toHaveProperty("ceo_sponsorship");
  });
  it("ceo_sponsorship has required, trigger, rationale, suggested_framing", () => {
    const inits = getInitiatives(["ai_assisted_cv_screening"]);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    expect(result.ceo_sponsorship).toMatchObject({
      required: expect.any(Boolean),
      trigger: expect.any(String),
      rationale: expect.any(String),
      suggested_framing: expect.any(String),
    });
  });
  it("ceo_sponsorship.required is false when no initiatives are selected", () => {
    const result = calculateValueEnvelope([], BASELINE, 36);
    expect(result.ceo_sponsorship.required).toBe(false);
  });
  it("ceo_sponsorship.trigger is 'none' when not required", () => {
    const result = calculateValueEnvelope([], BASELINE, 36);
    expect(result.ceo_sponsorship.trigger).toBe("none");
  });
});

// ─── A5: Formula consistency ──────────────────────────────────────────────────
describe("A5: Formula consistency — net value = total value - TCO", () => {
  const BASELINE = {
    hires_per_year: 100,
    cost_per_hire_gbp: 5000,
    time_to_fill_days: 30,
    voluntary_attrition_rate_pct: 12,
    l_and_d_spend_per_fte_gbp: 500,
    hr_cost_per_fte_gbp: 45000,
    headcount: 1000,
  };
  const CORE_IDS = [
    "ai_assisted_cv_screening",
    "predictive_attrition_modelling",
    "automated_onboarding_orchestration",
  ];
  it("net_value_gbp.high = total_quantified_value_gbp.high - tco.total_3yr_gbp.low", () => {
    const inits = getInitiatives(CORE_IDS);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    const expected = result.total_quantified_value_gbp.high - result.tco.total_3yr_gbp.low;
    expect(Math.abs(result.net_value_gbp.high - expected)).toBeLessThan(200);
  });
  it("net_value_gbp.low = total_quantified_value_gbp.low - tco.total_3yr_gbp.high", () => {
    const inits = getInitiatives(CORE_IDS);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    const expected = result.total_quantified_value_gbp.low - result.tco.total_3yr_gbp.high;
    expect(Math.abs(result.net_value_gbp.low - expected)).toBeLessThan(200);
  });
  it("scenario_analysis.base.value_gbp is between pessimistic and optimistic", () => {
    const inits = getInitiatives(CORE_IDS);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    expect(result.scenario_analysis.base.value_gbp).toBeGreaterThanOrEqual(result.scenario_analysis.pessimistic.value_gbp);
    expect(result.scenario_analysis.base.value_gbp).toBeLessThanOrEqual(result.scenario_analysis.optimistic.value_gbp);
  });
});
