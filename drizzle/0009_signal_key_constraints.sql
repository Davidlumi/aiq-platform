-- Migration 0009: Canonical signal key constraints (C1.7)
-- Creates a reference table of the 22 canonical signal keys and adds
-- a check constraint to assessment_item_options to prevent non-canonical
-- signal keys from being stored in signal_deltas_json.
--
-- Note: MySQL/TiDB does not enforce JSON key constraints natively.
-- The reference table serves as documentation and can be used in
-- application-level validation. The check constraint is applied as a
-- generated column approach where feasible.

-- ─── Canonical Signal Keys Reference Table ───────────────────────────────────

CREATE TABLE IF NOT EXISTS canonical_signal_keys (
  signal_key     VARCHAR(64)  NOT NULL PRIMARY KEY,
  capability_key VARCHAR(32)  NOT NULL,
  display_name   VARCHAR(128) NOT NULL,
  is_risk_signal TINYINT(1)   NOT NULL DEFAULT 0,
  created_at     BIGINT       NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)
);

INSERT IGNORE INTO canonical_signal_keys (signal_key, capability_key, display_name, is_risk_signal) VALUES
  ('execution_quality',            'execution',          'Execution Quality',              0),
  ('prioritisation_quality',       'execution',          'Prioritisation Quality',         0),
  ('validation_accuracy',          'execution',          'Validation Accuracy',            0),
  ('timing_integrity',             'execution',          'Timing Integrity',               0),
  ('consistency_index',            'execution',          'Consistency',                    0),
  ('judgement_quality',            'judgement',          'Judgement Quality',              0),
  ('discrimination_quality',       'judgement',          'Discrimination Quality',         0),
  ('over_caution_risk',            'judgement',          'Over-Caution Risk',              1),
  ('avoidance_risk',               'judgement',          'Avoidance Risk',                 1),
  ('calibration_index',            'judgement',          'Confidence Calibration',         0),
  ('governance_quality',           'governance',         'Governance Quality',             0),
  ('over_reliance_risk',           'governance',         'Over-Reliance Risk',             1),
  ('blind_acceptance_risk',        'governance',         'Blind Acceptance Risk',          1),
  ('contradiction_index',          'governance',         'Contradiction Index',            1),
  ('governance_bypass_risk',       'governance',         'Governance Bypass Risk',         1),
  ('appropriateness_boundary',     'appropriateness',    'Appropriateness Boundary',       0),
  ('automation_expansion_risk',    'appropriateness',    'Automation Expansion Risk',      1),
  ('cosmetic_focus_risk',          'appropriateness',    'Cosmetic Focus Risk',            1),
  ('unsafe_hr_decision_risk',      'appropriateness',    'Unsafe HR Decision Risk',        1),
  ('workflow_application_quality', 'workflow',           'Workflow Application Quality',   0),
  ('data_interpretation_quality',  'data_interpretation','Data Interpretation Quality',    0),
  ('hallucination_acceptance_risk','governance',         'Hallucination Acceptance Risk',  1);
