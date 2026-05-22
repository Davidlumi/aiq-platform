import { REWARD_INITIATIVE_LIBRARY } from "./shared/rewardInitiativeLibrary.js";
import { computeRequiredLevels, seedCurrentLevelsFromMaturity, deriveGapStatus } from "./server/services/rewardCapabilityService.js";

const ids = REWARD_INITIATIVE_LIBRARY.slice(0,3).map(i => i.id);
console.log("Portfolio:", ids);

const reqs = computeRequiredLevels(ids);
const current = seedCurrentLevelsFromMaturity(4, 4);

console.log("\nRequirements:");
for (const r of reqs) {
  const cur = current[r.dimension].level;
  const gap = deriveGapStatus(r.requiredLevel, cur);
  console.log(`  ${r.dimension}: req=${r.requiredLevel}, cur=${cur}, gap=${gap}${r.escalated ? ` [ESCALATED: ${r.escalationReason}]` : ""}`);
}

console.log("\nFirst 3 initiatives capabilityProfile:");
for (const i of REWARD_INITIATIVE_LIBRARY.slice(0,3)) {
  const cp = i.capabilityProfile;
  console.log(`  ${i.id}: data=${cp.dataIntensity} change=${cp.changeImpact} int=${cp.integrationNeed} gov=${cp.governanceSensitivity}`);
}

// The D1 issue: the "green" portfolio test used maturity 4/4 but the first 3 initiatives
// all have high dataIntensity, which means data_foundations required = very_high (3 high → escalated)
// and seedCurrentLevelsFromMaturity(4,4) returns "high" for data_foundations
// So: req=very_high, cur=high → minor_gap → needs_enablement
// This is CORRECT behaviour (gap-tied: there IS a gap), not a D1 bug
// The test in the diagnostic was wrong to call this "green portfolio"

console.log("\n=== DIAGNOSIS ===");
console.log("The D1 'issue' is a false alarm in the diagnostic test.");
console.log("The first 3 library initiatives all have high dataIntensity.");
console.log("With 3 high-data initiatives, data_foundations escalates to very_high.");
console.log("seedCurrentLevelsFromMaturity(4,4) returns 'high' for data_foundations.");
console.log("So: req=very_high, cur=high → minor_gap → needs_enablement.");
console.log("This IS gap-tied behaviour — there IS a real gap (very_high vs high).");
console.log("The diagnostic test was wrong to label this a 'green portfolio'.");
console.log("A truly green portfolio would need cur=very_high on all dimensions.");

// Verify: if we manually set current to very_high, flags should be clear
const vhCurrent = { data_foundations: { level: "very_high" as const, isProvisional: true as const },
  change_management: { level: "very_high" as const, isProvisional: true as const },
  systems_integration: { level: "very_high" as const, isProvisional: true as const },
  governance: { level: "very_high" as const, isProvisional: true as const },
  team_skills: { level: "very_high" as const, isProvisional: true as const } };
const { deriveSequencingFlags } = await import("./server/services/rewardCapabilityService.js");
const vhAssessments = reqs.map(r => ({
  dimension: r.dimension,
  gapStatus: deriveGapStatus(r.requiredLevel, vhCurrent[r.dimension].level),
}));
const vhFlags = deriveSequencingFlags(ids, vhAssessments);
console.log("\nWith very_high current on all dims:");
for (const f of vhFlags) {
  console.log(`  ${f.initiativeId}: ${f.status}`);
}
const allReady = vhFlags.every(f => f.status === "ready");
console.log(`  All ready: ${allReady ? "✓ D1 confirmed gap-tied" : "✗ REAL D1 BUG"}`);
