/**
 * find-dunder-user.mjs
 * Find the reward@dunder.com user ID, tenant ID, and current session state.
 */
import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Find user
const [users] = await conn.query(
  `SELECT id, tenant_id, email, first_name, last_name, aiq_role, job_function, seniority_level, role_family, sector
   FROM users WHERE email = 'reward@dunder.com' LIMIT 1`
);
if (!users[0]) { console.error("User not found"); process.exit(1); }
const user = users[0];
console.log("User:", JSON.stringify(user, null, 2));

// Find sessions
const [sessions] = await conn.query(
  `SELECT id, state, blueprint_id, started_at, completed_at, scoring_config_version_at_start
   FROM assessment_sessions WHERE user_id = ? ORDER BY started_at DESC`,
  [user.id]
);
console.log("\nSessions:", sessions.length);
for (const s of sessions) {
  const [answers] = await conn.query(
    `SELECT COUNT(*) as cnt FROM assessment_answers WHERE session_id = ?`,
    [s.id]
  );
  console.log(`  ${s.id} | state=${s.state} | answers=${answers[0].cnt} | blueprint=${s.blueprint_id}`);
}

// Find blueprint
const [blueprints] = await conn.query(
  `SELECT id, name, description FROM assessment_blueprints LIMIT 5`
);
console.log("\nBlueprints:", blueprints.map(b => `${b.id}: ${b.name}`).join(", "));

await conn.end();
