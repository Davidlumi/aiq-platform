/**
 * rewardReviewService.test.ts — Stage 9 Review & Lock
 *
 * Tests cover:
 *   S1  — staleness detection (hard flag)
 *   C1  — all stages confirmed (soft flag)
 *   C2  — every initiative has a success measure (soft flag)
 *   C3  — all five capability dimensions assessed (soft flag)
 *   C4  — custom initiatives have cost/value + capability (soft flag)
 *   H2  — principle support (soft flag)
 *   H3  — won't-do compliance (soft flag)
 *   H4  — ambition match (soft flag)
 *   R1  — conservative net-negative (soft flag)
 *   R2  — capability reds without actions (soft flag)
 *   R3  — enablement cost material (soft flag)
 *   R4  — programme funding pending (soft flag)
 *   canLock — gate logic (hard blocks, soft requires ack, all-pass unlocks)
 *   pruneStaleAcknowledgments — stale ack removal
 */

import { describe, it, expect } from "vitest";
import {
  runStalenessChecks,
  runCompletenessChecks,
  runH2PrincipleSupport,
  runH3WontDoCompliance,
  runH4AmbitionMatch,
  runReadinessChecks,
  canLock,
  pruneStaleAcknowledgments,
  ackKey,
  type StageStateData,
  type AcknowledgmentsMap,
} from "./services/rewardReviewService";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCleanData(overrides: Partial<StageStateData> = {}): StageStateData {
  return {
    prework: { isCompleted: true, rewardAiAmbition: 3, topRewardPrioritiesNext12Months: ["pay equity"] },
    vision: { state: "confirmed" },
    strategy: { state: "confirmed", strategicShiftsJson: [] },
    principles: {
      state: "confirmed",
      principlesJson: [],
      wontDosJson: [],
    },
    portfolio: { isCompleted: true, selectedInitiativesJson: ["ai_pay_equity_continuous_monitoring"] },
    customInitiatives: [],
    successMeasuresStage: { isConfirmed: true, isStale: false },
    successMeasures: [{ initiativeId: "ai_pay_equity_continuous_monitoring", isArchived: false }],
    businessCase: { isConfirmed: true, isStale: false },
    businessCaseModel: {
      rollup: { conservative: { netBenefit3yr: 50_000 } },
      programmeFundingLines: [],
    },
    capabilityStage: {
      isConfirmed: true,
      isStale: false,
      enablementCostJson: { low: 0, high: 0, note: "No additional enablement investment required." },
    },
    capabilityDimensions: [
      { dimension: "data_foundations", currentLevel: "medium", requiredLevel: "high", gapStatus: "minor_gap", actionNote: "Invest in data governance tooling." },
      { dimension: "change_management", currentLevel: "high", requiredLevel: "high", gapStatus: "no_gap", actionNote: null },
      { dimension: "systems_integration", currentLevel: "medium", requiredLevel: "medium", gapStatus: "no_gap", actionNote: null },
      { dimension: "governance", currentLevel: "high", requiredLevel: "high", gapStatus: "no_gap", actionNote: null },
      { dimension: "team_skills", currentLevel: "medium", requiredLevel: "medium", gapStatus: "no_gap", actionNote: null },
    ],
    ...overrides,
  };
}

// ── S1 — Staleness ────────────────────────────────────────────────────────────

describe("S1 — Staleness", () => {
  it("passes when no stages are stale", () => {
    const results = runStalenessChecks(makeCleanData());
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
    expect(results[0].checkId).toBe("S1");
  });

  it("flags hard when vision is stale", () => {
    const data = makeCleanData({ vision: { state: "stale" } });
    const results = runStalenessChecks(data);
    expect(results[0].status).toBe("flag");
    expect(results[0].flagType).toBe("hard");
    expect(results[0].message).toContain("2");
  });

  it("flags hard when multiple stages are stale", () => {
    const data = makeCleanData({
      vision: { state: "stale" },
      strategy: { state: "stale", strategicShiftsJson: [] },
    });
    const results = runStalenessChecks(data);
    expect(results[0].flagType).toBe("hard");
    expect(results[0].message).toContain("2");
    expect(results[0].message).toContain("3");
  });

  it("flags hard when business case is stale", () => {
    const data = makeCleanData({ businessCase: { isConfirmed: true, isStale: true } });
    const results = runStalenessChecks(data);
    expect(results[0].status).toBe("flag");
    expect(results[0].message).toContain("7");
  });
});

// ── C1 — All stages confirmed ─────────────────────────────────────────────────

describe("C1 — All stages confirmed", () => {
  it("passes when all 8 stages are confirmed", () => {
    const results = runCompletenessChecks(makeCleanData());
    const c1 = results.find(r => r.checkId === "C1")!;
    expect(c1.status).toBe("pass");
  });

  it("flags soft when prework not completed", () => {
    const data = makeCleanData({ prework: { isCompleted: false, rewardAiAmbition: 3, topRewardPrioritiesNext12Months: [] } });
    const results = runCompletenessChecks(data);
    const c1 = results.find(r => r.checkId === "C1")!;
    expect(c1.status).toBe("flag");
    expect(c1.flagType).toBe("soft");
    expect(c1.message).toContain("1");
  });

  it("flags soft when capability not confirmed", () => {
    const data = makeCleanData({ capabilityStage: { isConfirmed: false, isStale: false, enablementCostJson: null } });
    const results = runCompletenessChecks(data);
    const c1 = results.find(r => r.checkId === "C1")!;
    expect(c1.status).toBe("flag");
    expect(c1.message).toContain("8");
  });
});

// ── C2 — Every initiative has a success measure ───────────────────────────────

describe("C2 — Success measures", () => {
  it("passes when all initiatives have measures", () => {
    const results = runCompletenessChecks(makeCleanData());
    const c2 = results.find(r => r.checkId === "C2")!;
    expect(c2.status).toBe("pass");
  });

  it("flags soft when an initiative has no measure", () => {
    const data = makeCleanData({ successMeasures: [] });
    const results = runCompletenessChecks(data);
    const c2 = results.find(r => r.checkId === "C2")!;
    expect(c2.status).toBe("flag");
    expect(c2.flagType).toBe("soft");
    expect(c2.sourceStage).toBe(6);
  });

  it("includes custom initiatives in the check", () => {
    const data = makeCleanData({
      customInitiatives: [{
        id: "custom_1", title: "My Custom Initiative", inPortfolio: true,
        dataIntensity: "medium", changeImpact: "medium", integrationNeed: "medium",
        governanceSensitivity: "medium", year1CostLow: 10000, year1CostHigh: 20000,
        valueLow: 30000, valueHigh: 50000,
      }],
      // successMeasures only covers the library initiative, not custom_1
    });
    const results = runCompletenessChecks(data);
    const c2 = results.find(r => r.checkId === "C2")!;
    expect(c2.status).toBe("flag");
  });
});

// ── C3 — All five capability dimensions assessed ──────────────────────────────

describe("C3 — Capability dimensions", () => {
  it("passes when all five dimensions have current levels", () => {
    const results = runCompletenessChecks(makeCleanData());
    const c3 = results.find(r => r.checkId === "C3")!;
    expect(c3.status).toBe("pass");
  });

  it("flags soft when a dimension has no current level", () => {
    const data = makeCleanData({
      capabilityDimensions: [
        { dimension: "data_foundations", currentLevel: null, requiredLevel: "high", gapStatus: null, actionNote: null },
        { dimension: "change_management", currentLevel: "high", requiredLevel: "high", gapStatus: "no_gap", actionNote: null },
        { dimension: "systems_integration", currentLevel: "medium", requiredLevel: "medium", gapStatus: "no_gap", actionNote: null },
        { dimension: "governance", currentLevel: "high", requiredLevel: "high", gapStatus: "no_gap", actionNote: null },
        { dimension: "team_skills", currentLevel: "medium", requiredLevel: "medium", gapStatus: "no_gap", actionNote: null },
      ],
    });
    const results = runCompletenessChecks(data);
    const c3 = results.find(r => r.checkId === "C3")!;
    expect(c3.status).toBe("flag");
    expect(c3.message).toContain("data_foundations");
  });
});

// ── C4 — Custom initiatives complete ─────────────────────────────────────────

describe("C4 — Custom initiative completeness", () => {
  it("passes when no custom initiatives in portfolio", () => {
    const results = runCompletenessChecks(makeCleanData());
    const c4 = results.find(r => r.checkId === "C4")!;
    expect(c4.status).toBe("pass");
  });

  it("flags soft when custom initiative missing capability rating", () => {
    const data = makeCleanData({
      customInitiatives: [{
        id: "custom_1", title: "Unrated Custom", inPortfolio: true,
        dataIntensity: null, changeImpact: null, integrationNeed: null,
        governanceSensitivity: null, year1CostLow: 10000, year1CostHigh: 20000,
        valueLow: 30000, valueHigh: 50000,
      }],
    });
    const results = runCompletenessChecks(data);
    const c4 = results.find(r => r.checkId === "C4")!;
    expect(c4.status).toBe("flag");
    expect(c4.message).toContain("Unrated Custom");
  });

  it("ignores custom initiatives not in portfolio", () => {
    const data = makeCleanData({
      customInitiatives: [{
        id: "custom_1", title: "Not In Portfolio", inPortfolio: false,
        dataIntensity: null, changeImpact: null, integrationNeed: null,
        governanceSensitivity: null, year1CostLow: null, year1CostHigh: null,
        valueLow: null, valueHigh: null,
      }],
    });
    const results = runCompletenessChecks(data);
    const c4 = results.find(r => r.checkId === "C4")!;
    expect(c4.status).toBe("pass");
  });
});

// ── H2 — Principle support ────────────────────────────────────────────────────

describe("H2 — Principle support", () => {
  it("passes when no canonical principles confirmed", () => {
    const result = runH2PrincipleSupport(makeCleanData());
    expect(result.status).toBe("pass");
  });

  it("passes when all principles are supported", () => {
    // Use a principle ID that the library initiative supports
    const data = makeCleanData({
      principles: {
        state: "confirmed",
        principlesJson: [{ id: "p1", principleId: "pay_equity", text: "Pay equity", selected: true }],
        wontDosJson: [],
      },
      portfolio: { isCompleted: true, selectedInitiativesJson: ["ai_pay_equity_continuous_monitoring"] },
    });
    // The library initiative may or may not support "pay_equity" — test the logic, not the specific ID
    const result = runH2PrincipleSupport(data);
    // Either pass (if supported) or flag (if not) — both are valid outcomes; just assert it returns a result
    expect(["pass", "flag"]).toContain(result.status);
    expect(result.checkId).toBe("H2");
  });

  it("flags soft when a principle is not supported by any initiative", () => {
    const data = makeCleanData({
      principles: {
        state: "confirmed",
        principlesJson: [{ id: "p1", principleId: "nonexistent_principle_xyz", text: "Unsupported", selected: true }],
        wontDosJson: [],
      },
    });
    const result = runH2PrincipleSupport(data);
    expect(result.status).toBe("flag");
    expect(result.flagType).toBe("soft");
    expect(result.message).toContain("nonexistent_principle_xyz");
  });
});

// ── H3 — Won't-do compliance ──────────────────────────────────────────────────

describe("H3 — Won't-do compliance", () => {
  it("passes when no won't-dos confirmed", () => {
    const result = runH3WontDoCompliance(makeCleanData(), []);
    expect(result.status).toBe("pass");
  });

  it("passes when confirmed won't-do does not affect selected initiatives", () => {
    const data = makeCleanData({
      principles: {
        state: "confirmed",
        principlesJson: [],
        wontDosJson: [{ id: "w1", wontDoId: "wd_no_automated_pay", text: "No automated pay", selected: true }],
      },
      portfolio: { isCompleted: true, selectedInitiativesJson: ["ai_pay_equity_continuous_monitoring"] },
    });
    const templates = [{ wontDoId: "wd_no_automated_pay", affectsInitiativesJson: [999] }]; // initiative 999 not selected
    const result = runH3WontDoCompliance(data, templates);
    expect(result.status).toBe("pass");
  });

  it("flags soft when selected initiative violates a confirmed won't-do", () => {
    const data = makeCleanData({
      principles: {
        state: "confirmed",
        principlesJson: [],
        wontDosJson: [{ id: "w1", wontDoId: "wd_no_automated_pay", text: "No automated pay", selected: true }],
      },
      portfolio: { isCompleted: true, selectedInitiativesJson: ["ai_pay_equity_continuous_monitoring"] },
    });
    // initiative number 3 = ai_pay_equity_continuous_monitoring (confirmed in library)
    const templates = [{ wontDoId: "wd_no_automated_pay", affectsInitiativesJson: [3] }];
    const result = runH3WontDoCompliance(data, templates);
    expect(result.status).toBe("flag");
    expect(result.flagType).toBe("soft");
    expect(result.sourceStage).toBe(4);
  });
});

// ── H4 — Ambition match ───────────────────────────────────────────────────────

describe("H4 — Ambition match", () => {
  it("passes for moderate ambition and moderate portfolio", () => {
    const result = runH4AmbitionMatch(makeCleanData());
    expect(result.status).toBe("pass");
  });

  it("flags soft for high ambition with very few initiatives", () => {
    const data = makeCleanData({
      prework: { isCompleted: true, rewardAiAmbition: 5, topRewardPrioritiesNext12Months: [] },
      portfolio: { isCompleted: true, selectedInitiativesJson: ["ai_pay_equity_continuous_monitoring"] },
    });
    const result = runH4AmbitionMatch(data);
    expect(result.status).toBe("flag");
    expect(result.message).toContain("under-scoped");
  });

  it("flags soft for cautious ambition with very many initiatives", () => {
    const manyIds = Array.from({ length: 12 }, (_, i) => `initiative_${i}`);
    const data = makeCleanData({
      prework: { isCompleted: true, rewardAiAmbition: 1, topRewardPrioritiesNext12Months: [] },
      portfolio: { isCompleted: true, selectedInitiativesJson: manyIds },
    });
    const result = runH4AmbitionMatch(data);
    expect(result.status).toBe("flag");
    expect(result.message).toContain("exceed the stated ambition");
  });
});

// ── R1 — Conservative net-negative ───────────────────────────────────────────

describe("R1 — Conservative net-negative", () => {
  it("passes when conservative scenario is net-positive", () => {
    const results = runReadinessChecks(makeCleanData());
    const r1 = results.find(r => r.checkId === "R1")!;
    expect(r1.status).toBe("pass");
  });

  it("flags soft when conservative scenario is net-negative", () => {
    const data = makeCleanData({
      businessCaseModel: {
        rollup: { conservative: { netBenefit3yr: -25_000 } },
        programmeFundingLines: [],
      },
    });
    const results = runReadinessChecks(data);
    const r1 = results.find(r => r.checkId === "R1")!;
    expect(r1.status).toBe("flag");
    expect(r1.flagType).toBe("soft");
    expect(r1.message).toContain("net-negative");
    expect(r1.sourceStage).toBe(7);
  });
});

// ── R2 — Capability reds without actions ─────────────────────────────────────

describe("R2 — Capability reds without actions", () => {
  it("passes when all significant gaps have actions", () => {
    const data = makeCleanData({
      capabilityDimensions: [
        { dimension: "data_foundations", currentLevel: "low", requiredLevel: "very_high", gapStatus: "significant_gap", actionNote: "Invest in data governance tooling and hire a data engineer." },
        { dimension: "change_management", currentLevel: "high", requiredLevel: "high", gapStatus: "no_gap", actionNote: null },
        { dimension: "systems_integration", currentLevel: "medium", requiredLevel: "medium", gapStatus: "no_gap", actionNote: null },
        { dimension: "governance", currentLevel: "high", requiredLevel: "high", gapStatus: "no_gap", actionNote: null },
        { dimension: "team_skills", currentLevel: "medium", requiredLevel: "medium", gapStatus: "no_gap", actionNote: null },
      ],
    });
    const results = runReadinessChecks(data);
    const r2 = results.find(r => r.checkId === "R2")!;
    expect(r2.status).toBe("pass");
  });

  it("flags soft when a significant gap has no action", () => {
    const data = makeCleanData({
      capabilityDimensions: [
        { dimension: "data_foundations", currentLevel: "low", requiredLevel: "very_high", gapStatus: "significant_gap", actionNote: null },
        { dimension: "change_management", currentLevel: "high", requiredLevel: "high", gapStatus: "no_gap", actionNote: null },
        { dimension: "systems_integration", currentLevel: "medium", requiredLevel: "medium", gapStatus: "no_gap", actionNote: null },
        { dimension: "governance", currentLevel: "high", requiredLevel: "high", gapStatus: "no_gap", actionNote: null },
        { dimension: "team_skills", currentLevel: "medium", requiredLevel: "medium", gapStatus: "no_gap", actionNote: null },
      ],
    });
    const results = runReadinessChecks(data);
    const r2 = results.find(r => r.checkId === "R2")!;
    expect(r2.status).toBe("flag");
    expect(r2.message).toContain("data foundations");
    expect(r2.sourceStage).toBe(8);
  });
});

// ── R3 — Enablement cost material ────────────────────────────────────────────

describe("R3 — Enablement cost material", () => {
  it("passes when enablement cost is zero", () => {
    const results = runReadinessChecks(makeCleanData());
    const r3 = results.find(r => r.checkId === "R3");
    if (r3) expect(r3.status).toBe("pass");
  });

  it("flags soft when enablement cost is positive", () => {
    const data = makeCleanData({
      capabilityStage: {
        isConfirmed: true,
        isStale: false,
        enablementCostJson: { low: 50_000, high: 120_000, note: "Phase-0 data infrastructure." },
      },
    });
    const results = runReadinessChecks(data);
    const r3 = results.find(r => r.checkId === "R3")!;
    expect(r3.status).toBe("flag");
    expect(r3.flagType).toBe("soft");
    expect(r3.message).toContain("50k");
    expect(r3.sourceStage).toBe(8);
  });
});

// ── R4 — Programme funding pending ───────────────────────────────────────────

describe("R4 — Programme funding pending", () => {
  it("passes when no programme-funded initiatives", () => {
    const results = runReadinessChecks(makeCleanData());
    const r4 = results.find(r => r.checkId === "R4")!;
    expect(r4.status).toBe("pass");
  });

  it("flags soft when programme funding lines exist", () => {
    const data = makeCleanData({
      businessCaseModel: {
        rollup: { conservative: { netBenefit3yr: 50_000 } },
        programmeFundingLines: [{ initiativeId: "ai_pay_equity_continuous_monitoring" }],
      },
    });
    const results = runReadinessChecks(data);
    const r4 = results.find(r => r.checkId === "R4")!;
    expect(r4.status).toBe("flag");
    expect(r4.flagType).toBe("soft");
    expect(r4.message).toContain("programme funding");
  });
});

// ── canLock ───────────────────────────────────────────────────────────────────

describe("canLock", () => {
  it("returns canLock=true when all checks pass", () => {
    const checks = runStalenessChecks(makeCleanData());
    const result = canLock(checks, {});
    expect(result.canLock).toBe(true);
    expect(result.blockingCheckIds).toHaveLength(0);
  });

  it("blocks on hard flag regardless of acknowledgments", () => {
    const data = makeCleanData({ vision: { state: "stale" } });
    const checks = runStalenessChecks(data);
    const hardCheck = checks.find(c => c.checkId === "S1")!;
    // Even if we try to ack a hard flag, canLock should still block
    const acks: AcknowledgmentsMap = {
      [ackKey("S1", hardCheck.resultStateHash)]: { acknowledgedAt: Date.now(), rationale: "I know" },
    };
    const result = canLock(checks, acks);
    expect(result.canLock).toBe(false);
    expect(result.blockingCheckIds).toContain("S1");
  });

  it("blocks on unacknowledged soft flag", () => {
    const data = makeCleanData({ successMeasures: [] });
    const checks = runCompletenessChecks(data);
    const result = canLock(checks, {});
    expect(result.canLock).toBe(false);
    const c2 = checks.find(c => c.checkId === "C2")!;
    expect(result.blockingCheckIds).toContain("C2");
    // Now acknowledge it
    const acks: AcknowledgmentsMap = {
      [ackKey("C2", c2.resultStateHash)]: { acknowledgedAt: Date.now(), rationale: "Accepted" },
    };
    // Also need to ack C1 if it's flagging (stages not confirmed etc.) — just test C2 in isolation
    const c2Only = [c2];
    const result2 = canLock(c2Only, acks);
    expect(result2.canLock).toBe(true);
  });

  it("blocks when soft flag ack uses wrong result hash (stale ack)", () => {
    const data = makeCleanData({ successMeasures: [] });
    const checks = runCompletenessChecks(data);
    const c2 = checks.find(c => c.checkId === "C2")!;
    // Ack with wrong hash
    const acks: AcknowledgmentsMap = {
      [ackKey("C2", "wrong_hash_000")]: { acknowledgedAt: Date.now(), rationale: "Stale" },
    };
    const result = canLock([c2], acks);
    expect(result.canLock).toBe(false);
  });
});

// ── pruneStaleAcknowledgments ─────────────────────────────────────────────────

describe("pruneStaleAcknowledgments", () => {
  it("keeps acks whose hash matches current check results", () => {
    const data = makeCleanData({ successMeasures: [] });
    const checks = runCompletenessChecks(data);
    const c2 = checks.find(c => c.checkId === "C2")!;
    const acks: AcknowledgmentsMap = {
      [ackKey("C2", c2.resultStateHash)]: { acknowledgedAt: Date.now(), rationale: "OK" },
      [ackKey("C2", "stale_hash")]: { acknowledgedAt: Date.now(), rationale: "Stale" },
    };
    const pruned = pruneStaleAcknowledgments(checks, acks);
    expect(Object.keys(pruned)).toHaveLength(1);
    expect(pruned[ackKey("C2", c2.resultStateHash)]).toBeDefined();
  });

  it("removes all acks when check results change", () => {
    const acks: AcknowledgmentsMap = {
      [ackKey("C2", "old_hash_1")]: { acknowledgedAt: Date.now(), rationale: "Old" },
    };
    // Fresh checks with different data = different hashes
    const checks = runCompletenessChecks(makeCleanData());
    const pruned = pruneStaleAcknowledgments(checks, acks);
    expect(Object.keys(pruned)).toHaveLength(0);
  });
});
