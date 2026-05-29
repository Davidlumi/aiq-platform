#!/usr/bin/env node
/**
 * scripts/verify-test-count.mjs
 *
 * Fix 17 (P0) — AiQ Product Integrity Brief v2.1, 28–29 May 2026.
 *
 * PROGRAMMATIC RECURRENCE LOCK (CI script)
 * ─────────────────────────────────────────
 * v2.1 Fix 17 amendment confirmation (2026-05-29):
 *   This script is FULLY PROGRAMMATIC. It does NOT parse a stale output file.
 *   Specifically:
 *   1. It deletes /tmp/vitest-count-lock.json before running (line ~43).
 *   2. It invokes `pnpm vitest run --reporter=json --outputFile=<path>` as
 *      a child_process.execSync call — a live runner invocation.
 *   3. It reads the freshly-written JSON and asserts numPassedTests.
 *   A stale or relocated output file cannot cause a false pass because the
 *   file is always deleted and re-written from a live run.
 *
 * Invokes vitest --reporter=json, reads the output, and asserts that the
 * number of passing tests equals PUBLISHED_TOTAL.
 *
 * This is the authoritative programmatic check. It runs outside the test suite
 * to avoid the recursive-vitest problem (vitest cannot spawn itself).
 *
 * Usage:
 *   node scripts/verify-test-count.mjs
 *   # or in CI:
 *   pnpm verify-test-count
 *
 * Exit codes:
 *   0 — live count matches PUBLISHED_TOTAL (within tolerance)
 *   1 — mismatch or error
 */
import { execSync } from "child_process";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const OUTPUT_FILE = "/tmp/vitest-count-lock.json";

/** Published total of PASSING tests (excludes .todo). */
const PUBLISHED_TOTAL = 1978;

/** Tolerance: allows for DB-dependent tests that skip without DATABASE_URL. */
const TOLERANCE = 5;

console.log(`[verify-test-count] Running vitest --reporter=json...`);
console.log(`[verify-test-count] Published total: ${PUBLISHED_TOTAL} (±${TOLERANCE})`);

// Clean up any stale output file
if (existsSync(OUTPUT_FILE)) unlinkSync(OUTPUT_FILE);

try {
  execSync(
    `pnpm vitest run --reporter=json --outputFile=${OUTPUT_FILE}`,
    { cwd: PROJECT_ROOT, timeout: 300_000, stdio: "inherit" }
  );
} catch {
  // vitest exits non-zero when tests fail — that's expected; we just need the JSON
}

if (!existsSync(OUTPUT_FILE)) {
  console.error(`[verify-test-count] ERROR: JSON output not found at ${OUTPUT_FILE}`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(OUTPUT_FILE, "utf8"));
const liveTotal = report.numPassedTests ?? report.numTotalTests ?? -1;
const diff = Math.abs(liveTotal - PUBLISHED_TOTAL);

console.log(`[verify-test-count] Live passing tests: ${liveTotal}`);
console.log(`[verify-test-count] Published total:    ${PUBLISHED_TOTAL}`);
console.log(`[verify-test-count] Difference:         ${diff} (tolerance: ${TOLERANCE})`);

if (diff > TOLERANCE) {
  console.error(
    `[verify-test-count] FAIL: Live count (${liveTotal}) differs from PUBLISHED_TOTAL ` +
    `(${PUBLISHED_TOTAL}) by ${diff} — exceeds tolerance of ±${TOLERANCE}.\n` +
    `Update PUBLISHED_TOTAL in this script AND in server/verify-test-count.test.ts ` +
    `AND in references/content-scenario-distribution-ground-truth.md.`
  );
  process.exit(1);
} else {
  console.log(`[verify-test-count] PASS: Live count within tolerance.`);
  process.exit(0);
}
