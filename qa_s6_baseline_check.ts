import { REWARD_INITIATIVE_LIBRARY } from "./shared/rewardInitiativeLibrary";

let missingCount = 0;
let total = 0;

for (const init of REWARD_INITIATIVE_LIBRARY) {
  for (const m of init.suggestedMeasures ?? []) {
    total++;
    const hasBaselineType = "defaultBaselineType" in m && m.defaultBaselineType !== undefined;
    if (!hasBaselineType) {
      missingCount++;
      if (missingCount <= 5) {
        console.log(`MISSING defaultBaselineType: ${init.id} | "${m.name}"`);
      }
    }
  }
}
console.log(`\nTotal measures: ${total}, missing defaultBaselineType: ${missingCount}`);

// Also check the real Maya IDs
const MAYA_IDS_TO_CHECK = [
  "ai_compensation_recommendation_engine",
  "ai_driven_merit_cycle_orchestration",
  "ai_pay_equity_continuous_monitoring",
  "ai_multi_characteristic_pay_gap_reporting",
  "ai_pay_band_design",
  "ai_reward_operations_assistant",
  "ai_bonus_pool_optimisation",
  "ai_sales_compensation_plan_design",
];
console.log("\n=== Maya portfolio IDs check ===");
for (const id of MAYA_IDS_TO_CHECK) {
  const found = REWARD_INITIATIVE_LIBRARY.find(i => i.id === id);
  const measureCount = found?.suggestedMeasures?.length ?? 0;
  console.log(`  ${found ? "FOUND" : "NOT FOUND"}: ${id} (${measureCount} measures)`);
}
