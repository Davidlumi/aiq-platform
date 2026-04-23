import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

const url = process.env.DATABASE_URL;
const conn = await createConnection(url);

const sql = readFileSync('drizzle/0019_configurable_scoring_thresholds.sql', 'utf8');
// Split on semicolons, filter blanks and comment-only lines
const stmts = sql.split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

for (const stmt of stmts) {
  await conn.execute(stmt);
  console.log('OK:', stmt.slice(0, 80).replace(/\n/g, ' '));
}

await conn.end();
console.log('Migration 0019 applied successfully');
