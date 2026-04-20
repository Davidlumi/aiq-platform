import mysql from 'mysql2/promise';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse the DATABASE_URL manually to handle SSL params
const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error('DATABASE_URL is required');

// Parse URL to extract components and add multipleStatements
const url = new URL(rawUrl);
const sslParam = url.searchParams.get('ssl');

const connConfig = {
  host: url.hostname,
  port: parseInt(url.port || '4000'),
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  multipleStatements: true,
  ssl: sslParam ? { rejectUnauthorized: true } : undefined,
};

async function runFile(conn, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  // Split on semicolons but ignore empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let ok = 0;
  let skip = 0;
  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      ok++;
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('Duplicate entry')) {
        skip++;
      } else {
        console.error(`  ERROR in statement: ${stmt.slice(0, 80)}...`);
        console.error(`  ${e.message}`);
      }
    }
  }
  console.log(`  ${ok} statements executed, ${skip} skipped (already exist)`);
}

async function main() {
  console.log('Connecting to database...');
  const conn = await mysql.createConnection(connConfig);
  console.log('Connected.');

  const files = [
    path.join(__dirname, '../drizzle/0001_aiq_full_schema.sql'),
    path.join(__dirname, '../drizzle/0002_aiq_seed.sql'),
  ];

  for (const f of files) {
    console.log(`\nRunning: ${path.basename(f)}`);
    await runFile(conn, f);
  }

  await conn.end();
  console.log('\nMigration complete.');
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
