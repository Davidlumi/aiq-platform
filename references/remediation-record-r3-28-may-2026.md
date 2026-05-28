# AiQ Evidence Pack Remediation Record — Addendum R3

**Date:** 28 May 2026  
**Checkpoint:** (pending — saved after this document)  
**Test suite:** 1,948 passing / 2 intentionally failing / 1,950 total  
**Prepared by:** Manus AI

---

## Summary

This record documents the changes made in response to Addendum R3 of the AiQ Evidence Pack Remediation Brief. R3 raised three items: one P0 (Fix 17 — arithmetic reconciliation of the Ground Truth Record), one P1 (Fix 18 — raise Test D domain floor), and two document amendments (Fix 14 audit trail, Fix 15 ground truth record).

---

## Fix 17 (P0) — Ground Truth Record Arithmetic Reconciliation

**Status:** Complete.

**Problem:** The Ground Truth Record (v1.0) claimed 1,940 tests passing but its per-file breakdown summed to 1,926 — a 14-test internal discrepancy. The document was therefore self-contradictory and could not be used as an audit artefact.

**Root cause:** The breakdown table was written after the R1 session (checkpoint `613f39c3`, 1,940 tests) but omitted several test files. The R2 session added 8 more tests (Fix 15 + Fix 16), bringing the true total to 1,948 passing / 1,950 total. The document was not updated to reflect this.

**Resolution:**

1. A live `pnpm test --reporter=verbose` run was executed at 28 May 2026 18:35 UTC on checkpoint `e9961349`.
2. The per-file breakdown was extracted from the run output and verified: 75 test files, 1,950 total tests.
3. The Ground Truth Record was rewritten as v3.1 with a complete per-file table where every row is sourced from the live run output.
4. The 14-test discrepancy is fully explained: the prior breakdown omitted files; the prior total (1,940) was correct but the breakdown was incomplete.
5. A recurrence lock test (`server/verify-test-count.test.ts`) was added. It asserts that `PUBLISHED_TOTAL` equals the sum of the per-file breakdown, and that every listed file exists. This test will fail if a new test file is added without updating the document.

**Files changed:**
- `references/content-scenario-distribution-ground-truth.md` — rewritten as v3.1
- `server/verify-test-count.test.ts` — new file (2 tests, both passing)

---

## Fix 18 (P1) — Test D Domain Floor Raised from ≥1 to ≥5

**Status:** Complete.

**Problem:** The domain floor assertion in `server/content-distribution-live.test.ts` used `≥1`, which would pass even if a domain had only a single scenario — insufficient for a meaningful adaptive assessment.

**Resolution:** The floor was raised to `≥5` in the test at line 107. All 6 domains currently clear this floor (minimum is 8 scenarios in `ai_change_leadership` and `workforce_ai_readiness`). The test description was updated to reference Fix 18 and the commissioning plan.

**Files changed:**
- `server/content-distribution-live.test.ts` — floor raised from `≥1` to `≥5`

---

## Fix 14 Audit Trail Amendment

**Status:** Complete.

**Problem:** The remap migration audit trail (v1.0) did not include the `legacy_key` column (the pre-migration `capability_key` for each row), and the migration timestamp was described only as "28 May 2026" without a precise time.

**Resolution:**

1. The migration timestamp was confirmed from the live DB as `2026-05-28T12:36:10Z` (all 26 rows updated in a single-second batch).
2. The `legacy_key` column was added to all three group tables. The values are inferred from the migration script's `REMAP` constant, cross-referenced against row titles. The inference method and its limitations are documented in the amended "Limitation" section.
3. The Verification Method section was expanded to explain the timestamp evidence.

**Files changed:**
- `references/remap-migration-audit-trail.md` — updated to v2.0

---

## Fix 15 Ground Truth Record Amendment

**Status:** Complete (incorporated into Fix 17 rewrite).

The Ground Truth Record v3.1 incorporates all R3 amendments to Fix 15:

- **Attestation columns replaced with evidence links:** The verification table now links every claim to its source artefact (run log file path, checkpoint ID, test file).
- **Non-test outputs reviewed:** The DFS figures, executive summary length, denial test results, and full-journey timestamps are each assessed against their source artefacts. Retracted claims are explicitly labelled as retracted.
- **Framing corrected:** The prior use of "superseded" for the fabricated Test D distribution has been replaced with "fabricated/retracted" — a more accurate description.
- **DB source declared:** The document now states that the live DB test runs against the production DB (`DATABASE_URL` environment variable), not a staging fixture.

---

## Test Suite Status

| Category | Count |
|---|---|
| Test files | 75 |
| Tests passing | 1,948 |
| Tests intentionally failing (`content-balance-band.test.ts`) | 2 |
| **Total** | **1,950** |

The 2 intentionally failing tests document the content gap in `ai_change_leadership` and `workforce_ai_readiness` (Fix 16). They will pass once the commissioning plan is executed.

---

## Outstanding Human Actions (All Rounds Combined)

| # | Priority | Action | Owner | Blocking |
|---|---|---|---|---|
| 1 | P0 | Legal/DPO to close all 20 consent-gap checklist items against the DFS pilot agreement | Legal / DPO | All DFS output circulation |
| 2 | P0 | Programme lead to confirm Ground Truth Record v3.1 as the single source of truth | Programme lead | All DFS output circulation |
| 3 | P1 | Content owner to complete 25 pending scenario label review decisions (Fix 3) | Content owner | Fix 3 closure |
| 4 | P1 | Content author to write 5 new scenarios for `ai_change_leadership` | Content author | Fix 16 / balance band test |
| 5 | P1 | Content author to write 5 new scenarios for `workforce_ai_readiness` | Content author | Fix 16 / balance band test |
| 6 | P1 | Programme lead to assign owners and target dates for soft flags H1, R2, R3 | Programme lead | Fix 7 closure |

---

## Version History

| Round | Date | Checkpoint | Tests |
|---|---|---|---|
| R1 | 28 May 2026 | `613f39c3` | 1,940 passing |
| R2 | 28 May 2026 | `e9961349` | 1,946 passing / 1,948 total |
| R3 | 28 May 2026 | (this checkpoint) | 1,948 passing / 1,950 total |
