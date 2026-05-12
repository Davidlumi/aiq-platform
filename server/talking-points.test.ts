/**
 * Tests for leadership talking points procedures:
 *   - intelligence.getTalkingPoints
 *   - intelligence.generateLeadershipTalkingPoints
 *   - intelligence.saveLeadershipTalkingPoints
 */
import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock context ──────────────────────────────────────────────────────────────
function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  const clearedCookies: { name: string; opts: Record<string, unknown> }[] = [];
  return {
    user: null,
    req: {
      protocol: "https",
      get: (h: string) => (h === "host" ? "localhost:3000" : undefined),
      cookies: {},
    } as any,
    res: {
      clearCookie: (name: string, opts: Record<string, unknown>) => {
        clearedCookies.push({ name, opts });
      },
      cookie: () => {},
    } as any,
    ...overrides,
  };
}

const MOCK_TENANT_ID = "test-tenant-tp-001";
const MOCK_USER_ID   = "test-user-tp-001";

function makeAuthCtx(): TrpcContext {
  return makeCtx({
    user: {
      id:       MOCK_USER_ID,
      tenantId: MOCK_TENANT_ID,
      email:    "tp-test@example.com",
      name:     "TP Test User",
      role:     "user",
    } as any,
  });
}

// Mock invokeLLM so we don't make real API calls
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify([
            "The HR function is building AI capability across 5 initiatives over 18 months.",
            "Foundation phase investment is estimated at £120k–£180k.",
            "This strategy targets a Progressive ambition, closing a 2.4-point capability gap.",
            "Key risks are manageable with existing governance frameworks.",
            "Measurement cadence is quarterly, with first review in 90 days.",
          ]),
        },
      },
    ],
  }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("Talking Points Procedures", () => {

  describe("getTalkingPoints", () => {
    it("returns null or a valid object when no talking points exist", async () => {
      const caller = appRouter.createCaller(makeAuthCtx());
      const result = await caller.intelligence.getTalkingPoints();
      expect(result === null || (result && Array.isArray((result as any).bullets))).toBe(true);
    });

    it("throws UNAUTHORIZED when called without auth", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await expect(caller.intelligence.getTalkingPoints()).rejects.toThrow();
    });
  });

  describe("saveLeadershipTalkingPoints", () => {
    it("accepts a valid bullets array", async () => {
      const caller = appRouter.createCaller(makeAuthCtx());
      const bullets = [
        "Bullet one about strategy.",
        "Bullet two about investment.",
        "Bullet three about risk.",
      ];
      await expect(
        caller.intelligence.saveLeadershipTalkingPoints({ bullets, userEdited: true })
      ).resolves.toBeDefined();
    });

    it("rejects an empty bullets array", async () => {
      const caller = appRouter.createCaller(makeAuthCtx());
      await expect(
        caller.intelligence.saveLeadershipTalkingPoints({ bullets: [], userEdited: false })
      ).rejects.toThrow();
    });

    it("rejects more than 10 bullets", async () => {
      const caller = appRouter.createCaller(makeAuthCtx());
      const tooMany = Array.from({ length: 11 }, (_, i) => `Bullet ${i + 1}`);
      await expect(
        caller.intelligence.saveLeadershipTalkingPoints({ bullets: tooMany, userEdited: false })
      ).rejects.toThrow();
    });

    it("rejects a bullet exceeding 500 chars", async () => {
      const caller = appRouter.createCaller(makeAuthCtx());
      const longBullet = "x".repeat(501);
      await expect(
        caller.intelligence.saveLeadershipTalkingPoints({ bullets: [longBullet], userEdited: false })
      ).rejects.toThrow();
    });

    it("accepts exactly 10 bullets (boundary)", async () => {
      const caller = appRouter.createCaller(makeAuthCtx());
      const exactly10 = Array.from({ length: 10 }, (_, i) => `Bullet ${i + 1}`);
      await expect(
        caller.intelligence.saveLeadershipTalkingPoints({ bullets: exactly10, userEdited: true })
      ).resolves.toBeDefined();
    });

    it("throws UNAUTHORIZED when called without auth", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await expect(
        caller.intelligence.saveLeadershipTalkingPoints({ bullets: ["test"], userEdited: false })
      ).rejects.toThrow();
    });
  });

  describe("generateLeadershipTalkingPoints", () => {
    it("throws UNAUTHORIZED when called without auth", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await expect(caller.intelligence.generateLeadershipTalkingPoints()).rejects.toThrow();
    });

    it("throws NOT_FOUND when no strategy exists for the tenant (expected in test env)", async () => {
      const caller = appRouter.createCaller(makeAuthCtx());
      // In the test environment there is no seeded strategy row, so the procedure
      // correctly throws NOT_FOUND. This validates the guard logic.
      await expect(caller.intelligence.generateLeadershipTalkingPoints()).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("validates the procedure is protected (throws without auth)", async () => {
      const caller = appRouter.createCaller(makeCtx());
      await expect(caller.intelligence.generateLeadershipTalkingPoints()).rejects.toThrow();
    });

    it("does not expose internal errors when strategy is missing", async () => {
      const caller = appRouter.createCaller(makeAuthCtx());
      try {
        await caller.intelligence.generateLeadershipTalkingPoints();
      } catch (err: any) {
        // Should be a TRPCError, not a raw DB error
        expect(err.code).toBeDefined();
        expect(err.code).toBe("NOT_FOUND");
      }
    });
  });
});
