/**
 * AIQ Adaptive Assessment Engine — Generation Engine (v2)
 *
 * Fully LLM-driven. Every question is generated in real-time based on:
 * - User's role archetype, seniority, sector, and AI usage level
 * - Current capability gap profile (from prior answers or prior sessions)
 * - Interaction type rotation to ensure mixed-method coverage
 * - Anti-gaming injections and contradiction probes
 *
 * Key changes from v1:
 * - LLM is ALWAYS primary — static items are never served
 * - Rich per-type prompts produce genuinely different question experiences
 * - scenario_critique / output_improvement / error_detection generate an actual
 *   "ai_output" block (the text the user must evaluate)
 * - data_interpretation generates a "data_context" block
 * - User sector / seniority / AI usage level are injected into every prompt
 * - Prior session capability scores calibrate difficulty from question 1
 */

import { invokeLLM } from "../_core/llm";
import type { RoleArchetype, CapabilityKey } from "./roleArchetypes";
import type { GamingAnalysis, InjectionSpec } from "./antiGamingEngine";
import type { ContradictionProbeSpec } from "./contradictionEngine";

// ─── Interaction Types ────────────────────────────────────────────────────────

export type InteractionType =
  | "situational_judgement"
  | "scenario_critique"
  | "output_improvement"
  | "error_detection"
  | "prioritisation"
  | "risk_judgement"
  | "data_interpretation"
  | "governance_decision"
  | "multi_step_workflow"
  | "contradiction_probe"
  | "confidence_calibration";

export const INTERACTION_TYPE_DISPLAY: Record<InteractionType, string> = {
  situational_judgement:  "Situational Judgement",
  scenario_critique:      "AI Output Critique",
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

/** These types require an actual AI output block in the generated item */
export const TYPES_WITH_AI_OUTPUT: InteractionType[] = [
  "scenario_critique",
  "output_improvement",
  "error_detection",
];

/** These types require a data/table context block */
export const TYPES_WITH_DATA: InteractionType[] = [
  "data_interpretation",
];

export const REQUIRED_INTERACTION_TYPES: InteractionType[] = [
  "scenario_critique",
  "risk_judgement",
  "prioritisation",
  "contradiction_probe",
];

const CAPABILITY_INTERACTION_MAP: Record<CapabilityKey, InteractionType[]> = {
  execution:           ["situational_judgement", "output_improvement", "error_detection", "multi_step_workflow"],
  judgement:           ["situational_judgement", "risk_judgement", "scenario_critique", "contradiction_probe"],
  governance:          ["governance_decision", "risk_judgement", "scenario_critique", "contradiction_probe"],
  appropriateness:     ["situational_judgement", "risk_judgement", "governance_decision"],
  workflow:            ["multi_step_workflow", "prioritisation", "situational_judgement"],
  data_interpretation: ["data_interpretation", "error_detection", "scenario_critique"],
};

// ─── Session Phase ────────────────────────────────────────────────────────────

export type SessionPhase = "baseline" | "adaptive" | "validation";

export function determineSessionPhase(answeredCount: number, totalTarget: number): SessionPhase {
  const progress = answeredCount / totalTarget;
  if (progress < 0.30) return "baseline";
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
  // User context for personalisation
  userSector?: string | null;
  userSeniority?: string | null;
  userAiUsageLevel?: string | null;
  // Prior session capability scores for adaptive calibration
  priorCapabilityScores?: Record<string, number> | null;
}

// ─── Generated Item ───────────────────────────────────────────────────────────

export interface GeneratedItem {
  title: string;
  scenario: string;
  constraint: string;
  question: string;
  /** For scenario_critique / output_improvement / error_detection */
  aiOutput?: string;
  /** For data_interpretation */
  dataContext?: string;
  interactionType: InteractionType;
  capability: string;
  capabilityKey: CapabilityKey;
  workflow: string;
  riskLevel: "Low" | "Medium" | "High";
  difficulty: 1 | 2 | 3;
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

// ─── Adaptive Selection Context ───────────────────────────────────────────────

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
  userSector?: string | null;
  userSeniority?: string | null;
  userAiUsageLevel?: string | null;
  priorCapabilityScores?: Record<string, number> | null;
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

// ─── Select Next Generation Variables ────────────────────────────────────────

export function selectNextGenerationVariables(ctx: AdaptiveSelectionContext): GenerationVariables {
  const phase = determineSessionPhase(ctx.answeredCount, ctx.totalTarget);

  // Priority 1: Contradiction probe
  if (ctx.contradictionProbes.length > 0 && phase !== "baseline") {
    const probe = ctx.contradictionProbes[0];
    return buildVariables(
      probe.targetCapability as CapabilityKey,
      "contradiction_probe",
      ctx,
      phase,
      { difficulty: 3, riskLevel: "High", contradictionIntent: true }
    );
  }

  // Priority 2: Anti-gaming injection
  if (ctx.gamingAnalysis.injectionRequired && ctx.gamingAnalysis.recommendedInjections.length > 0) {
    const injection = ctx.gamingAnalysis.recommendedInjections[0];
    return buildVariablesFromInjection(injection, ctx.roleArchetype, phase, ctx);
  }

  // Priority 3: Ensure required interaction types are covered
  const missingRequired = REQUIRED_INTERACTION_TYPES.filter(t => !(ctx.interactionTypesUsed[t] ?? 0));
  if (missingRequired.length > 0 && phase !== "baseline") {
    const requiredType = missingRequired[0];
    const cap = getCapabilityForInteractionType(requiredType);
    return buildVariables(cap, requiredType, ctx, phase);
  }

  // Priority 4: Adaptive — target weakest capability
  if (phase === "adaptive") {
    const weakest = findWeakestCapability(ctx.capabilityScores, ctx.roleArchetype);
    const preferredTypes = CAPABILITY_INTERACTION_MAP[weakest] ?? ["situational_judgement"];
    const leastUsed = findLeastUsedType(preferredTypes, ctx.interactionTypesUsed);
    return buildVariables(weakest, leastUsed, ctx, phase, { difficulty: 2, ambiguity: "medium" });
  }

  // Priority 5: Validation — confirm/challenge strongest capability
  if (phase === "validation") {
    const strongest = findStrongestCapability(ctx.capabilityScores, ctx.roleArchetype);
    return buildVariables(strongest, "contradiction_probe", ctx, phase, {
      difficulty: 3,
      riskLevel: "High",
      contradictionIntent: true,
    });
  }

  // Default: Baseline — broad sampling
  const targetCap = selectBaselineCapability(ctx);
  const interactionType = selectBaselineInteractionType(ctx.interactionTypesUsed);
  return buildVariables(targetCap, interactionType, ctx, phase);
}

// ─── LLM Item Generation ──────────────────────────────────────────────────────

const INTERACTION_TYPE_INSTRUCTIONS: Record<InteractionType, string> = {
  situational_judgement: `Present a realistic HR workplace scenario where the person must decide what to do with an AI output or AI-assisted task. The scenario should require genuine judgement about whether and how to use the AI output. Include specific details about what the AI produced and why it matters in this HR context.`,

  scenario_critique: `Present an AI-generated output and ask the person to identify the most significant problem with it. You MUST generate the actual AI output text in the "ai_output" field — write 3-6 sentences of realistic AI-generated content (an email draft, recommendation, analysis, or document excerpt) that contains a specific, non-obvious flaw. The flaw should be something a competent HR professional would catch but a less experienced person might miss.`,

  output_improvement: `Present an AI-generated draft that has a specific problem and ask which improvement action is most appropriate. You MUST generate the actual AI draft in the "ai_output" field — write 3-5 sentences of realistic AI-generated text. The problem should be clear to someone with good HR judgement (wrong tone, missing critical information, inappropriate framing, compliance gap, factual error).`,

  error_detection: `Present an AI-generated piece of work containing a specific, concrete error and ask the person to identify it. You MUST generate the actual AI output in the "ai_output" field — write 3-5 sentences where one specific element is clearly wrong (wrong statistic, hallucinated policy reference, biased language, compliance violation, incorrect legal claim). The error should be subtle enough to require careful reading.`,

  prioritisation: `Present a scenario with multiple competing tasks, decisions, or actions and ask the person to identify the right priority under the given constraint. The constraint must create genuine tension — there should be a reason why the "obvious" priority might not be correct. The scenario should involve AI-generated outputs or AI-assisted work.`,

  risk_judgement: `Present a scenario involving AI use in a sensitive HR context and ask the person to assess the risk level and appropriate response. The scenario must have genuine governance, legal, or ethical implications. The risk should not be immediately obvious — it requires professional judgement to identify. Include specific details about the AI tool, the HR context, and what is at stake.`,

  data_interpretation: `Present AI-generated data, statistics, or analysis and ask the person to interpret it correctly. You MUST generate the data summary in the "data_context" field — write a realistic data summary (3-5 sentences with specific numbers, percentages, or findings) that contains at least one misleading element, limitation, or correlation-causation trap that a competent professional should identify.`,

  governance_decision: `Present a scenario where the person must make a decision about whether AI use is appropriate, what governance steps are required, or how to handle a compliance or ethical concern. The scenario should involve a real tension between efficiency and proper governance. Include specific details about the AI tool, the data involved, and the potential consequences.`,

  multi_step_workflow: `Present a multi-step HR workflow where AI is being used at one or more stages and ask the person to identify the correct next step or the most important action to take. The workflow should be realistic and the correct next step should require understanding of both the HR process and appropriate AI use. Make the wrong options plausible to someone who doesn't understand AI limitations.`,

  contradiction_probe: `Present a scenario that directly tests the same capability area as a previous item but with completely different surface details, context, and framing. The person should not be able to recognise it as a repeat — it should feel like a new situation. This tests whether their earlier response was genuine or situational.`,

  confidence_calibration: `Present a scenario where the person must assess their own certainty about an AI output or decision, and choose the action that best reflects appropriate epistemic humility. The scenario should make it tempting to be either overconfident or excessively cautious. Include specific details about the AI output quality and the stakes involved.`,
};

export async function generateAdaptiveItem(vars: GenerationVariables): Promise<GeneratedItem> {
  const roleContext = `${vars.roleArchetype.displayName} (${vars.roleArchetype.family})`;
  const workflowContext = vars.workflowContext.replace(/_/g, " ");
  const needsAiOutput = TYPES_WITH_AI_OUTPUT.includes(vars.interactionType);
  const needsDataContext = TYPES_WITH_DATA.includes(vars.interactionType);

  const sectorLine = vars.userSector ? `Sector: ${vars.userSector}.` : "";
  const seniorityLine = vars.userSeniority ? `Seniority: ${vars.userSeniority}.` : "";
  const aiUsageLine = vars.userAiUsageLevel ? `AI usage level: ${vars.userAiUsageLevel}.` : "";

  let priorPerformanceLine = "";
  if (vars.priorCapabilityScores && Object.keys(vars.priorCapabilityScores).length > 0) {
    const scores = Object.entries(vars.priorCapabilityScores)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${Math.round(v)}`)
      .join(", ");
    priorPerformanceLine = `Prior capability scores (from previous assessment): ${scores}. Calibrate difficulty accordingly — if the score is high, make this harder and more nuanced; if low, make it more diagnostic and revealing.`;
  }

  const systemPrompt = `You are a world-class assessment designer for HR professionals, with expertise equivalent to a CIPD fellowship and a leading university AI department. You design enterprise-grade behavioural assessments that measure how HR professionals actually work with AI — not what they know about AI theory.

Your assessments are:
- Behavioural: measuring real decisions under realistic conditions, not theoretical knowledge
- Role-specific: every scenario is grounded in the person's actual job context and sector
- Deterministic: every option maps to specific signal deltas for psychometric scoring
- Hard to game: no obviously "correct" answer — the weak/failure options are plausible to someone with limited AI literacy
- Written in plain, professional English appropriate for HR professionals

You must return a single JSON object. Do not include any markdown fences, explanation, or text outside the JSON.

JSON schema:
{
  "title": "Short descriptive title (5-8 words)",
  "scenario": "2-4 sentences. Specific, realistic HR workplace situation. Include what the AI produced, the business context, and what is at stake. Name the AI tool type (e.g. 'The AI recruitment screening tool', 'Your AI writing assistant', 'The workforce analytics platform').",
  "constraint": "One sentence. A time pressure, resource limit, or complicating factor that makes this harder.",
  "question": "The specific decision question. Must reflect the interaction type — NOT just 'What do you do?'. Examples: 'What is the most significant problem with this output?', 'What should you do first?', 'What is the appropriate governance response?'",${needsAiOutput ? `
  "ai_output": "The actual AI-generated text the person must evaluate. 3-6 sentences of realistic AI output (email draft, recommendation, analysis excerpt, policy summary, etc.) containing the specific flaw, error, or improvement opportunity. Write it as if it came directly from an AI tool — do not describe it, write the actual text.",` : ""}${needsDataContext ? `
  "data_context": "The AI-generated data summary or analysis. 3-5 sentences with specific numbers, percentages, or findings. Include at least one misleading element, limitation, or correlation-causation trap.",` : ""}
  "options": [
    {
      "label": "A",
      "text": "Full option text (1-2 sentences, specific and actionable — not vague phrases like 'review carefully')",
      "outcomeClass": "strong|acceptable|weak|failure|critical_failure",
      "signalDeltas": { "signal_name": delta_value },
      "eventCodes": ["CODE"],
      "rationale": "Why this outcome class — what does this choice reveal about the person's AI capability?"
    }
  ]
}

Rules for options:
- Exactly 4 options (A, B, C, D)
- Exactly one "strong" option
- Exactly one "failure" or "critical_failure" option
- Two options that are "acceptable" or "weak"
- Options must NOT be obviously ranked — the weak/failure options should be plausible to someone with limited AI literacy
- Each option must have at least 2 signal deltas
- Signal delta range: -3.0 to +3.0 (positive = capability demonstrated, negative = risk/weakness)
- Available signals: execution_quality, judgement_quality, validation_accuracy, governance_quality, appropriateness_boundary, workflow_application_quality, data_interpretation_quality, timing_integrity, over_reliance_risk, over_caution_risk, avoidance_risk, blind_acceptance_risk, governance_bypass_risk, unsafe_hr_decision_risk, hallucination_acceptance_risk, cosmetic_focus_risk, consistency_index, calibration_index, contradiction_index`;

  const userPrompt = `Generate a "${vars.interactionType.replace(/_/g, " ")}" assessment item.

Person profile:
- Role: ${roleContext}
${sectorLine ? `- ${sectorLine}` : ""}${seniorityLine ? `\n- ${seniorityLine}` : ""}${aiUsageLine ? `\n- ${aiUsageLine}` : ""}
${priorPerformanceLine ? `\n${priorPerformanceLine}\n` : ""}
Item parameters:
- Workflow context: ${workflowContext}
- Target capability: ${vars.targetCapability.replace(/_/g, " ")}
- Difficulty: Level ${vars.difficulty} (${vars.difficulty === 1 ? "straightforward — clear right answer for a competent professional" : vars.difficulty === 2 ? "requires careful judgement — two options are genuinely plausible" : "complex and high-stakes — even experienced professionals may disagree"})
- Risk level: ${vars.riskLevel}
- AI output quality: ${vars.aiOutputQuality} (${vars.aiOutputQuality === "flawed" ? "contains a specific, identifiable problem" : vars.aiOutputQuality === "misleading" ? "appears correct but leads to a wrong conclusion" : vars.aiOutputQuality === "hallucinated" ? "contains fabricated facts or references" : "good quality but used in an inappropriate context"})
${vars.aiFailureMode ? `- AI failure mode: ${vars.aiFailureMode.replace(/_/g, " ")}` : ""}
- Time pressure: ${vars.timePressure ? "Yes — include urgency in the constraint" : "No"}
- Business consequence: ${vars.businessConsequence}
- Governance sensitivity: ${vars.governanceSensitivity}
- Phase: ${vars.phase} (${vars.phase === "baseline" ? "broad calibration — assess general AI literacy across capabilities" : vars.phase === "adaptive" ? "deep probe of identified weakness — push on the specific gap" : "validation — confirm or challenge earlier responses with higher difficulty"})
${vars.contradictionIntent ? "\nIMPORTANT: This is a contradiction probe. The scenario must test the same capability as a previous item but with completely different surface details, context, sector, and framing. It must not feel like a repeat." : ""}

Interaction type instruction:
${INTERACTION_TYPE_INSTRUCTIONS[vars.interactionType]}

Return ONLY valid JSON. No markdown fences, no explanation, no text outside the JSON object.`;

  // Build JSON schema dynamically based on required fields
  const schemaProperties: Record<string, unknown> = {
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
  };
  const schemaRequired = ["title", "scenario", "constraint", "question", "options"];

  if (needsAiOutput) {
    schemaProperties["ai_output"] = { type: "string" };
    schemaRequired.push("ai_output");
  }
  if (needsDataContext) {
    schemaProperties["data_context"] = { type: "string" };
    schemaRequired.push("data_context");
  }

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
            properties: schemaProperties,
            required: schemaRequired,
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
      question: parsed.question ?? "What is the most appropriate action?",
      aiOutput: parsed.ai_output ?? undefined,
      dataContext: parsed.data_context ?? undefined,
      interactionType: vars.interactionType,
      capability: vars.targetCapability,
      capabilityKey: vars.targetCapability,
      workflow: vars.workflowContext,
      riskLevel: vars.riskLevel as "Low" | "Medium" | "High",
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
    console.error("[adaptiveEngine] LLM generation failed:", err);
    return generateFallbackItem(vars);
  }
}

// ─── Fallback Item ────────────────────────────────────────────────────────────

function generateFallbackItem(vars: GenerationVariables): GeneratedItem {
  return {
    title: "AI Output Review",
    scenario: `You are working as a ${vars.roleArchetype.displayName}. An AI tool has generated an output for a ${vars.workflowContext.replace(/_/g, " ")} task. The output looks mostly correct but you notice some elements that require attention before you can use it.`,
    constraint: "You need to make a decision within the next few minutes.",
    question: "What is the most appropriate action?",
    interactionType: vars.interactionType,
    capability: vars.targetCapability,
    capabilityKey: vars.targetCapability,
    workflow: vars.workflowContext,
    riskLevel: vars.riskLevel,
    difficulty: vars.difficulty,
    options: [
      { label: "A", text: "Review the output carefully, identify any issues, correct them, and then use it.", outcomeClass: "strong", signalDeltas: { execution_quality: 1.5, validation_accuracy: 1.5, judgement_quality: 1.0 }, eventCodes: ["VALIDATE_BEFORE_USE"], rationale: "Demonstrates appropriate validation and proportionate use of AI output." },
      { label: "B", text: "Use the output as-is since it looks correct and you trust the AI tool.", outcomeClass: "failure", signalDeltas: { blind_acceptance_risk: -2.0, validation_accuracy: -1.5, over_reliance_risk: -1.5 }, eventCodes: ["BLIND_ACCEPT"], rationale: "Blind acceptance without validation — a critical AI literacy failure." },
      { label: "C", text: "Do not use the AI output at all and complete the task manually from scratch.", outcomeClass: "weak", signalDeltas: { over_caution_risk: -1.0, avoidance_risk: -1.0, workflow_application_quality: -0.5 }, eventCodes: ["AI_AVOIDANCE"], rationale: "Over-caution — avoids AI entirely when proportionate use would be appropriate." },
      { label: "D", text: "Escalate to your manager before doing anything with the output.", outcomeClass: "acceptable", signalDeltas: { governance_quality: 0.5, over_caution_risk: -0.5, timing_integrity: -0.5 }, eventCodes: ["UNNECESSARY_ESCALATION"], rationale: "Acceptable but overly cautious — escalation is not required for this level of decision." },
    ],
    metadata: vars,
  };
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function findWeakestCapability(
  scores: Record<CapabilityKey, { score: number; signalCount: number }>,
  role: RoleArchetype
): CapabilityKey {
  const caps = Object.entries(scores) as Array<[CapabilityKey, { score: number; signalCount: number }]>;
  if (caps.length === 0) return "execution";
  return caps.sort((a, b) =>
    (role.capabilityWeights[b[0]] ?? 0.17) * (100 - b[1].score) / 100 -
    (role.capabilityWeights[a[0]] ?? 0.17) * (100 - a[1].score) / 100
  )[0][0];
}

function findStrongestCapability(
  scores: Record<CapabilityKey, { score: number; signalCount: number }>,
  role: RoleArchetype
): CapabilityKey {
  const caps = Object.entries(scores) as Array<[CapabilityKey, { score: number; signalCount: number }]>;
  if (caps.length === 0) return "governance";
  return caps.sort((a, b) =>
    (role.capabilityWeights[b[0]] ?? 0.17) * b[1].score / 100 -
    (role.capabilityWeights[a[0]] ?? 0.17) * a[1].score / 100
  )[0][0];
}

function findLeastUsedType(
  types: InteractionType[],
  used: Record<InteractionType, number>
): InteractionType {
  return [...types].sort((a, b) => (used[a] ?? 0) - (used[b] ?? 0))[0] ?? types[0];
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
  const caps: CapabilityKey[] = ["execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation"];
  return caps.sort((a, b) =>
    (ctx.capabilityScores[a]?.signalCount ?? 0) - (ctx.capabilityScores[b]?.signalCount ?? 0)
  )[0];
}

function selectBaselineInteractionType(used: Record<InteractionType, number>): InteractionType {
  const baselineTypes: InteractionType[] = [
    "situational_judgement",
    "scenario_critique",
    "risk_judgement",
    "output_improvement",
    "prioritisation",
    "error_detection",
    "governance_decision",
    "data_interpretation",
  ];
  return [...baselineTypes].sort((a, b) => (used[a] ?? 0) - (used[b] ?? 0))[0];
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
  const baseDifficulty: 1 | 2 | 3 = phase === "baseline" ? 1 : phase === "adaptive" ? 2 : 3;
  const workflowContext = role.workflows[ctx.answeredCount % role.workflows.length] ?? "general_hr";
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
    userSector: ctx.userSector,
    userSeniority: ctx.userSeniority,
    userAiUsageLevel: ctx.userAiUsageLevel,
    priorCapabilityScores: ctx.priorCapabilityScores,
    ...overrides,
  };
}

function buildVariablesFromInjection(
  injection: InjectionSpec,
  role: RoleArchetype,
  phase: SessionPhase,
  ctx?: AdaptiveSelectionContext
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
    userSector: ctx?.userSector,
    userSeniority: ctx?.userSeniority,
    userAiUsageLevel: ctx?.userAiUsageLevel,
    priorCapabilityScores: ctx?.priorCapabilityScores,
  };
}
