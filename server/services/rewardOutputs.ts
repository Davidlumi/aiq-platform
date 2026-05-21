/**
 * Stage 10 — Outputs Assembly Service
 *
 * assembleReport(ctx) — reads all confirmed stage outputs, recomputes the Stage 7
 * model via the shared calibration function, assembles the full report structure,
 * and handles missing-stage placeholders.
 *
 * generateCharts(model) — produces chart data (honest figures, post-overlap-discount).
 *
 * computeStateHash(ctx) — SHA-256 of all upstream stage data; used to detect stale exports.
 *
 * Critical rules (from spec §12):
 * 1. Report numbers come from the computed Stage 7 model — never invented by AI.
 * 2. Charts show adjusted value (post-overlap-discount), never naive sums.
 * 3. Missing stages (6, 8, 9) render as placeholders, not errors.
 * 4. Section bodies are reused as-written from source stages.
 * 5. Only the executive summary and transitions are generated.
 */

import { createHash } from "crypto";
import {
  computeBusinessCase,
  type BusinessCaseModel,
  type CostValueOverrides,
  type ProgrammeFundingAssumptions,
  type Scenario,
} from "./rewardBusinessCaseEngine";
import { REWARD_INITIATIVE_LIBRARY } from "../../shared/rewardInitiativeLibrary";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Audience = "board" | "remco" | "leadership";

export interface AssembledInitiative {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  subDomain: string;
  phase: string;
  complexity: string;
  primaryValueType: string;
  principlesAlignment: string[];
  risks: string[];
  fitReasoning?: string;
  // Computed financials (from Stage 7 model)
  tco3yrCentral: number;
  value3yrCentral: number;
  netBenefit3yrCentral: number;
}

export interface ReportSection {
  key: string;
  title: string;
  content: string | null;       // null = placeholder
  isPlaceholder: boolean;
  placeholderText?: string;
  sourceStage: number;
}

export interface ChartData {
  portfolioByPhase: Array<{ phase: string; count: number; tco3yr: number }>;
  valueByCategory: Array<{ category: string; label: string; value3yr: number; pct: number }>;
  costVsValue: Array<{ scenario: string; tco3yr: number; netValue3yr: number; netBenefit3yr: number }>;
  paybackTimeline: Array<{ month: number; cumulativeCost: number; cumulativeValue: number }>;
  investmentByPhase: Array<{ phase: string; tco3yr: number }>;
}

export interface AssembledReport {
  // Company context
  companyName: string;
  sector: string;
  ownershipStructure: string | null;
  headcount: number | null;
  annualPayrollGbp: number | null;
  annualRevenueGbp: number | null;
  // Stage sources
  visionText: string | null;
  strategicShifts: Array<{ id: string; text: string }>;
  principles: Array<{ text: string }>;
  wontDos: Array<{ text: string }>;
  primaryTrigger: string | null;
  // Portfolio
  selectedInitiativeIds: string[];
  initiatives: AssembledInitiative[];
  // Stage 7 model (recomputed live)
  model: BusinessCaseModel;
  recommendedScenario: Scenario;
  // Stage 7 narratives (reused as-written)
  stage7Narratives: {
    execSummary: string | null;
    investmentRationale: string | null;
    valueNarrative: string | null;
    riskAssumptions: string | null;
  };
  // Sections
  sections: ReportSection[];
  // Charts
  charts: ChartData;
  // Completeness
  stageCompleteness: {
    stage1: boolean;
    stage2: boolean;
    stage3: boolean;
    stage4: boolean;
    stage5: boolean;
    stage6: boolean;  // not yet built
    stage7: boolean;
    stage8: boolean;  // not yet built
    stage9: boolean;  // not yet built
  };
  // Metadata
  assembledAt: number;
}

// ─── Stage-completeness helper ────────────────────────────────────────────────

export function checkStageCompleteness(
  prework: { isCompleted?: number | null } | undefined,
  vision: { state?: string | null } | undefined,
  strategy: { state?: string | null } | undefined,
  principles: { state?: string | null } | undefined,
  portfolio: { isCompleted?: number | null } | undefined,
  businessCase: { isConfirmed?: number | null } | undefined,
) {
  return {
    stage1: !!prework?.isCompleted,
    stage2: vision?.state === "confirmed",
    stage3: strategy?.state === "confirmed",
    stage4: principles?.state === "confirmed",
    stage5: !!portfolio?.isCompleted,
    stage6: false,   // not yet built
    stage7: !!businessCase?.isConfirmed,
    stage8: false,   // not yet built
    stage9: false,   // not yet built
  };
}

// ─── Report assembly ──────────────────────────────────────────────────────────

export function assembleReport(params: {
  profile: {
    companyName?: string | null;
    sector?: string | null;
    ownershipStructure?: string | null;
    headcount?: number | null;
    annualPayrollCostGbp?: number | null;
    annualRevenueGbp?: number | null;
    ukEmployeeHeadcount?: number | null;
  } | undefined;
  prework: {
    primaryTriggerForRewardAiStrategy?: string | null;
    rewardFunctionMaturityRating?: number | null;
    aiMaturityInRewardToday?: number | null;
    isCompleted?: number | null;
  } | undefined;
  vision: { visionText?: string | null; state?: string | null } | undefined;
  strategy: {
    strategicShiftsJson?: Array<{ id: string; text: string }> | null;
    state?: string | null;
  } | undefined;
  principles: {
    principlesJson?: Array<{ selected?: boolean; text: string }> | null;
    wontDosJson?: Array<{ selected?: boolean; text: string }> | null;
    state?: string | null;
  } | undefined;
  portfolio: {
    selectedInitiativesJson?: string[] | null;
    isCompleted?: number | null;
  } | undefined;
  businessCase: {
    costValueOverridesJson?: CostValueOverrides | null;
    programmeFundingAssumptionsJson?: ProgrammeFundingAssumptions | null;
    recommendedScenario?: string | null;
    execSummaryText?: string | null;
    investmentRationaleText?: string | null;
    valueNarrativeText?: string | null;
    riskAssumptionsText?: string | null;
    isConfirmed?: number | null;
  } | undefined;
  customInitiatives?: Array<{
    id: string;
    title: string;
    description: string;
    subDomain: string;
    phase: string;
    complexity: string;
    valueLow: number;
    valueHigh: number;
    costLow?: number | null;
    costHigh?: number | null;
    principlesAlignment?: string | null;
    risks?: string | null;
  }>;
}): AssembledReport {
  const {
    profile, prework, vision, strategy, principles, portfolio, businessCase,
    customInitiatives = [],
  } = params;

  // ── Compute Stage 7 model (shared calibration function) ──────────────────
  const selectedIds = portfolio?.selectedInitiativesJson ?? [];
  const inputs = {
    sector: profile?.sector ?? "",
    totalEmployeeHeadcount: profile?.ukEmployeeHeadcount ?? profile?.headcount ?? 3000,
    totalPayrollGbp: profile?.annualPayrollCostGbp ?? 0,
  };
  const overrides: CostValueOverrides = businessCase?.costValueOverridesJson ?? {};
  const pfAssumptions: ProgrammeFundingAssumptions = businessCase?.programmeFundingAssumptionsJson ?? {};
  const model = computeBusinessCase(selectedIds, inputs, overrides, pfAssumptions);
  const recommendedScenario = (businessCase?.recommendedScenario ?? "central") as Scenario;

  // ── Build initiative list ─────────────────────────────────────────────────
  const initiatives: AssembledInitiative[] = [];
  for (const id of selectedIds) {
    const lib = REWARD_INITIATIVE_LIBRARY.find(i => i.id === id);
    const modelLine = model.lines.find(l => l.initiativeId === id);
    if (lib) {
      initiatives.push({
        id: lib.id,
        title: lib.title,
        shortDescription: lib.shortDescription,
        fullDescription: lib.fullDescription,
        subDomain: lib.subDomain,
        phase: lib.defaultPhase,
        complexity: lib.complexity,
        primaryValueType: lib.primaryValueType,
        principlesAlignment: lib.supportsPrincipleIds ?? [],
        risks: [],  // library risks are in reasoningTemplates — surface as needed
        tco3yrCentral: modelLine ? modelLine.tco3yrCentral : 0,
        value3yrCentral: modelLine ? modelLine.value3yrCentral : 0,
        netBenefit3yrCentral: modelLine
          ? modelLine.value3yrCentral - modelLine.tco3yrCentral
          : 0,
      });
    } else {
      // Custom initiative
      const custom = customInitiatives.find(c => c.id === id);
      if (custom) {
        const centralValue = (custom.valueLow + custom.valueHigh) / 2;
        const centralCost = ((custom.costLow ?? 0) + (custom.costHigh ?? 0)) / 2;
        initiatives.push({
          id: custom.id,
          title: custom.title,
          shortDescription: custom.description,
          fullDescription: custom.description,
          subDomain: custom.subDomain,
          phase: custom.phase,
          complexity: custom.complexity,
          primaryValueType: "strategic",
          principlesAlignment: [],
          risks: custom.risks ? [custom.risks] : [],
          tco3yrCentral: centralCost,
          value3yrCentral: centralValue,
          netBenefit3yrCentral: centralValue - centralCost,
        });
      }
    }
  }

  // ── Principles and won't-dos ──────────────────────────────────────────────
  const confirmedPrinciples = (principles?.principlesJson ?? [])
    .filter(p => p.selected)
    .map(p => ({ text: p.text }));
  const confirmedWontDos = (principles?.wontDosJson ?? [])
    .filter(w => w.selected)
    .map(w => ({ text: w.text }));

  // ── Strategic shifts ──────────────────────────────────────────────────────
  const strategicShifts = strategy?.strategicShiftsJson ?? [];

  // ── Stage 7 narratives (reused as-written) ────────────────────────────────
  const stage7Narratives = {
    execSummary: businessCase?.execSummaryText ?? null,
    investmentRationale: businessCase?.investmentRationaleText ?? null,
    valueNarrative: businessCase?.valueNarrativeText ?? null,
    riskAssumptions: businessCase?.riskAssumptionsText ?? null,
  };

  // ── Completeness ─────────────────────────────────────────────────────────
  const stageCompleteness = checkStageCompleteness(
    prework, vision, strategy, principles, portfolio, businessCase
  );

  // ── Sections ─────────────────────────────────────────────────────────────
  const sections: ReportSection[] = [
    {
      key: "case_for_change",
      title: "The case for change",
      content: vision?.visionText
        ? [
            vision.visionText,
            strategicShifts.length > 0
              ? "Strategic shifts: " + strategicShifts.map(s => s.text).join(" | ")
              : null,
            prework?.primaryTriggerForRewardAiStrategy
              ? `Primary trigger: ${prework.primaryTriggerForRewardAiStrategy}`
              : null,
          ].filter(Boolean).join("\n\n")
        : null,
      isPlaceholder: !vision?.visionText,
      placeholderText: "Vision and strategy to be confirmed (Stages 2–3).",
      sourceStage: 2,
    },
    {
      key: "principles",
      title: "Our principles",
      content: confirmedPrinciples.length > 0
        ? confirmedPrinciples.map(p => p.text).join("\n")
        : null,
      isPlaceholder: confirmedPrinciples.length === 0,
      placeholderText: "Principles to be confirmed (Stage 4).",
      sourceStage: 4,
    },
    {
      key: "programme",
      title: "The programme",
      content: initiatives.length > 0
        ? buildProgrammeNarrative(initiatives)
        : null,
      isPlaceholder: initiatives.length === 0,
      placeholderText: "Portfolio to be confirmed (Stage 5).",
      sourceStage: 5,
    },
    {
      key: "investment_case",
      title: "The investment case",
      // Use valueNarrative (financial outcomes: TCO, value, ROI, payback) not investmentRationale
      // (which contains strategic "why now" content already covered by case_for_change — S10-10).
      // Fall back to execSummary if valueNarrative not yet generated.
      content: stage7Narratives.valueNarrative ?? stage7Narratives.execSummary,
      isPlaceholder: !stage7Narratives.valueNarrative && !stage7Narratives.execSummary,
      placeholderText: "Business case narrative to be generated (Stage 7).",
      sourceStage: 7,
    },
    {
      key: "success_measures",
      title: "Success measures",
      content: null,
      isPlaceholder: true,
      placeholderText: "Success measures to be defined (Stage 6 — coming soon).",
      sourceStage: 6,
    },
    {
      key: "capability",
      title: "Capability and delivery",
      content: null,
      isPlaceholder: true,
      placeholderText: "Capability assessment to be completed (Stage 8 — coming soon).",
      sourceStage: 8,
    },
    {
      key: "risks",
      title: "Risks and assumptions",
      content: stage7Narratives.riskAssumptions,
      isPlaceholder: !stage7Narratives.riskAssumptions,
      placeholderText: "Risk and assumptions narrative to be generated (Stage 7).",
      sourceStage: 7,
    },
    {
      key: "recommendation",
      title: "Recommendation",
      content: buildRecommendation(model, recommendedScenario, initiatives),
      isPlaceholder: initiatives.length === 0,
      placeholderText: "Portfolio to be confirmed before recommendation can be generated.",
      sourceStage: 7,
    },
  ];

  // ── Charts ────────────────────────────────────────────────────────────────
  const charts = generateCharts(model, initiatives, recommendedScenario);

  return {
    companyName: profile?.companyName ?? "Your Organisation",
    sector: profile?.sector ?? "",
    ownershipStructure: profile?.ownershipStructure ?? null,
    headcount: profile?.ukEmployeeHeadcount ?? profile?.headcount ?? null,
    annualPayrollGbp: profile?.annualPayrollCostGbp ?? null,
    annualRevenueGbp: profile?.annualRevenueGbp ?? null,
    visionText: vision?.visionText ?? null,
    strategicShifts,
    principles: confirmedPrinciples,
    wontDos: confirmedWontDos,
    primaryTrigger: prework?.primaryTriggerForRewardAiStrategy ?? null,
    selectedInitiativeIds: selectedIds,
    initiatives,
    model,
    recommendedScenario,
    stage7Narratives,
    sections,
    charts,
    stageCompleteness,
    assembledAt: Date.now(),
  };
}

// ─── Programme narrative builder ─────────────────────────────────────────────

function buildProgrammeNarrative(initiatives: AssembledInitiative[]): string {
  const byPhase: Record<string, AssembledInitiative[]> = {};
  for (const i of initiatives) {
    if (!byPhase[i.phase]) byPhase[i.phase] = [];
    byPhase[i.phase].push(i);
  }
  const phaseOrder = ["Foundation", "Build", "Optimise"];
  const lines: string[] = [];
  for (const phase of phaseOrder) {
    const group = byPhase[phase];
    if (!group?.length) continue;
    lines.push(
      `${phase} (${group.length} initiative${group.length > 1 ? "s" : ""}): ` +
      group.map(i => i.title).join(", ") + "."
    );
  }
  return lines.join("\n\n");
}

// ─── Recommendation builder ───────────────────────────────────────────────────

function buildRecommendation(
  model: BusinessCaseModel,
  scenario: Scenario,
  initiatives: AssembledInitiative[]
): string {
  const rollup = model.rollup[scenario];
  const fmt = (n: number) => `£${(n / 1_000_000).toFixed(1)}M`;
  const foundationCount = initiatives.filter(i => i.phase === "Foundation").length;
  return [
    `We recommend approval of the full Reward AI programme (${initiatives.length} initiatives) ` +
    `representing a ${fmt(rollup.tco3yr)} three-year investment returning ${fmt(rollup.netValue3yr)} ` +
    `in adjusted value — a net benefit of ${fmt(rollup.netBenefit3yr)} at ${((rollup.roi3yr ?? 0) * 100).toFixed(0)}% ROI.`,
    foundationCount > 0
      ? `As an immediate next step, we ask for approval to begin the ${foundationCount} Foundation-phase ` +
        `initiative${foundationCount > 1 ? "s" : ""}, which establish the data and tooling foundations ` +
        `on which the Build and Optimise phases depend.`
      : "",
  ].filter(Boolean).join("\n\n");
}

// ─── Chart data generator ─────────────────────────────────────────────────────

export function generateCharts(
  model: BusinessCaseModel,
  initiatives: AssembledInitiative[],
  scenario: Scenario = "central"
): ChartData {
  // 1. Portfolio by phase
  const phaseMap: Record<string, { count: number; tco3yr: number }> = {};
  for (const init of initiatives) {
    if (!phaseMap[init.phase]) phaseMap[init.phase] = { count: 0, tco3yr: 0 };
    phaseMap[init.phase].count++;
    phaseMap[init.phase].tco3yr += init.tco3yrCentral;
  }
  const portfolioByPhase = ["Foundation", "Build", "Optimise"].map(phase => ({
    phase,
    count: phaseMap[phase]?.count ?? 0,
    tco3yr: phaseMap[phase]?.tco3yr ?? 0,
  }));

  // 2. Value by category (post-overlap-discount, honest figures)
  // Distribute the overlap discount proportionally across initiatives by value
  const rollup = model.rollup[scenario];
  const grossValue = rollup.grossValue3yr;
  const discountRatio = grossValue > 0 ? rollup.overlapDiscountTotal / grossValue : 0;
  const categoryMap: Record<string, number> = {};
  for (const line of model.lines) {
    const lib = REWARD_INITIATIVE_LIBRARY.find(i => i.id === line.initiativeId);
    const cat = lib?.primaryValueType ?? "strategic";
    const centralValue = line.value3yrCentral;
    // Apply proportional discount
    const adjustedValue = centralValue * (1 - discountRatio);
    categoryMap[cat] = (categoryMap[cat] ?? 0) + adjustedValue;
  }
  const categoryLabels: Record<string, string> = {
    efficiency: "Efficiency",
    decision_quality: "Decision Quality",
    risk_mitigation: "Risk Mitigation",
    retention: "Retention",
    strategic: "Strategic",
  };
  const totalCatValue = Object.values(categoryMap).reduce((a, b) => a + b, 0);
  const valueByCategory = Object.entries(categoryMap).map(([cat, value]) => ({
    category: cat,
    label: categoryLabels[cat] ?? cat,
    value3yr: value,
    pct: totalCatValue > 0 ? Math.round((value / totalCatValue) * 100) : 0,
  })).sort((a, b) => b.value3yr - a.value3yr);

  // 3. Cost vs value by scenario (honest: adjusted values, not naive sums)
  const costVsValue = (["conservative", "central", "optimistic"] as Scenario[]).map(s => ({
    scenario: s,
    tco3yr: model.rollup[s].tco3yr,
    netValue3yr: model.rollup[s].netValue3yr,
    netBenefit3yr: model.rollup[s].netBenefit3yr,
    grossValue3yr: model.rollup[s].grossValue3yr,
    overlapDiscountTotal: model.rollup[s].overlapDiscountTotal,
  }));

  // 4. Payback timeline (monthly accrual, central scenario)
  const centralRollup = model.rollup.central;
  const paybackTimeline: Array<{ month: number; cumulativeCost: number; cumulativeValue: number }> = [];
  // Distribute cost front-loaded (year1 heavier), value back-loaded
  const year1Cost = model.lines.reduce((s, l) => s + l.effectiveYear1Low + l.effectiveYear1High, 0) / 2;
  const ongoingCost = (centralRollup.tco3yr - year1Cost) / 2; // 2 remaining years
  const monthlyValue = centralRollup.netValue3yr / 36;
  const monthlyTco = centralRollup.tco3yr / 36;
  for (let m = 0; m <= 36; m++) {
    paybackTimeline.push({
      month: m,
      cumulativeCost: monthlyTco * m,
      cumulativeValue: monthlyValue * m,
    });
  }

  // 5. Investment by phase (implementation TCO only, programme funding separate)
  const investmentByPhase = portfolioByPhase.map(p => ({
    phase: p.phase,
    tco3yr: p.tco3yr,
  }));

  return { portfolioByPhase, valueByCategory, costVsValue, paybackTimeline, investmentByPhase };
}

// ─── State hash ───────────────────────────────────────────────────────────────

export function computeStateHash(data: {
  profile?: object | null;
  prework?: object | null;
  vision?: object | null;
  strategy?: object | null;
  principles?: object | null;
  portfolio?: object | null;
  businessCase?: object | null;
}): string {
  const payload = JSON.stringify({
    profile: data.profile ?? null,
    prework: data.prework ?? null,
    vision: data.vision ?? null,
    strategy: data.strategy ?? null,
    principles: data.principles ?? null,
    portfolio: data.portfolio ?? null,
    businessCase: data.businessCase ?? null,
  });
  return createHash("sha256").update(payload).digest("hex");
}

// ─── Narrative prompt data for Stage 10 executive summary ─────────────────────

export function buildStage10PromptData(
  report: AssembledReport,
  audience: Audience
): object {
  const r = report.model.rollup[report.recommendedScenario];
  const fmt = (n: number) => `£${(n / 1_000_000).toFixed(1)}M`;
  const fmtK = (n: number) => n >= 1_000_000 ? fmt(n) : `£${Math.round(n / 1000)}k`;

  return {
    companyName: report.companyName,
    sector: report.sector,
    headcount: report.headcount,
    annualPayrollGbp: report.annualPayrollGbp ? fmtK(report.annualPayrollGbp) : null,
    annualRevenueGbp: report.annualRevenueGbp ? fmt(report.annualRevenueGbp) : null,
    audience,
    vision: report.visionText,
    strategicShifts: report.strategicShifts.map(s => s.text),
    primaryTrigger: report.primaryTrigger,
    initiativeCount: report.initiatives.length,
    initiativesByPhase: {
      Foundation: report.initiatives.filter(i => i.phase === "Foundation").map(i => i.title),
      Build: report.initiatives.filter(i => i.phase === "Build").map(i => i.title),
      Optimise: report.initiatives.filter(i => i.phase === "Optimise").map(i => i.title),
    },
    financials: {
      scenario: report.recommendedScenario,
      investment: fmt(r.tco3yr),
      adjustedValue: fmt(r.netValue3yr),
      netBenefit: fmt(r.netBenefit3yr),
      roi: r.roi3yr !== null ? `${((r.roi3yr) * 100).toFixed(0)}%` : "N/A",
      paybackMonths: r.paybackMonths,
      overlapDiscountApplied: fmt(r.overlapDiscountTotal),
      conservativeNetBenefit: fmt(report.model.rollup.conservative.netBenefit3yr),
      optimisticNetBenefit: fmt(report.model.rollup.optimistic.netBenefit3yr),
    },
    principles: report.principles.map(p => p.text).slice(0, 5),
    wontDos: report.wontDos.map(w => w.text).slice(0, 3),
    stage7ExecSummary: report.stage7Narratives.execSummary,
  };
}
