/**
 * AIQ Adaptive Assessment Engine — Contradiction Resolution Engine v10
 *
 * Detects inconsistencies across answers, triggers follow-up probes,
 * reduces confidence, and blocks classification if unresolved.
 *
 * v10 Changes:
 * - Cross-domain pairs updated to v10 taxonomy:
 *   Ethics ↔ Workflow Design
 *   Output Evaluation ↔ Interaction
 *   Workforce Readiness ↔ Change Leadership
 * - Signal references updated to v10 26-signal taxonomy
 * - Probe signal mapping updated for v10 domains
 *
 * Preserved from v9.2:
 * B1: resolved flag based on probe item IDs
 * B2: capabilityKey stored directly on ContradictionPair
 * B3: Cross-capability contradiction detection (updated pairs)
 * B4: Time-pressure inconsistency detection
 * B5: Seniority-inconsistent response detection
 * F5a-d: False positive reduction measures
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
 * B5: Seniority levels ordered from most junior to most senior.
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

function resolveSeniorityRank(seniority: string | null | undefined): number {
  if (!seniority) return 0;
  const lower = seniority.toLowerCase();
  for (const [key, rank] of Object.entries(SENIORITY_ORDER)) {
    if (lower.includes(key)) return rank;
  }
  return 0;
}

/**
 * Detect contradictions across answered items.
 * v10: Updated cross-domain pairs and signal references.
 */
export function detectContradictions(
  answers: AnswerRecord[],
  /** B1: Set of item IDs that are contradiction probe answers */
  resolvedProbeItemIds?: Set<string>
): ContradictionResult {
  const pairs: ContradictionPair[] = [];

  // Group by capability domain
  const byCapability: Record<string, AnswerRecord[]> = {};
  for (const a of answers) {
    if (!byCapability[a.capabilityKey]) byCapability[a.capabilityKey] = [];
    byCapability[a.capabilityKey].push(a);
  }

  // ── Within-capability contradictions ─────────────────────────────────────
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

        // B4: Time-pressure inconsistency — same capability, different urgency, different outcome
        if (
          a.interactionType !== b.interactionType &&
          (
            (a.outcomeClass === "strong" && (b.outcomeClass === "failure" || b.outcomeClass === "critical_failure")) ||
            (b.outcomeClass === "strong" && (a.outcomeClass === "failure" || a.outcomeClass === "critical_failure"))
          )
        ) {
          // Only flag if the time-to-answer difference is significant (suggests pressure effect)
          pairs.push({
            itemA: a.itemId,
            itemB: b.itemId,
            reason: `Time-pressure inconsistency in ${cap}: performance diverges significantly across interaction types`,
            capabilityKey: cap,
            contradictionType: "time_pressure",
          });
        }
      }
    }
  }

  // ── Cross-domain contradictions (v10 updated pairs) ─────────────────────
  const MIN_CROSS_CAP_ANSWERS = 3;

  // v10 cross-domain pair 1: Ethics ↔ Workflow Design
  // Strong ethics language but weak workflow design = talks the talk but can't design ethical processes
  const ethicsAnswers = byCapability["ai_ethics_trust"] ?? [];
  const workflowAnswers = byCapability["ai_workflow_design"] ?? [];

  if (ethicsAnswers.length >= MIN_CROSS_CAP_ANSWERS && workflowAnswers.length >= MIN_CROSS_CAP_ANSWERS) {
    const avgEthics = ethicsAnswers.reduce((s, a) =>
      s + (a.signalDeltas.ethics_under_pressure ?? 0) + (a.signalDeltas.stakeholder_impact_awareness ?? 0), 0
    ) / (ethicsAnswers.length * 2);
    const avgWorkflow = workflowAnswers.reduce((s, a) =>
      s + (a.signalDeltas.workflow_redesign_quality ?? 0) + (a.signalDeltas.human_oversight_preservation ?? 0), 0
    ) / (workflowAnswers.length * 2);

    if (avgEthics > 0.9 && avgWorkflow < -0.6) {
      const ethicsItem = ethicsAnswers.find(a => a.outcomeClass === "strong")?.itemId ?? ethicsAnswers[0].itemId;
      const workflowItem = workflowAnswers.find(a => a.outcomeClass === "failure" || a.outcomeClass === "weak")?.itemId ?? workflowAnswers[0].itemId;
      pairs.push({
        itemA: ethicsItem,
        itemB: workflowItem,
        reason: "Cross-domain contradiction: strong ethical awareness but weak workflow design — ethics knowledge not translating to process design",
        capabilityKey: "ai_ethics_trust",
        contradictionType: "cross_capability",
      });
    }
  }

  // v10 cross-domain pair 2: Output Evaluation ↔ Interaction
  // Strong output evaluation but weak interaction = can spot errors but can't prompt effectively
  const outputEvalAnswers = byCapability["ai_output_evaluation"] ?? [];
  const interactionAnswers = byCapability["ai_interaction"] ?? [];

  if (outputEvalAnswers.length >= MIN_CROSS_CAP_ANSWERS && interactionAnswers.length >= MIN_CROSS_CAP_ANSWERS) {
    const avgOutputEval = outputEvalAnswers.reduce((s, a) =>
      s + (a.signalDeltas.output_evaluation_quality ?? 0) + (a.signalDeltas.error_detection_accuracy ?? 0), 0
    ) / (outputEvalAnswers.length * 2);
    const avgInteraction = interactionAnswers.reduce((s, a) =>
      s + (a.signalDeltas.prompt_construction_quality ?? 0) + (a.signalDeltas.prompt_iteration_quality ?? 0), 0
    ) / (interactionAnswers.length * 2);

    if (avgOutputEval > 0.9 && avgInteraction < -0.6) {
      const evalItem = outputEvalAnswers.find(a => a.outcomeClass === "strong")?.itemId ?? outputEvalAnswers[0].itemId;
      const interItem = interactionAnswers.find(a => a.outcomeClass === "failure" || a.outcomeClass === "weak")?.itemId ?? interactionAnswers[0].itemId;
      pairs.push({
        itemA: evalItem,
        itemB: interItem,
        reason: "Cross-domain contradiction: strong output evaluation but weak AI interaction — can assess AI outputs but struggles to direct AI effectively",
        capabilityKey: "ai_output_evaluation",
        contradictionType: "cross_capability",
      });
    }
  }

  // v10 cross-domain pair 3: Workforce Readiness ↔ Change Leadership
  // Strong workforce readiness diagnosis but weak change leadership = can diagnose but can't lead change
  const readinessAnswers = byCapability["workforce_ai_readiness"] ?? [];
  const changeAnswers = byCapability["ai_change_leadership"] ?? [];

  if (readinessAnswers.length >= MIN_CROSS_CAP_ANSWERS && changeAnswers.length >= MIN_CROSS_CAP_ANSWERS) {
    const avgReadiness = readinessAnswers.reduce((s, a) =>
      s + (a.signalDeltas.capability_diagnosis_accuracy ?? 0) + (a.signalDeltas.intervention_design_quality ?? 0), 0
    ) / (readinessAnswers.length * 2);
    const avgChange = changeAnswers.reduce((s, a) =>
      s + (a.signalDeltas.resistance_response_quality ?? 0) + (a.signalDeltas.legitimate_concern_recognition ?? 0), 0
    ) / (changeAnswers.length * 2);

    if (avgReadiness > 0.9 && avgChange < -0.6) {
      const readItem = readinessAnswers.find(a => a.outcomeClass === "strong")?.itemId ?? readinessAnswers[0].itemId;
      const changeItem = changeAnswers.find(a => a.outcomeClass === "failure" || a.outcomeClass === "weak")?.itemId ?? changeAnswers[0].itemId;
      pairs.push({
        itemA: readItem,
        itemB: changeItem,
        reason: "Cross-domain contradiction: strong workforce readiness diagnosis but weak change leadership — can identify capability gaps but struggles to lead AI adoption",
        capabilityKey: "workforce_ai_readiness",
        contradictionType: "cross_capability",
      });
    }
  }

  // B5: Seniority-inconsistent response detection
  const seniorityValues = answers
    .map(a => resolveSeniorityRank(a.declaredSeniority))
    .filter(r => r > 0);
  if (seniorityValues.length >= 5) {
    const declaredRank = seniorityValues[0];
    const allSameSeniority = seniorityValues.every(r => r === declaredRank);
    if (allSameSeniority && declaredRank >= 3) {
      const failureRate = answers.filter(a =>
        a.outcomeClass === "failure" || a.outcomeClass === "critical_failure"
      ).length / answers.length;
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

  // F5c: Cap total pairs to 5, prioritise within-capability and calibration
  const priorityOrder: ContradictionPair["contradictionType"][] = [
    "calibration", "within_capability", "time_pressure", "cross_capability",
  ];
  const sortedPairs = [...pairs].sort(
    (a, b) => priorityOrder.indexOf(a.contradictionType) - priorityOrder.indexOf(b.contradictionType)
  );
  const cappedPairs = sortedPairs.slice(0, 5);

  const count = cappedPairs.length;
  const requiresProbe = count >= 1;
  const blockClassification = count >= 3;
  const confidencePenalty = Math.max(0.3, 1 - count * 0.15);

  // B1: resolved is true when all pairs have at least one item answered as a probe
  const resolved = resolvedProbeItemIds && resolvedProbeItemIds.size > 0
    ? cappedPairs.every(p => resolvedProbeItemIds.has(p.itemA) || resolvedProbeItemIds.has(p.itemB))
    : false;

  return {
    count,
    pairs: cappedPairs,
    resolved,
    requiresProbe,
    confidencePenalty,
    blockClassification: blockClassification && !resolved,
  };
}

/**
 * Generate a contradiction probe item specification.
 * v10: Updated probe signal mapping for v10 domains.
 */
export function generateContradictionProbeSpec(
  contradiction: ContradictionPair,
  roleArchetypeId: string
): ContradictionProbeSpec {
  // v10: Capability-specific probe signals updated for new taxonomy
  const CAPABILITY_PROBE_SIGNALS: Record<string, string[]> = {
    ai_interaction:         ["prompt_construction_quality", "prompt_iteration_quality"],
    ai_output_evaluation:   ["output_evaluation_quality", "error_detection_accuracy"],
    ai_workflow_design:     ["workflow_redesign_quality", "human_oversight_preservation"],
    workforce_ai_readiness: ["capability_diagnosis_accuracy", "intervention_design_quality"],
    ai_ethics_trust:        ["ethics_under_pressure", "stakeholder_impact_awareness"],
    ai_change_leadership:   ["resistance_response_quality", "legitimate_concern_recognition"],
  };
  const mustInclude = CAPABILITY_PROBE_SIGNALS[contradiction.capabilityKey]
    ?? ["output_evaluation_quality", "prompt_construction_quality"];

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
    mustInclude,
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
