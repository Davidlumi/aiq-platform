/**
 * Capability Report
 * Synthesises all AIL subsystems into a coherent narrative capability report.
 * Uses LLM to generate personalised narrative sections.
 */

import { getDb } from "../db";
import { eq, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import {
  ailSignalLedger,
  ailFailureModeRegistry,
  ailPersonaProfiles,
  ailNarrativeState,
  ailNarrativeThreads,
  ailUserIntelligenceProfiles,
} from "../../drizzle/schema";
import { getPersonaProfile } from "./personaClassificationEngine";
import { getPersonaLabel } from "../assessment/featureFlags";
import { getOrganisationalClimate } from "./emotionalDynamicsLayer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CapabilityScore {
  domain: string;
  label: string;
  score: number;           // 0-100
  trend: "improving" | "stable" | "declining";
  observationCount: number;
  keyStrengths: string[];
  keyRisks: string[];
}

export interface CapabilityReport {
  generatedAt: Date;
  totalSimulationsCompleted: number;
  totalAssessmentsCompleted: number;
  // Executive summary (LLM-generated)
  executiveSummary: string;
  // Capability scores by domain
  capabilityScores: CapabilityScore[];
  // Persona
  persona: {
    type: string;
    label: string;
    confidence: number;
    narrative: string;
    dimensions: {
      validationOrientation: number;
      governanceOrientation: number;
      riskOrientation: number;
      communicationOrientation: number;
    };
  };
  // Persistent strengths (LLM-generated)
  persistentStrengths: string[];
  // Persistent risks (LLM-generated)
  persistentRisks: string[];
  // Pressure sensitivity profile
  pressureSensitivity: {
    ceoPresure: string;
    cfoPressure: string;
    timePressure: string;
    legalPressure: string;
  };
  // Narrative history summary
  narrativeHistory: {
    legalRiskLevel: string;
    employeeRelationsScore: number;
    regulatoryStandingScore: number;
    csuiteConfidenceInHr: number;
    activeThreads: string[];
  };
  // Development recommendations (LLM-generated)
  developmentRecommendations: string[];
  // Organisational climate
  organisationalClimate: {
    overallTone: string;
    hrCredibility: string;
    description: string;
  };
}

// ─── Signal → Capability Domain Mapping ──────────────────────────────────────

const SIGNAL_TO_CAPABILITY: Record<string, { domain: string; label: string; isPositive: boolean }> = {
  // AI Interaction
  prompt_construction_quality:    { domain: "ai_interaction", label: "AI Interaction", isPositive: true },
  prompt_iteration_quality:       { domain: "ai_interaction", label: "AI Interaction", isPositive: true },
  output_direction_skill:         { domain: "ai_interaction", label: "AI Interaction", isPositive: true },
  tool_fluency_index:             { domain: "ai_interaction", label: "AI Interaction", isPositive: true },
  // AI Output Evaluation
  output_evaluation_quality:      { domain: "ai_output_evaluation", label: "AI Output Evaluation", isPositive: true },
  error_detection_accuracy:       { domain: "ai_output_evaluation", label: "AI Output Evaluation", isPositive: true },
  fitness_for_purpose_judgement:   { domain: "ai_output_evaluation", label: "AI Output Evaluation", isPositive: true },
  blind_acceptance_risk:           { domain: "ai_output_evaluation", label: "AI Output Evaluation", isPositive: false },
  hallucination_acceptance_risk:   { domain: "ai_output_evaluation", label: "AI Output Evaluation", isPositive: false },
  bias_detection_skill:            { domain: "ai_output_evaluation", label: "AI Output Evaluation", isPositive: true },
  data_interpretation_quality:     { domain: "ai_output_evaluation", label: "AI Output Evaluation", isPositive: true },
  // AI Workflow Design
  workflow_redesign_quality:       { domain: "ai_workflow_design", label: "AI Workflow Design", isPositive: true },
  handoff_design_quality:          { domain: "ai_workflow_design", label: "AI Workflow Design", isPositive: true },
  human_oversight_preservation:    { domain: "ai_workflow_design", label: "AI Workflow Design", isPositive: true },
  automation_expansion_risk:       { domain: "ai_workflow_design", label: "AI Workflow Design", isPositive: false },
  // Workforce AI Readiness
  capability_diagnosis_accuracy:   { domain: "workforce_ai_readiness", label: "Workforce AI Readiness", isPositive: true },
  intervention_design_quality:     { domain: "workforce_ai_readiness", label: "Workforce AI Readiness", isPositive: true },
  leader_advisory_quality:         { domain: "workforce_ai_readiness", label: "Workforce AI Readiness", isPositive: true },
  generic_prescription_risk:       { domain: "workforce_ai_readiness", label: "Workforce AI Readiness", isPositive: false },
  // AI Ethics & Trust
  ethics_under_pressure:           { domain: "ai_ethics_trust", label: "AI Ethics & Trust", isPositive: true },
  stakeholder_impact_awareness:    { domain: "ai_ethics_trust", label: "AI Ethics & Trust", isPositive: true },
  employee_transparency_advocacy:  { domain: "ai_ethics_trust", label: "AI Ethics & Trust", isPositive: true },
  pressure_drift_risk:             { domain: "ai_ethics_trust", label: "AI Ethics & Trust", isPositive: false },
  legal_vs_fair_distinction:       { domain: "ai_ethics_trust", label: "AI Ethics & Trust", isPositive: true },
  // AI Change Leadership
  resistance_response_quality:     { domain: "ai_change_leadership", label: "AI Change Leadership", isPositive: true },
  legitimate_concern_recognition:  { domain: "ai_change_leadership", label: "AI Change Leadership", isPositive: true },
  change_pace_calibration:         { domain: "ai_change_leadership", label: "AI Change Leadership", isPositive: true },
  dismissive_of_concern_risk:      { domain: "ai_change_leadership", label: "AI Change Leadership", isPositive: false },
};

const DOMAIN_LABELS: Record<string, string> = {
  ai_interaction: "AI Interaction",
  ai_output_evaluation: "AI Output Evaluation",
  ai_workflow_design: "AI Workflow Design",
  workforce_ai_readiness: "Workforce AI Readiness",
  ai_ethics_trust: "AI Ethics & Trust",
  ai_change_leadership: "AI Change Leadership",
};

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Generate a full capability report for a user.
 */
export async function generateCapabilityReport(
  userId: string,
  tenantId: string
): Promise<CapabilityReport | null> {
  const db = await getDb();
  if (!db) return null;

  // Gather all data
  const [uip, signals, failureModes, personaProfile, narrativeState, threads, orgClimate] =
    await Promise.all([
      db.select().from(ailUserIntelligenceProfiles)
        .where(eq(ailUserIntelligenceProfiles.userId, userId)).limit(1),
      db.select().from(ailSignalLedger).where(eq(ailSignalLedger.userId, userId)),
      db.select().from(ailFailureModeRegistry).where(eq(ailFailureModeRegistry.userId, userId)),
      getPersonaProfile(userId),
      db.select().from(ailNarrativeState).where(eq(ailNarrativeState.userId, userId)).limit(1),
      db.select().from(ailNarrativeThreads).where(eq(ailNarrativeThreads.userId, userId)),
      getOrganisationalClimate(userId),
    ]);

  if (!uip[0]) return null;

  // ── 1. Compute capability scores by domain ─────────────────────────────────
  const domainAccumulators: Record<string, {
    positiveTotal: number;
    negativeTotal: number;
    observationCount: number;
    trends: Array<"improving" | "stable" | "declining">;
  }> = {};

  for (const signal of signals) {
    const mapping = SIGNAL_TO_CAPABILITY[signal.signalName];
    if (!mapping) continue;

    if (!domainAccumulators[mapping.domain]) {
      domainAccumulators[mapping.domain] = {
        positiveTotal: 0, negativeTotal: 0, observationCount: 0, trends: [],
      };
    }

    const avg = parseFloat(String(signal.averageScore));
    if (mapping.isPositive) {
      domainAccumulators[mapping.domain].positiveTotal += avg;
    } else {
      domainAccumulators[mapping.domain].negativeTotal += Math.abs(avg);
    }
    domainAccumulators[mapping.domain].observationCount += signal.observationCount;
    domainAccumulators[mapping.domain].trends.push(signal.trend as "improving" | "stable" | "declining");
  }

  const capabilityScores: CapabilityScore[] = Object.entries(domainAccumulators).map(([domain, acc]) => {
    // Score: positive signals boost, negative signals reduce, normalised to 0-100
    const rawScore = (acc.positiveTotal - acc.negativeTotal);
    const score = Math.max(0, Math.min(100, 50 + rawScore * 10));

    // Dominant trend
    const trendCounts = { improving: 0, stable: 0, declining: 0 };
    for (const t of acc.trends) trendCounts[t]++;
    const trend = Object.entries(trendCounts).sort((a, b) => b[1] - a[1])[0][0] as "improving" | "stable" | "declining";

    // Key strengths and risks from failure modes
    const domainFailures = failureModes.filter(f =>
      SIGNAL_TO_CAPABILITY[f.failureMode]?.domain === domain
    );

    return {
      domain,
      label: DOMAIN_LABELS[domain] ?? domain,
      score: Math.round(score),
      trend,
      observationCount: acc.observationCount,
      keyStrengths: score >= 60 ? [`Strong performance in ${DOMAIN_LABELS[domain] ?? domain}`] : [],
      keyRisks: domainFailures.filter(f => f.patternFlagged).map(f =>
        `Persistent pattern: ${f.failureMode.replace(/_/g, " ")}`
      ),
    };
  });

  // ── 2. Build persona section ─────────────────────────────────────────────────────
  // WS4.1: Use softened participant-facing labels via feature flag
  const persona = {
    type: personaProfile?.primaryPersona ?? "unclassified",
    label: getPersonaLabel(personaProfile?.primaryPersona ?? "unclassified"),
    confidence: parseFloat(String(personaProfile?.personaConfidence ?? "0")),
    narrative: personaProfile?.narrativeSummary ?? "",
    dimensions: {
      validationOrientation: parseFloat(String(personaProfile?.validationOrientation ?? "5")),
      governanceOrientation: parseFloat(String(personaProfile?.governanceOrientation ?? "5")),
      riskOrientation: parseFloat(String(personaProfile?.riskOrientation ?? "5")),
      communicationOrientation: parseFloat(String(personaProfile?.communicationOrientation ?? "5")),
    },
  };

  // ── 3. Build narrative history ─────────────────────────────────────────────
  const activeThreads = threads
    .filter(t => t.currentStatus === "active")
    .map(t => t.threadName);

  const narrativeHistory = {
    legalRiskLevel: narrativeState[0]?.legalRiskLevel ?? "low",
    employeeRelationsScore: narrativeState[0]?.employeeRelationsScore ?? 70,
    regulatoryStandingScore: narrativeState[0]?.regulatoryStandingScore ?? 80,
    csuiteConfidenceInHr: narrativeState[0]?.csuiteConfidenceInHr ?? 60,
    activeThreads,
  };

  // ── 4. Generate LLM narrative sections ────────────────────────────────────
  const [executiveSummary, persistentStrengths, persistentRisks, developmentRecommendations] =
    await generateNarrativeSections(
      uip[0].totalSimulationsCompleted,
      uip[0].totalAssessmentsCompleted,
      capabilityScores,
      persona,
      failureModes,
      narrativeHistory,
      orgClimate
    );

  // ── 5. Build pressure sensitivity profile ─────────────────────────────────
  const pressureSensitivity = buildPressureSensitivityProfile(personaProfile);

  return {
    generatedAt: new Date(),
    totalSimulationsCompleted: uip[0].totalSimulationsCompleted,
    totalAssessmentsCompleted: uip[0].totalAssessmentsCompleted,
    executiveSummary,
    capabilityScores,
    persona,
    persistentStrengths,
    persistentRisks,
    pressureSensitivity,
    narrativeHistory,
    developmentRecommendations,
    organisationalClimate: orgClimate,
  };
}

// ─── LLM Narrative Generation ─────────────────────────────────────────────────

async function generateNarrativeSections(
  totalSimulations: number,
  totalAssessments: number,
  capabilityScores: CapabilityScore[],
  persona: { type: string; label: string; narrative: string },
  failureModes: Array<{ failureMode: string; occurrenceCount: number; patternFlagged: boolean; severity: string }>,
  narrativeHistory: { legalRiskLevel: string; employeeRelationsScore: number; csuiteConfidenceInHr: number; activeThreads: string[] },
  orgClimate: { overallTone: string; hrCredibility: string; description: string }
): Promise<[string, string[], string[], string[]]> {
  const scoresSummary = capabilityScores
    .map(s => `${s.label}: ${s.score}/100 (${s.trend})`)
    .join(", ");

  const patternedFailures = failureModes
    .filter(f => f.patternFlagged)
    .map(f => f.failureMode.replace(/_/g, " "))
    .join(", ");

  const prompt = `You are an expert HR capability assessor. Generate a capability report for an HR professional who has completed ${totalSimulations} adaptive simulations and ${totalAssessments} assessments on the AiQ platform.

Profile data:
- Persona: ${persona.label}
- Capability scores: ${scoresSummary || "Insufficient data"}
- Persistent failure patterns: ${patternedFailures || "None identified"}
- Legal risk level: ${narrativeHistory.legalRiskLevel}
- C-suite confidence in HR: ${narrativeHistory.csuiteConfidenceInHr}/100
- Organisational climate: ${orgClimate.description}
- Active narrative threads: ${narrativeHistory.activeThreads.join(", ") || "None"}

Generate the following sections. Be specific, honest, and constructive. Use plain English. Do not use bullet points in the executive summary.

Return a JSON object with these exact keys:
{
  "executiveSummary": "3-4 sentence professional narrative summary",
  "persistentStrengths": ["strength 1", "strength 2", "strength 3"],
  "persistentRisks": ["risk 1", "risk 2", "risk 3"],
  "developmentRecommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "user" as const, content: prompt as string }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "capability_report_sections",
          strict: true,
          schema: {
            type: "object",
            properties: {
              executiveSummary: { type: "string" },
              persistentStrengths: { type: "array", items: { type: "string" } },
              persistentRisks: { type: "array", items: { type: "string" } },
              developmentRecommendations: { type: "array", items: { type: "string" } },
            },
            required: ["executiveSummary", "persistentStrengths", "persistentRisks", "developmentRecommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices?.[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : "{}";
    const parsed = JSON.parse(content);

    return [
      parsed.executiveSummary ?? "",
      parsed.persistentStrengths ?? [],
      parsed.persistentRisks ?? [],
      parsed.developmentRecommendations ?? [],
    ];
  } catch {
    return [
      `This HR professional has completed ${totalSimulations} simulations and ${totalAssessments} assessments. Their profile is developing.`,
      ["Engagement with the platform"],
      ["Insufficient data for pattern analysis"],
      ["Complete additional simulations to generate personalised recommendations"],
    ];
  }
}

function buildPressureSensitivityProfile(personaProfile: Awaited<ReturnType<typeof getPersonaProfile>>): {
  ceoPresure: string;
  cfoPressure: string;
  timePressure: string;
  legalPressure: string;
} {
  if (!personaProfile) {
    return {
      ceoPresure: "Not yet assessed",
      cfoPressure: "Not yet assessed",
      timePressure: "Not yet assessed",
      legalPressure: "Not yet assessed",
    };
  }

  const governanceBypass = personaProfile.governanceBypassPattern;
  const blindAcceptance = personaProfile.blindAcceptancePattern;
  const overCautious = personaProfile.overCautiousPattern;

  return {
    ceoPresure: governanceBypass
      ? "High sensitivity — governance positions have been compromised under CEO pressure"
      : "Moderate sensitivity — maintains position under most CEO pressure",
    cfoPressure: governanceBypass
      ? "High sensitivity — cost/speed arguments have overridden governance concerns"
      : "Moderate sensitivity — generally holds governance positions under financial pressure",
    timePressure: blindAcceptance
      ? "High sensitivity — time pressure correlates with reduced AI output validation"
      : overCautious
      ? "Low sensitivity — tends to escalate rather than decide under time pressure"
      : "Moderate sensitivity — decision quality is largely maintained under time pressure",
    legalPressure: overCautious
      ? "Responds well to legal framing — uses legal risk as a reason to escalate appropriately"
      : "Moderate — legal risk arguments are considered but do not always drive correct action",
  };
}
