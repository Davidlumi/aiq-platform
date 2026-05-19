import { getDb } from "./server/db";
import { ailOrgContext } from "./drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) { console.log("no db"); return; }
  const rows = await db.select({
    tenantId: ailOrgContext.tenantId,
    backgroundInputsJson: ailOrgContext.backgroundInputsJson,
    selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
    fitImpactResultsJson: ailOrgContext.fitImpactResultsJson,
  }).from(ailOrgContext).limit(3);
  
  for (const row of rows) {
    console.log("=== Tenant:", row.tenantId);
    const inputs = row.backgroundInputsJson ? JSON.parse(row.backgroundInputsJson as string) : {};
    console.log("sectionA:", JSON.stringify({
      totalHeadcount: inputs.sectionA?.totalHeadcount,
      headcountBand: inputs.sectionA?.headcountBand,
      sector: inputs.sectionA?.sector,
    }, null, 2));
    console.log("sectionD:", JSON.stringify({
      annualHiresLow: inputs.sectionD?.annualHiresLow,
      annualHiresHigh: inputs.sectionD?.annualHiresHigh,
      annualRevenue: inputs.sectionD?.annualRevenue,
      hrBudgetGbp: inputs.sectionD?.hrBudgetGbp,
      costPerExternalHire: inputs.sectionD?.costPerExternalHire,
    }, null, 2));
    const selected = row.selectedInitiativesJson ? JSON.parse(row.selectedInitiativesJson as string) : [];
    console.log("selectedInitiatives count:", selected.length, "first 5:", selected.slice(0, 5));
    
    // Check fit results for value
    const fitResults = row.fitImpactResultsJson ? JSON.parse(row.fitImpactResultsJson as string) : [];
    const withValue = fitResults.filter((r: any) => r.valueRange && (r.valueRange.low > 0 || r.valueRange.high > 0));
    const withoutValue = fitResults.filter((r: any) => !r.valueRange || (r.valueRange.low === 0 && r.valueRange.high === 0));
    console.log("Fit results with value:", withValue.length, "without:", withoutValue.length);
    if (withoutValue.length > 0) {
      console.log("Zero-value initiatives:", withoutValue.map((r: any) => r.id).join(", "));
    }
    // Show total value
    let totalLow = 0, totalHigh = 0;
    for (const r of withValue) {
      totalLow += r.valueRange.low ?? 0;
      totalHigh += r.valueRange.high ?? 0;
    }
    console.log(`Total value range: £${Math.round(totalLow/1000)}k – £${Math.round(totalHigh/1000)}k`);
  }
}
main().catch(console.error);
