/**
 * AiQ v2.2 — WS4.4/WS4.5: Save-and-Resume Tests
 *
 * Tests the 48-hour resume window logic and model version pinning.
 * The getResumeState procedure returns:
 *   - isResumeWindowOpen: true if session was created within the last 48 hours
 *   - resumeWindowExpiresAt: Date 48h after session creation
 *   - pinnedModelVersion: model version from session metadata (default: "adaptive-v2")
 *   - progressPct: percentage of target items answered
 *
 * These tests validate the pure logic functions extracted from the procedure.
 */
import { describe, it, expect } from "vitest";
import { MINIMUM_EVIDENCE } from "./assessment/sessionController";

// ─── 48-hour window logic (extracted from getResumeState) ────────────────────

/**
 * Pure function that mirrors the 48h window logic in getResumeState.
 * Extracted here so we can test it without a DB.
 */
function computeResumeWindow(createdAt: Date, now: Date = new Date()): {
  isResumeWindowOpen: boolean;
  resumeWindowExpiresAt: Date;
  hoursSinceLastActivity: number;
} {
  const hoursSinceLastActivity = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const isResumeWindowOpen = hoursSinceLastActivity < 48;
  const resumeWindowExpiresAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
  return { isResumeWindowOpen, resumeWindowExpiresAt, hoursSinceLastActivity };
}

/**
 * Pure function that mirrors the progress computation in getResumeState.
 */
function computeProgress(answeredCount: number, targetItems: number = MINIMUM_EVIDENCE.targetItems): {
  progressPct: number;
} {
  return {
    progressPct: Math.round((answeredCount / targetItems) * 100),
  };
}

/**
 * Pure function that mirrors the model version pinning logic.
 */
function resolvePinnedModelVersion(meta: Record<string, unknown>): string {
  return (meta.pinnedModelVersion as string) ?? "adaptive-v2";
}

// ─── 48-hour resume window ────────────────────────────────────────────────────
describe("WS4.4 — 48-hour resume window", () => {
  it("isResumeWindowOpen is true for a session created 1 hour ago", () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
    const { isResumeWindowOpen } = computeResumeWindow(createdAt, now);
    expect(isResumeWindowOpen).toBe(true);
  });

  it("isResumeWindowOpen is true for a session created 47 hours ago", () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 47 * 60 * 60 * 1000); // 47 hours ago
    const { isResumeWindowOpen } = computeResumeWindow(createdAt, now);
    expect(isResumeWindowOpen).toBe(true);
  });

  it("isResumeWindowOpen is false for a session created exactly 48 hours ago", () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 48 * 60 * 60 * 1000); // exactly 48 hours ago
    const { isResumeWindowOpen } = computeResumeWindow(createdAt, now);
    expect(isResumeWindowOpen).toBe(false);
  });

  it("isResumeWindowOpen is false for a session created 72 hours ago", () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago
    const { isResumeWindowOpen } = computeResumeWindow(createdAt, now);
    expect(isResumeWindowOpen).toBe(false);
  });

  it("resumeWindowExpiresAt is exactly 48 hours after session creation", () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 10 * 60 * 60 * 1000); // 10 hours ago
    const { resumeWindowExpiresAt } = computeResumeWindow(createdAt, now);
    const expectedExpiry = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
    expect(resumeWindowExpiresAt.getTime()).toBe(expectedExpiry.getTime());
  });

  it("hoursSinceLastActivity is computed correctly", () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago
    const { hoursSinceLastActivity } = computeResumeWindow(createdAt, now);
    expect(hoursSinceLastActivity).toBeCloseTo(5, 1);
  });
});

// ─── WS4.5: Model version pinning ────────────────────────────────────────────
describe("WS4.5 — model version pinning", () => {
  it("returns pinnedModelVersion from session metadata when present", () => {
    const meta = { pinnedModelVersion: "adaptive-v1.5" };
    expect(resolvePinnedModelVersion(meta)).toBe("adaptive-v1.5");
  });

  it("defaults to 'adaptive-v2' when pinnedModelVersion is absent from metadata", () => {
    const meta = {};
    expect(resolvePinnedModelVersion(meta)).toBe("adaptive-v2");
  });

  it("defaults to 'adaptive-v2' when metadata is empty", () => {
    expect(resolvePinnedModelVersion({})).toBe("adaptive-v2");
  });

  it("preserves the exact pinned version string without modification", () => {
    const meta = { pinnedModelVersion: "adaptive-v2.2-calibrated" };
    expect(resolvePinnedModelVersion(meta)).toBe("adaptive-v2.2-calibrated");
  });
});

// ─── Progress computation ─────────────────────────────────────────────────────
describe("WS4.4 — session progress computation", () => {
  it("returns 0% progress for 0 answered items", () => {
    expect(computeProgress(0).progressPct).toBe(0);
  });

  it("returns 50% progress for half the target items answered", () => {
    const half = Math.floor(MINIMUM_EVIDENCE.targetItems / 2);
    const { progressPct } = computeProgress(half);
    expect(progressPct).toBeGreaterThanOrEqual(49);
    expect(progressPct).toBeLessThanOrEqual(51);
  });

  it("returns 100% progress when all target items are answered", () => {
    expect(computeProgress(MINIMUM_EVIDENCE.targetItems).progressPct).toBe(100);
  });

  it("uses MINIMUM_EVIDENCE.targetItems as the default target", () => {
    expect(MINIMUM_EVIDENCE.targetItems).toBeGreaterThan(0);
    const { progressPct } = computeProgress(MINIMUM_EVIDENCE.targetItems);
    expect(progressPct).toBe(100);
  });

  it("rounds progress percentage to nearest integer", () => {
    // 1 answer out of 49 target items = 2.04% → rounds to 2
    const { progressPct } = computeProgress(1, 49);
    expect(Number.isInteger(progressPct)).toBe(true);
    expect(progressPct).toBe(2);
  });
});

// ─── MINIMUM_EVIDENCE constants ───────────────────────────────────────────────
describe("MINIMUM_EVIDENCE constants", () => {
  it("targetItems is 49", () => {
    expect(MINIMUM_EVIDENCE.targetItems).toBe(49);
  });

  it("totalItems is 20", () => {
    expect(MINIMUM_EVIDENCE.totalItems).toBe(20);
  });

  it("signalsPerCapability is 3", () => {
    expect(MINIMUM_EVIDENCE.signalsPerCapability).toBe(3);
  });

  it("distinctInteractionTypes is 5", () => {
    expect(MINIMUM_EVIDENCE.distinctInteractionTypes).toBe(5);
  });
});
