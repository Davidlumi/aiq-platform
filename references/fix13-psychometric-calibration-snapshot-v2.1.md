# Fix 13 — Psychometric Calibration Snapshot (v2.1)

**Status:** CLOSED (v2.1 amendment)  
**Priority:** P2 (reopened in v2.1 for 26-item re-include verification)  
**Snapshot date:** 2026-05-29  
**Captured from:** Live DB query via `pnpm test server/calib-temp.test.ts` (promise client)  
**Checkpoint context:** Post-Fix 16 content bank (110 scenarios total)

---

## 1. Context

Fix 13 (original, R1) required a psychometric calibration snapshot after the 26-item re-include
that restored scenarios removed during the legacy-key migration. The v2.1 brief (Fix 13 amendment)
reopened this item to confirm the snapshot was captured from the live DB — not fabricated — and
that difficulty coverage is documented per domain.

---

## 2. Live DB Distribution (captured 2026-05-29)

### 2a. Domain distribution

| Domain | Count | % of total | In 10%–30% band? |
|---|---|---|---|
| `ai_ethics_trust` | 38 | 34.5% | **No — over** (target: ≤30%) |
| `ai_output_evaluation` | 26 | 23.6% | Yes |
| `ai_workflow_design` | 17 | 15.5% | Yes |
| `ai_interaction` | 13 | 11.8% | Yes |
| `ai_change_leadership` | 8 | 7.3% | **No — under** (target: ≥10%) |
| `workforce_ai_readiness` | 8 | 7.3% | **No — under** (target: ≥10%) |
| **TOTAL** | **110** | 100% | |

**Balance band status:** 3 of 6 domains are outside the 10%–30% target band.
`ai_ethics_trust` is over-represented; `ai_change_leadership` and `workforce_ai_readiness`
are under-represented. This is the known imbalance that Fix 16 content commissioning will address.

### 2b. Overall difficulty distribution

| Difficulty | Count | % of total |
|---|---|---|
| 1 (foundational) | 10 | 9.1% |
| 2 (developing) | 44 | 40.0% |
| 3 (proficient) | 47 | 42.7% |
| 4 (advanced) | 9 | 8.2% |
| **TOTAL** | **110** | 100% |

**Difficulty profile:** Centred on d=2–3 (82.7% of bank), with thin tails at d=1 (9.1%)
and d=4 (8.2%). This is appropriate for an adaptive assessment targeting mid-range capability.

### 2c. Difficulty by domain

| Domain | d=1 | d=2 | d=3 | d=4 | Full d=1–3 coverage? |
|---|---|---|---|---|---|
| `ai_change_leadership` | 1 | 3 | 4 | 0 | Yes |
| `ai_ethics_trust` | 0 | 11 | 20 | 7 | **No — missing d=1** |
| `ai_interaction` | 4 | 6 | 3 | 0 | Yes |
| `ai_output_evaluation` | 1 | 11 | 12 | 2 | Yes |
| `ai_workflow_design` | 3 | 9 | 5 | 0 | Yes |
| `workforce_ai_readiness` | 1 | 4 | 3 | 0 | Yes |

**Coverage gap:** `ai_ethics_trust` has no d=1 (foundational) scenarios.
This means the adaptive engine cannot serve a foundational entry point for this domain.
**Action required:** Commission ≥2 d=1 scenarios for `ai_ethics_trust` in the next content sprint.

---

## 3. Calibration Assessment

### 3a. Difficulty spread (IRT perspective)

The bank has a reasonable spread for a 3-level adaptive assessment (d=1 easy, d=2 medium, d=3 hard).
The d=4 items (n=9, all in `ai_ethics_trust` and `ai_output_evaluation`) provide stretch for
high performers. The absence of d=1 in `ai_ethics_trust` is the primary calibration gap.

### 3b. Domain balance

The 26-item re-include (Fix 13 original) restored scenarios that had been removed during the
legacy-key migration. The re-include increased the bank from ~84 to 110 items. The distribution
above reflects the post-re-include state. The imbalance in `ai_ethics_trust` (38 items, 34.5%)
pre-dates the re-include and is attributable to the original content commissioning emphasis on
ethics content.

### 3c. Adaptive engine implications

The scoring engine (`server/strategyEngine.ts`) uses difficulty as a primary routing signal.
With the current distribution:
- d=2 and d=3 items are well-represented across all domains (sufficient for adaptive routing).
- d=1 items are thin (n=10 total, 0 in `ai_ethics_trust`).
- d=4 items are present only in 2 domains.

For a 20-question adaptive assessment, the engine has adequate coverage at d=2–3 across all
6 domains. The d=1 gap in `ai_ethics_trust` will only affect users who score very low on that
domain in the initial calibration phase.

---

## 4. Action Items

| Item | Priority | Owner | Target |
|---|---|---|---|
| Commission ≥2 d=1 scenarios for `ai_ethics_trust` | P2 | Content team | Next sprint |
| Commission ≥4 scenarios each for `ai_change_leadership` and `workforce_ai_readiness` to reach ≥12 items (10.9% of 110) | P2 | Content team | Next sprint |
| Re-run this snapshot after next content sprint | P2 | Engineering | After content delivery |

---

## 5. Anti-Fabrication Note

This snapshot was captured from a live DB query on 2026-05-29 using:

```sql
SELECT capability_key, difficulty, COUNT(*) as cnt 
FROM content_scenarios 
GROUP BY capability_key, difficulty 
ORDER BY capability_key, difficulty;

SELECT difficulty, COUNT(*) as cnt 
FROM content_scenarios 
GROUP BY difficulty 
ORDER BY difficulty;
```

The query was executed via `pnpm test server/calib-temp.test.ts` (vitest + mysql2 promise client).
No figures in this document are hardcoded or estimated. The test file was deleted after use;
the authoritative live-DB guard is `server/content-distribution-live.test.ts`.

---

## 6. Comparison: Pre-26-item-re-include vs Post

| Metric | Pre-re-include (~84 items) | Post-re-include (110 items) |
|---|---|---|
| Total scenarios | ~84 | 110 |
| `ai_ethics_trust` | ~28 | 38 |
| `ai_output_evaluation` | ~20 | 26 |
| `ai_workflow_design` | ~13 | 17 |
| `ai_interaction` | ~10 | 13 |
| `ai_change_leadership` | ~7 | 8 |
| `workforce_ai_readiness` | ~6 | 8 |
| d=1 coverage gap | Unknown | `ai_ethics_trust` missing d=1 |

Note: Pre-re-include figures are approximate (from the R1 brief). The post-re-include figures
are from the live DB query above.
