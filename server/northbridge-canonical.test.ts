/**
 * Golden-master test: Canonical Maya / Northbridge portfolio.
 *
 * This test locks the exact financial figures for the canonical 8-initiative
 * Northbridge portfolio. Any change to initiative cost/value calibration,
 * overlap-discount rules, or the business-case formula will fail this test —
 * surfacing the drift immediately instead of rounds later.
 *
 * ── Canonical fixture ────────────────────────────────────────────────────────
 * Company:   Northbridge Financial
 * Profile:   8,000 UK employees · £95M annual payroll · Financial Services
 * Portfolio: 8 initiatives (see MAYA_IDS below)
 *   #1  ai_compensation_recommendation_engine
 *   #2  ai_driven_merit_cycle_orchestration
 *   #3  ai_pay_equity_continuous_monitoring
 *   #4  ai_multi_characteristic_pay_gap_reporting
 *   #6  ai_pay_band_design
 *   #15 ai_reward_operations_assistant
 *   #16 ai_bonus_pool_optimisation
 *   #17 ai_sales_compensation_plan_design
 *
 * ── Locked figures (central scenario, 3-year) ────────────────────────────────
 * TCO 3yr:            £7,146,469   (~£7.15M)
 * Net value 3yr:      £12,964,485  (~£12.96M)
 * Net benefit 3yr:    £5,818,016   (~£5.82M)
 * ROI:                81%
 * Payback:            20 months
 * Overlap discount:   £1,758,476   (two groups — see below)
 *
 * ── Overlap discounts ────────────────────────────────────────────────────────
 * Compensation group (25%): #1, #2, #6, #16 → £1,603,720 central
 * Pay Equity group (15%):   #3, #4           → £154,756 central
 *
 * ── Conservative / Optimistic ────────────────────────────────────────────────
 * Conservative ROI:       −5%  (negative → R1 check fires)
 * Optimistic ROI:         133%
 *
 * To update intentionally: run `npx tsx diag_maya_canonical.mts`, verify the
 * new numbers, update the LOCKED constants below, and commit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect } from "vitest";
import { computeBusinessCase } from "./services/rewardBusinessCaseEngine";

// ── Fixture definition ────────────────────────────────────────────────────────
const MAYA_IDS = [
  "ai_compensation_recommendation_engine",     // #1  Compensation Recommendation Engine
  "ai_driven_merit_cycle_orchestration",       // #2  Merit Cycle Orchestration
  "ai_pay_equity_continuous_monitoring",       // #3  Pay Equity Continuous Monitoring
  "ai_multi_characteristic_pay_gap_reporting", // #4  Multi-Characteristic Pay Gap Reporting
  "ai_pay_band_design",                        // #6  Pay Band Design
  "ai_reward_operations_assistant",            // #15 Reward Operations Assistant
  "ai_bonus_pool_optimisation",                // #16 Bonus Pool Optimisation
  "ai_sales_compensation_plan_design",         // #17 Sales Compensation Plan Design
] as const;

const NORTHBRIDGE_PROFILE = {
  sector: "financial_services" as const,
  totalEmployeeHeadcount: 8_000,
  totalPayrollGbp: 95_000_000,
};

// ── Locked figures ────────────────────────────────────────────────────────────
const LOCKED = {
  central: {
    tco3yr:             7_146_469,
    netValue3yr:       12_964_485,
    netBenefit3yr:      5_818_016,
    roi3yr:             0.81,          // 81%
    paybackMonths:      20,
    overlapDiscountTotal: 1_758_476,
  },
  conservative: {
    roi3yr: -0.05,                     // −5% → R1 check fires
  },
  optimistic: {
    roi3yr: 1.33,                      // 133%
  },
  overlap: {
    compensationCentral: 1_603_720,    // Compensation group (25%), 4 initiatives
    payEquityCentral:      154_756,    // Pay Equity group (15%), 2 initiatives
  },
  lineCount: 8,
  unknownIdCount: 0,
} as const;

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("Canonical Maya / Northbridge golden-master", () => {
  const model = computeBusinessCase(
    [...MAYA_IDS],
    NORTHBRIDGE_PROFILE,
    {},
    {}
  );

  it("all 8 initiative IDs resolve in the library (no unknownIds)", () => {
    expect(model.unknownIds).toHaveLength(LOCKED.unknownIdCount);
    expect(model.lines).toHaveLength(LOCKED.lineCount);
  });

  // ── Central scenario ──────────────────────────────────────────────────────
  it("central TCO 3yr = £7,146,469", () => {
    expect(model.rollup.central.tco3yr).toBe(LOCKED.central.tco3yr);
  });

  it("central net value 3yr = £12,964,485", () => {
    expect(model.rollup.central.netValue3yr).toBe(LOCKED.central.netValue3yr);
  });

  it("central net benefit 3yr = £5,818,016", () => {
    expect(model.rollup.central.netBenefit3yr).toBe(LOCKED.central.netBenefit3yr);
  });

  it("central ROI = 81% (0.81)", () => {
    expect(model.rollup.central.roi3yr).toBe(LOCKED.central.roi3yr);
  });

  it("central payback = 20 months", () => {
    expect(model.rollup.central.paybackMonths).toBe(LOCKED.central.paybackMonths);
  });

  it("central overlap discount total = £1,758,476", () => {
    expect(model.rollup.central.overlapDiscountTotal).toBe(LOCKED.central.overlapDiscountTotal);
  });

  // ── Conservative scenario ─────────────────────────────────────────────────
  it("conservative ROI = −5% (R1 check fires for this portfolio)", () => {
    expect(model.rollup.conservative.roi3yr).toBe(LOCKED.conservative.roi3yr);
    expect(model.rollup.conservative.netBenefit3yr).toBeLessThan(0);
  });

  // ── Optimistic scenario ───────────────────────────────────────────────────
  it("optimistic ROI = 133% (1.33)", () => {
    expect(model.rollup.optimistic.roi3yr).toBe(LOCKED.optimistic.roi3yr);
  });

  // ── Overlap discount structure ────────────────────────────────────────────
  it("exactly 2 overlap discount groups are applied", () => {
    expect(model.overlapDiscounts).toHaveLength(2);
  });

  it("Compensation group (25%): #1, #2, #6, #16 → £1,603,720 central", () => {
    const g = model.overlapDiscounts.find(d => d.subDomain === "Compensation");
    expect(g).toBeDefined();
    expect(g!.discountPct).toBe(0.25);
    expect(g!.discountAmountCentral).toBe(LOCKED.overlap.compensationCentral);
    expect(g!.initiativeIds).toContain("ai_compensation_recommendation_engine");
    expect(g!.initiativeIds).toContain("ai_driven_merit_cycle_orchestration");
    expect(g!.initiativeIds).toContain("ai_pay_band_design");
    expect(g!.initiativeIds).toContain("ai_bonus_pool_optimisation");
  });

  it("Pay Equity group (15%): #3, #4 → £154,756 central", () => {
    const g = model.overlapDiscounts.find(d => d.subDomain === "Pay Equity");
    expect(g).toBeDefined();
    expect(g!.discountPct).toBe(0.15);
    expect(g!.discountAmountCentral).toBe(LOCKED.overlap.payEquityCentral);
    expect(g!.initiativeIds).toContain("ai_pay_equity_continuous_monitoring");
    expect(g!.initiativeIds).toContain("ai_multi_characteristic_pay_gap_reporting");
  });

  // ── Structural invariants ─────────────────────────────────────────────────
  it("netBenefit = netValue − TCO (formula invariant)", () => {
    const r = model.rollup.central;
    expect(r.netBenefit3yr).toBe(r.netValue3yr - r.tco3yr);
  });

  it("conservative ≤ central ≤ optimistic (ordering invariant)", () => {
    expect(model.rollup.conservative.netBenefit3yr).toBeLessThanOrEqual(
      model.rollup.central.netBenefit3yr
    );
    expect(model.rollup.central.netBenefit3yr).toBeLessThanOrEqual(
      model.rollup.optimistic.netBenefit3yr
    );
    expect(model.rollup.conservative.tco3yr).toBeLessThanOrEqual(
      model.rollup.central.tco3yr
    );
    expect(model.rollup.central.tco3yr).toBeLessThanOrEqual(
      model.rollup.optimistic.tco3yr
    );
  });
});
