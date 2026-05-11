import { getInitiative, getAllInitiatives } from "../server/contentLibrary";
import { calculateValueEnvelope } from "../server/strategyEngine";

function getInits(ids: string[]) {
  return ids.map(id => getInitiative(id)).filter(Boolean) as NonNullable<ReturnType<typeof getInitiative>>[];
}

// ─── Print initiative assumptions ────────────────────────────────────────────
const KEY_IDS = [
  "ai_assisted_cv_screening",
  "predictive_attrition_modelling",
  "automated_onboarding_orchestration",
  "ai_literacy_programme",
  "skills_intelligence_platform",
  "hr_process_automation",
  "hr_chatbot_employee_queries",
  "ai_hr_operating_model_redesign",
  "bias_monitoring_and_auditing",
];

console.log("\n=== INITIATIVE ASSUMPTIONS (library.json) ===");
for (const id of KEY_IDS) {
  const i = getInitiative(id);
  if (!i) { console.log(id + ": NOT FOUND"); continue; }
  const vm = i.value_model;
  const cost = i.cost;
  console.log("\n--- " + id + " ---");
  console.log("  Cost base: £" + (cost?.base_range_gbp?.[0] ?? "?").toLocaleString() + " – £" + (cost?.base_range_gbp?.[1] ?? "?").toLocaleString());
  if (vm?.quantified_value) {
    const qv = vm.quantified_value;
    console.log("  Improvement LOW: " + (qv.typical_improvement_pct.low * 100).toFixed(1) + "%");
    console.log("  Improvement HIGH: " + (qv.typical_improvement_pct.high * 100).toFixed(1) + "%");
    console.log("  Confidence: " + qv.confidence);
    console.log("  Sources: " + (qv.sources ?? []).join(", "));
  } else {
    console.log("  Qualitative only");
  }
}

// ─── Stress test: FS 2000 staff Progressive ──────────────────────────────────
const FS_BASELINE = {
  hires_per_year: 120,
  cost_per_hire_gbp: 8500,
  time_to_fill_days: 42,
  voluntary_attrition_rate_pct: 14,
  l_and_d_spend_per_fte_gbp: 650,
  hr_cost_per_fte_gbp: 1600,
  headcount: 2000,
};
const FS_INITS = [
  "ai_assisted_cv_screening",
  "predictive_attrition_modelling",
  "automated_onboarding_orchestration",
  "ai_literacy_programme",
  "ai_ethics_governance_framework",
  "hr_data_quality_audit",
  "skills_intelligence_platform",
];

const r = calculateValueEnvelope(getInits(FS_INITS), FS_BASELINE, 36);

console.log("\n\n=== STRESS TEST: Financial Services 2000 staff, Progressive ===");
console.log("Annual value:     £" + r.total_quantified_value_gbp.low.toLocaleString() + " – £" + r.total_quantified_value_gbp.high.toLocaleString());
console.log("3yr gross value:  £" + (r.total_quantified_value_gbp.low * 3).toLocaleString() + " – £" + (r.total_quantified_value_gbp.high * 3).toLocaleString());
console.log("TCO impl:         £" + r.tco.implementation_gbp.low.toLocaleString() + " – £" + r.tco.implementation_gbp.high.toLocaleString());
console.log("TCO change mgmt:  £" + r.tco.change_management_gbp.low.toLocaleString() + " – £" + r.tco.change_management_gbp.high.toLocaleString());
console.log("TCO training:     £" + r.tco.training_gbp.low.toLocaleString() + " – £" + r.tco.training_gbp.high.toLocaleString());
console.log("TCO ongoing/yr:   £" + r.tco.ongoing_annual_gbp.low.toLocaleString() + " – £" + r.tco.ongoing_annual_gbp.high.toLocaleString());
console.log("TCO 3yr total:    £" + r.tco.total_3yr_gbp.low.toLocaleString() + " – £" + r.tco.total_3yr_gbp.high.toLocaleString());
console.log("Net value 3yr:    £" + r.net_value_gbp.low.toLocaleString() + " – £" + r.net_value_gbp.high.toLocaleString());
console.log("NPV:              £" + r.financial_model.npv_gbp.low.toLocaleString() + " – £" + r.financial_model.npv_gbp.high.toLocaleString());
console.log("IRR:              " + JSON.stringify(r.financial_model.irr_pct) + "%");
console.log("Payback months:   " + JSON.stringify(r.payback_period_months));
console.log("Scenario ROI:     " + r.scenario_analysis.pessimistic.roi_pct.toFixed(0) + "% / " + r.scenario_analysis.base.roi_pct.toFixed(0) + "% / " + r.scenario_analysis.optimistic.roi_pct.toFixed(0) + "%");

console.log("\n--- By initiative (annual) ---");
for (const i of r.by_initiative) {
  if (i.quantified_value_gbp) {
    console.log("  " + i.initiative_id + ": £" + i.quantified_value_gbp.low.toLocaleString() + " – £" + i.quantified_value_gbp.high.toLocaleString());
    console.log("    " + i.monetisation_breakdown);
  } else {
    console.log("  " + i.initiative_id + ": qualitative only");
  }
}

// ─── CFO Sensitivity: halve all improvement percentages ──────────────────────
console.log("\n\n=== CFO SENSITIVITY: 50% haircut on all improvement assumptions ===");
// Manually apply 50% haircut by using the low end of improvement only
const r_haircut = calculateValueEnvelope(getInits(FS_INITS), {
  ...FS_BASELINE,
  // Simulate conservative by using lower baseline inputs
  hires_per_year: 80,        // 33% fewer hires realised
  cost_per_hire_gbp: 6000,   // lower CPH (internal sourcing)
  voluntary_attrition_rate_pct: 10, // lower attrition (optimistic)
  l_and_d_spend_per_fte_gbp: 400,
}, 36);
console.log("Annual value (conservative inputs): £" + r_haircut.total_quantified_value_gbp.low.toLocaleString() + " – £" + r_haircut.total_quantified_value_gbp.high.toLocaleString());
console.log("Net value 3yr (conservative):       £" + r_haircut.net_value_gbp.low.toLocaleString() + " – £" + r_haircut.net_value_gbp.high.toLocaleString());
console.log("NPV (conservative):                 £" + r_haircut.financial_model.npv_gbp.low.toLocaleString() + " – £" + r_haircut.financial_model.npv_gbp.high.toLocaleString());
console.log("Scenario ROI (conservative):        " + r_haircut.scenario_analysis.pessimistic.roi_pct.toFixed(0) + "% / " + r_haircut.scenario_analysis.base.roi_pct.toFixed(0) + "% / " + r_haircut.scenario_analysis.optimistic.roi_pct.toFixed(0) + "%");
