/**
 * Board Report Acceptance Rubric — Vitest test suite
 *
 * Remediation item: Fix 5 (P1) — AiQ Evidence Pack Remediation Brief, 28 May 2026
 *
 * Tests:
 *   1. Empty sections map fails all 6 checks
 *   2. Sections below minimum word count fail
 *   3. Sections missing content signals fail
 *   4. A well-formed report passes all checks
 *   5. Partial reports (some sections missing) report correct failures
 */
import { describe, it, expect } from "vitest";
import { validateBoardReportRubric, BOARD_REPORT_RUBRIC } from "./boardReportRubric";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSection(content: string) {
  return { content, wordCount: content.split(/\s+/).filter(Boolean).length };
}

/** Build a section with enough words to pass the word count check */
function padSection(base: string, targetWords: number): string {
  const words = base.split(/\s+/);
  while (words.length < targetWords) {
    words.push("organisation strategy initiative capability governance");
  }
  return words.join(" ");
}

// ── 1. Empty map fails all 6 checks ──────────────────────────────────────────

describe("validateBoardReportRubric — empty map", () => {
  it("fails all 6 sections when map is empty", () => {
    const result = validateBoardReportRubric({});
    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(6);
    expect(result.passed_sections).toHaveLength(0);
  });

  it("all failures have reason 'missing'", () => {
    const result = validateBoardReportRubric({});
    for (const f of result.failures) {
      expect(f.reason).toBe("missing");
    }
  });

  it("summary mentions the failure count", () => {
    const result = validateBoardReportRubric({});
    expect(result.summary).toMatch(/6/);
  });
});

// ── 2. Word count failures ────────────────────────────────────────────────────

describe("validateBoardReportRubric — word count", () => {
  it("fails context section when content is too short", () => {
    const result = validateBoardReportRubric({
      context: makeSection("This is too short for the context section."),
    });
    const failure = result.failures.find(f => f.sectionId === "context");
    expect(failure).toBeDefined();
    expect(failure?.reason).toBe("too_short");
  });

  it("passes context section when word count meets minimum", () => {
    const spec = BOARD_REPORT_RUBRIC.context;
    const content = padSection(
      "The organisation is investing in AI-enabled HR capability to improve business outcomes.",
      spec.minWords
    );
    const result = validateBoardReportRubric({ context: makeSection(content) });
    // context may still fail content signal check — but not word count
    const failure = result.failures.find(f => f.sectionId === "context");
    if (failure) {
      expect(failure.reason).not.toBe("too_short");
    }
  });
});

// ── 3. Content signal failures ────────────────────────────────────────────────

describe("validateBoardReportRubric — content signals", () => {
  it("fails investment_case when no financial terms are present", () => {
    const spec = BOARD_REPORT_RUBRIC.investment_case;
    const content = padSection(
      "The strategy will deliver significant benefits through capability development and skills improvement.",
      spec.minWords
    );
    const result = validateBoardReportRubric({ investment_case: makeSection(content) });
    const failure = result.failures.find(f => f.sectionId === "investment_case");
    expect(failure).toBeDefined();
    expect(failure?.reason).toBe("no_content_signal");
  });

  it("passes investment_case when a financial term is present", () => {
    const spec = BOARD_REPORT_RUBRIC.investment_case;
    const content = padSection(
      "The investment case shows a saving of £500k over 12 months through reduced administrative cost.",
      spec.minWords
    );
    const result = validateBoardReportRubric({ investment_case: makeSection(content) });
    const failure = result.failures.find(f => f.sectionId === "investment_case");
    expect(failure).toBeUndefined();
  });
});

// ── 4. Well-formed report passes all checks ───────────────────────────────────

describe("validateBoardReportRubric — passing report", () => {
  const passingReport = {
    context: makeSection(padSection(
      "The organisation is investing in AI-enabled HR capability. The HR function has a clear mandate for change.",
      BOARD_REPORT_RUBRIC.context.minWords
    )),
    strategic_direction: makeSection(padSection(
      "The strategy archetype chosen is Augment & Accelerate. The vision statement sets out a clear direction for the HR function.",
      BOARD_REPORT_RUBRIC.strategic_direction.minWords
    )),
    initiative_portfolio: makeSection(padSection(
      "The portfolio includes AI Talent Screening, Workforce Planning AI, and Employee Sentiment Listening as key initiatives.",
      BOARD_REPORT_RUBRIC.initiative_portfolio.minWords
    )),
    investment_case: makeSection(padSection(
      "The investment case shows a value of £1.2M and a cost of £400k. The ROI is projected at 3x over 24 months.",
      BOARD_REPORT_RUBRIC.investment_case.minWords
    )),
    capability_readiness: makeSection(padSection(
      "The capability assessment identifies gaps in data skills and change readiness. The team requires targeted training.",
      BOARD_REPORT_RUBRIC.capability_readiness.minWords
    )),
    governance: makeSection(padSection(
      "The governance model includes quarterly board review and an escalation path to the CHRO. Next steps require board approval.",
      BOARD_REPORT_RUBRIC.governance.minWords
    )),
  };

  it("passes all 6 sections", () => {
    const result = validateBoardReportRubric(passingReport);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.passed_sections).toHaveLength(6);
  });

  it("summary confirms all checks passed", () => {
    const result = validateBoardReportRubric(passingReport);
    expect(result.summary).toMatch(/passes all/i);
  });
});

// ── 5. Partial report ─────────────────────────────────────────────────────────

describe("validateBoardReportRubric — partial report", () => {
  it("reports exactly the missing sections", () => {
    const partial = {
      context: makeSection(padSection(
        "The organisation is investing in AI-enabled HR capability.",
        BOARD_REPORT_RUBRIC.context.minWords
      )),
      // strategic_direction, initiative_portfolio, investment_case, capability_readiness, governance all missing
    };
    const result = validateBoardReportRubric(partial);
    expect(result.passed).toBe(false);
    const missingSectionIds = result.failures.map(f => f.sectionId);
    expect(missingSectionIds).toContain("strategic_direction");
    expect(missingSectionIds).toContain("initiative_portfolio");
    expect(missingSectionIds).toContain("investment_case");
    expect(missingSectionIds).toContain("capability_readiness");
    expect(missingSectionIds).toContain("governance");
  });
});
