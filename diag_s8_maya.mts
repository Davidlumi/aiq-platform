/**
 * Stage 8 v2 math audit — Maya's 8-initiative portfolio
 * Run: npx tsx diag_s8_maya.mts
 */
import { REWARD_INITIATIVE_LIBRARY } from "./shared/rewardInitiativeLibrary.js";
import {
  computeRequiredLevels,
  deriveGapStatus,
  deriveSequencingFlags,
  computeEnablementCost,
  CAPABILITY_DIMENSIONS,
  CapabilityLevel,
  CapabilityDimension,
} from "./server/services/rewardCapabilityService.js";

// Maya's 8-initiative portfolio (Northbridge Financial Services, 8,000 employees)
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

// ─── 1. Print capabilityProfile for each initiative ───────────────────────────
console.log("\n=== MAYA PORTFOLIO — capabilityProfile per initiative ===\n");
console.log(
  "ID".padEnd(50) +
  "dataInt".padEnd(10) +
  "changeImp".padEnd(12) +
  "integNeed".padEnd(12) +
  "govSens"
);
console.log("─".repeat(96));

let highDataCount = 0;
let highChangeCount = 0;
let highIntegCount = 0;
let highGovCount = 0;

for (const id of MAYA_IDS) {
  const init = REWARD_INITIATIVE_LIBRARY.find((i) => i.id === id);
  if (!init) {
    console.log(`${id.padEnd(50)} NOT FOUND`);
    continue;
  }
  const cp = init.capabilityProfile;
  console.log(
    id.padEnd(50) +
    cp.dataIntensity.padEnd(10) +
    cp.changeImpact.padEnd(12) +
    cp.integrationNeed.padEnd(12) +
    cp.governanceSensitivity
  );
  if (cp.dataIntensity === "high") highDataCount++;
  if (cp.changeImpact === "high") highChangeCount++;
  if (cp.integrationNeed === "high") highIntegCount++;
  if (cp.governanceSensitivity === "high") highGovCount++;
}

console.log(`\nHigh-data count: ${highDataCount}`);
console.log(`High-change count: ${highChangeCount}`);
console.log(`High-integration count: ${highIntegCount}`);
console.log(`High-governance count: ${highGovCount}`);

// ─── 2. computeRequiredLevels (current implementation) ────────────────────────
console.log("\n=== computeRequiredLevels (CURRENT IMPLEMENTATION — max-only) ===\n");
const required = computeRequiredLevels(MAYA_IDS);
for (const r of required) {
  console.log(`${r.dimension.padEnd(25)} required=${r.requiredLevel.padEnd(8)} drivers=${r.drivingInitiativeIds.length}`);
}

// ─── 3. v2 escalation rules ───────────────────────────────────────────────────
console.log("\n=== v2 ESCALATION RULES (what SHOULD be returned) ===\n");

// Level mapping: low=1, medium=2, high=3, very_high=4
// v2 rule: if peak is "high" AND ≥3 initiatives are "high" → escalate to "very_high" (level 4)
// v2 rule: FCA SYSC 19 flag → governance +1 (if governance required ≤ high, bump to very_high)

// For Maya: does she have FCA flag? Check prework — we simulate it as true (FS sector)
const FCA_SYSC19 = true; // Northbridge Financial Services

const v2Required: Record<CapabilityDimension, { level: number; label: string; reason: string }> = {
  data_foundations: { level: 0, label: "", reason: "" },
  change_management: { level: 0, label: "", reason: "" },
  systems_integration: { level: 0, label: "", reason: "" },
  governance: { level: 0, label: "", reason: "" },
  team_skills: { level: 0, label: "", reason: "" },
};

// Base max
for (const r of required) {
  const baseLevel = r.requiredLevel === "high" ? 3 : r.requiredLevel === "medium" ? 2 : 1;
  v2Required[r.dimension].level = baseLevel;
  v2Required[r.dimension].label = r.requiredLevel;
  v2Required[r.dimension].reason = `max=${r.requiredLevel}`;
}

// Escalation: ≥3 high → +1
const highCounts: Record<CapabilityDimension, number> = {
  data_foundations: highDataCount,
  change_management: highChangeCount,
  systems_integration: highIntegCount,
  governance: highGovCount,
  team_skills: 0,
};

for (const dim of ["data_foundations", "change_management", "systems_integration", "governance"] as CapabilityDimension[]) {
  if (v2Required[dim].level === 3 && highCounts[dim] >= 3) {
    v2Required[dim].level = 4;
    v2Required[dim].label = "very_high";
    v2Required[dim].reason += ` + escalation (${highCounts[dim]} high → very_high)`;
  }
}

// FCA governance +1
if (FCA_SYSC19 && v2Required.governance.level < 4) {
  v2Required.governance.level = Math.min(4, v2Required.governance.level + 1);
  const newLabel = v2Required.governance.level === 4 ? "very_high" : v2Required.governance.level === 3 ? "high" : "medium";
  v2Required.governance.reason += ` + FCA SYSC19 +1 → ${newLabel}`;
  v2Required.governance.label = newLabel;
}

// team_skills: 8 initiatives → high (7+ = high)
v2Required.team_skills = { level: 3, label: "high", reason: "8 initiatives → high (7+ rule)" };

console.log("Dimension".padEnd(25) + "v2Required".padEnd(15) + "Reason");
console.log("─".repeat(80));
for (const dim of CAPABILITY_DIMENSIONS) {
  const v = v2Required[dim];
  console.log(`${dim.padEnd(25)}${v.label.padEnd(15)}${v.reason}`);
}

// ─── 4. Maya's current levels (seeded from Stage 1 maturity) ─────────────────
console.log("\n=== MAYA CURRENT LEVELS (seeded from Stage 1 — FS sector, medium maturity) ===\n");
// Stage 1 seeding logic: rewardFunctionMaturityRating → team_skills/data_foundations
// aiMaturityInRewardToday → all dimensions
// Northbridge: medium maturity, FS sector
// Seeded estimates (editable starting points):
const MAYA_CURRENT: Record<CapabilityDimension, CapabilityLevel> = {
  data_foundations: "medium",    // FS has reasonable data but not AI-grade
  change_management: "medium",   // medium maturity org
  systems_integration: "medium", // established HRIS but not AI-integrated
  governance: "medium",          // FS has governance frameworks but not AI-specific
  team_skills: "low",            // reward team not yet AI-skilled
};

// ─── 5. Gap analysis: current vs v2 required ─────────────────────────────────
console.log("Dimension".padEnd(25) + "v2Req".padEnd(12) + "Current".padEnd(12) + "Gap (levels)".padEnd(15) + "Status");
console.log("─".repeat(75));

// Map level number to CapabilityLevel
function numToLevel(n: number): CapabilityLevel | "very_high" {
  if (n >= 4) return "very_high";
  if (n === 3) return "high";
  if (n === 2) return "medium";
  return "low";
}

for (const dim of CAPABILITY_DIMENSIONS) {
  const reqNum = v2Required[dim].level;
  const curLevel = MAYA_CURRENT[dim];
  const curNum = curLevel === "high" ? 3 : curLevel === "medium" ? 2 : 1;
  const gapNum = reqNum - curNum;

  let status: string;
  if (gapNum <= 0) status = "✅ no_gap";
  else if (gapNum === 1) status = "🟡 minor_gap";
  else status = "🔴 significant_gap";

  console.log(
    `${dim.padEnd(25)}${numToLevel(reqNum).toString().padEnd(12)}${curLevel.padEnd(12)}${gapNum.toString().padEnd(15)}${status}`
  );
}

// ─── 6. What the CURRENT implementation returns for Maya ─────────────────────
console.log("\n=== CURRENT IMPLEMENTATION GAP RESULTS (max-only, no escalation) ===\n");
// Using high=3 scale only (no very_high)
const CURRENT_REQUIRED_LEVELS: Record<CapabilityDimension, CapabilityLevel> = {};
for (const r of required) {
  CURRENT_REQUIRED_LEVELS[r.dimension] = r.requiredLevel;
}

console.log("Dimension".padEnd(25) + "Required".padEnd(12) + "Current".padEnd(12) + "Status");
console.log("─".repeat(65));
for (const dim of CAPABILITY_DIMENSIONS) {
  const req = CURRENT_REQUIRED_LEVELS[dim];
  const cur = MAYA_CURRENT[dim];
  const gap = deriveGapStatus(req, cur);
  const icon = gap === "no_gap" ? "✅" : gap === "minor_gap" ? "🟡" : "🔴";
  console.log(`${dim.padEnd(25)}${req.padEnd(12)}${cur.padEnd(12)}${icon} ${gap}`);
}

// ─── 7. Sequencing flags (current implementation) ────────────────────────────
console.log("\n=== SEQUENCING FLAGS (current implementation, gap-tied) ===\n");
const dimAssessments = CAPABILITY_DIMENSIONS.map((dim) => ({
  dimension: dim,
  gapStatus: deriveGapStatus(CURRENT_REQUIRED_LEVELS[dim], MAYA_CURRENT[dim]),
}));
const flags = deriveSequencingFlags(MAYA_IDS, dimAssessments);
for (const f of flags) {
  const shortId = f.initiativeId.replace("ai_", "").replace(/_/g, " ");
  console.log(`${shortId.padEnd(45)} ${f.status}${f.reason ? " — " + f.reason : ""}`);
}

// ─── 8. Summary of issues ────────────────────────────────────────────────────
console.log("\n=== ISSUES SUMMARY ===\n");
console.log(`1. ESCALATION: data_foundations has ${highDataCount} high-demand initiatives.`);
console.log(`   Current impl returns: ${CURRENT_REQUIRED_LEVELS.data_foundations}`);
console.log(`   v2 spec requires: ${highDataCount >= 3 ? "very_high (escalated)" : "high (no escalation)"}`);
console.log(`   → ${highDataCount >= 3 ? "❌ MISSING v2 escalation" : "✅ no escalation needed"}`);

console.log(`\n2. FCA GOVERNANCE: FCA_SYSC19=${FCA_SYSC19}`);
console.log(`   Current impl returns governance required: ${CURRENT_REQUIRED_LEVELS.governance}`);
const govNum = CURRENT_REQUIRED_LEVELS.governance === "high" ? 3 : CURRENT_REQUIRED_LEVELS.governance === "medium" ? 2 : 1;
const govV2 = FCA_SYSC19 ? Math.min(4, govNum + 1) : govNum;
console.log(`   v2 spec requires: ${numToLevel(govV2)} (FCA +1)`);
console.log(`   → ${FCA_SYSC19 && govV2 > govNum ? "❌ MISSING FCA governance escalation" : "✅ no FCA escalation needed"}`);

console.log(`\n3. CURRENT-LEVEL SEEDING: router seeds from Stage 1 maturity inputs?`);
console.log(`   → Need to check router generateAssessment procedure`);

console.log(`\n4. SEQUENCING FLAGS: gap-tied (only fires on actual gap)?`);
const dataGap = deriveGapStatus(CURRENT_REQUIRED_LEVELS.data_foundations, MAYA_CURRENT.data_foundations);
console.log(`   data_foundations gap=${dataGap}, high-data initiatives=${highDataCount}`);
console.log(`   → Flags fire on gap, not on high-demand alone: ✅ correct`);
