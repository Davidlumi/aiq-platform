# Phase A Gate Verification Report

**Date:** 2026-06-09  
**Spec version:** AiQ_PhaseA_Schema_Spec_v2_LOCKED.md (with approved deviations #1 and #2)  
**Checkpoint:** pending (created at end of this report)

---

## 1. Schema Conformance

All three tables were created in the live database. Column-level conformance against the locked spec:

### `initiative` table

| Column | Spec | Actual | Status |
|---|---|---|---|
| `id` | varchar(36) PK | varchar(36) NOT NULL | PASS |
| `tenant_id` | varchar(36) NOT NULL | varchar(36) NOT NULL | PASS |
| `library_initiative_id` | varchar(36) nullable | varchar(36) YES NULL | PASS |
| `source_slug` | varchar(100) nullable **(deviation #1)** | varchar(100) YES NULL | PASS |
| `title` | varchar(300) NOT NULL | varchar(300) NOT NULL | PASS |
| `description` | text nullable | text YES NULL | PASS |
| `basis` | enum(user_authored, library_selected, ai_drafted) | enum(...) NOT NULL default library_selected | PASS |
| `ai_drafted` | boolean NOT NULL default false | tinyint(1) NOT NULL default 0 | PASS |
| `owned_at` | timestamp nullable | timestamp YES NULL | PASS |
| `priority_rank` | int nullable | int YES NULL | PASS |
| `domain` | varchar(60) nullable | varchar(60) YES NULL | PASS |
| `status` | enum(draft, committed, superseded, dropped) | enum(...) NOT NULL default draft | PASS |
| `created_at` | timestamp NOT NULL default now | timestamp NO CURRENT_TIMESTAMP | PASS |
| `updated_at` | timestamp NOT NULL default now | timestamp NO CURRENT_TIMESTAMP | PASS |

### `assumption` table

| Column | Spec | Actual | Status |
|---|---|---|---|
| `id` | varchar(36) PK | varchar(36) NOT NULL | PASS |
| `tenant_id` | varchar(36) NOT NULL | varchar(36) NOT NULL | PASS |
| `initiative_id` | varchar(36) nullable FK | varchar(36) YES NULL | PASS |
| `text` | text NOT NULL | text NOT NULL | PASS |
| `basis` | enum(benchmark_default, self_declared, ai_inferred, user_edited) | enum(...) NOT NULL | PASS |
| `strength` | enum(strong, moderate, weak, unverified) | enum(...) NOT NULL default unverified | PASS |
| `confidence` | decimal(3,2) nullable | decimal(3,2) YES NULL | PASS |
| `source_ref` | varchar(300) nullable | varchar(300) YES NULL | PASS |
| `is_critical` | boolean NOT NULL default false | tinyint(1) NOT NULL default 0 | PASS |
| `created_at` | timestamp NOT NULL | timestamp NO CURRENT_TIMESTAMP | PASS |
| `updated_at` | timestamp NOT NULL | timestamp NO CURRENT_TIMESTAMP | PASS |

### `initiative_risk` table

| Column | Spec | Actual | Status |
|---|---|---|---|
| `id` | varchar(36) PK | varchar(36) NOT NULL | PASS |
| `tenant_id` | varchar(36) NOT NULL | varchar(36) NOT NULL | PASS |
| `initiative_id` | varchar(36) nullable FK | varchar(36) YES NULL | PASS |
| `title` | varchar(300) NOT NULL | varchar(300) NOT NULL | PASS |
| `description` | text nullable | text YES NULL | PASS |
| `likelihood` | enum(low, medium, high) nullable | enum(...) YES NULL | PASS |
| `impact` | enum(low, medium, high) nullable | enum(...) YES NULL | PASS |
| `mitigation` | text nullable | text YES NULL | PASS |
| `status` | enum(accepted, edited, dismissed, open, mitigated) | enum(...) NOT NULL default open | PASS |
| `ai_suggested` | boolean NOT NULL default false | tinyint(1) NOT NULL default 0 | PASS |
| `created_at` | timestamp NOT NULL | timestamp NO CURRENT_TIMESTAMP | PASS |

**Schema conformance: 36/36 columns PASS. Zero deviations beyond the two approved.**

---

## 2. Migration Integrity

### Before / After counts

| Table | Before | After | Inserted |
|---|---|---|---|
| `initiative` | 0 | 14 | 14 |
| `initiative_risk` | 0 | 5 | 5 |
| `assumption` | 0 | 0 | 0 (no source data) |

### Source-to-row count reconciliation

| Tenant | Source initiatives (backup) | initiative rows | Match |
|---|---|---|---|
| 259e9782 (Lumi HR) | 2 | 2 | PASS |
| tenant-acme-ltd | 12 | 12 | PASS |

### Backup columns

| Column | Tenants backed up |
|---|---|
| `selected_initiatives_json_backup` | 2 of 2 (all tenants with data) |
| `roadmap_json_backup` | 1 of 1 (only Lumi HR had roadmap data) |

---

## 3. Reference Integrity

### roadmap_json assignments → initiative.id

Both roadmap assignments for Lumi HR resolve to live `initiative.id` UUIDs:

| Assignment initiativeId | initiative.title | Status |
|---|---|---|
| 2d5329bd-cd95-4e92-9f0f-a0d30710e814 | HR Virtual Assistant | RESOLVED |
| 6c474bbc-7db7-4951-be61-615c6c0ed67a | Cross-Cutting AI Bias Audit | RESOLVED |

tenant-acme-ltd has no `roadmap_json` (null), so no remapping was needed or performed.

---

## 4. Attachment Proof (initiative_risk → initiative)

All 5 `initiative_risk` rows have `initiative_id = NULL`. This is correct — the source `risk_register_json` blob contained programme-level risks with no `initiativeId` field. The migration script correctly preserved null. See Finding A-3 below.

---

## 5. Idempotency Proof

Re-running the migration script on the live database produced:

- `Inserted: initiative=0, initiative_risk=0`
- All 19 rows (14 initiatives + 5 risks) were detected as already existing and skipped.

The migration is fully idempotent.

---

## 6. Downstream FK Proof

The `selected_initiatives_json` column on `ail_org_context` is still present and unchanged (the backup column was added alongside it, not replacing it). All existing server code that reads `selectedInitiativesJson` from `ail_org_context` continues to work without modification. Phase A does not remove or alter any existing column.

The `rewardInitiativePortfolio.selectedInitiativesJson` column (Reward flow) is a separate table and was not touched by this migration.

---

## 7. Blob Slug Completeness Search

The approved deviation #2 required a completeness search before remapping. Results:

| Blob field | Literal slug present (binary/case-sensitive) | Action taken |
|---|---|---|
| `selected_initiatives_json` | YES | Migrated to `initiative` rows |
| `roadmap_json` | YES (assignments[].initiativeId) | Remapped to UUIDs |
| `stage8_capability_json` | NO (false positive — case-insensitive LIKE) | No action |
| `success_measures_json` | NO (false positive) | No action |
| `board_report_sections_json` | NO (false positive) | No action |
| `business_case_narrative` | NO (false positive — "HR Virtual Assistant" label) | No action |
| All other blobs | NO | No action |

**Only two fields contained literal slugs. Both were handled.**

---

## 8. Findings

### Finding A-1 — ID space divergence (approved deviation #1)
**Severity:** Low (approved)  
The `strategy_initiative_library` DB table uses `init-01`…`init-23` IDs. The `ail_org_context.selected_initiatives_json` blob uses static TypeScript library slugs (e.g. `hr_virtual_assistant`). These are two independent ID spaces. The `source_slug` column was added to `initiative` (approved deviation #1) to preserve the slug. `library_initiative_id` is null for all migrated rows. Reconciliation deferred to Phase B.

### Finding A-2 — Blob slug scope narrower than deviation #2 anticipated
**Severity:** Informational  
The approved deviation #2 anticipated that `stage8_capability_json`, `success_measures_json`, and `board_report_sections_json` might contain literal slugs. Binary search confirmed they do not. Only `roadmap_json` contained literal slugs (in `assignments[].initiativeId`). The scope of remapping was therefore narrower than anticipated. No action required; logged for traceability.

### Finding A-3 — All initiative_risk rows are programme-level (unattached)
**Severity:** Informational  
The source `risk_register_json` blob stored risks at programme level with no `initiativeId` field. All 5 migrated `initiative_risk` rows have `initiative_id = NULL`. This is structurally valid (the column is nullable per spec). Initiative-level risk attachment is a Phase B concern when risks are created or edited through the new UI.

### Finding A-4 — Downstream code still reads selectedInitiativesJson blob (not yet migrated to initiative table reads)
**Severity:** Expected / deferred  
`server/routers/intelligence.ts` and `server/routers/gate.ts` contain approximately 15 read sites that parse `selectedInitiativesJson` from `ail_org_context` to get initiative slug arrays. These are not broken (the column still exists with its original data), but they are not yet using the new `initiative` table. Migrating these read paths is Phase B work. No action required in Phase A.

---

## 9. Gate Decision

All four gate criteria from spec §5 are met:

| Criterion | Result |
|---|---|
| Three tables exist with all required columns | PASS |
| Migration integrity: row counts match source | PASS |
| Reference integrity: no dead foreign keys | PASS |
| Reversibility: backup columns present | PASS |

**Phase A gate: PASSED. Ready for sign-off.**

---

## Finding A-5 — Dual-Write Implementation (Option C, Authorised)

**Status:** RESOLVED — dual-write wired across all 6 live writers.

**Date:** 2026-06-09

**Background:** Evidence check 3 revealed that `ail_org_context.selectedInitiativesJson` has 6 active write paths across 3 server files. After migration, the `initiative` table rows and the blob could diverge silently. Option C (temporary dual-write) was authorised to prevent this.

**Implementation:**

A helper module `server/lib/initiativeDualWrite.ts` was created. It exports `upsertInitiativeRows(db, tenantId, ids, status)` which:
1. Accepts an array of IDs (slugs, `init-XX` format, or UUIDs)
2. Resolves slugs via the static library JSON (`scripts/initiative_library.json`)
3. Upserts matching rows in the `initiative` table (insert if not exists, update `status` if exists)
4. Creates new `ai_drafted` rows for any IDs not found in the static library

**Writers wired (all 6):**

| # | File | Procedure | Write type | Status |
|---|---|---|---|---|
| 1 | `gate.ts:643` | `completeStage4` | Conditional | Wired |
| 2 | `gate.ts:729` | `completeStage5` | Unconditional | Wired |
| 3 | `backgroundInputs.ts:972` | `generateDrafts` | Conditional | Wired |
| 4 | `intelligence.ts:615` | `saveStrategy` | Unconditional | Wired |
| 5 | `intelligence.ts:834` | `saveStrategyAssessment` | Unconditional | Wired |
| 6 | `intelligence.ts:1858` | `runFitImpactAnalysis` | Conditional | Wired |

**Phase B action required:** When Phase B migrates all 16 readers from the blob to the `initiative` table, the 6 dual-write calls and the `selectedInitiativesJson` blob write can be removed. The `// Finding A-5: temporary dual-write` comments mark every site.

**Evidence:**
- TypeScript: 0 errors after wiring
- Server: clean restart, no runtime errors
- DB: 14 initiative rows confirmed present (2 Lumi HR, 12 Acme)
