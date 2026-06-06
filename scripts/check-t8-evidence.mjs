import { createConnection } from 'mysql2/promise';

// DATABASE_URL from running server process
const DATABASE_URL = 'mysql://4N5hTKUqkKVKapg.d5b2b277a65e:34Zk7gJ5YtAXc0ha7zDL@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/6QhAyfvWVgMWYWiBVkrTMQ?ssl={"rejectUnauthorized":true}';

const conn = await createConnection(DATABASE_URL);

// 1. Get users with aiq_role
const [users] = await conn.execute('SELECT id, email, first_name, aiq_role, tenant_id FROM users LIMIT 10');
console.log('=== USERS ===');
for (const u of users) console.log(JSON.stringify(u));

// 2. Get risk_register_json for all tenants
const [risks] = await conn.execute(
  'SELECT tenant_id, risk_register_json FROM ail_org_context WHERE risk_register_json IS NOT NULL'
);
console.log('\n=== RISK REGISTER DATA ===');
for (const r of risks) {
  console.log('tenant:', r.tenant_id);
  console.log('risk_register_json (first 500 chars):', r.risk_register_json.substring(0, 500));
  try {
    const parsed = JSON.parse(r.risk_register_json);
    console.log('parsed type:', Array.isArray(parsed) ? 'ARRAY (old format)' : 'OBJECT (new format)');
    if (parsed.risks) console.log('risks count:', parsed.risks.length);
    if (Array.isArray(parsed)) console.log('array length:', parsed.length);
  } catch (e) {
    console.log('parse error:', e.message);
  }
}

await conn.end();
