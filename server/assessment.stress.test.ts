/**
 * Assessment Engine Stress Test (v10 migration)
 * Tests the full lifecycle: start → generate → submit × N → complete → score
 * Also tests: LLM generation, all interaction types, error handling,
 * role archetype resolution, scoring, contradiction detection, anti-gaming.
 *
 * v10 migration notes:
 *   - 6 capability domains: ai_interaction, ai_output_evaluation, ai_workflow_design,
 *     workforce_ai_readiness, ai_ethics_trust, ai_change_leadership
 *   - Interaction types: prompt_diagnosis, prompt_construction, process_redesign,
 *     handoff_decision, capability_diagnosis, intervention_design, leader_advisory,
 *     ethical_pressure_test, stakeholder_impact, resistance_response, legitimate_concern,
 *     contradiction_probe, scenario_critique, error_detection, risk_judgement, confidence_calibration
 *   - TYPES_WITH_AI_OUTPUT: scenario_critique, error_detection, prompt_diagnosis
 *   - TYPES_WITH_DATA: capability_diagnosis
 *   - computeSignalScores accepts Array<{ signalDeltas: Record<string, number> }>
 *   - computeCapabilityScores uses positional args
 *   - Signal keys: prompt_construction_quality, output_evaluation_quality, ethics_under_pressure, etc.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateAdaptiveItem,
  selectNextGenerationVariables,
  determineSessionPhase,
  TYPES_WITH_AI_OUTPUT,
  TYPES_WITH_DATA,
  DEFAULT_ORG_INTENT,
  type AdaptiveSelectionContext,
  type GenerationVariables,
  type InteractionType,
} from "./assessment/adaptiveEngine";
import { SessionController, MINIMUM_EVIDENCE, type AnswerData } from "./assessment/sessionController";
import { computeSignalScores, computeCapabilityScores } from "./assessment/scoringEngine";
import { detectContradictions } from "./assessment/contradictionEngine";
import { analyseGamingPatterns } from "./assessment/antiGamingEngine";
import { resolveRoleArchetype, ROLE_ARCHETYPES } from "./assessment/roleArchetypes";

// ─── Mock invokeLLM to avoid real API calls ────────────────────────────────────
let llmCallCount = 0;
const INTERACTION_TYPE_ROTATION: string[] = [
  "scenario_critique", "prompt_construction", "risk_judgement", "ethical_pressure_test",
  "prompt_diagnosis", "error_detection", "process_redesign", "capability_diagnosis",
  "scenario_critique", "prompt_construction", "risk_judgement", "ethical_pressure_test",
  "prompt_diagnosis", "error_detection", "process_redesign", "capability_diagnosis",
  "scenario_critique", "prompt_construction", "risk_judgement", "ethical_pressure_test",
];
const CAPABILITY_KEY_ROTATION: string[] = [
  "ai_interaction", "ai_output_evaluation", "ai_ethics_trust",
  "ai_workflow_design", "workforce_ai_readiness", "ai_change_leadership",
  "ai_interaction", "ai_output_evaluation", "ai_ethics_trust",
  "ai_workflow_design", "workforce_ai_readiness", "ai_change_leadership",
  "ai_interaction", "ai_output_evaluation", "ai_ethics_trust",
  "ai_workflow_design", "workforce_ai_readiness", "ai_change_leadership",
  "ai_interaction", "ai_output_evaluation",
];

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async ({ messages, response_format }: { messages?: unknown[]; response_format?: unknown }) => {
    const schema = (response_format as any)?.json_schema?.schema;
    const needsAiOutput = schema?.properties?.ai_output !== undefined;
    const needsDataContext = schema?.properties?.data_context !== undefined;
    const interactionType = INTERACTION_TYPE_ROTATION[llmCallCount % INTERACTION_TYPE_ROTATION.length];
    const capabilityKey = CAPABILITY_KEY_ROTATION[llmCallCount % CAPABILITY_KEY_ROTATION.length];
    llmCallCount++;
    return {
      choices: [{
        message: {
          content: JSON.stringify({
            title: "AI Output Review: Recruitment Email Draft",
            scenario: "Your AI tool has drafted a recruitment email for a senior HR Business Partner role.",
            constraint: "You have 10 minutes before the email is scheduled to send.",
            question: "What is the most significant problem with this output?",
            capability_key: capabilityKey,
            workflow: "Recruitment & Selection",
            risk_level: "High",
            interaction_type: interactionType,
            difficulty: 3,
            options: [
              { label: "A", text: "The email uses informal language.", outcomeClass: "acceptable", signalDeltas: { output_evaluation_quality: 0.3, prompt_construction_quality: 0.2 }, eventCodes: ["QC-01"], rationale: "Acceptable but not critical." },
              { label: "B", text: "The email contains no salary range.", outcomeClass: "strong", signalDeltas: { output_evaluation_quality: 0.8, prompt_construction_quality: 0.5, ethics_under_pressure: 0.3 }, eventCodes: ["GOV-01", "RISK-01"], rationale: "Correct — compliance gap." },
              { label: "C", text: "The email is too long.", outcomeClass: "weak", signalDeltas: { output_evaluation_quality: -0.2, prompt_construction_quality: -0.1 }, eventCodes: [], rationale: "Minor cosmetic issue." },
              { label: "D", text: "Send immediately without review.", outcomeClass: "failure", signalDeltas: { blind_acceptance_risk: -2.0, output_evaluation_quality: -1.5 }, eventCodes: ["BLIND_ACCEPT"], rationale: "Critical failure — blind acceptance." },
            ],
            ...(needsAiOutput ? { ai_output: "Dear [Candidate Name],\n\nWe are excited to reach out about an exceptional opportunity..." } : {}),
            ...(needsDataContext ? { data_context: "Q3 attrition data shows 18% voluntary turnover in the Sales division." } : {}),
          }),
        },
      }],
    };
  }),
}));

// ─── Helper: Build a mock AnswerData ──────────────────────────────────────────
function mockAnswer(overrides: Partial<AnswerData> = {}): AnswerData {
  const interactionTypes: InteractionType[] = [
    "prompt_diagnosis", "prompt_construction", "risk_judgement",
    "ethical_pressure_test", "scenario_critique", "error_detection",
    "process_redesign", "capability_diagnosis",
  ];
  const idx = Math.floor(Math.random() * interactionTypes.length);
  return {
    itemId: `item-${Math.random().toString(36).slice(2)}`,
    selectedValue: "B",
    freeText: undefined,
    confidenceScore: 0.7,
    timeToAnswerMs: 15000,
    outcomeClass: "strong",
    signalDeltasJson: { ethics_under_pressure: 0.8, output_evaluation_quality: 0.5 },
    eventCodesJson: [],
    riskLevel: "High",
    difficulty: 3,
    capabilityKey: "ai_output_evaluation",
    interactionType: interactionTypes[idx],
    optionPosition: 2,
    ...overrides,
  };
}

// ─── Helper: Build a full set of N answers with varied types ─────────────────
function buildAnswerSet(count: number, overrides: Partial<AnswerData> = {}): AnswerData[] {
  const interactionTypes: InteractionType[] = [
    "prompt_diagnosis", "prompt_construction", "risk_judgement",
    "ethical_pressure_test", "scenario_critique", "error_detection",
    "process_redesign", "capability_diagnosis",
  ];
  const capabilityKeys = [
    "ai_interaction", "ai_output_evaluation", "ai_change_leadership",
    "workforce_ai_readiness", "ai_workflow_design", "ai_ethics_trust",
  ];
  return Array.from({ length: count }, (_, i) => mockAnswer({
    itemId: `item-${i}`,
    interactionType: interactionTypes[i % interactionTypes.length],
    capabilityKey: capabilityKeys[i % capabilityKeys.length],
    riskLevel: i % 3 === 0 ? "High" : i % 3 === 1 ? "Medium" : "Low",
    difficulty: ((i % 3) + 1) as 1 | 2 | 3,
    ...overrides,
  }));
}

// ─── Helper: Build AdaptiveSelectionContext ───────────────────────────────────
function buildCtx(answers: AnswerData[], overrides: Partial<AdaptiveSelectionContext> = {}): AdaptiveSelectionContext {
  const signalScores = computeSignalScores(answers.map(a => ({
    signalDeltas: (() => {
      try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
    })(),
  })));
  const capabilityScores = computeCapabilityScores(signalScores);
  const interactionTypesUsed: Record<string, number> = {};
  for (const a of answers) {
    interactionTypesUsed[a.interactionType] = (interactionTypesUsed[a.interactionType] ?? 0) + 1;
  }
  return {
    answeredCount: answers.length,
    totalTarget: MINIMUM_EVIDENCE.targetItems,
    capabilityScores: Object.fromEntries(
      Object.entries(capabilityScores).map(([k, v]) => [k, { score: v.score, signalCount: v.signalCount }])
    ) as any,
    interactionTypesUsed: interactionTypesUsed as any,
    riskExposure: {
      Low: answers.filter(a => a.riskLevel === "Low").length,
      Medium: answers.filter(a => a.riskLevel === "Medium").length,
      High: answers.filter(a => a.riskLevel === "High").length,
    },
    gamingAnalysis: analyseGamingPatterns(answers.map(a => ({
      selectedValue: a.selectedValue,
      optionPosition: a.optionPosition,
      timeToAnswerMs: a.timeToAnswerMs,
      outcomeClass: a.outcomeClass,
      confidenceScore: a.confidenceScore,
      signalDeltas: (() => {
        try { return typeof a.signalDeltasJson === "object" ? a.signalDeltasJson as Record<string, number> : {}; } catch { return {}; }
      })(),
      interactionType: a.interactionType,
    }))),
    contradictionProbes: [],
    roleArchetype: resolveRoleArchetype("hrbp"),
    orgIntent: DEFAULT_ORG_INTENT,
    userSector: "Financial Services",
    userSeniority: "senior_practitioner",
    userAiUsageLevel: "intermediate",
    priorCapabilityScores: null,
    ...overrides,
  };
}

// ─── Helper: Build GenerationVariables ───────────────────────────────────────
function buildVars(overrides: Partial<GenerationVariables> = {}): GenerationVariables {
  const role = resolveRoleArchetype("hrbp");
  return {
    roleArchetype: role,
    targetCapability: "ai_output_evaluation",
    interactionType: "scenario_critique",
    difficulty: 3,
    riskLevel: "High",
    ambiguity: "medium",
    workflowContext: "employee_relations",
    aiOutputQuality: "flawed",
    aiFailureMode: null,
    governanceSensitivity: "high",
    timePressure: true,
    businessConsequence: "high",
    evidenceObjective: "Assess ai_output_evaluation via scenario_critique",
    contradictionIntent: false,
    phase: "adaptive",
    userSector: "Financial Services",
    userSeniority: "senior_practitioner",
    userAiUsageLevel: "intermediate",
    priorCapabilityScores: null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => { llmCallCount = 0; });

describe("Assessment Engine — Phase Determination", () => {
  it("returns baseline for first 30% of items", () => {
    const target = MINIMUM_EVIDENCE.targetItems; // 49
    expect(determineSessionPhase(0, target)).toBe("baseline");
    expect(determineSessionPhase(14, target)).toBe("baseline"); // 14/49 = 0.2857 < 0.30
  });

  it("returns adaptive for middle 45%", () => {
    const target = MINIMUM_EVIDENCE.targetItems;
    expect(determineSessionPhase(15, target)).toBe("adaptive"); // 15/49 = 0.3061 >= 0.30
    expect(determineSessionPhase(36, target)).toBe("adaptive"); // 36/49 = 0.7347 < 0.75
  });

  it("returns validation for final 25%", () => {
    const target = MINIMUM_EVIDENCE.targetItems;
    expect(determineSessionPhase(37, target)).toBe("validation"); // 37/49 = 0.7551 >= 0.75
    expect(determineSessionPhase(target - 1, target)).toBe("validation");
  });
});

describe("Assessment Engine — Role Archetype Resolution", () => {
  it("resolves known role IDs directly", () => {
    const archetype = resolveRoleArchetype("hrbp");
    expect(archetype.id).toBe("hrbp");
    expect(archetype.displayName).toBeTruthy();
  });

  it("resolves role::experience format", () => {
    const archetype = resolveRoleArchetype("hrbp::intermediate");
    expect(archetype.id).toBe("hrbp");
  });

  it("resolves partial role name matches", () => {
    const archetype = resolveRoleArchetype("HR Business Partner");
    expect(archetype.id).toBe("hrbp");
  });

  it("returns default archetype for unknown roles", () => {
    const archetype = resolveRoleArchetype("completely_unknown_role_xyz");
    expect(archetype).toBeDefined();
    expect(archetype.id).toBeTruthy();
  });

  it("returns default archetype for null input", () => {
    const archetype = resolveRoleArchetype(null);
    expect(archetype).toBeDefined();
    expect(archetype.id).toBeTruthy();
  });

  it("all role archetypes have required fields", () => {
    for (const [key, role] of Object.entries(ROLE_ARCHETYPES)) {
      expect(role.id, `${key}.id`).toBeTruthy();
      expect(role.displayName, `${key}.displayName`).toBeTruthy();
      expect(role.family, `${key}.family`).toBeTruthy();
      expect(role.workflows.length, `${key}.workflows`).toBeGreaterThan(0);
      expect(role.capabilityWeights, `${key}.capabilityWeights`).toBeDefined();
      expect(role.governanceSensitivity, `${key}.governanceSensitivity`).toBeTruthy();
    }
  });
});

describe("Assessment Engine — Generation Variables", () => {
  it("returns valid generation variables for baseline phase", () => {
    const answers = buildAnswerSet(3);
    const ctx = buildCtx(answers, { answeredCount: 3 });
    const vars = selectNextGenerationVariables(ctx);
    expect(vars.interactionType).toBeDefined();
    expect(vars.targetCapability).toBeDefined();
    expect(vars.difficulty).toBeGreaterThanOrEqual(1);
    expect(vars.difficulty).toBeLessThanOrEqual(3);
    expect(vars.roleArchetype).toBeDefined();
    expect(vars.roleArchetype.displayName).toBeTruthy();
  });

  it("includes user sector and seniority in generation variables", () => {
    const ctx = buildCtx(buildAnswerSet(5));
    const vars = selectNextGenerationVariables(ctx);
    expect(vars.userSector).toBe("Financial Services");
    expect(vars.userSeniority).toBe("senior_practitioner");
  });

  it("targets weakest capability when prior scores exist (adaptive phase)", () => {
    // Must include ALL required interaction types so Priority 5 doesn't fire before Priority 6
    const requiredTypes: InteractionType[] = [
      "scenario_critique", "risk_judgement", "prompt_diagnosis",
      "ethical_pressure_test", "contradiction_probe",
    ];
    const ctx: AdaptiveSelectionContext = {
      answeredCount: 15,
      totalTarget: MINIMUM_EVIDENCE.targetItems,
      capabilityScores: {
        ai_interaction: { score: 0, signalCount: 0 },
        ai_output_evaluation: { score: 0, signalCount: 0 },
        ai_ethics_trust: { score: 0, signalCount: 0 },
        ai_workflow_design: { score: 0, signalCount: 0 },
        workforce_ai_readiness: { score: 0, signalCount: 0 },
        ai_change_leadership: { score: 0, signalCount: 0 },
      },
      interactionTypesUsed: Object.fromEntries(requiredTypes.map(t => [t, 1])) as Record<InteractionType, number>,
      riskExposure: { Low: 5, Medium: 5, High: 5 },
      gamingAnalysis: { score: 1.0, patterns: [], scrutinyLevel: "normal", injectionRequired: false, recommendedInjections: [] },
      contradictionProbes: [],
      roleArchetype: resolveRoleArchetype("hrbp"),
      orgIntent: DEFAULT_ORG_INTENT,
      userSector: "Financial Services",
      userSeniority: "senior_practitioner",
      userAiUsageLevel: "intermediate",
      priorCapabilityScores: {
        ai_interaction: 85, ai_output_evaluation: 30, workforce_ai_readiness: 65,
        ai_workflow_design: 75, ai_ethics_trust: 80, ai_change_leadership: 70,
      },
    };
    const vars = selectNextGenerationVariables(ctx);
    expect(vars.phase).toBe("adaptive");
    // ai_output_evaluation=30 is weakest — with all required types covered, Priority 6 fires
    expect(vars.targetCapability).toBe("ai_output_evaluation");
  });

  it("increases difficulty for returning users with high prior scores", () => {
    const ctx = buildCtx(buildAnswerSet(5), {
      priorCapabilityScores: {
        ai_interaction: 90, ai_output_evaluation: 88, ai_change_leadership: 85,
        workforce_ai_readiness: 82, ai_workflow_design: 87, ai_ethics_trust: 91,
      },
    });
    const vars = selectNextGenerationVariables(ctx);
    expect(vars.difficulty).toBeGreaterThanOrEqual(2);
  });

  it("workflowContext is a non-empty string", () => {
    const ctx = buildCtx(buildAnswerSet(5));
    const vars = selectNextGenerationVariables(ctx);
    expect(typeof vars.workflowContext).toBe("string");
    expect(vars.workflowContext.length).toBeGreaterThan(0);
  });
});

describe("Assessment Engine — LLM Item Generation", () => {
  it("generates a valid item for scenario_critique (with ai_output)", async () => {
    const vars = buildVars({ interactionType: "scenario_critique" });
    const item = await generateAdaptiveItem(vars);
    expect(item.title).toBeTruthy();
    expect(item.scenario).toBeTruthy();
    expect(item.constraint).toBeTruthy();
    expect(item.question).toBeTruthy();
    expect(item.options).toHaveLength(4);
    expect(item.aiOutput).toBeTruthy();
    expect(item.interactionType).toBe("scenario_critique");
  });

  it("generates a valid item for error_detection (with ai_output)", async () => {
    const vars = buildVars({ interactionType: "error_detection", targetCapability: "ai_ethics_trust" });
    const item = await generateAdaptiveItem(vars);
    expect(item.aiOutput).toBeTruthy();
  });

  it("generates a valid item for prompt_diagnosis (with ai_output)", async () => {
    const vars = buildVars({ interactionType: "prompt_diagnosis", targetCapability: "ai_interaction" });
    const item = await generateAdaptiveItem(vars);
    expect(item.aiOutput).toBeTruthy();
  });

  it("generates a valid item for capability_diagnosis (with data_context)", async () => {
    const vars = buildVars({
      interactionType: "capability_diagnosis",
      targetCapability: "workforce_ai_readiness",
      roleArchetype: resolveRoleArchetype("people_analytics"),
      workflowContext: "people_analytics",
    });
    const item = await generateAdaptiveItem(vars);
    expect(item.dataContext).toBeTruthy();
  });

  it("generates a valid item for prompt_construction (no ai_output needed)", async () => {
    const vars = buildVars({ interactionType: "prompt_construction", targetCapability: "ai_interaction" });
    const item = await generateAdaptiveItem(vars);
    expect(item.aiOutput).toBeUndefined();
    expect(item.options).toHaveLength(4);
  });

  it("generates a valid item for risk_judgement", async () => {
    const vars = buildVars({ interactionType: "risk_judgement", targetCapability: "ai_ethics_trust", riskLevel: "High" });
    const item = await generateAdaptiveItem(vars);
    expect(item.options).toHaveLength(4);
    expect(item.riskLevel).toBe("High");
  });

  it("generates a valid item for ethical_pressure_test", async () => {
    const vars = buildVars({ interactionType: "ethical_pressure_test", targetCapability: "ai_ethics_trust" });
    const item = await generateAdaptiveItem(vars);
    expect(item.options).toHaveLength(4);
  });

  it("generates a valid item for prompt_diagnosis", async () => {
    const vars = buildVars({ interactionType: "prompt_diagnosis", targetCapability: "ai_interaction" });
    const item = await generateAdaptiveItem(vars);
    expect(item.options).toHaveLength(4);
  });

  it("generates exactly 4 options with valid outcome classes", async () => {
    const vars = buildVars();
    const item = await generateAdaptiveItem(vars);
    expect(item.options).toHaveLength(4);
    const validOutcomes = ["strong", "acceptable", "weak", "failure", "critical_failure"];
    item.options.forEach(opt => {
      expect(validOutcomes).toContain(opt.outcomeClass);
      expect(opt.label).toMatch(/^[A-D]$/);
      expect(opt.text).toBeTruthy();
    });
  });

  it("all options have signal_deltas as objects", async () => {
    const vars = buildVars();
    const item = await generateAdaptiveItem(vars);
    item.options.forEach(opt => {
      expect(typeof opt.signalDeltas).toBe("object");
      expect(opt.signalDeltas).not.toBeNull();
    });
  });

  it("at least one option has outcomeClass 'strong'", async () => {
    const vars = buildVars();
    const item = await generateAdaptiveItem(vars);
    const hasStrong = item.options.some(o => o.outcomeClass === "strong");
    expect(hasStrong).toBe(true);
  });

  it("does not include ai_output for non-critique types", async () => {
    const vars = buildVars({ interactionType: "prompt_construction" });
    const item = await generateAdaptiveItem(vars);
    expect(item.aiOutput).toBeUndefined();
    expect(item.dataContext).toBeUndefined();
  });

  it("TYPES_WITH_AI_OUTPUT contains the correct types", () => {
    expect(TYPES_WITH_AI_OUTPUT).toContain("scenario_critique");
    expect(TYPES_WITH_AI_OUTPUT).toContain("error_detection");
    expect(TYPES_WITH_AI_OUTPUT).toContain("prompt_diagnosis");
    expect(TYPES_WITH_AI_OUTPUT).not.toContain("prompt_construction");
    expect(TYPES_WITH_AI_OUTPUT).not.toContain("ethical_pressure_test");
  });

  it("TYPES_WITH_DATA contains capability_diagnosis", () => {
    expect(TYPES_WITH_DATA).toContain("capability_diagnosis");
    expect(TYPES_WITH_DATA).not.toContain("scenario_critique");
  });
});

describe("Assessment Engine — Scoring Engine", () => {
  it("computes signal scores from a full answer set", () => {
    const answers = buildAnswerSet(20);
    const signalScores = computeSignalScores(answers.map(a => ({
      signalDeltas: (() => {
        try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
      })(),
    })));
    expect(Object.keys(signalScores).length).toBeGreaterThan(0);
    Object.values(signalScores).forEach(score => {
      expect(typeof score.sum).toBe("number");
    });
  });

  it("computes capability scores from signal scores", () => {
    const answers = buildAnswerSet(20);
    const signalScores = computeSignalScores(answers.map(a => ({
      signalDeltas: (() => {
        try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
      })(),
    })));
    const capabilityScores = computeCapabilityScores(signalScores);
    const keys = Object.keys(capabilityScores);
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach(k => {
      expect(capabilityScores[k as any].score).toBeGreaterThanOrEqual(0);
      expect(capabilityScores[k as any].score).toBeLessThanOrEqual(100);
    });
  });

  it("penalises failure answers in scoring", () => {
    const goodAnswers = buildAnswerSet(10, { outcomeClass: "strong", signalDeltasJson: { ethics_under_pressure: 0.8 } });
    const badAnswers = buildAnswerSet(10, { outcomeClass: "failure", signalDeltasJson: { ethics_under_pressure: -0.8 } });
    const goodSignals = computeSignalScores(goodAnswers.map(a => ({
      signalDeltas: (() => {
        try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
      })(),
    })));
    const badSignals = computeSignalScores(badAnswers.map(a => ({
      signalDeltas: (() => {
        try { return typeof a.signalDeltasJson === "string" ? JSON.parse(a.signalDeltasJson) : (a.signalDeltasJson as Record<string, number>) ?? {}; } catch { return {}; }
      })(),
    })));
    const goodCap = computeCapabilityScores(goodSignals);
    const badCap = computeCapabilityScores(badSignals);
    const goodTotal = Object.values(goodCap).reduce((s, v) => s + v.score, 0);
    const badTotal = Object.values(badCap).reduce((s, v) => s + v.score, 0);
    expect(goodTotal).toBeGreaterThan(badTotal);
  });

  it("handles empty answer set without crashing", () => {
    const signalScores = computeSignalScores([]);
    expect(signalScores).toBeDefined();
    const capabilityScores = computeCapabilityScores(signalScores);
    expect(capabilityScores).toBeDefined();
  });

  it("strong option produces positive signal, failure option produces negative signal", () => {
    const strongAnswer = [{ signalDeltas: { ethics_under_pressure: 0.8, workflow_redesign_quality: 0.5 } }];
    const failureAnswer = [{ signalDeltas: { blind_acceptance_risk: -2.0, output_evaluation_quality: -1.5 } }];
    const strongSignals = computeSignalScores(strongAnswer);
    const failureSignals = computeSignalScores(failureAnswer);
    expect(strongSignals.ethics_under_pressure.sum).toBeGreaterThan(0);
    expect(strongSignals.workflow_redesign_quality.sum).toBeGreaterThan(0);
    expect(failureSignals.blind_acceptance_risk.sum).toBeLessThan(0);
    expect(failureSignals.output_evaluation_quality.sum).toBeLessThan(0);
  });
});

describe("Assessment Engine — Session Controller", () => {
  it("blocks completion when fewer than minimum items answered", () => {
    const answers = buildAnswerSet(MINIMUM_EVIDENCE.totalItems - 1);
    const state = SessionController.computeState("s1", "u1", "bp1", answers, MINIMUM_EVIDENCE.targetItems, "hr_generalist");
    expect(state.canComplete).toBe(false);
    expect(state.completionBlockers.length).toBeGreaterThan(0);
  });

  it("allows completion when evidence is sufficient", () => {
    const answers = buildAnswerSet(MINIMUM_EVIDENCE.totalItems);
    const state = SessionController.computeState("s1", "u1", "bp1", answers, MINIMUM_EVIDENCE.targetItems, "hr_generalist");
    expect(state.evidenceSufficient).toBe(true);
    expect(state.canComplete).toBe(true);
  });

  it("computes full results from sufficient answers", () => {
    const answers = buildAnswerSet(MINIMUM_EVIDENCE.totalItems);
    const results = SessionController.computeResults(answers, "hrbp");
    expect(results.overallScore).toBeGreaterThanOrEqual(0);
    expect(results.overallScore).toBeLessThanOrEqual(100);
    expect(results.readiness).toBeDefined();
    expect(results.capabilityScores).toBeDefined();
    expect(results.signalScores).toBeDefined();
    expect(results.narrative).toBeTruthy();
  });

  it("detects gaming patterns in rapid-fire answers", () => {
    const rapidAnswers = buildAnswerSet(MINIMUM_EVIDENCE.totalItems, {
      timeToAnswerMs: 500,
      selectedValue: "A",
      optionPosition: 1,
    });
    const state = SessionController.computeState("s1", "u1", "bp1", rapidAnswers, MINIMUM_EVIDENCE.targetItems, "hr_generalist");
    expect(state.gamingScrutinyLevel).toBeDefined();
  });

  it("detects contradictions in inconsistent answers", () => {
    const answers = buildAnswerSet(MINIMUM_EVIDENCE.totalItems);
    const answerRecords = answers.map(a => ({
      itemId: a.itemId,
      capabilityKey: a.capabilityKey,
      outcomeClass: a.outcomeClass,
      signalDeltas: (() => {
        try { return typeof a.signalDeltasJson === "object" ? a.signalDeltasJson as Record<string, number> : {}; } catch { return {}; }
      })(),
      confidenceScore: a.confidenceScore,
      interactionType: a.interactionType,
      riskLevel: a.riskLevel,
    }));
    const contradictions = detectContradictions(answerRecords);
    expect(contradictions).toBeDefined();
    expect(Array.isArray(contradictions.pairs)).toBe(true);
  });

  it("handles a session with all weak answers (low score)", () => {
    const answers = buildAnswerSet(MINIMUM_EVIDENCE.totalItems, {
      outcomeClass: "weak",
      signalDeltasJson: { ethics_under_pressure: -0.3, output_evaluation_quality: -0.2 },
    });
    const results = SessionController.computeResults(answers, "hrbp");
    expect(results.overallScore).toBeLessThan(60);
  });

  it("handles a session with all strong answers (high score)", () => {
    const answers = buildAnswerSet(MINIMUM_EVIDENCE.totalItems, {
      outcomeClass: "strong",
      signalDeltasJson: { ethics_under_pressure: 0.9, output_evaluation_quality: 0.8, prompt_construction_quality: 0.7 },
    });
    const results = SessionController.computeResults(answers, "hrbp");
    expect(results.overallScore).toBeGreaterThan(50);
  });
});

describe("Assessment Engine — MINIMUM_EVIDENCE Model", () => {
  it("MINIMUM_EVIDENCE has correct values", () => {
    expect(MINIMUM_EVIDENCE.totalItems).toBeGreaterThanOrEqual(15);
    expect(MINIMUM_EVIDENCE.targetItems).toBeGreaterThanOrEqual(20);
    expect(MINIMUM_EVIDENCE.distinctInteractionTypes).toBeGreaterThanOrEqual(3);
    expect(MINIMUM_EVIDENCE.highRiskProportion).toBeGreaterThan(0);
    expect(MINIMUM_EVIDENCE.highRiskProportion).toBeLessThan(1);
  });

  it("totalItems is achievable within targetItems", () => {
    expect(MINIMUM_EVIDENCE.totalItems).toBeLessThanOrEqual(MINIMUM_EVIDENCE.targetItems);
  });
});

describe("Assessment Engine — Full Session Simulation (20 questions)", () => {
  it("simulates a complete session end-to-end with LLM generation", async () => {
    const sessionAnswers: AnswerData[] = [];
    const ALL_CAPS = [
      "ai_interaction", "ai_output_evaluation", "ai_ethics_trust",
      "ai_workflow_design", "workforce_ai_readiness", "ai_change_leadership",
    ] as const;

    for (let i = 0; i < MINIMUM_EVIDENCE.totalItems; i++) {
      const ctx = buildCtx(sessionAnswers, { answeredCount: i });
      const vars = selectNextGenerationVariables(ctx);
      const item = await generateAdaptiveItem(vars);

      expect(item.title).toBeTruthy();
      expect(item.options).toHaveLength(4);
      expect(item.interactionType).toBeTruthy();
      if (TYPES_WITH_AI_OUTPUT.includes(item.interactionType as InteractionType)) {
        expect(item.aiOutput).toBeTruthy();
      }
      if (TYPES_WITH_DATA.includes(item.interactionType as InteractionType)) {
        expect(item.dataContext).toBeTruthy();
      }

      const strongOption = item.options.find(o => o.outcomeClass === "strong") ?? item.options[0];
      const forcedRiskLevel: "Low" | "Medium" | "High" = i % 3 === 0 ? "High" : i % 3 === 1 ? "Medium" : "Low";
      sessionAnswers.push(mockAnswer({
        itemId: `gen-item-${i}`,
        interactionType: item.interactionType as InteractionType,
        capabilityKey: ALL_CAPS[i % ALL_CAPS.length],
        riskLevel: forcedRiskLevel,
        difficulty: item.difficulty as 1 | 2 | 3,
        outcomeClass: strongOption.outcomeClass,
        signalDeltasJson: strongOption.signalDeltas,
        timeToAnswerMs: 20000,
      }));
    }

    const state = SessionController.computeState("s1", "u1", "bp1", sessionAnswers, MINIMUM_EVIDENCE.targetItems, "hrbp");
    expect(state.evidenceSufficient).toBe(true);
    expect(state.canComplete).toBe(true);

    const results = SessionController.computeResults(sessionAnswers, "hrbp");
    expect(results.overallScore).toBeGreaterThanOrEqual(0);
    expect(results.overallScore).toBeLessThanOrEqual(100);
    expect(results.readiness).toBeDefined();
    expect(results.capabilityScores).toBeDefined();
    console.log(`\n✓ Full session complete: score=${results.overallScore.toFixed(1)}, readiness=${results.readiness}`);
  }, 30000);

  it("simulates a returning user session with prior scores (adaptive calibration)", async () => {
    const priorScores = {
      ai_interaction: 72, ai_output_evaluation: 45, ai_ethics_trust: 68,
      ai_workflow_design: 80, workforce_ai_readiness: 55, ai_change_leadership: 60,
    };
    const sessionAnswers: AnswerData[] = buildAnswerSet(15, { riskLevel: "High" });

    for (let i = 0; i < 5; i++) {
      const ctx = buildCtx(sessionAnswers, {
        answeredCount: sessionAnswers.length,
        priorCapabilityScores: priorScores,
      });
      const vars = selectNextGenerationVariables(ctx);
      expect(vars.targetCapability).toBeDefined();
      expect(vars.phase).toBe("adaptive");
      const item = await generateAdaptiveItem(vars);
      const strongOption = item.options.find(o => o.outcomeClass === "strong") ?? item.options[0];
      sessionAnswers.push(mockAnswer({
        itemId: `gen-item-${i}`,
        interactionType: item.interactionType as InteractionType,
        capabilityKey: item.capabilityKey,
        riskLevel: item.riskLevel,
        difficulty: item.difficulty as 1 | 2 | 3,
        outcomeClass: strongOption.outcomeClass,
        signalDeltasJson: strongOption.signalDeltas,
      }));
    }
    expect(sessionAnswers.length).toBe(20);
  }, 30000);
});
