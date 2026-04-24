-- ─── S7.1: role_archetype_id on assessment_sessions ──────────────────────────
ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS role_archetype_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS role_hint_freetext VARCHAR(200) NULL;

-- ─── C3.1a: artefact_type + artefact_payload on assessment_items ─────────────
ALTER TABLE assessment_items
  ADD COLUMN IF NOT EXISTS artefact_type VARCHAR(50) NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS artefact_payload JSON NULL,
  ADD COLUMN IF NOT EXISTS ai_output_quality VARCHAR(50) NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS time_limit_secs INT NULL;

-- ─── C1.4a: readiness_rule on assessment_blueprints ──────────────────────────
ALTER TABLE assessment_blueprints
  ADD COLUMN IF NOT EXISTS readiness_rule VARCHAR(50) NULL DEFAULT 'min_weighted',
  ADD COLUMN IF NOT EXISTS confidence_floor DECIMAL(4,3) NULL DEFAULT 0.600;

-- ─── C2.2a: organisations + organisation_profiles ────────────────────────────
CREATE TABLE IF NOT EXISTS organisations (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_org_tenant (tenant_id),
  UNIQUE KEY uq_org_slug_tenant (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS organisation_profiles (
  id VARCHAR(36) PRIMARY KEY,
  organisation_id VARCHAR(36) NOT NULL,
  sector VARCHAR(100) NULL,
  ai_adoption_stage VARCHAR(50) NULL DEFAULT 'exploring',
  risk_appetite VARCHAR(50) NULL DEFAULT 'moderate',
  governance_regime VARCHAR(100) NULL,
  priority_capabilities JSON NULL,
  ai_tools_json JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_org_profile (organisation_id)
);

CREATE TABLE IF NOT EXISTS organisation_capability_thresholds (
  id VARCHAR(36) PRIMARY KEY,
  organisation_id VARCHAR(36) NOT NULL,
  archetype_id VARCHAR(36) NULL,
  capability VARCHAR(100) NOT NULL,
  minimum_safe_threshold INT NOT NULL DEFAULT 65,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_oct_org (organisation_id)
);

-- ─── C2.2b: organisation_id FK on assessment_sessions ────────────────────────
ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS organisation_id VARCHAR(36) NULL;

-- ─── C1.7c: canonical_signals reference table ────────────────────────────────
CREATE TABLE IF NOT EXISTS canonical_signals (
  signal_key VARCHAR(100) PRIMARY KEY,
  domain VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed canonical signals
INSERT IGNORE INTO canonical_signals (signal_key, domain, description) VALUES
  ('interaction_quality',      'ai_interaction',       'Quality of AI tool interaction and prompting'),
  ('prompt_clarity',           'ai_interaction',       'Clarity and precision of prompts'),
  ('tool_selection',           'ai_interaction',       'Appropriate selection of AI tools for tasks'),
  ('iteration_effectiveness',  'ai_interaction',       'Effectiveness of iterative refinement'),
  ('output_accuracy',          'ai_output_evaluation', 'Accuracy assessment of AI outputs'),
  ('hallucination_detection',  'ai_output_evaluation', 'Detection of AI hallucinations and errors'),
  ('fitness_for_purpose',      'ai_output_evaluation', 'Assessment of output fitness for intended purpose'),
  ('critical_evaluation',      'ai_output_evaluation', 'Critical evaluation of AI-generated content'),
  ('governance_quality',       'ai_ethics_trust',      'Quality of AI governance decision-making'),
  ('ethical_reasoning',        'ai_ethics_trust',      'Quality of ethical reasoning about AI'),
  ('trust_calibration',        'ai_ethics_trust',      'Appropriate calibration of trust in AI'),
  ('transparency_commitment',  'ai_ethics_trust',      'Commitment to transparency in AI use'),
  ('change_leadership',        'ai_change_leadership', 'Leadership of AI-driven organisational change'),
  ('stakeholder_management',   'ai_change_leadership', 'Management of stakeholder concerns about AI'),
  ('pace_calibration',         'ai_change_leadership', 'Calibration of AI adoption pace'),
  ('resistance_handling',      'ai_change_leadership', 'Handling of resistance to AI adoption'),
  ('workflow_integration',     'workflow',             'Integration of AI into existing workflows'),
  ('process_redesign',         'workflow',             'Redesign of processes for AI enablement'),
  ('automation_judgement',     'workflow',             'Judgement about what to automate'),
  ('human_ai_collaboration',   'workflow',             'Effective human-AI collaboration patterns'),
  ('data_interpretation_quality', 'data_interpretation', 'Quality of data interpretation from AI analytics'),
  ('insight_application',      'data_interpretation', 'Application of AI-generated insights'),
  ('statistical_literacy',     'data_interpretation', 'Statistical literacy for AI output interpretation'),
  ('evidence_based_decision',  'data_interpretation', 'Evidence-based decision making with AI data');
