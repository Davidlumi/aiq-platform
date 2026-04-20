/**
 * Insert the missing EX-01 item (blueprint was not yet created when the SQL ran)
 */
import mysql from 'mysql2/promise';

const url = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || '4000'),
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: url.searchParams.get('ssl') ? { rejectUnauthorized: true } : undefined,
});

const scenario = "An AI tool generates a job description for a senior analyst role. The description is mostly usable but includes inconsistent seniority language, an unclear reporting line, and slightly inflated responsibilities.";
const constraint = "You have five minutes before the role must go live.";
const prompt = `${scenario}\n\nConstraint: ${constraint}\n\nWhat do you do?`;
const metadata = {
  interaction_id: "EX-01",
  title: "Job Description Correction",
  scenario,
  constraint,
  question: "What do you do?",
  capability: "AI Execution",
  capability_key: "execution",
  workflow: "Recruitment",
  risk_level: "Medium",
  primary_signal: "execution_quality",
  secondary_signals: ["prioritisation_quality", "timing_integrity"],
  display_order: 1,
};

// Insert item
try {
  await conn.query(
    'INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['item-ex01', 'bp-aiq-v9-standard', 'scenario_mcq', prompt, JSON.stringify(metadata), 2, 'published']
  );
  console.log('item-ex01 inserted');
} catch (e) {
  if (e.message.includes('Duplicate')) {
    console.log('item-ex01 already exists');
  } else {
    console.error('Error inserting item:', e.message);
  }
}

// Insert options
const options = [
  { id: 'opt-ex01-a', label: 'Publish the description as-is.', value: 'A', order: 1, isCorrect: 0, weight: 0.0, outcome: 'Fail', deltas: { execution_quality: -4, prioritisation_quality: -1, over_reliance_risk: 2 }, events: ['LEAVES_MATERIAL_ERROR', 'BLIND_AI_ACCEPTANCE'] },
  { id: 'opt-ex01-b', label: 'Fix the most critical inconsistencies and publish.', value: 'B', order: 2, isCorrect: 1, weight: 1.0, outcome: 'Full', deltas: { execution_quality: 4, prioritisation_quality: 2, timing_integrity: 1 }, events: ['TARGETED_CORRECTION', 'HIGH_IMPACT_ISSUE_FIXED'] },
  { id: 'opt-ex01-c', label: 'Rewrite the entire description manually.', value: 'C', order: 3, isCorrect: 0, weight: 0.5, outcome: 'Partial', deltas: { execution_quality: 1, prioritisation_quality: 1, over_caution_risk: 1 }, events: ['CORRECT_INTENT_INEFFICIENT'] },
  { id: 'opt-ex01-d', label: 'Delay posting until the whole document can be fully reviewed.', value: 'D', order: 4, isCorrect: 0, weight: 0.25, outcome: 'Low', deltas: { execution_quality: -2, avoidance_risk: 2 }, events: ['UNNECESSARY_DELAY'] },
];

for (const opt of options) {
  try {
    await conn.query(
      'INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [opt.id, 'item-ex01', opt.label, opt.value, opt.order, opt.isCorrect, opt.weight, opt.outcome, JSON.stringify(opt.deltas), JSON.stringify(opt.events)]
    );
    console.log(`  opt-ex01-${opt.value.toLowerCase()} inserted`);
  } catch (e) {
    if (e.message.includes('Duplicate')) {
      console.log(`  opt-ex01-${opt.value.toLowerCase()} already exists`);
    } else {
      console.error(`  Error: ${e.message}`);
    }
  }
}

// Verify final count
const [cnt] = await conn.query("SELECT COUNT(*) as cnt FROM assessment_items WHERE blueprint_id = 'bp-aiq-v9-standard'");
console.log(`\nTotal V9 items: ${cnt[0].cnt}`);

await conn.end();
