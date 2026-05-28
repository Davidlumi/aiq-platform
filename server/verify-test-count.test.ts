/**
 * server/verify-test-count.test.ts
 *
 * Fix 17 (P0) — AiQ Product Integrity Brief v2, 28 May 2026.
 *
 * RECURRENCE LOCK — TWO-LAYER DESIGN
 * ─────────────────────────────────────────────────────────────────────────────
 * Layer 1 (this file): Static arithmetic check. Asserts that the per-file
 *   breakdown table sums to PUBLISHED_TOTAL, and that every listed file exists.
 *   Runs inside vitest — fast, no external dependencies.
 *
 * Layer 2 (scripts/verify-test-count.mjs): Programmatic runner. Invokes
 *   `vitest run --reporter=json` as a separate process, reads the JSON output,
 *   and asserts the live passing count equals PUBLISHED_TOTAL. This is the
 *   authoritative programmatic check (no log file, no stale path).
 *   Run: pnpm verify-test-count
 *
 * WHY TWO LAYERS: vitest cannot spawn itself inside a test (recursive process
 * causes timeout). The programmatic runner is therefore a CI script, not a
 * test. Both layers must agree on PUBLISHED_TOTAL.
 *
 * NOTE: .todo tests are excluded from numPassedTests. PUBLISHED_TOTAL tracks
 * passing tests only. The 2 .todo tests in content-balance-band.test.ts are
 * excluded (1950 total - 2 .todo = 1948 passing).
 *
 * IMPORTANT: This file itself contributes 2 tests to the suite total.
 * When adding or removing test files, update PUBLISHED_TOTAL here AND in
 * scripts/verify-test-count.mjs AND in the Ground Truth Record
 * (references/content-scenario-distribution-ground-truth.md).
 *
 * Published total: 1948 passing (checkpoint a49810e9 + Fix 16 amend, 28 May 2026)
 *
 * Run: pnpm test server/verify-test-count.test.ts
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

/**
 * Published total of PASSING tests (excludes .todo).
 * 1950 total - 2 .todo (content-balance-band) = 1948 passing.
 */
const PUBLISHED_TOTAL = 1978;

/**
 * Per-file breakdown — passing tests only (excludes .todo).
 * Source: programmatic pnpm test --reporter=json run at checkpoint a49810e9,
 * 28 May 2026 18:35 UTC, updated for Fix 16 amendment (2 .todo converted).
 *
 * NOTE: This breakdown is documentation of the ground-truth run.
 * The authoritative programmatic check is scripts/verify-test-count.mjs.
 * Update this table whenever tests are added or removed.
 */
const GROUND_TRUTH_BREAKDOWN: Record<string, number> = {
  "server/strategyEngine.test.ts": 86,
  "server/backgroundInputs.test.ts": 86,
  "server/fitImpactEngine.test.ts": 84,
  "server/meridian-canonical.test.ts": 60,
  "server/vocabBlacklist.test.ts": 55,
  "server/dashboardV2.test.ts": 55,
  "server/company-profile-qa.test.ts": 55,
  "server/rewardInitiatives.test.ts": 54,
  "server/rewardCapabilityAssessment.test.ts": 49,
  "server/assessment.stress.test.ts": 47,
  "server/adversarial-methodology-gaming.test.ts": 47,
  "server/capabilityLink.test.ts": 46,
  "server/rewardBusinessCase.test.ts": 44,
  "server/adversarial-methodology-audit.test.ts": 42,
  "server/rewardReviewService.test.ts": 41,
  "server/rewardOutputs.test.ts": 37,
  "server/reward-cross-tenant-isolation.test.ts": 37,
  "server/increment3-stage9-10.test.ts": 37,
  "server/assessment/scoringEngine.test.ts": 37,
  "server/operationalMaturity.test.ts": 35,
  "server/rewardVision.test.ts": 32,
  "server/adversarial-llm-failures.test.ts": 30,
  "server/adversarial-access-control.test.ts": 30,
  "server/semanticPrincipleAlignment.test.ts": 29,
  "server/reasoning-benchmarks.test.ts": 29,
  "server/ail.test.ts": 29,
  "server/adversarial-session-lifecycle.test.ts": 29,
  "server/rewardPrinciples.test.ts": 28,
  "server/content.test.ts": 28,
  "server/llm-checkers.test.ts": 27,
  "server/classification-explanation.test.ts": 27,
  "server/assessment-engine-improvements.test.ts": 27,
  "server/adversarial-data-edge-cases.test.ts": 26,
  "server/scoring-config-overrides.test.ts": 23,
  "server/rewardStrategy.test.ts": 23,
  "server/failure-modes.v2-2.test.ts": 23,
  "server/dfs-profile-crosscheck.test.ts": 22,
  "server/aiq.test.ts": 21,
  "server/stage8-capability.test.ts": 20,
  "server/confidence-floor.test.ts": 20,
  "server/company-profile.test.ts": 20,
  "server/adversarial-timing-anomalies.test.ts": 20,
  "server/acme-validation.test.ts": 20,
  "server/scoring.thin-signal.test.ts": 19,
  "server/save-resume.test.ts": 19,
  "server/question-flags.test.ts": 19,
  "server/dashboard.router.test.ts": 19,
  "server/subsector-benchmark.test.ts": 18,
  "server/gate.test.ts": 18,
  "server/learning.dashboard.test.ts": 17,
  "server/initiativeDiscovery.test.ts": 16,
  "server/anti-gaming.outcome-conditional.test.ts": 16,
  "server/northbridge-canonical.test.ts": 14,
  "server/canonical-facts.test.ts": 14,
  "server/stage9-10-gate.test.ts": 13,
  "server/value-page.test.ts": 12,
  "server/talking-points.test.ts": 12,
  "server/rewardSuccessMeasures.test.ts": 12,
  "server/qa-acme-walkthrough.test.ts": 12,
  "server/qa-url-bypass.test.ts": 10,
  "server/boardReportRubric.test.ts": 10,
  "server/sse.test.ts": 7,
  "server/scoring.v2-2.test.ts": 7,
  "server/risk-acknowledgements.test.ts": 7,
  "server/rewardInitiatives.cascade.test.ts": 7,
  "server/pdf.strategy.test.ts": 7,
  "server/debug.test.ts": 5,
  "server/content-distribution-live.test.ts": 5,
  "server/waitlist.test.ts": 4,
  "server/routers/leads.test.ts": 4,
  "server/email.test.ts": 3,
  "server/reward-taxonomy-canonical.test.ts": 9,
  "server/ui-copy-snapshot.test.ts": 5,
  "server/llm-column-schema-guard.test.ts": 11,
  "server/post-migration-bank.test.ts": 5,
  // content-balance-band: 1 passing + 2 .todo (excluded from PUBLISHED_TOTAL)
  "server/content-balance-band.test.ts": 1,
  "server/auth.logout.test.ts": 1,
  "server/acme-engine-dump.test.ts": 1,
  // THIS FILE contributes 2 passing tests — included here for completeness
  "server/verify-test-count.test.ts": 2,
};

const PROJECT_ROOT = resolve(__dirname, "..");

describe("Ground Truth Record — Recurrence Lock (Fix 17)", () => {
  /**
   * DOCUMENTATION CHECK (Layer 1): the breakdown table sums to PUBLISHED_TOTAL.
   * Static arithmetic — does not invoke the runner.
   * Ensures documentation stays consistent with the published total.
   *
   * For the authoritative programmatic check, run: pnpm verify-test-count
   * (scripts/verify-test-count.mjs — invokes vitest as a child process)
   */
  it("sum of per-file breakdown equals the published total", () => {
    const sum = Object.values(GROUND_TRUTH_BREAKDOWN).reduce((a, b) => a + b, 0);
    expect(
      sum,
      `Breakdown sums to ${sum} but PUBLISHED_TOTAL is ${PUBLISHED_TOTAL}. ` +
      `Update PUBLISHED_TOTAL here, in scripts/verify-test-count.mjs, and in ` +
      `references/content-scenario-distribution-ground-truth.md when adding/removing tests.`
    ).toBe(PUBLISHED_TOTAL);
  });

  it("every file in the breakdown exists in the project", () => {
    const missing: string[] = [];
    for (const filePath of Object.keys(GROUND_TRUTH_BREAKDOWN)) {
      const abs = resolve(PROJECT_ROOT, filePath);
      if (!existsSync(abs)) {
        missing.push(filePath);
      }
    }
    expect(
      missing,
      `These files are listed in the breakdown but do not exist: ${missing.join(", ")}. ` +
      `Remove them from GROUND_TRUTH_BREAKDOWN or restore the files.`
    ).toHaveLength(0);
  });
});
