-- D1: Move MINIMUM_EVIDENCE constants from compile-time to scoring_config table
-- These were previously hard-coded in sessionController.ts as MINIMUM_EVIDENCE.
-- They are now configurable per scoring config version, defaulting to the original values.

ALTER TABLE scoring_config
  ADD COLUMN evidence_total_items INT NOT NULL DEFAULT 20
    COMMENT 'D1: Minimum total answers required for evidence sufficiency (was MINIMUM_EVIDENCE.totalItems)',
  ADD COLUMN evidence_signals_per_capability INT NOT NULL DEFAULT 3
    COMMENT 'D1: Minimum signals per capability for saturation (was MINIMUM_EVIDENCE.signalsPerCapability)',
  ADD COLUMN evidence_distinct_interaction_types INT NOT NULL DEFAULT 5
    COMMENT 'D1: Minimum distinct interaction types required (was MINIMUM_EVIDENCE.distinctInteractionTypes)',
  ADD COLUMN evidence_high_risk_proportion DECIMAL(4,3) NOT NULL DEFAULT 0.250
    COMMENT 'D1: Minimum proportion of high-risk items required (was MINIMUM_EVIDENCE.highRiskProportion)',
  ADD COLUMN evidence_target_items INT NOT NULL DEFAULT 49
    COMMENT 'D1: Target item count per session (was MINIMUM_EVIDENCE.targetItems)';

-- Backfill the existing v2.2 row with explicit values matching the original constants
UPDATE scoring_config SET
  evidence_total_items = 20,
  evidence_signals_per_capability = 3,
  evidence_distinct_interaction_types = 5,
  evidence_high_risk_proportion = 0.250,
  evidence_target_items = 49
WHERE version = 2;
