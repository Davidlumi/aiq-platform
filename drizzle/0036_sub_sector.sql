-- Migration: add sub_sector column to ail_org_context and companies tables
-- Also expand the sector enum in ail_org_context to include energy_utilities and media_entertainment

ALTER TABLE `ail_org_context`
  MODIFY COLUMN `sector` enum(
    'financial_services','healthcare','technology','retail',
    'public_sector','professional_services','manufacturing','other',
    'energy_utilities','media_entertainment'
  ) NOT NULL DEFAULT 'other',
  ADD COLUMN `sub_sector` varchar(100) NULL AFTER `sector`;

ALTER TABLE `companies`
  ADD COLUMN `sub_sector` varchar(100) NULL AFTER `sector`;
