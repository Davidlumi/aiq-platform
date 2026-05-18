/**
 * Vitest unit tests for shared/vocabBlacklist.ts
 *
 * Covers:
 *   - sanitizeOutput: every blacklisted word/phrase replaced with its approved alternative
 *   - Case preservation: lower, Title Case, ALL CAPS
 *   - Word-boundary awareness: partial matches not replaced
 *   - Idempotency: running sanitizeOutput twice gives the same result
 *   - Non-blacklisted text is unchanged
 *   - findBlacklistHits: detects hits correctly
 */

import { describe, it, expect } from "vitest";
import { sanitizeOutput, findBlacklistHits, VOCAB_BLACKLIST } from "../shared/vocabBlacklist";

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Asserts that the output contains none of the blacklisted words. */
function assertClean(output: string) {
  const hits = findBlacklistHits(output);
  expect(hits).toEqual([]);
}

// ─── Core replacement coverage ────────────────────────────────────────────────

describe("sanitizeOutput — replacement coverage", () => {
  // Multi-word phrases
  it("replaces 'paradigm shift'", () => {
    const out = sanitizeOutput("This represents a paradigm shift in how we work.");
    expect(out).not.toMatch(/paradigm shift/i);
    assertClean(out);
  });

  it("replaces 'game-changer' (hyphenated)", () => {
    const out = sanitizeOutput("This is a game-changer for the business.");
    expect(out).not.toMatch(/game-changer/i);
    assertClean(out);
  });

  it("replaces 'game changer' (unhyphenated)", () => {
    const out = sanitizeOutput("It is a real game changer.");
    expect(out).not.toMatch(/game changer/i);
    assertClean(out);
  });

  it("replaces 'cutting-edge'", () => {
    const out = sanitizeOutput("We use cutting-edge technology.");
    expect(out).not.toMatch(/cutting-edge/i);
    assertClean(out);
  });

  it("replaces 'state-of-the-art'", () => {
    const out = sanitizeOutput("A state-of-the-art solution.");
    expect(out).not.toMatch(/state-of-the-art/i);
    assertClean(out);
  });

  it("replaces 'best-in-class'", () => {
    const out = sanitizeOutput("We deliver best-in-class outcomes.");
    expect(out).not.toMatch(/best-in-class/i);
    assertClean(out);
  });

  it("replaces 'world-class'", () => {
    const out = sanitizeOutput("A world-class HR function.");
    expect(out).not.toMatch(/world-class/i);
    assertClean(out);
  });

  it("replaces 'stakeholder alignment'", () => {
    const out = sanitizeOutput("We need stakeholder alignment before proceeding.");
    expect(out).not.toMatch(/stakeholder alignment/i);
    assertClean(out);
  });

  it("replaces 'value proposition'", () => {
    const out = sanitizeOutput("Our value proposition is clear.");
    expect(out).not.toMatch(/value proposition/i);
    assertClean(out);
  });

  it("replaces 'low-hanging fruit'", () => {
    const out = sanitizeOutput("Let's start with the low-hanging fruit.");
    expect(out).not.toMatch(/low-hanging fruit/i);
    assertClean(out);
  });

  it("replaces 'move the needle'", () => {
    const out = sanitizeOutput("We need to move the needle on retention.");
    expect(out).not.toMatch(/move the needle/i);
    assertClean(out);
  });

  it("replaces 'deep dive'", () => {
    const out = sanitizeOutput("We conducted a deep dive into the data.");
    expect(out).not.toMatch(/deep dive/i);
    assertClean(out);
  });

  it("replaces 'human capital'", () => {
    const out = sanitizeOutput("Our human capital strategy is evolving.");
    expect(out).not.toMatch(/human capital/i);
    assertClean(out);
  });

  it("replaces 'strategic imperative'", () => {
    const out = sanitizeOutput("This is a strategic imperative for the board.");
    expect(out).not.toMatch(/strategic imperative/i);
    assertClean(out);
  });

  // Single words
  it("replaces 'synergy'", () => {
    const out = sanitizeOutput("There is real synergy between teams.");
    expect(out).not.toMatch(/\bsynergy\b/i);
    assertClean(out);
  });

  it("replaces 'synergies'", () => {
    const out = sanitizeOutput("We expect significant synergies.");
    expect(out).not.toMatch(/\bsynergies\b/i);
    assertClean(out);
  });

  it("replaces 'leverage'", () => {
    const out = sanitizeOutput("We will leverage our existing capabilities.");
    expect(out).not.toMatch(/\bleverage\b/i);
    assertClean(out);
  });

  it("replaces 'leveraging'", () => {
    const out = sanitizeOutput("By leveraging data, we improve outcomes.");
    expect(out).not.toMatch(/\bleveraging\b/i);
    assertClean(out);
  });

  it("replaces 'disruptive'", () => {
    const out = sanitizeOutput("This is a disruptive approach.");
    expect(out).not.toMatch(/\bdisruptive\b/i);
    assertClean(out);
  });

  it("replaces 'disruption'", () => {
    const out = sanitizeOutput("The disruption in the market is clear.");
    expect(out).not.toMatch(/\bdisruption\b/i);
    assertClean(out);
  });

  it("replaces 'transformative'", () => {
    const out = sanitizeOutput("This will be transformative for the organisation.");
    expect(out).not.toMatch(/\btransformative\b/i);
    assertClean(out);
  });

  it("replaces 'holistic'", () => {
    const out = sanitizeOutput("We take a holistic view of capability.");
    expect(out).not.toMatch(/\bholistic\b/i);
    assertClean(out);
  });

  it("replaces 'robust'", () => {
    const out = sanitizeOutput("We have a robust framework in place.");
    expect(out).not.toMatch(/\brobust\b/i);
    assertClean(out);
  });

  it("replaces 'seamless'", () => {
    const out = sanitizeOutput("The integration will be seamless.");
    expect(out).not.toMatch(/\bseamless\b/i);
    assertClean(out);
  });

  it("replaces 'scalable'", () => {
    const out = sanitizeOutput("We need a scalable solution.");
    expect(out).not.toMatch(/\bscalable\b/i);
    assertClean(out);
  });

  it("replaces 'agile'", () => {
    const out = sanitizeOutput("Our team is agile and responsive.");
    expect(out).not.toMatch(/\bagile\b/i);
    assertClean(out);
  });

  it("replaces 'agility'", () => {
    const out = sanitizeOutput("We need agility to respond to change.");
    expect(out).not.toMatch(/\bagility\b/i);
    assertClean(out);
  });

  it("replaces 'ecosystem'", () => {
    const out = sanitizeOutput("The vendor ecosystem is complex.");
    expect(out).not.toMatch(/\becosystem\b/i);
    assertClean(out);
  });

  it("replaces 'bandwidth'", () => {
    const out = sanitizeOutput("We don't have the bandwidth for this.");
    expect(out).not.toMatch(/\bbandwidth\b/i);
    assertClean(out);
  });

  it("replaces 'pivot'", () => {
    const out = sanitizeOutput("We need to pivot our approach.");
    expect(out).not.toMatch(/\bpivot\b/i);
    assertClean(out);
  });

  it("replaces 'ideate'", () => {
    const out = sanitizeOutput("Let's ideate on new solutions.");
    expect(out).not.toMatch(/\bideate\b/i);
    assertClean(out);
  });

  it("replaces 'ideation'", () => {
    const out = sanitizeOutput("The ideation phase is complete.");
    expect(out).not.toMatch(/\bideation\b/i);
    assertClean(out);
  });

  it("replaces 'empower'", () => {
    const out = sanitizeOutput("We aim to empower our managers.");
    expect(out).not.toMatch(/\bempower\b/i);
    assertClean(out);
  });

  it("replaces 'empowering'", () => {
    const out = sanitizeOutput("This is an empowering initiative.");
    expect(out).not.toMatch(/\bempowering\b/i);
    assertClean(out);
  });

  it("replaces 'ROI'", () => {
    const out = sanitizeOutput("The ROI is projected at 3x.");
    expect(out).not.toMatch(/\bROI\b/);
    assertClean(out);
  });

  it("replaces 'deliverables'", () => {
    const out = sanitizeOutput("The deliverables are clearly defined.");
    expect(out).not.toMatch(/\bdeliverables\b/i);
    assertClean(out);
  });

  it("replaces 'revolutionary'", () => {
    const out = sanitizeOutput("This is a revolutionary change.");
    expect(out).not.toMatch(/\brevolutionary\b/i);
    assertClean(out);
  });

  it("replaces 'innovative'", () => {
    const out = sanitizeOutput("We have an innovative approach.");
    expect(out).not.toMatch(/\binnovative\b/i);
    assertClean(out);
  });

  it("replaces 'value-add'", () => {
    const out = sanitizeOutput("This is a clear value-add for the business.");
    expect(out).not.toMatch(/\bvalue-add\b/i);
    assertClean(out);
  });

  it("replaces 'learnings'", () => {
    const out = sanitizeOutput("Key learnings from the pilot are documented.");
    expect(out).not.toMatch(/\blearnings\b/i);
    assertClean(out);
  });

  it("replaces 'game-changing'", () => {
    const out = sanitizeOutput("This is a game-changing initiative.");
    expect(out).not.toMatch(/\bgame-changing\b/i);
    assertClean(out);
  });
});

// ─── Case preservation ────────────────────────────────────────────────────────

describe("sanitizeOutput — case preservation", () => {
  it("preserves lower case", () => {
    const out = sanitizeOutput("we will leverage data.");
    expect(out).toContain("use");
    expect(out).not.toContain("Use");
  });

  it("preserves Title Case (sentence start)", () => {
    const out = sanitizeOutput("Leverage is key.");
    expect(out).toMatch(/^[A-Z]/);
    expect(out).not.toMatch(/\bleverage\b/i);
  });

  it("preserves ALL CAPS for ROI", () => {
    const out = sanitizeOutput("The ROI is positive.");
    // ROI → RETURN ON INVESTMENT (all caps)
    expect(out).toMatch(/RETURN ON INVESTMENT/);
    expect(out).not.toMatch(/\bROI\b/);
  });
});

// ─── Word-boundary awareness ──────────────────────────────────────────────────

describe("sanitizeOutput — word-boundary awareness", () => {
  it("does not replace 'agile' inside 'fragile'", () => {
    const out = sanitizeOutput("The structure is fragile.");
    expect(out).toContain("fragile");
  });

  it("does not replace 'pivot' inside 'pivotal'", () => {
    // 'pivotal' contains 'pivot' but \b should prevent replacement
    const out = sanitizeOutput("This is a pivotal moment.");
    expect(out).toContain("pivotal");
  });

  it("does not replace 'robust' inside 'robustness'", () => {
    const out = sanitizeOutput("We tested robustness.");
    expect(out).toContain("robustness");
  });
});

// ─── Idempotency ──────────────────────────────────────────────────────────────

describe("sanitizeOutput — idempotency", () => {
  it("produces the same result when run twice", () => {
    const input = "We will leverage synergy to empower robust teams.";
    const once = sanitizeOutput(input);
    const twice = sanitizeOutput(once);
    expect(once).toEqual(twice);
  });
});

// ─── Non-blacklisted text unchanged ──────────────────────────────────────────

describe("sanitizeOutput — clean text unchanged", () => {
  it("does not modify text with no blacklisted words", () => {
    const clean = "We will improve frontline scheduling by 40% over 18 months.";
    expect(sanitizeOutput(clean)).toEqual(clean);
  });

  it("preserves numbers, punctuation, and formatting", () => {
    const text = "Target: £4.2M savings. Timeline: Q1 2026–Q4 2027.";
    expect(sanitizeOutput(text)).toEqual(text);
  });
});

// ─── findBlacklistHits ────────────────────────────────────────────────────────

describe("findBlacklistHits", () => {
  it("returns empty array for clean text", () => {
    expect(findBlacklistHits("We will improve retention by 15%.")).toEqual([]);
  });

  it("detects a single hit", () => {
    const hits = findBlacklistHits("We will leverage our data.");
    expect(hits).toContain("leverage");
  });

  it("detects multiple hits", () => {
    const hits = findBlacklistHits("Robust synergy and seamless disruption.");
    expect(hits).toContain("robust");
    expect(hits).toContain("synergy");
    expect(hits).toContain("seamless");
    expect(hits).toContain("disruption");
  });

  it("is case-insensitive", () => {
    const hits = findBlacklistHits("LEVERAGE and Synergy.");
    expect(hits).toContain("leverage");
    expect(hits).toContain("synergy");
  });
});

// ─── Full VOCAB_BLACKLIST coverage check ─────────────────────────────────────

describe("sanitizeOutput — full VOCAB_BLACKLIST coverage", () => {
  it("sanitizes every word in VOCAB_BLACKLIST", () => {
    // Build a sentence containing every blacklisted word
    const sentence = VOCAB_BLACKLIST.join(". ") + ".";
    const out = sanitizeOutput(sentence);
    const remaining = findBlacklistHits(out);
    expect(remaining).toEqual([]);
  });
});
