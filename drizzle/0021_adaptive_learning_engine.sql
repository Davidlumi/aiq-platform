-- Adaptive Learning Engine Tables
-- Migration: 0021_adaptive_learning_engine

CREATE TABLE IF NOT EXISTS `learning_modules` (
  `id` varchar(36) NOT NULL,
  `key` varchar(100) NOT NULL,
  `title` varchar(300) NOT NULL,
  `subtitle` varchar(500),
  `capability` varchar(100) NOT NULL,
  `modality` enum('tutorial','practical','case_study','quiz','scenario','video','reflection','coaching') NOT NULL,
  `difficulty` int NOT NULL DEFAULT 1,
  `level_label` varchar(50) NOT NULL DEFAULT 'Foundation',
  `duration_mins` int NOT NULL DEFAULT 10,
  `estimated_reading_mins` int NOT NULL DEFAULT 5,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'published',
  `body_json` json NOT NULL,
  `metadata_json` json,
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  CONSTRAINT `learning_modules_key_unique` UNIQUE (`key`),
  PRIMARY KEY (`id`)
);

CREATE INDEX `idx_lm_capability_modality` ON `learning_modules` (`capability`, `modality`, `difficulty`);
CREATE INDEX `idx_lm_status` ON `learning_modules` (`status`);

CREATE TABLE IF NOT EXISTS `learning_module_tags` (
  `id` varchar(36) NOT NULL,
  `module_id` varchar(36) NOT NULL,
  `tag_type` varchar(50) NOT NULL,
  `tag_value` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE INDEX `idx_lmt_module` ON `learning_module_tags` (`module_id`);
CREATE INDEX `idx_lmt_tag_type` ON `learning_module_tags` (`tag_type`, `tag_value`);

CREATE TABLE IF NOT EXISTS `gap_analyses` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `session_id` varchar(36),
  `capability_gaps_json` json NOT NULL,
  `priority_order_json` json NOT NULL,
  `overall_readiness_score` decimal(5,2) NOT NULL DEFAULT 0,
  `readiness_band` varchar(50) NOT NULL DEFAULT 'developing',
  `generated_at` bigint NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE INDEX `idx_ga_user_session` ON `gap_analyses` (`user_id`, `session_id`);
CREATE INDEX `idx_ga_user_tenant` ON `gap_analyses` (`user_id`, `tenant_id`);

CREATE TABLE IF NOT EXISTS `adaptive_learning_plans` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `gap_analysis_id` varchar(36) NOT NULL,
  `session_id` varchar(36),
  `state` enum('active','completed','superseded') NOT NULL DEFAULT 'active',
  `generator_version` varchar(20) NOT NULL DEFAULT 'v3-adaptive',
  `total_modules` int NOT NULL DEFAULT 0,
  `completed_modules` int NOT NULL DEFAULT 0,
  `estimated_total_mins` int NOT NULL DEFAULT 0,
  `summary_json` json,
  `generated_at` bigint NOT NULL,
  `completed_at` bigint,
  PRIMARY KEY (`id`)
);

CREATE INDEX `idx_alp_user_state` ON `adaptive_learning_plans` (`user_id`, `state`);

CREATE TABLE IF NOT EXISTS `adaptive_plan_items` (
  `id` varchar(36) NOT NULL,
  `plan_id` varchar(36) NOT NULL,
  `module_id` varchar(36) NOT NULL,
  `order_index` int NOT NULL,
  `phase` enum('foundation','development','practice','validation') NOT NULL DEFAULT 'foundation',
  `required` boolean NOT NULL DEFAULT true,
  `unlock_after_module_id` varchar(36),
  `status` enum('locked','available','in_progress','completed','skipped') NOT NULL DEFAULT 'available',
  `reason_json` json,
  `assigned_at` bigint NOT NULL,
  `started_at` bigint,
  `completed_at` bigint,
  `score_json` json,
  PRIMARY KEY (`id`)
);

CREATE INDEX `idx_api_plan` ON `adaptive_plan_items` (`plan_id`, `order_index`);
CREATE INDEX `idx_api_module` ON `adaptive_plan_items` (`module_id`);

CREATE TABLE IF NOT EXISTS `spaced_repetition_queue` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `module_id` varchar(36) NOT NULL,
  `plan_item_id` varchar(36),
  `next_due_at` bigint NOT NULL,
  `interval_days` decimal(6,2) NOT NULL DEFAULT 1,
  `ease_factor` decimal(4,3) NOT NULL DEFAULT 2.500,
  `repetitions` int NOT NULL DEFAULT 0,
  `last_score` decimal(5,2),
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  CONSTRAINT `uq_srq_user_module` UNIQUE (`user_id`, `module_id`),
  PRIMARY KEY (`id`)
);

CREATE INDEX `idx_srq_user_due` ON `spaced_repetition_queue` (`user_id`, `next_due_at`);
