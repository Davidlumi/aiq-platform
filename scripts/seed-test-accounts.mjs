/**
 * seed-test-accounts.mjs
 * Creates 8 test accounts covering every user scenario on the AiQ platform.
 * Run: node scripts/seed-test-accounts.mjs
 *
 * Key schema facts:
 *  - PRO flag: tenants.entitlement_assessment_paid
 *  - Learning plans: adaptive_learning_plans + adaptive_plan_items (moduleId → learning_modules.id)
 *  - Gap analyses: gap_analyses (required FK for adaptive_learning_plans)
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(DB_URL);
const PASSWORD = "TestAiQ2025!";
const HASH = await bcrypt.hash(PASSWORD, 10);

// ── helpers ──────────────────────────────────────────────────────────────────
async function upsertTenant(id, name, slug, isPro) {
  await conn.execute(
    `INSERT INTO tenants
       (id, name, slug, status,
        entitlement_assessment, entitlement_assessment_paid,
        entitlement_strategy_company, entitlement_strategy_reward,
        stripe_subscription_status)
     VALUES (?,?,?,'active', 1, ?, 0, 0, ?)
     ON DUPLICATE KEY UPDATE
       entitlement_assessment_paid = VALUES(entitlement_assessment_paid),
       stripe_subscription_status  = VALUES(stripe_subscription_status)`,
    [id, name, slug, isPro ? 1 : 0, isPro ? "active" : null]
  );
}

async function upsertUser(u) {
  await conn.execute(
    `INSERT INTO users
       (id, tenant_id, email, first_name, last_name, password_hash,
        status, aiq_role, onboarding_completed, email_verified_at)
     VALUES (?,?,?,?,?,?,'active','learner',1,NOW())
     ON DUPLICATE KEY UPDATE
       first_name = VALUES(first_name),
       status = 'active',
       email_verified_at = COALESCE(email_verified_at, NOW())`,
    [u.id, u.tenantId, u.email, u.firstName, u.lastName, HASH]
  );
}

async function assignLearnerRole(userId, tenantId) {
  const [rows] = await conn.execute(
    `SELECT id FROM roles WHERE \`key\`='learner' LIMIT 1`
  );
  if (!rows[0]) return;
  await conn.execute(
    `INSERT IGNORE INTO user_roles (id, tenant_id, user_id, role_id)
     VALUES (?,?,?,?)`,
    [nanoid(), tenantId, userId, rows[0].id]
  );
}

async function insertAssessmentSession(id, userId, tenantId, state, completedAt) {
  const [bp] = await conn.execute(
    `SELECT id FROM assessment_blueprints LIMIT 1`
  );
  const blueprintId = bp[0]?.id ?? "bp-default";
  await conn.execute(
    `INSERT INTO assessment_sessions
       (id, tenant_id, user_id, blueprint_id, state, started_at, completed_at)
     VALUES (?,?,?,?,?,NOW(),?)
     ON DUPLICATE KEY UPDATE state=VALUES(state), completed_at=VALUES(completed_at)`,
    [id, tenantId, userId, blueprintId, state, completedAt ?? null]
  );
}

async function insertAssessmentScore(sessionId, overallScore, domainScores) {
  await conn.execute(
    `INSERT INTO assessment_scores
       (id, session_id, overall_score, score_breakdown_json, scoring_config_version)
     VALUES (?,?,?,?,1)
     ON DUPLICATE KEY UPDATE overall_score=VALUES(overall_score)`,
    [nanoid(), sessionId, overallScore, JSON.stringify(domainScores)]
  );
}

async function insertGapAnalysis(id, userId, tenantId, sessionId, overallScore, domainScores) {
  const gaps = {};
  const benchmarks = { ai_interaction: 6.5, ai_output_evaluation: 6.5, ai_workflow_design: 6.5, workforce_ai_readiness: 6.5, ai_ethics_trust: 6.5, ai_change_leadership: 6.5 };
  for (const [cap, score] of Object.entries(domainScores)) {
    const gap = benchmarks[cap] - score;
    gaps[cap] = {
      score,
      benchmark: benchmarks[cap],
      gap: Math.max(0, gap),
      severity: score >= 8 ? "advanced" : score >= 6.5 ? "proficient" : score >= 5 ? "developing" : "critical",
      priority: gap > 2 ? 1 : gap > 1 ? 2 : 3,
    };
  }
  const priorityOrder = Object.entries(gaps).sort((a, b) => a[1].priority - b[1].priority).map(([k]) => k);
  const readinessBand = overallScore >= 8 ? "advanced" : overallScore >= 6.5 ? "proficient" : overallScore >= 5 ? "developing" : "critical";
  await conn.execute(
    `INSERT INTO gap_analyses
       (id, user_id, tenant_id, session_id, capability_gaps_json, priority_order_json,
        overall_readiness_score, readiness_band, trigger_source, generated_at)
     VALUES (?,?,?,?,?,?,?,?,'assessment_complete',?)
     ON DUPLICATE KEY UPDATE overall_readiness_score=VALUES(overall_readiness_score)`,
    [id, userId, tenantId, sessionId, JSON.stringify(gaps), JSON.stringify(priorityOrder),
     overallScore, readinessBand, Date.now()]
  );
}

async function insertAdaptiveLearningPlan(planId, userId, tenantId, sessionId, gapAnalysisId, moduleCount, completedCount) {
  // Fetch real module IDs
  const [modules] = await conn.execute(
    `SELECT id FROM learning_modules WHERE status='published' LIMIT ${parseInt(moduleCount, 10)}`
  );
  const actualCount = modules.length;

  await conn.execute(
    `INSERT INTO adaptive_learning_plans
       (id, user_id, tenant_id, gap_analysis_id, session_id, state,
        total_modules, completed_modules, estimated_total_mins, generated_at)
     VALUES (?,?,?,?,?,'active',?,?,?,?)
     ON DUPLICATE KEY UPDATE
       total_modules=VALUES(total_modules),
       completed_modules=VALUES(completed_modules)`,
    [planId, userId, tenantId, gapAnalysisId, sessionId,
     actualCount, completedCount, actualCount * 20, Date.now()]
  );

  for (let i = 0; i < modules.length; i++) {
    const isCompleted = i < completedCount;
    const status = isCompleted ? "completed" : i === completedCount ? "available" : "available";
    const completionState = isCompleted ? "completed_with_engagement" : "not_started";
    const phase = i < Math.ceil(actualCount * 0.1) ? "foundation"
      : i < Math.ceil(actualCount * 0.3) ? "development"
      : i < Math.ceil(actualCount * 0.8) ? "practice" : "validation";

    await conn.execute(
      `INSERT INTO adaptive_plan_items
         (id, plan_id, module_id, order_index, phase, status, completion_state,
          assigned_at, completed_at)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE status=VALUES(status), completion_state=VALUES(completion_state)`,
      [nanoid(), planId, modules[i].id, i, phase, status, completionState,
       Date.now(), isCompleted ? Date.now() : null]
    );
  }
  return actualCount;
}

// ── Scenario definitions ──────────────────────────────────────────────────────
const scenarios = [
  {
    label: "S1 — Brand new user (registered, no assessment started)",
    email: "test.new@aiqtest.dev",
    firstName: "Alex",
    lastName: "New",
    isPro: false,
  },
  {
    label: "S2 — Free user: assessment in progress",
    email: "test.inprogress@aiqtest.dev",
    firstName: "Jordan",
    lastName: "InProgress",
    isPro: false,
    assessment: { state: "in_progress" },
  },
  {
    label: "S3 — Free user: assessment complete, no learning plan yet",
    email: "test.free.noplan@aiqtest.dev",
    firstName: "Sam",
    lastName: "FreePlan",
    isPro: false,
    assessment: {
      state: "completed",
      overallScore: 5.2,
      domainScores: { ai_interaction: 4.8, ai_output_evaluation: 5.5, ai_workflow_design: 4.2, workforce_ai_readiness: 6.1, ai_ethics_trust: 5.0, ai_change_leadership: 5.6 },
    },
  },
  {
    label: "S4 — Free user: assessment complete, learning plan generated (view-only locked)",
    email: "test.free.plan@aiqtest.dev",
    firstName: "Morgan",
    lastName: "FreeLocked",
    isPro: false,
    assessment: {
      state: "completed",
      overallScore: 4.7,
      domainScores: { ai_interaction: 3.9, ai_output_evaluation: 4.5, ai_workflow_design: 3.8, workforce_ai_readiness: 5.2, ai_ethics_trust: 5.8, ai_change_leadership: 5.0 },
    },
    learningPlan: { moduleCount: 8, completedCount: 0 },
  },
  {
    label: "S5 — PRO user: fresh (assessment done, no modules started)",
    email: "test.pro.fresh@aiqtest.dev",
    firstName: "Taylor",
    lastName: "ProFresh",
    isPro: true,
    assessment: {
      state: "completed",
      overallScore: 6.3,
      domainScores: { ai_interaction: 6.0, ai_output_evaluation: 6.5, ai_workflow_design: 5.8, workforce_ai_readiness: 7.0, ai_ethics_trust: 6.2, ai_change_leadership: 6.4 },
    },
    learningPlan: { moduleCount: 8, completedCount: 0 },
  },
  {
    label: "S6 — PRO user: learning in progress (4 of 10 modules done)",
    email: "test.pro.progress@aiqtest.dev",
    firstName: "Casey",
    lastName: "ProProgress",
    isPro: true,
    assessment: {
      state: "completed",
      overallScore: 5.8,
      domainScores: { ai_interaction: 5.5, ai_output_evaluation: 6.0, ai_workflow_design: 5.2, workforce_ai_readiness: 6.5, ai_ethics_trust: 5.9, ai_change_leadership: 5.7 },
    },
    learningPlan: { moduleCount: 10, completedCount: 4 },
  },
  {
    label: "S7 — PRO user: all modules complete (reassessment due)",
    email: "test.pro.complete@aiqtest.dev",
    firstName: "Riley",
    lastName: "ProComplete",
    isPro: true,
    assessment: {
      state: "completed",
      overallScore: 7.8,
      domainScores: { ai_interaction: 7.5, ai_output_evaluation: 8.0, ai_workflow_design: 7.2, workforce_ai_readiness: 8.5, ai_ethics_trust: 7.9, ai_change_leadership: 7.7 },
    },
    learningPlan: { moduleCount: 8, completedCount: 8 },
  },
  {
    label: "S8 — PRO user: AI Expert level score (9.1 overall)",
    email: "test.expert@aiqtest.dev",
    firstName: "Drew",
    lastName: "Expert",
    isPro: true,
    assessment: {
      state: "completed",
      overallScore: 9.1,
      domainScores: { ai_interaction: 9.0, ai_output_evaluation: 9.3, ai_workflow_design: 8.8, workforce_ai_readiness: 9.5, ai_ethics_trust: 9.2, ai_change_leadership: 8.9 },
    },
    learningPlan: { moduleCount: 4, completedCount: 0 },
  },
];

// ── Seed ──────────────────────────────────────────────────────────────────────
console.log("\n🌱  Seeding AiQ test accounts…\n");

const results = [];

for (const s of scenarios) {
  const slug = s.email.split("@")[0].replace(/\./g, "-");
  const userId    = `tst-u-${slug}`;
  const tenantId  = `tst-t-${slug}`;
  const sessionId = `tst-s-${slug}`;
  const gapId     = `tst-g-${slug}`;
  const planId    = `tst-p-${slug}`;

  await upsertTenant(tenantId, `${s.firstName} ${s.lastName}`, `test-${slug}`, s.isPro);
  await upsertUser({ id: userId, tenantId, email: s.email, firstName: s.firstName, lastName: s.lastName });
  await assignLearnerRole(userId, tenantId);

  let actualModules = null;

  if (s.assessment) {
    const completedAt = s.assessment.state === "completed" ? new Date() : null;
    await insertAssessmentSession(sessionId, userId, tenantId, s.assessment.state, completedAt);
    if (s.assessment.overallScore) {
      await insertAssessmentScore(sessionId, s.assessment.overallScore, s.assessment.domainScores);
      await insertGapAnalysis(gapId, userId, tenantId, sessionId, s.assessment.overallScore, s.assessment.domainScores);
    }
  }

  if (s.learningPlan && s.assessment?.overallScore) {
    actualModules = await insertAdaptiveLearningPlan(
      planId, userId, tenantId, sessionId, gapId,
      s.learningPlan.moduleCount, s.learningPlan.completedCount
    );
  }

  results.push({ ...s, userId, tenantId, actualModules });
  console.log(`  ✅  ${s.label}`);
}

await conn.end();

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  All 8 test accounts created successfully.                      ║
║  Universal password: TestAiQ2025!                               ║
╚══════════════════════════════════════════════════════════════════╝
`);
