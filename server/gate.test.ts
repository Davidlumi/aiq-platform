/**
 * Gate Router Tests — Increment 1
 *
 * Tests the stage gate state machine:
 *   - completeStage2: vision word-count gate
 *   - completeStage3: strategy archetype + word-count gate
 *   - completeStage4: principles count + won't-do count gate
 *   - markEdited: marks a stage as edited (cascade warning trigger)
 *   - getState: returns the current gate state
 *   - parseGateState / isCleared / isEdited logic (unit)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
// We mock the DB module so tests don't hit a real database.
vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    getDb: vi.fn(),
    getTenantById: vi.fn().mockResolvedValue({ name: "Test Org" }),
  };
});

import { getDb } from "./db";

// ─── Reset mocks between tests ───────────────────────────────────────────────
beforeEach(() => {
  vi.resetAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    tenantId: "tenant-test",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser = makeUser()): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeDb(orgCtxOverrides: Record<string, any> = {}) {
  const defaultOrgCtx = {
    stageGateStateJson: null,
    preworkCompletedAt: null,
    visionConfirmedAt: null,
    strategyConfirmedAt: null,
    stage4ConfirmedAt: null,
    visionInspirationSource: null,
    guidingPrinciplesJson: JSON.stringify([
      { title: "Principle 1", description: "Desc 1" },
      { title: "Principle 2", description: "Desc 2" },
      { title: "Principle 3", description: "Desc 3" },
    ]),
    wontDoJson: JSON.stringify([
      { text: "Won't do item 1" },
      { text: "Won't do item 2" },
    ]),
    backgroundInputsJson: null,
    sectionIJson: null,
    sectionKJson: null,
    capabilityAssessmentJson: null,
    fitImpactResultsJson: null,
    visionStatement: "We will build a world-class HR function powered by AI",
    strategyArchetype: "augmentation",
    strategyStatement: "We will augment our HR professionals with AI tools to improve decision-making",
    ...orgCtxOverrides,
  };

  const mockUpdate = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([defaultOrgCtx]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue(mockUpdate),
    _mockUpdate: mockUpdate,
  };
}

// ─── completeStage2 ───────────────────────────────────────────────────────────
describe("gate.completeStage2", () => {
  it("rejects a vision statement with fewer than 10 words", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.gate.completeStage2({ visionStatement: "Too short vision" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts a vision statement with exactly 10 words", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.completeStage2({
      visionStatement: "We will build a world-class HR function powered by AI",
    });
    expect(result.ok).toBe(true);
    expect(result.gateState.stage2.completedAt).toBeTypeOf("number");
    expect(result.gateState.stage2.lastEditedAt).toBeNull();
  });

  it("accepts a vision statement with an inspiration source", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.completeStage2({
      visionStatement: "We will build a world-class HR function powered by AI and data",
      visionInspirationSource: "Google HR Strategy 2024",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects when org context row is not found", async () => {
    const db = makeDb();
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.gate.completeStage2({
        visionStatement: "We will build a world-class HR function powered by AI",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ─── completeStage3 ───────────────────────────────────────────────────────────
describe("gate.completeStage3", () => {
  it("rejects a strategy statement with fewer than 15 words", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.gate.completeStage3({
        strategyArchetype: "augmentation",
        strategyStatement: "We will use AI to help HR",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts a valid archetype and strategy statement with 15+ words", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.completeStage3({
      strategyArchetype: "augmentation",
      strategyStatement:
        "We will augment our HR professionals with AI tools to improve decision-making speed and quality across all HR domains",
    });
    expect(result.ok).toBe(true);
    expect(result.gateState.stage3.completedAt).toBeTypeOf("number");
    expect(result.gateState.stage3.lastEditedAt).toBeNull();
  });

  it("rejects an invalid archetype", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.gate.completeStage3({
        strategyArchetype: "invalid_archetype" as any,
        strategyStatement:
          "We will augment our HR professionals with AI tools to improve decision-making speed and quality",
      })
    ).rejects.toBeDefined();
  });

  it("accepts all valid archetypes", async () => {
    const archetypes = ["augmentation", "transformation", "differentiation", "efficiency", "defensive"] as const;
    for (const archetype of archetypes) {
      const db = makeDb();
      vi.mocked(getDb).mockResolvedValue(db as any);
      const caller = appRouter.createCaller(makeCtx());
      const result = await caller.gate.completeStage3({
        strategyArchetype: archetype,
        strategyStatement:
          "We will build a world-class HR function powered by AI tools and data-driven insights for all employees",
      });
      expect(result.ok).toBe(true);
    }
  });
});

// ─── completeStage4 ───────────────────────────────────────────────────────────
describe("gate.completeStage4", () => {
  it("rejects when fewer than 3 principles are set", async () => {
    const db = makeDb({
      guidingPrinciplesJson: JSON.stringify([
        { title: "Principle 1", description: "Desc 1" },
        { title: "Principle 2", description: "Desc 2" },
      ]),
    });
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.gate.completeStage4()).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects when fewer than 2 won't-do items are set", async () => {
    const db = makeDb({
      wontDoJson: JSON.stringify([{ text: "Only one item" }]),
    });
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.gate.completeStage4()).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts when 3+ principles and 2+ won't-do items are set", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.completeStage4();
    expect(result.ok).toBe(true);
    expect(result.gateState.stage4.completedAt).toBeTypeOf("number");
    expect(result.gateState.stage4.lastEditedAt).toBeNull();
  });

  it("accepts with exactly 3 principles and 2 won't-do items (boundary)", async () => {
    const db = makeDb({
      guidingPrinciplesJson: JSON.stringify([
        { title: "P1", description: "D1" },
        { title: "P2", description: "D2" },
        { title: "P3", description: "D3" },
      ]),
      wontDoJson: JSON.stringify([
        { text: "Item 1" },
        { text: "Item 2" },
      ]),
    });
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.completeStage4();
    expect(result.ok).toBe(true);
  });
});

// ─── markEdited ───────────────────────────────────────────────────────────────
describe("gate.markEdited", () => {
  it("marks stage2 as edited (sets lastEditedAt)", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.markEdited({ stage: "stage2" });
    expect(result.ok).toBe(true);
    // Verify the DB update was called with a JSON string containing lastEditedAt
    const setCall = db._mockUpdate.set.mock.calls[0]?.[0];
    expect(setCall).toBeDefined();
    const updatedState = JSON.parse(setCall.stageGateStateJson);
    expect(updatedState.stage2.lastEditedAt).toBeTypeOf("number");
  });

  it("marks stage4 as edited", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.markEdited({ stage: "stage4" });
    expect(result.ok).toBe(true);
  });

  it("rejects an invalid stage name", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.gate.markEdited({ stage: "stage5" as any })
    ).rejects.toBeDefined();
  });
});

// ─── getState ─────────────────────────────────────────────────────────────────
describe("gate.getState", () => {
  it("returns default gate state when no gate state is persisted", async () => {
    const db = makeDb({ stageGateStateJson: null });
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.getState();
    expect(result.gateState.stage1.completedAt).toBeNull();
    expect(result.gateState.stage2.completedAt).toBeNull();
    expect(result.gateState.stage3.completedAt).toBeNull();
    expect(result.gateState.stage4.completedAt).toBeNull();
    expect(result.stage1Cleared).toBe(false);
    expect(result.stage2Cleared).toBe(false);
  });

  it("returns persisted gate state", async () => {
    const persistedState = {
      stage1: { completedAt: 1700000000000, lastEditedAt: null },
      stage2: { completedAt: 1700000001000, lastEditedAt: null },
      stage3: { completedAt: null, lastEditedAt: null },
      stage4: { completedAt: null, lastEditedAt: null },
    };
    const db = makeDb({ stageGateStateJson: JSON.stringify(persistedState) });
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.getState();
    expect(result.gateState.stage1.completedAt).toBe(1700000000000);
    expect(result.gateState.stage2.completedAt).toBe(1700000001000);
    expect(result.gateState.stage3.completedAt).toBeNull();
    expect(result.stage1Cleared).toBe(true);
    expect(result.stage2Cleared).toBe(true);
    expect(result.stage3Cleared).toBe(false);
  });

  it("returns stage2Cleared=true when completedAt > lastEditedAt", async () => {
    const persistedState = {
      stage1: { completedAt: 1700000000000, lastEditedAt: null },
      stage2: { completedAt: 1700000002000, lastEditedAt: 1700000001000 },
      stage3: { completedAt: null, lastEditedAt: null },
      stage4: { completedAt: null, lastEditedAt: null },
    };
    const db = makeDb({ stageGateStateJson: JSON.stringify(persistedState) });
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.getState();
    // stage2: completedAt (2000) > lastEditedAt (1000) → cleared
    expect(result.stage2Cleared).toBe(true);
    expect(result.stage2EditedAfterClearing).toBe(false);
    expect(result.gateState.stage2.completedAt).toBe(1700000002000);
    expect(result.gateState.stage2.lastEditedAt).toBe(1700000001000);
  });
});
