import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

// Apply all six ALTER statements individually
const alters = [
  "ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS base_failure_threshold_magnitude DECIMAL(5,3) NOT NULL DEFAULT 1.500",
  "ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS catastrophic_margin_multiplier DECIMAL(5,3) NOT NULL DEFAULT 1.500",
  "ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS at_risk_confidence_floor DECIMAL(5,3) NOT NULL DEFAULT 0.350",
  "ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS provisional_confidence_threshold DECIMAL(5,3) NOT NULL DEFAULT 0.400",
  "ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS confidence_floor DECIMAL(5,3) NOT NULL DEFAULT 0.500",
  "ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS minimum_safe_classification_confidence DECIMAL(5,3) NOT NULL DEFAULT 0.550",
];

for (const sql of alters) {
  const [r] = await conn.execute(sql);
  console.log('ALTER OK (warnings:', r.warningStatus, '):', sql.slice(47, 100));
}

// Update the existing v2.2 row
await conn.execute(`UPDATE scoring_config SET
  base_failure_threshold_magnitude = 1.500,
  catastrophic_margin_multiplier = 1.500,
  at_risk_confidence_floor = 0.350,
  provisional_confidence_threshold = 0.400,
  confidence_floor = 0.500,
  minimum_safe_classification_confidence = 0.550
WHERE version = 2`);
console.log('UPDATE v2 row OK');

// Verify
const [rows] = await conn.execute('DESCRIBE scoring_config');
const expected = [
  'base_failure_threshold_magnitude',
  'catastrophic_margin_multiplier',
  'at_risk_confidence_floor',
  'provisional_confidence_threshold',
  'confidence_floor',
  'minimum_safe_classification_confidence',
];
const fields = rows.map(r => r.Field);
let allOk = true;
for (const col of expected) {
  const found = fields.includes(col);
  console.log(found ? '✓' : '✗', col);
  if (!found) allOk = false;
}

await conn.end();
if (!allOk) { console.error('MIGRATION INCOMPLETE'); process.exit(1); }
console.log('Migration 0019 fully applied and verified');
