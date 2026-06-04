/**
 * Seed script: create Mifflin tenant (CPO mode) + CPO user
 * Run: node scripts/seed-mifflin.mjs
 */
import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// Parse mysql2 connection from DATABASE_URL
// Format: mysql://user:pass@host:port/dbname
const url = new URL(DB_URL);
const conn = await createConnection({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.replace(/^\//, ""),
  ssl: { rejectUnauthorized: false },
});

const tenantId = randomUUID();
const userId = randomUUID();
const tenantSettingsId = randomUUID();
const PASSWORD = "mifflin2026";
const passwordHash = await bcrypt.hash(PASSWORD, 10);

// 1. Create tenant (CPO mode)
await conn.execute(
  `INSERT INTO tenants (id, name, slug, primary_domain, status, plan, mode, created_at, updated_at)
   VALUES (?, ?, ?, ?, 'active', 'enterprise', 'cpo', NOW(), NOW())`,
  [tenantId, "Mifflin", "mifflin", "mifflin.com"]
);
console.log(`✓ Tenant created: Mifflin (id=${tenantId})`);

// 2. Create tenant settings
await conn.execute(
  `INSERT INTO tenant_settings (id, tenant_id, config_json, created_at, updated_at)
   VALUES (?, ?, '{}', NOW(), NOW())`,
  [tenantSettingsId, tenantId]
);
console.log(`✓ Tenant settings created`);

// 3. Create CPO user
await conn.execute(
  `INSERT INTO users (
    id, tenant_id, email, first_name, last_name, password_hash,
    status, onboarding_completed, experience_level, ai_usage_level,
    job_function, aiq_role, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, 'active', 1, 'senior', 'regular', 'Chief People Officer', 'cpo', NOW(), NOW())`,
  [userId, tenantId, "cpo@mifflin.com", "Alex", "Mifflin", passwordHash]
);
console.log(`✓ CPO user created: cpo@mifflin.com / ${PASSWORD}`);

await conn.end();

console.log("\n=== Mifflin tenant ready ===");
console.log(`Tenant ID : ${tenantId}`);
console.log(`User ID   : ${userId}`);
console.log(`Email     : cpo@mifflin.com`);
console.log(`Password  : ${PASSWORD}`);
console.log(`Mode      : cpo (Company-wide AI Strategy)`);
console.log(`Plan      : enterprise`);
console.log(`Size      : 200 employees (small tech company)`);
