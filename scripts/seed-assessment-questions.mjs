/**
 * Seed script: Load all 50 real assessment questions from the question bank
 * into the database, replacing the 5 placeholder questions.
 *
 * Run: node scripts/seed-assessment-questions.mjs
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const QUESTION_BANK_PATH = '/home/ubuntu/aiq-pack/structured_assets/assessment_question_bank.json';

// Map capability names to canonical 6-capability system
const CAPABILITY_MAP = {
  'AI Execution': 'execution',
  'AI Judgement': 'judgement',
  'AI Risk & Governance': 'governance',
  'AI Appropriateness': 'appropriateness',
  'Validation': 'validation',
  'Prioritisation': 'prioritisation',
  'AI Data & Insight Interpretation': 'data_interpretation',
  'AI Workflow Application': 'workflow_application',
  'AI Risk & Governance / AI Execution': 'governance',
  'AI Appropriateness / AI Judgement': 'judgement',
  'Prioritisation / Judgement': 'judgement',
  'Validation / Prioritisation': 'validation',
};

const DIFFICULTY_MAP = {
  'L1': 1,
  'L2': 2,
  'L3': 3,
  'L4': 4,
};

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const questions = JSON.parse(readFileSync(QUESTION_BANK_PATH, 'utf8'));

  // Get the published blueprint
  const [blueprints] = await conn.query(
    "SELECT id FROM assessment_blueprints WHERE status = 'published' LIMIT 1"
  );
  if (!blueprints.length) {
    throw new Error('No published blueprint found');
  }
  const blueprintId = blueprints[0].id;
  console.log(`Using blueprint: ${blueprintId}`);

  // Delete existing placeholder items and options
  await conn.query(`DELETE FROM assessment_item_options WHERE item_id IN (
    SELECT id FROM assessment_items WHERE blueprint_id = ?
  )`, [blueprintId]);
  await conn.query(`DELETE FROM assessment_items WHERE blueprint_id = ?`, [blueprintId]);
  console.log('Cleared existing placeholder questions');

  let itemsInserted = 0;
  let optionsInserted = 0;

  for (const q of questions) {
    const itemId = randomUUID();
    const capability = CAPABILITY_MAP[q.capability] || 'execution';
    const difficulty = DIFFICULTY_MAP[q.difficulty] || 2;

    // Build full prompt: scenario + constraint + question
    const parts = [];
    if (q.scenario) parts.push(q.scenario);
    if (q.constraint) parts.push(`**Constraint:** ${q.constraint}`);
    parts.push(q.question || 'What do you do?');
    const prompt = parts.join('\n\n');

    // Build metadata JSON with all scoring info
    const metadataJson = {
      interaction_id: q.interaction_id,
      title: q.title,
      type: q.type,
      capability: q.capability,
      capability_key: capability,
      workflow: q.workflow,
      risk_level: q.risk_level,
      primary_signal: q.primary_signal,
      secondary_signals: q.secondary_signals,
      scoring_object: q.scoring_object,
      why_this_matters: q.why_this_interaction_matters,
      recommended_modules: q.recommended_learning_modules || [],
      display_order: q.number,
    };

    // Insert assessment item
    await conn.query(`
      INSERT INTO assessment_items (
        id, blueprint_id, item_type, prompt,
        metadata_json, difficulty, status, created_at
      ) VALUES (?, ?, 'scenario_mcq', ?, ?, ?, 'published', NOW())
    `, [
      itemId,
      blueprintId,
      prompt,
      JSON.stringify(metadataJson),
      difficulty,
    ]);
    itemsInserted++;

    // Insert options
    const scoringObj = q.scoring_object;
    const optionLetters = Object.keys(q.options);

    for (let i = 0; i < optionLetters.length; i++) {
      const letter = optionLetters[i];
      const optionId = randomUUID();
      const optionText = q.options[letter];
      const scoringData = scoringObj?.options?.[letter] || {};
      const outcomeClass = scoringData.outcome_class || 'Low';
      const eventCodes = scoringData.event_codes || [];
      const signalDeltas = scoringData.signal_deltas || {};

      // Score: Full=4, Partial=2, Low=1, Fail=0
      const scoreMap = { 'Full': 4, 'Partial': 2, 'Low': 1, 'Fail': 0 };
      const scoreWeight = scoreMap[outcomeClass] ?? 1;

      await conn.query(`
        INSERT INTO assessment_item_options (
          id, item_id, label, value, option_order,
          is_correct, score_weight, outcome_class,
          event_codes_json, signal_deltas_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        optionId,
        itemId,
        optionText,          // label = full text
        letter,              // value = A/B/C/D
        i,                   // option_order
        outcomeClass === 'Full' ? 1 : 0,
        scoreWeight,
        outcomeClass,
        JSON.stringify(eventCodes),
        JSON.stringify(signalDeltas),
      ]);
      optionsInserted++;
    }

    if (itemsInserted % 10 === 0) {
      console.log(`  Inserted ${itemsInserted} questions...`);
    }
  }

  await conn.end();
  console.log(`\n✓ Seeded ${itemsInserted} questions and ${optionsInserted} options`);
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
