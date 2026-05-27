/**
 * Meridian Health Group — CPO canonical fixture dump (9 quantified initiatives)
 * Run: npx tsx diag_meridian_dump2.mts
 */
import { computeCpoBusinessCase, type CpoCompanyProfile } from "./server/services/cpoBusinessCaseEngine.js";

// ── Exact fixture (will be locked in meridian-canonical.test.ts) ──────────────
export const MERIDIAN_PROFILE: CpoCompanyProfile = {
  totalHeadcount: 12_000,
  sector: "healthcare",
  hiresPerYear: 1_800,
  attritionRatePct: 18,
  lAndDSpendPerFteGbp: 450,
  costPerHireGbp: 3_800,
  timeToFillDays: 42,
  annualRevenueGbp: 680_000_000,
};

// 9 quantified-value initiatives across 5 categories
export const MERIDIAN_IDS = [
  // internal_mobility (2 — will trigger 15% overlap discount)
  "im_skills_inference",
  "im_mentor_matching",
  // retention (1)
  "rt_stay_interview_ai",
  // manager_effectiveness (1)
  "mg_manager_copilot",
  // governance (2 — will trigger 15% overlap discount)
  "gv_ai_governance",
  "gv_cross_cutting_bias_audit",
  // ai_capability (3 — will trigger 25% overlap discount)
  "wp_ai_capability_building",
  "wp_ai_capability_advanced",
  "ee_workforce_ai_comms",
] as const;

// ── Run engine ────────────────────────────────────────────────────────────────
const model = computeCpoBusinessCase([...MERIDIAN_IDS], MERIDIAN_PROFILE);

console.log("=== MERIDIAN HEALTH GROUP — CPO BUSINESS CASE ENGINE DUMP (9 quantified) ===");
console.log(JSON.stringify(model, null, 2));
