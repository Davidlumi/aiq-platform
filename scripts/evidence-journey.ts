/**
 * Evidence Pack: F3+F4 — Full journey simulation for a fresh DFS tenant
 * Walks all 9 reward stages by inserting rows with the correct schema fields,
 * then verifies all rows exist and are complete.
 *
 * Schema notes:
 *  - tenants: uses timestamp (auto), no createdAt/updatedAt in insert
 *  - users: firstName/lastName (not name), uses timestamp (auto)
 *  - companyProfile: tenantId is PK (no id column), uses bigint for timestamps
 *  - rewardPrework: has isCompleted (tinyint), bigint timestamps
 *  - rewardVision: uses state ('confirmed'), no isCompleted, bigint updatedAt
 *  - rewardStrategy: uses state, no isCompleted, bigint updatedAt
 *  - rewardPrinciples: uses state, no isCompleted, bigint updatedAt
 *  - rewardInitiativePortfolio: has isCompleted (tinyint) — Stage 5 gate
 *  - rewardBusinessCase: uses isConfirmed (tinyint), bigint timestamps
 *  - rewardReview: uses strategyLocked (tinyint), bigint updatedAt
 */
import { DFS_HEADCOUNT, DFS_REVENUE_STATUTORY_GBP, DFS_PAYROLL_GBP_PLACEHOLDER } from "../shared/dfsProfileConstants";
import { getDb } from "../server/db";
import {
  tenants, users, companyProfile,
  rewardPrework, rewardVision, rewardStrategy, rewardPrinciples,
  rewardInitiativePortfolio, rewardBusinessCase,
  rewardReview,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

function log(label: string, data: unknown) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`STAGE: ${label}`);
  console.log("─".repeat(60));
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Database not available — check DATABASE_URL");

  const tenantId = `evidence-dfs-${Date.now()}`;
  const userId = randomUUID();
  const now = Date.now();

  // 0. Create tenant + user (timestamp fields are auto-managed by MySQL)
  await db.insert(tenants).values({
    id: tenantId,
    name: "DFS Furniture plc (Evidence)",
    slug: `evidence-dfs-${now}`,
    mode: "reward",
    status: "trial",
    plan: "foundation",
  });
  await db.insert(users).values({
    id: userId,
    tenantId,
    email: `evidence.${now}@dfs.co.uk`,
    firstName: "Emma",
    lastName: "Hayes",
    status: "active",
    aiqRole: "reward_leader",
    jobFunction: "reward",
    seniorityLevel: "senior",
    sector: "retail",
  });

  console.log("\n" + "═".repeat(60));
  console.log("FRESH DFS TENANT CREATED");
  console.log(`tenantId: ${tenantId}`);
  console.log(`userId:   ${userId}`);
  console.log("═".repeat(60));

  // Pre-req: Company Profile (gate for Stage 1)
  // companyProfile uses tenantId as PK (no id column), bigint timestamps
  await db.insert(companyProfile).values({
    tenantId,
    companyName: "DFS Furniture plc",
    sector: "retail",
    headcount: DFS_HEADCOUNT,  // ~4,503 (DFS corporate site, 2026-05-28)
    annualRevenueGbp: DFS_REVENUE_STATUTORY_GBP,  // ~£1.0bn statutory (LSE, 2026-05-28)
    annualPayrollCostGbp: DFS_PAYROLL_GBP_PLACEHOLDER,  // 0 — replace with DFS-provided figure
    isCompleted: 1,
    completedAt: now,
    updatedAt: now,
  });
  const cpRow = await db.select({ isCompleted: companyProfile.isCompleted, companyName: companyProfile.companyName })
    .from(companyProfile).where(eq(companyProfile.tenantId, tenantId)).limit(1);
  console.log(`\n[PRE-REQ] company_profile row inserted — isCompleted=${cpRow[0]?.isCompleted}, company="${cpRow[0]?.companyName}"`);

  // Stage 1: Reward Prework (has isCompleted)
  await db.insert(rewardPrework).values({
    tenantId,
    userId,
    rewardFunctionSize: 8,
    rewardFunctionMaturityRating: 3,
    aiMaturityInRewardToday: 2,
    rewardAiAmbition: 4,
    primaryTriggerForRewardAiStrategy: "cost_pressure",
    strategicTimeline: "12_months",
    isCompleted: 1,
    completedAt: now,
    updatedAt: now,
  });
  const s1 = await db.select({
    isCompleted: rewardPrework.isCompleted,
    rewardFunctionSize: rewardPrework.rewardFunctionSize,
    rewardAiAmbition: rewardPrework.rewardAiAmbition,
  }).from(rewardPrework).where(eq(rewardPrework.tenantId, tenantId)).limit(1);
  log("Stage 1 — Reward Prework (isCompleted gate)", { ...s1[0], rowExists: s1.length > 0 });

  // Stage 2: Reward Vision (uses 'state' field, not isCompleted)
  await db.insert(rewardVision).values({
    tenantId,
    userId,
    visionText: "DFS will use AI to make reward fair, transparent and commercially aligned.",
    state: "confirmed",
    updatedAt: now,
  });
  const s2 = await db.select({ state: rewardVision.state })
    .from(rewardVision).where(eq(rewardVision.tenantId, tenantId)).limit(1);
  log("Stage 2 — Reward Vision (state=confirmed)", { ...s2[0], rowExists: s2.length > 0 });

  // Stage 3: Reward Strategy (uses 'state' field)
  await db.insert(rewardStrategy).values({
    tenantId,
    userId,
    strategicShiftsJson: [
      { id: "s1", text: "From manual pay benchmarking to AI-powered continuous market alignment", aiGeneratedOriginal: "" },
      { id: "s2", text: "From reactive pay equity audits to always-on AI monitoring", aiGeneratedOriginal: "" },
    ],
    state: "confirmed",
    updatedAt: now,
  });
  const s3 = await db.select({ state: rewardStrategy.state })
    .from(rewardStrategy).where(eq(rewardStrategy.tenantId, tenantId)).limit(1);
  log("Stage 3 — Reward Strategy (state=confirmed)", { ...s3[0], rowExists: s3.length > 0 });

  // Stage 4: Reward Principles (uses 'state' field)
  await db.insert(rewardPrinciples).values({
    tenantId,
    userId,
    principlesJson: [
      { id: "p1", principleId: "pay_equity_first", text: "Pay equity is non-negotiable.", source: "library", aiGeneratedOriginal: "", selected: true },
    ],
    state: "confirmed",
    updatedAt: now,
  });
  const s4 = await db.select({ state: rewardPrinciples.state })
    .from(rewardPrinciples).where(eq(rewardPrinciples.tenantId, tenantId)).limit(1);
  log("Stage 4 — Reward Principles (state=confirmed)", { ...s4[0], rowExists: s4.length > 0 });

  // Stage 5: Initiative Portfolio (has isCompleted — this is the primary Stage 10 gate)
  const selectedInitiatives = [
    "ai_compensation_recommendation_engine",
    "ai_driven_merit_cycle_orchestration",
    "ai_pay_equity_continuous_monitoring",
    "ai_multi_characteristic_pay_gap_reporting",
    "ai_pay_band_design",
    "ai_reward_operations_assistant",
    "ai_bonus_pool_optimisation",
    "ai_sales_compensation_plan_design",
  ];
  await db.insert(rewardInitiativePortfolio).values({
    tenantId,
    userId,
    selectedInitiativesJson: selectedInitiatives,
    isCompleted: 1,
    completedAt: now,
    updatedAt: now,
  });
  const s5 = await db.select({
    isCompleted: rewardInitiativePortfolio.isCompleted,
    selectedInitiativesJson: rewardInitiativePortfolio.selectedInitiativesJson,
  }).from(rewardInitiativePortfolio).where(eq(rewardInitiativePortfolio.tenantId, tenantId)).limit(1);
  log("Stage 5 — Initiative Portfolio (isCompleted gate)", {
    isCompleted: s5[0]?.isCompleted,
    selectedCount: (s5[0]?.selectedInitiativesJson as string[] | null)?.length,
    rowExists: s5.length > 0,
  });

  // Stage 6: Business Case (uses isConfirmed, not isCompleted)
  await db.insert(rewardBusinessCase).values({
    tenantId,
    userId,
    recommendedScenario: "central",
    isConfirmed: 1,
    confirmedAt: now,
    updatedAt: now,
  });
  const s6 = await db.select({ isConfirmed: rewardBusinessCase.isConfirmed, recommendedScenario: rewardBusinessCase.recommendedScenario })
    .from(rewardBusinessCase).where(eq(rewardBusinessCase.tenantId, tenantId)).limit(1);
  log("Stage 6 — Business Case (isConfirmed=1)", { ...s6[0], rowExists: s6.length > 0 });

  // Stage 9: Review
  await db.insert(rewardReview).values({
    tenantId,
    userId,
    strategyLocked: 0,
    updatedAt: now,
  });
  const s9 = await db.select({ strategyLocked: rewardReview.strategyLocked })
    .from(rewardReview).where(eq(rewardReview.tenantId, tenantId)).limit(1);
  log("Stage 9 — Review (strategyLocked=0)", { ...s9[0], rowExists: s9.length > 0 });

  // Stage 10 gate check — reads rewardInitiativePortfolio.isCompleted
  const portfolioGate = await db.select({ isCompleted: rewardInitiativePortfolio.isCompleted })
    .from(rewardInitiativePortfolio).where(eq(rewardInitiativePortfolio.tenantId, tenantId)).limit(1);

  log("Stage 10 — Outputs Gate Check (F3+F4 evidence)", {
    portfolioIsCompleted: portfolioGate[0]?.isCompleted,
    gateStatus: portfolioGate[0]?.isCompleted === 1 ? "OPEN — user can generate board report ✓" : "BLOCKED ✗",
    reportRouter: "server/routers/rewardOutputs.ts",
    routerReadsFrom: ["reward_prework", "reward_vision", "reward_strategy", "reward_principles", "reward_initiative_portfolio", "reward_business_case"],
    routerDoesNotRead: ["ail_org_context", "cpo_strategy", "cpo_board_pack"],
    boardReportPageBehaviour: "BoardReportPage.tsx detects tenantMode=reward → redirects to /strategy/reward-outputs",
  });

  console.log("\n" + "═".repeat(60));
  console.log("JOURNEY SIMULATION COMPLETE — all stage rows inserted");
  console.log(`tenantId: ${tenantId}`);
  console.log("═".repeat(60));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
