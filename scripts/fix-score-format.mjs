/**
 * Fix two issues with seeded scores:
 * 1. readiness.state uses wrong values ("ai_ready"/"developing"/"not_yet_ready" instead of "safe"/"at_risk"/"unsafe"/"foundation_gap")
 * 2. overall_score is stored as 0-1 decimal but dashboard expects 0-100 integer
 * 3. capabilityScores domain scores need to be on 0-100 scale (they already are, but overall needs fixing)
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const tenantId = "tenant-acme-ltd";

// Map from wrong state values to correct ones
function toCorrectState(score100) {
  if (score100 >= 75) return "safe";           // AI Ready
  if (score100 >= 55) return "at_risk";        // Developing
  if (score100 >= 35) return "unsafe";         // Not Yet Ready
  return "foundation_gap";                      // Foundation Gap
}

function toCorrectLabel(state) {
  switch (state) {
    case "safe": return "AI Ready";
    case "at_risk": return "Developing";
    case "unsafe": return "Not Yet Ready";
    case "foundation_gap": return "Foundation Gap";
    default: return "Unknown";
  }
}

// Get all scores for this tenant
const [scores] = await conn.query(`
  SELECT s.id as score_id, s.overall_score, s.score_breakdown_json, sess.user_id
  FROM assessment_scores s
  JOIN assessment_sessions sess ON s.session_id = sess.id
  WHERE sess.tenant_id = ?
`, [tenantId]);

console.log(`Found ${scores.length} scores to fix`);

let fixed = 0;
for (const row of scores) {
  const currentOverall = parseFloat(String(row.overall_score));
  
  // Determine if score is 0-1 decimal or 0-100 integer
  const score100 = currentOverall <= 1 ? Math.round(currentOverall * 100) : Math.round(currentOverall);
  
  const bd = typeof row.score_breakdown_json === 'string'
    ? JSON.parse(row.score_breakdown_json)
    : row.score_breakdown_json;

  const correctState = toCorrectState(score100);
  const correctLabel = toCorrectLabel(correctState);

  // Fix the breakdown JSON
  const fixed_bd = {
    ...bd,
    // Fix overall score to 0-100 scale
    overallScore: score100,
    overall_score: score100,
    // Fix readiness to use correct state values
    readiness: {
      state: correctState,
      label: correctLabel,
      band: correctState,
      participantDescription: bd.readiness?.participantDescription || `Score: ${score100}/100`,
    },
    readiness_state: correctState,
    primaryState: correctState,
  };

  // Store overall_score as 0-100 integer in DB column
  await conn.query(
    `UPDATE assessment_scores SET overall_score = ?, score_breakdown_json = ? WHERE id = ?`,
    [score100, JSON.stringify(fixed_bd), row.score_id]
  );
  fixed++;
}

console.log(`Fixed ${fixed} scores`);

// Verify the fix
const [check] = await conn.query(`
  SELECT
    JSON_UNQUOTE(JSON_EXTRACT(s.score_breakdown_json, '$.readiness.state')) as state,
    COUNT(*) as cnt,
    ROUND(AVG(s.overall_score)) as avg_score,
    MIN(s.overall_score) as min_score,
    MAX(s.overall_score) as max_score
  FROM assessment_scores s
  JOIN assessment_sessions sess ON s.session_id = sess.id
  WHERE sess.tenant_id = ?
  GROUP BY state
  ORDER BY avg_score DESC
`, [tenantId]);

console.log("\nReadiness distribution after fix:");
console.table(check);

// Check function score calculation
const [funcScore] = await conn.query(`
  SELECT ROUND(AVG(s.overall_score)) as function_score
  FROM assessment_scores s
  JOIN assessment_sessions sess ON s.session_id = sess.id
  WHERE sess.tenant_id = ?
`, [tenantId]);
console.log(`\nExpected function score: ${funcScore[0].function_score}`);

await conn.end();
console.log("Done");
