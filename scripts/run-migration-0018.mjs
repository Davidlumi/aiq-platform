/**
 * Migration runner for 0018_v22_completion_pass.sql
 * Run with: node scripts/run-migration-0018.mjs
 */
import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sqlFile = join(__dirname, "../drizzle/0018_v22_completion_pass.sql");
const sql = readFileSync(sqlFile, "utf-8");

// Split on semicolons, filter empty statements
const statements = sql
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith("--"));

const conn = await createConnection(dbUrl);

let ok = 0;
let failed = 0;
for (const stmt of statements) {
  try {
    await conn.query(stmt);
    console.log(`  OK: ${stmt.slice(0, 80).replace(/\n/g, " ")}...`);
    ok++;
  } catch (err) {
    console.error(`  FAIL: ${stmt.slice(0, 80).replace(/\n/g, " ")}...`);
    console.error(`       ${err.message}`);
    failed++;
  }
}

await conn.end();
console.log(`\nMigration complete: ${ok} OK, ${failed} failed`);
if (failed > 0) process.exit(1);
