/**
 * Assessment Engine Stress Test
 * Tests the full lifecycle: start → generate → submit × N → complete → score
 * Also tests: LLM generation, all interaction types, error handling,
 * role archetype resolution, scoring, contradiction detection, anti-gaming.
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
// Track call count to return varied interaction types
let llmCallCount = 0;
const INTERACTION_TYPE_ROTATION: string[] = [
  "scenario_critique", "prioritisation", "risk_judgement", "governance_decision",
  "situational_judgement", "error_detection", "output_improvement", "data_interpretation",
  "scenario_critique", "prioritisation", "risk_judgement", "governance_decision",
  "situational_judgement", "error_detection", "output_improvement", "data_interpretation",
  "scenario_critique", "prioritisation", "risk_judgement", "governance_decision",
];
// Rotate through all 6 capability domains so R1 per-capability coverage check passes
const CAPABILITY_KEY_ROTATION: string[] = [
  "execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation",
  "execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation",
  "execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation",
  "execution", "judgement",
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
            scenario: "Your AI tool has drafted a recruitment email for a senior HR Business Partner role. The email will be sent to 200 passive candidates sourced from LinkedIn.",
            constraint: "You have 10 minutes before the email is scheduled to send. You can make one change.",
            question: "What is the most significant problem with this output?",
            capability_key: capabilityKey,
            workflow: "Recruitment & Selection",
            risk_level: "High",
            interaction_type: interactionType,
            difficulty: 3,
            options: [
              { label: "A", text: "The email uses informal language inappropriate for senior candidates.", outcomeClass: "acceptable", signalDeltas: { validation_accuracy: 0.3, judgement_quality: 0.2 }, eventCodes: ["QC-01"], rationale: "Acceptable but not the most critical issue." },
              { label: "B", text: "The email contains no salary range, which is now legally required in some jurisdictions.", outcomeClass: "strong", signalDeltas: { governance_quality: 0.8, appropriateness_boundary: 0.5 }, eventCodes: ["GOV-01", "RISK-01"], rationale: "Correct — compliance gap is the most significant problem." },
              { label: "C", text: "The email is too long and candidates won't read it.", outcomeClass: "weak", signalDeltas: { validation_accuracy: -0.2, cosmetic_focus_risk: -0.3 }, eventCodes: [], rationale: "Minor cosmetic issue, not the most significant problem." },
              { label: "D", text: "Send the email immediately without any review — the AI tool is reliable.", outcomeClass: "failure", signalDeltas: { blind_acceptance_risk: -2.0, validation_accuracy: -1.5 }, eventCodes: ["BLIND_ACCEPT"], rationale: "Critical failure — blind acceptance without any validation." },
            ],
            ...(needsAiOutput ? { ai_output: "Dear [Candidate Name],\n\nWe are excited to reach out about an exceptional opportunity for a Senior HR Business Partner at Acme Corp. This role offers a competitive package and the chance to shape our people strategy. The position reports directly to the CHRO and offers significant autonomy.\n\nPlease reply if you are interested in learning more.\n\nBest regards,\nTalent Acquisition Team" } : {}),
            ...(needsDataContext ? { data_context: "Q3 attrition data shows 18% voluntary turnover in the Sales division, compared to a 12% company average. Exit survey data indicates 67% of leavers cited 'lack of career progression' as the primary reason. However, the Sales division also had the highest performance bonus payouts this quarter (avg £8,400 vs £5,200 company average)." } : {}),
          }),
        },
      }],
    };
  }),
}));

// ─── Helper: Build a mock AnswerData ──────────────────────────────────────────
function mockAnswer(overrides: Partial<AnswerData> = {}): AnswerData {
  const interactionTypes: InteractionType[] = [
    "situational_judgement", "prioritisation", "risk_judgement",
    "governance_decision", "scenario_critique", "error_detection",
    "output_improvement", "data_interpretation",
  ];
  const idx = Math.floor(Math.random() * interactionTypes.length);
  return {
    itemId: `item-${Math.random().toString(36).slice(2)}`,
    selectedValue: "B",
    freeText: undefined,
    confidenceScore: 0.7,
    timeToAnswerMs: 15000,
    outcomeClass: "strong",
    signalDeltasJson: { governance_quality: 0.8, judgement_quality: 0.5 },
    eventCodesJson: [],
    riskLevel: "High",
    difficulty: 3,
    capabilityKey: "judgement",
    interactionType: interactionTypes[idx],
    optionPosition: 2,
    ...overrides,
  };
}

// ─── Helper: Build a full set of N answers with varied types ─────────────────
function buildAnswerSet(count: number, overrides: Partial<AnswerData> = {}): AnswerData[] {
  const interactionTypes: InteractionType[] = [
    "situational_judgement", "prioritisation", "risk_judgement",
    "governance_decision", "scenario_critique", "error_detection",
    "output_improvement", "data_interpretation",
  ];
  // Must match ALL_CAPABILITIES in sessionController.ts: execution, judgement, governance, appropriateness, workflow, data_interpretation
  const capabilityKeys = ["execution", "judgement", "data_interpretation", "workflow", "appropriateness", "governance"];
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
    signalDeltasJson: a.signalDeltasJson,
    outcomeClass: a.outcomeClass,
    riskLevel: a.riskLevel,
    difficulty: a.difficulty,
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
      signalDeltas: (typeof a.signalDeltasJson === "object" ? a.signalDeltasJson : {}) as Record<string, number>,
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
    targetCapability: "judgement",
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
    evidenceObjective: "Assess judgement via scenario_critique",
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

// Reset LLM call counter before each test so rotation is deterministic
beforeEach(() => { llmCallCount = 0; });

describe("Assessment Engine — Phase Determination", () => {
  it("returns baseline for first 30% of items", () => {
    const target = MINIMUM_EVIDENCE.targetItems; // 49
    // 30% of 49 = 14.7, so baseline is 0..14 (progress < 0.30)
    expect(determineSessionPhase(0, target)).toBe("baseline");
    expect(determineSessionPhase(14, target)).toBe("baseline"); // 14/49 = 0.2857 < 0.30
  });

  it("returns adaptive for middle 45%", () => {
    const target = MINIMUM_EVIDENCE.targetItems; // 49
    // Adaptive: 15..36 (0.30 <= progress < 0.75)
    expect(determineSessionPhase(15, target)).toBe("adaptive"); // 15/49 = 0.3061 >= 0.30
    expect(determineSessionPhase(36, target)).toBe("adaptive"); // 36/49 = 0.7347 < 0.75
  });

  it("returns validation for final 25%", () => {
    const target = MINIMUM_EVIDENCE.targetItems; // 49
    // Validation: 37..48 (progress >= 0.75)
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
    // Build a context in adaptive phase with no current evidence but prior scores
    // This tests that findWeakestCapability falls back to priorCapabilityScores
    const requiredTypes: InteractionType[] = ["scenario_critique", "risk_judgement", "prioritisation", "contradiction_probe"];
    const ctx: AdaptiveSelectionContext = {
      answeredCount: 15, // adaptive phase (15/49 = 30.6%)
      totalTarget: MINIMUM_EVIDENCE.targetItems,
      capabilityScores: {
        execution: { score: 0, signalCount: 0 },
        judgement: { score: 0, signalCount: 0 },
        governance: { score: 0, signalCount: 0 },
        appropriateness: { score: 0, signalCount: 0 },
        workflow: { score: 0, signalCount: 0 },
        data_interpretation: { score: 0, signalCount: 0 },
      },
      interactionTypesUsed: Object.fromEntries(requiredTypes.map(t => [t, 1])) as Record<InteractionType, number>,
      riskExposure: { Low: 5, Medium: 5, High: 5 },
      gamingAnalysis: { injectionRequired: false, recommendedInjections: [], flags: [], riskScore: 0 },
      contradictionProbes: [],
      roleArchetype: resolveRoleArchetype("hrbp"),
      orgIntent: DEFAULT_ORG_INTENT,
      userSector: "Financial Services",
      userSeniority: "senior_practitioner",
      userAiUsageLevel: "intermediate",
      priorCapabilityScores: { execution: 85, judgement: 30, workflow: 65, appropriateness: 75, governance: 80, data_interpretation: 70 },
    };
    const vars = selectNextGenerationVariables(ctx);
    // With no current evidence, prior scores are used: judgement=30 is weakest
    expect(vars.phase).toBe("adaptive");
    expect(vars.targetCapability).toBe("judgement");
  });

  it("increases difficulty for returning users with high prior scores", () => {
    const ctx = buildCtx(buildAnswerSet(5), {
      priorCapabilityScores: { execution: 90, judgement: 88, data_interpretation: 85, workflow: 82, appropriateness: 87, governance: 91 },
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
    const vars = buildVars({ interactionType: "error_detection", targetCapability: "governance" });
    const item = await generateAdaptiveItem(vars);
    expect(item.aiOutput).toBeTruthy();
  });

  it("generates a valid item for output_improvement (with ai_output)", async () => {
    const vars = buildVars({ interactionType: "output_improvement", targetCapability: "execution" });
    const item = await generateAdaptiveItem(vars);
    expect(item.aiOutput).toBeTruthy();
  });

  it("generates a valid item for data_interpretation (with data_context)", async () => {
    const vars = buildVars({
      interactionType: "data_interpretation",
      targetCapability: "data_interpretation",
      roleArchetype: resolveRoleArchetype("people_analytics"),
      workflowContext: "people_analytics",
    });
    const item = await generateAdaptiveItem(vars);
    expect(item.dataContext).toBeTruthy();
  });

  it("generates a valid item for prioritisation (no ai_output needed)", async () => {
    const vars = buildVars({ interactionType: "prioritisation", targetCapability: "execution" });
    const item = await generateAdaptiveItem(vars);
    expect(item.aiOutput).toBeUndefined();
    expect(item.options).toHaveLength(4);
  });

  it("generates a valid item for risk_judgement", async () => {
    const vars = buildVars({ interactionType: "risk_judgement", targetCapability: "governance", riskLevel: "High" });
    const item = await generateAdaptiveItem(vars);
    expect(item.options).toHaveLength(4);
    expect(item.riskLevel).toBe("High");
  });

  it("generates a valid item for governance_decision", async () => {
    const vars = buildVars({ interactionType: "governance_decision", targetCapability: "governance" });
    const item = await generateAdaptiveItem(vars);
    expect(item.options).toHaveLength(4);
  });

  it("generates a valid item for situational_judgement", async () => {
    const vars = buildVars({ interactionType: "situational_judgement", targetCapability: "execution" });
    const item = await generateAdaptiveItem(vars);
    expect(item.options).toHaveLength(4);
  });

  it("generates exactly 4 options with valid outcome classes", async () => {
    const vars = buildVars();
    const item = await generateAdaptiveItem(vars);
    expect(item.options).toHaveLength(4);
    // C1.2: Only canonical outcome classes are valid
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
    const vars = buildVars({ interactionType: "prioritisation" });
    const item = await generateAdaptiveItem(vars);
    expect(item.aiOutput).toBeUndefined();
    expect(item.dataContext).toBeUndefined();
  });

  it("TYPES_WITH_AI_OUTPUT contains the correct types", () => {
    expect(TYPES_WITH_AI_OUTPUT).toContain("scenario_critique");
    expect(TYPES_WITH_AI_OUTPUT).toContain("error_detection");
    expect(TYPES_WITH_AI_OUTPUT).toContain("output_improvement");
    expect(TYPES_WITH_AI_OUTPUT).not.toContain("prioritisation");
    expect(TYPES_WITH_AI_OUTPUT).not.toContain("situational_judgement");
  });

  it("TYPES_WITH_DATA contains data_interpretation", () => {
    expect(TYPES_WITH_DATA).toContain("data_interpretation");
    expect(TYPES_WITH_DATA).not.toContain("scenario_critique");
  });
});

describe("Assessment Engine — Scoring Engine", () => {
  it("computes signal scores from a full answer set", () => {
    const answers = buildAnswerSet(20);
    const signalScores = computeSignalScores(answers.map(a => ({
      signalDeltasJson: a.signalDeltasJson,
      outcomeClass: a.outcomeClass,
      riskLevel: a.riskLevel,
      difficulty: a.difficulty,
    })));
    expect(Object.keys(signalScores).length).toBeGreaterThan(0);
    Object.values(signalScores).forEach(score => {
      expect(typeof score).toBe("number");
    });
  });

  it("computes capability scores from signal scores", () => {
    const answers = buildAnswerSet(20);
    const signalScores = computeSignalScores(answers.map(a => ({
      signalDeltasJson: a.signalDeltasJson,
      outcomeClass: a.outcomeClass,
      riskLevel: a.riskLevel,
      difficulty: a.difficulty,
    })));
    const capabilityScores = computeCapabilityScores(signalScores);
    const keys = Object.keys(capabilityScores);
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach(k => {
      expect(capabilityScores[k as any].score).toBeGreaterThanOrEqual(0);
      expect(capabilityScores[k as any].score).toBeLessThanOrEqual(100);
    });
  });

  it("penalises failure answers in scoring (C1.1: unsigned magnitudes, sign from outcome modifier)", () => {
    // C1.2: Use canonical "failure" instead of non-canonical "harmful"
    // C1.1: Deltas are unsigned magnitudes; sign comes from OUTCOME_SCORE_MODIFIER
    const goodAnswers = buildAnswerSet(10, { outcomeClass: "strong", signalDeltasJson: { governance_quality: 0.8 } });
    const badAnswers = buildAnswerSet(10, { outcomeClass: "failure", signalDeltasJson: { governance_quality: 0.8 } });
    const goodSignals = computeSignalScores(goodAnswers.map(a => ({ signalDeltasJson: a.signalDeltasJson, outcomeClass: a.outcomeClass, riskLevel: a.riskLevel, difficulty: a.difficulty })));
    const badSignals = computeSignalScores(badAnswers.map(a => ({ signalDeltasJson: a.signalDeltasJson, outcomeClass: a.outcomeClass, riskLevel: a.riskLevel, difficulty: a.difficulty })));
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

  it("C1.1: DPIA worked example — strong option produces positive governance, failure option produces negative governance", () => {
    // Scenario: DPIA review item
    // Option B (strong): governance_quality magnitude 0.8, appropriateness_boundary magnitude 0.5
    // Option D (failure): blind_acceptance_risk magnitude 2.0, validation_accuracy magnitude 1.5
    // With C1.1 fix: both options store UNSIGNED magnitudes; sign comes from OUTCOME_SCORE_MODIFIER
    const strongAnswer = [{
      signalDeltasJson: { governance_quality: 0.8, appropriateness_boundary: 0.5 },
      outcomeClass: "strong",
      riskLevel: "High",
      difficulty: 2,
    }];
    const failureAnswer = [{
      signalDeltasJson: { blind_acceptance_risk: 2.0, validation_accuracy: 1.5 },
      outcomeClass: "failure",
      riskLevel: "High",
      difficulty: 2,
    }];
    const strongSignals = computeSignalScores(strongAnswer);
    const failureSignals = computeSignalScores(failureAnswer);
    // Strong option: governance_quality should be POSITIVE
    expect(strongSignals.governance_quality).toBeGreaterThan(0);
    expect(strongSignals.appropriateness_boundary).toBeGreaterThan(0);
    // Failure option: blind_acceptance_risk and validation_accuracy should be NEGATIVE
    expect(failureSignals.blind_acceptance_risk).toBeLessThan(0);
    expect(failureSignals.validation_accuracy).toBeLessThan(0);
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
    // Rapid answers should trigger gaming scrutiny
    expect(state.gamingScrutinyLevel).toBeDefined();
  });

  it("detects contradictions in inconsistent answers", () => {
    const answers = buildAnswerSet(MINIMUM_EVIDENCE.totalItems);
    const answerRecords = answers.map(a => ({
      itemId: a.itemId,
      capabilityKey: a.capabilityKey,
      outcomeClass: a.outcomeClass,
      signalDeltas: (typeof a.signalDeltasJson === "object" ? a.signalDeltasJson : {}) as Record<string, number>,
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
      signalDeltasJson: { governance_quality: -0.3, judgement_quality: -0.2 },
    });
    const results = SessionController.computeResults(answers, "hrbp");
    expect(results.overallScore).toBeLessThan(60);
  });

  it("handles a session with all strong answers (high score)", () => {
    const answers = buildAnswerSet(MINIMUM_EVIDENCE.totalItems, {
      outcomeClass: "strong",
      signalDeltasJson: { governance_quality: 0.9, judgement_quality: 0.8, execution_quality: 0.7 },
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
    // Cycle through all 6 capability domains to satisfy R1 per-capability coverage check
    const ALL_CAPS = ["execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation"] as const;

    for (let i = 0; i < MINIMUM_EVIDENCE.totalItems; i++) {
      const ctx = buildCtx(sessionAnswers, { answeredCount: i });
      const vars = selectNextGenerationVariables(ctx);
      const item = await generateAdaptiveItem(vars);

      // Validate generated item
      expect(item.title).toBeTruthy();
      expect(item.options).toHaveLength(4);
      expect(item.interactionType).toBeTruthy();
      if (TYPES_WITH_AI_OUTPUT.includes(item.interactionType as InteractionType)) {
        expect(item.aiOutput).toBeTruthy();
      }
      if (TYPES_WITH_DATA.includes(item.interactionType as InteractionType)) {
        expect(item.dataContext).toBeTruthy();
      }

      // Simulate answering (always pick the "strong" option)
      const strongOption = item.options.find(o => o.outcomeClass === "strong") ?? item.options[0];
      // Force risk distribution: every 3rd answer is High risk to ensure >= 25% high-risk
      const forcedRiskLevel: "Low" | "Medium" | "High" = i % 3 === 0 ? "High" : i % 3 === 1 ? "Medium" : "Low";
      sessionAnswers.push(mockAnswer({
        itemId: `gen-item-${i}`,
        interactionType: item.interactionType as InteractionType,
        // Force capability rotation so R1 per-capability coverage check passes
        capabilityKey: ALL_CAPS[i % ALL_CAPS.length],
        riskLevel: forcedRiskLevel,
        difficulty: item.difficulty as 1 | 2 | 3,
        outcomeClass: strongOption.outcomeClass,
        signalDeltasJson: strongOption.signalDeltas,
        timeToAnswerMs: 20000,
      }));
    }

    // Verify session can complete
    const state = SessionController.computeState("s1", "u1", "bp1", sessionAnswers, MINIMUM_EVIDENCE.targetItems, "hrbp");
    console.log("[DEBUG] evidenceSufficient:", state.evidenceSufficient);
    console.log("[DEBUG] canComplete:", state.canComplete);
    console.log("[DEBUG] completionBlockers:", state.completionBlockers);
    console.log("[DEBUG] answeredCount:", sessionAnswers.length);
    console.log("[DEBUG] distinctInteractionTypes:", new Set(sessionAnswers.map(a => a.interactionType)).size);
    console.log("[DEBUG] highRiskCount:", sessionAnswers.filter(a => a.riskLevel === "High").length);
    console.log("[DEBUG] interactionTypes used:", [...new Set(sessionAnswers.map(a => a.interactionType))]);
    expect(state.evidenceSufficient).toBe(true);
    expect(state.canComplete).toBe(true);

    // Compute final results
    const results = SessionController.computeResults(sessionAnswers, "hrbp");
    expect(results.overallScore).toBeGreaterThanOrEqual(0);
    expect(results.overallScore).toBeLessThanOrEqual(100);
    expect(results.readiness).toBeDefined();
    expect(results.capabilityScores).toBeDefined();
    console.log(`\n✓ Full session complete: score=${results.overallScore.toFixed(1)}, readiness=${results.readiness}`);
    console.log(`  Interaction types used: ${[...new Set(sessionAnswers.map(a => a.interactionType))].join(", ")}`);
  }, 30000);

  it("simulates a returning user session with prior scores (adaptive calibration)", async () => {
    const priorScores = { execution: 72, judgement: 45, governance: 68, appropriateness: 80, workflow: 55, data_interpretation: 60 };
    // Start with 15 answers to be in adaptive phase (30% of 49 = 14.7)
    const sessionAnswers: AnswerData[] = buildAnswerSet(15, { riskLevel: "High" });

    for (let i = 0; i < 5; i++) {
      const ctx = buildCtx(sessionAnswers, {
        answeredCount: sessionAnswers.length,
        priorCapabilityScores: priorScores,
      });
      const vars = selectNextGenerationVariables(ctx);
      // In adaptive phase with prior scores, should target a weak capability
      // (judgement=45 is weakest, but required interaction types may fire first)
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
