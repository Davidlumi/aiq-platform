/**
 * Demo Org Seed Script
 * Creates 35 users across all 22 HR roles with org hierarchy
 * Seeds 80% assessment completion with realistic scores
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const conn = mysql.createPool(process.env.DATABASE_URL);
const TENANT_ID = 'tenant-demo-001';
const BLUEPRINT_ID = 'bp-aiq-v9-standard';
const DEMO_PASSWORD_HASH = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // password

// ─── ORG HIERARCHY ─────────────────────────────────────────────────────────────
// 8 HR Families, 22 roles, 35 users total
// Reporting structure: CHRO → HR Directors → HR Managers → HR Practitioners → HR Coordinators

const ORG = [
  // ── EXECUTIVE ──────────────────────────────────────────────────────────────
  {
    id: 'u-chro-001', email: 'sarah.chen@demo.aiq.com', firstName: 'Sarah', lastName: 'Chen',
    roleId: 'role-chro-001', roleKey: 'chro', family: 'Executive',
    title: 'Chief Human Resources Officer', level: 1, managerId: null,
    capability: { execution: 0.91, judgement: 0.88, risk: 0.85, workflow: 0.82, appropriateness: 0.90, data: 0.79 }
  },

  // ── TALENT ACQUISITION ─────────────────────────────────────────────────────
  {
    id: 'u-ta-dir-001', email: 'james.okafor@demo.aiq.com', firstName: 'James', lastName: 'Okafor',
    roleId: 'role-ta-dir-001', roleKey: 'ta_director', family: 'Talent Acquisition',
    title: 'Director of Talent Acquisition', level: 2, managerId: 'u-chro-001',
    capability: { execution: 0.84, judgement: 0.81, risk: 0.76, workflow: 0.88, appropriateness: 0.83, data: 0.72 }
  },
  {
    id: 'u-ta-mgr-001', email: 'priya.sharma@demo.aiq.com', firstName: 'Priya', lastName: 'Sharma',
    roleId: 'role-ta-mgr-001', roleKey: 'ta_manager', family: 'Talent Acquisition',
    title: 'Talent Acquisition Manager', level: 3, managerId: 'u-ta-dir-001',
    capability: { execution: 0.78, judgement: 0.74, risk: 0.68, workflow: 0.82, appropriateness: 0.77, data: 0.65 }
  },
  {
    id: 'u-ta-spec-001', email: 'marcus.williams@demo.aiq.com', firstName: 'Marcus', lastName: 'Williams',
    roleId: 'role-ta-spec-001', roleKey: 'ta_specialist', family: 'Talent Acquisition',
    title: 'Talent Acquisition Specialist', level: 4, managerId: 'u-ta-mgr-001',
    capability: { execution: 0.71, judgement: 0.65, risk: 0.58, workflow: 0.74, appropriateness: 0.70, data: 0.55 }
  },
  {
    id: 'u-ta-coord-001', email: 'lisa.nguyen@demo.aiq.com', firstName: 'Lisa', lastName: 'Nguyen',
    roleId: 'role-ta-coord-001', roleKey: 'ta_coordinator', family: 'Talent Acquisition',
    title: 'Recruitment Coordinator', level: 5, managerId: 'u-ta-mgr-001',
    capability: { execution: 0.62, judgement: 0.55, risk: 0.48, workflow: 0.67, appropriateness: 0.61, data: 0.44 }
  },

  // ── PEOPLE MANAGEMENT ──────────────────────────────────────────────────────
  {
    id: 'u-pm-dir-001', email: 'rachel.foster@demo.aiq.com', firstName: 'Rachel', lastName: 'Foster',
    roleId: 'role-pm-dir-001', roleKey: 'pm_director', family: 'People Management',
    title: 'Director of People Operations', level: 2, managerId: 'u-chro-001',
    capability: { execution: 0.86, judgement: 0.83, risk: 0.80, workflow: 0.85, appropriateness: 0.87, data: 0.74 }
  },
  {
    id: 'u-hrbp-sr-001', email: 'daniel.kim@demo.aiq.com', firstName: 'Daniel', lastName: 'Kim',
    roleId: 'role-hrbp-sr-001', roleKey: 'hrbp_senior', family: 'People Management',
    title: 'Senior HR Business Partner', level: 3, managerId: 'u-pm-dir-001',
    capability: { execution: 0.80, judgement: 0.78, risk: 0.74, workflow: 0.79, appropriateness: 0.82, data: 0.68 }
  },
  {
    id: 'u-hrbp-001', email: 'anna.kowalski@demo.aiq.com', firstName: 'Anna', lastName: 'Kowalski',
    roleId: 'role-hrbp-001', roleKey: 'hrbp', family: 'People Management',
    title: 'HR Business Partner', level: 4, managerId: 'u-hrbp-sr-001',
    capability: { execution: 0.72, judgement: 0.69, risk: 0.63, workflow: 0.73, appropriateness: 0.75, data: 0.60 }
  },
  {
    id: 'u-hrbp-002', email: 'tom.bradley@demo.aiq.com', firstName: 'Tom', lastName: 'Bradley',
    roleId: 'role-hrbp-001', roleKey: 'hrbp', family: 'People Management',
    title: 'HR Business Partner', level: 4, managerId: 'u-hrbp-sr-001',
    capability: { execution: 0.68, judgement: 0.64, risk: 0.59, workflow: 0.70, appropriateness: 0.71, data: 0.56 }
  },

  // ── EMPLOYEE RELATIONS ─────────────────────────────────────────────────────
  {
    id: 'u-er-mgr-001', email: 'claire.dubois@demo.aiq.com', firstName: 'Claire', lastName: 'Dubois',
    roleId: 'role-er-mgr-001', roleKey: 'er_manager', family: 'Employee Relations',
    title: 'Employee Relations Manager', level: 3, managerId: 'u-pm-dir-001',
    capability: { execution: 0.77, judgement: 0.82, risk: 0.85, workflow: 0.74, appropriateness: 0.88, data: 0.65 }
  },
  {
    id: 'u-er-adv-001', email: 'michael.santos@demo.aiq.com', firstName: 'Michael', lastName: 'Santos',
    roleId: 'role-er-adv-001', roleKey: 'er_advisor', family: 'Employee Relations',
    title: 'Employee Relations Advisor', level: 4, managerId: 'u-er-mgr-001',
    capability: { execution: 0.69, judgement: 0.73, risk: 0.76, workflow: 0.66, appropriateness: 0.80, data: 0.58 }
  },

  // ── LEARNING & DEVELOPMENT ─────────────────────────────────────────────────
  {
    id: 'u-ld-dir-001', email: 'nina.petrov@demo.aiq.com', firstName: 'Nina', lastName: 'Petrov',
    roleId: 'role-ld-dir-001', roleKey: 'ld_director', family: 'Learning & Development',
    title: 'Director of Learning & Development', level: 2, managerId: 'u-chro-001',
    capability: { execution: 0.83, judgement: 0.80, risk: 0.72, workflow: 0.86, appropriateness: 0.84, data: 0.77 }
  },
  {
    id: 'u-ld-mgr-001', email: 'ben.harrison@demo.aiq.com', firstName: 'Ben', lastName: 'Harrison',
    roleId: 'role-ld-mgr-001', roleKey: 'ld_manager', family: 'Learning & Development',
    title: 'L&D Manager', level: 3, managerId: 'u-ld-dir-001',
    capability: { execution: 0.76, judgement: 0.72, risk: 0.65, workflow: 0.80, appropriateness: 0.78, data: 0.70 }
  },
  {
    id: 'u-ld-spec-001', email: 'zoe.anderson@demo.aiq.com', firstName: 'Zoe', lastName: 'Anderson',
    roleId: 'role-ld-spec-001', roleKey: 'ld_specialist', family: 'Learning & Development',
    title: 'L&D Specialist', level: 4, managerId: 'u-ld-mgr-001',
    capability: { execution: 0.67, judgement: 0.63, risk: 0.56, workflow: 0.72, appropriateness: 0.70, data: 0.63 }
  },
  {
    id: 'u-ld-coord-001', email: 'ryan.murphy@demo.aiq.com', firstName: 'Ryan', lastName: 'Murphy',
    roleId: 'role-ld-coord-001', roleKey: 'ld_coordinator', family: 'Learning & Development',
    title: 'L&D Coordinator', level: 5, managerId: 'u-ld-mgr-001',
    capability: { execution: 0.58, judgement: 0.52, risk: 0.45, workflow: 0.63, appropriateness: 0.60, data: 0.50 }
  },

  // ── REWARD & COMPENSATION ──────────────────────────────────────────────────
  {
    id: 'u-rwd-dir-001', email: 'helen.zhao@demo.aiq.com', firstName: 'Helen', lastName: 'Zhao',
    roleId: 'role-rwd-dir-001', roleKey: 'reward_director', family: 'Reward & Compensation',
    title: 'Director of Reward & Compensation', level: 2, managerId: 'u-chro-001',
    capability: { execution: 0.85, judgement: 0.82, risk: 0.78, workflow: 0.81, appropriateness: 0.83, data: 0.88 }
  },
  {
    id: 'u-rwd-mgr-001', email: 'alex.turner@demo.aiq.com', firstName: 'Alex', lastName: 'Turner',
    roleId: 'role-rwd-mgr-001', roleKey: 'reward_manager', family: 'Reward & Compensation',
    title: 'Reward Manager', level: 3, managerId: 'u-rwd-dir-001',
    capability: { execution: 0.78, judgement: 0.75, risk: 0.71, workflow: 0.74, appropriateness: 0.76, data: 0.82 }
  },
  {
    id: 'u-rwd-anal-001', email: 'sophie.martin@demo.aiq.com', firstName: 'Sophie', lastName: 'Martin',
    roleId: 'role-rwd-anal-001', roleKey: 'reward_analyst', family: 'Reward & Compensation',
    title: 'Reward Analyst', level: 4, managerId: 'u-rwd-mgr-001',
    capability: { execution: 0.70, judgement: 0.66, risk: 0.62, workflow: 0.67, appropriateness: 0.69, data: 0.75 }
  },

  // ── ORGANISATIONAL DEVELOPMENT ─────────────────────────────────────────────
  {
    id: 'u-od-dir-001', email: 'carlos.reyes@demo.aiq.com', firstName: 'Carlos', lastName: 'Reyes',
    roleId: 'role-od-dir-001', roleKey: 'od_director', family: 'Organisational Development',
    title: 'Director of Organisational Development', level: 2, managerId: 'u-chro-001',
    capability: { execution: 0.82, judgement: 0.85, risk: 0.79, workflow: 0.80, appropriateness: 0.86, data: 0.76 }
  },
  {
    id: 'u-od-spec-001', email: 'emma.walsh@demo.aiq.com', firstName: 'Emma', lastName: 'Walsh',
    roleId: 'role-od-spec-001', roleKey: 'od_specialist', family: 'Organisational Development',
    title: 'OD Specialist', level: 3, managerId: 'u-od-dir-001',
    capability: { execution: 0.73, judgement: 0.76, risk: 0.70, workflow: 0.72, appropriateness: 0.78, data: 0.67 }
  },

  // ── HR ANALYTICS ───────────────────────────────────────────────────────────
  {
    id: 'u-hra-dir-001', email: 'david.park@demo.aiq.com', firstName: 'David', lastName: 'Park',
    roleId: 'role-hra-dir-001', roleKey: 'hra_director', family: 'HR Analytics',
    title: 'Director of HR Analytics', level: 2, managerId: 'u-chro-001',
    capability: { execution: 0.80, judgement: 0.78, risk: 0.74, workflow: 0.79, appropriateness: 0.77, data: 0.92 }
  },
  {
    id: 'u-hra-anal-001', email: 'jessica.lee@demo.aiq.com', firstName: 'Jessica', lastName: 'Lee',
    roleId: 'role-hra-anal-001', roleKey: 'hra_analyst', family: 'HR Analytics',
    title: 'People Analytics Analyst', level: 3, managerId: 'u-hra-dir-001',
    capability: { execution: 0.72, judgement: 0.69, risk: 0.65, workflow: 0.71, appropriateness: 0.68, data: 0.85 }
  },

  // ── HR OPERATIONS ──────────────────────────────────────────────────────────
  {
    id: 'u-hro-mgr-001', email: 'olivia.brown@demo.aiq.com', firstName: 'Olivia', lastName: 'Brown',
    roleId: 'role-hro-mgr-001', roleKey: 'hro_manager', family: 'HR Operations',
    title: 'HR Operations Manager', level: 3, managerId: 'u-pm-dir-001',
    capability: { execution: 0.79, judgement: 0.72, risk: 0.68, workflow: 0.83, appropriateness: 0.75, data: 0.69 }
  },
  {
    id: 'u-hro-spec-001', email: 'noah.clark@demo.aiq.com', firstName: 'Noah', lastName: 'Clark',
    roleId: 'role-hro-spec-001', roleKey: 'hro_specialist', family: 'HR Operations',
    title: 'HR Operations Specialist', level: 4, managerId: 'u-hro-mgr-001',
    capability: { execution: 0.70, judgement: 0.63, risk: 0.58, workflow: 0.75, appropriateness: 0.67, data: 0.61 }
  },
  {
    id: 'u-hro-coord-001', email: 'ava.robinson@demo.aiq.com', firstName: 'Ava', lastName: 'Robinson',
    roleId: 'role-hro-coord-001', roleKey: 'hro_coordinator', family: 'HR Operations',
    title: 'HR Coordinator', level: 5, managerId: 'u-hro-mgr-001',
    capability: { execution: 0.61, judgement: 0.54, risk: 0.48, workflow: 0.66, appropriateness: 0.59, data: 0.52 }
  },
  {
    id: 'u-hro-admin-001', email: 'liam.wilson@demo.aiq.com', firstName: 'Liam', lastName: 'Wilson',
    roleId: 'role-hro-admin-001', roleKey: 'hro_admin', family: 'HR Operations',
    title: 'HR Administrator', level: 5, managerId: 'u-hro-mgr-001',
    capability: { execution: 0.55, judgement: 0.48, risk: 0.42, workflow: 0.60, appropriateness: 0.53, data: 0.45 }
  },
];

// 80% of users get completed assessments (28 out of 35)
const COMPLETION_RATE = 0.80;

// Capability keys used in the system
const CAPABILITY_KEYS = ['execution', 'judgement', 'risk', 'workflow', 'appropriateness', 'data'];

// Signal keys used in scoring
const SIGNAL_KEYS = [
  'ai_execution', 'ai_judgement', 'risk_awareness', 'workflow_integration',
  'appropriateness', 'data_literacy', 'governance_sensitivity', 'confidence_calibration'
];

function generateSessionId() {
  return 'sess-demo-' + randomUUID().replace(/-/g, '').substring(0, 16);
}

function generateAnswerId() {
  return 'ans-demo-' + randomUUID().replace(/-/g, '').substring(0, 16);
}

function generateScoreId() {
  return 'score-demo-' + randomUUID().replace(/-/g, '').substring(0, 16);
}

function generateCredibilityId() {
  return 'cred-demo-' + randomUUID().replace(/-/g, '').substring(0, 16);
}

function generateStateId() {
  return 'state-demo-' + randomUUID().replace(/-/g, '').substring(0, 16);
}

// Generate a realistic score breakdown based on capability profile
function generateScoreBreakdown(capProfile) {
  const breakdown = {};
  for (const [cap, score] of Object.entries(capProfile)) {
    // Add some variance (±0.08)
    const variance = (Math.random() - 0.5) * 0.16;
    breakdown[cap] = Math.min(1.0, Math.max(0.0, score + variance));
  }
  return breakdown;
}

// Generate signal scores based on capability profile
function generateSignalScores(capProfile) {
  const signals = {};
  const capMap = {
    ai_execution: capProfile.execution,
    ai_judgement: capProfile.judgement,
    risk_awareness: capProfile.risk,
    workflow_integration: capProfile.workflow,
    appropriateness: capProfile.appropriateness,
    data_literacy: capProfile.data,
    governance_sensitivity: (capProfile.risk + capProfile.appropriateness) / 2,
    confidence_calibration: (capProfile.judgement + capProfile.execution) / 2,
  };
  for (const [sig, base] of Object.entries(capMap)) {
    const variance = (Math.random() - 0.5) * 0.12;
    signals[sig] = Math.min(1.0, Math.max(0.0, base + variance));
  }
  return signals;
}

// Calculate overall score as weighted average
function calculateOverallScore(breakdown) {
  const weights = { execution: 0.20, judgement: 0.20, risk: 0.18, workflow: 0.17, appropriateness: 0.15, data: 0.10 };
  let total = 0;
  let weightSum = 0;
  for (const [cap, score] of Object.entries(breakdown)) {
    const w = weights[cap] || 0.1;
    total += score * w;
    weightSum += w;
  }
  return total / weightSum;
}

// Determine readiness band
function getReadinessBand(score) {
  if (score >= 0.85) return 'ADVANCED';
  if (score >= 0.70) return 'PROFICIENT';
  if (score >= 0.55) return 'DEVELOPING';
  return 'FOUNDATIONAL';
}

// Generate credibility band
function getCredibilityBand(score) {
  if (score >= 0.80) return 'HIGH';
  if (score >= 0.60) return 'MODERATE';
  return 'LOW';
}

// Generate realistic answers for a session (15 items)
function generateAnswers(sessionId, items, capProfile) {
  const answers = [];
  const itemCount = Math.min(15, items.length);
  const selectedItems = items.slice(0, itemCount);

  for (const item of selectedItems) {
    const meta = typeof item.metadata_json === 'string' ? JSON.parse(item.metadata_json) : (item.metadata_json || {});
    const capKey = meta.capability_key || meta.capabilityKey || 'execution';
    const baseScore = capProfile[capKey] || 0.65;
    const isCorrect = Math.random() < baseScore;

    const signalDeltas = {};
    for (const sig of SIGNAL_KEYS) {
      signalDeltas[sig] = isCorrect ? (Math.random() * 0.15 + 0.02) : -(Math.random() * 0.12 + 0.01);
    }

    answers.push({
      id: generateAnswerId(),
      session_id: sessionId,
      item_id: item.id,
      selected_value_json: JSON.stringify({ option: isCorrect ? 'A' : 'B', value: isCorrect ? 1 : 0 }),
      free_text: null,
      confidence_score: Math.round((baseScore + (Math.random() - 0.5) * 0.2) * 100) / 100,
      time_to_answer_ms: Math.floor(Math.random() * 45000 + 15000),
      revision_count: Math.random() < 0.15 ? 1 : 0,
      correctness: isCorrect ? 1.0 : 0.0,
      submitted_at: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
      outcome_class: isCorrect ? 'correct' : 'incorrect',
      signal_deltas_json: JSON.stringify(signalDeltas),
      event_codes_json: JSON.stringify([]),
    });
  }
  return answers;
}

async function run() {
  console.log('🚀 Starting demo org seed...');

  // 1. Get existing items for answers
  const [items] = await conn.query('SELECT id, metadata_json, difficulty FROM assessment_items LIMIT 50');
  console.log(`📦 Found ${items.length} assessment items`);

  // 2. Seed users
  console.log('\n👥 Creating demo users...');
  for (const user of ORG) {
    await conn.query(
      `INSERT IGNORE INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [user.id, TENANT_ID, user.email, user.firstName, user.lastName, DEMO_PASSWORD_HASH]
    );

    // Assign role in user_roles
    const urId = 'ur-demo-' + user.id.replace('u-', '');
    await conn.query(
      `INSERT IGNORE INTO user_roles (id, tenant_id, user_id, role_id, assigned_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [urId, TENANT_ID, user.id, user.roleId]
    );

    console.log(`  ✓ ${user.firstName} ${user.lastName} — ${user.title}`);
  }

  // 3. Seed assessment sessions (80% completion)
  console.log('\n📋 Creating assessment sessions (80% completion rate)...');
  const completedUsers = ORG.filter((_, i) => i < Math.ceil(ORG.length * COMPLETION_RATE));
  const incompleteUsers = ORG.filter((_, i) => i >= Math.ceil(ORG.length * COMPLETION_RATE));

  console.log(`  Completed: ${completedUsers.length} users`);
  console.log(`  In-progress/Not started: ${incompleteUsers.length} users`);

  for (const user of completedUsers) {
    const sessionId = generateSessionId();
    const startedAt = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
    const completedAt = new Date(startedAt.getTime() + Math.floor(Math.random() * 90 * 60 * 1000 + 30 * 60 * 1000));

    const sessionMeta = {
      roleHint: user.roleKey,
      family: user.family,
      level: user.level,
      phase: 'completed',
      itemsAnswered: 15,
      totalItems: 15,
    };

    await conn.query(
      `INSERT IGNORE INTO assessment_sessions (id, tenant_id, user_id, blueprint_id, state, started_at, completed_at, session_metadata_json, created_at)
       VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?)`,
      [sessionId, TENANT_ID, user.id, BLUEPRINT_ID, startedAt, completedAt, JSON.stringify(sessionMeta), startedAt]
    );

    // Generate and insert answers
    const answers = generateAnswers(sessionId, items, user.capability);
    for (const ans of answers) {
      await conn.query(
        `INSERT IGNORE INTO assessment_answers (id, session_id, item_id, selected_value_json, free_text, confidence_score, time_to_answer_ms, revision_count, correctness, submitted_at, outcome_class, signal_deltas_json, event_codes_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ans.id, ans.session_id, ans.item_id, ans.selected_value_json, ans.free_text, ans.confidence_score,
         ans.time_to_answer_ms, ans.revision_count, ans.correctness, ans.submitted_at,
         ans.outcome_class, ans.signal_deltas_json, ans.event_codes_json]
      );
    }

    // Generate score
    const breakdown = generateScoreBreakdown(user.capability);
    const signalScores = generateSignalScores(user.capability);
    const overallScore = calculateOverallScore(breakdown);
    const scoreId = generateScoreId();

    await conn.query(
      `INSERT IGNORE INTO assessment_scores (id, session_id, overall_score, score_breakdown_json, signal_scores_json, generated_at, model_version)
       VALUES (?, ?, ?, ?, ?, ?, 'v9.2')`,
      [scoreId, sessionId, overallScore, JSON.stringify(breakdown), JSON.stringify(signalScores), completedAt]
    );

    // Generate credibility score
    const credScore = (overallScore + user.capability.judgement) / 2;
    const credBand = getCredibilityBand(credScore);
    const credId = generateCredibilityId();

    await conn.query(
      `INSERT IGNORE INTO credibility_scores (id, user_id, assessment_session_id, credibility_score, band, reason_json, model_version, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'v9.2', ?)`,
      [credId, user.id, sessionId, credScore, credBand, JSON.stringify({ consistency: credScore, confidence_accuracy: credScore * 0.95 }), completedAt]
    );

    // Generate user state
    const band = getReadinessBand(overallScore);
    const stateId = generateStateId();

    await conn.query(
      `INSERT IGNORE INTO user_states (id, user_id, primary_state, credibility_state, risk_state, learning_state, compliance_state, effective_from, state_reason_json)
       VALUES (?, ?, ?, ?, ?, ?, 'compliant', ?, ?)`,
      [stateId, user.id, band, credBand, overallScore < 0.6 ? 'HIGH_RISK' : 'STANDARD',
       band === 'ADVANCED' ? 'OPTIONAL' : 'REQUIRED', completedAt,
       JSON.stringify({ overallScore, band, sessionId })]
    );

    console.log(`  ✓ ${user.firstName} ${user.lastName} — score: ${(overallScore * 100).toFixed(1)}% (${band})`);
  }

  // 4. Seed in-progress sessions for remaining 20%
  console.log('\n📋 Creating in-progress sessions for remaining users...');
  for (const user of incompleteUsers) {
    const sessionId = generateSessionId();
    const startedAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
    const itemsAnswered = Math.floor(Math.random() * 8 + 3); // 3-10 items answered

    const sessionMeta = {
      roleHint: user.roleKey,
      family: user.family,
      level: user.level,
      phase: 'adaptive',
      itemsAnswered,
      totalItems: 15,
    };

    await conn.query(
      `INSERT IGNORE INTO assessment_sessions (id, tenant_id, user_id, blueprint_id, state, started_at, session_metadata_json, created_at)
       VALUES (?, ?, ?, ?, 'in_progress', ?, ?, ?)`,
      [sessionId, TENANT_ID, user.id, BLUEPRINT_ID, startedAt, JSON.stringify(sessionMeta), startedAt]
    );

    // Partial answers
    const answers = generateAnswers(sessionId, items.slice(0, itemsAnswered), user.capability);
    for (const ans of answers) {
      await conn.query(
        `INSERT IGNORE INTO assessment_answers (id, session_id, item_id, selected_value_json, free_text, confidence_score, time_to_answer_ms, revision_count, correctness, submitted_at, outcome_class, signal_deltas_json, event_codes_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ans.id, ans.session_id, ans.item_id, ans.selected_value_json, ans.free_text, ans.confidence_score,
         ans.time_to_answer_ms, ans.revision_count, ans.correctness, ans.submitted_at,
         ans.outcome_class, ans.signal_deltas_json, ans.event_codes_json]
      );
    }

    console.log(`  ⏳ ${user.firstName} ${user.lastName} — in progress (${itemsAnswered}/15 items)`);
  }

  // 5. Final counts
  const [[{ userCount }]] = await conn.query('SELECT COUNT(*) as userCount FROM users WHERE tenant_id = ?', [TENANT_ID]);
  const [[{ sessionCount }]] = await conn.query('SELECT COUNT(*) as sessionCount FROM assessment_sessions WHERE tenant_id = ?', [TENANT_ID]);
  const [[{ answerCount }]] = await conn.query('SELECT COUNT(*) as answerCount FROM assessment_answers a JOIN assessment_sessions s ON a.session_id = s.id WHERE s.tenant_id = ?', [TENANT_ID]);
  const [[{ scoreCount }]] = await conn.query('SELECT COUNT(*) as scoreCount FROM assessment_scores sc JOIN assessment_sessions s ON sc.session_id = s.id WHERE s.tenant_id = ?', [TENANT_ID]);

  console.log('\n✅ Demo org seed complete!');
  console.log(`   Users: ${userCount}`);
  console.log(`   Sessions: ${sessionCount}`);
  console.log(`   Answers: ${answerCount}`);
  console.log(`   Scores: ${scoreCount}`);

  process.exit(0);
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
