/**
 * Fix wf-air-cs-01: update the 'question' field (used by platform UI) to match
 * the already-updated 'stem' field (used by the audit export).
 * Both fields must be consistent.
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

  const quiz = rows[0].formative_quiz_json;
  const qs = quiz.questions;

  console.log('Q1 current question:', qs[0].question);
  console.log('Q1 current stem:', qs[0].stem);
  console.log('Q3 current question:', qs[2].question);
  console.log('Q3 current stem:', qs[2].stem);

  // Sync 'question' field to match the already-updated 'stem' field
  qs[0].question = qs[0].stem;
  qs[2].question = qs[2].stem;

  console.log('\nQ1 new question:', qs[0].question);
  console.log('Q3 new question:', qs[2].question);

  const updatedJson = JSON.stringify(quiz);
  const [result] = await conn.query(
    'UPDATE learning_modules SET formative_quiz_json = ? WHERE `key` = ?',
    [updatedJson, 'wf-air-cs-01']
  );

  console.log('\nUpdate result:', result.affectedRows, 'row(s) affected');
  console.log('wf-air-cs-01 question fields synced to match stem fields.');

} finally {
  await conn.end();
}
