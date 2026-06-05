/**
 * Board Report Acceptance Rubric — AiQ Platform
 *
 * Implements the automated structural gate defined in:
 *   references/board-report-acceptance-rubric.md
 *
 * Remediation item: Fix 5 (P1) — AiQ Evidence Pack Remediation Brief, 28 May 2026
 *
 * Called before PDF and DOCX export to block export of under-specified reports.
 */

import type { BoardReportSectionId } from "./boardReportStream";

// ─── Rubric spec ──────────────────────────────────────────────────────────────

interface SectionSpec {
  label: string;
  minWords: number;
  /** Regex patterns — at least one must match for the section to pass content signal check */
  contentSignals: RegExp[];
  /** Human-readable description of the content signal requirement */
  contentSignalDescription: string;
}

export const BOARD_REPORT_RUBRIC: Record<BoardReportSectionId, SectionSpec> = {
  context: {
    label: "Context & Background",
    minWords: 120,
    contentSignals: [
      /\b(organisation|organization|company|business|team|function)\b/i,
    ],
    contentSignalDescription: "Must reference the organisation, company, or HR function",
  },
  strategic_direction: {
    label: "Strategic Direction",
    minWords: 150,
    contentSignals: [
      /\b(strateg|archetype|vision|principle|approach|direction|ambition)\b/i,
    ],
    contentSignalDescription: "Must reference the strategy, archetype, vision, or principles",
  },
  // T12: updated label to match new section sourcing
  initiative_portfolio: {
    label: "Initiative Portfolio & Roadmap",
    minWords: 180,
    contentSignals: [
      // Must name at least 2 initiative-like proper nouns (capitalised multi-word phrases)
      /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/,
    ],
    contentSignalDescription: "Must name at least one specific initiative from the portfolio",
  },
  investment_case: {
    label: "Investment Case",
    minWords: 150,
    contentSignals: [
      /£[\d,]+|cost|value|saving|ROI|return|investment|budget|spend|financial/i,
    ],
    contentSignalDescription: "Must reference at least one financial figure or financial concept",
  },
  capability_readiness: {
    label: "Capability Readiness",
    minWords: 120,
    contentSignals: [
      /\b(capabilit|skill|gap|readiness|capacity|change|vendor|ecosystem|dimension|training)\b/i,
    ],
    contentSignalDescription: "Must reference capability, skills, gaps, or readiness",
  },
  // T12: updated label and signals to match new sourcing (sign-off, risk register, tensions)
  governance: {
    label: "Governance & Accountability",
    minWords: 100,
    contentSignals: [
      /\b(governance|accountability|risk|measure|sign.?off|tension|dissent|condition|unresolved|approv|review|cadence|escalat|oversight|board|committee|quarter|month)\b/i,
    ],
    contentSignalDescription: "Must reference governance, accountability, risks, success measures, or sign-off status",
  },
};

// ─── Rubric failure type ──────────────────────────────────────────────────────

export interface RubricFailure {
  sectionId: BoardReportSectionId;
  sectionLabel: string;
  reason: "missing" | "too_short" | "no_content_signal";
  detail: string;
}

export interface RubricResult {
  passed: boolean;
  failures: RubricFailure[];
  /** Sections that passed */
  passed_sections: BoardReportSectionId[];
  /** Summary message suitable for returning to the client */
  summary: string;
}

// ─── Validate function ────────────────────────────────────────────────────────

/**
 * Validates a board report section map against the acceptance rubric.
 *
 * @param sectionsMap - The parsed boardReportSectionsJson object
 * @returns RubricResult with pass/fail status and failure details
 */
export function validateBoardReportRubric(
  sectionsMap: Record<string, { content?: string; wordCount?: number } | null | undefined>
): RubricResult {
  const failures: RubricFailure[] = [];
  const passed_sections: BoardReportSectionId[] = [];

  for (const [sectionId, spec] of Object.entries(BOARD_REPORT_RUBRIC) as [BoardReportSectionId, SectionSpec][]) {
    const section = sectionsMap[sectionId];

    // Check: section exists and has content
    if (!section || !section.content || section.content.trim().length === 0) {
      failures.push({
        sectionId,
        sectionLabel: spec.label,
        reason: "missing",
        detail: `Section "${spec.label}" has no content. Generate or write this section before exporting.`,
      });
      continue;
    }

    const content = section.content.trim();
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    // Check: minimum word count
    if (wordCount < spec.minWords) {
      failures.push({
        sectionId,
        sectionLabel: spec.label,
        reason: "too_short",
        detail: `Section "${spec.label}" has ${wordCount} words but requires at least ${spec.minWords}. Expand this section before exporting.`,
      });
      continue;
    }

    // Check: content signal (at least one pattern must match)
    const hasSignal = spec.contentSignals.some((pattern) => pattern.test(content));
    if (!hasSignal) {
      failures.push({
        sectionId,
        sectionLabel: spec.label,
        reason: "no_content_signal",
        detail: `Section "${spec.label}" does not meet the content requirement: ${spec.contentSignalDescription}.`,
      });
      continue;
    }

    passed_sections.push(sectionId);
  }

  const passed = failures.length === 0;
  const summary = passed
    ? `Board report passes all ${Object.keys(BOARD_REPORT_RUBRIC).length} structural checks.`
    : `Board report fails ${failures.length} of ${Object.keys(BOARD_REPORT_RUBRIC).length} structural checks: ${failures.map((f) => f.sectionLabel).join(", ")}.`;

  return { passed, failures, passed_sections, summary };
}
