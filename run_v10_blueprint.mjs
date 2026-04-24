import { createConnection } from "mysql2/promise";

const conn = await createConnection(process.env.DATABASE_URL);
console.log("Connected to database");

// Insert v10 blueprint
try {
  await conn.execute(
    "INSERT INTO `assessment_blueprints` (`id`, `tenant_id`, `key`, `name`, `version`, `status`, `role_scope_json`, `structure_json`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      'bp-aiq-v10-standard',
      'tenant-demo-001',
      'aiq_v10_standard',
      'AIQ Capability Assessment — v10 Practical AI Skills',
      10,
      'published',
      JSON.stringify({"all": true}),
      JSON.stringify({
        "methodology_version": "v10",
        "total_items": 30,
        "estimated_duration_minutes": 20,
        "adaptive": true,
        "scoring_model": "signal_delta_v10",
        "capabilities": ["ai_interaction", "ai_output_evaluation", "ai_workflow_design", "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership"],
        "description": "The AIQ v10 Practical AI Skills Assessment measures AI capability across six domains using 30 scenario-based interactions grounded in real HR workflows."
      })
    ]
  );
  console.log("Blueprint inserted successfully");
} catch (e) {
  console.error("Blueprint insert failed:", e.message);
}

// Verify
const [bps] = await conn.execute("SELECT id, `key`, status FROM assessment_blueprints");
console.log("All blueprints:", JSON.stringify(bps));

const [items] = await conn.execute("SELECT COUNT(*) as cnt FROM assessment_items WHERE blueprint_id = 'bp-aiq-v10-standard'");
console.log("v10 items:", JSON.stringify(items));

await conn.end();
