import { INITIATIVE_LIBRARY } from "./shared/initiativeLibrary";
import { VALUE_FORMULA_REGISTRY } from "./shared/valueFormulas";

// Get all initiatives available in CPO mode (functionScope: "cpo" or "both" or undefined)
const cpoInitiatives = INITIATIVE_LIBRARY.filter(
  (i) => !i.functionScope || i.functionScope === "cpo" || i.functionScope === "both"
);

console.log(`Total CPO-mode initiatives: ${cpoInitiatives.length}`);
console.log(`Total value formulas registered: ${Object.keys(VALUE_FORMULA_REGISTRY).length}`);

const withFormula = cpoInitiatives.filter((i) => i.valueFormulaKey && VALUE_FORMULA_REGISTRY[i.valueFormulaKey as keyof typeof VALUE_FORMULA_REGISTRY]);
const qualitativeOnly = cpoInitiatives.filter((i) => !i.valueFormulaKey || !VALUE_FORMULA_REGISTRY[i.valueFormulaKey as keyof typeof VALUE_FORMULA_REGISTRY]);

console.log(`\nWith valueFormulaKey + registered formula: ${withFormula.length}`);
console.log(`Qualitative-only (no formula): ${qualitativeOnly.length}`);

console.log(`\nQualitative-only IDs (${qualitativeOnly.length}):`);
qualitativeOnly.forEach((i) => {
  console.log(`  ${i.id}  [functionScope: ${i.functionScope ?? "undefined"}]  valueFormulaKey: ${i.valueFormulaKey ?? "MISSING"}`);
});

console.log(`\nFirst 5 CPO-mode initiative IDs with formula (proof of live run):`);
withFormula.slice(0, 5).forEach((i) => {
  console.log(`  ${i.id}  formula: ${i.valueFormulaKey}`);
});
