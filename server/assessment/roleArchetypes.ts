/**
 * AIQ Adaptive Assessment Engine — Role Archetypes
 *
 * Defines the full HR role architecture with capability weightings,
 * workflow contexts, decision authority, risk exposure, and AI usage patterns.
 * These drive scenario adaptation, interpretation thresholds, and governance sensitivity.
 */

export type RiskExposure = "low" | "medium" | "high";
export type CapabilityKey = "execution" | "judgement" | "governance" | "appropriateness" | "workflow" | "data_interpretation";

export interface RoleArchetype {
  id: string;
  displayName: string;
  family: string;
  seniority: "junior" | "mid" | "senior" | "lead";
  /** Capability weights — must sum to 1.0 */
  capabilityWeights: Record<CapabilityKey, number>;
  /** Minimum safe threshold per capability (0–100) */
  minimumSafeThresholds: Record<CapabilityKey, number>;
  /** Typical workflows this role performs */
  workflows: string[];
  /** E1: Gaming threshold family for WS2.2 role-aware anti-gaming */
  gamingFamily: "specialist" | "generalist" | "leader" | "coordinator";
  /** Decision authority level */
  decisionAuthority: "advisory" | "operational" | "strategic";
  /** Risk exposure level */
  riskExposure: RiskExposure;
  /** Governance sensitivity */
  governanceSensitivity: "low" | "medium" | "high" | "critical";
  /** Typical AI usage patterns */
  aiUsagePatterns: string[];
  /** Scenario context tags relevant to this role */
  contextTags: string[];
}

export const ROLE_ARCHETYPES: Record<string, RoleArchetype> = {
  hrbp: {
    id: "hrbp",
    gamingFamily: "generalist", // E1
    displayName: "HR Business Partner",
    family: "Business Partnering",
    seniority: "senior",
    capabilityWeights: {
      execution: 0.15,
      judgement: 0.25,
      governance: 0.20,
      appropriateness: 0.20,
      workflow: 0.10,
      data_interpretation: 0.10,
    },
    minimumSafeThresholds: {
      execution: 60, judgement: 70, governance: 65,
      appropriateness: 70, workflow: 55, data_interpretation: 60,
    },
    workflows: ["employee_relations", "performance_management", "organisational_design", "change_management", "workforce_planning"],
    decisionAuthority: "strategic",
    riskExposure: "high",
    governanceSensitivity: "high",
    aiUsagePatterns: ["drafting_communications", "analysing_engagement_data", "preparing_business_cases", "summarising_case_notes"],
    contextTags: ["strategic", "employee_relations", "change", "performance"],
  },
  hr_generalist: {
    id: "hr_generalist",
    gamingFamily: "generalist", // E1
    displayName: "HR Generalist",
    family: "Generalist",
    seniority: "mid",
    capabilityWeights: {
      execution: 0.20,
      judgement: 0.20,
      governance: 0.20,
      appropriateness: 0.15,
      workflow: 0.15,
      data_interpretation: 0.10,
    },
    minimumSafeThresholds: {
      execution: 60, judgement: 60, governance: 65,
      appropriateness: 60, workflow: 60, data_interpretation: 55,
    },
    workflows: ["onboarding", "policy_administration", "employee_queries", "absence_management", "basic_er"],
    decisionAuthority: "operational",
    riskExposure: "medium",
    governanceSensitivity: "medium",
    aiUsagePatterns: ["drafting_policies", "answering_employee_queries", "processing_documentation", "generating_letters"],
    contextTags: ["operational", "policy", "onboarding", "administration"],
  },
  hr_advisor: {
    id: "hr_advisor",
    gamingFamily: "generalist", // E1
    displayName: "HR Advisor",
    family: "Advisory",
    seniority: "mid",
    capabilityWeights: {
      execution: 0.15,
      judgement: 0.25,
      governance: 0.25,
      appropriateness: 0.15,
      workflow: 0.10,
      data_interpretation: 0.10,
    },
    minimumSafeThresholds: {
      execution: 60, judgement: 65, governance: 70,
      appropriateness: 65, workflow: 55, data_interpretation: 55,
    },
    workflows: ["disciplinary_hearings", "grievance_management", "complex_er", "policy_interpretation", "manager_coaching"],
    decisionAuthority: "advisory",
    riskExposure: "high",
    governanceSensitivity: "high",
    aiUsagePatterns: ["case_summarisation", "precedent_research", "outcome_drafting", "risk_assessment"],
    contextTags: ["advisory", "er", "disciplinary", "grievance", "complex"],
  },
  talent_acquisition: {
    id: "talent_acquisition",
    gamingFamily: "specialist", // E1
    displayName: "Talent Acquisition Specialist",
    family: "Talent Acquisition",
    seniority: "mid",
    capabilityWeights: {
      execution: 0.25,
      judgement: 0.20,
      governance: 0.20,
      appropriateness: 0.15,
      workflow: 0.15,
      data_interpretation: 0.05,
    },
    minimumSafeThresholds: {
      execution: 65, judgement: 60, governance: 65,
      appropriateness: 65, workflow: 60, data_interpretation: 50,
    },
    workflows: ["job_description_creation", "candidate_screening", "interview_design", "offer_management", "sourcing"],
    decisionAuthority: "operational",
    riskExposure: "high",
    governanceSensitivity: "critical",
    aiUsagePatterns: ["jd_generation", "cv_screening", "interview_question_generation", "candidate_communications"],
    contextTags: ["recruitment", "hiring", "screening", "bias", "compliance"],
  },
  er_specialist: {
    id: "er_specialist",
    gamingFamily: "specialist", // E1
    displayName: "Employee Relations Specialist",
    family: "Employee Relations",
    seniority: "senior",
    capabilityWeights: {
      execution: 0.10,
      judgement: 0.30,
      governance: 0.30,
      appropriateness: 0.15,
      workflow: 0.10,
      data_interpretation: 0.05,
    },
    minimumSafeThresholds: {
      execution: 55, judgement: 75, governance: 75,
      appropriateness: 70, workflow: 55, data_interpretation: 50,
    },
    workflows: ["investigation_management", "disciplinary_process", "grievance_process", "tribunal_preparation", "case_management"],
    decisionAuthority: "strategic",
    riskExposure: "high",
    governanceSensitivity: "critical",
    aiUsagePatterns: ["case_note_summarisation", "evidence_analysis", "outcome_drafting", "risk_flagging"],
    contextTags: ["investigation", "disciplinary", "grievance", "legal_risk", "sensitive"],
  },
  ld_specialist: {
    id: "ld_specialist",
    gamingFamily: "specialist", // E1
    displayName: "L&D Specialist",
    family: "Learning & Development",
    seniority: "mid",
    capabilityWeights: {
      execution: 0.20,
      judgement: 0.15,
      governance: 0.10,
      appropriateness: 0.20,
      workflow: 0.20,
      data_interpretation: 0.15,
    },
    minimumSafeThresholds: {
      execution: 60, judgement: 55, governance: 55,
      appropriateness: 60, workflow: 65, data_interpretation: 60,
    },
    workflows: ["content_creation", "needs_analysis", "programme_design", "learning_evaluation", "skills_mapping"],
    decisionAuthority: "operational",
    riskExposure: "low",
    governanceSensitivity: "low",
    aiUsagePatterns: ["content_generation", "quiz_creation", "learning_path_design", "feedback_analysis"],
    contextTags: ["learning", "content", "skills", "development"],
  },
  people_analytics: {
    id: "people_analytics",
    gamingFamily: "specialist", // E1
    displayName: "People Analytics Specialist",
    family: "People Analytics",
    seniority: "senior",
    capabilityWeights: {
      execution: 0.15,
      judgement: 0.20,
      governance: 0.15,
      appropriateness: 0.10,
      workflow: 0.15,
      data_interpretation: 0.25,
    },
    minimumSafeThresholds: {
      execution: 60, judgement: 65, governance: 60,
      appropriateness: 60, workflow: 60, data_interpretation: 75,
    },
    workflows: ["workforce_reporting", "predictive_modelling", "survey_analysis", "attrition_analysis", "dashboard_design"],
    decisionAuthority: "advisory",
    riskExposure: "medium",
    governanceSensitivity: "high",
    aiUsagePatterns: ["data_interpretation", "pattern_detection", "report_generation", "insight_summarisation"],
    contextTags: ["data", "analytics", "reporting", "insight", "modelling"],
  },
  hr_ops: {
    id: "hr_ops",
    gamingFamily: "coordinator", // E1
    displayName: "HR Operations Specialist",
    family: "HR Operations",
    seniority: "mid",
    capabilityWeights: {
      execution: 0.30,
      judgement: 0.10,
      governance: 0.20,
      appropriateness: 0.15,
      workflow: 0.20,
      data_interpretation: 0.05,
    },
    minimumSafeThresholds: {
      execution: 70, judgement: 55, governance: 65,
      appropriateness: 60, workflow: 70, data_interpretation: 50,
    },
    workflows: ["payroll_support", "system_administration", "process_automation", "data_management", "compliance_reporting"],
    decisionAuthority: "operational",
    riskExposure: "medium",
    governanceSensitivity: "medium",
    aiUsagePatterns: ["process_automation", "data_validation", "report_generation", "query_resolution"],
    contextTags: ["operations", "process", "automation", "compliance", "data_quality"],
  },
  reward: {
    id: "reward",
    gamingFamily: "specialist", // E1
    displayName: "Reward & Compensation Specialist",
    family: "Reward",
    seniority: "senior",
    capabilityWeights: {
      execution: 0.15,
      judgement: 0.20,
      governance: 0.20,
      appropriateness: 0.15,
      workflow: 0.10,
      data_interpretation: 0.20,
    },
    minimumSafeThresholds: {
      execution: 60, judgement: 65, governance: 65,
      appropriateness: 65, workflow: 55, data_interpretation: 70,
    },
    workflows: ["benchmarking", "pay_review", "job_evaluation", "benefits_design", "equity_analysis"],
    decisionAuthority: "advisory",
    riskExposure: "high",
    governanceSensitivity: "high",
    aiUsagePatterns: ["benchmarking_analysis", "pay_gap_analysis", "job_description_grading", "market_data_interpretation"],
    contextTags: ["reward", "pay", "benchmarking", "equity", "sensitive_data"],
  },
  hr_leader: {
    id: "hr_leader",
    gamingFamily: "leader", // E1
    displayName: "HR Leader / CHRO",
    family: "HR Leadership",
    seniority: "lead",
    capabilityWeights: {
      execution: 0.10,
      judgement: 0.25,
      governance: 0.25,
      appropriateness: 0.15,
      workflow: 0.10,
      data_interpretation: 0.15,
    },
    minimumSafeThresholds: {
      execution: 55, judgement: 75, governance: 75,
      appropriateness: 70, workflow: 55, data_interpretation: 65,
    },
    workflows: ["ai_strategy", "governance_design", "board_reporting", "risk_oversight", "culture_change"],
    decisionAuthority: "strategic",
    riskExposure: "high",
    governanceSensitivity: "critical",
    aiUsagePatterns: ["strategic_analysis", "board_reporting", "policy_design", "risk_assessment", "workforce_strategy"],
    contextTags: ["strategic", "governance", "board", "risk", "policy"],
  },
  // Default fallback
  hr_professional: {
    id: "hr_professional",
    gamingFamily: "generalist", // E1
    displayName: "HR Professional",
    family: "General",
    seniority: "mid",
    capabilityWeights: {
      execution: 0.17,
      judgement: 0.17,
      governance: 0.17,
      appropriateness: 0.17,
      workflow: 0.16,
      data_interpretation: 0.16,
    },
    minimumSafeThresholds: {
      execution: 60, judgement: 60, governance: 60,
      appropriateness: 60, workflow: 60, data_interpretation: 60,
    },
    workflows: ["general_hr", "policy_administration", "employee_support"],
    decisionAuthority: "operational",
    riskExposure: "medium",
    governanceSensitivity: "medium",
    aiUsagePatterns: ["general_ai_usage"],
    contextTags: ["general"],
  },
};

/** Map a user's job title or role string to a role archetype */
export function resolveRoleArchetype(roleHint?: string | null): RoleArchetype {
  if (!roleHint) return ROLE_ARCHETYPES.hr_professional;
  // Support new format: "role_id::ai_experience" — extract just the role part
  const rolePart = roleHint.includes("::") ? roleHint.split("::")[0].trim() : roleHint;
  // Direct ID match first (most reliable — used by pre-assessment profiling modal)
  if (rolePart in ROLE_ARCHETYPES) return ROLE_ARCHETYPES[rolePart as keyof typeof ROLE_ARCHETYPES];
  const lower = rolePart.toLowerCase();
  if (lower.includes("chro") || lower.includes("chief") || lower.includes("director") || lower.includes("vp")) return ROLE_ARCHETYPES.hr_leader;
  if (lower.includes("hrbp") || lower.includes("business partner")) return ROLE_ARCHETYPES.hrbp;
  if (lower.includes("talent") || lower.includes("recruit") || lower.includes("ta ") || lower.includes("acquisition")) return ROLE_ARCHETYPES.talent_acquisition;
  if (lower.includes("employee relations") || lower.includes(" er ") || lower.includes("er specialist") || lower.includes("investigation")) return ROLE_ARCHETYPES.er_specialist;
  if (lower.includes("l&d") || lower.includes("learning") || lower.includes("development") || lower.includes("training")) return ROLE_ARCHETYPES.ld_specialist;
  if (lower.includes("analytics") || lower.includes("data")) return ROLE_ARCHETYPES.people_analytics;
  if (lower.includes("ops") || lower.includes("operations") || lower.includes("payroll") || lower.includes("systems")) return ROLE_ARCHETYPES.hr_ops;
  if (lower.includes("reward") || lower.includes("compensation") || lower.includes("benefits") || lower.includes("pay")) return ROLE_ARCHETYPES.reward;
  if (lower.includes("advisor") || lower.includes("adviser")) return ROLE_ARCHETYPES.hr_advisor;
  if (lower.includes("generalist")) return ROLE_ARCHETYPES.hr_generalist;
  return ROLE_ARCHETYPES.hr_professional;
}
