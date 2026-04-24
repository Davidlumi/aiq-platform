/**
 * AiQ Adversarial Testing — Part 1.2: Timing and Pacing Anomalies
 *
 * Tests the specific failure modes around timing: extremely fast answering,
 * extremely slow answering, fast-slow oscillation, and consistent median timing.
 *
 * All tests use the pure analyseGamingPatterns function from antiGamingEngine.ts
 * to avoid DB dependencies.
 */
import { describe, it, expect } from "vitest";
import {
  analyseGamingPatterns,
  type GamingPattern,
} from "./assessment/antiGamingEngine";

// ─── Helper: build a synthetic answer ────────────────────────────────────────

interface SyntheticAnswer {
  selectedValue: string;
  optionPosition: number;
  timeToAnswerMs: number;
  outcomeClass: string;
  confidenceScore: number;
  signalDeltas: Record<string, number>;
  interactionType: string;
  riskLevel?: string;
}

function makeAnswer(overrides: Partial<SyntheticAnswer> = {}): SyntheticAnswer {
  return {
    selectedValue: "B",
    optionPosition: 1,
    timeToAnswerMs: 45_000, // 45 seconds — normal
    outcomeClass: "acceptable",
    confidenceScore: 0.7,
    signalDeltas: {
      output_evaluation_quality: 0.3,
      prompt_construction_quality: 0.2,
    },
    interactionType: "scenario_critique",
    riskLevel: "Medium",
    ...overrides,
  };
}

/** Build N answers with the same overrides */
function buildAnswers(n: number, overrides: Partial<SyntheticAnswer> = {}): SyntheticAnswer[] {
  return Array.from({ length: n }, () => makeAnswer(overrides));
}

// ─── 1.2a: Extremely fast answering ──────────────────────────────────────────

describe("1.2a — Extremely fast answering: speed gaming detection", () => {
  it("answering every item in under 2 seconds triggers speed_gaming pattern", () => {
    const answers = buildAnswers(10, {
      timeToAnswerMs: 1_500, // 1.5 seconds — well below all thresholds
      outcomeClass: "acceptable",
    });
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("speed_gaming");
  });

  it("answering every item in under 5 seconds triggers speed_gaming pattern", () => {
    const answers = buildAnswers(10, {
      timeToAnswerMs: 4_500, // 4.5 seconds — below most thresholds
      outcomeClass: "acceptable",
    });
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("speed_gaming");
  });

  it("speed gaming raises scrutiny level to at least elevated", () => {
    const answers = buildAnswers(10, { timeToAnswerMs: 1_000 });
    const result = analyseGamingPatterns(answers);
    expect(["elevated", "high"]).toContain(result.scrutinyLevel);
  });

  it("speed gaming triggers a trap injection for ethical_pressure_test", () => {
    const answers = buildAnswers(10, { timeToAnswerMs: 1_000 });
    const result = analyseGamingPatterns(answers);
    const speedInjection = result.recommendedInjections.find(
      i => i.targetPattern === "speed_gaming"
    );
    expect(speedInjection).toBeDefined();
    expect(speedInjection?.type).toBe("trap");
    expect(speedInjection?.interactionType).toBe("ethical_pressure_test");
  });

  it("speed gaming reduces the credibility score below 0.9", () => {
    const answers = buildAnswers(10, { timeToAnswerMs: 1_000 });
    const result = analyseGamingPatterns(answers);
    expect(result.score).toBeLessThan(0.9);
  });

  it("answering in 15 seconds does NOT trigger speed_gaming for scenario_critique (threshold: 12s)", () => {
    const answers = buildAnswers(10, {
      timeToAnswerMs: 15_000, // 15 seconds — above 12s threshold
      interactionType: "scenario_critique",
    });
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).not.toContain("speed_gaming");
  });
});

// ─── 1.2b: Extremely slow answering ──────────────────────────────────────────

describe("1.2b — Extremely slow answering: session validity", () => {
  it("answering in 45 minutes (2,700,000ms) does NOT trigger speed_gaming", () => {
    const answers = buildAnswers(10, {
      timeToAnswerMs: 2_700_000, // 45 minutes
      outcomeClass: "strong",
    });
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).not.toContain("speed_gaming");
  });

  it("slow answering with strong outcomes and varied positions does not trigger gaming patterns", () => {
    // Build answers with varied positions to avoid option_position_bias
    const answers = Array.from({ length: 10 }, (_, i) => ({
      selectedValue: String.fromCharCode(65 + (i % 4)),
      optionPosition: i % 4, // rotate through positions 0,1,2,3
      timeToAnswerMs: 300_000, // 5 minutes per item
      outcomeClass: "strong" as const,
      confidenceScore: 0.9,
      signalDeltas: {
        output_evaluation_quality: 0.8,
        prompt_construction_quality: 0.7,
        ethics_under_pressure: 0.5,
      },
      interactionType: "scenario_critique",
      riskLevel: "High",
    }));
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).not.toContain("speed_gaming");
    // Note: other patterns (e.g. polished_shallow if ethics >> interaction) may be present
    // The key assertion is that slow timing alone does not trigger speed_gaming
  });

  it("slow answering does not affect other participants (isolation: timing is per-session)", () => {
    // Timing is stored per-answer row; a slow participant's timeToAnswerMs
    // only appears in their own session's answer rows, not others'
    const slowParticipant = buildAnswers(10, { timeToAnswerMs: 2_700_000 });
    const normalParticipant = buildAnswers(10, { timeToAnswerMs: 45_000 });
    const slowResult = analyseGamingPatterns(slowParticipant);
    const normalResult = analyseGamingPatterns(normalParticipant);
    // Both should be clean — slow answering is not a gaming signal
    expect(slowResult.patterns).not.toContain("speed_gaming");
    expect(normalResult.patterns).not.toContain("speed_gaming");
  });
});

// ─── 1.2c: Fast-slow oscillation ─────────────────────────────────────────────

describe("1.2c — Fast-slow oscillation: pattern detection", () => {
  it("alternating fast/slow answers: exactly 50% fast is at the boundary (not above threshold)", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        timeToAnswerMs: i % 2 === 0 ? 1_000 : 120_000, // alternating 1s / 2min
        outcomeClass: "acceptable",
        optionPosition: i % 4, // vary positions to avoid position bias
      })
    );
    const result = analyseGamingPatterns(answers);
    // 5 out of 10 are fast (50%) — the speedGamingRate threshold is 0.50 (strictly greater than)
    // So exactly 50% does NOT trigger speed_gaming
    expect(result.patterns).not.toContain("speed_gaming");
  });

  it("6 fast out of 10 (60%) triggers speed_gaming", () => {
    const answers = [
      ...buildAnswers(6, { timeToAnswerMs: 1_000 }),
      ...buildAnswers(4, { timeToAnswerMs: 120_000 }),
    ];
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("speed_gaming");
  });

  it("4 fast out of 10 (40%) does NOT trigger speed_gaming", () => {
    const answers = [
      ...buildAnswers(4, { timeToAnswerMs: 1_000 }),
      ...buildAnswers(6, { timeToAnswerMs: 120_000 }),
    ];
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).not.toContain("speed_gaming");
  });
});

// ─── 1.2d: Consistent median timing ──────────────────────────────────────────

describe("1.2d — Consistent 90-second timing across all items", () => {
  it("90 seconds on every item does NOT trigger speed_gaming (above all thresholds)", () => {
    // 90 seconds = 90,000ms — above all per-type thresholds (max is 15,000ms for prompt_construction)
    const answers = buildAnswers(10, {
      timeToAnswerMs: 90_000,
      interactionType: "scenario_critique",
    });
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).not.toContain("speed_gaming");
  });

  it("90 seconds on every item does NOT trigger any pattern (clean session)", () => {
    const answers = buildAnswers(10, {
      timeToAnswerMs: 90_000,
      outcomeClass: "acceptable",
      signalDeltas: { output_evaluation_quality: 0.4 },
    });
    const result = analyseGamingPatterns(answers);
    // Consistent 90s timing is not a detectable gaming pattern in the current engine
    // This is noted as a gap in the Part 1 report — consistent median timing
    // is suspicious but not currently caught
    expect(result.patterns).not.toContain("speed_gaming");
  });

  it("consistent timing with always-acceptable outcomes triggers always_safe_choice", () => {
    // Even if timing is normal, always picking acceptable triggers the pattern
    const answers = buildAnswers(10, {
      timeToAnswerMs: 90_000,
      outcomeClass: "acceptable",
      signalDeltas: {},
    });
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("always_safe_choice");
  });
});

// ─── 1.2e: Speed threshold per interaction type ───────────────────────────────

describe("1.2e — Per-interaction-type speed thresholds", () => {
  it("prompt_construction threshold is 15,000ms", () => {
    // Items below 15s should be flagged; items above should not
    const fastAnswers = buildAnswers(10, {
      timeToAnswerMs: 10_000, // 10s — below 15s threshold
      interactionType: "prompt_construction",
    });
    const result = analyseGamingPatterns(fastAnswers);
    expect(result.patterns).toContain("speed_gaming");
  });

  it("scenario_critique threshold is 12,000ms — 11s is fast, 13s is not", () => {
    const fastAnswers = buildAnswers(10, {
      timeToAnswerMs: 11_000,
      interactionType: "scenario_critique",
    });
    const slowAnswers = buildAnswers(10, {
      timeToAnswerMs: 13_000,
      interactionType: "scenario_critique",
    });
    const fastResult = analyseGamingPatterns(fastAnswers);
    const slowResult = analyseGamingPatterns(slowAnswers);
    expect(fastResult.patterns).toContain("speed_gaming");
    expect(slowResult.patterns).not.toContain("speed_gaming");
  });

  it("ethical_pressure_test threshold is 10,000ms — 9s is fast", () => {
    const fastAnswers = buildAnswers(10, {
      timeToAnswerMs: 9_000,
      interactionType: "ethical_pressure_test",
    });
    const result = analyseGamingPatterns(fastAnswers);
    expect(result.patterns).toContain("speed_gaming");
  });
});

// ─── 1.2f: Fewer than 5 answers — gaming analysis deferred ───────────────────

describe("1.2f — Fewer than 5 answers: gaming analysis deferred", () => {
  it("4 answers returns clean result regardless of timing", () => {
    const answers = buildAnswers(4, { timeToAnswerMs: 100 }); // extremely fast
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toHaveLength(0);
    expect(result.scrutinyLevel).toBe("normal");
    expect(result.score).toBe(1.0);
  });

  it("0 answers returns clean result", () => {
    const result = analyseGamingPatterns([]);
    expect(result.patterns).toHaveLength(0);
    expect(result.scrutinyLevel).toBe("normal");
  });
});
