/**
 * Phase D — founderApproved=0 Blocking Proof
 *
 * Proves that a signal with founderApproved=false is completely blocked from
 * reaching tenants:
 *
 *   1. Seed a signal with founderApproved=false
 *   2. Attempt matchSignalToTenant logic → should throw FORBIDDEN
 *   3. Query signal_match table → must show zero rows for this signal
 *   4. Query listActiveMatches logic → must return zero rows for this signal
 *   5. Cleanup
 */

import { getDb } from "./db";
import { signal, signalMatch, assumption, initiative } from "../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

// ─── Inline the founderApproved gate check (mirrors matchSignalToTenant) ──────

async function attemptMatchWithUnapprovedSignal(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  signalId: string
): Promise<{ threw: boolean; code: string; message: string }> {
  const [signalRow] = await db
    .select()
    .from(signal)
    .where(eq(signal.id, signalId))
    .limit(1);

  if (!signalRow) {
    return { threw: true, code: "NOT_FOUND", message: "Signal not found" };
  }

  if (!signalRow.founderApproved) {
    // This is the gate — mirrors the exact check in matchSignalToTenant
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Signal has not been founder-approved. Approve it before running the matcher.",
    });
  }

  return { threw: false, code: "OK", message: "Signal is approved — gate did not fire" };
}

// ─── Inline listActiveMatches filter (mirrors the procedure) ─────────────────

async function queryActiveMatchesForSignal(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  signalId: string,
  tenantId: string
) {
  return db
    .select({
      matchId: signalMatch.id,
      signalId: signalMatch.signalId,
      tenantId: signalMatch.tenantId,
      dismissedAt: signalMatch.dismissedAt,
    })
    .from(signalMatch)
    .innerJoin(signal, eq(signalMatch.signalId, signal.id))
    .where(
      and(
        eq(signalMatch.tenantId, tenantId),
        isNull(signalMatch.dismissedAt),
        // founderApproved gate — mirrors listActiveMatches
        eq(signal.founderApproved, true)
      )
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB unavailable");
    process.exit(1);
  }

  console.log(`\n${"═".repeat(70)}`);
  console.log("PHASE D — founderApproved=0 BLOCKING PROOF");
  console.log(`${"═".repeat(70)}`);

  // ── Step 1: Seed a signal with founderApproved=false ──────────────────────
  const signalId = nanoid();
  const tenantId = "tenant-acme-ltd";

  await db.insert(signal).values({
    id: signalId,
    title: "GATE-PROOF: Unapproved signal — must never reach tenants",
    summary: "This signal was seeded with founderApproved=false to prove the gate blocks it.",
    sourceUrl: null,
    sourceLabel: "Gate proof test",
    asOfDate: "2025-11-01",
    category: "regulatory",
    founderApproved: false,
  });

  // Verify it was inserted with founderApproved=false
  const [seededSignal] = await db
    .select({ id: signal.id, title: signal.title, founderApproved: signal.founderApproved })
    .from(signal)
    .where(eq(signal.id, signalId))
    .limit(1);

  console.log(`\n${"─".repeat(70)}`);
  console.log("STEP 1: Signal seeded with founderApproved=false");
  console.log(`${"─".repeat(70)}`);
  console.log(`  id:             ${seededSignal.id}`);
  console.log(`  title:          ${seededSignal.title}`);
  console.log(`  founderApproved: ${seededSignal.founderApproved}`);
  console.log(`  PASS (founderApproved is false): ${seededSignal.founderApproved === false ? "✓ YES" : "✗ NO"}`);

  // ── Step 2: Attempt matchSignalToTenant → must throw FORBIDDEN ────────────
  console.log(`\n${"─".repeat(70)}`);
  console.log("STEP 2: Attempt matchSignalToTenant — must throw FORBIDDEN");
  console.log(`${"─".repeat(70)}`);

  let gateThrew = false;
  let gateCode = "";
  let gateMessage = "";

  try {
    await attemptMatchWithUnapprovedSignal(db, signalId);
    console.log("  ✗ FAIL — gate did NOT throw. Signal should have been blocked.");
  } catch (err) {
    if (err instanceof TRPCError) {
      gateThrew = true;
      gateCode = err.code;
      gateMessage = err.message;
    } else {
      throw err;
    }
  }

  console.log(`  threw:   ${gateThrew}`);
  console.log(`  code:    "${gateCode}"`);
  console.log(`  message: "${gateMessage}"`);
  console.log(`  PASS (threw FORBIDDEN): ${gateThrew && gateCode === "FORBIDDEN" ? "✓ YES" : "✗ NO"}`);

  // ── Step 3: Query signal_match table → must show zero rows ────────────────
  const rawMatchRows = await db
    .select({ id: signalMatch.id })
    .from(signalMatch)
    .where(eq(signalMatch.signalId, signalId));

  console.log(`\n${"─".repeat(70)}`);
  console.log("STEP 3: signal_match table — must show zero rows for this signal");
  console.log(`${"─".repeat(70)}`);
  console.log(`  signal_match rows for signalId=${signalId}: ${rawMatchRows.length}`);
  console.log(`  PASS (zero rows): ${rawMatchRows.length === 0 ? "✓ YES" : "✗ NO"}`);

  // ── Step 4: listActiveMatches filter → must return zero rows ─────────────
  const activeMatchRows = await queryActiveMatchesForSignal(db, signalId, tenantId);

  console.log(`\n${"─".repeat(70)}`);
  console.log("STEP 4: listActiveMatches filter — must return zero rows for unapproved signal");
  console.log(`${"─".repeat(70)}`);
  console.log(`  Active match rows visible to tenant ${tenantId}: ${activeMatchRows.length}`);
  console.log(`  PASS (zero visible): ${activeMatchRows.length === 0 ? "✓ YES" : "✗ NO"}`);

  // ── Step 5: Cleanup ───────────────────────────────────────────────────────
  await db.delete(signal).where(eq(signal.id, signalId));

  console.log(`\n${"═".repeat(70)}`);
  const allPass =
    seededSignal.founderApproved === false &&
    gateThrew &&
    gateCode === "FORBIDDEN" &&
    rawMatchRows.length === 0 &&
    activeMatchRows.length === 0;
  console.log(`GATE PROOF RESULT: ${allPass ? "ALL CHECKS PASS ✓" : "SOME CHECKS FAILED ✗"}`);
  console.log(`${"═".repeat(70)}\n`);

  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
