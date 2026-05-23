/**
 * Golden-master test: Northbridge canonical fixture
 *
 * This test locks the exact financial output of computeBusinessCase for the
 * ONE canonical Northbridge scenario. Any change to initiative cost/value
 * calibration, overlap-discount rules, or the business-case formula that
 * shifts these figures will fail this test — surfacing the drift immediately
 * instead of rounds later.
 *
 * ── Canonical fixture ────────────────────────────────────────────────────────
 * Company:   Northbridge Financial
 * Profile:   8,000 UK employees · £95M annual payroll · Financial Services
 * Portfolio: 8 initiatives (pay equity, market intelligence, total rewards,
 *            incentives, retention, analytics)
 *
 * ── Locked figures (central scenario) ───────────────────────────────────────
 * TCO 3yr:       £8,064,564   (~£8.06M)
 * Net value 3yr: £10,018,703  (~£10.02M)
 * Net benefit:   £1,954,139   (~£1.95M)
 * ROI:           24%
 * Payback:       29 months
 *
 * ── Overlap discounts applied ────────────────────────────────────────────────
 * Group 1: pay_equity_monitoring + multi_char_pay_gap + equal_pay_risk_audit → 25% → £414,610
 * Group 2: market_data_intelligence + bonus_pool_optimisation + attrition_risk → 25% → £652,583
 *
 * ── Conservative / Optimistic ────────────────────────────────────────────────
 * Conservative net benefit: −£2,208,604  (R1 check fires: negative conservative case)
 * Optimistic net benefit:   £6,116,896
 *
 * To update these figures intentionally: run `npx tsx diag_canonical_fixture.mts`,
 * verify the new numbers are correct, then update the constants below and commit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect } from "vitest";
import { computeBusinessCase } from "./services/rewardBusinessCaseEngine";

// ── Fixture definition ────────────────────────────────────────────────────────
const NORTHBRIDGE_IDS = [
  "ai_pay_equity_continuous_monitoring",
  "ai_multi_characteristic_pay_gap_reporting",
  "ai_equal_pay_risk_audit",
  "ai_total_rewards_personalisation",
  "ai_market_data_intelligence",
  "ai_bonus_pool_optimisation",
  "ai_attrition_risk_modelling_reward",
  "ai_reward_analytics_dashboard",
] as const;

const NORTHBRIDGE_PROFILE = {
  sector: "financial_services" as const,
  totalEmployeeHeadcount: 8_000,
  totalPayrollGbp: 95_000_000,
};

// ── Locked figures ────────────────────────────────────────────────────────────
const LOCKED = {
  central: {
    tco3yr:        8_064_564,
    netValue3yr:  10_018_703,
    netBenefit3yr: 1_954_139,
    roi3yr:        0.24,          // 24%
    paybackMonths: 29,
  },
  conservative: {
    netBenefit3yr: -2_208_604,    // negative → R1 check fires
  },
  optimistic: {
    netBenefit3yr:  6_116_896,
  },
  overlapDiscountCount: 2,
  lineCount: 8,
  unknownIdCount: 0,
} as const;

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("Northbridge canonical fixture — golden master", () => {
  const model = computeBusinessCase(
    [...NORTHBRIDGE_IDS],
    NORTHBRIDGE_PROFILE,
    {},
    {}
  );

  it("all 8 initiative IDs resolve in the library (no unknownIds)", () => {
    expect(model.unknownIds).toHaveLength(LOCKED.unknownIdCount);
    expect(model.lines).toHaveLength(LOCKED.lineCount);
  });

  it("central TCO 3yr = £8,064,564", () => {
    expect(model.rollup.central.tco3yr).toBe(LOCKED.central.tco3yr);
  });

  it("central net value 3yr = £10,018,703", () => {
    expect(model.rollup.central.netValue3yr).toBe(LOCKED.central.netValue3yr);
  });

  it("central net benefit 3yr = £1,954,139", () => {
    expect(model.rollup.central.netBenefit3yr).toBe(LOCKED.central.netBenefit3yr);
  });

  it("central ROI = 24%", () => {
    // roi3yr is a fraction; round to nearest integer percent for the assertion
    expect(Math.round((model.rollup.central.roi3yr ?? 0) * 100)).toBe(
      Math.round(LOCKED.central.roi3yr * 100)
    );
  });

  it("central payback = 29 months", () => {
    expect(model.rollup.central.paybackMonths).toBe(LOCKED.central.paybackMonths);
  });

  it("conservative net benefit is negative (R1 check must fire for this portfolio)", () => {
    expect(model.rollup.conservative.netBenefit3yr).toBe(LOCKED.conservative.netBenefit3yr);
    expect(model.rollup.conservative.netBenefit3yr).toBeLessThan(0);
  });

  it("optimistic net benefit = £6,116,896", () => {
    expect(model.rollup.optimistic.netBenefit3yr).toBe(LOCKED.optimistic.netBenefit3yr);
  });

  it("exactly 2 overlap discount groups are applied", () => {
    expect(model.overlapDiscounts).toHaveLength(LOCKED.overlapDiscountCount);
  });

  it("overlap group 1: pay-equity trio at 25%", () => {
    const g1 = model.overlapDiscounts.find(d =>
      d.initiativeIds.includes("ai_pay_equity_continuous_monitoring") &&
      d.initiativeIds.includes("ai_multi_characteristic_pay_gap_reporting") &&
      d.initiativeIds.includes("ai_equal_pay_risk_audit")
    );
    expect(g1).toBeDefined();
    expect(g1!.discountPct).toBe(0.25);
    expect(g1!.discountAmountCentral).toBe(414_610); // £414,610
  });

  it("overlap group 2: market/incentive/retention trio at 25%", () => {
    const g2 = model.overlapDiscounts.find(d =>
      d.initiativeIds.includes("ai_market_data_intelligence") &&
      d.initiativeIds.includes("ai_bonus_pool_optimisation") &&
      d.initiativeIds.includes("ai_attrition_risk_modelling_reward")
    );
    expect(g2).toBeDefined();
    expect(g2!.discountPct).toBe(0.25);
    expect(g2!.discountAmountCentral).toBe(652_583); // £652,583
  });

  it("netBenefit = netValue − TCO (structural invariant)", () => {
    const r = model.rollup.central;
    expect(r.netBenefit3yr).toBe(r.netValue3yr - r.tco3yr);
  });

  it("conservative ≤ central ≤ optimistic for all rollup metrics", () => {
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
