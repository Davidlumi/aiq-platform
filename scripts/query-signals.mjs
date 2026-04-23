import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Use the project's drizzle db connection
const result = execSync(
  `cd /home/ubuntu/aiq-platform && node -r dotenv/config -e "
const { db } = require('./server/_core/db.js');
db.execute('SELECT signal_key, capability_key FROM canonical_signal_keys ORDER BY capability_key, signal_key')
  .then(([rows]) => { console.log(JSON.stringify(rows)); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
"`,
  { encoding: 'utf8', timeout: 15000 }
);
const rows = JSON.parse(result);
console.log('Total rows:', rows.length);
rows.forEach(r => console.log(`  ${r.signal_key} → ${r.capability_key}`));
