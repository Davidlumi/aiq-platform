/**
 * AIQ Adaptive Assessment Engine — Contradiction Resolution Engine
 *
 * Detects inconsistencies across answers, triggers follow-up probes,
 * reduces confidence, and blocks classification if unresolved.
 *
 * Improvements (Batch B):
 * B1: resolved flag now correctly set based on probe item IDs
 * B2: capabilityKey stored directly on ContradictionPair (no brittle string parsing)
 * B3: Cross-capability contradiction detection added
 * B4: Time-pressure inconsistency detection added
 * B5: Seniority-inconsistent response detection added
 */

export interface AnswerRecord {
  itemId: string;
  capabilityKey: string;
  outcomeClass: string | null;
  signalDeltas: Record<string, number>;
  confidenceScore: number;
  interactionType: string;
  riskLevel: string;
  /** B5: Optional — user's declared seniority level for seniority-inconsistency detection */
  declaredSeniority?: string | null;
}

export interface ContradictionPair {
  itemA: string;
  itemB: string;
  reason: string;
  /** B2: capabilityKey stored directly — no string parsing needed */
  capabilityKey: string;
  contradictionType: "within_capability" | "cross_capability" | "time_pressure" | "calibration";
}

export interface ContradictionResult {
  count: number;
  pairs: ContradictionPair[];
  resolved: boolean;
  requiresProbe: boolean;
  confidencePenalty: number; // 0–1 multiplier applied to confidence
  blockClassification: boolean;
}

/**
 * Detect contradictions across answered items.
 * A contradiction is when a user demonstrates strong capability in one item
 * but critical failure in a comparable item within the same capability domain.
 */
/**
 * B5: Seniority levels ordered from most junior to most senior.
 * Used to detect when a user's reasoning pattern is inconsistent with their declared level.
 */
const SENIORITY_ORDER: Record<string, number> = {
  junior: 1,
  associate: 1,
  coordinator: 1,
  advisor: 2,
  mid: 2,
  specialist: 2,
  senior: 3,
  manager: 3,
  lead: 3,
  director: 4,
  head: 4,
  vp: 5,
  executive: 5,
  "c-suite": 5,
};

/**
 * Infer a seniority rank from a free-form seniority string.
 * Returns 0 if the string is unrecognised (no detection applied).
 */
function resolveSeniorityRank(seniority: string | null | undefined): number {
  if (!seniority) return 0;
  const lower = seniority.toLowerCase();
  for (const [key, rank] of Object.entries(SENIORITY_ORDER)) {
    if (lower.includes(key)) return rank;
  }
  return 0;
}

export function detectContradictions(
  answers: AnswerRecord[],
  /** B1: Set of item IDs that are contradiction probe answers */
  resolvedProbeItemIds?: Set<string>
): ContradictionResult {
  const pairs: ContradictionPair[] = [];

  // Group by capability
  const byCapability: Record<string, AnswerRecord[]> = {};
  for (const a of answers) {
    if (!byCapability[a.capabilityKey]) byCapability[a.capabilityKey] = [];
    byCapability[a.capabilityKey].push(a);
  }

  for (const [cap, capAnswers] of Object.entries(byCapability)) {
    if (capAnswers.length < 2) continue;

    for (let i = 0; i < capAnswers.length; i++) {
      for (let j = i + 1; j < capAnswers.length; j++) {
        const a = capAnswers[i];
        const b = capAnswers[j];

        // Contradiction: strong outcome vs critical_failure in same capability
        if (
          (a.outcomeClass === "strong" && b.outcomeClass === "critical_failure") ||
          (a.outcomeClass === "critical_failure" && b.outcomeClass === "strong")
        ) {
          pairs.push({
            itemA: a.itemId,
            itemB: b.itemId,
            reason: `Contradictory outcomes in ${cap}: strong vs critical_failure`,
            capabilityKey: cap,
            contradictionType: "within_capability",
          });
        }

        // Contradiction: high confidence + weak outcome vs low confidence + strong outcome
        if (
          a.confidenceScore > 0.8 && a.outcomeClass === "failure" &&
          b.confidenceScore < 0.4 && b.outcomeClass === "strong"
        ) {
          pairs.push({
            itemA: a.itemId,
            itemB: b.itemId,
            reason: `Calibration contradiction in ${cap}: high confidence with failure vs low confidence with strong`,
            capabilityKey: cap,
            contradictionType: "calibration",
          });
        }

        // Contradiction: governance bypass in high-risk item but strong governance elsewhere
        if (
          a.riskLevel === "High" && (a.signalDeltas.governance_bypass_risk ?? 0) < -1.0 &&
          (b.signalDeltas.governance_quality ?? 0) > 1.0
        ) {
          pairs.push({
            itemA: a.itemId,
            itemB: b.itemId,
            reason: `Governance contradiction: bypass in high-risk scenario vs strong governance elsewhere`,
            capabilityKey: cap,
            contradictionType: "within_capability",
          });
        }

        // B4: Time-pressure inconsistency — same capability, different urgency, different outcome
        if (
          a.interactionType !== b.interactionType &&
          Math.abs((a.signalDeltas.timing_integrity ?? 0) - (b.signalDeltas.timing_integrity ?? 0)) > 1.5 &&
          (
            (a.outcomeClass === "strong" && (b.outcomeClass === "failure" || b.outcomeClass === "critical_failure")) ||
            (b.outcomeClass === "strong" && (a.outcomeClass === "failure" || a.outcomeClass === "critical_failure"))
          )
        ) {
          pairs.push({
            itemA: a.itemId,
            itemB: b.itemId,
            reason: `Time-pressure inconsistency in ${cap}: performance diverges significantly under time pressure`,
            capabilityKey: cap,
            contradictionType: "time_pressure",
          });
        }
      }
    }
  }

  // B3: Cross-capability contradictions
  const governanceAnswers = byCapability["governance"] ?? [];
  const executionAnswers = byCapability["execution"] ?? [];
  const judgementAnswers = byCapability["judgement"] ?? [];

  const avgGovernanceSignal = governanceAnswers.length > 0
    ? governanceAnswers.reduce((s, a) => s + (a.signalDeltas.governance_quality ?? 0), 0) / governanceAnswers.length
    : 0;
  const avgExecutionSignal = executionAnswers.length > 0
    ? executionAnswers.reduce((s, a) => s + (a.signalDeltas.execution_quality ?? 0), 0) / executionAnswers.length
    : 0;
  const avgJudgementSignal = judgementAnswers.length > 0
    ? judgementAnswers.reduce((s, a) => s + (a.signalDeltas.judgement_quality ?? 0), 0) / judgementAnswers.length
    : 0;

  // Strong governance + weak execution = governance knowledge without practical skill
  if (
    governanceAnswers.length >= 2 && executionAnswers.length >= 2 &&
    avgGovernanceSignal > 1.5 && avgExecutionSignal < -1.0
  ) {
    const govItem = governanceAnswers.find(a => a.outcomeClass === "strong")?.itemId ?? governanceAnswers[0].itemId;
    const execItem = executionAnswers.find(a => a.outcomeClass === "failure" || a.outcomeClass === "weak")?.itemId ?? executionAnswers[0].itemId;
    pairs.push({
      itemA: govItem,
      itemB: execItem,
      reason: "Cross-capability contradiction: strong governance knowledge but weak practical execution",
      capabilityKey: "governance",
      contradictionType: "cross_capability",
    });
  }

  // Strong governance + weak judgement = compliance awareness without genuine judgement
  if (
    governanceAnswers.length >= 2 && judgementAnswers.length >= 2 &&
    avgGovernanceSignal > 1.5 && avgJudgementSignal < -1.0
  ) {
    const govItem = governanceAnswers.find(a => a.outcomeClass === "strong")?.itemId ?? governanceAnswers[0].itemId;
    const judgItem = judgementAnswers.find(a => a.outcomeClass === "failure" || a.outcomeClass === "weak")?.itemId ?? judgementAnswers[0].itemId;
    pairs.push({
      itemA: govItem,
      itemB: judgItem,
      reason: "Cross-capability contradiction: strong governance language but weak practical judgement",
      capabilityKey: "judgement",
      contradictionType: "cross_capability",
    });
  }

  // B5: Seniority-inconsistent response detection
  // Detects when a user's answer quality is systematically below what their declared seniority implies.
  // Only fires when all answers carry a consistent declaredSeniority and the pattern is clear.
  const seniorityValues = answers
    .map(a => resolveSeniorityRank(a.declaredSeniority))
    .filter(r => r > 0);
  if (seniorityValues.length >= 5) {
    const declaredRank = seniorityValues[0]; // All answers share the same user seniority
    const allSameSeniority = seniorityValues.every(r => r === declaredRank);
    if (allSameSeniority && declaredRank >= 3) {
      // Senior+ user: expect fewer failures and critical_failures
      const failureRate = answers.filter(a =>
        a.outcomeClass === "failure" || a.outcomeClass === "critical_failure"
      ).length / answers.length;
      // Senior+ users should not fail >40% of items — that's inconsistent with declared level
      if (failureRate > 0.40) {
        const worstItem = answers.find(a => a.outcomeClass === "critical_failure") ??
          answers.find(a => a.outcomeClass === "failure") ??
          answers[0];
        const bestItem = answers.find(a => a.outcomeClass === "strong") ?? answers[answers.length - 1];
        pairs.push({
          itemA: bestItem.itemId,
          itemB: worstItem.itemId,
          reason: `Seniority inconsistency: declared ${answers[0].declaredSeniority ?? "senior"} but ${Math.round(failureRate * 100)}% failure rate — inconsistent with expected capability at this level`,
          capabilityKey: worstItem.capabilityKey,
          contradictionType: "calibration",
        });
      }
    }
  }

  const count = pairs.length;
  const requiresProbe = count >= 1;
  const blockClassification = count >= 3;
  const confidencePenalty = Math.max(0.3, 1 - count * 0.15);

  // B1: resolved is true when all pairs have at least one item answered as a probe
  const resolved = resolvedProbeItemIds && resolvedProbeItemIds.size > 0
    ? pairs.every(p => resolvedProbeItemIds.has(p.itemA) || resolvedProbeItemIds.has(p.itemB))
    : false;

  return {
    count,
    pairs,
    resolved,
    requiresProbe,
    confidencePenalty,
    blockClassification: blockClassification && !resolved,
  };
}

/**
 * Generate a contradiction probe item specification.
 * B2: Accepts ContradictionPair directly — capabilityKey is stored on the pair.
 */
export function generateContradictionProbeSpec(
  contradiction: ContradictionPair,
  roleArchetypeId: string
): ContradictionProbeSpec {
  return {
    type: "contradiction_probe",
    targetCapability: contradiction.capabilityKey,
    roleArchetypeId,
    reason: contradiction.reason,
    contradictionType: contradiction.contradictionType,
    difficulty: 3, // Always high difficulty for contradiction probes
    riskLevel: "High",
    ambiguity: "high",
    intent: "contradiction_resolution",
    mustInclude: ["governance_quality", "judgement_quality"],
  };
}

export interface ContradictionProbeSpec {
  type: "contradiction_probe";
  targetCapability: string;
  roleArchetypeId: string;
  reason: string;
  contradictionType: ContradictionPair["contradictionType"];
  difficulty: number;
  riskLevel: string;
  ambiguity: string;
  intent: string;
  mustInclude: string[];
}
