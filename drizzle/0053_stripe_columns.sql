-- Migration: add Stripe subscription columns to tenants table
-- Used for self-serve commerce (Stream 2.2–2.4)
ALTER TABLE `tenants`
  ADD COLUMN `stripe_customer_id` VARCHAR(255) NULL,
  ADD COLUMN `stripe_subscription_id` VARCHAR(255) NULL,
  ADD COLUMN `stripe_subscription_status` VARCHAR(50) NULL,
  ADD COLUMN `stripe_price_key` VARCHAR(50) NULL,
  ADD COLUMN `stripe_current_period_end` TIMESTAMP NULL,
  ADD COLUMN `stripe_cancel_at_period_end` BOOLEAN DEFAULT FALSE,
  ADD COLUMN `paid_access_grace_until` TIMESTAMP NULL;
