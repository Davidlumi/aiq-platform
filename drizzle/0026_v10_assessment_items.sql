-- ============================================================
-- AIQ v10 Assessment Blueprint + 30 Practical AI Skills Items
-- AR-1 through AR-7: Assessment Redesign — Practical AI Skills
-- Domains: ai_interaction, ai_output_evaluation, ai_workflow_design,
--          workforce_ai_readiness, ai_ethics_trust, ai_change_leadership
-- ============================================================

-- Remove old v9 blueprint and items (replace with v10)
DELETE FROM `assessment_item_options` WHERE `item_id` IN (SELECT `id` FROM `assessment_items` WHERE `blueprint_id` = 'bp-aiq-v9-standard');
DELETE FROM `assessment_items` WHERE `blueprint_id` = 'bp-aiq-v9-standard';
DELETE FROM `assessment_blueprints` WHERE `id` = 'bp-aiq-v9-standard';

-- Insert v10 blueprint
INSERT INTO `assessment_blueprints` (`id`, `tenant_id`, `key`, `name`, `version`, `status`, `role_scope_json`, `structure_json`) VALUES (
  'bp-aiq-v10-standard',
  'tenant-demo-001',
  'aiq_v10_standard',
  'AIQ Capability Assessment — v10 Practical AI Skills',
  10,
  'published',
  '{"all": true}',
  '{"methodology_version": "v10", "total_items": 30, "estimated_duration_minutes": 20, "adaptive": true, "scoring_model": "signal_delta_v10", "capabilities": ["ai_interaction", "ai_output_evaluation", "ai_workflow_design", "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership"], "description": "The AIQ v10 Practical AI Skills Assessment measures AI capability across six domains using 30 scenario-based interactions grounded in real HR workflows. Each scenario tests practical competence: prompting AI tools, evaluating AI output, designing AI-augmented workflows, preparing the workforce, upholding ethics and trust, and leading AI change."}'
);

-- ============================================================
-- DOMAIN 1: AI INTERACTION (5 items)
-- Signals: prompt_construction_quality, prompt_iteration_quality,
--          output_direction_skill, tool_fluency_index
-- ============================================================

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-int-01',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'You ask an AI chatbot to draft a job description for a Senior People Partner role. The output is generic — it could apply to any HR role and does not reflect your organisation''s culture or the specific responsibilities you outlined in a briefing document you uploaded.\n\nWhat is your most effective next step?',
  '{"capability_key": "ai_interaction", "primary_signal": "prompt_iteration_quality", "secondary_signals": ["prompt_construction_quality"], "workflow": "Recruitment", "risk_level": "Low", "display_order": 1}',
  1,
  'published',
  0
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-int-01-a', 'v10-ai-int-01', 'Accept the output and edit it manually to add the missing specifics.', 'A', 1, 0, 0.20, 'Partial', '{"prompt_iteration_quality": -0.3, "prompt_construction_quality": -0.2}', 'Manual editing is a valid fallback but misses the opportunity to improve the prompt and learn from the iteration.'),
  ('v10-ai-int-01-b', 'v10-ai-int-01', 'Refine your prompt: explicitly reference the briefing document, specify the culture values, and list the three key responsibilities that must appear.', 'B', 2, 1, 1.00, 'Pass', '{"prompt_iteration_quality": 1.0, "prompt_construction_quality": 0.8}', 'Targeted prompt refinement is the correct approach — it leverages the AI''s capability and produces a better output efficiently.'),
  ('v10-ai-int-01-c', 'v10-ai-int-01', 'Switch to a different AI tool that might produce better output.', 'C', 3, 0, 0.10, 'Fail', '{"prompt_iteration_quality": -0.5, "tool_fluency_index": -0.3}', 'Switching tools without improving the prompt is unlikely to resolve the root cause, which is prompt quality.'),
  ('v10-ai-int-01-d', 'v10-ai-int-01', 'Ask a colleague to write the job description instead.', 'D', 4, 0, 0.00, 'Fail', '{"prompt_iteration_quality": -0.8, "tool_fluency_index": -0.5}', 'Abandoning the AI tool entirely when prompt iteration would resolve the issue is not an effective use of AI capability.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-int-02',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'You are using an AI assistant to analyse employee engagement survey comments. You want it to identify the top three themes and flag any comments that suggest wellbeing risk.\n\nWhich prompt is most likely to produce a useful, structured output?',
  '{"capability_key": "ai_interaction", "primary_signal": "prompt_construction_quality", "secondary_signals": ["output_direction_skill"], "workflow": "Employee Engagement", "risk_level": "Low", "display_order": 2}',
  2,
  'published',
  0
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-int-02-a', 'v10-ai-int-02', '"Analyse these survey comments."', 'A', 1, 0, 0.00, 'Fail', '{"prompt_construction_quality": -1.0, "output_direction_skill": -0.8}', 'This prompt is too vague — the AI has no guidance on what to look for or how to structure the output.'),
  ('v10-ai-int-02-b', 'v10-ai-int-02', '"Read through these comments and tell me what you think."', 'B', 2, 0, 0.10, 'Fail', '{"prompt_construction_quality": -0.8, "output_direction_skill": -0.6}', 'Still too open-ended. The AI cannot determine what constitutes a useful response without clearer direction.'),
  ('v10-ai-int-02-c', 'v10-ai-int-02', '"Identify the top three themes in these survey comments. For each theme, provide a label, a one-sentence summary, and two example quotes. Separately, flag any comments that suggest a wellbeing risk, explaining briefly why each was flagged."', 'C', 3, 1, 1.00, 'Pass', '{"prompt_construction_quality": 1.0, "output_direction_skill": 1.0}', 'This prompt specifies the task, the output structure, and the secondary objective clearly — it will produce a directly usable result.'),
  ('v10-ai-int-02-d', 'v10-ai-int-02', '"Summarise the comments into bullet points."', 'D', 4, 0, 0.20, 'Partial', '{"prompt_construction_quality": -0.3, "output_direction_skill": -0.4}', 'A summary is better than nothing but does not address the theme identification or wellbeing risk flagging requirements.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-int-03',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'You are using an AI agent to help prepare for a difficult conversation with a manager about a performance issue. The first response is helpful but too formal for the relationship you have with this manager.\n\nWhat is the most effective way to adjust the output?',
  '{"capability_key": "ai_interaction", "primary_signal": "prompt_iteration_quality", "secondary_signals": ["output_direction_skill"], "workflow": "Performance Management", "risk_level": "Low", "display_order": 3}',
  1,
  'published',
  0
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-int-03-a', 'v10-ai-int-03', 'Ask the AI to rewrite the response in a more conversational tone, giving it an example of how you typically communicate with this manager.', 'A', 1, 1, 1.00, 'Pass', '{"prompt_iteration_quality": 1.0, "output_direction_skill": 0.8}', 'Providing a tone example is an effective iteration technique — it gives the AI concrete guidance to calibrate the output.'),
  ('v10-ai-int-03-b', 'v10-ai-int-03', 'Accept the formal version and adjust your own tone during the conversation.', 'B', 2, 0, 0.30, 'Partial', '{"prompt_iteration_quality": -0.3, "output_direction_skill": -0.2}', 'This works but misses the value of the AI tool — you could have a better preparation document with a simple prompt refinement.'),
  ('v10-ai-int-03-c', 'v10-ai-int-03', 'Start a new conversation with the AI from scratch.', 'C', 3, 0, 0.10, 'Fail', '{"prompt_iteration_quality": -0.5, "output_direction_skill": -0.3}', 'Starting over is inefficient when a targeted follow-up prompt would resolve the issue.'),
  ('v10-ai-int-03-d', 'v10-ai-int-03', 'Ask a colleague to review and soften the language.', 'D', 4, 0, 0.10, 'Fail', '{"prompt_iteration_quality": -0.6, "tool_fluency_index": -0.4}', 'Involving a colleague for a task the AI can handle with better prompting is not an efficient use of either resource.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-int-04',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'You are exploring a new AI tool for the first time. It has been recommended for writing HR policies. You have an existing policy that needs updating.\n\nWhat is the best way to start?',
  '{"capability_key": "ai_interaction", "primary_signal": "tool_fluency_index", "secondary_signals": ["prompt_construction_quality"], "workflow": "Policy", "risk_level": "Low", "display_order": 4}',
  1,
  'published',
  0
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-int-04-a', 'v10-ai-int-04', 'Paste the entire existing policy and ask the AI to update it without further instruction.', 'A', 1, 0, 0.10, 'Fail', '{"tool_fluency_index": -0.5, "prompt_construction_quality": -0.6}', 'Without specifying what needs updating or why, the AI has no basis for making targeted improvements.'),
  ('v10-ai-int-04-b', 'v10-ai-int-04', 'Start with a small test: paste one section of the policy and ask the AI to update it for a specific change, then review the quality before proceeding.', 'B', 2, 1, 1.00, 'Pass', '{"tool_fluency_index": 1.0, "prompt_construction_quality": 0.8}', 'Testing on a small section first is good practice — it lets you calibrate the tool''s capability before committing to a full document.'),
  ('v10-ai-int-04-c', 'v10-ai-int-04', 'Ask the AI to write a completely new policy from scratch, ignoring the existing one.', 'C', 3, 0, 0.20, 'Partial', '{"tool_fluency_index": -0.3, "prompt_construction_quality": -0.2}', 'Starting from scratch discards institutional knowledge embedded in the existing policy without good reason.'),
  ('v10-ai-int-04-d', 'v10-ai-int-04', 'Wait until you have attended a training course on the tool before using it.', 'D', 4, 0, 0.00, 'Fail', '{"tool_fluency_index": -0.8}', 'Waiting for formal training before any exploration is overly cautious and misses the value of learning by doing in a low-risk context.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-int-05',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'You are using an AI assistant to help draft a redundancy consultation letter. The AI produces a letter that is legally compliant but reads as cold and impersonal. You want to make it more human while keeping the legal accuracy.\n\nConstraint: You have 20 minutes before the letter needs to go to the manager.\n\nWhat do you do?',
  '{"capability_key": "ai_interaction", "primary_signal": "output_direction_skill", "secondary_signals": ["prompt_iteration_quality"], "workflow": "Employee Relations", "risk_level": "High", "display_order": 5}',
  2,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-int-05-a', 'v10-ai-int-05', 'Send the legally compliant version as-is — accuracy matters more than tone in a legal document.', 'A', 1, 0, 0.20, 'Partial', '{"output_direction_skill": -0.5, "prompt_iteration_quality": -0.3}', 'Legal accuracy is essential but tone in a redundancy letter significantly affects employee experience and can affect legal risk if it appears callous.'),
  ('v10-ai-int-05-b', 'v10-ai-int-05', 'Ask the AI to revise the letter with a warmer tone, specifying that the legal content must remain unchanged and providing one example sentence that reflects the desired tone.', 'B', 2, 1, 1.00, 'Pass', '{"output_direction_skill": 1.0, "prompt_iteration_quality": 0.9}', 'This is the optimal approach — directing the AI to adjust tone while preserving legal content, with a concrete example to guide the revision.'),
  ('v10-ai-int-05-c', 'v10-ai-int-05', 'Rewrite the entire letter yourself to ensure the tone is right.', 'C', 3, 0, 0.30, 'Partial', '{"output_direction_skill": -0.2, "prompt_iteration_quality": -0.4}', 'Rewriting manually is time-consuming and does not leverage the AI''s capability — a targeted prompt revision would be faster and equally effective.'),
  ('v10-ai-int-05-d', 'v10-ai-int-05', 'Ask the AI to rewrite the letter in a completely different style without specifying constraints.', 'D', 4, 0, 0.10, 'Fail', '{"output_direction_skill": -0.6, "prompt_iteration_quality": -0.4}', 'Without constraints, the AI may alter the legal content, creating risk. Specific direction is essential here.');

-- ============================================================
-- DOMAIN 2: AI OUTPUT EVALUATION (5 items)
-- Signals: output_evaluation_quality, error_detection_accuracy,
--          fitness_for_purpose_judgement, blind_acceptance_risk,
--          hallucination_acceptance_risk, bias_detection_skill,
--          data_interpretation_quality
-- ============================================================

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-eval-01',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'An AI tool generates a summary of your organisation''s last 12 months of attrition data. The summary states: "Attrition has decreased by 12% year-on-year, with the highest concentration in the technology function." You check the source data and find that attrition increased by 12%, not decreased.\n\nWhat does this error tell you, and what do you do?',
  '{"capability_key": "ai_output_evaluation", "primary_signal": "hallucination_acceptance_risk", "secondary_signals": ["error_detection_accuracy", "output_evaluation_quality"], "workflow": "Analytics", "risk_level": "High", "display_order": 6}',
  2,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-eval-01-a', 'v10-ai-eval-01', 'The AI made a directional error on a key metric. Correct the summary, flag this as a known AI limitation to stakeholders, and verify all other statistics in the output before use.', 'A', 1, 1, 1.00, 'Pass', '{"hallucination_acceptance_risk": -1.0, "error_detection_accuracy": 1.0, "output_evaluation_quality": 1.0}', 'This response correctly identifies the error type, corrects it, and applies appropriate scrutiny to the rest of the output.'),
  ('v10-ai-eval-01-b', 'v10-ai-eval-01', 'Correct the specific error and use the rest of the summary as-is — one mistake does not mean the whole output is wrong.', 'B', 2, 0, 0.30, 'Partial', '{"hallucination_acceptance_risk": 0.3, "error_detection_accuracy": -0.3, "output_evaluation_quality": -0.2}', 'Correcting the error is right, but an AI that made a directional error on a headline metric warrants checking the other figures too.'),
  ('v10-ai-eval-01-c', 'v10-ai-eval-01', 'Discard the AI output entirely and produce the summary manually.', 'C', 3, 0, 0.10, 'Fail', '{"hallucination_acceptance_risk": 0.0, "output_evaluation_quality": -0.5}', 'Discarding the entire output is an overreaction — the AI may have been accurate on other points, and manual verification is a more proportionate response.'),
  ('v10-ai-eval-01-d', 'v10-ai-eval-01', 'Use the summary as-is — you may have misread the source data.', 'D', 4, 0, 0.00, 'Fail', '{"hallucination_acceptance_risk": 1.0, "error_detection_accuracy": -1.0}', 'Doubting your own verified source data in favour of AI output is a dangerous form of over-reliance.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-eval-02',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'An AI tool generates a shortlist of 10 candidates for a graduate scheme. You notice that 9 of the 10 candidates share the same university background. Your organisation''s graduate intake historically reflects this pattern.\n\nWhat is your assessment of this output?',
  '{"capability_key": "ai_output_evaluation", "primary_signal": "bias_detection_skill", "secondary_signals": ["fitness_for_purpose_judgement", "output_evaluation_quality"], "workflow": "Recruitment", "risk_level": "High", "display_order": 7}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-eval-02-a', 'v10-ai-eval-02', 'The output is acceptable — it reflects historical hiring patterns, which may indicate those candidates perform well.', 'A', 1, 0, 0.10, 'Fail', '{"bias_detection_skill": -1.0, "fitness_for_purpose_judgement": -0.8}', 'Historical patterns can encode bias. Accepting this output without scrutiny risks perpetuating structural inequality and may create legal exposure.'),
  ('v10-ai-eval-02-b', 'v10-ai-eval-02', 'The output may reflect historical bias in training data. Flag it for review, investigate whether the AI was trained on biased historical data, and consider broadening the shortlist criteria.', 'B', 2, 1, 1.00, 'Pass', '{"bias_detection_skill": 1.0, "fitness_for_purpose_judgement": 1.0, "output_evaluation_quality": 0.8}', 'This response correctly identifies the potential bias mechanism, escalates appropriately, and proposes a constructive remedy.'),
  ('v10-ai-eval-02-c', 'v10-ai-eval-02', 'Reject the shortlist and produce it manually to avoid AI bias.', 'C', 3, 0, 0.20, 'Partial', '{"bias_detection_skill": 0.3, "fitness_for_purpose_judgement": -0.3}', 'Manual processes can also be biased. The better response is to investigate and correct the AI''s criteria rather than abandon it.'),
  ('v10-ai-eval-02-d', 'v10-ai-eval-02', 'Add one candidate from a different university to diversify the shortlist and proceed.', 'D', 4, 0, 0.20, 'Partial', '{"bias_detection_skill": -0.3, "fitness_for_purpose_judgement": -0.4}', 'Tokenistic adjustment does not address the underlying bias in the AI''s selection criteria.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-eval-03',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'An AI tool produces a workforce planning forecast that shows a 23% skills gap in digital capabilities over the next three years. The AI cites three industry reports to support this figure. You recognise one of the report names but cannot verify the other two.\n\nWhat do you do before sharing this forecast with the leadership team?',
  '{"capability_key": "ai_output_evaluation", "primary_signal": "hallucination_acceptance_risk", "secondary_signals": ["data_interpretation_quality", "output_evaluation_quality"], "workflow": "Workforce Planning", "risk_level": "High", "display_order": 8}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-eval-03-a', 'v10-ai-eval-03', 'Share the forecast — the AI has cited sources, which suggests the data is reliable.', 'A', 1, 0, 0.00, 'Fail', '{"hallucination_acceptance_risk": 1.0, "output_evaluation_quality": -1.0}', 'AI tools can hallucinate citations. Unverified sources should never be presented to leadership as evidence.'),
  ('v10-ai-eval-03-b', 'v10-ai-eval-03', 'Verify all three cited sources before sharing. If two cannot be found, remove the unverified citations and note the limitation in the forecast.', 'B', 2, 1, 1.00, 'Pass', '{"hallucination_acceptance_risk": -1.0, "data_interpretation_quality": 1.0, "output_evaluation_quality": 1.0}', 'Verifying citations is essential. Noting limitations is good practice — it maintains credibility and transparency with leadership.'),
  ('v10-ai-eval-03-c', 'v10-ai-eval-03', 'Share the forecast but note that two sources could not be verified.', 'C', 3, 0, 0.40, 'Partial', '{"hallucination_acceptance_risk": 0.2, "output_evaluation_quality": 0.2}', 'Noting the limitation is better than nothing, but sharing unverified data with leadership still carries risk — verification should precede sharing.'),
  ('v10-ai-eval-03-d', 'v10-ai-eval-03', 'Remove all citations and present the 23% figure as your own analysis.', 'D', 4, 0, 0.10, 'Fail', '{"hallucination_acceptance_risk": 0.5, "output_evaluation_quality": -0.8}', 'Presenting AI-generated data as your own analysis without verification is both misleading and risky.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-eval-04',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'An AI tool generates a performance review summary for an employee. The summary is factually accurate but uses language that is noticeably more critical in tone than the summaries it generated for other employees with similar performance ratings.\n\nWhat is your assessment?',
  '{"capability_key": "ai_output_evaluation", "primary_signal": "bias_detection_skill", "secondary_signals": ["fitness_for_purpose_judgement", "output_evaluation_quality"], "workflow": "Performance Management", "risk_level": "High", "display_order": 9}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-eval-04-a', 'v10-ai-eval-04', 'The summary is factually accurate, so it is fit for purpose. Tone differences are subjective.', 'A', 1, 0, 0.10, 'Fail', '{"bias_detection_skill": -1.0, "fitness_for_purpose_judgement": -0.8}', 'Tone inconsistency in performance reviews can constitute bias, even when facts are accurate. This is a potential Equality Act concern.'),
  ('v10-ai-eval-04-b', 'v10-ai-eval-04', 'Flag the tone inconsistency as a potential bias signal. Revise the summary to match the tone used for comparable employees before sharing.', 'B', 2, 1, 1.00, 'Pass', '{"bias_detection_skill": 1.0, "fitness_for_purpose_judgement": 1.0, "output_evaluation_quality": 0.9}', 'Identifying and correcting tone inconsistency is the right response — it protects the employee and the organisation from bias claims.'),
  ('v10-ai-eval-04-c', 'v10-ai-eval-04', 'Ask the manager to review the tone before the summary is shared.', 'C', 3, 0, 0.40, 'Partial', '{"bias_detection_skill": 0.3, "fitness_for_purpose_judgement": 0.2}', 'Manager review is a reasonable step but does not address the root cause — the AI''s tone inconsistency should be corrected directly.'),
  ('v10-ai-eval-04-d', 'v10-ai-eval-04', 'Use the summary as-is — the employee''s performance may genuinely warrant a more critical tone.', 'D', 4, 0, 0.00, 'Fail', '{"bias_detection_skill": -1.0, "output_evaluation_quality": -1.0}', 'Rationalising AI bias by attributing it to the subject''s behaviour is a dangerous form of blind acceptance.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-eval-05',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'An AI tool produces a salary benchmarking report for your organisation. The report shows your median salary for a specific role is 8% below the market median. The AI recommends an immediate 8% pay increase for all affected employees.\n\nHow do you evaluate this recommendation?',
  '{"capability_key": "ai_output_evaluation", "primary_signal": "fitness_for_purpose_judgement", "secondary_signals": ["data_interpretation_quality", "output_evaluation_quality"], "workflow": "Reward", "risk_level": "Medium", "display_order": 10}',
  2,
  'published',
  0
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-eval-05-a', 'v10-ai-eval-05', 'The recommendation is sound — an 8% gap is significant and should be addressed immediately.', 'A', 1, 0, 0.20, 'Partial', '{"fitness_for_purpose_judgement": -0.5, "data_interpretation_quality": -0.4}', 'The gap may be real, but an immediate blanket increase ignores budget constraints, internal equity, and individual performance context.'),
  ('v10-ai-eval-05-b', 'v10-ai-eval-05', 'The recommendation oversimplifies. Use the benchmarking data as one input into a broader reward review that considers budget, internal equity, and individual performance before deciding on any increases.', 'B', 2, 1, 1.00, 'Pass', '{"fitness_for_purpose_judgement": 1.0, "data_interpretation_quality": 1.0, "output_evaluation_quality": 0.8}', 'AI recommendations on reward should be treated as inputs, not decisions. This response correctly contextualises the data within a broader framework.'),
  ('v10-ai-eval-05-c', 'v10-ai-eval-05', 'Discard the report — salary decisions should not involve AI.', 'C', 3, 0, 0.10, 'Fail', '{"fitness_for_purpose_judgement": -0.6, "output_evaluation_quality": -0.5}', 'Rejecting AI involvement in benchmarking analysis is overly restrictive — the tool provides useful data that should inform, not replace, human judgement.'),
  ('v10-ai-eval-05-d', 'v10-ai-eval-05', 'Present the recommendation to the leadership team as the AI''s finding and let them decide.', 'D', 4, 0, 0.20, 'Partial', '{"fitness_for_purpose_judgement": -0.3, "data_interpretation_quality": -0.2}', 'Presenting an AI recommendation without your own critical evaluation abdicates professional responsibility.');

-- ============================================================
-- DOMAIN 3: AI WORKFLOW DESIGN (5 items)
-- Signals: workflow_redesign_quality, handoff_design_quality,
--          human_oversight_preservation, automation_expansion_risk
-- ============================================================

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-wfd-01',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'Your team currently spends 4 hours per week manually screening CVs for a high-volume graduate role. You are considering using an AI tool to automate the initial screening.\n\nWhich approach best balances efficiency with appropriate oversight?',
  '{"capability_key": "ai_workflow_design", "primary_signal": "human_oversight_preservation", "secondary_signals": ["workflow_redesign_quality", "handoff_design_quality"], "workflow": "Recruitment", "risk_level": "Medium", "display_order": 11}',
  2,
  'published',
  0
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-wfd-01-a', 'v10-ai-wfd-01', 'Use AI to fully automate screening — it will eliminate human bias and save time.', 'A', 1, 0, 0.10, 'Fail', '{"human_oversight_preservation": -1.0, "automation_expansion_risk": 1.0}', 'Full automation of screening without human review creates significant bias and legal risk. AI screening tools require human oversight.'),
  ('v10-ai-wfd-01-b', 'v10-ai-wfd-01', 'Use AI to produce a ranked shortlist with reasoning for each ranking decision. A human reviewer checks the top and bottom 10% of the list before any candidates are progressed or rejected.', 'B', 2, 1, 1.00, 'Pass', '{"human_oversight_preservation": 1.0, "workflow_redesign_quality": 1.0, "handoff_design_quality": 0.9}', 'This design preserves human oversight at the decision boundaries (top and bottom) while capturing efficiency gains in the middle.'),
  ('v10-ai-wfd-01-c', 'v10-ai-wfd-01', 'Use AI to screen CVs but have a human review every single decision — this ensures no bias.', 'C', 3, 0, 0.30, 'Partial', '{"human_oversight_preservation": 0.5, "workflow_redesign_quality": -0.4}', 'Reviewing every decision eliminates the efficiency benefit of AI screening. A risk-based oversight model is more proportionate.'),
  ('v10-ai-wfd-01-d', 'v10-ai-wfd-01', 'Do not use AI for screening — the risk of bias is too high.', 'D', 4, 0, 0.10, 'Fail', '{"human_oversight_preservation": 0.0, "workflow_redesign_quality": -0.6}', 'Avoiding AI entirely is overly cautious. With appropriate design and oversight, AI screening can be both efficient and fair.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-wfd-02',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'You are redesigning the onboarding process. Currently, a People team member manually sends 12 different documents and follow-up emails over the first two weeks. You want to use AI to streamline this.\n\nWhich workflow design is most appropriate?',
  '{"capability_key": "ai_workflow_design", "primary_signal": "workflow_redesign_quality", "secondary_signals": ["handoff_design_quality", "human_oversight_preservation"], "workflow": "Onboarding", "risk_level": "Low", "display_order": 12}',
  2,
  'published',
  0
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-wfd-02-a', 'v10-ai-wfd-02', 'Automate all 12 touchpoints with AI — remove the People team member from the process entirely.', 'A', 1, 0, 0.10, 'Fail', '{"workflow_redesign_quality": -0.8, "human_oversight_preservation": -1.0}', 'Removing human contact from onboarding entirely risks a poor new joiner experience and removes the ability to catch issues early.'),
  ('v10-ai-wfd-02-b', 'v10-ai-wfd-02', 'Use AI to automate routine document delivery and scheduling. Reserve People team touchpoints for the day-one welcome, the end-of-week-one check-in, and any issues flagged by the new joiner.', 'B', 2, 1, 1.00, 'Pass', '{"workflow_redesign_quality": 1.0, "handoff_design_quality": 1.0, "human_oversight_preservation": 0.8}', 'This design correctly identifies which tasks are suitable for automation (routine) and which require human presence (relationship-building, issue resolution).'),
  ('v10-ai-wfd-02-c', 'v10-ai-wfd-02', 'Keep the process as-is — onboarding is too important to involve AI.', 'C', 3, 0, 0.00, 'Fail', '{"workflow_redesign_quality": -0.8}', 'Routine administrative tasks in onboarding are well-suited to AI automation, freeing the People team for higher-value interactions.'),
  ('v10-ai-wfd-02-d', 'v10-ai-wfd-02', 'Use AI to draft all communications but have the People team member send each one manually.', 'D', 4, 0, 0.30, 'Partial', '{"workflow_redesign_quality": -0.2, "handoff_design_quality": 0.2}', 'AI drafting is a partial improvement but manual sending still consumes significant time. A more integrated workflow design would be more effective.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-wfd-03',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'A manager asks you to implement an AI tool that will automatically generate and send performance improvement plan (PIP) letters to employees based on data from the performance management system.\n\nHow do you respond?',
  '{"capability_key": "ai_workflow_design", "primary_signal": "automation_expansion_risk", "secondary_signals": ["human_oversight_preservation", "workflow_redesign_quality"], "workflow": "Performance Management", "risk_level": "High", "display_order": 13}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-wfd-03-a', 'v10-ai-wfd-03', 'Implement the automation — it will ensure consistency and reduce manager workload.', 'A', 1, 0, 0.00, 'Fail', '{"automation_expansion_risk": 1.0, "human_oversight_preservation": -1.0}', 'Automatically sending PIP letters without human review is a significant legal and ethical risk. PIPs require individual assessment and manager involvement.'),
  ('v10-ai-wfd-03-b', 'v10-ai-wfd-03', 'Decline to implement full automation. Propose instead that AI drafts a PIP letter for manager review, with the manager required to approve and personalise the letter before it is sent.', 'B', 2, 1, 1.00, 'Pass', '{"automation_expansion_risk": -1.0, "human_oversight_preservation": 1.0, "workflow_redesign_quality": 0.8}', 'This response correctly identifies that PIP letters are high-stakes decisions requiring human judgement and accountability, while still using AI to reduce drafting time.'),
  ('v10-ai-wfd-03-c', 'v10-ai-wfd-03', 'Implement the automation but add a 24-hour delay before letters are sent, giving managers time to cancel if needed.', 'C', 3, 0, 0.20, 'Partial', '{"automation_expansion_risk": 0.5, "human_oversight_preservation": -0.3}', 'A delay is better than immediate sending but is not a robust oversight mechanism — managers may not check in time, and the default is still automatic sending.'),
  ('v10-ai-wfd-03-d', 'v10-ai-wfd-03', 'Refuse entirely — AI should not be involved in performance management processes.', 'D', 4, 0, 0.20, 'Partial', '{"automation_expansion_risk": -0.3, "workflow_redesign_quality": -0.5}', 'AI can add value in performance management (e.g., drafting, data analysis) — the issue is automation of the final decision, not AI involvement per se.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-wfd-04',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'You are mapping out a new AI-augmented workflow for processing employee relations cases. The AI will analyse case notes and suggest next steps. At which point in the workflow is human oversight most critical?',
  '{"capability_key": "ai_workflow_design", "primary_signal": "handoff_design_quality", "secondary_signals": ["human_oversight_preservation", "workflow_redesign_quality"], "workflow": "Employee Relations", "risk_level": "High", "display_order": 14}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-wfd-04-a', 'v10-ai-wfd-04', 'At the point of data entry — ensuring the AI receives accurate case notes.', 'A', 1, 0, 0.20, 'Partial', '{"handoff_design_quality": -0.3, "human_oversight_preservation": -0.2}', 'Data quality matters, but the most critical oversight point is where decisions are made, not where data is entered.'),
  ('v10-ai-wfd-04-b', 'v10-ai-wfd-04', 'At the point of acting on the AI''s suggested next steps — a qualified HR professional must review and approve each recommendation before any action is taken.', 'B', 2, 1, 1.00, 'Pass', '{"handoff_design_quality": 1.0, "human_oversight_preservation": 1.0, "workflow_redesign_quality": 0.8}', 'The decision point is where human oversight is most critical. AI suggestions in ER cases must be reviewed by a qualified professional before action.'),
  ('v10-ai-wfd-04-c', 'v10-ai-wfd-04', 'At the end of the process — reviewing the outcome to check the AI performed correctly.', 'C', 3, 0, 0.10, 'Fail', '{"handoff_design_quality": -0.6, "human_oversight_preservation": -0.8}', 'Post-hoc review is too late — harm may already have occurred. Oversight must happen before action is taken.'),
  ('v10-ai-wfd-04-d', 'v10-ai-wfd-04', 'Human oversight is not critical if the AI has been trained on similar cases.', 'D', 4, 0, 0.00, 'Fail', '{"handoff_design_quality": -1.0, "human_oversight_preservation": -1.0}', 'ER cases involve individual circumstances and legal risk that require human judgement regardless of AI training quality.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-wfd-05',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'Your organisation is considering using an AI agent to conduct initial screening interviews with candidates via chatbot. The agent asks pre-set questions and scores responses.\n\nWhat is the most important design consideration before implementing this?',
  '{"capability_key": "ai_workflow_design", "primary_signal": "human_oversight_preservation", "secondary_signals": ["automation_expansion_risk", "handoff_design_quality"], "workflow": "Recruitment", "risk_level": "High", "display_order": 15}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-wfd-05-a', 'v10-ai-wfd-05', 'The speed and cost savings it will generate.', 'A', 1, 0, 0.00, 'Fail', '{"human_oversight_preservation": -1.0, "automation_expansion_risk": 1.0}', 'Efficiency is a benefit but not the most important consideration. Bias, fairness, and candidate experience must be addressed first.'),
  ('v10-ai-wfd-05-b', 'v10-ai-wfd-05', 'Whether the scoring criteria are validated for fairness across protected characteristics, and whether candidates are informed they are interacting with an AI.', 'B', 2, 1, 1.00, 'Pass', '{"human_oversight_preservation": 1.0, "automation_expansion_risk": -1.0, "handoff_design_quality": 0.8}', 'Fairness validation and transparency with candidates are the critical design requirements under the Equality Act and ICO guidance on automated decision-making.'),
  ('v10-ai-wfd-05-c', 'v10-ai-wfd-05', 'Whether the chatbot can handle a wide range of accents and communication styles.', 'C', 3, 0, 0.30, 'Partial', '{"human_oversight_preservation": 0.2, "automation_expansion_risk": 0.3}', 'Accessibility is important but is a subset of the broader fairness requirement — not the most important single consideration.'),
  ('v10-ai-wfd-05-d', 'v10-ai-wfd-05', 'Whether the technology vendor has a good reputation.', 'D', 4, 0, 0.00, 'Fail', '{"human_oversight_preservation": -0.8, "automation_expansion_risk": 0.5}', 'Vendor reputation is a procurement consideration, not the most important design requirement for a high-stakes AI application.');

-- ============================================================
-- DOMAIN 4: WORKFORCE AI READINESS (5 items)
-- Signals: capability_diagnosis_accuracy, intervention_design_quality,
--          leader_advisory_quality, generic_prescription_risk
-- ============================================================

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-wf-air-01',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'A senior leader asks you: "Are our people ready for AI?" You have access to engagement survey data, recent training completion rates, and a small number of informal conversations with managers.\n\nWhat is your most credible response?',
  '{"capability_key": "workforce_ai_readiness", "primary_signal": "capability_diagnosis_accuracy", "secondary_signals": ["leader_advisory_quality"], "workflow": "Workforce Planning", "risk_level": "Medium", "display_order": 16}',
  2,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-wf-air-01-a', 'v10-wf-air-01', '"Based on current data, I cannot give you a definitive answer. I can tell you what the engagement data and training completion rates suggest, but to give you a reliable readiness assessment we need structured capability data. I recommend we run a short diagnostic before making investment decisions."', 'A', 1, 1, 1.00, 'Pass', '{"capability_diagnosis_accuracy": 1.0, "leader_advisory_quality": 1.0}', 'This response is honest about data limitations, uses available evidence appropriately, and recommends a structured approach — exactly what a credible HR advisor should do.'),
  ('v10-wf-air-01-b', 'v10-wf-air-01', '"Yes, our training completion rates are high, so our people are ready."', 'B', 2, 0, 0.10, 'Fail', '{"capability_diagnosis_accuracy": -1.0, "generic_prescription_risk": 0.8}', 'Training completion is a proxy metric, not a readiness measure. This response overstates confidence in weak evidence.'),
  ('v10-wf-air-01-c', 'v10-wf-air-01', '"No, our people are not ready — we need a major AI training programme immediately."', 'C', 3, 0, 0.10, 'Fail', '{"capability_diagnosis_accuracy": -0.8, "generic_prescription_risk": 1.0}', 'This response reaches a strong conclusion from insufficient evidence and prescribes a generic solution without diagnosis.'),
  ('v10-wf-air-01-d', 'v10-wf-air-01', '"I''ll need to check with the L&D team and come back to you."', 'D', 4, 0, 0.20, 'Partial', '{"capability_diagnosis_accuracy": -0.2, "leader_advisory_quality": -0.3}', 'Deferring to L&D is reasonable but misses the opportunity to provide immediate value from available data and to frame the right diagnostic approach.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-wf-air-02',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'An assessment of your finance team shows strong AI output evaluation skills but significant gaps in AI workflow design. The team lead wants to send everyone on a general "AI for Finance" training course.\n\nWhat do you recommend?',
  '{"capability_key": "workforce_ai_readiness", "primary_signal": "intervention_design_quality", "secondary_signals": ["generic_prescription_risk", "capability_diagnosis_accuracy"], "workflow": "Learning & Development", "risk_level": "Low", "display_order": 17}',
  2,
  'published',
  0
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-wf-air-02-a', 'v10-wf-air-02', 'Agree with the team lead — a general course will cover all the gaps.', 'A', 1, 0, 0.10, 'Fail', '{"generic_prescription_risk": 1.0, "intervention_design_quality": -0.8}', 'A general course will not address a specific workflow design gap efficiently — it wastes time on areas where the team is already strong.'),
  ('v10-wf-air-02-b', 'v10-wf-air-02', 'Recommend a targeted intervention focused specifically on AI workflow design, using the assessment data to identify the highest-priority scenarios for the finance context.', 'B', 2, 1, 1.00, 'Pass', '{"generic_prescription_risk": -1.0, "intervention_design_quality": 1.0, "capability_diagnosis_accuracy": 0.8}', 'Targeted intervention based on diagnostic data is more efficient and effective than generic training.'),
  ('v10-wf-air-02-c', 'v10-wf-air-02', 'Run the general course first, then reassess and design targeted follow-up.', 'C', 3, 0, 0.30, 'Partial', '{"generic_prescription_risk": 0.3, "intervention_design_quality": -0.2}', 'This approach is better than nothing but wastes time and budget on areas where the team is already competent.'),
  ('v10-wf-air-02-d', 'v10-wf-air-02', 'Suggest the team lead designs the training themselves — they know the team best.', 'D', 4, 0, 0.10, 'Fail', '{"intervention_design_quality": -0.8, "leader_advisory_quality": -0.6}', 'This abdicates the HR professional''s responsibility to translate capability data into effective learning design.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-wf-air-03',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'A board director asks you to present a business case for investing in AI capability development across the organisation. You have 10 minutes in the board meeting.\n\nWhat is the most effective structure for your case?',
  '{"capability_key": "workforce_ai_readiness", "primary_signal": "leader_advisory_quality", "secondary_signals": ["capability_diagnosis_accuracy", "intervention_design_quality"], "workflow": "Strategy", "risk_level": "Medium", "display_order": 18}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-wf-air-03-a', 'v10-wf-air-03', 'Current capability gap (with data) → business risk if unaddressed → proposed intervention → expected ROI → ask for approval.', 'A', 1, 1, 1.00, 'Pass', '{"leader_advisory_quality": 1.0, "capability_diagnosis_accuracy": 0.8, "intervention_design_quality": 0.8}', 'This structure leads with evidence, connects to business risk, proposes a solution, and makes a clear ask — the hallmarks of an effective board-level business case.'),
  ('v10-wf-air-03-b', 'v10-wf-air-03', 'Overview of AI trends in HR → what other organisations are doing → our training plan → budget request.', 'B', 2, 0, 0.30, 'Partial', '{"leader_advisory_quality": -0.3, "capability_diagnosis_accuracy": -0.4}', 'External benchmarking can be useful context but leading with trends rather than your own data is less compelling to a board.'),
  ('v10-wf-air-03-c', 'v10-wf-air-03', 'A detailed description of the training programme → cost breakdown → timeline → approval request.', 'C', 3, 0, 0.20, 'Partial', '{"leader_advisory_quality": -0.4, "capability_diagnosis_accuracy": -0.5}', 'Starting with the solution before establishing the problem is a common business case error — boards need to understand the why before the what.'),
  ('v10-wf-air-03-d', 'v10-wf-air-03', 'A high-level overview of AI and why it matters, followed by a request for budget to explore options.', 'D', 4, 0, 0.10, 'Fail', '{"leader_advisory_quality": -0.8, "capability_diagnosis_accuracy": -0.6}', 'This approach is too vague — it does not demonstrate diagnostic rigour or a clear plan, and is unlikely to secure board investment.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-wf-air-04',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'You are designing an AI readiness programme for a 500-person organisation. The CEO wants everyone to complete the same training by the end of the quarter.\n\nWhat is the most appropriate response?',
  '{"capability_key": "workforce_ai_readiness", "primary_signal": "generic_prescription_risk", "secondary_signals": ["intervention_design_quality", "leader_advisory_quality"], "workflow": "Learning & Development", "risk_level": "Medium", "display_order": 19}',
  2,
  'published',
  0
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-wf-air-04-a', 'v10-wf-air-04', 'Design a single training programme and roll it out to all 500 people as requested.', 'A', 1, 0, 0.10, 'Fail', '{"generic_prescription_risk": 1.0, "intervention_design_quality": -0.8}', 'A one-size-fits-all approach ignores the different starting points, roles, and learning needs across the organisation.'),
  ('v10-wf-air-04-b', 'v10-wf-air-04', 'Advise the CEO that a single programme is unlikely to be effective. Propose a tiered approach: a short universal foundation module for all staff, with role-specific advanced modules for functions with higher AI exposure.', 'B', 2, 1, 1.00, 'Pass', '{"generic_prescription_risk": -1.0, "intervention_design_quality": 1.0, "leader_advisory_quality": 0.9}', 'A tiered approach balances the CEO''s desire for universal coverage with the practical reality that different roles need different depth of AI capability.'),
  ('v10-wf-air-04-c', 'v10-wf-air-04', 'Agree to the CEO''s request but extend the timeline to six months to allow for better design.', 'C', 3, 0, 0.30, 'Partial', '{"generic_prescription_risk": 0.3, "intervention_design_quality": -0.2}', 'A longer timeline helps but does not address the fundamental issue of a generic approach being less effective than a targeted one.'),
  ('v10-wf-air-04-d', 'v10-wf-air-04', 'Outsource the programme design to an external training provider.', 'D', 4, 0, 0.10, 'Fail', '{"generic_prescription_risk": 0.2, "intervention_design_quality": -0.6}', 'Outsourcing without first defining the right approach risks an expensive generic programme that does not address your organisation''s specific needs.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-wf-air-05',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'Six months after an AI capability programme, engagement scores have improved but productivity metrics have not changed. A senior leader concludes the programme was ineffective.\n\nHow do you respond?',
  '{"capability_key": "workforce_ai_readiness", "primary_signal": "capability_diagnosis_accuracy", "secondary_signals": ["leader_advisory_quality", "intervention_design_quality"], "workflow": "Learning & Development", "risk_level": "Medium", "display_order": 20}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-wf-air-05-a', 'v10-wf-air-05', 'Agree — if productivity has not improved, the programme has not worked.', 'A', 1, 0, 0.10, 'Fail', '{"capability_diagnosis_accuracy": -0.8, "leader_advisory_quality": -0.6}', 'This conclusion is premature. Capability development often has a lag before it shows in productivity metrics.'),
  ('v10-wf-air-05-b', 'v10-wf-air-05', 'Challenge the conclusion: capability development typically has a 3-12 month lag before productivity impact. Recommend a more granular analysis — which teams have changed their AI usage? Are there structural barriers preventing application of new skills?', 'B', 2, 1, 1.00, 'Pass', '{"capability_diagnosis_accuracy": 1.0, "leader_advisory_quality": 1.0, "intervention_design_quality": 0.8}', 'This response demonstrates diagnostic rigour, challenges a premature conclusion with evidence-based reasoning, and proposes a constructive next step.'),
  ('v10-wf-air-05-c', 'v10-wf-air-05', 'Propose a second training programme to reinforce the learning.', 'C', 3, 0, 0.20, 'Partial', '{"capability_diagnosis_accuracy": -0.3, "intervention_design_quality": -0.2}', 'More training without diagnosing why the first programme did not translate to productivity is unlikely to be effective.'),
  ('v10-wf-air-05-d', 'v10-wf-air-05', 'Acknowledge the failure and recommend a different approach next time.', 'D', 4, 0, 0.20, 'Partial', '{"capability_diagnosis_accuracy": -0.2, "leader_advisory_quality": -0.3}', 'Accepting the failure narrative without investigation misses the opportunity to provide a more nuanced and accurate assessment.');

-- ============================================================
-- DOMAIN 5: AI ETHICS & EMPLOYEE TRUST (5 items)
-- Signals: ethics_under_pressure, stakeholder_impact_awareness,
--          employee_transparency_advocacy, pressure_drift_risk,
--          legal_vs_fair_distinction
-- ============================================================

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-eth-01',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'Your organisation is implementing an AI tool that monitors employee productivity in real time. The tool tracks keystrokes, application usage, and meeting attendance. The CEO wants to roll it out without telling employees.\n\nWhat do you do?',
  '{"capability_key": "ai_ethics_trust", "primary_signal": "employee_transparency_advocacy", "secondary_signals": ["ethics_under_pressure", "legal_vs_fair_distinction"], "workflow": "Employee Relations", "risk_level": "High", "display_order": 21}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-eth-01-a', 'v10-ai-eth-01', 'Implement the tool as requested — the CEO has made the decision.', 'A', 1, 0, 0.00, 'Fail', '{"employee_transparency_advocacy": -1.0, "ethics_under_pressure": -1.0, "pressure_drift_risk": 1.0}', 'Implementing covert employee monitoring without disclosure is likely unlawful under UK GDPR and the Employment Practices Code, and is a serious breach of employee trust.'),
  ('v10-ai-eth-01-b', 'v10-ai-eth-01', 'Advise the CEO that covert monitoring of this nature is likely unlawful under UK GDPR and the ICO Employment Practices Code. Recommend a transparent approach: consult with employees, conduct a DPIA, and communicate the purpose and scope of monitoring clearly.', 'B', 2, 1, 1.00, 'Pass', '{"employee_transparency_advocacy": 1.0, "ethics_under_pressure": 1.0, "legal_vs_fair_distinction": 1.0}', 'This response correctly identifies the legal risk, advocates for employee rights, and proposes a lawful and ethical alternative.'),
  ('v10-ai-eth-01-c', 'v10-ai-eth-01', 'Implement the tool but only monitor a sample of employees to reduce the risk.', 'C', 3, 0, 0.10, 'Fail', '{"employee_transparency_advocacy": -0.8, "pressure_drift_risk": 0.8}', 'Partial covert monitoring is still unlawful and unethical. Reducing scope does not address the fundamental transparency requirement.'),
  ('v10-ai-eth-01-d', 'v10-ai-eth-01', 'Raise concerns with the CEO but implement the tool if they insist.', 'D', 4, 0, 0.10, 'Fail', '{"ethics_under_pressure": -0.8, "pressure_drift_risk": 1.0}', 'Raising concerns and then implementing an unlawful instruction is not an acceptable response — HR professionals have a professional and legal duty to refuse.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-eth-02',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'An AI tool recommends that a long-serving employee should be placed in a "high flight risk" category based on their engagement scores and recent absence patterns. The manager wants to use this to justify not promoting the employee.\n\nWhat is your response?',
  '{"capability_key": "ai_ethics_trust", "primary_signal": "stakeholder_impact_awareness", "secondary_signals": ["legal_vs_fair_distinction", "ethics_under_pressure"], "workflow": "Talent Management", "risk_level": "High", "display_order": 22}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-eth-02-a', 'v10-ai-eth-02', 'Support the manager — the AI data provides an objective basis for the decision.', 'A', 1, 0, 0.00, 'Fail', '{"stakeholder_impact_awareness": -1.0, "legal_vs_fair_distinction": -1.0}', 'Using a predictive AI label to deny a promotion without evidence of actual performance issues is likely discriminatory and could constitute an Equality Act breach.'),
  ('v10-ai-eth-02-b', 'v10-ai-eth-02', 'Advise the manager that using a predictive AI label as the basis for a promotion decision is likely unlawful and unfair. Promotion decisions must be based on performance evidence. If there are genuine concerns about retention, address them directly with the employee.', 'B', 2, 1, 1.00, 'Pass', '{"stakeholder_impact_awareness": 1.0, "legal_vs_fair_distinction": 1.0, "ethics_under_pressure": 0.9}', 'This response correctly distinguishes between a predictive label and performance evidence, identifies the legal risk, and proposes a fair alternative.'),
  ('v10-ai-eth-02-c', 'v10-ai-eth-02', 'Ask the AI tool to provide more data before making a recommendation.', 'C', 3, 0, 0.20, 'Partial', '{"stakeholder_impact_awareness": -0.2, "legal_vs_fair_distinction": -0.3}', 'More data does not resolve the fundamental issue — predictive flight risk scores should not be used as a basis for promotion decisions.'),
  ('v10-ai-eth-02-d', 'v10-ai-eth-02', 'Delay the promotion decision until the employee''s engagement improves.', 'D', 4, 0, 0.10, 'Fail', '{"stakeholder_impact_awareness": -0.6, "legal_vs_fair_distinction": -0.8}', 'Delaying a promotion based on an AI prediction rather than performance evidence is still unfair and potentially discriminatory.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-eth-03',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'Your organisation is legally permitted to use AI to screen CVs based on a set of criteria approved by the legal team. However, you have noticed that the criteria systematically disadvantage candidates from certain socioeconomic backgrounds.\n\nWhat do you do?',
  '{"capability_key": "ai_ethics_trust", "primary_signal": "legal_vs_fair_distinction", "secondary_signals": ["ethics_under_pressure", "stakeholder_impact_awareness"], "workflow": "Recruitment", "risk_level": "High", "display_order": 23}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-eth-03-a', 'v10-ai-eth-03', 'Continue using the criteria — they have been approved by the legal team.', 'A', 1, 0, 0.00, 'Fail', '{"legal_vs_fair_distinction": -1.0, "ethics_under_pressure": -1.0}', 'Legal approval does not mean a practice is fair or ethical. Socioeconomic disadvantage may also constitute indirect discrimination under the Equality Act.'),
  ('v10-ai-eth-03-b', 'v10-ai-eth-03', 'Raise the fairness concern with the legal team and senior leadership. Recommend a review of the screening criteria to assess whether the disadvantage is justified and whether fairer alternatives exist.', 'B', 2, 1, 1.00, 'Pass', '{"legal_vs_fair_distinction": 1.0, "ethics_under_pressure": 1.0, "stakeholder_impact_awareness": 0.9}', 'This response correctly distinguishes legal compliance from ethical fairness, escalates appropriately, and proposes a constructive review.'),
  ('v10-ai-eth-03-c', 'v10-ai-eth-03', 'Add a manual review stage for candidates from disadvantaged backgrounds.', 'C', 3, 0, 0.30, 'Partial', '{"legal_vs_fair_distinction": 0.2, "stakeholder_impact_awareness": 0.3}', 'A manual review stage is a partial mitigation but does not address the root cause — the screening criteria themselves need review.'),
  ('v10-ai-eth-03-d', 'v10-ai-eth-03', 'Stop using AI for screening entirely until the issue is resolved.', 'D', 4, 0, 0.20, 'Partial', '{"legal_vs_fair_distinction": 0.3, "ethics_under_pressure": 0.3}', 'Pausing is a reasonable precautionary step but is not the complete answer — the criteria need to be reviewed and corrected, not just the AI tool suspended.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-eth-04',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'A manager asks you to use an AI tool to analyse an employee''s communication patterns to assess whether they are "disengaged". The manager has not told the employee this analysis is taking place.\n\nWhat is your response?',
  '{"capability_key": "ai_ethics_trust", "primary_signal": "employee_transparency_advocacy", "secondary_signals": ["stakeholder_impact_awareness", "legal_vs_fair_distinction"], "workflow": "Employee Relations", "risk_level": "High", "display_order": 24}',
  2,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-eth-04-a', 'v10-ai-eth-04', 'Carry out the analysis — the manager has a legitimate business interest in understanding engagement.', 'A', 1, 0, 0.00, 'Fail', '{"employee_transparency_advocacy": -1.0, "legal_vs_fair_distinction": -1.0}', 'Covert analysis of an individual employee''s communications without their knowledge is likely unlawful under UK GDPR and the right to privacy.'),
  ('v10-ai-eth-04-b', 'v10-ai-eth-04', 'Decline to carry out the analysis without the employee''s knowledge. Advise the manager that any AI-based analysis of an individual''s communications requires transparency with the employee and a lawful basis under UK GDPR. Suggest a direct conversation with the employee instead.', 'B', 2, 1, 1.00, 'Pass', '{"employee_transparency_advocacy": 1.0, "legal_vs_fair_distinction": 1.0, "stakeholder_impact_awareness": 0.9}', 'This response correctly identifies the legal and ethical issues, declines to participate in covert surveillance, and proposes a lawful and more effective alternative.'),
  ('v10-ai-eth-04-c', 'v10-ai-eth-04', 'Carry out the analysis but anonymise the results before sharing with the manager.', 'C', 3, 0, 0.10, 'Fail', '{"employee_transparency_advocacy": -0.8, "legal_vs_fair_distinction": -0.8}', 'Anonymising the results does not resolve the fundamental issue — the analysis itself is covert and likely unlawful.'),
  ('v10-ai-eth-04-d', 'v10-ai-eth-04', 'Ask the manager to get the employee''s consent before proceeding.', 'D', 4, 0, 0.50, 'Partial', '{"employee_transparency_advocacy": 0.5, "legal_vs_fair_distinction": 0.4}', 'Seeking consent is the right direction but the response is incomplete — it should also advise on the lawful basis requirements and suggest a more direct engagement approach.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-eth-05',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'Under pressure from the CFO to reduce headcount costs, you are asked to use an AI tool to identify the "lowest performing" employees for redundancy. The AI uses a composite score based on performance ratings, absence data, and manager assessments.\n\nWhat is your most important concern?',
  '{"capability_key": "ai_ethics_trust", "primary_signal": "ethics_under_pressure", "secondary_signals": ["pressure_drift_risk", "stakeholder_impact_awareness"], "workflow": "Workforce Planning", "risk_level": "High", "display_order": 25}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-eth-05-a', 'v10-ai-eth-05', 'Whether the AI tool is accurate enough to make reliable recommendations.', 'A', 1, 0, 0.20, 'Partial', '{"ethics_under_pressure": -0.3, "pressure_drift_risk": 0.3}', 'Accuracy matters but is not the most important concern — even an accurate AI tool cannot make redundancy decisions lawfully without a fair selection process.'),
  ('v10-ai-eth-05-b', 'v10-ai-eth-05', 'Whether the AI selection process constitutes a fair and lawful redundancy selection process under employment law, and whether the composite score may encode bias against protected characteristics.', 'B', 2, 1, 1.00, 'Pass', '{"ethics_under_pressure": 1.0, "pressure_drift_risk": -1.0, "stakeholder_impact_awareness": 1.0}', 'This response correctly identifies the two critical concerns: legal compliance with redundancy law and the risk of discriminatory bias in the composite score.'),
  ('v10-ai-eth-05-c', 'v10-ai-eth-05', 'Whether the CFO has the authority to make this request.', 'C', 3, 0, 0.10, 'Fail', '{"ethics_under_pressure": -0.5, "pressure_drift_risk": 0.5}', 'The CFO''s authority is not the primary concern — the legal and ethical risks of the approach are.'),
  ('v10-ai-eth-05-d', 'v10-ai-eth-05', 'Whether the AI tool has been approved by the legal team.', 'D', 4, 0, 0.20, 'Partial', '{"ethics_under_pressure": -0.2, "pressure_drift_risk": 0.2}', 'Legal approval is one consideration but does not guarantee the process is fair or that the composite score is free from bias.');

-- ============================================================
-- DOMAIN 6: AI CHANGE LEADERSHIP (5 items)
-- Signals: resistance_response_quality, legitimate_concern_recognition,
--          change_pace_calibration, dismissive_of_concern_risk
-- ============================================================

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-cl-01',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'You are rolling out an AI tool for HR teams. During a team briefing, a senior HR Business Partner says: "I''ve been doing this job for 15 years. I don''t need a machine telling me what to do."\n\nHow do you respond?',
  '{"capability_key": "ai_change_leadership", "primary_signal": "resistance_response_quality", "secondary_signals": ["legitimate_concern_recognition", "dismissive_of_concern_risk"], "workflow": "Change Management", "risk_level": "Medium", "display_order": 26}',
  2,
  'published',
  0
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-cl-01-a', 'v10-ai-cl-01', 'Acknowledge their experience and clarify that the tool is designed to support their judgement, not replace it. Ask them to share a specific scenario where they would find AI support useful, to explore the tool''s value together.', 'A', 1, 1, 1.00, 'Pass', '{"resistance_response_quality": 1.0, "legitimate_concern_recognition": 1.0, "dismissive_of_concern_risk": -1.0}', 'This response validates the concern, reframes the tool''s purpose, and invites collaborative exploration — the hallmarks of effective change leadership.'),
  ('v10-ai-cl-01-b', 'v10-ai-cl-01', 'Explain that the tool has been approved by the leadership team and everyone is expected to use it.', 'B', 2, 0, 0.10, 'Fail', '{"resistance_response_quality": -0.8, "dismissive_of_concern_risk": 1.0}', 'Citing authority without addressing the concern is dismissive and will increase resistance rather than reduce it.'),
  ('v10-ai-cl-01-c', 'v10-ai-cl-01', 'Suggest they attend additional training to understand the tool''s capabilities.', 'C', 3, 0, 0.20, 'Partial', '{"resistance_response_quality": -0.3, "legitimate_concern_recognition": -0.2}', 'Training may help but does not address the emotional dimension of the concern — the HRBP feels their expertise is being devalued.'),
  ('v10-ai-cl-01-d', 'v10-ai-cl-01', 'Agree that experienced professionals may not need the tool and offer them an exemption.', 'D', 4, 0, 0.10, 'Fail', '{"resistance_response_quality": -0.5, "change_pace_calibration": -0.6}', 'Offering exemptions undermines the change programme and sets a precedent that resistance leads to opt-outs.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-cl-02',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'A trade union representative raises a formal concern that the new AI performance monitoring tool may be used to build cases for dismissal. The concern is not currently accurate — the tool is only used for development purposes.\n\nHow do you respond?',
  '{"capability_key": "ai_change_leadership", "primary_signal": "legitimate_concern_recognition", "secondary_signals": ["resistance_response_quality", "employee_transparency_advocacy"], "workflow": "Employee Relations", "risk_level": "High", "display_order": 27}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-cl-02-a', 'v10-ai-cl-02', 'Dismiss the concern — the tool is only used for development, so the worry is unfounded.', 'A', 1, 0, 0.00, 'Fail', '{"legitimate_concern_recognition": -1.0, "dismissive_of_concern_risk": 1.0}', 'Dismissing a legitimate governance concern because it is currently unfounded ignores the risk that policies can change and trust can be damaged by poor communication.'),
  ('v10-ai-cl-02-b', 'v10-ai-cl-02', 'Acknowledge the concern as legitimate. Provide written confirmation of the tool''s current purpose and limitations. Commit to consulting the union before any change in how the data is used. Offer to include this commitment in the tool''s governance documentation.', 'B', 2, 1, 1.00, 'Pass', '{"legitimate_concern_recognition": 1.0, "resistance_response_quality": 1.0, "employee_transparency_advocacy": 0.9}', 'This response takes the concern seriously, provides transparency, and builds in a governance commitment — the right approach to building trust in AI tools.'),
  ('v10-ai-cl-02-c', 'v10-ai-cl-02', 'Explain that the concern is unfounded and ask the union to trust the organisation''s intentions.', 'C', 3, 0, 0.10, 'Fail', '{"legitimate_concern_recognition": -0.8, "dismissive_of_concern_risk": 0.8}', 'Asking for trust without providing evidence or governance commitments is not an effective response to a formal union concern.'),
  ('v10-ai-cl-02-d', 'v10-ai-cl-02', 'Pause the tool''s rollout until the concern is fully resolved.', 'D', 4, 0, 0.30, 'Partial', '{"legitimate_concern_recognition": 0.3, "change_pace_calibration": -0.2}', 'Pausing may be appropriate in some cases but is an overreaction here — the concern can be addressed through communication and governance commitments without stopping the rollout.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-cl-03',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'You are leading the rollout of an AI tool for managers. Adoption is low after two months — only 30% of managers are using it regularly. The CEO wants to make usage mandatory immediately.\n\nWhat do you recommend?',
  '{"capability_key": "ai_change_leadership", "primary_signal": "change_pace_calibration", "secondary_signals": ["resistance_response_quality", "legitimate_concern_recognition"], "workflow": "Change Management", "risk_level": "Medium", "display_order": 28}',
  3,
  'published',
  1
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-cl-03-a', 'v10-ai-cl-03', 'Implement mandatory usage immediately as requested — low adoption needs a strong signal.', 'A', 1, 0, 0.10, 'Fail', '{"change_pace_calibration": -0.8, "resistance_response_quality": -0.6}', 'Mandating usage without understanding the barriers is likely to increase resentment and surface compliance rather than genuine adoption.'),
  ('v10-ai-cl-03-b', 'v10-ai-cl-03', 'Recommend a diagnostic before mandating: understand why 70% are not using the tool. Is it a training gap, a workflow fit issue, or active resistance? Address the root cause first, then consider a phased mandate with support.', 'B', 2, 1, 1.00, 'Pass', '{"change_pace_calibration": 1.0, "resistance_response_quality": 1.0, "legitimate_concern_recognition": 0.8}', 'Diagnosing the adoption barrier before mandating is the right approach — it increases the chance of sustainable adoption and avoids creating resentment.'),
  ('v10-ai-cl-03-c', 'v10-ai-cl-03', 'Run another round of training for all managers.', 'C', 3, 0, 0.20, 'Partial', '{"change_pace_calibration": -0.2, "resistance_response_quality": -0.1}', 'More training may help if the barrier is a skill gap, but without diagnosis it may not address the actual reason for low adoption.'),
  ('v10-ai-cl-03-d', 'v10-ai-cl-03', 'Accept that 30% adoption is a reasonable outcome for a new tool and focus on those who are using it.', 'D', 4, 0, 0.10, 'Fail', '{"change_pace_calibration": -0.5, "resistance_response_quality": -0.4}', 'Accepting low adoption without investigation misses the opportunity to understand and address the barriers.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-cl-04',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'During an AI tool rollout, several employees raise concerns that the tool will reduce their job security. These concerns are not supported by any current organisational plans.\n\nHow do you address this?',
  '{"capability_key": "ai_change_leadership", "primary_signal": "legitimate_concern_recognition", "secondary_signals": ["resistance_response_quality", "change_pace_calibration"], "workflow": "Change Management", "risk_level": "Medium", "display_order": 29}',
  2,
  'published',
  0
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-cl-04-a', 'v10-ai-cl-04', 'Tell employees not to worry — the tool is not going to affect their jobs.', 'A', 1, 0, 0.10, 'Fail', '{"legitimate_concern_recognition": -0.8, "resistance_response_quality": -0.6}', 'Dismissing concerns with reassurance without substance is not credible and will not reduce anxiety.'),
  ('v10-ai-cl-04-b', 'v10-ai-cl-04', 'Acknowledge that job security concerns are understandable in the context of AI adoption. Share what is known about the tool''s purpose and any commitments the organisation has made. Be honest about what is not yet known, and commit to keeping employees informed as plans develop.', 'B', 2, 1, 1.00, 'Pass', '{"legitimate_concern_recognition": 1.0, "resistance_response_quality": 1.0, "change_pace_calibration": 0.8}', 'This response validates the concern, provides honest and transparent communication, and builds trust through commitment to ongoing dialogue.'),
  ('v10-ai-cl-04-c', 'v10-ai-cl-04', 'Avoid the topic — addressing it might make employees more anxious.', 'C', 3, 0, 0.00, 'Fail', '{"legitimate_concern_recognition": -1.0, "dismissive_of_concern_risk": 1.0}', 'Avoiding the topic allows anxiety to grow unchecked and signals that the organisation is not being transparent.'),
  ('v10-ai-cl-04-d', 'v10-ai-cl-04', 'Ask managers to address the concerns in their one-to-ones.', 'D', 4, 0, 0.30, 'Partial', '{"legitimate_concern_recognition": 0.2, "resistance_response_quality": 0.2}', 'Manager conversations are valuable but should supplement, not replace, a clear organisational communication on a topic that affects everyone.');

INSERT INTO `assessment_items` (`id`, `blueprint_id`, `item_type`, `prompt`, `metadata_json`, `difficulty`, `status`, `reasoning_required`) VALUES (
  'v10-ai-cl-05',
  'bp-aiq-v10-standard',
  'scenario_mcq',
  'Your organisation has been using an AI tool for six months. Feedback from employees suggests they do not understand how the tool makes decisions that affect them. Several have asked to know why they received a particular recommendation.\n\nWhat is the right response?',
  '{"capability_key": "ai_change_leadership", "primary_signal": "resistance_response_quality", "secondary_signals": ["legitimate_concern_recognition", "employee_transparency_advocacy"], "workflow": "Change Management", "risk_level": "Medium", "display_order": 30}',
  2,
  'published',
  0
);
INSERT INTO `assessment_item_options` (`id`, `item_id`, `label`, `value`, `option_order`, `is_correct`, `score_weight`, `outcome_class`, `signal_deltas_json`, `rationale_text`) VALUES
  ('v10-ai-cl-05-a', 'v10-ai-cl-05', 'Tell employees that the AI''s decision-making is proprietary and cannot be shared.', 'A', 1, 0, 0.00, 'Fail', '{"resistance_response_quality": -1.0, "legitimate_concern_recognition": -1.0}', 'Refusing to explain AI decisions that affect employees is likely unlawful under UK GDPR Article 22 (right to explanation for automated decisions) and will damage trust.'),
  ('v10-ai-cl-05-b', 'v10-ai-cl-05', 'Develop a plain-language explanation of how the tool works and what factors influence its recommendations. Create a process for employees to request a human review of any recommendation that affects them.', 'B', 2, 1, 1.00, 'Pass', '{"resistance_response_quality": 1.0, "legitimate_concern_recognition": 1.0, "employee_transparency_advocacy": 1.0}', 'This response addresses the transparency gap, fulfils the legal right to explanation, and provides a human review mechanism — all essential for responsible AI deployment.'),
  ('v10-ai-cl-05-c', 'v10-ai-cl-05', 'Ask the technology vendor to provide a technical explanation that employees can read.', 'C', 3, 0, 0.20, 'Partial', '{"resistance_response_quality": -0.2, "legitimate_concern_recognition": 0.2}', 'Vendor documentation is rarely accessible to employees. The organisation is responsible for translating technical information into plain language.'),
  ('v10-ai-cl-05-d', 'v10-ai-cl-05', 'Remind employees that the tool''s recommendations are not binding — they can choose to ignore them.', 'D', 4, 0, 0.20, 'Partial', '{"resistance_response_quality": -0.3, "legitimate_concern_recognition": -0.1}', 'While technically true, this does not address the transparency concern or provide the explanation employees are entitled to.');
