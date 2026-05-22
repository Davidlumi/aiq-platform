-- Stage 8: Capability Assessment tables
-- reward_capability_dimensions: one row per tenant per dimension
CREATE TABLE IF NOT EXISTS `reward_capability_dimensions` (
  `tenant_id` varchar(36) NOT NULL,
  `dimension` varchar(64) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `required_level` varchar(16) NOT NULL DEFAULT 'medium',
  `current_level` varchar(16),
  `gap_status` varchar(32),
  `gap_statement` text,
  `gap_statement_ai_original` text,
  `action_note` text,
  `action_note_ai_original` text,
  `is_challenged` tinyint NOT NULL DEFAULT 0,
  `challenge_note` text,
  `owner` varchar(255),
  `updated_at` bigint,
  PRIMARY KEY (`tenant_id`, `dimension`),
  INDEX `idx_rcd_tenant` (`tenant_id`)
);

-- reward_capability_stage: stage-level confirmation and staleness
CREATE TABLE IF NOT EXISTS `reward_capability_stage` (
  `tenant_id` varchar(36) NOT NULL PRIMARY KEY,
  `user_id` varchar(36) NOT NULL,
  `enablement_cost_json` json,
  `enablement_cost_ai_original_json` json,
  `sequencing_flags_json` json,
  `capability_risk_note_json` json,
  `is_confirmed` tinyint NOT NULL DEFAULT 0,
  `confirmed_at` bigint,
  `is_stale` tinyint NOT NULL DEFAULT 0,
  `updated_at` bigint,
  INDEX `idx_rcs_tenant` (`tenant_id`)
);
