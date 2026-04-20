/**
 * Seed script: Load all 80 real learning modules from the AiQ module library
 * into the content_items table.
 *
 * Run: node scripts/seed-learning-modules.mjs
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { nanoid } from 'nanoid';

// ─── Config ───────────────────────────────────────────────────────────────────

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL environment variable not set');

const modules = JSON.parse(
  readFileSync('/home/ubuntu/aiq-pack/structured_assets/learning_module_library.json', 'utf8')
);

// ─── Map format → content_type enum ──────────────────────────────────────────

const FORMAT_MAP = {
  microlearning:      'micro_lesson',
  scenario:           'scenario',
  simulation:         'simulation',
  coach_prompt:       'coach_prompt',
  video:              'video',
  article:            'article',
  case_study:         'scenario',
  reflective_prompt:  'reflection',
  quiz:               'quiz',
  walkthrough:        'walkthrough',
  worked_example:     'worked_example',
  checklist:          'checklist',
  nudge:              'nudge',
};

// ─── Get tenant ID ────────────────────────────────────────────────────────────

const conn = await mysql.createConnection(dbUrl);

const [tenants] = await conn.execute('SELECT id FROM tenants LIMIT 1');
const tenantId = tenants[0]?.id;
if (!tenantId) throw new Error('No tenant found — run seed-users first');

console.log(`Using tenant: ${tenantId}`);

// ─── Check existing ───────────────────────────────────────────────────────────

const [existing] = await conn.execute(
  'SELECT COUNT(*) as cnt FROM content_items WHERE tenant_id = ?',
  [tenantId]
);
const existingCount = existing[0].cnt;
console.log(`Existing content items: ${existingCount}`);

if (existingCount >= 80) {
  console.log('Already seeded 80+ modules. Skipping.');
  await conn.end();
  process.exit(0);
}

// ─── Seed modules ─────────────────────────────────────────────────────────────

let inserted = 0;
let skipped = 0;

for (const mod of modules) {
  const contentObjectId = mod.content_object_id;
  const format = mod.format ?? 'article';
  const contentType = FORMAT_MAP[format] ?? 'article';

  // Build a clean key from the content_object_id
  const key = contentObjectId.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 100);

  // Check if already exists
  const [exists] = await conn.execute(
    'SELECT id FROM content_items WHERE `key` = ? AND tenant_id = ?',
    [key, tenantId]
  );
  if (exists.length > 0) {
    skipped++;
    continue;
  }

  // Build metadata from all available fields
  const metadata = {
    content_object_id: contentObjectId,
    raw_block: mod.raw_block,
    format,
    target_capabilities: mod.target_capabilities ?? [],
    target_capabilities_list: mod.target_capabilities_list ?? [],
    sequencing_role: mod.sequencing_role ?? '',
    capability_area: (mod.target_capabilities_list ?? [])[0] ?? '',
    workflow_group: mod.workflow_group ?? '',
    persona_group: mod.persona_group ?? '',
    stakeholder_type: mod.stakeholder_type ?? '',
    usage: mod.usage ?? '',
  };

  // Build body from content fields
  const body = {
    prompt: mod.prompt ?? '',
    message: mod.message ?? '',
    task: mod.task ?? '',
    focus: mod.focus ?? '',
    core_points: mod.core_points ?? [],
    core_message: mod.core_message ?? '',
    key_content: mod.key_content ?? '',
    prompt_set: mod.prompt_set ?? [],
    items: mod.items ?? [],
  };

  // Estimate duration from format
  const durationMap = {
    microlearning: 300,
    article: 600,
    video: 480,
    scenario: 900,
    simulation: 1200,
    coach_prompt: 300,
    case_study: 900,
    reflective_prompt: 300,
  };
  const durationSeconds = durationMap[format] ?? 600;

  // Difficulty from sequencing_role
  const difficultyMap = {
    foundation: 1,
    reinforcement: 2,
    application: 3,
    challenge: 4,
    mastery: 5,
  };
  const difficulty = difficultyMap[mod.sequencing_role] ?? 2;

  await conn.execute(
    `INSERT INTO content_items (id, tenant_id, \`key\`, title, content_type, status, version, difficulty, duration_seconds, metadata_json, body_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'published', 1, ?, ?, ?, ?, NOW(), NOW())`,
    [
      nanoid(),
      tenantId,
      key,
      mod.title ?? contentObjectId,
      contentType,
      difficulty,
      durationSeconds,
      JSON.stringify(metadata),
      JSON.stringify(body),
    ]
  );
  inserted++;
}

console.log(`\n✓ Seeded ${inserted} learning modules (${skipped} already existed)`);
await conn.end();
