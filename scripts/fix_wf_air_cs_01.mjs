/**
 * Fix wf-air-cs-01 Q1 and Q3: rewrite from recall stems to applied stems.
 *
 * Q1 (recall): "The case study highlights the initial resistance from HR teams to adopting AI.
 *   What was the most effective strategy employed to overcome this resistance..."
 * -> Rewrite as applied: "Your HR function is facing significant resistance from HR business
 *   partners when introducing a new AI-powered talent analytics tool. Which approach is most
 *   likely to overcome this resistance and build genuine AI readiness?"
 *
 * Q3 (recall): "The case study emphasizes the importance of upskilling the HR workforce for
 *   AI readiness. Which of the following initiatives was most crucial..."
 * -> Rewrite as applied: "You are designing an upskilling programme to build AI readiness
 *   across your HR function. Which initiative would most effectively equip HR professionals
 *   to leverage AI tools in their day-to-day roles?"
 *
 * Options and correct answers are preserved; only the stems are rewritten.
 * Feedback is updated to remove case-study references.
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [rows] = await conn.query(
    'SELECT formative_quiz_json FROM learning_modules WHERE `key` = ?',
    ['wf-air-cs-01']
  );

  if (!rows.length) {
    console.error('Module wf-air-cs-01 not found');
    process.exit(1);
  }

  // DB returns JSON columns as parsed objects (not strings)
  const quiz = rows[0].formative_quiz_json;
  const qs = quiz.questions;

  console.log('Found', qs.length, 'questions');
  console.log('Q1 original stem:', qs[0].stem);
  console.log('Q3 original stem:', qs[2].stem);

  // --- Q1 rewrite ---
  qs[0].stem = "Your HR function is facing significant resistance from HR business partners when introducing a new AI-powered talent analytics tool. Which approach is most likely to overcome this resistance and build genuine AI readiness across the team?";
  // DB uses 'explanation' field (export script maps it to 'feedback')
  qs[0].explanation = "Option C is correct because demonstrating immediate, tangible benefits through pilot projects on high-impact, low-risk tasks allows HR practitioners to see the value of AI firsthand, building trust and reducing apprehension. Option A is wrong because mandating usage without clear benefits often increases resistance and resentment. Option B is wrong because while important, training on ethics and displacement alone does not address the practical 'what's in it for me' for individual HR practitioners. Option D is wrong because replacing existing personnel would likely exacerbate resistance and alienate the workforce, hindering rather than fostering readiness.";

  // --- Q3 rewrite ---
  qs[2].stem = "You are designing an upskilling programme to build AI readiness across your HR function. Which initiative would most effectively equip HR professionals to leverage AI tools in their day-to-day roles?";
  qs[2].explanation = "Option C is correct because targeted training on data interpretation, ethical AI use, and understanding AI-driven insights directly addresses the practical skills HR professionals need to work with AI effectively. Option A is wrong because sponsoring advanced degrees for all managers is an overinvestment and not necessary for most HR roles interacting with AI. Option B is wrong because teaching all HR professionals to code AI algorithms is generally beyond the scope of their roles and not the most efficient use of training resources. Option D is wrong because outsourcing all AI-related tasks prevents internal skill development and reduces the HR function's strategic capability.";

  console.log('\nQ1 new stem:', qs[0].stem);
  console.log('Q3 new stem:', qs[2].stem);

  // Write back to DB
  const updatedJson = JSON.stringify(quiz);
  const [result] = await conn.query(
    'UPDATE learning_modules SET formative_quiz_json = ? WHERE `key` = ?',
    [updatedJson, 'wf-air-cs-01']
  );

  console.log('\nUpdate result:', result.affectedRows, 'row(s) affected');
  console.log('wf-air-cs-01 Q1 and Q3 successfully rewritten as applied stems.');

} finally {
  await conn.end();
}
