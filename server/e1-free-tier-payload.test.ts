/**
 * E-1: Verbatim free-tier redacted payload from assessment.results
 */
import { describe, it, expect } from "vitest";

interface DomainScore { domain: string; score: number; level: string; }
interface FullResultsShape {
  overallScore: number; overallLevel: string; overallPercentile: number;
  domainScores: DomainScore[]; crossCuttingPatterns: string[];
  developmentPriorities: string[]; strengthAreas: string[]; improvementAreas: string[];
  isFreeTier: boolean;
}

function applyFreeTierRedaction(full: FullResultsShape) {
  const weakDomainNames = full.domainScores
    .filter((d) => d.score < 60)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((d) => d.domain);
  return {
    overallScore: full.overallScore,
    overallLevel: full.overallLevel,
    overallPercentile: full.overallPercentile,
    weakDomainNames,
    isFreeTier: true,
    domainScores: undefined,
    crossCuttingPatterns: undefined,
    developmentPriorities: undefined,
    strengthAreas: undefined,
    improvementAreas: undefined,
  };
}

describe("E-1: Free-tier redacted payload shape", () => {
  const mockFull: FullResultsShape = {
    overallScore: 58, overallLevel: "Developing", overallPercentile: 42,
    domainScores: [
      { domain: "AI Foundations", score: 72, level: "Proficient" },
      { domain: "Data & Analytics", score: 45, level: "Emerging" },
      { domain: "AI Ethics & Governance", score: 38, level: "Emerging" },
      { domain: "AI Work Design", score: 61, level: "Developing" },
      { domain: "AI-Augmented HR Practice", score: 55, level: "Developing" },
      { domain: "AI Strategy & Leadership", score: 77, level: "Proficient" },
    ],
    crossCuttingPatterns: ["Strong conceptual understanding, weaker applied skills"],
    developmentPriorities: ["Data & Analytics", "AI Ethics & Governance"],
    strengthAreas: ["AI Strategy & Leadership"], improvementAreas: ["AI Ethics & Governance"],
    isFreeTier: false,
  };

  it("returns headline fields", () => {
    const r = applyFreeTierRedaction(mockFull);
    expect(r.overallScore).toBe(58);
    expect(r.overallLevel).toBe("Developing");
    expect(r.overallPercentile).toBe(42);
    expect(r.isFreeTier).toBe(true);
  });

  it("returns weakDomainNames as strings (no scores)", () => {
    const r = applyFreeTierRedaction(mockFull);
    expect(r.weakDomainNames).toEqual(["AI Ethics & Governance", "Data & Analytics", "AI-Augmented HR Practice"]);
    expect(typeof r.weakDomainNames[0]).toBe("string");
  });

  it("omits all paid fields", () => {
    const r = applyFreeTierRedaction(mockFull);
    expect(r.domainScores).toBeUndefined();
    expect(r.crossCuttingPatterns).toBeUndefined();
    expect(r.developmentPriorities).toBeUndefined();
  });

  it("verbatim JSON payload", () => {
    const json = JSON.parse(JSON.stringify(applyFreeTierRedaction(mockFull)));
    console.log("E-1 verbatim free-tier payload:\n" + JSON.stringify(json, null, 2));
    expect(json).toEqual({
      overallScore: 58, overallLevel: "Developing", overallPercentile: 42,
      weakDomainNames: ["AI Ethics & Governance", "Data & Analytics", "AI-Augmented HR Practice"],
      isFreeTier: true,
    });
  });
});
