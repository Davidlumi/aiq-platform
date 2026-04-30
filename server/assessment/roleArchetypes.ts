/**
 * AIQ Assessment Engine — Role Archetypes v10
 *
 * Defines the full HR role architecture with capability weightings rebuilt
 * for the v10 six-domain taxonomy:
 *   Foundation: AI Interaction, AI Output Evaluation
 *   Operational: AI Workflow Design
 *   Strategic: Workforce AI Readiness, AI Ethics & Trust, AI Change Leadership
 *
 * 11 archetypes preserved from v9.2, weights recalibrated for new domains.
 */

export type RiskExposure = "low" | "medium" | "high";
export type CapabilityKey =
  | "ai_interaction"
  | "ai_output_evaluation"
  | "ai_workflow_design"
  | "workforce_ai_readiness"
  | "ai_ethics_trust"
  | "ai_change_leadership";

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
  /** Gaming threshold family for role-aware anti-gaming */
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
    gamingFamily: "generalist",
    displayName: "HR Business Partner",
    family: "Business Partnering",
    seniority: "senior",
    capabilityWeights: {
      ai_interaction:         0.12,
      ai_output_evaluation:   0.15,
      ai_workflow_design:     0.13,
      workforce_ai_readiness: 0.25,
      ai_ethics_trust:        0.20,
      ai_change_leadership:   0.15,
    },
    minimumSafeThresholds: {
      ai_interaction: 60, ai_output_evaluation: 65, ai_workflow_design: 60,
      workforce_ai_readiness: 70, ai_ethics_trust: 70, ai_change_leadership: 65,
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
    gamingFamily: "generalist",
    displayName: "HR Generalist",
    family: "Generalist",
    seniority: "mid",
    capabilityWeights: {
      ai_interaction:         0.20,
      ai_output_evaluation:   0.20,
      ai_workflow_design:     0.20,
      workforce_ai_readiness: 0.15,
      ai_ethics_trust:        0.15,
      ai_change_leadership:   0.10,
    },
    minimumSafeThresholds: {
      ai_interaction: 60, ai_output_evaluation: 60, ai_workflow_design: 60,
      workforce_ai_readiness: 55, ai_ethics_trust: 60, ai_change_leadership: 55,
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
    gamingFamily: "generalist",
    displayName: "HR Advisor",
    family: "Advisory",
    seniority: "mid",
    capabilityWeights: {
      ai_interaction:         0.15,
      ai_output_evaluation:   0.20,
      ai_workflow_design:     0.10,
      workforce_ai_readiness: 0.15,
      ai_ethics_trust:        0.25,
      ai_change_leadership:   0.15,
    },
    minimumSafeThresholds: {
      ai_interaction: 60, ai_output_evaluation: 65, ai_workflow_design: 55,
      workforce_ai_readiness: 60, ai_ethics_trust: 70, ai_change_leadership: 60,
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
    gamingFamily: "specialist",
    displayName: "Talent Acquisition Specialist",
    family: "Talent Acquisition",
    seniority: "mid",
    capabilityWeights: {
      ai_interaction:         0.25,
      ai_output_evaluation:   0.20,
      ai_workflow_design:     0.20,
      workforce_ai_readiness: 0.10,
      ai_ethics_trust:        0.20,
      ai_change_leadership:   0.05,
    },
    minimumSafeThresholds: {
      ai_interaction: 65, ai_output_evaluation: 65, ai_workflow_design: 60,
      workforce_ai_readiness: 55, ai_ethics_trust: 70, ai_change_leadership: 50,
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
    gamingFamily: "specialist",
    displayName: "Employee Relations Specialist",
    family: "Employee Relations",
    seniority: "senior",
    capabilityWeights: {
      ai_interaction:         0.10,
      ai_output_evaluation:   0.25,
      ai_workflow_design:     0.10,
      workforce_ai_readiness: 0.10,
      ai_ethics_trust:        0.30,
      ai_change_leadership:   0.15,
    },
    minimumSafeThresholds: {
      ai_interaction: 55, ai_output_evaluation: 75, ai_workflow_design: 55,
      workforce_ai_readiness: 55, ai_ethics_trust: 75, ai_change_leadership: 60,
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
    gamingFamily: "specialist",
    displayName: "L&D Specialist",
    family: "Learning & Development",
    seniority: "mid",
    capabilityWeights: {
      ai_interaction:         0.25,
      ai_output_evaluation:   0.15,
      ai_workflow_design:     0.25,
      workforce_ai_readiness: 0.15,
      ai_ethics_trust:        0.10,
      ai_change_leadership:   0.10,
    },
    minimumSafeThresholds: {
      ai_interaction: 65, ai_output_evaluation: 60, ai_workflow_design: 65,
      workforce_ai_readiness: 60, ai_ethics_trust: 55, ai_change_leadership: 55,
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
    gamingFamily: "specialist",
    displayName: "People Analytics Specialist",
    family: "People Analytics",
    seniority: "senior",
    capabilityWeights: {
      ai_interaction:         0.20,
      ai_output_evaluation:   0.25,
      ai_workflow_design:     0.15,
      workforce_ai_readiness: 0.15,
      ai_ethics_trust:        0.15,
      ai_change_leadership:   0.10,
    },
    minimumSafeThresholds: {
      ai_interaction: 65, ai_output_evaluation: 75, ai_workflow_design: 60,
      workforce_ai_readiness: 60, ai_ethics_trust: 65, ai_change_leadership: 55,
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
    gamingFamily: "coordinator",
    displayName: "HR Operations Specialist",
    family: "HR Operations",
    seniority: "mid",
    capabilityWeights: {
      ai_interaction:         0.25,
      ai_output_evaluation:   0.15,
      ai_workflow_design:     0.30,
      workforce_ai_readiness: 0.10,
      ai_ethics_trust:        0.10,
      ai_change_leadership:   0.10,
    },
    minimumSafeThresholds: {
      ai_interaction: 70, ai_output_evaluation: 60, ai_workflow_design: 70,
      workforce_ai_readiness: 50, ai_ethics_trust: 55, ai_change_leadership: 50,
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
    gamingFamily: "specialist",
    displayName: "Reward & Compensation Specialist",
    family: "Reward",
    seniority: "senior",
    capabilityWeights: {
      ai_interaction:         0.15,
      ai_output_evaluation:   0.25,
      ai_workflow_design:     0.15,
      workforce_ai_readiness: 0.15,
      ai_ethics_trust:        0.20,
      ai_change_leadership:   0.10,
    },
    minimumSafeThresholds: {
      ai_interaction: 60, ai_output_evaluation: 70, ai_workflow_design: 55,
      workforce_ai_readiness: 60, ai_ethics_trust: 70, ai_change_leadership: 55,
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
    gamingFamily: "leader",
    displayName: "HR Leader / CHRO",
    family: "HR Leadership",
    seniority: "lead",
    capabilityWeights: {
      ai_interaction:         0.08,
      ai_output_evaluation:   0.12,
      ai_workflow_design:     0.10,
      workforce_ai_readiness: 0.30,
      ai_ethics_trust:        0.20,
      ai_change_leadership:   0.20,
    },
    minimumSafeThresholds: {
      ai_interaction: 55, ai_output_evaluation: 65, ai_workflow_design: 55,
      workforce_ai_readiness: 75, ai_ethics_trust: 75, ai_change_leadership: 70,
    },
    workflows: ["ai_strategy", "governance_design", "board_reporting", "risk_oversight", "culture_change"],
    decisionAuthority: "strategic",
    riskExposure: "high",
    governanceSensitivity: "critical",
    aiUsagePatterns: ["strategic_analysis", "board_reporting", "policy_design", "risk_assessment", "workforce_strategy"],
    contextTags: ["strategic", "governance", "board", "risk", "policy"],
  },

  // v10 additions
  od_specialist: {
    id: "od_specialist",
    gamingFamily: "specialist",
    displayName: "OD Specialist",
    family: "Organisation Development",
    seniority: "senior",
    capabilityWeights: {
      ai_interaction:         0.12,
      ai_output_evaluation:   0.13,
      ai_workflow_design:     0.20,
      workforce_ai_readiness: 0.25,
      ai_ethics_trust:        0.15,
      ai_change_leadership:   0.15,
    },
    minimumSafeThresholds: {
      ai_interaction: 55, ai_output_evaluation: 60, ai_workflow_design: 65,
      workforce_ai_readiness: 70, ai_ethics_trust: 65, ai_change_leadership: 65,
    },
    workflows: ["organisational_design", "culture_diagnostics", "team_effectiveness", "change_architecture", "capability_frameworks"],
    decisionAuthority: "strategic",
    riskExposure: "medium",
    governanceSensitivity: "medium",
    aiUsagePatterns: ["survey_analysis", "org_modelling", "change_impact_assessment", "capability_mapping"],
    contextTags: ["organisational_design", "culture", "change", "capability"],
  },

  shared_services: {
    id: "shared_services",
    gamingFamily: "coordinator",
    displayName: "Shared Services Specialist",
    family: "Shared Services",
    seniority: "mid",
    capabilityWeights: {
      ai_interaction:         0.30,
      ai_output_evaluation:   0.15,
      ai_workflow_design:     0.30,
      workforce_ai_readiness: 0.05,
      ai_ethics_trust:        0.10,
      ai_change_leadership:   0.10,
    },
    minimumSafeThresholds: {
      ai_interaction: 70, ai_output_evaluation: 60, ai_workflow_design: 70,
      workforce_ai_readiness: 50, ai_ethics_trust: 55, ai_change_leadership: 50,
    },
    workflows: ["query_management", "process_standardisation", "self_service_design", "knowledge_management", "sla_management"],
    decisionAuthority: "operational",
    riskExposure: "low",
    governanceSensitivity: "low",
    aiUsagePatterns: ["chatbot_management", "query_routing", "knowledge_base_curation", "process_automation"],
    contextTags: ["shared_services", "process", "automation", "query_management"],
  },

  hris_hr_tech: {
    id: "hris_hr_tech",
    gamingFamily: "specialist",
    displayName: "HRIS / HR Tech Specialist",
    family: "HR Technology",
    seniority: "senior",
    capabilityWeights: {
      ai_interaction:         0.25,
      ai_output_evaluation:   0.15,
      ai_workflow_design:     0.30,
      workforce_ai_readiness: 0.10,
      ai_ethics_trust:        0.10,
      ai_change_leadership:   0.10,
    },
    minimumSafeThresholds: {
      ai_interaction: 70, ai_output_evaluation: 65, ai_workflow_design: 75,
      workforce_ai_readiness: 55, ai_ethics_trust: 60, ai_change_leadership: 55,
    },
    workflows: ["system_implementation", "integration_management", "data_migration", "vendor_evaluation", "automation_design"],
    decisionAuthority: "operational",
    riskExposure: "medium",
    governanceSensitivity: "medium",
    aiUsagePatterns: ["system_configuration", "workflow_automation", "data_analysis", "vendor_assessment", "integration_testing"],
    contextTags: ["technology", "systems", "automation", "integration", "data"],
  },

  // Default fallback
  hr_professional: {
    id: "hr_professional",
    gamingFamily: "generalist",
    displayName: "HR Professional",
    family: "General",
    seniority: "mid",
    capabilityWeights: {
      ai_interaction:         0.17,
      ai_output_evaluation:   0.17,
      ai_workflow_design:     0.17,
      workforce_ai_readiness: 0.17,
      ai_ethics_trust:        0.16,
      ai_change_leadership:   0.16,
    },
    minimumSafeThresholds: {
      ai_interaction: 60, ai_output_evaluation: 60, ai_workflow_design: 60,
      workforce_ai_readiness: 60, ai_ethics_trust: 60, ai_change_leadership: 60,
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
  // Support format: "role_id::ai_experience" — extract just the role part
  const rolePart = roleHint.includes("::") ? roleHint.split("::")[0].trim() : roleHint;
  // Direct ID match first
  if (rolePart in ROLE_ARCHETYPES) return ROLE_ARCHETYPES[rolePart as keyof typeof ROLE_ARCHETYPES];
  const lower = rolePart.toLowerCase();
  if (lower.includes("chro") || lower.includes("chief") || lower.includes("director") || lower.includes("vp")) return ROLE_ARCHETYPES.hr_leader;
  if (lower.includes("hrbp") || lower.includes("business partner")) return ROLE_ARCHETYPES.hrbp;
  if (lower.includes("talent") || lower.includes("recruit") || lower.includes("ta ") || lower.includes("acquisition")) return ROLE_ARCHETYPES.talent_acquisition;
  if (lower.includes("employee relations") || lower.includes(" er ") || lower.includes("er specialist") || lower.includes("investigation")) return ROLE_ARCHETYPES.er_specialist;
  if (lower.includes("l&d") || lower.includes("learning") || lower.includes("development") || lower.includes("training")) return ROLE_ARCHETYPES.ld_specialist;
  if (lower.includes("analytics") || lower.includes("data") || lower.includes("analyst")) return ROLE_ARCHETYPES.people_analytics;
  if (lower.includes("ops") || lower.includes("operations") || lower.includes("payroll") || lower.includes("systems")) return ROLE_ARCHETYPES.hr_ops;
  if (lower.includes("reward") || lower.includes("compensation") || lower.includes("benefits") || lower.includes("pay")) return ROLE_ARCHETYPES.reward;
  if (lower.includes("advisor") || lower.includes("adviser")) return ROLE_ARCHETYPES.hr_advisor;
  if (lower.includes("generalist")) return ROLE_ARCHETYPES.hr_generalist;
  if (lower.includes("od") || lower.includes("organisation development") || lower.includes("organizational development")) return ROLE_ARCHETYPES.od_specialist;
  if (lower.includes("shared service")) return ROLE_ARCHETYPES.shared_services;
  if (lower.includes("hris") || lower.includes("hr tech") || lower.includes("hr technology")) return ROLE_ARCHETYPES.hris_hr_tech;
  return ROLE_ARCHETYPES.hr_professional;
}
