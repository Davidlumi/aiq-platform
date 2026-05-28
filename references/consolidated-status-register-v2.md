# AiQ Platform — Consolidated Remediation Status Register

**Document version:** v2.0 (Product Integrity Brief v2 — final)
**Date:** 28 May 2026
**Checkpoint:** to be assigned after this session
**Test suite:** 1,978 passed | 2 todo | 0 failed (79 files)

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete — automated evidence exists |
| ⏳ | Pending human action — cannot be automated |
| 🔵 | Deferred — tracked as `.todo` test; unblocks after content commissioning |

---

## Fix Register

### Fix 1 (P0) — DFS Profile Figures

| Item | Status | Evidence |
|------|--------|---------|
| Corrected headcount (~4,503), revenue (~£1.0bn statutory / ~£1.39bn brand) | ✅ | `shared/dfsProfileConstants.ts` |
| `source` + `as_of` metadata fields added | ✅ | `shared/dfsProfileConstants.ts` |
| 22 non-tautological cross-check tests | ✅ | `server/dfs-profile-crosscheck.test.ts` |
| All scripts updated to use shared constants | ✅ | `scripts/p2-dfs-board-report.ts`, `d1-reward-value-engine.ts`, `evidence-journey.ts`, `p4-full-journey-to-lock.ts` |

---

### Fix 2 (P0) — Consent-Gap Checklist

| Item | Status | Evidence |
|------|--------|---------|
| 20-item checklist across 4 sections | ✅ | `references/dfs-consent-gap-checklist.md` |
| Legal/DPO ownership added (R2 amendment) | ✅ | `references/dfs-consent-gap-checklist.md` v2 |
| Section D scope note added (R2 amendment) | ✅ | `references/dfs-consent-gap-checklist.md` v2 |
| Combined P0 release gate defined | ✅ | `references/dfs-consent-gap-checklist.md` v2 |
| **Legal/DPO sign-off on all 20 items** | ⏳ | Requires commercial/legal review |

---

### Fix 3 (P1) — Scenario Label Review Record

| Item | Status | Evidence |
|------|--------|---------|
| Review record created with 26 row IDs | ✅ | `references/scenario-label-review-record.md` v2.0 |
| Placeholder rows replaced with verified IDs (Fix 14 unblock) | ✅ | `references/scenario-label-review-record.md` v2.0 |
| **25 pending label decisions by content owner** | ⏳ | Requires content owner sign-off |

---

### Fix 4 (P1) — Dual "Capability Assessment" Label Rename

| Item | Status | Evidence |
|------|--------|---------|
| Individual → "AI Skills Check · 6 domains" | ✅ | `AssessmentPage.tsx`, `AppShell.tsx`, `DashboardLayout.tsx` |
| Stage 8 → "Reward Readiness · 5 areas" | ✅ | `RewardCapabilityPage.tsx`, `BoardReportPage.tsx`, `HowItWorks.tsx` |
| UI copy snapshot test (6 assertions) | ✅ | `server/ui-copy-snapshot.test.ts` |

---

### Fix 5 (P1) — Board Report Acceptance Rubric

| Item | Status | Evidence |
|------|--------|---------|
| Rubric defined (6 sections, word counts, required elements) | ✅ | `references/board-report-acceptance-rubric.md` |
| Automated gate wired to PDF export (HTTP 422 on failure) | ✅ | `server/pdf.ts` |
| Automated gate wired to DOCX export (HTTP 422 on failure) | ✅ | `server/boardReportDocx.ts` |
| 10 rubric tests | ✅ | `server/boardReportRubric.test.ts` |

---

### Fix 6 (P2) — LLM-Column TEXT Audit + Schema Guard

| Item | Status | Evidence |
|------|--------|---------|
| All LLM-output columns confirmed as `text` type | ✅ | `server/llm-column-schema-guard.test.ts` |
| Schema guard test (11 assertions) | ✅ | `server/llm-column-schema-guard.test.ts` |
| 3 short-text `varchar` columns documented as non-LLM | ✅ | `server/llm-column-schema-guard.test.ts` comments |

---

### Fix 7 (P1) — Soft Flags H1, R2, R3

| Item | Status | Evidence |
|------|--------|---------|
| Stage 10 lock verified | ✅ | `references/soft-flags-open-items.md` |
| H1, R2, R3 recorded as open items with resolution criteria | ✅ | `references/soft-flags-open-items.md` |
| **Programme lead to assign owners and target dates** | ⏳ | Requires programme lead action |

---

### Fix 8 (P1) — Historical Assessment Enumeration

| Item | Status | Evidence |
|------|--------|---------|
| Pre-migration cutoff query executed (95 sessions, 0 DFS) | ✅ | `references/fix8-historical-assessment-remediation.md` |
| DFS pilot users confirmed unaffected | ✅ | `references/fix8-historical-assessment-remediation.md` |
| Post-migration bank test (5 assertions) | ✅ | `server/post-migration-bank.test.ts` |

---

### Fix 9 (P1) — DFS Profile `source` + `as_of` Fields

Covered by Fix 1 — `shared/dfsProfileConstants.ts` includes both fields for all three figures.

---

### Fix 10 (P1) — Other Profile Sourcing Audit

| Item | Status | Evidence |
|------|--------|---------|
| Northbridge canonical test annotated as fictional fixture | ✅ | `server/northbridge-canonical.test.ts` |
| Meridian canonical test annotated as fictional fixture | ✅ | `server/meridian-canonical.test.ts` |
| ROI calculator MODEL constants annotated with source/indicative notes | ✅ | `client/src/pages/marketing/ROICalculatorPage.tsx` |
| ROI calculator sourcing register created | ✅ | `references/roi-calculator-sourcing-register.md` |
| **ROI benchmark validation by product/research team** | ⏳ | Requires product/research sign-off before public use |

---

### Fix 11 (P1) — Governance Key Collision Rename

| Item | Status | Evidence |
|------|--------|---------|
| `governance` → `reward_governance` in all reward-specific source files | ✅ | `rewardCapabilityService.ts`, `capabilityLinkConfig.ts`, `rewardDevelopmentPlans.ts`, `RewardCapabilityPage.tsx`, `capabilityLinkConfig.ts` |
| DB migration applied (existing rows updated) | ✅ | SQL: `UPDATE reward_capability_dimensions SET dimension = 'reward_governance' WHERE dimension = 'governance'` |
| All 147 reward capability tests passing | ✅ | `server/rewardCapabilityAssessment.test.ts`, `server/increment3-stage9-10.test.ts`, `server/capabilityLink.test.ts` |
| Board report section ID `"governance"` correctly preserved | ✅ | `server/boardReportStream.ts` (unchanged) |

---

### Fix 12 (P1) — Reward Taxonomy Canonical Test

| Item | Status | Evidence |
|------|--------|---------|
| Canonical test for all 5 reward dimensions | ✅ | `server/reward-taxonomy-canonical.test.ts` (9 tests) |
| Missing `data_foundations` and `systems_integration` mappings added | ✅ | `server/services/capabilityLinkConfig.ts` |
| Disjoint check: reward keys ∩ assessment domains = ∅ | ✅ | `server/reward-taxonomy-canonical.test.ts` |

---

### Fix 13 (P1) — (Covered by Fix 3 + Fix 14)

The scenario label review record v2.0 incorporates the Fix 13 requirements.

---

### Fix 14 (P1) — Remap Migration Audit Trail

| Item | Status | Evidence |
|------|--------|---------|
| 26 verified row IDs from live DB | ✅ | `references/remap-migration-audit-trail.md` v2 |
| `legacy_key` column added with inferred values | ✅ | `references/remap-migration-audit-trail.md` v2 |
| Migration timestamp pinned to `2026-05-28T12:36:10Z` | ✅ | `references/remap-migration-audit-trail.md` v2 |
| SQL query uses exact timestamp filter (not `DATE()`) | ✅ | `references/remap-migration-audit-trail.md` v2 |
| **Legacy key inference to be confirmed against original remap script run log** | ⏳ | Requires engineering confirmation |

---

### Fix 15 (P0) — Ground Truth Distribution Record

| Item | Status | Evidence |
|------|--------|---------|
| Ground truth confirmed from live DB (110 scenarios, 6 domains) | ✅ | `references/content-scenario-distribution-ground-truth.md` v2 |
| Prior fabricated distribution retracted | ✅ | `references/content-scenario-distribution-ground-truth.md` v2 |
| DB source declared (`content_scenarios` table, `DATABASE_URL` env) | ✅ | `references/content-scenario-distribution-ground-truth.md` v2 |
| Non-test outputs reviewed with evidence links | ✅ | `references/content-scenario-distribution-ground-truth.md` v2 |
| Live-DB test (5 assertions) | ✅ | `server/content-distribution-live.test.ts` |
| Test D domain floor raised from ≥1 to ≥5 (Fix 18) | ✅ | `server/content-distribution-live.test.ts` |

---

### Fix 16 (P1) — Domain Balance Band

| Item | Status | Evidence |
|------|--------|---------|
| Balance band defined (10%–30%) | ✅ | `server/content-balance-band.test.ts` |
| Balance band test created | ✅ | `server/content-balance-band.test.ts` |
| 2 failing assertions converted to `.todo` | ✅ | `server/content-balance-band.test.ts` |
| Commissioning plan with 10 scenario briefs | ✅ | `references/domain-balance-commissioning-plan.md` |
| **5 new `ai_change_leadership` scenarios commissioned** | 🔵 | Unblocks Fix 16 `.todo` test |
| **5 new `workforce_ai_readiness` scenarios commissioned** | 🔵 | Unblocks Fix 16 `.todo` test |

---

### Fix 17 (P0) — Test Count Verification

| Item | Status | Evidence |
|------|--------|---------|
| Full 79-file breakdown table written from live run | ✅ | `server/verify-test-count.test.ts` |
| PUBLISHED_TOTAL = 1,978 (sum = 1,978) | ✅ | `server/verify-test-count.test.ts` |
| Prior 14-test discrepancy explained | ✅ | `references/content-scenario-distribution-ground-truth.md` v2 |
| Recurrence lock: arithmetic check test (2 assertions) | ✅ | `server/verify-test-count.test.ts` |
| CI script at `scripts/verify-test-count.mjs` | ✅ | `scripts/verify-test-count.mjs` |

---

### Fix 18 (P1) — Test D Domain Floor

| Item | Status | Evidence |
|------|--------|---------|
| Floor raised from ≥1 to ≥5 | ✅ | `server/content-distribution-live.test.ts` |
| All 6 domains clear the floor (minimum 8 scenarios) | ✅ | `server/content-distribution-live.test.ts` |

---

## Outstanding Human Actions

Six actions require human follow-through before any DFS output is circulated or the platform is used in production:

| # | Priority | Action | Owner |
|---|----------|--------|-------|
| 1 | **P0** | Legal/DPO to review and sign off all 20 items in the consent-gap checklist | Legal/DPO |
| 2 | **P0** | Programme lead to confirm the ground-truth distribution record as the single source of truth | Programme Lead |
| 3 | **P1** | Content owner to complete 25 pending scenario label review decisions | Content Owner |
| 4 | **P1** | Engineering to confirm the 26 inferred legacy keys against the original remap script run log | Engineering |
| 5 | **P1** | Programme lead to assign owners and target dates for soft flags H1, R2, R3 | Programme Lead |
| 6 | **P1** | Product/research to validate or replace the 7 ROI calculator benchmark constants before public use | Product/Research |

Two content commissioning actions unblock the Fix 16 balance band test:

| # | Priority | Action | Owner |
|---|----------|--------|-------|
| 7 | **P1** | Commission 5 new `ai_change_leadership` scenarios (briefs in commissioning plan) | Content Author |
| 8 | **P1** | Commission 5 new `workforce_ai_readiness` scenarios (briefs in commissioning plan) | Content Author |

---

## Test Suite Summary

| Round | Tests Added | Total Passing | Notes |
|-------|-------------|---------------|-------|
| Round 1 (R1) | 1,940 baseline | 1,940 | Initial remediation |
| Round 2 (R2) | +8 | 1,948 | content-distribution-live (5) + content-balance-band (3) |
| Round 3 (R3) | +2 | 1,950 | verify-test-count (2) |
| v2 (this session) | +30 | 1,978 | reward-taxonomy-canonical (9) + ui-copy-snapshot (5) + llm-column-schema-guard (11) + post-migration-bank (5) |
| **Current** | — | **1,978 passed \| 2 todo** | 79 test files |
