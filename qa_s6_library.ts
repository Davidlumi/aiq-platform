import { REWARD_INITIATIVE_LIBRARY } from "./shared/rewardInitiativeLibrary";

const VOCAB_BLACKLIST = [
  "leverage", "synergy", "paradigm", "holistic", "ecosystem", "robust",
  "scalable", "best-in-class", "world-class", "cutting-edge", "game-changer",
  "transformational", "impactful", "seamless", "empower", "unlock potential",
  "drive value", "move the needle", "boil the ocean",
];

const issues: string[] = [];
let total = 0;

for (const init of REWARD_INITIATIVE_LIBRARY) {
  const measures = init.suggestedMeasures ?? [];
  if (measures.length === 0) {
    issues.push(`NO MEASURES: ${init.id}`);
    continue;
  }
  if (measures.length < 2) {
    issues.push(`TOO FEW MEASURES (<2): ${init.id} has ${measures.length}`);
  }
  if (measures.length > 3) {
    issues.push(`EXCEEDS SOFT CAP (>3): ${init.id} has ${measures.length}`);
  }
  for (const m of measures) {
    total++;
    // A1: No fabricated baselines — library must never use 'known'
    if (m.defaultBaselineType === "known") {
      issues.push(`A1 FABRICATED BASELINE: ${init.id} | "${m.name}" | type=known`);
    }
    // A3: External refs must have sourceNote
    if (m.defaultBaselineType === "external_reference" && !m.externalReferenceNote) {
      issues.push(`A3 MISSING SOURCE NOTE: ${init.id} | "${m.name}"`);
    }
    // I2: Vocabulary blacklist
    const text = [m.name, m.suggestedTarget, m.howMeasured, m.externalReferenceNote]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    for (const word of VOCAB_BLACKLIST) {
      if (text.includes(word.toLowerCase())) {
        issues.push(`I2 VOCAB: ${init.id} | "${m.name}" | word="${word}"`);
      }
    }
    // B1: Must have name and suggestedTarget
    if (!m.name) issues.push(`B1 NO NAME: ${init.id}`);
    if (!m.suggestedTarget) issues.push(`B1 NO TARGET: ${init.id} | "${m.name}"`);
    // B4: valueLink must be coherent
    const VALID_LINKS = ["efficiency", "decision_quality", "risk_mitigation", "retention", "strategic"];
    if (m.valueLink && !VALID_LINKS.includes(m.valueLink)) {
      issues.push(`B4 INVALID VALUE_LINK: ${init.id} | "${m.name}" | link="${m.valueLink}"`);
    }
  }
}

console.log(`\n=== Stage 6 Library Audit ===`);
console.log(`Audited ${total} measures across ${REWARD_INITIATIVE_LIBRARY.length} initiatives\n`);

if (issues.length === 0) {
  console.log("✅ PASS: No issues found");
} else {
  console.log(`❌ FAIL: ${issues.length} issues:`);
  for (const i of issues) console.log(` - ${i}`);
}

// Print all external_reference measures with their source notes for manual review
console.log("\n=== External Reference Measures (for manual A3 review) ===");
for (const init of REWARD_INITIATIVE_LIBRARY) {
  for (const m of init.suggestedMeasures ?? []) {
    if (m.defaultBaselineType === "external_reference") {
      console.log(`  ${init.id} | "${m.name}" | note: "${m.externalReferenceNote}"`);
    }
  }
}

// Print first measure per initiative for B4 spot-check
console.log("\n=== Per-Initiative First Measure (B4 spot-check) ===");
const MAYA_IDS = [
  "ai_compensation_recommendation_engine",
  "ai_merit_cycle_orchestration",
  "ai_pay_equity_monitoring",
  "ai_pay_gap_reporting",
  "ai_pay_band_design",
  "ai_reward_operations_assistant",
  "ai_bonus_pool_optimisation",
  "ai_sales_compensation_plan_design",
];
for (const id of MAYA_IDS) {
  const init = REWARD_INITIATIVE_LIBRARY.find(i => i.id === id);
  if (!init) { console.log(`  ${id}: NOT FOUND`); continue; }
  const m = init.suggestedMeasures?.[0];
  if (!m) { console.log(`  ${id}: NO MEASURES`); continue; }
  console.log(`  ${id}`);
  console.log(`    Measure: "${m.name}"`);
  console.log(`    Target: "${m.suggestedTarget}"`);
  console.log(`    Baseline: ${m.defaultBaselineType}${m.externalReferenceNote ? ` (${m.externalReferenceNote})` : ""}`);
  console.log(`    ValueLink: ${m.valueLink ?? "none"}`);
}
