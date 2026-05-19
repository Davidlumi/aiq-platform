import { getDb } from "../server/db";
import { ailOrgContext } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const SELECTED_IDS = [
  "on_documentation_automation",
  "ld_content_creation",
  "fw_frontline_learning",
  "ta_recruiter_productivity_ai",
  "ld_compliance_training",
  "hr_ai_governance",
  "ta_bias_monitoring",
  "hr_virtual_assistant",
  "pm_pay_equity_analysis",
  "ee_bias_audit",
  "on_personalised_journeys",
  "ld_personalised_learning",
];

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }

  const rows = await db.select({
    tenantId: ailOrgContext.tenantId,
    stageGateStateJson: ailOrgContext.stageGateStateJson,
    selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
  }).from(ailOrgContext).limit(5);

  console.log("Found", rows.length, "rows");
  for (const row of rows) {
    console.log("tenantId:", row.tenantId);
    const gateState = JSON.parse(row.stageGateStateJson || "{}");
    console.log("Current stage5:", JSON.stringify(gateState.stage5));
    console.log("Current selectedInitiatives:", row.selectedInitiativesJson?.substring(0, 100));

    // Mark stage5 as complete
    if (!gateState.stage5) gateState.stage5 = {};
    gateState.stage5.completedAt = Date.now();
    gateState.stage5.lastEditedAt = null;

    await db.update(ailOrgContext)
      .set({
        selectedInitiativesJson: JSON.stringify(SELECTED_IDS),
        stage5ConfirmedAt: new Date(),
        stageGateStateJson: JSON.stringify(gateState),
        updatedAt: new Date(),
      })
      .where(eq(ailOrgContext.tenantId, row.tenantId));

    console.log("✅ Stage 5 marked complete for tenantId:", row.tenantId);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
