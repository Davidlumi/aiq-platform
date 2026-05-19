/**
 * Fix seed data quality issues in sections E, H, I, J for the Acme demo org.
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
    
    // Fix Section E: Add success narrative, pain points, strategic priorities
    if (inputs.sectionE) {
      const e = inputs.sectionE;
      
      if (!e.successNarrative || e.successNarrative.length < 50) {
        e.successNarrative = "We've reduced time-to-hire by 25%, our HR team spends 40% less time on admin, and every manager has an AI-powered dashboard giving them real-time insight into their team. Our frontline workforce has access to a 24/7 AI assistant for HR queries, and we've built a reputation as the most AI-forward HR function in UK retail. The board sees HR as a strategic driver of competitive advantage, not a cost centre.";
        console.log(`[${row.id}] Added successNarrative to sectionE`);
        changed = true;
      }
      
      if (!e.topPainPoints || e.topPainPoints.length === 0 || e.topPainPoints.every((p: string) => !p)) {
        e.topPainPoints = [
          "Time-to-hire is too slow — specialist roles take 45+ days to fill",
          "HR team spends 60% of time on transactional queries and admin",
          "Frontline managers lack data to make informed people decisions"
        ];
        console.log(`[${row.id}] Added topPainPoints to sectionE`);
        changed = true;
      }
      
      if (!e.strategicPriorities || e.strategicPriorities.length === 0 || e.strategicPriorities.every((p: string) => !p)) {
        e.strategicPriorities = [
          "Automate high-volume HR operations to free up strategic capacity",
          "Build AI-powered talent acquisition to halve time-to-hire",
          "Deploy workforce AI literacy programme across all 2,500 employees",
          "Implement predictive attrition modelling to reduce voluntary turnover",
          "Create a data-driven HR operating model with real-time people analytics"
        ];
        console.log(`[${row.id}] Added strategicPriorities to sectionE`);
        changed = true;
      }
    }
    
    // Fix Section H: Board AI interest, language resonates
    if (inputs.sectionH) {
      const h = inputs.sectionH;
      
      if (h.boardAiInterest === "none") {
        h.boardAiInterest = "emerging";
        console.log(`[${row.id}] Fixed boardAiInterest: none → emerging`);
        changed = true;
      }
      
      // Add more language resonates options (currently only risk-mitigation)
      if (!h.languageResonates || h.languageResonates.length <= 1) {
        h.languageResonates = ["Risk-mitigation", "Competitive positioning", "Numbers"];
        console.log(`[${row.id}] Updated languageResonates in sectionH`);
        changed = true;
      }
    }
    
    // Fix Section I: Fix snake_case priorities, set unset dropdowns, fix frontline %
    if (inputs.sectionI) {
      const i = inputs.sectionI;
      
      // Fix snake_case business priorities
      const priorityFixes: Record<string, string> = {
        "growth": "Growth",
        "efficiency": "Efficiency",
        "talent_retention": "Talent retention",
        "innovation": "Innovation",
        "cost_reduction": "Cost reduction",
      };
      if (i.businessPriorities) {
        const fixed = i.businessPriorities.map((p: string) => priorityFixes[p] ?? p);
        if (JSON.stringify(fixed) !== JSON.stringify(i.businessPriorities)) {
          console.log(`[${row.id}] Fixed businessPriorities snake_case`);
          i.businessPriorities = fixed;
          changed = true;
        }
      }
      
      // Fix frontline headcount % (0.55 → 55)
      if (i.frontlineHeadcountPct && i.frontlineHeadcountPct < 1) {
        console.log(`[${row.id}] Fixing frontlineHeadcountPct: ${i.frontlineHeadcountPct} → 55`);
        i.frontlineHeadcountPct = 55;
        changed = true;
      }
      
      // Set unset dropdowns
      if (!i.primaryWorkType || i.primaryWorkType === "") {
        i.primaryWorkType = "mixed";
        console.log(`[${row.id}] Set primaryWorkType`);
        changed = true;
      }
      if (!i.employmentMix || i.employmentMix === "") {
        i.employmentMix = "predominantly_permanent";
        console.log(`[${row.id}] Set employmentMix`);
        changed = true;
      }
      if (!i.geographicDistribution || i.geographicDistribution === "") {
        i.geographicDistribution = "uk_multi_site";
        console.log(`[${row.id}] Set geographicDistribution`);
        changed = true;
      }
      if (!i.managerCapabilityAiChange || i.managerCapabilityAiChange === "") {
        i.managerCapabilityAiChange = "developing";
        console.log(`[${row.id}] Set managerCapabilityAiChange`);
        changed = true;
      }
      if (!i.managerCapabilityDataInsights || i.managerCapabilityDataInsights === "") {
        i.managerCapabilityDataInsights = "developing";
        console.log(`[${row.id}] Set managerCapabilityDataInsights`);
        changed = true;
      }
      if (!i.businessDirectionType || i.businessDirectionType === "") {
        i.businessDirectionType = "growth_and_transformation";
        console.log(`[${row.id}] Set businessDirectionType`);
        changed = true;
      }
      
      // Add pivotal job families if empty
      if (!i.pivotalJobFamilies || i.pivotalJobFamilies.every((p: string) => !p)) {
        i.pivotalJobFamilies = [
          "Retail store managers",
          "Buying & merchandising",
          "Supply chain & logistics",
          "Digital & technology",
          "HR business partners"
        ];
        console.log(`[${row.id}] Added pivotalJobFamilies`);
        changed = true;
      }
    }
    
    // Fix Section J: Set risk tolerance
    if (inputs.sectionJ) {
      const j = inputs.sectionJ;
      
      if (!j.riskTolerance || j.riskTolerance === "") {
        j.riskTolerance = "moderate";
        console.log(`[${row.id}] Set riskTolerance in sectionJ`);
        changed = true;
      }
      
      // Add vendor preferences if empty
      if (!j.vendorPreferences || j.vendorPreferences.length < 20) {
        j.vendorPreferences = "Strategic Microsoft Azure partnership — prefer Azure-native AI solutions. Existing Oracle HCM contract runs until 2027. Avoid Workday due to recent failed evaluation. Open to specialist HR AI vendors with proven UK retail references.";
        console.log(`[${row.id}] Added vendorPreferences to sectionJ`);
        changed = true;
      }
      
      // Add initiatives to exclude if empty
      if (!j.initiativesToExclude || j.initiativesToExclude.length < 20) {
        j.initiativesToExclude = "No fully automated hiring decisions — human in the loop required for all offers. No AI-generated performance ratings without manager review. Avoid any tools requiring employee biometric data.";
        console.log(`[${row.id}] Added initiativesToExclude to sectionJ`);
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
process.exit(0);
