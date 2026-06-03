/**
 * Test script to verify the correct LLM endpoint URL and classify one question.
 * Run from the project root: node scripts/test-llm-classify.mjs
 */
import { invokeLLM } from '../server/_core/llm.ts';

const result = await invokeLLM({
  messages: [
    {
      role: 'user',
      content: `You are an HR learning content auditor. Classify this quiz question as ON-SUBJECT or OFF-SUBJECT for an HR professional learning platform.

MODULE: Knowledge Check: AI Workflow Design
DOMAIN: ai_workflow_design

QUESTION: A company is designing an AI-powered customer support workflow. They aim to reduce response times and improve customer satisfaction. Which of the following is the MOST critical initial step in designing this AI workflow?

CLASSIFICATION RULES:
- OFF-SUBJECT: The scenario is completely outside HR (customer support, retail inventory, marketing) AND the learning objective could be taught in any non-HR context.
- ON-SUBJECT: Everything else.

Respond with JSON: {"classification": "ON-SUBJECT" or "OFF-SUBJECT", "reason": "one sentence"}`
    }
  ],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'classification',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          classification: { type: 'string', enum: ['ON-SUBJECT', 'OFF-SUBJECT'] },
          reason: { type: 'string' }
        },
        required: ['classification', 'reason'],
        additionalProperties: false
      }
    }
  },
  max_tokens: 128
});

console.log('LLM response:', JSON.stringify(result.choices[0].message.content, null, 2));
