/**
 * Drop old scaffold users table and recreate with AiQ schema
 */
import mysql from 'mysql2/promise';

const url = new URL(process.env.DATABASE_URL);
const connConfig = {
  host: url.hostname,
  port: parseInt(url.port || '4000'),
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true },
};

async function exec(conn, sql, label) {
  try {
    await conn.query(sql);
    if (label) console.log(`  ✓ ${label}`);
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('Duplicate')) {
      if (label) console.log(`  ~ ${label} (already exists)`);
    } else if (e.message.includes("doesn't exist") || e.message.includes('Unknown table')) {
      if (label) console.log(`  ~ ${label} (not found, skipping)`);
    } else {
      console.error(`  ✗ ${label || sql.slice(0, 60)}: ${e.message}`);
    }
  }
}

const conn = await mysql.createConnection(connConfig);
console.log('Connected to database.');

// Drop old scaffold users table (it has wrong schema)
await exec(conn, 'DROP TABLE IF EXISTS `users`', 'Drop old users table');

// Recreate users with AiQ schema
await exec(conn, `CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` varchar(36) NOT NULL,
  \`tenant_id\` varchar(36) NOT NULL,
  \`email\` varchar(320) NOT NULL,
  \`first_name\` varchar(100) NOT NULL,
  \`last_name\` varchar(100) NOT NULL,
  \`password_hash\` varchar(255),
  \`status\` enum('active','pending','suspended','deactivated') NOT NULL DEFAULT 'pending',
  \`password_reset_token\` varchar(255),
  \`password_reset_expiry\` timestamp NULL,
  \`created_at\` timestamp NOT NULL DEFAULT (now()),
  \`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  \`last_signed_in\` timestamp NULL,
  CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`tenant_email_unique\` UNIQUE(\`tenant_id\`, \`email\`)
)`, 'Create AiQ users table');

// Seed roles
const roles = [
  ['role-psa-001', 'platform_super_admin', 'Platform Super Admin'],
  ['role-ta-001',  'tenant_admin',         'Tenant Admin'],
  ['role-hl-001',  'hr_leader',            'HR Leader'],
  ['role-mgr-001', 'manager',              'Manager'],
  ['role-lrn-001', 'learner',              'Learner'],
  ['role-aud-001', 'auditor',              'Auditor'],
];
for (const [id, key, label] of roles) {
  await exec(conn,
    `INSERT IGNORE INTO \`roles\` (\`id\`, \`key\`, \`label\`) VALUES ('${id}', '${key}', '${label}')`,
    `Role: ${key}`
  );
}

// Seed tenant
await exec(conn,
  `INSERT IGNORE INTO \`tenants\` (\`id\`, \`name\`, \`slug\`, \`primary_domain\`, \`status\`) VALUES ('tenant-demo-001', 'Acme Corporation', 'demo', 'demo.aiq.io', 'active')`,
  'Tenant: Acme Corporation'
);

// Seed tenant settings
await exec(conn,
  `INSERT IGNORE INTO \`tenant_settings\` (\`id\`, \`tenant_id\`) VALUES ('ts-demo-001', 'tenant-demo-001')`,
  'Tenant settings'
);

// Seed demo users (password = "Password123!")
// Hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK9e
const hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK9e';
const demoUsers = [
  ['user-psa-001', 'superadmin@aiq.io',  'Platform', 'Admin'],
  ['user-ta-001',  'admin@demo.aiq.com',     'Alice',    'Tenant'],
  ['user-hl-001',  'hr@demo.aiq.com',        'Harriet',  'Leader'],
  ['user-mgr-001', 'manager@demo.aiq.com',   'Marcus',   'Manager'],
  ['user-lrn-001', 'learner@demo.aiq.com',   'Laura',    'Learner'],
  ['user-aud-001', 'auditor@demo.aiq.com',   'Audrey',   'Auditor'],
];
for (const [id, email, first, last] of demoUsers) {
  await exec(conn,
    `INSERT IGNORE INTO \`users\` (\`id\`, \`tenant_id\`, \`email\`, \`first_name\`, \`last_name\`, \`password_hash\`, \`status\`) VALUES ('${id}', 'tenant-demo-001', '${email}', '${first}', '${last}', '${hash}', 'active')`,
    `User: ${email}`
  );
}

// Assign roles
const userRoles = [
  ['ur-psa-001', 'user-psa-001', 'role-psa-001'],
  ['ur-ta-001',  'user-ta-001',  'role-ta-001'],
  ['ur-hl-001',  'user-hl-001',  'role-hl-001'],
  ['ur-mgr-001', 'user-mgr-001', 'role-mgr-001'],
  ['ur-lrn-001', 'user-lrn-001', 'role-lrn-001'],
  ['ur-aud-001', 'user-aud-001', 'role-aud-001'],
];
for (const [id, userId, roleId] of userRoles) {
  await exec(conn,
    `INSERT IGNORE INTO \`user_roles\` (\`id\`, \`tenant_id\`, \`user_id\`, \`role_id\`) VALUES ('${id}', 'tenant-demo-001', '${userId}', '${roleId}')`,
    `UserRole: ${userId} -> ${roleId}`
  );
}

// Seed competencies
const competencies = [
  ['comp-001', 'data_literacy',         'Data Literacy',          'Ability to read, analyse and interpret data'],
  ['comp-002', 'ai_fundamentals',       'AI Fundamentals',        'Understanding of AI concepts and applications'],
  ['comp-003', 'risk_management',       'Risk Management',        'Identifying and mitigating business risks'],
  ['comp-004', 'digital_collaboration', 'Digital Collaboration',  'Effective use of digital tools for teamwork'],
  ['comp-005', 'change_management',     'Change Management',      'Leading and adapting to organisational change'],
];
for (const [id, key, name, desc] of competencies) {
  await exec(conn,
    `INSERT IGNORE INTO \`competencies\` (\`id\`, \`key\`, \`name\`, \`description\`) VALUES ('${id}', '${key}', '${name}', '${desc}')`,
    `Competency: ${key}`
  );
}

// Seed assessment blueprint
await exec(conn,
  `INSERT IGNORE INTO \`assessment_blueprints\` (\`id\`, \`tenant_id\`, \`key\`, \`name\`, \`version\`, \`status\`) VALUES ('bp-001', 'tenant-demo-001', 'general_capability_v1', 'General Capability Assessment v1', 1, 'published')`,
  'Assessment blueprint'
);

// Seed assessment items
const items = [
  ['item-001', 'comp-001', 'Which of the following best describes a data-driven decision?'],
  ['item-002', 'comp-002', 'What does "machine learning" primarily involve?'],
  ['item-003', 'comp-003', 'A risk matrix is used to:'],
  ['item-004', 'comp-004', 'Which practice best supports asynchronous remote collaboration?'],
  ['item-005', 'comp-005', 'The primary goal of a change management plan is to:'],
];
for (const [id, compId, prompt] of items) {
  await exec(conn,
    `INSERT IGNORE INTO \`assessment_items\` (\`id\`, \`blueprint_id\`, \`competency_id\`, \`item_type\`, \`prompt\`, \`difficulty\`, \`status\`) VALUES ('${id}', 'bp-001', '${compId}', 'single_choice', ${conn.escape(prompt)}, 2, 'published')`,
    `Item: ${id}`
  );
}

// Seed answer options
const options = [
  ['opt-001-a', 'item-001', 'Using gut instinct supported by experience', 'a', 1, false, 0],
  ['opt-001-b', 'item-001', 'Analysing relevant data before making a choice', 'b', 2, true, 1],
  ['opt-001-c', 'item-001', 'Following the most popular opinion in the team', 'c', 3, false, 0],
  ['opt-001-d', 'item-001', 'Delegating the decision to a senior colleague', 'd', 4, false, 0],
  ['opt-002-a', 'item-002', 'Programming explicit rules for every scenario', 'a', 1, false, 0],
  ['opt-002-b', 'item-002', 'Systems that learn patterns from data', 'b', 2, true, 1],
  ['opt-002-c', 'item-002', 'Storing large volumes of structured data', 'c', 3, false, 0],
  ['opt-002-d', 'item-002', 'Automating repetitive manual tasks only', 'd', 4, false, 0],
  ['opt-003-a', 'item-003', 'Track project milestones', 'a', 1, false, 0],
  ['opt-003-b', 'item-003', 'Assess likelihood and impact of risks', 'b', 2, true, 1],
  ['opt-003-c', 'item-003', 'Assign tasks to team members', 'c', 3, false, 0],
  ['opt-003-d', 'item-003', 'Document completed work', 'd', 4, false, 0],
  ['opt-004-a', 'item-004', 'Scheduling daily video calls for all decisions', 'a', 1, false, 0],
  ['opt-004-b', 'item-004', 'Using shared documentation and clear written communication', 'b', 2, true, 1],
  ['opt-004-c', 'item-004', 'Relying on email chains for all updates', 'c', 3, false, 0],
  ['opt-004-d', 'item-004', 'Limiting communication to one channel only', 'd', 4, false, 0],
  ['opt-005-a', 'item-005', 'Minimise costs during transitions', 'a', 1, false, 0],
  ['opt-005-b', 'item-005', 'Ensure stakeholders adopt and sustain the change', 'b', 2, true, 1],
  ['opt-005-c', 'item-005', 'Accelerate project delivery timelines', 'c', 3, false, 0],
  ['opt-005-d', 'item-005', 'Replace existing processes with new technology', 'd', 4, false, 0],
];
for (const [id, itemId, label, value, order, correct, weight] of options) {
  await exec(conn,
    `INSERT IGNORE INTO \`assessment_item_options\` (\`id\`, \`item_id\`, \`label\`, \`value\`, \`option_order\`, \`is_correct\`, \`score_weight\`) VALUES ('${id}', '${itemId}', ${conn.escape(label)}, '${value}', ${order}, ${correct}, ${weight})`,
    `Option: ${id}`
  );
}

// Seed content items
const contentItems = [
  ['ci-001', 'data_literacy_intro',    'Introduction to Data Literacy',         'micro_lesson',     1, 600],
  ['ci-002', 'ai_basics_video',        'AI Fundamentals: A Practical Overview', 'video',            2, 900],
  ['ci-003', 'risk_scenario_practice', 'Risk Assessment Scenario Practice',     'scenario_practice',3, 1200],
  ['ci-004', 'collab_tools_checklist', 'Digital Collaboration Tools Checklist', 'checklist',        1, 300],
  ['ci-005', 'change_mgmt_simulation', 'Change Management Simulation',          'simulation',       3, 1800],
  ['ci-006', 'data_analysis_worked',   'Worked Example: Analysing Survey Data', 'worked_example',   2, 720],
  ['ci-007', 'ai_ethics_reflection',   'AI Ethics: Reflection Exercise',        'reflection',       2, 480],
  ['ci-008', 'risk_coach_prompt',      'Risk Awareness Coach Prompt',           'coach_prompt',     1, 180],
];
for (const [id, key, title, type, diff, dur] of contentItems) {
  await exec(conn,
    `INSERT IGNORE INTO \`content_items\` (\`id\`, \`key\`, \`title\`, \`content_type\`, \`status\`, \`difficulty\`, \`duration_seconds\`) VALUES ('${id}', '${key}', ${conn.escape(title)}, '${type}', 'published', ${diff}, ${dur})`,
    `Content: ${key}`
  );
}

// Seed policy rules
const policies = [
  ['pr-001', 'low_credibility_block',     'Block access on low credibility',     'critical', 'hard_block',         '{"credibility_band":"low"}',      '{"message":"Access blocked: credibility score too low."}'],
  ['pr-002', 'high_risk_warning',         'Warn on high risk score',             'high',     'warning',            '{"risk_band":"high"}',             '{"message":"High risk detected. Manager notified."}'],
  ['pr-003', 'overdue_revalidation',      'Force revalidation when overdue',     'high',     'force_revalidation', '{"days_overdue":{"gte":1}}',        '{"message":"Revalidation overdue."}'],
  ['pr-004', 'compliance_breach_escalate','Escalate on compliance breach',       'critical', 'escalate',           '{"compliance_state":"breach"}',     '{"message":"Compliance breach escalated to HR."}'],
  ['pr-005', 'gap_remediation_trigger',   'Trigger remediation for skill gaps',  'medium',   'remediation_trigger','{"skill_gap_count":{"gte":2}}',     '{"message":"Learning plan updated with remediation content."}'],
];
for (const [id, key, name, severity, action, conditions, consequences] of policies) {
  await exec(conn,
    `INSERT IGNORE INTO \`policy_rules\` (\`id\`, \`tenant_id\`, \`key\`, \`name\`, \`status\`, \`severity\`, \`action_type\`, \`conditions_json\`, \`consequences_json\`) VALUES ('${id}', 'tenant-demo-001', '${key}', ${conn.escape(name)}, 'published', '${severity}', '${action}', '${conditions}', '${consequences}')`,
    `Policy: ${key}`
  );
}

// Seed learning objectives
const objectives = [
  ['lo-001', 'understand_data_types',   'Understand common data types and sources',    'comp-001', 'low'],
  ['lo-002', 'apply_ai_tools',          'Apply AI tools in everyday work tasks',       'comp-002', 'medium'],
  ['lo-003', 'conduct_risk_assessment', 'Conduct a basic risk assessment',             'comp-003', 'high'],
  ['lo-004', 'use_collaboration_tools', 'Use digital collaboration tools effectively', 'comp-004', 'low'],
  ['lo-005', 'lead_change_initiative',  'Lead a small change initiative',              'comp-005', 'medium'],
];
for (const [id, key, title, compId, risk] of objectives) {
  await exec(conn,
    `INSERT IGNORE INTO \`learning_objectives\` (\`id\`, \`key\`, \`title\`, \`competency_id\`, \`risk_level\`) VALUES ('${id}', '${key}', ${conn.escape(title)}, '${compId}', '${risk}')`,
    `Objective: ${key}`
  );
}

// Seed user state for learner
await exec(conn,
  `INSERT IGNORE INTO \`user_states\` (\`id\`, \`user_id\`, \`primary_state\`, \`credibility_state\`, \`risk_state\`, \`learning_state\`, \`compliance_state\`, \`state_reason_json\`) VALUES ('us-lrn-001', 'user-lrn-001', 'active_learner', 'medium', 'low', 'in_progress', 'compliant', '{"reason":"Initial state from onboarding"}')`,
  'User state for learner'
);

await conn.end();
console.log('\nDatabase reset and seed complete!');
