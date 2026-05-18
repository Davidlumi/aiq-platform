import mysql from "mysql2/promise";

const TENANT_ID = "tenant-acme-ltd";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Reset all strategy-related columns on ail_org_context
  const [r1] = await conn.execute(`
    UPDATE ail_org_context SET
      business_ambition_level = NULL,
      people_ambition_level = NULL,
      domain_targets_json = NULL,
      strategy_narrative = NULL,
      strategy_saved_at = NULL,
      ambition_target_score = NULL,
      ambition_target_date = NULL,
      ambition_target_label = NULL,
      selected_initiatives_json = NULL,
      wont_do_json = NULL,
      provenance_json = NULL,
      library_version = NULL,
      snapshot_domain_scores_json = NULL,
      prework_completed_at = NULL,
      fit_impact_results_json = NULL,
      vision_statement = NULL,
      vision_confirmed_at = NULL,
      vision_inspiration_source = NULL,
      vision_inputs_json = NULL,
      vision_inputs_updated_at = NULL,
      guiding_principles_json = NULL,
      outcomes_json = NULL,
      business_case_narrative = NULL,
      stage8_capability_json = NULL,
      review_held_at = NULL,
      review_session_notes = NULL,
      review_tensions_json = NULL,
      board_report_sections_json = NULL,
      board_report_include_notes = 0,
      stage_gate_state_json = NULL,
      strategy_archetype = NULL,
      strategy_statement = NULL,
      strategy_confirmed_at = NULL,
      stage4_confirmed_at = NULL,
      stage5_confirmed_at = NULL,
      stage6_confirmed_at = NULL,
      stage7_confirmed_at = NULL,
      stage8_confirmed_at = NULL,
      stage9_confirmed_at = NULL,
      stage10_confirmed_at = NULL,
      semantic_alignment_cache_key = NULL,
      semantic_alignment_cache_json = NULL,
      updated_at = NOW()
    WHERE tenant_id = ?
  `, [TENANT_ID]);
  console.log("ail_org_context updated:", r1.affectedRows, "row(s)");

  // Delete strategy_initiatives rows for this tenant
  const [r2] = await conn.execute(
    "DELETE FROM strategy_initiatives WHERE strategy_id = ?",
    [TENANT_ID]
  );
  console.log("strategy_initiatives deleted:", r2.affectedRows, "row(s)");

  // Delete risk_acknowledgements rows for this tenant
  const [r3] = await conn.execute(
    "DELETE FROM risk_acknowledgements WHERE tenant_id = ?",
    [TENANT_ID]
  );
  console.log("risk_acknowledgements deleted:", r3.affectedRows, "row(s)");

  await conn.end();
  console.log("Done — Acme strategy data reset to blank slate.");
}

main().catch(e => { console.error(e.message); process.exit(1); });
