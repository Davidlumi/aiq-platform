import { computeBusinessCase } from "./server/services/rewardBusinessCaseEngine.js";

const MAYA_IDS = [
  "ai_compensation_recommendation_engine",
  "ai_driven_merit_cycle_orchestration",
  "ai_pay_equity_continuous_monitoring",
  "ai_multi_characteristic_pay_gap_reporting",
  "ai_pay_band_design",
  "ai_reward_operations_assistant",
  "ai_bonus_pool_optimisation",
  "ai_sales_compensation_plan_design",
];

const model = computeBusinessCase(
  MAYA_IDS,
  { sector: "financial_services" as const, totalEmployeeHeadcount: 8000, totalPayrollGbp: 95_000_000 },
  {},
  {}
);

const c = model.rollup.central;
const cons = model.rollup.conservative;
const opt = model.rollup.optimistic;

console.log("\n=== MAYA CORRECTED FIGURES (post-TCO fix) ===\n");
console.log("CENTRAL:");
console.log(`  Gross value:        £${(c.grossValue3yr/1e6).toFixed(2)}M`);
console.log(`  Overlap discount:   -£${(c.overlapDiscountTotal/1e6).toFixed(2)}M`);
console.log(`  Adjusted value:     £${(c.netValue3yr/1e6).toFixed(2)}M`);
console.log(`  TCO (3yr):          £${(c.tco3yr/1e6).toFixed(2)}M`);
console.log(`  Net benefit:        £${(c.netBenefit3yr/1e6).toFixed(2)}M`);
console.log(`  ROI:                ${c.roi3yr !== null ? Math.round(c.roi3yr*100)+"%" : "N/A"}`);
console.log(`  Payback:            ${c.paybackMonths ?? "beyond 3yr"} months`);

console.log("\nCONSERVATIVE:");
console.log(`  Gross value:        £${(cons.grossValue3yr/1e6).toFixed(2)}M`);
console.log(`  Overlap discount:   -£${(cons.overlapDiscountTotal/1e6).toFixed(2)}M`);
console.log(`  Adjusted value:     £${(cons.netValue3yr/1e6).toFixed(2)}M`);
console.log(`  TCO (3yr):          £${(cons.tco3yr/1e6).toFixed(2)}M`);
console.log(`  Net benefit:        £${(cons.netBenefit3yr/1e6).toFixed(2)}M`);
console.log(`  ROI:                ${cons.roi3yr !== null ? Math.round(cons.roi3yr*100)+"%" : "N/A"}`);

console.log("\nOPTIMISTIC:");
console.log(`  Gross value:        £${(opt.grossValue3yr/1e6).toFixed(2)}M`);
console.log(`  Overlap discount:   -£${(opt.overlapDiscountTotal/1e6).toFixed(2)}M`);
console.log(`  Adjusted value:     £${(opt.netValue3yr/1e6).toFixed(2)}M`);
console.log(`  TCO (3yr):          £${(opt.tco3yr/1e6).toFixed(2)}M`);
console.log(`  Net benefit:        £${(opt.netBenefit3yr/1e6).toFixed(2)}M`);

// Show #6 line specifically
const line6 = model.lines.find(l => l.initiativeId === "ai_pay_band_design");
if (line6) {
  console.log("\n#6 Pay Band Design line:");
  console.log(`  tco3yrCentral:      £${(line6.tco3yrCentral/1e3).toFixed(0)}k`);
  console.log(`  value3yrCentral:    £${(line6.value3yrCentral/1e3).toFixed(0)}k`);
  console.log(`  excludesProgrammeFunding: ${line6.excludesProgrammeFunding}`);
  console.log(`  excludedFromStandingTco:  ${line6.excludedFromStandingTco}`);
}

// Show overlap discounts
console.log("\nOverlap discounts:");
for (const d of model.overlapDiscounts) {
  console.log(`  ${d.subDomain} (${d.initiativeIds.length} initiatives): -£${(d.discountAmountCentral/1e3).toFixed(0)}k central`);
}
