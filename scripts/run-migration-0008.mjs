import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '../drizzle/0008_beta_applications.sql');
const rawSql = readFileSync(sqlPath, 'utf8');

// Remove comment lines and split on semicolons
const statements = rawSql
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

const conn = await mysql.createConnection(process.env.DATABASE_URL);
let ok = 0, err = 0;
for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log('OK:', stmt.substring(0, 80).replace(/\n/g, ' '));
    ok++;
  } catch (e) {
    console.error('ERR:', e.message, '\n  >', stmt.substring(0, 80).replace(/\n/g, ' '));
    err++;
  }
}
await conn.end();
console.log(`\nDone: ${ok} OK, ${err} errors`);
