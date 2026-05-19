import { getDb } from "../server/db";
import { ailOrgContext } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Map phantom IDs → correct shared library IDs
const ID_FIXES: Record<string, string> = {
  "hr_ai_governance": "gv_ai_governance",
  "pm_pay_equity_analysis": "cr_pay_equity",
  "ee_bias_audit": "gv_cross_cutting_bias_audit",
};

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }

  const rows = await db.select({
    tenantId: ailOrgContext.tenantId,
    selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
  }).from(ailOrgContext).limit(5);

  for (const row of rows) {
    if (!row.selectedInitiativesJson) continue;
    let ids: string[] = JSON.parse(row.selectedInitiativesJson);
    const original = [...ids];
    ids = ids.map(id => ID_FIXES[id] ?? id);
    
    const changed = ids.filter((id, i) => id !== original[i]);
    if (changed.length === 0) {
      console.log("No changes needed for tenantId:", row.tenantId);
      continue;
    }

    console.log("Fixing IDs for tenantId:", row.tenantId);
    console.log("Before:", original);
    console.log("After:", ids);

    await db.update(ailOrgContext)
      .set({ selectedInitiativesJson: JSON.stringify(ids), updatedAt: new Date() })
      .where(eq(ailOrgContext.tenantId, row.tenantId));
    console.log("✅ Fixed", changed.length, "IDs");
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
