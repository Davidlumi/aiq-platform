-- Content System Tables Migration (TiDB compatible)

CREATE TABLE IF NOT EXISTS `content_roles` (
  `id` varchar(36) NOT NULL,
  `key` varchar(100) NOT NULL,
  `label` varchar(200) NOT NULL,
  `family` varchar(100) NOT NULL,
  `description` text,
  `ai_usage_patterns_json` json,
  `capability_weightings_json` json,
  `failure_points_json` json,
  `risk_level` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `content_roles_key_unique` (`key`)
);

CREATE TABLE IF NOT EXISTS `content_workflows` (
  `id` varchar(36) NOT NULL,
  `key` varchar(100) NOT NULL,
  `domain` varchar(100) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `steps_json` json,
  `ai_usage_points_json` json,
  `risk_points_json` json,
  `governance_requirements_json` json,
  `applicable_role_keys_json` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `content_workflows_key_unique` (`key`)
);

CREATE TABLE IF NOT EXISTS `content_scenarios` (
  `id` varchar(36) NOT NULL,
  `interaction_id` varchar(100) NOT NULL,
  `title` varchar(300) NOT NULL,
  `domain` varchar(100) NOT NULL,
  `capability_key` varchar(50) NOT NULL,
  `interaction_type` varchar(50) NOT NULL,
  `difficulty` int NOT NULL DEFAULT 2,
  `risk_level` enum('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  `governance_sensitive` tinyint(1) NOT NULL DEFAULT 0,
  `scenario` text NOT NULL,
  `constraint` text,
  `question` text NOT NULL,
  `workflow_key` varchar(100),
  `role_keys_json` json,
  `failure_mode_keys_json` json,
  `tags_json` json,
  `primary_signal` varchar(100),
  `ambiguity_level` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `status` enum('draft','published','archived','under_review') NOT NULL DEFAULT 'draft',
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `content_scenarios_interaction_id_unique` (`interaction_id`),
  INDEX `idx_content_scenarios_domain_cap` (`domain`, `capability_key`),
  INDEX `idx_content_scenarios_status` (`status`)
);

CREATE TABLE IF NOT EXISTS `content_scenario_options` (
  `id` varchar(36) NOT NULL,
  `scenario_id` varchar(36) NOT NULL,
  `option_order` int NOT NULL,
  `label` text NOT NULL,
  `value` varchar(100) NOT NULL,
  `outcome_class` varchar(50),
  `signal_deltas_json` json,
  `rationale_text` text,
  `is_optimal` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `content_failure_modes` (
  `id` varchar(36) NOT NULL,
  `key` varchar(100) NOT NULL,
  `label` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `hr_examples_json` json,
  `risk_implications_json` json,
  `capability_keys_json` json,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `content_failure_modes_key_unique` (`key`)
);

CREATE TABLE IF NOT EXISTS `content_versions` (
  `id` varchar(36) NOT NULL,
  `scenario_id` varchar(36) NOT NULL,
  `version` int NOT NULL,
  `change_type` enum('created','edited','reviewed','published','archived') NOT NULL,
  `changed_by` varchar(36),
  `change_summary` text,
  `snapshot_json` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_content_versions_scenario` (`scenario_id`, `version`)
);
