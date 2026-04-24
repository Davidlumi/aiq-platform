/**
 * Fix schema drift: add missing columns to assessment_scores
 * that Drizzle schema expects but the live DB doesn't have.
 */
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected");

  const migrations = [
    { name: "readiness_rule", sql: "ALTER TABLE assessment_scores ADD COLUMN readiness_rule ENUM('min_weighted','min_unweighted','mean') DEFAULT 'min_weighted'" },
    { name: "confidence_floor", sql: "ALTER TABLE assessment_scores ADD COLUMN confidence_floor DECIMAL(4,3) DEFAULT 0.600" },
  ];

  for (const m of migrations) {
    try {
      await conn.execute(m.sql);
      console.log(`✓ Added ${m.name}`);
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log(`  ${m.name} already exists`);
      } else {
        console.error(`✗ ${m.name}: ${e.message}`);
      }
    }
  }

  const [cols] = await conn.execute("DESCRIBE assessment_scores");
  console.log("Columns:", cols.map(c => c.Field).join(", "));
  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
