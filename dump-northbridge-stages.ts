/**
 * dump-northbridge-stages.ts
 * Section 2.1: Full 10-stage data dump for Northbridge tenant
 */
import { createConnection } from "mysql2/promise";

const TENANT_ID = "tenant-northbridge-001";
const db = await createConnection(process.env.DATABASE_URL!);

// ── Stage 1: Reward Pre-work ──────────────────────────────────────────────────
console.log("\n=== STAGE 1: REWARD PRE-WORK ===");
const [prework] = await db.query(`SELECT isCompleted, completedAt, rewardFunctionSize, aiMaturityInRewardToday, rewardAiAmbition, primaryTriggerForRewardAiStrategy, topRewardPrioritiesNext12Months, strategicTimeline FROM reward_prework WHERE tenantId = ?`, [TENANT_ID]) as any;
console.log(JSON.stringify(prework[0] ?? "NOT FOUND", null, 2));

// ── Stage 2: Reward Vision ────────────────────────────────────────────────────
console.log("\n=== STAGE 2: REWARD VISION ===");
const [vision] = await db.query(`SELECT visionText, confirmedAt, state FROM reward_vision WHERE tenantId = ?`, [TENANT_ID]) as any;
console.log(JSON.stringify(vision[0] ?? "NOT FOUND", null, 2));

// ── Stage 3: Reward Strategy ──────────────────────────────────────────────────
console.log("\n=== STAGE 3: REWARD STRATEGY ===");
const [strategy] = await db.query(`SELECT archetype, strategyStatement, confirmedAt, state FROM reward_strategy WHERE tenantId = ?`, [TENANT_ID]) as any;
console.log(JSON.stringify(strategy[0] ?? "NOT FOUND", null, 2));

// ── Stage 4: Reward Principles ────────────────────────────────────────────────
console.log("\n=== STAGE 4: REWARD PRINCIPLES ===");
const [principles] = await db.query(`SELECT id, title, confirmedAt FROM reward_principles WHERE tenantId = ? LIMIT 10`, [TENANT_ID]) as any;
console.log(`Count: ${principles.length}`);
console.log(JSON.stringify(principles, null, 2));

// ── Stage 5: Reward Initiatives ───────────────────────────────────────────────
console.log("\n=== STAGE 5: REWARD INITIATIVES ===");
const [initiatives] = await db.query(`SELECT id, initiativeId, label, isCustom, confirmedAt FROM reward_initiatives WHERE tenantId = ? ORDER BY isCustom, label`, [TENANT_ID]) as any;
console.log(`Count: ${initiatives.length}`);
console.log(JSON.stringify(initiatives, null, 2));

// ── Stage 6: Reward Success Measures ─────────────────────────────────────────
console.log("\n=== STAGE 6: REWARD SUCCESS MEASURES ===");
const [measures] = await db.query(`SELECT id, initiativeId, metricLabel, confirmedAt FROM reward_success_measures WHERE tenantId = ? LIMIT 20`, [TENANT_ID]) as any;
console.log(`Count: ${measures.length}`);
console.log(JSON.stringify(measures.slice(0, 5), null, 2));

// ── Stage 7: Reward Business Case ────────────────────────────────────────────
console.log("\n=== STAGE 7: REWARD BUSINESS CASE ===");
const [bc] = await db.query(`SELECT confirmedAt, centralNetBenefit, centralTco, centralRoi, conservativeNetBenefit, optimisticNetBenefit FROM reward_business_case WHERE tenantId = ?`, [TENANT_ID]) as any;
console.log(JSON.stringify(bc[0] ?? "NOT FOUND", null, 2));

// ── Stage 8: Reward Capability ────────────────────────────────────────────────
console.log("\n=== STAGE 8: REWARD CAPABILITY ===");
const [cap] = await db.query(`SELECT confirmedAt, teamSkillsLevel, changeManagementLevel, governanceLevel FROM reward_capability_assessment WHERE tenantId = ?`, [TENANT_ID]) as any;
console.log(JSON.stringify(cap[0] ?? "NOT FOUND", null, 2));

// ── Stage 9: Reward Review ────────────────────────────────────────────────────
console.log("\n=== STAGE 9: REWARD REVIEW ===");
const [review] = await db.query(`SELECT lockedAt, lockStatus, centralNetBenefit FROM reward_review WHERE tenantId = ?`, [TENANT_ID]) as any;
console.log(JSON.stringify(review[0] ?? "NOT FOUND", null, 2));

// ── Stage 10: Reward Outputs ──────────────────────────────────────────────────
console.log("\n=== STAGE 10: REWARD OUTPUTS ===");
const [outputs] = await db.query(`SELECT reportState, generatedAt FROM reward_outputs WHERE tenantId = ?`, [TENANT_ID]) as any;
console.log(JSON.stringify(outputs[0] ?? "NOT FOUND", null, 2));

// ── Gate state ────────────────────────────────────────────────────────────────
console.log("\n=== GATE STATE (ailOrgContext) ===");
const [gate] = await db.query(`SELECT stageGateStateJson, preworkCompletedAt, visionStatement, visionConfirmedAt, strategyArchetype, strategyConfirmedAt, stage4ConfirmedAt FROM ail_org_context WHERE tenantId = ?`, [TENANT_ID]) as any;
console.log(JSON.stringify(gate[0] ?? "NOT FOUND", null, 2));

await db.end();
