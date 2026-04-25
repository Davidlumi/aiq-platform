/**
 * Regenerates the specific failed module: ai-eval-prac-01
 */
import mysql from 'mysql2/promise';

const LLM_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const LLM_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function invokeLLM(messages, responseFormat, maxTokens = 3000) {
  const body = {
    model: 'gpt-4o',
    messages,
    max_tokens: maxTokens,
    ...(responseFormat ? { response_format: responseFormat } : {}),
  };
  const res = await fetch(`${LLM_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LLM API error ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [rows] = await conn.execute(
    'SELECT id, `key`, title, subtitle, capability, modality, difficulty FROM learning_modules WHERE `key` = ?',
    ['ai-eval-prac-01']
  );

  if (rows.length === 0) {
    console.log('Module not found');
    await conn.end();
    return;
  }

  const mod = rows[0];
  console.log('Regenerating:', mod.title);

  const levelLabel = mod.difficulty === 1 ? 'Foundation' : mod.difficulty === 2 ? 'Developing' : mod.difficulty === 3 ? 'Practitioner' : 'Expert';

  // Generate core content
  const corePrompt = `You are an expert HR learning designer creating a rich, substantive learning module for HR professionals.

Module: "${mod.title}"
Subtitle: "${mod.subtitle}"
Capability: AI Output Evaluation
Level: ${levelLabel}
Modality: Practical Exercise
Context: HR professionals need to critically assess AI-generated content for accuracy, bias, appropriateness, and fitness for purpose.

Create comprehensive content for this PRACTICAL EXERCISE module. This should take 15-20 minutes to complete.

Return JSON with this exact structure:
{
  "introduction": {
    "hook": "A compelling opening that immediately engages the learner",
    "whyItMatters": "Why this skill is critical for HR professionals today",
    "learningObjectives": ["objective 1", "objective 2", "objective 3", "objective 4"],
    "estimatedTime": "20 minutes"
  },
  "conceptSections": [
    {
      "heading": "Section heading",
      "body": "3-4 paragraphs of substantive content with real examples and research",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "example": "A concrete real-world example"
    }
  ],
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
  },
  "workedExample": {
    "title": "Worked example title",
    "scenario": "2-3 paragraph scenario description",
    "approach": "Step-by-step expert approach",
    "outcome": "What good looks like"
  },
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3", "takeaway 4"],
  "furtherReading": [
    {
      "title": "Resource title",
      "author": "Author name or organisation",
      "year": "2023",
      "type": "article",
      "summary": "Why this is worth reading"
    }
  ],
  "quizQuestions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this is correct and others are wrong"
    }
  ]
}

Include 2-3 concept sections, 5-7 practical steps, 4-5 quiz questions, 3-4 further reading items.`;

  const content = await invokeLLM(
    [
      { role: 'system', content: 'You are an expert HR learning designer. Return valid JSON only.' },
      { role: 'user', content: corePrompt },
    ],
    { type: 'json_object' },
    4000
  );

  const body = JSON.parse(content);

  await conn.execute(
    'UPDATE learning_modules SET body_json = ?, updated_at = ? WHERE id = ?',
    [JSON.stringify(body), Date.now(), mod.id]
  );

  console.log('✓ Module regenerated successfully');
  console.log('Keys:', Object.keys(body).join(', '));
  console.log('Practical steps:', body.practicalExercise?.steps?.length);
  console.log('Quiz questions:', body.quizQuestions?.length);

  await conn.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
