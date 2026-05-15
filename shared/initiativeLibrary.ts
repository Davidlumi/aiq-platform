/**
 * Initiative Library — 12 AI initiatives with full metadata for the Fit+Impact engine.
 *
 * Each initiative has:
 *   - id: stable key used in builder output and builder_section_states_json
 *   - label: display name
 *   - description: one-line plain English description
 *   - category: grouping for UI display
 *   - requiredSubFunctions: Section B sub-functions that must be present (hard gate)
 *   - requiredDataFields: Section D/J fields that must be non-null (hard gate)
 *   - softFitFactors: scored factors that contribute to the fit score (0–100)
 *   - timeToValue: typical months to first measurable outcome
 *   - phase: typical implementation phase (1=quick win, 2=core build, 3=strategic)
 *   - caseStudyAnchor: anonymised sector + descriptor (no company names)
 *   - riskFlags: conditions that trigger a risk flag in the output card
 */

export type InitiativeCategory =
  | "talent_acquisition"
  | "talent_management"
  | "learning_development"
  | "hr_operations"
  | "workforce_intelligence"
  | "employee_experience";

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
  /** Section D/J field keys that must be non-null — hard gate */
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
  // ─── 1. High-Volume Hiring AI ────────────────────────────────────────────
  {
    id: "high_volume_hiring_ai",
    label: "High-Volume Hiring AI",
    description: "AI-powered screening, shortlisting and scheduling for high-volume recruitment pipelines.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: ["annualApplicationVolume", "annualHires", "adminTimePerHire"],
    softFitFactors: [
      {
        key: "application_volume",
        label: "Application volume",
        fieldPath: "sectionD.annualApplicationVolume",
        evaluator: "scoreApplicationVolume",
        maxScore: 30,
      },
      {
        key: "ats_present",
        label: "ATS in place",
        fieldPath: "sectionC.atsSystem",
        evaluator: "scoreAtspresent",
        maxScore: 20,
      },
      {
        key: "digital_access",
        label: "Workforce digital access",
        fieldPath: "sectionC.workforceDigitalAccess",
        evaluator: "scoreDigitalAccess",
        maxScore: 15,
      },
      {
        key: "data_quality",
        label: "Data quality",
        fieldPath: "sectionC.dataQualityRating",
        evaluator: "scoreDataQuality",
        maxScore: 20,
      },
      {
        key: "integration_maturity",
        label: "HR system integration maturity",
        fieldPath: "sectionC.hrSystemIntegrationMaturity",
        evaluator: "scoreIntegrationMaturity",
        maxScore: 15,
      },
    ],
    timeToValueMonths: { min: 3, max: 6 },
    phase: 1,
    caseStudyAnchor: "Global logistics company (50K+ employees): 50% reduction in time-to-shortlist, 40% reduction in recruiter admin time within 6 months.",
    riskFlagKeys: ["low_application_volume", "no_ats", "poor_data_quality"],
    valueFormulaKey: "highVolumeHiring",
  },

  // ─── 2. HR Chatbot / Operations AI ───────────────────────────────────────
  {
    id: "hr_chatbot",
    label: "HR Chatbot & Operations AI",
    description: "Conversational AI handling employee HR queries, policy lookups and self-service transactions.",
    category: "hr_operations",
    requiredSubFunctions: ["hr_operations"],
    requiredDataFields: ["monthlyHrQueryVolume"],
    softFitFactors: [
      {
        key: "query_volume",
        label: "Monthly HR query volume",
        fieldPath: "sectionD.monthlyHrQueryVolume",
        evaluator: "scoreQueryVolume",
        maxScore: 35,
      },
      {
        key: "digital_access",
        label: "Workforce digital access",
        fieldPath: "sectionC.workforceDigitalAccess",
        evaluator: "scoreDigitalAccess",
        maxScore: 25,
      },
      {
        key: "hris_present",
        label: "HRIS in place",
        fieldPath: "sectionC.hrisSystem",
        evaluator: "scoreHrisPresent",
        maxScore: 25,
      },
      {
        key: "data_quality",
        label: "Data quality",
        fieldPath: "sectionC.dataQualityRating",
        evaluator: "scoreDataQuality",
        maxScore: 15,
      },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "UK financial services firm (8K employees): 60% query deflection rate, 2.5 FTE redeployed to strategic work within 4 months.",
    riskFlagKeys: ["low_query_volume", "poor_digital_access", "no_hris"],
    valueFormulaKey: "hrChatbot",
  },

  // ─── 3. Internal Talent Marketplace ──────────────────────────────────────
  {
    id: "internal_talent_marketplace",
    label: "Internal Talent Marketplace",
    description: "AI-powered internal mobility platform matching employees to projects, gigs and open roles.",
    category: "talent_management",
    requiredSubFunctions: ["resourcing", "talent_management"],
    requiredDataFields: ["annualHires", "costPerExternalHire"],
    softFitFactors: [
      {
        key: "headcount",
        label: "Organisation size",
        fieldPath: "sectionA.totalHeadcount",
        evaluator: "scoreHeadcount",
        maxScore: 25,
      },
      {
        key: "internal_hire_rate",
        label: "Current internal hire rate",
        fieldPath: "sectionD.internalHirePercent",
        evaluator: "scoreInternalHireRate",
        maxScore: 25,
      },
      {
        key: "skills_data",
        label: "Skills data availability",
        fieldPath: "sectionC.dataQualityRating",
        evaluator: "scoreDataQuality",
        maxScore: 25,
      },
      {
        key: "workforce_type",
        label: "Workforce work type",
        fieldPath: "sectionI.workforceWorkType",
        evaluator: "scoreWorkforceType",
        maxScore: 25,
      },
    ],
    timeToValueMonths: { min: 6, max: 12 },
    phase: 2,
    caseStudyAnchor: "European professional services firm (12K employees): 15% reduction in external hires, 10% reduction in contractor spend within 12 months.",
    riskFlagKeys: ["small_org", "low_internal_hire_rate", "poor_skills_data"],
    valueFormulaKey: "internalMobility",
  },

  // ─── 4. Attrition Prediction ──────────────────────────────────────────────
  {
    id: "attrition_prediction",
    label: "Attrition Prediction & Intervention",
    description: "ML models predicting flight risk with manager-triggered retention interventions.",
    category: "workforce_intelligence",
    requiredSubFunctions: ["people_analytics"],
    requiredDataFields: ["attritionRate", "annualHires"],
    softFitFactors: [
      {
        key: "hris_data_years",
        label: "Years of HRIS data",
        fieldPath: "sectionC.yearsOfHrisData",
        evaluator: "scoreHrisDataYears",
        maxScore: 35,
      },
      {
        key: "manager_capability",
        label: "Manager capability for insights",
        fieldPath: "sectionI.managerCapabilityForInsights",
        evaluator: "scoreManagerCapability",
        maxScore: 30,
      },
      {
        key: "attrition_rate",
        label: "Current attrition rate",
        fieldPath: "sectionD.attritionRate",
        evaluator: "scoreAttritionRate",
        maxScore: 20,
      },
      {
        key: "data_quality",
        label: "Data quality",
        fieldPath: "sectionC.dataQualityRating",
        evaluator: "scoreDataQuality",
        maxScore: 15,
      },
    ],
    timeToValueMonths: { min: 6, max: 9 },
    phase: 2,
    caseStudyAnchor: "US technology company (15K employees): 20% attrition reduction, ROI realised within 9 months of manager activation.",
    riskFlagKeys: ["insufficient_hris_data", "weak_manager_capability", "low_attrition_rate"],
    valueFormulaKey: "attritionPrediction",
  },

  // ─── 5. L&D Personalisation ───────────────────────────────────────────────
  {
    id: "ld_personalisation",
    label: "L&D Personalisation Engine",
    description: "AI-curated learning pathways personalised to role, skill gaps and learning style.",
    category: "learning_development",
    requiredSubFunctions: ["learning_development"],
    requiredDataFields: ["annualLDSpend"],
    softFitFactors: [
      {
        key: "ld_spend",
        label: "Annual L&D spend",
        fieldPath: "sectionD.annualLDSpend",
        evaluator: "scoreLDSpend",
        maxScore: 30,
      },
      {
        key: "lms_present",
        label: "LMS in place",
        fieldPath: "sectionC.lmsSystem",
        evaluator: "scoreLmsPresent",
        maxScore: 25,
      },
      {
        key: "digital_access",
        label: "Workforce digital access",
        fieldPath: "sectionC.workforceDigitalAccess",
        evaluator: "scoreDigitalAccess",
        maxScore: 25,
      },
      {
        key: "data_quality",
        label: "Data quality",
        fieldPath: "sectionC.dataQualityRating",
        evaluator: "scoreDataQuality",
        maxScore: 20,
      },
    ],
    timeToValueMonths: { min: 4, max: 8 },
    phase: 2,
    caseStudyAnchor: "Asia-Pacific bank (20K employees): 25% L&D spend efficiency gain, 15% improvement in skills assessment scores within 8 months.",
    riskFlagKeys: ["low_ld_spend", "no_lms", "poor_digital_access"],
    valueFormulaKey: "ldPersonalisation",
  },

  // ─── 6. Performance AI ────────────────────────────────────────────────────
  {
    id: "performance_ai",
    label: "AI-Augmented Performance Management",
    description: "Continuous performance signals, AI-generated feedback prompts and calibration support.",
    category: "talent_management",
    requiredSubFunctions: ["performance_management"],
    requiredDataFields: [],
    softFitFactors: [
      {
        key: "headcount",
        label: "Organisation size",
        fieldPath: "sectionA.totalHeadcount",
        evaluator: "scoreHeadcount",
        maxScore: 30,
      },
      {
        key: "manager_capability",
        label: "Manager capability",
        fieldPath: "sectionI.managerCapabilityForInsights",
        evaluator: "scoreManagerCapability",
        maxScore: 30,
      },
      {
        key: "digital_access",
        label: "Workforce digital access",
        fieldPath: "sectionC.workforceDigitalAccess",
        evaluator: "scoreDigitalAccess",
        maxScore: 20,
      },
      {
        key: "culture_change_readiness",
        label: "Culture change readiness",
        fieldPath: "sectionF.changeReadiness",
        evaluator: "scoreChangeReadiness",
        maxScore: 20,
      },
    ],
    timeToValueMonths: { min: 6, max: 12 },
    phase: 2,
    caseStudyAnchor: "Global industrial manufacturer (30K employees): 4% productivity uplift across covered population within 12 months of deployment.",
    riskFlagKeys: ["weak_manager_capability", "poor_change_readiness"],
    valueFormulaKey: "performanceAI",
  },

  // ─── 7. Engagement AI / Sentiment Analysis ────────────────────────────────
  {
    id: "engagement_ai",
    label: "Engagement AI & Sentiment Analysis",
    description: "Continuous listening and AI-powered theme analysis replacing annual survey cycles.",
    category: "employee_experience",
    requiredSubFunctions: ["employee_experience"],
    requiredDataFields: ["currentEngagementScore"],
    softFitFactors: [
      {
        key: "engagement_score",
        label: "Current engagement score",
        fieldPath: "sectionD.currentEngagementScore",
        evaluator: "scoreEngagementLevel",
        maxScore: 30,
      },
      {
        key: "digital_access",
        label: "Workforce digital access",
        fieldPath: "sectionC.workforceDigitalAccess",
        evaluator: "scoreDigitalAccess",
        maxScore: 25,
      },
      {
        key: "revenue_data",
        label: "Revenue data available",
        fieldPath: "sectionD.annualRevenue",
        evaluator: "scoreRevenuePresent",
        maxScore: 25,
      },
      {
        key: "data_quality",
        label: "Data quality",
        fieldPath: "sectionC.dataQualityRating",
        evaluator: "scoreDataQuality",
        maxScore: 20,
      },
    ],
    timeToValueMonths: { min: 3, max: 6 },
    phase: 1,
    caseStudyAnchor: "UK retail group (25K employees): 5-point engagement score improvement, measurable reduction in voluntary turnover within 6 months.",
    riskFlagKeys: ["high_engagement_already", "poor_digital_access"],
    valueFormulaKey: "engagementAI",
  },

  // ─── 8. Offer & Contract Generation ──────────────────────────────────────
  {
    id: "offer_contract_generation",
    label: "Offer & Contract Generation AI",
    description: "AI-generated offer letters and employment contracts with compliance checks.",
    category: "hr_operations",
    requiredSubFunctions: ["resourcing", "hr_operations"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      {
        key: "hire_volume",
        label: "Annual hire volume",
        fieldPath: "sectionD.annualHires",
        evaluator: "scoreHireVolume",
        maxScore: 35,
      },
      {
        key: "admin_time",
        label: "Admin time per hire",
        fieldPath: "sectionD.adminTimePerHire",
        evaluator: "scoreAdminTime",
        maxScore: 30,
      },
      {
        key: "regulation",
        label: "Regulatory complexity",
        fieldPath: "sectionA.sectorSpecificRegulation",
        evaluator: "scoreRegulation",
        maxScore: 20,
      },
      {
        key: "integration_maturity",
        label: "HR system integration",
        fieldPath: "sectionC.hrSystemIntegrationMaturity",
        evaluator: "scoreIntegrationMaturity",
        maxScore: 15,
      },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "UK professional services firm (3K employees): 70% reduction in offer processing time, 2 hours per hire saved within 3 months.",
    riskFlagKeys: ["low_hire_volume", "complex_regulation_without_legal_review"],
    valueFormulaKey: "offerGeneration",
  },

  // ─── 9. Bias Monitoring ───────────────────────────────────────────────────
  {
    id: "bias_monitoring",
    label: "Hiring Bias Monitoring",
    description: "Real-time bias detection across the hiring funnel with audit trail and intervention prompts.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      {
        key: "regulation",
        label: "Regulatory environment",
        fieldPath: "sectionA.sectorSpecificRegulation",
        evaluator: "scoreRegulation",
        maxScore: 35,
      },
      {
        key: "hire_volume",
        label: "Annual hire volume",
        fieldPath: "sectionD.annualHires",
        evaluator: "scoreHireVolume",
        maxScore: 25,
      },
      {
        key: "ethics_capability",
        label: "AI ethics & trust capability",
        fieldPath: "sectionG.ai_ethics_trust",
        evaluator: "scoreEthicsCapability",
        maxScore: 25,
      },
      {
        key: "data_quality",
        label: "Data quality",
        fieldPath: "sectionC.dataQualityRating",
        evaluator: "scoreDataQuality",
        maxScore: 15,
      },
    ],
    timeToValueMonths: { min: 3, max: 6 },
    phase: 1,
    caseStudyAnchor: "UK financial services firm (regulated sector): Regulatory risk reduction, audit-ready hiring process within 4 months.",
    riskFlagKeys: ["low_ethics_capability", "insufficient_hire_volume_for_statistical_significance"],
    valueFormulaKey: "biasMonitoring",
  },

  // ─── 10. Interview Scheduling Automation ──────────────────────────────────
  {
    id: "interview_scheduling",
    label: "Interview Scheduling Automation",
    description: "AI-powered interview scheduling eliminating back-and-forth coordination.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: ["annualHires", "adminTimePerHire"],
    softFitFactors: [
      {
        key: "hire_volume",
        label: "Annual hire volume",
        fieldPath: "sectionD.annualHires",
        evaluator: "scoreHireVolume",
        maxScore: 40,
      },
      {
        key: "admin_time",
        label: "Admin time per hire",
        fieldPath: "sectionD.adminTimePerHire",
        evaluator: "scoreAdminTime",
        maxScore: 35,
      },
      {
        key: "integration_maturity",
        label: "Calendar integration maturity",
        fieldPath: "sectionC.hrSystemIntegrationMaturity",
        evaluator: "scoreIntegrationMaturity",
        maxScore: 25,
      },
    ],
    timeToValueMonths: { min: 1, max: 3 },
    phase: 1,
    caseStudyAnchor: "Global hospitality group (40K employees): 80% reduction in scheduling coordination time, 1.5 hours per hire saved within 6 weeks.",
    riskFlagKeys: ["low_hire_volume", "poor_calendar_integration"],
    valueFormulaKey: "interviewScheduling",
  },

  // ─── 11. Onboarding Personalisation ──────────────────────────────────────
  {
    id: "onboarding_personalisation",
    label: "Personalised Onboarding",
    description: "AI-curated onboarding journeys reducing time-to-productivity for new hires.",
    category: "employee_experience",
    requiredSubFunctions: ["resourcing", "learning_development"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      {
        key: "hire_volume",
        label: "Annual hire volume",
        fieldPath: "sectionD.annualHires",
        evaluator: "scoreHireVolume",
        maxScore: 30,
      },
      {
        key: "digital_access",
        label: "Workforce digital access",
        fieldPath: "sectionC.workforceDigitalAccess",
        evaluator: "scoreDigitalAccess",
        maxScore: 30,
      },
      {
        key: "lms_present",
        label: "LMS in place",
        fieldPath: "sectionC.lmsSystem",
        evaluator: "scoreLmsPresent",
        maxScore: 20,
      },
      {
        key: "data_quality",
        label: "Data quality",
        fieldPath: "sectionC.dataQualityRating",
        evaluator: "scoreDataQuality",
        maxScore: 20,
      },
    ],
    timeToValueMonths: { min: 3, max: 6 },
    phase: 1,
    caseStudyAnchor: "US SaaS company (2K employees): 15 days faster time-to-productivity, measurable improvement in 90-day retention within 6 months.",
    riskFlagKeys: ["low_hire_volume", "no_lms", "poor_digital_access"],
    valueFormulaKey: "onboardingPersonalisation",
  },

  // ─── 12. Skills Inference & Mapping ──────────────────────────────────────
  {
    id: "skills_inference",
    label: "Skills Inference & Workforce Mapping",
    description: "AI-inferred skills taxonomy mapped to workforce, enabling workforce planning and mobility.",
    category: "workforce_intelligence",
    requiredSubFunctions: ["people_analytics", "talent_management"],
    requiredDataFields: [],
    softFitFactors: [
      {
        key: "headcount",
        label: "Organisation size",
        fieldPath: "sectionA.totalHeadcount",
        evaluator: "scoreHeadcount",
        maxScore: 25,
      },
      {
        key: "hris_data_years",
        label: "Years of HRIS data",
        fieldPath: "sectionC.yearsOfHrisData",
        evaluator: "scoreHrisDataYears",
        maxScore: 25,
      },
      {
        key: "data_quality",
        label: "Data quality",
        fieldPath: "sectionC.dataQualityRating",
        evaluator: "scoreDataQuality",
        maxScore: 25,
      },
      {
        key: "pivotal_jobs",
        label: "Pivotal job families defined",
        fieldPath: "sectionI.pivotalJobFamilies",
        evaluator: "scorePivotalJobs",
        maxScore: 25,
      },
    ],
    timeToValueMonths: { min: 6, max: 12 },
    phase: 3,
    caseStudyAnchor: "European energy company (18K employees): Skills taxonomy deployed across 80% of workforce, enabling 3× faster internal mobility matching.",
    riskFlagKeys: ["poor_data_quality", "insufficient_hris_data", "small_org"],
    valueFormulaKey: "skillsInference",
  },
];

/** Lookup by id */
export function getInitiative(id: string): InitiativeDefinition | undefined {
  return INITIATIVE_LIBRARY.find((i) => i.id === id);
}

/** All initiative ids */
export const INITIATIVE_IDS = INITIATIVE_LIBRARY.map((i) => i.id);
