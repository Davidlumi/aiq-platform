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
    const weakest = findWeakestCapability(ctx.capabilityScores, ctx.roleArchetype, ctx.priorCapabilityScores);
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

// ─── T3-10: Few-Shot Examples ─────────────────────────────────────────────────
// One compact, well-formed example per interaction type. Used as structural
// reference only — the LLM must NOT copy scenario content.
const FEW_SHOT_EXAMPLES: Partial<Record<InteractionType, string>> = {
  situational_judgement: JSON.stringify({
    title: "AI Screening Output Requires Validation",
    scenario: "You are an HR Business Partner. The AI recruitment screening tool has ranked 12 candidates for a senior analyst role, flagging 3 as 'Strong Recommend'. You notice the top-ranked candidate has an unusual career gap that the AI did not flag.",
    constraint: "Hiring manager wants shortlist names by end of day.",
    question: "What is the most appropriate next step before sending the shortlist?",
    options: [
      { label: "A", text: "Review all 3 AI-recommended candidates manually, check the career gap context, and adjust the shortlist if needed before sending.", outcomeClass: "strong", signalDeltas: { validation_accuracy: 2.0, judgement_quality: 1.5 }, eventCodes: ["VALIDATE_BEFORE_USE"], rationale: "Demonstrates proportionate validation — catches a potential AI blind spot without over-engineering the process." },
      { label: "B", text: "Send the AI shortlist as-is — the tool has a strong track record and the hiring manager trusts it.", outcomeClass: "failure", signalDeltas: { blind_acceptance_risk: -2.5, validation_accuracy: -2.0 }, eventCodes: ["BLIND_ACCEPT"], rationale: "Blind acceptance — ignores a visible signal that requires human review." },
      { label: "C", text: "Reject the AI shortlist entirely and re-screen all 12 candidates manually.", outcomeClass: "weak", signalDeltas: { over_caution_risk: -1.5, workflow_application_quality: -1.0 }, eventCodes: ["AI_AVOIDANCE"], rationale: "Over-caution — discards valid AI work unnecessarily." },
      { label: "D", text: "Ask the AI tool to re-run the screening with different parameters before reviewing.", outcomeClass: "acceptable", signalDeltas: { execution_quality: 0.5, timing_integrity: -0.5 }, eventCodes: ["RERUN_WITHOUT_REVIEW"], rationale: "Acceptable but inefficient — re-running does not address the specific gap identified." }
    ]
  }),
  scenario_critique: JSON.stringify({
    title: "AI Redundancy Communication Contains Compliance Gap",
    scenario: "You are an Employee Relations Manager. You asked an AI writing assistant to draft a redundancy consultation letter. The letter looks professional and covers most required points.",
    constraint: "Legal review is unavailable today and letters must go out tomorrow.",
    question: "What is the most significant problem with this AI-generated letter?",
    ai_output: "Dear [Employee Name], Following a review of our business structure, we regret to inform you that your role of Senior Data Analyst has been identified as at risk of redundancy. We are entering a 30-day consultation period beginning 15 May 2025. During this time, we will explore all reasonable alternatives to redundancy, including redeployment opportunities. You are invited to a consultation meeting on 20 May 2025 at 10:00am. Please confirm your attendance. We value your contributions and will support you through this process. Yours sincerely, HR Department.",
    options: [
      { label: "A", text: "The letter does not inform the employee of their right to be accompanied at the consultation meeting, which is a statutory requirement under UK employment law.", outcomeClass: "strong", signalDeltas: { validation_accuracy: 2.5, governance_quality: 2.0 }, eventCodes: ["COMPLIANCE_GAP_IDENTIFIED"], rationale: "Correctly identifies the specific statutory omission — the right to be accompanied is a legal requirement the AI missed." },
      { label: "B", text: "The tone is too formal and may cause unnecessary distress to the employee.", outcomeClass: "weak", signalDeltas: { cosmetic_focus_risk: -1.5, validation_accuracy: -1.0 }, eventCodes: ["COSMETIC_FOCUS"], rationale: "Focuses on tone rather than the substantive compliance gap — a common AI literacy failure." },
      { label: "C", text: "The letter does not specify the exact redundancy payment amount.", outcomeClass: "acceptable", signalDeltas: { validation_accuracy: 0.5, governance_quality: 0.5 }, eventCodes: ["MINOR_OMISSION"], rationale: "A valid but minor point — payment amounts are typically confirmed later in the process." },
      { label: "D", text: "The consultation period of 30 days is too short for a senior role.", outcomeClass: "failure", signalDeltas: { hallucination_acceptance_risk: -2.0, governance_quality: -1.5 }, eventCodes: ["INCORRECT_LEGAL_CLAIM"], rationale: "Factually incorrect — 30 days is the minimum for fewer than 100 redundancies under UK law." }
    ]
  }),
  risk_judgement: JSON.stringify({
    title: "AI Sentiment Analysis Used for Performance Review",
    scenario: "Your HRIS vendor has added an AI sentiment analysis feature that analyses employee email tone to produce a 'collaboration score'. Your line manager wants to include these scores in the upcoming performance review cycle.",
    constraint: "Performance reviews begin in 3 weeks and the manager is enthusiastic about the new feature.",
    question: "What is the most appropriate governance response?",
    options: [
      { label: "A", text: "Advise the manager that using AI sentiment analysis in performance decisions raises significant legal, ethical, and data protection concerns that require formal review before any use.", outcomeClass: "strong", signalDeltas: { governance_quality: 2.5, appropriateness_boundary: 2.0 }, eventCodes: ["GOVERNANCE_ESCALATION"], rationale: "Correctly identifies the multi-dimensional risk and triggers appropriate governance \u2014 not just a blanket refusal." },
      { label: "B", text: "Allow a pilot with 5 employees to test the feature before rolling it out more widely.", outcomeClass: "failure", signalDeltas: { governance_bypass_risk: -2.5, unsafe_hr_decision_risk: -2.0 }, eventCodes: ["GOVERNANCE_BYPASS"], rationale: "A pilot does not resolve the legal and ethical issues \u2014 it just delays them while creating additional risk." },
      { label: "C", text: "Use the scores as one of many data points, ensuring no single metric determines an outcome.", outcomeClass: "weak", signalDeltas: { governance_quality: -1.0, blind_acceptance_risk: -1.5 }, eventCodes: ["PARTIAL_GOVERNANCE"], rationale: "Underestimates the risk \u2014 using unvalidated AI sentiment data in any part of a performance decision is problematic regardless of weighting." },
      { label: "D", text: "Decline to use the feature entirely and remove it from the HRIS configuration.", outcomeClass: "acceptable", signalDeltas: { governance_quality: 1.0, over_caution_risk: -0.5 }, eventCodes: ["PRECAUTIONARY_REFUSAL"], rationale: "Acceptable but overly binary \u2014 the right response is governance review, not immediate removal." }
    ]
  }),
  // R4: Additional few-shot examples for all remaining interaction types
  output_improvement: JSON.stringify({
    title: "AI Onboarding Email Needs Tone Correction",
    scenario: "You asked your AI writing assistant to draft a welcome email for a new starter joining a sensitive ER investigation team. The draft is factually accurate but has a significant tone problem.",
    constraint: "The new starter joins tomorrow and the email must go out today.",
    question: "Which improvement action is most important before sending this email?",
    ai_output: "Hi Alex! Welcome to the team! We're so excited to have you join us. You'll be working on some really interesting employee relations cases \u2014 it can get pretty intense sometimes but it's always rewarding! Your manager Sarah will show you the ropes. Looking forward to having you on board! \ud83d\ude0a",
    options: [
      { label: "A", text: "Rewrite the email to use formal, professional language appropriate for a sensitive ER role, removing the casual tone and emoji.", outcomeClass: "strong", signalDeltas: { execution_quality: 2.0, judgement_quality: 1.5 }, eventCodes: ["TONE_CORRECTION"], rationale: "Correctly identifies the core problem: the casual tone is inappropriate for a role handling sensitive employee matters." },
      { label: "B", text: "Add more detail about the specific cases Alex will be working on to make the welcome more personalised.", outcomeClass: "failure", signalDeltas: { governance_bypass_risk: -2.0, appropriateness_boundary: -1.5 }, eventCodes: ["CONFIDENTIALITY_BREACH"], rationale: "Adding case details to a welcome email would breach confidentiality before the employee has even started." },
      { label: "C", text: "Remove the emoji but keep the friendly tone \u2014 a warm welcome is important for new starter engagement.", outcomeClass: "weak", signalDeltas: { judgement_quality: -1.0, execution_quality: -0.5 }, eventCodes: ["PARTIAL_FIX"], rationale: "Removes the most visible issue but misses the deeper tone problem inappropriate for a sensitive role context." },
      { label: "D", text: "Send the email as-is and address tone expectations during the onboarding conversation.", outcomeClass: "acceptable", signalDeltas: { execution_quality: 0.5, over_reliance_risk: -0.5 }, eventCodes: ["DEFER_CORRECTION"], rationale: "Acceptable as a fallback but misses the opportunity to set the right professional tone from day one." }
    ]
  }),
  error_detection: JSON.stringify({
    title: "AI Policy Summary Contains Hallucinated Statute",
    scenario: "You asked an AI assistant to summarise your organisation's obligations under UK data protection law for a board briefing. The summary looks authoritative and well-structured.",
    constraint: "The board briefing is in 2 hours and legal counsel is unavailable.",
    question: "What is the specific error in this AI-generated summary?",
    ai_output: "Under the UK Data Protection Act 2018 and GDPR, organisations must appoint a Data Protection Officer (DPO) if they process personal data at scale. The ICO's 2023 AI Guidance (Circular 47/2023) requires all HR AI tools to undergo a Data Protection Impact Assessment before deployment. Employee data used for AI training must be anonymised under Section 89A of the DPA 2018. Retention periods for AI-processed HR data must not exceed 3 years without explicit consent.",
    options: [
      { label: "A", text: "ICO Circular 47/2023 does not exist \u2014 the AI has hallucinated a specific regulatory reference that could mislead the board.", outcomeClass: "strong", signalDeltas: { hallucination_acceptance_risk: 2.5, validation_accuracy: 2.0 }, eventCodes: ["HALLUCINATION_DETECTED"], rationale: "Correctly identifies the hallucinated citation \u2014 a critical AI literacy skill when using AI for compliance content." },
      { label: "B", text: "The 3-year retention limit is incorrect \u2014 there is no universal retention period under UK GDPR.", outcomeClass: "acceptable", signalDeltas: { validation_accuracy: 1.0, governance_quality: 0.5 }, eventCodes: ["VALID_CONCERN"], rationale: "A valid concern but secondary \u2014 the hallucinated regulatory citation is the more critical error to flag first." },
      { label: "C", text: "The summary is too technical for a board audience and should be simplified.", outcomeClass: "weak", signalDeltas: { cosmetic_focus_risk: -1.5, validation_accuracy: -1.0 }, eventCodes: ["COSMETIC_FOCUS"], rationale: "Focuses on presentation rather than the substantive accuracy error \u2014 a common AI literacy gap." },
      { label: "D", text: "The DPO appointment requirement is overstated \u2014 not all organisations processing personal data at scale must appoint a DPO.", outcomeClass: "failure", signalDeltas: { hallucination_acceptance_risk: -2.0, governance_quality: -1.5 }, eventCodes: ["MISSED_CRITICAL_ERROR"], rationale: "While partially true, this misses the hallucinated citation entirely \u2014 the most dangerous error in a board compliance document." }
    ]
  }),
  prioritisation: JSON.stringify({
    title: "Competing AI Workflow Tasks Under Time Pressure",
    scenario: "It is Friday afternoon. You have three AI-assisted tasks outstanding: (1) an AI-drafted redundancy letter that needs review before Monday, (2) an AI-generated engagement survey analysis your director wants for a Monday morning meeting, and (3) an AI screening shortlist for a role closing today.",
    constraint: "You have 90 minutes remaining before the office closes.",
    question: "In what order should you prioritise these tasks?",
    options: [
      { label: "A", text: "Shortlist review first (legal deadline today), then redundancy letter (legal document, Monday deadline), then engagement analysis (advisory, Monday meeting).", outcomeClass: "strong", signalDeltas: { judgement_quality: 2.0, workflow_application_quality: 1.5 }, eventCodes: ["CORRECT_PRIORITY"], rationale: "Correctly sequences by legal risk and deadline \u2014 the shortlist has a hard deadline today, the redundancy letter carries legal risk, and the analysis is advisory." },
      { label: "B", text: "Engagement analysis first \u2014 it's for a director and the Monday meeting is high-visibility.", outcomeClass: "failure", signalDeltas: { judgement_quality: -2.0, unsafe_hr_decision_risk: -1.5 }, eventCodes: ["WRONG_PRIORITY"], rationale: "Prioritises visibility over legal obligation \u2014 missing the shortlist deadline and leaving a redundancy letter unreviewed are both higher-risk failures." },
      { label: "C", text: "Redundancy letter first \u2014 legal documents always take priority regardless of deadline.", outcomeClass: "weak", signalDeltas: { judgement_quality: -1.0, workflow_application_quality: -0.5 }, eventCodes: ["RIGID_PRIORITY"], rationale: "The redundancy letter is important but the shortlist closes today \u2014 rigid rules without deadline awareness is a judgement gap." },
      { label: "D", text: "Shortlist first, then engagement analysis, then redundancy letter \u2014 the letter can wait until Monday morning.", outcomeClass: "acceptable", signalDeltas: { judgement_quality: 0.5, workflow_application_quality: 0.5 }, eventCodes: ["PARTIAL_PRIORITY"], rationale: "Correct on the shortlist but deprioritises the legal document \u2014 acceptable if Monday morning genuinely allows time for thorough review." }
    ]
  }),
  data_interpretation: JSON.stringify({
    title: "AI Attrition Analysis Contains Misleading Correlation",
    scenario: "Your people analytics platform has produced an AI-generated attrition risk report. The report identifies a strong correlation and makes a causal recommendation.",
    constraint: "The CHRO wants to act on this data in next week's workforce planning meeting.",
    question: "What is the most important limitation to flag before presenting this analysis?",
    data_context: "AI Attrition Risk Report Q1 2025: Employees who completed fewer than 2 training courses in the past 12 months are 3.4x more likely to leave within 6 months (p<0.01, n=847). Recommendation: Mandate 3+ training courses per employee per quarter to reduce attrition by an estimated 40%. Confidence: High. Note: Analysis excludes employees on parental leave or long-term sick absence.",
    options: [
      { label: "A", text: "The analysis confuses correlation with causation \u2014 low training completion may be a symptom of disengagement rather than its cause, making the 40% reduction estimate unreliable.", outcomeClass: "strong", signalDeltas: { data_interpretation_quality: 2.5, judgement_quality: 1.5 }, eventCodes: ["CAUSATION_TRAP_IDENTIFIED"], rationale: "Correctly identifies the core analytical flaw \u2014 mandating training based on a correlation that may be a symptom would not address the underlying attrition drivers." },
      { label: "B", text: "The sample size of 847 is too small to draw reliable conclusions.", outcomeClass: "weak", signalDeltas: { data_interpretation_quality: -0.5, blind_acceptance_risk: -1.0 }, eventCodes: ["INCORRECT_CRITIQUE"], rationale: "847 is a reasonable sample size for this type of analysis \u2014 this critique is statistically incorrect." },
      { label: "C", text: "The exclusion of employees on parental leave or sick absence may bias the results.", outcomeClass: "acceptable", signalDeltas: { data_interpretation_quality: 1.0, governance_quality: 0.5 }, eventCodes: ["VALID_LIMITATION"], rationale: "A valid methodological concern but secondary \u2014 the causation issue is more fundamental to the recommendation's validity." },
      { label: "D", text: "The p-value of <0.01 confirms the finding is statistically significant and the recommendation should be implemented.", outcomeClass: "failure", signalDeltas: { data_interpretation_quality: -2.5, blind_acceptance_risk: -2.0 }, eventCodes: ["STAT_SIG_MISUSE"], rationale: "Statistical significance does not imply causation or practical significance \u2014 this is a fundamental data literacy failure." }
    ]
  }),
  governance_decision: JSON.stringify({
    title: "AI Tool Used Without Data Processing Agreement",
    scenario: "A hiring manager has been using a free AI CV screening tool for the past 3 months without informing HR. You discover this when reviewing a shortlist. The tool has processed 240 candidate CVs.",
    constraint: "The hiring manager has already made verbal offers to two candidates from this shortlist.",
    question: "What is the correct governance response?",
    options: [
      { label: "A", text: "Pause the process, inform your DPO or legal team immediately, assess whether a data breach notification is required, and review whether the shortlist can be used.", outcomeClass: "strong", signalDeltas: { governance_quality: 2.5, appropriateness_boundary: 2.0 }, eventCodes: ["GOVERNANCE_ESCALATION"], rationale: "Correct multi-step response \u2014 identifies the data protection breach, triggers appropriate escalation, and protects the organisation." },
      { label: "B", text: "Retrospectively obtain a data processing agreement with the tool vendor to regularise the situation.", outcomeClass: "failure", signalDeltas: { governance_bypass_risk: -2.5, unsafe_hr_decision_risk: -2.0 }, eventCodes: ["RETROACTIVE_COVER"], rationale: "A retrospective DPA does not resolve the breach that has already occurred \u2014 this approach attempts to cover up rather than address the issue." },
      { label: "C", text: "Proceed with the verbal offers since the candidates have already been selected \u2014 disrupting the process would cause more harm.", outcomeClass: "weak", signalDeltas: { governance_quality: -2.0, unsafe_hr_decision_risk: -1.5 }, eventCodes: ["HARM_AVOIDANCE_RATIONALISATION"], rationale: "Prioritises operational convenience over legal obligation \u2014 the breach must be assessed regardless of downstream impact." },
      { label: "D", text: "Document the incident internally and implement a policy to prevent future unauthorised AI tool use.", outcomeClass: "acceptable", signalDeltas: { governance_quality: 1.0, execution_quality: 0.5 }, eventCodes: ["POLICY_RESPONSE"], rationale: "Good for prevention but insufficient as an immediate response \u2014 the current breach still requires escalation and assessment." }
    ]
  }),
  multi_step_workflow: JSON.stringify({
    title: "AI Job Description Workflow \u2014 Correct Next Step",
    scenario: "You are using an AI tool to create a job description for a new People Analytics Manager role. The AI has generated a draft JD based on the job title and department. You have reviewed it and identified that it contains generic competencies not specific to your organisation's context.",
    constraint: "The role needs to be posted externally by end of week.",
    question: "What is the most important next step in this workflow?",
    options: [
      { label: "A", text: "Provide the AI with specific context about your organisation's analytics maturity, tech stack, and team structure, then regenerate the competencies section.", outcomeClass: "strong", signalDeltas: { workflow_application_quality: 2.0, execution_quality: 1.5 }, eventCodes: ["CONTEXTUAL_REFINEMENT"], rationale: "Correct use of AI iteration \u2014 provides the specific context needed to make the output fit-for-purpose rather than accepting generic output." },
      { label: "B", text: "Post the JD as-is \u2014 generic competencies are standard practice and will attract a broad candidate pool.", outcomeClass: "failure", signalDeltas: { blind_acceptance_risk: -2.0, execution_quality: -1.5 }, eventCodes: ["BLIND_ACCEPT"], rationale: "Accepts generic AI output without validation \u2014 a generic JD for a specialist role will attract mismatched candidates." },
      { label: "C", text: "Manually rewrite the entire JD from scratch \u2014 AI-generated JDs are not reliable for specialist roles.", outcomeClass: "weak", signalDeltas: { over_caution_risk: -1.5, workflow_application_quality: -1.0 }, eventCodes: ["AI_AVOIDANCE"], rationale: "Over-caution \u2014 discards valid AI work when targeted refinement would be more efficient." },
      { label: "D", text: "Send the draft to the hiring manager for their input before making any changes.", outcomeClass: "acceptable", signalDeltas: { workflow_application_quality: 0.5, execution_quality: 0.5 }, eventCodes: ["STAKEHOLDER_INPUT"], rationale: "Reasonable but inefficient \u2014 the AI limitation is already identified and can be addressed directly without adding a stakeholder loop." }
    ]
  }),
  contradiction_probe: JSON.stringify({
    title: "AI Screening Tool \u2014 Different Context, Same Principle",
    scenario: "You are reviewing a shortlist produced by an AI video interview analysis tool. The tool has scored candidates on 'communication effectiveness' based on speech patterns and facial expression analysis. The top-ranked candidate is from a non-native English speaking background.",
    constraint: "The hiring manager wants to proceed to offer stage today.",
    question: "What is the most important concern to raise before proceeding?",
    options: [
      { label: "A", text: "The AI tool's scoring criteria may systematically disadvantage non-native English speakers, creating indirect discrimination risk that requires review before any hiring decision.", outcomeClass: "strong", signalDeltas: { governance_quality: 2.5, appropriateness_boundary: 2.0 }, eventCodes: ["BIAS_RISK_IDENTIFIED"], rationale: "Correctly identifies the protected characteristic risk \u2014 AI tools using speech and facial analysis have documented bias against non-native speakers." },
      { label: "B", text: "The candidate ranked highest, so the tool appears to be working correctly \u2014 proceed to offer.", outcomeClass: "failure", signalDeltas: { blind_acceptance_risk: -2.5, unsafe_hr_decision_risk: -2.0 }, eventCodes: ["BLIND_ACCEPT"], rationale: "Ranking position does not validate the scoring methodology \u2014 this misses the systemic bias risk entirely." },
      { label: "C", text: "Request a manual review of the bottom-ranked candidates to check for any obvious errors.", outcomeClass: "weak", signalDeltas: { validation_accuracy: -0.5, governance_quality: -1.0 }, eventCodes: ["PARTIAL_REVIEW"], rationale: "Addresses individual errors but misses the systemic bias concern affecting the entire scoring methodology." },
      { label: "D", text: "Inform the hiring manager that AI video analysis tools require a bias audit before use in hiring decisions.", outcomeClass: "acceptable", signalDeltas: { governance_quality: 1.5, appropriateness_boundary: 1.0 }, eventCodes: ["GOVERNANCE_FLAG"], rationale: "Correct direction but less specific than identifying the immediate protected characteristic risk in this specific case." }
    ]
  }),
  confidence_calibration: JSON.stringify({
    title: "AI Engagement Analysis \u2014 Calibrating Certainty",
    scenario: "An AI platform has analysed your organisation's annual engagement survey and produced a summary identifying 'psychological safety' as the primary driver of low engagement in the Finance team. The analysis is based on 23 responses from a team of 31.",
    constraint: "The Finance Director wants a specific action plan by end of week.",
    question: "What level of confidence is appropriate when presenting this finding?",
    options: [
      { label: "A", text: "Present the finding as a hypothesis requiring validation \u2014 the 74% response rate is reasonable but the sample is small and a single AI analysis should not drive a specific action plan without further investigation.", outcomeClass: "strong", signalDeltas: { calibration_index: 2.0, data_interpretation_quality: 1.5 }, eventCodes: ["APPROPRIATE_UNCERTAINTY"], rationale: "Demonstrates appropriate epistemic humility \u2014 acknowledges the finding without over-claiming certainty from a single AI analysis." },
      { label: "B", text: "Present the finding as confirmed \u2014 74% response rate is statistically sufficient and the AI platform is enterprise-grade.", outcomeClass: "failure", signalDeltas: { calibration_index: -2.5, blind_acceptance_risk: -2.0 }, eventCodes: ["OVERCONFIDENCE"], rationale: "Overconfident \u2014 response rate and tool quality do not validate a causal claim from a single survey cycle." },
      { label: "C", text: "Decline to present the finding until a follow-up focus group has been conducted.", outcomeClass: "weak", signalDeltas: { over_caution_risk: -1.5, calibration_index: -0.5 }, eventCodes: ["OVER_CAUTION"], rationale: "Over-cautious \u2014 the finding is worth sharing as a hypothesis even before additional validation." },
      { label: "D", text: "Present the finding with a clear caveat about sample size and recommend a follow-up pulse survey before committing to an action plan.", outcomeClass: "acceptable", signalDeltas: { calibration_index: 1.0, data_interpretation_quality: 1.0 }, eventCodes: ["CALIBRATED_PRESENTATION"], rationale: "Good approach but slightly less precise than framing it explicitly as a hypothesis \u2014 the distinction matters for how the Finance Director will act on it." }
    ]
  }),
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
${FEW_SHOT_EXAMPLES[vars.interactionType] ? `\nExample of a well-formed item for this interaction type (structural reference ONLY — do NOT copy scenario, characters, or options):\n${FEW_SHOT_EXAMPLES[vars.interactionType]}` : ""}
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

  // R5: Quality validation helper (T3-11 upgraded to retry loop)
  function validateItemQuality(parsed: any): string[] {
    const opts: any[] = parsed.options ?? [];
    const errs: string[] = [];
    if (opts.length !== 4) errs.push(`options.length=${opts.length} (expected 4)`);
    const strongCount = opts.filter((o: any) => o.outcomeClass === "strong").length;
    if (strongCount !== 1) errs.push(`strong options=${strongCount} (expected 1)`);
    const failCount = opts.filter((o: any) => o.outcomeClass === "failure" || o.outcomeClass === "critical_failure").length;
    if (failCount < 1) errs.push(`failure/critical_failure options=${failCount} (expected \u22651)`);
    if (!parsed.scenario || parsed.scenario.length < 40) errs.push(`scenario too short (${parsed.scenario?.length ?? 0} chars)`);
    const minSignals = opts.every((o: any) => Object.keys(o.signalDeltas ?? {}).length >= 2);
    if (!minSignals) errs.push("one or more options have <2 signal deltas");
    return errs;
  }

  function buildResult(parsed: any): GeneratedItem {
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
  }

  const MAX_RETRIES = 2;
  let lastParsed: any = null;
  let lastQualityErrors: string[] = [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // R5: On retry, append quality failure feedback to the user prompt
      const retryNote = attempt > 0 && lastQualityErrors.length > 0
        ? `\n\nIMPORTANT: Your previous response failed quality validation. Issues found: ${lastQualityErrors.join("; ")}. Please fix these issues in your response.`
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

      // R5: Run quality validation — retry if errors found and attempts remain
      const qualityErrors = validateItemQuality(parsed);
      if (qualityErrors.length > 0) {
        lastQualityErrors = qualityErrors;
        if (attempt < MAX_RETRIES) {
          console.warn(`[adaptiveEngine] R5 quality retry ${attempt + 1}/${MAX_RETRIES} [${vars.interactionType}]:`, qualityErrors.join(" | "));
          continue; // retry
        } else {
          // Final attempt still has errors — log and use best available result
          console.warn(`[adaptiveEngine] R5 quality check: using best-effort result after ${MAX_RETRIES} retries [${vars.interactionType}]:`, qualityErrors.join(" | "));
        }
      }

      return buildResult(parsed);
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error("[adaptiveEngine] LLM generation failed after retries:", err);
        // If we have a partially valid result from a previous attempt, use it
        if (lastParsed) {
          console.warn("[adaptiveEngine] Using best-effort result from previous attempt");
          return buildResult(lastParsed);
        }
        return generateFallbackItem(vars);
      }
      console.warn(`[adaptiveEngine] LLM attempt ${attempt + 1} failed, retrying:`, err);
    }
  }

  // Should never reach here, but TypeScript requires a return
  return generateFallbackItem(vars);
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
  role: RoleArchetype,
  priorCapabilityScores?: Record<string, number> | null
): CapabilityKey {
  // If current session has no evidence yet, use prior scores to target the weakest capability
  const hasCurrentEvidence = Object.values(scores).some(v => v.signalCount > 0);
  if (!hasCurrentEvidence && priorCapabilityScores && Object.keys(priorCapabilityScores).length > 0) {
    const priorEntries = Object.entries(priorCapabilityScores) as Array<[CapabilityKey, number]>;
    return priorEntries.sort((a, b) =>
      (role.capabilityWeights[b[0]] ?? 0.17) * (100 - b[1]) / 100 -
      (role.capabilityWeights[a[0]] ?? 0.17) * (100 - a[1]) / 100
    )[0][0];
  }
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
