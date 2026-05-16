/**
 * Acme engine dump — prints the full portfolio and library for the canonical Acme profile.
 * Uses the EXACT inputs from engine-update-spec Section 11 (Sarah Thornton / Acme CPO profile).
 * Run: pnpm test server/acme-engine-dump.test.ts
 */
import { describe, it } from "vitest";
import { evaluateAllInitiatives } from "./services/fitImpactEngine";

const ACME_INPUTS = {
  sectionA: {
    sector: "retail" as const,
    totalHeadcount: 20000,
    ukSitesCount: 812,
    sectorSpecificRegulation: ["uk_gdpr", "ico_guidance"],
    sectorSpecificRegulations: ["uk_gdpr", "ico_guidance"],
  },
  sectionB: {
    hrTeamSize: 85,
    hrSubFunctions: ["TA", "Reward", "L&D", "HRBP", "ER", "Operations"],
    hrReportsTo: "CEO" as const,
    hrBudgetOwnership: "full" as const,
  },
  sectionC: {
    hrisSystem: "workday_hcm" as const,
    atsSystem: "workday_recruiting" as const,
    yearsOfHrisData: "2_to_5_years" as const,
    workforceDigitalAccess: "frontline_mobile" as const,
  },
  sectionD: {
    annualHires: 9000,
    annualHiresHigh: 10000,
    annualRevenue: 400_000_000,
    monthlyHrQueryVolume: 3000,
    annualApplicationVolume: 175000,
    annualLDSpend: 1_800_000,
    attritionRate: 35,
    adminTimePerHire: 8,
    costPerExternalHire: 4500,
    totalHrBudget: 8_000_000,
    hrFteCount: 85,
    avgTimeToFill: 28,
  },
  sectionE: {
    ambitionTier: "transform" as const,
    hrPosture: "lead" as const,
    riskAppetite: "moderate" as const,
  },
  sectionG: {
    ai_interaction: 3,
    ai_output_evaluation: 3,
    ai_workflow_design: 2,
    workforce_ai_readiness: 2,
    ai_ethics_trust: 3,
    ai_change_leadership: 2,
  },
  sectionI: {
    workforceComposition: "frontline_heavy" as const,
    businessDirectionType: "growing" as const,
    businessDirection: "Aggressive growth through store expansion and digital transformation",
    peopleChallenges: ["High frontline turnover", "Scheduling complexity", "Manager capability gaps"],
    frontlineHeadcountPercent: 80,
    managerCapabilityForInsights: "mixed" as const,
    skillsFrameworkStatus: "in_development" as const,
  },
  sectionK: {
    performanceReviewCadence: "annual_fy_aligned" as const,
    hiringVolumeProfile: ["frontline_operative", "graduate_apprentice"] as const,
    onboardingModel: "structured_cohort" as const,
    hrHelpdeskModel: "tiered_support" as const,
  },
};

describe("Acme engine dump", () => {
  it("prints full portfolio and library", () => {
    const all = evaluateAllInitiatives(ACME_INPUTS as any);
    const portfolio = all.filter((i: any) => ["STRONG","STRONG_FIT"].includes(i.fitStatus));
    const possible = all.filter((i: any) => i.fitStatus === "POSSIBLE_FIT");
    const weak = all.filter((i: any) => i.fitStatus === "WEAK_FIT");
    const na = all.filter((i: any) => i.fitStatus === "NOT_APPLICABLE" || i.fitStatus === "HARD_GATE_FAIL");

    console.log("\n=== PORTFOLIO ===");
    portfolio.forEach((i: any) => {
      console.log("  phase=" + String(i.phase).padEnd(4) + " | " + i.id.padEnd(40) + " | fit=" + String(i.fitScore ?? "?").padEnd(4) + " | " + i.fitStatus);
    });
    console.log("\n=== POSSIBLE_FIT (" + possible.length + ") ===");
    possible.forEach((i: any) => {
      console.log("  phase=" + String(i.phase).padEnd(4) + " | " + i.id.padEnd(40) + " | fit=" + (i.fitScore ?? "?"));
    });
    console.log("\n=== WEAK_FIT (" + weak.length + ") ===");
    weak.forEach((i: any) => {
      console.log("  phase=" + String(i.phase).padEnd(4) + " | " + i.id.padEnd(40) + " | fit=" + (i.fitScore ?? "?"));
    });
    console.log("\n=== NOT_APPLICABLE (" + na.length + ") ===");
    na.forEach((i: any) => {
      console.log("  " + i.id.padEnd(40) + " | " + i.fitStatus + " | reason=" + (i.hardGateFailReasons?.join(", ") ?? "?"));
    });
    console.log("\nTotals: portfolio=" + portfolio.length + ", possible=" + possible.length + ", weak=" + weak.length + ", na=" + na.length + ", total=" + all.length);

    const expected = [
      "gv_ai_governance", "wp_ai_capability_building", "ee_workforce_ai_comms",
      "ta_jd_optimization", "ta_bias_monitoring", "wp_ai_capability_advanced",
      "fw_shift_scheduling_ai", "fw_frontline_communication", "ta_candidate_chatbot",
      "hr_virtual_assistant", "ee_recognition_rewards", "ta_video_interview_assessment",
    ];
    console.log("\n=== SPEC EXPECTED vs ACTUAL ===");
    expected.forEach(id => {
      const item = all.find((i: any) => i.id === id);
      const status = item ? (item.fitStatus + " (" + item.fitScore + ")") : "NOT FOUND";
      const match = item && ["STRONG","STRONG_FIT"].includes(item.fitStatus) ? "PASS" : "FAIL";
      console.log("  " + match + " | " + id.padEnd(40) + " | " + status);
    });

    const fwShift = all.find((i: any) => i.id === "fw_shift_scheduling_ai");
    const fwComms = all.find((i: any) => i.id === "fw_frontline_communication");
    console.log("\n=== FRONTLINE CHECK ===");
    console.log("  fw_shift_scheduling_ai:     fitStatus=" + fwShift?.fitStatus + ", fitScore=" + fwShift?.fitScore + ", phase=" + fwShift?.phase);
    console.log("  fw_frontline_communication: fitStatus=" + fwComms?.fitStatus + ", fitScore=" + fwComms?.fitScore + ", phase=" + fwComms?.phase);
  });
});
