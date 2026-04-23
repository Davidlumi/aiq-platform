/**
 * Gap Analysis Engine — AiQ Adaptive Learning
 *
 * Reads assessment capability scores and computes structured gaps
 * against role-level benchmarks. Classifies each capability into
 * severity bands and produces a prioritised remediation order.
 *
 * Severity bands (based on gap from benchmark):
 *   critical    — score < 50 OR gap > 25 points below benchmark
 *   developing  — gap 10–25 points below benchmark
 *   proficient  — gap < 10 points below benchmark (within range)
 *   advanced    — score >= benchmark + 5
 */

export type CapabilityKey =
  | "execution"
  | "judgement"
  | "governance"
  | "appropriateness"
  | "workflow"
  | "data_interpretation";

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

// ─── Role Benchmarks ──────────────────────────────────────────────────────────
// Default benchmarks by role seniority tier
const ROLE_BENCHMARKS: Record<string, Record<CapabilityKey, number>> = {
  junior: {
    execution: 55,
    judgement: 52,
    governance: 50,
    appropriateness: 53,
    workflow: 56,
    data_interpretation: 50,
  },
  mid: {
    execution: 65,
    judgement: 63,
    governance: 62,
    appropriateness: 64,
    workflow: 66,
    data_interpretation: 60,
  },
  senior: {
    execution: 73,
    judgement: 71,
    governance: 70,
    appropriateness: 72,
    workflow: 74,
    data_interpretation: 68,
  },
  lead: {
    execution: 78,
    judgement: 76,
    governance: 76,
    appropriateness: 77,
    workflow: 79,
    data_interpretation: 74,
  },
};

const DEFAULT_BENCHMARK = ROLE_BENCHMARKS.mid;

// ─── Capability Metadata ──────────────────────────────────────────────────────
const CAPABILITY_META: Record<CapabilityKey, { label: string; description: string; improvementTip: string }> = {
  execution: {
    label: "AI Task Execution",
    description: "Ability to effectively use AI tools to complete HR tasks, including prompt crafting, output evaluation, and iterative refinement.",
    improvementTip: "Practice structured prompting techniques and build a personal library of effective HR prompts.",
  },
  judgement: {
    label: "AI Judgement & Critical Thinking",
    description: "Capacity to critically evaluate AI outputs, identify hallucinations, biases, and errors before acting on AI-generated content.",
    improvementTip: "Develop a systematic verification checklist for AI outputs and practice spotting common failure patterns.",
  },
  governance: {
    label: "AI Governance & Compliance",
    description: "Understanding of organisational AI policies, data protection requirements, and ethical frameworks for responsible AI use in HR.",
    improvementTip: "Review your organisation's AI policy and GDPR obligations; map each AI tool you use to its data handling requirements.",
  },
  appropriateness: {
    label: "AI Appropriateness Assessment",
    description: "Skill in determining when AI assistance is appropriate versus when human judgement must take precedence, especially in sensitive HR contexts.",
    improvementTip: "Build a decision framework for AI vs. human tasks, particularly for sensitive cases involving employee welfare.",
  },
  workflow: {
    label: "AI Workflow Integration",
    description: "Proficiency in integrating AI tools into existing HR workflows, automating repetitive tasks, and designing AI-augmented processes.",
    improvementTip: "Map your top 5 most time-consuming HR tasks and identify which steps could be AI-assisted without compromising quality.",
  },
  data_interpretation: {
    label: "AI Data & Insight Interpretation",
    description: "Ability to interpret AI-generated analytics, workforce insights, and predictive models to inform HR strategy and decisions.",
    improvementTip: "Practice reading AI-generated workforce reports critically — always ask what data was used and what assumptions were made.",
  },
};

// ─── Core Engine ──────────────────────────────────────────────────────────────

export function computeGapAnalysis(
  capabilityScores: Partial<Record<CapabilityKey, number>>,
  seniorityTier: string = "mid"
): GapAnalysisResult {
  const benchmarks = ROLE_BENCHMARKS[seniorityTier] ?? DEFAULT_BENCHMARK;
  const allCapabilities: CapabilityKey[] = [
    "execution", "judgement", "governance", "appropriateness", "workflow", "data_interpretation"
  ];

  const capabilityGaps: Record<CapabilityKey, CapabilityGap> = {} as any;

  for (const cap of allCapabilities) {
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
      priority: 0, // assigned below
      label: meta.label,
      description: meta.description,
      improvementTip: meta.improvementTip,
    };
  }

  // Priority order: critical first (by gap size), then developing, then proficient, then advanced
  const severityOrder: Record<GapSeverity, number> = {
    critical: 0, developing: 1, proficient: 2, advanced: 3
  };

  const priorityOrder = allCapabilities.sort((a, b) => {
    const gA = capabilityGaps[a];
    const gB = capabilityGaps[b];
    const sevDiff = severityOrder[gA.severity] - severityOrder[gB.severity];
    if (sevDiff !== 0) return sevDiff;
    return gB.gap - gA.gap; // larger gap = higher priority within same severity
  }) as CapabilityKey[];

  // Assign priority numbers
  priorityOrder.forEach((cap, i) => {
    capabilityGaps[cap].priority = i + 1;
  });

  // Overall readiness score = weighted average of capability scores
  const weights: Record<CapabilityKey, number> = {
    execution: 0.20,
    judgement: 0.20,
    governance: 0.15,
    appropriateness: 0.15,
    workflow: 0.15,
    data_interpretation: 0.15,
  };

  let overallReadinessScore = 0;
  for (const cap of allCapabilities) {
    overallReadinessScore += (capabilityScores[cap] ?? 50) * weights[cap];
  }
  overallReadinessScore = Math.round(overallReadinessScore * 10) / 10;

  let readinessBand: GapAnalysisResult["readinessBand"];
  if (overallReadinessScore < 45) readinessBand = "at_risk";
  else if (overallReadinessScore < 58) readinessBand = "developing";
  else if (overallReadinessScore < 68) readinessBand = "progressing";
  else if (overallReadinessScore < 78) readinessBand = "proficient";
  else readinessBand = "advanced";

  const criticalCount = allCapabilities.filter(c => capabilityGaps[c].severity === "critical").length;
  const developingCount = allCapabilities.filter(c => capabilityGaps[c].severity === "developing").length;
  const proficientCount = allCapabilities.filter(c => capabilityGaps[c].severity === "proficient").length;
  const advancedCount = allCapabilities.filter(c => capabilityGaps[c].severity === "advanced").length;

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
