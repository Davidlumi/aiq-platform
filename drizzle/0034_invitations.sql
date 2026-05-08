CREATE TABLE `invitations` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `email` varchar(320) NOT NULL,
  `token` varchar(64) NOT NULL,
  `role_key` varchar(50) NOT NULL DEFAULT 'learner',
  `invited_by` varchar(36) NOT NULL,
  `status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
  `expires_at` timestamp NOT NULL,
  `accepted_at` timestamp,
  `created_user_id` varchar(36),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invitations_token_unique` (`token`),
  KEY `idx_invitations_token` (`token`),
  KEY `idx_invitations_tenant_email` (`tenant_id`, `email`)
);
