/**
 * Structured input constants for Block B1 — Strategy Assessment Overhaul.
 * These replace the 9 open-text questions in HRAIStrategyAssessmentPage.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type AiPhilosophy = "augmentation_first" | "selective_automation" | "aggressive_automation";

export interface StructuredInputs {
  business_outcomes: string[];
  business_problems: string[];
  timeline_months: number;
  risk_appetite: 1 | 2 | 3 | 4 | 5;
  success_markers_ranked: [string, string, string];
  hr_leadership_position: 1 | 2 | 3 | 4 | 5;
  hr_processes_priority: string[];
  governance_principles: string[];
  voice_capture?: string;
  /** A1 — existing AI tools already deployed in HR */
  existing_ai_tools?: string[];
  /** A3 — organisation's AI philosophy stance */
  ai_philosophy?: AiPhilosophy;
  /** B1 — stakeholder map */
  stakeholder_map?: StakeholderMap;
  /** D1 — measurement cadence */
  measurement_cadence?: MeasurementCadence;
  /** D3 — solution delivery confidence (1-5) */
  solution_delivery_confidence?: 1 | 2 | 3 | 4 | 5;
  /** E1 — UK regulatory frameworks that apply */
  uk_regulatory_frameworks?: string[];
  /** D2 — pilot design preferences */
  pilot_design?: {
    scope?: string;
    duration?: string;
    success_metrics?: string[];
    first_initiative_id?: string;
  };
}

export interface OperationalBaseline {
  hires_per_year?: number;
  cost_per_hire_gbp?: number;
  time_to_fill_days?: number;
  voluntary_attrition_rate_pct?: number;
  l_and_d_spend_per_fte_gbp?: number;
  hr_cost_per_fte_gbp?: number;
  _sector_default_used?: Partial<Record<keyof Omit<OperationalBaseline, "_sector_default_used">, boolean>>;
}

// ── B1: Stakeholder map ──────────────────────────────────────────────────────

export interface StakeholderMap {
  executive_sponsors: string[];
  gatekeepers: string[];
  affected_groups: string[];
  potential_resistors: string[];
  notes?: string;
}

export const EXECUTIVE_SPONSORS: { id: string; label: string }[] = [
  { id: "ceo",   label: "CEO" },
  { id: "cfo",   label: "CFO" },
  { id: "coo",   label: "COO" },
  { id: "cio",   label: "CIO" },
  { id: "cto",   label: "CTO" },
  { id: "cro",   label: "Chief Risk Officer" },
  { id: "audit", label: "Audit Committee" },
  { id: "board", label: "Board" },
  { id: "other", label: "Other" },
];

export const GATEKEEPERS: { id: string; label: string }[] = [
  { id: "legal_compliance",  label: "Legal / Compliance" },
  { id: "it_data",           label: "IT / Data" },
  { id: "finance",           label: "Finance" },
  { id: "procurement",       label: "Procurement" },
  { id: "info_security",     label: "Information Security" },
  { id: "risk_management",   label: "Risk Management" },
  { id: "internal_audit",    label: "Internal Audit" },
  { id: "hr_bps",            label: "HR Business Partners" },
];

export const AFFECTED_GROUPS: { id: string; label: string }[] = [
  { id: "hr_team",             label: "HR team" },
  { id: "hiring_managers",     label: "Hiring managers" },
  { id: "all_employees",       label: "All employees" },
  { id: "frontline_workers",   label: "Frontline workers" },
  { id: "knowledge_workers",   label: "Knowledge workers" },
  { id: "contractors",         label: "Contractors & contingent workforce" },
  { id: "specific_functions",  label: "Specific functions (free text)" },
];

export const POTENTIAL_RESISTORS: { id: string; label: string }[] = [
  { id: "trade_union",          label: "Trade union" },
  { id: "works_council",        label: "Works council" },
  { id: "employee_resource_groups", label: "Employee resource groups" },
  { id: "senior_managers",      label: "Senior managers concerned about role change" },
  { id: "hr_team_concerned",    label: "HR team members concerned about own role" },
  { id: "legal_compliance_risk",label: "Legal / Compliance (risk-averse)" },
  { id: "finance_cost",         label: "Finance (cost concerns)" },
  { id: "dei_leads",            label: "DEI leads (bias concerns)" },
  { id: "other",                label: "Other" },
];

/** Returns sector-aware default pre-checks for the stakeholder map */
export function getStakeholderDefaults(
  businessAmbitionLevel: number,
  peopleAmbitionLevel: number,
  hasTradeUnion?: boolean
): StakeholderMap {
  return {
    executive_sponsors: [
      "cfo",
      ...(businessAmbitionLevel >= 5 ? ["ceo"] : []),
    ],
    gatekeepers: ["legal_compliance", "it_data"],
    affected_groups: [
      "hr_team",
      ...(peopleAmbitionLevel >= 4 ? ["all_employees"] : []),
    ],
    potential_resistors: [
      ...(hasTradeUnion ? ["trade_union"] : []),
    ],
  };
}

// ── D1: Measurement cadence ───────────────────────────────────────────────────

export type MeasurementCadence =
  | "monthly_quarterly_annual"
  | "quarterly_annual"
  | "biannual"
  | "annual"
  | "other_custom";

export const MEASUREMENT_CADENCE_OPTIONS: { value: MeasurementCadence; label: string }[] = [
  { value: "monthly_quarterly_annual", label: "Monthly KPI tracking, quarterly review, annual full re-assessment" },
  { value: "quarterly_annual",         label: "Quarterly review with annual full re-assessment" },
  { value: "biannual",                 label: "Twice-yearly review" },
  { value: "annual",                   label: "Annual review only" },
  { value: "other_custom",             label: "Custom (specify in voice capture)" },
];

// ── D3: Solution delivery confidence ─────────────────────────────────────────

export const SOLUTION_DELIVERY_OPTIONS: { value: 1 | 2 | 3 | 4 | 5; label: string; description: string }[] = [
  { value: 1, label: "Limited",     description: "We struggle to deliver change initiatives on time and to spec" },
  { value: 2, label: "Developing",  description: "We can deliver smaller initiatives but struggle at scale" },
  { value: 3, label: "Moderate",    description: "We've delivered transformation projects but with mixed outcomes" },
  { value: 4, label: "Strong",      description: "We have a track record of delivering complex change initiatives" },
  { value: 5, label: "Exceptional", description: "Change delivery is a recognised organisational strength" },
];

// ── A1: Existing AI tools ─────────────────────────────────────────────────────
export const EXISTING_AI_TOOLS: { id: string; label: string }[] = [
  { id: "ats",                 label: "Applicant Tracking System (ATS)" },
  { id: "hris",                label: "HRIS / Core HR platform" },
  { id: "lms",                 label: "Learning Management System (LMS)" },
  { id: "performance_mgmt",    label: "Performance management tool" },
  { id: "people_analytics",    label: "People analytics / BI dashboard" },
  { id: "chatbot_helpdesk",    label: "HR chatbot / employee helpdesk" },
  { id: "cv_screening",        label: "AI CV screening / sourcing tool" },
  { id: "engagement_survey",   label: "Engagement / pulse survey platform" },
  { id: "workforce_planning",  label: "Workforce planning tool" },
  { id: "payroll_automation",  label: "Payroll / benefits automation" },
  { id: "onboarding_platform", label: "Digital onboarding platform" },
  { id: "skills_platform",     label: "Skills intelligence platform" },
  { id: "copilot_llm",         label: "Copilot / LLM productivity tool (e.g. M365 Copilot)" },
  { id: "none",                label: "None yet" },
];

// ── A3: AI philosophy ──────────────────────────────────────────────────────────────
export const AI_PHILOSOPHY_OPTIONS: { value: AiPhilosophy; label: string; description: string }[] = [
  {
    value: "augmentation_first",
    label: "Augmentation-first",
    description: "AI enhances human capability. Decisions and accountability remain with people. Productivity gains flow into higher-value human work.",
  },
  {
    value: "selective_automation",
    label: "Selective automation",
    description: "Automate clearly bounded, low-risk tasks end-to-end. Preserve human judgement for decisions with significant people impact. Build trust before expanding scope.",
  },
  {
    value: "aggressive_automation",
    label: "Aggressive automation",
    description: "AI replaces manual, repetitive tasks end-to-end wherever technically feasible. Efficiency and capacity redeployment are the primary goals. Governance frameworks run in parallel.",
  },
];

// ── Business outcomes ─────────────────────────────────────────────────────────

export const UNIVERSAL_BUSINESS_OUTCOMES: { id: string; label: string }[] = [
  { id: "reduce_hr_operating_cost",       label: "Reduce HR operating cost" },
  { id: "improve_hiring_velocity",         label: "Improve hiring velocity" },
  { id: "reduce_voluntary_attrition",      label: "Reduce voluntary attrition" },
  { id: "improve_workforce_productivity",  label: "Improve workforce productivity" },
  { id: "strengthen_workforce_capability", label: "Strengthen workforce capability" },
  { id: "improve_compliance_risk_posture", label: "Improve compliance & risk posture" },
  { id: "improve_employee_experience",     label: "Improve employee experience" },
  { id: "enable_workforce_agility",        label: "Enable workforce agility" },
  { id: "improve_decision_quality",        label: "Improve decision quality" },
  { id: "free_up_hr_capacity",             label: "Free up HR capacity" },
  { id: "improve_fairness_equity",         label: "Improve fairness & equity" },
  { id: "strengthen_talent_pipeline",      label: "Strengthen talent pipeline" },
];

export const SECTOR_BUSINESS_OUTCOMES: Record<string, { id: string; label: string }[]> = {
  retail: [
    { id: "improve_frontline_retention",    label: "Improve frontline retention" },
    { id: "optimize_workforce_scheduling",  label: "Optimise workforce scheduling" },
  ],
  financial_services: [
    { id: "strengthen_regulatory_readiness", label: "Strengthen regulatory readiness" },
    { id: "improve_advisor_productivity",    label: "Improve advisor productivity" },
  ],
  healthcare: [
    { id: "address_clinician_shortage",  label: "Address clinician shortage" },
    { id: "reduce_clinician_burnout",    label: "Reduce clinician burnout" },
  ],
  technology: [
    { id: "accelerate_engineer_hiring",  label: "Accelerate engineer hiring" },
    { id: "retain_critical_talent",      label: "Retain critical talent" },
  ],
  public_sector: [
    { id: "workforce_planning_under_constraint", label: "Workforce planning under constraint" },
    { id: "improve_service_delivery",            label: "Improve service delivery" },
  ],
  manufacturing: [
    { id: "optimize_shift_planning",         label: "Optimise shift planning" },
    { id: "safety_workforce_capability",     label: "Safety & workforce capability" },
  ],
  professional_services: [
    { id: "improve_utilisation",                      label: "Improve utilisation" },
    { id: "accelerate_partner_track_development",     label: "Accelerate partner-track development" },
  ],
};

export function getBusinessOutcomes(sector: string): { id: string; label: string }[] {
  return [
    ...UNIVERSAL_BUSINESS_OUTCOMES,
    ...(SECTOR_BUSINESS_OUTCOMES[sector] ?? []),
  ];
}

// ── Business problems ─────────────────────────────────────────────────────────

export const BUSINESS_PROBLEMS: { id: string; label: string }[] = [
  { id: "hiring_too_slow",                  label: "Hiring is too slow" },
  { id: "cost_per_hire_too_high",           label: "Cost per hire is too high" },
  { id: "attrition_too_high",              label: "Attrition is too high" },
  { id: "engagement_declining",            label: "Engagement is declining" },
  { id: "capability_gaps_growing",         label: "Capability gaps are growing" },
  { id: "compliance_burden_increasing",    label: "Compliance burden is increasing" },
  { id: "hr_team_overstretched",           label: "HR team is overstretched" },
  { id: "decisions_too_anecdotal",         label: "Decisions are too anecdotal" },
  { id: "talent_pipeline_weak",            label: "Talent pipeline is weak" },
  { id: "internal_mobility_low",           label: "Internal mobility is low" },
  { id: "dei_metrics_stagnant",            label: "DEI metrics are stagnant" },
  { id: "lnd_impact_unclear",              label: "L&D impact is unclear" },
  { id: "compensation_uncompetitive",      label: "Compensation is uncompetitive" },
  { id: "manager_capability_inconsistent", label: "Manager capability is inconsistent" },
  { id: "workforce_data_fragmented",       label: "Workforce data is fragmented" },
];

// ── Risk appetite ─────────────────────────────────────────────────────────────

export const RISK_APPETITE_OPTIONS: { value: 1 | 2 | 3 | 4 | 5; label: string; description: string }[] = [
  { value: 1, label: "Cautious",        description: "Prove ROI clearly before any commitment. AI is one option among many." },
  { value: 2, label: "Measured",        description: "Comfortable with proven AI use cases. Avoid bleeding edge." },
  { value: 3, label: "Balanced",        description: "Will adopt mature AI when business case is clear. Open to selective pilots of newer capabilities." },
  { value: 4, label: "Forward-leaning", description: "AI is a strategic priority. Comfortable being among the first wave of adopters in our sector." },
  { value: 5, label: "Pioneering",      description: "AI is core to our competitive position. Comfortable being first in market." },
];

// ── Success markers ───────────────────────────────────────────────────────────

export const SUCCESS_MARKERS: { id: string; label: string }[] = [
  { id: "measurable_cost_savings",          label: "Measurable cost savings" },
  { id: "productivity_gains",               label: "Productivity gains" },
  { id: "improved_speed_of_decision",       label: "Improved speed of decision" },
  { id: "defensible_governance_position",   label: "Defensible governance position" },
  { id: "team_capability_uplift",           label: "Team capability uplift" },
  { id: "competitive_differentiation",      label: "Competitive differentiation" },
  { id: "regulatory_readiness",             label: "Regulatory readiness" },
  { id: "employee_experience_improvement",  label: "Employee experience improvement" },
];

// ── HR leadership position ────────────────────────────────────────────────────

export const HR_LEADERSHIP_POSITIONS: { value: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { value: 1, label: "HR follows the firm-wide AI strategy set by IT/business" },
  { value: 2, label: "HR contributes to the firm-wide AI strategy" },
  { value: 3, label: "HR co-leads the firm-wide AI strategy alongside IT/business" },
  { value: 4, label: "HR leads HR-specific AI strategy within a firm-wide framework" },
  { value: 5, label: "HR leads the firm-wide AI strategy" },
];

// ── HR processes ──────────────────────────────────────────────────────────────

export const HR_PROCESSES: { id: string; label: string }[] = [
  { id: "talent_acquisition",     label: "Talent Acquisition" },
  { id: "onboarding",             label: "Onboarding" },
  { id: "learning_development",   label: "Learning & Development" },
  { id: "performance_management", label: "Performance Management" },
  { id: "compensation_benefits",  label: "Compensation & Benefits" },
  { id: "employee_relations",     label: "Employee Relations" },
  { id: "hr_business_partnering", label: "HR Business Partnering" },
  { id: "hr_operations",          label: "HR Operations" },
  { id: "people_analytics",       label: "People Analytics" },
  { id: "workforce_planning",     label: "Workforce Planning" },
  { id: "dei",                    label: "Diversity, Equity & Inclusion" },
  { id: "hr_communications",      label: "HR Communications" },
];

// ── Governance principles ─────────────────────────────────────────────────────

export const GOVERNANCE_PRINCIPLES: { id: string; label: string }[] = [
  { id: "transparency_in_ai_decisions",           label: "Transparency in AI decisions" },
  { id: "human_in_the_loop_employment_decisions", label: "Human in the loop for employment decisions" },
  { id: "fairness_bias_testing",                  label: "Fairness & bias testing" },
  { id: "explainability_of_recommendations",      label: "Explainability of recommendations" },
  { id: "data_minimisation",                      label: "Data minimisation" },
  { id: "worker_right_to_explanation",            label: "Worker right to explanation" },
  { id: "vendor_risk_management",                 label: "Vendor risk management" },
  { id: "continuous_monitoring_ai_outputs",       label: "Continuous monitoring of AI outputs" },
];

export const SECTOR_GOVERNANCE_DEFAULTS: Record<string, string[]> = {
  _universal:           ["human_in_the_loop_employment_decisions", "fairness_bias_testing", "transparency_in_ai_decisions"],
  public_sector:        ["explainability_of_recommendations", "worker_right_to_explanation"],
  financial_services:   ["vendor_risk_management", "continuous_monitoring_ai_outputs"],
  healthcare:           ["explainability_of_recommendations", "data_minimisation"],
};

export function getGovernanceDefaults(sector: string): string[] {
  return [
    ...SECTOR_GOVERNANCE_DEFAULTS._universal,
    ...(SECTOR_GOVERNANCE_DEFAULTS[sector] ?? []),
  ];
}

// ── Timeline options ──────────────────────────────────────────────────────────

export const TIMELINE_OPTIONS: { value: number; label: string }[] = [
  { value: 6,  label: "6 months" },
  { value: 12, label: "12 months" },
  { value: 18, label: "18 months" },
  { value: 24, label: "24 months" },
  { value: 36, label: "36 months" },
];

// ── Sector benchmark operational defaults ─────────────────────────────────────
// Source: CIPD, SHRM, Glassdoor benchmarks. Marked confidence: low where no cited source.

export interface OperationalBenchmarks {
  hires_per_year_per_1000_employees: { low: number; median: number; high: number };
  cost_per_hire_gbp: { low: number; median: number; high: number };
  time_to_fill_days: { low: number; median: number; high: number };
  voluntary_attrition_rate_pct: { low: number; median: number; high: number };
  l_and_d_spend_per_fte_gbp: { low: number; median: number; high: number };
  hr_cost_per_fte_gbp: { low: number; median: number; high: number };
}

export const SECTOR_OPERATIONAL_BENCHMARKS: Record<string, OperationalBenchmarks> = {
  retail: {
    hires_per_year_per_1000_employees: { low: 180, median: 280, high: 420 },
    cost_per_hire_gbp:                 { low: 2500, median: 3800, high: 5500 },
    time_to_fill_days:                 { low: 22, median: 34, high: 52 },
    voluntary_attrition_rate_pct:      { low: 18, median: 28, high: 42 },
    l_and_d_spend_per_fte_gbp:         { low: 280, median: 420, high: 680 },
    hr_cost_per_fte_gbp:               { low: 900, median: 1200, high: 1700 },
  },
  financial_services: {
    hires_per_year_per_1000_employees: { low: 80, median: 140, high: 220 },
    cost_per_hire_gbp:                 { low: 5500, median: 8200, high: 14000 },
    time_to_fill_days:                 { low: 28, median: 42, high: 65 },
    voluntary_attrition_rate_pct:      { low: 8, median: 14, high: 22 },
    l_and_d_spend_per_fte_gbp:         { low: 800, median: 1400, high: 2400 },
    hr_cost_per_fte_gbp:               { low: 1400, median: 2100, high: 3200 },
  },
  healthcare: {
    hires_per_year_per_1000_employees: { low: 120, median: 200, high: 320 },
    cost_per_hire_gbp:                 { low: 3500, median: 5200, high: 8500 },
    time_to_fill_days:                 { low: 35, median: 55, high: 90 },
    voluntary_attrition_rate_pct:      { low: 10, median: 16, high: 26 },
    l_and_d_spend_per_fte_gbp:         { low: 600, median: 1000, high: 1800 },
    hr_cost_per_fte_gbp:               { low: 1100, median: 1600, high: 2400 },
  },
  technology: {
    hires_per_year_per_1000_employees: { low: 100, median: 180, high: 300 },
    cost_per_hire_gbp:                 { low: 6000, median: 10000, high: 18000 },
    time_to_fill_days:                 { low: 25, median: 40, high: 65 },
    voluntary_attrition_rate_pct:      { low: 10, median: 18, high: 30 },
    l_and_d_spend_per_fte_gbp:         { low: 1000, median: 1800, high: 3200 },
    hr_cost_per_fte_gbp:               { low: 1200, median: 1900, high: 3000 },
  },
  public_sector: {
    hires_per_year_per_1000_employees: { low: 60, median: 100, high: 160 },
    cost_per_hire_gbp:                 { low: 2800, median: 4200, high: 6500 },
    time_to_fill_days:                 { low: 40, median: 65, high: 100 },
    voluntary_attrition_rate_pct:      { low: 5, median: 9, high: 15 },
    l_and_d_spend_per_fte_gbp:         { low: 400, median: 700, high: 1200 },
    hr_cost_per_fte_gbp:               { low: 1000, median: 1500, high: 2200 },
  },
  manufacturing: {
    hires_per_year_per_1000_employees: { low: 100, median: 160, high: 260 },
    cost_per_hire_gbp:                 { low: 2200, median: 3400, high: 5200 },
    time_to_fill_days:                 { low: 20, median: 32, high: 50 },
    voluntary_attrition_rate_pct:      { low: 12, median: 20, high: 32 },
    l_and_d_spend_per_fte_gbp:         { low: 300, median: 500, high: 900 },
    hr_cost_per_fte_gbp:               { low: 800, median: 1200, high: 1800 },
  },
  professional_services: {
    hires_per_year_per_1000_employees: { low: 120, median: 200, high: 320 },
    cost_per_hire_gbp:                 { low: 5000, median: 8000, high: 14000 },
    time_to_fill_days:                 { low: 28, median: 45, high: 72 },
    voluntary_attrition_rate_pct:      { low: 12, median: 20, high: 32 },
    l_and_d_spend_per_fte_gbp:         { low: 1200, median: 2000, high: 3500 },
    hr_cost_per_fte_gbp:               { low: 1400, median: 2200, high: 3500 },
  },
  other: {
    hires_per_year_per_1000_employees: { low: 80, median: 150, high: 250 },
    cost_per_hire_gbp:                 { low: 3000, median: 4500, high: 7000 },
    time_to_fill_days:                 { low: 25, median: 40, high: 65 },
    voluntary_attrition_rate_pct:      { low: 10, median: 16, high: 26 },
    l_and_d_spend_per_fte_gbp:         { low: 400, median: 700, high: 1200 },
    hr_cost_per_fte_gbp:               { low: 900, median: 1400, high: 2200 },
  },
};

export function getSectorBenchmarks(sector: string): OperationalBenchmarks {
  return SECTOR_OPERATIONAL_BENCHMARKS[sector] ?? SECTOR_OPERATIONAL_BENCHMARKS.other;
}

/** Compute sector-default operational baseline for a given sector and headcount. */
export function computeSectorDefaultBaseline(sector: string, headcount: number): OperationalBaseline {
  const b = getSectorBenchmarks(sector);
  const hiresPerYear = Math.round((b.hires_per_year_per_1000_employees.median / 1000) * headcount);
  return {
    hires_per_year:               hiresPerYear,
    cost_per_hire_gbp:            b.cost_per_hire_gbp.median,
    time_to_fill_days:            b.time_to_fill_days.median,
    voluntary_attrition_rate_pct: b.voluntary_attrition_rate_pct.median,
    l_and_d_spend_per_fte_gbp:    b.l_and_d_spend_per_fte_gbp.median,
    hr_cost_per_fte_gbp:          b.hr_cost_per_fte_gbp.median,
    _sector_default_used: {
      hires_per_year:               true,
      cost_per_hire_gbp:            true,
      time_to_fill_days:            true,
      voluntary_attrition_rate_pct: true,
      l_and_d_spend_per_fte_gbp:    true,
      hr_cost_per_fte_gbp:          true,
    },
  };
}

// ── E1: UK Regulatory Frameworks ─────────────────────────────────────────────
export const UK_REGULATORY_FRAMEWORKS: { id: string; label: string; shortLabel: string; description: string; risk: "high" | "medium" | "low" }[] = [
  { id: "uk_gdpr_dpa2018",          label: "UK GDPR / Data Protection Act 2018",     shortLabel: "UK GDPR",                  description: "Governs processing of personal data. AI tools that process employee data must have a lawful basis and DPIA where high risk.", risk: "high" },
  { id: "equality_act_2010",        label: "Equality Act 2010",                       shortLabel: "Equality Act",             description: "Prohibits discrimination in recruitment, performance, and pay decisions. AI tools must be audited for bias and disparate impact.", risk: "high" },
  { id: "employment_rights_1996",   label: "Employment Rights Act 1996",              shortLabel: "Employment Rights",        description: "Governs dismissal, redundancy, and employment terms. AI-assisted performance and workforce planning tools must not undermine statutory rights.", risk: "medium" },
  { id: "ico_ai_guidance",          label: "ICO Guidance on AI and Data Protection",  shortLabel: "ICO AI Guidance",          description: "Requires explainability for automated decisions affecting individuals. Applies to AI-assisted hiring, performance, and pay.", risk: "high" },
  { id: "eu_ai_act_alignment",      label: "EU AI Act (UK Alignment Considerations)", shortLabel: "EU AI Act",                description: "Organisations operating in the EU or with EU subsidiaries must comply. HR AI tools in recruitment and performance are classified as high-risk.", risk: "medium" },
  { id: "trade_union_consult",      label: "Trade Union and Collective Consultation", shortLabel: "Trade Union",              description: "Where trade unions are recognised, employers may have obligations to consult on significant changes to working practices.", risk: "medium" },
  { id: "algorithmic_transparency", label: "Algorithmic Transparency (Emerging)",     shortLabel: "Algorithmic Transparency", description: "Emerging UK government guidance on algorithmic transparency. Prepare for equivalent private sector requirements.", risk: "low" },
  { id: "none",                     label: "None of these apply to our context",      shortLabel: "None",                     description: "", risk: "low" },
];

// ── D2: Pilot Design ─────────────────────────────────────────────────────────
export const PILOT_SCOPE_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "single_team",       label: "Single team",             description: "Pilot within one HR team or function (e.g. Talent Acquisition)" },
  { value: "single_bu",         label: "Single business unit",    description: "Pilot across one business unit or geography" },
  { value: "multi_bu",          label: "Multiple business units", description: "Pilot across 2-3 business units simultaneously" },
  { value: "organisation_wide", label: "Organisation-wide",       description: "Full organisation rollout from the start" },
];

export const PILOT_DURATION_OPTIONS: { value: string; label: string }[] = [
  { value: "4_weeks",  label: "4 weeks" },
  { value: "6_weeks",  label: "6 weeks" },
  { value: "8_weeks",  label: "8 weeks" },
  { value: "12_weeks", label: "12 weeks (3 months)" },
  { value: "6_months", label: "6 months" },
  { value: "other",    label: "Other / TBD" },
];

export const PILOT_SUCCESS_METRICS: { id: string; label: string; tier: "efficiency" | "effectiveness" | "strategic" }[] = [
  { id: "time_to_hire_reduction",        label: "Time-to-hire reduction (%)",              tier: "efficiency"    },
  { id: "screening_time_saved",          label: "Screening time saved (hrs/week)",          tier: "efficiency"    },
  { id: "hr_admin_time_saved",           label: "HR admin time saved (hrs/week)",           tier: "efficiency"    },
  { id: "employee_satisfaction_score",   label: "Employee satisfaction score (eNPS delta)", tier: "effectiveness" },
  { id: "manager_satisfaction_score",    label: "Manager satisfaction with HR tools",       tier: "effectiveness" },
  { id: "adoption_rate",                 label: "Tool adoption rate (%)",                   tier: "effectiveness" },
  { id: "data_quality_improvement",      label: "Data quality / completeness improvement",  tier: "effectiveness" },
  { id: "compliance_incident_reduction", label: "Compliance incidents reduced",             tier: "strategic"     },
  { id: "capability_score_uplift",       label: "AiQ capability score uplift",              tier: "strategic"     },
  { id: "cost_per_hire_reduction",       label: "Cost-per-hire reduction (%)",              tier: "efficiency"    },
  { id: "attrition_rate_change",         label: "Voluntary attrition rate change",          tier: "effectiveness" },
];
