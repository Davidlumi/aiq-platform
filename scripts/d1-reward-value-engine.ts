/**
 * D1 — Reward Value Engine Verification for DFS Pilot
 * Run: npx tsx scripts/d1-reward-value-engine.ts
 *
 * DFS profile: retail, 11,000 headcount, £320m payroll, £2.1bn revenue
 */
import { REWARD_INITIATIVE_LIBRARY } from "../shared/rewardInitiativeLibrary";
import {
  computeBusinessCase,
  buildNarrativePromptData,
  type BusinessCaseModel,
  type Scenario,
} from "../server/services/rewardBusinessCaseEngine";

const inputs = {
  sector: "retail" as const,
  totalEmployeeHeadcount: 11_000,
  totalPayrollGbp: 320_000_000,
};

const annualRevenueGbp = 2_100_000_000;
const companyName = "DFS Furniture plc";

const flagshipIds = [
  "ai_compensation_recommendation_engine",
  "ai_driven_merit_cycle_orchestration",
  "ai_pay_equity_continuous_monitoring",
  "ai_multi_characteristic_pay_gap_reporting",
  "ai_pay_band_design",
  "ai_reward_operations_assistant",
  "ai_bonus_pool_optimisation",
  "ai_sales_compensation_plan_design",
];

const gbp = (n: number) =>
  n >= 1_000_000
    ? `£${(n / 1_000_000).toFixed(1)}m`
    : `£${Math.round(n / 1_000).toLocaleString()}k`;

// Verify all IDs exist
const found = flagshipIds.filter((id) =>
  REWARD_INITIATIVE_LIBRARY.find((i) => i.id === id)
);
const missing = flagshipIds.filter(
  (id) => !REWARD_INITIATIVE_LIBRARY.find((i) => i.id === id)
);

console.log("=== D1: DFS REWARD VALUE ENGINE ===");
console.log(`Company: ${companyName}`);
console.log(
  `Sector: ${inputs.sector} | Headcount: ${inputs.totalEmployeeHeadcount.toLocaleString()} | Payroll: ${gbp(inputs.totalPayrollGbp)} | Revenue: ${gbp(annualRevenueGbp)}`
);
console.log(`Initiatives: ${found.length}/8 found${missing.length ? " | MISSING: " + missing.join(", ") : ""}`);

// Run the engine
const model: BusinessCaseModel = computeBusinessCase(
  flagshipIds,
  inputs,
  {}, // no cost/value overrides
  {
    changeManagement: { includedInTco: true },
    training: { includedInTco: true },
    hrFteUplift: { includedInTco: false },
  }
);

if (model.unknownIds.length) {
  console.log("⚠ UNKNOWN IDs (not found in library):", model.unknownIds);
}

const recommendedScenario: Scenario = "central";

// Per-initiative breakdown
console.log("\n--- PER-INITIATIVE BREAKDOWN (central scenario) ---");
const header = `${"Initiative".padEnd(50)} ${"Gross 3yr".padStart(10)} ${"Net 3yr".padStart(10)} ${"TCO 3yr".padStart(10)} ${"ROI".padStart(6)} ${"V/C".padStart(5)}`;
console.log(header);
console.log("-".repeat(header.length));

model.lines.forEach((line) => {
  const gross = line.value3yrCentral;
  const tco = line.tco3yrCentral;
  const net = gross - tco;
  const vc = tco > 0 ? (gross / tco).toFixed(1) + "x" : "n/a";
  const roi = tco > 0 ? Math.round(((net) / tco) * 100) + "%" : "n/a";
  console.log(
    `${line.title.substring(0, 49).padEnd(50)} ${gbp(gross).padStart(10)} ${gbp(net).padStart(10)} ${gbp(tco).padStart(10)} ${roi.padStart(6)} ${vc.padStart(5)}`
  );
});

// Portfolio rollup
console.log("\n--- PORTFOLIO ROLLUP ---");
const rHeader = `${"Scenario".padEnd(14)} ${"Gross 3yr".padStart(10)} ${"Overlap".padStart(8)} ${"Net 3yr".padStart(10)} ${"TCO 3yr".padStart(10)} ${"Net Benefit".padStart(12)} ${"Payback".padStart(8)} ${"ROI".padStart(6)}`;
console.log(rHeader);
console.log("-".repeat(rHeader.length));

(["conservative", "central", "optimistic"] as const).forEach((s) => {
  const r = model.rollup[s];
  const roi = r.roi3yr != null ? Math.round(r.roi3yr * 100) + "%" : "n/a";
  const pb = r.paybackMonths != null ? r.paybackMonths + "mo" : ">36mo";
  console.log(
    `${s.padEnd(14)} ${gbp(r.grossValue3yr).padStart(10)} ${gbp(r.overlapDiscountTotal).padStart(8)} ${gbp(r.netValue3yr).padStart(10)} ${gbp(r.tco3yr).padStart(10)} ${gbp(r.netBenefit3yr).padStart(12)} ${pb.padStart(8)} ${roi.padStart(6)}`
  );
});

// Narrative summary
const narrative = buildNarrativePromptData(
  model,
  companyName,
  "Build a data-led, AI-augmented reward function that delivers fair, competitive, and transparent pay across DFS's 11,000-person workforce.",
  [
    { title: "From manual pay benchmarking to AI-driven market intelligence" },
    { title: "From annual merit cycles to continuous pay equity monitoring" },
    { title: "From opaque pay decisions to explainable, auditable reward" },
  ],
  ["Pay equity at source", "Transparency by design", "Data-led decisions"],
  recommendedScenario,
  annualRevenueGbp
) as Record<string, unknown>;

console.log("\n--- SUMMARY (scenario: " + recommendedScenario + ") ---");
console.log(JSON.stringify(narrative.financials, null, 2));
if (narrative.investmentAsRevenuePercent) {
  console.log("Investment as % of revenue:", narrative.investmentAsRevenuePercent);
}

// Overlap discounts
if (model.overlapDiscounts.length > 0) {
  console.log("\n--- OVERLAP DISCOUNTS ---");
  model.overlapDiscounts.forEach((d) => {
    const amt = d.discountAmountCentral;
    console.log(`  ${d.subDomain}: ${Math.round(d.discountPct * 100)}% discount = ${gbp(amt)} (${d.initiativeTitles.join(", ")})`);
  });
}

// Sanity checks
const central = model.rollup.central;
const netValuePerHead = central.netValue3yr / inputs.totalEmployeeHeadcount;
const tcoPerHead = central.tco3yr / inputs.totalEmployeeHeadcount;
const tcoAsPayrollPct = (central.tco3yr / inputs.totalPayrollGbp) * 100;

console.log("\n--- SANITY CHECKS (retail context) ---");
console.log(
  `Net value per head (central): ${gbp(netValuePerHead)} — ${netValuePerHead > 200 && netValuePerHead < 5000 ? "✓ plausible for UK retail" : "⚠ CHECK"}`
);
console.log(
  `TCO per head (central): ${gbp(tcoPerHead)} — ${tcoPerHead > 20 && tcoPerHead < 500 ? "✓ plausible" : "⚠ CHECK"}`
);
console.log(
  `TCO as % of payroll: ${tcoAsPayrollPct.toFixed(2)}% — ${tcoAsPayrollPct < 1 ? "✓ <1% of payroll (normal)" : "⚠ CHECK"}`
);
console.log(
  `Payback (central): ${central.paybackMonths != null ? central.paybackMonths + " months" : ">36 months"} — ${central.paybackMonths != null && central.paybackMonths <= 24 ? "✓ within 2yr" : central.paybackMonths != null && central.paybackMonths <= 36 ? "✓ within 3yr" : "⚠ beyond 3yr window"}`
);
console.log(
  `ROI (central): ${central.roi3yr != null ? Math.round(central.roi3yr * 100) + "%" : "n/a"} — ${central.roi3yr != null && central.roi3yr > 0.5 ? "✓ >50% ROI plausible for 8-initiative portfolio" : "⚠ CHECK"}`
);

process.exit(0);
