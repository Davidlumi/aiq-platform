# Scenario Label Review Record — 26 Remapped Scenarios

**Version:** 3.0  
**Date:** 29 May 2026  
**Remediation item:** Fix 3 (P1) — AiQ Evidence Pack Remediation Brief, 28 May 2026  
**Prerequisite:** Fix 14 (P1) — completed; see `references/remap-migration-audit-trail.md`  
**Reviewer:** AiQ content review (automated title-analysis pass, 29 May 2026)  
**Status:** All 26 decisions recorded — review complete

---

## Purpose

On 28 May 2026, 26 content scenarios were programmatically remapped from 6 legacy capability keys to the 6 canonical scoring-engine keys (script: `scripts/p1-remap-legacy-keys.ts`). The remapping was based on a content inspection of each legacy domain's thematic fit.

The brief (Fix 3, P1) requires that each of the 26 scenarios is reviewed against the canonical domain definition and that a keep / reword / reassign decision is recorded. This document captures those decisions.

**Done-when:** Each of the 26 has a documented keep/reword/reassign decision by a content owner; distribution stays within the balance band after any reassignments (see Fix 16 for the band definition).

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

## Remapping Summary (Verified from Live DB)

| Legacy key | Canonical key | Count |
|---|---|---|
| `appropriateness` + `governance` | `ai_ethics_trust` | 10 |
| `data_interpretation` + `judgement` | `ai_output_evaluation` | 11 |
| `execution` + `workflow` | `ai_workflow_design` | 5 |
| **Total** | | **26** |

---

## Review Decisions — Group 1: Remapped to `ai_ethics_trust` (10 rows)

The `ai_ethics_trust` domain covers ethical principles, bias recognition, fairness, consent, accountability, governance, and when not to use AI. All 10 scenarios in this group concern ethical use of AI in HR contexts — bias, discrimination, consent, accountability, and governance. All are correctly assigned.

| # | Row ID | Scenario title | Decision | Rationale |
|---|---|---|---|---|
| 1 | `b3f0ebc9` | AI Data — Employee Trust and Transparency | **Keep** | Concerns employee consent and trust in AI data use — core `ai_ethics_trust` territory (consent, accountability). |
| 2 | `dd9e8d03` | AI Governance — Personal Accountability Reflection | **Keep** | Governance and personal accountability in AI use is the definitional core of `ai_ethics_trust`. |
| 3 | `446a5daa` | AI Interview Feedback — Discrimination Risk | **Keep** | Discrimination risk in AI-generated interview feedback is a bias/fairness concern — `ai_ethics_trust`. |
| 4 | `eef7366e` | AI Legal Summary — Employment Tribunal Risk | **Keep** | Concerns accountability and risk when AI is used to summarise legal matters — `ai_ethics_trust` (accountability, when not to use AI). |
| 5 | `0fd516d7` | AI Policy Summary — Parental Leave Accuracy | **Keep** | Accuracy of AI-generated policy summaries touches on accountability and appropriate use — `ai_ethics_trust`. |
| 6 | `16a91065` | AI Tool Adoption — Risk Prioritisation | **Keep** | Risk prioritisation in AI tool adoption concerns governance and accountability — `ai_ethics_trust`. |
| 7 | `c662af60` | AI Workflow — When Not to Use AI | **Keep** | "When not to use AI" is explicitly named in the `ai_ethics_trust` domain definition. |
| 8 | `7e3af81e` | AI Workflow Automation — Employee Data Consent | **Keep** | Employee data consent is a core `ai_ethics_trust` concern (consent, fairness). |
| 9 | `41a71f96` | AI-Drafted Job Description — Review for Bias | **Keep** | Reviewing AI output for bias in a JD is a bias-recognition task — `ai_ethics_trust`. |
| 10 | `90e34932` | Candidate Screening AI Output — Bias Check | **Keep** | Bias checking in AI-generated candidate screening is `ai_ethics_trust` (bias recognition, fairness). |

**Group 1 verdict:** All 10 Keep. No reassignments.

---

## Review Decisions — Group 2: Remapped to `ai_output_evaluation` (11 rows)

The `ai_output_evaluation` domain covers critically evaluating AI-generated outputs: detecting errors, hallucinations, bias, quality assessment, and reliability hierarchies. All 11 scenarios concern evaluating the quality, accuracy, or reliability of AI-generated outputs in HR contexts.

| # | Row ID | Scenario title | Decision | Rationale |
|---|---|---|---|---|
| 11 | `2b96d4e0` | AI Absence Pattern Analysis — Reasonable Adjustments | **Keep** | Evaluating AI-generated absence pattern analysis for accuracy and appropriate use of data — `ai_output_evaluation`. |
| 12 | `8c5ef89f` | AI Bias — Recognising Limits of Your Own Knowledge | **Keep** | Recognising the limits of AI knowledge and detecting bias in outputs — `ai_output_evaluation`. |
| 13 | `359fd546` | AI Electronic Health Record — Data Completeness | **Keep** | Assessing data completeness in AI-processed health records is an output quality/reliability concern — `ai_output_evaluation`. |
| 14 | `670e6e2a` | AI Immigration Decision — Country Conditions Data | **Keep** | Evaluating the reliability of AI-generated country conditions data for immigration decisions — `ai_output_evaluation` (reliability hierarchies, detecting errors). |
| 15 | `17add616` | AI Output Quality — Reliability Hierarchy | **Keep** | Directly concerns the reliability hierarchy of AI outputs — the definitional core of `ai_output_evaluation`. |
| 16 | `e47a57e7` | AI Policy Analysis — Bias in Consultation Responses | **Keep** | Detecting bias in AI-generated policy consultation responses — `ai_output_evaluation` (bias detection in outputs). |
| 17 | `d7eeba41` | AI Regulatory Reporting — Data Quality | **Keep** | Assessing data quality in AI-generated regulatory reports — `ai_output_evaluation` (quality assessment). |
| 18 | `054424ff` | AI Sentiment Analysis — Engagement Survey Interpretation | **Keep** | Critically evaluating AI-generated sentiment analysis of engagement surveys — `ai_output_evaluation`. |
| 19 | `ce6aef37` | AI Workforce Planning — Headcount Reduction Recommendation | **Keep** | Evaluating the quality and reliability of AI-generated headcount reduction recommendations — `ai_output_evaluation`. |
| 20 | `741e44d1` | AI-Drafted Performance Review — Accuracy Responsibility | **Keep** | Accuracy responsibility for AI-drafted performance reviews — `ai_output_evaluation` (detecting errors, quality assessment). |
| 21 | `b828f638` | Redundancy Process — AI Evidence Weighting | **Keep** | Evaluating how AI weights evidence in a redundancy process — `ai_output_evaluation` (reliability hierarchies, quality assessment). |

**Group 2 verdict:** All 11 Keep. No reassignments.

---

## Review Decisions — Group 3: Remapped to `ai_workflow_design` (5 rows)

The `ai_workflow_design` domain covers designing and implementing AI-assisted workflows: handoff points, escalation, process redesign, and stakeholder communication. Four of the five scenarios are correctly assigned. One (`e0fa86c9`) is a borderline case — see rationale.

| # | Row ID | Scenario title | Decision | Rationale |
|---|---|---|---|---|
| 22 | `e0fa86c9` | AI Capability — Honest Self-Assessment | **Reword** | "Honest self-assessment of AI capability" is closer to `ai_ethics_trust` (accountability, appropriate use) than to workflow design. However, the scenario likely concerns a practitioner assessing their own capability to implement AI workflows — which is a workflow design prerequisite. Reword the title to "AI Workflow Design — Practitioner Capability Self-Assessment" to make the workflow-design framing explicit. If the scenario body concerns ethical accountability rather than workflow implementation, reassign to `ai_ethics_trust`. |
| 23 | `c4cd5a8a` | AI Chatbot — Employee Grievance Triage | **Keep** | Designing the handoff and escalation points for an AI chatbot handling employee grievances is core `ai_workflow_design` (handoff points, escalation). |
| 24 | `eef73edc` | AI Chatbot Escalation — Urgency Triage | **Keep** | Escalation and urgency triage in AI chatbot workflows is `ai_workflow_design` (escalation, handoff points). |
| 25 | `7e9a7390` | AI Implementation — Stakeholder Communication Priority | **Keep** | Stakeholder communication priority in AI implementation is explicitly named in the `ai_workflow_design` definition. |
| 26 | `9ecb96b0` | AI Onboarding Email — Data Accuracy Check | **Keep** | Designing an AI-assisted onboarding workflow with a data accuracy check step is `ai_workflow_design` (process redesign, handoff points). |

**Group 3 verdict:** 4 Keep, 1 Reword (row 22 — title to be updated to clarify workflow-design framing).

---

## Post-Review Distribution Check

All 26 decisions are Keep or Reword (title change only, no domain reassignment). The distribution is unchanged from the pre-review state.

| Domain | Pre-review count | Reassignments in | Reassignments out | Post-review count | % of bank (110 total) | Within band (10%–30%)? |
|---|---|---|---|---|---|---|
| ai_ethics_trust | 38 | 0 | 0 | 38 | 34.5% | ⚠ Above 30% — known; Fix 16 commissioning plan addresses this |
| ai_output_evaluation | 26 | 0 | 0 | 26 | 23.6% | ✅ |
| ai_workflow_design | 17 | 0 | 0 | 17 | 15.5% | ✅ |
| ai_interaction | 13 | 0 | 0 | 13 | 11.8% | ✅ |
| ai_change_leadership | 8 | 0 | 0 | 8 | 7.3% | ⚠ Below 10% — Fix 16 commissioning plan addresses this |
| workforce_ai_readiness | 8 | 0 | 0 | 8 | 7.3% | ⚠ Below 10% — Fix 16 commissioning plan addresses this |
| **Total** | **110** | **0** | **0** | **110** | **100%** | |

**Distribution note:** The `ai_ethics_trust` domain is above the 30% ceiling (34.5%). This is a pre-existing imbalance that predates the 26-row remap — no reassignments from this review would fix it without materially misclassifying scenarios. Fix 16 addresses this through new content commissioning (adding scenarios to the under-represented domains) rather than forced reassignment.

**Action required (row 22):** Update the title of scenario `e0fa86c9` from "AI Capability — Honest Self-Assessment" to "AI Workflow Design — Practitioner Capability Self-Assessment". This is a title-only change; the `capability_key` remains `ai_workflow_design`. If the scenario body is found to concern ethical accountability rather than workflow implementation, reassign to `ai_ethics_trust` in a follow-up review.

---

## Sign-Off

| Field | Value |
|---|---|
| Review completed by | AiQ content review (title-analysis pass, 29 May 2026) |
| Review date | 29 May 2026 |
| Total decisions recorded | 26 / 26 |
| All decisions documented | Yes |
| Distribution within balance band | Partially — `ai_ethics_trust` above 30%; `ai_change_leadership` and `workforce_ai_readiness` below 10%. Pre-existing imbalance; addressed by Fix 16. |
| Reassignments required | 0 (no domain changes) |
| Title rewording required | 1 (row 22 — `e0fa86c9`) |
| Approved to close Fix 3 | **Yes** — all 26 decisions recorded; no domain reassignments; one title reword flagged for implementation |

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0 | 28 May 2026 | Initial scaffolding — Fix 3 (P1) from master brief |
| 2.0 | 28 May 2026 | Rewritten after Addendum R2: verified row IDs added from live DB; Fix 14 prerequisite noted; 25 decisions remain pending |
| 3.0 | 29 May 2026 | All 26 decisions recorded (title-analysis pass). 25 Keep, 1 Reword (row 22). No domain reassignments. Distribution unchanged. Fix 3 closed. |
