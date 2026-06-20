import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  `SELECT asco.overall_score, asco.score_breakdown_json
   FROM assessment_scores asco
   JOIN assessment_sessions asess ON asess.id = asco.session_id
   JOIN users u ON u.id = asess.user_id
   WHERE u.email = 'test.expert@aiqtest.dev'
   LIMIT 1`
);

if (rows[0]) {
  console.log("Overall score:", rows[0].overall_score);
  const raw = rows[0].score_breakdown_json;
  const bd = typeof raw === "string" ? JSON.parse(raw) : raw;
  console.log("Has capabilityScores:", "capabilityScores" in bd);
  console.log("Has readiness:", "readiness" in bd);
  console.log("readiness.state:", bd.readiness?.state);
  console.log("ai_interaction:", JSON.stringify(bd.capabilityScores?.ai_interaction));
  console.log("workforce_ai_readiness:", JSON.stringify(bd.capabilityScores?.workforce_ai_readiness));
} else {
  console.log("No score found for expert account");
}

await conn.end();
