-- Migration 0043: Reward Stages 2-4 — Vision, Strategy, Principles + Won't-do

-- Stage 2: Reward Vision
CREATE TABLE IF NOT EXISTS `reward_vision` (
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `vision_text` text,
  `ai_generated_original` text,
  `state` varchar(12) NOT NULL DEFAULT 'unconfirmed',
  `updated_at` bigint,
  PRIMARY KEY (`tenant_id`)
);

-- Stage 3: Reward Strategy
CREATE TABLE IF NOT EXISTS `reward_strategy` (
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `strategic_shifts_json` json,
  `state` varchar(12) NOT NULL DEFAULT 'unconfirmed',
  `updated_at` bigint,
  PRIMARY KEY (`tenant_id`)
);

-- Stage 4: Reward Principles + Won't-do
CREATE TABLE IF NOT EXISTS `reward_principles` (
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `principles_json` json,
  `wont_dos_json` json,
  `state` varchar(12) NOT NULL DEFAULT 'unconfirmed',
  `updated_at` bigint,
  PRIMARY KEY (`tenant_id`)
);

-- Canonical principle templates
CREATE TABLE IF NOT EXISTS `reward_principle_templates` (
  `principle_id` varchar(50) NOT NULL,
  `text` text NOT NULL,
  `maps_to_initiatives_json` json,
  `surfaced_when_json` json,
  PRIMARY KEY (`principle_id`)
);

-- Canonical won't-do templates
CREATE TABLE IF NOT EXISTS `reward_wont_do_templates` (
  `wont_do_id` varchar(50) NOT NULL,
  `text` text NOT NULL,
  `affects_initiatives_json` json,
  `effect` varchar(10) NOT NULL DEFAULT 'flag',
  `note_text` text,
  PRIMARY KEY (`wont_do_id`)
);

-- Seed canonical principle templates (from §5.2 of build brief)
INSERT IGNORE INTO `reward_principle_templates` (`principle_id`, `text`, `maps_to_initiatives_json`, `surfaced_when_json`) VALUES
('explainable_pay', 'Pay decisions must be explainable to the affected employee', '[1, 13, 14]', '{"priorities": ["modernise_comp_decisions", "pay_transparency_readiness"]}'),
('evidence_based', 'Reward decisions are evidence-based, not gut-based', '[1, 2, 7, 16]', '{"priorities": ["modernise_comp_decisions"]}'),
('continuous_fairness', 'We monitor pay fairness continuously, not just annually', '[3, 4]', '{"priorities": ["fix_pay_equity_gaps"]}'),
('equal_pay_commitment', 'We commit to equal pay for work of equal value', '[3, 5]', '{"priorities_or_sector": {"priorities": ["fix_pay_equity_gaps"], "sector": "retail"}}'),
('transparency_default', 'Pay transparency is default-on; opacity requires justification', '[4, 13, 14]', '{"priorities_or_geo": {"priorities": ["pay_transparency_readiness"], "geo_includes_eu": true}}'),
('clear_structure', 'Pay structure is clear, defensible, and fair', '[6, 8]', '{"priorities": ["modernise_pay_bands_and_architecture"]}'),
('competitive_pay', 'We pay competitively in the markets we operate in', '[7, 10]', '{"priorities": ["ai_talent_pay_strategy", "improve_market_data_and_benchmarks"]}'),
('amplify_team', 'We invest in AI to amplify our Reward team, not replace it', '[15, 28]', '{"priorities": ["reward_team_productivity"]}'),
('manager_authority', 'Pay decisions remain with managers, supported by data', '[1, 2]', '{"priorities": ["modernise_comp_decisions"]}'),
('individual_needs', 'We treat employees as individuals with different needs', '[12, 19]', '{"min_ambition": 3}');

-- Seed canonical won't-do templates (from §5.3 of build brief)
INSERT IGNORE INTO `reward_wont_do_templates` (`wont_do_id`, `text`, `affects_initiatives_json`, `effect`, `note_text`) VALUES
('no_full_automation', 'We won''t fully automate pay decisions that affect someone''s livelihood', '[1, 2, 16, 20]', 'flag', 'Configured so a person makes the decision; AI recommends, human decides.'),
('equal_pay_human_review', 'We won''t make final equal pay determinations without human review', '[5]', 'flag', 'Produces evidence for a human decision, not an automated determination.'),
('explainability_required', 'We won''t deploy employee-facing AI without explainability', '[13, 14]', 'flag', 'Directly satisfies this — explainability is the initiative''s purpose.'),
('exec_pay_oversight', 'We won''t use AI for executive pay without RemCo oversight', '[9, 18]', 'flag', 'Operates as RemCo decision-support, not decision-maker.'),
('no_surveillance', 'We won''t surveil employees through their reward data', '[3, 20]', 'flag', 'Monitors aggregate patterns, not individuals.'),
('fairness_over_efficiency', 'We won''t sacrifice pay fairness for efficiency', '[]', 'inform', NULL);
