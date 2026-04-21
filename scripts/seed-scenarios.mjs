/**
 * Generic scenario seed script.
 * Usage: node scripts/seed-scenarios.mjs /path/to/scenarios.json
 */
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';
import fs from 'fs';

const filePath = process.argv[2];
if (!filePath) { console.error('Usage: node seed-scenarios.mjs <path-to-json>'); process.exit(1); }

const scenarios = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const conn = await mysql.createConnection(process.env.DATABASE_URL);

let inserted = 0, skipped = 0, errors = 0;

for (const s of scenarios) {
  const id = randomUUID();
  try {
    await conn.execute(
      `INSERT INTO content_scenarios 
        (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level,
         governance_sensitive, scenario, \`constraint\`, question, workflow_key, primary_signal,
         ambiguity_level, status, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 1, NOW(), NOW())`,
      [id, s.interaction_id, s.title, s.domain, s.capability_key, s.interaction_type,
       s.difficulty, s.risk_level, s.governance_sensitive ? 1 : 0,
       s.scenario, s.constraint || null, s.question, s.workflow_key || null,
       s.primary_signal || null, s.ambiguity_level || 2]
    );

    for (let i = 0; i < (s.options || []).length; i++) {
      const opt = s.options[i];
      await conn.execute(
        `INSERT INTO content_scenario_options
          (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), id, i + 1, opt.label, opt.value, opt.outcome_class,
         JSON.stringify(opt.signal_deltas || {}), opt.rationale || null, opt.is_optimal ? 1 : 0]
      );
    }

    console.log(`✅ ${s.title}`);
    inserted++;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log(`⏭  Duplicate: ${s.title}`);
      skipped++;
    } else {
      console.error(`❌ ${s.title}: ${err.message}`);
      errors++;
    }
  }
}

await conn.end();
console.log(`\nDone. Inserted: ${inserted} | Skipped: ${skipped} | Errors: ${errors}`);
