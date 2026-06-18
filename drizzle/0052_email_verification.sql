-- Migration: add email verification columns to users table
-- Used for self-serve sign-up (Stream 2.1)
ALTER TABLE `users`
  ADD COLUMN `email_verification_token` VARCHAR(255) NULL,
  ADD COLUMN `email_verified_at` TIMESTAMP NULL;
