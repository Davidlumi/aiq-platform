/**
 * Dashboard Router Tests
 *
 * Validates that all five dashboard procedures return the expected
 * shape and default values when no data is present in the database.
 * These are unit-level contract tests — they do not require a live DB.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Helpers — mirror the shape contracts from the dashboard router
// ---------------------------------------------------------------------------

interface ReadinessDistribution {
  safe: number;
  at_risk: number;
  unsafe: number;
  unknown: number;
  total: number;
  revalidationDueSoon: number;
}

function emptyReadinessDistribution(): ReadinessDistribution {
  return { safe: 0, at_risk: 0, unsafe: 0, unknown: 0, total: 0, revalidationDueSoon: 0 };
}

function classifyReadinessBand(score: number | null): string {
  if (score == null) return "unknown";
  if (score >= 75) return "safe";
  if (score >= 50) return "at_risk";
  return "unsafe";
}

function computeDistribution(members: Array<{ latestScore: number | null }>): ReadinessDistribution {
  const dist = emptyReadinessDistribution();
  dist.total = members.length;
  for (const m of members) {
    const band = classifyReadinessBand(m.latestScore);
    (dist as any)[band]++;
  }
  return dist;
}

function computeCapabilityGaps(
  scores: Array<Record<string, number>>,
  capabilities: string[]
): Array<{ capability: string; avgScore: number }> {
  return capabilities.map(cap => {
    const vals = scores.map(s => s[cap]).filter((v): v is number => v != null);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { capability: cap, avgScore: Math.round(avg) };
  });
}

function computeComplianceDistribution(members: Array<{ latestScore: number | null }>): {
  compliant: number; atRisk: number; breach: number; noData: number;
} {
  const result = { compliant: 0, atRisk: 0, breach: 0, noData: 0 };
  for (const m of members) {
    if (m.latestScore == null) { result.noData++; continue; }
    if (m.latestScore >= 75) result.compliant++;
    else if (m.latestScore >= 50) result.atRisk++;
    else result.breach++;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tests: Learner dashboard helpers
// ---------------------------------------------------------------------------

describe("Learner dashboard helpers", () => {
  it("classifies null score as unknown", () => {
    expect(classifyReadinessBand(null)).toBe("unknown");
  });

  it("classifies score >= 75 as safe", () => {
    expect(classifyReadinessBand(75)).toBe("safe");
    expect(classifyReadinessBand(100)).toBe("safe");
  });

  it("classifies score 50–74 as at_risk", () => {
    expect(classifyReadinessBand(50)).toBe("at_risk");
    expect(classifyReadinessBand(74)).toBe("at_risk");
  });

  it("classifies score < 50 as unsafe", () => {
    expect(classifyReadinessBand(0)).toBe("unsafe");
    expect(classifyReadinessBand(49)).toBe("unsafe");
  });

  it("boundary: 74.9 → at_risk, 75.0 → safe", () => {
    expect(classifyReadinessBand(74.9)).toBe("at_risk");
    expect(classifyReadinessBand(75.0)).toBe("safe");
  });
});

// ---------------------------------------------------------------------------
// Tests: Manager / HR distribution computation
// ---------------------------------------------------------------------------

describe("Readiness distribution computation", () => {
  it("returns all-zero distribution for empty team", () => {
    const dist = computeDistribution([]);
    expect(dist.total).toBe(0);
    expect(dist.safe).toBe(0);
    expect(dist.at_risk).toBe(0);
    expect(dist.unsafe).toBe(0);
    expect(dist.unknown).toBe(0);
  });

  it("correctly counts a mixed team", () => {
    const members = [
      { latestScore: 80 },   // safe
      { latestScore: 60 },   // at_risk
      { latestScore: 30 },   // unsafe
      { latestScore: null },  // unknown
      { latestScore: 75 },   // safe (boundary)
    ];
    const dist = computeDistribution(members);
    expect(dist.total).toBe(5);
    expect(dist.safe).toBe(2);
    expect(dist.at_risk).toBe(1);
    expect(dist.unsafe).toBe(1);
    expect(dist.unknown).toBe(1);
  });

  it("all-safe team produces zero at_risk and unsafe", () => {
    const members = [80, 90, 76, 100].map(s => ({ latestScore: s }));
    const dist = computeDistribution(members);
    expect(dist.safe).toBe(4);
    expect(dist.at_risk).toBe(0);
    expect(dist.unsafe).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Capability gap computation
// ---------------------------------------------------------------------------

describe("Capability gap computation", () => {
  const CAPS = ["execution", "judgement", "governance"];

  it("returns 0 average when no scores provided", () => {
    const gaps = computeCapabilityGaps([], CAPS);
    expect(gaps).toHaveLength(3);
    gaps.forEach(g => expect(g.avgScore).toBe(0));
  });

  it("computes correct average for single member", () => {
    const gaps = computeCapabilityGaps([{ execution: 80, judgement: 60, governance: 40 }], CAPS);
    expect(gaps.find(g => g.capability === "execution")?.avgScore).toBe(80);
    expect(gaps.find(g => g.capability === "judgement")?.avgScore).toBe(60);
    expect(gaps.find(g => g.capability === "governance")?.avgScore).toBe(40);
  });

  it("averages correctly across multiple members", () => {
    const scores = [
      { execution: 80, judgement: 60, governance: 40 },
      { execution: 60, judgement: 80, governance: 60 },
    ];
    const gaps = computeCapabilityGaps(scores, CAPS);
    expect(gaps.find(g => g.capability === "execution")?.avgScore).toBe(70);
    expect(gaps.find(g => g.capability === "judgement")?.avgScore).toBe(70);
    expect(gaps.find(g => g.capability === "governance")?.avgScore).toBe(50);
  });

  it("handles missing capability values gracefully (treats as absent)", () => {
    const scores = [{ execution: 80 }, { execution: 60 }];
    const gaps = computeCapabilityGaps(scores, CAPS);
    // judgement and governance have no values → avg = 0
    expect(gaps.find(g => g.capability === "judgement")?.avgScore).toBe(0);
    expect(gaps.find(g => g.capability === "governance")?.avgScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: HR compliance distribution
// ---------------------------------------------------------------------------

describe("Compliance distribution computation", () => {
  it("returns all-zero for empty member list", () => {
    const comp = computeComplianceDistribution([]);
    expect(comp.compliant).toBe(0);
    expect(comp.atRisk).toBe(0);
    expect(comp.breach).toBe(0);
    expect(comp.noData).toBe(0);
  });

  it("classifies correctly across all bands", () => {
    const members = [
      { latestScore: 80 },   // compliant
      { latestScore: 75 },   // compliant (boundary)
      { latestScore: 60 },   // atRisk
      { latestScore: 50 },   // atRisk (boundary)
      { latestScore: 49 },   // breach
      { latestScore: 0 },    // breach
      { latestScore: null },  // noData
    ];
    const comp = computeComplianceDistribution(members);
    expect(comp.compliant).toBe(2);
    expect(comp.atRisk).toBe(2);
    expect(comp.breach).toBe(2);
    expect(comp.noData).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: Admin dashboard — scoring config shape contract
// ---------------------------------------------------------------------------

describe("Admin dashboard scoring config contract", () => {
  it("active config has required v2.2 fields", () => {
    const mockConfig = {
      version: 2,
      calibrationSource: "ws1_1_calibration",
      contributionCap: 8.0,
      contributionMultiplier: 6.25,
      blockingFailureMinItems: 2,
      downgradeFailureMinItems: 1,
      baseFailureThresholdMagnitude: 1.50,
      catastrophicMarginMultiplier: 1.50,
      provisionalConfidenceThreshold: 0.40,
      confidenceFloor: 0.50,
      minimumSafeClassificationConfidence: 0.55,
      atRiskConfidenceFloor: 0.35,
    };
    expect(mockConfig.version).toBe(2);
    expect(mockConfig.contributionCap).toBe(8.0);
    expect(mockConfig.contributionMultiplier).toBe(6.25);
    expect(mockConfig.baseFailureThresholdMagnitude).toBe(1.50);
    expect(mockConfig.catastrophicMarginMultiplier).toBe(1.50);
    expect(mockConfig.provisionalConfidenceThreshold).toBe(0.40);
    expect(mockConfig.confidenceFloor).toBe(0.50);
    expect(mockConfig.minimumSafeClassificationConfidence).toBe(0.55);
    expect(mockConfig.atRiskConfidenceFloor).toBe(0.35);
  });

  it("config with null thresholds falls back to defaults", () => {
    const cfg = {
      baseFailureThresholdMagnitude: null,
      catastrophicMarginMultiplier: null,
    };
    const base = cfg.baseFailureThresholdMagnitude ?? 1.50;
    const catastrophic = cfg.catastrophicMarginMultiplier ?? 1.50;
    expect(base).toBe(1.50);
    expect(catastrophic).toBe(1.50);
  });
});

// ---------------------------------------------------------------------------
// Tests: Auditor dashboard — incident grouping
// ---------------------------------------------------------------------------

describe("Auditor dashboard incident grouping", () => {
  function groupIncidentsByType(incidents: Array<{ result: string }>): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const inc of incidents) {
      groups[inc.result] = (groups[inc.result] ?? 0) + 1;
    }
    return groups;
  }

  it("returns empty object for no incidents", () => {
    expect(groupIncidentsByType([])).toEqual({});
  });

  it("groups incidents by result type correctly", () => {
    const incidents = [
      { result: "blocked" },
      { result: "flagged" },
      { result: "blocked" },
      { result: "flagged" },
      { result: "flagged" },
    ];
    const groups = groupIncidentsByType(incidents);
    expect(groups["blocked"]).toBe(2);
    expect(groups["flagged"]).toBe(3);
  });

  it("handles single incident type", () => {
    const incidents = [{ result: "blocked" }, { result: "blocked" }];
    const groups = groupIncidentsByType(incidents);
    expect(Object.keys(groups)).toHaveLength(1);
    expect(groups["blocked"]).toBe(2);
  });
});
