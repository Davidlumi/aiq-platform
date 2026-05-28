/**
 * server/content-balance-band.test.ts
 *
 * Fix 16 (P1) — AiQ Evidence Pack Remediation Brief Addendum R2, 28 May 2026.
 *
 * PURPOSE:
 *   Enforce the domain balance band for content_scenarios.
 *   The band is defined as: no domain below 10% or above 30% of the total bank.
 *
 *   Current live DB distribution (28 May 2026):
 *     ai_ethics_trust:       38 (34.5%) — OVER BAND (target: ≤30%)
 *     ai_output_evaluation:  26 (23.6%) — within band
 *     ai_workflow_design:    17 (15.5%) — within band
 *     ai_interaction:        13 (11.8%) — within band
 *     ai_change_leadership:   8 (7.3%)  — UNDER BAND (target: ≥10%)
 *     workforce_ai_readiness: 8 (7.3%)  — UNDER BAND (target: ≥10%)
 *
 *   The test currently FAILS for ai_ethics_trust (over band) and the two thin
 *   domains (under band). This is intentional — the test documents the gap and
 *   will pass only when content has been commissioned to fill thin domains and
 *   the over-represented domain has been reviewed/reassigned.
 *
 *   See references/domain-balance-commissioning-plan.md for the content
 *   commissioning plan.
 *
 * BAND DEFINITION:
 *   MIN_PCT = 10%  (each domain must have ≥ 10% of total bank)
 *   MAX_PCT = 30%  (no domain may have > 30% of total bank)
 *
 * Run: pnpm test server/content-balance-band.test.ts
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

/** Balance band: no domain below MIN_PCT% or above MAX_PCT% of total */
const MIN_PCT = 10;
const MAX_PCT = 30;

async function queryDistribution(): Promise<Map<string, number>> {
  const url = process.env.DATABASE_URL;
  if (!url) return new Map();
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

describe("Content Scenario Domain Balance Band (Fix 16)", () => {
  it("prints current distribution and band status for all domains", async () => {
    const dist = await queryDistribution();
    if (dist.size === 0) {
      console.warn("[SKIP] No DATABASE_URL — skipping live DB test");
      return;
    }
    const total = Array.from(dist.values()).reduce((a, b) => a + b, 0);
    console.log(`\n=== Domain Balance Band Check (target: ${MIN_PCT}%–${MAX_PCT}%, total=${total}) ===`);
    for (const key of CANONICAL_DOMAIN_KEYS) {
      const cnt = dist.get(key) ?? 0;
      const pct = (cnt / total) * 100;
      const status = pct < MIN_PCT ? "UNDER BAND" : pct > MAX_PCT ? "OVER BAND" : "OK";
      const target = pct < MIN_PCT
        ? `needs +${Math.ceil(total * MIN_PCT / 100) - cnt} scenarios to reach ${MIN_PCT}%`
        : pct > MAX_PCT
        ? `needs -${cnt - Math.floor(total * MAX_PCT / 100)} scenarios or reassignment to reach ≤${MAX_PCT}%`
        : "";
      console.log(`  ${key}: ${cnt} (${pct.toFixed(1)}%) [${status}] ${target}`);
    }
  }, 15000);

  it("each domain is at or above the minimum band (≥10% of total)", async () => {
    const dist = await queryDistribution();
    if (dist.size === 0) return;
    const total = Array.from(dist.values()).reduce((a, b) => a + b, 0);
    const minCount = Math.ceil(total * MIN_PCT / 100);
    for (const key of CANONICAL_DOMAIN_KEYS) {
      const cnt = dist.get(key) ?? 0;
      expect(
        cnt,
        `Domain '${key}' has ${cnt} scenarios (${((cnt / total) * 100).toFixed(1)}%) — below minimum band of ${MIN_PCT}% (${minCount} scenarios). Commission content to fill this domain.`
      ).toBeGreaterThanOrEqual(minCount);
    }
  }, 15000);

  it("no domain exceeds the maximum band (≤30% of total)", async () => {
    const dist = await queryDistribution();
    if (dist.size === 0) return;
    const total = Array.from(dist.values()).reduce((a, b) => a + b, 0);
    const maxCount = Math.floor(total * MAX_PCT / 100);
    for (const key of CANONICAL_DOMAIN_KEYS) {
      const cnt = dist.get(key) ?? 0;
      expect(
        cnt,
        `Domain '${key}' has ${cnt} scenarios (${((cnt / total) * 100).toFixed(1)}%) — above maximum band of ${MAX_PCT}% (${maxCount} scenarios). Review assignments or commission content in other domains.`
      ).toBeLessThanOrEqual(maxCount);
    }
  }, 15000);
});
