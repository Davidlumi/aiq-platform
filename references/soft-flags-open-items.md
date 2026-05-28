# Soft Flags — Open Items Register

**Version:** 1.0  
**Date:** 28 May 2026  
**Remediation item:** Fix 7 (P1) — AiQ Evidence Pack Remediation Brief, 28 May 2026

---

## Purpose

The brief (Fix 7, P1) requires that the three soft flags acknowledged during the DFS evidence-pack journey (H1, R2, R3) are recorded as **open items with resolution owners**, not as closed issues. Acknowledging a soft flag in the UI allows the journey to proceed to Stage 10 lock — it does not close the underlying concern.

This document is the formal open-items register for those flags. It must be linked in the DFS evidence pack before any board report is circulated.

---

## UI Journey Verification

| Item | Status |
|---|---|
| Full reward journey (Stages 1–10) traversable via UI | Verified — see capture screenshots in `aiq-capture/screenshots/A/` |
| Stage 10 lock reached via UI | Verified — screenshot `A_stage10_locked.png` in capture pack |
| Lock reached only after all hard blocks cleared | Verified — `canLock()` gate logic confirmed in `server/services/rewardReviewService.ts` |
| Soft flags acknowledged (not auto-dismissed) | Verified — UI shows acknowledgement modal for each soft flag |

---

## Soft Flag Definitions

Soft flags are advisory checks that do not block the journey lock but require explicit acknowledgement. They represent genuine concerns that should be tracked and resolved after lock.

| Flag ID | Category | Trigger condition | Stage |
|---|---|---|---|
| H1 | Coherence | Every strategic shift must be served by ≥1 selected initiative. AI judgment — can disagree with Stage 5 recommendations. | Stage 5 |
| R2 | Readiness | ≥1 significant capability gap (red) has no enablement action recorded. | Stage 8 |
| R3 | Readiness | Enablement cost (Stage 8) is > £0 and is additional to the business-case investment. | Stage 8 |

---

## Open Items — DFS Evidence Pack Journey

### H1 — Shift Coverage (Coherence)

| Field | Value |
|---|---|
| Flag ID | H1 |
| Status | **Open** |
| Acknowledged in journey | Yes — acknowledged to proceed to lock |
| Acknowledged ≠ resolved | The AI judgment that flagged this may be correct. A shift may genuinely lack coverage. |
| Concern | The H1 check is an independent LLM judgment. If it flagged a shift, that shift may not be adequately served by the selected portfolio. Stage 5's recommendation engine and H1 are separate LLM calls and can disagree — there is no structural guarantee they align. |
| Resolution required | Content owner to review the specific shift(s) flagged and confirm either: (a) the selected initiative does serve the shift and H1 was a false positive, or (b) an additional initiative should be added to the portfolio. |
| Resolution owner | *(to be assigned)* |
| Target resolution date | *(to be assigned)* |
| Resolution record | *(to be completed when resolved)* |

### R2 — Capability Reds Without Enablement Actions (Readiness)

| Field | Value |
|---|---|
| Flag ID | R2 |
| Status | **Open** |
| Acknowledged in journey | Yes — acknowledged to proceed to lock |
| Acknowledged ≠ resolved | The capability gap(s) that triggered R2 remain unaddressed in the plan. |
| Concern | One or more capability dimensions assessed as a significant gap (red) in Stage 8 do not have an enablement action recorded. The board report and investment case may therefore understate the true cost and effort required to deliver the strategy. |
| Resolution required | For each red capability dimension without an action: either (a) add a specific enablement action in Stage 8, or (b) document why no action is required (e.g. the gap is addressed by an existing programme outside this strategy). |
| Resolution owner | *(to be assigned)* |
| Target resolution date | *(to be assigned)* |
| Resolution record | *(to be completed when resolved)* |

### R3 — Enablement Cost Material (Readiness)

| Field | Value |
|---|---|
| Flag ID | R3 |
| Status | **Open** |
| Acknowledged in journey | Yes — acknowledged to proceed to lock |
| Acknowledged ≠ resolved | The enablement cost is real and is not yet reflected in the business case. |
| Concern | Stage 8 recorded an enablement cost (capability investment) that is additional to the business-case investment modelled in Stage 7. If this cost is not folded into the business case, the board report will present an incomplete investment picture. |
| Resolution required | Either: (a) add a phase-0 enablement line to the business case in Stage 7 and re-confirm, or (b) document why the enablement cost is funded separately and reference the funding source. |
| Resolution owner | *(to be assigned)* |
| Target resolution date | *(to be assigned)* |
| Resolution record | *(to be completed when resolved)* |

---

## Closure Criteria

An open item is closed when:

1. The resolution action has been completed (not just planned).
2. The resolution is documented in the "Resolution record" field above.
3. A named owner has confirmed the closure.
4. If the resolution involved a change to the strategy or business case, the board report has been regenerated and re-reviewed against the acceptance rubric (`references/board-report-acceptance-rubric.md`).

---

## Sign-Off

| Field | Value |
|---|---|
| Register created by | Manus AI (automated) |
| Register date | 28 May 2026 |
| H1 owner assigned | No — pending |
| R2 owner assigned | No — pending |
| R3 owner assigned | No — pending |
| All items closed | No |
| Approved to circulate board report | **No** — open items must be resolved or formally accepted before circulation |

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0 | 28 May 2026 | Initial register — Fix 7 (P1) from DFS Evidence Pack Remediation Brief. H1, R2, R3 recorded as open. |
