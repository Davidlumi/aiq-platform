/**
 * seed-demo-accounts.mjs
 * Creates demo accounts for all key user states in AiQ.
 * Run: node scripts/seed-demo-accounts.mjs
 *
 * PERSONAS:
 * 1. free@demo.aiq.com        — Free tier, no assessment (brand new user)
 * 2. assessed@demo.aiq.com    — Free tier, 1 completed assessment (Proficient, 5.1)
 * 3. pro@demo.aiq.com         — PRO subscriber, 2 assessments (band-up: Developing→Proficient)
 * 4. pro-advanced@demo.aiq.com — PRO subscriber, 3 assessments (Advanced, 7.4, active streak)
 * 5. team-admin@demo.aiq.com  — Team billing admin (PRO team plan, 5 seats)
 * 6. team-member@demo.aiq.com — Team member seat (PRO via team, Proficient)
 * 7. hr@demo.aiq.com          — HR Leader (strategy entitlement, full platform)
 * 8. manager@demo.aiq.com     — Manager (strategy entitlement, team dashboard)
 */

import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// Parse mysql2 connection from URL
function parseDbUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "3306"),
    user: u.username,
    password: u.password,
    database: u.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  };
}

const DEMO_PASSWORD = "Demo1234!";
const SALT_ROUNDS = 12;

const DOMAIN_KEYS = [
  "ai_interaction",
  "ai_output_evaluation",
  "ai_workflow_design",
  "workforce_ai_readiness",
  "ai_ethics_trust",
  "ai_change_leadership",
];

function makeDomainScores(scores) {
  const obj = {};
  DOMAIN_KEYS.forEach((k, i) => { obj[k] = scores[i] ?? 5.0; });
  return obj;
}

function compositeScore(domainScores) {
  const vals = Object.values(domainScores);
  return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
}

async function hashPw(pw) {
  return bcrypt.hash(pw, SALT_ROUNDS);
}

async function main() {
  const conn = await createConnection(parseDbUrl(DB_URL));
  console.log("Connected to database");

  const pwHash = await hashPw(DEMO_PASSWORD);

  // ─── Helper: upsert tenant ───────────────────────────────────────────────
  async function upsertTenant(id, name, slug, opts = {}) {
    await conn.execute(
      `INSERT INTO tenants (id, name, slug, status, plan,
        entitlement_assessment, entitlement_assessment_paid,
        entitlement_strategy_company, entitlement_strategy_reward,
        stripe_subscription_status)
       VALUES (?, ?, ?, 'active', ?,  ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         entitlement_assessment = VALUES(entitlement_assessment),
         entitlement_assessment_paid = VALUES(entitlement_assessment_paid),
         entitlement_strategy_company = VALUES(entitlement_strategy_company),
         entitlement_strategy_reward = VALUES(entitlement_strategy_reward),
         stripe_subscription_status = VALUES(stripe_subscription_status)`,
      [
        id, name, slug,
        opts.plan || "foundation",
        opts.entitlementAssessment ? 1 : 0,
        opts.entitlementAssessmentPaid ? 1 : 0,
        opts.entitlementStrategyCompany ? 1 : 0,
        opts.entitlementStrategyReward ? 1 : 0,
        opts.stripeStatus || null,
      ]
    );
  }

  // ─── Helper: upsert user ─────────────────────────────────────────────────
  async function upsertUser(id, tenantId, email, firstName, lastName, opts = {}) {
    await conn.execute(
      `INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status,
        onboarding_completed, aiq_role, email_verified_at, is_platform_superuser)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, NOW(), 0)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         status = 'active',
         email_verified_at = NOW()`,
      [
        id, tenantId, email, firstName, lastName, pwHash,
        opts.onboardingCompleted ? 1 : 0,
        opts.aiqRole || "learner",
      ]
    );
  }

  // ─── Helper: assign role ─────────────────────────────────────────────────
  async function assignRole(tenantId, userId, roleKey) {
    const [roleRows] = await conn.execute(
      `SELECT id FROM roles WHERE \`key\` = ? LIMIT 1`, [roleKey]
    );
    if (!roleRows[0]) { console.warn(`Role '${roleKey}' not found`); return; }
    const roleId = roleRows[0].id;
    const urId = `ur-demo-${nanoid(8)}`;
    await conn.execute(
      `INSERT IGNORE INTO user_roles (id, tenant_id, user_id, role_id) VALUES (?, ?, ?, ?)`,
      [urId, tenantId, userId, roleId]
    );
  }

  // ─── Helper: insert completed assessment session with scores ─────────────
  async function insertCompletedAssessment(sessionId, tenantId, userId, domainScores, completedAt) {
    const overall = compositeScore(domainScores);
    // Find or use default blueprint
    const [bpRows] = await conn.execute(
      `SELECT id FROM assessment_blueprints WHERE tenant_id = ? LIMIT 1`, [tenantId]
    );
    const blueprintId = bpRows[0]?.id || "bp-001";

    await conn.execute(
      `INSERT IGNORE INTO assessment_sessions
        (id, tenant_id, user_id, blueprint_id, state, started_at, completed_at, created_at)
       VALUES (?, ?, ?, ?, 'completed', DATE_SUB(?, INTERVAL 20 MINUTE), ?, ?)`,
      [sessionId, tenantId, userId, blueprintId, completedAt, completedAt, completedAt]
    );

    // Insert score record
    const scoreBreakdown = {};
    DOMAIN_KEYS.forEach(k => { scoreBreakdown[k] = { score: domainScores[k], weight: 1 }; });
    await conn.execute(
      `INSERT IGNORE INTO assessment_scores
        (id, session_id, overall_score, score_breakdown_json, signal_scores_json, generated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        `score-${sessionId}`,
        sessionId,
        overall,
        JSON.stringify(scoreBreakdown),
        JSON.stringify(domainScores),
        completedAt,
      ]
    );
    return overall;
  }

  // ─── Helper: ensure blueprint exists for tenant ──────────────────────────
  async function ensureBlueprint(tenantId) {
    const bpId = `bp-${tenantId}`;
    await conn.execute(
      `INSERT IGNORE INTO assessment_blueprints (id, tenant_id, \`key\`, name, version, status)
       VALUES (?, ?, 'general_capability_v1', 'General Capability Assessment v1', 1, 'published')`,
      [bpId, tenantId]
    );
    return bpId;
  }

  // ─── Helper: set learning streak ─────────────────────────────────────────
  async function setStreak(userId, currentStreak, longestStreak, totalModules) {
    const id = `streak-${userId}`;
    const today = new Date().toISOString().slice(0, 10);
    await conn.execute(
      `INSERT INTO learning_streaks (id, user_id, current_streak, longest_streak,
        total_modules_completed, last_activity_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         current_streak = VALUES(current_streak),
         longest_streak = VALUES(longest_streak),
         total_modules_completed = VALUES(total_modules_completed),
         last_activity_date = VALUES(last_activity_date),
         updated_at = VALUES(updated_at)`,
      [id, userId, currentStreak, longestStreak, totalModules, today, Date.now()]
    );
  }

  // ─── Helper: set journey progress ────────────────────────────────────────
  async function setJourneyProgress(userId, level, totalXp) {
    const LEVEL_XP = [0,50,120,210,320,450,600,780,990,1230,1500,1800,2150,2550,3000];
    const levelStartXp = LEVEL_XP[level - 1] || 0;
    await conn.execute(
      `INSERT INTO journey_progress (id, user_id, current_level, total_xp, level_start_xp)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         current_level = VALUES(current_level),
         total_xp = VALUES(total_xp),
         level_start_xp = VALUES(level_start_xp)`,
      [`jp-${userId}`, userId, level, totalXp, levelStartXp]
    );
  }

  console.log("\n=== Creating demo tenants and users ===\n");

  // ─────────────────────────────────────────────────────────────────────────
  // PERSONA 1: Free tier — brand new, no assessment
  // ─────────────────────────────────────────────────────────────────────────
  {
    const tenantId = "tenant-demo-free";
    const userId = "user-demo-free";
    await upsertTenant(tenantId, "Demo Free User", "demo-free", {
      plan: "foundation",
      entitlementAssessment: true,
      entitlementAssessmentPaid: false,
    });
    await upsertUser(userId, tenantId, "free@demo.aiq.com", "Freya", "Free", {
      onboardingCompleted: false,
      aiqRole: "learner",
    });
    await assignRole(tenantId, userId, "learner");
    console.log("✓ Persona 1: free@demo.aiq.com (Free, no assessment)");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERSONA 2: Free tier — 1 completed assessment, Proficient (5.1)
  // ─────────────────────────────────────────────────────────────────────────
  {
    const tenantId = "tenant-demo-assessed";
    const userId = "user-demo-assessed";
    await upsertTenant(tenantId, "Demo Assessed User", "demo-assessed", {
      plan: "foundation",
      entitlementAssessment: true,
      entitlementAssessmentPaid: false,
    });
    await upsertUser(userId, tenantId, "assessed@demo.aiq.com", "Alex", "Assessed", {
      onboardingCompleted: true,
      aiqRole: "learner",
    });
    await assignRole(tenantId, userId, "learner");
    await ensureBlueprint(tenantId);
    const domainScores = makeDomainScores([5.2, 4.9, 5.4, 5.0, 4.8, 5.3]);
    const completedAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    await insertCompletedAssessment("sess-assessed-001", tenantId, userId, domainScores, completedAt);
    console.log("✓ Persona 2: assessed@demo.aiq.com (Free, 1 assessment, Proficient 5.1)");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERSONA 3: PRO subscriber — 2 assessments, band-up Developing→Proficient
  // ─────────────────────────────────────────────────────────────────────────
  {
    const tenantId = "tenant-demo-pro";
    const userId = "user-demo-pro";
    await upsertTenant(tenantId, "Demo Pro User", "demo-pro", {
      plan: "readiness",
      entitlementAssessment: true,
      entitlementAssessmentPaid: true,
      stripeStatus: "active",
    });
    await upsertUser(userId, tenantId, "pro@demo.aiq.com", "Priya", "Pro", {
      onboardingCompleted: true,
      aiqRole: "learner",
    });
    await assignRole(tenantId, userId, "learner");
    await ensureBlueprint(tenantId);
    // First assessment: Developing (3.8)
    const scores1 = makeDomainScores([3.9, 3.6, 4.1, 3.7, 3.5, 4.0]);
    const date1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    await insertCompletedAssessment("sess-pro-001", tenantId, userId, scores1, date1);
    // Second assessment: Proficient (5.2) — band-up!
    const scores2 = makeDomainScores([5.4, 4.9, 5.6, 5.0, 4.8, 5.5]);
    const date2 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    await insertCompletedAssessment("sess-pro-002", tenantId, userId, scores2, date2);
    await setStreak(userId, 5, 5, 3);
    await setJourneyProgress(userId, 4, 340);
    console.log("✓ Persona 3: pro@demo.aiq.com (PRO, 2 assessments, band-up Developing→Proficient)");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERSONA 4: PRO subscriber — 3 assessments, Advanced (7.4), active streak
  // ─────────────────────────────────────────────────────────────────────────
  {
    const tenantId = "tenant-demo-advanced";
    const userId = "user-demo-advanced";
    await upsertTenant(tenantId, "Demo Advanced User", "demo-advanced", {
      plan: "readiness",
      entitlementAssessment: true,
      entitlementAssessmentPaid: true,
      stripeStatus: "active",
    });
    await upsertUser(userId, tenantId, "pro-advanced@demo.aiq.com", "Adrian", "Advanced", {
      onboardingCompleted: true,
      aiqRole: "learner",
    });
    await assignRole(tenantId, userId, "learner");
    await ensureBlueprint(tenantId);
    // Three assessments showing progression
    const scores1 = makeDomainScores([5.1, 4.8, 5.3, 5.0, 4.9, 5.2]);
    await insertCompletedAssessment("sess-adv-001", tenantId, userId, scores1,
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));
    const scores2 = makeDomainScores([6.2, 5.9, 6.5, 6.1, 5.8, 6.3]);
    await insertCompletedAssessment("sess-adv-002", tenantId, userId, scores2,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const scores3 = makeDomainScores([7.5, 7.1, 7.8, 7.2, 7.0, 7.8]);
    await insertCompletedAssessment("sess-adv-003", tenantId, userId, scores3,
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000));
    await setStreak(userId, 14, 14, 18);
    await setJourneyProgress(userId, 8, 1050);
    console.log("✓ Persona 4: pro-advanced@demo.aiq.com (PRO, 3 assessments, Advanced 7.4, 14-day streak)");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERSONA 5: Team billing admin — PRO team plan, 5 seats
  // ─────────────────────────────────────────────────────────────────────────
  {
    const tenantId = "tenant-demo-team";
    const adminId = "user-demo-team-admin";
    const memberId = "user-demo-team-member";
    await upsertTenant(tenantId, "Acme HR Team", "demo-team", {
      plan: "readiness",
      entitlementAssessment: true,
      entitlementAssessmentPaid: true,
      stripeStatus: "active",
    });
    await upsertUser(adminId, tenantId, "team-admin@demo.aiq.com", "Tara", "Admin", {
      onboardingCompleted: true,
      aiqRole: "learner",
    });
    await assignRole(tenantId, adminId, "learner");

    // PERSONA 6: Team member
    await upsertUser(memberId, tenantId, "team-member@demo.aiq.com", "Mike", "Member", {
      onboardingCompleted: true,
      aiqRole: "learner",
    });
    await assignRole(tenantId, memberId, "learner");

    // Create team subscription record
    await conn.execute(
      `INSERT IGNORE INTO team_subscriptions (id, tenant_id, billing_admin_user_id,
        seat_count, stripe_subscription_id, stripe_subscription_status, is_active,
        price_band_key, per_seat_pence_pm)
       VALUES (?, ?, ?, 5, 'sub_demo_team_001', 'active', 1, 'team_5_10', 4000)`,
      [`tsub-demo-001`, tenantId, adminId]
    );

    // Create billing admin role record
    await conn.execute(
      `INSERT IGNORE INTO user_billing_roles (id, user_id, team_subscription_id)
       VALUES (?, ?, ?)`,
      [`ubr-admin-001`, adminId, `tsub-demo-001`]
    );

    // Create seat member records
    await conn.execute(
      `INSERT IGNORE INTO team_seat_members (id, team_subscription_id, user_id, invite_email, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [`seat-admin-001`, `tsub-demo-001`, adminId, `team-admin@demo.aiq.com`]
    );
    await conn.execute(
      `INSERT IGNORE INTO team_seat_members (id, team_subscription_id, user_id, invite_email, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [`seat-member-001`, `tsub-demo-001`, memberId, `team-member@demo.aiq.com`]
    );

    // Give team member an assessment
    await ensureBlueprint(tenantId);
    const memberScores = makeDomainScores([5.3, 5.0, 5.5, 5.1, 4.9, 5.4]);
    await insertCompletedAssessment("sess-team-member-001", tenantId, memberId, memberScores,
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000));
    await setStreak(memberId, 3, 5, 4);

    console.log("✓ Persona 5: team-admin@demo.aiq.com (Team billing admin, 5 seats)");
    console.log("✓ Persona 6: team-member@demo.aiq.com (Team member, Proficient 5.2)");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERSONA 7: HR Leader — full strategy entitlement (company + reward)
  // ─────────────────────────────────────────────────────────────────────────
  {
    const tenantId = "tenant-demo-hr";
    const userId = "user-demo-hr";
    await upsertTenant(tenantId, "GlobalCo HR", "demo-hr", {
      plan: "enterprise",
      entitlementAssessment: true,
      entitlementAssessmentPaid: true,
      entitlementStrategyCompany: true,
      entitlementStrategyReward: false,
      stripeStatus: "active",
    });
    await upsertUser(userId, tenantId, "hr@demo.aiq.com", "Harriet", "Leader", {
      onboardingCompleted: true,
      aiqRole: "cpo",
    });
    await assignRole(tenantId, userId, "hr_leader");
    await ensureBlueprint(tenantId);
    const domainScores = makeDomainScores([6.8, 6.5, 7.0, 6.6, 6.3, 6.9]);
    await insertCompletedAssessment("sess-hr-001", tenantId, userId, domainScores,
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000));
    console.log("✓ Persona 7: hr@demo.aiq.com (HR Leader, full strategy, Advanced 6.7)");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERSONA 8: Manager — strategy entitlement, team dashboard
  // ─────────────────────────────────────────────────────────────────────────
  {
    const tenantId = "tenant-demo-mgr";
    const userId = "user-demo-mgr";
    await upsertTenant(tenantId, "GlobalCo People Team", "demo-mgr", {
      plan: "readiness",
      entitlementAssessment: true,
      entitlementAssessmentPaid: true,
      entitlementStrategyCompany: true,
      stripeStatus: "active",
    });
    await upsertUser(userId, tenantId, "manager@demo.aiq.com", "Marcus", "Manager", {
      onboardingCompleted: true,
      aiqRole: "cpo",
    });
    await assignRole(tenantId, userId, "manager");
    await ensureBlueprint(tenantId);
    const domainScores = makeDomainScores([5.8, 5.5, 6.0, 5.7, 5.4, 5.9]);
    await insertCompletedAssessment("sess-mgr-001", tenantId, userId, domainScores,
      new Date(Date.now() - 10 * 24 * 60 * 60 * 1000));
    console.log("✓ Persona 8: manager@demo.aiq.com (Manager, strategy, Proficient 5.7)");
  }

  await conn.end();

  console.log("\n=== All demo accounts created ===");
  console.log("\nAll accounts use password: Demo1234!");
  console.log("\nLogin at: https://hraiq.co.uk/login\n");
}

main().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
