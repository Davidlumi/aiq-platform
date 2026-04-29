import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check a sample score
const [sample] = await conn.query(`
  SELECT s.id, s.overall_score, s.score_breakdown_json, sess.user_id, sess.state
  FROM assessment_scores s
  JOIN assessment_sessions sess ON s.session_id = sess.id
  WHERE sess.tenant_id = 'tenant-acme-ltd'
  LIMIT 3
`);
for (const row of sample) {
  console.log("user:", row.user_id, "state:", row.state, "overall:", row.overall_score);
  const bd = typeof row.score_breakdown_json === 'string' 
    ? JSON.parse(row.score_breakdown_json) 
    : row.score_breakdown_json;
  console.log("breakdown keys:", Object.keys(bd || {}));
  console.log("readiness_state:", bd?.readiness_state);
  console.log("capabilityScores keys:", Object.keys(bd?.capabilityScores || {}));
  console.log("---");
}

// Check session IDs for the new users
const [sessions] = await conn.query(`
  SELECT sess.id, sess.user_id, sess.state, u.first_name, u.last_name
  FROM assessment_sessions sess
  JOIN users u ON sess.user_id = u.id
  WHERE sess.tenant_id = 'tenant-acme-ltd'
  ORDER BY sess.started_at DESC
  LIMIT 10
`);
console.log("Recent sessions:");
console.table(sessions);

await conn.end();
