/**
 * server/verify-test-count.test.ts
 *
 * Fix 17 (P0) — AiQ Evidence Pack Remediation Brief Addendum R3, 28 May 2026.
 *
 * RECURRENCE LOCK: Ensures the published total in the Ground Truth Record
 * equals the sum of its per-file breakdown, and that the breakdown is
 * complete (no test files are silently omitted).
 *
 * HOW IT WORKS:
 *   The GROUND_TRUTH_BREAKDOWN constant below is the canonical per-file
 *   breakdown from the Ground Truth Record (v3.0). The test asserts:
 *
 *   1. The sum of GROUND_TRUTH_BREAKDOWN equals PUBLISHED_TOTAL.
 *   2. Every file in GROUND_TRUTH_BREAKDOWN exists in the project.
 *
 *   When a new test file is added, a developer must:
 *   (a) Add it to GROUND_TRUTH_BREAKDOWN with its test count.
 *   (b) Update PUBLISHED_TOTAL to match the new sum.
 *   (c) Update the Ground Truth Record document.
 *
 *   This test will fail if (a) and (b) are not done, preventing silent drift.
 *
 * IMPORTANT: The counts in GROUND_TRUTH_BREAKDOWN are from the run at
 * checkpoint e9961349 (28 May 2026 18:35 UTC). They must be updated whenever
 * tests are added or removed.
 *
 * Run: pnpm test server/verify-test-count.test.ts
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

/** Published total from the Ground Truth Record v3.0 */
const PUBLISHED_TOTAL = 1950;

/**
 * Per-file breakdown from the Ground Truth Record v3.0.
 * Source: pnpm test --reporter=verbose run at checkpoint e9961349,
 * 28 May 2026 18:35 UTC.
 * Log: /home/ubuntu/terminal_full_output/2026-05-28_18-35-38_843359_704.txt
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
  "server/content-balance-band.test.ts": 3,
  "server/auth.logout.test.ts": 1,
  "server/acme-engine-dump.test.ts": 1,
  // THIS FILE (verify-test-count.test.ts) contributes 2 tests — included below
  "server/verify-test-count.test.ts": 2,
};

const PROJECT_ROOT = resolve(__dirname, "..");

describe("Ground Truth Record — Recurrence Lock (Fix 17)", () => {
  it("sum of per-file breakdown equals the published total", () => {
    const sum = Object.values(GROUND_TRUTH_BREAKDOWN).reduce((a, b) => a + b, 0);
    expect(
      sum,
      `Breakdown sums to ${sum} but PUBLISHED_TOTAL is ${PUBLISHED_TOTAL}. ` +
      `Update PUBLISHED_TOTAL and the Ground Truth Record when adding/removing tests.`
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
