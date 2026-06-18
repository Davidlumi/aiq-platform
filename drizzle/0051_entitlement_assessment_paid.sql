-- Migration: Add entitlement_assessment_paid column to tenants table
-- Phase 1 Skills Checker Launch — introduces free/paid tier split.
-- entitlementAssessment = true + entitlementAssessmentPaid = false → free tier
-- entitlementAssessment = true + entitlementAssessmentPaid = true  → paid tier
-- Default is false; flipped by Stripe webhook on verified payment only.

ALTER TABLE `tenants`
  ADD COLUMN `entitlement_assessment_paid` boolean NOT NULL DEFAULT false
  AFTER `entitlement_assessment`;
