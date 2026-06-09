# Phase A Gate Verification Report

**Spec:** AiQ_PhaseA_Schema_Spec_v2_LOCKED.md  
**Date:** 2026-06-09  
**Checkpoint:** ec1aa4e6  
**Status:** PASSED — corrected per conditional sign-off (Finding A-6 addressed)

> **Note on this revision:** The original gate report's section 1 (`assumption` conformance table) was fabricated from model memory, not from a live query. It described columns that do not exist (`is_critical`, `decimal(3,2) confidence`, `ai_inferred`/`user_edited` basis). Section 6 (FK proof) was also weakened. Both sections have been regenerated from raw artifacts. See Finding A-6.

---

## 1. Schema Conformance — Verbatim DDL

All three tables verified from `SHOW CREATE TABLE` run against the live DB on 2026-06-09. Pasted verbatim. No paraphrase.

### `initiative`

```sql
CREATE TABLE `initiative` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `library_initiative_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_slug` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `basis` enum('user_authored','library_selected','ai_drafted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'library_selected',
  `ai_drafted` tinyint(1) NOT NULL DEFAULT '0',
  `owned_at` timestamp NULL DEFAULT NULL,
  `priority_rank` int DEFAULT NULL,
  `domain` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','committed','superseded','dropped') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_initiative_tenant` (`tenant_id`),
  KEY `idx_initiative_library` (`library_initiative_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

**Spec conformance:** All spec §1 columns present. `source_slug varchar(100)` added per approved deviation #1. `library_initiative_id` nullable as specified. **PASS.**

---

### `assumption`

```sql
CREATE TABLE `assumption` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `initiative_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('cost','capability','market','pressure','precondition') COLLATE utf8mb4_unicode_ci NOT NULL,
  `statement` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `basis` enum('self_declared','assessed','benchmark_default','calculated','ai_drafted','user_confirmed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_ref` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `as_of_date` timestamp NULL DEFAULT NULL,
  `strength` enum('strong','moderate','weak','unverified') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unverified',
  `confidence` enum('high','medium','low') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `owned_at` timestamp NULL DEFAULT NULL,
  `ai_drafted` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assumption_tenant` (`tenant_id`),
  KEY `idx_assumption_initiative` (`initiative_id`),
  KEY `idx_assumption_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

**Spec conformance:** All spec §2 columns present with correct types. Specifically:
- Column name is `statement` (text NOT NULL) — not `text`
- `confidence` is `enum('high','medium','low')` — not `decimal(3,2)`
- `basis` has 6 values: `self_declared`, `assessed`, `benchmark_default`, `calculated`, `ai_drafted`, `user_confirmed` — not `ai_inferred` or `user_edited`
- No `is_critical` column — not in spec
- `type` enum present: `cost`, `capability`, `market`, `pressure`, `precondition`
- `strength`, `owned_at`, `ai_drafted`, `source_ref`, `as_of_date` all present

**PASS.**

---

### `initiative_risk`

```sql
CREATE TABLE `initiative_risk` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `initiative_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `likelihood` enum('low','medium','high') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `impact` enum('low','medium','high') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mitigation` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('accepted','edited','dismissed','open','mitigated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `ai_suggested` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_initiative_risk_tenant` (`tenant_id`),
  KEY `idx_initiative_risk_initiative` (`initiative_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

**Spec conformance:** All spec §3 columns present. `initiative_id` nullable as specified (programme-level risks). **PASS.**

---

## 2. Migration Integrity

| Table | Before | After | Inserted |
|---|---|---|---|
| `initiative` | 0 | 14 | 14 |
| `initiative_risk` | 0 | 5 | 5 |
| `assumption` | 0 | 0 | 0 (no source data) |

| Tenant | Source initiatives (backup) | initiative rows | Match |
|---|---|---|---|
| 259e9782 (Lumi HR) | 2 | 2 | PASS |
| tenant-acme-ltd | 12 | 12 | PASS |

Backup columns present: `selected_initiatives_json_backup` (2 tenants), `roadmap_json_backup` (1 tenant). Binary match confirmed.

---

## 3. Reference Integrity — roadmap_json assignments

| Assignment initiativeId | source_slug | Status |
|---|---|---|
| 2d5329bd-cd95-4e92-9f0f-a0d30710e814 | hr_virtual_assistant | RESOLVED |
| 6c474bbc-7db7-4951-be61-615c6c0ed67a | gv_cross_cutting_bias_audit | RESOLVED |

No dead references. **PASS.**

---

## 4. Attachment Proof

All 5 `initiative_risk` rows have `initiative_id = NULL`. Correct — source `risk_register_json` had no `initiativeId` field on any risk. See Finding A-3.

---

## 5. Idempotency

Re-running migration on live DB: `Inserted: initiative=0, initiative_risk=0`. All 19 rows detected as already existing and skipped. **PASS.**

---

## 6. FK Stability Test — Verbatim Terminal Output

Run 2026-06-09. Insert `assumption` and `initiative_risk` referencing `initiative.id = 2d5329bd-cd95-4e92-9f0f-a0d30710e814` (Lumi HR, `source_slug = hr_virtual_assistant`). Verify JOIN resolves. Delete. Verify deleted.

```
=== FK Stability Test ===
initiative.id used: 2d5329bd-cd95-4e92-9f0f-a0d30710e814

--- Step 1: INSERT assumption referencing initiative.id ---
Exit: 0

--- Step 2: INSERT initiative_risk referencing initiative.id ---
Exit: 0

--- Step 3: VERIFY both rows exist and initiative_id resolves ---
+--------------------+--------------------------------------+----------------------+------------+------------------------------+
| id                 | initiative_id                        | source_slug          | type       | statement                    |
+--------------------+--------------------------------------+----------------------+------------+------------------------------+
| test-assump-fk-002 | 2d5329bd-cd95-4e92-9f0f-a0d30710e814 | hr_virtual_assistant | capability | Test FK stability assumption |
+--------------------+--------------------------------------+----------------------+------------+------------------------------+

+------------------+--------------------------------------+----------------------+--------------+
| id               | initiative_id                        | source_slug          | title        |
+------------------+--------------------------------------+----------------------+--------------+
| test-risk-fk-002 | 2d5329bd-cd95-4e92-9f0f-a0d30710e814 | hr_virtual_assistant | Test FK risk |
+------------------+--------------------------------------+----------------------+--------------+

--- Step 4: DELETE both test rows ---

--- Step 5: VERIFY deleted (expect 0) ---
+-----------+
| remaining |
+-----------+
|         0 |
+-----------+
+-----------+
| remaining |
+-----------+
|         0 |
+-----------+
```

Both inserts succeeded (exit 0). JOIN in step 3 resolves `source_slug = hr_virtual_assistant` for both tables. Both rows deleted cleanly. **PASS.**

---

## 7. Blob Slug Completeness Search

| Blob field | Literal slug present (binary/case-sensitive) | Action taken |
|---|---|---|
| `selected_initiatives_json` | YES | Migrated to `initiative` rows |
| `roadmap_json` | YES (assignments[].initiativeId) | Remapped to UUIDs |
| `stage8_capability_json` | NO (false positive — case-insensitive LIKE) | No action |
| `success_measures_json` | NO (false positive) | No action |
| `board_report_sections_json` | NO (false positive) | No action |
| `business_case_narrative` | NO (false positive — "HR Virtual Assistant" label) | No action |
| All other blobs | NO | No action |

Only two fields contained literal slugs. Both were handled.

---

## 8. Gate Decision

| Criterion | Result |
|---|---|
| Three tables exist with all required columns (verified from raw DDL) | PASS |
| Migration integrity: row counts match source, backups present | PASS |
| Reference integrity: no dead foreign keys in roadmap_json | PASS |
| FK stability: assumption and initiative_risk can reference initiative.id | PASS |
| Reversibility: backup columns present, binary match confirmed | PASS |

**Phase A gate: PASSED.**

---

## 9. Findings

### Finding A-1 — ID space divergence (approved deviation #1)

**Severity:** Low (approved)

The `strategy_initiative_library` DB table uses `init-01`…`init-23` IDs. The `ail_org_context.selected_initiatives_json` blob uses static TypeScript library slugs (e.g. `hr_virtual_assistant`). These are two independent ID spaces. The `source_slug` column was added to `initiative` (approved deviation #1) to preserve the slug. `library_initiative_id` is null for all migrated rows. Reconciliation deferred to Phase B.

### Finding A-2 — Blob slug scope narrower than deviation #2 anticipated

**Severity:** Informational

The approved deviation #2 anticipated that `stage8_capability_json`, `success_measures_json`, and `board_report_sections_json` might contain literal slugs. Binary search confirmed they do not. Only `roadmap_json` contained literal slugs (in `assignments[].initiativeId`). No action required; logged for traceability.

### Finding A-3 — All initiative_risk rows are programme-level (unattached)

**Severity:** Informational

The source `risk_register_json` blob stored risks at programme level with no `initiativeId` field. All 5 migrated `initiative_risk` rows have `initiative_id = NULL`. This is structurally valid (the column is nullable per spec). Initiative-level risk attachment is a Phase B concern.

### Finding A-4 — Downstream code still reads selectedInitiativesJson blob

**Severity:** Expected / deferred

Approximately 16 read sites across 7 server files parse `selectedInitiativesJson` from `ail_org_context`. These are not broken (the column still exists with its original data) but are not yet using the new `initiative` table. Migrating these read paths is Phase B work.

### Finding A-5 — Dual-Write Implementation (Option C, authorised)

**Status:** RESOLVED

`ail_org_context.selectedInitiativesJson` has 6 active write paths. Option C (temporary dual-write) was authorised. Helper: `server/lib/initiativeDualWrite.ts`.

| # | File | Procedure | Write type |
|---|---|---|---|
| 1 | `gate.ts:643` | `completeStage4` | Conditional |
| 2 | `gate.ts:729` | `completeStage5` | Unconditional |
| 3 | `backgroundInputs.ts:972` | `generateDrafts` | Conditional |
| 4 | `intelligence.ts:615` | `saveStrategy` | Unconditional |
| 5 | `intelligence.ts:834` | `saveStrategyAssessment` | Unconditional |
| 6 | `intelligence.ts:1858` | `runFitImpactAnalysis` | Conditional |

Phase B action: remove all 6 dual-write calls once all 16 readers are migrated. Sites marked `// Finding A-5: temporary dual-write`.

### Finding A-6 — Fabricated schema description (confirmed pattern, carries into Phase B)

**Severity:** Process risk — addressed in this report

Twice during Phase A, a fabricated `assumption` schema was generated from model memory — the same wrong columns (`is_critical`, `decimal(3,2) confidence`, `ai_inferred`/`user_edited` basis) both times. The live table was built correctly (raw DDL confirms this); the fabrication occurred only when the schema was described from memory rather than queried.

**Stale source hunt result:** The wrong columns do not appear anywhere in the repository — not in `drizzle/schema.ts`, not in any `.sql` migration file, not in any `.md` document. `grep -rn "is_critical\|ai_inferred\|user_edited"` across all `.ts`, `.sql`, and `.md` files returns zero matches. The fabrication was generated from model training distribution, not from any file in the project. There is no stale file to delete.

**Phase B mitigations (required):**

1. Any claim about the `assumption`, `initiative`, or `initiative_risk` schema must come from a live `SHOW CREATE TABLE` query, never from description or memory.
2. Gate reports for Phase B must paste verbatim DDL for any table they assess, not a conformance table derived from description.
3. Before any Phase B procedure touches the `assumption` table, re-run `SHOW CREATE TABLE assumption` and confirm against the locked spec.
