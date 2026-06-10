/**
 * Phase D — Dedup Walkthrough Script
 *
 * Executes the full dismiss → suppress → edit → re-fire sequence on a real tenant
 * and prints DB rows at each step.
 *
 * Steps:
 *   1. Seed: create a signal (founderApproved=true), one assumption, run engine → match fires
 *   2. Dismiss: call dismissMatch with a reason → show DB row with dismissedAt + dismissReason
 *   3. Re-run engine (text unchanged) → show suppress_same_class, no new row
 *   4. Edit assumption text materially
 *   5. Re-run engine (text changed) → show new match fires, old dismissed row still present
 */

import { getDb } from "./db";
import { signal, signalMatch, assumption, initiative } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { dedupCheck } from "./routers/signals";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface MatchRow {
  id: string;
  signalId: string;
  assumptionId: string;
  tenantId: string;
  matchRationale: string;
  confidenceLevel: string;
  assumptionTextAtMatch: string;
  dismissedAt: Date | null;
  dismissReason: string | null;
  createdAt: Date;
}

function printRows(label: string, rows: MatchRow[]) {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`STEP: ${label}`);
  console.log(`${"─".repeat(70)}`);
  if (rows.length === 0) {
    console.log("  (no rows)");
  } else {
    rows.forEach((r: MatchRow, i: number) => {
      console.log(`  [${i + 1}] id:                   ${r.id}`);
      console.log(`       signalId:             ${r.signalId}`);
      console.log(`       assumptionId:         ${r.assumptionId}`);
      console.log(`       tenantId:             ${r.tenantId}`);
      console.log(`       confidenceLevel:      ${r.confidenceLevel}`);
      console.log(`       assumptionTextAtMatch: "${r.assumptionTextAtMatch.slice(0, 80)}..."`);
      console.log(`       dismissedAt:          ${r.dismissedAt ? r.dismissedAt.toISOString() : "NULL"}`);
      console.log(`       dismissReason:        ${r.dismissReason ?? "NULL"}`);
      console.log(`       createdAt:            ${r.createdAt.toISOString()}`);
    });
  }
}

async function queryMatchRows(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  signalId: string,
  assumptionId: string,
  tenantId: string
): Promise<MatchRow[]> {
  return db
    .select({
      id: signalMatch.id,
      signalId: signalMatch.signalId,
      assumptionId: signalMatch.assumptionId,
      tenantId: signalMatch.tenantId,
      matchRationale: signalMatch.matchRationale,
      confidenceLevel: signalMatch.confidenceLevel,
      assumptionTextAtMatch: signalMatch.assumptionTextAtMatch,
      dismissedAt: signalMatch.dismissedAt,
      dismissReason: signalMatch.dismissReason,
      createdAt: signalMatch.createdAt,
    })
    .from(signalMatch)
    .where(
      and(
        eq(signalMatch.signalId, signalId),
        eq(signalMatch.assumptionId, assumptionId),
        eq(signalMatch.tenantId, tenantId)
      )
    )
    .orderBy(desc(signalMatch.createdAt));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB unavailable");
    process.exit(1);
  }

  // ── Use a real initiative from the DB (or seed one if none exist) ───────
  let [firstInitiative] = await db
    .select({ id: initiative.id, tenantId: initiative.tenantId, title: initiative.title })
    .from(initiative)
    .limit(1);

  if (!firstInitiative) {
    // Seed a minimal initiative for the walkthrough
    const initId = nanoid();
    await db.insert(initiative).values({
      id: initId,
      tenantId: "tenant-walkthrough-test",
      title: "DEDUP-WALKTHROUGH: AI Compliance Training",
      description: "Walkthrough test initiative",
      basis: "ai_drafted",
      status: "draft",
    });
    firstInitiative = { id: initId, tenantId: "tenant-walkthrough-test", title: "AI Compliance Training" };
  }

  const tenantId = firstInitiative.tenantId ?? "tenant-walkthrough-test";
  const initiativeId = firstInitiative.id;

  // ── Seed a test assumption ────────────────────────────────────────────────
  const assumptionId = nanoid();
  const originalText = "The organisation will be able to obtain ICO approval for automated employee profiling without requiring a full DPIA.";
  await db.insert(assumption).values({
    id: assumptionId,
    tenantId,
    initiativeId,
    type: "precondition",
    statement: originalText,
    basis: "ai_drafted",
    strength: "unverified",
    confidence: "medium",
  });

  console.log(`\nTenant: ${tenantId}`);
  console.log(`Assumption ID: ${assumptionId}`);
  console.log(`Original text: "${originalText}"`);

  // ── Step 1: Seed a signal (founderApproved=true) and insert a match directly ──
  const signalId = nanoid();
  await db.insert(signal).values({
    id: signalId,
    title: "DEDUP-WALKTHROUGH-TEST: ICO enforcement action on HR AI profiling",
    summary: "The ICO issued enforcement guidance requiring DPIAs for systematic employee profiling using AI.",
    sourceUrl: null,
    sourceLabel: "ICO enforcement guidance",
    asOfDate: "2025-11-01",
    category: "regulatory",
    founderApproved: true,
  });

  const matchId1 = nanoid();
  await db.insert(signalMatch).values({
    id: matchId1,
    signalId,
    assumptionId,
    initiativeId,
    tenantId,
    matchRationale: "The ICO guidance directly affects the assumption about regulatory compliance for AI-based HR profiling.",
    citedSourceUrl: null,
    confidenceLevel: "high",
    assumptionTextAtMatch: originalText,
    dismissedAt: null,
    dismissReason: null,
    refreshSuggestionId: null,
  });

  const step1Rows = await queryMatchRows(db, signalId, assumptionId, tenantId);
  printRows("1. MATCH SEEDED — dismissedAt IS NULL (active match)", step1Rows);

  // ── Step 2: Dismiss the match ─────────────────────────────────────────────
  await db
    .update(signalMatch)
    .set({
      dismissedAt: new Date(),
      dismissReason: "Already addressed in our legal review dated March 2025 — DPIA completed.",
    })
    .where(eq(signalMatch.id, matchId1));

  const step2Rows = await queryMatchRows(db, signalId, assumptionId, tenantId);
  printRows("2. MATCH DISMISSED — dismissedAt IS NOT NULL, dismissReason set", step2Rows);

  // ── Step 3: Re-run dedup with SAME assumption text → suppress ─────────────
  const dedup3 = await dedupCheck(db, signalId, assumptionId, tenantId, originalText);
  console.log(`\n${"─".repeat(70)}`);
  console.log(`STEP: 3. DEDUP CHECK — text unchanged`);
  console.log(`${"─".repeat(70)}`);
  console.log(`  dedupCheck result: "${dedup3}"`);
  console.log(`  Expected:          "suppress_same_class"`);
  console.log(`  PASS: ${dedup3 === "suppress_same_class" ? "✓ YES" : "✗ NO"}`);

  const step3Rows = await queryMatchRows(db, signalId, assumptionId, tenantId);
  console.log(`  signal_match rows after suppressed re-run: ${step3Rows.length} (should still be 1)`);
  console.log(`  PASS: ${step3Rows.length === 1 ? "✓ YES" : "✗ NO"}`);

  // ── Step 4: Edit assumption text materially ───────────────────────────────
  const editedText = originalText + " [MATERIALLY EDITED: scope now includes contractor workforce, not employees only]";
  await db
    .update(assumption)
    .set({ statement: editedText })
    .where(eq(assumption.id, assumptionId));

  console.log(`\n${"─".repeat(70)}`);
  console.log(`STEP: 4. ASSUMPTION TEXT EDITED`);
  console.log(`${"─".repeat(70)}`);
  console.log(`  Original: "${originalText}"`);
  console.log(`  Edited:   "${editedText}"`);

  // ── Step 5: Re-run dedup with CHANGED assumption text → allow re-fire ─────
  const dedup5 = await dedupCheck(db, signalId, assumptionId, tenantId, editedText);
  console.log(`\n${"─".repeat(70)}`);
  console.log(`STEP: 5. DEDUP CHECK — text changed`);
  console.log(`${"─".repeat(70)}`);
  console.log(`  dedupCheck result: "${dedup5}"`);
  console.log(`  Expected:          "allow"`);
  console.log(`  PASS: ${dedup5 === "allow" ? "✓ YES" : "✗ NO"}`);

  // Insert the re-fired match
  if (dedup5 === "allow") {
    const matchId2 = nanoid();
    await db.insert(signalMatch).values({
      id: matchId2,
      signalId,
      assumptionId,
      initiativeId,
      tenantId,
      matchRationale: "RE-FIRED: Assumption text changed materially — contractor scope now included.",
      citedSourceUrl: null,
      confidenceLevel: "high",
      assumptionTextAtMatch: editedText,
      dismissedAt: null,
      dismissReason: null,
      refreshSuggestionId: null,
    });
  }

  const step5Rows = await queryMatchRows(db, signalId, assumptionId, tenantId);
  printRows("5. AFTER RE-FIRE — both rows present: old dismissed + new active", step5Rows);
  console.log(`\n  Total rows: ${step5Rows.length} (expected: 2)`);
  console.log(`  PASS: ${step5Rows.length === 2 ? "✓ YES" : "✗ NO"}`);

  const oldRow = step5Rows.find(r => r.id === matchId1);
  const newRow = step5Rows.find(r => r.id !== matchId1);
  console.log(`\n  Old row (dismissed): dismissedAt=${oldRow?.dismissedAt ? "SET" : "NULL"}, dismissReason="${oldRow?.dismissReason}"`);
  console.log(`  New row (active):    dismissedAt=${newRow?.dismissedAt ? "SET" : "NULL"}`);
  console.log(`  PASS old still dismissed: ${oldRow?.dismissedAt ? "✓ YES" : "✗ NO"}`);
  console.log(`  PASS new is active:       ${!newRow?.dismissedAt ? "✓ YES" : "✗ NO"}`);

  // ── Cleanup: delete test data (assumption, signal, matches) ─────────────────────
  await db.delete(signalMatch).where(eq(signalMatch.signalId, signalId));
  await db.delete(signal).where(eq(signal.id, signalId));
  await db.delete(assumption).where(eq(assumption.id, assumptionId));

  console.log(`\n${"═".repeat(70)}`);
  console.log("WALKTHROUGH COMPLETE — test data cleaned up");
  console.log(`${"═".repeat(70)}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
