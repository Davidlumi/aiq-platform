# AiQ Assessment UX/UI Audit Findings
**Date:** 23 April 2026 | **Auditor:** Manus AI | **Version:** 2.2

---

## Critical Bugs Fixed

### BUG-1: React Hooks Violation — Assessment Session Page Crashes After First Answer ✅ FIXED
**Severity:** P0 — Critical  
**Root cause:** Three hooks (`handleSubmit` useCallback + two `useEffect`) were placed after the `if (rationaleData)` early return at line 699. On first render `rationaleData` is null so hooks run. After submitting an answer, `rationaleData` is set and the component returns early — skipping those hooks. React throws "Rendered more hooks than during the previous render."  
**Fix:** Moved all three hooks to before the first early return (`if (isLoading)`) at line 627. The hooks now run unconditionally on every render, using `sessionData?.nextItem` instead of the post-guard `nextItem` local variable.  
**Verification:** Submitted answer → rationale screen rendered → Continue → Q2 loaded. No crash.

---

## Pre-Assessment Profiling Modal Issues

### UX-01: Tooltip appears on load without user action
The "Why we ask" tooltip fires immediately on modal open, covering the role family grid. It should only appear on explicit hover/click of the "Why we ask" button.

### UX-02: Continue button greyed with no affordance
The Continue button appears disabled with no visual indication that a selection is required before it activates. A helper text "Select a role family to continue" would resolve this.

### UX-03: Role family icons are inconsistent
Some role tiles use coloured icon backgrounds, others use plain outlines. Inconsistent icon style breaks visual cohesion.

### UX-04: No explicit seniority level collection
The profiling modal has 4 steps (Role Family → Your Role → AI Experience → Context) but never collects seniority level explicitly. The engine uses seniority for role-aware gaming thresholds but infers it from the role archetype only. A junior HRBP and a senior HRBP get identical treatment.

### UX-05: Modal step indicator not labelled
The step dots at the top are present but the current step is indicated only by colour — no text label for the active step.

---

## Assessment Session Issues

### UX-06: AI Output Block Content Truncated / Missing
**Severity:** P1 — High  
On Q2 (Error Detection — "Hallucinated Statistic in Board Note"), the AI Output block shows only the scenario context sentence, not the actual AI-generated content to critique. The `aiOutput` field appears empty for this item. Candidate cannot answer meaningfully.

### UX-07: Timer Shows "0s" on Question 2
**Severity:** P2 — Medium  
The timer badge shows `⏱ 0s · Level 3` at the start of Q2. The `itemStartTime` is not being reset when the Continue button is clicked (clearing `rationaleData`). Fix: reset `itemStartTime` in the Continue click handler.

### UX-08: "Explain Your Thinking" Textarea Missing on Error Detection
**Severity:** P2 — Medium  
The reasoning textarea appeared on Q1 (Situational Judgement) but not on Q2 (Error Detection). The textarea should appear consistently across all interaction types.

### UX-09: No Confirmation Dialog on "Back to Assessments"
**Severity:** P2 — Medium  
Clicking "Back to Assessments" during an in-progress assessment navigates away immediately with no warning. The session persists but the user has no indication of this. Fix: add a confirmation dialog with "Your progress is saved. You can resume from the Assessment page."

### UX-10: Option Numbering Inconsistency Between Question and Rationale Screens
**Severity:** P2 — Medium  
During the question, options are numbered 1–4. In the rationale "Other Options" section, they are shown as A/B/C/D circles. This inconsistency is confusing — a user who selected "4" sees it referred to as "D" in the rationale.

### UX-11: No Pause / Save & Exit Button
**Severity:** P2 — Medium  
There is no explicit "Save & Exit" button. Users who need to stop mid-assessment must navigate away and hope the session persists. Fix: add a "Save & Exit" button that navigates to the assessment list with a toast: "Progress saved. Resume anytime."

### UX-12: Confidence Slider Default at 50% — No Midpoint Label
**Severity:** P3 — Low  
The confidence slider starts at 50% with no midpoint label. Only "Not confident" and "Very confident" are shown at the extremes. Fix: add "Moderately confident" at the midpoint.

### UX-13: Interaction Type Icons — Error Detection and AI Output Critique Share Same Icon
**Severity:** P3 — Low  
Both `error_detection` and `scenario_critique` use the `Search` icon. Fix: use `AlertCircle` or `Bug` for error_detection.

### UX-14: Progress Bar Imperceptible for Long Assessments
**Severity:** P3 — Low  
With 49 questions, the progress bar barely moves per question (2% per answer). Consider showing "X of 49 answered" as the primary indicator alongside the bar.

---

## Scoring Credibility Findings (from Stress Test — 110 cases, 11 roles × 10 scenarios)

### SC-1: Expert Performers Classified as at_risk
**Severity:** P1 — High  
Expert performers with overall score 86 but one weak capability (governance = 65) trigger `thresholdFailures > 0` and are classified as `at_risk`. The threshold failure condition is too strict for high overall performers.

### SC-2: Inconsistent Performers Score Same as Expert
**Severity:** P1 — High  
A performer scoring 95/95/95/95/95/30 averages the same overall score as one scoring 78/78/78/78/78/78. The variance/inconsistency is not penalised. Fix: add a `consistencyPenalty` to the overall score.

### SC-3: Signal Key Mapping Gap
**Severity:** P2 — Medium  
Signal keys `appropriateness_calibration` and `workflow_integration` do not exist in `SIGNAL_TO_CAPABILITY`. These capabilities receive no signal deltas and default to 50. Audit all capability keys against the signal mapping.

---

## Positive Findings

- Adaptive difficulty escalation works correctly (Q1 Level 1 → Q2 Level 3 after strong answer)
- Rationale screen content is high quality with substantive "Why this matters" explanations
- Interaction type variety is good with visually distinct colour coding
- Keyboard navigation (1–4 to select, Enter to submit) confirmed functional
- Gaming detection fires correctly for speed-gaming scenarios
- Role-specific content is credible and contextually appropriate
- Session persistence works — resume flow confirmed functional
