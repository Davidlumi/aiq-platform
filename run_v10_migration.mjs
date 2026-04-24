import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "drizzle/0026_v10_assessment_items.sql"), "utf-8");

// Split on semicolons but keep multi-value INSERTs intact
const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith("--"));

const conn = await createConnection(process.env.DATABASE_URL);
console.log("Connected to database");

let ok = 0, fail = 0;
for (const stmt of statements) {
  if (!stmt) continue;
  try {
    await conn.execute(stmt);
    ok++;
  } catch (e) {
    console.error("FAILED:", stmt.substring(0, 80), "\n  Error:", e.message);
    fail++;
  }
}

await conn.end();
console.log(`Done: ${ok} succeeded, ${fail} failed`);
