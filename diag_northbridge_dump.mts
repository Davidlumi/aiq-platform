/**
 * Raw engine dump — Northbridge canonical fixture.
 * Inputs copied verbatim from northbridge-canonical.test.ts.
 * Run: npx tsx diag_northbridge_dump.mts
 */
import { computeBusinessCase } from "./server/services/rewardBusinessCaseEngine.js";

// ── Exact fixture from northbridge-canonical.test.ts lines 47-62 ─────────────
const MAYA_IDS = [
  "ai_compensation_recommendation_engine",     // #1  Compensation Recommendation Engine
  "ai_driven_merit_cycle_orchestration",       // #2  Merit Cycle Orchestration
  "ai_pay_equity_continuous_monitoring",       // #3  Pay Equity Continuous Monitoring
  "ai_multi_characteristic_pay_gap_reporting", // #4  Multi-Characteristic Pay Gap Reporting
  "ai_pay_band_design",                        // #6  Pay Band Design
  "ai_reward_operations_assistant",            // #15 Reward Operations Assistant
  "ai_bonus_pool_optimisation",                // #16 Bonus Pool Optimisation
  "ai_sales_compensation_plan_design",         // #17 Sales Compensation Plan Design
] as const;

const NORTHBRIDGE_PROFILE = {
  sector: "financial_services" as const,
  totalEmployeeHeadcount: 8_000,
  totalPayrollGbp: 95_000_000,
};

// ── Call exactly as the test calls it (lines 90-95) ──────────────────────────
const model = computeBusinessCase(
  [...MAYA_IDS],
  NORTHBRIDGE_PROFILE,
  {},   // customInitiatives
  {}    // overrides
);

console.log(JSON.stringify(model, null, 2));
