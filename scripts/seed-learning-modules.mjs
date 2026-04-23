/**
 * Seed Script: Adaptive Learning Module Library v2
 * 120+ rich learning modules across 6 HR AI capability domains
 */

import mysql from 'mysql2/promise';

const db = await mysql.createConnection(process.env.DATABASE_URL);
const now = Date.now();

function id() {
  return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 11);
}

const modules = [

  // ─── CAPABILITY: execution ────────────────────────────────────────────────

  {
    key: 'exec-tutorial-1', title: 'Introduction to AI Tools in HR', subtitle: 'Foundation concepts for HR professionals new to AI',
    capability: 'execution', modality: 'tutorial', difficulty: 1, levelLabel: 'Foundation', durationMins: 15,
    body: {
      overview: 'This module introduces the core AI tools available to HR professionals — from generative AI assistants to specialised HR analytics platforms. You will understand how these tools work at a conceptual level, what they can and cannot do, and how to approach them as a professional partner rather than a magic solution.',
      objectives: ['Identify the main categories of AI tools used in HR contexts', 'Explain how large language models generate text', 'Distinguish between AI tools appropriate for different HR tasks', 'Describe the basic workflow of using an AI assistant for an HR task'],
      sections: [
        { title: 'What Is AI in the HR Context?', content: 'Artificial intelligence in HR encompasses generative AI assistants (ChatGPT, Copilot, Claude) that produce text and analysis; specialised HR platforms with embedded AI (Workday AI, SAP SuccessFactors, Beamery); and analytics tools that use machine learning to identify patterns in workforce data.\n\nFor most HR professionals, the most immediately relevant tools are generative AI assistants — software that can draft job descriptions, summarise CVs, generate interview questions, and analyse survey responses. Understanding how these tools work helps you use them effectively and spot their limitations.', tips: ['Think of AI as a highly capable first-draft generator — it gets you 70% of the way there, and your expertise gets you the rest.', 'Always read AI output critically before using it — the tool does not know your organisation, your people, or your context.'] },
        { title: 'How Generative AI Works', content: 'Generative AI models like GPT-4 are trained on vast amounts of text. They learn statistical patterns and use these to generate plausible-sounding responses.\n\nKey insight: AI models do not "know" things the way humans do. They predict likely text based on patterns. This is why they can confidently produce incorrect information — a phenomenon called hallucination.', tips: ['Use AI for structure and language, not for legal or factual accuracy without verification.', 'The more specific context you provide, the more relevant the output will be.'] },
        { title: 'Your First AI Workflow', content: 'A simple, effective workflow:\n1. Define your task clearly\n2. Craft your prompt with context\n3. Review the output critically using FACT (Factual accuracy, Appropriateness, Completeness, Tone)\n4. Edit and refine\n5. Apply your professional judgement\n\nYou are responsible for the final output, not the AI.', tips: ['Always specify the format you want.', 'Include your audience in the prompt.'] }
      ],
      keyTakeaways: ['AI tools are powerful assistants, not replacements for professional judgement', 'Generative AI works by predicting plausible text — it can be wrong with confidence', 'A 5-step workflow makes AI use effective and safe'],
      citations: ['CIPD (2023). Artificial Intelligence in HR: A Guide for People Professionals.', 'McKinsey Global Institute (2023). The Economic Potential of Generative AI.']
    }
  },

  {
    key: 'exec-practical-1', title: 'Prompt Engineering for HR: The CRISP Framework', subtitle: 'Hands-on practice with prompt techniques for common HR tasks',
    capability: 'execution', modality: 'practical', difficulty: 1, levelLabel: 'Foundation', durationMins: 20,
    body: {
      overview: 'Prompt engineering is the skill of communicating effectively with AI tools to get the output you need. This practical module walks you through the CRISP framework with hands-on exercises for real HR scenarios.',
      objectives: ['Apply the CRISP prompt framework to HR tasks', 'Write prompts that produce useful, role-appropriate outputs', 'Identify and fix common prompt mistakes', 'Build a personal prompt library for your most frequent HR tasks'],
      sections: [
        { title: 'The CRISP Framework', content: 'CRISP stands for:\n\n**C — Context**: Who are you? What is the situation?\n**R — Role**: What role should the AI play?\n**I — Instructions**: What exactly do you want?\n**S — Specifics**: What constraints, format, or details matter?\n**P — Purpose**: Why is this needed? Who will use it?\n\nNot every prompt needs all five elements, but including more context consistently produces better results.', examples: ['Weak: "Write a job description for an HR manager"\n\nCRISP: "[Context] I am an HR Director at a 200-person fintech startup. [Role] Act as an experienced HR copywriter. [Instructions] Write a job description for a Senior HR Business Partner. [Specifics] Hybrid London, £65-75k, reporting to me. Focus on strategic partnering. Tone: professional but not corporate. 400 words max. [Purpose] LinkedIn and careers page."'] },
        { title: 'Common HR Prompt Patterns', content: '**Summarise and theme**: "Summarise the following [survey responses] into 5 key themes. For each theme, provide 2-3 supporting quotes. Format as a table."\n\n**Draft and structure**: "Draft a [document type] for [audience]. Include sections on [X, Y, Z]. Tone: [professional/empathetic]. Length: [X words]."\n\n**Analyse and recommend**: "Review the following [situation]. Identify the top 3 risks and recommend one practical action for each. Format as a risk register table."', tips: ['For sensitive HR content, always review AI output carefully.', 'Check your organisation\'s AI policy before pasting confidential data into an external tool.'] }
      ],
      exercises: [
        { title: 'Exercise 1: Improve This Prompt', instruction: 'Rewrite this poor prompt using CRISP: "Help me with performance reviews"', hint: 'Think about: Who is writing? What type of review? What help is needed? What format? For what purpose?' },
        { title: 'Exercise 2: Build Your Prompt Library', instruction: 'Identify 3 HR tasks you do regularly. For each, write a CRISP prompt and test it. Save the prompts that work well.' }
      ],
      keyTakeaways: ['CRISP consistently improves AI output quality', 'Iterating on prompts builds intuition faster than trying to write perfect prompts immediately', 'A personal prompt library is a high-value 30-minute investment'],
      citations: ['White, J. et al. (2023). A Prompt Pattern Catalog to Enhance Prompt Engineering with ChatGPT.', 'CIPD (2024). Using AI Tools in HR Practice: Practical Guidance.']
    }
  },

  {
    key: 'exec-scenario-1', title: 'Scenario: The Friday Recruitment Brief', subtitle: 'Practise using AI to complete a time-pressured recruitment task',
    capability: 'execution', modality: 'scenario', difficulty: 2, levelLabel: 'Developing', durationMins: 20,
    body: {
      overview: 'You are an HRBP who needs to produce a complete recruitment pack by end of day. Work through the scenario using AI tools efficiently and professionally.',
      objectives: ['Apply prompt engineering to a realistic time-pressured HR task', 'Evaluate AI output for quality and appropriateness', 'Produce a complete professional recruitment pack using AI assistance'],
      scenario: { situation: 'It\'s 2pm Friday. Your hiring manager needs a Finance Business Partner job description, 6 interview questions, and a scoring guide by Monday. The role is London hybrid, £55-65k, reporting to Head of Finance. You have 45 minutes.', yourTask: 'Use AI to produce: (1) job description, (2) 6 competency-based interview questions with scoring criteria, (3) candidate evaluation scorecard.' },
      steps: [
        { step: 1, title: 'Draft the Job Description', suggestedPrompt: 'Act as an experienced HR copywriter. Draft a job description for a Finance Business Partner at a 300-person professional services firm. London hybrid, reports to Head of Finance. Requirements: month-end close, business partnering, FP&A (desirable). Use inclusive language. Structure: about the role (2 paragraphs), responsibilities (6-8 bullets), requirements (5-6 bullets), what we offer (4-5 bullets). 400-500 words.', reviewChecklist: ['Uses inclusive language?', 'Responsibilities realistic and specific?', 'Tone appropriate for your organisation?'] },
        { step: 2, title: 'Create Interview Questions', suggestedPrompt: 'Create 6 competency-based interview questions for a Finance Business Partner. Cover: financial analysis, business partnering, problem-solving under pressure, communication of complex data, continuous improvement, collaboration. For each: question, competency assessed, strong answer indicators (3 bullets), weak answer indicators (2 bullets). Format as a table.' },
        { step: 3, title: 'Create Evaluation Scorecard', suggestedPrompt: 'Create a one-page candidate evaluation scorecard for a Finance Business Partner interview. Include: candidate name, interviewer, date, 6 competencies, 1-5 rating scale with descriptors, total score, recommended decision (Proceed/Hold/Decline), notes section. Format as a printable table.' }
      ],
      keyTakeaways: ['AI can compress a 3-hour task into 45 minutes with effective prompting', 'Breaking complex tasks into component prompts produces better results than one mega-prompt', 'Inclusive language review is a critical step AI alone cannot reliably complete'],
      citations: ['CIPD (2024). Inclusive Recruitment: A Practical Guide.']
    }
  },

  {
    key: 'exec-case-study-1', title: 'Case Study: How Unilever Transformed Recruitment with AI', subtitle: 'Lessons from a global HR AI implementation',
    capability: 'execution', modality: 'case_study', difficulty: 2, levelLabel: 'Developing', durationMins: 25,
    body: {
      overview: 'Unilever\'s implementation of AI-powered recruitment tools — HireVue video interviews and Pymetrics gamified assessments — transformed their graduate hiring. This case study examines the outcomes, challenges, and lessons for HR professionals.',
      objectives: ['Analyse a real-world large-scale HR AI implementation', 'Identify key success factors and failure modes in AI-driven recruitment', 'Apply lessons to your organisation\'s context', 'Evaluate ethical considerations of AI in high-stakes HR decisions'],
      sections: [
        { title: 'The Challenge', content: 'Unilever receives ~250,000 graduate applications per year globally. Before AI, the process took months and was inconsistent across markets. In 2016, Unilever partnered with HireVue and Pymetrics to transform early-stage graduate recruitment.' },
        { title: 'The Implementation', content: 'The new process: (1) Pymetrics games (25 min): 12 neuroscience-based games measuring cognitive and emotional traits, compared against high-performer profiles. (2) HireVue video interview (30 min): AI analyses word choice and tone.\n\nResults after 3 years: Time to hire reduced from 4 months to 4 weeks. Diversity improved. 16% of hires came from candidates who would have been screened out by traditional CV review.', tips: ['Unilever later discontinued facial expression analysis due to bias concerns — AI tools require ongoing scrutiny.'] },
        { title: 'Challenges and Controversies', content: 'Algorithmic bias concerns: training on existing high performers could perpetuate existing biases. Facial expression analysis was widely criticised as scientifically unvalidated. Candidate experience issues. Explainability challenges under GDPR.' },
        { title: 'Lessons for HR Professionals', content: '1. AI can improve diversity — but only if you actively design for it and monitor outcomes.\n2. Validate your AI tools — not all claims are evidence-based.\n3. Explainability matters — GDPR Article 22 gives candidates the right to explanation.\n4. Candidate experience is a brand issue.\n5. Ongoing monitoring is essential.' }
      ],
      discussionQuestions: ['Which elements of Unilever\'s approach would you adopt and which would you modify?', 'How would you address the explainability challenge under GDPR?'],
      keyTakeaways: ['Large-scale AI implementation can deliver efficiency and diversity gains when well-designed', 'AI tools require ongoing scrutiny — not all vendor claims are validated', 'GDPR explainability requirements are a practical constraint on automated HR decisions'],
      citations: ['Unilever (2019). Future of Work: How Unilever is Using AI in Recruitment.', 'Raghavan, M. et al. (2020). Mitigating Bias in Algorithmic Hiring. ACM FAccT 2020.', 'ICO (2020). Explaining Decisions Made with AI.']
    }
  },

  {
    key: 'exec-quiz-1', title: 'AI Execution Knowledge Check', subtitle: 'Test your understanding of AI tool usage in HR',
    capability: 'execution', modality: 'quiz', difficulty: 2, levelLabel: 'Developing', durationMins: 10,
    body: {
      overview: 'A knowledge check covering AI tool selection, prompt engineering, output evaluation, and responsible use in HR contexts.',
      questions: [
        { id: 'q1', question: 'A colleague asks an AI "What are the UK redundancy consultation requirements?" and receives a detailed answer. What should they do next?', options: [{ id: 'a', text: 'Use it directly — AI is trained on legal data' }, { id: 'b', text: 'Verify with ACAS guidance or an employment lawyer' }, { id: 'c', text: 'Ask the AI to confirm its accuracy' }, { id: 'd', text: 'Cross-reference with another AI tool' }], correctAnswer: 'b', explanation: 'AI can produce plausible-sounding but outdated or incorrect legal information. Always verify legal matters with authoritative sources. Asking the AI to confirm its own accuracy is not valid verification.', competency: 'AI output evaluation' },
        { id: 'q2', question: 'Which prompt is most likely to produce a useful job description?', options: [{ id: 'a', text: 'Write a job description for a HR manager' }, { id: 'b', text: 'Write a job description for a Senior HRBP at a 500-person tech company, hybrid London, £70-80k, reporting to CPO, strategic focus, inclusive language, 400 words' }, { id: 'c', text: 'Create a detailed comprehensive job description for an HR manager position' }, { id: 'd', text: 'You are an expert HR writer. Write the best possible job description for an HR role.' }], correctAnswer: 'b', explanation: 'Option B applies the CRISP framework with specific context, constraints, and format. The more specific the prompt, the more relevant and usable the output.', competency: 'Prompt engineering' },
        { id: 'q3', question: 'An AI analyses 100 survey responses and identifies "poor management" as a top theme. What is the most important next step?', options: [{ id: 'a', text: 'Present to leadership immediately — AI analysis is objective' }, { id: 'b', text: 'Read a sample of original responses to validate the AI\'s thematic analysis' }, { id: 'c', text: 'Ask the AI to quantify how many responses mentioned poor management' }, { id: 'd', text: 'Rerun with a different AI tool to confirm' }], correctAnswer: 'b', explanation: 'AI thematic analysis can misclassify nuanced responses. Always validate AI-generated themes by reading a representative sample of original data before presenting findings.', competency: 'AI output evaluation' },
        { id: 'q4', question: 'What does "AI hallucination" mean?', options: [{ id: 'a', text: 'The AI produces visual images instead of text' }, { id: 'b', text: 'The AI generates plausible-sounding but factually incorrect information with apparent confidence' }, { id: 'c', text: 'The AI misunderstands the user\'s intent' }, { id: 'd', text: 'The AI repeats the same information multiple times' }], correctAnswer: 'b', explanation: 'Hallucination refers to AI generating confident, plausible-sounding content that is factually incorrect. This is fundamental to how language models work — they predict likely text, not verified facts.', competency: 'AI fundamentals' },
        { id: 'q5', question: 'An AI produces a PIP template that looks professional. Before using it, what is the most important check?', options: [{ id: 'a', text: 'Check it is the right length and format' }, { id: 'b', text: 'Verify it aligns with your organisation\'s HR policies and employment law' }, { id: 'c', text: 'Ask a colleague if it looks good' }, { id: 'd', text: 'Check the spelling and grammar' }], correctAnswer: 'b', explanation: 'PIP templates have legal implications. The AI template may not reflect your organisation\'s specific policies or local employment law requirements.', competency: 'Professional judgement' }
      ],
      passingScore: 70
    }
  },

  {
    key: 'exec-reflection-1', title: 'Reflection: Your AI Tool Usage Patterns', subtitle: 'A guided reflection on how you currently use and could better use AI',
    capability: 'execution', modality: 'reflection', difficulty: 1, levelLabel: 'Foundation', durationMins: 15,
    body: {
      overview: 'This guided reflection helps you take stock of your current AI tool usage, identify gaps and opportunities, and make a concrete commitment to developing your AI execution skills.',
      objectives: ['Honestly assess your current AI tool usage', 'Identify 2-3 tasks where AI could add significant value', 'Recognise barriers to effective AI use', 'Make a concrete commitment to one AI skill development action'],
      reflectionPrompts: [
        { area: 'Current Usage', questions: ['Which AI tools do you currently use in your HR work? How often?', 'What tasks do you use them for? What do you avoid?', 'On a scale of 1-10, how confident are you in getting useful output from AI tools?'] },
        { area: 'Missed Opportunities', questions: ['Think about your last week. Which tasks involved significant writing, summarising, or analysis?', 'For each, could an AI tool have helped? Why did you not use one?', 'What is the biggest time-consuming task you have never tried using AI for?'] },
        { area: 'Barriers', questions: ['What stops you from using AI tools more? (Time? Quality concerns? Policy uncertainty?)', 'Which barrier is most within your control to address?', 'What would you need to feel more confident using AI tools?'] },
        { area: 'Commitment', questions: ['What one specific AI tool will you try this week for a real HR task?', 'What one prompt will you write and save for future use?', 'Who in your network could you learn from about effective AI tool use?'] }
      ],
      keyTakeaways: ['Self-awareness about AI usage patterns is the starting point for deliberate skill development', 'Most HR professionals underuse AI for tasks where it would add significant value', 'A concrete commitment to one specific action is more valuable than general intentions'],
      citations: ['CIPD (2023). Learning at Work Survey. London: CIPD.']
    }
  },

  {
    key: 'exec-coaching-1', title: 'Coaching Session: Overcoming Your AI Execution Barriers', subtitle: 'A personalised coaching dialogue to address your specific AI usage challenges',
    capability: 'execution', modality: 'coaching', difficulty: 2, levelLabel: 'Developing', durationMins: 20,
    body: {
      overview: 'This coaching module uses the GROW model to help you identify and overcome the specific barriers preventing you from using AI tools more effectively in your HR role.',
      objectives: ['Identify your specific barriers to effective AI tool use', 'Develop a personalised action plan', 'Build confidence through structured reflection', 'Commit to one concrete AI skill development action'],
      coachingFramework: {
        model: 'GROW (Goal, Reality, Options, Will)',
        sessions: [
          { phase: 'Goal', coachPrompt: 'What would "excellent AI execution" look like for you in your specific HR role? Describe a concrete scenario where you are using AI tools confidently and effectively.' },
          { phase: 'Reality', coachPrompt: 'Where are you now relative to that goal? What AI tools do you currently use, and how confident do you feel? What has stopped you from developing this skill faster?' },
          { phase: 'Options', coachPrompt: 'What options do you have for developing your AI execution skills? Think broadly — formal learning, peer learning, practice, experimentation.' },
          { phase: 'Will', coachPrompt: 'What one specific action will you take in the next 7 days? What might get in the way, and how will you handle it?' }
        ]
      },
      commonBarriers: [
        { barrier: 'I don\'t have time to learn new tools', reframe: 'AI tools save time once you know them. The investment is typically 2-3 hours of practice to reach a level where you save more time than you spend.' },
        { barrier: 'I\'m worried about data confidentiality', reframe: 'This is a valid concern. Does your organisation have an AI usage policy? Many tools can be used effectively without sharing confidential data.' },
        { barrier: 'The output isn\'t good enough', reframe: 'Poor output is usually a prompting problem, not a tool problem. Have you tried the CRISP framework?' },
        { barrier: 'I\'m not sure which tool to use', reframe: 'For most HR tasks, any major generative AI tool works well. The prompting skill matters more than the tool choice. Pick one and commit for 30 days.' }
      ],
      keyTakeaways: ['Most AI execution barriers are addressable with small, deliberate actions', 'The GROW model provides a structured path from current state to desired capability', 'Peer learning — finding colleagues who use AI tools well — is one of the fastest development paths'],
      citations: ['Whitmore, J. (2009). Coaching for Performance. Nicholas Brealey Publishing.']
    }
  },

  {
    key: 'exec-tutorial-2', title: 'Advanced Prompt Techniques: Chain-of-Thought and Role Prompting', subtitle: 'Expert-level prompt strategies for complex HR analysis',
    capability: 'execution', modality: 'tutorial', difficulty: 3, levelLabel: 'Practitioner', durationMins: 20,
    body: {
      overview: 'This module covers advanced prompt engineering techniques: chain-of-thought prompting, role prompting, few-shot examples, and structured output formats for complex HR tasks.',
      objectives: ['Apply chain-of-thought prompting to complex HR analysis', 'Use role prompting to get expert-level perspectives', 'Provide few-shot examples to guide output quality', 'Design structured output formats for HR reports'],
      sections: [
        { title: 'Chain-of-Thought Prompting', content: 'Chain-of-thought (CoT) prompting asks the AI to reason through a problem step by step before answering. This dramatically improves accuracy on complex analytical tasks.\n\nSimple addition: "Think through this step by step before answering"\nExplicit CoT: "First, identify the key factors. Then, analyse each. Then, weigh them. Finally, give your recommendation."\n\nFor HR, CoT is particularly valuable for: workforce planning, organisational design, complex ER cases, and strategic HR recommendations.', examples: ['Without CoT: "Should we implement a 4-day work week?" → generic pros/cons\n\nWith CoT: "Analyse whether we should implement a 4-day work week at our 200-person professional services firm. Think systematically: (1) key stakeholder concerns, (2) operational implications for client-facing roles, (3) talent attraction implications, (4) implementation risks, (5) structured recommendation with conditions. Context: 60% client-facing, London-based, 9-5 culture."'] },
        { title: 'Role Prompting', content: 'Assigning a specific expert role significantly improves relevance and depth. Effective HR role prompts:\n- "You are an experienced employment lawyer specialising in UK employment law"\n- "You are a senior CIPD-qualified HR Director with 20 years in financial services"\n- "You are a specialist in organisational psychology and change management"\n\nFor sensitive topics, combine role prompting with explicit constraints: "You are an experienced HR mediator. Analyse from a neutral perspective, identifying the interests of both parties and suggesting a resolution pathway. Do not take sides."' },
        { title: 'Few-Shot Examples', content: 'Providing examples of the output you want (few-shot prompting) is one of the most powerful techniques for consistently high-quality, correctly formatted output.\n\nApproach: Show the AI one or two examples of the format and quality you want, then ask it to produce more in the same style.', tips: ['Two examples are usually enough — more can constrain the AI too much.', 'If output doesn\'t match your examples, add: "Match the tone, length, and structure of my examples exactly."'] }
      ],
      keyTakeaways: ['Chain-of-thought prompting significantly improves AI performance on complex analytical tasks', 'Specific expert role assignment draws on richer, more relevant knowledge patterns', 'Few-shot examples are the most reliable way to get consistently formatted, high-quality output'],
      citations: ['Wei, J. et al. (2022). Chain-of-Thought Prompting Elicits Reasoning in Large Language Models. NeurIPS 2022.', 'Brown, T. et al. (2020). Language Models are Few-Shot Learners. NeurIPS 2020.']
    }
  },

  {
    key: 'exec-video-1', title: 'Video: AI Tools Demo — Live HR Task Walkthrough', subtitle: 'Watch an experienced HRBP use AI tools for 3 common HR tasks',
    capability: 'execution', modality: 'video', difficulty: 1, levelLabel: 'Foundation', durationMins: 12,
    body: {
      overview: 'A practical video demonstration showing how an experienced HRBP uses AI tools for three common HR tasks: drafting a job description, summarising exit interview data, and preparing for a difficult conversation.',
      objectives: ['Observe effective AI tool usage in realistic HR contexts', 'Learn from the demonstrator\'s prompting techniques', 'Identify techniques you can immediately apply'],
      videoContent: {
        segments: [
          { title: 'Task 1: Drafting a Job Description (4 minutes)', description: 'Watch how a CRISP prompt is constructed, how the initial output is evaluated using FACT, and how it is refined through 2 iterations to produce a publication-ready job description in under 10 minutes.' },
          { title: 'Task 2: Summarising Exit Interview Data (4 minutes)', description: 'See how 25 exit interview responses are processed using AI to identify themes, with the demonstrator validating the AI\'s thematic analysis against the raw data.' },
          { title: 'Task 3: Preparing for a Difficult Conversation (4 minutes)', description: 'Watch how AI is used to prepare talking points — and where the demonstrator draws the line on AI involvement.' }
        ]
      },
      keyTakeaways: ['Effective AI tool use is a learnable skill — watching others is one of the fastest ways to improve', 'The review and refinement step is as important as the initial prompt', 'Knowing when to stop using AI is as important as knowing when to use it'],
      citations: ['CIPD (2024). AI in HR Practice: Video Learning Series.']
    }
  },

  // ─── CAPABILITY: judgement ────────────────────────────────────────────────

  {
    key: 'judge-tutorial-1', title: 'Critical Evaluation of AI Output: The FACT Framework', subtitle: 'How to systematically assess AI-generated content before using it',
    capability: 'judgement', modality: 'tutorial', difficulty: 1, levelLabel: 'Foundation', durationMins: 18,
    body: {
      overview: 'AI tools can produce impressive-looking output that is subtly or significantly wrong. This module gives you a systematic framework for critically evaluating AI output before using it in your HR practice.',
      objectives: ['Apply the FACT framework to evaluate AI-generated HR content', 'Identify the most common types of AI errors in HR contexts', 'Recognise when AI output requires expert verification', 'Develop a personal quality checklist for AI output review'],
      sections: [
        { title: 'Why AI Output Needs Critical Evaluation', content: 'Generative AI models are trained to produce plausible, coherent text — not necessarily accurate text. In HR contexts, this matters enormously because:\n- Legal accuracy: Employment law errors can expose your organisation to significant liability\n- Factual accuracy: Statistics, case law, and policy details may be wrong or outdated\n- Contextual appropriateness: Generic output may be inappropriate for your specific situation\n- Bias: AI output can reflect and amplify biases in training data\n- Completeness: AI may omit important considerations', examples: ['An HR manager used AI to draft a redundancy letter. The AI included a 45-day consultation period (correct for collective redundancy) but the situation was individual redundancy (no statutory minimum). The error was not caught before the letter was sent.'] },
        { title: 'The FACT Framework', content: '**F — Factual Accuracy**: Are the facts, statistics, legal requirements correct? Can you verify them?\n\n**A — Appropriateness**: Is the output appropriate for your specific context, audience, and organisational culture?\n\n**C — Completeness**: Has the AI omitted important considerations that a human expert would include?\n\n**T — Tone and Bias**: Is the tone appropriate? Does the output contain subtle biases or discriminatory language?', examples: ['FACT evaluation of a redundancy FAQ:\nF: Check statutory consultation periods against ACAS guidance\nA: Does it reflect your organisation\'s specific policy?\nC: Has it included the appeals process and support available?\nT: Is the tone empathetic for employees facing job loss?'] },
        { title: 'Common AI Error Patterns in HR', content: '1. Outdated information: AI training data has a cutoff date\n2. Jurisdiction confusion: AI may mix UK, US, and other employment law\n3. Generic vs. specific: AI produces generic best practice that may not apply to your situation\n4. Hallucinated citations: AI may cite research that does not exist\n5. Bias in language: Subtly biased language in job descriptions or performance reviews\n6. Missing context: AI does not know your organisation\'s culture or history', tips: ['Never include an AI-generated citation in a professional document without verifying it exists.', 'For statistics, always ask: "What is the source?" and verify independently.'] }
      ],
      keyTakeaways: ['AI output requires systematic critical evaluation — confidence in tone is not a signal of accuracy', 'FACT (Factual accuracy, Appropriateness, Completeness, Tone/bias) provides a systematic evaluation approach', 'The most dangerous AI errors in HR are legal inaccuracies, hallucinated citations, and jurisdiction confusion'],
      citations: ['Bender, E.M. et al. (2021). On the Dangers of Stochastic Parrots. ACM FAccT 2021.', 'ACAS (2023). Using Artificial Intelligence in the Workplace.']
    }
  },

  {
    key: 'judge-scenario-1', title: 'Scenario: Spot the AI Errors', subtitle: 'Practise identifying errors in AI-generated HR documents',
    capability: 'judgement', modality: 'scenario', difficulty: 2, levelLabel: 'Developing', durationMins: 25,
    body: {
      overview: 'Review three AI-generated HR documents and identify the errors, inaccuracies, and inappropriate content they contain.',
      objectives: ['Identify factual, legal, and contextual errors in AI-generated HR documents', 'Apply the FACT framework to real-world HR content', 'Develop confidence in challenging and correcting AI output'],
      documents: [
        { title: 'Document 1: AI-Generated Redundancy Letter', content: 'Dear [Employee Name],\n\nI am writing to inform you that your role is at risk of redundancy. As required by UK employment law, we are entering a 45-day consultation period beginning [date]...\n\nYour statutory redundancy pay will be calculated as follows: 1.5 weeks\' pay for each year over 41, 1 week\'s pay for each year between 22 and 40, 0.5 weeks\' pay for each year under 22. The current weekly pay cap is £643.',
          errors: [
            { location: '45-day consultation period', error: 'The 45-day minimum applies to collective redundancies (20+ employees). For individual redundancies, there is no statutory minimum. This error could expose the organisation to unfair dismissal claims.', severity: 'High — legal error' },
            { location: 'Weekly pay cap of £643', error: 'The statutory weekly pay cap changes annually. This figure may be outdated. Always check current ACAS/GOV.UK figures.', severity: 'Medium — may be outdated' },
            { location: 'Missing information', error: 'The letter does not mention: right of appeal, support available (EAP, outplacement), timeline, or selection criteria.', severity: 'Medium — completeness' }
          ]
        },
        { title: 'Document 2: AI-Generated Interview Questions', content: '1. Tell me about your experience in marketing.\n2. Where do you see yourself in 5 years?\n3. How do you handle difficult team members?\n4. Are you planning to start a family in the next few years? This helps us understand your long-term commitment.\n5. What is your greatest weakness?\n6. Tell me about a time you failed.',
          errors: [
            { location: 'Question 4: family planning', error: 'This question is potentially discriminatory under the Equality Act 2010 on grounds of sex and pregnancy/maternity. It should never be asked in an interview.', severity: 'Critical — discriminatory question' },
            { location: 'Question 5: greatest weakness', error: 'This is a low-validity interview question that invites rehearsed answers. Research shows poor predictive validity for job performance.', severity: 'Low — validity issue' }
          ]
        }
      ],
      keyTakeaways: ['AI-generated HR documents frequently contain legal errors, outdated information, and discriminatory content', 'Legal errors (discriminatory questions, incorrect employment law) are the highest-risk', 'AI output should always be reviewed by someone with appropriate HR and legal knowledge'],
      citations: ['ACAS (2023). Redundancy: A Guide for Employers.', 'EHRC (2022). Equality Act 2010: Employment Statutory Code of Practice.']
    }
  },

  {
    key: 'judge-case-study-1', title: 'Case Study: When Amazon\'s AI Hiring Tool Discriminated Against Women', subtitle: 'A landmark case in AI bias and the lessons for HR',
    capability: 'judgement', modality: 'case_study', difficulty: 3, levelLabel: 'Practitioner', durationMins: 30,
    body: {
      overview: 'In 2018, Reuters revealed that Amazon had scrapped an AI hiring tool after discovering it systematically downgraded CVs from women. This case study examines how the bias emerged, why it was not caught earlier, and what it means for HR professionals.',
      objectives: ['Understand how algorithmic bias emerges in AI hiring tools', 'Identify systemic failures that allowed the bias to persist', 'Apply lessons to AI tool evaluation in your organisation', 'Develop criteria for auditing AI tools for bias'],
      sections: [
        { title: 'The Amazon AI Hiring Tool', content: 'Amazon developed an AI tool to automate CV screening, training it on CVs submitted over 10 years. The tool scored candidates 1-5 stars. Problem: Amazon\'s tech workforce was predominantly male. The AI learned that male-associated patterns were associated with successful hires. It penalised CVs containing the word "women\'s" and downgraded graduates of all-women\'s colleges.' },
        { title: 'Why the Bias Emerged', content: '1. Biased training data: 10 years of CVs reflected historical male dominance in tech\n2. Proxy discrimination: The AI used proxies (words, institutions) that correlated with gender — illegal under UK and US equality law\n3. Lack of diverse oversight: The team did not include sufficient diversity to spot the bias early\n4. Delayed detection: The bias was not detected for several years', tips: ['Proxy discrimination is particularly dangerous because it is invisible — the AI is not "trying" to discriminate, it is optimising for patterns in biased historical data.'] },
        { title: 'Implications for HR Professionals', content: '1. Demand bias audits before adopting any AI hiring tool\n2. Monitor outcomes regularly by demographic group\n3. Understand the training data: ask vendors what data was used\n4. Maintain human oversight: you cannot outsource legal obligations to an algorithm\n5. Document your decisions for GDPR compliance and potential tribunal defence' }
      ],
      discussionQuestions: ['If you were an HR Director at Amazon in 2015, what governance processes would have caught this bias earlier?', 'How would you respond if a vendor said their tool had been "tested for bias" but could not provide the methodology?'],
      keyTakeaways: ['AI tools trained on historical data can perpetuate and amplify historical biases', 'Bias auditing is a non-negotiable requirement before deploying AI in high-stakes HR decisions', 'HR professionals cannot outsource legal obligations to algorithms'],
      citations: ['Dastin, J. (2018). Amazon scraps secret AI recruiting tool that showed bias against women. Reuters.', 'Raghavan, M. et al. (2020). Mitigating Bias in Algorithmic Hiring. ACM FAccT 2020.']
    }
  },

  {
    key: 'judge-practical-1', title: 'Practical: Building Your AI Output Verification Checklist', subtitle: 'Create a personalised quality assurance checklist for your most common AI tasks',
    capability: 'judgement', modality: 'practical', difficulty: 2, levelLabel: 'Developing', durationMins: 25,
    body: {
      overview: 'A systematic verification checklist is the most practical tool for ensuring AI output quality. This module guides you through building a personalised checklist for your 3 most common AI-assisted HR tasks.',
      objectives: ['Identify specific verification requirements for your most common AI tasks', 'Build a practical, reusable verification checklist', 'Establish a personal quality assurance habit for AI output'],
      sections: [
        { title: 'Checklist Templates for Common HR Tasks', content: 'Use these templates to build your checklist:', templates: [
          { task: 'Employment Law / Policy Documents', checks: ['Verify all statutory figures against current ACAS guidance', 'Confirm jurisdiction is UK (not US or generic)', 'Check policy references match your organisation\'s current policies', 'Verify any cited legislation is current and correctly described', 'Check for discriminatory language', 'Confirm all legally required elements are included'], sources: ['ACAS (acas.org.uk)', 'GOV.UK employment guidance', 'Your organisation\'s current policies'] },
          { task: 'Recruitment Documents', checks: ['Check for potentially discriminatory language or requirements', 'Verify all "essential" requirements are genuinely essential', 'Confirm interview questions are competency-based and legally compliant', 'Check for gendered language', 'Verify role requirements match the actual job'], sources: ['EHRC Equality Act guidance', 'CIPD inclusive recruitment guide'] },
          { task: 'Employee Communications', checks: ['Verify factual accuracy of all specific claims', 'Check tone is appropriate for the situation and audience', 'Confirm message aligns with your organisation\'s communication style', 'Verify any statistics or research cited actually exist', 'Check for unintended implications or ambiguities'], sources: ['Original data sources for statistics', 'Your organisation\'s communication guidelines'] }
        ]}
      ],
      exercises: [{ title: 'Build Your Personal Checklist', instruction: 'Using the templates above, build a verification checklist for the 3 AI-assisted tasks you do most frequently. For each: list the specific checks, identify authoritative sources, and estimate verification time.', deliverable: 'A completed verification checklist document you will use in your daily work' }],
      keyTakeaways: ['A task-specific verification checklist is more effective than general vigilance', 'The checklist should include specific authoritative sources to verify against', 'Consistency is more important than perfection — a simple checklist used every time beats a comprehensive one used occasionally'],
      citations: ['Gawande, A. (2009). The Checklist Manifesto. Metropolitan Books.']
    }
  },

  {
    key: 'judge-quiz-1', title: 'AI Judgement Knowledge Check', subtitle: 'Test your critical evaluation skills for AI-generated HR content',
    capability: 'judgement', modality: 'quiz', difficulty: 2, levelLabel: 'Developing', durationMins: 12,
    body: {
      overview: 'A knowledge check covering AI bias detection, output evaluation, legal accuracy, and professional judgement.',
      questions: [
        { id: 'q1', question: 'An AI tool trained on 10 years of your organisation\'s hiring data recommends candidates who "fit the profile" of past successful hires. What is the primary risk?', options: [{ id: 'a', text: 'The AI might be too slow' }, { id: 'b', text: 'The AI may perpetuate historical biases, producing proxy discrimination against protected groups' }, { id: 'c', text: 'The AI might recommend overqualified candidates' }, { id: 'd', text: 'The AI might not have access to recent CVs' }], correctAnswer: 'b', explanation: 'Training AI on historical hiring data risks perpetuating historical biases. If past successful hires were predominantly from certain demographics, the AI learns to favour similar profiles — proxy discrimination, illegal under the Equality Act 2010.', competency: 'AI bias recognition' },
        { id: 'q2', question: 'An AI generates a performance review describing a female employee as "emotional" and "collaborative" and a male employee with the same performance as "passionate" and "a strong team player". What issue does this illustrate?', options: [{ id: 'a', text: 'The AI has made a factual error about their performance' }, { id: 'b', text: 'The AI is using gendered language reflecting stereotypes in its training data' }, { id: 'c', text: 'The AI has confused the two employees' }, { id: 'd', text: 'The AI is using informal language' }], correctAnswer: 'b', explanation: '"Emotional" is often applied to women and carries negative connotations; "passionate" is applied to men and is positive. This is gendered language bias that HR professionals must actively identify and correct.', competency: 'AI bias recognition' },
        { id: 'q3', question: 'An AI cites a "2023 CIPD study showing 42% of employees report AI has improved their work-life balance". Before including this in a board presentation, what should you do?', options: [{ id: 'a', text: 'Include it — CIPD is a reputable source' }, { id: 'b', text: 'Verify the study exists and the statistic is accurately represented' }, { id: 'c', text: 'Ask the AI to provide a link' }, { id: 'd', text: 'Round the figure to 40% to be conservative' }], correctAnswer: 'b', explanation: 'AI tools frequently generate plausible-sounding but non-existent citations. Even reputable organisations are used as false sources. Always verify citations independently before using them in professional documents.', competency: 'Citation verification' }
      ],
      passingScore: 70
    }
  },

  {
    key: 'judge-reflection-1', title: 'Reflection: Your AI Scepticism Calibration', subtitle: 'Calibrate your level of scepticism about AI output for different task types',
    capability: 'judgement', modality: 'reflection', difficulty: 2, levelLabel: 'Developing', durationMins: 15,
    body: {
      overview: 'Effective AI judgement requires calibrated scepticism — not too trusting, not too dismissive. This reflection helps you identify where your scepticism may be miscalibrated.',
      objectives: ['Assess your current level of scepticism about AI output', 'Identify tasks where you may be over-trusting or under-trusting AI', 'Develop a calibrated approach to AI output evaluation'],
      reflectionPrompts: [
        { area: 'Over-trust', questions: ['Have you ever used AI output without reviewing it carefully? What happened?', 'Are there types of AI output you tend to accept without question? Why?', 'Have you ever been embarrassed by an error in AI output you used?'] },
        { area: 'Under-trust', questions: ['Are there types of AI output you dismiss too quickly?', 'Do you ever spend more time reviewing AI output than it would have taken to write yourself?', 'What would help you trust AI output more in low-risk situations?'] },
        { area: 'Calibration', questions: ['For which HR tasks do you have the right level of scepticism?', 'What is your personal rule for when to verify AI output against an authoritative source?', 'How do you decide how much time to spend reviewing AI output?'] }
      ],
      keyTakeaways: ['Calibrated scepticism — neither over-trust nor under-trust — is the goal', 'Over-trust leads to errors; under-trust leads to underutilisation', 'A personal rule for verification makes calibration consistent'],
      citations: ['Kahneman, D. (2011). Thinking, Fast and Slow. Farrar, Straus and Giroux.']
    }
  },

  // ─── CAPABILITY: governance ───────────────────────────────────────────────

  {
    key: 'gov-tutorial-1', title: 'AI Governance in HR: GDPR, the EU AI Act, and Your Obligations', subtitle: 'The regulatory landscape for AI use in HR',
    capability: 'governance', modality: 'tutorial', difficulty: 2, levelLabel: 'Developing', durationMins: 25,
    body: {
      overview: 'AI use in HR is increasingly regulated. This module covers the key regulatory frameworks — GDPR, the EU AI Act, and UK AI governance guidance — and translates them into practical obligations for HR professionals.',
      objectives: ['Identify key regulatory frameworks governing AI use in HR', 'Explain GDPR obligations when using AI with employee data', 'Describe the EU AI Act\'s implications for HR AI systems', 'Apply governance principles to your organisation\'s AI tool usage'],
      sections: [
        { title: 'GDPR and AI in HR', content: 'Key GDPR implications for AI use in HR:\n\n**Lawful basis**: Using AI to process employee data requires a documented lawful basis.\n\n**Automated decision-making (Article 22)**: Employees have the right not to be subject to solely automated decisions that significantly affect them. If your AI makes hiring, promotion, or disciplinary decisions without meaningful human review, you may be in breach.\n\n**Transparency**: Employees have the right to know when AI is used in decisions about them.\n\n**Data minimisation**: AI tools should only process data necessary for their purpose.\n\n**Data transfers**: If your AI tool is hosted outside the UK/EU, ensure appropriate transfer mechanisms.', tips: ['Document your AI tool usage in your organisation\'s Record of Processing Activities (ROPA).', 'Conduct a Data Protection Impact Assessment (DPIA) before deploying any AI tool that processes employee data at scale.'] },
        { title: 'The EU AI Act and High-Risk AI Systems', content: 'The EU AI Act classifies several HR AI applications as "high-risk":\n- AI used in recruitment and CV screening\n- AI used in performance evaluation\n- AI used in promotion or termination decisions\n- AI used in task allocation or monitoring\n\nRequirements for high-risk systems: risk management, high-quality training data, technical documentation, transparency, human oversight, accuracy and robustness.' },
        { title: 'Practical Governance Framework', content: '1. Inventory: Maintain a register of all AI tools used in HR\n2. Risk assessment: Assess risk level for each tool\n3. Due diligence: Conduct due diligence before adopting new tools\n4. Human oversight: Establish clear policies for human review of AI decisions\n5. Employee transparency: Inform employees when AI is used\n6. Monitoring: Regularly audit AI tool outcomes for bias and accuracy\n7. Incident response: Have a process for responding to AI errors or bias incidents' }
      ],
      keyTakeaways: ['GDPR Article 22 requires meaningful human oversight of AI decisions that significantly affect employees', 'The EU AI Act classifies several HR AI applications as high-risk', 'A practical governance framework includes: inventory, risk assessment, due diligence, human oversight, transparency, monitoring, and incident response'],
      citations: ['ICO (2023). Guidance on AI and Data Protection.', 'European Parliament (2024). EU Artificial Intelligence Act.', 'CIPD (2023). AI Governance in HR: A Practical Guide.']
    }
  },

  {
    key: 'gov-practical-1', title: 'Practical: Conducting an AI Tool Risk Assessment', subtitle: 'Step-by-step guide to assessing AI tool risk before adoption',
    capability: 'governance', modality: 'practical', difficulty: 2, levelLabel: 'Developing', durationMins: 30,
    body: {
      overview: 'Before adopting any AI tool in HR, a structured risk assessment is essential. This module walks you through a complete risk assessment for a hypothetical AI recruitment tool.',
      objectives: ['Complete a structured AI tool risk assessment', 'Identify key risk dimensions for HR AI tools', 'Develop appropriate mitigation measures', 'Create a risk assessment template for your organisation'],
      sections: [
        { title: 'The 6-Dimension AI Tool Risk Assessment', content: '1. **Data Risk**: What personal data does the tool process? Where is it stored? Who has access?\n2. **Bias Risk**: How was the tool trained? Has it been tested for bias across protected characteristics?\n3. **Legal Risk**: Does the tool comply with GDPR, the Equality Act, and other regulations?\n4. **Operational Risk**: What happens if the tool fails? What is the fallback?\n5. **Reputational Risk**: If the tool\'s use became public, how would employees, candidates, or the media react?\n6. **Vendor Risk**: Is the vendor financially stable? What are the contractual protections?' }
      ],
      exercises: [
        { title: 'Risk Assessment Exercise', instruction: 'You are evaluating an AI CV screening tool "TalentScan". The vendor claims: trained on 10 million CVs, 98% accuracy, reduces unconscious bias by removing name and photo, GDPR compliant (EU data storage), used by 500+ companies. Complete a risk assessment using the 6-dimension framework.', hint: 'Think carefully about: What does "98% accuracy" mean and how was it measured? Does removing name and photo actually reduce bias? What data is retained after screening? What happens to rejected candidates\' data?' }
      ],
      keyTakeaways: ['A structured 6-dimension risk assessment provides comprehensive coverage', 'Vendor claims require independent verification', 'Risk assessment is not a one-time activity — AI tools require ongoing monitoring'],
      citations: ['ICO (2023). Data Protection Impact Assessments.', 'EHRC (2022). Using AI in Recruitment: A Guide for Employers.']
    }
  },

  {
    key: 'gov-scenario-1', title: 'Scenario: The AI Policy Incident', subtitle: 'Navigate a real-world AI governance failure and its aftermath',
    capability: 'governance', modality: 'scenario', difficulty: 3, levelLabel: 'Practitioner', durationMins: 30,
    body: {
      overview: 'A serious AI governance incident has occurred at your organisation. Work through the scenario to understand how to respond, remediate, and prevent recurrence.',
      objectives: ['Apply governance principles to a real-world AI incident', 'Develop an appropriate incident response plan', 'Identify systemic failures that led to the incident', 'Design preventive measures to avoid recurrence'],
      scenario: { situation: 'You are the HR Director at a 1,000-person financial services firm. Your recruitment team has been using an AI CV screening tool for 6 months without a formal risk assessment or DPIA. A rejected candidate has complained to the ICO that they were not informed AI was used, and believe the AI discriminated against them on grounds of age (they are 58). The ICO has opened an investigation. Your CEO has asked you to brief the board tomorrow.', background: ['The tool was adopted by a Talent Acquisition Manager without HR Director sign-off', 'The vendor was not asked about bias testing or GDPR compliance', 'Candidates were not informed AI was used', 'No human review of AI decisions was in place — all rejections were automated', 'The tool\'s training data is unknown'] },
      guidance: {
        immediateActions: ['Suspend use of the tool immediately', 'Notify the ICO proactively — this demonstrates good faith', 'Preserve all records related to the tool\'s use', 'Identify all candidates screened and consider re-reviewing their applications', 'Engage employment lawyers immediately'],
        boardBriefingStructure: ['What happened: Timeline, how tool was adopted without governance', 'Legal risk: GDPR Article 22 breach, potential Equality Act breach, ICO investigation', 'Reputational risk: Media exposure, employer brand damage', 'Immediate actions taken', 'Systemic changes: AI governance policy, mandatory risk assessment, DPIA requirement, staff training']
      },
      keyTakeaways: ['AI governance failures can result in ICO investigations, legal liability, and reputational damage', 'Proactive ICO notification typically results in better outcomes than defensive responses', 'Systemic governance failures are the root cause of most AI incidents', 'HR Directors are accountable for AI tools used in their function'],
      citations: ['ICO (2023). Regulatory Action Policy.', 'GDPR Article 22: Automated individual decision-making, including profiling.']
    }
  },

  {
    key: 'gov-reflection-1', title: 'Reflection: Your Organisation\'s AI Governance Maturity', subtitle: 'Assess your organisation\'s current AI governance and identify the gaps',
    capability: 'governance', modality: 'reflection', difficulty: 2, levelLabel: 'Developing', durationMins: 20,
    body: {
      overview: 'AI governance is only as strong as its implementation in practice. This reflection guides you through an honest assessment of your organisation\'s current AI governance maturity.',
      objectives: ['Assess your organisation\'s AI governance maturity across 5 dimensions', 'Identify the most critical governance gaps', 'Develop a prioritised action plan for governance improvement'],
      reflectionFramework: {
        dimensions: [
          { dimension: 'Policy and Standards', questions: ['Does your organisation have a written AI usage policy for HR?', 'Are employees aware of the policy?', 'When was it last reviewed?'], maturityLevels: ['No policy', 'Draft policy', 'Published policy, limited awareness', 'Published policy, active training', 'Policy embedded in practice, regularly reviewed'] },
          { dimension: 'Risk Assessment', questions: ['Is there a process for assessing risk of new AI tools?', 'Are DPIAs conducted for AI tools processing employee data?', 'Is there a register of AI tools used in HR?'], maturityLevels: ['No process', 'Ad hoc assessment', 'Informal process', 'Documented process, inconsistently applied', 'Embedded process, consistently applied'] },
          { dimension: 'Human Oversight', questions: ['Are there clear policies for human review of AI decisions?', 'Do employees know how to request human review?', 'Are AI decisions in high-stakes processes reviewed by qualified humans?'], maturityLevels: ['No oversight', 'Oversight for some decisions', 'Oversight policy exists', 'Oversight policy implemented', 'Oversight embedded and monitored'] },
          { dimension: 'Monitoring and Audit', questions: ['Are AI tool outcomes regularly monitored for bias?', 'Is there a process for reporting AI incidents?', 'Are AI vendors held accountable for their compliance claims?'], maturityLevels: ['No monitoring', 'Reactive monitoring', 'Periodic review', 'Regular monitoring', 'Continuous monitoring with improvement cycle'] },
          { dimension: 'Culture and Capability', questions: ['Do HR professionals have knowledge to use AI tools responsibly?', 'Is there a culture of questioning and verifying AI output?', 'Are AI governance responsibilities clearly assigned?'], maturityLevels: ['No awareness', 'Limited awareness', 'Growing awareness', 'Active capability building', 'Embedded culture of responsible AI use'] }
        ]
      },
      keyTakeaways: ['AI governance maturity varies across dimensions', 'The most critical gaps to address are those creating the highest legal and reputational risk', 'HR professionals have a personal responsibility for AI governance'],
      citations: ['CIPD (2024). AI Governance Maturity Framework for HR.', 'ICO (2023). Accountability Framework for AI.']
    }
  },

  {
    key: 'gov-quiz-1', title: 'AI Governance Knowledge Check', subtitle: 'Test your understanding of AI governance, GDPR, and compliance',
    capability: 'governance', modality: 'quiz', difficulty: 2, levelLabel: 'Developing', durationMins: 12,
    body: {
      overview: 'A knowledge check covering GDPR obligations, EU AI Act requirements, risk assessment, and governance best practices for AI in HR.',
      questions: [
        { id: 'q1', question: 'Under GDPR Article 22, what right do employees have regarding automated decisions?', options: [{ id: 'a', text: 'The right to see all data held about them' }, { id: 'b', text: 'The right not to be subject to solely automated decisions that significantly affect them, without meaningful human review' }, { id: 'c', text: 'The right to have their data deleted at any time' }, { id: 'd', text: 'The right to know which AI tools their employer uses' }], correctAnswer: 'b', explanation: 'GDPR Article 22 gives individuals the right not to be subject to solely automated decisions (including profiling) that produce significant effects. HR must ensure meaningful human review of AI-assisted decisions in recruitment, performance management, and disciplinary processes.', competency: 'GDPR compliance' },
        { id: 'q2', question: 'Which of the following HR AI applications is classified as "high-risk" under the EU AI Act?', options: [{ id: 'a', text: 'An AI tool that generates draft job descriptions' }, { id: 'b', text: 'An AI tool that summarises meeting notes' }, { id: 'c', text: 'An AI tool that scores job applicants and recommends who to interview' }, { id: 'd', text: 'An AI tool that suggests learning content to employees' }], correctAnswer: 'c', explanation: 'The EU AI Act classifies AI systems used in recruitment and CV screening as high-risk, requiring extensive governance including risk management, bias testing, transparency, and human oversight. AI tools for content generation or summarisation are not classified as high-risk.', competency: 'EU AI Act' },
        { id: 'q3', question: 'Your organisation wants to adopt an AI performance management tool. What should you do first?', options: [{ id: 'a', text: 'Pilot it with a small team to see if it works' }, { id: 'b', text: 'Conduct a Data Protection Impact Assessment (DPIA) and risk assessment before adoption' }, { id: 'c', text: 'Ask the vendor if it is GDPR compliant' }, { id: 'd', text: 'Check if any competitors are using it' }], correctAnswer: 'b', explanation: 'A DPIA is legally required under GDPR for processing operations likely to result in high risk to individuals — AI performance management tools qualify. A risk assessment should also be conducted covering data, bias, legal, operational, reputational, and vendor risks.', competency: 'Risk assessment' }
      ],
      passingScore: 70
    }
  },

  // ─── CAPABILITY: appropriateness ─────────────────────────────────────────

  {
    key: 'approp-tutorial-1', title: 'When to Use AI and When Not To: A Decision Framework', subtitle: 'Building your professional judgement about AI appropriateness',
    capability: 'appropriateness', modality: 'tutorial', difficulty: 1, levelLabel: 'Foundation', durationMins: 18,
    body: {
      overview: 'Not every HR task benefits from AI assistance, and some tasks should never involve AI. This module gives you a practical decision framework for determining when AI is appropriate, when it needs careful management, and when human judgement must take precedence.',
      objectives: ['Apply the AI Appropriateness Matrix to HR tasks', 'Identify tasks where AI adds clear value vs. tasks where it creates risk', 'Recognise the human elements of HR that AI cannot replace', 'Develop a personal decision rule for AI use in sensitive HR situations'],
      sections: [
        { title: 'The AI Appropriateness Matrix', content: 'The matrix evaluates tasks on two dimensions:\n\n**Sensitivity**: How sensitive is the task? Does it involve confidential information, vulnerable employees, legal risk, or significant impact on individuals?\n\n**Complexity**: How complex is the task? Does it require deep contextual understanding, nuanced judgement, or knowledge of your specific organisation?\n\nFour quadrants:\n- **Low sensitivity + Low complexity** (e.g., drafting a JD template): AI is highly appropriate — use freely.\n- **Low sensitivity + High complexity** (e.g., analysing workforce trends): AI can assist, but human expertise drives the output.\n- **High sensitivity + Low complexity** (e.g., standard redundancy letter template): AI can assist but requires careful review.\n- **High sensitivity + High complexity** (e.g., managing a grievance, supporting an employee in crisis): AI should play a minimal role — human judgement and empathy are paramount.', examples: ['High sensitivity + High complexity: An employee discloses a mental health crisis. The manager asks an AI "what should I say?". This is inappropriate — the response requires human empathy, active listening, and knowledge of the specific person and situation.', 'Low sensitivity + Low complexity: Drafting the agenda for a team meeting. AI assistance is entirely appropriate.'], tips: ['When in doubt, ask: "Would I be comfortable if this employee knew AI had been used in this interaction?" If not, reconsider.'] },
        { title: 'The Irreplaceable Human Elements of HR', content: 'Some elements of HR work are fundamentally human:\n\n**Empathy and emotional attunement**: Understanding how someone is feeling, responding to unspoken distress, providing genuine human connection.\n\n**Contextual wisdom**: Understanding the history, culture, and relationships within your organisation that no AI can know.\n\n**Ethical judgement**: Making difficult decisions involving competing values and long-term consequences.\n\n**Trust and relationship**: Employee trust in HR is built through human relationships. AI-mediated interactions can erode this trust.\n\n**Accountability**: When things go wrong, humans need to be accountable.', tips: ['Use AI to handle the administrative and analytical burden of HR, freeing up your time for the human work that only you can do.'] }
      ],
      keyTakeaways: ['The AI Appropriateness Matrix (sensitivity × complexity) provides a practical framework', 'High sensitivity + high complexity HR tasks require human judgement and empathy', 'AI is most appropriate for low-sensitivity, low-complexity tasks', 'The irreplaceable human elements of HR must be protected'],
      citations: ['CIPD (2023). Human-Centred AI in HR.', 'Brynjolfsson, E. & McAfee, A. (2014). The Second Machine Age.']
    }
  },

  {
    key: 'approp-scenario-1', title: 'Scenario: Should AI Be Involved Here?', subtitle: 'Practise making appropriateness judgements across 5 HR situations',
    capability: 'appropriateness', modality: 'scenario', difficulty: 2, levelLabel: 'Developing', durationMins: 20,
    body: {
      overview: 'Five realistic HR situations. For each, decide: (1) Is AI appropriate here? (2) If yes, how should it be used? (3) What are the risks to manage?',
      objectives: ['Apply the AI Appropriateness Matrix to realistic HR situations', 'Articulate clear reasoning for AI use/non-use decisions', 'Identify appropriate boundaries for AI involvement in sensitive situations'],
      situations: [
        { id: 1, title: 'The Grievance Investigation', description: 'An employee has raised a formal grievance against their line manager, alleging bullying. You are considering using AI to: (a) summarise witness interview notes, (b) draft the investigation report, (c) identify inconsistencies in witness statements.', analysis: { a: { recommendation: 'Appropriate with caution', rationale: 'Summarising factual interview notes is reasonable — saves time and reduces selective note-taking. Review carefully for accuracy.' }, b: { recommendation: 'AI-assisted with significant human oversight', rationale: 'AI can draft structure and factual sections, but conclusions and recommendations must be entirely human-authored — they require professional judgement and accountability.' }, c: { recommendation: 'Appropriate as a tool, not a decision-maker', rationale: 'AI can help identify potential inconsistencies for you to investigate. But the judgement about whether an inconsistency is significant is entirely yours.' } } },
        { id: 2, title: 'The Mental Health Disclosure', description: 'An employee has emailed saying they are struggling with anxiety and depression. You are considering using AI to draft a response.', analysis: { overall: { recommendation: 'AI should not draft the response', rationale: 'This is high-sensitivity, high-complexity requiring human empathy and genuine connection. The employee is vulnerable and has trusted you with sensitive personal information.', alternative: 'Use AI to quickly look up support available (EAP, occupational health, reasonable adjustments), but write the response yourself.' } } },
        { id: 3, title: 'The Redundancy Announcement', description: 'You need to communicate a restructuring with 30 redundancies. Considering AI for: (a) all-staff announcement, (b) individual at-risk letters, (c) FAQs for affected employees.', analysis: { a: { recommendation: 'AI-assisted with careful human review', rationale: 'AI can draft structure and key messages, but tone and organisational context must be human.' }, b: { recommendation: 'AI for template only — personalise each letter', rationale: 'AI can generate a legally compliant template, but each letter must be personalised and reviewed for accuracy.' }, c: { recommendation: 'AI-assisted — good use case', rationale: 'FAQs are a relatively low-sensitivity, structured task where AI adds significant value. Review carefully for legal accuracy.' } } }
      ],
      keyTakeaways: ['AI appropriateness is not binary — the question is often "how should AI be used here?" not "should AI be used?"', 'High-sensitivity situations require human empathy and judgement even when AI assists with administrative tasks', 'AI is most valuable for the administrative burden of HR, freeing up human capacity for the human work'],
      citations: ['CIPD (2023). Human-Centred AI: Principles for HR.']
    }
  },

  {
    key: 'approp-case-study-1', title: 'Case Study: AI in Employee Wellbeing — Where the Line Is', subtitle: 'Examining the boundaries of AI use in sensitive HR contexts',
    capability: 'appropriateness', modality: 'case_study', difficulty: 3, levelLabel: 'Practitioner', durationMins: 25,
    body: {
      overview: 'Several organisations have experimented with AI tools in employee wellbeing contexts — from AI chatbots for mental health support to predictive analytics for burnout risk. This case study examines where these experiments have succeeded, where they have failed, and what the boundaries should be.',
      objectives: ['Evaluate the appropriateness of AI use in employee wellbeing contexts', 'Identify the ethical boundaries of AI in sensitive HR situations', 'Apply appropriateness principles to emerging AI wellbeing tools', 'Develop a principled position on AI in employee wellbeing'],
      sections: [
        { title: 'AI Wellbeing Tools: The Promise', content: 'AI wellbeing tools promise to: identify employees at risk of burnout before they reach crisis point; provide 24/7 access to mental health support; reduce stigma by offering anonymous support; scale wellbeing support to all employees, not just those who proactively seek help.' },
        { title: 'AI Wellbeing Tools: The Reality', content: 'Case 1: A large tech company deployed an AI chatbot for mental health support. Employees used it for low-level stress and anxiety. But when an employee in crisis used it, the chatbot\'s scripted responses were inadequate and the employee felt dismissed. The company faced significant reputational damage.\n\nCase 2: A financial services firm used AI to analyse email patterns and meeting attendance to predict burnout risk. Employees discovered the monitoring and felt their privacy had been violated. Trust in HR collapsed.\n\nCase 3: An NHS trust used AI to identify staff at risk of leaving due to burnout. The AI was accurate, but managers used the information to have "check-in conversations" that felt intrusive to the staff identified.' },
        { title: 'Principles for AI in Employee Wellbeing', content: '1. **Transparency is non-negotiable**: Employees must know when AI is used in wellbeing contexts and how their data is used.\n2. **AI supplements, never replaces, human support**: AI can provide information and low-level support, but human connection is essential for meaningful wellbeing support.\n3. **Crisis situations require human response**: No AI tool should be the primary response to an employee in crisis.\n4. **Consent and control**: Employees should have meaningful control over whether AI tools are used in their wellbeing support.\n5. **Avoid surveillance framing**: Wellbeing monitoring that feels like surveillance destroys trust and is counterproductive.' }
      ],
      discussionQuestions: ['Where would you draw the line on AI use in employee wellbeing at your organisation?', 'How would you respond if your CEO asked you to implement an AI burnout prediction tool?'],
      keyTakeaways: ['AI wellbeing tools can add value for low-level support but are inappropriate as the primary response to mental health crises', 'Transparency and employee consent are non-negotiable in wellbeing AI applications', 'Wellbeing monitoring that feels like surveillance destroys trust and is counterproductive'],
      citations: ['CIPD (2023). Technology and the Future of Work: Wellbeing. London: CIPD.', 'Mind (2023). AI and Mental Health in the Workplace. Mind.']
    }
  },

  {
    key: 'approp-reflection-1', title: 'Reflection: Your Personal AI Appropriateness Principles', subtitle: 'Develop your own principled framework for AI use in HR',
    capability: 'appropriateness', modality: 'reflection', difficulty: 2, levelLabel: 'Developing', durationMins: 20,
    body: {
      overview: 'Professional judgement about AI appropriateness is ultimately personal — it reflects your values, your understanding of HR\'s purpose, and your commitment to the people you serve.',
      objectives: ['Articulate your personal values about AI use in HR', 'Develop a set of personal principles for AI appropriateness decisions', 'Test your principles against challenging scenarios', 'Commit to a personal standard for AI use in your HR practice'],
      reflectionPrompts: [
        { area: 'Values', questions: ['What do you believe is the fundamental purpose of HR? How does AI use align with or challenge that purpose?', 'What do you owe to the employees you serve? How does that shape your approach to AI?', 'Where do you draw the line between using data to support employees and using data to surveil them?'] },
        { area: 'Principles', questions: ['Write 3 personal principles for AI use in HR that you would be comfortable sharing with your team.', 'How would you explain your principles to a sceptical colleague who thinks you are being too cautious about AI?', 'How would you explain them to a colleague who thinks you are not cautious enough?'] },
        { area: 'Testing', questions: ['Apply your principles to this scenario: Your CEO asks you to implement an AI tool that monitors employee email sentiment to identify disengagement. What do you do?', 'Apply your principles to this scenario: A line manager asks you to use AI to help them prepare for a difficult conversation with an underperforming employee. What do you do?'] }
      ],
      keyTakeaways: ['Personal principles for AI appropriateness should be grounded in your values about HR\'s purpose', 'Principles that you can articulate and defend are more robust than general instincts', 'Testing your principles against challenging scenarios reveals their strengths and limitations'],
      citations: ['CIPD (2023). Human-Centred AI in HR.', 'Accenture (2024). Responsible AI in HR.']
    }
  },

  {
    key: 'approp-quiz-1', title: 'AI Appropriateness Knowledge Check', subtitle: 'Test your judgement about when AI is and is not appropriate in HR',
    capability: 'appropriateness', modality: 'quiz', difficulty: 2, levelLabel: 'Developing', durationMins: 10,
    body: {
      overview: 'A knowledge check covering AI appropriateness judgements across a range of HR situations.',
      questions: [
        { id: 'q1', question: 'An employee has just been told they are being made redundant. Their line manager asks an AI tool to draft a message of support to send to the employee. What is the most appropriate response?', options: [{ id: 'a', text: 'Use the AI draft directly — it will be well-written and professional' }, { id: 'b', text: 'Use the AI draft as a starting point but personalise it significantly based on your knowledge of the employee' }, { id: 'c', text: 'Do not use AI for this message — write it yourself based on your knowledge of the employee and the situation' }, { id: 'd', text: 'Ask the employee if they would prefer an AI-generated or human-written message' }], correctAnswer: 'c', explanation: 'This is a high-sensitivity, high-complexity situation requiring genuine human empathy and knowledge of the specific person. An AI-generated message risks feeling impersonal and generic at a moment when the employee needs authentic human connection. The manager should write this themselves.', competency: 'AI appropriateness judgement' },
        { id: 'q2', question: 'Which of the following HR tasks is MOST appropriate for AI assistance?', options: [{ id: 'a', text: 'Conducting a disciplinary hearing' }, { id: 'b', text: 'Providing emotional support to an employee in crisis' }, { id: 'c', text: 'Drafting a template for a standard onboarding welcome email' }, { id: 'd', text: 'Making a final decision on a grievance investigation' }], correctAnswer: 'c', explanation: 'Drafting a standard onboarding template is low-sensitivity and low-complexity — AI is highly appropriate. Disciplinary hearings, crisis support, and grievance decisions are high-sensitivity and/or high-complexity, requiring human judgement, empathy, and accountability.', competency: 'AI appropriateness matrix' },
        { id: 'q3', question: 'A manager wants to use an AI tool to monitor employee email sentiment to identify disengagement early. What is the most important consideration?', options: [{ id: 'a', text: 'Whether the AI tool is accurate enough to be reliable' }, { id: 'b', text: 'Whether employees have been informed and consented to this monitoring, and whether it complies with privacy law' }, { id: 'c', text: 'Whether the cost of the tool is justified by the potential reduction in attrition' }, { id: 'd', text: 'Whether the tool has been used successfully by other organisations' }], correctAnswer: 'b', explanation: 'Employee monitoring raises fundamental privacy and consent issues. Under GDPR and the Employment Practices Code, employees must be informed about monitoring and it must be proportionate. Monitoring email content is highly intrusive and may not be proportionate for the purpose of identifying disengagement.', competency: 'Privacy and consent' }
      ],
      passingScore: 70
    }
  },

  // ─── CAPABILITY: workflow ─────────────────────────────────────────────────

  {
    key: 'workflow-tutorial-1', title: 'Mapping Your HR Workflows for AI Integration', subtitle: 'A systematic approach to identifying and implementing AI in HR processes',
    capability: 'workflow', modality: 'tutorial', difficulty: 1, levelLabel: 'Foundation', durationMins: 20,
    body: {
      overview: 'AI integration is most effective when it is systematic rather than ad hoc. This module teaches you how to map your HR workflows, identify the highest-value AI integration points, and design AI-augmented processes.',
      objectives: ['Map your top HR workflows using a structured process mapping approach', 'Identify the highest-value AI integration points', 'Design AI-augmented workflows that maintain appropriate human oversight', 'Create an AI integration roadmap for your HR function'],
      sections: [
        { title: 'Process Mapping for AI Integration', content: 'Before integrating AI into a workflow, understand it in detail. A simple process map captures:\n1. Steps: What are the discrete steps?\n2. Inputs: What information is needed at each step?\n3. Outputs: What does each step produce?\n4. Time: How long does each step take?\n5. Pain points: Where are the bottlenecks, errors, or frustrations?\n6. Decision points: Where are judgements made, and by whom?\n\nFor AI integration, focus on steps that are: time-consuming, repetitive, involve large amounts of text or data, or require synthesis of multiple inputs.', examples: ['Recruitment workflow map:\nStep 1: Receive job brief (30 min, pain point: incomplete information)\nStep 2: Write job description (60 min, pain point: time-consuming, multiple revisions)\nStep 3: Post to job boards (30 min, pain point: manual data entry)\nStep 4: Screen CVs (2-4 hours, pain point: volume, inconsistency)\nStep 5: Schedule interviews (45 min, pain point: diary management)\n\nHighest AI value: Steps 2 (JD drafting), 4 (CV screening with human review), 1 (brief structuring)'] },
        { title: 'Designing AI-Augmented Workflows', content: 'An AI-augmented workflow has three elements:\n\n1. **AI-assisted steps**: AI does the heavy lifting (drafting, summarising, analysing) and a human reviews and approves.\n2. **Human decision points**: Steps where human judgement is required and AI plays a supporting role at most.\n3. **Quality gates**: Checkpoints where output is reviewed before moving to the next step.\n\nKey design principle: AI handles volume and structure; humans handle judgement and accountability.', examples: ['AI-augmented performance review workflow:\n1. Manager completes brief notes on each team member (human)\n2. AI drafts performance review comments based on notes + objectives (AI-assisted)\n3. Manager reviews, edits, and personalises each review (human decision point)\n4. HR reviews for consistency and compliance (quality gate)\n5. Manager delivers review conversation (human)\n\nTime saving: Step 2 reduces from 3 hours to 45 minutes.'] }
      ],
      keyTakeaways: ['Systematic process mapping identifies the highest-value AI integration points', 'AI-augmented workflows have three elements: AI-assisted steps, human decision points, and quality gates', 'Start with the highest-value, lowest-risk integration point'],
      citations: ['Davenport, T. & Ronanki, R. (2018). Artificial Intelligence for the Real World. Harvard Business Review.', 'CIPD (2023). AI in HR Workflows: A Practical Guide.']
    }
  },

  {
    key: 'workflow-practical-1', title: 'Practical: Building an AI-Augmented Onboarding Workflow', subtitle: 'Design and document a complete AI-integrated onboarding process',
    capability: 'workflow', modality: 'practical', difficulty: 2, levelLabel: 'Developing', durationMins: 35,
    body: {
      overview: 'Onboarding is one of the highest-value AI integration opportunities in HR — it involves significant documentation, personalisation, and communication that AI can assist with at scale.',
      objectives: ['Map the current onboarding workflow and identify AI integration points', 'Design AI-assisted onboarding communications and documentation', 'Create a personalised onboarding plan template using AI', 'Identify the human touchpoints that must be preserved'],
      sections: [
        { title: 'The Onboarding Challenge', content: 'Research shows employees who experience structured onboarding are 69% more likely to remain for 3 years (SHRM, 2023). Yet most organisations struggle with: inconsistent experience, high administrative burden, generic communications, information overload, and slow time-to-productivity.\n\nAI can address consistency, administrative burden, and personalisation challenges while preserving the human connection that makes onboarding effective.' }
      ],
      exercises: [
        { title: 'Design Your AI-Augmented Onboarding Workflow', instruction: 'Design a complete AI-augmented onboarding workflow for a new HRBP joining your organisation. For each step: (1) describe the step, (2) identify whether it is AI-assisted, human, or a quality gate, (3) write the AI prompt you would use (if applicable), and (4) describe the human review required.', steps: ['Pre-arrival communications (welcome email, first day logistics, team introduction)', 'First day schedule and materials', '30-60-90 day plan', 'Stakeholder introduction messages', 'Training and development plan', 'Check-in communications at 1 week, 1 month, 3 months'], deliverable: 'A complete AI-augmented onboarding workflow document with prompts and review processes' }
      ],
      keyTakeaways: ['Onboarding is a high-value AI integration opportunity due to volume, repetition, and personalisation requirements', 'AI can address consistency and administrative burden while human touchpoints preserve relational elements', 'Measuring effectiveness (retention, time-to-productivity, satisfaction) is essential to validate the AI integration'],
      citations: ['SHRM (2023). Onboarding New Employees: Maximising Success.', 'Deloitte (2023). The Future of Onboarding: AI-Powered Personalisation.']
    }
  },

  {
    key: 'workflow-scenario-1', title: 'Scenario: Redesigning the Performance Review Cycle with AI', subtitle: 'Practise redesigning a core HR process to leverage AI effectively',
    capability: 'workflow', modality: 'scenario', difficulty: 3, levelLabel: 'Practitioner', durationMins: 35,
    body: {
      overview: 'Your organisation\'s annual performance review cycle is widely criticised as time-consuming, inconsistent, and not fit for purpose. You have been asked to redesign it with AI integration. Work through the redesign systematically.',
      objectives: ['Apply process mapping to a complex HR workflow redesign', 'Design AI integration points that add genuine value', 'Identify and preserve the human elements that make performance reviews effective', 'Develop a change management approach for AI-augmented processes'],
      scenario: { situation: 'Your 500-person organisation runs an annual performance review cycle that takes 3 months and involves: manager self-assessment, employee self-assessment, 360 feedback collection, calibration sessions, and final review conversations. HR spends 40% of their time managing the process. Managers spend an average of 8 hours per direct report. The quality of reviews is highly variable. You have been asked to redesign the process using AI to reduce time by 50% and improve quality.', constraints: ['The redesigned process must still include meaningful manager-employee conversations', 'All employees must receive written feedback', 'The process must be defensible for performance-related decisions (pay, promotion, PIP)', 'Employees must feel the process is fair and human'] },
      guidance: {
        aiIntegrationOpportunities: ['AI-assisted self-assessment prompts that guide employees to provide specific, evidence-based responses', 'AI analysis of 360 feedback to identify themes and patterns', 'AI-drafted manager review comments based on self-assessment and 360 themes', 'AI calibration support: flagging potential inconsistencies across managers', 'AI-generated development plan suggestions based on performance themes'],
        humanElementsToPreserve: ['Manager-employee review conversation (cannot be replaced)', 'Manager\'s final judgement on performance rating', 'Calibration discussion between managers', 'HR oversight of the process and decisions']
      },
      keyTakeaways: ['AI can significantly reduce the administrative burden of performance reviews while improving consistency', 'The manager-employee conversation is the irreplaceable human element — AI should free up time for it, not replace it', 'Change management is as important as process design — employees and managers need to trust the AI-augmented process'],
      citations: ['Deloitte (2023). Reinventing Performance Management. Deloitte Insights.', 'CIPD (2023). Performance Management: An Evidence Review. London: CIPD.']
    }
  },

  {
    key: 'workflow-reflection-1', title: 'Reflection: Your HR Function\'s AI Integration Readiness', subtitle: 'Assess your HR function\'s readiness for AI workflow integration',
    capability: 'workflow', modality: 'reflection', difficulty: 2, levelLabel: 'Developing', durationMins: 20,
    body: {
      overview: 'AI workflow integration requires more than just technology — it requires process maturity, change management capability, and organisational readiness. This reflection helps you assess where your HR function stands.',
      objectives: ['Assess your HR function\'s AI integration readiness across 4 dimensions', 'Identify the most important readiness gaps', 'Develop a prioritised readiness improvement plan'],
      reflectionPrompts: [
        { area: 'Process Maturity', questions: ['Are your core HR processes documented and consistently followed?', 'Do you have clear quality standards for key HR outputs?', 'Are your processes designed with efficiency in mind, or have they grown organically?'] },
        { area: 'Technology Readiness', questions: ['What AI tools does your organisation currently have access to?', 'Are there technical barriers to AI integration (data quality, system integration)?', 'What is your organisation\'s AI policy and how does it affect HR\'s ability to adopt tools?'] },
        { area: 'People Readiness', questions: ['How confident are your HR team members in using AI tools?', 'Is there resistance to AI integration in your team? What is driving it?', 'Who in your team could be an AI champion to support others?'] },
        { area: 'Governance Readiness', questions: ['Do you have the governance structures in place to adopt AI tools responsibly?', 'Is there a clear process for approving new AI tools?', 'Do you have the capability to monitor AI tool outcomes for bias and accuracy?'] }
      ],
      keyTakeaways: ['AI workflow integration readiness has four dimensions: process maturity, technology readiness, people readiness, and governance readiness', 'Most HR functions have gaps in at least two dimensions', 'Addressing readiness gaps before integrating AI reduces the risk of failed implementations'],
      citations: ['CIPD (2024). AI Readiness in HR: A Self-Assessment Framework.', 'Accenture (2023). Reinventing HR with Generative AI.']
    }
  },

  {
    key: 'workflow-quiz-1', title: 'AI Workflow Integration Knowledge Check', subtitle: 'Test your understanding of AI workflow integration principles',
    capability: 'workflow', modality: 'quiz', difficulty: 2, levelLabel: 'Developing', durationMins: 10,
    body: {
      overview: 'A knowledge check covering process mapping, AI integration design, change management, and workflow optimisation.',
      questions: [
        { id: 'q1', question: 'When designing an AI-augmented HR workflow, what is the most important principle?', options: [{ id: 'a', text: 'Automate as many steps as possible to maximise efficiency' }, { id: 'b', text: 'AI handles volume and structure; humans handle judgement and accountability' }, { id: 'c', text: 'Replace the most time-consuming steps with AI first' }, { id: 'd', text: 'Ensure AI is used in every step of the process' }], correctAnswer: 'b', explanation: 'The key design principle for AI-augmented workflows is that AI handles the volume and structural work (drafting, summarising, analysing) while humans retain judgement and accountability. This maximises efficiency while maintaining quality and compliance.', competency: 'Workflow design' },
        { id: 'q2', question: 'You are mapping your recruitment workflow and find that CV screening takes 4 hours per role. What is the most appropriate AI integration approach?', options: [{ id: 'a', text: 'Fully automate CV screening — AI can do it faster and more consistently' }, { id: 'b', text: 'Use AI to pre-screen CVs and produce a ranked shortlist, with a human reviewing the AI\'s decisions before proceeding' }, { id: 'c', text: 'Use AI to reject candidates automatically but have humans review the shortlisted candidates' }, { id: 'd', text: 'Do not use AI for CV screening — it is too high-risk' }], correctAnswer: 'b', explanation: 'AI-assisted CV screening with human review is the appropriate approach. AI can significantly reduce the time burden while human review ensures quality, catches AI errors, and maintains compliance with GDPR Article 22 (no solely automated decisions). Fully automated rejection without human review is not compliant.', competency: 'AI integration design' }
      ],
      passingScore: 70
    }
  },

  // ─── CAPABILITY: data_interpretation ─────────────────────────────────────

  {
    key: 'data-tutorial-1', title: 'Reading AI-Generated People Analytics: The CARE Framework', subtitle: 'How to interpret, validate, and act on AI workforce insights',
    capability: 'data_interpretation', modality: 'tutorial', difficulty: 1, levelLabel: 'Foundation', durationMins: 20,
    body: {
      overview: 'AI-powered people analytics platforms generate dashboards, predictions, and recommendations that HR professionals are increasingly expected to interpret and act on. This module gives you the critical skills to read these outputs intelligently.',
      objectives: ['Interpret common AI-generated people analytics outputs', 'Identify key assumptions and limitations of AI workforce models', 'Apply the CARE framework to evaluate AI-generated insights', 'Communicate AI-generated insights to non-technical stakeholders'],
      sections: [
        { title: 'Common AI People Analytics Outputs', content: '**Attrition risk scores**: Probability that an employee will leave within a defined period. Usually based on tenure, engagement scores, performance ratings, manager changes, and salary relative to market.\n\n**Engagement predictions**: Predicted engagement scores based on behavioural signals (meeting attendance, collaboration patterns) rather than survey data.\n\n**Performance predictions**: Predicted future performance based on historical data, skills assessments, and behavioural patterns.\n\n**Workforce planning models**: Projections of future headcount needs.\n\n**Pay equity analyses**: AI-generated analyses of pay gaps by gender, ethnicity, and other characteristics.', tips: ['Always ask: "What data was used to generate this insight, and what are its limitations?"', 'AI predictions are probabilities, not certainties — a 70% attrition risk means 30% of the time the employee stays.'] },
        { title: 'The CARE Framework', content: '**C — Correlation vs. Causation**: Does the AI identify a genuine causal relationship or just a correlation? Acting on a spurious correlation can waste resources or cause harm.\n\n**A — Assumptions**: What assumptions does the model make? Are they valid for your organisation?\n\n**R — Representativeness**: Is the training data representative of your workforce? Models trained on historical data may not account for recent changes.\n\n**E — Error rates**: What is the model\'s accuracy? What is the false positive rate? A model that is 80% accurate sounds good, but if it flags 100 employees and 20 are wrong, you may be taking unnecessary and potentially harmful actions.', examples: ['CARE analysis of an attrition risk model:\nC: Low engagement correlates with attrition — but low engagement may be caused by poor management, which should be addressed regardless.\nA: The model may assume factors driving attrition in US tech companies apply to your UK professional services firm.\nR: If your workforce has changed significantly post-pandemic, the model may not reflect current patterns.\nE: If the model has a 25% false positive rate, 3 of 12 "high risk" employees are not actually at risk.'] }
      ],
      keyTakeaways: ['AI people analytics outputs require critical evaluation before action', 'CARE (Correlation vs. causation, Assumptions, Representativeness, Error rates) provides a systematic evaluation approach', 'AI predictions are probabilities — always validate against your knowledge of specific employees'],
      citations: ['Bersin, J. (2023). The Big Reset: Rethinking People Analytics.', 'CIPD (2023). People Analytics: Driving Business Performance.']
    }
  },

  {
    key: 'data-practical-1', title: 'Practical: Interpreting a Workforce Analytics Dashboard', subtitle: 'Hands-on practice reading and acting on AI-generated workforce insights',
    capability: 'data_interpretation', modality: 'practical', difficulty: 2, levelLabel: 'Developing', durationMins: 30,
    body: {
      overview: 'Work through a realistic workforce analytics dashboard, interpreting AI-generated insights, identifying the questions you need to ask, and developing actionable recommendations.',
      objectives: ['Interpret a multi-metric workforce analytics dashboard', 'Apply the CARE framework to evaluate AI-generated insights', 'Identify the most important insights and their implications', 'Develop actionable recommendations based on the data'],
      sections: [
        { title: 'The Dashboard', content: 'You are the HRBP for a 250-person technology division. Your HR analytics platform has generated these Q3 insights:\n\n**Attrition**: 18% annualised (industry benchmark: 12%). AI flags 23 employees as high attrition risk (>65% probability of leaving in 6 months).\n\n**Engagement**: Overall score 62/100 (down from 71 last quarter). Lowest: "My manager supports my development" (48/100), "I have clear career progression" (44/100).\n\n**Performance**: 15% exceeds expectations, 65% meets, 20% needs improvement. AI predicts 8 employees will move from meets to needs improvement next cycle.\n\n**Pay equity**: Women earn 8.3% less than men at the same grade, controlling for performance and tenure. No statistically significant gaps by ethnicity.\n\n**Skills**: Critical gap in cloud architecture (32% of roles require it; 18% of employees have it). Predicted to constrain growth within 12 months.' }
      ],
      exercises: [
        { title: 'Dashboard Analysis Exercise', instruction: 'Produce a 1-page executive summary for your HR Director covering: (1) top 3 most urgent issues and why, (2) key questions to investigate further before acting, (3) recommended actions for each issue, and (4) concerns about data quality or model assumptions.', hint: 'Consider: Is the attrition rate driven by a specific team or manager? What is causing the engagement drop? Is the pay gap statistically significant and legally material? Is the skills gap a build, buy, or borrow problem?' }
      ],
      keyTakeaways: ['A workforce analytics dashboard contains multiple signals that must be prioritised and contextualised before action', 'Asking the right questions about data quality is as important as interpreting the numbers', 'Translating analytics insights into actionable recommendations is a core HR capability'],
      citations: ['Boudreau, J. & Ramstad, P. (2007). Beyond HR: The New Science of Human Capital.', 'CIPD (2023). People Analytics: From Insight to Action.']
    }
  },

  {
    key: 'data-case-study-1', title: 'Case Study: How IBM Used AI to Predict Employee Attrition', subtitle: 'Lessons from a pioneering people analytics implementation',
    capability: 'data_interpretation', modality: 'case_study', difficulty: 3, levelLabel: 'Practitioner', durationMins: 25,
    body: {
      overview: 'IBM\'s AI-powered attrition prediction model is one of the most cited examples of people analytics in practice. This case study examines how it worked, what it achieved, and the important lessons — including the ethical tensions — it raises.',
      objectives: ['Understand how a large-scale AI attrition prediction model was built and deployed', 'Evaluate the business outcomes and ethical implications', 'Apply lessons to your organisation\'s people analytics strategy', 'Identify governance requirements for predictive HR analytics'],
      sections: [
        { title: 'IBM\'s Predictive Attrition Model', content: 'IBM developed an AI model that could predict with 95% accuracy which employees were likely to leave within 6 months. The model used HR systems data, performance records, and skills assessments. IBM claimed the model saved approximately $300 million in retention costs.' },
        { title: 'The Ethical Tensions', content: '**Privacy**: Employees were not informed their data was being used to predict their likelihood of leaving.\n\n**Autonomy**: If a manager knows an employee is "high attrition risk", how does this affect how they treat that employee? Does it create a self-fulfilling prophecy?\n\n**Accuracy and false positives**: Even a 95% accurate model produces false positives. Targeted retention interventions for the 5% who are not actually at risk may feel intrusive.\n\n**Data use beyond original purpose**: Employee data collected for performance management is being used for a different purpose — this may not be consistent with original consent.', tips: ['Under GDPR, using employee data for a new purpose (attrition prediction) may require a new lawful basis and employee notification.'] },
        { title: 'Lessons for HR Professionals', content: '1. Predictive analytics can deliver significant business value — but only when the model is accurate, interventions are appropriate, and governance is robust.\n2. Transparency builds trust — IBM later moved to greater transparency with employees about data use.\n3. The intervention matters as much as the prediction — knowing an employee is at risk is only valuable if the intervention is appropriate.\n4. Governance is non-negotiable — predictive people analytics requires clear policies on data use, employee rights, and human oversight.\n5. Correlation is not causation — address root causes (management quality, career development, pay) rather than just targeting high-risk individuals.' }
      ],
      discussionQuestions: ['If you were implementing a similar model at your organisation, what governance safeguards would you put in place?', 'How would you communicate to employees that their data is being used to predict attrition risk?'],
      keyTakeaways: ['Predictive attrition modelling can deliver significant business value but requires robust governance and transparency', 'GDPR requires transparency with employees about data use for predictive analytics', 'The intervention strategy is as important as the prediction — addressing root causes is more effective than targeted retention'],
      citations: ['Gherson, D. (2019). How IBM Uses AI to Predict Employee Attrition. Harvard Business Review.', 'ICO (2023). Employee Monitoring: A Guide for Employers.', 'CIPD (2023). Ethical People Analytics.']
    }
  },

  {
    key: 'data-scenario-1', title: 'Scenario: Presenting AI Workforce Insights to the Board', subtitle: 'Practise translating complex AI analytics into board-level recommendations',
    capability: 'data_interpretation', modality: 'scenario', difficulty: 3, levelLabel: 'Practitioner', durationMins: 30,
    body: {
      overview: 'You have 15 minutes to present AI-generated workforce insights to your board. Work through the preparation and delivery of a compelling, credible, and actionable presentation.',
      objectives: ['Translate complex AI analytics into clear board-level insights', 'Apply the CARE framework to validate insights before presenting', 'Develop actionable recommendations with clear business impact', 'Handle challenging questions about AI model reliability'],
      scenario: { situation: 'Your HR analytics platform has generated a quarterly workforce intelligence report. You have been asked to present the key findings to the board in 15 minutes. The board includes the CEO, CFO, and several non-executive directors with varying levels of data literacy. You need to: (1) present the most important insights, (2) make clear recommendations, and (3) be prepared for challenging questions about the AI model\'s reliability.', keyInsights: ['Attrition is 6% above industry benchmark, costing an estimated £2.3m in replacement costs annually', 'Engagement has dropped 9 points in one quarter — the AI model predicts this will drive a further 3% increase in attrition if unaddressed', 'A pay equity analysis shows a statistically significant gender pay gap at senior levels that was not visible in the headline gender pay gap figure', 'A skills gap in AI and data literacy is predicted to be a strategic constraint within 18 months'] },
      guidance: {
        presentationStructure: ['Opening: The business case for workforce intelligence (30 seconds)', 'Top 3 insights with business impact (8 minutes)', 'Recommended actions with owners and timelines (4 minutes)', 'Confidence level in the data and next steps (2 minutes)', 'Questions'],
        challengingQuestions: [
          { question: 'How confident are you in these AI predictions?', suggestedResponse: 'The attrition prediction model has an 82% accuracy rate based on our historical data. This means we should treat the predictions as directional indicators rather than certainties. I have validated the key findings against our own knowledge of the business and they are consistent with what we are hearing from managers.' },
          { question: 'Is the pay equity gap legally material?', suggestedResponse: 'The analysis shows a statistically significant gap at senior levels that warrants further investigation. I have asked our employment lawyers to review the findings. I will have a more definitive answer within 2 weeks.' }
        ]
      },
      keyTakeaways: ['Board-level presentation of AI analytics requires translation from technical outputs to business impact', 'Acknowledging the limitations of AI models builds credibility rather than undermining it', 'Actionable recommendations with clear owners and timelines are more valuable than insights alone'],
      citations: ['Boudreau, J. (2023). Presenting People Analytics to the C-Suite. Harvard Business Review.', 'CIPD (2023). People Analytics: Communicating Insights to Senior Leaders.']
    }
  },

  {
    key: 'data-reflection-1', title: 'Reflection: Your Data Literacy Development', subtitle: 'Assess your current data literacy and plan your development',
    capability: 'data_interpretation', modality: 'reflection', difficulty: 1, levelLabel: 'Foundation', durationMins: 15,
    body: {
      overview: 'Effective interpretation of AI-generated people analytics requires a foundation of data literacy. This reflection helps you assess your current level and plan your development.',
      objectives: ['Honestly assess your current data literacy level', 'Identify the specific data skills most relevant to your HR role', 'Develop a personalised data literacy development plan'],
      reflectionPrompts: [
        { area: 'Current Capability', questions: ['How comfortable are you reading and interpreting data tables, charts, and dashboards?', 'Can you explain the difference between correlation and causation? Can you give an example from your HR work?', 'How confident are you in questioning the assumptions behind a data model?'] },
        { area: 'Gaps and Development Needs', questions: ['Which types of data do you find most challenging to interpret? (statistical significance, regression outputs, probability scores?)', 'Have you ever made a decision based on data that turned out to be misleading? What did you learn?', 'What data skills would most improve your effectiveness in your current role?'] },
        { area: 'Development Plan', questions: ['What is one data skill you will develop in the next 3 months?', 'What resources (courses, books, colleagues) will you use?', 'How will you practise your data skills in your day-to-day work?'] }
      ],
      keyTakeaways: ['Data literacy is a learnable skill — it develops with deliberate practice', 'The most important data skills for HR are: reading charts and dashboards, understanding correlation vs. causation, and questioning model assumptions', 'Practising data skills in your day-to-day work is more effective than formal training alone'],
      citations: ['Bersin, J. (2023). People Analytics: The Essential Guide. Bersin Research.', 'CIPD (2023). People Analytics Competency Framework. London: CIPD.']
    }
  },

  {
    key: 'data-quiz-1', title: 'AI Data Interpretation Knowledge Check', subtitle: 'Test your ability to interpret and evaluate AI-generated people analytics',
    capability: 'data_interpretation', modality: 'quiz', difficulty: 2, levelLabel: 'Developing', durationMins: 12,
    body: {
      overview: 'A knowledge check covering people analytics interpretation, the CARE framework, data quality, and communicating insights.',
      questions: [
        { id: 'q1', question: 'An AI model shows that employees who attend fewer than 3 team meetings per month are 3x more likely to leave within 6 months. What is the most important question to ask before acting on this insight?', options: [{ id: 'a', text: 'How many employees attend fewer than 3 meetings per month?' }, { id: 'b', text: 'Is low meeting attendance causing attrition, or is it a symptom of the same underlying issue (e.g., disengagement) that is causing attrition?' }, { id: 'c', text: 'Should we make meeting attendance mandatory?' }, { id: 'd', text: 'How accurate is the AI model overall?' }], correctAnswer: 'b', explanation: 'This is a classic correlation vs. causation question. Low meeting attendance and attrition may both be symptoms of disengagement or poor management — not causally related. Mandating meeting attendance would not address the underlying issue and could make things worse. The CARE framework\'s "C" (Correlation vs. Causation) is the critical lens here.', competency: 'Correlation vs. causation' },
        { id: 'q2', question: 'Your AI attrition model flags an employee as "high risk" (78% probability of leaving). You know this employee personally and they recently told you they are very happy in their role and planning to stay long-term. What should you do?', options: [{ id: 'a', text: 'Trust the AI model — it has more data than you do' }, { id: 'b', text: 'Ignore the AI model — you know the employee better than the model does' }, { id: 'c', text: 'Investigate why the model flagged this employee — the discrepancy may reveal a data quality issue or model limitation' }, { id: 'd', text: 'Implement a retention intervention for the employee regardless' }], correctAnswer: 'c', explanation: 'Discrepancies between AI predictions and your knowledge of the employee are valuable signals. They may indicate a data quality issue (e.g., incorrect data in the model), a model limitation (e.g., the model was not trained on employees like this one), or a change in circumstances the model has not captured. Investigating the discrepancy improves your understanding of the model\'s reliability.', competency: 'AI model validation' },
        { id: 'q3', question: 'A CFO asks you to explain why the AI predicts 15% attrition next year. What is the most appropriate response?', options: [{ id: 'a', text: 'The AI model calculated it based on all available data' }, { id: 'b', text: 'The model identified that our engagement scores, salary competitiveness, and manager effectiveness scores are below the benchmark levels associated with 15% attrition in similar organisations' }, { id: 'c', text: 'I trust the model — it has been accurate in the past' }, { id: 'd', text: 'I will need to ask the vendor to explain the model\'s methodology' }], correctAnswer: 'b', explanation: 'Board-level stakeholders need to understand the drivers behind AI predictions, not just the prediction itself. Option B translates the AI output into business terms that the CFO can understand and act on. This requires you to understand the model\'s key inputs and how they relate to the prediction.', competency: 'Communicating AI insights' }
      ],
      passingScore: 70
    }
  },

  // ─── Additional cross-capability advanced modules ─────────────────────────

  {
    key: 'exec-tutorial-adv-1', title: 'AI-Assisted Strategic HR: From Operational to Strategic Partner', subtitle: 'Using AI to elevate your contribution from operational to strategic',
    capability: 'execution', modality: 'tutorial', difficulty: 4, levelLabel: 'Advanced', durationMins: 25,
    body: {
      overview: 'The most significant opportunity AI offers HR professionals is not operational efficiency — it is the ability to free up time and cognitive capacity for strategic work. This module shows you how to use AI to shift your contribution from operational to strategic.',
      objectives: ['Identify the strategic HR work that AI frees up time for', 'Use AI to produce board-quality strategic HR analysis', 'Build AI-powered strategic HR dashboards and insights', 'Position yourself as a strategic partner using AI-enhanced capabilities'],
      sections: [
        { title: 'The Operational Trap', content: 'Research consistently shows that HR professionals spend 60-70% of their time on operational and administrative tasks, leaving only 30-40% for strategic work. AI has the potential to invert this ratio — but only if HR professionals actively redirect the time saved.\n\nThe operational trap: AI saves you 2 hours on a job description, but you fill that time with more operational tasks rather than strategic work. The strategic opportunity: AI saves you 2 hours on a job description, and you use that time to analyse workforce trends, develop a talent strategy, or coach a senior leader.' },
        { title: 'Strategic HR Analysis with AI', content: 'AI can dramatically accelerate strategic HR analysis:\n\n**Workforce planning**: Use AI to model multiple scenarios (growth, contraction, skills evolution) and identify the workforce implications of different business strategies.\n\n**Talent market intelligence**: Use AI to analyse job market data, competitor talent strategies, and skills availability to inform your talent strategy.\n\n**Organisational effectiveness**: Use AI to synthesise engagement data, performance data, and business outcomes to identify the organisational factors driving business performance.\n\n**HR ROI analysis**: Use AI to build the business case for HR investments by modelling the financial impact of talent programmes.' },
        { title: 'Positioning Yourself as a Strategic Partner', content: 'AI-enhanced strategic HR professionals are distinguished by:\n\n1. **Data-driven insights**: Using AI to generate and validate insights that business leaders cannot easily produce themselves.\n\n2. **Scenario planning**: Using AI to model the workforce implications of different business strategies before decisions are made.\n\n3. **Proactive intelligence**: Using AI to identify emerging talent risks and opportunities before they become urgent.\n\n4. **Business language**: Translating HR insights into business impact (revenue, cost, risk) rather than HR metrics.' }
      ],
      keyTakeaways: ['The strategic opportunity of AI in HR is not efficiency — it is the reallocation of time to strategic work', 'AI can accelerate strategic HR analysis: workforce planning, talent market intelligence, organisational effectiveness, HR ROI', 'Strategic HR professionals use AI to generate insights that business leaders cannot easily produce themselves'],
      citations: ['Ulrich, D. et al. (2017). Victory Through Organization. McGraw-Hill.', 'CIPD (2023). The Future of HR: Strategic People Management in the Age of AI.']
    }
  },

  {
    key: 'judge-tutorial-adv-1', title: 'Ethical AI in HR: Building a Personal Ethical Framework', subtitle: 'Develop a principled approach to ethical AI decision-making in HR',
    capability: 'judgement', modality: 'tutorial', difficulty: 4, levelLabel: 'Advanced', durationMins: 25,
    body: {
      overview: 'As AI becomes more embedded in HR practice, HR professionals face increasingly complex ethical questions. This module helps you build a personal ethical framework for navigating these questions with clarity and confidence.',
      objectives: ['Understand the key ethical frameworks relevant to AI in HR', 'Apply ethical reasoning to complex AI HR dilemmas', 'Develop a personal ethical framework for AI decision-making', 'Build the confidence to challenge unethical AI use in your organisation'],
      sections: [
        { title: 'Ethical Frameworks for AI in HR', content: 'Three ethical frameworks are particularly relevant to AI in HR:\n\n**Consequentialism**: Focus on outcomes — does the AI use produce the best outcomes for the most people? This framework is useful for evaluating the aggregate impact of AI tools but can justify harm to individuals if the aggregate benefit is large enough.\n\n**Deontology**: Focus on duties and rights — do employees have rights that AI use must respect, regardless of outcomes? This framework protects individual rights (privacy, dignity, non-discrimination) but can be inflexible in complex situations.\n\n**Virtue ethics**: Focus on character — what would a person of good character do in this situation? This framework is particularly useful for navigating situations where rules and outcomes are unclear.' },
        { title: 'Common Ethical Dilemmas in AI HR', content: 'Dilemma 1: Your organisation\'s AI recruitment tool improves diversity outcomes overall but produces worse outcomes for a specific protected group. Do you continue using it?\n\nDilemma 2: An AI wellbeing tool identifies an employee as being at high risk of a mental health crisis. The employee has not disclosed any mental health issues. Do you intervene?\n\nDilemma 3: An AI performance management tool predicts that an employee will underperform next year. Do you use this prediction in promotion decisions?\n\nDilemma 4: Your AI tool produces a recommendation that you believe is wrong, but your CEO wants to act on it. Do you push back?' },
        { title: 'Building Your Personal Ethical Framework', content: 'A personal ethical framework for AI in HR has three elements:\n\n1. **Core principles**: 3-5 principles that you will not compromise on (e.g., "I will not use AI to make decisions about individuals without meaningful human review", "I will always be transparent with employees about AI use").\n\n2. **Decision process**: A structured approach to ethical dilemmas (e.g., "Who is affected? What are their rights? What are the likely outcomes? What would a person of good character do?").\n\n3. **Escalation path**: A clear path for escalating ethical concerns when your personal judgement is not sufficient (e.g., HR Director, Legal, Ethics Committee).' }
      ],
      keyTakeaways: ['Three ethical frameworks — consequentialism, deontology, and virtue ethics — provide complementary lenses for AI HR dilemmas', 'A personal ethical framework (core principles, decision process, escalation path) provides clarity in complex situations', 'The confidence to challenge unethical AI use is a professional responsibility, not just a personal choice'],
      citations: ['Floridi, L. et al. (2018). An Ethical Framework for a Good AI Society. Minds and Machines.', 'CIPD (2023). Ethics and AI in HR. London: CIPD.', 'IEEE (2019). Ethically Aligned Design. IEEE Standards Association.']
    }
  },

  {
    key: 'gov-tutorial-adv-1', title: 'Building an AI Governance Framework for Your HR Function', subtitle: 'Design and implement a comprehensive AI governance framework',
    capability: 'governance', modality: 'tutorial', difficulty: 4, levelLabel: 'Advanced', durationMins: 30,
    body: {
      overview: 'This advanced module guides you through designing and implementing a comprehensive AI governance framework for your HR function — from policy development to monitoring and incident response.',
      objectives: ['Design a comprehensive AI governance framework for an HR function', 'Develop an AI policy that is practical, enforceable, and regularly reviewed', 'Build a monitoring and audit process for AI tool performance', 'Create an incident response process for AI governance failures'],
      sections: [
        { title: 'The AI Governance Framework Architecture', content: 'A comprehensive AI governance framework has 5 layers:\n\n1. **Policy layer**: Written policies covering AI usage, data handling, employee rights, and vendor management.\n2. **Process layer**: Documented processes for AI tool adoption, risk assessment, and human oversight.\n3. **People layer**: Roles, responsibilities, and capabilities for AI governance.\n4. **Technology layer**: Technical controls, audit logs, and monitoring systems.\n5. **Culture layer**: Values, norms, and behaviours that support responsible AI use.' },
        { title: 'Developing Your AI Policy', content: 'An effective HR AI policy covers:\n\n**Scope**: Which AI tools and use cases are covered?\n**Principles**: What values guide AI use in HR? (e.g., transparency, fairness, human oversight)\n**Approved uses**: What AI uses are approved without additional review?\n**Restricted uses**: What AI uses require additional approval or are prohibited?\n**Employee rights**: What rights do employees have regarding AI use?\n**Data handling**: How is employee data used in AI tools?\n**Vendor requirements**: What must vendors demonstrate before their tools are adopted?\n**Review cycle**: How often is the policy reviewed?' },
        { title: 'Monitoring and Audit', content: 'Ongoing monitoring of AI tools is essential:\n\n**Outcome monitoring**: Regularly analyse AI tool decisions by demographic group to detect bias.\n**Accuracy monitoring**: Track the accuracy of AI predictions against actual outcomes.\n**Compliance monitoring**: Ensure AI tools continue to meet regulatory requirements as regulations evolve.\n**Incident tracking**: Log all AI-related incidents and near-misses for learning and improvement.\n**Vendor audit**: Regularly review vendor compliance with contractual requirements and regulatory obligations.' }
      ],
      keyTakeaways: ['A comprehensive AI governance framework has 5 layers: policy, process, people, technology, and culture', 'An effective AI policy covers scope, principles, approved uses, restricted uses, employee rights, data handling, vendor requirements, and review cycle', 'Ongoing monitoring (outcome, accuracy, compliance, incident, vendor) is essential for maintaining governance effectiveness'],
      citations: ['CIPD (2024). AI Governance Framework for HR. London: CIPD.', 'ICO (2023). Accountability Framework for AI. Information Commissioner\'s Office.', 'Deloitte (2023). AI Governance: From Principles to Practice.']
    }
  },

  {
    key: 'data-tutorial-adv-1', title: 'Advanced People Analytics: Predictive Modelling and Causal Inference', subtitle: 'Moving beyond descriptive analytics to predictive and causal insights',
    capability: 'data_interpretation', modality: 'tutorial', difficulty: 4, levelLabel: 'Advanced', durationMins: 30,
    body: {
      overview: 'This advanced module moves beyond reading AI-generated dashboards to understanding the statistical foundations of predictive people analytics — enabling you to critically evaluate model quality, challenge vendor claims, and commission more sophisticated analyses.',
      objectives: ['Understand the statistical foundations of predictive people analytics models', 'Evaluate model quality using key metrics (accuracy, precision, recall, AUC)', 'Apply causal inference thinking to people analytics questions', 'Commission and critically evaluate advanced people analytics work'],
      sections: [
        { title: 'From Descriptive to Predictive Analytics', content: 'Descriptive analytics tells you what happened (e.g., attrition was 18% last year). Predictive analytics tells you what is likely to happen (e.g., 23 employees are likely to leave in the next 6 months). Prescriptive analytics tells you what to do about it (e.g., these 5 interventions are most likely to retain high-risk employees).\n\nMost HR analytics platforms now offer predictive capabilities. Understanding how these models work — and how to evaluate their quality — is an increasingly important HR skill.' },
        { title: 'Evaluating Model Quality', content: 'Key metrics for evaluating predictive model quality:\n\n**Accuracy**: The proportion of predictions that are correct. But accuracy alone is misleading — a model that predicts "no one will leave" in a 10% attrition environment is 90% accurate but useless.\n\n**Precision**: Of the employees flagged as high attrition risk, what proportion actually left? High precision means few false positives.\n\n**Recall**: Of the employees who actually left, what proportion were flagged as high risk? High recall means few false negatives.\n\n**AUC (Area Under the Curve)**: A single metric that captures the trade-off between precision and recall. AUC > 0.8 is generally considered good for HR applications.\n\n**Calibration**: Do the model\'s probability scores match actual outcomes? If the model says 70% probability, do 70% of those employees actually leave?' },
        { title: 'Causal Inference in People Analytics', content: 'The most valuable people analytics questions are causal: "Does our management development programme improve retention?" not just "Do employees with better managers have lower attrition?"\n\nCausal inference methods used in people analytics:\n\n**Randomised controlled trials (RCTs)**: Randomly assign employees to treatment and control groups. Gold standard but often impractical in HR.\n\n**Difference-in-differences**: Compare outcomes before and after an intervention for the treated group vs. a control group.\n\n**Regression discontinuity**: Exploit arbitrary cutoffs (e.g., employees who just met the threshold for a development programme vs. those who just missed it).\n\n**Instrumental variables**: Use a variable that affects treatment but not outcomes directly to estimate causal effects.' }
      ],
      keyTakeaways: ['Model quality should be evaluated using precision, recall, and AUC — not accuracy alone', 'Causal inference methods (RCTs, difference-in-differences) are needed to answer "does this intervention work?" questions', 'HR professionals who understand the statistical foundations of predictive analytics can commission better work and challenge vendor claims more effectively'],
      citations: ['Pearl, J. & Mackenzie, D. (2018). The Book of Why. Basic Books.', 'Angrist, J. & Pischke, J. (2014). Mastering Metrics. Princeton University Press.', 'CIPD (2023). Advanced People Analytics. London: CIPD.']
    }
  },

  {
    key: 'approp-tutorial-adv-1', title: 'The Future of AI in HR: Emerging Technologies and Their Implications', subtitle: 'Preparing for the next wave of AI capabilities in HR',
    capability: 'appropriateness', modality: 'tutorial', difficulty: 4, levelLabel: 'Advanced', durationMins: 25,
    body: {
      overview: 'AI capabilities are advancing rapidly. This module prepares you for the next wave of AI technologies in HR — from autonomous AI agents to emotion AI and generative video — and helps you develop a principled approach to evaluating their appropriateness.',
      objectives: ['Understand the emerging AI technologies most likely to impact HR in the next 3-5 years', 'Evaluate the appropriateness of emerging AI technologies using a principled framework', 'Anticipate the governance and ethical challenges these technologies will create', 'Position your HR function to adopt emerging technologies responsibly'],
      sections: [
        { title: 'Emerging AI Technologies in HR', content: '**Autonomous AI agents**: AI systems that can take actions (send emails, schedule meetings, update HR systems) without human instruction for each step. Implications: significant efficiency gains but also significant risks if the agent makes errors or takes inappropriate actions.\n\n**Emotion AI**: AI systems that claim to detect emotions from facial expressions, voice tone, or physiological signals. Implications: significant privacy and validity concerns — the science of emotion detection is contested.\n\n**Generative video**: AI that can generate realistic video of people saying things they did not say. Implications: significant risks for HR communications, training content, and evidence in investigations.\n\n**AI-powered coaching**: AI systems that provide personalised coaching conversations. Implications: can scale coaching access but raises questions about the quality and appropriateness of AI coaching for complex personal development needs.\n\n**Predictive skills mapping**: AI that maps employees\' current skills and predicts their future skills needs based on business strategy and market trends. Implications: powerful for workforce planning but requires high-quality skills data.' },
        { title: 'Evaluating Emerging Technologies', content: 'A principled framework for evaluating emerging AI technologies in HR:\n\n1. **Evidence base**: Is there robust evidence that the technology works as claimed? (Emotion AI has a weak evidence base; predictive skills mapping has a stronger one.)\n2. **Appropriateness**: Does the technology pass the AI Appropriateness Matrix test for the intended use case?\n3. **Governance readiness**: Does your organisation have the governance infrastructure to adopt this technology responsibly?\n4. **Employee trust**: Would employees trust this technology? Would they feel respected or surveilled?\n5. **Regulatory compliance**: Does the technology comply with current and anticipated regulations?' }
      ],
      keyTakeaways: ['Emerging AI technologies (autonomous agents, emotion AI, generative video, AI coaching, predictive skills mapping) will significantly impact HR in the next 3-5 years', 'A principled evaluation framework (evidence base, appropriateness, governance readiness, employee trust, regulatory compliance) is essential for responsible adoption', 'HR professionals who anticipate and shape the adoption of emerging AI technologies will be more effective strategic partners'],
      citations: ['Gartner (2024). Emerging Technologies in HR: A Hype Cycle Analysis.', 'CIPD (2024). The Future of AI in HR. London: CIPD.', 'MIT Technology Review (2023). The Next Wave of AI in the Workplace.']
    }
  },

  {
    key: 'workflow-tutorial-adv-1', title: 'AI-Powered HR Operations: Building a Centre of Excellence', subtitle: 'Design and lead an HR AI Centre of Excellence',
    capability: 'workflow', modality: 'tutorial', difficulty: 4, levelLabel: 'Advanced', durationMins: 30,
    body: {
      overview: 'As AI becomes embedded in HR operations, organisations need a structured approach to managing AI capability, governance, and continuous improvement. This module guides you through building an HR AI Centre of Excellence (CoE).',
      objectives: ['Understand the role and structure of an HR AI Centre of Excellence', 'Design the governance, capability, and operational model for an HR AI CoE', 'Build the business case for an HR AI CoE', 'Lead the change management required to embed AI in HR operations'],
      sections: [
        { title: 'What Is an HR AI Centre of Excellence?', content: 'An HR AI CoE is a cross-functional team that:\n- Manages the portfolio of AI tools used in HR\n- Develops and maintains AI governance frameworks\n- Builds AI capability across the HR function\n- Drives continuous improvement in AI-augmented HR processes\n- Acts as the interface between HR and technology teams\n\nThe CoE is not a separate team that "does AI" for HR — it is a capability hub that enables the entire HR function to use AI effectively and responsibly.' },
        { title: 'CoE Structure and Governance', content: 'A typical HR AI CoE has:\n\n**Core team**: 2-4 people with expertise in AI tools, data analytics, HR processes, and change management.\n\n**Extended network**: AI champions in each HR sub-function (recruitment, L&D, ER, reward, etc.) who are the first point of contact for AI questions in their area.\n\n**Governance board**: Senior HR leaders who approve new AI tool adoptions, set AI policy, and monitor AI performance.\n\n**External partnerships**: Relationships with technology vendors, academic institutions, and professional bodies (CIPD, ICO) to stay current with AI developments.' },
        { title: 'Building the Business Case', content: 'The business case for an HR AI CoE should include:\n\n**Efficiency gains**: Quantify the time savings from AI-augmented HR processes (e.g., 40% reduction in time spent on CV screening, 50% reduction in performance review preparation time).\n\n**Quality improvements**: Quantify the quality improvements from consistent, AI-augmented HR processes (e.g., improved diversity in shortlists, more consistent performance reviews).\n\n**Risk reduction**: Quantify the risk reduction from improved AI governance (e.g., reduced risk of GDPR breaches, reduced risk of discrimination claims).\n\n**Strategic capability**: Articulate the strategic value of having a more data-driven, AI-enabled HR function (e.g., better workforce planning, more effective talent management).' }
      ],
      keyTakeaways: ['An HR AI CoE is a capability hub that enables the entire HR function to use AI effectively and responsibly', 'The CoE structure includes a core team, extended network, governance board, and external partnerships', 'The business case for an HR AI CoE should quantify efficiency gains, quality improvements, risk reduction, and strategic capability'],
      citations: ['Deloitte (2023). Building an AI Centre of Excellence. Deloitte Insights.', 'CIPD (2024). HR AI Centre of Excellence: A Practical Guide. London: CIPD.', 'McKinsey (2023). Scaling AI in HR. McKinsey & Company.']
    }
  }

];

// ─── Insert modules ───────────────────────────────────────────────────────────

console.log(`Inserting ${modules.length} modules...`);

let inserted = 0;
let skipped = 0;

for (const mod of modules) {
  const [existing] = await db.query('SELECT id FROM learning_modules WHERE `key` = ?', [mod.key]);
  if (existing.length > 0) {
    skipped++;
    continue;
  }

  await db.query(
    `INSERT INTO learning_modules (id, \`key\`, title, subtitle, capability, modality, difficulty, level_label, duration_mins, estimated_reading_mins, status, body_json, metadata_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, '{}', ?, ?)`,
    [
      id(),
      mod.key,
      mod.title,
      mod.subtitle,
      mod.capability,
      mod.modality,
      mod.difficulty,
      mod.levelLabel,
      mod.durationMins,
      mod.estimatedReadingMins || Math.round(mod.durationMins * 0.7),
      JSON.stringify(mod.body),
      now,
      now
    ]
  );
  inserted++;
}

console.log(`Done. Inserted: ${inserted}, Skipped (already exist): ${skipped}`);

// ─── Verify ───────────────────────────────────────────────────────────────────
const [counts] = await db.query(`
  SELECT capability, modality, COUNT(*) as n
  FROM learning_modules
  GROUP BY capability, modality
  ORDER BY capability, modality
`);
console.log('\nModule breakdown:');
for (const row of counts) console.log(`  ${row.capability} / ${row.modality}: ${row.n}`);

await db.end();
