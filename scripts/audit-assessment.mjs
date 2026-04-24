import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Content scenarios
const [scenarios] = await conn.query(`
  SELECT id, title, domain, capability_key, interaction_type, difficulty, risk_level,
         LEFT(scenario, 200) as scenario_preview, LEFT(question, 150) as question_preview,
         governance_sensitive, primary_signal
  FROM content_scenarios
  WHERE status = 'published'
  ORDER BY domain, id
`);

console.log('=== CONTENT SCENARIOS ===');
console.log('Total:', scenarios.length);

console.log('\n--- By Domain ---');
const byDomain = {};
for (const s of scenarios) { byDomain[s.domain] = (byDomain[s.domain] || 0) + 1; }
for (const [k, v] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}

console.log('\n--- By Interaction Type ---');
const byType = {};
for (const s of scenarios) { byType[s.interaction_type] = (byType[s.interaction_type] || 0) + 1; }
for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}

console.log('\n--- By Capability Key ---');
const byCap = {};
for (const s of scenarios) { byCap[s.capability_key || 'null'] = (byCap[s.capability_key || 'null'] || 0) + 1; }
for (const [k, v] of Object.entries(byCap).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}

console.log('\n--- Sample Scenarios (20) ---');
for (const s of scenarios.slice(0, 20)) {
  console.log(`\n[${s.domain}] [${s.interaction_type}] [${s.capability_key}] ${s.title}`);
  console.log(`  Scenario: ${s.scenario_preview}`);
  console.log(`  Question: ${s.question_preview}`);
}

// 2. Assessment items (the older static items)
const [items] = await conn.query(`
  SELECT id, LEFT(scenario_text, 200) as scenario_preview, difficulty, 
         JSON_EXTRACT(metadata_json, '$.capability_key') as cap_key,
         JSON_EXTRACT(metadata_json, '$.interaction_type') as int_type,
         JSON_EXTRACT(metadata_json, '$.domain') as domain
  FROM assessment_items
  WHERE status = 'published'
  ORDER BY id
  LIMIT 60
`);

console.log('\n\n=== ASSESSMENT ITEMS (static) ===');
console.log('Total:', items.length);

console.log('\n--- By Capability Key ---');
const itemByCap = {};
for (const i of items) { 
  const k = i.cap_key ? JSON.parse(i.cap_key) : 'null';
  itemByCap[k] = (itemByCap[k] || 0) + 1; 
}
for (const [k, v] of Object.entries(itemByCap).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}

console.log('\n--- Sample Items (10) ---');
for (const i of items.slice(0, 10)) {
  console.log(`\n[${i.cap_key}] [${i.int_type}] ${i.scenario_preview}`);
}

await conn.end();
