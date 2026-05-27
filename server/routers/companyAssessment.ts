/**
 * Company HR AI Strategy Assessment — Server Router
 *
 * Methodology: 7-dimension organisational maturity framework
 * Grounded in: Deloitte AI Maturity Index, PwC AI Readiness, MIT Sloan AI Maturity,
 *              CIPD People Profession AI Framework, AIHR HR AI Readiness Radar,
 *              McKinsey State of AI 2024, BCG AI Maturity Model
 *
 * Dimensions:
 *  1. strategy    — AI Strategy & Leadership Vision
 *  2. governance  — AI Governance, Ethics & Risk
 *  3. data        — Data Foundations & Infrastructure
 *  4. technology  — Technology Ecosystem & Integration
 *  5. workforce   — Workforce AI Capability & Culture
 *  6. hr_function — HR Function AI Adoption
 *  7. culture     — Organisational AI Culture & Change Readiness
 *
 * Scoring: 1–5 per dimension, confidence-adjusted, weighted composite
 * Maturity labels: Foundational / Developing / Scaling / Leading / Pioneering
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  companies,
  companyQuestions,
  companyAssessments,
  companyAssessmentResponses,
  companyAssessmentResults,
} from "../../drizzle/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { assertLLMRateLimit } from "../_core/llmRateLimit";
import {
  getEffectiveBenchmark,
  getStrategyGuidance,
  headcountBandToSize,
  getBenchmarkContext,
} from "../../shared/sectorTaxonomy";
// ─── Dimension config ─────────────────────────────────────────────────────────
const DIMENSIONS = [
  {
    key: "strategy",
    label: "AI Strategy & Leadership Vision",
    weight: 0.18,
    description:
      "The degree to which AI is embedded in the organisation's strategic agenda, with visible leadership commitment and a clear roadmap.",
    researchBasis:
      "Deloitte AI Maturity Index (2023) identifies executive sponsorship and strategic clarity as the highest-variance predictor of AI value realisation. McKinsey (2024) finds that organisations with a formal AI strategy are 2.5× more likely to report significant revenue impact.",
  },
  {
    key: "governance",
    label: "AI Governance, Ethics & Risk",
    weight: 0.16,
    description:
      "The maturity of policies, controls, and accountability structures that govern responsible AI deployment, including bias mitigation, explainability, and regulatory compliance.",
    researchBasis:
      "CIPD (2024) People Profession AI Framework identifies governance as the critical gap in HR AI adoption. EU AI Act (2024) creates binding obligations for high-risk HR AI use cases (recruitment, performance, redundancy).",
  },
  {
    key: "data",
    label: "Data Foundations & Infrastructure",
    weight: 0.15,
    description:
      "The quality, accessibility, and governance of people data that underpins AI-powered HR decisions — including data literacy, lineage, and integration across systems.",
    researchBasis:
      "PwC AI Readiness Survey (2024): 67% of HR leaders cite poor data quality as the primary barrier to AI adoption. MIT Sloan (2023) identifies data infrastructure as the single largest predictor of AI project success.",
  },
  {
    key: "technology",
    label: "Technology Ecosystem & Integration",
    weight: 0.13,
    description:
      "The organisation's HR technology stack maturity, including HRIS integration, AI tool adoption, API connectivity, and the ability to evaluate and onboard new AI capabilities.",
    researchBasis:
      "Gartner HR Technology Survey (2024): organisations with integrated HR tech stacks achieve 3× higher AI adoption rates. AIHR AI Readiness Radar (2024) identifies technology integration as a key enabler of HR AI scaling.",
  },
  {
    key: "workforce",
    label: "Workforce AI Capability & Culture",
    weight: 0.18,
    description:
      "The AI literacy, skills, and confidence of the broader workforce — not just HR — including the organisation's approach to upskilling, reskilling, and managing AI-driven role change.",
    researchBasis:
      "McKinsey Global Survey (2024): workforce capability is the #1 barrier to AI scaling in 58% of organisations. BCG AI Maturity Model (2023) identifies workforce readiness as the most underinvested dimension.",
  },
  {
    key: "hr_function",
    label: "HR Function AI Adoption",
    weight: 0.12,
    description:
      "The extent to which the HR function itself uses AI tools confidently and critically — across talent acquisition, L&D, workforce planning, performance management, and HR operations.",
    researchBasis:
      "AIHR State of HR (2024): only 22% of HR professionals use AI tools regularly. CIPD (2024) finds that HR functions that model AI adoption internally are 4× more likely to successfully drive organisation-wide AI capability.",
  },
  {
    key: "culture",
    label: "Organisational AI Culture & Change Readiness",
    weight: 0.08,
    description:
      "The psychological safety, experimentation mindset, and change management capability that enables the organisation to adopt, adapt, and learn from AI at pace.",
    researchBasis:
      "MIT Sloan Management Review (2023): culture is the most cited barrier to AI scaling, ahead of technology and talent. Deloitte (2024) finds that organisations with high psychological safety adopt AI tools 60% faster.",
  },
];

// ─── Question bank (52 questions, 7–8 per dimension) ─────────────────────────
// Each question has 4 options scored A=1.0, B=2.0, C=3.5, D=5.0
// Calibration questions (isCalibration=1) are used to set initial difficulty
const QUESTION_BANK = [
  // ── STRATEGY ──────────────────────────────────────────────────────────────
  {
    code: "STR-01", dimension: "strategy", dimensionLabel: "AI Strategy & Leadership Vision",
    isCalibration: 1, difficulty: 2,
    stem: "How would you describe your organisation's current approach to AI in its people strategy?",
    optionA: "AI is not yet part of our people strategy — we are watching the market",
    optionB: "We have discussed AI at leadership level but have no formal strategy or roadmap",
    optionC: "We have a documented AI strategy for HR with defined priorities and a 12-month roadmap",
    optionD: "AI is embedded in our 3–5 year people strategy with board-level accountability and a dedicated investment line",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "STR-02", dimension: "strategy", dimensionLabel: "AI Strategy & Leadership Vision",
    isCalibration: 0, difficulty: 1,
    stem: "Which statement best describes your CHRO's or CPO's engagement with AI?",
    optionA: "Our CHRO/CPO has limited knowledge of AI and delegates it to IT",
    optionB: "Our CHRO/CPO is aware of AI trends but is not actively championing adoption",
    optionC: "Our CHRO/CPO actively sponsors AI initiatives and participates in cross-functional AI governance",
    optionD: "Our CHRO/CPO is a recognised internal and external voice on responsible AI in HR, with a personal development plan on AI",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "STR-03", dimension: "strategy", dimensionLabel: "AI Strategy & Leadership Vision",
    isCalibration: 0, difficulty: 3,
    stem: "How does your organisation measure the return on investment of AI initiatives in HR?",
    optionA: "We do not currently measure ROI on AI initiatives",
    optionB: "We track activity metrics (tools deployed, users trained) but not business outcomes",
    optionC: "We measure specific business outcomes (e.g. time-to-hire, attrition reduction) linked to AI initiatives",
    optionD: "We have a rigorous value measurement framework with pre/post baselines, control groups, and attribution modelling",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "STR-04", dimension: "strategy", dimensionLabel: "AI Strategy & Leadership Vision",
    isCalibration: 0, difficulty: 2,
    stem: "How does your organisation approach the 'build vs buy vs adapt' decision for AI in HR?",
    optionA: "We adopt whatever vendors offer without a structured evaluation process",
    optionB: "We evaluate vendors on features and price, with limited consideration of AI-specific risks",
    optionC: "We have a structured AI procurement framework that includes ethics, explainability, and data governance criteria",
    optionD: "We have a tiered build/buy/adapt strategy aligned to our AI maturity, with a vendor assessment playbook and a preferred partner ecosystem",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "STR-05", dimension: "strategy", dimensionLabel: "AI Strategy & Leadership Vision",
    isCalibration: 0, difficulty: 3,
    stem: "How does your AI people strategy account for sector-specific regulatory requirements (e.g. EU AI Act, financial services, healthcare)?",
    optionA: "We are not aware of specific regulatory requirements for AI in our sector",
    optionB: "We are aware of regulatory requirements but have not yet mapped them to our AI initiatives",
    optionC: "We have mapped regulatory requirements to our AI use cases and have a compliance roadmap",
    optionD: "We have a regulatory intelligence function that monitors AI legislation, with legal and HR working jointly on compliance and proactive policy shaping",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "STR-06", dimension: "strategy", dimensionLabel: "AI Strategy & Leadership Vision",
    isCalibration: 0, difficulty: 2,
    stem: "How are AI priorities in HR set and reviewed?",
    optionA: "AI priorities emerge ad hoc from individual team requests or vendor pitches",
    optionB: "AI priorities are set annually by HR leadership with limited cross-functional input",
    optionC: "AI priorities are set through a structured process involving HR, IT, legal, and business leaders, reviewed quarterly",
    optionD: "AI priorities are set through a dynamic portfolio management process with continuous value tracking, stakeholder input, and rapid reallocation based on evidence",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "STR-07", dimension: "strategy", dimensionLabel: "AI Strategy & Leadership Vision",
    isCalibration: 0, difficulty: 1,
    stem: "Does your organisation have a named owner for AI in HR (e.g. Head of HR Technology, Chief People Analytics Officer)?",
    optionA: "No — AI ownership in HR is unclear or shared informally",
    optionB: "AI is owned by IT or a central AI team, with HR as a stakeholder only",
    optionC: "HR has a named AI lead who coordinates with IT and business stakeholders",
    optionD: "HR has a dedicated AI capability (team or function) with a senior leader, budget, and a mandate to drive AI adoption across the people function",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },

  // ── GOVERNANCE ────────────────────────────────────────────────────────────
  {
    code: "GOV-01", dimension: "governance", dimensionLabel: "AI Governance, Ethics & Risk",
    isCalibration: 1, difficulty: 2,
    stem: "How does your organisation govern the use of AI in HR decisions (e.g. recruitment, performance, redundancy)?",
    optionA: "We have no specific governance for AI in HR decisions — standard IT policies apply",
    optionB: "We have informal guidelines but no formal policy or accountability structure",
    optionC: "We have a documented AI ethics policy for HR with defined accountability, approved by HR leadership",
    optionD: "We have a comprehensive AI governance framework covering risk classification, bias testing, explainability requirements, and a formal review process for all high-risk HR AI use cases",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "GOV-02", dimension: "governance", dimensionLabel: "AI Governance, Ethics & Risk",
    isCalibration: 0, difficulty: 3,
    stem: "How does your organisation test for bias in AI tools used for HR decisions?",
    optionA: "We do not test for bias — we rely on vendor assurances",
    optionB: "We ask vendors about bias testing but do not conduct independent testing",
    optionC: "We conduct periodic bias audits on high-risk AI tools (e.g. recruitment screening, performance scoring)",
    optionD: "We have a continuous bias monitoring programme with defined thresholds, automated alerts, and a documented remediation process",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "GOV-03", dimension: "governance", dimensionLabel: "AI Governance, Ethics & Risk",
    isCalibration: 0, difficulty: 2,
    stem: "What is your organisation's approach to explainability when AI is used in decisions that affect employees?",
    optionA: "AI decisions are not explained to employees — they receive the outcome only",
    optionB: "Managers provide explanations, but these are not systematically supported by AI output documentation",
    optionC: "We have a policy requiring that AI-assisted decisions are explainable, with guidance for managers on how to communicate them",
    optionD: "All AI-assisted decisions affecting employees include a documented explanation, an appeal pathway, and a human review option — aligned to GDPR Article 22 and EU AI Act requirements",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "GOV-04", dimension: "governance", dimensionLabel: "AI Governance, Ethics & Risk",
    isCalibration: 0, difficulty: 3,
    stem: "How does your organisation manage the risk of AI-generated content being used inappropriately in HR contexts (e.g. job descriptions, performance reviews, disciplinary letters)?",
    optionA: "We have no policy on AI-generated content in HR — individuals use their judgement",
    optionB: "We have informal guidance discouraging AI-generated content in sensitive HR documents",
    optionC: "We have a policy requiring human review and sign-off on AI-generated HR content, with defined categories of prohibited use",
    optionD: "We have a comprehensive generative AI policy for HR with use-case classification, mandatory review workflows, audit trails, and employee notification requirements",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "GOV-05", dimension: "governance", dimensionLabel: "AI Governance, Ethics & Risk",
    isCalibration: 0, difficulty: 2,
    stem: "How are employees informed about AI use in HR processes that affect them?",
    optionA: "Employees are not informed about AI use in HR processes",
    optionB: "AI use is mentioned in general privacy notices but not specifically communicated",
    optionC: "We proactively inform employees when AI is used in decisions that affect them, with a summary of how it works",
    optionD: "We have a transparent AI disclosure programme with employee-facing documentation, a dedicated FAQ, and a named contact for AI-related concerns",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "GOV-06", dimension: "governance", dimensionLabel: "AI Governance, Ethics & Risk",
    isCalibration: 0, difficulty: 1,
    stem: "Does your organisation have a process for employees to challenge or appeal AI-assisted HR decisions?",
    optionA: "No — employees have no formal mechanism to challenge AI-assisted decisions",
    optionB: "Employees can raise concerns through general grievance processes, but AI-specific pathways do not exist",
    optionC: "We have a defined process for employees to request human review of AI-assisted decisions",
    optionD: "We have a formal AI appeal process with defined timelines, an independent reviewer, and a documented outcome — aligned to GDPR and EU AI Act requirements",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "GOV-07", dimension: "governance", dimensionLabel: "AI Governance, Ethics & Risk",
    isCalibration: 0, difficulty: 3,
    stem: "How does your organisation classify AI use cases in HR by risk level?",
    optionA: "We do not classify AI use cases by risk — all tools are treated the same",
    optionB: "We informally distinguish between high and low risk but have no formal classification",
    optionC: "We use a risk classification framework (e.g. high/medium/low) applied to all HR AI use cases, with different governance requirements per tier",
    optionD: "We use a comprehensive risk taxonomy aligned to the EU AI Act's prohibited/high-risk/limited-risk/minimal-risk classification, with documented use-case registers and annual reviews",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },

  // ── DATA ──────────────────────────────────────────────────────────────────
  {
    code: "DAT-01", dimension: "data", dimensionLabel: "Data Foundations & Infrastructure",
    isCalibration: 1, difficulty: 2,
    stem: "How would you describe the quality and accessibility of your people data for AI use?",
    optionA: "Our people data is fragmented across multiple systems, inconsistent, and largely inaccessible for analytics",
    optionB: "We have a central HRIS but data quality is variable and integration with other systems is limited",
    optionC: "We have a well-maintained people data platform with defined data standards, reasonable quality, and integration across core HR systems",
    optionD: "We have a unified people data platform with real-time integration, high data quality standards, lineage tracking, and a data governance function",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "DAT-02", dimension: "data", dimensionLabel: "Data Foundations & Infrastructure",
    isCalibration: 0, difficulty: 2,
    stem: "How does your organisation manage employee data privacy in the context of AI?",
    optionA: "Data privacy for AI is managed under general GDPR compliance — no AI-specific controls",
    optionB: "We have reviewed our data privacy policies but have not updated them specifically for AI use cases",
    optionC: "We have AI-specific data privacy controls including purpose limitation, data minimisation, and retention policies for AI training data",
    optionD: "We have a comprehensive AI data privacy framework with privacy impact assessments for all AI use cases, automated data subject rights handling, and regular third-party audits",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "DAT-03", dimension: "data", dimensionLabel: "Data Foundations & Infrastructure",
    isCalibration: 0, difficulty: 3,
    stem: "How does your organisation ensure that training data for HR AI models is representative and free from historical bias?",
    optionA: "We do not review training data for bias — we rely on vendor processes",
    optionB: "We ask vendors about their training data practices but do not independently verify",
    optionC: "We conduct representativeness checks on training data for high-risk HR AI tools before deployment",
    optionD: "We have a training data governance process including demographic representativeness testing, historical bias detection, and documented remediation — applied to all HR AI tools",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "DAT-04", dimension: "data", dimensionLabel: "Data Foundations & Infrastructure",
    isCalibration: 0, difficulty: 2,
    stem: "What is the level of data literacy across your HR team?",
    optionA: "Most HR team members are not comfortable working with data or interpreting analytics outputs",
    optionB: "A small number of HR specialists are data-literate; most HR generalists rely on others to interpret data",
    optionC: "The majority of HR business partners and specialists can interpret people analytics dashboards and use data to support decisions",
    optionD: "Data literacy is a core competency across the HR function, with defined proficiency levels, regular training, and HR leaders who can critically evaluate AI model outputs",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "DAT-05", dimension: "data", dimensionLabel: "Data Foundations & Infrastructure",
    isCalibration: 0, difficulty: 3,
    stem: "How does your organisation handle data from third-party AI vendors (e.g. assessment platforms, ATS systems, engagement tools)?",
    optionA: "We have limited visibility into how third-party vendors use our employee data",
    optionB: "We review vendor data processing agreements but do not conduct detailed due diligence on AI-specific data practices",
    optionC: "We conduct AI-specific due diligence on third-party vendors, including data processing, model training, and retention practices",
    optionD: "We have a vendor AI data governance programme with standardised due diligence questionnaires, contractual AI-specific clauses, and annual reviews",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "DAT-06", dimension: "data", dimensionLabel: "Data Foundations & Infrastructure",
    isCalibration: 0, difficulty: 1,
    stem: "Does your organisation have a people analytics function or capability?",
    optionA: "No — people analytics does not exist as a function or capability",
    optionB: "We have basic reporting (headcount, turnover) but no predictive or prescriptive analytics",
    optionC: "We have a people analytics team producing dashboards and some predictive models (e.g. attrition risk)",
    optionD: "We have a mature people analytics function producing real-time insights, predictive models, and prescriptive recommendations — integrated into HR and business decision-making",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },

  // ── TECHNOLOGY ────────────────────────────────────────────────────────────
  {
    code: "TEC-01", dimension: "technology", dimensionLabel: "Technology Ecosystem & Integration",
    isCalibration: 1, difficulty: 2,
    stem: "How would you describe your HR technology stack's readiness for AI?",
    optionA: "Our HR technology is largely legacy — limited API connectivity and no AI-native tools",
    optionB: "We have a modern HRIS but limited integration between systems and few AI-enabled tools",
    optionC: "We have an integrated HR tech stack with several AI-enabled tools deployed across key processes",
    optionD: "We have a cloud-native, API-first HR tech ecosystem with AI embedded across the talent lifecycle — from attraction to alumni",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "TEC-02", dimension: "technology", dimensionLabel: "Technology Ecosystem & Integration",
    isCalibration: 0, difficulty: 2,
    stem: "How does your organisation evaluate and select AI tools for HR?",
    optionA: "We adopt tools based on vendor relationships or peer recommendations without structured evaluation",
    optionB: "We conduct standard procurement processes but do not have AI-specific evaluation criteria",
    optionC: "We have an AI tool evaluation framework covering functionality, data practices, bias testing, and integration requirements",
    optionD: "We have a rigorous AI procurement process including proof-of-concept pilots, independent bias testing, explainability assessment, and post-deployment monitoring",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "TEC-03", dimension: "technology", dimensionLabel: "Technology Ecosystem & Integration",
    isCalibration: 0, difficulty: 3,
    stem: "How does your organisation manage the risk of AI tool failure or degraded performance in HR processes?",
    optionA: "We do not have specific processes for managing AI tool failure in HR",
    optionB: "We rely on vendor SLAs and standard IT incident management processes",
    optionC: "We have defined fallback processes for critical HR AI tools and conduct periodic performance reviews",
    optionD: "We have a comprehensive AI operations framework including performance monitoring, drift detection, fallback protocols, and a defined process for model retraining or replacement",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "TEC-04", dimension: "technology", dimensionLabel: "Technology Ecosystem & Integration",
    isCalibration: 0, difficulty: 2,
    stem: "To what extent does your organisation use generative AI tools in HR operations?",
    optionA: "Generative AI is not used in HR operations — use is prohibited or not yet considered",
    optionB: "Individual HR team members use consumer generative AI tools informally, without organisational guidance",
    optionC: "We have approved generative AI tools for specific HR use cases (e.g. job description drafting, policy summarisation) with defined guidelines",
    optionD: "Generative AI is embedded across HR operations with enterprise-grade tools, workflow integration, quality controls, and regular capability reviews",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "TEC-05", dimension: "technology", dimensionLabel: "Technology Ecosystem & Integration",
    isCalibration: 0, difficulty: 1,
    stem: "How does your HR function stay current with AI technology developments relevant to people management?",
    optionA: "We rely on vendor briefings and occasional conference attendance",
    optionB: "HR leadership reviews AI developments periodically but there is no systematic horizon-scanning process",
    optionC: "We have a structured technology horizon-scanning process with quarterly reviews and a defined process for evaluating emerging AI tools",
    optionD: "We have a dedicated HR technology intelligence function that monitors AI developments, maintains a technology radar, and runs regular innovation sprints",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },

  // ── WORKFORCE ─────────────────────────────────────────────────────────────
  {
    code: "WRK-01", dimension: "workforce", dimensionLabel: "Workforce AI Capability & Culture",
    isCalibration: 1, difficulty: 2,
    stem: "How would you describe the overall AI literacy of your workforce?",
    optionA: "Most employees have limited awareness of AI and how it affects their work",
    optionB: "Awareness is growing but capability is uneven — concentrated in technology and analytics functions",
    optionC: "We have a structured AI literacy programme reaching the majority of our workforce, with defined competency levels by role",
    optionD: "AI literacy is a core organisational capability with role-differentiated learning pathways, regular assessment, and integration into performance frameworks",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "WRK-02", dimension: "workforce", dimensionLabel: "Workforce AI Capability & Culture",
    isCalibration: 0, difficulty: 2,
    stem: "How does your organisation approach workforce reskilling in response to AI-driven role change?",
    optionA: "We have not yet developed a reskilling strategy for AI-driven role change",
    optionB: "We are aware of the need to reskill but have not yet implemented a systematic programme",
    optionC: "We have a reskilling programme targeting roles most affected by AI, with defined learning pathways and transition support",
    optionD: "We have a dynamic workforce transformation programme with skills taxonomy, AI impact modelling, proactive reskilling pathways, and a dedicated transition support function",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "WRK-03", dimension: "workforce", dimensionLabel: "Workforce AI Capability & Culture",
    isCalibration: 0, difficulty: 3,
    stem: "How does your organisation measure the impact of AI on employee experience and wellbeing?",
    optionA: "We do not measure the impact of AI on employee experience",
    optionB: "We include general questions about technology in engagement surveys but do not specifically measure AI impact",
    optionC: "We track specific metrics related to AI adoption (e.g. tool usage, satisfaction with AI tools) and include AI-specific questions in engagement surveys",
    optionD: "We have a comprehensive AI employee experience measurement framework including adoption metrics, wellbeing indicators, equity analysis, and a dedicated feedback channel",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "WRK-04", dimension: "workforce", dimensionLabel: "Workforce AI Capability & Culture",
    isCalibration: 0, difficulty: 2,
    stem: "How does your organisation involve employees in decisions about AI deployment in the workplace?",
    optionA: "Employees are not involved in AI deployment decisions — these are made by leadership and IT",
    optionB: "We communicate AI deployments to employees but do not seek their input",
    optionC: "We consult with employee representatives (e.g. works councils, trade unions) on significant AI deployments",
    optionD: "We have a structured employee participation framework for AI governance, including co-design of AI policies, regular forums, and formal consultation rights",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "WRK-05", dimension: "workforce", dimensionLabel: "Workforce AI Capability & Culture",
    isCalibration: 0, difficulty: 1,
    stem: "Does your organisation have a defined AI skills framework for the workforce?",
    optionA: "No — we do not have an AI skills framework",
    optionB: "We reference external frameworks (e.g. CIPD, SFIA) but have not developed our own",
    optionC: "We have an AI skills framework with defined competency levels by role family, used to guide learning and development",
    optionD: "We have a comprehensive AI skills taxonomy integrated into our job architecture, performance frameworks, and learning systems — reviewed annually against market developments",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "WRK-06", dimension: "workforce", dimensionLabel: "Workforce AI Capability & Culture",
    isCalibration: 0, difficulty: 3,
    stem: "How does your organisation address AI anxiety and resistance among employees?",
    optionA: "We have not specifically addressed AI anxiety — we focus on the benefits of AI",
    optionB: "We acknowledge AI anxiety in communications but do not have specific support mechanisms",
    optionC: "We have a change management programme that addresses AI anxiety, including manager training, FAQs, and a dedicated communication channel",
    optionD: "We have a comprehensive AI change management programme with psychological safety assessment, manager coaching, peer champion networks, and a formal support pathway for employees experiencing AI-related distress",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "WRK-07", dimension: "workforce", dimensionLabel: "Workforce AI Capability & Culture",
    isCalibration: 0, difficulty: 2,
    stem: "How does your organisation ensure equity in access to AI tools and AI upskilling opportunities?",
    optionA: "We have not considered equity in AI tool access or upskilling",
    optionB: "We aim to provide equal access but have not conducted an equity analysis",
    optionC: "We have conducted an equity analysis of AI tool access and upskilling, and have targeted interventions for underrepresented groups",
    optionD: "Equity in AI access and upskilling is a core design principle, with disaggregated data by protected characteristic, targeted programmes, and board-level reporting",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },

  // ── HR FUNCTION ───────────────────────────────────────────────────────────
  {
    code: "HRF-01", dimension: "hr_function", dimensionLabel: "HR Function AI Adoption",
    isCalibration: 1, difficulty: 2,
    stem: "How extensively does your HR function use AI tools in its day-to-day work?",
    optionA: "AI tools are rarely or never used by HR team members in their day-to-day work",
    optionB: "A small number of HR specialists use AI tools; most HR generalists do not",
    optionC: "The majority of HR team members use approved AI tools regularly across key processes",
    optionD: "AI tools are embedded across the HR operating model — from talent acquisition to HR operations — with high adoption, regular capability reviews, and continuous improvement",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "HRF-02", dimension: "hr_function", dimensionLabel: "HR Function AI Adoption",
    isCalibration: 0, difficulty: 2,
    stem: "How does your HR function use AI in talent acquisition?",
    optionA: "AI is not used in talent acquisition",
    optionB: "We use AI for limited tasks (e.g. job posting distribution) but not for screening or assessment",
    optionC: "We use AI for CV screening, job description optimisation, or interview scheduling — with human review at key decision points",
    optionD: "We have an AI-augmented talent acquisition process covering sourcing, screening, assessment, and offer — with bias monitoring, explainability, and candidate transparency",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "HRF-03", dimension: "hr_function", dimensionLabel: "HR Function AI Adoption",
    isCalibration: 0, difficulty: 2,
    stem: "How does your HR function use AI in learning and development?",
    optionA: "AI is not used in L&D",
    optionB: "We use AI for content recommendations in our LMS but have not integrated AI into learning design or delivery",
    optionC: "We use AI for personalised learning pathways, skills gap analysis, or AI-generated learning content — with human curation",
    optionD: "We have an AI-powered learning ecosystem with adaptive pathways, skills intelligence, AI-generated content, and impact measurement — integrated with workforce planning",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "HRF-04", dimension: "hr_function", dimensionLabel: "HR Function AI Adoption",
    isCalibration: 0, difficulty: 3,
    stem: "How does your HR function critically evaluate AI tool outputs before acting on them?",
    optionA: "HR team members generally accept AI tool outputs without critical review",
    optionB: "HR team members are encouraged to review AI outputs but have no structured framework for doing so",
    optionC: "We have guidance for HR team members on how to critically evaluate AI outputs, including common failure modes and escalation pathways",
    optionD: "Critical AI output evaluation is a defined competency in our HR capability framework, with training, assessment, and regular calibration sessions",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "HRF-05", dimension: "hr_function", dimensionLabel: "HR Function AI Adoption",
    isCalibration: 0, difficulty: 1,
    stem: "Does your HR function have a dedicated AI learning and development programme for HR professionals?",
    optionA: "No — AI learning for HR professionals is not a priority",
    optionB: "HR professionals access general AI training available to all employees",
    optionC: "We have HR-specific AI training covering tools, ethics, and practical application — available to all HR team members",
    optionD: "We have a structured HR AI capability programme with role-differentiated pathways, external accreditation, and integration into HR career development frameworks",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "HRF-06", dimension: "hr_function", dimensionLabel: "HR Function AI Adoption",
    isCalibration: 0, difficulty: 2,
    stem: "How does your HR function use AI in workforce planning?",
    optionA: "AI is not used in workforce planning — we rely on spreadsheets and manual processes",
    optionB: "We use basic analytics tools for headcount reporting but not predictive workforce planning",
    optionC: "We use AI-powered tools for demand forecasting, skills gap analysis, or scenario modelling in workforce planning",
    optionD: "We have an AI-powered strategic workforce planning capability with real-time skills intelligence, scenario modelling, and integration with business strategy — reviewed quarterly",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },

  // ── CULTURE ───────────────────────────────────────────────────────────────
  {
    code: "CUL-01", dimension: "culture", dimensionLabel: "Organisational AI Culture & Change Readiness",
    isCalibration: 1, difficulty: 2,
    stem: "How would you describe your organisation's overall attitude towards AI adoption?",
    optionA: "There is significant resistance or anxiety about AI across the organisation",
    optionB: "Attitudes are mixed — enthusiasm in some areas, resistance in others — with limited leadership clarity",
    optionC: "There is broadly positive sentiment towards AI, supported by clear leadership messaging and a culture of experimentation",
    optionD: "AI adoption is a cultural norm — the organisation has high psychological safety around AI experimentation, learns rapidly from failures, and celebrates AI-driven innovation",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "CUL-02", dimension: "culture", dimensionLabel: "Organisational AI Culture & Change Readiness",
    isCalibration: 0, difficulty: 2,
    stem: "How does your organisation support managers in leading their teams through AI-driven change?",
    optionA: "Managers receive no specific support for leading AI-driven change",
    optionB: "Managers receive general change management training that includes some AI content",
    optionC: "We have AI-specific manager enablement resources including toolkits, coaching, and peer learning networks",
    optionD: "We have a comprehensive manager AI leadership programme with coaching, peer networks, scenario-based learning, and integration into manager performance expectations",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "CUL-03", dimension: "culture", dimensionLabel: "Organisational AI Culture & Change Readiness",
    isCalibration: 0, difficulty: 3,
    stem: "How does your organisation learn from AI failures or unexpected outcomes?",
    optionA: "AI failures are not systematically reviewed — they are treated as IT incidents",
    optionB: "Significant AI failures are reviewed by IT and HR leadership, but learnings are not systematically shared",
    optionC: "We have a defined process for reviewing AI failures, sharing learnings across the organisation, and updating policies or training accordingly",
    optionD: "We have a blameless AI learning culture with a formal incident review process, cross-functional learning forums, public internal case studies, and integration of learnings into AI governance",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "CUL-04", dimension: "culture", dimensionLabel: "Organisational AI Culture & Change Readiness",
    isCalibration: 0, difficulty: 1,
    stem: "Does your organisation celebrate and recognise AI innovation from employees?",
    optionA: "AI innovation from employees is not recognised or celebrated",
    optionB: "Individual AI innovations are occasionally highlighted in internal communications",
    optionC: "We have regular forums (e.g. innovation showcases, hackathons) where employees share AI innovations",
    optionD: "AI innovation is embedded in our recognition and reward frameworks, with formal programmes, executive sponsorship, and pathways to scale successful innovations",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "CUL-05", dimension: "culture", dimensionLabel: "Organisational AI Culture & Change Readiness",
    isCalibration: 0, difficulty: 2,
    stem: "How does your organisation's senior leadership model AI adoption?",
    optionA: "Senior leaders do not visibly use or champion AI tools",
    optionB: "Some senior leaders use AI tools individually but this is not a visible or consistent message",
    optionC: "Senior leaders visibly use AI tools and regularly communicate their value and responsible use to the organisation",
    optionD: "Senior leaders are AI advocates and practitioners — they share their AI learning journeys, use AI in leadership meetings, and hold themselves accountable for AI adoption metrics",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
  {
    code: "CUL-06", dimension: "culture", dimensionLabel: "Organisational AI Culture & Change Readiness",
    isCalibration: 0, difficulty: 3,
    stem: "How does your organisation balance speed of AI adoption with responsible deployment?",
    optionA: "We prioritise speed — governance is seen as a barrier to adoption",
    optionB: "We are cautious — governance concerns slow adoption significantly",
    optionC: "We have a defined framework for balancing speed and responsibility, with fast-track pathways for low-risk use cases and rigorous review for high-risk ones",
    optionD: "We have a mature responsible innovation culture where speed and responsibility are seen as complementary — with agile governance, rapid experimentation, and clear escalation pathways",
    scoreA: 1.0, scoreB: 2.0, scoreC: 3.5, scoreD: 5.0,
  },
];

// ─── Scoring helpers ──────────────────────────────────────────────────────────
const CONFIDENCE_MULTIPLIERS: Record<string, number> = {
  guessing: 0.7,
  fairly_sure: 0.9,
  certain: 1.0,
};

const MATURITY_LABELS = [
  { min: 0, max: 1.5, label: "Foundational", description: "AI is largely absent from your people strategy. The organisation is at the start of its AI journey, with limited awareness, no formal governance, and fragmented data." },
  { min: 1.5, max: 2.5, label: "Developing", description: "AI awareness is growing and early experiments are underway, but adoption is uneven, governance is informal, and capability gaps are significant." },
  { min: 2.5, max: 3.5, label: "Scaling", description: "AI is embedded in several HR processes with growing capability and improving governance. The organisation is building the foundations for enterprise-scale AI adoption." },
  { min: 3.5, max: 4.2, label: "Leading", description: "AI is a strategic differentiator in your people function. Governance is mature, capability is strong, and the organisation is recognised as an AI leader in its sector." },
  { min: 4.2, max: 5.0, label: "Pioneering", description: "Your organisation is at the frontier of responsible AI adoption in HR. You are shaping industry practice, contributing to standards, and continuously innovating." },
];

function getMaturityLabel(score: number) {
  return MATURITY_LABELS.find(m => score >= m.min && score <= m.max) || MATURITY_LABELS[0];
}

// Sector benchmark data — legacy display-key map used as fallback in getEffectiveBenchmark.
// Primary benchmarks are now sourced from SECTOR_TAXONOMY in sectorTaxonomy.ts.
const SECTOR_BENCHMARKS: Record<string, number> = {
  "Financial Services":    3.1,
  "Technology":            3.6,
  "Healthcare":            2.4,
  "Education":             2.0,
  "Professional Services": 2.9,
  "Retail":                2.3,
  "Retail & Consumer":     2.3,
  "Manufacturing":         2.1,
  "Manufacturing & Engineering": 2.1,
  "Public Sector":         1.9,
  "Energy & Utilities":    2.5,
  "Media & Entertainment": 2.8,
  "Logistics & Transport": 2.2,
  "Hospitality & Leisure": 1.8,
  "Other":                 2.5,
};

function computePercentile(score: number, sectorAvg: number): number {
  // Simple bell-curve approximation: 1 SD ≈ 0.6 points
  const sd = 0.6;
  const z = (score - sectorAvg) / sd;
  // Convert z to percentile (approximation)
  const percentile = Math.round(50 + 34.1 * Math.min(1, Math.max(-1, z)) + 13.6 * Math.min(1, Math.max(-1, z - 1)));
  return Math.max(1, Math.min(99, percentile));
}

// ─── Adaptive branching ───────────────────────────────────────────────────────
// For each dimension, pick the calibration question first, then branch based on score
function selectNextQuestion(
  dimension: string,
  answeredCodes: string[],
  lastScore: number | null,
): string | null {
  const dimQuestions = QUESTION_BANK.filter(q => q.dimension === dimension);
  const unanswered = dimQuestions.filter(q => !answeredCodes.includes(q.code));
  if (unanswered.length === 0) return null;

  // First: calibration question
  const calibration = unanswered.find(q => q.isCalibration === 1);
  if (calibration) return calibration.code;

  // Then: branch by difficulty based on last score
  if (lastScore === null) {
    return unanswered[0].code;
  }
  let targetDifficulty: number;
  if (lastScore >= 3.5) targetDifficulty = 3; // high performer → hard
  else if (lastScore >= 2.0) targetDifficulty = 2; // mid → medium
  else targetDifficulty = 1; // low → easy

  const matched = unanswered.filter(q => q.difficulty === targetDifficulty);
  if (matched.length > 0) return matched[0].code;
  return unanswered[0].code; // fallback
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const companyAssessmentRouter = router({

  // Seed the question bank (admin/owner only, idempotent)
  seedQuestions: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const existing = await db.select({ id: companyQuestions.id }).from(companyQuestions).limit(1);
    if (existing.length > 0) return { seeded: false, message: "Questions already seeded" };
    for (const q of QUESTION_BANK) {
      await db.insert(companyQuestions).values({
        id: randomUUID(),
        dimension: q.dimension,
        dimensionLabel: q.dimensionLabel,
        questionCode: q.code,
        isCalibration: q.isCalibration,
        difficulty: q.difficulty,
        stem: q.stem,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        scoreA: q.scoreA,
        scoreB: q.scoreB,
        scoreC: q.scoreC,
        scoreD: q.scoreD,
        frameworkVersion: "v1",
      });
    }
    return { seeded: true, count: QUESTION_BANK.length };
  }),

  // Get dimensions metadata (for briefing screen)
  getDimensions: protectedProcedure.query(async () => {
    return DIMENSIONS.map(d => ({
      key: d.key,
      label: d.label,
      weight: d.weight,
      description: d.description,
      researchBasis: d.researchBasis,
    }));
  }),

  // Create or get company profile
  createCompany: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      sector: z.string().default(""),
      subSector: z.string().optional(),
      orgType: z.string().optional(),
      headcountBand: z.string().default(""),
      hrTeamSize: z.string().default(""),
      hrisPlatform: z.string().default(""),
      existingAiTools: z.array(z.string()).default([]),
      assessmentMotivation: z.string().default(""),
      resultsAudience: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const id = randomUUID();
      await db.insert(companies).values({
        id,
        tenantId: ctx.user.tenantId,
        createdByUserId: ctx.user.id,
        name: input.name,
        sector: input.sector,
        subSector: input.subSector ?? null,
        orgType: input.orgType ?? null,
        headcountBand: input.headcountBand,
        hrTeamSize: input.hrTeamSize,
        hrisPlatform: input.hrisPlatform,
        existingAiToolsJson: input.existingAiTools,
        assessmentMotivation: input.assessmentMotivation,
        resultsAudience: input.resultsAudience,
        onboardingCompletedAt: new Date(),
      });
      return { companyId: id };
    }),

  // Get company profile
  getCompany: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [company] = await db.select().from(companies)
        .where(and(eq(companies.id, input.companyId), eq(companies.tenantId, ctx.user.tenantId)));
      if (!company) throw new Error("Company not found");
      return company;
    }),

  // List companies for this user
  listCompanies: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db.select().from(companies)
      .where(and(
        eq(companies.tenantId, ctx.user.tenantId),
        eq(companies.createdByUserId, ctx.user.id),
      ));
  }),

  // Start a company assessment
  startAssessment: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Check for in-progress assessment
      const existing = await db.select().from(companyAssessments)
        .where(and(
          eq(companyAssessments.companyId, input.companyId),
          eq(companyAssessments.status, "in_progress"),
        ));
      if (existing.length > 0) return { assessmentId: existing[0].id, resumed: true };

      const id = randomUUID();
      await db.insert(companyAssessments).values({
        id,
        companyId: input.companyId,
        tenantId: ctx.user.tenantId,
        createdByUserId: ctx.user.id,
        status: "in_progress",
        currentDimension: DIMENSIONS[0].key,
        questionsAnswered: 0,
      });
      return { assessmentId: id, resumed: false };
    }),

  // Get next question (adaptive)
  getNextQuestion: protectedProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [assessment] = await db.select().from(companyAssessments)
        .where(eq(companyAssessments.id, input.assessmentId));
      if (!assessment) throw new Error("Assessment not found");
      if (assessment.status === "completed") return { done: true, question: null, progress: null };

      // Get answered question codes
      const responses = await db.select({
        questionId: companyAssessmentResponses.questionId,
        adjustedScore: companyAssessmentResponses.adjustedScore,
      }).from(companyAssessmentResponses)
        .where(eq(companyAssessmentResponses.assessmentId, input.assessmentId));

      const answeredIds = responses.map(r => r.questionId);

      // Get answered question codes from DB
      let answeredCodes: string[] = [];
      if (answeredIds.length > 0) {
        const answeredQs = await db.select({ questionCode: companyQuestions.questionCode })
          .from(companyQuestions)
          .where(inArray(companyQuestions.id, answeredIds));
        answeredCodes = answeredQs.map((q: { questionCode: string }) => q.questionCode);
      }

      // Determine current dimension and last score
      const currentDim = assessment.currentDimension || DIMENSIONS[0].key;
      const dimResponses = responses;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastScore = dimResponses.length > 0
        ? dimResponses[dimResponses.length - 1].adjustedScore
        : null;

      // Find next question in current dimension
      let nextCode = selectNextQuestion(currentDim, answeredCodes, lastScore);

      // If current dimension is exhausted (2 questions answered per dim), move to next
      const dimAnsweredCodes = answeredCodes.filter(c => {
        const q = QUESTION_BANK.find(q => q.code === c);
        return q?.dimension === currentDim;
      });

      if (!nextCode || dimAnsweredCodes.length >= 2) {
        // Move to next dimension
        const dimIdx = DIMENSIONS.findIndex(d => d.key === currentDim);
        if (dimIdx < DIMENSIONS.length - 1) {
          const nextDim = DIMENSIONS[dimIdx + 1].key;
          await db.update(companyAssessments)
            .set({ currentDimension: nextDim })
            .where(eq(companyAssessments.id, input.assessmentId));
          nextCode = selectNextQuestion(nextDim, answeredCodes, null);
        } else {
          // All dimensions done
          return { done: true, question: null, progress: null };
        }
      }

      if (!nextCode) return { done: true, question: null, progress: null };

      const [question] = await db.select().from(companyQuestions)
        .where(eq(companyQuestions.questionCode, nextCode));
      if (!question) return { done: true, question: null, progress: null };

      // Progress
      const totalQuestions = DIMENSIONS.length * 2; // 2 per dimension = 14 total
      const progress = {
        answered: answeredIds.length,
        total: totalQuestions,
        currentDimension: assessment.currentDimension || DIMENSIONS[0].key,
        currentDimensionLabel: DIMENSIONS.find(d => d.key === (assessment.currentDimension || DIMENSIONS[0].key))?.label || "",
        dimensionProgress: DIMENSIONS.map(d => ({
          key: d.key,
          label: d.label,
          answered: answeredCodes.filter(c => QUESTION_BANK.find(q => q.code === c)?.dimension === d.key).length,
          total: 2,
        })),
      };

      return {
        done: false,
        question: {
          id: question.id,
          code: question.questionCode,
          dimension: question.dimension,
          dimensionLabel: question.dimensionLabel,
          stem: question.stem,
          options: [
            { key: "A", text: question.optionA, score: question.scoreA },
            { key: "B", text: question.optionB, score: question.scoreB },
            { key: "C", text: question.optionC, score: question.scoreC },
            { key: "D", text: question.optionD, score: question.scoreD },
          ],
        },
        progress,
      };
    }),

  // Submit a response
  submitResponse: protectedProcedure
    .input(z.object({
      assessmentId: z.string(),
      questionId: z.string(),
      selectedOption: z.enum(["A", "B", "C", "D"]),
      confidence: z.enum(["guessing", "fairly_sure", "certain"]).default("fairly_sure"),
      evidence: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [question] = await db.select().from(companyQuestions)
        .where(eq(companyQuestions.id, input.questionId));
      if (!question) throw new Error("Question not found");

      const rawScore = {
        A: question.scoreA,
        B: question.scoreB,
        C: question.scoreC,
        D: question.scoreD,
      }[input.selectedOption];

      const multiplier = CONFIDENCE_MULTIPLIERS[input.confidence] || 0.9;
      const adjustedScore = rawScore * multiplier;

      await db.insert(companyAssessmentResponses).values({
        id: randomUUID(),
        assessmentId: input.assessmentId,
        questionId: input.questionId,
        selectedOption: input.selectedOption,
        confidence: input.confidence,
        evidence: input.evidence || null,
        rawScore,
        adjustedScore,
      });

      // Update questions answered count
      const [assessment] = await db.select().from(companyAssessments)
        .where(eq(companyAssessments.id, input.assessmentId));
      await db.update(companyAssessments)
        .set({ questionsAnswered: (assessment?.questionsAnswered || 0) + 1 })
        .where(eq(companyAssessments.id, input.assessmentId));

      return { ok: true };
    }),

  // Complete assessment and compute results
  completeAssessment: protectedProcedure
    .input(z.object({ assessmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertLLMRateLimit(ctx.user.id); // PROD-2.1
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [assessment] = await db.select().from(companyAssessments)
        .where(eq(companyAssessments.id, input.assessmentId));
      if (!assessment) throw new Error("Assessment not found");

      // Get all responses with question data
      const responses = await db.select({
        response: companyAssessmentResponses,
        question: companyQuestions,
      })
        .from(companyAssessmentResponses)
        .innerJoin(companyQuestions, eq(companyAssessmentResponses.questionId, companyQuestions.id))
        .where(eq(companyAssessmentResponses.assessmentId, input.assessmentId));

      // Compute dimension scores
      const dimScores: Record<string, number[]> = {};
      for (const r of responses) {
        const dim = r.question.dimension;
        if (!dimScores[dim]) dimScores[dim] = [];
        dimScores[dim].push(r.response.adjustedScore);
      }

      function avgScore(scores: number[]): number {
        if (!scores || scores.length === 0) return 2.5; // default mid
        return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      }

      const scoreStrategy = avgScore(dimScores["strategy"]);
      const scoreGovernance = avgScore(dimScores["governance"]);
      const scoreData = avgScore(dimScores["data"]);
      const scoreTechnology = avgScore(dimScores["technology"]);
      const scoreWorkforce = avgScore(dimScores["workforce"]);
      const scoreHrFunction = avgScore(dimScores["hr_function"]);
      const scoreCulture = avgScore(dimScores["culture"]);

      // Weighted composite
      const overallScore = Math.round(
        (scoreStrategy * 0.18 +
          scoreGovernance * 0.16 +
          scoreData * 0.15 +
          scoreTechnology * 0.13 +
          scoreWorkforce * 0.18 +
          scoreHrFunction * 0.12 +
          scoreCulture * 0.08) * 10
      ) / 10;

      const maturity = getMaturityLabel(overallScore);

      // Get company for sector benchmark
      const [company] = await db.select().from(companies)
        .where(eq(companies.id, assessment.companyId));
      const orgSizeValue = company?.headcountBand ? headcountBandToSize(company.headcountBand) : null;
      const orgTypeValue = company?.orgType ?? null;
      const sectorAvg = getEffectiveBenchmark(SECTOR_BENCHMARKS, company?.sector ?? "Other", company?.subSector ?? null, orgSizeValue, orgTypeValue);
      const sectorPercentile = computePercentile(overallScore, sectorAvg);
      const benchmarkCtx = getBenchmarkContext(company?.sector ?? "other", company?.subSector, orgSizeValue, orgTypeValue, sectorAvg);
      const overallPercentile = computePercentile(overallScore, 2.5);

      // Gap analysis
      const dimScoreMap = {
        strategy: scoreStrategy,
        governance: scoreGovernance,
        data: scoreData,
        technology: scoreTechnology,
        workforce: scoreWorkforce,
        hr_function: scoreHrFunction,
        culture: scoreCulture,
      };

      const critical: string[] = [];
      const developing: string[] = [];
      const strengths: string[] = [];

      for (const dim of DIMENSIONS) {
        const score = dimScoreMap[dim.key as keyof typeof dimScoreMap];
        if (score < 2.0) critical.push(dim.label);
        else if (score < 3.0) developing.push(dim.label);
        else if (score >= 3.5) strengths.push(dim.label);
      }

      // Generate executive summary via LLM
      let executiveSummary = `Your organisation scores ${overallScore}/5.0 overall, placing you at the ${maturity.label} stage of HR AI maturity. ${maturity.description}`;
      try {
        const llmResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert HR AI strategy consultant. Write a concise 3-sentence executive summary of an organisation's HR AI maturity assessment results. Be specific, evidence-based, and forward-looking. Do not use bullet points. Write in plain English for a CHRO audience.`,
            },
            {
              role: "user",
              content: `Organisation: ${company?.name || "Unknown"}.
Benchmark context: ${benchmarkCtx}.
Org size: ${orgSizeValue ?? "unknown"}.
Overall score: ${overallScore}/5.0 (${maturity.label}).
Dimension scores: Strategy ${scoreStrategy}, Governance ${scoreGovernance}, Data ${scoreData}, Technology ${scoreTechnology}, Workforce ${scoreWorkforce}, HR Function ${scoreHrFunction}, Culture ${scoreCulture}.
Critical gaps: ${critical.join(", ") || "None"}.
Strengths: ${strengths.join(", ") || "None"}.
Sector strategy context: ${getStrategyGuidance(company?.sector ?? "other", orgSizeValue, orgTypeValue)}
Write the executive summary.`,
            },
          ],
        });
        const rawContent = llmResponse?.choices?.[0]?.message?.content;
        if (typeof rawContent === 'string') executiveSummary = rawContent;
      } catch {
        // Use default summary
      }

      // Save results
      const resultId = randomUUID();
      await db.insert(companyAssessmentResults).values({
        id: resultId,
        assessmentId: input.assessmentId,
        companyId: assessment.companyId,
        scoreStrategy,
        scoreGovernance,
        scoreData,
        scoreTechnology,
        scoreWorkforce,
        scoreHrFunction,
        scoreCulture,
        overallScore,
        maturityLabel: maturity.label,
        sectorPercentile,
        overallPercentile,
        executiveSummary,
        gapAnalysisJson: { critical, developing, strengths },
      });

      // Mark assessment as completed
      await db.update(companyAssessments)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(companyAssessments.id, input.assessmentId));

      return { resultId, maturityLabel: maturity.label, overallScore };
    }),

  // Get assessment results
  getResults: protectedProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [result] = await db.select().from(companyAssessmentResults)
        .where(eq(companyAssessmentResults.assessmentId, input.assessmentId));
      if (!result) return null;

      const [assessment] = await db.select().from(companyAssessments)
        .where(eq(companyAssessments.id, input.assessmentId));

      const [company] = await db.select().from(companies)
        .where(eq(companies.id, result.companyId));

      const maturity = getMaturityLabel(result.overallScore);
      const orgSizeValue = company?.headcountBand ? headcountBandToSize(company.headcountBand) : null;
      const orgTypeValue = company?.orgType ?? null;
      const sectorAvg = getEffectiveBenchmark(SECTOR_BENCHMARKS, company?.sector ?? "Other", company?.subSector ?? null, orgSizeValue, orgTypeValue);
      return {
        ...result,
        maturityDescription: maturity.description,
        sectorAverage: sectorAvg,
        benchmarkContext: getBenchmarkContext(company?.sector ?? "other", company?.subSector, orgSizeValue, orgTypeValue, sectorAvg),
        companySector: company?.sector ?? null,
        companySubSector: company?.subSector ?? null,
        companyOrgSize: orgSizeValue,
        companyOrgType: orgTypeValue,
        company,
        dimensions: DIMENSIONS.map(d => {
          const score = {
            strategy: result.scoreStrategy,
            governance: result.scoreGovernance,
            data: result.scoreData,
            technology: result.scoreTechnology,
            workforce: result.scoreWorkforce,
            hr_function: result.scoreHrFunction,
            culture: result.scoreCulture,
          }[d.key] || 0;
          return {
            key: d.key,
            label: d.label,
            weight: d.weight,
            description: d.description,
            score,
            researchBasis: d.researchBasis,
          };
        }),
      };
    }),

  // Get assessment status
  getAssessmentStatus: protectedProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [assessment] = await db.select().from(companyAssessments)
        .where(eq(companyAssessments.id, input.assessmentId));
      return assessment || null;
    }),

  // Get the tenant's latest completed assessment results (for HR AI Strategy page)
  getMyAssessmentResults: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    // Find the latest completed assessment for this tenant
    const assessments = await db.select({
      id: companyAssessments.id,
      status: companyAssessments.status,
      companyId: companyAssessments.companyId,
      startedAt: companyAssessments.startedAt,
    }).from(companyAssessments)
      .where(and(eq(companyAssessments.tenantId, ctx.user.tenantId), eq(companyAssessments.status, "completed")))
      .orderBy(desc(companyAssessments.startedAt))
      .limit(1);
    const assessment = assessments[0];
    if (!assessment) return null;
    const [result] = await db.select().from(companyAssessmentResults)
      .where(eq(companyAssessmentResults.assessmentId, assessment.id));
    if (!result) return null;
    const [company] = await db.select().from(companies)
      .where(eq(companies.id, result.companyId));
    const maturity = getMaturityLabel(result.overallScore);
    const orgSizeValue = company?.headcountBand ? headcountBandToSize(company.headcountBand) : null;
    const orgTypeValue = company?.orgType ?? null;
    const sectorAvg = getEffectiveBenchmark(SECTOR_BENCHMARKS, company?.sector ?? "Other", company?.subSector ?? null, orgSizeValue, orgTypeValue);
    const benchmarkCtx = getBenchmarkContext(company?.sector ?? "other", company?.subSector, orgSizeValue, orgTypeValue, sectorAvg);
    // Per-dimension sector benchmarks (scaled from overall sector avg)
    const dimBenchmarkScale: Record<string, number> = {
      strategy:    1.05, // strategy tends to be higher in advanced sectors
      governance:  0.95,
      data:        1.00,
      technology:  1.08,
      workforce:   0.98,
      hr_function: 0.90, // hr_function tends to lag
      culture:     0.97,
    };
    const dimScores: Record<string, number> = {
      strategy:    result.scoreStrategy,
      governance:  result.scoreGovernance,
      data:        result.scoreData,
      technology:  result.scoreTechnology,
      workforce:   result.scoreWorkforce,
      hr_function: result.scoreHrFunction,
      culture:     result.scoreCulture,
    };
    // Ambition level → required company maturity mapping
    // Business ambition 1-5 maps to required company maturity 1.5-4.5
    const ambitionToRequiredMaturity = (level: number) => 1.0 + (level - 1) * 0.875;
    return {
      assessmentId: assessment.id,
      overallScore: result.overallScore,
      maturityLabel: result.maturityLabel,
      maturityDescription: maturity.description,
      executiveSummary: result.executiveSummary,
      sectorAverage: sectorAvg,
      benchmarkContext: benchmarkCtx,
      companyName: company?.name ?? null,
      companySector: company?.sector ?? null,
      companySubSector: company?.subSector ?? null,
      companyOrgSize: orgSizeValue,
      companyOrgType: orgTypeValue,
      ambitionToRequiredMaturity,
      dimensions: DIMENSIONS.map(d => {
        const score = dimScores[d.key] ?? 0;
        const dimBenchmark = Math.min(5, sectorAvg * (dimBenchmarkScale[d.key] ?? 1.0));
        return {
          key: d.key,
          label: d.label,
          weight: d.weight,
          score,
          sectorBenchmark: Math.round(dimBenchmark * 10) / 10,
          description: d.description,
        };
      }),
    };
  }),

  // Get the tenant's single current assessment (latest by startedAt)
  getMyAssessment: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const rows = await db.select({
      id: companyAssessments.id,
      status: companyAssessments.status,
      companyId: companyAssessments.companyId,
      startedAt: companyAssessments.startedAt,
    }).from(companyAssessments)
      .where(eq(companyAssessments.tenantId, ctx.user.tenantId))
      .orderBy(desc(companyAssessments.startedAt))
      .limit(1);
    return rows[0] ?? null;
  }),
});
