/**
 * WS1.1/WS1.2: Scoring Config Loader
 *
 * Reads the active scoring_config row from the database and caches it in memory
 * for the lifetime of the process (TTL: 5 minutes). This avoids a DB round-trip
 * on every score computation while still picking up admin-applied config changes
 * within a reasonable window.
 *
 * v2.2 adds contributionCap, contributionMultiplier (sum+clip formula params)
 * and blockingFailureMinItems, downgradeFailureMinItems (failure-mode thresholds).
 */

import { getDb } from "../db";
import { scoringConfig } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface ActiveScoringConfig {
  version: number;
  intercept: number;
  multiplier: number;
  // WS1.1: v2.2 sum+clip formula params (undefined = use v2.1 mean-based formula)
  contributionCap?: number;
  contributionMultiplier?: number;
  // WS1.2: failure-mode evidence thresholds
  blockingFailureMinItems: number;
  downgradeFailureMinItems: number;
  calibrationSource: string;
}

const DEFAULT_CONFIG: ActiveScoringConfig = {
  version: 1,
  intercept: 50,
  multiplier: 50,
  // v2.1 defaults — no sum+clip params means legacy formula is used
  contributionCap: undefined,
  contributionMultiplier: undefined,
  blockingFailureMinItems: 2,
  downgradeFailureMinItems: 1,
  calibrationSource: "synthetic_default",
};

let _cache: ActiveScoringConfig | null = null;
let _cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Return the active scoring config.
 * Falls back to DEFAULT_CONFIG if no active row exists or DB is unavailable.
 */
export async function getActiveScoringConfig(): Promise<ActiveScoringConfig> {
  const now = Date.now();
  if (_cache && now < _cacheExpiresAt) return _cache;

  try {
    const db = await getDb();
    if (!db) throw new Error('DB unavailable');
    const rows = await db
      .select()
      .from(scoringConfig)
      .where(eq(scoringConfig.isActive, true))
      .limit(1);

    if (rows.length === 0) {
      _cache = DEFAULT_CONFIG;
    } else {
      const row = rows[0];
      const cap = row.contributionCap !== null && row.contributionCap !== undefined
        ? parseFloat(row.contributionCap as unknown as string)
        : undefined;
      const mult = row.contributionMultiplier !== null && row.contributionMultiplier !== undefined
        ? parseFloat(row.contributionMultiplier as unknown as string)
        : undefined;
      _cache = {
        version: row.version,
        intercept: parseFloat(row.capabilityScoreIntercept as unknown as string),
        multiplier: parseFloat(row.capabilityScoreMultiplier as unknown as string),
        contributionCap: cap,
        contributionMultiplier: mult,
        blockingFailureMinItems: row.blockingFailureMinItems ?? 2,
        downgradeFailureMinItems: row.downgradeFailureMinItems ?? 1,
        calibrationSource: row.calibrationSource,
      };
    }
  } catch {
    // DB unavailable — use default to avoid blocking score computation
    _cache = DEFAULT_CONFIG;
  }

  _cacheExpiresAt = now + CACHE_TTL_MS;
  return _cache;
}

/** Invalidate the cache (call after admin updates the active config) */
export function invalidateScoringConfigCache(): void {
  _cache = null;
  _cacheExpiresAt = 0;
}

/** Synchronous fallback — returns cached value or DEFAULT_CONFIG */
export function getScoringConfigSync(): ActiveScoringConfig {
  return _cache ?? DEFAULT_CONFIG;
}
