/**
 * P1 — Enumerate every domain taxonomy in the codebase and DB.
 * Produces a definitive reconciliation table.
 */
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";
import { ALL_DOMAINS, DOMAIN_DISPLAY, DOMAIN_TIER } from "../server/assessment/scoringEngine";
import type { CapabilityKey } from "../server/assessment/roleArchetypes";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  console.log("=== TAXONOMY 1: scoringEngine.ts ALL_DOMAINS (the scoring/assessment engine) ===");
  console.log("Source: server/assessment/scoringEngine.ts — ALL_DOMAINS, DOMAIN_DISPLAY, DOMAIN_TIER");
  console.log("Consumed by: adaptiveEngine.ts (question selection), scoringEngine.ts (scoring), assessment.ts router (display), people.ts router (display)");
  console.log("");
  console.log("Key                    | Display Label              | Tier");
  console.log("-----------------------|----------------------------|------------");
  for (const k of ALL_DOMAINS) {
    const key = k as CapabilityKey;
    console.log(`${k.padEnd(22)} | ${DOMAIN_DISPLAY[key].padEnd(26)} | ${DOMAIN_TIER[key]}`);
  }

  console.log("\n=== TAXONOMY 2: content_scenarios.capability_key (the DB question bank) ===");
  console.log("Source: DB table content_scenarios, column capability_key (varchar 50)");
  console.log("Consumed by: assessment.ts router (baseline phase — pulls scenarios from DB by capabilityKey)");
  console.log("");

  const rows = await db.execute(sql`SELECT capability_key, COUNT(*) as cnt FROM content_scenarios GROUP BY capability_key ORDER BY cnt DESC`) as any;
  const capRows = rows[0] as Array<{ capability_key: string; cnt: number }>;

  console.log("capability_key              | Count | Matches scoring taxonomy?");
  console.log("----------------------------|-------|---------------------------");
  const scoringKeys = new Set(ALL_DOMAINS as string[]);
  for (const row of capRows) {
    const match = scoringKeys.has(row.capability_key) ? "YES" : "NO ← MISMATCH";
    console.log(`${row.capability_key.padEnd(28)}| ${String(row.cnt).padEnd(6)}| ${match}`);
  }

  console.log("\n=== TAXONOMY 3: roleArchetypes.ts CapabilityKey type ===");
  console.log("Source: server/assessment/roleArchetypes.ts — CapabilityKey union type");
  console.log("Values: ai_interaction | ai_output_evaluation | ai_workflow_design | workforce_ai_readiness | ai_ethics_trust | ai_change_leadership");
  console.log("Consumed by: roleArchetypes (capability weights), normEngine (norms), adaptiveEngine (type annotations)");
  console.log("→ IDENTICAL to scoringEngine ALL_DOMAINS — same six keys");

  console.log("\n=== TAXONOMY 4: d2-assessment-simulation.ts (evidence pack script only) ===");
  console.log("Source: scripts/d2-assessment-simulation.ts — local domain labels");
  console.log("Values: ai_foundations, governance_ethics, data_analytics, change_adoption, strategy_value, workforce_design");
  console.log("Consumed by: ONLY the evidence simulation script — NOT the live assessment engine");
  console.log("→ FABRICATED for the script. These keys do NOT exist in the live codebase.");

  console.log("\n=== TAXONOMY 5: gap3-canonical-domains.ts (evidence pack script only) ===");
  console.log("Source: scripts/gap3-canonical-domains.ts — queried DB capability_key values");
  console.log("Values: ai_foundations, data_ethics, hr_ai_application, org_transformation, reward_intelligence, workforce_analytics");
  console.log("→ These are what was ACTUALLY in the DB at the time of the gap3 script run.");
  console.log("→ These do NOT match the scoring engine. They appear to be from an older seed.");

  // Check what's actually in DB now
  const totalRows = await db.execute(sql`SELECT COUNT(*) as total FROM content_scenarios`) as any;
  const total = (totalRows[0] as Array<{ total: number }>)[0].total;
  console.log(`\nTotal content_scenarios in DB: ${total}`);

  // Check if any scoring-engine keys exist in DB
  const matchRows = await db.execute(sql`SELECT capability_key, COUNT(*) as cnt FROM content_scenarios WHERE capability_key IN ('ai_interaction','ai_output_evaluation','ai_workflow_design','workforce_ai_readiness','ai_ethics_trust','ai_change_leadership') GROUP BY capability_key`) as any;
  const matchData = matchRows[0] as Array<{ capability_key: string; cnt: number }>;
  console.log("\nScoring-engine keys present in DB:");
  if (matchData.length === 0) {
    console.log("  NONE — no scenarios tagged with the canonical scoring-engine keys");
  } else {
    for (const row of matchData) {
      console.log(`  ${row.capability_key}: ${row.cnt}`);
    }
  }

  // Check the rewardCapabilityAssessment table for its domain taxonomy
  console.log("\n=== TAXONOMY 6: rewardCapabilityAssessment (Reward Stage 8) ===");
  const rcaRows = await db.execute(sql`SELECT dimension_key, COUNT(*) as cnt FROM reward_capability_assessments GROUP BY dimension_key ORDER BY cnt DESC LIMIT 20`) as any;
  const rcaData = rcaRows[0] as Array<{ dimension_key: string; cnt: number }>;
  if (rcaData.length === 0) {
    console.log("  No data in reward_capability_assessments");
  } else {
    console.log("dimension_key               | Count");
    console.log("----------------------------|------");
    for (const row of rcaData) {
      console.log(`${row.dimension_key.padEnd(28)}| ${row.cnt}`);
    }
  }

  // Check CAPABILITY_DIMENSIONS constant
  console.log("\n=== TAXONOMY 7: CAPABILITY_DIMENSIONS (Reward Stage 8 dimensions) ===");
  console.log("Source: server/routers/rewardCapabilityAssessment.ts — CAPABILITY_DIMENSIONS array");
  console.log("(These are the six dimensions shown in the Reward capability assessment UI)");

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
