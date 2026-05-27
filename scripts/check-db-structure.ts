import { getDb } from "../server/db";
import { assessmentScores } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) { console.log("no db"); return; }
  const rows = await db.select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson }).from(assessmentScores).limit(1);
  if (rows.length === 0) { console.log("no rows"); return; }
  const obj = rows[0].scoreBreakdownJson as Record<string, unknown>;
  console.log("Top-level keys:", Object.keys(obj));
  const cap = obj.capabilityScores as Record<string, unknown> | undefined;
  if (cap) console.log("capabilityScores keys:", Object.keys(cap));
}
main().catch(console.error);
