/**
 * Tests for risk acknowledgement tRPC procedures:
 *   - intelligence.acknowledgeRisk
 *   - intelligence.getRiskAcknowledgements
 *   - intelligence.revokeRiskAcknowledgement
 *
 * Uses the appRouter caller pattern (same as aiq.test.ts) to test the
 * full procedure stack without a real HTTP server.
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock context ─────────────────────────────────────────────────────────────
function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  const clearedCookies: { name: string; opts: Record<string, unknown> }[] = [];
  return {
    user: null,
    entitlements: { strategyCompany: true, strategyReward: true, assessment: true },
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

const ADMIN_USER = {
  id: "test-user-ack-001",
  email: "admin@test.com",
  name: "Test Admin",
  tenantId: "test-tenant-ack-001",
  role: "admin" as const,
};

function makeAdminCtx(): TrpcContext {
  return makeCtx({ user: ADMIN_USER });
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("risk acknowledgements (tRPC procedures)", () => {
  it("getRiskAcknowledgements requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.intelligence.getRiskAcknowledgements()
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("acknowledgeRisk requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.intelligence.acknowledgeRisk({ itemId: "uk_gdpr", itemType: "framework" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("revokeRiskAcknowledgement requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.intelligence.revokeRiskAcknowledgement({ itemId: "uk_gdpr" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("acknowledgeRisk validates itemType enum", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.intelligence.acknowledgeRisk({
        itemId: "uk_gdpr",
        itemType: "invalid_type" as "risk",
      })
    ).rejects.toThrow();
  });

  it("acknowledgeRisk validates itemId max length", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const longId = "x".repeat(200);
    await expect(
      caller.intelligence.acknowledgeRisk({ itemId: longId, itemType: "framework" })
    ).rejects.toThrow();
  });

  it("acknowledgeRisk accepts valid framework itemType", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    // This may fail with FORBIDDEN if the test user lacks the required role,
    // but it should NOT fail with a validation error — confirming schema is correct.
    const result = await caller.intelligence.acknowledgeRisk({
      itemId: "uk_gdpr",
      itemType: "framework",
      note: "DPIA process in place",
    }).catch(err => err);
    // Should be either a successful result or a FORBIDDEN/INTERNAL error (not a validation error)
    if (result instanceof Error) {
      expect(["FORBIDDEN", "INTERNAL_SERVER_ERROR"]).toContain((result as any).code);
    } else {
      expect(result).toHaveProperty("id");
    }
  });

  it("revokeRiskAcknowledgement accepts valid itemId", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.intelligence.revokeRiskAcknowledgement({
      itemId: "uk_gdpr",
    }).catch(err => err);
    if (result instanceof Error) {
      expect(["FORBIDDEN", "INTERNAL_SERVER_ERROR"]).toContain((result as any).code);
    } else {
      expect(result).toHaveProperty("success", true);
    }
  });
});
