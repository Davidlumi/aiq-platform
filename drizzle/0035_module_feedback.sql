CREATE TABLE `module_feedback` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `module_id` varchar(100) NOT NULL,
  `prompt_index` int NOT NULL DEFAULT 0,
  `feedback_text` text NOT NULL,
  `format_type` enum('reflection','practical_exercise') NOT NULL,
  `user_response_snapshot` text NOT NULL,
  `model_used` varchar(100) NOT NULL DEFAULT 'default',
  `library_version` varchar(20) NOT NULL DEFAULT 'v1.4',
  `generated_at` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `module_feedback_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_mf_user_module` ON `module_feedback` (`user_id`,`module_id`);
CREATE INDEX `idx_mf_user_module_prompt` ON `module_feedback` (`user_id`,`module_id`,`prompt_index`);
