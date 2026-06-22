-- Migration: 0056_commercial_layer
-- Adds team subscriptions, journey ladder, XP ledger, and data deletion tables.

CREATE TABLE IF NOT EXISTS `team_subscriptions` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `billing_admin_user_id` varchar(36) NOT NULL,
  `stripe_customer_id` varchar(255),
  `stripe_subscription_id` varchar(255),
  `stripe_subscription_status` varchar(50),
  `stripe_current_period_end` timestamp,
  `stripe_cancel_at_period_end` boolean DEFAULT false,
  `seat_count` int NOT NULL DEFAULT 3,
  `price_band_key` varchar(30),
  `per_seat_pence_pm` int NOT NULL DEFAULT 4200,
  `is_active` boolean NOT NULL DEFAULT false,
  `paid_access_grace_until` timestamp,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_subscriptions_tenant_id_unique` (`tenant_id`)
);

CREATE TABLE IF NOT EXISTS `team_seat_members` (
  `id` varchar(36) NOT NULL,
  `team_subscription_id` varchar(36) NOT NULL,
  `user_id` varchar(36),
  `invite_email` varchar(320) NOT NULL,
  `invite_token` varchar(255),
  `invite_expires_at` timestamp,
  `status` enum('invited','active','removed') NOT NULL DEFAULT 'invited',
  `added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `removed_at` timestamp,
  PRIMARY KEY (`id`),
  KEY `idx_tsm_team_user` (`team_subscription_id`, `user_id`),
  KEY `idx_tsm_invite_email` (`invite_email`)
);

CREATE TABLE IF NOT EXISTS `user_billing_roles` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `team_subscription_id` varchar(36) NOT NULL,
  `granted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_billing_roles_user_id_unique` (`user_id`)
);

CREATE TABLE IF NOT EXISTS `journey_progress` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `current_level` int NOT NULL DEFAULT 1,
  `total_xp` int NOT NULL DEFAULT 0,
  `level_start_xp` int NOT NULL DEFAULT 0,
  `domains_engaged_json` json,
  `last_level_up_at` timestamp,
  `prev_level` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `journey_progress_user_id_unique` (`user_id`)
);

CREATE TABLE IF NOT EXISTS `xp_ledger` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `xp_amount` int NOT NULL,
  `ref_id` varchar(36),
  `meta_json` json,
  `idempotency_key` varchar(255),
  `awarded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `xp_ledger_idempotency_key_unique` (`idempotency_key`),
  KEY `idx_xp_user` (`user_id`),
  KEY `idx_xp_event_type` (`event_type`)
);

CREATE TABLE IF NOT EXISTS `journey_milestones` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `milestone_type` varchar(50) NOT NULL,
  `label` varchar(200) NOT NULL,
  `ref_id` varchar(36),
  `meta_json` json,
  `seen_at` timestamp,
  `earned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_jm_user` (`user_id`),
  KEY `idx_jm_unseen` (`user_id`, `seen_at`)
);

CREATE TABLE IF NOT EXISTS `data_deletion_requests` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','processing','completed') NOT NULL DEFAULT 'pending',
  `processed_at` timestamp,
  `reason` text,
  PRIMARY KEY (`id`)
);
