/**
 * Seed script: 5 Gold Standard Scenarios
 * These are the reference-quality scenarios that set the bar for all content.
 */
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';
import fs from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const goldStandards = JSON.parse(fs.readFileSync('/home/ubuntu/aiq-gold-standards.json', 'utf8'));

let inserted = 0;
let skipped = 0;

for (const s of goldStandards) {
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
       s.scenario, s.constraint, s.question, s.workflow_key || null,
       s.primary_signal || null, s.ambiguity_level || 2]
    );

    // Insert options
    for (let i = 0; i < s.options.length; i++) {
      const opt = s.options[i];
      await conn.execute(
        `INSERT INTO content_scenario_options
          (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), id, i + 1, opt.label, opt.value, opt.outcome_class,
         JSON.stringify(opt.signal_deltas || {}), opt.rationale || null, opt.is_optimal ? 1 : 0]
      );
    }

    console.log(`✅ Inserted: ${s.title}`);
    inserted++;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log(`⏭  Skipped (duplicate): ${s.title}`);
      skipped++;
    } else {
      console.error(`❌ Error inserting ${s.title}:`, err.message);
    }
  }
}

await conn.end();
console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
