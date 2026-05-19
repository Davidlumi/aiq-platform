import { VALUE_FORMULA_REGISTRY } from "../shared/valueFormulas";

const fn = VALUE_FORMULA_REGISTRY["hr_virtual_assistant"];
if (!fn) {
  console.log("NOT IN REGISTRY");
  process.exit(1);
}

const inputs = {
  sectionA: { totalHeadcount: 2500, avgSalaryGbp: 45000 },
  sectionB: { hrFteCount: 25, hrBudgetGbp: 1200000 },
  sectionD: { monthlyHrQueryVolume: null },
  sectionI: { workforceComposition: "frontline_heavy" },
} as any;

const result = fn(inputs);
console.log("Result:", JSON.stringify(result, null, 2));

// Also check pay_equity_analysis
const fn2 = VALUE_FORMULA_REGISTRY["pm_pay_equity_analysis"];
if (fn2) {
  const r2 = fn2(inputs);
  console.log("pm_pay_equity_analysis:", JSON.stringify(r2, null, 2));
} else {
  console.log("pm_pay_equity_analysis: NOT IN REGISTRY");
}
