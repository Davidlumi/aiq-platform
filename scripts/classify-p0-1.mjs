import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const SESSION_ID = 'JRLHtJX28uwmwrSavy5XZ';

// 1. Get all answers
const [answers] = await conn.execute(`
  SELECT 
    id, item_id, selected_value_json, confidence_score, correctness, 
    outcome_class, signal_deltas_json, submitted_at
  FROM assessment_answers 
  WHERE session_id = ?
  ORDER BY submitted_at ASC
`, [SESSION_ID]);

console.log(`\n=== ANSWERS (${answers.length} total) ===`);
const outcomeCount = {};
const signalTotals = {};
let nullSignals = 0;

for (const a of answers) {
  const outcome = a.outcome_class || 'null';
  outcomeCount[outcome] = (outcomeCount[outcome] || 0) + 1;
  
  if (a.signal_deltas_json) {
    let deltas;
    try { deltas = typeof a.signal_deltas_json === 'string' ? JSON.parse(a.signal_deltas_json) : a.signal_deltas_json; } catch { deltas = null; }
    if (deltas && typeof deltas === 'object') {
      for (const [k, v] of Object.entries(deltas)) {
        signalTotals[k] = (signalTotals[k] || 0) + Number(v);
      }
    }
  } else {
    nullSignals++;
  }
}

console.log('Outcome class distribution:', outcomeCount);
console.log('Null signal_deltas_json count:', nullSignals);
console.log('Signal totals across all answers:', signalTotals);

// 2. Get the score record
const [scores] = await conn.execute(`
  SELECT * FROM assessment_scores WHERE session_id = ?
`, [SESSION_ID]);

console.log(`\n=== SCORE RECORD (${scores.length} rows) ===`);
if (scores.length > 0) {
  const s = scores[0];
  console.log('overall_score:', s.overall_score);
  
  let breakdown;
  try { breakdown = typeof s.score_breakdown_json === 'string' ? JSON.parse(s.score_breakdown_json) : s.score_breakdown_json; } catch { breakdown = null; }
  console.log('score_breakdown_json:', JSON.stringify(breakdown, null, 2));
  
  let signals;
  try { signals = typeof s.signal_scores_json === 'string' ? JSON.parse(s.signal_scores_json) : s.signal_scores_json; } catch { signals = null; }
  console.log('signal_scores_json:', JSON.stringify(signals, null, 2));
} else {
  console.log('NO SCORE RECORD FOUND');
}

// 3. Get the session record
const [sessions] = await conn.execute(`
  SELECT id, status, total_target, completed_at, scoring_status, 
         final_score, domain_scores_json, narrative_json
  FROM assessment_sessions WHERE id = ?
`, [SESSION_ID]);

console.log(`\n=== SESSION RECORD ===`);
if (sessions.length > 0) {
  const s = sessions[0];
  console.log('status:', s.status);
  console.log('total_target:', s.total_target);
  console.log('completed_at:', s.completed_at);
  console.log('scoring_status:', s.scoring_status);
  console.log('final_score:', s.final_score);
  
  let domainScores;
  try { domainScores = typeof s.domain_scores_json === 'string' ? JSON.parse(s.domain_scores_json) : s.domain_scores_json; } catch { domainScores = null; }
  console.log('domain_scores_json:', JSON.stringify(domainScores, null, 2));
} else {
  console.log('SESSION NOT FOUND');
}

// 4. Show first 10 answers in detail
console.log('\n=== FIRST 10 ANSWERS (detail) ===');
for (const a of answers.slice(0, 10)) {
  let deltas;
  try { deltas = typeof a.signal_deltas_json === 'string' ? JSON.parse(a.signal_deltas_json) : a.signal_deltas_json; } catch { deltas = null; }
  console.log(`  item=${a.item_id} | outcome=${a.outcome_class} | confidence=${a.confidence_score} | deltas=${JSON.stringify(deltas)}`);
}

await conn.end();
