/**
 * Fix 8 — Post-Migration Bank Test
 *
 * Asserts that the live scenario bank is in a clean post-migration state:
 * - All 6 canonical domain keys are present
 * - No legacy keys remain
 * - Total bank size ≥ 100
 * - Every scenario has a non-null, non-empty capability_key
 *
 * Migration cutoff: 2026-05-28T12:36:10Z
 * See: references/fix8-historical-assessment-remediation.md
 *
 * NOTE: This is a live-DB health check, not a pure unit test.
 * It runs against the production database and will fail in a fresh dev
 * environment that has not had the migration applied.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { contentScenarios } from "../drizzle/schema";
import { isNotNull, ne, sql } from "drizzle-orm";

const CANONICAL_KEYS = [
  "ai_ethics_trust",
  "ai_output_evaluation",
  "ai_workflow_design",
  "ai_interaction",
  "ai_change_leadership",
  "workforce_ai_readiness",
] as const;

const LEGACY_KEYS = [
  "judgement",
  "execution",
  "appropriateness",
  "data_insight",
  "governance", // legacy assessment domain — distinct from reward_governance
];

const MIGRATION_CUTOFF = "2026-05-28T12:36:10Z";
const MIN_BANK_SIZE = 100;

let db: Awaited<ReturnType<typeof getDb>>;

beforeAll(async () => {
  db = await getDb();
});

describe(`Post-Migration Bank Health Check (Fix 8, cutoff: ${MIGRATION_CUTOFF})`, () => {
  it("database connection is available", () => {
    expect(db, "DB unavailable — this test requires a live database connection").toBeTruthy();
  });

  it(`total bank size is ≥ ${MIN_BANK_SIZE} scenarios`, async () => {
    if (!db) return;
    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(contentScenarios);
    console.log(`[Fix 8] Total bank size: ${total}`);
    expect(total).toBeGreaterThanOrEqual(MIN_BANK_SIZE);
  });

  it("all 6 canonical domain keys are present in the bank", async () => {
    if (!db) return;
    const rows = await db
      .select({ key: contentScenarios.capabilityKey, cnt: sql<number>`COUNT(*)` })
      .from(contentScenarios)
      .groupBy(contentScenarios.capabilityKey);

    const presentKeys = new Set(rows.map((r) => r.key));
    console.log("[Fix 8] Keys in bank:", [...presentKeys].sort().join(", "));

    for (const key of CANONICAL_KEYS) {
      expect(presentKeys, `Canonical key '${key}' is missing from the bank`).toContain(key);
    }
  });

  it("no legacy capability_key values remain in the bank", async () => {
    if (!db) return;
    const rows = await db
      .select({ key: contentScenarios.capabilityKey, cnt: sql<number>`COUNT(*)` })
      .from(contentScenarios)
      .groupBy(contentScenarios.capabilityKey);

    const legacyFound = rows
      .filter((r) => LEGACY_KEYS.includes(r.key))
      .map((r) => `${r.key} (${r.cnt} rows)`);

    if (legacyFound.length > 0) {
      console.error("[Fix 8] Legacy keys still present:", legacyFound);
    }
    expect(legacyFound, `Legacy keys found in bank: ${legacyFound.join(", ")}`).toHaveLength(0);
  });

  it("every scenario has a non-null, non-empty capability_key", async () => {
    if (!db) return;
    const [{ nullCount }] = await db
      .select({ nullCount: sql<number>`COUNT(*)` })
      .from(contentScenarios)
      .where(sql`capability_key IS NULL OR capability_key = ''`);

    expect(nullCount, `${nullCount} scenarios have null or empty capability_key`).toBe(0);
  });
});
