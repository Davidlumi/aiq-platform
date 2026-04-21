/**
 * ACME Company Setup Script — corrected column names
 */
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── 1. Create ACME Tenant ──────────────────────────────────────────────────
const tenantId = 'tenant-acme-001';
await conn.query(`
  INSERT INTO tenants (id, name, slug, primary_domain, status, created_at, updated_at)
  VALUES (?, 'ACME Corporation', 'acme', 'acme.com', 'active', NOW(), NOW())
  ON DUPLICATE KEY UPDATE name='ACME Corporation', status='active', updated_at=NOW()
`, [tenantId]);
console.log('✓ ACME tenant created');

// ── 2. Create 10 HR Users ──────────────────────────────────────────────────
const users = [
  { id: 'acme-user-001', first: 'Sarah',   last: 'Mitchell',   email: 'sarah.mitchell@acme.com',   jobTitle: 'Chief People Officer',           expLevel: 'principal', aiLevel: 'advanced',  domain: 'strategic_hr' },
  { id: 'acme-user-002', first: 'James',   last: 'Okafor',     email: 'james.okafor@acme.com',     jobTitle: 'HR Business Partner',            expLevel: 'senior',    aiLevel: 'regular',   domain: 'employee_relations' },
  { id: 'acme-user-003', first: 'Priya',   last: 'Sharma',     email: 'priya.sharma@acme.com',     jobTitle: 'Talent Acquisition Manager',     expLevel: 'senior',    aiLevel: 'regular',   domain: 'talent_acquisition' },
  { id: 'acme-user-004', first: 'Tom',     last: 'Brennan',    email: 'tom.brennan@acme.com',      jobTitle: 'L&D Specialist',                 expLevel: 'mid',       aiLevel: 'occasional', domain: 'learning_development' },
  { id: 'acme-user-005', first: 'Aisha',   last: 'Kamara',     email: 'aisha.kamara@acme.com',     jobTitle: 'People Analytics Lead',          expLevel: 'senior',    aiLevel: 'advanced',  domain: 'people_analytics' },
  { id: 'acme-user-006', first: 'Daniel',  last: 'Park',       email: 'daniel.park@acme.com',      jobTitle: 'Compensation & Benefits Manager', expLevel: 'mid',      aiLevel: 'regular',   domain: 'compensation_benefits' },
  { id: 'acme-user-007', first: 'Fatima',  last: 'Al-Hassan',  email: 'fatima.alhassan@acme.com',  jobTitle: 'DEI Programme Manager',          expLevel: 'mid',       aiLevel: 'occasional', domain: 'dei' },
  { id: 'acme-user-008', first: 'Marcus',  last: 'Webb',       email: 'marcus.webb@acme.com',      jobTitle: 'HR Operations Manager',          expLevel: 'mid',       aiLevel: 'occasional', domain: 'hr_operations' },
  { id: 'acme-user-009', first: 'Claire',  last: 'Nguyen',     email: 'claire.nguyen@acme.com',    jobTitle: 'Workforce Planning Analyst',     expLevel: 'junior',    aiLevel: 'none',      domain: 'workforce_planning' },
  { id: 'acme-user-010', first: 'Ravi',    last: 'Patel',      email: 'ravi.patel@acme.com',       jobTitle: 'HR Graduate Trainee',            expLevel: 'junior',    aiLevel: 'none',      domain: 'general_hr' },
];

for (const u of users) {
  await conn.query(`
    INSERT INTO users (id, tenant_id, email, first_name, last_name, status,
      onboarding_completed, experience_level, ai_usage_level, job_function,
      onboarding_completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?, ?, NOW(), NOW(), NOW())
    ON DUPLICATE KEY UPDATE first_name=VALUES(first_name), last_name=VALUES(last_name), updated_at=NOW()
  `, [u.id, tenantId, u.email, u.first, u.last,
      u.expLevel,
      u.aiLevel,
      u.domain]);
}
console.log(`✓ ${users.length} ACME users created`);

// ── 3. Org Context ─────────────────────────────────────────────────────────
const [ailOrgCols] = await conn.query('SHOW COLUMNS FROM ail_org_context');
const orgCols = ailOrgCols.map(c => c.Field);
console.log('ail_org_context columns:', orgCols.join(', '));

if (orgCols.includes('sector')) {
  const orgContextId = randomUUID();
  await conn.query(`
    INSERT INTO ail_org_context (id, tenant_id, sector, headcount, risk_appetite_overall,
      primary_regulator, ai_maturity_level, has_ai_usage_policy, has_data_protection_policy,
      has_redundancy_policy, has_whistleblowing_policy, has_edi_policy,
      ai_ethics_committee, created_at, updated_at)
    VALUES (?, ?, 'financial_services', 2800, 'moderate',
      'ico', 'early_adopter', 1, 1, 1, 1, 1, 0, NOW(), NOW())
    ON DUPLICATE KEY UPDATE sector='financial_services', updated_at=NOW()
  `, [orgContextId, tenantId]);
  console.log('✓ ACME org context created');
} else {
  console.log('⚠ ail_org_context has different schema — skipping org context');
}

// ── 4. Fetch blueprints and scenarios ─────────────────────────────────────
const [blueprints] = await conn.query("SELECT id, name FROM assessment_blueprints WHERE status='published' LIMIT 3");
if (blueprints.length === 0) {
  // Create a default blueprint for ACME
  const bpId = 'bp-acme-standard';
  await conn.query(`
    INSERT INTO assessment_blueprints (id, tenant_id, \`key\`, name, version, role_scope_json, structure_json, status, created_at)
    VALUES (?, ?, 'acme-standard', 'ACME Standard Assessment', 1, '["all"]',
      '{"phases":["baseline","adaptive","validation"],"itemsPerPhase":{"baseline":5,"adaptive":5,"validation":3}}',
      'published', NOW())
    ON DUPLICATE KEY UPDATE name='ACME Standard Assessment'
  `, [bpId, tenantId]);
  blueprints.push({ id: bpId, name: 'ACME Standard Assessment' });
  console.log('✓ Created ACME assessment blueprint');
}

const [scenarios] = await conn.query(`
  SELECT cs.id, cs.interaction_id, cs.domain, cs.difficulty, cs.risk_level,
         cs.primary_signal, cs.governance_sensitive
  FROM content_scenarios cs
  WHERE cs.status = 'published'
  AND EXISTS (SELECT 1 FROM content_scenario_options cso WHERE cso.scenario_id = cs.id)
  ORDER BY RAND()
  LIMIT 150
`);

const [allOptions] = await conn.query(`
  SELECT cso.scenario_id, cso.id as option_id, cso.label as option_key, cso.outcome_class, cso.signal_deltas_json
  FROM content_scenario_options cso
`);

const optsByScenario = {};
for (const o of allOptions) {
  if (!optsByScenario[o.scenario_id]) optsByScenario[o.scenario_id] = [];
  optsByScenario[o.scenario_id].push(o);
}

console.log(`✓ ${blueprints.length} blueprints, ${scenarios.length} scenarios with options`);

// ── 5. Create assessment sessions ─────────────────────────────────────────
const blueprintId = blueprints[0].id;
const outcomeWeights = { excellent: 0.20, good: 0.35, acceptable: 0.25, weak: 0.12, poor: 0.05, critical_failure: 0.03 };

function pickWeightedOutcome(opts) {
  const r = Math.random();
  let cumulative = 0;
  const preferred = ['excellent','good','acceptable','weak','poor','critical_failure'];
  const sorted = [...opts].sort((a,b) => preferred.indexOf(a.outcome_class) - preferred.indexOf(b.outcome_class));
  for (const opt of sorted) {
    cumulative += (outcomeWeights[opt.outcome_class] || 0.1);
    if (r < cumulative) return opt;
  }
  return sorted[0];
}

function computeScore(answers) {
  const m = { excellent: 1.0, good: 0.75, acceptable: 0.5, weak: 0.25, poor: 0.1, critical_failure: 0.0 };
  return Math.min(1.0, answers.reduce((s, a) => s + (m[a.outcomeClass] || 0.5), 0) / answers.length);
}

const sessionCounts = [18, 15, 14, 12, 16, 13, 14, 12, 10, 8];
const sessionStates = ['completed','completed','completed','completed','completed','completed','completed','completed','in_progress','abandoned'];
const sessionData = [];

for (let i = 0; i < users.length; i++) {
  const user = users[i];
  const sessionId = `acme-session-${String(i+1).padStart(3,'0')}`;
  const state = sessionStates[i];
  const totalCount = sessionCounts[i];
  const answeredCount = state === 'completed' ? totalCount : Math.floor(totalCount * 0.6);
  const startedAt = new Date(Date.now() - (30 - i * 2) * 24 * 60 * 60 * 1000);
  const completedAt = state === 'completed' ? new Date(startedAt.getTime() + (45 + i * 5) * 60 * 1000) : null;

  await conn.query(`
    INSERT INTO assessment_sessions (id, tenant_id, user_id, blueprint_id, state,
      started_at, completed_at, session_metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, '{}', NOW())
    ON DUPLICATE KEY UPDATE state=VALUES(state), completed_at=VALUES(completed_at)
  `, [sessionId, tenantId, user.id, blueprintId, state, startedAt, completedAt]);

  const answers = [];
  const userScenarios = scenarios.slice((i * 15) % (scenarios.length - 20), (i * 15) % (scenarios.length - 20) + totalCount);

  for (let j = 0; j < answeredCount; j++) {
    const scenario = userScenarios[j % userScenarios.length];
    const opts = optsByScenario[scenario.id] || [];
    if (opts.length === 0) continue;

    const chosen = pickWeightedOutcome(opts);
    const confidence = parseFloat((0.4 + Math.random() * 0.5).toFixed(4));
    const timeMs = 15000 + Math.floor(Math.random() * 90000);

    await conn.query(`
      INSERT INTO assessment_answers (id, session_id, item_id, selected_value_json,
        confidence_score, time_to_answer_ms, revision_count, outcome_class,
        signal_deltas_json, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE outcome_class=VALUES(outcome_class)
    `, [randomUUID(), sessionId, scenario.id,
        JSON.stringify({ optionKey: chosen.option_key, label: chosen.option_key }),
        confidence, timeMs, Math.random() < 0.1 ? 1 : 0,
        chosen.outcome_class,
        (() => {
          try { JSON.parse(chosen.signal_deltas_json); return chosen.signal_deltas_json; } catch { return '{}'; }
        })()]);

    answers.push({ outcomeClass: chosen.outcome_class, confidence });
  }

  // Score for completed sessions
  if (state === 'completed' && answers.length > 0) {
    const overallScore = computeScore(answers);
    const avgConfidence = answers.reduce((s,a) => s + a.confidence, 0) / answers.length;
    const readiness = overallScore >= 0.75 ? 'verified' : overallScore >= 0.55 ? 'developing' : overallScore >= 0.35 ? 'at_risk' : 'restricted';

    const scoreBreakdown = {
      readiness_state: readiness,
      overall_score: parseFloat(overallScore.toFixed(4)),
      credibility_score: parseFloat((overallScore * (0.85 + Math.random() * 0.2)).toFixed(4)),
      confidence_calibration: parseFloat(avgConfidence.toFixed(4)),
      governance_score: parseFloat((overallScore * 0.9 + Math.random() * 0.1).toFixed(4)),
      total_answers: answers.length,
    };

    await conn.query(`
      INSERT INTO assessment_scores (id, session_id, overall_score, score_breakdown_json,
        signal_scores_json, generated_at, model_version)
      VALUES (?, ?, ?, ?, '{}', NOW(), '1.0')
      ON DUPLICATE KEY UPDATE overall_score=VALUES(overall_score), score_breakdown_json=VALUES(score_breakdown_json)
    `, [randomUUID(), sessionId, overallScore.toFixed(4), JSON.stringify(scoreBreakdown)]);

    sessionData.push({ name: `${user.first} ${user.last}`, role: user.jobTitle, state, answers: answers.length, score: overallScore.toFixed(2), readiness });
  } else {
    sessionData.push({ name: `${user.first} ${user.last}`, role: user.jobTitle, state, answers: answers.length, score: 'n/a', readiness: 'n/a' });
  }
}

// ── 6. AIL profiles ────────────────────────────────────────────────────────
const personas = ['strong_validator','overconfident_decision_maker','risk_averse_escalator','passive_deferrer','governance_anchor_under_pressure'];
for (let i = 0; i < users.length; i++) {
  const user = users[i];
  await conn.query(`
    INSERT INTO ail_user_intelligence_profiles (id, user_id, tenant_id,
      total_simulations_completed, total_assessments_completed,
      platform_engagement_score, created_at, updated_at)
    VALUES (?, ?, ?, 0, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE total_assessments_completed=VALUES(total_assessments_completed), updated_at=NOW()
  `, [randomUUID(), user.id, tenantId, i < 8 ? 1 : 0, (30 + i * 7).toFixed(1)]);

  await conn.query(`
    INSERT INTO ail_persona_profiles (id, user_id, tenant_id,
      primary_persona, persona_confidence,
      validation_orientation, governance_orientation, risk_orientation, communication_orientation,
      blind_acceptance_pattern, governance_bypass_pattern, over_cautious_pattern,
      contradiction_rigidity, communication_weakness, high_confidence_overconfidence,
      narrative_summary, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE primary_persona=VALUES(primary_persona), updated_at=NOW()
  `, [randomUUID(), user.id, tenantId,
      personas[i % personas.length],
      parseFloat((0.3 + Math.random() * 0.4).toFixed(3)),
      parseFloat((40 + Math.random() * 40).toFixed(1)),
      parseFloat((40 + Math.random() * 40).toFixed(1)),
      parseFloat((40 + Math.random() * 40).toFixed(1)),
      parseFloat((40 + Math.random() * 40).toFixed(1)),
      Math.random() < 0.3, Math.random() < 0.2, Math.random() < 0.25,
      Math.random() < 0.15, Math.random() < 0.2, Math.random() < 0.2,
      `Provisional persona based on onboarding signals for ${user.first} ${user.last}.`]);
}
console.log('✓ AIL profiles seeded for all 10 ACME users');

// ── 7. Summary ─────────────────────────────────────────────────────────────
console.log('\n── ACME Setup Complete ──────────────────────────────────────────────');
console.log(`${'Name'.padEnd(22)} ${'Role'.padEnd(35)} ${'State'.padEnd(12)} ${'Ans'.padStart(3)} ${'Score'.padStart(6)} Readiness`);
console.log('─'.repeat(100));
for (const s of sessionData) {
  console.log(`${s.name.padEnd(22)} ${s.role.padEnd(35)} ${s.state.padEnd(12)} ${String(s.answers).padStart(3)} ${String(s.score).padStart(6)} ${s.readiness}`);
}
console.log('─'.repeat(100));

await conn.end();
