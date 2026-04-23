/**
 * AIQ Classification Confidence Gate
 *
 * Addresses CPO credibility concern: "The confidence profile is not used as a gate —
 * a session with 0.35 composite confidence can still produce a 'safe' classification."
 *
 * This module:
 * 1. Defines confidence band thresholds with human-readable labels
 * 2. Provides a gate function that blocks "safe" classification when composite
 *    confidence is below a minimum threshold
 * 3. Adds a confidence caveat to the result when confidence is in the "low" band
 *    so the user and their manager understand the reliability of the result
 *
 * The gate does NOT block "unsafe" or "at_risk" classifications — those are
 * conservative outcomes and it is better to surface a low-confidence risk signal
 * than to suppress it. Only "safe" classifications are gated, because a false
 * "safe" result is the highest-stakes error in this context.
 */

// ─── Confidence Bands ─────────────────────────────────────────────────────────

export type ConfidenceBand = "high" | "moderate" | "low" | "insufficient";

export interface ConfidenceBandResult {
  band: ConfidenceBand;
  label: string;
  description: string;
  minThreshold: number;
  maxThreshold: number;
}

const CONFIDENCE_BANDS: ConfidenceBandResult[] = [
  {
    band: "high",
    label: "High confidence",
    description: "The assessment collected sufficient evidence across all capability domains with consistent responses. The classification is reliable.",
    minThreshold: 0.75,
    maxThreshold: 1.00,
  },
  {
    band: "moderate",
    label: "Moderate confidence",
    description: "The assessment collected adequate evidence but some capability domains had limited coverage or minor inconsistencies. The classification is likely reliable but should be considered alongside other evidence.",
    minThreshold: 0.55,
    maxThreshold: 0.75,
  },
  {
    band: "low",
    label: "Low confidence",
    description: "The assessment detected significant inconsistencies, limited coverage of some capability domains, or potential gaming patterns. The classification should be treated as indicative only and validated through further assessment or observation.",
    minThreshold: 0.35,
    maxThreshold: 0.55,
  },
  {
    band: "insufficient",
    label: "Insufficient confidence",
    description: "The assessment could not collect sufficient reliable evidence to make a credible classification. The result should not be used for any decision-making purpose. A fresh assessment is recommended.",
    minThreshold: 0.00,
    maxThreshold: 0.35,
  },
];

/**
 * Minimum composite confidence required to permit a "safe" classification.
 * Below this threshold, the classification is downgraded to "at_risk" with
 * a confidence caveat explaining why the safe classification was withheld.
 *
 * Rationale: A false "safe" result is the highest-stakes error. It is better
 * to require a repeat assessment than to certify someone as safe when the
 * evidence is unreliable.
 */
export const MINIMUM_SAFE_CLASSIFICATION_CONFIDENCE = 0.55;

// ─── Confidence Band Resolver ─────────────────────────────────────────────────

export function resolveConfidenceBand(compositeConfidence: number): ConfidenceBandResult {
  for (const band of CONFIDENCE_BANDS) {
    if (compositeConfidence >= band.minThreshold) return band;
  }
  return CONFIDENCE_BANDS[CONFIDENCE_BANDS.length - 1]; // "insufficient"
}

// ─── Classification Confidence Gate ──────────────────────────────────────────

export interface GateResult {
  /** The final classification state after applying the confidence gate */
  state: "safe" | "at_risk" | "unsafe" | "insufficient_evidence";
  /** Whether the gate downgraded the classification */
  wasDowngraded: boolean;
  /** The original classification before gating (same as state if not downgraded) */
  originalState: "safe" | "at_risk" | "unsafe" | "insufficient_evidence";
  /** Confidence band of the session */
  confidenceBand: ConfidenceBandResult;
  /** Human-readable caveat to surface in the result UI when confidence is low */
  caveat: string | null;
}

/**
 * Apply the classification confidence gate.
 *
 * Rules:
 * - "safe" requires compositeConfidence >= MINIMUM_SAFE_CLASSIFICATION_CONFIDENCE (0.55)
 * - If compositeConfidence < 0.55 and state is "safe", downgrade to "at_risk"
 * - If compositeConfidence < 0.35 and state is "at_risk", downgrade to "insufficient_evidence"
 * - "unsafe" is never downgraded — it is always surfaced regardless of confidence
 *
 * @param state               Raw classification from classifyReadiness
 * @param compositeConfidence Composite confidence score from computeConfidenceProfile
 */
export function applyClassificationConfidenceGate(
  state: "safe" | "at_risk" | "unsafe" | "insufficient_evidence",
  compositeConfidence: number,
  /** WS1.2 Item 1: configurable safe threshold (default: MINIMUM_SAFE_CLASSIFICATION_CONFIDENCE = 0.55) */
  minimumSafeConfidence?: number,
  /** WS1.2 Item 1: configurable at_risk floor (default: 0.35) */
  atRiskFloor?: number
): GateResult {
  const confidenceBand = resolveConfidenceBand(compositeConfidence);
  const originalState = state;

  // "unsafe" is never downgraded — always surface risk signals
  if (state === "unsafe") {
    return {
      state,
      wasDowngraded: false,
      originalState,
      confidenceBand,
      caveat: confidenceBand.band === "low" || confidenceBand.band === "insufficient"
        ? `This result was produced with ${confidenceBand.label.toLowerCase()}. While the unsafe classification is surfaced regardless, we recommend a repeat assessment to confirm these findings before any formal action is taken.`
        : null,
    };
  }

  // "insufficient_evidence" is already the lowest state
  if (state === "insufficient_evidence") {
    return {
      state,
      wasDowngraded: false,
      originalState,
      confidenceBand,
      caveat: "Insufficient evidence was collected to make a reliable classification. Please complete the full assessment.",
    };
  }

  // Gate 1: "safe" requires moderate or higher confidence
  // WS1.2 Item 1: use configurable threshold; fall back to module constant
  const safeThreshold = minimumSafeConfidence ?? MINIMUM_SAFE_CLASSIFICATION_CONFIDENCE;
  if (state === "safe" && compositeConfidence < safeThreshold) {
    return {
      state: "at_risk",
      wasDowngraded: true,
      originalState,
      confidenceBand,
      caveat: `Your responses suggested safe AI capability, but the assessment detected ${confidenceBand.band === "insufficient" ? "insufficient evidence" : "significant inconsistencies or limited coverage"} to confirm this with confidence. Your result has been recorded as 'developing' pending a more complete assessment. ${confidenceBand.description}`,
    };
  }

  // Gate 2: "at_risk" with insufficient confidence → insufficient_evidence
  // WS1.2 Item 1: use configurable floor; fall back to 0.35
  const atRiskThreshold = atRiskFloor ?? 0.35;
  if (state === "at_risk" && compositeConfidence < atRiskThreshold) {
    return {
      state: "insufficient_evidence",
      wasDowngraded: true,
      originalState,
      confidenceBand,
      caveat: `The assessment could not collect sufficient reliable evidence to classify your AI capability. ${confidenceBand.description}`,
    };
  }

  // No downgrade needed — add caveat if confidence is low
  const caveat = (confidenceBand.band === "low")
    ? `This result was produced with low confidence. ${confidenceBand.description}`
    : null;

  return {
    state,
    wasDowngraded: false,
    originalState,
    confidenceBand,
    caveat,
  };
}
