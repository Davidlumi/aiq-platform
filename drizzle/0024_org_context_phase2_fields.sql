-- Phase 2: Add missing org context fields for configuration & compliance
ALTER TABLE `ail_org_context`
  ADD COLUMN `ai_tools_in_use_json` TEXT NULL COMMENT 'JSON array of specific AI tools deployed (e.g. ["Copilot","ChatGPT"])',
  ADD COLUMN `uk_regulatory_frameworks_json` TEXT NULL COMMENT 'JSON array of applicable UK regulatory frameworks (e.g. ["ICO","FCA","NHS"])',
  ADD COLUMN `ai_policy_status` ENUM('none','draft','approved','embedded') NOT NULL DEFAULT 'none' COMMENT 'Current status of the organisation AI usage policy',
  ADD COLUMN `quarterly_review_enabled` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether quarterly capability re-verification is enabled',
  ADD COLUMN `revalidation_cycle_months` INT NOT NULL DEFAULT 12 COMMENT 'Number of months between mandatory revalidations',
  ADD COLUMN `small_hr_function_mode` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Simplified scoring mode for HR functions with <50 employees',
  ADD COLUMN `company_ai_context_narrative` TEXT NULL COMMENT 'Free-text description of how AI is used in the organisation, used for scenario personalisation';
