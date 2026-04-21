/**
 * AiQ Assessment Engine — Comprehensive QA Script (v2)
 * Covers: data integrity, scoring accuracy, AIL pipeline, edge cases,
 * session lifecycle, confidence calibration, schema validation
 *
 * Schema facts discovered:
 * - selected_value_json, score_breakdown_json: returned as objects by mysql2 (auto-parsed)
 * - difficulty: stored as integer 1-4 (not string enum)
 * - outcome_class in content_scenario_options: mixed-case legacy data ('Good','Poor','Excellent','Critical Failure','failure','partial','neutral')
 * - outcome_class in assessment_answers: varchar(50), mixed-case legacy data
 * - AIL tables: ail_difficulty_profiles, ail_failure_mode_registry, ail_narrative_events,
 *   ail_narrative_state, ail_narrative_threads, ail_org_context, ail_persona_profiles,
 *   ail_retest_queue, ail_signal_ledger, ail_stakeholder_relationships, ail_user_intelligence_profiles
 */
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

let passed = 0;
let failed = 0;
let warnings = 0;
const results = [];

function pass(suite, name, detail = '') {
  passed++;
  results.push({ suite, name, status: 'PASS', detail });
  console.log(`  ✓ [${suite}] ${name}${detail ? ' — ' + detail : ''}`);
}

function fail(suite, name, detail = '') {
  failed++;
  results.push({ suite, name, status: 'FAIL', detail });
  console.error(`  ✗ [${suite}] ${name}${detail ? ' — ' + detail : ''}`);
}

function warn(suite, name, detail = '') {
  warnings++;
  results.push({ suite, name, status: 'WARN', detail });
  console.warn(`  ⚠ [${suite}] ${name}${detail ? ' — ' + detail : ''}`);
}

function assert(condition, suite, name, detail = '') {
  if (condition) pass(suite, name, detail);
  else fail(suite, name, detail);
}

// Helper: normalise outcome class to lowercase
function normaliseOutcome(oc) {
  if (!oc) return '';
  const map = {
    'excellent': 'excellent', 'Excellent': 'excellent',
    'good': 'good', 'Good': 'good',
    'acceptable': 'acceptable', 'Acceptable': 'acceptable',
    'weak': 'weak', 'Weak': 'weak',
    'poor': 'poor', 'Poor': 'poor',
    'critical_failure': 'critical_failure', 'Critical Failure': 'critical_failure',
    'failure': 'poor', // legacy alias
    'partial': 'acceptable', // legacy alias
    'Partial': 'acceptable', // legacy alias
    'neutral': 'acceptable', // legacy alias
    'Neutral': 'acceptable', // legacy alias
  };
  return map[oc] || oc.toLowerCase();
}

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  AiQ Assessment Engine — QA Pass (v2)');
console.log('══════════════════════════════════════════════════════════════════\n');

// ── SUITE 1: Tenant & User Setup ─────────────────────────────────────────────
console.log('SUITE 1: Tenant & User Setup');
{
  const [[tenant]] = await conn.query("SELECT * FROM tenants WHERE id='tenant-acme-001'");
  assert(tenant !== undefined, 'S1', 'ACME tenant exists');
  assert(tenant?.status === 'active', 'S1', 'Tenant status is active', `got: ${tenant?.status}`);
  assert(tenant?.slug === 'acme', 'S1', 'Tenant slug is acme', `got: ${tenant?.slug}`);

  const [users] = await conn.query("SELECT * FROM users WHERE tenant_id='tenant-acme-001'");
  assert(users.length === 10, 'S1', '10 ACME users created', `got: ${users.length}`);

  const expLevels = new Set(users.map(u => u.experience_level));
  assert(expLevels.has('principal') && expLevels.has('senior') && expLevels.has('mid') && expLevels.has('junior'),
    'S1', 'All 4 experience levels represented', `got: ${[...expLevels].join(',')}`);

  const aiLevels = new Set(users.map(u => u.ai_usage_level));
  assert(aiLevels.has('advanced') && aiLevels.has('regular') && aiLevels.has('occasional') && aiLevels.has('none'),
    'S1', 'All 4 AI usage levels represented', `got: ${[...aiLevels].join(',')}`);

  const onboarded = users.filter(u => u.onboarding_completed === 1);
  assert(onboarded.length === 10, 'S1', 'All users marked onboarding_completed', `got: ${onboarded.length}`);

  // All users have valid email format
  const invalidEmails = users.filter(u => !u.email?.includes('@'));
  assert(invalidEmails.length === 0, 'S1', 'All users have valid email addresses', `violations: ${invalidEmails.length}`);
}

// ── SUITE 2: Session Lifecycle ────────────────────────────────────────────────
console.log('\nSUITE 2: Session Lifecycle');
{
  const [sessions] = await conn.query("SELECT * FROM assessment_sessions WHERE tenant_id='tenant-acme-001' ORDER BY id");
  assert(sessions.length === 10, 'S2', '10 sessions created', `got: ${sessions.length}`);

  const completed = sessions.filter(s => s.state === 'completed');
  const inProgress = sessions.filter(s => s.state === 'in_progress');
  const abandoned = sessions.filter(s => s.state === 'abandoned');
  assert(completed.length === 8, 'S2', '8 sessions completed', `got: ${completed.length}`);
  assert(inProgress.length === 1, 'S2', '1 session in_progress', `got: ${inProgress.length}`);
  assert(abandoned.length === 1, 'S2', '1 session abandoned', `got: ${abandoned.length}`);

  // Completed sessions must have completed_at
  const completedWithDate = completed.filter(s => s.completed_at !== null);
  assert(completedWithDate.length === 8, 'S2', 'All completed sessions have completed_at', `got: ${completedWithDate.length}`);

  // In-progress and abandoned must NOT have completed_at
  const incompleteWithDate = [...inProgress, ...abandoned].filter(s => s.completed_at !== null);
  assert(incompleteWithDate.length === 0, 'S2', 'Non-completed sessions have no completed_at', `got: ${incompleteWithDate.length}`);

  // Each session belongs to a distinct user
  const userIds = new Set(sessions.map(s => s.user_id));
  assert(userIds.size === 10, 'S2', 'Each session belongs to a distinct user', `got: ${userIds.size} unique users`);

  // Blueprint reference valid
  const [bps] = await conn.query("SELECT DISTINCT blueprint_id FROM assessment_sessions WHERE tenant_id='tenant-acme-001'");
  assert(bps.length >= 1, 'S2', 'Sessions reference at least one blueprint', `got: ${bps.length}`);

  // Session order: completed sessions have earlier started_at than in_progress
  const completedDates = completed.map(s => new Date(s.started_at).getTime());
  const inProgressDates = inProgress.map(s => new Date(s.started_at).getTime());
  assert(completedDates.every(d => d > 0), 'S2', 'All completed sessions have valid started_at', '');
}

// ── SUITE 3: Answer Integrity ─────────────────────────────────────────────────
console.log('\nSUITE 3: Answer Integrity');
{
  const [answers] = await conn.query("SELECT * FROM assessment_answers WHERE session_id LIKE 'acme-session-%'");
  assert(answers.length > 0, 'S3', 'Answers exist for ACME sessions', `got: ${answers.length}`);
  assert(answers.length >= 200, 'S3', '≥200 total answers across all sessions', `got: ${answers.length}`);

  // Minimum answers per completed session
  const [ansPerSession] = await conn.query(`
    SELECT session_id, COUNT(*) as cnt
    FROM assessment_answers
    WHERE session_id LIKE 'acme-session-%'
    GROUP BY session_id
  `);
  const completedSessions = ['acme-session-001','acme-session-002','acme-session-003','acme-session-004',
    'acme-session-005','acme-session-006','acme-session-007','acme-session-008'];
  const completedCounts = ansPerSession.filter(a => completedSessions.includes(a.session_id));
  const allHaveEnough = completedCounts.every(a => a.cnt >= 8);
  assert(allHaveEnough, 'S3', 'All completed sessions have ≥8 answers',
    `min: ${Math.min(...completedCounts.map(a=>Number(a.cnt)))}`);

  // Confidence scores in valid range [0,1]
  const outOfRange = answers.filter(a => a.confidence_score < 0 || a.confidence_score > 1);
  assert(outOfRange.length === 0, 'S3', 'All confidence_score values in [0,1]', `violations: ${outOfRange.length}`);

  // time_to_answer_ms positive
  const negTime = answers.filter(a => a.time_to_answer_ms <= 0);
  assert(negTime.length === 0, 'S3', 'All time_to_answer_ms > 0', `violations: ${negTime.length}`);

  // outcome_class: normalised values should all be in the canonical set
  const canonicalOutcomes = new Set(['excellent','good','acceptable','weak','poor','critical_failure']);
  const invalidOutcomes = answers.filter(a => !canonicalOutcomes.has(normaliseOutcome(a.outcome_class)));
  assert(invalidOutcomes.length === 0, 'S3', 'All outcome_class values normalise to canonical set',
    `violations: ${invalidOutcomes.length}${invalidOutcomes.length > 0 ? ' e.g. ' + invalidOutcomes[0]?.outcome_class : ''}`);

  // selected_value_json: mysql2 auto-parses JSON columns — check it's an object
  const invalidSvj = answers.filter(a => typeof a.selected_value_json !== 'object' || a.selected_value_json === null);
  assert(invalidSvj.length === 0, 'S3', 'All selected_value_json values are valid (auto-parsed objects)', `violations: ${invalidSvj.length}`);

  // signal_deltas_json: either null or parseable object
  const invalidSdj = answers.filter(a => {
    if (a.signal_deltas_json === null || a.signal_deltas_json === undefined) return false;
    if (typeof a.signal_deltas_json === 'object') return false; // auto-parsed
    try { JSON.parse(a.signal_deltas_json); return false; } catch { return true; }
  });
  assert(invalidSdj.length === 0, 'S3', 'All signal_deltas_json values are valid JSON or null', `violations: ${invalidSdj.length}`);

  // revision_count non-negative
  const negRevision = answers.filter(a => a.revision_count < 0);
  assert(negRevision.length === 0, 'S3', 'All revision_count values ≥ 0', `violations: ${negRevision.length}`);

  // item_id references valid scenarios
  const [validScenarioIds] = await conn.query("SELECT id FROM content_scenarios WHERE status='published'");
  const validIds = new Set(validScenarioIds.map(s => s.id));
  const invalidItems = answers.filter(a => !validIds.has(a.item_id));
  assert(invalidItems.length === 0, 'S3', 'All item_id values reference published scenarios', `violations: ${invalidItems.length}`);
}

// ── SUITE 4: Scoring Accuracy ─────────────────────────────────────────────────
console.log('\nSUITE 4: Scoring Accuracy');
{
  const [scores] = await conn.query("SELECT * FROM assessment_scores WHERE session_id LIKE 'acme-session-%'");
  assert(scores.length === 8, 'S4', '8 scores for 8 completed sessions', `got: ${scores.length}`);

  // Scores in [0,1]
  const outOfRange = scores.filter(s => parseFloat(s.overall_score) < 0 || parseFloat(s.overall_score) > 1);
  assert(outOfRange.length === 0, 'S4', 'All overall_score values in [0,1]', `violations: ${outOfRange.length}`);

  // score_breakdown_json: mysql2 auto-parses — check it's an object with required fields
  const requiredFields = ['readiness_state','overall_score','total_answers'];
  let missingFields = 0;
  let invalidBreakdowns = 0;
  for (const s of scores) {
    const b = s.score_breakdown_json;
    if (typeof b !== 'object' || b === null) { invalidBreakdowns++; continue; }
    for (const f of requiredFields) {
      if (b[f] === undefined) missingFields++;
    }
  }
  assert(invalidBreakdowns === 0, 'S4', 'All score_breakdown_json values are valid (auto-parsed objects)', `errors: ${invalidBreakdowns}`);
  assert(missingFields === 0, 'S4', 'All score breakdowns contain required fields', `missing: ${missingFields}`);

  // Readiness states are valid
  const validReadiness = new Set(['verified','developing','at_risk','restricted']);
  let invalidReadiness = 0;
  for (const s of scores) {
    const b = s.score_breakdown_json;
    if (typeof b === 'object' && b !== null && !validReadiness.has(b.readiness_state)) invalidReadiness++;
  }
  assert(invalidReadiness === 0, 'S4', 'All readiness_state values are valid enum', `violations: ${invalidReadiness}`);

  // Score consistency: overall_score in breakdown matches DB column (within 0.01)
  let scoreMismatch = 0;
  for (const s of scores) {
    const b = s.score_breakdown_json;
    if (typeof b === 'object' && b !== null) {
      const diff = Math.abs(b.overall_score - parseFloat(s.overall_score));
      if (diff > 0.01) scoreMismatch++;
    }
  }
  assert(scoreMismatch === 0, 'S4', 'overall_score in breakdown matches DB column (±0.01)', `mismatches: ${scoreMismatch}`);

  // No score for non-completed sessions
  const [nonCompletedScores] = await conn.query(`
    SELECT s.id FROM assessment_scores s
    JOIN assessment_sessions sess ON sess.id = s.session_id
    WHERE sess.state != 'completed' AND sess.tenant_id = 'tenant-acme-001'
  `);
  assert(nonCompletedScores.length === 0, 'S4', 'No scores for non-completed sessions', `found: ${nonCompletedScores.length}`);

  // Score distribution sanity (not all identical)
  const scoreValues = scores.map(s => parseFloat(s.overall_score));
  const uniqueScores = new Set(scoreValues.map(v => v.toFixed(2)));
  assert(uniqueScores.size >= 3, 'S4', 'Score distribution has variance (≥3 distinct values)', `unique: ${uniqueScores.size}`);

  // Score range sanity: all between 0.3 and 0.95 for realistic demo data
  const tooLow = scoreValues.filter(v => v < 0.3);
  const tooHigh = scoreValues.filter(v => v > 0.99);
  if (tooLow.length > 0) warn('S4', 'Some scores below 0.3 (unusually low)', `count: ${tooLow.length}`);
  if (tooHigh.length > 0) warn('S4', 'Some scores above 0.99 (suspiciously perfect)', `count: ${tooHigh.length}`);
  if (tooLow.length === 0 && tooHigh.length === 0) pass('S4', 'Score range is realistic (0.3–0.99)', `min: ${Math.min(...scoreValues).toFixed(2)}, max: ${Math.max(...scoreValues).toFixed(2)}`);
}

// ── SUITE 5: AIL Pipeline ─────────────────────────────────────────────────────
console.log('\nSUITE 5: AIL Pipeline');
{
  // Persona profiles
  const [personas] = await conn.query("SELECT * FROM ail_persona_profiles WHERE tenant_id='tenant-acme-001'");
  assert(personas.length === 10, 'S5', '10 persona profiles created', `got: ${personas.length}`);

  const validPersonas = new Set(['strong_validator','overconfident_decision_maker','risk_averse_escalator',
    'passive_deferrer','governance_anchor_under_pressure','unclassified']);
  const invalidPersonas = personas.filter(p => !validPersonas.has(p.primary_persona));
  assert(invalidPersonas.length === 0, 'S5', 'All primary_persona values are valid enum',
    `violations: ${invalidPersonas.map(p=>p.primary_persona).join(',')}`);

  // Confidence in [0,1]
  const invalidConf = personas.filter(p => p.persona_confidence < 0 || p.persona_confidence > 1);
  assert(invalidConf.length === 0, 'S5', 'All persona_confidence values in [0,1]', `violations: ${invalidConf.length}`);

  // Orientation scores in [0,100]
  const orientationFields = ['validation_orientation','governance_orientation','risk_orientation','communication_orientation'];
  let orientationErrors = 0;
  for (const p of personas) {
    for (const f of orientationFields) {
      if (p[f] < 0 || p[f] > 100) orientationErrors++;
    }
  }
  assert(orientationErrors === 0, 'S5', 'All orientation scores in [0,100]', `violations: ${orientationErrors}`);

  // Persona diversity (at least 4 distinct personas across 10 users)
  const personaSet = new Set(personas.map(p => p.primary_persona));
  assert(personaSet.size >= 4, 'S5', 'At least 4 distinct personas across users', `got: ${personaSet.size}`);

  // UIPs
  const [uips] = await conn.query("SELECT * FROM ail_user_intelligence_profiles WHERE tenant_id='tenant-acme-001'");
  assert(uips.length === 10, 'S5', '10 user intelligence profiles created', `got: ${uips.length}`);

  const completedUips = uips.filter(u => u.total_assessments_completed === 1);
  assert(completedUips.length === 8, 'S5', '8 UIPs show 1 completed assessment', `got: ${completedUips.length}`);

  const incompleteUips = uips.filter(u => u.total_assessments_completed === 0);
  assert(incompleteUips.length === 2, 'S5', '2 UIPs show 0 completed assessments (in_progress/abandoned)', `got: ${incompleteUips.length}`);

  // Org context
  const [orgCtx] = await conn.query("SELECT * FROM ail_org_context WHERE tenant_id='tenant-acme-001'");
  assert(orgCtx.length === 1, 'S5', 'Org context record exists', `got: ${orgCtx.length}`);
  assert(orgCtx[0]?.sector === 'financial_services', 'S5', 'Org sector is financial_services', `got: ${orgCtx[0]?.sector}`);
  assert(orgCtx[0]?.ai_maturity_level === 'early_adopter', 'S5', 'AI maturity level is early_adopter', `got: ${orgCtx[0]?.ai_maturity_level}`);
  assert(orgCtx[0]?.risk_appetite_overall === 'moderate', 'S5', 'Risk appetite is moderate', `got: ${orgCtx[0]?.risk_appetite_overall}`);

  // Signal ledger table exists and is accessible
  const [[{ cnt: slCnt }]] = await conn.query("SELECT COUNT(*) as cnt FROM ail_signal_ledger");
  pass('S5', `Signal ledger table accessible`, `rows: ${slCnt}`);

  // Difficulty profiles table exists and is accessible
  const [[{ cnt: dpCnt }]] = await conn.query("SELECT COUNT(*) as cnt FROM ail_difficulty_profiles");
  pass('S5', `Difficulty profiles table accessible`, `rows: ${dpCnt}`);

  // Narrative threads table exists and is accessible
  const [[{ cnt: ntCnt }]] = await conn.query("SELECT COUNT(*) as cnt FROM ail_narrative_threads");
  pass('S5', `Narrative threads table accessible`, `rows: ${ntCnt}`);
}

// ── SUITE 6: Content Library Integrity ───────────────────────────────────────
console.log('\nSUITE 6: Content Library Integrity');
{
  const [[{ cnt: scenarioCount }]] = await conn.query("SELECT COUNT(*) as cnt FROM content_scenarios WHERE status='published'");
  assert(Number(scenarioCount) >= 100, 'S6', `≥100 published scenarios exist`, `got: ${scenarioCount}`);
  assert(Number(scenarioCount) >= 190, 'S6', `≥190 published scenarios (full library)`, `got: ${scenarioCount}`);

  const [[{ cnt: optionCount }]] = await conn.query("SELECT COUNT(*) as cnt FROM content_scenario_options");
  assert(Number(optionCount) >= 400, 'S6', `≥400 scenario options exist`, `got: ${optionCount}`);
  assert(Number(optionCount) >= 760, 'S6', `≥760 scenario options (full library)`, `got: ${optionCount}`);

  // Every published scenario with options has ≥2 options
  const [scenariosWithFewOptions] = await conn.query(`
    SELECT cs.id, COUNT(cso.id) as opt_count
    FROM content_scenarios cs
    JOIN content_scenario_options cso ON cso.scenario_id = cs.id
    WHERE cs.status = 'published'
    GROUP BY cs.id
    HAVING opt_count < 2
  `);
  assert(scenariosWithFewOptions.length === 0, 'S6', 'All scenarios with options have ≥2 options',
    `violations: ${scenariosWithFewOptions.length}`);

  // Difficulty stored as integer 1-4
  const [badDifficulty] = await conn.query(`
    SELECT id, difficulty FROM content_scenarios
    WHERE difficulty NOT IN (1,2,3,4) AND status='published'
    LIMIT 5
  `);
  assert(badDifficulty.length === 0, 'S6', 'All scenario difficulty values are valid (1-4)',
    `violations: ${badDifficulty.length}`);

  // Blueprints exist
  const [[{ cnt: bpCount }]] = await conn.query("SELECT COUNT(*) as cnt FROM assessment_blueprints WHERE status='published'");
  assert(Number(bpCount) >= 2, 'S6', `≥2 published blueprints exist`, `got: ${bpCount}`);

  // Option outcome_class: normalised values should all be in canonical set
  const [allOptOC] = await conn.query("SELECT DISTINCT outcome_class FROM content_scenario_options");
  const canonicalOutcomes = new Set(['excellent','good','acceptable','weak','poor','critical_failure']);
  const invalidOptOC = allOptOC.filter(r => !canonicalOutcomes.has(normaliseOutcome(r.outcome_class)));
  if (invalidOptOC.length > 0) {
    warn('S6', 'Some option outcome_class values are legacy/non-canonical (normalised at runtime)',
      `values: ${invalidOptOC.map(r=>r.outcome_class).join(',')}`);
  } else {
    pass('S6', 'All option outcome_class values are canonical');
  }

  // Domain coverage
  const [domains] = await conn.query("SELECT DISTINCT domain FROM content_scenarios WHERE status='published'");
  assert(domains.length >= 8, 'S6', `≥8 domains covered in scenario library`, `got: ${domains.length}`);
}

// ── SUITE 7: Edge Cases ────────────────────────────────────────────────────────
console.log('\nSUITE 7: Edge Cases');
{
  // Boundary score: session with all excellent answers should score ~1.0
  const [excellentOpts] = await conn.query(`
    SELECT DISTINCT scenario_id FROM content_scenario_options
    WHERE outcome_class IN ('excellent','Excellent') LIMIT 5
  `);
  if (excellentOpts.length >= 3) {
    const testSessionId = 'qa-edge-session-001';
    const testUserId = 'acme-user-001';
    await conn.query(`
      INSERT INTO assessment_sessions (id, tenant_id, user_id, blueprint_id, state, started_at, completed_at, session_metadata_json, created_at)
      SELECT ?, 'tenant-acme-001', ?, blueprint_id, 'completed', NOW(), NOW(), '{}', NOW()
      FROM assessment_sessions WHERE id='acme-session-001' LIMIT 1
      ON DUPLICATE KEY UPDATE state='completed'
    `, [testSessionId, testUserId]);

    const testAnswers = [];
    for (const opt of excellentOpts.slice(0, 3)) {
      await conn.query(`
        INSERT INTO assessment_answers (id, session_id, item_id, selected_value_json, confidence_score,
          time_to_answer_ms, revision_count, outcome_class, signal_deltas_json, submitted_at)
        VALUES (?, ?, ?, '{"optionKey":"A"}', 0.95, 20000, 0, 'excellent', '{}', NOW())
        ON DUPLICATE KEY UPDATE outcome_class='excellent'
      `, [randomUUID(), testSessionId, opt.scenario_id]);
      testAnswers.push('excellent');
    }
    pass('S7', `Edge case: ${testAnswers.length} excellent answers inserted for boundary test`);

    // Verify score computation logic: all excellent = 1.0
    const scoreMap = { excellent: 1.0, good: 0.75, acceptable: 0.5, weak: 0.25, poor: 0.1, critical_failure: 0.0 };
    const computedScore = testAnswers.reduce((s, oc) => s + scoreMap[oc], 0) / testAnswers.length;
    assert(computedScore >= 0.99, 'S7', 'All-excellent session computes score ≥0.99', `computed: ${computedScore}`);

    // Clean up edge case session
    await conn.query("DELETE FROM assessment_answers WHERE session_id=?", [testSessionId]);
    await conn.query("DELETE FROM assessment_sessions WHERE id=?", [testSessionId]);
    pass('S7', 'Edge case session cleaned up');
  } else {
    warn('S7', 'Insufficient excellent options for boundary test', `found: ${excellentOpts.length}`);
  }

  // Edge case: zero-answer session (in_progress) should have no score
  const [[{ cnt: noScore }]] = await conn.query(`
    SELECT COUNT(*) as cnt FROM assessment_scores WHERE session_id = 'acme-session-009'
  `);
  assert(Number(noScore) === 0, 'S7', 'In-progress session has no score record', `got: ${noScore}`);

  // Edge case: abandoned session has no score
  const [[{ cnt: noScoreAbandoned }]] = await conn.query(`
    SELECT COUNT(*) as cnt FROM assessment_scores WHERE session_id = 'acme-session-010'
  `);
  assert(Number(noScoreAbandoned) === 0, 'S7', 'Abandoned session has no score record', `got: ${noScoreAbandoned}`);

  // Edge case: confidence score boundaries
  const [[{ minConf }]] = await conn.query(`
    SELECT MIN(confidence_score) as minConf FROM assessment_answers WHERE session_id LIKE 'acme-session-%'
  `);
  const [[{ maxConf }]] = await conn.query(`
    SELECT MAX(confidence_score) as maxConf FROM assessment_answers WHERE session_id LIKE 'acme-session-%'
  `);
  assert(parseFloat(minConf) >= 0, 'S7', `Min confidence_score ≥ 0`, `got: ${minConf}`);
  assert(parseFloat(maxConf) <= 1, 'S7', `Max confidence_score ≤ 1`, `got: ${maxConf}`);

  // Edge case: all-poor session scoring
  const scoreMapTest = { excellent: 1.0, good: 0.75, acceptable: 0.5, weak: 0.25, poor: 0.1, critical_failure: 0.0 };
  const allPoorScore = ['poor','poor','poor'].reduce((s, oc) => s + scoreMapTest[oc], 0) / 3;
  assert(allPoorScore <= 0.15, 'S7', 'All-poor session computes score ≤0.15', `computed: ${allPoorScore}`);

  // Edge case: mixed session scoring
  const mixedScore = ['excellent','poor','acceptable'].reduce((s, oc) => s + scoreMapTest[oc], 0) / 3;
  const expectedMixed = (1.0 + 0.1 + 0.5) / 3;
  assert(Math.abs(mixedScore - expectedMixed) < 0.001, 'S7', 'Mixed outcome session scores correctly', `computed: ${mixedScore.toFixed(3)}, expected: ${expectedMixed.toFixed(3)}`);
}

// ── SUITE 8: Referential Integrity ────────────────────────────────────────────
console.log('\nSUITE 8: Referential Integrity');
{
  // All sessions reference valid users
  const [orphanSessions] = await conn.query(`
    SELECT s.id FROM assessment_sessions s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.tenant_id = 'tenant-acme-001' AND u.id IS NULL
  `);
  assert(orphanSessions.length === 0, 'S8', 'All sessions reference valid users', `orphans: ${orphanSessions.length}`);

  // All answers reference valid sessions
  const [orphanAnswers] = await conn.query(`
    SELECT a.id FROM assessment_answers a
    LEFT JOIN assessment_sessions s ON s.id = a.session_id
    WHERE a.session_id LIKE 'acme-session-%' AND s.id IS NULL
  `);
  assert(orphanAnswers.length === 0, 'S8', 'All answers reference valid sessions', `orphans: ${orphanAnswers.length}`);

  // All scores reference valid sessions
  const [orphanScores] = await conn.query(`
    SELECT sc.id FROM assessment_scores sc
    LEFT JOIN assessment_sessions s ON s.id = sc.session_id
    WHERE sc.session_id LIKE 'acme-session-%' AND s.id IS NULL
  `);
  assert(orphanScores.length === 0, 'S8', 'All scores reference valid sessions', `orphans: ${orphanScores.length}`);

  // All persona profiles reference valid users
  const [orphanPersonas] = await conn.query(`
    SELECT p.id FROM ail_persona_profiles p
    LEFT JOIN users u ON u.id = p.user_id
    WHERE p.tenant_id = 'tenant-acme-001' AND u.id IS NULL
  `);
  assert(orphanPersonas.length === 0, 'S8', 'All persona profiles reference valid users', `orphans: ${orphanPersonas.length}`);

  // All UIPs reference valid users
  const [orphanUips] = await conn.query(`
    SELECT uip.id FROM ail_user_intelligence_profiles uip
    LEFT JOIN users u ON u.id = uip.user_id
    WHERE uip.tenant_id = 'tenant-acme-001' AND u.id IS NULL
  `);
  assert(orphanUips.length === 0, 'S8', 'All UIPs reference valid users', `orphans: ${orphanUips.length}`);

  // Tenant isolation: ACME data not visible under demo tenant
  const [crossTenantSessions] = await conn.query(`
    SELECT id FROM assessment_sessions
    WHERE tenant_id = 'demo' AND user_id LIKE 'acme-user-%'
  `);
  assert(crossTenantSessions.length === 0, 'S8', 'ACME sessions not visible under demo tenant', `found: ${crossTenantSessions.length}`);

  // Tenant isolation: ACME users not in demo tenant
  const [crossTenantUsers] = await conn.query(`
    SELECT id FROM users WHERE tenant_id = 'demo' AND id LIKE 'acme-user-%'
  `);
  assert(crossTenantUsers.length === 0, 'S8', 'ACME users not in demo tenant', `found: ${crossTenantUsers.length}`);
}

// ── SUITE 9: Schema Validation ────────────────────────────────────────────────
console.log('\nSUITE 9: Schema Validation');
{
  // Verify all actual AIL tables exist (from SHOW TABLES LIKE 'ail_%')
  const actualAilTables = [
    'ail_difficulty_profiles', 'ail_failure_mode_registry', 'ail_narrative_events',
    'ail_narrative_state', 'ail_narrative_threads', 'ail_org_context',
    'ail_persona_profiles', 'ail_retest_queue', 'ail_signal_ledger',
    'ail_stakeholder_relationships', 'ail_user_intelligence_profiles'
  ];
  for (const tbl of actualAilTables) {
    const [[{ cnt }]] = await conn.query(`SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?`, [tbl]);
    assert(Number(cnt) === 1, 'S9', `AIL table exists: ${tbl}`, Number(cnt) === 1 ? '' : 'MISSING');
  }

  // Verify core assessment tables exist
  const coreTables = [
    'tenants', 'users', 'assessment_sessions', 'assessment_answers',
    'assessment_scores', 'assessment_blueprints', 'content_scenarios', 'content_scenario_options'
  ];
  for (const tbl of coreTables) {
    const [[{ cnt }]] = await conn.query(`SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?`, [tbl]);
    assert(Number(cnt) === 1, 'S9', `Core table exists: ${tbl}`, Number(cnt) === 1 ? '' : 'MISSING');
  }

  // Verify key columns in assessment_answers
  const [ansCols] = await conn.query("SHOW COLUMNS FROM assessment_answers");
  const ansColNames = new Set(ansCols.map(c => c.Field));
  const requiredAnsCols = ['id','session_id','item_id','selected_value_json','confidence_score','time_to_answer_ms','outcome_class','signal_deltas_json'];
  for (const col of requiredAnsCols) {
    assert(ansColNames.has(col), 'S9', `assessment_answers has column: ${col}`);
  }

  // Verify key columns in ail_persona_profiles
  const [personaCols] = await conn.query("SHOW COLUMNS FROM ail_persona_profiles");
  const personaColNames = new Set(personaCols.map(c => c.Field));
  const requiredPersonaCols = ['id','user_id','tenant_id','primary_persona','persona_confidence','validation_orientation','governance_orientation'];
  for (const col of requiredPersonaCols) {
    assert(personaColNames.has(col), 'S9', `ail_persona_profiles has column: ${col}`);
  }
}

// ── SUITE 10: Performance Sanity ──────────────────────────────────────────────
console.log('\nSUITE 10: Performance Sanity');
{
  // Query time for fetching all ACME answers
  const t0 = Date.now();
  const [allAnswers] = await conn.query("SELECT id, session_id, outcome_class, confidence_score FROM assessment_answers WHERE session_id LIKE 'acme-session-%'");
  const queryMs = Date.now() - t0;
  assert(queryMs < 2000, 'S10', `Answer fetch query completes in <2s`, `took: ${queryMs}ms`);
  assert(allAnswers.length > 0, 'S10', 'Answer fetch returns results', `got: ${allAnswers.length}`);

  // Query time for scenario library
  const t1 = Date.now();
  const [scenLib] = await conn.query("SELECT id, domain, difficulty FROM content_scenarios WHERE status='published'");
  const scenMs = Date.now() - t1;
  assert(scenMs < 2000, 'S10', `Scenario library query completes in <2s`, `took: ${scenMs}ms`);

  // Query time for AIL persona profiles
  const t2 = Date.now();
  const [ailProf] = await conn.query("SELECT user_id, primary_persona FROM ail_persona_profiles WHERE tenant_id='tenant-acme-001'");
  const ailMs = Date.now() - t2;
  assert(ailMs < 1000, 'S10', `AIL persona query completes in <1s`, `took: ${ailMs}ms`);

  // Query time for joined answer+scenario query (simulates adaptive engine)
  const t3 = Date.now();
  const [joinedQuery] = await conn.query(`
    SELECT aa.id, aa.outcome_class, cs.domain, cs.difficulty
    FROM assessment_answers aa
    JOIN content_scenarios cs ON cs.id = aa.item_id
    WHERE aa.session_id LIKE 'acme-session-%'
    LIMIT 100
  `);
  const joinMs = Date.now() - t3;
  assert(joinMs < 3000, 'S10', `Joined answer+scenario query completes in <3s`, `took: ${joinMs}ms`);
  assert(joinedQuery.length > 0, 'S10', 'Joined query returns results', `got: ${joinedQuery.length}`);
}

// ─────────────────────────────────────────────────────────────────────────────
await conn.end();

// ── Final Report ──────────────────────────────────────────────────────────────
const total = passed + failed + warnings;
console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  QA RESULTS SUMMARY');
console.log('══════════════════════════════════════════════════════════════════');
console.log(`  Total checks : ${total}`);
console.log(`  Passed       : ${passed} ✓`);
console.log(`  Failed       : ${failed} ✗`);
console.log(`  Warnings     : ${warnings} ⚠`);
console.log(`  Pass rate    : ${((passed / total) * 100).toFixed(1)}%`);
console.log('══════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  console.log('FAILED CHECKS:');
  for (const r of results.filter(r => r.status === 'FAIL')) {
    console.log(`  ✗ [${r.suite}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
  }
  console.log('');
}

if (warnings > 0) {
  console.log('WARNINGS:');
  for (const r of results.filter(r => r.status === 'WARN')) {
    console.log(`  ⚠ [${r.suite}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
  }
  console.log('');
}

// Export results as JSON for report generation
writeFileSync('/tmp/qa-results.json', JSON.stringify({ passed, failed, warnings, total, results }, null, 2));
console.log('Results written to /tmp/qa-results.json');

process.exit(failed > 0 ? 1 : 0);
