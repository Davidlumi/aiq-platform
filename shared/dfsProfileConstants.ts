/**
 * shared/dfsProfileConstants.ts
 *
 * Canonical DFS Furniture plc profile constants for all scripts and tests.
 *
 * Governing principle (from Remediation Brief, 28 May 2026):
 *   Any figure presented as "real" must carry a cited source and an `as_of`
 *   date, and tests must validate it against that source — never against the
 *   value that was fed in.
 *
 * For a live pilot, replace PAYROLL_GBP with the DFS-provided figure.
 * Public figures below are used only as a sanity-check floor to catch ~2x errors.
 *
 * ─── Source provenance ────────────────────────────────────────────────────────
 *
 * HEADCOUNT
 *   Value:   ~4,503 colleagues
 *   Source:  DFS Furniture plc corporate website, "About us" page
 *   Note:    Other sources cite 4,672–4,722; 4,503 is the corporate-site figure
 *   as_of:   2026-05-28
 *
 * REVENUE (statutory basis)
 *   Value:   ~£1.0bn (FY2024/FY2025)
 *   Source:  LSE market data / statutory accounts
 *   Note:    A separate "brand / gross sales" basis gives ~£1.39bn (Wikipedia /
 *            company reporting). These are different measures. The statutory
 *            basis is used here. Label the basis explicitly in any report.
 *   as_of:   2026-05-28
 *
 * REVENUE (brand / gross sales basis)
 *   Value:   ~£1.39bn (2025)
 *   Source:  Wikipedia / company reporting
 *   Note:    Different from statutory basis. Do not mix the two.
 *   as_of:   2026-05-28
 *
 * PAYROLL
 *   Value:   NOT PUBLIC — use DFS-provided figure
 *   Note:    The original £320m at ~4,500 staff implies ~£71k/head, which is
 *            implausible for a UK furniture retailer. This was the clearest
 *            signal the original figures were wrong. Payroll must come from DFS.
 *   Placeholder: 0 — scripts must not run with this as a real figure.
 *
 * SECTOR
 *   Value:   Retail (sofas & upholstered furniture; brands DFS, Sofology)
 *   Source:  Public record
 *
 * ─── Original wrong figures (for reference / regression) ─────────────────────
 *   The gap2-board-report.ts / original evidence pack used:
 *     headcount:  11,000  (≈ 2.4× actual)
 *     revenue:    £2.1bn  (≈ 2.1× actual statutory)
 *     payroll:    £320m   (≈ £71k/head — implausible)
 *   These were fabricated from a "DFS Financial Services plc" profile that
 *   does not exist. All three are ~2× off reality.
 */

// ─── Corrected DFS Furniture plc profile ─────────────────────────────────────

export const DFS_HEADCOUNT = 4_503;
export const DFS_HEADCOUNT_SOURCE = "DFS Furniture plc corporate website, 'About us'";
export const DFS_HEADCOUNT_AS_OF = "2026-05-28";
export const DFS_HEADCOUNT_NOTE =
  "Other sources cite 4,672–4,722. Corporate-site figure used. Verify with client.";

export const DFS_REVENUE_STATUTORY_GBP = 1_000_000_000;
export const DFS_REVENUE_STATUTORY_SOURCE = "LSE market data / statutory accounts";
export const DFS_REVENUE_STATUTORY_AS_OF = "2026-05-28";
export const DFS_REVENUE_STATUTORY_NOTE =
  "Statutory basis ~£1.0bn FY2024/FY2025. Not the brand/gross-sales basis.";

export const DFS_REVENUE_BRAND_GBP = 1_390_000_000;
export const DFS_REVENUE_BRAND_SOURCE = "Wikipedia / company reporting";
export const DFS_REVENUE_BRAND_AS_OF = "2026-05-28";
export const DFS_REVENUE_BRAND_NOTE =
  "Brand / gross sales basis ~£1.39bn. Different from statutory. Do not mix.";

/**
 * PAYROLL — must be replaced with DFS-provided figure before any pilot use.
 *
 * v2.1 Fix 1 amendment requirements:
 *   1. Named source artefact: the intake document that supplies the payroll figure
 *      must be named here (e.g. "DFS HR Data Pack, provided 2026-05-XX").
 *   2. Coverage label: state explicitly what the figure covers:
 *      - Base payroll only (salary + NI + pension, excluding bonuses/benefits)
 *      - Total reward (base + bonus + benefits)
 *      - Fully-loaded (total reward + employer NI + pension + on-costs)
 *   3. Sanity check: £320m at ~4,503 staff ≈ £71k/head. This is implausible
 *      as base payroll for a UK furniture retailer (typical range £30k–£55k/head
 *      implies £135m–£248m). The figure may be total reward or fully-loaded;
 *      if so, label it as such. If it is base payroll, it must be corrected.
 *
 * Zero is intentional: any script that uses this without substitution will
 * produce obviously wrong output, making the gap visible.
 */
export const DFS_PAYROLL_GBP_PLACEHOLDER = 0;
/**
 * DFS_PAYROLL_SOURCE: Replace with the named intake artefact once received.
 * Example: "DFS HR Data Pack, provided by [name] on [date]"
 */
export const DFS_PAYROLL_SOURCE = "⚠ PENDING — DFS-provided intake artefact not yet received";
/**
 * DFS_PAYROLL_COVERAGE: Replace with one of:
 *   "base_payroll" | "total_reward" | "fully_loaded"
 * This label is required before the figure can be used in any report.
 */
export const DFS_PAYROLL_COVERAGE: "base_payroll" | "total_reward" | "fully_loaded" | "pending" = "pending";
export const DFS_PAYROLL_AS_OF = "⚠ PENDING — date of DFS-provided figure";
export const DFS_PAYROLL_NOTE =
  "£320m at ~4,503 staff ≈ £71k/head. Implausible as UK retail base payroll (typical £30k–£55k/head = £135m–£248m). " +
  "If the figure is total reward or fully-loaded, label it as such. If it is base payroll, correct it. " +
  "Do not use in any pilot output until source artefact is named and coverage is labelled.";

export const DFS_SECTOR = "retail";
export const DFS_SECTOR_NOTE =
  "Sofas & upholstered furniture. Brands: DFS, Sofology. UK-primary + Netherlands, Spain, Portugal.";

export const DFS_HRIS = "SAP SuccessFactors";
export const DFS_LISTING = "LSE";
export const DFS_FCA_IN_SCOPE = "no";

/**
 * Sanity-check bounds for cross-check tests.
 * A figure is "plausible" if it falls within ±25% of the public floor.
 * These bounds are NOT acceptance criteria — they are gross-error guards only.
 */
export const DFS_SANITY = {
  headcount: { min: 3_500, max: 6_000 },
  revenueStatutoryGbp: { min: 750_000_000, max: 1_300_000_000 },
  revenueBrandGbp: { min: 1_000_000_000, max: 1_750_000_000 },
  /** Payroll sanity: at ~4,500 staff, £30k–£55k/head is plausible for UK retail */
  payrollGbp: { min: 135_000_000, max: 250_000_000 },
} as const;

/**
 * Original wrong figures — kept for regression documentation only.
 * Do not use in any live profile or test assertion.
 */
export const DFS_ORIGINAL_WRONG_FIGURES = {
  headcount: 11_000,
  annualRevenueGbp: 2_100_000_000,
  annualPayrollCostGbp: 320_000_000,
  note: "Fabricated from a non-existent 'DFS Financial Services plc' profile. All ~2× off reality.",
} as const;
