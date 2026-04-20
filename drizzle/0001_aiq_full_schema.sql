-- AiQ Platform Full Schema Migration
-- Multi-tenant enterprise HR capability intelligence platform

CREATE TABLE IF NOT EXISTS `tenants` (
  `id` varchar(36) NOT NULL,
  `name` text NOT NULL,
  `slug` varchar(100) NOT NULL,
  `primary_domain` varchar(255),
  `status` enum('active','trial','suspended','archived') NOT NULL DEFAULT 'trial',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
  CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);

CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `credibility_threshold` decimal(5,4) NOT NULL DEFAULT '0.7500',
  `revalidation_days_low` int NOT NULL DEFAULT 90,
  `revalidation_days_medium` int NOT NULL DEFAULT 60,
  `revalidation_days_high` int NOT NULL DEFAULT 30,
  `default_risk_model_version` varchar(20) NOT NULL DEFAULT 'v1',
  `default_learning_model_version` varchar(20) NOT NULL DEFAULT 'v1',
  `config_json` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tenant_settings_id` PRIMARY KEY(`id`),
  CONSTRAINT `tenant_settings_tenant_id_unique` UNIQUE(`tenant_id`)
);

CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `email` varchar(320) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `password_hash` varchar(255),
  `status` enum('active','pending','suspended','deactivated') NOT NULL DEFAULT 'pending',
  `password_reset_token` varchar(255),
  `password_reset_expiry` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `last_signed_in` timestamp NULL,
  CONSTRAINT `users_id` PRIMARY KEY(`id`),
  CONSTRAINT `tenant_email_unique` UNIQUE(`tenant_id`, `email`)
);

CREATE INDEX `idx_users_tenant_email` ON `users` (`tenant_id`, `email`);

CREATE TABLE IF NOT EXISTS `roles` (
  `id` varchar(36) NOT NULL,
  `key` varchar(50) NOT NULL,
  `label` varchar(100) NOT NULL,
  CONSTRAINT `roles_id` PRIMARY KEY(`id`),
  CONSTRAINT `roles_key_unique` UNIQUE(`key`)
);

CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `role_id` varchar(36) NOT NULL,
  `assigned_by` varchar(36),
  `assigned_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `user_roles_id` PRIMARY KEY(`id`),
  CONSTRAINT `unique_user_role` UNIQUE(`tenant_id`, `user_id`, `role_id`)
);

CREATE TABLE IF NOT EXISTS `personas` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `key` varchar(50) NOT NULL,
  `label` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `personas_id` PRIMARY KEY(`id`),
  CONSTRAINT `unique_persona_key` UNIQUE(`tenant_id`, `key`)
);

CREATE TABLE IF NOT EXISTS `user_personas` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `persona_id` varchar(36) NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `user_personas_id` PRIMARY KEY(`id`),
  CONSTRAINT `unique_user_persona` UNIQUE(`user_id`, `persona_id`)
);

CREATE TABLE IF NOT EXISTS `competencies` (
  `id` varchar(36) NOT NULL,
  `key` varchar(100) NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text,
  CONSTRAINT `competencies_id` PRIMARY KEY(`id`),
  CONSTRAINT `competencies_key_unique` UNIQUE(`key`)
);

CREATE TABLE IF NOT EXISTS `assessment_blueprints` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36),
  `key` varchar(100) NOT NULL,
  `name` varchar(200) NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `role_scope_json` json NOT NULL,
  `structure_json` json NOT NULL,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `assessment_blueprints_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `assessment_items` (
  `id` varchar(36) NOT NULL,
  `blueprint_id` varchar(36) NOT NULL,
  `competency_id` varchar(36),
  `item_type` varchar(50) NOT NULL,
  `prompt` text NOT NULL,
  `metadata_json` json NOT NULL,
  `difficulty` int NOT NULL DEFAULT 2,
  `active_version` int NOT NULL DEFAULT 1,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `assessment_items_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `assessment_item_options` (
  `id` varchar(36) NOT NULL,
  `item_id` varchar(36) NOT NULL,
  `label` text NOT NULL,
  `value` varchar(100) NOT NULL,
  `option_order` int NOT NULL,
  `is_correct` boolean,
  `score_weight` decimal(6,2) NOT NULL DEFAULT '0',
  `outcome_class` varchar(50),
  `signal_deltas_json` json NOT NULL,
  `event_codes_json` json NOT NULL,
  CONSTRAINT `assessment_item_options_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `assessment_sessions` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `blueprint_id` varchar(36) NOT NULL,
  `state` enum('not_started','in_progress','completed','abandoned','invalidated') NOT NULL DEFAULT 'not_started',
  `started_at` timestamp NULL,
  `completed_at` timestamp NULL,
  `invalidated_at` timestamp NULL,
  `session_metadata_json` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `assessment_sessions_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_assessment_sessions_user_state` ON `assessment_sessions` (`tenant_id`, `user_id`, `started_at`);

CREATE TABLE IF NOT EXISTS `assessment_answers` (
  `id` varchar(36) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `item_id` varchar(36) NOT NULL,
  `selected_value_json` json,
  `free_text` text,
  `confidence_score` decimal(5,4),
  `time_to_answer_ms` int NOT NULL DEFAULT 0,
  `revision_count` int NOT NULL DEFAULT 0,
  `correctness` boolean,
  `submitted_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `assessment_answers_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `assessment_scores` (
  `id` varchar(36) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `overall_score` decimal(6,2) NOT NULL,
  `score_breakdown_json` json NOT NULL,
  `signal_scores_json` json NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT (now()),
  `model_version` varchar(20) NOT NULL DEFAULT 'v1',
  CONSTRAINT `assessment_scores_id` PRIMARY KEY(`id`),
  CONSTRAINT `assessment_scores_session_id_unique` UNIQUE(`session_id`)
);

CREATE TABLE IF NOT EXISTS `credibility_scores` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `assessment_session_id` varchar(36),
  `credibility_score` decimal(5,4) NOT NULL,
  `band` enum('low','medium','high') NOT NULL,
  `reason_json` json NOT NULL,
  `model_version` varchar(20) NOT NULL DEFAULT 'v1',
  `generated_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `credibility_scores_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `risk_scores` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `risk_score` decimal(5,4) NOT NULL,
  `band` enum('low','medium','high') NOT NULL,
  `reason_json` json NOT NULL,
  `model_version` varchar(20) NOT NULL DEFAULT 'v1',
  `generated_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `risk_scores_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `user_states` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `primary_state` varchar(50) NOT NULL,
  `credibility_state` enum('low','medium','high') NOT NULL DEFAULT 'low',
  `risk_state` enum('low','medium','high') NOT NULL DEFAULT 'low',
  `learning_state` varchar(50) NOT NULL DEFAULT 'not_started',
  `compliance_state` enum('compliant','at_risk','breach') NOT NULL DEFAULT 'compliant',
  `effective_from` timestamp NOT NULL DEFAULT (now()),
  `effective_to` timestamp NULL,
  `state_reason_json` json NOT NULL,
  CONSTRAINT `user_states_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_user_states_current` ON `user_states` (`user_id`, `effective_to`);

CREATE TABLE IF NOT EXISTS `decision_logs` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `decision_type` varchar(100) NOT NULL,
  `input_snapshot_json` json NOT NULL,
  `output_snapshot_json` json NOT NULL,
  `precedence_applied_json` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `decision_logs_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `revalidation_schedules` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `due_at` timestamp NOT NULL,
  `trigger_reason` varchar(200) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `completed_at` timestamp NULL,
  CONSTRAINT `revalidation_schedules_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `learning_objectives` (
  `id` varchar(36) NOT NULL,
  `key` varchar(100) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `competency_id` varchar(36),
  `risk_level` enum('low','medium','high') NOT NULL DEFAULT 'low',
  CONSTRAINT `learning_objectives_id` PRIMARY KEY(`id`),
  CONSTRAINT `learning_objectives_key_unique` UNIQUE(`key`)
);

CREATE TABLE IF NOT EXISTS `content_items` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36),
  `key` varchar(100) NOT NULL,
  `title` varchar(300) NOT NULL,
  `content_type` enum('video','article','quiz','scenario','simulation','walkthrough','coach_prompt','micro_lesson','worked_example','scenario_practice','checklist','reflection','nudge') NOT NULL,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `version` int NOT NULL DEFAULT 1,
  `difficulty` int NOT NULL DEFAULT 2,
  `duration_seconds` int NOT NULL DEFAULT 0,
  `metadata_json` json NOT NULL,
  `body_json` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `content_items_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `content_item_tags` (
  `id` varchar(36) NOT NULL,
  `content_item_id` varchar(36) NOT NULL,
  `tag_type` varchar(50) NOT NULL,
  `tag_value` varchar(100) NOT NULL,
  CONSTRAINT `content_item_tags_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `policy_rules` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `key` varchar(100) NOT NULL,
  `name` varchar(200) NOT NULL,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `severity` varchar(50) NOT NULL DEFAULT 'medium',
  `action_type` enum('hard_block','warning','remediation_trigger','escalate','force_revalidation') NOT NULL,
  `conditions_json` json NOT NULL,
  `consequences_json` json NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `policy_rules_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_policy_rules_tenant_status` ON `policy_rules` (`tenant_id`, `status`, `severity`);

CREATE TABLE IF NOT EXISTS `learning_plans` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `source_assessment_session_id` varchar(36),
  `state` enum('active','completed','superseded','blocked') NOT NULL DEFAULT 'active',
  `generated_at` timestamp NOT NULL DEFAULT (now()),
  `generator_version` varchar(20) NOT NULL DEFAULT 'v1',
  `summary_json` json NOT NULL,
  CONSTRAINT `learning_plans_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_learning_plans_user_generated` ON `learning_plans` (`tenant_id`, `user_id`, `generated_at`);

CREATE TABLE IF NOT EXISTS `learning_plan_items` (
  `id` varchar(36) NOT NULL,
  `learning_plan_id` varchar(36) NOT NULL,
  `content_item_id` varchar(36) NOT NULL,
  `order_index` int NOT NULL,
  `required` boolean NOT NULL DEFAULT true,
  `unlock_rule_json` json,
  `reason_json` json NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'assigned',
  `assigned_at` timestamp NOT NULL DEFAULT (now()),
  `completed_at` timestamp NULL,
  CONSTRAINT `learning_plan_items_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `content_progress` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `content_item_id` varchar(36) NOT NULL,
  `progress_percent` decimal(5,2) NOT NULL DEFAULT '0',
  `status` varchar(50) NOT NULL DEFAULT 'not_started',
  `started_at` timestamp NULL,
  `completed_at` timestamp NULL,
  `latest_result_json` json NOT NULL,
  CONSTRAINT `content_progress_id` PRIMARY KEY(`id`),
  CONSTRAINT `unique_user_content` UNIQUE(`user_id`, `content_item_id`)
);

CREATE TABLE IF NOT EXISTS `simulations` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36),
  `key` varchar(100) NOT NULL,
  `title` varchar(300) NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `learning_objective_id` varchar(36),
  `metadata_json` json NOT NULL,
  `pass_conditions_json` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `simulations_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `simulation_nodes` (
  `id` varchar(36) NOT NULL,
  `simulation_id` varchar(36) NOT NULL,
  `node_key` varchar(100) NOT NULL,
  `node_type` varchar(50) NOT NULL,
  `prompt` text NOT NULL,
  `context_json` json NOT NULL,
  `scoring_weight` decimal(6,2) NOT NULL DEFAULT '1',
  `node_order` int,
  `is_start` boolean NOT NULL DEFAULT false,
  `is_end` boolean NOT NULL DEFAULT false,
  CONSTRAINT `simulation_nodes_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `simulation_choices` (
  `id` varchar(36) NOT NULL,
  `node_id` varchar(36) NOT NULL,
  `choice_key` varchar(100) NOT NULL,
  `label` text NOT NULL,
  `choice_order` int NOT NULL,
  `outcome_type` varchar(50) NOT NULL,
  `score_delta` decimal(6,2) NOT NULL DEFAULT '0',
  `risk_delta` decimal(6,2) NOT NULL DEFAULT '0',
  `metadata_json` json NOT NULL,
  CONSTRAINT `simulation_choices_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `simulation_transitions` (
  `id` varchar(36) NOT NULL,
  `simulation_id` varchar(36) NOT NULL,
  `from_node_id` varchar(36) NOT NULL,
  `choice_id` varchar(36) NOT NULL,
  `to_node_id` varchar(36) NOT NULL,
  `condition_json` json,
  CONSTRAINT `simulation_transitions_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `simulation_sessions` (
  `id` varchar(36) NOT NULL,
  `simulation_id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `learning_plan_id` varchar(36),
  `state` enum('in_progress','completed','failed','passed') NOT NULL DEFAULT 'in_progress',
  `started_at` timestamp NOT NULL DEFAULT (now()),
  `completed_at` timestamp NULL,
  `mode` enum('standard','guided') NOT NULL DEFAULT 'standard',
  `variant_key` varchar(100),
  `current_node_id` varchar(36),
  `total_score` decimal(6,2) NOT NULL DEFAULT '0',
  `guided_mode_triggered` boolean NOT NULL DEFAULT false,
  CONSTRAINT `simulation_sessions_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_simulation_sessions_user_started` ON `simulation_sessions` (`tenant_id`, `user_id`, `started_at`);

CREATE TABLE IF NOT EXISTS `simulation_session_events` (
  `id` varchar(36) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `node_id` varchar(36),
  `choice_id` varchar(36),
  `event_type` varchar(100) NOT NULL,
  `payload_json` json NOT NULL,
  `occurred_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `simulation_session_events_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `simulation_results` (
  `id` varchar(36) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `total_score` decimal(6,2) NOT NULL,
  `score_breakdown_json` json NOT NULL,
  `passed` boolean NOT NULL,
  `risk_impact_json` json NOT NULL,
  `feedback_json` json NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `simulation_results_id` PRIMARY KEY(`id`),
  CONSTRAINT `simulation_results_session_id_unique` UNIQUE(`session_id`)
);

CREATE TABLE IF NOT EXISTS `policy_evaluations` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `policy_rule_id` varchar(36) NOT NULL,
  `context_type` varchar(100) NOT NULL,
  `context_id` varchar(36),
  `result` varchar(50) NOT NULL,
  `explanation_json` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `policy_evaluations_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `admin_overrides` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `target_user_id` varchar(36) NOT NULL,
  `override_type` varchar(100) NOT NULL,
  `reason` text NOT NULL,
  `before_snapshot_json` json NOT NULL,
  `after_snapshot_json` json NOT NULL,
  `created_by` varchar(36),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `revoked_at` timestamp NULL,
  `active` boolean NOT NULL DEFAULT true,
  CONSTRAINT `admin_overrides_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `events` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36),
  `event_type` varchar(100) NOT NULL,
  `source_service` varchar(100) NOT NULL,
  `source_id` varchar(36),
  `correlation_id` varchar(100),
  `payload_json` json NOT NULL,
  `occurred_at` timestamp NOT NULL DEFAULT (now()),
  `ingested_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `events_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_events_tenant_type_time` ON `events` (`tenant_id`, `event_type`, `occurred_at`);

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `actor_user_id` varchar(36),
  `action` varchar(200) NOT NULL,
  `target_type` varchar(100) NOT NULL,
  `target_id` varchar(36),
  `metadata_json` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_audit_logs_tenant_time` ON `audit_logs` (`tenant_id`, `created_at`);

CREATE TABLE IF NOT EXISTS `report_jobs` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `report_type` varchar(100) NOT NULL,
  `requested_by` varchar(36),
  `parameters_json` json NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'queued',
  `download_url` text,
  `manifest_json` json NOT NULL,
  `expires_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `completed_at` timestamp NULL,
  CONSTRAINT `report_jobs_id` PRIMARY KEY(`id`)
);
