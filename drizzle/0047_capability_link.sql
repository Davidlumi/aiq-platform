-- ─── Capability Link Migration ────────────────────────────────────────────────
-- Adds:
--   1. reward_team_capability_snapshots  (new table)
--   2. reward_capability_development_plans  (new table)
--   3. source, assessment_provenance, assessment_coverage columns
--      on reward_capability_dimensions  (ALTER TABLE)

-- 1. Team capability snapshots
CREATE TABLE IF NOT EXISTS `reward_team_capability_snapshots` (
  `id`                VARCHAR(36)      NOT NULL,
  `tenant_id`         VARCHAR(36)      NOT NULL,
  `team_size`         INT              NOT NULL DEFAULT 0,
  `assessed_count`    INT              NOT NULL DEFAULT 0,
  `coverage_fraction` DECIMAL(5,4)     NOT NULL DEFAULT 0,
  `domain_means_json` JSON             NOT NULL,
  `domain_counts_json` JSON            NOT NULL,
  `derived_levels_json` JSON           NOT NULL,
  `provenance_json`   JSON             NOT NULL,
  `computed_at`       BIGINT           NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_rtcs_tenant` (`tenant_id`),
  INDEX `idx_rtcs_tenant_computed` (`tenant_id`, `computed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Reward capability development plans
CREATE TABLE IF NOT EXISTS `reward_capability_development_plans` (
  `id`                VARCHAR(36)      NOT NULL,
  `tenant_id`         VARCHAR(36)      NOT NULL,
  `dimension`         VARCHAR(64)      NOT NULL,
  `gap_status`        VARCHAR(32)      NOT NULL,
  `required_level`    VARCHAR(16)      NOT NULL,
  `current_level`     VARCHAR(16)      NOT NULL,
  `target_domains_json` JSON           NOT NULL,
  `people_count`      INT              NOT NULL DEFAULT 0,
  `estimated_months`  INT,
  `pathway_summary`   TEXT,
  `state`             ENUM('active','superseded') NOT NULL DEFAULT 'active',
  `generated_at`      BIGINT           NOT NULL,
  `snapshot_id`       VARCHAR(36),
  PRIMARY KEY (`id`),
  INDEX `idx_rcdp_tenant_dim` (`tenant_id`, `dimension`),
  INDEX `idx_rcdp_tenant_state` (`tenant_id`, `state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Add source, provenance, and coverage to reward_capability_dimensions
ALTER TABLE `reward_capability_dimensions`
  ADD COLUMN IF NOT EXISTS `source` VARCHAR(32) NOT NULL DEFAULT 'prework'
    COMMENT 'prework | manual | assessments',
  ADD COLUMN IF NOT EXISTS `assessment_provenance` TEXT
    COMMENT 'Human-readable provenance string when source=assessments',
  ADD COLUMN IF NOT EXISTS `assessment_coverage` DECIMAL(5,4)
    COMMENT '0.0-1.0 fraction of team assessed when source=assessments';
