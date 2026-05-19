import { getDb } from "../server/db";
import { ailOrgContext } from "../drizzle/schema";

const db = await getDb();
const rows = await db.select({ 
  gateState: ailOrgContext.stageGateStateJson,
  tenantId: ailOrgContext.tenantId
})
  .from(ailOrgContext)
  .limit(3);

for (const row of rows) {
  console.log("TenantId:", row.tenantId);
  const state = JSON.parse(row.gateState || "{}");
  console.log("Stage 2:", JSON.stringify(state.stage2, null, 2));
  console.log("Stage 3:", JSON.stringify(state.stage3, null, 2));
  console.log("Stage 4:", JSON.stringify(state.stage4, null, 2));
}
process.exit(0);
