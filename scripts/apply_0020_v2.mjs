import { createConnection } from "mysql2/promise";

const conn = await createConnection(process.env.DATABASE_URL);

const statements = [
  "ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS evidence_total_items INT NOT NULL DEFAULT 20",
  "ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS evidence_signals_per_capability INT NOT NULL DEFAULT 3",
  "ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS evidence_distinct_interaction_types INT NOT NULL DEFAULT 5",
  "ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS evidence_high_risk_proportion DECIMAL(4,3) NOT NULL DEFAULT 0.250",
  "ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS evidence_target_items INT NOT NULL DEFAULT 49",
  "UPDATE scoring_config SET evidence_total_items=20, evidence_signals_per_capability=3, evidence_distinct_interaction_types=5, evidence_high_risk_proportion=0.250, evidence_target_items=49 WHERE version=2",
];

for (const stmt of statements) {
  try {
    const [result] = await conn.execute(stmt);
    console.log("OK:", stmt.slice(0, 90));
  } catch (err) {
    console.error("ERROR:", err.message, "\n  ->", stmt.slice(0, 90));
  }
}

// Verify
const [rows] = await conn.execute("DESCRIBE scoring_config");
const cols = rows.map(r => r.Field);
const expected = ["evidence_total_items", "evidence_signals_per_capability", "evidence_distinct_interaction_types", "evidence_high_risk_proportion", "evidence_target_items"];
for (const col of expected) {
  console.log(cols.includes(col) ? `✓ ${col}` : `✗ MISSING: ${col}`);
}

await conn.end();
