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
];

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
  businessAmbitionLabel: string;
  peopleAmbitionLabel: string;
  aspirationAnswers: Record<string, string>;
  hrRoleAnswers: Record<string, string>;
  maxAttempts?: number;
}): Promise<VisionResult> {
  const { sector, businessAmbitionLabel, peopleAmbitionLabel, aspirationAnswers, hrRoleAnswers, maxAttempts = 3 } = params;
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

  const userPrompt = `Generate a board-ready HR AI strategy vision for:
Sector: ${sector}
Business AI Ambition: ${businessAmbitionLabel}
People AI Ambition: ${peopleAmbitionLabel}
Content Library Version: ${libMeta.version}

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
        displayName: "AI Centre of Excellence Without Scale Foundation",
        riskStatement: "An AI Centre of Excellence is planned but fewer than 3 Scale-phase initiatives are in scope. A CoE without a programme to govern is a cost centre, not a capability. It will struggle to justify its existence and will likely be defunded.",
        severity: "medium",
        recommendedAction: "Either add more Scale-phase initiatives to give the CoE a meaningful governance mandate, or defer the CoE to Optimise phase once the programme has proven value.",
        regulatoryBasis: [],
        sources: ["Deloitte Workforce AI 2025", "Lumi Design Partners 2025"],
      });
    }
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
