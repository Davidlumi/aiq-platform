/**
 * Shared vocabulary blacklist — used by all AI generation procedures.
 *
 * Master source: boardReportStream.ts (the most comprehensive list).
 * All procedures import this constant so enforcement is consistent across
 * vision, strategy, principles, business case, capability, tensions, and
 * board report generation.
 *
 * When adding words: add here only. Do not maintain local copies.
 *
 * sanitizeOutput() provides a deterministic post-processing pass that
 * replaces blacklisted words/phrases with approved alternatives after
 * LLM generation, ensuring compliance regardless of model behaviour.
 */

// ─── Blacklist ────────────────────────────────────────────────────────────────

export const VOCAB_BLACKLIST: readonly string[] = [
  // Overused strategy jargon
  "synergy", "synergies", "leverage", "leveraging",
  "paradigm", "paradigm shift",
  "disruptive", "disruption",
  "transformative", "game-changer", "game changer",
  "cutting-edge", "cutting edge",
  "state-of-the-art",
  "best-in-class", "best in class",
  "world-class", "world class",
  "holistic",
  // Vague intensifiers and filler
  "robust", "seamless", "scalable",
  "agile", "agility",
  // Consultant-speak
  "ecosystem",
  "stakeholder alignment",
  "value proposition",
  "low-hanging fruit",
  "move the needle",
  "boil the ocean",
  "circle back",
  "deep dive",
  "bandwidth",
  "pivot",
  "ideate", "ideation",
  // Empowerment clichés
  "empower", "empowering",
  // Finance / HR jargon
  "ROI",
  "human capital",
  "deliverables",
  "strategic imperative",
  // Additional words from intelligence.ts procedures
  "synergise", "synergize",
  "game-changing",
  // Additional words from tensions procedure
  "revolutionary",
  "innovative",
  "value-add",
  "learnings",
];

/**
 * Returns a formatted string for inclusion in LLM system prompts.
 * Usage: `FORBIDDEN_WORDS_PROMPT` in template literals.
 */
export const FORBIDDEN_WORDS_PROMPT: string =
  `FORBIDDEN WORDS — never use any of these words or phrases in your output: ${VOCAB_BLACKLIST.join(", ")}.`;

// ─── Replacement map ──────────────────────────────────────────────────────────
// Each entry: [blacklisted phrase, approved replacement]
// Ordered longest-first so multi-word phrases are matched before their components.
// Replacements are chosen to be semantically neutral and stylistically plain.

const REPLACEMENT_MAP: ReadonlyArray<readonly [string, string]> = [
  // Multi-word phrases first (longest match wins)
  ["paradigm shift",       "fundamental change"],
  ["game-changer",         "significant development"],
  ["game changer",         "significant development"],
  ["game-changing",        "significant"],
  ["cutting-edge",         "advanced"],
  ["cutting edge",         "advanced"],
  ["state-of-the-art",     "advanced"],
  ["best-in-class",        "high-quality"],
  ["best in class",        "high-quality"],
  ["world-class",          "high-quality"],
  ["world class",          "high-quality"],
  ["stakeholder alignment","stakeholder agreement"],
  ["value proposition",    "value case"],
  ["low-hanging fruit",    "quick win"],
  ["move the needle",      "make a measurable difference"],
  ["boil the ocean",       "take on too much"],
  ["circle back",          "return to"],
  ["deep dive",            "detailed review"],
  ["human capital",        "workforce"],
  ["strategic imperative", "strategic priority"],
  ["value-add",            "value"],
  // Single words
  ["synergies",            "combined benefits"],
  ["synergy",              "combined benefit"],
  ["synergise",            "combine"],
  ["synergize",            "combine"],
  ["leveraging",           "using"],
  ["leverage",             "use"],
  ["paradigm",             "model"],
  ["disruptive",           "significant"],
  ["disruption",           "change"],
  ["transformative",       "significant"],
  ["holistic",             "comprehensive"],
  ["robust",               "reliable"],
  ["seamless",             "smooth"],
  ["scalable",             "expandable"],
  ["agility",              "adaptability"],
  ["agile",                "adaptable"],
  ["ecosystem",            "environment"],
  ["bandwidth",            "capacity"],
  ["pivot",                "change direction"],
  ["ideation",             "idea generation"],
  ["ideate",               "generate ideas"],
  ["empowering",           "enabling"],
  ["empower",              "enable"],
  ["ROI",                  "return on investment"],
  ["deliverables",         "outputs"],
  ["revolutionary",        "significant"],
  ["innovative",           "new"],
  ["learnings",            "lessons"],
];

// ─── sanitizeOutput ───────────────────────────────────────────────────────────

/**
 * Replaces all blacklisted words and phrases in `text` with approved
 * alternatives. Matching is:
 *   - Case-insensitive (the replacement preserves the original capitalisation
 *     pattern: ALL-CAPS → ALL-CAPS replacement, Title Case → Title Case,
 *     lower → lower).
 *   - Word-boundary aware (uses \b anchors where the phrase starts/ends on a
 *     word character; falls back to lookahead/lookbehind for hyphenated terms).
 *   - Applied in REPLACEMENT_MAP order (longest phrases first) so multi-word
 *     matches are handled before their component words.
 *
 * This function is idempotent: running it twice produces the same result.
 */
export function sanitizeOutput(text: string): string {
  let result = text;

  for (const [blacklisted, replacement] of REPLACEMENT_MAP) {
    // Build a regex that matches the phrase at word boundaries.
    // Hyphenated phrases need special handling because \b doesn't work across hyphens.
    const escaped = blacklisted.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    // Use \b on alphanumeric edges; for hyphenated terms the escaped hyphens
    // already anchor the match tightly enough.
    const pattern = new RegExp(`\\b${escaped}\\b`, "gi");

    result = result.replace(pattern, (match) => {
      return matchCase(match, replacement);
    });
  }

  return result;
}

/**
 * Applies the capitalisation pattern of `original` to `replacement`.
 * Patterns handled:
 *   - ALL CAPS  → ALL CAPS replacement
 *   - Title Case (first letter upper) → Title Case replacement
 *   - lower case → lower case replacement
 */
function matchCase(original: string, replacement: string): string {
  if (original === original.toUpperCase() && original.toLowerCase() !== original) {
    // ALL CAPS (e.g. "ROI", "ROBUST")
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    // Title Case — capitalise first letter of replacement
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  // lower case
  return replacement.toLowerCase();
}

/**
 * Checks whether `text` contains any blacklisted words (case-insensitive).
 * Returns the list of hits. Empty array means clean.
 */
export function findBlacklistHits(text: string): string[] {
  const lower = text.toLowerCase();
  return VOCAB_BLACKLIST.filter(word => lower.includes(word.toLowerCase()));
}
