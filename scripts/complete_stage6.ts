import { getDb } from "../server/db";
import { ailOrgContext } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }
  
  const rows = await db.select({
    tenantId: ailOrgContext.tenantId,
    stageGateStateJson: ailOrgContext.stageGateStateJson,
    outcomesJson: ailOrgContext.outcomesJson,
  }).from(ailOrgContext).where(eq(ailOrgContext.tenantId, 'tenant-acme-ltd'));
  
  if (!rows[0]) { console.error("No row found"); process.exit(1); }
  
  const gateState = JSON.parse(rows[0].stageGateStateJson || '{}');
  console.log("Current stage6:", JSON.stringify(gateState.stage6));
  
  // Build outcomes with primary measures
  const existingOutcomes = JSON.parse(rows[0].outcomesJson || '[]');
  console.log("Existing outcomes count:", existingOutcomes.length);
  
  // Add primary measures to existing outcomes
  const outcomesWithMeasures = existingOutcomes.map((o: any, i: number) => ({
    ...o,
    primary_measure: o.primary_measure || [
      "Time-to-hire for specialist roles (days)",
      "HR admin hours per hire",
      "Annual attrition rate (%)",
      "Workforce AI literacy score (0-10)",
    ][i] || "Key performance indicator to be defined",
  }));
  
  // Mark stage6 as complete
  if (!gateState.stage6) gateState.stage6 = {};
  gateState.stage6.completedAt = Date.now();
  gateState.stage6.lastEditedAt = null;
  
  await db.update(ailOrgContext)
    .set({
      outcomesJson: JSON.stringify(outcomesWithMeasures),
      stage6ConfirmedAt: new Date(),
      stageGateStateJson: JSON.stringify(gateState),
      updatedAt: new Date(),
    })
    .where(eq(ailOrgContext.tenantId, 'tenant-acme-ltd'));
  
  console.log("✅ Stage 6 marked complete for tenant-acme-ltd");
  console.log("Outcomes with measures:", outcomesWithMeasures.length);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
