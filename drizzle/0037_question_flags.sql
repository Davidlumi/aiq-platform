-- D1: question_flags table for assessment question flagging affordance
CREATE TABLE IF NOT EXISTS `question_flags` (
  `id` varchar(36) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `item_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `reason` enum('confusing_wording','multiple_correct_answers','not_applicable','other') NOT NULL,
  `comment` text,
  `reviewed` tinyint NOT NULL DEFAULT 0,
  `reviewed_by` varchar(36),
  `reviewed_at` bigint,
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_qf_session` (`session_id`),
  INDEX `idx_qf_item` (`item_id`),
  INDEX `idx_qf_user` (`user_id`),
  INDEX `idx_qf_reviewed` (`reviewed`)
);
