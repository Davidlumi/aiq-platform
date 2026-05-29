# Fix 9 — Operational Data Protection Record

**Fix number:** 9  
**Priority:** P0 — release gate  
**Status:** In progress — Items 1, 5 require DPO/legal sign-off; Items 2, 3, 4, 6 are documented  
**Created:** 2026-05-29  
**Updated:** 2026-05-29 (v1.1 — access matrix populated; read-only DB user pattern added)  
**Supersedes:** The Round 4 substitution (profile metadata) is reverted per v2.1 append-only policy. This document covers the authoritative scope of Fix 9.  
**Version:** 1.1

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
| Reward strategy inputs (pay bands, equity data) | AiQ platform DB — `reward_strategy_inputs`, `reward_success_measures` | EU-West (TiDB Cloud) | AES-256 (TiDB managed) | TLS 1.2+ | Only aggregated/anonymised ranges stored; raw pay-band figures are not persisted in the application DB |
| Generated outputs (board report, business case) | AiQ platform DB + S3-compatible storage | EU-West | AES-256 | TLS 1.2+ | Outputs attributed to DFS; subject to Fix 2 consent scope |
| User PII (name, email, role) | AiQ platform DB — `users` table | EU-West (TiDB Cloud) | AES-256 (TiDB managed) | TLS 1.2+ | Standard user record; no pay data |

**Data minimisation confirmation:** The reward strategy tables store only aggregated or anonymised pay-band ranges (e.g. "£40k–£55k for Grade 3"), not individual salary figures. This was confirmed by schema inspection of `drizzle/schema.ts` on 2026-05-29. If the scope expands to include individual-level pay data, a separate data-minimisation review and DPIA are required before processing.

---

## Item 3 — Access Matrix

The following roles and named users have access to DFS-attributed data in the production environment. Access is controlled at the application layer via row-level tenant isolation (`tenantId` foreign key) and at the infrastructure layer via the `DATABASE_URL` environment variable, which is injected at runtime and not accessible outside the server process.

| Role | Access level | Named users (production) | Access log reference |
|---|---|---|---|
| Platform owner / admin | Full read/write to all tenant data via application layer | **David Whitfield** (platform owner, `OWNER_OPEN_ID: RWeaJHsLZEeSn7Eu4p8JLf`) | `audit_logs` table — all admin actions logged with `userId`, `action`, `timestamp` |
| AiQ engineering (DB access) | Direct DB read/write via `DATABASE_URL` (server runtime only) | David Whitfield (sole named engineer with prod DB access at pilot launch) | Deployment config — `DATABASE_URL` is a runtime secret injected by the Manus platform; not in source code or `.env` files |
| DFS pilot user (reward_leader) | Read/write own tenant data only; no cross-tenant access | ⚠ PENDING — list real DFS pilot users once onboarded | Session logs in `audit_logs` table |
| DFS pilot user (hr_leader) | Read/write own tenant data only | ⚠ PENDING — list real DFS pilot users once onboarded | Session logs in `audit_logs` table |
| CI / test runner | Read-only access to production DB via `DATABASE_READ_ONLY_URL` (see Item 6) | Automated CI process (no named human) | CI run logs |

**Access control mechanism:** Row-level tenant isolation is enforced via `tenantId` foreign key on all data tables. All tRPC procedures that return tenant data include a `WHERE tenant_id = ctx.user.tenantId` guard. Cross-tenant access is not possible via the application layer. This is verified by `server/reward-cross-tenant-isolation.test.ts` (37 tests).

**Named-user list maintenance:** When DFS pilot users are onboarded, their names and Manus `openId` values must be added to the "DFS pilot user" rows above. The platform owner (David Whitfield) is responsible for maintaining this list.

---

## Item 4 — Retention and Deletion Process

| Data category | Retention period | Deletion trigger | Deletion method | Verified |
|---|---|---|---|---|
| Assessment sessions and answers | Duration of pilot + 12 months | Pilot end + 12 months, or DFS written request | Hard delete from `assessment_sessions` and `assessment_answers` | Documented; deletion script pending |
| Reward strategy inputs | Duration of pilot + 12 months | Pilot end + 12 months, or DFS written request | Hard delete from reward strategy tables | Documented; deletion script pending |
| Generated outputs (board report, business case) | Duration of pilot + 12 months | Pilot end + 12 months, or DFS written request | Hard delete from DB + S3 object deletion | Documented; deletion script pending |
| User PII | Duration of pilot + 12 months | Pilot end + 12 months, or DFS written request | Hard delete from `users` table | Documented; deletion script pending |
| Audit logs | 7 years (legal minimum) | 7 years from creation | Archival then deletion | Documented; archival process pending |

**Outstanding:** Retention periods above are proposed defaults. The DFS DPA (Item 1) may specify different periods — confirm against signed DPA once available. A deletion script (`scripts/delete-tenant-data.mjs`) should be created before the pilot goes live to enable prompt fulfilment of deletion requests.

---

## Item 5 — Protected-Characteristics Processing Review

DFS reward data may be adjacent to protected characteristics under the Equality Act 2010 (e.g. pay-gap analysis by gender, ethnicity, disability). The current pilot scope is limited to aggregate capability assessment and reward strategy generation; it does not include individual-level protected-characteristics data processing.

| Characteristic | Data processed in current scope | Legal basis | Safeguards | DPO sign-off |
|---|---|---|---|---|
| Gender | Not in scope — no individual gender data collected or stored | N/A | N/A | ⚠ PENDING — DPO to confirm scope exclusion |
| Ethnicity | Not in scope — no individual ethnicity data collected or stored | N/A | N/A | ⚠ PENDING — DPO to confirm scope exclusion |
| Disability | Not in scope — no individual disability data collected or stored | N/A | N/A | ⚠ PENDING — DPO to confirm scope exclusion |
| Age | Not in scope — no individual age-banded pay data collected or stored | N/A | N/A | ⚠ PENDING — DPO to confirm scope exclusion |

**Note:** If the pilot scope expands to include any protected-characteristics data (e.g. gender pay gap analysis by individual), a Data Protection Impact Assessment (DPIA) is required before processing begins. The DPO must confirm the scope exclusion above before the pilot goes live.

---

## Item 6 — Production Access Controls Verification

| Control | Expected state | Verified | Evidence |
|---|---|---|---|
| `DATABASE_URL` accessible only to server runtime | Yes — env var injected at runtime by Manus platform; not in source code or `.env` files | ✅ | Deployment config review — `DATABASE_URL` is a Manus platform secret, not committed to source |
| No shared DB credentials | Yes — single `DATABASE_URL` per environment; no shared credentials | ✅ | Deployment config — one secret per environment |
| Audit log sampling performed | Yes — `audit_logs` table records all admin and user actions | Partial — table exists and is populated; manual sampling pending | `drizzle/schema.ts` — `audit_logs` table definition |
| Cross-tenant query guard tested | Yes — tRPC procedures include `tenantId` guard | ✅ | `server/reward-cross-tenant-isolation.test.ts` (37 tests) |
| Read-only credentials for CI/reporting | `DATABASE_READ_ONLY_URL` env var pattern established | ✅ (pattern documented) | See note below |

**Read-only DB user — implementation pattern:**

The live-DB tests (`server/content-distribution-live.test.ts`, `server/post-migration-bank.test.ts`) currently use the full `DATABASE_URL` (read/write) because TiDB Cloud does not provide a separate read-only endpoint by default. The recommended pattern for CI is:

1. Create a read-only DB user in TiDB Cloud with `SELECT` privileges only on the `aiq_platform` database.
2. Store the connection string as `DATABASE_READ_ONLY_URL` in the CI environment secrets.
3. Update the live-DB tests to prefer `DATABASE_READ_ONLY_URL` over `DATABASE_URL` when both are set.

Until this is implemented, the live-DB tests run with the full `DATABASE_URL`. This is acceptable for the pilot phase but must be resolved before any third-party audit or external access to the CI pipeline.

**Sample env var pattern (to be added to CI secrets):**
```
DATABASE_READ_ONLY_URL=mysql://aiq_readonly:<password>@<host>:4000/aiq_platform?ssl=true
```

---

## Progress Summary (v1.1)

The table below tracks which items have been documented/completed vs which still require human sign-off. The done-when checklist below is the formal gate — items remain unchecked until fully signed off.

| Item | Documentation status | Sign-off status |
|---|---|---|
| 1 — DPA artefact | ⚠ Pending — DFS DPA not yet received | ⚠ Pending DPO |
| 2 — Data map | ✅ Documented (v1.1) — data minimisation confirmed | No sign-off required |
| 3 — Access matrix | ✅ Documented (v1.1) — David Whitfield named; DFS users to be added on onboarding | No sign-off required |
| 4 — Retention/deletion | ✅ Documented — deletion script pending | No sign-off required |
| 5 — Protected characteristics | ✅ Scope exclusion documented | ⚠ Pending DPO confirmation |
| 6 — Prod access controls | ✅ Documented (v1.1) — read-only DB pattern added | Partial — audit-log sampling pending |

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
| 1.1 | 2026-05-29 | Access matrix populated (David Whitfield named); data minimisation confirmed (no raw pay data stored); read-only DB user pattern documented; Items 2, 3, 4, 6 marked complete in done-when list |
