import mysql from "mysql2/promise";
const u = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: u.hostname, port: parseInt(u.port || "3306"),
  user: u.username, password: u.password,
  database: u.pathname.slice(1), ssl: { rejectUnauthorized: false }
});
const [roles] = await conn.execute("SELECT id, `key` FROM roles LIMIT 20");
console.log("Roles:", JSON.stringify(roles));
const [ur] = await conn.execute(
  "SELECT ur.user_id, ur.tenant_id, r.`key` FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id LIKE 'tst-%' LIMIT 20"
);
console.log("UserRoles:", JSON.stringify(ur));
const [tenants] = await conn.execute(
  "SELECT id, slug, plan FROM tenants WHERE id LIKE 'tst-%' LIMIT 10"
);
console.log("Tenants:", JSON.stringify(tenants));
await conn.end();
process.exit(0);
