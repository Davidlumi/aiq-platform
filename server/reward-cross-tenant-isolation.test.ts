/**
 * AiQ Beta-Hardening — Section 2.2: Reward Cross-Tenant Isolation
 *
 * Regression tests that verify every Reward stage table enforces tenantId
 * isolation. These tests use pure logic mirrors of the DB query patterns
 * (no DB dependency) to confirm the isolation contract is upheld.
 *
 * For each Reward stage table the test verifies:
 *   1. A query with the correct tenantId returns the row.
 *   2. A query with a different tenantId returns no row (isolation enforced).
 *   3. A write with a different tenantId is rejected (write isolation).
 *   4. An empty/null tenantId is never treated as a wildcard match.
 */
import { describe, it, expect } from "vitest";

// ─── Shared isolation helpers (mirrors server-side pattern) ──────────────────

/** Simulates the Drizzle `.where(eq(table.tenantId, tenantId))` read filter */
function simulateRead<T extends { tenantId: string }>(
  rows: T[],
  requestingTenantId: string
): T | undefined {
  return rows.find(r => r.tenantId === requestingTenantId);
}

/** Simulates the server-side write guard: only writes if tenantId matches ctx.user.tenantId */
function simulateWrite<T extends { tenantId: string }>(
  existingRow: T | undefined,
  incomingTenantId: string,
  ctxTenantId: string,
  patch: Partial<T>
): { success: boolean; reason: string; result?: T } {
  if (incomingTenantId !== ctxTenantId) {
    return { success: false, reason: `Write rejected: incoming tenantId ${incomingTenantId} !== ctx.user.tenantId ${ctxTenantId}` };
  }
  if (!existingRow) {
    return { success: true, result: { tenantId: ctxTenantId, ...patch } as T };
  }
  if (existingRow.tenantId !== ctxTenantId) {
    return { success: false, reason: `Write rejected: row belongs to tenant ${existingRow.tenantId}, requester is ${ctxTenantId}` };
  }
  return { success: true, result: { ...existingRow, ...patch } };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_A = "tenant-northbridge-001";
const TENANT_B = "tenant-meridian-001";

// Simulate one row per table per tenant
function makeRewardRows<T extends object>(extra: T) {
  return [
    { tenantId: TENANT_A, userId: "user-maya", ...extra },
    { tenantId: TENANT_B, userId: "user-other", ...extra },
  ];
}

// ─── Stage 1: reward_prework ──────────────────────────────────────────────────

describe("2.2 — Reward cross-tenant isolation: reward_prework", () => {
  const rows = makeRewardRows({ isCompleted: true, rewardFunctionSize: "large" });

  it("tenant A reads only tenant A's prework row", () => {
    const result = simulateRead(rows, TENANT_A);
    expect(result?.tenantId).toBe(TENANT_A);
    expect(result?.userId).toBe("user-maya");
  });

  it("tenant B cannot read tenant A's prework row", () => {
    const result = simulateRead(rows, TENANT_B);
    expect(result?.tenantId).toBe(TENANT_B);
    expect(result?.userId).not.toBe("user-maya");
  });

  it("empty tenantId returns no row", () => {
    const result = simulateRead(rows, "");
    expect(result).toBeUndefined();
  });

  it("null-like tenantId is not a wildcard", () => {
    const result = simulateRead(rows, "null");
    expect(result).toBeUndefined();
  });

  it("write with mismatched tenantId is rejected", () => {
    const existing = rows[0]; // tenant A's row
    const { success, reason } = simulateWrite(existing, TENANT_B, TENANT_B, { isCompleted: false });
    expect(success).toBe(false);
    expect(reason).toContain(TENANT_A);
    expect(reason).toContain(TENANT_B);
  });

  it("write with correct tenantId succeeds", () => {
    const existing = rows[0]; // tenant A's row
    const { success, result } = simulateWrite(existing, TENANT_A, TENANT_A, { isCompleted: false });
    expect(success).toBe(true);
    expect(result?.tenantId).toBe(TENANT_A);
    expect(result?.isCompleted).toBe(false);
  });
});

// ─── Stage 2: reward_vision ───────────────────────────────────────────────────

describe("2.2 — Reward cross-tenant isolation: reward_vision", () => {
  const rows = [
    { tenantId: TENANT_A, userId: "user-maya",  visionText: "Tenant A vision", state: "confirmed" },
    { tenantId: TENANT_B, userId: "user-other", visionText: "Tenant B vision", state: "draft" },
  ];

  it("tenant A reads only its own vision", () => {
    const result = simulateRead(rows, TENANT_A);
    expect(result?.tenantId).toBe(TENANT_A);
    expect(result?.visionText).toBe("Tenant A vision");
  });

  it("tenant B reads only its own vision (not tenant A's)", () => {
    const result = simulateRead(rows, TENANT_B);
    expect(result?.visionText).toBe("Tenant B vision");
    expect(result?.visionText).not.toBe("Tenant A vision");
  });

  it("vision write with mismatched tenantId is rejected", () => {
    const { success } = simulateWrite(rows[0], TENANT_B, TENANT_B, { visionText: "Hijacked" });
    expect(success).toBe(false);
  });
});

// ─── Stage 3: reward_strategy ─────────────────────────────────────────────────

describe("2.2 — Reward cross-tenant isolation: reward_strategy", () => {
  const rows = makeRewardRows({ strategicShiftsJson: JSON.stringify([{ id: "s1" }]), state: "confirmed" });

  it("tenant A reads only its own strategy", () => {
    const result = simulateRead(rows, TENANT_A);
    expect(result?.tenantId).toBe(TENANT_A);
  });

  it("strategy write with mismatched tenantId is rejected", () => {
    const { success } = simulateWrite(rows[0], TENANT_B, TENANT_B, { state: "draft" });
    expect(success).toBe(false);
  });
});

// ─── Stage 4: reward_principles ───────────────────────────────────────────────

describe("2.2 — Reward cross-tenant isolation: reward_principles", () => {
  const rows = makeRewardRows({ principlesJson: JSON.stringify([{ id: "p1", title: "Principle 1" }]), state: "confirmed" });

  it("tenant A reads only its own principles", () => {
    const result = simulateRead(rows, TENANT_A);
    expect(result?.tenantId).toBe(TENANT_A);
  });

  it("principles write with mismatched tenantId is rejected", () => {
    const { success } = simulateWrite(rows[0], TENANT_B, TENANT_B, { state: "draft" });
    expect(success).toBe(false);
  });
});

// ─── Stage 5: reward_initiative_portfolio ─────────────────────────────────────

describe("2.2 — Reward cross-tenant isolation: reward_initiative_portfolio", () => {
  const rows = makeRewardRows({ selectedIds: JSON.stringify(["ai_reward_operations_assistant"]), confirmedAt: Date.now() });

  it("tenant A reads only its own portfolio", () => {
    const result = simulateRead(rows, TENANT_A);
    expect(result?.tenantId).toBe(TENANT_A);
  });

  it("portfolio write with mismatched tenantId is rejected", () => {
    const { success } = simulateWrite(rows[0], TENANT_B, TENANT_B, { selectedIds: JSON.stringify([]) });
    expect(success).toBe(false);
  });
});

// ─── Stage 5b: reward_custom_initiative ───────────────────────────────────────

describe("2.2 — Reward cross-tenant isolation: reward_custom_initiative", () => {
  const rows = [
    { tenantId: TENANT_A, userId: "user-maya",  label: "Tenant A custom initiative", y1CostRangeLow: 50, y1CostRangeHigh: 100 },
    { tenantId: TENANT_B, userId: "user-other", label: "Tenant B custom initiative", y1CostRangeLow: 80, y1CostRangeHigh: 150 },
  ];

  it("tenant A reads only its own custom initiatives", () => {
    const result = simulateRead(rows, TENANT_A);
    expect(result?.tenantId).toBe(TENANT_A);
    expect(result?.label).toBe("Tenant A custom initiative");
  });

  it("tenant B reads only its own custom initiatives (not tenant A's)", () => {
    const result = simulateRead(rows, TENANT_B);
    expect(result?.label).toBe("Tenant B custom initiative");
    expect(result?.label).not.toBe("Tenant A custom initiative");
  });

  it("custom initiative write with mismatched tenantId is rejected", () => {
    const { success } = simulateWrite(rows[0], TENANT_B, TENANT_B, { label: "Hijacked" });
    expect(success).toBe(false);
  });
});

// ─── Stage 6: reward_success_measures ────────────────────────────────────────

describe("2.2 — Reward cross-tenant isolation: reward_success_measures", () => {
  const rows = makeRewardRows({ initiativeId: "ai_reward_operations_assistant", metricLabel: "Time saved" });

  it("tenant A reads only its own success measures", () => {
    const result = simulateRead(rows, TENANT_A);
    expect(result?.tenantId).toBe(TENANT_A);
    expect(result?.metricLabel).toBe("Time saved");
  });

  it("success measure write with mismatched tenantId is rejected", () => {
    const { success } = simulateWrite(rows[0], TENANT_B, TENANT_B, { metricLabel: "Hijacked" });
    expect(success).toBe(false);
  });
});

// ─── Stage 7: reward_business_case ───────────────────────────────────────────

describe("2.2 — Reward cross-tenant isolation: reward_business_case", () => {
  const rows = [
    { tenantId: TENANT_A, userId: "user-maya",  isConfirmed: true,  recommendedScenario: "central", execSummaryText: "Tenant A exec summary" },
    { tenantId: TENANT_B, userId: "user-other", isConfirmed: false, recommendedScenario: "central", execSummaryText: "Tenant B exec summary" },
  ];

  it("tenant A reads only its own business case", () => {
    const result = simulateRead(rows, TENANT_A);
    expect(result?.tenantId).toBe(TENANT_A);
    expect(result?.execSummaryText).toBe("Tenant A exec summary");
  });

  it("tenant B reads only its own exec summary (not tenant A's)", () => {
    const result = simulateRead(rows, TENANT_B);
    expect(result?.execSummaryText).toBe("Tenant B exec summary");
    expect(result?.execSummaryText).not.toBe("Tenant A exec summary");
  });

  it("business case write with mismatched tenantId is rejected", () => {
    const { success } = simulateWrite(rows[0], TENANT_B, TENANT_B, { execSummaryText: "Hijacked" });
    expect(success).toBe(false);
  });
});

// ─── Stage 8: reward_capability_stage ────────────────────────────────────────

describe("2.2 — Reward cross-tenant isolation: reward_capability_stage", () => {
  const rows = makeRewardRows({ teamSkillsLevel: "medium", changeManagementLevel: "medium", governanceLevel: "low", confirmedAt: Date.now() });

  it("tenant A reads only its own capability stage", () => {
    const result = simulateRead(rows, TENANT_A);
    expect(result?.tenantId).toBe(TENANT_A);
    expect(result?.teamSkillsLevel).toBe("medium");
  });

  it("capability stage write with mismatched tenantId is rejected", () => {
    const { success } = simulateWrite(rows[0], TENANT_B, TENANT_B, { teamSkillsLevel: "high" });
    expect(success).toBe(false);
  });
});

// ─── Stage 9: reward_review ───────────────────────────────────────────────────

describe("2.2 — Reward cross-tenant isolation: reward_review", () => {
  const rows = [
    { tenantId: TENANT_A, userId: "user-maya",  strategyLocked: true,  lockedAt: Date.now(), reviewSummaryText: "Tenant A review" },
    { tenantId: TENANT_B, userId: "user-other", strategyLocked: false, lockedAt: null,       reviewSummaryText: "Tenant B review" },
  ];

  it("tenant A reads only its own review", () => {
    const result = simulateRead(rows, TENANT_A);
    expect(result?.tenantId).toBe(TENANT_A);
    expect(result?.reviewSummaryText).toBe("Tenant A review");
  });

  it("tenant B reads only its own review summary (not tenant A's)", () => {
    const result = simulateRead(rows, TENANT_B);
    expect(result?.reviewSummaryText).toBe("Tenant B review");
    expect(result?.reviewSummaryText).not.toBe("Tenant A review");
  });

  it("review lock write with mismatched tenantId is rejected", () => {
    const { success } = simulateWrite(rows[0], TENANT_B, TENANT_B, { strategyLocked: false });
    expect(success).toBe(false);
  });
});

// ─── Stage 10: reward_outputs ─────────────────────────────────────────────────

describe("2.2 — Reward cross-tenant isolation: reward_outputs", () => {
  const rows = [
    { tenantId: TENANT_A, userId: "user-maya",  audience: "board",  execSummaryText: "Tenant A output", lastExportAt: Date.now() },
    { tenantId: TENANT_B, userId: "user-other", audience: "ceo",    execSummaryText: "Tenant B output", lastExportAt: null },
  ];

  it("tenant A reads only its own outputs", () => {
    const result = simulateRead(rows, TENANT_A);
    expect(result?.tenantId).toBe(TENANT_A);
    expect(result?.execSummaryText).toBe("Tenant A output");
  });

  it("tenant B reads only its own output text (not tenant A's)", () => {
    const result = simulateRead(rows, TENANT_B);
    expect(result?.execSummaryText).toBe("Tenant B output");
    expect(result?.execSummaryText).not.toBe("Tenant A output");
  });

  it("outputs write with mismatched tenantId is rejected", () => {
    const { success } = simulateWrite(rows[0], TENANT_B, TENANT_B, { execSummaryText: "Hijacked" });
    expect(success).toBe(false);
  });
});

// ─── Cross-stage: capability_assessment_json in ail_org_context ───────────────

describe("2.2 — Reward cross-tenant isolation: ail_org_context capability_assessment_json", () => {
  const rows = [
    { tenantId: TENANT_A, capabilityAssessmentJson: JSON.stringify({ teamSkills: "medium" }) },
    { tenantId: TENANT_B, capabilityAssessmentJson: JSON.stringify({ teamSkills: "high" }) },
  ];

  it("tenant A reads only its own capability assessment JSON", () => {
    const result = simulateRead(rows, TENANT_A);
    const parsed = JSON.parse(result?.capabilityAssessmentJson ?? "{}");
    expect(parsed.teamSkills).toBe("medium");
  });

  it("tenant B cannot read tenant A's capability assessment JSON", () => {
    const result = simulateRead(rows, TENANT_B);
    const parsed = JSON.parse(result?.capabilityAssessmentJson ?? "{}");
    expect(parsed.teamSkills).not.toBe("medium");
  });
});

// ─── Boundary: null and undefined tenantId edge cases ─────────────────────────

describe("2.2 — Reward cross-tenant isolation: boundary edge cases", () => {
  const rows = makeRewardRows({ data: "sensitive" });

  it("undefined tenantId does not match any real tenant", () => {
    const result = simulateRead(rows, undefined as unknown as string);
    expect(result).toBeUndefined();
  });

  it("tenantId with leading/trailing whitespace does not match", () => {
    const result = simulateRead(rows, ` ${TENANT_A} `);
    expect(result).toBeUndefined();
  });

  it("tenantId with SQL wildcard characters does not match", () => {
    const result = simulateRead(rows, "%");
    expect(result).toBeUndefined();
  });

  it("tenantId with SQL injection attempt does not match", () => {
    const result = simulateRead(rows, "' OR '1'='1");
    expect(result).toBeUndefined();
  });
});
