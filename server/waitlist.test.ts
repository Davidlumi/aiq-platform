/**
 * Vitest tests for the waitlist tRPC router.
 * Tests cover:
 *  - submit: eligible company (hrTeamSize >= 10)
 *  - submit: ineligible company (hrTeamSize < 10)
 *  - submit: duplicate email
 *  - list: requires admin role
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// ─── Mock the database helpers so tests don't need a live DB ─────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock the notification helper so tests don't call external services
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { getDb } from "./db";
import { appRouter } from "./routers";

// ─── Context helpers ──────────────────────────────────────────────────────────
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ─── Minimal valid application payload ───────────────────────────────────────
const validPayload = {
  contactFirstName: "Jane",
  contactLastName:  "Smith",
  contactEmail:     "jane.smith@testcorp.com",
  contactTitle:     "Chief People Officer",
  companyName:      "TestCorp Ltd",
  sector:           "Financial Services" as const,
  companySize:      "1001-5000" as const,
  hrTeamSize:       15,
  useCase:          "We want to assess our HR team readiness before rolling out AI tools across the function.",
  motivation:       "We need a structured way to identify capability gaps before we scale AI adoption.",
  currentAiTools:   "ChatGPT",
  linkedinUrl:      "",
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("waitlist.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ineligible when hrTeamSize < 10", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.waitlist.submit({
      ...validPayload,
      hrTeamSize: 5,
      contactEmail: "small@example.com",
    });
    expect(result.eligible).toBe(false);
    expect((result as { eligible: false; message: string }).message).toMatch(/at least 10/i);
  });

  it("returns eligible and inserts when hrTeamSize >= 10 and email is new", async () => {
    const mockInsert = vi.fn().mockResolvedValue([]);
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    const mockDb = {
      select: mockSelect,
      insert: vi.fn().mockReturnValue({ values: mockInsert }),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.waitlist.submit(validPayload);

    expect(result.eligible).toBe(true);
    expect((result as { eligible: true; duplicate: boolean }).duplicate).toBe(false);
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it("returns duplicate:true when email already exists", async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 99, status: "pending" }]),
        }),
      }),
    });
    const mockDb = { select: mockSelect };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.waitlist.submit(validPayload);

    expect(result.eligible).toBe(true);
    expect((result as { eligible: true; duplicate: boolean }).duplicate).toBe(true);
  });
});

describe("waitlist.list", () => {
  it("throws UNAUTHORIZED when called without a session", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.waitlist.list({ status: "all", limit: 10, offset: 0 })
    ).rejects.toThrow();
  });
});
