import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1); }

const sqlPath = join(__dirname, "../drizzle/0018_v22_completion_pass.sql");
const sql = readFileSync(sqlPath, "utf-8");

// Remove comment lines, then split on semicolons
const cleaned = sql.split("\n")
  .filter(line => !line.trim().startsWith("--"))
  .join("\n");

const statements = cleaned.split(";")
  .map(s => s.trim())
  .filter(s => s.length > 5);

console.log(`Found ${statements.length} statements`);

const conn = await createConnection(dbUrl);
let ok = 0, failed = 0;
for (const stmt of statements) {
  try {
    await conn.query(stmt);
    console.log(`  OK: ${stmt.slice(0, 100).replace(/\n/g, " ")}`);
    ok++;
  } catch (err) {
    console.error(`  FAIL: ${stmt.slice(0, 100).replace(/\n/g, " ")}`);
    console.error(`       ${err.message}`);
    failed++;
  }
}
await conn.end();
console.log(`\nDone: ${ok} OK, ${failed} failed`);
if (failed > 0) process.exit(1);
