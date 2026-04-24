/**
 * Gap Analysis Engine — AiQ Adaptive Learning (v10)
 *
 * Reads assessment capability scores and computes structured gaps
 * against role-level benchmarks. Classifies each capability into
 * severity bands and produces a prioritised remediation order.
 *
 * v10 Capability Domains:
 *   ai_interaction         — Foundation: prompting, iteration, tool fluency
 *   ai_output_evaluation   — Foundation: output quality, error detection, bias
 *   ai_workflow_design     — Operational: workflow redesign, handoff, oversight
 *   workforce_ai_readiness — Strategic: capability diagnosis, intervention design
 *   ai_ethics_trust        — Strategic: ethics under pressure, transparency, legal
 *   ai_change_leadership   — Strategic: resistance response, concern recognition, pace
 *
 * Severity bands (based on gap from benchmark):
 *   critical    — score < 50 OR gap > 25 points below benchmark
 *   developing  — gap 10–25 points below benchmark
 *   proficient  — gap < 10 points below benchmark (within range)
 *   advanced    — score >= benchmark + 5
 */

export type CapabilityKey =
  | "ai_interaction"
  | "ai_output_evaluation"
  | "ai_workflow_design"
  | "workforce_ai_readiness"
  | "ai_ethics_trust"
  | "ai_change_leadership";

export type GapSeverity = "critical" | "developing" | "proficient" | "advanced";

export interface CapabilityGap {
  capability: CapabilityKey;
  score: number;
  benchmark: number;
  gap: number;          // benchmark - score (positive = below benchmark)
  severity: GapSeverity;
  priority: number;     // 1 = highest priority
  label: string;        // human-readable capability name
  description: string;  // what this capability measures
  improvementTip: string;
}

export interface GapAnalysisResult {
  capabilityGaps: Record<CapabilityKey, CapabilityGap>;
  priorityOrder: CapabilityKey[];
  overallReadinessScore: number;
  readinessBand: "at_risk" | "developing" | "progressing" | "proficient" | "advanced";
  criticalCount: number;
  developingCount: number;
  proficientCount: number;
  advancedCount: number;
  topGap: CapabilityGap | null;
  recommendedFocusAreas: string[];
}

// ─── All v10 capability keys ──────────────────────────────────────────────────
const ALL_CAPABILITIES: CapabilityKey[] = [
  "ai_interaction",
  "ai_output_evaluation",
  "ai_workflow_design",
  "workforce_ai_readiness",
  "ai_ethics_trust",
  "ai_change_leadership",
];

// ─── Role-level benchmarks by seniority tier ─────────────────────────────────
const DEFAULT_BENCHMARK: Record<CapabilityKey, number> = {
  ai_interaction:         65,
  ai_output_evaluation:   65,
  ai_workflow_design:     60,
  workforce_ai_readiness: 55,
  ai_ethics_trust:        60,
  ai_change_leadership:   55,
};

const ROLE_BENCHMARKS: Record<string, Record<CapabilityKey, number>> = {
  junior: {
    ai_interaction:         55,
    ai_output_evaluation:   55,
    ai_workflow_design:     50,
    workforce_ai_readiness: 45,
    ai_ethics_trust:        50,
    ai_change_leadership:   45,
  },
  mid: DEFAULT_BENCHMARK,
  senior: {
    ai_interaction:         72,
    ai_output_evaluation:   72,
    ai_workflow_design:     68,
    workforce_ai_readiness: 65,
    ai_ethics_trust:        70,
    ai_change_leadership:   65,
  },
};

// ─── Capability metadata ──────────────────────────────────────────────────────
const CAPABILITY_META: Record<CapabilityKey, { label: string; description: string; improvementTip: string }> = {
  ai_interaction: {
    label: "AI Interaction",
    description: "Skill in constructing effective prompts, iterating on AI outputs, directing AI tools purposefully, and demonstrating fluency across different AI platforms.",
    improvementTip: "Practise structured prompting techniques — start with clear context, specify the format you need, and iterate systematically rather than accepting the first output.",
  },
  ai_output_evaluation: {
    label: "AI Output Evaluation",
    description: "Ability to critically evaluate AI-generated content for quality, accuracy, fitness for purpose, and potential biases — including detecting hallucinations and blind acceptance patterns.",
    improvementTip: "Before acting on any AI output, apply a 3-point check: Is it factually accurate? Is it fit for this specific purpose? Could it contain hidden bias or hallucinated content?",
  },
  ai_workflow_design: {
    label: "AI Workflow Design",
    description: "Proficiency in redesigning HR workflows to incorporate AI effectively, designing appropriate human-AI handoff points, and preserving human oversight where it matters most.",
    improvementTip: "Map your top 5 most time-consuming HR processes and identify which steps could be AI-assisted — then design explicit handoff points where human review is non-negotiable.",
  },
  workforce_ai_readiness: {
    label: "Workforce AI Readiness",
    description: "Capability in diagnosing team and organisational AI readiness, designing targeted interventions, advising leaders on AI adoption, and avoiding generic one-size-fits-all prescriptions.",
    improvementTip: "Conduct a skills audit of your team's current AI capabilities — identify specific gaps rather than assuming everyone needs the same training.",
  },
  ai_ethics_trust: {
    label: "AI Ethics & Employee Trust",
    description: "Skill in navigating ethical dilemmas involving AI in HR, maintaining employee trust and transparency, distinguishing legal compliance from genuine fairness, and resisting pressure to compromise ethical standards.",
    improvementTip: "Review your organisation's AI policy through the lens of employee trust — would your team feel comfortable if they knew exactly how AI was being used in decisions that affect them?",
  },
  ai_change_leadership: {
    label: "AI Change Leadership",
    description: "Ability to lead AI adoption initiatives, respond constructively to resistance, recognise legitimate concerns versus fear-based objections, and calibrate the pace of change to organisational readiness.",
    improvementTip: "When facing resistance to AI adoption, listen first — distinguish between legitimate concerns about job quality and fear-based objections, then address each differently.",
  },
};

// ─── Capability weights for overall readiness score ───────────────────────────
const CAPABILITY_WEIGHTS: Record<CapabilityKey, number> = {
  ai_interaction:         0.18,
  ai_output_evaluation:   0.18,
  ai_workflow_design:     0.17,
  workforce_ai_readiness: 0.16,
  ai_ethics_trust:        0.16,
  ai_change_leadership:   0.15,
};

// ─── Core Engine ──────────────────────────────────────────────────────────────
export function computeGapAnalysis(
  capabilityScores: Partial<Record<CapabilityKey, number>>,
  seniorityTier: string = "mid"
): GapAnalysisResult {
  const benchmarks = ROLE_BENCHMARKS[seniorityTier] ?? DEFAULT_BENCHMARK;

  const capabilityGaps: Record<CapabilityKey, CapabilityGap> = {} as any;
  for (const cap of ALL_CAPABILITIES) {
    const score = capabilityScores[cap] ?? 50;
    const benchmark = benchmarks[cap];
    const gap = benchmark - score;

    let severity: GapSeverity;
    if (score < 50 || gap > 25) {
      severity = "critical";
    } else if (gap > 10) {
      severity = "developing";
    } else if (gap > -5) {
      severity = "proficient";
    } else {
      severity = "advanced";
    }

    const meta = CAPABILITY_META[cap];
    capabilityGaps[cap] = {
      capability: cap,
      score,
      benchmark,
      gap,
      severity,
      priority: 0,
      label: meta.label,
      description: meta.description,
      improvementTip: meta.improvementTip,
    };
  }

  // Priority order: critical first (by gap size), then developing, then proficient, then advanced
  const severityOrder: Record<GapSeverity, number> = {
    critical: 0, developing: 1, proficient: 2, advanced: 3,
  };
  const priorityOrder = [...ALL_CAPABILITIES].sort((a, b) => {
    const gA = capabilityGaps[a];
    const gB = capabilityGaps[b];
    const sevDiff = severityOrder[gA.severity] - severityOrder[gB.severity];
    if (sevDiff !== 0) return sevDiff;
    return gB.gap - gA.gap;
  }) as CapabilityKey[];

  priorityOrder.forEach((cap, i) => {
    capabilityGaps[cap].priority = i + 1;
  });

  // Overall readiness score = weighted average
  let overallReadinessScore = 0;
  for (const cap of ALL_CAPABILITIES) {
    overallReadinessScore += (capabilityScores[cap] ?? 50) * CAPABILITY_WEIGHTS[cap];
  }
  overallReadinessScore = Math.round(overallReadinessScore * 10) / 10;

  let readinessBand: GapAnalysisResult["readinessBand"];
  if (overallReadinessScore < 45) readinessBand = "at_risk";
  else if (overallReadinessScore < 58) readinessBand = "developing";
  else if (overallReadinessScore < 68) readinessBand = "progressing";
  else if (overallReadinessScore < 78) readinessBand = "proficient";
  else readinessBand = "advanced";

  const criticalCount = ALL_CAPABILITIES.filter(c => capabilityGaps[c].severity === "critical").length;
  const developingCount = ALL_CAPABILITIES.filter(c => capabilityGaps[c].severity === "developing").length;
  const proficientCount = ALL_CAPABILITIES.filter(c => capabilityGaps[c].severity === "proficient").length;
  const advancedCount = ALL_CAPABILITIES.filter(c => capabilityGaps[c].severity === "advanced").length;

  const topGap = capabilityGaps[priorityOrder[0]] ?? null;
  const recommendedFocusAreas = priorityOrder
    .filter(c => ["critical", "developing"].includes(capabilityGaps[c].severity))
    .slice(0, 3)
    .map(c => capabilityGaps[c].label);

  return {
    capabilityGaps,
    priorityOrder,
    overallReadinessScore,
    readinessBand,
    criticalCount,
    developingCount,
    proficientCount,
    advancedCount,
    topGap,
    recommendedFocusAreas,
  };
}
