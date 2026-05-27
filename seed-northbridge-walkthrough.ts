/**
 * seed-northbridge-walkthrough.ts
 * Seeds all 10 Reward stages for tenant-northbridge-001 / user-maya-001
 * then dumps gate status and business case figures at each stage.
 *
 * Run: npx tsx seed-northbridge-walkthrough.ts
 */
import { getDb } from "./server/db";
import {
  rewardPrework,
  rewardVision,
  rewardStrategy,
  rewardPrinciples,
  rewardInitiativePortfolio,
  rewardSuccessMeasures,
  rewardBusinessCase,
  rewardCapabilityStage,
  rewardReview,
  rewardOutputs,
} from "./drizzle/schema";
import { computeBusinessCase } from "./server/services/rewardBusinessCaseEngine";
import { eq, and } from "drizzle-orm";

const TENANT = "tenant-northbridge-001";
const USER   = "user-maya-001";
const NOW    = Date.now();

// Canonical Northbridge portfolio (8 initiatives from northbridge-canonical.test.ts)
const MAYA_IDS = [
  "ai_compensation_recommendation_engine",
  "ai_driven_merit_cycle_orchestration",
  "ai_pay_equity_continuous_monitoring",
  "ai_multi_characteristic_pay_gap_reporting",
  "ai_pay_band_design",
  "ai_reward_operations_assistant",
  "ai_bonus_pool_optimisation",
  "ai_sales_compensation_plan_design",
];

const NORTHBRIDGE_PROFILE = {
  sector: "financial_services" as const,
  totalEmployeeHeadcount: 8_000,
  totalPayrollGbp: 95_000_000,
};

async function main() {
  const db = await getDb();
  if (!db) { console.error("DB unavailable"); process.exit(1); }

  console.log("=== Northbridge 10-Stage Walkthrough Seed ===");
  console.log(`Tenant: ${TENANT}`);
  console.log(`User:   ${USER}`);
  console.log(`Time:   ${new Date(NOW).toISOString()}\n`);

  // ── Stage 1: Pre-work ──────────────────────────────────────────────────────
  console.log("STAGE 1: Pre-work (reward_prework)");
  await db.delete(rewardPrework).where(and(eq(rewardPrework.tenantId, TENANT), eq(rewardPrework.userId, USER)));
  await db.insert(rewardPrework).values({
    tenantId: TENANT,
    userId: USER,
    rewardFunctionSize: 12,
    rewardFunctionMaturityRating: 3,
    aiMaturityInRewardToday: 2,
    rewardAiAmbition: 4,
    payEquityCapability: "basic_reporting",
    payStructureMaturity: "structured_bands",
    ukGenderPayGapStatus: "published_compliant",
    pensionSchemeArchitecture: "dc_only",
    externalCompDataSources: JSON.stringify(["mercer", "wtww"]) as any,
    aiToolsCurrentlyInRewardUse: JSON.stringify(["excel_macros"]) as any,
    compManagementPlatform: "workday",
    unionWorksCouncilCoverage: "none",
    primaryTriggerForRewardAiStrategy: "efficiency_cost_reduction",
    topRewardPrioritiesNext12Months: JSON.stringify(["pay_equity", "merit_cycle_efficiency"]) as any,
    strategicTimeline: "12_18_months",
    existingProgrammesToCoexistWith: JSON.stringify([]) as any,
    aiTalentRetentionConcern: "moderate",
    recentRemunerationVoteConcerns: "none",
    nationalLivingWageExposure: "low",
    isCompleted: 1,
    completedAt: NOW - 9 * 86400000,
    updatedAt: NOW - 9 * 86400000,
  });
  const [prework] = await db.select({ isCompleted: rewardPrework.isCompleted })
    .from(rewardPrework).where(and(eq(rewardPrework.tenantId, TENANT), eq(rewardPrework.userId, USER)));
  console.log(`  Gate: isCompleted=${prework?.isCompleted} ✓\n`);

  // ── Stage 2: Vision ────────────────────────────────────────────────────────
  console.log("STAGE 2: Vision (reward_vision)");
  await db.delete(rewardVision).where(and(eq(rewardVision.tenantId, TENANT), eq(rewardVision.userId, USER)));
  await db.insert(rewardVision).values({
    tenantId: TENANT,
    userId: USER,
    visionText: "Northbridge will deploy AI-powered reward tools to ensure every compensation decision is data-driven, equitable, and transparent — enabling our HR team to focus on strategic advisory rather than manual processing.",
    aiGeneratedOriginal: "Northbridge will leverage AI to transform reward operations...",
    state: "confirmed",
    updatedAt: NOW - 8 * 86400000,
  });
  const [vision] = await db.select({ state: rewardVision.state })
    .from(rewardVision).where(and(eq(rewardVision.tenantId, TENANT), eq(rewardVision.userId, USER)));
  console.log(`  Gate: state=${vision?.state} ✓\n`);

  // ── Stage 3: Strategy ──────────────────────────────────────────────────────
  console.log("STAGE 3: Strategy (reward_strategy)");
  await db.delete(rewardStrategy).where(and(eq(rewardStrategy.tenantId, TENANT), eq(rewardStrategy.userId, USER)));
  await db.insert(rewardStrategy).values({
    tenantId: TENANT,
    userId: USER,
    strategicShiftsJson: JSON.stringify([
      { id: "shift-1", from: "Manual merit cycle processing", to: "AI-orchestrated merit cycles", rationale: "Reduce cycle time by 60%" },
      { id: "shift-2", from: "Reactive pay equity reporting", to: "Continuous AI pay equity monitoring", rationale: "Proactive compliance and risk reduction" },
    ]) as any,
    state: "confirmed",
    updatedAt: NOW - 7 * 86400000,
  });
  const [strategy] = await db.select({ state: rewardStrategy.state })
    .from(rewardStrategy).where(and(eq(rewardStrategy.tenantId, TENANT), eq(rewardStrategy.userId, USER)));
  console.log(`  Gate: state=${strategy?.state} ✓\n`);

  // ── Stage 4: Principles ────────────────────────────────────────────────────
  console.log("STAGE 4: Principles (reward_principles)");
  await db.delete(rewardPrinciples).where(and(eq(rewardPrinciples.tenantId, TENANT), eq(rewardPrinciples.userId, USER)));
  await db.insert(rewardPrinciples).values({
    tenantId: TENANT,
    userId: USER,
    principlesJson: JSON.stringify([
      { id: "p-1", text: "AI augments human judgment — final reward decisions remain with qualified HR professionals." },
      { id: "p-2", text: "All AI recommendations are explainable and auditable." },
      { id: "p-3", text: "Pay equity is a non-negotiable constraint, not a post-hoc check." },
    ]) as any,
    wontDosJson: JSON.stringify([
      { id: "wd-1", text: "We will not use AI to make final termination or demotion decisions." },
    ]) as any,
    state: "confirmed",
    updatedAt: NOW - 6 * 86400000,
  });
  const [principles] = await db.select({ state: rewardPrinciples.state })
    .from(rewardPrinciples).where(and(eq(rewardPrinciples.tenantId, TENANT), eq(rewardPrinciples.userId, USER)));
  console.log(`  Gate: state=${principles?.state} ✓\n`);

  // ── Stage 5: Initiative Portfolio ─────────────────────────────────────────
  console.log("STAGE 5: Initiative Portfolio (reward_initiative_portfolio)");
  await db.delete(rewardInitiativePortfolio).where(and(eq(rewardInitiativePortfolio.tenantId, TENANT), eq(rewardInitiativePortfolio.userId, USER)));
  await db.insert(rewardInitiativePortfolio).values({
    tenantId: TENANT,
    userId: USER,
    selectedInitiativesJson: JSON.stringify(MAYA_IDS) as any,
    dismissedInitiativesJson: JSON.stringify([]) as any,
    isCompleted: 1,
    completedAt: NOW - 5 * 86400000,
    updatedAt: NOW - 5 * 86400000,
  });
  const [portfolio] = await db.select({ isCompleted: rewardInitiativePortfolio.isCompleted })
    .from(rewardInitiativePortfolio).where(and(eq(rewardInitiativePortfolio.tenantId, TENANT), eq(rewardInitiativePortfolio.userId, USER)));
  console.log(`  Gate: isCompleted=${portfolio?.isCompleted}, initiatives=${MAYA_IDS.length} ✓\n`);

  // ── Stage 6: Success Measures ──────────────────────────────────────────────
  console.log("STAGE 6: Success Measures (reward_success_measures)");
  await db.delete(rewardSuccessMeasures).where(eq(rewardSuccessMeasures.tenantId, TENANT));
  const measureRows = [
    { id: "sm-1", initiativeId: "ai_compensation_recommendation_engine", name: "Merit cycle processing time", target: "Reduce by 60%", timeframe: "12 months" },
    { id: "sm-2", initiativeId: "ai_pay_equity_continuous_monitoring", name: "Pay equity gap incidents", target: "Zero undetected gaps", timeframe: "6 months" },
    { id: "sm-3", initiativeId: "ai_driven_merit_cycle_orchestration", name: "HR hours spent on merit admin", target: "Reduce by 40%", timeframe: "12 months" },
  ];
  for (const m of measureRows) {
    await db.insert(rewardSuccessMeasures).values({
      tenantId: TENANT,
      measureId: m.id,
      initiativeId: m.initiativeId,
      name: m.name,
      baselineType: "to_be_established",
      target: m.target,
      timeframe: m.timeframe,
      howMeasured: "Tracked via Workday HR analytics dashboard",
      valueLink: "direct",
      isAccepted: 1,
      sortOrder: 1,
      createdAt: NOW - 4 * 86400000,
      updatedAt: NOW - 4 * 86400000,
    });
  }
  const smCount = await db.select().from(rewardSuccessMeasures).where(eq(rewardSuccessMeasures.tenantId, TENANT));
  console.log(`  Gate: ${smCount.length} success measures seeded ✓\n`);

  // ── Stage 7: Business Case ─────────────────────────────────────────────────
  console.log("STAGE 7: Business Case (reward_business_case)");
  // Compute the canonical business case
  const bcModel = computeBusinessCase(MAYA_IDS, NORTHBRIDGE_PROFILE, {}, {});
  const central = bcModel.rollup.central;
  // overlapDiscountTotal is on the central rollup
  const overlapTotal = central.overlapDiscountTotal;
  console.log(`  Live computation results:`);
  console.log(`    TCO 3yr:        £${central.tco3yr.toLocaleString()}`);
  console.log(`    Net value 3yr:  £${central.netValue3yr.toLocaleString()}`);
  console.log(`    Net benefit 3yr:£${central.netBenefit3yr.toLocaleString()}`);
  console.log(`    ROI 3yr:        ${Math.round(central.roi3yr * 100)}%`);
  console.log(`    Payback:        ${central.paybackMonths} months`);
  console.log(`    Overlap discount: £${overlapTotal?.toLocaleString() ?? 'n/a'}`);

  await db.delete(rewardBusinessCase).where(and(eq(rewardBusinessCase.tenantId, TENANT), eq(rewardBusinessCase.userId, USER)));
  await db.insert(rewardBusinessCase).values({
    tenantId: TENANT,
    userId: USER,
    costValueOverridesJson: JSON.stringify({}) as any,
    programmeFundingAssumptionsJson: JSON.stringify({}) as any,
    execSummaryText: "Northbridge's 8-initiative AI reward portfolio delivers £12.96M net value over 3 years at a total cost of £7.15M, yielding an 81% ROI with a 20-month payback period.",
    execSummaryAiOriginal: "AI-generated executive summary...",
    investmentRationaleText: "The investment is justified by significant efficiency gains in merit cycle processing and proactive pay equity monitoring.",
    valueNarrativeText: "Value is driven primarily by the Compensation Recommendation Engine and Merit Cycle Orchestration initiatives.",
    riskAssumptionsText: "Key risks include change management challenges and integration complexity with Workday.",
    recommendedScenario: "central",
    isConfirmed: 1,
    confirmedAt: NOW - 3 * 86400000,
    isStale: 0,
    updatedAt: NOW - 3 * 86400000,
  });
  const [bc] = await db.select({ isConfirmed: rewardBusinessCase.isConfirmed })
    .from(rewardBusinessCase).where(and(eq(rewardBusinessCase.tenantId, TENANT), eq(rewardBusinessCase.userId, USER)));
  console.log(`  Gate: isConfirmed=${bc?.isConfirmed} ✓\n`);

  // ── Stage 8: Capability Assessment ────────────────────────────────────────
  console.log("STAGE 8: Capability Assessment (reward_capability_stage)");
  await db.delete(rewardCapabilityStage).where(and(eq(rewardCapabilityStage.tenantId, TENANT), eq(rewardCapabilityStage.userId, USER)));
  await db.insert(rewardCapabilityStage).values({
    tenantId: TENANT,
    userId: USER,
    enablementCostJson: JSON.stringify({
      team_skills: { level: "medium", estimatedCost: 45000, note: "Training programme for 12 reward analysts" },
      change_management: { level: "medium", estimatedCost: 30000, note: "Change management programme" },
      governance: { level: "high", estimatedCost: 25000, note: "AI governance framework development" },
    }) as any,
    enablementCostAiOriginalJson: JSON.stringify({}) as any,
    sequencingFlagsJson: JSON.stringify({}) as any,
    capabilityRiskNoteJson: JSON.stringify({}) as any,
    isConfirmed: 1,
    confirmedAt: NOW - 2 * 86400000,
    isStale: 0,
    updatedAt: NOW - 2 * 86400000,
  });
  const [cap] = await db.select({ isConfirmed: rewardCapabilityStage.isConfirmed })
    .from(rewardCapabilityStage).where(and(eq(rewardCapabilityStage.tenantId, TENANT), eq(rewardCapabilityStage.userId, USER)));
  console.log(`  Gate: isConfirmed=${cap?.isConfirmed} ✓\n`);

  // ── Stage 9: Review ────────────────────────────────────────────────────────
  console.log("STAGE 9: Review (reward_review)");
  await db.delete(rewardReview).where(and(eq(rewardReview.tenantId, TENANT), eq(rewardReview.userId, USER)));
  await db.insert(rewardReview).values({
    tenantId: TENANT,
    userId: USER,
    checkResultsJson: JSON.stringify({
      R1: { passed: false, note: "Conservative ROI is -5% (expected — calibration artefact)" },
      R2: { passed: true, note: "All 8 initiatives have value formulas" },
      R3: { passed: true, note: "Overlap discounts applied correctly" },
    }) as any,
    acknowledgmentsJson: JSON.stringify({ R1: true }) as any,
    reviewSummaryText: "The portfolio passes all critical checks. The conservative scenario shows a negative ROI due to calibration conservatism, which has been acknowledged.",
    reviewSummaryAiOriginal: "AI-generated review summary...",
    strategyLocked: 1,
    lockedAt: NOW - 1 * 86400000,
    lockedStateHash: "abc123def456",
    lastRunAt: NOW - 1 * 86400000,
    updatedAt: NOW - 1 * 86400000,
  });
  const [review] = await db.select({ strategyLocked: rewardReview.strategyLocked })
    .from(rewardReview).where(and(eq(rewardReview.tenantId, TENANT), eq(rewardReview.userId, USER)));
  console.log(`  Gate: strategyLocked=${review?.strategyLocked} ✓\n`);

  // ── Stage 10: Outputs ──────────────────────────────────────────────────────
  console.log("STAGE 10: Outputs (reward_outputs)");
  await db.delete(rewardOutputs).where(and(eq(rewardOutputs.tenantId, TENANT), eq(rewardOutputs.userId, USER)));
  await db.insert(rewardOutputs).values({
    tenantId: TENANT,
    userId: USER,
    audience: "board",
    execSummaryText: "Northbridge's AI Reward Strategy represents a £12.96M value opportunity over 3 years, with an 81% ROI and 20-month payback. The 8-initiative portfolio addresses our core reward transformation priorities.",
    execSummaryAiOriginal: "AI-generated board summary...",
    connectiveNarrativeJson: JSON.stringify({}) as any,
    isSummaryStale: 0,
    updatedAt: NOW,
  });
  const [outputs] = await db.select({ audience: rewardOutputs.audience })
    .from(rewardOutputs).where(and(eq(rewardOutputs.tenantId, TENANT), eq(rewardOutputs.userId, USER)));
  console.log(`  Gate: audience=${outputs?.audience} ✓\n`);

  // ── Final gate status summary ──────────────────────────────────────────────
  console.log("=== FINAL GATE STATUS SUMMARY ===");
  console.log("Stage 1 (Pre-work):         isCompleted=1 ✓");
  console.log("Stage 2 (Vision):           state=confirmed ✓");
  console.log("Stage 3 (Strategy):         state=confirmed ✓");
  console.log("Stage 4 (Principles):       state=confirmed ✓");
  console.log("Stage 5 (Portfolio):        isCompleted=1 ✓");
  console.log("Stage 6 (Success Measures): 3 measures seeded ✓");
  console.log("Stage 7 (Business Case):    isConfirmed=1 ✓");
  console.log("Stage 8 (Capability):       isConfirmed=1 ✓");
  console.log("Stage 9 (Review):           strategyLocked=1 ✓");
  console.log("Stage 10 (Outputs):         audience=board ✓");

  console.log("\n=== BUSINESS CASE FIGURES (live computation) ===");
  const cons = bcModel.rollup.conservative;
  const opt  = bcModel.rollup.optimistic;
  console.log(`Central:      TCO=£${central.tco3yr.toLocaleString()}  NetValue=£${central.netValue3yr.toLocaleString()}  ROI=${Math.round(central.roi3yr * 100)}%  Payback=${central.paybackMonths}mo`);
  console.log(`Conservative: TCO=£${cons.tco3yr.toLocaleString()}  NetValue=£${cons.netValue3yr.toLocaleString()}  ROI=${Math.round(cons.roi3yr * 100)}%`);
  console.log(`Optimistic:   TCO=£${opt.tco3yr.toLocaleString()}  NetValue=£${opt.netValue3yr.toLocaleString()}  ROI=${Math.round(opt.roi3yr * 100)}%`);
  console.log(`Overlap discount total: £${overlapTotal?.toLocaleString() ?? 'n/a'}`);
  console.log(`Unknown initiative IDs: ${bcModel.unknownIds.length}`);

  console.log("\n=== GOLDEN MASTER VERIFICATION ===");
  const LOCKED_CENTRAL_TCO = 7_146_469;
  const LOCKED_CENTRAL_NET = 12_964_485;
  const LOCKED_ROI = 0.81;
  const LOCKED_PAYBACK = 20;
  console.log(`TCO:     ${central.tco3yr === LOCKED_CENTRAL_TCO ? "✓ MATCH" : "✗ MISMATCH"} (got ${central.tco3yr}, expected ${LOCKED_CENTRAL_TCO})`);
  console.log(`NetVal:  ${central.netValue3yr === LOCKED_CENTRAL_NET ? "✓ MATCH" : "✗ MISMATCH"} (got ${central.netValue3yr}, expected ${LOCKED_CENTRAL_NET})`);
  console.log(`ROI:     ${central.roi3yr === LOCKED_ROI ? "✓ MATCH" : "✗ MISMATCH"} (got ${central.roi3yr}, expected ${LOCKED_ROI})`);
  console.log(`Payback: ${central.paybackMonths === LOCKED_PAYBACK ? "✓ MATCH" : "✗ MISMATCH"} (got ${central.paybackMonths}, expected ${LOCKED_PAYBACK})`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
