import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(url);

const sql = `
CREATE TABLE IF NOT EXISTS \`companies\` (
  \`id\` varchar(36) NOT NULL,
  \`tenant_id\` varchar(255) NOT NULL,
  \`created_by_user_id\` varchar(255) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`sector\` varchar(100) NOT NULL,
  \`headcount_band\` varchar(50) NOT NULL,
  \`hr_team_size\` varchar(50) NOT NULL,
  \`hris_platform\` varchar(100) DEFAULT NULL,
  \`existing_ai_tools_json\` text DEFAULT NULL,
  \`assessment_motivation\` varchar(255) DEFAULT NULL,
  \`results_audience\` varchar(100) DEFAULT NULL,
  \`onboarding_completed_at\` datetime DEFAULT NULL,
  \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_companies_tenant\` (\`tenant_id\`),
  KEY \`idx_companies_user\` (\`created_by_user_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

try {
  await conn.execute(sql);
  console.log('✓ companies table created');
} catch (e) {
  console.error('Error:', e.message);
}

await conn.end();
