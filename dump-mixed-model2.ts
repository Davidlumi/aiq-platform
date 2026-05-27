import { getDb } from "./server/db";
import { assessmentSessions, assessmentScores } from "./drizzle/schema";
import { eq, desc } from "drizzle-orm";

const db = await getDb();
if (!db) { console.log("DB unavailable"); process.exit(1); }

// Get a sample of assessment scores with their model versions
const sessions = await db
  .select({
    sessionId: assessmentSessions.id,
    tenantId: assessmentSessions.tenantId,
    userId: assessmentSessions.userId,
    state: assessmentSessions.state,
  })
  .from(assessmentSessions)
  .where(eq(assessmentSessions.state, "completed"))
  .limit(20);

console.log(`Completed sessions found: ${sessions.length}`);

for (const session of sessions.slice(0, 5)) {
  const [score] = await db
    .select({
      modelVersion: assessmentScores.modelVersion,
      overallScore: assessmentScores.overallScore,
      scoreBreakdownJson: assessmentScores.scoreBreakdownJson,
    })
    .from(assessmentScores)
    .where(eq(assessmentScores.sessionId, session.sessionId))
    .limit(1);
  
  if (!score) continue;
  
  const breakdown = typeof score.scoreBreakdownJson === "string"
    ? JSON.parse(score.scoreBreakdownJson)
    : (score.scoreBreakdownJson ?? {});
  
  const rawCaps = breakdown.capabilityScores;
  
  console.log(`\nSession: ${session.sessionId}`);
  console.log(`  tenantId: ${session.tenantId}`);
  console.log(`  modelVersion: ${score.modelVersion}`);
  console.log(`  overallScore: ${score.overallScore}`);
  
  if (rawCaps) {
    console.log(`  capabilityScores format: ${JSON.stringify(rawCaps).substring(0, 200)}`);
    // Show extracted scores
    const extracted: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawCaps as Record<string, unknown>)) {
      const num = typeof v === "number" ? v : (v as any)?.score;
      if (typeof num === "number") extracted[k] = num;
    }
    console.log(`  extracted domain scores: ${JSON.stringify(extracted)}`);
  }
}
process.exit(0);
