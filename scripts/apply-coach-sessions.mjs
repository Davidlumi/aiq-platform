import mysql from 'mysql2/promise';

const sql = `CREATE TABLE IF NOT EXISTS \`coach_sessions\` (
  \`id\` varchar(36) NOT NULL,
  \`tenant_id\` varchar(36) NOT NULL,
  \`user_id\` varchar(36) NOT NULL,
  \`mode\` varchar(32) NOT NULL DEFAULT 'diagnostic',
  \`state\` varchar(32) NOT NULL DEFAULT 'idle',
  \`assessment_session_id\` varchar(36),
  \`mode_context_json\` json,
  \`current_act\` varchar(64),
  \`turn_count\` int NOT NULL DEFAULT 0,
  \`prompt_version\` varchar(32) NOT NULL DEFAULT '1.0.0',
  \`classifier_version\` varchar(32) NOT NULL DEFAULT '1.0.0',
  \`started_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`paused_at\` timestamp,
  \`completed_at\` timestamp,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_coach_sessions_tenant\` (\`tenant_id\`),
  INDEX \`idx_coach_sessions_user\` (\`user_id\`)
)`;

const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await conn.execute(sql);
  console.log('coach_sessions table created OK');
} catch (e) {
  console.error('ERR:', e.message);
}
// Verify all 6 tables exist
const [rows] = await conn.execute(
  "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('coach_sessions','coach_messages','user_capability_memory','coach_audit_log','apply_commitments','apply_evidence')"
);
console.log('Tables present:', rows.map(r => r.TABLE_NAME).join(', '));
await conn.end();
