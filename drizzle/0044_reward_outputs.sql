CREATE TABLE `reward_outputs` (
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `audience` varchar(20) NOT NULL DEFAULT 'board',
  `exec_summary_text` text,
  `exec_summary_ai_original` text,
  `connective_narrative_json` json,
  `last_export_state_hash` varchar(64),
  `last_export_at` bigint,
  `last_export_audience` varchar(20),
  `is_summary_stale` tinyint NOT NULL DEFAULT 0,
  `updated_at` bigint,
  CONSTRAINT `reward_outputs_tenant_id` PRIMARY KEY(`tenant_id`)
);

CREATE INDEX `idx_reward_outputs_tenant` ON `reward_outputs` (`tenant_id`);
