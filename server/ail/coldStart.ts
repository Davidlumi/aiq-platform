/**
 * AIL Cold Start Module
 *
 * Solves the cold start problem for new users: seeds provisional persona
 * classification, difficulty profile, and narrative state from onboarding
 * data so the platform feels adaptive from session 1.
 *
 * Cold start period ends when persona confidence reaches 0.5 (typically
 * after 2–3 completed simulations or 1–2 full assessments).
 */

import { getDb } from "../db";
import { nanoid } from "nanoid";
import {
  ailPersonaProfiles,
  ailDifficultyProfiles,
  ailUserIntelligenceProfiles,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OnboardingSignals = {
  userId: string;
  tenantId: string;
  experienceLevel: "junior" | "mid" | "senior" | "director" | "executive";
  aiUsageLevel: "never" | "occasionally" | "regularly" | "daily";
  primaryDomain: string;
  governanceFamiliarity: "low" | "moderate" | "high";
  selfAssessedStrength: string;
  selfAssessedWeakness: string;
};

export type ProvisionalPersona = {
  validationOrientation: number;   // 0–100, 50 = neutral
  governanceOrientation: number;
  riskOrientation: number;
  communicationOrientation: number;
  compositePersona: string;
  confidence: number;              // Always 0.3 for cold start
  source: "cold_start";
};

export type ProvisionalDifficulty = {
  signalClarity: number;           // 1–5
  ambiguity: number;
  politicalComplexity: number;
  informationalCompleteness: number;
  timePressure: number;
  consequenceVisibility: number;
  source: "cold_start";
};

// ─── Inference Maps ───────────────────────────────────────────────────────────

/**
 * Maps experience level to a starting difficulty profile.
 * More experienced users start with harder scenarios.
 */
const EXPERIENCE_DIFFICULTY_MAP: Record<string, Partial<ProvisionalDifficulty>> = {
  junior: {
    signalClarity: 4,        // Errors are obvious
    ambiguity: 2,            // Low ambiguity
    politicalComplexity: 2,  // Low political pressure
    informationalCompleteness: 4, // Most info provided
    timePressure: 2,
    consequenceVisibility: 4,
  },
  mid: {
    signalClarity: 3,
    ambiguity: 3,
    politicalComplexity: 3,
    informationalCompleteness: 3,
    timePressure: 3,
    consequenceVisibility: 3,
  },
  senior: {
    signalClarity: 2,
    ambiguity: 4,
    politicalComplexity: 4,
    informationalCompleteness: 2,
    timePressure: 3,
    consequenceVisibility: 2,
  },
  director: {
    signalClarity: 2,
    ambiguity: 4,
    politicalComplexity: 5,
    informationalCompleteness: 2,
    timePressure: 4,
    consequenceVisibility: 2,
  },
  executive: {
    signalClarity: 1,
    ambiguity: 5,
    politicalComplexity: 5,
    informationalCompleteness: 1,
    timePressure: 4,
    consequenceVisibility: 1,
  },
};

/**
 * Maps AI usage level to provisional validation orientation.
 * Heavy AI users are more likely to be blind acceptors initially.
 */
const AI_USAGE_VALIDATION_MAP: Record<string, number> = {
  never: 70,        // Likely cautious, higher validation orientation
  occasionally: 55,
  regularly: 45,    // Familiarity may breed complacency
  daily: 35,        // Higher blind acceptance risk
};

/**
 * Maps governance familiarity to governance orientation.
 */
const GOVERNANCE_ORIENTATION_MAP: Record<string, number> = {
  low: 35,
  moderate: 55,
  high: 75,
};

// ─── Core Function ────────────────────────────────────────────────────────────

/**
 * Initialises the AIL for a new user from their onboarding data.
 * Creates provisional persona, difficulty profile, and narrative state
 * at confidence 0.3 — enough to personalise session 1 without overfitting.
 */
export async function initializeColdStart(signals: OnboardingSignals): Promise<{
  persona: ProvisionalPersona;
  difficulty: ProvisionalDifficulty;
  narrativeContext: string;
}> {
  const {
    experienceLevel,
    aiUsageLevel,
    governanceFamiliarity,
    primaryDomain,
    selfAssessedStrength,
    selfAssessedWeakness,
  } = signals;

  // ── Persona Inference ──────────────────────────────────────────────────────
  const validationOrientation = AI_USAGE_VALIDATION_MAP[aiUsageLevel] ?? 50;
  const governanceOrientation = GOVERNANCE_ORIENTATION_MAP[governanceFamiliarity] ?? 50;

  // Risk orientation: senior+ roles tend toward calibrated risk; junior roles
  // tend toward risk aversion (escalation) or overconfidence
  const riskOrientationMap: Record<string, number> = {
    junior: 40,
    mid: 50,
    senior: 60,
    director: 65,
    executive: 55, // Executives can be overconfident
  };
  const riskOrientation = riskOrientationMap[experienceLevel] ?? 50;

  // Communication orientation: senior+ roles tend toward executive communication
  const commOrientationMap: Record<string, number> = {
    junior: 35,
    mid: 50,
    senior: 60,
    director: 70,
    executive: 75,
  };
  const communicationOrientation = commOrientationMap[experienceLevel] ?? 50;

  // Composite persona classification
  const compositePersona = inferCompositePersona(
    validationOrientation,
    governanceOrientation,
    riskOrientation,
  );

  const persona: ProvisionalPersona = {
    validationOrientation,
    governanceOrientation,
    riskOrientation,
    communicationOrientation,
    compositePersona,
    confidence: 0.3,
    source: "cold_start",
  };

  // ── Difficulty Inference ───────────────────────────────────────────────────
  const baseProfile = EXPERIENCE_DIFFICULTY_MAP[experienceLevel] ?? EXPERIENCE_DIFFICULTY_MAP.mid;

  // Adjust for AI usage: daily users get harder governance scenarios
  const governanceBoost = aiUsageLevel === "daily" ? 1 : 0;

  const difficulty: ProvisionalDifficulty = {
    signalClarity: clamp((baseProfile.signalClarity ?? 3), 1, 5),
    ambiguity: clamp((baseProfile.ambiguity ?? 3), 1, 5),
    politicalComplexity: clamp((baseProfile.politicalComplexity ?? 3), 1, 5),
    informationalCompleteness: clamp((baseProfile.informationalCompleteness ?? 3), 1, 5),
    timePressure: clamp((baseProfile.timePressure ?? 3), 1, 5),
    consequenceVisibility: clamp(
      (baseProfile.consequenceVisibility ?? 3) - governanceBoost, 1, 5
    ),
    source: "cold_start",
  };

  // ── Narrative Context ──────────────────────────────────────────────────────
  const narrativeContext = buildNarrativeContext(signals, compositePersona);

  return { persona, difficulty, narrativeContext };
}

/**
 * Applies cold start data to the AIL tables for a user.
 * Called after onboarding completion.
 */
export async function applyColdStart(
  signals: OnboardingSignals,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { persona, difficulty } = await initializeColdStart(signals);
  const now = Date.now();

  // Upsert persona profile
  const existingPersona = await db
    .select({ id: ailPersonaProfiles.id })
    .from(ailPersonaProfiles)
    .where(eq(ailPersonaProfiles.userId, signals.userId))
    .limit(1);

  if (existingPersona[0]) {
    await db
      .update(ailPersonaProfiles)
      .set({
        validationOrientation: String(persona.validationOrientation) as any,
        governanceOrientation: String(persona.governanceOrientation) as any,
        riskOrientation: String(persona.riskOrientation) as any,
        communicationOrientation: String(persona.communicationOrientation) as any,
        primaryPersona: persona.compositePersona as any,
        personaConfidence: String(persona.confidence) as any,
      })
      .where(eq(ailPersonaProfiles.userId, signals.userId));
  } else {
    await db.insert(ailPersonaProfiles).values({
      id: nanoid(),
      userId: signals.userId,
      tenantId: signals.tenantId,
      validationOrientation: String(persona.validationOrientation) as any,
      governanceOrientation: String(persona.governanceOrientation) as any,
      riskOrientation: String(persona.riskOrientation) as any,
      communicationOrientation: String(persona.communicationOrientation) as any,
      primaryPersona: persona.compositePersona as any,
      personaConfidence: String(persona.confidence) as any,
    });
  }

  // Upsert difficulty profile
  const existingDiff = await db
    .select({ id: ailDifficultyProfiles.id })
    .from(ailDifficultyProfiles)
    .where(eq(ailDifficultyProfiles.userId, signals.userId))
    .limit(1);

  if (existingDiff[0]) {
    await db
      .update(ailDifficultyProfiles)
      .set({
        signalClarity: difficulty.signalClarity,
        ambiguity: difficulty.ambiguity,
        politicalComplexity: difficulty.politicalComplexity,
        informationalCompleteness: difficulty.informationalCompleteness,
        timePressure: difficulty.timePressure,
        consequenceVisibility: difficulty.consequenceVisibility,
      })
      .where(eq(ailDifficultyProfiles.userId, signals.userId));
  } else {
    await db.insert(ailDifficultyProfiles).values({
      id: nanoid(),
      userId: signals.userId,
      tenantId: signals.tenantId,
      signalClarity: difficulty.signalClarity,
      ambiguity: difficulty.ambiguity,
      politicalComplexity: difficulty.politicalComplexity,
      informationalCompleteness: difficulty.informationalCompleteness,
      timePressure: difficulty.timePressure,
      consequenceVisibility: difficulty.consequenceVisibility,
    });
  }

  // Upsert UIP record
  const existingUip = await db
    .select({ id: ailUserIntelligenceProfiles.id })
    .from(ailUserIntelligenceProfiles)
    .where(eq(ailUserIntelligenceProfiles.userId, signals.userId))
    .limit(1);

  if (!existingUip[0]) {
    await db.insert(ailUserIntelligenceProfiles).values({
      id: nanoid(),
      userId: signals.userId,
      tenantId: signals.tenantId,
      totalSimulationsCompleted: 0,
      totalAssessmentsCompleted: 0,
      platformEngagementScore: "0.00" as any,
    });
  }
}

/**
 * Returns the cold start state for a user — whether it's complete and
 * what the current confidence level is.
 */
export async function getColdStartState(userId: string): Promise<{
  coldStartComplete: boolean;
  personaConfidence: number;
  totalSimulations: number;
  totalAssessments: number;
}> {
  const db = await getDb();
  if (!db) return { coldStartComplete: false, personaConfidence: 0, totalSimulations: 0, totalAssessments: 0 };

    const [uipRow] = await db
    .select({
      totalSimulationsCompleted: ailUserIntelligenceProfiles.totalSimulationsCompleted,
      totalAssessmentsCompleted: ailUserIntelligenceProfiles.totalAssessmentsCompleted,
    })
    .from(ailUserIntelligenceProfiles)
    .where(eq(ailUserIntelligenceProfiles.userId, userId))
    .limit(1);
  const [personaRow] = await db
    .select({ personaConfidence: ailPersonaProfiles.personaConfidence })
    .from(ailPersonaProfiles)
    .where(eq(ailPersonaProfiles.userId, userId))
    .limit(1);
  const confidence = parseFloat(String(personaRow?.personaConfidence ?? 0));
  return {
    coldStartComplete: confidence >= 0.3,
    personaConfidence: confidence,
    totalSimulations: uipRow?.totalSimulationsCompleted ?? 0,
    totalAssessments: uipRow?.totalAssessmentsCompleted ?? 0,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferCompositePersona(
  validationOrientation: number,
  governanceOrientation: number,
  riskOrientation: number,
): string {
  if (validationOrientation >= 65 && governanceOrientation >= 65) {
    return "strong_validator";
  }
  if (validationOrientation <= 35 && riskOrientation >= 65) {
    return "overconfident_decision_maker";
  }
  if (riskOrientation <= 35) {
    return "risk_averse_escalator";
  }
  if (validationOrientation <= 40 && governanceOrientation <= 40) {
    return "passive_deferrer";
  }
  if (governanceOrientation >= 70) {
    return "governance_anchor";
  }
  return "strong_validator"; // Default to positive starting assumption
}

function buildNarrativeContext(
  signals: OnboardingSignals,
  compositePersona: string,
): string {
  const personaDescriptions: Record<string, string> = {
    strong_validator: "demonstrates strong validation instincts and governance awareness",
    overconfident_decision_maker: "shows confidence in decision-making that will be tested under ambiguity",
    risk_averse_escalator: "tends toward caution and escalation, which will be challenged by time-pressured scenarios",
    passive_deferrer: "shows a pattern of deference that will be directly tested in governance scenarios",
    governance_anchor: "demonstrates strong governance orientation that will be tested under senior pressure",
  };

  const desc = personaDescriptions[compositePersona] ?? "brings a balanced approach to HR decision-making";

  return `Based on your profile as a ${signals.experienceLevel}-level HR professional in ${signals.primaryDomain}, ` +
    `with ${signals.aiUsageLevel} AI tool usage and ${signals.governanceFamiliarity} governance familiarity, ` +
    `your initial assessment suggests you ${desc}. ` +
    `Your simulations have been calibrated to your experience level and will adapt as you progress.`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
