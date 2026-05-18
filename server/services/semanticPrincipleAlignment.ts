/**
 * LLM-Semantic Principle Alignment Engine
 *
 * Replaces the keyword-based scorePrincipleAlignment() with an LLM call that
 * applies genuine semantic understanding to detect nuanced conflicts — e.g.
 * "zero-hour worker monitoring" violating "frontline first" without any keyword
 * overlap.
 *
 * Design:
 *  - Single batched LLM call: all initiatives + all principles + all won't-dos
 *    in one structured JSON request (avoids N×52 individual calls).
 *  - Structured output via response_format json_schema for determinism.
 *  - Temperature 0 for maximum consistency.
 *  - Cache key: SHA-256 hash of (principles[], wontDoItems[]) — invalidated
 *    when Sarah edits principles or won't-dos, not on every gate re-fire.
 *  - Fallback: if the LLM call fails for any reason, falls back to the keyword
 *    engine (scorePrincipleAlignment) silently. Gate still clears.
 *  - Output shape: same as InitiativeOutputCard["principleAlignment"] plus an
 *    optional rationale field (new — existing tests don't assert on it).
 */

import { createHash } from "crypto";
import { invokeLLM } from "../_core/llm";
import { INITIATIVE_LIBRARY } from "../../shared/initiativeLibrary";
import { scorePrincipleAlignment, type InitiativeOutputCard } from "./fitImpactEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SemanticAlignmentResult = NonNullable<InitiativeOutputCard["principleAlignment"]> & {
  /** LLM-generated rationale (100-200 words) explaining the alignment decision */
  rationale?: string;
};

export type SemanticAlignmentMap = Record<string, SemanticAlignmentResult>;

// ─── Cache key ────────────────────────────────────────────────────────────────

/**
 * Compute a stable cache key from the principles and won't-do items.
 * Sorted to be order-independent (Sarah may reorder principles without
 * triggering a new LLM call).
 */
export function computeAlignmentCacheKey(
  principles: string[],
  wontDoItems: string[],
): string {
  const sorted = {
    p: [...principles].sort(),
    w: [...wontDoItems].sort(),
  };
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

// ─── LLM prompt builder ───────────────────────────────────────────────────────

function buildPrompt(
  initiativeIds: string[],
  principles: string[],
  wontDoItems: string[],
): string {
  // Build initiative context: id + label + description for each
  const initiativeContext = initiativeIds
    .map((id) => {
      const def = INITIATIVE_LIBRARY.find((i) => i.id === id);
      if (!def) return `${id}: (unknown initiative)`;
      return `${id}: "${def.label}" — ${def.description}`;
    })
    .join("\n");

  const principlesContext = principles.length > 0
    ? principles.map((p, i) => `${i + 1}. ${p}`).join("\n")
    : "(none set)";

  const wontDoContext = wontDoItems.length > 0
    ? wontDoItems.map((w, i) => `${i + 1}. ${w}`).join("\n")
    : "(none set)";

  return `You are an expert HR strategy analyst evaluating whether AI initiatives align with or conflict with an organisation's stated guiding principles and "won't do" commitments.

GUIDING PRINCIPLES:
${principlesContext}

"WON'T DO" COMMITMENTS (hard exclusions):
${wontDoContext}

INITIATIVES TO EVALUATE:
${initiativeContext}

For each initiative, evaluate:
1. Does it conflict with any "Won't Do" commitment? Even semantic/conceptual conflicts count — you do not need keyword overlap. If yes → ranking = "violates", score = 0.
2. If no conflict: how well does it align with the guiding principles? Consider the spirit and intent of each principle, not just surface keywords.
   - score >= 0.7 → ranking = "aligned"
   - score < 0.7 → ranking = "mixed"
   - score = 0.5 if no principles are set (neutral default)

Return a JSON array with one entry per initiative, in the same order as the INITIATIVES list.
Each entry must have:
- initiativeId: string (exact ID from the list)
- ranking: "aligned" | "mixed" | "violates"
- score: number between 0.0 and 1.0
- alignedPrinciples: string[] (principle texts that support this initiative; empty if violates)
- violatedPrinciples: string[] (won't-do texts that conflict; empty if aligned/mixed)
- rationale: string (2-4 sentences explaining your reasoning, specific to this initiative and these principles)

Be precise and specific. Do not use generic language. Reference the actual principle or won't-do text in your rationale.`;
}

// ─── JSON schema for structured output ───────────────────────────────────────

const ALIGNMENT_RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "principle_alignment_results",
    strict: true,
    schema: {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              initiativeId: { type: "string" },
              ranking: { type: "string", enum: ["aligned", "mixed", "violates"] },
              score: { type: "number" },
              alignedPrinciples: { type: "array", items: { type: "string" } },
              violatedPrinciples: { type: "array", items: { type: "string" } },
              rationale: { type: "string" },
            },
            required: ["initiativeId", "ranking", "score", "alignedPrinciples", "violatedPrinciples", "rationale"],
            additionalProperties: false,
          },
        },
      },
      required: ["results"],
      additionalProperties: false,
    },
  },
};

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Score principle alignment for a list of initiatives using LLM semantic
 * understanding. Returns a map of initiativeId → SemanticAlignmentResult.
 *
 * Falls back to the keyword engine for any initiative that the LLM fails to
 * return a result for.
 *
 * @param initiativeIds - IDs of initiatives to score (typically all non-HARD_GATE_FAIL results)
 * @param principles - Principle title strings
 * @param wontDoItems - Won't-do text strings
 */
export async function scoreSemanticPrincipleAlignment(
  initiativeIds: string[],
  principles: string[],
  wontDoItems: string[],
): Promise<SemanticAlignmentMap> {
  if (initiativeIds.length === 0) return {};

  // If no principles and no won't-dos, return neutral defaults without LLM call
  if (principles.length === 0 && wontDoItems.length === 0) {
    const map: SemanticAlignmentMap = {};
    for (const id of initiativeIds) {
      map[id] = { ranking: "mixed", score: 0.5, alignedPrinciples: [], violatedPrinciples: [] };
    }
    return map;
  }

  try {
    const prompt = buildPrompt(initiativeIds, principles, wontDoItems);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an expert HR strategy analyst. Respond only with valid JSON matching the requested schema. Be precise and specific in your analysis.",
        },
        { role: "user", content: prompt },
      ],
      response_format: ALIGNMENT_RESPONSE_SCHEMA,
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(
      typeof content === "string" ? content : JSON.stringify(content),
    ) as { results: Array<{ initiativeId: string; ranking: string; score: number; alignedPrinciples: string[]; violatedPrinciples: string[]; rationale: string }> };

    const map: SemanticAlignmentMap = {};

    for (const item of parsed.results) {
      // Validate ranking enum
      const ranking = (["aligned", "mixed", "violates"].includes(item.ranking)
        ? item.ranking
        : "mixed") as "aligned" | "mixed" | "violates";

      // Clamp score
      const score = Math.max(0, Math.min(1, Number(item.score) || 0));

      map[item.initiativeId] = {
        ranking,
        score,
        alignedPrinciples: Array.isArray(item.alignedPrinciples) ? item.alignedPrinciples : [],
        violatedPrinciples: Array.isArray(item.violatedPrinciples) ? item.violatedPrinciples : [],
        rationale: typeof item.rationale === "string" ? item.rationale : undefined,
      };
    }

    // Fill in any initiatives the LLM missed with keyword fallback
    for (const id of initiativeIds) {
      if (!map[id]) {
        const def = INITIATIVE_LIBRARY.find((i) => i.id === id);
        map[id] = scorePrincipleAlignment(
          id,
          def?.label ?? id,
          def?.category ?? "",
          principles,
          wontDoItems,
        );
      }
    }

    return map;
  } catch (err) {
    // LLM call failed — fall back to keyword engine for all initiatives
    console.error("[semanticPrincipleAlignment] LLM call failed, falling back to keyword engine:", err);
    return keywordFallbackMap(initiativeIds, principles, wontDoItems);
  }
}

/**
 * Keyword-engine fallback: produces a SemanticAlignmentMap using the existing
 * deterministic scorePrincipleAlignment() for every initiative.
 */
export function keywordFallbackMap(
  initiativeIds: string[],
  principles: string[],
  wontDoItems: string[],
): SemanticAlignmentMap {
  const map: SemanticAlignmentMap = {};
  for (const id of initiativeIds) {
    const def = INITIATIVE_LIBRARY.find((i) => i.id === id);
    map[id] = scorePrincipleAlignment(
      id,
      def?.label ?? id,
      def?.category ?? "",
      principles,
      wontDoItems,
    );
  }
  return map;
}
