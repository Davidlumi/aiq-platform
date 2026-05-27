/**
 * dump-cpo-coverage2.ts
 * Dumps CPO formula coverage for ALL initiatives visible in CPO mode
 * (functionScope === "cpo" OR "both")
 */
import { INITIATIVE_LIBRARY } from "./shared/initiativeLibrary";
import { VALUE_FORMULA_REGISTRY } from "./shared/valueFormulas";

// CPO mode shows: functionScope === "cpo" OR "both"
const cpoInitiatives = INITIATIVE_LIBRARY.filter(i => 
  i.functionScope === "cpo" || i.functionScope === "both"
);
console.log(`\nTotal initiatives visible in CPO mode: ${cpoInitiatives.length}`);
console.log(`  (cpo-only: ${INITIATIVE_LIBRARY.filter(i => i.functionScope === "cpo").length})`);
console.log(`  (both:     ${INITIATIVE_LIBRARY.filter(i => i.functionScope === "both").length})`);

const withFormula: string[] = [];
const withFormulaKeyButMissing: string[] = [];
const qualitativeOnly: string[] = [];

for (const init of cpoInitiatives) {
  const key = (init as any).valueFormulaKey;
  if (!key) {
    qualitativeOnly.push(init.id);
  } else if (VALUE_FORMULA_REGISTRY[key]) {
    withFormula.push(`${init.id} → ${key}`);
  } else {
    withFormulaKeyButMissing.push(`${init.id} → ${key} [MISSING IN REGISTRY]`);
  }
}

console.log(`\n=== WITH FORMULA (${withFormula.length}) ===`);
withFormula.forEach(l => console.log(`  ${l}`));

console.log(`\n=== FORMULA KEY SET BUT MISSING IN REGISTRY (${withFormulaKeyButMissing.length}) ===`);
if (withFormulaKeyButMissing.length === 0) console.log("  (none)");
withFormulaKeyButMissing.forEach(l => console.log(`  ${l}`));

console.log(`\n=== QUALITATIVE ONLY / NO FORMULA KEY (${qualitativeOnly.length}) ===`);
qualitativeOnly.forEach(l => console.log(`  ${l}`));

console.log(`\n=== SUMMARY ===`);
console.log(`  Total CPO-mode initiatives: ${cpoInitiatives.length}`);
console.log(`  With real formula:           ${withFormula.length}`);
console.log(`  Key set but missing:         ${withFormulaKeyButMissing.length}`);
console.log(`  Qualitative only:            ${qualitativeOnly.length}`);
console.log(`  Formula coverage:            ${withFormula.length}/${cpoInitiatives.length} (${Math.round(withFormula.length/cpoInitiatives.length*100)}%)`);

const registryKeys = Object.keys(VALUE_FORMULA_REGISTRY);
console.log(`\n=== VALUE_FORMULA_REGISTRY ===`);
console.log(`  Total registered formulas: ${registryKeys.length}`);
console.log(`  Registry keys: ${registryKeys.join(", ")}`);
