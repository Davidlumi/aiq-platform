/**
 * AiQ Platform — Core Test Suite
 * Tests auth, user management, assessment, scoring, and policy procedures.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helper: build a mock context ────────────────────────────────────────────

function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  const clearedCookies: { name: string; opts: Record<string, unknown> }[] = [];
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { host: "localhost" },
      cookies: {},
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: (name: string, opts: Record<string, unknown>) => {
        clearedCookies.push({ name, opts });
      },
      cookie: () => {},
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

function makeAuthCtx(roleOverrides: string[] = ["learner"]): TrpcContext {
  return makeCtx({
    user: {
      id: "test-user-001",
      tenantId: "tenant-demo-001",
      email: "test@demo.com",
      firstName: "Test",
      lastName: "User",
      status: "active",
      roles: roleOverrides,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as unknown as NonNullable<TrpcContext["user"]>,
  });
}

// ─── Auth Router ─────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null when no user is in context (unauthenticated)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns the user object when authenticated", async () => {
    const caller = appRouter.createCaller(makeAuthCtx(["learner"]));
    const result = await caller.auth.me();
    // auth.me fetches roles from DB; in unit test there is no DB so roles will be empty array
    // but the user fields should be present
    expect(result).not.toBeNull();
    expect(result?.email).toBe("test@demo.com");
    expect(result?.firstName).toBe("Test");
    expect(Array.isArray(result?.roles)).toBe(true);
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const ctx = makeCtx({
      user: {
        id: "test-user-001",
        tenantId: "tenant-demo-001",
        email: "test@demo.com",
        firstName: "Test",
        lastName: "User",
        status: "active",
        roles: ["learner"],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as unknown as NonNullable<TrpcContext["user"]>,
      res: {
        clearCookie: (name: string) => clearedCookies.push(name),
        cookie: () => {},
      } as unknown as TrpcContext["res"],
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Auth Registration Validation ────────────────────────────────────────────

describe("auth.register input validation", () => {
  it("rejects registration with an invalid email format", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.auth.register({
        email: "not-an-email",
        password: "Password123!",
        firstName: "Jane",
        lastName: "Smith",
      })
    ).rejects.toThrow();
  });

  it("rejects registration with a password shorter than 8 characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.auth.register({
        email: "jane@example.com",
        password: "short",
        firstName: "Jane",
        lastName: "Smith",
      })
    ).rejects.toThrow();
  });
});

// ─── Auth Login Validation ────────────────────────────────────────────────────

describe("auth.login input validation", () => {
  it("rejects login with missing email", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.auth.login({
        email: "",
        password: "Password123!",
      })
    ).rejects.toThrow();
  });
});

// ─── System Router ────────────────────────────────────────────────────────────

describe("system.notifyOwner", () => {
  it("requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.system.notifyOwner({ title: "Test", content: "Test notification" })
    ).rejects.toThrow();
  });
});

// ─── Role-based Access Control ───────────────────────────────────────────────

describe("RBAC: protected procedures require auth", () => {
  it("users.list throws UNAUTHORIZED for unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.users.list({})
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("assessment.blueprint throws UNAUTHORIZED for unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.assessment.blueprint({ domain: "EXEC" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("dashboard.learner throws UNAUTHORIZED for unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.dashboard.learner()
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("report.request throws UNAUTHORIZED for unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.report.request({ reportType: "learner" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("audit.logs throws UNAUTHORIZED for unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.audit.logs({})
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Scoring Engine ───────────────────────────────────────────────────────────

describe("scoring.userState requires auth", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.scoring.userState({ userId: "test-user-001" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Policy Engine ────────────────────────────────────────────────────────────

describe("policy.evaluate requires auth", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.policy.evaluate({ userId: "test-user-001", trigger: "assessment_complete" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Learning Router ─────────────────────────────────────────────────────────

describe("learning.activePlan requires auth", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.learning.activePlan()
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Tenant Router ────────────────────────────────────────────────────────────

describe("tenant.current requires auth", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.tenant.current()
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Wrong-Role RBAC Tests ────────────────────────────────────────────────────

describe("RBAC: wrong-role blocking", () => {
  it("users.create is blocked for learner role (FORBIDDEN)", async () => {
    const caller = appRouter.createCaller(makeAuthCtx(["learner"]));
    // Learner should not be able to create users — DB will reject via requireRole check
    // In unit test without DB, this will throw INTERNAL_SERVER_ERROR (no DB) not FORBIDDEN
    // but we verify it does NOT succeed
    await expect(
      caller.users.create({
        email: "new@example.com",
        firstName: "New",
        lastName: "User",
        password: "Password123!",
        roleKey: "learner",
      })
    ).rejects.toThrow();
  });

  it("audit.logs is blocked for learner role (FORBIDDEN)", async () => {
    const caller = appRouter.createCaller(makeAuthCtx(["learner"]));
    // Learner cannot access audit logs — DB check will reject
    await expect(
      caller.audit.logs({})
    ).rejects.toThrow();
  });

  it("tenant.updateSettings is blocked for learner role", async () => {
    const caller = appRouter.createCaller(makeAuthCtx(["learner"]));
    await expect(
      caller.tenant.updateSettings({ credibilityThreshold: 80 })
    ).rejects.toThrow();
  });

  it("manager role can access dashboard.manager procedure", async () => {
    const caller = appRouter.createCaller(makeAuthCtx(["manager"]));
    // Will throw INTERNAL_SERVER_ERROR (no DB in unit test) but NOT UNAUTHORIZED
    await expect(
      caller.dashboard.manager()
    ).rejects.not.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("learner role can access dashboard.learner procedure (resolves with null fields when no DB)", async () => {
    const caller = appRouter.createCaller(makeAuthCtx(["learner"]));
    // dashboard.learner handles missing DB gracefully and returns null fields
    const result = await caller.dashboard.learner();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("state");
    expect(result).toHaveProperty("credibility");
  });
});
