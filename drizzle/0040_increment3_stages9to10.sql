-- Increment 3: Stage 9 (Review session) and Stage 10 (Board report) columns
ALTER TABLE `ail_org_context`
  ADD COLUMN `review_held_at` timestamp NULL,
  ADD COLUMN `review_session_notes` text NULL,
  ADD COLUMN `review_tensions_json` text NULL,
  ADD COLUMN `stage9_confirmed_at` timestamp NULL,
  ADD COLUMN `stage10_confirmed_at` timestamp NULL,
  ADD COLUMN `board_report_sections_json` text NULL,
  ADD COLUMN `board_report_include_notes` boolean NOT NULL DEFAULT false;
