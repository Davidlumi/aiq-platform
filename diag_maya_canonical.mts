/**
 * Canonical Maya portfolio fixture diagnostic.
 * 8 initiatives: #1, #2, #3, #4, #6, #15, #16, #17
 * Profile: 8,000 employees, £95M payroll, Financial Services, FCA SYSC 19 in scope
 */
import { computeBusinessCase } from "./server/services/rewardBusinessCaseEngine.ts";

const MAYA_IDS = [
  "ai_compensation_recommendation_engine",   // #1
  "ai_driven_merit_cycle_orchestration",     // #2
  "ai_pay_equity_continuous_monitoring",     // #3
  "ai_multi_characteristic_pay_gap_reporting", // #4
  "ai_pay_band_design",                      // #6
  "ai_reward_operations_assistant",          // #15
  "ai_bonus_pool_optimisation",              // #16
  "ai_sales_compensation_plan_design",       // #17
];

const PROFILE = {
  ukEmployeeHeadcount: 8000,
  annualPayrollCostGbp: 95_000_000,
  sector: "financial_services" as const,
};

const model = computeBusinessCase(
  MAYA_IDS,
  {
    sector: PROFILE.sector,
    totalEmployeeHeadcount: PROFILE.ukEmployeeHeadcount,
    totalPayrollGbp: PROFILE.annualPayrollCostGbp,
  },
  {}, // no overrides
  {}  // no programme funding assumptions
);

const c = model.rollup.central;
const cons = model.rollup.conservative;
const opt = model.rollup.optimistic;

console.log("=== CANONICAL MAYA FIXTURE ===");
console.log("Portfolio:", MAYA_IDS.join(", "));
console.log("Profile:", JSON.stringify(PROFILE));
console.log("");
console.log("--- Central scenario ---");
console.log("TCO 3yr:           ", c.tco3yr, `(£${(c.tco3yr/1e6).toFixed(3)}M)`);
console.log("Net value 3yr:     ", c.netValue3yr, `(£${(c.netValue3yr/1e6).toFixed(3)}M)`);
console.log("Net benefit 3yr:   ", c.netBenefit3yr, `(£${(c.netBenefit3yr/1e6).toFixed(3)}M)`);
console.log("ROI:               ", c.roi, `(${c.roi}%)`);
console.log("Payback months:    ", c.paybackMonths);
console.log("Overlap discount:  ", c.overlapDiscountTotal, `(£${(c.overlapDiscountTotal/1e6).toFixed(3)}M)`);
console.log("");
console.log("--- Conservative scenario ---");
console.log("TCO 3yr:           ", cons.tco3yr, `(£${(cons.tco3yr/1e6).toFixed(3)}M)`);
console.log("Net benefit 3yr:   ", cons.netBenefit3yr, `(£${(cons.netBenefit3yr/1e6).toFixed(3)}M)`);
console.log("ROI:               ", cons.roi, `(${cons.roi}%)`);
console.log("");
console.log("--- Optimistic scenario ---");
console.log("TCO 3yr:           ", opt.tco3yr, `(£${(opt.tco3yr/1e6).toFixed(3)}M)`);
console.log("Net benefit 3yr:   ", opt.netBenefit3yr, `(£${(opt.netBenefit3yr/1e6).toFixed(3)}M)`);
console.log("ROI:               ", opt.roi, `(${opt.roi}%)`);
console.log("");
console.log("--- Overlap groups ---");
model.overlapGroups.forEach((g, i) => {
  console.log(`Group ${i+1}: ids=${g.ids.join(",")} discount=${g.discount} (£${(g.discount/1e6).toFixed(3)}M)`);
});
console.log("");
console.log("--- Per-initiative lines ---");
model.lines.forEach(l => {
  console.log(`  ${l.id}: tco=${l.tco3yrCentral} value=${l.value3yrCentral} netBenefit=${l.value3yrCentral - l.tco3yrCentral}`);
});
console.log("");
console.log("Unknown IDs:", model.unknownIds);
