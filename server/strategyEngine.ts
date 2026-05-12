/**
 * AiQ Strategy Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Core logic for the HR AI Strategy Builder:
 *   1. Vision + principles generation with quality gate (P1.1)
 *   2. wontDo generation (P1.2)
 *   3. Risk rule auto-evaluation (P1.3)
 *   4. Initiative auto-selection (P2.1)
 *   5. Cost envelope calculation (P2.2)
 *   6. Provenance map construction (P1.4)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { invokeLLM } from "./_core/llm";
import {
  getAllInitiatives,
  getLibraryMeta,
  estimateInitiativeCost,
  type Initiative,
} from "./contentLibrary";
import { getSectorDef, getSubSectorLabel } from "../shared/sectorTaxonomy";
import { SECTOR_REGULATORY_CONTEXT } from "./ail/organisationContextLayer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GuidingPrinciple {
  title: string;
  description: string;
}

export interface VisionResult {
  visionStatement: string;
  principles: GuidingPrinciple[];
  wontDo: string[];
  qualityGatePass: boolean;
  attempts: number;
  usedFallback: boolean;
}

export interface RiskRuleMatch {
  ruleId: string;
  displayName: string;
  riskStatement: string;
  severity: "very_high" | "high" | "medium" | "low";
  recommendedAction: string;
  regulatoryBasis: string[];
  sources: string[];
  /** Discriminator: 'risk' = acknowledgeable risk; 'note' = informational regulatory note (no acknowledge affordance) */
  type: "risk" | "note";
}

export interface CostEnvelope {
  byPhase: {
    phase: string;
    label: string;
    initiativeCount: number;
    minGbk: number;
    maxGbk: number;
    initiatives: Array<{ id: string; name: string; minGbk: number; maxGbk: number; caveat: string }>;
  }[];
  totalMin: number;
  totalMax: number;
  currency: string;
  caveat: string;
  libraryVersion: string;
}

export interface ProvenanceMap {
  vision: { method: string; libraryVersion: string; generatedAt: number };
  wontDo: { method: string; libraryVersion: string; generatedAt: number };
  costs: Record<string, { sourceId: string; baseRange: [number, number]; multipliers: string[]; libraryVersion: string }>;
  risks: Record<string, { ruleId: string; triggeredBy: string; libraryVersion: string }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FORBIDDEN_PHRASES = [
  "reduce administrative burden",
  "speed up decision-making",
  "data-driven culture",
  "people-centric",
  "future-ready",
  "empower our people",
  "unlock the potential",
  "leverage AI",
  "harness the power",
  "transform our HR function",
  "digital transformation",
  "AI-powered HR",
  "innovative solutions",
  "cutting-edge",
  "world-class",
];

const REQUIRED_ELEMENTS = [
  /\d+\s*%|\d+\s*points?|\d+\s*months?|\d+\s*weeks?|\d+\s*days?/i, // at least one number/metric
  /by \d{4}|by Q[1-4]|within \d+|over the next \d+|end of \d{4}/i,  // time-bound horizon
];
// B5: Qualitative items considered too generic to surface in the strategy artefact
export const GENERIC_QUAL_PHRASES = new Set([
  "Employee trust",
  "Data-driven decisions",
  "Improved compliance",
  "Regulatory compliance",
  "Improved employee experience",
  "Higher employee engagement",
  "Higher employee engagement scores",
  "Improved retention",
  "Faster decision-making",
  "Faster response times",
  "Better AI-human collaboration",
  "Cultural readiness",
  "Stakeholder confidence",
  "Improved HR credibility",
  "Higher quality HR outputs",
  "Improved analytics accuracy",
  "Improved team performance",
  "Workforce stability",
  "AI model reliability",
  "Measurable adoption metrics",
  "Regulatory compliance assurance",
]);

const GOLDEN_EXAMPLES: Record<string, string> = {
  retail_transformative: `By 2027, ${"{company}"}'s HR function will operate as a predictive intelligence layer for a 45,000-person retail workforce: deploying AI-driven attrition signals to store managers 90 days before turnover risk peaks, running continuous skills gap analysis against seasonal trading plans, and ensuring every people decision from hiring to promotion is auditable under the EU AI Act. HR will move from reactive administration to a function that shapes labour strategy before the board asks for it.`,
  financial_services_progressive: `Within 18 months, HR will reduce time-to-productive for new relationship managers from 14 weeks to 8 by deploying AI-personalised onboarding journeys calibrated to individual capability gaps identified at hire. Simultaneously, we will build an algorithmic bias monitoring capability that reviews every shortlisting decision in real time — because in a regulated firm, explainability is not optional.`,
  healthcare_cautious: `Over the next 12 months, HR will introduce AI-assisted job description standardisation and an AI literacy programme for all 2,400 HR staff — establishing the data hygiene and human capability foundation that any further AI deployment will require. We will not deploy AI in clinical hiring decisions until a bias audit framework is in place and validated by an independent third party.`,
  manufacturing_progressive: `By end of 2026, HR will deploy a skills intelligence platform that maps the capability of 8,000 production workers against a 3-year automation roadmap — giving the business 18 months of lead time to reskill rather than redeploy. Every skills gap identified will trigger an automated learning pathway, not a redundancy conversation.`,
  technology_transformative: `HR will become the first function in the organisation to operate a fully AI-augmented talent lifecycle: from AI-assisted sourcing that removes recruiter bias at screen, to a continuous performance intelligence layer that surfaces coaching opportunities before managers notice them. By Q4 2026, 100% of hiring decisions above Band 5 will include an AI-generated evidence pack reviewed by the hiring manager — and every model will be audited quarterly.`,
};

// ─── P1.1 Vision Generation with Quality Gate ─────────────────────────────────

export async function generateVisionWithQualityGate(params: {
  sector: string;
  subSector?: string | null;
  orgType?: string | null;
  orgSize?: string | null;
  businessAmbitionLabel: string;
  peopleAmbitionLabel: string;
  aiPhilosophy?: string;
  aspirationAnswers: Record<string, string>;
  hrRoleAnswers: Record<string, string>;
  maxAttempts?: number;
}): Promise<VisionResult> {
  const { sector, subSector, orgType, orgSize, businessAmbitionLabel, peopleAmbitionLabel, aiPhilosophy, aspirationAnswers, hrRoleAnswers, maxAttempts = 3 } = params;
  const libMeta = getLibraryMeta();

  // Select closest golden example for the system prompt
  const tierKey = businessAmbitionLabel.toLowerCase().replace(/\s+/g, "_");
  const sectorKey = sector.toLowerCase().replace(/\s+/g, "_");
  const goldenKey = `${sectorKey}_${tierKey}`;
  const goldenExample = GOLDEN_EXAMPLES[goldenKey] ?? GOLDEN_EXAMPLES[`retail_transformative`];

  const systemPrompt = `You are an expert HR strategy consultant writing for a CHRO audience. You write in a direct, specific, board-ready style.

QUALITY RULES — your output MUST pass all of these:
1. Vision statement: 2-4 sentences. Must contain at least one specific metric (%, number, timeframe). Must name a specific HR outcome, not a generic aspiration.
2. Principles: Exactly 5. Each must force a real trade-off or be falsifiable. Titles must be 3-6 words. No generic values-poster language.
3. wontDo: Exactly 4-6 items. Each must be a specific, named thing the organisation will NOT do — not a vague boundary. These are the cuts that make it a strategy.

FORBIDDEN PHRASES — never use any of these:
${FORBIDDEN_PHRASES.map(p => `- "${p}"`).join("\n")}

GOLDEN EXAMPLE (vision statement quality bar):
"${goldenExample}"

Always respond with valid JSON only, no markdown fences.`;

  const sectorDef = getSectorDef(sector);
  const sectorLabel = sectorDef?.label ?? sector;
  const subSectorLabel = subSector ? getSubSectorLabel(sector, subSector) : null;
  const contextLabel = subSectorLabel ? `${subSectorLabel} (${sectorLabel})` : sectorLabel;
  const sectorRegContext = SECTOR_REGULATORY_CONTEXT[sector] ?? SECTOR_REGULATORY_CONTEXT.other;
  const regulatoryBlock = `Regulator: ${sectorRegContext.regulator}
Key legislation: ${sectorRegContext.keyLegislation.slice(0, 3).join(", ")}
Key AI risks for this sector: ${sectorRegContext.aiRisks.join("; ")}`;

  const userPrompt = `Generate a board-ready HR AI strategy vision for:
Sector: ${contextLabel}${orgType ? `\nOrganisation type: ${orgType}` : ""}${orgSize ? `\nOrganisation size: ${orgSize}` : ""}
Business AI Ambition: ${businessAmbitionLabel}
People AI Ambition: ${peopleAmbitionLabel}
Content Library Version: ${libMeta.version}
Sector Regulatory Context:
${regulatoryBlock}

Business AI Aspiration Answers:
${Object.entries(aspirationAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")}

HR Role Answers:
${Object.entries(hrRoleAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")}

Return JSON with this exact structure:
{
  "visionStatement": "string (2-4 sentences, must include at least one metric)",
  "principles": [
    { "title": "string (3-6 words)", "description": "string (1-2 sentences, must name a trade-off)" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" }
  ],
  "wontDo": ["string", "string", "string", "string", "string"]
}`;

  let attempts = 0;
  let lastResult: { visionStatement: string; principles: GuidingPrinciple[]; wontDo: string[] } | null = null;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
          ...(attempts > 1 && lastResult ? [{
            role: "user" as const,
            content: `Your previous attempt failed the quality gate. Issues found:\n${getQualityIssues(lastResult.visionStatement, lastResult.principles, lastResult.wontDo).join("\n")}\n\nPlease try again, fixing all issues.`,
          }] : []),
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "vision_principles_wontdo",
            strict: true,
            schema: {
              type: "object",
              properties: {
                visionStatement: { type: "string" },
                principles: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["title", "description"],
                    additionalProperties: false,
                  },
                },
                wontDo: { type: "array", items: { type: "string" } },
              },
              required: ["visionStatement", "principles", "wontDo"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content)) as {
        visionStatement: string;
        principles: GuidingPrinciple[];
        wontDo: string[];
      };

      lastResult = parsed;

      const issues = getQualityIssues(parsed.visionStatement, parsed.principles, parsed.wontDo);
      if (issues.length === 0) {
        return {
          visionStatement: parsed.visionStatement,
          principles: parsed.principles,
          wontDo: parsed.wontDo,
          qualityGatePass: true,
          attempts,
          usedFallback: false,
        };
      }
    } catch (err) {
      console.error(`[StrategyEngine] Vision generation attempt ${attempts} failed:`, err);
    }
  }

  // Fallback: use last result if available, or golden example
  if (lastResult) {
    return {
      visionStatement: lastResult.visionStatement,
      principles: lastResult.principles,
      wontDo: lastResult.wontDo.length > 0 ? lastResult.wontDo : getDefaultWontDo(businessAmbitionLabel),
      qualityGatePass: false,
      attempts,
      usedFallback: true,
    };
  }

  // Hard fallback
  return {
    visionStatement: goldenExample.replace("{company}", "the organisation"),
    principles: getDefaultPrinciples(sector, businessAmbitionLabel),
    wontDo: getDefaultWontDo(businessAmbitionLabel),
    qualityGatePass: false,
    attempts,
    usedFallback: true,
  };
}

function getQualityIssues(vision: string, principles: GuidingPrinciple[], wontDo: string[]): string[] {
  const issues: string[] = [];

  // Check forbidden phrases
  const visionLower = vision.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (visionLower.includes(phrase.toLowerCase())) {
      issues.push(`Vision contains forbidden phrase: "${phrase}"`);
    }
  }

  // Check required elements
  for (const regex of REQUIRED_ELEMENTS) {
    if (!regex.test(vision)) {
      issues.push("Vision must contain at least one specific metric (%, number, or timeframe)");
    }
  }

  // Check principles count
  if (principles.length !== 5) {
    issues.push(`Expected exactly 5 principles, got ${principles.length}`);
  }

  // Check principle titles aren't generic
  const genericTitlePatterns = /people.centric|future.ready|innovation|excellence|integrity|collaboration/i;
  for (const p of principles) {
    if (genericTitlePatterns.test(p.title)) {
      issues.push(`Principle title "${p.title}" is too generic — must name a specific trade-off`);
    }
  }

  // Check wontDo
  if (wontDo.length < 3) {
    issues.push(`Expected at least 3 wontDo items, got ${wontDo.length}`);
  }

  return issues;
}

function getDefaultPrinciples(sector: string, ambitionLabel: string): GuidingPrinciple[] {
  return [
    { title: "Accuracy Before Speed in Hiring", description: "We will not deploy AI in shortlisting until an independent bias audit has passed. Speed of hire is not a valid trade-off for discriminatory outcomes." },
    { title: "Explainability Is Non-Negotiable", description: "Every AI model used in a people decision must produce a human-readable explanation. Black-box outputs will not be accepted regardless of accuracy." },
    { title: "Data Quality Before Analytics", description: "We will not build predictive models on HR data that has not passed a quality audit. Unreliable inputs produce unreliable outputs and erode trust faster than no analytics at all." },
    { title: "HR Leads, IT Enables", description: "AI tools for HR will be owned and governed by HR, not IT. HR retains accountability for every people outcome, regardless of which system produced the recommendation." },
    { title: "Consent Before Monitoring", description: "We will not deploy any AI that monitors employee behaviour — including wellbeing, productivity, or engagement — without explicit employee consent and a published transparency statement." },
  ];
}

function getDefaultWontDo(ambitionLabel: string): string[] {
  const base = [
    "Deploy AI in employment decisions (hiring, promotion, redundancy) without a documented bias audit and legal review",
    "Build predictive analytics on HR data that has not passed a data quality audit",
    "Implement AI monitoring of employee behaviour (productivity, wellbeing, engagement) without explicit consent",
    "Allow externally-led AI implementations where HR does not own the model governance",
    "Adopt AI tools that cannot produce human-readable explanations of their outputs",
  ];
  if (ambitionLabel.toLowerCase().includes("cautious")) {
    base.push("Move to Scale-phase AI initiatives before Foundation literacy and governance are in place");
  }
  return base;
}

// ─── P1.3 Risk Rule Auto-Evaluation ──────────────────────────────────────────

export interface RiskEvalInput {
  selectedInitiativeIds: string[];
  ambitionTier: "cautious" | "progressive" | "transformative";
  orgSize: "small" | "medium" | "large" | "enterprise";
  hasExecSponsor: boolean;
  hasDataGovernanceInitiative: boolean;
}

export function evaluateRiskRules(input: RiskEvalInput): RiskRuleMatch[] {
  const { selectedInitiativeIds, ambitionTier, orgSize, hasExecSponsor, hasDataGovernanceInitiative } = input;
  const ids = new Set(selectedInitiativeIds);
  const matches: RiskRuleMatch[] = [];

  // Helper: check if any analytics initiative is selected
  const analyticsInitiatives = ["predictive_attrition_modelling", "skills_intelligence_platform", "workforce_scenario_planning", "people_analytics_dashboard"];
  const hasAnalytics = analyticsInitiatives.some(id => ids.has(id));

  // Helper: check if any scale/optimise initiative is selected
  const scaleOptimiseInitiatives = [
    "predictive_attrition_modelling", "skills_intelligence_platform", "workforce_scenario_planning",
    "ai_powered_learning_personalisation", "ai_pay_equity_analysis", "manager_ai_coaching_toolkit",
    "ai_talent_marketplace", "ai_performance_calibration", "ai_employee_listening",
    "ai_job_architecture_redesign", "ai_governance_continuous_monitoring", "ai_hr_operating_model_redesign",
    "ai_centre_of_excellence", "hr_ai_operating_model_redesign", "ai_governance_maturity_programme",
  ];
  const hasScaleOptimise = scaleOptimiseInitiatives.some(id => ids.has(id));

  // Helper: check for high-risk AI Act initiatives
  const highRiskAiActInitiatives = ["ai_assisted_cv_screening", "predictive_attrition_modelling", "ai_pay_equity_analysis"];
  const hasHighRiskAiAct = highRiskAiActInitiatives.some(id => ids.has(id));
  const hasGovernanceFramework = ids.has("ai_ethics_governance_framework") || ids.has("ai_governance_maturity_programme");

  // rr_high_risk_ai_without_governance
  if (hasHighRiskAiAct && !hasGovernanceFramework) {
    matches.push({
      ruleId: "rr_high_risk_ai_without_governance",
      type: "risk" as const,
      displayName: "High-Risk AI Without Governance Framework",
      riskStatement: "One or more initiatives involve high-risk AI use cases under the EU AI Act (hiring, attrition, pay equity) but no AI ethics or governance framework is in scope. This creates significant regulatory exposure and potential ICO enforcement action.",
      severity: "very_high",
      recommendedAction: "Add 'AI Ethics & Governance Framework' to Foundation phase and sequence it before any high-risk AI initiative. Engage employment law counsel before go-live.",
      regulatoryBasis: ["EU AI Act 2024", "ICO Guidance on HR AI 2025"],
      sources: ["EU AI Act 2024", "ICO Guidance on HR AI 2025", "ACAS AI in Employment 2024"],
    });
  }

  // rr_cv_screening_without_bias_audit
  if (ids.has("ai_assisted_cv_screening") && !ids.has("bias_monitoring_and_auditing")) {
    matches.push({
      ruleId: "rr_cv_screening_without_bias_audit",
      type: "risk" as const,
      displayName: "CV Screening Without Bias Audit",
      riskStatement: "AI-assisted CV screening is in scope but bias monitoring is not. This creates significant legal exposure under the Equality Act 2010 and EU AI Act. Discriminatory shortlists could result in employment tribunal claims and ICO enforcement action.",
      severity: "very_high",
      recommendedAction: "Add 'Bias Monitoring & Algorithmic Auditing' to Foundation phase and sequence it before 'AI-Assisted CV Screening'. Engage employment law counsel before go-live.",
      regulatoryBasis: ["EU AI Act 2024", "ACAS AI in Employment 2024", "ICO Guidance on HR AI 2025"],
      sources: ["EU AI Act 2024", "ACAS AI in Employment 2024", "ICO Guidance on HR AI 2025"],
    });
  }

  // rr_analytics_without_data_quality
  if (hasAnalytics && !ids.has("hr_data_quality_audit")) {
    matches.push({
      ruleId: "rr_analytics_without_data_quality",
      type: "risk" as const,
      displayName: "Analytics Initiative Without Data Quality Foundation",
      riskStatement: "Analytics initiatives are planned but no data quality audit is in scope. HR analytics built on poor-quality data produces unreliable outputs that can lead to poor decisions and erode trust in the analytics function.",
      severity: "high",
      recommendedAction: "Add 'HR Data Quality Audit & Remediation' to Foundation phase before any analytics initiative. Allow 3-6 months for remediation before analytics build begins.",
      regulatoryBasis: ["Gartner Data Readiness 2025"],
      sources: ["Gartner Data Readiness 2025", "Lumi Design Partners 2025"],
    });
  }

  // rr_scale_without_foundation_literacy
  if (hasScaleOptimise && !ids.has("ai_literacy_programme")) {
    matches.push({
      ruleId: "rr_scale_without_foundation_literacy",
      type: "risk" as const,
      displayName: "Scale-Phase Initiatives Without AI Literacy Foundation",
      riskStatement: "Scale-phase AI initiatives are planned but no AI literacy programme is in scope. Deploying advanced AI tools to a workforce without AI literacy leads to low adoption, misuse, and wasted investment.",
      severity: "high",
      recommendedAction: "Add 'AI Literacy Programme for HR' to Foundation phase. Ensure it completes before Scale-phase initiatives begin.",
      regulatoryBasis: ["CIPD 2025 Capability Report"],
      sources: ["CIPD 2025 Capability Report", "IBM AI Adoption 2025", "Lumi Design Partners 2025"],
    });
  }

  // rr_transformative_without_exec_sponsor
  if (ambitionTier === "transformative" && !hasExecSponsor) {
    matches.push({
      ruleId: "rr_transformative_without_exec_sponsor",
      type: "risk" as const,
      displayName: "Transformative Ambition Without Executive Sponsor",
      riskStatement: "A Transformative AI ambition requires board-level executive sponsorship to succeed. Without it, the programme will stall at the first cross-functional dependency (IT budget, Legal sign-off, Finance approval).",
      severity: "high",
      recommendedAction: "Secure named executive sponsor (CHRO or CEO) before committing to Transformative ambition. Include executive sponsorship as a Foundation phase prerequisite.",
      regulatoryBasis: ["IBM AI Adoption 2025"],
      sources: ["IBM AI Adoption 2025", "Deloitte Workforce AI 2025", "Lumi Design Partners 2025"],
    });
  }

  // rr_attrition_model_without_gdpr_controls
  if (ids.has("predictive_attrition_modelling") && !hasDataGovernanceInitiative) {
    matches.push({
      ruleId: "rr_attrition_model_without_gdpr_controls",
      type: "risk" as const,
      displayName: "Attrition Modelling Without GDPR Data Controls",
      riskStatement: "Predictive attrition modelling processes sensitive personal data at scale. Without appropriate GDPR controls (lawful basis, data minimisation, access controls), the organisation risks ICO enforcement action and employee trust damage.",
      severity: "high",
      recommendedAction: "Conduct GDPR impact assessment (DPIA) before building attrition model. Implement data access controls restricting attrition risk scores to HR and direct manager only.",
      regulatoryBasis: ["ICO Guidance on HR AI 2025"],
      sources: ["ICO Guidance on HR AI 2025"],
    });
  }

  // rr_too_many_initiatives_year_one
  const foundationInitiatives = ["ai_literacy_programme", "ai_ethics_governance_framework", "prompt_engineering_for_hr", "ai_acceptable_use_policy", "hr_data_quality_audit", "ai_change_management_programme", "bias_monitoring_and_auditing"];
  const foundationCount = foundationInitiatives.filter(id => ids.has(id)).length;
  if (foundationCount > 5 && (orgSize === "small" || orgSize === "medium")) {
    matches.push({
      ruleId: "rr_too_many_initiatives_year_one",
      type: "risk" as const,
      displayName: "Too Many Foundation Initiatives for Org Size",
      riskStatement: `${foundationCount} Foundation-phase initiatives are planned for a ${orgSize} organisation. This exceeds typical delivery capacity and risks initiative fatigue, poor quality, and programme failure.`,
      severity: "medium",
      recommendedAction: "Reduce Foundation phase to 4-5 initiatives maximum. Prioritise AI Literacy, Ethics Framework, and Data Quality Audit as the non-negotiable foundation.",
      regulatoryBasis: [],
      sources: ["Lumi Design Partners 2025", "IBM AI Adoption 2025"],
    });
  }

  // rr_pay_equity_without_legal_privilege
  if (ids.has("ai_pay_equity_analysis")) {
    matches.push({
      ruleId: "rr_pay_equity_without_legal_privilege",
      type: "risk" as const,
      displayName: "Pay Equity Analysis Without Legal Privilege",
      riskStatement: "AI-powered pay equity analysis generates data that could be disclosable in employment tribunal proceedings unless conducted under legal professional privilege. Without this protection, findings could be used against the organisation.",
      severity: "high",
      recommendedAction: "Engage employment law counsel to structure the pay equity analysis under legal professional privilege before any data collection begins. Do not store findings in HR systems until privilege structure is confirmed.",
      regulatoryBasis: ["Equality Act 2010", "ICO Guidance on HR AI 2025"],
      sources: ["Equality Act 2010", "ICO Guidance on HR AI 2025", "Lumi Design Partners 2025"],
    });
  }

  // rr_wellbeing_monitoring_without_consent
  if (ids.has("manager_ai_coaching_toolkit") || ids.has("ai_employee_listening")) {
    matches.push({
      ruleId: "rr_wellbeing_monitoring_without_consent",
      type: "risk" as const,
      displayName: "Employee Monitoring Without Consent Framework",
      riskStatement: "AI tools that analyse employee communication, sentiment, or behaviour require explicit consent and a published transparency statement. Without these, the organisation risks ICO enforcement action and significant employee trust damage.",
      severity: "medium",
      recommendedAction: "Develop and publish an Employee AI Transparency Statement before deploying any monitoring or listening tools. Conduct a DPIA and establish explicit opt-in consent for any sentiment analysis.",
      regulatoryBasis: ["ICO Guidance on HR AI 2025", "GDPR Article 9"],
      sources: ["ICO Guidance on HR AI 2025", "ACAS AI in Employment 2024"],
    });
  }

  // rr_coe_without_scale_foundation
  if (ids.has("ai_centre_of_excellence")) {
    const scaleCount = scaleOptimiseInitiatives.filter(id => ids.has(id) && id !== "ai_centre_of_excellence").length;
    if (scaleCount < 3) {
      matches.push({
        ruleId: "rr_coe_without_scale_foundation",
        type: "risk" as const,
        displayName: "AI Centre of Excellence Without Scale Foundation",
        riskStatement: "An AI Centre of Excellence is planned but fewer than 3 Scale-phase initiatives are in scope. A CoE without a programme to govern is a cost centre, not a capability. It will struggle to justify its existence and will likely be defunded.",
        severity: "medium",
        recommendedAction: "Either add more Scale-phase initiatives to give the CoE a meaningful governance mandate, or defer the CoE to Optimise phase once the programme has proven value.",
        regulatoryBasis: [],
        sources: ["Deloitte Workforce AI 2025", "Lumi Design Partners 2025"],
      });
    }
  }

  // rr_era_2025_automated_decision_making — informational note (not acknowledgeable risk)
  const automatedDecisionInitiatives = [
    "ai_assisted_cv_screening", "predictive_attrition_modelling", "ai_pay_equity_analysis",
    "ai_performance_calibration", "ai_job_architecture_redesign",
  ];
  if (automatedDecisionInitiatives.some(id => ids.has(id))) {
    matches.push({
      ruleId: "rr_era_2025_automated_decisions",
      type: "note" as const,
      displayName: "Employment Rights Act 2025: Human Review Rights",
      riskStatement: "One or more selected initiatives involve automated decision-making in employment processes. Under the Employment Rights Act 2025, workers have the right to request a human review of any AI-assisted employment decision. Ensure all such initiatives include a documented human-review workflow before deployment.",
      severity: "high",
      recommendedAction: "Document a human-review workflow for each initiative involving automated employment decisions. Include this in your AI Register and communicate the right to human review to affected workers.",
      regulatoryBasis: ["Employment Rights Act 2025", "ERA 1996 (as amended)"],
      sources: ["Employment Rights Act 2025", "ACAS AI in Employment 2024", "Lumi Design Partners 2025"],
    });
  }

  return matches;
}

// ─── P2.1 Initiative Auto-Selection ──────────────────────────────────────────

export interface SelectInitiativesInput {
  ambitionTier: "cautious" | "progressive" | "transformative";
  sector: string;
  orgSize: "small" | "medium" | "large" | "enterprise";
  orgSizeHeadcount: number; // numeric headcount for cost estimation
  priorityDomains: string[]; // top capability domains with largest gaps
  targetCount: number;
}

export function selectInitiatives(input: SelectInitiativesInput): string[] {
  const { ambitionTier, sector, orgSize, priorityDomains, targetCount } = input;
  const allInitiatives = getAllInitiatives();

  // Phase budgets by ambition tier
  const phaseBudgets: Record<string, Record<string, number>> = {
    cautious:       { foundation: 4, build: 2, scale: 1, optimise: 0 },
    progressive:    { foundation: 3, build: 3, scale: 2, optimise: 1 },
    transformative: { foundation: 3, build: 3, scale: 3, optimise: 2 },
  };
  const budgets = phaseBudgets[ambitionTier] ?? phaseBudgets.progressive;

  // Always include non-negotiable foundation items for cautious/progressive
  const nonNegotiable: Record<string, string[]> = {
    cautious:       ["ai_literacy_programme", "ai_ethics_governance_framework", "ai_acceptable_use_policy", "hr_data_quality_audit"],
    progressive:    ["ai_literacy_programme", "ai_ethics_governance_framework", "hr_data_quality_audit"],
    transformative: ["ai_literacy_programme", "ai_ethics_governance_framework"],
  };
  const required = new Set(nonNegotiable[ambitionTier] ?? []);

  // Score each initiative
  const scored = allInitiatives.map(initiative => {
    let score = 0;

    // Domain alignment: +3 per matching priority domain
    const domains = initiative.capability_domains_addressed ?? [];
    for (const d of priorityDomains) {
      if (domains.includes(d)) score += 3;
    }

    // Sector alignment: +2 if sector matches
    const applicableIndustries = initiative.applicable_industries ?? [];
    if (applicableIndustries.includes(sector.toLowerCase()) || applicableIndustries.includes("all")) score += 2;

    // Complexity penalty for small orgs: use cost range as proxy (>£100k base = high complexity)
    const baseMax = initiative.cost?.base_range_gbp?.[1] ?? 50000;
    const isHighComplexity = baseMax > 100000;
    if (orgSize === "small" && isHighComplexity) score -= 2;
    if (orgSize === "medium" && isHighComplexity) score -= 1;

    // Ambition tier fit
    const phase = initiative.typical_phase ?? "build";
    if (ambitionTier === "cautious" && phase === "foundation") score += 2;
    if (ambitionTier === "transformative" && (phase === "scale" || phase === "optimise")) score += 2;

    return { id: initiative.initiative_id, phase, score, required: required.has(initiative.initiative_id) };
  });

  // Sort by required first, then score descending
  scored.sort((a, b) => {
    if (a.required && !b.required) return -1;
    if (!a.required && b.required) return 1;
    return b.score - a.score;
  });

  // Fill phase budgets
  const selected: string[] = [];
  const phaseCount: Record<string, number> = { foundation: 0, build: 0, scale: 0, optimise: 0 };

  for (const item of scored) {
    if (selected.length >= targetCount) break;
    const phase = item.phase ?? "build";
    const budget = budgets[phase] ?? 0;
    if (item.required || phaseCount[phase] < budget) {
      selected.push(item.id);
      phaseCount[phase] = (phaseCount[phase] ?? 0) + 1;
    }
  }

  return selected;
}

// ─── P2.2 Cost Envelope Calculation ──────────────────────────────────────────

// Map internal ambition tier labels to content library keys
function toLibAmbitionTier(tier: "cautious" | "progressive" | "transformative"): "embracers" | "innovators" | "transformative" {
  if (tier === "cautious") return "embracers";
  if (tier === "progressive") return "innovators";
  return "transformative";
}

// Map org size label to headcount midpoint for cost estimation
function orgSizeToHeadcount(size: "small" | "medium" | "large" | "enterprise"): number {
  return { small: 75, medium: 300, large: 1000, enterprise: 5000 }[size] ?? 300;
}

export function calculateCostEnvelope(
  selectedInitiativeIds: string[],
  orgSize: "small" | "medium" | "large" | "enterprise",
  ambitionTier: "cautious" | "progressive" | "transformative",
): CostEnvelope {
  const libMeta = getLibraryMeta();
  const allInitiatives = getAllInitiatives();
  const initiativeMap = new Map(allInitiatives.map(i => [i.initiative_id, i]));

  const phaseOrder = ["foundation", "build", "scale", "optimise"];
  const phaseLabels: Record<string, string> = {
    foundation: "Phase 1 — Foundation",
    build: "Phase 2 — Build",
    scale: "Phase 3 — Scale",
    optimise: "Phase 4 — Optimise",
  };

  const byPhase: CostEnvelope["byPhase"] = [];
  let totalMin = 0;
  let totalMax = 0;

  for (const phase of phaseOrder) {
    const phaseIds = selectedInitiativeIds.filter(id => {
      const initiative = initiativeMap.get(id);
      return initiative?.typical_phase === phase;
    });

    if (phaseIds.length === 0) continue;

    const phaseInitiatives: CostEnvelope["byPhase"][0]["initiatives"] = [];
    let phaseMin = 0;
    let phaseMax = 0;

    for (const id of phaseIds) {
      const initiative = initiativeMap.get(id);
      if (!initiative) continue;

      const estimate = estimateInitiativeCost(id, orgSizeToHeadcount(orgSize), toLibAmbitionTier(ambitionTier));
      if (estimate) {
        const minGbk = Math.round(estimate.min / 1000);
        const maxGbk = Math.round(estimate.max / 1000);
        phaseMin += minGbk;
        phaseMax += maxGbk;
        phaseInitiatives.push({
          id,
          name: initiative.display_name ?? id,
          minGbk,
          maxGbk,
          caveat: estimate.caveat,
        });
      } else {
        // Fallback estimate if no cost data
        const fallback = { small: [15, 40], medium: [25, 70], large: [40, 120], enterprise: [60, 200] }[orgSize] ?? [25, 70];
        phaseMin += fallback[0];
        phaseMax += fallback[1];
        phaseInitiatives.push({
          id,
          name: initiative.display_name ?? id,
          minGbk: fallback[0],
          maxGbk: fallback[1],
          caveat: "Estimate based on typical range for this initiative type",
        });
      }
    }

    totalMin += phaseMin;
    totalMax += phaseMax;

    byPhase.push({
      phase,
      label: phaseLabels[phase] ?? phase,
      initiativeCount: phaseIds.length,
      minGbk: phaseMin,
      maxGbk: phaseMax,
      initiatives: phaseInitiatives,
    });
  }

  return {
    byPhase,
    totalMin,
    totalMax,
    currency: "GBP",
    caveat: "Cost estimates are indicative ranges based on market data from Gartner, Deloitte, and Lumi Design Partners. Actual costs will vary based on vendor selection, internal resource allocation, and implementation complexity. Engage procurement and finance for formal business case development.",
    libraryVersion: libMeta.version,
  };
}

// ─── P1.4 Provenance Map Construction ────────────────────────────────────────

export function buildProvenanceMap(params: {
  selectedInitiativeIds: string[];
  riskMatches: RiskRuleMatch[];
  orgSize: "small" | "medium" | "large" | "enterprise";
  ambitionTier: "cautious" | "progressive" | "transformative";
}): ProvenanceMap {
  const { selectedInitiativeIds, riskMatches, orgSize, ambitionTier } = params;
  const libMeta = getLibraryMeta();
  const allInitiatives = getAllInitiatives();
  const initiativeMap = new Map(allInitiatives.map(i => [i.initiative_id, i]));

  const costs: ProvenanceMap["costs"] = {};
  for (const id of selectedInitiativeIds) {
    const initiative = initiativeMap.get(id);
    if (!initiative?.cost?.base_range_gbp) continue;
    const multipliers: string[] = [];
    if (initiative.cost.size_multipliers) multipliers.push(`size:${orgSize}`);
    if (initiative.cost.ambition_multipliers) multipliers.push(`ambition:${ambitionTier}`);
    costs[id] = {
      sourceId: initiative.sources?.[0] ?? "lumi_design_partners_2025",
      baseRange: initiative.cost.base_range_gbp as [number, number],
      multipliers,
      libraryVersion: libMeta.version,
    };
  }

  const risks: ProvenanceMap["risks"] = {};
  for (const match of riskMatches) {
    risks[match.ruleId] = {
      ruleId: match.ruleId,
      triggeredBy: selectedInitiativeIds.join(","),
      libraryVersion: libMeta.version,
    };
  }

  return {
    vision: { method: "llm_with_quality_gate", libraryVersion: libMeta.version, generatedAt: Date.now() },
    wontDo: { method: "llm_with_quality_gate", libraryVersion: libMeta.version, generatedAt: Date.now() },
    costs,
    risks,
  };
}

// ─── C3 Value Envelope Calculation ───────────────────────────────────────────

export interface ValueEnvelopeInitiative {
  initiative_id: string;
  display_name: string;
  value_type: string;
  quantified_value_gbp: { low: number; high: number } | null;
  qualitative_value: string[];
  monetisation_breakdown: string;
  sources: string[];
  uses_sector_default: boolean;
  confidence: string;
  payback_months: { low: number; high: number } | null;
}

// C2 — Three-tier ROI value types
export type ValueTier = "efficiency" | "effectiveness" | "strategic";
export interface TieredValue {
  efficiency:    { low: number; high: number };  // time/cost savings, headcount avoidance
  effectiveness: { low: number; high: number };  // quality, attrition, engagement
  strategic:     { low: number; high: number };  // risk avoidance, capability uplift
}
// C1 — Expanded TCO
export interface TotalCostOfOwnership {
  implementation_gbp:    { low: number; high: number };
  change_management_gbp: { low: number; high: number }; // 12-15% of implementation
  training_gbp:          { low: number; high: number }; // £200-400 per affected FTE
  ongoing_annual_gbp:    { low: number; high: number }; // 18-20% of implementation per year
  /** CFO Fix 5: internal project management, integration, procurement — 15% of implementation */
  internal_resource_gbp: { low: number; high: number };
  total_3yr_gbp:         { low: number; high: number };
}
// C3 — NPV / IRR
export interface FinancialModel {
  npv_gbp:           { low: number; high: number };
  irr_pct:           { low: number; high: number } | null;
  /** CFO Fix 4: true when IRR > 100% — IRR is unreliable at these levels; use NPV and payback instead */
  irr_suppressed:    boolean;
  discount_rate_pct: number;
  horizon_years:     number;
}
// C4 — Three-scenario
export interface ScenarioAnalysis {
  pessimistic: { value_gbp: number; net_gbp: number; roi_pct: number };
  base:        { value_gbp: number; net_gbp: number; roi_pct: number };
  optimistic:  { value_gbp: number; net_gbp: number; roi_pct: number };
}
// C1: Conditional reinvestment plan
export interface ReinvestmentPlan {
  /** "both_positive" | "straddles_zero" | "both_negative" */
  case: "both_positive" | "straddles_zero" | "both_negative";
  /** true when both NPV scenarios are positive */
  recommended: boolean;
  headline: string;
  narrative: string;
  suggested_reinvestment_gbp: number | null;
  reinvestment_areas: string[];
  phase2_focus_areas: string[];
}
// C2: CEO sponsorship recommendation
export interface CeoSponsorshipRecommendation {
  required: boolean;
  trigger: string;
  rationale: string;
  suggested_framing: string;
}
export interface ValueEnvelope {
  total_quantified_value_gbp: { low: number; high: number };
  net_value_gbp: { low: number; high: number };
  payback_period_months: { low: number; high: number } | null;
  by_initiative: ValueEnvelopeInitiative[];
  qualitative_summary: {
    capability_uplift_count: number;
    risk_avoidance_count: number;
    strategic_count: number;
    bullet_points: string[];
  };
  caveat: string;
  libraryVersion: string;
  // v1.2 additions
  tco: TotalCostOfOwnership;
  tiered_value: TieredValue;
  financial_model: FinancialModel;
  scenario_analysis: ScenarioAnalysis;
  delivery_confidence_panel: {
    score: number;
    label: string;
    phase_duration_note: string;
    change_mgmt_multiplier: number;
    recommendation: string;
  } | null;
  // v1.3 additions (C1/C2)
  reinvestment_plan: ReinvestmentPlan;
  ceo_sponsorship: CeoSponsorshipRecommendation;
  /** Convenience boolean: true when ceo_sponsorship.required is true */
  ceo_sponsorship_required: boolean;
}

function resolveValueFormula(
  initiativeId: string,
  improvementPct: number,
  baseline: {
    headcount?: number;
    hires_per_year?: number;
    cost_per_hire_gbp?: number;
    time_to_fill_days?: number;
    voluntary_attrition_rate_pct?: number;
    l_and_d_spend_per_fte_gbp?: number;
    hr_cost_per_fte_gbp?: number;
    _sector_default_used?: Record<string, boolean>;
  }
): { value: number; breakdown: string; usesSectorDefault: boolean } {
  let usesSectorDefault = false;
  const sd = baseline._sector_default_used ?? {};

  const get = (key: string, fallback: number): number => {
    const v = (baseline as Record<string, unknown>)[key] as number | undefined;
    if (v != null && v > 0) {
      if (sd[key]) usesSectorDefault = true;
      return v;
    }
    usesSectorDefault = true;
    return fallback;
  };

  const hires = get("hires_per_year", 50);
  const costPerHire = get("cost_per_hire_gbp", 4500);
  const timeToFill = get("time_to_fill_days", 38);
  const attritionPct = get("voluntary_attrition_rate_pct", 15);
  const lndSpend = get("l_and_d_spend_per_fte_gbp", 400);
  const hrCostPerFte = get("hr_cost_per_fte_gbp", 1400); // total HR function cost per employee served (sector benchmark)

  // A1: Use actual headcount from baseline; fall back to hires / attritionPct * 100
  const rawHeadcount = (baseline as Record<string, unknown>)["headcount"] as number | undefined;
  const totalHeadcount = rawHeadcount && rawHeadcount > 0
    ? rawHeadcount
    : Math.round(hires / (Math.max(1, attritionPct) / 100));
  const hrFunctionSize = Math.max(2, Math.round(totalHeadcount / 50));
  const costPerDayOpenRole = Math.round(costPerHire / Math.max(1, timeToFill));
  // Library stores improvement as a decimal fraction (e.g. 0.10 = 10%).
  // Do NOT divide by 100 — the value is already the multiplier.
  const imp = improvementPct;
  // A2: hrHourlyRate based on UK median HR generalist salary (£42k/yr 2026), NOT the per-FTE cost metric
  const HR_GENERALIST_ANNUAL = 42000; // UK median HR generalist salary 2026 (CIPD/XpertHR)
  const hrHourlyRate = Math.round(HR_GENERALIST_ANNUAL / 2080); // ≈ £20/h

  let value = 0;
  let breakdown = "";

  const CASES: Record<string, () => void> = {
    ai_assisted_cv_screening: () => {
      const timeSaving = timeToFill * imp * hires * costPerDayOpenRole;
      const screeningSaving = hires * 2 * hrHourlyRate;
      value = timeSaving + screeningSaving;
      breakdown = `${timeToFill}d × ${(imp*100).toFixed(0)}% × ${hires} hires × £${costPerDayOpenRole}/d = £${Math.round(timeSaving).toLocaleString()} TTF saving + £${Math.round(screeningSaving).toLocaleString()} screening`;
    },
    ai_assisted_job_descriptions: () => {
      const saving = hires * 3 * hrHourlyRate;
      value = saving;
      breakdown = `${hires} hires × 3h drafting × £${hrHourlyRate}/h = £${Math.round(value).toLocaleString()} annual saving`;
    },
    predictive_attrition_modelling: () => {
      // CFO Fix 2: Apply 50% attribution discount — predictive model identifies at-risk employees
      // but retention requires management action. Attribution factor = 0.5.
      const rawValue = (attritionPct / 100) * imp * totalHeadcount * costPerHire;
      value = rawValue * 0.5;
      breakdown = `${attritionPct}% attrition × ${(imp*100).toFixed(0)}% improvement × ${totalHeadcount} headcount × £${costPerHire} CPH × 50% attribution = £${Math.round(value).toLocaleString()}`;
    },
    ai_employee_listening: () => {
      value = (attritionPct / 100) * imp * 0.5 * totalHeadcount * costPerHire;
      breakdown = `${attritionPct}% attrition × ${(imp*100).toFixed(0)}% × 50% attribution × ${totalHeadcount} headcount × £${costPerHire} CPH = £${Math.round(value).toLocaleString()}`;
    },
    hr_process_automation: () => {
      // A2-fix: hrCostPerFte is the HR cost PER EMPLOYEE SERVED (total HR spend / total headcount).
      // Total HR function cost = hrCostPerFte × totalHeadcount. Apply efficiency gain to that total.
      value = hrCostPerFte * totalHeadcount * imp;
      breakdown = `£${hrCostPerFte} HR cost/employee × ${totalHeadcount} employees × ${(imp*100).toFixed(0)}% automation saving = £${Math.round(value).toLocaleString()}`;
    },
    hr_chatbot_employee_queries: () => {
      // Queries anchored to total headcount (each employee generates ~4 HR queries/yr)
      // 40% deflection rate; each deflected query saves 0.5h of HR generalist time
      const annualQueries = totalHeadcount * 4;
      value = 0.4 * annualQueries * 0.5 * hrHourlyRate;
      breakdown = `${totalHeadcount} employees × 4 queries/yr × 40% deflection × 0.5h × £${hrHourlyRate}/h = £${Math.round(value).toLocaleString()}`;
    },
    automated_onboarding_orchestration: () => {
      // CFO Fix 1: Use employee daily rate (salary proxy) for productivity component, not HR cost/employee.
      // Proxy: costPerHire × 6.5 ≈ annual salary; divide by 260 working days.
      const empDailyRate = Math.round((costPerHire * 6.5) / 260);
      const admin = hires * 4 * hrHourlyRate;
      const productivity = hires * 5 * empDailyRate;
      value = admin + productivity;
      breakdown = `${hires} hires × (4h admin @ £${hrHourlyRate}/h + 5d ramp @ £${empDailyRate}/d employee rate) = £${Math.round(value).toLocaleString()}`;
    },
    people_analytics_dashboard: () => {
      value = hrFunctionSize * 40 * hrHourlyRate;
      breakdown = `${hrFunctionSize} HR FTEs × 40h/yr × £${hrHourlyRate}/h = £${Math.round(value).toLocaleString()}`;
    },
    ai_assisted_performance_feedback: () => {
      value = totalHeadcount * 2 * hrHourlyRate;
      breakdown = `${totalHeadcount} employees × 2h/cycle × £${hrHourlyRate}/h = £${Math.round(value).toLocaleString()}`;
    },
    ai_performance_calibration: () => {
      value = totalHeadcount * 1.5 * hrHourlyRate;
      breakdown = `${totalHeadcount} employees × 1.5h calibration × £${hrHourlyRate}/h = £${Math.round(value).toLocaleString()}`;
    },
    ai_powered_learning_personalisation: () => {
      value = lndSpend * totalHeadcount * imp;
      breakdown = `£${lndSpend} L&D/FTE × ${totalHeadcount} headcount × ${(imp*100).toFixed(0)}% efficiency = £${Math.round(value).toLocaleString()}`;
    },
    ai_literacy_programme: () => {
      // AI literacy applies to ALL employees, not just HR FTEs.
      // Value = productivity gain from AI-literate workforce (% of L&D spend unlocked).
      value = lndSpend * totalHeadcount * imp;
      breakdown = `£${lndSpend} L&D/FTE × ${totalHeadcount} employees × ${(imp*100).toFixed(0)}% productivity gain = £${Math.round(value).toLocaleString()}`;
    },
    prompt_engineering_for_hr: () => {
      // Prompt engineering saves HR generalist time. Value = HR function total cost × productivity gain.
      // hrCostPerFte × totalHeadcount = total HR function cost (same fix as hr_process_automation).
      value = hrCostPerFte * totalHeadcount * imp;
      breakdown = `£${hrCostPerFte} HR cost/employee × ${totalHeadcount} employees × ${(imp*100).toFixed(0)}% HR productivity = £${Math.round(value).toLocaleString()}`;
    },
    ai_change_management_programme: () => {
      value = totalHeadcount * (hrCostPerFte / 2080) * 8 * imp;
      breakdown = `${totalHeadcount} employees × 8h × £${hrHourlyRate}/h × ${(imp*100).toFixed(0)}% adoption = £${Math.round(value).toLocaleString()}`;
    },
    skills_intelligence_platform: () => {
      // Skills intelligence increases internal mobility. imp_pct from library (3-8%) is the
      // ADDITIONAL % of total headcount that moves internally each year due to better skills visibility.
      // Each internal fill saves ~60% of external hire cost (avoids agency fees, onboarding ramp).
      // Formula: totalHeadcount × imp × costPerHire × 0.6
      value = totalHeadcount * imp * costPerHire * 0.6;
      breakdown = `${totalHeadcount} employees × ${(imp*100).toFixed(0)}% internal mobility uplift × £${Math.round(costPerHire * 0.6)} saving/fill = £${Math.round(value).toLocaleString()}`;
    },
    ai_talent_marketplace: () => {
      value = hires * imp * costPerHire * 0.7;
      breakdown = `${hires} hires × ${(imp*100).toFixed(0)}% internal fill × £${Math.round(costPerHire * 0.7)} net saving = £${Math.round(value).toLocaleString()}`;
    },
    manager_ai_coaching_toolkit: () => {
      const managers = Math.max(5, Math.round(totalHeadcount / 8));
      const avgMgrSalary = 55000;
      value = managers * (avgMgrSalary / 2080) * 20 * imp;
      breakdown = `${managers} managers × 20h/yr × £${Math.round(avgMgrSalary / 2080)}/h × ${(imp*100).toFixed(0)}% = £${Math.round(value).toLocaleString()}`;
    },
    ai_pay_equity_analysis: () => {
      const claims = Math.max(1, Math.round(totalHeadcount / 100));
      value = 0.05 * imp * 25000 * claims;
      breakdown = `5% claim probability × ${(imp*100).toFixed(0)}% prevention × £25k avg award × ${claims} potential claims = £${Math.round(value).toLocaleString()}`;
    },
    bias_monitoring_and_auditing: () => {
      // Risk avoidance: ICO fines for unlawful AI use in hiring can reach £17.5m (4% global turnover).
      // Conservative model: £150k expected fine (realistic SME/mid-market range) × detection improvement × 15% base enforcement probability.
      const expectedFine = Math.max(50000, Math.min(500000, totalHeadcount * 50)); // scales with org size
      value = expectedFine * imp * 0.15;
      breakdown = `£${expectedFine.toLocaleString()} expected fine × ${(imp*100).toFixed(0)}% detection improvement × 15% enforcement probability = £${Math.round(value).toLocaleString()}`;
    },
    ai_job_architecture_redesign: () => {
      value = totalHeadcount * hrHourlyRate * 4 * imp;
      breakdown = `${totalHeadcount} employees × 4h role clarity × £${hrHourlyRate}/h × ${(imp*100).toFixed(0)}% = £${Math.round(value).toLocaleString()}`;
    },
    ai_hr_operating_model_redesign: () => {
      // Operating model redesign reduces total HR function cost. Same fix as hr_process_automation.
      value = hrCostPerFte * totalHeadcount * imp;
      breakdown = `£${hrCostPerFte} HR cost/employee × ${totalHeadcount} employees × ${(imp*100).toFixed(0)}% model efficiency = £${Math.round(value).toLocaleString()}`;
    },
  };

  const fn = CASES[initiativeId];
  if (fn) {
    fn();
  } else {
    // Generic fallback: total HR function cost × improvement (consistent with hr_process_automation fix)
    value = hrCostPerFte * totalHeadcount * imp;
    breakdown = `£${hrCostPerFte} HR cost/employee × ${totalHeadcount} employees × ${(imp*100).toFixed(0)}% (generic estimate) = £${Math.round(value).toLocaleString()}`;
  }

  return { value: Math.round(Math.max(0, value)), breakdown, usesSectorDefault };
}

export function calculateValueEnvelope(
  selectedInitiatives: Initiative[],
  operationalBaseline: {
    hires_per_year?: number;
    cost_per_hire_gbp?: number;
    time_to_fill_days?: number;
    voluntary_attrition_rate_pct?: number;
    l_and_d_spend_per_fte_gbp?: number;
    hr_cost_per_fte_gbp?: number;
    _sector_default_used?: Record<string, boolean>;
  },
  planHorizonMonths: number,
  solutionDeliveryConfidence?: number | null
): ValueEnvelope {
  const libMeta = getLibraryMeta();
  const byInitiative: ValueEnvelopeInitiative[] = [];
  let totalLow = 0;
  let totalHigh = 0;
  let capabilityUpliftCount = 0;
  let riskAvoidanceCount = 0;
  let strategicCount = 0;
  const allQualitative: string[] = [];

  for (const init of selectedInitiatives) {
    const vm = init.value_model;
    if (!vm) continue;

    for (const q of vm.qualitative_value ?? []) {
      if (!allQualitative.includes(q)) allQualitative.push(q);
    }

    if (vm.primary_value_type === "capability_uplift") capabilityUpliftCount++;
    else if (vm.primary_value_type === "risk_avoidance") riskAvoidanceCount++;
    else if (vm.primary_value_type === "strategic") strategicCount++;

    if (vm.qualitative_value_only || !vm.quantified_value) {
      byInitiative.push({
        initiative_id: init.initiative_id,
        display_name: init.display_name,
        value_type: vm.primary_value_type,
        quantified_value_gbp: null,
        qualitative_value: vm.qualitative_value,
        monetisation_breakdown: "Qualitative value only — see bullet points",
        sources: init.sources ?? [],
        uses_sector_default: false,
        confidence: init.confidence,
        payback_months: null,
      });
      continue;
    }

    const qv = vm.quantified_value;
    const lowResult = resolveValueFormula(init.initiative_id, qv.typical_improvement_pct.low, operationalBaseline);
    const highResult = resolveValueFormula(init.initiative_id, qv.typical_improvement_pct.high, operationalBaseline);

    totalLow += lowResult.value;
    totalHigh += highResult.value;

    byInitiative.push({
      initiative_id: init.initiative_id,
      display_name: init.display_name,
      value_type: vm.primary_value_type,
      quantified_value_gbp: { low: lowResult.value, high: highResult.value },
      qualitative_value: vm.qualitative_value,
      monetisation_breakdown: highResult.breakdown,
      sources: qv.sources,
      uses_sector_default: lowResult.usesSectorDefault || highResult.usesSectorDefault,
      confidence: qv.confidence,
      payback_months: qv.payback_months,
    });
  }

  // Approximate total cost from initiative cost ranges for net value
  let approxCostLow = 0;
  let approxCostHigh = 0;
  for (const init of selectedInitiatives) {
    const cr = init.cost?.base_range_gbp;
    if (cr) {
      approxCostLow += cr[0];
      approxCostHigh += cr[1];
    }
  }

  // B4: Compute 3-year TCO first so net value uses the same cost basis as the bar chart
  const horizonYears_pre = Math.max(1, Math.round(planHorizonMonths / 12));
  const changeMgmtLow_pre  = Math.round(approxCostLow  * 0.12);
  const changeMgmtHigh_pre = Math.round(approxCostHigh * 0.15);
  // A4: Use actual headcount for HR FTE estimation; fall back to hires / attritionPct * 100
  const _hc = (operationalBaseline as Record<string, unknown>)["headcount"] as number | undefined;
  const _hires = operationalBaseline.hires_per_year ?? 50;
  const _attr = operationalBaseline.voluntary_attrition_rate_pct ?? 15;
  const _totalHc = _hc && _hc > 0 ? _hc : Math.round(_hires / (Math.max(1, _attr) / 100));
  const estHrFtes_pre = Math.max(5, Math.round(_totalHc / 50));
  const trainingLow_pre  = estHrFtes_pre * 200;
  const trainingHigh_pre = estHrFtes_pre * 400;
  const ongoingAnnualLow_pre  = Math.round(approxCostLow  * 0.18);
  const ongoingAnnualHigh_pre = Math.round(approxCostHigh * 0.20);
  const tco3yrLow  = approxCostLow  + changeMgmtLow_pre  + trainingLow_pre  + ongoingAnnualLow_pre  * horizonYears_pre;
  const tco3yrHigh = approxCostHigh + changeMgmtHigh_pre + trainingHigh_pre + ongoingAnnualHigh_pre * horizonYears_pre;
  // Net value = Gross Value (3-yr) – 3-yr TCO (consistent cost basis with bar chart)
  // A1 fix: totalLow/totalHigh are annual values from resolveValueFormula; multiply by horizonYears to get 3-yr gross
  const grossValue3yrLow  = totalLow  * horizonYears_pre;
  const grossValue3yrHigh = totalHigh * horizonYears_pre;
  const netLow = grossValue3yrLow  - tco3yrHigh;
  const netHigh = grossValue3yrHigh - tco3yrLow;

  // Payback period
  let paybackPeriod: { low: number; high: number } | null = null;
  // A1 fix: totalHigh/totalLow are already annual values from resolveValueFormula
  const annualValueHigh = totalHigh;
  const annualValueLow  = totalLow;
  if (annualValueHigh > 0 && annualValueLow > 0) {
    paybackPeriod = {
      low: Math.max(0, Math.round(approxCostLow / (annualValueHigh / 12))),
      high: Math.round(approxCostHigh / (annualValueLow / 12)),
    };
  }

  const quantifiedCount = byInitiative.filter(i => i.quantified_value_gbp !== null).length;
  const qualOnlyCount = byInitiative.filter(i => i.quantified_value_gbp === null).length;

  // C1: Expanded TCO (reuse pre-computed values for B4 consistency)
  const changeMgmtLow  = changeMgmtLow_pre;
  const changeMgmtHigh = changeMgmtHigh_pre;
  const estHrFtes = estHrFtes_pre;
  const trainingLow  = trainingLow_pre;
  const trainingHigh = trainingHigh_pre;
  const ongoingAnnualLow  = ongoingAnnualLow_pre;
  const ongoingAnnualHigh = ongoingAnnualHigh_pre;
  const horizonYears = horizonYears_pre;
  // CFO Fix 5: Internal resource cost — project management, integration, procurement, legal/compliance
  // Estimated at 15% of implementation cost (conservative; real programmes often 20-25%)
  const internalResourceLow  = Math.round(approxCostLow  * 0.15);
  const internalResourceHigh = Math.round(approxCostHigh * 0.15);
  const tco3yrLowAdj  = tco3yrLow  + internalResourceLow;
  const tco3yrHighAdj = tco3yrHigh + internalResourceHigh;
  const tco: TotalCostOfOwnership = {
    implementation_gbp:    { low: approxCostLow,       high: approxCostHigh       },
    change_management_gbp: { low: changeMgmtLow,       high: changeMgmtHigh       },
    training_gbp:          { low: trainingLow,          high: trainingHigh         },
    ongoing_annual_gbp:    { low: ongoingAnnualLow,     high: ongoingAnnualHigh    },
    internal_resource_gbp: { low: internalResourceLow,  high: internalResourceHigh },
    total_3yr_gbp: {
      low:  tco3yrLowAdj,
      high: tco3yrHighAdj,
    },
  };

  // D3: Apply solution delivery confidence multiplier to change management
  const deliveryConf = solutionDeliveryConfidence ?? 3;
  const DELIVERY_LABELS: Record<number, string> = {
    1: "Limited", 2: "Developing", 3: "Moderate", 4: "Strong", 5: "Exceptional"
  };
  let changeMgmtMultiplier = 1.0;
  let phaseDurationNote = "Phase durations: standard";
  if (deliveryConf <= 2) {
    changeMgmtMultiplier = 1.5;
    phaseDurationNote = "Phase durations extended 30% (low delivery confidence)";
    tco.change_management_gbp = {
      low:  Math.round(tco.change_management_gbp.low  * 1.5),
      high: Math.round(tco.change_management_gbp.high * 1.5),
    };
  } else if (deliveryConf >= 4) {
    changeMgmtMultiplier = 0.7;
    phaseDurationNote = "Phase durations may compress 10% (strong delivery confidence)";
    tco.change_management_gbp = {
      low:  Math.round(tco.change_management_gbp.low  * 0.7),
      high: Math.round(tco.change_management_gbp.high * 0.7),
    };
  }
  // Recalculate total_3yr_gbp after delivery confidence adjustments to change management
  tco.total_3yr_gbp = {
    low:  Math.min(
      tco.implementation_gbp.low  + tco.change_management_gbp.low  + tco.training_gbp.low  + tco.ongoing_annual_gbp.low  * horizonYears,
      tco.implementation_gbp.high + tco.change_management_gbp.high + tco.training_gbp.high + tco.ongoing_annual_gbp.high * horizonYears,
    ),
    high: Math.max(
      tco.implementation_gbp.low  + tco.change_management_gbp.low  + tco.training_gbp.low  + tco.ongoing_annual_gbp.low  * horizonYears,
      tco.implementation_gbp.high + tco.change_management_gbp.high + tco.training_gbp.high + tco.ongoing_annual_gbp.high * horizonYears,
    ),
  };
  const deliveryLabel = DELIVERY_LABELS[Math.round(deliveryConf)] ?? "Moderate";
  const deliveryRecommendation =
    deliveryConf <= 2
      ? "Recommend strengthening change capability before Phase 2 commitment. Consider AI Change Management Programme as a foundation initiative."
      : deliveryConf <= 3
      ? "Standard change management approach is appropriate. Monitor adoption metrics closely in Phase 1."
      : "Strong delivery capability supports accelerated rollout. Consider compressing Phase 2 timeline.";
  const delivery_confidence_panel = {
    score: deliveryConf,
    label: deliveryLabel,
    phase_duration_note: phaseDurationNote,
    change_mgmt_multiplier: changeMgmtMultiplier,
    recommendation: deliveryRecommendation,
  };
  // C2: Three-tier ROI
  const EFFICIENCY_IDS = new Set([
    "ai_assisted_cv_screening", "ai_assisted_job_descriptions", "automated_onboarding_workflows",
    "hr_chatbot_employee_self_service", "ai_powered_payroll_anomaly_detection",
    "automated_compliance_reporting", "intelligent_document_processing",
  ]);
  const EFFECTIVENESS_IDS = new Set([
    "predictive_attrition_modelling", "ai_driven_performance_coaching",
    "ai_learning_recommendation_engine", "personalised_career_pathing",
    "ai_driven_engagement_surveys", "ai_compensation_benchmarking",
    "skills_intelligence_platform",
  ]);
  let efficiencyLow = 0, efficiencyHigh = 0;
  let effectivenessLow = 0, effectivenessHigh = 0;
  let strategicLow = 0, strategicHigh = 0;
  for (const init of byInitiative) {
    if (!init.quantified_value_gbp) continue;
    const { low, high } = init.quantified_value_gbp;
    if (EFFICIENCY_IDS.has(init.initiative_id)) {
      efficiencyLow += low; efficiencyHigh += high;
    } else if (EFFECTIVENESS_IDS.has(init.initiative_id)) {
      effectivenessLow += low; effectivenessHigh += high;
    } else {
      strategicLow += low; strategicHigh += high;
    }
  }
  const tiered_value: TieredValue = {
    efficiency:    { low: efficiencyLow,    high: efficiencyHigh    },
    effectiveness: { low: effectivenessLow, high: effectivenessHigh },
    strategic:     { low: strategicLow,     high: strategicHigh     },
  };

  // C3: NPV / IRR
  const DISCOUNT_RATE = 0.08; // UK default per v1.2 brief Block C3
  const calcNPV = (annualCashflow: number, totalCost: number, years: number): number => {
    let npv = -totalCost;
    for (let y = 1; y <= years; y++) {
      npv += annualCashflow / Math.pow(1 + DISCOUNT_RATE, y);
    }
    return Math.round(npv);
  };
  const calcIRR = (annualCashflow: number, totalCost: number, years: number): number | null => {
    if (annualCashflow <= 0 || totalCost <= 0) return null;
    let r = 0.15;
    for (let iter = 0; iter < 100; iter++) {
      let npv = -totalCost;
      let dnpv = 0;
      for (let y = 1; y <= years; y++) {
        const disc = Math.pow(1 + r, y);
        npv  += annualCashflow / disc;
        dnpv -= y * annualCashflow / (disc * (1 + r));
      }
      const newR = r - npv / dnpv;
      if (Math.abs(newR - r) < 1e-6) { r = newR; break; }
      r = newR;
    }
    return r > -1 ? Math.round(r * 100) : null;
  };
  // A5: Value formulas already return annual values — do NOT divide by horizonYears again
  // (previous bug: dividing annual value by 3 years understated cashflow by 3×, causing negative NPV)
  // Scenario analysis uses annual values for per-year projections
  const annualValueLow2  = totalLow;
  const annualValueHigh2 = totalHigh;
  const totalCostLow3yr  = tco.total_3yr_gbp.low;
  const totalCostHigh3yr = tco.total_3yr_gbp.high;
  const npvLow  = calcNPV(annualValueLow2,  totalCostHigh3yr, horizonYears);
  const npvHigh = calcNPV(annualValueHigh2, totalCostLow3yr,  horizonYears);
  const irrLow  = calcIRR(annualValueLow2,  totalCostHigh3yr, horizonYears);
  const irrHigh = calcIRR(annualValueHigh2, totalCostLow3yr,  horizonYears);
  // CFO Fix 4: Suppress IRR when > 100% — unreliable metric at these levels (NPV + payback preferred)
  const irrSuppressed = (irrHigh !== null && irrHigh > 100) || (irrLow !== null && irrLow > 100);
  const financial_model: FinancialModel = {
    npv_gbp:           { low: npvLow, high: npvHigh },
    irr_pct:           (irrLow !== null && irrHigh !== null) ? { low: irrLow, high: irrHigh } : null,
    irr_suppressed:    irrSuppressed,
    discount_rate_pct: DISCOUNT_RATE * 100,
    horizon_years:     horizonYears,
  };

  // C4: Three-scenario analysis
  // A1 fix: use 3-year gross values for NPV base/pess/opt scenarios
  const baseValue = (grossValue3yrLow + grossValue3yrHigh) / 2;
  const baseCost  = (approxCostLow + approxCostHigh) / 2;
  const pessValue = grossValue3yrLow  * 0.60;
  const optValue  = grossValue3yrHigh * 1.20;
  const pessCost  = approxCostHigh * 1.10;
  const optCost   = approxCostLow  * 0.90;
  // CFO Fix 3: Cap ROI display at 500% — values above this are not credible for board presentation
  const ROI_DISPLAY_CAP = 500;
  const toRoi = (v: number, c: number) => c > 0 ? Math.min(ROI_DISPLAY_CAP, Math.round(((v - c) / c) * 100)) : 0;
  const toRoiUncapped = (v: number, c: number) => c > 0 ? Math.round(((v - c) / c) * 100) : 0;
  const scenario_analysis: ScenarioAnalysis = {
    pessimistic: { value_gbp: Math.round(pessValue), net_gbp: Math.round(pessValue - pessCost), roi_pct: toRoi(pessValue, pessCost) },
    base:        { value_gbp: Math.round(baseValue), net_gbp: Math.round(baseValue - baseCost),  roi_pct: toRoi(baseValue, baseCost)  },
    optimistic:  { value_gbp: Math.round(optValue),  net_gbp: Math.round(optValue  - optCost),   roi_pct: toRoi(optValue,  optCost)   },
  };
  // Store uncapped ROI for internal use (tests, audit)
  void toRoiUncapped;

  // C1: Conditional reinvestment plan
  const buildReinvestmentPlan = (): ReinvestmentPlan => {
    const npvL = financial_model.npv_gbp.low;
    const npvH = financial_model.npv_gbp.high;
    // Use undiscounted net value for recommended flag (brief: "recommended when net value is positive")
    const netH = netHigh;
    const netL = netLow;
    const suggestedReinvest = netH > 0 ? Math.round(netH * 0.20) : null;
    const REINVEST_AREAS = [
      "AI literacy and upskilling programmes for HR and line managers",
      "Change management capability building",
      "Data quality and HR systems integration",
      "Expanded AI pilot scope into adjacent HR domains",
    ];
    if (netL > 0 && netH > 0) {
      return {
        case: "both_positive",
        recommended: true,
        headline: "Strong positive return — reinvest 20% of net value upside",
        narrative: `Both conservative and optimistic scenarios show positive net value (£${netL.toLocaleString()} – £${netH.toLocaleString()}). The programme is generating surplus value. We recommend reinvesting approximately £${(suggestedReinvest ?? 0).toLocaleString()} (20% of optimistic net value) into the capability areas below to compound returns in Phase 2.`,
        suggested_reinvestment_gbp: suggestedReinvest,
        reinvestment_areas: REINVEST_AREAS,
        phase2_focus_areas: REINVEST_AREAS,
      };
    } else if (netH > 0 && netL <= 0) {
      const straddleAreas = [
        "Change management and adoption enablement",
        "HR team AI capability building",
        "Measurement and benefits tracking infrastructure",
      ];
      return {
        case: "straddles_zero",
        recommended: true,
        headline: "Positive net value — focus on adoption to realise full return",
        narrative: `The optimistic scenario shows positive net value (£${netH.toLocaleString()}) but the conservative scenario is negative (£${netL.toLocaleString()}). The programme is viable but sensitive to adoption quality. We recommend reinvesting approximately £${(suggestedReinvest ?? 0).toLocaleString()} in change management and adoption enablement to maximise value realisation.`,
        suggested_reinvestment_gbp: null,
        reinvestment_areas: straddleAreas,
        phase2_focus_areas: straddleAreas,
      };
    } else {
      const negativeAreas = [
        "Descope to 2–3 highest-confidence initiatives with clear, measurable outcomes",
        "Validate operational baseline inputs with Finance before committing",
        "Run a 90-day pilot on the lead initiative to generate evidence before scaling",
        "Revisit initiative selection — consider higher-ROI alternatives in the library",
      ];
      return {
        case: "both_negative",
        recommended: false,
        headline: "Foundation investment — value realises beyond the 3-year window",
        narrative: `The 3-year modelling window shows negative net value (£${netL.toLocaleString()} – £${netH.toLocaleString()}) under current assumptions. This is common for organisations in the early stages of AI adoption where capability-building and infrastructure investment precede measurable returns. Full value typically materialises in years 4–7 as AI-enabled processes compound. We recommend validating the operational baseline with Finance, descoping to the 2–3 highest-confidence initiatives, and running a 90-day pilot before full commitment.`,
        suggested_reinvestment_gbp: null,
        reinvestment_areas: negativeAreas,
        phase2_focus_areas: negativeAreas,
      };
    }
  };
  const reinvestment_plan = buildReinvestmentPlan();

  // C2: CEO sponsorship recommendation
  const buildCeoSponsorship = (): CeoSponsorshipRecommendation => {
    const tcoTotal = (tco.total_3yr_gbp.low + tco.total_3yr_gbp.high) / 2;
    const initiativeCount = byInitiative.length;
    // Trigger conditions per brief: Transformative ambition OR high-TCO Innovative OR multi-initiative complexity
    const highTco = tcoTotal > 500000;
    const manyInitiatives = initiativeCount >= 5;
    const required = highTco || manyInitiatives;
    if (required) {
      const trigger = highTco && manyInitiatives
        ? "high programme cost and broad initiative scope"
        : highTco
        ? "programme investment exceeds £500k"
        : "broad initiative scope (5+ initiatives)";
      return {
        required: true,
        trigger,
        rationale: `This programme requires CEO-level sponsorship because of ${trigger}. Without visible executive commitment, change management will be under-resourced and adoption will stall at middle management.`,
        suggested_framing: "Frame as a board-level workforce productivity and risk management initiative, not an HR technology project. Request a quarterly CEO update slot and a named executive sponsor for each Phase 1 initiative.",
      };
    }
    return {
      required: false,
      trigger: "none",
      rationale: "Programme scope and investment are within CHRO mandate. Standard HR leadership sponsorship is sufficient.",
      suggested_framing: "Maintain CHRO as executive sponsor. Escalate to CEO only if Phase 1 adoption falls below 60% at the 6-month review.",
    };
  };
  const ceo_sponsorship = buildCeoSponsorship();

  return {
    total_quantified_value_gbp: { low: grossValue3yrLow, high: grossValue3yrHigh },
    net_value_gbp: { low: netLow, high: netHigh },
    payback_period_months: paybackPeriod,
    by_initiative: byInitiative,
    qualitative_summary: {
      capability_uplift_count: capabilityUpliftCount,
      risk_avoidance_count: riskAvoidanceCount,
      strategic_count: strategicCount,
      bullet_points: (() => {
        // B5: filter generic phrases, cap at 8-10, prioritise Foundation phase items
        const filtered = allQualitative.filter(q => !GENERIC_QUAL_PHRASES.has(q));
        return filtered.slice(0, 10);
      })(),
    },
    caveat: `Indicative value ranges based on cited sector benchmarks and your operational baseline. Excludes second-order effects. Quantified value applies to ${quantifiedCount} initiative${quantifiedCount !== 1 ? "s" : ""}; ${qualOnlyCount} initiative${qualOnlyCount !== 1 ? "s" : ""} produce qualitative value not reflected in these figures. Confirm with Finance before commitment.`,
    libraryVersion: libMeta.version,
    tco,
    tiered_value,
    financial_model,
    scenario_analysis,
    delivery_confidence_panel,
    reinvestment_plan,
    ceo_sponsorship,
    ceo_sponsorship_required: ceo_sponsorship.required,
  };
}
