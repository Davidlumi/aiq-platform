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
