-- Migration: add selected_initiatives_json to ail_org_context
ALTER TABLE `ail_org_context`
  ADD COLUMN `selected_initiatives_json` TEXT NULL COMMENT 'JSON: string[] of selected initiative IDs';
