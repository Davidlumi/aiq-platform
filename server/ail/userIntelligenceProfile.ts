/**
 * User Intelligence Profile (UIP)
 * Central orchestrator connecting all AIL subsystems.
 * Provides pre-simulation and post-simulation processing pipelines.
 */

import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { ailUserIntelligenceProfiles } from "../../drizzle/schema";

import {
  processSimulationCompletion,
  processAssessmentCompletion,
  getSignalLedger,
  getFailureModeRegistry,
  getPendingRetests,
  type SimulationCompletionData,
  type AssessmentCompletionData,
} from "./crossSimulationMemory";

import {
  updatePersonaProfile,
  generatePersonaNarrative,
  getPersonaProfile,
  getPersonaAdaptedParameters,
  type PersonaType,
} from "./personaClassificationEngine";

import {
  generateSimulationContextInjection,
  getOrgContext,
  type SimulationContextInjection,
} from "./organisationContextLayer";

import {
  ensureNarrativeState,
  updateNarrativeState,
  updateStakeholderRelationship,
  recordNarrativeEvent,
  upsertNarrativeThread,
  getNarrativeContext,
  type NarrativeStateUpdate,
  type StakeholderUpdate,
  type NarrativeEventInput,
} from "./narrativeEngine";

import {
  getStakeholderBehaviourProfiles,
  getOrganisationalClimate,
  computeEmotionalStateTransition,
  type EmotionalState,
} from "./emotionalDynamicsLayer";

import {
  getDifficultyProfile,
  updateDifficultyProfile,
  difficultyProfileToSimulationConfig,
  type SimulationPerformance,
} from "./adaptiveDifficultyEngineV2";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreSimulationContext {
  // Difficulty configuration for this simulation
  difficultyConfig: ReturnType<typeof difficultyProfileToSimulationConfig>;
  // Persona-adapted parameters
  personaParameters: ReturnType<typeof getPersonaAdaptedParameters>;
  // Organisation context injection
  orgContextInjection: SimulationContextInjection;
  // Narrative context (what has happened before)
  narrativeContext: Awaited<ReturnType<typeof getNarrativeContext>>;
  // Stakeholder behaviour profiles
  stakeholderProfiles: Awaited<ReturnType<typeof getStakeholderBehaviourProfiles>>;
  // Organisational climate
  organisationalClimate: Awaited<ReturnType<typeof getOrganisationalClimate>>;
  // Pending retests to inject
  pendingRetests: Awaited<ReturnType<typeof getPendingRetests>>;
}

export interface PostSimulationInput {
  userId: string;
  tenantId: string;
  simulationId: string;
  // Signal deltas from this simulation
  signalDeltas: Record<string, number>;
  // Failure modes triggered
  failureModesTriggered: string[];
  // Performance scores per dimension
  performance: SimulationPerformance;
  // Narrative updates
  narrativeStateUpdate?: NarrativeStateUpdate;
  stakeholderUpdates?: StakeholderUpdate[];
  narrativeEvents?: Omit<NarrativeEventInput, "userId" | "tenantId">[];
  narrativeThreads?: Array<{
    threadName: string;
    threadType: "consequence" | "escalation" | "relationship";
    nextExpectedEvent?: string;
    status?: "active" | "resolved" | "escalated";
  }>;
  // Whether the user stood firm under pressure and communicated well
  userStoodFirm?: boolean;
  userCommunicatedWell?: boolean;
  pathTaken?: string;
  finalScore: number;
}

// ─── Pre-Simulation Orchestration (7-step) ───────────────────────────────────

/**
 * Step 1-7: Gather all context needed to configure the next simulation.
 * Called immediately before a simulation starts.
 */
export async function preSimulationOrchestration(
  userId: string,
  tenantId: string
): Promise<PreSimulationContext> {
  // Ensure narrative state exists
  await ensureNarrativeState(userId, tenantId);

  // Run all context gathering in parallel
  const [
    difficultyProfile,
    personaProfile,
    orgContextInjection,
    narrativeContext,
    stakeholderProfiles,
    organisationalClimate,
    pendingRetests,
  ] = await Promise.all([
    getDifficultyProfile(userId, tenantId),                    // Step 1: Difficulty calibration
    getPersonaProfile(userId),                                  // Step 2: Persona retrieval
    generateSimulationContextInjection(tenantId),               // Step 3: Org context injection
    getNarrativeContext(userId),                                // Step 4: Narrative context
    getStakeholderBehaviourProfiles(userId),                    // Step 5: Stakeholder profiles
    getOrganisationalClimate(userId),                           // Step 6: Org climate
    getPendingRetests(userId),                                  // Step 7: Pending retests
  ]);

  const difficultyConfig = difficultyProfileToSimulationConfig(difficultyProfile);
  const personaType = (personaProfile?.primaryPersona ?? "unclassified") as PersonaType;
  const personaParameters = getPersonaAdaptedParameters(personaType);

  return {
    difficultyConfig,
    personaParameters,
    orgContextInjection,
    narrativeContext,
    stakeholderProfiles,
    organisationalClimate,
    pendingRetests,
  };
}

// ─── Post-Simulation Orchestration (7-step) ──────────────────────────────────

/**
 * Step 1-7: Process all outcomes after a simulation completes.
 * Called immediately after a simulation session ends.
 */
export async function postSimulationOrchestration(input: PostSimulationInput): Promise<void> {
  const {
    userId, tenantId, simulationId,
    signalDeltas, failureModesTriggered, performance,
    narrativeStateUpdate, stakeholderUpdates, narrativeEvents, narrativeThreads,
    userStoodFirm = false, userCommunicatedWell = false,
    pathTaken = "default", finalScore,
  } = input;

  // Step 1: Update Cross-Simulation Memory (signal ledger + failure mode registry)
  await processSimulationCompletion({
    userId, tenantId, simulationId,
    signalDeltas, failureModesTriggered,
    openResponseScores: [],
    pathTaken, finalScore,
  });

  // Step 2: Update Persona Classification Engine
  await updatePersonaProfile(userId, tenantId);

  // Step 3: Update Difficulty Profile
  await updateDifficultyProfile(userId, tenantId, simulationId, performance);

  // Step 4: Update Narrative State
  if (narrativeStateUpdate) {
    await updateNarrativeState(userId, narrativeStateUpdate);
  }

  // Step 5: Update Stakeholder Relationships and Emotional States
  if (stakeholderUpdates) {
    for (const update of stakeholderUpdates) {
      // Compute emotional state transition
      const profiles = await getStakeholderBehaviourProfiles(userId);
      const existingProfile = profiles.find(p => p.stakeholderId === update.stakeholderId);
      if (existingProfile) {
        const newEmotionalState = computeEmotionalStateTransition(
          existingProfile.currentEmotionalState,
          update.relationshipDelta,
          userStoodFirm,
          userCommunicatedWell
        );
        update.newEmotionalState = newEmotionalState;
      }
      await updateStakeholderRelationship(userId, tenantId, update);
    }
  }

  // Step 6: Record Narrative Events
  if (narrativeEvents) {
    for (const event of narrativeEvents) {
      await recordNarrativeEvent({ userId, tenantId, simulationId, ...event });
    }
  }

  // Step 7: Update Narrative Threads
  if (narrativeThreads) {
    for (const thread of narrativeThreads) {
      await upsertNarrativeThread(
        userId, tenantId,
        thread.threadName, thread.threadType,
        simulationId,
        thread.nextExpectedEvent,
        thread.status
      );
    }
  }

  // Async: Generate persona narrative (non-blocking)
  generatePersonaNarrative(userId).catch(() => {});
}

/**
 * Process assessment completion through the AIL.
 */
export async function processAssessmentThroughAIL(
  data: AssessmentCompletionData
): Promise<void> {
  await processAssessmentCompletion(data);
  await updatePersonaProfile(data.userId, data.tenantId);
  generatePersonaNarrative(data.userId).catch(() => {});
}

/**
 * Get the full User Intelligence Profile for a user.
 */
export async function getUserIntelligenceProfile(userId: string, tenantId: string) {
  const db = await getDb();
  if (!db) return null;

  const [uip, signalLedger, failureModes, personaProfile, pendingRetests, narrativeContext, orgClimate] =
    await Promise.all([
      db.select().from(ailUserIntelligenceProfiles)
        .where(eq(ailUserIntelligenceProfiles.userId, userId)).limit(1),
      getSignalLedger(userId),
      getFailureModeRegistry(userId),
      getPersonaProfile(userId),
      getPendingRetests(userId),
      getNarrativeContext(userId),
      getOrganisationalClimate(userId),
    ]);

  if (!uip[0]) return null;

  return {
    profile: uip[0],
    signalLedger,
    failureModes,
    personaProfile,
    pendingRetests,
    narrativeContext,
    organisationalClimate: orgClimate,
  };
}
