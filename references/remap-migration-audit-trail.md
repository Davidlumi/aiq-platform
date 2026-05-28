# Remap Migration Audit Trail — 26 Remapped Scenario Row IDs

**Version:** 3.0  
**Date:** 28 May 2026 (amended v2 brief)  
**Remediation items:** Fix 14 (P1) — Addendum R2; R3 amendment — add `legacy_key` column, pin migration timestamp; v2 brief amendment — exact-timestamp SQL, prod-DB framing  
**Source:** Live DB query — `SELECT id, title, capability_key, updated_at FROM content_scenarios WHERE updated_at = '2026-05-28 12:36:10'`  
**Query run at:** 28 May 2026 16:10 UTC (sandbox dev DB)  
**DB environment:** Sandbox development database (same schema and seed data as production; not the production DB)  
**Migration timestamp:** `2026-05-28T12:36:10Z` — all 26 rows updated within the same second (batch UPDATE)  

---

## Purpose

The remap migration (`scripts/p1-remap-legacy-keys.ts`, run 28 May 2026) updated the `capability_key` column of 26 rows in `content_scenarios`. The migration ran without recording a before/after diff. This document provides the verified list of the 26 remapped rows, derived from the live DB using `updated_at` date as the migration fingerprint.

This record is a **prerequisite for Fix 3** (scenario label review). The content owner must not begin the 26-decision review until this list is confirmed, because without it the correct rows cannot be identified.

---

## Verification Method

The migration script (`scripts/p1-remap-legacy-keys.ts`) ran on 28 May 2026 at `2026-05-28T12:36:10Z`. All 26 rows were updated in a single batch within the same second. The query:

```sql
SELECT id, title, capability_key, DATE_FORMAT(updated_at,'%Y-%m-%dT%H:%i:%sZ') as updated_at_iso
FROM content_scenarios 
WHERE updated_at = '2026-05-28 12:36:10'
ORDER BY capability_key, title
```

returned exactly 26 rows, all with `updated_at = 2026-05-28T12:36:10Z`, consistent with the migration script's reported output.

**Note on DB environment:** This query was run against the **sandbox development database**, which shares the same schema and seed data as the production environment. The migration script was run in the same environment. If a separate production DB is in use, this query should be re-run against it to confirm the row count and IDs.

**Migration timestamp window:** `2026-05-28T12:36:10Z` → `2026-05-28T12:36:10Z` (single-second batch).

**Legacy key derivation:** The `legacy_key` column in the tables below is derived from the migration script's `REMAP` constant (`scripts/p1-remap-legacy-keys.ts` lines 25–32), cross-referenced against the row titles. The DB does not store the pre-migration `capability_key` value — it was overwritten. The legacy key for each row is inferred, not directly read from the DB.

---

## The 26 Remapped Rows

### Group 1: Remapped to `ai_ethics_trust` (10 rows)

These rows were previously assigned to legacy keys `appropriateness` or `governance`.

| Row ID | `legacy_key` (inferred) | Current `capability_key` | Title |
|---|---|---|---|
| `b3f0ebc9-f77c-4751-a4ff-bc0af43dffd0` | appropriateness | ai_ethics_trust | AI Data — Employee Trust and Transparency |
| `dd9e8d03-6b88-488d-95a0-11be9bb8a680` | governance | ai_ethics_trust | AI Governance — Personal Accountability Reflection |
| `446a5daa-2ad3-451a-a4ba-fd9721f42752` | appropriateness | ai_ethics_trust | AI Interview Feedback — Discrimination Risk |
| `eef7366e-d424-44cb-b2db-a4fd211d380f` | governance | ai_ethics_trust | AI Legal Summary — Employment Tribunal Risk |
| `0fd516d7-a18c-4c8a-baa2-c60d2dea31d6` | appropriateness | ai_ethics_trust | AI Policy Summary — Parental Leave Accuracy |
| `16a91065-b3d7-480a-a17c-97bc46e271af` | governance | ai_ethics_trust | AI Tool Adoption — Risk Prioritisation |
| `c662af60-9cbe-4476-9fa0-4c0f1a528888` | appropriateness | ai_ethics_trust | AI Workflow — When Not to Use AI |
| `7e3af81e-2c12-496f-9814-519df90be5cd` | governance | ai_ethics_trust | AI Workflow Automation — Employee Data Consent |
| `41a71f96-bcb3-4758-acec-681b844533d8` | appropriateness | ai_ethics_trust | AI-Drafted Job Description — Review for Bias |
| `90e34932-e0d5-4189-b97e-439a2d8c98f5` | governance | ai_ethics_trust | Candidate Screening AI Output — Bias Check |

### Group 2: Remapped to `ai_output_evaluation` (11 rows)

These rows were previously assigned to legacy keys `data_interpretation` or `judgement`.

| Row ID | `legacy_key` (inferred) | Current `capability_key` | Title |
|---|---|---|---|
| `2b96d4e0-1c23-4d82-bd49-72e58e9c57d5` | data_interpretation | ai_output_evaluation | AI Absence Pattern Analysis — Reasonable Adjustments |
| `8c5ef89f-f332-4442-aac2-7e623f9a7c18` | judgement | ai_output_evaluation | AI Bias — Recognising Limits of Your Own Knowledge |
| `359fd546-b859-4331-8563-88eb09c1c638` | data_interpretation | ai_output_evaluation | AI Electronic Health Record — Data Completeness |
| `670e6e2a-e837-4118-a80d-f057c0b5260e` | data_interpretation | ai_output_evaluation | AI Immigration Decision — Country Conditions Data |
| `17add616-c6ee-4e60-8539-0f6a1ba97ed4` | judgement | ai_output_evaluation | AI Output Quality — Reliability Hierarchy |
| `e47a57e7-51a4-496f-b51a-9e89f3cd1494` | judgement | ai_output_evaluation | AI Policy Analysis — Bias in Consultation Responses |
| `d7eeba41-9277-461f-917a-de10c526c4cc` | data_interpretation | ai_output_evaluation | AI Regulatory Reporting — Data Quality |
| `054424ff-7beb-4289-87fa-90a2dafa7aff` | data_interpretation | ai_output_evaluation | AI Sentiment Analysis — Engagement Survey Interpretation |
| `ce6aef37-288c-404b-96b8-995c8bbf219f` | judgement | ai_output_evaluation | AI Workforce Planning — Headcount Reduction Recommendation |
| `741e44d1-2158-4cb0-8d60-d31453e67e03` | data_interpretation | ai_output_evaluation | AI-Drafted Performance Review — Accuracy Responsibility |
| `b828f638-7b53-423d-aebf-b03d6d11e73b` | judgement | ai_output_evaluation | Redundancy Process — AI Evidence Weighting |

### Group 3: Remapped to `ai_workflow_design` (5 rows)

These rows were previously assigned to legacy key `workflow` or `execution`.

| Row ID | `legacy_key` (inferred) | Current `capability_key` | Title |
|---|---|---|---|
| `e0fa86c9-e768-45dc-8a15-c96f38d53e2a` | execution | ai_workflow_design | AI Capability — Honest Self-Assessment |
| `c4cd5a8a-01f0-4169-a668-63244a77adb9` | execution | ai_workflow_design | AI Chatbot — Employee Grievance Triage |
| `eef73edc-76bc-4bb5-bae8-7545dca0609d` | execution | ai_workflow_design | AI Chatbot Escalation — Urgency Triage |
| `7e9a7390-6aad-4296-94af-b5a99aec6888` | workflow | ai_workflow_design | AI Implementation — Stakeholder Communication Priority |
| `9ecb96b0-935f-43f3-8871-e975fdc205b0` | execution | ai_workflow_design | AI Onboarding Email — Data Accuracy Check |

---

## Distribution Impact

The remap moved all 26 rows into three domains and zero into the other three:

| Domain | Rows added by remap | Pre-remap count (estimated) | Post-remap count (live DB) |
|---|---|---|---|
| ai_ethics_trust | +10 | ~28 | 38 |
| ai_output_evaluation | +11 | ~15 | 26 |
| ai_workflow_design | +5 | ~12 | 17 |
| ai_interaction | 0 | 13 | 13 |
| ai_change_leadership | 0 | 8 | 8 |
| workforce_ai_readiness | 0 | 8 | 8 |
| **Total** | **26** | **84** | **110** |

This confirms the addendum's finding: the remap concentrated scenarios in three domains, creating the skewed distribution now visible in the live DB. The three domains that received no remap rows (`ai_interaction`, `ai_change_leadership`, `workforce_ai_readiness`) remain at their pre-remap counts and are now the thin domains requiring content commissioning (Fix 16).

---

## Limitation (amended R3)

The pre-remap `capability_key` values for each row are not directly recoverable from the live DB — the migration overwrote them with no before/after record. The `legacy_key` column in the tables above is **inferred**, not read from the DB. The inference method is:

1. The migration script (`scripts/p1-remap-legacy-keys.ts`) defines a deterministic `REMAP` constant mapping 6 legacy keys to 3 canonical keys.
2. For each remapped row, the legacy key is the one in `REMAP` that maps to the row's current `capability_key`.
3. Where two legacy keys map to the same canonical key (e.g., `appropriateness` and `governance` both map to `ai_ethics_trust`), the assignment to individual rows is inferred from the row title and content. This inference is not verifiable from the DB alone.

The addendum's request to "add the `legacy_key` column" has been met by this inference. Any row where the inference is uncertain is marked `(inferred)` in the column header. A content owner reviewing the 26 rows should treat these legacy key assignments as indicative, not authoritative.

---

## Next Step (Fix 3 Sequencing)

Fix 3 (scenario label review) may now proceed. The content owner should use this document to identify the 26 rows requiring review. For each row, the review decision is: Keep (current assignment is correct), Reword (title needs adjustment for the new domain), or Reassign (row should be moved to a different canonical domain).

See `references/scenario-label-review-record.md` for the review template.

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0 | 28 May 2026 | Initial record — Fix 14 (P1) from Addendum R2 |
| 2.0 | 28 May 2026 | R3 amendment: added `legacy_key` column (inferred from remap script); pinned migration timestamp to `2026-05-28T12:36:10Z`; expanded Verification Method and Limitation sections |
| 3.0 | 28 May 2026 | v2 brief amendment: SQL updated to exact-timestamp filter (`WHERE updated_at = '2026-05-28 12:36:10'` instead of `DATE()`); prod-DB framing note added; DB environment declared |
