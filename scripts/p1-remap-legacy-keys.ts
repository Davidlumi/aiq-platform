/**
 * P1 — Remap legacy capability_key values to canonical scoring-engine keys.
 *
 * Mapping rationale (based on content inspection):
 *
 * appropriateness  → ai_ethics_trust
 *   (all 5 items are about ethical use, bias, consent, when-not-to-use — core ethics domain)
 *
 * data_interpretation → ai_output_evaluation
 *   (all 6 items are about interpreting/evaluating AI outputs, reliability, quality — output evaluation)
 *
 * execution        → ai_workflow_design
 *   (all 4 items are about executing AI workflows, chatbot triage, onboarding — workflow design)
 *
 * governance       → ai_ethics_trust
 *   (all 5 items are about governance, accountability, bias checks — ethics & trust)
 *
 * judgement        → ai_output_evaluation
 *   (all 5 items are about exercising judgement on AI outputs, limits, weighting — output evaluation)
 *
 * workflow         → ai_workflow_design
 *   (1 item about stakeholder communication in AI implementation — workflow design)
 */
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

const REMAP: Record<string, string> = {
  appropriateness:    "ai_ethics_trust",
  data_interpretation: "ai_output_evaluation",
  execution:          "ai_workflow_design",
  governance:         "ai_ethics_trust",
  judgement:          "ai_output_evaluation",
  workflow:           "ai_workflow_design",
};

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  console.log("=== P1 Legacy Key Remapping ===\n");

  // Before state
  const beforeRows = await db.execute(sql`
    SELECT capability_key, COUNT(*) as cnt 
    FROM content_scenarios 
    GROUP BY capability_key 
    ORDER BY cnt DESC
  `) as any;
  const before = beforeRows[0] as Array<{ capability_key: string; cnt: number }>;
  console.log("BEFORE remapping:");
  for (const r of before) {
    const isLegacy = r.capability_key in REMAP;
    console.log(`  ${r.capability_key.padEnd(28)} ${r.cnt.toString().padStart(3)}  ${isLegacy ? "← LEGACY" : ""}`);
  }

  // Apply remapping
  console.log("\nApplying remaps...");
  for (const [legacy, canonical] of Object.entries(REMAP)) {
    const result = await db.execute(sql`
      UPDATE content_scenarios 
      SET capability_key = ${canonical}, domain = ${canonical}
      WHERE capability_key = ${legacy}
    `) as any;
    const affected = result[0]?.affectedRows ?? 0;
    console.log(`  ${legacy.padEnd(20)} → ${canonical.padEnd(25)} (${affected} rows updated)`);
  }

  // After state
  const afterRows = await db.execute(sql`
    SELECT capability_key, COUNT(*) as cnt 
    FROM content_scenarios 
    GROUP BY capability_key 
    ORDER BY cnt DESC
  `) as any;
  const after = afterRows[0] as Array<{ capability_key: string; cnt: number }>;
  console.log("\nAFTER remapping:");
  const canonicalKeys = new Set(["ai_interaction","ai_output_evaluation","ai_workflow_design","workforce_ai_readiness","ai_ethics_trust","ai_change_leadership"]);
  for (const r of after) {
    const isCanonical = canonicalKeys.has(r.capability_key);
    console.log(`  ${r.capability_key.padEnd(28)} ${r.cnt.toString().padStart(3)}  ${isCanonical ? "✓ canonical" : "✗ STILL LEGACY"}`);
  }

  // Verify 100% canonical
  const legacyRemaining = after.filter(r => !canonicalKeys.has(r.capability_key));
  if (legacyRemaining.length === 0) {
    console.log("\n✅ ALL 110 scenarios now use canonical keys. DB is consistent with scoring engine.");
  } else {
    console.log(`\n❌ ${legacyRemaining.length} legacy key(s) remain: ${legacyRemaining.map(r => r.capability_key).join(", ")}`);
  }

  // Final totals
  const totalRows = await db.execute(sql`SELECT COUNT(*) as total FROM content_scenarios`) as any;
  const total = (totalRows[0] as Array<{ total: number }>)[0].total;
  console.log(`\nTotal scenarios: ${total}`);
  console.log("Canonical key distribution:");
  for (const r of after) {
    console.log(`  ${r.capability_key}: ${r.cnt}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
