/**
 * CPO Business Case Computation Engine — Stage 7
 *
 * Mirrors rewardBusinessCaseEngine.ts exactly:
 *
 *   §3.3  3-year TCO = Year 1 + 2 × ongoingAnnual
 *         (CPO: ongoingAnnual = 20% of y1 midpoint — standard SaaS maintenance rate)
 *   §3.4  Scenario sensitivity:
 *           conservative = low ends of cost + value ranges
 *           central      = midpoints
 *           optimistic   = high ends
 *   §3.6  Overlap discount:
 *           2 initiatives in same category → 15% on the lower-value one
 *           3+ initiatives in same category → 25% on all-but-highest-value
 *   §3.7  Payback period = TCO / (annualValue / 12)
 *
 * CRITICAL RULE: This service produces every number. The AI only narrates the
 * numbers it is handed. It never generates, estimates, or invents figures.
 *
 * Source data: fitImpactEngine.ts (valueRange) + initiativeLibrary.ts (y1CostRange).
 * The value range from fitImpactEngine is a single-year figure; we multiply by 3
 * to produce the 3-year value (consistent with how the Reward engine uses 3yr value
 * calibration in rewardInitiativeLibrary.ts).
 */

import {
  INITIATIVE_LIBRARY,
  type InitiativeCategory,
} from "../../shared/initiativeLibrary.js";
import {
  evaluateInitiative,
  type FitImpactEngineInputs,
} from "./fitImpactEngine.js";
import type { SectionAInputs, SectionCInputs, SectionDInputs, SectionIInputs } from "../../shared/valueFormulas.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CpoScenario = "conservative" | "central" | "optimistic";

export interface CpoInitiativeLine {
  initiativeId: string;
  label: string;
  category: InitiativeCategory;
  phase: number;
  phaseV3: string | null;
  timeToValueMonths: { min: number; max: number };

  // Raw figures from library + engine
  y1CostLowGbp: number;     // y1CostRange.low × 1000
  y1CostHighGbp: number;    // y1CostRange.high × 1000
  ongoingAnnualLowGbp: number;   // 20% of y1 low
  ongoingAnnualHighGbp: number;  // 20% of y1 high
  valueLowGbp: number;      // valueRange.low (single year) × 3
  valueHighGbp: number;     // valueRange.high (single year) × 3

  // Per-scenario TCO (3yr = year1 + 2 × ongoing)
  tco3yrConservative: number;
  tco3yrCentral: number;
  tco3yrOptimistic: number;

  // Per-scenario value (3yr)
  value3yrConservative: number;
  value3yrCentral: number;
  value3yrOptimistic: number;

  // Whether the value formula produced a result (false = qualitative only)
  hasQuantifiedValue: boolean;

  // Whether the initiative passed all hard gates for this company profile
  fitStatus: string;
  fitScore: number;
}

export interface CpoOverlapDiscountDetail {
  category: InitiativeCategory;
  initiativeIds: string[];
  initiativeLabels: string[];
  discountPct: number;           // 0.15 or 0.25
  discountAmountConservative: number;
  discountAmountCentral: number;
  discountAmountOptimistic: number;
}

export interface CpoScenarioRollup {
  scenario: CpoScenario;
  grossValue3yr: number;
  overlapDiscountTotal: number;
  netValue3yr: number;
  tco3yr: number;
  netBenefit3yr: number;
  annualValue: number;
  paybackMonths: number | null;  // null if no payback in 3yr window
  roi3yr: number | null;         // (netValue - TCO) / TCO, null if TCO = 0
}

export interface CpoBusinessCaseModel {
  // Per-initiative breakdown
  lines: CpoInitiativeLine[];

  // Overlap discounts applied
  overlapDiscounts: CpoOverlapDiscountDetail[];

  // Portfolio rollup
  rollup: {
    conservative: CpoScenarioRollup;
    central: CpoScenarioRollup;
    optimistic: CpoScenarioRollup;
  };

  // Metadata
  initiativeCount: number;
  portfolioCategories: string[];
  computedAt: number;
  /** IDs passed that were not found in the library. Non-empty means silent data loss. */
  unknownIds: string[];
  /** IDs that were found but produced no quantified value (qualitative-only). */
  qualitativeOnlyIds: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function midpoint(low: number, high: number): number {
  return Math.round((low + high) / 2);
}

function tco3yr(year1: number, ongoing: number): number {
  return year1 + 2 * ongoing;
}

/**
 * §3.6 Overlap discount — same logic as rewardBusinessCaseEngine.ts.
 * Groups by `category` (the CPO equivalent of Reward's `subDomain`).
 * Only quantified-value lines participate.
 */
function computeOverlapDiscounts(
  lines: CpoInitiativeLine[]
): CpoOverlapDiscountDetail[] {
  const byCategory = new Map<InitiativeCategory, CpoInitiativeLine[]>();
  for (const line of lines) {
    if (!line.hasQuantifiedValue) continue;
    const existing = byCategory.get(line.category) ?? [];
    existing.push(line);
    byCategory.set(line.category, existing);
  }

  const discounts: CpoOverlapDiscountDetail[] = [];

  for (const [category, group] of Array.from(byCategory.entries())) {
    if (group.length < 2) continue;

    const discountPct = group.length === 2 ? 0.15 : 0.25;

    // Sort by central value descending — keep the highest-value one at full rate
    const sorted = [...group].sort((a, b) => b.value3yrCentral - a.value3yrCentral);
    const discounted = group.length === 2
      ? [sorted[1]]
      : sorted.slice(1);

    const discountAmountConservative = discounted.reduce(
      (sum: number, l: CpoInitiativeLine) => sum + Math.round(l.value3yrConservative * discountPct), 0
    );
    const discountAmountCentral = discounted.reduce(
      (sum: number, l: CpoInitiativeLine) => sum + Math.round(l.value3yrCentral * discountPct), 0
    );
    const discountAmountOptimistic = discounted.reduce(
      (sum: number, l: CpoInitiativeLine) => sum + Math.round(l.value3yrOptimistic * discountPct), 0
    );

    discounts.push({
      category,
      initiativeIds: group.map(l => l.initiativeId),
      initiativeLabels: group.map(l => l.label),
      discountPct,
      discountAmountConservative,
      discountAmountCentral,
      discountAmountOptimistic,
    });
  }

  return discounts;
}

// ─── Main computation function ────────────────────────────────────────────────

/**
 * Simplified flat company profile — the engine maps this to the nested FitImpactEngineInputs.
 * This is the shape callers (tests, procedures) pass in.
 */
export interface CpoCompanyProfile {
  totalHeadcount: number;
  sector: string;
  hiresPerYear?: number;
  attritionRatePct?: number;
  lAndDSpendPerFteGbp?: number;
  costPerHireGbp?: number;
  timeToFillDays?: number;
  annualRevenueGbp?: number;
}

/** Map a flat CpoCompanyProfile to the nested FitImpactEngineInputs. */
export function profileToEngineInputs(profile: CpoCompanyProfile): FitImpactEngineInputs {
  const sectionA: SectionAInputs = {
    totalHeadcount: profile.totalHeadcount,
    sector: profile.sector,
  };
  const sectionC: SectionCInputs = {};
  const sectionD: SectionDInputs = {
    annualHires: profile.hiresPerYear,
    attritionRate: profile.attritionRatePct,
    annualLDSpend: profile.lAndDSpendPerFteGbp && profile.totalHeadcount
      ? profile.lAndDSpendPerFteGbp * profile.totalHeadcount
      : undefined,
    costPerExternalHire: profile.costPerHireGbp,
    avgTimeToFill: profile.timeToFillDays,
    annualRevenue: profile.annualRevenueGbp,
  };
  const sectionI: SectionIInputs = {};
  return { sectionA, sectionC, sectionD, sectionI };
}

/**
 * Compute a board-ready CPO business case from a portfolio of selected initiative IDs
 * and the company profile used by fitImpactEngine.
 *
 * @param selectedInitiativeIds  IDs from INITIATIVE_LIBRARY (CPO-mode scope)
 * @param profile                Flat company profile (mapped internally to FitImpactEngineInputs)
 */
export function computeCpoBusinessCase(
  selectedInitiativeIds: string[],
  profile: CpoCompanyProfile
): CpoBusinessCaseModel {
  const engineInputs = profileToEngineInputs(profile);
  const lines: CpoInitiativeLine[] = [];
  const unknownIds: string[] = [];
  const qualitativeOnlyIds: string[] = [];

  for (const id of selectedInitiativeIds) {
    const initiative = INITIATIVE_LIBRARY.find(i => i.id === id);
    if (!initiative) { unknownIds.push(id); continue; }

    // Evaluate the initiative to get valueRange
    const evaluated = evaluateInitiative(id, engineInputs);

    // y1 cost in GBP (library stores in £k)
    const y1CostLowGbp  = initiative.y1CostRange.low  * 1_000;
    const y1CostHighGbp = initiative.y1CostRange.high * 1_000;

    // Ongoing annual = 20% of y1 (standard SaaS maintenance rate)
    const ongoingAnnualLowGbp  = Math.round(y1CostLowGbp  * 0.20);
    const ongoingAnnualHighGbp = Math.round(y1CostHighGbp * 0.20);

    // 3-year value: single-year value × 3
    const hasQuantifiedValue = evaluated.valueRange !== null;
    const valueLowGbp  = hasQuantifiedValue ? evaluated.valueRange!.low  * 3 : 0;
    const valueHighGbp = hasQuantifiedValue ? evaluated.valueRange!.high * 3 : 0;

    if (!hasQuantifiedValue) qualitativeOnlyIds.push(id);

    // Per-scenario TCO
    const tco3yrConservative = tco3yr(y1CostLowGbp,  ongoingAnnualLowGbp);
    const tco3yrCentral      = tco3yr(midpoint(y1CostLowGbp, y1CostHighGbp), midpoint(ongoingAnnualLowGbp, ongoingAnnualHighGbp));
    const tco3yrOptimistic   = tco3yr(y1CostHighGbp, ongoingAnnualHighGbp);

    // Per-scenario value
    const value3yrConservative = valueLowGbp;
    const value3yrCentral      = midpoint(valueLowGbp, valueHighGbp);
    const value3yrOptimistic   = valueHighGbp;

    lines.push({
      initiativeId: id,
      label: initiative.label,
      category: initiative.category,
      phase: initiative.phase,
      phaseV3: initiative.phaseV3 ?? null,
      timeToValueMonths: initiative.timeToValueMonths,
      y1CostLowGbp,
      y1CostHighGbp,
      ongoingAnnualLowGbp,
      ongoingAnnualHighGbp,
      valueLowGbp,
      valueHighGbp,
      tco3yrConservative,
      tco3yrCentral,
      tco3yrOptimistic,
      value3yrConservative,
      value3yrCentral,
      value3yrOptimistic,
      hasQuantifiedValue,
      fitStatus: evaluated.fitStatus,
      fitScore: evaluated.fitScore,
    });
  }

  // Sort by phase then by label
  lines.sort((a, b) => a.phase - b.phase || a.label.localeCompare(b.label));

  // Compute overlap discounts
  const overlapDiscounts = computeOverlapDiscounts(lines);

  // Portfolio rollup
  function buildRollup(scenario: CpoScenario): CpoScenarioRollup {
    const quantifiedLines = lines.filter(l => l.hasQuantifiedValue);

    const grossValue3yr = quantifiedLines.reduce((sum, l) => {
      if (scenario === "conservative") return sum + l.value3yrConservative;
      if (scenario === "optimistic")  return sum + l.value3yrOptimistic;
      return sum + l.value3yrCentral;
    }, 0);

    const tco3yrTotal = lines.reduce((sum, l) => {
      if (scenario === "conservative") return sum + l.tco3yrConservative;
      if (scenario === "optimistic")  return sum + l.tco3yrOptimistic;
      return sum + l.tco3yrCentral;
    }, 0);

    const overlapDiscountTotal = overlapDiscounts.reduce((sum, d) => {
      if (scenario === "conservative") return sum + d.discountAmountConservative;
      if (scenario === "optimistic")  return sum + d.discountAmountOptimistic;
      return sum + d.discountAmountCentral;
    }, 0);

    const netValue3yr    = grossValue3yr - overlapDiscountTotal;
    const netBenefit3yr  = netValue3yr - tco3yrTotal;
    const annualValue    = Math.round(netValue3yr / 3);

    let paybackMonths: number | null = null;
    if (annualValue > 0 && tco3yrTotal > 0) {
      const months = Math.round((tco3yrTotal / annualValue) * 12);
      paybackMonths = months <= 36 ? months : null;
    }

    // KNOWN CALIBRATION DEFECT (founder decision required):
    // The conservative scenario's ROI currently exceeds the central scenario's ROI
    // (e.g. 17.8× conservative vs 13.01× central for the Meridian fixture).
    // Root cause: cost scales down faster than value in the conservative case —
    // tco3yrConservative uses the LOW end of cost ranges, which reduces the denominator
    // more than the LOW end of value ranges reduces the numerator.
    // This is a calibration artefact, not a code bug. Do not change the methodology here.
    const roi3yr = tco3yrTotal > 0
      ? Math.round(((netValue3yr - tco3yrTotal) / tco3yrTotal) * 100) / 100
      : null;

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
    rollup: {
      conservative: buildRollup("conservative"),
      central:      buildRollup("central"),
      optimistic:   buildRollup("optimistic"),
    },
    initiativeCount: lines.length,
    portfolioCategories: Array.from(new Set(lines.map(l => l.category))),
    computedAt: Date.now(),
    unknownIds,
    qualitativeOnlyIds,
  };
}

// ─── Narrative prompt builder ─────────────────────────────────────────────────

/**
 * Builds the structured data payload passed to the LLM for CPO Stage 7 narrative.
 * The LLM receives computed figures only — it must not estimate or invent numbers.
 * Mirrors rewardBusinessCaseEngine.ts buildNarrativePromptData exactly.
 */
export function buildCpoNarrativePromptData(
  model: CpoBusinessCaseModel,
  companyName: string,
  visionStatement: string | null,
  strategyStatement: string | null,
  confirmedPrincipleTitles: string[],
  recommendedScenario: CpoScenario,
  annualRevenueGbp?: number | null
): object {
  const rollup = model.rollup[recommendedScenario];
  const fmt  = (n: number) => `£${(n / 1_000_000).toFixed(1)}m`;
  const fmtK = (n: number) => n >= 1_000_000 ? fmt(n) : `£${Math.round(n / 1000)}k`;

  return {
    companyName,
    recommendedScenario,
    initiativeCount: model.initiativeCount,
    ...(annualRevenueGbp && annualRevenueGbp > 0 ? {
      investmentAsRevenuePercent: `${((rollup.tco3yr / annualRevenueGbp) * 100).toFixed(2)}% of annual revenue`,
    } : {}),
    portfolioCategories: model.portfolioCategories,
    visionSummary: visionStatement ?? "(not yet defined)",
    strategyStatement: strategyStatement ?? "(not yet defined)",
    confirmedPrinciples: confirmedPrincipleTitles,
    qualitativeOnlyInitiatives: model.qualitativeOnlyIds,

    financials: {
      grossValue3yr:        fmt(rollup.grossValue3yr),
      overlapDiscountTotal: fmtK(rollup.overlapDiscountTotal),
      netValue3yr:          fmt(rollup.netValue3yr),
      tco3yr:               fmt(rollup.tco3yr),
      netBenefit3yr:        fmt(rollup.netBenefit3yr),
      annualValue:          fmtK(rollup.annualValue),
      paybackMonths:        rollup.paybackMonths !== null ? `${rollup.paybackMonths} months` : "beyond 3-year window",
      roi3yr:               rollup.roi3yr !== null ? `${Math.round(rollup.roi3yr * 100)}%` : "N/A",
    },

    conservativeNetBenefit: fmt(model.rollup.conservative.netBenefit3yr),
    optimisticNetBenefit:   fmt(model.rollup.optimistic.netBenefit3yr),

    perInitiativeLines: model.lines.map(l => ({
      id: l.initiativeId,
      label: l.label,
      category: l.category,
      tco3yrCentral:   fmtK(l.tco3yrCentral),
      value3yrCentral: l.hasQuantifiedValue ? fmtK(l.value3yrCentral) : "qualitative only",
    })),

    overlapGroups: model.overlapDiscounts.map(d => ({
      category: d.category,
      initiatives: d.initiativeLabels,
      discountPct: `${Math.round(d.discountPct * 100)}%`,
      discountCentral: fmtK(d.discountAmountCentral),
    })),

    // Raw numeric fields for test assertions (never-invents-numbers guardrail)
    // These are the exact values from the computed model — the LLM must only
    // reference the formatted strings above, not invent its own figures.
    centralNetBenefit3yr:  rollup.netBenefit3yr,
    centralTco3yr:         rollup.tco3yr,
    centralRoi3yr:         rollup.roi3yr,
    centralPaybackMonths:  rollup.paybackMonths,
    overlapDiscountGroups: model.overlapDiscounts,
  };
}
