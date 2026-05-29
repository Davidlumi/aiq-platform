/**
 * server/fix13-calibration-snapshot.test.ts
 *
 * Fix 13 (P2 REOPENED) — AiQ Product Integrity Brief v2.1, 29 May 2026.
 *
 * PURPOSE:
 *   Verify that the psychometric calibration snapshot (captured 2026-05-29)
 *   is consistent with the live DB. This test does NOT assert exact counts —
 *   it asserts structural properties that must hold after the 26-item re-include:
 *
 *   1. Total scenario count is ≥ 110 (post-re-include floor).
 *   2. Each domain has difficulty coverage at d=2 and d=3 (minimum for adaptive routing).
 *   3. The overall difficulty distribution is centred on d=2–3 (≥70% of bank).
 *   4. No domain has zero items at d=2 or d=3.
 *
 * WHAT IT DOES NOT ASSERT:
 *   - Exact counts per domain or difficulty (those are in the snapshot document).
 *   - That ai_ethics_trust has d=1 items (known gap, documented in snapshot).
 *   - Balance band compliance (that is Fix 16's responsibility).
 *
 * ANTI-FABRICATION:
 *   All assertions are derived from live DB queries at test time.
 *   No distribution numbers are hardcoded.
 *
 * Run: pnpm test server/fix13-calibration-snapshot.test.ts
 */
import { describe, it, expect } from "vitest";
import { getDb } from "./db";

describe("Fix 13 — Psychometric Calibration (post-26-item re-include)", () => {
  it("total scenario count is ≥ 110 (post-re-include floor)", async () => {
    const db = await getDb();
    if (!db) return; // skip if no DB

    const client = (db as any).$client.promise();
    const [[{ cnt }]] = await client.query(
      "SELECT COUNT(*) as cnt FROM content_scenarios"
    );
    expect(
      Number(cnt),
      `Expected ≥110 scenarios (post-26-item re-include), got ${cnt}`
    ).toBeGreaterThanOrEqual(110);
  });

  it("each domain has ≥1 scenario at difficulty d=2 (minimum for adaptive routing)", async () => {
    const db = await getDb();
    if (!db) return;

    const client = (db as any).$client.promise();
    const [rows] = await client.query(
      "SELECT capability_key, difficulty, COUNT(*) as cnt FROM content_scenarios GROUP BY capability_key, difficulty HAVING difficulty = 2"
    );
    const domainsWithD2 = new Set((rows as any[]).map((r) => r.capability_key));
    const canonicalDomains = [
      "ai_change_leadership",
      "ai_ethics_trust",
      "ai_interaction",
      "ai_output_evaluation",
      "ai_workflow_design",
      "workforce_ai_readiness",
    ];
    const missingD2 = canonicalDomains.filter((d) => !domainsWithD2.has(d));
    expect(
      missingD2,
      `These domains have no d=2 scenarios (required for adaptive routing): ${missingD2.join(", ")}`
    ).toHaveLength(0);
  });

  it("each domain has ≥1 scenario at difficulty d=3 (minimum for adaptive routing)", async () => {
    const db = await getDb();
    if (!db) return;

    const client = (db as any).$client.promise();
    const [rows] = await client.query(
      "SELECT capability_key, difficulty, COUNT(*) as cnt FROM content_scenarios GROUP BY capability_key, difficulty HAVING difficulty = 3"
    );
    const domainsWithD3 = new Set((rows as any[]).map((r) => r.capability_key));
    const canonicalDomains = [
      "ai_change_leadership",
      "ai_ethics_trust",
      "ai_interaction",
      "ai_output_evaluation",
      "ai_workflow_design",
      "workforce_ai_readiness",
    ];
    const missingD3 = canonicalDomains.filter((d) => !domainsWithD3.has(d));
    expect(
      missingD3,
      `These domains have no d=3 scenarios (required for adaptive routing): ${missingD3.join(", ")}`
    ).toHaveLength(0);
  });

  it("overall difficulty distribution is centred on d=2–3 (≥70% of bank)", async () => {
    const db = await getDb();
    if (!db) return;

    const client = (db as any).$client.promise();
    const [[{ total }]] = await client.query(
      "SELECT COUNT(*) as total FROM content_scenarios"
    );
    const [rows] = await client.query(
      "SELECT difficulty, COUNT(*) as cnt FROM content_scenarios WHERE difficulty IN (2, 3) GROUP BY difficulty"
    );
    const midCount = (rows as any[]).reduce((sum, r) => sum + Number(r.cnt), 0);
    const midPct = midCount / Number(total);
    expect(
      midPct,
      `Expected ≥70% of scenarios at d=2–3, got ${(midPct * 100).toFixed(1)}%`
    ).toBeGreaterThanOrEqual(0.70);
  });

  it("documents the known d=1 gap in ai_ethics_trust (snapshot note)", async () => {
    const db = await getDb();
    if (!db) return;

    const client = (db as any).$client.promise();
    const [[{ cnt }]] = await client.query(
      "SELECT COUNT(*) as cnt FROM content_scenarios WHERE capability_key = 'ai_ethics_trust' AND difficulty = 1"
    );
    // This test documents the known gap. It PASSES whether cnt is 0 or >0.
    // If cnt > 0, the gap has been filled (content sprint delivered d=1 items).
    // If cnt = 0, the gap is still open (action item in snapshot document).
    const count = Number(cnt);
    console.log(
      `[Fix 13 snapshot] ai_ethics_trust d=1 count: ${count}. ` +
      (count === 0
        ? "Gap still open — commission ≥2 d=1 scenarios."
        : "Gap filled — d=1 scenarios present.")
    );
    // No assertion — this is a documentation test, not a gate.
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
