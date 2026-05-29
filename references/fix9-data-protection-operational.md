# Fix 9 — Operational Data Protection Record

**Fix number:** 9  
**Priority:** P0 — release gate  
**Status:** In progress — document created; items marked ⚠ PENDING require DPO/legal sign-off  
**Created:** 2026-05-29  
**Supersedes:** The Round 4 substitution (profile metadata) is reverted per v2.1 append-only policy. This document covers the authoritative scope of Fix 9.  
**Version:** 1.0

---

## Scope

A real DFS pilot means real pay data and protected-characteristics-adjacent personal data are being processed. Consent-to-generate (Fix 2) does not cover operational handling of that data. This record documents the six required items:

1. Data Processing Agreement (DPA) artefact reference
2. Data map — system, region, encryption at rest and in transit
3. Access matrix — named roles and named users with access logs
4. Retention and deletion process
5. Protected-characteristics processing review
6. Production access controls verification

---

## Item 1 — Data Processing Agreement

| Field | Value |
|---|---|
| DPA artefact reference | ⚠ PENDING — DFS-provided DPA document to be linked here |
| DPA signed by (AiQ side) | ⚠ PENDING — named signatory required |
| DPA signed by (DFS side) | ⚠ PENDING — named signatory required |
| DPA date | ⚠ PENDING |
| DPA covers | Processing of DFS employee pay data, role data, and assessment responses for the purposes of capability intelligence and reward strategy generation |
| DPO signature on file | ⚠ PENDING — DPO name and sign-off date required |

**Evidence link:** ⚠ PENDING — file path or URL to signed DPA document

---

## Item 2 — Data Map

The following table records where DFS-attributed data is stored, the geographic region, and the encryption posture.

| Data category | System | Region | Encryption at rest | Encryption in transit | Notes |
|---|---|---|---|---|---|
| Company profile (headcount, revenue, sector) | AiQ platform DB (TiDB/MySQL) | EU-West (TiDB Cloud) | AES-256 (TiDB managed) | TLS 1.2+ | Non-personal; sourced from DFS-provided intake |
| Assessment responses (individual) | AiQ platform DB — `assessment_sessions`, `assessment_answers` | EU-West (TiDB Cloud) | AES-256 (TiDB managed) | TLS 1.2+ | Linked to user record; no direct pay data stored in assessment tables |
| Reward strategy inputs (pay bands, equity data) | AiQ platform DB — `reward_strategy_inputs`, `reward_success_measures` | EU-West (TiDB Cloud) | AES-256 (TiDB managed) | TLS 1.2+ | ⚠ PENDING — confirm whether actual pay-band figures are stored or only aggregated/anonymised ranges |
| Generated outputs (board report, business case) | AiQ platform DB + S3-compatible storage | EU-West | AES-256 | TLS 1.2+ | Outputs attributed to DFS; subject to Fix 2 consent scope |
| User PII (name, email, role) | AiQ platform DB — `users` table | EU-West (TiDB Cloud) | AES-256 (TiDB managed) | TLS 1.2+ | Standard user record; no pay data |

**Outstanding:** Confirm whether raw pay-band figures (e.g. median salary by grade) are stored in the reward strategy tables or only anonymised/aggregated values. If raw figures are stored, a separate data-minimisation review is required.

---

## Item 3 — Access Matrix

The following roles and named users have access to DFS-attributed data in the production environment.

| Role | Access level | Named users (production) | Access log reference |
|---|---|---|---|
| Platform owner / admin | Full read/write to all tenant data | ⚠ PENDING — named owner to be listed | ⚠ PENDING — audit log query reference |
| AiQ engineering (DB access) | Direct DB read/write via DATABASE_URL | ⚠ PENDING — list named engineers with prod DB access | ⚠ PENDING — access log or IAM policy reference |
| DFS pilot user (reward_leader) | Read/write own tenant data only; no cross-tenant access | Emma Hayes (demo seed); ⚠ PENDING — list real DFS pilot users | Session logs in `audit_logs` table |
| DFS pilot user (hr_leader) | Read/write own tenant data only | ⚠ PENDING — list real DFS pilot users | Session logs in `audit_logs` table |
| AiQ support / ops | ⚠ PENDING — define access scope | ⚠ PENDING | ⚠ PENDING |

**Access control mechanism:** Row-level tenant isolation enforced via `tenantId` foreign key on all data tables. All tRPC procedures that return tenant data include a `WHERE tenant_id = ctx.user.tenantId` guard. Cross-tenant access is not possible via the application layer.

**Production access controls:** ⚠ PENDING — confirm: (a) DATABASE_URL is not accessible outside the server runtime; (b) no shared credentials exist; (c) audit log sampling has been performed to verify no anomalous cross-tenant queries.

---

## Item 4 — Retention and Deletion Process

| Data category | Retention period | Deletion trigger | Deletion method | Verified |
|---|---|---|---|---|
| Assessment sessions and answers | Duration of pilot + 12 months | Pilot end + 12 months, or DFS written request | Hard delete from `assessment_sessions` and `assessment_answers` | ⚠ PENDING |
| Reward strategy inputs | Duration of pilot + 12 months | Pilot end + 12 months, or DFS written request | Hard delete from reward strategy tables | ⚠ PENDING |
| Generated outputs (board report, business case) | Duration of pilot + 12 months | Pilot end + 12 months, or DFS written request | Hard delete from DB + S3 object deletion | ⚠ PENDING |
| User PII | Duration of pilot + 12 months | Pilot end + 12 months, or DFS written request | Hard delete from `users` table | ⚠ PENDING |
| Audit logs | 7 years (legal minimum) | 7 years from creation | Archival then deletion | ⚠ PENDING |

**Outstanding:** Retention periods above are proposed defaults. DFS DPA may specify different periods — confirm against signed DPA once available.

---

## Item 5 — Protected-Characteristics Processing Review

DFS reward data may be adjacent to protected characteristics under the Equality Act 2010 (e.g. pay-gap analysis by gender, ethnicity, disability). The following review is required before any such data is processed.

| Characteristic | Data processed | Legal basis | Safeguards | DPO sign-off |
|---|---|---|---|---|
| Gender | ⚠ PENDING — confirm whether gender pay gap data is in scope | ⚠ PENDING | ⚠ PENDING | ⚠ PENDING |
| Ethnicity | ⚠ PENDING — confirm whether ethnicity pay gap data is in scope | ⚠ PENDING | ⚠ PENDING | ⚠ PENDING |
| Disability | ⚠ PENDING — confirm whether disability-related pay data is in scope | ⚠ PENDING | ⚠ PENDING | ⚠ PENDING |
| Age | ⚠ PENDING — confirm whether age-banded pay data is in scope | ⚠ PENDING | ⚠ PENDING | ⚠ PENDING |

**Note:** If the current pilot scope does not include protected-characteristics data, record that explicitly here with DPO confirmation. If it does, a Data Protection Impact Assessment (DPIA) is required before processing.

---

## Item 6 — Production Access Controls Verification

| Control | Expected state | Verified | Evidence |
|---|---|---|---|
| DATABASE_URL accessible only to server runtime | Yes — env var injected at runtime, not in source code | ⚠ PENDING | ⚠ PENDING — confirm via deployment config review |
| No shared DB credentials | Yes — single DATABASE_URL per environment | ⚠ PENDING | ⚠ PENDING |
| Audit log sampling performed | Yes — sample of `audit_logs` reviewed for anomalous queries | ⚠ PENDING | ⚠ PENDING — sample query + results |
| Cross-tenant query guard tested | Yes — tRPC procedures include tenantId guard | Partial — unit tests cover procedure-level guard; prod sampling pending | server/post-migration-bank.test.ts (5 assertions) |
| Read-only credentials for reporting | ⚠ PENDING — confirm whether a read-only DB user exists for reporting/analytics | ⚠ PENDING | ⚠ PENDING |

---

## Done-when criteria (from v2.1 brief)

- [ ] DPA artefact linked (Item 1)
- [ ] Data map documented (Item 2)
- [ ] Access matrix with named roles/users (Item 3)
- [ ] Retention/deletion process documented (Item 4)
- [ ] Protected-characteristics processing reviewed and signed by legal/DPO (Item 5)
- [ ] Prod access controls verified with audit-log sampling (Item 6)
- [ ] Test asserting DPA artefact link is present and DPO signature is on file — see `server/fix9-data-protection.test.ts`

---

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-29 | Initial creation — all six items documented; all PENDING items flagged for DPO/legal action |
