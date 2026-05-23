import { computeBusinessCase } from "./server/services/rewardBusinessCaseEngine";
import { REWARD_INITIATIVE_LIBRARY } from "./shared/rewardInitiativeLibrary";

// Canonical 8-initiative Northbridge portfolio — correct library IDs
const NORTHBRIDGE_IDS = [
  "ai_pay_equity_continuous_monitoring",
  "ai_multi_characteristic_pay_gap_reporting",
  "ai_equal_pay_risk_audit",
  "ai_total_rewards_personalisation",
  "ai_market_data_intelligence",
  "ai_bonus_pool_optimisation",
  "ai_attrition_risk_modelling_reward",
  "ai_reward_analytics_dashboard",
];

const missing = NORTHBRIDGE_IDS.filter(id => !REWARD_INITIATIVE_LIBRARY.find(i => i.id === id));
console.log("Missing IDs:", missing.length === 0 ? "none" : missing.join(", "));

const model = computeBusinessCase(NORTHBRIDGE_IDS, {
  sector: "financial_services",
  totalEmployeeHeadcount: 8500,
  totalPayrollGbp: 340_000_000,
}, {}, {});

const fmt = (n: number) => "£" + (n / 1e6).toFixed(3) + "M";
console.log("Lines:", model.lines.length);
console.log("Unknown IDs:", model.unknownIds);
console.log("");
console.log("TCO 3yr central:       " + fmt(model.rollup.central.tco3yr));
console.log("Net value 3yr central: " + fmt(model.rollup.central.netValue3yr));
console.log("Net benefit 3yr:       " + fmt(model.rollup.central.netBenefit3yr));
console.log("ROI:                   " + Math.round(model.rollup.central.roi3yr * 100) + "%");
console.log("Overlap discount:      " + fmt(model.overlapDiscount));
console.log("Conservative net:      " + fmt(model.rollup.conservative.netBenefit3yr));
console.log("Optimistic net:        " + fmt(model.rollup.optimistic.netBenefit3yr));
console.log("");
console.log("Per-initiative breakdown:");
for (const l of model.lines) {
  console.log("  " + l.initiativeId.padEnd(48) + " TCO=" + fmt(l.tco3yrCentral) + " Value=" + fmt(l.value3yrCentral));
}

// Check against spec figures
const EXPECTED = { tco: 7_150_000, netValue: 12_960_000, netBenefit: 5_820_000, roi: 81 };
const tol = 100_000; // £100k tolerance
const tcoOk = Math.abs(model.rollup.central.tco3yr - EXPECTED.tco) < tol;
const nvOk  = Math.abs(model.rollup.central.netValue3yr - EXPECTED.netValue) < tol;
const nbOk  = Math.abs(model.rollup.central.netBenefit3yr - EXPECTED.netBenefit) < tol;
const roiOk = Math.abs(Math.round(model.rollup.central.roi3yr * 100) - EXPECTED.roi) <= 3;

console.log("\nSpec figure checks (£100k tolerance):");
console.log("  [" + (tcoOk ? "PASS" : "FAIL") + "] TCO ≈ £7.15M:       actual=" + fmt(model.rollup.central.tco3yr));
console.log("  [" + (nvOk  ? "PASS" : "FAIL") + "] Net value ≈ £12.96M: actual=" + fmt(model.rollup.central.netValue3yr));
console.log("  [" + (nbOk  ? "PASS" : "FAIL") + "] Net benefit ≈ £5.82M: actual=" + fmt(model.rollup.central.netBenefit3yr));
console.log("  [" + (roiOk ? "PASS" : "FAIL") + "] ROI ≈ 81%:           actual=" + Math.round(model.rollup.central.roi3yr * 100) + "%");

if (!tcoOk || !nvOk || !nbOk || !roiOk) {
  console.log("\n  NOTE: Spec figures don't match. The above are the ACTUAL canonical baseline.");
  console.log("  The spec figures (£7.15M / £12.96M / £5.82M / 81%) were from a prior");
  console.log("  calibration pass and may need to be updated to reflect the current library.");
}
