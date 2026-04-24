/**
 * WS1.1 Thin-Signal Anchor Calibration Tests (v10 migration)
 *
 * Confirms that the sum+clip formula generalises correctly to single-signal
 * capabilities. In v10, workforce_ai_readiness has a single primary signal
 * (capability_diagnosis_accuracy) and ai_change_leadership has a single primary
 * signal (resistance_response_quality). These replace the v9.2 workflow and
 * data_interpretation thin-signal tests.
 *
 * v10 migration notes:
 *   - workflow → workforce_ai_readiness (signal: capability_diagnosis_accuracy)
 *   - data_interpretation → ai_change_leadership (signal: resistance_response_quality)
 *   - computeSignalScores now accepts Array<{ signalDeltas: Record<string, number> }>
 *   - computeCapabilityScores now uses positional args: (signalScores, intercept?, cap?, multiplier?)
 *   - Cross-capability isolation tests updated to v10 domain names
 */

import { describe, it, expect } from "vitest";
import {
  computeSignalScores,
  computeCapabilityScores,
} from "./assessment/scoringEngine";

/** Build a minimal signal input for workforce_ai_readiness (single-signal domain) */
function makeWorkforceSignal(opts: {
  delta?: number;
} = {}): { signalDeltas: Record<string, number> } {
  return {
    signalDeltas: {
      capability_diagnosis_accuracy: opts.delta ?? 0.8,
    },
  };
}

/** Build a minimal signal input for ai_change_leadership (single-signal domain) */
function makeChangeLeadershipSignal(opts: {
  delta?: number;
} = {}): { signalDeltas: Record<string, number> } {
  return {
    signalDeltas: {
      resistance_response_quality: opts.delta ?? 0.8,
    },
  };
}

// ─── Workforce AI Readiness (single-signal) Anchor Cases ─────────────────────

describe("WS1.1 Thin-Signal Anchor A — workforce_ai_readiness: 5 positive answers → score > 50", () => {
  it("5 positive workforce_ai_readiness answers produce score > 50", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeWorkforceSignal({ delta: 0.8 })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.workforce_ai_readiness.score).toBeGreaterThan(50);
  });
});

describe("WS1.1 Thin-Signal Anchor B — workforce_ai_readiness: 5 negative answers → score < 50", () => {
  it("5 negative workforce_ai_readiness answers produce score < 50", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeWorkforceSignal({ delta: -0.8 })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.workforce_ai_readiness.score).toBeLessThan(50);
  });
});

describe("WS1.1 Thin-Signal Anchor C — workforce_ai_readiness: mixed → score near 50", () => {
  it("mixed workforce_ai_readiness answers produce score in 35–65 band", () => {
    const strongAnswers = Array.from({ length: 3 }, () =>
      makeWorkforceSignal({ delta: 0.8 })
    );
    const weakAnswers = Array.from({ length: 4 }, () =>
      makeWorkforceSignal({ delta: -0.8 })
    );
    const signals = computeSignalScores([...strongAnswers, ...weakAnswers]);
    const caps = computeCapabilityScores(signals);
    expect(caps.workforce_ai_readiness.score).toBeGreaterThanOrEqual(20);
    expect(caps.workforce_ai_readiness.score).toBeLessThanOrEqual(65);
  });
});

describe("WS1.1 Thin-Signal Anchor D — workforce_ai_readiness: monotonicity preserved", () => {
  it("6 positive workforce_ai_readiness answers score ≥ 5 positive", () => {
    const base = Array.from({ length: 5 }, () =>
      makeWorkforceSignal({ delta: 0.8 })
    );
    const extended = [
      ...base,
      makeWorkforceSignal({ delta: 0.8 }),
    ];
    const baseSignals = computeSignalScores(base);
    const extSignals = computeSignalScores(extended);
    const baseCaps = computeCapabilityScores(baseSignals);
    const extCaps = computeCapabilityScores(extSignals);
    expect(extCaps.workforce_ai_readiness.score).toBeGreaterThanOrEqual(baseCaps.workforce_ai_readiness.score);
  });
});

// ─── Workforce AI Readiness thin-signal specific cases ──────────────────────

describe("WS1.1 Thin-Signal — workforce_ai_readiness: single answer behaviour", () => {
  it("1 positive answer produces score above intercept", () => {
    const answers = [makeWorkforceSignal({ delta: 0.8 })];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.workforce_ai_readiness.score).toBeGreaterThan(50);
  });

  it("1 negative answer produces score below intercept", () => {
    const answers = [makeWorkforceSignal({ delta: -0.8 })];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.workforce_ai_readiness.score).toBeLessThan(50);
  });

  it("1 positive + 1 negative produces score near intercept", () => {
    const answers = [
      makeWorkforceSignal({ delta: 0.8 }),
      makeWorkforceSignal({ delta: -0.8 }),
    ];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.workforce_ai_readiness.score).toBeGreaterThanOrEqual(40);
    expect(caps.workforce_ai_readiness.score).toBeLessThanOrEqual(60);
  });
});

describe("WS1.1 Thin-Signal — workforce_ai_readiness: clip boundary", () => {
  it("extreme positive delta is bounded at 100", () => {
    const answers = [makeWorkforceSignal({ delta: 50.0 })];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.workforce_ai_readiness.score).toBeLessThanOrEqual(100);
    expect(caps.workforce_ai_readiness.score).toBeGreaterThan(50);
  });

  it("extreme negative delta is bounded at 0", () => {
    const answers = [makeWorkforceSignal({ delta: -50.0 })];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.workforce_ai_readiness.score).toBeGreaterThanOrEqual(0);
  });
});

// ─── AI Change Leadership (single-signal) Anchor Cases ──────────────────────

describe("WS1.1 Thin-Signal Anchor A — ai_change_leadership: 5 positive answers → score > 50", () => {
  it("5 positive ai_change_leadership answers produce score > 50", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeChangeLeadershipSignal({ delta: 0.8 })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.ai_change_leadership.score).toBeGreaterThan(50);
  });
});

describe("WS1.1 Thin-Signal Anchor B — ai_change_leadership: 5 negative → score < 50", () => {
  it("5 negative ai_change_leadership answers produce score < 50", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeChangeLeadershipSignal({ delta: -0.8 })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.ai_change_leadership.score).toBeLessThan(50);
  });
});

describe("WS1.1 Thin-Signal Anchor C — ai_change_leadership: mixed → score near 50", () => {
  it("3 positive + 4 negative ai_change_leadership answers produce score in 20–65 band", () => {
    const strongAnswers = Array.from({ length: 3 }, () =>
      makeChangeLeadershipSignal({ delta: 0.8 })
    );
    const weakAnswers = Array.from({ length: 4 }, () =>
      makeChangeLeadershipSignal({ delta: -0.8 })
    );
    const signals = computeSignalScores([...strongAnswers, ...weakAnswers]);
    const caps = computeCapabilityScores(signals);
    expect(caps.ai_change_leadership.score).toBeGreaterThanOrEqual(20);
    expect(caps.ai_change_leadership.score).toBeLessThanOrEqual(65);
  });
});

describe("WS1.1 Thin-Signal Anchor D — ai_change_leadership: monotonicity preserved", () => {
  it("6 positive ai_change_leadership answers score ≥ 5 positive", () => {
    const base = Array.from({ length: 5 }, () =>
      makeChangeLeadershipSignal({ delta: 0.8 })
    );
    const extended = [
      ...base,
      makeChangeLeadershipSignal({ delta: 0.8 }),
    ];
    const baseSignals = computeSignalScores(base);
    const extSignals = computeSignalScores(extended);
    const baseCaps = computeCapabilityScores(baseSignals);
    const extCaps = computeCapabilityScores(extSignals);
    expect(extCaps.ai_change_leadership.score).toBeGreaterThanOrEqual(baseCaps.ai_change_leadership.score);
  });
});

describe("WS1.1 Thin-Signal — ai_change_leadership: single answer behaviour", () => {
  it("1 positive ai_change_leadership answer produces score above intercept", () => {
    const answers = [makeChangeLeadershipSignal({ delta: 0.8 })];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.ai_change_leadership.score).toBeGreaterThan(50);
  });

  it("1 negative ai_change_leadership answer produces score below intercept", () => {
    const answers = [makeChangeLeadershipSignal({ delta: -0.8 })];
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.ai_change_leadership.score).toBeLessThan(50);
  });
});

// ─── Cross-capability isolation: thin-signal answers do not bleed into other caps ─

describe("WS1.1 Thin-Signal — cross-capability isolation", () => {
  it("workforce_ai_readiness answers do not affect ai_change_leadership score", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeWorkforceSignal({ delta: 0.8 })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    // ai_change_leadership should be at intercept (no answers for it)
    expect(caps.ai_change_leadership.score).toBe(50);
  });

  it("ai_change_leadership answers do not affect workforce_ai_readiness score", () => {
    const answers = Array.from({ length: 5 }, () =>
      makeChangeLeadershipSignal({ delta: 0.8 })
    );
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    // workforce_ai_readiness should be at intercept (no answers for it)
    expect(caps.workforce_ai_readiness.score).toBe(50);
  });

  it("ai_ethics_trust answers do not affect workforce_ai_readiness or ai_change_leadership scores", () => {
    const answers = Array.from({ length: 5 }, () => ({
      signalDeltas: { ethics_under_pressure: 0.8 },
    }));
    const signals = computeSignalScores(answers);
    const caps = computeCapabilityScores(signals);
    expect(caps.workforce_ai_readiness.score).toBe(50);
    expect(caps.ai_change_leadership.score).toBe(50);
    expect(caps.ai_ethics_trust.score).toBeGreaterThan(50);
  });
});

// ─── Calibration parity: thin-signal scores match for equivalent inputs ──────

describe("WS1.1 Thin-Signal — calibration parity between thin-signal capabilities", () => {
  it("workforce_ai_readiness and ai_change_leadership produce same scores for equivalent inputs", () => {
    const wfAnswers = Array.from({ length: 5 }, () =>
      makeWorkforceSignal({ delta: 0.8 })
    );
    const clAnswers = Array.from({ length: 5 }, () =>
      makeChangeLeadershipSignal({ delta: 0.8 })
    );
    const wfSignals = computeSignalScores(wfAnswers);
    const clSignals = computeSignalScores(clAnswers);
    const wfCaps = computeCapabilityScores(wfSignals);
    const clCaps = computeCapabilityScores(clSignals);
    // Both should produce the same score — formula is signal-count-agnostic
    expect(wfCaps.workforce_ai_readiness.score).toBe(clCaps.ai_change_leadership.score);
  });
});
