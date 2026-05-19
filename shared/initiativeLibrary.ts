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
  | "frontline_workforce"
  | "ai_capability";

/**
 * v3 fit status values.
 * NOT_APPLICABLE replaces HARD_GATE_FAIL.
 * WEAK_FIT replaces POOR_FIT.
 * POOR_FIT and HARD_GATE_FAIL are kept as aliases for backward compat with existing tests.
 */
export type FitStatus =
  | "STRONG_FIT"
  | "POSSIBLE_FIT"
  | "WEAK_FIT"
  | "NOT_APPLICABLE"
  /** @deprecated use WEAK_FIT */
  | "POOR_FIT"
  /** @deprecated use NOT_APPLICABLE */
  | "HARD_GATE_FAIL";

/**
 * v3 hard gate — a structured boolean expression the engine evaluates against inputs.
 * All gates in an initiative's `hardGates` array must pass for the initiative to be scored.
 */
export type HardGate =
  | { type: "field_in_array"; path: string; values: string[]; label: string }
  | { type: "field_not_in_array"; path: string; values: string[]; label: string }
  | { type: "field_gt"; path: string; value: number; label: string }
  | { type: "field_gte"; path: string; value: number; label: string }
  | { type: "field_lt"; path: string; value: number; label: string }
  | { type: "field_includes"; path: string; value: string; label: string }
  | { type: "field_not_equals"; path: string; value: string | number; label: string }
  | { type: "field_populated"; path: string; label: string }
  | { type: "field_or"; gates: HardGate[]; label: string };

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
  /** Vendor landscape — 3-5 real vendors with distinguishers */
  vendorLandscape: string[];
  /** Prerequisites before deployment */
  prerequisites: string[];
  /** Initiative IDs that pair naturally with this one */
  coDeployments: string[];
  /** One-sentence rationale for why this initiative is in its phase */
  phaseRationale: string;
  /** Y1 cost range in GBP thousands */
  y1CostRange: { low: number; high: number };
  /**
   * v3 hard gates — structured boolean expressions evaluated by the engine.
   * Replaces requiredSubFunctions + requiredDataFields for v3 initiatives.
   * If present and non-empty, these are used instead of the legacy fields.
   */
  hardGates?: HardGate[];
  /**
   * v3 phase label (Foundation / Build / Scale / Optimise).
   * Replaces the numeric phase field for v3 initiatives.
   */
  phaseV3?: "foundation" | "build" | "scale" | "optimise";
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
    vendorLandscape: ["HireVue", "Pymetrics", "Eightfold", "Phenom", "Paradox"],
    prerequisites: ["ATS in place", "Documented hiring process", "Clear approval workflow"],
    coDeployments: ["ta_bias_monitoring"],
    phaseRationale: "Foundation phase — establishes the AI screening infrastructure that all downstream TA initiatives depend on.",
    y1CostRange: { low: 100, high: 400 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 500, label: "Organisation has more than 500 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Resourcing in scope" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Paradox (Olivia)", "Mya Systems", "Phenom", "Humanly", "Sense", "impress.ai"],
    prerequisites: ["ATS integration", "Mobile-friendly careers infrastructure", "Vendor security due diligence"],
    coDeployments: ["ta_interview_scheduling"],
    phaseRationale: "Scale phase — chatbots need governance (Foundation) and underlying TA process review (Build) before deploying at volume.",
    y1CostRange: { low: 100, high: 400 },
    hardGates: [
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Resourcing in scope" },
      { type: "field_gt", path: "sectionD.annualApplicationVolume", value: 1000, label: "More than 1,000 annual applications" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Paradox (Olivia)", "Mya Systems", "GoodTime", "Phenom"],
    prerequisites: ["ATS integration", "Calendar system access"],
    coDeployments: ["ta_candidate_chatbot"],
    phaseRationale: "Foundation phase — quick-win automation that frees recruiter time before more complex TA AI is deployed.",
    y1CostRange: { low: 30, high: 120 },
    hardGates: [
      { type: "field_gt", path: "sectionD.annualHires", value: 50, label: "More than 50 annual hires" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Resourcing in scope" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Eightfold AI", "Beamery", "SeekOut", "hireEZ", "Phenom", "Gem"],
    prerequisites: ["ATS in place", "Sufficient historical hire data for the model to learn patterns"],
    coDeployments: ["ta_bias_monitoring"],
    phaseRationale: "Build phase — requires clean ATS data and a skills framework before AI matching is accurate.",
    y1CostRange: { low: 80, high: 300 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 500, label: "Organisation has more than 500 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Resourcing in scope" },
    ],
    phaseV3: "build",
  },

  {
    id: "ta_video_interview_assessment",
    label: "AI Video Interview Assessment",
    description: "Asynchronous video interview platform with AI-assisted scoring, reducing interview time per hire by 30–50%.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 35 },
      { key: "application_volume", label: "Annual application volume", fieldPath: "sectionD.annualApplicationVolume", evaluator: "scoreApplicationVolume", maxScore: 30 },
      { key: "geographic_spread", label: "Geographic distribution", fieldPath: "sectionI.geographicDistribution", evaluator: "scoreGeographicSpread", maxScore: 25 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 10 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "Global consumer goods company (80K employees): 75% reduction in interview time, 2× candidate throughput.",
    riskFlagKeys: ["poor_digital_access", "ai_bias_in_assessment"],
    valueFormulaKey: "ta_video_interview_assessment",
    vendorLandscape: ["HireVue", "Pymetrics", "Sapia.ai", "Talview", "MyInterview"],
    prerequisites: ["Vendor must provide explainability and bias auditing", "Accommodation process for candidates who cannot complete video"],
    coDeployments: ["ta_bias_monitoring"],
    phaseRationale: "Scale phase — requires bias governance (Foundation) and sufficient hire volume to justify vendor cost.",
    y1CostRange: { low: 80, high: 250 },
    hardGates: [
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Resourcing in scope" },
      { type: "field_gt", path: "sectionD.annualHires", value: 50, label: "More than 50 annual hires" },
    ],
    phaseV3: "build",
  },

  {
    id: "ta_bias_monitoring",
    label: "Hiring Bias Monitoring",
    description: "Continuous monitoring of hiring funnel data for demographic bias patterns with audit trail.",
    category: "talent_acquisition",
    requiredSubFunctions: ["resourcing"],
    requiredDataFields: ["annualHires"],
    softFitFactors: [
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 40 },
      { key: "regulation", label: "Regulatory environment", fieldPath: "sectionA.sectorSpecificRegulation", evaluator: "scoreRegulation", maxScore: 30 },
      { key: "application_volume", label: "Annual application volume", fieldPath: "sectionD.annualApplicationVolume", evaluator: "scoreApplicationVolume", maxScore: 20 },
      { key: "ethics_capability", label: "AI ethics & trust capability", fieldPath: "sectionG.ai_ethics_trust", evaluator: "scoreEthicsCapability", maxScore: 10 },
    ],
    timeToValueMonths: { min: 3, max: 6 },
    phase: 1,
    caseStudyAnchor: "UK financial services firm (regulated sector): Regulatory risk reduction, audit-ready hiring process within 4 months.",
    riskFlagKeys: ["low_ethics_capability", "insufficient_hire_volume_for_statistical_significance"],
    valueFormulaKey: "ta_bias_monitoring",
    vendorLandscape: ["Pymetrics", "HireVue audit modules", "SeekOut", "Holistic AI", "Credo AI"],
    prerequisites: ["Existing hiring AI to monitor", "Demographic data collection legally compliant"],
    coDeployments: ["ta_high_volume_hiring", "ta_sourcing_matching", "ta_video_interview_assessment"],
    phaseRationale: "Foundation phase — must be in place before or alongside any AI that touches hiring decisions.",
    y1CostRange: { low: 40, high: 150 },
    hardGates: [
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Resourcing in scope" },
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 500, label: "Organisation has more than 500 employees" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Gem", "hireEZ", "Phenom", "SeekOut Recruit", "ChatGPT Enterprise"],
    prerequisites: ["ATS in place", "Outbound or passive candidate sourcing model"],
    coDeployments: ["ta_sourcing_matching"],
    phaseRationale: "Foundation phase — immediate productivity gain for recruiters with minimal integration complexity.",
    y1CostRange: { low: 60, high: 200 },
    hardGates: [
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Resourcing in scope" },
      { type: "field_gt", path: "sectionD.annualHires", value: 50, label: "More than 50 annual hires" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["DocuSign + AI templates", "Workday", "Native HRIS modules"],
    prerequisites: ["HRIS integration", "Legal review of templates for jurisdictional compliance"],
    coDeployments: ["ta_interview_scheduling"],
    phaseRationale: "Foundation phase — removes a common bottleneck at the end of the hiring funnel with low technical risk.",
    y1CostRange: { low: 25, high: 75 },
    hardGates: [
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Resourcing in scope" },
      { type: "field_gt", path: "sectionD.annualHires", value: 50, label: "More than 50 annual hires" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Textio", "Datapeople", "Develop (UK)", "Ongig"],
    prerequisites: ["ATS or job posting workflow access"],
    coDeployments: ["ta_bias_monitoring"],
    phaseRationale: "Foundation phase — low-cost, high-visibility quick win that improves pipeline quality before AI screening tools land.",
    y1CostRange: { low: 30, high: 100 },
    hardGates: [
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Resourcing in scope" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Enboarder", "ServiceNow Now Assist", "Sora", "Workday Journeys"],
    prerequisites: ["HRIS for trigger events", "Clear role definitions", "Manager engagement"],
    coDeployments: ["on_new_hire_chatbot"],
    phaseRationale: "Build phase — requires HRIS data quality and LMS infrastructure to be in place before personalisation is meaningful.",
    y1CostRange: { low: 50, high: 200 },
    hardGates: [
      { type: "field_gt", path: "sectionD.annualHires", value: 50, label: "More than 50 annual hires" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Onboarding in scope" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Moveworks", "Leena AI", "ServiceNow", "Espressive"],
    prerequisites: ["Best deployed as scope extension of hr_virtual_assistant"],
    coDeployments: ["hr_virtual_assistant"],
    phaseRationale: "Build phase — incremental to the HR virtual assistant; deploy after the core chatbot is stable.",
    y1CostRange: { low: 20, high: 60 },
    hardGates: [
      { type: "field_gt", path: "sectionD.annualHires", value: 50, label: "More than 50 annual hires" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Onboarding in scope" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Enboarder", "ServiceNow", "HireRight", "Sterling", "Workday workflows"],
    prerequisites: ["HRIS in place", "Legal review of compliance workflows", "Right-to-work checking process"],
    coDeployments: ["ta_offer_generation"],
    phaseRationale: "Foundation phase — compliance automation reduces legal risk and admin burden from day one.",
    y1CostRange: { low: 40, high: 150 },
    hardGates: [
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Onboarding in scope" },
      { type: "field_gt", path: "sectionD.annualHires", value: 50, label: "More than 50 annual hires" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Together Platform", "MentorcliQ", "Native HRIS modules", "Slack-based tools"],
    prerequisites: ["Workforce digital access for matching and communication"],
    coDeployments: ["on_personalised_journeys"],
    phaseRationale: "Build phase — most effective once personalised onboarding journeys are established and new hire data is available.",
    y1CostRange: { low: 20, high: 80 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 500, label: "Organisation has more than 500 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "TA", label: "Onboarding in scope" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Degreed", "Cornerstone", "LinkedIn Learning + AI", "Workday Skills Cloud"],
    prerequisites: ["LMS in place", "Skills framework (formal or informal acceptable)"],
    coDeployments: ["im_skills_inference"],
    phaseRationale: "Scale phase — requires a skills framework and LMS foundation before AI personalisation adds value.",
    y1CostRange: { low: 80, high: 350 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "L&D", label: "L&D in scope" },
      { type: "field_populated", path: "sectionC.lmsSystem", label: "LMS system in place" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["SkyHive", "Degreed", "Cornerstone", "Workday Learning", "Eightfold"],
    prerequisites: ["ld_personalised_learning often deployed first", "Clear business case for reskilling over hiring"],
    coDeployments: ["ld_personalised_learning", "im_skills_inference"],
    phaseRationale: "Optimise phase — strategic investment requiring mature skills data and established learning infrastructure.",
    y1CostRange: { low: 200, high: 2000 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 2000, label: "Organisation has more than 2,000 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "L&D", label: "L&D in scope" },
    ],
    phaseV3: "scale",
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
    vendorLandscape: ["BetterUp", "CoachHub", "Torch", "Sounding Board"],
    prerequisites: ["Manager capability baseline assessment", "Coaching culture or executive sponsorship"],
    coDeployments: ["mg_manager_copilot"],
    phaseRationale: "Scale phase — most effective after governance and manager readiness initiatives have been completed.",
    y1CostRange: { low: 100, high: 500 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "L&D", label: "L&D in scope" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Skillsoft", "SAP Litmos", "TalentLMS", "Cornerstone"],
    prerequisites: ["LMS in place", "Compliance training inventory documented"],
    coDeployments: ["ld_personalised_learning"],
    phaseRationale: "Foundation phase — compliance training is a legal requirement; AI automation reduces admin and improves completion rates.",
    y1CostRange: { low: 30, high: 120 },
    hardGates: [
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "L&D", label: "L&D in scope" },
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 500, label: "Organisation has more than 500 employees" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Synthesia", "Articulate AI", "iSpring", "Lectora"],
    prerequisites: ["Subject matter experts available for content review", "LMS for content distribution"],
    coDeployments: ["ld_personalised_learning"],
    phaseRationale: "Build phase — accelerates content production once the learning infrastructure is established.",
    y1CostRange: { low: 40, high: 150 },
    hardGates: [
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "L&D", label: "L&D in scope" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Guru", "Notion AI", "Glean", "Microsoft Viva Topics"],
    prerequisites: ["Existing knowledge base or documentation to ingest", "Content governance process"],
    coDeployments: ["hr_virtual_assistant"],
    phaseRationale: "Build phase — requires existing documentation and a governance process before AI indexing adds value.",
    y1CostRange: { low: 60, high: 250 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 500, label: "Organisation has more than 500 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "L&D", label: "L&D in scope" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Gloat", "Fuel50", "Eightfold", "Workday Talent Marketplace"],
    prerequisites: ["Skills framework in place", "Manager buy-in for internal mobility"],
    coDeployments: ["im_skills_inference", "ld_personalised_learning"],
    phaseRationale: "Scale phase — requires skills infrastructure and manager readiness before internal mobility AI is effective.",
    y1CostRange: { low: 200, high: 1000 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 2000, label: "Organisation has more than 2,000 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "HRBP", label: "Internal mobility in scope" },
    ],
    phaseV3: "scale",
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
    vendorLandscape: ["Eightfold AI", "Beamery", "SkyHive", "Workday Skills Cloud"],
    prerequisites: ["HRIS with job history data", "Minimum 2 years of workforce data"],
    coDeployments: ["im_talent_marketplace", "ld_personalised_learning"],
    phaseRationale: "Build phase — skills inference is the data foundation for talent marketplace and personalised learning.",
    y1CostRange: { low: 100, high: 400 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Together Platform", "MentorcliQ", "Chronus", "Mentorloop"],
    prerequisites: ["Workforce digital access", "Mentoring programme sponsor"],
    coDeployments: ["on_buddy_matching"],
    phaseRationale: "Build phase — works best once skills data is available for intelligent matching.",
    y1CostRange: { low: 30, high: 100 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 500, label: "Organisation has more than 500 employees" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Betterworks", "Lattice", "15Five", "Workday Peakon"],
    prerequisites: ["Manager capability for regular 1:1s", "Performance review process documented"],
    coDeployments: ["mg_manager_copilot"],
    phaseRationale: "Scale phase — continuous performance requires manager readiness and a culture of regular feedback.",
    y1CostRange: { low: 40, high: 200 },
    hardGates: [
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "PM", label: "Performance management in scope" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Lattice AI", "Workday AI", "Leapsome", "Culture Amp"],
    prerequisites: ["Performance review process in place", "HRIS with performance history"],
    coDeployments: ["pm_continuous_performance"],
    phaseRationale: "Build phase — AI writing assistance reduces review burden once the review process is established.",
    y1CostRange: { low: 80, high: 400 },
    hardGates: [
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "PM", label: "Performance management in scope" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Betterworks", "Lattice", "Workboard", "Ally.io"],
    prerequisites: ["Executive sponsorship for OKR methodology", "Goal-setting process documented"],
    coDeployments: ["pm_continuous_performance"],
    phaseRationale: "Build phase — OKR alignment requires a functioning performance management foundation.",
    y1CostRange: { low: 40, high: 200 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 500, label: "Organisation has more than 500 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "PM", label: "Performance management in scope" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Workday Peakon", "Qualtrics", "Culture Amp", "Glint (LinkedIn)"],
    prerequisites: ["Workforce digital access for survey completion", "Action-taking process for results"],
    coDeployments: ["ee_wellbeing_burnout"],
    phaseRationale: "Build phase — continuous listening requires a response process; deploy after governance establishes data ethics.",
    y1CostRange: { low: 50, high: 200 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 500, label: "Organisation has more than 500 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "HR Ops", label: "Employee experience in scope" },
    ],
    phaseV3: "foundation",
  },

  {
    id: "ee_recognition_rewards",
    label: "AI Recognition & Rewards Platform",
    description: "AI-powered peer recognition and rewards system personalising recognition moments and optimising reward spend.",
    category: "employee_experience",
    requiredSubFunctions: ["employee_experience"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "attrition_rate", label: "Voluntary attrition rate", fieldPath: "sectionD.attritionRate", evaluator: "scoreAttritionRate", maxScore: 35 },
      { key: "business_direction", label: "Business direction", fieldPath: "sectionI.businessDirectionType", evaluator: "scoreGrowthDirection", maxScore: 25 },
      { key: "workforce_composition", label: "Frontline workforce composition", fieldPath: "sectionI.workforceComposition", evaluator: "scoreFrontlineComposition", maxScore: 15 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 15 },
      { key: "frontline_percent", label: "Frontline headcount %", fieldPath: "sectionI.frontlineHeadcountPercent", evaluator: "scoreFrontlinePercent", maxScore: 10 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "Global retail company (50K employees): 8% attrition reduction, 20% engagement uplift.",
    riskFlagKeys: ["high_engagement_already", "poor_change_readiness"],
    valueFormulaKey: "ee_recognition_rewards",
    vendorLandscape: ["Achievers", "Workhuman", "Reward Gateway", "Bonusly"],
    prerequisites: ["Rewards budget allocation confirmed", "Manager engagement for peer recognition"],
    coDeployments: ["ee_sentiment_listening"],
    phaseRationale: "Scale phase — recognition programmes have highest impact when deployed alongside continuous listening.",
    y1CostRange: { low: 100, high: 500 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
      { type: "field_in_array", path: "sectionC.workforceDigitalAccess", values: ["all_laptops", "mixed_access", "frontline_mobile"], label: "Workforce has digital access" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Unmind", "Headspace for Work", "Lyra Health", "Spring Health"],
    prerequisites: ["Workforce digital access", "EAP or wellbeing programme in place"],
    coDeployments: ["ee_sentiment_listening"],
    phaseRationale: "Scale phase — wellbeing signal monitoring is most actionable once sentiment listening is established.",
    y1CostRange: { low: 100, high: 500 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "HR Ops", label: "Employee experience in scope" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Staffbase", "Firstup", "Poppulo", "Microsoft Viva Engage"],
    prerequisites: ["Internal comms channel strategy", "Content governance process"],
    coDeployments: ["fw_frontline_communication"],
    phaseRationale: "Build phase — AI comms personalisation requires an established channel strategy before content targeting.",
    y1CostRange: { low: 60, high: 300 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
      { type: "field_or", label: "Multi-site, remote, or hybrid workforce", gates: [
        { type: "field_gt", path: "sectionA.ukSitesCount", value: 10, label: "More than 10 UK sites" },
        { type: "field_in_array", path: "sectionI.geographicDistribution", values: ["multi_site_single_country", "multi_country", "global"], label: "Multi-site or global distribution" },
        { type: "field_in_array", path: "sectionI.workforceWorkType", values: ["fully_remote", "hybrid"], label: "Remote or hybrid workforce" },
      ] },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Workday People Analytics", "Visier", "Orgvue", "IBM Watson Talent"],
    prerequisites: ["Minimum 2 years of HRIS data", "Manager capability to act on predictions"],
    coDeployments: ["ee_sentiment_listening", "mg_manager_copilot"],
    phaseRationale: "Optimise phase — flight risk models require mature HRIS data and a manager response process.",
    y1CostRange: { low: 100, high: 400 },
    hardGates: [
      { type: "field_in_array", path: "sectionC.yearsOfHrisData", values: ["2_to_5_years", "5_plus_years"], label: "2+ years of HRIS data available" },
      { type: "field_not_equals", path: "sectionC.hrSystemIntegrationMaturity", value: "Separate systems", label: "HR systems have some integration" },
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Qualtrics", "Culture Amp", "Workday Peakon", "Leapsome"],
    prerequisites: ["Manager training for stay interview conversations", "Action-taking process"],
    coDeployments: ["rt_flight_risk_prediction", "mg_manager_copilot"],
    phaseRationale: "Scale phase — stay interviews are most effective when managers have AI coaching support for the conversations.",
    y1CostRange: { low: 40, high: 150 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 500, label: "Organisation has more than 500 employees" },
      { type: "field_not_equals", path: "sectionI.managerCapabilityForInsights", value: "Weak", label: "Manager capability is not weak" },
      { type: "field_gt", path: "sectionD.attritionRate", value: 10, label: "Attrition rate above 10%" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Qualtrics", "Culture Amp", "Workday", "Medallia"],
    prerequisites: ["Exit interview process in place", "HR team capacity to act on insights"],
    coDeployments: ["rt_flight_risk_prediction"],
    phaseRationale: "Build phase — exit intelligence is a quick win that improves retention data quality for downstream analytics.",
    y1CostRange: { low: 30, high: 100 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
      { type: "field_in_array", path: "sectionC.yearsOfHrisData", values: ["1_to_2_years", "2_to_5_years", "5_plus_years"], label: "At least 1 year of HRIS data available" },
    ],
    phaseV3: "foundation",
  },

  // ─── HR Operations (3 initiatives) ───────────────────────────────────────

  {
    id: "hr_virtual_assistant",
    label: "HR Virtual Assistant",
    description: "AI-powered HR helpdesk handling employee queries on policies, benefits, payroll, and processes.",
    category: "hr_operations",
    requiredSubFunctions: ["hr_operations"],
    requiredDataFields: [],
    softFitFactors: [
      { key: "query_volume", label: "Monthly HR query volume", fieldPath: "sectionD.monthlyHrQueryVolume", evaluator: "scoreQueryVolume", maxScore: 35 },
      { key: "hris_present", label: "HRIS in place", fieldPath: "sectionC.hrisSystem", evaluator: "scoreHrisPresent", maxScore: 25 },
      { key: "digital_access", label: "Workforce digital access (incl. mobile)", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreFrontlineDigitalAccess", maxScore: 25 },
      { key: "data_quality", label: "Data quality", fieldPath: "sectionC.dataQualityRating", evaluator: "scoreDataQuality", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "UK financial services firm (8K employees): 60% query deflection rate, 2.5 FTE redeployed to strategic work within 4 months.",
    riskFlagKeys: ["low_query_volume", "poor_digital_access", "no_hris"],
    valueFormulaKey: "hr_virtual_assistant",
    vendorLandscape: ["Moveworks", "Leena AI", "ServiceNow Now Assist", "Espressive"],
    prerequisites: ["HR knowledge base or policy documentation", "IT integration for ticket deflection"],
    coDeployments: ["on_new_hire_chatbot", "ld_knowledge_management"],
    phaseRationale: "Foundation phase — HR virtual assistant delivers immediate cost savings and is the platform for other chatbot use cases.",
    y1CostRange: { low: 150, high: 500 },
        hardGates: [
      // monthlyHrQueryVolume gate removed — formula uses headcount-based fallback (2 queries/employee/month) when null
      { type: "field_in_array", path: "sectionC.workforceDigitalAccess", values: ["all_laptops", "mixed_access", "frontline_mobile"], label: "Workforce has digital access" },
      { type: "field_or", label: "HR Ops or HRBP in scope", gates: [
        { type: "field_includes", path: "sectionB.hrSubFunctions", value: "HR Ops", label: "HR Ops in scope" },
        { type: "field_includes", path: "sectionB.hrSubFunctions", value: "HRBP", label: "HRBP in scope" },
      ] },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Workday", "ServiceNow", "ChatGPT Enterprise", "Luminance"],
    prerequisites: ["Legal review process for generated policies", "HR team ownership of policy library"],
    coDeployments: ["hr_virtual_assistant"],
    phaseRationale: "Foundation phase — policy automation reduces legal risk and HR admin from the start.",
    y1CostRange: { low: 30, high: 100 },
    hardGates: [
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "HR Ops", label: "HR Ops in scope" },
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Benefitfocus", "Darwin (Mercer)", "Workday Benefits", "Aon Benefits"],
    prerequisites: ["Benefits catalogue documented", "HRIS integration for eligibility data"],
    coDeployments: ["hr_virtual_assistant"],
    phaseRationale: "Build phase — benefits decision support requires a stable HR virtual assistant and benefits data integration.",
    y1CostRange: { low: 40, high: 150 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 2000, label: "Organisation has more than 2,000 employees" },
      { type: "field_or", label: "Reward or HR Ops in scope", gates: [
        { type: "field_includes", path: "sectionB.hrSubFunctions", value: "Reward", label: "Reward in scope" },
        { type: "field_includes", path: "sectionB.hrSubFunctions", value: "HR Ops", label: "HR Ops in scope" },
      ] },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Orgvue", "Visier", "Workday Adaptive Planning", "IBM Planning Analytics"],
    prerequisites: ["HRIS with 2+ years of workforce data", "Finance partnership for headcount planning"],
    coDeployments: ["wp_succession_planning", "im_skills_inference"],
    phaseRationale: "Optimise phase — workforce planning AI requires mature data and established planning processes.",
    y1CostRange: { low: 150, high: 600 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 2000, label: "Organisation has more than 2,000 employees" },
      { type: "field_in_array", path: "sectionC.yearsOfHrisData", values: ["2_to_5_years", "5_plus_years"], label: "2+ years of HRIS data available" },
      { type: "field_not_equals", path: "sectionC.hrSystemIntegrationMaturity", value: "Separate systems", label: "HR systems have some integration" },
    ],
    phaseV3: "scale",
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
    vendorLandscape: ["Workday", "SAP SuccessFactors", "Cornerstone", "Eightfold"],
    prerequisites: ["Performance and potential data in HRIS", "Executive sponsorship"],
    coDeployments: ["wp_workforce_planning", "im_talent_marketplace"],
    phaseRationale: "Optimise phase — succession planning AI requires mature talent data and a functioning talent marketplace.",
    y1CostRange: { low: 80, high: 300 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 2000, label: "Organisation has more than 2,000 employees" },
      { type: "field_populated", path: "sectionI.pivotalJobFamilies", label: "Pivotal job families identified" },
    ],
    phaseV3: "scale",
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
    vendorLandscape: ["Orgvue", "Nakisa", "Workday", "Deloitte OrgDNA"],
    prerequisites: ["HRIS with org structure data", "Executive sponsorship for org change"],
    coDeployments: ["wp_workforce_planning"],
    phaseRationale: "Optimise phase — org design AI is most valuable when workforce planning data is already mature.",
    y1CostRange: { low: 100, high: 400 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 3000, label: "Organisation has more than 3,000 employees" },
      { type: "field_in_array", path: "sectionI.businessDirectionType", values: ["transforming", "optimising"], label: "Organisation is transforming or optimising" },
    ],
    phaseV3: "optimise",
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
    vendorLandscape: ["Lightcast (EMSI Burning Glass)", "LinkedIn Talent Insights", "Workday", "Mercer Workforce Monitor"],
    prerequisites: ["Business case for location change or expansion", "Finance and real estate partnership"],
    coDeployments: ["wp_workforce_planning"],
    phaseRationale: "Optimise phase — location strategy is a strategic decision requiring mature workforce planning data.",
    y1CostRange: { low: 40, high: 150 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 5000, label: "Organisation has more than 5,000 employees" },
      { type: "field_in_array", path: "sectionI.businessDirectionType", values: ["growing", "transforming"], label: "Organisation is growing or transforming" },
      { type: "field_or", label: "Multi-site or international operations", gates: [
        { type: "field_gt", path: "sectionA.ukSitesCount", value: 5, label: "More than 5 UK sites" },
        { type: "field_in_array", path: "sectionI.geographicDistribution", values: ["multi_country", "global"], label: "Multi-country or global operations" },
      ] },
    ],
    phaseV3: "optimise",
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
    vendorLandscape: ["Syndio", "Trusaic", "Mercer Pay Equity", "Workday Pay Equity"],
    prerequisites: ["Compensation data in HRIS", "Legal review of pay equity methodology"],
    coDeployments: ["cr_compensation_recommendations"],
    phaseRationale: "Optimise phase — pay equity analysis requires complete compensation data and legal readiness.",
    y1CostRange: { low: 50, high: 200 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "Reward", label: "Reward in scope" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Mercer", "Radford (Aon)", "Workday Compensation", "Beqom"],
    prerequisites: ["Market data subscription", "Compensation bands documented"],
    coDeployments: ["cr_pay_equity"],
    phaseRationale: "Optimise phase — AI compensation recommendations require market data integration and established comp bands.",
    y1CostRange: { low: 50, high: 200 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "Reward", label: "Reward in scope" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Microsoft Copilot for HR", "Workday AI", "Leapsome", "Betterworks"],
    prerequisites: ["Manager digital access", "1:1 cadence or performance process in place"],
    coDeployments: ["pm_continuous_performance", "ld_ai_coaching"],
    phaseRationale: "Scale phase — manager copilot is most effective once governance and continuous performance processes are established.",
    y1CostRange: { low: 40, high: 200 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 500, label: "Organisation has more than 500 employees" },
      { type: "field_not_equals", path: "sectionK.performanceReviewCadence", value: "light_touch", label: "Performance review cadence is not light touch" },
    ],
    phaseV3: "build",
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
    vendorLandscape: ["BetterUp", "CoachHub", "Humu", "Torch"],
    prerequisites: ["Manager capability baseline", "HR BP support model for escalations"],
    coDeployments: ["mg_manager_copilot"],
    phaseRationale: "Scale phase — AI coaching for difficult conversations builds on manager copilot capabilities.",
    y1CostRange: { low: 40, high: 150 },
    hardGates: [
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
      { type: "field_in_array", path: "sectionI.managerCapabilityForInsights", values: ["Mixed", "Weak"], label: "Manager capability is mixed or weak" },
    ],
    phaseV3: "build",
  },

  // ─── Governance (2 initiatives) ───────────────────────────────────────────

  {
    id: "gv_ai_governance",
    label: "HR AI Governance Framework",
    description: "Structured governance framework for responsible AI deployment in HR — ethics, bias, explainability, compliance.",
    category: "governance",
    requiredSubFunctions: [],
    requiredDataFields: [],
    softFitFactors: [
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 35 },
      { key: "regulation", label: "Regulatory environment", fieldPath: "sectionA.sectorSpecificRegulation", evaluator: "scoreRegulation", maxScore: 30 },
      { key: "hire_volume", label: "Annual hire volume", fieldPath: "sectionD.annualHires", evaluator: "scoreHireVolume", maxScore: 25 },
      { key: "ethics_capability", label: "AI ethics & trust capability", fieldPath: "sectionG.ai_ethics_trust", evaluator: "scoreEthicsCapability", maxScore: 10 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "UK financial services firm (regulated sector): 60% faster AI deployment with governance, zero regulatory incidents.",
    riskFlagKeys: ["low_ethics_capability", "complex_regulation_without_legal_review"],
    valueFormulaKey: "gv_ai_governance",
    vendorLandscape: ["Holistic AI", "Credo AI", "IBM OpenScale", "Microsoft Responsible AI"],
    prerequisites: ["Executive sponsorship for AI governance", "Legal and compliance team involvement"],
    coDeployments: ["ta_bias_monitoring", "gv_cross_cutting_bias_audit"],
    phaseRationale: "Foundation phase — AI governance must be established before any AI tool is deployed at scale.",
    y1CostRange: { low: 50, high: 200 },
    hardGates: [
      // Universal — recommended for any org deploying HR AI; no hard gates
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Holistic AI", "Credo AI", "Pymetrics", "Accenture Responsible AI"],
    prerequisites: ["AI tools already deployed to audit", "Legal and compliance team involvement"],
    coDeployments: ["gv_ai_governance", "ta_bias_monitoring"],
    phaseRationale: "Optimise phase — cross-cutting bias audit is most valuable once multiple AI tools are in production.",
    y1CostRange: { low: 40, high: 150 },
    hardGates: [
      // Recommended when 2+ HR AI initiatives are deployed or planned; no strict hard gate
    ],
    phaseV3: "build",
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
    vendorLandscape: ["Quinyx", "Deputy", "Rotageek", "UKG (Kronos)", "Humanforce"],
    prerequisites: ["Workforce management system or scheduling data", "Manager buy-in for AI-assisted scheduling"],
    coDeployments: ["fw_store_manager_assistant"],
    phaseRationale: "Scale phase — shift scheduling AI delivers the highest ROI for frontline orgs once governance is in place.",
    y1CostRange: { low: 100, high: 500 },
    hardGates: [
      { type: "field_in_array", path: "sectionI.workforceComposition", values: ["frontline_heavy", "mixed"], label: "Frontline or mixed workforce composition" },
      { type: "field_gt", path: "sectionA.ukSitesCount", value: 5, label: "More than 5 UK sites" },
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 500, label: "Organisation has more than 500 employees" },
    ],
    phaseV3: "scale",
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
      { key: "digital_access", label: "Workforce digital access", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreFrontlineDigitalAccess", maxScore: 30 },
      { key: "regulation", label: "Regulatory environment", fieldPath: "sectionA.sectorSpecificRegulation", evaluator: "scoreRegulation", maxScore: 20 },
      { key: "ld_spend", label: "Annual L&D spend", fieldPath: "sectionD.annualLDSpend", evaluator: "scoreLDSpend", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 4 },
    phase: 1,
    caseStudyAnchor: "Global retail company (100K employees): 3× compliance completion improvement, 10% operational performance uplift.",
    riskFlagKeys: ["poor_digital_access", "no_lms"],
    valueFormulaKey: "fw_frontline_learning",
    vendorLandscape: ["Axonify", "Nudge", "EdApp (SafetyCulture)", "Cornerstone Degreed"],
    prerequisites: ["Mobile device access for frontline workers", "Content library or SME availability"],
    coDeployments: ["fw_frontline_communication", "ld_compliance_training"],
    phaseRationale: "Scale phase — microlearning for frontline workers requires mobile infrastructure and a content strategy.",
    y1CostRange: { low: 60, high: 250 },
    hardGates: [
      { type: "field_in_array", path: "sectionI.workforceComposition", values: ["frontline_heavy", "mixed"], label: "Frontline or mixed workforce composition" },
      { type: "field_includes", path: "sectionB.hrSubFunctions", value: "L&D", label: "L&D in scope" },
      { type: "field_in_array", path: "sectionC.workforceDigitalAccess", values: ["frontline_mobile", "mixed_access", "all_laptops"], label: "Workforce has digital access" },
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
    ],
    phaseV3: "build",
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
      { key: "digital_access", label: "Frontline digital access (inverted)", fieldPath: "sectionC.workforceDigitalAccess", evaluator: "scoreFrontlineDigitalAccess", maxScore: 30 },
      { key: "geographic_spread", label: "Geographic distribution", fieldPath: "sectionI.geographicDistribution", evaluator: "scoreGeographicSpread", maxScore: 20 },
      { key: "attrition_rate", label: "Attrition rate", fieldPath: "sectionD.attritionRate", evaluator: "scoreAttritionRate", maxScore: 15 },
    ],
    timeToValueMonths: { min: 2, max: 3 },
    phase: 1,
    caseStudyAnchor: "Global retail company (80K employees): 10% frontline attrition reduction, 25% employee reach improvement.",
    riskFlagKeys: ["poor_digital_access"],
    valueFormulaKey: "fw_frontline_communication",
    vendorLandscape: ["Staffbase", "Beekeeper", "Firstup", "Poppulo"],
    prerequisites: ["Mobile device access for frontline workers", "Content governance process"],
    coDeployments: ["fw_frontline_learning", "ee_internal_comms_ai"],
    phaseRationale: "Scale phase — frontline communication AI requires mobile infrastructure and a content strategy.",
    y1CostRange: { low: 80, high: 400 },
    hardGates: [
      { type: "field_in_array", path: "sectionI.workforceComposition", values: ["frontline_heavy", "mixed"], label: "Frontline or mixed workforce composition" },
      { type: "field_gt", path: "sectionA.ukSitesCount", value: 10, label: "More than 10 UK sites" },
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
    ],
    phaseV3: "build",
  },

  // ─── AI Capability Building (2 initiatives) ─────────────────────────────────

  {
    id: "wp_ai_capability_building",
    label: "AI Capability Building (Foundation)",
    description: "Structured programme to build HR team and manager AI literacy: what AI can and cannot do, how to evaluate vendor claims, and how to work alongside AI tools.",
    category: "ai_capability",
    requiredSubFunctions: [],
    requiredDataFields: [],
    softFitFactors: [
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 50 },
      { key: "ai_capability_level", label: "Current AI capability level", fieldPath: "sectionG.aiCapabilityLevel", evaluator: "scoreAiCapabilityLevel", maxScore: 30 },
      { key: "ai_ethics_trust", label: "AI ethics & trust capability", fieldPath: "sectionG.ai_ethics_trust", evaluator: "scoreEthicsCapability", maxScore: 20 },
    ],
    timeToValueMonths: { min: 1, max: 3 },
    phase: 1,
    caseStudyAnchor: "UK retail group (25K employees): 6-month AI literacy programme across HR and line managers; 78% of managers rated confident using AI tools within 3 months of deployment.",
    riskFlagKeys: [],
    valueFormulaKey: "wp_ai_capability_building",
    vendorLandscape: ["Coursera for Business", "LinkedIn Learning", "Humu", "Internal L&D"],
    prerequisites: ["Executive sponsorship", "L&D team capacity to design and deliver"],
    coDeployments: ["gv_ai_governance", "ee_workforce_ai_comms"],
    phaseRationale: "Foundation phase — AI capability building must happen before any AI tool is deployed. Without it, adoption fails and trust erodes.",
    y1CostRange: { low: 40, high: 100 },
        hardGates: [
      // Universal — recommended for any org deploying HR AI; no hard gates
    ],
    phaseV3: "foundation",
  },

  {
    id: "wp_ai_capability_advanced",
    label: "AI Capability Building (Advanced)",
    description: "Advanced AI capability programme for HR specialists and senior leaders: building internal AI champions, running AI experiments, and developing proprietary AI use cases.",
    category: "ai_capability",
    requiredSubFunctions: [],
    requiredDataFields: [],
    softFitFactors: [
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 45 },
      { key: "ai_capability_level", label: "Current AI capability level", fieldPath: "sectionG.aiCapabilityLevel", evaluator: "scoreAiCapabilityLevel", maxScore: 35 },
      { key: "ai_ethics_trust", label: "AI ethics & trust capability", fieldPath: "sectionG.ai_ethics_trust", evaluator: "scoreEthicsCapability", maxScore: 20 },
    ],
    timeToValueMonths: { min: 3, max: 6 },
    phase: 2,
    caseStudyAnchor: "UK financial services firm (12K employees): Advanced AI capability programme produced 8 internal AI champions and 3 proprietary HR AI tools within 12 months.",
    riskFlagKeys: [],
    valueFormulaKey: "wp_ai_capability_building",
    vendorLandscape: ["Coursera for Business", "LinkedIn Learning", "Internal L&D", "AI specialist consultancies"],
    prerequisites: ["Foundation AI capability programme completed", "Executive sponsorship for advanced programme"],
    coDeployments: ["gv_ai_governance", "wp_ai_capability_building"],
    phaseRationale: "Build phase — advanced capability building follows the foundation programme and prepares the organisation for self-directed AI innovation.",
    y1CostRange: { low: 80, high: 250 },
    hardGates: [
      // Universal — recommended for any large org with AI ambition
    ],
    phaseV3: "build",
  },

  {
    id: "ee_workforce_ai_comms",
    label: "Workforce AI Communications",
    description: "Structured communications programme to prepare the workforce for AI in HR: what is changing, why, what it means for them, and how to raise concerns.",
    category: "ai_capability",
    requiredSubFunctions: [],
    requiredDataFields: [],
    softFitFactors: [
      { key: "headcount", label: "Organisation size", fieldPath: "sectionA.totalHeadcount", evaluator: "scoreHeadcount", maxScore: 40 },
      { key: "workforce_composition", label: "Frontline workforce (higher need)", fieldPath: "sectionI.workforceComposition", evaluator: "scoreFrontlineComposition", maxScore: 35 },
      { key: "change_readiness", label: "Change readiness", fieldPath: "sectionF.changeReadiness", evaluator: "scoreChangeReadiness", maxScore: 25 },
    ],
    timeToValueMonths: { min: 1, max: 2 },
    phase: 1,
    caseStudyAnchor: "UK logistics company (18K employees): Pre-deployment AI comms campaign reduced employee concerns from 67% to 28% before first tool went live; adoption rate 2× higher than comparable deployments without comms.",
    riskFlagKeys: [],
    valueFormulaKey: "ee_workforce_ai_comms",
    vendorLandscape: ["Internal comms team", "Staffbase", "Poppulo", "Workvivo"],
    prerequisites: ["Executive sponsorship", "Clear AI deployment roadmap to communicate"],
    coDeployments: ["gv_ai_governance", "wp_ai_capability_building"],
    phaseRationale: "Foundation phase — workforce communications must precede any AI tool deployment. Colleagues need to understand what is coming and why before it arrives.",
    y1CostRange: { low: 20, high: 60 },
    hardGates: [
      // Universal — recommended for any org deploying HR AI; no hard gates
    ],
    phaseV3: "foundation",
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
    vendorLandscape: ["Microsoft Copilot for Frontline", "Quinyx", "Deputy", "Humanforce"],
    prerequisites: ["Store/site manager digital access", "HRIS with team data"],
    coDeployments: ["fw_shift_scheduling_ai", "mg_manager_copilot"],
    phaseRationale: "Scale phase — store manager AI assistant is most effective once shift scheduling AI is providing data.",
    y1CostRange: { low: 100, high: 500 },
    hardGates: [
      { type: "field_in_array", path: "sectionI.workforceComposition", values: ["frontline_heavy", "mixed"], label: "Frontline or mixed workforce composition" },
      { type: "field_gt", path: "sectionA.ukSitesCount", value: 10, label: "More than 10 UK sites" },
      { type: "field_gt", path: "sectionA.totalHeadcount", value: 1000, label: "Organisation has more than 1,000 employees" },
    ],
    phaseV3: "build",
  },

];

/** Lookup by id */
export function getInitiative(id: string): InitiativeDefinition | undefined {
  return INITIATIVE_LIBRARY.find((i) => i.id === id);
}

/** All initiative ids */
export const INITIATIVE_IDS = INITIATIVE_LIBRARY.map((i) => i.id);
