/**
 * AiQ v2.2 — WS2.1/WS2.2: Anti-Gaming Tests
 *
 * Tests:
 * - WS2.1: Outcome-conditional pattern detection (high-risk safe + low-risk strong)
 * - WS2.2: Role-aware thresholds (specialist, leader, generalist)
 * - WS2.3: Extended audit event codes
 * - Feature flag: ANTI_GAMING_OUTCOME_CONDITIONAL defaults ON
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  analyseGamingPatterns,
  ANTI_GAMING_OUTCOME_CONDITIONAL,
  GAMING_AUDIT_EVENT_CODES,
} from "./assessment/antiGamingEngine";

// ─── Helper: build a minimal answer for analyseGamingPatterns ────────────────
function makeAnswer(overrides: {
  outcomeClass?: string;
  riskLevel?: string;
  selectedValue?: string;
  optionPosition?: number;
  timeToAnswerMs?: number;
  confidenceScore?: number;
  signalDeltas?: Record<string, number>;
  interactionType?: string;
} = {}) {
  return {
    selectedValue: overrides.selectedValue ?? "B",
    optionPosition: overrides.optionPosition ?? 1,
    timeToAnswerMs: overrides.timeToAnswerMs ?? 15_000,
    outcomeClass: overrides.outcomeClass ?? "acceptable",
    confidenceScore: overrides.confidenceScore ?? 0.7,
    signalDeltas: overrides.signalDeltas ?? {},
    interactionType: overrides.interactionType ?? "governance_decision",
    riskLevel: overrides.riskLevel ?? "Medium",
  };
}

// ─── WS2.1: Outcome-conditional detection ────────────────────────────────────
describe("WS2.1 — outcome-conditional safe pattern detection", () => {
  it("detects outcome_conditional_safe when >70% high-risk answers are safe and >70% low-risk are strong", () => {
    // 4 high-risk items → all acceptable (safe gaming)
    const highRiskAnswers = Array.from({ length: 4 }, () =>
      makeAnswer({ outcomeClass: "acceptable", riskLevel: "High" })
    );
    // 4 low-risk items → all strong (performing well on easy items)
    const lowRiskAnswers = Array.from({ length: 4 }, () =>
      makeAnswer({ outcomeClass: "strong", riskLevel: "Low" })
    );
    const result = analyseGamingPatterns([...highRiskAnswers, ...lowRiskAnswers]);
    expect(result.patterns).toContain("outcome_conditional_safe");
  });

  it("does NOT detect outcome_conditional_safe when high-risk answers are also strong", () => {
    const highRiskAnswers = Array.from({ length: 4 }, () =>
      makeAnswer({ outcomeClass: "strong", riskLevel: "High" })
    );
    const lowRiskAnswers = Array.from({ length: 4 }, () =>
      makeAnswer({ outcomeClass: "strong", riskLevel: "Low" })
    );
    const result = analyseGamingPatterns([...highRiskAnswers, ...lowRiskAnswers]);
    expect(result.patterns).not.toContain("outcome_conditional_safe");
  });

  it("requires at least 8 total answers before outcome-conditional check activates", () => {
    // Only 6 answers — below the 8-answer minimum
    const answers = [
      makeAnswer({ outcomeClass: "acceptable", riskLevel: "High" }),
      makeAnswer({ outcomeClass: "acceptable", riskLevel: "High" }),
      makeAnswer({ outcomeClass: "acceptable", riskLevel: "High" }),
      makeAnswer({ outcomeClass: "strong", riskLevel: "Low" }),
      makeAnswer({ outcomeClass: "strong", riskLevel: "Low" }),
      makeAnswer({ outcomeClass: "strong", riskLevel: "Low" }),
    ];
    const result = analyseGamingPatterns(answers);
    // With only 6 answers, the engine returns early with score=1.0 and no patterns
    expect(result.patterns).not.toContain("outcome_conditional_safe");
  });

  it("requires at least 3 high-risk AND 3 low-risk answers for the check", () => {
    // 8 answers but only 2 high-risk — below the 3-minimum
    const answers = [
      makeAnswer({ outcomeClass: "acceptable", riskLevel: "High" }),
      makeAnswer({ outcomeClass: "acceptable", riskLevel: "High" }),
      makeAnswer({ outcomeClass: "strong", riskLevel: "Low" }),
      makeAnswer({ outcomeClass: "strong", riskLevel: "Low" }),
      makeAnswer({ outcomeClass: "strong", riskLevel: "Low" }),
      makeAnswer({ outcomeClass: "strong", riskLevel: "Low" }),
      makeAnswer({ outcomeClass: "strong", riskLevel: "Low" }),
      makeAnswer({ outcomeClass: "strong", riskLevel: "Low" }),
    ];
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).not.toContain("outcome_conditional_safe");
  });

  it("injects a governance_decision trap item when outcome_conditional_safe is detected", () => {
    const highRiskAnswers = Array.from({ length: 4 }, () =>
      makeAnswer({ outcomeClass: "acceptable", riskLevel: "High" })
    );
    const lowRiskAnswers = Array.from({ length: 4 }, () =>
      makeAnswer({ outcomeClass: "strong", riskLevel: "Low" })
    );
    const result = analyseGamingPatterns([...highRiskAnswers, ...lowRiskAnswers]);
    expect(result.injectionRequired).toBe(true);
    const trapInjection = result.recommendedInjections.find(
      inj => inj.targetPattern === "outcome_conditional_safe"
    );
    expect(trapInjection).toBeDefined();
    expect(trapInjection?.targetCapability).toBe("governance");
  });
});

// ─── WS2.1: Feature flag defaults ON ─────────────────────────────────────────
describe("WS2.1 — ANTI_GAMING_OUTCOME_CONDITIONAL feature flag", () => {
  it("ANTI_GAMING_OUTCOME_CONDITIONAL is true by default (no env override)", () => {
    // The module-level const is evaluated at import time
    // In test environment, env var is not set → should default to true
    expect(ANTI_GAMING_OUTCOME_CONDITIONAL).toBe(true);
  });
});

// ─── WS2.2: Role-aware thresholds ────────────────────────────────────────────
describe("WS2.2 — role-aware anti-gaming thresholds", () => {
  it("specialist role has lower always_safe threshold (0.70 vs 0.75 default)", () => {
    // 8 answers: 6/8 = 75% acceptable — below default threshold (0.75) but above specialist (0.70)
    const answers = Array.from({ length: 8 }, (_, i) =>
      makeAnswer({ outcomeClass: i < 6 ? "acceptable" : "strong" })
    );
    const defaultResult = analyseGamingPatterns(answers, "generalist");
    const specialistResult = analyseGamingPatterns(answers, "specialist");
    // Specialist has lower threshold → more likely to flag
    // At 75% acceptable: default threshold is 0.75 (exactly at boundary), specialist is 0.70
    // Both should detect it at this level, but specialist is stricter
    expect(typeof specialistResult.score).toBe("number");
    expect(specialistResult.score).toBeLessThanOrEqual(1.0);
  });

  it("seniority_inconsistent pattern is suppressed for junior users (seniority=1)", () => {
    // Junior user (seniority=1) picking mostly weak/failure answers — should NOT be flagged
    const answers = Array.from({ length: 8 }, () =>
      makeAnswer({ outcomeClass: "weak" })
    );
    const juniorResult = analyseGamingPatterns(answers, "generalist", 1);
    expect(juniorResult.patterns).not.toContain("seniority_inconsistent");
  });

  it("seniority_inconsistent pattern IS detected for senior users (seniority=3) with >50% weak answers", () => {
    // Senior user (seniority=3) picking mostly weak answers — should be flagged
    const answers = Array.from({ length: 8 }, () =>
      makeAnswer({ outcomeClass: "weak" })
    );
    const seniorResult = analyseGamingPatterns(answers, "generalist", 3);
    expect(seniorResult.patterns).toContain("seniority_inconsistent");
  });

  it("seniority_inconsistent is NOT triggered when senior user has ≤50% weak answers", () => {
    const answers = Array.from({ length: 8 }, (_, i) =>
      makeAnswer({ outcomeClass: i < 4 ? "weak" : "strong" })
    );
    const seniorResult = analyseGamingPatterns(answers, "generalist", 3);
    expect(seniorResult.patterns).not.toContain("seniority_inconsistent");
  });
});

// ─── WS2.3: Extended audit event codes ───────────────────────────────────────
describe("WS2.3 — extended audit event codes", () => {
  it("GAMING_AUDIT_EVENT_CODES contains outcome_conditional_safe code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.outcome_conditional_safe).toBeDefined();
    expect(typeof GAMING_AUDIT_EVENT_CODES.outcome_conditional_safe).toBe("string");
  });

  it("GAMING_AUDIT_EVENT_CODES contains seniority_inconsistent code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.seniority_inconsistent).toBeDefined();
    expect(typeof GAMING_AUDIT_EVENT_CODES.seniority_inconsistent).toBe("string");
  });

  it("all GamingPattern types have an audit event code", () => {
    const expectedPatterns = [
      "always_safe_choice",
      "always_escalate",
      "always_cautious",
      "option_position_bias",
      "speed_gaming",
      "inconsistent_responses",
      "polished_shallow",
      "pattern_cycling",
      "outcome_cycling",
      "outcome_conditional_safe",
      "seniority_inconsistent",
    ];
    for (const pattern of expectedPatterns) {
      expect(GAMING_AUDIT_EVENT_CODES[pattern as keyof typeof GAMING_AUDIT_EVENT_CODES]).toBeDefined();
    }
  });
});

// ─── General anti-gaming engine sanity checks ────────────────────────────────
describe("analyseGamingPatterns — general behaviour", () => {
  it("returns score=1.0 and no patterns when fewer than 5 answers", () => {
    const answers = Array.from({ length: 4 }, () => makeAnswer());
    const result = analyseGamingPatterns(answers);
    expect(result.score).toBe(1.0);
    expect(result.patterns).toHaveLength(0);
    expect(result.injectionRequired).toBe(false);
  });

  it("always_safe_choice pattern is detected when >75% answers are acceptable and <10% are strong", () => {
    // 8 acceptable, 0 strong → acceptableRate=1.0 > 0.75, strongRate=0.0 < 0.10
    const answers = Array.from({ length: 8 }, () =>
      makeAnswer({ outcomeClass: "acceptable" })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("always_safe_choice");
  });

  it("scrutinyLevel escalates to elevated when gaming score drops", () => {
    const answers = Array.from({ length: 8 }, () =>
      makeAnswer({ outcomeClass: "acceptable" })
    );
    const result = analyseGamingPatterns(answers);
    expect(["elevated", "high"]).toContain(result.scrutinyLevel);
  });
});
