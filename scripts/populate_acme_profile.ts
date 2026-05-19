/**
 * Populate Acme's missing profile fields so hard gates pass for their selected initiatives.
 * Acme: 2,500 headcount, fashion retail, mixed frontline/office workforce.
 */
import { getDb } from "../server/db";
import { ailOrgContext } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }

  const rows = await db.select().from(ailOrgContext).limit(1);
  if (!rows[0]) { console.error("No org context"); process.exit(1); }

  const row = rows[0];
  const parse = (v: string | null | undefined) => { try { return v ? JSON.parse(v) : {}; } catch { return {}; } };

  const backgroundInputs = parse(row.backgroundInputsJson);
  const sectionI = parse(row.sectionIJson);
  const sectionB = backgroundInputs.sectionB ?? {};
  const sectionC = backgroundInputs.sectionC ?? {};
  const sectionD = backgroundInputs.sectionD ?? {};

  console.log("Current sectionI:", JSON.stringify(sectionI, null, 2));
  console.log("Current sectionB:", JSON.stringify(sectionB, null, 2));
  console.log("Current sectionC:", JSON.stringify(sectionC, null, 2));
  console.log("Current sectionD:", JSON.stringify(sectionD, null, 2));

  // Populate sectionI with sensible defaults for Acme (fashion retail, 2500 headcount)
  const updatedSectionI = {
    ...sectionI,
    workforceComposition: sectionI.workforceComposition ?? "mixed",  // retail = mixed frontline/office
    frontlineHeadcountPercent: sectionI.frontlineHeadcountPercent ?? 0.55,  // ~55% frontline in retail
    employeeExperienceState: sectionI.employeeExperienceState ?? "developing",
    skillsInventoryCompleteness: sectionI.skillsInventoryCompleteness ?? "partial",
    topBusinessPriorities: sectionI.topBusinessPriorities ?? ["growth", "efficiency", "talent_retention"],
  };

  // Populate sectionB with missing fields
  const updatedSectionB = {
    ...sectionB,
    hrSubFunctions: sectionB.hrSubFunctions ?? ["Talent Acquisition", "L&D", "HR Operations", "Reward", "Employee Relations"],
    dataMaturity: sectionB.dataMaturity ?? "developing",
    integrationMaturity: sectionB.integrationMaturity ?? "partial",
    hrisPresent: sectionB.hrisPresent ?? true,
    atsPresent: sectionB.atsPresent ?? true,
    lmsPresent: sectionB.lmsPresent ?? false,
  };

  // Populate sectionC with missing fields
  const updatedSectionC = {
    ...sectionC,
    workforceDigitalAccess: sectionC.workforceDigitalAccess ?? "mixed_access",  // mixed retail workforce
    aiReadinessScore: sectionC.aiReadinessScore ?? 55,
    changeReadiness: sectionC.changeReadiness ?? "moderate",
    aiGovernanceMaturity: sectionC.aiGovernanceMaturity ?? "emerging",
    dataPrivacyMaturity: sectionC.dataPrivacyMaturity ?? "developing",
  };

  // Populate sectionD with missing fields
  const updatedSectionD = {
    ...sectionD,
    annualHires: sectionD.annualHires ?? 720,  // ~29% attrition × 2500
    annualAttritionRate: sectionD.annualAttritionRate ?? 0.29,
    annualLDSpend: sectionD.annualLDSpend ?? 375000,  // £150/head × 2500
    timeToFillDays: sectionD.timeToFillDays ?? 42,
    costPerHireGbp: sectionD.costPerHireGbp ?? 3500,
    voluntaryAttritionRate: sectionD.voluntaryAttritionRate ?? 0.22,
    hrHelpdeskVolume: sectionD.hrHelpdeskVolume ?? 1200,
  };

  // Update backgroundInputsJson with new sectionB, sectionC, sectionD
  const updatedBackgroundInputs = {
    ...backgroundInputs,
    sectionB: updatedSectionB,
    sectionC: updatedSectionC,
    sectionD: updatedSectionD,
  };

  await db.update(ailOrgContext)
    .set({
      backgroundInputsJson: JSON.stringify(updatedBackgroundInputs),
      sectionIJson: JSON.stringify(updatedSectionI),
    })
    .where(eq(ailOrgContext.tenantId, row.tenantId));

  console.log("\nUpdated profile:");
  console.log("  sectionI.workforceComposition:", updatedSectionI.workforceComposition);
  console.log("  sectionI.frontlineHeadcountPercent:", updatedSectionI.frontlineHeadcountPercent);
  console.log("  sectionB.hrSubFunctions:", updatedSectionB.hrSubFunctions);
  console.log("  sectionC.workforceDigitalAccess:", updatedSectionC.workforceDigitalAccess);
  console.log("  sectionD.annualHires:", updatedSectionD.annualHires);
  console.log("  sectionD.annualLDSpend:", updatedSectionD.annualLDSpend);
  console.log("\nDone! Now run refresh_fit_engine.ts to re-run the fit engine.");
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
