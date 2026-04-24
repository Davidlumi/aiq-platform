import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

const sqlFile = process.argv[2] || 'drizzle/0025_learning_aware_transfer.sql';
const sql = readFileSync(sqlFile, 'utf8');

// Split on semicolons, skip comments and empty lines
const statements = sql
  .split(';')
  .map(s => s.replace(/--[^\n]*/g, '').trim())
  .filter(s => s.length > 0);

const conn = await createConnection(process.env.DATABASE_URL || '');
for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log('OK:', stmt.slice(0, 100));
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
      console.log('SKIP (already exists):', stmt.slice(0, 80));
    } else if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('SKIP (table exists):', stmt.slice(0, 80));
    } else {
      console.error('FAIL:', e.message, '\nSQL:', stmt.slice(0, 200));
    }
  }
}
await conn.end();
console.log('Migration complete.');
