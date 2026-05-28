import { getDb } from "../server/db";
import { assessmentSessions, tenants } from "../drizzle/schema";
import { lt, and, isNotNull, eq, sql } from "drizzle-orm";

const MIGRATION_CUTOFF = new Date("2026-05-28T12:36:10Z");

const db = await getDb();
if (!db) { console.error("No DB"); process.exit(1); }

const tenantBreakdown = await db
  .select({ tenantId: assessmentSessions.tenantId, cnt: sql<number>`COUNT(*)` })
  .from(assessmentSessions)
  .where(and(isNotNull(assessmentSessions.completedAt), eq(assessmentSessions.state, "completed"), lt(assessmentSessions.completedAt, MIGRATION_CUTOFF)))
  .groupBy(assessmentSessions.tenantId);

console.log("TENANT_BREAKDOWN:", JSON.stringify(tenantBreakdown));

const allTenants = await db.select({ id: tenants.id, name: tenants.name, slug: tenants.slug }).from(tenants);
console.log("ALL_TENANTS:", JSON.stringify(allTenants));

process.exit(0);
