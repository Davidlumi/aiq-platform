import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const sql = `
ALTER TABLE \`ail_org_context\`
  ADD COLUMN IF NOT EXISTS \`business_ambition_level\` int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS \`people_ambition_level\` int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS \`domain_targets_json\` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS \`strategy_narrative\` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS \`strategy_saved_at\` timestamp DEFAULT NULL;
`;

try {
  await conn.execute(sql);
  console.log("✅ Migration 0029 applied successfully");
  // Verify
  const [rows] = await conn.execute("DESCRIBE `ail_org_context`");
  const cols = rows.map(r => r.Field);
  const expected = ["business_ambition_level", "people_ambition_level", "domain_targets_json", "strategy_narrative", "strategy_saved_at"];
  for (const col of expected) {
    if (cols.includes(col)) {
      console.log(`  ✓ ${col}`);
    } else {
      console.log(`  ✗ MISSING: ${col}`);
    }
  }
} catch (err) {
  console.error("Migration error:", err.message);
} finally {
  await conn.end();
}
