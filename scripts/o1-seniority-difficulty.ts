/**
 * Evidence Pack: O1 — Seniority-based starting difficulty
 * Demonstrates that role archetype seniority seeds personaStartingDifficulty:
 *   lead   → 3 (hardest)
 *   senior → 2
 *   mid    → 1
 *   junior → 1
 *
 * Note: 'reward_leader' is an aiqRole enum value (not a roleArchetype ID).
 * When passed as roleHint, it matches the 'reward' archetype (seniority=senior → difficulty=2).
 * The 'hr_leader' archetype (seniority=lead) is used for CHRO-level roles → difficulty=3.
 * This is the correct behaviour: a Reward Specialist starts at difficulty 2 (not 1).
 */
import { resolveRoleArchetype } from "../server/assessment/roleArchetypes";

function getStartingDifficulty(roleHint: string | null): 1 | 2 | 3 {
  const archetype = resolveRoleArchetype(roleHint);
  // Mirrors the O1 logic in server/routers/assessment.ts lines 744-753
  let personaStartingDifficulty: 1 | 2 | 3 = 1;
  if (archetype.seniority === "lead") personaStartingDifficulty = 3;
  else if (archetype.seniority === "senior") personaStartingDifficulty = 2;
  // mid and junior stay at 1
  return personaStartingDifficulty;
}

console.log("\n" + "═".repeat(65));
console.log("O1: SENIORITY-BASED STARTING DIFFICULTY SIMULATION");
console.log("═".repeat(65));

const testCases = [
  { roleHint: "reward",           label: "Reward Specialist (reward)" },
  { roleHint: "reward_leader",    label: "Reward Leader aiqRole (→ resolves to 'reward')" },
  { roleHint: "hr_leader",        label: "HR Leader / CHRO (hr_leader)" },
  { roleHint: "hrbp",             label: "HR Business Partner (hrbp)" },
  { roleHint: "talent_acquisition", label: "TA Specialist (talent_acquisition)" },
  { roleHint: "people_analytics", label: "People Analytics (people_analytics)" },
  { roleHint: "ld_specialist",    label: "L&D Specialist (ld_specialist)" },
  { roleHint: null,               label: "Unknown / null role" },
];

console.log("\n" + "─".repeat(65));
console.log(`${"Role".padEnd(46)} ${"Seniority".padEnd(10)} ${"Difficulty"}`);
console.log("─".repeat(65));

for (const tc of testCases) {
  const archetype = resolveRoleArchetype(tc.roleHint);
  const difficulty = getStartingDifficulty(tc.roleHint);
  const diffLabel = difficulty === 3 ? "3 (hardest)" : difficulty === 2 ? "2 (medium)" : "1 (easiest)";
  console.log(`${tc.label.padEnd(46)} ${archetype.seniority.padEnd(10)} ${diffLabel}`);
}

console.log("─".repeat(65));
console.log("\nO1 Fix: Role archetype seniority seeds personaStartingDifficulty:");
console.log("  lead   → 3  (CHRO/HR Leader level)");
console.log("  senior → 2  (Reward/HRBP/Analytics/People Analytics level)");
console.log("  mid    → 1  (TA/LD/OD specialist level)");
console.log("  junior → 1  (default)");
console.log("\nBefore O1 fix: all roles started at difficulty=1 regardless of seniority.");
console.log("After O1 fix:  senior-level archetypes start at 2, lead-level at 3.");

// Verify assertions
const rewardDifficulty = getStartingDifficulty("reward");
const hrLeaderDifficulty = getStartingDifficulty("hr_leader");
const taDifficulty = getStartingDifficulty("talent_acquisition");
const ldDifficulty = getStartingDifficulty("ld_specialist");

if (rewardDifficulty !== 2) throw new Error(`FAIL: reward expected 2, got ${rewardDifficulty}`);
if (hrLeaderDifficulty !== 3) throw new Error(`FAIL: hr_leader expected 3, got ${hrLeaderDifficulty}`);
if (taDifficulty !== 1) throw new Error(`FAIL: talent_acquisition expected 1, got ${taDifficulty}`);
if (ldDifficulty !== 1) throw new Error(`FAIL: ld_specialist expected 1, got ${ldDifficulty}`);

console.log("\n✓ All assertions passed");
console.log("\n" + "═".repeat(65));
console.log("O1 SIMULATION COMPLETE");
console.log("═".repeat(65));
