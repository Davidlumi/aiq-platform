/**
 * T4 — Verify successMeasuresJson migration
 * Checks that every row with outcomesJson also has successMeasuresJson populated,
 * and shows a preview of the data to confirm it renders correctly.
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("[T4] ERROR: DATABASE_URL not set"); process.exit(1); }

const url = new URL(DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname, port: parseInt(url.port || "3306"),
  user: url.username, password: url.password,
  database: url.pathname.replace(/^\//, ""), ssl: { rejectUnauthorized: false }
});

const [rows] = await conn.execute(`
  SELECT 
    id, tenant_id,
    outcomes_json IS NOT NULL AS has_outcomes,
    success_measures_json IS NOT NULL AS has_success_measures,
    LEFT(COALESCE(success_measures_json, ''), 120) AS preview
  FROM ail_org_context
`);

console.log("\n[T4] Migration verification:");
console.log("─".repeat(80));
let migrated = 0, fallbackNeeded = 0, bothNull = 0;
for (const r of rows) {
  const status = r.has_outcomes && r.has_success_measures ? "✅ MIGRATED"
    : r.has_outcomes && !r.has_success_measures ? "❌ FALLBACK NEEDED"
    : !r.has_outcomes && r.has_success_measures ? "⚠️  SUCCESS_MEASURES ONLY (unexpected)"
    : "⬜ BOTH NULL (no measures data)";
  if (r.has_outcomes && r.has_success_measures) migrated++;
  else if (r.has_outcomes && !r.has_success_measures) fallbackNeeded++;
  else bothNull++;
  console.log(`  ${status} | tenant: ${r.tenant_id}`);
  if (r.preview) console.log(`    preview: ${r.preview}`);
}
console.log("─".repeat(80));
console.log(`  Total rows: ${rows.length} | Migrated: ${migrated} | Fallback needed: ${fallbackNeeded} | Both null: ${bothNull}`);

if (fallbackNeeded > 0) {
  console.error("\n[T4] ❌ MIGRATION INCOMPLETE — some rows still need successMeasuresJson populated.");
  process.exit(1);
} else {
  console.log("\n[T4] ✅ Migration complete — all rows with outcomesJson have successMeasuresJson populated.");
}

await conn.end();
