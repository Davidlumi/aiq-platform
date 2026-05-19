/**
 * Fix application volume inconsistency: Low (2000) > High (1295) — should be swapped.
 * Also fix admin time per hire (1 hour seems too low — should be more realistic, e.g. 8 hours).
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
    
    if (inputs.sectionD) {
      const d = inputs.sectionD;
      
      // Fix application volume: Low (2000) > High (1295) — swap them
      if (d.annualApplicationVolumeLow && d.annualApplicationVolumeHigh &&
          d.annualApplicationVolumeLow > d.annualApplicationVolumeHigh) {
        console.log(`[${row.id}] Fixing application volume: Low=${d.annualApplicationVolumeLow}, High=${d.annualApplicationVolumeHigh} → swap`);
        const tmp = d.annualApplicationVolumeLow;
        d.annualApplicationVolumeLow = d.annualApplicationVolumeHigh;
        d.annualApplicationVolumeHigh = tmp;
        // Also update the legacy annualApplicationVolume field
        d.annualApplicationVolume = d.annualApplicationVolumeLow;
        changed = true;
      }
      
      // Fix admin time per hire (1 hour is unrealistically low — use 8 hours)
      if (d.adminTimePerHireHours && d.adminTimePerHireHours < 2) {
        console.log(`[${row.id}] Fixing adminTimePerHireHours: ${d.adminTimePerHireHours} → 8`);
        d.adminTimePerHireHours = 8;
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
