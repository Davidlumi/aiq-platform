// verify-checks-2-3.mjs — checks 2 and 3 only
import { createConnection } from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('Need DATABASE_URL'); process.exit(1); }

const conn = await createConnection(DATABASE_URL);

console.log('\n=== CHECK #2: ALL ROLES IN DB ===\n');
const [allRoles] = await conn.execute(
  "SELECT id, `key`, label FROM roles ORDER BY label"
);
console.table(allRoles);

console.log('\n=== CHECK #3: TENANT ISOLATION — TENANT ASSIGNMENTS ===\n');
const [tenantRows] = await conn.execute(
  `SELECT u.email, u.tenant_id, t.name as tenant_name
   FROM users u
   LEFT JOIN tenants t ON u.tenant_id = t.id
   WHERE u.email IN ('reward@dunder.com', 'cpo@mifflin.com')`
);
console.table(tenantRows);

// Cross-tenant adversarial check: can user from tenant A appear in tenant B's user list?
if (tenantRows.length >= 2) {
  const a = tenantRows[0]; // cpo@mifflin.com
  const b = tenantRows[1]; // reward@dunder.com
  if (a.tenant_id !== b.tenant_id) {
    const [crossAB] = await conn.execute(
      `SELECT COUNT(*) as cnt FROM users WHERE tenant_id = ? AND email = ?`,
      [b.tenant_id, a.email]
    );
    const [crossBA] = await conn.execute(
      `SELECT COUNT(*) as cnt FROM users WHERE tenant_id = ? AND email = ?`,
      [a.tenant_id, b.email]
    );
    console.log(`\nCross-tenant check A→B: ${a.email} visible in ${b.tenant_name}?`, crossAB[0].cnt === 0 ? 'NO ✓' : 'YES ✗');
    console.log(`Cross-tenant check B→A: ${b.email} visible in ${a.tenant_name}?`, crossBA[0].cnt === 0 ? 'NO ✓' : 'YES ✗');
  }
}

// Count total users per tenant (to confirm scoping)
const [perTenant] = await conn.execute(
  `SELECT t.name, COUNT(u.id) as user_count
   FROM tenants t
   LEFT JOIN users u ON u.tenant_id = t.id
   GROUP BY t.id, t.name
   ORDER BY t.name`
);
console.log('\nUsers per tenant:');
console.table(perTenant);

await conn.end();
console.log('\nDone.');
