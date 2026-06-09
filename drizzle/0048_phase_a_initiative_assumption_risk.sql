-- Phase A: initiative, assumption, initiative_risk tables
-- Spec: AiQ_PhaseA_Schema_Spec_v2_LOCKED.md, locked 9 June 2026
-- Migration: additive only — no existing tables modified

-- §1 initiative
CREATE TABLE IF NOT EXISTS `initiative` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `library_initiative_id` varchar(36),
  `source_slug` varchar(100),
  `title` varchar(300) NOT NULL,
  `description` text,
  `basis` enum('user_authored','library_selected','ai_drafted') NOT NULL DEFAULT 'library_selected',
  `ai_drafted` boolean NOT NULL DEFAULT false,
  `owned_at` timestamp,
  `priority_rank` int,
  `domain` varchar(60),
  `status` enum('draft','committed','superseded','dropped') NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_initiative_tenant` (`tenant_id`),
  INDEX `idx_initiative_library` (`library_initiative_id`)
);

-- §2 assumption
CREATE TABLE IF NOT EXISTS `assumption` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `initiative_id` varchar(36) NOT NULL,
  `type` enum('cost','capability','market','pressure','precondition') NOT NULL,
  `statement` text NOT NULL,
  `basis` enum('self_declared','assessed','benchmark_default','calculated','ai_drafted','user_confirmed') NOT NULL,
  `source_ref` varchar(300),
  `as_of_date` timestamp,
  `strength` enum('strong','moderate','weak','unverified') NOT NULL DEFAULT 'unverified',
  `confidence` enum('high','medium','low') NOT NULL DEFAULT 'medium',
  `owned_at` timestamp,
  `ai_drafted` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_assumption_tenant` (`tenant_id`),
  INDEX `idx_assumption_initiative` (`initiative_id`),
  INDEX `idx_assumption_type` (`type`)
);

-- §3 initiative_risk
CREATE TABLE IF NOT EXISTS `initiative_risk` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `initiative_id` varchar(36),
  `title` varchar(300) NOT NULL,
  `description` text,
  `likelihood` enum('low','medium','high'),
  `impact` enum('low','medium','high'),
  `mitigation` text,
  `status` enum('accepted','edited','dismissed','open','mitigated') NOT NULL DEFAULT 'open',
  `ai_suggested` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_initiative_risk_tenant` (`tenant_id`),
  INDEX `idx_initiative_risk_initiative` (`initiative_id`)
);
