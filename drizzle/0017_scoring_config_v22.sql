-- WS1.1 + WS1.2: Add v2.2 scoring formula columns to scoring_config
ALTER TABLE scoring_config
  ADD COLUMN IF NOT EXISTS contribution_cap DECIMAL(6,2) NOT NULL DEFAULT 8.00,
  ADD COLUMN IF NOT EXISTS contribution_multiplier DECIMAL(6,2) NOT NULL DEFAULT 6.25,
  ADD COLUMN IF NOT EXISTS blocking_failure_min_items INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS downgrade_failure_min_items INT NOT NULL DEFAULT 1;

-- Seed v2.2 scoring_config row (inactive by default — activate via backoffice)
INSERT INTO scoring_config
  (version, capability_score_intercept, capability_score_multiplier,
   contribution_cap, contribution_multiplier,
   blocking_failure_min_items, downgrade_failure_min_items,
   is_active, calibration_source, calibration_sample_size, notes)
VALUES
  (2, 50.00, 50.00, 8.00, 6.25, 2, 1, 0, 'synthetic_default', 4,
   'v2.2 sum+clip formula: score = 50 + clip(Σ, -8, +8) × 6.25. Calibration anchors: A(6×strong,med,d2)→100, B(2s+2a+2w,med,d2)→69, C(4f+2cf,high,d3)→0, D(monotonicity)→✅. Replaces mean-based formula from v2.1. Activate via backoffice.activateScoringConfig.')
ON DUPLICATE KEY UPDATE notes = VALUES(notes);
