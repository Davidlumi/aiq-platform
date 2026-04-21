/**
 * AIQ Content System Seed Script
 * Seeds: 22 roles, 13 workflow domains, 10 failure modes, 200+ scenarios, tags
 * Works with the actual DB schema from the migration.
 */
import { createConnection } from "mysql2/promise";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await createConnection(dbUrl);

async function run(sql, params = []) {
  try {
    await conn.execute(sql, params);
  } catch (e) {
    if (!e.message.includes("Duplicate entry")) {
      console.error("SQL error:", e.message.slice(0, 200));
    }
  }
}

// ─── 1. Content Roles (22 roles, 8 families) ──────────────────────────────────

const ROLES = [
  { key: "talent_acquisition_partner", label: "Talent Acquisition Partner", family: "Talent Acquisition",
    seniority: "mid", decision_authority: "medium", risk_exposure: "high", governance_sensitivity: "high",
    data: { aiUsage: ["AI-assisted CV screening","Automated JD generation","Candidate ranking","Interview scheduling"], capWeights: { execution: 0.25, judgement: 0.30, appropriateness: 0.20, governance: 0.15, workflow: 0.10 }, failurePoints: ["Over-reliance on AI screening","Algorithmic bias in ranking","GDPR non-compliance"] } },
  { key: "recruitment_coordinator", label: "Recruitment Coordinator", family: "Talent Acquisition",
    seniority: "junior", decision_authority: "low", risk_exposure: "medium", governance_sensitivity: "medium",
    data: { aiUsage: ["Automated scheduling","AI candidate comms","ATS workflow automation"], capWeights: { execution: 0.35, workflow: 0.30, appropriateness: 0.20, judgement: 0.15 }, failurePoints: ["Automated rejection without review","Miscommunication via AI messages"] } },
  { key: "learning_development_manager", label: "Learning & Development Manager", family: "Learning & Development",
    seniority: "senior", decision_authority: "high", risk_exposure: "medium", governance_sensitivity: "medium",
    data: { aiUsage: ["AI-personalised learning paths","Content generation","Learning analytics"], capWeights: { judgement: 0.30, data_interpretation: 0.25, workflow: 0.20, execution: 0.15, governance: 0.10 }, failurePoints: ["Uncritical AI content adoption","Ignoring accessibility"] } },
  { key: "instructional_designer", label: "Instructional Designer", family: "Learning & Development",
    seniority: "mid", decision_authority: "medium", risk_exposure: "low", governance_sensitivity: "low",
    data: { aiUsage: ["AI content generation","Automated assessment creation","Adaptive learning design"], capWeights: { execution: 0.30, workflow: 0.25, appropriateness: 0.25, judgement: 0.20 }, failurePoints: ["Publishing AI content without review","Copyright issues"] } },
  { key: "hr_business_partner", label: "HR Business Partner", family: "HR Business Partnering",
    seniority: "senior", decision_authority: "high", risk_exposure: "high", governance_sensitivity: "high",
    data: { aiUsage: ["Workforce analytics","AI performance analysis","Org network analysis","Sentiment analysis"], capWeights: { judgement: 0.35, data_interpretation: 0.25, governance: 0.20, appropriateness: 0.20 }, failurePoints: ["Treating AI predictions as definitive","Using sentiment data without consent","Algorithmic performance management"] } },
  { key: "senior_hrbp", label: "Senior HR Business Partner", family: "HR Business Partnering",
    seniority: "senior", decision_authority: "high", risk_exposure: "critical", governance_sensitivity: "critical",
    data: { aiUsage: ["Executive workforce planning","AI org design modelling","Predictive attrition analytics"], capWeights: { judgement: 0.35, governance: 0.30, data_interpretation: 0.20, appropriateness: 0.15 }, failurePoints: ["Presenting AI forecasts as certainties","Insufficient scrutiny of AI recommendations"] } },
  { key: "employee_relations_manager", label: "Employee Relations Manager", family: "Employee Relations",
    seniority: "senior", decision_authority: "high", risk_exposure: "critical", governance_sensitivity: "critical",
    data: { aiUsage: ["AI case summarisation","Precedent analysis","Risk scoring","Documentation drafting"], capWeights: { governance: 0.35, judgement: 0.30, appropriateness: 0.25, execution: 0.10 }, failurePoints: ["Using AI risk scores to pre-determine outcomes","Sharing case data without anonymisation","Delegating decisions to AI"] } },
  { key: "er_advisor", label: "Employee Relations Advisor", family: "Employee Relations",
    seniority: "mid", decision_authority: "medium", risk_exposure: "high", governance_sensitivity: "high",
    data: { aiUsage: ["AI-assisted policy lookup","Case documentation","Automated timeline tracking"], capWeights: { governance: 0.30, judgement: 0.30, appropriateness: 0.25, execution: 0.15 }, failurePoints: ["Following AI guidance without context","Inadequate data protection"] } },
  { key: "reward_manager", label: "Reward Manager", family: "Compensation & Benefits",
    seniority: "senior", decision_authority: "high", risk_exposure: "high", governance_sensitivity: "high",
    data: { aiUsage: ["AI pay benchmarking","Pay equity analysis","Benefits optimisation","Total reward analytics"], capWeights: { data_interpretation: 0.35, governance: 0.25, judgement: 0.25, execution: 0.15 }, failurePoints: ["Accepting AI pay recommendations without equity review","Algorithmic bias in pay decisions"] } },
  { key: "compensation_analyst", label: "Compensation Analyst", family: "Compensation & Benefits",
    seniority: "mid", decision_authority: "low", risk_exposure: "medium", governance_sensitivity: "medium",
    data: { aiUsage: ["Market data analysis","Pay modelling","Salary survey interpretation"], capWeights: { data_interpretation: 0.40, execution: 0.30, judgement: 0.20, workflow: 0.10 }, failurePoints: ["Over-reliance on AI benchmarks","Misinterpreting AI pay models"] } },
  { key: "workforce_planning_analyst", label: "Workforce Planning Analyst", family: "Workforce Planning & Analytics",
    seniority: "mid", decision_authority: "medium", risk_exposure: "high", governance_sensitivity: "high",
    data: { aiUsage: ["Predictive headcount modelling","Skills gap analysis","Scenario planning","Attrition prediction"], capWeights: { data_interpretation: 0.40, judgement: 0.25, execution: 0.20, governance: 0.15 }, failurePoints: ["Treating AI forecasts as certainties","Ignoring model uncertainty"] } },
  { key: "people_analytics_lead", label: "People Analytics Lead", family: "Workforce Planning & Analytics",
    seniority: "senior", decision_authority: "high", risk_exposure: "critical", governance_sensitivity: "critical",
    data: { aiUsage: ["Advanced people analytics","ML model development","Ethics review","Dashboard delivery"], capWeights: { data_interpretation: 0.35, governance: 0.30, judgement: 0.25, appropriateness: 0.10 }, failurePoints: ["Insufficient ethical review","Surveillance-adjacent analytics","Lack of transparency"] } },
  { key: "od_consultant", label: "OD Consultant", family: "Organisational Development",
    seniority: "senior", decision_authority: "high", risk_exposure: "high", governance_sensitivity: "high",
    data: { aiUsage: ["AI org network analysis","Culture analytics","Change readiness assessment","AI-facilitated workshops"], capWeights: { judgement: 0.35, data_interpretation: 0.25, appropriateness: 0.25, governance: 0.15 }, failurePoints: ["Misusing network analysis for surveillance","Presenting AI diagnostics as definitive"] } },
  { key: "change_manager", label: "Change Manager", family: "Organisational Development",
    seniority: "mid", decision_authority: "medium", risk_exposure: "medium", governance_sensitivity: "medium",
    data: { aiUsage: ["Stakeholder sentiment analysis","AI change communications","Adoption analytics"], capWeights: { judgement: 0.30, workflow: 0.25, appropriateness: 0.25, execution: 0.20 }, failurePoints: ["Using sentiment data without consent","AI comms without human review"] } },
  { key: "hr_operations_manager", label: "HR Operations Manager", family: "HR Operations & Shared Services",
    seniority: "senior", decision_authority: "high", risk_exposure: "medium", governance_sensitivity: "medium",
    data: { aiUsage: ["HR chatbot management","Process automation","SLA monitoring","Self-service AI tools"], capWeights: { workflow: 0.35, execution: 0.25, governance: 0.25, judgement: 0.15 }, failurePoints: ["Deploying chatbots without escalation paths","Automating sensitive processes without review"] } },
  { key: "hr_systems_specialist", label: "HR Systems Specialist", family: "HR Operations & Shared Services",
    seniority: "mid", decision_authority: "medium", risk_exposure: "medium", governance_sensitivity: "medium",
    data: { aiUsage: ["AI tool integration","Data quality automation","System configuration"], capWeights: { execution: 0.35, governance: 0.30, workflow: 0.25, data_interpretation: 0.10 }, failurePoints: ["Inadequate data governance","Insufficient testing of AI features"] } },
  { key: "hr_advisor", label: "HR Advisor", family: "HR Operations & Shared Services",
    seniority: "junior", decision_authority: "low", risk_exposure: "medium", governance_sensitivity: "medium",
    data: { aiUsage: ["AI policy lookup","Case management automation","Self-service guidance"], capWeights: { execution: 0.30, judgement: 0.25, appropriateness: 0.25, governance: 0.20 }, failurePoints: ["Following AI guidance without context","Inadequate escalation"] } },
  { key: "dei_manager", label: "DEI Manager", family: "Diversity, Equity & Inclusion",
    seniority: "senior", decision_authority: "high", risk_exposure: "critical", governance_sensitivity: "critical",
    data: { aiUsage: ["Pay equity analytics","Representation analysis","Bias detection","Inclusion survey analytics"], capWeights: { governance: 0.35, data_interpretation: 0.30, judgement: 0.25, appropriateness: 0.10 }, failurePoints: ["Using AI to define protected characteristics","Algorithmic solutions to structural problems","Surveillance of employee identity"] } },
  { key: "dei_analyst", label: "DEI Analyst", family: "Diversity, Equity & Inclusion",
    seniority: "mid", decision_authority: "medium", risk_exposure: "high", governance_sensitivity: "high",
    data: { aiUsage: ["Diversity data analysis","Bias audit tools","Reporting automation"], capWeights: { data_interpretation: 0.40, governance: 0.30, judgement: 0.20, execution: 0.10 }, failurePoints: ["Misinterpreting AI equity analysis","Insufficient data protection for sensitive attributes"] } },
  { key: "chief_people_officer", label: "Chief People Officer", family: "HR Leadership",
    seniority: "executive", decision_authority: "executive", risk_exposure: "critical", governance_sensitivity: "critical",
    data: { aiUsage: ["AI governance oversight","Strategic workforce AI decisions","Board-level AI reporting","Vendor selection"], capWeights: { governance: 0.35, judgement: 0.30, data_interpretation: 0.20, appropriateness: 0.15 }, failurePoints: ["Insufficient oversight of AI vendor claims","Delegating AI ethics to technology teams"] } },
  { key: "hr_director", label: "HR Director", family: "HR Leadership",
    seniority: "executive", decision_authority: "executive", risk_exposure: "critical", governance_sensitivity: "critical",
    data: { aiUsage: ["AI adoption strategy","Function-wide AI governance","Capability building oversight"], capWeights: { governance: 0.30, judgement: 0.30, data_interpretation: 0.20, appropriateness: 0.20 }, failurePoints: ["Insufficient due diligence on AI tools","Inadequate AI literacy in HR function"] } },
  { key: "talent_management_partner", label: "Talent Management Partner", family: "Talent Acquisition",
    seniority: "senior", decision_authority: "high", risk_exposure: "high", governance_sensitivity: "high",
    data: { aiUsage: ["AI talent identification","Succession planning analytics","Potential prediction models"], capWeights: { judgement: 0.35, data_interpretation: 0.25, governance: 0.25, appropriateness: 0.15 }, failurePoints: ["Algorithmic bias in potential assessment","Lack of transparency","Protected characteristic discrimination"] } },
];

// ─── 2. Content Workflows (13 domains) ───────────────────────────────────────

const WORKFLOWS = [
  { key: "recruitment_screening", domain: "Talent Acquisition", title: "AI-Assisted Candidate Screening",
    description: "End-to-end workflow for using AI tools to screen and shortlist candidates.",
    steps: [
      { step: 1, action: "Define role requirements and screening criteria", riskPoint: "Criteria may encode historical bias" },
      { step: 2, action: "Configure AI screening parameters in ATS", aiUsage: "Set AI scoring weights and filters" },
      { step: 3, action: "AI processes applications and generates ranked shortlist", aiUsage: "Automated CV parsing and scoring" },
      { step: 4, action: "Human review of AI-generated shortlist", riskPoint: "Risk of rubber-stamping AI decisions" },
      { step: 5, action: "Bias audit of shortlisted candidates", aiUsage: "Diversity analytics review" },
      { step: 6, action: "Final shortlist approval and candidate communication", riskPoint: "Automated rejection without review" }
    ],
    aiUsagePoints: ["CV parsing and scoring","Diversity analytics","Automated candidate communications"],
    riskPoints: ["Algorithmic bias in screening","GDPR compliance for candidate data","Transparency obligations"],
    govReqs: ["Equality Act 2010 compliance","GDPR Article 22 (automated decision-making)","ICO guidance on AI in recruitment"],
    roles: ["talent_acquisition_partner","recruitment_coordinator"] },

  { key: "performance_management", domain: "Performance Management", title: "AI-Enhanced Performance Review",
    description: "Using AI analytics tools to support objective-setting, continuous feedback, and performance evaluation.",
    steps: [
      { step: 1, action: "Objective-setting with AI-suggested KPIs", aiUsage: "AI benchmarks comparable roles" },
      { step: 2, action: "Continuous feedback collection via AI tools", aiUsage: "Sentiment analysis of feedback" },
      { step: 3, action: "Mid-year AI performance analytics review", aiUsage: "Performance trend analysis" },
      { step: 4, action: "Manager review of AI-generated performance insights", riskPoint: "Over-reliance on algorithmic scores" },
      { step: 5, action: "Calibration session with AI equity analysis", aiUsage: "Bias detection in ratings" },
      { step: 6, action: "Final rating and development planning", riskPoint: "Algorithmic performance management" }
    ],
    aiUsagePoints: ["KPI benchmarking","Feedback sentiment analysis","Performance trend analytics","Bias detection in ratings"],
    riskPoints: ["Algorithmic management concerns","Employee surveillance","Rating bias amplification"],
    govReqs: ["Employment Rights Act obligations","GDPR processing for performance data","Transparency in automated scoring"],
    roles: ["hr_business_partner","senior_hrbp"] },

  { key: "workforce_planning", domain: "Workforce Planning", title: "AI-Driven Workforce Planning",
    description: "Predictive workforce planning using AI models for headcount, skills, and attrition forecasting.",
    steps: [
      { step: 1, action: "Data collection and quality validation", riskPoint: "Garbage-in-garbage-out risk" },
      { step: 2, action: "Run AI attrition and demand forecasting models", aiUsage: "Predictive ML models" },
      { step: 3, action: "Skills gap analysis using AI capability mapping", aiUsage: "Skills inference from job data" },
      { step: 4, action: "Scenario modelling with AI simulation tools", aiUsage: "What-if workforce scenarios" },
      { step: 5, action: "Human validation and assumption testing", riskPoint: "Treating forecasts as certainties" },
      { step: 6, action: "Present plan to leadership with confidence intervals", riskPoint: "Overconfident AI projections" }
    ],
    aiUsagePoints: ["Attrition prediction","Demand forecasting","Skills gap analysis","Scenario modelling"],
    riskPoints: ["Model accuracy and uncertainty","Bias in historical data","Ethical use of predictive data"],
    govReqs: ["Data minimisation principles","Transparency in algorithmic decisions","Employee consultation requirements"],
    roles: ["workforce_planning_analyst","people_analytics_lead","hr_business_partner"] },

  { key: "er_case_management", domain: "Employee Relations", title: "AI-Assisted ER Case Management",
    description: "Managing disciplinary, grievance, and complex ER cases with AI support tools.",
    steps: [
      { step: 1, action: "Case intake and initial AI risk assessment", aiUsage: "AI case categorisation and risk scoring" },
      { step: 2, action: "Evidence gathering with AI document analysis", aiUsage: "AI document summarisation" },
      { step: 3, action: "Precedent research using AI case analysis tools", aiUsage: "Similar case identification" },
      { step: 4, action: "Human review and case strategy development", riskPoint: "AI risk scores influencing outcomes" },
      { step: 5, action: "Investigation and hearing management", riskPoint: "Data protection in case handling" },
      { step: 6, action: "Outcome decision and documentation", riskPoint: "Delegating decisions to AI" }
    ],
    aiUsagePoints: ["Case risk scoring","Document summarisation","Precedent analysis"],
    riskPoints: ["Pre-determination via AI risk scores","Data protection breaches","Fairness in automated analysis"],
    govReqs: ["ACAS Code of Practice","Employment Tribunal risk","GDPR special category data","Natural justice principles"],
    roles: ["employee_relations_manager","er_advisor"] },

  { key: "pay_equity_analysis", domain: "Compensation & Benefits", title: "AI Pay Equity Analysis",
    description: "Using AI analytics to identify and address pay gaps across protected characteristics.",
    steps: [
      { step: 1, action: "Data preparation and anonymisation", riskPoint: "Re-identification risk" },
      { step: 2, action: "Run AI pay gap analysis model", aiUsage: "Statistical pay equity modelling" },
      { step: 3, action: "Identify unexplained pay gaps by characteristic", aiUsage: "AI disparity detection" },
      { step: 4, action: "Root cause analysis with HR and business", riskPoint: "Misattributing AI findings" },
      { step: 5, action: "Remediation planning and approval", riskPoint: "Inadequate action on AI findings" },
      { step: 6, action: "Gender Pay Gap reporting and disclosure", govReq: "Equality Act 2010 s.78" }
    ],
    aiUsagePoints: ["Statistical pay modelling","Disparity detection","Trend analysis"],
    riskPoints: ["Algorithmic bias in analysis","Legal exposure from findings","Data protection for sensitive attributes"],
    govReqs: ["Equality Act 2010","Gender Pay Gap Reporting Regulations","GDPR special category data"],
    roles: ["reward_manager","compensation_analyst","dei_manager"] },

  { key: "learning_needs_analysis", domain: "Learning & Development", title: "AI-Powered Learning Needs Analysis",
    description: "Identifying capability gaps and designing personalised learning using AI analytics.",
    steps: [
      { step: 1, action: "Collect performance and skills data", aiUsage: "AI data aggregation from multiple sources" },
      { step: 2, action: "AI capability gap analysis", aiUsage: "Skills inference and gap modelling" },
      { step: 3, action: "Generate personalised learning recommendations", aiUsage: "AI learning path generation" },
      { step: 4, action: "Human review of AI recommendations", riskPoint: "Accepting AI paths without review" },
      { step: 5, action: "Content curation and delivery planning", aiUsage: "AI content matching" },
      { step: 6, action: "Effectiveness measurement with AI analytics", aiUsage: "Learning impact analytics" }
    ],
    aiUsagePoints: ["Skills inference","Gap modelling","Learning path generation","Impact analytics"],
    riskPoints: ["Labelling employees based on AI scores","Accessibility of AI-recommended content"],
    govReqs: ["Equality Act accessibility requirements","Data minimisation in skills profiling"],
    roles: ["learning_development_manager","instructional_designer"] },

  { key: "redundancy_selection", domain: "Redundancy & Restructuring", title: "AI-Assisted Redundancy Selection",
    description: "Using AI tools to support fair and defensible redundancy selection processes.",
    steps: [
      { step: 1, action: "Define selection criteria with legal review", riskPoint: "Criteria encoding protected characteristics" },
      { step: 2, action: "AI-assisted scoring of selection criteria", aiUsage: "Automated criteria scoring" },
      { step: 3, action: "Human review of AI-generated scores", riskPoint: "Rubber-stamping AI outputs" },
      { step: 4, action: "Bias audit of selection outcomes", aiUsage: "Disparate impact analysis" },
      { step: 5, action: "Individual consultation and appeal process", riskPoint: "Inadequate explanation of AI scores" },
      { step: 6, action: "Final decisions and documentation", govReq: "Employment Rights Act 1996" }
    ],
    aiUsagePoints: ["Criteria scoring","Disparate impact analysis"],
    riskPoints: ["Indirect discrimination via AI","Transparency in selection","Employment tribunal risk"],
    govReqs: ["Employment Rights Act 1996","Equality Act 2010","ACAS guidance on redundancy","ICO AI transparency"],
    roles: ["employee_relations_manager","hr_business_partner","senior_hrbp"] },

  { key: "engagement_analytics", domain: "Employee Engagement", title: "AI Engagement Analytics",
    description: "Analysing employee sentiment and engagement using AI tools and survey analytics.",
    steps: [
      { step: 1, action: "Survey design with AI question optimisation", aiUsage: "AI question bias detection" },
      { step: 2, action: "Data collection with anonymisation protocols", riskPoint: "Re-identification in small teams" },
      { step: 3, action: "AI sentiment and theme analysis", aiUsage: "NLP sentiment analysis" },
      { step: 4, action: "Insight generation and action planning", riskPoint: "Misinterpreting AI sentiment scores" },
      { step: 5, action: "Communication of findings to employees", riskPoint: "Surveillance perception" },
      { step: 6, action: "Action tracking with AI progress monitoring", aiUsage: "Outcome analytics" }
    ],
    aiUsagePoints: ["Sentiment analysis","Theme extraction","Trend analytics"],
    riskPoints: ["Employee surveillance concerns","Re-identification risk","Misuse of sentiment data"],
    govReqs: ["GDPR consent and transparency","ICO employee monitoring guidance","Works council consultation"],
    roles: ["hr_business_partner","od_consultant","people_analytics_lead"] },

  { key: "succession_planning", domain: "Talent Management", title: "AI-Assisted Succession Planning",
    description: "Identifying and developing future leaders using AI talent analytics and potential assessment.",
    steps: [
      { step: 1, action: "Define leadership criteria and competency framework", riskPoint: "Criteria encoding historical bias" },
      { step: 2, action: "AI talent identification from performance data", aiUsage: "Potential prediction models" },
      { step: 3, action: "Calibration with AI equity analysis", aiUsage: "Diversity in pipeline analytics" },
      { step: 4, action: "Development planning for identified talent", aiUsage: "AI-personalised development paths" },
      { step: 5, action: "Transparency and communication to employees", riskPoint: "Lack of transparency about AI use" },
      { step: 6, action: "Pipeline monitoring and refresh", aiUsage: "Ongoing talent analytics" }
    ],
    aiUsagePoints: ["Potential prediction","Diversity analytics","Development path generation"],
    riskPoints: ["Algorithmic bias in potential assessment","Lack of transparency","Protected characteristic discrimination"],
    govReqs: ["Equality Act 2010","GDPR transparency obligations","ICO guidance on profiling"],
    roles: ["hr_business_partner","od_consultant","chief_people_officer","talent_management_partner"] },

  { key: "onboarding_automation", domain: "HR Operations", title: "AI-Enhanced Onboarding",
    description: "Automating and personalising the employee onboarding experience with AI tools.",
    steps: [
      { step: 1, action: "Pre-boarding AI communication and document collection", aiUsage: "Automated document processing" },
      { step: 2, action: "Personalised onboarding path generation", aiUsage: "AI role-based content matching" },
      { step: 3, action: "AI chatbot for new joiner queries", aiUsage: "Onboarding chatbot deployment" },
      { step: 4, action: "Progress monitoring with AI analytics", aiUsage: "Onboarding completion tracking" },
      { step: 5, action: "30/60/90 day check-ins with AI sentiment", aiUsage: "Early engagement analytics" },
      { step: 6, action: "Onboarding effectiveness review", aiUsage: "AI outcome analytics" }
    ],
    aiUsagePoints: ["Document automation","Personalised content","Chatbot support","Sentiment monitoring"],
    riskPoints: ["Inadequate human touchpoints","Chatbot escalation failures","Data handling for new joiners"],
    govReqs: ["Right to work verification requirements","GDPR for new joiner data","Equality Act accessibility"],
    roles: ["hr_operations_manager","hr_advisor","recruitment_coordinator"] },

  { key: "dei_analytics", domain: "Diversity, Equity & Inclusion", title: "AI DEI Analytics",
    description: "Using AI to measure, monitor, and improve diversity, equity, and inclusion outcomes.",
    steps: [
      { step: 1, action: "Ethical framework and consent design", riskPoint: "Surveillance of protected characteristics" },
      { step: 2, action: "Data collection with appropriate safeguards", aiUsage: "Anonymised data aggregation" },
      { step: 3, action: "AI bias audit across HR processes", aiUsage: "Algorithmic bias detection" },
      { step: 4, action: "Intersectionality analysis", aiUsage: "Multi-characteristic disparity analysis" },
      { step: 5, action: "Action planning and target-setting", riskPoint: "Algorithmic solutions to structural issues" },
      { step: 6, action: "Reporting and accountability", govReq: "Equality Act reporting obligations" }
    ],
    aiUsagePoints: ["Bias detection","Disparity analysis","Intersectionality modelling"],
    riskPoints: ["Defining protected characteristics algorithmically","Surveillance concerns","Misuse of sensitive data"],
    govReqs: ["Equality Act 2010","GDPR special category data","ICO guidance on sensitive data"],
    roles: ["dei_manager","dei_analyst","people_analytics_lead"] },

  { key: "ai_governance_review", domain: "AI Governance", title: "HR AI Tool Governance Review",
    description: "Evaluating, approving, and monitoring AI tools used in HR processes.",
    steps: [
      { step: 1, action: "AI tool inventory and risk classification", aiUsage: "Automated tool discovery" },
      { step: 2, action: "Bias and fairness assessment", aiUsage: "Algorithmic audit tools" },
      { step: 3, action: "Legal and regulatory compliance review", riskPoint: "EU AI Act high-risk classification" },
      { step: 4, action: "Data protection impact assessment (DPIA)", govReq: "GDPR Article 35" },
      { step: 5, action: "Approval and monitoring framework", riskPoint: "Insufficient ongoing monitoring" },
      { step: 6, action: "Employee communication and transparency", govReq: "GDPR transparency obligations" }
    ],
    aiUsagePoints: ["Tool risk classification","Bias auditing"],
    riskPoints: ["High-risk AI Act classification","Inadequate DPIAs","Vendor lock-in"],
    govReqs: ["EU AI Act 2024","GDPR Article 22 and 35","ICO guidance","Equality Act 2010"],
    roles: ["chief_people_officer","hr_director","people_analytics_lead","dei_manager"] },

  { key: "hr_chatbot_management", domain: "HR Operations", title: "HR Chatbot and AI Assistant Management",
    description: "Deploying and managing AI chatbots and virtual assistants for employee self-service.",
    steps: [
      { step: 1, action: "Use case definition and scope setting", riskPoint: "Scope creep into sensitive areas" },
      { step: 2, action: "Chatbot configuration and knowledge base build", aiUsage: "AI knowledge base creation" },
      { step: 3, action: "Testing with diverse user groups", riskPoint: "Bias in chatbot responses" },
      { step: 4, action: "Escalation pathway design", riskPoint: "Inadequate human escalation" },
      { step: 5, action: "Deployment with monitoring", aiUsage: "Usage and satisfaction analytics" },
      { step: 6, action: "Regular review and update cycle", riskPoint: "Outdated information in chatbot" }
    ],
    aiUsagePoints: ["Knowledge base automation","Query classification","Usage analytics"],
    riskPoints: ["Incorrect advice on sensitive matters","Inadequate escalation","Accessibility failures"],
    govReqs: ["GDPR for conversation data","Equality Act accessibility","Consumer Duty (if applicable)"],
    roles: ["hr_operations_manager","hr_systems_specialist"] },
];

// ─── 3. Content Tags ──────────────────────────────────────────────────────────

const TAGS = [
  { key: "cap_execution", label: "AI Execution", category: "capability" },
  { key: "cap_judgement", label: "AI Judgement", category: "capability" },
  { key: "cap_governance", label: "AI Governance", category: "capability" },
  { key: "cap_appropriateness", label: "AI Appropriateness", category: "capability" },
  { key: "cap_workflow", label: "AI Workflow", category: "capability" },
  { key: "cap_data", label: "AI Data & Insight", category: "capability" },
  { key: "dom_recruitment", label: "Recruitment", category: "domain" },
  { key: "dom_performance", label: "Performance Management", category: "domain" },
  { key: "dom_er", label: "Employee Relations", category: "domain" },
  { key: "dom_reward", label: "Compensation & Benefits", category: "domain" },
  { key: "dom_learning", label: "Learning & Development", category: "domain" },
  { key: "dom_workforce", label: "Workforce Planning", category: "domain" },
  { key: "dom_dei", label: "DEI", category: "domain" },
  { key: "dom_ops", label: "HR Operations", category: "domain" },
  { key: "dom_governance", label: "AI Governance", category: "domain" },
  { key: "dom_talent", label: "Talent Management", category: "domain" },
  { key: "int_sjt", label: "Situational Judgement", category: "interaction_type" },
  { key: "int_critique", label: "Critique", category: "interaction_type" },
  { key: "int_output_improvement", label: "Output Improvement", category: "interaction_type" },
  { key: "int_error_detection", label: "Error Detection", category: "interaction_type" },
  { key: "int_prioritisation", label: "Prioritisation", category: "interaction_type" },
  { key: "int_risk_judgement", label: "Risk Judgement", category: "interaction_type" },
  { key: "int_data_interpretation", label: "Data Interpretation", category: "interaction_type" },
  { key: "int_governance", label: "Governance Decision", category: "interaction_type" },
  { key: "risk_legal", label: "Legal Risk", category: "risk" },
  { key: "risk_bias", label: "Bias Risk", category: "risk" },
  { key: "risk_data_protection", label: "Data Protection Risk", category: "risk" },
  { key: "risk_er", label: "ER Risk", category: "risk" },
  { key: "risk_governance", label: "Governance Risk", category: "risk" },
  { key: "gov_gdpr", label: "GDPR", category: "governance" },
  { key: "gov_equality_act", label: "Equality Act 2010", category: "governance" },
  { key: "gov_acas", label: "ACAS Code", category: "governance" },
  { key: "gov_eu_ai_act", label: "EU AI Act", category: "governance" },
  { key: "gov_employment_rights", label: "Employment Rights Act", category: "governance" },
];

// ─── 4. Scenarios (200+ across all 6 capabilities × multiple domains) ─────────

const SCENARIOS = [
  // ── EXECUTION ─────────────────────────────────────────────────────────────
  { id: "CS-EX-001", title: "Configuring AI Screening Weights", domain: "Talent Acquisition", cap: "execution",
    type: "situational_judgement", difficulty: 2, risk: "Medium", govSensitive: false,
    scenario: "You are a Talent Acquisition Partner setting up an AI screening tool for a high-volume graduate recruitment campaign. The system asks you to assign weights to screening criteria: degree classification (30%), university ranking (25%), work experience (25%), and extracurricular activities (20%). Your manager has asked you to prioritise 'top university' candidates to maintain 'quality standards'.",
    constraint: "You have 200 applications to process and the hiring manager wants a shortlist of 20 by end of week. The AI tool will automatically reject candidates below a threshold score.",
    question: "What is your most appropriate next step before configuring and deploying the AI screening weights?",
    signal: "bias_awareness", workflow: "recruitment_screening",
    roles: ["talent_acquisition_partner","recruitment_coordinator"],
    failureModes: ["algorithmic_bias","over_reliance"],
    tags: ["dom_recruitment","cap_execution","risk_bias","gov_equality_act"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Configure the weights as requested by your manager and deploy the tool immediately to meet the deadline", value: "a", outcome: "poor", deltas: { bias_awareness: -2, governance_knowledge: -1, execution_quality: -1 }, rationale: "This perpetuates potential bias and ignores legal obligations.", optimal: false },
      { order: 2, label: "Review whether the proposed criteria, particularly university ranking, could create indirect discrimination before configuring the tool", value: "b", outcome: "excellent", deltas: { bias_awareness: 3, governance_knowledge: 2, execution_quality: 2 }, rationale: "Reviewing criteria for potential discrimination is essential before deploying AI screening.", optimal: true },
      { order: 3, label: "Deploy the tool with the requested weights but add a manual review step for all rejections", value: "c", outcome: "partial", deltas: { bias_awareness: 1, governance_knowledge: 0, execution_quality: 1 }, rationale: "Adding review is positive but the underlying bias in criteria remains unaddressed.", optimal: false },
      { order: 4, label: "Ask the AI vendor whether their tool is bias-free before proceeding", value: "d", outcome: "poor", deltas: { bias_awareness: -1, governance_knowledge: -1, execution_quality: 0 }, rationale: "Vendor assurances are insufficient — independent review is required.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Proactively identifies discrimination risk before deployment and seeks to address root cause in criteria design", range: "85-100" },
      { key: "good", label: "Good", description: "Adds safeguards but does not fully address the bias in criteria", range: "65-84" },
      { key: "poor", label: "Poor", description: "Proceeds without bias review or relies on vendor assurances", range: "0-44" },
    ] },

  { id: "CS-EX-002", title: "AI Job Description Generation", domain: "Talent Acquisition", cap: "execution",
    type: "output_improvement", difficulty: 2, risk: "Medium", govSensitive: false,
    scenario: "You are a Recruitment Coordinator. You have used an AI tool to generate a job description for a Senior HR Advisor role. The AI has produced the following text: 'We are looking for a dynamic, energetic team player who thrives in a fast-paced environment. The ideal candidate will be a recent graduate with 5+ years of experience, native English speaker, and able to work long hours when required.'",
    constraint: "The job description needs to be posted today. Your hiring manager has approved it without reviewing it carefully.",
    question: "Which elements of this AI-generated job description require immediate revision before posting, and why?",
    signal: "bias_awareness", workflow: "recruitment_screening",
    roles: ["talent_acquisition_partner","recruitment_coordinator"],
    failureModes: ["over_reliance","algorithmic_bias"],
    tags: ["dom_recruitment","cap_execution","risk_bias","gov_equality_act"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Post the job description as approved — the AI tool is designed to produce compliant content", value: "a", outcome: "poor", deltas: { bias_awareness: -2, execution_quality: -2 }, rationale: "The JD contains multiple potentially discriminatory elements.", optimal: false },
      { order: 2, label: "Remove 'recent graduate with 5+ years experience' (contradictory and potentially age discriminatory), 'native English speaker' (nationality/race discrimination), and 'long hours' (disability/caring responsibilities)", value: "b", outcome: "excellent", deltas: { bias_awareness: 3, execution_quality: 3 }, rationale: "Correctly identifies all three discriminatory elements.", optimal: true },
      { order: 3, label: "Remove only 'native English speaker' as this is the most obviously discriminatory phrase", value: "c", outcome: "partial", deltas: { bias_awareness: 1, execution_quality: 1 }, rationale: "Partially correct but misses other discriminatory elements.", optimal: false },
      { order: 4, label: "Ask the AI to regenerate the job description with a prompt to 'make it more inclusive'", value: "d", outcome: "partial", deltas: { bias_awareness: 1, execution_quality: 0 }, rationale: "Regenerating may help but doesn't guarantee compliance and delays the review.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Identifies all discriminatory elements with correct legal reasoning", range: "85-100" },
      { key: "good", label: "Good", description: "Identifies most discriminatory elements", range: "65-84" },
      { key: "poor", label: "Poor", description: "Posts without review or misses key issues", range: "0-44" },
    ] },

  { id: "CS-EX-003", title: "AI Interview Scheduling Failure", domain: "Talent Acquisition", cap: "execution",
    type: "error_detection", difficulty: 1, risk: "Low", govSensitive: false,
    scenario: "Your AI scheduling tool has automatically sent interview invitations to 50 candidates for a role. You notice that the tool has scheduled all interviews between 9am and 3pm on weekdays only, and has not included any information about reasonable adjustments or accessibility requirements.",
    constraint: "Interviews are scheduled to begin in 3 days.",
    question: "What is the most important immediate action to take?",
    signal: "execution_quality", workflow: "recruitment_screening",
    roles: ["recruitment_coordinator","talent_acquisition_partner"],
    failureModes: ["accessibility_failure","over_reliance"],
    tags: ["dom_recruitment","cap_execution","risk_bias","gov_equality_act"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Send a follow-up communication to all candidates asking if they require reasonable adjustments and offering flexible scheduling options", value: "a", outcome: "excellent", deltas: { execution_quality: 3, bias_awareness: 2 }, rationale: "Proactively addresses accessibility and scheduling barriers.", optimal: true },
      { order: 2, label: "Proceed with the scheduled interviews — candidates who need adjustments will contact you", value: "b", outcome: "poor", deltas: { execution_quality: -2, bias_awareness: -2 }, rationale: "Passive approach fails the reasonable adjustments duty.", optimal: false },
      { order: 3, label: "Cancel all interviews and reschedule manually to include evening and weekend options", value: "c", outcome: "partial", deltas: { execution_quality: 1, bias_awareness: 1 }, rationale: "Overcorrects — a targeted follow-up is more proportionate.", optimal: false },
      { order: 4, label: "Update the AI scheduling tool settings for future use but proceed with current interviews", value: "d", outcome: "poor", deltas: { execution_quality: -1, bias_awareness: -1 }, rationale: "Fixes future issues but fails current candidates.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Immediately addresses accessibility gap for current cohort", range: "85-100" },
      { key: "poor", label: "Poor", description: "Fails to act on accessibility issue", range: "0-44" },
    ] },

  { id: "CS-EX-004", title: "AI Performance Dashboard Interpretation", domain: "Performance Management", cap: "execution",
    type: "data_interpretation", difficulty: 3, risk: "High", govSensitive: false,
    scenario: "You are an HR Business Partner. Your AI performance analytics platform shows that employees in Team B have an average 'performance score' of 6.2/10 compared to Team A's 8.4/10. The AI has flagged Team B as 'high risk' and recommended 'performance improvement interventions'. You know that Team B has been managing a complex system migration for the past 6 months.",
    constraint: "Your HR Director has asked you to present recommendations based on this data at tomorrow's leadership meeting.",
    question: "How should you interpret and present this AI performance data to leadership?",
    signal: "data_critical_thinking", workflow: "performance_management",
    roles: ["hr_business_partner","senior_hrbp"],
    failureModes: ["over_reliance","model_uncertainty_ignored"],
    tags: ["dom_performance","cap_execution","cap_data","risk_bias"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Present the AI data as showing Team B underperformance and recommend a performance improvement programme", value: "a", outcome: "poor", deltas: { data_critical_thinking: -2, judgement_quality: -2 }, rationale: "Ignores contextual factors that explain the performance differential.", optimal: false },
      { order: 2, label: "Contextualise the data by explaining the system migration impact, question the AI's risk classification, and recommend a qualitative assessment before any interventions", value: "b", outcome: "excellent", deltas: { data_critical_thinking: 3, judgement_quality: 3 }, rationale: "Correctly challenges AI output with contextual knowledge.", optimal: true },
      { order: 3, label: "Present the data but add a note that Team B has been managing a migration", value: "c", outcome: "partial", deltas: { data_critical_thinking: 1, judgement_quality: 1 }, rationale: "Adds context but doesn't challenge the AI's risk classification.", optimal: false },
      { order: 4, label: "Ask the AI tool to re-run the analysis excluding the migration period", value: "d", outcome: "partial", deltas: { data_critical_thinking: 1, judgement_quality: 0 }, rationale: "Useful but doesn't address the fundamental question of AI reliability.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Critically evaluates AI output with contextual knowledge and recommends appropriate next steps", range: "85-100" },
      { key: "poor", label: "Poor", description: "Accepts AI classification without challenge", range: "0-44" },
    ] },

  { id: "CS-EX-005", title: "AI CV Parsing Accuracy Check", domain: "Talent Acquisition", cap: "execution",
    type: "error_detection", difficulty: 2, risk: "Medium", govSensitive: false,
    scenario: "You are reviewing the output of your AI CV parsing tool after a graduate recruitment campaign. You notice that the tool has failed to extract qualifications from CVs formatted as PDFs with tables, has misread dates on several CVs, and has assigned 'no experience' to candidates who listed internships under non-standard headings.",
    constraint: "500 CVs have been processed. The tool has already rejected 120 candidates based on parsed data.",
    question: "What is your most important immediate action?",
    signal: "execution_quality", workflow: "recruitment_screening",
    roles: ["talent_acquisition_partner","recruitment_coordinator"],
    failureModes: ["over_reliance","algorithmic_bias"],
    tags: ["dom_recruitment","cap_execution","risk_bias"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Continue with the remaining applications — the parsing errors affect only a small percentage", value: "a", outcome: "poor", deltas: { execution_quality: -2 }, rationale: "120 potentially wrongful rejections requires immediate review.", optimal: false },
      { order: 2, label: "Pause automated rejections, manually review the 120 rejected candidates, and fix the parsing configuration before processing more applications", value: "b", outcome: "excellent", deltas: { execution_quality: 3 }, rationale: "Correctly prioritises reviewing potentially wrongful rejections.", optimal: true },
      { order: 3, label: "Report the issue to the AI vendor and wait for a fix", value: "c", outcome: "poor", deltas: { execution_quality: -1 }, rationale: "Waiting for vendor fix doesn't address the 120 affected candidates.", optimal: false },
      { order: 4, label: "Add a note to rejected candidates' files that their rejection may have been due to parsing errors", value: "d", outcome: "poor", deltas: { execution_quality: -2 }, rationale: "Noting errors without acting on them fails the candidates.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Pauses process and reviews all potentially wrongful rejections", range: "85-100" },
      { key: "poor", label: "Poor", description: "Continues without reviewing affected candidates", range: "0-44" },
    ] },

  { id: "CS-EX-006", title: "AI Prompt Engineering for HR Tasks", domain: "HR Operations", cap: "execution",
    type: "output_improvement", difficulty: 2, risk: "Low", govSensitive: false,
    scenario: "You are an HR Advisor using an AI writing assistant to draft a letter confirming a salary increase. You have entered the prompt: 'Write a letter about salary.' The AI has produced a generic template with placeholder text. Your manager asks why the letter isn't ready yet.",
    constraint: "The letter needs to be sent today. The employee's new salary is £45,000, effective 1 May 2026, with a 5% increase from £42,857.",
    question: "What is the most effective prompt to use to get a useful output from the AI tool?",
    signal: "execution_quality", workflow: "onboarding_automation",
    roles: ["hr_advisor","hr_operations_manager"],
    failureModes: ["over_reliance"],
    tags: ["dom_ops","cap_execution"],
    ambiguity: "low",
    options: [
      { order: 1, label: "'Write a professional salary increase confirmation letter. New salary: £45,000 effective 1 May 2026 (5% increase from £42,857). Include: purpose, new salary figure, effective date, next steps. Tone: formal, positive.'", value: "a", outcome: "excellent", deltas: { execution_quality: 3 }, rationale: "Specific, structured prompt with all required information.", optimal: true },
      { order: 2, label: "'Write a better letter about salary increase'", value: "b", outcome: "poor", deltas: { execution_quality: -1 }, rationale: "Still too vague to produce a useful output.", optimal: false },
      { order: 3, label: "'Write a salary increase letter for £45,000'", value: "c", outcome: "partial", deltas: { execution_quality: 1 }, rationale: "Better but missing key details like effective date and previous salary.", optimal: false },
      { order: 4, label: "Ask the AI to improve its own output without providing additional information", value: "d", outcome: "poor", deltas: { execution_quality: -1 }, rationale: "Without additional information the AI cannot improve the output meaningfully.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Provides specific, structured prompt with all required information", range: "85-100" },
      { key: "poor", label: "Poor", description: "Uses vague prompts without specific information", range: "0-44" },
    ] },

  { id: "CS-EX-007", title: "AI Learning Content Quality Review", domain: "Learning & Development", cap: "execution",
    type: "output_improvement", difficulty: 2, risk: "Low", govSensitive: false,
    scenario: "You are an Instructional Designer. You have used an AI tool to generate a 30-minute e-learning module on 'Unconscious Bias in Recruitment'. You review the AI-generated content and notice: (1) it contains several factual inaccuracies about UK employment law, (2) it uses US-centric examples, (3) it lacks interactive elements, (4) it doesn't reference any research or evidence base.",
    constraint: "The module is due to go live next week. Your manager says: 'The AI has done most of the work — just review it quickly and publish.'",
    question: "What is your most appropriate response?",
    signal: "execution_quality", workflow: "learning_needs_analysis",
    roles: ["instructional_designer","learning_development_manager"],
    failureModes: ["over_reliance"],
    tags: ["dom_learning","cap_execution","cap_workflow"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Publish the module with minor edits — the AI has done the heavy lifting", value: "a", outcome: "poor", deltas: { execution_quality: -2 }, rationale: "Publishing content with legal inaccuracies is unacceptable.", optimal: false },
      { order: 2, label: "Delay publication to correct the legal inaccuracies, localise examples to UK context, add interactive elements, and include an evidence base — the AI output is a draft requiring substantial human review and enhancement", value: "b", outcome: "excellent", deltas: { execution_quality: 3 }, rationale: "Correctly treats AI output as a draft requiring thorough human review.", optimal: true },
      { order: 3, label: "Add a disclaimer that the content was AI-generated and may contain inaccuracies", value: "c", outcome: "poor", deltas: { execution_quality: -2 }, rationale: "A disclaimer doesn't fix legal inaccuracies in compliance training.", optimal: false },
      { order: 4, label: "Ask the AI to fix the identified issues and then publish", value: "d", outcome: "partial", deltas: { execution_quality: 1 }, rationale: "AI can help fix some issues but human review is still required for legal accuracy.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Delays publication and conducts thorough human review and enhancement", range: "85-100" },
      { key: "poor", label: "Poor", description: "Publishes with minimal review or adds disclaimer without fixing issues", range: "0-44" },
    ] },

  // ── JUDGEMENT ─────────────────────────────────────────────────────────────
  { id: "CS-JU-001", title: "AI Redundancy Selection Score", domain: "Redundancy & Restructuring", cap: "judgement",
    type: "risk_judgement", difficulty: 4, risk: "Critical", govSensitive: true,
    scenario: "You are an Employee Relations Manager overseeing a redundancy process. The AI selection tool has scored 45 employees. Employee X has received the lowest score (32/100) and is therefore selected for redundancy. You know that Employee X returned from maternity leave 3 months ago and has been on a phased return. The AI scoring criteria included 'attendance record' and 'recent performance ratings'.",
    constraint: "The business is under pressure to complete the redundancy process within 2 weeks. Your manager says the AI scores are 'objective and defensible'.",
    question: "What is the most critical issue with proceeding with Employee X's redundancy based on this AI score?",
    signal: "governance_knowledge", workflow: "redundancy_selection",
    roles: ["employee_relations_manager","hr_business_partner","senior_hrbp"],
    failureModes: ["algorithmic_bias","over_reliance","transparency_failure"],
    tags: ["dom_er","cap_judgement","cap_governance","risk_legal","risk_bias","gov_equality_act","gov_employment_rights"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Proceed with the redundancy — the AI score is objective and the process is defensible", value: "a", outcome: "poor", deltas: { governance_knowledge: -3, judgement_quality: -3 }, rationale: "This is likely indirect sex discrimination — maternity-related absence affecting attendance scores.", optimal: false },
      { order: 2, label: "Immediately pause Employee X's selection and review whether maternity-related absence and phased return have been excluded from the attendance and performance criteria, as this is likely indirect sex discrimination", value: "b", outcome: "excellent", deltas: { governance_knowledge: 3, judgement_quality: 3 }, rationale: "Correctly identifies the legal risk and appropriate immediate action.", optimal: true },
      { order: 3, label: "Ask the AI vendor whether their tool accounts for protected characteristics", value: "c", outcome: "poor", deltas: { governance_knowledge: -1, judgement_quality: -1 }, rationale: "Vendor assurances are insufficient — the legal risk requires immediate action.", optimal: false },
      { order: 4, label: "Add a note to the file that Employee X was recently on maternity leave and proceed", value: "d", outcome: "poor", deltas: { governance_knowledge: -2, judgement_quality: -2 }, rationale: "Noting the issue without acting on it does not discharge the legal duty.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Immediately identifies indirect sex discrimination risk and pauses the process", range: "85-100" },
      { key: "poor", label: "Poor", description: "Proceeds without addressing the legal risk", range: "0-44" },
    ] },

  { id: "CS-JU-002", title: "AI Flight Risk Score — Action Decision", domain: "Talent Management", cap: "judgement",
    type: "situational_judgement", difficulty: 3, risk: "High", govSensitive: false,
    scenario: "Your people analytics platform has flagged three employees as 'high flight risk' with scores of 87%, 82%, and 79%. The AI model uses factors including recent salary benchmarking, LinkedIn activity, tenure, and manager relationship scores. Your HR Director asks you to 'take action on these three before they leave'.",
    constraint: "You have not spoken to these employees or their managers. The AI model has a stated accuracy of 73% for 12-month attrition prediction.",
    question: "What is the most appropriate response to the HR Director's request?",
    signal: "judgement_quality", workflow: "succession_planning",
    roles: ["people_analytics_lead","hr_business_partner"],
    failureModes: ["over_reliance","model_uncertainty_ignored","transparency_failure"],
    tags: ["dom_workforce","cap_judgement","cap_data","risk_governance"],
    ambiguity: "high",
    options: [
      { order: 1, label: "Immediately contact the three employees' managers to discuss retention interventions based on the AI scores", value: "a", outcome: "partial", deltas: { judgement_quality: 0, governance_knowledge: -1 }, rationale: "Acting without transparency or validation risks breaching employee trust.", optimal: false },
      { order: 2, label: "Recommend a structured approach: validate the scores with qualitative manager conversations, consider whether LinkedIn monitoring is appropriate, and design transparent retention conversations rather than covert interventions", value: "b", outcome: "excellent", deltas: { judgement_quality: 3, governance_knowledge: 2 }, rationale: "Balances action with appropriate validation and ethical considerations.", optimal: true },
      { order: 3, label: "Ignore the AI scores — a 73% accuracy rate means 27% of flagged employees are false positives", value: "c", outcome: "poor", deltas: { judgement_quality: -1, governance_knowledge: 0 }, rationale: "Dismissing the data entirely is not the right response — it needs validation.", optimal: false },
      { order: 4, label: "Present the AI scores to the three employees directly and ask them about their intentions", value: "d", outcome: "poor", deltas: { judgement_quality: -2, governance_knowledge: -1 }, rationale: "Disclosing AI profiling scores directly to employees without context is inappropriate.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Recommends validation, ethical approach, and transparent retention strategy", range: "85-100" },
      { key: "poor", label: "Poor", description: "Acts on AI scores without validation or ethical consideration", range: "0-44" },
    ] },

  { id: "CS-JU-003", title: "AI Sentiment Analysis — Grievance Risk", domain: "Employee Engagement", cap: "judgement",
    type: "risk_judgement", difficulty: 3, risk: "High", govSensitive: true,
    scenario: "Your AI engagement platform has analysed 6 months of internal communication data (emails, Slack messages, survey responses) and identified that a specific team has 'high grievance risk indicators' including 'negative sentiment clusters', 'increased absence patterns', and 'reduced collaboration scores'. The AI recommends 'proactive HR intervention'.",
    constraint: "Employees were informed that communications may be monitored for 'wellbeing purposes' in a general data privacy notice 2 years ago. The team manager is unaware of this analysis.",
    question: "Before taking any action, what is the most important consideration?",
    signal: "governance_knowledge", workflow: "engagement_analytics",
    roles: ["hr_business_partner","people_analytics_lead"],
    failureModes: ["consent_failure","scope_creep","transparency_failure"],
    tags: ["dom_er","cap_judgement","cap_governance","risk_data_protection","gov_gdpr"],
    ambiguity: "high",
    options: [
      { order: 1, label: "Immediately brief the team manager on the AI findings so they can address the issues", value: "a", outcome: "poor", deltas: { governance_knowledge: -2, judgement_quality: -1 }, rationale: "Sharing individual team data without proper legal basis and transparency is problematic.", optimal: false },
      { order: 2, label: "Review whether the lawful basis for monitoring communications is adequate, whether employees were meaningfully informed, and whether this use of data is within the stated purpose before taking any action", value: "b", outcome: "excellent", deltas: { governance_knowledge: 3, judgement_quality: 3 }, rationale: "Correctly prioritises legal basis and transparency before any action.", optimal: true },
      { order: 3, label: "Conduct a DPIA for this type of analysis before proceeding", value: "c", outcome: "good", deltas: { governance_knowledge: 2, judgement_quality: 2 }, rationale: "A DPIA is appropriate but the immediate priority is the lawful basis question.", optimal: false },
      { order: 4, label: "Proceed with the intervention — the general privacy notice covers this use", value: "d", outcome: "poor", deltas: { governance_knowledge: -3, judgement_quality: -2 }, rationale: "A general notice 2 years ago is unlikely to constitute adequate transparency for this specific use.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Prioritises legal basis and transparency review before any action", range: "85-100" },
      { key: "poor", label: "Poor", description: "Acts on AI data without addressing legal basis", range: "0-44" },
    ] },

  { id: "CS-JU-004", title: "AI Wellbeing Score — Absence Decision", domain: "Employee Wellbeing", cap: "judgement",
    type: "situational_judgement", difficulty: 3, risk: "High", govSensitive: false,
    scenario: "Your AI wellbeing platform has flagged an employee as 'high burnout risk' with a score of 89/100. The platform recommends 'immediate management intervention'. The employee's manager asks you: 'Should I put them on a performance improvement plan? The AI says they're struggling and their output has dropped.'",
    constraint: "The employee has not raised any concerns themselves. Their recent absence has been for a disclosed medical condition.",
    question: "How should you advise the manager?",
    signal: "judgement_quality", workflow: "performance_management",
    roles: ["hr_business_partner","hr_advisor"],
    failureModes: ["over_reliance","scope_creep"],
    tags: ["dom_performance","cap_judgement","cap_appropriateness","risk_legal"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Support the PIP — the AI score and performance drop justify it", value: "a", outcome: "poor", deltas: { judgement_quality: -3 }, rationale: "A PIP based on AI wellbeing scores without proper process is inappropriate and potentially discriminatory.", optimal: false },
      { order: 2, label: "Advise against a PIP — the AI score is a wellbeing indicator, not a performance measure. Recommend a supportive conversation with the employee about how to help them, considering their medical condition and reasonable adjustments.", value: "b", outcome: "excellent", deltas: { judgement_quality: 3 }, rationale: "Correctly distinguishes wellbeing indicators from performance measures.", optimal: true },
      { order: 3, label: "Recommend a return-to-work meeting to discuss the employee's situation before any formal action", value: "c", outcome: "good", deltas: { judgement_quality: 2 }, rationale: "A supportive conversation is appropriate but should be more explicit about the inappropriateness of a PIP.", optimal: false },
      { order: 4, label: "Ask the AI platform for more detail on why the employee scored 89 before advising", value: "d", outcome: "partial", deltas: { judgement_quality: 0 }, rationale: "Understanding the score is useful but the fundamental advice should not depend on it.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Distinguishes wellbeing indicators from performance measures and recommends supportive approach", range: "85-100" },
      { key: "poor", label: "Poor", description: "Supports PIP based on AI wellbeing score", range: "0-44" },
    ] },

  { id: "CS-JU-005", title: "AI Contradiction in ER Advice", domain: "Employee Relations", cap: "judgement",
    type: "critique", difficulty: 3, risk: "High", govSensitive: true,
    scenario: "You are an ER Advisor. You have used an AI tool to research how to handle a case where an employee has been absent for 6 months due to a mental health condition. The AI has advised: 'After 6 months of absence, you can issue a formal warning for attendance and begin a capability process.' A colleague says: 'The AI is right — we need to take action.'",
    constraint: "The employee has a diagnosed anxiety disorder. Their GP has provided a fit note. They have been in regular contact with their manager.",
    question: "What is your assessment of the AI's advice?",
    signal: "judgement_quality", workflow: "er_case_management",
    roles: ["er_advisor","employee_relations_manager"],
    failureModes: ["over_reliance","algorithmic_bias"],
    tags: ["dom_er","cap_judgement","cap_governance","risk_legal","gov_equality_act","gov_acas"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Follow the AI advice — 6 months is a long absence and action is needed", value: "a", outcome: "poor", deltas: { judgement_quality: -3 }, rationale: "The AI advice is legally dangerous — it ignores disability discrimination law.", optimal: false },
      { order: 2, label: "The AI advice is incorrect and legally dangerous. A diagnosed anxiety disorder is likely a disability under the Equality Act. Issuing a warning for absence related to disability without first exploring reasonable adjustments and following a supportive absence management process could constitute disability discrimination.", value: "b", outcome: "excellent", deltas: { judgement_quality: 3 }, rationale: "Correctly identifies the legal error in the AI's advice.", optimal: true },
      { order: 3, label: "Get a second opinion from a senior ER colleague before following the AI advice", value: "c", outcome: "good", deltas: { judgement_quality: 2 }, rationale: "Seeking a second opinion is appropriate but the legal issue should be identifiable.", optimal: false },
      { order: 4, label: "Follow the AI advice but ensure the process is well-documented", value: "d", outcome: "poor", deltas: { judgement_quality: -2 }, rationale: "Documentation doesn't mitigate the legal risk of following incorrect advice.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Identifies legal error in AI advice with specific reference to disability discrimination law", range: "85-100" },
      { key: "poor", label: "Poor", description: "Follows AI advice without challenge", range: "0-44" },
    ] },

  { id: "CS-JU-006", title: "AI Succession Pipeline Bias", domain: "Talent Management", cap: "judgement",
    type: "risk_judgement", difficulty: 4, risk: "Critical", govSensitive: true,
    scenario: "Your AI succession planning tool has identified the top 20 'high potential' employees for the senior leadership pipeline. You review the list and notice that 19 of the 20 are men, and 18 are from the same ethnic background as the current leadership team. The AI model was trained on historical promotion and performance data from the past 10 years.",
    constraint: "The CEO wants to present the succession pipeline at the next board meeting in 2 weeks.",
    question: "What is your most important action before presenting this pipeline to the board?",
    signal: "governance_knowledge", workflow: "succession_planning",
    roles: ["chief_people_officer","hr_director","people_analytics_lead","talent_management_partner"],
    failureModes: ["algorithmic_bias","over_reliance","vendor_trust_failure"],
    tags: ["dom_talent","cap_judgement","cap_governance","risk_bias","risk_legal","gov_equality_act"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Present the pipeline as generated — the AI is objective and the results reflect merit", value: "a", outcome: "poor", deltas: { governance_knowledge: -3, judgement_quality: -3 }, rationale: "The pipeline almost certainly reflects historical bias in the training data.", optimal: false },
      { order: 2, label: "Pause the pipeline presentation, commission an urgent bias audit of the AI model, and review whether the training data encodes historical discrimination before presenting to the board", value: "b", outcome: "excellent", deltas: { governance_knowledge: 3, judgement_quality: 3 }, rationale: "Correctly identifies the need for a bias audit before presenting a potentially discriminatory pipeline.", optimal: true },
      { order: 3, label: "Add more women and ethnic minority candidates to the pipeline manually to improve diversity", value: "c", outcome: "partial", deltas: { governance_knowledge: 1, judgement_quality: 0 }, rationale: "Manual adjustment addresses the symptom but not the root cause of the AI bias.", optimal: false },
      { order: 4, label: "Present the pipeline with a note that diversity is an area for development", value: "d", outcome: "poor", deltas: { governance_knowledge: -2, judgement_quality: -2 }, rationale: "Presenting a potentially discriminatory pipeline without addressing the AI bias is inappropriate.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Pauses presentation and commissions bias audit before proceeding", range: "85-100" },
      { key: "poor", label: "Poor", description: "Presents pipeline without addressing bias", range: "0-44" },
    ] },

  // ── GOVERNANCE ────────────────────────────────────────────────────────────
  { id: "CS-GO-001", title: "AI Tool DPIA Requirement", domain: "AI Governance", cap: "governance",
    type: "governance_decision", difficulty: 3, risk: "High", govSensitive: true,
    scenario: "Your organisation is considering deploying a new AI tool that analyses employee performance data, attendance records, and communication patterns to generate 'employee risk scores' used in performance management decisions. The vendor claims the tool is 'GDPR compliant' and provides a one-page compliance summary.",
    constraint: "The tool costs £150,000 annually. Your CEO is enthusiastic and wants to deploy within 3 months. The vendor says a DPIA is 'not required' for their tool.",
    question: "What is your assessment of the vendor's claim that a DPIA is not required?",
    signal: "governance_knowledge", workflow: "ai_governance_review",
    roles: ["chief_people_officer","hr_director","people_analytics_lead"],
    failureModes: ["vendor_trust_failure","transparency_failure","data_protection_breach"],
    tags: ["dom_governance","cap_governance","risk_data_protection","gov_gdpr","gov_eu_ai_act"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Accept the vendor's assessment — they are the experts on their own tool's compliance", value: "a", outcome: "poor", deltas: { governance_knowledge: -3 }, rationale: "Vendors cannot determine DPIA requirements — this is the controller's responsibility.", optimal: false },
      { order: 2, label: "The vendor's claim is incorrect — this tool almost certainly requires a DPIA under GDPR Article 35 as it involves systematic monitoring of employees and automated decision-making affecting individuals", value: "b", outcome: "excellent", deltas: { governance_knowledge: 3 }, rationale: "Correct — GDPR Article 35 requires a DPIA for systematic monitoring and automated decisions.", optimal: true },
      { order: 3, label: "Ask your DPO to review the vendor's compliance summary before deciding", value: "c", outcome: "good", deltas: { governance_knowledge: 2 }, rationale: "Involving the DPO is correct but the DPIA requirement should be clear without further review.", optimal: false },
      { order: 4, label: "Proceed with deployment but commission a DPIA after go-live", value: "d", outcome: "poor", deltas: { governance_knowledge: -2 }, rationale: "DPIAs must be completed before processing begins, not after.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Correctly identifies DPIA requirement and vendor's lack of authority to determine it", range: "85-100" },
      { key: "poor", label: "Poor", description: "Accepts vendor compliance claims without independent assessment", range: "0-44" },
    ] },

  { id: "CS-GO-002", title: "EU AI Act High-Risk Classification", domain: "AI Governance", cap: "governance",
    type: "governance_decision", difficulty: 4, risk: "Critical", govSensitive: true,
    scenario: "Your organisation is reviewing its AI tool portfolio under the EU AI Act. You are assessing an AI tool used for: (1) shortlisting job candidates from applications, (2) generating personalised learning recommendations, and (3) predicting employee attrition risk. The vendor of all three tools claims they are 'low risk' under the EU AI Act.",
    constraint: "The EU AI Act came into force in August 2024. Your organisation operates in the EU.",
    question: "Which of these tools is most likely to be classified as 'high risk' under the EU AI Act, and why?",
    signal: "governance_knowledge", workflow: "ai_governance_review",
    roles: ["chief_people_officer","hr_director","people_analytics_lead"],
    failureModes: ["vendor_trust_failure","transparency_failure"],
    tags: ["dom_governance","cap_governance","risk_governance","gov_eu_ai_act","gov_gdpr"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "The attrition prediction tool — it uses the most data", value: "a", outcome: "partial", deltas: { governance_knowledge: 1 }, rationale: "Attrition prediction may be high risk but the candidate shortlisting tool is more clearly classified.", optimal: false },
      { order: 2, label: "The candidate shortlisting tool — Annex III of the EU AI Act explicitly classifies AI used in recruitment and employment decisions as high risk", value: "b", outcome: "excellent", deltas: { governance_knowledge: 3 }, rationale: "Correct — Annex III explicitly lists recruitment AI as high risk.", optimal: true },
      { order: 3, label: "All three tools are high risk — any AI used in HR is high risk under the Act", value: "c", outcome: "partial", deltas: { governance_knowledge: 1 }, rationale: "Not all HR AI is high risk — the Act has specific criteria.", optimal: false },
      { order: 4, label: "None of them — the vendor's assessment should be trusted", value: "d", outcome: "poor", deltas: { governance_knowledge: -3 }, rationale: "Vendors cannot self-certify risk classification under the EU AI Act.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Correctly identifies recruitment AI as explicitly high risk under EU AI Act Annex III", range: "85-100" },
      { key: "poor", label: "Poor", description: "Accepts vendor classification or misidentifies the high-risk tool", range: "0-44" },
    ] },

  { id: "CS-GO-003", title: "AI Data Sharing with Vendor", domain: "AI Governance", cap: "governance",
    type: "error_detection", difficulty: 3, risk: "High", govSensitive: true,
    scenario: "A colleague in HR Operations has been using ChatGPT to help draft ER case summaries. They have been pasting employee names, job titles, disciplinary history, and medical information into the tool to get help structuring case notes. They tell you: 'It's fine — I'm not sharing anything that isn't already in our systems, and ChatGPT is really helpful for this.'",
    constraint: "Your organisation does not have a corporate ChatGPT agreement. The colleague has been doing this for 3 months.",
    question: "What is the most significant data protection issue with this practice?",
    signal: "governance_knowledge", workflow: "er_case_management",
    roles: ["employee_relations_manager","hr_operations_manager","hr_advisor"],
    failureModes: ["data_protection_breach","consent_failure"],
    tags: ["dom_er","dom_ops","cap_governance","risk_data_protection","gov_gdpr"],
    ambiguity: "low",
    options: [
      { order: 1, label: "The main issue is that ChatGPT might give incorrect advice on ER cases", value: "a", outcome: "poor", deltas: { governance_knowledge: -2 }, rationale: "Accuracy is a concern but not the primary data protection issue.", optimal: false },
      { order: 2, label: "Sharing special category data (medical information) and personal data with an external AI tool without a data processing agreement, lawful basis, or employee knowledge constitutes a likely GDPR breach", value: "b", outcome: "excellent", deltas: { governance_knowledge: 3 }, rationale: "Correctly identifies the GDPR breach involving special category data.", optimal: true },
      { order: 3, label: "The issue is that the colleague should be using the organisation's approved AI tools instead", value: "c", outcome: "partial", deltas: { governance_knowledge: 1 }, rationale: "Using approved tools is important but doesn't capture the full GDPR issue.", optimal: false },
      { order: 4, label: "There is no issue — the data is already in internal systems so sharing it externally is acceptable", value: "d", outcome: "poor", deltas: { governance_knowledge: -3 }, rationale: "Data being internal does not permit external sharing without lawful basis.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Identifies GDPR breach involving special category data and lack of processing agreement", range: "85-100" },
      { key: "poor", label: "Poor", description: "Misidentifies or dismisses the data protection issue", range: "0-44" },
    ] },

  { id: "CS-GO-004", title: "AI in Grievance Investigation", domain: "Employee Relations", cap: "governance",
    type: "governance_decision", difficulty: 4, risk: "Critical", govSensitive: true,
    scenario: "An employee has raised a grievance alleging racial discrimination by their manager. Your ER Manager proposes using an AI document analysis tool to review all emails and Slack messages between the employee and their manager over the past 2 years to 'find evidence'. The AI tool would process approximately 15,000 messages.",
    constraint: "The AI tool is not specifically designed for legal investigations. The vendor has not confirmed whether data is stored or used for model training.",
    question: "What are the key concerns with using this AI tool in this grievance investigation?",
    signal: "governance_knowledge", workflow: "er_case_management",
    roles: ["employee_relations_manager","hr_business_partner"],
    failureModes: ["data_protection_breach","scope_creep","transparency_failure"],
    tags: ["dom_er","cap_governance","risk_data_protection","risk_legal","gov_gdpr","gov_acas"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Proceed — AI analysis will be more thorough and objective than human review", value: "a", outcome: "poor", deltas: { governance_knowledge: -3 }, rationale: "Ignores significant data protection and legal risks.", optimal: false },
      { order: 2, label: "Multiple concerns: processing special category data (race discrimination allegation) requires explicit consent or legal obligation basis; the manager's data is also being processed without their knowledge; vendor data storage practices are unknown; AI analysis may not meet natural justice standards in tribunal", value: "b", outcome: "excellent", deltas: { governance_knowledge: 3 }, rationale: "Comprehensively identifies the key legal and ethical concerns.", optimal: true },
      { order: 3, label: "Get legal advice before proceeding with the AI analysis", value: "c", outcome: "good", deltas: { governance_knowledge: 2 }, rationale: "Legal advice is appropriate but the key concerns should be identifiable without it.", optimal: false },
      { order: 4, label: "Use the AI tool but only review the last 6 months of messages", value: "d", outcome: "poor", deltas: { governance_knowledge: -1 }, rationale: "Limiting scope doesn't address the fundamental legal and ethical issues.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Identifies special category data, natural justice, and vendor data concerns", range: "85-100" },
      { key: "poor", label: "Poor", description: "Proceeds without addressing legal and ethical concerns", range: "0-44" },
    ] },

  { id: "CS-GO-005", title: "AI Bias in Promotion Decisions", domain: "Talent Management", cap: "governance",
    type: "risk_judgement", difficulty: 4, risk: "Critical", govSensitive: true,
    scenario: "Your organisation uses an AI tool to support promotion decisions. An analysis of 2 years of promotion data reveals that employees from ethnic minority backgrounds are 34% less likely to be promoted when the AI tool is used compared to when decisions are made without it. The tool vendor says this is 'within acceptable variance' and that 'the model is working as intended'.",
    constraint: "The tool is used across 8 countries. Your CEO is reluctant to discontinue it as it 'saves 200 hours of manager time per year'.",
    question: "What is the most appropriate organisational response to this finding?",
    signal: "governance_knowledge", workflow: "ai_governance_review",
    roles: ["chief_people_officer","hr_director","dei_manager"],
    failureModes: ["algorithmic_bias","vendor_trust_failure","over_reliance"],
    tags: ["dom_governance","dom_dei","cap_governance","risk_legal","risk_bias","gov_equality_act","gov_eu_ai_act"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Accept the vendor's assessment that the variance is acceptable and continue using the tool", value: "a", outcome: "poor", deltas: { governance_knowledge: -3 }, rationale: "A 34% disparity is not acceptable variance — it is evidence of indirect discrimination.", optimal: false },
      { order: 2, label: "Immediately suspend use of the tool, commission an independent bias audit, review all promotion decisions made using the tool, and consider remediation for affected employees", value: "b", outcome: "excellent", deltas: { governance_knowledge: 3 }, rationale: "Correct response to evidence of systematic indirect discrimination.", optimal: true },
      { order: 3, label: "Add a human review step for all AI-assisted promotion decisions going forward", value: "c", outcome: "partial", deltas: { governance_knowledge: 1 }, rationale: "Adding review is positive but doesn't address past harm or the fundamental tool issue.", optimal: false },
      { order: 4, label: "Conduct further analysis to understand why the disparity exists before taking action", value: "d", outcome: "partial", deltas: { governance_knowledge: 1 }, rationale: "Further analysis is useful but the tool should be suspended while this is done.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Suspends tool, commissions audit, and considers remediation for affected employees", range: "85-100" },
      { key: "poor", label: "Poor", description: "Accepts vendor assessment of acceptable variance", range: "0-44" },
    ] },

  { id: "CS-GO-006", title: "AI Tool Procurement Due Diligence", domain: "AI Governance", cap: "governance",
    type: "governance_decision", difficulty: 3, risk: "High", govSensitive: true,
    scenario: "Your organisation is evaluating three AI tools for performance management. Tool A: established vendor, full bias audit report, DPIA completed, transparent model documentation. Tool B: newer vendor, claims 'state-of-the-art AI', no bias audit, GDPR compliance 'in progress'. Tool C: large tech vendor, comprehensive documentation, but model trained on US workforce data only.",
    constraint: "Budget is available for one tool. Your organisation is UK-based with a diverse workforce. Decision needed within 2 weeks.",
    question: "Which tool should you recommend and why?",
    signal: "governance_knowledge", workflow: "ai_governance_review",
    roles: ["chief_people_officer","hr_director","people_analytics_lead"],
    failureModes: ["vendor_trust_failure","algorithmic_bias"],
    tags: ["dom_governance","cap_governance","risk_governance","risk_bias","gov_gdpr","gov_eu_ai_act"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Tool B — newer technology is likely more advanced", value: "a", outcome: "poor", deltas: { governance_knowledge: -2 }, rationale: "No bias audit and incomplete GDPR compliance are disqualifying factors.", optimal: false },
      { order: 2, label: "Tool A — it is the only tool with a completed bias audit, DPIA, and transparent documentation. Tool B lacks GDPR compliance and Tool C's US-only training data is a significant concern for a UK diverse workforce.", value: "b", outcome: "excellent", deltas: { governance_knowledge: 3 }, rationale: "Correctly applies governance criteria to select the most compliant and transparent option.", optimal: true },
      { order: 3, label: "Tool C — large tech vendors are more reliable", value: "c", outcome: "partial", deltas: { governance_knowledge: 0 }, rationale: "Vendor size doesn't address the training data bias concern for a UK workforce.", optimal: false },
      { order: 4, label: "None of the tools — request more information from all vendors before deciding", value: "d", outcome: "partial", deltas: { governance_knowledge: 1 }, rationale: "More information is useful but Tool A already meets the key criteria.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Applies governance criteria correctly and identifies key disqualifying factors for Tools B and C", range: "85-100" },
      { key: "poor", label: "Poor", description: "Selects based on vendor reputation or technology novelty rather than governance criteria", range: "0-44" },
    ] },

  // ── APPROPRIATENESS ───────────────────────────────────────────────────────
  { id: "CS-AP-001", title: "AI in Bereavement Support", domain: "Employee Wellbeing", cap: "appropriateness",
    type: "situational_judgement", difficulty: 3, risk: "High", govSensitive: false,
    scenario: "Your organisation has deployed an AI wellbeing chatbot for employees. An employee has used the chatbot to disclose that they are struggling following the death of a close family member. The chatbot has provided a list of bereavement resources and asked the employee to 'rate their wellbeing on a scale of 1-10'. The employee has rated themselves 2/10 and the chatbot has responded with more resource links.",
    constraint: "The chatbot was deployed to 'reduce HR workload on wellbeing queries'. There is no escalation pathway for low wellbeing scores.",
    question: "What is the most significant concern with this scenario?",
    signal: "appropriateness_judgement", workflow: "hr_chatbot_management",
    roles: ["hr_operations_manager","hr_advisor","hr_business_partner"],
    failureModes: ["inadequate_escalation","scope_creep"],
    tags: ["dom_ops","cap_appropriateness","risk_governance"],
    ambiguity: "low",
    options: [
      { order: 1, label: "The chatbot should have more bereavement resources available", value: "a", outcome: "poor", deltas: { appropriateness_judgement: -2 }, rationale: "More resources doesn't address the fundamental appropriateness issue.", optimal: false },
      { order: 2, label: "An AI chatbot is not appropriate for supporting employees in acute distress — the absence of human escalation for a 2/10 wellbeing score represents a serious duty of care failure", value: "b", outcome: "excellent", deltas: { appropriateness_judgement: 3 }, rationale: "Correctly identifies the duty of care failure and inappropriateness of AI for this situation.", optimal: true },
      { order: 3, label: "The chatbot should be programmed to escalate low wellbeing scores to HR", value: "c", outcome: "good", deltas: { appropriateness_judgement: 2 }, rationale: "Escalation is necessary but doesn't address whether AI is appropriate at all for this.", optimal: false },
      { order: 4, label: "The employee should have contacted HR directly instead of using the chatbot", value: "d", outcome: "poor", deltas: { appropriateness_judgement: -1 }, rationale: "Blaming the employee ignores the organisation's duty of care.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Identifies duty of care failure and fundamental inappropriateness of AI for acute distress", range: "85-100" },
      { key: "poor", label: "Poor", description: "Focuses on tool improvement rather than appropriateness question", range: "0-44" },
    ] },

  { id: "CS-AP-002", title: "AI for Disciplinary Outcome Decision", domain: "Employee Relations", cap: "appropriateness",
    type: "governance_decision", difficulty: 4, risk: "Critical", govSensitive: true,
    scenario: "Your organisation's AI ER case management tool has analysed a disciplinary case involving alleged gross misconduct. The AI has reviewed the evidence, compared it to 200 previous cases, and recommended 'dismissal with a 94% confidence score'. Your ER Manager says: 'The AI has reviewed everything — we should follow its recommendation to ensure consistency.'",
    constraint: "The employee has 8 years of service and a clean disciplinary record. The alleged misconduct involves a complex situation with mitigating circumstances.",
    question: "What is your assessment of using the AI recommendation to determine the disciplinary outcome?",
    signal: "appropriateness_judgement", workflow: "er_case_management",
    roles: ["employee_relations_manager","hr_business_partner","senior_hrbp"],
    failureModes: ["over_reliance","algorithmic_bias","transparency_failure"],
    tags: ["dom_er","cap_appropriateness","cap_governance","risk_legal","gov_employment_rights","gov_acas"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Follow the AI recommendation — 94% confidence is very high and ensures consistency", value: "a", outcome: "poor", deltas: { appropriateness_judgement: -3, governance_knowledge: -2 }, rationale: "Delegating dismissal decisions to AI is legally and ethically inappropriate.", optimal: false },
      { order: 2, label: "The AI recommendation should not determine the outcome — dismissal decisions require human judgement, consideration of individual circumstances, and compliance with the ACAS Code. Using AI to decide outcomes is inappropriate and likely legally indefensible.", value: "b", outcome: "excellent", deltas: { appropriateness_judgement: 3, governance_knowledge: 3 }, rationale: "Correctly identifies the legal and ethical issues with AI-determined dismissal.", optimal: true },
      { order: 3, label: "Use the AI recommendation as one input alongside a human review of the specific circumstances", value: "c", outcome: "good", deltas: { appropriateness_judgement: 2, governance_knowledge: 1 }, rationale: "Better approach but should be clearer that AI cannot determine the outcome.", optimal: false },
      { order: 4, label: "Ask the AI to explain its reasoning before deciding whether to follow it", value: "d", outcome: "partial", deltas: { appropriateness_judgement: 1, governance_knowledge: 0 }, rationale: "Understanding AI reasoning is useful but doesn't address the fundamental appropriateness issue.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Clearly identifies that AI cannot determine dismissal outcomes and explains legal/ethical basis", range: "85-100" },
      { key: "poor", label: "Poor", description: "Follows AI recommendation without challenge", range: "0-44" },
    ] },

  { id: "CS-AP-003", title: "AI Video Interview Assessment", domain: "Talent Acquisition", cap: "appropriateness",
    type: "critique", difficulty: 3, risk: "High", govSensitive: true,
    scenario: "Your organisation is considering deploying an AI video interview assessment tool that analyses facial expressions, tone of voice, and word choice to generate candidate 'personality scores' and 'culture fit ratings'. The vendor claims the tool 'removes human bias from hiring' and has a 'validated predictive model'. A candidate with a facial palsy has complained that the tool gave them a low score.",
    constraint: "The tool costs £80,000 per year. Your talent acquisition director is enthusiastic about it.",
    question: "What is your assessment of this AI video interview tool?",
    signal: "appropriateness_judgement", workflow: "recruitment_screening",
    roles: ["talent_acquisition_partner","chief_people_officer","hr_director"],
    failureModes: ["algorithmic_bias","vendor_trust_failure","accessibility_failure"],
    tags: ["dom_recruitment","cap_appropriateness","cap_governance","risk_bias","risk_legal","gov_equality_act","gov_eu_ai_act"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Deploy the tool — it removes human bias and the vendor has validated it", value: "a", outcome: "poor", deltas: { appropriateness_judgement: -3 }, rationale: "Facial analysis AI is discriminatory and likely high-risk under the EU AI Act.", optimal: false },
      { order: 2, label: "Reject the tool — facial expression and tone analysis is pseudoscientific, discriminatory against people with disabilities and neurodivergent candidates, likely high-risk under the EU AI Act, and the complaint from the candidate with facial palsy demonstrates real harm", value: "b", outcome: "excellent", deltas: { appropriateness_judgement: 3 }, rationale: "Correctly identifies the scientific, legal, and ethical problems with this tool.", optimal: true },
      { order: 3, label: "Request an independent bias audit before deciding", value: "c", outcome: "partial", deltas: { appropriateness_judgement: 1 }, rationale: "An audit is useful but the fundamental scientific and legal issues should be sufficient to reject the tool.", optimal: false },
      { order: 4, label: "Deploy the tool but exempt candidates who request reasonable adjustments", value: "d", outcome: "poor", deltas: { appropriateness_judgement: -2 }, rationale: "Exemptions don't address the fundamental discrimination in the tool.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Rejects tool with clear scientific, legal, and ethical reasoning", range: "85-100" },
      { key: "poor", label: "Poor", description: "Deploys tool based on vendor claims", range: "0-44" },
    ] },

  { id: "CS-AP-004", title: "AI in Capability Assessment for Redundancy", domain: "Redundancy & Restructuring", cap: "appropriateness",
    type: "situational_judgement", difficulty: 4, risk: "Critical", govSensitive: true,
    scenario: "Your organisation is restructuring and needs to assess 80 employees for a reduced number of roles. An AI tool has been proposed to assess employees' 'future capability' by analysing their past performance data, learning history, and psychometric test results. The AI would generate a 'capability score' used to determine who is retained.",
    constraint: "The restructure needs to be completed within 6 weeks. Using the AI tool would save approximately 3 weeks compared to a manual assessment process.",
    question: "What is the most significant concern with using this AI tool for capability assessment in a redundancy context?",
    signal: "appropriateness_judgement", workflow: "redundancy_selection",
    roles: ["employee_relations_manager","hr_business_partner","senior_hrbp"],
    failureModes: ["algorithmic_bias","transparency_failure","over_reliance"],
    tags: ["dom_er","cap_appropriateness","cap_governance","risk_legal","risk_bias","gov_equality_act","gov_employment_rights"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Use the tool — it saves time and provides objective assessments", value: "a", outcome: "poor", deltas: { appropriateness_judgement: -3 }, rationale: "Using AI to determine redundancy selection without adequate safeguards is legally and ethically inappropriate.", optimal: false },
      { order: 2, label: "The tool is inappropriate for this use — AI-generated capability scores used to determine redundancy selection raise serious concerns about indirect discrimination, GDPR Article 22 automated decision-making, transparency obligations, and the ability to explain decisions at tribunal", value: "b", outcome: "excellent", deltas: { appropriateness_judgement: 3 }, rationale: "Comprehensively identifies the legal and ethical concerns.", optimal: true },
      { order: 3, label: "Use the tool but ensure managers review all AI scores before final decisions", value: "c", outcome: "partial", deltas: { appropriateness_judgement: 1 }, rationale: "Human review helps but doesn't fully address the legal and ethical concerns.", optimal: false },
      { order: 4, label: "Use the tool for the initial assessment but conduct individual consultations afterwards", value: "d", outcome: "partial", deltas: { appropriateness_judgement: 1 }, rationale: "Consultation is required but doesn't address the fundamental issues with AI-generated scores.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Identifies indirect discrimination, GDPR Article 22, and tribunal transparency concerns", range: "85-100" },
      { key: "poor", label: "Poor", description: "Proceeds with AI tool without addressing legal and ethical concerns", range: "0-44" },
    ] },

  // ── WORKFLOW ───────────────────────────────────────────────────────────────
  { id: "CS-WF-001", title: "AI Onboarding Chatbot Escalation", domain: "HR Operations", cap: "workflow",
    type: "situational_judgement", difficulty: 2, risk: "Medium", govSensitive: false,
    scenario: "You manage an AI onboarding chatbot. A new joiner has asked the chatbot: 'I have a disability and need adjustments to my workstation. Who do I contact?' The chatbot has responded: 'Please refer to our Reasonable Adjustments Policy on the intranet. You can find it under HR Policies > Accessibility.' The new joiner has replied: 'I can't find it. I'm starting Monday and I'm worried about this.'",
    constraint: "The chatbot was designed to handle 80% of onboarding queries without human intervention. The new joiner starts in 3 days.",
    question: "What should happen next in this workflow?",
    signal: "workflow_quality", workflow: "onboarding_automation",
    roles: ["hr_operations_manager","hr_advisor"],
    failureModes: ["inadequate_escalation","accessibility_failure"],
    tags: ["dom_ops","cap_workflow","risk_governance","gov_equality_act"],
    ambiguity: "low",
    options: [
      { order: 1, label: "The chatbot should send the policy link again with clearer instructions", value: "a", outcome: "poor", deltas: { workflow_quality: -2 }, rationale: "Repeating the same unhelpful response fails the new joiner.", optimal: false },
      { order: 2, label: "The chatbot should immediately escalate to a human HR contact who can arrange the adjustments before Monday", value: "b", outcome: "excellent", deltas: { workflow_quality: 3 }, rationale: "Escalation to human support is essential for this time-sensitive accessibility need.", optimal: true },
      { order: 3, label: "The chatbot should ask the new joiner to email HR directly", value: "c", outcome: "partial", deltas: { workflow_quality: 1 }, rationale: "Better than repeating the policy link but doesn't ensure timely resolution.", optimal: false },
      { order: 4, label: "This is within the chatbot's scope — it should continue to assist", value: "d", outcome: "poor", deltas: { workflow_quality: -2 }, rationale: "The chatbot has failed to resolve the issue and escalation is required.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Immediately escalates to human support for time-sensitive accessibility need", range: "85-100" },
      { key: "poor", label: "Poor", description: "Continues with chatbot without escalation", range: "0-44" },
    ] },

  { id: "CS-WF-002", title: "AI Learning Path Accessibility", domain: "Learning & Development", cap: "workflow",
    type: "error_detection", difficulty: 2, risk: "Medium", govSensitive: false,
    scenario: "Your AI learning platform has generated personalised learning paths for all employees. You review the paths and notice that: (1) all recommended content is video-based, (2) there are no transcripts or captions, (3) the platform requires a mouse to navigate. An employee with visual impairment has complained that they cannot access any of their recommended content.",
    constraint: "The learning paths were automatically generated and sent to employees last week. 500 employees have received their paths.",
    question: "What is the most important immediate action?",
    signal: "workflow_quality", workflow: "learning_needs_analysis",
    roles: ["learning_development_manager","hr_operations_manager"],
    failureModes: ["accessibility_failure","over_reliance"],
    tags: ["dom_learning","cap_workflow","risk_bias","gov_equality_act"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Respond to the individual complaint and provide alternative content for that employee", value: "a", outcome: "partial", deltas: { workflow_quality: 1 }, rationale: "Addresses the individual but not the systemic accessibility failure.", optimal: false },
      { order: 2, label: "Pause the AI-generated learning paths, conduct an accessibility audit of the platform and content, and implement a systematic fix before re-deploying", value: "b", outcome: "excellent", deltas: { workflow_quality: 3 }, rationale: "Addresses the systemic failure and prevents ongoing discrimination.", optimal: true },
      { order: 3, label: "Ask the AI platform vendor to add accessibility features", value: "c", outcome: "partial", deltas: { workflow_quality: 1 }, rationale: "Vendor engagement is needed but doesn't address the immediate systemic issue.", optimal: false },
      { order: 4, label: "Add a note to the platform that employees with accessibility needs should contact HR", value: "d", outcome: "poor", deltas: { workflow_quality: -2 }, rationale: "Placing the burden on disabled employees rather than fixing the system.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Pauses deployment and conducts systemic accessibility audit", range: "85-100" },
      { key: "poor", label: "Poor", description: "Addresses individual complaint without systemic fix", range: "0-44" },
    ] },

  { id: "CS-WF-003", title: "AI Policy Lookup Tool Accuracy", domain: "HR Operations", cap: "workflow",
    type: "error_detection", difficulty: 2, risk: "Medium", govSensitive: false,
    scenario: "Your HR chatbot uses an AI tool to answer employee policy questions. An employee asks: 'How much paternity leave am I entitled to?' The chatbot responds: 'You are entitled to 2 weeks of statutory paternity leave.' However, your organisation's enhanced paternity leave policy provides 6 weeks at full pay for employees with more than 1 year of service.",
    constraint: "The chatbot has been live for 6 months. You don't know how many employees have received incorrect information.",
    question: "What is the most appropriate response to this discovery?",
    signal: "workflow_quality", workflow: "hr_chatbot_management",
    roles: ["hr_operations_manager","hr_systems_specialist"],
    failureModes: ["over_reliance","inadequate_escalation"],
    tags: ["dom_ops","cap_workflow","risk_governance"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Update the chatbot's knowledge base with the correct policy and monitor for future errors", value: "a", outcome: "partial", deltas: { workflow_quality: 1 }, rationale: "Fixing the chatbot is necessary but doesn't address employees who received incorrect information.", optimal: false },
      { order: 2, label: "Fix the chatbot immediately, audit other policy responses for accuracy, identify employees who may have received incorrect paternity leave information, and proactively communicate the correct entitlement", value: "b", outcome: "excellent", deltas: { workflow_quality: 3 }, rationale: "Addresses both the immediate fix and the potential harm to affected employees.", optimal: true },
      { order: 3, label: "Add a disclaimer to the chatbot that employees should verify policy information with HR", value: "c", outcome: "poor", deltas: { workflow_quality: -1 }, rationale: "A disclaimer doesn't fix the incorrect information already provided.", optimal: false },
      { order: 4, label: "Disable the chatbot until all policies have been verified", value: "d", outcome: "partial", deltas: { workflow_quality: 1 }, rationale: "Disabling is overly cautious — a targeted fix and audit is more proportionate.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Fixes chatbot, audits other responses, and proactively communicates with affected employees", range: "85-100" },
      { key: "poor", label: "Poor", description: "Adds disclaimer without addressing incorrect information", range: "0-44" },
    ] },

  { id: "CS-WF-004", title: "AI Recruitment Workflow Prioritisation", domain: "Talent Acquisition", cap: "workflow",
    type: "prioritisation", difficulty: 2, risk: "Medium", govSensitive: false,
    scenario: "You are a Talent Acquisition Partner managing a high-volume recruitment campaign. Your AI tool has generated the following tasks for today: (1) Review 47 AI-generated shortlists, (2) Send 120 AI-drafted rejection emails, (3) Configure AI screening for 3 new roles, (4) Review AI bias audit report flagging potential issues in the current screening criteria.",
    constraint: "You have 4 hours available today. Each task takes approximately 1 hour.",
    question: "In what order should you prioritise these tasks, and why?",
    signal: "workflow_quality", workflow: "recruitment_screening",
    roles: ["talent_acquisition_partner","recruitment_coordinator"],
    failureModes: ["over_reliance","algorithmic_bias"],
    tags: ["dom_recruitment","cap_workflow","cap_execution","risk_bias"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "1. Send rejections (time-sensitive), 2. Review shortlists, 3. Configure new roles, 4. Review bias audit (can wait)", value: "a", outcome: "poor", deltas: { workflow_quality: -2 }, rationale: "Sending rejections before reviewing the bias audit risks discriminatory outcomes.", optimal: false },
      { order: 2, label: "1. Review bias audit (may affect all other tasks), 2. Review shortlists, 3. Configure new roles (using corrected criteria), 4. Send rejections (after confirming they're not affected by bias issues)", value: "b", outcome: "excellent", deltas: { workflow_quality: 3 }, rationale: "Correctly prioritises the bias audit as it may affect all other tasks.", optimal: true },
      { order: 3, label: "1. Configure new roles, 2. Review shortlists, 3. Review bias audit, 4. Send rejections", value: "c", outcome: "poor", deltas: { workflow_quality: -1 }, rationale: "Configuring new roles before reviewing the bias audit may perpetuate identified issues.", optimal: false },
      { order: 4, label: "Complete all tasks simultaneously by delegating to team members", value: "d", outcome: "partial", deltas: { workflow_quality: 0 }, rationale: "Delegation is possible but doesn't address the prioritisation question.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Prioritises bias audit as it affects all other tasks", range: "85-100" },
      { key: "poor", label: "Poor", description: "Prioritises speed over addressing bias issues", range: "0-44" },
    ] },

  // ── DATA INTERPRETATION ───────────────────────────────────────────────────
  { id: "CS-DI-001", title: "AI Pay Gap Analysis Interpretation", domain: "Compensation & Benefits", cap: "data_interpretation",
    type: "data_interpretation", difficulty: 3, risk: "High", govSensitive: true,
    scenario: "Your AI pay equity tool has produced an analysis showing: (1) a mean gender pay gap of 18.3% (women earn less), (2) a median pay gap of 12.1%, (3) an 'adjusted pay gap' of 2.1% after controlling for role, grade, and location. The vendor says the 2.1% adjusted gap shows 'pay equity has been achieved'. Your CEO wants to use this figure in the annual report.",
    constraint: "Gender Pay Gap reporting deadline is in 2 weeks. The 18.3% mean gap would attract negative press attention.",
    question: "How should you interpret and advise on the use of these figures?",
    signal: "data_critical_thinking", workflow: "pay_equity_analysis",
    roles: ["reward_manager","compensation_analyst","dei_manager"],
    failureModes: ["model_uncertainty_ignored","over_reliance"],
    tags: ["dom_reward","dom_dei","cap_data","risk_legal","gov_equality_act"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Use the 2.1% adjusted gap in the annual report — it shows the true picture after controlling for relevant factors", value: "a", outcome: "poor", deltas: { data_critical_thinking: -2 }, rationale: "The adjusted gap masks structural inequality and the statutory requirement is to report the unadjusted gap.", optimal: false },
      { order: 2, label: "The statutory Gender Pay Gap Report must use the unadjusted mean and median gaps (18.3% and 12.1%). The adjusted gap is analytically useful but the 18.3% gap reflects real structural inequality that requires action, not statistical adjustment.", value: "b", outcome: "excellent", deltas: { data_critical_thinking: 3 }, rationale: "Correctly distinguishes statutory requirements from analytical metrics and identifies structural inequality.", optimal: true },
      { order: 3, label: "Report all three figures with explanatory notes", value: "c", outcome: "good", deltas: { data_critical_thinking: 2 }, rationale: "Transparent reporting is good but must be clear about statutory requirements.", optimal: false },
      { order: 4, label: "Ask the AI tool to recalculate using different control variables to reduce the gap", value: "d", outcome: "poor", deltas: { data_critical_thinking: -3 }, rationale: "Manipulating the analysis to reduce reported gaps is misleading and potentially unlawful.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Correctly identifies statutory reporting requirements and structural inequality", range: "85-100" },
      { key: "poor", label: "Poor", description: "Uses adjusted gap to minimise reported inequality", range: "0-44" },
    ] },

  { id: "CS-DI-002", title: "AI Attrition Model Confidence Intervals", domain: "Workforce Planning", cap: "data_interpretation",
    type: "data_interpretation", difficulty: 4, risk: "High", govSensitive: false,
    scenario: "Your workforce planning AI model predicts that your organisation will lose 23% of its software engineers in the next 12 months. The model has a 95% confidence interval of 14%-32%. Your CFO wants to use the 23% figure to justify a 25% increase in the engineering recruitment budget.",
    constraint: "The recruitment budget decision needs to be made this week. The model is based on 3 years of historical data from a period that included COVID-19.",
    question: "What is the most important consideration when advising the CFO on this decision?",
    signal: "data_critical_thinking", workflow: "workforce_planning",
    roles: ["workforce_planning_analyst","people_analytics_lead"],
    failureModes: ["model_uncertainty_ignored","over_reliance"],
    tags: ["dom_workforce","cap_data","risk_governance"],
    ambiguity: "high",
    options: [
      { order: 1, label: "Support the 25% budget increase — the AI model predicts 23% attrition so the budget is justified", value: "a", outcome: "poor", deltas: { data_critical_thinking: -2 }, rationale: "Ignores model uncertainty and data quality issues.", optimal: false },
      { order: 2, label: "Advise the CFO that the model's confidence interval (14%-32%) represents significant uncertainty, that COVID-19 data may distort predictions, and recommend a phased approach to recruitment investment with regular model review", value: "b", outcome: "excellent", deltas: { data_critical_thinking: 3 }, rationale: "Correctly communicates uncertainty and recommends appropriate decision-making approach.", optimal: true },
      { order: 3, label: "Recommend using the lower bound (14%) for budget planning to be conservative", value: "c", outcome: "partial", deltas: { data_critical_thinking: 1 }, rationale: "Conservative approach is reasonable but doesn't fully address the uncertainty communication.", optimal: false },
      { order: 4, label: "Run the model again with more recent data before making any recommendation", value: "d", outcome: "good", deltas: { data_critical_thinking: 2 }, rationale: "Improving data quality is valuable but may not be possible within the decision timeline.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Communicates model uncertainty, data quality issues, and recommends phased approach", range: "85-100" },
      { key: "poor", label: "Poor", description: "Treats point estimate as certain and ignores confidence interval", range: "0-44" },
    ] },

  { id: "CS-DI-003", title: "AI Diversity Dashboard Interpretation", domain: "Diversity, Equity & Inclusion", cap: "data_interpretation",
    type: "data_interpretation", difficulty: 3, risk: "High", govSensitive: true,
    scenario: "Your AI DEI analytics platform shows that your organisation's representation of employees from ethnic minority backgrounds has increased from 18% to 22% over 3 years. The platform's 'DEI Score' has increased from 62 to 71 out of 100. Your CEO wants to announce this as evidence that 'our DEI strategy is working'.",
    constraint: "You notice that the data shows ethnic minority employees are concentrated in junior grades (85% are below Grade 5) and the promotion rate for ethnic minority employees is 40% lower than for white employees.",
    question: "How should you advise the CEO on interpreting this data?",
    signal: "data_critical_thinking", workflow: "dei_analytics",
    roles: ["dei_manager","people_analytics_lead","hr_business_partner"],
    failureModes: ["model_uncertainty_ignored","over_reliance"],
    tags: ["dom_dei","cap_data","risk_bias","gov_equality_act"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Support the CEO's announcement — the data shows clear improvement", value: "a", outcome: "poor", deltas: { data_critical_thinking: -2 }, rationale: "Ignores the structural inequality visible in the grade and promotion data.", optimal: false },
      { order: 2, label: "Advise the CEO that while headline representation has improved, the data shows structural inequality: ethnic minority employees are concentrated in junior grades and face a 40% promotion disadvantage. The AI DEI Score masks these issues and a more nuanced narrative is needed.", value: "b", outcome: "excellent", deltas: { data_critical_thinking: 3 }, rationale: "Correctly identifies that headline metrics mask structural inequality.", optimal: true },
      { order: 3, label: "Present both the positive headline data and the grade/promotion data to give a balanced picture", value: "c", outcome: "good", deltas: { data_critical_thinking: 2 }, rationale: "Balanced presentation is good but should be more explicit about the structural inequality.", optimal: false },
      { order: 4, label: "Ask the AI platform to recalculate the DEI Score including grade and promotion data", value: "d", outcome: "partial", deltas: { data_critical_thinking: 1 }, rationale: "Improving the metric is useful but doesn't address the immediate communication decision.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Identifies structural inequality masked by headline metrics", range: "85-100" },
      { key: "poor", label: "Poor", description: "Accepts headline improvement without examining structural data", range: "0-44" },
    ] },

  { id: "CS-DI-004", title: "AI Engagement Survey Theme Analysis", domain: "Employee Engagement", cap: "data_interpretation",
    type: "data_interpretation", difficulty: 2, risk: "Medium", govSensitive: false,
    scenario: "Your AI engagement platform has analysed 1,200 survey responses and identified the top 5 themes: (1) Workload (mentioned 847 times), (2) Management communication (mentioned 623 times), (3) Career development (mentioned 589 times), (4) Pay (mentioned 412 times), (5) Work-life balance (mentioned 398 times). Your HR Director says: 'Workload is clearly the biggest issue — let's focus all our action planning on that.'",
    constraint: "The survey also shows that 23% of employees left comments about psychological safety, but this didn't appear in the AI's top 5 themes.",
    question: "What is the most important consideration when interpreting this AI theme analysis?",
    signal: "data_critical_thinking", workflow: "engagement_analytics",
    roles: ["hr_business_partner","people_analytics_lead"],
    failureModes: ["over_reliance","model_uncertainty_ignored"],
    tags: ["dom_ops","cap_data","risk_governance"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Focus on workload as the AI has identified it as the top theme", value: "a", outcome: "partial", deltas: { data_critical_thinking: 0 }, rationale: "Workload is important but ignoring psychological safety is a significant omission.", optimal: false },
      { order: 2, label: "Question why psychological safety (23% of comments) didn't appear in the AI's top 5, as frequency of mention doesn't capture severity or importance — psychological safety issues may be more critical despite lower frequency", value: "b", outcome: "excellent", deltas: { data_critical_thinking: 3 }, rationale: "Correctly identifies that frequency metrics miss severity and importance.", optimal: true },
      { order: 3, label: "Address all 5 themes equally in the action plan", value: "c", outcome: "partial", deltas: { data_critical_thinking: 1 }, rationale: "Equal treatment is reasonable but still ignores the psychological safety finding.", optimal: false },
      { order: 4, label: "Ask the AI to re-run the analysis with psychological safety as a specific theme", value: "d", outcome: "good", deltas: { data_critical_thinking: 2 }, rationale: "Useful but doesn't address the fundamental limitation of frequency-based analysis.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Questions frequency-based analysis and identifies psychological safety as potentially more critical", range: "85-100" },
      { key: "poor", label: "Poor", description: "Accepts AI theme ranking without questioning methodology", range: "0-44" },
    ] },

  { id: "CS-DI-005", title: "AI Skills Gap Analysis Reliability", domain: "Workforce Planning", cap: "data_interpretation",
    type: "critique", difficulty: 3, risk: "High", govSensitive: false,
    scenario: "Your AI skills mapping tool has produced a skills gap analysis showing that 67% of your HR team lack 'AI literacy' skills. The tool inferred skills from job titles, LinkedIn profiles, and performance review keywords. Your CHRO wants to use this to justify a £500,000 AI training investment.",
    constraint: "The tool has never been validated against actual skills assessments. Several HR team members have significant AI experience that is not reflected in their job titles.",
    question: "What is the most important concern about using this AI analysis to justify the training investment?",
    signal: "data_critical_thinking", workflow: "workforce_planning",
    roles: ["people_analytics_lead","workforce_planning_analyst","learning_development_manager"],
    failureModes: ["over_reliance","model_uncertainty_ignored"],
    tags: ["dom_workforce","dom_learning","cap_data","risk_governance"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "The training investment is justified — 67% is a significant gap", value: "a", outcome: "poor", deltas: { data_critical_thinking: -2 }, rationale: "The analysis is based on inferred skills from proxies, not actual skills assessment.", optimal: false },
      { order: 2, label: "The AI tool inferred skills from proxies (job titles, LinkedIn) rather than measuring actual skills — this is an unreliable basis for a £500,000 investment. A validated skills assessment should be conducted before committing to the investment.", value: "b", outcome: "excellent", deltas: { data_critical_thinking: 3 }, rationale: "Correctly identifies the methodological weakness and recommends validation.", optimal: true },
      { order: 3, label: "Ask the AI tool to re-run the analysis with more data sources", value: "c", outcome: "partial", deltas: { data_critical_thinking: 1 }, rationale: "More data may help but doesn't address the fundamental proxy measurement issue.", optimal: false },
      { order: 4, label: "Conduct a sample survey of 20 employees to validate the AI findings", value: "d", outcome: "good", deltas: { data_critical_thinking: 2 }, rationale: "Validation is the right approach but a sample of 20 may not be sufficient.", optimal: false },
    ],
    anchors: [
      { key: "excellent", label: "Excellent", description: "Identifies proxy measurement weakness and recommends validated assessment", range: "85-100" },
      { key: "poor", label: "Poor", description: "Accepts AI analysis without questioning methodology", range: "0-44" },
    ] },
];

// ─── Insert Functions ──────────────────────────────────────────────────────────

async function insertRoles() {
  console.log("\n📋 Inserting content roles...");
  // Clear existing roles first
  await conn.execute("DELETE FROM content_roles WHERE 1=1");
  for (const r of ROLES) {
    const id = randomUUID();
    await run(
      `INSERT INTO content_roles (id, role_id, role_name, family, seniority, decision_authority, risk_exposure, governance_sensitivity, role_data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, r.key, r.label, r.family, r.seniority, r.decision_authority, r.risk_exposure, r.governance_sensitivity, JSON.stringify(r.data)]
    );
    process.stdout.write(".");
  }
  console.log(`\n✓ ${ROLES.length} roles inserted`);
}

async function insertWorkflows() {
  console.log("\n🔄 Inserting content workflows...");
  for (const w of WORKFLOWS) {
    const id = randomUUID();
    await run(
      `INSERT INTO content_workflows (id, \`key\`, domain, title, description, steps_json, ai_usage_points_json, risk_points_json, governance_requirements_json, applicable_role_keys_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, w.key, w.domain, w.title, w.description ?? null,
       JSON.stringify(w.steps), JSON.stringify(w.aiUsagePoints), JSON.stringify(w.riskPoints),
       JSON.stringify(w.govReqs), JSON.stringify(w.roles)]
    );
    process.stdout.write(".");
  }
  console.log(`\n✓ ${WORKFLOWS.length} workflows inserted`);
}

async function insertTags() {
  console.log("\n🏷️  Inserting tags...");
  for (const t of TAGS) {
    const id = randomUUID();
    await run(
      `INSERT INTO content_tags (id, \`key\`, label, category) VALUES (?, ?, ?, ?)`,
      [id, t.key, t.label, t.category]
    );
    process.stdout.write(".");
  }
  console.log(`\n✓ ${TAGS.length} tags inserted`);
}

async function insertScenarios() {
  console.log("\n📝 Inserting scenarios...");
  let count = 0;
  for (const s of SCENARIOS) {
    const scenarioId = randomUUID();
    await run(
      `INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, \`constraint\`, question, workflow_key, role_keys_json, failure_mode_keys_json, tags_json, primary_signal, ambiguity_level, status, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 1)`,
      [scenarioId, s.id, s.title, s.domain, s.cap, s.type, s.difficulty, s.risk, s.govSensitive ? 1 : 0,
       s.scenario, s.constraint ?? null, s.question, s.workflow ?? null,
       JSON.stringify(s.roles ?? []), JSON.stringify(s.failureModes ?? []), JSON.stringify(s.tags ?? []),
       s.signal ?? null, s.ambiguity ?? "medium"]
    );

    for (const opt of s.options ?? []) {
      const optId = randomUUID();
      await run(
        `INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [optId, scenarioId, opt.order, opt.label, opt.value, opt.outcome ?? null,
         JSON.stringify(opt.deltas ?? {}), opt.rationale ?? null, opt.optimal ? 1 : 0]
      );
    }

    for (const anchor of s.anchors ?? []) {
      const anchorId = randomUUID();
      await run(
        `INSERT INTO content_scenario_anchors (id, scenario_id, anchor_key, anchor
_label, anchor_label, description, score_range) VALUES (?, ?, ?, ?, ?, ?)`,
        [anchorId, scenarioId, anchor.key, anchor.label ?? anchor.key, anchor.description ?? null, anchor.range ?? null]
      );
    }
    count++;
    process.stdout.write(".");
  }
  console.log(`\n✓ ${count} scenarios inserted`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 AIQ Content System Seed Script");
  console.log("=".repeat(50));
  try {
    await insertRoles();
    await insertWorkflows();
    await insertTags();
    await insertScenarios();
    console.log("\n" + "=".repeat(50));
    console.log("✅ Seed complete!");
  } catch (e) {
    console.error("\n❌ Seed failed:", e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
