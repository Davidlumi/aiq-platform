/**
 * Hand-fix the 6 confirmed genuine-drift questions in the DB.
 * 
 * The 6 questions are in 3 modules:
 * 1. ai-wfd-quiz-01 (4 questions: 2x customer support, 2x retail inventory)
 * 2. ai-int-prac-01 (1 question: Senior Data Scientist job description prompt)
 * 3. ai-eval-tut-01 (1 question: Marketing Manager recruitment platform)
 * 
 * Fix: Replace the non-HR scenario with an equivalent HR/compensation scenario
 * while preserving the learning objective (AI workflow design, prompt construction,
 * AI output evaluation).
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

async function getModule(moduleId) {
  const [rows] = await db.execute(
    'SELECT id, title, formative_quiz_json FROM learning_modules WHERE `key` = ?',
    [moduleId]
  );
  if (!rows.length) throw new Error(`Module not found: ${moduleId}`);
  return rows[0];
}

async function updateModule(moduleId, quizJson) {
  await db.execute(
    'UPDATE learning_modules SET formative_quiz_json = ? WHERE `key` = ?',
    [JSON.stringify(quizJson), moduleId]
  );
  console.log(`✓ Updated ${moduleId}`);
}

// ============================================================
// FIX 1: ai-wfd-quiz-01 — replace 4 non-HR questions
// ============================================================
async function fixAiWfdQuiz01() {
  const mod = await getModule('ai-wfd-quiz-01');
  const quiz = typeof mod.formative_quiz_json === 'string' ? JSON.parse(mod.formative_quiz_json) : mod.formative_quiz_json;
  
  const questions = quiz?.questions || [];
  
  // The 4 drift questions (by stem keywords):
  // Q: customer support workflow → replace with HR onboarding workflow
  // Q: retail inventory management → replace with employee performance review workflow
  // Q: customer support chatbot → replace with HR benefits enquiry chatbot
  // Q: retail inventory AI objectives → replace with employee attrition prediction objectives
  
  const replacements = [
    {
      // Customer support workflow → HR onboarding workflow
      stemKeyword: 'customer support workflow',
      newStem: 'An HR team is designing an AI-powered onboarding workflow to help new employees complete compliance training and access key resources within their first 30 days. Which of the following is the MOST critical initial step in designing this AI workflow?',
      newOptions: [
        { text: 'Selecting the most advanced large language model available for content generation.', correct: false },
        { text: 'Mapping the current onboarding journey to identify high-friction steps where AI can add the most value.', correct: true },
        { text: 'Automating all onboarding tasks immediately to reduce HR administrative burden.', correct: false },
        { text: 'Purchasing an off-the-shelf onboarding platform and customising it later.', correct: false }
      ],
      newFeedback: 'Mapping the current onboarding journey is the most critical first step because it ensures the AI workflow is designed around real employee needs and pain points, rather than automating processes that may already be broken. Selecting a model before understanding the use case risks building the wrong solution. Full automation without mapping creates new friction. Off-the-shelf platforms may not address the specific gaps identified through journey mapping.'
    },
    {
      // Retail inventory → employee performance review workflow
      stemKeyword: 'retail inventory',
      newStem: 'An HR function is implementing an AI-assisted performance review workflow to help managers provide more consistent and bias-reduced feedback. The design team is debating whether to prioritise speed of completion or depth of developmental insight in the AI\'s output. Which aspect of AI workflow design does this scenario primarily highlight?',
      newOptions: [
        { text: 'Data security and access control for sensitive performance data.', correct: false },
        { text: 'The trade-off between efficiency optimisation and output quality in AI workflow design.', correct: true },
        { text: 'The need to integrate the AI with the existing HRIS platform.', correct: false },
        { text: 'Compliance with employment law regarding performance documentation.', correct: false }
      ],
      newFeedback: 'The scenario highlights the trade-off between efficiency and quality — a core AI workflow design consideration. Prioritising speed may produce shallow feedback that managers ignore; prioritising depth may slow adoption. Data security, HRIS integration, and compliance are important but are not the primary design tension illustrated here.'
    },
    {
      // Customer support chatbot → HR benefits chatbot
      stemKeyword: 'customer support team is integrating',
      newStem: 'An HR team is integrating an AI chatbot to handle employee queries about benefits, payroll, and leave policies. The initial deployment shows the chatbot handles simple queries well but struggles with nuanced questions about eligibility and exceptions. What is the MOST effective next step to improve the chatbot\'s performance on complex queries?',
      newOptions: [
        { text: 'Replace the chatbot with a human HR representative for all complex queries.', correct: false },
        { text: 'Expand the chatbot\'s knowledge base with structured decision trees for eligibility rules and exception handling.', correct: true },
        { text: 'Limit the chatbot to only answering the 20 most frequently asked questions.', correct: false },
        { text: 'Implement a sentiment analysis layer to detect frustration and escalate to a human.', correct: false }
      ],
      newFeedback: 'Expanding the knowledge base with structured decision trees for eligibility rules directly addresses the root cause: the chatbot lacks the structured logic needed for nuanced policy questions. Replacing with humans negates the self-service purpose. Limiting scope avoids the problem rather than solving it. Sentiment escalation is a useful fallback but does not improve the chatbot\'s ability to answer complex queries.'
    },
    {
      // Retail inventory AI objectives → employee attrition prediction objectives
      stemKeyword: 'retail company is implementing an AI',
      newStem: 'An HR analytics team is implementing an AI-driven employee attrition prediction system. The team is debating whether to optimise the model for maximum predictive accuracy or for interpretability — the ability for HR business partners to understand why the model flags specific employees as flight risks. Which AI design principle should be prioritised?',
      newOptions: [
        { text: 'Scalability, to process the entire employee population in real time.', correct: false },
        { text: 'Interpretability, so HR business partners can understand and act on the AI\'s predictions with confidence.', correct: true },
        { text: 'Predictive accuracy, to maximise the number of flight risks correctly identified.', correct: false },
        { text: 'Automation, to minimise human intervention in the attrition management process.', correct: false }
      ],
      newFeedback: 'Interpretability should be prioritised because HR business partners need to understand why an employee is flagged as a flight risk before they can take appropriate action. A highly accurate but opaque model may produce predictions that managers distrust or misuse. Scalability matters but is not the primary design tension here. Maximum predictive accuracy without interpretability can lead to inappropriate interventions. Full automation removes the human judgment that is essential for sensitive employment decisions.'
    }
  ];
  
  let fixCount = 0;
  for (const q of questions) {
    const stem = (q.stem || q.question || '').toLowerCase();
    for (const rep of replacements) {
      if (stem.includes(rep.stemKeyword.toLowerCase())) {
        q.stem = rep.newStem;
        q.question = rep.newStem;
        q.options = rep.newOptions.map((o, i) => ({
          id: String.fromCharCode(65 + i),
          text: o.text,
          correct: o.correct
        }));
        q.feedback = rep.newFeedback;
        q.explanation = rep.newFeedback;
        fixCount++;
        console.log(`  Fixed: ${rep.stemKeyword} → HR scenario`);
        break;
      }
    }
  }
  
  quiz.questions = questions;
  
  console.log(`ai-wfd-quiz-01: fixed ${fixCount}/4 drift questions`);
  await updateModule('ai-wfd-quiz-01', quiz);
}

// ============================================================
// FIX 2: ai-int-prac-01 — replace Senior Data Scientist job description prompt
// ============================================================
async function fixAiIntPrac01() {
  const mod = await getModule('ai-int-prac-01');
  const quiz = typeof mod.formative_quiz_json === 'string' ? JSON.parse(mod.formative_quiz_json) : mod.formative_quiz_json;
  
  const questions = quiz?.questions || [];
  
  let fixCount = 0;
  for (const q of questions) {
    const stem = (q.stem || q.question || '').toLowerCase();
    if (stem.includes('senior data scientist') || stem.includes('job description') && stem.includes('data scientist')) {
      q.stem = 'An HR specialist needs to use an AI assistant to draft a pay equity analysis report for a specific job family. The report must identify pay gaps by gender and ethnicity, flag statistical outliers, and recommend corrective actions. Which of the following prompts is most likely to produce a useful, actionable report?';
      q.question = q.stem;
      q.options = [
        { id: 'A', text: 'Write a pay equity report for our HR team.', correct: false },
        { id: 'B', text: 'Analyse the attached salary data for the "Senior Analyst" job family. Identify pay gaps by gender and ethnicity using a regression-controlled methodology. Flag any individual outliers more than 10% below the predicted pay line. Recommend specific corrective actions for each flagged case, noting the estimated cost of correction.', correct: true },
        { id: 'C', text: 'Tell me if there are any pay gaps in our company.', correct: false },
        { id: 'D', text: 'Generate a pay equity report. Make it detailed and professional.', correct: false }
      ];
      q.feedback = 'Option B is correct because it provides the AI with the specific job family, the analytical methodology (regression-controlled), the threshold for flagging outliers, and the required output format (individual recommendations with cost estimates). This level of specificity is essential for producing an actionable pay equity report. Option A is too vague and will produce a generic template. Option C lacks the data context and methodology. Option D provides no analytical direction.';
      q.explanation = q.feedback;
      fixCount++;
      console.log(`  Fixed: Senior Data Scientist job description → pay equity analysis prompt`);
    }
  }
  
  quiz.questions = questions;
  
  console.log(`ai-int-prac-01: fixed ${fixCount}/1 drift question`);
  await updateModule('ai-int-prac-01', quiz);
}

// ============================================================
// FIX 3: ai-eval-tut-01 — replace Marketing Manager recruitment platform question
// ============================================================
async function fixAiEvalTut01() {
  const mod = await getModule('ai-eval-tut-01');
  const quiz = typeof mod.formative_quiz_json === 'string' ? JSON.parse(mod.formative_quiz_json) : mod.formative_quiz_json;
  
  const questions = quiz?.questions || [];
  
  let fixCount = 0;
  for (const q of questions) {
    const stem = (q.stem || q.question || '').toLowerCase();
    if (stem.includes('marketing manager') || (stem.includes('recruitment platform') && stem.includes('financial modeling'))) {
      q.stem = 'An AI-powered compensation benchmarking tool recommends a salary band of £45,000–£52,000 for a "Senior HR Analyst" role, citing "market data from 847 comparable roles." When you review the output, you notice the band is 18% below your organisation\'s current pay for this role. What aspect of AI output evaluation is most relevant here?';
      q.question = q.stem;
      q.options = [
        { id: 'A', text: 'Checking whether the AI\'s market data sources are current and geographically relevant to your organisation.', correct: true },
        { id: 'B', text: 'Verifying that the AI\'s user interface is accessible and easy to navigate.', correct: false },
        { id: 'C', text: 'Confirming that the AI tool has been approved by your IT security team.', correct: false },
        { id: 'D', text: 'Ensuring the AI\'s output is formatted correctly for your HRIS system.', correct: false }
      ];
      q.feedback = 'Checking the currency and geographic relevance of the AI\'s market data sources is the most relevant evaluation step. An 18% gap between the AI\'s recommendation and your current pay could indicate that the AI is drawing on outdated data, data from a different geography, or a different job level definition. Evaluating the data sources is the first step in determining whether the output is trustworthy. UI accessibility, IT security approval, and HRIS formatting are important but are not the primary evaluation concern when the output itself appears anomalous.';
      q.explanation = q.feedback;
      fixCount++;
      console.log(`  Fixed: Marketing Manager recruitment platform → compensation benchmarking tool`);
    }
  }
  
  quiz.questions = questions;
  
  console.log(`ai-eval-tut-01: fixed ${fixCount}/1 drift question`);
  await updateModule('ai-eval-tut-01', quiz);
}

// ============================================================
// RUN ALL FIXES
// ============================================================
console.log('Fixing 6 confirmed genuine-drift questions...\n');

try {
  await fixAiWfdQuiz01();
  await fixAiIntPrac01();
  await fixAiEvalTut01();
  console.log('\n✓ All drift questions fixed.');
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
} finally {
  await db.end();
}
