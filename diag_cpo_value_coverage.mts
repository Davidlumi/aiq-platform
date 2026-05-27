/**
 * Diagnostic: which CPO initiatives have quantified value formulas wired?
 * Run: npx tsx diag_cpo_value_coverage.mts
 */
import { INITIATIVE_LIBRARY } from "./shared/initiativeLibrary.js";
import { evaluateInitiative } from "./server/services/fitImpactEngine.js";
import type { FitImpactEngineInputs } from "./server/services/fitImpactEngine.js";
import type { SectionAInputs, SectionCInputs, SectionDInputs, SectionIInputs } from "./shared/valueFormulas.js";

// Use a generous profile so hard gates don't block
const sectionA: SectionAInputs = { totalHeadcount: 12_000, sector: "healthcare" };
const sectionC: SectionCInputs = { dataQualityRating: "good", workforceDigitalAccess: "high" };
const sectionD: SectionDInputs = {
  annualHires: 1_800,
  attritionRate: 18,
  annualLDSpend: 5_400_000,
  costPerExternalHire: 3_800,
  avgTimeToFill: 42,
  annualRevenue: 680_000_000,
  annualApplicationVolume: 30_000,
  monthlyHrQueryVolume: 2_000,
  totalHrBudget: 8_000_000,
};
const sectionI: SectionIInputs = {};
const inputs: FitImpactEngineInputs = { sectionA, sectionC, sectionD, sectionI };

const cpoInits = INITIATIVE_LIBRARY.filter(
  i => i.functionScope === "cpo" || i.functionScope === "both" || !i.functionScope
);

let quantifiedCount = 0;
let qualOnlyCount = 0;
let notApplicableCount = 0;

for (const init of cpoInits) {
  const result = evaluateInitiative(init.id, inputs);
  const hasValue = result.valueRange !== null;
  const status = result.fitStatus;
  if (hasValue) quantifiedCount++;
  else if (status === "NOT_APPLICABLE") notApplicableCount++;
  else qualOnlyCount++;

  console.log(
    `${hasValue ? "✓" : status === "NOT_APPLICABLE" ? "✗" : "○"} ${init.id.padEnd(40)} ` +
    `status=${status.padEnd(20)} ` +
    (hasValue ? `value=${JSON.stringify(result.valueRange)}` : "no value formula")
  );
}

console.log(`\n--- Summary ---`);
console.log(`Quantified: ${quantifiedCount}`);
console.log(`Qualitative only: ${qualOnlyCount}`);
console.log(`NOT_APPLICABLE (hard gate fail): ${notApplicableCount}`);
