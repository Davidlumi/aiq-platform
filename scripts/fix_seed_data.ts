/**
 * Fix bad seed data in sectionD and sectionF for the Acme demo org.
 */
import { getDb } from "../server/db";
import { ailOrgContext } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }

  const rows = await db.select({
    id: ailOrgContext.id,
    backgroundInputsJson: ailOrgContext.backgroundInputsJson,
  }).from(ailOrgContext).limit(5);

  for (const row of rows) {
    if (!row.backgroundInputsJson) continue;
    
    const inputs = JSON.parse(row.backgroundInputsJson);
    let changed = false;
    
    // Fix sectionD
    if (inputs.sectionD) {
      const d = inputs.sectionD;
      
      // Fix annual revenue (35.7 trillion → £1.2B for a 2,500-headcount fashion retailer)
      if (d.annualRevenue && d.annualRevenue > 5_000_000_000) {
        console.log(`[${row.id}] Fixing annualRevenue: ${d.annualRevenue} → 1200000000`);
        d.annualRevenue = 1_200_000_000;
        changed = true;
      }
      
      // Fix HR budget (£1.2B → £12M for 50 HR FTEs)
      if (d.hrBudgetGbp && d.hrBudgetGbp > 100_000_000) {
        console.log(`[${row.id}] Fixing hrBudgetGbp: ${d.hrBudgetGbp} → 12000000`);
        d.hrBudgetGbp = 12_000_000;
        changed = true;
      }
      
      // Fix "hiting" typo
      if (d.topHrTimePlaces) {
        const fixed = d.topHrTimePlaces.map((p: string) => 
          p === "hiting" ? "hiring" : p
        );
        if (JSON.stringify(fixed) !== JSON.stringify(d.topHrTimePlaces)) {
          console.log(`[${row.id}] Fixing topHrTimePlaces typo`);
          d.topHrTimePlaces = fixed;
          changed = true;
        }
      }
    }
    
    // Fix sectionF culture descriptor typos
    if (inputs.sectionF?.cultureDescriptors) {
      const fixes: Record<string, string> = {
        "Excelelnce": "Excellence",
        "Accoutabele": "Accountable",
        "Accoutnable": "Accountable",
      };
      const fixed = inputs.sectionF.cultureDescriptors.map((d: string) => fixes[d] ?? d);
      if (JSON.stringify(fixed) !== JSON.stringify(inputs.sectionF.cultureDescriptors)) {
        console.log(`[${row.id}] Fixing cultureDescriptors typos`);
        inputs.sectionF.cultureDescriptors = fixed;
        changed = true;
      }
    }
    
    if (changed) {
      await db.update(ailOrgContext)
        .set({ backgroundInputsJson: JSON.stringify(inputs) })
        .where(eq(ailOrgContext.id, row.id));
      console.log(`[${row.id}] Updated successfully`);
    } else {
      console.log(`[${row.id}] No changes needed`);
    }
  }

  console.log("Done.");
}

main().catch(console.error);
