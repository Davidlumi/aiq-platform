/**
 * Initiative Library — 49 HR AI initiatives (v3 database).
 *
 * Each initiative has:
 *   - id: stable v3 key (e.g. ta_high_volume_hiring)
 *   - label: display name
 *   - description: one-line plain English description
 *   - category: grouping for UI display
 *   - requiredSubFunctions: Section B sub-function keys that must be present (hard gate)
 *   - requiredDataFields: flat field names that must be non-null (hard gate, checked in sectionD)
 *   - softFitFactors: scored factors contributing to fit score (0–100 total)
 *   - timeToValueMonths: typical months to first measurable outcome
 *   - phase: typical implementation phase (1=quick win, 2=core build, 3=strategic)
 *   - caseStudyAnchor: anonymised sector + descriptor
 *   - riskFlagKeys: conditions that trigger a risk flag in the output card
 *   - valueFormulaKey: key in VALUE_FORMULA_REGISTRY
 */

export type InitiativeCategory =
  | "talent_acquisition"
  | "onboarding"
  | "learning_development"
  | "internal_mobility"
  | "performance_management"
  | "employee_experience"
  | "retention"
  | "hr_operations"
  | "workforce_planning"
  | "compensation_reward"
  | "manager_effectiveness"
  | "governance"
  | "frontline_workforce";

export type FitStatus = "STRONG_FIT" | "POSSIBLE_FIT" | "POOR_FIT" | "HARD_GATE_FAIL";

export type SoftFitFactor = {
  key: string;
  label: string;
  /** Section field path to read, e.g. "sectionB.hrSubFunctions" */
  fieldPath: string;
  /** Function name in fitImpactEngine that evaluates this factor */
  evaluator: string;
  /** Max contribution to soft score (all factors sum to 100) */
  maxScore: number;
};

export type InitiativeDefinition = {
  id: string;
  label: string;
  description: string;
  category: InitiativeCategory;
  /** Section B sub-function keys that must be present — hard gate */
  requiredSubFunctions: string[];
  /** Section D field keys that must be non-null — hard gate */
  requiredDataFields: string[];
  /** Soft fit factors scored 0–maxScore */
  softFitFactors: SoftFitFactor[];
  /** Typical months to first measurable outcome */
  timeToValueMonths: { min: number; max: number };
  /** Implementation phase */
  phase: 1 | 2 | 3;
  /** Anonymised case study anchor */
  caseStudyAnchor: string;
  /** Risk flag conditions (evaluated in engine) */
  riskFlagKeys: string[];
  /** Value formula key in valueFormulas.ts */
  valueFormulaKey: string;
};

export const INITIATIVE_LIBRARY: InitiativeDefinition[] = [

  // ─── Talent Acquisition (9 initiatives) ──────────────────────────────────

  {
    id: "ta_high_volume_hiring",
    label: "High-Volume Hiring AI",
    description: "AI-powered screening, ranking, and workflow automation for high-volume roles (>500 hires/year).",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: ["annualHires", "annualApplicationVolume"],
    softFitFactors: [
      { key: "application_volume", label: "Application volume", fieldPath: "sectionD.annualApplicationVolume", evaluator: "scoreApplicationVolume", maxScore: 30 },
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 25 },
      { key: "ats_present", label: "ATS in place", fieldPath: "sectionC.atsSystem", evaluator: "scoreAtspresent", maxScore: 20 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 15 },
      { key: "workforce_composition", label: "Frontline workforce", fieldPath: "sectionI.workforceComposition", evaluator: "scoreFrontlineComposition", maxScore: 10 },
    ],
    timeToValueMonths: { min: 3, max: 6 },
    phase: 1,
    caseStudyAnchor: "Global logistics company (50K+ employees): 50% reduction in time-to-shortlist, 40% reduction in recruiter admin time within 6 months.",
    riskFlagKeys: ["low_application_volume", "no_ats", "poor_data_quality"],
    valueFormulaKey: "ta_high_volume_hiring",
  },

  {
    id: "ta_candidate_chatbot",
    label: "Candidate Engagement Chatbot",
    description: "AI chatbot handling candidate FAQs, status updates, and initial screening conversations 24/7.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 30 },
      { key: "application_volume", label: "Application volume", fieldPath: "sectionD.annualApplicationVolume", evaluator: "scoreApplicationVolume", maxScore: 25 },
      { key: "ats_present", label: "ATS in place", fieldPath: "sectionC.atsSystem", evaluator: "scoreAtspresent", maxScore: 20 },
      { key: "digital_access", label: "Workforce digital access", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreDigitalAccess", maxScore: 15 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 10 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "Global consumer goods company (80K employees): 50% reduction in recruiter screening time, 4× faster candidate response.",
    riskFlagKeys: ["low_hire_volume", "no_ats", "brand_voice_consistency"],
    valueFormulaKey: "ta_candidate_chatbot",
  },

  {
    id: "ta_interview_scheduling",
    label: "Interview Scheduling Automation",
    description: "Automated interview scheduling eliminating back-and-forth coordination, reducing scheduling time by 70–90%.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 35 },
      { key: "admin_time", label: "Admin time per hire", fieldPath: "sectionD.adminTimePerHire", evaluator: "scoreAdminTime", maxScore: 30 },
      { key: "integration_maturity", label: "HR system integration", fieldPath: "sectionC.hrSystemIntegrationMaturity", evaluator: "scoreIntegrationMaturity", maxScore: 20 },
      { key: "geographic_spread", label: "Geographic distribution", fieldPath: "sectionI.geographicDistribution", evaluator: "scoreGeographicSpread", maxScore: 15 },
    ],
    timeToValueMonths: { min: 1, max: 3 },
    phase: 1,
    caseStudyAnchor: "Global hospitality group (40K employees): 80% reduction in scheduling coordination time, 1.5 hours per hire saved within 6 weeks.",
    riskFlagKeys: ["low_hire_volume", "poor_calendar_integration"],
    valueFormulaKey: "ta_interview_scheduling",
  },

  {
    id: "ta_sourcing_matching",
    label: "AI Sourcing & Candidate Matching",
    description: "AI-powered talent sourcing and candidate-to-role matching using skills inference and market data.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "ats_present", label: "ATS in place", fieldPath: "sectionC.atsSystem", evaluator: "scoreAtspresent", maxScore: 25 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 25 },
      { key: "skills_framework", label: "Skills framework status", fieldPath: "sectionI.skillsFrameworkStatus", evaluator: "scoreSkillsFramework", maxScore: 25 },
      { key: "hire_cost", label: "Cost per external hire", fieldPath: "sectionD.costPerExternalHire", evaluator: "scoreHireCost", maxScore: 15 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 10 },
    ],
    timeToValueMonths: { min: 3, max: 5 },
    phase: 2,
    caseStudyAnchor: "European professional services firm (12K employees): 30% improvement in quality-of-hire, 25% reduction in sourcing cost.",
    riskFlagKeys: ["poor_data_quality", "poor_skills_data"],
    valueFormulaKey: "ta_sourcing_matching",
  },

  {
    id: "ta_video_interview_assessment",
    label: "AI Video Interview Assessment",
    description: "Asynchronous video interview platform with AI-assisted scoring, reducing interview time per hire by 30–50%.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 30 },
      { key: "geographic_spread", label: "Geographic distribution", fieldPath: "sectionI.geographicDistribution", evaluator: "scoreGeographicSpread", maxScore: 25 },
      { key: "digital_access", label: "Workforce digital access", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreDigitalAccess", maxScore: 25 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 20 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "Global consumer goods company (80K employees): 75% reduction in interview time, 2× candidate throughput.",
    riskFlagKeys: ["poor_digital_access", "ai_bias_in_assessment"],
    valueFormulaKey: "ta_video_interview_assessment",
  },

  {
    id: "ta_bias_monitoring",
    label: "Hiring Bias Monitoring",
    description: "Continuous monitoring of hiring funnel data for demographic bias patterns with audit trail.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      { key: "regulation", label: "Regulatory environment", fieldPath: "sectionA.sectorSpecificRegulation", evaluator: "scoreRegulation", maxScore: 35 },
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 25 },
      { key: "ethics_capability", label: "AI ethics & trust capability", fieldPath: "sectionG.ai_ethics_trust", evaluator: "scoreEthicsCapability", maxScore: 25 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 15 },
    ],
    timeToValueMonths: { min: 3, max: 6 },
    phase: 1,
    caseStudyAnchor: "UK financial services firm (regulated sector): Regulatory risk reduction, audit-ready hiring process within 4 months.",
    riskFlagKeys: ["low_ethics_capability", "insufficient_hire_volume_for_statistical_significance"],
    valueFormulaKey: "ta_bias_monitoring",
  },

  {
    id: "ta_recruiter_productivity_ai",
    label: "Recruiter Productivity AI",
    description: "AI assistant for recruiters: auto-generating JDs, summarising CVs, drafting comms, and market intelligence.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 35 },
      { key: "ats_present", label: "ATS in place", fieldPath: "sectionC.atsSystem", evaluator: "scoreAtspresent", maxScore: 25 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 25 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 3 },
    phase: 1,
    caseStudyAnchor: "Global professional services firm (20K employees): 25% recruiter productivity uplift, 30% reduction in time-to-shortlist.",
    riskFlagKeys: ["low_hire_volume", "tool_adoption_risk"],
    valueFormulaKey: "ta_recruiter_productivity_ai",
  },

  {
    id: "ta_offer_generation",
    label: "Offer & Contract Generation AI",
    description: "Automated generation of offer letters and employment contracts, reducing offer process time by 60–80%.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing", "hr_operations"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 35 },
      { key: "admin_time", label: "Admin time per hire", fieldPath: "sectionD.adminTimePerHire", evaluator: "scoreAdminTime", maxScore: 30 },
      { key: "regulation", label: "Regulatory complexity", fieldPath: "sectionA.sectorSpecificRegulation", evaluator: "scoreRegulation", maxScore: 20 },
      { key: "integration_maturity", label: "HR system integration", fieldPath: "sectionC.hrSystemIntegrationMaturity", evaluator: "scoreIntegrationMaturity", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "UK professional services firm (3K employees): 70% reduction in offer processing time, 2 hours per hire saved within 3 months.",
    riskFlagKeys: ["low_hire_volume", "complex_regulation_without_legal_review"],
    valueFormulaKey: "ta_offer_generation",
  },

  {
    id: "ta_jd_optimization",
    label: "Job Description Optimisation AI",
    description: "AI-powered JD writing and optimisation for inclusivity, clarity, and search performance.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 35 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 30 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 20 },
      { key: "ethics_capability", label: "AI ethics capability", fieldPath: "sectionG.ai_ethics_trust", evaluator: "scoreEthicsCapability", maxScore: 15 },
    ],
    timeToValueMonths: { min: 1, max: 2 },
    phase: 1,
    caseStudyAnchor: "UK retail group (8K employees): 23% improvement in application quality, 16% increase in diverse applicants.",
    riskFlagKeys: ["brand_voice_consistency"],
    valueFormulaKey: "ta_jd_optimization",
  },

  // ─── Onboarding (4 initiatives) ──────────────────────────────────────────

  {
    id: "on_personalised_journeys",
    label: "Personalised Onboarding Journeys",
    description: "AI-curated onboarding experiences tailored to role, location, and learning style.",
    category: "onboarding",
    requiredSubFunctions: ["resourcing", "learning_development"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 30 },
      { key: "digital_access", label: "Workforce digital access", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreDigitalAccess", maxScore: 25 },
      { key: "lms_present", label: "LMS in place", fieldPath: "sectionC.lmsSystem", evaluator: "scoreLmsPresent", maxScore: 20 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 15 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 10 },
    ],
    timeToValueMonths: { min: 3, max: 6 },
    phase: 1,
    caseStudyAnchor: "US SaaS company (2K employees): 15 days faster time-to-productivity, measurable improvement in 90-day retention within 6 months.",
    riskFlagKeys: ["low_hire_volume", "no_lms", "poor_digital_access"],
    valueFormulaKey: "on_personalised_journeys",
  },

  {
    id: "on_new_hire_chatbot",
    label: "New Hire AI Assistant",
    description: "Conversational AI assistant answering new hire questions 24/7 — from IT setup to benefits enrolment.",
    category: "onboarding",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 30 },
      { key: "digital_access", label: "Workforce digital access", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreDigitalAccess", maxScore: 25 },
      { key: "geographic_spread", label: "Geographic distribution", fieldPath: "sectionI.geographicDistribution", evaluator: "scoreGeographicSpread", maxScore: 25 },
      { key: "hris_present", label: "HRIS in place", fieldPath: "sectionC.hrisSystem", evaluator: "scoreHrisPresent", maxScore: 20 },
    ],
    timeToValueMonths: { min: 2, max: 3 },
    phase: 1,
    caseStudyAnchor: "Global telecoms company (100K employees): 50% reduction in onboarding queries, 4× faster query resolution.",
    riskFlagKeys: ["poor_digital_access", "no_hris"],
    valueFormulaKey: "on_new_hire_chatbot",
  },

  {
    id: "on_documentation_automation",
    label: "Onboarding Documentation Automation",
    description: "Automated generation and management of onboarding paperwork, compliance documents, and welcome packs.",
    category: "onboarding",
    requiredSubFunctions: ["resourcing", "hr_operations"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 35 },
      { key: "hris_present", label: "HRIS in place", fieldPath: "sectionC.hrisSystem", evaluator: "scoreHrisPresent", maxScore: 25 },
      { key: "regulation", label: "Regulatory complexity", fieldPath: "sectionA.sectorSpecificRegulation", evaluator: "scoreRegulation", maxScore: 25 },
      { key: "integration_maturity", label: "HR system integration", fieldPath: "sectionC.hrSystemIntegrationMaturity", evaluator: "scoreIntegrationMaturity", maxScore: 15 },
    ],
    timeToValueMonths: { min: 1, max: 3 },
    phase: 1,
    caseStudyAnchor: "UK professional services firm (5K employees): 65% reduction in onboarding admin, zero compliance documentation errors.",
    riskFlagKeys: ["low_hire_volume", "complex_regulation_without_legal_review", "no_hris"],
    valueFormulaKey: "on_documentation_automation",
  },

  {
    id: "on_buddy_matching",
    label: "AI Buddy & Mentor Matching",
    description: "AI-powered matching of new hires to onboarding buddies based on role, location, background, and interests.",
    category: "onboarding",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 30 },
      { key: "geographic_spread", label: "Geographic distribution", fieldPath: "sectionI.geographicDistribution", evaluator: "scoreGeographicSpread", maxScore: 30 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 25 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
    ],
    timeToValueMonths: { min: 1, max: 2 },
    phase: 1,
    caseStudyAnchor: "US technology company (15K employees): 10% first-year retention improvement, 25% faster time-to-productivity.",
    riskFlagKeys: ["low_hire_volume"],
    valueFormulaKey: "on_buddy_matching",
  },

  // ─── Learning & Development (6 initiatives) ──────────────────────────────

  {
    id: "ld_personalised_learning",
    label: "Personalised Learning Paths",
    description: "AI-curated learning journeys tailored to individual skills gaps, role requirements, and career aspirations.",
    category: "learning_development",
    requiredSubFunctions: ["learning_development"],
    requiredDataFields: ["annualLDSpend"],
    softFitFactors: [
      { key: "ld_spend", label: "Annual L&D spend", fieldPath: "sectionD.annualLDSpend", evaluator: "scoreLDSpend", maxScore: 30 },
      { key: "lms_present", label: "LMS in place", fieldPath: "sectionC.lmsSystem", evaluator: "scoreLmsPresent", maxScore: 25 },
      { key: "digital_access", label: "Workforce digital access", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreDigitalAccess", maxScore: 20 },
      { key: "skills_framework", label: "Skills framework status", fieldPath: "sectionI.skillsFrameworkStatus", evaluator: "scoreSkillsFramework", maxScore: 15 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 10 },
    ],
    timeToValueMonths: { min: 4, max: 8 },
    phase: 2,
    caseStudyAnchor: "Asia-Pacific bank (20K employees): 25% L&D spend efficiency gain, 15% improvement in skills assessment scores within 8 months.",
    riskFlagKeys: ["low_ld_spend", "no_lms", "poor_digital_access"],
    valueFormulaKey: "ld_personalised_learning",
  },

  {
    id: "ld_workforce_reskilling",
    label: "AI-Powered Workforce Reskilling",
    description: "Large-scale reskilling programmes powered by AI skills inference and personalised learning.",
    category: "learning_development",
    requiredSubFunctions: ["learning_development", "talent_management"],
    requiredDataFields: ["annualLDSpend"],
    softFitFactors: [
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreTransformationDirection", maxScore: 35 },
      { key: "skills_framework", label: "Skills framework status", fieldPath: "sectionI.skillsFrameworkStatus", evaluator: "scoreSkillsFramework", maxScore: 30 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 20 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
    ],
    timeToValueMonths: { min: 6, max: 12 },
    phase: 3,
    caseStudyAnchor: "Global technology company (100K employees): $700M reskilling programme, 100K employees reskilled over 3 years.",
    riskFlagKeys: ["low_ld_spend", "poor_skills_data", "poor_change_readiness"],
    valueFormulaKey: "ld_workforce_reskilling",
  },

  {
    id: "ld_ai_coaching",
    label: "AI Coaching Platform",
    description: "Scalable AI coaching for managers and high-potential employees at a fraction of external coaching cost.",
    category: "learning_development",
    requiredSubFunctions: ["learning_development"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "manager_capability", label: "Manager capability", fieldPath: "sectionI.managerCapabilityForInsights", evaluator: "scoreWeakManagerCapability", maxScore: 35 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 30 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 20 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
    ],
    timeToValueMonths: { min: 3, max: 5 },
    phase: 2,
    caseStudyAnchor: "US technology company (8K employees): 4× ROI vs external coaching, 20% manager effectiveness improvement.",
    riskFlagKeys: ["weak_manager_capability", "poor_change_readiness"],
    valueFormulaKey: "ld_ai_coaching",
  },

  {
    id: "ld_compliance_training",
    label: "AI Compliance Training",
    description: "Adaptive compliance training personalised to role risk profile with automated completion tracking.",
    category: "learning_development",
    requiredSubFunctions: ["learning_development"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "regulation", label: "Regulatory environment", fieldPath: "sectionA.sectorSpecificRegulation", evaluator: "scoreRegulation", maxScore: 35 },
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 25 },
      { key: "lms_present", label: "LMS in place", fieldPath: "sectionC.lmsSystem", evaluator: "scoreLmsPresent", maxScore: 25 },
      { key: "workforce_composition", label: "Frontline workforce composition", fieldPath: "sectionI.workforceComposition", evaluator: "scoreFrontlineComposition", maxScore: 8 },
      { key: "frontline_percent", label: "Frontline headcount %", fieldPath: "sectionI.frontlineHeadcountPercent", evaluator: "scoreFrontlinePercent", maxScore: 7 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "UK financial services firm (8K employees): 95% compliance completion rate, 30% reduction in compliance admin.",
    riskFlagKeys: ["no_lms", "poor_digital_access"],
    valueFormulaKey: "ld_compliance_training",
  },

  {
    id: "ld_content_creation",
    label: "AI Learning Content Creation",
    description: "AI-assisted creation of e-learning modules, microlearning, and assessments — 30–50% cost reduction.",
    category: "learning_development",
    requiredSubFunctions: ["learning_development"],
    requiredDataFields: ["annualLDSpend"],
    softFitFactors: [
      { key: "ld_spend", label: "Annual L&D spend", fieldPath: "sectionD.annualLDSpend", evaluator: "scoreLDSpend", maxScore: 35 },
      { key: "lms_present", label: "LMS in place", fieldPath: "sectionC.lmsSystem", evaluator: "scoreLmsPresent", maxScore: 30 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 20 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 3 },
    phase: 1,
    caseStudyAnchor: "Global professional services firm (15K employees): 40% content creation cost reduction, 60% faster time-to-deploy.",
    riskFlagKeys: ["low_ld_spend", "no_lms"],
    valueFormulaKey: "ld_content_creation",
  },

  {
    id: "ld_knowledge_management",
    label: "AI Knowledge Management",
    description: "Intelligent knowledge base surfacing relevant information at the point of need, reducing search time by 30–50%.",
    category: "learning_development",
    requiredSubFunctions: ["learning_development", "hr_operations"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 30 },
      { key: "integration_maturity", label: "HR system integration", fieldPath: "sectionC.hrSystemIntegrationMaturity", evaluator: "scoreIntegrationMaturity", maxScore: 25 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 25 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 20 },
    ],
    timeToValueMonths: { min: 3, max: 5 },
    phase: 2,
    caseStudyAnchor: "Global consulting firm (25K employees): 35% reduction in knowledge search time, 40% faster expert location.",
    riskFlagKeys: ["poor_data_quality", "tool_adoption_risk"],
    valueFormulaKey: "ld_knowledge_management",
  },

  // ─── Internal Mobility (3 initiatives) ───────────────────────────────────

  {
    id: "im_talent_marketplace",
    label: "Internal Talent Marketplace",
    description: "AI-powered platform matching employees to internal roles, projects, and gigs.",
    category: "internal_mobility",
    requiredSubFunctions: ["resourcing", "talent_management"],
    requiredDataFields: ["annualHires", "costPerExternalHire"],
    softFitFactors: [
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 25 },
      { key: "internal_hire_rate", label: "Current internal hire rate", fieldPath: "sectionD.internalHirePercent", evaluator: "scoreInternalHireRate", maxScore: 25 },
      { key: "skills_framework", label: "Skills framework status", fieldPath: "sectionI.skillsFrameworkStatus", evaluator: "scoreSkillsFramework", maxScore: 25 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 25 },
    ],
    timeToValueMonths: { min: 6, max: 12 },
    phase: 2,
    caseStudyAnchor: "European professional services firm (12K employees): 15% reduction in external hires, 10% reduction in contractor spend within 12 months.",
    riskFlagKeys: ["small_org", "low_internal_hire_rate", "poor_skills_data"],
    valueFormulaKey: "im_talent_marketplace",
  },

  {
    id: "im_skills_inference",
    label: "Skills Inference & Workforce Mapping",
    description: "AI-inferred skills taxonomy mapped to workforce, enabling mobility, planning, and development decisions.",
    category: "internal_mobility",
    requiredSubFunctions: ["people_analytics", "talent_management"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 25 },
      { key: "hris_data_years", label: "Years of HRIS data", fieldPath: "sectionC.yearsOfHrisData", evaluator: "scoreHrisDataYears", maxScore: 25 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 25 },
      { key: "pivotal_jobs", label: "Pivotal job families defined", fieldPath: "sectionI.pivotalJobFamilies", evaluator: "scorePivotalJobs", maxScore: 25 },
    ],
    timeToValueMonths: { min: 6, max: 12 },
    phase: 3,
    caseStudyAnchor: "European energy company (18K employees): Skills taxonomy deployed across 80% of workforce, enabling 3× faster internal mobility matching.",
    riskFlagKeys: ["poor_data_quality", "insufficient_hris_data", "small_org"],
    valueFormulaKey: "im_skills_inference",
  },

  {
    id: "im_mentor_matching",
    label: "AI Mentor & Sponsor Matching",
    description: "AI-powered matching of employees to mentors and sponsors based on career goals and development needs.",
    category: "internal_mobility",
    requiredSubFunctions: ["talent_management"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 35 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 30 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 20 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 3 },
    phase: 2,
    caseStudyAnchor: "US technology company (15K employees): 20% retention improvement for mentored employees, 25% career progression acceleration.",
    riskFlagKeys: ["small_org", "poor_change_readiness"],
    valueFormulaKey: "im_mentor_matching",
  },

  // ─── Performance Management (3 initiatives) ──────────────────────────────

  {
    id: "pm_continuous_performance",
    label: "Continuous Performance Management AI",
    description: "AI-supported continuous feedback, check-in facilitation, and performance insights.",
    category: "performance_management",
    requiredSubFunctions: ["performance_management"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 30 },
      { key: "manager_capability", label: "Manager capability", fieldPath: "sectionI.managerCapabilityForInsights", evaluator: "scoreManagerCapability", maxScore: 30 },
      { key: "digital_access", label: "Workforce digital access", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreDigitalAccess", maxScore: 20 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 20 },
    ],
    timeToValueMonths: { min: 6, max: 12 },
    phase: 2,
    caseStudyAnchor: "Global industrial manufacturer (30K employees): 4% productivity uplift across covered population within 12 months of deployment.",
    riskFlagKeys: ["weak_manager_capability", "poor_change_readiness"],
    valueFormulaKey: "pm_continuous_performance",
  },

  {
    id: "pm_review_writing",
    label: "AI Performance Review Writing",
    description: "AI assistance for managers writing performance reviews — generating first drafts and ensuring consistency.",
    category: "performance_management",
    requiredSubFunctions: ["performance_management"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 35 },
      { key: "manager_capability", label: "Manager capability (weak = high need)", fieldPath: "sectionI.managerCapabilityForInsights", evaluator: "scoreWeakManagerCapability", maxScore: 35 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 20 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 10 },
    ],
    timeToValueMonths: { min: 1, max: 3 },
    phase: 1,
    caseStudyAnchor: "Global technology company (25K employees): 60% reduction in review writing time, improved review quality scores.",
    riskFlagKeys: ["weak_manager_capability", "poor_change_readiness"],
    valueFormulaKey: "pm_review_writing",
  },

  {
    id: "pm_okr_goal_alignment",
    label: "OKR & Goal Alignment AI",
    description: "AI-powered OKR setting, cascade, and alignment tool ensuring individual goals connect to business priorities.",
    category: "performance_management",
    requiredSubFunctions: ["performance_management"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 35 },
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 30 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 20 },
      { key: "manager_capability", label: "Manager capability", fieldPath: "sectionI.managerCapabilityForInsights", evaluator: "scoreManagerCapability", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 2,
    caseStudyAnchor: "Global technology company (30K employees): OKR alignment linked to 3% productivity uplift, 30% improvement in goal clarity.",
    riskFlagKeys: ["poor_change_readiness", "weak_manager_capability"],
    valueFormulaKey: "pm_okr_goal_alignment",
  },

  // ─── Employee Experience (4 initiatives) ─────────────────────────────────

  {
    id: "ee_sentiment_listening",
    label: "AI Sentiment & Listening Platform",
    description: "Continuous employee sentiment analysis from surveys and pulse checks enabling proactive intervention.",
    category: "employee_experience",
    requiredSubFunctions: ["employee_experience"],
    requiredDataFields: ["currentEngagementScore"],
    softFitFactors: [
      { key: "engagement_score", label: "Current engagement score", fieldPath: "sectionD.currentEngagementScore", evaluator: "scoreEngagementLevel", maxScore: 30 },
      { key: "digital_access", label: "Workforce digital access", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreDigitalAccess", maxScore: 25 },
      { key: "revenue_data", label: "Revenue data available", fieldPath: "sectionD.annualRevenue", evaluator: "scoreRevenuePresent", maxScore: 25 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 20 },
    ],
    timeToValueMonths: { min: 3, max: 6 },
    phase: 1,
    caseStudyAnchor: "UK retail group (25K employees): 5-point engagement score improvement, measurable reduction in voluntary turnover within 6 months.",
    riskFlagKeys: ["high_engagement_already", "poor_digital_access"],
    valueFormulaKey: "ee_sentiment_listening",
  },

  {
    id: "ee_recognition_rewards",
    label: "AI Recognition & Rewards Platform",
    description: "AI-powered peer recognition and rewards system personalising recognition moments and optimising reward spend.",
    category: "employee_experience",
    requiredSubFunctions: ["employee_experience"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "engagement_score", label: "Current engagement score", fieldPath: "sectionD.currentEngagementScore", evaluator: "scoreEngagementLevel", maxScore: 35 },
      { key: "workforce_composition", label: "Frontline workforce composition", fieldPath: "sectionI.workforceComposition", evaluator: "scoreFrontlineComposition", maxScore: 15 },
      { key: "frontline_percent", label: "Frontline headcount %", fieldPath: "sectionI.frontlineHeadcountPercent", evaluator: "scoreFrontlinePercent", maxScore: 10 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 25 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "Global retail company (50K employees): 8% attrition reduction, 20% engagement uplift.",
    riskFlagKeys: ["high_engagement_already", "poor_change_readiness"],
    valueFormulaKey: "ee_recognition_rewards",
  },

  {
    id: "ee_wellbeing_burnout",
    label: "Wellbeing & Burnout Detection AI",
    description: "AI-powered wellbeing monitoring identifying burnout risk signals and triggering proactive support.",
    category: "employee_experience",
    requiredSubFunctions: ["employee_experience"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "attrition_rate", label: "Voluntary attrition rate", fieldPath: "sectionD.attritionRate", evaluator: "scoreAttritionRate", maxScore: 30 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreTransformationDirection", maxScore: 25 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 25 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 20 },
    ],
    timeToValueMonths: { min: 3, max: 5 },
    phase: 2,
    caseStudyAnchor: "Global professional services firm (20K employees): 1.5 days absence reduction, 20% burnout-driven attrition reduction.",
    riskFlagKeys: ["poor_data_quality", "poor_change_readiness"],
    valueFormulaKey: "ee_wellbeing_burnout",
  },

  {
    id: "ee_internal_comms_ai",
    label: "AI Internal Communications",
    description: "AI-assisted creation and personalisation of internal communications, reducing HR comms time by 30–50%.",
    category: "employee_experience",
    requiredSubFunctions: ["employee_experience"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "geographic_spread", label: "Geographic distribution", fieldPath: "sectionI.geographicDistribution", evaluator: "scoreGeographicSpread", maxScore: 35 },
      { key: "workforce_composition", label: "Frontline workforce", fieldPath: "sectionI.workforceComposition", evaluator: "scoreFrontlineComposition", maxScore: 30 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreTransformationDirection", maxScore: 20 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
    ],
    timeToValueMonths: { min: 1, max: 3 },
    phase: 1,
    caseStudyAnchor: "Global retail company (60K employees): 40% comms time reduction, 25% employee reach improvement.",
    riskFlagKeys: ["brand_voice_consistency", "poor_digital_access"],
    valueFormulaKey: "ee_internal_comms_ai",
  },

  // ─── Retention (3 initiatives) ────────────────────────────────────────────

  {
    id: "rt_flight_risk_prediction",
    label: "Flight Risk Prediction",
    description: "Predictive model identifying employees at risk of leaving 3–6 months in advance.",
    category: "retention",
    requiredSubFunctions: ["people_analytics"],
    requiredDataFields: ["attritionRate"],
    softFitFactors: [
      { key: "hris_data_years", label: "Years of HRIS data", fieldPath: "sectionC.yearsOfHrisData", evaluator: "scoreHrisDataYears", maxScore: 35 },
      { key: "manager_capability", label: "Manager capability for insights", fieldPath: "sectionI.managerCapabilityForInsights", evaluator: "scoreManagerCapability", maxScore: 30 },
      { key: "attrition_rate", label: "Current attrition rate", fieldPath: "sectionD.attritionRate", evaluator: "scoreAttritionRate", maxScore: 20 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 15 },
    ],
    timeToValueMonths: { min: 6, max: 9 },
    phase: 2,
    caseStudyAnchor: "US technology company (15K employees): 20% attrition reduction, ROI realised within 9 months of manager activation.",
    riskFlagKeys: ["insufficient_hris_data", "weak_manager_capability", "low_attrition_rate"],
    valueFormulaKey: "rt_flight_risk_prediction",
  },

  {
    id: "rt_stay_interview_ai",
    label: "AI Stay Interview Programme",
    description: "AI-facilitated stay interviews surfacing retention risk factors and personalising retention actions.",
    category: "retention",
    requiredSubFunctions: ["employee_experience"],
    requiredDataFields: ["attritionRate"],
    softFitFactors: [
      { key: "attrition_rate", label: "Current attrition rate", fieldPath: "sectionD.attritionRate", evaluator: "scoreAttritionRate", maxScore: 35 },
      { key: "manager_capability", label: "Manager capability", fieldPath: "sectionI.managerCapabilityForInsights", evaluator: "scoreManagerCapability", maxScore: 30 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreTransformationDirection", maxScore: 20 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 3 },
    phase: 1,
    caseStudyAnchor: "UK financial services firm (10K employees): 12% retention improvement from stay interviews, 15% at-risk employee retention.",
    riskFlagKeys: ["weak_manager_capability", "low_attrition_rate"],
    valueFormulaKey: "rt_stay_interview_ai",
  },

  {
    id: "rt_exit_intelligence",
    label: "Exit Intelligence & Analysis",
    description: "AI analysis of exit interview data identifying systemic retention risk factors.",
    category: "retention",
    requiredSubFunctions: ["people_analytics"],
    requiredDataFields: ["attritionRate"],
    softFitFactors: [
      { key: "attrition_rate", label: "Current attrition rate", fieldPath: "sectionD.attritionRate", evaluator: "scoreAttritionRate", maxScore: 40 },
      { key: "hris_data_years", label: "Years of HRIS data", fieldPath: "sectionC.yearsOfHrisData", evaluator: "scoreHrisDataYears", maxScore: 30 },
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 30 },
    ],
    timeToValueMonths: { min: 2, max: 3 },
    phase: 1,
    caseStudyAnchor: "Global retail company (30K employees): 8% structural attrition reduction, 20% improvement in exit insight quality.",
    riskFlagKeys: ["low_attrition_rate", "insufficient_hris_data"],
    valueFormulaKey: "rt_exit_intelligence",
  },

  // ─── HR Operations (3 initiatives) ───────────────────────────────────────

  {
    id: "hr_virtual_assistant",
    label: "HR Virtual Assistant",
    description: "AI-powered HR helpdesk handling employee queries on policies, benefits, payroll, and processes.",
    category: "hr_operations",
    requiredSubFunctions: ["hr_operations"],
    requiredDataFields: ["monthlyHrQueryVolume"],
    softFitFactors: [
      { key: "query_volume", label: "Monthly HR query volume", fieldPath: "sectionD.monthlyHrQueryVolume", evaluator: "scoreQueryVolume", maxScore: 35 },
      { key: "digital_access", label: "Workforce digital access", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreDigitalAccess", maxScore: 25 },
      { key: "hris_present", label: "HRIS in place", fieldPath: "sectionC.hrisSystem", evaluator: "scoreHrisPresent", maxScore: 25 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "UK financial services firm (8K employees): 60% query deflection rate, 2.5 FTE redeployed to strategic work within 4 months.",
    riskFlagKeys: ["low_query_volume", "poor_digital_access", "no_hris"],
    valueFormulaKey: "hr_virtual_assistant",
  },

  {
    id: "hr_policy_generation",
    label: "AI Policy & Document Generation",
    description: "AI-assisted creation and maintenance of HR policies, procedures, and communications.",
    category: "hr_operations",
    requiredSubFunctions: ["hr_operations"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "regulation", label: "Regulatory complexity", fieldPath: "sectionA.sectorSpecificRegulation", evaluator: "scoreRegulation", maxScore: 30 },
      { key: "geographic_spread", label: "Geographic distribution", fieldPath: "sectionI.geographicDistribution", evaluator: "scoreGeographicSpread", maxScore: 30 },
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 25 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 15 },
    ],
    timeToValueMonths: { min: 1, max: 3 },
    phase: 1,
    caseStudyAnchor: "UK professional services firm (5K employees): 50% policy writing time reduction, 30% reduction in policy inconsistencies.",
    riskFlagKeys: ["complex_regulation_without_legal_review"],
    valueFormulaKey: "hr_policy_generation",
  },

  {
    id: "hr_benefits_decision_support",
    label: "Benefits Decision Support AI",
    description: "AI-powered benefits guidance helping employees choose optimal packages, reducing queries by 40–60%.",
    category: "hr_operations",
    requiredSubFunctions: ["hr_operations"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 35 },
      { key: "hris_present", label: "HRIS in place", fieldPath: "sectionC.hrisSystem", evaluator: "scoreHrisPresent", maxScore: 30 },
      { key: "geographic_spread", label: "Geographic distribution", fieldPath: "sectionI.geographicDistribution", evaluator: "scoreGeographicSpread", maxScore: 20 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 3 },
    phase: 1,
    caseStudyAnchor: "Global financial services firm (20K employees): 55% query deflection, 20% benefits utilisation improvement.",
    riskFlagKeys: ["no_hris", "poor_digital_access"],
    valueFormulaKey: "hr_benefits_decision_support",
  },

  // ─── Workforce Planning (4 initiatives) ──────────────────────────────────

  {
    id: "wp_workforce_planning",
    label: "AI Workforce Planning",
    description: "AI-powered demand forecasting and supply modelling improving planning accuracy and reducing reactive hiring.",
    category: "workforce_planning",
    requiredSubFunctions: ["people_analytics", "talent_management"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 30 },
      { key: "hris_data_years", label: "Years of HRIS data", fieldPath: "sectionC.yearsOfHrisData", evaluator: "scoreHrisDataYears", maxScore: 25 },
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 25 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreTransformationDirection", maxScore: 20 },
    ],
    timeToValueMonths: { min: 6, max: 9 },
    phase: 3,
    caseStudyAnchor: "Global pharmaceutical company (40K employees): 15% reduction in reactive hiring, 20% workforce planning efficiency improvement.",
    riskFlagKeys: ["poor_data_quality", "insufficient_hris_data"],
    valueFormulaKey: "wp_workforce_planning",
  },

  {
    id: "wp_succession_planning",
    label: "AI Succession Planning",
    description: "AI-powered identification and development of succession candidates for critical roles.",
    category: "workforce_planning",
    requiredSubFunctions: ["talent_management"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 30 },
      { key: "skills_framework", label: "Skills framework status", fieldPath: "sectionI.skillsFrameworkStatus", evaluator: "scoreSkillsFramework", maxScore: 25 },
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 25 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 20 },
    ],
    timeToValueMonths: { min: 4, max: 6 },
    phase: 2,
    caseStudyAnchor: "Global industrial company (30K employees): 30% improvement in succession readiness, 25% reduction in critical role vacancy time.",
    riskFlagKeys: ["poor_data_quality", "poor_skills_data"],
    valueFormulaKey: "wp_succession_planning",
  },

  {
    id: "wp_org_design",
    label: "AI Organisation Design",
    description: "AI-powered analysis of organisational structure, spans of control, and reporting lines.",
    category: "workforce_planning",
    requiredSubFunctions: ["people_analytics"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "business_direction", label: "Business direction (restructuring)", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreTransformationDirection", maxScore: 40 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 25 },
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 25 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 10 },
    ],
    timeToValueMonths: { min: 4, max: 8 },
    phase: 3,
    caseStudyAnchor: "Global financial services firm (50K employees): 2% efficiency gain from span optimisation, 15% cost reduction from org design.",
    riskFlagKeys: ["poor_data_quality", "poor_change_readiness"],
    valueFormulaKey: "wp_org_design",
  },

  {
    id: "wp_location_strategy",
    label: "AI Location & Talent Strategy",
    description: "AI analysis of talent availability, cost, and competitive dynamics by location.",
    category: "workforce_planning",
    requiredSubFunctions: ["people_analytics"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "geographic_spread", label: "Geographic distribution", fieldPath: "sectionI.geographicDistribution", evaluator: "scoreGeographicSpread", maxScore: 35 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 30 },
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 20 },
      { key: "hire_cost", label: "Cost per external hire", fieldPath: "sectionD.costPerExternalHire", evaluator: "scoreHireCost", maxScore: 15 },
    ],
    timeToValueMonths: { min: 3, max: 5 },
    phase: 2,
    caseStudyAnchor: "Global professional services firm (25K employees): 10% hiring cost reduction through location strategy, 15% talent cost optimisation.",
    riskFlagKeys: ["poor_data_quality"],
    valueFormulaKey: "wp_location_strategy",
  },

  // ─── Compensation & Reward (2 initiatives) ───────────────────────────────

  {
    id: "cr_pay_equity",
    label: "Pay Equity Analysis AI",
    description: "Continuous AI-powered pay equity monitoring identifying unexplained pay gaps before regulatory scrutiny.",
    category: "compensation_reward",
    requiredSubFunctions: ["reward"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "regulation", label: "Regulatory environment", fieldPath: "sectionA.sectorSpecificRegulation", evaluator: "scoreRegulation", maxScore: 35 },
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 30 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 20 },
      { key: "ethics_capability", label: "AI ethics capability", fieldPath: "sectionG.ai_ethics_trust", evaluator: "scoreEthicsCapability", maxScore: 15 },
    ],
    timeToValueMonths: { min: 3, max: 5 },
    phase: 2,
    caseStudyAnchor: "US technology company (50K employees): $3M pay equity remediation avoided, 100% pay equity reporting compliance.",
    riskFlagKeys: ["complex_regulation_without_legal_review", "poor_data_quality"],
    valueFormulaKey: "cr_pay_equity",
  },

  {
    id: "cr_compensation_recommendations",
    label: "AI Compensation Recommendations",
    description: "AI-powered compensation benchmarking and recommendation engine for annual review cycles.",
    category: "compensation_reward",
    requiredSubFunctions: ["reward"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 35 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 30 },
      { key: "manager_capability", label: "Manager capability (weak = high need)", fieldPath: "sectionI.managerCapabilityForInsights", evaluator: "scoreWeakManagerCapability", maxScore: 20 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
    ],
    timeToValueMonths: { min: 3, max: 5 },
    phase: 2,
    caseStudyAnchor: "Global technology company (25K employees): 50% comp cycle time reduction, 30% improvement in pay decision consistency.",
    riskFlagKeys: ["poor_data_quality", "complex_regulation_without_legal_review"],
    valueFormulaKey: "cr_compensation_recommendations",
  },

  // ─── Manager Effectiveness (2 initiatives) ───────────────────────────────

  {
    id: "mg_manager_copilot",
    label: "Manager AI Copilot",
    description: "AI assistant for managers: team insights, check-in prompts, performance nudges, and admin automation.",
    category: "manager_effectiveness",
    requiredSubFunctions: ["talent_management"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "manager_capability", label: "Manager capability (weak = high need)", fieldPath: "sectionI.managerCapabilityForInsights", evaluator: "scoreWeakManagerCapability", maxScore: 35 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 25 },
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 15 },
      { key: "frontline_percent", label: "Frontline headcount %", fieldPath: "sectionI.frontlineHeadcountPercent", evaluator: "scoreFrontlinePercent", maxScore: 10 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
    ],
    timeToValueMonths: { min: 3, max: 5 },
    phase: 2,
    caseStudyAnchor: "Global technology company (50K employees): 4h/week manager time recovery, 20% manager effectiveness improvement.",
    riskFlagKeys: ["weak_manager_capability", "poor_change_readiness"],
    valueFormulaKey: "mg_manager_copilot",
  },

  {
    id: "mg_difficult_conversations",
    label: "Difficult Conversations AI Coach",
    description: "AI coaching tool helping managers prepare for difficult conversations — performance issues, wellbeing concerns.",
    category: "manager_effectiveness",
    requiredSubFunctions: ["talent_management"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "manager_capability", label: "Manager capability (weak = high need)", fieldPath: "sectionI.managerCapabilityForInsights", evaluator: "scoreWeakManagerCapability", maxScore: 40 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreTransformationDirection", maxScore: 30 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 20 },
      { key: "attrition_rate", label: "Attrition rate", fieldPath: "sectionD.attritionRate", evaluator: "scoreAttritionRate", maxScore: 10 },
    ],
    timeToValueMonths: { min: 2, max: 3 },
    phase: 1,
    caseStudyAnchor: "Global professional services firm (15K employees): 25% reduction in HR escalations, 30% improvement in manager confidence.",
    riskFlagKeys: ["weak_manager_capability", "poor_change_readiness"],
    valueFormulaKey: "mg_difficult_conversations",
  },

  // ─── Governance (2 initiatives) ───────────────────────────────────────────

  {
    id: "gv_ai_governance",
    label: "HR AI Governance Framework",
    description: "Structured governance framework for responsible AI deployment in HR — ethics, bias, explainability, compliance.",
    category: "governance",
    requiredSubFunctions: ["people_analytics"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "ethics_capability", label: "AI ethics & trust capability", fieldPath: "sectionG.ai_ethics_trust", evaluator: "scoreEthicsCapability", maxScore: 35 },
      { key: "regulation", label: "Regulatory environment", fieldPath: "sectionA.sectorSpecificRegulation", evaluator: "scoreRegulation", maxScore: 30 },
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 20 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "UK financial services firm (regulated sector): 60% faster AI deployment with governance, zero regulatory incidents.",
    riskFlagKeys: ["low_ethics_capability", "complex_regulation_without_legal_review"],
    valueFormulaKey: "gv_ai_governance",
  },

  {
    id: "gv_cross_cutting_bias_audit",
    label: "Cross-Cutting AI Bias Audit",
    description: "Systematic audit of all HR AI tools for demographic bias with ongoing monitoring and regulatory reporting.",
    category: "governance",
    requiredSubFunctions: ["people_analytics"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "regulation", label: "Regulatory environment", fieldPath: "sectionA.sectorSpecificRegulation", evaluator: "scoreRegulation", maxScore: 35 },
      { key: "ethics_capability", label: "AI ethics & trust capability", fieldPath: "sectionG.ai_ethics_trust", evaluator: "scoreEthicsCapability", maxScore: 30 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 20 },
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 15 },
    ],
    timeToValueMonths: { min: 3, max: 5 },
    phase: 2,
    caseStudyAnchor: "Global technology company (100K employees): Bias audit led to model rebuild, 16% diversity improvement post-audit.",
    riskFlagKeys: ["low_ethics_capability", "poor_data_quality"],
    valueFormulaKey: "gv_cross_cutting_bias_audit",
  },

  // ─── Frontline Workforce (4 initiatives) ─────────────────────────────────

  {
    id: "fw_shift_scheduling_ai",
    label: "AI Shift Scheduling",
    description: "AI-optimised shift scheduling balancing labour cost, compliance, and employee preferences.",
    category: "frontline_workforce",
    requiredSubFunctions: ["hr_operations"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "workforce_composition", label: "Frontline workforce composition", fieldPath: "sectionI.workforceComposition", evaluator: "scoreFrontlineComposition", maxScore: 25 },
      { key: "frontline_percent", label: "Frontline headcount %", fieldPath: "sectionI.frontlineHeadcountPercent", evaluator: "scoreFrontlinePercent", maxScore: 15 },
      { key: "sites_count", label: "Number of UK sites", fieldPath: "sectionA.ukSitesCount", evaluator: "scoreSitesCount", maxScore: 30 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 20 },
      { key: "integration_maturity", label: "HR system integration", fieldPath: "sectionC.hrSystemIntegrationMaturity", evaluator: "scoreIntegrationMaturity", maxScore: 10 },
    ],
    timeToValueMonths: { min: 3, max: 5 },
    phase: 2,
    caseStudyAnchor: "Global retail company (200K employees): 3% labour cost reduction, 15% overtime reduction.",
    riskFlagKeys: ["poor_data_quality", "poor_calendar_integration"],
    valueFormulaKey: "fw_shift_scheduling_ai",
  },

  {
    id: "fw_frontline_learning",
    label: "Frontline Learning Platform",
    description: "Mobile-first microlearning platform for frontline workers improving compliance and operational performance.",
    category: "frontline_workforce",
    requiredSubFunctions: ["learning_development"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "workforce_composition", label: "Frontline workforce composition", fieldPath: "sectionI.workforceComposition", evaluator: "scoreFrontlineComposition", maxScore: 20 },
      { key: "frontline_percent", label: "Frontline headcount %", fieldPath: "sectionI.frontlineHeadcountPercent", evaluator: "scoreFrontlinePercent", maxScore: 15 },
      { key: "digital_access", label: "Workforce digital access", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreDigitalAccess", maxScore: 30 },
      { key: "regulation", label: "Regulatory environment", fieldPath: "sectionA.sectorSpecificRegulation", evaluator: "scoreRegulation", maxScore: 20 },
      { key: "ld_spend", label: "Annual L&D spend", fieldPath: "sectionD.annualLDSpend", evaluator: "scoreLDSpend", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "Global retail company (100K employees): 3× compliance completion improvement, 10% operational performance uplift.",
    riskFlagKeys: ["poor_digital_access", "no_lms"],
    valueFormulaKey: "fw_frontline_learning",
  },

  {
    id: "fw_frontline_communication",
    label: "Frontline Communication Platform",
    description: "Mobile-first communication and engagement platform for frontline workers without desk access.",
    category: "frontline_workforce",
    requiredSubFunctions: ["employee_experience"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "workforce_composition", label: "Frontline workforce composition", fieldPath: "sectionI.workforceComposition", evaluator: "scoreFrontlineComposition", maxScore: 20 },
      { key: "frontline_percent", label: "Frontline headcount %", fieldPath: "sectionI.frontlineHeadcountPercent", evaluator: "scoreFrontlinePercent", maxScore: 15 },
      { key: "digital_access", label: "Workforce digital access", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreDigitalAccess", maxScore: 30 },
      { key: "geographic_spread", label: "Geographic distribution", fieldPath: "sectionI.geographicDistribution", evaluator: "scoreGeographicSpread", maxScore: 20 },
      { key: "attrition_rate", label: "Attrition rate", fieldPath: "sectionD.attritionRate", evaluator: "scoreAttritionRate", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 3 },
    phase: 1,
    caseStudyAnchor: "Global retail company (80K employees): 10% frontline attrition reduction, 25% employee reach improvement.",
    riskFlagKeys: ["poor_digital_access"],
    valueFormulaKey: "fw_frontline_communication",
  },

  {
    id: "fw_store_manager_assistant",
    label: "Store / Site Manager AI Assistant",
    description: "AI assistant for store and site managers: team insights, scheduling recommendations, and HR admin automation.",
    category: "frontline_workforce",
    requiredSubFunctions: ["hr_operations", "talent_management"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "workforce_composition", label: "Frontline workforce composition", fieldPath: "sectionI.workforceComposition", evaluator: "scoreFrontlineComposition", maxScore: 20 },
      { key: "frontline_percent", label: "Frontline headcount %", fieldPath: "sectionI.frontlineHeadcountPercent", evaluator: "scoreFrontlinePercent", maxScore: 10 },
      { key: "sites_count", label: "Number of UK sites", fieldPath: "sectionA.ukSitesCount", evaluator: "scoreSitesCount", maxScore: 30 },
      { key: "manager_capability", label: "Manager capability (weak = high need)", fieldPath: "sectionI.managerCapabilityForInsights", evaluator: "scoreWeakManagerCapability", maxScore: 25 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 15 },
    ],
    timeToValueMonths: { min: 3, max: 5 },
    phase: 2,
    caseStudyAnchor: "Global retail company (200K employees): 5h/week manager time recovery, 15% manager retention improvement.",
    riskFlagKeys: ["weak_manager_capability", "poor_data_quality"],
    valueFormulaKey: "fw_store_manager_assistant",
  },

];

/** Lookup by id */
export function getInitiative(id: string): InitiativeDefinition | undefined {
  return INITIATIVE_LIBRARY.find((i) => i.id === id);
}

/** All initiative ids */
export const INITIATIVE_IDS = INITIATIVE_LIBRARY.map((i) => i.id);
