/**
 * Seed a completed assessment for David Whitfield (david@hrdatahub.com)
 * 
 * This script:
 * 1. Finds David's existing in-progress session
 * 2. Adds enough answers to reach 15 total (he already has 13)
 * 3. Marks the session as completed
 * 4. Creates a full score breakdown with all required fields
 * 5. Creates credibility score, risk score, and user state
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const USER_ID = 'user-fQpUWsv1e8C3';
const TENANT_ID = 'tenant-jBZ4DfdDxFIS';
const SESSION_ID = 'hXEa2bhM2aHFOt3tpWbiE';
const BLUEPRINT_ID = 'bp-aiq-v9-standard';

const SIGNAL_KEYS = [
  'governance_quality', 'judgement_quality', 'execution_quality',
  'risk_awareness', 'workflow_integration', 'appropriateness_awareness',
  'data_interpretation_quality', 'confidence_calibration',
];

const CAPABILITY_KEYS = ['execution', 'judgement', 'governance', 'appropriateness', 'workflow', 'data_interpretation'];

// David's target profile — strong in data & execution, developing in governance
const DAVID_PROFILE = {
  execution: 71,
  judgement: 64,
  governance: 52,
  appropriateness: 58,
  workflow: 67,
  data_interpretation: 74,
};

try {
  console.log('🚀 Seeding completed assessment for David Whitfield...');

  // 1. Check existing answers
  const [existingAnswers] = await conn.query(
    'SELECT id, item_id FROM assessment_answers WHERE session_id = ?',
    [SESSION_ID]
  );
  console.log(`  Found ${existingAnswers.length} existing answers`);

  // 2. Get available items not yet answered
  const answeredItemIds = existingAnswers.map(a => a.item_id);
  let newItems = [];
  if (answeredItemIds.length > 0) {
    const [available] = await conn.query(
      `SELECT id, metadata_json, difficulty FROM assessment_items 
       WHERE id NOT IN (?) AND status = 'published' 
       LIMIT 10`,
      [answeredItemIds]
    );
    newItems = available;
  } else {
    const [available] = await conn.query(
      `SELECT id, metadata_json, difficulty FROM assessment_items 
       WHERE status = 'published' LIMIT 10`
    );
    newItems = available;
  }

  // 3. Add 2 more answers to reach 15 total
  const answersNeeded = Math.max(0, 15 - existingAnswers.length);
  console.log(`  Adding ${answersNeeded} more answers...`);

  const now = new Date();
  for (let i = 0; i < answersNeeded && i < newItems.length; i++) {
    const item = newItems[i];
    const meta = typeof item.metadata_json === 'string'
      ? JSON.parse(item.metadata_json)
      : (item.metadata_json || {});
    const capKey = meta.capability_key || 'execution';
    const baseScore = (DAVID_PROFILE[capKey] || 65) / 100;
    const isCorrect = Math.random() < baseScore;

    const signalDeltas = {};
    for (const sig of SIGNAL_KEYS) {
      signalDeltas[sig] = isCorrect
        ? (Math.random() * 0.12 + 0.02)
        : -(Math.random() * 0.10 + 0.01);
    }

    const ansId = 'ans-dw-' + randomUUID().replace(/-/g, '').substring(0, 16);
    await conn.query(
      `INSERT IGNORE INTO assessment_answers 
       (id, session_id, item_id, selected_value_json, free_text, confidence_score, 
        time_to_answer_ms, revision_count, correctness, submitted_at, 
        outcome_class, signal_deltas_json, event_codes_json)
       VALUES (?, ?, ?, ?, NULL, ?, ?, 0, ?, ?, ?, ?, '[]')`,
      [
        ansId,
        SESSION_ID,
        item.id,
        JSON.stringify({ option: isCorrect ? 'B' : 'C', value: isCorrect ? 1 : 0 }),
        Math.round((baseScore + (Math.random() - 0.5) * 0.15) * 100) / 100,
        Math.floor(Math.random() * 40000 + 20000),
        isCorrect ? 1.0 : 0.0,
        new Date(now.getTime() - (answersNeeded - i) * 60000),
        isCorrect ? 'strong' : 'developing',
        JSON.stringify(signalDeltas),
      ]
    );
  }

  // 4. Mark session as completed
  const completedAt = now;
  await conn.query(
    `UPDATE assessment_sessions 
     SET state = 'completed', completed_at = ?, 
         session_metadata_json = JSON_SET(
           COALESCE(session_metadata_json, '{}'),
           '$.completedAt', ?,
           '$.phase', 'completed',
           '$.totalAnswers', 15
         )
     WHERE id = ?`,
    [completedAt, completedAt.toISOString(), SESSION_ID]
  );
  console.log('  ✓ Session marked as completed');

  // 5. Build the full score breakdown
  const overallScore = Math.round(
    DAVID_PROFILE.execution * 0.20 +
    DAVID_PROFILE.judgement * 0.20 +
    DAVID_PROFILE.governance * 0.15 +
    DAVID_PROFILE.appropriateness * 0.15 +
    DAVID_PROFILE.workflow * 0.15 +
    DAVID_PROFILE.data_interpretation * 0.15
  );

  const capabilitySignalCounts = {};
  for (const cap of CAPABILITY_KEYS) {
    capabilitySignalCounts[cap] = Math.floor(Math.random() * 4) + 2; // 2-5 signals per capability
  }

  const signalScores = {
    governance_quality: 0.52,
    judgement_quality: 0.64,
    execution_quality: 0.71,
    risk_awareness: 0.55,
    workflow_integration: 0.67,
    appropriateness_awareness: 0.58,
    data_interpretation_quality: 0.74,
    confidence_calibration: 0.62,
  };

  const readinessState = overallScore >= 75 ? 'ready' : overallScore >= 55 ? 'developing' : 'not_ready';
  const readinessLabel = overallScore >= 75 ? 'Ready' : overallScore >= 55 ? 'Developing' : 'Not Ready';
  const readinessDesc = overallScore >= 75
    ? 'You demonstrate strong AI capability across most domains.'
    : overallScore >= 55
    ? 'You show developing AI capability with clear areas for growth. Targeted learning will help you progress.'
    : 'Significant development needed across AI capability domains.';

  const scoreBreakdown = {
    overallScore,
    capabilityScores: DAVID_PROFILE,
    capabilitySignalCounts,
    signalScores,
    readiness: {
      state: readinessState,
      label: readinessLabel,
      description: readinessDesc,
      governanceAction: null,
      governingConstraint: null,
    },
    governanceAction: null,
    governingConstraint: null,
    narrative: `David demonstrates solid AI execution skills (${DAVID_PROFILE.execution}) and strong data interpretation capability (${DAVID_PROFILE.data_interpretation}), reflecting his analytics background. His workflow integration (${DAVID_PROFILE.workflow}) and judgement (${DAVID_PROFILE.judgement}) are developing well. The primary growth areas are AI governance (${DAVID_PROFILE.governance}) and appropriateness assessment (${DAVID_PROFILE.appropriateness}), where targeted learning on risk frameworks and ethical AI application would strengthen his overall profile. His confidence calibration is reasonable, suggesting good self-awareness of his current capability level.`,
    confidenceProfile: {
      evidenceDepth: 'moderate',
      evidenceBreadth: 'moderate',
      interactionDiversity: 0.72,
      riskExposure: 0.45,
      consistencyScore: 0.68,
      contradictionPenalty: 0,
      antiGamingConfidence: 0.92,
      overallBand: 'moderate',
      rationale: 'Moderate evidence across 6 capability domains with reasonable interaction diversity.',
    },
    failureModes: [],
    contradictions: { count: 0, pairs: [] },
    confidenceScore: 0.68,
    consistencyScore: 0.72,
    credibilityBand: 'moderate',
    riskBand: 'medium',
    totalAnswers: 15,
    targetItems: 15,
    modelVersion: 'V9.2',
    percentileRanks: {
      execution: { percentile: 62, percentileBand: 'above_average', percentileBandLabel: 'Above average', normGroupLabel: 'HR Professionals', isSynthetic: true, label: 'Above average' },
      judgement: { percentile: 48, percentileBand: 'around_average', percentileBandLabel: 'Around average', normGroupLabel: 'HR Professionals', isSynthetic: true, label: 'Around average' },
      governance: { percentile: 28, percentileBand: 'below_average', percentileBandLabel: 'Below average', normGroupLabel: 'HR Professionals', isSynthetic: true, label: 'Below average' },
      appropriateness: { percentile: 38, percentileBand: 'around_average', percentileBandLabel: 'Around average', normGroupLabel: 'HR Professionals', isSynthetic: true, label: 'Around average' },
      workflow: { percentile: 52, percentileBand: 'around_average', percentileBandLabel: 'Around average', normGroupLabel: 'HR Professionals', isSynthetic: true, label: 'Around average' },
      data_interpretation: { percentile: 68, percentileBand: 'above_average', percentileBandLabel: 'Above average', normGroupLabel: 'HR Professionals', isSynthetic: true, label: 'Above average' },
    },
  };

  // 6. Insert assessment score
  const scoreId = 'score-dw-' + randomUUID().replace(/-/g, '').substring(0, 12);
  await conn.query(
    `INSERT IGNORE INTO assessment_scores 
     (id, session_id, overall_score, score_breakdown_json, signal_scores_json, generated_at, model_version)
     VALUES (?, ?, ?, ?, ?, ?, 'v9.2')`,
    [scoreId, SESSION_ID, overallScore, JSON.stringify(scoreBreakdown), JSON.stringify(signalScores), completedAt]
  );
  console.log(`  ✓ Score inserted: overall ${overallScore}%`);

  // 7. Insert credibility score
  const credScore = 0.68;
  const credBand = 'moderate';
  const credId = 'cred-dw-' + randomUUID().replace(/-/g, '').substring(0, 12);
  await conn.query(
    `INSERT IGNORE INTO credibility_scores 
     (id, user_id, assessment_session_id, credibility_score, band, reason_json, model_version, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'v9.2', ?)`,
    [credId, USER_ID, SESSION_ID, credScore, credBand,
     JSON.stringify({ consistency: 0.72, confidence_accuracy: 0.65, evidence_depth: 'moderate' }),
     completedAt]
  );
  console.log(`  ✓ Credibility score: ${credScore} (${credBand})`);

  // 8. Insert user state
  const stateId = 'state-dw-' + randomUUID().replace(/-/g, '').substring(0, 12);
  await conn.query(
    `INSERT IGNORE INTO user_states 
     (id, user_id, primary_state, credibility_state, risk_state, learning_state, compliance_state, effective_from, state_reason_json)
     VALUES (?, ?, 'DEVELOPING', 'MODERATE', 'STANDARD', 'REQUIRED', 'compliant', ?, ?)`,
    [stateId, USER_ID, completedAt,
     JSON.stringify({ overallScore, band: 'DEVELOPING', sessionId: SESSION_ID })]
  );
  console.log(`  ✓ User state: DEVELOPING`);

  // 9. Insert risk score
  const riskId = 'risk-dw-' + randomUUID().replace(/-/g, '').substring(0, 12);
  await conn.query(
    `INSERT IGNORE INTO risk_scores
     (id, user_id, assessment_session_id, risk_score, band, factor_json, model_version, generated_at)
     VALUES (?, ?, ?, ?, 'medium', ?, 'v9.2', ?)`,
    [riskId, USER_ID, SESSION_ID, 0.45,
     JSON.stringify({ governance_gap: 0.48, role_sensitivity: 0.35, capability_variance: 0.22 }),
     completedAt]
  );
  console.log(`  ✓ Risk score: 0.45 (medium)`);

  // 10. Verify
  const [finalSession] = await conn.query(
    'SELECT state, completed_at FROM assessment_sessions WHERE id = ?',
    [SESSION_ID]
  );
  const [finalScore] = await conn.query(
    'SELECT overall_score FROM assessment_scores WHERE session_id = ?',
    [SESSION_ID]
  );
  const [finalAnswerCount] = await conn.query(
    'SELECT COUNT(*) as cnt FROM assessment_answers WHERE session_id = ?',
    [SESSION_ID]
  );

  console.log('\n✅ Seed complete!');
  console.log(`  Session state: ${finalSession[0].state}`);
  console.log(`  Completed at: ${finalSession[0].completed_at}`);
  console.log(`  Total answers: ${finalAnswerCount[0].cnt}`);
  console.log(`  Overall score: ${finalScore[0]?.overall_score}%`);
  console.log(`  Readiness: ${readinessLabel} (${readinessState})`);

} catch (err) {
  console.error('Error:', err.message);
  throw err;
} finally {
  await conn.end();
}
