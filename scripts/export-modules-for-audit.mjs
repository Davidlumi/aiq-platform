/**
 * Export learning_modules to modules.json in the format expected by module_audit.py
 *
 * Schema mapping:
 *   id               → mod.id (or mod.key)
 *   title            → mod.title
 *   domain           → mod.capability  (the capability_key field)
 *   level            → mod.level_label
 *   label            → mod.modality    (Quiz / Lesson / Reflection etc.)
 *   stated_minutes   → mod.duration_mins
 *   reading_sections → mod.body_json.conceptSections mapped to
 *                        { heading, body, bullets: keyPoints }
 *   questions        → mod.formative_quiz_json.questions mapped to
 *                        { stem, options, correct_index, feedback }
 */
import mysql from 'mysql2/promise';
import { writeFileSync } from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.query(
  `SELECT id, \`key\`, title, capability, modality, level_label,
          duration_mins, body_json, formative_quiz_json
   FROM learning_modules
   WHERE status = 'published'
   ORDER BY capability, difficulty`
);

console.log(`Exporting ${rows.length} published modules...`);

const modules = rows.map(mod => {
  // ── reading_sections ───────────────────────────────────────────────────────
  const bj = mod.body_json || {};
  const conceptSections = bj.conceptSections || [];
  const reading_sections = conceptSections.map(s => ({
    heading: s.heading || '',
    // Append the separate 'example' field into body so the audit's
    // examples_present check (which scans body text for phrase markers)
    // can see examples that the LLM writes in the dedicated example field.
    body: [s.body || '', s.example ? `For example: ${s.example}` : ''].filter(Boolean).join(' '),
    bullets: Array.isArray(s.keyPoints) ? s.keyPoints : [],
  }));

  // ── questions ──────────────────────────────────────────────────────────────
  const fq = mod.formative_quiz_json || {};
  const rawQs = fq.questions || [];
  const questions = rawQs.map(q => ({
    stem: q.question || q.stem || '',
    options: Array.isArray(q.options) ? q.options : [],
    correct_index: typeof q.correctIndex === 'number' ? q.correctIndex
                 : typeof q.correct_index === 'number' ? q.correct_index : 0,
    feedback: q.explanation || q.feedback || '',
  }));

  // ── label normalisation ────────────────────────────────────────────────────
  const LABEL_MAP = {
    quiz: 'Quiz',
    tutorial: 'Lesson',
    practical: 'Lesson',
    case_study: 'Lesson',
    scenario: 'Lesson',
    video: 'Video',
    reflection: 'Reflection',
    coaching: 'Lesson',
  };
  const label = LABEL_MAP[mod.modality] || 'Lesson';

  return {
    id: mod.key || mod.id,
    title: mod.title,
    domain: mod.capability,
    level: mod.level_label,
    label,
    stated_minutes: mod.duration_mins || null,
    reading_sections,
    questions,
  };
});

const outPath = '/home/ubuntu/aiq-audit/modules.json';
import { mkdirSync } from 'fs';
mkdirSync('/home/ubuntu/aiq-audit', { recursive: true });
writeFileSync(outPath, JSON.stringify(modules, null, 2));

// Quick sanity check
const withReading = modules.filter(m => m.reading_sections.some(s => s.body.length > 10)).length;
const withQuestions = modules.filter(m => m.questions.length > 0).length;
console.log(`Written to ${outPath}`);
console.log(`  Total modules  : ${modules.length}`);
console.log(`  With reading   : ${withReading}`);
console.log(`  With questions : ${withQuestions}`);
console.log(`  Domains        : ${[...new Set(modules.map(m => m.domain))].join(', ')}`);

await conn.end();
