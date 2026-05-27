/**
 * Initiative Discovery Engine
 *
 * Searches the web for emerging HR/Reward AI initiatives, extracts structured
 * candidates with source URLs, and deduplicates against the existing library.
 *
 * Architecture:
 * 1. Generate search queries targeting HR AI innovation (Gartner, CIPD, Josh Bersin, etc.)
 * 2. Use LLM with structured output to extract initiative candidates from search results
 * 3. Deduplicate candidates against INITIATIVE_LIBRARY using semantic similarity
 * 4. Persist candidates to discovery_candidates table for human review
 */

import { nanoid } from "nanoid";
import { invokeLLM } from "../_core/llm";
import { callDataApi } from "../_core/dataApi";
import { INITIATIVE_LIBRARY, type InitiativeCategory } from "../../shared/initiativeLibrary";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DiscoveryCandidate = {
  name: string;
  description: string;
  problemValue: string;
  suggestedScope: "cpo" | "reward" | "both";
  suggestedCategory: string;
  sourceUrls: string[];
};

export type DedupResult = {
  status: "unique" | "duplicate" | "near_overlap";
  nearestExistingId: string | null;
  nearestExistingLabel: string | null;
};

// ─── Search Queries ──────────────────────────────────────────────────────────

const DISCOVERY_QUERIES = [
  "emerging HR AI initiatives 2025 2026 enterprise",
  "AI-powered reward compensation technology new",
  "talent acquisition AI innovation workforce planning",
  "employee experience AI tools enterprise new launch",
  "HR technology AI capability building learning development",
  "AI governance workforce ethics compliance tools",
  "internal mobility AI skills matching platform",
  "performance management AI continuous feedback",
  "HR operations automation intelligent process",
  "compensation analytics AI pay equity tools",
  "manager effectiveness AI coaching nudge",
  "frontline workforce AI scheduling engagement",
];

// ─── Discovery Engine ────────────────────────────────────────────────────────

/**
 * Run a discovery scan — searches the web and extracts initiative candidates.
 * Returns raw candidates (before dedup) for the caller to persist.
 */
export async function runDiscoveryScan(querySubset?: number[]): Promise<{
  queriesRun: number;
  rawCandidates: DiscoveryCandidate[];
}> {
  const queries = querySubset
    ? querySubset.map((i) => DISCOVERY_QUERIES[i]).filter(Boolean)
    : DISCOVERY_QUERIES;

  const allCandidates: DiscoveryCandidate[] = [];
  let queriesRun = 0;

  for (const query of queries) {
    try {
      const searchResults = await performWebSearch(query);
      queriesRun++;

      if (searchResults && searchResults.length > 0) {
        const candidates = await extractCandidatesFromResults(query, searchResults);
        allCandidates.push(...candidates);
      }
    } catch (err) {
      // Log but continue — partial results are still valuable
      console.error(`[Discovery] Search failed for query "${query}":`, err);
    }
  }

  return { queriesRun, rawCandidates: allCandidates };
}

/**
 * Deduplicate a candidate against the existing INITIATIVE_LIBRARY.
 * Uses LLM semantic comparison to detect duplicates and near-overlaps.
 */
export async function deduplicateCandidate(
  candidate: DiscoveryCandidate
): Promise<DedupResult> {
  // First pass: exact name match
  const exactMatch = INITIATIVE_LIBRARY.find(
    (i) => i.label.toLowerCase() === candidate.name.toLowerCase()
  );
  if (exactMatch) {
    return {
      status: "duplicate",
      nearestExistingId: exactMatch.id,
      nearestExistingLabel: exactMatch.label,
    };
  }

  // Second pass: LLM semantic comparison against the library
  const libraryDigest = INITIATIVE_LIBRARY.map(
    (i) => `[${i.id}] ${i.label}: ${i.description}`
  ).join("\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a deduplication engine for an HR AI initiative library. Given a candidate initiative and the existing library, determine if the candidate is:
- "duplicate": essentially the same initiative already exists (same problem, same solution approach)
- "near_overlap": significantly overlaps with an existing initiative but has a distinct angle or scope
- "unique": genuinely new — not covered by any existing initiative

Respond with JSON: { "status": "unique"|"duplicate"|"near_overlap", "nearestId": "<id or null>", "nearestLabel": "<label or null>", "reasoning": "<one sentence>" }`,
      },
      {
        role: "user",
        content: `CANDIDATE:
Name: ${candidate.name}
Description: ${candidate.description}
Problem/Value: ${candidate.problemValue}

EXISTING LIBRARY (${INITIATIVE_LIBRARY.length} initiatives):
${libraryDigest}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "dedup_result",
        strict: true,
        schema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["unique", "duplicate", "near_overlap"] },
            nearestId: { type: "string", description: "ID of nearest existing initiative or empty string" },
            nearestLabel: { type: "string", description: "Label of nearest existing initiative or empty string" },
            reasoning: { type: "string" },
          },
          required: ["status", "nearestId", "nearestLabel", "reasoning"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const parsed = JSON.parse((response.choices[0]?.message?.content as string) ?? "{}");
    return {
      status: parsed.status || "unique",
      nearestExistingId: parsed.nearestId || null,
      nearestExistingLabel: parsed.nearestLabel || null,
    };
  } catch {
    return { status: "unique", nearestExistingId: null, nearestExistingLabel: null };
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

type SearchResult = {
  title: string;
  snippet: string;
  url: string;
};

async function performWebSearch(query: string): Promise<SearchResult[]> {
  try {
    const result = await callDataApi("Google/search", {
      query: { q: query, num: 10 },
    }) as { items?: Array<{ title?: string; snippet?: string; link?: string }> };

    if (!result || !Array.isArray((result as any).items)) {
      // Fallback: try the search as a generic query
      return [];
    }

    return ((result as any).items || []).map((item: any) => ({
      title: item.title || "",
      snippet: item.snippet || "",
      url: item.link || "",
    }));
  } catch (err) {
    console.error("[Discovery] Web search API error:", err);
    return [];
  }
}

async function extractCandidatesFromResults(
  query: string,
  results: SearchResult[]
): Promise<DiscoveryCandidate[]> {
  const resultsDigest = results
    .map((r, i) => `[${i + 1}] ${r.title}\n    ${r.snippet}\n    URL: ${r.url}`)
    .join("\n\n");

  const existingNames = INITIATIVE_LIBRARY.map((i) => i.label).join(", ");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an HR AI initiative researcher. Given web search results, extract any genuinely NEW HR/Reward AI initiative concepts that could be added to an enterprise initiative library.

Rules:
- Only extract initiatives that represent a distinct, deployable AI capability (not a vendor name, not a generic trend)
- Each initiative must solve a specific HR problem with AI
- Include the source URLs where you found the evidence
- Do NOT extract initiatives that are clearly already covered by: ${existingNames}
- Focus on initiatives that are emerging (2024-2026) and have real-world evidence
- suggestedScope: "cpo" for strategic/org-wide, "reward" for compensation/benefits-specific, "both" for cross-cutting
- suggestedCategory must be one of: talent_acquisition, onboarding, learning_development, internal_mobility, performance_management, employee_experience, retention, hr_operations, workforce_planning, compensation_reward, manager_effectiveness, governance, frontline_workforce, ai_capability

Return JSON: { "candidates": [{ "name": "...", "description": "...", "problemValue": "...", "suggestedScope": "cpo"|"reward"|"both", "suggestedCategory": "...", "sourceUrls": ["..."] }] }
If no new initiatives are found, return { "candidates": [] }.`,
      },
      {
        role: "user",
        content: `Search query: "${query}"\n\nResults:\n${resultsDigest}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "extracted_candidates",
        strict: true,
        schema: {
          type: "object",
          properties: {
            candidates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  problemValue: { type: "string" },
                  suggestedScope: { type: "string", enum: ["cpo", "reward", "both"] },
                  suggestedCategory: { type: "string" },
                  sourceUrls: { type: "array", items: { type: "string" } },
                },
                required: ["name", "description", "problemValue", "suggestedScope", "suggestedCategory", "sourceUrls"],
                additionalProperties: false,
              },
            },
          },
          required: ["candidates"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const parsed = JSON.parse((response.choices[0]?.message?.content as string) ?? "{}");
    return (parsed.candidates || []) as DiscoveryCandidate[];
  } catch {
    return [];
  }
}
