/**
 * Seed script: Apply the AIQ V9.2 canonical interactions to the database.
 * Runs drizzle/0003_aiq_v9_interactions.sql
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error('DATABASE_URL is required');

const url = new URL(rawUrl);
const sslParam = url.searchParams.get('ssl');
const connConfig = {
  host: url.hostname,
  port: parseInt(url.port || '4000'),
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  multipleStatements: false,
  ssl: sslParam ? { rejectUnauthorized: true } : undefined,
};

async function main() {
  console.log('Connecting to database...');
  const conn = await mysql.createConnection(connConfig);
  console.log('Connected.');

  const sqlFile = path.join(__dirname, '../drizzle/0003_aiq_v9_interactions.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // Split on semicolons, filter empty/comment-only lines
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`\nRunning ${statements.length} statements from 0003_aiq_v9_interactions.sql...`);

  let ok = 0;
  let skip = 0;
  let errors = 0;

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      ok++;
      if (ok % 50 === 0) process.stdout.write('.');
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('Duplicate entry')) {
        skip++;
      } else {
        console.error(`\n  ERROR: ${e.message}`);
        console.error(`  Statement: ${stmt.slice(0, 120)}...`);
        errors++;
      }
    }
  }

  console.log(`\n\nResults: ${ok} executed, ${skip} skipped (duplicates), ${errors} errors`);

  // Verify
  const [blueprints] = await conn.query("SELECT id, name, status FROM assessment_blueprints WHERE id = 'bp-aiq-v9-standard'");
  const [itemCount] = await conn.query("SELECT COUNT(*) as cnt FROM assessment_items WHERE blueprint_id = 'bp-aiq-v9-standard'");
  const [optCount] = await conn.query("SELECT COUNT(*) as cnt FROM assessment_item_options WHERE item_id LIKE 'item-ex%' OR item_id LIKE 'item-pr%' OR item_id LIKE 'item-ju%' OR item_id LIKE 'item-va%' OR item_id LIKE 'item-ap%' OR item_id LIKE 'item-rg%'");

  console.log('\nVerification:');
  console.log('  Blueprint:', JSON.stringify(blueprints[0]));
  console.log('  Items:', itemCount[0].cnt);
  console.log('  Options:', optCount[0].cnt);

  await conn.end();
  console.log('\nDone.');
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
