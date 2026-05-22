/**
 * B1 Calibration check — use Foundation-phase initiatives for the modest portfolio
 */
import { REWARD_INITIATIVE_LIBRARY } from "./shared/rewardInitiativeLibrary.js";
import {
  computeRequiredLevels,
  seedCurrentLevelsFromMaturity,
  deriveGapStatus,
  CAPABILITY_DIMENSIONS,
  LEVEL_ORDER,
} from "./server/services/rewardCapabilityService.js";

function runPortfolio(label: string, ids: string[], fcaSysc19: boolean, maturity: number, aiMaturity: number) {
  const reqs = computeRequiredLevels(ids, { fcaSysc19 });
  const current = seedCurrentLevelsFromMaturity(maturity, aiMaturity);
  let reds = 0, ambers = 0, greens = 0;
  console.log(`\n--- ${label} ---`);
  for (const r of reqs) {
    const cur = current[r.dimension].level;
    const gap = deriveGapStatus(r.requiredLevel, cur);
    const status = gap === "significant_gap" ? "RED" : gap === "minor_gap" ? "AMBER" : "GREEN";
    if (status === "RED") reds++;
    else if (status === "AMBER") ambers++;
    else greens++;
    const esc = r.escalated ? ` [esc: ${r.escalationReason}]` : "";
    console.log(`  ${r.dimension}: req=${r.requiredLevel}, cur=${cur}, ${status}${esc}`);
  }
  console.log(`  → ${reds} RED, ${ambers} AMBER, ${greens} GREEN`);
  return { reds, ambers, greens };
}

// Foundation-phase initiatives
const foundationIds = REWARD_INITIATIVE_LIBRARY
  .filter(i => i.defaultPhase === "Foundation")
  .map(i => i.id);
console.log(`Foundation initiatives (${foundationIds.length}):`, foundationIds);

// Show their profiles
for (const id of foundationIds) {
  const i = REWARD_INITIATIVE_LIBRARY.find(x => x.id === id)!;
  const cp = i.capabilityProfile;
  const highCount = [cp.dataIntensity, cp.changeImpact, cp.integrationNeed, cp.governanceSensitivity].filter(v => v === "high").length;
  console.log(`  ${id.padEnd(40)} data=${cp.dataIntensity.padEnd(7)} change=${cp.changeImpact.padEnd(7)} int=${cp.integrationNeed.padEnd(7)} gov=${cp.governanceSensitivity.padEnd(7)} [${highCount} high]`);
}

// B1 — Modest portfolio using Foundation initiatives (3-4)
const modestFoundation = foundationIds.slice(0, 3);
runPortfolio("MODEST — 3 Foundation initiatives, medium maturity (3/3)", modestFoundation, false, 3, 3);

const modestFoundation4 = foundationIds.slice(0, 4);
runPortfolio("MODEST — 4 Foundation initiatives, medium maturity (3/3)", modestFoundation4, false, 3, 3);

// B1 — Modest portfolio using low-intensity initiatives
const lowIntensityIds = REWARD_INITIATIVE_LIBRARY
  .filter(i => {
    const cp = i.capabilityProfile;
    const highCount = [cp.dataIntensity, cp.changeImpact, cp.integrationNeed, cp.governanceSensitivity].filter(v => v === "high").length;
    return highCount === 0;
  })
  .map(i => i.id);
console.log(`\nLow-intensity initiatives (0 high ratings): ${lowIntensityIds.length} → ${lowIntensityIds.join(", ")}`);

if (lowIntensityIds.length >= 3) {
  runPortfolio("MODEST — 3 low-intensity initiatives, medium maturity (3/3)", lowIntensityIds.slice(0, 3), false, 3, 3);
}

// B1 — Check what happens with the QA prompt's "Foundation" description
// The QA prompt says "3-4 Foundation initiatives, low intensity"
// Let's check if the Foundation-phase initiatives are actually low-intensity
const foundationHighCount = foundationIds.reduce((acc, id) => {
  const i = REWARD_INITIATIVE_LIBRARY.find(x => x.id === id)!;
  const cp = i.capabilityProfile;
  return acc + [cp.dataIntensity, cp.changeImpact, cp.integrationNeed, cp.governanceSensitivity].filter(v => v === "high").length;
}, 0);
console.log(`\nFoundation initiatives total high ratings: ${foundationHighCount} across ${foundationIds.length} initiatives`);
console.log(`Average high ratings per Foundation initiative: ${(foundationHighCount / foundationIds.length).toFixed(1)}`);

// B1 — Conclusion
console.log("\n=== B1 CALIBRATION CONCLUSION ===");
console.log("The QA prompt's 'modest portfolio' should use Foundation-phase initiatives.");
console.log("If Foundation initiatives are low-intensity, a modest portfolio should be mostly green/amber.");
console.log("If Foundation initiatives are still high-intensity, the ratings may need tuning.");
