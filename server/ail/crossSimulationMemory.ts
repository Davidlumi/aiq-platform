/**
 * Cross-Simulation Memory (CSM)
 * Stores and analyses behavioural patterns across all completed simulations.
 * Identifies persistent weaknesses and schedules contextual retests.
 */

import { nanoid } from "nanoid";
import { getDb } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  ailUserIntelligenceProfiles,
  ailSignalLedger,
  ailFailureModeRegistry,
  ailRetestQueue,
} from "../../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimulationCompletionData {
  userId: string;
  tenantId: string;
  simulationId: string;
  signalDeltas: Record<string, number>;   // signal_name → delta from this simulation
  failureModesTriggered: string[];        // e.g. ['blind_acceptance', 'governance_bypass']
  openResponseScores: number[];
  pathTaken: string;
  finalScore: number;
}

export interface AssessmentCompletionData {
  userId: string;
  tenantId: string;
  assessmentId: string;
  signalDeltas: Record<string, number>;
  failureModesTriggered: string[];
  finalScore: number;
}

// Pattern detection thresholds
const PATTERN_THRESHOLDS: Record<string, number> = {
  blind_acceptance: 2,
  governance_bypass: 2,
  over_cautious: 2,
  contradiction_rigidity: 2,
  communication_weakness: 3,
  high_confidence_overconfidence: 3,
};

// Failure mode → severity mapping
const FAILURE_MODE_SEVERITY: Record<string, "critical" | "moderate" | "minor"> = {
  blind_acceptance: "critical",
  governance_bypass: "critical",
  hallucination_acceptance: "critical",
  proxy_discrimination: "critical",
  over_cautious: "moderate",
  contradiction_rigidity: "moderate",
  communication_weakness: "minor",
  high_confidence_overconfidence: "moderate",
};

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Process a completed simulation: update signal ledger, failure mode registry,
 * detect patterns, and schedule retests.
 */
export async function processSimulationCompletion(
  data: SimulationCompletionData
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Ensure UIP exists
  await ensureUIP(data.userId, data.tenantId);

  // 1. Update signal ledger
  await updateSignalLedger(data.userId, data.tenantId, data.signalDeltas, data.simulationId);

  // 2. Update failure mode registry
  for (const failureMode of data.failureModesTriggered) {
    await updateFailureModeRegistry(data.userId, data.tenantId, failureMode, data.simulationId);
  }

  // 3. Detect patterns and schedule retests
  await detectPatternsAndScheduleRetests(data.userId, data.tenantId);

  // 4. Increment simulation count on UIP
  await db
    .update(ailUserIntelligenceProfiles)
    .set({
      totalSimulationsCompleted: sql`total_simulations_completed + 1`,
      updatedAt: new Date(),
    })
    .where(eq(ailUserIntelligenceProfiles.userId, data.userId));
}

/**
 * Process a completed assessment: update signal ledger and failure mode registry.
 */
export async function processAssessmentCompletion(
  data: AssessmentCompletionData
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await ensureUIP(data.userId, data.tenantId);
  await updateSignalLedger(data.userId, data.tenantId, data.signalDeltas, undefined);

  for (const failureMode of data.failureModesTriggered) {
    await updateFailureModeRegistry(data.userId, data.tenantId, failureMode, undefined);
  }

  await detectPatternsAndScheduleRetests(data.userId, data.tenantId);

  await db
    .update(ailUserIntelligenceProfiles)
    .set({
      totalAssessmentsCompleted: sql`total_assessments_completed + 1`,
      updatedAt: new Date(),
    })
    .where(eq(ailUserIntelligenceProfiles.userId, data.userId));
}

/**
 * Get the full signal ledger for a user.
 */
export async function getSignalLedger(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ailSignalLedger)
    .where(eq(ailSignalLedger.userId, userId));
}

/**
 * Get the failure mode registry for a user.
 */
export async function getFailureModeRegistry(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ailFailureModeRegistry)
    .where(eq(ailFailureModeRegistry.userId, userId));
}

/**
 * Get pending retests for a user.
 */
export async function getPendingRetests(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ailRetestQueue)
    .where(
      and(
        eq(ailRetestQueue.userId, userId),
        eq(ailRetestQueue.status, "pending")
      )
    );
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function ensureUIP(userId: string, tenantId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select({ id: ailUserIntelligenceProfiles.id })
    .from(ailUserIntelligenceProfiles)
    .where(eq(ailUserIntelligenceProfiles.userId, userId))
    .limit(1);

  if (!existing[0]) {
    await db.insert(ailUserIntelligenceProfiles).values({
      id: nanoid(),
      userId,
      tenantId,
      totalSimulationsCompleted: 0,
      totalAssessmentsCompleted: 0,
      platformEngagementScore: "0.00" as any,
    });
  }
}

async function updateSignalLedger(
  userId: string,
  tenantId: string,
  signalDeltas: Record<string, number>,
  simulationId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const [signalName, delta] of Object.entries(signalDeltas)) {
    const existing = await db
      .select()
      .from(ailSignalLedger)
      .where(
        and(
          eq(ailSignalLedger.userId, userId),
          eq(ailSignalLedger.signalName, signalName)
        )
      )
      .limit(1);

    if (existing[0]) {
      const newTotal = parseFloat(String(existing[0].totalScore)) + delta;
      const newCount = existing[0].observationCount + 1;
      const newAvg = newTotal / newCount;

      // Compute trend from last average
      const prevAvg = parseFloat(String(existing[0].averageScore));
      let trend: "improving" | "stable" | "declining" = "stable";
      if (newAvg > prevAvg + 0.3) trend = "improving";
      else if (newAvg < prevAvg - 0.3) trend = "declining";

      const simulations = JSON.parse(existing[0].simulationsObservedJson || "[]");
      if (simulationId && !simulations.includes(simulationId)) {
        simulations.push(simulationId);
      }

      await db
        .update(ailSignalLedger)
        .set({
          totalScore: newTotal.toFixed(3) as any,
          observationCount: newCount,
          averageScore: newAvg.toFixed(3) as any,
          trend,
          lastObservedAt: new Date(),
          simulationsObservedJson: JSON.stringify(simulations),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ailSignalLedger.userId, userId),
            eq(ailSignalLedger.signalName, signalName)
          )
        );
    } else {
      await db.insert(ailSignalLedger).values({
        id: nanoid(),
        userId,
        tenantId,
        signalName,
        totalScore: delta.toFixed(3) as any,
        observationCount: 1,
        averageScore: delta.toFixed(3) as any,
        trend: "stable",
        lastObservedAt: new Date(),
        simulationsObservedJson: JSON.stringify(simulationId ? [simulationId] : []),
      });
    }
  }
}

async function updateFailureModeRegistry(
  userId: string,
  tenantId: string,
  failureMode: string,
  simulationId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const severity = FAILURE_MODE_SEVERITY[failureMode] ?? "minor";

  const existing = await db
    .select()
    .from(ailFailureModeRegistry)
    .where(
      and(
        eq(ailFailureModeRegistry.userId, userId),
        eq(ailFailureModeRegistry.failureMode, failureMode)
      )
    )
    .limit(1);

  if (existing[0]) {
    const sims = JSON.parse(existing[0].simulationsTriggeredJson || "[]");
    if (simulationId && !sims.includes(simulationId)) sims.push(simulationId);

    const newCount = existing[0].occurrenceCount + 1;
    const threshold = PATTERN_THRESHOLDS[failureMode] ?? 2;
    const patternFlagged = newCount >= threshold;

    await db
      .update(ailFailureModeRegistry)
      .set({
        occurrenceCount: newCount,
        severity,
        simulationsTriggeredJson: JSON.stringify(sims),
        lastOccurrenceAt: new Date(),
        patternFlagged,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ailFailureModeRegistry.userId, userId),
          eq(ailFailureModeRegistry.failureMode, failureMode)
        )
      );
  } else {
    await db.insert(ailFailureModeRegistry).values({
      id: nanoid(),
      userId,
      tenantId,
      failureMode,
      occurrenceCount: 1,
      severity,
      simulationsTriggeredJson: JSON.stringify(simulationId ? [simulationId] : []),
      lastOccurrenceAt: new Date(),
      retestScheduled: false,
      patternFlagged: false,
    });
  }
}

async function detectPatternsAndScheduleRetests(
  userId: string,
  tenantId: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get all failure modes that have crossed the pattern threshold
  const registry = await db
    .select()
    .from(ailFailureModeRegistry)
    .where(
      and(
        eq(ailFailureModeRegistry.userId, userId),
        eq(ailFailureModeRegistry.patternFlagged, true),
        eq(ailFailureModeRegistry.retestScheduled, false)
      )
    );

  for (const entry of registry) {
    // Schedule a retest
    const priority =
      entry.severity === "critical"
        ? "high"
        : entry.severity === "moderate"
        ? "medium"
        : "low";

    await db.insert(ailRetestQueue).values({
      id: nanoid(),
      userId,
      tenantId,
      targetFailureMode: entry.failureMode,
      contextVariation: `Retest for persistent pattern: ${entry.failureMode} (${entry.occurrenceCount} occurrences)`,
      priority,
      scheduledAfterSimulationCount: 1,
      status: "pending",
    });

    // Mark as retest scheduled
    await db
      .update(ailFailureModeRegistry)
      .set({ retestScheduled: true, updatedAt: new Date() })
      .where(
        and(
          eq(ailFailureModeRegistry.userId, userId),
          eq(ailFailureModeRegistry.failureMode, entry.failureMode)
        )
      );
  }
}
