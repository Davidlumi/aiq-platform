/**
 * regenerate-rich-modules.mjs
 *
 * Regenerates body_json for all published learning modules using the new rich schema.
 * Uses a two-pass approach: first generates core content, then adds modality-specific content.
 *
 * Run: node scripts/regenerate-rich-modules.mjs [--capability=ai_workflow_design] [--dry-run] [--limit=5]
 */

import mysql from 'mysql2/promise';

// ─── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const CAPABILITY_FILTER = process.argv.find(a => a.startsWith('--capability='))?.split('=')[1];
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '999', 10);

const LLM_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const LLM_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!LLM_API_URL || !LLM_API_KEY) {
  console.error('ERROR: BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY must be set');
  process.exit(1);
}

// ─── Capability metadata ──────────────────────────────────────────────────────

const CAPABILITY_META = {
  ai_workflow_design: {
    label: 'AI Workflow Design',
    description: 'Analyse HR processes and design AI-augmented workflows that preserve human oversight and integrate AI at appropriate decision points.',
    context: 'HR professionals design hiring, onboarding, performance, and employee relations workflows with AI augmentation.',
    domain: 'HR process automation, talent acquisition, performance management, workforce planning',
  },
  ai_interaction: {
    label: 'AI Interaction',
    description: 'Communicate effectively with AI systems through well-crafted prompts, iterative refinement, and understanding of model capabilities.',
    context: 'HR professionals use AI daily for job descriptions, CV analysis, policy documents, and development plans.',
    domain: 'Prompt engineering, AI tool usage, iterative refinement, output quality control',
  },
  ai_output_evaluation: {
    label: 'AI Output Evaluation',
    description: 'Critically assess AI-generated content for accuracy, bias, appropriateness, and fitness for purpose in HR contexts.',
    context: 'AI outputs in HR carry significant risk — biased job descriptions or inaccurate performance summaries have legal and human consequences.',
    domain: 'Quality assurance, bias detection, fact-checking, regulatory compliance, risk management',
  },
  ai_ethics_trust: {
    label: 'AI Ethics & Trust',
    description: 'Apply ethical frameworks to AI use in HR, maintain employee trust, ensure fairness, and navigate the regulatory landscape.',
    context: 'HR sits at the intersection of AI capability and human dignity — balancing efficiency with employee rights and transparency.',
    domain: 'GDPR, EU AI Act, algorithmic fairness, employee consent, transparency, governance',
  },
  ai_change_leadership: {
    label: 'AI Change Leadership',
    description: 'Lead organisational change as AI transforms the workplace — building capability, managing resistance, and sustaining momentum.',
    context: 'HR leaders help organisations navigate AI adoption through change management, stakeholder communication, and culture building.',
    domain: 'Change management, stakeholder engagement, capability building, culture change, communication',
  },
  appropriateness: {
    label: 'AI Appropriateness',
    description: 'Judge when AI should and should not be used in HR — recognising situations where human judgement or legal requirements demand a human-led approach.',
    context: 'Disciplinary conversations, mental health support, redundancy discussions, and sensitive investigations require human presence.',
    domain: 'Decision-making frameworks, risk assessment, human-centred design, legal compliance',
  },
  execution: {
    label: 'AI Execution',
    description: 'Implement AI solutions in HR contexts — selecting tools, deploying them, monitoring performance, and iterating based on outcomes.',
    context: 'Execution bridges AI strategy and operational reality, moving from pilot to scale while managing risks.',
    domain: 'Implementation, vendor management, change management, performance monitoring, iteration',
  },
  judgement: {
    label: 'AI Judgement',
    description: 'Make sound decisions about AI use in complex, ambiguous HR situations where rules alone are insufficient.',
    context: 'Many AI decisions in HR involve competing values, incomplete information, and significant human consequences.',
    domain: 'Decision-making, ethical reasoning, risk assessment, stakeholder management',
  },
  governance: {
    label: 'AI Governance',
    description: 'Design and implement governance frameworks for AI use in HR — policies, oversight mechanisms, audit trails, and accountability structures.',
    context: 'Organisations need robust governance to ensure accountability, manage risk, and demonstrate compliance with emerging regulations.',
    domain: 'Policy design, audit, compliance, risk management, regulatory frameworks',
  },
  data_interpretation: {
    label: 'Data Interpretation',
    description: 'Interpret AI-generated analytics, workforce data, and predictive models to inform HR decisions.',
    context: 'HR professionals work with AI-generated dashboards, predictive attrition models, and workforce analytics.',
    domain: 'Analytics, workforce planning, predictive modelling, data literacy, decision support',
  },
  workforce_ai_readiness: {
    label: 'Workforce AI Readiness',
    description: 'Assess and develop AI readiness across the workforce — identifying gaps, designing interventions, and measuring progress.',
    context: 'HR is responsible for ensuring the organisation has the AI capabilities it needs through assessment and learning design.',
    domain: 'Capability assessment, learning design, workforce planning, change management',
  },
};

// ─── LLM helper ──────────────────────────────────────────────────────────────

async function invokeLLM(messages, responseFormat, maxTokens = 4000) {
  const body = {
    messages,
    model: 'gpt-4o',
    max_tokens: maxTokens,
  };
  if (responseFormat) body.response_format = responseFormat;

  const res = await fetch(`${LLM_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API error ${res.status}: ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in LLM response');
  return content;
}

// ─── Generate module content ──────────────────────────────────────────────────

async function generateModuleContent(mod) {
  const cap = CAPABILITY_META[mod.capability] ?? {
    label: mod.capability,
    description: `${mod.capability} for HR professionals`,
    context: 'Applied in HR contexts',
    domain: 'HR practice',
  };

  const levelLabel = mod.difficulty === 1 ? 'Foundation' : mod.difficulty === 2 ? 'Developing' : mod.difficulty === 3 ? 'Practitioner' : 'Expert';
  const isAdvanced = mod.difficulty >= 3;

  const MODALITY_GUIDANCE = {
    tutorial: 'A structured learning module with reading sections, worked example, and quiz questions to check understanding.',
    quiz: 'A knowledge assessment module with pre-reading sections followed by challenging quiz questions testing application.',
    scenario: 'A decision-based scenario module with context sections and a branching decision scenario with realistic choices.',
    case_study: 'A case study analysis module with context sections and a detailed real-world case with analysis questions.',
    reflection: 'A guided reflection module with concept sections to prime thinking, then deep reflection prompts.',
    coaching: 'A structured coaching module with concept sections and a coaching framework with phases and questions.',
    practical: 'A hands-on practical exercise with concept sections and a step-by-step exercise with success criteria.',
    video: 'A video-based module with rich transcript content sections, worked example, and reflection prompts.',
  };

  const systemPrompt = `You are a world-class instructional designer creating enterprise learning content for senior HR professionals at FTSE 100 companies. Write with the depth of a Harvard Business School case study and the practical focus of CIPD professional development materials.

Requirements:
- Each concept section: 200-350 words of substantive, expert content
- Use specific, realistic HR scenarios (not generic examples)
- Write in professional but engaging prose
- Include concrete, actionable guidance
${isAdvanced ? '- Reference real research from MIT, Accenture, CIPD, McKinsey, Deloitte, WEF' : ''}
- Total module should take 10-15 minutes to complete`;

  // ─── Pass 1: Core content (introduction + concept sections + worked example) ───
  const corePrompt = `Create the core learning content for this HR module:

Title: "${mod.title}"
Subtitle: "${mod.subtitle ?? ''}"
Capability: ${cap.label} — ${cap.description}
HR Context: ${cap.context}
Modality: ${mod.modality} — ${MODALITY_GUIDANCE[mod.modality] ?? ''}
Level: ${mod.difficulty}/4 (${levelLabel})
Duration: ${mod.duration_mins} minutes

Return JSON with EXACTLY this structure:
{
  "introduction": {
    "hook": "2-3 sentence compelling opening that creates urgency or curiosity about this topic",
    "whyItMatters": "2-3 sentences on the real-world stakes for HR professionals",
    "learningObjectives": ["objective 1", "objective 2", "objective 3", "objective 4"],
    "estimatedMinutes": ${mod.duration_mins}
  },
  "conceptSections": [
    {
      "heading": "Section heading",
      "body": "200-350 word substantive explanation of this concept",
      "keyPoints": ["key point 1", "key point 2", "key point 3"],
      "example": "Specific real-world HR example illustrating this concept",
      "researchNote": "${isAdvanced ? 'A relevant research finding or statistic from CIPD, Accenture, MIT, McKinsey' : ''}"
    }
  ],
  "workedExample": {
    "title": "Example title",
    "scenario": "2-3 paragraph realistic HR scenario",
    "analysis": "2-3 paragraph expert analysis",
    "outcome": "What happened and why",
    "lessonLearned": "The key transferable lesson"
  },
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3", "takeaway 4"],
  "furtherReading": [
    {
      "title": "Publication title",
      "author": "Author or organisation",
      "source": "Publication name",
      "year": 2024,
      "relevance": "One sentence on why this is worth reading"
    }
  ]
}

Include 3 concept sections. Make the content substantive and specific to ${cap.label} in HR contexts.`;

  const coreContent = await invokeLLM(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: corePrompt },
    ],
    { type: 'json_object' },
    4000
  );

  let body;
  try {
    body = JSON.parse(coreContent);
  } catch (e) {
    throw new Error(`Failed to parse core content JSON: ${e.message}`);
  }

  // Ensure required fields exist
  if (!body.introduction) body.introduction = { hook: '', whyItMatters: '', learningObjectives: [], estimatedMinutes: mod.duration_mins };
  if (!body.conceptSections) body.conceptSections = [];
  if (!body.workedExample) body.workedExample = { title: '', scenario: '', analysis: '', outcome: '', lessonLearned: '' };
  if (!body.keyTakeaways) body.keyTakeaways = [];
  if (!body.furtherReading) body.furtherReading = [];

  // ─── Pass 2: Modality-specific content ────────────────────────────────────────

  if (mod.modality === 'quiz' || mod.modality === 'tutorial') {
    const quizPrompt = `Create 5 multiple-choice quiz questions for this HR module:

Title: "${mod.title}"
Capability: ${cap.label}
Level: ${levelLabel}

Questions must test genuine understanding and application, not just recall. Make them challenging but fair.

Return JSON:
{
  "quizQuestions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this is correct and why others are wrong"
    }
  ]
}`;

    const quizContent = await invokeLLM(
      [
        { role: 'system', content: 'You are an expert assessment designer for HR professional development. Return valid JSON only.' },
        { role: 'user', content: quizPrompt },
      ],
      { type: 'json_object' },
      2000
    );
    const quizData = JSON.parse(quizContent);
    body.quizQuestions = quizData.quizQuestions ?? [];
  }

  if (mod.modality === 'scenario' || mod.modality === 'case_study') {
    const scenarioPrompt = `Create a realistic decision scenario for this HR module:

Title: "${mod.title}"
Capability: ${cap.label}
Context: ${cap.context}
Level: ${levelLabel}

Return JSON:
{
  "decisionScenario": {
    "situation": "3-4 paragraph realistic HR situation requiring a decision",
    "yourRole": "The learner's specific role in this scenario",
    "stakeholders": "Key stakeholders involved",
    "decisionQuestion": "The specific decision to make",
    "choices": [
      {
        "text": "Choice description (1-2 sentences)",
        "outcome": "2-3 sentences on what happens if you choose this",
        "isOptimal": false,
        "reasoning": "Expert reasoning on why this is/isn't the best choice"
      }
    ],
    "bestPractice": "The expert best practice for this type of situation"
  }
}

Include 3-4 choices. Make the situation specific and realistic for ${cap.label} in HR.`;

    const scenarioContent = await invokeLLM(
      [
        { role: 'system', content: 'You are an expert HR case study designer. Return valid JSON only.' },
        { role: 'user', content: scenarioPrompt },
      ],
      { type: 'json_object' },
      2500
    );
    const scenarioData = JSON.parse(scenarioContent);
    body.decisionScenario = scenarioData.decisionScenario ?? null;
  }

  if (mod.modality === 'reflection' || mod.modality === 'coaching') {
    const reflectionPrompt = `Create deep reflection prompts for this HR module:

Title: "${mod.title}"
Capability: ${cap.label}
Level: ${levelLabel}
${mod.modality === 'coaching' ? 'This is a coaching module — use the GROW model structure.' : ''}

Return JSON:
{
  "reflectionPrompts": [
    {
      "prompt": "The reflection question",
      "guidance": "Brief guidance on how to approach this reflection"
    }
  ]${mod.modality === 'coaching' ? `,
  "coachingFramework": {
    "model": "GROW",
    "phases": [
      {
        "phase": "Goal",
        "purpose": "Establish what the learner wants to achieve",
        "questions": ["question 1", "question 2"]
      }
    ]
  }` : ''}
}

Include 5-6 reflection prompts. Make them genuinely thought-provoking and specific to ${cap.label}.`;

    const reflectionContent = await invokeLLM(
      [
        { role: 'system', content: 'You are an expert coaching and reflection facilitator for HR professionals. Return valid JSON only.' },
        { role: 'user', content: reflectionPrompt },
      ],
      { type: 'json_object' },
      2000
    );
    const reflectionData = JSON.parse(reflectionContent);
    body.reflectionPrompts = reflectionData.reflectionPrompts ?? [];
    if (reflectionData.coachingFramework) body.coachingFramework = reflectionData.coachingFramework;
  }

  if (mod.modality === 'practical') {
    const practicalPrompt = `Create a hands-on practical exercise for this HR module:

Title: "${mod.title}"
Capability: ${cap.label}
Context: ${cap.context}
Level: ${levelLabel}

Return JSON:
{
  "practicalExercise": {
    "title": "Exercise title",
    "context": "The workplace context for this exercise",
    "steps": [
      {
        "stepNumber": 1,
        "instruction": "Clear instruction for this step",
        "tip": "Expert tip for this step"
      }
    ],
    "successCriteria": ["criterion 1", "criterion 2", "criterion 3"],
    "commonMistakes": ["mistake 1", "mistake 2"]
  }
}

Include 5-7 steps. Make it practical and immediately applicable in an HR role.`;

    const practicalContent = await invokeLLM(
      [
        { role: 'system', content: 'You are an expert HR learning designer. Return valid JSON only.' },
        { role: 'user', content: practicalPrompt },
      ],
      { type: 'json_object' },
      2000
    );
    const practicalData = JSON.parse(practicalContent);
    body.practicalExercise = practicalData.practicalExercise ?? null;
  }

  return body;
}

// ─── Generate formative quiz ──────────────────────────────────────────────────

async function generateFormativeQuiz(mod) {
  const cap = CAPABILITY_META[mod.capability] ?? { label: mod.capability };
  const levelLabel = mod.difficulty === 1 ? 'Foundation' : mod.difficulty === 2 ? 'Developing' : mod.difficulty === 3 ? 'Practitioner' : 'Expert';

  const prompt = `Create 3 formative quiz questions for this HR learning module:

Module: "${mod.title}"
Capability: ${cap.label}
Level: ${levelLabel}
Modality: ${mod.modality}

Questions should test genuine understanding and application. Make them challenging but fair.

Return JSON:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this is correct"
    }
  ]
}`;

  const content = await invokeLLM(
    [
      { role: 'system', content: 'You are an expert assessment designer. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    { type: 'json_object' },
    1500
  );

  const data = JSON.parse(content);
  return data.questions ? data : { questions: [] };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Rich Module Content Regeneration');
  console.log(`   DRY_RUN: ${DRY_RUN}`);
  console.log(`   CAPABILITY: ${CAPABILITY_FILTER ?? 'all'}`);
  console.log(`   LIMIT: ${LIMIT}`);
  console.log('');

  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  let query = 'SELECT id, `key`, title, subtitle, capability, modality, difficulty, duration_mins FROM learning_modules WHERE status = "published"';
  const params = [];
  if (CAPABILITY_FILTER) {
    query += ' AND capability = ?';
    params.push(CAPABILITY_FILTER);
  }
  query += ` ORDER BY capability, difficulty LIMIT ${LIMIT}`;

  const [modules] = await conn.execute(query, params);
  console.log(`📚 Found ${modules.length} modules to process\n`);

  let processed = 0;
  let failed = 0;

  for (const mod of modules) {
    const label = `[${mod.key}] ${mod.title.substring(0, 50)} (${mod.modality}, L${mod.difficulty})`;
    try {
      process.stdout.write(`  Generating ${label}... `);

      const bodyContent = await generateModuleContent(mod);
      const quizContent = await generateFormativeQuiz(mod);

      if (DRY_RUN) {
        console.log('✓ (dry run)');
        const preview = {
          intro_hook: bodyContent.introduction?.hook?.substring(0, 100),
          sections: bodyContent.conceptSections?.length,
          has_scenario: !!bodyContent.decisionScenario,
          has_quiz: !!bodyContent.quizQuestions,
          has_reflection: !!bodyContent.reflectionPrompts,
          has_practical: !!bodyContent.practicalExercise,
        };
        console.log('    Preview:', JSON.stringify(preview));
      } else {
        await conn.execute(
          'UPDATE learning_modules SET body_json = ?, formative_quiz_json = ?, updated_at = ? WHERE id = ?',
          [JSON.stringify(bodyContent), JSON.stringify(quizContent), Date.now(), mod.id]
        );
        console.log('✓');
      }

      processed++;

      // Rate limit: 1.5 second delay between modules
      await new Promise(r => setTimeout(r, 1500));

    } catch (err) {
      console.log(`✗ FAILED: ${err.message.substring(0, 100)}`);
      failed++;
    }
  }

  await conn.end();

  console.log(`\n✅ Complete: ${processed} processed, ${failed} failed`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
