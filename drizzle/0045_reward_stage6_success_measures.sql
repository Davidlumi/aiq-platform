-- Stage 6: Success Measures
-- reward_success_measures: one row per measure per initiative per tenant
CREATE TABLE `reward_success_measures` (
  `tenant_id` varchar(36) NOT NULL,
  `measure_id` varchar(36) NOT NULL,
  `initiative_id` varchar(80) NOT NULL,
  `name` varchar(200) NOT NULL,
  -- "to_be_established" | "known" | "external_reference"
  `baseline_type` varchar(30) NOT NULL DEFAULT 'to_be_established',
  `baseline_value` varchar(200),
  `baseline_source_note` varchar(400),
  `target` varchar(200),
  `timeframe` varchar(200),
  `how_measured` text,
  -- "efficiency" | "decision_quality" | "risk_mitigation" | "retention" | "strategic"
  `value_link` varchar(30),
  `is_challenged` tinyint NOT NULL DEFAULT 0,
  `challenge_note` text,
  `is_edited` tinyint NOT NULL DEFAULT 0,
  `is_accepted` tinyint NOT NULL DEFAULT 0,
  `is_rejected` tinyint NOT NULL DEFAULT 0,
  `rejection_reason` text,
  `sort_order` int NOT NULL DEFAULT 1,
  `is_archived` tinyint NOT NULL DEFAULT 0,
  `created_at` bigint NOT NULL,
  `updated_at` bigint,
  PRIMARY KEY (`tenant_id`, `measure_id`),
  INDEX `idx_rsm_tenant_initiative` (`tenant_id`, `initiative_id`)
);

-- reward_success_measures_stage: one row per tenant for stage-level state
CREATE TABLE `reward_success_measures_stage` (
  `tenant_id` varchar(36) NOT NULL PRIMARY KEY,
  `user_id` varchar(36) NOT NULL,
  `strategy_outcomes_json` json,
  `strategy_outcomes_ai_original_json` json,
  `is_confirmed` tinyint NOT NULL DEFAULT 0,
  `confirmed_at` bigint,
  `is_stale` tinyint NOT NULL DEFAULT 0,
  `updated_at` bigint,
  INDEX `idx_rsms_tenant` (`tenant_id`)
);
