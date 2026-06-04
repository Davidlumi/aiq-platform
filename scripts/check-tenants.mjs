import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const url = new URL(process.env.DATABASE_URL);
const conn = await createConnection({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.replace(/^\//, ""),
  ssl: { rejectUnauthorized: false },
});

const [tenants] = await conn.execute("SELECT id, name, slug, status, mode, plan FROM tenants ORDER BY created_at DESC LIMIT 10");
console.log("=== TENANTS ===");
console.log(JSON.stringify(tenants, null, 2));

const [users] = await conn.execute("SELECT id, email, tenant_id, aiq_role, status FROM users WHERE email LIKE '%mifflin%' OR email LIKE '%cpo%'");
console.log("=== MIFFLIN USERS ===");
console.log(JSON.stringify(users, null, 2));

await conn.end();
