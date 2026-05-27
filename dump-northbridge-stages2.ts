/**
 * dump-northbridge-stages2.ts - uses snake_case column names
 */
import { createConnection } from "mysql2/promise";

const TENANT_ID = "tenant-northbridge-001";
const db = await createConnection(process.env.DATABASE_URL!);

// ── Stage 1: Reward Pre-work ──────────────────────────────────────────────────
console.log("\n=== STAGE 1: REWARD PRE-WORK ===");
const [prework] = await db.query(
  `SELECT is_completed, completed_at, reward_function_size, ai_maturity_in_reward_today, reward_ai_ambition, primary_trigger_for_reward_ai_strategy, top_reward_priorities_next_12_months, strategic_timeline FROM reward_prework WHERE tenant_id = ?`,
  [TENANT_ID]
) as any;
console.log(JSON.stringify(prework[0] ?? "NOT FOUND", null, 2));

// ── Stage 2: Reward Vision ────────────────────────────────────────────────────
console.log("\n=== STAGE 2: REWARD VISION ===");
const [vision] = await db.query(
  `SELECT vision_text, state, updated_at FROM reward_vision WHERE tenant_id = ?`,
  [TENANT_ID]
) as any;
console.log(JSON.stringify(vision[0] ?? "NOT FOUND", null, 2));

// ── Stage 3: Reward Strategy ──────────────────────────────────────────────────
console.log("\n=== STAGE 3: REWARD STRATEGY ===");
const [strategy] = await db.query(
  `SELECT strategic_shifts_json, state, updated_at FROM reward_strategy WHERE tenant_id = ?`,
  [TENANT_ID]
) as any;
if (strategy[0]) {
  const s = strategy[0];
  let shifts = [];
  try { shifts = JSON.parse(s.strategic_shifts_json || '[]'); } catch(e) {}
  console.log(`state: ${s.state}`);
  console.log(`strategic_shifts count: ${shifts.length}`);
  if (shifts.length > 0) console.log(`first shift: ${JSON.stringify(shifts[0])}`);
} else {
  console.log("NOT FOUND");
}

// ── Stage 4: Reward Principles ────────────────────────────────────────────────
console.log("\n=== STAGE 4: REWARD PRINCIPLES ===");
const [principles] = await db.query(
  `SELECT principles_json, wont_dos_json, state FROM reward_principles WHERE tenant_id = ?`,
  [TENANT_ID]
) as any;
if (principles[0]) {
  const p = principles[0];
  let pList = [], wList = [];
  try { pList = JSON.parse(p.principles_json || '[]'); } catch(e) {}
  try { wList = JSON.parse(p.wont_dos_json || '[]'); } catch(e) {}
  console.log(`state: ${p.state}`);
  console.log(`principles count: ${pList.length}`);
  console.log(`wont_dos count: ${wList.length}`);
} else {
  console.log("NOT FOUND");
}

// ── Stage 5: Reward Initiatives (from rewardInitiatives table or reward_initiatives) ──
console.log("\n=== STAGE 5: REWARD INITIATIVES ===");
// Try the actual table name used by the router
const [tables] = await db.query(`SHOW TABLES LIKE 'reward%'`) as any;
console.log("Reward tables:", tables.map((t: any) => Object.values(t)[0]));

// ── Stage 7: Reward Business Case ────────────────────────────────────────────
console.log("\n=== STAGE 7: REWARD BUSINESS CASE ===");
const [bc] = await db.query(
  `SELECT is_confirmed, confirmed_at, recommended_scenario, exec_summary_text IS NOT NULL as has_exec_summary FROM reward_business_case WHERE tenant_id = ?`,
  [TENANT_ID]
) as any;
console.log(JSON.stringify(bc[0] ?? "NOT FOUND", null, 2));

// ── Stage 9: Reward Review ────────────────────────────────────────────────────
console.log("\n=== STAGE 9: REWARD REVIEW ===");
const [review] = await db.query(
  `SELECT strategy_locked, locked_at, check_results_json IS NOT NULL as has_checks FROM reward_review WHERE tenant_id = ?`,
  [TENANT_ID]
) as any;
console.log(JSON.stringify(review[0] ?? "NOT FOUND", null, 2));

// ── Stage 10: Reward Outputs ──────────────────────────────────────────────────
console.log("\n=== STAGE 10: REWARD OUTPUTS ===");
const [outputs] = await db.query(
  `SELECT audience, exec_summary_text IS NOT NULL as has_exec_summary, last_export_at FROM reward_outputs WHERE tenant_id = ?`,
  [TENANT_ID]
) as any;
console.log(JSON.stringify(outputs[0] ?? "NOT FOUND", null, 2));

// ── Gate state from ailOrgContext ─────────────────────────────────────────────
console.log("\n=== GATE STATE (ail_org_context) ===");
const [gate] = await db.query(
  `SELECT stage_gate_state_json, prework_completed_at, vision_confirmed_at, strategy_archetype, strategy_confirmed_at, stage4_confirmed_at, stage5_confirmed_at, stage6_confirmed_at, stage7_confirmed_at, stage8_confirmed_at, stage9_confirmed_at, stage10_confirmed_at FROM ail_org_context WHERE tenant_id = ?`,
  [TENANT_ID]
) as any;
if (gate[0]) {
  const g = gate[0];
  let gateState: any = {};
  try { gateState = JSON.parse(g.stage_gate_state_json || '{}'); } catch(e) {}
  console.log("stage_gate_state_json stages cleared:", Object.keys(gateState).filter(k => gateState[k]?.completedAt));
  console.log("prework_completed_at:", g.prework_completed_at);
  console.log("vision_confirmed_at:", g.vision_confirmed_at);
  console.log("strategy_archetype:", g.strategy_archetype);
  console.log("strategy_confirmed_at:", g.strategy_confirmed_at);
  console.log("stage4_confirmed_at:", g.stage4_confirmed_at);
  console.log("stage5_confirmed_at:", g.stage5_confirmed_at);
  console.log("stage6_confirmed_at:", g.stage6_confirmed_at);
  console.log("stage7_confirmed_at:", g.stage7_confirmed_at);
  console.log("stage8_confirmed_at:", g.stage8_confirmed_at);
  console.log("stage9_confirmed_at:", g.stage9_confirmed_at);
  console.log("stage10_confirmed_at:", g.stage10_confirmed_at);
} else {
  console.log("NOT FOUND");
}

await db.end();
