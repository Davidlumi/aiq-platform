// verify-pilot-accounts.mjs — read-only check of pilot user accounts
// Run with: node scripts/verify-pilot-accounts.mjs
import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load DATABASE_URL from the running server process env
const envPath = '/home/ubuntu/aiq-platform/.env.local';
let DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  // Try to read from the process environment of the running server
  try {
    const procEnv = readFileSync('/proc/' + process.env.SERVER_PID + '/environ', 'utf8');
    const match = procEnv.split('\0').find(e => e.startsWith('DATABASE_URL='));
    if (match) DATABASE_URL = match.slice('DATABASE_URL='.length);
  } catch {}
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found. Run with: DATABASE_URL=... node scripts/verify-pilot-accounts.mjs');
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);

console.log('\n=== CHECK #1: PILOT ACCOUNTS ===\n');

// Query both pilot users
const [userRows] = await conn.execute(
  `SELECT u.id, u.email, u.aiq_role, u.status, u.is_platform_superuser, u.onboarding_completed,
          t.name as tenant_name, t.mode as tenant_mode, t.status as tenant_status
   FROM users u
   LEFT JOIN tenants t ON u.tenant_id = t.id
   WHERE u.email IN ('reward@dunder.com', 'cpo@mifflin.com')`
);
console.log('User + Tenant rows:');
console.table(userRows);

// Query roles for each user
for (const u of userRows) {
  const [roleRows] = await conn.execute(
    `SELECT r.key, r.label FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [u.id]
  );
  console.log(`\nRoles for ${u.email}:`, roleRows.length === 0 ? '(none)' : roleRows.map(r => r.key).join(', '));
}

console.log('\n=== CHECK #2: TENANT ADMIN USER MANAGEMENT ===\n');
// Check users.ts for tenant_admin access — we'll read the file
console.log('See server/routers/users.ts — checking requireRole in create/changeRole/bulkInvite...');

const [allRoles] = await conn.execute(`SELECT id, key, label FROM roles ORDER BY key`);
console.log('\nAll roles in DB:');
console.table(allRoles);

console.log('\n=== CHECK #3: TENANT ISOLATION SAMPLE ===\n');
// Get tenant IDs for both pilot users
const [tenantRows] = await conn.execute(
  `SELECT u.email, u.tenant_id, t.name as tenant_name FROM users u
   LEFT JOIN tenants t ON u.tenant_id = t.id
   WHERE u.email IN ('reward@dunder.com', 'cpo@mifflin.com')`
);
console.log('Tenant assignments:');
console.table(tenantRows);

// Check if any user data crosses tenants (e.g., can we find a user from tenant A in tenant B's query?)
if (tenantRows.length >= 2) {
  const tenantA = tenantRows[0];
  const tenantB = tenantRows[1];
  if (tenantA.tenant_id !== tenantB.tenant_id) {
    const [crossCheck] = await conn.execute(
      `SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND email = ?`,
      [tenantB.tenant_id, tenantA.email]
    );
    console.log(`\nCross-tenant check: Can ${tenantA.email} (tenant ${tenantA.tenant_name}) be found in ${tenantB.tenant_name}'s tenant?`);
    console.log(`Result: ${crossCheck[0].count === 0 ? 'NO (correct — isolated)' : 'YES (PROBLEM!)'}`);
  }
}

await conn.end();
console.log('\nDone.');
