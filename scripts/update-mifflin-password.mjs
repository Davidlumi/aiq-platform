/**
 * Update Mifflin CPO password to match demo password Reward2024!
 */
import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";
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

const passwordHash = await bcrypt.hash("Reward2024!", 10);
const [result] = await conn.execute(
  `UPDATE users SET password_hash = ? WHERE email = 'cpo@mifflin.com'`,
  [passwordHash]
);
console.log(`✓ Password updated for cpo@mifflin.com → Reward2024! (rows affected: ${result.affectedRows})`);
await conn.end();
