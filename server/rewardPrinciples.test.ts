/**
 * Stage 4 — Reward AI Principles & Won't-dos: Comprehensive Tests
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  runRewardRecommendationEngine,
  buildEngineInputs,
} from "./services/rewardRecommendationEngine";
import { REWARD_INITIATIVE_LIBRARY } from "../shared/rewardInitiativeLibrary";

vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    getDb: vi.fn(),
    getTenantById: vi.fn().mockResolvedValue({ name: "Acme Financial Services" }),
  };
});

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";

beforeEach(() => {
  vi.resetAllMocks();
});

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

function makeDb(selectQueue: Record<string, unknown>[][] = []) {
  let selectIdx = 0;

  const updateWhereSpy = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
  const updateSetSpy = vi.fn().mockReturnValue({ where: updateWhereSpy });
  const updateSpy = vi.fn().mockReturnValue({ set: updateSetSpy });

  const insertValuesSpy = vi.fn().mockResolvedValue([{ insertId: 1 }]);
  const insertSpy = vi.fn().mockReturnValue({ values: insertValuesSpy });

  /**
   * Build a thenable chain that:
   *   - resolves to `rows` when awaited directly (i.e., .from() is terminal)
   *   - returns a new Promise resolving to `rows` when .where() is called
   *   - supports .orderBy() and .limit() for chaining
   */
  function makeSelectChain(rows: Record<string, unknown>[]) {
    const chain: any = {
      then(onFulfilled: any, onRejected: any) {
        return Promise.resolve(rows).then(onFulfilled, onRejected);
      },
      catch(onRejected: any) {
        return Promise.resolve(rows).catch(onRejected);
      },
      finally(onFinally: any) {
        return Promise.resolve(rows).finally(onFinally);
      },
      where: vi.fn().mockResolvedValue(rows),
      limit: vi.fn().mockResolvedValue(rows),
      orderBy: vi.fn().mockReturnThis(),
    };
    return chain;
  }

  const selectSpy = vi.fn().mockImplementation(() => {
    const rows = selectQueue[selectIdx] ?? [];
    selectIdx++;
    const chain = makeSelectChain(rows);
    chain.from = vi.fn().mockImplementation(() => makeSelectChain(rows));
    return chain;
  });

  return { select: selectSpy, update: updateSpy, insert: insertSpy, _updateSpy: updateSpy, _insertSpy: insertSpy };
}

function makeBaseInputs(principlesOverrides: Record<string, unknown> = {}) {
  return buildEngineInputs(
    { sector: "financial_services", totalEmployeeHeadcount: 5000, annualPayrollGbp: 250_000_000, isCompleted: 1 },
    { rewardAiAmbitionLevel: 3, topRewardPrioritiesNext12Months: ["pay_equity_audit"], isCompleted: 1 },
    principlesOverrides as any
  );
}

// ─── 1. generate ─────────────────────────────────────────────────────────────
describe("rewardPrinciples.generate", () => {
  it("returns principles and wontDos when LLM succeeds", async () => {
    const db = makeDb([
      [{ sector: "financial_services" }],
      [{ rewardAiAmbitionLevel: 3 }],
      [{ visionText: "Our vision.", state: "confirmed" }],
      [{ strategicShiftsJson: [] }],
      [{ principleId: "pay_explainability", text: "We will ensure every pay decision can be explained." }],
      [{ wontDoId: "no_full_automation", text: "We won't automate pay decisions without human review." }],
      [],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        principles: [{ principleId: "pay_explainability", text: "We will ensure every pay decision can be explained.", source: "ai_suggested" }],
        wontDos: [{ wontDoId: "no_full_automation", text: "We won't automate pay decisions without human review.", source: "ai_suggested" }],
      }) } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardPrinciples.generate();
    expect(result.principles.length).toBeGreaterThanOrEqual(1);
    expect(result.wontDos.length).toBeGreaterThanOrEqual(1);
    expect(result.principles[0]).toHaveProperty("id");
    expect(result.principles[0]).toHaveProperty("text");
    expect(result.principles[0]).toHaveProperty("principleId");
  });

  it("throws with manual-write message when LLM throws", async () => {
    const db = makeDb([[{ sector: "technology" }], [{}], [], [{}], [], []]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("LLM timeout"));
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardPrinciples.generate()).rejects.toThrow(/manually/i);
  });

  it("throws with manual-write message when LLM returns empty principles", async () => {
    const db = makeDb([[{ sector: "technology" }], [{}], [], [{}], [], []]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ principles: [], wontDos: [] }) } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardPrinciples.generate()).rejects.toThrow(/manually/i);
  });

  it("maps canonical principleId from template when provided", async () => {
    const db = makeDb([
      [{ sector: "financial_services" }], [{}], [], [{}],
      [{ principleId: "pay_explainability", text: "We will ensure every pay decision can be explained." }],
      [], [],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        principles: [{ principleId: "pay_explainability", text: "We will ensure every pay decision can be explained.", source: "ai_suggested" }],
        wontDos: [],
      }) } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardPrinciples.generate();
    const p = result.principles.find(p => p.principleId === "pay_explainability");
    expect(p).toBeDefined();
  });

  it("allows custom principles with null principleId", async () => {
    const db = makeDb([[{ sector: "financial_services" }], [{}], [], [{}], [], [], []]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        principles: [{ principleId: null, text: "We will use AI responsibly.", source: "ai_suggested" }],
        wontDos: [],
      }) } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardPrinciples.generate();
    expect(result.principles[0].principleId).toBeNull();
  });
});

// ─── 2. suggestPrinciple ──────────────────────────────────────────────────────
describe("rewardPrinciples.suggestPrinciple", () => {
  it("returns a new principle suggestion", async () => {
    const db = makeDb([
      [{ sector: "financial_services" }], [{}], [], [{}],
      [{ principleId: "pay_explainability", text: "We will ensure every pay decision can be explained." }],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ principleId: null, text: "We will audit AI pay recommendations quarterly." }) } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardPrinciples.suggestPrinciple();
    expect(result.principle).toHaveProperty("text");
  });

  it("throws when LLM fails on suggestPrinciple", async () => {
    const db = makeDb([[{ sector: "technology" }], [{}], [], [{}], []]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("timeout"));
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardPrinciples.suggestPrinciple()).rejects.toThrow();
  });
});

// ─── 3. suggestWontDo ─────────────────────────────────────────────────────────
describe("rewardPrinciples.suggestWontDo", () => {
  it("returns a new won't-do suggestion", async () => {
    const db = makeDb([
      [{ sector: "financial_services" }], [{}], [], [{}],
      [{ wontDoId: "no_full_automation", text: "We won't automate pay decisions without human review." }],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ wontDoId: null, text: "We won't use AI to determine redundancy." }) } }],
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardPrinciples.suggestWontDo();
    expect(result.wontDo).toHaveProperty("text");
  });

  it("throws when LLM fails on suggestWontDo", async () => {
    const db = makeDb([[{ sector: "technology" }], [{}], [], [{}], []]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("timeout"));
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardPrinciples.suggestWontDo()).rejects.toThrow();
  });
});

// ─── 4. confirm ───────────────────────────────────────────────────────────────
describe("rewardPrinciples.confirm", () => {
  it("throws FORBIDDEN when strategy is not confirmed", async () => {
    const db = makeDb([[{ state: "unconfirmed" }]]); // strategy not confirmed
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardPrinciples.confirm()).rejects.toThrow(/Stage 3/i);
  });

  it("throws BAD_REQUEST when no principles exist", async () => {
    const db = makeDb([
      [{ state: "confirmed" }],        // strategy confirmed
      [{ principlesJson: [] }],         // no principles
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardPrinciples.confirm()).rejects.toThrow(/required/i);
  });

  it("throws when principles row does not exist", async () => {
    const db = makeDb([
      [{ state: "confirmed" }], // strategy confirmed
      [],                       // no principles row
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.rewardPrinciples.confirm()).rejects.toThrow();
  });

  it("returns ok:true when strategy confirmed and principles exist", async () => {
    const db = makeDb([
      [{ state: "confirmed" }],  // 1st select: strategy confirmed
      [{
        principlesJson: [{ id: "p1", principleId: "pay_explainability", text: "We will ensure explainability.", selected: true, source: "ai_suggested" }],
      }],                        // 2nd select: principles
    ]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardPrinciples.confirm();
    expect(result.ok).toBe(true);
    expect(db._updateSpy).toHaveBeenCalled();
  });
});

// ─── 5. markStale ─────────────────────────────────────────────────────────────
describe("rewardPrinciples.markStale", () => {
  it("marks confirmed principles as stale", async () => {
    const db = makeDb([[{ state: "confirmed" }]]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardPrinciples.markStale();
    expect(result.ok).toBe(true);
    expect(db._updateSpy).toHaveBeenCalled();
  });

  it("does NOT update when principles are already unconfirmed", async () => {
    const db = makeDb([[{ state: "unconfirmed" }]]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardPrinciples.markStale();
    expect(db._updateSpy).not.toHaveBeenCalled();
  });

  it("does NOT update when principles row does not exist", async () => {
    const db = makeDb([[]]); // no row
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.rewardPrinciples.markStale();
    expect(db._updateSpy).not.toHaveBeenCalled();
  });
});

// ─── 6. keepAsIs ──────────────────────────────────────────────────────────────
describe("rewardPrinciples.keepAsIs", () => {
  it("returns ok:true and updates state to confirmed", async () => {
    const db = makeDb([]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rewardPrinciples.keepAsIs();
    expect(result.ok).toBe(true);
    expect(db._updateSpy).toHaveBeenCalled();
  });
});

// ─── 7. getStatus ─────────────────────────────────────────────────────────────
describe("rewardPrinciples.getStatus", () => {
  it("returns principlesState as 'confirmed' when confirmed", async () => {
    const db = makeDb([[{ isCompleted: 1 }], [{ state: "confirmed" }]]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const status = await caller.rewardPrinciples.getStatus();
    expect(status.principlesState).toBe("confirmed");
  });

  it("returns principlesState as 'stale' when stale", async () => {
    const db = makeDb([[{ isCompleted: 1 }], [{ state: "stale" }]]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const status = await caller.rewardPrinciples.getStatus();
    expect(status.principlesState).toBe("stale");
  });

  it("defaults principlesState to 'unconfirmed' when no row exists", async () => {
    const db = makeDb([[{ isCompleted: 1 }], []]);
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const status = await caller.rewardPrinciples.getStatus();
    expect(status.principlesState).toBe("unconfirmed");
  });
});

// ─── 8. Principle boost — cumulative scoring ──────────────────────────────────
describe("Principle boost — cumulative scoring", () => {
  it("all 30 initiatives have supportsPrincipleIds field", () => {
    expect(REWARD_INITIATIVE_LIBRARY).toHaveLength(30);
    for (const init of REWARD_INITIATIVE_LIBRARY) {
      expect(init).toHaveProperty("supportsPrincipleIds");
      expect(Array.isArray(init.supportsPrincipleIds)).toBe(true);
    }
  });

  it("no boost when no confirmed principles", () => {
    const inputs = makeBaseInputs({
      confirmedPrincipleIds: [],
      confirmedWontDoIds: [],
      principleTextByPrincipleId: {},
      wontDoNotesByWontDoId: {},
      wontDoAffectedNumbersByWontDoId: {},
    });
    const output = runRewardRecommendationEngine(inputs);
    for (const r of output.recommended) {
      expect(r.principleBoostApplied).toBe(false);
    }
  });

  it("applies boost to initiatives supporting confirmed principles", () => {
    const init1 = REWARD_INITIATIVE_LIBRARY.find(i => i.number === 1)!;
    expect(init1).toBeDefined();
    const confirmedPrincipleIds = init1.supportsPrincipleIds.slice(0, 1);
    const inputs = makeBaseInputs({
      confirmedPrincipleIds,
      confirmedWontDoIds: [],
      principleTextByPrincipleId: Object.fromEntries(confirmedPrincipleIds.map(id => [id, `Principle text for ${id}`])),
      wontDoNotesByWontDoId: {},
      wontDoAffectedNumbersByWontDoId: {},
    });
    const output = runRewardRecommendationEngine(inputs);
    const result1 = [...output.recommended, ...output.notRecommended].find(r => r.id === init1.id);
    if (result1 && result1.fitSignal !== "NOT_RECOMMENDED") {
      expect(result1.principleBoostApplied).toBe(true);
      expect(result1.alignedPrincipleTexts.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("boost is cumulative: 3 aligned principles score higher than 1", () => {
    const init = REWARD_INITIATIVE_LIBRARY.find(i => i.supportsPrincipleIds.length >= 3)!;
    expect(init).toBeDefined();

    const inputs1 = makeBaseInputs({
      confirmedPrincipleIds: [init.supportsPrincipleIds[0]],
      confirmedWontDoIds: [],
      principleTextByPrincipleId: { [init.supportsPrincipleIds[0]]: "Principle 1" },
      wontDoNotesByWontDoId: {},
      wontDoAffectedNumbersByWontDoId: {},
    });
    const out1 = runRewardRecommendationEngine(inputs1);
    const r1 = [...out1.recommended, ...out1.notRecommended].find(r => r.id === init.id);

    const inputs3 = makeBaseInputs({
      confirmedPrincipleIds: init.supportsPrincipleIds.slice(0, 3),
      confirmedWontDoIds: [],
      principleTextByPrincipleId: Object.fromEntries(init.supportsPrincipleIds.slice(0, 3).map(id => [id, `Principle ${id}`])),
      wontDoNotesByWontDoId: {},
      wontDoAffectedNumbersByWontDoId: {},
    });
    const out3 = runRewardRecommendationEngine(inputs3);
    const r3 = [...out3.recommended, ...out3.notRecommended].find(r => r.id === init.id);

    if (r1 && r3 && r1.fitSignal !== "NOT_RECOMMENDED" && r3.fitSignal !== "NOT_RECOMMENDED") {
      expect(r3.fitScore).toBeGreaterThan(r1.fitScore);
    }
  });

  it("boost is capped at +0.3 regardless of aligned principle count", () => {
    const init = REWARD_INITIATIVE_LIBRARY.find(i => i.supportsPrincipleIds.length >= 3)!;
    const allPrincipleIds = init.supportsPrincipleIds;

    const baseInputs = makeBaseInputs({
      confirmedPrincipleIds: [],
      confirmedWontDoIds: [],
      principleTextByPrincipleId: {},
      wontDoNotesByWontDoId: {},
      wontDoAffectedNumbersByWontDoId: {},
    });
    const baseOut = runRewardRecommendationEngine(baseInputs);
    const baseResult = [...baseOut.recommended, ...baseOut.notRecommended].find(r => r.id === init.id);

    const boostedInputs = makeBaseInputs({
      confirmedPrincipleIds: allPrincipleIds,
      confirmedWontDoIds: [],
      principleTextByPrincipleId: Object.fromEntries(allPrincipleIds.map(id => [id, `Principle ${id}`])),
      wontDoNotesByWontDoId: {},
      wontDoAffectedNumbersByWontDoId: {},
    });
    const boostedOut = runRewardRecommendationEngine(boostedInputs);
    const boostedResult = [...boostedOut.recommended, ...boostedOut.notRecommended].find(r => r.id === init.id);

    if (baseResult && boostedResult && baseResult.fitSignal !== "NOT_RECOMMENDED") {
      const actualBoost = boostedResult.fitScore - baseResult.fitScore;
      expect(actualBoost).toBeLessThanOrEqual(0.31);
    }
  });

  it("alignedPrincipleTexts contains text for each aligned principle", () => {
    const init = REWARD_INITIATIVE_LIBRARY.find(i => i.supportsPrincipleIds.length >= 1)!;
    const principleId = init.supportsPrincipleIds[0];
    const principleText = "We will ensure every pay decision can be explained to the employee.";
    const inputs = makeBaseInputs({
      confirmedPrincipleIds: [principleId],
      confirmedWontDoIds: [],
      principleTextByPrincipleId: { [principleId]: principleText },
      wontDoNotesByWontDoId: {},
      wontDoAffectedNumbersByWontDoId: {},
    });
    const output = runRewardRecommendationEngine(inputs);
    const result = [...output.recommended, ...output.notRecommended].find(r => r.id === init.id);
    if (result && result.fitSignal !== "NOT_RECOMMENDED") {
      expect(result.alignedPrincipleTexts).toContain(principleText);
    }
  });

  it("wontDoReassuranceNotes populated when initiative is affected by a confirmed won't-do", () => {
    const init1 = REWARD_INITIATIVE_LIBRARY.find(i => i.number === 1)!;
    const wontDoId = "no_full_automation";
    const inputs = makeBaseInputs({
      confirmedPrincipleIds: [],
      confirmedWontDoIds: [wontDoId],
      principleTextByPrincipleId: {},
      wontDoNotesByWontDoId: { [wontDoId]: "This initiative keeps humans in the loop for all pay decisions." },
      wontDoAffectedNumbersByWontDoId: { [wontDoId]: [1] },
    });
    const output = runRewardRecommendationEngine(inputs);
    const result = [...output.recommended, ...output.notRecommended].find(r => r.id === init1.id);
    if (result) {
      expect(result.wontDoReassuranceNotes).toContain("This initiative keeps humans in the loop for all pay decisions.");
    }
  });

  it("boost is NOT applied to NOT_RECOMMENDED initiatives", () => {
    const inputs = buildEngineInputs(
      { sector: "public_sector", totalEmployeeHeadcount: 5000, annualPayrollGbp: 200_000_000, isCompleted: 1 },
      { rewardAiAmbitionLevel: 1, topRewardPrioritiesNext12Months: [], isCompleted: 1 },
      {
        confirmedPrincipleIds: ["pay_explainability", "evidence_based", "manager_authority"],
        confirmedWontDoIds: [],
        principleTextByPrincipleId: { pay_explainability: "P1", evidence_based: "P2", manager_authority: "P3" },
        wontDoNotesByWontDoId: {},
        wontDoAffectedNumbersByWontDoId: {},
      }
    );
    const output = runRewardRecommendationEngine(inputs);
    for (const r of output.notRecommended) {
      expect(r.principleBoostApplied).toBe(false);
    }
  });
});
