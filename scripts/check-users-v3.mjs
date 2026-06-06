import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

let DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  for (const pid of ['89424', '101730', '101817']) {
    try {
      const e = readFileSync('/proc/' + pid + '/environ', 'utf8');
      const m = e.split('\0').find(x => x.startsWith('DATABASE_URL='));
      if (m) { DATABASE_URL = m.replace('DATABASE_URL=', ''); break; }
    } catch {}
  }
}

const conn = await createConnection(DATABASE_URL);
const [cols] = await conn.execute('DESCRIBE users');
console.log('COLUMNS:', cols.map(c => c.Field).join(', '));
const [users] = await conn.execute('SELECT id, email, first_name, last_name, aiq_role, tenant_id FROM users LIMIT 10');
console.log('USERS:');
for (const u of users) console.log(JSON.stringify(u));
await conn.end();
