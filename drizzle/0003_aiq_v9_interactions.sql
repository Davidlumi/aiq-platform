-- ============================================================
-- AIQ V9.2 Assessment Engine Seed: 50 Canonical Interactions
-- Generated from Volume 01 + Volume 02A canonical scoring objects
-- ============================================================

-- Delete old demo blueprint and items to replace with real V9.2 interactions
DELETE FROM `assessment_item_options` WHERE `item_id` IN (SELECT `id` FROM `assessment_items` WHERE `blueprint_id` = 'bp-aiq-v9-standard');
DELETE FROM `assessment_items` WHERE `blueprint_id` = 'bp-aiq-v9-standard';
DELETE FROM `assessment_blueprints` WHERE `id` = 'bp-aiq-v9-standard';

-- Also clear old demo items that were seeded with item-001 etc
DELETE FROM `assessment_item_options` WHERE `item_id` IN ('item-001','item-002','item-003','item-004','item-005');
DELETE FROM `assessment_items` WHERE `id` IN ('item-001','item-002','item-003','item-004','item-005');
DELETE FROM `assessment_blueprints` WHERE `id` = 'bp-demo-001';

-- Insert V9.2 standard blueprint
INSERT INTO `assessment_blueprints` (`id`, `tenant_id`, `key`, `name`, `version`, `status`, `role_scope_json`, `structure_json`) VALUES (
  'bp-aiq-v9-standard',
  'tenant-demo-001',
  'aiq_v9_standard',
  'AIQ Capability Assessment — V9.2 Standard',
  9,
  'published',
  '{"all": true}',
  '{"methodology_version": "v9.2", "total_items": 50, "estimated_duration_minutes": 25, "adaptive": true, "scoring_model": "signal_delta_v9", "capabilities": ["execution", "judgement", "governance", "workflow", "appropriateness", "data_interpretation"], "description": "The AIQ V9.2 Standard Assessment measures AI capability across six domains using 50 canonical scenario-based interactions. Each interaction presents a realistic HR workflow decision involving AI-generated content."}'
);

-- Insert 50 assessment items
INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ex01',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'An AI tool generates a job description for a senior analyst role. The description is mostly usable but includes inconsistent seniority language, an unclear reporting line, and slightly inflated responsibilities.

Constraint: You have five minutes before the role must go live.

What do you do?',
  '{"interaction_id": "EX-01", "title": "Job Description Correction", "scenario": "An AI tool generates a job description for a senior analyst role. The description is mostly usable but includes inconsistent seniority language, an unclear reporting line, and slightly inflated responsibilities.", "constraint": "You have five minutes before the role must go live.", "question": "What do you do?", "capability": "AI Execution", "capability_key": "execution", "workflow": "Recruitment", "risk_level": "Medium", "primary_signal": "execution_quality", "secondary_signals": ["prioritisation_quality", "timing_integrity"], "display_order": 1}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex01-a',
  'item-ex01',
  'Publish the description as-is.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"execution_quality": -4, "prioritisation_quality": -1, "over_reliance_risk": 2}',
  '["LEAVES_MATERIAL_ERROR", "BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex01-b',
  'item-ex01',
  'Fix the most critical inconsistencies and publish.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"execution_quality": 4, "prioritisation_quality": 2, "timing_integrity": 1}',
  '["TARGETED_CORRECTION", "HIGH_IMPACT_ISSUE_FIXED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex01-c',
  'item-ex01',
  'Rewrite the entire description manually.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"execution_quality": 1, "prioritisation_quality": 1, "over_caution_risk": 1}',
  '["CORRECT_INTENT_INEFFICIENT"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex01-d',
  'item-ex01',
  'Delay posting until the whole document can be fully reviewed.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"execution_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ex02',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI generates a short board note summarising a people report and inserts a statistic that does not exist in the source material. The rest of the note appears strong.

Constraint: You are about to present the note to leadership.

What do you do?',
  '{"interaction_id": "EX-02", "title": "Hallucinated Statistic in Board Note", "scenario": "AI generates a short board note summarising a people report and inserts a statistic that does not exist in the source material. The rest of the note appears strong.", "constraint": "You are about to present the note to leadership.", "question": "What do you do?", "capability": "AI Execution", "capability_key": "execution", "workflow": "Strategy", "risk_level": "Medium", "primary_signal": "execution_quality", "secondary_signals": ["validation_accuracy", "over_reliance_risk"], "display_order": 2}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex02-a',
  'item-ex02',
  'Present it as-is because the overall message is correct.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"execution_quality": -4, "validation_accuracy": -1, "over_reliance_risk": 2}',
  '["LEAVES_MATERIAL_ERROR", "BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex02-b',
  'item-ex02',
  'Remove the incorrect statistic and validate the most material claims.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"execution_quality": 4, "validation_accuracy": 2, "over_reliance_risk": 1}',
  '["TARGETED_CORRECTION", "HIGH_IMPACT_ISSUE_FIXED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex02-c',
  'item-ex02',
  'Discard the note and start the whole piece again manually.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"execution_quality": 1, "validation_accuracy": 1}',
  '["CORRECT_INTENT_INEFFICIENT"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex02-d',
  'item-ex02',
  'Present the note but verbally caveat that some detail may need checking.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"execution_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ex03',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI produces vague output for a workforce planning request because the prompt was broad and underspecified.

Constraint: You only have time to improve the prompt once before moving on.

What is the best adjustment?',
  '{"interaction_id": "EX-03", "title": "Prompt Improvement for Workforce Plan", "scenario": "AI produces vague output for a workforce planning request because the prompt was broad and underspecified.", "constraint": "You only have time to improve the prompt once before moving on.", "question": "What is the best adjustment?", "capability": "AI Execution", "capability_key": "execution", "workflow": "Workforce Planning", "risk_level": "Low", "primary_signal": "execution_quality", "secondary_signals": ["validation_accuracy", "workflow_application_quality"], "display_order": 3}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex03-a',
  'item-ex03',
  'Ask AI to be more detailed.',
  'A',
  1,
  0,
  0.25,
  'Low',
  '{"execution_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex03-b',
  'item-ex03',
  'Specify the business context, output structure, time horizon, and assumptions.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"execution_quality": 4, "validation_accuracy": 2, "workflow_application_quality": 1}',
  '["TARGETED_CORRECTION", "HIGH_IMPACT_ISSUE_FIXED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex03-c',
  'item-ex03',
  'Accept the vague output and refine it manually later.',
  'C',
  3,
  0,
  0.0,
  'Fail',
  '{"execution_quality": -4, "validation_accuracy": -1, "over_reliance_risk": 2}',
  '["LEAVES_MATERIAL_ERROR", "BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex03-d',
  'item-ex03',
  'Abandon AI for this task and rewrite manually.',
  'D',
  4,
  0,
  0.5,
  'Partial',
  '{"execution_quality": 1, "validation_accuracy": 1, "over_caution_risk": 1}',
  '["CORRECT_INTENT_INEFFICIENT"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ex04',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'An AI-generated performance review includes subtle gendered wording that makes the feedback sound harsher for one employee than for others with similar results.

Constraint: The manager wants to send the feedback immediately.

What do you do?',
  '{"interaction_id": "EX-04", "title": "Bias Correction in Performance Feedback", "scenario": "An AI-generated performance review includes subtle gendered wording that makes the feedback sound harsher for one employee than for others with similar results.", "constraint": "The manager wants to send the feedback immediately.", "question": "What do you do?", "capability": "AI Risk & Governance / AI Execution", "capability_key": "execution", "workflow": "Performance", "risk_level": "High", "primary_signal": "governance_quality", "secondary_signals": ["execution_quality"], "display_order": 4}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex04-a',
  'item-ex04',
  'Send it as-is because the rating is still correct.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"governance_quality": -4, "execution_quality": -1, "over_reliance_risk": 2}',
  '["LEAVES_MATERIAL_ERROR", "BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex04-b',
  'item-ex04',
  'Edit the wording to remove the bias before it is sent.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"governance_quality": 4, "execution_quality": 2}',
  '["TARGETED_CORRECTION", "HIGH_IMPACT_ISSUE_FIXED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex04-c',
  'item-ex04',
  'Escalate the entire issue immediately to HR leadership.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"governance_quality": 1, "execution_quality": 1, "avoidance_risk": 1}',
  '["CORRECT_INTENT_INEFFICIENT"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex04-d',
  'item-ex04',
  'Delay the review cycle until all feedback can be re-run.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"governance_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ex05',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI identifies a strong improvement in a KPI, but the conclusion is based on the wrong baseline period.

Constraint: You need to brief a team lead in the next few minutes.

What do you do?',
  '{"interaction_id": "EX-05", "title": "KPI Baseline Misinterpretation", "scenario": "AI identifies a strong improvement in a KPI, but the conclusion is based on the wrong baseline period.", "constraint": "You need to brief a team lead in the next few minutes.", "question": "What do you do?", "capability": "AI Data & Insight Interpretation", "capability_key": "data_interpretation", "workflow": "Analytics", "risk_level": "Medium", "primary_signal": "execution_quality", "secondary_signals": ["data_interpretation_quality"], "display_order": 5}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex05-a',
  'item-ex05',
  'Use the conclusion as written.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"execution_quality": -4, "data_interpretation_quality": -1}',
  '["LEAVES_MATERIAL_ERROR", "BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex05-b',
  'item-ex05',
  'Correct the baseline assumption before using the result.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"execution_quality": 4, "data_interpretation_quality": 2}',
  '["TARGETED_CORRECTION", "HIGH_IMPACT_ISSUE_FIXED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex05-c',
  'item-ex05',
  'Ignore the insight entirely.',
  'C',
  3,
  0,
  0.25,
  'Low',
  '{"execution_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex05-d',
  'item-ex05',
  'Rebuild the whole analysis from scratch.',
  'D',
  4,
  0,
  0.5,
  'Partial',
  '{"execution_quality": 1, "data_interpretation_quality": 1, "over_caution_risk": 1}',
  '["CORRECT_INTENT_INEFFICIENT"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ex06',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI generates a chronology of an employee relations case but leaves out a key meeting that affects the timeline.

Constraint: A manager is waiting for the summary.

What do you do?',
  '{"interaction_id": "EX-06", "title": "Incomplete ER Summary", "scenario": "AI generates a chronology of an employee relations case but leaves out a key meeting that affects the timeline.", "constraint": "A manager is waiting for the summary.", "question": "What do you do?", "capability": "AI Execution", "capability_key": "execution", "workflow": "Employee Relations", "risk_level": "Medium", "primary_signal": "execution_quality", "secondary_signals": ["validation_accuracy"], "display_order": 6}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex06-a',
  'item-ex06',
  'Send it because most of the chronology is right.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"execution_quality": -4, "validation_accuracy": -1}',
  '["LEAVES_MATERIAL_ERROR", "BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex06-b',
  'item-ex06',
  'Insert the missing event and send the corrected version.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"execution_quality": 4, "validation_accuracy": 2}',
  '["TARGETED_CORRECTION", "HIGH_IMPACT_ISSUE_FIXED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex06-c',
  'item-ex06',
  'Abandon the AI output and rewrite the entire chronology.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"execution_quality": 1, "validation_accuracy": 1, "over_caution_risk": 1}',
  '["CORRECT_INTENT_INEFFICIENT"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex06-d',
  'item-ex06',
  'Delay the discussion until the next day.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"execution_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ex07',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI generates a useful summary for a board audience, but the tone is too informal.

Constraint: You have limited time and the content itself is accurate.

What do you do?',
  '{"interaction_id": "EX-07", "title": "Executive Tone Adjustment", "scenario": "AI generates a useful summary for a board audience, but the tone is too informal.", "constraint": "You have limited time and the content itself is accurate.", "question": "What do you do?", "capability": "AI Execution", "capability_key": "execution", "workflow": "Executive Communications", "risk_level": "Low", "primary_signal": "execution_quality", "secondary_signals": ["—"], "display_order": 7}',
  1,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex07-a',
  'item-ex07',
  'Send the summary unchanged.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"execution_quality": -4, "—": -1}',
  '["LEAVES_MATERIAL_ERROR", "BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex07-b',
  'item-ex07',
  'Adjust the tone and maintain the substance.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"execution_quality": 4, "—": 2, "cosmetic_focus_risk": 1}',
  '["TARGETED_CORRECTION", "HIGH_IMPACT_ISSUE_FIXED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex07-c',
  'item-ex07',
  'Rewrite everything from scratch.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"execution_quality": 1, "—": 1, "over_caution_risk": 1}',
  '["CORRECT_INTENT_INEFFICIENT"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex07-d',
  'item-ex07',
  'Delay until someone else can review it.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"execution_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ex08',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI drafts training material using an outdated example that no longer reflects current policy.

Constraint: The module launches later today.

What do you do?',
  '{"interaction_id": "EX-08", "title": "Outdated Example in Training Content", "scenario": "AI drafts training material using an outdated example that no longer reflects current policy.", "constraint": "The module launches later today.", "question": "What do you do?", "capability": "AI Workflow Application", "capability_key": "workflow", "workflow": "Application Difficulty L1 Risk level Low Workflow Learning", "risk_level": "Low", "primary_signal": "execution_quality", "secondary_signals": ["workflow_application_quality"], "display_order": 8}',
  1,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex08-a',
  'item-ex08',
  'Leave it because the principle still stands.',
  'A',
  1,
  0,
  0.25,
  'Low',
  '{"execution_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex08-b',
  'item-ex08',
  'Replace the outdated example and keep the rest.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"execution_quality": 4, "workflow_application_quality": 2}',
  '["TARGETED_CORRECTION", "HIGH_IMPACT_ISSUE_FIXED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex08-c',
  'item-ex08',
  'Rebuild the whole module manually.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"execution_quality": 1, "workflow_application_quality": 1, "over_caution_risk": 1}',
  '["CORRECT_INTENT_INEFFICIENT"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex08-d',
  'item-ex08',
  'Cancel the launch.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"execution_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ex09',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI drafts a headcount recommendation assuming that current attrition will remain stable, but there is evidence of seasonal variation.

Constraint: You are preparing a planning discussion.

What do you do?',
  '{"interaction_id": "EX-09", "title": "Incorrect Assumption in Headcount Plan", "scenario": "AI drafts a headcount recommendation assuming that current attrition will remain stable, but there is evidence of seasonal variation.", "constraint": "You are preparing a planning discussion.", "question": "What do you do?", "capability": "AI Data & Insight Interpretation", "capability_key": "data_interpretation", "workflow": "Workforce Planning", "risk_level": "Medium", "primary_signal": "execution_quality", "secondary_signals": ["data_interpretation_quality"], "display_order": 9}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex09-a',
  'item-ex09',
  'Use the recommendation unchanged.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"execution_quality": -4, "data_interpretation_quality": -1}',
  '["LEAVES_MATERIAL_ERROR", "BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex09-b',
  'item-ex09',
  'Adjust or challenge the assumption before using the output.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"execution_quality": 4, "data_interpretation_quality": 2}',
  '["TARGETED_CORRECTION", "HIGH_IMPACT_ISSUE_FIXED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex09-c',
  'item-ex09',
  'Reject the output entirely.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"execution_quality": 1, "data_interpretation_quality": 1}',
  '["CORRECT_INTENT_INEFFICIENT"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex09-d',
  'item-ex09',
  'Delay the discussion.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"execution_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ex10',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI drafts a compensation recommendation memo that is technically correct but unclear about the reasoning for the final decision.

Constraint: You need to send it to a senior leader in ten minutes.

What do you do?',
  '{"interaction_id": "EX-10", "title": "Clarifying a Compensation Memo", "scenario": "AI drafts a compensation recommendation memo that is technically correct but unclear about the reasoning for the final decision.", "constraint": "You need to send it to a senior leader in ten minutes.", "question": "What do you do?", "capability": "AI Execution", "capability_key": "execution", "workflow": "Reward", "risk_level": "Medium", "primary_signal": "execution_quality", "secondary_signals": ["validation_accuracy", "workflow_application_quality"], "display_order": 10}',
  1,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex10-a',
  'item-ex10',
  'Send it because the recommendation is correct.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"execution_quality": -4, "validation_accuracy": -1}',
  '["LEAVES_MATERIAL_ERROR", "BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex10-b',
  'item-ex10',
  'Clarify the reasoning and decision path before sending.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"execution_quality": 4, "validation_accuracy": 2, "workflow_application_quality": 1}',
  '["TARGETED_CORRECTION", "HIGH_IMPACT_ISSUE_FIXED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex10-c',
  'item-ex10',
  'Rewrite the memo manually.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"execution_quality": 1, "validation_accuracy": 1, "over_caution_risk": 1}',
  '["CORRECT_INTENT_INEFFICIENT"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ex10-d',
  'item-ex10',
  'Delay and escalate.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"execution_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-pr01',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI produces a workforce attrition report with several insights. One section shows a sharp attrition spike in a specific region. The report also contains minor formatting inconsistencies, duplicated labels, and a weak methodology explanation.

Constraint: You can validate one element only before presenting the report.

What do you check first?',
  '{"interaction_id": "PR-01", "title": "Single Validation Choice", "scenario": "AI produces a workforce attrition report with several insights. One section shows a sharp attrition spike in a specific region. The report also contains minor formatting inconsistencies, duplicated labels, and a weak methodology explanation.", "constraint": "You can validate one element only before presenting the report.", "question": "What do you check first?", "capability": "Validation / Prioritisation", "capability_key": "execution", "workflow": "People Analytics", "risk_level": "Medium", "primary_signal": "prioritisation_quality", "secondary_signals": ["validation_accuracy"], "display_order": 11}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr01-b',
  'item-pr01',
  'The data accuracy behind the attrition spike.',
  'B',
  1,
  1,
  1.0,
  'Full',
  '{"prioritisation_quality": 4, "validation_accuracy": 2}',
  '["MATERIAL_ASSUMPTION_CHECK", "DECISION_RELEVANT_ELEMENT_SELECTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr01-c',
  'item-pr01',
  'Duplicated labels.',
  'C',
  2,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "cosmetic_focus_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr01-d',
  'item-pr01',
  'The length of the methodology note.',
  'D',
  3,
  0,
  0.5,
  'Partial',
  '{"prioritisation_quality": 1, "validation_accuracy": 1}',
  '["SECOND_ORDER_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr01-a',
  'item-pr01',
  'Formatting inconsistencies.',
  'A',
  4,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "cosmetic_focus_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-pr02',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI generates a performance dashboard. A key performance metric may be wrong, but the charts are also poorly formatted.

Constraint: A senior stakeholder is about to open the dashboard.

What do you address first?',
  '{"interaction_id": "PR-02", "title": "Data vs Presentation", "scenario": "AI generates a performance dashboard. A key performance metric may be wrong, but the charts are also poorly formatted.", "constraint": "A senior stakeholder is about to open the dashboard.", "question": "What do you address first?", "capability": "Prioritisation", "capability_key": "execution", "workflow": "Performance", "risk_level": "Medium", "primary_signal": "prioritisation_quality", "secondary_signals": ["governance_quality"], "display_order": 12}',
  1,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr02-b',
  'item-pr02',
  'Validate the key metric.',
  'B',
  1,
  1,
  1.0,
  'Full',
  '{"prioritisation_quality": 4, "governance_quality": 2}',
  '["HIGHEST_RISK_PRIORITY", "MATERIAL_IMPACT_RECOGNISED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr02-c',
  'item-pr02',
  'Fix labels only.',
  'C',
  2,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "cosmetic_focus_risk": 2}',
  '["COSMETIC_PRIORITY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr02-d',
  'item-pr02',
  'Do nothing and explain later.',
  'D',
  3,
  0,
  0.0,
  'Fail',
  '{"prioritisation_quality": -4, "governance_quality": -1}',
  '["SPEED_OVER_RISK", "MISSED_CRITICAL_RISK"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr02-a',
  'item-pr02',
  'Improve formatting.',
  'A',
  4,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "cosmetic_focus_risk": 2}',
  '["COSMETIC_PRIORITY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-pr03',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'An AI-generated report includes one major incorrect conclusion and several minor wording issues.

Constraint: You can fix only one thing before it is circulated.

What do you fix?',
  '{"interaction_id": "PR-03", "title": "Major Conclusion vs Minor Wording", "scenario": "An AI-generated report includes one major incorrect conclusion and several minor wording issues.", "constraint": "You can fix only one thing before it is circulated.", "question": "What do you fix?", "capability": "Prioritisation", "capability_key": "execution", "workflow": "Strategy", "risk_level": "Medium", "primary_signal": "prioritisation_quality", "secondary_signals": ["discrimination_quality"], "display_order": 13}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr03-b',
  'item-pr03',
  'The incorrect conclusion.',
  'B',
  1,
  1,
  1.0,
  'Full',
  '{"prioritisation_quality": 4, "discrimination_quality": 2}',
  '["HIGHEST_RISK_PRIORITY", "MATERIAL_IMPACT_RECOGNISED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr03-d',
  'item-pr03',
  'Tone of the introduction.',
  'D',
  2,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "cosmetic_focus_risk": 2}',
  '["COSMETIC_PRIORITY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr03-a',
  'item-pr03',
  'A minor wording issue that might sound clumsy.',
  'A',
  3,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "avoidance_risk": 2}',
  '["COSMETIC_PRIORITY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr03-c',
  'item-pr03',
  'Formatting.',
  'C',
  4,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "cosmetic_focus_risk": 2}',
  '["COSMETIC_PRIORITY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-pr04',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI generates a candidate shortlist. Potential issues include a bias risk, missing internal notes, and formatting inconsistencies.

Constraint: The hiring manager wants a decision in three minutes.

What do you prioritise?',
  '{"interaction_id": "PR-04", "title": "Bias vs Notes vs Formatting", "scenario": "AI generates a candidate shortlist. Potential issues include a bias risk, missing internal notes, and formatting inconsistencies.", "constraint": "The hiring manager wants a decision in three minutes.", "question": "What do you prioritise?", "capability": "Prioritisation", "capability_key": "execution", "workflow": "Recruitment", "risk_level": "High", "primary_signal": "prioritisation_quality", "secondary_signals": ["governance_quality"], "display_order": 14}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr04-b',
  'item-pr04',
  'Potential bias risk.',
  'B',
  1,
  1,
  1.0,
  'Full',
  '{"prioritisation_quality": 4, "governance_quality": 2}',
  '["HIGHEST_RISK_PRIORITY", "MATERIAL_IMPACT_RECOGNISED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr04-c',
  'item-pr04',
  'Missing notes.',
  'C',
  2,
  0,
  0.5,
  'Partial',
  '{"prioritisation_quality": 1, "governance_quality": 1}',
  '["SECOND_ORDER_PRIORITY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr04-d',
  'item-pr04',
  'Moving quickly to avoid delay.',
  'D',
  3,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "avoidance_risk": 2}',
  '["COSMETIC_PRIORITY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr04-a',
  'item-pr04',
  'Formatting.',
  'A',
  4,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "cosmetic_focus_risk": 2}',
  '["COSMETIC_PRIORITY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-pr05',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI suggests a restructuring plan based on assumptions about future demand.

Constraint: The CEO wants an answer today.

What do you prioritise?',
  '{"interaction_id": "PR-05", "title": "Speed vs Assumption Check", "scenario": "AI suggests a restructuring plan based on assumptions about future demand.", "constraint": "The CEO wants an answer today.", "question": "What do you prioritise?", "capability": "Prioritisation / Judgement", "capability_key": "execution", "workflow": "Workforce Planning", "risk_level": "Medium", "primary_signal": "prioritisation_quality", "secondary_signals": ["judgement_quality"], "display_order": 15}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr05-b',
  'item-pr05',
  'Validation of the most important assumptions.',
  'B',
  1,
  1,
  1.0,
  'Full',
  '{"prioritisation_quality": 4, "judgement_quality": 2}',
  '["HIGHEST_RISK_PRIORITY", "MATERIAL_IMPACT_RECOGNISED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr05-d',
  'item-pr05',
  'Delegating the question to someone else.',
  'D',
  2,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "avoidance_risk": 2}',
  '["COSMETIC_PRIORITY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr05-a',
  'item-pr05',
  'Speed of response.',
  'A',
  3,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "avoidance_risk": 2}',
  '["COSMETIC_PRIORITY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr05-c',
  'item-pr05',
  'Presentation polish.',
  'C',
  4,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "cosmetic_focus_risk": 2}',
  '["COSMETIC_PRIORITY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-pr06',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'A manager pressures you to accept an AI-generated pay recommendation because it “saves time”.

Constraint: You can only review one element before responding.

What do you prioritise?',
  '{"interaction_id": "PR-06", "title": "Manager Pressure Validation Choice", "scenario": "A manager pressures you to accept an AI-generated pay recommendation because it “saves time”.", "constraint": "You can only review one element before responding.", "question": "What do you prioritise?", "capability": "Validation / Prioritisation", "capability_key": "execution", "workflow": "Reward", "risk_level": "Medium", "primary_signal": "prioritisation_quality", "secondary_signals": ["validation_accuracy"], "display_order": 16}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr06-b',
  'item-pr06',
  'The highest-risk factor in the recommendation.',
  'B',
  1,
  1,
  1.0,
  'Full',
  '{"prioritisation_quality": 4, "validation_accuracy": 2}',
  '["MATERIAL_ASSUMPTION_CHECK", "DECISION_RELEVANT_ELEMENT_SELECTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr06-d',
  'item-pr06',
  'Whether the document is concise.',
  'D',
  2,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "cosmetic_focus_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr06-a',
  'item-pr06',
  'Agreement with the manager.',
  'A',
  3,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "avoidance_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr06-c',
  'item-pr06',
  'Formatting.',
  'C',
  4,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "cosmetic_focus_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-pr07',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI produces six people insights, only one of which materially affects a business decision.

Constraint: You can inspect one before the meeting begins.

What should guide your choice?',
  '{"interaction_id": "PR-07", "title": "Six Insights, One Check", "scenario": "AI produces six people insights, only one of which materially affects a business decision.", "constraint": "You can inspect one before the meeting begins.", "question": "What should guide your choice?", "capability": "Prioritisation", "capability_key": "execution", "workflow": "Analytics", "risk_level": "Medium", "primary_signal": "prioritisation_quality", "secondary_signals": ["discrimination_quality"], "display_order": 17}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr07-b',
  'item-pr07',
  'The insight with the highest decision impact if wrong.',
  'B',
  1,
  1,
  1.0,
  'Full',
  '{"prioritisation_quality": 4, "discrimination_quality": 2}',
  '["MATERIAL_ASSUMPTION_CHECK", "DECISION_RELEVANT_ELEMENT_SELECTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr07-c',
  'item-pr07',
  'The shortest item to review.',
  'C',
  2,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "avoidance_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr07-d',
  'item-pr07',
  'The one the AI appears most confident about.',
  'D',
  3,
  0,
  0.5,
  'Partial',
  '{"prioritisation_quality": 1, "discrimination_quality": 1}',
  '["SECOND_ORDER_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr07-a',
  'item-pr07',
  'The most visually striking point.',
  'A',
  4,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "avoidance_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-pr08',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI produces an operations summary with one major inaccurate conclusion and several small issues.

Constraint: Only one fix can be made before the summary is circulated.

What do you choose?',
  '{"interaction_id": "PR-08", "title": "One Major Error, Many Minor Issues", "scenario": "AI produces an operations summary with one major inaccurate conclusion and several small issues.", "constraint": "Only one fix can be made before the summary is circulated.", "question": "What do you choose?", "capability": "Prioritisation", "capability_key": "execution", "workflow": "Operations", "risk_level": "Medium", "primary_signal": "prioritisation_quality", "secondary_signals": ["—"], "display_order": 18}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr08-a',
  'item-pr08',
  'Correct the major inaccurate conclusion.',
  'A',
  1,
  1,
  1.0,
  'Full',
  '{"prioritisation_quality": 4, "—": 2}',
  '["HIGHEST_RISK_PRIORITY", "MATERIAL_IMPACT_RECOGNISED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr08-b',
  'item-pr08',
  'Fix the smaller issues that affect readability.',
  'B',
  2,
  0,
  0.5,
  'Partial',
  '{"prioritisation_quality": 1, "—": 1}',
  '["SECOND_ORDER_PRIORITY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr08-c',
  'item-pr08',
  'Leave it alone to save time.',
  'C',
  3,
  0,
  0.0,
  'Fail',
  '{"prioritisation_quality": -4, "—": -1}',
  '["SPEED_OVER_RISK", "MISSED_CRITICAL_RISK"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr08-d',
  'item-pr08',
  'Rebuild the summary.',
  'D',
  4,
  0,
  0.5,
  'Partial',
  '{"prioritisation_quality": 1, "—": 1, "over_caution_risk": 1}',
  '["SECOND_ORDER_PRIORITY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-pr09',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI drafts a learning update that is accurate but incomplete.

Constraint: You can either improve completeness or verify a questionable key fact.

What matters most?',
  '{"interaction_id": "PR-09", "title": "Accuracy vs Completeness", "scenario": "AI drafts a learning update that is accurate but incomplete.", "constraint": "You can either improve completeness or verify a questionable key fact.", "question": "What matters most?", "capability": "Prioritisation", "capability_key": "execution", "workflow": "Learning", "risk_level": "Medium", "primary_signal": "prioritisation_quality", "secondary_signals": ["validation_accuracy"], "display_order": 19}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr09-a',
  'item-pr09',
  'Completeness.',
  'A',
  1,
  0,
  0.5,
  'Partial',
  '{"prioritisation_quality": 1, "validation_accuracy": 1}',
  '["SECOND_ORDER_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr09-b',
  'item-pr09',
  'Verification of the questionable key fact.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"prioritisation_quality": 4, "validation_accuracy": 2}',
  '["MATERIAL_ASSUMPTION_CHECK", "DECISION_RELEVANT_ELEMENT_SELECTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr09-d',
  'item-pr09',
  'Speed of publication.',
  'D',
  3,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "avoidance_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr09-c',
  'item-pr09',
  'Tone.',
  'C',
  4,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "cosmetic_focus_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-pr10',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI output contains a possible bias issue, a legal wording concern, and a minor data inconsistency.

Constraint: You can only address one issue before your manager uses the output.

What do you address first?',
  '{"interaction_id": "PR-10", "title": "Competing Risks in Output", "scenario": "AI output contains a possible bias issue, a legal wording concern, and a minor data inconsistency.", "constraint": "You can only address one issue before your manager uses the output.", "question": "What do you address first?", "capability": "Prioritisation", "capability_key": "execution", "workflow": "Employee Relations", "risk_level": "High", "primary_signal": "prioritisation_quality", "secondary_signals": ["discrimination_quality", "governance_quality"], "display_order": 20}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr10-a',
  'item-pr10',
  'The legal wording concern if it could materially change the action taken.',
  'A',
  1,
  1,
  1.0,
  'Full',
  '{"prioritisation_quality": 4, "discrimination_quality": 2, "governance_quality": 1}',
  '["HIGHEST_RISK_PRIORITY", "MATERIAL_IMPACT_RECOGNISED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr10-c',
  'item-pr10',
  'The bias issue regardless of context.',
  'C',
  2,
  0,
  0.5,
  'Partial',
  '{"prioritisation_quality": 1, "discrimination_quality": 1, "over_reliance_risk": 1}',
  '["SECOND_ORDER_PRIORITY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr10-d',
  'item-pr10',
  'The tone problem.',
  'D',
  3,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "cosmetic_focus_risk": 2}',
  '["COSMETIC_PRIORITY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-pr10-b',
  'item-pr10',
  'The minor data inconsistency.',
  'B',
  4,
  0,
  0.25,
  'Low',
  '{"prioritisation_quality": -2, "avoidance_risk": 2}',
  '["COSMETIC_PRIORITY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ju01',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI ranks candidates based on historical hiring success patterns. The highest-ranked candidate comes from a narrow profile similar to past hires but lacks diversity of experience.

Constraint: The hiring manager wants to move immediately.

What do you do?',
  '{"interaction_id": "JU-01", "title": "Hiring Decision Under Pattern Bias", "scenario": "AI ranks candidates based on historical hiring success patterns. The highest-ranked candidate comes from a narrow profile similar to past hires but lacks diversity of experience.", "constraint": "The hiring manager wants to move immediately.", "question": "What do you do?", "capability": "AI Judgement", "capability_key": "judgement", "workflow": "Recruitment", "risk_level": "High", "primary_signal": "judgement_quality", "secondary_signals": ["over_reliance_risk", "governance_quality"], "display_order": 21}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju01-a',
  'item-ju01',
  'Accept the AI recommendation and proceed.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"judgement_quality": -4, "over_reliance_risk": 1, "governance_quality": -1}',
  '["BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju01-b',
  'item-ju01',
  'Use the AI ranking as one input, but apply broader judgement and review the shortlist.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"judgement_quality": 4, "over_reliance_risk": 3, "governance_quality": 1}',
  '["HUMAN_JUDGEMENT_RETAINED", "CORRECT_AI_BOUNDARY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju01-c',
  'item-ju01',
  'Reject AI entirely for this task.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"judgement_quality": 1, "over_reliance_risk": 1, "avoidance_risk": 1}',
  '["CAUTIOUS_BUT_DEFENSIBLE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju01-d',
  'item-ju01',
  'Delay the decision until a larger review can be scheduled.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"judgement_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ju02',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI recommends a promotion candidate based on measurable performance data, but qualitative feedback from leadership is mixed and not reflected in the model.

Constraint: The promotion cycle closes today.

What do you do?',
  '{"interaction_id": "JU-02", "title": "Promotion Decision With Missing Qualitative Context", "scenario": "AI recommends a promotion candidate based on measurable performance data, but qualitative feedback from leadership is mixed and not reflected in the model.", "constraint": "The promotion cycle closes today.", "question": "What do you do?", "capability": "AI Judgement", "capability_key": "judgement", "workflow": "Performance", "risk_level": "High", "primary_signal": "judgement_quality", "secondary_signals": ["—"], "display_order": 22}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju02-a',
  'item-ju02',
  'Promote based on AI recommendation.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"judgement_quality": -4, "—": -1, "governance_quality": -1}',
  '["BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju02-b',
  'item-ju02',
  'Combine AI insight with human judgement before deciding.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"judgement_quality": 4, "—": 2}',
  '["HUMAN_JUDGEMENT_RETAINED", "CORRECT_AI_BOUNDARY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju02-c',
  'item-ju02',
  'Ignore AI completely.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"judgement_quality": 1, "—": 1, "avoidance_risk": 1}',
  '["CAUTIOUS_BUT_DEFENSIBLE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju02-d',
  'item-ju02',
  'Delay the promotion cycle.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"judgement_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ju03',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI suggests performance ratings across a team and the ratings appear broadly reasonable.

Constraint: Ratings must be finalised today.

What is your approach?',
  '{"interaction_id": "JU-03", "title": "Performance Rating Finalisation", "scenario": "AI suggests performance ratings across a team and the ratings appear broadly reasonable.", "constraint": "Ratings must be finalised today.", "question": "What is your approach?", "capability": "AI Judgement", "capability_key": "judgement", "workflow": "Performance", "risk_level": "High", "primary_signal": "judgement_quality", "secondary_signals": ["prioritisation_quality"], "display_order": 23}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju03-a',
  'item-ju03',
  'Accept the ratings.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"judgement_quality": -4, "prioritisation_quality": -1, "over_reliance_risk": 2, "governance_quality": -1}',
  '["BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju03-b',
  'item-ju03',
  'Review outliers and high-impact cases before finalising.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"judgement_quality": 4, "prioritisation_quality": 2}',
  '["HUMAN_JUDGEMENT_RETAINED", "CORRECT_AI_BOUNDARY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju03-c',
  'item-ju03',
  'Reassess every rating manually.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"judgement_quality": 1, "prioritisation_quality": 1, "over_caution_risk": 1}',
  '["CAUTIOUS_BUT_DEFENSIBLE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju03-d',
  'item-ju03',
  'Delay all ratings.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"judgement_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ju04',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI recommends a cost-cutting action by reducing headcount in one business area based on current utilisation data.

Constraint: The decision could affect continuity and morale.

What do you do?',
  '{"interaction_id": "JU-04", "title": "Cost-Cutting Recommendation", "scenario": "AI recommends a cost-cutting action by reducing headcount in one business area based on current utilisation data.", "constraint": "The decision could affect continuity and morale.", "question": "What do you do?", "capability": "AI Judgement", "capability_key": "judgement", "workflow": "Strategy", "risk_level": "High", "primary_signal": "judgement_quality", "secondary_signals": ["governance_quality"], "display_order": 24}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju04-a',
  'item-ju04',
  'Implement immediately.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"judgement_quality": -4, "governance_quality": -1, "over_reliance_risk": 2}',
  '["ANALYTICAL_CLAIM_ACCEPTED_UNCHECKED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju04-b',
  'item-ju04',
  'Validate assumptions and business risks before acting.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"judgement_quality": 4, "governance_quality": 2}',
  '["ANALYTICAL_ASSUMPTION_CHALLENGED", "EVIDENCE_STRENGTH_REASSESSED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju04-c',
  'item-ju04',
  'Reject the recommendation without review.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"judgement_quality": 1, "governance_quality": 1}',
  '["DIRECTIONALLY_RIGHT_SCOPE_WRONG"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju04-d',
  'item-ju04',
  'Delay indefinitely.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"judgement_quality": -2, "avoidance_risk": 2}',
  '["REBUILD_INSTEAD_OF_TARGETED_CHECK"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ju05',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI flags an employee as high risk for future misconduct or failure.

Constraint: A manager asks if immediate action should be taken.

What do you do?',
  '{"interaction_id": "JU-05", "title": "High-Risk Employee Flag", "scenario": "AI flags an employee as high risk for future misconduct or failure.", "constraint": "A manager asks if immediate action should be taken.", "question": "What do you do?", "capability": "AI Judgement", "capability_key": "judgement", "workflow": "Employee Relations", "risk_level": "High", "primary_signal": "judgement_quality", "secondary_signals": ["over_reliance_risk"], "display_order": 25}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju05-a',
  'item-ju05',
  'Act immediately based on the flag.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"judgement_quality": -4, "over_reliance_risk": -1, "governance_quality": -1}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju05-b',
  'item-ju05',
  'Investigate independently before any action.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"judgement_quality": 4, "over_reliance_risk": 2}',
  '["CORRECT_AI_BOUNDARY", "RESTRICTED_USE_RECOGNISED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju05-c',
  'item-ju05',
  'Ignore the flag.',
  'C',
  3,
  0,
  0.25,
  'Low',
  '{"judgement_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju05-d',
  'item-ju05',
  'Escalate to a senior stakeholder without checking further.',
  'D',
  4,
  0,
  0.5,
  'Partial',
  '{"judgement_quality": 1, "over_reliance_risk": 1, "avoidance_risk": 1}',
  '["CAUTIOUS_BUT_DEFENSIBLE"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ju06',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI suggests that engagement is driving performance because the two variables are strongly correlated.

Constraint: A leader asks whether to act on the finding immediately.

What do you do?',
  '{"interaction_id": "JU-06", "title": "Correlation vs Causation Decision", "scenario": "AI suggests that engagement is driving performance because the two variables are strongly correlated.", "constraint": "A leader asks whether to act on the finding immediately.", "question": "What do you do?", "capability": "AI Data & Insight Interpretation", "capability_key": "data_interpretation", "workflow": "People Analytics", "risk_level": "Medium", "primary_signal": "judgement_quality", "secondary_signals": ["data_interpretation_quality"], "display_order": 26}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju06-a',
  'item-ju06',
  'Act on the insight directly.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"judgement_quality": -4, "data_interpretation_quality": -1}',
  '["ANALYTICAL_CLAIM_ACCEPTED_UNCHECKED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju06-b',
  'item-ju06',
  'Validate whether the relationship is causal or only correlational.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"judgement_quality": 4, "data_interpretation_quality": 2}',
  '["ANALYTICAL_ASSUMPTION_CHALLENGED", "EVIDENCE_STRENGTH_REASSESSED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju06-c',
  'item-ju06',
  'Ignore the finding.',
  'C',
  3,
  0,
  0.25,
  'Low',
  '{"judgement_quality": -2, "avoidance_risk": 2}',
  '["REBUILD_INSTEAD_OF_TARGETED_CHECK"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju06-d',
  'item-ju06',
  'Rebuild the analysis from scratch.',
  'D',
  4,
  0,
  0.5,
  'Partial',
  '{"judgement_quality": 1, "data_interpretation_quality": 1, "over_caution_risk": 1}',
  '["DIRECTIONALLY_RIGHT_SCOPE_WRONG"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ju07',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI predicts future performance outcomes for a set of business units.

Constraint: The prediction aligns with intuition but is based on limited historical variance.

What do you do?',
  '{"interaction_id": "JU-07", "title": "Prediction Reliability", "scenario": "AI predicts future performance outcomes for a set of business units.", "constraint": "The prediction aligns with intuition but is based on limited historical variance.", "question": "What do you do?", "capability": "AI Judgement", "capability_key": "judgement", "workflow": "Strategy", "risk_level": "Medium", "primary_signal": "judgement_quality", "secondary_signals": ["governance_quality"], "display_order": 27}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju07-a',
  'item-ju07',
  'Trust the prediction.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"judgement_quality": -4, "governance_quality": -1, "over_reliance_risk": 2}',
  '["ANALYTICAL_CLAIM_ACCEPTED_UNCHECKED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju07-b',
  'item-ju07',
  'Use it as directional input only.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"judgement_quality": 4, "governance_quality": 2}',
  '["ANALYTICAL_ASSUMPTION_CHALLENGED", "EVIDENCE_STRENGTH_REASSESSED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju07-c',
  'item-ju07',
  'Ignore it completely.',
  'C',
  3,
  0,
  0.25,
  'Low',
  '{"judgement_quality": -2, "avoidance_risk": 2}',
  '["REBUILD_INSTEAD_OF_TARGETED_CHECK"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju07-d',
  'item-ju07',
  'Replace it with manual forecasting only.',
  'D',
  4,
  0,
  0.5,
  'Partial',
  '{"judgement_quality": 1, "governance_quality": 1}',
  '["DIRECTIONALLY_RIGHT_SCOPE_WRONG"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ju08',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI suggests restructuring teams based on workload, cost, and manager span data.

Constraint: Senior leadership wants a recommendation this week.

What do you do?',
  '{"interaction_id": "JU-08", "title": "Team Restructure Recommendation", "scenario": "AI suggests restructuring teams based on workload, cost, and manager span data.", "constraint": "Senior leadership wants a recommendation this week.", "question": "What do you do?", "capability": "AI Judgement", "capability_key": "judgement", "workflow": "Workforce Planning", "risk_level": "High", "primary_signal": "judgement_quality", "secondary_signals": ["—"], "display_order": 28}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju08-a',
  'item-ju08',
  'Implement the AI recommendation.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"judgement_quality": -4, "—": -1, "over_reliance_risk": 2}',
  '["BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju08-b',
  'item-ju08',
  'Validate the key assumptions before using it in planning.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"judgement_quality": 4, "—": 2}',
  '["HUMAN_JUDGEMENT_RETAINED", "CORRECT_AI_BOUNDARY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju08-c',
  'item-ju08',
  'Reject AI use in planning.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"judgement_quality": 1, "—": 1, "avoidance_risk": 1}',
  '["CAUTIOUS_BUT_DEFENSIBLE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju08-d',
  'item-ju08',
  'Delay without review.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"judgement_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ju09',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI proposes a mitigation strategy for a recurring operational issue.

Constraint: You need to respond quickly.

What do you do?',
  '{"interaction_id": "JU-09", "title": "Risk Mitigation Recommendation", "scenario": "AI proposes a mitigation strategy for a recurring operational issue.", "constraint": "You need to respond quickly.", "question": "What do you do?", "capability": "AI Judgement", "capability_key": "judgement", "workflow": "Operations", "risk_level": "Medium", "primary_signal": "judgement_quality", "secondary_signals": ["timing_integrity"], "display_order": 29}',
  1,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju09-a',
  'item-ju09',
  'Apply it immediately.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"judgement_quality": -4, "timing_integrity": -1, "over_reliance_risk": 2}',
  '["BLIND_AI_ACCEPTANCE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju09-b',
  'item-ju09',
  'Review the key risks and then decide.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"judgement_quality": 4, "timing_integrity": 2}',
  '["HUMAN_JUDGEMENT_RETAINED", "CORRECT_AI_BOUNDARY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju09-c',
  'item-ju09',
  'Ignore it.',
  'C',
  3,
  0,
  0.25,
  'Low',
  '{"judgement_quality": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju09-d',
  'item-ju09',
  'Replace it with a manual approach.',
  'D',
  4,
  0,
  0.5,
  'Partial',
  '{"judgement_quality": 1, "timing_integrity": 1}',
  '["CAUTIOUS_BUT_DEFENSIBLE"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ju10',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI recommendation is based on incomplete workforce data, but the recommendation appears strong and aligns with current leadership thinking.

Constraint: You have limited time before the recommendation is discussed.

What do you do?',
  '{"interaction_id": "JU-10", "title": "Recommendation Based on Incomplete Data", "scenario": "AI recommendation is based on incomplete workforce data, but the recommendation appears strong and aligns with current leadership thinking.", "constraint": "You have limited time before the recommendation is discussed.", "question": "What do you do?", "capability": "AI Judgement", "capability_key": "judgement", "workflow": "Reward", "risk_level": "Medium", "primary_signal": "judgement_quality", "secondary_signals": ["over_reliance_risk", "discrimination_quality"], "display_order": 30}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju10-a',
  'item-ju10',
  'Accept it because it aligns with current thinking.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"judgement_quality": -4, "over_reliance_risk": 1}',
  '["ANALYTICAL_CLAIM_ACCEPTED_UNCHECKED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju10-b',
  'item-ju10',
  'Adjust the decision approach and validate critical gaps.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"judgement_quality": 4, "over_reliance_risk": 2, "discrimination_quality": 1}',
  '["ANALYTICAL_ASSUMPTION_CHALLENGED", "EVIDENCE_STRENGTH_REASSESSED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju10-c',
  'item-ju10',
  'Reject it completely.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"judgement_quality": 1, "over_reliance_risk": 1}',
  '["DIRECTIONALLY_RIGHT_SCOPE_WRONG"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ju10-d',
  'item-ju10',
  'Delay the meeting.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"judgement_quality": -2, "avoidance_risk": 2}',
  '["REBUILD_INSTEAD_OF_TARGETED_CHECK"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-va01',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI produces an attrition prediction report with a sharp spike in one region and several cosmetic imperfections.

Constraint: You can validate one thing only before sharing.

What do you validate first?',
  '{"interaction_id": "VA-01", "title": "Targeted Validation in Attrition Report", "scenario": "AI produces an attrition prediction report with a sharp spike in one region and several cosmetic imperfections.", "constraint": "You can validate one thing only before sharing.", "question": "What do you validate first?", "capability": "Validation / Prioritisation", "capability_key": "execution", "workflow": "People Analytics", "risk_level": "Medium", "primary_signal": "validation_accuracy", "secondary_signals": ["prioritisation_quality"], "display_order": 31}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va01-b',
  'item-va01',
  'The data accuracy behind the regional spike.',
  'B',
  1,
  1,
  1.0,
  'Full',
  '{"validation_accuracy": 4, "prioritisation_quality": 2}',
  '["MATERIAL_ASSUMPTION_CHECK", "DECISION_RELEVANT_ELEMENT_SELECTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va01-c',
  'item-va01',
  'Duplicated labels.',
  'C',
  2,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "cosmetic_focus_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va01-d',
  'item-va01',
  'The length of the explanation.',
  'D',
  3,
  0,
  0.5,
  'Partial',
  '{"validation_accuracy": 1, "prioritisation_quality": 1}',
  '["SECOND_ORDER_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va01-a',
  'item-va01',
  'Formatting inconsistencies.',
  'A',
  4,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "cosmetic_focus_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-va02',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI provides a persuasive conclusion from a complex dataset. The conclusion looks well written but the underlying data has not been reviewed.

Constraint: You can validate one thing before the recommendation is presented.

What do you choose?',
  '{"interaction_id": "VA-02", "title": "Data Inputs vs Conclusions", "scenario": "AI provides a persuasive conclusion from a complex dataset. The conclusion looks well written but the underlying data has not been reviewed.", "constraint": "You can validate one thing before the recommendation is presented.", "question": "What do you choose?", "capability": "Validation", "capability_key": "execution", "workflow": "Strategy", "risk_level": "Medium", "primary_signal": "validation_accuracy", "secondary_signals": ["—"], "display_order": 32}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va02-b',
  'item-va02',
  'Data inputs and source reliability.',
  'B',
  1,
  1,
  1.0,
  'Full',
  '{"validation_accuracy": 4, "—": 2}',
  '["MATERIAL_ASSUMPTION_CHECK", "DECISION_RELEVANT_ELEMENT_SELECTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va02-d',
  'item-va02',
  'Tone.',
  'D',
  2,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "cosmetic_focus_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va02-a',
  'item-va02',
  'Language quality.',
  'A',
  3,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "avoidance_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va02-c',
  'item-va02',
  'Formatting.',
  'C',
  4,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "cosmetic_focus_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-va03',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI shortlist appears accurate against historical outcomes but may be embedding demographic bias.

Constraint: You have limited time to review.

What do you prioritise?',
  '{"interaction_id": "VA-03", "title": "Bias vs Accuracy", "scenario": "AI shortlist appears accurate against historical outcomes but may be embedding demographic bias.", "constraint": "You have limited time to review.", "question": "What do you prioritise?", "capability": "Validation", "capability_key": "execution", "workflow": "Recruitment", "risk_level": "High", "primary_signal": "validation_accuracy", "secondary_signals": ["governance_quality"], "display_order": 33}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va03-a',
  'item-va03',
  'General accuracy only.',
  'A',
  1,
  0,
  0.5,
  'Partial',
  '{"validation_accuracy": 1, "governance_quality": 1}',
  '["SECOND_ORDER_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va03-b',
  'item-va03',
  'Bias and fairness risk.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"validation_accuracy": 4, "governance_quality": 2}',
  '["MATERIAL_ASSUMPTION_CHECK", "DECISION_RELEVANT_ELEMENT_SELECTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va03-d',
  'item-va03',
  'Speed of release.',
  'D',
  3,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "avoidance_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va03-c',
  'item-va03',
  'Formatting.',
  'C',
  4,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "cosmetic_focus_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-va04',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI produces a low-risk internal draft summary that is likely to be edited before any external use.

Constraint: You have limited time.

What level of validation is appropriate?',
  '{"interaction_id": "VA-04", "title": "Minimal Validation for Low-Risk Draft", "scenario": "AI produces a low-risk internal draft summary that is likely to be edited before any external use.", "constraint": "You have limited time.", "question": "What level of validation is appropriate?", "capability": "Validation", "capability_key": "execution", "workflow": "Operations", "risk_level": "Low", "primary_signal": "validation_accuracy", "secondary_signals": ["timing_integrity"], "display_order": 34}',
  1,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va04-a',
  'item-va04',
  'Full validation line by line.',
  'A',
  1,
  0,
  0.5,
  'Partial',
  '{"validation_accuracy": 1, "timing_integrity": 1, "over_caution_risk": 1}',
  '["OVER_VALIDATION_LOW_RISK"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va04-b',
  'item-va04',
  'A quick sense-check of material content.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"validation_accuracy": 4, "timing_integrity": 2}',
  '["PROPORTIONATE_VALIDATION", "SAMPLED_VALIDATION_APPROPRIATE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va04-c',
  'item-va04',
  'No check at all.',
  'C',
  3,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_REBUILD"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va04-d',
  'item-va04',
  'Rebuild the whole document.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "over_caution_risk": 2}',
  '["UNNECESSARY_REBUILD"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-va05',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI produces a mostly correct internal report.

Constraint: You need to decide how much to validate.

What do you do?',
  '{"interaction_id": "VA-05", "title": "Over-Validation Trap", "scenario": "AI produces a mostly correct internal report.", "constraint": "You need to decide how much to validate.", "question": "What do you do?", "capability": "Validation", "capability_key": "execution", "workflow": "Learning", "risk_level": "Low", "primary_signal": "validation_accuracy", "secondary_signals": ["over_caution_risk"], "display_order": 35}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va05-a',
  'item-va05',
  'Validate everything thoroughly.',
  'A',
  1,
  0,
  0.5,
  'Partial',
  '{"validation_accuracy": 1, "over_caution_risk": 2}',
  '["OVER_VALIDATION_LOW_RISK"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va05-b',
  'item-va05',
  'Validate critical elements only.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"validation_accuracy": 4, "over_caution_risk": 2}',
  '["PROPORTIONATE_VALIDATION", "SAMPLED_VALIDATION_APPROPRIATE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va05-d',
  'item-va05',
  'Rebuild manually.',
  'D',
  3,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "over_caution_risk": 2}',
  '["UNNECESSARY_REBUILD"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va05-c',
  'item-va05',
  'Accept fully without review.',
  'C',
  4,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "over_reliance_risk": 2}',
  '["UNNECESSARY_REBUILD"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-va06',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'A large dataset has been processed by AI. Full review is possible but costly.

Constraint: You need to choose a validation strategy.

What do you do?',
  '{"interaction_id": "VA-06", "title": "Sampling vs Full Review", "scenario": "A large dataset has been processed by AI. Full review is possible but costly.", "constraint": "You need to choose a validation strategy.", "question": "What do you do?", "capability": "Validation", "capability_key": "execution", "workflow": "Analytics", "risk_level": "Medium", "primary_signal": "validation_accuracy", "secondary_signals": ["prioritisation_quality"], "display_order": 36}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va06-a',
  'item-va06',
  'Review every record.',
  'A',
  1,
  0,
  0.5,
  'Partial',
  '{"validation_accuracy": 1, "prioritisation_quality": 1, "over_caution_risk": 1}',
  '["OVER_VALIDATION_LOW_RISK"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va06-b',
  'item-va06',
  'Sample key records and test the highest-risk segments.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"validation_accuracy": 4, "prioritisation_quality": 2}',
  '["PROPORTIONATE_VALIDATION", "SAMPLED_VALIDATION_APPROPRIATE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va06-c',
  'item-va06',
  'Trust the output.',
  'C',
  3,
  0,
  0.0,
  'Fail',
  '{"validation_accuracy": -4, "prioritisation_quality": -1, "over_reliance_risk": 2}',
  '["UNDER_VALIDATION_HIGH_RISK"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va06-d',
  'item-va06',
  'Re-run everything immediately.',
  'D',
  4,
  0,
  0.5,
  'Partial',
  '{"validation_accuracy": 1, "prioritisation_quality": 1}',
  '["OVER_VALIDATION_LOW_RISK"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-va07',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'An AI conclusion depends on hidden assumptions about future demand and staffing ratios.

Constraint: You need to validate one aspect.

What do you focus on?',
  '{"interaction_id": "VA-07", "title": "Assumptions vs Results", "scenario": "An AI conclusion depends on hidden assumptions about future demand and staffing ratios.", "constraint": "You need to validate one aspect.", "question": "What do you focus on?", "capability": "Validation", "capability_key": "execution", "workflow": "Workforce Planning", "risk_level": "Medium", "primary_signal": "validation_accuracy", "secondary_signals": ["data_interpretation_quality"], "display_order": 37}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va07-a',
  'item-va07',
  'The final recommended number.',
  'A',
  1,
  0,
  0.5,
  'Partial',
  '{"validation_accuracy": 1, "data_interpretation_quality": 1}',
  '["SECOND_ORDER_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va07-b',
  'item-va07',
  'The assumptions underneath the recommendation.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"validation_accuracy": 4, "data_interpretation_quality": 2}',
  '["MATERIAL_ASSUMPTION_CHECK", "DECISION_RELEVANT_ELEMENT_SELECTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va07-d',
  'item-va07',
  'The wording of the summary.',
  'D',
  3,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "avoidance_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va07-c',
  'item-va07',
  'The design of the chart.',
  'C',
  4,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "avoidance_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-va08',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI produces a clear and attractive report, but the reasoning behind one recommendation seems weak.

Constraint: You can only check one thing before forwarding it.

What do you choose?',
  '{"interaction_id": "VA-08", "title": "Logic vs Formatting", "scenario": "AI produces a clear and attractive report, but the reasoning behind one recommendation seems weak.", "constraint": "You can only check one thing before forwarding it.", "question": "What do you choose?", "capability": "Validation", "capability_key": "execution", "workflow": "Reward", "risk_level": "Medium", "primary_signal": "validation_accuracy", "secondary_signals": ["—"], "display_order": 38}',
  1,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va08-b',
  'item-va08',
  'The logic behind the recommendation.',
  'B',
  1,
  1,
  1.0,
  'Full',
  '{"validation_accuracy": 4, "—": 2}',
  '["MATERIAL_ASSUMPTION_CHECK", "DECISION_RELEVANT_ELEMENT_SELECTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va08-d',
  'item-va08',
  'Length.',
  'D',
  2,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "avoidance_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va08-a',
  'item-va08',
  'Formatting.',
  'A',
  3,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "cosmetic_focus_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-va08-c',
  'item-va08',
  'Tone.',
  'C',
  4,
  0,
  0.25,
  'Low',
  '{"validation_accuracy": -2, "cosmetic_focus_risk": 2}',
  '["IRRELEVANT_VALIDATION_TARGET"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ap01',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'A manager proposes using AI to rank employees for redundancy selection.

Constraint: The decision process is under time pressure.

What do you do?',
  '{"interaction_id": "AP-01", "title": "Redundancy Ranking by AI", "scenario": "A manager proposes using AI to rank employees for redundancy selection.", "constraint": "The decision process is under time pressure.", "question": "What do you do?", "capability": "AI Appropriateness", "capability_key": "appropriateness", "workflow": "Workforce Planning", "risk_level": "High", "primary_signal": "appropriateness_boundary", "secondary_signals": ["governance_quality", "judgement_quality"], "display_order": 39}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap01-a',
  'item-ap01',
  'Use the AI ranking directly.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"appropriateness_boundary": -4, "governance_quality": -3, "automation_expansion_risk": 2}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap01-b',
  'item-ap01',
  'Use AI as one input, with human judgement and review.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"appropriateness_boundary": 4, "governance_quality": 2, "judgement_quality": 1}',
  '["CORRECT_AI_BOUNDARY", "RESTRICTED_USE_RECOGNISED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap01-c',
  'item-ap01',
  'Reject AI use for this decision.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"appropriateness_boundary": 1, "governance_quality": 1, "avoidance_risk": 1}',
  '["CAUTIOUS_BUT_DEFENSIBLE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap01-d',
  'item-ap01',
  'Delay the decision.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"appropriateness_boundary": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ap02',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI flags an employee for potential misconduct risk.

Constraint: A manager asks if this should trigger action immediately.

What do you do?',
  '{"interaction_id": "AP-02", "title": "Disciplinary Action Flag", "scenario": "AI flags an employee for potential misconduct risk.", "constraint": "A manager asks if this should trigger action immediately.", "question": "What do you do?", "capability": "AI Appropriateness", "capability_key": "appropriateness", "workflow": "Employee Relations", "risk_level": "High", "primary_signal": "appropriateness_boundary", "secondary_signals": ["over_reliance_risk"], "display_order": 40}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap02-a',
  'item-ap02',
  'Act on the AI recommendation.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"appropriateness_boundary": -4, "over_reliance_risk": -1, "governance_quality": -2}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap02-b',
  'item-ap02',
  'Investigate independently before any action.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"appropriateness_boundary": 4, "over_reliance_risk": 2}',
  '["CORRECT_AI_BOUNDARY", "RESTRICTED_USE_RECOGNISED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap02-c',
  'item-ap02',
  'Ignore the signal.',
  'C',
  3,
  0,
  0.25,
  'Low',
  '{"appropriateness_boundary": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap02-d',
  'item-ap02',
  'Escalate without review.',
  'D',
  4,
  0,
  0.5,
  'Partial',
  '{"appropriateness_boundary": 1, "over_reliance_risk": 1, "avoidance_risk": 1}',
  '["CAUTIOUS_BUT_DEFENSIBLE"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ap03',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI suggests salary adjustments based on historical pay patterns.

Constraint: A leader wants a quick recommendation.

What is your approach?',
  '{"interaction_id": "AP-03", "title": "Salary Recommendation by AI", "scenario": "AI suggests salary adjustments based on historical pay patterns.", "constraint": "A leader wants a quick recommendation.", "question": "What is your approach?", "capability": "AI Appropriateness", "capability_key": "appropriateness", "workflow": "Reward", "risk_level": "High", "primary_signal": "appropriateness_boundary", "secondary_signals": ["judgement_quality"], "display_order": 41}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap03-a',
  'item-ap03',
  'Apply the changes directly.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"appropriateness_boundary": -4, "judgement_quality": -1, "automation_expansion_risk": 2, "governance_quality": -2}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap03-b',
  'item-ap03',
  'Use AI as input with human review.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"appropriateness_boundary": 4, "judgement_quality": 2}',
  '["CORRECT_AI_BOUNDARY", "RESTRICTED_USE_RECOGNISED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap03-c',
  'item-ap03',
  'Reject AI entirely.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"appropriateness_boundary": 1, "judgement_quality": 1, "avoidance_risk": 1}',
  '["CAUTIOUS_BUT_DEFENSIBLE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap03-d',
  'item-ap03',
  'Delay the conversation.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"appropriateness_boundary": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ap04',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'A vendor proposes an AI tool that continuously tracks employee productivity and flags low performers.

Constraint: Leadership is attracted to the speed and visibility it promises.

What do you do?',
  '{"interaction_id": "AP-04", "title": "Employee Monitoring Tool", "scenario": "A vendor proposes an AI tool that continuously tracks employee productivity and flags low performers.", "constraint": "Leadership is attracted to the speed and visibility it promises.", "question": "What do you do?", "capability": "AI Appropriateness", "capability_key": "appropriateness", "workflow": "Monitoring", "risk_level": "High", "primary_signal": "appropriateness_boundary", "secondary_signals": ["governance_quality"], "display_order": 42}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap04-a',
  'item-ap04',
  'Implement fully.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"appropriateness_boundary": -4, "governance_quality": -3, "automation_expansion_risk": 2}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap04-b',
  'item-ap04',
  'Assess legal, ethical, and practical implications before proceeding.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"appropriateness_boundary": 4, "governance_quality": 2, "automation_expansion_risk": 1}',
  '["PROPORTIONATE_GOVERNANCE_RESPONSE", "RISK_INTERRUPTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap04-c',
  'item-ap04',
  'Reject immediately without review.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"appropriateness_boundary": 1, "governance_quality": 1}',
  '["PARTIAL_MITIGATION_ONLY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap04-d',
  'item-ap04',
  'Ignore the proposal.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"appropriateness_boundary": -2, "avoidance_risk": 2}',
  '["CAUTIOUS_BUT_UNDERANALYSED"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ap05',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI offers recommendations in a sensitive grievance case involving interpersonal conflict.

Constraint: The case requires emotional and contextual nuance.

What is your approach?',
  '{"interaction_id": "AP-05", "title": "AI in Sensitive Grievance Case", "scenario": "AI offers recommendations in a sensitive grievance case involving interpersonal conflict.", "constraint": "The case requires emotional and contextual nuance.", "question": "What is your approach?", "capability": "AI Appropriateness", "capability_key": "appropriateness", "workflow": "Employee Relations", "risk_level": "High", "primary_signal": "appropriateness_boundary", "secondary_signals": ["judgement_quality"], "display_order": 43}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap05-a',
  'item-ap05',
  'Follow the AI recommendation.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"appropriateness_boundary": -4, "judgement_quality": -1, "automation_expansion_risk": 2, "governance_quality": -2}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap05-b',
  'item-ap05',
  'Use the AI output only as a secondary input to human judgement.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"appropriateness_boundary": 4, "judgement_quality": 2, "automation_expansion_risk": 1}',
  '["CORRECT_AI_BOUNDARY", "RESTRICTED_USE_RECOGNISED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap05-c',
  'item-ap05',
  'Ignore AI entirely.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"appropriateness_boundary": 1, "judgement_quality": 1, "avoidance_risk": 1}',
  '["CAUTIOUS_BUT_DEFENSIBLE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap05-d',
  'item-ap05',
  'Delay action.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"appropriateness_boundary": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-ap06',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'AI suggests a wellbeing intervention for an employee based on communication patterns and absence data.

Constraint: The case may require sensitive human contact and trust.

What do you do?',
  '{"interaction_id": "AP-06", "title": "Wellbeing Intervention Decision", "scenario": "AI suggests a wellbeing intervention for an employee based on communication patterns and absence data.", "constraint": "The case may require sensitive human contact and trust.", "question": "What do you do?", "capability": "AI Appropriateness", "capability_key": "appropriateness", "workflow": "Wellbeing", "risk_level": "High", "primary_signal": "appropriateness_boundary", "secondary_signals": ["judgement_quality"], "display_order": 44}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap06-a',
  'item-ap06',
  'Use the AI recommendation directly.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"appropriateness_boundary": -4, "judgement_quality": -1, "automation_expansion_risk": 2, "governance_quality": -2}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap06-b',
  'item-ap06',
  'Use human judgement primarily and treat AI as a weak input only.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"appropriateness_boundary": 4, "judgement_quality": 2}',
  '["CORRECT_AI_BOUNDARY", "RESTRICTED_USE_RECOGNISED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap06-c',
  'item-ap06',
  'Ignore all AI in wellbeing work.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"appropriateness_boundary": 1, "judgement_quality": 1}',
  '["CAUTIOUS_BUT_DEFENSIBLE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-ap06-d',
  'item-ap06',
  'Delay until more data is available.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"appropriateness_boundary": -2, "avoidance_risk": 2}',
  '["UNNECESSARY_DELAY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-rg01',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'An AI model trained on historical hiring data produces skewed outcomes across groups.

Constraint: You must respond quickly but cannot ignore the risk.

What do you do?',
  '{"interaction_id": "RG-01", "title": "Bias Detection in Hiring Model", "scenario": "An AI model trained on historical hiring data produces skewed outcomes across groups.", "constraint": "You must respond quickly but cannot ignore the risk.", "question": "What do you do?", "capability": "AI Risk & Governance", "capability_key": "governance", "workflow": "Recruitment", "risk_level": "High", "primary_signal": "governance_quality", "secondary_signals": ["appropriateness_boundary", "validation_accuracy"], "display_order": 45}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg01-a',
  'item-rg01',
  'Ignore the issue unless someone complains.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"governance_quality": -6, "appropriateness_boundary": -1}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg01-b',
  'item-rg01',
  'Investigate and test for bias before continued use.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"governance_quality": 4, "appropriateness_boundary": 2, "validation_accuracy": 1}',
  '["PROPORTIONATE_GOVERNANCE_RESPONSE", "RISK_INTERRUPTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg01-c',
  'item-rg01',
  'Retrain the model immediately without diagnosis.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"governance_quality": 1, "appropriateness_boundary": 1}',
  '["PARTIAL_MITIGATION_ONLY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg01-d',
  'item-rg01',
  'Use it cautiously but keep it live.',
  'D',
  4,
  0,
  0.5,
  'Partial',
  '{"governance_quality": 1, "appropriateness_boundary": 1}',
  '["PARTIAL_MITIGATION_ONLY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-rg02',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'An AI tool processes employee personal data without a clearly documented basis or explicit internal permission model.

Constraint: The tool promises valuable productivity insights.

What do you do?',
  '{"interaction_id": "RG-02", "title": "Employee Data Without Clear Consent", "scenario": "An AI tool processes employee personal data without a clearly documented basis or explicit internal permission model.", "constraint": "The tool promises valuable productivity insights.", "question": "What do you do?", "capability": "AI Risk & Governance", "capability_key": "governance", "workflow": "Monitoring", "risk_level": "High", "primary_signal": "governance_quality", "secondary_signals": ["appropriateness_boundary", "validation_accuracy"], "display_order": 46}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg02-a',
  'item-rg02',
  'Proceed because the insight is useful.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"governance_quality": -6, "appropriateness_boundary": -1, "over_reliance_risk": 2}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg02-b',
  'item-rg02',
  'Assess legal and policy compliance before continuing.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"governance_quality": 4, "appropriateness_boundary": 2, "validation_accuracy": 1}',
  '["PROPORTIONATE_GOVERNANCE_RESPONSE", "RISK_INTERRUPTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg02-c',
  'item-rg02',
  'Ignore the issue for now.',
  'C',
  3,
  0,
  0.25,
  'Low',
  '{"governance_quality": -2, "avoidance_risk": 2}',
  '["CAUTIOUS_BUT_UNDERANALYSED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg02-d',
  'item-rg02',
  'Delay discussion without analysis.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"governance_quality": -2, "avoidance_risk": 2}',
  '["CAUTIOUS_BUT_UNDERANALYSED"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-rg03',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'Sensitive organisational data has been entered into an external AI tool that is not clearly approved for that purpose.

Constraint: You become aware of it after the fact.

What is your response?',
  '{"interaction_id": "RG-03", "title": "Sensitive Data in External AI Tool", "scenario": "Sensitive organisational data has been entered into an external AI tool that is not clearly approved for that purpose.", "constraint": "You become aware of it after the fact.", "question": "What is your response?", "capability": "AI Risk & Governance", "capability_key": "governance", "workflow": "Operations", "risk_level": "High", "primary_signal": "governance_quality", "secondary_signals": ["appropriateness_boundary", "validation_accuracy"], "display_order": 47}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg03-a',
  'item-rg03',
  'Continue unless harm is visible.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"governance_quality": -6, "appropriateness_boundary": -1}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg03-b',
  'item-rg03',
  'Stop the use and assess risk immediately.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"governance_quality": 4, "appropriateness_boundary": 2, "validation_accuracy": 1}',
  '["PROPORTIONATE_GOVERNANCE_RESPONSE", "RISK_INTERRUPTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg03-c',
  'item-rg03',
  'Ignore it because the output was helpful.',
  'C',
  3,
  0,
  0.0,
  'Fail',
  '{"governance_quality": -6, "appropriateness_boundary": -1}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg03-d',
  'item-rg03',
  'Report it later if needed.',
  'D',
  4,
  0,
  0.5,
  'Partial',
  '{"governance_quality": 1, "appropriateness_boundary": 1}',
  '["PARTIAL_MITIGATION_ONLY"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-rg04',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'A proposal is made to use AI to track employee productivity invisibly and provide managers with detailed behavioural patterns.

Constraint: No employee communication plan exists.

What do you do?',
  '{"interaction_id": "RG-04", "title": "Ethical Transparency in Monitoring", "scenario": "A proposal is made to use AI to track employee productivity invisibly and provide managers with detailed behavioural patterns.", "constraint": "No employee communication plan exists.", "question": "What do you do?", "capability": "AI Risk & Governance", "capability_key": "governance", "workflow": "Monitoring", "risk_level": "High", "primary_signal": "governance_quality", "secondary_signals": ["appropriateness_boundary", "validation_accuracy"], "display_order": 48}',
  3,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg04-a',
  'item-rg04',
  'Accept the tool because transparency can be handled later.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"governance_quality": -6, "appropriateness_boundary": -1, "over_reliance_risk": 2}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg04-b',
  'item-rg04',
  'Evaluate ethics, transparency, and necessity before proceeding.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"governance_quality": 4, "appropriateness_boundary": 2, "validation_accuracy": 1, "over_reliance_risk": 1}',
  '["PROPORTIONATE_GOVERNANCE_RESPONSE", "RISK_INTERRUPTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg04-c',
  'item-rg04',
  'Reject immediately with no further analysis.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"governance_quality": 1, "appropriateness_boundary": 1}',
  '["PARTIAL_MITIGATION_ONLY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg04-d',
  'item-rg04',
  'Ignore the concern.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"governance_quality": -2, "avoidance_risk": 2}',
  '["CAUTIOUS_BUT_UNDERANALYSED"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-rg05',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'Employees are using unapproved AI tools in normal work because approved tools are limited and slower.

Constraint: Leadership is aware but has no current policy.

What do you do?',
  '{"interaction_id": "RG-05", "title": "Shadow AI Usage", "scenario": "Employees are using unapproved AI tools in normal work because approved tools are limited and slower.", "constraint": "Leadership is aware but has no current policy.", "question": "What do you do?", "capability": "AI Risk & Governance", "capability_key": "governance", "workflow": "General", "risk_level": "Medium", "primary_signal": "governance_quality", "secondary_signals": ["appropriateness_boundary"], "display_order": 49}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg05-a',
  'item-rg05',
  'Ignore the behaviour because it improves speed.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"governance_quality": -4, "appropriateness_boundary": -1}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg05-b',
  'item-rg05',
  'Investigate usage patterns and define policy and approved alternatives.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"governance_quality": 4, "appropriateness_boundary": 2}',
  '["PROPORTIONATE_GOVERNANCE_RESPONSE", "RISK_INTERRUPTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg05-c',
  'item-rg05',
  'Ban all use immediately without review.',
  'C',
  3,
  0,
  0.5,
  'Partial',
  '{"governance_quality": 1, "appropriateness_boundary": 1}',
  '["PARTIAL_MITIGATION_ONLY"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg05-d',
  'item-rg05',
  'Delay response.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"governance_quality": -2, "avoidance_risk": 2}',
  '["CAUTIOUS_BUT_UNDERANALYSED"]'
);

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`) VALUES (
  'item-rg06',
  'bp-aiq-v9-standard',
  'scenario_mcq',
  'An AI-enabled process may breach internal policy but has not yet caused visible harm.

Constraint: A team leader asks whether to keep going while the issue is clarified.

What do you do?',
  '{"interaction_id": "RG-06", "title": "Possible Compliance Breach", "scenario": "An AI-enabled process may breach internal policy but has not yet caused visible harm.", "constraint": "A team leader asks whether to keep going while the issue is clarified.", "question": "What do you do?", "capability": "AI Risk & Governance", "capability_key": "governance", "workflow": "Strategy", "risk_level": "High", "primary_signal": "governance_quality", "secondary_signals": ["appropriateness_boundary", "validation_accuracy"], "display_order": 50}',
  2,
  'published'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg06-a',
  'item-rg06',
  'Proceed until told otherwise.',
  'A',
  1,
  0,
  0.0,
  'Fail',
  '{"governance_quality": -6, "appropriateness_boundary": -1, "over_reliance_risk": 2}',
  '["POLICY_RISK_IGNORED", "CRITICAL_FAILURE"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg06-b',
  'item-rg06',
  'Assess compliance impact before continuing.',
  'B',
  2,
  1,
  1.0,
  'Full',
  '{"governance_quality": 4, "appropriateness_boundary": 2, "validation_accuracy": 1}',
  '["PROPORTIONATE_GOVERNANCE_RESPONSE", "RISK_INTERRUPTED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg06-c',
  'item-rg06',
  'Ignore the concern because nothing has happened yet.',
  'C',
  3,
  0,
  0.25,
  'Low',
  '{"governance_quality": -2, "avoidance_risk": 2}',
  '["CAUTIOUS_BUT_UNDERANALYSED"]'
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `event_codes_json`) VALUES (
  'opt-rg06-d',
  'item-rg06',
  'Delay the conversation.',
  'D',
  4,
  0,
  0.25,
  'Low',
  '{"governance_quality": -2, "avoidance_risk": 2}',
  '["CAUTIOUS_BUT_UNDERANALYSED"]'
);
