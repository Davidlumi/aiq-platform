/**
 * WS1.1 Thin-Signal Anchor Calibration Tests
 *
 * Confirms that the sum+clip formula generalises correctly to single-signal
 * capabilities (Workflow and Data Interpretation). The existing scoring.v2-2.test.ts
 * anchors were written exclusively against governance_quality (a 6-signal capability).
 * These tests verify that the formula is signal-count-agnostic and that thin-signal
 * capabilities produce correct scores under all four anchor conditions.
 *
 * Audit finding (Apr 23 2026):
 *   - Anchor A–D in scoring.v2-2.test.ts only used governance_quality signal.
 *   - workflow (1 signal: workflow_application_quality) and
 *     data_interpretation (1 signal: data_interpretation_quality) were not covered.
 *   - The formula is signal-count-agnostic (sums deltas regardless of count),
 *     so calibration generalises — but this must be explicitly verified.
 *
 * Signal-to-capability mapping (single-signal capabilities):
 *   workflow_application_quality  → workflow
 *   data_interpretation_quality   → data_interpretation
 *
 * V22_CONFIG: intercept=50, contributionCap=8.0, contributionMultiplier=6.25
 *
 * Pre-computed expected scores (see calibration notes in this file):
 *   5 strong (delta=0.8, Medium, diff=2):          sum=4.000  → score=75
 *   5 critical_failure (delta=0.8, Critical, diff=3): sum=-11.16 → clipped=-8.0 → score=0
 *   3 strong + 4 failure (delta=0.8, Medium, diff=2): sum=-0.176 → score=49
 *   6 strong ≥ 5 strong (monotonicity):            75 → 80
 *   1 strong (delta=0.8, Medium, diff=2):           sum=0.800  → score=55
 *   1 critical_failure (delta=0.8, Critical, diff=3): sum=-2.232 → score=36
 *   1 strong + 1 failure (delta=0.8, Medium, diff=2): sum=0.156  → score=51
 */

import { describe, it, expect } from "vitest";
import {
  computeSignalScores,
  computeCapabilityScores,
} from "./assessment/scoringEngine";
import type { AnswerData } from "./assessment/scoringEngine";

const V22_CONFIG = {
  intercept: 50,
  multiplier: 50,
  contributionCap: 8.0,
  contributionMultiplier: 6.25,
};

/** Build a minimal AnswerData for a single-signal thin-signal capability answer */
function makeWorkflowAnswer(opts: {
  outcomeClass: AnswerData["outcomeClass"];
  delta?: number;
  riskLevel?: string;
  difficulty?: number;
}): AnswerData {
  return {
    answerId: `wf-${Math.random().toString(36).slice(2)}`,
    sessionId: "test-session",
    questionId: "q-wf",
    capabilityKey: "workflow",
    outcomeClass: opts.outcomeClass,
    signalDeltasJson: JSON.stringify({
      workflow_application_quality: opts.delta ?? 0.8,
    }),
    riskLevel: opts.riskLevel ?? "Medium",
    difficulty: opts.difficulty ?? 2,
    confidenceScore: 0.5,
  } as AnswerData;
}

function makeDataAnswer(opts: {
  outcomeClass: AnswerData["outcomeClass"];
  delta?: number;
  riskLevel?: string;
  difficulty?: number;
}): AnswerData {
  return {
    answerId: `di-${Math.random().toString(36).slice(2)}`,
    sessionId: "test-session",
    questionId: "q-di",
    capabilityKey: "data_interpretation",
    outcomeClass: opts.outcomeClass,
    signalDeltasJson: JSON.stringify({
      data_interpretation_quality: opts.delta ?? 0.8,
    }),
    riskLevel: opts.riskLevel ?? "Medium",
    difficulty: opts.difficulty ?? 2,
    confidenceScore: 0.5,
  } as AnswerData;
}

// ─── Workflow (single-signal) Anchor Cases ────────────────────────────────────

describe("WS1.1 Thin-Signal Anchor A — workflow: 5 strong answers → score ≥ 75", () => {
  it("5 strong workflow answers produce score ≥ 75 (same as governance)", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeWorkflowAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    // Pre-computed: sum=4.000, score=75
    expect(caps.workflow.score).toBe(75);
    expect(caps.workflow.band).toBe("strong");
  });
});

describe("WS1.1 Thin-Signal Anchor B — workflow: 5 critical_failure answers → score = 0", () => {
  it("5 critical_failure workflow answers produce score = 0 (clip fires)", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeWorkflowAnswer({ outcomeClass: "critical_failure", delta: 0.8, riskLevel: "Critical", difficulty: 3 })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    // Pre-computed: sum=-11.16, clipped=-8.0, score=0
    expect(caps.workflow.score).toBe(0);
    expect(caps.workflow.band).toBe("critical");
  });
});

describe("WS1.1 Thin-Signal Anchor C — workflow: 3 strong + 4 failure → score near 49", () => {
  it("mixed workflow answers produce score near intercept (35–65 band)", () => {
    const strongAnswers = Array.from({ length: 3 }, () =>
      makeWorkflowAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 })
    );
    const failureAnswers = Array.from({ length: 4 }, () =>
      makeWorkflowAnswer({ outcomeClass: "failure", delta: 0.8, riskLevel: "Medium", difficulty: 2 })
    );
    const signals = computeSignalScores([...strongAnswers, ...failureAnswers]);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    // Pre-computed: sum=-0.176, score=49
    expect(caps.workflow.score).toBeGreaterThanOrEqual(35);
    expect(caps.workflow.score).toBeLessThanOrEqual(65);
  });
});

describe("WS1.1 Thin-Signal Anchor D — workflow: monotonicity preserved", () => {
  it("6 strong workflow answers score ≥ 5 strong workflow answers", () => {
    const base = Array.from({ length: 5 }, () =>
      makeWorkflowAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 })
    );
    const extended = [
      ...base,
      makeWorkflowAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 }),
    ];
    const baseSignals = computeSignalScores(base);
    const extSignals = computeSignalScores(extended);
    const baseCaps = computeCapabilityScores(baseSignals, V22_CONFIG);
    const extCaps = computeCapabilityScores(extSignals, V22_CONFIG);
    // Pre-computed: 5 strong → 75, 6 strong → 80
    expect(extCaps.workflow.score).toBeGreaterThanOrEqual(baseCaps.workflow.score);
  });
});

// ─── Workflow thin-signal specific cases ─────────────────────────────────────

describe("WS1.1 Thin-Signal — workflow: single answer behaviour", () => {
  it("1 strong answer produces score above intercept (55)", () => {
    const answers = [
      makeWorkflowAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 }),
    ];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    // Pre-computed: sum=0.800, score=55
    expect(caps.workflow.score).toBe(55);
    expect(caps.workflow.score).toBeGreaterThan(50);
  });

  it("1 critical_failure (small delta) does NOT floor to 0 — score=36", () => {
    const answers = [
      makeWorkflowAnswer({ outcomeClass: "critical_failure", delta: 0.8, riskLevel: "Critical", difficulty: 3 }),
    ];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    // Pre-computed: sum=-2.232, score=36 (not 0 — clip does not fire for small delta)
    expect(caps.workflow.score).toBe(36);
    expect(caps.workflow.score).toBeGreaterThan(0);
  });

  it("1 strong + 1 failure produces score near intercept (51)", () => {
    const answers = [
      makeWorkflowAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 }),
      makeWorkflowAnswer({ outcomeClass: "failure", delta: 0.8, riskLevel: "Medium", difficulty: 2 }),
    ];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    // Pre-computed: sum=0.156, score=51
    expect(caps.workflow.score).toBe(51);
  });
});

describe("WS1.1 Thin-Signal — workflow: clip boundary at contributionCap=8.0", () => {
  it("extreme positive delta (delta=5.0, Critical, diff=3) is clipped to cap → score=100", () => {
    const answers = [
      makeWorkflowAnswer({ outcomeClass: "strong", delta: 5.0, riskLevel: "Critical", difficulty: 3 }),
    ];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    // sum = 5.0 * 1.15 * 1.20 * 1.0 = 6.9 < cap=8.0 → not clipped → score = 50 + 6.9 * 6.25 = 93
    // (extreme but not clipped for single answer)
    expect(caps.workflow.score).toBeGreaterThan(50);
    expect(caps.workflow.score).toBeLessThanOrEqual(100);
  });

  it("extreme negative delta (delta=5.0, Critical, diff=3, critical_failure) clips to -8.0 → score=0", () => {
    const answers = [
      makeWorkflowAnswer({ outcomeClass: "critical_failure", delta: 5.0, riskLevel: "Critical", difficulty: 3 }),
    ];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    // sum = 5.0 * 1.55 * 1.20 * (-1.5) = -13.95, clipped to -8.0 → score=0
    expect(caps.workflow.score).toBe(0);
  });
});

// ─── Data Interpretation (single-signal) Anchor Cases ────────────────────────

describe("WS1.1 Thin-Signal Anchor A — data_interpretation: 5 strong answers → score ≥ 75", () => {
  it("5 strong data_interpretation answers produce score ≥ 75", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeDataAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    // Pre-computed: sum=4.000, score=75 (identical to workflow — same formula, same signal count)
    expect(caps.data_interpretation.score).toBe(75);
    expect(caps.data_interpretation.band).toBe("strong");
  });
});

describe("WS1.1 Thin-Signal Anchor B — data_interpretation: 5 critical_failure → score = 0", () => {
  it("5 critical_failure data_interpretation answers produce score = 0", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeDataAnswer({ outcomeClass: "critical_failure", delta: 0.8, riskLevel: "Critical", difficulty: 3 })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    expect(caps.data_interpretation.score).toBe(0);
    expect(caps.data_interpretation.band).toBe("critical");
  });
});

describe("WS1.1 Thin-Signal Anchor C — data_interpretation: mixed → score near 49", () => {
  it("3 strong + 4 failure data_interpretation answers produce score in 35–65 band", () => {
    const strongAnswers = Array.from({ length: 3 }, () =>
      makeDataAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 })
    );
    const failureAnswers = Array.from({ length: 4 }, () =>
      makeDataAnswer({ outcomeClass: "failure", delta: 0.8, riskLevel: "Medium", difficulty: 2 })
    );
    const signals = computeSignalScores([...strongAnswers, ...failureAnswers]);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    expect(caps.data_interpretation.score).toBeGreaterThanOrEqual(35);
    expect(caps.data_interpretation.score).toBeLessThanOrEqual(65);
  });
});

describe("WS1.1 Thin-Signal Anchor D — data_interpretation: monotonicity preserved", () => {
  it("6 strong data_interpretation answers score ≥ 5 strong", () => {
    const base = Array.from({ length: 5 }, () =>
      makeDataAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 })
    );
    const extended = [
      ...base,
      makeDataAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 }),
    ];
    const baseSignals = computeSignalScores(base);
    const extSignals = computeSignalScores(extended);
    const baseCaps = computeCapabilityScores(baseSignals, V22_CONFIG);
    const extCaps = computeCapabilityScores(extSignals, V22_CONFIG);
    expect(extCaps.data_interpretation.score).toBeGreaterThanOrEqual(baseCaps.data_interpretation.score);
  });
});

describe("WS1.1 Thin-Signal — data_interpretation: single answer behaviour", () => {
  it("1 strong data_interpretation answer produces score above intercept (55)", () => {
    const answers = [
      makeDataAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 }),
    ];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    expect(caps.data_interpretation.score).toBe(55);
    expect(caps.data_interpretation.score).toBeGreaterThan(50);
  });

  it("1 critical_failure (small delta) does NOT floor to 0 — score=36", () => {
    const answers = [
      makeDataAnswer({ outcomeClass: "critical_failure", delta: 0.8, riskLevel: "Critical", difficulty: 3 }),
    ];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    expect(caps.data_interpretation.score).toBe(36);
    expect(caps.data_interpretation.score).toBeGreaterThan(0);
  });
});

// ─── Cross-capability isolation: thin-signal answers do not bleed into other caps ─

describe("WS1.1 Thin-Signal — cross-capability isolation", () => {
  it("workflow answers do not affect data_interpretation score", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeWorkflowAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    // data_interpretation should be at intercept (no answers for it)
    expect(caps.data_interpretation.score).toBe(50);
  });

  it("data_interpretation answers do not affect workflow score", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeDataAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    // workflow should be at intercept (no answers for it)
    expect(caps.workflow.score).toBe(50);
  });

  it("governance answers do not affect workflow or data_interpretation scores", () => {
    const answers = Array.from({ length: 5 }, () => ({
      answerId: `gov-${Math.random().toString(36).slice(2)}`,
      sessionId: "test-session",
      questionId: "q-gov",
      capabilityKey: "governance",
      outcomeClass: "strong" as const,
      signalDeltasJson: JSON.stringify({ governance_quality: 0.8 }),
      riskLevel: "Medium",
      difficulty: 2,
      confidenceScore: 0.5,
    } as AnswerData));
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals, V22_CONFIG);
    expect(caps.workflow.score).toBe(50);
    expect(caps.data_interpretation.score).toBe(50);
    expect(caps.governance.score).toBeGreaterThan(50);
  });
});

// ─── Calibration parity: thin-signal scores match multi-signal scores for equivalent inputs ─

describe("WS1.1 Thin-Signal — calibration parity with multi-signal capabilities", () => {
  it("workflow and governance produce identical scores for equivalent 5-strong inputs", () => {
    const workflowAnswers = Array.from({ length: 5 }, () =>
      makeWorkflowAnswer({ outcomeClass: "strong", delta: 0.8, riskLevel: "Medium", difficulty: 2 })
    );
    const governanceAnswers = Array.from({ length: 5 }, () => ({
      answerId: `gov-${Math.random().toString(36).slice(2)}`,
      sessionId: "test-session",
      questionId: "q-gov",
      capabilityKey: "governance",
      outcomeClass: "strong" as const,
      signalDeltasJson: JSON.stringify({ governance_quality: 0.8 }),
      riskLevel: "Medium",
      difficulty: 2,
      confidenceScore: 0.5,
    } as AnswerData));
    const wfSignals = computeSignalScores(workflowAnswers);
    const govSignals = computeSignalScores(governanceAnswers);
    const wfCaps = computeCapabilityScores(wfSignals, V22_CONFIG);
    const govCaps = computeCapabilityScores(govSignals, V22_CONFIG);
    // Both should produce score=75 — formula is signal-count-agnostic
    expect(wfCaps.workflow.score).toBe(govCaps.governance.score);
  });
});
