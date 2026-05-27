/**
 * AiQ v10 - Capability Domain Constants
 * Re-exports canonical tokens from @shared/brand and adds client-specific metadata.
 * DO NOT define domain keys, labels, colours, or descriptions here — they live in brand.ts.
 */

// ─── Re-exports from canonical source ────────────────────────────────────────
export {
  DOMAIN_KEYS,
  DOMAIN_LABELS,
  DOMAIN_SHORT_LABELS,
  DOMAIN_COLOURS,
  DOMAIN_BG_COLOURS,
  DOMAIN_DESCRIPTIONS,
  DOMAIN_ICON_NAMES,
  LEVEL_LABELS,
  LEVEL_COLOURS,
  HEATMAP_THRESHOLDS,
  scoreToLevel,
  rawScoreToLevel,
  scoreColours,
  READINESS_COLOURS,
  READINESS_LABELS,
} from "@shared/brand";

export type { DomainKey as CapabilityKey, LevelKey } from "@shared/brand";

// ─── Foundation / Strategic domain groupings ─────────────────────────────────
import type { DomainKey } from "@shared/brand";

/** Foundation domains must reach ≥3 signals before strategic domains are assessed */
export const FOUNDATION_DOMAINS: DomainKey[] = ["ai_interaction", "ai_output_evaluation"];
export const STRATEGIC_DOMAINS: DomainKey[] = ["ai_workflow_design", "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership"];

/** Development recommendations per domain */
export const DOMAIN_RECOMMENDATIONS: Record<DomainKey, string> = {
  ai_interaction:        "Practice structured prompting with real HR tasks. Start with simple requests and progressively add constraints, context, and format specifications. Review the AI Communication module in your learning plan.",
  ai_output_evaluation:  "Develop a systematic review checklist for AI outputs: check facts, verify sources, assess tone, and test fitness for purpose. Complete the Output Evaluation module and practice with the error detection exercises.",
  ai_workflow_design:    "Map your current workflows and identify the 3 highest-value AI integration points. Focus on the Workflow Design module and practice designing human-AI handoff points for real processes.",
  workforce_ai_readiness:"Study how to diagnose AI capability gaps in teams. Complete the Readiness Assessment module and practice advising leaders using the advisory simulation exercises.",
  ai_ethics_trust:       "Review your organisation's AI ethics policy and practice identifying ethical dilemmas in AI use cases. Complete the Ethics & Trust module and work through the pressure-test scenarios.",
  ai_change_leadership:  "Study change management frameworks applied to AI transformation. Complete the Change Leadership module and practice designing change interventions for AI adoption scenarios.",
};

// ─── Interaction type metadata ───────────────────────────────────────────────

export type InteractionType =
  | "prompt_construction"
  | "prompt_diagnosis"
  | "error_detection"
  | "confidence_calibration"
  | "scenario_critique"
  | "risk_judgement"
  | "process_redesign"
  | "handoff_decision"
  | "capability_diagnosis"
  | "intervention_design"
  | "leader_advisory"
  | "ethical_pressure_test"
  | "stakeholder_impact"
  | "resistance_response"
  | "legitimate_concern";

export const INTERACTION_TYPE_META: Record<InteractionType, {
  label: string;
  instruction: string;
  questionLabel: string;
  icon: string;
}> = {
  prompt_construction: {
    label: "Prompt Construction",
    instruction: "Construct or improve a prompt to get the AI to produce the output you need.",
    questionLabel: "How would you prompt the AI?",
    icon: "✏️",
  },
  prompt_diagnosis: {
    label: "Prompt Diagnosis",
    instruction: "Identify why the AI produced a poor result and determine what went wrong with the prompt.",
    questionLabel: "What's wrong with this prompt?",
    icon: "🔍",
  },
  error_detection: {
    label: "Error Detection",
    instruction: "Review the AI output and identify any errors, omissions, or misleading content.",
    questionLabel: "What errors do you identify?",
    icon: "⚠️",
  },
  confidence_calibration: {
    label: "Confidence Calibration",
    instruction: "Assess how much you should trust this AI output and calibrate your confidence appropriately.",
    questionLabel: "How confident should you be?",
    icon: "📊",
  },
  scenario_critique: {
    label: "Scenario Critique",
    instruction: "Evaluate this AI-driven approach and identify its strengths and weaknesses.",
    questionLabel: "What's your critique?",
    icon: "💬",
  },
  risk_judgement: {
    label: "Risk Judgement",
    instruction: "Assess the risk level of this AI application and determine appropriate safeguards.",
    questionLabel: "What is your risk assessment?",
    icon: "🛡️",
  },
  process_redesign: {
    label: "Process Redesign",
    instruction: "Redesign this workflow to incorporate AI effectively while maintaining quality and oversight.",
    questionLabel: "How would you redesign this process?",
    icon: "🔄",
  },
  handoff_decision: {
    label: "Handoff Decision",
    instruction: "Determine where AI should hand off to a human and where humans should hand off to AI.",
    questionLabel: "Where are the handoff points?",
    icon: "🤝",
  },
  capability_diagnosis: {
    label: "Capability Diagnosis",
    instruction: "Diagnose the AI capability gaps in this team or organisation and identify root causes.",
    questionLabel: "What capability gaps do you diagnose?",
    icon: "🩺",
  },
  intervention_design: {
    label: "Intervention Design",
    instruction: "Design an intervention to address the identified AI capability or change challenge.",
    questionLabel: "Design the intervention.",
    icon: "📋",
  },
  leader_advisory: {
    label: "Leader Advisory",
    instruction: "Advise a senior leader on their AI-related question or challenge.",
    questionLabel: "What do you advise?",
    icon: "🎯",
  },
  ethical_pressure_test: {
    label: "Ethical Pressure Test",
    instruction: "Navigate this ethical dilemma as pressure escalates. Maintain your position or adjust it with clear reasoning.",
    questionLabel: "How do you respond?",
    icon: "⚖️",
  },
  stakeholder_impact: {
    label: "Stakeholder Impact",
    instruction: "Assess the impact of this AI decision on different stakeholder groups.",
    questionLabel: "What is the stakeholder impact?",
    icon: "👥",
  },
  resistance_response: {
    label: "Resistance Response",
    instruction: "Respond to resistance to AI adoption in a way that acknowledges concerns while maintaining progress.",
    questionLabel: "How do you address this resistance?",
    icon: "🗣️",
  },
  legitimate_concern: {
    label: "Legitimate Concern",
    instruction: "Evaluate whether this concern about AI is legitimate and determine the appropriate response.",
    questionLabel: "Is this concern legitimate, and what do you do?",
    icon: "❓",
  },
};

/** Interaction type descriptions for the assessment landing page */
export const INTERACTION_TYPE_DESCRIPTIONS: Record<InteractionType, string> = {
  prompt_construction:    "Tests your ability to write effective prompts that get AI to produce useful, accurate outputs.",
  prompt_diagnosis:       "Measures your ability to identify why an AI prompt produced poor results and how to fix it.",
  error_detection:        "Evaluates your skill at spotting errors, omissions, and misleading content in AI outputs.",
  confidence_calibration: "Tests whether you can accurately calibrate how much to trust different AI outputs.",
  scenario_critique:      "Measures your ability to critically evaluate AI-driven approaches and identify weaknesses.",
  risk_judgement:         "Evaluates your ability to assess AI-related risks and determine appropriate safeguards.",
  process_redesign:       "Tests your ability to redesign workflows to incorporate AI effectively.",
  handoff_decision:       "Measures your skill at designing human-AI handoff points in processes.",
  capability_diagnosis:   "Tests your ability to diagnose AI capability gaps in teams and organisations.",
  intervention_design:    "Evaluates your skill at designing interventions to address AI capability challenges.",
  leader_advisory:        "Measures your ability to advise senior leaders on AI-related questions.",
  ethical_pressure_test:  "Tests whether you maintain ethical positions when pressure escalates.",
  stakeholder_impact:     "Evaluates your ability to assess AI impact across different stakeholder groups.",
  resistance_response:    "Measures your skill at addressing resistance to AI adoption constructively.",
  legitimate_concern:     "Tests your ability to distinguish legitimate AI concerns from unfounded resistance.",
};

/** Five-state readiness classification - Design System v2.2 §2.2 */
export const READINESS_STATES = {
  safe: {
    label: "AI-Ready",
    color: "text-[#047857]",
    bg: "bg-[#f0fdf4] border-[#bbf7d0]",
    description: "Your responses demonstrate strong AI capability across all assessed domains. You can work effectively with AI tools in your role.",
  },
  at_risk: {
    label: "Developing",
    color: "text-[#1d4ed8]",
    bg: "bg-[#eff6ff] border-[#bfdbfe]",
    description: "You show emerging AI capability but have gaps in some areas. Targeted development will help you reach full readiness.",
  },
  unsafe: {
    label: "Not Yet Ready",
    color: "text-[#b45309]",
    bg: "bg-[#fffbeb] border-[#fde68a]",
    description: "Significant capability gaps were identified. A structured development plan is recommended before independent AI use in your role.",
  },
  foundation_gap: {
    label: "Foundation Gap",
    color: "text-[#b91c1c]",
    bg: "bg-[#fef2f2] border-[#fecaca]",
    description: "Core AI interaction and output evaluation skills need development before strategic AI capabilities can be reliably assessed.",
  },
  unknown: {
    label: "Insufficient Data",
    color: "text-[#6B7280]",
    bg: "bg-[#F9FAFB] border-[#D1D5DB]",
    description: "Not enough assessment data to determine your readiness state. Complete more of the assessment for a reliable classification.",
  },
} as const;
