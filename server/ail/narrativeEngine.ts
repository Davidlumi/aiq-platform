/**
 * Narrative Engine
 * Manages multi-simulation storylines, recurring stakeholders,
 * consequence threads, and evolving business context.
 */

import { nanoid } from "nanoid";
import { getDb } from "../db";
import { eq, and, desc } from "drizzle-orm";
import {
  ailNarrativeState,
  ailStakeholderRelationships,
  ailNarrativeEvents,
  ailNarrativeThreads,
} from "../../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmotionalState =
  | "collaborative" | "pressured" | "defensive" | "frustrated"
  | "distressed" | "confident" | "suspicious" | "resigned";

export type TrustLevel = "high" | "moderate" | "low" | "broken";

export interface StakeholderUpdate {
  stakeholderId: string;
  stakeholderName: string;
  stakeholderRole: string;
  relationshipDelta: number;         // -5 to +5 change
  newEmotionalState?: EmotionalState;
  historyEntry?: string;
}

export interface NarrativeStateUpdate {
  legalRiskDelta?: number;           // changes legal_risk_level
  employeeRelationsDelta?: number;   // -20 to +20
  regulatoryStandingDelta?: number;  // -20 to +20
  csuiteConfidenceDelta?: number;    // -20 to +20
  boardConfidenceDelta?: number;     // -20 to +20
}

export interface NarrativeEventInput {
  userId: string;
  tenantId: string;
  simulationId?: string;
  eventType: "decision" | "consequence" | "external_event";
  description: string;
  stakeholdersInvolved?: string[];
  consequenceForFuture?: string;
}

export interface NarrativeContext {
  narrativeState: {
    legalRiskLevel: string;
    employeeRelationsScore: number;
    regulatoryStandingScore: number;
    csuiteConfidenceInHr: number;
    boardConfidenceInHr: number;
  };
  activeThreads: Array<{
    threadName: string;
    threadType: string;
    currentStatus: string;
    nextExpectedEvent: string | null;
  }>;
  recentEvents: Array<{
    description: string;
    consequenceForFuture: string | null;
    occurredAt: Date;
  }>;
  stakeholderRelationships: Array<{
    stakeholderName: string;
    stakeholderRole: string;
    trustLevel: string;
    currentEmotionalState: string;
    relationshipScore: number;
  }>;
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Ensure a narrative state record exists for a user.
 */
export async function ensureNarrativeState(userId: string, tenantId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select({ id: ailNarrativeState.id })
    .from(ailNarrativeState)
    .where(eq(ailNarrativeState.userId, userId))
    .limit(1);

  if (!existing[0]) {
    await db.insert(ailNarrativeState).values({
      id: nanoid(),
      userId,
      tenantId,
      legalRiskLevel: "low",
      employeeRelationsScore: 70,
      regulatoryStandingScore: 80,
      csuiteConfidenceInHr: 60,
      boardConfidenceInHr: 60,
    });
  }
}

/**
 * Update narrative state after a simulation completes.
 * Consequences of decisions ripple into the ongoing story.
 */
export async function updateNarrativeState(
  userId: string,
  update: NarrativeStateUpdate
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const current = await db
    .select()
    .from(ailNarrativeState)
    .where(eq(ailNarrativeState.userId, userId))
    .limit(1);

  if (!current[0]) return;

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  // Compute new legal risk level from delta
  const legalRiskOrder = ["low", "moderate", "high", "critical"];
  const currentLegalIdx = legalRiskOrder.indexOf(current[0].legalRiskLevel ?? "low");
  let newLegalIdx = currentLegalIdx;
  if (update.legalRiskDelta) {
    newLegalIdx = clamp(currentLegalIdx + update.legalRiskDelta, 0, 3);
  }

  await db
    .update(ailNarrativeState)
    .set({
      legalRiskLevel: legalRiskOrder[newLegalIdx] as any,
      employeeRelationsScore: update.employeeRelationsDelta
        ? clamp(current[0].employeeRelationsScore + update.employeeRelationsDelta, 0, 100)
        : current[0].employeeRelationsScore,
      regulatoryStandingScore: update.regulatoryStandingDelta
        ? clamp(current[0].regulatoryStandingScore + update.regulatoryStandingDelta, 0, 100)
        : current[0].regulatoryStandingScore,
      csuiteConfidenceInHr: update.csuiteConfidenceDelta
        ? clamp(current[0].csuiteConfidenceInHr + update.csuiteConfidenceDelta, 0, 100)
        : current[0].csuiteConfidenceInHr,
      boardConfidenceInHr: update.boardConfidenceDelta
        ? clamp(current[0].boardConfidenceInHr + update.boardConfidenceDelta, 0, 100)
        : current[0].boardConfidenceInHr,
      updatedAt: new Date(),
    })
    .where(eq(ailNarrativeState.userId, userId));
}

/**
 * Update a stakeholder relationship after a simulation.
 */
export async function updateStakeholderRelationship(
  userId: string,
  tenantId: string,
  update: StakeholderUpdate
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(ailStakeholderRelationships)
    .where(
      and(
        eq(ailStakeholderRelationships.userId, userId),
        eq(ailStakeholderRelationships.stakeholderId, update.stakeholderId)
      )
    )
    .limit(1);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  if (existing[0]) {
    const newScore = clamp(existing[0].relationshipScore + update.relationshipDelta, -10, 10);
    const newTrust: TrustLevel =
      newScore >= 6 ? "high" :
      newScore >= 2 ? "moderate" :
      newScore >= -3 ? "low" : "broken";

    const history = JSON.parse(existing[0].knownHistoryJson ?? "[]") as string[];
    if (update.historyEntry) history.push(update.historyEntry);

    await db
      .update(ailStakeholderRelationships)
      .set({
        relationshipScore: newScore,
        trustLevel: newTrust,
        currentEmotionalState: update.newEmotionalState ?? existing[0].currentEmotionalState,
        knownHistoryJson: JSON.stringify(history.slice(-10)), // keep last 10 entries
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ailStakeholderRelationships.userId, userId),
          eq(ailStakeholderRelationships.stakeholderId, update.stakeholderId)
        )
      );
  } else {
    const initialScore = clamp(update.relationshipDelta, -10, 10);
    const initialTrust: TrustLevel =
      initialScore >= 6 ? "high" :
      initialScore >= 2 ? "moderate" :
      initialScore >= -3 ? "low" : "broken";

    await db.insert(ailStakeholderRelationships).values({
      id: nanoid(),
      userId,
      tenantId,
      stakeholderId: update.stakeholderId,
      stakeholderName: update.stakeholderName,
      stakeholderRole: update.stakeholderRole,
      relationshipScore: initialScore,
      trustLevel: initialTrust,
      currentEmotionalState: update.newEmotionalState ?? "collaborative",
      knownHistoryJson: JSON.stringify(update.historyEntry ? [update.historyEntry] : []),
    });
  }
}

/**
 * Record a narrative event (decision, consequence, or external event).
 */
export async function recordNarrativeEvent(input: NarrativeEventInput): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(ailNarrativeEvents).values({
    id: nanoid(),
    userId: input.userId,
    tenantId: input.tenantId,
    simulationId: input.simulationId,
    eventType: input.eventType,
    description: input.description,
    stakeholdersInvolvedJson: JSON.stringify(input.stakeholdersInvolved ?? []),
    consequenceForFuture: input.consequenceForFuture,
    occurredAt: new Date(),
  });
}

/**
 * Open or update a narrative thread (a storyline that spans multiple simulations).
 */
export async function upsertNarrativeThread(
  userId: string,
  tenantId: string,
  threadName: string,
  threadType: "consequence" | "escalation" | "relationship",
  simulationId?: string,
  nextExpectedEvent?: string,
  status?: "active" | "resolved" | "escalated"
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(ailNarrativeThreads)
    .where(
      and(
        eq(ailNarrativeThreads.userId, userId),
        eq(ailNarrativeThreads.threadName, threadName)
      )
    )
    .limit(1);

  if (existing[0]) {
    const relatedSims = JSON.parse(existing[0].relatedSimulationsJson ?? "[]") as string[];
    if (simulationId && !relatedSims.includes(simulationId)) relatedSims.push(simulationId);

    await db
      .update(ailNarrativeThreads)
      .set({
        currentStatus: status ?? existing[0].currentStatus,
        nextExpectedEvent: nextExpectedEvent ?? existing[0].nextExpectedEvent,
        relatedSimulationsJson: JSON.stringify(relatedSims),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ailNarrativeThreads.userId, userId),
          eq(ailNarrativeThreads.threadName, threadName)
        )
      );
  } else {
    await db.insert(ailNarrativeThreads).values({
      id: nanoid(),
      userId,
      tenantId,
      threadName,
      threadType,
      startedInSimulationId: simulationId,
      currentStatus: status ?? "active",
      nextExpectedEvent: nextExpectedEvent,
      relatedSimulationsJson: JSON.stringify(simulationId ? [simulationId] : []),
    });
  }
}

/**
 * Get the full narrative context for a user — used to inject into simulation prompts.
 */
export async function getNarrativeContext(userId: string): Promise<NarrativeContext | null> {
  const db = await getDb();
  if (!db) return null;

  const [narrativeState, threads, events, stakeholders] = await Promise.all([
    db.select().from(ailNarrativeState).where(eq(ailNarrativeState.userId, userId)).limit(1),
    db.select().from(ailNarrativeThreads).where(
      and(eq(ailNarrativeThreads.userId, userId), eq(ailNarrativeThreads.currentStatus, "active"))
    ),
    db.select().from(ailNarrativeEvents)
      .where(eq(ailNarrativeEvents.userId, userId))
      .orderBy(desc(ailNarrativeEvents.occurredAt))
      .limit(5),
    db.select().from(ailStakeholderRelationships).where(eq(ailStakeholderRelationships.userId, userId)),
  ]);

  if (!narrativeState[0]) return null;

  return {
    narrativeState: {
      legalRiskLevel: narrativeState[0].legalRiskLevel,
      employeeRelationsScore: narrativeState[0].employeeRelationsScore,
      regulatoryStandingScore: narrativeState[0].regulatoryStandingScore,
      csuiteConfidenceInHr: narrativeState[0].csuiteConfidenceInHr,
      boardConfidenceInHr: narrativeState[0].boardConfidenceInHr,
    },
    activeThreads: threads.map(t => ({
      threadName: t.threadName,
      threadType: t.threadType,
      currentStatus: t.currentStatus,
      nextExpectedEvent: t.nextExpectedEvent ?? null,
    })),
    recentEvents: events.map(e => ({
      description: e.description,
      consequenceForFuture: e.consequenceForFuture ?? null,
      occurredAt: e.occurredAt,
    })),
    stakeholderRelationships: stakeholders.map(s => ({
      stakeholderName: s.stakeholderName,
      stakeholderRole: s.stakeholderRole,
      trustLevel: s.trustLevel,
      currentEmotionalState: s.currentEmotionalState,
      relationshipScore: s.relationshipScore,
    })),
  };
}
