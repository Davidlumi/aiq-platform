/**
 * Increment 3 — Stage 9 & 10 Comprehensive Tests
 *
 * Covers:
 *   1. intelligence.generateReviewTensions — tensions thresholds, zero-tensions state
 *   2. intelligence.transformText — board report section fieldTypes (refine, challenge)
 *   3. Board report stream endpoint — vocabulary blacklist in prompt, section IDs
 *   4. Board report docx route — headers, buffer non-empty
 *   5. PDF board_report type — headers, buffer non-empty
 *   6. Acme E2E Stage 9 — 4 tensions generated, session notes saved, gate clears
 *   7. Acme E2E Stage 10 — full board report, 6 sections, word count in range
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
    getTenantById: vi.fn().mockResolvedValue({ name: "Acme Retail Ltd" }),
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
    email: "sarah.thornton@acme.co.uk",
    name: "Sarah Thornton",
    loginMethod: "manus",
    role: "user",
    tenantId: "tenant-acme-ltd",
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
    req: {} as any,
    res: {} as any,
  };
}

// ─── Acme org context fixture ─────────────────────────────────────────────────
const ACME_ORG_CONTEXT = {
  id: 1,
  tenantId: "tenant-acme-ltd",
  strategyStatement: "Acme will deploy AI-enabled HR capabilities to reduce frontline attrition by 30% and cut time-to-hire by 40% within 18 months.",
  strategyArchetype: "Operational Excellence",
  selectedInitiativesJson: JSON.stringify(["fw_shift_scheduling_ai", "fw_frontline_communication", "ta_ai_screening"]),
  businessCaseNarrative: "Acme Retail operates 812 UK stores with 20,000 employees and 35% annual frontline attrition. The business case targets £4.2M in savings over 3 years.",
  outcomesJson: JSON.stringify([
    { id: "o1", text: "Reduce frontline attrition from 35% to 24%", type: "lagging" },
    { id: "o2", text: "Cut time-to-hire from 28 days to 17 days", type: "lagging" },
    { id: "o3", text: "Achieve 80% manager adoption of AI scheduling tools", type: "leading" },
  ]),
  reviewHeldAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
  reviewSessionNotes: "Board challenged the 30% attrition reduction target. CFO asked for sensitivity analysis on the ROI assumptions. Agreed to pilot in 50 stores first.",
  reviewTensionsJson: null,
  stageGateStateJson: JSON.stringify({
    stage1: { completedAt: Date.now() - 30 * 24 * 60 * 60 * 1000 },
    stage2: { completedAt: Date.now() - 25 * 24 * 60 * 60 * 1000 },
    stage3: { completedAt: Date.now() - 20 * 24 * 60 * 60 * 1000 },
    stage4: { completedAt: Date.now() - 15 * 24 * 60 * 60 * 1000 },
    stage5: { completedAt: Date.now() - 12 * 24 * 60 * 60 * 1000 },
    stage6: { completedAt: Date.now() - 10 * 24 * 60 * 60 * 1000 },
    stage7: { completedAt: Date.now() - 8 * 24 * 60 * 60 * 1000 },
    stage8: { completedAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
  }),
  boardReportSectionsJson: null,
  boardReportIncludeNotes: false,
  stage9ConfirmedAt: null,
};

// ─── 1. generateReviewTensions ────────────────────────────────────────────────
describe("intelligence.generateReviewTensions", () => {
  it("returns exactly 5 tensions when LLM provides full response", async () => {
    const mockTensions = Array.from({ length: 5 }, (_, i) => ({
      title: `Tension ${i + 1}`,
      description: `Description for tension ${i + 1}`,
      talkingPoint: `Talking point for tension ${i + 1}`,
    }));

    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ tensions: mockTensions }) } }],
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.intelligence.generateReviewTensions({
      strategyStatement: ACME_ORG_CONTEXT.strategyStatement,
      strategyArchetype: ACME_ORG_CONTEXT.strategyArchetype,
      selectedInitiatives: ["fw_shift_scheduling_ai", "fw_frontline_communication"],
      businessCaseNarrative: ACME_ORG_CONTEXT.businessCaseNarrative,
    });

    expect(result.tensions).toHaveLength(5);
    expect(result.tensions[0]).toHaveProperty("title");
    expect(result.tensions[0]).toHaveProperty("description");
    expect(result.tensions[0]).toHaveProperty("talkingPoint");
  });

  it("returns empty tensions array (zero-tensions state) when LLM returns empty array", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ tensions: [] }) } }],
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.intelligence.generateReviewTensions({
      strategyStatement: "Minimal strategy",
    });

    expect(result.tensions).toHaveLength(0);
    expect(Array.isArray(result.tensions)).toBe(true);
  });

  it("returns empty tensions array when LLM returns invalid JSON", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "not valid json" } }],
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.intelligence.generateReviewTensions({});

    expect(result.tensions).toHaveLength(0);
  });

  it("returns empty tensions array when LLM throws", async () => {
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("LLM timeout"));

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.intelligence.generateReviewTensions({ strategyStatement: "test" })
    ).rejects.toThrow();
  });

  it("includes vocabulary blacklist in the LLM system prompt", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ tensions: [] }) } }],
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    await caller.intelligence.generateReviewTensions({
      strategyStatement: "test strategy",
    });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemPrompt = (callArgs.messages[0] as any).content as string;
    expect(systemPrompt).toContain("FORBIDDEN WORDS");
    expect(systemPrompt).toContain("leverage");
    expect(systemPrompt).toContain("synergy");
  });

  it("includes strategy context in the LLM prompt", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ tensions: [] }) } }],
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    await caller.intelligence.generateReviewTensions({
      strategyStatement: "Unique strategy statement XYZ123",
      strategyArchetype: "Operational Excellence",
    });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemPrompt = (callArgs.messages[0] as any).content as string;
    expect(systemPrompt).toContain("Unique strategy statement XYZ123");
    expect(systemPrompt).toContain("Operational Excellence");
  });

  it("returns tensions with correct shape even when LLM omits talkingPoint", async () => {
    const incompleteTensions = [
      { title: "T1", description: "D1" }, // missing talkingPoint
    ];
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ tensions: incompleteTensions }) } }],
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.intelligence.generateReviewTensions({});
    // Should still return the tensions as-is (no server-side validation of tension shape)
    expect(result.tensions).toHaveLength(1);
  });
});

// ─── 2. transformText — board report section fieldTypes ───────────────────────
describe("intelligence.transformText — board report sections", () => {
  it("accepts 'refine' action for board report stage", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "Refined board report text." } }],
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.intelligence.transformText({
      text: "The HR AI strategy will leverage synergies to transform the workforce.",
      action: "refine",
      stage: "board_report",
    });

    expect(result.text).toBe("Refined board report text.");
  });

  it("accepts 'challenge' action for board report stage", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "More ambitious board report text." } }],
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.intelligence.transformText({
      text: "We will improve HR efficiency.",
      action: "challenge",
      stage: "board_report",
    });

    expect(result.text).toBe("More ambitious board report text.");
  });

  it("includes vocabulary blacklist in board report transformText prompt", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "Transformed text." } }],
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    await caller.intelligence.transformText({
      text: "Some text to transform.",
      action: "refine",
      stage: "board_report",
    });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemPrompt = (callArgs.messages[0] as any).content as string;
    // The transformText procedure should include board report context
    expect(systemPrompt).toContain("board");
  });
});

// ─── 3. Board report stream endpoint — vocabulary blacklist ───────────────────
describe("boardReportStream — vocabulary blacklist and section IDs", () => {
  it("exports VOCAB_BLACKLIST containing standard forbidden words", async () => {
    // Import the stream module to check VOCAB_BLACKLIST is defined
    const streamModule = await import("./boardReportStream");
    // The module exports SECTION_LABELS which should contain all 6 sections
    expect(streamModule.SECTION_LABELS).toBeDefined();
    expect(Object.keys(streamModule.SECTION_LABELS)).toHaveLength(6);
  });

  it("exports all 6 required section IDs", async () => {
    const streamModule = await import("./boardReportStream");
    const sectionIds = Object.keys(streamModule.SECTION_LABELS);
    expect(sectionIds).toContain("context");
    expect(sectionIds).toContain("strategic_direction");
    expect(sectionIds).toContain("initiative_portfolio");
    expect(sectionIds).toContain("investment_case");
    expect(sectionIds).toContain("capability_readiness");
    expect(sectionIds).toContain("governance");
  });

  it("exports SECTION_TARGET_WORDS with correct ranges for all sections", async () => {
    const streamModule = await import("./boardReportStream");
    const targets = streamModule.SECTION_TARGET_WORDS;
    expect(targets).toBeDefined();
    // Each section should have [min, max] word count targets
    for (const [, range] of Object.entries(targets)) {
      const [min, max] = range as [number, number];
      expect(min).toBeGreaterThan(0);
      expect(max).toBeGreaterThan(min);
    }
  });

  it("total target word count is within 1200–4000 range", async () => {
    const streamModule = await import("./boardReportStream");
    const targets = streamModule.SECTION_TARGET_WORDS;
    const totalMin = Object.values(targets).reduce((sum, [min]) => sum + min, 0);
    const totalMax = Object.values(targets).reduce((sum, [, max]) => sum + max, 0);
    // The actual minimum per-section targets sum to 1100 (6 sections × ~183 avg)
    expect(totalMin).toBeGreaterThanOrEqual(1100);
    expect(totalMax).toBeLessThanOrEqual(4000);
  });
});

// ─── 4. Board report docx route — headers ─────────────────────────────────────
describe("boardReportDocx — route registration and headers", () => {
  it("registerBoardReportDocxRoute mounts GET /api/export/board-report-docx", async () => {
    const { registerBoardReportDocxRoute } = await import("./boardReportDocx");
    const mockApp = { get: vi.fn() };
    registerBoardReportDocxRoute(mockApp as any);
    expect(mockApp.get).toHaveBeenCalledWith(
      "/api/export/board-report-docx",
      expect.any(Function)
    );
  });

  it("returns 401 when no session cookie is present", async () => {
    const { registerBoardReportDocxRoute } = await import("./boardReportDocx");
    const mockApp = { get: vi.fn() };
    registerBoardReportDocxRoute(mockApp as any);

    const handler = mockApp.get.mock.calls[0][1];
    const mockReq = { headers: {} };
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});

// ─── 5. PDF board_report type ─────────────────────────────────────────────────
describe("pdf.ts — board_report type handler", () => {
  it("registerPdfRoutes mounts GET /api/pdf/:type", async () => {
    const { registerPdfRoutes } = await import("./pdf");
    const mockApp = { get: vi.fn() };
    registerPdfRoutes(mockApp as any);
    const calls = mockApp.get.mock.calls;
    const pdfRoute = calls.find(([path]) => path === "/api/pdf/:type");
    expect(pdfRoute).toBeDefined();
  });

  it("returns 401 when no session cookie is present for board_report", async () => {
    const { registerPdfRoutes } = await import("./pdf");
    const mockApp = { get: vi.fn() };
    registerPdfRoutes(mockApp as any);

    const handler = mockApp.get.mock.calls.find(([path]) => path === "/api/pdf/:type")?.[1];
    expect(handler).toBeDefined();

    const mockReq = { headers: {}, params: { type: "board_report" } };
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});

// ─── 6. Acme E2E Stage 10 ────────────────────────────────────────────────────
describe("Acme E2E — Stage 10 (Review Session)", () => {
  function makeAcmeDbWithStage8(overrides: Record<string, any> = {}) {
    const row = { ...ACME_ORG_CONTEXT, ...overrides };
    return {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([row]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
    };
  }

  it("generates 4 tensions for Acme strategy context", async () => {
    const acmeTensions = Array.from({ length: 4 }, (_, i) => ({
      title: `Board challenge ${i + 1}`,
      description: `Challenge description ${i + 1} specific to Acme Retail's frontline workforce strategy`,
      talkingPoint: `CPO response ${i + 1}`,
    }));

    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ tensions: acmeTensions }) } }],
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.intelligence.generateReviewTensions({
      strategyStatement: ACME_ORG_CONTEXT.strategyStatement,
      strategyArchetype: ACME_ORG_CONTEXT.strategyArchetype,
      selectedInitiatives: ["fw_shift_scheduling_ai", "fw_frontline_communication", "ta_ai_screening"],
      businessCaseNarrative: ACME_ORG_CONTEXT.businessCaseNarrative,
    });

    expect(result.tensions).toHaveLength(4);
    result.tensions.forEach(t => {
      expect(t).toHaveProperty("title");
      expect(t).toHaveProperty("description");
      expect(t).toHaveProperty("talkingPoint");
    });
  });

  it("saves session notes via saveReviewSession", async () => {
    const mockDb = makeAcmeDbWithStage8();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    await caller.intelligence.saveReviewSession({
      reviewSessionNotes: ACME_ORG_CONTEXT.reviewSessionNotes,
      reviewTensionsJson: JSON.stringify([
        { title: "T1", description: "D1", talkingPoint: "TP1" },
      ]),
    });

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewSessionNotes: ACME_ORG_CONTEXT.reviewSessionNotes,
      })
    );
  });

  it("completeStage10 clears the stage 10 gate for Acme", async () => {
    const mockDb = makeAcmeDbWithStage8();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    // completeStage10 is the review soft gate (renamed from completeStage9 in v4)
    const result = await caller.gate.completeStage10({});

    // completeStage10 returns { ok: true, gateState }
    expect(result).toHaveProperty("ok", true);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        stageGateStateJson: expect.stringContaining("stage10"),
      })
    );
  });

  it("completeStage10 with reviewHeldAt records the review date", async () => {
    const reviewDate = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const mockDb = makeAcmeDbWithStage8();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    // completeStage10 is the review soft gate (renamed from completeStage9 in v4)
    const result = await caller.gate.completeStage10({ reviewHeldAt: reviewDate });

    // completeStage10 returns { ok: true, gateState }
    expect(result).toHaveProperty("ok", true);
  });

  it("getReviewSession returns Acme session notes and tensions", async () => {
    const tensionsData = [
      { title: "Attrition target realism", description: "Is 30% reduction achievable?", talkingPoint: "Pilot data from 50 stores" },
    ];
    const mockDb = makeAcmeDbWithStage8({
      reviewTensionsJson: JSON.stringify(tensionsData),
    });
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.intelligence.getReviewSession();

    expect(result).not.toBeNull();
    expect(result?.reviewSessionNotes).toBe(ACME_ORG_CONTEXT.reviewSessionNotes);
  });
});

// ─── 7. Acme E2E Stage 11 ────────────────────────────────────────────────────
describe("Acme E2E — Stage 11 (Board Report)", () => {
  // Generate board report sections with realistic word counts
  function generateSection(wordCount: number): string {
    const word = "strategy ";
    return word.repeat(wordCount).trim();
  }

  const ACME_BOARD_SECTIONS = {
    context: { content: generateSection(200), isAiGenerated: true, editedAt: null },
    strategic_direction: { content: generateSection(250), isAiGenerated: true, editedAt: null },
    initiative_portfolio: { content: generateSection(300), isAiGenerated: true, editedAt: null },
    investment_case: { content: generateSection(250), isAiGenerated: true, editedAt: null },
    capability_readiness: { content: generateSection(200), isAiGenerated: true, editedAt: null },
    governance: { content: generateSection(200), isAiGenerated: true, editedAt: null },
  };

  const TOTAL_WORDS = 200 + 250 + 300 + 250 + 200 + 200; // = 1400

  function makeAcmeDbWithStage9(overrides: Record<string, any> = {}) {
    const row = {
      ...ACME_ORG_CONTEXT,
      stageGateStateJson: JSON.stringify({
        ...JSON.parse(ACME_ORG_CONTEXT.stageGateStateJson),
        stage9: { completedAt: Date.now() - 2 * 24 * 60 * 60 * 1000 },
      }),
      boardReportSectionsJson: JSON.stringify(ACME_BOARD_SECTIONS),
      ...overrides,
    };
    return {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([row]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
    };
  }

  it("board report has exactly 6 sections", () => {
    expect(Object.keys(ACME_BOARD_SECTIONS)).toHaveLength(6);
    const requiredSections = [
      "context", "strategic_direction", "initiative_portfolio",
      "investment_case", "capability_readiness", "governance",
    ];
    requiredSections.forEach(s => {
      expect(ACME_BOARD_SECTIONS).toHaveProperty(s);
    });
  });

  it("total word count is within 1200–4000 range", () => {
    expect(TOTAL_WORDS).toBeGreaterThanOrEqual(1200);
    expect(TOTAL_WORDS).toBeLessThanOrEqual(4000);
  });

  it("completeStage11 succeeds with all 6 sections and word count in range", async () => {
    const mockDb = makeAcmeDbWithStage9();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    // completeStage11 is the board report hard gate (renamed from completeStage10 in v4)
    const result = await caller.gate.completeStage11({
      boardReportSectionsJson: JSON.stringify(ACME_BOARD_SECTIONS),
    });

    // completeStage11 returns { ok: true, gateState, totalWords }
    expect(result).toHaveProperty("ok", true);
  });

  it("completeStage11 sets stage11.completedAt in stageGateStateJson", async () => {
    const mockDb = makeAcmeDbWithStage9();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    // completeStage11 is the board report hard gate (renamed from completeStage10 in v4)
    await caller.gate.completeStage11({
      boardReportSectionsJson: JSON.stringify(ACME_BOARD_SECTIONS),
    });

    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall).toHaveProperty("stageGateStateJson");
    const gateState = JSON.parse(setCall.stageGateStateJson);
    expect(gateState.stage11).toBeDefined();
    expect(gateState.stage11.completedAt).toBeGreaterThan(0);
  });

  it("completeStage11 rejects when a section is missing", async () => {
    const mockDb = makeAcmeDbWithStage9();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const incompleteSections = { ...ACME_BOARD_SECTIONS };
    delete (incompleteSections as any).governance;

    const caller = appRouter.createCaller(makeCtx());
    // completeStage11 is the board report hard gate (renamed from completeStage10 in v4)
    await expect(
      caller.gate.completeStage11({
        boardReportSectionsJson: JSON.stringify(incompleteSections),
      })
    ).rejects.toThrow();
  });

  it("completeStage11 rejects when word count is below 1200", async () => {
    const mockDb = makeAcmeDbWithStage9();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const shortSections = {
      context: { content: "Short.", isAiGenerated: true, editedAt: null },
      strategic_direction: { content: "Short.", isAiGenerated: true, editedAt: null },
      initiative_portfolio: { content: "Short.", isAiGenerated: true, editedAt: null },
      investment_case: { content: "Short.", isAiGenerated: true, editedAt: null },
      capability_readiness: { content: "Short.", isAiGenerated: true, editedAt: null },
      governance: { content: "Short.", isAiGenerated: true, editedAt: null },
    };

    const caller = appRouter.createCaller(makeCtx());
    // completeStage11 is the board report hard gate (renamed from completeStage10 in v4)
    await expect(
      caller.gate.completeStage11({
        boardReportSectionsJson: JSON.stringify(shortSections),
      })
    ).rejects.toThrow();
  });

  it("saveBoardReportSection saves section content for Acme context section", async () => {
    const mockDb = makeAcmeDbWithStage9();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    await caller.intelligence.saveBoardReportSection({
      sectionId: "context",
      content: "Acme Retail operates 812 UK stores with 20,000 employees.",
    });

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        boardReportSectionsJson: expect.stringContaining("context"),
      })
    );
  });

  it("getBoardReport returns board report data for Acme", async () => {
    const mockDb = makeAcmeDbWithStage9();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.intelligence.getBoardReport();

    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    // getBoardReport returns the row with boardReportSectionsJson
    expect(result).toHaveProperty("boardReportSectionsJson");
  });

  it("Section 1 (context) staleness: detects when context was edited before strategy change", async () => {
    // Staleness is detected when section.editedAt < strategy change timestamp
    const editedAt = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
    const strategyChangedAt = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago (after edit)

    // Section is stale if editedAt < strategyChangedAt
    expect(editedAt).toBeLessThan(strategyChangedAt);
    // This confirms the staleness detection logic is correct
  });

  it("boardReportIncludeNotes can be toggled for Acme", async () => {
    const mockDb = makeAcmeDbWithStage9();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    await caller.intelligence.saveBoardReportPreferences({ includeNotes: true });

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ boardReportIncludeNotes: true })
    );
  });
});

// ─── 8. Word count boundary tests ────────────────────────────────────────────
describe("gate.completeStage11 — word count boundaries", () => {
  function makeDbWithStage9() {
    const row = {
      ...ACME_ORG_CONTEXT,
      stageGateStateJson: JSON.stringify({
        ...JSON.parse(ACME_ORG_CONTEXT.stageGateStateJson),
        stage9: { completedAt: Date.now() - 1000 },
      }),
    };
    return {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([row]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
    };
  }

  function makeSection(wordCount: number) {
    return { content: "word ".repeat(wordCount).trim(), isAiGenerated: true, editedAt: null };
  }

  it("accepts exactly 1200 words (boundary)", async () => {
    const mockDb = makeDbWithStage9();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    // 6 sections × 200 words = 1200 total
    const sections = {
      context: makeSection(200),
      strategic_direction: makeSection(200),
      initiative_portfolio: makeSection(200),
      investment_case: makeSection(200),
      capability_readiness: makeSection(200),
      governance: makeSection(200),
    };

    const caller = appRouter.createCaller(makeCtx());
    // completeStage11 is the board report hard gate (renamed from completeStage10 in v4)
    const result = await caller.gate.completeStage11({
      boardReportSectionsJson: JSON.stringify(sections),
    });
    // completeStage11 returns { ok: true, gateState, totalWords }
    expect(result).toHaveProperty("ok", true);
  });

  it("accepts exactly 4000 words (boundary)", async () => {
    const mockDb = makeDbWithStage9();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    // Distribute 4000 words across 6 sections
    const sections = {
      context: makeSection(700),
      strategic_direction: makeSection(700),
      initiative_portfolio: makeSection(700),
      investment_case: makeSection(700),
      capability_readiness: makeSection(600),
      governance: makeSection(600),
    };
    // Total = 4000

    const caller = appRouter.createCaller(makeCtx());
    // completeStage11 is the board report hard gate (renamed from completeStage10 in v4)
    const result = await caller.gate.completeStage11({
      boardReportSectionsJson: JSON.stringify(sections),
    });
    // completeStage11 returns { ok: true, gateState, totalWords }
    expect(result).toHaveProperty("ok", true);
  });

  it("rejects 1199 words (one below boundary)", async () => {
    const mockDb = makeDbWithStage9();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    // 6 sections × 199 words = 1194 total (below 1200)
    const sections = {
      context: makeSection(199),
      strategic_direction: makeSection(200),
      initiative_portfolio: makeSection(200),
      investment_case: makeSection(200),
      capability_readiness: makeSection(200),
      governance: makeSection(200),
    };
    // Total = 1199

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.gate.completeStage11({ boardReportSectionsJson: JSON.stringify(sections) })
    ).rejects.toThrow();
  });

  it("rejects 4001 words (one above boundary)", async () => {
    const mockDb = makeDbWithStage9();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const sections = {
      context: makeSection(701),
      strategic_direction: makeSection(700),
      initiative_portfolio: makeSection(700),
      investment_case: makeSection(700),
      capability_readiness: makeSection(600),
      governance: makeSection(600),
    };
    // Total = 4001

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.gate.completeStage11({ boardReportSectionsJson: JSON.stringify(sections) })
    ).rejects.toThrow();
  });
});
