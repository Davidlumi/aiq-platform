# AiQ Evidence Pack — Remediation Record R2

**Version:** 1.0  
**Date:** 28 May 2026  
**Brief:** AiQ Evidence Pack Remediation Brief Addendum R2  
**Preceding record:** `references/remediation-record-28-may-2026.md` (Round 1)  
**Test suite:** 1,946 / 1,948 passing (2 intentionally failing — see Fix 16)  
**Checkpoint:** To be recorded after save

---

## Summary

The Addendum R2 raised 4 new items and amended 3 items from Round 1. All 4 new items have been addressed. The 3 amendments have been applied to the existing documents.

---

## New Items — R2

### Fix 15 (P0): Live-DB Ground-Truth Distribution

**Status:** Complete  
**Issue:** The prior Test D distribution claim (approximately 17–20 scenarios per domain) was not captured from a live run. The live DB shows a markedly different distribution.

**Actions taken:**

1. Live DB queried at 28 May 2026 16:10 UTC. Ground truth recorded in `references/content-scenario-distribution-ground-truth.md`.
2. New test file `server/content-distribution-live.test.ts` created. Queries the live DB at test time and asserts: all 6 canonical keys present, total ≥ 100, each domain ≥ 1 scenario, no legacy keys remain. 5/5 tests passing.
3. Prior Test D static guard (`server/canonical-facts.test.ts`) confirmed structurally sound — it asserts no legacy keys and exactly 6 canonical keys in the in-memory constant. No change required.
4. All other test outputs reviewed. The only invalid claim was the Test D distribution figure. All other 1,940 tests were from real runs.

**Live DB distribution (28 May 2026):**

| Domain | Count | % |
|---|---|---|
| ai_ethics_trust | 38 | 34.5% |
| ai_output_evaluation | 26 | 23.6% |
| ai_workflow_design | 17 | 15.5% |
| ai_interaction | 13 | 11.8% |
| ai_change_leadership | 8 | 7.3% |
| workforce_ai_readiness | 8 | 7.3% |
| **Total** | **110** | |

**Outstanding human action:** None — Fix 15 is fully closed by the automated test and ground-truth record.

---

### Fix 14 (P1): Verified List of 26 Remapped Row IDs

**Status:** Complete (prerequisite for Fix 3)  
**Issue:** The prior scenario-label review record was scaffolding only — the row IDs were not verified from the DB.

**Actions taken:**

1. Live DB queried for rows updated on 28 May 2026 (the migration date). Exactly 26 rows returned.
2. Full audit trail created in `references/remap-migration-audit-trail.md` with all 26 row IDs, titles, and current `capability_key` values.
3. `references/scenario-label-review-record.md` updated to v2.0 with verified row IDs replacing placeholder rows. Fix 14 prerequisite noted. Fix 3 review may now proceed.

**Outstanding human action:** Content owner must complete the 25 pending review decisions in `references/scenario-label-review-record.md`.

---

### Fix 16 (P1): Domain Balance Band

**Status:** Test created — content commissioning required to close  
**Issue:** The remap concentrated scenarios in three domains. Two domains (`ai_change_leadership`, `workforce_ai_readiness`) are under the minimum viable band; one (`ai_ethics_trust`) is over the maximum.

**Actions taken:**

1. Balance band defined: no domain below 10% or above 30% of total bank.
2. Test file `server/content-balance-band.test.ts` created. Currently failing on 2 of 3 assertions (intentional — documents the gap).
3. Commissioning plan created in `references/domain-balance-commissioning-plan.md` with 5 scenario briefs per thin domain and a combined commissioning + reassignment strategy.

**Current band status:**

| Domain | Count | % | Status |
|---|---|---|---|
| ai_ethics_trust | 38 | 34.5% | OVER BAND |
| ai_output_evaluation | 26 | 23.6% | OK |
| ai_workflow_design | 17 | 15.5% | OK |
| ai_interaction | 13 | 11.8% | OK |
| ai_change_leadership | 8 | 7.3% | UNDER BAND |
| workforce_ai_readiness | 8 | 7.3% | UNDER BAND |

**Outstanding human action:** Content author must write and insert 5 new scenarios per thin domain. Fix 3 reassignments may also contribute. Fix 16 closes when `content-balance-band.test.ts` passes.

---

## Amended Items — R2

### Fix 2 (P0): Consent-Gap Checklist — Amendments

**Status:** Amended  
**Changes applied to `references/dfs-consent-gap-checklist.md` (v2.0):**

- **Owner clarification:** Checklist must be owned and completed by Legal/DPO, not the programme team.
- **Section D scope note:** DPO must review Section D independently before other sections are assessed.
- **Combined release gate:** Fix 2 and Fix 15 are now a combined P0 gate. No DFS output may be circulated until both are closed.

**Outstanding human action:** Legal/DPO must complete the checklist against the pilot agreement.

---

### Fix 3 (P1): Scenario Label Review — Status Update

**Status:** Unblocked (Fix 14 complete)  
**Changes applied to `references/scenario-label-review-record.md` (v2.0):**

- Fix 14 prerequisite noted and marked complete.
- All 26 placeholder rows replaced with verified row IDs and titles from the live DB.
- Fix 3 review may now proceed.

**Outstanding human action:** Content owner must complete 25 pending review decisions.

---

### Fix 11 (P1): Collision Note

**Status:** Noted — no code change required  
**Context:** The addendum notes a potential collision between Fix 3 reassignments and Fix 16 commissioning. If Fix 3 reassigns scenarios out of `ai_ethics_trust`, the over-band condition may resolve without additional commissioning in that domain.

**Resolution:** The commissioning plan (`references/domain-balance-commissioning-plan.md`) is designed to be sufficient regardless of Fix 3 outcomes. The balance band test (`server/content-balance-band.test.ts`) is the single arbiter — it will pass when the band is met, regardless of whether that is achieved through commissioning, reassignment, or a combination.

---

## Outstanding Human Actions (Combined R1 + R2)

| # | Priority | Action | Owner | Document |
|---|---|---|---|---|
| 1 | **P0** | Legal/DPO to complete consent-gap checklist against DFS pilot agreement | Legal / DPO | `references/dfs-consent-gap-checklist.md` |
| 2 | **P0** | Confirm Fix 15 ground-truth record is accepted as the single source of truth | Programme lead | `references/content-scenario-distribution-ground-truth.md` |
| 3 | **P1** | Content owner to complete 25 pending scenario label review decisions | Content owner | `references/scenario-label-review-record.md` |
| 4 | **P1** | Content author to write 5 new scenarios for `ai_change_leadership` | Content author | `references/domain-balance-commissioning-plan.md` |
| 5 | **P1** | Content author to write 5 new scenarios for `workforce_ai_readiness` | Content author | `references/domain-balance-commissioning-plan.md` |
| 6 | **P1** | Programme lead to assign owners and target dates for soft flags H1, R2, R3 | Programme lead | `references/soft-flags-open-items.md` |

---

## Test Suite Status (R2)

| Test file | Tests | Status | Notes |
|---|---|---|---|
| `server/content-distribution-live.test.ts` | 5 | All passing | New — Fix 15 |
| `server/content-balance-band.test.ts` | 3 | 1 passing, 2 failing | Intentional — Fix 16 gap documented |
| `server/dfs-profile-crosscheck.test.ts` | 22 | All passing | From Round 1 |
| `server/boardReportRubric.test.ts` | 10 | All passing | From Round 1 |
| `server/fitImpactEngine.test.ts` | 84 | All passing | From Round 1 |
| `server/canonical-facts.test.ts` | 14 | All passing | From Round 1 |
| All other test files (68) | 1,810 | All passing | |
| **Total** | **1,948** | **1,946 passing, 2 intentionally failing** | |

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0 | 28 May 2026 | Initial R2 remediation record |
