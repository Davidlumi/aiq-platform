/**
 * Capability Link — Locking Tests
 *
 * Covers:
 *   1. aggregateTeamCapability — domain means, coverage, derived levels, provenance
 *   2. scoreToLevel / weightedMean — threshold boundary conditions
 *   3. estimateMonthsToClose — gap severity + domain count
 *   4. generateRewardDevelopmentPlans — gap-driven plan generation
 *   5. computePeopleCountPerDimension — per-user gap counting
 *   6. Closing-loop invariant: improving a team member's score narrows the gap
 *   7. assembleReport developmentPlans field — populated when Stage 8 confirmed
 *   8. assembleReport developmentPlans field — empty when Stage 8 not confirmed
 */

import { describe, it, expect } from "vitest";
import {
  aggregateTeamCapability,
  scoreToLevel,
  weightedMean,
  estimateMonthsToClose,
  CAPABILITY_LINK_CONFIG,
  type UserDomainScores,
} from "./services/capabilityLinkConfig";
import {
  generateRewardDevelopmentPlans,
  computePeopleCountPerDimension,
  type DevelopmentPlanInput,
} from "./services/rewardDevelopmentPlans";
import { assembleReport } from "./services/rewardOutputs";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEAM_4 = [
  { userId: "u1" },
  { userId: "u2" },
  { userId: "u3" },
  { userId: "u4" },
];

/** All four users assessed, scores spread across the threshold boundaries */
const SCORES_4_HIGH: UserDomainScores[] = [
  {
    userId: "u1",
    scores: {
      ai_interaction: 70,
      ai_output_evaluation: 72,
      ai_workflow_design: 68,
      workforce_ai_readiness: 75,
      ai_ethics_trust: 80,
      ai_change_leadership: 70,
    },
  },
  {
    userId: "u2",
    scores: {
      ai_interaction: 66,
      ai_output_evaluation: 68,
      ai_workflow_design: 65,
      workforce_ai_readiness: 60,
      ai_ethics_trust: 66,
      ai_change_leadership: 67,
    },
  },
  {
    userId: "u3",
    scores: {
      ai_interaction: 71,
      ai_output_evaluation: 69,
      ai_workflow_design: 70,
      workforce_ai_readiness: 72,
      ai_ethics_trust: 67,
      ai_change_leadership: 73,
    },
  },
  {
    userId: "u4",
    scores: {
      ai_interaction: 65,
      ai_output_evaluation: 67,
      ai_workflow_design: 66,
      workforce_ai_readiness: 63,
      ai_ethics_trust: 65,
      ai_change_leadership: 68,
    },
  },
];

// ─── 1. scoreToLevel boundary tests ──────────────────────────────────────────

describe("scoreToLevel", () => {
  it("score < 40 → low", () => {
    expect(scoreToLevel(0)).toBe("low");
    expect(scoreToLevel(39.9)).toBe("low");
  });

  it("score = 40 → medium", () => {
    expect(scoreToLevel(40)).toBe("medium");
  });

  it("score = 64.9 → medium", () => {
    expect(scoreToLevel(64.9)).toBe("medium");
  });

  it("score = 65 → high", () => {
    expect(scoreToLevel(65)).toBe("high");
  });

  it("score = 81.9 → high", () => {
    expect(scoreToLevel(81.9)).toBe("high");
  });

  it("score = 82 → very_high", () => {
    expect(scoreToLevel(82)).toBe("very_high");
  });

  it("score = 100 → very_high", () => {
    expect(scoreToLevel(100)).toBe("very_high");
  });
});

// ─── 2. weightedMean ──────────────────────────────────────────────────────────

describe("weightedMean", () => {
  it("equal weights: returns arithmetic mean", () => {
    const result = weightedMean(
      { ai_interaction: 60, ai_output_evaluation: 80, ai_workflow_design: 70 } as any,
      [
        { domain: "ai_interaction", weight: 1 },
        { domain: "ai_output_evaluation", weight: 1 },
        { domain: "ai_workflow_design", weight: 1 },
      ]
    );
    expect(result).toBeCloseTo(70, 5);
  });

  it("unequal weights: higher weight domain dominates", () => {
    // ai_change_leadership (w=2) = 80, workforce_ai_readiness (w=1) = 50
    // weighted mean = (80*2 + 50*1) / 3 = 210/3 = 70
    const result = weightedMean(
      { ai_change_leadership: 80, workforce_ai_readiness: 50 } as any,
      [
        { domain: "ai_change_leadership", weight: 2 },
        { domain: "workforce_ai_readiness", weight: 1 },
      ]
    );
    expect(result).toBeCloseTo(70, 5);
  });

  it("missing domain: excluded from mean", () => {
    const result = weightedMean(
      { ai_interaction: 60 } as any,
      [
        { domain: "ai_interaction", weight: 1 },
        { domain: "ai_output_evaluation", weight: 1 }, // missing
      ]
    );
    expect(result).toBeCloseTo(60, 5);
  });

  it("all domains missing: returns null", () => {
    const result = weightedMean(
      {} as any,
      [{ domain: "ai_interaction", weight: 1 }]
    );
    expect(result).toBeNull();
  });
});

// ─── 3. aggregateTeamCapability ───────────────────────────────────────────────

describe("aggregateTeamCapability", () => {
  it("4/4 assessed: coverage = 1.0, not low coverage", () => {
    const agg = aggregateTeamCapability(TEAM_4, SCORES_4_HIGH, CAPABILITY_LINK_CONFIG);
    expect(agg.teamSize).toBe(4);
    expect(agg.assessedCount).toBe(4);
    expect(agg.coverageFraction).toBe(1.0);
    expect(agg.isLowCoverage).toBe(false);
  });

  it("4/4 assessed: domain means are correct", () => {
    const agg = aggregateTeamCapability(TEAM_4, SCORES_4_HIGH, CAPABILITY_LINK_CONFIG);
    // ai_interaction mean = (70 + 66 + 71 + 65) / 4 = 272 / 4 = 68.0
    expect(agg.domainMeans.ai_interaction).toBeCloseTo(68.0, 1);
    // ai_ethics_trust mean = (80 + 66 + 67 + 65) / 4 = 278 / 4 = 69.5
    expect(agg.domainMeans.ai_ethics_trust).toBeCloseTo(69.5, 1);
  });

  it("4/4 assessed: team_skills derived level is 'high' (mean ~68.8 ≥ 65)", () => {
    const agg = aggregateTeamCapability(TEAM_4, SCORES_4_HIGH, CAPABILITY_LINK_CONFIG);
    // team_skills = mean(ai_interaction, ai_output_evaluation, ai_workflow_design)
    // = mean(68.0, 69.0, 67.25) ≈ 68.1 → high
    expect(agg.derivedLevels.team_skills).toBe("high");
  });

  it("4/4 assessed: governance derived level is 'high' (ai_ethics_trust mean ~69.5 ≥ 65)", () => {
    const agg = aggregateTeamCapability(TEAM_4, SCORES_4_HIGH, CAPABILITY_LINK_CONFIG);
    expect(agg.derivedLevels.governance).toBe("high");
  });

  it("2/4 assessed: coverage = 0.5, exactly at threshold (not low coverage)", () => {
    const agg = aggregateTeamCapability(TEAM_4, SCORES_4_HIGH.slice(0, 2), CAPABILITY_LINK_CONFIG);
    expect(agg.assessedCount).toBe(2);
    expect(agg.coverageFraction).toBe(0.5);
    // 0.5 is NOT < 0.5, so isLowCoverage = false
    expect(agg.isLowCoverage).toBe(false);
  });

  it("1/4 assessed: coverage = 0.25, is low coverage → derived levels are null", () => {
    const agg = aggregateTeamCapability(TEAM_4, SCORES_4_HIGH.slice(0, 1), CAPABILITY_LINK_CONFIG);
    expect(agg.isLowCoverage).toBe(true);
    expect(agg.derivedLevels.team_skills).toBeNull();
    expect(agg.derivedLevels.change_management).toBeNull();
    expect(agg.derivedLevels.governance).toBeNull();
  });

  it("1/4 assessed: provenance strings mention low coverage", () => {
    const agg = aggregateTeamCapability(TEAM_4, SCORES_4_HIGH.slice(0, 1), CAPABILITY_LINK_CONFIG);
    expect(agg.provenance.team_skills).toContain("low coverage");
    expect(agg.provenance.team_skills).toContain("1 of 4");
  });

  it("0/4 assessed: all domain means are null, all derived levels are null", () => {
    const agg = aggregateTeamCapability(TEAM_4, [], CAPABILITY_LINK_CONFIG);
    expect(agg.assessedCount).toBe(0);
    expect(agg.domainMeans.ai_interaction).toBeNull();
    expect(agg.derivedLevels.team_skills).toBeNull();
  });

  it("empty team: teamSize = 0, coverageFraction = 0", () => {
    const agg = aggregateTeamCapability([], [], CAPABILITY_LINK_CONFIG);
    expect(agg.teamSize).toBe(0);
    expect(agg.coverageFraction).toBe(0);
  });

  it("domain counts match number of users who provided that domain", () => {
    // u1 and u2 have ai_interaction; u3 has it too; u4 has it too → 4
    const agg = aggregateTeamCapability(TEAM_4, SCORES_4_HIGH, CAPABILITY_LINK_CONFIG);
    expect(agg.domainCounts.ai_interaction).toBe(4);
  });

  it("provenance string format: includes level, count, and coverage pct", () => {
    const agg = aggregateTeamCapability(TEAM_4, SCORES_4_HIGH, CAPABILITY_LINK_CONFIG);
    expect(agg.provenance.team_skills).toMatch(/High/);
    expect(agg.provenance.team_skills).toMatch(/4 of 4/);
    expect(agg.provenance.team_skills).toMatch(/100%/);
  });
});

// ─── 4. estimateMonthsToClose ─────────────────────────────────────────────────

describe("estimateMonthsToClose", () => {
  it("minor_gap, 1 domain → 3 months", () => {
    expect(estimateMonthsToClose("minor_gap", 1)).toBe(3);
  });

  it("minor_gap, 3 domains → 5 months", () => {
    expect(estimateMonthsToClose("minor_gap", 3)).toBe(5);
  });

  it("significant_gap, 1 domain → 6 months", () => {
    expect(estimateMonthsToClose("significant_gap", 1)).toBe(6);
  });

  it("significant_gap, 3 domains → 8 months", () => {
    expect(estimateMonthsToClose("significant_gap", 3)).toBe(8);
  });
});

// ─── 5. generateRewardDevelopmentPlans ───────────────────────────────────────

describe("generateRewardDevelopmentPlans", () => {
  const DIM_INPUTS_WITH_GAPS: DevelopmentPlanInput[] = [
    {
      dimension: "team_skills",
      requiredLevel: "high",
      currentLevel: "medium",
      gapStatus: "significant_gap",
    },
    {
      dimension: "change_management",
      requiredLevel: "medium",
      currentLevel: "medium",
      gapStatus: "no_gap",
    },
    {
      dimension: "governance",
      requiredLevel: "high",
      currentLevel: "low",
      gapStatus: "significant_gap",
    },
  ];

  const EMPTY_AGG = aggregateTeamCapability([], [], CAPABILITY_LINK_CONFIG);

  it("generates plans only for dimensions with a gap", () => {
    const plans = generateRewardDevelopmentPlans(DIM_INPUTS_WITH_GAPS, EMPTY_AGG);
    expect(plans.length).toBe(2);
    const dims = plans.map(p => p.dimension);
    expect(dims).toContain("team_skills");
    expect(dims).toContain("governance");
    expect(dims).not.toContain("change_management");
  });

  it("team_skills plan: gapStatus is 'significant_gap'", () => {
    const plans = generateRewardDevelopmentPlans(DIM_INPUTS_WITH_GAPS, EMPTY_AGG);
    const plan = plans.find(p => p.dimension === "team_skills")!;
    expect(plan.gapStatus).toBe("significant_gap");
  });

  it("team_skills plan: requiredLevel and currentLevel are preserved", () => {
    const plans = generateRewardDevelopmentPlans(DIM_INPUTS_WITH_GAPS, EMPTY_AGG);
    const plan = plans.find(p => p.dimension === "team_skills")!;
    expect(plan.requiredLevel).toBe("high");
    expect(plan.currentLevel).toBe("medium");
  });

  it("team_skills plan: targetDomains includes ai_interaction, ai_output_evaluation, ai_workflow_design", () => {
    const plans = generateRewardDevelopmentPlans(DIM_INPUTS_WITH_GAPS, EMPTY_AGG);
    const plan = plans.find(p => p.dimension === "team_skills")!;
    expect(plan.targetDomains).toContain("ai_interaction");
    expect(plan.targetDomains).toContain("ai_output_evaluation");
    expect(plan.targetDomains).toContain("ai_workflow_design");
  });

  it("team_skills plan: pathwaySummary mentions the dimension label", () => {
    const plans = generateRewardDevelopmentPlans(DIM_INPUTS_WITH_GAPS, EMPTY_AGG);
    const plan = plans.find(p => p.dimension === "team_skills")!;
    expect(plan.pathwaySummary).toContain("Team");
  });

  it("governance plan: targetDomains includes ai_ethics_trust", () => {
    const plans = generateRewardDevelopmentPlans(DIM_INPUTS_WITH_GAPS, EMPTY_AGG);
    const plan = plans.find(p => p.dimension === "governance")!;
    expect(plan.targetDomains).toContain("ai_ethics_trust");
  });

  it("no plans generated when all dimensions have no_gap", () => {
    const noneGapped: DevelopmentPlanInput[] = [
      { dimension: "team_skills",      requiredLevel: "medium", currentLevel: "high",   gapStatus: "no_gap" },
      { dimension: "change_management", requiredLevel: "medium", currentLevel: "medium", gapStatus: "no_gap" },
      { dimension: "governance",        requiredLevel: "low",    currentLevel: "medium", gapStatus: "no_gap" },
    ];
    const plans = generateRewardDevelopmentPlans(noneGapped, EMPTY_AGG);
    expect(plans.length).toBe(0);
  });

  it("no plans generated when currentLevel is null (not yet assessed)", () => {
    const nullLevel: DevelopmentPlanInput[] = [
      { dimension: "team_skills", requiredLevel: "high", currentLevel: null, gapStatus: "significant_gap" },
    ];
    const plans = generateRewardDevelopmentPlans(nullLevel, EMPTY_AGG);
    expect(plans.length).toBe(0);
  });
});

// ─── 6. computePeopleCountPerDimension ───────────────────────────────────────

describe("computePeopleCountPerDimension", () => {
  it("counts users whose weighted mean is below required level", () => {
    // team_skills required = high (65). u1 mean ≈ 70 (high) → not counted. u2 mean ≈ 66.3 (high) → not counted.
    // u3 mean ≈ 70 (high) → not counted. u4 mean ≈ 66 (high) → not counted.
    const counts = computePeopleCountPerDimension(
      SCORES_4_HIGH.map(u => ({ userId: u.userId, scores: u.scores as any })),
      { team_skills: "high", change_management: "high", governance: "high" }
    );
    // All users are at "high" for team_skills → 0 below required
    expect(counts.team_skills).toBe(0);
  });

  it("counts users below required level when required = very_high", () => {
    // All users have team_skills mean < 82 (very_high threshold) → all 4 below
    const counts = computePeopleCountPerDimension(
      SCORES_4_HIGH.map(u => ({ userId: u.userId, scores: u.scores as any })),
      { team_skills: "very_high" }
    );
    expect(counts.team_skills).toBe(4);
  });

  it("returns 0 for all dimensions when no users provided", () => {
    const counts = computePeopleCountPerDimension([], { team_skills: "high" });
    expect(counts.team_skills).toBe(0);
    expect(counts.change_management).toBe(0);
    expect(counts.governance).toBe(0);
  });
});

// ─── 7. Closing-loop invariant ────────────────────────────────────────────────

describe("Closing-loop invariant: improving scores narrows the gap", () => {
  it("improving a user's score from low to high reduces peopleCount for team_skills", () => {
    // Start: all 4 users have low team_skills scores (below 65 threshold)
    const lowScores: UserDomainScores[] = [
      { userId: "u1", scores: { ai_interaction: 35, ai_output_evaluation: 38, ai_workflow_design: 36, ai_ethics_trust: 40, ai_change_leadership: 42, workforce_ai_readiness: 38 } },
      { userId: "u2", scores: { ai_interaction: 40, ai_output_evaluation: 42, ai_workflow_design: 38, ai_ethics_trust: 45, ai_change_leadership: 40, workforce_ai_readiness: 42 } },
      { userId: "u3", scores: { ai_interaction: 38, ai_output_evaluation: 36, ai_workflow_design: 40, ai_ethics_trust: 42, ai_change_leadership: 38, workforce_ai_readiness: 40 } },
      { userId: "u4", scores: { ai_interaction: 42, ai_output_evaluation: 40, ai_workflow_design: 38, ai_ethics_trust: 44, ai_change_leadership: 42, workforce_ai_readiness: 44 } },
    ];

    const beforeCounts = computePeopleCountPerDimension(
      lowScores.map(u => ({ userId: u.userId, scores: u.scores as any })),
      { team_skills: "high" }
    );
    expect(beforeCounts.team_skills).toBe(4); // all 4 below high threshold

    // Improve u1's scores to high level
    const improvedScores: UserDomainScores[] = [
      { userId: "u1", scores: { ai_interaction: 70, ai_output_evaluation: 72, ai_workflow_design: 68, ai_ethics_trust: 75, ai_change_leadership: 70, workforce_ai_readiness: 68 } },
      ...lowScores.slice(1),
    ];

    const afterCounts = computePeopleCountPerDimension(
      improvedScores.map(u => ({ userId: u.userId, scores: u.scores as any })),
      { team_skills: "high" }
    );
    // u1 is now above high threshold → 3 below
    expect(afterCounts.team_skills).toBe(3);
    expect(afterCounts.team_skills).toBeLessThan(beforeCounts.team_skills);
  });

  it("improving team mean from medium to high changes derived level", () => {
    // Start: all users at medium level (40–64)
    const mediumScores: UserDomainScores[] = [
      { userId: "u1", scores: { ai_interaction: 50, ai_output_evaluation: 52, ai_workflow_design: 48, ai_ethics_trust: 55, ai_change_leadership: 50, workforce_ai_readiness: 50 } },
      { userId: "u2", scores: { ai_interaction: 55, ai_output_evaluation: 50, ai_workflow_design: 52, ai_ethics_trust: 58, ai_change_leadership: 52, workforce_ai_readiness: 54 } },
    ];

    const aggBefore = aggregateTeamCapability(
      [{ userId: "u1" }, { userId: "u2" }],
      mediumScores,
      CAPABILITY_LINK_CONFIG
    );
    expect(aggBefore.derivedLevels.team_skills).toBe("medium");

    // Improve both users to high level
    const highScores: UserDomainScores[] = [
      { userId: "u1", scores: { ai_interaction: 70, ai_output_evaluation: 72, ai_workflow_design: 68, ai_ethics_trust: 70, ai_change_leadership: 70, workforce_ai_readiness: 68 } },
      { userId: "u2", scores: { ai_interaction: 68, ai_output_evaluation: 70, ai_workflow_design: 66, ai_ethics_trust: 72, ai_change_leadership: 68, workforce_ai_readiness: 70 } },
    ];

    const aggAfter = aggregateTeamCapability(
      [{ userId: "u1" }, { userId: "u2" }],
      highScores,
      CAPABILITY_LINK_CONFIG
    );
    expect(aggAfter.derivedLevels.team_skills).toBe("high");

    // The level has improved
    const LEVEL_ORDER_LOCAL: Record<string, number> = { low: 0, medium: 1, high: 2, very_high: 3 };
    expect(LEVEL_ORDER_LOCAL[aggAfter.derivedLevels.team_skills!])
      .toBeGreaterThan(LEVEL_ORDER_LOCAL[aggBefore.derivedLevels.team_skills!]);
  });

  it("improving governance domain score above threshold changes governance level", () => {
    // Start: governance (ai_ethics_trust) mean = 50 → medium
    const before = aggregateTeamCapability(
      [{ userId: "u1" }],
      [{ userId: "u1", scores: { ai_ethics_trust: 50 } }],
      CAPABILITY_LINK_CONFIG
    );
    expect(before.derivedLevels.governance).toBe("medium");

    // Improve to 70 → high
    const after = aggregateTeamCapability(
      [{ userId: "u1" }],
      [{ userId: "u1", scores: { ai_ethics_trust: 70 } }],
      CAPABILITY_LINK_CONFIG
    );
    expect(after.derivedLevels.governance).toBe("high");
  });
});

// ─── 8. assembleReport — developmentPlans field ───────────────────────────────

describe("assembleReport developmentPlans field", () => {
  const BASE_PROFILE = {
    companyName: "Test Co",
    sector: "technology",
    ukEmployeeHeadcount: 500,
    annualPayrollCostGbp: 25_000_000,
  };
  const BASE_PORTFOLIO = {
    selectedInitiativesJson: ["ai_compensation_recommendation_engine"],
    isCompleted: 1,
  };

  it("returns empty developmentPlans when Stage 8 is not confirmed", () => {
    const report = assembleReport({
      profile: BASE_PROFILE,
      portfolio: BASE_PORTFOLIO,
      capabilityStage: { isConfirmed: 0, isStale: 0 },
      capabilityDimensions: [
        {
          dimension: "team_skills",
          requiredLevel: "high",
          currentLevel: "medium",
          gapStatus: "significant_gap",
          gapStatement: "Gap exists",
          actionNote: "Train team",
          owner: null,
          isChallenged: 0,
          challengeNote: null,
        },
      ],
    });
    expect(report.developmentPlans).toEqual([]);
  });

  it("returns empty developmentPlans when Stage 8 is stale", () => {
    const report = assembleReport({
      profile: BASE_PROFILE,
      portfolio: BASE_PORTFOLIO,
      capabilityStage: { isConfirmed: 1, isStale: 1 },
      capabilityDimensions: [
        {
          dimension: "team_skills",
          requiredLevel: "high",
          currentLevel: "medium",
          gapStatus: "significant_gap",
          gapStatement: "Gap exists",
          actionNote: "Train team",
          owner: null,
          isChallenged: 0,
          challengeNote: null,
        },
      ],
    });
    expect(report.developmentPlans).toEqual([]);
  });

  it("returns development plans when Stage 8 is confirmed and not stale", () => {
    const report = assembleReport({
      profile: BASE_PROFILE,
      portfolio: BASE_PORTFOLIO,
      capabilityStage: { isConfirmed: 1, isStale: 0 },
      capabilityDimensions: [
        {
          dimension: "team_skills",
          requiredLevel: "high",
          currentLevel: "medium",
          gapStatus: "significant_gap",
          gapStatement: "Gap exists",
          actionNote: "Train team",
          owner: null,
          isChallenged: 0,
          challengeNote: null,
        },
        {
          dimension: "change_management",
          requiredLevel: "medium",
          currentLevel: "medium",
          gapStatus: "no_gap",
          gapStatement: null,
          actionNote: null,
          owner: null,
          isChallenged: 0,
          challengeNote: null,
        },
        {
          dimension: "governance",
          requiredLevel: "high",
          currentLevel: "low",
          gapStatus: "significant_gap",
          gapStatement: "Governance gap",
          actionNote: "Governance training",
          owner: null,
          isChallenged: 0,
          challengeNote: null,
        },
      ],
    });
    expect(report.developmentPlans.length).toBe(2);
    const dims = report.developmentPlans.map(p => p.dimension);
    expect(dims).toContain("team_skills");
    expect(dims).toContain("governance");
  });

  it("development plan has correct shape", () => {
    const report = assembleReport({
      profile: BASE_PROFILE,
      portfolio: BASE_PORTFOLIO,
      capabilityStage: { isConfirmed: 1, isStale: 0 },
      capabilityDimensions: [
        {
          dimension: "team_skills",
          requiredLevel: "high",
          currentLevel: "medium",
          gapStatus: "significant_gap",
          gapStatement: "Gap exists",
          actionNote: "Train team",
          owner: null,
          isChallenged: 0,
          challengeNote: null,
        },
      ],
    });
    const plan = report.developmentPlans[0];
    expect(plan).toMatchObject({
      dimension: "team_skills",
      gapStatus: "significant_gap",
      requiredLevel: "high",
      currentLevel: "medium",
    });
    expect(plan.targetDomains.length).toBeGreaterThan(0);
    expect(plan.estimatedMonths).toBeGreaterThan(0);
    expect(typeof plan.pathwaySummary).toBe("string");
    expect(plan.pathwaySummary.length).toBeGreaterThan(10);
  });

  it("stageCompleteness.stage8 is true when confirmed and not stale", () => {
    const report = assembleReport({
      profile: BASE_PROFILE,
      portfolio: BASE_PORTFOLIO,
      capabilityStage: { isConfirmed: 1, isStale: 0 },
    });
    expect(report.stageCompleteness.stage8).toBe(true);
  });

  it("stageCompleteness.stage8 is false when stale", () => {
    const report = assembleReport({
      profile: BASE_PROFILE,
      portfolio: BASE_PORTFOLIO,
      capabilityStage: { isConfirmed: 1, isStale: 1 },
    });
    expect(report.stageCompleteness.stage8).toBe(false);
  });
});
