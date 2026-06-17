-- Migration: Drop tenants.mode column
-- Mode is now derived from entitlements (strategyReward && !strategyCompany)
-- All server-side and client-side readers have been migrated to use entitlements directly.

ALTER TABLE `tenants` DROP COLUMN `mode`;
