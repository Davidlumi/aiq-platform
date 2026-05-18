/**
 * Shared vocabulary blacklist — used by all AI generation procedures.
 *
 * Master source: boardReportStream.ts (the most comprehensive list).
 * All procedures import this constant so enforcement is consistent across
 * vision, strategy, principles, business case, capability, tensions, and
 * board report generation.
 *
 * When adding words: add here only. Do not maintain local copies.
 */
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
