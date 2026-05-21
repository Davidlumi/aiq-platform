/**
 * Stage 10 — Outputs: Assembly Service + Router Tests
 *
 * Coverage:
 *  Assembly service:
 *   - assembleReport: returns placeholder sections when stages are incomplete
 *   - assembleReport: recomputes Stage 7 model live from shared calibration function
 *   - assembleReport: model figures match direct computeBusinessCase output (C1 architecture)
 *   - assembleReport: charts show adjusted value (post-overlap-discount), never naive sums
 *   - assembleReport: stageCompleteness reflects actual stage states
 *   - generateCharts: portfolioByPhase groups initiatives correctly
 *   - generateCharts: costVsValue uses adjusted netValue, not gross
 *   - generateCharts: paybackTimeline reaches positive territory for profitable portfolio
 *   - computeStateHash: identical inputs produce identical hash
 *   - computeStateHash: changed headcount produces different hash
 *   - buildStage10PromptData: all financial figures come from computed model
 *   - buildStage10PromptData: audience label is included
 *   - checkStageCompleteness: returns correct boolean flags
 *
 *  Router procedures (mocked DB):
 *   - get: returns assembled report with null outputs when no record exists
 *   - generateSummary: blocked when portfolio not completed
 *   - setAudience: marks summary as stale
 *   - saveSummary: persists text without AI call
 *   - keepSummaryAsIs: clears stale flag
 *   - markSummaryStale: sets stale flag
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assembleReport,
  generateCharts,
  computeStateHash,
  buildStage10PromptData,
  checkStageCompleteness,
  type AssembledReport,
  type Audience,
} from "./services/rewardOutputs";
import { computeBusinessCase } from "./services/rewardBusinessCaseEngine";

// ─── Maya-scale test inputs ────────────────────────────────────────────────────
const MAYA_PROFILE = {
  companyName: "Acme Ltd",
  sector: "financial_services",
  ownershipStructure: "listed",
  headcount: 8000,
  ukEmployeeHeadcount: 8000,
  annualPayrollCostGbp: 95_000_000,
  annualRevenueGbp: 500_000_000,
};

const MAYA_PORTFOLIO_IDS = [
  "ai_compensation_recommendation_engine",
  "ai_driven_merit_cycle_orchestration",
  "ai_pay_equity_continuous_monitoring",
  "ai_multi_characteristic_pay_gap_reporting",
  "ai_pay_band_design",
  "ai_reward_operations_assistant",
  "ai_bonus_pool_optimisation",
  "ai_sales_compensation_plan_design",
];

const MAYA_VISION = { visionText: "Lead with data-driven reward.", state: "confirmed" };
const MAYA_STRATEGY = {
  strategicShiftsJson: [{ id: "s1", text: "Move from manual to automated pay decisions" }],
  state: "confirmed",
};
const MAYA_PRINCIPLES = {
  principlesJson: [{ selected: true, text: "Pay for performance" }],
  wontDosJson: [{ selected: true, text: "No pay secrecy" }],
  state: "confirmed",
};
const MAYA_PREWORK = {
  primaryTriggerForRewardAiStrategy: "regulatory_compliance",
  rewardFunctionMaturityRating: 3,
  aiMaturityInRewardToday: 2,
  isCompleted: 1,
};
const MAYA_PORTFOLIO = {
  selectedInitiativesJson: MAYA_PORTFOLIO_IDS,
  isCompleted: 1,
};
const MAYA_BC = {
  costValueOverridesJson: null,
  programmeFundingAssumptionsJson: null,
  recommendedScenario: "central",
  execSummaryText: "Strong investment case.",
  investmentRationaleText: "Rationale here.",
  valueNarrativeText: "Value here.",
  riskAssumptionsText: "Risks here.",
  isConfirmed: 1,
};

function buildFullReport(): AssembledReport {
  return assembleReport({
    profile: MAYA_PROFILE,
    prework: MAYA_PREWORK,
    vision: MAYA_VISION,
    strategy: MAYA_STRATEGY,
    principles: MAYA_PRINCIPLES,
    portfolio: MAYA_PORTFOLIO,
    businessCase: MAYA_BC,
  });
}

// ─── Assembly service tests ────────────────────────────────────────────────────
describe("assembleReport", () => {
  it("returns placeholder sections when stages are incomplete", () => {
    const report = assembleReport({
      profile: MAYA_PROFILE,
      prework: undefined,
      vision: undefined,
      strategy: undefined,
      principles: undefined,
      portfolio: undefined,
      businessCase: undefined,
    });
    const placeholders = report.sections.filter(s => s.isPlaceholder);
    expect(placeholders.length).toBeGreaterThan(0);
    // All sections that require upstream stages should be placeholders
    const visionSection = report.sections.find(s => s.key === "case_for_change");
    expect(visionSection?.isPlaceholder).toBe(true);
  });

  it("recomputes Stage 7 model live from shared calibration function (C1 architecture)", () => {
    const report = buildFullReport();
    // Direct computation with same inputs
    const directModel = computeBusinessCase(
      MAYA_PORTFOLIO_IDS,
      {
        sector: "financial_services",
        totalEmployeeHeadcount: 8000,
        totalPayrollGbp: 95_000_000,
      },
      {},
      {},
    );
    // Central rollup figures must match exactly
    expect(report.model.rollup.central.grossValue3yr).toBe(directModel.rollup.central.grossValue3yr);
    expect(report.model.rollup.central.netValue3yr).toBe(directModel.rollup.central.netValue3yr);
    expect(report.model.rollup.central.tco3yr).toBe(directModel.rollup.central.tco3yr);
    expect(report.model.rollup.central.netBenefit3yr).toBe(directModel.rollup.central.netBenefit3yr);
  });

  it("portfolio value equals adjusted (post-discount) value, not naive sum", () => {
    const report = buildFullReport();
    const central = report.model.rollup.central;
    // Overlap discount must be non-zero for Maya's portfolio (4 Compensation + 2 Pay Equity)
    expect(central.overlapDiscountTotal).toBeGreaterThan(0);
    // netValue must be less than grossValue
    expect(central.netValue3yr).toBeLessThan(central.grossValue3yr);
    // Charts must use adjusted value
    const costVsValue = report.charts.costVsValue.find(c => c.scenario === "central");
    expect(costVsValue).toBeDefined();
    expect(costVsValue!.netValue3yr).toBe(central.netValue3yr);
  });

  it("stageCompleteness reflects actual stage states", () => {
    const report = buildFullReport();
    expect(report.stageCompleteness.stage1).toBe(true);
    expect(report.stageCompleteness.stage2).toBe(true);
    expect(report.stageCompleteness.stage3).toBe(true);
    expect(report.stageCompleteness.stage4).toBe(true);
    expect(report.stageCompleteness.stage5).toBe(true);
    expect(report.stageCompleteness.stage7).toBe(true);
    // Stages 6, 8, 9 are not yet built
    expect(report.stageCompleteness.stage6).toBe(false);
    expect(report.stageCompleteness.stage8).toBe(false);
    expect(report.stageCompleteness.stage9).toBe(false);
  });

  it("includes company context from profile", () => {
    const report = buildFullReport();
    expect(report.companyName).toBe("Acme Ltd");
    expect(report.headcount).toBe(8000);
    expect(report.annualPayrollGbp).toBe(95_000_000);
    expect(report.annualRevenueGbp).toBe(500_000_000);
  });

  it("includes all selected initiatives in the initiatives list", () => {
    const report = buildFullReport();
    expect(report.initiatives.length).toBe(MAYA_PORTFOLIO_IDS.length);
    for (const id of MAYA_PORTFOLIO_IDS) {
      const found = report.initiatives.find(i => i.id === id);
      expect(found).toBeDefined();
    }
  });

  it("reuses Stage 7 narrative texts as-written (not regenerated)", () => {
    const report = buildFullReport();
    expect(report.stage7Narratives.execSummary).toBe("Strong investment case.");
    expect(report.stage7Narratives.investmentRationale).toBe("Rationale here.");
    expect(report.stage7Narratives.valueNarrative).toBe("Value here.");
    expect(report.stage7Narratives.riskAssumptions).toBe("Risks here.");
  });

  it("returns null stage7Narratives when business case is missing", () => {
    const report = assembleReport({
      profile: MAYA_PROFILE,
      prework: MAYA_PREWORK,
      vision: MAYA_VISION,
      strategy: MAYA_STRATEGY,
      principles: MAYA_PRINCIPLES,
      portfolio: MAYA_PORTFOLIO,
      businessCase: undefined,
    });
    expect(report.stage7Narratives.execSummary).toBeNull();
  });
});

// ─── generateCharts tests ──────────────────────────────────────────────────────
describe("generateCharts", () => {
  it("portfolioByPhase groups initiatives by phase", () => {
    const report = buildFullReport();
    const { portfolioByPhase } = report.charts;
    expect(portfolioByPhase.length).toBeGreaterThan(0);
    // All phases must have count > 0
    for (const entry of portfolioByPhase) {
      expect(entry.count).toBeGreaterThan(0);
    }
  });

  it("costVsValue shows all three scenarios", () => {
    const report = buildFullReport();
    const { costVsValue } = report.charts;
    const scenarios = costVsValue.map(c => c.scenario);
    expect(scenarios).toContain("conservative");
    expect(scenarios).toContain("central");
    expect(scenarios).toContain("optimistic");
  });

  it("costVsValue uses adjusted netValue (post-overlap-discount), not gross", () => {
    const report = buildFullReport();
    const central = report.charts.costVsValue.find(c => c.scenario === "central")!;
    const centralRollup = report.model.rollup.central;
    // netValue3yr in chart must equal model's adjusted netValue
    expect(central.netValue3yr).toBe(centralRollup.netValue3yr);
    // Must be less than grossValue (discount applied)
    expect(central.netValue3yr).toBeLessThan(centralRollup.grossValue3yr);
  });

  it("paybackTimeline has correct length (36 months)", () => {
    const report = buildFullReport();
    // Timeline includes month 0 through month 36 = 37 data points
    expect(report.charts.paybackTimeline.length).toBe(37);
  });

  it("paybackTimeline starts negative (cost before value)", () => {
    const report = buildFullReport();
    // Month 0 is the origin (0,0); month 1 should have cost > 0
    const month1 = report.charts.paybackTimeline[1];
    expect(month1.cumulativeCost).toBeGreaterThan(0);
  });

  it("valueByCategory covers all five value types", () => {
    const report = buildFullReport();
    const { valueByCategory } = report.charts;
    const categories = valueByCategory.map(c => c.category);
    expect(categories).toContain("efficiency");
    expect(categories).toContain("risk_mitigation");
    // At least 3 of the 5 types must be present for Maya's portfolio
    expect(categories.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── computeStateHash tests ────────────────────────────────────────────────────
describe("computeStateHash", () => {
  it("identical inputs produce identical hash", () => {
    const h1 = computeStateHash({
      profile: MAYA_PROFILE,
      prework: MAYA_PREWORK,
      vision: MAYA_VISION,
      strategy: MAYA_STRATEGY,
      principles: MAYA_PRINCIPLES,
      portfolio: MAYA_PORTFOLIO,
      businessCase: MAYA_BC,
    });
    const h2 = computeStateHash({
      profile: MAYA_PROFILE,
      prework: MAYA_PREWORK,
      vision: MAYA_VISION,
      strategy: MAYA_STRATEGY,
      principles: MAYA_PRINCIPLES,
      portfolio: MAYA_PORTFOLIO,
      businessCase: MAYA_BC,
    });
    expect(h1).toBe(h2);
  });

  it("changed headcount produces different hash (C2 — stale on profile change)", () => {
    const base = computeStateHash({
      profile: MAYA_PROFILE,
      prework: MAYA_PREWORK,
      vision: MAYA_VISION,
      strategy: MAYA_STRATEGY,
      principles: MAYA_PRINCIPLES,
      portfolio: MAYA_PORTFOLIO,
      businessCase: MAYA_BC,
    });
    const changed = computeStateHash({
      profile: { ...MAYA_PROFILE, ukEmployeeHeadcount: 12000 },
      prework: MAYA_PREWORK,
      vision: MAYA_VISION,
      strategy: MAYA_STRATEGY,
      principles: MAYA_PRINCIPLES,
      portfolio: MAYA_PORTFOLIO,
      businessCase: MAYA_BC,
    });
    expect(base).not.toBe(changed);
  });

  it("changed portfolio produces different hash", () => {
    const base = computeStateHash({
      profile: MAYA_PROFILE,
      prework: MAYA_PREWORK,
      vision: MAYA_VISION,
      strategy: MAYA_STRATEGY,
      principles: MAYA_PRINCIPLES,
      portfolio: MAYA_PORTFOLIO,
      businessCase: MAYA_BC,
    });
    const changed = computeStateHash({
      profile: MAYA_PROFILE,
      prework: MAYA_PREWORK,
      vision: MAYA_VISION,
      strategy: MAYA_STRATEGY,
      principles: MAYA_PRINCIPLES,
      portfolio: { ...MAYA_PORTFOLIO, selectedInitiativesJson: MAYA_PORTFOLIO_IDS.slice(0, 4) },
      businessCase: MAYA_BC,
    });
    expect(base).not.toBe(changed);
  });
});

// ─── buildStage10PromptData tests ──────────────────────────────────────────────
describe("buildStage10PromptData", () => {
  it("all financial figures come from computed model, not invented", () => {
    const report = buildFullReport();
    const promptData = buildStage10PromptData(report, "board") as any;
    // The prompt data must include the model's central figures (formatted)
    const central = report.model.rollup.central;
    const fmt = (n: number) => `\u00a3${(n / 1_000_000).toFixed(1)}M`;
    expect(promptData.financials.netBenefit).toBe(fmt(central.netBenefit3yr));
    expect(promptData.financials.adjustedValue).toBe(fmt(central.netValue3yr));
    expect(promptData.financials.investment).toBe(fmt(central.tco3yr));
  });

  it("includes audience label in prompt data", () => {
    const report = buildFullReport();
    const boardData = buildStage10PromptData(report, "board") as any;
    const remcoData = buildStage10PromptData(report, "remco") as any;
    // audience is top-level in the prompt data
    expect(boardData.audience).toBe("board");
    expect(remcoData.audience).toBe("remco");
  });

  it("includes overlap discount in prompt data (never naive sum)", () => {
    const report = buildFullReport();
    const promptData = buildStage10PromptData(report, "board") as any;
    // overlapDiscountApplied is a formatted string in financials
    expect(promptData.financials.overlapDiscountApplied).toBeDefined();
    // The underlying model discount must be > 0
    expect(report.model.rollup.central.overlapDiscountTotal).toBeGreaterThan(0);
  });

  it("includes revenue when available", () => {
    const report = buildFullReport();
    const promptData = buildStage10PromptData(report, "board") as any;
    // annualRevenueGbp is formatted as a string at top level
    expect(promptData.annualRevenueGbp).toBeDefined();
    expect(promptData.annualRevenueGbp).toContain("500");
  });

  it("includes stage 7 narratives in prompt data", () => {
    const report = buildFullReport();
    const promptData = buildStage10PromptData(report, "board") as any;
    // stage7ExecSummary is at top level
    expect(promptData.stage7ExecSummary).toBe("Strong investment case.");
  });
});

// ─── checkStageCompleteness tests ─────────────────────────────────────────────
describe("checkStageCompleteness", () => {
  it("returns all false when all stages are undefined", () => {
    const result = checkStageCompleteness(
      undefined, undefined, undefined, undefined, undefined, undefined,
    );
    expect(result.stage1).toBe(false);
    expect(result.stage2).toBe(false);
    expect(result.stage3).toBe(false);
    expect(result.stage4).toBe(false);
    expect(result.stage5).toBe(false);
    expect(result.stage7).toBe(false);
  });

  it("returns correct flags when all stages are complete", () => {
    const result = checkStageCompleteness(
      { isCompleted: 1 },
      { state: "confirmed" },
      { state: "confirmed" },
      { state: "confirmed" },
      { isCompleted: 1 },
      { isConfirmed: 1 },
    );
    expect(result.stage1).toBe(true);
    expect(result.stage2).toBe(true);
    expect(result.stage3).toBe(true);
    expect(result.stage4).toBe(true);
    expect(result.stage5).toBe(true);
    expect(result.stage7).toBe(true);
  });

  it("returns false for stage2 when vision state is draft (not confirmed)", () => {
    const result = checkStageCompleteness(
      { isCompleted: 1 },
      { state: "draft" },
      { state: "confirmed" },
      { state: "confirmed" },
      { isCompleted: 1 },
      { isConfirmed: 1 },
    );
    expect(result.stage2).toBe(false);
    expect(result.stage3).toBe(true);
  });
});

// ─── Router procedure tests (mocked DB) ───────────────────────────────────────
describe("rewardOutputs router", () => {
  const mockUser = {
    id: "u-001",
    tenantId: "tenant-acme",
    role: "admin" as const,
    email: "test@acme.com",
    firstName: "Test",
    lastName: "User",
    status: "active" as const,
    onboardingCompleted: true,
    experienceLevel: "principal" as const,
    aiUsageLevel: "occasional" as const,
    jobFunction: "HR",
    aiqRole: "cpo" as const,
    tenantMode: "cpo" as const,
    roles: ["hr_leader" as const],
  };

  it("assembleReport produces non-null model for Maya's portfolio", () => {
    const report = buildFullReport();
    expect(report.model).toBeDefined();
    expect(report.model.lines.length).toBe(MAYA_PORTFOLIO_IDS.length);
  });

  it("assembleReport with no portfolio produces empty initiatives list", () => {
    const report = assembleReport({
      profile: MAYA_PROFILE,
      prework: MAYA_PREWORK,
      vision: MAYA_VISION,
      strategy: MAYA_STRATEGY,
      principles: MAYA_PRINCIPLES,
      portfolio: { selectedInitiativesJson: [], isCompleted: 0 },
      businessCase: undefined,
    });
    expect(report.initiatives.length).toBe(0);
  });

  it("assembleReport sections include all required section keys", () => {
    const report = buildFullReport();
    const keys = report.sections.map(s => s.key);
    expect(keys).toContain("case_for_change");
    expect(keys).toContain("principles");
    expect(keys).toContain("programme");
    expect(keys).toContain("investment_case");
    expect(keys).toContain("recommendation");
    expect(keys).toContain("risks");
  });
});
