-- AiQ Learning Modules Seed (v10 Capability Domains)
-- Generated: 2026-04-24T12:53:12.156Z
-- Total modules: 72

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '4f428e2b-f382-4c3f-9e5e-f243e94ad83f',
  'ai-int-tut-01',
  'Foundations of Effective AI Prompting for HR',
  'Learn the core principles of constructing clear, purposeful prompts that produce useful AI outputs in HR contexts.',
  'ai_interaction',
  'tutorial',
  1,
  'Foundation',
  15,
  10,
  'published',
  '{"overview":"This module introduces the fundamental principles of effective AI prompting, specifically tailored for HR professionals. You will learn how to structure prompts that produce relevant, accurate, and actionable outputs from AI tools commonly used in recruitment, employee relations, and workforce planning.","objectives":["Understand the anatomy of an effective AI prompt (context, instruction, format, constraints)","Identify common prompting mistakes that lead to poor AI outputs in HR contexts","Apply the CRISP framework (Context, Role, Instruction, Specificity, Parameters) to HR tasks","Recognise when a prompt needs iteration versus when to start fresh"],"sections":[{"title":"Why Prompting Matters in HR","content":"The quality of AI output is directly determined by the quality of your input. In HR, where decisions affect people''s careers, livelihoods, and wellbeing, getting accurate and appropriate AI outputs is not just a productivity issue — it is an ethical imperative. A poorly constructed prompt for a job description could introduce bias; an imprecise prompt for workforce analytics could lead to flawed strategic decisions.\\n\\nResearch from MIT Sloan (2024) found that professionals who received just 30 minutes of prompting training improved their AI output quality by 40%. For HR professionals, this improvement translates directly into better candidate experiences, more accurate workforce insights, and more defensible AI-assisted decisions.","examples":["Poor prompt: ''Write a job description for a manager'' — Too vague, no context about industry, level, or requirements","Better prompt: ''Write a job description for a mid-level HR Business Partner in financial services, emphasising AI literacy and change management skills, using inclusive language, for a UK audience''"],"tips":["Always specify the audience and context for HR outputs","Include constraints about tone, legal requirements, and organisational values"]},{"title":"The CRISP Framework","content":"CRISP is a structured approach to prompt construction designed for professional contexts:\\n\\n**Context** — What is the situation? What background does the AI need?\\n**Role** — What role should the AI adopt? (e.g., ''Act as an experienced HR consultant'')\\n**Instruction** — What specific task should it perform?\\n**Specificity** — What details, constraints, or parameters matter?\\n**Parameters** — What format, length, tone, or structure do you need?\\n\\nEach element serves a purpose. Context prevents hallucination by grounding the AI in your specific situation. Role shapes the perspective and expertise level of the response. Instruction defines the task clearly. Specificity eliminates ambiguity. Parameters ensure the output is immediately usable.","examples":["Context: ''Our organisation (500 employees, UK financial services) is implementing AI-assisted screening for graduate recruitment.''\\nRole: ''Act as an employment law specialist with CIPD expertise.''\\nInstruction: ''Draft a risk assessment for using AI in our graduate screening process.''\\nSpecificity: ''Focus on UK Equality Act 2010 implications, GDPR Article 22, and ICO guidance on automated decision-making.''\\nParameters: ''Structure as a table with columns: Risk, Likelihood, Impact, Mitigation. Maximum 10 rows.''"],"tips":["You don''t need all five CRISP elements for every prompt — but always include at least Context and Instruction","For sensitive HR topics (disciplinary, redundancy, ER), always include the Role element to set appropriate tone"]},{"title":"Common Prompting Pitfalls in HR","content":"HR professionals frequently encounter specific prompting challenges that differ from general business use:\\n\\n1. **Assumption of jurisdiction** — AI defaults to US employment law unless told otherwise. Always specify your jurisdiction.\\n2. **Bias amplification** — Vague prompts about ''ideal candidates'' can produce biased outputs. Be explicit about inclusive criteria.\\n3. **Confidentiality leakage** — Never include real employee names, identifiable details, or sensitive case information in prompts to external AI tools.\\n4. **Over-reliance on templates** — AI-generated HR templates need human review for organisational fit and legal compliance.\\n5. **Missing stakeholder context** — Prompts for employee communications that don''t specify the audience often produce tone-deaf outputs.","examples":["Pitfall: ''Draft a redundancy letter'' — Missing: jurisdiction, reason, notice period, support offered, appeal rights","Better: ''Draft a redundancy notification letter for a UK employee (2 years service) under a genuine redundancy situation. Include statutory notice period, right to appeal, outplacement support offer, and consultation meeting invitation. Tone should be empathetic but clear. Follow ACAS guidance.''"],"tips":["Create a personal ''prompt checklist'' for your most common HR tasks","When in doubt, over-specify rather than under-specify"]}],"reflectionPrompts":["Think about the last time you used an AI tool for an HR task. What information did you include in your prompt? What did you leave out that might have improved the output?","Consider a sensitive HR scenario you''ve handled recently. How would you structure a prompt to get AI assistance while protecting confidentiality?"],"citations":["Brynjolfsson, E. et al. (2024) ''Generative AI at Work'', MIT Sloan Working Paper","CIPD (2025) ''People Profession 2030: AI and the Future of HR'', Chartered Institute of Personnel and Development","ICO (2024) ''Guidance on AI and Data Protection'', Information Commissioner''s Office"],"keyTakeaways":["Prompt quality directly determines AI output quality — invest time in construction","Use the CRISP framework to structure professional prompts systematically","Always specify jurisdiction, audience, and sensitivity level for HR prompts","Never include identifiable employee information in prompts to external AI tools"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":[],"tags":["prompting","foundation","ai_interaction"],"researchBasis":"MIT Sloan 2024 study on AI productivity gains; CIPD People Profession 2030 framework"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'b924cbbd-42c7-454f-baca-55fdb4fd906e',
  'ai-int-tut-02',
  'Advanced Prompt Iteration and Refinement',
  'Master the art of iterative prompting — turning initial AI outputs into polished, HR-ready deliverables through systematic refinement.',
  'ai_interaction',
  'tutorial',
  2,
  'Developing',
  20,
  12,
  'published',
  '{"overview":"Building on foundational prompting skills, this module teaches you how to systematically refine AI outputs through structured iteration. You will learn chain-of-thought prompting, output decomposition, and the ''critique-and-improve'' cycle that transforms rough AI drafts into professional HR deliverables.","objectives":["Apply chain-of-thought prompting to complex HR analysis tasks","Use the critique-and-improve cycle to refine AI outputs systematically","Decompose complex HR tasks into prompt sequences for better results","Recognise when iteration is productive versus when to restructure the approach"],"sections":[{"title":"The Iteration Mindset","content":"Expert AI users rarely accept the first output. Research from Harvard Business School (2024) found that professionals who iterated 2-3 times on AI outputs produced work rated 35% higher in quality than those who accepted first drafts. In HR, where precision and sensitivity matter enormously, iteration is not optional — it is professional practice.\\n\\nThe key insight is that iteration is not about asking the same question repeatedly. Effective iteration involves analysing what the AI got right, identifying specific gaps, and providing targeted feedback that builds on the existing output.","examples":["First prompt: ''Analyse our exit interview data themes''\\nAI output: Generic themes about compensation and management\\nIteration: ''Good start. Now focus specifically on themes related to AI adoption concerns — our exit data shows 23% of leavers mentioned AI anxiety. Cross-reference with department and tenure data.''"],"tips":["Save your prompt chains — they become reusable templates for similar future tasks","If three iterations haven''t improved the output, the original prompt structure likely needs rethinking"]},{"title":"Chain-of-Thought Prompting for HR Analysis","content":"Chain-of-thought (CoT) prompting asks the AI to show its reasoning step by step. This is particularly valuable in HR because it makes the AI''s logic transparent and auditable — essential for decisions that affect employees.\\n\\nThe technique involves adding phrases like ''Think through this step by step'' or ''Explain your reasoning at each stage'' to your prompts. For HR, this means you can verify whether the AI''s analysis follows sound HR logic before acting on its recommendations.","examples":["Without CoT: ''Should we implement AI screening for our recruitment process?''\\nWith CoT: ''Evaluate whether we should implement AI screening for our graduate recruitment process. Think through this step by step, considering: (1) current process pain points, (2) legal requirements under UK equality law, (3) candidate experience impact, (4) bias risks, (5) implementation costs, (6) staff training needs. For each step, explain your reasoning and flag any assumptions.''"],"tips":["CoT prompting is especially valuable for policy analysis, risk assessment, and strategic recommendations","Always review the reasoning chain — if any step contains flawed logic, the conclusion is unreliable"]},{"title":"The Critique-and-Improve Cycle","content":"This three-step cycle transforms AI outputs systematically:\\n\\n**Step 1: Generate** — Produce the initial output with a well-structured prompt\\n**Step 2: Critique** — Ask the AI to identify weaknesses in its own output (or provide your own critique)\\n**Step 3: Improve** — Feed the critique back and request a revised version\\n\\nThis cycle leverages a counterintuitive finding: AI models are often better at identifying problems in existing text than generating perfect text from scratch. By separating generation from evaluation, you get significantly better results.","examples":["Step 1: ''Draft a change communication about our new AI-assisted performance review process''\\nStep 2: ''Review this draft critically. Identify: (a) any language that might cause employee anxiety, (b) missing information about data privacy, (c) unclear explanations of the human oversight process''\\nStep 3: ''Now rewrite the communication addressing all three issues. Maintain an empathetic but confident tone.''"],"tips":["The critique step works best when you provide specific evaluation criteria","For high-stakes communications (redundancy, restructuring), add a final step: ''Review for legal compliance with [specific legislation]''"]}],"reflectionPrompts":["Think about a recent AI-assisted task where you accepted the first output. How might 2-3 iterations have improved the result?","What HR tasks in your role would benefit most from chain-of-thought prompting? Why?"],"citations":["Dell''Acqua, F. et al. (2024) ''Navigating the Jagged Technological Frontier'', Harvard Business School Working Paper","Wei, J. et al. (2022) ''Chain-of-Thought Prompting Elicits Reasoning in Large Language Models'', NeurIPS","CIPD (2025) ''Responsible AI in People Management'', Research Report"],"keyTakeaways":["Iteration is professional practice, not a sign of failure — expect 2-3 refinement cycles","Chain-of-thought prompting makes AI reasoning transparent and auditable","The critique-and-improve cycle leverages AI''s strength in evaluation over generation","Save successful prompt chains as templates for recurring HR tasks"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-int-tut-01"],"tags":["prompting","iteration","ai_interaction"],"researchBasis":"Harvard Business School 2024 study on AI iteration; NeurIPS 2022 chain-of-thought research"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'e52bb15e-2faf-4829-a04b-9f0ba53e812d',
  'ai-int-vid-01',
  'AI Tools in HR: A Practical Walkthrough',
  'Video demonstration of effective AI interaction across common HR tasks — from recruitment drafting to policy analysis.',
  'ai_interaction',
  'video',
  1,
  'Foundation',
  12,
  3,
  'published',
  '{"overview":"This video module provides a practical demonstration of AI interaction techniques applied to real HR tasks. Watch as an experienced HR professional demonstrates the CRISP framework, iteration techniques, and common pitfall avoidance across recruitment, employee relations, and workforce planning scenarios.","objectives":["Observe effective AI prompting techniques applied to real HR scenarios","Identify the difference between novice and expert AI interaction patterns","Understand how to adapt prompting techniques across different AI platforms"],"sections":[{"title":"Segment 1: Recruitment — Drafting an Inclusive Job Description","content":"Demonstrates how to construct a prompt that produces a legally compliant, inclusive job description for a UK HR role, including iteration to remove bias indicators.","examples":[],"tips":[]},{"title":"Segment 2: Employee Relations — Preparing for a Difficult Conversation","content":"Shows how to use AI to prepare talking points for a performance management conversation, while maintaining confidentiality and appropriate tone.","examples":[],"tips":[]},{"title":"Segment 3: Workforce Planning — Analysing Skills Gap Data","content":"Demonstrates chain-of-thought prompting to analyse workforce skills data and produce actionable insights for leadership.","examples":[],"tips":[]}],"reflectionPrompts":["After watching, identify one technique you could apply to your current work this week."],"citations":["CIPD (2025) ''AI Tools for HR Professionals: A Practical Guide''"],"keyTakeaways":["Expert AI users spend more time on prompt construction than on reviewing outputs","Different AI platforms respond differently to the same prompt — adapt your approach","Always review AI outputs for jurisdiction-specific accuracy before use"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":[],"tags":["video","demonstration","ai_interaction"],"researchBasis":"CIPD practical guidance series"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'b00376ef-a924-4ecf-b353-79f91269b9cb',
  'ai-int-prac-01',
  'Prompt Construction Workshop: HR Scenarios',
  'Hands-on exercises building effective prompts for 5 common HR tasks, with model answers and self-assessment.',
  'ai_interaction',
  'practical',
  2,
  'Developing',
  25,
  8,
  'published',
  '{"overview":"This practical module provides structured exercises in prompt construction for common HR tasks. Each exercise presents a realistic HR scenario, asks you to construct a prompt, and then provides a model answer with explanation of why each element matters.","objectives":["Construct effective prompts for recruitment, ER, L&D, reward, and workforce planning tasks","Self-assess prompt quality against the CRISP framework criteria","Identify and correct common prompting errors in HR contexts"],"sections":[{"title":"Exercise 1: Recruitment — Screening Criteria","content":"Scenario: You need AI to help you develop fair screening criteria for a senior HRBP role. The role requires AI literacy but you want to avoid age-discriminatory proxies.\\n\\nTask: Write a prompt that will produce screening criteria that are legally defensible, inclusive, and practically useful.\\n\\nModel answer provided after your attempt.","examples":["Model prompt: ''Act as a UK employment law specialist with recruitment expertise. I need to develop screening criteria for a Senior HR Business Partner role in financial services (500 employees). The role requires strong AI literacy. Draft 8-10 screening criteria that: (1) assess AI capability without using age-discriminatory proxies like \\"digital native\\", (2) comply with UK Equality Act 2010, (3) can be objectively assessed at shortlisting stage. Format as a table with columns: Criterion, Assessment Method, Legal Consideration.''"],"tips":["Notice how the model prompt specifies what to avoid (age proxies) as well as what to include"]},{"title":"Exercise 2: Employee Relations — Investigation Summary","content":"Scenario: You need to summarise a complex grievance investigation for a senior stakeholder. The case involves allegations of AI-assisted bias in promotion decisions.\\n\\nTask: Write a prompt that produces a professional, balanced investigation summary without compromising confidentiality.","examples":[],"tips":[]},{"title":"Exercise 3: L&D — Training Needs Analysis","content":"Scenario: Your organisation needs an AI skills training programme. You want AI to help analyse the training needs across different HR functions.\\n\\nTask: Write a prompt that produces a structured training needs analysis framework.","examples":[],"tips":[]},{"title":"Exercise 4: Reward — Benchmarking Analysis","content":"Scenario: You need to use AI to analyse salary benchmarking data and produce recommendations for your annual pay review.\\n\\nTask: Write a prompt that produces defensible, data-informed pay recommendations.","examples":[],"tips":[]},{"title":"Exercise 5: Workforce Planning — Scenario Modelling","content":"Scenario: Your CEO wants to understand the workforce implications of increasing AI adoption across the organisation.\\n\\nTask: Write a prompt that produces a structured scenario analysis with workforce implications.","examples":[],"tips":[]}],"reflectionPrompts":["Which exercise did you find most challenging? What does this tell you about your prompting strengths and development areas?"],"citations":["CIPD (2025) ''AI Competency Framework for HR Professionals''","Accenture (2024) ''The Art of AI Prompting in Professional Services''"],"keyTakeaways":["Different HR tasks require different prompting strategies","Always include legal and ethical constraints in HR prompts","Self-assessment against CRISP criteria accelerates skill development"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-int-tut-01"],"tags":["practical","exercises","ai_interaction"],"researchBasis":"CIPD AI Competency Framework"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '51b47c7a-4506-4185-8860-d38766ecfd1e',
  'ai-int-prac-02',
  'Multi-Tool AI Fluency: Comparing Platforms for HR Tasks',
  'Practical exercises comparing AI tool outputs across platforms, developing tool selection judgement for different HR needs.',
  'ai_interaction',
  'practical',
  3,
  'Practitioner',
  30,
  10,
  'published',
  '{"overview":"This module develops your ability to select and use the right AI tool for specific HR tasks. Through comparative exercises, you will learn how different AI platforms handle the same HR prompts differently, and develop judgement about which tool to use when.","objectives":["Compare AI tool outputs for the same HR task across multiple platforms","Develop selection criteria for choosing the right AI tool for specific HR needs","Identify platform-specific strengths and limitations for HR use cases"],"sections":[{"title":"Exercise: Policy Analysis Comparison","content":"Use the same prompt across two different AI tools to analyse a draft AI usage policy. Compare the outputs for: completeness, legal accuracy, practical usefulness, and tone appropriateness.","examples":[],"tips":["Document which tool performed better on each criterion — this builds your personal tool selection framework"]},{"title":"Exercise: Data Analysis Comparison","content":"Provide the same workforce dataset summary to two AI tools and compare their analytical outputs. Evaluate: depth of insight, statistical accuracy, and actionability of recommendations.","examples":[],"tips":[]}],"reflectionPrompts":["Based on these exercises, what criteria would you use to select an AI tool for a high-stakes HR task?"],"citations":["MIT Technology Review (2024) ''Choosing the Right AI Tool for Professional Tasks''"],"keyTakeaways":["No single AI tool is best for all HR tasks — develop selection judgement","Platform comparison is a valuable professional skill, not just a technical exercise"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-int-prac-01"],"tags":["practical","tool_fluency","ai_interaction"],"researchBasis":"MIT Technology Review comparative analysis"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '44f8b5d5-083d-48f2-9e2c-cc0238194164',
  'ai-int-cs-01',
  'Case Study: AI-Assisted Recruitment at Scale',
  'How a mid-size UK employer transformed their graduate recruitment process through effective AI interaction — lessons learned and pitfalls avoided.',
  'ai_interaction',
  'case_study',
  3,
  'Practitioner',
  20,
  12,
  'published',
  '{"overview":"This case study examines how a 2,000-employee UK financial services firm implemented AI-assisted recruitment for their graduate programme. It explores the prompting strategies that worked, the failures that occurred, and the governance framework they developed.","objectives":["Analyse a real-world AI implementation in HR recruitment","Identify the prompting strategies that contributed to success","Understand the governance framework needed for AI-assisted recruitment"],"sections":[{"title":"Background","content":"Meridian Financial Services received 4,500 applications for 50 graduate positions in 2024. Their HR team of 8 was spending 60% of Q1 on initial screening. They decided to use AI to assist with initial application review, competency-based question generation, and candidate communication.","examples":[],"tips":[]},{"title":"What Worked","content":"The team developed a structured prompt library for each stage of the recruitment process. Key success factors included: (1) involving the employment lawyer in prompt design, (2) creating role-specific prompt templates rather than generic ones, (3) implementing a human review stage for every AI-generated candidate communication, (4) training all recruiters in prompt iteration techniques.","examples":[],"tips":[]},{"title":"What Failed","content":"Initial attempts to use AI for candidate ranking produced outputs that correlated with university prestige — an indirect proxy for socioeconomic background. The team discovered this through adverse impact analysis and redesigned their prompts to focus on competency evidence rather than institutional signals.","examples":[],"tips":[]},{"title":"Governance Framework","content":"Meridian developed a three-tier governance model: (1) Low-risk tasks (drafting, formatting) — AI output used with light-touch review, (2) Medium-risk tasks (screening criteria, interview questions) — AI output reviewed by qualified HR professional, (3) High-risk tasks (candidate ranking, offer decisions) — AI used for analysis only, all decisions made by humans with documented rationale.","examples":[],"tips":[]}],"reflectionPrompts":["How would you adapt Meridian''s governance framework for your organisation?","What additional safeguards would you implement for AI-assisted recruitment in your context?"],"citations":["EHRC (2024) ''Artificial Intelligence in Recruitment: Guidance for Employers''","ICO (2024) ''AI and Recruitment: Data Protection Considerations''","CIPD (2025) ''Case Studies in Responsible AI Adoption''"],"keyTakeaways":["Structured prompt libraries reduce risk and improve consistency","Adverse impact analysis is essential for AI-assisted recruitment","Governance frameworks should be tiered by decision risk level","Legal involvement in prompt design prevents downstream compliance issues"]}',
  '{"roleRelevance":["talent_acquisition","hrbp","hr_director"],"prerequisites":["ai-int-tut-01"],"tags":["case_study","recruitment","ai_interaction"],"researchBasis":"EHRC and ICO guidance on AI in recruitment"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'ad46d9ad-bb96-4c3b-94de-9338e6395eae',
  'ai-int-cs-02',
  'Case Study: When AI Prompting Goes Wrong in HR',
  'Analysis of real-world AI prompting failures in HR contexts — confidentiality breaches, bias amplification, and legal exposure.',
  'ai_interaction',
  'case_study',
  4,
  'Advanced',
  20,
  12,
  'published',
  '{"overview":"This case study analyses three real-world incidents where poor AI prompting in HR contexts led to serious consequences: a confidentiality breach through prompt injection, bias amplification in performance reviews, and legal exposure from AI-generated employment advice.","objectives":["Analyse root causes of AI prompting failures in HR","Develop risk mitigation strategies for high-stakes AI use","Create personal safeguards against common failure modes"],"sections":[{"title":"Incident 1: The Confidentiality Breach","content":"An HR manager pasted a full grievance letter into an external AI tool to help draft a response. The letter contained the complainant''s name, medical information, and allegations against a named manager. The AI tool''s terms of service allowed training on user inputs. Analysis: The root cause was not the AI tool — it was the prompting practice. The HR manager should have anonymised all details before using external AI assistance.","examples":[],"tips":[]},{"title":"Incident 2: Bias Amplification in Performance Reviews","content":"A people analytics team used AI to identify ''high potential'' employees from performance review text. The prompt asked for ''leadership qualities'' without defining them. The AI''s outputs correlated strongly with gender and ethnicity — male employees were 2.3x more likely to be flagged as ''high potential''. Analysis: The vague prompt allowed the AI to replicate historical bias patterns embedded in the review language.","examples":[],"tips":[]},{"title":"Incident 3: Legal Exposure from AI Advice","content":"An HR advisor used AI to draft redundancy consultation letters without specifying UK jurisdiction. The AI produced letters following US ''at-will'' employment principles, omitting statutory consultation requirements. Two employees filed unfair dismissal claims citing inadequate consultation. Analysis: Jurisdiction specification is not optional in HR prompting — it is a legal necessity.","examples":[],"tips":[]}],"reflectionPrompts":["Which of these failure modes is most likely to occur in your organisation? What safeguards would prevent it?","Draft a ''pre-flight checklist'' for AI prompting in sensitive HR contexts based on these case studies."],"citations":["ICO (2024) ''Data Protection and AI: Enforcement Actions''","ACAS (2025) ''AI in the Workplace: Good Practice Guide''","Raghavan, M. et al. (2020) ''Mitigating Bias in Algorithmic Hiring'', FAT* Conference"],"keyTakeaways":["Confidentiality must be protected before any data enters an AI prompt","Vague prompts about human qualities amplify historical bias","Jurisdiction specification is a legal requirement, not a nice-to-have","Every AI prompting failure in HR has a human prevention strategy"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-int-tut-01","ai-int-tut-02"],"tags":["case_study","risk","failure_analysis","ai_interaction"],"researchBasis":"ICO enforcement actions; FAT* Conference bias research"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '3f4996a8-2dad-482b-a834-0e4e8b2aad52',
  'ai-int-scn-01',
  'Scenario: The Urgent Policy Draft',
  'Navigate a time-pressured situation where you must use AI to draft an AI usage policy — balancing speed with quality and compliance.',
  'ai_interaction',
  'scenario',
  3,
  'Practitioner',
  15,
  8,
  'published',
  '{"overview":"Your CEO has asked for a draft AI usage policy by end of day. You have 4 hours. This scenario tests your ability to use AI effectively under time pressure while maintaining quality and compliance standards.","objectives":["Apply prompting skills under realistic time pressure","Balance speed with quality in AI-assisted drafting","Make appropriate risk decisions about AI output review depth"],"sections":[{"title":"The Situation","content":"It''s 2pm on Thursday. Your CEO has just returned from a board meeting where AI governance was discussed. She wants a draft AI usage policy on her desk by 6pm for the next board meeting. You have no existing policy template. Your legal team is unavailable until Monday. What do you do?","examples":[],"tips":[]},{"title":"Decision Point 1: Approach","content":"Do you: (A) Use AI to generate a complete policy draft, (B) Use AI to generate a framework and fill in the details yourself, (C) Use AI to research best practice and write the policy manually, (D) Tell the CEO it cannot be done responsibly in 4 hours?","examples":[],"tips":[]},{"title":"Decision Point 2: Review Depth","content":"You have a draft. With 90 minutes remaining, do you: (A) Send it as-is with a note that legal review is needed, (B) Review every clause yourself and delay if needed, (C) Focus review on highest-risk sections (data, liability, compliance) and flag others for legal review?","examples":[],"tips":[]}],"reflectionPrompts":["What would you actually do in this situation? Is there a difference between the ''right'' answer and the ''realistic'' answer?"],"citations":["CIPD (2025) ''AI Governance for HR: Quick Start Guide''"],"keyTakeaways":["Time pressure does not eliminate the need for human review of AI outputs","Risk-based review prioritisation is a professional skill","Flagging limitations honestly is more professional than presenting AI output as complete"]}',
  '{"roleRelevance":["hrbp","hr_director","people_ops"],"prerequisites":["ai-int-tut-01"],"tags":["scenario","time_pressure","ai_interaction"],"researchBasis":"CIPD AI Governance guidance"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '4bf580a3-6a8d-40c9-9b25-c75c2ed84d27',
  'ai-int-scn-02',
  'Scenario: The AI Tool Evaluation',
  'Your organisation is selecting an AI tool for HR. Navigate the evaluation process, testing tools effectively and making a defensible recommendation.',
  'ai_interaction',
  'scenario',
  4,
  'Advanced',
  20,
  10,
  'published',
  '{"overview":"You have been asked to lead the evaluation of three AI tools for HR use across your organisation. This scenario tests your ability to design evaluation criteria, test tools systematically, and make a defensible recommendation.","objectives":["Design evaluation criteria for AI tools in HR contexts","Test AI tools systematically using controlled prompts","Present a defensible recommendation with evidence"],"sections":[{"title":"The Brief","content":"Your CHRO wants a recommendation for an enterprise AI tool for the HR function (200 HR professionals across 5 countries). Budget: £150k/year. Timeline: recommendation in 3 weeks.","examples":[],"tips":[]},{"title":"Decision Points","content":"Design your evaluation framework, select test scenarios, conduct comparative testing, and prepare your recommendation with risk assessment.","examples":[],"tips":[]}],"reflectionPrompts":["What evaluation criteria would be non-negotiable for your organisation?"],"citations":["Gartner (2025) ''Magic Quadrant for AI in HR Technology''"],"keyTakeaways":["Tool evaluation requires structured, repeatable testing methodology","HR-specific criteria (bias testing, jurisdiction awareness, data residency) are essential"]}',
  '{"roleRelevance":["hr_director","people_ops","hr_technology"],"prerequisites":["ai-int-prac-02"],"tags":["scenario","evaluation","ai_interaction"],"researchBasis":"Gartner HR Technology research"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '77f879dc-5879-49a0-b4e6-f05ce72d5d81',
  'ai-int-ref-01',
  'Reflection: My AI Interaction Journey',
  'Guided reflection on your AI interaction development — identifying strengths, growth areas, and personal development goals.',
  'ai_interaction',
  'reflection',
  2,
  'Developing',
  15,
  5,
  'published',
  '{"overview":"This guided reflection helps you assess your current AI interaction capabilities, identify patterns in your AI use, and set specific development goals.","objectives":["Honestly assess your current AI interaction skill level","Identify specific patterns in your AI use that help or hinder effectiveness","Set 3 concrete development goals for the next 30 days"],"sections":[{"title":"Reflection Exercise","content":"Consider your AI interactions over the past month. How often did you iterate on prompts? How often did you accept first outputs? What was the quality difference?","examples":[],"tips":[]}],"reflectionPrompts":["What is your biggest strength in AI interaction? What evidence supports this?","What is your most significant development area? What specific actions will you take?","How has your AI interaction approach changed since you started this learning path?"],"citations":[],"keyTakeaways":["Self-awareness is the foundation of skill development","Concrete goals with timelines drive improvement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-int-tut-01"],"tags":["reflection","self_assessment","ai_interaction"],"researchBasis":"Kolb experiential learning cycle"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '0e972e40-babb-4884-8e06-34d74b7764c9',
  'ai-int-coach-01',
  'AI Coaching: Mastering Complex HR Prompting',
  'AI-guided coaching dialogue to develop advanced prompting skills for complex, multi-stakeholder HR scenarios.',
  'ai_interaction',
  'coaching',
  4,
  'Advanced',
  20,
  5,
  'published',
  '{"overview":"This coaching module uses AI-guided dialogue to develop your advanced prompting skills. Through a series of increasingly complex HR scenarios, you will receive personalised feedback on your prompt construction and iteration approach.","objectives":["Develop advanced prompting skills through guided practice","Receive personalised feedback on prompt quality","Build confidence in handling complex, multi-stakeholder HR scenarios with AI"],"sections":[{"title":"Coaching Session","content":"The AI coach will present you with progressively complex HR scenarios and guide you through prompt construction, providing real-time feedback and suggestions for improvement.","examples":[],"tips":[]}],"reflectionPrompts":["What was the most valuable feedback you received during this coaching session?"],"citations":[],"keyTakeaways":["Coaching accelerates skill development through personalised feedback","Complex scenarios require multi-step prompting strategies"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-int-tut-02","ai-int-prac-01"],"tags":["coaching","advanced","ai_interaction"],"researchBasis":"Coaching effectiveness research"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'b658a386-7ce0-4f3f-863e-7b437629bc48',
  'ai-int-quiz-01',
  'Knowledge Check: AI Interaction Fundamentals',
  'Validate your understanding of AI interaction principles, prompting techniques, and best practices for HR contexts.',
  'ai_interaction',
  'quiz',
  3,
  'Practitioner',
  10,
  3,
  'published',
  '{"overview":"This quiz validates your understanding of AI interaction fundamentals covered in the AI Interaction learning path. It covers prompting principles, iteration techniques, tool selection, and HR-specific considerations.","objectives":["Validate knowledge retention from AI Interaction modules","Identify any remaining knowledge gaps","Confirm readiness to progress to advanced modules"],"sections":[{"title":"Quiz Format","content":"15 questions covering: CRISP framework application, iteration techniques, tool fluency, HR-specific prompting considerations, and risk awareness. Pass mark: 70%.","examples":[],"tips":[]}],"reflectionPrompts":["Review any questions you got wrong — what concept needs reinforcement?"],"citations":[],"keyTakeaways":["Regular knowledge validation ensures solid foundations before advancing"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-int-tut-01","ai-int-tut-02"],"tags":["quiz","validation","ai_interaction"],"researchBasis":"Spaced repetition and testing effect research"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '702fc9a1-862f-470e-96a8-6444d75cd4ac',
  'ai-eval-tut-01',
  'Foundations of AI Output Evaluation for HR',
  'Learn to critically assess AI-generated content for accuracy, bias, and fitness for purpose in HR contexts.',
  'ai_output_evaluation',
  'tutorial',
  1,
  'Foundation',
  15,
  10,
  'published',
  '{"overview":"This tutorial module covers foundations of ai output evaluation for hr within the AI Output Evaluation capability domain. Learn to critically assess AI-generated content for accuracy, bias, and fitness for purpose in HR contexts.","objectives":["Understand key concepts related to foundations of ai output evaluation for hr","Apply AI Output Evaluation principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Output Evaluation for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Output Evaluation: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Output Evaluation is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":[],"tags":["tutorial","ai_output_evaluation"],"researchBasis":"CIPD and academic research on AI Output Evaluation"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '0631ed84-5b68-4af1-b990-cc0ca63a5331',
  'ai-eval-tut-02',
  'Detecting Hallucinations and Fabricated Content',
  'Master techniques for identifying AI hallucinations — fabricated facts, invented citations, and plausible-sounding nonsense in HR outputs.',
  'ai_output_evaluation',
  'tutorial',
  2,
  'Developing',
  20,
  12,
  'published',
  '{"overview":"This tutorial module covers detecting hallucinations and fabricated content within the AI Output Evaluation capability domain. Master techniques for identifying AI hallucinations — fabricated facts, invented citations, and plausible-sounding nonsense in HR outputs.","objectives":["Understand key concepts related to detecting hallucinations and fabricated content","Apply AI Output Evaluation principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Output Evaluation for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Output Evaluation: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Output Evaluation is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eval-tut-01"],"tags":["tutorial","ai_output_evaluation"],"researchBasis":"CIPD and academic research on AI Output Evaluation"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'fa0b4051-b1fe-40fc-a840-0a384753a8c1',
  'ai-eval-vid-01',
  'Spotting AI Bias in HR Outputs: A Visual Guide',
  'Video walkthrough of bias detection techniques applied to AI-generated recruitment, performance, and workforce planning outputs.',
  'ai_output_evaluation',
  'video',
  1,
  'Foundation',
  12,
  3,
  'published',
  '{"overview":"This video module covers spotting ai bias in hr outputs: a visual guide within the AI Output Evaluation capability domain. Video walkthrough of bias detection techniques applied to AI-generated recruitment, performance, and workforce planning outputs.","objectives":["Understand key concepts related to spotting ai bias in hr outputs: a visual guide","Apply AI Output Evaluation principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Output Evaluation for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Output Evaluation: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Output Evaluation is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":[],"tags":["video","ai_output_evaluation"],"researchBasis":"CIPD and academic research on AI Output Evaluation"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '282bdb1d-71ee-403b-8f98-cfa985bd4fd6',
  'ai-eval-prac-01',
  'Output Quality Assessment Workshop',
  'Hands-on exercises evaluating real AI outputs against quality criteria for HR deliverables.',
  'ai_output_evaluation',
  'practical',
  2,
  'Developing',
  25,
  8,
  'published',
  '{"overview":"This practical module covers output quality assessment workshop within the AI Output Evaluation capability domain. Hands-on exercises evaluating real AI outputs against quality criteria for HR deliverables.","objectives":["Understand key concepts related to output quality assessment workshop","Apply AI Output Evaluation principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Output Evaluation for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Output Evaluation: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Output Evaluation is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eval-tut-01"],"tags":["practical","ai_output_evaluation"],"researchBasis":"CIPD and academic research on AI Output Evaluation"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'b4ae15a5-22c6-4f9c-85fa-eb94295c7a26',
  'ai-eval-prac-02',
  'Error Detection and Correction Drills',
  'Timed exercises identifying and correcting errors in AI-generated HR documents — from factual inaccuracies to legal non-compliance.',
  'ai_output_evaluation',
  'practical',
  3,
  'Practitioner',
  30,
  10,
  'published',
  '{"overview":"This practical module covers error detection and correction drills within the AI Output Evaluation capability domain. Timed exercises identifying and correcting errors in AI-generated HR documents — from factual inaccuracies to legal non-compliance.","objectives":["Understand key concepts related to error detection and correction drills","Apply AI Output Evaluation principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Output Evaluation for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Output Evaluation: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Output Evaluation is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eval-tut-01"],"tags":["practical","ai_output_evaluation"],"researchBasis":"CIPD and academic research on AI Output Evaluation"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'c64c4423-5450-4a50-8169-d9576ec9e223',
  'ai-eval-cs-01',
  'Case Study: The AI-Generated Report That Misled the Board',
  'Analysis of how uncritical acceptance of AI workforce analytics led to a flawed strategic decision.',
  'ai_output_evaluation',
  'case_study',
  3,
  'Practitioner',
  20,
  12,
  'published',
  '{"overview":"This case_study module covers case study: the ai-generated report that misled the board within the AI Output Evaluation capability domain. Analysis of how uncritical acceptance of AI workforce analytics led to a flawed strategic decision.","objectives":["Understand key concepts related to case study: the ai-generated report that misled the board","Apply AI Output Evaluation principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Output Evaluation for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Output Evaluation: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Output Evaluation is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eval-tut-01"],"tags":["case_study","ai_output_evaluation"],"researchBasis":"CIPD and academic research on AI Output Evaluation"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'c273e4be-a9b5-4ba7-ae87-f09e7fa2bb24',
  'ai-eval-cs-02',
  'Case Study: Bias in AI-Assisted Performance Calibration',
  'How an organisation discovered and addressed systematic bias in AI-assisted performance review calibration.',
  'ai_output_evaluation',
  'case_study',
  4,
  'Advanced',
  20,
  12,
  'published',
  '{"overview":"This case_study module covers case study: bias in ai-assisted performance calibration within the AI Output Evaluation capability domain. How an organisation discovered and addressed systematic bias in AI-assisted performance review calibration.","objectives":["Understand key concepts related to case study: bias in ai-assisted performance calibration","Apply AI Output Evaluation principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Output Evaluation for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Output Evaluation: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Output Evaluation is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eval-tut-01"],"tags":["case_study","ai_output_evaluation"],"researchBasis":"CIPD and academic research on AI Output Evaluation"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '43958294-e284-4045-bb1f-00a933931fae',
  'ai-eval-scn-01',
  'Scenario: The Suspicious Workforce Report',
  'An AI-generated workforce report contains findings that seem too good to be true. Investigate, validate, and decide what to present to leadership.',
  'ai_output_evaluation',
  'scenario',
  3,
  'Practitioner',
  15,
  8,
  'published',
  '{"overview":"This scenario module covers scenario: the suspicious workforce report within the AI Output Evaluation capability domain. An AI-generated workforce report contains findings that seem too good to be true. Investigate, validate, and decide what to present to leadership.","objectives":["Understand key concepts related to scenario: the suspicious workforce report","Apply AI Output Evaluation principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Output Evaluation for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Output Evaluation: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Output Evaluation is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eval-tut-01"],"tags":["scenario","ai_output_evaluation"],"researchBasis":"CIPD and academic research on AI Output Evaluation"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'a7b59e21-b793-4bec-9cd6-05ed46e65038',
  'ai-eval-scn-02',
  'Scenario: The Biased Shortlist',
  'You discover that AI-assisted candidate shortlisting has produced a demographically skewed list. Navigate the investigation and remediation.',
  'ai_output_evaluation',
  'scenario',
  4,
  'Advanced',
  20,
  10,
  'published',
  '{"overview":"This scenario module covers scenario: the biased shortlist within the AI Output Evaluation capability domain. You discover that AI-assisted candidate shortlisting has produced a demographically skewed list. Navigate the investigation and remediation.","objectives":["Understand key concepts related to scenario: the biased shortlist","Apply AI Output Evaluation principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Output Evaluation for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Output Evaluation: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Output Evaluation is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eval-tut-01"],"tags":["scenario","ai_output_evaluation"],"researchBasis":"CIPD and academic research on AI Output Evaluation"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'af208693-4fc3-4a31-a7c8-da58f8a76a83',
  'ai-eval-ref-01',
  'Reflection: My Critical Evaluation Habits',
  'Guided reflection on your AI output evaluation practices — identifying blind spots and building stronger critical habits.',
  'ai_output_evaluation',
  'reflection',
  2,
  'Developing',
  15,
  5,
  'published',
  '{"overview":"This reflection module covers reflection: my critical evaluation habits within the AI Output Evaluation capability domain. Guided reflection on your AI output evaluation practices — identifying blind spots and building stronger critical habits.","objectives":["Understand key concepts related to reflection: my critical evaluation habits","Apply AI Output Evaluation principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Output Evaluation for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Output Evaluation: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Output Evaluation is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eval-tut-01"],"tags":["reflection","ai_output_evaluation"],"researchBasis":"CIPD and academic research on AI Output Evaluation"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'cdf51513-a58f-4282-91c8-011b982a2f3c',
  'ai-eval-coach-01',
  'AI Coaching: Advanced Output Evaluation',
  'AI-guided coaching to sharpen your ability to detect subtle errors, bias, and quality issues in complex HR outputs.',
  'ai_output_evaluation',
  'coaching',
  4,
  'Advanced',
  20,
  5,
  'published',
  '{"overview":"This coaching module covers ai coaching: advanced output evaluation within the AI Output Evaluation capability domain. AI-guided coaching to sharpen your ability to detect subtle errors, bias, and quality issues in complex HR outputs.","objectives":["Understand key concepts related to ai coaching: advanced output evaluation","Apply AI Output Evaluation principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Output Evaluation for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Output Evaluation: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Output Evaluation is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eval-tut-01"],"tags":["coaching","ai_output_evaluation"],"researchBasis":"CIPD and academic research on AI Output Evaluation"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'fd89eb49-842e-4754-997f-7569638252d3',
  'ai-eval-quiz-01',
  'Knowledge Check: AI Output Evaluation',
  'Validate your ability to critically evaluate AI outputs for accuracy, bias, and fitness for purpose.',
  'ai_output_evaluation',
  'quiz',
  3,
  'Practitioner',
  10,
  3,
  'published',
  '{"overview":"This quiz module covers knowledge check: ai output evaluation within the AI Output Evaluation capability domain. Validate your ability to critically evaluate AI outputs for accuracy, bias, and fitness for purpose.","objectives":["Understand key concepts related to knowledge check: ai output evaluation","Apply AI Output Evaluation principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Output Evaluation for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Output Evaluation: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Output Evaluation is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eval-tut-01"],"tags":["quiz","ai_output_evaluation"],"researchBasis":"CIPD and academic research on AI Output Evaluation"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '10e694a4-7838-4439-8ba7-e1816a8b7032',
  'ai-wfd-tut-01',
  'Foundations of AI Workflow Design in HR',
  'Learn to analyse existing HR processes and identify opportunities for AI augmentation while preserving human oversight.',
  'ai_workflow_design',
  'tutorial',
  1,
  'Foundation',
  15,
  10,
  'published',
  '{"overview":"This tutorial module covers foundations of ai workflow design in hr within the AI Workflow Design capability domain. Learn to analyse existing HR processes and identify opportunities for AI augmentation while preserving human oversight.","objectives":["Understand key concepts related to foundations of ai workflow design in hr","Apply AI Workflow Design principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Workflow Design for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Workflow Design: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Workflow Design is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":[],"tags":["tutorial","ai_workflow_design"],"researchBasis":"CIPD and academic research on AI Workflow Design"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '5cceab79-e94a-433a-8831-d2ac7b2a0375',
  'ai-wfd-tut-02',
  'Designing Human-AI Handoff Points',
  'Master the art of designing effective handoff points between AI and human decision-makers in HR processes.',
  'ai_workflow_design',
  'tutorial',
  2,
  'Developing',
  20,
  12,
  'published',
  '{"overview":"This tutorial module covers designing human-ai handoff points within the AI Workflow Design capability domain. Master the art of designing effective handoff points between AI and human decision-makers in HR processes.","objectives":["Understand key concepts related to designing human-ai handoff points","Apply AI Workflow Design principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Workflow Design for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Workflow Design: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Workflow Design is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-wfd-tut-01"],"tags":["tutorial","ai_workflow_design"],"researchBasis":"CIPD and academic research on AI Workflow Design"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '7a4bc07d-ded6-4bc3-99c5-c2cd0bbdea9c',
  'ai-wfd-vid-01',
  'AI Process Mapping: From Manual to Augmented',
  'Video demonstration of process mapping techniques for identifying AI augmentation opportunities in HR workflows.',
  'ai_workflow_design',
  'video',
  1,
  'Foundation',
  12,
  3,
  'published',
  '{"overview":"This video module covers ai process mapping: from manual to augmented within the AI Workflow Design capability domain. Video demonstration of process mapping techniques for identifying AI augmentation opportunities in HR workflows.","objectives":["Understand key concepts related to ai process mapping: from manual to augmented","Apply AI Workflow Design principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Workflow Design for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Workflow Design: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Workflow Design is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":[],"tags":["video","ai_workflow_design"],"researchBasis":"CIPD and academic research on AI Workflow Design"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '4a5b1eaf-b9b7-4ed6-b14b-db975768ed80',
  'ai-wfd-prac-01',
  'Process Redesign Workshop: Recruitment Pipeline',
  'Hands-on exercise redesigning a recruitment pipeline to incorporate AI at appropriate stages with proper oversight.',
  'ai_workflow_design',
  'practical',
  2,
  'Developing',
  30,
  10,
  'published',
  '{"overview":"This practical module covers process redesign workshop: recruitment pipeline within the AI Workflow Design capability domain. Hands-on exercise redesigning a recruitment pipeline to incorporate AI at appropriate stages with proper oversight.","objectives":["Understand key concepts related to process redesign workshop: recruitment pipeline","Apply AI Workflow Design principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Workflow Design for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Workflow Design: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Workflow Design is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-wfd-tut-01"],"tags":["practical","ai_workflow_design"],"researchBasis":"CIPD and academic research on AI Workflow Design"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '979cfd64-8d69-4a59-ae4a-5644c6892305',
  'ai-wfd-prac-02',
  'Automation Risk Assessment Exercise',
  'Practical exercise assessing which HR process steps are safe to automate versus those requiring human oversight.',
  'ai_workflow_design',
  'practical',
  3,
  'Practitioner',
  25,
  8,
  'published',
  '{"overview":"This practical module covers automation risk assessment exercise within the AI Workflow Design capability domain. Practical exercise assessing which HR process steps are safe to automate versus those requiring human oversight.","objectives":["Understand key concepts related to automation risk assessment exercise","Apply AI Workflow Design principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Workflow Design for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Workflow Design: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Workflow Design is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-wfd-tut-01"],"tags":["practical","ai_workflow_design"],"researchBasis":"CIPD and academic research on AI Workflow Design"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '3ccb3650-b04c-4394-8d32-cdf29da02961',
  'ai-wfd-cs-01',
  'Case Study: AI-Augmented Onboarding at Scale',
  'How a global organisation redesigned their onboarding process with AI, reducing time-to-productivity by 40% while maintaining personal touch.',
  'ai_workflow_design',
  'case_study',
  3,
  'Practitioner',
  20,
  12,
  'published',
  '{"overview":"This case_study module covers case study: ai-augmented onboarding at scale within the AI Workflow Design capability domain. How a global organisation redesigned their onboarding process with AI, reducing time-to-productivity by 40% while maintaining personal touch.","objectives":["Understand key concepts related to case study: ai-augmented onboarding at scale","Apply AI Workflow Design principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Workflow Design for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Workflow Design: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Workflow Design is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-wfd-tut-01"],"tags":["case_study","ai_workflow_design"],"researchBasis":"CIPD and academic research on AI Workflow Design"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '93cd9c26-22e0-49d9-9e0b-6bc342930978',
  'ai-wfd-cs-02',
  'Case Study: The Over-Automated HR Function',
  'When AI automation went too far — how an organisation lost employee trust by removing human touchpoints from sensitive HR processes.',
  'ai_workflow_design',
  'case_study',
  4,
  'Advanced',
  20,
  12,
  'published',
  '{"overview":"This case_study module covers case study: the over-automated hr function within the AI Workflow Design capability domain. When AI automation went too far — how an organisation lost employee trust by removing human touchpoints from sensitive HR processes.","objectives":["Understand key concepts related to case study: the over-automated hr function","Apply AI Workflow Design principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Workflow Design for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Workflow Design: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Workflow Design is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-wfd-tut-01"],"tags":["case_study","ai_workflow_design"],"researchBasis":"CIPD and academic research on AI Workflow Design"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '7eb067ec-54e1-45fb-b43f-6653686ab89b',
  'ai-wfd-scn-01',
  'Scenario: The Efficiency vs. Empathy Dilemma',
  'Your CEO wants to automate the entire employee exit process. Navigate the tension between efficiency and employee experience.',
  'ai_workflow_design',
  'scenario',
  3,
  'Practitioner',
  15,
  8,
  'published',
  '{"overview":"This scenario module covers scenario: the efficiency vs. empathy dilemma within the AI Workflow Design capability domain. Your CEO wants to automate the entire employee exit process. Navigate the tension between efficiency and employee experience.","objectives":["Understand key concepts related to scenario: the efficiency vs. empathy dilemma","Apply AI Workflow Design principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Workflow Design for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Workflow Design: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Workflow Design is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-wfd-tut-01"],"tags":["scenario","ai_workflow_design"],"researchBasis":"CIPD and academic research on AI Workflow Design"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '9cabee4e-b254-4cab-a156-c09ef9354440',
  'ai-wfd-scn-02',
  'Scenario: Designing the AI-Augmented HRBP',
  'Design a workflow model for an AI-augmented HRBP role — what stays human, what gets AI-assisted, and what gets automated.',
  'ai_workflow_design',
  'scenario',
  4,
  'Advanced',
  20,
  10,
  'published',
  '{"overview":"This scenario module covers scenario: designing the ai-augmented hrbp within the AI Workflow Design capability domain. Design a workflow model for an AI-augmented HRBP role — what stays human, what gets AI-assisted, and what gets automated.","objectives":["Understand key concepts related to scenario: designing the ai-augmented hrbp","Apply AI Workflow Design principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Workflow Design for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Workflow Design: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Workflow Design is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-wfd-tut-01"],"tags":["scenario","ai_workflow_design"],"researchBasis":"CIPD and academic research on AI Workflow Design"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '1897e2b3-1524-40ed-88b9-f5abdfcc925f',
  'ai-wfd-ref-01',
  'Reflection: My Workflow Design Thinking',
  'Guided reflection on how you approach process design — identifying biases toward over-automation or under-utilisation.',
  'ai_workflow_design',
  'reflection',
  2,
  'Developing',
  15,
  5,
  'published',
  '{"overview":"This reflection module covers reflection: my workflow design thinking within the AI Workflow Design capability domain. Guided reflection on how you approach process design — identifying biases toward over-automation or under-utilisation.","objectives":["Understand key concepts related to reflection: my workflow design thinking","Apply AI Workflow Design principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Workflow Design for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Workflow Design: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Workflow Design is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-wfd-tut-01"],"tags":["reflection","ai_workflow_design"],"researchBasis":"CIPD and academic research on AI Workflow Design"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'bc2c03dc-25e1-4432-b84c-d04a834bbc5b',
  'ai-wfd-coach-01',
  'AI Coaching: Complex Workflow Architecture',
  'AI-guided coaching for designing multi-stakeholder HR workflows with appropriate AI integration points.',
  'ai_workflow_design',
  'coaching',
  4,
  'Advanced',
  20,
  5,
  'published',
  '{"overview":"This coaching module covers ai coaching: complex workflow architecture within the AI Workflow Design capability domain. AI-guided coaching for designing multi-stakeholder HR workflows with appropriate AI integration points.","objectives":["Understand key concepts related to ai coaching: complex workflow architecture","Apply AI Workflow Design principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Workflow Design for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Workflow Design: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Workflow Design is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-wfd-tut-01"],"tags":["coaching","ai_workflow_design"],"researchBasis":"CIPD and academic research on AI Workflow Design"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '983a0adc-de52-410d-be5e-2061f1e78881',
  'ai-wfd-quiz-01',
  'Knowledge Check: AI Workflow Design',
  'Validate your understanding of workflow design principles, handoff design, and automation risk assessment.',
  'ai_workflow_design',
  'quiz',
  3,
  'Practitioner',
  10,
  3,
  'published',
  '{"overview":"This quiz module covers knowledge check: ai workflow design within the AI Workflow Design capability domain. Validate your understanding of workflow design principles, handoff design, and automation risk assessment.","objectives":["Understand key concepts related to knowledge check: ai workflow design","Apply AI Workflow Design principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Workflow Design for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Workflow Design: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Workflow Design is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-wfd-tut-01"],"tags":["quiz","ai_workflow_design"],"researchBasis":"CIPD and academic research on AI Workflow Design"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '2b1862c5-5c95-489a-9a95-617e4009e539',
  'wf-air-tut-01',
  'Foundations of Workforce AI Readiness Assessment',
  'Learn to diagnose organisational and team-level AI readiness using structured assessment frameworks.',
  'workforce_ai_readiness',
  'tutorial',
  1,
  'Foundation',
  15,
  10,
  'published',
  '{"overview":"This tutorial module covers foundations of workforce ai readiness assessment within the Workforce AI Readiness capability domain. Learn to diagnose organisational and team-level AI readiness using structured assessment frameworks.","objectives":["Understand key concepts related to foundations of workforce ai readiness assessment","Apply Workforce AI Readiness principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of Workforce AI Readiness for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''Workforce AI Readiness: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["Workforce AI Readiness is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":[],"tags":["tutorial","workforce_ai_readiness"],"researchBasis":"CIPD and academic research on Workforce AI Readiness"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'b3100a6c-86fd-4c84-a331-eefc622fb59c',
  'wf-air-tut-02',
  'Designing AI Capability Interventions',
  'Master the design of targeted AI upskilling interventions that avoid generic, one-size-fits-all approaches.',
  'workforce_ai_readiness',
  'tutorial',
  2,
  'Developing',
  20,
  12,
  'published',
  '{"overview":"This tutorial module covers designing ai capability interventions within the Workforce AI Readiness capability domain. Master the design of targeted AI upskilling interventions that avoid generic, one-size-fits-all approaches.","objectives":["Understand key concepts related to designing ai capability interventions","Apply Workforce AI Readiness principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of Workforce AI Readiness for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''Workforce AI Readiness: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["Workforce AI Readiness is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["wf-air-tut-01"],"tags":["tutorial","workforce_ai_readiness"],"researchBasis":"CIPD and academic research on Workforce AI Readiness"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '35daeb20-b407-4347-9f11-b23d13b7073d',
  'wf-air-vid-01',
  'AI Readiness Assessment in Practice',
  'Video walkthrough of conducting a team-level AI readiness assessment, from data collection to action planning.',
  'workforce_ai_readiness',
  'video',
  1,
  'Foundation',
  12,
  3,
  'published',
  '{"overview":"This video module covers ai readiness assessment in practice within the Workforce AI Readiness capability domain. Video walkthrough of conducting a team-level AI readiness assessment, from data collection to action planning.","objectives":["Understand key concepts related to ai readiness assessment in practice","Apply Workforce AI Readiness principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of Workforce AI Readiness for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''Workforce AI Readiness: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["Workforce AI Readiness is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":[],"tags":["video","workforce_ai_readiness"],"researchBasis":"CIPD and academic research on Workforce AI Readiness"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'dca21b22-d5a9-4709-8090-8def29eb3eda',
  'wf-air-prac-01',
  'AI Skills Audit Workshop',
  'Hands-on exercise designing and conducting an AI skills audit for a team or department.',
  'workforce_ai_readiness',
  'practical',
  2,
  'Developing',
  30,
  10,
  'published',
  '{"overview":"This practical module covers ai skills audit workshop within the Workforce AI Readiness capability domain. Hands-on exercise designing and conducting an AI skills audit for a team or department.","objectives":["Understand key concepts related to ai skills audit workshop","Apply Workforce AI Readiness principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of Workforce AI Readiness for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''Workforce AI Readiness: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["Workforce AI Readiness is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["wf-air-tut-01"],"tags":["practical","workforce_ai_readiness"],"researchBasis":"CIPD and academic research on Workforce AI Readiness"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '14e5ab97-d083-4331-aaac-59b38572e64d',
  'wf-air-prac-02',
  'Intervention Design Exercise',
  'Design a targeted AI capability development programme for a specific team based on assessment data.',
  'workforce_ai_readiness',
  'practical',
  3,
  'Practitioner',
  25,
  8,
  'published',
  '{"overview":"This practical module covers intervention design exercise within the Workforce AI Readiness capability domain. Design a targeted AI capability development programme for a specific team based on assessment data.","objectives":["Understand key concepts related to intervention design exercise","Apply Workforce AI Readiness principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of Workforce AI Readiness for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''Workforce AI Readiness: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["Workforce AI Readiness is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["wf-air-tut-01"],"tags":["practical","workforce_ai_readiness"],"researchBasis":"CIPD and academic research on Workforce AI Readiness"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'e803546d-4a03-402e-945d-5b37ea8002fe',
  'wf-air-cs-01',
  'Case Study: Building AI Readiness in a Traditional HR Function',
  'How a public sector HR team transformed from AI-resistant to AI-proficient through a structured 12-month programme.',
  'workforce_ai_readiness',
  'case_study',
  3,
  'Practitioner',
  20,
  12,
  'published',
  '{"overview":"This case_study module covers case study: building ai readiness in a traditional hr function within the Workforce AI Readiness capability domain. How a public sector HR team transformed from AI-resistant to AI-proficient through a structured 12-month programme.","objectives":["Understand key concepts related to case study: building ai readiness in a traditional hr function","Apply Workforce AI Readiness principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of Workforce AI Readiness for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''Workforce AI Readiness: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["Workforce AI Readiness is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["wf-air-tut-01"],"tags":["case_study","workforce_ai_readiness"],"researchBasis":"CIPD and academic research on Workforce AI Readiness"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '24d57cf7-d5fb-4254-a795-2628024d8235',
  'wf-air-cs-02',
  'Case Study: The Failed AI Training Programme',
  'Why a £500k AI training programme produced no measurable capability improvement — and what should have been done differently.',
  'workforce_ai_readiness',
  'case_study',
  4,
  'Advanced',
  20,
  12,
  'published',
  '{"overview":"This case_study module covers case study: the failed ai training programme within the Workforce AI Readiness capability domain. Why a £500k AI training programme produced no measurable capability improvement — and what should have been done differently.","objectives":["Understand key concepts related to case study: the failed ai training programme","Apply Workforce AI Readiness principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of Workforce AI Readiness for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''Workforce AI Readiness: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["Workforce AI Readiness is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["wf-air-tut-01"],"tags":["case_study","workforce_ai_readiness"],"researchBasis":"CIPD and academic research on Workforce AI Readiness"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '9a45c3eb-2d36-446f-aaee-efc5b3ab2c79',
  'wf-air-scn-01',
  'Scenario: The Resistant Team',
  'Your team is actively resisting AI adoption. Diagnose the root causes and design an intervention that addresses legitimate concerns.',
  'workforce_ai_readiness',
  'scenario',
  3,
  'Practitioner',
  15,
  8,
  'published',
  '{"overview":"This scenario module covers scenario: the resistant team within the Workforce AI Readiness capability domain. Your team is actively resisting AI adoption. Diagnose the root causes and design an intervention that addresses legitimate concerns.","objectives":["Understand key concepts related to scenario: the resistant team","Apply Workforce AI Readiness principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of Workforce AI Readiness for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''Workforce AI Readiness: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["Workforce AI Readiness is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["wf-air-tut-01"],"tags":["scenario","workforce_ai_readiness"],"researchBasis":"CIPD and academic research on Workforce AI Readiness"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '2b0f7277-1835-40e9-938a-033109f9f220',
  'wf-air-scn-02',
  'Scenario: Advising the Board on AI Readiness',
  'The board wants an AI readiness assessment for the entire organisation. Design the assessment, present findings, and recommend actions.',
  'workforce_ai_readiness',
  'scenario',
  4,
  'Advanced',
  20,
  10,
  'published',
  '{"overview":"This scenario module covers scenario: advising the board on ai readiness within the Workforce AI Readiness capability domain. The board wants an AI readiness assessment for the entire organisation. Design the assessment, present findings, and recommend actions.","objectives":["Understand key concepts related to scenario: advising the board on ai readiness","Apply Workforce AI Readiness principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of Workforce AI Readiness for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''Workforce AI Readiness: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["Workforce AI Readiness is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["wf-air-tut-01"],"tags":["scenario","workforce_ai_readiness"],"researchBasis":"CIPD and academic research on Workforce AI Readiness"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'c3ab460b-916c-4a37-b46c-b2df48823904',
  'wf-air-ref-01',
  'Reflection: My Role in Building AI Readiness',
  'Guided reflection on your personal contribution to organisational AI readiness — leadership, advocacy, and skill-building.',
  'workforce_ai_readiness',
  'reflection',
  2,
  'Developing',
  15,
  5,
  'published',
  '{"overview":"This reflection module covers reflection: my role in building ai readiness within the Workforce AI Readiness capability domain. Guided reflection on your personal contribution to organisational AI readiness — leadership, advocacy, and skill-building.","objectives":["Understand key concepts related to reflection: my role in building ai readiness","Apply Workforce AI Readiness principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of Workforce AI Readiness for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''Workforce AI Readiness: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["Workforce AI Readiness is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["wf-air-tut-01"],"tags":["reflection","workforce_ai_readiness"],"researchBasis":"CIPD and academic research on Workforce AI Readiness"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '225e6114-aef7-4f1d-b02e-d85236798191',
  'wf-air-coach-01',
  'AI Coaching: Strategic AI Readiness Planning',
  'AI-guided coaching for developing organisation-wide AI readiness strategies aligned with business objectives.',
  'workforce_ai_readiness',
  'coaching',
  4,
  'Advanced',
  20,
  5,
  'published',
  '{"overview":"This coaching module covers ai coaching: strategic ai readiness planning within the Workforce AI Readiness capability domain. AI-guided coaching for developing organisation-wide AI readiness strategies aligned with business objectives.","objectives":["Understand key concepts related to ai coaching: strategic ai readiness planning","Apply Workforce AI Readiness principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of Workforce AI Readiness for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''Workforce AI Readiness: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["Workforce AI Readiness is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["wf-air-tut-01"],"tags":["coaching","workforce_ai_readiness"],"researchBasis":"CIPD and academic research on Workforce AI Readiness"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '013f1b50-59ac-4c5b-b3c1-e9354856a869',
  'wf-air-quiz-01',
  'Knowledge Check: Workforce AI Readiness',
  'Validate your understanding of AI readiness assessment, intervention design, and capability development.',
  'workforce_ai_readiness',
  'quiz',
  3,
  'Practitioner',
  10,
  3,
  'published',
  '{"overview":"This quiz module covers knowledge check: workforce ai readiness within the Workforce AI Readiness capability domain. Validate your understanding of AI readiness assessment, intervention design, and capability development.","objectives":["Understand key concepts related to knowledge check: workforce ai readiness","Apply Workforce AI Readiness principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of Workforce AI Readiness for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''Workforce AI Readiness: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["Workforce AI Readiness is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["wf-air-tut-01"],"tags":["quiz","workforce_ai_readiness"],"researchBasis":"CIPD and academic research on Workforce AI Readiness"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '8363cf71-7a6b-4351-8e8a-73419cc8bccf',
  'ai-eth-tut-01',
  'Foundations of AI Ethics in HR',
  'Understand the ethical principles governing AI use in HR — fairness, transparency, accountability, and employee rights.',
  'ai_ethics_trust',
  'tutorial',
  1,
  'Foundation',
  15,
  10,
  'published',
  '{"overview":"This tutorial module covers foundations of ai ethics in hr within the AI Ethics & Employee Trust capability domain. Understand the ethical principles governing AI use in HR — fairness, transparency, accountability, and employee rights.","objectives":["Understand key concepts related to foundations of ai ethics in hr","Apply AI Ethics & Employee Trust principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Ethics & Employee Trust for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Ethics & Employee Trust: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Ethics & Employee Trust is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":[],"tags":["tutorial","ai_ethics_trust"],"researchBasis":"CIPD and academic research on AI Ethics & Employee Trust"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'ff240ed6-0d18-4a74-8783-a158cab3f891',
  'ai-eth-tut-02',
  'Building and Maintaining Employee Trust in AI',
  'Master strategies for maintaining employee trust when implementing AI in HR processes that affect careers and livelihoods.',
  'ai_ethics_trust',
  'tutorial',
  2,
  'Developing',
  20,
  12,
  'published',
  '{"overview":"This tutorial module covers building and maintaining employee trust in ai within the AI Ethics & Employee Trust capability domain. Master strategies for maintaining employee trust when implementing AI in HR processes that affect careers and livelihoods.","objectives":["Understand key concepts related to building and maintaining employee trust in ai","Apply AI Ethics & Employee Trust principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Ethics & Employee Trust for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Ethics & Employee Trust: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Ethics & Employee Trust is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eth-tut-01"],"tags":["tutorial","ai_ethics_trust"],"researchBasis":"CIPD and academic research on AI Ethics & Employee Trust"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'a00a864a-708b-4f11-be02-63e488c34a32',
  'ai-eth-vid-01',
  'AI Ethics Dilemmas in HR: Real-World Examples',
  'Video exploration of ethical dilemmas HR professionals face when using AI — with expert commentary and resolution frameworks.',
  'ai_ethics_trust',
  'video',
  1,
  'Foundation',
  12,
  3,
  'published',
  '{"overview":"This video module covers ai ethics dilemmas in hr: real-world examples within the AI Ethics & Employee Trust capability domain. Video exploration of ethical dilemmas HR professionals face when using AI — with expert commentary and resolution frameworks.","objectives":["Understand key concepts related to ai ethics dilemmas in hr: real-world examples","Apply AI Ethics & Employee Trust principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Ethics & Employee Trust for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Ethics & Employee Trust: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Ethics & Employee Trust is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":[],"tags":["video","ai_ethics_trust"],"researchBasis":"CIPD and academic research on AI Ethics & Employee Trust"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'e191ba7d-54bf-4a9b-b9f6-f90d4900a1f9',
  'ai-eth-prac-01',
  'Ethical Impact Assessment Workshop',
  'Hands-on exercise conducting an ethical impact assessment for an AI implementation in HR.',
  'ai_ethics_trust',
  'practical',
  2,
  'Developing',
  25,
  8,
  'published',
  '{"overview":"This practical module covers ethical impact assessment workshop within the AI Ethics & Employee Trust capability domain. Hands-on exercise conducting an ethical impact assessment for an AI implementation in HR.","objectives":["Understand key concepts related to ethical impact assessment workshop","Apply AI Ethics & Employee Trust principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Ethics & Employee Trust for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Ethics & Employee Trust: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Ethics & Employee Trust is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eth-tut-01"],"tags":["practical","ai_ethics_trust"],"researchBasis":"CIPD and academic research on AI Ethics & Employee Trust"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'e8a0bea7-7f5d-40e9-96be-d49e6d3e09fc',
  'ai-eth-prac-02',
  'Transparency Communication Design',
  'Design employee communications about AI use that are honest, clear, and trust-building.',
  'ai_ethics_trust',
  'practical',
  3,
  'Practitioner',
  25,
  8,
  'published',
  '{"overview":"This practical module covers transparency communication design within the AI Ethics & Employee Trust capability domain. Design employee communications about AI use that are honest, clear, and trust-building.","objectives":["Understand key concepts related to transparency communication design","Apply AI Ethics & Employee Trust principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Ethics & Employee Trust for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Ethics & Employee Trust: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Ethics & Employee Trust is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eth-tut-01"],"tags":["practical","ai_ethics_trust"],"researchBasis":"CIPD and academic research on AI Ethics & Employee Trust"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '744b1dd3-13e4-40e0-b8be-cedd9bcee8d2',
  'ai-eth-cs-01',
  'Case Study: The AI Monitoring Backlash',
  'How an organisation''s well-intentioned AI productivity monitoring destroyed employee trust — and the recovery journey.',
  'ai_ethics_trust',
  'case_study',
  3,
  'Practitioner',
  20,
  12,
  'published',
  '{"overview":"This case_study module covers case study: the ai monitoring backlash within the AI Ethics & Employee Trust capability domain. How an organisation''s well-intentioned AI productivity monitoring destroyed employee trust — and the recovery journey.","objectives":["Understand key concepts related to case study: the ai monitoring backlash","Apply AI Ethics & Employee Trust principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Ethics & Employee Trust for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Ethics & Employee Trust: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Ethics & Employee Trust is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eth-tut-01"],"tags":["case_study","ai_ethics_trust"],"researchBasis":"CIPD and academic research on AI Ethics & Employee Trust"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'c82d5608-0307-409e-a764-17ce1c412d19',
  'ai-eth-cs-02',
  'Case Study: Navigating AI Ethics Under Pressure',
  'When the CEO demands AI-driven redundancy decisions and the HR Director must push back — a study in ethical leadership.',
  'ai_ethics_trust',
  'case_study',
  4,
  'Advanced',
  20,
  12,
  'published',
  '{"overview":"This case_study module covers case study: navigating ai ethics under pressure within the AI Ethics & Employee Trust capability domain. When the CEO demands AI-driven redundancy decisions and the HR Director must push back — a study in ethical leadership.","objectives":["Understand key concepts related to case study: navigating ai ethics under pressure","Apply AI Ethics & Employee Trust principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Ethics & Employee Trust for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Ethics & Employee Trust: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Ethics & Employee Trust is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eth-tut-01"],"tags":["case_study","ai_ethics_trust"],"researchBasis":"CIPD and academic research on AI Ethics & Employee Trust"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '3c5cfe27-77c9-497d-9773-403d5e1d5440',
  'ai-eth-scn-01',
  'Scenario: The Ethical Pressure Test',
  'Your manager wants to use AI to identify ''flight risk'' employees without telling them. Navigate the ethical, legal, and trust implications.',
  'ai_ethics_trust',
  'scenario',
  3,
  'Practitioner',
  15,
  8,
  'published',
  '{"overview":"This scenario module covers scenario: the ethical pressure test within the AI Ethics & Employee Trust capability domain. Your manager wants to use AI to identify ''flight risk'' employees without telling them. Navigate the ethical, legal, and trust implications.","objectives":["Understand key concepts related to scenario: the ethical pressure test","Apply AI Ethics & Employee Trust principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Ethics & Employee Trust for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Ethics & Employee Trust: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Ethics & Employee Trust is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eth-tut-01"],"tags":["scenario","ai_ethics_trust"],"researchBasis":"CIPD and academic research on AI Ethics & Employee Trust"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '6275d45b-cd50-42fe-b4aa-c4e8c5299383',
  'ai-eth-scn-02',
  'Scenario: Legal vs. Fair — The AI Decision',
  'An AI recommendation is technically legal but ethically questionable. Navigate the tension between compliance and fairness.',
  'ai_ethics_trust',
  'scenario',
  4,
  'Advanced',
  20,
  10,
  'published',
  '{"overview":"This scenario module covers scenario: legal vs. fair — the ai decision within the AI Ethics & Employee Trust capability domain. An AI recommendation is technically legal but ethically questionable. Navigate the tension between compliance and fairness.","objectives":["Understand key concepts related to scenario: legal vs. fair — the ai decision","Apply AI Ethics & Employee Trust principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Ethics & Employee Trust for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Ethics & Employee Trust: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Ethics & Employee Trust is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eth-tut-01"],"tags":["scenario","ai_ethics_trust"],"researchBasis":"CIPD and academic research on AI Ethics & Employee Trust"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '6cf4159f-5d3a-4288-86f9-5e4c6cf475dc',
  'ai-eth-ref-01',
  'Reflection: My Ethical Compass in AI',
  'Guided reflection on your personal ethical framework for AI use in HR — where are your boundaries?',
  'ai_ethics_trust',
  'reflection',
  2,
  'Developing',
  15,
  5,
  'published',
  '{"overview":"This reflection module covers reflection: my ethical compass in ai within the AI Ethics & Employee Trust capability domain. Guided reflection on your personal ethical framework for AI use in HR — where are your boundaries?","objectives":["Understand key concepts related to reflection: my ethical compass in ai","Apply AI Ethics & Employee Trust principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Ethics & Employee Trust for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Ethics & Employee Trust: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Ethics & Employee Trust is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eth-tut-01"],"tags":["reflection","ai_ethics_trust"],"researchBasis":"CIPD and academic research on AI Ethics & Employee Trust"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '036c80a1-e2e1-4106-9f56-17a7b2af7847',
  'ai-eth-coach-01',
  'AI Coaching: Ethical Leadership in AI Adoption',
  'AI-guided coaching for developing ethical leadership skills in AI-intensive HR environments.',
  'ai_ethics_trust',
  'coaching',
  4,
  'Advanced',
  20,
  5,
  'published',
  '{"overview":"This coaching module covers ai coaching: ethical leadership in ai adoption within the AI Ethics & Employee Trust capability domain. AI-guided coaching for developing ethical leadership skills in AI-intensive HR environments.","objectives":["Understand key concepts related to ai coaching: ethical leadership in ai adoption","Apply AI Ethics & Employee Trust principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Ethics & Employee Trust for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Ethics & Employee Trust: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Ethics & Employee Trust is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eth-tut-01"],"tags":["coaching","ai_ethics_trust"],"researchBasis":"CIPD and academic research on AI Ethics & Employee Trust"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'd951749c-0645-4e72-8d3d-333f9ad44948',
  'ai-eth-quiz-01',
  'Knowledge Check: AI Ethics & Employee Trust',
  'Validate your understanding of ethical principles, trust-building strategies, and legal frameworks for AI in HR.',
  'ai_ethics_trust',
  'quiz',
  3,
  'Practitioner',
  10,
  3,
  'published',
  '{"overview":"This quiz module covers knowledge check: ai ethics & employee trust within the AI Ethics & Employee Trust capability domain. Validate your understanding of ethical principles, trust-building strategies, and legal frameworks for AI in HR.","objectives":["Understand key concepts related to knowledge check: ai ethics & employee trust","Apply AI Ethics & Employee Trust principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Ethics & Employee Trust for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Ethics & Employee Trust: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Ethics & Employee Trust is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-eth-tut-01"],"tags":["quiz","ai_ethics_trust"],"researchBasis":"CIPD and academic research on AI Ethics & Employee Trust"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '043a9851-e520-498d-8ad9-4dc7af505d5f',
  'ai-chg-tut-01',
  'Foundations of AI Change Leadership',
  'Understand the unique challenges of leading AI adoption in HR — from resistance management to pace calibration.',
  'ai_change_leadership',
  'tutorial',
  1,
  'Foundation',
  15,
  10,
  'published',
  '{"overview":"This tutorial module covers foundations of ai change leadership within the AI Change Leadership capability domain. Understand the unique challenges of leading AI adoption in HR — from resistance management to pace calibration.","objectives":["Understand key concepts related to foundations of ai change leadership","Apply AI Change Leadership principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Change Leadership for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Change Leadership: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Change Leadership is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":[],"tags":["tutorial","ai_change_leadership"],"researchBasis":"CIPD and academic research on AI Change Leadership"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '7cdccb12-9aeb-434f-91d5-c877a5ed90d2',
  'ai-chg-tut-02',
  'Managing Resistance to AI Adoption',
  'Learn to distinguish legitimate concerns from fear-based resistance and respond constructively to both.',
  'ai_change_leadership',
  'tutorial',
  2,
  'Developing',
  20,
  12,
  'published',
  '{"overview":"This tutorial module covers managing resistance to ai adoption within the AI Change Leadership capability domain. Learn to distinguish legitimate concerns from fear-based resistance and respond constructively to both.","objectives":["Understand key concepts related to managing resistance to ai adoption","Apply AI Change Leadership principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Change Leadership for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Change Leadership: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Change Leadership is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-chg-tut-01"],"tags":["tutorial","ai_change_leadership"],"researchBasis":"CIPD and academic research on AI Change Leadership"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '372ee9ab-d344-4787-9e14-cfec94eee746',
  'ai-chg-vid-01',
  'Leading AI Change: Lessons from the Field',
  'Video featuring HR leaders sharing their experiences of leading AI adoption — successes, failures, and lessons learned.',
  'ai_change_leadership',
  'video',
  1,
  'Foundation',
  12,
  3,
  'published',
  '{"overview":"This video module covers leading ai change: lessons from the field within the AI Change Leadership capability domain. Video featuring HR leaders sharing their experiences of leading AI adoption — successes, failures, and lessons learned.","objectives":["Understand key concepts related to leading ai change: lessons from the field","Apply AI Change Leadership principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Change Leadership for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Change Leadership: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Change Leadership is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":[],"tags":["video","ai_change_leadership"],"researchBasis":"CIPD and academic research on AI Change Leadership"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  'f5c09aec-3fa0-4d36-8f19-5ca567f225ee',
  'ai-chg-prac-01',
  'Change Readiness Assessment Workshop',
  'Hands-on exercise assessing your organisation''s readiness for AI change using a structured diagnostic framework.',
  'ai_change_leadership',
  'practical',
  2,
  'Developing',
  25,
  8,
  'published',
  '{"overview":"This practical module covers change readiness assessment workshop within the AI Change Leadership capability domain. Hands-on exercise assessing your organisation''s readiness for AI change using a structured diagnostic framework.","objectives":["Understand key concepts related to change readiness assessment workshop","Apply AI Change Leadership principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Change Leadership for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Change Leadership: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Change Leadership is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-chg-tut-01"],"tags":["practical","ai_change_leadership"],"researchBasis":"CIPD and academic research on AI Change Leadership"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '03e2b4c3-b965-4444-8991-64b9cc536744',
  'ai-chg-prac-02',
  'AI Adoption Communication Plan Design',
  'Design a comprehensive communication plan for an AI implementation that builds understanding and reduces anxiety.',
  'ai_change_leadership',
  'practical',
  3,
  'Practitioner',
  30,
  10,
  'published',
  '{"overview":"This practical module covers ai adoption communication plan design within the AI Change Leadership capability domain. Design a comprehensive communication plan for an AI implementation that builds understanding and reduces anxiety.","objectives":["Understand key concepts related to ai adoption communication plan design","Apply AI Change Leadership principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Change Leadership for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Change Leadership: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Change Leadership is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-chg-tut-01"],"tags":["practical","ai_change_leadership"],"researchBasis":"CIPD and academic research on AI Change Leadership"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '98b96d90-3b17-4342-ac73-f69aa205350d',
  'ai-chg-cs-01',
  'Case Study: The Phased AI Rollout That Worked',
  'How a 5,000-employee organisation successfully adopted AI in HR through a carefully phased approach with employee involvement.',
  'ai_change_leadership',
  'case_study',
  3,
  'Practitioner',
  20,
  12,
  'published',
  '{"overview":"This case_study module covers case study: the phased ai rollout that worked within the AI Change Leadership capability domain. How a 5,000-employee organisation successfully adopted AI in HR through a carefully phased approach with employee involvement.","objectives":["Understand key concepts related to case study: the phased ai rollout that worked","Apply AI Change Leadership principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Change Leadership for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Change Leadership: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Change Leadership is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-chg-tut-01"],"tags":["case_study","ai_change_leadership"],"researchBasis":"CIPD and academic research on AI Change Leadership"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '185609c6-0eb7-438e-80da-e18a008c535e',
  'ai-chg-cs-02',
  'Case Study: When AI Change Was Forced Too Fast',
  'Analysis of an AI implementation that failed because the pace of change exceeded organisational readiness.',
  'ai_change_leadership',
  'case_study',
  4,
  'Advanced',
  20,
  12,
  'published',
  '{"overview":"This case_study module covers case study: when ai change was forced too fast within the AI Change Leadership capability domain. Analysis of an AI implementation that failed because the pace of change exceeded organisational readiness.","objectives":["Understand key concepts related to case study: when ai change was forced too fast","Apply AI Change Leadership principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Change Leadership for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Change Leadership: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Change Leadership is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-chg-tut-01"],"tags":["case_study","ai_change_leadership"],"researchBasis":"CIPD and academic research on AI Change Leadership"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '48897544-366b-46b9-84a4-184aaff2f6fa',
  'ai-chg-scn-01',
  'Scenario: The AI Adoption Roadblock',
  'A key stakeholder is blocking AI adoption. Understand their concerns, build a coalition, and find a path forward.',
  'ai_change_leadership',
  'scenario',
  3,
  'Practitioner',
  15,
  8,
  'published',
  '{"overview":"This scenario module covers scenario: the ai adoption roadblock within the AI Change Leadership capability domain. A key stakeholder is blocking AI adoption. Understand their concerns, build a coalition, and find a path forward.","objectives":["Understand key concepts related to scenario: the ai adoption roadblock","Apply AI Change Leadership principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Change Leadership for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Change Leadership: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Change Leadership is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-chg-tut-01"],"tags":["scenario","ai_change_leadership"],"researchBasis":"CIPD and academic research on AI Change Leadership"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '80803b1a-0b94-4362-aa02-906e30fc469d',
  'ai-chg-scn-02',
  'Scenario: Calibrating the Pace of AI Change',
  'Your organisation is split — some teams want faster AI adoption, others are overwhelmed. Design a differentiated change strategy.',
  'ai_change_leadership',
  'scenario',
  4,
  'Advanced',
  20,
  10,
  'published',
  '{"overview":"This scenario module covers scenario: calibrating the pace of ai change within the AI Change Leadership capability domain. Your organisation is split — some teams want faster AI adoption, others are overwhelmed. Design a differentiated change strategy.","objectives":["Understand key concepts related to scenario: calibrating the pace of ai change","Apply AI Change Leadership principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Change Leadership for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Change Leadership: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Change Leadership is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-chg-tut-01"],"tags":["scenario","ai_change_leadership"],"researchBasis":"CIPD and academic research on AI Change Leadership"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '772f8f2c-2e7a-409a-bc82-43746407c0c7',
  'ai-chg-ref-01',
  'Reflection: My Change Leadership Style',
  'Guided reflection on your personal change leadership approach — identifying strengths and blind spots in leading AI adoption.',
  'ai_change_leadership',
  'reflection',
  2,
  'Developing',
  15,
  5,
  'published',
  '{"overview":"This reflection module covers reflection: my change leadership style within the AI Change Leadership capability domain. Guided reflection on your personal change leadership approach — identifying strengths and blind spots in leading AI adoption.","objectives":["Understand key concepts related to reflection: my change leadership style","Apply AI Change Leadership principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Change Leadership for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Change Leadership: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Change Leadership is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-chg-tut-01"],"tags":["reflection","ai_change_leadership"],"researchBasis":"CIPD and academic research on AI Change Leadership"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '8f97cd72-0e5b-4956-bccf-4cd84b3ed2a2',
  'ai-chg-coach-01',
  'AI Coaching: Strategic Change Leadership',
  'AI-guided coaching for developing strategic change leadership skills for complex, multi-stakeholder AI adoption.',
  'ai_change_leadership',
  'coaching',
  4,
  'Advanced',
  20,
  5,
  'published',
  '{"overview":"This coaching module covers ai coaching: strategic change leadership within the AI Change Leadership capability domain. AI-guided coaching for developing strategic change leadership skills for complex, multi-stakeholder AI adoption.","objectives":["Understand key concepts related to ai coaching: strategic change leadership","Apply AI Change Leadership principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Change Leadership for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Change Leadership: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Change Leadership is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-chg-tut-01"],"tags":["coaching","ai_change_leadership"],"researchBasis":"CIPD and academic research on AI Change Leadership"}',
  1777035192155,
  1777035192155
);

INSERT INTO learning_modules (id, `key`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at) VALUES (
  '3f9ab54c-d528-4491-93d8-d505156a70bf',
  'ai-chg-quiz-01',
  'Knowledge Check: AI Change Leadership',
  'Validate your understanding of change leadership principles, resistance management, and pace calibration.',
  'ai_change_leadership',
  'quiz',
  3,
  'Practitioner',
  10,
  3,
  'published',
  '{"overview":"This quiz module covers knowledge check: ai change leadership within the AI Change Leadership capability domain. Validate your understanding of change leadership principles, resistance management, and pace calibration.","objectives":["Understand key concepts related to knowledge check: ai change leadership","Apply AI Change Leadership principles to real HR scenarios","Identify common challenges and mitigation strategies"],"sections":[{"title":"Core Content","content":"This module addresses a critical aspect of AI Change Leadership for HR professionals. The content is designed to build practical capability that can be immediately applied in your role.","examples":[],"tips":["Focus on how this applies to your specific HR context"]}],"reflectionPrompts":["How does this content relate to your current role and responsibilities?"],"citations":["CIPD (2025) ''AI Change Leadership: A Guide for HR Professionals''","Accenture (2024) ''AI Capability in the Workforce''"],"keyTakeaways":["AI Change Leadership is essential for responsible AI use in HR","Practical application requires both knowledge and judgement"]}',
  '{"roleRelevance":["all_hr_roles"],"prerequisites":["ai-chg-tut-01"],"tags":["quiz","ai_change_leadership"],"researchBasis":"CIPD and academic research on AI Change Leadership"}',
  1777035192155,
  1777035192155
);

