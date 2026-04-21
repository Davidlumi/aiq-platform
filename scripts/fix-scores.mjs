import mysql from 'mysql2/promise';

const conn = mysql.createPool(process.env.DATABASE_URL);

const capabilities = ['execution', 'judgement', 'governance', 'appropriateness', 'workflow', 'data_interpretation'];

// Find completed sessions without scores
const [sessions] = await conn.query(`
  SELECT s.id, s.user_id, s.blueprint_id
  FROM assessment_sessions s
  LEFT JOIN assessment_scores sc ON sc.session_id = s.id
  WHERE s.tenant_id = 'tenant-demo-001' 
  AND s.state = 'completed'
  AND sc.id IS NULL
`);
console.log('Sessions without scores:', sessions.length);

for (const sess of sessions) {
  const overall = 0.5 + Math.random() * 0.45;
  const breakdown = {};
  for (const cap of capabilities) {
    breakdown[cap] = Math.max(0.3, Math.min(0.99, overall + (Math.random() - 0.5) * 0.3));
  }
  const scoreId = 'sc-' + Math.random().toString(36).slice(2, 10);
  await conn.query(`
    INSERT INTO assessment_scores (id, session_id, overall_score, score_breakdown_json, signal_scores_json, generated_at, model_version)
    VALUES (?, ?, ?, ?, ?, NOW(), ?)
  `, [
    scoreId, sess.id,
    overall,
    JSON.stringify(breakdown),
    JSON.stringify({}),
    'v9.2',
  ]);
  console.log('Added score for session', sess.id);
}

// Final check
const [states] = await conn.query('SELECT state, COUNT(*) as cnt FROM assessment_sessions WHERE tenant_id = ? GROUP BY state', ['tenant-demo-001']);
console.log('Final session states:', states);
const [scoreCount] = await conn.query('SELECT COUNT(*) as cnt FROM assessment_scores WHERE tenant_id = ?', ['tenant-demo-001']);
console.log('Total scores:', scoreCount[0].cnt);

await conn.end();
