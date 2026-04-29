/**
 * Patch existing Acme assessment scores to:
 * 1. Add readiness_state field (from existing readiness.state or primaryState)
 * 2. Ensure capabilityScores use the correct domain key format
 * 3. Update overall_score to realistic varied values
 * 4. Add band field to each capabilityScore entry
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const tenantId = "tenant-acme-ltd";

function readiness(score) {
  if (score >= 75) return "ai_ready";
  if (score >= 55) return "developing";
  if (score >= 35) return "not_yet_ready";
  return "foundation_gap";
}
function band(score) {
  if (score >= 70) return "good";
  if (score >= 50) return "developing";
  return "needs_work";
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function jitter(base, spread) { return clamp(Math.round(base + (Math.random() - 0.5) * 2 * spread), 0, 100); }

// Realistic target scores per user ID (u-acme-001 to u-acme-050)
// Based on role and seniority — spread across all readiness bands
const TARGET_SCORES = {
  "u-acme-001": { overall: 82, domains: { ai_interaction:82, ai_output_evaluation:79, ai_workflow_design:74, workforce_ai_readiness:88, ai_ethics_trust:85, ai_change_leadership:90 } }, // CPO
  "u-acme-002": { overall: 76, domains: { ai_interaction:76, ai_output_evaluation:72, ai_workflow_design:65, workforce_ai_readiness:80, ai_ethics_trust:78, ai_change_leadership:83 } }, // VP People
  "u-acme-003": { overall: 64, domains: { ai_interaction:62, ai_output_evaluation:70, ai_workflow_design:45, workforce_ai_readiness:65, ai_ethics_trust:74, ai_change_leadership:60 } }, // HRBP
  "u-acme-004": { overall: 58, domains: { ai_interaction:55, ai_output_evaluation:58, ai_workflow_design:40, workforce_ai_readiness:60, ai_ethics_trust:65, ai_change_leadership:52 } }, // HRBP
  "u-acme-005": { overall: 48, domains: { ai_interaction:48, ai_output_evaluation:52, ai_workflow_design:35, workforce_ai_readiness:55, ai_ethics_trust:60, ai_change_leadership:45 } }, // HRBP
  "u-acme-006": { overall: 50, domains: { ai_interaction:50, ai_output_evaluation:55, ai_workflow_design:38, workforce_ai_readiness:52, ai_ethics_trust:58, ai_change_leadership:48 } }, // HR Advisor
  "u-acme-007": { overall: 38, domains: { ai_interaction:38, ai_output_evaluation:42, ai_workflow_design:28, workforce_ai_readiness:40, ai_ethics_trust:45, ai_change_leadership:35 } }, // HR Generalist
  "u-acme-008": { overall: 65, domains: { ai_interaction:65, ai_output_evaluation:68, ai_workflow_design:55, workforce_ai_readiness:70, ai_ethics_trust:72, ai_change_leadership:63 } }, // Sr HRBP
  "u-acme-009": { overall: 44, domains: { ai_interaction:44, ai_output_evaluation:48, ai_workflow_design:32, workforce_ai_readiness:50, ai_ethics_trust:55, ai_change_leadership:42 } }, // HR Advisor
  "u-acme-010": { overall: 30, domains: { ai_interaction:30, ai_output_evaluation:35, ai_workflow_design:22, workforce_ai_readiness:32, ai_ethics_trust:38, ai_change_leadership:28 } }, // Jr HRBP
  "u-acme-011": { overall: 64, domains: { ai_interaction:68, ai_output_evaluation:72, ai_workflow_design:60, workforce_ai_readiness:65, ai_ethics_trust:62, ai_change_leadership:55 } }, // TA Manager
  "u-acme-012": { overall: 58, domains: { ai_interaction:60, ai_output_evaluation:65, ai_workflow_design:52, workforce_ai_readiness:58, ai_ethics_trust:55, ai_change_leadership:48 } }, // Sr Recruiter
  "u-acme-013": { overall: 50, domains: { ai_interaction:55, ai_output_evaluation:60, ai_workflow_design:44, workforce_ai_readiness:52, ai_ethics_trust:50, ai_change_leadership:42 } }, // Talent Partner
  "u-acme-014": { overall: 43, domains: { ai_interaction:48, ai_output_evaluation:52, ai_workflow_design:38, workforce_ai_readiness:45, ai_ethics_trust:48, ai_change_leadership:38 } }, // Recruiter
  "u-acme-015": { overall: 33, domains: { ai_interaction:35, ai_output_evaluation:40, ai_workflow_design:25, workforce_ai_readiness:38, ai_ethics_trust:42, ai_change_leadership:30 } }, // Grad Recruiter
  "u-acme-016": { overall: 62, domains: { ai_interaction:62, ai_output_evaluation:58, ai_workflow_design:50, workforce_ai_readiness:55, ai_ethics_trust:52, ai_change_leadership:45 } }, // Sourcing
  "u-acme-017": { overall: 58, domains: { ai_interaction:58, ai_output_evaluation:62, ai_workflow_design:48, workforce_ai_readiness:60, ai_ethics_trust:55, ai_change_leadership:52 } }, // Employer Brand
  "u-acme-018": { overall: 66, domains: { ai_interaction:65, ai_output_evaluation:60, ai_workflow_design:58, workforce_ai_readiness:70, ai_ethics_trust:62, ai_change_leadership:75 } }, // Head L&D
  "u-acme-019": { overall: 62, domains: { ai_interaction:62, ai_output_evaluation:58, ai_workflow_design:55, workforce_ai_readiness:65, ai_ethics_trust:58, ai_change_leadership:68 } }, // L&D Digital
  "u-acme-020": { overall: 50, domains: { ai_interaction:50, ai_output_evaluation:48, ai_workflow_design:42, workforce_ai_readiness:55, ai_ethics_trust:52, ai_change_leadership:58 } }, // Learning Designer
  "u-acme-021": { overall: 32, domains: { ai_interaction:32, ai_output_evaluation:35, ai_workflow_design:25, workforce_ai_readiness:38, ai_ethics_trust:40, ai_change_leadership:42 } }, // L&D Coord
  "u-acme-022": { overall: 68, domains: { ai_interaction:68, ai_output_evaluation:65, ai_workflow_design:60, workforce_ai_readiness:72, ai_ethics_trust:65, ai_change_leadership:78 } }, // OD Consultant
  "u-acme-023": { overall: 55, domains: { ai_interaction:55, ai_output_evaluation:52, ai_workflow_design:45, workforce_ai_readiness:60, ai_ethics_trust:56, ai_change_leadership:65 } }, // Leadership Dev
  "u-acme-024": { overall: 74, domains: { ai_interaction:78, ai_output_evaluation:85, ai_workflow_design:72, workforce_ai_readiness:75, ai_ethics_trust:70, ai_change_leadership:65 } }, // Analytics Lead
  "u-acme-025": { overall: 57, domains: { ai_interaction:55, ai_output_evaluation:68, ai_workflow_design:48, workforce_ai_readiness:58, ai_ethics_trust:62, ai_change_leadership:50 } }, // C&B Manager
  "u-acme-026": { overall: 72, domains: { ai_interaction:75, ai_output_evaluation:82, ai_workflow_design:68, workforce_ai_readiness:72, ai_ethics_trust:68, ai_change_leadership:62 } }, // Sr Analyst
  "u-acme-027": { overall: 55, domains: { ai_interaction:58, ai_output_evaluation:65, ai_workflow_design:50, workforce_ai_readiness:55, ai_ethics_trust:60, ai_change_leadership:48 } }, // Reward Analyst
  "u-acme-028": { overall: 49, domains: { ai_interaction:45, ai_output_evaluation:52, ai_workflow_design:38, workforce_ai_readiness:48, ai_ethics_trust:55, ai_change_leadership:40 } }, // Benefits Spec
  "u-acme-029": { overall: 60, domains: { ai_interaction:60, ai_output_evaluation:70, ai_workflow_design:55, workforce_ai_readiness:62, ai_ethics_trust:58, ai_change_leadership:52 } }, // WFP Analyst
  "u-acme-030": { overall: 32, domains: { ai_interaction:32, ai_output_evaluation:38, ai_workflow_design:25, workforce_ai_readiness:35, ai_ethics_trust:40, ai_change_leadership:28 } }, // Jr Analyst
  "u-acme-031": { overall: 55, domains: { ai_interaction:48, ai_output_evaluation:55, ai_workflow_design:35, workforce_ai_readiness:52, ai_ethics_trust:78, ai_change_leadership:60 } }, // DEI Manager
  "u-acme-032": { overall: 56, domains: { ai_interaction:52, ai_output_evaluation:58, ai_workflow_design:40, workforce_ai_readiness:55, ai_ethics_trust:72, ai_change_leadership:58 } }, // ER Manager
  "u-acme-033": { overall: 44, domains: { ai_interaction:38, ai_output_evaluation:45, ai_workflow_design:28, workforce_ai_readiness:42, ai_ethics_trust:65, ai_change_leadership:45 } }, // ER Spec
  "u-acme-034": { overall: 48, domains: { ai_interaction:45, ai_output_evaluation:50, ai_workflow_design:35, workforce_ai_readiness:55, ai_ethics_trust:68, ai_change_leadership:52 } }, // Wellbeing
  "u-acme-035": { overall: 62, domains: { ai_interaction:60, ai_output_evaluation:62, ai_workflow_design:50, workforce_ai_readiness:65, ai_ethics_trust:70, ai_change_leadership:68 } }, // OD Spec
  "u-acme-036": { overall: 40, domains: { ai_interaction:35, ai_output_evaluation:42, ai_workflow_design:25, workforce_ai_readiness:38, ai_ethics_trust:62, ai_change_leadership:40 } }, // Policy Spec
  "u-acme-037": { overall: 52, domains: { ai_interaction:52, ai_output_evaluation:55, ai_workflow_design:62, workforce_ai_readiness:58, ai_ethics_trust:50, ai_change_leadership:48 } }, // HR Ops Mgr
  "u-acme-038": { overall: 70, domains: { ai_interaction:72, ai_output_evaluation:68, ai_workflow_design:78, workforce_ai_readiness:65, ai_ethics_trust:60, ai_change_leadership:58 } }, // HRIS Mgr
  "u-acme-039": { overall: 60, domains: { ai_interaction:65, ai_output_evaluation:62, ai_workflow_design:70, workforce_ai_readiness:60, ai_ethics_trust:55, ai_change_leadership:50 } }, // Systems Analyst
  "u-acme-040": { overall: 46, domains: { ai_interaction:48, ai_output_evaluation:50, ai_workflow_design:55, workforce_ai_readiness:52, ai_ethics_trust:45, ai_change_leadership:42 } }, // Shared Services
  "u-acme-041": { overall: 33, domains: { ai_interaction:30, ai_output_evaluation:32, ai_workflow_design:38, workforce_ai_readiness:35, ai_ethics_trust:38, ai_change_leadership:28 } }, // HR Ops Coord
  "u-acme-042": { overall: 72, domains: { ai_interaction:78, ai_output_evaluation:72, ai_workflow_design:82, workforce_ai_readiness:68, ai_ethics_trust:62, ai_change_leadership:60 } }, // HR Tech Consultant
  "u-acme-043": { overall: 25, domains: { ai_interaction:28, ai_output_evaluation:30, ai_workflow_design:20, workforce_ai_readiness:25, ai_ethics_trust:35, ai_change_leadership:22 } }, // HR Grad
  "u-acme-044": { overall: 30, domains: { ai_interaction:32, ai_output_evaluation:35, ai_workflow_design:22, workforce_ai_readiness:28, ai_ethics_trust:38, ai_change_leadership:25 } }, // People Grad TA
  "u-acme-045": { overall: 40, domains: { ai_interaction:40, ai_output_evaluation:45, ai_workflow_design:30, workforce_ai_readiness:35, ai_ethics_trust:42, ai_change_leadership:30 } }, // People Grad Analytics
  "u-acme-046": { overall: 30, domains: { ai_interaction:30, ai_output_evaluation:32, ai_workflow_design:22, workforce_ai_readiness:30, ai_ethics_trust:38, ai_change_leadership:35 } }, // People Grad L&D
  "u-acme-047": { overall: 36, domains: { ai_interaction:38, ai_output_evaluation:35, ai_workflow_design:42, workforce_ai_readiness:32, ai_ethics_trust:35, ai_change_leadership:28 } }, // People Grad Ops
  // Remaining users get mid-range scores
  "u-acme-048": { overall: 55, domains: { ai_interaction:55, ai_output_evaluation:58, ai_workflow_design:50, workforce_ai_readiness:55, ai_ethics_trust:52, ai_change_leadership:48 } },
  "u-acme-049": { overall: 68, domains: { ai_interaction:68, ai_output_evaluation:65, ai_workflow_design:60, workforce_ai_readiness:70, ai_ethics_trust:65, ai_change_leadership:72 } },
  "u-acme-050": { overall: 45, domains: { ai_interaction:45, ai_output_evaluation:48, ai_workflow_design:38, workforce_ai_readiness:45, ai_ethics_trust:50, ai_change_leadership:42 } },
};

// Get all scores for this tenant
const [scores] = await conn.query(`
  SELECT s.id as score_id, s.session_id, s.score_breakdown_json, s.overall_score, sess.user_id
  FROM assessment_scores s
  JOIN assessment_sessions sess ON s.session_id = sess.id
  WHERE sess.tenant_id = ?
`, [tenantId]);

console.log(`Found ${scores.length} scores to patch`);

let patched = 0;
for (const row of scores) {
  const target = TARGET_SCORES[row.user_id];
  if (!target) continue;

  const bd = typeof row.score_breakdown_json === 'string'
    ? JSON.parse(row.score_breakdown_json)
    : row.score_breakdown_json;

  // Build new capabilityScores with correct format
  const capabilityScores = {};
  for (const [dk, base] of Object.entries(target.domains)) {
    const s = jitter(base, 5);
    capabilityScores[dk] = { score: s, band: band(s), signalCount: 6 };
  }

  // Compute actual overall from domain scores
  const domainVals = Object.values(capabilityScores).map(v => v.score);
  const actualOverall = Math.round(domainVals.reduce((a, b) => a + b, 0) / domainVals.length);
  const overallDecimal = actualOverall / 100;

  // Build patched breakdown preserving existing fields
  const patched_bd = {
    ...bd,
    overall_score: overallDecimal,
    overallScore: overallDecimal,
    readiness_state: readiness(actualOverall),
    readiness: { state: readiness(actualOverall), band: band(actualOverall) },
    primaryState: readiness(actualOverall),
    capabilityScores,
    totalAnswers: bd.totalAnswers || 38,
  };

  await conn.query(
    `UPDATE assessment_scores SET overall_score = ?, score_breakdown_json = ? WHERE id = ?`,
    [overallDecimal.toFixed(4), JSON.stringify(patched_bd), row.score_id]
  );
  patched++;
}

console.log(`Patched ${patched} scores`);

// Verify distribution
const [updated] = await conn.query(`
  SELECT
    JSON_UNQUOTE(JSON_EXTRACT(s.score_breakdown_json, '$.readiness_state')) as readiness,
    COUNT(*) as cnt,
    ROUND(AVG(s.overall_score * 100)) as avg_score
  FROM assessment_scores s
  JOIN assessment_sessions sess ON s.session_id = sess.id
  WHERE sess.tenant_id = ?
  GROUP BY readiness
`, [tenantId]);
console.log("\nReadiness distribution after patch:");
console.table(updated);

await conn.end();
console.log("Done");
