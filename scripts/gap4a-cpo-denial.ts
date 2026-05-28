/**
 * Gap 4a: Executed CPO route denial
 * Creates a reward_leader user, then calls a CPO-protected procedure directly
 * (bypassing HTTP to avoid cookie setup), capturing the FORBIDDEN TRPCError.
 * Also hits the HTTP /api/trpc endpoint directly to capture the 403 JSON.
 */
import { TRPCError } from "@trpc/server";
import { getDb } from "../server/db";
import { users, tenants } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
// Import the CPO-protected routers directly
import { strategyRouter } from "../server/routers/strategy";
import { companyAssessmentRouter } from "../server/routers/companyAssessment";
import { hwgtRouter } from "../server/routers/hwgt";
import { createCallerFactory } from "../server/_core/trpc";

// We'll call the router procedures via the caller API, injecting a reward_leader user
async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  console.log("\n" + "═".repeat(65));
  console.log("GAP 4a: EXECUTED CPO ROUTE DENIAL");
  console.log("═".repeat(65));

  // ── 1. Create a fresh reward_leader test user ─────────────────────────────
  const tenantId = randomUUID();
  const userId = randomUUID();

  await db.insert(tenants).values({
    id: tenantId,
    name: "Gap4a Test Tenant",
    slug: `gap4a-${tenantId.slice(0, 8)}`,
    mode: "reward",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.insert(users).values({
    id: userId,
    tenantId,
    email: `gap4a-${userId.slice(0, 8)}@test.aiq`,
    firstName: "Gap4a",
    lastName: "RewardUser",
    role: "user",
    aiqRole: "reward_leader",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`\n[Setup] Created reward_leader test user`);
  console.log(`  userId:   ${userId}`);
  console.log(`  tenantId: ${tenantId}`);
  console.log(`  aiqRole:  reward_leader`);

  // Fake ctx.user matching what context.ts would produce
  const fakeUser = {
    id: userId,
    tenantId,
    email: `gap4a-${userId.slice(0, 8)}@test.aiq`,
    firstName: "Gap4a",
    lastName: "RewardUser",
    role: "user" as const,
    aiqRole: "reward_leader" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    // other optional fields
    managerOnboardingCompleted: false,
    managerOnboardingCompletedAt: null,
    modulePersonalisationCollapsed: 0,
  };

  const fakeCtx = {
    req: {} as any,
    res: {} as any,
    user: fakeUser,
  };

  // ── 2. Hit strategy.listIndustries (CPO-only) ─────────────────────────────
  console.log("\n[Test 1] strategy.listIndustries (cpoProcedure)");
  console.log("─".repeat(65));
  const strategyCallerFactory = createCallerFactory(strategyRouter);
  const strategyCaller = strategyCallerFactory(fakeCtx);
  try {
    await strategyCaller.listIndustries();
    console.log("  ✗ FAIL: No error thrown — CPO guard not working");
  } catch (e) {
    if (e instanceof TRPCError) {
      console.log(`  ✓ TRPCError thrown`);
      console.log(`    code:    ${e.code}`);
      console.log(`    message: ${e.message}`);
      console.log(`    HTTP equivalent: ${e.code === "FORBIDDEN" ? "403 Forbidden" : "other"}`);
    } else {
      console.log(`  ✗ Unexpected error: ${e}`);
    }
  }

  // ── 3. Hit companyAssessment.getDimensions (CPO-only) ────────────────────
  console.log("\n[Test 2] companyAssessment.getDimensions (cpoProcedure)");
  console.log("─".repeat(65));
  const caCallerFactory = createCallerFactory(companyAssessmentRouter);
  const caCaller = caCallerFactory(fakeCtx);
  try {
    await caCaller.getDimensions();
    console.log("  ✗ FAIL: No error thrown — CPO guard not working");
  } catch (e) {
    if (e instanceof TRPCError) {
      console.log(`  ✓ TRPCError thrown`);
      console.log(`    code:    ${e.code}`);
      console.log(`    message: ${e.message}`);
      console.log(`    HTTP equivalent: ${e.code === "FORBIDDEN" ? "403 Forbidden" : "other"}`);
    } else {
      console.log(`  ✗ Unexpected error: ${e}`);
    }
  }

  // ── 4. Hit hwgt router (CPO-only) ────────────────────────────────────────
  console.log("\n[Test 3] hwgt.getHwgt (cpoProcedure)");
  console.log("─".repeat(65));
  const hwgtCallerFactory = createCallerFactory(hwgtRouter);
  const hwgtCaller = hwgtCallerFactory(fakeCtx);
  try {
    // Try the first procedure in hwgt
    const hwgtProcedures = Object.keys(hwgtRouter._def.procedures);
    console.log(`  Available procedures: ${hwgtProcedures.join(", ")}`);
    const firstProc = hwgtProcedures[0];
    if (firstProc) {
      await (hwgtCaller as any)[firstProc]();
      console.log("  ✗ FAIL: No error thrown — CPO guard not working");
    }
  } catch (e) {
    if (e instanceof TRPCError) {
      console.log(`  ✓ TRPCError thrown`);
      console.log(`    code:    ${e.code}`);
      console.log(`    message: ${e.message}`);
      console.log(`    HTTP equivalent: ${e.code === "FORBIDDEN" ? "403 Forbidden" : "other"}`);
    } else {
      console.log(`  ✗ Unexpected error: ${e}`);
    }
  }

  // ── 5. HTTP endpoint test ─────────────────────────────────────────────────
  console.log("\n[Test 4] HTTP /api/trpc endpoint — strategy.listIndustries as reward_leader");
  console.log("─".repeat(65));
  console.log("  (Calling live dev server via HTTP)");
  try {
    // First create a session token for the reward user
    const { createSessionToken } = await import("../server/auth");
    const token = await createSessionToken({ userId, tenantId, email: `gap4a-${userId.slice(0, 8)}@test.aiq` });
    const url = "http://localhost:3000/api/trpc/strategy.listIndustries";
    const resp = await fetch(url, {
      headers: {
        "Cookie": `app_session_id=${token}`,
        "Content-Type": "application/json",
      },
    });
    const body = await resp.json();
    console.log(`  HTTP status: ${resp.status}`);
    console.log(`  Response body (truncated):`);
    const bodyStr = JSON.stringify(body, null, 2).slice(0, 400);
    console.log("  " + bodyStr.replace(/\n/g, "\n  "));
  } catch (e) {
    console.log(`  Error calling HTTP endpoint: ${e}`);
  }

  // ── 6. Cleanup ────────────────────────────────────────────────────────────
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(tenants).where(eq(tenants.id, tenantId));
  console.log("\n[Cleanup] Test user and tenant deleted");

  console.log("\n" + "═".repeat(65));
  console.log("GAP 4a COMPLETE");
  console.log("═".repeat(65));
}

main().catch(e => { console.error(e); process.exit(1); });
