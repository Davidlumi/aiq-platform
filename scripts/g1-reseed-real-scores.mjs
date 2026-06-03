/**
 * G-1 Re-seed: Create a completed session for the Reward Leader (reward@dunder.com)
 * using REAL option values (A/B/C/D) and SYNTHESIZED signal deltas (matching the
 * engine's fallback synthesis for LLM-generated items).
 *
 * Profile target:
 *   - Strong: AI Interaction, AI Output Evaluation
 *   - Developing: AI Workflow Design, Workforce AI Readiness
 *   - Needs work: AI Ethics & Trust, AI Change Leadership
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

// ─── Resolve user & tenant ────────────────────────────────────────────────────
const [[user]] = await conn.query(
  `SELECT id, tenant_id FROM users WHERE email = 'reward@dunder.com' LIMIT 1`
);
if (!user) { console.error('reward@dunder.com not found'); process.exit(1); }
const USER_ID   = user.id;
const TENANT_ID = user.tenant_id;
console.log(`User: ${USER_ID} / Tenant: ${TENANT_ID}`);

// ─── Invalidate any existing completed/in-progress sessions ──────────────────
await conn.query(
  `UPDATE assessment_sessions SET state = 'abandoned'
   WHERE user_id = ? AND state IN ('in_progress','not_started','completed')`,
  [USER_ID]
);

// ─── Domain-primary signal map (mirrors engine synthesizeFallbackDeltas) ──────
const DOMAIN_PRIMARY_SIGNALS = {
  ai_interaction:         ['prompt_construction_quality',   'output_direction_skill'],
  ai_output_evaluation:   ['output_evaluation_quality',     'error_detection_accuracy'],
  ai_workflow_design:     ['workflow_redesign_quality',      'handoff_design_quality'],
  workforce_ai_readiness: ['capability_diagnosis_accuracy',  'intervention_design_quality'],
  ai_ethics_trust:        ['ethics_under_pressure',          'stakeholder_impact_awareness'],
  ai_change_leadership:   ['resistance_response_quality',    'legitimate_concern_recognition'],
};

// OUTCOME_SCORE_MODIFIER (mirrors scoringEngine.ts)
const OUTCOME_MODIFIER = {
  strong:           1.0,
  acceptable:       0.6,
  weak:            -0.3,
  failure:         -0.7,
  critical_failure: -1.5,
};

// DIFFICULTY_WEIGHTS
const DIFF_WEIGHT = { 1: 1.0, 2: 1.3, 3: 1.6 };

// RISK_MULTIPLIERS
const RISK_MULT = {
  Low:      { positive: 0.8, negative: 0.8 },
  Medium:   { positive: 1.0, negative: 1.0 },
  High:     { positive: 1.2, negative: 1.4 },
  Critical: { positive: 1.4, negative: 1.8 },
};

function synthesizeDeltas(capabilityKey, outcomeClass, difficulty, riskLevel) {
  const signals = DOMAIN_PRIMARY_SIGNALS[capabilityKey];
  if (!signals || !outcomeClass) return {};
  const modifier = OUTCOME_MODIFIER[outcomeClass] ?? 1.0;
  const diffW = DIFF_WEIGHT[difficulty] ?? 1.3;
  const rm = RISK_MULT[riskLevel] ?? RISK_MULT['Medium'];
  const sign = modifier >= 0 ? 1 : -1;
  const riskM = sign > 0 ? rm.positive : rm.negative;
  const weighted = sign * 0.9 * diffW * riskM * Math.abs(modifier);
  return { [signals[0]]: weighted, [signals[1]]: weighted };
}

// ─── Profile: probability of selecting the BEST option per domain ─────────────
const DOMAIN_STRENGTH = {
  ai_interaction:         0.82,  // Strong
  ai_output_evaluation:   0.78,  // Strong
  ai_workflow_design:     0.52,  // Developing
  workforce_ai_readiness: 0.55,  // Developing
  ai_ethics_trust:        0.42,  // Needs work
  ai_change_leadership:   0.38,  // Needs work
};

// ─── Create new session ───────────────────────────────────────────────────────
const SESSION_ID = 'g1-' + randomUUID().replace(/-/g, '').substring(0, 18);
const startedAt  = new Date(Date.now() - 45 * 60 * 1000);
await conn.query(
  `INSERT INTO assessment_sessions
   (id, tenant_id, user_id, blueprint_id, state, started_at, session_metadata_json,
    norm_group_version, locale_code, device_type, scoring_config_version_at_start, created_at)
   VALUES (?, ?, ?, 'bp-aiq-v10-standard', 'in_progress', ?, '{}',
           'v1', 'en-GB', 'desktop', 1, ?)`,
  [SESSION_ID, TENANT_ID, USER_ID, startedAt, startedAt]
);
console.log(`Session created: ${SESSION_ID}`);

// ─── Fetch published items ────────────────────────────────────────────────────
const [items] = await conn.query(
  `SELECT ai.id, ai.metadata_json, ai.difficulty
   FROM assessment_items ai
   WHERE ai.blueprint_id = 'bp-aiq-v10-standard' AND ai.status = 'published'
   ORDER BY RAND()
   LIMIT 50`
);
console.log(`Found ${items.length} published items`);

const itemIds = items.map(i => i.id);
const [allOptions] = await conn.query(
  `SELECT id, item_id, value, is_correct, outcome_class
   FROM assessment_item_options
   WHERE item_id IN (?)`,
  [itemIds]
);

const optionsByItem = {};
for (const opt of allOptions) {
  if (!optionsByItem[opt.item_id]) optionsByItem[opt.item_id] = [];
  optionsByItem[opt.item_id].push(opt);
}

function getDomainForItem(metadataJson) {
  try {
    const meta = typeof metadataJson === 'string' ? JSON.parse(metadataJson) : metadataJson;
    return meta?.capability_key || null;
  } catch { return null; }
}

function getRiskForItem(metadataJson) {
  try {
    const meta = typeof metadataJson === 'string' ? JSON.parse(metadataJson) : metadataJson;
    return meta?.risk_level || 'Medium';
  } catch { return 'Medium'; }
}

function selectOption(options, domain) {
  if (!options || options.length === 0) return null;
  const strength = DOMAIN_STRENGTH[domain] || 0.5;
  const ranked = [...options].sort((a, b) => {
    const order = { strong: 4, acceptable: 3, weak: 2, failure: 1 };
    return (order[b.outcome_class] || 0) - (order[a.outcome_class] || 0);
  });
  const r = Math.random();
  if (r < strength) return ranked[0];
  if (r < strength + 0.25) return ranked[Math.min(1, ranked.length - 1)];
  return ranked[Math.min(2, ranked.length - 1)];
}

// ─── Submit answers ───────────────────────────────────────────────────────────
let answersInserted = 0;
const answerLog = [];
const signalAcc = {};

for (const item of items) {
  const options = optionsByItem[item.id];
  if (!options || options.length === 0) continue;

  const domain = getDomainForItem(item.metadata_json) || 'ai_interaction';
  const riskLevel = getRiskForItem(item.metadata_json);
  const difficulty = item.difficulty || 2;
  const selected = selectOption(options, domain);
  if (!selected) continue;

  // Synthesize signal deltas (matches engine's synthesizeFallbackDeltas + applyWeightedDeltas)
  const signalDeltas = synthesizeDeltas(domain, selected.outcome_class, difficulty, riskLevel);

  // Accumulate for local scoring check
  for (const [sig, delta] of Object.entries(signalDeltas)) {
    if (!signalAcc[sig]) signalAcc[sig] = { sum: 0, count: 0 };
    signalAcc[sig].sum += delta;
    signalAcc[sig].count++;
  }

  const answeredAt = new Date(startedAt.getTime() + answersInserted * 50000 + Math.random() * 20000);
  const ansId = 'g1ans-' + randomUUID().replace(/-/g, '').substring(0, 14);

  await conn.query(
    `INSERT INTO assessment_answers
     (id, session_id, item_id, selected_value_json, free_text, reasoning_text,
      confidence_score, time_to_answer_ms, revision_count, correctness, submitted_at,
      outcome_class, signal_deltas_json, event_codes_json)
     VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, 0, ?, ?, ?, ?, '[]')`,
    [
      ansId, SESSION_ID, item.id,
      JSON.stringify(selected.value),
      (0.5 + Math.random() * 0.5).toFixed(4),
      Math.floor(Math.random() * 45000 + 15000),
      selected.is_correct ? 1 : 0,
      answeredAt,
      selected.outcome_class || 'weak',
      JSON.stringify(signalDeltas),
    ]
  );

  answerLog.push({ domain, option: selected.value, outcome: selected.outcome_class });
  answersInserted++;
}

console.log(`\nInserted ${answersInserted} answers`);

// ─── Compute capability scores ────────────────────────────────────────────────
const INTERCEPT = 50;
const CONTRIBUTION_CAP = 40;
const ALL_DOMAINS = ['ai_interaction','ai_output_evaluation','ai_workflow_design',
                     'workforce_ai_readiness','ai_ethics_trust','ai_change_leadership'];

const DOMAIN_SIGNALS_MAP = {
  ai_interaction:         ['prompt_construction_quality','output_direction_skill'],
  ai_output_evaluation:   ['output_evaluation_quality','error_detection_accuracy'],
  ai_workflow_design:     ['workflow_redesign_quality','handoff_design_quality'],
  workforce_ai_readiness: ['capability_diagnosis_accuracy','intervention_design_quality'],
  ai_ethics_trust:        ['ethics_under_pressure','stakeholder_impact_awareness'],
  ai_change_leadership:   ['resistance_response_quality','legitimate_concern_recognition'],
};

function scoreBand(s) {
  if (s >= 85) return 'expert';
  if (s >= 75) return 'proficient';
  if (s >= 60) return 'capable';
  if (s >= 40) return 'developing';
  return 'foundation';
}

const capabilityScores = {};
let overallSum = 0;
for (const domain of ALL_DOMAINS) {
  const sigs = DOMAIN_SIGNALS_MAP[domain] || [];
  let sum = 0, count = 0;
  for (const sig of sigs) {
    const ss = signalAcc[sig];
    if (ss) { sum += ss.sum; count += ss.count; }
  }
  const scaleFactor = count > 0 ? Math.min(2.0, sigs.length / Math.max(1, count) * 1.5) : 1.0;
  const clipped = Math.max(-CONTRIBUTION_CAP, Math.min(CONTRIBUTION_CAP, sum * scaleFactor));
  const score = Math.max(0, Math.min(100, Math.round(INTERCEPT + clipped)));
  capabilityScores[domain] = { score, band: scoreBand(score), signalCount: count };
  overallSum += score;
}

const overallScore = Math.round(overallSum / ALL_DOMAINS.length);
const scores = Object.values(capabilityScores).map(c => c.score);
const spread = Math.max(...scores) - Math.min(...scores);

console.log('\n── Capability Scores ──────────────────────────────────');
for (const [d, cs] of Object.entries(capabilityScores)) {
  console.log(`  ${d.padEnd(30)} ${cs.score.toString().padStart(3)} (${cs.band})`);
}
console.log(`  ${'OVERALL'.padEnd(30)} ${overallScore}`);
console.log(`\n  Score spread: ${spread} points`);

if (spread < 10) {
  console.warn('\n⚠️  WARNING: Spread < 10 — scores may still be too uniform.');
}

// ─── Mark session complete and insert score ───────────────────────────────────
const completedAt = new Date();
await conn.query(
  `UPDATE assessment_sessions SET state = 'completed', completed_at = ?,
   session_metadata_json = JSON_SET(COALESCE(session_metadata_json,'{}'),
     '$.completedAt', ?, '$.phase', 'completed', '$.totalAnswers', ?)
   WHERE id = ?`,
  [completedAt, completedAt.toISOString(), answersInserted, SESSION_ID]
);

const readinessState = overallScore >= 75 ? 'safe' : overallScore >= 55 ? 'at_risk' : 'unsafe';
const readinessLabel = overallScore >= 75 ? 'AI-Ready' : overallScore >= 55 ? 'Developing' : 'Not Yet Ready';

const scoreBreakdown = {
  overallScore, capabilityScores, signalScores: signalAcc,
  readiness: {
    state: readinessState, label: readinessLabel,
    description: 'Assessment completed with varied domain scores.',
    governanceAction: null, governingConstraint: null,
  },
  governanceAction: null, governingConstraint: null,
  totalAnswers: answersInserted, targetItems: 50,
  modelVersion: 'v10.7', confidenceScore: 0.72, consistencyScore: 0.68,
  credibilityBand: 'moderate', riskBand: 'medium',
  failureModes: [], contradictions: { count: 0, pairs: [] },
  confidenceProfile: {
    evidenceDepth: 'strong', evidenceBreadth: 'strong',
    interactionDiversity: 0.78, riskExposure: 0.42,
    consistencyScore: 0.68, contradictionPenalty: 0,
    antiGamingConfidence: 0.91, overallBand: 'strong',
    rationale: 'Strong evidence across 6 capability domains.',
  },
};

const scoreId = 'g1score-' + randomUUID().replace(/-/g,'').substring(0,12);
await conn.query(
  `INSERT INTO assessment_scores
   (id, session_id, overall_score, score_breakdown_json, signal_scores_json, generated_at, model_version)
   VALUES (?, ?, ?, ?, ?, ?, 'v10.7')`,
  [scoreId, SESSION_ID, overallScore, JSON.stringify(scoreBreakdown), JSON.stringify(signalAcc), completedAt]
);

// ─── Insert credibility + risk + user state ───────────────────────────────────
const credId  = 'g1cred-'  + randomUUID().replace(/-/g,'').substring(0,12);
const riskId  = 'g1risk-'  + randomUUID().replace(/-/g,'').substring(0,12);
const stateId = 'g1state-' + randomUUID().replace(/-/g,'').substring(0,12);

await conn.query(
  `INSERT IGNORE INTO credibility_scores
   (id, user_id, assessment_session_id, credibility_score, band, reason_json, model_version, generated_at)
   VALUES (?, ?, ?, 0.72, 'moderate', '{}', 'v10.7', ?)`,
  [credId, USER_ID, SESSION_ID, completedAt]
);
await conn.query(
  `INSERT IGNORE INTO risk_scores
   (id, user_id, assessment_session_id, risk_score, band, factor_json, model_version, generated_at)
   VALUES (?, ?, ?, 0.42, 'medium', '{}', 'v10.7', ?)`,
  [riskId, USER_ID, SESSION_ID, completedAt]
);
await conn.query(
  `INSERT IGNORE INTO user_states
   (id, user_id, primary_state, credibility_state, risk_state, learning_state, compliance_state, effective_from, state_reason_json)
   VALUES (?, ?, ?, 'MODERATE', 'STANDARD', 'REQUIRED', 'compliant', ?, ?)`,
  [stateId, USER_ID, readinessState === 'safe' ? 'SAFE' : 'DEVELOPING', completedAt,
   JSON.stringify({ overallScore, band: readinessLabel, sessionId: SESSION_ID })]
);

console.log('\n✅ G-1 seed complete!');
console.log(`  Session ID : ${SESSION_ID}`);
console.log(`  Results URL: /assessment/${SESSION_ID}/results`);
console.log(`  Answers    : ${answersInserted}`);
console.log(`  Overall    : ${overallScore}/100 (${readinessLabel})`);
console.log(`  Spread     : ${spread} points`);

console.log('\n── Per-question answer log ──');
for (const a of answerLog) {
  console.log(`  ${a.domain.padEnd(28)} → ${a.option}  ${a.outcome}`);
}

await conn.end();
