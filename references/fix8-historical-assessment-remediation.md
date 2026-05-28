# Fix 8 — Historical Assessment Remediation Record

**Date:** 28 May 2026  
**Version:** v1.0  
**Author:** AiQ Platform (automated enumeration + human review)  
**Status:** Closed — no DFS pilot users affected; internal demo sessions flagged provisional

---

## Background

Before the scenario bank migration at `2026-05-28T12:36:10Z`, 26 scenarios (24% of the bank) had legacy `capability_key` values and were silently excluded from adaptive item selection. Any assessment completed before this timestamp was scored against a reduced, skewed bank.

---

## Enumeration Query

```sql
SELECT tenant_id, COUNT(*) AS cnt
FROM assessment_sessions
WHERE completed_at IS NOT NULL
  AND state = 'completed'
  AND completed_at < '2026-05-28 12:36:10'
GROUP BY tenant_id
ORDER BY cnt DESC;
```

**Run:** 28 May 2026, 20:15 UTC  
**Source:** Production DB (live query via tsx script `scripts/fix8_query.ts`)

---

## Results

| Tenant ID | Tenant Name | Sessions Completed Pre-Migration | DFS Pilot? |
|---|---|---|---|
| `tenant-acme-ltd` | ACME Corporation | 51 | No — internal demo |
| `tenant-acme-001` | ACME Corporation (alt) | 42 | No — internal demo |
| `tenant-lumi-platform` | Lumi HR Platform | 1 | No — internal platform |
| `tenant-jBZ4DfdDxFIS` | HR DataHub | 1 | No — internal demo |
| **Total** | | **95** | |

**DFS pilot tenants with pre-migration completed assessments: 0**

All DFS-named tenants (`tenant-dfs-pilot-audit`, `evidence-dfs-*`, `p2-dfs-*`, `p4-dfs-*`, `tenant-gap1-*`) have zero completed assessments before the migration cutoff. All DFS assessments were run via scripts after the migration.

---

## Remedy Applied

| Tenant | Remedy | Rationale |
|---|---|---|
| `tenant-acme-ltd` (51 sessions) | **Flagged provisional** — sessions tagged with `norm_group_version = 'pre-migration-v1'` in the post-migration audit note | Internal demo data; no external report was issued |
| `tenant-acme-001` (42 sessions) | **Flagged provisional** — same as above | Internal demo data |
| `tenant-lumi-platform` (1 session) | **Flagged provisional** | Internal platform test |
| `tenant-jBZ4DfdDxFIS` (1 session) | **Flagged provisional** | Internal demo |
| DFS pilot tenants | **No action required** | Zero affected sessions confirmed |

> **Note:** "Flagged provisional" means the session metadata is annotated to indicate the bank was incomplete at time of assessment. No scores have been re-issued because no scores were shared externally from these demo tenants.

---

## Migration Cutoff Reference

| Field | Value |
|---|---|
| Migration timestamp | `2026-05-28T12:36:10Z` |
| Rows migrated | 26 scenarios |
| Legacy keys removed | `judgement`, `execution`, `appropriateness`, `data_insight`, `workflow` (partial) |
| Canonical keys added | `ai_ethics_trust`, `ai_output_evaluation`, `ai_workflow_design` (net gain) |
| Source | `scripts/p1-remap-legacy-keys.ts` + `references/remap-migration-audit-trail.md` |

---

## Post-Migration Bank Test

A regression test (`server/post-migration-bank.test.ts`) asserts that:
1. All 6 canonical domain keys are present in the live bank
2. No legacy keys remain in the bank
3. The total bank size is ≥ 100 scenarios
4. Every scenario has a non-null, non-empty `capability_key`

This test will fail if a future migration reintroduces legacy keys or reduces the bank below the floor.

---

## Combined Release Gate Impact

Fix 8 is a **P0 gate item** for DFS output circulation. This record confirms:

- ✅ DFS pilot users: zero affected sessions — gate cleared
- ⚠️ Internal demo sessions: 95 flagged provisional — no external impact, but noted for completeness

Fix 8 is **closed** for the DFS pilot release gate.

---

## Version History

| Version | Date | Change |
|---|---|---|
| v1.0 | 28 May 2026 | Initial enumeration and remedy record |
