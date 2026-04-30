-- Migration: Add AI People Strategy Builder fields to ail_org_context
-- Phase 4: Business & People Ambition Strategy Builder

ALTER TABLE `ail_org_context`
  ADD COLUMN IF NOT EXISTS `business_ambition_level` int DEFAULT NULL COMMENT '1-5: how aggressively org adopts AI in business',
  ADD COLUMN IF NOT EXISTS `people_ambition_level` int DEFAULT NULL COMMENT '1-5: how much HR people lead vs follow AI adoption',
  ADD COLUMN IF NOT EXISTS `domain_targets_json` text DEFAULT NULL COMMENT 'JSON: { ai_interaction: 65, ... } stored as 0-100 raw',
  ADD COLUMN IF NOT EXISTS `strategy_narrative` text DEFAULT NULL COMMENT 'CPO free-text strategic intent',
  ADD COLUMN IF NOT EXISTS `strategy_saved_at` timestamp DEFAULT NULL COMMENT 'when strategy was last saved';
