import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);
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
for (const col of expected) {
  const found = fields.includes(col);
  console.log(found ? '✓' : '✗', col);
}
await conn.end();
