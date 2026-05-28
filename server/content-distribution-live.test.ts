/**
 * server/content-distribution-live.test.ts
 *
 * Fix 15 (P0) — AiQ Evidence Pack Remediation Brief Addendum R2, 28 May 2026.
 *
 * PURPOSE:
 *   This test queries the live database to verify the actual capability_key
 *   distribution in content_scenarios. It replaces the prior Test D claim
 *   (which was not captured from a live run) with a real-DB guard.
 *
 * WHAT IT ASSERTS (invariants, not exact counts):
 *   1. All 6 canonical domain keys are present in the DB.
 *   2. No legacy keys remain in the DB.
 *   3. Total scenario count is ≥ 100 (minimum viable bank).
 *   4. Each canonical domain has ≥ 1 scenario (no empty domain).
 *   5. The test records the live distribution in its output for traceability.
 *
 * WHAT IT DOES NOT ASSERT:
 *   - Exact counts per domain (those are tracked in
 *     references/content-scenario-distribution-ground-truth.md and
 *     enforced by Fix 16's balance-band test).
 *   - That the distribution is balanced (that is Fix 16's responsibility).
 *
 * ANTI-FABRICATION:
 *   All assertions are derived from a live DB query at test time.
 *   No distribution numbers are hardcoded in this file.
 *
 * Run: pnpm test server/content-distribution-live.test.ts
 */
import { describe, it, expect } from "vitest";
import { createConnection } from "mysql2/promise";

const CANONICAL_DOMAIN_KEYS = [
  "ai_interaction",
  "ai_output_evaluation",
  "ai_workflow_design",
  "workforce_ai_readiness",
  "ai_ethics_trust",
  "ai_change_leadership",
] as const;

const LEGACY_KEYS = [
  "appropriateness",
  "data_interpretation",
  "execution",
  "governance",
  "judgement",
  "workflow",
  "ai_foundations",
  "data_ethics",
  "hr_ai_application",
  "org_transformation",
  "reward_intelligence",
  "workforce_analytics",
];

// ─── Live DB distribution query ───────────────────────────────────────────────
async function queryDistribution(): Promise<Map<string, number>> {
  const url = process.env.DATABASE_URL;
  if (!url) return new Map(); // skip if no DB in CI
  const conn = await createConnection(url);
  try {
    const [rows] = await conn.execute(
      "SELECT capability_key, COUNT(*) as cnt FROM content_scenarios GROUP BY capability_key"
    ) as [Array<{ capability_key: string; cnt: number }>, unknown];
    const dist = new Map<string, number>();
    for (const row of rows) {
      dist.set(row.capability_key, Number(row.cnt));
    }
    return dist;
  } finally {
    await conn.end();
  }
}

describe("Content Scenario Distribution — Live DB Guard (Fix 15)", () => {
  it("live DB contains all 6 canonical domain keys", async () => {
    const dist = await queryDistribution();
    if (dist.size === 0) {
      console.warn("[SKIP] No DATABASE_URL — skipping live DB test");
      return;
    }

    // Print distribution for traceability
    let total = 0;
    console.log("\n=== Live DB capability_key distribution ===");
    for (const key of CANONICAL_DOMAIN_KEYS) {
      const cnt = dist.get(key) ?? 0;
      total += cnt;
      const pct = ((cnt / Array.from(dist.values()).reduce((a, b) => a + b, 0)) * 100).toFixed(1);
      console.log(`  ${key}: ${cnt} (${pct}%)`);
    }
    console.log(`  TOTAL: ${total}`);

    for (const key of CANONICAL_DOMAIN_KEYS) {
      expect(dist.has(key), `Domain '${key}' is missing from the DB`).toBe(true);
    }
  }, 15000);

  it("live DB total scenario count is ≥ 100", async () => {
    const dist = await queryDistribution();
    if (dist.size === 0) return; // skip if no DB
    const total = Array.from(dist.values()).reduce((a, b) => a + b, 0);
    expect(total, `Total scenarios ${total} is below minimum of 100`).toBeGreaterThanOrEqual(100);
  }, 15000);

  it("each canonical domain has ≥ 1 scenario in the live DB", async () => {
    const dist = await queryDistribution();
    if (dist.size === 0) return; // skip if no DB
    for (const key of CANONICAL_DOMAIN_KEYS) {
      const cnt = dist.get(key) ?? 0;
      expect(cnt, `Domain '${key}' has 0 scenarios — adaptive assessment cannot function`).toBeGreaterThanOrEqual(1);
    }
  }, 15000);

  it("no legacy keys remain in the live DB", async () => {
    const url = process.env.DATABASE_URL;
    if (!url) return; // skip if no DB
    const conn = await createConnection(url);
    try {
      const placeholders = LEGACY_KEYS.map(() => "?").join(", ");
      const [rows] = await conn.execute(
        `SELECT capability_key, COUNT(*) as cnt FROM content_scenarios WHERE capability_key IN (${placeholders}) GROUP BY capability_key`,
        LEGACY_KEYS
      ) as [Array<{ capability_key: string; cnt: number }>, unknown];
      for (const row of rows) {
        expect(
          row.cnt,
          `Legacy key '${row.capability_key}' still has ${row.cnt} rows in the DB — migration incomplete`
        ).toBe(0);
      }
    } finally {
      await conn.end();
    }
  }, 15000);

  it("DB domain set matches the canonical scoring-engine domain set exactly", async () => {
    const dist = await queryDistribution();
    if (dist.size === 0) return; // skip if no DB
    const dbKeys = Array.from(dist.keys()).sort();
    const canonicalKeys = [...CANONICAL_DOMAIN_KEYS].sort();
    expect(dbKeys, "DB domain keys do not match canonical scoring-engine keys").toEqual(canonicalKeys);
  }, 15000);
});
