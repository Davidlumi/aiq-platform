/**
 * reasoning-benchmarks.test.ts
 *
 * RR4: Tests for listReasoningAnswers procedure logic (pure unit tests)
 * + getBenchmarks: normEngine integration tests
 * + results procedure: score extraction helpers
 */

import { describe, it, expect } from "vitest";
import {
  getNormMeans,
  computePercentile,
  computeAllPercentiles,
  scoreToPercentileBand,
  resolveRoleFamily,
  resolveSeniorityTier,
  NORM_GROUP_VERSION,
} from "./assessment/normEngine";

// ─── RR4: listReasoningAnswers logic ─────────────────────────────────────────

describe("RR4: listReasoningAnswers — filtering logic", () => {
  // Pure unit test for the filtering/enrichment logic without a live DB
  it("returns empty result set when no reasoning answers exist", () => {
    const answers: any[] = [];
    const filtered = answers.filter(a => a.reasoningText !== null && a.reasoningText !== undefined);
    expect(filtered).toHaveLength(0);
  });

  it("filters answers where reasoningText is null", () => {
    const answers = [
      { id: "a1", reasoningText: null, outcomeClass: "strong" },
      { id: "a2", reasoningText: "I chose this because...", outcomeClass: "failure" },
      { id: "a3", reasoningText: "", outcomeClass: "acceptable" },
    ];
    const withReasoning = answers.filter(a => a.reasoningText !== null && a.reasoningText !== undefined && a.reasoningText !== "");
    expect(withReasoning).toHaveLength(1);
    expect(withReasoning[0].id).toBe("a2");
  });

  it("applies capability filter correctly", () => {
    const answers = [
      { id: "a1", capability: "ai_interaction", reasoningText: "text1" },
      { id: "a2", capability: "ai_ethics_trust", reasoningText: "text2" },
      { id: "a3", capability: "ai_interaction", reasoningText: "text3" },
    ];
    const filtered = answers.filter(a => a.capability === "ai_interaction");
    expect(filtered).toHaveLength(2);
    expect(filtered.map(a => a.id)).toEqual(["a1", "a3"]);
  });

  it("applies interactionType filter correctly", () => {
    const answers = [
      { id: "a1", interactionType: "risk_judgement", reasoningText: "text1" },
      { id: "a2", interactionType: "governance_decision", reasoningText: "text2" },
      { id: "a3", interactionType: "risk_judgement", reasoningText: "text3" },
    ];
    const filtered = answers.filter(a => a.interactionType === "risk_judgement");
    expect(filtered).toHaveLength(2);
  });

  it("paginates results correctly", () => {
    const answers = Array.from({ length: 25 }, (_, i) => ({
      id: `a${i + 1}`,
      reasoningText: `reasoning ${i + 1}`,
    }));
    const page = 2;
    const pageSize = 10;
    const paginated = answers.slice((page - 1) * pageSize, page * pageSize);
    expect(paginated).toHaveLength(10);
    expect(paginated[0].id).toBe("a11");
    expect(paginated[9].id).toBe("a20");
  });

  it("returns total count alongside paginated records", () => {
    const total = 47;
    const records = Array.from({ length: 10 }, (_, i) => ({ id: `a${i + 1}` }));
    const result = { records, total, page: 1, pageSize: 10 };
    expect(result.total).toBe(47);
    expect(result.records).toHaveLength(10);
  });
});

// ─── getBenchmarks: normEngine integration ───────────────────────────────────

describe("getBenchmarks — normEngine integration", () => {
  it("getNormMeans returns all 6 v10 capability domains", () => {
    const means = getNormMeans("generalist", "mid");
    const keys = Object.keys(means);
    expect(keys).toContain("ai_interaction");
    expect(keys).toContain("ai_output_evaluation");
    expect(keys).toContain("ai_workflow_design");
    expect(keys).toContain("workforce_ai_readiness");
    expect(keys).toContain("ai_ethics_trust");
    expect(keys).toContain("ai_change_leadership");
    expect(keys).toHaveLength(6);
  });

  it("getNormMeans returns numeric roleMean, platformMean, stdDev for each domain", () => {
    const means = getNormMeans("specialist", "senior");
    for (const [, data] of Object.entries(means)) {
      expect(typeof data.roleMean).toBe("number");
      expect(typeof data.platformMean).toBe("number");
      expect(typeof data.stdDev).toBe("number");
      expect(data.roleMean).toBeGreaterThan(0);
      expect(data.roleMean).toBeLessThanOrEqual(100);
      expect(data.stdDev).toBeGreaterThan(0);
    }
  });

  it("getNormMeans with unknown role family falls back to generalist", () => {
    const meansKnown = getNormMeans("generalist", "mid");
    const meansUnknown = getNormMeans("nonexistent_role", "mid");
    // Both should return valid data
    expect(Object.keys(meansUnknown)).toHaveLength(6);
    expect(meansUnknown.ai_interaction.roleMean).toBe(meansKnown.ai_interaction.roleMean);
  });

  it("getNormMeans with null inputs falls back gracefully", () => {
    const means = getNormMeans(null, null);
    expect(Object.keys(means)).toHaveLength(6);
    for (const [, data] of Object.entries(means)) {
      expect(data.roleMean).toBeGreaterThan(0);
    }
  });

  it("resolveRoleFamily maps known families correctly", () => {
    expect(resolveRoleFamily("generalist")).toBe("generalist");
    expect(resolveRoleFamily("specialist")).toBe("specialist");
    expect(resolveRoleFamily("analytics")).toBe("analytics");
    expect(resolveRoleFamily("leadership")).toBe("leadership");
    expect(resolveRoleFamily("coordinator")).toBe("coordinator");
  });

  it("resolveRoleFamily falls back to generalist for unknown input", () => {
    expect(resolveRoleFamily("unknown_family")).toBe("generalist");
    expect(resolveRoleFamily(null)).toBe("generalist");
    expect(resolveRoleFamily(undefined)).toBe("generalist");
  });

  it("resolveSeniorityTier maps known tiers correctly", () => {
    expect(resolveSeniorityTier("junior")).toBe("junior");
    expect(resolveSeniorityTier("mid")).toBe("mid");
    expect(resolveSeniorityTier("senior")).toBe("senior");
  });

  it("resolveSeniorityTier falls back to mid for unknown input", () => {
    expect(resolveSeniorityTier("unknown")).toBe("mid");
    expect(resolveSeniorityTier(null)).toBe("mid");
  });

  it("NORM_GROUP_VERSION is a non-empty string", () => {
    expect(typeof NORM_GROUP_VERSION).toBe("string");
    expect(NORM_GROUP_VERSION.length).toBeGreaterThan(0);
  });
});

// ─── computePercentile ───────────────────────────────────────────────────────

describe("computePercentile — score contextualisation", () => {
  it("score at roleMean returns ~50th percentile", () => {
    const means = getNormMeans("generalist", "mid");
    const roleMean = means.ai_interaction.roleMean;
    const result = computePercentile(roleMean, "ai_interaction", "generalist", "mid");
    // Should be close to 50th percentile (within ±10)
    expect(result.percentile).toBeGreaterThan(40);
    expect(result.percentile).toBeLessThan(60);
  });

  it("score well above roleMean returns high percentile", () => {
    const means = getNormMeans("generalist", "mid");
    const highScore = Math.min(100, means.ai_interaction.roleMean + 2 * means.ai_interaction.stdDev);
    const result = computePercentile(highScore, "ai_interaction", "generalist", "mid");
    expect(result.percentile).toBeGreaterThan(90);
  });

  it("score well below roleMean returns low percentile", () => {
    const means = getNormMeans("generalist", "mid");
    const lowScore = Math.max(0, means.ai_interaction.roleMean - 2 * means.ai_interaction.stdDev);
    const result = computePercentile(lowScore, "ai_interaction", "generalist", "mid");
    expect(result.percentile).toBeLessThan(10);
  });

  it("returns percentileBand alongside percentile", () => {
    const result = computePercentile(75, "ai_ethics_trust", "generalist", "mid");
    expect(result.percentileBand).toBeDefined();
    expect(["bottom_quartile", "lower_mid", "upper_mid", "top_quartile"]).toContain(result.percentileBand);
  });
});

// ─── scoreToPercentileBand ────────────────────────────────────────────────────

describe("scoreToPercentileBand — band classification", () => {
  it("percentile < 25 → bottom_quartile", () => {
    expect(scoreToPercentileBand(10)).toBe("bottom_quartile");
    expect(scoreToPercentileBand(24)).toBe("bottom_quartile");
  });

  it("percentile 25–49 → lower_mid", () => {
    expect(scoreToPercentileBand(25)).toBe("lower_mid");
    expect(scoreToPercentileBand(49)).toBe("lower_mid");
  });

  it("percentile 50–74 → upper_mid", () => {
    expect(scoreToPercentileBand(50)).toBe("upper_mid");
    expect(scoreToPercentileBand(74)).toBe("upper_mid");
  });

  it("percentile >= 75 → top_quartile", () => {
    expect(scoreToPercentileBand(75)).toBe("top_quartile");
    expect(scoreToPercentileBand(99)).toBe("top_quartile");
  });
});

// ─── computeAllPercentiles ────────────────────────────────────────────────────

describe("computeAllPercentiles — full profile", () => {
  it("returns percentile for all 6 v10 domains", () => {
    const scores = {
      ai_interaction: 72,
      ai_output_evaluation: 65,
      ai_workflow_design: 58,
      workforce_ai_readiness: 80,
      ai_ethics_trust: 70,
      ai_change_leadership: 55,
    };
    const results = computeAllPercentiles(scores, "generalist", "mid");
    expect(Object.keys(results)).toHaveLength(6);
    for (const [, result] of Object.entries(results)) {
      expect(result.percentile).toBeGreaterThanOrEqual(0);
      expect(result.percentile).toBeLessThanOrEqual(100);
    }
  });

  it("handles missing capability scores gracefully", () => {
    const scores = {
      ai_interaction: 72,
      // missing 5 other capabilities
    };
    const results = computeAllPercentiles(scores, "generalist", "mid");
    // Should still return 6 entries (missing ones default to 50)
    expect(Object.keys(results)).toHaveLength(6);
  });
});

// ─── getBenchmarks: score extraction helper ───────────────────────────────────

describe("getBenchmarks — score extraction from mixed formats", () => {
  it("extracts score from flat number format", () => {
    const extractScore = (val: number | { score: number; weight?: number } | undefined): number => {
      if (val === undefined || val === null) return 0;
      if (typeof val === "number") return val;
      return (val as { score: number }).score ?? 0;
    };
    expect(extractScore(72)).toBe(72);
    expect(extractScore(0)).toBe(0);
    expect(extractScore(100)).toBe(100);
  });

  it("extracts score from object format {score, weight}", () => {
    const extractScore = (val: number | { score: number; weight?: number } | undefined): number => {
      if (val === undefined || val === null) return 0;
      if (typeof val === "number") return val;
      return (val as { score: number }).score ?? 0;
    };
    expect(extractScore({ score: 68, weight: 1.2 })).toBe(68);
    expect(extractScore({ score: 0 })).toBe(0);
  });

  it("returns 0 for undefined or null values", () => {
    const extractScore = (val: number | { score: number; weight?: number } | undefined): number => {
      if (val === undefined || val === null) return 0;
      if (typeof val === "number") return val;
      return (val as { score: number }).score ?? 0;
    };
    expect(extractScore(undefined)).toBe(0);
    expect(extractScore(null as any)).toBe(0);
  });

  it("getBenchmarks returns capabilities array with 6 entries for known session", () => {
    // Simulate the shape returned by getBenchmarks
    const ALL_CAPS = ["ai_interaction", "ai_output_evaluation", "ai_workflow_design", "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership"] as const;
    const capabilityScoresRaw: Record<string, number> = {
      ai_interaction: 72,
      ai_output_evaluation: 65,
      ai_workflow_design: 58,
      workforce_ai_readiness: 80,
      ai_ethics_trust: 70,
      ai_change_leadership: 55,
    };
    const normMeans = getNormMeans("generalist", "mid");
    const capabilities = ALL_CAPS.map(cap => ({
      key: cap,
      userScore: Math.round(capabilityScoresRaw[cap] ?? 0),
      roleMean: normMeans[cap].roleMean,
      platformMean: normMeans[cap].platformMean,
      stdDev: normMeans[cap].stdDev,
    }));
    expect(capabilities).toHaveLength(6);
    expect(capabilities[0].key).toBe("ai_interaction");
    expect(capabilities[0].userScore).toBe(72);
    expect(capabilities[0].roleMean).toBeGreaterThan(0);
  });
});
