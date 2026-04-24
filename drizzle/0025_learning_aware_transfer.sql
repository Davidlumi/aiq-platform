-- Migration: Learning-aware reassessment mode and completion state tracking
-- Per AiQ Adaptive Learning v1.0 §5.1, §5.4, §6

-- Add learning-aware mode fields to assessment_sessions
ALTER TABLE `assessment_sessions`
  ADD COLUMN `learning_aware_mode` boolean NOT NULL DEFAULT false,
  ADD COLUMN `learning_context_json` json,
  ADD COLUMN `transfer_finding_json` json;

-- Add completion state and no-transfer tracking to adaptive_plan_items
ALTER TABLE `adaptive_plan_items`
  ADD COLUMN `completion_state` enum('not_started','opened','partial','completed','completed_with_engagement') NOT NULL DEFAULT 'not_started',
  ADD COLUMN `no_transfer_count` int NOT NULL DEFAULT 0,
  ADD COLUMN `alternative_modality_prescribed` boolean NOT NULL DEFAULT false,
  ADD COLUMN `honest_disclosure_sent` boolean NOT NULL DEFAULT false,
  ADD COLUMN `time_spent_seconds` int NOT NULL DEFAULT 0,
  ADD COLUMN `reflection_text_captured` boolean NOT NULL DEFAULT false;
