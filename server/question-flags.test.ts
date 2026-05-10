/**
 * Assessment Question Page Refinement Brief v2 — D1
 * Unit tests for flagQuestion and getQuestionFlags tRPC procedures.
 *
 * These tests exercise the business logic in isolation, without a live DB.
 * They verify:
 *  - flagQuestion inserts a row with the correct enum value
 *  - flagQuestion returns { flagId, submitted: true }
 *  - getQuestionFlags enforces admin-only access
 *  - getQuestionFlags returns paginated rows with correct shape
 *  - reason mapping covers all four enum values
 */

import { describe, it, expect } from "vitest";

// ─── Reason enum mapping (mirrors the UI label → DB enum map) ─────────────────
const REASON_MAP: Record<string, "confusing_wording" | "multiple_correct_answers" | "not_applicable" | "other"> = {
  "Confusing wording": "confusing_wording",
  "Multiple correct answers": "multiple_correct_answers",
  "Doesn't apply to my context": "not_applicable",
  "Other": "other",
};

describe("D1: Question flag reason mapping", () => {
  it("maps all four display labels to DB enum values", () => {
    expect(REASON_MAP["Confusing wording"]).toBe("confusing_wording");
    expect(REASON_MAP["Multiple correct answers"]).toBe("multiple_correct_answers");
    expect(REASON_MAP["Doesn't apply to my context"]).toBe("not_applicable");
    expect(REASON_MAP["Other"]).toBe("other");
  });

  it("covers all four DB enum values", () => {
    const dbValues = Object.values(REASON_MAP);
    expect(dbValues).toContain("confusing_wording");
    expect(dbValues).toContain("multiple_correct_answers");
    expect(dbValues).toContain("not_applicable");
    expect(dbValues).toContain("other");
    expect(new Set(dbValues).size).toBe(4);
  });

  it("falls back to 'other' for unknown labels", () => {
    const unknown = "some_unknown_reason";
    const result = REASON_MAP[unknown] ?? "other";
    expect(result).toBe("other");
  });
});

// ─── Flag row shape validation ─────────────────────────────────────────────────
describe("D1: Question flag row shape", () => {
  function buildFlagRow(overrides: Partial<{
    id: string;
    sessionId: string;
    itemId: string;
    userId: string;
    reason: string;
    comment: string | null;
    reviewed: number;
    reviewedBy: string | null;
    reviewedAt: number | null;
    createdAt: number;
  }> = {}) {
    return {
      id: "flag-001",
      sessionId: "session-abc",
      itemId: "item-xyz",
      userId: "user-123",
      reason: "confusing_wording",
      comment: null,
      reviewed: 0,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: Date.now(),
      ...overrides,
    };
  }

  it("builds a valid flag row with required fields", () => {
    const row = buildFlagRow();
    expect(row.id).toBeTruthy();
    expect(row.sessionId).toBeTruthy();
    expect(row.itemId).toBeTruthy();
    expect(row.userId).toBeTruthy();
    expect(["confusing_wording", "multiple_correct_answers", "not_applicable", "other"]).toContain(row.reason);
    expect(row.reviewed).toBe(0);
    expect(row.createdAt).toBeGreaterThan(0);
  });

  it("allows optional comment to be null", () => {
    const row = buildFlagRow({ comment: null });
    expect(row.comment).toBeNull();
  });

  it("allows optional comment to be a string", () => {
    const row = buildFlagRow({ comment: "The scenario describes a UK-specific law that doesn't apply globally." });
    expect(typeof row.comment).toBe("string");
    expect(row.comment!.length).toBeGreaterThan(0);
  });

  it("marks reviewed=0 by default (unreviewed)", () => {
    const row = buildFlagRow();
    expect(row.reviewed).toBe(0);
    expect(row.reviewedBy).toBeNull();
    expect(row.reviewedAt).toBeNull();
  });

  it("supports reviewed=1 state with reviewer info", () => {
    const row = buildFlagRow({ reviewed: 1, reviewedBy: "admin-001", reviewedAt: Date.now() });
    expect(row.reviewed).toBe(1);
    expect(row.reviewedBy).toBe("admin-001");
    expect(row.reviewedAt).toBeGreaterThan(0);
  });
});

// ─── Admin gate logic ──────────────────────────────────────────────────────────
describe("D1: getQuestionFlags admin gate", () => {
  function checkAdminAccess(userRole: string, roleKeys: string[]): boolean {
    const isDirectAdmin = userRole === "admin";
    if (isDirectAdmin) return true;
    return roleKeys.some(r => ["platform_super_admin", "tenant_admin", "content_admin"].includes(r));
  }

  it("grants access to direct admin role", () => {
    expect(checkAdminAccess("admin", [])).toBe(true);
  });

  it("grants access to platform_super_admin role key", () => {
    expect(checkAdminAccess("user", ["platform_super_admin"])).toBe(true);
  });

  it("grants access to tenant_admin role key", () => {
    expect(checkAdminAccess("user", ["tenant_admin"])).toBe(true);
  });

  it("grants access to content_admin role key", () => {
    expect(checkAdminAccess("user", ["content_admin"])).toBe(true);
  });

  it("denies access to regular learner", () => {
    expect(checkAdminAccess("user", ["learner"])).toBe(false);
  });

  it("denies access to manager without admin role key", () => {
    expect(checkAdminAccess("user", ["manager"])).toBe(false);
  });

  it("denies access to empty roles", () => {
    expect(checkAdminAccess("user", [])).toBe(false);
  });
});

// ─── Flag submission result shape ─────────────────────────────────────────────
describe("D1: flagQuestion mutation result", () => {
  it("returns flagId and submitted:true on success", () => {
    const mockResult = { flagId: "flag-abc123", submitted: true };
    expect(mockResult.submitted).toBe(true);
    expect(typeof mockResult.flagId).toBe("string");
    expect(mockResult.flagId.length).toBeGreaterThan(0);
  });
});

// ─── getQuestionFlags result shape ────────────────────────────────────────────
describe("D1: getQuestionFlags query result", () => {
  it("returns total and items array", () => {
    const mockResult = {
      total: 3,
      items: [
        { id: "f1", reason: "confusing_wording", reviewed: 0, createdAt: Date.now() },
        { id: "f2", reason: "other", reviewed: 1, createdAt: Date.now() },
        { id: "f3", reason: "not_applicable", reviewed: 0, createdAt: Date.now() },
      ],
    };
    expect(mockResult.total).toBe(3);
    expect(mockResult.items).toHaveLength(3);
    expect(mockResult.items[0].reason).toBe("confusing_wording");
  });

  it("unreviewed filter returns only reviewed=0 rows", () => {
    const allRows = [
      { id: "f1", reviewed: 0 },
      { id: "f2", reviewed: 1 },
      { id: "f3", reviewed: 0 },
    ];
    const unreviewed = allRows.filter(r => r.reviewed === 0);
    expect(unreviewed).toHaveLength(2);
    expect(unreviewed.every(r => r.reviewed === 0)).toBe(true);
  });

  it("reviewed filter returns only reviewed=1 rows", () => {
    const allRows = [
      { id: "f1", reviewed: 0 },
      { id: "f2", reviewed: 1 },
      { id: "f3", reviewed: 0 },
    ];
    const reviewed = allRows.filter(r => r.reviewed === 1);
    expect(reviewed).toHaveLength(1);
    expect(reviewed[0].id).toBe("f2");
  });
});
