/**
 * entitlements.guards.test.ts
 *
 * Verifies that strategyCompanyProcedure, strategyRewardProcedure, and
 * assessmentProcedure throw FORBIDDEN when the corresponding entitlement is
 * absent, and pass through when it is present.
 *
 * Uses lightweight in-process callers — no HTTP, no DB.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---------------------------------------------------------------------------
// Context factory helpers
// ---------------------------------------------------------------------------

type Entitlements = NonNullable<TrpcContext["entitlements"]>;

function makeCtx(entitlements: Entitlements): TrpcContext {
  const user: NonNullable<TrpcContext["user"]> = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    entitlements,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    entitlements: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ---------------------------------------------------------------------------
// strategyCompanyProcedure guard
// ---------------------------------------------------------------------------

describe("strategyCompanyProcedure", () => {
  it("throws UNAUTHORIZED when user is not logged in", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.strategy.listIndustries()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when strategyCompany entitlement is false", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ strategyCompany: false, strategyReward: true, assessment: true })
    );
    await expect(caller.strategy.listIndustries()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("passes through when strategyCompany entitlement is true", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ strategyCompany: true, strategyReward: false, assessment: false })
    );
    // listIndustries is a pure-data query — no DB call needed for this test
    // It should resolve (or throw a DB error, not FORBIDDEN)
    const result = await caller.strategy.listIndustries().catch((e: any) => e);
    if (result && typeof result === "object" && "code" in result) {
      expect(result.code).not.toBe("FORBIDDEN");
      expect(result.code).not.toBe("UNAUTHORIZED");
    }
  });
});

// ---------------------------------------------------------------------------
// strategyRewardProcedure guard
// ---------------------------------------------------------------------------

describe("strategyRewardProcedure", () => {
  it("throws UNAUTHORIZED when user is not logged in", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.rewardStrategy.get()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when strategyReward entitlement is false", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ strategyCompany: true, strategyReward: false, assessment: true })
    );
    await expect(caller.rewardStrategy.get()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("passes through when strategyReward entitlement is true", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ strategyCompany: false, strategyReward: true, assessment: false })
    );
    const result = await caller.rewardStrategy.get().catch((e: any) => e);
    if (result && typeof result === "object" && "code" in result) {
      expect(result.code).not.toBe("FORBIDDEN");
      expect(result.code).not.toBe("UNAUTHORIZED");
    }
  });
});

// ---------------------------------------------------------------------------
// assessmentProcedure guard
// ---------------------------------------------------------------------------

describe("assessmentProcedure", () => {
  it("throws UNAUTHORIZED when user is not logged in", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.assessment.blueprints()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when assessment entitlement is false", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ strategyCompany: true, strategyReward: true, assessment: false })
    );
    await expect(caller.assessment.blueprints()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("passes through when assessment entitlement is true", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ strategyCompany: false, strategyReward: false, assessment: true })
    );
    const result = await caller.assessment.blueprints().catch((e: any) => e);
    if (result && typeof result === "object" && "code" in result) {
      expect(result.code).not.toBe("FORBIDDEN");
      expect(result.code).not.toBe("UNAUTHORIZED");
    }
  });
});

// ---------------------------------------------------------------------------
// Entitlement isolation — cross-entitlement non-interference
// ---------------------------------------------------------------------------

describe("entitlement isolation", () => {
  it("strategyCompany=true does NOT unlock strategyReward routes", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ strategyCompany: true, strategyReward: false, assessment: false })
    );
    await expect(caller.rewardStrategy.get()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("strategyReward=true does NOT unlock strategyCompany routes", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ strategyCompany: false, strategyReward: true, assessment: false })
    );
    await expect(caller.strategy.listIndustries()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("assessment=true does NOT unlock strategyCompany routes", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ strategyCompany: false, strategyReward: false, assessment: true })
    );
    await expect(caller.strategy.listIndustries()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
