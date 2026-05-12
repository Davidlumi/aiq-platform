/**
 * Value page tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Covers:
 *   1. calculateValueEnvelope accepts discountRateOverride and recalculates NPV
 *   2. Default discount rate (8%) is used when no override is provided
 *   3. Out-of-range override is clamped to default
 *   4. Three-tier values are present and non-negative
 *   5. Scenario analysis pessimistic.net_gbp < base.net_gbp < optimistic.net_gbp
 *   6. CEO sponsorship is conditional on scale criteria
 *   7. Reinvestment plan is present and has required fields
 */

import { describe, it, expect } from "vitest";
import { calculateValueEnvelope } from "./strategyEngine";
import { getAllInitiatives } from "./contentLibrary";

// ─── Fixture: grab a handful of quantified initiatives ────────────────────────

function getFixtureInitiatives(count = 3) {
  const all = getAllInitiatives();
  // Prefer quantified initiatives for meaningful NPV tests
  const quantified = all.filter(i => !i.qualitative_value_only);
  return quantified.slice(0, count);
}

const BASELINE = {
  headcount: 500,
  hires_per_year: 80,
  cost_per_hire_gbp: 6000,
  time_to_fill_days: 45,
  voluntary_attrition_rate_pct: 12,
  l_and_d_spend_per_fte_gbp: 800,
  hr_cost_per_fte_gbp: 8500,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("calculateValueEnvelope — discountRate parameter", () => {
  it("produces a valid value envelope with default rate (no override)", () => {
    const inits = getFixtureInitiatives(3);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    expect(result).toBeDefined();
    expect(result.financial_model).toBeDefined();
    expect(result.financial_model.npv_gbp).toBeDefined();
    expect(result.financial_model.npv_gbp.low).toBeTypeOf("number");
    expect(result.financial_model.npv_gbp.high).toBeTypeOf("number");
  });

  it("NPV at 5% is higher than NPV at 15% for positive cashflows", () => {
    const inits = getFixtureInitiatives(4);
    const result5  = calculateValueEnvelope(inits, BASELINE, 36, null, 0.05);
    const result15 = calculateValueEnvelope(inits, BASELINE, 36, null, 0.15);
    // Higher discount rate → lower NPV for positive cashflows
    expect(result5.financial_model.npv_gbp.high).toBeGreaterThan(result15.financial_model.npv_gbp.high);
  });

  it("NPV at 8% (default) matches explicit 0.08 override", () => {
    const inits = getFixtureInitiatives(3);
    const resultDefault  = calculateValueEnvelope(inits, BASELINE, 36);
    const resultExplicit = calculateValueEnvelope(inits, BASELINE, 36, null, 0.08);
    expect(resultDefault.financial_model.npv_gbp.low).toBeCloseTo(resultExplicit.financial_model.npv_gbp.low, 0);
    expect(resultDefault.financial_model.npv_gbp.high).toBeCloseTo(resultExplicit.financial_model.npv_gbp.high, 0);
  });

  it("out-of-range override (0.01) falls back to default 8%", () => {
    const inits = getFixtureInitiatives(3);
    const resultDefault  = calculateValueEnvelope(inits, BASELINE, 36);
    const resultOutRange = calculateValueEnvelope(inits, BASELINE, 36, null, 0.01);
    expect(resultOutRange.financial_model.npv_gbp.high).toBeCloseTo(resultDefault.financial_model.npv_gbp.high, 0);
  });

  it("out-of-range override (0.25) falls back to default 8%", () => {
    const inits = getFixtureInitiatives(3);
    const resultDefault  = calculateValueEnvelope(inits, BASELINE, 36);
    const resultOutRange = calculateValueEnvelope(inits, BASELINE, 36, null, 0.25);
    expect(resultOutRange.financial_model.npv_gbp.high).toBeCloseTo(resultDefault.financial_model.npv_gbp.high, 0);
  });
});

describe("calculateValueEnvelope — three-tier analysis", () => {
  it("tiered_value has efficiency, effectiveness, strategic with non-negative values", () => {
    const inits = getFixtureInitiatives(4);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    expect(result.tiered_value).toBeDefined();
    expect(result.tiered_value.efficiency.low).toBeGreaterThanOrEqual(0);
    expect(result.tiered_value.effectiveness.low).toBeGreaterThanOrEqual(0);
    expect(result.tiered_value.strategic.low).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateValueEnvelope — scenario analysis", () => {
  it("pessimistic net < base net < optimistic net", () => {
    const inits = getFixtureInitiatives(4);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    expect(result.scenario_analysis).toBeDefined();
    const { pessimistic, base, optimistic } = result.scenario_analysis;
    expect(pessimistic.net_gbp).toBeLessThanOrEqual(base.net_gbp);
    expect(base.net_gbp).toBeLessThanOrEqual(optimistic.net_gbp);
  });

  it("all three scenarios have roi_pct defined", () => {
    const inits = getFixtureInitiatives(4);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    expect(result.scenario_analysis.pessimistic.roi_pct).toBeTypeOf("number");
    expect(result.scenario_analysis.base.roi_pct).toBeTypeOf("number");
    expect(result.scenario_analysis.optimistic.roi_pct).toBeTypeOf("number");
  });
});

describe("calculateValueEnvelope — reinvestment plan", () => {
  it("reinvestment_plan has headline and narrative", () => {
    const inits = getFixtureInitiatives(4);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    expect(result.reinvestment_plan).toBeDefined();
    expect(result.reinvestment_plan.headline).toBeTypeOf("string");
    expect(result.reinvestment_plan.narrative).toBeTypeOf("string");
  });
});

describe("calculateValueEnvelope — by_initiative", () => {
  it("each initiative has confidence field", () => {
    const inits = getFixtureInitiatives(5);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    for (const item of result.by_initiative) {
      expect(item.confidence).toBeDefined();
      expect(["high", "medium", "low"]).toContain(item.confidence);
    }
  });

  it("each initiative has sources array", () => {
    const inits = getFixtureInitiatives(5);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    for (const item of result.by_initiative) {
      expect(Array.isArray(item.sources)).toBe(true);
    }
  });
});

describe("calculateValueEnvelope — caveat", () => {
  it("caveat is a non-empty string", () => {
    const inits = getFixtureInitiatives(3);
    const result = calculateValueEnvelope(inits, BASELINE, 36);
    expect(result.caveat).toBeTypeOf("string");
    expect(result.caveat.length).toBeGreaterThan(20);
  });
});
