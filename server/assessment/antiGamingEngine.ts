/**
 * AIQ Adaptive Assessment Engine — Anti-Gaming Engine
 *
 * Detects gaming patterns (always safe, always escalate, pattern gaming,
 * inconsistent responses, polished but shallow behaviour) and responds
 * by injecting traps, varying formats, and increasing scrutiny.
 */

export interface GamingAnalysis {
  score: number; // 0–1, higher = more authentic
  patterns: GamingPattern[];
  scrutinyLevel: "normal" | "elevated" | "high";
  injectionRequired: boolean;
  recommendedInjections: InjectionSpec[];
}

export type GamingPattern =
  | "always_safe_choice"
  | "always_escalate"
  | "always_cautious"
  | "option_position_bias" // always picks A, B, etc.
  | "speed_gaming"         // answers too fast
  | "inconsistent_responses"
  | "polished_shallow"     // strong governance language but weak execution
  | "pattern_cycling";     // cycles through A→B→C→D

export interface InjectionSpec {
  type: "trap" | "clean_case" | "comparable_scenario" | "format_variation";
  targetPattern: GamingPattern;
  targetCapability: string;
  riskLevel: "Low" | "Medium" | "High";
  interactionType: string;
}

/**
 * Analyse answer history for gaming patterns.
 */
export function analyseGamingPatterns(
  answers: Array<{
    selectedValue: string | null;
    optionPosition: number | null; // 0=A, 1=B, 2=C, 3=D
    timeToAnswerMs: number;
    outcomeClass: string | null;
    confidenceScore: number;
    signalDeltas: Record<string, number>;
    interactionType: string;
  }>
): GamingAnalysis {
  if (answers.length < 5) {
    return {
      score: 1.0,
      patterns: [],
      scrutinyLevel: "normal",
      injectionRequired: false,
      recommendedInjections: [],
    };
  }

  const patterns: GamingPattern[] = [];
  const injections: InjectionSpec[] = [];

  // ── Pattern 1: Always safe choice ────────────────────────────────────────
  // If >80% of outcomes are "acceptable" (never strong, never weak), user is playing safe
  const acceptableRate = answers.filter(a => a.outcomeClass === "acceptable").length / answers.length;
  const strongRate = answers.filter(a => a.outcomeClass === "strong").length / answers.length;
  const weakOrFailRate = answers.filter(a => a.outcomeClass === "weak" || a.outcomeClass === "failure").length / answers.length;
  if (acceptableRate > 0.75 && strongRate < 0.1) {
    patterns.push("always_safe_choice");
    injections.push({
      type: "trap",
      targetPattern: "always_safe_choice",
      targetCapability: "judgement",
      riskLevel: "High",
      interactionType: "risk_judgement",
    });
  }

  // ── Pattern 2: Always escalate ────────────────────────────────────────────
  const escalateSignals = answers.filter(a => (a.signalDeltas.over_caution_risk ?? 0) < -0.5).length;
  if (escalateSignals / answers.length > 0.6) {
    patterns.push("always_escalate");
    injections.push({
      type: "clean_case",
      targetPattern: "always_escalate",
      targetCapability: "execution",
      riskLevel: "Low",
      interactionType: "situational_judgement",
    });
  }

  // ── Pattern 3: Option position bias ──────────────────────────────────────
  const positionCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const a of answers) {
    if (a.optionPosition !== null) {
      positionCounts[a.optionPosition] = (positionCounts[a.optionPosition] ?? 0) + 1;
    }
  }
  const maxPosition = Math.max(...Object.values(positionCounts));
  if (maxPosition / answers.length > 0.55) {
    patterns.push("option_position_bias");
    injections.push({
      type: "comparable_scenario",
      targetPattern: "option_position_bias",
      targetCapability: "execution",
      riskLevel: "Medium",
      interactionType: "scenario_critique",
    });
  }

  // ── Pattern 4: Speed gaming ───────────────────────────────────────────────
  const avgTime = answers.reduce((s, a) => s + a.timeToAnswerMs, 0) / answers.length;
  if (avgTime < 4000) { // Under 4 seconds average
    patterns.push("speed_gaming");
    injections.push({
      type: "trap",
      targetPattern: "speed_gaming",
      targetCapability: "governance",
      riskLevel: "High",
      interactionType: "governance_decision",
    });
  }

  // ── Pattern 5: Inconsistent responses ────────────────────────────────────
  // High variance in outcome class within same capability
  const outcomeVariance = computeOutcomeVariance(answers);
  if (outcomeVariance > 0.7) {
    patterns.push("inconsistent_responses");
  }

  // ── Pattern 6: Polished but shallow ──────────────────────────────────────
  // Strong governance signals but weak execution signals
  const avgGovernance = average(answers.map(a => a.signalDeltas.governance_quality ?? 0));
  const avgExecution = average(answers.map(a => a.signalDeltas.execution_quality ?? 0));
  if (avgGovernance > 1.0 && avgExecution < -0.5) {
    patterns.push("polished_shallow");
    injections.push({
      type: "comparable_scenario",
      targetPattern: "polished_shallow",
      targetCapability: "execution",
      riskLevel: "Medium",
      interactionType: "output_improvement",
    });
  }

  // ── Pattern 7: Pattern cycling ────────────────────────────────────────────
  if (answers.length >= 8) {
    const positions = answers.map(a => a.optionPosition ?? -1).filter(p => p >= 0);
    let cycleCount = 0;
    for (let i = 0; i < positions.length - 4; i++) {
      const window = positions.slice(i, i + 4);
      if (new Set(window).size === 4) cycleCount++;
    }
    if (cycleCount > positions.length * 0.4) {
      patterns.push("pattern_cycling");
    }
  }

  // ── Compute anti-gaming score ─────────────────────────────────────────────
  const score = Math.max(0, 1 - patterns.length * 0.15);
  const scrutinyLevel: "normal" | "elevated" | "high" =
    patterns.length >= 3 ? "high" : patterns.length >= 1 ? "elevated" : "normal";

  return {
    score,
    patterns,
    scrutinyLevel,
    injectionRequired: injections.length > 0,
    recommendedInjections: injections.slice(0, 2), // Max 2 injections at a time
  };
}

function computeOutcomeVariance(answers: Array<{ outcomeClass: string | null }>): number {
  const outcomeValues: Record<string, number> = {
    strong: 1.0, acceptable: 0.6, weak: 0.3, failure: 0.1, critical_failure: 0.0,
  };
  const values = answers.map(a => outcomeValues[a.outcomeClass ?? "acceptable"] ?? 0.6);
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
