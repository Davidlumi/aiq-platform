import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

const sql = readFileSync("/home/ubuntu/aiq-platform/drizzle/0020_configurable_evidence_thresholds.sql", "utf8");
const conn = await createConnection(process.env.DATABASE_URL);

// Split on semicolons and run each statement
const statements = sql.split(";").map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith("--"));

for (const stmt of statements) {
  try {
    const [result] = await conn.execute(stmt);
    console.log("OK:", stmt.slice(0, 80).replace(/\n/g, " "), "->", JSON.stringify(result).slice(0, 60));
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("SKIP (already exists):", stmt.slice(0, 80).replace(/\n/g, " "));
    } else {
      console.error("ERROR:", err.message, "\nStatement:", stmt.slice(0, 200));
    }
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
