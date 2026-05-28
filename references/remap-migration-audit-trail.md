# Remap Migration Audit Trail — 26 Remapped Scenario Row IDs

**Version:** 1.0  
**Date:** 28 May 2026  
**Remediation item:** Fix 14 (P1, prerequisite for Fix 3) — AiQ Evidence Pack Remediation Brief Addendum R2  
**Source:** Live DB query — `SELECT id, title, capability_key FROM content_scenarios WHERE DATE(updated_at) = '2026-05-28'`  
**Query run at:** 28 May 2026 16:10 UTC  

---

## Purpose

The remap migration (`scripts/p1-remap-legacy-keys.ts`, run 28 May 2026) updated the `capability_key` column of 26 rows in `content_scenarios`. The migration ran without recording a before/after diff. This document provides the verified list of the 26 remapped rows, derived from the live DB using `updated_at` date as the migration fingerprint.

This record is a **prerequisite for Fix 3** (scenario label review). The content owner must not begin the 26-decision review until this list is confirmed, because without it the correct rows cannot be identified.

---

## Verification Method

The migration script ran on 28 May 2026. All rows updated on that date are the remapped rows. The query:

```sql
SELECT id, title, capability_key 
FROM content_scenarios 
WHERE DATE(updated_at) = '2026-05-28' 
ORDER BY capability_key, title
```

returned exactly 26 rows, consistent with the migration script's reported output.

---

## The 26 Remapped Rows

### Group 1: Remapped to `ai_ethics_trust` (10 rows)

These rows were previously assigned to legacy keys `appropriateness` or `governance`.

| Row ID | Current `capability_key` | Title |
|---|---|---|
| `b3f0ebc9-f77c-4751-a4ff-bc0af43dffd0` | ai_ethics_trust | AI Data — Employee Trust and Transparency |
| `dd9e8d03-6b88-488d-95a0-11be9bb8a680` | ai_ethics_trust | AI Governance — Personal Accountability Reflection |
| `446a5daa-2ad3-451a-a4ba-fd9721f42752` | ai_ethics_trust | AI Interview Feedback — Discrimination Risk |
| `eef7366e-d424-44cb-b2db-a4fd211d380f` | ai_ethics_trust | AI Legal Summary — Employment Tribunal Risk |
| `0fd516d7-a18c-4c8a-baa2-c60d2dea31d6` | ai_ethics_trust | AI Policy Summary — Parental Leave Accuracy |
| `16a91065-b3d7-480a-a17c-97bc46e271af` | ai_ethics_trust | AI Tool Adoption — Risk Prioritisation |
| `c662af60-9cbe-4476-9fa0-4c0f1a528888` | ai_ethics_trust | AI Workflow — When Not to Use AI |
| `7e3af81e-2c12-496f-9814-519df90be5cd` | ai_ethics_trust | AI Workflow Automation — Employee Data Consent |
| `41a71f96-bcb3-4758-acec-681b844533d8` | ai_ethics_trust | AI-Drafted Job Description — Review for Bias |
| `90e34932-e0d5-4189-b97e-439a2d8c98f5` | ai_ethics_trust | Candidate Screening AI Output — Bias Check |

### Group 2: Remapped to `ai_output_evaluation` (11 rows)

These rows were previously assigned to legacy keys `data_interpretation` or `judgement`.

| Row ID | Current `capability_key` | Title |
|---|---|---|
| `2b96d4e0-1c23-4d82-bd49-72e58e9c57d5` | ai_output_evaluation | AI Absence Pattern Analysis — Reasonable Adjustments |
| `8c5ef89f-f332-4442-aac2-7e623f9a7c18` | ai_output_evaluation | AI Bias — Recognising Limits of Your Own Knowledge |
| `359fd546-b859-4331-8563-88eb09c1c638` | ai_output_evaluation | AI Electronic Health Record — Data Completeness |
| `670e6e2a-e837-4118-a80d-f057c0b5260e` | ai_output_evaluation | AI Immigration Decision — Country Conditions Data |
| `17add616-c6ee-4e60-8539-0f6a1ba97ed4` | ai_output_evaluation | AI Output Quality — Reliability Hierarchy |
| `e47a57e7-51a4-496f-b51a-9e89f3cd1494` | ai_output_evaluation | AI Policy Analysis — Bias in Consultation Responses |
| `d7eeba41-9277-461f-917a-de10c526c4cc` | ai_output_evaluation | AI Regulatory Reporting — Data Quality |
| `054424ff-7beb-4289-87fa-90a2dafa7aff` | ai_output_evaluation | AI Sentiment Analysis — Engagement Survey Interpretation |
| `ce6aef37-288c-404b-96b8-995c8bbf219f` | ai_output_evaluation | AI Workforce Planning — Headcount Reduction Recommendation |
| `741e44d1-2158-4cb0-8d60-d31453e67e03` | ai_output_evaluation | AI-Drafted Performance Review — Accuracy Responsibility |
| `b828f638-7b53-423d-aebf-b03d6d11e73b` | ai_output_evaluation | Redundancy Process — AI Evidence Weighting |

### Group 3: Remapped to `ai_workflow_design` (5 rows)

These rows were previously assigned to legacy key `workflow` or `execution`.

| Row ID | Current `capability_key` | Title |
|---|---|---|
| `e0fa86c9-e768-45dc-8a15-c96f38d53e2a` | ai_workflow_design | AI Capability — Honest Self-Assessment |
| `c4cd5a8a-01f0-4169-a668-63244a77adb9` | ai_workflow_design | AI Chatbot — Employee Grievance Triage |
| `eef73edc-76bc-4bb5-bae8-7545dca0609d` | ai_workflow_design | AI Chatbot Escalation — Urgency Triage |
| `7e9a7390-6aad-4296-94af-b5a99aec6888` | ai_workflow_design | AI Implementation — Stakeholder Communication Priority |
| `9ecb96b0-935f-43f3-8871-e975fdc205b0` | ai_workflow_design | AI Onboarding Email — Data Accuracy Check |

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

## Limitation

The pre-remap `capability_key` values for each row are not recoverable from the live DB — the migration overwrote them with no before/after record. The legacy key each row was mapped *from* can only be inferred from the migration script logic and the row titles. This limitation is noted in the scenario-label-review-record.

---

## Next Step (Fix 3 Sequencing)

Fix 3 (scenario label review) may now proceed. The content owner should use this document to identify the 26 rows requiring review. For each row, the review decision is: Keep (current assignment is correct), Reword (title needs adjustment for the new domain), or Reassign (row should be moved to a different canonical domain).

See `references/scenario-label-review-record.md` for the review template.

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0 | 28 May 2026 | Initial record — Fix 14 (P1) from Addendum R2 |
