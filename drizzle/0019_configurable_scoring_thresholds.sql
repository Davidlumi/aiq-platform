-- WS1.2 Item 1: Move hard-coded scoring constants into scoring_config
-- Adds six columns so all scoring thresholds are tunable without a redeploy.
--
-- New columns and their defaults (reproduce current hard-coded behaviour exactly):
--   base_failure_threshold_magnitude  1.50  — per-item delta at which a failure mode triggers
--   catastrophic_margin_multiplier    1.50  — multiplier: base × margin = 2.25 catastrophic threshold
--   at_risk_confidence_floor          0.35  — below this, at_risk is downgraded to insufficient_evidence
--   provisional_confidence_threshold  0.40  — below this, unknown_insufficient_evidence is returned
--   confidence_floor                  0.50  — below this, isProvisional=true is set on the result
--   minimum_safe_classification_confidence 0.55 — below this, safe is downgraded to at_risk

ALTER TABLE scoring_config
  ADD COLUMN IF NOT EXISTS base_failure_threshold_magnitude     DECIMAL(5,3) NOT NULL DEFAULT 1.500,
  ADD COLUMN IF NOT EXISTS catastrophic_margin_multiplier       DECIMAL(5,3) NOT NULL DEFAULT 1.500,
  ADD COLUMN IF NOT EXISTS at_risk_confidence_floor             DECIMAL(5,3) NOT NULL DEFAULT 0.350,
  ADD COLUMN IF NOT EXISTS provisional_confidence_threshold     DECIMAL(5,3) NOT NULL DEFAULT 0.400,
  ADD COLUMN IF NOT EXISTS confidence_floor                     DECIMAL(5,3) NOT NULL DEFAULT 0.500,
  ADD COLUMN IF NOT EXISTS minimum_safe_classification_confidence DECIMAL(5,3) NOT NULL DEFAULT 0.550;

-- Update the existing v2.2 row (version=2) to carry these defaults explicitly.
-- This ensures the row is self-documenting and a future SELECT shows all active values.
UPDATE scoring_config
SET
  base_failure_threshold_magnitude      = 1.500,
  catastrophic_margin_multiplier        = 1.500,
  at_risk_confidence_floor              = 0.350,
  provisional_confidence_threshold      = 0.400,
  confidence_floor                      = 0.500,
  minimum_safe_classification_confidence = 0.550
WHERE version = 2;
