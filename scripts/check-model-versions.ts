import { getDb } from "../server/db";
import { assessmentScores } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) { console.log("no db"); return; }
  const rows = await db.select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson }).from(assessmentScores);
  
  const oldKeys = new Set(['appropriateness', 'data_interpretation', 'execution', 'governance', 'judgement', 'workflow']);
  const newKeys = new Set(['ai_interaction', 'ai_output_evaluation', 'ai_workflow_design', 'workforce_ai_readiness', 'ai_ethics_trust', 'ai_change_leadership']);
  
  let oldModel = 0, newModel = 0, mixed = 0;
  for (const row of rows) {
    const breakdown = row.scoreBreakdownJson as Record<string, unknown> | null;
    if (!breakdown) continue;
    const cap = breakdown.capabilityScores as Record<string, unknown> | undefined;
    if (!cap) continue;
    const keys = Object.keys(cap);
    const hasOld = keys.some(k => oldKeys.has(k));
    const hasNew = keys.some(k => newKeys.has(k));
    if (hasOld && hasNew) mixed++;
    else if (hasOld) oldModel++;
    else if (hasNew) newModel++;
  }
  
  console.log(`Rows with OLD model domains only: ${oldModel}`);
  console.log(`Rows with NEW model domains only: ${newModel}`);
  console.log(`Rows with MIXED domains: ${mixed}`);
  console.log(`Total rows: ${rows.length}`);
  
  // Also check the modelVersion field
  const versionCounts: Record<string, number> = {};
  for (const row of rows) {
    const breakdown = row.scoreBreakdownJson as Record<string, unknown> | null;
    const mv = (breakdown?.modelVersion as string) ?? 'unknown';
    versionCounts[mv] = (versionCounts[mv] ?? 0) + 1;
  }
  console.log("\nModel version counts:", versionCounts);
}
main().catch(console.error);
