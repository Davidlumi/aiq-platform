import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const statements = [
  `ALTER TABLE learning_modules ADD COLUMN formative_quiz_json JSON NULL`,
  `ALTER TABLE learning_modules ADD COLUMN required_capability_score INT NULL DEFAULT NULL`,
  `ALTER TABLE learning_modules ADD COLUMN required_level INT NULL DEFAULT NULL`,
  `ALTER TABLE gap_analyses ADD COLUMN trigger_source ENUM('manual', 'assessment_complete', 'revalidation') NOT NULL DEFAULT 'manual'`,
  `ALTER TABLE adaptive_learning_plans ADD COLUMN auto_regenerated_at BIGINT NULL DEFAULT NULL`,
];

const conn = await mysql.createConnection(process.env.DATABASE_URL);
let ok = 0, skip = 0;
for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    ok++;
    console.log('OK:', stmt.slice(0, 100));
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || (e.message && e.message.includes('Duplicate column'))) {
      skip++;
      console.log('SKIP (already exists):', stmt.slice(0, 100));
    } else {
      console.error('ERROR:', e.message);
    }
  }
}
await conn.end();
console.log(`Done: ${ok} applied, ${skip} skipped`);
