-- Phase D: signal, signal_match tables + external_signal trigger type
-- Schema spec: PhaseD_DeduplicatedSpec_Locked.md, locked 9 June 2026
-- Migration: additive only — no existing tables modified except strategy_refresh_suggestions enum extension

-- Extend strategy_refresh_suggestions.trigger_type enum to include external_signal
ALTER TABLE `strategy_refresh_suggestions`
  MODIFY COLUMN `trigger_type` enum(
    'capability_progression',
    'library_version_update',
    'milestone_completion',
    'manual',
    'external_signal'
  ) NOT NULL;

-- D1: signal — an external development that may threaten named assumptions.
-- founderApproved gate: no client sees a signal with founder_approved = 0.
CREATE TABLE IF NOT EXISTS `signal` (
  `id` varchar(36) NOT NULL,
  `title` varchar(500) NOT NULL,
  `summary` text NOT NULL,
  `source_url` text,
  `source_label` varchar(300),
  `as_of_date` varchar(10),                                         -- ISO date YYYY-MM-DD
  `category` enum(
    'regulatory',
    'market',
    'research',
    'technology',
    'geopolitical',
    'other'
  ) NOT NULL DEFAULT 'other',
  `founder_approved` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_signal_category` (`category`),
  INDEX `idx_signal_approved` (`founder_approved`)
);

-- D2: signal_match — fired matches only (absence of row = no impact).
-- Dedup is application-level (not UNIQUE constraint) to support re-fire after assumption text change.
-- See: PhaseD_DeduplicatedSpec_Locked.md §dedup-mechanism for the three-case logic.
CREATE TABLE IF NOT EXISTS `signal_match` (
  `id` varchar(36) NOT NULL,
  `signal_id` varchar(36) NOT NULL,
  `assumption_id` varchar(36) NOT NULL,
  `initiative_id` varchar(36) NOT NULL,                             -- denormalised for query convenience
  `tenant_id` varchar(36) NOT NULL,
  `match_rationale` text NOT NULL,                                  -- named assumption + why this signal affects it
  `assumption_text_at_match` text NOT NULL,                         -- immutable snapshot of assumption.statement at match time
  `cited_source_url` text,                                          -- specific URL cited in the rationale
  `confidence_level` enum('high', 'medium', 'low') NOT NULL,
  `refresh_suggestion_id` varchar(36),                              -- FK → strategy_refresh_suggestions.id (nullable)
  `dismissed_at` timestamp,                                         -- NULL = active; NOT NULL = dismissed
  `dismiss_reason` text,                                            -- written at dismiss time; prevents same class being re-raised
  `dismissed_by_user_id` varchar(36),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- Plain index (not UNIQUE) — dedup is application-level to support re-fire after assumption text change
  INDEX `idx_sm_signal_assumption_tenant` (`signal_id`, `assumption_id`, `tenant_id`),
  INDEX `idx_sm_tenant_initiative` (`tenant_id`, `initiative_id`),
  INDEX `idx_sm_assumption` (`assumption_id`),
  INDEX `idx_sm_signal` (`signal_id`),
  INDEX `idx_sm_refresh_suggestion` (`refresh_suggestion_id`),
  INDEX `idx_sm_active` (`tenant_id`, `dismissed_at`)               -- fast query for active (non-dismissed) matches
);
