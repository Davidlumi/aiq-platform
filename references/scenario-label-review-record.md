# Scenario Label Review Record — 26 Remapped Scenarios

**Version:** 2.0  
**Date:** 28 May 2026 (updated after Addendum R2)  
**Remediation item:** Fix 3 (P1) — AiQ Evidence Pack Remediation Brief, 28 May 2026  
**Prerequisite:** Fix 14 (P1) — completed; see `references/remap-migration-audit-trail.md`  
**Reviewer:** Content Owner (to be completed — see sign-off section)

---

## Addendum R2 Update

> **Fix 14 is now a prerequisite for Fix 3.** The migration audit trail has been completed (see `references/remap-migration-audit-trail.md`) and the 26 remapped row IDs are now verified. Fix 3 review may proceed.

> **Status:** 1 of 26 decisions recorded. 25 decisions pending content owner review.

> **Sequencing note:** The addendum confirmed that the prior scenario-label review record was scaffolding only — the row IDs were not verified from the DB. This version (v2.0) replaces the placeholder rows with the verified IDs and titles from the live DB query run on 28 May 2026.

---

## Purpose

On 28 May 2026, 26 content scenarios were programmatically remapped from 6 legacy capability keys to the 6 canonical scoring-engine keys (script: `scripts/p1-remap-legacy-keys.ts`). The remapping was based on a content inspection of each legacy domain's thematic fit.

The brief (Fix 3, P1) requires that each of the 26 scenarios is reviewed against the canonical domain definition and that a keep / reword / reassign decision is recorded. This document captures those decisions.

**Done-when:** Each of the 26 has a documented keep/reword/reassign decision by a content owner; distribution stays within the balance band after any reassignments (see Fix 16 for the band definition).

---

## Remapping Summary (Verified from Live DB)

The remap moved all 26 rows into exactly three domains. The pre-remap legacy key for each row is inferred from the migration script logic — it cannot be recovered from the DB as the migration overwrote the values.

| Legacy key | Canonical key | Count | Rows |
|---|---|---|---|
| `appropriateness` | `ai_ethics_trust` | ~5 | Inferred from migration script |
| `governance` | `ai_ethics_trust` | ~5 | Inferred from migration script |
| `data_interpretation` | `ai_output_evaluation` | ~6 | Inferred from migration script |
| `judgement` | `ai_output_evaluation` | ~5 | Inferred from migration script |
| `execution` | `ai_workflow_design` | ~4 | Inferred from migration script |
| `workflow` | `ai_workflow_design` | ~1 | Inferred from migration script |
| **Total** | | **26** | |

The exact legacy key for each row is not recoverable. The review should focus on whether the *current* assignment is correct, not on what the legacy key was.

---

## Domain Definitions (Canonical)

| Canonical key | Definition |
|---|---|
| `ai_ethics_trust` | Understanding and applying ethical principles in AI use: bias recognition, fairness, consent, accountability, governance, when not to use AI |
| `ai_output_evaluation` | Critically evaluating AI-generated outputs: detecting errors, hallucinations, bias, quality assessment, reliability hierarchies |
| `ai_workflow_design` | Designing and implementing AI-assisted workflows: handoff points, escalation, process redesign, stakeholder communication |
| `ai_interaction` | Effective interaction with AI systems: prompt design, instruction clarity, iterative refinement |
| `ai_change_leadership` | Leading AI-related change: stakeholder engagement, resistance management, culture, readiness |
| `workforce_ai_readiness` | Assessing and building workforce AI capability: skills gap analysis, readiness diagnostics, L&D strategy |

---

## Review Decisions — Group 1: Remapped to `ai_ethics_trust` (10 rows)

| # | Row ID | Scenario title | Decision | Rationale | Reviewer |
|---|---|---|---|---|---|
| 1 | `b3f0ebc9` | AI Data — Employee Trust and Transparency | Pending | | |
| 2 | `dd9e8d03` | AI Governance — Personal Accountability Reflection | Pending | | |
| 3 | `446a5daa` | AI Interview Feedback — Discrimination Risk | Pending | | |
| 4 | `eef7366e` | AI Legal Summary — Employment Tribunal Risk | Pending | | |
| 5 | `0fd516d7` | AI Policy Summary — Parental Leave Accuracy | Pending | | |
| 6 | `16a91065` | AI Tool Adoption — Risk Prioritisation | Pending | | |
| 7 | `c662af60` | AI Workflow — When Not to Use AI | Pending | | |
| 8 | `7e3af81e` | AI Workflow Automation — Employee Data Consent | Pending | | |
| 9 | `41a71f96` | AI-Drafted Job Description — Review for Bias | Pending | | |
| 10 | `90e34932` | Candidate Screening AI Output — Bias Check | Pending | | |

---

## Review Decisions — Group 2: Remapped to `ai_output_evaluation` (11 rows)

| # | Row ID | Scenario title | Decision | Rationale | Reviewer |
|---|---|---|---|---|---|
| 11 | `2b96d4e0` | AI Absence Pattern Analysis — Reasonable Adjustments | Pending | | |
| 12 | `8c5ef89f` | AI Bias — Recognising Limits of Your Own Knowledge | Pending | | |
| 13 | `359fd546` | AI Electronic Health Record — Data Completeness | Pending | | |
| 14 | `670e6e2a` | AI Immigration Decision — Country Conditions Data | Pending | | |
| 15 | `17add616` | AI Output Quality — Reliability Hierarchy | Pending | | |
| 16 | `e47a57e7` | AI Policy Analysis — Bias in Consultation Responses | Pending | | |
| 17 | `d7eeba41` | AI Regulatory Reporting — Data Quality | Pending | | |
| 18 | `054424ff` | AI Sentiment Analysis — Engagement Survey Interpretation | Pending | | |
| 19 | `ce6aef37` | AI Workforce Planning — Headcount Reduction Recommendation | Pending | | |
| 20 | `741e44d1` | AI-Drafted Performance Review — Accuracy Responsibility | Pending | | |
| 21 | `b828f638` | Redundancy Process — AI Evidence Weighting | Pending | | |

---

## Review Decisions — Group 3: Remapped to `ai_workflow_design` (5 rows)

| # | Row ID | Scenario title | Decision | Rationale | Reviewer |
|---|---|---|---|---|---|
| 22 | `e0fa86c9` | AI Capability — Honest Self-Assessment | Pending | | |
| 23 | `c4cd5a8a` | AI Chatbot — Employee Grievance Triage | Pending | | |
| 24 | `eef73edc` | AI Chatbot Escalation — Urgency Triage | Pending | | |
| 25 | `7e9a7390` | AI Implementation — Stakeholder Communication Priority | **Keep** | Title and content concern stakeholder communication in AI implementation — correctly classified as workflow design. | Round 1 review |
| 26 | `9ecb96b0` | AI Onboarding Email — Data Accuracy Check | Pending | | |

---

## Post-Review Distribution Check

Complete this table after all 26 decisions are recorded. Any reassignments must keep each domain within the balance band (Fix 16: no domain below 10% or above 30% of the bank).

| Domain | Current count | Reassignments in | Reassignments out | Post-review count | % of bank | Within band? |
|---|---|---|---|---|---|---|
| ai_ethics_trust | 38 | | | | | |
| ai_output_evaluation | 26 | | | | | |
| ai_workflow_design | 17 | | | | | |
| ai_interaction | 13 | | | | | |
| ai_change_leadership | 8 | | | | | |
| workforce_ai_readiness | 8 | | | | | |
| **Total** | **110** | | | | | |

---

## Sign-Off

| Field | Value |
|---|---|
| Review completed by | *(name)* |
| Review date | *(date)* |
| Total decisions recorded | 1 / 26 |
| All decisions documented | No — 25 pending |
| Distribution within balance band | Not yet verified |
| Approved to close Fix 3 | **No** — pending completion |

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0 | 28 May 2026 | Initial scaffolding — Fix 3 (P1) from master brief |
| 2.0 | 28 May 2026 | Rewritten after Addendum R2: verified row IDs added from live DB; Fix 14 prerequisite noted; 25 decisions remain pending |
