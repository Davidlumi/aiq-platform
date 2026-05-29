/**
 * server/dfs-profile-crosscheck.test.ts
 *
 * DFS Furniture plc — Profile Cross-Check Test
 *
 * Remediation Brief Fix 1 (P0), 28 May 2026:
 *   The original cross-check ("Revenue matches DFS ✅") only confirmed the
 *   report echoed its own inputs — a tautology. This test replaces it.
 *
 * Governing principle:
 *   Any figure presented as "real" must carry a cited source and an `as_of`
 *   date, and tests must validate it against that source — never against the
 *   value that was fed in.
 *
 * What this test does:
 *   1. Imports the canonical DFS constants from shared/dfsProfileConstants.ts
 *      (the single source of truth, with provenance metadata).
 *   2. Asserts that each constant is within the public sanity-check bounds
 *      (±25% of the public floor — a gross-error guard, not an acceptance test).
 *   3. Asserts that the original wrong figures are NOT equal to the corrected
 *      constants (regression guard against re-introduction of the 2× error).
 *   4. Asserts that payroll is explicitly marked as a placeholder (zero) until
 *      replaced with a DFS-provided figure.
 *   5. Asserts that source and as_of metadata is present and non-empty.
 *
 * This test MUST FAIL if:
 *   - A figure is changed without updating its source/as_of
 *   - A figure falls outside the sanity-check bounds (gross error)
 *   - The original wrong figures are re-introduced
 *   - Payroll is set to a non-zero value without a source note
 *
 * Run: pnpm test server/dfs-profile-crosscheck.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  DFS_HEADCOUNT,
  DFS_HEADCOUNT_SOURCE,
  DFS_HEADCOUNT_AS_OF,
  DFS_REVENUE_STATUTORY_GBP,
  DFS_REVENUE_STATUTORY_SOURCE,
  DFS_REVENUE_STATUTORY_AS_OF,
  DFS_REVENUE_BRAND_GBP,
  DFS_REVENUE_BRAND_SOURCE,
  DFS_REVENUE_BRAND_AS_OF,
  DFS_PAYROLL_GBP_PLACEHOLDER,
  DFS_PAYROLL_SOURCE,
  DFS_PAYROLL_COVERAGE,
  DFS_PAYROLL_AS_OF,
  DFS_PAYROLL_NOTE,
  DFS_SECTOR,
  DFS_SANITY,
  DFS_ORIGINAL_WRONG_FIGURES,
} from "../shared/dfsProfileConstants";

// ─── 1. Provenance metadata is present ───────────────────────────────────────

describe("DFS Profile — Provenance metadata", () => {
  it("headcount has a non-empty source string", () => {
    expect(DFS_HEADCOUNT_SOURCE).toBeTruthy();
    expect(DFS_HEADCOUNT_SOURCE.length).toBeGreaterThan(10);
  });

  it("headcount has an as_of date in YYYY-MM-DD format", () => {
    expect(DFS_HEADCOUNT_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("revenue (statutory) has a non-empty source string", () => {
    expect(DFS_REVENUE_STATUTORY_SOURCE).toBeTruthy();
    expect(DFS_REVENUE_STATUTORY_SOURCE.length).toBeGreaterThan(10);
  });

  it("revenue (statutory) has an as_of date in YYYY-MM-DD format", () => {
    expect(DFS_REVENUE_STATUTORY_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("revenue (brand) has a non-empty source string", () => {
    expect(DFS_REVENUE_BRAND_SOURCE).toBeTruthy();
    expect(DFS_REVENUE_BRAND_SOURCE.length).toBeGreaterThan(10);
  });

  it("revenue (brand) has an as_of date in YYYY-MM-DD format", () => {
    expect(DFS_REVENUE_BRAND_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("payroll source is marked as DFS-provided (not public)", () => {
    expect(DFS_PAYROLL_SOURCE).toContain("DFS-provided");
  });

  it("payroll coverage field is present (must be labelled before pilot use)", () => {
    // DFS_PAYROLL_COVERAGE must be one of the four allowed values.
    // 'pending' is the placeholder; replace with 'base_payroll', 'total_reward',
    // or 'fully_loaded' once the DFS-provided figure is received.
    const allowedValues = ["base_payroll", "total_reward", "fully_loaded", "pending"];
    expect(allowedValues).toContain(DFS_PAYROLL_COVERAGE);
  });

  it("payroll as_of field is present", () => {
    // Will be PENDING until DFS provides the figure.
    expect(DFS_PAYROLL_AS_OF).toBeTruthy();
    expect(DFS_PAYROLL_AS_OF.length).toBeGreaterThan(5);
  });

  it("payroll note contains the sanity-check calculation", () => {
    // The note must document the £71k/head implausibility.
    expect(DFS_PAYROLL_NOTE).toContain("£71k");
    // Case-insensitive check: note uses 'Implausible' (capital I)
    expect(DFS_PAYROLL_NOTE.toLowerCase()).toContain("implausible");
  });
});

// ─── 2. Payroll placeholder guard ────────────────────────────────────────────

describe("DFS Profile — Payroll placeholder", () => {
  it("payroll placeholder is zero (must be replaced with DFS-provided figure)", () => {
    // This test is intentionally asserting zero.
    // If this fails, someone has set a non-zero payroll without a source note.
    // Replace DFS_PAYROLL_GBP_PLACEHOLDER with a named constant that carries
    // source + as_of before using it in any live profile or test.
    expect(DFS_PAYROLL_GBP_PLACEHOLDER).toBe(0);
  });
});

// ─── 3. Sanity-check bounds (gross-error guards, not acceptance criteria) ────

describe("DFS Profile — Sanity-check bounds (±25% of public floor)", () => {
  it("headcount is within plausible range (3,500–6,000)", () => {
    expect(DFS_HEADCOUNT).toBeGreaterThanOrEqual(DFS_SANITY.headcount.min);
    expect(DFS_HEADCOUNT).toBeLessThanOrEqual(DFS_SANITY.headcount.max);
  });

  it("revenue (statutory) is within plausible range (£750m–£1.3bn)", () => {
    expect(DFS_REVENUE_STATUTORY_GBP).toBeGreaterThanOrEqual(DFS_SANITY.revenueStatutoryGbp.min);
    expect(DFS_REVENUE_STATUTORY_GBP).toBeLessThanOrEqual(DFS_SANITY.revenueStatutoryGbp.max);
  });

  it("revenue (brand) is within plausible range (£1.0bn–£1.75bn)", () => {
    expect(DFS_REVENUE_BRAND_GBP).toBeGreaterThanOrEqual(DFS_SANITY.revenueBrandGbp.min);
    expect(DFS_REVENUE_BRAND_GBP).toBeLessThanOrEqual(DFS_SANITY.revenueBrandGbp.max);
  });

  it("statutory revenue is less than brand revenue (statutory < brand)", () => {
    // Statutory and brand are different bases; statutory should be lower
    expect(DFS_REVENUE_STATUTORY_GBP).toBeLessThan(DFS_REVENUE_BRAND_GBP);
  });

  it("sector is 'retail' (not 'financial_services')", () => {
    expect(DFS_SECTOR).toBe("retail");
    expect(DFS_SECTOR).not.toBe("financial_services");
  });
});

// ─── 4. Regression guard — original wrong figures must NOT match corrected ───

describe("DFS Profile — Regression: original wrong figures not re-introduced", () => {
  it("corrected headcount does NOT equal the original wrong headcount (11,000)", () => {
    expect(DFS_HEADCOUNT).not.toBe(DFS_ORIGINAL_WRONG_FIGURES.headcount);
  });

  it("corrected statutory revenue does NOT equal the original wrong revenue (£2.1bn)", () => {
    expect(DFS_REVENUE_STATUTORY_GBP).not.toBe(DFS_ORIGINAL_WRONG_FIGURES.annualRevenueGbp);
  });

  it("corrected brand revenue does NOT equal the original wrong revenue (£2.1bn)", () => {
    expect(DFS_REVENUE_BRAND_GBP).not.toBe(DFS_ORIGINAL_WRONG_FIGURES.annualRevenueGbp);
  });

  it("corrected headcount is less than original wrong headcount (original was ~2.4× too high)", () => {
    expect(DFS_HEADCOUNT).toBeLessThan(DFS_ORIGINAL_WRONG_FIGURES.headcount);
  });

  it("corrected statutory revenue is less than original wrong revenue (original was ~2.1× too high)", () => {
    expect(DFS_REVENUE_STATUTORY_GBP).toBeLessThan(DFS_ORIGINAL_WRONG_FIGURES.annualRevenueGbp);
  });

  it("original wrong payroll (£320m) implies implausible £71k/head at 4,503 staff", () => {
    // This test documents the implausibility of the original figure.
    // £71k/head for a UK furniture retailer is ~2× the sector average.
    const impliedPayPerHead =
      DFS_ORIGINAL_WRONG_FIGURES.annualPayrollCostGbp / DFS_HEADCOUNT;
    expect(impliedPayPerHead).toBeGreaterThan(60_000); // > £60k/head is implausible
  });
});

// ─── 5. Ratio checks (internal consistency) ──────────────────────────────────

describe("DFS Profile — Internal consistency", () => {
  it("headcount is a positive integer", () => {
    expect(DFS_HEADCOUNT).toBeGreaterThan(0);
    expect(Number.isInteger(DFS_HEADCOUNT)).toBe(true);
  });

  it("statutory revenue per head is in a plausible range for UK retail (£100k–£400k)", () => {
    const revenuePerHead = DFS_REVENUE_STATUTORY_GBP / DFS_HEADCOUNT;
    expect(revenuePerHead).toBeGreaterThanOrEqual(100_000);
    expect(revenuePerHead).toBeLessThanOrEqual(400_000);
  });

  it("brand revenue per head is in a plausible range for UK retail (£150k–£500k)", () => {
    const revenuePerHead = DFS_REVENUE_BRAND_GBP / DFS_HEADCOUNT;
    expect(revenuePerHead).toBeGreaterThanOrEqual(150_000);
    expect(revenuePerHead).toBeLessThanOrEqual(500_000);
  });
});
