import { getDb } from "./server/db";
import { assessmentSessions, assessmentScores, users } from "./drizzle/schema";
import { eq, inArray } from "drizzle-orm";

const db = await getDb();
if (!db) { console.log("DB unavailable"); process.exit(1); }

// Find tenants with multiple assessment model versions
const allScores = await db
  .select({
    tenantId: assessmentScores.tenantId,
    userId: assessmentScores.userId,
    modelVersion: assessmentScores.modelVersion,
    overallScore: assessmentScores.overallScore,
    capabilityScores: assessmentScores.capabilityScores,
  })
  .from(assessmentScores)
  .limit(50);

// Group by tenantId
const byTenant: Record<string, typeof allScores> = {};
for (const s of allScores) {
  if (!byTenant[s.tenantId]) byTenant[s.tenantId] = [];
  byTenant[s.tenantId].push(s);
}

// Find tenants with mixed model versions
for (const [tenantId, scores] of Object.entries(byTenant)) {
  const versions = new Set(scores.map(s => s.modelVersion));
  if (versions.size > 1) {
    console.log(`\nMixed-model tenant: ${tenantId}`);
    for (const s of scores) {
      const caps = typeof s.capabilityScores === 'string' ? JSON.parse(s.capabilityScores) : s.capabilityScores;
      console.log(`  userId: ${s.userId}  model: ${s.modelVersion}  overall: ${s.overallScore}`);
      console.log(`  capabilityScores: ${JSON.stringify(caps)}`);
    }
  }
}

// Also show what model versions exist
const versionCounts: Record<string, number> = {};
for (const s of allScores) {
  versionCounts[s.modelVersion ?? "null"] = (versionCounts[s.modelVersion ?? "null"] ?? 0) + 1;
}
console.log("\nModel version distribution:", versionCounts);
process.exit(0);
