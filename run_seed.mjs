import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL || '');
const sql = readFileSync('/tmp/strategy_seed.sql', 'utf8');

// Split on semicolons that end a statement (at end of line or followed by newline)
// Remove comment lines first
const cleaned = sql
  .split('\n')
  .filter(line => !line.trimStart().startsWith('--'))
  .join('\n');

// Split on semicolons followed by newline or end of string
const statements = cleaned
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 10);

console.log(`Found ${statements.length} statements`);

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log('OK:', stmt.slice(0, 80));
  } catch (e) {
    console.error('ERR:', e.message.slice(0, 120), '\n  stmt:', stmt.slice(0, 80));
  }
}
await conn.end();
console.log('Seed done');
