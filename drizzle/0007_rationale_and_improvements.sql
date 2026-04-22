-- Migration: Add rationale_text to assessment_item_options
-- Reason: T2-5 Rationale Reveal — store LLM-generated rationale for each option
-- Applied: 2026-04-22
ALTER TABLE `assessment_item_options` ADD COLUMN `rationale_text` text;
