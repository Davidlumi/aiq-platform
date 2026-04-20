/**
 * AIQ Adaptive Assessment Engine — Adaptive Generation Engine
 *
 * Dynamically generates assessment items using LLM with governed variables.
 * Ensures mixed-method coverage, scenario normalisation, and role-aware adaptation.
 * All generated items are deterministically scorable via the signal-delta system.
 */

import { invokeLLM } from "../_core/llm";
import type { RoleArchetype, CapabilityKey } from "./roleArchetypes";
import type { GamingAnalysis, InjectionSpec } from "./antiGamingEngine";
import type { ContradictionProbeSpec } from "./contradictionEngine";

// ─── Interaction Types ────────────────────────────────────────────────────────

export type InteractionType =
  | "situational_judgement"   // Classic SJT: scenario + 4 options
  | "scenario_critique"       // Identify what's wrong with an AI output
  | "output_improvement"      // Select the best improvement to an AI output
  | "error_detection"         // Spot errors in AI-generated content
  | "prioritisation"          // Rank or select the right priority
  | "risk_judgement"          // Assess risk level and appropriate response
  | "data_interpretation"     // Interpret AI-generated data/insight
  | "governance_decision"     // Make a governance or compliance decision
  | "multi_step_workflow"     // Multi-step decision in a workflow context
  | "contradiction_probe"     // Targeted probe to resolve inconsistency
  | "confidence_calibration"; // Assess own certainty vs evidence

export const INTERACTION_TYPE_DISPLAY: Record<InteractionType, string> = {
  situational_judgement:  "Situational Judgement",
  scenario_critique:      "Scenario Critique",
  output_improvement:     "Output Improvement",
  error_detection:        "Error Detection",
  prioritisation:         "Prioritisation",
  risk_judgement:         "Risk Judgement",
  data_interpretation:    "Data Interpretation",
  governance_decision:    "Governance Decision",
  multi_step_workflow:    "Multi-Step Workflow",
  contradiction_probe:    "Targeted Probe",
  confidence_calibration: "Confidence Calibration",
};

// Minimum required interaction types per session (spec requirement)
export const REQUIRED_INTERACTION_TYPES: InteractionType[] = [
  "scenario_critique",    // at least one critique or detection task
  "risk_judgement",       // at least one governance/risk-sensitive task
  "prioritisation",       // at least one workflow or prioritisation task
  "contradiction_probe",  // at least one contradiction probe
];

// Capability → preferred interaction types
const CAPABILITY_INTERACTION_MAP: Record<CapabilityKey, InteractionType[]> = {
  execution:          ["situational_judgement", "output_improvement", "error_detection", "multi_step_workflow"],
  judgement:          ["situational_judgement", "risk_judgement", "scenario_critique", "contradiction_probe"],
  governance:         ["governance_decision", "risk_judgement", "scenario_critique", "contradiction_probe"],
  appropriateness:    ["situational_judgement", "risk_judgement", "governance_decision"],
  workflow:           ["multi_step_workflow", "prioritisation", "situational_judgement"],
  data_interpretation:["data_interpretation", "error_detection", "scenario_critique"],
};

// ─── Session Phase ────────────────────────────────────────────────────────────

export type SessionPhase = "baseline" | "adaptive" | "validation";

export function determineSessionPhase(answeredCount: number, totalTarget: number): SessionPhase {
  const progress = answeredCount / totalTarget;
  if (progress < 0.35) return "baseline";
  if (progress < 0.75) return "adaptive";
  return "validation";
}

// ─── Generation Variables ─────────────────────────────────────────────────────

export interface GenerationVariables {
  roleArchetype: RoleArchetype;
  targetCapability: CapabilityKey;
  interactionType: InteractionType;
  difficulty: 1 | 2 | 3;
  riskLevel: "Low" | "Medium" | "High";
  ambiguity: "low" | "medium" | "high";
  workflowContext: string;
  aiOutputQuality: "good" | "flawed" | "misleading" | "hallucinated";
  aiFailureMode: string | null;
  governanceSensitivity: "low" | "medium" | "high" | "critical";
  timePressure: boolean;
  businessConsequence: "low" | "medium" | "high";
  evidenceObjective: string;
  contradictionIntent: boolean;
  phase: SessionPhase;
}

// ─── Adaptive Item Selection ──────────────────────────────────────────────────

export interface AdaptiveSelectionContext {
  answeredCount: number;
  totalTarget: number;
  capabilityScores: Record<CapabilityKey, { score: number; signalCount: number }>;
  interactionTypesUsed: Record<InteractionType, number>;
  riskExposure: Record<"Low" | "Medium" | "High", number>;
  gamingAnalysis: GamingAnalysis;
  contradictionProbes: ContradictionProbeSpec[];
  roleArchetype: RoleArchetype;
  orgIntent: OrgIntent;
}

export interface OrgIntent {
  targetCapabilityLevels: Partial<Record<CapabilityKey, number>>;
  minimumSafeThresholds: Partial<Record<CapabilityKey, number>>;
  aiAmbition: "conservative" | "moderate" | "ambitious";
  criticalWorkflows: string[];
  governanceSensitivity: "low" | "medium" | "high" | "critical";
}

export const DEFAULT_ORG_INTENT: OrgIntent = {
  targetCapabilityLevels: {},
  minimumSafeThresholds: {},
  aiAmbition: "moderate",
  criticalWorkflows: ["recruitment", "employee_relations", "performance_management"],
  governanceSensitivity: "high",
};

/**
 * Select the next generation variables based on the adaptive context.
 * This is the core adaptive intelligence of the engine.
 */
export function selectNextGenerationVariables(ctx: AdaptiveSelectionContext): GenerationVariables {
  const phase = determineSessionPhase(ctx.answeredCount, ctx.totalTarget);

  // ── Priority 1: Inject contradiction probe if required ───────────────────
  if (ctx.contradictionProbes.length > 0 && phase !== "baseline") {
    const probe = ctx.contradictionProbes[0];
    return {
      roleArchetype: ctx.roleArchetype,
      targetCapability: probe.targetCapability as CapabilityKey,
      interactionType: "contradiction_probe",
      difficulty: 3,
      riskLevel: "High",
      ambiguity: "high",
      workflowContext: ctx.roleArchetype.workflows[0] ?? "general_hr",
      aiOutputQuality: "misleading",
      aiFailureMode: "governance_bypass",
      governanceSensitivity: "critical",
      timePressure: true,
      businessConsequence: "high",
      evidenceObjective: `Resolve contradiction in ${probe.targetCapability}`,
      contradictionIntent: true,
      phase,
    };
  }

  // ── Priority 2: Anti-gaming injection ────────────────────────────────────
  if (ctx.gamingAnalysis.injectionRequired && ctx.gamingAnalysis.recommendedInjections.length > 0) {
    const injection = ctx.gamingAnalysis.recommendedInjections[0];
    return buildVariablesFromInjection(injection, ctx.roleArchetype, phase);
  }

  // ── Priority 3: Ensure required interaction types are covered ────────────
  const missingRequired = REQUIRED_INTERACTION_TYPES.filter(
    t => (ctx.interactionTypesUsed[t] ?? 0) === 0
  );
  if (missingRequired.length > 0 && phase !== "baseline") {
    const requiredType = missingRequired[0];
    const targetCap = getCapabilityForInteractionType(requiredType);
    return buildVariables(targetCap, requiredType, ctx, phase);
  }

  // ── Priority 4: Adaptive probing — target weakest capability ─────────────
  if (phase === "adaptive") {
    const weakest = findWeakestCapability(ctx.capabilityScores, ctx.roleArchetype);
    const preferredTypes = CAPABILITY_INTERACTION_MAP[weakest];
    const leastUsed = findLeastUsedType(preferredTypes, ctx.interactionTypesUsed);
    return buildVariables(weakest, leastUsed, ctx, phase, { difficulty: 3, riskLevel: "High" });
  }

  // ── Priority 5: Validation phase — confirm strongest capabilities ─────────
  if (phase === "validation") {
    const strongest = findStrongestCapability(ctx.capabilityScores, ctx.roleArchetype);
    return buildVariables(strongest, "contradiction_probe", ctx, phase, {
      difficulty: 3,
      riskLevel: "High",
      contradictionIntent: true,
    });
  }

  // ── Default: Baseline — broad sampling ───────────────────────────────────
  const targetCap = selectBaselineCapability(ctx);
  const interactionType = selectBaselineInteractionType(ctx.interactionTypesUsed);
  return buildVariables(targetCap, interactionType, ctx, phase);
}

// ─── LLM Scenario Generation ──────────────────────────────────────────────────

export interface GeneratedItem {
  title: string;
  scenario: string;
  constraint: string;
  question: string;
  interactionType: InteractionType;
  capability: string;
  capabilityKey: CapabilityKey;
  workflow: string;
  riskLevel: string;
  difficulty: number;
  options: GeneratedOption[];
  metadata: GenerationVariables;
}

export interface GeneratedOption {
  label: string;
  text: string;
  outcomeClass: "strong" | "acceptable" | "weak" | "failure" | "critical_failure";
  signalDeltas: Record<string, number>;
  eventCodes: string[];
  rationale: string;
}

const INTERACTION_PROMPTS: Record<InteractionType, string> = {
  situational_judgement: "Present a realistic work scenario where the person must decide what to do with an AI output or AI-assisted task. The scenario should require genuine judgement about whether and how to use the AI output.",
  scenario_critique: "Present an AI-generated output (document, recommendation, analysis) and ask the person to identify what is wrong with it or whether it is appropriate to use. The output should have a specific flaw that a competent HR professional should catch.",
  output_improvement: "Present an AI-generated output that has a specific problem (wrong tone, missing information, inappropriate language, factual error) and ask which improvement action is most appropriate.",
  error_detection: "Present an AI-generated piece of work containing a specific error (wrong data, hallucinated fact, biased language, compliance issue) and ask the person to identify it.",
  prioritisation: "Present a scenario with multiple competing tasks or decisions and ask the person to identify the right priority order or most important action.",
  risk_judgement: "Present a scenario involving AI use in a sensitive HR context and ask the person to assess the risk level and appropriate response. The scenario should have genuine governance or compliance implications.",
  data_interpretation: "Present AI-generated data, statistics, or analysis and ask the person to interpret it correctly. Include at least one misleading element or limitation that a competent professional should identify.",
  governance_decision: "Present a scenario where the person must make a decision about whether AI use is appropriate, what governance steps are required, or how to handle a compliance concern.",
  multi_step_workflow: "Present a multi-step HR workflow where AI is being used at one or more stages and ask the person to identify the correct next step or the most important action to take.",
  contradiction_probe: "Present a scenario that directly tests the capability area where the person has shown inconsistent behaviour. The scenario should be comparable to previous items but with different surface details.",
  confidence_calibration: "Present a scenario where the person must assess their own certainty about an AI output or decision, and choose the action that best reflects appropriate epistemic humility.",
};

/**
 * Generate a single assessment item using LLM with governed variables.
 */
export async function generateAdaptiveItem(vars: GenerationVariables): Promise<GeneratedItem> {
  const interactionPrompt = INTERACTION_PROMPTS[vars.interactionType];
  const roleContext = `${vars.roleArchetype.displayName} (${vars.roleArchetype.family})`;
  const workflowContext = vars.workflowContext.replace(/_/g, " ");

  const systemPrompt = `You are an expert assessment designer for HR professionals, with expertise equivalent to a world-leading university AI department and CIPD fellowship. You design enterprise-grade behavioural assessments that measure how HR professionals actually work with AI.

Your assessments are:
- Behavioural (measuring real decisions, not theoretical knowledge)
- Deterministic (every option maps to specific signal deltas)
- Risk-aware (high-risk mistakes have greater consequences)
- Hard to game (no obvious "best practice" answer)
- Written in plain English for HR professionals
- Grounded in realistic HR workplace scenarios

You must generate a single assessment item as a JSON object with exactly this structure:
{
  "title": "Short descriptive title (5-8 words)",
  "scenario": "2-4 sentence realistic scenario. Include specific details about the AI output, the HR context, and what has happened. Make it feel like a real workplace situation.",
  "constraint": "One sentence describing a time pressure, resource constraint, or complicating factor that makes this harder.",
  "question": "What do you do? (or a specific decision question)",
  "options": [
    {
      "label": "A",
      "text": "Full option text (1-2 sentences, specific and actionable)",
      "outcomeClass": "strong|acceptable|weak|failure|critical_failure",
      "signalDeltas": { "signal_name": delta_value },
      "eventCodes": ["CODE1"],
      "rationale": "Why this outcome class — what does this choice reveal about capability?"
    }
  ]
}

Signal delta values: positive = capability demonstrated, negative = risk/weakness. Typical range: -3.0 to +3.0.
Available signals: execution_quality, judgement_quality, validation_accuracy, governance_quality, appropriateness_boundary, workflow_application_quality, data_interpretation_quality, timing_integrity, over_reliance_risk, over_caution_risk, avoidance_risk, blind_acceptance_risk, governance_bypass_risk, unsafe_hr_decision_risk, hallucination_acceptance_risk, cosmetic_focus_risk, consistency_index, calibration_index, contradiction_index.

Rules:
- Exactly 4 options (A, B, C, D)
- Exactly one "strong" option
- Exactly one "critical_failure" or "failure" option  
- Two options between (acceptable/weak)
- Options must not be obviously ranked — the weak/failure options should be plausible to someone with limited AI literacy
- Each option must have at least 2 signal deltas
- The scenario must be solvable without specialist knowledge — a competent HR professional should be able to reason through it`;

  const userPrompt = `Generate a ${vars.interactionType.replace(/_/g, " ")} assessment item for:

Role: ${roleContext}
Workflow context: ${workflowContext}
Target capability: ${vars.targetCapability.replace(/_/g, " ")}
Difficulty: Level ${vars.difficulty} (${vars.difficulty === 1 ? "straightforward" : vars.difficulty === 2 ? "requires careful judgement" : "complex, high-stakes"})
Risk level: ${vars.riskLevel}
AI output quality: ${vars.aiOutputQuality}
${vars.aiFailureMode ? `AI failure mode to feature: ${vars.aiFailureMode.replace(/_/g, " ")}` : ""}
Time pressure: ${vars.timePressure ? "Yes — include urgency in the constraint" : "No"}
Business consequence: ${vars.businessConsequence}
Governance sensitivity: ${vars.governanceSensitivity}
Phase: ${vars.phase} (${vars.phase === "baseline" ? "broad sampling" : vars.phase === "adaptive" ? "deep probing of weakness" : "validation and contradiction resolution"})
${vars.contradictionIntent ? "IMPORTANT: This is a contradiction probe. The scenario should test the same capability as a previous item but with different surface details to check consistency." : ""}

Assessment instruction: ${interactionPrompt}

Return ONLY valid JSON. No markdown, no explanation.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "assessment_item",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              scenario: { type: "string" },
              constraint: { type: "string" },
              question: { type: "string" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    text: { type: "string" },
                    outcomeClass: { type: "string" },
                    signalDeltas: { type: "object", additionalProperties: { type: "number" } },
                    eventCodes: { type: "array", items: { type: "string" } },
                    rationale: { type: "string" },
                  },
                  required: ["label", "text", "outcomeClass", "signalDeltas", "eventCodes", "rationale"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "scenario", "constraint", "question", "options"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content from LLM");

    const parsed = typeof content === "string" ? JSON.parse(content) : content;

    return {
      title: parsed.title ?? "Assessment Item",
      scenario: parsed.scenario ?? "",
      constraint: parsed.constraint ?? "",
      question: parsed.question ?? "What do you do?",
      interactionType: vars.interactionType,
      capability: vars.roleArchetype.capabilityWeights ? vars.targetCapability : vars.targetCapability,
      capabilityKey: vars.targetCapability,
      workflow: vars.workflowContext,
      riskLevel: vars.riskLevel,
      difficulty: vars.difficulty,
      options: (parsed.options ?? []).map((o: any) => ({
        label: o.label,
        text: o.text,
        outcomeClass: o.outcomeClass,
        signalDeltas: o.signalDeltas ?? {},
        eventCodes: o.eventCodes ?? [],
        rationale: o.rationale ?? "",
      })),
      metadata: vars,
    };
  } catch (err) {
    // Fallback: return a canonical item from the static bank
    return generateFallbackItem(vars);
  }
}

// ─── Fallback Item (when LLM fails) ──────────────────────────────────────────

function generateFallbackItem(vars: GenerationVariables): GeneratedItem {
  return {
    title: "AI Output Review",
    scenario: `You are working as a ${vars.roleArchetype.displayName}. An AI tool has generated an output for a ${vars.workflowContext.replace(/_/g, " ")} task. The output looks mostly correct but you notice some elements that require attention.`,
    constraint: "You need to make a decision within the next few minutes.",
    question: "What do you do?",
    interactionType: vars.interactionType,
    capability: vars.targetCapability,
    capabilityKey: vars.targetCapability,
    workflow: vars.workflowContext,
    riskLevel: vars.riskLevel,
    difficulty: vars.difficulty,
    options: [
      {
        label: "A",
        text: "Review the output carefully, identify any issues, correct them, and then use it.",
        outcomeClass: "strong",
        signalDeltas: { execution_quality: 1.5, validation_accuracy: 1.5, judgement_quality: 1.0 },
        eventCodes: ["VALIDATE_BEFORE_USE"],
        rationale: "Demonstrates appropriate validation and proportionate use of AI output.",
      },
      {
        label: "B",
        text: "Use the output as-is since it looks correct and you trust the AI tool.",
        outcomeClass: "failure",
        signalDeltas: { blind_acceptance_risk: -2.0, validation_accuracy: -1.5, over_reliance_risk: -1.5 },
        eventCodes: ["BLIND_ACCEPT"],
        rationale: "Blind acceptance without validation — a critical AI literacy failure.",
      },
      {
        label: "C",
        text: "Do not use the AI output at all and complete the task manually from scratch.",
        outcomeClass: "weak",
        signalDeltas: { over_caution_risk: -1.0, avoidance_risk: -1.0, workflow_application_quality: -0.5 },
        eventCodes: ["AI_AVOIDANCE"],
        rationale: "Over-caution — avoids AI entirely when proportionate use would be appropriate.",
      },
      {
        label: "D",
        text: "Escalate to your manager before doing anything with the output.",
        outcomeClass: "acceptable",
        signalDeltas: { governance_quality: 0.5, over_caution_risk: -0.5, timing_integrity: -0.5 },
        eventCodes: ["UNNECESSARY_ESCALATION"],
        rationale: "Acceptable but overly cautious — escalation is not required for this level of decision.",
      },
    ],
    metadata: vars,
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function findWeakestCapability(
  scores: Record<CapabilityKey, { score: number; signalCount: number }>,
  role: RoleArchetype
): CapabilityKey {
  const caps = Object.entries(scores) as Array<[CapabilityKey, { score: number; signalCount: number }]>;
  // Weight by role importance and current score (lower score = higher priority)
  const weighted = caps.map(([cap, s]) => ({
    cap,
    priority: (role.capabilityWeights[cap] ?? 0.17) * (100 - s.score) / 100,
  }));
  weighted.sort((a, b) => b.priority - a.priority);
  return weighted[0]?.cap ?? "execution";
}

function findStrongestCapability(
  scores: Record<CapabilityKey, { score: number; signalCount: number }>,
  role: RoleArchetype
): CapabilityKey {
  const caps = Object.entries(scores) as Array<[CapabilityKey, { score: number; signalCount: number }]>;
  const weighted = caps.map(([cap, s]) => ({
    cap,
    priority: (role.capabilityWeights[cap] ?? 0.17) * s.score / 100,
  }));
  weighted.sort((a, b) => b.priority - a.priority);
  return weighted[0]?.cap ?? "governance";
}

function findLeastUsedType(
  types: InteractionType[],
  used: Record<InteractionType, number>
): InteractionType {
  const sorted = [...types].sort((a, b) => (used[a] ?? 0) - (used[b] ?? 0));
  return sorted[0] ?? types[0];
}

function getCapabilityForInteractionType(type: InteractionType): CapabilityKey {
  const map: Record<InteractionType, CapabilityKey> = {
    situational_judgement:  "execution",
    scenario_critique:      "judgement",
    output_improvement:     "execution",
    error_detection:        "data_interpretation",
    prioritisation:         "workflow",
    risk_judgement:         "governance",
    data_interpretation:    "data_interpretation",
    governance_decision:    "governance",
    multi_step_workflow:    "workflow",
    contradiction_probe:    "judgement",
    confidence_calibration: "judgement",
  };
  return map[type] ?? "execution";
}

function selectBaselineCapability(ctx: AdaptiveSelectionContext): CapabilityKey {
  // In baseline, rotate through all capabilities to get broad coverage
  const caps: CapabilityKey[] = ["execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation"];
  const leastCovered = caps.sort((a, b) =>
    (ctx.capabilityScores[a]?.signalCount ?? 0) - (ctx.capabilityScores[b]?.signalCount ?? 0)
  );
  return leastCovered[0];
}

function selectBaselineInteractionType(used: Record<InteractionType, number>): InteractionType {
  const baselineTypes: InteractionType[] = [
    "situational_judgement",
    "scenario_critique",
    "risk_judgement",
    "output_improvement",
    "prioritisation",
  ];
  const sorted = [...baselineTypes].sort((a, b) => (used[a] ?? 0) - (used[b] ?? 0));
  return sorted[0];
}

function buildVariables(
  targetCapability: CapabilityKey,
  interactionType: InteractionType,
  ctx: AdaptiveSelectionContext,
  phase: SessionPhase,
  overrides: Partial<GenerationVariables> = {}
): GenerationVariables {
  const role = ctx.roleArchetype;
  const highRiskCount = ctx.riskExposure["High"] ?? 0;
  const totalAnswered = ctx.answeredCount;

  // Adaptive difficulty: escalate as session progresses
  const baseDifficulty: 1 | 2 | 3 = phase === "baseline" ? 1 : phase === "adaptive" ? 2 : 3;

  // Select workflow context relevant to role
  const workflowContext = role.workflows[ctx.answeredCount % role.workflows.length] ?? "general_hr";

  // Risk level: ensure sufficient high-risk exposure
  const riskLevel: "Low" | "Medium" | "High" =
    highRiskCount < totalAnswered * 0.25 ? "High" :
    highRiskCount > totalAnswered * 0.5 ? "Low" : "Medium";

  return {
    roleArchetype: role,
    targetCapability,
    interactionType,
    difficulty: baseDifficulty,
    riskLevel,
    ambiguity: phase === "baseline" ? "low" : phase === "adaptive" ? "medium" : "high",
    workflowContext,
    aiOutputQuality: phase === "baseline" ? "flawed" : "misleading",
    aiFailureMode: null,
    governanceSensitivity: role.governanceSensitivity,
    timePressure: phase !== "baseline",
    businessConsequence: riskLevel === "High" ? "high" : "medium",
    evidenceObjective: `Assess ${targetCapability.replace(/_/g, " ")} via ${interactionType.replace(/_/g, " ")}`,
    contradictionIntent: false,
    phase,
    ...overrides,
  };
}

function buildVariablesFromInjection(
  injection: InjectionSpec,
  role: RoleArchetype,
  phase: SessionPhase
): GenerationVariables {
  return {
    roleArchetype: role,
    targetCapability: injection.targetCapability as CapabilityKey,
    interactionType: injection.interactionType as InteractionType,
    difficulty: 3,
    riskLevel: injection.riskLevel,
    ambiguity: "high",
    workflowContext: role.workflows[0] ?? "general_hr",
    aiOutputQuality: injection.type === "trap" ? "misleading" : "flawed",
    aiFailureMode: injection.type === "trap" ? "governance_bypass" : null,
    governanceSensitivity: role.governanceSensitivity,
    timePressure: true,
    businessConsequence: "high",
    evidenceObjective: `Anti-gaming injection: ${injection.type} targeting ${injection.targetPattern}`,
    contradictionIntent: injection.type === "comparable_scenario",
    phase,
  };
}
