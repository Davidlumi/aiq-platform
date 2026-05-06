/**
 * AiQ Coach — Audit Log Writer
 * Immutable append-only event log per Addendum v1.1 §7
 * EU AI Act Art. 12 / Art. 17 compliance
 */

import { getDb } from "../db";
import { coachAuditLog } from "../../drizzle/schema";
import { randomUUID } from "crypto";
import type { AuditEvent } from "./types";

export class AuditLogWriter {
  /**
   * Write a single audit event. Fire-and-forget — never throws.
   * Errors are logged to stderr but do not propagate to the caller.
   */
  async write(event: AuditEvent): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;
      await db.insert(coachAuditLog).values({
        id: randomUUID(),
        tenantId: event.tenantId,
        userId: event.userId,
        eventType: event.eventType,
        sessionId: event.sessionId,
        turnId: event.turnId,
        payloadJson: event.payload,
        classifierVersion: event.classifierVersion,
        promptVersion: event.promptVersion,
      });
    } catch (err) {
      // Never let audit failures propagate — log to stderr
      console.error("[AuditLogWriter] Failed to write event:", event.eventType, err);
    }
  }

  /**
   * Write multiple events in sequence. Fire-and-forget.
   */
  async writeBatch(events: AuditEvent[]): Promise<void> {
    for (const event of events) {
      await this.write(event);
    }
  }
}

// Singleton instance
export const auditLogWriter = new AuditLogWriter();
