/**
 * Fix JSON column nullability in TiDB.
 * TiDB does not honour DEFAULT ('{}') for JSON columns, so we make them nullable
 * and update the Drizzle schema to match. The application code always passes
 * explicit values, so this is safe.
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const alterStatements = [
  // assessment_sessions
  `ALTER TABLE assessment_sessions MODIFY COLUMN session_metadata_json JSON NULL`,
  // assessment_blueprints
  `ALTER TABLE assessment_blueprints MODIFY COLUMN role_scope_json JSON NULL`,
  `ALTER TABLE assessment_blueprints MODIFY COLUMN structure_json JSON NULL`,
  // assessment_items
  `ALTER TABLE assessment_items MODIFY COLUMN metadata_json JSON NULL`,
  // assessment_item_options
  `ALTER TABLE assessment_item_options MODIFY COLUMN signal_deltas_json JSON NULL`,
  `ALTER TABLE assessment_item_options MODIFY COLUMN event_codes_json JSON NULL`,
  // assessment_scores
  `ALTER TABLE assessment_scores MODIFY COLUMN score_breakdown_json JSON NULL`,
  `ALTER TABLE assessment_scores MODIFY COLUMN signal_scores_json JSON NULL`,
  // credibility_scores
  `ALTER TABLE credibility_scores MODIFY COLUMN reason_json JSON NULL`,
  // risk_scores
  `ALTER TABLE risk_scores MODIFY COLUMN reason_json JSON NULL`,
  // user_states
  `ALTER TABLE user_states MODIFY COLUMN state_reason_json JSON NULL`,
  // decision_logs
  `ALTER TABLE decision_logs MODIFY COLUMN input_snapshot_json JSON NULL`,
  `ALTER TABLE decision_logs MODIFY COLUMN output_snapshot_json JSON NULL`,
  `ALTER TABLE decision_logs MODIFY COLUMN precedence_applied_json JSON NULL`,
  // content_items
  `ALTER TABLE content_items MODIFY COLUMN metadata_json JSON NULL`,
  `ALTER TABLE content_items MODIFY COLUMN body_json JSON NULL`,
  // policy_rules
  `ALTER TABLE policy_rules MODIFY COLUMN conditions_json JSON NULL`,
  `ALTER TABLE policy_rules MODIFY COLUMN consequences_json JSON NULL`,
  // learning_plans
  `ALTER TABLE learning_plans MODIFY COLUMN summary_json JSON NULL`,
  // learning_plan_items
  `ALTER TABLE learning_plan_items MODIFY COLUMN reason_json JSON NULL`,
  // content_progress
  `ALTER TABLE content_progress MODIFY COLUMN latest_result_json JSON NULL`,
  // simulations
  `ALTER TABLE simulations MODIFY COLUMN metadata_json JSON NULL`,
  `ALTER TABLE simulations MODIFY COLUMN pass_conditions_json JSON NULL`,
  // simulation_nodes
  `ALTER TABLE simulation_nodes MODIFY COLUMN context_json JSON NULL`,
  // simulation_choices
  `ALTER TABLE simulation_choices MODIFY COLUMN metadata_json JSON NULL`,
  // simulation_session_events
  `ALTER TABLE simulation_session_events MODIFY COLUMN payload_json JSON NULL`,
  // simulation_results
  `ALTER TABLE simulation_results MODIFY COLUMN score_breakdown_json JSON NULL`,
  `ALTER TABLE simulation_results MODIFY COLUMN risk_impact_json JSON NULL`,
  `ALTER TABLE simulation_results MODIFY COLUMN feedback_json JSON NULL`,
  // policy_evaluations
  `ALTER TABLE policy_evaluations MODIFY COLUMN explanation_json JSON NULL`,
  // admin_overrides
  `ALTER TABLE admin_overrides MODIFY COLUMN before_snapshot_json JSON NULL`,
  `ALTER TABLE admin_overrides MODIFY COLUMN after_snapshot_json JSON NULL`,
  // events
  `ALTER TABLE events MODIFY COLUMN payload_json JSON NULL`,
  // audit_logs
  `ALTER TABLE audit_logs MODIFY COLUMN metadata_json JSON NULL`,
  // report_jobs
  `ALTER TABLE report_jobs MODIFY COLUMN parameters_json JSON NULL`,
  `ALTER TABLE report_jobs MODIFY COLUMN manifest_json JSON NULL`,
  // tenants
  `ALTER TABLE tenants MODIFY COLUMN settings_json JSON NULL`,
];

let ok = 0, fail = 0;
for (const sql of alterStatements) {
  try {
    await conn.execute(sql);
    console.log(`✓ ${sql.substring(0, 60)}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${sql.substring(0, 60)} — ${e.message}`);
    fail++;
  }
}

await conn.end();
console.log(`\nDone: ${ok} succeeded, ${fail} failed`);
