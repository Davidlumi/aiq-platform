/**
 * Stage 2 — Reward AI Vision: Comprehensive Tests
 *
 * Covers:
 *   1. generate — success, LLM failure, empty content, vocab enforcement, upsert paths
 *   2. affordance — all four types, LLM failure, prompt content
 *   3. save — upsert behaviour
 *   4. confirm — empty-vision gate, state transition, staleness cascade
 *   5. markStale — only cascades from confirmed state
 *   6. keepAsIs — resolves stale back to confirmed
 *   7. getStatus — prework gate, state reporting
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
  return { user, req: {} as any, res: {} as any };
}

/**
 * Build a DB mock where:
 *  - select() uses a queue: each call pops the next rowSet from selectQueue
 *  - update() returns its own chain where .where() resolves to { affectedRows: 1 }
 *  - insert() returns a chain where .values() resolves to { insertId: 1 }
 *
 * The updateSpy and insertSpy are exposed for assertion.
 */
function makeDb(selectQueue: Record<string, unknown>[][] = []) {
  let selectIdx = 0;

  // Separate update chain
  const updateWhereSpy = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
  const updateSetSpy = vi.fn().mockReturnValue({ where: updateWhereSpy });
  const updateSpy = vi.fn().mockReturnValue({ set: updateSetSpy });

  // Separate insert chain
  const insertValuesSpy = vi.fn().mockResolvedValue([{ insertId: 1 }]);
  const insertSpy = vi.fn().mockReturnValue({ values: insertValuesSpy });

  // Select chain (queue-based)
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

  const db = {
    select: selectSpy,
    update: updateSpy,
    insert: insertSpy,
    // expose spies for assertions
    _updateSpy: updateSpy,
    _insertSpy: insertSpy,
  };
  return db;
}

// ─── 1. generate ─────────────────────────────────────────────────────────────
describe("rewardVision.generate", () => {
  it("returns visionText when LLM succeeds", async () => {
    // buildStage1Context: 2 selects (companyProfile, rewardPrework)
    // generate: 1 select (existing vision)
    const db = makeDb([
      [{ sector: "financial_services", rewardAiAmbitionLevel: 3 }], // companyProfile
      [{ rewardAiAmbitionLevel: 3 }],                               // rewardPrework
      [],                                                            // no existing vision → insert
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "We will use AI to ensure every pay decision is explainable, equitable, and competitive." } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardVision.generate();
    expect(result.visionText).toBeTruthy();
    expect(typeof result.visionText).toBe("string");
    expect(result.visionText.length).toBeGreaterThan(10);
  });

  it("throws INTERNAL_SERVER_ERROR when LLM throws", async () => {
    const db = makeDb([
      [{ sector: "financial_services" }],
      [{}],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("LLM timeout"));
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardVision.generate()).rejects.toThrow();
  });

  it("throws with manual-write message when LLM returns empty", async () => {
    const db = makeDb([
      [{ sector: "financial_services" }],
      [{}],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "" } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardVision.generate()).rejects.toThrow(/manually/i);
  });

  it("enforces vocab blacklist — strips forbidden words from output", async () => {
    const db = makeDb([
      [{ sector: "technology" }],
      [{}],
      [],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "We will leverage AI to create synergy in our reward strategy." } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardVision.generate();
    expect(result.visionText).not.toContain("leverage");
    expect(result.visionText).not.toContain("synergy");
  });

  it("upserts vision when one already exists", async () => {
    const db = makeDb([
      [{ sector: "technology" }],
      [{ rewardAiAmbitionLevel: 3 }],
      [{ tenantId: "tenant-acme-fs" }], // existing vision row → update path
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "Updated vision." } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardVision.generate();
    expect(db._updateSpy).toHaveBeenCalled();
    expect(db._insertSpy).not.toHaveBeenCalled();
  });

  it("inserts vision when none exists yet", async () => {
    const db = makeDb([
      [{ sector: "technology" }],
      [{ rewardAiAmbitionLevel: 3 }],
      [], // no existing vision → insert path
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "New vision." } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardVision.generate();
    expect(db._insertSpy).toHaveBeenCalled();
    expect(db._updateSpy).not.toHaveBeenCalled();
  });
});

// ─── 2. affordance ────────────────────────────────────────────────────────────
describe("rewardVision.affordance", () => {
  const AFFORDANCES = ["expand", "refine", "challenge", "suggest"] as const;

  for (const affordance of AFFORDANCES) {
    it(`returns result for affordance="${affordance}"`, async () => {
      const db = makeDb([
        [{ sector: "financial_services" }],
        [{}],
      ]);
      vi.mocked(getDb).mockResolvedValue(db as any);
      vi.mocked(invokeLLM).mockResolvedValueOnce({
        choices: [{ message: { content: `${affordance} result text.` } }],
      } as any);
      const caller = appRouter.createCaller(makeCtx());
      const result = await caller.rewardVision.affordance({
        affordance,
        currentText: "We will use AI to make pay decisions more equitable.",
      });
      expect(result.result).toBeTruthy();
      expect(typeof result.result).toBe("string");
    });
  }

  it("throws when LLM fails on affordance", async () => {
    const db = makeDb([
      [{ sector: "technology" }],
      [{}],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("timeout"));
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.rewardVision.affordance({ affordance: "refine", currentText: "Some vision." })
    ).rejects.toThrow();
  });

  it("throws when LLM returns empty string on affordance", async () => {
    const db = makeDb([
      [{ sector: "technology" }],
      [{}],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "" } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.rewardVision.affordance({ affordance: "expand", currentText: "Some vision." })
    ).rejects.toThrow(/retry/i);
  });

  it("includes current vision text in the LLM prompt", async () => {
    const db = makeDb([
      [{ sector: "financial_services" }],
      [{}],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "Refined vision." } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardVision.affordance({
      affordance: "refine",
      currentText: "UNIQUE_VISION_TEXT_XYZ123",
    });
    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const userPrompt = (callArgs.messages[1] as any).content as string;
    expect(userPrompt).toContain("UNIQUE_VISION_TEXT_XYZ123");
  });
});

// ─── 3. save ──────────────────────────────────────────────────────────────────
describe("rewardVision.save", () => {
  it("returns ok:true on successful save (update path)", async () => {
    const db = makeDb([[{ state: "unconfirmed" }]]); // existing row → update
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardVision.save({ visionText: "Our vision is to use AI." });
    expect(result.ok).toBe(true);
    expect(db._updateSpy).toHaveBeenCalled();
  });

  it("inserts when no existing row", async () => {
    const db = makeDb([[]]); // no existing row → insert
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardVision.save({ visionText: "New vision text." });
    expect(db._insertSpy).toHaveBeenCalled();
  });
});

// ─── 4. confirm ───────────────────────────────────────────────────────────────
describe("rewardVision.confirm", () => {
  it("throws FORBIDDEN when prework is not completed", async () => {
    const db = makeDb([[{ isCompleted: 0 }]]); // prework not done
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardVision.confirm()).rejects.toThrow(/Stage 1/i);
  });

  it("throws BAD_REQUEST when vision text is empty", async () => {
    const db = makeDb([
      [{ isCompleted: 1 }],   // prework done
      [{ visionText: "" }],   // vision is empty
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardVision.confirm()).rejects.toThrow(/empty/i);
  });

  it("throws when vision row does not exist", async () => {
    const db = makeDb([
      [{ isCompleted: 1 }], // prework done
      [],                   // no vision row
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardVision.confirm()).rejects.toThrow();
  });

  it("returns ok:true when prework done and vision has content", async () => {
    const db = makeDb([
      [{ isCompleted: 1 }],                                                   // 1st select: prework done
      [{ visionText: "We will use AI to make pay decisions equitable and fair for all employees." }],   // 2nd select: vision
      [{ state: "unconfirmed" }],                                             // 3rd select: strategy
      [{ state: "unconfirmed" }],                                             // 4th select: principles
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardVision.confirm();
    expect(result.ok).toBe(true);
  });

  it("cascades staleness to confirmed Strategy", async () => {
    const db = makeDb([
      [{ isCompleted: 1 }],              // 1st select: prework done
      [{ visionText: "Our reward AI vision is to create fair and equitable pay for everyone." }],  // 2nd select: vision
      [{ state: "confirmed" }],          // 3rd select: strategy IS confirmed → staled
      [{ state: "unconfirmed" }],        // 4th select: principles
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardVision.confirm();
    // 2 updates: vision confirmed + strategy staled
    expect(db._updateSpy).toHaveBeenCalledTimes(2);
  });

  it("cascades staleness to confirmed Principles", async () => {
    const db = makeDb([
      [{ isCompleted: 1 }],              // 1st select: prework done
      [{ visionText: "Our reward AI vision is to create fair and equitable pay for everyone." }],  // 2nd select: vision
      [{ state: "unconfirmed" }],        // 3rd select: strategy
      [{ state: "confirmed" }],          // 4th select: principles IS confirmed → staled
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardVision.confirm();
    // 2 updates: vision confirmed + principles staled
    expect(db._updateSpy).toHaveBeenCalledTimes(2);
  });

  it("cascades staleness to BOTH Strategy and Principles when both confirmed", async () => {
    const db = makeDb([
      [{ isCompleted: 1 }],              // 1st select: prework done
      [{ visionText: "Our reward AI vision is to create fair and equitable pay for everyone." }],  // 2nd select: vision
      [{ state: "confirmed" }],          // 3rd select: strategy
      [{ state: "confirmed" }],          // 4th select: principles
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardVision.confirm();
    // 3 updates: vision + strategy + principles
    expect(db._updateSpy).toHaveBeenCalledTimes(3);
  });

  it("does NOT cascade when Strategy and Principles are unconfirmed", async () => {
    const db = makeDb([
      [{ isCompleted: 1 }],              // 1st select: prework done
      [{ visionText: "Our reward AI vision is to create fair and equitable pay for everyone." }],  // 2nd select: vision
      [{ state: "unconfirmed" }],        // 3rd select: strategy
      [{ state: "unconfirmed" }],        // 4th select: principles
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardVision.confirm();
    // Only 1 update: vision itself
    expect(db._updateSpy).toHaveBeenCalledTimes(1);
  });
});

// ─── 5. markStale ─────────────────────────────────────────────────────────────
describe("rewardVision.markStale", () => {
  it("marks confirmed vision as stale", async () => {
    const db = makeDb([[{ state: "confirmed" }]]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardVision.markStale();
    expect(result.ok).toBe(true);
    expect(db._updateSpy).toHaveBeenCalled();
  });

  it("does NOT update when vision is already unconfirmed", async () => {
    const db = makeDb([[{ state: "unconfirmed" }]]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardVision.markStale();
    expect(db._updateSpy).not.toHaveBeenCalled();
  });

  it("does NOT update when vision row does not exist", async () => {
    const db = makeDb([[]]); // no row
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardVision.markStale();
    expect(db._updateSpy).not.toHaveBeenCalled();
  });
});

// ─── 6. keepAsIs ──────────────────────────────────────────────────────────────
describe("rewardVision.keepAsIs", () => {
  it("returns ok:true and updates state to confirmed", async () => {
    const db = makeDb([]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardVision.keepAsIs();
    expect(result.ok).toBe(true);
    expect(db._updateSpy).toHaveBeenCalled();
  });
});

// ─── 7. getStatus ─────────────────────────────────────────────────────────────
describe("rewardVision.getStatus", () => {
  it("returns canStart:false when prework not complete", async () => {
    const db = makeDb([
      [{ isCompleted: 0 }], // prework not done
      [],                   // no vision row
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const status = await caller.rewardVision.getStatus();
    expect(status.canStart).toBe(false);
    expect(status.preworkComplete).toBe(false);
    expect(status.canStartMessage).toBeTruthy();
  });

  it("returns canStart:true when prework is complete", async () => {
    const db = makeDb([
      [{ isCompleted: 1 }],
      [{ state: "unconfirmed" }],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const status = await caller.rewardVision.getStatus();
    expect(status.canStart).toBe(true);
    expect(status.preworkComplete).toBe(true);
    expect(status.canStartMessage).toBeNull();
  });

  it("reports visionState as 'confirmed' when confirmed", async () => {
    const db = makeDb([
      [{ isCompleted: 1 }],
      [{ state: "confirmed" }],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const status = await caller.rewardVision.getStatus();
    expect(status.visionState).toBe("confirmed");
  });

  it("reports visionState as 'stale' when stale", async () => {
    const db = makeDb([
      [{ isCompleted: 1 }],
      [{ state: "stale" }],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const status = await caller.rewardVision.getStatus();
    expect(status.visionState).toBe("stale");
  });

  it("defaults visionState to 'unconfirmed' when no row exists", async () => {
    const db = makeDb([
      [{ isCompleted: 1 }],
      [],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const status = await caller.rewardVision.getStatus();
    expect(status.visionState).toBe("unconfirmed");
  });
});
