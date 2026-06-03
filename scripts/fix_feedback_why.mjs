/**
 * Fix feedback_why check failures for 6 modules.
 *
 * The audit check requires at least one WHY marker in each question's feedback
 * (e.g., "because", "whereas", "however", "this means", etc.).
 *
 * These feedbacks explain the correct answer well but use "directly addresses"
 * phrasing without any standard connective markers. We append a brief
 * explanatory sentence to each failing feedback.
 *
 * Modules fixed:
 *   approp_l4_case_study_ai_redundancy  (Q3)
 *   gov_l2_practical_dpia               (Q1, Q2, Q3)
 *   ai-int-ref-01                       (Q1)
 *   ai-eval-vid-01                      (Q1, Q3)
 *   ai-eval-tut-01                      (Q2)
 *   wf-air-tut-02                       (Q1, Q2)
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Map: module key -> array of { qIndex, suffix }
// Each suffix starts with a WHY marker and is appended to the existing feedback.
const FIXES = {
  'approp_l4_case_study_ai_redundancy': [
    { qIndex: 2, suffix: " This is why a multi-stakeholder governance board is more effective than individual oversight alone — because it distributes accountability and reduces the risk of any single point of failure." }
  ],
  'gov_l2_practical_dpia': [
    { qIndex: 0, suffix: " This is why addressing the root cause of biased training data is the most effective first step, whereas superficial filters or manual overrides only treat the symptom." },
    { qIndex: 1, suffix: " This means embedding fairness at the algorithmic level is more robust than relying on manual review alone, which is resource-intensive and prone to inconsistency." },
    { qIndex: 2, suffix: " This is why a human-validated evaluation framework is essential — because it ensures that the AI's definition of 'comparable worth' reflects both quantitative data and human values, rather than perpetuating historical patterns." }
  ],
  'ai-int-ref-01': [
    { qIndex: 0, suffix: " This means effective reflection requires analysing the 'why' behind outcomes, whereas simply documenting interactions or comparing AI to human performance does not develop the adaptive thinking needed to improve future AI interactions." }
  ],
  'ai-eval-vid-01': [
    { qIndex: 0, suffix: " This is why immediate human override is the correct first action — because it addresses the present harm while longer-term solutions such as model retraining are being prepared." },
    { qIndex: 2, suffix: " This means enriching the model's training data is the most sustainable fix, whereas workarounds like fixed percentage increases lack precision and do not solve the underlying data deficiency." }
  ],
  'ai-eval-tut-01': [
    { qIndex: 1, suffix: " This is why evaluating data currency and geographic relevance is the correct priority — because an anomalous output gap of 18% is most likely caused by stale or mismatched market data, whereas UI, security, and formatting concerns are secondary when the output itself is suspect." }
  ],
  'wf-air-tut-02': [
    { qIndex: 0, suffix: " This is why a targeted skills audit is the correct starting point — because it identifies specific gaps rather than general sentiment, which means subsequent interventions can be precisely tailored to the workforce's actual needs." },
    { qIndex: 1, suffix: " This means integrating new skills into real workflows ensures practical transfer, whereas generic programmes or one-time workshops rarely build the deep capability required for sustained AI-enabled performance." }
  ],
};

let totalFixed = 0;

for (const [moduleKey, fixes] of Object.entries(FIXES)) {
  const [rows] = await conn.query(
    'SELECT formative_quiz_json FROM learning_modules WHERE `key` = ?',
    [moduleKey]
  );

  if (!rows.length) {
    console.warn(`Module ${moduleKey} not found — skipping`);
    continue;
  }

  const quiz = rows[0].formative_quiz_json;
  const qs = quiz.questions;

  for (const { qIndex, suffix } of fixes) {
    const q = qs[qIndex];
    // Update both 'explanation' (DB native) and 'feedback' (if present) fields
    if (q.explanation !== undefined) {
      q.explanation = (q.explanation || '') + suffix;
    }
    if (q.feedback !== undefined) {
      q.feedback = (q.feedback || '') + suffix;
    }
    // If neither exists, create explanation
    if (q.explanation === undefined && q.feedback === undefined) {
      q.explanation = suffix.trim();
    }
    console.log(`  Fixed ${moduleKey} Q${qIndex + 1}`);
    totalFixed++;
  }

  const [result] = await conn.query(
    'UPDATE learning_modules SET formative_quiz_json = ? WHERE `key` = ?',
    [JSON.stringify(quiz), moduleKey]
  );
  console.log(`${moduleKey}: ${result.affectedRows} row(s) updated`);
}

await conn.end();
console.log(`\nTotal questions fixed: ${totalFixed}`);
