import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [cnt] = await conn.query('SELECT COUNT(*) as c FROM assessment_items WHERE status = "published"');
console.log('Total published assessment_items:', cnt[0].c);

const [items] = await conn.query(`
  SELECT id, LEFT(prompt, 300) as prompt_preview, difficulty, 
         metadata_json, item_type, reasoning_required
  FROM assessment_items 
  WHERE status = 'published' 
  ORDER BY id 
  LIMIT 20
`);

for (const i of items) {
  const meta = typeof i.metadata_json === 'string' ? JSON.parse(i.metadata_json) : (i.metadata_json || {});
  console.log(`\n[${meta.capability_key || 'unknown'}] [${meta.interaction_type || i.item_type}] [diff:${i.difficulty}]`);
  console.log(`  Prompt: ${i.prompt_preview}`);
  console.log(`  Domain: ${meta.domain || 'unknown'}, Signal: ${meta.primary_signal || 'unknown'}`);
}

// Also check how the adaptive engine selects items
console.log('\n\n=== ADAPTIVE ENGINE CONFIG ===');
const [bps] = await conn.query('SELECT id, metadata_json FROM assessment_blueprints LIMIT 3');
for (const bp of bps) {
  const meta = typeof bp.metadata_json === 'string' ? JSON.parse(bp.metadata_json) : (bp.metadata_json || {});
  console.log(`Blueprint ${bp.id}:`, JSON.stringify(meta, null, 2));
}

await conn.end();
