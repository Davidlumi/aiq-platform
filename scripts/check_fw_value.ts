import { getDb } from "../server/db";
import { ailOrgContext } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }
  
  const rows = await db.select({ fitImpactResultsJson: ailOrgContext.fitImpactResultsJson }).from(ailOrgContext).limit(1);
  if (!rows[0]?.fitImpactResultsJson) { console.log("No fit results"); process.exit(0); }
  
  const results = JSON.parse(rows[0].fitImpactResultsJson) as Array<{ id: string; valueRange: unknown; fitStatus: string }>;
  console.log(`Total initiatives in DB: ${results.length}`);
  
  const targets = ["fw_frontline_learning", "ld_content_creation", "on_documentation_automation", "ta_recruiter_productivity_ai"];
  for (const id of targets) {
    const r = results.find(x => x.id === id);
    console.log(`${id}: valueRange=${JSON.stringify(r?.valueRange)}, fitStatus=${r?.fitStatus}`);
  }
  
  // Show all non-null value ranges
  const withValue = results.filter(r => r.valueRange !== null);
  console.log(`\nInitiatives with non-null valueRange: ${withValue.length}`);
  for (const r of withValue) {
    console.log(`  ${r.id}: ${JSON.stringify((r as any).valueRange)}`);
  }
  
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
