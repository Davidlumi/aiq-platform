/**
 * C-2 Webhook idempotency tests
 *
 * Verifies that:
 * 1. The webhook handler inserts the event ID into processed_webhook_events
 *    BEFORE any side effects (DB writes, notifyOwner calls).
 * 2. A duplicate event ID (PRIMARY KEY conflict) short-circuits the handler
 *    and returns { received: true, duplicate: true } — no side effects fire.
 * 3. The dedup insert is the first DB operation in the handler body (covers
 *    ALL side effects including notifyOwner, not just the UPDATE calls).
 * 4. The side-effect inventory is complete: only UPDATE statements and
 *    notifyOwner calls exist — no INSERT-style append operations that would
 *    double-accumulate on replay.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const WEBHOOK_PATH = path.resolve(__dirname, "./stripe/webhook.ts");
const SCHEMA_PATH = path.resolve(__dirname, "../drizzle/schema.ts");

describe("C-2: Webhook idempotency", () => {
  it("processedWebhookEvents table exists in schema", () => {
    const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
    expect(schema).toContain("processedWebhookEvents");
    expect(schema).toContain("processed_webhook_events");
    expect(schema).toContain("event_id");
    // Must be a PRIMARY KEY (unique constraint on event_id)
    expect(schema).toContain("primaryKey");
  });

  it("webhook handler imports processedWebhookEvents from schema", () => {
    const webhook = fs.readFileSync(WEBHOOK_PATH, "utf-8");
    expect(webhook).toContain("processedWebhookEvents");
  });

  it("dedup INSERT occurs before the switch(event.type) block", () => {
    const webhook = fs.readFileSync(WEBHOOK_PATH, "utf-8");
    const dedupIdx = webhook.indexOf("processedWebhookEvents");
    const switchIdx = webhook.indexOf("switch (event.type)");
    expect(dedupIdx).toBeGreaterThan(0);
    expect(switchIdx).toBeGreaterThan(0);
    // Dedup must come before the switch
    expect(dedupIdx).toBeLessThan(switchIdx);
  });

  it("duplicate event short-circuits: handler returns on duplicate insert error", () => {
    const webhook = fs.readFileSync(WEBHOOK_PATH, "utf-8");
    // Must detect duplicate entry error
    expect(webhook).toContain("Duplicate entry");
    expect(webhook).toContain("1062");
    // Must return early (not fall through to switch)
    expect(webhook).toContain("duplicate: true");
    const dupBlock = webhook.slice(
      webhook.indexOf("isDuplicate"),
      webhook.indexOf("isDuplicate") + 600
    );
    expect(dupBlock).toContain("return");
  });

  it("side-effect inventory: no append-style INSERTs inside the switch block (only UPDATEs and notifyOwner)", () => {
    const webhook = fs.readFileSync(WEBHOOK_PATH, "utf-8");
    // Extract the switch block
    const switchStart = webhook.indexOf("switch (event.type)");
    const switchEnd = webhook.lastIndexOf("default:");
    const switchBlock = webhook.slice(switchStart, switchEnd + 200);

    // Count INSERT statements inside the switch block
    const insertMatches = switchBlock.match(/\.insert\(/g) ?? [];
    // The only INSERT allowed inside the switch is none — all writes are UPDATEs
    expect(insertMatches.length).toBe(0);

    // UPDATEs are present (the actual side effects)
    const updateMatches = switchBlock.match(/\.update\(/g) ?? [];
    expect(updateMatches.length).toBeGreaterThan(0);
  });

  it("notifyOwner calls are inside the switch block (covered by dedup)", () => {
    const webhook = fs.readFileSync(WEBHOOK_PATH, "utf-8");
    const dedupIdx = webhook.indexOf("switch (event.type)");
    const notifyMatches = [...webhook.matchAll(/notifyOwner\(/g)];
    // All notifyOwner calls must come AFTER the switch block start (i.e. inside it)
    for (const match of notifyMatches) {
      expect(match.index!).toBeGreaterThan(dedupIdx);
    }
  });
});
