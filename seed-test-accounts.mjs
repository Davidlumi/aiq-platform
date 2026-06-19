/**
 * seed-test-accounts.mjs
 * Creates three verified test accounts directly in the database.
 * Run once: node seed-test-accounts.mjs
 */
import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const url = new URL(DB_URL);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

const SALT_ROUNDS = 12;

const accounts = [
  {
    label: "Free tier",
    email: "test-free@aiq-test.dev",
    password: "TestFree2026!",
    firstName: "Alex",
    lastName: "Free",
    paid: false,
    superuser: false,
  },
  {
    label: "Paid tier",
    email: "test-paid@aiq-test.dev",
    password: "TestPaid2026!",
    firstName: "Sam",
    lastName: "Paid",
    paid: true,
    superuser: false,
  },
  {
    label: "Platform superuser (backoffice access)",
    email: "test-admin@aiq-test.dev",
    password: "TestAdmin2026!",
    firstName: "David",
    lastName: "Admin",
    paid: true,
    superuser: true,
  },
];

for (const acct of accounts) {
  const tenantId = randomUUID();
  const userId = randomUUID();
  const slug = `test-${acct.email.split("@")[0].replace(/[^a-z0-9]/gi, "-")}-${Date.now()}`;
  const passwordHash = await bcrypt.hash(acct.password, SALT_ROUNDS);

  // Create tenant — entitlement_assessment = true for all test accounts
  await conn.execute(
    `INSERT INTO tenants (id, name, slug, status, plan,
       entitlement_assessment, entitlement_assessment_paid,
       entitlement_strategy_company, entitlement_strategy_reward,
       created_at, updated_at)
     VALUES (?, ?, ?, 'active', 'foundation', 1, ?, 0, 0, NOW(), NOW())`,
    [tenantId, `${acct.firstName} ${acct.lastName}`, slug, acct.paid ? 1 : 0]
  );

  // Create user — status 'active', email_verified_at set (no verification email needed)
  await conn.execute(
    `INSERT INTO users (id, tenant_id, email, first_name, last_name,
       password_hash, status, aiq_role, email_verified_at,
       is_platform_superuser, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', 'learner', NOW(), ?, NOW(), NOW())`,
    [
      userId,
      tenantId,
      acct.email,
      acct.firstName,
      acct.lastName,
      passwordHash,
      acct.superuser ? 1 : 0,
    ]
  );

  console.log(`✓ ${acct.label}`);
  console.log(`  Email:     ${acct.email}`);
  console.log(`  Password:  ${acct.password}`);
  console.log(`  Paid:      ${acct.paid}`);
  console.log(`  Superuser: ${acct.superuser}`);
  console.log();
}

await conn.end();
console.log("Done. All accounts are email-verified and ready to log in.");
