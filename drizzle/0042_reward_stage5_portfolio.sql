-- Stage 5 Reward Initiatives: portfolio, custom initiatives, recommendation run cache

CREATE TABLE `reward_initiative_portfolio` (
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `selected_initiatives_json` json,
  `dismissed_initiatives_json` json,
  `is_completed` tinyint NOT NULL DEFAULT 0,
  `completed_at` bigint,
  `updated_at` bigint,
  PRIMARY KEY (`tenant_id`),
  INDEX `idx_reward_portfolio_tenant` (`tenant_id`)
);

CREATE TABLE `reward_custom_initiative` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `sub_domain` varchar(50) NOT NULL,
  `phase` enum('Foundation','Build','Optimise') NOT NULL,
  `complexity` enum('Low','Medium','High','Highest') NOT NULL,
  `value_low` int NOT NULL,
  `value_high` int NOT NULL,
  `cost_low` int,
  `cost_high` int,
  `principles_alignment` text,
  `risks` text,
  `notes` text,
  `in_portfolio` tinyint NOT NULL DEFAULT 1,
  `created_at` bigint NOT NULL,
  `updated_at` bigint,
  PRIMARY KEY (`id`),
  INDEX `idx_reward_custom_tenant` (`tenant_id`)
);

CREATE TABLE `reward_recommendation_run` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `ran_at` bigint NOT NULL,
  `inputs_hash` varchar(64) NOT NULL,
  `recommendations_json` json,
  `engine_version` varchar(20) NOT NULL DEFAULT 'v1',
  PRIMARY KEY (`id`),
  INDEX `idx_reward_rec_run_tenant` (`tenant_id`),
  INDEX `idx_reward_rec_run_hash` (`inputs_hash`)
);
