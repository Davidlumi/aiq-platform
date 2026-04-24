import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

const conn = await createConnection(process.env.DATABASE_URL);
console.log("Connected");

const sql = readFileSync("./drizzle/0027_schema_additions.sql", "utf8");
// Split on semicolons but keep multi-line statements intact
const stmts = sql.split(";").map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith("--"));

let ok = 0, fail = 0;
for (const stmt of stmts) {
  try {
    await conn.execute(stmt);
    ok++;
  } catch (e) {
    const msg = e.message || "";
    if (msg.includes("Duplicate") || msg.includes("already exists") || msg.includes("Multiple primary key")) {
      ok++;
    } else {
      console.error("FAIL:", stmt.substring(0, 80), "|", msg.substring(0, 120));
      fail++;
    }
  }
}
await conn.end();
console.log(`Done: ${ok} ok, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
