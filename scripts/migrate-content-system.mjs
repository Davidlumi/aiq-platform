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

const sql = readFileSync(join(__dirname, "../drizzle/0004_content_system.sql"), "utf8");

// Split on semicolons but skip empty statements
const statements = sql
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith("--"));

const conn = await createConnection(dbUrl);

let success = 0;
let failed = 0;

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    const tableName = stmt.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/)?.[1] ?? "unknown";
    console.log(`✓ ${tableName}`);
    success++;
  } catch (err) {
    console.error(`✗ Error: ${err.message}`);
    console.error(`  Statement: ${stmt.slice(0, 80)}...`);
    failed++;
  }
}

await conn.end();
console.log(`\nDone: ${success} succeeded, ${failed} failed`);
