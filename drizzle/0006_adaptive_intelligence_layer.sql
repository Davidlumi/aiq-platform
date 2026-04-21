-- ============================================================
-- AIL Migration: Adaptive Intelligence Layer
-- 11 new tables for cross-simulation memory, persona,
-- organisation context, narrative engine, and difficulty engine
-- ============================================================

-- 1. User Intelligence Profiles (central UIP)
CREATE TABLE IF NOT EXISTS ail_user_intelligence_profiles (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  tenant_id VARCHAR(36) NOT NULL,
  total_simulations_completed INT NOT NULL DEFAULT 0,
  total_assessments_completed INT NOT NULL DEFAULT 0,
  platform_engagement_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  next_simulation_recommendation_json TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ail_uip_user (user_id),
  INDEX idx_ail_uip_tenant (tenant_id)
);

-- 2. Signal Ledger (cross-simulation signal accumulation)
CREATE TABLE IF NOT EXISTS ail_signal_ledger (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  signal_name VARCHAR(100) NOT NULL,
  total_score DECIMAL(8,3) NOT NULL DEFAULT 0,
  observation_count INT NOT NULL DEFAULT 0,
  average_score DECIMAL(8,3) NOT NULL DEFAULT 0,
  trend ENUM('improving','stable','declining') NOT NULL DEFAULT 'stable',
  last_observed_at DATETIME,
  simulations_observed_json TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_signal (user_id, signal_name),
  INDEX idx_ail_sl_user (user_id),
  INDEX idx_ail_sl_tenant (tenant_id)
);

-- 3. Failure Mode Registry (persistent weakness tracking)
CREATE TABLE IF NOT EXISTS ail_failure_mode_registry (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  failure_mode VARCHAR(100) NOT NULL,
  occurrence_count INT NOT NULL DEFAULT 1,
  severity ENUM('critical','moderate','minor') NOT NULL DEFAULT 'minor',
  simulations_triggered_json TEXT,
  last_occurrence_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retest_scheduled BOOLEAN NOT NULL DEFAULT FALSE,
  retest_simulation_id VARCHAR(36),
  pattern_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_failure_mode (user_id, failure_mode),
  INDEX idx_ail_fmr_user (user_id),
  INDEX idx_ail_fmr_tenant (tenant_id)
);

-- 4. Retest Queue (scheduled contextual retests)
CREATE TABLE IF NOT EXISTS ail_retest_queue (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  target_failure_mode VARCHAR(100) NOT NULL,
  scheduled_simulation_id VARCHAR(36),
  context_variation TEXT,
  priority ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
  scheduled_after_simulation_count INT NOT NULL DEFAULT 1,
  status ENUM('pending','delivered','passed','failed') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ail_rq_user (user_id),
  INDEX idx_ail_rq_status (status)
);

-- 5. Persona Profiles (dynamic 4-dimension classification)
CREATE TABLE IF NOT EXISTS ail_persona_profiles (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  tenant_id VARCHAR(36) NOT NULL,
  -- Dimension scores 0-10
  validation_orientation DECIMAL(4,2) NOT NULL DEFAULT 5.0,
  governance_orientation DECIMAL(4,2) NOT NULL DEFAULT 5.0,
  risk_orientation DECIMAL(4,2) NOT NULL DEFAULT 5.0,
  communication_orientation DECIMAL(4,2) NOT NULL DEFAULT 5.0,
  -- Composite classification
  primary_persona ENUM(
    'strong_validator',
    'overconfident_decision_maker',
    'risk_averse_escalator',
    'passive_deferrer',
    'governance_anchor_under_pressure',
    'unclassified'
  ) NOT NULL DEFAULT 'unclassified',
  persona_confidence DECIMAL(4,3) NOT NULL DEFAULT 0.0,
  -- Pressure sensitivity (JSON: {ceo, cfo, time, legal} → dimension deltas)
  pressure_sensitivity_json TEXT,
  -- Pattern flags
  blind_acceptance_pattern BOOLEAN NOT NULL DEFAULT FALSE,
  governance_bypass_pattern BOOLEAN NOT NULL DEFAULT FALSE,
  over_cautious_pattern BOOLEAN NOT NULL DEFAULT FALSE,
  contradiction_rigidity BOOLEAN NOT NULL DEFAULT FALSE,
  communication_weakness BOOLEAN NOT NULL DEFAULT FALSE,
  high_confidence_overconfidence BOOLEAN NOT NULL DEFAULT FALSE,
  -- LLM-generated narrative
  narrative_summary TEXT,
  narrative_updated_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ail_pp_user (user_id),
  INDEX idx_ail_pp_tenant (tenant_id),
  INDEX idx_ail_pp_persona (primary_persona)
);

-- 6. Organisation Context (AIL-level org configuration)
CREATE TABLE IF NOT EXISTS ail_org_context (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL UNIQUE,
  -- Sector and regulatory
  sector ENUM(
    'financial_services','healthcare','technology','retail',
    'public_sector','professional_services','manufacturing','other'
  ) NOT NULL DEFAULT 'other',
  primary_regulator VARCHAR(100),
  additional_regulators_json TEXT,
  reporting_requirements_json TEXT,
  recent_regulatory_actions_json TEXT,
  -- Size and structure
  headcount INT,
  structure ENUM('centralised','decentralised','matrix','holding_company') DEFAULT 'centralised',
  geographies_json TEXT,
  -- Strategy
  strategic_priorities_json TEXT,
  current_challenges_json TEXT,
  recent_events_json TEXT,
  -- Risk appetite
  risk_appetite_overall ENUM('risk_averse','moderate','risk_tolerant') DEFAULT 'moderate',
  risk_appetite_legal ENUM('risk_averse','moderate','risk_tolerant') DEFAULT 'risk_averse',
  risk_appetite_reputational ENUM('risk_averse','moderate','risk_tolerant') DEFAULT 'moderate',
  risk_appetite_innovation ENUM('risk_averse','moderate','risk_tolerant') DEFAULT 'moderate',
  -- AI maturity
  ai_maturity_level ENUM('early_adopter','scaling','mature','cautious') DEFAULT 'early_adopter',
  current_ai_tools_json TEXT,
  ai_governance_framework BOOLEAN DEFAULT FALSE,
  ai_ethics_committee BOOLEAN DEFAULT FALSE,
  recent_ai_incidents_json TEXT,
  -- Culture
  hierarchy_level ENUM('flat','moderate','hierarchical') DEFAULT 'moderate',
  decision_making_style ENUM('consensus','top_down','data_driven') DEFAULT 'consensus',
  hr_influence ENUM('strategic_partner','operational','administrative') DEFAULT 'operational',
  ceo_style ENUM('collaborative','directive','data_driven','charismatic') DEFAULT 'collaborative',
  cfo_style ENUM('risk_averse','growth_focused','cost_focused') DEFAULT 'cost_focused',
  -- Policies
  has_ai_usage_policy BOOLEAN DEFAULT FALSE,
  has_data_protection_policy BOOLEAN DEFAULT TRUE,
  has_redundancy_policy BOOLEAN DEFAULT FALSE,
  has_whistleblowing_policy BOOLEAN DEFAULT FALSE,
  has_edi_policy BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ail_oc_tenant (tenant_id)
);

-- 7. Narrative State (per-user story state)
CREATE TABLE IF NOT EXISTS ail_narrative_state (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  tenant_id VARCHAR(36) NOT NULL,
  -- Organisation health indicators (0-100)
  legal_risk_level ENUM('low','moderate','high','critical') NOT NULL DEFAULT 'low',
  employee_relations_score INT NOT NULL DEFAULT 70,
  regulatory_standing_score INT NOT NULL DEFAULT 80,
  csuite_confidence_in_hr INT NOT NULL DEFAULT 60,
  board_confidence_in_hr INT NOT NULL DEFAULT 60,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ail_ns_user (user_id),
  INDEX idx_ail_ns_tenant (tenant_id)
);

-- 8. Stakeholder Relationships (recurring cast relationship scores)
CREATE TABLE IF NOT EXISTS ail_stakeholder_relationships (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  stakeholder_id VARCHAR(50) NOT NULL,  -- e.g. 'sarah_chen', 'david_okafor'
  stakeholder_name VARCHAR(100) NOT NULL,
  stakeholder_role VARCHAR(100) NOT NULL,
  relationship_score INT NOT NULL DEFAULT 0,  -- -10 to +10
  trust_level ENUM('high','moderate','low','broken') NOT NULL DEFAULT 'moderate',
  current_emotional_state ENUM(
    'collaborative','pressured','defensive','frustrated',
    'distressed','confident','suspicious','resigned'
  ) NOT NULL DEFAULT 'collaborative',
  known_history_json TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_stakeholder (user_id, stakeholder_id),
  INDEX idx_ail_sr_user (user_id),
  INDEX idx_ail_sr_tenant (tenant_id)
);

-- 9. Narrative Events (what has happened in the story)
CREATE TABLE IF NOT EXISTS ail_narrative_events (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  simulation_id VARCHAR(36),
  event_type ENUM('decision','consequence','external_event') NOT NULL DEFAULT 'decision',
  description TEXT NOT NULL,
  stakeholders_involved_json TEXT,
  consequence_for_future TEXT,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ail_ne_user (user_id),
  INDEX idx_ail_ne_tenant (tenant_id),
  INDEX idx_ail_ne_simulation (simulation_id)
);

-- 10. Narrative Threads (active storylines)
CREATE TABLE IF NOT EXISTS ail_narrative_threads (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  thread_name VARCHAR(200) NOT NULL,
  thread_type ENUM('consequence','escalation','relationship') NOT NULL DEFAULT 'consequence',
  started_in_simulation_id VARCHAR(36),
  current_status ENUM('active','resolved','escalated') NOT NULL DEFAULT 'active',
  next_expected_event TEXT,
  related_simulations_json TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ail_nt_user (user_id),
  INDEX idx_ail_nt_tenant (tenant_id),
  INDEX idx_ail_nt_status (current_status)
);

-- 11. Difficulty Profiles (cross-simulation ADE-2 state)
CREATE TABLE IF NOT EXISTS ail_difficulty_profiles (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  tenant_id VARCHAR(36) NOT NULL,
  -- Current settings (1-5 scale)
  signal_clarity INT NOT NULL DEFAULT 4,           -- 5=very clear errors, 1=subtle
  ambiguity INT NOT NULL DEFAULT 2,                -- 1=clear answer, 5=multiple defensible
  political_complexity INT NOT NULL DEFAULT 2,     -- 1=moderate pressure, 5=maximum
  informational_completeness INT NOT NULL DEFAULT 4, -- 5=complete data, 1=significant gaps
  time_pressure INT NOT NULL DEFAULT 2,            -- 1=no deadline, 5=real-time
  consequence_visibility INT NOT NULL DEFAULT 4,   -- 5=explained, 1=not explained
  -- Performance history per dimension (JSON)
  dimension_performance_json TEXT,
  -- Adjustment history (JSON array)
  adjustment_history_json TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ail_dp_user (user_id),
  INDEX idx_ail_dp_tenant (tenant_id)
);
