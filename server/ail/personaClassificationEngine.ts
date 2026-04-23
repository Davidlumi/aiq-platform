/**
 * Persona Classification Engine (PCE)
 * Dynamically classifies users into behavioural personas based on accumulated
 * signal data. Updates after every simulation/assessment completion.
 */

import { nanoid } from "nanoid";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { ailPersonaProfiles, ailSignalLedger, ailFailureModeRegistry } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { getPersonaLabel } from "../assessment/featureFlags";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PersonaType =
  | "strong_validator"
  | "overconfident_decision_maker"
  | "risk_averse_escalator"
  | "passive_deferrer"
  | "governance_anchor_under_pressure"
  | "unclassified";

export interface DimensionScores {
  validationOrientation: number;    // 0=Blind Acceptor, 10=Strong Validator
  governanceOrientation: number;    // 0=Governance Deferrer, 10=Governance Anchor
  riskOrientation: number;          // 0=Risk Dismisser/Polariser, 10=Calibrated
  communicationOrientation: number; // 0=Technical Retreater, 10=Executive Communicator
}

export interface PressureSensitivity {
  ceoPresure: Partial<DimensionScores>;
  cfoPressure: Partial<DimensionScores>;
  timePressure: Partial<DimensionScores>;
  legalPressure: Partial<DimensionScores>;
}

// Signal → dimension mapping
// Positive signals increase the dimension; negative signals decrease it
const SIGNAL_TO_DIMENSION: Record<string, { dimension: keyof DimensionScores; weight: number }> = {
  // Validation orientation signals
  validation_accuracy: { dimension: "validationOrientation", weight: 1.5 },
  blind_acceptance_risk: { dimension: "validationOrientation", weight: -1.5 },
  critical_thinking: { dimension: "validationOrientation", weight: 1.0 },
  hallucination_acceptance: { dimension: "validationOrientation", weight: -2.0 },

  // Governance orientation signals
  governance_quality: { dimension: "governanceOrientation", weight: 1.5 },
  appropriateness_boundary: { dimension: "governanceOrientation", weight: 1.0 },
  governance_knowledge: { dimension: "governanceOrientation", weight: 1.0 },
  governance_bypass_risk: { dimension: "governanceOrientation", weight: -2.0 },
  proxy_discrimination_risk: { dimension: "governanceOrientation", weight: -1.5 },

  // Risk orientation signals
  data_interpretation_quality: { dimension: "riskOrientation", weight: 1.5 },
  risk_identification: { dimension: "riskOrientation", weight: 1.0 },
  calibration_quality: { dimension: "riskOrientation", weight: 1.0 },
  over_caution_risk: { dimension: "riskOrientation", weight: -1.0 },
  risk_dismissal: { dimension: "riskOrientation", weight: -1.5 },

  // Communication orientation signals
  communication_quality: { dimension: "communicationOrientation", weight: 1.5 },
  stakeholder_management: { dimension: "communicationOrientation", weight: 1.0 },
  executive_communication: { dimension: "communicationOrientation", weight: 1.5 },
  jargon_overuse: { dimension: "communicationOrientation", weight: -1.0 },
};

// Persona classification rules — composite dimension thresholds
function classifyPersona(dims: DimensionScores): { persona: PersonaType; confidence: number } {
  const { validationOrientation: v, governanceOrientation: g, riskOrientation: r, communicationOrientation: c } = dims;

  // Strong Validator: high on all dimensions
  if (v >= 7 && g >= 7 && r >= 6 && c >= 6) {
    return { persona: "strong_validator", confidence: Math.min(1, (v + g + r + c) / 40) };
  }

  // Overconfident Decision-Maker: low validation + low governance + high communication
  if (v <= 4 && g <= 4 && c >= 6) {
    return { persona: "overconfident_decision_maker", confidence: Math.min(1, (10 - v + 10 - g + c) / 30) };
  }

  // Risk-Averse Escalator: high validation + high governance + low risk calibration + low communication
  if (v >= 6 && g >= 6 && r <= 4 && c <= 4) {
    return { persona: "risk_averse_escalator", confidence: Math.min(1, (v + g + 10 - r + 10 - c) / 40) };
  }

  // Passive Deferrer: low on all dimensions
  if (v <= 4 && g <= 4 && r <= 4 && c <= 4) {
    return { persona: "passive_deferrer", confidence: Math.min(1, (10 - v + 10 - g + 10 - r + 10 - c) / 40) };
  }

  // Governance Anchor Under Pressure: high validation + low governance (yields under pressure)
  if (v >= 6 && g <= 5 && r >= 5) {
    return { persona: "governance_anchor_under_pressure", confidence: Math.min(1, (v + 10 - g + r) / 30) };
  }

  return { persona: "unclassified", confidence: 0.1 };
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Update the persona profile for a user based on their current signal ledger.
 * Called after every simulation/assessment completion.
 */
export async function updatePersonaProfile(userId: string, tenantId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get current signal ledger
  const signals = await db
    .select()
    .from(ailSignalLedger)
    .where(eq(ailSignalLedger.userId, userId));

  if (signals.length === 0) return;

  // Compute dimension scores from signal averages
  const dimensionAccumulators: Record<keyof DimensionScores, { total: number; weight: number }> = {
    validationOrientation: { total: 0, weight: 0 },
    governanceOrientation: { total: 0, weight: 0 },
    riskOrientation: { total: 0, weight: 0 },
    communicationOrientation: { total: 0, weight: 0 },
  };

  for (const signal of signals) {
    const mapping = SIGNAL_TO_DIMENSION[signal.signalName];
    if (!mapping) continue;

    const avgScore = parseFloat(String(signal.averageScore));
    // Normalise signal average to 0-10 scale (signals typically range -5 to +5)
    const normalised = Math.max(0, Math.min(10, (avgScore + 5) * 1.0));
    const weighted = normalised * Math.abs(mapping.weight);
    const sign = mapping.weight > 0 ? 1 : -1;

    dimensionAccumulators[mapping.dimension].total += sign * weighted;
    dimensionAccumulators[mapping.dimension].weight += Math.abs(mapping.weight);
  }

  // Convert to 0-10 scale
  const dims: DimensionScores = {
    validationOrientation: 5,
    governanceOrientation: 5,
    riskOrientation: 5,
    communicationOrientation: 5,
  };

  for (const [key, acc] of Object.entries(dimensionAccumulators)) {
    if (acc.weight > 0) {
      const raw = acc.total / acc.weight;
      dims[key as keyof DimensionScores] = Math.max(0, Math.min(10, 5 + raw));
    }
  }

  // Classify persona
  const { persona, confidence } = classifyPersona(dims);

  // Get failure mode patterns to set pattern flags
  const failureModes = await db
    .select()
    .from(ailFailureModeRegistry)
    .where(
      and(
        eq(ailFailureModeRegistry.userId, userId),
        eq(ailFailureModeRegistry.patternFlagged, true)
      )
    );

  const patternFlags = {
    blindAcceptancePattern: failureModes.some(f => f.failureMode === "blind_acceptance"),
    governanceBypassPattern: failureModes.some(f => f.failureMode === "governance_bypass"),
    overCautiousPattern: failureModes.some(f => f.failureMode === "over_cautious"),
    contradictionRigidity: failureModes.some(f => f.failureMode === "contradiction_rigidity"),
    communicationWeakness: failureModes.some(f => f.failureMode === "communication_weakness"),
    highConfidenceOverconfidence: failureModes.some(f => f.failureMode === "high_confidence_overconfidence"),
  };

  // Compute pressure sensitivity (how dimensions shift under different pressure types)
  // This is approximated from governance_bypass and blind_acceptance patterns
  const pressureSensitivity: PressureSensitivity = {
    ceoPresure: {
      governanceOrientation: patternFlags.governanceBypassPattern ? -2 : -0.5,
      validationOrientation: patternFlags.blindAcceptancePattern ? -1 : 0,
    },
    cfoPressure: {
      governanceOrientation: patternFlags.governanceBypassPattern ? -2.5 : -0.8,
      riskOrientation: -0.5,
    },
    timePressure: {
      validationOrientation: patternFlags.blindAcceptancePattern ? -1.5 : -0.5,
      communicationOrientation: -0.5,
    },
    legalPressure: {
      governanceOrientation: 1.0,
      riskOrientation: 0.5,
    },
  };

  // Upsert persona profile
  const existing = await db
    .select({ id: ailPersonaProfiles.id })
    .from(ailPersonaProfiles)
    .where(eq(ailPersonaProfiles.userId, userId))
    .limit(1);

  const profileData = {
    validationOrientation: dims.validationOrientation.toFixed(2) as any,
    governanceOrientation: dims.governanceOrientation.toFixed(2) as any,
    riskOrientation: dims.riskOrientation.toFixed(2) as any,
    communicationOrientation: dims.communicationOrientation.toFixed(2) as any,
    primaryPersona: persona,
    personaConfidence: confidence.toFixed(3) as any,
    pressureSensitivityJson: JSON.stringify(pressureSensitivity),
    ...patternFlags,
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db
      .update(ailPersonaProfiles)
      .set(profileData)
      .where(eq(ailPersonaProfiles.userId, userId));
  } else {
    await db.insert(ailPersonaProfiles).values({
      id: nanoid(),
      userId,
      tenantId,
      ...profileData,
    });
  }
}

/**
 * Generate an LLM narrative summary for the user's persona profile.
 * Called asynchronously after profile update.
 */
export async function generatePersonaNarrative(userId: string): Promise<string> {
  const db = await getDb();
  if (!db) return "";

  const profile = await db
    .select()
    .from(ailPersonaProfiles)
    .where(eq(ailPersonaProfiles.userId, userId))
    .limit(1);

  if (!profile[0]) return "";

  const p = profile[0];
  // WS4.1: Use softened participant-facing labels via feature flag
  const prompt = `You are an expert HR capability assessor. Write a 3-sentence professional narrative summary of this HR professional's behavioural profile in the context of AI governance. Be specific, honest, and constructive. Do not use bullet points.

Profile:
- Primary Persona: ${getPersonaLabel(p.primaryPersona)}
- Validation Orientation: ${p.validationOrientation}/10 (how rigorously they challenge AI outputs)
- Governance Orientation: ${p.governanceOrientation}/10 (how well they hold legal/ethical boundaries under pressure)
- Risk Orientation: ${p.riskOrientation}/10 (how accurately they calibrate risk)
- Communication Orientation: ${p.communicationOrientation}/10 (how effectively they communicate governance issues)
- Pattern Flags: ${[
    p.blindAcceptancePattern && "blind acceptance of AI outputs",
    p.governanceBypassPattern && "governance bypass under senior pressure",
    p.overCautiousPattern && "over-cautious escalation behaviour",
    p.contradictionRigidity && "failure to update position on new evidence",
    p.communicationWeakness && "communication weakness under pressure",
    p.highConfidenceOverconfidence && "overconfidence in incorrect decisions",
  ].filter(Boolean).join(", ") || "no persistent patterns identified yet"}

Write the narrative now:`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "user" as const, content: prompt as string }],
    });
    const rawContent = response.choices?.[0]?.message?.content;
    const narrative = typeof rawContent === "string" ? rawContent : "";

    // Save the narrative
    await db
      .update(ailPersonaProfiles)
      .set({ narrativeSummary: narrative, narrativeUpdatedAt: new Date() })
      .where(eq(ailPersonaProfiles.userId, userId));

    return narrative;
  } catch {
    return "";
  }
}

/**
 * Get the persona profile for a user.
 */
export async function getPersonaProfile(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(ailPersonaProfiles)
    .where(eq(ailPersonaProfiles.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Get simulation parameters adapted for this user's persona.
 */
export function getPersonaAdaptedParameters(persona: PersonaType): {
  stakeholderPressureLevel: "low" | "moderate" | "high" | "maximum";
  contradictionFrequency: "low" | "moderate" | "high" | "maximum";
  openResponseScaffolding: boolean;
  timePressure: "low" | "moderate" | "high";
} {
  const params: Record<PersonaType, ReturnType<typeof getPersonaAdaptedParameters>> = {
    strong_validator: {
      stakeholderPressureLevel: "maximum",
      contradictionFrequency: "high",
      openResponseScaffolding: false,
      timePressure: "high",
    },
    overconfident_decision_maker: {
      stakeholderPressureLevel: "maximum",
      contradictionFrequency: "maximum",
      openResponseScaffolding: false,
      timePressure: "low",
    },
    risk_averse_escalator: {
      stakeholderPressureLevel: "maximum",
      contradictionFrequency: "low",
      openResponseScaffolding: false,
      timePressure: "high",
    },
    passive_deferrer: {
      stakeholderPressureLevel: "moderate",
      contradictionFrequency: "low",
      openResponseScaffolding: true,
      timePressure: "low",
    },
    governance_anchor_under_pressure: {
      stakeholderPressureLevel: "maximum",
      contradictionFrequency: "moderate",
      openResponseScaffolding: false,
      timePressure: "moderate",
    },
    unclassified: {
      stakeholderPressureLevel: "moderate",
      contradictionFrequency: "moderate",
      openResponseScaffolding: false,
      timePressure: "moderate",
    },
  };
  return params[persona];
}
