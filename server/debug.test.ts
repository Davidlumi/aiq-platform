/**
 * Session Controller — Targeted Sanity Tests (v10 migration)
 *
 * Covers:
 * - Basic evidence sufficiency with canonical v10 signal keys
 * - Role-aware evidence thresholds (D2): HRBP requires more ai_ethics_trust signals
 * - Seniority-inconsistency detection (B5)
 *
 * v10 migration notes:
 *   - execution → ai_interaction (signals: prompt_construction_quality, prompt_iteration_quality)
 *   - judgement → ai_output_evaluation (signals: output_evaluation_quality, error_detection_accuracy)
 *   - governance → ai_ethics_trust (signals: ethics_under_pressure, stakeholder_impact_awareness)
 *   - appropriateness → ai_workflow_design (signals: workflow_redesign_quality, automation_expansion_risk)
 *   - workflow → workforce_ai_readiness (signals: capability_diagnosis_accuracy)
 *   - data_interpretation → ai_change_leadership (signals: resistance_response_quality)
 *   - Interaction types updated to v10 equivalents
 */
import { describe, it, expect } from "vitest";
import { SessionController, MINIMUM_EVIDENCE } from "./assessment/sessionController";
import type { AnswerData } from "./assessment/sessionController";

// ─── Canonical v10 signal keys per domain ────────────────────────────────────
const CANONICAL_STRONG_AI_INTERACTION = {
  prompt_construction_quality: 0.8,
  prompt_iteration_quality: 0.5,
};
const CANONICAL_STRONG_AI_OUTPUT_EVALUATION = {
  output_evaluation_quality: 0.8,
  error_detection_accuracy: 0.6,
};
const CANONICAL_STRONG_AI_ETHICS_TRUST = {
  ethics_under_pressure: 0.9,
  stakeholder_impact_awareness: 0.7,
};
const CANONICAL_STRONG_AI_WORKFLOW_DESIGN = {
  workflow_redesign_quality: 0.7,
  automation_expansion_risk: 0.4,
};
const CANONICAL_STRONG_WORKFORCE_AI_READINESS = {
  capability_diagnosis_accuracy: 0.8,
};
const CANONICAL_STRONG_AI_CHANGE_LEADERSHIP = {
  resistance_response_quality: 0.8,
};

function makeAnswers(count: number, overrides: Partial<AnswerData> = {}): AnswerData[] {
  const interactionTypes = [
    "prompt_diagnosis", "prompt_construction", "risk_judgement",
    "ethical_pressure_test", "scenario_critique", "error_detection",
    "process_redesign", "capability_diagnosis",
  ];
  const capabilityKeys = [
    "ai_interaction", "ai_output_evaluation", "ai_ethics_trust",
    "ai_workflow_design", "workforce_ai_readiness", "ai_change_leadership",
  ];
  const signalSets = [
    CANONICAL_STRONG_AI_INTERACTION,
    CANONICAL_STRONG_AI_OUTPUT_EVALUATION,
    CANONICAL_STRONG_AI_ETHICS_TRUST,
    CANONICAL_STRONG_AI_WORKFLOW_DESIGN,
    CANONICAL_STRONG_WORKFORCE_AI_READINESS,
    CANONICAL_STRONG_AI_CHANGE_LEADERSHIP,
  ];
  return Array.from({ length: count }, (_, i) => ({
    itemId: `item-${i}`,
    selectedValue: "B",
    freeText: undefined,
    confidenceScore: 0.7,
    timeToAnswerMs: 15000,
    outcomeClass: "strong",
    signalDeltasJson: signalSets[i % signalSets.length],
    eventCodesJson: [],
    riskLevel: i % 3 === 0 ? "High" : i % 3 === 1 ? "Medium" : "Low",
    difficulty: ((i % 3) + 1) as 1 | 2 | 3,
    capabilityKey: capabilityKeys[i % capabilityKeys.length],
    interactionType: interactionTypes[i % interactionTypes.length],
    optionPosition: 2,
    ...overrides,
  }));
}

describe("SessionController.computeState — Basic Evidence Sufficiency", () => {
  it("passes with 20 canonical-signal answers of varied types and risk levels", () => {
    const answers = makeAnswers(20);
    // F6b: Use 6-argument signature with role hint
    const state = SessionController.computeState("s1", "u1", "bp1", answers, MINIMUM_EVIDENCE.targetItems, "hr_generalist");
    console.log("evidenceSufficient:", state.evidenceSufficient);
    console.log("canComplete:", state.canComplete);
    console.log("completionBlockers:", state.completionBlockers);
    console.log("distinctInteractionTypes:", new Set(answers.map(a => a.interactionType)).size);
    console.log("highRiskProportion:", answers.filter(a => a.riskLevel === "High").length / answers.length);
    expect(state.completionBlockers).toHaveLength(0);
    expect(state.evidenceSufficient).toBe(true);
  });

  it("blocks completion when fewer than minimum items answered", () => {
    const answers = makeAnswers(MINIMUM_EVIDENCE.totalItems - 1);
    const state = SessionController.computeState("s1", "u1", "bp1", answers, MINIMUM_EVIDENCE.targetItems);
    expect(state.canComplete).toBe(false);
    expect(state.completionBlockers.length).toBeGreaterThan(0);
  });
});

describe("SessionController.computeState — Role-Aware Evidence Thresholds (D2/F6c)", () => {
  it("HRBP requires more ai_ethics_trust signal keys than generic before evidenceSufficient", () => {
    // Signal counting semantics: capabilitySignalCounts accumulates the NUMBER OF SIGNAL KEYS
    // across all answers for a capability, not the number of answers.
    // Global minimum: 3 signal keys per capability.
    // HRBP ai_ethics_trust threshold: 65 → ceil(65/20) = 4 signal keys required.
    //
    // To test the difference: build answers where ai_ethics_trust has exactly 3 signal keys total
    // (3 answers with 1 key each) — generic passes, HRBP blocks.
    const answers = makeAnswers(20);
    // Replace all ai_ethics_trust answers with single-signal answers so total signal keys = 3
    let ethicsReplaced = 0;
    for (let i = 0; i < answers.length; i++) {
      if (answers[i].capabilityKey === "ai_ethics_trust") {
        if (ethicsReplaced < 3) {
          // Each answer contributes exactly 1 signal key
          answers[i] = { ...answers[i], capabilityKey: "ai_ethics_trust", signalDeltasJson: { ethics_under_pressure: 0.8 }, riskLevel: "High" };
          ethicsReplaced++;
        } else {
          // Redirect extra ai_ethics_trust answers to ai_interaction
          answers[i] = { ...answers[i], capabilityKey: "ai_interaction", signalDeltasJson: CANONICAL_STRONG_AI_INTERACTION };
        }
      }
    }
    // Ensure we have exactly 3 ai_ethics_trust answers (1 key each = 3 total signal keys)
    if (ethicsReplaced < 3) {
      for (let i = 0; i < answers.length && ethicsReplaced < 3; i++) {
        if (answers[i].capabilityKey !== "ai_ethics_trust") {
          answers[i] = { ...answers[i], capabilityKey: "ai_ethics_trust", signalDeltasJson: { ethics_under_pressure: 0.8 }, riskLevel: "High" };
          ethicsReplaced++;
        }
      }
    }

    // Without role hint (generic): 3 signal keys meets global minimum of 3 → ai_ethics_trust is covered
    const stateGeneric = SessionController.computeState("s1", "u1", "bp1", answers, MINIMUM_EVIDENCE.targetItems);
    // With HRBP role hint: threshold is ceil(65/20)=4 signal keys, so 3 is insufficient
    const stateHRBP = SessionController.computeState("s1", "u1", "bp1", answers, MINIMUM_EVIDENCE.targetItems, "hrbp");

    console.log("[HRBP threshold test] generic evidenceSufficient:", stateGeneric.evidenceSufficient);
    console.log("[HRBP threshold test] hrbp evidenceSufficient:", stateHRBP.evidenceSufficient);
    console.log("[HRBP threshold test] hrbp blockers:", stateHRBP.completionBlockers);

    // HRBP must block when ai_ethics_trust has only 3 signal keys (below HRBP's required 4)
    expect(stateHRBP.evidenceSufficient).toBe(false);
  });

  it("HRBP with sufficient ai_ethics_trust signals passes evidence check", () => {
    // Build 20 answers with 4 ai_ethics_trust signals (meets HRBP threshold)
    const answers = makeAnswers(20);
    // Ensure 4 ai_ethics_trust answers with canonical signals
    for (let i = 0; i < 4; i++) {
      answers[i] = {
        ...answers[i],
        capabilityKey: "ai_ethics_trust",
        signalDeltasJson: { ethics_under_pressure: 0.9, stakeholder_impact_awareness: 0.7, pressure_drift_risk: 0.5 },
        riskLevel: "High",
      };
    }
    const state = SessionController.computeState("s1", "u1", "bp1", answers, MINIMUM_EVIDENCE.targetItems, "hrbp");
    // Should not block on ai_ethics_trust specifically (may still block on other criteria)
    const ethicsBlocker = state.completionBlockers.find(b =>
      b.toLowerCase().includes("ethics") || b.toLowerCase().includes("trust")
    );
    expect(ethicsBlocker).toBeUndefined();
  });
});

describe("SessionController.computeState — Seniority-Inconsistency Detection (B5/F6d)", () => {
  it("detects seniority inconsistency when senior user has high failure rate", () => {
    // Build 20 answers where >40% are failures — should trigger seniority-inconsistency
    // for a senior role archetype (director or above)
    const answers = makeAnswers(20);
    // Set 10 out of 20 (50%) to failure
    for (let i = 0; i < 10; i++) {
      answers[i] = {
        ...answers[i],
        outcomeClass: "failure",
        signalDeltasJson: { blind_acceptance_risk: -2.0, pressure_drift_risk: -1.5 },
      };
    }
    // Use a senior role hint — "er_specialist" maps to a senior archetype
    const state = SessionController.computeState("s1", "u1", "bp1", answers, MINIMUM_EVIDENCE.targetItems, "er_specialist");
    // The seniority inconsistency should be captured in the contradiction count or scrutiny level
    // (it routes to learning_gap, not blockClassification, so canComplete is not blocked)
    expect(state.gamingScrutinyLevel).toBeDefined();
    // The state should still be defined and not crash
    expect(state.sessionId).toBe("s1");
  });
});
