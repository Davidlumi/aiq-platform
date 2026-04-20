/**
 * AIQ Assessment Content System Seeder
 * Seeds 204 scenarios, 22 role architectures, 10 AI failure modes,
 * and 5 governance/high-risk cases into the database.
 */
import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const db = await createConnection(process.env.DATABASE_URL);

function uid() {
  return randomBytes(12).toString('base64url');
}

function safeJson(str) {
  try {
    if (typeof str === 'object') return str;
    return JSON.parse(str);
  } catch {
    return {};
  }
}

// ─── Load generated data ────────────────────────────────────────────────────
const scenariosData = JSON.parse(readFileSync('/home/ubuntu/generate_scenarios.json', 'utf8'));
const rolesData = JSON.parse(readFileSync('/home/ubuntu/generate_role_architecture.json', 'utf8'));
const failureModesData = JSON.parse(readFileSync('/home/ubuntu/aiq_failure_modes.json', 'utf8'));

// ─── 1. Create the content system blueprint ─────────────────────────────────
console.log('Creating content system blueprint...');
const blueprintId = 'bp-aiq-content-v1';
await db.execute(`
  INSERT INTO assessment_blueprints 
    (id, \`key\`, name, version, role_scope_json, structure_json, status)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    structure_json = VALUES(structure_json),
    status = VALUES(status)
`, [
  blueprintId,
  'aiq_content_v1',
  'AIQ Content System V1',
  1,
  JSON.stringify({ roles: 'all', families: 8 }),
  JSON.stringify({
    version: '1.0',
    domains: 13,
    roles: 22,
    interactionTypes: 11,
    difficultyLevels: 3,
    riskLevels: 3,
    targetItems: 204
  }),
  'published'
]);

// ─── 2. Create content_roles table if not exists ─────────────────────────────
console.log('Creating content tables...');
await db.execute(`
  CREATE TABLE IF NOT EXISTS content_roles (
    id VARCHAR(36) PRIMARY KEY,
    role_id VARCHAR(100) NOT NULL UNIQUE,
    role_name VARCHAR(200) NOT NULL,
    family VARCHAR(100) NOT NULL,
    seniority VARCHAR(50),
    decision_authority VARCHAR(50),
    risk_exposure VARCHAR(50),
    governance_sensitivity VARCHAR(50),
    role_data_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

await db.execute(`
  CREATE TABLE IF NOT EXISTS content_failure_modes (
    id VARCHAR(36) PRIMARY KEY,
    failure_mode_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    risk_level VARCHAR(50),
    description TEXT,
    failure_data_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

await db.execute(`
  CREATE TABLE IF NOT EXISTS content_versions (
    id VARCHAR(36) PRIMARY KEY,
    item_id VARCHAR(36) NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    change_type VARCHAR(50),
    change_summary TEXT,
    previous_data_json JSON,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_item_id (item_id)
  )
`);

// ─── 3. Seed role architectures ──────────────────────────────────────────────
console.log('Seeding role architectures...');
let rolesSeeded = 0;
for (const result of rolesData.results) {
  try {
    const roleJson = safeJson(result.output.role_json);
    if (!roleJson.role_id) continue;
    
    await db.execute(`
      INSERT INTO content_roles 
        (id, role_id, role_name, family, seniority, decision_authority, risk_exposure, governance_sensitivity, role_data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        role_name = VALUES(role_name),
        role_data_json = VALUES(role_data_json)
    `, [
      uid(),
      roleJson.role_id,
      roleJson.role_name || result.input.split('|')[0].trim(),
      roleJson.family || result.input.split('|')[1]?.trim() || 'Unknown',
      roleJson.seniority || 'mid',
      roleJson.decision_authority || 'medium',
      roleJson.risk_exposure || 'medium',
      roleJson.governance_sensitivity || 'medium',
      JSON.stringify(roleJson)
    ]);
    rolesSeeded++;
  } catch (e) {
    console.error(`Error seeding role ${result.input.split('|')[0]}: ${e.message}`);
  }
}
console.log(`  ✓ ${rolesSeeded} roles seeded`);

// ─── 4. Seed AI failure modes ────────────────────────────────────────────────
console.log('Seeding AI failure modes...');
let fmSeeded = 0;
for (const fm of failureModesData.ai_failure_modes) {
  await db.execute(`
    INSERT INTO content_failure_modes 
      (id, failure_mode_id, name, category, risk_level, description, failure_data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      failure_data_json = VALUES(failure_data_json)
  `, [
    uid(),
    fm.id,
    fm.name,
    fm.category,
    fm.risk_level,
    fm.description,
    JSON.stringify(fm)
  ]);
  fmSeeded++;
}
console.log(`  ✓ ${fmSeeded} failure modes seeded`);

// ─── 5. Seed scenarios ───────────────────────────────────────────────────────
console.log('Seeding scenarios...');
let totalSeeded = 0;
let totalOptions = 0;
let errors = 0;

for (const domainResult of scenariosData.results) {
  const domain = domainResult.input.split('|')[0].trim();
  let scenarios;
  
  try {
    scenarios = safeJson(domainResult.output.scenarios_json);
    if (!Array.isArray(scenarios)) {
      // Try to extract JSON array from string
      const match = domainResult.output.scenarios_json.match(/\[[\s\S]*\]/);
      if (match) scenarios = JSON.parse(match[0]);
      else { console.error(`  ✗ Could not parse scenarios for domain: ${domain}`); errors++; continue; }
    }
  } catch (e) {
    console.error(`  ✗ Parse error for domain ${domain}: ${e.message}`);
    errors++;
    continue;
  }

  for (const scenario of scenarios) {
    try {
      const itemId = `item-${scenario.scenario_id || uid()}`;
      
      // Build the rich metadata_json
      const metadata = {
        scenario_id: scenario.scenario_id,
        title: scenario.title,
        domain: scenario.domain || domain,
        role_relevance: scenario.role_relevance || [],
        workflow_context: scenario.workflow_context || '',
        interaction_type: scenario.interaction_type || 'situational_judgement',
        risk_level: scenario.risk_level || 'medium',
        ambiguity_level: scenario.ambiguity_level || 'medium',
        capability_targets: scenario.capability_targets || [],
        governance_sensitivity: scenario.governance_sensitivity || 'medium',
        scenario: scenario.scenario_text || scenario.scenario || '',
        constraint: scenario.constraint || '',
        ai_output: scenario.ai_output_if_applicable || null,
        what_do_you_do: scenario.what_do_you_do || 'What do you do?',
        scoring_anchors: scenario.scoring_anchors || {},
        failure_tags: scenario.failure_tags || [],
        version: scenario.version || '1.0',
        blueprint_id: blueprintId,
        generated: false,
        content_system: true
      };

      await db.execute(`
        INSERT INTO assessment_items
          (id, blueprint_id, item_type, prompt, metadata_json, difficulty, active_version, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          metadata_json = VALUES(metadata_json),
          status = VALUES(status)
      `, [
        itemId,
        blueprintId,
        scenario.interaction_type || 'situational_judgement',
        scenario.what_do_you_do || 'What do you do?',
        JSON.stringify(metadata),
        scenario.difficulty || 2,
        1,
        'published'
      ]);

      // Seed options
      if (Array.isArray(scenario.options)) {
        let optOrder = 0;
        for (const opt of scenario.options) {
          const optId = `opt-${itemId}-${opt.label || optOrder}`;
          const signalDeltas = opt.signal_deltas || {};
          
          // Determine score weight from outcome class
          const scoreWeightMap = {
            'strong': 1.0,
            'acceptable': 0.5,
            'weak': -0.25,
            'failure': -0.75,
            'critical_failure': -1.5
          };
          const scoreWeight = scoreWeightMap[opt.outcome_class] ?? 0;

          await db.execute(`
            INSERT INTO assessment_item_options
              (id, item_id, label, value, option_order, is_correct, score_weight, outcome_class, signal_deltas_json, event_codes_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              label = VALUES(label),
              score_weight = VALUES(score_weight),
              outcome_class = VALUES(outcome_class),
              signal_deltas_json = VALUES(signal_deltas_json)
          `, [
            optId,
            itemId,
            opt.text || opt.label,
            opt.label || String.fromCharCode(65 + optOrder),
            optOrder,
            opt.outcome_class === 'strong' ? 1 : 0,
            scoreWeight,
            opt.outcome_class || 'acceptable',
            JSON.stringify(signalDeltas),
            JSON.stringify(opt.failure_tags || [])
          ]);
          
          optOrder++;
          totalOptions++;
        }
      }

      totalSeeded++;
    } catch (e) {
      console.error(`  ✗ Error seeding scenario ${scenario.scenario_id}: ${e.message}`);
      errors++;
    }
  }
  
  console.log(`  ✓ ${domain}: ${scenarios.length} scenarios`);
}

// ─── 6. Update blueprint item count ─────────────────────────────────────────
await db.execute(`
  UPDATE assessment_blueprints SET structure_json = JSON_SET(structure_json, '$.seededItems', ?) WHERE id = ?
`, [totalSeeded, blueprintId]);

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════');
console.log('  AIQ Content System Seeding Complete');
console.log('═══════════════════════════════════════════════════');
console.log(`  Roles seeded:     ${rolesSeeded}`);
console.log(`  Failure modes:    ${fmSeeded}`);
console.log(`  Scenarios seeded: ${totalSeeded}`);
console.log(`  Options seeded:   ${totalOptions}`);
console.log(`  Errors:           ${errors}`);
console.log('═══════════════════════════════════════════════════\n');

await db.end();
