-- Migration 0011: scoring_config table
-- Rollback: DROP TABLE scoring_config; ALTER TABLE assessment_scores DROP COLUMN scoring_config_version;
--
-- Replaces the hard-coded 50 + Σ/count × 50 score transform with a versioned,
-- configurable one. Only one row may be active at a time (enforced by unique index
-- on is_active = 1 via application logic; MySQL does not support partial unique indexes).
--
-- calibration_source enum:
--   synthetic_default — initial uncalibrated transform (v1)
--   pilot_cohort      — calibrated from a pilot cohort of real completions
--   empirical         — calibrated from a full production dataset

CREATE TABLE IF NOT EXISTS scoring_config (
  id                      INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  version                 INT          NOT NULL UNIQUE,
  capability_score_intercept DECIMAL(6,2) NOT NULL DEFAULT 50.00,
  capability_score_multiplier DECIMAL(6,2) NOT NULL DEFAULT 50.00,
  is_active               BOOLEAN      NOT NULL DEFAULT FALSE,
  calibration_source      ENUM('synthetic_default','pilot_cohort','empirical') NOT NULL DEFAULT 'synthetic_default',
  calibration_sample_size INT          NULL,
  calibrated_at           TIMESTAMP    NULL,
  notes                   TEXT         NULL,
  created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed the initial v1 config
INSERT INTO scoring_config
  (version, capability_score_intercept, capability_score_multiplier, is_active, calibration_source, notes)
VALUES
  (1, 50.00, 50.00, TRUE, 'synthetic_default', 'Initial uncalibrated transform from v2.0. Intercept=50 centres the scale; multiplier=50 maps the normalised average delta to the 0–100 range. To be recalibrated once pilot cohort data is available.');
