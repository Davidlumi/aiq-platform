-- AiQ Seed Data: Roles, Demo Tenant, Demo Users
-- Passwords are bcrypt hashes of role-specific passwords for demo purposes
-- Admin: Admin1234! | HR Leader: HRLeader1234! | Manager: Manager1234! | Learner: Learner1234! | Auditor: Auditor1234!

-- Canonical roles (platform-wide)
INSERT IGNORE INTO `roles` (`id`, `key`, `label`) VALUES
  ('role-psa-001', 'platform_super_admin', 'Platform Super Admin'),
  ('role-ta-001',  'tenant_admin',         'Tenant Admin'),
  ('role-hl-001',  'hr_leader',            'HR Leader'),
  ('role-mgr-001', 'manager',              'Manager'),
  ('role-lrn-001', 'learner',              'Learner'),
  ('role-aud-001', 'auditor',              'Auditor');

-- Demo tenant
INSERT IGNORE INTO `tenants` (`id`, `name`, `slug`, `primary_domain`, `status`) VALUES
  ('tenant-demo-001', 'Acme Corporation', 'demo', 'demo.aiq.io', 'active');

-- Demo tenant settings
INSERT IGNORE INTO `tenant_settings` (`id`, `tenant_id`) VALUES
  ('ts-demo-001', 'tenant-demo-001');

-- Demo users with role-specific passwords
INSERT IGNORE INTO `users` (`id`, `tenant_id`, `email`, `first_name`, `last_name`, `password_hash`, `status`) VALUES
  ('user-psa-001',  'tenant-demo-001', 'superadmin@aiq.io',       'Platform', 'Admin',   '$2b$12$DOrQzlCBhEtW7BHGnp9/q..lOB9xQ5LIP6xotkr414mK7p6dxQsjC', 'active'),
  ('user-ta-001',   'tenant-demo-001', 'admin@demo.aiq.com',      'Alice',    'Admin',   '$2b$12$h8KtMxNlJJRgN.xS3/mglu5CZ23BOpb45qGopgPsHkoJMcIKw2FSS', 'active'),
  ('user-hl-001',   'tenant-demo-001', 'hr@demo.aiq.com',         'Harriet',  'Leader',  '$2b$12$WyIa/MzGq.2NgQR01FdXDeMJpLwuQCfmyEwq8ZePoPhTAHZFtoEGm', 'active'),
  ('user-mgr-001',  'tenant-demo-001', 'manager@demo.aiq.com',    'Marcus',   'Manager', '$2b$12$DJxMdpRnI4J25zOMcbxjp.02yXUvfoAjfN.ZWgXtzgKhKpQpgJy0C', 'active'),
  ('user-lrn-001',  'tenant-demo-001', 'learner@demo.aiq.com',    'Laura',    'Learner', '$2b$12$6zliIBQAQDOshlrI/KNU2uq0IqmaQ7oX7mvG0izFowsHe14DtEr1.', 'active'),
  ('user-aud-001',  'tenant-demo-001', 'auditor@demo.aiq.com',    'Audrey',   'Auditor', '$2b$12$iSq3kVwzMMzG1uHPxwfLYuBfMcfHiFyn5iBly8a242FloI7SvJ8J2', 'active');

-- Assign roles to demo users
INSERT IGNORE INTO `user_roles` (`id`, `tenant_id`, `user_id`, `role_id`) VALUES
  ('ur-psa-001', 'tenant-demo-001', 'user-psa-001', 'role-psa-001'),
  ('ur-ta-001',  'tenant-demo-001', 'user-ta-001',  'role-ta-001'),
  ('ur-hl-001',  'tenant-demo-001', 'user-hl-001',  'role-hl-001'),
  ('ur-mgr-001', 'tenant-demo-001', 'user-mgr-001', 'role-mgr-001'),
  ('ur-lrn-001', 'tenant-demo-001', 'user-lrn-001', 'role-lrn-001'),
  ('ur-aud-001', 'tenant-demo-001', 'user-aud-001', 'role-aud-001');

-- Demo assessment blueprint
INSERT IGNORE INTO `assessment_blueprints` (`id`, `tenant_id`, `key`, `name`, `version`, `status`) VALUES
  ('bp-001', 'tenant-demo-001', 'general_capability_v1', 'General Capability Assessment v1', 1, 'published');

-- Demo competencies
INSERT IGNORE INTO `competencies` (`id`, `key`, `name`, `description`) VALUES
  ('comp-001', 'data_literacy',        'Data Literacy',          'Ability to read, analyse and interpret data'),
  ('comp-002', 'ai_fundamentals',      'AI Fundamentals',        'Understanding of AI concepts and applications'),
  ('comp-003', 'risk_management',      'Risk Management',        'Identifying and mitigating business risks'),
  ('comp-004', 'digital_collaboration','Digital Collaboration',  'Effective use of digital tools for teamwork'),
  ('comp-005', 'change_management',    'Change Management',      'Leading and adapting to organisational change');

-- Demo assessment items
INSERT IGNORE INTO `assessment_items` (`id`, `blueprint_id`, `competency_id`, `item_type`, `prompt`, `difficulty`, `status`) VALUES
  ('item-001', 'bp-001', 'comp-001', 'single_choice', 'Which of the following best describes a data-driven decision?', 2, 'published'),
  ('item-002', 'bp-001', 'comp-002', 'single_choice', 'What does "machine learning" primarily involve?', 2, 'published'),
  ('item-003', 'bp-001', 'comp-003', 'single_choice', 'A risk matrix is used to:', 2, 'published'),
  ('item-004', 'bp-001', 'comp-004', 'single_choice', 'Which practice best supports asynchronous remote collaboration?', 2, 'published'),
  ('item-005', 'bp-001', 'comp-005', 'single_choice', 'The primary goal of a change management plan is to:', 2, 'published');

-- Answer options for item-001
INSERT IGNORE INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`) VALUES
  ('opt-001-a', 'item-001', 'Using gut instinct supported by experience', 'a', 1, false, 0),
  ('opt-001-b', 'item-001', 'Analysing relevant data before making a choice', 'b', 2, true, 1),
  ('opt-001-c', 'item-001', 'Following the most popular opinion in the team', 'c', 3, false, 0),
  ('opt-001-d', 'item-001', 'Delegating the decision to a senior colleague', 'd', 4, false, 0);

-- Answer options for item-002
INSERT IGNORE INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`) VALUES
  ('opt-002-a', 'item-002', 'Programming explicit rules for every scenario', 'a', 1, false, 0),
  ('opt-002-b', 'item-002', 'Systems that learn patterns from data', 'b', 2, true, 1),
  ('opt-002-c', 'item-002', 'Storing large volumes of structured data', 'c', 3, false, 0),
  ('opt-002-d', 'item-002', 'Automating repetitive manual tasks only', 'd', 4, false, 0);

-- Answer options for item-003
INSERT IGNORE INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`) VALUES
  ('opt-003-a', 'item-003', 'Track project milestones', 'a', 1, false, 0),
  ('opt-003-b', 'item-003', 'Assess likelihood and impact of risks', 'b', 2, true, 1),
  ('opt-003-c', 'item-003', 'Assign tasks to team members', 'c', 3, false, 0),
  ('opt-003-d', 'item-003', 'Document completed work', 'd', 4, false, 0);

-- Answer options for item-004
INSERT IGNORE INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`) VALUES
  ('opt-004-a', 'item-004', 'Scheduling daily video calls for all decisions', 'a', 1, false, 0),
  ('opt-004-b', 'item-004', 'Using shared documentation and clear written communication', 'b', 2, true, 1),
  ('opt-004-c', 'item-004', 'Relying on email chains for all updates', 'c', 3, false, 0),
  ('opt-004-d', 'item-004', 'Limiting communication to one channel only', 'd', 4, false, 0);

-- Answer options for item-005
INSERT IGNORE INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`) VALUES
  ('opt-005-a', 'item-005', 'Minimise costs during transitions', 'a', 1, false, 0),
  ('opt-005-b', 'item-005', 'Ensure stakeholders adopt and sustain the change', 'b', 2, true, 1),
  ('opt-005-c', 'item-005', 'Accelerate project delivery timelines', 'c', 3, false, 0),
  ('opt-005-d', 'item-005', 'Replace existing processes with new technology', 'd', 4, false, 0);

-- Demo content items
INSERT IGNORE INTO `content_items` (`id`, `key`, `title`, `content_type`, `status`, `difficulty`, `duration_seconds`, `metadata_json`) VALUES
  ('ci-001', 'data_literacy_intro',    'Introduction to Data Literacy',         'micro_lesson',     'published', 1, 600,  '{"tags":["data","fundamentals"]}'),
  ('ci-002', 'ai_basics_video',        'AI Fundamentals: A Practical Overview', 'video',            'published', 2, 900,  '{"tags":["ai","fundamentals"]}'),
  ('ci-003', 'risk_scenario_practice', 'Risk Assessment Scenario Practice',     'scenario_practice','published', 3, 1200, '{"tags":["risk","scenario"]}'),
  ('ci-004', 'collab_tools_checklist', 'Digital Collaboration Tools Checklist', 'checklist',        'published', 1, 300,  '{"tags":["collaboration","tools"]}'),
  ('ci-005', 'change_mgmt_simulation', 'Change Management Simulation',          'simulation',       'published', 3, 1800, '{"tags":["change","simulation"]}'),
  ('ci-006', 'data_analysis_worked',   'Worked Example: Analysing Survey Data', 'worked_example',   'published', 2, 720,  '{"tags":["data","analysis"]}'),
  ('ci-007', 'ai_ethics_reflection',   'AI Ethics: Reflection Exercise',        'reflection',       'published', 2, 480,  '{"tags":["ai","ethics"]}'),
  ('ci-008', 'risk_coach_prompt',      'Risk Awareness Coach Prompt',           'coach_prompt',     'published', 1, 180,  '{"tags":["risk","coaching"]}');

-- Demo policy rules
INSERT IGNORE INTO `policy_rules` (`id`, `tenant_id`, `key`, `name`, `status`, `severity`, `action_type`, `conditions_json`, `consequences_json`) VALUES
  ('pr-001', 'tenant-demo-001', 'low_credibility_block',    'Block access on low credibility',      'published', 'critical', 'hard_block',           '{"credibility_band":"low","min_score":0,"max_score":0.4}',  '{"message":"Access blocked: credibility score too low. Complete revalidation."}'),
  ('pr-002', 'tenant-demo-001', 'high_risk_warning',        'Warn on high risk score',              'published', 'high',     'warning',              '{"risk_band":"high"}',                                      '{"message":"High risk detected. Manager has been notified."}'),
  ('pr-003', 'tenant-demo-001', 'overdue_revalidation',     'Force revalidation when overdue',      'published', 'high',     'force_revalidation',   '{"days_overdue":{"gte":1}}',                                '{"message":"Revalidation overdue. Please complete your assessment."}'),
  ('pr-004', 'tenant-demo-001', 'compliance_breach_escalate','Escalate on compliance breach',       'published', 'critical', 'escalate',             '{"compliance_state":"breach"}',                             '{"message":"Compliance breach escalated to HR leader."}'),
  ('pr-005', 'tenant-demo-001', 'gap_remediation_trigger',  'Trigger remediation for skill gaps',   'published', 'medium',   'remediation_trigger',  '{"skill_gap_count":{"gte":2}}',                             '{"message":"Learning plan updated with remediation content."}');

-- Demo learning objectives
INSERT IGNORE INTO `learning_objectives` (`id`, `key`, `title`, `competency_id`, `risk_level`) VALUES
  ('lo-001', 'understand_data_types',     'Understand common data types and sources',     'comp-001', 'low'),
  ('lo-002', 'apply_ai_tools',            'Apply AI tools in everyday work tasks',        'comp-002', 'medium'),
  ('lo-003', 'conduct_risk_assessment',   'Conduct a basic risk assessment',              'comp-003', 'high'),
  ('lo-004', 'use_collaboration_tools',   'Use digital collaboration tools effectively',  'comp-004', 'low'),
  ('lo-005', 'lead_change_initiative',    'Lead a small change initiative',               'comp-005', 'medium');

-- Demo user state for learner
INSERT IGNORE INTO `user_states` (`id`, `user_id`, `primary_state`, `credibility_state`, `risk_state`, `learning_state`, `compliance_state`, `state_reason_json`) VALUES
  ('us-lrn-001', 'user-lrn-001', 'active_learner', 'medium', 'low', 'in_progress', 'compliant', '{"reason":"Initial state from onboarding assessment"}');
