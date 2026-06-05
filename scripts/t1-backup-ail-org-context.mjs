/**
 * T1 — Pre-flight backup of all ailOrgContext tenant records.
 *
 * Usage: node scripts/t1-backup-ail-org-context.mjs
 *
 * Writes:
 *   /home/ubuntu/backups/ail_org_context_backup_<timestamp>.json
 *
 * Verifies:
 *   - Row count
 *   - DFS tenant record present (by tenantId lookup)
 *   - Test restore: reads back the file and confirms row count matches
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[T1] ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const BACKUP_DIR = "/home/ubuntu/backups";
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_FILE = path.join(BACKUP_DIR, `ail_org_context_backup_${TIMESTAMP}.json`);

async function main() {
  console.log("[T1] Starting ailOrgContext backup...");

  // Parse DATABASE_URL (mysql://user:pass@host:port/db)
  const url = new URL(DATABASE_URL);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ""),
    ssl: { rejectUnauthorized: false },
  });

  console.log("[T1] Connected to database.");

  // 1. Fetch all rows
  const [rows] = await connection.execute("SELECT * FROM ail_org_context");
  const rowCount = rows.length;
  console.log(`[T1] Fetched ${rowCount} ailOrgContext row(s).`);

  if (rowCount === 0) {
    console.warn("[T1] WARNING: No rows found in ail_org_context. Backup will be empty.");
  }

  // 2. Identify DFS tenant
  // DFS may be identified by tenant name or a known tenantId — we'll look for 'dfs' in any text field
  const dfsCandidates = rows.filter(r => {
    const json = JSON.stringify(r).toLowerCase();
    return json.includes("dfs");
  });

  if (dfsCandidates.length > 0) {
    console.log(`[T1] DFS record(s) found: ${dfsCandidates.length} row(s) matching 'dfs'.`);
    dfsCandidates.forEach(r => {
      console.log(`  → tenantId: ${r.tenant_id || r.tenantId}, id: ${r.id}`);
    });
  } else {
    console.warn("[T1] WARNING: No row matching 'dfs' found in ail_org_context. Confirm DFS tenant ID manually.");
    // List all tenantIds for manual verification
    rows.forEach(r => {
      console.log(`  → tenantId: ${r.tenant_id || r.tenantId}, id: ${r.id}`);
    });
  }

  // 3. Write backup file
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const backupPayload = {
    backupTimestamp: new Date().toISOString(),
    rowCount,
    rows,
  };

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupPayload, null, 2), "utf8");
  console.log(`[T1] Backup written to: ${BACKUP_FILE}`);

  // 4. Test restore — read back and verify row count
  const restored = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8"));
  if (restored.rowCount !== rowCount || restored.rows.length !== rowCount) {
    console.error(`[T1] RESTORE VERIFICATION FAILED: wrote ${rowCount} rows but read back ${restored.rows.length}.`);
    process.exit(1);
  }
  console.log(`[T1] Test restore verified: ${restored.rows.length} row(s) readable from backup file.`);

  // 5. Summary
  console.log("\n[T1] ─── BACKUP SUMMARY ───────────────────────────────────────");
  console.log(`  Backup file : ${BACKUP_FILE}`);
  console.log(`  Row count   : ${rowCount}`);
  console.log(`  DFS present : ${dfsCandidates.length > 0 ? "YES" : "NOT CONFIRMED — check manually"}`);
  console.log(`  Restore test: PASSED`);
  console.log("[T1] ──────────────────────────────────────────────────────────\n");

  await connection.end();
  process.exit(0);
}

main().catch(err => {
  console.error("[T1] FATAL ERROR:", err);
  process.exit(1);
});
