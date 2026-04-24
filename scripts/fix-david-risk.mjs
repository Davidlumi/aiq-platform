import 'dotenv/config';
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Insert risk score with correct columns
const riskId = 'risk-dw-' + randomUUID().replace(/-/g, '').substring(0, 12);
await conn.query(
  `INSERT IGNORE INTO risk_scores (id, user_id, risk_score, band, reason_json, model_version, generated_at)
   VALUES (?, ?, 0.45, 'medium', ?, 'v9.2', NOW())`,
  [riskId, 'user-fQpUWsv1e8C3', JSON.stringify({ governance_gap: 0.48, role_sensitivity: 0.35, capability_variance: 0.22 })]
);
console.log('✓ Risk score inserted');

// Verify everything
const [session] = await conn.query('SELECT state, completed_at FROM assessment_sessions WHERE id = ?', ['hXEa2bhM2aHFOt3tpWbiE']);
const [score] = await conn.query('SELECT overall_score FROM assessment_scores WHERE session_id = ?', ['hXEa2bhM2aHFOt3tpWbiE']);
const [answers] = await conn.query('SELECT COUNT(*) as cnt FROM assessment_answers WHERE session_id = ?', ['hXEa2bhM2aHFOt3tpWbiE']);
const [cred] = await conn.query('SELECT credibility_score, band FROM credibility_scores WHERE user_id = ?', ['user-fQpUWsv1e8C3']);
const [state] = await conn.query('SELECT primary_state, credibility_state, risk_state FROM user_states WHERE user_id = ?', ['user-fQpUWsv1e8C3']);
const [risk] = await conn.query('SELECT risk_score, band FROM risk_scores WHERE user_id = ?', ['user-fQpUWsv1e8C3']);

console.log('\n✅ Final verification:');
console.log('  Session:', session[0]?.state, '| Completed:', session[0]?.completed_at);
console.log('  Answers:', answers[0]?.cnt);
console.log('  Overall score:', score[0]?.overall_score);
console.log('  Credibility:', cred[0]?.credibility_score, '(' + cred[0]?.band + ')');
console.log('  User state:', state[0]?.primary_state, '| Cred:', state[0]?.credibility_state, '| Risk:', state[0]?.risk_state);
console.log('  Risk score:', risk[0]?.risk_score, '(' + risk[0]?.band + ')');

await conn.end();
