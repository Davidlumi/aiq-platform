import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const sql = readFileSync('drizzle/0032_aiq_coach_phase0.sql', 'utf8');
// Split on semicolons, filter out empty lines and comments
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

const conn = await mysql.createConnection(process.env.DATABASE_URL);
for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log('OK:', stmt.substring(0, 70));
  } catch (e) {
    console.error('ERR:', e.message, '|', stmt.substring(0, 70));
  }
}
await conn.end();
console.log('Migration complete');
