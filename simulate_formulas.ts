/**
 * Simulate all value formulas with Acme's data and report ROI ratios.
 * Run: npx tsx simulate_formulas.ts
 */
import { VALUE_FORMULA_REGISTRY } from "./shared/valueFormulas";

// Acme data: 20K headcount, 9K annual hires, £45K avg salary, 15% attrition, £400M revenue
const inputs = {
  sectionA: {
    companyName: "Acme Corp",
    totalHeadcount: 20000,
    annualRevenue: 400_000_000,
    industry: "Retail",
    geographySpread: "National",
    hrFteCount: 80,
    managerCount: 800,
    frontlineWorkerFraction: 0.45,
  },
  sectionB: {
    annualHireCount: 9000,
    timeToHireDays: 45,
    offerAcceptanceRate: 0.72,
    agencyUsageFraction: 0.20,
    agencyCostPerHire: 8000,
    internalRecruiterCount: 12,
    avgCostPerHire: 3500,
  },
  sectionC: {
    newHire90DayRetentionRate: 0.78,
    onboardingProgramLength: 30,
    managerOnboardingHoursPerHire: 8,
    buddyProgramExists: false,
  },
  sectionD: {
    annualLDSpend: 1_200_000,
    avgTrainingHoursPerEmployee: 12,
    elearningAdoptionRate: 0.55,
    attritionRate: 15,
    voluntaryAttritionRate: 12,
    annualLeavers: 3000,
    avgTenureYears: 4.2,
    monthlyHrQueryVolume: null,
  },
  sectionE: {
    performanceReviewCyclesPerYear: 2,
    managerFeedbackQualityScore: 3,
    okrAdoptionRate: 0.40,
    calibrationSessionsPerYear: 2,
  },
  sectionF: {
    employeeNpsScore: 28,
    engagementSurveyFrequency: "Annual",
    recognitionProgramExists: false,
    wellbeingInitiativesExists: false,
  },
  sectionG: {
    payEquityAuditFrequency: "Never",
    compensationBandingExists: false,
    bonusEligibleFraction: 0.35,
  },
  sectionH: {
    managerSpanOfControl: 8,
    managerDevelopmentProgramExists: false,
    succession_planning_coverage: 0.20,
  },
  sectionI: {
    aiMaturityLevel: "Exploring",
    hrTechStackModernity: "Legacy",
    dataQualityScore: 3,
    managerCapabilityForInsights: "Mixed",
    changeReadinessScore: 3,
  },
} as any;

// y1CostRange from shared initiativeLibrary (in £k)
const costRanges: Record<string, { low: number; high: number }> = {
  ta_high_volume_hiring: { low: 80, high: 250 },
  ta_candidate_chatbot: { low: 30, high: 100 },
  ta_interview_scheduling: { low: 20, high: 80 },
  ta_sourcing_matching: { low: 40, high: 150 },
  ta_video_interview_assessment: { low: 30, high: 120 },
  ta_bias_monitoring: { low: 25, high: 90 },
  ta_recruiter_productivity_ai: { low: 40, high: 150 },
  ta_offer_generation: { low: 15, high: 60 },
  ta_jd_optimization: { low: 15, high: 60 },
  on_personalised_journeys: { low: 60, high: 200 },
  on_new_hire_chatbot: { low: 25, high: 90 },
  on_documentation_automation: { low: 40, high: 150 },
  on_buddy_matching: { low: 20, high: 80 },
  ld_personalised_learning: { low: 60, high: 200 },
  ld_workforce_reskilling: { low: 80, high: 300 },
  ld_ai_coaching: { low: 50, high: 180 },
  ld_compliance_training: { low: 25, high: 90 },
  ld_content_creation: { low: 30, high: 100 },
  ld_knowledge_management: { low: 30, high: 100 },
  im_talent_marketplace: { low: 100, high: 350 },
  im_skills_inference: { low: 60, high: 200 },
  im_mentor_matching: { low: 30, high: 100 },
  pm_continuous_performance: { low: 40, high: 150 },
  pm_review_writing: { low: 20, high: 80 },
  pm_okr_goal_alignment: { low: 30, high: 100 },
  ee_sentiment_listening: { low: 30, high: 100 },
  ee_recognition_rewards: { low: 25, high: 90 },
  ee_wellbeing_burnout: { low: 30, high: 100 },
  ee_internal_comms_ai: { low: 25, high: 80 },
  rt_flight_risk_prediction: { low: 60, high: 200 },
  rt_stay_interview_ai: { low: 30, high: 100 },
  rt_exit_intelligence: { low: 20, high: 70 },
  hr_virtual_assistant: { low: 150, high: 500 },
  hr_policy_generation: { low: 20, high: 70 },
  hr_benefits_decision_support: { low: 30, high: 100 },
  wp_workforce_planning: { low: 80, high: 250 },
  wp_succession_planning: { low: 40, high: 150 },
  wp_org_design: { low: 60, high: 200 },
  wp_location_strategy: { low: 40, high: 150 },
  cr_pay_equity: { low: 30, high: 100 },
  cr_compensation_recommendations: { low: 40, high: 150 },
  mg_manager_copilot: { low: 50, high: 180 },
  mg_difficult_conversations: { low: 30, high: 100 },
  gv_ai_governance: { low: 40, high: 150 },
  gv_cross_cutting_bias_audit: { low: 30, high: 100 },
  fw_shift_scheduling_ai: { low: 60, high: 200 },
  fw_frontline_learning: { low: 50, high: 180 },
  fw_frontline_communication: { low: 30, high: 100 },
  fw_store_manager_assistant: { low: 40, high: 150 },
  wp_ai_capability_building: { low: 60, high: 200 },
  wp_ai_capability_advanced: { low: 100, high: 350 },
  ee_workforce_ai_comms: { low: 20, high: 70 },
};

type Row = {
  id: string;
  valueLowK: number;
  valueHighK: number;
  costLowK: number | string;
  costHighK: number | string;
  roi: string;
  flag: string;
};

const rows: Row[] = [];

for (const [id, fn] of Object.entries(VALUE_FORMULA_REGISTRY)) {
  try {
    const result = fn(inputs);
    const cr = costRanges[id];
    const costMidGbp = cr ? ((cr.low + cr.high) / 2) * 1000 : null;
    const valueMidGbp = (result.low + result.high) / 2;
    const roi = costMidGbp ? (valueMidGbp / costMidGbp).toFixed(1) : "N/A";
    let flag = "";
    if (costMidGbp) {
      if (valueMidGbp > costMidGbp * 10) flag = "*** NEEDS CAP";
      else if (valueMidGbp < costMidGbp) flag = "! VALUE < COST";
    }
    rows.push({
      id,
      valueLowK: Math.round(result.low / 1000),
      valueHighK: Math.round(result.high / 1000),
      costLowK: cr?.low ?? "?",
      costHighK: cr?.high ?? "?",
      roi,
      flag,
    });
  } catch (e) {
    rows.push({ id, valueLowK: 0, valueHighK: 0, costLowK: "?", costHighK: "?", roi: "ERR", flag: String(e).slice(0, 60) });
  }
}

// Sort by ROI descending (put ERR at bottom)
rows.sort((a, b) => {
  const ra = parseFloat(a.roi) || 0;
  const rb = parseFloat(b.roi) || 0;
  return rb - ra;
});

// Print table
const header = ["Initiative ID", "Value Low (£k)", "Value High (£k)", "Cost Low (£k)", "Cost High (£k)", "ROI (mid)", "Status"];
const colWidths = [38, 15, 16, 14, 15, 10, 20];

function pad(s: string, n: number) { return s.slice(0, n).padEnd(n); }

console.log(header.map((h, i) => pad(h, colWidths[i])).join(" | "));
console.log(colWidths.map(n => "-".repeat(n)).join("-+-"));

for (const r of rows) {
  const cells = [
    r.id,
    String(r.valueLowK),
    String(r.valueHighK),
    String(r.costLowK),
    String(r.costHighK),
    r.roi,
    r.flag,
  ];
  console.log(cells.map((c, i) => pad(c, colWidths[i])).join(" | "));
}

// Summary
const needsCap = rows.filter(r => r.flag === "*** NEEDS CAP");
const valueBelowCost = rows.filter(r => r.flag === "! VALUE < COST");
console.log(`\nNeeds cap (ROI > 10x): ${needsCap.length}`);
needsCap.forEach(r => console.log(`  - ${r.id}: ${r.roi}x`));
console.log(`Value < cost: ${valueBelowCost.length}`);
valueBelowCost.forEach(r => console.log(`  - ${r.id}: ROI ${r.roi}x`));
