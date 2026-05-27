/**
 * Dump Northbridge fixture data for board report development.
 */
import { computeBusinessCase } from "../server/services/rewardBusinessCaseEngine";

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
  { sector: "financial_services", totalEmployeeHeadcount: 8_000, totalPayrollGbp: 95_000_000 },
  {},
  {}
);

console.log("=== CENTRAL ===");
console.log(JSON.stringify(model.rollup.central, null, 2));
console.log("=== CONSERVATIVE ===");
console.log(JSON.stringify(model.rollup.conservative, null, 2));
console.log("=== OPTIMISTIC ===");
console.log(JSON.stringify(model.rollup.optimistic, null, 2));
console.log("=== LINES ===");
for (const l of model.lines) {
  console.log(`  ${l.initiativeId} | ${l.displayName} | phase=${l.phase} | subDomain=${l.subDomain}`);
  console.log(`    central: gross=${l.central.grossValue3yr} tco=${l.central.tco3yr} net=${l.central.netValue3yr}`);
}
console.log("=== OVERLAP DISCOUNTS ===");
for (const d of model.overlapDiscounts) {
  console.log(`  ${d.subDomain} ${d.discountPct*100}%: ${d.initiativeIds.join(", ")} → £${d.discountAmountCentral.toLocaleString()}`);
}
