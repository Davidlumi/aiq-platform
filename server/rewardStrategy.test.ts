/**
 * Stage 3 — Reward AI Strategic Shifts: Comprehensive Tests
 *
 * Covers:
 *   1. generate — success, LLM failure, empty content, shift count (max 4)
 *   2. affordance — all four types, LLM failure, prompt content
 *   3. save — max(4) shift validation
 *   4. confirm — empty-shifts gate, state transition, staleness cascade to Principles
 *   5. markStale — only cascades from confirmed state
 *   6. keepAsIs — resolves stale back to confirmed
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    getDb: vi.fn(),
    getTenantById: vi.fn().mockResolvedValue({ name: "Acme Financial Services" }),
  };
});

// ─── Mock LLM ─────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user",
    email: "maya.patel@acme-fs.co.uk",
    name: "Maya Patel",
    loginMethod: "manus",
    role: "user",
    tenantId: "tenant-acme-fs",
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
 * Build a DB mock where:
 *  - select() uses a queue: each call pops the next rowSet
 *  - update() returns its own chain where .where() resolves to { affectedRows: 1 }
 *  - insert() returns a chain where .values() resolves to { insertId: 1 }
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

function makeShifts(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `shift-${i + 1}`,
    text: `Annual cycles → continuous insight ${i + 1}`,
    aiGeneratedOriginal: `Annual cycles → continuous insight ${i + 1}`,
  }));
}

// ─── 1. generate ─────────────────────────────────────────────────────────────
describe("rewardStrategy.generate", () => {
  it("returns shifts array when LLM succeeds", async () => {
    // buildContext: 3 selects (companyProfile, rewardPrework, rewardVision)
    // then: 1 select (existing strategy row for upsert)
    const db = makeDb([
      [{ sector: "financial_services", rewardAiAmbitionLevel: 3 }], // companyProfile
      [{ topRewardPrioritiesNext12Months: ["pay_equity_audit"] }],   // rewardPrework
      [{ visionText: "Our vision.", state: "confirmed" }],           // rewardVision
      [], // no existing strategy row → insert
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify([
            { id: "s1", headline: "Annual cycles → continuous insight", rationale: "Rationale 1." },
            { id: "s2", headline: "Reactive → proactive pay equity", rationale: "Rationale 2." },
            { id: "s3", headline: "Manual → automated benchmarking", rationale: "Rationale 3." },
          ]),
        },
      }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardStrategy.generate();
    expect(result.shifts.length).toBeGreaterThanOrEqual(1);
    expect(result.shifts[0]).toHaveProperty("id");
    expect(result.shifts[0]).toHaveProperty("text");
  });

  it("throws with manual-write message when LLM throws", async () => {
    const db = makeDb([
      [{ sector: "technology" }],
      [{}],
      [],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("LLM timeout"));
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardStrategy.generate()).rejects.toThrow(/manually/i);
  });

  it("throws with manual-write message when LLM returns empty array", async () => {
    const db = makeDb([
      [{ sector: "technology" }],
      [{}],
      [],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "[]" } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardStrategy.generate()).rejects.toThrow(/manually/i);
  });

  it("enforces vocab blacklist — strips forbidden words from shift text", async () => {
    const db = makeDb([
      [{ sector: "technology" }],
      [{}],
      [],
      [], // no existing strategy row → insert
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify([
            { id: "s1", headline: "We will leverage AI", rationale: "To create synergy in our approach." },
          ]),
        },
      }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardStrategy.generate();
    for (const shift of result.shifts) {
      expect(shift.text).not.toContain("leverage");
      expect(shift.text).not.toContain("synergy");
    }
  });
});

// ─── 2. affordance ────────────────────────────────────────────────────────────
describe("rewardStrategy.affordance", () => {
  const AFFORDANCES = ["expand", "refine", "challenge", "suggest"] as const;

  for (const affordance of AFFORDANCES) {
    it(`returns result for affordance="${affordance}"`, async () => {
      // buildContext: 3 selects (companyProfile, rewardPrework, rewardVision)
      const db = makeDb([
        [{ sector: "financial_services" }],
        [{}],
        [{ visionText: "Our vision." }],
      ]);
      vi.mocked(getDb).mockResolvedValue(db as any);
      vi.mocked(invokeLLM).mockResolvedValueOnce({
        choices: [{ message: { content: `${affordance} result.` } }],
      } as any);
      const caller = appRouter.createCaller(makeCtx());
      const result = await caller.rewardStrategy.affordance({
        affordance,
        blockId: "shift-1",
        currentText: "Annual cycles → continuous insight.",
      });
      expect(result.result).toBeTruthy();
    });
  }

  it("throws when LLM fails on affordance", async () => {
    const db = makeDb([
      [{ sector: "technology" }],
      [{}],
      [],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("timeout"));
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.rewardStrategy.affordance({ affordance: "refine", blockId: "s1", currentText: "Some shift." })
    ).rejects.toThrow();
  });

  it("includes current shift text in the LLM prompt", async () => {
    const db = makeDb([
      [{ sector: "financial_services" }],
      [{}],
      [{ visionText: "Vision." }],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "Refined shift." } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardStrategy.affordance({
      affordance: "refine",
      blockId: "s1",
      currentText: "UNIQUE_SHIFT_TEXT_ABC789",
    });
    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const userPrompt = (callArgs.messages[1] as any).content as string;
    expect(userPrompt).toContain("UNIQUE_SHIFT_TEXT_ABC789");
  });
});

// ─── 3. save — max(4) shift validation ────────────────────────────────────────
describe("rewardStrategy.save", () => {
  it("accepts up to 4 shifts", async () => {
    const db = makeDb([[{ tenantId: "tenant-acme-fs" }]]); // existing row → update
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardStrategy.save({
      strategicShifts: makeShifts(4),
    });
    expect(result.ok).toBe(true);
  });

  it("rejects more than 4 shifts (spec §3 max)", async () => {
    const db = makeDb([]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.rewardStrategy.save({ strategicShifts: makeShifts(5) })
    ).rejects.toThrow();
  });

  it("accepts 3 shifts (minimum)", async () => {
    const db = makeDb([[{ tenantId: "tenant-acme-fs" }]]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardStrategy.save({
      strategicShifts: makeShifts(3),
    });
    expect(result.ok).toBe(true);
  });
});

// ─── 4. confirm ───────────────────────────────────────────────────────────────
describe("rewardStrategy.confirm", () => {
  it("throws FORBIDDEN when vision is not confirmed", async () => {
    const db = makeDb([[{ state: "unconfirmed" }]]); // vision not confirmed
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardStrategy.confirm()).rejects.toThrow(/Stage 2/i);
  });

  it("throws BAD_REQUEST when no shifts exist", async () => {
    const db = makeDb([
      [{ state: "confirmed" }],             // vision confirmed
      [{ strategicShiftsJson: [] }],        // no shifts
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardStrategy.confirm()).rejects.toThrow(/required/i);
  });

  it("throws when strategy row does not exist", async () => {
    const db = makeDb([
      [{ state: "confirmed" }], // vision confirmed
      [],                       // no strategy row
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardStrategy.confirm()).rejects.toThrow();
  });

  it("returns ok:true when vision confirmed and shifts exist", async () => {
    const db = makeDb([
      [{ state: "confirmed" }],             // 1st select: vision confirmed
      [{ strategicShiftsJson: makeShifts(3) }], // 2nd select: strategy
      [{ state: "unconfirmed" }],           // 3rd select: principles not confirmed
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardStrategy.confirm();
    expect(result.ok).toBe(true);
  });

  it("cascades staleness to confirmed Principles", async () => {
    const db = makeDb([
      [{ state: "confirmed" }],             // 1st select: vision confirmed
      [{ strategicShiftsJson: makeShifts(3) }], // 2nd select: strategy
      [{ state: "confirmed" }],             // 3rd select: principles confirmed → should be staled
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardStrategy.confirm();
    // 2 updates: strategy confirmed + principles staled
    expect(db._updateSpy).toHaveBeenCalledTimes(2);
  });

  it("does NOT cascade when Principles are unconfirmed", async () => {
    const db = makeDb([
      [{ state: "confirmed" }],             // 1st select: vision confirmed
      [{ strategicShiftsJson: makeShifts(3) }], // 2nd select: strategy
      [{ state: "unconfirmed" }],           // 3rd select: principles
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardStrategy.confirm();
    // Only 1 update: strategy itself
    expect(db._updateSpy).toHaveBeenCalledTimes(1);
  });
});

// ─── 5. markStale ─────────────────────────────────────────────────────────────
describe("rewardStrategy.markStale", () => {
  it("marks confirmed strategy as stale", async () => {
    const db = makeDb([[{ state: "confirmed" }]]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardStrategy.markStale();
    expect(result.ok).toBe(true);
    expect(db._updateSpy).toHaveBeenCalled();
  });

  it("does NOT update when strategy is already unconfirmed", async () => {
    const db = makeDb([[{ state: "unconfirmed" }]]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardStrategy.markStale();
    expect(db._updateSpy).not.toHaveBeenCalled();
  });

  it("does NOT update when strategy row does not exist", async () => {
    const db = makeDb([[]]); // no row
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardStrategy.markStale();
    expect(db._updateSpy).not.toHaveBeenCalled();
  });
});

// ─── 6. keepAsIs ──────────────────────────────────────────────────────────────
describe("rewardStrategy.keepAsIs", () => {
  it("returns ok:true and updates state to confirmed", async () => {
    const db = makeDb([]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardStrategy.keepAsIs();
    expect(result.ok).toBe(true);
    expect(db._updateSpy).toHaveBeenCalled();
  });
});
