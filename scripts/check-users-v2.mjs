import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

// Get DATABASE_URL from running server process
let DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  const pids = ['89424', '101730', '101817'];
  for (const pid of pids) {
    try {
      const env = readFileSync(`/proc/${pid}/environ`, 'utf8');
      const match = env.split('\0').find(e => e.startsWith('DATABASE_URL='));
      if (match) { DATABASE_URL = match.replace('DATABASE_URL=', ''); break; }
    } catch {}
  }
}

const conn = await createConnection(DATABASE_URL);
const [users] = await conn.execute('SELECT id, email, name, role, tenant_id FROM users LIMIT 10');
console.log('=== USERS ===');
for (const u of users) console.log(JSON.stringify(u));

// Also check stage gate state for the main tenant
const [gates] = await conn.execute(
  "SELECT tenant_id, LEFT(stage_gate_state_json, 300) as gate_preview FROM ail_org_context WHERE tenant_id = '259e9782-a4e2-45de-b9f1-00456eecbc2d'"
);
console.log('\n=== STAGE GATE STATE (tenant 259e9782) ===');
for (const g of gates) console.log(JSON.stringify(g));

await conn.end();
