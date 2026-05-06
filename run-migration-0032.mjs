import mysql from "mysql2/promise";

const DB = process.env.DATABASE_URL;
if (!DB) { console.error("No DATABASE_URL"); process.exit(1); }

const conn = await mysql.createConnection(DB);

const sqls = [
  `ALTER TABLE ail_org_context
     ADD COLUMN IF NOT EXISTS aspiration_answers_json TEXT NULL,
     ADD COLUMN IF NOT EXISTS hr_role_answers_json TEXT NULL,
     ADD COLUMN IF NOT EXISTS vision_statement TEXT NULL,
     ADD COLUMN IF NOT EXISTS guiding_principles_json TEXT NULL,
     ADD COLUMN IF NOT EXISTS strategy_assessment_completed_at TIMESTAMP NULL`,
];

for (const sql of sqls) {
  try {
    await conn.execute(sql);
    console.log("OK:", sql.slice(0, 80));
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME" || e.message?.includes("Duplicate column")) {
      console.log("Already exists, skipping:", sql.slice(0, 80));
    } else {
      console.error("FAILED:", e.message);
    }
  }
}

await conn.end();
console.log("Migration 0032 complete.");
