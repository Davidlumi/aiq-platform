/**
 * server/initiativeDiscovery.test.ts
 *
 * Integration tests for the Initiative Discovery router:
 *   - RBAC: non-super_admin users are blocked
 *   - triggerScan: creates scan record, returns scanId
 *   - assessCandidate: accept/reject/edit flow
 *   - addToLibrary: validates candidate status, ID collision, returns JSON
 *   - input validation tests
 *   - Discovery engine unit tests
 *
 * Run: pnpm test server/initiativeDiscovery.test.ts
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
  };
});
import { getDb } from "./db";

// ─── Mock LLM (discovery engine uses it) ──────────────────────────────────────

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ candidates: [] }) } }],
  }),
}));

// ─── Mock Data API (web search) ───────────────────────────────────────────────

vi.mock("./_core/dataApi", () => ({
  callDataApi: vi.fn().mockResolvedValue({ items: [] }),
}));

// ─── Mock LLM Rate Limit ─────────────────────────────────────────────────────

vi.mock("./_core/llmRateLimit", () => ({
  assertLLMRateLimit: vi.fn(),
}));

// ─── Reset mocks between tests ───────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "user-test-123",
    tenantId: "tenant-test-456",
    email: "admin@example.com",
    firstName: "Test",
    lastName: "Admin",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    onboardingCompleted: true,
    ...overrides,
  } as AuthenticatedUser;
}

function makeCtx(user: AuthenticatedUser = makeUser()): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

/**
 * Creates a mock Drizzle DB object that properly handles the chainable query pattern.
 * The key insight: Drizzle queries chain like db.select().from().innerJoin().where()
 * and the final call in the chain returns a Promise (thenable).
 *
 * We track query sequence to return appropriate data for each query.
 */
function createMockDb(options: {
  isSuperAdmin?: boolean;
  queryResults?: any[][];
} = {}) {
  const { isSuperAdmin = true, queryResults = [] } = options;

  const roleResult = isSuperAdmin
    ? [{ key: "super_admin" }]
    : [{ key: "learner" }];

  let queryIndex = 0;
  const insertedValues: any[] = [];
  const updatedSets: any[] = [];

  // Each "query" is a full chain that ends with an await.
  // The role check is always the first query.
  function getNextResult(): any[] {
    const idx = queryIndex++;
    if (idx === 0) return roleResult; // First query is always role check
    if (queryResults[idx - 1] !== undefined) return queryResults[idx - 1];
    return [];
  }

  // Create a chainable object that resolves to the next result when awaited
  function createChain(): any {
    const chain: any = {
      select: () => createChain(),
      from: () => createChain(),
      innerJoin: () => createChain(),
      where: () => createChain(),
      orderBy: () => createChain(),
      limit: () => createChain(),
      // Make it thenable so `await` resolves it
      then: (resolve: any, reject?: any) => {
        try {
          const result = getNextResult();
          return Promise.resolve(result).then(resolve, reject);
        } catch (err) {
          if (reject) return reject(err);
          throw err;
        }
      },
    };
    return chain;
  }

  const mockDb: any = {
    select: () => createChain(),
    insert: () => ({
      values: (v: any) => {
        insertedValues.push(v);
        return Promise.resolve(undefined);
      },
    }),
    update: () => ({
      set: (s: any) => {
        updatedSets.push(s);
        return {
          where: () => Promise.resolve(undefined),
        };
      },
    }),
    _insertedValues: insertedValues,
    _updatedSets: updatedSets,
  };

  return mockDb;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Initiative Discovery Router — RBAC", () => {
  it("stats rejects non-super_admin users with FORBIDDEN", async () => {
    const mockDb = createMockDb({ isSuperAdmin: false });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());

    await expect(caller.initiativeDiscovery.stats()).rejects.toThrow(
      /super admin/i
    );
  });

  it("triggerScan rejects non-super_admin users with FORBIDDEN", async () => {
    const mockDb = createMockDb({ isSuperAdmin: false });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());

    await expect(caller.initiativeDiscovery.triggerScan()).rejects.toThrow(
      /super admin/i
    );
  });

  it("listScans rejects non-super_admin users with FORBIDDEN", async () => {
    const mockDb = createMockDb({ isSuperAdmin: false });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());

    await expect(caller.initiativeDiscovery.listScans({ limit: 10 })).rejects.toThrow(
      /super admin/i
    );
  });

  it("listCandidates rejects non-super_admin users with FORBIDDEN", async () => {
    const mockDb = createMockDb({ isSuperAdmin: false });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());

    await expect(caller.initiativeDiscovery.listCandidates({ limit: 10 })).rejects.toThrow(
      /super admin/i
    );
  });

  it("assessCandidate rejects non-super_admin users with FORBIDDEN", async () => {
    const mockDb = createMockDb({ isSuperAdmin: false });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.initiativeDiscovery.assessCandidate({
        candidateId: "cand-1",
        decision: "accepted",
      })
    ).rejects.toThrow(/super admin/i);
  });
});

describe("Initiative Discovery Router — triggerScan", () => {
  it("creates a scan record and returns scanId + running status", async () => {
    const mockDb = createMockDb({ isSuperAdmin: true });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.initiativeDiscovery.triggerScan();

    expect(result).toHaveProperty("scanId");
    expect(result.status).toBe("running");
    expect(typeof result.scanId).toBe("string");
    expect(result.scanId.length).toBeGreaterThan(0);

    // Should have inserted scan record + audit log
    expect(mockDb._insertedValues.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Initiative Discovery Router — assessCandidate", () => {
  it("rejects assessment of already-assessed candidate", async () => {
    const mockDb = createMockDb({
      isSuperAdmin: true,
      queryResults: [
        // Second query: candidate lookup
        [{
          id: "cand-1",
          name: "Test Initiative",
          status: "accepted", // already assessed
          scanId: "scan-1",
          description: "Test",
          problemValue: "Test",
          suggestedScope: "cpo",
          suggestedCategory: "talent_acquisition",
          sourceUrls: "[]",
          dedupStatus: "unique",
          createdAt: Date.now(),
        }],
      ],
    });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.initiativeDiscovery.assessCandidate({
        candidateId: "cand-1",
        decision: "rejected",
      })
    ).rejects.toThrow(/already assessed/i);
  });

  it("rejects assessment of non-existent candidate", async () => {
    const mockDb = createMockDb({
      isSuperAdmin: true,
      queryResults: [
        // Second query: candidate lookup returns empty
        [],
      ],
    });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.initiativeDiscovery.assessCandidate({
        candidateId: "nonexistent",
        decision: "accepted",
      })
    ).rejects.toThrow(/not found/i);
  });
});

describe("Initiative Discovery Router — addToLibrary", () => {
  it("rejects adding a candidate that is still pending", async () => {
    const mockDb = createMockDb({
      isSuperAdmin: true,
      queryResults: [
        // Second query: candidate lookup
        [{
          id: "cand-1",
          name: "Test Initiative",
          status: "pending", // not yet assessed
          scanId: "scan-1",
          description: "Test",
          problemValue: "Test",
          suggestedScope: "cpo",
          suggestedCategory: "talent_acquisition",
          sourceUrls: "[]",
          dedupStatus: "unique",
          addedInitiativeId: null,
          createdAt: Date.now(),
        }],
      ],
    });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.initiativeDiscovery.addToLibrary({
        candidateId: "cand-1",
        initiativeId: "test_new_initiative",
        label: "Test New Initiative",
        description: "A test initiative",
        category: "talent_acquisition",
        functionScope: "cpo",
        phase: 1,
        timeToValueMonths: { min: 3, max: 6 },
        y1CostRange: { low: 50, high: 200 },
        valueFormulaKey: "ta_high_volume_hiring",
        prerequisites: [],
        vendorLandscape: [],
        coDeployments: [],
        phaseRationale: "Test",
        caseStudyAnchor: "Test",
      })
    ).rejects.toThrow(/must be accepted or edited/i);
  });

  it("rejects adding with an existing initiative ID", async () => {
    const mockDb = createMockDb({
      isSuperAdmin: true,
      queryResults: [
        // Second query: candidate lookup
        [{
          id: "cand-1",
          name: "Test Initiative",
          status: "accepted",
          scanId: "scan-1",
          description: "Test",
          problemValue: "Test",
          suggestedScope: "cpo",
          suggestedCategory: "talent_acquisition",
          sourceUrls: "[]",
          dedupStatus: "unique",
          addedInitiativeId: null,
          assessedBy: "user-1",
          assessedAt: Date.now(),
          createdAt: Date.now(),
        }],
      ],
    });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());

    // Use an existing initiative ID from the library
    await expect(
      caller.initiativeDiscovery.addToLibrary({
        candidateId: "cand-1",
        initiativeId: "ta_high_volume_hiring", // already exists!
        label: "High-Volume Hiring AI",
        description: "Duplicate",
        category: "talent_acquisition",
        functionScope: "cpo",
        phase: 1,
        timeToValueMonths: { min: 3, max: 6 },
        y1CostRange: { low: 50, high: 200 },
        valueFormulaKey: "ta_high_volume_hiring",
        prerequisites: [],
        vendorLandscape: [],
        coDeployments: [],
        phaseRationale: "Test",
        caseStudyAnchor: "Test",
      })
    ).rejects.toThrow(/already exists/i);
  });
});

describe("Initiative Discovery Router — input validation", () => {
  it("assessCandidate rejects invalid decision value", async () => {
    const mockDb = createMockDb({ isSuperAdmin: true });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.initiativeDiscovery.assessCandidate({
        candidateId: "cand-1",
        decision: "invalid_decision" as any,
      })
    ).rejects.toThrow();
  });

  it("addToLibrary rejects invalid initiative ID format", async () => {
    const mockDb = createMockDb({ isSuperAdmin: true });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.initiativeDiscovery.addToLibrary({
        candidateId: "cand-1",
        initiativeId: "INVALID-ID-FORMAT!", // must be lowercase with underscores
        label: "Test",
        description: "Test",
        category: "talent_acquisition",
        functionScope: "cpo",
        phase: 1,
        timeToValueMonths: { min: 3, max: 6 },
        y1CostRange: { low: 50, high: 200 },
        valueFormulaKey: "ta_high_volume_hiring",
        prerequisites: [],
        vendorLandscape: [],
        coDeployments: [],
        phaseRationale: "Test",
        caseStudyAnchor: "Test",
      })
    ).rejects.toThrow();
  });

  it("addToLibrary rejects phase outside 1-3 range", async () => {
    const mockDb = createMockDb({ isSuperAdmin: true });
    vi.mocked(getDb).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.initiativeDiscovery.addToLibrary({
        candidateId: "cand-1",
        initiativeId: "test_initiative",
        label: "Test",
        description: "Test",
        category: "talent_acquisition",
        functionScope: "cpo",
        phase: 5 as any, // invalid
        timeToValueMonths: { min: 3, max: 6 },
        y1CostRange: { low: 50, high: 200 },
        valueFormulaKey: "ta_high_volume_hiring",
        prerequisites: [],
        vendorLandscape: [],
        coDeployments: [],
        phaseRationale: "Test",
        caseStudyAnchor: "Test",
      })
    ).rejects.toThrow();
  });
});

describe("Initiative Discovery — Discovery Engine (unit)", () => {
  it("INITIATIVE_LIBRARY has at least 50 CPO-scope initiatives", async () => {
    const { INITIATIVE_LIBRARY } = await import("../shared/initiativeLibrary");
    const cpoInitiatives = INITIATIVE_LIBRARY.filter((i) => {
      const scope = i.functionScope ?? "cpo";
      return scope === "cpo" || scope === "both";
    });
    expect(cpoInitiatives.length).toBeGreaterThanOrEqual(50);
  });

  it("all INITIATIVE_LIBRARY entries have unique IDs", async () => {
    const { INITIATIVE_LIBRARY } = await import("../shared/initiativeLibrary");
    const ids = INITIATIVE_LIBRARY.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all INITIATIVE_LIBRARY entries have a valueFormulaKey", async () => {
    const { INITIATIVE_LIBRARY } = await import("../shared/initiativeLibrary");
    const missing = INITIATIVE_LIBRARY.filter((i) => !i.valueFormulaKey);
    expect(missing).toEqual([]);
  });
});
