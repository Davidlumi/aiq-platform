import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await db.execute(
  'SELECT formative_quiz_json FROM learning_modules WHERE `key` = ?',
  ['ai-wfd-quiz-01']
);

const quiz = typeof rows[0].formative_quiz_json === 'string' 
  ? JSON.parse(rows[0].formative_quiz_json) 
  : rows[0].formative_quiz_json;

const questions = quiz?.questions || [];
console.log(`Total questions: ${questions.length}\n`);
questions.forEach((q, i) => {
  const stem = q.stem || q.question || '';
  console.log(`Q${i+1}: ${stem.substring(0, 120)}...`);
  console.log();
});

await db.end();
