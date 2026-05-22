/**
 * Stage 8 QA Diagnostic Script
 * Runs A-block math checks and B-block calibration across 3 portfolios.
 */

import { REWARD_INITIATIVE_LIBRARY } from "./shared/rewardInitiativeLibrary.js";
import {
  computeRequiredLevels,
  seedCurrentLevelsFromMaturity,
  deriveGapStatus,
  deriveSequencingFlags,
  computeEnablementCost,
  CAPABILITY_DIMENSIONS,
  LEVEL_ORDER,
  type CapabilityLevel,
  type CapabilityDimension,
} from "./server/services/rewardCapabilityService.js";

// ── A-block: Math regression ──────────────────────────────────────────────────

console.log("=== A1: Escalation rule ===");

// Find initiatives with high dataIntensity
const highDataIds = REWARD_INITIATIVE_LIBRARY
  .filter(i => i.capabilityProfile.dataIntensity === "high")
  .map(i => i.id);
const medDataIds = REWARD_INITIATIVE_LIBRARY
  .filter(i => i.capabilityProfile.dataIntensity === "medium")
  .map(i => i.id);
const lowDataIds = REWARD_INITIATIVE_LIBRARY
  .filter(i => i.capabilityProfile.dataIntensity === "low")
  .map(i => i.id);

console.log(`High dataIntensity initiatives: ${highDataIds.length} → ${highDataIds.join(", ")}`);
console.log(`Medium dataIntensity: ${medDataIds.length}, Low dataIntensity: ${lowDataIds.length}`);

// Test: exactly 2 high → should be "high" (no escalation)
const twoHighIds = highDataIds.slice(0, 2);
const twoHighResult = computeRequiredLevels(twoHighIds);
const twoHighDF = twoHighResult.find(r => r.dimension === "data_foundations");
console.log(`\n2 high-data initiatives → data_foundations required: ${twoHighDF?.requiredLevel} (expected: high), escalated: ${twoHighDF?.escalated}`);
console.log(`  PASS: ${twoHighDF?.requiredLevel === "high" && !twoHighDF?.escalated ? "✓" : "✗ FAIL"}`);

// Test: exactly 3 high → should escalate to "very_high"
const threeHighIds = highDataIds.slice(0, 3);
const threeHighResult = computeRequiredLevels(threeHighIds);
const threeHighDF = threeHighResult.find(r => r.dimension === "data_foundations");
console.log(`\n3 high-data initiatives → data_foundations required: ${threeHighDF?.requiredLevel} (expected: very_high), escalated: ${threeHighDF?.escalated}`);
console.log(`  PASS: ${threeHighDF?.requiredLevel === "very_high" && threeHighDF?.escalated ? "✓" : "✗ FAIL"}`);

// Test: 5 high → should also be "very_high"
const fiveHighIds = highDataIds.slice(0, Math.min(5, highDataIds.length));
const fiveHighResult = computeRequiredLevels(fiveHighIds);
const fiveHighDF = fiveHighResult.find(r => r.dimension === "data_foundations");
console.log(`\n${fiveHighIds.length} high-data initiatives → data_foundations required: ${fiveHighDF?.requiredLevel} (expected: very_high)`);
console.log(`  PASS: ${fiveHighDF?.requiredLevel === "very_high" ? "✓" : "✗ FAIL"}`);

console.log("\n=== A2: FCA governance escalation ===");

// Find initiatives with high governanceSensitivity
const highGovIds = REWARD_INITIATIVE_LIBRARY
  .filter(i => i.capabilityProfile.governanceSensitivity === "high")
  .map(i => i.id);
console.log(`High governance initiatives: ${highGovIds.length} → ${highGovIds.join(", ")}`);

// Test: 2 high-gov initiatives, no FCA → governance = "high"
const twoGovIds = highGovIds.slice(0, 2);
const noFcaResult = computeRequiredLevels(twoGovIds, { fcaSysc19: false });
const noFcaGov = noFcaResult.find(r => r.dimension === "governance");
console.log(`\n2 high-gov, no FCA → governance: ${noFcaGov?.requiredLevel} (expected: high)`);
console.log(`  PASS: ${noFcaGov?.requiredLevel === "high" ? "✓" : "✗ FAIL"}`);

// Test: 2 high-gov, with FCA → governance = "very_high" (+1 from high)
const withFcaResult = computeRequiredLevels(twoGovIds, { fcaSysc19: true });
const withFcaGov = withFcaResult.find(r => r.dimension === "governance");
console.log(`\n2 high-gov, with FCA → governance: ${withFcaGov?.requiredLevel} (expected: very_high)`);
console.log(`  PASS: ${withFcaGov?.requiredLevel === "very_high" ? "✓" : "✗ FAIL"}`);
console.log(`  Escalation reason: ${withFcaGov?.escalationReason}`);

// Test: FCA with low-governance portfolio → should be +1 from medium (or low), NOT hard-set to very_high
const lowGovPortfolio = lowDataIds.slice(0, 2); // low-sensitivity portfolio
const lowGovFcaResult = computeRequiredLevels(lowGovPortfolio, { fcaSysc19: true });
const lowGovFcaGov = lowGovFcaResult.find(r => r.dimension === "governance");
console.log(`\nLow-gov portfolio + FCA → governance: ${lowGovFcaGov?.requiredLevel}`);
console.log(`  (Should NOT be very_high if base governance is low — FCA is +1, not hard-set)`);
console.log(`  Base before FCA would be: ${computeRequiredLevels(lowGovPortfolio).find(r => r.dimension === "governance")?.requiredLevel}`);

// Test: already very_high governance + FCA → stays very_high (capped)
if (highGovIds.length >= 3) {
  const threeGovIds = highGovIds.slice(0, 3);
  const alreadyVhResult = computeRequiredLevels(threeGovIds, { fcaSysc19: true });
  const alreadyVhGov = alreadyVhResult.find(r => r.dimension === "governance");
  console.log(`\n3 high-gov (already very_high) + FCA → governance: ${alreadyVhGov?.requiredLevel} (expected: very_high, capped)`);
  console.log(`  PASS: ${alreadyVhGov?.requiredLevel === "very_high" ? "✓" : "✗ FAIL"}`);
}

console.log("\n=== A3: Current-level seeding ===");

// Maya: rewardFunctionMaturityRating=3, aiMaturityInRewardToday=2
const mayaSeeded = seedCurrentLevelsFromMaturity(3, 2);
console.log("Maya seeded levels (maturity=3, AI maturity=2):");
for (const dim of CAPABILITY_DIMENSIONS) {
  console.log(`  ${dim}: ${mayaSeeded[dim].level} (provisional: ${mayaSeeded[dim].isProvisional})`);
}

// Low maturity org
const lowSeeded = seedCurrentLevelsFromMaturity(1, 1);
console.log("\nLow maturity seeded levels (maturity=1, AI maturity=1):");
for (const dim of CAPABILITY_DIMENSIONS) {
  console.log(`  ${dim}: ${lowSeeded[dim].level}`);
}

// High maturity org
const highSeeded = seedCurrentLevelsFromMaturity(4, 4);
console.log("\nHigh maturity seeded levels (maturity=4, AI maturity=4):");
for (const dim of CAPABILITY_DIMENSIONS) {
  console.log(`  ${dim}: ${highSeeded[dim].level}`);
}

// Null inputs
const nullSeeded = seedCurrentLevelsFromMaturity(null, null);
console.log("\nNull inputs seeded levels:");
for (const dim of CAPABILITY_DIMENSIONS) {
  console.log(`  ${dim}: ${nullSeeded[dim].level} (expected: low)`);
}

console.log("\n=== A4: Gap thresholds ===");
const gapTests: Array<[CapabilityLevel, CapabilityLevel, string]> = [
  ["very_high", "very_high", "no_gap"],
  ["very_high", "high", "minor_gap"],
  ["very_high", "medium", "significant_gap"],
  ["very_high", "low", "significant_gap"],
  ["high", "high", "no_gap"],
  ["high", "medium", "minor_gap"],
  ["high", "low", "significant_gap"],
  ["medium", "medium", "no_gap"],
  ["medium", "low", "minor_gap"],
  ["low", "low", "no_gap"],
];
for (const [req, cur, expected] of gapTests) {
  const result = deriveGapStatus(req, cur);
  const pass = result === expected;
  console.log(`  deriveGapStatus(${req}, ${cur}) = ${result} (expected: ${expected}) ${pass ? "✓" : "✗ FAIL"}`);
}

console.log("\n=== A5: Maya's portfolio reproduction ===");

// Maya's 8 initiatives (Financial Services, FCA regulated)
const mayaIds = [
  "comp_benchmarking_engine",
  "pay_equity_analytics",
  "variable_pay_optimizer",
  "pay_band_design",
  "total_reward_statements",
  "recognition_platform",
  "reward_comms_ai",
  "governance_compliance",
];

// Filter to only valid IDs
const validMayaIds = mayaIds.filter(id => REWARD_INITIATIVE_LIBRARY.find(i => i.id === id));
const invalidMayaIds = mayaIds.filter(id => !REWARD_INITIATIVE_LIBRARY.find(i => i.id === id));
if (invalidMayaIds.length > 0) {
  console.log(`  WARNING: Invalid IDs in Maya's portfolio: ${invalidMayaIds.join(", ")}`);
  console.log(`  Using all available IDs: ${validMayaIds.join(", ")}`);
}

// Use first 8 from library if Maya's IDs aren't found
const portfolioIds = validMayaIds.length >= 6 ? validMayaIds : REWARD_INITIATIVE_LIBRARY.slice(0, 8).map(i => i.id);
console.log(`\nPortfolio: ${portfolioIds.join(", ")}`);

const mayaRequirements = computeRequiredLevels(portfolioIds, { fcaSysc19: true });
const mayaCurrentLevels = seedCurrentLevelsFromMaturity(3, 2);

console.log("\nMaya's dimension results (FCA=true, maturity=3, AI maturity=2):");
for (const req of mayaRequirements) {
  const current = mayaCurrentLevels[req.dimension].level;
  const gap = deriveGapStatus(req.requiredLevel, current);
  const gapNum = Math.max(0, LEVEL_ORDER[req.requiredLevel] - LEVEL_ORDER[current]);
  console.log(`  ${req.dimension}: required=${req.requiredLevel}, current=${current}, gap=${gapNum}, status=${gap}${req.escalated ? ` [ESCALATED: ${req.escalationReason}]` : ""}`);
}

// ── B-block: Calibration audit ────────────────────────────────────────────────

console.log("\n\n=== B-block: Calibration across 3 portfolios ===");

function runPortfolio(label: string, ids: string[], fcaSysc19: boolean, maturity: number, aiMaturity: number) {
  const reqs = computeRequiredLevels(ids, { fcaSysc19 });
  const current = seedCurrentLevelsFromMaturity(maturity, aiMaturity);
  const assessments = reqs.map(r => ({
    dimension: r.dimension,
    gapStatus: deriveGapStatus(r.requiredLevel, current[r.dimension].level),
    requiredLevel: r.requiredLevel,
  }));
  const cost = computeEnablementCost(assessments);
  
  console.log(`\n--- ${label} (${ids.length} initiatives, FCA=${fcaSysc19}, maturity=${maturity}/${aiMaturity}) ---`);
  let reds = 0, ambers = 0, greens = 0;
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
  console.log(`  Distribution: ${reds} RED, ${ambers} AMBER, ${greens} GREEN`);
  console.log(`  Enablement cost: £${cost.low.toLocaleString()} – £${cost.high.toLocaleString()}`);
  return { reds, ambers, greens };
}

// B1 — Demanding portfolio: 8+ initiatives, high data/change
const demandingIds = REWARD_INITIATIVE_LIBRARY.slice(0, 8).map(i => i.id);
const demandingResult = runPortfolio("DEMANDING (8 initiatives, FCA, low maturity)", demandingIds, true, 2, 2);

// B1 — Modest portfolio: 3-4 Foundation initiatives
const modestIds = REWARD_INITIATIVE_LIBRARY.slice(0, 3).map(i => i.id);
const modestResult = runPortfolio("MODEST (3 initiatives, no FCA, medium maturity)", modestIds, false, 3, 3);

// B1 — Mid portfolio: 5-6 mixed
const midIds = REWARD_INITIATIVE_LIBRARY.slice(0, 5).map(i => i.id);
const midResult = runPortfolio("MID (5 initiatives, no FCA, medium maturity)", midIds, false, 3, 2);

console.log("\n=== B-block calibration summary ===");
console.log(`Demanding: ${demandingResult.reds} RED, ${demandingResult.ambers} AMBER, ${demandingResult.greens} GREEN`);
console.log(`Modest:    ${modestResult.reds} RED, ${modestResult.ambers} AMBER, ${modestResult.greens} GREEN`);
console.log(`Mid:       ${midResult.reds} RED, ${midResult.ambers} AMBER, ${midResult.greens} GREEN`);

if (modestResult.reds >= 3) {
  console.log("  ⚠ CALIBRATION ISSUE: Modest portfolio has multiple reds → assessment may be alarmist");
} else {
  console.log("  ✓ Modest portfolio distribution looks realistic");
}

// ── B2: Spot-check high-data initiatives ─────────────────────────────────────

console.log("\n=== B2: Spot-check capabilityProfile ratings ===");
const spotCheckIds = [
  "comp_benchmarking_engine",
  "pay_equity_analytics",
  "market_data_intelligence",
  "pay_band_design",
  "total_reward_statements",
  "recognition_platform",
];
for (const id of spotCheckIds) {
  const init = REWARD_INITIATIVE_LIBRARY.find(i => i.id === id);
  if (!init) {
    console.log(`  ${id}: NOT FOUND in library`);
    continue;
  }
  const cp = init.capabilityProfile;
  console.log(`  ${id} (${init.title.slice(0,40)}): data=${cp.dataIntensity}, change=${cp.changeImpact}, integration=${cp.integrationNeed}, governance=${cp.governanceSensitivity}`);
}

// Show all 30 initiatives with their profiles
console.log("\n=== All 30 initiatives — capabilityProfile ratings ===");
for (const i of REWARD_INITIATIVE_LIBRARY) {
  const cp = i.capabilityProfile;
  const highCount = [cp.dataIntensity, cp.changeImpact, cp.integrationNeed, cp.governanceSensitivity].filter(v => v === "high").length;
  console.log(`  ${i.id.padEnd(35)} data=${cp.dataIntensity.padEnd(7)} change=${cp.changeImpact.padEnd(7)} int=${cp.integrationNeed.padEnd(7)} gov=${cp.governanceSensitivity.padEnd(7)} [${highCount} high]`);
}

// Count how many initiatives have each rating
const allHighCounts: Record<string, number> = { data: 0, change: 0, integration: 0, governance: 0 };
for (const i of REWARD_INITIATIVE_LIBRARY) {
  const cp = i.capabilityProfile;
  if (cp.dataIntensity === "high") allHighCounts.data++;
  if (cp.changeImpact === "high") allHighCounts.change++;
  if (cp.integrationNeed === "high") allHighCounts.integration++;
  if (cp.governanceSensitivity === "high") allHighCounts.governance++;
}
console.log(`\nTotal high ratings across library: data=${allHighCounts.data}, change=${allHighCounts.change}, integration=${allHighCounts.integration}, governance=${allHighCounts.governance}`);
console.log(`Library size: ${REWARD_INITIATIVE_LIBRARY.length}`);

// ── D-block: Sequencing flags ─────────────────────────────────────────────────

console.log("\n=== D1: Sequencing flags — gap-tied check ===");

// Green portfolio (high maturity, small portfolio)
const greenPortfolioIds = REWARD_INITIATIVE_LIBRARY.slice(0, 3).map(i => i.id);
const greenReqs = computeRequiredLevels(greenPortfolioIds);
const greenCurrent = seedCurrentLevelsFromMaturity(4, 4);
const greenAssessments = greenReqs.map(r => ({
  dimension: r.dimension,
  gapStatus: deriveGapStatus(r.requiredLevel, greenCurrent[r.dimension].level),
}));
const greenFlags = deriveSequencingFlags(greenPortfolioIds, greenAssessments);
console.log("\nGreen portfolio (high maturity, 3 initiatives):");
for (const f of greenFlags) {
  console.log(`  ${f.initiativeId}: ${f.status}${f.reason ? ` — ${f.reason}` : ""}`);
}
const greenBlocked = greenFlags.filter(f => f.status === "blocked" || f.status === "needs_enablement").length;
if (greenBlocked > 0) {
  console.log(`  ⚠ D1 ISSUE: ${greenBlocked} flags on green portfolio — flags not gap-tied!`);
} else {
  console.log("  ✓ No flags on green portfolio (gap-tied confirmed)");
}

// Red portfolio (low maturity, demanding)
const redPortfolioIds = demandingIds;
const redReqs = computeRequiredLevels(redPortfolioIds, { fcaSysc19: true });
const redCurrent = seedCurrentLevelsFromMaturity(2, 1);
const redAssessments = redReqs.map(r => ({
  dimension: r.dimension,
  gapStatus: deriveGapStatus(r.requiredLevel, redCurrent[r.dimension].level),
}));
const redFlags = deriveSequencingFlags(redPortfolioIds, redAssessments);
console.log("\nRed portfolio (low maturity, 8 initiatives, FCA):");
for (const f of redFlags) {
  console.log(`  ${f.initiativeId}: ${f.status}${f.reason ? ` — ${f.reason.slice(0,80)}` : ""}`);
}

// ── C3: Enablement cost check ─────────────────────────────────────────────────

console.log("\n=== C3: Enablement cost — additional to business case ===");
const mayaAssessments = mayaRequirements.map(r => ({
  dimension: r.dimension,
  gapStatus: deriveGapStatus(r.requiredLevel, mayaCurrentLevels[r.dimension].level),
  requiredLevel: r.requiredLevel,
}));
const mayaCost = computeEnablementCost(mayaAssessments);
console.log(`Maya enablement cost: £${mayaCost.low.toLocaleString()} – £${mayaCost.high.toLocaleString()}`);
console.log(`Note: ${mayaCost.note}`);
console.log("(This is ADDITIONAL to the £7.15M business case TCO — verify in UI that it's clearly labelled as such)");

// ── G4: Vacuous test check ────────────────────────────────────────────────────

console.log("\n=== G4: Vacuous test check ===");
// Verify the test file has real escalation assertions
console.log("Checking test file for escalation assertions...");

import { readFileSync } from "fs";
const testContent = readFileSync("./server/rewardCapabilityAssessment.test.ts", "utf8");
const hasEscalationTest = testContent.includes("very_high") && testContent.includes("≥3 threshold");
const hasFcaTest = testContent.includes("FCA SYSC 19 regulatory requirement");
const hasSeedTest = testContent.includes("seedCurrentLevelsFromMaturity");
console.log(`  Escalation test (≥3 → very_high): ${hasEscalationTest ? "✓ present" : "✗ MISSING"}`);
console.log(`  FCA test: ${hasFcaTest ? "✓ present" : "✗ MISSING"}`);
console.log(`  Seed test: ${hasSeedTest ? "✓ present" : "✗ MISSING"}`);

// ── H1: Cross-scenario ────────────────────────────────────────────────────────

console.log("\n=== H1: Cross-scenario — different org, different readiness ===");
const h1Ids = REWARD_INITIATIVE_LIBRARY.slice(0, 6).map(i => i.id);
const retailResult = computeRequiredLevels(h1Ids);
const retailCurrent = seedCurrentLevelsFromMaturity(2, 1); // Low maturity retail
const techCurrent = seedCurrentLevelsFromMaturity(4, 4); // High maturity tech

console.log("\nSame 6-initiative portfolio:");
console.log("Retail (low maturity 2/1) vs Tech (high maturity 4/4):");
for (const r of retailResult) {
  const retailGap = deriveGapStatus(r.requiredLevel, retailCurrent[r.dimension].level);
  const techGap = deriveGapStatus(r.requiredLevel, techCurrent[r.dimension].level);
  const retailStatus = retailGap === "significant_gap" ? "RED" : retailGap === "minor_gap" ? "AMBER" : "GREEN";
  const techStatus = techGap === "significant_gap" ? "RED" : techGap === "minor_gap" ? "AMBER" : "GREEN";
  console.log(`  ${r.dimension}: retail=${retailStatus}, tech=${techStatus}`);
}

console.log("\n=== QA DIAGNOSTIC COMPLETE ===");
