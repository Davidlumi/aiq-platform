# AiQ DFS Evidence Pack — Remediation Record

**Version:** 1.0  
**Date:** 28 May 2026  
**Remediation brief:** AiQ Evidence Pack Remediation Brief, 28 May 2026  
**Test suite status:** 1,940 / 1,940 passing (72 test files)

---

## Summary

All 7 remediation items from the brief have been actioned. Two P0 items are complete but require human follow-through before outputs can be circulated. Five P1/P2 items are fully resolved in code and documentation.

| Fix | Priority | Item | Status |
|---|---|---|---|
| Fix 1 | P0 | DFS profile figures corrected; cross-check test rewritten | **Complete** |
| Fix 2 | P0 | Consent-gap checklist produced | **Complete — pending legal/commercial review** |
| Fix 3 | P1 | 26 scenario label review record created | **Complete — pending content owner sign-off** |
| Fix 4 | P1 | Dual "Capability Assessment" labels renamed | **Complete** |
| Fix 5 | P1 | Board report acceptance rubric defined and gated | **Complete** |
| Fix 6 | P2 | Test D de-brittled; LLM-output columns audited | **Complete** |
| Fix 7 | P1 | UI journey verified; soft flags recorded as open items | **Complete** |

---

## Fix 1 (P0) — DFS Profile Figures

**Problem:** The DFS company profile used in the evidence-pack scripts contained figures that could not be verified against a public source (headcount 11,000, revenue £2.1bn). The cross-check test was tautological — it read from the same in-memory object it was testing, so it could never fail.

**Changes made:**

- `shared/dfsProfileConstants.ts` — new shared constants file. Corrected figures: headcount ~4,503 (DFS corporate site, 2024 annual report), revenue ~£1.0bn statutory (LSE/market data, FY2024). Each field includes `source` and `as_of` metadata.
- `scripts/p2-dfs-board-report.ts`, `scripts/d1-reward-value-engine.ts`, `scripts/evidence-journey.ts`, `scripts/p4-full-journey-to-lock.ts`, `scripts/p2-display-report.ts` — all updated to import from `shared/dfsProfileConstants.ts` instead of hardcoding figures.
- `server/dfs-profile-crosscheck.test.ts` — new test file. 22 tests. Non-tautological: asserts that each constant has a non-empty `source` and `as_of` field, that headcount is in the plausible range 4,000–5,000, that revenue is in the plausible range £0.8bn–£1.2bn, and that the payroll estimate is proportionate to headcount.

**Test result:** 22 / 22 passing.

---

## Fix 2 (P0) — Consent Gap Checklist

**Problem:** The brief identified that pilot status is not automatic consent. DFS-attributed outputs (strategy, board report, business case) must not be circulated without explicit written confirmation in the pilot agreement.

**Changes made:**

- `references/dfs-consent-gap-checklist.md` — 20-item checklist across 4 sections: (A) modelling DFS's data, (B) generating the strategy and board report, (C) storing/sharing/referencing outputs, (D) data protection and compliance. Each item has a status field (Confirmed / Gap / Not Applicable) and an agreement-reference field for the reviewer to complete.

**Human action required:** Commercial/legal team must review the checklist against the current DFS pilot agreement and close all gaps with written sign-off before any DFS-attributed output is circulated. This is a P0 gate.

---

## Fix 3 (P1) — 26 Scenario Label Review Record

**Problem:** 26 content scenarios were programmatically remapped from 6 legacy capability keys to canonical scoring-engine keys. No human review of the individual scenarios was recorded.

**Changes made:**

- `references/scenario-label-review-record.md` — structured review record with one row per scenario (grouped by legacy key). Includes the canonical domain definitions, decision codes (Keep / Reword / Reassign), a post-review distribution check table, and a sign-off section.
- The one scenario in Group 6 (`workflow` → `ai_workflow_design`: "AI Implementation — Stakeholder Communication Priority") has been pre-reviewed and marked Keep with rationale.
- The remaining 25 decisions are marked Pending and require content owner review.

**Human action required:** Content owner to complete the 25 pending decisions and sign off the record.

---

## Fix 4 (P1) — Dual "Capability Assessment" Label Rename

**Problem:** Two distinct features shared the label "Capability Assessment" — the individual AI Skills assessment (6 domains) and the Stage 8 reward readiness check (5 areas). This caused confusion in the evidence pack and in user testing.

**Changes made:**

| File | Change |
|---|---|
| `client/src/pages/assessment/AssessmentPage.tsx` | Page h1: "AI Capability Assessment" → "AI Skills Check · 6 domains" |
| `client/src/components/AppShell.tsx` | Nav label: "Assessment" → "AI Skills Check" |
| `client/src/components/DashboardLayout.tsx` | Nav label: "Assessment" → "AI Skills Check" |
| `client/src/pages/strategy/RewardCapabilityPage.tsx` | Page title and stage progress: "Capability Assessment" → "Reward Readiness · 5 areas" |
| `client/src/pages/strategy/BoardReportPage.tsx` | Stage 8 label in board report stage list |
| `client/src/pages/coach/CoachPage.tsx` | `MODE_LABELS.diagnostic` entry |

No remaining ambiguous "Capability Assessment" labels in active UI files.

---

## Fix 5 (P1) — Board Report Acceptance Rubric

**Problem:** The board report generation procedure had no automated quality gate. A report could be exported with missing sections, insufficient word counts, or absent DFS figures.

**Changes made:**

- `references/board-report-acceptance-rubric.md` — human-readable rubric defining acceptance criteria for each of the 6 board report sections (word count, required elements, DFS attribution, financial figures, risk flags).
- `server/boardReportRubric.ts` — `validateBoardReportRubric(sections, companyName)` function. Checks: all 6 required sections present; each section meets minimum word count; DFS name appears in the report; at least one financial figure present; risk/flag section present.
- `server/pdf.ts` — rubric gate added before `generateBoardReportPDF()`. Returns HTTP 422 with violation list if rubric fails.
- `server/boardReportDocx.ts` — rubric gate added before DOCX generation. Returns HTTP 422 with violation list if rubric fails.
- `server/boardReportRubric.test.ts` — 10 tests covering pass, missing section, short section, missing company name, missing financials, missing risk section.

**Test result:** 10 / 10 passing.

---

## Fix 6 (P2) — De-brittle Test D

**Problem:** The `fitImpactEngine.test.ts` file contained exact-count assertions (e.g. `expect(results).toHaveLength(12)`) that would fail whenever content was added to the initiative library. The brief also required an audit of LLM-output columns for truncation risk.

**Changes made:**

- `server/fitImpactEngine.test.ts` — exact count assertions replaced with invariant lower-bound assertions (`toBeGreaterThanOrEqual`). Mode-specific count assertions replaced with structural checks (result is an array, each item has required fields).
- **LLM-output column audit:** All columns in the reward journey that store LLM-generated text (`businessCaseNarrative`, `boardReportSectionsJson`, `gapStatement`, `actionNote`, `principlesJson`, `strategicShiftsJson`, `successMeasureText`) are typed as `text` in `drizzle/schema.ts`. No `varchar` columns with length limits were found for LLM-output fields. No truncation risk.

**Test result:** 84 / 84 passing.

---

## Fix 7 (P1) — UI Journey Verification and Soft Flags

**Problem:** The brief required confirmation that the UI reward journey reaches Stage 10 lock, and that the three soft flags acknowledged during the DFS journey (H1, R2, R3) are recorded as open items, not closed issues.

**Changes made:**

- UI journey verified via Playwright capture: all 10 stages traversable, Stage 10 lock reached (screenshot `A_stage10_locked.png` in capture pack).
- `references/soft-flags-open-items.md` — open-items register for H1 (shift coverage), R2 (capability reds without enablement actions), R3 (enablement cost material). Each item includes: definition, trigger condition, concern, resolution required, owner field (pending assignment), and closure criteria.

**Human action required:** Assign resolution owners and target dates for H1, R2, R3. Board report must not be circulated until all three are resolved or formally accepted.

---

## Test Suite Summary

| Test file | Tests | Status |
|---|---|---|
| `server/dfs-profile-crosscheck.test.ts` | 22 | ✓ |
| `server/boardReportRubric.test.ts` | 10 | ✓ |
| `server/fitImpactEngine.test.ts` | 84 | ✓ |
| `server/canonical-facts.test.ts` | 14 | ✓ |
| All other test files (68 files) | 1,810 | ✓ |
| **Total** | **1,940** | **All passing** |

---

## Reference Documents Created

| Document | Path | Purpose |
|---|---|---|
| DFS Profile Constants | `shared/dfsProfileConstants.ts` | Single source of truth for DFS figures with source/as_of metadata |
| DFS Cross-Check Test | `server/dfs-profile-crosscheck.test.ts` | Non-tautological automated guard on DFS figures |
| Consent Gap Checklist | `references/dfs-consent-gap-checklist.md` | 20-item checklist for DFS pilot agreement review |
| Scenario Label Review Record | `references/scenario-label-review-record.md` | Structured record for 26 relabelled scenario decisions |
| Board Report Acceptance Rubric | `references/board-report-acceptance-rubric.md` | Human-readable rubric for board report quality |
| Board Report Rubric Module | `server/boardReportRubric.ts` | Automated rubric gate wired to PDF and DOCX exports |
| Soft Flags Open Items | `references/soft-flags-open-items.md` | Open-items register for H1, R2, R3 soft flags |

---

## Outstanding Human Actions (Required Before Circulating Outputs)

| Action | Owner | Priority | Status |
|---|---|---|---|
| Review DFS pilot agreement against consent-gap checklist; close all gaps with written sign-off | Commercial/Legal | P0 | Pending |
| Complete 25 pending scenario label review decisions and sign off record | Content Owner | P1 | Pending |
| Assign resolution owners and target dates for H1, R2, R3 soft flags | Programme Lead | P1 | Pending |
| Resolve or formally accept H1, R2, R3 before board report circulation | Resolution Owners | P1 | Pending |
