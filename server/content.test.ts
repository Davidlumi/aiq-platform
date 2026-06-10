/**
 * Content System Tests — AiQ Enterprise Platform
 *
 * Tests for the content router: roles, workflows, tags, scenarios, stats, versioning.
 * Uses a mock DB that returns empty arrays by default (sufficient to test auth guards
 * and response shapes without a live database connection).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock getDb and helper exports ───────────────────────────────────────────

let mockRows: unknown[] = [];

function makeChain(rows: unknown[]): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  const chainMethods = [
    "from", "where", "limit", "orderBy", "groupBy",
    "leftJoin", "offset", "set", "values",
  ];
  for (const m of chainMethods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (
    resolve: (v: unknown[]) => unknown,
    _reject?: (e: unknown) => unknown,
  ) => Promise.resolve(rows).then(resolve);
  chain.catch = (reject: (e: unknown) => unknown) =>
    Promise.resolve(rows).catch(reject);
  chain.finally = (cb: () => void) => Promise.resolve(rows).finally(cb);
  return chain;
}

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: vi.fn(() => makeChain(mockRows)),
    selectDistinct: vi.fn(() => makeChain(mockRows)),
    insert: vi.fn(() => makeChain([])),
    update: vi.fn(() => makeChain([])),
    delete: vi.fn(() => makeChain([])),
  })),
  // Export all helper functions used by content router
  getUserRoleKeys: vi.fn(async () => ["admin"]),
  getUserById: vi.fn(async () => null),
  getUserByEmail: vi.fn(async () => null),
  getUserByOpenId: vi.fn(async () => null),
  upsertUser: vi.fn(async () => undefined),
  getTenantBySlug: vi.fn(async () => null),
  getTenantById: vi.fn(async () => null),
  getCurrentUserState: vi.fn(async () => null),
}));

// ─── Context helpers ──────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function publicCtx(): TrpcContext {
  return {
    user: null,
    entitlements: { strategyCompany: true, strategyReward: true, assessment: true },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function userCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    entitlements: { strategyCompany: true, strategyReward: true, assessment: true },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("content.roles", () => {
  beforeEach(() => { mockRows = []; });

  it("list resolves without error", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.content.roles.list({})).resolves.toBeDefined();
  });

  it("list returns an array", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.content.roles.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("families resolves without error", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.content.roles.families()).resolves.toBeDefined();
  });
});

describe("content.workflows", () => {
  beforeEach(() => { mockRows = []; });

  it("list resolves without error", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.content.workflows.list({})).resolves.toBeDefined();
  });

  it("list returns an array", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.content.workflows.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("domains resolves without error", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.content.workflows.domains()).resolves.toBeDefined();
  });
});

describe("content.tags", () => {
  beforeEach(() => { mockRows = []; });

  it("list resolves without error", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.content.tags.list({})).resolves.toBeDefined();
  });

  it("categories resolves without error", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.content.tags.categories()).resolves.toBeDefined();
  });
});

describe("content.failureModes", () => {
  beforeEach(() => { mockRows = []; });

  it("list resolves without error", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.content.failureModes.list({})).resolves.toBeDefined();
  });

  it("list returns an array", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.content.failureModes.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("content.scenarios — list", () => {
  beforeEach(() => { mockRows = []; });

  it("returns pagination envelope with items key", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.content.scenarios.list({});
    // The router returns { items, total, page, pageSize, totalPages }
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("pageSize");
    expect(result).toHaveProperty("totalPages");
  });

  it("items field is an array", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.content.scenarios.list({});
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("respects page parameter", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.content.scenarios.list({ page: 3 });
    expect(result.page).toBe(3);
  });

  it("respects pageSize parameter", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.content.scenarios.list({ pageSize: 5 });
    expect(result.pageSize).toBe(5);
  });

  it("accepts status filter", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.content.scenarios.list({ status: "published" })
    ).resolves.toBeDefined();
  });

  it("accepts domain filter", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.content.scenarios.list({ domain: "talent_acquisition" })
    ).resolves.toBeDefined();
  });

  it("accepts capabilityKey filter", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.content.scenarios.list({ capabilityKey: "governance" })
    ).resolves.toBeDefined();
  });

  it("accepts riskLevel filter", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.content.scenarios.list({ riskLevel: "High" })
    ).resolves.toBeDefined();
  });

  it("accepts search filter", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.content.scenarios.list({ search: "performance" })
    ).resolves.toBeDefined();
  });
});

describe("content.scenarios — stats", () => {
  beforeEach(() => { mockRows = []; });

  it("returns stats envelope", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.content.scenarios.stats();
    // Router returns: { total, byDomain, byStatus, byDifficulty, byRisk, govSensitiveCount }
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("byStatus");
    expect(result).toHaveProperty("byDomain");
    expect(result).toHaveProperty("byDifficulty");
    expect(result).toHaveProperty("byRisk");
    expect(result).toHaveProperty("govSensitiveCount");
  });

  it("byStatus is an object", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.content.scenarios.stats();
    expect(typeof result.byStatus).toBe("object");
  });

  it("total is a number", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.content.scenarios.stats();
    expect(typeof result.total).toBe("number");
  });
});

describe("content.scenarios — auth guards", () => {
  beforeEach(() => { mockRows = []; });

  it("updateStatus rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.content.scenarios.updateStatus({ id: "s1", status: "published" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("delete rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.content.scenarios.delete({ id: "s1" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("versions rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.content.scenarios.versions({ scenarioId: "s1" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("create rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.content.scenarios.create({
        interactionId: "INT-TEST-001",
        title: "Test",
        domain: "talent_acquisition",
        capabilityKey: "execution",
        interactionType: "situational_judgement",
        difficulty: 2,
        riskLevel: "Medium",
        scenario: "Test scenario",
        question: "What do you do?",
        ambiguityLevel: "medium",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("update rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      caller.content.scenarios.update({ id: "s1" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("updateStatus succeeds for admin user", async () => {
    // Mock the DB to return a scenario for the lookup
    mockRows = [
      {
        id: "s1",
        interactionId: "INT-001",
        title: "Test Scenario",
        domain: "talent_acquisition",
        capabilityKey: "execution",
        interactionType: "situational_judgement",
        difficulty: 2,
        riskLevel: "Medium",
        governanceSensitive: false,
        scenario: "You are an HR manager...",
        constraint: null,
        question: "What do you do?",
        workflowKey: null,
        roleKeysJson: [],
        failureModeKeysJson: [],
        tagsJson: [],
        primarySignal: null,
        ambiguityLevel: "medium",
        status: "draft",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    // Admin users (role === 'admin') can change status
    const adminUser: AuthenticatedUser = {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const adminContext: TrpcContext = {
      user: adminUser,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(adminContext);
    await expect(
      caller.content.scenarios.updateStatus({ id: "s1", status: "published" })
    ).resolves.toBeDefined();
  });
});
