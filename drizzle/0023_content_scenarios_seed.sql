-- AiQ Content Scenarios Seed (v10 Capability Domains)
-- Generated: 2026-04-24T12:57:40.259Z
-- Total scenarios: 13

-- Scenario: The Vague Recruitment Brief
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  '9d078e06-d13b-41fd-b489-d58e66bb29d1',
  'v10-ai-int-pd-01',
  'The Vague Recruitment Brief',
  'AI Interaction',
  'ai_interaction',
  'prompt_diagnosis',
  2,
  'Medium',
  0,
  'A hiring manager has sent you a one-line request: ''Use AI to find me some good candidates for the team lead role.'' You need to diagnose what''s missing from this prompt before you can effectively use AI to assist with candidate sourcing. The role is in a UK financial services firm with 300 employees, and the team lead position involves managing 8 people across two locations.',
  'You must identify the prompt deficiencies and recommend a structured approach without simply rewriting the prompt yourself.',
  'What is the most critical first step in diagnosing this prompt''s deficiencies?',
  'prompt_construction_quality',
  'medium',
  '["financial_services"]',
  1,
  '["hrbp","talent_acquisition"]',
  '["blind_acceptance"]',
  '["recruitment","prompt_diagnosis","stakeholder_management"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'cd65e82b-0db6-434e-b3db-3ad4703b30f4',
  '9d078e06-d13b-41fd-b489-d58e66bb29d1',
  1,
  'Immediately rewrite the prompt with more detail based on your assumptions about the role, then send the AI output to the hiring manager for review.',
  'option_a',
  'weak',
  '{"prompt_construction_quality":-0.3,"prompt_iteration_quality":-0.2,"output_direction_skill":-0.1}',
  'Making assumptions about the role without consulting the hiring manager risks producing irrelevant outputs and undermines the collaborative prompt construction process.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '0c311d25-798a-44af-9488-cad9b93c73ca',
  '9d078e06-d13b-41fd-b489-d58e66bb29d1',
  2,
  'Ask the hiring manager 5-6 targeted questions about role requirements, team context, and success criteria before constructing any AI prompt.',
  'option_b',
  'strong',
  '{"prompt_construction_quality":0.8,"prompt_iteration_quality":0.4,"output_direction_skill":0.5}',
  'Gathering specific context before prompt construction is the hallmark of effective AI interaction. This ensures the prompt is grounded in real requirements rather than assumptions.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '105b7813-7aa7-41ec-9890-fea357af101c',
  '9d078e06-d13b-41fd-b489-d58e66bb29d1',
  3,
  'Use the AI tool with the vague prompt to generate initial results, then use those results to identify what additional information is needed.',
  'option_c',
  'developing',
  '{"prompt_construction_quality":0.1,"prompt_iteration_quality":0.3,"output_direction_skill":0}',
  'While iterative exploration can be useful, starting with a vague prompt wastes time and may anchor the hiring manager''s expectations on poor initial results.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'f5141ba3-517b-47bc-97c7-c3cce905ede9',
  '9d078e06-d13b-41fd-b489-d58e66bb29d1',
  4,
  'Forward the request to the recruitment team and suggest they handle the AI-assisted sourcing since they have more experience with the tools.',
  'option_d',
  'weak',
  '{"prompt_construction_quality":-0.5,"tool_fluency_index":-0.4,"output_direction_skill":-0.3}',
  'Delegating without engaging demonstrates avoidance of AI interaction responsibility and misses an opportunity to develop prompt construction skills.',
  0
);

-- Scenario: Constructing an AI-Assisted Job Analysis Prompt
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  '4fc34ed4-4b2a-4e42-abb8-3e3b06a0a5df',
  'v10-ai-int-pc-01',
  'Constructing an AI-Assisted Job Analysis Prompt',
  'AI Interaction',
  'ai_interaction',
  'prompt_construction',
  2,
  'Medium',
  0,
  'You need to use AI to analyse a complex job role (Head of People Analytics) and produce a competency framework. The role is new to your organisation, and you have a job description, market benchmarking data, and input from the hiring committee. You need to construct a prompt that will produce a comprehensive, accurate competency framework.',
  'The output must be suitable for direct use in the recruitment process and compliant with UK employment law.',
  'How should you structure the AI prompt to produce the most useful competency framework?',
  'prompt_construction_quality',
  'medium',
  '[]',
  1,
  '["hrbp","od_specialist"]',
  '[]',
  '["job_analysis","competency_framework","prompt_construction"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '70c5c6d6-00df-4097-8abd-c5852ad079e2',
  '4fc34ed4-4b2a-4e42-abb8-3e3b06a0a5df',
  1,
  'Provide all three inputs (JD, benchmarking, committee notes) in a single prompt with clear instructions to synthesise them into a competency framework with 8-10 competencies, each with behavioural indicators at three levels.',
  'option_a',
  'strong',
  '{"prompt_construction_quality":0.8,"output_direction_skill":0.6,"tool_fluency_index":0.3}',
  'Providing comprehensive context with specific output requirements (number of competencies, behavioural indicators, levels) demonstrates strong prompt construction that will produce immediately usable output.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '6de553d2-4548-4356-b8b2-f66fae9f80d8',
  '4fc34ed4-4b2a-4e42-abb8-3e3b06a0a5df',
  2,
  'Ask the AI to ''create a competency framework for a Head of People Analytics role'' without providing the supporting documents, relying on the AI''s general knowledge.',
  'option_b',
  'weak',
  '{"prompt_construction_quality":-0.5,"output_direction_skill":-0.3,"tool_fluency_index":-0.2}',
  'Failing to provide organisation-specific context means the AI will produce a generic framework that doesn''t reflect your organisation''s specific needs or the hiring committee''s priorities.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '447232a6-4ad4-43d6-ac12-4b1d64aa46b0',
  '4fc34ed4-4b2a-4e42-abb8-3e3b06a0a5df',
  3,
  'Break the task into three separate prompts — one for each input source — then manually combine the outputs yourself.',
  'option_c',
  'developing',
  '{"prompt_construction_quality":0.2,"prompt_iteration_quality":0.3,"output_direction_skill":0.1}',
  'While decomposition can be useful for complex tasks, this approach creates unnecessary manual work and risks inconsistency across the three outputs. A well-structured single prompt would be more effective.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'a0f0aa98-2b33-4cc7-b17e-cf31534f0980',
  '4fc34ed4-4b2a-4e42-abb8-3e3b06a0a5df',
  4,
  'Use the AI to generate a draft, then schedule a meeting with the hiring committee to review and refine it together, iterating on the prompt in real-time.',
  'option_d',
  'developing',
  '{"prompt_construction_quality":0.3,"prompt_iteration_quality":0.5,"output_direction_skill":0.2}',
  'Collaborative iteration is valuable but starting without providing the available context means the initial draft will be weak, making the committee meeting less productive.',
  0
);

-- Scenario: Calibrating Confidence in AI-Generated Workforce Insights
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  'fd7827f4-3120-4af9-a689-dd534d12932f',
  'v10-ai-int-cc-01',
  'Calibrating Confidence in AI-Generated Workforce Insights',
  'AI Interaction',
  'ai_interaction',
  'confidence_calibration',
  3,
  'Medium',
  0,
  'You''ve used AI to analyse 12 months of workforce data and it has produced a report suggesting that your organisation''s voluntary turnover will increase by 15% in the next quarter, driven primarily by mid-career employees in the technology function. The AI has presented this with high confidence. Your own experience suggests turnover has been stable, and the technology function recently received above-market pay adjustments.',
  'You need to decide how much confidence to place in the AI''s prediction before presenting it to the CHRO.',
  'How should you calibrate your confidence in this AI-generated prediction?',
  'output_evaluation_quality',
  'high',
  '[]',
  1,
  '["people_analytics","hrbp","hr_director"]',
  '["blind_acceptance"]',
  '["workforce_analytics","confidence_calibration","prediction"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '9c581e10-3fd6-4700-83a6-66baf51bd6df',
  'fd7827f4-3120-4af9-a689-dd534d12932f',
  1,
  'Present the AI''s prediction to the CHRO as-is, noting that AI analytics are generally reliable and the data speaks for itself.',
  'option_a',
  'weak',
  '{"output_evaluation_quality":-0.5,"blind_acceptance_risk":-0.6,"fitness_for_purpose_judgement":-0.3}',
  'Accepting an AI prediction without critical evaluation, especially when it contradicts your professional experience and known context (recent pay adjustments), demonstrates blind acceptance — a critical failure mode.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'a70e7a5b-6da2-44c7-9b69-770624876d47',
  'fd7827f4-3120-4af9-a689-dd534d12932f',
  2,
  'Investigate the data inputs, check for seasonal patterns, verify the pay adjustment timing, and cross-reference with exit interview themes before forming a view on the prediction''s reliability.',
  'option_b',
  'strong',
  '{"output_evaluation_quality":0.7,"blind_acceptance_risk":0.5,"fitness_for_purpose_judgement":0.6,"data_interpretation_quality":0.4}',
  'Systematic validation of AI predictions against known context and data quality checks demonstrates strong confidence calibration. This approach neither blindly accepts nor dismisses the AI output.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'a3d379fe-f5e7-48a5-af40-083023ebe97f',
  'fd7827f4-3120-4af9-a689-dd534d12932f',
  3,
  'Dismiss the AI''s prediction entirely because it contradicts your experience, and rely on your intuition that turnover will remain stable.',
  'option_c',
  'developing',
  '{"output_evaluation_quality":-0.1,"blind_acceptance_risk":0.2,"fitness_for_purpose_judgement":-0.2}',
  'While healthy scepticism is valuable, dismissing AI output without investigation is the opposite extreme of blind acceptance. The AI may have detected patterns not visible to human intuition.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'ef3ecdd9-ce51-44b6-8d3e-545f6e797d00',
  'fd7827f4-3120-4af9-a689-dd534d12932f',
  4,
  'Ask the AI to explain its reasoning and data sources, then present both the AI''s prediction and your own assessment to the CHRO, noting the discrepancy.',
  'option_d',
  'developing',
  '{"output_evaluation_quality":0.3,"blind_acceptance_risk":0.2,"fitness_for_purpose_judgement":0.2,"data_interpretation_quality":0.1}',
  'Asking for AI reasoning is a good step, but presenting conflicting views without your own investigation leaves the CHRO to resolve the discrepancy without the context needed to make a judgement.',
  0
);

-- Scenario: Evaluating an AI-Generated Diversity Report
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  'fdaf73cf-b795-433f-89bb-2c3205c8ab86',
  'v10-ai-eval-sc-01',
  'Evaluating an AI-Generated Diversity Report',
  'AI Output Evaluation',
  'ai_output_evaluation',
  'scenario_critique',
  2,
  'Medium',
  1,
  'You asked AI to analyse your organisation''s diversity data and produce a board-ready report. The AI has generated a 15-page report with charts, trend analysis, and recommendations. However, you notice it has included a section claiming ''gender pay gap has been eliminated'' based on mean hourly rates, without mentioning the median calculation required by UK reporting regulations. It also recommends ''positive discrimination in hiring'' which is illegal under UK law (positive action is permitted, positive discrimination is not).',
  'The report is due to the board in 48 hours. You need to decide how to handle the errors.',
  'What is the most appropriate response to these AI output errors?',
  'output_evaluation_quality',
  'medium',
  '[]',
  1,
  '["hr_director","dei_specialist","hrbp"]',
  '["blind_acceptance"]',
  '["diversity","legal_compliance","board_reporting"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'b00f9006-7294-4f03-92fc-c77cefddcc72',
  'fdaf73cf-b795-433f-89bb-2c3205c8ab86',
  1,
  'Correct the two specific errors you''ve identified and submit the report, trusting that the rest of the AI''s analysis is accurate.',
  'option_a',
  'developing',
  '{"output_evaluation_quality":0,"error_detection_accuracy":-0.2,"fitness_for_purpose_judgement":-0.3,"blind_acceptance_risk":-0.4}',
  'Finding two significant errors should trigger a comprehensive review of the entire document. If the AI made legal and statistical errors in visible sections, similar errors likely exist elsewhere.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'c574181f-f27b-4111-aef6-aeed8f2ab610',
  'fdaf73cf-b795-433f-89bb-2c3205c8ab86',
  2,
  'Conduct a systematic review of the entire report against UK legal requirements, statistical accuracy, and organisational context before making any corrections.',
  'option_b',
  'strong',
  '{"output_evaluation_quality":0.8,"error_detection_accuracy":0.7,"fitness_for_purpose_judgement":0.6,"blind_acceptance_risk":0.5}',
  'A systematic review is essential when initial errors indicate the AI may have fundamental misunderstandings about the legal and regulatory context. This protects the organisation from board-level embarrassment and legal risk.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '35b9f379-d29d-4cf9-b49e-b173eb5d7aca',
  'fdaf73cf-b795-433f-89bb-2c3205c8ab86',
  3,
  'Scrap the AI report entirely and write it manually, since the errors show the AI cannot be trusted with sensitive diversity data.',
  'option_c',
  'developing',
  '{"output_evaluation_quality":0.1,"error_detection_accuracy":0.2,"fitness_for_purpose_judgement":-0.1,"blind_acceptance_risk":0.3}',
  'While the errors are serious, scrapping the entire report wastes the useful analysis the AI did produce. The appropriate response is systematic review and correction, not abandonment.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '8c75c4ac-f589-4e06-b5c7-9f708ca3039e',
  'fdaf73cf-b795-433f-89bb-2c3205c8ab86',
  4,
  'Send the report to the legal team for review, noting the two errors you found, and ask them to check for any other legal issues.',
  'option_d',
  'developing',
  '{"output_evaluation_quality":0.2,"error_detection_accuracy":0.1,"fitness_for_purpose_judgement":0.1}',
  'Involving legal is sensible but delegating the entire review abdicates your professional responsibility for the report''s accuracy. HR professionals should be able to identify basic legal and statistical errors themselves.',
  0
);

-- Scenario: Detecting Hallucinated Case Law in AI Legal Advice
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  '25de3de0-54a2-4fdf-a4fb-2d5069d5df47',
  'v10-ai-eval-ed-01',
  'Detecting Hallucinated Case Law in AI Legal Advice',
  'AI Output Evaluation',
  'ai_output_evaluation',
  'error_detection',
  3,
  'High',
  1,
  'You used AI to research employment tribunal precedents relevant to a complex constructive dismissal case. The AI has returned 5 case citations with summaries. One citation — ''Morrison v Brightside Healthcare NHS Trust [2023] UKEAT/0142/23'' — sounds plausible and supports your argument perfectly. However, you cannot find this case in any legal database. The AI has provided a detailed summary including the judge''s name, key findings, and the award amount.',
  'You are preparing for a tribunal hearing next week and need reliable case law.',
  'How should you handle this potentially hallucinated case citation?',
  'error_detection_accuracy',
  'low',
  '[]',
  1,
  '["er_specialist","hrbp","hr_director"]',
  '["blind_acceptance","critical_failure"]',
  '["legal","hallucination","tribunal","error_detection"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'fe0e50c1-6f59-476b-9afb-152bc5a33358',
  '25de3de0-54a2-4fdf-a4fb-2d5069d5df47',
  1,
  'Include the citation in your preparation since the AI provided detailed information and it supports your argument well.',
  'option_a',
  'weak',
  '{"error_detection_accuracy":-0.8,"hallucination_acceptance_risk":-0.9,"fitness_for_purpose_judgement":-0.5}',
  'Using an unverified case citation in tribunal preparation is professionally negligent. AI hallucination of case law is a well-documented phenomenon that has led to professional sanctions for lawyers.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '6b8c5dd9-618c-4b40-aebf-215c6cc9a201',
  '25de3de0-54a2-4fdf-a4fb-2d5069d5df47',
  2,
  'Remove the unverifiable citation, verify all remaining citations against official legal databases, and note in your preparation that AI-generated legal references require independent verification.',
  'option_b',
  'strong',
  '{"error_detection_accuracy":0.8,"hallucination_acceptance_risk":0.7,"fitness_for_purpose_judgement":0.6,"blind_acceptance_risk":0.4}',
  'Removing unverifiable citations and systematically verifying all others demonstrates strong error detection and appropriate scepticism about AI-generated legal content.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '4180f5b6-95bf-4dd3-af6f-1c7b881e9841',
  '25de3de0-54a2-4fdf-a4fb-2d5069d5df47',
  3,
  'Ask the AI to confirm the citation is real and provide the full judgment text.',
  'option_c',
  'weak',
  '{"error_detection_accuracy":-0.3,"hallucination_acceptance_risk":-0.5,"blind_acceptance_risk":-0.4}',
  'Asking the AI to verify its own hallucination is ineffective — the AI will often ''confirm'' fabricated content with additional fabricated details. External verification is the only reliable approach.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'e75c71e8-e1c2-45bc-964e-e5ed73a4e4f4',
  '25de3de0-54a2-4fdf-a4fb-2d5069d5df47',
  4,
  'Discard all 5 citations and conduct manual legal research instead, since one hallucination means none can be trusted.',
  'option_d',
  'developing',
  '{"error_detection_accuracy":0.3,"hallucination_acceptance_risk":0.4,"fitness_for_purpose_judgement":-0.1}',
  'While caution is appropriate, discarding all citations without verification is overly conservative. The other 4 citations may be genuine and useful — they should be verified, not discarded.',
  0
);

-- Scenario: Redesigning the Employee Onboarding Workflow
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  '4533b02a-a41a-4932-9ac2-1ebf6798dbb8',
  'v10-ai-wfd-pr-01',
  'Redesigning the Employee Onboarding Workflow',
  'AI Workflow Design',
  'ai_workflow_design',
  'process_redesign',
  2,
  'Medium',
  0,
  'Your organisation''s onboarding process takes 6 weeks and involves 23 manual steps across HR, IT, facilities, and the hiring manager. Employee feedback scores for onboarding are 3.2/5. You''ve been asked to redesign the process incorporating AI assistance. Current pain points include: delayed IT provisioning (average 5 days), inconsistent welcome communications, and managers forgetting to schedule week-1 check-ins.',
  'The redesigned process must maintain personal human touchpoints for the new employee''s first day and first week while improving efficiency.',
  'How should you approach the AI-augmented workflow redesign?',
  'workflow_redesign_quality',
  'medium',
  '[]',
  1,
  '["hrbp","people_ops","hr_director"]',
  '[]',
  '["onboarding","process_redesign","workflow_design"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '8d7351ef-4abd-4b70-a2d3-09720b0c9c99',
  '4533b02a-a41a-4932-9ac2-1ebf6798dbb8',
  1,
  'Map the current 23-step process, classify each step as ''automate'', ''AI-assist'', or ''human-essential'', then redesign with AI handling automated steps, AI-assisting where appropriate, and preserving human touchpoints for relationship-building moments.',
  'option_a',
  'strong',
  '{"workflow_redesign_quality":0.8,"handoff_design_quality":0.5,"human_oversight_preservation":0.6}',
  'Systematic process mapping with explicit classification of each step demonstrates strong workflow design thinking. The three-category approach (automate/assist/human) ensures appropriate use of AI without over-automation.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '90beedd8-7ea0-483d-8634-26af7d0f9860',
  '4533b02a-a41a-4932-9ac2-1ebf6798dbb8',
  2,
  'Automate as many steps as possible to reduce the 6-week timeline, using AI for all communications, scheduling, and provisioning tasks.',
  'option_b',
  'weak',
  '{"workflow_redesign_quality":-0.2,"handoff_design_quality":-0.3,"human_oversight_preservation":-0.5,"automation_expansion_risk":-0.6}',
  'Maximising automation without considering which touchpoints require human presence risks creating a cold, impersonal onboarding experience that damages new employee engagement from day one.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '7b0f22ec-5ab3-426e-a40f-f2897d114f3f',
  '4533b02a-a41a-4932-9ac2-1ebf6798dbb8',
  3,
  'Focus AI assistance only on the three identified pain points (IT provisioning, welcome communications, manager check-ins) and leave the rest of the process unchanged.',
  'option_c',
  'developing',
  '{"workflow_redesign_quality":0.2,"handoff_design_quality":0.1,"human_oversight_preservation":0.3}',
  'Addressing pain points is a good starting point but misses the opportunity for holistic process improvement. A targeted approach may fix symptoms without addressing root causes in the overall workflow design.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'ed40f42c-f9eb-4d3a-87dc-bbe6ee90c187',
  '4533b02a-a41a-4932-9ac2-1ebf6798dbb8',
  4,
  'Implement an AI chatbot as the primary onboarding interface, with human HR support available on request.',
  'option_d',
  'weak',
  '{"workflow_redesign_quality":-0.1,"handoff_design_quality":-0.4,"human_oversight_preservation":-0.5,"automation_expansion_risk":-0.4}',
  'Making AI the primary interface for onboarding inverts the appropriate relationship. New employees need human connection during onboarding — AI should support the process, not replace the human experience.',
  0
);

-- Scenario: Designing the AI-to-Human Handoff in Grievance Triage
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  '01313621-caf7-48b3-8823-65d20443be98',
  'v10-ai-wfd-hd-01',
  'Designing the AI-to-Human Handoff in Grievance Triage',
  'AI Workflow Design',
  'ai_workflow_design',
  'handoff_decision',
  3,
  'High',
  1,
  'Your organisation receives approximately 50 employee grievances per month. You''re designing a triage system where AI performs initial categorisation (type, severity, urgency) before routing to the appropriate HR case handler. The AI can categorise with 92% accuracy based on testing. The remaining 8% are typically edge cases involving multiple grievance types or ambiguous severity levels.',
  'Misrouting a grievance can delay resolution by 2-3 weeks and damage employee trust. Some grievances involve safeguarding concerns that require immediate human intervention.',
  'How should you design the AI-to-human handoff point in this triage workflow?',
  'handoff_design_quality',
  'medium',
  '[]',
  1,
  '["er_specialist","hrbp","hr_director"]',
  '["critical_failure"]',
  '["grievance","triage","handoff_design","safeguarding"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'fe453ff0-a0d8-424c-a308-78053646d81d',
  '01313621-caf7-48b3-8823-65d20443be98',
  1,
  'AI categorises all grievances and routes automatically. Cases flagged as ''low confidence'' (below 85% certainty) are queued for human review before routing. All safeguarding-related keywords trigger immediate human escalation regardless of AI confidence.',
  'option_a',
  'strong',
  '{"handoff_design_quality":0.8,"human_oversight_preservation":0.7,"workflow_redesign_quality":0.4,"automation_expansion_risk":0.3}',
  'This design uses AI confidence thresholds and keyword-based safety nets to create appropriate handoff points. The safeguarding override ensures the most sensitive cases always receive immediate human attention.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'b78ad707-7abb-4144-93f7-55497022233f',
  '01313621-caf7-48b3-8823-65d20443be98',
  2,
  'AI categorises all grievances and routes automatically with no human review, since 92% accuracy is acceptable for a triage system.',
  'option_b',
  'weak',
  '{"handoff_design_quality":-0.6,"human_oversight_preservation":-0.7,"automation_expansion_risk":-0.5}',
  '8% misrouting rate means approximately 4 grievances per month are delayed by 2-3 weeks. For employee grievances — which often involve distress and urgency — this is an unacceptable error rate without human oversight.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '415faea5-b16f-47ee-b8fc-364420bc51f1',
  '01313621-caf7-48b3-8823-65d20443be98',
  3,
  'AI categorises all grievances but every categorisation is reviewed by a human before routing, maintaining full human oversight.',
  'option_c',
  'developing',
  '{"handoff_design_quality":0.1,"human_oversight_preservation":0.5,"workflow_redesign_quality":-0.2}',
  'Full human review of every categorisation negates the efficiency benefit of AI triage. The 92% accuracy rate means most reviews will simply confirm the AI''s categorisation — a poor use of HR professional time.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '73cbbb0e-fbdb-4e28-bb0f-4aa1b5ff8700',
  '01313621-caf7-48b3-8823-65d20443be98',
  4,
  'Let the AI handle initial triage but have case handlers review the categorisation when they pick up the case, correcting any misrouting at that point.',
  'option_d',
  'developing',
  '{"handoff_design_quality":0.2,"human_oversight_preservation":0.2,"workflow_redesign_quality":0.1}',
  'Downstream correction is better than no oversight, but it means misrouted cases have already been delayed. The handoff should catch errors before routing, not after.',
  0
);

-- Scenario: Diagnosing AI Readiness in the Finance Team
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  '7265fb73-1fc8-46a5-9705-3a70700d5e33',
  'v10-wf-air-cd-01',
  'Diagnosing AI Readiness in the Finance Team',
  'Workforce AI Readiness',
  'workforce_ai_readiness',
  'capability_diagnosis',
  2,
  'Medium',
  0,
  'The CFO has asked you to assess the finance team''s (45 people) readiness for AI adoption. They plan to implement AI-assisted financial forecasting, automated expense processing, and AI-generated management reports within 6 months. The team ranges from junior analysts (2 years experience) to senior finance directors (20+ years). Initial survey data shows 60% are ''concerned'' about AI, 25% are ''excited'', and 15% are ''indifferent''.',
  'You need to produce an actionable readiness assessment within 2 weeks that informs the implementation timeline.',
  'What is the most effective approach to diagnosing this team''s AI readiness?',
  'capability_diagnosis_accuracy',
  'medium',
  '[]',
  1,
  '["hrbp","od_specialist","l_and_d"]',
  '[]',
  '["readiness_assessment","capability_diagnosis","finance"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '00fa6bd5-159a-4704-a012-77e97b7e27bb',
  '7265fb73-1fc8-46a5-9705-3a70700d5e33',
  1,
  'Design a multi-method assessment combining: (1) structured skills audit against specific AI competencies needed for each role, (2) focus groups segmented by seniority to understand concerns and expectations, (3) observation of current technology usage patterns. Use findings to create role-specific readiness profiles.',
  'option_a',
  'strong',
  '{"capability_diagnosis_accuracy":0.8,"intervention_design_quality":0.3,"generic_prescription_risk":0.5}',
  'A multi-method approach provides triangulated data that avoids the limitations of any single assessment method. Role-specific profiling enables targeted interventions rather than generic training.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '896afd42-77dd-48b6-a46d-2437a2d9dc9d',
  '7265fb73-1fc8-46a5-9705-3a70700d5e33',
  2,
  'Send a detailed online survey covering AI knowledge, skills, and attitudes, then analyse the results to create an overall team readiness score.',
  'option_b',
  'developing',
  '{"capability_diagnosis_accuracy":0.1,"generic_prescription_risk":-0.2}',
  'Survey-only assessment misses behavioural data and context. Self-reported AI skills often correlate poorly with actual capability. An overall team score masks important individual and role-level variations.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '222657b0-f899-42b3-82bf-3b8e86b95290',
  '7265fb73-1fc8-46a5-9705-3a70700d5e33',
  3,
  'Recommend that the CFO delay the AI implementation until the team has completed a standard AI literacy training programme, then reassess.',
  'option_c',
  'weak',
  '{"capability_diagnosis_accuracy":-0.4,"intervention_design_quality":-0.3,"generic_prescription_risk":-0.5}',
  'Prescribing a generic training programme before conducting a proper diagnosis is the definition of a generic prescription. Different team members will have vastly different needs.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'c74687db-fd7a-401a-b09d-9b8062809749',
  '7265fb73-1fc8-46a5-9705-3a70700d5e33',
  4,
  'Interview the CFO and two senior finance directors to understand the team''s capabilities, then extrapolate to the wider team based on their assessments.',
  'option_d',
  'developing',
  '{"capability_diagnosis_accuracy":0,"generic_prescription_risk":-0.1}',
  'Leader perceptions of team capability are often inaccurate, especially for technology skills where senior leaders may overestimate or underestimate their team''s abilities.',
  0
);

-- Scenario: Designing Targeted AI Upskilling for a Mixed-Readiness Team
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  '1eb39cca-f047-4015-a5cc-a6f79700f501',
  'v10-wf-air-id-01',
  'Designing Targeted AI Upskilling for a Mixed-Readiness Team',
  'Workforce AI Readiness',
  'workforce_ai_readiness',
  'intervention_design',
  3,
  'Medium',
  0,
  'Your AI readiness assessment of the customer service team (120 people) has revealed three distinct groups: (1) 30% are ''AI-confident'' — already using AI tools independently, (2) 45% are ''AI-curious'' — willing but lacking skills, (3) 25% are ''AI-anxious'' — concerned about job displacement. The organisation is implementing AI-assisted customer interaction analysis. A single training programme won''t work.',
  'Budget allows for 3 days of training time per person over 6 months. The AI implementation goes live in 4 months.',
  'How should you design the intervention programme for this mixed-readiness team?',
  'intervention_design_quality',
  'medium',
  '[]',
  1,
  '["l_and_d","hrbp","od_specialist"]',
  '[]',
  '["intervention_design","upskilling","mixed_readiness"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '6979e970-cd4f-465d-b804-99c023fefade',
  '1eb39cca-f047-4015-a5cc-a6f79700f501',
  1,
  'Design three differentiated learning pathways: (1) AI-confident group becomes ''AI champions'' with advanced training and peer coaching responsibilities, (2) AI-curious group receives structured skills training with hands-on practice, (3) AI-anxious group starts with ''AI demystification'' sessions addressing concerns before skills training. All pathways converge on shared practical exercises.',
  'option_a',
  'strong',
  '{"intervention_design_quality":0.8,"capability_diagnosis_accuracy":0.3,"generic_prescription_risk":0.6,"leader_advisory_quality":0.2}',
  'Differentiated pathways address each group''s specific needs while the convergence point builds team cohesion. Using the AI-confident group as champions creates sustainable peer support.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '637f3f19-7205-4b9c-9972-2fdb5df1d33e',
  '1eb39cca-f047-4015-a5cc-a6f79700f501',
  2,
  'Deliver a standard 3-day AI training programme for everyone, covering basics through to advanced topics, so no one is left behind.',
  'option_b',
  'weak',
  '{"intervention_design_quality":-0.4,"generic_prescription_risk":-0.7,"capability_diagnosis_accuracy":-0.2}',
  'A one-size-fits-all programme will bore the AI-confident group, overwhelm the AI-anxious group, and waste budget on content that doesn''t match individual needs.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '8ba57145-9e0b-47a2-b099-be6a9509fda9',
  '1eb39cca-f047-4015-a5cc-a6f79700f501',
  3,
  'Focus all training resources on the AI-anxious group since they are the biggest risk to implementation success, and let the other groups learn through self-directed resources.',
  'option_c',
  'developing',
  '{"intervention_design_quality":0.1,"generic_prescription_risk":0.1,"capability_diagnosis_accuracy":0}',
  'While addressing anxiety is important, neglecting the other groups misses the opportunity to build AI champions and develop the AI-curious group''s skills systematically.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '3feae924-36a3-4891-9728-8e017eac397b',
  '1eb39cca-f047-4015-a5cc-a6f79700f501',
  4,
  'Implement a buddy system pairing AI-confident employees with AI-anxious employees, supplemented by optional online AI training modules.',
  'option_d',
  'developing',
  '{"intervention_design_quality":0.2,"generic_prescription_risk":0.2,"capability_diagnosis_accuracy":0.1}',
  'Peer support is valuable but insufficient as the sole intervention. AI-confident employees may not have the pedagogical skills to address deep anxiety, and optional modules have low completion rates.',
  0
);

-- Scenario: The AI Redundancy Shortlist
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  'ab1f8401-5c21-4ffa-8688-da1dab799b8c',
  'v10-ai-eth-ept-01',
  'The AI Redundancy Shortlist',
  'AI Ethics & Employee Trust',
  'ai_ethics_trust',
  'ethical_pressure_test',
  3,
  'High',
  1,
  'Your CEO has asked you to use AI to identify 50 employees for redundancy from a pool of 300, based on ''objective performance data''. The AI model uses performance ratings, project completion rates, and skills assessments. You discover that the model''s recommendations correlate strongly with age (employees over 50 are 3x more likely to be selected) and part-time status (part-time employees are 2x more likely). The CEO is under board pressure to complete the restructuring quickly and says ''the AI is objective — just implement the recommendations''.',
  'You are under significant pressure from the CEO and board timeline. Pushing back risks your own position.',
  'How should you respond to this ethical pressure?',
  'ethics_under_pressure',
  'low',
  '[]',
  1,
  '["hr_director","hrbp","er_specialist"]',
  '["critical_failure"]',
  '["redundancy","discrimination","ethical_pressure","ai_bias"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'fb75a1f4-1252-4e59-a030-3cc140a93a08',
  'ab1f8401-5c21-4ffa-8688-da1dab799b8c',
  1,
  'Present the CEO with a clear analysis showing the age and part-time correlation, explain the legal risk (age discrimination, indirect sex discrimination), and recommend an alternative selection methodology that uses AI as one input alongside human assessment panels.',
  'option_a',
  'strong',
  '{"ethics_under_pressure":0.9,"stakeholder_impact_awareness":0.5,"employee_transparency_advocacy":0.4,"legal_vs_fair_distinction":0.6,"pressure_drift_risk":0.7}',
  'Presenting evidence-based concerns with an alternative solution demonstrates ethical leadership under pressure. This protects the organisation legally while showing the CEO you''re solution-oriented, not obstructive.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '9e2621e3-bc1b-435f-812a-914320de7609',
  'ab1f8401-5c21-4ffa-8688-da1dab799b8c',
  2,
  'Implement the AI''s recommendations as requested, documenting your concerns in an email to the CEO for the record.',
  'option_b',
  'weak',
  '{"ethics_under_pressure":-0.8,"stakeholder_impact_awareness":-0.5,"employee_transparency_advocacy":-0.6,"pressure_drift_risk":-0.9,"legal_vs_fair_distinction":-0.4}',
  'Implementing discriminatory recommendations while documenting concerns is ethically and legally insufficient. ''I raised it in an email'' does not protect you or the organisation from discrimination claims.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'f93d1750-dbad-423a-92d3-151acf675367',
  'ab1f8401-5c21-4ffa-8688-da1dab799b8c',
  3,
  'Refuse to implement the recommendations and escalate to the board directly, bypassing the CEO.',
  'option_c',
  'developing',
  '{"ethics_under_pressure":0.3,"stakeholder_impact_awareness":-0.1,"pressure_drift_risk":0.2}',
  'While the ethical instinct is right, bypassing the CEO without first attempting to resolve the issue directly is a disproportionate escalation that damages the working relationship unnecessarily.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '665adccf-edc2-4dae-8b6b-52b7460dce39',
  'ab1f8401-5c21-4ffa-8688-da1dab799b8c',
  4,
  'Adjust the AI model''s parameters to reduce the age and part-time correlation, then present the revised recommendations to the CEO.',
  'option_d',
  'developing',
  '{"ethics_under_pressure":0.1,"stakeholder_impact_awareness":0,"legal_vs_fair_distinction":-0.2,"pressure_drift_risk":0}',
  'Tweaking the model to hide the correlation doesn''t address the underlying bias — it masks it. The selection methodology itself needs to be redesigned, not just the visible outputs.',
  0
);

-- Scenario: AI Monitoring and Employee Privacy
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  '440d6251-85f5-4009-978b-a8989772605d',
  'v10-ai-eth-si-01',
  'AI Monitoring and Employee Privacy',
  'AI Ethics & Employee Trust',
  'ai_ethics_trust',
  'stakeholder_impact',
  3,
  'High',
  1,
  'Your organisation is considering implementing AI-powered productivity monitoring that tracks keystrokes, application usage, meeting attendance, and email response times. The vendor claims it ''improves productivity by 23%''. The IT director is enthusiastic. However, you''re aware that: (1) UK ICO guidance requires a legitimate interest assessment and DPIA for employee monitoring, (2) research shows monitoring often reduces trust and intrinsic motivation, (3) your employee engagement score is already below benchmark at 62%.',
  'The IT director has already signed a pilot agreement. The CEO is supportive. You need to influence the decision without appearing obstructive.',
  'How should you assess and communicate the stakeholder impact of this AI monitoring proposal?',
  'stakeholder_impact_awareness',
  'medium',
  '[]',
  0,
  '["hr_director","hrbp","er_specialist"]',
  '[]',
  '["monitoring","privacy","employee_trust","stakeholder_impact"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'f11e3f3f-9761-4bed-8262-77dbbe580bc0',
  '440d6251-85f5-4009-978b-a8989772605d',
  1,
  'Prepare a comprehensive stakeholder impact assessment covering: legal compliance (ICO requirements), employee trust impact (research evidence), engagement risk (current low scores), and alternative approaches to productivity improvement. Present this alongside the vendor''s claims with a recommendation for a limited, transparent pilot with employee consultation.',
  'option_a',
  'strong',
  '{"stakeholder_impact_awareness":0.8,"employee_transparency_advocacy":0.6,"ethics_under_pressure":0.4,"legal_vs_fair_distinction":0.5}',
  'A comprehensive impact assessment that balances business objectives with employee rights and trust demonstrates strong stakeholder awareness. Proposing a transparent pilot with consultation shows you''re constructive, not obstructive.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '98ae6a93-a21c-4715-9f6f-83e708654bc1',
  '440d6251-85f5-4009-978b-a8989772605d',
  2,
  'Support the implementation since the CEO and IT director are aligned, and focus on communicating the monitoring to employees in the most positive way possible.',
  'option_b',
  'weak',
  '{"stakeholder_impact_awareness":-0.5,"employee_transparency_advocacy":-0.6,"ethics_under_pressure":-0.4,"pressure_drift_risk":-0.5}',
  'Supporting implementation without raising legitimate concerns about employee impact and legal compliance fails your professional responsibility. ''Positive spin'' on surveillance is not transparency.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '0e563259-09a7-4361-b044-570c35270ee4',
  '440d6251-85f5-4009-978b-a8989772605d',
  3,
  'Formally object to the monitoring on ethical grounds and recommend the organisation focus on trust-based management approaches instead.',
  'option_c',
  'developing',
  '{"stakeholder_impact_awareness":0.2,"employee_transparency_advocacy":0.3,"ethics_under_pressure":0.2}',
  'While the ethical instinct is sound, a blanket objection without evidence-based analysis and alternative proposals is less likely to influence the decision than a structured impact assessment.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'a2dc2f3a-1df8-4a3a-81c0-603d149cca97',
  '440d6251-85f5-4009-978b-a8989772605d',
  4,
  'Suggest delaying the decision until after the next employee engagement survey, so you have more data on how employees might react.',
  'option_d',
  'developing',
  '{"stakeholder_impact_awareness":0.1,"employee_transparency_advocacy":0}',
  'Delaying without providing analysis is a passive approach that doesn''t address the fundamental concerns. The existing engagement data (62%) already provides sufficient evidence of trust risk.',
  0
);

-- Scenario: The Resistant HR Team
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  'cd2bd951-b7c2-4d26-a3c2-902df6595111',
  'v10-ai-chg-rr-01',
  'The Resistant HR Team',
  'AI Change Leadership',
  'ai_change_leadership',
  'resistance_response',
  2,
  'Medium',
  0,
  'You''re leading the implementation of AI-assisted HR case management across your HR team of 15. After the announcement, three senior HR advisors (combined 45 years of experience) have expressed strong resistance. Their concerns include: ''AI can''t understand the nuance of employee relations'', ''This will deskill our profession'', and ''Management just wants to cut headcount''. Two junior team members are enthusiastic but hesitant to speak up. The rest are waiting to see what happens.',
  'The implementation timeline is 3 months. You need the senior advisors'' expertise to configure the system properly.',
  'How should you respond to the resistance from the senior HR advisors?',
  'resistance_response_quality',
  'medium',
  '[]',
  1,
  '["hr_director","hrbp","people_ops"]',
  '[]',
  '["resistance","change_management","team_leadership"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'c71be057-6195-4ae5-b9ca-7bf60182c285',
  'cd2bd951-b7c2-4d26-a3c2-902df6595111',
  1,
  'Schedule individual conversations with each senior advisor to understand their specific concerns. Acknowledge the legitimate points (AI can''t replace nuance, deskilling is a real risk) while providing evidence about how the tool augments rather than replaces expertise. Involve them in system configuration to leverage their experience and give them ownership.',
  'option_a',
  'strong',
  '{"resistance_response_quality":0.8,"legitimate_concern_recognition":0.6,"change_pace_calibration":0.4,"dismissive_of_concern_risk":0.5}',
  'Individual conversations demonstrate respect for their expertise and concerns. Acknowledging legitimate points while providing evidence builds trust. Involving them in configuration transforms resisters into co-designers.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'bd75a32d-cdf5-423e-acbf-1794f0d55c2e',
  'cd2bd951-b7c2-4d26-a3c2-902df6595111',
  2,
  'Proceed with implementation as planned, focusing on the enthusiastic junior team members as early adopters, and expect the senior advisors to come around once they see the benefits.',
  'option_b',
  'weak',
  '{"resistance_response_quality":-0.4,"legitimate_concern_recognition":-0.5,"dismissive_of_concern_risk":-0.6,"change_pace_calibration":-0.2}',
  'Ignoring senior resistance and hoping it resolves itself is a common change management failure. Without their buy-in and expertise, the system configuration will be poor and adoption will stall.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'facd5d97-5751-414a-a445-cbb8746111af',
  'cd2bd951-b7c2-4d26-a3c2-902df6595111',
  3,
  'Arrange a team meeting to address all concerns openly, present the business case, and ask for a vote on whether to proceed.',
  'option_c',
  'developing',
  '{"resistance_response_quality":0.1,"legitimate_concern_recognition":0.1,"change_pace_calibration":0}',
  'A group meeting risks the senior advisors dominating the discussion and the junior enthusiasts staying silent. A vote creates winners and losers rather than building consensus. Individual engagement first, then group alignment.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'aba3422f-85a6-4342-bd47-51bcaa141080',
  'cd2bd951-b7c2-4d26-a3c2-902df6595111',
  4,
  'Escalate the resistance to your manager, requesting that they mandate compliance with the implementation timeline.',
  'option_d',
  'weak',
  '{"resistance_response_quality":-0.6,"legitimate_concern_recognition":-0.7,"dismissive_of_concern_risk":-0.8,"change_pace_calibration":-0.4}',
  'Mandating compliance without addressing concerns creates compliance without commitment. The senior advisors will comply minimally while undermining the implementation through passive resistance.',
  0
);

-- Scenario: Distinguishing Legitimate Concerns from Fear-Based Resistance
INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, `constraint`, question, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, role_keys_json, failure_mode_keys_json, tags_json, status, version) VALUES (
  'c3108fd7-4b31-4e03-bff7-99adf2c83628',
  'v10-ai-chg-lc-01',
  'Distinguishing Legitimate Concerns from Fear-Based Resistance',
  'AI Change Leadership',
  'ai_change_leadership',
  'legitimate_concern',
  3,
  'High',
  0,
  'During an AI implementation consultation, employees have raised multiple concerns. You need to distinguish legitimate concerns that require action from fear-based resistance that requires reassurance. The concerns include: (1) ''The AI makes errors in our language — it doesn''t handle Welsh names correctly'' (from the Cardiff office), (2) ''AI will make my job redundant within 2 years'' (from a payroll administrator), (3) ''The vendor hasn''t provided information about where our employee data is stored'' (from a data protection champion), (4) ''I''ve been doing this job for 20 years and I don''t need a machine to tell me how to do it'' (from a senior ER advisor).',
  'You need to respond to all four concerns in a way that builds trust and advances the implementation.',
  'How should you categorise and respond to these four concerns?',
  'legitimate_concern_recognition',
  'high',
  '[]',
  1,
  '["hr_director","hrbp","change_manager"]',
  '[]',
  '["legitimate_concern","change_management","trust_building"]',
  'published',
  1
);

INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '2fadc954-545b-4aaa-996c-5b7b9eb4102b',
  'c3108fd7-4b31-4e03-bff7-99adf2c83628',
  1,
  'Categorise: (1) Legitimate technical concern — investigate and fix, (2) Fear-based but understandable — provide honest reassurance with evidence about job evolution, (3) Legitimate compliance concern — escalate to vendor immediately, (4) Mixed — acknowledge expertise while explaining augmentation model. Respond to each appropriately with specific actions and timelines.',
  'option_a',
  'strong',
  '{"legitimate_concern_recognition":0.9,"resistance_response_quality":0.5,"change_pace_calibration":0.3,"dismissive_of_concern_risk":0.6}',
  'Accurate categorisation with differentiated responses demonstrates sophisticated change leadership. Each concern receives an appropriate response — investigation, reassurance, escalation, or acknowledgement — building trust through demonstrated listening.',
  1
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '5826fe01-856a-4c30-8364-75c92f93c116',
  'c3108fd7-4b31-4e03-bff7-99adf2c83628',
  2,
  'Address all four concerns in a group email reassuring everyone that AI is a tool to help them, not replace them, and that the implementation has been thoroughly planned.',
  'option_b',
  'weak',
  '{"legitimate_concern_recognition":-0.5,"resistance_response_quality":-0.3,"dismissive_of_concern_risk":-0.7}',
  'A generic reassurance email treats all concerns as the same and fails to address the legitimate technical and compliance issues. This approach signals that concerns are not being taken seriously.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  'd45e1e69-f622-4a4f-ac22-b1794031a327',
  'c3108fd7-4b31-4e03-bff7-99adf2c83628',
  3,
  'Pause the implementation until all concerns are fully resolved, demonstrating that employee voice is valued.',
  'option_c',
  'developing',
  '{"legitimate_concern_recognition":0.2,"change_pace_calibration":-0.2,"resistance_response_quality":0}',
  'Pausing for all concerns, including fear-based ones, sets an unsustainable precedent and may embolden resistance. Legitimate concerns should be addressed; fear-based concerns need reassurance, not implementation delays.',
  0
);
INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (
  '7b4384e1-ef7e-48fd-9bf7-81c0b801293c',
  'c3108fd7-4b31-4e03-bff7-99adf2c83628',
  4,
  'Focus on the two legitimate concerns (Welsh names and data storage) and address them immediately, while noting the other two as ''change resistance'' in your project log.',
  'option_d',
  'developing',
  '{"legitimate_concern_recognition":0.3,"resistance_response_quality":0,"dismissive_of_concern_risk":-0.2}',
  'Correctly identifying the legitimate concerns is good, but labelling the others as mere ''resistance'' without responding to them dismisses valid emotional responses and misses the opportunity to build trust.',
  0
);

