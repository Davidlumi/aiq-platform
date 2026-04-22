import { describe, it, expect } from "vitest";
import { SessionController, MINIMUM_EVIDENCE } from "./assessment/sessionController";

describe("Debug: evidenceSufficient", () => {
  it("should pass with 20 answers of varied types and risk levels", () => {
    const answers = Array.from({ length: 20 }, (_, i) => ({
      itemId: `item-${i}`,
      selectedValue: "B",
      freeText: undefined,
      confidenceScore: 0.7,
      timeToAnswerMs: 15000,
      outcomeClass: "strong",
      signalDeltasJson: { governance_adherence: 0.8 },
      eventCodesJson: [],
      riskLevel: i % 3 === 0 ? "High" : i % 3 === 1 ? "Medium" : "Low",
      difficulty: ((i % 3) + 1) as 1 | 2 | 3,
      capabilityKey: ["execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation"][i % 6],
      interactionType: ["situational_judgement", "prioritisation", "risk_judgement", "governance_decision", "scenario_critique", "error_detection", "output_improvement", "data_interpretation"][i % 8],
      optionPosition: 2,
    }));
    const state = SessionController.computeState("s1", "u1", "bp1", answers, MINIMUM_EVIDENCE.targetItems);
    console.log("evidenceSufficient:", state.evidenceSufficient);
    console.log("canComplete:", state.canComplete);
    console.log("completionBlockers:", state.completionBlockers);
    console.log("MINIMUM_EVIDENCE:", MINIMUM_EVIDENCE);
    console.log("distinctInteractionTypes:", new Set(answers.map(a => a.interactionType)).size);
    console.log("highRiskCount:", answers.filter(a => a.riskLevel === "High").length);
    console.log("highRiskProportion:", answers.filter(a => a.riskLevel === "High").length / answers.length);
    expect(state.completionBlockers).toHaveLength(0);
    expect(state.evidenceSufficient).toBe(true);
  });
});
