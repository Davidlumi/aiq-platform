/**
 * Migration: Update learning_modules capability values from old keys to new domain keys
 * Old → New mapping:
 *   execution        → ai_interaction
 *   judgement        → ai_output_evaluation
 *   workflow         → ai_workflow_design
 *   data_interpretation → workforce_ai_readiness
 *   governance       → ai_ethics_trust
 *   appropriateness  → ai_change_leadership
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

const CAPABILITY_MAP = [
  ["execution",         "ai_interaction"],
  ["judgement",         "ai_output_evaluation"],
  ["workflow",          "ai_workflow_design"],
  ["data_interpretation","workforce_ai_readiness"],
  ["governance",        "ai_ethics_trust"],
  ["appropriateness",   "ai_change_leadership"],
];

console.log("Migrating learning_modules capability values...");

for (const [oldKey, newKey] of CAPABILITY_MAP) {
  const [result] = await conn.query(
    "UPDATE learning_modules SET capability = ? WHERE capability = ?",
    [newKey, oldKey]
  );
  console.log(`  ${oldKey} → ${newKey}: ${result.affectedRows} rows updated`);
}

// Verify
const [rows] = await conn.query("SELECT capability, COUNT(*) as cnt FROM learning_modules GROUP BY capability");
console.log("\nCapability distribution after migration:");
for (const row of rows) {
  console.log(`  ${row.capability}: ${row.cnt}`);
}

await conn.end();
console.log("\nMigration complete!");
