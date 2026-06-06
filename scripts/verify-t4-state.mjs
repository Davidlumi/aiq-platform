import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load env manually without dotenv to avoid the dotenv warning
const envPath = join(__dirname, '..', '.env');
let dbUrl;
try {
  const envContent = readFileSync(envPath, 'utf8');
  const match = envContent.match(/^DATABASE_URL=(.+)$/m);
  if (match) dbUrl = match[1].trim();
} catch {}
if (!dbUrl) dbUrl = process.env.DATABASE_URL;

const conn = await createConnection(dbUrl);
const [rows] = await conn.execute(
  `SELECT tenant_id,
    CASE WHEN outcomes_json IS NOT NULL THEN 'HAS_DATA' ELSE 'NULL' END as outcomes_state,
    CASE WHEN success_measures_json IS NOT NULL THEN 'HAS_DATA' ELSE 'NULL' END as success_measures_state,
    CASE WHEN risk_register_json IS NOT NULL THEN 'HAS_DATA' ELSE 'NULL' END as risk_register_state,
    LEFT(success_measures_json, 200) as smj_preview,
    LEFT(risk_register_json, 200) as rrj_preview
   FROM ail_org_context`
);
for (const r of rows) {
  console.log(`\n--- ${r.tenant_id} ---`);
  console.log(`  outcomes_json: ${r.outcomes_state}`);
  console.log(`  success_measures_json: ${r.success_measures_state}`);
  console.log(`  risk_register_json: ${r.risk_register_state}`);
  if (r.smj_preview) console.log(`  smj_preview: ${r.smj_preview}`);
  if (r.rrj_preview) console.log(`  rrj_preview: ${r.rrj_preview}`);
}
await conn.end();
