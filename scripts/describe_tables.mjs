import mysql from '/home/ubuntu/aiq-platform/node_modules/.pnpm/mysql2@3.15.1/node_modules/mysql2/promise.js';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const tables = [
  // 0017 altered
  'scoring_config',
  // 0018 created/altered
  'anti_gaming_thresholds',
  'ail_persona_profiles',
  'assessment_answer_telemetry',
  'assessment_sessions',
  'assessment_answers',
];

const conn = await mysql.createConnection(url);
for (const t of tables) {
  console.log(`\n=== DESCRIBE ${t} ===`);
  try {
    const [rows] = await conn.query(`DESCRIBE \`${t}\``);
    for (const r of rows) {
      console.log(`  ${r.Field.padEnd(50)} ${r.Type.padEnd(30)} ${r.Null.padEnd(5)} ${r.Key.padEnd(5)} ${String(r.Default ?? 'NULL').padEnd(20)} ${r.Extra}`);
    }
  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
  }
}
await conn.end();
