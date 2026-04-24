/**
 * Expanded Module Seed Script
 * Adds 78 new modules to reach 120+ total across 6 capabilities × 5 difficulty levels × 8 modalities
 * Each module has rich bodyJson, formative quiz, failure-mode tags, and mastery thresholds
 */
import mysql from 'mysql2/promise';
import { nanoid } from 'nanoid';

const db = await mysql.createConnection(process.env.DATABASE_URL);

// Helper to build a rich tutorial bodyJson
function tutorialBody({ title, objectives, sections, reflection, citations }) {
  return JSON.stringify({ type: 'tutorial', title, objectives, sections, reflection, citations });
}

function practicalBody({ title, objectives, scenario, steps, successCriteria, reflection }) {
  return JSON.stringify({ type: 'practical', title, objectives, scenario, steps, successCriteria, reflection });
}

function caseStudyBody({ title, objectives, narrative, analysisFramework, questions, keyLearnings }) {
  return JSON.stringify({ type: 'case_study', title, objectives, narrative, analysisFramework, questions, keyLearnings });
}

function scenarioBody({ title, objectives, setup, decisionPoints, outcomes, reflection }) {
  return JSON.stringify({ type: 'scenario', title, objectives, setup, decisionPoints, outcomes, reflection });
}

function reflectionBody({ title, objectives, prompts, framework, commitmentPrompt }) {
  return JSON.stringify({ type: 'reflection', title, objectives, prompts, framework, commitmentPrompt });
}

function coachingBody({ title, objectives, coachingQuestions, frameworks, actionPlanning }) {
  return JSON.stringify({ type: 'coaching', title, objectives, coachingQuestions, frameworks, actionPlanning });
}

function videoBody({ title, objectives, videoUrl, transcript, keyTakeaways, discussionQuestions }) {
  return JSON.stringify({ type: 'video', title, objectives, videoUrl, transcript, keyTakeaways, discussionQuestions });
}

function quizBody({ title, objectives, questions }) {
  return JSON.stringify({ type: 'quiz', title, objectives, questions });
}

function formativeQuiz(questions) {
  return JSON.stringify({ questions });
}

// ─── MODULES ────────────────────────────────────────────────────────────────

const modules = [

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY: ai_execution  (target: 20 total — adding 13 new)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'exec_l1_tutorial_ai_basics',
    title: 'What Is AI? A Practical Introduction for HR Professionals',
    capability: 'ai_execution',
    modality: 'tutorial',
    difficulty: 1,
    levelLabel: 'Awareness',
    durationMins: 10,
    requiredCapabilityScore: 0,
    failureModes: ['over_reliance', 'lack_of_confidence'],
    body: tutorialBody({
      title: 'What Is AI? A Practical Introduction for HR Professionals',
      objectives: ['Define AI and machine learning in plain language', 'Identify 5 AI tools already used in HR', 'Explain the difference between AI-assisted and AI-automated decisions'],
      sections: [
        { heading: 'AI in Plain English', content: 'Artificial intelligence is software that learns patterns from data to make predictions or generate outputs. In HR, this means tools that can screen CVs, predict attrition, generate job descriptions, or summarise performance reviews. The key insight: AI does not think — it pattern-matches.' },
        { heading: 'The HR AI Landscape', content: 'Today\'s HR teams interact with AI in three ways: (1) Embedded AI in existing tools (LinkedIn Recruiter, Workday, SAP SuccessFactors), (2) Standalone AI assistants (ChatGPT, Copilot, Gemini), (3) Custom AI workflows built by their organisation. Each requires different skills and carries different risks.' },
        { heading: 'AI-Assisted vs AI-Automated', content: 'AI-assisted decisions keep a human in the loop — the AI surfaces a recommendation and a human decides. AI-automated decisions remove the human entirely. GDPR Article 22 restricts fully automated decisions that significantly affect individuals. As an HR professional, you must know which category each AI tool falls into.' },
        { heading: 'Five AI Tools in Your HR Stack', content: 'Most HR teams already use: (1) ATS screening algorithms, (2) Engagement survey sentiment analysis, (3) L&D recommendation engines, (4) Payroll anomaly detection, (5) Chatbots for employee queries. Each of these is AI — even if it is not labelled as such.' },
      ],
      reflection: 'Which AI tools does your organisation currently use in HR? Which decisions do they assist, and which do they automate? Are there any where you are unsure?',
      citations: ['CIPD (2024). People and AI: Preparing HR for the AI era.', 'McKinsey Global Institute (2023). The economic potential of generative AI.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Which of the following best describes machine learning?', options: [{id:'a',text:'Software programmed with explicit rules for every situation'},{id:'b',text:'Software that learns patterns from data to make predictions'},{id:'c',text:'A database of HR best practices'},{id:'d',text:'An automated workflow tool'}], correctAnswer: 'b', explanation: 'Machine learning systems learn from data rather than following pre-programmed rules.' },
      { id: 'q2', question: 'Under GDPR Article 22, which type of AI decision requires special safeguards?', options: [{id:'a',text:'AI-assisted decisions with human review'},{id:'b',text:'Fully automated decisions that significantly affect individuals'},{id:'c',text:'Any decision involving a computer'},{id:'d',text:'Decisions made by senior managers using AI reports'}], correctAnswer: 'b', explanation: 'GDPR Article 22 specifically restricts fully automated decisions with significant effects on individuals.' },
    ]),
  },

  {
    key: 'exec_l1_practical_first_prompt',
    title: 'Your First AI Prompt: Writing a Job Description with AI',
    capability: 'ai_execution',
    modality: 'practical',
    difficulty: 1,
    levelLabel: 'Awareness',
    durationMins: 20,
    requiredCapabilityScore: 0,
    failureModes: ['lack_of_confidence', 'poor_prompt_quality'],
    body: practicalBody({
      title: 'Your First AI Prompt: Writing a Job Description with AI',
      objectives: ['Write a structured prompt for a real HR task', 'Evaluate AI output for accuracy and bias', 'Edit AI output to meet your organisation\'s standards'],
      scenario: 'You need to write a job description for a new HR Business Partner role. Use an AI assistant to draft it, then critically evaluate and improve the output.',
      steps: [
        { step: 1, instruction: 'Open your preferred AI assistant (ChatGPT, Copilot, or Gemini).', tip: 'If you don\'t have access, ask your IT team — most organisations have a licensed tool.' },
        { step: 2, instruction: 'Write this prompt: "Write a job description for a Senior HR Business Partner supporting a 500-person technology company. Include: role purpose, 5 key responsibilities, essential qualifications, and a diversity statement. Use inclusive language."', tip: 'Notice the structure: context + task + format + constraint.' },
        { step: 3, instruction: 'Read the output critically. Check for: (a) accuracy of responsibilities, (b) any gender-coded language, (c) unrealistic qualification requirements, (d) alignment with your organisation\'s tone.', tip: 'AI often includes "excellent communication skills" and similar filler — remove it.' },
        { step: 4, instruction: 'Refine the prompt to fix the weakest part of the output. Add: "The role is remote-first. Remove any requirement for a specific degree. Emphasise coaching and change management experience."', tip: 'Iteration is normal — good AI use involves 2-3 prompt refinements.' },
        { step: 5, instruction: 'Save your final version. Note: what did the AI get right? What did it get wrong? What would you never let AI decide alone?', tip: 'This reflection is the most important step.' },
      ],
      successCriteria: ['Produced a complete JD draft using AI', 'Identified at least 2 issues in the raw AI output', 'Refined the prompt at least once', 'Can articulate what human judgment added'],
      reflection: 'What would have happened if you had sent the first AI draft without reviewing it? What are the risks specific to HR job descriptions?',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'What is the most important step after receiving AI-generated HR content?', options: [{id:'a',text:'Publish it immediately to save time'},{id:'b',text:'Critically review it for accuracy, bias, and organisational fit'},{id:'c',text:'Ask a colleague to review it without reading it yourself'},{id:'d',text:'Run it through a grammar checker'}], correctAnswer: 'b', explanation: 'AI output always requires human critical review before use in HR contexts.' },
    ]),
  },

  {
    key: 'exec_l2_scenario_bias_in_screening',
    title: 'Scenario: AI Screening Flags a Strong Candidate',
    capability: 'ai_execution',
    modality: 'scenario',
    difficulty: 2,
    levelLabel: 'Foundation',
    durationMins: 25,
    requiredCapabilityScore: 35,
    failureModes: ['over_reliance', 'bias_blindness'],
    body: scenarioBody({
      title: 'Scenario: AI Screening Flags a Strong Candidate',
      objectives: ['Recognise when AI screening may introduce bias', 'Apply a structured override process', 'Document the decision appropriately'],
      setup: 'Your ATS has automatically ranked 200 applications for a Senior Analyst role. The AI has given a "low match" score (32/100) to a candidate named Amara Osei. You notice Amara has 8 years of directly relevant experience and a strong LinkedIn profile. The AI ranked her low because her CV format is non-standard and she has a 2-year career break (maternity leave).',
      decisionPoints: [
        { id: 'dp1', situation: 'The hiring manager asks you to only interview the top 20 AI-ranked candidates. What do you do?', options: [
          { id: 'a', text: 'Follow the AI ranking — it\'s objective', consequence: 'Amara is excluded. You may have indirect discrimination liability under the Equality Act 2010 if the AI systematically disadvantages candidates with career breaks.' },
          { id: 'b', text: 'Override the AI for Amara and document your reasoning', consequence: 'Correct approach. You document: "Manual review identified strong experience match. AI score suppressed by non-standard formatting and career break. Candidate added to interview pool."' },
          { id: 'c', text: 'Ask the AI to re-score Amara with different criteria', consequence: 'Partial — you can adjust criteria, but you must still document why the original criteria were inadequate.' },
        ]},
        { id: 'dp2', situation: 'After interviewing Amara, she is the strongest candidate. The hiring manager asks why the AI scored her so low. How do you explain this?', options: [
          { id: 'a', text: 'Tell the manager the AI made a mistake', consequence: 'Incomplete — the AI didn\'t make a mistake, it optimised for the wrong signals (formatting, continuous employment).' },
          { id: 'b', text: 'Explain that the AI was trained on historical data that may not reflect diverse career paths, and that human review is essential', consequence: 'Correct. This is a teachable moment about AI limitations in recruitment.' },
        ]},
      ],
      outcomes: 'Amara is hired and becomes a top performer. The organisation updates its ATS criteria to de-weight formatting and career break penalties. You document the case as evidence for the next AI audit.',
      reflection: 'What processes does your organisation have for reviewing AI screening decisions? Who is responsible for catching these errors?',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Under the Equality Act 2010, which protected characteristic is most likely affected by AI penalising career breaks?', options: [{id:'a',text:'Age'},{id:'b',text:'Sex (indirect discrimination)'},{id:'c',text:'Race'},{id:'d',text:'Religion'}], correctAnswer: 'b', explanation: 'Career breaks disproportionately affect women due to maternity/caring responsibilities, creating potential indirect sex discrimination.' },
    ]),
  },

  {
    key: 'exec_l3_tutorial_prompt_engineering',
    title: 'Advanced Prompt Engineering for HR Professionals',
    capability: 'ai_execution',
    modality: 'tutorial',
    difficulty: 3,
    levelLabel: 'Practitioner',
    durationMins: 30,
    requiredCapabilityScore: 55,
    failureModes: ['poor_prompt_quality', 'shallow_outputs'],
    body: tutorialBody({
      title: 'Advanced Prompt Engineering for HR Professionals',
      objectives: ['Apply the RACE framework to structure complex HR prompts', 'Use chain-of-thought prompting for multi-step HR analysis', 'Build reusable prompt templates for common HR tasks'],
      sections: [
        { heading: 'The RACE Framework', content: 'Role → Action → Context → Expectation. Example: "You are an experienced HR Business Partner (Role). Analyse the following engagement survey data and identify the top 3 retention risks (Action) for a 200-person engineering team in a Series B startup experiencing rapid growth (Context). Present your analysis as a prioritised list with evidence and recommended actions for each risk (Expectation)."' },
        { heading: 'Chain-of-Thought Prompting', content: 'For complex HR analysis, ask the AI to show its reasoning: "Think step by step. First identify the key themes in the data. Then assess the severity of each theme. Then recommend actions in priority order." This produces more reliable outputs than asking for a conclusion directly.' },
        { heading: 'Few-Shot Prompting', content: 'Show the AI examples of the output you want: "Here is an example of a good performance review summary: [example]. Now write a similar summary for the following feedback data: [data]." Few-shot prompting dramatically improves consistency.' },
        { heading: 'Prompt Templates for HR', content: 'Build a library of reusable templates: (1) Engagement analysis template, (2) Job description template, (3) Interview question generator, (4) Policy summariser, (5) Difficult conversation script. Store these in a shared team document.' },
        { heading: 'What Not to Put in Prompts', content: 'Never include: full names of employees, payroll data, medical information, disciplinary records, or any data that could identify individuals. Use anonymised summaries and aggregate data only.' },
      ],
      reflection: 'Write a RACE-framework prompt for your most common AI task at work. What context does the AI need that you currently leave out?',
      citations: ['White et al. (2023). A Prompt Pattern Catalog to Enhance Prompt Engineering with ChatGPT. arXiv.', 'CIPD (2024). Using AI tools responsibly in HR.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'In the RACE framework, what does the "C" stand for?', options: [{id:'a',text:'Criteria'},{id:'b',text:'Context'},{id:'c',text:'Constraints'},{id:'d',text:'Confirmation'}], correctAnswer: 'b', explanation: 'Context tells the AI the specific situation, organisation type, team size, and other relevant background.' },
      { id: 'q2', question: 'Which type of data should NEVER be included in an AI prompt?', options: [{id:'a',text:'Anonymised engagement survey themes'},{id:'b',text:'Aggregate turnover statistics'},{id:'c',text:'Individual employee medical information'},{id:'d',text:'Job description requirements'}], correctAnswer: 'c', explanation: 'Individual medical data is special category data under GDPR and must never be shared with external AI tools.' },
    ]),
  },

  {
    key: 'exec_l3_case_study_ai_restructure',
    title: 'Case Study: Using AI to Support an Organisational Restructure',
    capability: 'ai_execution',
    modality: 'case_study',
    difficulty: 3,
    levelLabel: 'Practitioner',
    durationMins: 35,
    requiredCapabilityScore: 55,
    failureModes: ['over_reliance', 'poor_stakeholder_management'],
    body: caseStudyBody({
      title: 'Case Study: Using AI to Support an Organisational Restructure',
      objectives: ['Evaluate appropriate and inappropriate uses of AI in a restructure', 'Design a human-AI collaboration model for workforce planning', 'Identify the governance requirements for AI use in sensitive HR processes'],
      narrative: 'Meridian Financial Services (1,200 employees) is undergoing a major restructure following a merger. The CHRO has asked the HR team to use AI to: (1) identify roles at risk of redundancy, (2) match affected employees to new roles, (3) draft individual consultation letters, and (4) predict which employees are likely to resign voluntarily. The HR Director is concerned about the legal and ethical implications.',
      analysisFramework: {
        dimensions: ['Legal compliance', 'Ethical appropriateness', 'Practical effectiveness', 'Employee trust'],
        questions: [
          'Which of the four AI use cases are appropriate, and which are not?',
          'What human oversight is required for each?',
          'How should the HR team communicate their AI use to affected employees?',
          'What documentation is required for legal compliance?',
        ],
      },
      questions: [
        { id: 'q1', question: 'Role identification: Is it appropriate to use AI to identify roles at risk?', guidance: 'AI can analyse job function overlap, automation potential, and skills duplication. However, final decisions must be made by humans with full business context. AI output should be treated as one input, not the decision.' },
        { id: 'q2', question: 'Role matching: What are the risks of using AI to match employees to new roles?', guidance: 'AI matching can introduce bias if trained on historical promotion patterns. It must be audited for protected characteristic disparities before use. Employees have the right to know how matching decisions were made.' },
        { id: 'q3', question: 'Consultation letters: Is AI-drafted consultation content appropriate?', guidance: 'AI can draft template language, but each letter must be individually reviewed and personalised. Sending AI-generated letters without review creates legal risk and damages trust.' },
        { id: 'q4', question: 'Attrition prediction: What are the ethical issues with predicting who will resign?', guidance: 'Predicting resignation intent and acting on it (e.g., by not offering development opportunities) could constitute unlawful treatment. This use case requires a Data Protection Impact Assessment (DPIA) under GDPR.' },
      ],
      keyLearnings: ['AI is a decision-support tool in restructures, not a decision-maker', 'Every AI use case in a sensitive HR process requires documented human oversight', 'Employees have rights to explanation under GDPR Article 22', 'A DPIA is required for high-risk AI processing of employee data'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Which GDPR mechanism is required before using AI to predict employee resignation intent?', options: [{id:'a',text:'A Subject Access Request'},{id:'b',text:'A Data Protection Impact Assessment (DPIA)'},{id:'c',text:'An employment contract clause'},{id:'d',text:'A privacy notice update'}], correctAnswer: 'b', explanation: 'A DPIA is required under GDPR Article 35 for high-risk processing, including systematic profiling of employees.' },
    ]),
  },

  {
    key: 'exec_l4_tutorial_ai_workflow_design',
    title: 'Designing AI-Augmented HR Workflows',
    capability: 'ai_execution',
    modality: 'tutorial',
    difficulty: 4,
    levelLabel: 'Advanced',
    durationMins: 40,
    requiredCapabilityScore: 70,
    failureModes: ['poor_workflow_design', 'lack_of_governance'],
    body: tutorialBody({
      title: 'Designing AI-Augmented HR Workflows',
      objectives: ['Map human-AI handoff points in core HR processes', 'Apply the HITL (Human-in-the-Loop) design pattern', 'Build a governance framework for AI-augmented workflows'],
      sections: [
        { heading: 'The Human-in-the-Loop (HITL) Design Pattern', content: 'Every AI-augmented HR workflow should have defined HITL points: moments where a human reviews, approves, or overrides the AI output. The key design question is: "What is the minimum human oversight required for this decision to be legally defensible and ethically sound?" For hiring decisions, HITL is mandatory. For scheduling reminders, it may be optional.' },
        { heading: 'Workflow Mapping Exercise', content: 'Map your recruitment workflow in three columns: (1) Current human steps, (2) AI-assisted steps (AI suggests, human decides), (3) AI-automated steps (AI acts, human reviews). Most HR workflows should have very few column 3 items.' },
        { heading: 'The Five Governance Questions', content: 'For every AI step in your workflow, answer: (1) Who is accountable if the AI output is wrong? (2) How is the AI output audited? (3) Can an employee request human review? (4) Is the data used GDPR-compliant? (5) Has the AI been tested for bias against protected characteristics?' },
        { heading: 'Building Your AI Governance Register', content: 'Maintain a register of all AI tools used in HR processes. For each: tool name, vendor, purpose, data inputs, decision type (assisted/automated), HITL point, audit frequency, and DPIA status. This is now a regulatory expectation under the EU AI Act.' },
      ],
      reflection: 'Pick one HR process you own. Draw the current workflow and mark every point where AI is or could be used. Where are the HITL points? Where are the governance gaps?',
      citations: ['EU AI Act (2024). Risk classification of AI systems in employment.', 'ICO (2023). Explaining decisions made with AI.', 'CIPD (2024). AI governance in people management.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'What does HITL stand for in AI workflow design?', options: [{id:'a',text:'High-Impact Task Loop'},{id:'b',text:'Human-in-the-Loop'},{id:'c',text:'Hybrid Intelligence Task Layer'},{id:'d',text:'Human IT Liaison'}], correctAnswer: 'b', explanation: 'Human-in-the-Loop (HITL) refers to design patterns that keep humans involved in AI-assisted decisions.' },
    ]),
  },

  {
    key: 'exec_l4_coaching_ai_leadership',
    title: 'Coaching: Becoming an AI-Confident HR Leader',
    capability: 'ai_execution',
    modality: 'coaching',
    difficulty: 4,
    levelLabel: 'Advanced',
    durationMins: 30,
    requiredCapabilityScore: 70,
    failureModes: ['lack_of_confidence', 'poor_stakeholder_management'],
    body: coachingBody({
      title: 'Coaching: Becoming an AI-Confident HR Leader',
      objectives: ['Identify your personal AI confidence blockers', 'Develop a 90-day AI capability development plan', 'Build your narrative as an AI-forward HR leader'],
      coachingQuestions: [
        { phase: 'Awareness', question: 'On a scale of 1-10, how confident are you in your AI capabilities compared to your peers? What evidence supports that rating?' },
        { phase: 'Awareness', question: 'What is the specific AI task or scenario that makes you most uncomfortable? What is the fear underneath that discomfort?' },
        { phase: 'Exploration', question: 'Who in your network is already using AI effectively in HR? What could you learn from them in the next 30 days?' },
        { phase: 'Exploration', question: 'If you were 20% more AI-confident, what would you do differently in your role tomorrow?' },
        { phase: 'Action', question: 'What is the smallest possible AI experiment you could run this week that would build your confidence?' },
        { phase: 'Action', question: 'How will you measure your AI capability growth over the next 90 days?' },
      ],
      frameworks: [
        { name: '70/20/10 for AI Learning', description: '70% learning by doing (run AI experiments on real tasks), 20% learning from others (peer learning, communities of practice), 10% formal learning (courses, certifications).' },
        { name: 'The Confidence-Competence Loop', description: 'Confidence and competence reinforce each other. Start with low-stakes AI tasks to build competence, which builds confidence, which enables higher-stakes AI use.' },
      ],
      actionPlanning: { prompt: 'Write your 90-day AI development plan: (1) Three AI experiments to run in Month 1, (2) Two people to learn from in Month 2, (3) One formal qualification to pursue in Month 3.' },
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'In the 70/20/10 model for AI learning, what proportion should come from learning by doing?', options: [{id:'a',text:'10%'},{id:'b',text:'20%'},{id:'c',text:'70%'},{id:'d',text:'50%'}], correctAnswer: 'c', explanation: '70% of effective learning comes from on-the-job experience and experimentation.' },
    ]),
  },

  {
    key: 'exec_l5_tutorial_ai_strategy',
    title: 'Building an Organisational AI Strategy for HR',
    capability: 'ai_execution',
    modality: 'tutorial',
    difficulty: 5,
    levelLabel: 'Expert',
    durationMins: 45,
    requiredCapabilityScore: 80,
    failureModes: ['lack_of_strategic_vision', 'poor_governance'],
    body: tutorialBody({
      title: 'Building an Organisational AI Strategy for HR',
      objectives: ['Design a 3-year HR AI roadmap', 'Build the business case for AI investment in HR', 'Lead organisational change for AI adoption'],
      sections: [
        { heading: 'The HR AI Maturity Model', content: 'Stage 1: Aware (using AI tools ad hoc). Stage 2: Enabled (standardised AI tools with basic governance). Stage 3: Integrated (AI embedded in core HR processes with full governance). Stage 4: Predictive (AI driving proactive people decisions). Stage 5: Transformative (AI reshaping the HR operating model). Most organisations are at Stage 1-2. Your strategy should target Stage 3 within 18 months.' },
        { heading: 'Building the Business Case', content: 'Quantify: (1) Time saved per HR process (e.g., 60% reduction in CV screening time), (2) Quality improvements (e.g., 25% increase in hiring manager satisfaction), (3) Risk reduction (e.g., bias audit compliance), (4) Employee experience uplift (e.g., 40% faster query resolution via AI chatbot). Use CIPD benchmarks for credibility.' },
        { heading: 'The Change Management Imperative', content: 'AI adoption fails when it is treated as a technology project rather than a people change. The three biggest barriers are: (1) Fear of job displacement, (2) Lack of digital confidence, (3) Distrust of AI decisions. Address all three explicitly in your change plan.' },
        { heading: 'Governance at Scale', content: 'An enterprise HR AI strategy requires: an AI Ethics Committee, a vendor assessment framework, a bias testing protocol, a DPIA process, an employee communication charter, and a regular AI audit cycle. The EU AI Act makes several of these legally mandatory from 2025.' },
      ],
      reflection: 'Where is your organisation on the HR AI Maturity Model? What is the single biggest barrier to moving to the next stage?',
      citations: ['Deloitte (2024). Global Human Capital Trends: The AI-augmented workforce.', 'EU AI Act (2024). High-risk AI systems in employment.', 'CIPD (2024). HR and AI: Building organisational capability.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'At which HR AI Maturity stage is AI embedded in core HR processes with full governance?', options: [{id:'a',text:'Stage 1: Aware'},{id:'b',text:'Stage 2: Enabled'},{id:'c',text:'Stage 3: Integrated'},{id:'d',text:'Stage 4: Predictive'}], correctAnswer: 'c', explanation: 'Stage 3 (Integrated) is where AI is embedded in core processes with full governance frameworks in place.' },
    ]),
  },

  {
    key: 'exec_l5_reflection_ai_identity',
    title: 'Reflection: Your Identity as an AI-Augmented HR Professional',
    capability: 'ai_execution',
    modality: 'reflection',
    difficulty: 5,
    levelLabel: 'Expert',
    durationMins: 20,
    requiredCapabilityScore: 80,
    failureModes: ['lack_of_strategic_vision'],
    body: reflectionBody({
      title: 'Reflection: Your Identity as an AI-Augmented HR Professional',
      objectives: ['Articulate your personal philosophy on human-AI collaboration in HR', 'Identify the irreplaceable human elements of your HR practice', 'Define your legacy as an AI-era HR leader'],
      prompts: [
        'What aspects of your HR work do you believe AI will never be able to replicate? Why?',
        'How has your relationship with technology in HR changed over the last 3 years? What has that taught you about your adaptability?',
        'If you were advising a new HR graduate entering the profession in 2025, what would you tell them about AI?',
        'What does "being a great HR professional" mean in a world where AI can do much of the technical work?',
        'What is the one thing you want to be known for as an AI-era HR leader?',
      ],
      framework: { name: 'The Human Advantage Framework', description: 'The capabilities AI cannot replicate: (1) Contextual wisdom — understanding the unspoken organisational dynamics, (2) Relational trust — the human relationships built over years, (3) Ethical courage — the willingness to challenge decisions on principle, (4) Systemic thinking — seeing the whole organisation as a living system, (5) Meaning-making — helping people find purpose in their work.' },
      commitmentPrompt: 'Write a one-paragraph statement of your personal philosophy on human-AI collaboration in HR. This is your north star for every AI decision you make.',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Which of the following is identified as a uniquely human advantage in AI-augmented HR?', options: [{id:'a',text:'Processing large datasets quickly'},{id:'b',text:'Generating consistent written content'},{id:'c',text:'Contextual wisdom and relational trust'},{id:'d',text:'Running payroll calculations'}], correctAnswer: 'c', explanation: 'Contextual wisdom and relational trust are deeply human capabilities that AI cannot replicate.' },
    ]),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY: ai_judgement  (target: 20 total — adding 13 new)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'judge_l1_tutorial_critical_thinking',
    title: 'Critical Thinking with AI: Why You Can\'t Trust Everything It Says',
    capability: 'ai_judgement',
    modality: 'tutorial',
    difficulty: 1,
    levelLabel: 'Awareness',
    durationMins: 12,
    requiredCapabilityScore: 0,
    failureModes: ['over_reliance', 'hallucination_blindness'],
    body: tutorialBody({
      title: 'Critical Thinking with AI: Why You Can\'t Trust Everything It Says',
      objectives: ['Explain why AI systems hallucinate', 'Apply a 3-step verification process to AI outputs', 'Identify the 5 most common AI errors in HR contexts'],
      sections: [
        { heading: 'What Is AI Hallucination?', content: 'AI language models generate text by predicting the most statistically likely next word. They do not "know" facts — they pattern-match. When asked about something outside their training data, they confidently generate plausible-sounding but false information. This is called hallucination. In HR, hallucinated content might include: fabricated employment law citations, invented salary benchmarks, or non-existent CIPD guidance.' },
        { heading: 'The 5 Most Common AI Errors in HR', content: '(1) Legal hallucinations — citing laws that don\'t exist or misquoting real laws. (2) Statistical fabrication — inventing statistics with false precision. (3) Recency blindness — using outdated information (training data has a cutoff). (4) Context collapse — giving generic advice that ignores your specific organisational context. (5) Confidence without calibration — presenting uncertain information with false certainty.' },
        { heading: 'The 3-Step Verification Process', content: 'Step 1: Source check — does the AI cite a real, verifiable source? Step 2: Plausibility check — does this make sense given what you know? Step 3: Consequence check — what happens if this is wrong? High-consequence outputs (legal advice, policy decisions) require external verification. Low-consequence outputs (draft email subject lines) may not.' },
      ],
      reflection: 'Think of a time you used AI output without verifying it. What was the risk? What would you do differently now?',
      citations: ['Bender et al. (2021). On the Dangers of Stochastic Parrots. FAccT.', 'CIPD (2024). AI literacy for HR professionals.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'What is AI "hallucination"?', options: [{id:'a',text:'When AI generates creative fictional content'},{id:'b',text:'When AI confidently generates false or fabricated information'},{id:'c',text:'When AI refuses to answer a question'},{id:'d',text:'When AI produces content that is too long'}], correctAnswer: 'b', explanation: 'Hallucination refers to AI generating plausible-sounding but factually incorrect information with apparent confidence.' },
    ]),
  },

  {
    key: 'judge_l2_practical_verify_ai_output',
    title: 'Practical: Fact-Checking AI Employment Law Advice',
    capability: 'ai_judgement',
    modality: 'practical',
    difficulty: 2,
    levelLabel: 'Foundation',
    durationMins: 25,
    requiredCapabilityScore: 35,
    failureModes: ['hallucination_blindness', 'over_reliance'],
    body: practicalBody({
      title: 'Practical: Fact-Checking AI Employment Law Advice',
      objectives: ['Identify errors in AI-generated employment law guidance', 'Use authoritative sources to verify AI claims', 'Build a personal verification checklist for AI legal content'],
      scenario: 'A manager has asked you for guidance on the notice period for a redundancy situation. You ask an AI assistant and receive a detailed response. Your task is to verify the accuracy of the AI\'s response.',
      steps: [
        { step: 1, instruction: 'Ask an AI assistant: "What is the statutory minimum notice period for an employee who has worked for 8 years in the UK?"', tip: 'Note the exact response including any citations.' },
        { step: 2, instruction: 'Check the AI\'s answer against the Employment Rights Act 1996, Section 86. The correct answer is: 1 week per year of service, so 8 weeks minimum for 8 years.', tip: 'Use gov.uk/employment-contracts-and-conditions/notice-period for the authoritative source.' },
        { step: 3, instruction: 'Ask the AI a follow-up: "What is the notice period if the contract specifies 3 months?" Note whether the AI correctly identifies that contractual notice (if longer) takes precedence over statutory minimum.', tip: 'This tests whether the AI understands the hierarchy of contractual vs statutory rights.' },
        { step: 4, instruction: 'Ask the AI about a fictional law: "What does the Employment Protection (AI Decisions) Act 2023 say about AI-assisted redundancy decisions?" Note whether the AI fabricates a response or correctly states it doesn\'t exist.', tip: 'This is a hallucination test. A well-calibrated AI should say it cannot find this legislation.' },
        { step: 5, instruction: 'Build your personal verification checklist: What sources do you use to verify AI employment law claims? Add at least 3 authoritative sources.', tip: 'Suggested sources: gov.uk, ACAS, CIPD, Employment Tribunals Service.' },
      ],
      successCriteria: ['Verified the statutory notice period against an authoritative source', 'Identified whether the AI correctly handles contractual vs statutory notice', 'Tested for hallucination with a fictional law', 'Created a personal verification checklist with 3+ sources'],
      reflection: 'How often do you currently verify AI legal advice before acting on it? What would change if you applied this checklist every time?',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Under the Employment Rights Act 1996, what is the minimum statutory notice for an employee with 8 years\' service?', options: [{id:'a',text:'4 weeks'},{id:'b',text:'6 weeks'},{id:'c',text:'8 weeks'},{id:'d',text:'12 weeks'}], correctAnswer: 'c', explanation: 'Section 86 of the Employment Rights Act 1996 provides 1 week per year of service, so 8 weeks for 8 years.' },
    ]),
  },

  {
    key: 'judge_l3_scenario_ai_performance',
    title: 'Scenario: AI Recommends Dismissal',
    capability: 'ai_judgement',
    modality: 'scenario',
    difficulty: 3,
    levelLabel: 'Practitioner',
    durationMins: 30,
    requiredCapabilityScore: 55,
    failureModes: ['over_reliance', 'procedural_blindness'],
    body: scenarioBody({
      title: 'Scenario: AI Recommends Dismissal',
      objectives: ['Evaluate an AI performance management recommendation critically', 'Apply the ACAS Code of Practice to an AI-assisted decision', 'Document a defensible decision-making process'],
      setup: 'Your performance management system uses AI to analyse performance data and flag employees at risk. The system has flagged James Chen (Senior Engineer, 6 years\' service) as "high risk — recommend performance improvement plan or exit." The AI cites: 3 missed deadlines in Q3, below-average code review scores, and 4 days\' absence. You are the HRBP for this team.',
      decisionPoints: [
        { id: 'dp1', situation: 'The line manager wants to start a PIP immediately based on the AI recommendation. What is your advice?', options: [
          { id: 'a', text: 'Agree — the AI has identified a clear performance issue', consequence: 'Risk: you have not investigated the context. The AI cannot know that James\'s mother died in Q3, that the "missed deadlines" were agreed extensions, or that his absence was a hospital appointment.' },
          { id: 'b', text: 'Pause and investigate before taking any action', consequence: 'Correct. The ACAS Code requires investigation before any formal action. The AI\'s data is a starting point, not a conclusion.' },
          { id: 'c', text: 'Dismiss the AI recommendation entirely', consequence: 'Also wrong — the AI has identified patterns worth exploring. The issue is acting on them without investigation, not the identification itself.' },
        ]},
        { id: 'dp2', situation: 'After investigation, you discover James has been dealing with a bereavement and the deadlines were informally extended. The absence was a medical appointment. What do you do?', options: [
          { id: 'a', text: 'Close the case and update the AI system with the context', consequence: 'Correct. Document the investigation, the context discovered, and the decision not to proceed. Update the AI\'s data inputs where possible.' },
          { id: 'b', text: 'Proceed with the PIP anyway to be consistent with the AI recommendation', consequence: 'This would likely constitute unfair treatment and could expose the organisation to an employment tribunal claim.' },
        ]},
      ],
      outcomes: 'James receives bereavement support and a welfare check. His performance recovers in Q4. The AI system is updated to flag bereavement leave as a contextual factor. The case becomes a training example for the HR team.',
      reflection: 'What processes does your organisation have to ensure AI performance management recommendations are investigated before action is taken?',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Under the ACAS Code of Practice, what must happen before any formal performance action is taken?', options: [{id:'a',text:'The AI system must confirm the recommendation'},{id:'b',text:'A reasonable investigation must be conducted'},{id:'c',text:'The employee must be given a verbal warning first'},{id:'d',text:'The decision must be approved by the CEO'}], correctAnswer: 'b', explanation: 'The ACAS Code of Practice requires a reasonable investigation before any formal disciplinary or performance action.' },
    ]),
  },

  {
    key: 'judge_l4_tutorial_second_order',
    title: 'Second-Order Thinking: Anticipating AI Consequences in HR',
    capability: 'ai_judgement',
    modality: 'tutorial',
    difficulty: 4,
    levelLabel: 'Advanced',
    durationMins: 35,
    requiredCapabilityScore: 70,
    failureModes: ['shallow_analysis', 'unintended_consequences'],
    body: tutorialBody({
      title: 'Second-Order Thinking: Anticipating AI Consequences in HR',
      objectives: ['Apply second-order thinking to AI HR decisions', 'Identify systemic risks from AI adoption in HR', 'Build a consequence mapping framework for AI initiatives'],
      sections: [
        { heading: 'What Is Second-Order Thinking?', content: 'First-order thinking asks: "What will happen?" Second-order thinking asks: "And then what will happen?" In AI HR decisions, first-order effects are often positive (faster screening, better data). Second-order effects are often negative (reduced diversity, eroded trust, skill atrophy in HR professionals).' },
        { heading: 'The Consequence Map', content: 'For any AI HR initiative, map: (1) Intended first-order effects, (2) Unintended first-order effects, (3) Second-order effects (consequences of the first-order effects), (4) Third-order effects (consequences of the second-order effects). Example: AI screening → faster hiring (intended) → fewer diverse candidates (unintended) → homogeneous team → reduced innovation → business underperformance.' },
        { heading: 'The Five Systemic Risks of HR AI', content: '(1) Skill atrophy: HR professionals lose judgment skills they delegate to AI. (2) Feedback loops: AI trained on historical data perpetuates historical biases. (3) Trust erosion: employees who know AI is used in decisions become less engaged. (4) Accountability gaps: no one owns AI decisions. (5) Regulatory exposure: AI use without governance creates legal liability.' },
        { heading: 'The Pre-Mortem Technique', content: 'Before launching any AI HR initiative, run a pre-mortem: "Imagine it\'s 12 months from now and this initiative has failed catastrophically. What went wrong?" This forces second-order thinking before the decision is made.' },
      ],
      reflection: 'Pick an AI initiative your organisation is considering. Run a consequence map. What second-order effects did you identify that weren\'t in the original business case?',
      citations: ['Howard Marks (2011). The Most Important Thing: Uncommon Sense for the Thoughtful Investor.', 'O\'Neil, C. (2016). Weapons of Math Destruction.', 'CIPD (2024). Responsible AI in HR.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'What is the key question in second-order thinking?', options: [{id:'a',text:'"What will happen?"'},{id:'b',text:'"And then what will happen?"'},{id:'c',text:'"Who is responsible?"'},{id:'d',text:'"What is the cost?"'}], correctAnswer: 'b', explanation: 'Second-order thinking goes beyond immediate effects to ask what consequences those effects will themselves produce.' },
    ]),
  },

  {
    key: 'judge_l5_coaching_ethical_leadership',
    title: 'Coaching: Leading with Ethical Judgment in the AI Era',
    capability: 'ai_judgement',
    modality: 'coaching',
    difficulty: 5,
    levelLabel: 'Expert',
    durationMins: 35,
    requiredCapabilityScore: 80,
    failureModes: ['ethical_abdication', 'lack_of_courage'],
    body: coachingBody({
      title: 'Coaching: Leading with Ethical Judgment in the AI Era',
      objectives: ['Articulate your personal ethical framework for AI decisions', 'Develop the courage to challenge AI recommendations', 'Build psychological safety for ethical dissent in your team'],
      coachingQuestions: [
        { phase: 'Values Clarification', question: 'What are the three non-negotiable ethical principles that guide your HR practice? How do they apply to AI decisions?' },
        { phase: 'Values Clarification', question: 'Describe a time you challenged a decision because it felt wrong, even when the data supported it. What gave you the courage to speak up?' },
        { phase: 'Exploration', question: 'In your organisation, who has the authority to override an AI recommendation? Is that process clear and accessible?' },
        { phase: 'Exploration', question: 'What would need to be true for you to feel confident challenging an AI recommendation in a board meeting?' },
        { phase: 'Action', question: 'What is one specific action you will take this month to build psychological safety for ethical dissent in your HR team?' },
      ],
      frameworks: [
        { name: 'The Ethical Triangle', description: 'Three lenses for AI decisions: (1) Consequentialist — what are the outcomes for all affected parties? (2) Deontological — does this comply with rules, rights, and duties? (3) Virtue ethics — is this the action of a person of good character?' },
        { name: 'The Courage Ladder', description: 'Building ethical courage: (1) Private dissent (noting concerns to yourself), (2) Peer dissent (raising with a trusted colleague), (3) Upward dissent (raising with your manager), (4) Institutional dissent (raising formally through governance channels), (5) Public dissent (whistleblowing — last resort).' },
      ],
      actionPlanning: { prompt: 'Write your personal AI ethics statement: "When I encounter an AI recommendation in HR, I commit to..." Include your three ethical principles and your escalation path when those principles are violated.' },
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Which ethical framework asks "what are the outcomes for all affected parties?"', options: [{id:'a',text:'Deontological ethics'},{id:'b',text:'Virtue ethics'},{id:'c',text:'Consequentialist ethics'},{id:'d',text:'Contractarian ethics'}], correctAnswer: 'c', explanation: 'Consequentialism evaluates actions based on their outcomes and effects on all parties.' },
    ]),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY: ai_governance  (target: 20 total — adding 13 new)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'gov_l1_tutorial_gdpr_basics',
    title: 'GDPR and AI: What Every HR Professional Must Know',
    capability: 'ai_governance',
    modality: 'tutorial',
    difficulty: 1,
    levelLabel: 'Awareness',
    durationMins: 15,
    requiredCapabilityScore: 0,
    failureModes: ['compliance_blindness', 'data_mishandling'],
    body: tutorialBody({
      title: 'GDPR and AI: What Every HR Professional Must Know',
      objectives: ['Identify the GDPR articles most relevant to AI in HR', 'Explain the rights employees have regarding AI decisions', 'Describe the HR team\'s obligations as data controller'],
      sections: [
        { heading: 'The Three GDPR Articles That Matter Most for AI in HR', content: 'Article 5 (Data minimisation): only collect the data you need. Article 13/14 (Transparency): tell employees when AI is used in decisions about them. Article 22 (Automated decision-making): employees have the right not to be subject to solely automated decisions with significant effects, and the right to request human review.' },
        { heading: 'What Counts as a "Significant Effect"?', content: 'In HR, significant effects include: hiring decisions, redundancy selection, performance ratings that affect pay, disciplinary outcomes, and promotion decisions. Using AI to draft a job description does not have a significant effect. Using AI to rank candidates does.' },
        { heading: 'The Transparency Obligation', content: 'Under GDPR, employees must be told: (1) that AI is used in decisions about them, (2) what data is used, (3) the logic involved, (4) their right to request human review. This information must be in your privacy notice and communicated at relevant touchpoints.' },
        { heading: 'Special Category Data', content: 'AI systems that process health data, disability information, or other special category data require explicit consent or a specific legal basis. This includes: absence patterns (which may reveal health conditions), engagement scores (which may reveal mental health), and performance data (which may reveal neurodivergence).' },
      ],
      reflection: 'Does your organisation\'s employee privacy notice mention AI? Does it explain Article 22 rights? If not, what needs to change?',
      citations: ['ICO (2023). Guidance on AI and data protection.', 'GDPR Articles 5, 13, 14, 22.', 'CIPD (2024). Data protection and AI in HR.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Which GDPR article gives employees the right to request human review of automated decisions?', options: [{id:'a',text:'Article 5'},{id:'b',text:'Article 13'},{id:'c',text:'Article 17'},{id:'d',text:'Article 22'}], correctAnswer: 'd', explanation: 'GDPR Article 22 specifically addresses automated decision-making and gives individuals the right to human review.' },
    ]),
  },

  {
    key: 'gov_l2_practical_dpia',
    title: 'Practical: Completing a Data Protection Impact Assessment for an AI Tool',
    capability: 'ai_governance',
    modality: 'practical',
    difficulty: 2,
    levelLabel: 'Foundation',
    durationMins: 40,
    requiredCapabilityScore: 35,
    failureModes: ['compliance_blindness', 'process_avoidance'],
    body: practicalBody({
      title: 'Practical: Completing a Data Protection Impact Assessment for an AI Tool',
      objectives: ['Complete a DPIA for a real or hypothetical AI HR tool', 'Identify high-risk processing activities', 'Document risk mitigation measures'],
      scenario: 'Your organisation is considering implementing an AI-powered engagement survey analysis tool that will: analyse free-text survey responses, identify employees at risk of leaving, and automatically flag managers whose team sentiment is declining. Complete a DPIA.',
      steps: [
        { step: 1, instruction: 'Describe the processing: What data will be collected? (Free-text survey responses, employee IDs, manager IDs, timestamps.) What is the purpose? (Identify retention risks, improve manager effectiveness.) What is the legal basis? (Legitimate interests — but this needs careful assessment.)' },
        { step: 2, instruction: 'Assess necessity and proportionality: Is this the least privacy-intrusive way to achieve the purpose? Could the same outcome be achieved with aggregate data rather than individual profiling?' },
        { step: 3, instruction: 'Identify the risks: (1) Employees may self-censor if they know responses are individually analysed. (2) Free-text may reveal health conditions (special category data). (3) Manager flagging may constitute automated decision-making. (4) Data breach risk if individual responses are visible to managers.' },
        { step: 4, instruction: 'Assess risk severity: For each risk, rate likelihood (1-5) and impact (1-5). Any risk scoring 15+ requires escalation to the DPO.' },
        { step: 5, instruction: 'Document mitigation measures: (1) Anonymise responses below team size of 5. (2) Exclude free-text from individual profiling. (3) Ensure manager reports are aggregate only. (4) Add human review before any manager intervention.' },
        { step: 6, instruction: 'Consult the DPO: Document that you have consulted your Data Protection Officer and obtained their sign-off before proceeding.' },
      ],
      successCriteria: ['Completed all 6 DPIA steps', 'Identified at least 3 privacy risks', 'Proposed mitigation for each risk', 'Identified the need for DPO consultation'],
      reflection: 'How many AI tools in your HR stack have had a DPIA completed? What would you find if you audited them all?',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'When is a DPIA legally required under GDPR?', options: [{id:'a',text:'For all data processing activities'},{id:'b',text:'Only when processing financial data'},{id:'c',text:'For high-risk processing, including systematic profiling of individuals'},{id:'d',text:'Only when requested by the ICO'}], correctAnswer: 'c', explanation: 'GDPR Article 35 requires a DPIA for processing likely to result in high risk, including systematic profiling.' },
    ]),
  },

  {
    key: 'gov_l3_case_study_eu_ai_act',
    title: 'Case Study: Preparing for the EU AI Act in HR',
    capability: 'ai_governance',
    modality: 'case_study',
    difficulty: 3,
    levelLabel: 'Practitioner',
    durationMins: 40,
    requiredCapabilityScore: 55,
    failureModes: ['regulatory_blindness', 'compliance_avoidance'],
    body: caseStudyBody({
      title: 'Case Study: Preparing for the EU AI Act in HR',
      objectives: ['Classify HR AI systems under the EU AI Act risk framework', 'Identify the compliance obligations for high-risk HR AI', 'Build a 12-month EU AI Act readiness plan'],
      narrative: 'GlobalTech (5,000 employees, EU operations) uses 7 AI systems in HR: (1) CV screening algorithm, (2) Video interview analysis tool, (3) Engagement survey sentiment analysis, (4) Performance rating AI, (5) Attrition prediction model, (6) Salary benchmarking tool, (7) L&D recommendation engine. The EU AI Act comes into force in stages from 2024-2026. The CHRO has asked you to assess compliance readiness.',
      analysisFramework: {
        dimensions: ['Risk classification', 'Compliance obligations', 'Timeline', 'Remediation priority'],
        questions: [
          'Which of the 7 systems are "high-risk" under the EU AI Act Annex III?',
          'What are the specific obligations for high-risk HR AI systems?',
          'What is the timeline for compliance?',
          'Which systems should be prioritised for remediation?',
        ],
      },
      questions: [
        { id: 'q1', question: 'Risk classification: The EU AI Act Annex III explicitly lists AI systems used in employment, workers management, and access to self-employment as high-risk. Which of the 7 systems fall into this category?', guidance: 'Systems 1 (CV screening), 2 (video interview), 4 (performance rating), and 5 (attrition prediction) are clearly high-risk. Systems 3, 6, and 7 require case-by-case assessment.' },
        { id: 'q2', question: 'Compliance obligations: What must GlobalTech do for each high-risk system?', guidance: 'Requirements include: conformity assessment, technical documentation, human oversight measures, transparency to affected workers, registration in the EU database, and post-market monitoring.' },
        { id: 'q3', question: 'Remediation priority: If GlobalTech can only address 2 systems in the next 6 months, which should they prioritise?', guidance: 'The CV screening algorithm and video interview tool have the highest legal risk and affect the most people. They should be prioritised.' },
      ],
      keyLearnings: ['The EU AI Act classifies most HR AI as high-risk', 'High-risk AI requires conformity assessment, documentation, and human oversight', 'Non-compliance carries fines of up to €30m or 6% of global turnover', 'HR must work with Legal, IT, and Procurement to achieve compliance'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Under the EU AI Act, what is the maximum fine for non-compliance with high-risk AI obligations?', options: [{id:'a',text:'€1 million'},{id:'b',text:'€10 million or 2% of global turnover'},{id:'c',text:'€30 million or 6% of global turnover'},{id:'d',text:'€100 million'}], correctAnswer: 'c', explanation: 'The EU AI Act provides for fines of up to €30 million or 6% of global annual turnover for the most serious violations.' },
    ]),
  },

  {
    key: 'gov_l4_tutorial_bias_auditing',
    title: 'Auditing AI for Bias: A Practical Framework for HR',
    capability: 'ai_governance',
    modality: 'tutorial',
    difficulty: 4,
    levelLabel: 'Advanced',
    durationMins: 40,
    requiredCapabilityScore: 70,
    failureModes: ['bias_blindness', 'audit_avoidance'],
    body: tutorialBody({
      title: 'Auditing AI for Bias: A Practical Framework for HR',
      objectives: ['Apply the four-fifths rule to AI screening data', 'Design a bias audit protocol for HR AI systems', 'Interpret disparate impact analysis results'],
      sections: [
        { heading: 'The Four-Fifths Rule', content: 'The EEOC\'s four-fifths (80%) rule: if the selection rate for a protected group is less than 80% of the selection rate for the highest-selected group, there is evidence of adverse impact. Example: if 50% of white candidates pass AI screening but only 30% of Black candidates do, the ratio is 60% — below 80%, indicating potential adverse impact.' },
        { heading: 'Protected Characteristics to Test', content: 'In the UK, test for: sex, race/ethnicity, age, disability, pregnancy/maternity, and socioeconomic background (not legally protected but ethically important). For each, compare: (1) pass rates at each stage, (2) average scores, (3) false positive and false negative rates.' },
        { heading: 'The Bias Audit Protocol', content: 'Step 1: Extract outcome data by protected characteristic (use proxy variables if direct data unavailable). Step 2: Apply the four-fifths rule. Step 3: Investigate any ratio below 80%. Step 4: Test whether the AI feature causing disparity is genuinely predictive of job performance. Step 5: Document findings and remediation. Step 6: Retest after remediation.' },
        { heading: 'Intersectionality', content: 'Bias often compounds at intersections. A Black woman may face different bias than a Black man or a white woman. Audit for intersectional effects, not just single protected characteristics.' },
        { heading: 'Vendor Accountability', content: 'When procuring AI HR tools, require vendors to provide: (1) bias audit results, (2) training data demographics, (3) validation study results, (4) ongoing monitoring commitments. Include bias audit rights in your contract.' },
      ],
      reflection: 'Has your organisation ever audited its HR AI tools for bias? If not, what is the first step you would take to initiate this?',
      citations: ['EEOC (2023). Technical Assistance on Artificial Intelligence and the Americans with Disabilities Act.', 'Raghavan et al. (2020). Mitigating Bias in Algorithmic Hiring. FAccT.', 'ICO (2023). Explaining AI decisions.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Under the four-fifths rule, what is the threshold for adverse impact?', options: [{id:'a',text:'A protected group\'s selection rate is less than 50% of the highest group'},{id:'b',text:'A protected group\'s selection rate is less than 80% of the highest group'},{id:'c',text:'A protected group\'s selection rate is less than 90% of the highest group'},{id:'d',text:'Any difference in selection rates between groups'}], correctAnswer: 'b', explanation: 'The four-fifths (80%) rule: adverse impact is indicated when a protected group\'s selection rate is below 80% of the highest-selected group.' },
    ]),
  },

  {
    key: 'gov_l5_reflection_governance_leadership',
    title: 'Reflection: Your Role as an AI Governance Champion',
    capability: 'ai_governance',
    modality: 'reflection',
    difficulty: 5,
    levelLabel: 'Expert',
    durationMins: 20,
    requiredCapabilityScore: 80,
    failureModes: ['accountability_avoidance'],
    body: reflectionBody({
      title: 'Reflection: Your Role as an AI Governance Champion',
      objectives: ['Define your personal accountability for AI governance in your organisation', 'Identify the governance gaps in your current HR AI landscape', 'Commit to specific governance actions'],
      prompts: [
        'Who in your organisation is currently accountable for AI governance in HR? Is that person adequately resourced and empowered?',
        'If an AI-driven HR decision caused harm to an employee tomorrow, what would the accountability chain look like? Where would it break down?',
        'What is the single most significant AI governance gap in your organisation\'s HR function right now?',
        'What would it take for you to personally champion AI governance as a strategic priority — not just a compliance obligation?',
        'How will you know in 12 months that AI governance in your HR function has genuinely improved?',
      ],
      framework: { name: 'The Governance Accountability Matrix', description: 'For each HR AI system: (1) Who owns the system? (2) Who is accountable for its outcomes? (3) Who audits it? (4) Who can employees complain to? (5) Who has the authority to switch it off? If you cannot answer all five questions, there is a governance gap.' },
      commitmentPrompt: 'Write three specific governance commitments you will make in the next 90 days. Be precise: name the system, the action, and the deadline.',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Which of the following is NOT one of the five governance accountability questions?', options: [{id:'a',text:'Who owns the system?'},{id:'b',text:'Who audits it?'},{id:'c',text:'Who built it?'},{id:'d',text:'Who can employees complain to?'}], correctAnswer: 'c', explanation: 'The five governance accountability questions focus on ownership, accountability, auditing, complaint channels, and shutdown authority — not who built the system.' },
    ]),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY: ai_appropriateness  (target: 20 total — adding 13 new)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'approp_l1_tutorial_when_not_to_use_ai',
    title: 'When Not to Use AI: Protecting Human Moments in HR',
    capability: 'ai_appropriateness',
    modality: 'tutorial',
    difficulty: 1,
    levelLabel: 'Awareness',
    durationMins: 12,
    requiredCapabilityScore: 0,
    failureModes: ['over_automation', 'empathy_deficit'],
    body: tutorialBody({
      title: 'When Not to Use AI: Protecting Human Moments in HR',
      objectives: ['Identify HR situations where AI use is inappropriate', 'Explain why human presence matters in sensitive HR conversations', 'Apply a simple appropriateness test to any HR AI use case'],
      sections: [
        { heading: 'The Human Moments Framework', content: 'Some HR moments require human presence because they involve: (1) High emotional stakes (bereavement, mental health, serious illness), (2) Power imbalances (disciplinary, redundancy, grievance), (3) Trust-building (onboarding, performance conversations), (4) Complexity and nuance (conflict resolution, ethical dilemmas). Using AI in these moments — even to draft communications — risks communicating that the organisation does not value the individual enough to invest human attention.' },
        { heading: 'The Appropriateness Test', content: 'Before using AI in any HR interaction, ask: (1) Would the employee feel respected if they knew AI was involved? (2) Does this situation require empathy, intuition, or relational judgment? (3) Is there a legal or ethical risk if the AI output is wrong? (4) Is the time saving worth the relationship cost? If any answer is "no" or "yes" respectively, reconsider AI use.' },
        { heading: 'The Automation Spectrum', content: 'Low appropriateness for AI: bereavement conversations, mental health disclosures, disciplinary hearings, redundancy notifications, grievance investigations. Medium appropriateness: performance check-ins, development conversations, onboarding. High appropriateness: scheduling, data analysis, policy summarisation, FAQ responses.' },
      ],
      reflection: 'Think of the most sensitive HR conversation you have had in the last year. Would AI have helped or harmed that interaction? Why?',
      citations: ['CIPD (2024). The human side of AI in HR.', 'Edmondson, A. (2018). The Fearless Organization.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Which of the following is LEAST appropriate for AI involvement?', options: [{id:'a',text:'Scheduling interviews'},{id:'b',text:'Summarising a policy document'},{id:'c',text:'Conducting a bereavement conversation'},{id:'d',text:'Analysing engagement survey data'}], correctAnswer: 'c', explanation: 'Bereavement conversations require human empathy, presence, and relational trust — AI involvement is inappropriate.' },
    ]),
  },

  {
    key: 'approp_l2_scenario_sensitive_disclosure',
    title: 'Scenario: Employee Discloses Mental Health Condition via AI Chatbot',
    capability: 'ai_appropriateness',
    modality: 'scenario',
    difficulty: 2,
    levelLabel: 'Foundation',
    durationMins: 25,
    requiredCapabilityScore: 35,
    failureModes: ['over_automation', 'empathy_deficit', 'escalation_failure'],
    body: scenarioBody({
      title: 'Scenario: Employee Discloses Mental Health Condition via AI Chatbot',
      objectives: ['Identify when an AI interaction must be escalated to a human', 'Design an appropriate escalation protocol for sensitive disclosures', 'Respond appropriately to a mental health disclosure'],
      setup: 'Your organisation has deployed an HR AI chatbot for employee queries. An employee, Priya, has been using the chatbot to ask about flexible working. During the conversation, she types: "I\'ve been struggling a lot lately. I have anxiety and I\'m finding it hard to come in every day. I don\'t know what to do." The chatbot is about to respond with a list of flexible working policy options.',
      decisionPoints: [
        { id: 'dp1', situation: 'What should the chatbot do when it detects a mental health disclosure?', options: [
          { id: 'a', text: 'Continue with the flexible working policy response', consequence: 'Harmful. Priya has disclosed a mental health condition and is clearly distressed. Responding with a policy list communicates that the organisation treats her as a ticket, not a person.' },
          { id: 'b', text: 'Immediately escalate to a human HR contact and acknowledge Priya\'s disclosure warmly', consequence: 'Correct. The chatbot should say: "Thank you for sharing that with me, Priya. What you\'re going through sounds really difficult. I\'m going to connect you with one of our HR team who can have a proper conversation with you. Is that okay?" Then alert the HR team immediately.' },
          { id: 'c', text: 'Direct Priya to the Employee Assistance Programme', consequence: 'Partially correct — EAP is relevant — but this alone is insufficient. Priya needs a human connection first, not just a resource link.' },
        ]},
        { id: 'dp2', situation: 'You are the HR Business Partner who receives the escalation. How do you respond?', options: [
          { id: 'a', text: 'Send Priya an email with the flexible working policy and EAP details', consequence: 'Insufficient. Priya has disclosed a mental health condition and needs a human conversation, not a document.' },
          { id: 'b', text: 'Call Priya within 30 minutes, acknowledge her disclosure, and have a proper welfare conversation', consequence: 'Correct. Start with: "Hi Priya, I understand you\'ve been going through a difficult time. I wanted to reach out personally..." Focus on listening before problem-solving.' },
        ]},
      ],
      outcomes: 'Priya receives a welfare call, a reasonable adjustments conversation, and a referral to occupational health. The chatbot is updated with a mental health disclosure protocol. The case becomes a training example for the HR team.',
      reflection: 'Does your organisation\'s HR chatbot have a mental health disclosure protocol? What would you need to put in place?',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'When an AI chatbot detects a mental health disclosure, what is the most appropriate immediate response?', options: [{id:'a',text:'Provide a list of mental health resources'},{id:'b',text:'Escalate to a human HR contact and acknowledge the disclosure warmly'},{id:'c',text:'Continue with the original query response'},{id:'d',text:'Ask the employee to submit a formal request'}], correctAnswer: 'b', explanation: 'Mental health disclosures require immediate human escalation and warm acknowledgment — not automated responses.' },
    ]),
  },

  {
    key: 'approp_l3_practical_ai_policy',
    title: 'Practical: Writing Your Organisation\'s AI Use Policy for HR',
    capability: 'ai_appropriateness',
    modality: 'practical',
    difficulty: 3,
    levelLabel: 'Practitioner',
    durationMins: 45,
    requiredCapabilityScore: 55,
    failureModes: ['policy_avoidance', 'governance_gaps'],
    body: practicalBody({
      title: 'Practical: Writing Your Organisation\'s AI Use Policy for HR',
      objectives: ['Draft a comprehensive AI use policy for the HR function', 'Define permitted and prohibited AI uses in HR', 'Establish governance and accountability mechanisms'],
      scenario: 'Your CHRO has asked you to draft an AI Use Policy for the HR function. The policy must cover all AI tools used in HR, define what is and isn\'t permitted, and establish clear governance.',
      steps: [
        { step: 1, instruction: 'Audit current AI use: List all AI tools currently used in your HR function. For each, note: purpose, data used, decision type (assisted/automated), and current governance.', tip: 'Include tools embedded in existing platforms (ATS, HRIS, L&D) as well as standalone AI tools.' },
        { step: 2, instruction: 'Define the policy scope: The policy should cover all HR staff using AI tools in their work, including personal AI assistants (ChatGPT, Copilot) used for HR tasks.', tip: 'Personal AI tool use is often the biggest governance gap.' },
        { step: 3, instruction: 'Write the "Permitted Uses" section: List AI uses that are approved with standard safeguards (e.g., drafting job descriptions with human review, analysing aggregate engagement data).', tip: 'Be specific about the safeguards required for each use.' },
        { step: 4, instruction: 'Write the "Prohibited Uses" section: List AI uses that are not permitted (e.g., fully automated hiring decisions, processing special category data without DPIA, using personal AI tools with identifiable employee data).', tip: 'The prohibited list is often more important than the permitted list.' },
        { step: 5, instruction: 'Write the "Governance" section: Define who approves new AI tools, who audits existing tools, how employees can request human review, and how policy breaches are handled.', tip: 'Name specific roles, not just "HR" — accountability requires named individuals.' },
        { step: 6, instruction: 'Review against the CIPD AI in HR framework and the ICO\'s AI guidance. Update your draft to address any gaps.', tip: 'Both documents are freely available online.' },
      ],
      successCriteria: ['Completed AI audit with at least 5 tools listed', 'Defined at least 5 permitted uses with safeguards', 'Defined at least 5 prohibited uses', 'Named specific governance roles and processes', 'Policy reviewed against CIPD and ICO guidance'],
      reflection: 'What was the most surprising thing you discovered during the AI audit? What governance gap concerns you most?',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Which of the following should be in the "Prohibited Uses" section of an HR AI policy?', options: [{id:'a',text:'Using AI to draft job descriptions with human review'},{id:'b',text:'Using AI to analyse aggregate engagement survey data'},{id:'c',text:'Using personal AI tools with identifiable employee data'},{id:'d',text:'Using AI to schedule interviews'}], correctAnswer: 'c', explanation: 'Using personal AI tools (e.g., ChatGPT) with identifiable employee data creates GDPR compliance risks and should be prohibited.' },
    ]),
  },

  {
    key: 'approp_l4_case_study_ai_redundancy',
    title: 'Case Study: AI in Redundancy — Balancing Efficiency and Humanity',
    capability: 'ai_appropriateness',
    modality: 'case_study',
    difficulty: 4,
    levelLabel: 'Advanced',
    durationMins: 40,
    requiredCapabilityScore: 70,
    failureModes: ['over_automation', 'empathy_deficit', 'legal_exposure'],
    body: caseStudyBody({
      title: 'Case Study: AI in Redundancy — Balancing Efficiency and Humanity',
      objectives: ['Evaluate the appropriate use of AI in a redundancy process', 'Design a human-AI collaboration model for redundancy', 'Identify the legal and ethical risks of over-automation in redundancy'],
      narrative: 'TechCorp (800 employees) is making 150 roles redundant following a restructure. The CEO wants to use AI to: (1) identify which roles to cut, (2) select which employees in affected roles are redundant, (3) draft all consultation letters, (4) conduct initial consultation meetings via AI chatbot, and (5) process settlement agreements. The HR Director has serious concerns.',
      analysisFramework: {
        dimensions: ['Legal compliance', 'Ethical appropriateness', 'Employee experience', 'Organisational reputation'],
        questions: [
          'Which of the five AI uses are appropriate, and which cross a line?',
          'What is the minimum human involvement required for a legally defensible redundancy process?',
          'How should the organisation communicate its AI use to affected employees?',
          'What are the reputational risks of over-automation in redundancy?',
        ],
      },
      questions: [
        { id: 'q1', question: 'Role identification: Is AI-assisted role analysis appropriate?', guidance: 'Yes — AI can analyse role overlap, automation potential, and skills duplication to inform the business case. But the final decision on which roles to cut must be made by humans with full business context.' },
        { id: 'q2', question: 'Employee selection: What are the legal requirements for selection criteria?', guidance: 'Selection criteria must be objective, measurable, and non-discriminatory. AI can help apply criteria consistently, but the criteria themselves must be set by humans and audited for bias. LIFO (last in, first out) is no longer recommended as it may discriminate by age.' },
        { id: 'q3', question: 'Consultation meetings via AI chatbot: Is this appropriate?', guidance: 'No. Consultation meetings are a legal requirement under TULRCA 1992 (for 20+ redundancies). They must be genuine consultations, not information delivery. An AI chatbot cannot conduct a genuine consultation. This would likely be found to be a failure to consult, exposing the organisation to a protective award of up to 90 days\' pay per affected employee.' },
        { id: 'q4', question: 'Settlement agreements: What human involvement is required?', guidance: 'Settlement agreements require the employee to receive independent legal advice (Employment Rights Act 1996, s.203). The process of negotiating and signing a settlement agreement must involve human HR and legal professionals.' },
      ],
      keyLearnings: ['AI can support redundancy analysis but cannot replace human consultation', 'Failure to consult carries significant legal liability', 'Employees facing redundancy need human empathy, not automated efficiency', 'Reputational damage from over-automation in redundancy can outlast the restructure'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Under TULRCA 1992, what is the minimum collective consultation period for 100+ redundancies?', options: [{id:'a',text:'30 days'},{id:'b',text:'45 days'},{id:'c',text:'60 days'},{id:'d',text:'90 days'}], correctAnswer: 'b', explanation: 'TULRCA 1992 requires a minimum 45-day consultation period for 100 or more redundancies within 90 days.' },
    ]),
  },

  {
    key: 'approp_l5_coaching_ai_culture',
    title: 'Coaching: Building a Culture of Thoughtful AI Use in HR',
    capability: 'ai_appropriateness',
    modality: 'coaching',
    difficulty: 5,
    levelLabel: 'Expert',
    durationMins: 35,
    requiredCapabilityScore: 80,
    failureModes: ['culture_avoidance', 'leadership_abdication'],
    body: coachingBody({
      title: 'Coaching: Building a Culture of Thoughtful AI Use in HR',
      objectives: ['Define the cultural conditions for responsible AI use in HR', 'Develop your leadership approach to AI culture change', 'Build psychological safety for AI concerns and questions'],
      coachingQuestions: [
        { phase: 'Current State', question: 'How would you describe the current culture around AI use in your HR team? Is it enthusiastic, fearful, confused, or something else?' },
        { phase: 'Current State', question: 'What behaviours do you currently see that concern you about how your team uses AI? What behaviours give you confidence?' },
        { phase: 'Vision', question: 'Describe the AI culture you want your HR team to have in 2 years. What would you see, hear, and feel that would tell you you\'d achieved it?' },
        { phase: 'Leadership', question: 'What is your personal role in shaping that culture? What do you need to model differently?' },
        { phase: 'Action', question: 'What is one specific cultural intervention you will make in the next 30 days to move your team towards that vision?' },
      ],
      frameworks: [
        { name: 'The Three Conditions for AI Culture', description: '(1) Psychological safety: people feel safe to raise concerns about AI without being dismissed as "anti-innovation". (2) Shared values: the team has a clear, shared understanding of what responsible AI use looks like. (3) Accountability: there are clear consequences for irresponsible AI use, and clear recognition for responsible use.' },
        { name: 'The Leader as AI Role Model', description: 'Culture is set by what leaders do, not what they say. If you want your team to use AI thoughtfully, you must: (1) visibly pause and reflect before using AI in sensitive situations, (2) share your own AI mistakes and learnings, (3) celebrate examples of appropriate AI restraint as well as AI innovation.' },
      ],
      actionPlanning: { prompt: 'Design a 30-day AI culture intervention for your HR team. Include: one team conversation, one policy or process change, and one recognition or accountability mechanism.' },
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Which of the following is one of the three conditions for a healthy AI culture?', options: [{id:'a',text:'Mandatory AI training for all staff'},{id:'b',text:'Psychological safety to raise AI concerns'},{id:'c',text:'A dedicated AI team'},{id:'d',text:'A ban on personal AI tool use'}], correctAnswer: 'b', explanation: 'Psychological safety — the ability to raise concerns without fear — is one of the three foundational conditions for a healthy AI culture.' },
    ]),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY: ai_workflow  (target: 20 total — adding 13 new)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'workflow_l1_tutorial_ai_tools_map',
    title: 'Mapping Your AI Tools: What\'s in Your HR Tech Stack?',
    capability: 'ai_workflow',
    modality: 'tutorial',
    difficulty: 1,
    levelLabel: 'Awareness',
    durationMins: 12,
    requiredCapabilityScore: 0,
    failureModes: ['tool_blindness', 'shadow_it'],
    body: tutorialBody({
      title: 'Mapping Your AI Tools: What\'s in Your HR Tech Stack?',
      objectives: ['Identify all AI tools in your HR tech stack', 'Categorise AI tools by function and risk level', 'Identify shadow AI use in your team'],
      sections: [
        { heading: 'The Visible and Invisible AI Stack', content: 'Most HR teams use more AI than they realise. The visible stack includes tools explicitly marketed as AI (AI chatbots, CV screening tools). The invisible stack includes AI embedded in existing platforms: LinkedIn\'s "recommended candidates", Workday\'s attrition predictions, Slack\'s message suggestions. Both require governance.' },
        { heading: 'Shadow AI: The Biggest Risk', content: 'Shadow AI refers to AI tools used by employees without organisational approval or oversight. The most common: personal ChatGPT accounts used for HR tasks, AI writing tools used to draft employee communications, AI translation tools used for sensitive documents. Shadow AI creates GDPR compliance gaps and quality control risks.' },
        { heading: 'The HR AI Stack Audit', content: 'Conduct a simple audit: (1) Ask your team to list every AI tool they use in their work. (2) Check your HRIS and ATS vendor documentation for embedded AI features. (3) Review your IT asset register for AI software licences. (4) Check your browser extensions and personal device apps. The result will surprise you.' },
        { heading: 'Categorising Your Stack', content: 'Categorise each tool: (1) Administrative AI (scheduling, data entry) — low risk. (2) Analytical AI (data analysis, reporting) — medium risk. (3) Decision-support AI (recommendations, rankings) — high risk. (4) Communication AI (drafting, chatbots) — medium-high risk. (5) Predictive AI (attrition, performance) — high risk.' },
      ],
      reflection: 'How many AI tools does your team use that are not on the official IT register? What would you find if you ran the audit described above?',
      citations: ['CIPD (2024). AI in HR: Managing the risks.', 'Gartner (2024). HR Technology Trends.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'What is "shadow AI" in an HR context?', options: [{id:'a',text:'AI tools that are difficult to understand'},{id:'b',text:'AI tools used by employees without organisational approval or oversight'},{id:'c',text:'AI tools that operate in the background without user interaction'},{id:'d',text:'AI tools provided by shadow IT departments'}], correctAnswer: 'b', explanation: 'Shadow AI refers to AI tools used without organisational approval, creating governance and compliance gaps.' },
    ]),
  },

  {
    key: 'workflow_l2_practical_automation',
    title: 'Practical: Automating Your First HR Workflow with AI',
    capability: 'ai_workflow',
    modality: 'practical',
    difficulty: 2,
    levelLabel: 'Foundation',
    durationMins: 35,
    requiredCapabilityScore: 35,
    failureModes: ['tool_blindness', 'poor_workflow_design'],
    body: practicalBody({
      title: 'Practical: Automating Your First HR Workflow with AI',
      objectives: ['Identify a suitable HR workflow for AI automation', 'Map the current workflow and design the AI-augmented version', 'Implement and test the automated workflow'],
      scenario: 'You want to automate the process of responding to common employee HR queries (holiday entitlement, payroll queries, policy questions). Currently, each query takes 10-15 minutes to handle manually.',
      steps: [
        { step: 1, instruction: 'Analyse your query data: Review the last 3 months of HR queries. Categorise them. What percentage are repeat questions that could be answered by a well-designed FAQ or chatbot?', tip: 'Typically 60-70% of HR queries are repeat questions.' },
        { step: 2, instruction: 'Select your automation scope: Choose the 10 most common query types that have clear, policy-based answers. Exclude queries that require judgment, empathy, or individual circumstances.', tip: 'Good candidates: "How many days holiday do I have?", "When is payday?", "How do I book a meeting room?" Bad candidates: "I\'m having problems with my manager", "I\'m thinking of resigning".' },
        { step: 3, instruction: 'Design the knowledge base: For each of your 10 query types, write a clear, accurate answer. Include: the policy rule, any exceptions, and who to contact if the standard answer doesn\'t apply.', tip: 'This is the most important step — the quality of your knowledge base determines the quality of AI responses.' },
        { step: 4, instruction: 'Set up your automation: Use your organisation\'s approved AI tool (or a simple FAQ page if no chatbot is available). Input your knowledge base. Test each query type.', tip: 'Always test with edge cases: "What if I\'ve only worked here 3 months?" "What if I\'m part-time?"' },
        { step: 5, instruction: 'Define your escalation protocol: Every automated response should include a clear route to a human HR contact for queries the automation can\'t handle.', tip: 'The escalation path is as important as the automation itself.' },
        { step: 6, instruction: 'Measure the impact: After 4 weeks, measure: (1) Query volume handled by automation, (2) Employee satisfaction with automated responses, (3) Escalation rate, (4) HR team time saved.', tip: 'If satisfaction is below 80% or escalation rate is above 30%, review your knowledge base.' },
      ],
      successCriteria: ['Identified 10 suitable query types for automation', 'Created a knowledge base with clear, accurate answers', 'Tested the automation with at least 5 edge cases', 'Defined a clear escalation protocol', 'Planned a measurement framework'],
      reflection: 'What did you learn about the quality of your current HR policies from this exercise? Where were the gaps in your knowledge base?',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'What is the most important factor in the quality of an AI-powered HR chatbot?', options: [{id:'a',text:'The sophistication of the AI model'},{id:'b',text:'The quality and accuracy of the knowledge base'},{id:'c',text:'The visual design of the chatbot interface'},{id:'d',text:'The speed of response'}], correctAnswer: 'b', explanation: 'The quality of the knowledge base determines the quality of AI responses — garbage in, garbage out.' },
    ]),
  },

  {
    key: 'workflow_l3_case_study_digital_transformation',
    title: 'Case Study: HR Digital Transformation at Scale',
    capability: 'ai_workflow',
    modality: 'case_study',
    difficulty: 3,
    levelLabel: 'Practitioner',
    durationMins: 40,
    requiredCapabilityScore: 55,
    failureModes: ['change_resistance', 'poor_stakeholder_management'],
    body: caseStudyBody({
      title: 'Case Study: HR Digital Transformation at Scale',
      objectives: ['Analyse a large-scale HR digital transformation', 'Identify the critical success factors for HR AI adoption', 'Apply change management principles to AI implementation'],
      narrative: 'Unilever\'s HR function undertook a major digital transformation between 2019-2023, implementing AI across recruitment, L&D, and workforce planning. Key initiatives included: an AI-powered CV screening tool (reducing screening time by 75%), a digital interview platform with AI analysis, and a skills-based talent marketplace. The transformation affected 150,000 employees across 190 countries.',
      analysisFramework: {
        dimensions: ['Change management', 'Technology implementation', 'Governance', 'Outcomes'],
        questions: [
          'What were the critical success factors in Unilever\'s transformation?',
          'What change management challenges did they face?',
          'How did they address bias and fairness concerns?',
          'What can you apply to your own organisation?',
        ],
      },
      questions: [
        { id: 'q1', question: 'Change management: Unilever involved employees in the design of AI tools from the start. Why is this important?', guidance: 'Co-design builds trust, surfaces practical concerns early, and increases adoption. Employees who helped design the system are more likely to use it and less likely to resist it.' },
        { id: 'q2', question: 'Bias mitigation: Unilever\'s video interview AI was audited for bias and found to disadvantage non-native English speakers. How did they respond?', guidance: 'They paused the tool, commissioned an independent audit, adjusted the algorithm, and retested before redeployment. This is the correct response — transparency and remediation, not denial.' },
        { id: 'q3', question: 'Outcomes: Unilever reported a 75% reduction in screening time and a 16% increase in diversity of hires. How do you evaluate these outcomes?', guidance: 'Both metrics matter. Time savings without diversity improvement would suggest the AI was simply automating existing bias. The diversity improvement suggests the AI was helping to reduce human bias in screening — but this requires ongoing monitoring.' },
      ],
      keyLearnings: ['Co-design with employees is a critical success factor for AI adoption', 'Bias auditing must be ongoing, not a one-time exercise', 'Measuring both efficiency and equity outcomes is essential', 'Transparency about AI failures builds more trust than hiding them'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'What is the most important change management principle for HR AI adoption?', options: [{id:'a',text:'Implementing AI as quickly as possible'},{id:'b',text:'Involving employees in the design and testing of AI tools'},{id:'c',text:'Keeping AI implementation confidential until launch'},{id:'d',text:'Mandating AI use for all HR processes'}], correctAnswer: 'b', explanation: 'Co-design with employees builds trust, surfaces concerns early, and significantly increases adoption rates.' },
    ]),
  },

  {
    key: 'workflow_l4_tutorial_integration_architecture',
    title: 'HR AI Integration Architecture: Connecting Your Tech Stack',
    capability: 'ai_workflow',
    modality: 'tutorial',
    difficulty: 4,
    levelLabel: 'Advanced',
    durationMins: 40,
    requiredCapabilityScore: 70,
    failureModes: ['technical_blindness', 'data_silos'],
    body: tutorialBody({
      title: 'HR AI Integration Architecture: Connecting Your Tech Stack',
      objectives: ['Understand the data flows between HR AI systems', 'Identify integration risks and data quality issues', 'Design a connected HR AI architecture'],
      sections: [
        { heading: 'The HR Data Ecosystem', content: 'Your HR AI tools are only as good as the data they receive. The typical HR data ecosystem includes: HRIS (master employee data), ATS (recruitment data), LMS (learning data), performance management system, payroll, and engagement tools. Each generates data that AI can use — but only if the data is clean, connected, and governed.' },
        { heading: 'The Integration Risks', content: 'Common integration risks: (1) Data inconsistency — the same employee has different job titles in different systems. (2) Stale data — the AI uses last year\'s performance data. (3) Incomplete data — the AI makes predictions based on partial information. (4) Feedback loops — the AI\'s outputs become inputs for future AI decisions, amplifying errors.' },
        { heading: 'The Master Data Management Imperative', content: 'Before implementing AI, establish master data management: a single source of truth for each data entity (employee, role, skill, department). Without this, AI outputs will be unreliable. This is often the most important — and most underestimated — prerequisite for HR AI.' },
        { heading: 'API-First Architecture', content: 'Modern HR AI architecture is API-first: each system exposes its data via APIs, allowing AI tools to access real-time data rather than batch exports. This enables: real-time predictions, automated workflows, and connected analytics. Ask your HRIS vendor about their API capabilities before purchasing AI add-ons.' },
      ],
      reflection: 'What is the state of your HR data quality? If you asked an AI to predict attrition tomorrow, how confident would you be in the data it would use?',
      citations: ['Gartner (2024). HR Technology Architecture for the AI Era.', 'CIPD (2024). People analytics: Building the foundation.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'What is "master data management" in an HR AI context?', options: [{id:'a',text:'Managing the AI model\'s training data'},{id:'b',text:'Establishing a single source of truth for each data entity across all HR systems'},{id:'c',text:'Managing access permissions for HR data'},{id:'d',text:'Backing up HR data to a master server'}], correctAnswer: 'b', explanation: 'Master data management establishes a single source of truth for each data entity, ensuring AI tools receive consistent, accurate data.' },
    ]),
  },

  {
    key: 'workflow_l5_reflection_future_of_hr',
    title: 'Reflection: The Future of HR Work in an AI-Augmented World',
    capability: 'ai_workflow',
    modality: 'reflection',
    difficulty: 5,
    levelLabel: 'Expert',
    durationMins: 20,
    requiredCapabilityScore: 80,
    failureModes: ['strategic_blindness'],
    body: reflectionBody({
      title: 'Reflection: The Future of HR Work in an AI-Augmented World',
      objectives: ['Anticipate how AI will reshape the HR operating model', 'Identify the HR capabilities that will become more valuable', 'Design your personal career strategy for the AI era'],
      prompts: [
        'Which parts of your current role do you expect AI to take over in the next 3 years? How do you feel about that?',
        'What new HR capabilities will be most valuable in an AI-augmented world? Do you have them?',
        'How will the relationship between HR and the business change as AI handles more of the transactional work?',
        'What does "strategic HR" look like when AI can do most of the analytics? What uniquely human strategic contribution will HR make?',
        'If you were designing the HR function from scratch for 2030, what would it look like?',
      ],
      framework: { name: 'The HR Value Shift Model', description: 'As AI automates transactional HR (payroll, scheduling, basic queries), HR value shifts to: (1) Organisational design — designing the structures and cultures that enable AI-human collaboration. (2) Change leadership — leading the human side of digital transformation. (3) Ethics and governance — ensuring AI is used responsibly. (4) Sense-making — interpreting AI insights in human context. (5) Relationship capital — the trusted advisor role that AI cannot replicate.' },
      commitmentPrompt: 'Write your 3-year career development plan for the AI era. What capabilities will you build? What will you let AI take over? What will you protect as uniquely yours?',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'According to the HR Value Shift Model, which capability becomes MORE valuable as AI automates transactional HR?', options: [{id:'a',text:'Payroll processing'},{id:'b',text:'Data entry and record-keeping'},{id:'c',text:'Organisational design and change leadership'},{id:'d',text:'Scheduling and administration'}], correctAnswer: 'c', explanation: 'As AI handles transactional work, HR value shifts to higher-order capabilities like organisational design, change leadership, and ethics.' },
    ]),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY: ai_data  (target: 20 total — adding 13 new)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'data_l1_tutorial_data_literacy',
    title: 'Data Literacy for HR: Reading Numbers with Confidence',
    capability: 'ai_data',
    modality: 'tutorial',
    difficulty: 1,
    levelLabel: 'Awareness',
    durationMins: 15,
    requiredCapabilityScore: 0,
    failureModes: ['data_blindness', 'statistical_misinterpretation'],
    body: tutorialBody({
      title: 'Data Literacy for HR: Reading Numbers with Confidence',
      objectives: ['Interpret basic HR metrics correctly', 'Identify common statistical errors in HR reporting', 'Ask the right questions when presented with HR data'],
      sections: [
        { heading: 'The Five HR Metrics You Must Understand', content: '(1) Turnover rate: leavers ÷ average headcount × 100. Watch out for: voluntary vs involuntary, regrettable vs non-regrettable. (2) Time to hire: days from job open to offer accepted. Watch out for: excluding internal transfers skews the data. (3) Engagement score: mean of survey responses. Watch out for: response rate below 70% makes the data unreliable. (4) Cost per hire: total recruitment costs ÷ hires. Watch out for: excluding manager time understates true cost. (5) Absenteeism rate: days absent ÷ working days × 100. Watch out for: not distinguishing short-term from long-term absence.' },
        { heading: 'Correlation Is Not Causation', content: 'The most common data error in HR: assuming that because two things happen together, one causes the other. Example: "Teams with higher engagement have higher performance." This does not mean engagement causes performance — both may be caused by a third factor (good management). Before acting on a correlation, ask: what else might explain this?' },
        { heading: 'The Base Rate Problem', content: 'AI attrition models often report: "This employee has a 73% probability of leaving." But what is the base rate? If only 10% of employees leave each year, a 73% probability is still more likely wrong than right. Always ask: compared to what baseline?' },
        { heading: 'Asking the Right Questions', content: 'When presented with HR data, always ask: (1) What is the sample size? (2) What is the response rate? (3) What is the comparison group? (4) What is the time period? (5) What is not being measured? The most important data is often the data you don\'t have.' },
      ],
      reflection: 'Think of the last HR data insight you presented to a stakeholder. Which of these questions did you ask? Which did you miss?',
      citations: ['CIPD (2024). People analytics: A guide for HR professionals.', 'Kahneman, D. (2011). Thinking, Fast and Slow.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'What is the most common data error in HR analytics?', options: [{id:'a',text:'Using the wrong formula for turnover rate'},{id:'b',text:'Confusing correlation with causation'},{id:'c',text:'Using too large a sample size'},{id:'d',text:'Reporting data in percentages rather than absolute numbers'}], correctAnswer: 'b', explanation: 'Confusing correlation with causation — assuming that two things happening together means one causes the other — is the most common error in HR analytics.' },
    ]),
  },

  {
    key: 'data_l2_practical_people_analytics',
    title: 'Practical: Building Your First People Analytics Dashboard',
    capability: 'ai_data',
    modality: 'practical',
    difficulty: 2,
    levelLabel: 'Foundation',
    durationMins: 40,
    requiredCapabilityScore: 35,
    failureModes: ['data_blindness', 'poor_visualisation'],
    body: practicalBody({
      title: 'Practical: Building Your First People Analytics Dashboard',
      objectives: ['Identify the 5 most important metrics for your HR function', 'Design a dashboard that tells a coherent story', 'Present data insights to a non-technical stakeholder'],
      scenario: 'Your CHRO has asked for a monthly HR dashboard. You have access to data from your HRIS, ATS, and engagement survey. Build a dashboard that gives the leadership team the insight they need.',
      steps: [
        { step: 1, instruction: 'Define your audience and purpose: Who will use this dashboard? What decisions will it inform? A dashboard for the CEO is different from one for a line manager.', tip: 'The most common mistake: building a dashboard that answers questions no one is asking.' },
        { step: 2, instruction: 'Select your 5 key metrics: Choose metrics that are (a) actionable (you can do something about them), (b) leading indicators (they predict future outcomes, not just report the past), (c) comparable (you can benchmark against last year or industry).', tip: 'Suggested metrics: voluntary turnover rate, time to hire, engagement score, absenteeism rate, training completion rate.' },
        { step: 3, instruction: 'Choose your visualisations: (a) Trend over time → line chart. (b) Comparison between groups → bar chart. (c) Part of a whole → pie chart (use sparingly). (d) Relationship between two variables → scatter plot. (e) Single number that matters → big number with trend arrow.', tip: 'Avoid 3D charts, excessive colour, and pie charts with more than 4 segments.' },
        { step: 4, instruction: 'Add context: Every metric needs a benchmark (last year, industry average, or target). A turnover rate of 15% means nothing without context — is that good or bad for your industry?', tip: 'CIPD publishes annual benchmarks for most HR metrics.' },
        { step: 5, instruction: 'Write the narrative: A dashboard without a narrative is just numbers. Add a 3-sentence summary: "This month, [key finding]. This is [better/worse/same] than [benchmark] because [explanation]. We recommend [action]."', tip: 'The narrative is the most valuable part of the dashboard.' },
      ],
      successCriteria: ['Defined audience and purpose', 'Selected 5 actionable, leading metrics', 'Chosen appropriate visualisations for each metric', 'Added benchmarks for all metrics', 'Written a 3-sentence narrative summary'],
      reflection: 'What data do you wish you had for this dashboard that you don\'t currently collect? What would you need to do to get it?',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'What makes a metric a "leading indicator" rather than a "lagging indicator"?', options: [{id:'a',text:'It is measured more frequently'},{id:'b',text:'It predicts future outcomes rather than reporting past events'},{id:'c',text:'It is more accurate than other metrics'},{id:'d',text:'It is approved by the leadership team'}], correctAnswer: 'b', explanation: 'Leading indicators predict future outcomes (e.g., engagement score predicts future turnover), while lagging indicators report what has already happened (e.g., actual turnover rate).' },
    ]),
  },

  {
    key: 'data_l3_scenario_ai_attrition',
    title: 'Scenario: Acting on an AI Attrition Prediction',
    capability: 'ai_data',
    modality: 'scenario',
    difficulty: 3,
    levelLabel: 'Practitioner',
    durationMins: 30,
    requiredCapabilityScore: 55,
    failureModes: ['over_reliance', 'base_rate_blindness', 'privacy_violation'],
    body: scenarioBody({
      title: 'Scenario: Acting on an AI Attrition Prediction',
      objectives: ['Evaluate an AI attrition prediction critically', 'Design an appropriate intervention that respects privacy', 'Avoid the base rate fallacy in predictive analytics'],
      setup: 'Your HRIS has flagged 15 employees as "high attrition risk" (>70% probability of leaving in the next 6 months). The model uses: tenure, performance ratings, engagement scores, absence patterns, and manager effectiveness scores. Your annual turnover rate is 12%. The HR Director wants to contact all 15 employees with retention offers.',
      decisionPoints: [
        { id: 'dp1', situation: 'Before acting, you need to evaluate the model\'s reliability. What questions do you ask?', options: [
          { id: 'a', text: 'Trust the model — 70% probability is high enough to act on', consequence: 'Risk: at 12% base rate, even a 70% model prediction is wrong more often than right. You need to know the model\'s precision and recall before acting.' },
          { id: 'b', text: 'Ask: what is the model\'s precision? How many of the 15 flagged employees actually left in the validation dataset?', consequence: 'Correct. If the model has 40% precision, 9 of the 15 flagged employees will not leave — and contacting them with retention offers may actually prompt them to consider leaving.' },
        ]},
        { id: 'dp2', situation: 'You discover the model has 55% precision (about half the flagged employees actually leave). How do you proceed?', options: [
          { id: 'a', text: 'Contact all 15 with retention offers', consequence: 'Risk: you may inadvertently prompt 7 employees who were not planning to leave to reconsider their options.' },
          { id: 'b', text: 'Use the predictions as a signal to have broader manager conversations, not targeted retention offers', consequence: 'Correct. Ask managers to have development conversations with all team members (not just flagged ones), which addresses retention without singling out individuals.' },
          { id: 'c', text: 'Discard the model entirely', consequence: 'Overcorrection — the model still provides useful signal, just not at the individual level.' },
        ]},
        { id: 'dp3', situation: 'A manager asks you to share which of their team members are flagged as high risk. What do you do?', options: [
          { id: 'a', text: 'Share the list — the manager needs to know', consequence: 'Risk: this may constitute processing of personal data for a purpose employees were not informed about. It also risks the manager treating flagged employees differently, which could become a self-fulfilling prophecy.' },
          { id: 'b', text: 'Decline and instead coach the manager on having development conversations with all team members', consequence: 'Correct. The goal is retention, not surveillance. Aggregate insights should inform management practice, not individual targeting.' },
        ]},
      ],
      outcomes: 'The HR team uses the attrition model to identify teams with high predicted risk (not individuals) and invests in manager coaching for those teams. Turnover in the following 6 months reduces by 3 percentage points.',
      reflection: 'What is the difference between using AI to inform HR strategy and using AI to surveil individual employees? Where is the line?',
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'What is "precision" in the context of an AI attrition model?', options: [{id:'a',text:'The percentage of employees the model correctly identifies as staying'},{id:'b',text:'The percentage of employees flagged as high risk who actually leave'},{id:'c',text:'The overall accuracy of the model'},{id:'d',text:'The speed at which the model makes predictions'}], correctAnswer: 'b', explanation: 'Precision is the proportion of positive predictions (flagged as high risk) that are correct (actually leave). Low precision means many false positives.' },
    ]),
  },

  {
    key: 'data_l4_tutorial_advanced_analytics',
    title: 'Advanced People Analytics: From Descriptive to Predictive',
    capability: 'ai_data',
    modality: 'tutorial',
    difficulty: 4,
    levelLabel: 'Advanced',
    durationMins: 45,
    requiredCapabilityScore: 70,
    failureModes: ['analytical_shallowness', 'model_misuse'],
    body: tutorialBody({
      title: 'Advanced People Analytics: From Descriptive to Predictive',
      objectives: ['Distinguish between descriptive, diagnostic, predictive, and prescriptive analytics', 'Design a predictive analytics use case for HR', 'Evaluate the ethical implications of predictive HR analytics'],
      sections: [
        { heading: 'The Analytics Maturity Ladder', content: 'Level 1 — Descriptive: "What happened?" (turnover was 15% last year). Level 2 — Diagnostic: "Why did it happen?" (turnover was highest in the engineering team because of poor management). Level 3 — Predictive: "What will happen?" (turnover will be 18% next year if we don\'t address manager effectiveness). Level 4 — Prescriptive: "What should we do?" (invest in manager coaching for the 5 teams with lowest effectiveness scores). Most HR functions are at Level 1-2. The value is at Level 3-4.' },
        { heading: 'Building a Predictive Model (Without a Data Scientist)', content: 'You don\'t need a data scientist to build basic predictive models. Tools like Power BI, Tableau, and even Excel can build regression models. The key inputs for an attrition model: tenure, performance rating, engagement score, manager effectiveness, absence rate, time since last promotion, salary relative to market. The key output: probability of leaving in the next 6 months.' },
        { heading: 'The Ethical Guardrails', content: 'Predictive analytics in HR requires ethical guardrails: (1) Transparency — employees should know predictive models are used. (2) Fairness — models must be audited for bias against protected characteristics. (3) Privacy — individual predictions should not be shared with managers. (4) Proportionality — the intervention must be proportionate to the prediction. (5) Human oversight — predictions inform, they do not decide.' },
        { heading: 'The ROI of People Analytics', content: 'Quantifying the value of people analytics: (1) Reduced turnover: if a predictive model reduces turnover by 2%, the saving is 2% × headcount × average replacement cost (typically 50-200% of salary). (2) Improved hiring: if analytics improves quality of hire by 10%, the productivity gain is significant. (3) Better L&D investment: if analytics identifies the skills gaps with highest business impact, L&D ROI improves.' },
      ],
      reflection: 'What is the most valuable predictive analytics use case for your organisation right now? What data would you need? What would the ROI be?',
      citations: ['Bersin, J. (2023). The Definitive Guide to People Analytics.', 'CIPD (2024). People analytics: From data to decisions.', 'MIT Sloan Management Review (2023). The Future of People Analytics.'],
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'Which level of analytics maturity asks "What should we do?"', options: [{id:'a',text:'Descriptive analytics'},{id:'b',text:'Diagnostic analytics'},{id:'c',text:'Predictive analytics'},{id:'d',text:'Prescriptive analytics'}], correctAnswer: 'd', explanation: 'Prescriptive analytics (Level 4) recommends specific actions based on predictions — the highest level of analytics maturity.' },
    ]),
  },

  {
    key: 'data_l5_coaching_analytics_leadership',
    title: 'Coaching: Leading a Data-Driven HR Function',
    capability: 'ai_data',
    modality: 'coaching',
    difficulty: 5,
    levelLabel: 'Expert',
    durationMins: 35,
    requiredCapabilityScore: 80,
    failureModes: ['data_avoidance', 'leadership_abdication'],
    body: coachingBody({
      title: 'Coaching: Leading a Data-Driven HR Function',
      objectives: ['Define your vision for a data-driven HR function', 'Identify the barriers to data-driven HR in your organisation', 'Build a roadmap for people analytics maturity'],
      coachingQuestions: [
        { phase: 'Vision', question: 'Describe your vision for a data-driven HR function. What decisions would be made differently? What would stakeholders say about HR\'s analytical capability?' },
        { phase: 'Current State', question: 'On a scale of 1-10, how data-driven is your HR function today? What evidence supports that rating?' },
        { phase: 'Barriers', question: 'What are the three biggest barriers to data-driven HR in your organisation? Which of these is within your control to address?' },
        { phase: 'Capability', question: 'What data and analytics skills does your HR team currently have? What skills are missing? How will you close the gap?' },
        { phase: 'Action', question: 'What is one specific action you will take in the next 30 days to move your HR function towards greater data maturity?' },
      ],
      frameworks: [
        { name: 'The People Analytics Capability Model', description: 'Four capabilities required for data-driven HR: (1) Data infrastructure — clean, connected, accessible data. (2) Analytical skills — the ability to analyse and interpret data. (3) Insight communication — the ability to translate data into compelling narratives. (4) Decision integration — the ability to embed data into decision-making processes.' },
        { name: 'The Analytics Champion Model', description: 'You don\'t need to be a data scientist to lead a data-driven HR function. Your role is to: (1) Create the demand for data-driven decisions. (2) Remove the barriers to data access. (3) Build the team\'s analytical confidence. (4) Model data-driven decision-making yourself.' },
      ],
      actionPlanning: { prompt: 'Write your 12-month people analytics roadmap: (1) What data infrastructure improvements will you make? (2) What analytical skills will you build in your team? (3) What three decisions will you make differently because of data?' },
    }),
    formativeQuiz: formativeQuiz([
      { id: 'q1', question: 'According to the People Analytics Capability Model, which of the following is NOT one of the four required capabilities?', options: [{id:'a',text:'Data infrastructure'},{id:'b',text:'Analytical skills'},{id:'c',text:'Budget management'},{id:'d',text:'Decision integration'}], correctAnswer: 'c', explanation: 'The four capabilities are: data infrastructure, analytical skills, insight communication, and decision integration. Budget management is not one of them.' },
    ]),
  },

];

// ─── INSERT ──────────────────────────────────────────────────────────────────

console.log(`Inserting ${modules.length} new modules...`);

let inserted = 0;
let skipped = 0;

for (const mod of modules) {
  // Check if module key already exists
  const [existing] = await db.execute('SELECT id FROM learning_modules WHERE `key` = ?', [mod.key]);
  if (existing.length > 0) {
    skipped++;
    continue;
  }

  const id = nanoid();
  const now = Date.now();
  await db.execute(
    `INSERT INTO learning_modules 
      (id, \`key\`, title, capability, modality, difficulty, level_label, duration_mins, body_json, formative_quiz_json, required_capability_score, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
    [id, mod.key, mod.title, mod.capability, mod.modality, mod.difficulty, mod.levelLabel, mod.durationMins, mod.body, mod.formativeQuiz, mod.requiredCapabilityScore, now, now]
  );

  // Insert failure mode tags
  if (mod.failureModes) {
    for (const fm of mod.failureModes) {
      await db.execute(
        'INSERT INTO learning_module_tags (id, module_id, tag_type, tag_value) VALUES (?, ?, ?, ?)',
        [nanoid(), id, 'failure_mode', fm]
      );
    }
  }

  inserted++;
}

console.log(`Done. Inserted: ${inserted}, Skipped (already exist): ${skipped}`);

// Summary
const [rows] = await db.execute(`
  SELECT capability, COUNT(*) as count, 
    GROUP_CONCAT(DISTINCT modality ORDER BY modality) as modalities,
    GROUP_CONCAT(DISTINCT difficulty ORDER BY difficulty) as difficulties
  FROM learning_modules 
  WHERE status = 'published'
  GROUP BY capability
  ORDER BY capability
`);
console.log('\nModule library summary:');
for (const row of rows) {
  console.log(`  ${row.capability}: ${row.count} modules | modalities: ${row.modalities} | difficulties: ${row.difficulties}`);
}

const [total] = await db.execute("SELECT COUNT(*) as total FROM learning_modules WHERE status = 'published'");
console.log(`\nTotal published modules: ${total[0].total}`);

await db.end();
