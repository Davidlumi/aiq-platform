-- AiQ Coach Phase 0 — Database Schema Migration
-- Tables: coach_sessions, coach_messages, user_capability_memory, coach_audit_log,
--         apply_commitments, apply_evidence

CREATE TABLE IF NOT EXISTS `coach_sessions` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `mode` varchar(32) NOT NULL DEFAULT 'diagnostic',
  `state` varchar(32) NOT NULL DEFAULT 'idle',
  `assessment_session_id` varchar(36),
  `mode_context_json` json,
  `current_act` varchar(64),
  `turn_count` int NOT NULL DEFAULT 0,
  `prompt_version` varchar(32) NOT NULL DEFAULT '1.0.0',
  `classifier_version` varchar(32) NOT NULL DEFAULT '1.0.0',
  `started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paused_at` timestamp,
  `completed_at` timestamp,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_coach_sessions_tenant` (`tenant_id`),
  INDEX `idx_coach_sessions_user` (`user_id`)
);

CREATE TABLE IF NOT EXISTS `coach_messages` (
  `id` varchar(36) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `role` varchar(16) NOT NULL,
  `content` text NOT NULL,
  `client_turn_id` varchar(64),
  `classification_json` json,
  `flags_json` json,
  `llm_first_token_ms` int,
  `llm_completion_ms` int,
  `classifier_ms` int,
  `llm_input_tokens` int,
  `llm_output_tokens` int,
  `classifier_tokens` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_coach_messages_session` (`session_id`),
  INDEX `idx_coach_messages_tenant` (`tenant_id`),
  INDEX `idx_coach_messages_client_turn` (`client_turn_id`)
);

CREATE TABLE IF NOT EXISTS `user_capability_memory` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `capability_domain` varchar(64) NOT NULL,
  `signal_key` varchar(64) NOT NULL,
  `memory_type` varchar(32) NOT NULL,
  `confidence` int NOT NULL DEFAULT 80,
  `source_turn_id` varchar(36),
  `source_session_id` varchar(36),
  `source_mode` varchar(32),
  `summary` text,
  `evidence_json` json,
  `conflict_status` varchar(32) DEFAULT 'none',
  `superseded_by_id` varchar(36),
  `last_reinforced_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ucm_user_domain` (`user_id`, `capability_domain`),
  INDEX `idx_ucm_tenant` (`tenant_id`),
  INDEX `idx_ucm_signal` (`user_id`, `capability_domain`, `signal_key`)
);

CREATE TABLE IF NOT EXISTS `coach_audit_log` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36),
  `event_type` varchar(64) NOT NULL,
  `session_id` varchar(36),
  `turn_id` varchar(36),
  `payload_json` json NOT NULL,
  `classifier_version` varchar(32),
  `prompt_version` varchar(32),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_coach_audit_user_time` (`user_id`, `created_at`),
  INDEX `idx_coach_audit_tenant_event` (`tenant_id`, `event_type`, `created_at`)
);

CREATE TABLE IF NOT EXISTS `apply_commitments` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `capability_domain` varchar(64) NOT NULL,
  `commitment_text` text NOT NULL,
  `due_date` timestamp,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `reminder_sent_at` timestamp,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_apply_commitments_user` (`user_id`),
  INDEX `idx_apply_commitments_tenant` (`tenant_id`)
);

CREATE TABLE IF NOT EXISTS `apply_evidence` (
  `id` varchar(36) NOT NULL,
  `commitment_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `evidence_text` text NOT NULL,
  `quality_score` int,
  `classification_json` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_apply_evidence_commitment` (`commitment_id`),
  INDEX `idx_apply_evidence_user` (`user_id`)
);
