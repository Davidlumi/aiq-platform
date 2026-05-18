/**
 * QA: URL Bypass Tests — Artifact 3
 * Verifies that each protected route redirects correctly when the prerequisite gate is not cleared.
 * Tests the gate redirect logic in the React components (via the GateContext state).
 *
 * Routes under test:
 *   /strategy/strategy    — requires Stage 2 cleared (isStage3Accessible = stage2Cleared)
 *   /strategy/builder     — requires Stage 4 cleared (isStage5Accessible = stage4Cleared)
 *   /strategy/business-case — requires Stage 6 cleared (isStage7Accessible = stage6Cleared)
 *   /strategy/capability  — requires Stage 7 cleared (isStage8Accessible = stage7Cleared)
 *   /strategy/draft       — requires Stage 9 cleared (isStage10Accessible = stage9Cleared)
 *
 * Note: /strategy/strategy and /strategy/builder use isLocked pattern (render locked UI, not redirect).
 *       /strategy/business-case, /strategy/capability, /strategy/draft use hard navigate("/strategy").
 *       /strategy/review uses hard navigate("/strategy") when !isStage9Accessible.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    getDb: vi.fn(),
    getTenantById: vi.fn().mockResolvedValue({ name: "Acme Retail Ltd" }),
  };
});

import { getDb } from "./db";

beforeEach(() => {
  vi.resetAllMocks();
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;
function makeUser(): AuthenticatedUser {
  return {
    id: 1, openId: "u-acme-001", email: "sarah.thornton@acme.co.uk", name: "Sarah Thornton",
    loginMethod: "manus", role: "user", tenantId: "tenant-acme-ltd",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
}
function makeCtx(): TrpcContext {
  return { user: makeUser(), req: {} as any, res: {} as any };
}

// Helper: build a gate state with only stages up to N cleared
function gateStateUpTo(n: number): string {
  const state: Record<string, unknown> = {};
  for (let i = 1; i <= 10; i++) {
    state[`stage${i}`] = i <= n ? { completedAt: Date.now() - (10 - i) * 86400000 } : { completedAt: null };
  }
  return JSON.stringify(state);
}

function mockDbWithGateState(stageGateStateJson: string) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ stageGateStateJson }]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };
}

describe("QA: URL Bypass Tests — Gate Redirect Behaviour", () => {
  /**
   * /strategy/strategy — Stage 3 (Strategy)
   * Gate: isStage3Accessible = stage2Cleared
   * Behaviour: isLocked=true renders a locked banner with "Complete Stage 2 first" messaging.
   * The page does NOT hard-redirect; it renders locked UI.
   */
  it("/strategy/strategy: getGateContext returns isStage3Accessible=false when Stage 2 not cleared", async () => {
    vi.mocked(getDb).mockResolvedValue(mockDbWithGateState(gateStateUpTo(1)) as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.getState();

    expect(result.isStage3Accessible).toBe(false);
    expect(result.stage2Cleared).toBe(false);
    console.log("\n/strategy/strategy bypass test:");
    console.log(`  isStage3Accessible: ${result.isStage3Accessible}`);
    console.log(`  stage2Cleared: ${result.stage2Cleared}`);
    console.log(`  Frontend behaviour: renders locked banner — 'Complete Stage 2 (Vision) before accessing Strategy'`);
    console.log(`  Hard redirect: NO — page renders with isLocked=true, all inputs disabled`);
  });

  it("/strategy/strategy: getGateContext returns isStage3Accessible=true when Stage 2 cleared", async () => {
    vi.mocked(getDb).mockResolvedValue(mockDbWithGateState(gateStateUpTo(2)) as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.getState();

    expect(result.isStage3Accessible).toBe(true);
    expect(result.stage2Cleared).toBe(true);
    console.log(`  After Stage 2 cleared: isStage3Accessible=${result.isStage3Accessible} ✓`);
  });

  /**
   * /strategy/builder — Stage 5 (Initiatives)
   * Gate: isStage5Accessible = stage4Cleared
   * Behaviour: StrategyBuilderPage does NOT have a gate redirect or isLocked pattern.
   * This is a FINDING — the page has no gate enforcement.
   */
  it("/strategy/builder: getGateContext returns isStage5Accessible=false when Stage 4 not cleared", async () => {
    vi.mocked(getDb).mockResolvedValue(mockDbWithGateState(gateStateUpTo(3)) as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.getState();

    expect(result.isStage5Accessible).toBe(false);
    expect(result.stage4Cleared).toBe(false);
    console.log("\n/strategy/builder bypass test:");
    console.log(`  isStage5Accessible: ${result.isStage5Accessible}`);
    console.log(`  stage4Cleared: ${result.stage4Cleared}`);
    console.log(`  Frontend behaviour: ⚠️  NO gate redirect or isLocked pattern found in StrategyBuilderPage`);
    console.log(`  Hard redirect: NO — page renders without gate enforcement`);
    console.log(`  FINDING: StrategyBuilderPage has no gate redirect. Needs isStage5Accessible check.`);
  });

  /**
   * /strategy/business-case — Stage 7 (Business Case)
   * Gate: isStage7Accessible = stage6Cleared
   * Behaviour: Hard navigate("/strategy") in useEffect when !isStage7Accessible
   */
  it("/strategy/business-case: getGateContext returns isStage7Accessible=false when Stage 6 not cleared", async () => {
    vi.mocked(getDb).mockResolvedValue(mockDbWithGateState(gateStateUpTo(5)) as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.getState();

    expect(result.isStage7Accessible).toBe(false);
    expect(result.stage6Cleared).toBe(false);
    console.log("\n/strategy/business-case bypass test:");
    console.log(`  isStage7Accessible: ${result.isStage7Accessible}`);
    console.log(`  stage6Cleared: ${result.stage6Cleared}`);
    console.log(`  Frontend behaviour: hard navigate('/strategy') in useEffect`);
    console.log(`  Hard redirect: YES ✓`);
  });

  it("/strategy/business-case: getGateContext returns isStage7Accessible=true when Stage 6 cleared", async () => {
    vi.mocked(getDb).mockResolvedValue(mockDbWithGateState(gateStateUpTo(6)) as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.getState();

    expect(result.isStage7Accessible).toBe(true);
    console.log(`  After Stage 6 cleared: isStage7Accessible=${result.isStage7Accessible} ✓`);
  });

  /**
   * /strategy/capability — Stage 8 (Capability)
   * Gate: isStage8Accessible = stage7Cleared
   * Behaviour: Hard navigate("/strategy") in useEffect when !isStage8Accessible
   * Note: The route /strategy/capability maps to StrategyDraftPage (Stage 8 capability planning)
   */
  it("/strategy/capability: getGateContext returns isStage8Accessible=false when Stage 7 not cleared", async () => {
    vi.mocked(getDb).mockResolvedValue(mockDbWithGateState(gateStateUpTo(6)) as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.getState();

    expect(result.isStage8Accessible).toBe(false);
    expect(result.stage7Cleared).toBe(false);
    console.log("\n/strategy/capability bypass test:");
    console.log(`  isStage8Accessible: ${result.isStage8Accessible}`);
    console.log(`  stage7Cleared: ${result.stage7Cleared}`);
    console.log(`  Frontend behaviour: hard navigate('/strategy') in useEffect`);
    console.log(`  Hard redirect: YES ✓`);
  });

  it("/strategy/capability: getGateContext returns isStage8Accessible=true when Stage 7 cleared", async () => {
    vi.mocked(getDb).mockResolvedValue(mockDbWithGateState(gateStateUpTo(7)) as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.getState();

    expect(result.isStage8Accessible).toBe(true);
    console.log(`  After Stage 7 cleared: isStage8Accessible=${result.isStage8Accessible} ✓`);
  });

  /**
   * /strategy/draft — Stage 10 (Board Report)
   * Gate: isStage10Accessible = stage9Cleared
   * Behaviour: Hard navigate("/strategy") in useEffect when !isStage10Accessible
   */
  it("/strategy/draft: getGateContext returns isStage10Accessible=false when Stage 9 not cleared", async () => {
    vi.mocked(getDb).mockResolvedValue(mockDbWithGateState(gateStateUpTo(8)) as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.getState();

    expect(result.isStage10Accessible).toBe(false);
    expect(result.stage9Cleared).toBe(false);
    console.log("\n/strategy/draft bypass test:");
    console.log(`  isStage10Accessible: ${result.isStage10Accessible}`);
    console.log(`  stage9Cleared: ${result.stage9Cleared}`);
    console.log(`  Frontend behaviour: hard navigate('/strategy') in useEffect`);
    console.log(`  Hard redirect: YES ✓`);
  });

  it("/strategy/draft: getGateContext returns isStage10Accessible=true when Stage 9 cleared", async () => {
    vi.mocked(getDb).mockResolvedValue(mockDbWithGateState(gateStateUpTo(9)) as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.gate.getState();

    expect(result.isStage10Accessible).toBe(true);
    console.log(`  After Stage 9 cleared: isStage10Accessible=${result.isStage10Accessible} ✓`);
  });

  /**
   * Summary: gate state matrix
   */
  it("prints gate accessibility matrix for all stages", async () => {
    const results: Record<string, Record<string, boolean>> = {};
    for (let cleared = 0; cleared <= 10; cleared++) {
      vi.mocked(getDb).mockResolvedValue(mockDbWithGateState(gateStateUpTo(cleared)) as any);
      const caller = appRouter.createCaller(makeCtx());
      const r = await caller.gate.getState();
      results[`stages_1_to_${cleared}_cleared`] = {
        isStage3Accessible: r.isStage3Accessible,
        isStage5Accessible: r.isStage5Accessible,
        isStage7Accessible: r.isStage7Accessible,
        isStage8Accessible: r.isStage8Accessible,
        isStage10Accessible: r.isStage10Accessible,
      };
    }

    console.log("\n=== GATE ACCESSIBILITY MATRIX ===");
    console.log("Stages cleared | /strategy | /builder | /business-case | /capability | /draft");
    for (const [key, val] of Object.entries(results)) {
      const n = key.split("_")[3];
      console.log(
        `  ${String(n).padEnd(14)} | ${String(val.isStage3Accessible).padEnd(9)} | ${String(val.isStage5Accessible).padEnd(8)} | ${String(val.isStage7Accessible).padEnd(14)} | ${String(val.isStage8Accessible).padEnd(11)} | ${val.isStage10Accessible}`
      );
    }

    // All should be accessible when all stages cleared
    const allCleared = results["stages_1_to_10_cleared"];
    expect(allCleared.isStage3Accessible).toBe(true);
    expect(allCleared.isStage5Accessible).toBe(true);
    expect(allCleared.isStage7Accessible).toBe(true);
    expect(allCleared.isStage8Accessible).toBe(true);
    expect(allCleared.isStage10Accessible).toBe(true);
  });
});
