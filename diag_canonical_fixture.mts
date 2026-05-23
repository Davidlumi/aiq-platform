/**
 * Canonical Northbridge fixture — the ONE fixture that golden-master tests will lock.
 *
 * Profile:   Northbridge Financial, 8,000 employees, £95M payroll, Financial Services
 * Portfolio: 8 initiatives (the canonical set from the Stage 7 spec)
 *
 * Run this script to see the exact figures that will be locked in the test.
 */
import { computeBusinessCase } from "./server/services/rewardBusinessCaseEngine";
import { REWARD_INITIATIVE_LIBRARY } from "./shared/rewardInitiativeLibrary";

// ── Canonical fixture definition ──────────────────────────────────────────────
export const NORTHBRIDGE_CANONICAL = {
  // Profile
  profile: {
    sector: "financial_services" as const,
    totalEmployeeHeadcount: 8_000,
    totalPayrollGbp: 95_000_000,
  },
  // Portfolio — 8 initiatives covering pay equity, market intelligence, total rewards,
  // incentives, retention, and analytics
  initiativeIds: [
    "ai_pay_equity_continuous_monitoring",
    "ai_multi_characteristic_pay_gap_reporting",
    "ai_equal_pay_risk_audit",
    "ai_total_rewards_personalisation",
    "ai_market_data_intelligence",
    "ai_bonus_pool_optimisation",
    "ai_attrition_risk_modelling_reward",
    "ai_reward_analytics_dashboard",
  ],
};

// ── Verify all IDs exist in the library ───────────────────────────────────────
const missing = NORTHBRIDGE_CANONICAL.initiativeIds.filter(
  id => !REWARD_INITIATIVE_LIBRARY.find(i => i.id === id)
);
if (missing.length > 0) {
  console.error("FATAL: Missing library IDs:", missing.join(", "));
  process.exit(1);
}
console.log("All 8 initiative IDs confirmed in library.");

// ── Run the model ─────────────────────────────────────────────────────────────
const model = computeBusinessCase(
  NORTHBRIDGE_CANONICAL.initiativeIds,
  NORTHBRIDGE_CANONICAL.profile,
  {},
  {}
);

const fmt = (n: number) => "£" + (n / 1_000).toFixed(0) + "k";
const fmtM = (n: number) => "£" + (n / 1_000_000).toFixed(4) + "M";

console.log("\n=== Canonical Northbridge fixture — exact figures ===");
console.log("Profile:    8,000 employees, £95M payroll, Financial Services");
console.log("Portfolio:  8 initiatives");
console.log("Lines:      " + model.lines.length);
console.log("Unknown:    " + model.unknownIds.join(", ") || "none");
console.log("");
console.log("Conservative:");
console.log("  TCO 3yr:       " + fmt(model.rollup.conservative.tco3yr));
console.log("  Net value:     " + fmt(model.rollup.conservative.netValue3yr));
console.log("  Net benefit:   " + fmt(model.rollup.conservative.netBenefit3yr));
console.log("  ROI:           " + (model.rollup.conservative.roi3yr === null ? "N/A" : Math.round(model.rollup.conservative.roi3yr * 100) + "%"));
console.log("");
console.log("Central:");
console.log("  TCO 3yr:       " + fmt(model.rollup.central.tco3yr));
console.log("  Net value:     " + fmt(model.rollup.central.netValue3yr));
console.log("  Net benefit:   " + fmt(model.rollup.central.netBenefit3yr));
console.log("  ROI:           " + (model.rollup.central.roi3yr === null ? "N/A" : Math.round(model.rollup.central.roi3yr * 100) + "%"));
console.log("  Payback:       " + (model.rollup.central.paybackMonths === null ? ">36m" : model.rollup.central.paybackMonths + "m"));
console.log("");
console.log("Optimistic:");
console.log("  TCO 3yr:       " + fmt(model.rollup.optimistic.tco3yr));
console.log("  Net value:     " + fmt(model.rollup.optimistic.netValue3yr));
console.log("  Net benefit:   " + fmt(model.rollup.optimistic.netBenefit3yr));
console.log("  ROI:           " + (model.rollup.optimistic.roi3yr === null ? "N/A" : Math.round(model.rollup.optimistic.roi3yr * 100) + "%"));
console.log("");
console.log("Overlap discounts: " + model.overlapDiscounts.length);
model.overlapDiscounts.forEach(d => {
  console.log("  " + d.initiativeIds.join(" + ") + " → " + d.discountPct * 100 + "% → " + fmt(d.discountAmountCentral));
});
console.log("");
console.log("Per-initiative breakdown:");
for (const l of model.lines) {
  console.log(
    "  " + l.initiativeId.padEnd(48) +
    " TCO=" + fmt(l.tco3yrCentral) +
    " Value=" + fmt(l.value3yrCentral)
  );
}

// ── Exact integer values for golden-master test ───────────────────────────────
console.log("\n=== Exact integer values for golden-master test ===");
console.log("central.tco3yr:       " + model.rollup.central.tco3yr);
console.log("central.netValue3yr:  " + model.rollup.central.netValue3yr);
console.log("central.netBenefit3yr:" + model.rollup.central.netBenefit3yr);
console.log("central.roi3yr:       " + model.rollup.central.roi3yr);
console.log("conservative.netBenefit3yr: " + model.rollup.conservative.netBenefit3yr);
console.log("optimistic.netBenefit3yr:   " + model.rollup.optimistic.netBenefit3yr);
