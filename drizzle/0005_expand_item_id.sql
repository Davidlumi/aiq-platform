-- Migration: Expand assessment_answers.item_id to VARCHAR(100)
-- Reason: Content scenario IDs are prefixed with 'cs-' making them 39+ chars (exceeds original VARCHAR(36))
-- Applied manually: 2026-04-21

ALTER TABLE `assessment_answers` MODIFY COLUMN `item_id` VARCHAR(100) NOT NULL;
