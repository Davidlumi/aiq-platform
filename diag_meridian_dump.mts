/**
 * Meridian Health Group — CPO canonical fixture dump
 * Run: npx tsx diag_meridian_dump.mts
 *
 * Inputs are the exact fixture that will be locked in meridian-canonical.test.ts.
 * Paste this output verbatim in the report.
 */
import { computeCpoBusinessCase, type CpoCompanyProfile } from "./server/services/cpoBusinessCaseEngine.js";

// ── Exact fixture ─────────────────────────────────────────────────────────────
const MERIDIAN_PROFILE: CpoCompanyProfile = {
  totalHeadcount: 12_000,
  sector: "healthcare",
  hiresPerYear: 1_800,
  attritionRatePct: 18,
  lAndDSpendPerFteGbp: 450,
  costPerHireGbp: 3_800,
  timeToFillDays: 42,
  annualRevenueGbp: 680_000_000,
};

// 9 initiatives across 6 categories — representative healthcare CPO portfolio
const MERIDIAN_IDS = [
  // talent_acquisition (2 — will trigger 15% overlap discount)
  "ta_high_volume_hiring",
  "ta_sourcing_matching",
  // learning_development (2 — will trigger 15% overlap discount)
  "ld_personalised_learning",
  "ld_workforce_reskilling",
  // retention (2 — will trigger 15% overlap discount)
  "rt_flight_risk_prediction",
  "rt_stay_interview_ai",
  // workforce_planning (1)
  "wp_workforce_planning",
  // employee_experience (1)
  "ee_wellbeing_burnout",
  // hr_operations (1)
  "hr_virtual_assistant",
] as const;

// ── Run engine ────────────────────────────────────────────────────────────────
const model = computeCpoBusinessCase([...MERIDIAN_IDS], MERIDIAN_PROFILE);

console.log("=== MERIDIAN HEALTH GROUP — CPO BUSINESS CASE ENGINE DUMP ===");
console.log(JSON.stringify(model, null, 2));
