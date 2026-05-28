/**
 * add-reward-leader.mjs
 * Adds a Reward Leader test user to the Acme demo org.
 *
 * User: Rachel Pemberton — Head of Reward & Compensation
 * Email: rachel.pemberton@acme.co.uk
 * Password: manutd99
 * aiq_role: reward_leader
 * mode: reward (tenant-level, but user is flagged as reward_leader)
 */
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

// Parse DATABASE_URL  (mysql://user:pass@host:port/db)
const url = new URL(DB_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Adding Reward Leader test user to Acme…");

  // ── 1. Resolve tenant ──────────────────────────────────────────────────────
  const [tenantRows] = await conn.execute(
    "SELECT id FROM tenants WHERE LOWER(slug) = 'acme' LIMIT 1"
  );
  if (!tenantRows[0]) { console.error("Acme tenant not found — run seed-acme.mjs first"); process.exit(1); }
  const TENANT_ID = tenantRows[0].id;
  console.log(`  Tenant ID: ${TENANT_ID}`);

  // ── 2. Hash password ───────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("manutd99", 10);

  // ── 3. Insert user ─────────────────────────────────────────────────────────
  const USER_ID = "u-acme-reward-001";
  const USER_EMAIL = "rachel.pemberton@acme.co.uk";

  await conn.execute(`
    INSERT INTO users (
      id, tenant_id, email, first_name, last_name, password_hash,
      status, onboarding_completed,
      experience_level, ai_usage_level,
      job_function, seniority_level, sector, role_family,
      aiq_role,
      created_at, updated_at
    )
    VALUES (?, ?, ?, 'Rachel', 'Pemberton', ?, 'active', 1,
      'senior', 'regular',
      'Head of Reward & Compensation', 'senior', 'Professional Services', 'Reward',
      'reward_leader',
      NOW(), NOW()
    )
    ON DUPLICATE KEY UPDATE
      first_name = 'Rachel',
      last_name  = 'Pemberton',
      password_hash = VALUES(password_hash),
      aiq_role = 'reward_leader',
      status = 'active',
      onboarding_completed = 1,
      updated_at = NOW()
  `, [USER_ID, TENANT_ID, USER_EMAIL, passwordHash]);
  console.log(`  ✓ User created: ${USER_EMAIL}`);

  // ── 4. Assign hr_leader role (same as Sarah Thornton) ─────────────────────
  const UR_ID = `ur-${USER_ID}`;
  await conn.execute(`
    INSERT INTO user_roles (id, tenant_id, user_id, role_id, assigned_at)
    VALUES (?, ?, ?, 'role-hl-001', NOW())
    ON DUPLICATE KEY UPDATE role_id = 'role-hl-001'
  `, [UR_ID, TENANT_ID, USER_ID]);
  console.log("  ✓ hr_leader role assigned");

  // ── 5. Seed a completed assessment session ─────────────────────────────────
  const SESSION_ID = `sess-acme-${USER_ID}`;
  const SCORE_ID   = `score-acme-${USER_ID}`;
  const completedAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const startedAt   = new Date(completedAt.getTime() - 22 * 60 * 1000);

  // Reward Leader: strong on AI interaction & output eval, developing on change leadership
  const capabilityScores = {
    ai_interaction:        { score: 74, band: "developing", label: "AI Interaction" },
    ai_output_evaluation:  { score: 79, band: "capable",    label: "AI Output Evaluation" },
    ai_workflow_design:    { score: 68, band: "developing", label: "AI Workflow Design" },
    ai_ethics_trust:       { score: 81, band: "capable",    label: "AI Ethics & Trust" },
    ai_change_leadership:  { score: 62, band: "developing", label: "AI Change Leadership" },
    workforce_ai_readiness:{ score: 71, band: "developing", label: "Workforce AI Readiness" },
  };
  const overallScore = 73;

  const scoreBreakdown = {
    readiness: { state: "safe", label: "AI Ready", description: "Demonstrates sufficient capability to use AI tools in Reward & Compensation workflows with appropriate oversight." },
    primaryState: "safe",
    overallScore,
    capabilityScores,
    narrative: "Rachel demonstrates strong AI capability in output evaluation and ethics, reflecting the rigour required in reward analytics. Workflow design and change leadership represent the primary development opportunities.",
    llmNarrative: {
      strengths: "Rachel demonstrates strong capability in AI output evaluation and ethics & trust, particularly relevant to reward benchmarking and pay equity analysis. Shows a systematic approach to validating AI-generated compensation insights.",
      gaps: "AI change leadership and workflow design represent the most significant development areas. Building structured frameworks for AI adoption within the Reward team would strengthen overall capability.",
      priorities: "1. Develop AI change leadership skills to support team adoption of AI-assisted reward analytics. 2. Build more robust AI workflow design capability for compensation benchmarking processes.",
    },
    credibilityBand: "high",
    riskBand: "low",
    totalAnswers: 42,
    targetItems: 49,
    governanceAction: "permit_supervised",
    governingConstraint: null,
    classificationConfidence: { band: "high", label: "High confidence" },
  };

  await conn.execute(`
    INSERT INTO assessment_sessions (id, tenant_id, user_id, blueprint_id, state, started_at, completed_at, session_metadata_json, norm_group_version, locale_code, device_type, scoring_config_version_at_start, created_at)
    VALUES (?, ?, ?, 'bp-aiq-v10-standard', 'completed', ?, ?, ?, 'v1-synthetic', 'en-GB', 'desktop', 1, ?)
    ON DUPLICATE KEY UPDATE state='completed', completed_at=VALUES(completed_at)
  `, [SESSION_ID, TENANT_ID, USER_ID, startedAt, completedAt, JSON.stringify({ roleHint: 'Head of Reward & Compensation', dept: 'Reward' }), startedAt]);

  await conn.execute(`
    INSERT INTO assessment_scores (id, session_id, overall_score, score_breakdown_json, signal_scores_json, generated_at, model_version, scoring_config_version)
    VALUES (?, ?, ?, ?, '{}', ?, 'v10', 1)
    ON DUPLICATE KEY UPDATE overall_score=VALUES(overall_score), score_breakdown_json=VALUES(score_breakdown_json)
  `, [SCORE_ID, SESSION_ID, overallScore, JSON.stringify(scoreBreakdown), completedAt]);
  console.log("  ✓ Assessment session seeded (score: 73/100 — safe)");

  // ── 6. Seed credibility + risk scores ─────────────────────────────────────
  await conn.execute(`
    INSERT INTO credibility_scores (id, user_id, assessment_session_id, credibility_score, band, reason_json, model_version, generated_at)
    VALUES (?, ?, ?, 0.84, 'high', '{"consistency":0.84,"calibration":0.79}', 'v1', ?)
    ON DUPLICATE KEY UPDATE credibility_score=0.84
  `, [`cred-${USER_ID}`, USER_ID, SESSION_ID, completedAt]);

  await conn.execute(`
    INSERT INTO risk_scores (id, user_id, risk_score, band, reason_json, model_version, generated_at)
    VALUES (?, ?, 0.26, 'low', '{"roleSensitivity":"high","gapSeverity":"low"}', 'v1', ?)
    ON DUPLICATE KEY UPDATE risk_score=0.26
  `, [`risk-${USER_ID}`, USER_ID, completedAt]);

  // ── 7. Seed user state ─────────────────────────────────────────────────────
  await conn.execute(`
    INSERT INTO user_states (id, user_id, primary_state, credibility_state, risk_state, learning_state, compliance_state, effective_from, state_reason_json)
    VALUES (?, ?, 'safe', 'high', 'low', 'active', 'compliant', ?, '{"classifiedBy":"scoring_engine_v10","overallScore":73}')
    ON DUPLICATE KEY UPDATE primary_state='safe', credibility_state='high', risk_state='low'
  `, [`us-${USER_ID}`, USER_ID, completedAt]);
  console.log("  ✓ User state seeded");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  REWARD LEADER TEST USER — CREATED");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Company code : acme");
  console.log("  Email        : rachel.pemberton@acme.co.uk");
  console.log("  Password     : manutd99");
  console.log("  Role         : Reward Leader (aiq_role = reward_leader)");
  console.log("  Score        : 73/100 — safe");
  console.log("═══════════════════════════════════════════════════════\n");

  await conn.end();
}

main().then(() => process.exit(0)).catch(err => { console.error("FAILED:", err); process.exit(1); });
