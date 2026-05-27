/**
 * dump-maya-walkthrough.ts
 * Section 2.1: Maya/Northbridge 10-stage walkthrough
 * Dumps gate status, confirmed data, and figures at each stage.
 */
import { createConnection } from "mysql2/promise";

const db = await createConnection(process.env.DATABASE_URL!);

// Find Maya/Northbridge tenant
const [tenants] = await db.query(`SELECT id, name, mode FROM tenants WHERE name LIKE '%Northbridge%' OR name LIKE '%Maya%' LIMIT 5`) as any;
console.log("\n=== TENANTS ===");
console.log(JSON.stringify(tenants, null, 2));

if (tenants.length === 0) {
  console.log("No Maya/Northbridge tenant found. Listing all tenants:");
  const [allTenants] = await db.query(`SELECT id, name, mode FROM tenants LIMIT 20`) as any;
  console.log(JSON.stringify(allTenants, null, 2));
}

await db.end();
