/**
 * Script to re-run the fit engine for all tenants and update fitImpactResultsJson
 * Uses the same field mapping as regenerateInitiativeOptions in intelligence.ts
 */
import { evaluateAllInitiatives, type FitImpactEngineInputs } from "../server/services/fitImpactEngine";
import { getDb } from "../server/db";
import { ailOrgContext } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB connection"); process.exit(1); }

  const rows = await db.select().from(ailOrgContext);
  console.log(`Found ${rows.length} tenant(s)`);

  for (const row of rows) {
    const parse = (v: string | null | undefined) => {
      try { return v ? JSON.parse(v) : null; } catch { return null; }
    };

    const inputs = parse(row.backgroundInputsJson) ?? {};
    const sectionI = parse(row.sectionIJson) ?? {};
    const sectionJ = parse(row.sectionJJson) ?? {};
    const sectionK = parse(row.sectionKJson) ?? {};
    const capAssessment = parse(row.capabilityAssessmentJson) ?? {};

    const bandMap: Record<string, number> = { lt500: 250, "500_5k": 2750, "5k_25k": 15000, "25k_plus": 50000 };

    // Use EXACT same mapping as regenerateInitiativeOptions in intelligence.ts
    const engineInputs: FitImpactEngineInputs = {
      sectionA: {
        totalHeadcount: inputs.sectionA?.totalHeadcount ?? bandMap[inputs.sectionA?.headcountBand ?? ""] ?? 0,
        ukSitesCount: inputs.sectionA?.ukSitesCount,
        sectorSpecificRegulation: inputs.sectionA?.sectorSpecificRegulations ?? [],
        sectorSpecificRegulations: inputs.sectionA?.sectorSpecificRegulations ?? [],
        ownershipStructure: inputs.sectionA?.ownershipStructure ?? inputs.sectionA?.orgType,
        sector: inputs.sectionA?.sector,
        headcountBand: inputs.sectionA?.headcountBand,
        avgSalaryGbp: inputs.sectionA?.avgSalaryGbp,
        annualRevenue: inputs.sectionA?.annualRevenue,
      },
      sectionB: {
        hrFteCount: inputs.sectionB?.hrTeamSize,
        hrBudgetGbp: inputs.sectionD?.hrBudgetGbp,
        hrTechStack: inputs.sectionB?.hrTechStack ?? [],
        hrisPresent: inputs.sectionC?.hrisSystem ? true : false,
        atsPresent: inputs.sectionC?.atsSystem ? true : false,
        lmsPresent: inputs.sectionC?.lmsSystem ? true : false,
        dataMaturity: inputs.sectionC?.dataQualityRating,
        integrationMaturity: inputs.sectionC?.hrSystemIntegrationMaturity,
        hrSubFunctions: inputs.sectionB?.hrSubFunctions ?? [],
      },
      sectionC: {
        aiReadinessScore: inputs.sectionC?.aiReadinessScore,
        changeReadiness: inputs.sectionC?.changeReadiness,
        aiGovernanceMaturity: inputs.sectionC?.aiGovernanceMaturity,
        dataPrivacyMaturity: inputs.sectionC?.dataPrivacyMaturity,
        workforceDigitalAccess: inputs.sectionC?.workforceDigitalAccess,
        engagementSurveyTool: inputs.sectionC?.engagementSurveyTool,
      },
      sectionD: {
        annualHires: inputs.sectionD?.annualHiresLow,
        annualHiresHigh: inputs.sectionD?.annualHiresHigh,
        adminTimePerHire: inputs.sectionD?.adminTimePerHireHours,
        adminTimePerHireIsEstimate: inputs.sectionD?.adminTimeIsEstimate,
        totalHrBudget: inputs.sectionD?.hrBudgetGbp,
        totalHrBudgetIsEstimate: inputs.sectionD?.hrBudgetIsEstimate,
        attritionRate: inputs.sectionD?.voluntaryAttritionPct,
        attritionRateIsEstimate: inputs.sectionD?.attritionIsEstimate,
        annualApplicationVolume: inputs.sectionD?.annualApplicationVolumeLow ?? inputs.sectionD?.annualApplicationVolumeHigh,
        annualApplicationVolumeHigh: inputs.sectionD?.annualApplicationVolumeHigh,
        costPerExternalHire: inputs.sectionD?.costPerExternalHire,
        costPerExternalHireIsEstimate: inputs.sectionD?.costPerExternalHireIsEstimate,
        annualContractorSpend: inputs.sectionD?.annualContractorSpend,
        annualContractorSpendIsEstimate: inputs.sectionD?.annualContractorSpendIsEstimate,
        monthlyHrQueryVolume: inputs.sectionD?.monthlyHrQueryVolumeLow ?? inputs.sectionD?.monthlyHrQueryVolumeHigh,
        monthlyHrQueryVolumeHigh: inputs.sectionD?.monthlyHrQueryVolumeHigh,
        internalHirePercent: inputs.sectionD?.internalHirePercent,
        annualLDSpend: inputs.sectionD?.annualLDSpend,
        annualLDSpendIsEstimate: inputs.sectionD?.annualLDSpendIsEstimate,
        annualRevenue: inputs.sectionD?.annualRevenue,
        annualRevenueIsEstimate: inputs.sectionD?.annualRevenueIsEstimate,
        currentEngagementScore: inputs.sectionD?.currentEngagementScore,
        hrFteCount: inputs.sectionB?.hrTeamSize,
        avgTimeToFill: inputs.sectionD?.avgTimeToFillDays,
      },
      sectionI: {
        workforceWorkType: sectionI.workforceWorkType,
        workforceComposition: sectionI.workforceComposition,
        workforceEmploymentMix: sectionI.workforceEmploymentMix,
        businessDirectionType: sectionI.businessDirectionType,
        geographicDistribution: sectionI.geographicDistribution,
        managerCapabilityForInsights: sectionI.managerCapabilityForInsights,
        skillsFrameworkStatus: sectionI.skillsFrameworkStatus,
        skillsInventoryCompleteness: sectionI.skillsInventoryCompleteness,
        pivotalJobFamilies: sectionI.pivotalJobFamilies,
        employeeExperienceState: sectionI.employeeExperienceState,
        frontlineHeadcountPercent: sectionI.frontlineHeadcountPercent,
        topBusinessPriorities: sectionI.topBusinessPriorities,
      },
      sectionK: {
        performanceReviewCadence: sectionK.performanceReviewCadence,
        internalMobilityApproach: sectionK.internalMobilityApproach,
        onboardingModel: sectionK.onboardingModel,
        hrHelpdeskModel: sectionK.hrHelpdeskModel,
        hiringProcessStructure: sectionK.hiringProcessStructure,
        hiringVolumeProfile: sectionK.hiringVolumeProfile,
        lAndDDeliveryModel: sectionK.lAndDDeliveryModel,
        rewardCycleModel: sectionK.rewardCycleModel,
      },
      sectionJ: {
        budgetCeiling: sectionJ.budgetCeiling,
        timelineConstraint: sectionJ.timelineConstraint,
        riskTolerance: sectionJ.riskTolerance,
        quickWinsPreference: sectionJ.quickWinsPreference,
      },
      sectionF: { changeReadiness: inputs.sectionF?.changeReadiness },
      sectionG: {
        ai_ethics_trust: capAssessment.ai_ethics_trust?.score,
      },
    };

    console.log(`\nTenant: ${row.tenantId}`);
    console.log(`  sectionI.workforceComposition: ${engineInputs.sectionI?.workforceComposition}`);
    console.log(`  sectionB.hrSubFunctions: ${JSON.stringify(engineInputs.sectionB?.hrSubFunctions)}`);
    console.log(`  sectionC.workforceDigitalAccess: ${engineInputs.sectionC?.workforceDigitalAccess}`);
    console.log(`  sectionD.annualHires: ${engineInputs.sectionD?.annualHires}`);
    console.log(`  sectionD.annualLDSpend: ${engineInputs.sectionD?.annualLDSpend}`);
    console.log(`  sectionA.totalHeadcount: ${engineInputs.sectionA?.totalHeadcount}`);

    const fitResults = evaluateAllInitiatives(engineInputs);
    const fitImpactResultsJson = JSON.stringify(fitResults);

    // Show value ranges for key initiatives
    const targets = ["fw_frontline_learning", "ld_content_creation", "on_documentation_automation", "ta_recruiter_productivity_ai"];
    for (const id of targets) {
      const r = fitResults.find(x => x.id === id);
      console.log(`  ${id}: valueRange=${JSON.stringify(r?.valueRange)}, fitStatus=${r?.fitStatus}, fitScore=${r?.fitScore}`);
    }

    const withValue = fitResults.filter(r => r.valueRange !== null);
    console.log(`  Total with value: ${withValue.length}/${fitResults.length}`);

    // Update DB
    await db.update(ailOrgContext)
      .set({ fitImpactResultsJson })
      .where(eq(ailOrgContext.tenantId, row.tenantId));

    console.log(`  Updated ${fitResults.length} initiatives in DB`);
  }

  console.log("\nDone!");
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
