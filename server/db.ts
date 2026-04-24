import { eq, and, isNull, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  tenants,
  userRoles,
  roles,
  userStates,
  type User,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByEmail(tenantId: string, email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email, email.toLowerCase())))
    .limit(1);
  return result[0];
}

export async function getUserRoleKeys(userId: string, tenantId: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId)));
  return result.map((r) => r.key);
}

export async function getCurrentUserState(userId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(userStates)
    .where(and(eq(userStates.userId, userId), isNull(userStates.effectiveTo)))
    .orderBy(desc(userStates.effectiveFrom))
    .limit(1);
  return result[0];
}

export async function getTenantBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return result[0];
}

export async function getTenantById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0];
}

// B4: Subscription tier helper — returns the plan for a tenant
export type TenantPlan = "foundation" | "readiness" | "enterprise";
const PLAN_RANK: Record<TenantPlan, number> = { foundation: 0, readiness: 1, enterprise: 2 };
export async function getTenantPlan(tenantId: string): Promise<TenantPlan> {
  const db = await getDb();
  if (!db) return "foundation";
  const result = await db.select({ plan: tenants.plan }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return (result[0]?.plan as TenantPlan) ?? "foundation";
}
export function planAtLeast(actual: TenantPlan, required: TenantPlan): boolean {
  return PLAN_RANK[actual] >= PLAN_RANK[required];
}

// ─── Compatibility stubs (sdk.ts references these) ───────────────────────────
// The SDK is not used for auth in AiQ (we use email/password), but we keep
// these stubs to avoid TypeScript errors in the core framework files.

export async function getUserByOpenId(_openId: string): Promise<User | undefined> {
  return undefined;
}

export async function upsertUser(_data: Partial<User> & { openId?: string }): Promise<void> {
  // No-op: AiQ uses email/password auth, not OAuth
}
