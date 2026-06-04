import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

// Parse mysql:// URL
const url = new URL(DB_URL);
const sslParam = url.searchParams.get("ssl");
const sslConfig = sslParam ? JSON.parse(sslParam) : { rejectUnauthorized: true };

const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || "4000"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: sslConfig,
});

const tenantId = randomUUID();
const userId = randomUUID();
const passwordHash = await bcrypt.hash("manutD99$$", 12);

// 1. Create Lumi HR tenant
const [existingTenant] = await conn.execute(
  "SELECT id FROM tenants WHERE slug = 'lumihr' LIMIT 1"
);
let resolvedTenantId = tenantId;
if (existingTenant.length > 0) {
  resolvedTenantId = existingTenant[0].id;
  console.log("Lumi HR tenant already exists:", resolvedTenantId);
} else {
  await conn.execute(
    `INSERT INTO tenants (id, name, slug, mode, status, created_at) VALUES (?, 'Lumi HR', 'lumihr', 'cpo', 'active', NOW())`,
    [tenantId]
  );
  console.log("Created Lumi HR tenant:", tenantId);
}

// 2. Check if user already exists
const [existingUser] = await conn.execute(
  "SELECT id, is_platform_superuser FROM users WHERE email = 'david@lumihr.co.uk' LIMIT 1"
);

if (existingUser.length > 0) {
  // Update existing user
  await conn.execute(
    `UPDATE users SET password_hash = ?, is_platform_superuser = 1, status = 'active', tenant_id = ? WHERE email = 'david@lumihr.co.uk'`,
    [passwordHash, resolvedTenantId]
  );
  console.log("Updated existing user david@lumihr.co.uk — is_platform_superuser = 1");
} else {
  // Create new user
  await conn.execute(
    `INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, aiq_role, onboarding_completed, is_platform_superuser, created_at)
     VALUES (?, ?, 'david@lumihr.co.uk', 'David', 'Lumi', ?, 'active', 'cpo', 1, 1, NOW())`,
    [userId, resolvedTenantId, passwordHash]
  );
  console.log("Created Super User david@lumihr.co.uk:", userId);
}

// 3. Verify
const [check] = await conn.execute(
  `SELECT u.email, u.first_name, u.last_name, u.is_platform_superuser, u.status, t.name AS tenant, t.slug
   FROM users u JOIN tenants t ON t.id = u.tenant_id
   WHERE u.email = 'david@lumihr.co.uk' LIMIT 1`
);
console.table(check);

await conn.end();
console.log("\nDone. Login: david@lumihr.co.uk / manutD99$$ (org code: lumihr)");
