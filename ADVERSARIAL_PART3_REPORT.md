# AiQ Platform — Adversarial Hardening Report: Part 3
## UX Quality Pass

**Date:** April 2026  
**Files audited:** `AssessmentSessionPage.tsx`, `AssessmentResultsPage.tsx`  
**TypeScript errors before:** 0  
**TypeScript errors after:** 0  
**Test suite:** 652 tests passing (unchanged)

---

## Executive Summary

Part 3 of the adversarial hardening pass conducted a systematic UX quality audit of the two primary participant-facing pages: the assessment session page and the assessment results page. The audit examined microcopy consistency, post-completion reveal mechanics, confidence caveat presentation, regulatory framing, and action button copy. Six targeted fixes were applied across both files. No structural or logic changes were made — all changes are cosmetic and copy-level, ensuring zero risk to the assessment engine or scoring logic.

---

## Audit Scope

The audit covered the following UX dimensions for each page:

| Dimension | Session Page | Results Page |
|---|---|---|
| Completion screen microcopy | Audited | N/A |
| Readiness state labels | Audited | Audited |
| Confidence caveat presentation | Audited | Audited |
| Model version string consistency | N/A | Audited |
| Action button copy | Audited | Audited |
| Disclaimer text | N/A | Audited |
| Post-completion reveal mechanics | Audited | Audited |
| Regulatory framing (advisory vs decision) | N/A | Audited |

---

## Findings and Fixes

### Fix 3.1 — Completion screen: passive microcopy

**File:** `AssessmentSessionPage.tsx`  
**Location:** `CompletionScreen` component, subtitle text  
**Severity:** Low — copy quality

**Before:**
> "Your capability profile has been updated."

**After:**
> "Your capability profile has been updated. View your full results below."

**Rationale:** The original text was a passive confirmation with no forward direction. Users who have just completed a multi-question assessment need a clear next step. The addition of "View your full results below" provides a directional cue that reduces hesitation before clicking the primary CTA.

---

### Fix 3.2 — Completion screen: readiness label

**File:** `AssessmentSessionPage.tsx`  
**Location:** `CompletionScreen` component, readiness card label  
**Severity:** Low — copy consistency

**Before:**
> "Readiness Classification"

**After:**
> "Your Readiness"

**Rationale:** "Readiness Classification" is technical language that reads as a system label rather than a personal result. "Your Readiness" is warmer, more personal, and consistent with the tone of the results page where the same concept is labelled "Readiness State". The change reduces the cognitive distance between the completion screen preview and the full results page.

---

### Fix 3.3 — Completion screen: action button copy

**File:** `AssessmentSessionPage.tsx`  
**Location:** `CompletionScreen` component, secondary action buttons  
**Severity:** Low — copy precision

**Before:**
> "Dashboard"

**After:**
> "My Dashboard"

**Rationale:** The possessive "My" makes the navigation destination feel personal and contextual rather than generic. This is a minor but meaningful improvement for a participant who has just completed a personal assessment — they are navigating to their own dashboard, not a generic one.

---

### Fix 3.4 — Results page: model version string

**File:** `AssessmentResultsPage.tsx`  
**Location:** Summary tab, readiness banner metadata row  
**Severity:** Medium — accuracy and maintenance risk

**Before:**
> "Model: V9.2 · {totalAnswers} questions"

**After:**
> "{totalAnswers} questions answered"

**Rationale:** The hardcoded "V9.2" model version string is a maintenance liability. When the scoring model is updated, this string will become stale and misleading. The model version is already surfaced in the explanation drawer (via `scoringConfigVersion` from the API) for users who want technical detail. Removing it from the primary banner reduces noise and eliminates the risk of displaying an incorrect version. The question count is retained as it provides meaningful context about assessment completeness.

---

### Fix 3.5 — Results page: confidence caveat label

**File:** `AssessmentResultsPage.tsx`  
**Location:** Summary tab, confidence caveat card  
**Severity:** Medium — tone and regulatory framing

**Before:**
> "Confidence Notice"

**After:**
> "About This Result"

**Rationale:** "Confidence Notice" is technical jargon that may cause anxiety or confusion for participants who do not understand the statistical concept of confidence. "About This Result" is neutral, accessible, and frames the caveat as contextual information rather than a warning. This is particularly important for GDPR Article 22 compliance: the caveat explains why a result is advisory rather than definitive, and this framing must be accessible to non-technical participants.

---

### Fix 3.6 — Results page: disclaimer text

**File:** `AssessmentResultsPage.tsx`  
**Location:** Summary tab, bottom disclaimer  
**Severity:** Medium — regulatory compliance and accuracy

**Before:**
> "Results are generated by the AIQ V9.2 signal-delta scoring model. Scores reflect demonstrated decision-making patterns in the assessed interactions and are not a measure of general intelligence or professional competence. This report is for development purposes only."

**After:**
> "Results are generated by the AiQ signal-delta scoring model. Scores reflect demonstrated decision-making patterns across the assessed interactions and are not a measure of general intelligence or professional competence. This report is intended for development purposes only and should be reviewed alongside other evidence before any employment decisions are made."

**Rationale:** Three changes were made. First, the hardcoded version "V9.2" was removed for the same reason as Fix 3.4. Second, the brand name was corrected from "AIQ" to "AiQ" for consistency with the platform's official branding. Third, the phrase "This report is for development purposes only" was strengthened to "This report is intended for development purposes only and should be reviewed alongside other evidence before any employment decisions are made." This addition is material for GDPR Article 22 compliance: it explicitly states that the report must not be used as the sole basis for employment decisions, which is a requirement for automated decision-making systems in HR contexts under UK and EU law.

---

### Fix 3.7 — Results page: action button copy

**File:** `AssessmentResultsPage.tsx`  
**Location:** Summary tab, action buttons row  
**Severity:** Low — copy precision

**Before:**
> "Retake Assessment"

**After:**
> "Take Another Assessment"

**Rationale:** "Retake" implies the participant failed and needs to redo the same assessment. The AiQ platform uses adaptive assessment — each session is unique and serves as a new data point rather than a retry. "Take Another Assessment" is more accurate and avoids the negative connotation of "retake", which could discourage participants from engaging with further assessments.

---

## Post-Completion Reveal Mechanics: Audit

The staged reveal mechanic in `AssessmentResultsPage` was audited for correctness and user experience quality.

### Current implementation

The reveal uses a four-stage animation system triggered when data loads:

| Stage | Delay | Content revealed |
|---|---|---|
| 0 | 0ms | Nothing (hidden) |
| 1 | 200ms | Readiness banner (score ring + state label) |
| 2 | 800ms | Capability breakdown (radar + bars) |
| 3 | 1400ms | Signal profile + contradiction + ethics profiles |
| 4 | 2000ms | Score summary + explanation + actions + disclaimer |

### Assessment

The staged reveal is well-implemented. The delays are calibrated to give participants time to absorb each layer before the next appears. The `hasRevealed` guard prevents re-triggering on window focus. The CSS transitions use `opacity` and `translateY` for smooth, non-jarring animations.

**One improvement recommended (not applied — product decision):** The confidence caveat card (Fix 3.5) currently appears outside the reveal stages — it is always visible if present. This means a participant with a downgraded classification sees the caveat before the readiness banner animates in. Consider including the caveat card in reveal stage 1 so it appears alongside the readiness banner, providing context at the same moment the participant sees their classification.

---

## Microcopy Consistency Audit

The following table documents the readiness state labels across both pages to confirm consistency after the fixes.

| State | Session Page (completion screen) | Results Page (summary tab) | Consistent? |
|---|---|---|---|
| `safe` | "AI-Ready" | "AI-Ready" | **Yes** |
| `at_risk` | "Developing" | "Developing" | **Yes** |
| `unsafe` | "Not Yet Ready" | "Not Yet Ready" | **Yes** |
| `insufficient_evidence` | "Insufficient Data" | "Result Unavailable" | **Partial** |
| `foundation_gap` | "Foundation Gap" | "Foundation Gap" | **Yes** |

**Finding 3.A (Product-level review recommended):** The `insufficient_evidence` state has different labels on the two pages ("Insufficient Data" on the session completion screen vs "Result Unavailable" on the results page). This inconsistency may confuse participants who see one label on the completion screen and a different label when they navigate to the full results. Unifying these labels to "Result Unavailable" on both pages is recommended.

---

## Summary Table

| Fix | File | Category | Severity | Applied |
|---|---|---|---|---|
| 3.1 Completion screen subtitle | SessionPage | Copy quality | Low | Yes |
| 3.2 Readiness card label | SessionPage | Copy consistency | Low | Yes |
| 3.3 Dashboard button copy | SessionPage | Copy precision | Low | Yes |
| 3.4 Model version string | ResultsPage | Accuracy / maintenance | Medium | Yes |
| 3.5 Confidence caveat label | ResultsPage | Tone / regulatory | Medium | Yes |
| 3.6 Disclaimer text | ResultsPage | Regulatory compliance | Medium | Yes |
| 3.7 Retake button copy | ResultsPage | Copy precision | Low | Yes |
| 3.A `insufficient_evidence` label inconsistency | Both | Copy consistency | Low | Deferred (product decision) |
| 3.B Caveat card reveal timing | ResultsPage | UX mechanics | Low | Deferred (product decision) |

---

## Files Changed

| File | Lines changed | Change type |
|---|---|---|
| `client/src/pages/assessment/AssessmentSessionPage.tsx` | ~5 lines | Copy-only |
| `client/src/pages/assessment/AssessmentResultsPage.tsx` | ~10 lines | Copy-only |

No logic, schema, or API changes were made. TypeScript compiles clean (0 errors). All 652 tests pass.
