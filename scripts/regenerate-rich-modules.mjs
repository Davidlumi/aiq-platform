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
const IDS_FILTER = process.argv.find(a => a.startsWith('--ids='))?.split('=')[1]?.split(',').map(s => s.trim()).filter(Boolean) ?? null;

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

[CONSTRAINT 1 — Section length — wall_of_text]
Each section body must be 80 words or fewer. If the material for one section would exceed 80 words, split it into two or more separate sections, each with its own heading. Never merge multiple ideas into one long block. Prefer more short sections over fewer long ones.
Total reading body: the combined word count of ALL section bodies must not exceed 280 words. Count the words in every section body and sum them before submitting. If the total exceeds 280 words, shorten each section until the total is at or below 280.
Self-check: Before submitting, count every section body word by word. If any single section exceeds 80 words, split it. If the total exceeds 280 words, trim the longest sections first.

[CONSTRAINT 2 — Sentence length and reading grade]
Write for a Flesch-Kincaid reading grade of 9 or below. Keep sentences to a maximum of 16 words. One idea per sentence. No sentence may contain more than one comma. Do not use semicolons. Avoid subordinate clauses — write direct subject-verb-object sentences.
Self-check (mandatory): After writing each section, re-read every sentence and count its words. Rewrite any sentence over 16 words as two shorter sentences. If a sentence contains more than one comma, split it. Do not submit a section until every sentence passes this check.

[CONSTRAINT 3 — Key points must add new information — no redundancy]
Each keyPoints item must state a concrete implication or action the reader should take — something not already written in the body. Do not summarise or restate body sentences. If a key point only repeats the paragraph, delete it and write a new one. Test: after reading the body, each key point should still tell the reader something new.
Anti-redundancy rule: No two key points may make the same underlying claim. No key point may begin with the same verb as another. If two points overlap, merge them into one or delete the weaker one.

[CONSTRAINT 4 — Jargon and acronyms]
Define every technical acronym in plain words on its first use in the module — e.g. "applicant tracking system (the software that stores and filters job applications, often shortened to ATS)". Never use an acronym before defining it.
Banned corporate filler words — replace with the plain alternative shown:
  leverage/utilise/utilize → use | facilitate → help | operationalise → put into practice | holistic → complete | paradigm → approach | robust → reliable | transformative → significant | seamless → smooth | scalable → expandable | actionable → practical | proactive → early | data-driven → evidence-based | streamline → simplify | foster → support | synergy → combined effect | value-add → useful | solution-oriented → practical
The reader is a compensation specialist, not a technologist; assume no prior AI vocabulary.

[CONSTRAINT 5 — Examples must be Reward/compensation specific]
Every example, scenario, and illustration must center on compensation and reward work — pay, salary benchmarking, pay bands and grading, bonus and incentive design, or pay equity. Do not use recruitment, hiring, résumé-screening, onboarding, or performance-review examples; these target the wrong audience and will be rejected. If you reach for a hiring example, rewrite it as a pay or benchmarking example instead.
Self-check: Before submitting, scan every example and scenario. If it mentions candidates, applicants, job postings, or interviews, rewrite it as a pay or benchmarking scenario.

[CONSTRAINT 6 — Quiz feedback must explain why each wrong answer is wrong]
For every quiz question, the explanation field must contain exactly four sentences — one per answer option. Each sentence must name the option letter (A, B, C, or D) and state specifically why that option is correct or incorrect. Do not write a single combined explanation. Do not use vague phrases like "this is not the best answer" — state the specific flaw or the specific reason the correct answer is right.
Format: "Option B is correct because [specific reason]. Option A is wrong because [specific flaw]. Option C is wrong because [specific flaw]. Option D is wrong because [specific flaw]."

${isAdvanced ? '- Reference real research from MIT, Accenture, CIPD, McKinsey, Deloitte, WEF' : ''}
- Write in professional but engaging prose
- Include concrete, actionable guidance
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
      "body": "Substantive explanation of this concept — 100 words or fewer, sentences max 18 words, FK grade ≤10",
      "keyPoints": ["concrete implication or action NOT restated from the body", "another new implication", "another new action"],
      "example": "Specific compensation/reward example (pay, benchmarking, bonus, pay-equity) — NOT recruitment or onboarding",
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

Include 3 concept sections. Make the content substantive and specific to ${cap.label} in HR contexts. Remember: every example must be compensation/reward-specific (pay, benchmarking, bonus, pay-equity). Every section body must be 100 words or fewer. Every sentence must be 18 words or fewer. The combined word count of all three section bodies must not exceed 320 words total — count and verify before submitting.`;

  const coreContent = await invokeLLM(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: corePrompt },
    ],
    { type: 'json_object' },
    6000
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

CRITICAL CONSTRAINT — All questions must be compensation and reward specific:
Every question stem and every answer option must centre on compensation and reward work: pay, salary benchmarking, pay bands and grading, bonus and incentive design, or pay equity analysis. Do NOT use recruitment, hiring, résumé screening, candidate selection, onboarding, or talent acquisition examples. If you reach for a hiring example, rewrite it as a pay or benchmarking scenario instead. This constraint is mandatory — questions that test hiring knowledge instead of compensation knowledge will be rejected.

Return JSON:
{
  "quizQuestions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Exactly four sentences — one per answer option. Example format: 'Option B is correct because pay equity analysis requires comparing like-for-like roles. Option A is wrong because using market data alone ignores internal equity. Option C is wrong because adjusting all salaries equally does not address structural gaps. Option D is wrong because deferring the review does not resolve the underlying pay disparity.' Do not write a single combined explanation."
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

Include 3-4 choices. Make the situation specific and realistic for ${cap.label} in HR.
All examples and situations must reference compensation/reward contexts (pay, grading, benchmarking, bonus, or pay-equity) — not recruitment, onboarding, or performance management.
Define every technical acronym on first use (e.g. write "job evaluation (JE)" not just "JE").
Every sentence must be 18 words or fewer.`;

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

Include 5-6 reflection prompts. Make them genuinely thought-provoking and specific to ${cap.label}.
Ground each prompt in a compensation/reward context (pay, grading, benchmarking, bonus, or pay-equity) — not generic HR.
Define every technical acronym on first use.
Every sentence must be 18 words or fewer.`;

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

Include 5-7 steps. Make it practical and immediately applicable in an HR role.
All steps and context must reference compensation/reward work (pay, grading, benchmarking, bonus, or pay-equity) — not recruitment or performance management.
Define every technical acronym on first use.
Every sentence must be 18 words or fewer.`;

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

CRITICAL CONSTRAINT — All questions must be compensation and reward specific:
Every question stem and every answer option must centre on compensation and reward work: pay, salary benchmarking, pay bands and grading, bonus and incentive design, or pay equity analysis. Do NOT use recruitment, hiring, résumé screening, candidate selection, onboarding, or talent acquisition examples. If you reach for a hiring example, rewrite it as a pay or benchmarking scenario instead. This constraint is mandatory — questions that test hiring knowledge instead of compensation knowledge will be rejected.

Return JSON:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Exactly four sentences — one per answer option. Example format: 'Option B is correct because pay equity analysis requires comparing like-for-like roles. Option A is wrong because using market data alone ignores internal equity. Option C is wrong because adjusting all salaries equally does not address structural gaps. Option D is wrong because deferring the review does not resolve the underlying pay disparity.' Do not write a single combined explanation."
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

// ─── Post-processing helpers ─────────────────────────────────────────────────

/**
 * Deterministic filler stripper — mechanical backstop for CONSTRAINT 6.
 *
 * Replaces banned filler/corporate vocabulary with neutral alternatives.
 * Applied to all string values in the content object recursively.
 * The generation prompt bans these terms; this pass catches compliance drift.
 *
 * NOTE: This operates on generated content only. The audit allowlist is separate
 * and lives in the audit script — this does NOT affect what the audit checks.
 */
const FILLER_REPLACEMENTS = [
  // Corporate filler verbs
  [/\bleverag(e|es|ed|ing)\b/gi, (_, s) => ({ e: 'use', es: 'uses', ed: 'used', ing: 'using' }[s?.toLowerCase()] ?? 'use')],
  [/\butiliz(e|es|ed|ing)\b/gi, (_, s) => ({ e: 'use', es: 'uses', ed: 'used', ing: 'using' }[s?.toLowerCase()] ?? 'use')],
  [/\butilis(e|es|ed|ing)\b/gi, (_, s) => ({ e: 'use', es: 'uses', ed: 'used', ing: 'using' }[s?.toLowerCase()] ?? 'use')],
  [/\bstreamlin(e|es|ed|ing)\b/gi, (_, s) => ({ e: 'simplify', es: 'simplifies', ed: 'simplified', ing: 'simplifying' }[s?.toLowerCase()] ?? 'simplify')],
  [/\bfoster(s|ed|ing)?\b/gi, 'support'],
  [/\boptimiz(e|es|ed|ing)\b/gi, (_, s) => ({ e: 'improve', es: 'improves', ed: 'improved', ing: 'improving' }[s?.toLowerCase()] ?? 'improve')],
  [/\boptimis(e|es|ed|ing)\b/gi, (_, s) => ({ e: 'improve', es: 'improves', ed: 'improved', ing: 'improving' }[s?.toLowerCase()] ?? 'improve')],
  // Filler adjectives
  [/\brobust\b/gi, 'reliable'],
  [/\bholistic\b/gi, 'complete'],
  [/\bseamless\b/gi, 'smooth'],
  [/\btransformative\b/gi, 'significant'],
  [/\bproactive\b/gi, 'early'],
  [/\bscalable\b/gi, 'expandable'],
  [/\bactionable\b/gi, 'practical'],
  [/\bvalue-add\b/gi, 'useful'],
  [/\bsynerg(y|ies|istic)\b/gi, 'combined effect'],
  [/\bparadigm\b/gi, 'approach'],
  [/\bdata-driven\b/gi, 'evidence-based'],
  [/\bsolution-oriented\b/gi, 'practical'],
];

function stripFillerText(text) {
  if (typeof text !== 'string' || !text) return text;
  let result = text;
  for (const [pattern, replacement] of FILLER_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function stripFiller(obj) {
  if (typeof obj === 'string') return stripFillerText(obj);
  if (Array.isArray(obj)) return obj.map(stripFiller);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = stripFiller(v);
    }
    return out;
  }
  return obj;
}

/**
 * Deterministic sentence splitter — mechanical backstop for CONSTRAINT 2.
 *
 * For each sentence in the input text:
 * 1. Count words. If ≤18, leave it alone.
 * 2. If >18, find the last comma at or before word 18 and split there.
 * 3. If no comma is available, split at word 18 with a full stop.
 * Handles multiple sentences separated by '. ', '! ', '? '.
 */
function splitLongSentences(text) {
  if (!text) return text;
  if (typeof text !== 'string') return text; // guard against numbers/booleans from LLM

  // Tokenise: split on sentence boundaries (terminal punct + space + capital letter)
  // Using a greedy match that stops at the first sentence boundary.
  // This avoids splitting on 'payroll system.' mid-split when the next word is lowercase.
  const parts = [];
  let rem = text.trim();
  while (rem.length > 0) {
    const m = rem.match(/^(.*?[.!?])(?=\s+[A-Z]|$)/s);
    if (m) {
      parts.push(m[1].trim());
      rem = rem.slice(m[1].length).trim();
    } else {
      parts.push(rem.trim());
      break;
    }
  }

  const result = [];
  for (const sent of parts) {
    const words = sent.split(/\s+/);
    if (words.length <= 18) {
      result.push(sent);
      continue;
    }

    // Strategy 1: find the last comma at or before word 17 where remainder >= 4 words
    let splitAt = -1;
    for (let i = Math.min(17, words.length - 5); i >= 4; i--) {
      if (words[i].endsWith(',') && (words.length - i - 1) >= 4) {
        splitAt = i;
        break;
      }
    }

    if (splitAt !== -1) {
      const first = words.slice(0, splitAt + 1).join(' ').replace(/,$/, '.');
      const rest = words.slice(splitAt + 1).join(' ');
      const restCap = rest.charAt(0).toUpperCase() + rest.slice(1);
      result.push(first);
      result.push(splitLongSentences(restCap));
    } else {
      // Strategy 2: hard split — find the largest split point <=18 where remainder >= 4 words
      let hardSplit = 18;
      while (hardSplit > 4 && (words.length - hardSplit) < 4) {
        hardSplit--;
      }
      const first = words.slice(0, hardSplit).join(' ') + '.';
      const rest = words.slice(hardSplit).join(' ');
      const restCap = rest.charAt(0).toUpperCase() + rest.slice(1);
      result.push(first);
      result.push(splitLongSentences(restCap));
    }
  }

  return result.filter(Boolean).join(' ');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Rich Module Content Regeneration');
  console.log(`   DRY_RUN: ${DRY_RUN}`);
  console.log(`   CAPABILITY: ${CAPABILITY_FILTER ?? 'all'}`);
  console.log(`   IDS: ${IDS_FILTER ? IDS_FILTER.join(', ') : 'all'}`);
  console.log(`   LIMIT: ${LIMIT}`);
  console.log('');

  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  let query = 'SELECT id, `key`, title, subtitle, capability, modality, difficulty, duration_mins FROM learning_modules WHERE status = "published"';
  const params = [];
  if (IDS_FILTER && IDS_FILTER.length > 0) {
    query += ` AND \`key\` IN (${IDS_FILTER.map(() => '?').join(', ')})`;
    params.push(...IDS_FILTER);
  } else if (CAPABILITY_FILTER) {
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

      let bodyContent = await generateModuleContent(mod);
      const quizContent = await generateFormativeQuiz(mod);

      // ── Post-processing: deterministic sentence splitter ─────────────────────
      // Splits any sentence over 18 words at the last comma before word 18,
      // or at the 18th word boundary if no comma is available.
      // This is the mechanical backstop for CONSTRAINT 2 compliance.
      if (bodyContent.conceptSections) {
        bodyContent.conceptSections = bodyContent.conceptSections.map(section => ({
          ...section,
          body: splitLongSentences(section.body || ''),
        }));
      }
      if (bodyContent.introduction?.hook) {
        bodyContent.introduction.hook = splitLongSentences(bodyContent.introduction.hook);
      }
      if (bodyContent.introduction?.whyItMatters) {
        bodyContent.introduction.whyItMatters = splitLongSentences(bodyContent.introduction.whyItMatters);
      }

      // Extend splitter to all modality-specific content fields
      // decisionScenario (scenario / case_study)
      if (bodyContent.decisionScenario) {
        const ds = bodyContent.decisionScenario;
        if (ds.situation) ds.situation = splitLongSentences(ds.situation);
        if (ds.decisionQuestion) ds.decisionQuestion = splitLongSentences(ds.decisionQuestion);
        if (ds.yourRole) ds.yourRole = splitLongSentences(ds.yourRole);
        if (ds.stakeholders) ds.stakeholders = splitLongSentences(ds.stakeholders);
        if (ds.bestPractice) ds.bestPractice = splitLongSentences(ds.bestPractice);
        if (Array.isArray(ds.choices)) {
          ds.choices = ds.choices.map(c => ({
            ...c,
            text: splitLongSentences(c.text || ''),
            outcome: splitLongSentences(c.outcome || ''),
            reasoning: splitLongSentences(c.reasoning || ''),
          }));
        }
      }

      // reflectionPrompts + coachingFramework (reflection / coaching)
      if (Array.isArray(bodyContent.reflectionPrompts)) {
        bodyContent.reflectionPrompts = bodyContent.reflectionPrompts.map(p => ({
          ...p,
          prompt: splitLongSentences(p.prompt || ''),
          guidance: splitLongSentences(p.guidance || ''),
        }));
      }
      if (bodyContent.coachingFramework?.phases) {
        bodyContent.coachingFramework.phases = bodyContent.coachingFramework.phases.map(ph => ({
          ...ph,
          purpose: splitLongSentences(ph.purpose || ''),
          questions: (ph.questions || []).map(q => splitLongSentences(q)),
        }));
      }

      // practicalExercise (practical)
      if (bodyContent.practicalExercise) {
        const pe = bodyContent.practicalExercise;
        if (pe.context) pe.context = splitLongSentences(pe.context);
        if (Array.isArray(pe.steps)) {
          pe.steps = pe.steps.map(s => ({
            ...s,
            instruction: splitLongSentences(s.instruction || ''),
            tip: splitLongSentences(s.tip || ''),
          }));
        }
      }

      // ── Post-processing: deterministic filler stripper ──────────────────────
      // Removes banned filler words from all text fields after generation.
      // This is the mechanical backstop for CONSTRAINT 6 (no filler vocabulary).
      // The generation prompt instructs the LLM to avoid these terms; this pass
      // catches any that slip through. Replacements are context-neutral substitutes.
      bodyContent = stripFiller(bodyContent);

      // workedExample (all modalities)
      if (bodyContent.workedExample) {
        const we = bodyContent.workedExample;
        if (we.scenario) we.scenario = splitLongSentences(we.scenario);
        if (we.analysis) we.analysis = splitLongSentences(we.analysis);
        if (we.outcome) we.outcome = splitLongSentences(we.outcome);
        if (we.lessonLearned) we.lessonLearned = splitLongSentences(we.lessonLearned);
      }

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
      console.log(`   Stack: ${err.stack?.split('\n').slice(0, 5).join(' | ')}`);
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
