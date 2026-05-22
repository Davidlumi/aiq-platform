import {
  computeRequiredLevels,
  seedCurrentLevelsFromMaturity,
  deriveGapStatus,
  LEVEL_ORDER,
} from "./server/services/rewardCapabilityService.js";

// Maya's 8-initiative portfolio (Northbridge Financial Services)
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

// Maya's Stage 1 maturity inputs (Northbridge: established FS firm, moderate maturity)
const REWARD_FUNCTION_MATURITY = 3; // 3/4 — experienced team, some data gaps
const AI_MATURITY_TODAY = 2;        // 2/4 — early AI adoption

console.log("=== Maya's Stage 8 Capability Assessment (v2) ===\n");

// 1. Required levels WITHOUT FCA flag
const reqNoFca = computeRequiredLevels(MAYA_IDS, { fcaSysc19: false });
console.log("--- Required Levels (no FCA flag) ---");
for (const r of reqNoFca) {
  const escalatedNote = r.escalated ? ` [ESCALATED: ${r.escalationReason}]` : "";
  console.log(`  ${r.dimension.padEnd(22)} required=${r.requiredLevel.padEnd(10)} driving=${r.drivingInitiativeIds.length}${escalatedNote}`);
}

// 2. Required levels WITH FCA flag (Maya is FCA-regulated)
const reqFca = computeRequiredLevels(MAYA_IDS, { fcaSysc19: true });
console.log("\n--- Required Levels (FCA SYSC 19 = true) ---");
for (const r of reqFca) {
  const escalatedNote = r.escalated ? ` [ESCALATED: ${r.escalationReason}]` : "";
  console.log(`  ${r.dimension.padEnd(22)} required=${r.requiredLevel.padEnd(10)} driving=${r.drivingInitiativeIds.length}${escalatedNote}`);
}

// 3. Seeded current levels from Stage 1 maturity
const seeded = seedCurrentLevelsFromMaturity(REWARD_FUNCTION_MATURITY, AI_MATURITY_TODAY);
console.log(`\n--- Seeded Current Levels (rewardMaturity=${REWARD_FUNCTION_MATURITY}/4, aiMaturity=${AI_MATURITY_TODAY}/4) ---`);
for (const [dim, val] of Object.entries(seeded)) {
  console.log(`  ${dim.padEnd(22)} current=${val.level} [provisional]`);
}

// 4. Full dimension table: required / current / gap / status
console.log("\n--- Full Dimension Table (FCA=true, seeded current levels) ---");
console.log("Dimension              Required    Current     Gap   Status");
console.log("─".repeat(70));
for (const r of reqFca) {
  const seededLevel = seeded[r.dimension as keyof typeof seeded]?.level ?? null;
  const gapStatus = deriveGapStatus(r.requiredLevel, seededLevel);
  const reqNum = LEVEL_ORDER[r.requiredLevel];
  const curNum = seededLevel ? LEVEL_ORDER[seededLevel] : null;
  const gapNum = curNum !== null ? reqNum - curNum : null;
  const gapStr = gapNum !== null ? `${gapNum > 0 ? "+" : ""}${gapNum}` : "N/A";
  const statusIcon = gapStatus === "significant_gap" ? "🔴" : gapStatus === "minor_gap" ? "🟡" : gapStatus === "no_gap" ? "🟢" : "⚪";
  console.log(
    `${r.dimension.padEnd(22)} ${r.requiredLevel.padEnd(12)} ${(seededLevel ?? "not set").padEnd(12)} ${gapStr.padEnd(6)} ${statusIcon} ${gapStatus ?? "not assessed"}`
  );
}

// 5. Escalation count check per dimension
console.log("\n--- Escalation Count Check (high-demand initiatives per dimension) ---");
import { REWARD_INITIATIVE_LIBRARY } from "./shared/rewardInitiativeLibrary.js";
const profiles = MAYA_IDS.map((id) => REWARD_INITIATIVE_LIBRARY.find((i) => i.id === id)).filter(Boolean);
const dims = ["data_foundations", "change_management", "systems_integration", "governance"] as const;
for (const dim of dims) {
  const fieldMap = {
    data_foundations: "dataIntensity",
    change_management: "changeImpact",
    systems_integration: "integrationNeed",
    governance: "governanceSensitivity",
  } as const;
  const field = fieldMap[dim];
  const highCount = profiles.filter((p) => p!.capabilityProfile[field] === "high").length;
  const medCount = profiles.filter((p) => p!.capabilityProfile[field] === "medium").length;
  const lowCount = profiles.filter((p) => p!.capabilityProfile[field] === "low").length;
  const escalates = highCount >= 3 ? "→ ESCALATES to very_high" : "";
  console.log(`  ${dim.padEnd(22)} high=${highCount} medium=${medCount} low=${lowCount} ${escalates}`);
}
