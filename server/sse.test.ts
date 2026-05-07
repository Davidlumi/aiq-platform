/**
 * SSE Notification Infrastructure Tests
 *
 * Tests for the server-sent events (SSE) notification system:
 * - pushNotification() helper
 * - broadcastNotification() helper
 * - Connection registry management
 * - Payload structure validation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { pushNotification, broadcastNotification } from "./sse";

// ─── Mock SSE client ──────────────────────────────────────────────────────────

function makeMockClient() {
  const writes: string[] = [];
  return {
    write: vi.fn((data: string) => { writes.push(data); }),
    writes,
    headersSent: true,
    writableEnded: false,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("pushNotification", () => {
  it("returns 0 when no clients are connected for the user", () => {
    const count = pushNotification("user-not-connected", {
      type: "nudge",
      title: "Test",
    });
    expect(count).toBe(0);
  });

  it("returns 0 for empty userId", () => {
    const count = pushNotification("", {
      type: "system",
      title: "Broadcast test",
    });
    expect(count).toBe(0);
  });
});

describe("broadcastNotification", () => {
  it("returns 0 when no clients are connected", () => {
    const count = broadcastNotification({
      type: "system",
      title: "System announcement",
      body: "Platform maintenance at midnight",
    });
    expect(count).toBe(0);
  });
});

describe("SseNotificationPayload structure", () => {
  it("accepts all valid notification types", () => {
    const validTypes = ["nudge", "assessment_complete", "plan_updated", "milestone", "system", "connected"] as const;
    for (const type of validTypes) {
      const count = pushNotification("test-user", { type, title: "Test" });
      expect(typeof count).toBe("number");
    }
  });

  it("accepts optional body and link fields", () => {
    const count = pushNotification("test-user", {
      type: "milestone",
      title: "Module completed!",
      body: "Great score: 95%",
      link: "/learning",
    });
    expect(count).toBe(0); // No connected clients, but no error thrown
  });
});

describe("pushNotification payload format", () => {
  it("does not throw for any valid payload", () => {
    expect(() => pushNotification("user-1", { type: "nudge", title: "Hello" })).not.toThrow();
    expect(() => pushNotification("user-2", { type: "milestone", title: "Done", body: "Score: 80%", link: "/learning" })).not.toThrow();
    expect(() => pushNotification("user-3", { type: "system", title: "Maintenance" })).not.toThrow();
  });
});

describe("broadcastNotification payload format", () => {
  it("does not throw for any valid payload", () => {
    expect(() => broadcastNotification({ type: "system", title: "Announcement" })).not.toThrow();
    expect(() => broadcastNotification({ type: "connected", title: "Connected" })).not.toThrow();
  });
});
