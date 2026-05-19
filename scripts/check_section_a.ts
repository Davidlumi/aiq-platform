import { getDb } from "../server/db";
import { ailOrgContext } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }
  
  const rows = await db.select().from(ailOrgContext);
  for (const row of rows) {
    const inputs = row.backgroundInputsJson ? JSON.parse(row.backgroundInputsJson) : {};
    console.log("tenantId:", row.tenantId);
    console.log("sectionA:", JSON.stringify(inputs.sectionA, null, 2));
    console.log("sectionB:", JSON.stringify(inputs.sectionB, null, 2));
    console.log("sectionD keys:", inputs.sectionD ? Object.keys(inputs.sectionD) : "null");
    console.log("sectionD.monthlyHrQueryVolumeLow:", inputs.sectionD?.monthlyHrQueryVolumeLow);
    console.log("sectionD.hrBudgetGbp:", inputs.sectionD?.hrBudgetGbp);
    console.log("sectionB.hrTeamSize:", inputs.sectionB?.hrTeamSize);
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
