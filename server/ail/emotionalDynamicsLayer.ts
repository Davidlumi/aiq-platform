/**
 * Emotional Dynamics Layer (EDL)
 * Models stakeholder emotional arcs, relationship scores, and conflict dynamics.
 * Determines how stakeholders behave in each simulation based on history.
 */

import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { ailStakeholderRelationships, ailNarrativeState } from "../../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmotionalState =
  | "collaborative" | "pressured" | "defensive" | "frustrated"
  | "distressed" | "confident" | "suspicious" | "resigned";

export interface StakeholderBehaviourProfile {
  stakeholderId: string;
  stakeholderName: string;
  stakeholderRole: string;
  currentEmotionalState: EmotionalState;
  trustLevel: string;
  relationshipScore: number;
  // How they will behave in the next simulation
  behaviourModifiers: {
    pressureIntensity: "low" | "moderate" | "high" | "maximum";
    willEscalateToBoard: boolean;
    willBypassHR: boolean;
    likelyTactic: string;
    openingTone: string;
  };
}

// Emotional state → behaviour modifier mapping
const EMOTIONAL_BEHAVIOUR_MAP: Record<EmotionalState, {
  pressureIntensity: "low" | "moderate" | "high" | "maximum";
  willEscalateToBoard: boolean;
  willBypassHR: boolean;
  likelyTactic: string;
  openingTone: string;
}> = {
  collaborative: {
    pressureIntensity: "low",
    willEscalateToBoard: false,
    willBypassHR: false,
    likelyTactic: "Presents the request as a shared problem to solve together",
    openingTone: "Warm and collegial — frames the conversation as a partnership",
  },
  pressured: {
    pressureIntensity: "high",
    willEscalateToBoard: false,
    willBypassHR: false,
    likelyTactic: "Emphasises business urgency and personal accountability",
    openingTone: "Tense but professional — makes clear the stakes are high",
  },
  defensive: {
    pressureIntensity: "moderate",
    willEscalateToBoard: false,
    willBypassHR: false,
    likelyTactic: "Deflects responsibility and challenges HR's authority",
    openingTone: "Guarded — questions the basis of HR's involvement",
  },
  frustrated: {
    pressureIntensity: "high",
    willEscalateToBoard: true,
    willBypassHR: false,
    likelyTactic: "Threatens to escalate and questions HR's competence",
    openingTone: "Impatient — signals that previous interactions have not gone well",
  },
  distressed: {
    pressureIntensity: "moderate",
    willEscalateToBoard: false,
    willBypassHR: false,
    likelyTactic: "Appeals to personal relationships and shared history",
    openingTone: "Vulnerable — creates emotional pressure through personal disclosure",
  },
  confident: {
    pressureIntensity: "maximum",
    willEscalateToBoard: true,
    willBypassHR: true,
    likelyTactic: "Presents the decision as already made and HR's role as purely administrative",
    openingTone: "Assertive — treats HR as an obstacle rather than a partner",
  },
  suspicious: {
    pressureIntensity: "moderate",
    willEscalateToBoard: false,
    willBypassHR: false,
    likelyTactic: "Asks pointed questions about HR's motives and data sources",
    openingTone: "Sceptical — challenges every piece of evidence presented",
  },
  resigned: {
    pressureIntensity: "low",
    willEscalateToBoard: false,
    willBypassHR: true,
    likelyTactic: "Stops engaging with HR and routes decisions through legal or finance",
    openingTone: "Disengaged — signals that HR has lost credibility in their eyes",
  },
};

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Get the behaviour profile for all stakeholders the user has encountered.
 * Used to configure stakeholder behaviour in the next simulation.
 */
export async function getStakeholderBehaviourProfiles(
  userId: string
): Promise<StakeholderBehaviourProfile[]> {
  const db = await getDb();
  if (!db) return [];

  const relationships = await db
    .select()
    .from(ailStakeholderRelationships)
    .where(eq(ailStakeholderRelationships.userId, userId));

  return relationships.map(r => {
    const emotionalState = r.currentEmotionalState as EmotionalState;
    const behaviourModifiers = EMOTIONAL_BEHAVIOUR_MAP[emotionalState] ?? EMOTIONAL_BEHAVIOUR_MAP.collaborative;

    return {
      stakeholderId: r.stakeholderId,
      stakeholderName: r.stakeholderName,
      stakeholderRole: r.stakeholderRole,
      currentEmotionalState: emotionalState,
      trustLevel: r.trustLevel,
      relationshipScore: r.relationshipScore,
      behaviourModifiers,
    };
  });
}

/**
 * Compute the emotional state transition after a simulation.
 * Based on what the user did and how the stakeholder was treated.
 */
export function computeEmotionalStateTransition(
  currentState: EmotionalState,
  relationshipDelta: number,
  userStoodFirm: boolean,
  userCommunicatedWell: boolean
): EmotionalState {
  // Positive relationship delta with good communication → moves toward collaborative
  if (relationshipDelta >= 2 && userCommunicatedWell) {
    const positiveTransitions: Partial<Record<EmotionalState, EmotionalState>> = {
      frustrated: "pressured",
      pressured: "collaborative",
      defensive: "suspicious",
      suspicious: "collaborative",
      distressed: "collaborative",
      resigned: "suspicious",
      confident: "pressured",
    };
    return positiveTransitions[currentState] ?? currentState;
  }

  // Negative relationship delta → moves toward more adversarial states
  if (relationshipDelta <= -2) {
    const negativeTransitions: Partial<Record<EmotionalState, EmotionalState>> = {
      collaborative: "pressured",
      pressured: "frustrated",
      frustrated: "confident",
      defensive: "frustrated",
      suspicious: "defensive",
      distressed: "resigned",
      confident: "confident", // already at maximum adversarial
    };
    return negativeTransitions[currentState] ?? currentState;
  }

  // User stood firm but communicated poorly → defensive
  if (userStoodFirm && !userCommunicatedWell) {
    const firmPoorCommsTransitions: Partial<Record<EmotionalState, EmotionalState>> = {
      collaborative: "defensive",
      pressured: "defensive",
      defensive: "frustrated",
    };
    return firmPoorCommsTransitions[currentState] ?? currentState;
  }

  return currentState;
}

/**
 * Generate the emotional framing text for a stakeholder in a simulation.
 * This text is injected into the simulation scenario to set the tone.
 */
export function generateEmotionalFramingText(
  profile: StakeholderBehaviourProfile,
  simulationContext: string
): string {
  const { stakeholderName, stakeholderRole, behaviourModifiers, trustLevel } = profile;

  const trustContext =
    trustLevel === "broken"
      ? `${stakeholderName} has lost confidence in HR following previous interactions.`
      : trustLevel === "low"
      ? `${stakeholderName}'s trust in HR has been strained.`
      : trustLevel === "high"
      ? `${stakeholderName} has a strong working relationship with HR.`
      : "";

  return `${trustContext} ${behaviourModifiers.openingTone}. ${behaviourModifiers.likelyTactic}.`.trim();
}

/**
 * Get the overall organisational emotional climate.
 * Derived from the narrative state — used to set simulation tone.
 */
export async function getOrganisationalClimate(userId: string): Promise<{
  overallTone: "stable" | "tense" | "crisis";
  hrCredibility: "high" | "moderate" | "low" | "compromised";
  description: string;
}> {
  const db = await getDb();
  if (!db) return { overallTone: "stable", hrCredibility: "moderate", description: "" };

  const state = await db
    .select()
    .from(ailNarrativeState)
    .where(eq(ailNarrativeState.userId, userId))
    .limit(1);

  if (!state[0]) return { overallTone: "stable", hrCredibility: "moderate", description: "" };

  const s = state[0];
  const avgConfidence = (s.csuiteConfidenceInHr + s.boardConfidenceInHr) / 2;

  const overallTone =
    s.legalRiskLevel === "critical" || s.employeeRelationsScore < 30
      ? "crisis"
      : s.legalRiskLevel === "high" || s.employeeRelationsScore < 50 || avgConfidence < 40
      ? "tense"
      : "stable";

  const hrCredibility =
    avgConfidence >= 70 ? "high" :
    avgConfidence >= 50 ? "moderate" :
    avgConfidence >= 30 ? "low" : "compromised";

  const descriptions: Record<string, string> = {
    "crisis-compromised": "The organisation is in crisis. HR's credibility is severely damaged. Senior leaders are routing decisions around HR.",
    "crisis-low": "The organisation is in crisis. HR is under significant scrutiny from the board.",
    "tense-low": "The organisational climate is tense. HR's influence is limited and senior leaders are sceptical.",
    "tense-moderate": "There is significant pressure across the organisation. HR is expected to perform under scrutiny.",
    "stable-high": "The organisational climate is stable. HR has strong credibility and is trusted as a strategic partner.",
    "stable-moderate": "The organisation is operating normally. HR has moderate influence and is expected to add value.",
  };

  const key = `${overallTone}-${hrCredibility}`;
  const description = descriptions[key] ?? `Organisational climate: ${overallTone}. HR credibility: ${hrCredibility}.`;

  return { overallTone, hrCredibility, description };
}
