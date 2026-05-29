/**
 * Seed script: Dunder Mifflin tenant + Reward Leader user
 * Run: node scripts/seed-dunder.mjs
 *
 * Creates:
 *   - Tenant: Dunder Mifflin (mode=reward, plan=enterprise, status=active)
 *   - User:   reward@dunder.com / Reward2024! (aiqRole=reward_leader)
 *   - Tenant settings with defaults
 */
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const tenantId = randomUUID();
const userId = randomUUID();
const settingsId = randomUUID();
const passwordHash = await bcrypt.hash("Reward2024!", 12);

// 1. Tenant
await conn.execute(
  `INSERT INTO tenants (id, name, slug, status, plan, mode, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [tenantId, "Dunder Mifflin", "dunder", "active", "enterprise", "reward"]
);
console.log(`✅ Tenant created: Dunder Mifflin (id=${tenantId})`);

// 2. Tenant settings
await conn.execute(
  `INSERT INTO tenant_settings (id, tenant_id, credibility_threshold, revalidation_days_low,
     revalidation_days_medium, revalidation_days_high, default_risk_model_version,
     default_learning_model_version, config_json, created_at, updated_at)
   VALUES (?, ?, 0.75, 90, 60, 30, 'v1', 'v1', '{}', NOW(), NOW())`,
  [settingsId, tenantId]
);
console.log(`✅ Tenant settings created`);

// 3. Reward Leader user
await conn.execute(
  `INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, aiq_role,
     onboarding_completed, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, 'active', ?, false, NOW(), NOW())`,
  [userId, tenantId, "reward@dunder.com", "Reward", "Leader", passwordHash, "reward_leader"]
);
console.log(`✅ User created: reward@dunder.com (id=${userId})`);
console.log(`\n--- Login credentials ---`);
console.log(`  Email:    reward@dunder.com`);
console.log(`  Password: Reward2024!`);
console.log(`  Tenant:   dunder`);
console.log(`  Role:     reward_leader`);

await conn.end();
console.log("\n✅ Dunder seed complete");
