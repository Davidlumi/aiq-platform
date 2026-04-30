/**
 * AIQ Adaptive Assessment Engine — v10
 *
 * Fully LLM-driven. Every question is generated in real-time based on:
 * - User's role archetype, seniority, sector, and AI usage level
 * - Current capability gap profile (from prior answers or prior sessions)
 * - Foundation-first routing: AI Interaction + AI Output Evaluation get ≥3
 *   signal contributions BEFORE strategic domains are probed
 * - Interaction type rotation across 15 types for mixed-method coverage
 * - Anti-gaming injections and contradiction probes
 * - Pressure-test mechanic for Ethics domain (escalating constraints)
 *
 * v10 changes from v9.2:
 * - 15 interaction types (4 preserved + 11 new)
 * - Foundation-first routing (baseline must establish foundation domains)
 * - Pressure-test mechanic for AI Ethics & Trust
 * - 26 signals across 6 new capability domains
 * - Immersive scenario presentation context fields
 */

import { invokeLLM } from "../_core/llm";
import type { RoleArchetype, CapabilityKey } from "./roleArchetypes";
import type { GamingAnalysis, InjectionSpec } from "./antiGamingEngine";
import type { ContradictionProbeSpec } from "./contradictionEngine";
import { isValidationPhaseRandomised } from "./featureFlags";
import { ALL_DOMAINS, FOUNDATION_DOMAINS, STRATEGIC_DOMAINS, SIGNAL_TO_DOMAIN } from "./scoringEngine";

// ─── Interaction Types (v10: 15 types) ──────────────────────────────────────

export type InteractionType =
  // Preserved from v9.2
  | "scenario_critique"
  | "error_detection"
  | "risk_judgement"
  | "confidence_calibration"
  // New in v10
  | "prompt_diagnosis"
  | "prompt_construction"
  | "process_redesign"
  | "handoff_decision"
  | "capability_diagnosis"
  | "intervention_design"
  | "leader_advisory"
  | "ethical_pressure_test"
  | "stakeholder_impact"
  | "resistance_response"
  | "legitimate_concern"
  // Cross-cutting
  | "contradiction_probe";

export const INTERACTION_TYPE_DISPLAY: Record<InteractionType, string> = {
  scenario_critique:       "AI Output Critique",
  error_detection:         "Error Detection",
  risk_judgement:          "Risk Judgement",
  confidence_calibration:  "Confidence Calibration",
  prompt_diagnosis:        "Prompt Diagnosis",
  prompt_construction:     "Prompt Construction",
  process_redesign:        "Process Redesign",
  handoff_decision:        "Handoff Decision",
  capability_diagnosis:    "Capability Diagnosis",
  intervention_design:     "Intervention Design",
  leader_advisory:         "Leader Advisory",
  ethical_pressure_test:   "Ethical Pressure Test",
  stakeholder_impact:      "Stakeholder Impact",
  resistance_response:     "Resistance Response",
  legitimate_concern:      "Legitimate Concern",
  contradiction_probe:     "Targeted Probe",
};

/** Types that require an actual AI output block in the generated item */
export const TYPES_WITH_AI_OUTPUT: InteractionType[] = [
  "scenario_critique",
  "error_detection",
  "prompt_diagnosis",
];

/** Types that require a data/table context block */
export const TYPES_WITH_DATA: InteractionType[] = [
  "capability_diagnosis",
];

/** Types that require a prompt/conversation context block */
export const TYPES_WITH_PROMPT_CONTEXT: InteractionType[] = [
  "prompt_diagnosis",
  "prompt_construction",
];

/** Required interaction types that must appear at least once per session */
export const REQUIRED_INTERACTION_TYPES: InteractionType[] = [
  "scenario_critique",
  "risk_judgement",
  "prompt_diagnosis",
  "ethical_pressure_test",
  "contradiction_probe",
];

/** v10: Domain → preferred interaction types mapping */
const DOMAIN_INTERACTION_MAP: Record<CapabilityKey, InteractionType[]> = {
  ai_interaction:         ["prompt_diagnosis", "prompt_construction", "confidence_calibration"],
  ai_output_evaluation:   ["scenario_critique", "error_detection", "confidence_calibration"],
  ai_workflow_design:     ["process_redesign", "handoff_decision", "risk_judgement"],
  workforce_ai_readiness: ["capability_diagnosis", "intervention_design", "leader_advisory"],
  ai_ethics_trust:        ["ethical_pressure_test", "stakeholder_impact", "risk_judgement"],
  ai_change_leadership:   ["resistance_response", "legitimate_concern", "confidence_calibration"],
};

// Backward compat alias
export const CAPABILITY_INTERACTION_MAP = DOMAIN_INTERACTION_MAP;

// ─── Session Phase ────────────────────────────────────────────────────────────

export type SessionPhase = "baseline" | "adaptive" | "validation";

export function determineSessionPhase(answeredCount: number, totalTarget: number): SessionPhase {
  const progress = answeredCount / totalTarget;
  if (progress < 0.30) return "baseline";
  if (progress < 0.75) return "adaptive";
  return "validation";
}

// ─── Foundation-First Routing ────────────────────────────────────────────────

/** Minimum signal contributions per foundation domain before strategic domains unlock */
const FOUNDATION_MIN_SIGNALS = 3;

/**
 * Returns true if both foundation domains have at least FOUNDATION_MIN_SIGNALS
 * signal contributions, meaning strategic domains can now be probed.
 */
export function areFoundationsEstablished(
  capabilityScores: Record<CapabilityKey, { score: number; signalCount: number }>
): boolean {
  return (FOUNDATION_DOMAINS as readonly CapabilityKey[]).every(
    d => (capabilityScores[d]?.signalCount ?? 0) >= FOUNDATION_MIN_SIGNALS
  );
}

// ─── Pressure-Test Mechanic ──────────────────────────────────────────────────

export interface PressureTestState {
  /** How many ethical_pressure_test items have been served so far */
  pressureItemCount: number;
  /** The escalation level for the next pressure test (0=initial, 1=CEO demand, 2=legal sign-off, 3=competitor does it) */
  escalationLevel: number;
  /** Signal deltas from previous pressure test items (to compute drift) */
  priorPressureDeltas: Record<string, number>[];
}

const PRESSURE_ESCALATION_PROMPTS = [
  "The initial scenario presents a routine ethical question about AI use in HR.",
  "ESCALATION: The CEO has now personally demanded that this AI initiative proceed immediately, citing competitive pressure. The person must decide whether to hold their position or comply.",
  "ESCALATION: Legal has signed off on the initiative, but the person still has ethical concerns about employee impact. They must decide whether legal approval is sufficient or whether they should raise further objections.",
  "ESCALATION: A competitor has already deployed this exact AI approach and is publicly claiming positive results. The pressure to match them is intense. The person must decide whether competitive pressure changes their ethical assessment.",
];

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
  // Pressure-test escalation context
  pressureEscalationLevel?: number;
  pressureEscalationPrompt?: string;
  // User context for personalisation
  userSector?: string | null;
  userSeniority?: string | null;
  userAiUsageLevel?: string | null;
  priorCapabilityScores?: Record<string, number> | null;
  // Organisation context
  orgAiTools?: string[] | null;
  orgAiAmbition?: string | null;
  orgStrategicPriorities?: string[] | null;
  // Immersive presentation context
  scenarioFormat?: "email" | "slack" | "dashboard" | "document" | "meeting" | "hris" | null;
}

// ─── Generated Item ───────────────────────────────────────────────────────────

export interface GeneratedItem {
  title: string;
  scenario: string;
  /** Immersive artefact type for rich scenario rendering */
  artefactType?: "none" | "email_thread" | "cv_extract" | "policy_doc" | "meeting_notes" | "chat_log" | "data_table";
  constraint: string;
  question: string;
  /** For scenario_critique / error_detection / prompt_diagnosis */
  aiOutput?: string;
  /** For capability_diagnosis */
  dataContext?: string;
  /** For prompt_diagnosis / prompt_construction */
  promptContext?: string;
  interactionType: InteractionType;
  capability: string;
  capabilityKey: CapabilityKey;
  workflow: string;
  riskLevel: "Low" | "Medium" | "High";
  difficulty: 1 | 2 | 3;
  options: GeneratedOption[];
  metadata: GenerationVariables;
  /** Immersive presentation format hint */
  scenarioFormat?: string;
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
  // Pressure-test state
  pressureTestState?: PressureTestState;
  // Guards
  recentWorkflows?: string[];
  consecutiveStrongAnswers?: number;
  recentCapabilities?: CapabilityKey[];
  priorSeenStaticItemIds?: string[];
  personaStartingDifficulty?: 1 | 2 | 3;
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

// ─── Adaptive Guard Constants ────────────────────────────────────────────────

export const CAP_SATURATION_LIMIT = 8;
const MAX_CONSECUTIVE_SAME_CAPABILITY = 3;
const STREAK_ESCALATION_THRESHOLD = 3;
const WORKFLOW_HISTORY_WINDOW = 3;

// ─── Select Next Generation Variables ────────────────────────────────────────

export function selectNextGenerationVariables(ctx: AdaptiveSelectionContext): GenerationVariables {
  const phase = determineSessionPhase(ctx.answeredCount, ctx.totalTarget);
  const foundationsEstablished = areFoundationsEstablished(ctx.capabilityScores);

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

  // Priority 3: Pressure-test escalation (if ethics domain needs probing and we have pending escalation)
  if (phase === "adaptive" && ctx.pressureTestState && ctx.pressureTestState.escalationLevel > 0 && ctx.pressureTestState.escalationLevel <= 3) {
    const escalationPrompt = PRESSURE_ESCALATION_PROMPTS[ctx.pressureTestState.escalationLevel] ?? "";
    return buildVariables(
      "ai_ethics_trust",
      "ethical_pressure_test",
      ctx,
      phase,
      {
        difficulty: 3,
        riskLevel: "High",
        pressureEscalationLevel: ctx.pressureTestState.escalationLevel,
        pressureEscalationPrompt: escalationPrompt,
      }
    );
  }

  // Priority 4: Foundation-first routing — if foundations not established, only probe foundation domains
  if (!foundationsEstablished && phase === "baseline") {
    const foundationTarget = selectFoundationTarget(ctx);
    const preferredTypes = DOMAIN_INTERACTION_MAP[foundationTarget] ?? ["scenario_critique"];
    const leastUsed = findLeastUsedType(preferredTypes, ctx.interactionTypesUsed);
    return buildVariables(foundationTarget, leastUsed, ctx, phase);
  }

  // Priority 5: Ensure required interaction types are covered
  const missingRequired = REQUIRED_INTERACTION_TYPES.filter(t => !(ctx.interactionTypesUsed[t] ?? 0));
  if (missingRequired.length > 0 && phase !== "baseline") {
    const requiredType = missingRequired[0];
    const cap = getCapabilityForInteractionType(requiredType);
    return buildVariables(cap, requiredType, ctx, phase);
  }

  // Priority 6: Adaptive — target weakest non-saturated capability
  if (phase === "adaptive") {
    const saturatedCaps = new Set(
      Object.entries(ctx.capabilityScores)
        .filter(([, v]) => v.signalCount >= CAP_SATURATION_LIMIT)
        .map(([k]) => k as CapabilityKey)
    );
    const recentCaps = ctx.recentCapabilities ?? [];
    const lastCap = recentCaps[recentCaps.length - 1];
    const consecutiveSameCap = lastCap
      ? recentCaps.slice(-MAX_CONSECUTIVE_SAME_CAPABILITY).filter(c => c === lastCap).length
      : 0;
    const overProbedCap = consecutiveSameCap >= MAX_CONSECUTIVE_SAME_CAPABILITY ? lastCap : null;

    // Determine which domains are available (foundation-gated)
    const availableDomains = foundationsEstablished ? [...ALL_DOMAINS] : [...FOUNDATION_DOMAINS];

    const weakest = findWeakestCapability(
      ctx.capabilityScores,
      ctx.roleArchetype,
      ctx.priorCapabilityScores,
      saturatedCaps,
      overProbedCap ?? undefined,
      availableDomains
    );
    const preferredTypes = DOMAIN_INTERACTION_MAP[weakest] ?? ["scenario_critique"];
    const weakestScore = ctx.capabilityScores[weakest]?.score ?? 50;
    const gapWeight = Math.max(0, (75 - weakestScore) / 25);
    const leastUsed = findLeastUsedTypeWithGap(preferredTypes, ctx.interactionTypesUsed, gapWeight);
    const streak = ctx.consecutiveStrongAnswers ?? 0;
    const escalatedDifficulty: 1 | 2 | 3 = streak >= STREAK_ESCALATION_THRESHOLD ? 3 : 2;
    return buildVariables(weakest, leastUsed, ctx, phase, { difficulty: escalatedDifficulty, ambiguity: "medium" });
  }

  // Priority 7: Validation — confirm/challenge strongest capability
  if (phase === "validation") {
    const strongest = findStrongestCapability(ctx.capabilityScores, ctx.roleArchetype);
    let validationTypes: InteractionType[] = ["contradiction_probe", "risk_judgement", "ethical_pressure_test", "scenario_critique"];
    if (isValidationPhaseRandomised()) {
      const pool = [...validationTypes];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = (ctx.answeredCount + i) % (i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      validationTypes = pool;
    }
    const leastUsedValidationType = findLeastUsedType(validationTypes, ctx.interactionTypesUsed);
    return buildVariables(strongest, leastUsedValidationType, ctx, phase, {
      difficulty: 3,
      riskLevel: "High",
      contradictionIntent: leastUsedValidationType === "contradiction_probe",
    });
  }

  // Default: Baseline — broad sampling (foundation domains if not yet established)
  const targetCap = foundationsEstablished ? selectBaselineCapability(ctx) : selectFoundationTarget(ctx);
  const interactionType = selectBaselineInteractionType(ctx.interactionTypesUsed);
  return buildVariables(targetCap, interactionType, ctx, phase);
}

// ─── Foundation Target Selection ─────────────────────────────────────────────

function selectFoundationTarget(ctx: AdaptiveSelectionContext): CapabilityKey {
  // Pick the foundation domain with the fewest signals
  const foundationScores = FOUNDATION_DOMAINS.map(d => ({
    domain: d,
    signalCount: ctx.capabilityScores[d]?.signalCount ?? 0,
  }));
  foundationScores.sort((a, b) => a.signalCount - b.signalCount);
  return foundationScores[0].domain;
}

// ─── LLM Item Generation ──────────────────────────────────────────────────────

const INTERACTION_TYPE_INSTRUCTIONS: Record<InteractionType, string> = {
  // ── Foundation: AI Interaction ──────────────────────────────────────────────
  prompt_diagnosis: `Present a real AI interaction where a person has written a prompt and received a poor or mediocre result. Show both the prompt and the AI's response. Ask the person to identify what is wrong with the prompt and what would fix it. You MUST generate the actual prompt text and AI response in the "ai_output" field. The prompt problem should be specific (too vague, missing context, wrong framing, no constraints, no role specification) — not just "it could be better".`,

  prompt_construction: `Present a specific HR task that needs to be accomplished using an AI tool (e.g. drafting a policy, analysing data, creating a communication). Describe the task context, audience, and constraints. Ask the person to choose which prompt approach would produce the best result. The options should represent genuinely different prompting strategies — not just variations of the same approach. Test whether the person understands how to structure instructions for AI tools effectively.`,

  // ── Foundation: AI Output Evaluation ────────────────────────────────────────
  scenario_critique: `Present an AI-generated output and ask the person to identify the most significant problem with it. You MUST generate the actual AI output text in the "ai_output" field — write 3-6 sentences of realistic AI-generated content (an email draft, recommendation, analysis, or document excerpt) that contains a specific, non-obvious flaw. The flaw should be something a competent HR professional would catch but a less experienced person might miss.`,

  error_detection: `Present an AI-generated piece of work containing a specific, concrete error and ask the person to identify it. You MUST generate the actual AI output in the "ai_output" field — write 3-5 sentences where one specific element is clearly wrong (wrong statistic, hallucinated policy reference, biased language, compliance violation, incorrect legal claim). The error should be subtle enough to require careful reading.`,

  // ── Operational: AI Workflow Design ─────────────────────────────────────────
  process_redesign: `Present an existing HR workflow (3-5 steps) and ask the person to identify which steps would benefit most from AI integration and why. The workflow should be realistic and include steps where AI is clearly appropriate, steps where it is clearly inappropriate, and at least one step where the answer requires genuine judgement. Test whether the person can distinguish between tasks suited for AI and tasks requiring human ownership.`,

  handoff_decision: `Present a scenario where an AI tool has completed part of an HR workflow and the person must decide what happens next — specifically, whether the AI output goes directly to the next step, requires human review first, or needs to be redone. The scenario should involve a genuine tension between efficiency (letting the AI output flow through) and quality/safety (requiring human checkpoint). Test whether the person understands where human oversight is essential in AI-assisted workflows.`,

  // ── Strategic: Workforce AI Readiness ───────────────────────────────────────
  capability_diagnosis: `Present data about a team's or individual's AI capability (assessment scores, usage patterns, feedback, or observable behaviours) and ask the person to identify the most important development priority. You MUST generate the data summary in the "data_context" field — include specific scores, patterns, or observations. The data should contain at least one misleading signal (e.g. high tool usage but low output quality, or strong scores but narrow capability). Test whether the person can read AI readiness data accurately and prioritise development.`,

  intervention_design: `Present a specific AI capability gap (e.g. "this team struggles with evaluating AI outputs" or "this manager avoids using AI tools entirely") and ask the person to choose the most effective development intervention. The options should represent genuinely different approaches (coaching, training, practice environments, peer learning, etc.) — not just variations of the same approach. Test whether the person understands that different capability gaps require different interventions.`,

  leader_advisory: `Present a scenario where a senior leader has asked for advice about an AI-related people decision (e.g. "Should we mandate AI tool usage?", "How do we handle employees who refuse to use AI?", "What AI skills should we hire for?"). The leader's question should be reasonable but contain an implicit assumption that a good advisor would challenge. Test whether the person can provide nuanced, evidence-based advice rather than simply agreeing with the leader's framing.`,

  // ── Strategic: AI Ethics & Trust ───────────────────────────────────
  ethical_pressure_test: `Present a scenario involving an ethical tension in AI use within HR — for example, using AI monitoring for productivity, using AI to predict employee behaviour, or using AI in a way that affects employee privacy or autonomy. The scenario should present a genuine ethical dilemma where the "right" answer is not obvious and where there are legitimate business reasons to proceed. Test whether the person can hold an ethical position under pressure, or whether they drift toward compliance when the pressure increases.`,

  stakeholder_impact: `Present a proposed AI implementation in HR and ask the person to identify which stakeholders would be most affected and what the most significant impact would be. The scenario should involve multiple stakeholder groups (employees, managers, HR team, candidates, unions, regulators) with different and potentially conflicting interests. Test whether the person can see beyond the immediate business case to understand the broader human impact of AI decisions.`,

  // ── Strategic: AI Change Leadership ─────────────────────────────────────────
  resistance_response: `Present a scenario where employees or managers are resisting an AI initiative. The resistance should be described in specific terms (what they are saying, what they are doing, how it is affecting the initiative). Ask the person to choose the most effective response. Test whether the person can distinguish between resistance that signals a legitimate concern (which should be addressed) and resistance that reflects fear or misunderstanding (which requires a different approach). The wrong answers should include dismissing the resistance or forcing compliance.`,

  legitimate_concern: `Present a scenario where someone has raised a concern about an AI initiative. The concern should be expressed in emotional or imprecise language, but underneath it should be a legitimate point about risk, fairness, or impact. Ask the person to identify the legitimate concern underneath the surface objection. Test whether the person can listen past the emotional framing to find the valid point — or whether they dismiss the concern because of how it was expressed.`,

  // ── Cross-cutting ──────────────────────────────────────────────────────────
  risk_judgement: `Present a scenario involving AI use in a sensitive HR context and ask the person to assess the risk level and appropriate response. The scenario must have genuine governance, legal, or ethical implications. The risk should not be immediately obvious — it requires professional judgement to identify. Include specific details about the AI tool, the HR context, and what is at stake.`,

  confidence_calibration: `Present a scenario where the person must assess their own certainty about an AI output or decision, and choose the action that best reflects appropriate epistemic humility. The scenario should make it tempting to be either overconfident or excessively cautious. Include specific details about the AI output quality and the stakes involved.`,

  contradiction_probe: `Present a scenario that directly tests the same capability area as a previous item but with completely different surface details, context, and framing. The person should not be able to recognise it as a repeat — it should feel like a new situation. This tests whether their earlier response was genuine or situational.`,
};

// ─── Few-Shot Examples ──────────────────────────────────────────────────────
const FEW_SHOT_EXAMPLES: Partial<Record<InteractionType, string>> = {
  prompt_diagnosis: JSON.stringify({
    title: "Ineffective AI Prompt for Policy Drafting",
    scenario: "You are an HR Business Partner. A colleague asked an AI writing tool to help draft a flexible working policy. They shared their prompt and the AI's response with you, asking why the output was so generic and unhelpful.",
    constraint: "The policy draft is needed for the leadership meeting tomorrow.",
    question: "What is the most significant problem with this prompt?",
    ai_output: "Prompt: 'Write me a flexible working policy'\n\nAI Response: 'Flexible Working Policy\n1. Purpose: This policy outlines the company's approach to flexible working.\n2. Scope: This policy applies to all employees.\n3. Types of flexible working: Part-time, job share, compressed hours, remote working.\n4. Eligibility: All employees with 26 weeks service may request flexible working.\n5. Process: Submit a written request to your line manager...'",
    options: [
      { label: "A", text: "The prompt lacks context — it doesn't specify the organisation's size, sector, existing arrangements, workforce profile, or what problems the policy needs to solve. The AI has no basis for producing anything beyond a generic template.", outcomeClass: "strong", signalDeltas: { prompt_construction_quality: 2.0, prompt_iteration_quality: 1.5 }, eventCodes: ["CONTEXT_GAP_IDENTIFIED"], rationale: "Correctly identifies the root cause — the prompt provides no context for the AI to work with." },
      { label: "B", text: "The AI tool is not sophisticated enough for policy drafting — they should use a specialist legal AI tool instead.", outcomeClass: "failure", signalDeltas: { tool_fluency_index: -2.0, prompt_construction_quality: -1.5 }, eventCodes: ["TOOL_BLAME"], rationale: "Blames the tool rather than the prompt — a common AI literacy failure." },
      { label: "C", text: "The prompt should have asked for a 'comprehensive' or 'detailed' policy to get a better output.", outcomeClass: "weak", signalDeltas: { prompt_construction_quality: -0.5, prompt_iteration_quality: -1.0 }, eventCodes: ["ADJECTIVE_FIX"], rationale: "Adding adjectives does not address the fundamental context gap — a superficial fix." },
      { label: "D", text: "The colleague should iterate by asking the AI follow-up questions to refine the output.", outcomeClass: "acceptable", signalDeltas: { prompt_iteration_quality: 0.5, prompt_construction_quality: -0.5 }, eventCodes: ["ITERATION_WITHOUT_DIAGNOSIS"], rationale: "Iteration is useful but does not address the root cause — the initial prompt needs restructuring, not just follow-ups." }
    ]
  }),
  scenario_critique: JSON.stringify({
    title: "AI Redundancy Letter Contains Compliance Gap",
    scenario: "You are an Employee Relations Manager. You asked an AI writing assistant to draft a redundancy consultation letter. The letter looks professional and covers most required points.",
    constraint: "Legal review is unavailable today and letters must go out tomorrow.",
    question: "What is the most significant problem with this AI-generated letter?",
    ai_output: "Dear [Employee Name], Following a review of our business structure, we regret to inform you that your role of Senior Data Analyst has been identified as at risk of redundancy. We are entering a 30-day consultation period beginning 15 May 2025. During this time, we will explore all reasonable alternatives to redundancy, including redeployment opportunities. You are invited to a consultation meeting on 20 May 2025 at 10:00am. Please confirm your attendance. We value your contributions and will support you through this process. Yours sincerely, HR Department.",
    options: [
      { label: "A", text: "The letter does not inform the employee of their right to be accompanied at the consultation meeting, which is a statutory requirement under UK employment law.", outcomeClass: "strong", signalDeltas: { output_evaluation_quality: 2.5, error_detection_accuracy: 2.0 }, eventCodes: ["COMPLIANCE_GAP_IDENTIFIED"], rationale: "Correctly identifies the specific statutory omission." },
      { label: "B", text: "The tone is too formal and may cause unnecessary distress to the employee.", outcomeClass: "weak", signalDeltas: { fitness_for_purpose_judgement: -1.5, output_evaluation_quality: -1.0 }, eventCodes: ["COSMETIC_FOCUS"], rationale: "Focuses on tone rather than the substantive compliance gap." },
      { label: "C", text: "The letter does not specify the exact redundancy payment amount.", outcomeClass: "acceptable", signalDeltas: { output_evaluation_quality: 0.5, error_detection_accuracy: 0.5 }, eventCodes: ["MINOR_OMISSION"], rationale: "A valid but minor point — payment amounts are typically confirmed later." },
      { label: "D", text: "The consultation period of 30 days is too short for a senior role.", outcomeClass: "failure", signalDeltas: { hallucination_acceptance_risk: -2.0, error_detection_accuracy: -1.5 }, eventCodes: ["INCORRECT_LEGAL_CLAIM"], rationale: "Factually incorrect — 30 days is the minimum for fewer than 100 redundancies under UK law." }
    ]
  }),
  ethical_pressure_test: JSON.stringify({
    title: "AI Monitoring for Remote Worker Productivity",
    scenario: "Your organisation is considering deploying AI-powered productivity monitoring for remote workers. The tool tracks keystroke patterns, application usage, and meeting attendance to generate a 'productivity score'. The CHRO believes this will help identify disengaged employees early.",
    constraint: "The CHRO has budget approval and wants to pilot within 4 weeks.",
    question: "What is the most appropriate response to this proposal?",
    options: [
      { label: "A", text: "Raise concerns about employee trust, privacy, and the validity of keystroke monitoring as a proxy for productivity. Recommend a formal ethical review before any pilot, including employee consultation.", outcomeClass: "strong", signalDeltas: { ethics_under_pressure: 2.5, stakeholder_impact_awareness: 2.0, employee_transparency_advocacy: 1.5 }, eventCodes: ["ETHICAL_CHALLENGE"], rationale: "Holds ethical position and proposes a structured review process." },
      { label: "B", text: "Support the pilot — it is a limited test and the data will help make a more informed decision about full rollout.", outcomeClass: "failure", signalDeltas: { pressure_drift_risk: -2.5, ethics_under_pressure: -2.0 }, eventCodes: ["PRESSURE_COMPLIANCE"], rationale: "Drifts under authority pressure — a pilot with surveillance technology still requires ethical review." },
      { label: "C", text: "Suggest using the tool but only sharing aggregate data with managers, not individual scores.", outcomeClass: "weak", signalDeltas: { ethics_under_pressure: -0.5, stakeholder_impact_awareness: -1.0 }, eventCodes: ["PARTIAL_MITIGATION"], rationale: "Addresses one symptom but not the fundamental ethical concern about surveillance." },
      { label: "D", text: "Refuse to participate in the project and escalate to the board.", outcomeClass: "acceptable", signalDeltas: { ethics_under_pressure: 1.0, stakeholder_impact_awareness: 0.5 }, eventCodes: ["ESCALATION_WITHOUT_ENGAGEMENT"], rationale: "Holds ethical ground but escalates without attempting constructive engagement first." }
    ]
  }),
};

// ─── v10 Canonical Signal → Domain Map ──────────────────────────────────────

const CANONICAL_SIGNAL_TO_DOMAIN: Record<string, string> = Object.fromEntries(
  Object.entries(SIGNAL_TO_DOMAIN)
);

const ALL_CANONICAL_SIGNALS = Object.keys(SIGNAL_TO_DOMAIN);

const TRIVIALLY_OBVIOUS_FAILURE_PHRASES = [
  "ignore", "delete without", "never check", "always trust the ai",
  "blindly accept", "no review needed", "skip validation",
];

// ─── Main Generation Function ────────────────────────────────────────────────

export async function generateAdaptiveItem(vars: GenerationVariables): Promise<GeneratedItem> {
  const role = vars.roleArchetype;
  const roleContext = `${role.displayName} (${role.family} family, ${role.governanceSensitivity} governance sensitivity)`;
  const sectorLine = vars.userSector ? `Sector: ${vars.userSector}` : null;
  const seniorityLine = vars.userSeniority ? `Seniority: ${vars.userSeniority}` : null;
  const aiUsageLine = vars.userAiUsageLevel ? `AI usage level: ${vars.userAiUsageLevel}` : null;
  const orgAiToolsLine = vars.orgAiTools?.length ? `Organisation AI tools: ${vars.orgAiTools.join(", ")}` : null;
  const orgAmbitionLine = vars.orgAiAmbition ? `AI ambition: ${vars.orgAiAmbition}` : null;
  const orgPrioritiesLine = vars.orgStrategicPriorities?.length ? `Strategic priorities: ${vars.orgStrategicPriorities.join(", ")}` : null;

  const priorPerformanceLine = vars.priorCapabilityScores
    ? `Prior session performance: ${Object.entries(vars.priorCapabilityScores).map(([k, v]) => `${k.replace(/_/g, " ")}=${v}`).join(", ")}`
    : null;

  const needsAiOutput = TYPES_WITH_AI_OUTPUT.includes(vars.interactionType);
  const needsDataContext = TYPES_WITH_DATA.includes(vars.interactionType);
  const needsPromptContext = TYPES_WITH_PROMPT_CONTEXT.includes(vars.interactionType);

  // Immersive scenario format selection
  const scenarioFormats = ["email", "slack", "dashboard", "document", "meeting", "hris"];
  const formatHint = vars.scenarioFormat ?? scenarioFormats[vars.difficulty % scenarioFormats.length];

  const systemPrompt = `You are a world-class assessment designer for HR professionals, with expertise equivalent to a CIPD fellowship and a leading university AI department. You design enterprise-grade behavioural assessments that measure how HR professionals actually work with AI — not what they know about AI theory.

Your assessments are:
- Behavioural: measuring real decisions under realistic conditions, not theoretical knowledge
- Role-specific: every scenario is grounded in the person's actual job context and sector
- Deterministic: every option maps to specific signal deltas for psychometric scoring
- Hard to game: no obviously "correct" answer — the weak/failure options are plausible to someone with limited AI literacy
- Written in plain, professional English appropriate for HR professionals
- Immersive: scenarios feel like real workplace situations (${formatHint} format where appropriate)

You must return a single JSON object. Do not include any markdown fences, explanation, or text outside the JSON.

JSON schema:
{
  "title": "Short descriptive title (5-8 words)",
  "scenario": "2-4 sentences. Specific, realistic HR workplace situation. Include what the AI produced, the business context, and what is at stake. Name the AI tool type. Frame as an immersive ${formatHint} scenario where appropriate.",
  "constraint": "One sentence. A time pressure, resource limit, or complicating factor that makes this harder.",
  "question": "The specific decision question. Must reflect the interaction type."${needsAiOutput ? `,
  "ai_output": "The actual AI-generated text the person must evaluate. 3-6 sentences of realistic AI output containing a specific flaw, error, or improvement opportunity."` : ""}${needsDataContext ? `,
  "data_context": "The AI-generated data summary or analysis. 3-5 sentences with specific numbers, percentages, or findings."` : ""}${needsPromptContext ? `,
  "prompt_context": "The actual prompt text and/or AI conversation that the person must evaluate or improve."` : ""},
  "options": [
    {
      "label": "A",
      "text": "Full option text (1-2 sentences, specific and actionable)",
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
- Options must NOT be obviously ranked
- Each option must have at least 2 signal deltas
- Signal delta range: -3.0 to +3.0
- Available signals: ${ALL_CANONICAL_SIGNALS.join(", ")}`;

  const pressureNote = vars.pressureEscalationPrompt
    ? `\n\nPRESSURE ESCALATION CONTEXT: ${vars.pressureEscalationPrompt}`
    : "";

  const userPrompt = `Generate a "${vars.interactionType.replace(/_/g, " ")}" assessment item.

Person profile:
- Role: ${roleContext}
${sectorLine ? `- ${sectorLine}` : ""}${seniorityLine ? `\n- ${seniorityLine}` : ""}${aiUsageLine ? `\n- ${aiUsageLine}` : ""}
${orgAiToolsLine ? `- ${orgAiToolsLine}` : ""}${orgAmbitionLine ? `\n- ${orgAmbitionLine}` : ""}${orgPrioritiesLine ? `\n- ${orgPrioritiesLine}` : ""}
${priorPerformanceLine ? `\n${priorPerformanceLine}\n` : ""}
Item parameters:
- Workflow context: ${vars.workflowContext}
- Target capability: ${vars.targetCapability.replace(/_/g, " ")}
- Difficulty: Level ${vars.difficulty} (${vars.difficulty === 1 ? "straightforward" : vars.difficulty === 2 ? "requires careful judgement" : "complex and high-stakes"})
- Risk level: ${vars.riskLevel}
- AI output quality: ${vars.aiOutputQuality}
${vars.aiFailureMode ? `- AI failure mode: ${vars.aiFailureMode.replace(/_/g, " ")}` : ""}
- Time pressure: ${vars.timePressure ? "Yes" : "No"}
- Business consequence: ${vars.businessConsequence}
- Governance sensitivity: ${vars.governanceSensitivity}
- Phase: ${vars.phase}
${vars.contradictionIntent ? "\nIMPORTANT: This is a contradiction probe. Use completely different surface details." : ""}${pressureNote}

Interaction type instruction:
${INTERACTION_TYPE_INSTRUCTIONS[vars.interactionType]}
${FEW_SHOT_EXAMPLES[vars.interactionType] ? `\nExample (structural reference ONLY — do NOT copy content):\n${FEW_SHOT_EXAMPLES[vars.interactionType]}` : ""}
Return ONLY valid JSON.`;

  // Build JSON schema dynamically
  const schemaProperties: Record<string, unknown> = {
    title: { type: "string" },
    scenario: { type: "string" },
    artefactType: { type: "string", enum: ["none", "email_thread", "cv_extract", "policy_doc", "meeting_notes", "chat_log", "data_table"] },
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
  const schemaRequired = ["title", "scenario", "artefactType", "constraint", "question", "options"];

  if (needsAiOutput) {
    schemaProperties["ai_output"] = { type: "string" };
    schemaRequired.push("ai_output");
  }
  if (needsDataContext) {
    schemaProperties["data_context"] = { type: "string" };
    schemaRequired.push("data_context");
  }
  if (needsPromptContext) {
    schemaProperties["prompt_context"] = { type: "string" };
    schemaRequired.push("prompt_context");
  }

  // Quality validation helper
  function validateItemQuality(parsed: any): string[] {
    const opts: any[] = parsed.options ?? [];
    const errs: string[] = [];

    if (opts.length !== 4) errs.push(`options.length=${opts.length} (expected 4)`);
    const strongCount = opts.filter((o: any) => o.outcomeClass === "strong").length;
    if (strongCount !== 1) errs.push(`strong options=${strongCount} (expected 1)`);
    const failCount = opts.filter((o: any) => o.outcomeClass === "failure" || o.outcomeClass === "critical_failure").length;
    if (failCount < 1) errs.push(`failure/critical_failure options=${failCount} (expected ≥1)`);
    if (!parsed.scenario || parsed.scenario.length < 40) errs.push(`scenario too short`);
    const minSignals = opts.every((o: any) => Object.keys(o.signalDeltas ?? {}).length >= 2);
    if (!minSignals) errs.push("one or more options have <2 signal deltas");

    // Strong option must have net-positive deltas for target domain
    const strongOpt = opts.find((o: any) => o.outcomeClass === "strong");
    if (strongOpt) {
      const deltas: Record<string, number> = strongOpt.signalDeltas ?? {};
      const capSum = Object.entries(deltas)
        .filter(([sig]) => CANONICAL_SIGNAL_TO_DOMAIN[sig] === vars.targetCapability)
        .reduce((s, [, v]) => s + (v as number), 0);
      if (capSum < 0) errs.push(`strong option has net-negative deltas for target domain`);
    }

    // Failure option must have net-negative deltas for target domain
    const failOpt = opts.find((o: any) => o.outcomeClass === "failure" || o.outcomeClass === "critical_failure");
    if (failOpt) {
      const deltas: Record<string, number> = failOpt.signalDeltas ?? {};
      const capSum = Object.entries(deltas)
        .filter(([sig]) => CANONICAL_SIGNAL_TO_DOMAIN[sig] === vars.targetCapability)
        .reduce((s, [, v]) => s + (v as number), 0);
      if (capSum > 0) errs.push(`failure option has net-positive deltas for target domain`);
    }

    // Delta range check
    for (const opt of opts) {
      for (const [sig, val] of Object.entries(opt.signalDeltas ?? {})) {
        const v = val as number;
        if (v < -3.0 || v > 3.0) errs.push(`option ${opt.label} signal '${sig}' delta=${v} outside [-3.0, 3.0]`);
      }
    }

    // Canonical signal check
    for (const opt of opts) {
      for (const sig of Object.keys(opt.signalDeltas ?? {})) {
        if (!CANONICAL_SIGNAL_TO_DOMAIN[sig]) errs.push(`option ${opt.label} uses non-canonical signal '${sig}'`);
      }
    }

    // Trivially obvious failure check
    if (failOpt) {
      const failText = (failOpt.text ?? "").toLowerCase();
      const obviousPhrase = TRIVIALLY_OBVIOUS_FAILURE_PHRASES.find(p => failText.includes(p));
      if (obviousPhrase) errs.push(`failure option contains trivially obvious phrase '${obviousPhrase}'`);
    }

    // Near-duplicate check
    for (let i = 0; i < opts.length; i++) {
      for (let j = i + 1; j < opts.length; j++) {
        const a = (opts[i].text ?? "").toLowerCase();
        const b = (opts[j].text ?? "").toLowerCase();
        if (a.length > 20 && b.length > 20) {
          const wordsA = new Set(a.split(/\s+/));
          const wordsB = new Set(b.split(/\s+/));
          const intersection = Array.from(wordsA).filter(w => wordsB.has(w)).length;
          const overlap = intersection / Math.min(wordsA.size, wordsB.size);
          if (overlap > 0.85) errs.push(`options ${opts[i].label} and ${opts[j].label} have >85% word overlap`);
        }
      }
    }

    // Strong option must not be shortest
    if (strongOpt && opts.length === 4) {
      const lengths = opts.map((o: any) => (o.text ?? "").length);
      const strongLength = (strongOpt.text ?? "").length;
      if (strongLength === Math.min(...lengths) && strongLength < 60) errs.push(`strong option is shortest — a tell`);
    }

    return errs;
  }

  function buildResult(parsed: any): GeneratedItem {
    return {
      title: parsed.title ?? "Assessment Item",
      scenario: parsed.scenario ?? "",
      artefactType: parsed.artefactType ?? "none",
      constraint: parsed.constraint ?? "",
      question: parsed.question ?? "What is the most appropriate action?",
      aiOutput: parsed.ai_output ?? undefined,
      dataContext: parsed.data_context ?? undefined,
      promptContext: parsed.prompt_context ?? undefined,
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
      scenarioFormat: formatHint,
    };
  }

  const MAX_RETRIES = 2;
  let lastParsed: any = null;
  let lastQualityErrors: string[] = [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const retryNote = attempt > 0 && lastQualityErrors.length > 0
        ? `\n\nIMPORTANT: Previous response failed validation: ${lastQualityErrors.join("; ")}. Fix these issues.`
        : "";

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt + retryNote },
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
      lastParsed = parsed;

      const qualityErrors = validateItemQuality(parsed);
      if (qualityErrors.length > 0) {
        lastQualityErrors = qualityErrors;
        if (attempt < MAX_RETRIES) {
          console.warn(`[adaptiveEngine] quality retry ${attempt + 1}/${MAX_RETRIES}:`, qualityErrors.join(" | "));
          continue;
        } else {
          console.warn(`[adaptiveEngine] using best-effort result after ${MAX_RETRIES} retries:`, qualityErrors.join(" | "));
        }
      }

      return buildResult(parsed);
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error("[adaptiveEngine] LLM generation failed after retries:", err);
        if (lastParsed) return buildResult(lastParsed);
        return generateFallbackItem(vars);
      }
      console.warn(`[adaptiveEngine] attempt ${attempt + 1} failed, retrying:`, err);
    }
  }

  return generateFallbackItem(vars);
}

// ─── Fallback Templates (v10 domains) ────────────────────────────────────────

const DOMAIN_FALLBACK_TEMPLATES: Record<CapabilityKey, (vars: GenerationVariables) => Omit<GeneratedItem, "interactionType" | "capability" | "capabilityKey" | "workflow" | "riskLevel" | "difficulty" | "metadata">> = {
  ai_interaction: (vars) => ({
    title: "Evaluating an AI Prompt Approach",
    scenario: `You are a ${vars.roleArchetype.displayName}. A colleague has asked an AI writing tool to draft a ${vars.workflowContext.replace(/_/g, " ")} document but the output was generic and unhelpful. They show you their prompt: "Write me a good ${vars.workflowContext.replace(/_/g, " ")} document."`,
    constraint: "The document is needed by end of day.",
    question: "What is the most important improvement to the prompt?",
    options: [
      { label: "A", text: "Add specific context: the organisation's situation, the audience, the purpose, and any constraints or requirements the output must meet.", outcomeClass: "strong", signalDeltas: { prompt_construction_quality: 2.0, prompt_iteration_quality: 1.5 } as Record<string, number>, eventCodes: ["CONTEXT_ADDITION"] as string[], rationale: "Correctly identifies the root cause — the prompt lacks context for the AI to produce useful output." },
      { label: "B", text: "Use a different AI tool — this one is not sophisticated enough for HR documents.", outcomeClass: "failure", signalDeltas: { tool_fluency_index: -2.0, prompt_construction_quality: -1.5 } as Record<string, number>, eventCodes: ["TOOL_BLAME"], rationale: "Blames the tool rather than the prompt — a common AI literacy failure." },
      { label: "C", text: "Add the word 'detailed' or 'comprehensive' to the prompt to get a better output.", outcomeClass: "weak", signalDeltas: { prompt_construction_quality: -0.5, prompt_iteration_quality: -1.0 } as Record<string, number>, eventCodes: ["ADJECTIVE_FIX"], rationale: "Adding adjectives does not address the fundamental context gap." },
      { label: "D", text: "Ask the AI follow-up questions to refine the output iteratively.", outcomeClass: "acceptable", signalDeltas: { prompt_iteration_quality: 0.5, prompt_construction_quality: -0.5 } as Record<string, number>, eventCodes: ["ITERATION_WITHOUT_DIAGNOSIS"], rationale: "Iteration helps but does not address the root cause — the initial prompt needs restructuring." },
    ],
  }),
  ai_output_evaluation: (vars) => ({
    title: "AI Output Validation Before Use",
    scenario: `You are a ${vars.roleArchetype.displayName}. An AI tool has produced a draft ${vars.workflowContext.replace(/_/g, " ")} document. It looks professionally formatted but you have not yet reviewed the content in detail.`,
    constraint: "The document needs to be sent to stakeholders within the hour.",
    question: "What is the most appropriate next step before sending?",
    options: [
      { label: "A", text: "Read through the document carefully, check all facts and claims, correct any issues, then send.", outcomeClass: "strong", signalDeltas: { output_evaluation_quality: 2.0, error_detection_accuracy: 1.5 } as Record<string, number>, eventCodes: ["VALIDATE_BEFORE_USE"], rationale: "Proportionate validation before use." },
      { label: "B", text: "Send it immediately — the AI tool is reliable and the formatting looks right.", outcomeClass: "failure", signalDeltas: { blind_acceptance_risk: -2.5, output_evaluation_quality: -2.0 } as Record<string, number>, eventCodes: ["BLIND_ACCEPT"], rationale: "Blind acceptance without content review." },
      { label: "C", text: "Discard the AI draft and write the document from scratch to be safe.", outcomeClass: "weak", signalDeltas: { output_evaluation_quality: -0.5, fitness_for_purpose_judgement: -1.0 } as Record<string, number>, eventCodes: ["AI_AVOIDANCE"], rationale: "Unnecessary avoidance — discards valid AI work without cause." },
      { label: "D", text: "Ask a colleague to review it before you send, without reviewing it yourself.", outcomeClass: "acceptable", signalDeltas: { output_evaluation_quality: 0.5, error_detection_accuracy: -0.5 } as Record<string, number>, eventCodes: ["DELEGATE_REVIEW"], rationale: "Acceptable but you should review it yourself first." },
    ],
  }),
  ai_workflow_design: (vars) => ({
    title: "AI Integration into HR Workflow",
    scenario: `You are a ${vars.roleArchetype.displayName}. You are redesigning the ${vars.workflowContext.replace(/_/g, " ")} workflow to incorporate AI assistance. You need to decide which steps AI should support and which require human ownership.`,
    constraint: "The redesigned workflow must go live next month.",
    question: "Which approach to AI integration is most appropriate?",
    options: [
      { label: "A", text: "Map each step against criteria for AI suitability (data quality, sensitivity, reversibility, explainability) and assign human ownership to steps that fail any criterion.", outcomeClass: "strong", signalDeltas: { workflow_redesign_quality: 2.5, human_oversight_preservation: 1.5 } as Record<string, number>, eventCodes: ["STRUCTURED_INTEGRATION"], rationale: "Systematic approach with clear criteria." },
      { label: "B", text: "Automate all steps where the AI tool is available — maximise efficiency.", outcomeClass: "failure", signalDeltas: { automation_expansion_risk: -2.5, workflow_redesign_quality: -2.0 } as Record<string, number>, eventCodes: ["OVER_AUTOMATION"], rationale: "Over-automation without suitability assessment." },
      { label: "C", text: "Keep all steps human-owned and use AI only for drafting final outputs.", outcomeClass: "weak", signalDeltas: { workflow_redesign_quality: -1.0, handoff_design_quality: -0.5 } as Record<string, number>, eventCodes: ["UNDER_INTEGRATION"], rationale: "Under-utilises AI." },
      { label: "D", text: "Ask each team member which steps they would like AI to support.", outcomeClass: "acceptable", signalDeltas: { workflow_redesign_quality: 0.5, human_oversight_preservation: -0.5 } as Record<string, number>, eventCodes: ["PREFERENCE_BASED"], rationale: "Inclusive but insufficient — preferences should not drive AI integration decisions." },
    ],
  }),
  workforce_ai_readiness: (vars) => ({
    title: "Diagnosing Team AI Capability Gaps",
    scenario: `You are a ${vars.roleArchetype.displayName}. Your team's AI assessment results show high scores on AI Interaction but low scores on AI Output Evaluation. Team members are enthusiastic AI users but have been caught using AI outputs without checking them.`,
    constraint: "You need to present a development plan to your director next week.",
    question: "What is the most important development priority for this team?",
    options: [
      { label: "A", text: "Focus development on output evaluation skills — the team can use AI tools but needs to learn when and how to verify AI outputs before using them in HR decisions.", outcomeClass: "strong", signalDeltas: { capability_diagnosis_accuracy: 2.5, intervention_design_quality: 1.5 } as Record<string, number>, eventCodes: ["ACCURATE_DIAGNOSIS"], rationale: "Correctly identifies the specific gap and proposes targeted development." },
      { label: "B", text: "Restrict AI tool access until the team completes a general AI literacy training programme.", outcomeClass: "failure", signalDeltas: { generic_prescription_risk: -2.0, capability_diagnosis_accuracy: -1.5 } as Record<string, number>, eventCodes: ["GENERIC_PRESCRIPTION"], rationale: "Generic restriction that does not address the specific gap." },
      { label: "C", text: "Celebrate the high interaction scores and monitor output quality over time.", outcomeClass: "weak", signalDeltas: { capability_diagnosis_accuracy: -1.0, intervention_design_quality: -0.5 } as Record<string, number>, eventCodes: ["GAP_IGNORED"], rationale: "Ignores the identified risk — enthusiasm without evaluation skill is dangerous." },
      { label: "D", text: "Implement a mandatory review step for all AI outputs before they are used.", outcomeClass: "acceptable", signalDeltas: { intervention_design_quality: 0.5, capability_diagnosis_accuracy: 0.5 } as Record<string, number>, eventCodes: ["PROCESS_FIX"], rationale: "A useful interim control but does not build the underlying capability." },
    ],
  }),
  ai_ethics_trust: (vars) => ({
    title: "AI Monitoring Proposal Raises Ethical Concerns",
    scenario: `You are a ${vars.roleArchetype.displayName}. Your organisation is considering deploying AI-powered productivity monitoring for remote workers. The tool tracks application usage and generates a 'productivity score'. The CHRO believes this will help identify disengaged employees.`,
    constraint: "The CHRO has budget approval and wants to pilot within 4 weeks.",
    question: "What is the most appropriate response?",
    options: [
      { label: "A", text: "Raise concerns about employee trust, privacy, and the validity of monitoring as a proxy for productivity. Recommend a formal ethical review before any pilot, including employee consultation.", outcomeClass: "strong", signalDeltas: { ethics_under_pressure: 2.5, stakeholder_impact_awareness: 2.0, employee_transparency_advocacy: 1.5 } as Record<string, number>, eventCodes: ["ETHICAL_CHALLENGE"], rationale: "Holds ethical position and proposes structured review." },
      { label: "B", text: "Support the pilot — it is limited and the data will inform a better decision.", outcomeClass: "failure", signalDeltas: { pressure_drift_risk: -2.5, ethics_under_pressure: -2.0 } as Record<string, number>, eventCodes: ["PRESSURE_COMPLIANCE"], rationale: "Drifts under authority pressure." },
      { label: "C", text: "Suggest using the tool but only sharing aggregate data, not individual scores.", outcomeClass: "weak", signalDeltas: { ethics_under_pressure: -0.5, stakeholder_impact_awareness: -1.0 } as Record<string, number>, eventCodes: ["PARTIAL_MITIGATION"], rationale: "Addresses one symptom but not the fundamental concern." },
      { label: "D", text: "Refuse to participate and escalate to the board.", outcomeClass: "acceptable", signalDeltas: { ethics_under_pressure: 1.0, stakeholder_impact_awareness: 0.5 } as Record<string, number>, eventCodes: ["ESCALATION_WITHOUT_ENGAGEMENT"], rationale: "Holds ground but escalates without constructive engagement." },
    ],
  }),
  ai_change_leadership: (vars) => ({
    title: "Responding to AI Initiative Resistance",
    scenario: `You are a ${vars.roleArchetype.displayName}. Your organisation has announced a new AI tool for ${vars.workflowContext.replace(/_/g, " ")}. Several experienced team members have expressed strong resistance, saying "AI will never understand the nuance of what we do" and refusing to attend the training sessions.`,
    constraint: "The rollout is scheduled for next month and leadership expects full adoption.",
    question: "What is the most effective response to this resistance?",
    options: [
      { label: "A", text: "Meet with the resistant team members individually to understand their specific concerns. Acknowledge the valid point about nuance while explaining how AI will support (not replace) their expertise. Adjust the rollout to address legitimate concerns.", outcomeClass: "strong", signalDeltas: { resistance_response_quality: 2.5, legitimate_concern_recognition: 2.0 } as Record<string, number>, eventCodes: ["CONCERN_ENGAGEMENT"], rationale: "Engages with the resistance constructively and recognises the legitimate concern within it." },
      { label: "B", text: "Mandate attendance at training and make AI tool usage a performance objective.", outcomeClass: "failure", signalDeltas: { dismissive_of_concern_risk: -2.5, resistance_response_quality: -2.0 } as Record<string, number>, eventCodes: ["FORCED_COMPLIANCE"], rationale: "Dismisses legitimate concerns and forces compliance — likely to increase resistance." },
      { label: "C", text: "Delay the rollout until the team is more receptive.", outcomeClass: "weak", signalDeltas: { change_pace_calibration: -1.0, resistance_response_quality: -0.5 } as Record<string, number>, eventCodes: ["AVOIDANCE"], rationale: "Avoids the issue rather than addressing it — delay does not resolve the underlying concerns." },
      { label: "D", text: "Ask the most enthusiastic team members to demonstrate the tool's value to their colleagues.", outcomeClass: "acceptable", signalDeltas: { resistance_response_quality: 0.5, legitimate_concern_recognition: -0.5 } as Record<string, number>, eventCodes: ["PEER_INFLUENCE"], rationale: "Useful tactic but does not address the specific concerns raised by the resistant members." },
    ],
  }),
};

// Backward compat alias
const CAPABILITY_FALLBACK_TEMPLATES = DOMAIN_FALLBACK_TEMPLATES;

function generateFallbackItem(vars: GenerationVariables): GeneratedItem {
  const templateFn = DOMAIN_FALLBACK_TEMPLATES[vars.targetCapability] ?? DOMAIN_FALLBACK_TEMPLATES.ai_interaction;
  const template = templateFn(vars);
  return {
    ...template,
    interactionType: vars.interactionType,
    capability: vars.targetCapability,
    capabilityKey: vars.targetCapability,
    workflow: vars.workflowContext,
    riskLevel: vars.riskLevel,
    difficulty: vars.difficulty,
    metadata: vars,
  };
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function findWeakestCapability(
  scores: Record<CapabilityKey, { score: number; signalCount: number }>,
  role: RoleArchetype,
  priorCapabilityScores?: Record<string, number> | null,
  saturatedCaps?: Set<CapabilityKey>,
  overProbedCap?: CapabilityKey,
  availableDomains?: CapabilityKey[]
): CapabilityKey {
  const domains = availableDomains ?? ALL_DOMAINS;
  const isExcluded = (k: CapabilityKey) =>
    (saturatedCaps?.has(k) ?? false) || k === overProbedCap || !domains.includes(k);

  const hasCurrentEvidence = Object.values(scores).some(v => v.signalCount > 0);
  if (!hasCurrentEvidence && priorCapabilityScores && Object.keys(priorCapabilityScores).length > 0) {
    const priorEntries = (Object.entries(priorCapabilityScores) as Array<[CapabilityKey, number]>)
      .filter(([k]) => !isExcluded(k));
    if (priorEntries.length > 0) {
      return priorEntries.sort((a, b) =>
        (role.capabilityWeights[b[0]] ?? 0.17) * (100 - b[1]) / 100 -
        (role.capabilityWeights[a[0]] ?? 0.17) * (100 - a[1]) / 100
      )[0][0];
    }
  }

  const caps = (Object.entries(scores) as Array<[CapabilityKey, { score: number; signalCount: number }]>)
    .filter(([k]) => !isExcluded(k));
  const activeCaps = caps.length > 0 ? caps :
    (domains.map(k => [k, scores[k] ?? { score: 50, signalCount: 0 }] as [CapabilityKey, { score: number; signalCount: number }]));
  if (activeCaps.length === 0) return domains[0] ?? "ai_interaction";
  return activeCaps.sort((a, b) =>
    (role.capabilityWeights[b[0]] ?? 0.17) * (100 - b[1].score) / 100 -
    (role.capabilityWeights[a[0]] ?? 0.17) * (100 - a[1].score) / 100
  )[0][0];
}

function findStrongestCapability(
  scores: Record<CapabilityKey, { score: number; signalCount: number }>,
  role: RoleArchetype
): CapabilityKey {
  const caps = Object.entries(scores) as Array<[CapabilityKey, { score: number; signalCount: number }]>;
  if (caps.length === 0) return "ai_ethics_trust";
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
    prompt_diagnosis:        "ai_interaction",
    prompt_construction:     "ai_interaction",
    scenario_critique:       "ai_output_evaluation",
    error_detection:         "ai_output_evaluation",
    process_redesign:        "ai_workflow_design",
    handoff_decision:        "ai_workflow_design",
    capability_diagnosis:    "workforce_ai_readiness",
    intervention_design:     "workforce_ai_readiness",
    leader_advisory:         "workforce_ai_readiness",
    ethical_pressure_test:   "ai_ethics_trust",
    stakeholder_impact:      "ai_ethics_trust",
    resistance_response:     "ai_change_leadership",
    legitimate_concern:      "ai_change_leadership",
    risk_judgement:          "ai_ethics_trust",
    confidence_calibration:  "ai_output_evaluation",
    contradiction_probe:     "ai_output_evaluation",
  };
  return map[type] ?? "ai_interaction";
}

function selectBaselineCapability(ctx: AdaptiveSelectionContext): CapabilityKey {
  const hasCurrentEvidence = ALL_DOMAINS.some(c => (ctx.capabilityScores[c]?.signalCount ?? 0) > 0);
  if (!hasCurrentEvidence && ctx.priorCapabilityScores && Object.keys(ctx.priorCapabilityScores).length > 0) {
    const priorEntries = Object.entries(ctx.priorCapabilityScores) as Array<[CapabilityKey, number]>;
    return priorEntries.sort((a, b) =>
      (ctx.roleArchetype.capabilityWeights[b[0]] ?? 0.17) * (100 - b[1]) / 100 -
      (ctx.roleArchetype.capabilityWeights[a[0]] ?? 0.17) * (100 - a[1]) / 100
    )[0][0];
  }
  return ALL_DOMAINS.slice().sort((a, b) =>
    (ctx.capabilityScores[a]?.signalCount ?? 0) - (ctx.capabilityScores[b]?.signalCount ?? 0)
  )[0];
}

function selectBaselineInteractionType(used: Record<InteractionType, number>): InteractionType {
  const baselineTypes: InteractionType[] = [
    "prompt_diagnosis",
    "prompt_construction",
    "scenario_critique",
    "error_detection",
    "risk_judgement",
    "confidence_calibration",
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
  const baseDifficulty: 1 | 2 | 3 = phase === "baseline" ? (ctx.personaStartingDifficulty ?? 1) : phase === "adaptive" ? 2 : 3;
  const recentWorkflows = ctx.recentWorkflows ?? [];
  const availableWorkflows = role.workflows.filter(w => !recentWorkflows.slice(-WORKFLOW_HISTORY_WINDOW).includes(w));
  const workflowPool = availableWorkflows.length > 0 ? availableWorkflows : role.workflows;
  const workflowContext = workflowPool[ctx.answeredCount % workflowPool.length] ?? "general_hr";
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

function findLeastUsedTypeWithGap(
  types: InteractionType[],
  used: Record<InteractionType, number>,
  gapWeight: number
): InteractionType {
  return [...types].sort((a, b) => {
    const usageA = used[a] ?? 0;
    const usageB = used[b] ?? 0;
    return (usageA * (1 + gapWeight)) - (usageB * (1 + gapWeight));
  })[0] ?? types[0];
}

function buildVariablesFromInjection(
  injection: InjectionSpec,
  role: RoleArchetype,
  phase: SessionPhase,
  ctx?: AdaptiveSelectionContext
): GenerationVariables {
  const workflowIndex = ctx ? ctx.answeredCount % role.workflows.length : 0;
  return {
    roleArchetype: role,
    targetCapability: injection.targetCapability as CapabilityKey,
    interactionType: injection.interactionType as InteractionType,
    difficulty: 3,
    riskLevel: injection.riskLevel,
    ambiguity: "high",
    workflowContext: role.workflows[workflowIndex] ?? role.workflows[0] ?? "general_hr",
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
