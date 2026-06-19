-- Migration: Add processed_webhook_events table for Stripe webhook deduplication
-- This table records every Stripe event ID that has been successfully processed.
-- A duplicate insert (PRIMARY KEY conflict) short-circuits the handler on replay.

CREATE TABLE IF NOT EXISTS `processed_webhook_events` (
  `event_id` varchar(255) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `processed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`)
);
