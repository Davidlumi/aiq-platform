# AiQ v2.2 — Discrepancy Report
## Completion Pass — 23 April 2026

This report addresses the four pre-code-change items identified in the v2.2 Remediation Completion Pass prompt: signal inventory (item 1), failure mode threshold semantics (item 2), classification explanation panel (item 3), and confidence threshold reconciliation (item 9). No code has been changed prior to this report.

---

## Item 1 — Signal Inventory: 22 vs 17

**Finding: Documentation-only discrepancy. The code and database both hold 22 canonical signals. No signals have been removed.**

### Evidence

The `canonical_signal_keys` table, seeded in migration `0009_signal_key_constraints.sql`, contains exactly 22 rows. The `SignalKey` union type in `scoringEngine.ts` also enumerates exactly 22 keys, and the `SIGNAL_TO_CAPABILITY` map has exactly 22 entries. Both are consistent with the `canonical_signal_keys` seed data.

Section 3.1 of the delivered architecture document lists only 16 signals in its table (not 17 as the prompt states — the actual count is 16). The six signals present in the code but absent from the document are:

| Missing Signal | Capability Domain | Risk Signal |
|---|---|---|
| `consistency_index` | execution | No |
| `calibration_index` | judgement | No |
| `contradiction_index` | governance | Yes |
| `governance_bypass_risk` | governance | Yes |
| `automation_expansion_risk` | appropriateness | Yes |
| `cosmetic_focus_risk` | appropriateness | Yes |

Additionally, the document lists `validation_bypass_risk` (a signal that does not exist anywhere in the codebase, the schema, or the seed data) and incorrectly maps `avoidance_risk` to the `governance` capability domain. The code and migration 0009 both map it to `judgement`.

**Verdict:** This is a documentation error introduced when the architecture document was drafted. The scoring engine, the `canonical_signal_keys` table, and the `SignalKey` type are all internally consistent at 22 signals. No migration or code change is required. The architecture document Section 3.1 must be corrected to list all 22 signals, remove `validation_bypass_risk`, and correct the `avoidance_risk` capability mapping to `judgement`.

**No rollback risk.** No data has been lost or removed.

---

## Item 2 — Failure Mode Threshold Semantics: Items vs Unique Modes

**Finding: The delivered implementation uses unique-mode counting. The specification required item counting. This is a real semantic discrepancy and must be corrected.**

### What is in the code

`detectFailureModes` in `scoringEngine.ts` iterates over all answers and pushes a mode identifier into a `modes` array each time a threshold is exceeded. However, at the end of the function, it computes `uniqueBlockingModes` as a `Set` of the blocking mode identifiers, and uses `uniqueBlockingModes.size` (not `blockCount`) as the value compared against the configurable threshold. The comment in the code explicitly states: *"E3: blockCount now counts unique blocking failure modes only (not per-answer occurrences). This prevents a single repeated pattern from inflating the classification impact."*

The variable `blockCount` is incremented per answer but is never used in the final threshold comparison — only `uniqueBlockCount` (the set size) is used.

### Why item counting is correct

The v2.2 prompt's stated purpose for the two-item threshold was: *"to prevent a single bad answer blocking a classification."* Under item counting, a participant must produce at least two answers that each individually exceed the threshold before a block is triggered. This correctly prevents a single outlier answer from blocking an otherwise strong session.

Under unique-mode counting, a participant who catastrophically fails one governance mode across ten consecutive answers is not blocked — only one unique mode was triggered. This is the opposite of the intended behaviour. The unique-mode approach would only block participants who fail across multiple *categories*, which is a much higher bar than the specification intended.

The unique-mode counting approach also has a perverse consequence: a participant who fails `blind_ai_acceptance` on every single item in the session (10 items) is treated identically to a participant who fails it on exactly one item. Both produce `uniqueBlockCount = 1`, which is below the default threshold of 2, so neither is blocked. This is clearly incorrect.

**Verdict:** Item counting is correct. The implementation must be changed to use `blockCount` (per-answer occurrences of blocking modes) rather than `uniqueBlockingModes.size`. The configurable threshold docstring and Section 5.2 of the architecture document must be updated accordingly. A regression test for the "10 items triggering one mode → blocks" case must be added.

**Rollback risk: Low.** The change makes the engine *stricter* (more likely to block). Any sessions scored under the unique-mode implementation that were not blocked may have been under-penalised. However, since v2.2 has not been activated in production (the v2.2 scoring config row is seeded as `is_active = 0`), no live participant data is affected.

---

## Item 3 — "Why this classification?" Panel: Procedure vs Panel

**Finding: Both the backend procedure and the participant-facing frontend panel exist. The panel is functional but incomplete in two respects: (a) it does not render an explicit Unknown-Insufficient-Evidence variant, and (b) the `topStrengths` and `topGaps` lists cite capability domain names only (aggregates), not specific item references. The second gap is a dependency of WS1.3 (contribution breakdown), which is partially implemented.**

### Evidence

The `getClassificationExplanation` tRPC procedure exists in `server/routers/assessment.ts` at line 1780. The participant-facing expandable panel exists in `client/src/pages/assessment/AssessmentResultsPage.tsx` at line 912, wired to the procedure via `trpc.assessment.getClassificationExplanation.useQuery`. The panel renders factors with directional icons, top strengths, top gaps, and a provisional caveat banner.

**Gap 1 — Unknown-Insufficient-Evidence variant.** The procedure returns `isProvisional: true` when `state === "unknown_insufficient_evidence"` or `confScore < 0.4`, and the panel renders a generic amber provisional banner. However, the specification required a distinct variant for this state that explains to the participant that insufficient evidence was collected and prompts them to complete the full assessment. The current panel does not distinguish between "provisional due to low confidence" and "provisional due to insufficient evidence" — both show the same amber banner with the same text.

**Gap 2 — Item references in top contributions.** The `topStrengths` and `topGaps` arrays are built from `Object.entries(capabilityScores)` — they cite capability domain names (e.g. "governance", "execution"), not specific items. The WS1.3 `contribution_breakdown` column exists on `assessment_answers` and is populated on answer submission, but `getClassificationExplanation` does not read from it. The panel therefore cannot cite "you answered scenario X with option Y which contributed +2.52 to governance."

**Verdict:** The panel exists and is documented as Section 9.3 of the architecture document. It requires two targeted improvements: (a) an explicit Unknown-Insufficient-Evidence variant, and (b) wiring to `contribution_breakdown` for item-level citations. Both are implementation tasks, not architecture questions. They are addressed in items 3 and 4 of the implementation plan.

**No rollback risk.** The panel is additive; no existing functionality is broken.

---

## Item 9 — Confidence Threshold Reconciliation: 0.40 vs 0.55

**Finding: The delivered implementation uses a single gate threshold of 0.55 (not 0.40 as in v2.1, and not 0.50 as the prompt states). The architecture document Section 9.2 contains a further inaccuracy — it describes the threshold as 0.50 but the code uses 0.55. The design is intentional and defensible, but the documentation is inconsistent with the code.**

### Exact behaviour at each boundary

The following table documents the precise behaviour of `applyClassificationConfidenceGate` at each relevant confidence value:

| Confidence | Band | `safe` input → output | `at_risk` input → output | Participant sees |
|---|---|---|---|---|
| 0.39 | `low` | `safe` → `at_risk` (downgraded) | `at_risk` → `at_risk` | Developing classification with low-confidence caveat |
| 0.40 | `low` | `safe` → `at_risk` (downgraded) | `at_risk` → `at_risk` | Developing classification with low-confidence caveat |
| 0.45 | `low` | `safe` → `at_risk` (downgraded) | `at_risk` → `at_risk` | Developing classification with low-confidence caveat |
| 0.50 | `low` | `safe` → `at_risk` (downgraded) | `at_risk` → `at_risk` | Developing classification with low-confidence caveat |
| 0.55 | `moderate` | `safe` → `safe` (no downgrade) | `at_risk` → `at_risk` | AI-Ready classification |

The `low` band spans 0.35–0.54 (inclusive of 0.35, exclusive of 0.55). The `insufficient` band spans 0.00–0.34. There is no separate 0.40 floor in the delivered code — the v2.1 `unknown_insufficient_evidence` state is produced by `classifyReadiness` when evidence is below the minimum evidence gate, not by the confidence gate.

The `at_risk` → `insufficient_evidence` downgrade triggers only when `compositeConfidence < 0.35`, which corresponds to the `insufficient` band boundary.

### The 0.40–0.49 band

In this band, a participant who would otherwise be classified as `safe` is downgraded to `at_risk`. A participant who would otherwise be classified as `at_risk` remains `at_risk`. There is no state in this band that produces `unknown_insufficient_evidence` from the confidence gate alone — that state is produced upstream by the evidence gate.

### Assessment of the 0.55 threshold

The `MINIMUM_SAFE_CLASSIFICATION_CONFIDENCE = 0.55` constant is set at the boundary between the `low` and `moderate` bands. The rationale documented in the code is: *"A false 'safe' result is the highest-stakes error. It is better to require a repeat assessment than to certify someone as safe when the evidence is unreliable."* This is a sound design decision. Requiring `moderate` confidence (≥ 0.55) before issuing a `safe` classification is more conservative than the v2.1 0.40 floor, but the conservatism is appropriate given the stakes.

The 0.55 value is not arbitrary — it is the exact boundary of the `moderate` confidence band, meaning the gate is semantically equivalent to "require at least moderate confidence to classify as safe." This is cleaner than an arbitrary value like 0.50.

**Verdict:** The 0.55 threshold is intentional, defensible, and should be retained. However, three documentation corrections are required:

1. Section 9.2 of the architecture document states the threshold is 0.50 — this must be corrected to 0.55.
2. The band table in Section 9.2 is also incorrect: it shows `low` as 0.40–0.54 and `insufficient` as < 0.40, but the code uses 0.35 as the `insufficient` boundary. The table must be corrected to match the code (low: 0.35–0.54, insufficient: < 0.35).
3. Tests covering the 0.40–0.49 band interaction must be added to confirm the behaviour described above.

**No rollback risk.** The threshold is already in production-ready code and no data has been scored against it (v2.2 scoring config is inactive).

---

## Summary

| Item | Finding | Rollback Risk | Action Required |
|---|---|---|---|
| 1 — Signal inventory | Documentation error only. Code and DB have 22 signals. | None | Correct Section 3.1 of architecture doc |
| 2 — Failure mode semantics | Real semantic discrepancy. Code uses unique-mode counting; spec requires item counting. | Low (v2.2 config inactive) | Change `detectFailureModes` to use `blockCount`; update doc and tests |
| 3 — Classification panel | Panel exists. Two gaps: no explicit insufficient-evidence variant; no item-level citations. | None | Implement both gaps as part of items 3 and 4 |
| 9 — Confidence threshold | 0.55 threshold is intentional and correct. Doc says 0.50 and has incorrect band boundaries. | None | Correct Section 9.2 of architecture doc; add band-boundary tests |

**Recommendation:** Proceed with all four implementation items. No rollback is required. Items 1 and 9 are documentation-only fixes. Item 2 is a code change that makes the engine stricter but does not affect live data. Item 3 requires targeted UI and procedure improvements.
