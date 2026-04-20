/**
 * Re-seed the 3 domains that failed due to JSON parse errors:
 * - Performance Management
 * - Learning & Development
 * - HR Policy Interpretation
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
const blueprintId = 'bp-aiq-content-v1';

function uid() {
  return randomBytes(12).toString('base64url');
}

function repairJson(str) {
  if (typeof str === 'object') return str;
  try { return JSON.parse(str); } catch {}
  // Try to fix common issues: escaped quotes, trailing commas
  try {
    const fixed = str
      .replace(/\\'/g, "'")
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    return JSON.parse(fixed);
  } catch {}
  // Try to extract JSON array
  const match = str.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
    // Try with repairs
    try {
      const fixed = match[0]
        .replace(/\\'/g, "'")
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(fixed);
    } catch {}
  }
  return null;
}

// Load the scenarios data
const scenariosData = JSON.parse(readFileSync('/home/ubuntu/generate_scenarios.json', 'utf8'));

const failedDomains = [
  'Performance Management',
  'Learning & Development',
  'HR Policy Interpretation'
];

let totalSeeded = 0;
let totalOptions = 0;

for (const domainResult of scenariosData.results) {
  const domain = domainResult.input.split('|')[0].trim();
  if (!failedDomains.includes(domain)) continue;
  
  console.log(`\nProcessing: ${domain}`);
  
  const scenarios = repairJson(domainResult.output.scenarios_json);
  if (!scenarios) {
    console.error(`  ✗ Could not repair JSON for ${domain}`);
    console.log('  Raw output preview:', domainResult.output.scenarios_json?.substring(0, 200));
    continue;
  }
  
  if (!Array.isArray(scenarios)) {
    console.error(`  ✗ Not an array for ${domain}: ${typeof scenarios}`);
    continue;
  }

  console.log(`  Found ${scenarios.length} scenarios`);

  for (const scenario of scenarios) {
    try {
      const itemId = `item-${scenario.scenario_id || uid()}`;
      
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

      if (Array.isArray(scenario.options)) {
        let optOrder = 0;
        for (const opt of scenario.options) {
          const optId = `opt-${itemId}-${opt.label || optOrder}`;
          const scoreWeightMap = {
            'strong': 1.0, 'acceptable': 0.5, 'weak': -0.25,
            'failure': -0.75, 'critical_failure': -1.5
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
            optId, itemId,
            opt.text || opt.label,
            opt.label || String.fromCharCode(65 + optOrder),
            optOrder,
            opt.outcome_class === 'strong' ? 1 : 0,
            scoreWeight,
            opt.outcome_class || 'acceptable',
            JSON.stringify(opt.signal_deltas || {}),
            JSON.stringify(opt.failure_tags || [])
          ]);
          
          optOrder++;
          totalOptions++;
        }
      }

      totalSeeded++;
    } catch (e) {
      console.error(`  ✗ Error seeding scenario ${scenario.scenario_id}: ${e.message}`);
    }
  }
  
  console.log(`  ✓ ${domain}: ${totalSeeded} scenarios seeded so far`);
}

console.log(`\n✓ Total seeded: ${totalSeeded} scenarios, ${totalOptions} options`);
await db.end();
