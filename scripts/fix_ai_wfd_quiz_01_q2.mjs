/**
 * fix_ai_wfd_quiz_01_q2.mjs
 *
 * Replaces ai-wfd-quiz-01 Q2 (recruitment drift — "AI-driven recruitment workflow")
 * with an in-domain AI Workflow Design question about compensation process automation.
 *
 * The replacement question is about designing an AI workflow for pay review cycles,
 * which is squarely in the ai_workflow_design domain and relevant to a Reward/HR audience.
 */

import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── 1. Fetch the current module ─────────────────────────────────────────────
const [rows] = await conn.execute(
  "SELECT id, formative_quiz_json FROM learning_modules WHERE `key` = ?",
  ["ai-wfd-quiz-01"]
);

if (!rows.length) {
  console.error("Module ai-wfd-quiz-01 not found");
  process.exit(1);
}

const dbRow = rows[0];
let quiz;
try {
  quiz = typeof dbRow.formative_quiz_json === "string"
    ? JSON.parse(dbRow.formative_quiz_json)
    : dbRow.formative_quiz_json;
} catch (e) {
  console.error("Failed to parse formative_quiz_json:", e.message);
  process.exit(1);
}

const questions = quiz.questions ?? quiz;
console.log(`Current Q2 stem: ${(questions[1]?.stem ?? questions[1]?.question ?? "").slice(0, 120)}`);

// ── 2. Define the replacement question ──────────────────────────────────────
const replacementQ2 = {
  stem: "An HR team is designing an AI-powered workflow to automate the annual pay review cycle, from data collection through to manager approval. During the design phase, the team realises the AI will need to access salary data from three separate legacy systems. What is the MOST critical design decision at this stage?",
  question: "An HR team is designing an AI-powered workflow to automate the annual pay review cycle, from data collection through to manager approval. During the design phase, the team realises the AI will need to access salary data from three separate legacy systems. What is the MOST critical design decision at this stage?",
  options: [
    "Selecting the AI vendor with the most advanced natural language processing capability.",
    "Defining a unified data schema and integration layer so the AI receives clean, consistent salary data from all three systems.",
    "Automating the manager approval step first to demonstrate quick wins to senior stakeholders.",
    "Deploying the workflow in a single business unit as a pilot before integrating the legacy systems."
  ],
  correctIndex: 1,
  feedback: "Defining a unified data schema and integration layer is the most critical decision because the quality and consistency of the AI's inputs directly determines the reliability of its pay recommendations. If the AI receives inconsistent or mismatched salary data from three different systems, it will produce unreliable outputs regardless of the model's sophistication. Selecting a vendor before solving the data integration problem puts the technology before the use case. Automating approvals first without clean data creates a fast path to inaccurate decisions. A pilot in one business unit is valuable for testing but does not resolve the underlying data architecture challenge that will affect all units. This is why data integration design must precede model selection and workflow automation in any AI pay review implementation."
};

// ── 3. Apply the replacement ─────────────────────────────────────────────────
questions[1] = replacementQ2;

const updatedQuiz = Array.isArray(quiz) ? questions : { ...quiz, questions };
const updatedJson = JSON.stringify(updatedQuiz);

await conn.execute(
  "UPDATE learning_modules SET formative_quiz_json = ? WHERE `key` = ?",
  [updatedJson, "ai-wfd-quiz-01"]
);

console.log("✓ ai-wfd-quiz-01 Q2 replaced with in-domain pay review workflow question");
console.log(`New Q2 stem: ${replacementQ2.stem.slice(0, 120)}`);

await conn.end();
