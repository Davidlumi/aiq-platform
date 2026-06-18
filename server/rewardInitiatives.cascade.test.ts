/**
 * Stage 5 — rewardInitiatives.complete: server-side staleness cascade tests
 *
 * Verifies that completing Stage 5 (portfolio) marks downstream confirmed stages
 * as stale on the server, without requiring a client-side markStale call.
 *
 * Cascades under test:
 *   5→6  rewardSuccessMeasuresStage.isStale = 1  (if isConfirmed = 1)
 *   5→7  rewardBusinessCase.isStale = 1           (if isConfirmed = 1)
 *   5→8  rewardCapabilityStage.isStale = 1        (if isConfirmed = 1)
 *
 * Pattern: queue-based DB mock (same as rewardVision.test.ts).
 * Select calls in complete():
 *   1. getOrCreatePortfolio → rewardInitiativePortfolio (returns portfolio with ≥1 selected initiative)
 *   2. rewardCustomInitiative (returns [] — no custom initiatives in portfolio)
 *   3. rewardSuccessMeasuresStage (cascade check — Stage 6)
 *   4. rewardBusinessCase        (cascade check — Stage 7)
 *   5. rewardCapabilityStage     (cascade check — Stage 8)
 *
 * Note: when overrideSoftGates=true, the REWARD_INITIATIVE_LIBRARY dynamic import
 * is skipped, so no extra select calls occur between steps 2 and 3.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    getDb: vi.fn(),
    getTenantById: vi.fn().mockResolvedValue({ name: "Northbridge Financial" }),
  };
});

import { getDb } from "./db";

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user",
    email: "maya.patel@northbridge-fs.co.uk",
    name: "Maya Patel",
    loginMethod: "manus",
    role: "user",
    tenantId: "tenant-northbridge",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser = makeUser()): TrpcContext {
  return { user, req: {} as any, res: {} as any, entitlements: { strategyCompany: true, strategyReward: true, assessment: true, assessmentPaid: true } };
}

/**
 * Queue-based DB mock.
 * Each call to db.select() pops the next rowSet from the queue.
 * db.update() is tracked via _updateSpy.
 */
function makeDb(selectQueue: Record<string, unknown>[][] = []) {
  let selectIdx = 0;

  const updateWhereSpy = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
  const updateSetSpy = vi.fn().mockReturnValue({ where: updateWhereSpy });
  const updateSpy = vi.fn().mockReturnValue({ set: updateSetSpy });

  const insertValuesSpy = vi.fn().mockResolvedValue([{ insertId: 1 }]);
  const insertSpy = vi.fn().mockReturnValue({ values: insertValuesSpy });

  const selectSpy = vi.fn().mockImplementation(() => {
    const rows = selectQueue[selectIdx] ?? [];
    selectIdx++;
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(rows),
      limit: vi.fn().mockResolvedValue(rows),
      orderBy: vi.fn().mockReturnThis(),
    };
  });

  return {
    select: selectSpy,
    update: updateSpy,
    insert: insertSpy,
    _updateSpy: updateSpy,
    _insertSpy: insertSpy,
  };
}

/**
 * A portfolio row with 6 Foundation-phase initiatives selected and no custom
 * initiatives, so all soft gates pass when overrideSoftGates=true.
 *
 * "ai_pay_equity_continuous_monitoring" is a Foundation-phase initiative (#3).
 */
const PORTFOLIO_ROW = {
  tenantId: "tenant-northbridge",
  userId: "1",
  selectedInitiativesJson: [
    "ai_pay_equity_continuous_monitoring",
    "ai_multi_characteristic_pay_gap_reporting",
    "ai_equal_pay_risk_audit",
    "ai_pay_band_design",
    "ai_pay_transparency_engine",
    "ai_driven_merit_cycle_orchestration",
  ],
  dismissedInitiativesJson: [],
  isCompleted: 0,
  completedAt: null,
  updatedAt: Date.now(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("rewardInitiatives.complete — server-side staleness cascade", () => {

  it("cascades to Stage 6 (Success Measures) when it is confirmed", async () => {
    const db = makeDb([
      [PORTFOLIO_ROW],                    // 1. getOrCreatePortfolio
      [],                                  // 2. customRows (none in portfolio)
      [{ isConfirmed: 1 }],               // 3. rewardSuccessMeasuresStage — confirmed → stale
      [{ isConfirmed: 0 }],               // 4. rewardBusinessCase — not confirmed
      [{ isConfirmed: 0 }],               // 5. rewardCapabilityStage — not confirmed
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardInitiatives.complete({ overrideSoftGates: true });
    expect(result.success).toBe(true);
    // 2 updates: portfolio isCompleted + Stage 6 isStale
    expect(db._updateSpy).toHaveBeenCalledTimes(2);
  });

  it("cascades to Stage 7 (Business Case) when it is confirmed", async () => {
    const db = makeDb([
      [PORTFOLIO_ROW],
      [],
      [{ isConfirmed: 0 }],               // Stage 6 — not confirmed
      [{ isConfirmed: 1 }],               // Stage 7 — confirmed → stale
      [{ isConfirmed: 0 }],               // Stage 8 — not confirmed
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardInitiatives.complete({ overrideSoftGates: true });
    expect(result.success).toBe(true);
    // 2 updates: portfolio + Stage 7
    expect(db._updateSpy).toHaveBeenCalledTimes(2);
  });

  it("cascades to Stage 8 (Capability Assessment) when it is confirmed", async () => {
    const db = makeDb([
      [PORTFOLIO_ROW],
      [],
      [{ isConfirmed: 0 }],               // Stage 6 — not confirmed
      [{ isConfirmed: 0 }],               // Stage 7 — not confirmed
      [{ isConfirmed: 1 }],               // Stage 8 — confirmed → stale
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardInitiatives.complete({ overrideSoftGates: true });
    expect(result.success).toBe(true);
    // 2 updates: portfolio + Stage 8
    expect(db._updateSpy).toHaveBeenCalledTimes(2);
  });

  it("cascades to all three stages when all are confirmed", async () => {
    const db = makeDb([
      [PORTFOLIO_ROW],
      [],
      [{ isConfirmed: 1 }],               // Stage 6 — confirmed
      [{ isConfirmed: 1 }],               // Stage 7 — confirmed
      [{ isConfirmed: 1 }],               // Stage 8 — confirmed
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardInitiatives.complete({ overrideSoftGates: true });
    expect(result.success).toBe(true);
    // 4 updates: portfolio + Stage 6 + Stage 7 + Stage 8
    expect(db._updateSpy).toHaveBeenCalledTimes(4);
  });

  it("does NOT cascade when no downstream stage is confirmed", async () => {
    const db = makeDb([
      [PORTFOLIO_ROW],
      [],
      [{ isConfirmed: 0 }],               // Stage 6 — not confirmed
      [{ isConfirmed: 0 }],               // Stage 7 — not confirmed
      [{ isConfirmed: 0 }],               // Stage 8 — not confirmed
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardInitiatives.complete({ overrideSoftGates: true });
    expect(result.success).toBe(true);
    // Only 1 update: portfolio isCompleted
    expect(db._updateSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT cascade when downstream stage row does not exist (first-time user)", async () => {
    const db = makeDb([
      [PORTFOLIO_ROW],
      [],
      [],                                  // Stage 6 — no row yet
      [],                                  // Stage 7 — no row yet
      [],                                  // Stage 8 — no row yet
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardInitiatives.complete({ overrideSoftGates: true });
    expect(result.success).toBe(true);
    // Only 1 update: portfolio isCompleted
    expect(db._updateSpy).toHaveBeenCalledTimes(1);
  });

  it("cascades to Stage 6 and Stage 8 but not Stage 7 when only those are confirmed", async () => {
    const db = makeDb([
      [PORTFOLIO_ROW],
      [],
      [{ isConfirmed: 1 }],               // Stage 6 — confirmed
      [{ isConfirmed: 0 }],               // Stage 7 — not confirmed
      [{ isConfirmed: 1 }],               // Stage 8 — confirmed
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardInitiatives.complete({ overrideSoftGates: true });
    expect(result.success).toBe(true);
    // 3 updates: portfolio + Stage 6 + Stage 8
    expect(db._updateSpy).toHaveBeenCalledTimes(3);
  });

});
