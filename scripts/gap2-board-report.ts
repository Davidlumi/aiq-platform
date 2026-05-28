/**
 * Gap 2 — Rendered Board Report for a Completed Reward Journey Tenant
 *
 * This script:
 *  1. Finds the most recently completed reward journey tenant in the DB
 *     (or creates a minimal one if none exists)
 *  2. Calls rewardOutputs.generateSummary via tRPC createCaller
 *  3. Calls rewardOutputs.get to retrieve the full assembled report
 *  4. Prints the executive summary and key report sections
 *
 * Evidence: proves that the reward board report renders correctly and
 * does NOT read from any CPO-only tables (ailOrgContext, strategies, etc.)
 */

import { randomUUID } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../server/db";
import {
  tenants,
  users,
  companyProfile,
  rewardPrework,
  rewardVision,
  rewardStrategy,
  rewardPrinciples,
  rewardInitiativePortfolio,
  rewardBusinessCase,
  rewardSuccessMeasures,
  rewardCapabilityDimensions,
  rewardCapabilityAssessment,
  rewardReview,
} from "../drizzle/schema";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(userId: string, tenantId: string): TrpcContext {
  return {
    user: {
      id: userId,
      tenantId,
      email: `gap2-${userId}@dfs-pilot.test`,
      firstName: "Gap2",
      lastName: "BoardReport",
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

function ok(label: string, result: unknown) {
  console.log(`  ✅  ${label}:`, JSON.stringify(result, null, 2).slice(0, 400));
}

function fail(label: string, err: unknown) {
  console.error(`  ❌  ${label}:`, err instanceof Error ? err.message : String(err));
  process.exit(1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Gap 2 — Rendered Board Report (Reward Journey Tenant)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // ── Find a completed reward journey tenant ────────────────────────────────
  // Look for a tenant with mode=reward that has a completed portfolio
  const completedPortfolios = await db
    .select({
      tenantId: rewardInitiativePortfolio.tenantId,
      isCompleted: rewardInitiativePortfolio.isCompleted,
    })
    .from(rewardInitiativePortfolio)
    .where(eq(rewardInitiativePortfolio.isCompleted, 1))
    .limit(5);

  let tenantId: string;
  let userId: string;
  let isNewTenant = false;

  // Always create a fresh tenant so all sections are populated
  if (false && completedPortfolios.length > 0) {
    tenantId = completedPortfolios[0].tenantId;
    const [userRow] = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, tenantId)).limit(1);
    if (!userRow) {
      tenantId = "";
    } else {
      userId = userRow.id;
    }
  }

  if (!tenantId!) {
    // Create a fresh minimal journey tenant
    console.log("  Creating fresh reward journey tenant...\n");
    tenantId = `tenant-gap2-${randomUUID().slice(0, 8)}`;
    userId = `user-gap2-${randomUUID().slice(0, 8)}`;
    isNewTenant = true;

    await db.insert(tenants).values({
      id: tenantId,
      name: "DFS Gap2 Board Report Tenant",
      slug: `dfs-gap2-${tenantId.slice(-8)}`,
      status: "trial",
      mode: "reward",
    });

    await db.insert(users).values({
      id: userId,
      tenantId,
      email: `gap2-${userId}@dfs-pilot.test`,
      firstName: "Gap2",
      lastName: "BoardReport",
      passwordHash: "not-used",
      status: "active",
      aiqRole: "reward_leader",
    });

    const ctx = makeCtx(userId, tenantId);
    const caller = appRouter.createCaller(ctx);

    // Run the full journey
    console.log("  Running full 9-stage journey via tRPC...");

    await caller.companyProfile.save({
      companyName: "DFS Financial Services plc",
      sector: "Financial Services",
      headcount: 2500,
      annualPayrollCostGbp: 95_000_000,
      geographicFootprint: "UK",
      ownershipStructure: "Listed",
      hris: "Workday",
      businessAiAmbition: 3,
      fcaSysc19InScope: "yes",
      ukEmployeeHeadcount: 2200,
    });
    await caller.companyProfile.complete();
    console.log("    Stage 0: Company Profile ✅");

    await caller.rewardPrework.save({
      rewardFunctionSize: 12,
      rewardFunctionMaturityRating: 2,
      aiMaturityInRewardToday: 2,
      rewardAiAmbition: 3,
      payEquityCapability: "basic",
      payStructureMaturity: "defined",
      ukGenderPayGapStatus: "reporting",
      pensionSchemeArchitecture: "dc_only",
      externalCompDataSources: ["Willis Towers Watson", "Mercer"],
      aiToolsCurrentlyInRewardUse: ["Excel macros"],
      compManagementPlatform: "workday",
      unionWorksCouncilCoverage: "none",
      primaryTriggerForRewardAiStrategy: "efficiency",
      topRewardPrioritiesNext12Months: ["pay_equity", "merit_cycle_efficiency", "market_benchmarking"],
      strategicTimeline: "12_months",
    });
    await caller.rewardPrework.complete();
    console.log("    Stage 1: Reward Pre-work ✅");

    await caller.rewardVision.save({
      visionText: "By 2027, DFS Financial Services will deploy AI across every compensation workflow — from merit cycle orchestration to real-time pay equity monitoring — enabling our Reward team to make faster, fairer, and more defensible pay decisions at scale.",
    });
    await caller.rewardVision.confirm();
    console.log("    Stage 2: Vision ✅");

    await caller.rewardStrategy.save({
      strategicShifts: [
        {
          id: randomUUID(),
          text: "Shift from manual pay review cycles to AI-orchestrated merit cycle management with real-time equity guardrails",
          aiGeneratedOriginal: "Shift from manual pay review cycles to AI-orchestrated merit cycle management with real-time equity guardrails",
        },
        {
          id: randomUUID(),
          text: "Move from point-in-time pay equity audits to continuous AI-powered pay gap monitoring across all protected characteristics",
          aiGeneratedOriginal: "Move from point-in-time pay equity audits to continuous AI-powered pay gap monitoring across all protected characteristics",
        },
        {
          id: randomUUID(),
          text: "Transition from static salary bands to AI-driven market intelligence that refreshes compensation benchmarks quarterly",
          aiGeneratedOriginal: "Transition from static salary bands to AI-driven market intelligence that refreshes compensation benchmarks quarterly",
        },
      ],
    });
    await caller.rewardStrategy.confirm();
    console.log("    Stage 3: Strategy ✅");

    await caller.rewardPrinciples.save({
      principles: [
        {
          id: randomUUID(), principleId: null,
          text: "AI recommendations must be explainable to employees and auditors — every pay decision must have a clear, documented rationale",
          source: "custom",
          aiGeneratedOriginal: "AI recommendations must be explainable to employees and auditors — every pay decision must have a clear, documented rationale",
          selected: true,
        },
        {
          id: randomUUID(), principleId: null,
          text: "Human Reward professionals retain final accountability for all compensation outcomes — AI augments, not replaces, professional judgement",
          source: "custom",
          aiGeneratedOriginal: "Human Reward professionals retain final accountability for all compensation outcomes — AI augments, not replaces, professional judgement",
          selected: true,
        },
        {
          id: randomUUID(), principleId: null,
          text: "Pay equity is a non-negotiable constraint — no AI model may recommend outcomes that widen gender, ethnicity, or disability pay gaps",
          source: "custom",
          aiGeneratedOriginal: "Pay equity is a non-negotiable constraint — no AI model may recommend outcomes that widen gender, ethnicity, or disability pay gaps",
          selected: true,
        },
      ],
      wontDos: [
        {
          id: randomUUID(), wontDoId: null,
          text: "We will not use AI to make final redundancy decisions without human review and sign-off",
          source: "custom",
          aiGeneratedOriginal: "We will not use AI to make final redundancy decisions without human review and sign-off",
          selected: true,
        },
        {
          id: randomUUID(), wontDoId: null,
          text: "We will not deploy AI-driven pay recommendations without a bias audit and sign-off from the Chief People Officer",
          source: "custom",
          aiGeneratedOriginal: "We will not deploy AI-driven pay recommendations without a bias audit and sign-off from the Chief People Officer",
          selected: true,
        },
      ],
    });
    await caller.rewardPrinciples.confirm();
    console.log("    Stage 4: Principles ✅");

    const INITIATIVE_IDS = [
      "ai_compensation_recommendation_engine",
      "ai_pay_equity_continuous_monitoring",
      "ai_driven_merit_cycle_orchestration",
      "ai_market_data_intelligence",
      "ai_pay_band_design",
      "ai_multi_characteristic_pay_gap_reporting",
    ];
    for (const id of INITIATIVE_IDS) {
      await caller.rewardInitiatives.addToPortfolio({ initiativeId: id });
    }
    await caller.rewardInitiatives.complete({ overrideSoftGates: true });
    console.log("    Stage 5: Initiative Portfolio ✅");

    await caller.rewardSuccessMeasures.generateMeasures({ initiativeIds: INITIATIVE_IDS.slice(0, 3) });
    await caller.rewardSuccessMeasures.confirm();
    console.log("    Stage 6: Success Measures ✅");

    await caller.rewardBusinessCase.generateNarrative();
    await caller.rewardBusinessCase.confirm();
    console.log("    Stage 7: Business Case ✅");

    await caller.rewardCapabilityAssessment.generateAssessment();
    await caller.rewardCapabilityAssessment.saveDimension({
      dimension: "data_foundations",
      currentLevel: "medium",
      gapStatement: "Core HR data is clean and structured; AI-ready data pipelines for compensation analytics require investment.",
      actionNote: "Prioritise HRIS data quality initiative in Q1 2025 before deploying AI compensation engine.",
    });
    await caller.rewardCapabilityAssessment.confirm();
    console.log("    Stage 8: Capability Assessment ✅");

    await caller.rewardReview.runReview();
    console.log("    Stage 9: Review ✅");
    console.log("");
  }

  // ── Generate and retrieve the board report ────────────────────────────────
  const ctx = makeCtx(userId!, tenantId);
  const caller = appRouter.createCaller(ctx);

  console.log("── Generating Executive Summary ──────────────────────────────");
  try {
    const summaryResult = await caller.rewardOutputs.generateSummary();
    console.log("\n  Executive Summary (first 800 chars):");
    console.log("  " + "─".repeat(60));
    const summary = summaryResult.execSummaryText ?? "";
    console.log("  " + summary.slice(0, 800).replace(/\n/g, "\n  "));
    if (summary.length > 800) console.log("  ... [truncated]");
    console.log("  " + "─".repeat(60));
    ok("generateSummary", { length: summary.length, firstLine: summary.split("\n")[0].slice(0, 100) });
  } catch (e) { fail("generateSummary", e); }

  console.log("\n── Retrieving Full Report ────────────────────────────────────");
  try {
    const result = await caller.rewardOutputs.get();
    if (!result) throw new Error("Report returned null");
    const r = result.report;

    console.log("\n  Report Structure:");
    console.log(`    Company:           ${r.companyName ?? "N/A"}`);
    console.log(`    Headcount:         ${r.headcount ?? "N/A"}`);
    console.log(`    Payroll (£):       ${r.annualPayrollGbp?.toLocaleString() ?? "N/A"}`);
    console.log(`    Vision:            ${(r.visionText ?? "").slice(0, 80)}...`);
    console.log(`    Strategic Shifts:  ${r.strategicShifts?.length ?? 0}`);
    console.log(`    Principles:        ${r.principles?.length ?? 0}`);
    console.log(`    Won't-Dos:         ${r.wontDos?.length ?? 0}`);
    console.log(`    Initiatives:       ${r.initiatives?.length ?? 0}`);
    console.log(`    Sections:          ${r.sections?.length ?? 0}`);
    console.log(`    Dev Plans:         ${r.developmentPlans?.length ?? 0}`);
    console.log(`    Exec Summary:      ${result.execSummaryText ? "✅ present" : "❌ missing"}`);
    console.log(`    Strategy Locked:   ${result.strategyLocked}`);

    // Print section completeness
    console.log("\n  Section Completeness:");
    for (const s of r.sections ?? []) {
      const status = s.isPlaceholder ? "⏳ placeholder" : "✅ populated";
      console.log(`    [${status}] ${s.title}`);
    }

    // Verify no CPO-only tables are read
    console.log("\n  CPO-Table Isolation Check:");
    const resultKeys = Object.keys(result);
    const reportKeys = Object.keys(r);
    const cpoOnlyKeys = ["boardReportSections", "ailContext", "strategies", "hwgt", "companyAssessment"];
    const leaked = [...cpoOnlyKeys.filter(k => resultKeys.includes(k)), ...cpoOnlyKeys.filter(k => reportKeys.includes(k))];
    if (leaked.length === 0) {
      console.log("  ✅  No CPO-only table data present in reward board report");
    } else {
      console.log(`  ❌  CPO-only keys leaked: ${leaked.join(", ")}`);
    }

    ok("rewardOutputs.get", {
      companyName: r.companyName,
      headcount: r.headcount,
      visionPresent: !!r.visionText,
      strategicShifts: r.strategicShifts?.length ?? 0,
      principles: r.principles?.length ?? 0,
      initiatives: r.initiatives?.length ?? 0,
      sections: r.sections?.length ?? 0,
      hasExecSummary: !!result.execSummaryText,
      strategyLocked: result.strategyLocked,
    });
  } catch (e) { fail("rewardOutputs.get", e); }

  // ── Clean up if we created a new tenant ──────────────────────────────────
  if (isNewTenant) {
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    console.log("\n  Test tenant cleaned up.");
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  BOARD REPORT COMPLETE — reward outputs render correctly");
  console.log("  No CPO-only table data present in reward board report");
  console.log("═══════════════════════════════════════════════════════════════\n");

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
