/**
 * AiQ Coach — Classifier Service
 * Constrained LLM that maps free-text user responses to structured option selections.
 * The conversational LLM NEVER scores — only this classifier does.
 * Addendum v1.1 §4
 */

import { invokeLLM } from "../_core/llm";
import type { ClassificationResult } from "./types";
import { CLASSIFIER_THRESHOLDS } from "./types";

export const CLASSIFIER_VERSION = "1.0.0";

export interface ClassificationInput {
  itemId: string;
  /** The original item prompt shown to the conversational LLM (NOT the options) */
  itemPrompt: string;
  /** The four structured options with their signal deltas */
  options: Array<{
    label: "A" | "B" | "C" | "D";
    text: string;
    signalDeltas: Record<string, number>;
  }>;
  /** The user's free-text response to the conversational question */
  userResponse: string;
  /** Optional: previous turns for context */
  conversationContext?: string;
}

const CLASSIFIER_SYSTEM_PROMPT = `You are a precise classification engine for an HR AI capability assessment.

Your ONLY job is to map a free-text response to the most appropriate structured option (A, B, C, or D) from the provided list.

Rules:
1. Select the option whose meaning and intent most closely matches the user's response.
2. Do NOT be influenced by politeness, length, or confidence of the response — focus on substance.
3. If the response is evasive, vague, or does not clearly match any option, select the closest option AND set confidence below 0.45.
4. If the response contradicts itself or seems inconsistent with the options, set confidence below 0.45.
5. Return ONLY valid JSON matching the schema. No other text.`;

export class ClassifierService {
  /**
   * Classify a free-text user response against structured options.
   * Returns a ClassificationResult with confidence, selected option, and signal deltas.
   */
  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const startMs = Date.now();

    const optionsText = input.options
      .map((o) => `Option ${o.label}: ${o.text}`)
      .join("\n");

    const userPrompt = `Assessment item: "${input.itemPrompt}"

Structured options:
${optionsText}

User's response: "${input.userResponse}"

${input.conversationContext ? `Recent conversation context:\n${input.conversationContext}\n` : ""}
Classify the user's response. Return JSON with this exact schema:
{
  "selectedOption": "A" | "B" | "C" | "D",
  "confidence": 0.0-1.0,
  "rationale": "brief explanation of why this option was selected"
}`;

    let selectedOption: "A" | "B" | "C" | "D" = "A";
    let confidence = 0.5;
    let rationale = "";
    let latencyMs = 0;

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "classification_result",
            strict: true,
            schema: {
              type: "object",
              properties: {
                selectedOption: {
                  type: "string",
                  enum: ["A", "B", "C", "D"],
                  description: "The selected option label",
                },
                confidence: {
                  type: "number",
                  description: "Confidence 0.0-1.0",
                },
                rationale: {
                  type: "string",
                  description: "Brief rationale",
                },
              },
              required: ["selectedOption", "confidence", "rationale"],
              additionalProperties: false,
            },
          },
        },
      });

      latencyMs = Date.now() - startMs;

      const rawContent = response?.choices?.[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent : null;
      if (content) {
        const parsed = JSON.parse(content);
        selectedOption = parsed.selectedOption as "A" | "B" | "C" | "D";
        confidence = Math.max(0, Math.min(1, parsed.confidence));
        rationale = parsed.rationale || "";
      }
    } catch (err) {
      console.error("[ClassifierService] Classification failed:", err);
      latencyMs = Date.now() - startMs;
      // Fall back to lowest confidence — will trigger human review
      confidence = 0.3;
    }

    // Look up signal deltas for the selected option
    const selectedOptionData = input.options.find((o) => o.label === selectedOption);
    const signalDeltas = selectedOptionData?.signalDeltas ?? {};

    return {
      itemId: input.itemId,
      selectedOption,
      confidence,
      signalDeltas,
      rationale,
      needsProbe: confidence >= CLASSIFIER_THRESHOLDS.PROBE && confidence < CLASSIFIER_THRESHOLDS.COMMIT,
      needsHumanReview: confidence < CLASSIFIER_THRESHOLDS.PROBE,
      classifierVersion: CLASSIFIER_VERSION,
      latencyMs,
    };
  }
}

export const classifierService = new ClassifierService();
