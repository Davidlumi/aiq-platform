/**
 * Stage 9, 10 & 11 Gate Tests — Increment 3
 *
 * Tests the gate procedures for:
<<<<<<< Updated upstream
 *   - completeStage10: soft gate (review held-at, no content validation)
 *   - completeStage11: hard gate (6 sections present, 1200–4000 words)
 *
 * NOTE: The procedures were renumbered in v4:
 *   - Old completeStage9  → now completeStage10 (review soft gate)
 *   - Old completeStage10 → now completeStage11 (board report hard gate)
=======
 *   - completeStage9:  hard gate — business case narrative (≥50 words)
 *   - completeStage10: soft gate — review session (self-attestation, no content validation)
 *   - completeStage11: hard gate — board report (6 sections present, 1200–4000 words)
>>>>>>> Stashed changes
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
    getTenantById: vi.fn().mockResolvedValue({ name: "Test Org" }),
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
    entitlements: { strategyCompany: true, strategyReward: true, assessment: true },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeDb(overrides: Record<string, unknown> = {}) {
  const mockRows = [
    {
      stageGateStateJson: JSON.stringify({
        stage1: { completedAt: 1700000001000, lastEditedAt: null },
        stage2: { completedAt: 1700000002000, lastEditedAt: null },
        stage3: { completedAt: 1700000003000, lastEditedAt: null },
        stage4: { completedAt: 1700000004000, lastEditedAt: null },
        stage5: { completedAt: 1700000005000, lastEditedAt: null },
        stage6: { completedAt: 1700000006000, lastEditedAt: null },
        stage7: { completedAt: 1700000007000, lastEditedAt: null },
        stage8: { completedAt: 1700000008000, lastEditedAt: null },
      }),
      ...overrides,
    },
  ];
  const setCall: Record<string, unknown> = {};
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockRows),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockImplementation((data) => {
        Object.assign(setCall, data);
        return {
          where: vi.fn().mockResolvedValue([]),
        };
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
    _setCall: setCall,
  };
}

// ─── Helpers to build valid board report sections ─────────────────────────────
const REQUIRED_SECTIONS = [
  "context",
  "strategic_direction",
  "initiative_portfolio",
  "investment_case",
  "capability_readiness",
  "governance",
];

function makeSections(wordCountPerSection = 250): Record<string, { content: string; wordCount: number }> {
  const word = "capability";
  const content = Array(wordCountPerSection).fill(word).join(" ");
  return Object.fromEntries(
    REQUIRED_SECTIONS.map(s => [s, { content, wordCount: wordCountPerSection }])
  );
}

<<<<<<< Updated upstream
// ─── completeStage10 (review soft gate — was completeStage9 in v3) ────────────
=======
const VALID_NARRATIVE =
  "Our business case for this reward strategy is grounded in three pillars: " +
  "market competitiveness, internal equity, and future capability investment. " +
  "We have benchmarked our total reward package against sector peers and identified " +
  "a gap of approximately 8% at the senior professional band. Closing this gap will " +
  "reduce voluntary attrition by an estimated 15% and improve offer acceptance rates. " +
  "The investment is fully funded within existing headcount budget through a reallocation " +
  "of the discretionary bonus pool, which has historically been underspent by 12%.";

// ─── completeStage9 (business case narrative hard gate) ───────────────────────
>>>>>>> Stashed changes
describe("gate.completeStage9", () => {
  it("accepts a narrative of 50+ words", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
<<<<<<< Updated upstream
    const result = await caller.gate.completeStage10({ reviewHeldAt: Date.now() });
=======
    const result = await caller.gate.completeStage9({ businessCaseNarrative: VALID_NARRATIVE });
>>>>>>> Stashed changes
    expect(result.ok).toBe(true);
    expect(result.gateState.stage9.completedAt).toBeTypeOf("number");
    expect(result.gateState.stage9.lastEditedAt).toBeNull();
  });

  it("rejects a narrative shorter than 50 words", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
<<<<<<< Updated upstream
    const result = await caller.gate.completeStage10({});
    expect(result.ok).toBe(true);
=======
    await expect(
      caller.gate.completeStage9({ businessCaseNarrative: "Too short." })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
>>>>>>> Stashed changes
  });

  it("sets stage9.completedAt in stageGateStateJson", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
<<<<<<< Updated upstream
    await caller.gate.completeStage10({ reviewHeldAt: 1700000009000 });
=======
    await caller.gate.completeStage9({ businessCaseNarrative: VALID_NARRATIVE });
>>>>>>> Stashed changes
    const setCall = (db as any)._setCall;
    const updatedState = JSON.parse(setCall.stageGateStateJson);
    expect(updatedState.stage10.completedAt).toBeTypeOf("number");
    expect(updatedState.stage10.completedAt).toBeGreaterThan(0);
  });

  it("throws NOT_FOUND when no org context row exists", async () => {
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
<<<<<<< Updated upstream
    await expect(caller.gate.completeStage10({})).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ─── completeStage11 (board report hard gate — was completeStage10 in v3) ─────
=======
    await expect(
      caller.gate.completeStage9({ businessCaseNarrative: VALID_NARRATIVE })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ─── completeStage10 (review session soft gate) ───────────────────────────────
>>>>>>> Stashed changes
describe("gate.completeStage10", () => {
  it("succeeds as a soft gate with no content validation", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.completeStage10({ reviewHeldAt: Date.now() });
    expect(result.ok).toBe(true);
  });

  it("succeeds even without reviewHeldAt (optional field)", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.completeStage10({});
    expect(result.ok).toBe(true);
  });

  it("sets stage10.completedAt in stageGateStateJson", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.gate.completeStage10({ reviewHeldAt: 1700000010000 });
    const setCall = (db as any)._setCall;
    const updatedState = JSON.parse(setCall.stageGateStateJson);
    expect(updatedState.stage10.completedAt).toBeTypeOf("number");
    expect(updatedState.stage10.completedAt).toBeGreaterThan(0);
  });

  it("throws NOT_FOUND when no org context row exists", async () => {
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.gate.completeStage10({})).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ─── completeStage11 (board report hard gate) ─────────────────────────────────
describe("gate.completeStage11", () => {
  it("succeeds when all 6 sections are present and word count is in range", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const sections = makeSections(250); // 6 × 250 = 1500 words
    const result = await caller.gate.completeStage11({
      boardReportSectionsJson: JSON.stringify(sections),
    });
    expect(result.ok).toBe(true);
    expect(result.totalWords).toBe(1500);
  });

  it("rejects when a required section is missing", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const sections = makeSections(250);
    delete (sections as any).governance;
    await expect(
      caller.gate.completeStage11({ boardReportSectionsJson: JSON.stringify(sections) })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects when total word count is below 1200", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const sections = makeSections(100); // 6 × 100 = 600 words — below threshold
    await expect(
      caller.gate.completeStage11({ boardReportSectionsJson: JSON.stringify(sections) })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects when total word count exceeds 4000", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const sections = makeSections(800); // 6 × 800 = 4800 words — above threshold
    await expect(
      caller.gate.completeStage11({ boardReportSectionsJson: JSON.stringify(sections) })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects when boardReportSectionsJson is invalid JSON", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.gate.completeStage11({ boardReportSectionsJson: "not-valid-json" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("sets stage11.completedAt in stageGateStateJson", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const sections = makeSections(250);
    await caller.gate.completeStage11({ boardReportSectionsJson: JSON.stringify(sections) });
    const setCall = (db as any)._setCall;
    const updatedState = JSON.parse(setCall.stageGateStateJson);
    expect(updatedState.stage11.completedAt).toBeTypeOf("number");
  });

  it("persists boardReportIncludeNotes when provided", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const sections = makeSections(250);
    await caller.gate.completeStage11({
      boardReportSectionsJson: JSON.stringify(sections),
      boardReportIncludeNotes: true,
    });
    const setCall = (db as any)._setCall;
    expect(setCall.boardReportIncludeNotes).toBe(true);
  });

  it("accepts exactly 1200 words (boundary)", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    const sections = makeSections(200); // 6 × 200 = 1200 words — exactly at boundary
    const result = await caller.gate.completeStage11({
      boardReportSectionsJson: JSON.stringify(sections),
    });
    expect(result.ok).toBe(true);
    expect(result.totalWords).toBe(1200);
  });

  it("accepts exactly 4000 words (boundary)", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const caller = appRouter.createCaller(makeCtx());
    // 5 sections × 700 + 1 section × 500 = 4000
    const sections: Record<string, { content: string; wordCount: number }> = {};
    const word = "capability";
    for (let i = 0; i < 5; i++) {
      const s = REQUIRED_SECTIONS[i];
      sections[s] = { content: Array(700).fill(word).join(" "), wordCount: 700 };
    }
    sections[REQUIRED_SECTIONS[5]] = {
      content: Array(500).fill(word).join(" "),
      wordCount: 500,
    };
    const result = await caller.gate.completeStage11({
      boardReportSectionsJson: JSON.stringify(sections),
    });
    expect(result.ok).toBe(true);
    expect(result.totalWords).toBe(4000);
  });
});
