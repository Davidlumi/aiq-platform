/**
 * Stage 8 Capability Tests — Increment 2
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
let mockOrgCtxRows: unknown[] = [];

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => mockOrgCtxRows),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
    })),
  })),
  getUserRoleKeys: vi.fn(async () => ["hr_leader"]),
  getUserById: vi.fn(async () => null),
  getUserByEmail: vi.fn(async () => null),
  getUserByOpenId: vi.fn(async () => null),
  upsertUser: vi.fn(async () => undefined),
  getTenantBySlug: vi.fn(async () => null),
  getTenantById: vi.fn(async () => ({ name: "Test Org" })),
  getCurrentUserState: vi.fn(async () => null),
}));

// ─── Mock LLM ─────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: '["Tactic A", "Tactic B", "Tactic C"]' } }],
  }),
}));

import { invokeLLM } from "./_core/llm";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(invokeLLM).mockResolvedValue({
    choices: [{ message: { content: '["Tactic A", "Tactic B", "Tactic C"]' } }],
  } as any);
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

function makeAdminCtx(): TrpcContext {
  return {
    user: makeUser({ role: "admin" }),
    entitlements: { strategyCompany: true, strategyReward: true, assessment: true, assessmentPaid: true },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function setOrgCtxRow(overrides: Record<string, any> = {}) {
  mockOrgCtxRows = [{
    stageGateStateJson: null,
    stage8CapabilityJson: null,
    businessCaseNarrative: null,
    strategyStatement: null,
    strategyArchetype: null,
    visionStatement: null,
    ...overrides,
  }];
}

const VALID_RISK_JSON = JSON.stringify({
  risks: [
    {
      id: "risk-1",
      title: "AI model bias in scheduling",
      mitigation: "Run quarterly bias audits and review outputs with HR before deployment.",
      status: "accepted",
      aiSuggested: true,
    },
  ],
});

const VALID_CAP_JSON = JSON.stringify({
  skills: { current: 3, needed: 4, tactics: ["Train the team on AI tools"] },
  capacity: { current: 2, needed: 4, tactics: ["Hire AI-fluent HR specialists", "Automate admin tasks"] },
  changeReadiness: { current: 3, needed: 4, tactics: ["Run manager change readiness workshops"] },
  vendorEcosystem: { current: 2, needed: 3, tactics: ["Conduct vendor landscape review"] },
  deliveryNarrative: "We will close the capability gaps through a structured programme of investment and change management. " +
    "Our HR team currently has adequate skills but needs to reach a strong level to execute the AI strategy. " +
    "We will achieve this through mandatory AI literacy training for all HR business partners by Q2, " +
    "supplemented by hiring two AI-fluent HR specialists. On capacity, we are below requirement and will " +
    "address this by redistributing administrative work to automation and adding headcount. " +
    "Change readiness will be built through workshops with all people managers, ensuring they understand " +
    "and can champion the AI tools being introduced. Our vendor ecosystem needs strengthening — we will " +
    "conduct a structured landscape review in Q1 to identify and onboard the right partners. " +
    "Together these actions give us a credible path to execution.",
});

// ─── gate.completeStage8 ──────────────────────────────────────────────────────
describe("gate.completeStage8", () => {
  it("rejects when capability JSON has no filled dimensions", async () => {
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.gate.completeStage8({ stage8CapabilityJson: JSON.stringify({}) })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects when capability JSON is not parseable", async () => {
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.gate.completeStage8({ stage8CapabilityJson: "not-json" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts valid capability JSON with at least one dimension", async () => {
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.gate.completeStage8({ stage8CapabilityJson: VALID_CAP_JSON, riskRegisterJson: VALID_RISK_JSON });
    expect(result.ok).toBe(true);
    expect(result.gateState.stage8.completedAt).toBeTypeOf("number");
    expect(result.gateState.stage8.lastEditedAt).toBeNull();
  });

  it("accepts capability JSON with only one dimension filled", async () => {
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    const minimalCap = JSON.stringify({
      skills: { current: 3, needed: 4, tactics: ["Train the team"] },
    });
    const result = await caller.gate.completeStage8({ stage8CapabilityJson: minimalCap, riskRegisterJson: VALID_RISK_JSON });
    expect(result.ok).toBe(true);
  });

  it("rejects when org context row is not found", async () => {
    mockOrgCtxRows = [];
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.gate.completeStage8({ stage8CapabilityJson: VALID_CAP_JSON, riskRegisterJson: VALID_RISK_JSON })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ─── intelligence.getCapabilityAssessment ────────────────────────────────────
describe("intelligence.getCapabilityAssessment", () => {
  it("returns null when no capability assessment exists", async () => {
    setOrgCtxRow({ stage8CapabilityJson: null });
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.intelligence.getCapabilityAssessment();
    expect(result).toBeNull();
  });

  it("returns parsed capability data when it exists", async () => {
    setOrgCtxRow({ stage8CapabilityJson: VALID_CAP_JSON });
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.intelligence.getCapabilityAssessment() as any;
    expect(result).not.toBeNull();
    expect(result.skills.current).toBe(3);
    expect(result.skills.needed).toBe(4);
    expect(result.capacity.current).toBe(2);
  });

  it("rejects for unauthenticated users", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    await expect(caller.intelligence.getCapabilityAssessment()).rejects.toBeDefined();
  });
});

// ─── intelligence.saveCapabilityAssessment ────────────────────────────────────
describe("intelligence.saveCapabilityAssessment", () => {
  it("persists capability JSON to the DB", async () => {
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.intelligence.saveCapabilityAssessment({ capabilityJson: VALID_CAP_JSON });
    expect(result.ok).toBe(true);
  });

  it("rejects empty string input", async () => {
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.intelligence.saveCapabilityAssessment({ capabilityJson: "" })
    ).rejects.toBeDefined();
  });
});

// ─── intelligence.suggestCapabilityTactics ────────────────────────────────────
describe("intelligence.suggestCapabilityTactics", () => {
  it("returns an array of tactics from the LLM", async () => {
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.intelligence.suggestCapabilityTactics({
      dimension: "skills",
      current: 2,
      needed: 4,
    });
    expect(Array.isArray(result.tactics)).toBe(true);
    expect(result.tactics.length).toBeGreaterThan(0);
  });

  it("handles LLM returning malformed JSON gracefully", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "not a json array" } }],
    } as any);
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.intelligence.suggestCapabilityTactics({
      dimension: "capacity",
      current: 1,
      needed: 3,
    });
    expect(Array.isArray(result.tactics)).toBe(true);
    expect(result.tactics).toHaveLength(0);
  });

  it("rejects invalid dimension enum", async () => {
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.intelligence.suggestCapabilityTactics({
        dimension: "invalidDimension" as any,
        current: 2,
        needed: 4,
      })
    ).rejects.toBeDefined();
  });

  it("accepts all valid dimension values", async () => {
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    const dims = ["skills", "capacity", "changeReadiness", "vendorEcosystem"] as const;
    for (const dim of dims) {
      const result = await caller.intelligence.suggestCapabilityTactics({
        dimension: dim,
        current: 2,
        needed: 4,
      });
      expect(Array.isArray(result.tactics)).toBe(true);
    }
  });
});

// ─── intelligence.generateCapabilityNarrative ─────────────────────────────────
describe("intelligence.generateCapabilityNarrative", () => {
  it("returns a text narrative from the LLM", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "We will close the gaps through structured investment." } }],
    } as any);
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.intelligence.generateCapabilityNarrative({
      capabilityData: {
        skills: { current: 3, needed: 4, tactics: ["Train the team"] },
        capacity: { current: 2, needed: 4, tactics: ["Hire specialists"] },
      },
    });
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("accepts empty capabilityData gracefully", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "Narrative text here." } }],
    } as any);
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.intelligence.generateCapabilityNarrative({
      capabilityData: {},
    });
    expect(typeof result.text).toBe("string");
  });
});

// ─── intelligence.generateBusinessCaseNarrative ───────────────────────────────
describe("intelligence.generateBusinessCaseNarrative", () => {
  it("returns a text narrative from the LLM", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "This strategy will deliver significant value to the organisation." } }],
    } as any);
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.intelligence.generateBusinessCaseNarrative({
      orgName: "Acme Corp",
      sector: "Retail",
      headcount: 5000,
      vision: "We will build a world-class HR function powered by AI",
      strategy: "Augment HR professionals with AI tools",
      archetype: "augmentation",
      principles: ["People first", "Augment, don't replace"],
      selectedInitiatives: ["ai_coaching_manager", "fw_shift_scheduling_ai"],
    });
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("accepts minimal input (no optional fields)", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "Minimal narrative." } }],
    } as any);
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.intelligence.generateBusinessCaseNarrative({});
    expect(typeof result.text).toBe("string");
  });
});

// ─── intelligence.saveBusinessCaseNarrative ───────────────────────────────────
describe("intelligence.saveBusinessCaseNarrative", () => {
  it("persists the narrative to the DB", async () => {
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    const narrative = "This is the business case narrative for our AI strategy.";
    const result = await caller.intelligence.saveBusinessCaseNarrative({ narrative });
    expect(result.ok).toBe(true);
  });

  it("rejects narrative exceeding 10000 characters", async () => {
    setOrgCtxRow();
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.intelligence.saveBusinessCaseNarrative({ narrative: "x".repeat(10001) })
    ).rejects.toBeDefined();
  });
});
