-- Migration 0012: add scoring_config_version to assessment_scores
-- Rollback: ALTER TABLE assessment_scores DROP COLUMN scoring_config_version;
--
-- Stamps every new score row with the active scoring config version at time of computation.
-- Historical rows (before this migration) default to version 1 (the synthetic_default config).
-- Results from different scoring config versions should not be directly compared.

ALTER TABLE assessment_scores
  ADD COLUMN scoring_config_version INT NOT NULL DEFAULT 1
    COMMENT 'References scoring_config.version active at time of score computation';
