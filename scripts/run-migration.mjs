/**
 * Generic migration runner — reads a SQL file and executes each statement.
 * Usage: node scripts/run-migration.mjs drizzle/0017_scoring_config_v22.sql
 */
import mysql2 from 'mysql2/promise';
import { readFileSync } from 'fs';

const sqlFile = process.argv[2];
if (!sqlFile) { console.error('Usage: node run-migration.mjs <sql-file>'); process.exit(1); }

const url = process.env.DATABASE_URL;
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
const conn = await mysql2.createConnection({
  host: m[3], port: +m[4], user: m[1], password: m[2], database: m[5],
  ssl: { rejectUnauthorized: false },
  multipleStatements: false,
});

const sql = readFileSync(sqlFile, 'utf8');
const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));

for (const stmt of stmts) {
  try {
    await conn.query(stmt);
    console.log('✅', stmt.substring(0, 80).replace(/\n/g, ' '));
  } catch (e) {
    console.error('❌', e.message, '\n   ', stmt.substring(0, 80).replace(/\n/g, ' '));
  }
}
await conn.end();
console.log('Done.');
