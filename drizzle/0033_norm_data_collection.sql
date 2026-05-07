-- Migration: 0033_norm_data_collection
-- Adds norm_data_points table for CR-7: population norm collection
-- Anonymised score data collected from completed assessments to replace synthetic norms

CREATE TABLE IF NOT EXISTS `norm_data_points` (
  `id` varchar(36) NOT NULL,
  `sector` varchar(100),
  `job_function` varchar(100),
  `experience_level` varchar(50),
  `overall_score` decimal(5,2) NOT NULL,
  `capability_scores_json` json NOT NULL,
  `readiness_state` varchar(50),
  `model_version` varchar(50) DEFAULT 'adaptive-v2',
  `collected_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_norm_data_sector` (`sector`),
  INDEX `idx_norm_data_job_function` (`job_function`),
  INDEX `idx_norm_data_collected_at` (`collected_at`)
);
