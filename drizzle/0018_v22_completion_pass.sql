-- AiQ v2.2 Completion Pass — Schema Migration
-- Covers:
--   WS2.2  : anti_gaming_thresholds table (per-role configurable thresholds)
--   WS4.1  : ail_persona_profiles.softened_label column (persona label softening)
--   WS5.1  : assessment_answer_telemetry — add timeToFirstInteractionMs, timeToSubmitMs,
--             confidenceRatingRaw, deviceType, browserType, screenWidthPx
--   WS5.2  : assessment_sessions.session_metadata_json already exists (JSON blob);
--             add normGroupVersion, localeCode, deviceType columns to assessment_sessions
--   WS1.3  : JSON index on assessment_answers.contribution_breakdown_json (MySQL 8 functional index)

-- ─── WS2.2: Anti-Gaming Thresholds Table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS anti_gaming_thresholds (
  id                         VARCHAR(36)     NOT NULL PRIMARY KEY,
  role_key                   VARCHAR(100)    NOT NULL,
  tenant_id                  VARCHAR(36),
  always_safe_choice_rate    DECIMAL(5,4)    NOT NULL DEFAULT 0.7500,
  always_escalate_rate       DECIMAL(5,4)    NOT NULL DEFAULT 0.7000,
  always_cautious_rate       DECIMAL(5,4)    NOT NULL DEFAULT 0.6000,
  option_position_bias_rate  DECIMAL(5,4)    NOT NULL DEFAULT 0.7000,
  strong_answer_max_rate     DECIMAL(5,4)    NOT NULL DEFAULT 0.1000,
  outcome_conditional_rate   DECIMAL(5,4)    NOT NULL DEFAULT 0.8000,
  is_default                 BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at                 BIGINT          NOT NULL DEFAULT 0,
  updated_at                 BIGINT          NOT NULL DEFAULT 0,
  UNIQUE KEY uq_agt_role_tenant (role_key, tenant_id),
  INDEX idx_agt_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed the default (generalist) threshold row
INSERT IGNORE INTO anti_gaming_thresholds
  (id, role_key, tenant_id, always_safe_choice_rate, always_escalate_rate,
   always_cautious_rate, option_position_bias_rate, strong_answer_max_rate,
   outcome_conditional_rate, is_default)
VALUES
  (UUID(), 'default', NULL, 0.7500, 0.7000, 0.6000, 0.7000, 0.1000, 0.8000, TRUE);

-- ─── WS4.1: Persona Label Softening ──────────────────────────────────────────
-- Add softened_label column to ail_persona_profiles
ALTER TABLE ail_persona_profiles
  ADD COLUMN IF NOT EXISTS softened_label VARCHAR(120) NULL
    COMMENT 'WS4.1: Participant-facing softened label for the primary_persona classification';

-- Seed softened labels for existing rows (safe UPDATE — no data loss)
UPDATE ail_persona_profiles SET softened_label = CASE primary_persona
  WHEN 'strong_validator'                  THEN 'Structured Validator'
  WHEN 'overconfident_decision_maker'      THEN 'Decisive Practitioner'
  WHEN 'risk_averse_escalator'             THEN 'Cautious Escalator'
  WHEN 'passive_deferrer'                  THEN 'Collaborative Deferrer'
  WHEN 'governance_anchor_under_pressure'  THEN 'Governance-Anchored'
  WHEN 'unclassified'                      THEN 'Profile Building'
  ELSE primary_persona
END
WHERE softened_label IS NULL;

-- ─── WS5.1: Telemetry Column Additions ───────────────────────────────────────
ALTER TABLE assessment_answer_telemetry
  ADD COLUMN IF NOT EXISTS time_to_first_interaction_ms  INT          NULL
    COMMENT 'WS5.1: Milliseconds from item render to first user interaction',
  ADD COLUMN IF NOT EXISTS time_to_submit_ms             INT          NULL
    COMMENT 'WS5.1: Milliseconds from item render to answer submission',
  ADD COLUMN IF NOT EXISTS confidence_rating_raw         DECIMAL(3,2) NULL
    COMMENT 'WS5.1: Participant self-reported confidence (0.00–1.00)',
  ADD COLUMN IF NOT EXISTS device_type                   VARCHAR(20)  NULL
    COMMENT 'WS5.1: desktop | tablet | mobile',
  ADD COLUMN IF NOT EXISTS browser_type                  VARCHAR(40)  NULL
    COMMENT 'WS5.1: Normalised browser identifier',
  ADD COLUMN IF NOT EXISTS screen_width_px               SMALLINT     NULL
    COMMENT 'WS5.1: Viewport width in pixels at time of answer';

-- ─── WS5.2: Session Metadata Column Additions ────────────────────────────────
ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS norm_group_version  VARCHAR(20)  NULL
    COMMENT 'WS5.2: Normative group version used for percentile scoring',
  ADD COLUMN IF NOT EXISTS locale_code         VARCHAR(10)  NULL DEFAULT 'en-GB'
    COMMENT 'WS5.2: BCP-47 locale code for the session (default en-GB)',
  ADD COLUMN IF NOT EXISTS device_type         VARCHAR(20)  NULL
    COMMENT 'WS5.2: desktop | tablet | mobile (captured at session start)',
  ADD COLUMN IF NOT EXISTS scoring_config_version_at_start INT NULL
    COMMENT 'WS5.2: Scoring config version active when the session was started (pins in-flight sessions)';

-- ─── WS1.3: Functional index on contribution_breakdown_json ──────────────────
-- MySQL 8.0 supports functional indexes on JSON columns.
-- This index accelerates back-office queries that filter by capabilityKey
-- within the contribution_breakdown_json column.
-- The index is created as a generated column + index for broader MySQL 5.7 compatibility.
ALTER TABLE assessment_answers
  ADD COLUMN IF NOT EXISTS contribution_capability_key VARCHAR(50)
    GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(contribution_breakdown_json, '$.capabilityKey')))
    VIRTUAL
    COMMENT 'WS1.3: Virtual column for GIN-equivalent index on contribution_breakdown_json.capabilityKey';

CREATE INDEX IF NOT EXISTS idx_aa_contribution_cap
  ON assessment_answers (contribution_capability_key);

