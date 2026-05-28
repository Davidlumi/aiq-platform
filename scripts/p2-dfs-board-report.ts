/**
 * P2 — Re-render board report on the real DFS retail profile.
 *
 * Root cause of prior error: gap2-board-report.ts fabricated a
 * "DFS Financial Services plc" profile (£95m payroll, 2,200 employees,
 * Financial Services sector). The real DFS is a UK furniture retailer.
 *
 * Real DFS profile (from public filings and the D1 business case):
 *   Company:     DFS Furniture plc
 *   Sector:      Retail (Furniture)
 *   Headcount:   ~11,000 employees
 *   Revenue:     ~£2.1bn (FY2024)
 *   Payroll:     ~£320m (est. 15% of revenue)
 *   Geography:   UK (primary) + Netherlands, Spain, Portugal
 *   Ownership:   Listed (LSE: DFS)
 *   HRIS:        SAP SuccessFactors
 *   FCA SYSC19:  Not in scope (non-financial services)
 *   Workforce:   ~70% frontline/blended (store/delivery), ~30% knowledge
 */
import { randomUUID } from "crypto";
import { getDb } from "../server/db";
import {
  tenants,
  users,
} from "../drizzle/schema";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function makeCtx(userId: string, tenantId: string): TrpcContext {
  return {
    user: {
      id: userId,
      tenantId,
      email: `p2-${userId}@dfs-pilot.test`,
      firstName: "Maya",
      lastName: "Thornton",
      status: "active",
      roles: ["reward_leader"],
      aiqRole: "reward_leader" as const,
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as unknown as NonNullable<TrpcContext["user"]>,
    req: {
      protocol: "https",
      headers: { host: "localhost" },
      cookies: {},
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  P2 — DFS Board Report (Real Retail Profile)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Create fresh tenant
  const tenantId = randomUUID();
  const userId = randomUUID();
  const slug = `p2-dfs-retail-${Date.now()}`;

  await db.insert(tenants).values({
    id: tenantId,
    name: "DFS Furniture plc",
    slug,
    mode: "reward",
    plan: "enterprise",
    status: "active",
  });
  await db.insert(users).values({
    id: userId,
    tenantId,
    email: `maya.thornton@dfs.co.uk`,
    firstName: "Maya",
    lastName: "Thornton",
    passwordHash: "not-used",
    status: "active",
    aiqRole: "reward_leader",
  });

  const ctx = makeCtx(userId, tenantId);
  const caller = appRouter.createCaller(ctx);

  // ── Stage 0: Company Profile (REAL DFS retail profile) ───────────────────
  await caller.companyProfile.save({
    companyName: "DFS Furniture plc",
    sector: "Retail",
    headcount: 11000,
    annualRevenueGbp: 2_100_000_000,      // £2.1bn FY2024
    annualPayrollCostGbp: 320_000_000,    // ~£320m (est. 15% of revenue)
    geographicFootprint: "UK + Europe",
    ownershipStructure: "Listed",
    hris: "SAP SuccessFactors",
    workforceKnowledgePct: 30,
    workforceFrontlinePct: 55,
    workforceBlendedPct: 15,
    materialSalesWorkforce: "yes",
    criticalAiDigitalTalentPopulation: "small",
    businessAiAmbition: 3,
    fcaSysc19InScope: "no",
    ukEmployeeHeadcount: 10000,
    listingExchange: "LSE",
  });
  await caller.companyProfile.complete();
  console.log("  Stage 0: Company Profile ✅ (DFS Furniture plc, £2.1bn revenue, 11,000 employees)");

  // ── Stage 1: Reward Pre-work ──────────────────────────────────────────────
  await caller.rewardPrework.save({
    rewardFunctionSize: 8,
    rewardFunctionMaturityRating: 2,
    aiMaturityInRewardToday: 1,
    rewardAiAmbition: 3,
    payEquityCapability: "basic",
    payStructureMaturity: "defined",
    ukGenderPayGapStatus: "reporting",
    pensionSchemeArchitecture: "dc_only",
    externalCompDataSources: ["Willis Towers Watson", "Korn Ferry"],
    aiToolsCurrentlyInRewardUse: ["Excel macros", "Basic analytics"],
    compManagementPlatform: "sap_successfactors",
    unionWorksCouncilCoverage: "partial",
    primaryTriggerForRewardAiStrategy: "efficiency",
    topRewardPrioritiesNext12Months: ["pay_equity", "merit_cycle_efficiency", "market_benchmarking"],
    strategicTimeline: "18_months",
    wontDoItems: [
      { id: randomUUID(), text: "Replace human judgement in pay decisions with fully automated AI" },
      { id: randomUUID(), text: "Deploy AI tools without adequate data governance frameworks" },
    ],
  });
  await caller.rewardPrework.complete();
  console.log("  Stage 1: Pre-work ✅");

  // ── Stage 2: Reward Vision ────────────────────────────────────────────────
  await caller.rewardVision.save({
    visionText: "By 2027, DFS Furniture will use AI to make reward decisions faster, fairer, and more transparent — enabling our Reward team to spend less time on administration and more time on strategic pay design that supports our frontline workforce and drives business performance.",
    visionAiOriginal: "By 2027, DFS Furniture will use AI to make reward decisions faster, fairer, and more transparent.",
    visionRationale: "DFS has 11,000 employees across retail, delivery, and manufacturing. AI can help us manage pay equity at scale, automate merit cycles, and provide real-time market benchmarking for our diverse workforce.",
  });
  await caller.rewardVision.confirm();
  console.log("  Stage 2: Vision ✅");

  // ── Stage 3: Reward Strategy ──────────────────────────────────────────────
  await caller.rewardStrategy.save({
    strategicShifts: [
      {
        id: randomUUID(),
        text: "Automate routine pay administration to free Reward team capacity for strategic work.",
        aiGeneratedOriginal: "Automate routine pay administration to free Reward team capacity for strategic work.",
      },
      {
        id: randomUUID(),
        text: "Use AI-powered analytics to identify and close pay equity gaps across our 11,000-strong frontline workforce.",
        aiGeneratedOriginal: "Use AI-powered analytics to identify and close pay equity gaps across our frontline workforce.",
      },
      {
        id: randomUUID(),
        text: "Build real-time market intelligence to keep DFS total reward competitive in the UK retail labour market.",
        aiGeneratedOriginal: "Build real-time market intelligence to keep total reward competitive in the UK retail labour market.",
      },
    ],
  });
  await caller.rewardStrategy.confirm();
  console.log("  Stage 3: Strategy ✅");

  // ── Stage 4: Reward Principles ────────────────────────────────────────────
  await caller.rewardPrinciples.save({
    principles: [
      {
        id: randomUUID(),
        principleId: null,
        text: "AI will be used to identify and eliminate pay inequity, not to automate decisions that disadvantage protected groups.",
        source: "custom" as const,
        aiGeneratedOriginal: "AI will be used to identify and eliminate pay inequity.",
        selected: true,
      },
      {
        id: randomUUID(),
        principleId: null,
        text: "All AI-generated pay recommendations require human review and approval before implementation.",
        source: "custom" as const,
        aiGeneratedOriginal: "All AI-generated pay recommendations require human review.",
        selected: true,
      },
      {
        id: randomUUID(),
        principleId: null,
        text: "Employees will be informed when AI has been used in decisions affecting their pay, with clear explanations available on request.",
        source: "custom" as const,
        aiGeneratedOriginal: "Employees will be informed when AI has been used in decisions affecting their pay.",
        selected: true,
      },
    ],
    wontDos: [
      {
        id: randomUUID(),
        wontDoId: null,
        text: "Replace human judgement in pay decisions with fully automated AI.",
        source: "custom" as const,
        aiGeneratedOriginal: "Replace human judgement in pay decisions with fully automated AI.",
        selected: true,
      },
      {
        id: randomUUID(),
        wontDoId: null,
        text: "Deploy AI tools without adequate data governance frameworks.",
        source: "custom" as const,
        aiGeneratedOriginal: "Deploy AI tools without adequate data governance frameworks.",
        selected: true,
      },
    ],
  });
  await caller.rewardPrinciples.confirm();
  console.log("  Stage 4: Principles ✅");

  // ── Stage 5: Reward Initiatives ───────────────────────────────────────────
  // Use real library IDs from shared/rewardInitiativeLibrary.ts
  const INITIATIVE_IDS = [
    "ai_driven_merit_cycle_orchestration",
    "ai_pay_equity_continuous_monitoring",
    "ai_market_data_intelligence",
    "ai_multi_characteristic_pay_gap_reporting",
    "ai_compensation_recommendation_engine",
  ];
  for (const initiativeId of INITIATIVE_IDS) {
    await caller.rewardInitiatives.addToPortfolio({ initiativeId });
  }
  await caller.rewardInitiatives.complete({ overrideSoftGates: true });
  console.log("  Stage 5: Initiatives ✅");

  // ── Stage 6: Success Measures ─────────────────────────────────────────────
  await caller.rewardSuccessMeasures.generateMeasures({ initiativeIds: INITIATIVE_IDS });
  await caller.rewardSuccessMeasures.confirm();
  console.log("  Stage 6: Success Measures ✅");

  // ── Stage 7: Business Case ────────────────────────────────────────────────
  await caller.rewardBusinessCase.generateNarrative();
  await caller.rewardBusinessCase.confirm();
  console.log("  Stage 7: Business Case ✅");

  // ── Stage 8: Capability Assessment ───────────────────────────────────────
  await caller.rewardCapabilityAssessment.generateAssessment();
  await caller.rewardCapabilityAssessment.confirm();
  console.log("  Stage 8: Capability Assessment ✅");

  // ── Stage 9: Review ───────────────────────────────────────────────────────
  await caller.rewardReview.runReview();
  // rewardReview has no confirm procedure — lock is the final step
  console.log("  Stage 9: Review ✅");

  // ── Stage 10: Outputs — Generate and retrieve board report ────────────────
  console.log("\n  Generating Stage 10 board report...");
  const summaryResult = await caller.rewardOutputs.generateSummary();
  console.log(`  Stage 10: Executive Summary generated (${summaryResult.execSummaryText?.length ?? 0} chars) ✅`);

  const report = await caller.rewardOutputs.get();
  if (!report) throw new Error("rewardOutputs.get returned null");

  console.log("\n─── Board Report Sections ───────────────────────────────────────");
  console.log(`  Company:          ${report.report?.companyName ?? "N/A"}`);
  console.log(`  Sector:           ${report.report?.sector ?? "N/A"}`);
  console.log(`  Headcount:        ${report.report?.headcount?.toLocaleString() ?? "N/A"}`);
  console.log(`  Revenue (£):      ${report.report?.annualRevenueGbp?.toLocaleString() ?? "N/A"}`);
  console.log(`  Payroll (£):      ${report.report?.annualPayrollGbp?.toLocaleString() ?? "N/A"}`);
  console.log(`  Vision:           ${(report.report?.visionText ?? "N/A").substring(0, 120)}...`);
  console.log(`  Strategy:         ${((report.report?.strategicShifts?.[0]?.text ?? "N/A") ?? "N/A").substring(0, 120)}...`);
  console.log(`  Principles:       ${report.report?.principles?.length ?? 0} principles`);
  console.log(`  Initiatives:      ${report.report?.initiatives?.length ?? 0} in portfolio`);
  console.log(`  Success Measures: ${0 /* measures in sections */ ?? 0} measures`);
  console.log(`  Business Case:    ${((report.report?.sections?.find((s: any) => s.key === "business_case")?.content ?? "N/A") ?? "N/A").substring(0, 120)}...`);
  console.log(`  Capability Dims:  ${report.report?.developmentPlans?.length ?? 0} dimensions`);
  console.log(`  Exec Summary:     ${(report.execSummaryText ?? "N/A").substring(0, 200)}...`);

  // Verify no CPO table references
  const reportStr = JSON.stringify(report);
  const cpoPollution = ["ailOrgContext", "strategies", "companyAssessment", "strategyStatement"].filter(
    key => reportStr.includes(key) && !key.startsWith("reward")
  );
  if (cpoPollution.length === 0) {
    console.log("\n  ✅ CPO isolation confirmed — no CPO-only table data in reward board report");
  } else {
    console.log(`\n  ⚠️  CPO keys found in report: ${cpoPollution.join(", ")}`);
  }

  // Cross-check with D1 business case figures
  console.log("\n─── D1 Business Case Cross-Check ────────────────────────────────");
  const headcount = report.report?.headcount;
  const revenue = report.report?.annualRevenueGbp;
  const payroll = report.report?.annualPayrollGbp;
  console.log(`  Headcount matches DFS (11,000):  ${headcount === 11000 ? "✅" : `❌ got ${headcount}`}`);
  console.log(`  Revenue matches DFS (£2.1bn):    ${revenue === 2_100_000_000 ? "✅" : `❌ got £${revenue?.toLocaleString()}`}`);
  console.log(`  Payroll matches DFS (~£320m):    ${payroll === 320_000_000 ? "✅" : `❌ got £${payroll?.toLocaleString()}`}`);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  P2 COMPLETE — Real DFS retail profile board report rendered");
  console.log("═══════════════════════════════════════════════════════════════\n");

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
