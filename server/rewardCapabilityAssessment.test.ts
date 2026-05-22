/**
 * Stage 8 — Reward Capability Assessment Tests
 *
 * Tests:
 *   Library: all 30 initiatives have capabilityProfile with valid fields
 *   Service: computeRequiredLevels, deriveGapStatus, deriveSequencingFlags, computeEnablementCost, buildCapabilityRiskNote
 *   Stage 10 wiring: capability section populated when confirmed, placeholder when not
 */

import { describe, it, expect } from "vitest";
import { REWARD_INITIATIVE_LIBRARY, getRewardInitiative } from "../shared/rewardInitiativeLibrary";
import {
  CAPABILITY_DIMENSIONS,
  DIMENSION_META,
  computeRequiredLevels,
  seedCurrentLevelsFromMaturity,
  deriveGapStatus,
  deriveSequencingFlags,
  computeEnablementCost,
  buildCapabilityRiskNote,
  type CapabilityDimension,
  type CapabilityLevel,
  type SequencingFlag,
} from "./services/rewardCapabilityService";
import { assembleReport, computeStateHash } from "./services/rewardOutputs";

// ── Library tests ─────────────────────────────────────────────────────────────

describe("Stage 8 library — capabilityProfile", () => {
  it("all 30 initiatives have a capabilityProfile", () => {
    const missing = REWARD_INITIATIVE_LIBRARY.filter((i) => !i.capabilityProfile);
    expect(missing.map((i) => i.id)).toEqual([]);
  });

  it("all capabilityProfile entries have the four required fields", () => {
    const invalid: string[] = [];
    for (const initiative of REWARD_INITIATIVE_LIBRARY) {
      const cp = initiative.capabilityProfile;
      if (!cp) { invalid.push(`${initiative.id}: missing`); continue; }
      if (!cp.dataIntensity) invalid.push(`${initiative.id}: missing dataIntensity`);
      if (!cp.changeImpact) invalid.push(`${initiative.id}: missing changeImpact`);
      if (!cp.integrationNeed) invalid.push(`${initiative.id}: missing integrationNeed`);
      if (!cp.governanceSensitivity) invalid.push(`${initiative.id}: missing governanceSensitivity`);
    }
    expect(invalid).toEqual([]);
  });

  it("all capabilityProfile fields are valid levels (low | medium | high)", () => {
    const VALID_LEVELS: CapabilityLevel[] = ["low", "medium", "high", "very_high"];
    const invalid: string[] = [];
    for (const initiative of REWARD_INITIATIVE_LIBRARY) {
      const cp = initiative.capabilityProfile;
      if (!cp) continue;
      for (const [field, level] of Object.entries(cp)) {
        if (!VALID_LEVELS.includes(level as CapabilityLevel)) {
          invalid.push(`${initiative.id}.${field}: ${level}`);
        }
      }
    }
    expect(invalid).toEqual([]);
  });

  it("DIMENSION_META has an entry for every CAPABILITY_DIMENSIONS value", () => {
    for (const dim of CAPABILITY_DIMENSIONS) {
      expect(DIMENSION_META[dim]).toBeDefined();
      expect(DIMENSION_META[dim].label).toBeTruthy();
      expect(DIMENSION_META[dim].description).toBeTruthy();
    }
  });
});

// ── Service tests ─────────────────────────────────────────────────────────────

describe("computeRequiredLevels", () => {
  it("always returns all 5 dimensions even for empty portfolio", () => {
    const result = computeRequiredLevels([]);
    expect(result).toHaveLength(5);
    for (const req of result) {
      expect(CAPABILITY_DIMENSIONS).toContain(req.dimension);
    }
  });

  it("returns requirements for a known initiative", () => {
    const result = computeRequiredLevels(["ai_compensation_recommendation_engine"]);
    expect(result).toHaveLength(5);
    for (const req of result) {
      expect(CAPABILITY_DIMENSIONS).toContain(req.dimension);
      expect(["low", "medium", "high", "very_high"]).toContain(req.requiredLevel);
      expect(req.label).toBeTruthy();
    }
  });

  it("escalates to very_high when peak is high AND ≥3 initiatives are high on that dimension", () => {
    // Find 3+ initiatives with high dataIntensity
    const highDataIds = REWARD_INITIATIVE_LIBRARY
      .filter((i) => i.capabilityProfile?.dataIntensity === "high")
      .map((i) => i.id)
      .slice(0, 4);
    expect(highDataIds.length).toBeGreaterThanOrEqual(3);

    const result = computeRequiredLevels(highDataIds);
    const dataFoundations = result.find((r) => r.dimension === "data_foundations");
    expect(dataFoundations?.requiredLevel).toBe("very_high");
    expect(dataFoundations?.escalated).toBe(true);
    expect(dataFoundations?.escalationReason).toContain("≥3 threshold");
  });

  it("does NOT escalate when only 1-2 initiatives are high on a dimension", () => {
    // Find exactly 2 initiatives with high dataIntensity
    const twoHighDataIds = REWARD_INITIATIVE_LIBRARY
      .filter((i) => i.capabilityProfile?.dataIntensity === "high")
      .map((i) => i.id)
      .slice(0, 2);
    // Pad with low-data initiatives to avoid team_skills escalation
    const lowDataIds = REWARD_INITIATIVE_LIBRARY
      .filter((i) => i.capabilityProfile?.dataIntensity === "low")
      .map((i) => i.id)
      .slice(0, 1);
    const ids = [...twoHighDataIds, ...lowDataIds];

    const result = computeRequiredLevels(ids);
    const dataFoundations = result.find((r) => r.dimension === "data_foundations");
    // 2 high initiatives → no escalation, stays at "high"
    expect(dataFoundations?.requiredLevel).toBe("high");
    expect(dataFoundations?.escalated).toBe(false);
  });

  it("FCA governance escalation: governance required += 1 when fcaSysc19=true", () => {
    // Use 1 initiative with high governance sensitivity (peak=high, count=1 → no escalation rule)
    const highGovId = REWARD_INITIATIVE_LIBRARY.find((i) => i.capabilityProfile?.governanceSensitivity === "high")?.id;
    if (!highGovId) return;

    const withoutFca = computeRequiredLevels([highGovId], { fcaSysc19: false });
    const withFca = computeRequiredLevels([highGovId], { fcaSysc19: true });

    const govWithout = withoutFca.find((r) => r.dimension === "governance");
    const govWith = withFca.find((r) => r.dimension === "governance");

    // Without FCA: governance = high (1 initiative, no escalation rule fires)
    expect(govWithout?.requiredLevel).toBe("high");
    // With FCA: governance escalated to very_high
    expect(govWith?.requiredLevel).toBe("very_high");
    expect(govWith?.escalated).toBe(true);
    expect(govWith?.escalationReason).toContain("FCA SYSC 19 regulatory requirement");
  });

  it("FCA escalation is additive: already-very_high governance stays at very_high (capped)", () => {
    // Use 3+ high-governance initiatives so escalation rule already fires → very_high
    const highGovIds = REWARD_INITIATIVE_LIBRARY
      .filter((i) => i.capabilityProfile?.governanceSensitivity === "high")
      .map((i) => i.id)
      .slice(0, 3);
    if (highGovIds.length < 3) return;

    const withoutFca = computeRequiredLevels(highGovIds, { fcaSysc19: false });
    const withFca = computeRequiredLevels(highGovIds, { fcaSysc19: true });

    const govWithout = withoutFca.find((r) => r.dimension === "governance");
    const govWith = withFca.find((r) => r.dimension === "governance");

    // Both should be very_high (FCA doesn't push beyond very_high)
    expect(govWithout?.requiredLevel).toBe("very_high");
    expect(govWith?.requiredLevel).toBe("very_high");
  });

  it("takes the maximum required level when multiple initiatives need the same dimension", () => {
    // Use two initiatives: one with high dataIntensity, one with low
    const highId = REWARD_INITIATIVE_LIBRARY.find((i) => i.capabilityProfile?.dataIntensity === "high")?.id;
    const lowId = REWARD_INITIATIVE_LIBRARY.find((i) => i.capabilityProfile?.dataIntensity === "low")?.id;
    if (!highId || !lowId) return;

    const result = computeRequiredLevels([highId, lowId]);
    const dataFoundations = result.find((r) => r.dimension === "data_foundations");
    expect(dataFoundations?.requiredLevel).toBe("high");
  });

  it("ignores unknown initiative IDs without throwing", () => {
    expect(() => computeRequiredLevels(["non_existent_initiative_xyz"])).not.toThrow();
    const result = computeRequiredLevels(["non_existent_initiative_xyz"]);
    // Returns 5 dimensions but all at "low" since no valid initiatives
    expect(result).toHaveLength(5);
    const dataFoundations = result.find((r) => r.dimension === "data_foundations");
    expect(dataFoundations?.requiredLevel).toBe("low");
  });

  it("team_skills level is low for 1-3 initiatives, medium for 4-6, high for 7+", () => {
    const ids = REWARD_INITIATIVE_LIBRARY.map((i) => i.id);

    const result1 = computeRequiredLevels(ids.slice(0, 2));
    expect(result1.find((r) => r.dimension === "team_skills")?.requiredLevel).toBe("low");

    const result4 = computeRequiredLevels(ids.slice(0, 5));
    expect(result4.find((r) => r.dimension === "team_skills")?.requiredLevel).toBe("medium");

    const result7 = computeRequiredLevels(ids.slice(0, 8));
    expect(result7.find((r) => r.dimension === "team_skills")?.requiredLevel).toBe("high");
  });
});

describe("seedCurrentLevelsFromMaturity", () => {
  it("returns all 5 dimensions", () => {
    const result = seedCurrentLevelsFromMaturity(3, 2);
    expect(Object.keys(result)).toHaveLength(5);
    for (const dim of CAPABILITY_DIMENSIONS) {
      expect(result[dim]).toBeDefined();
      expect(result[dim].isProvisional).toBe(true);
      expect(["low", "medium", "high", "very_high"]).toContain(result[dim].level);
    }
  });

  it("higher maturity rating produces higher seeded levels", () => {
    const low = seedCurrentLevelsFromMaturity(1, 1);
    const high = seedCurrentLevelsFromMaturity(4, 4);
    // team_skills driven by rewardFunctionMaturityRating: 4 → high, 1 → low
    expect(low.team_skills.level).toBe("low");
    expect(high.team_skills.level).toBe("high");
  });

  it("returns low for all dimensions when both maturity inputs are null", () => {
    const result = seedCurrentLevelsFromMaturity(null, null);
    for (const dim of CAPABILITY_DIMENSIONS) {
      expect(result[dim].level).toBe("low");
    }
  });

  it("marks all seeded levels as provisional", () => {
    const result = seedCurrentLevelsFromMaturity(3, 2);
    for (const dim of CAPABILITY_DIMENSIONS) {
      expect(result[dim].isProvisional).toBe(true);
    }
  });
});

describe("deriveGapStatus", () => {
  // Signature: deriveGapStatus(requiredLevel, currentLevel)
  it("returns no_gap when current >= required", () => {
    // (req, cur) → cur >= req → no_gap
    expect(deriveGapStatus("high", "high")).toBe("no_gap");   // req=high, cur=high
    expect(deriveGapStatus("medium", "high")).toBe("no_gap"); // req=medium, cur=high
    expect(deriveGapStatus("low", "high")).toBe("no_gap");    // req=low, cur=high
    expect(deriveGapStatus("medium", "medium")).toBe("no_gap");
    expect(deriveGapStatus("low", "medium")).toBe("no_gap");  // req=low, cur=medium
    expect(deriveGapStatus("low", "low")).toBe("no_gap");
  });

  it("returns minor_gap when current is one step below required", () => {
    expect(deriveGapStatus("high", "medium")).toBe("minor_gap"); // req=high, cur=medium
    expect(deriveGapStatus("medium", "low")).toBe("minor_gap");  // req=medium, cur=low
  });

  it("returns significant_gap when current is two steps below required", () => {
    expect(deriveGapStatus("high", "low")).toBe("significant_gap"); // req=high, cur=low
  });

  it("returns null when currentLevel is null or undefined", () => {
    expect(deriveGapStatus("high", null)).toBeNull();
    expect(deriveGapStatus("medium", undefined)).toBeNull();
  });
});

describe("deriveSequencingFlags", () => {
  it("returns a flag for each initiative ID", () => {
    const ids = ["ai_compensation_recommendation_engine", "ai_driven_merit_cycle_orchestration"];
    const result = deriveSequencingFlags(ids, []);
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.initiativeId)).toEqual(ids);
  });

  it("marks initiative as ready when no high-demand dimensions have gaps", () => {
    const ids = ["ai_compensation_recommendation_engine"];
    // Pass no dimension assessments — all gaps default to null → no blocking
    const result = deriveSequencingFlags(ids, []);
    expect(result[0]?.status).toBe("ready");
  });

  it("marks initiative as needs_enablement when a high-demand dimension has minor_gap", () => {
    const ids = ["ai_compensation_recommendation_engine"];
    // This initiative has dataIntensity: "high" → data_foundations is a high-demand dimension
    const result = deriveSequencingFlags(ids, [
      { dimension: "data_foundations", gapStatus: "minor_gap" },
    ]);
    expect(result[0]?.status).toBe("needs_enablement");
  });

  it("marks initiative as blocked when a high-demand dimension has significant_gap", () => {
    const ids = ["ai_compensation_recommendation_engine"];
    const result = deriveSequencingFlags(ids, [
      { dimension: "data_foundations", gapStatus: "significant_gap" },
    ]);
    expect(result[0]?.status).toBe("blocked");
  });

  it("ignores gaps in dimensions that the initiative does not rate as high", () => {
    // Find an initiative where team_skills is not driven by the initiative (it's always computed from breadth)
    // and governance is "low" — a gap there should not block it
    const lowGovId = REWARD_INITIATIVE_LIBRARY.find((i) => i.capabilityProfile?.governanceSensitivity === "low")?.id;
    if (!lowGovId) return;
    const result = deriveSequencingFlags([lowGovId], [
      { dimension: "governance", gapStatus: "significant_gap" },
    ]);
    // governance is not "high" for this initiative, so it should not be blocked
    expect(result[0]?.status).not.toBe("blocked");
  });

  it("returns ready for unknown initiative IDs", () => {
    const result = deriveSequencingFlags(["non_existent_xyz"], []);
    expect(result[0]?.status).toBe("ready");
  });
});

describe("computeEnablementCost", () => {
  it("returns zero cost when all dimensions have no_gap", () => {
    const dims = CAPABILITY_DIMENSIONS.map((d) => ({ dimension: d, gapStatus: "no_gap" as const }));
    const result = computeEnablementCost(dims);
    expect(result.low).toBe(0);
    expect(result.high).toBe(0);
  });

  it("returns positive cost when any dimension has significant_gap", () => {
    const dims = [{ dimension: "data_foundations" as CapabilityDimension, gapStatus: "significant_gap" as const }];
    const result = computeEnablementCost(dims);
    expect(result.low).toBeGreaterThan(0);
    expect(result.high).toBeGreaterThanOrEqual(result.low);
  });

  it("returns lower cost for minor_gap than significant_gap on the same dimension", () => {
    const minorCost = computeEnablementCost([{ dimension: "data_foundations" as CapabilityDimension, gapStatus: "minor_gap" as const }]);
    const significantCost = computeEnablementCost([{ dimension: "data_foundations" as CapabilityDimension, gapStatus: "significant_gap" as const }]);
    expect(significantCost.low).toBeGreaterThan(minorCost.low);
  });

  it("returns a note string", () => {
    const dims = [{ dimension: "data_foundations" as CapabilityDimension, gapStatus: "minor_gap" as const }];
    const result = computeEnablementCost(dims);
    expect(typeof result.note).toBe("string");
    expect(result.note.length).toBeGreaterThan(0);
  });

  it("accumulates cost across multiple dimensions", () => {
    const single = computeEnablementCost([{ dimension: "data_foundations" as CapabilityDimension, gapStatus: "minor_gap" as const }]);
    const multi = computeEnablementCost([
      { dimension: "data_foundations" as CapabilityDimension, gapStatus: "minor_gap" as const },
      { dimension: "change_management" as CapabilityDimension, gapStatus: "minor_gap" as const },
    ]);
    expect(multi.low).toBeGreaterThan(single.low);
  });
});

describe("buildCapabilityRiskNote", () => {
  it("returns null when all initiatives are ready", () => {
    const flags: SequencingFlag[] = [
      { initiativeId: "a", status: "ready" },
      { initiativeId: "b", status: "ready" },
    ];
    const result = buildCapabilityRiskNote(flags);
    expect(result).toBeNull();
  });

  it("returns null for empty flags array", () => {
    expect(buildCapabilityRiskNote([])).toBeNull();
  });

  it("returns an object with summary and affectedInitiativeIds when any initiative is blocked", () => {
    const flags: SequencingFlag[] = [
      { initiativeId: "a", status: "blocked", reason: "Data gap" },
      { initiativeId: "b", status: "ready" },
    ];
    const result = buildCapabilityRiskNote(flags);
    expect(result).not.toBeNull();
    expect(typeof result?.summary).toBe("string");
    expect(result?.affectedInitiativeIds).toContain("a");
    expect(result?.affectedInitiativeIds).not.toContain("b");
  });

  it("returns an object when any initiative needs_enablement", () => {
    const flags: SequencingFlag[] = [
      { initiativeId: "c", status: "needs_enablement" },
    ];
    const result = buildCapabilityRiskNote(flags);
    expect(result).not.toBeNull();
    expect(result?.affectedInitiativeIds).toContain("c");
  });

  it("includes both blocked and needs_enablement initiatives in affectedInitiativeIds", () => {
    const flags: SequencingFlag[] = [
      { initiativeId: "x", status: "blocked" },
      { initiativeId: "y", status: "needs_enablement" },
      { initiativeId: "z", status: "ready" },
    ];
    const result = buildCapabilityRiskNote(flags);
    expect(result?.affectedInitiativeIds).toContain("x");
    expect(result?.affectedInitiativeIds).toContain("y");
    expect(result?.affectedInitiativeIds).not.toContain("z");
  });

  it("summary does not contain vocabulary blacklist words", () => {
    const BLACKLIST = ["leverage", "synergy", "paradigm", "holistic", "ecosystem", "robust",
      "scalable", "best-in-class", "world-class", "cutting-edge", "game-changer",
      "transformational", "impactful", "seamless", "empower"];
    const flags: SequencingFlag[] = [
      { initiativeId: "a", status: "blocked" },
      { initiativeId: "b", status: "needs_enablement" },
    ];
    const result = buildCapabilityRiskNote(flags);
    if (!result) return;
    for (const word of BLACKLIST) {
      expect(result.summary.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});

// ── Stage 10 wiring tests ─────────────────────────────────────────────────────

describe("Stage 10 assembleReport — capability section", () => {
  const BASE_PROFILE = {
    tenantId: "t1",
    companyName: "Northbridge Financial",
    sector: "Financial Services",
    headcount: 8000,
    annualPayrollCostGbp: 95_000_000,
    geographicFootprint: "UK",
    hris: "Workday",
    ukEmployeeHeadcount: 8000,
    annualRevenueGbp: null,
    ownershipStructure: null,
    regulatoryContext: null,
    collectiveBargainingAgreements: null,
    pensionSchemeType: null,
    benefitsComplexity: null,
    rewardGovernanceModel: null,
    rewardTechStack: null,
    fcaSysc19: null,
    updatedAt: null,
    updatedByUserId: null,
  };

  const BASE_PORTFOLIO = {
    tenantId: "t1",
    userId: "u1",
    selectedInitiativesJson: ["ai_compensation_recommendation_engine", "ai_driven_merit_cycle_orchestration"],
    customInitiativesJson: [],
    isCompleted: 1,
    confirmedAt: Date.now(),
    isStale: 0,
    updatedAt: Date.now(),
  };

  it("capability section is a placeholder when capabilityStage is undefined", () => {
    const report = assembleReport({
      profile: BASE_PROFILE,
      portfolio: BASE_PORTFOLIO,
    });
    const section = report.sections.find((s) => s.key === "capability");
    expect(section).toBeDefined();
    expect(section?.isPlaceholder).toBe(true);
  });

  it("capability section is a placeholder when capabilityStage is not confirmed", () => {
    const report = assembleReport({
      profile: BASE_PROFILE,
      portfolio: BASE_PORTFOLIO,
      capabilityStage: {
        tenantId: "t1",
        userId: "u1",
        isConfirmed: 0,
        confirmedAt: null,
        isStale: 0,
        sequencingFlagsJson: null,
        enablementCostJson: null,
        capabilityRiskNoteJson: null,
        updatedAt: null,
      },
      capabilityDimensions: [],
    });
    const section = report.sections.find((s) => s.key === "capability");
    expect(section?.isPlaceholder).toBe(true);
  });

  it("capability section is populated when capabilityStage is confirmed with assessed dimensions", () => {
    const dims = [
      {
        tenantId: "t1",
        userId: "u1",
        dimension: "data_foundations",
        requiredLevel: "high",
        currentLevel: "medium",
        gapStatus: "minor_gap",
        gapStatement: "Data infrastructure is partially built but lacks real-time feeds.",
        gapStatementAiOriginal: null,
        actionNote: "Prioritise HR data lake integration before Q3.",
        actionNoteAiOriginal: null,
        isChallenged: 0,
        challengeNote: null,
        owner: "Data Engineering",
        updatedAt: Date.now(),
      },
    ];
    const report = assembleReport({
      profile: BASE_PROFILE,
      portfolio: BASE_PORTFOLIO,
      capabilityStage: {
        tenantId: "t1",
        userId: "u1",
        isConfirmed: 1,
        confirmedAt: Date.now(),
        isStale: 0,
        sequencingFlagsJson: null,
        enablementCostJson: { low: 50000, high: 100000, note: "Band-only estimate" },
        capabilityRiskNoteJson: "Minor data gap may delay Q3 rollout.",
        updatedAt: null,
      },
      capabilityDimensions: dims,
    });
    const section = report.sections.find((s) => s.key === "capability");
    expect(section?.isPlaceholder).toBe(false);
    expect(section?.content).toBeTruthy();
  });

  it("capability section content includes dimension label and gap status", () => {
    const dims = [
      {
        tenantId: "t1",
        userId: "u1",
        dimension: "data_foundations",
        requiredLevel: "high",
        currentLevel: "low",
        gapStatus: "significant_gap",
        gapStatement: "No structured HR data lake exists.",
        gapStatementAiOriginal: null,
        actionNote: "Build data lake as prerequisite.",
        actionNoteAiOriginal: null,
        isChallenged: 0,
        challengeNote: null,
        owner: null,
        updatedAt: Date.now(),
      },
    ];
    const report = assembleReport({
      profile: BASE_PROFILE,
      portfolio: BASE_PORTFOLIO,
      capabilityStage: {
        tenantId: "t1",
        userId: "u1",
        isConfirmed: 1,
        confirmedAt: Date.now(),
        isStale: 0,
        sequencingFlagsJson: null,
        enablementCostJson: null,
        capabilityRiskNoteJson: null,
        updatedAt: null,
      },
      capabilityDimensions: dims,
    });
    const section = report.sections.find((s) => s.key === "capability");
    expect(section?.content).toContain("Data Foundations");
    expect(section?.content).toContain("Significant gap");
  });

  it("stageCompleteness.stage8 is true when capabilityStage is confirmed and not stale", () => {
    const report = assembleReport({
      profile: BASE_PROFILE,
      portfolio: BASE_PORTFOLIO,
      capabilityStage: {
        tenantId: "t1",
        userId: "u1",
        isConfirmed: 1,
        confirmedAt: Date.now(),
        isStale: 0,
        sequencingFlagsJson: null,
        enablementCostJson: null,
        capabilityRiskNoteJson: null,
        updatedAt: null,
      },
    });
    expect(report.stageCompleteness.stage8).toBe(true);
  });

  it("stageCompleteness.stage8 is false when capabilityStage is stale", () => {
    const report = assembleReport({
      profile: BASE_PROFILE,
      portfolio: BASE_PORTFOLIO,
      capabilityStage: {
        tenantId: "t1",
        userId: "u1",
        isConfirmed: 1,
        confirmedAt: Date.now(),
        isStale: 1,
        sequencingFlagsJson: null,
        enablementCostJson: null,
        capabilityRiskNoteJson: null,
        updatedAt: null,
      },
    });
    expect(report.stageCompleteness.stage8).toBe(false);
  });

  it("computeStateHash changes when capabilityStage changes", () => {
    const base = { profile: BASE_PROFILE, portfolio: BASE_PORTFOLIO };
    const hash1 = computeStateHash({ ...base, capabilityStage: null });
    const hash2 = computeStateHash({
      ...base,
      capabilityStage: {
        tenantId: "t1",
        userId: "u1",
        isConfirmed: 1,
        confirmedAt: 12345,
        isStale: 0,
        sequencingFlagsJson: null,
        enablementCostJson: null,
        capabilityRiskNoteJson: null,
        updatedAt: null,
      },
    });
    expect(hash1).not.toBe(hash2);
  });
});
