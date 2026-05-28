/**
 * P2 — Re-render board report on the real DFS retail profile.
 *
 * Root cause of prior error: gap2-board-report.ts fabricated a
 * "DFS Financial Services plc" profile (£95m payroll, 2,200 employees,
 * Financial Services sector). The real DFS is a UK furniture retailer.
 *
 * REMEDIATION (28 May 2026, Fix 1 P0):
 *   The original P2 script used wrong figures (~2× off reality on all three
 *   key metrics). Figures now sourced from shared/dfsProfileConstants.ts
 *   which carries source + as_of metadata per the Governing Principle.
 *
 * Corrected DFS profile (source: shared/dfsProfileConstants.ts):
 *   Company:     DFS Furniture plc
 *   Sector:      Retail (sofas & upholstered furniture; brands DFS, Sofology)
 *   Headcount:   ~4,503 (DFS corporate site, 'About us', 2026-05-28)
 *   Revenue:     ~£1.0bn statutory / ~£1.39bn brand (LSE / Wikipedia, 2026-05-28)
 *   Payroll:     DFS-provided (not public) — placeholder = 0 until client supplies
 *   Geography:   UK (primary) + Netherlands, Spain, Portugal
 *   Ownership:   Listed (LSE: DFS)
 *   HRIS:        SAP SuccessFactors
 *   FCA SYSC19:  Not in scope (non-financial services)
 *
 * Original wrong figures (for reference):
 *   Headcount: 11,000 (~2.4× too high)
 *   Revenue:   £2.1bn (~2.1× too high)
 *   Payroll:   £320m (~£71k/head — implausible for UK furniture retail)
 */
import { randomUUID } from "crypto";
import { getDb } from "../server/db";
import {
  tenants,
  users,
} from "../drizzle/schema";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import {
  DFS_HEADCOUNT,
  DFS_HEADCOUNT_SOURCE,
  DFS_HEADCOUNT_AS_OF,
  DFS_REVENUE_STATUTORY_GBP,
  DFS_REVENUE_STATUTORY_SOURCE,
  DFS_REVENUE_STATUTORY_AS_OF,
  DFS_PAYROLL_GBP_PLACEHOLDER,
  DFS_PAYROLL_SOURCE,
  DFS_SANITY,
} from "../shared/dfsProfileConstants";

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
  console.log("  P2 — DFS Board Report (Corrected Retail Profile)");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log(`  Headcount:  ${DFS_HEADCOUNT.toLocaleString()} (source: ${DFS_HEADCOUNT_SOURCE}, as_of: ${DFS_HEADCOUNT_AS_OF})`);
  console.log(`  Revenue:    £${(DFS_REVENUE_STATUTORY_GBP / 1e9).toFixed(2)}bn statutory (source: ${DFS_REVENUE_STATUTORY_SOURCE}, as_of: ${DFS_REVENUE_STATUTORY_AS_OF})`);
  console.log(`  Payroll:    ${DFS_PAYROLL_GBP_PLACEHOLDER === 0 ? "⚠️  placeholder (0) — replace with DFS-provided figure" : `£${DFS_PAYROLL_GBP_PLACEHOLDER.toLocaleString()}`}`);
  console.log(`  Payroll source: ${DFS_PAYROLL_SOURCE}`);

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

  // ── Stage 0: Company Profile (corrected DFS retail profile) ──────────────
  await caller.companyProfile.save({
    companyName: "DFS Furniture plc",
    sector: "Retail",
    headcount: DFS_HEADCOUNT,                          // ~4,503 (DFS corporate site, 2026-05-28)
    annualRevenueGbp: DFS_REVENUE_STATUTORY_GBP,        // ~£1.0bn statutory (LSE, 2026-05-28)
    annualPayrollCostGbp: DFS_PAYROLL_GBP_PLACEHOLDER,  // 0 — must be replaced with DFS-provided figure
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
    ukEmployeeHeadcount: Math.round(DFS_HEADCOUNT * 0.95), // ~4,278 UK (est. 95% of total)
    listingExchange: "LSE",
  });
  await caller.companyProfile.complete();
  console.log(`\n  Stage 0: Company Profile ✅ (DFS Furniture plc, £${(DFS_REVENUE_STATUTORY_GBP / 1e9).toFixed(2)}bn revenue, ${DFS_HEADCOUNT.toLocaleString()} employees)`);

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
    visionRationale: `DFS has approximately ${DFS_HEADCOUNT.toLocaleString()} employees across retail, delivery, and manufacturing. AI can help us manage pay equity at scale, automate merit cycles, and provide real-time market benchmarking for our diverse workforce.`,
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
        text: `Use AI-powered analytics to identify and close pay equity gaps across our ${DFS_HEADCOUNT.toLocaleString()}-strong frontline workforce.`,
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

  // ── Non-tautological cross-check ─────────────────────────────────────────
  // Validates against recorded source values (not echoed inputs).
  // Governing Principle: Remediation Brief Fix 1 P0, 28 May 2026.
  // These are sanity-check bounds (±25% of public floor), not acceptance criteria.
  console.log("\n─── Source-Cited Cross-Check (non-tautological) ─────────────────");
  const headcount = report.report?.headcount;
  const revenue = report.report?.annualRevenueGbp;
  const payroll = report.report?.annualPayrollGbp;

  const headcountOk = headcount !== undefined
    && headcount >= DFS_SANITY.headcount.min
    && headcount <= DFS_SANITY.headcount.max;
  const revenueOk = revenue !== undefined
    && revenue >= DFS_SANITY.revenueStatutoryGbp.min
    && revenue <= DFS_SANITY.revenueStatutoryGbp.max;

  console.log(`  Headcount within sanity bounds (${DFS_SANITY.headcount.min.toLocaleString()}–${DFS_SANITY.headcount.max.toLocaleString()}): ${headcountOk ? "✅" : `❌ got ${headcount}`}`);
  console.log(`    Source: ${DFS_HEADCOUNT_SOURCE} (as_of: ${DFS_HEADCOUNT_AS_OF})`);
  console.log(`  Revenue within sanity bounds (£${(DFS_SANITY.revenueStatutoryGbp.min / 1e9).toFixed(2)}bn–£${(DFS_SANITY.revenueStatutoryGbp.max / 1e9).toFixed(2)}bn): ${revenueOk ? "✅" : `❌ got £${revenue?.toLocaleString()}`}`);
  console.log(`    Source: ${DFS_REVENUE_STATUTORY_SOURCE} (as_of: ${DFS_REVENUE_STATUTORY_AS_OF})`);
  console.log(`  Payroll: ${payroll === 0 || payroll === null || payroll === undefined ? "⚠️  placeholder (0) — replace with DFS-provided figure" : `£${payroll.toLocaleString()}`}`);
  console.log(`    Source: ${DFS_PAYROLL_SOURCE}`);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  P2 COMPLETE — Corrected DFS retail profile board report rendered");
  console.log("═══════════════════════════════════════════════════════════════\n");

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
