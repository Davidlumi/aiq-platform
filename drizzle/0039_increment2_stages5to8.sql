-- Increment 2: Stages 5-8 columns on ail_org_context
ALTER TABLE `ail_org_context`
  ADD COLUMN `stage5_confirmed_at` timestamp NULL,
  ADD COLUMN `stage6_confirmed_at` timestamp NULL,
  ADD COLUMN `stage7_confirmed_at` timestamp NULL,
  ADD COLUMN `stage8_confirmed_at` timestamp NULL,
  ADD COLUMN `business_case_narrative` text,
  ADD COLUMN `stage8_capability_json` text;
