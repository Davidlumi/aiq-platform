-- 0028: Learning enhancements
-- formativeQuizJson on learning_modules
ALTER TABLE learning_modules
  ADD COLUMN formative_quiz_json JSON NULL COMMENT 'Array of 3 formative quiz questions [{question, options:[{label,value,correct}], explanation}]',
  ADD COLUMN required_capability_score INT NULL DEFAULT NULL COMMENT 'Minimum capability score (0-100) required to unlock this module',
  ADD COLUMN required_level INT NULL DEFAULT NULL COMMENT 'Minimum difficulty level (1-5) of completed modules required to unlock';

-- triggerSource on gap_analyses
ALTER TABLE gap_analyses
  ADD COLUMN trigger_source ENUM('manual', 'assessment_complete', 'revalidation') NOT NULL DEFAULT 'manual';

-- auto_regenerated_at on adaptive_learning_plans (tracks when plan was auto-regenerated)
ALTER TABLE adaptive_learning_plans
  ADD COLUMN auto_regenerated_at BIGINT NULL DEFAULT NULL;
