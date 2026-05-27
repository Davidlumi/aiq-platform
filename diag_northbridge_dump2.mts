import { computeBusinessCase } from "./server/services/rewardBusinessCaseEngine.js";

const MAYA_IDS = [
  "ai_compensation_recommendation_engine",
  "ai_driven_merit_cycle_orchestration",
  "ai_pay_equity_continuous_monitoring",
  "ai_multi_characteristic_pay_gap_reporting",
  "ai_pay_band_design",
  "ai_reward_operations_assistant",
  "ai_bonus_pool_optimisation",
  "ai_sales_compensation_plan_design",
] as const;

const NORTHBRIDGE_PROFILE = {
  sector: "financial_services" as const,
  totalEmployeeHeadcount: 8_000,
  totalPayrollGbp: 95_000_000,
};

const model = computeBusinessCase(
  [...MAYA_IDS],
  NORTHBRIDGE_PROFILE,
  {},
  {},
  []
);

console.log(JSON.stringify(model, null, 2));
