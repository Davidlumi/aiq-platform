/**
 * Reward Business Case Computation Engine — Stage 7
 *
 * Implements the financial model from §3 of the Stage 7 build brief:
 *
 *   §3.1-3.2  Cost-type branching (annual / project / per_cycle / per_deal)
 *   §3.3      3-year TCO = Year 1 + 2 × ongoingAnnual
 *   §3.4      Scenario sensitivity (conservative = low ends, central = midpoints, optimistic = high ends)
 *   §3.5      Programme funding (excludesProgrammeFunding initiatives shown separately)
 *   §3.6      Overlap discount (15% on lower-value for 2 in same sub-domain; 25% on all-but-highest for 3+)
 *   §3.7      Payback period = TCO / (annualValue × (1 - overlapDiscountFraction))
 *
 * CRITICAL RULE: This service produces every number. The AI only narrates the numbers
 * it is handed. It never generates, estimates, or invents figures.
 */

import {
  REWARD_INITIATIVE_LIBRARY,
  type RewardInitiative,
  type CostCalibration,
} from "../../shared/rewardInitiativeLibrary";
import type { RewardEngineInputs } from "./rewardRecommendationEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Scenario = "conservative" | "central" | "optimistic";

export interface InitiativeCostValue {
  initiativeId: string;
  number: number;
  title: string;
  subDomain: string;
  phase: string;
  primaryValueType: string;
  timeToFirstValueMonths: number;
  costType: string;
  excludesProgrammeFunding: boolean;
  programmeFundingNote: string | null;
  costNote: string | null;

  // Calibrated ranges (before overrides)
  modelYear1Low: number;
  modelYear1High: number;
  modelOngoingLow: number;
  modelOngoingHigh: number;
  modelValueLow: number;
  modelValueHigh: number;

  // Effective figures (after overrides)
  effectiveYear1Low: number;
  effectiveYear1High: number;
  effectiveOngoingLow: number;
  effectiveOngoingHigh: number;
  effectiveValueLow: number;
  effectiveValueHigh: number;

  // Override metadata
  hasOverride: boolean;
  overrideNote: string | null;

  // Per-scenario TCO (3yr = year1 + 2 × ongoing)
  tco3yrConservative: number;
  tco3yrCentral: number;
  tco3yrOptimistic: number;

  // Per-scenario value (3yr)
  value3yrConservative: number;
  value3yrCentral: number;
  value3yrOptimistic: number;

  // Whether excluded from standing TCO (per_deal with no active M&A, etc.)
  excludedFromStandingTco: boolean;
}

export interface OverlapDiscountDetail {
  subDomain: string;
  initiativeIds: string[];
  initiativeTitles: string[];
  discountPct: number;           // 0.15 or 0.25
  discountAmountConservative: number;
  discountAmountCentral: number;
  discountAmountOptimistic: number;
}

export interface ProgrammeFundingLine {
  initiativeId: string;
  title: string;
  note: string;
  /** Estimated range if computable (pay band uplift) */
  estimatedLow: number | null;
  estimatedHigh: number | null;
  /** Human-readable sizing note */
  sizingNote: string;
}

export interface BusinessCaseModel {
  // Per-initiative breakdown
  lines: InitiativeCostValue[];

  // Overlap discounts applied
  overlapDiscounts: OverlapDiscountDetail[];

  // Programme funding lines (separate from TCO)
  programmeFundingLines: ProgrammeFundingLine[];

  // Portfolio rollup (excluding programme funding, after overlap discount)
  rollup: {
    conservative: ScenarioRollup;
    central: ScenarioRollup;
    optimistic: ScenarioRollup;
  };

  // Metadata
  initiativeCount: number;
  portfolioSubDomains: string[];
  computedAt: number;
}

export interface ScenarioRollup {
  scenario: Scenario;
  grossValue3yr: number;
  overlapDiscountTotal: number;
  netValue3yr: number;
  tco3yr: number;
  netBenefit3yr: number;
  annualValue: number;
  paybackMonths: number | null;  // null if TCO > netValue3yr (no payback in 3yr window)
  roi3yr: number | null;         // (netValue - TCO) / TCO, null if TCO = 0
}

// ─── Override types ───────────────────────────────────────────────────────────

export interface CostValueOverrides {
  [initiativeId: string]: {
    year1Low?: number;
    year1High?: number;
    ongoingLow?: number;
    ongoingHigh?: number;
    valueLow?: number;
    valueHigh?: number;
    overrideNote?: string;
  };
}

export interface ProgrammeFundingAssumptions {
  offBandPopulationPct?: number;   // default: show qualitative note only
  programmeFundingNote?: string;
}

// ─── Helpers (re-implemented from engine to keep service self-contained) ──────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function calibrateCost(
  cc: CostCalibration,
  inputs: Pick<RewardEngineInputs, "sector" | "totalEmployeeHeadcount">
): { year1Low: number; year1High: number; ongoingLow: number; ongoingHigh: number } {
  const headcount = Math.max(inputs.totalEmployeeHeadcount ?? 3000, 1);
  const logMin = Math.log10(cc.headcountMin);
  const logMax = Math.log10(cc.headcountMax);
  const position = clamp((Math.log10(headcount) - logMin) / (logMax - logMin), 0, 1);

  const year1Mid = cc.year1Low + position * (cc.year1High - cc.year1Low);
  const ongoingMid = cc.ongoingAnnualLow + position * (cc.ongoingAnnualHigh - cc.ongoingAnnualLow);

  const rawSectorMult = cc.sectorMultipliers[inputs.sector ?? ""] ?? cc.defaultSectorMultiplier;
  const mult = clamp(cc.subDomainMultiplier ?? rawSectorMult, 0.6, 2);

  return {
    year1Low:    Math.round(year1Mid  * mult * 0.75),
    year1High:   Math.round(year1Mid  * mult * 1.25),
    ongoingLow:  Math.round(ongoingMid * mult * 0.75),
    ongoingHigh: Math.round(ongoingMid * mult * 1.25),
  };
}

function calibrateValue(
  initiative: RewardInitiative,
  inputs: Pick<RewardEngineInputs, "sector" | "totalEmployeeHeadcount" | "totalPayrollGbp">
): { low: number; high: number } {
  const vc = initiative.valueCalibration;
  const payroll = inputs.totalPayrollGbp ?? vc.payrollBaseline;
  const headcount = inputs.totalEmployeeHeadcount ?? vc.headcountBaseline;

  const payrollMult = clamp(
    1 + (Math.log10(Math.max(payroll, 1) / vc.payrollBaseline)) * vc.payrollFactor,
    0.5, 3
  );
  const headcountMult = clamp(
    1 + (Math.log10(Math.max(headcount, 1) / vc.headcountBaseline)) * vc.headcountFactor,
    0.5, 3
  );
  const sectorMult = vc.sectorMultipliers[inputs.sector ?? ""] ?? vc.defaultSectorMultiplier;

  return {
    low:  Math.round(vc.base3yrLow  * payrollMult * headcountMult * sectorMult),
    high: Math.round(vc.base3yrHigh * payrollMult * headcountMult * sectorMult),
  };
}

function tco3yr(year1: number, ongoing: number): number {
  return year1 + 2 * ongoing;
}

function midpoint(low: number, high: number): number {
  return Math.round((low + high) / 2);
}

// ─── Cost-type branching ──────────────────────────────────────────────────────

/**
 * Returns true if the initiative should be excluded from the standing TCO.
 * Per §3.2: per_deal initiatives with no active M&A context are excluded.
 * We use a conservative heuristic: exclude per_deal unless the initiative
 * explicitly has a costNote indicating it should be included.
 */
function isExcludedFromStandingTco(initiative: RewardInitiative): boolean {
  return initiative.costCalibration.costType === "per_deal";
}

/**
 * Compute effective year1 and ongoing figures based on costType.
 * - annual: standard year1 + 2×ongoing
 * - project: year1 is one-off; ongoing is 0 (or minimal support)
 * - per_cycle: year1 is per-cycle cost; ongoing is the recurring annual
 * - per_deal: excluded from standing TCO (handled separately)
 */
function effectiveCostForTco(
  costType: string,
  year1Low: number,
  year1High: number,
  ongoingLow: number,
  ongoingHigh: number
): { year1Low: number; year1High: number; ongoingLow: number; ongoingHigh: number } {
  if (costType === "project") {
    // One-off; no ongoing after year 1
    return { year1Low, year1High, ongoingLow: 0, ongoingHigh: 0 };
  }
  // annual, per_cycle, per_deal — use as-is
  return { year1Low, year1High, ongoingLow, ongoingHigh };
}

// ─── Overlap discount ─────────────────────────────────────────────────────────

/**
 * §3.6 Overlap discount:
 *   - 2 initiatives in same sub-domain → 15% discount on the lower-value one
 *   - 3+ initiatives in same sub-domain → 25% discount on all but the highest-value one
 *
 * Applied to 3yr value figures per scenario.
 * Costs are incremental (summing is fine); only value is discounted.
 */
function computeOverlapDiscounts(
  lines: InitiativeCostValue[]
): OverlapDiscountDetail[] {
  // Group by sub-domain. Only exclude per_deal lines (excludedFromStandingTco).
  // excludesProgrammeFunding only separates the payroll uplift from the headline TCO;
  // it does NOT exclude an initiative from the overlap discount group. #6 Pay Band Design
  // belongs in the Compensation sub-domain and its value is discounted accordingly.
  const bySubDomain = new Map<string, InitiativeCostValue[]>();
  for (const line of lines) {
    if (line.excludedFromStandingTco) continue;
    const existing = bySubDomain.get(line.subDomain) ?? [];
    existing.push(line);
    bySubDomain.set(line.subDomain, existing);
  }

  const discounts: OverlapDiscountDetail[] = [];

  for (const [subDomain, group] of Array.from(bySubDomain.entries())) {
    if (group.length < 2) continue;

    const discountPct = group.length === 2 ? 0.15 : 0.25;

    // Sort by central value descending — keep the highest-value one at full rate
    const sorted = [...group].sort((a, b) => b.value3yrCentral - a.value3yrCentral);
    const discounted = group.length === 2
      ? [sorted[1]]           // discount the lower-value one
      : sorted.slice(1);      // discount all but the highest

    const discountAmountConservative = discounted.reduce(
      (sum: number, l: InitiativeCostValue) => sum + Math.round(l.value3yrConservative * discountPct), 0
    );
    const discountAmountCentral = discounted.reduce(
      (sum: number, l: InitiativeCostValue) => sum + Math.round(l.value3yrCentral * discountPct), 0
    );
    const discountAmountOptimistic = discounted.reduce(
      (sum: number, l: InitiativeCostValue) => sum + Math.round(l.value3yrOptimistic * discountPct), 0
    );

    discounts.push({
      subDomain,
      initiativeIds: group.map(l => l.initiativeId),
      initiativeTitles: group.map(l => l.title),
      discountPct,
      discountAmountConservative,
      discountAmountCentral,
      discountAmountOptimistic,
    });
  }

  return discounts;
}

// ─── Programme funding lines ──────────────────────────────────────────────────

function buildProgrammeFundingLines(
  lines: InitiativeCostValue[],
  inputs: Pick<RewardEngineInputs, "totalPayrollGbp" | "totalEmployeeHeadcount">,
  assumptions: ProgrammeFundingAssumptions
): ProgrammeFundingLine[] {
  const pfLines: ProgrammeFundingLine[] = [];

  for (const line of lines) {
    if (!line.excludesProgrammeFunding) continue;

    let estimatedLow: number | null = null;
    let estimatedHigh: number | null = null;
    let sizingNote = line.programmeFundingNote ?? "Programme funding required — size against affected payroll.";

    // For pay band design (#6) — size against off-band population
    if (line.initiativeId === "ai_pay_band_design") {
      const payroll = inputs.totalPayrollGbp;
      if (payroll && payroll > 0) {
        const pct = assumptions.offBandPopulationPct;
        if (pct != null && pct > 0) {
          // Use specified percentage
          estimatedLow  = Math.round(payroll * (pct / 100) * 0.01);
          estimatedHigh = Math.round(payroll * (pct / 100) * 0.03);
          sizingNote = `Estimated pay uplift for ${pct}% of affected payroll (1–3% uplift range). Actual cost depends on the proportion of employees below new band minimums.`;
        } else {
          // Qualitative only — don't guess a proportion
          sizingNote = "Depends on the proportion of your workforce below new band minimums — typically 10–30% of headcount in a first-generation pay band design. Size against affected payroll at 1–3% uplift.";
        }
      }
    }

    pfLines.push({
      initiativeId: line.initiativeId,
      title: line.title,
      note: sizingNote,
      estimatedLow,
      estimatedHigh,
      sizingNote,
    });
  }

  return pfLines;
}

// ─── Main computation function ────────────────────────────────────────────────

export function computeBusinessCase(
  selectedInitiativeIds: string[],
  inputs: Pick<RewardEngineInputs, "sector" | "totalEmployeeHeadcount" | "totalPayrollGbp">,
  overrides: CostValueOverrides,
  programmeFundingAssumptions: ProgrammeFundingAssumptions
): BusinessCaseModel {
  const lines: InitiativeCostValue[] = [];

  for (const id of selectedInitiativeIds) {
    const initiative = REWARD_INITIATIVE_LIBRARY.find(i => i.id === id);
    if (!initiative) continue;

    // Calibrate model figures
    const modelCost = calibrateCost(initiative.costCalibration, inputs);
    const modelValue = calibrateValue(initiative, inputs);

    // Apply overrides
    const ov = overrides[id] ?? {};
    const effectiveYear1Low    = ov.year1Low    ?? modelCost.year1Low;
    const effectiveYear1High   = ov.year1High   ?? modelCost.year1High;
    const effectiveOngoingLow  = ov.ongoingLow  ?? modelCost.ongoingLow;
    const effectiveOngoingHigh = ov.ongoingHigh ?? modelCost.ongoingHigh;
    const effectiveValueLow    = ov.valueLow    ?? modelValue.low;
    const effectiveValueHigh   = ov.valueHigh   ?? modelValue.high;

    const costType = initiative.costCalibration.costType;
    const excludedFromStandingTco = isExcludedFromStandingTco(initiative);

    // Cost-type branching for TCO
    const { year1Low: tcoY1Low, year1High: tcoY1High, ongoingLow: tcoOnLow, ongoingHigh: tcoOnHigh } =
      effectiveCostForTco(costType, effectiveYear1Low, effectiveYear1High, effectiveOngoingLow, effectiveOngoingHigh);

    // Per-scenario TCO
    const tco3yrConservative = excludedFromStandingTco ? 0 : tco3yr(tcoY1Low,  tcoOnLow);
    const tco3yrCentral      = excludedFromStandingTco ? 0 : tco3yr(midpoint(tcoY1Low, tcoY1High), midpoint(tcoOnLow, tcoOnHigh));
    const tco3yrOptimistic   = excludedFromStandingTco ? 0 : tco3yr(tcoY1High, tcoOnHigh);

    // Per-scenario value
    const value3yrConservative = effectiveValueLow;
    const value3yrCentral      = midpoint(effectiveValueLow, effectiveValueHigh);
    const value3yrOptimistic   = effectiveValueHigh;

    lines.push({
      initiativeId: id,
      number: initiative.number,
      title: initiative.title,
      subDomain: initiative.subDomain,
      phase: initiative.defaultPhase,
      primaryValueType: initiative.primaryValueType,
      timeToFirstValueMonths: initiative.timeToFirstValueMonths,
      costType,
      excludesProgrammeFunding: initiative.costCalibration.excludesProgrammeFunding ?? false,
      programmeFundingNote: initiative.costCalibration.programmeFundingNote ?? null,
      costNote: initiative.costCalibration.costNote ?? null,

      modelYear1Low:    modelCost.year1Low,
      modelYear1High:   modelCost.year1High,
      modelOngoingLow:  modelCost.ongoingLow,
      modelOngoingHigh: modelCost.ongoingHigh,
      modelValueLow:    modelValue.low,
      modelValueHigh:   modelValue.high,

      effectiveYear1Low,
      effectiveYear1High,
      effectiveOngoingLow,
      effectiveOngoingHigh,
      effectiveValueLow,
      effectiveValueHigh,

      hasOverride: Object.keys(ov).length > 0,
      overrideNote: ov.overrideNote ?? null,

      tco3yrConservative,
      tco3yrCentral,
      tco3yrOptimistic,

      value3yrConservative,
      value3yrCentral,
      value3yrOptimistic,

      excludedFromStandingTco,
    });
  }

  // Sort by initiative number
  lines.sort((a, b) => a.number - b.number);

  // Compute overlap discounts
  const overlapDiscounts = computeOverlapDiscounts(lines);

  // Programme funding lines
  const programmeFundingLines = buildProgrammeFundingLines(lines, inputs, programmeFundingAssumptions);

  // Portfolio rollup
  // Standing lines: exclude per_deal (excludedFromStandingTco) and programme-funding lines
  // (excludesProgrammeFunding). Programme funding is shown as a separate section.
  const standingLines = lines.filter(l => !l.excludedFromStandingTco && !l.excludesProgrammeFunding);

  function buildRollup(scenario: Scenario): ScenarioRollup {
    const grossValue3yr = standingLines.reduce((sum, l) => {
      if (scenario === "conservative") return sum + l.value3yrConservative;
      if (scenario === "optimistic")  return sum + l.value3yrOptimistic;
      return sum + l.value3yrCentral;
    }, 0);

    const tco3yrTotal = standingLines.reduce((sum, l) => {
      if (scenario === "conservative") return sum + l.tco3yrConservative;
      if (scenario === "optimistic")  return sum + l.tco3yrOptimistic;
      return sum + l.tco3yrCentral;
    }, 0);

    const overlapDiscountTotal = overlapDiscounts.reduce((sum, d) => {
      if (scenario === "conservative") return sum + d.discountAmountConservative;
      if (scenario === "optimistic")  return sum + d.discountAmountOptimistic;
      return sum + d.discountAmountCentral;
    }, 0);

    const netValue3yr = grossValue3yr - overlapDiscountTotal;
    const netBenefit3yr = netValue3yr - tco3yrTotal;
    const annualValue = Math.round(netValue3yr / 3);

    // Payback: months until cumulative value exceeds TCO
    // Simplified: paybackMonths = TCO / (annualValue / 12)
    let paybackMonths: number | null = null;
    if (annualValue > 0 && tco3yrTotal > 0) {
      const months = Math.round((tco3yrTotal / annualValue) * 12);
      paybackMonths = months <= 36 ? months : null; // null if beyond 3yr window
    }

    const roi3yr = tco3yrTotal > 0 ? Math.round(((netValue3yr - tco3yrTotal) / tco3yrTotal) * 100) / 100 : null;

    return {
      scenario,
      grossValue3yr,
      overlapDiscountTotal,
      netValue3yr,
      tco3yr: tco3yrTotal,
      netBenefit3yr,
      annualValue,
      paybackMonths,
      roi3yr,
    };
  }

  return {
    lines,
    overlapDiscounts,
    programmeFundingLines,
    rollup: {
      conservative: buildRollup("conservative"),
      central:      buildRollup("central"),
      optimistic:   buildRollup("optimistic"),
    },
    initiativeCount: lines.length,
    portfolioSubDomains: Array.from(new Set(lines.map(l => l.subDomain))),
    computedAt: Date.now(),
  };
}

// ─── Narrative prompt builder ─────────────────────────────────────────────────

/**
 * Builds the structured data payload passed to the LLM for narrative generation.
 * The LLM receives computed figures only — it must not estimate or invent numbers.
 */
export function buildNarrativePromptData(
  model: BusinessCaseModel,
  companyName: string,
  visionText: string | null,
  strategyShifts: Array<{ title: string }> | null,
  confirmedPrincipleTitles: string[],
  recommendedScenario: Scenario,
  annualRevenueGbp?: number | null
): object {
  const rollup = model.rollup[recommendedScenario];
  const fmt = (n: number) => `£${(n / 1_000_000).toFixed(1)}m`;
  const fmtK = (n: number) => n >= 1_000_000 ? fmt(n) : `£${Math.round(n / 1000)}k`;

  return {
    companyName,
    recommendedScenario,
    initiativeCount: model.initiativeCount,
    ...(annualRevenueGbp && annualRevenueGbp > 0 ? {
      investmentAsRevenuePercent: `${((model.rollup[recommendedScenario].tco3yr / annualRevenueGbp) * 100).toFixed(2)}% of annual revenue`,
    } : {}),
    portfolioSubDomains: model.portfolioSubDomains,
    visionSummary: visionText ?? "(not yet defined)",
    strategicShifts: strategyShifts?.map(s => s.title) ?? [],
    confirmedPrinciples: confirmedPrincipleTitles,

    financials: {
      grossValue3yr:        fmt(rollup.grossValue3yr),
      overlapDiscountTotal: fmtK(rollup.overlapDiscountTotal),
      netValue3yr:          fmt(rollup.netValue3yr),
      tco3yr:               fmt(rollup.tco3yr),
      netBenefit3yr:        fmt(rollup.netBenefit3yr),
      annualValue:          fmt(rollup.annualValue),
      paybackMonths:        rollup.paybackMonths,
      roi3yr:               rollup.roi3yr != null ? `${Math.round(rollup.roi3yr * 100)}%` : "beyond 3yr window",
    },

    scenarioComparison: {
      conservative: {
        netValue3yr:  fmt(model.rollup.conservative.netValue3yr),
        tco3yr:       fmt(model.rollup.conservative.tco3yr),
        netBenefit3yr: fmt(model.rollup.conservative.netBenefit3yr),
      },
      central: {
        netValue3yr:  fmt(model.rollup.central.netValue3yr),
        tco3yr:       fmt(model.rollup.central.tco3yr),
        netBenefit3yr: fmt(model.rollup.central.netBenefit3yr),
      },
      optimistic: {
        netValue3yr:  fmt(model.rollup.optimistic.netValue3yr),
        tco3yr:       fmt(model.rollup.optimistic.tco3yr),
        netBenefit3yr: fmt(model.rollup.optimistic.netBenefit3yr),
      },
    },

    overlapDiscounts: model.overlapDiscounts.map(d => ({
      subDomain: d.subDomain,
      initiativeTitles: d.initiativeTitles,
      discountPct: `${Math.round(d.discountPct * 100)}%`,
      discountAmount: fmtK(recommendedScenario === "conservative"
        ? d.discountAmountConservative
        : recommendedScenario === "optimistic"
        ? d.discountAmountOptimistic
        : d.discountAmountCentral),
    })),

    programmeFundingLines: model.programmeFundingLines.map(pf => ({
      title: pf.title,
      sizingNote: pf.sizingNote,
      estimatedRange: pf.estimatedLow != null && pf.estimatedHigh != null
        ? `${fmtK(pf.estimatedLow)}–${fmtK(pf.estimatedHigh)}`
        : "size against affected payroll",
    })),

    topValueInitiatives: [...model.lines]
      .filter(l => !l.excludedFromStandingTco)
      .sort((a, b) => b.value3yrCentral - a.value3yrCentral)
      .slice(0, 5)
      .map(l => ({
        title: l.title,
        value3yr: fmtK(l.value3yrCentral),
        primaryValueType: l.primaryValueType,
        timeToFirstValueMonths: l.timeToFirstValueMonths,
      })),
  };
}
