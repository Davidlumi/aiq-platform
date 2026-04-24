import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check for david user
const [users] = await conn.query("SELECT id, tenant_id, email, first_name, last_name, status FROM users WHERE email = 'david@hrdatahub.com'");
console.log("=== User ===");
console.log(JSON.stringify(users, null, 2));

if (users.length > 0) {
  const userId = users[0].id;
  const tenantId = users[0].tenant_id;
  
  // Check tenant
  const [tenants] = await conn.query("SELECT id, name, slug FROM tenants WHERE id = ?", [tenantId]);
  console.log("\n=== Tenant ===");
  console.log(JSON.stringify(tenants, null, 2));
  
  // Check user roles
  const [roles] = await conn.query("SELECT ur.role_id FROM user_roles ur WHERE ur.user_id = ?", [userId]);
  console.log("\n=== Roles ===");
  console.log(JSON.stringify(roles, null, 2));
  
  // Check existing sessions
  const [sessions] = await conn.query("SELECT id, blueprint_id, state, started_at, completed_at FROM assessment_sessions WHERE user_id = ?", [userId]);
  console.log("\n=== Sessions ===");
  console.log(JSON.stringify(sessions, null, 2));
  
  // Check existing scores
  if (sessions.length > 0) {
    const sessionIds = sessions.map(s => s.id);
    const [scores] = await conn.query("SELECT id, session_id, overall_score FROM assessment_scores WHERE session_id IN (?)", [sessionIds]);
    console.log("\n=== Scores ===");
    console.log(JSON.stringify(scores, null, 2));
  }
  
  // Check blueprints available
  const [blueprints] = await conn.query("SELECT id, title FROM assessment_blueprints WHERE tenant_id = ? LIMIT 5", [tenantId]);
  console.log("\n=== Blueprints ===");
  console.log(JSON.stringify(blueprints, null, 2));
} else {
  console.log("User not found - checking all tenants");
  const [allTenants] = await conn.query("SELECT id, name, slug FROM tenants");
  console.log(JSON.stringify(allTenants, null, 2));
}

await conn.end();
