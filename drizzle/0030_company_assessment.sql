-- Company HR AI Assessment tables
-- Migration: 0030_company_assessment

CREATE TABLE `companies` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `created_by_user_id` varchar(36) NOT NULL,
  `name` varchar(200) NOT NULL,
  `sector` varchar(100) NOT NULL DEFAULT '',
  `headcount_band` varchar(50) NOT NULL DEFAULT '',
  `hr_team_size` varchar(50) NOT NULL DEFAULT '',
  `hris_platform` varchar(100) NOT NULL DEFAULT '',
  `existing_ai_tools_json` json NOT NULL,
  `assessment_motivation` varchar(100) NOT NULL DEFAULT '',
  `results_audience` varchar(100) NOT NULL DEFAULT '',
  `onboarding_completed_at` timestamp,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  INDEX `idx_companies_tenant` (`tenant_id`),
  INDEX `idx_companies_user` (`created_by_user_id`)
);

CREATE TABLE `company_questions` (
  `id` varchar(36) NOT NULL,
  `dimension` varchar(60) NOT NULL,
  `dimension_label` varchar(100) NOT NULL,
  `question_code` varchar(20) NOT NULL,
  `is_calibration` tinyint NOT NULL DEFAULT 0,
  `difficulty` int NOT NULL DEFAULT 2,
  `stem` text NOT NULL,
  `option_a` text NOT NULL,
  `option_b` text NOT NULL,
  `option_c` text NOT NULL,
  `option_d` text NOT NULL,
  `score_a` double NOT NULL DEFAULT 1.0,
  `score_b` double NOT NULL DEFAULT 2.0,
  `score_c` double NOT NULL DEFAULT 3.5,
  `score_d` double NOT NULL DEFAULT 5.0,
  `framework_version` varchar(20) NOT NULL DEFAULT 'v1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_company_q_code` (`question_code`),
  INDEX `idx_company_q_dimension` (`dimension`)
);

CREATE TABLE `company_assessments` (
  `id` varchar(36) NOT NULL,
  `company_id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `created_by_user_id` varchar(36) NOT NULL,
  `status` enum('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
  `current_dimension` varchar(60),
  `questions_answered` int NOT NULL DEFAULT 0,
  `started_at` timestamp NOT NULL DEFAULT (now()),
  `completed_at` timestamp,
  PRIMARY KEY (`id`),
  INDEX `idx_company_assessments_company` (`company_id`),
  INDEX `idx_company_assessments_tenant` (`tenant_id`)
);

CREATE TABLE `company_assessment_responses` (
  `id` varchar(36) NOT NULL,
  `assessment_id` varchar(36) NOT NULL,
  `question_id` varchar(36) NOT NULL,
  `selected_option` varchar(1) NOT NULL,
  `confidence` varchar(20) NOT NULL DEFAULT 'fairly_sure',
  `evidence` text,
  `raw_score` double NOT NULL,
  `adjusted_score` double NOT NULL,
  `answered_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  INDEX `idx_company_responses_assessment` (`assessment_id`),
  INDEX `idx_company_responses_question` (`question_id`)
);

CREATE TABLE `company_assessment_results` (
  `id` varchar(36) NOT NULL,
  `assessment_id` varchar(36) NOT NULL,
  `company_id` varchar(36) NOT NULL,
  `score_strategy` double NOT NULL DEFAULT 0,
  `score_governance` double NOT NULL DEFAULT 0,
  `score_data` double NOT NULL DEFAULT 0,
  `score_technology` double NOT NULL DEFAULT 0,
  `score_workforce` double NOT NULL DEFAULT 0,
  `score_hr_function` double NOT NULL DEFAULT 0,
  `score_culture` double NOT NULL DEFAULT 0,
  `overall_score` double NOT NULL DEFAULT 0,
  `maturity_label` varchar(60) NOT NULL DEFAULT '',
  `sector_percentile` int,
  `overall_percentile` int,
  `executive_summary` text,
  `gap_analysis_json` json,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_company_results_assessment` (`assessment_id`),
  INDEX `idx_company_results_company` (`company_id`)
);
