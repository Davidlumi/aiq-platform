# Scenario Label Review Record — 26 Relabelled Scenarios

**Version:** 1.0  
**Date:** 28 May 2026  
**Remediation item:** Fix 3 (P1) — AiQ Evidence Pack Remediation Brief, 28 May 2026  
**Reviewer:** Content Owner (to be completed — see sign-off section)

---

## Purpose

On 28 May 2026, 26 content scenarios were programmatically remapped from 6 legacy capability keys to the 6 canonical scoring-engine keys (script: `scripts/p1-remap-legacy-keys.ts`). The remapping was based on a content inspection of each legacy domain's thematic fit.

The brief (Fix 3, P1) requires that each of the 26 scenarios is reviewed against the canonical domain definition and that a keep / reword / reassign decision is recorded. This document captures those decisions.

**Done-when:** Each of the 26 has a documented keep/reword/reassign decision; distribution stays balanced after any reassignments.

---

## Remapping Summary

| Legacy key | Canonical key | Count | Rationale |
|---|---|---|---|
| `appropriateness` | `ai_ethics_trust` | 5 | All items concern ethical use, bias, consent, when-not-to-use — core ethics domain |
| `data_interpretation` | `ai_output_evaluation` | 6 | All items concern interpreting/evaluating AI outputs, reliability, quality |
| `execution` | `ai_workflow_design` | 4 | All items concern executing AI workflows, chatbot triage, onboarding |
| `governance` | `ai_ethics_trust` | 5 | All items concern governance, accountability, bias checks |
| `judgement` | `ai_output_evaluation` | 5 | All items concern exercising judgement on AI outputs, limits, weighting |
| `workflow` | `ai_workflow_design` | 1 | Item about stakeholder communication in AI implementation |
| **Total** | | **26** | |

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

## Review Decisions — Group 1: `appropriateness` → `ai_ethics_trust` (5 scenarios)

These scenarios were originally labelled `appropriateness` and remapped to `ai_ethics_trust`.

| # | Scenario title | Canonical domain | Decision | Rationale | Reviewer |
|---|---|---|---|---|---|
| 1 | *(content owner to populate from DB query — see query below)* | `ai_ethics_trust` | Pending | | |
| 2 | | `ai_ethics_trust` | Pending | | |
| 3 | | `ai_ethics_trust` | Pending | | |
| 4 | | `ai_ethics_trust` | Pending | | |
| 5 | | `ai_ethics_trust` | Pending | | |

**Query to retrieve these scenarios:**
```sql
SELECT id, title, scenario FROM content_scenarios
WHERE capability_key = 'ai_ethics_trust'
ORDER BY id LIMIT 5;
-- Note: the 5 appropriateness scenarios are the earliest-inserted rows in this group.
-- Cross-reference with the remap script output to confirm which 5 these are.
```

---

## Review Decisions — Group 2: `data_interpretation` → `ai_output_evaluation` (6 scenarios)

| # | Scenario title | Canonical domain | Decision | Rationale | Reviewer |
|---|---|---|---|---|---|
| 1 | *(content owner to populate)* | `ai_output_evaluation` | Pending | | |
| 2 | | `ai_output_evaluation` | Pending | | |
| 3 | | `ai_output_evaluation` | Pending | | |
| 4 | | `ai_output_evaluation` | Pending | | |
| 5 | | `ai_output_evaluation` | Pending | | |
| 6 | | `ai_output_evaluation` | Pending | | |

---

## Review Decisions — Group 3: `execution` → `ai_workflow_design` (4 scenarios)

| # | Scenario title | Canonical domain | Decision | Rationale | Reviewer |
|---|---|---|---|---|---|
| 1 | *(content owner to populate)* | `ai_workflow_design` | Pending | | |
| 2 | | `ai_workflow_design` | Pending | | |
| 3 | | `ai_workflow_design` | Pending | | |
| 4 | | `ai_workflow_design` | Pending | | |

---

## Review Decisions — Group 4: `governance` → `ai_ethics_trust` (5 scenarios)

| # | Scenario title | Canonical domain | Decision | Rationale | Reviewer |
|---|---|---|---|---|---|
| 1 | *(content owner to populate)* | `ai_ethics_trust` | Pending | | |
| 2 | | `ai_ethics_trust` | Pending | | |
| 3 | | `ai_ethics_trust` | Pending | | |
| 4 | | `ai_ethics_trust` | Pending | | |
| 5 | | `ai_ethics_trust` | Pending | | |

---

## Review Decisions — Group 5: `judgement` → `ai_output_evaluation` (5 scenarios)

| # | Scenario title | Canonical domain | Decision | Rationale | Reviewer |
|---|---|---|---|---|---|
| 1 | *(content owner to populate)* | `ai_output_evaluation` | Pending | | |
| 2 | | `ai_output_evaluation` | Pending | | |
| 3 | | `ai_output_evaluation` | Pending | | |
| 4 | | `ai_output_evaluation` | Pending | | |
| 5 | | `ai_output_evaluation` | Pending | | |

---

## Review Decisions — Group 6: `workflow` → `ai_workflow_design` (1 scenario)

| # | Scenario title | Canonical domain | Decision | Rationale | Reviewer |
|---|---|---|---|---|---|
| 1 | AI Implementation — Stakeholder Communication Priority | `ai_workflow_design` | **Keep** | Scenario concerns communicating AI implementation priorities to stakeholders — clearly workflow design, not ethics or output evaluation. Fit is strong. | Content Owner (pending sign-off) |

---

## Decision Codes

| Code | Meaning |
|---|---|
| **Keep** | Scenario content fits the canonical domain definition well. No change required. |
| **Reword** | Scenario content fits the domain but the framing or language needs updating to align with the canonical definition. |
| **Reassign** | Scenario content does not fit the canonical domain. Reassign to a better-fit domain and update `capability_key` in the database. |

---

## Post-Review Distribution Check

After all decisions are recorded, verify that the canonical key distribution remains balanced (no domain drops below the minimum threshold for adaptive assessment coverage).

**Current distribution (post-remap, pre-review):**

| Canonical key | Count | Min required | Status |
|---|---|---|---|
| `ai_change_leadership` | 8 | 5 | OK |
| `ai_ethics_trust` | 38 | 5 | OK |
| `ai_interaction` | 13 | 5 | OK |
| `ai_output_evaluation` | 26 | 5 | OK |
| `ai_workflow_design` | 17 | 5 | OK |
| `workforce_ai_readiness` | 8 | 5 | OK |
| **Total** | **110** | | |

If any reassignments reduce a domain below 5 scenarios, flag for content creation before closing this record.

---

## Sign-Off

| Field | Value |
|---|---|
| Review completed by | *(content owner name)* |
| Review date | *(date)* |
| Total decisions recorded | 0 / 26 |
| Reassignments required | *(count)* |
| Distribution check passed | Pending |
| Approved to close Fix 3 | No — pending content owner review |

---

## How to Complete This Record

1. Run the following query against the AiQ database to retrieve the 26 scenario titles:

```sql
-- Get all scenarios in the remapped domains, ordered by insertion to identify the legacy batches
SELECT id, title, capability_key, difficulty, LEFT(scenario, 120) as scenario_preview
FROM content_scenarios
WHERE capability_key IN ('ai_ethics_trust', 'ai_output_evaluation', 'ai_workflow_design')
ORDER BY capability_key, id;
```

2. Cross-reference with the remap script output (`scripts/p1-remap-legacy-keys.ts`) to identify which rows were remapped (the 5+6+4+5+5+1 batches).

3. For each scenario, read the full scenario text and compare it to the canonical domain definition above.

4. Record a Keep / Reword / Reassign decision with a one-line rationale.

5. For any Reassign decisions, update the database:
```sql
UPDATE content_scenarios SET capability_key = 'new_canonical_key', domain = 'new_canonical_key'
WHERE id = 'scenario-uuid';
```

6. Re-run the distribution check and confirm no domain falls below 5 scenarios.

7. Complete the sign-off section and link this document in the evidence pack.

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0 | 28 May 2026 | Initial record created — Fix 3 (P1) from DFS Evidence Pack Remediation Brief. Decisions pending content owner review. |
