/**
 * AIQ Adaptive Assessment Engine — Contradiction Resolution Engine
 *
 * Detects inconsistencies across answers, triggers follow-up probes,
 * reduces confidence, and blocks classification if unresolved.
 */

export interface AnswerRecord {
  itemId: string;
  capabilityKey: string;
  outcomeClass: string | null;
  signalDeltas: Record<string, number>;
  confidenceScore: number;
  interactionType: string;
  riskLevel: string;
}

export interface ContradictionResult {
  count: number;
  pairs: Array<{ itemA: string; itemB: string; reason: string }>;
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
export function detectContradictions(answers: AnswerRecord[]): ContradictionResult {
  const pairs: Array<{ itemA: string; itemB: string; reason: string }> = [];

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
          });
        }
      }
    }
  }

  const count = pairs.length;
  const requiresProbe = count >= 1;
  const blockClassification = count >= 3;
  const confidencePenalty = Math.max(0.3, 1 - count * 0.15);

  return {
    count,
    pairs,
    resolved: false, // resolved when follow-up probes are answered
    requiresProbe,
    confidencePenalty,
    blockClassification,
  };
}

/**
 * Generate a contradiction probe item specification.
 * Returns the governed variables for the adaptive engine to generate a targeted probe.
 */
export function generateContradictionProbeSpec(
  contradiction: { itemA: string; itemB: string; reason: string },
  capabilityKey: string,
  roleArchetypeId: string
): ContradictionProbeSpec {
  return {
    type: "contradiction_probe",
    targetCapability: capabilityKey,
    roleArchetypeId,
    reason: contradiction.reason,
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
  difficulty: number;
  riskLevel: string;
  ambiguity: string;
  intent: string;
  mustInclude: string[];
}
