/**
 * G-1 Re-seed v2: Creates a completed session with deterministic varied scores.
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

const url = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

const [[user]] = await conn.query(`SELECT id, tenant_id FROM users WHERE email = 'reward@dunder.com' LIMIT 1`);
if (!user) { console.error('reward@dunder.com not found'); process.exit(1); }
const USER_ID = user.id;
const TENANT_ID = user.tenant_id;
console.log(`User: ${USER_ID} / Tenant: ${TENANT_ID}`);

await conn.query(`UPDATE assessment_sessions SET state = 'abandoned' WHERE user_id = ? AND state IN ('in_progress','not_started','completed')`, [USER_ID]);

// Desired score profile
const DESIRED_SCORES = {
  ai_interaction:         78,
  ai_output_evaluation:   74,
  ai_workflow_design:     61,
  workforce_ai_readiness: 63,
  ai_ethics_trust:        44,
  ai_change_leadership:   41,
};

function scoreBand(s) {
  if (s >= 85) return 'expert';
  if (s >= 75) return 'proficient';
  if (s >= 60) return 'capable';
  if (s >= 40) return 'developing';
  return 'foundation';
}

const DOMAIN_PRIMARY_SIGNALS = {
  ai_interaction:         ['prompt_construction_quality',   'output_direction_skill'],
  ai_output_evaluation:   ['output_evaluation_quality',     'error_detection_accuracy'],
  ai_workflow_design:     ['workflow_redesign_quality',      'handoff_design_quality'],
  workforce_ai_readiness: ['capability_diagnosis_accuracy',  'intervention_design_quality'],
  ai_ethics_trust:        ['ethics_under_pressure',          'stakeholder_impact_awareness'],
  ai_change_leadership:   ['resistance_response_quality',    'legitimate_concern_recognition'],
};

const DOMAIN_OUTCOME_PROFILE = {
  ai_interaction:         ['strong','strong','strong','strong','strong','strong','acceptable','acceptable'],
  ai_output_evaluation:   ['strong','strong','strong','strong','strong','acceptable','acceptable','acceptable'],
  ai_workflow_design:     ['strong','strong','strong','acceptable','acceptable','weak','weak','weak'],
  workforce_ai_readiness: ['strong','strong','strong','acceptable','acceptable','weak','weak','weak'],
  ai_ethics_trust:        ['strong','acceptable','weak','weak','failure','failure','failure','weak'],
  ai_change_leadership:   ['acceptable','weak','weak','failure','failure','failure','weak','weak'],
};

const SESSION_ID = 'g1-' + randomUUID().replace(/-/g, '').substring(0, 18);
const startedAt  = new Date(Date.now() - 45 * 60 * 1000);
await conn.query(
  `INSERT INTO assessment_sessions (id, tenant_id, user_id, blueprint_id, state, started_at, session_metadata_json, norm_group_version, locale_code, device_type, scoring_config_version_at_start, created_at) VALUES (?, ?, ?, 'bp-aiq-v10-standard', 'in_progress', ?, '{}', 'v1', 'en-GB', 'desktop', 1, ?)`,
  [SESSION_ID, TENANT_ID, USER_ID, startedAt, startedAt]
);
console.log(`Session created: ${SESSION_ID}`);

const [items] = await conn.query(`SELECT ai.id, ai.metadata_json, ai.difficulty FROM assessment_items ai WHERE ai.blueprint_id = 'bp-aiq-v10-standard' AND ai.status = 'published' ORDER BY RAND() LIMIT 50`);
const itemIds = items.map(i => i.id);
const [allOptions] = await conn.query(`SELECT id, item_id, value, is_correct, outcome_class FROM assessment_item_options WHERE item_id IN (?)`, [itemIds]);

const optionsByItem = {};
for (const opt of allOptions) {
  if (!optionsByItem[opt.item_id]) optionsByItem[opt.item_id] = [];
  optionsByItem[opt.item_id].push(opt);
}

function getDomain(metadataJson) {
  try {
    const m = typeof metadataJson === 'string' ? JSON.parse(metadataJson) : metadataJson;
    return m?.capability_key || 'ai_interaction';
  } catch { return 'ai_interaction'; }
}

function selectByOutcome(options, outcomeClass) {
  const matching = options.filter(o => o.outcome_class === outcomeClass);
  if (matching.length > 0) return matching[Math.floor(Math.random() * matching.length)];
  return options[Math.floor(Math.random() * options.length)];
}

const OUTCOME_MOD = { strong: 1.0, acceptable: 0.6, weak: -0.3, failure: -0.7, critical_failure: -1.5 };
const DIFF_W = { 1: 1.0, 2: 1.3, 3: 1.6 };

let answersInserted = 0;
const signalAcc = {};

// Group items by domain
const itemsByDomain = {};
for (const item of items) {
  const d = getDomain(item.metadata_json);
  if (!itemsByDomain[d]) itemsByDomain[d] = [];
  itemsByDomain[d].push(item);
}

for (const [domain, domainItems] of Object.entries(itemsByDomain)) {
  const outcomeProfile = DOMAIN_OUTCOME_PROFILE[domain] || Array(8).fill('acceptable');
  for (let i = 0; i < domainItems.length; i++) {
    const item = domainItems[i];
    const options = optionsByItem[item.id];
    if (!options || options.length === 0) continue;
    const targetOutcome = outcomeProfile[i % outcomeProfile.length];
    const selected = selectByOutcome(options, targetOutcome);
    const difficulty = item.difficulty || 2;
    const modifier = OUTCOME_MOD[selected.outcome_class] ?? 1.0;
    const diffW = DIFF_W[difficulty] ?? 1.3;
    const sign = modifier >= 0 ? 1 : -1;
    const weightedMag = sign * 0.9 * diffW * Math.abs(modifier);
    const signals = DOMAIN_PRIMARY_SIGNALS[domain] || ['prompt_construction_quality', 'output_direction_skill'];
    const signalDeltas = { [signals[0]]: weightedMag, [signals[1]]: weightedMag };
    for (const [sig, delta] of Object.entries(signalDeltas)) {
      if (!signalAcc[sig]) signalAcc[sig] = { sum: 0, count: 0 };
      signalAcc[sig].sum += delta;
      signalAcc[sig].count++;
    }
    const answeredAt = new Date(startedAt.getTime() + answersInserted * 50000 + Math.random() * 20000);
    const ansId = 'g1ans-' + randomUUID().replace(/-/g, '').substring(0, 14);
    await conn.query(
      `INSERT INTO assessment_answers (id, session_id, item_id, selected_value_json, free_text, reasoning_text, confidence_score, time_to_answer_ms, revision_count, correctness, submitted_at, outcome_class, signal_deltas_json, event_codes_json) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, 0, ?, ?, ?, ?, '[]')`,
      [ansId, SESSION_ID, item.id, JSON.stringify(selected.value), (0.5 + Math.random() * 0.5).toFixed(4), Math.floor(Math.random() * 45000 + 15000), selected.is_correct ? 1 : 0, answeredAt, selected.outcome_class || 'weak', JSON.stringify(signalDeltas)]
    );
    answersInserted++;
  }
}
console.log(`Inserted ${answersInserted} answers`);

const capabilityScores = {};
for (const [domain, score] of Object.entries(DESIRED_SCORES)) {
  capabilityScores[domain] = {
    score, band: scoreBand(score),
    signalCount: signalAcc[DOMAIN_PRIMARY_SIGNALS[domain]?.[0]]?.count ?? 0,
    signalSum: signalAcc[DOMAIN_PRIMARY_SIGNALS[domain]?.[0]]?.sum ?? 0,
    displayName: domain.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  };
}

const scores = Object.values(DESIRED_SCORES);
const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
const spread = Math.max(...scores) - Math.min(...scores);

console.log('\n── Capability Scores ──────────────────────────────────');
for (const [d, cs] of Object.entries(capabilityScores)) {
  console.log(`  ${d.padEnd(30)} ${cs.score.toString().padStart(3)} (${cs.band})`);
}
console.log(`  ${'OVERALL'.padEnd(30)} ${overallScore}`);
console.log(`  Score spread: ${spread} points`);

const completedAt = new Date();
await conn.query(`UPDATE assessment_sessions SET state = 'completed', completed_at = ?, session_metadata_json = JSON_SET(COALESCE(session_metadata_json,'{}'), '$.completedAt', ?, '$.phase', 'completed', '$.totalAnswers', ?) WHERE id = ?`, [completedAt, completedAt.toISOString(), answersInserted, SESSION_ID]);

const readinessState = overallScore >= 75 ? 'safe' : overallScore >= 55 ? 'at_risk' : 'unsafe';
const readinessLabel = overallScore >= 75 ? 'AI-Ready' : overallScore >= 55 ? 'Developing' : 'Not Yet Ready';

const scoreBreakdown = {
  overallScore, capabilityScores, signalScores: signalAcc,
  readiness: { state: readinessState, label: readinessLabel, description: 'Strong AI capability in interaction and output evaluation. Developing in workflow design and readiness. Needs work in ethics and change leadership.', governanceAction: null, governingConstraint: null },
  governanceAction: null, governingConstraint: null,
  totalAnswers: answersInserted, targetItems: 50, modelVersion: 'v10.7',
  confidenceScore: 0.72, consistencyScore: 0.68, credibilityBand: 'moderate', riskBand: 'medium',
  failureModes: [], contradictions: { count: 0, pairs: [] },
  confidenceProfile: { evidenceDepth: 'strong', evidenceBreadth: 'strong', interactionDiversity: 0.78, riskExposure: 0.42, consistencyScore: 0.68, contradictionPenalty: 0, antiGamingConfidence: 0.91, overallBand: 'strong', rationale: 'Strong evidence across 6 capability domains.' },
};

const scoreId = 'g1score-' + randomUUID().replace(/-/g,'').substring(0,12);
await conn.query(`INSERT INTO assessment_scores (id, session_id, overall_score, score_breakdown_json, signal_scores_json, generated_at, model_version) VALUES (?, ?, ?, ?, ?, ?, 'v10.7')`, [scoreId, SESSION_ID, overallScore, JSON.stringify(scoreBreakdown), JSON.stringify(signalAcc), completedAt]);

const credId  = 'g1cred-'  + randomUUID().replace(/-/g,'').substring(0,12);
const stateId = 'g1state-' + randomUUID().replace(/-/g,'').substring(0,12);
await conn.query(`INSERT IGNORE INTO credibility_scores (id, user_id, credibility_score, band, reason_json, model_version, generated_at) VALUES (?, ?, 0.72, 'moderate', '{}', 'v10.7', ?)`, [credId, USER_ID, completedAt]);
await conn.query(`INSERT IGNORE INTO user_states (id, user_id, primary_state, credibility_state, risk_state, learning_state, compliance_state, effective_from, state_reason_json) VALUES (?, ?, ?, 'MODERATE', 'STANDARD', 'REQUIRED', 'compliant', ?, ?)`, [stateId, USER_ID, readinessState === 'safe' ? 'SAFE' : 'DEVELOPING', completedAt, JSON.stringify({ overallScore, band: readinessLabel, sessionId: SESSION_ID })]);

console.log('\n✅ G-1 seed v2 complete!');
console.log(`  Session ID : ${SESSION_ID}`);
console.log(`  Results URL: /assessment/${SESSION_ID}/results`);
console.log(`  Overall    : ${overallScore}/100 (${readinessLabel})`);
console.log(`  Spread     : ${spread} points`);

await conn.end();
