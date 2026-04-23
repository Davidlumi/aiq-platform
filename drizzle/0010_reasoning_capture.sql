-- Migration 0010: Reasoning capture (C2.1)
-- Adds reasoning_text column to assessment_answers to capture optional
-- participant explanations of their thinking before submitting an answer.
-- This is distinct from free_text (used for open-ended item types).
-- reasoning_text is always optional and shown for judgement/governance/critique items.

ALTER TABLE assessment_answers
  ADD COLUMN reasoning_text TEXT NULL
  AFTER free_text;

-- Also apply the canonical signal keys migration (0009) if not already applied
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
