/**
 * AiQ v10 — Capability Domain Constants
 * Single source of truth for all domain labels, colours, icons, and descriptions.
 */

export type CapabilityKey =
  | "ai_interaction"
  | "ai_output_evaluation"
  | "ai_workflow_design"
  | "workforce_ai_readiness"
  | "ai_ethics_trust"
  | "ai_change_leadership";

export const DOMAIN_KEYS: CapabilityKey[] = [
  "ai_interaction",
  "ai_output_evaluation",
  "ai_workflow_design",
  "workforce_ai_readiness",
  "ai_ethics_trust",
  "ai_change_leadership",
];

export const DOMAIN_LABELS: Record<CapabilityKey, string> = {
  ai_interaction:        "AI Interaction",
  ai_output_evaluation:  "AI Output Evaluation",
  ai_workflow_design:    "AI Workflow Design",
  workforce_ai_readiness:"Workforce AI Readiness",
  ai_ethics_trust:       "AI Ethics & Employee Trust",
  ai_change_leadership:  "AI Change Leadership",
};

export const DOMAIN_SHORT_LABELS: Record<CapabilityKey, string> = {
  ai_interaction:        "Interaction",
  ai_output_evaluation:  "Output Eval",
  ai_workflow_design:    "Workflow",
  workforce_ai_readiness:"Readiness",
  ai_ethics_trust:       "Ethics",
  ai_change_leadership:  "Change",
};

/** Colorblind-safe palette — Tol Bright scheme */
export const DOMAIN_COLOURS: Record<CapabilityKey, string> = {
  ai_interaction:        "#4477AA",
  ai_output_evaluation:  "#EE6677",
  ai_workflow_design:    "#228833",
  workforce_ai_readiness:"#CCBB44",
  ai_ethics_trust:       "#AA3377",
  ai_change_leadership:  "#66CCEE",
};

/** Background-safe versions (with opacity) */
export const DOMAIN_BG_COLOURS: Record<CapabilityKey, string> = {
  ai_interaction:        "rgba(68,119,170,0.12)",
  ai_output_evaluation:  "rgba(238,102,119,0.12)",
  ai_workflow_design:    "rgba(34,136,51,0.12)",
  workforce_ai_readiness:"rgba(204,187,68,0.12)",
  ai_ethics_trust:       "rgba(170,51,119,0.12)",
  ai_change_leadership:  "rgba(102,204,238,0.12)",
};

export const DOMAIN_DESCRIPTIONS: Record<CapabilityKey, string> = {
  ai_interaction:        "How effectively you communicate with AI tools — prompting, iterating, and directing AI to produce useful outputs.",
  ai_output_evaluation:  "Your ability to critically assess AI-generated content for accuracy, fitness for purpose, and hidden errors.",
  ai_workflow_design:    "How well you can identify where AI adds value in a process and design appropriate human-AI handoff points.",
  workforce_ai_readiness:"Your capability to diagnose team AI skill gaps, design interventions, and advise leaders on readiness.",
  ai_ethics_trust:       "How you navigate ethical dilemmas involving AI, maintain employee trust, and hold firm under pressure.",
  ai_change_leadership:  "Your ability to lead AI-driven change — managing resistance, calibrating pace, and designing sustainable transformation.",
};

/** Foundation domains must reach ≥3 signals before strategic domains are assessed */
export const FOUNDATION_DOMAINS: CapabilityKey[] = ["ai_interaction", "ai_output_evaluation"];
export const STRATEGIC_DOMAINS: CapabilityKey[] = ["ai_workflow_design", "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership"];

/** Development recommendations per domain */
export const DOMAIN_RECOMMENDATIONS: Record<CapabilityKey, string> = {
  ai_interaction:        "Practice structured prompting with real HR tasks. Start with simple requests and progressively add constraints, context, and format specifications. Review the AI Communication module in your learning plan.",
  ai_output_evaluation:  "Develop a systematic review checklist for AI outputs: check facts, verify sources, assess tone, and test fitness for purpose. Complete the Output Evaluation module and practice with the error detection exercises.",
  ai_workflow_design:    "Map your current workflows and identify the 3 highest-value AI integration points. Focus on the Workflow Design module and practice designing human-AI handoff points for real processes.",
  workforce_ai_readiness:"Study how to diagnose AI capability gaps in teams. Complete the Readiness Assessment module and practice advising leaders using the advisory simulation exercises.",
  ai_ethics_trust:       "Review your organisation's AI ethics policy and practice identifying ethical dilemmas in AI use cases. Complete the Ethics & Trust module and work through the pressure-test scenarios.",
  ai_change_leadership:  "Study change management frameworks applied to AI transformation. Complete the Change Leadership module and practice designing change interventions for AI adoption scenarios.",
};

/** Interaction type metadata for the assessment session UI */
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

/** Five-state readiness classification */
export const READINESS_STATES = {
  safe: {
    label: "AI-Ready",
    color: "text-[#228833]",
    bg: "bg-[#228833]/8 border-[#228833]/30",
    description: "Your responses demonstrate strong AI capability across all assessed domains. You can work effectively with AI tools in your role.",
  },
  at_risk: {
    label: "Developing",
    color: "text-[#CCBB44]",
    bg: "bg-[#CCBB44]/8 border-[#CCBB44]/30",
    description: "You show emerging AI capability but have gaps in some areas. Targeted development will help you reach full readiness.",
  },
  unsafe: {
    label: "Not Yet Ready",
    color: "text-[#EE6677]",
    bg: "bg-[#EE6677]/8 border-[#EE6677]/30",
    description: "Significant capability gaps were identified. A structured development plan is recommended before independent AI use in your role.",
  },
  foundation_gap: {
    label: "Foundation Gap",
    color: "text-[#AA3377]",
    bg: "bg-[#AA3377]/8 border-[#AA3377]/30",
    description: "Core AI interaction and output evaluation skills need development before strategic AI capabilities can be reliably assessed.",
  },
  unknown: {
    label: "Insufficient Data",
    color: "text-gray-500",
    bg: "bg-gray-100 border-gray-300",
    description: "Not enough assessment data to determine your readiness state. Complete more of the assessment for a reliable classification.",
  },
} as const;
