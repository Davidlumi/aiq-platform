/**
 * AiQ Coach — Memory Service
 * Governed write path per Addendum v1.1 §5
 * Handles: evidence validation, conflict detection, decay, supersession
 */

import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { userCapabilityMemory } from "../../drizzle/schema";
import { auditLogWriter } from "./auditLog";
import type {
  MemoryWriteProposal,
  MemoryWriteResult,
  CoachMode,
} from "./types";

/** Minimum confidence to commit a memory write (0–100 integer) */
const MIN_CONFIDENCE_TO_WRITE = 65;

/** Confidence below which we mark existing memory as contested */
const CONFLICT_CONFIDENCE_THRESHOLD = 50;

export class MemoryService {
  /**
   * Propose a memory write. Applies governance rules before writing.
   * Returns whether the write was committed and why.
   */
  async proposeWrite(
    proposal: MemoryWriteProposal,
    tenantId: string,
    userId: string,
    gamingFlagged: boolean
  ): Promise<MemoryWriteResult> {
    // Rule 1: Never write on gaming-flagged turns
    if (gamingFlagged) {
      return { written: false, reason: "gaming_flagged" };
    }

    // Rule 2: Confidence gate
    if (proposal.confidence < MIN_CONFIDENCE_TO_WRITE) {
      return { written: false, reason: "insufficient_confidence" };
    }

    const db = await getDb();
    if (!db) return { written: false, reason: "ok" };

    // Rule 3: Check for conflicting existing memory
    const existing = await db
      .select()
      .from(userCapabilityMemory)
      .where(
        and(
          eq(userCapabilityMemory.userId, userId),
          eq(userCapabilityMemory.capabilityDomain, proposal.capabilityDomain),
          eq(userCapabilityMemory.signalKey, proposal.signalKey)
        )
      )
      .limit(1);

    const existingRecord = existing[0];

    if (existingRecord) {
      // If existing memory has higher confidence, mark new proposal as contested
      if (existingRecord.confidence > proposal.confidence + 10) {
        await auditLogWriter.write({
          eventType: "memory.conflict",
          tenantId,
          userId,
          sessionId: proposal.evidence.sessionId,
          turnId: proposal.evidence.turnId,
          payload: {
            existingMemoryId: existingRecord.id,
            proposedConfidence: proposal.confidence,
            existingConfidence: existingRecord.confidence,
            domain: proposal.capabilityDomain,
            signal: proposal.signalKey,
          },
        });
        return { written: false, reason: "conflict_detected" };
      }

      // Supersede the existing record
      await db
        .update(userCapabilityMemory)
        .set({
          conflictStatus: "superseded",
          supersededById: "pending", // will update after insert
        })
        .where(eq(userCapabilityMemory.id, existingRecord.id));
    }

    // Write the new memory record
    const newId = randomUUID();
    await db.insert(userCapabilityMemory).values({
      id: newId,
      tenantId,
      userId,
      capabilityDomain: proposal.capabilityDomain,
      signalKey: proposal.signalKey,
      memoryType: proposal.memoryType,
      confidence: proposal.confidence,
      sourceTurnId: proposal.evidence.turnId,
      sourceSessionId: proposal.evidence.sessionId,
      sourceMode: proposal.evidence.mode,
      summary: proposal.summary,
      evidenceJson: proposal.evidence,
      conflictStatus: "none",
      lastReinforcedAt: new Date(),
    });

    // Update superseded record with the new ID
    if (existingRecord) {
      await db
        .update(userCapabilityMemory)
        .set({ supersededById: newId })
        .where(eq(userCapabilityMemory.id, existingRecord.id));
    }

    // Audit the write
    await auditLogWriter.write({
      eventType: "memory.write",
      tenantId,
      userId,
      sessionId: proposal.evidence.sessionId,
      turnId: proposal.evidence.turnId,
      payload: {
        memoryId: newId,
        domain: proposal.capabilityDomain,
        signal: proposal.signalKey,
        memoryType: proposal.memoryType,
        confidence: proposal.confidence,
        superseded: existingRecord?.id,
      },
    });

    return { written: true, memoryId: newId, reason: "ok" };
  }

  /**
   * Retrieve all memory for a user, optionally filtered by domain.
   */
  async getMemory(
    userId: string,
    tenantId: string,
    domain?: string
  ) {
    const db = await getDb();
    if (!db) return [];

    const conditions = [
      eq(userCapabilityMemory.userId, userId),
      eq(userCapabilityMemory.tenantId, tenantId),
      eq(userCapabilityMemory.conflictStatus, "none"),
    ];

    if (domain) {
      conditions.push(eq(userCapabilityMemory.capabilityDomain, domain));
    }

    return db
      .select()
      .from(userCapabilityMemory)
      .where(and(...conditions));
  }

  /**
   * Reinforce an existing memory (update lastReinforcedAt and optionally boost confidence).
   */
  async reinforce(memoryId: string, confidenceBoost = 0): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const existing = await db
      .select()
      .from(userCapabilityMemory)
      .where(eq(userCapabilityMemory.id, memoryId))
      .limit(1);

    if (!existing[0]) return;

    const newConfidence = Math.min(100, existing[0].confidence + confidenceBoost);

    await db
      .update(userCapabilityMemory)
      .set({
        confidence: newConfidence,
        lastReinforcedAt: new Date(),
      })
      .where(eq(userCapabilityMemory.id, memoryId));
  }
}

export const memoryService = new MemoryService();
