/**
 * Fix the operationalBaseline to match Acme's actual backgroundInputsJson data.
 * The baseline was set to 20K headcount (sector default) but Acme has 2,500.
 */
import { getDb } from "../server/db";
import { ailOrgContext } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { process.exit(1); }

  const rows = await db.select({
    tenantId: ailOrgContext.tenantId,
    backgroundInputsJson: ailOrgContext.backgroundInputsJson,
    operationalBaselineJson: ailOrgContext.operationalBaselineJson,
  }).from(ailOrgContext).limit(1);

  if (!rows[0]) { console.error("No org context"); process.exit(1); }

  const parse = (v: string | null | undefined) => { try { return v ? JSON.parse(v) : {}; } catch { return {}; } };
  const inputs = parse(rows[0].backgroundInputsJson);
  const currentBaseline = parse(rows[0].operationalBaselineJson);

  const actualHeadcount = inputs.sectionA?.totalHeadcount ?? 2500;
  const actualHires = inputs.sectionD?.annualHiresLow ?? 720;
  const actualCostPerHire = inputs.sectionD?.costPerExternalHire ?? 2994;
  const actualTimeToFill = inputs.sectionD?.timeToFillDays ?? 15;
  const actualAttrition = inputs.sectionD?.voluntaryAttritionPct ?? 10;
  const actualLDSpend = inputs.sectionD?.annualLDSpend ? Math.round(inputs.sectionD.annualLDSpend / actualHeadcount) : 420;
  const hrTeamSize = inputs.sectionB?.hrTeamSize ?? 50;
  const avgSalary = inputs.sectionA?.avgSalaryGbp ?? 49996;
  const hrCostPerFte = Math.round(avgSalary * 1.3 / hrTeamSize * (actualHeadcount / 100)) || 1200;

  const updatedBaseline = {
    ...currentBaseline,
    headcount: actualHeadcount,
    hires_per_year: actualHires,
    cost_per_hire_gbp: actualCostPerHire,
    time_to_fill_days: actualTimeToFill,
    voluntary_attrition_rate_pct: actualAttrition,
    l_and_d_spend_per_fte_gbp: actualLDSpend,
    hr_cost_per_fte_gbp: Math.min(hrCostPerFte, 2000),  // cap at £2k/fte
    _sector_default_used: {
      cost_per_hire_gbp: false,
      time_to_fill_days: false,
      voluntary_attrition_rate_pct: false,
      l_and_d_spend_per_fte_gbp: false,
      hr_cost_per_fte_gbp: false,
    },
  };

  console.log("Old baseline:", JSON.stringify(currentBaseline, null, 2));
  console.log("\nNew baseline:", JSON.stringify(updatedBaseline, null, 2));

  await db.update(ailOrgContext)
    .set({ operationalBaselineJson: JSON.stringify(updatedBaseline) })
    .where(eq(ailOrgContext.tenantId, rows[0].tenantId));

  console.log("\nUpdated! Now reload the overview page to see the corrected value.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
