/**
 * Meridian Health Group — CPO Business Case Golden-Master
 *
 * This file locks the exact output of computeCpoBusinessCase for the canonical
 * Meridian fixture. Any change to the engine that alters these figures MUST be
 * intentional and reviewed by the founder before merging.
 *
 * Fixture: Meridian Health Group
 *   - Sector: healthcare
 *   - Headcount: 12,000
 *   - Hires/year: 1,800
 *   - Attrition: 18%
 *   - L&D spend/FTE: £450
 *   - Cost per hire: £3,800
 *   - Time to fill: 42 days
 *   - Annual revenue: £680M
 *
 * Portfolio: 9 quantified-value initiatives across 5 categories
 *   - ai_capability (3): wp_ai_capability_building, wp_ai_capability_advanced, ee_workforce_ai_comms
 *   - governance (2): gv_ai_governance, gv_cross_cutting_bias_audit
 *   - internal_mobility (2): im_skills_inference, im_mentor_matching
 *   - retention (1): rt_stay_interview_ai
 *   - manager_effectiveness (1): mg_manager_copilot
 *
 * Overlap groups:
 *   - ai_capability (3 initiatives) → 25% discount
 *   - governance (2 initiatives) → 15% discount
 *   - internal_mobility (2 initiatives) → 15% discount
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  computeCpoBusinessCase,
  type CpoCompanyProfile,
  type CpoBusinessCaseModel,
} from "./services/cpoBusinessCaseEngine";

// ── Fixture ───────────────────────────────────────────────────────────────────

// Fix 10 — Profile sourcing note:
// MERIDIAN is a FICTIONAL test fixture used to lock the CPO business-case engine's
// arithmetic. These figures are NOT sourced from a real company and require no
// external citation. They were chosen to exercise the engine across a realistic
// healthcare headcount/revenue range. Do not cite in any client-facing output.
const MERIDIAN_PROFILE: CpoCompanyProfile = {
  totalHeadcount: 12_000,
  sector: "healthcare",
  hiresPerYear: 1_800,
  attritionRatePct: 18,
  lAndDSpendPerFteGbp: 450,
  costPerHireGbp: 3_800,
  timeToFillDays: 42,
  annualRevenueGbp: 680_000_000,
};

const MERIDIAN_IDS = [
  "im_skills_inference",
  "im_mentor_matching",
  "rt_stay_interview_ai",
  "mg_manager_copilot",
  "gv_ai_governance",
  "gv_cross_cutting_bias_audit",
  "wp_ai_capability_building",
  "wp_ai_capability_advanced",
  "ee_workforce_ai_comms",
] as const;

// ── Locked figures (from verbatim engine dump 2026-05-27) ─────────────────────
const LOCKED = {
  // Per-initiative TCO (conservative / central / optimistic)
  initiatives: {
    im_skills_inference:        { tco: [140_000, 350_000, 560_000],  value: [2_100_000, 3_675_000, 5_250_000] },
    im_mentor_matching:         { tco: [42_000,   91_000, 140_000],  value: [900_000,   1_575_000, 2_250_000] },
    rt_stay_interview_ai:       { tco: [56_000,  133_000, 210_000],  value: [1_125_000, 1_912_500, 2_700_000] },
    mg_manager_copilot:         { tco: [56_000,  168_000, 280_000],  value: [1_875_000, 3_187_500, 4_500_000] },
    gv_ai_governance:           { tco: [70_000,  175_000, 280_000],  value: [1_296_000, 2_376_000, 3_456_000] },
    gv_cross_cutting_bias_audit:{ tco: [56_000,  133_000, 210_000],  value: [900_000,   1_650_000, 2_400_000] },
    wp_ai_capability_building:  { tco: [56_000,   98_000, 140_000],  value: [1_800_000, 3_060_000, 4_320_000] },
    wp_ai_capability_advanced:  { tco: [112_000, 231_000, 350_000],  value: [1_800_000, 3_060_000, 4_320_000] },
    ee_workforce_ai_comms:      { tco: [28_000,   56_000,  84_000],  value: [675_000,   1_147_500, 1_620_000] },
  },
  // Gross value (pre-discount)
  grossValue: { conservative: 12_471_000, central: 21_643_500, optimistic: 30_816_000 },
  // Overlap discounts
  overlap: {
    aiCapabilityPct: 0.25,
    aiCapabilityCentral: 1_051_875,
    governancePct: 0.15,
    governanceCentral: 247_500,
    internalMobilityPct: 0.15,
    internalMobilityCentral: 236_250,
    totalConservative: 888_750,
    totalCentral: 1_535_625,
    totalOptimistic: 2_182_500,
  },
  // Net value (post-discount)
  netValue: { conservative: 11_582_250, central: 20_107_875, optimistic: 28_633_500 },
  // TCO
  tco: { conservative: 616_000, central: 1_435_000, optimistic: 2_254_000 },
  // Net benefit
  netBenefit: { conservative: 10_966_250, central: 18_672_875, optimistic: 26_379_500 },
  // ROI (3yr)
  roi: { conservative: 17.8, central: 13.01, optimistic: 11.7 },
  // Payback months
  payback: { conservative: 2, central: 3, optimistic: 3 },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Meridian Health Group — CPO golden-master", () => {
  let model: CpoBusinessCaseModel;

  beforeAll(() => {
    model = computeCpoBusinessCase([...MERIDIAN_IDS], MERIDIAN_PROFILE);
  });

  // ── Portfolio metadata ───────────────────────────────────────────────────────

  it("returns 9 initiative lines", () => {
    expect(model.lines.length).toBe(9);
  });

  it("has 0 unknown IDs", () => {
    expect(model.unknownIds.length).toBe(0);
  });

  it("has 0 qualitative-only IDs", () => {
    expect(model.qualitativeOnlyIds.length).toBe(0);
  });

  it("covers 5 portfolio categories", () => {
    expect(model.portfolioCategories.length).toBe(5);
    expect(model.portfolioCategories).toContain("ai_capability");
    expect(model.portfolioCategories).toContain("governance");
    expect(model.portfolioCategories).toContain("internal_mobility");
    expect(model.portfolioCategories).toContain("retention");
    expect(model.portfolioCategories).toContain("manager_effectiveness");
  });

  // ── Per-initiative TCO and value ─────────────────────────────────────────────

  for (const [id, expected] of Object.entries(LOCKED.initiatives)) {
    it(`${id}: TCO conservative = £${expected.tco[0].toLocaleString()}`, () => {
      const line = model.lines.find(l => l.initiativeId === id);
      expect(line).toBeDefined();
      expect(line!.tco3yrConservative).toBe(expected.tco[0]);
    });

    it(`${id}: TCO central = £${expected.tco[1].toLocaleString()}`, () => {
      const line = model.lines.find(l => l.initiativeId === id);
      expect(line!.tco3yrCentral).toBe(expected.tco[1]);
    });

    it(`${id}: value central = £${expected.value[1].toLocaleString()}`, () => {
      const line = model.lines.find(l => l.initiativeId === id);
      expect(line!.value3yrCentral).toBe(expected.value[1]);
    });
  }

  // ── Gross value ──────────────────────────────────────────────────────────────

  it(`gross value conservative = £${LOCKED.grossValue.conservative.toLocaleString()}`, () => {
    // Sum of all conservative value lines
    const sum = model.lines.reduce((acc, l) => acc + l.value3yrConservative, 0);
    expect(sum).toBe(LOCKED.grossValue.conservative);
  });

  it(`gross value central = £${LOCKED.grossValue.central.toLocaleString()}`, () => {
    expect(model.rollup.central.grossValue3yr).toBe(LOCKED.grossValue.central);
  });

  it(`gross value optimistic = £${LOCKED.grossValue.optimistic.toLocaleString()}`, () => {
    expect(model.rollup.optimistic.grossValue3yr).toBe(LOCKED.grossValue.optimistic);
  });

  // ── Overlap discounts ────────────────────────────────────────────────────────

  it("produces 3 overlap groups", () => {
    expect(model.overlapDiscounts.length).toBe(3);
  });

  it("ai_capability group (25%): 3 initiatives → £1,051,875 central discount", () => {
    const g = model.overlapDiscounts.find(d => d.category === "ai_capability");
    expect(g).toBeDefined();
    expect(g!.discountPct).toBe(LOCKED.overlap.aiCapabilityPct);
    expect(g!.discountAmountCentral).toBe(LOCKED.overlap.aiCapabilityCentral);
    expect(g!.initiativeIds).toContain("wp_ai_capability_building");
    expect(g!.initiativeIds).toContain("wp_ai_capability_advanced");
    expect(g!.initiativeIds).toContain("ee_workforce_ai_comms");
  });

  it("governance group (15%): 2 initiatives → £247,500 central discount", () => {
    const g = model.overlapDiscounts.find(d => d.category === "governance");
    expect(g).toBeDefined();
    expect(g!.discountPct).toBe(LOCKED.overlap.governancePct);
    expect(g!.discountAmountCentral).toBe(LOCKED.overlap.governanceCentral);
    expect(g!.initiativeIds).toContain("gv_ai_governance");
    expect(g!.initiativeIds).toContain("gv_cross_cutting_bias_audit");
  });

  it("internal_mobility group (15%): 2 initiatives → £236,250 central discount", () => {
    const g = model.overlapDiscounts.find(d => d.category === "internal_mobility");
    expect(g).toBeDefined();
    expect(g!.discountPct).toBe(LOCKED.overlap.internalMobilityPct);
    expect(g!.discountAmountCentral).toBe(LOCKED.overlap.internalMobilityCentral);
  });

  it(`total overlap discount conservative = £${LOCKED.overlap.totalConservative.toLocaleString()}`, () => {
    expect(model.rollup.conservative.overlapDiscountTotal).toBe(LOCKED.overlap.totalConservative);
  });

  it(`total overlap discount central = £${LOCKED.overlap.totalCentral.toLocaleString()}`, () => {
    expect(model.rollup.central.overlapDiscountTotal).toBe(LOCKED.overlap.totalCentral);
  });

  it(`total overlap discount optimistic = £${LOCKED.overlap.totalOptimistic.toLocaleString()}`, () => {
    expect(model.rollup.optimistic.overlapDiscountTotal).toBe(LOCKED.overlap.totalOptimistic);
  });

  // ── Net value ────────────────────────────────────────────────────────────────

  it(`net value conservative = £${LOCKED.netValue.conservative.toLocaleString()}`, () => {
    expect(model.rollup.conservative.netValue3yr).toBe(LOCKED.netValue.conservative);
  });

  it(`net value central = £${LOCKED.netValue.central.toLocaleString()}`, () => {
    expect(model.rollup.central.netValue3yr).toBe(LOCKED.netValue.central);
  });

  it(`net value optimistic = £${LOCKED.netValue.optimistic.toLocaleString()}`, () => {
    expect(model.rollup.optimistic.netValue3yr).toBe(LOCKED.netValue.optimistic);
  });

  // ── TCO ──────────────────────────────────────────────────────────────────────

  it(`TCO conservative = £${LOCKED.tco.conservative.toLocaleString()}`, () => {
    expect(model.rollup.conservative.tco3yr).toBe(LOCKED.tco.conservative);
  });

  it(`TCO central = £${LOCKED.tco.central.toLocaleString()}`, () => {
    expect(model.rollup.central.tco3yr).toBe(LOCKED.tco.central);
  });

  it(`TCO optimistic = £${LOCKED.tco.optimistic.toLocaleString()}`, () => {
    expect(model.rollup.optimistic.tco3yr).toBe(LOCKED.tco.optimistic);
  });

  // ── Net benefit ──────────────────────────────────────────────────────────────

  it(`net benefit conservative = £${LOCKED.netBenefit.conservative.toLocaleString()} (positive)`, () => {
    expect(model.rollup.conservative.netBenefit3yr).toBe(LOCKED.netBenefit.conservative);
    expect(model.rollup.conservative.netBenefit3yr).toBeGreaterThan(0);
  });

  it(`net benefit central = £${LOCKED.netBenefit.central.toLocaleString()}`, () => {
    expect(model.rollup.central.netBenefit3yr).toBe(LOCKED.netBenefit.central);
  });

  it(`net benefit optimistic = £${LOCKED.netBenefit.optimistic.toLocaleString()}`, () => {
    expect(model.rollup.optimistic.netBenefit3yr).toBe(LOCKED.netBenefit.optimistic);
  });

  // ── ROI ──────────────────────────────────────────────────────────────────────

  it(`ROI conservative = ${LOCKED.roi.conservative}x`, () => {
    expect(model.rollup.conservative.roi3yr).toBe(LOCKED.roi.conservative);
  });

  it(`ROI central = ${LOCKED.roi.central}x`, () => {
    expect(model.rollup.central.roi3yr).toBe(LOCKED.roi.central);
  });

  it(`ROI optimistic = ${LOCKED.roi.optimistic}x`, () => {
    expect(model.rollup.optimistic.roi3yr).toBe(LOCKED.roi.optimistic);
  });

  // ── Payback ──────────────────────────────────────────────────────────────────

  it(`payback conservative = ${LOCKED.payback.conservative} months`, () => {
    expect(model.rollup.conservative.paybackMonths).toBe(LOCKED.payback.conservative);
  });

  it(`payback central = ${LOCKED.payback.central} months`, () => {
    expect(model.rollup.central.paybackMonths).toBe(LOCKED.payback.central);
  });

  // ── Formula invariants ───────────────────────────────────────────────────────

  it("netBenefit = netValue − TCO (formula invariant, central)", () => {
    const r = model.rollup.central;
    expect(r.netBenefit3yr).toBe(r.netValue3yr - r.tco3yr);
  });

  it("netValue = grossValue − overlapDiscount (formula invariant, central)", () => {
    const r = model.rollup.central;
    expect(r.netValue3yr).toBe(r.grossValue3yr - r.overlapDiscountTotal);
  });

  it("conservative ≤ central ≤ optimistic (ordering invariant, netBenefit)", () => {
    expect(model.rollup.conservative.netBenefit3yr).toBeLessThanOrEqual(model.rollup.central.netBenefit3yr);
    expect(model.rollup.central.netBenefit3yr).toBeLessThanOrEqual(model.rollup.optimistic.netBenefit3yr);
  });

  it("conservative ≤ central ≤ optimistic (ordering invariant, TCO)", () => {
    expect(model.rollup.conservative.tco3yr).toBeLessThanOrEqual(model.rollup.central.tco3yr);
    expect(model.rollup.central.tco3yr).toBeLessThanOrEqual(model.rollup.optimistic.tco3yr);
  });

  // ── Narrative guardrail: buildCpoNarrativePromptData uses only model figures ─

  it("buildCpoNarrativePromptData returns a data payload with model figures (not invented)", async () => {
    const { buildCpoNarrativePromptData } = await import("./services/cpoBusinessCaseEngine");
    const data = buildCpoNarrativePromptData(
      model,
      "Meridian Health Group",
      "AI-augmented workforce planning",
      "Reduce time-to-fill and attrition through predictive HR",
      ["Human-first AI", "Evidence-based decisions"],
      "central",
      MERIDIAN_PROFILE.annualRevenueGbp!
    );
    // The prompt data must contain the locked central figures
    expect(data.centralNetBenefit3yr).toBe(LOCKED.netBenefit.central);
    expect(data.centralTco3yr).toBe(LOCKED.tco.central);
    expect(data.centralRoi3yr).toBe(LOCKED.roi.central);
    expect(data.centralPaybackMonths).toBe(LOCKED.payback.central);
    expect(data.overlapDiscountGroups.length).toBe(3);
    // Must NOT contain invented figures
    expect(data.centralNetBenefit3yr).not.toBe(0);
  });
});
