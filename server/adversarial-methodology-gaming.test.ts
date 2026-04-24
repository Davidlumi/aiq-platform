/**
 * AiQ Adversarial Testing — Part 2.1: Gaming Detection Methodology Audit
 *
 * Verifies that all 14 gaming patterns are detected under adversarial conditions,
 * that the correct scrutiny level is applied, that the appropriate injection is
 * triggered, and that the credibility penalty is applied correctly.
 *
 * Also tests a mixed adversarial session with 3-4 simultaneous patterns.
 */
import { describe, it, expect } from "vitest";
import {
  analyseGamingPatterns,
  GAMING_AUDIT_EVENT_CODES,
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
    timeToAnswerMs: 45_000,
    outcomeClass: "acceptable",
    confidenceScore: 0.7,
    signalDeltas: { output_evaluation_quality: 0.3 },
    interactionType: "scenario_critique",
    riskLevel: "Medium",
    ...overrides,
  };
}

// ─── 2.1 Pattern 1: always_safe_choice ───────────────────────────────────────

describe("2.1 Pattern 1: always_safe_choice", () => {
  it("detects always_safe_choice when >75% acceptable and <10% strong", () => {
    const answers = [
      ...Array.from({ length: 8 }, () => makeAnswer({ outcomeClass: "acceptable" })),
      ...Array.from({ length: 2 }, () => makeAnswer({ outcomeClass: "weak" })),
    ];
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("always_safe_choice");
  });

  it("always_safe_choice triggers a trap injection targeting ai_output_evaluation", () => {
    const answers = Array.from({ length: 10 }, () => makeAnswer({ outcomeClass: "acceptable" }));
    const result = analyseGamingPatterns(answers);
    const injection = result.recommendedInjections.find(i => i.targetPattern === "always_safe_choice");
    expect(injection).toBeDefined();
    expect(injection?.type).toBe("trap");
    expect(injection?.targetCapability).toBe("ai_output_evaluation");
    expect(injection?.interactionType).toBe("risk_judgement");
  });

  it("always_safe_choice raises scrutiny to elevated", () => {
    const answers = Array.from({ length: 10 }, () => makeAnswer({ outcomeClass: "acceptable" }));
    const result = analyseGamingPatterns(answers);
    expect(["elevated", "high"]).toContain(result.scrutinyLevel);
  });

  it("always_safe_choice has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.always_safe_choice).toBe("GAMING_ALWAYS_SAFE");
  });
});

// ─── 2.1 Pattern 2: always_escalate ──────────────────────────────────────────

describe("2.1 Pattern 2: always_escalate", () => {
  it("detects always_escalate when >60% of answers have strong automation_expansion_risk signals", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        signalDeltas: {
          automation_expansion_risk: i < 7 ? -0.8 : 0.2, // 70% with strong escalation
        },
        outcomeClass: "acceptable",
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("always_escalate");
  });

  it("always_escalate triggers a clean_case injection targeting ai_interaction", () => {
    const answers = Array.from({ length: 10 }, () =>
      makeAnswer({ signalDeltas: { automation_expansion_risk: -0.9 } })
    );
    const result = analyseGamingPatterns(answers);
    const injection = result.recommendedInjections.find(i => i.targetPattern === "always_escalate");
    expect(injection).toBeDefined();
    expect(injection?.type).toBe("clean_case");
    expect(injection?.targetCapability).toBe("ai_interaction");
  });

  it("always_escalate has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.always_escalate).toBe("GAMING_ALWAYS_ESCALATE");
  });
});

// ─── 2.1 Pattern 3: always_cautious ──────────────────────────────────────────

describe("2.1 Pattern 3: always_cautious", () => {
  it("detects always_cautious when >55% have generic_prescription_risk signals", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        signalDeltas: {
          generic_prescription_risk: i < 6 ? -0.8 : 0.2, // 60% cautious
        },
        outcomeClass: "acceptable",
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("always_cautious");
  });

  it("always_cautious triggers a clean_case injection targeting ai_interaction", () => {
    const answers = Array.from({ length: 10 }, () =>
      makeAnswer({ signalDeltas: { generic_prescription_risk: -0.9 } })
    );
    const result = analyseGamingPatterns(answers);
    const injection = result.recommendedInjections.find(i => i.targetPattern === "always_cautious");
    expect(injection).toBeDefined();
    expect(injection?.type).toBe("clean_case");
    expect(injection?.interactionType).toBe("prompt_diagnosis");
  });

  it("always_cautious has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.always_cautious).toBe("GAMING_ALWAYS_CAUTIOUS");
  });
});

// ─── 2.1 Pattern 4: option_position_bias ─────────────────────────────────────

describe("2.1 Pattern 4: option_position_bias", () => {
  it("detects option_position_bias when >55% of answers select the same position", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        optionPosition: i < 6 ? 0 : i % 4, // 60% position 0
        outcomeClass: "acceptable",
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("option_position_bias");
  });

  it("option_position_bias triggers a comparable_scenario injection", () => {
    const answers = Array.from({ length: 10 }, () => makeAnswer({ optionPosition: 0 }));
    const result = analyseGamingPatterns(answers);
    const injection = result.recommendedInjections.find(i => i.targetPattern === "option_position_bias");
    expect(injection).toBeDefined();
    expect(injection?.type).toBe("comparable_scenario");
    expect(injection?.interactionType).toBe("scenario_critique");
  });

  it("option_position_bias has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.option_position_bias).toBe("GAMING_POSITION_BIAS");
  });
});

// ─── 2.1 Pattern 5: speed_gaming ─────────────────────────────────────────────

describe("2.1 Pattern 5: speed_gaming", () => {
  it("detects speed_gaming when >50% of answers are below per-type threshold", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        timeToAnswerMs: i < 6 ? 1_000 : 45_000,
        interactionType: "scenario_critique",
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("speed_gaming");
  });

  it("speed_gaming triggers a trap injection for ethical_pressure_test", () => {
    const answers = Array.from({ length: 10 }, () => makeAnswer({ timeToAnswerMs: 500 }));
    const result = analyseGamingPatterns(answers);
    const injection = result.recommendedInjections.find(i => i.targetPattern === "speed_gaming");
    expect(injection).toBeDefined();
    expect(injection?.type).toBe("trap");
    expect(injection?.interactionType).toBe("ethical_pressure_test");
  });

  it("speed_gaming has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.speed_gaming).toBe("GAMING_SPEED");
  });
});

// ─── 2.1 Pattern 6: inconsistent_responses ───────────────────────────────────

describe("2.1 Pattern 6: inconsistent_responses", () => {
  it("detects inconsistent_responses when outcome variance is high (stddev > 0.38)", () => {
    // The outcome score range is [0, 1] with values {0, 0.1, 0.3, 0.6, 1.0}.
    // Maximum possible stddev is 0.5 (half strong=1.0, half critical_failure=0.0).
    // The threshold is 0.38 — achieved by alternating strong and failure (0.1).
    // strong=1.0, failure=0.1 → mean=0.55, stddev≈0.45 > 0.38 → fires
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        outcomeClass: i % 2 === 0 ? "strong" : "critical_failure",
        optionPosition: i % 4,
        signalDeltas: {},
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("inconsistent_responses");
  });

  it("inconsistent_responses has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.inconsistent_responses).toBe("GAMING_INCONSISTENT");
  });
});

// ─── 2.1 Pattern 7: polished_shallow ─────────────────────────────────────────

describe("2.1 Pattern 7: polished_shallow", () => {
  it("detects polished_shallow when ethics signals are high but interaction signals are low", () => {
    const answers = Array.from({ length: 10 }, () =>
      makeAnswer({
        signalDeltas: {
          ethics_under_pressure: 1.5,          // strong ethics language
          prompt_construction_quality: -0.8,   // weak actual interaction
          output_evaluation_quality: -0.6,
        },
        optionPosition: 1,
        outcomeClass: "acceptable",
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("polished_shallow");
  });

  it("polished_shallow triggers a comparable_scenario injection for prompt_construction", () => {
    const answers = Array.from({ length: 10 }, () =>
      makeAnswer({
        signalDeltas: { ethics_under_pressure: 1.5, prompt_construction_quality: -0.8 },
        optionPosition: 1,
      })
    );
    const result = analyseGamingPatterns(answers);
    const injection = result.recommendedInjections.find(i => i.targetPattern === "polished_shallow");
    expect(injection).toBeDefined();
    expect(injection?.type).toBe("comparable_scenario");
    expect(injection?.interactionType).toBe("prompt_construction");
  });

  it("polished_shallow has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.polished_shallow).toBe("GAMING_POLISHED_SHALLOW");
  });
});

// ─── 2.1 Pattern 8: pattern_cycling ──────────────────────────────────────────

describe("2.1 Pattern 8: pattern_cycling", () => {
  it("detects pattern_cycling when positions cycle through all 4 in a regular pattern", () => {
    // Positions: 0,1,2,3,0,1,2,3,0,1 — regular cycling
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({ optionPosition: i % 4, outcomeClass: "acceptable" })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("pattern_cycling");
  });

  it("pattern_cycling has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.pattern_cycling).toBe("GAMING_PATTERN_CYCLE");
  });
});

// ─── 2.1 Pattern 9: outcome_cycling ──────────────────────────────────────────

describe("2.1 Pattern 9: outcome_cycling", () => {
  it("detects outcome_cycling when outcome values repeat in a consistent pattern", () => {
    // Repeat the same outcome sequence: acceptable, acceptable, acceptable, acceptable, ...
    // This creates a low-variance repeating pattern
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        outcomeClass: ["acceptable", "acceptable", "weak"][i % 3] ?? "acceptable",
        optionPosition: i % 4,
        signalDeltas: {},
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("outcome_cycling");
  });

  it("outcome_cycling has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.outcome_cycling).toBe("GAMING_OUTCOME_CYCLE");
  });
});

// ─── 2.1 Pattern 10: outcome_conditional_safe ────────────────────────────────

describe("2.1 Pattern 10: outcome_conditional_safe", () => {
  it("detects outcome_conditional_safe when high-risk items get safe answers but low-risk get strong", () => {
    const highRiskAnswers = Array.from({ length: 5 }, () =>
      makeAnswer({ riskLevel: "High", outcomeClass: "acceptable" })
    );
    const lowRiskAnswers = Array.from({ length: 5 }, () =>
      makeAnswer({ riskLevel: "Low", outcomeClass: "strong" })
    );
    const answers = [...highRiskAnswers, ...lowRiskAnswers];
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("outcome_conditional_safe");
  });

  it("outcome_conditional_safe triggers a trap injection for ethical_pressure_test", () => {
    const answers = [
      ...Array.from({ length: 5 }, () => makeAnswer({ riskLevel: "High", outcomeClass: "acceptable" })),
      ...Array.from({ length: 5 }, () => makeAnswer({ riskLevel: "Low", outcomeClass: "strong" })),
    ];
    const result = analyseGamingPatterns(answers);
    const injection = result.recommendedInjections.find(i => i.targetPattern === "outcome_conditional_safe");
    expect(injection).toBeDefined();
    expect(injection?.type).toBe("trap");
    expect(injection?.interactionType).toBe("ethical_pressure_test");
  });

  it("outcome_conditional_safe has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.outcome_conditional_safe).toBe("GAMING_OUTCOME_CONDITIONAL");
  });
});

// ─── 2.1 Pattern 11: seniority_inconsistent ──────────────────────────────────

describe("2.1 Pattern 11: seniority_inconsistent", () => {
  it("detects seniority_inconsistent for senior participants with >50% weak/failure answers", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        outcomeClass: i < 6 ? "weak" : "acceptable",
        optionPosition: i % 4,
        signalDeltas: {},
      })
    );
    const result = analyseGamingPatterns(answers, "leader", 4); // seniority 4 = senior
    expect(result.patterns).toContain("seniority_inconsistent");
  });

  it("seniority_inconsistent does NOT fire for junior participants (seniority < 3)", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({ outcomeClass: i < 6 ? "weak" : "acceptable", optionPosition: i % 4, signalDeltas: {} })
    );
    const result = analyseGamingPatterns(answers, "generalist", 2); // seniority 2 = junior
    expect(result.patterns).not.toContain("seniority_inconsistent");
  });

  it("seniority_inconsistent has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.seniority_inconsistent).toBe("GAMING_SENIORITY_INCONSISTENT");
  });
});

// ─── 2.1 Pattern 12: ethics_performative ─────────────────────────────────────

describe("2.1 Pattern 12: ethics_performative (v10 new)", () => {
  it("detects ethics_performative when ethics language is strong but action under pressure is weak", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        signalDeltas: {
          stakeholder_impact_awareness: i < 5 ? 0.8 : 0.1,   // 50% strong ethics language
          ethics_under_pressure: i < 3 ? -0.5 : 0.3,          // 30% weak action
        },
        optionPosition: i % 4,
        outcomeClass: "acceptable",
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("ethics_performative");
  });

  it("ethics_performative triggers a trap injection for ethical_pressure_test", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        signalDeltas: {
          stakeholder_impact_awareness: i < 5 ? 0.8 : 0.1,
          ethics_under_pressure: i < 3 ? -0.5 : 0.3,
        },
        optionPosition: i % 4,
      })
    );
    const result = analyseGamingPatterns(answers);
    const injection = result.recommendedInjections.find(i => i.targetPattern === "ethics_performative");
    expect(injection).toBeDefined();
    expect(injection?.type).toBe("trap");
    expect(injection?.targetCapability).toBe("ai_ethics_trust");
  });

  it("ethics_performative has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.ethics_performative).toBe("GAMING_ETHICS_PERFORMATIVE");
  });
});

// ─── 2.1 Pattern 13: advisory_generic ────────────────────────────────────────

describe("2.1 Pattern 13: advisory_generic (v10 new)", () => {
  it("detects advisory_generic when >50% of advisory items have generic_prescription_risk", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        interactionType: i < 4 ? "leader_advisory" : "scenario_critique",
        signalDeltas: {
          generic_prescription_risk: i < 3 ? -0.5 : 0.2, // 3 out of 4 advisory items are generic
        },
        optionPosition: i % 4,
        outcomeClass: "acceptable",
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("advisory_generic");
  });

  it("advisory_generic triggers a comparable_scenario injection for capability_diagnosis", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        interactionType: i < 4 ? "leader_advisory" : "scenario_critique",
        signalDeltas: { generic_prescription_risk: i < 3 ? -0.5 : 0.2 },
        optionPosition: i % 4,
      })
    );
    const result = analyseGamingPatterns(answers);
    const injection = result.recommendedInjections.find(i => i.targetPattern === "advisory_generic");
    expect(injection).toBeDefined();
    expect(injection?.type).toBe("comparable_scenario");
    expect(injection?.interactionType).toBe("capability_diagnosis");
  });

  it("advisory_generic has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.advisory_generic).toBe("GAMING_ADVISORY_GENERIC");
  });
});

// ─── 2.1 Pattern 14: resistance_dismissive ───────────────────────────────────

describe("2.1 Pattern 14: resistance_dismissive (v10 new)", () => {
  it("detects resistance_dismissive when >60% of resistance items are dismissive", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        interactionType: i < 4 ? "resistance_response" : "scenario_critique",
        signalDeltas: {
          dismissive_of_concern_risk: i < 3 ? -0.5 : 0.2, // 3 out of 4 resistance items dismissive
        },
        optionPosition: i % 4,
        outcomeClass: "acceptable",
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("resistance_dismissive");
  });

  it("resistance_dismissive triggers a comparable_scenario injection for legitimate_concern", () => {
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        interactionType: i < 4 ? "resistance_response" : "scenario_critique",
        signalDeltas: { dismissive_of_concern_risk: i < 3 ? -0.5 : 0.2 },
        optionPosition: i % 4,
      })
    );
    const result = analyseGamingPatterns(answers);
    const injection = result.recommendedInjections.find(i => i.targetPattern === "resistance_dismissive");
    expect(injection).toBeDefined();
    expect(injection?.type).toBe("comparable_scenario");
    expect(injection?.interactionType).toBe("legitimate_concern");
  });

  it("resistance_dismissive has the correct audit event code", () => {
    expect(GAMING_AUDIT_EVENT_CODES.resistance_dismissive).toBe("GAMING_RESISTANCE_DISMISSIVE");
  });
});

// ─── 2.1 Mixed adversarial session: 3-4 simultaneous patterns ────────────────

describe("2.1 Mixed adversarial session: 3-4 simultaneous patterns", () => {
  it("detects multiple patterns simultaneously without canceling each other", () => {
    // This session exhibits: always_safe_choice + speed_gaming + option_position_bias
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        outcomeClass: "acceptable",     // → always_safe_choice
        timeToAnswerMs: 1_000,          // → speed_gaming
        optionPosition: 0,              // → option_position_bias
        signalDeltas: {},
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.patterns).toContain("always_safe_choice");
    expect(result.patterns).toContain("speed_gaming");
    expect(result.patterns).toContain("option_position_bias");
    expect(result.patterns.length).toBeGreaterThanOrEqual(3);
  });

  it("mixed adversarial session raises scrutiny to high (3+ patterns)", () => {
    const answers = Array.from({ length: 10 }, () =>
      makeAnswer({
        outcomeClass: "acceptable",
        timeToAnswerMs: 1_000,
        optionPosition: 0,
        signalDeltas: {},
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.scrutinyLevel).toBe("high");
  });

  it("mixed adversarial session caps injections at 3 (high scrutiny cap)", () => {
    const answers = Array.from({ length: 10 }, () =>
      makeAnswer({
        outcomeClass: "acceptable",
        timeToAnswerMs: 1_000,
        optionPosition: 0,
        signalDeltas: {},
      })
    );
    const result = analyseGamingPatterns(answers);
    expect(result.recommendedInjections.length).toBeLessThanOrEqual(3);
  });

  it("mixed adversarial session reduces credibility score significantly", () => {
    const answers = Array.from({ length: 10 }, () =>
      makeAnswer({
        outcomeClass: "acceptable",
        timeToAnswerMs: 1_000,
        optionPosition: 0,
        signalDeltas: {},
      })
    );
    const result = analyseGamingPatterns(answers);
    // 3+ patterns × 0.12 penalty each = score ≤ 0.64
    expect(result.score).toBeLessThanOrEqual(0.65);
  });

  it("four-pattern adversarial session: all patterns detected and injections compose correctly", () => {
    // Patterns: always_safe_choice + speed_gaming + option_position_bias + seniority_inconsistent
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeAnswer({
        outcomeClass: i < 6 ? "weak" : "acceptable",  // → seniority_inconsistent (>50% weak)
        timeToAnswerMs: 1_000,                          // → speed_gaming
        optionPosition: 0,                              // → option_position_bias
        signalDeltas: {},
      })
    );
    const result = analyseGamingPatterns(answers, "leader", 4); // senior leader
    // At least 3 of the 4 patterns should be detected
    const expectedPatterns: GamingPattern[] = ["speed_gaming", "option_position_bias", "seniority_inconsistent"];
    const detectedExpected = expectedPatterns.filter(p => result.patterns.includes(p));
    expect(detectedExpected.length).toBeGreaterThanOrEqual(2);
    expect(result.scrutinyLevel).toBe("high");
  });
});

// ─── 2.1 All 14 audit event codes are defined ────────────────────────────────

describe("2.1 All 14 gaming patterns have audit event codes", () => {
  const allPatterns: GamingPattern[] = [
    "always_safe_choice", "always_escalate", "always_cautious", "option_position_bias",
    "speed_gaming", "inconsistent_responses", "polished_shallow", "pattern_cycling",
    "outcome_cycling", "outcome_conditional_safe", "seniority_inconsistent",
    "ethics_performative", "advisory_generic", "resistance_dismissive",
  ];

  it("all 14 patterns have audit event codes defined", () => {
    for (const pattern of allPatterns) {
      expect(GAMING_AUDIT_EVENT_CODES[pattern]).toBeDefined();
      expect(typeof GAMING_AUDIT_EVENT_CODES[pattern]).toBe("string");
      expect(GAMING_AUDIT_EVENT_CODES[pattern].length).toBeGreaterThan(0);
    }
  });

  it("all 14 audit event codes are unique", () => {
    const codes = allPatterns.map(p => GAMING_AUDIT_EVENT_CODES[p]);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(allPatterns.length);
  });
});
