# Domain Balance Commissioning Plan

**Version:** 1.0  
**Date:** 28 May 2026  
**Remediation item:** Fix 16 (P1) — AiQ Evidence Pack Remediation Brief Addendum R2  
**Status:** Open — content commissioning required before balance band test will pass

---

## Balance Band Definition

The adaptive assessment requires a reasonably balanced scenario bank to avoid systematic over-testing in one domain and under-testing in another. The agreed band is:

> **No domain may fall below 10% or exceed 30% of the total scenario bank.**

This band is enforced by `server/content-balance-band.test.ts`. The test currently fails and will continue to fail until the commissioning actions below are completed.

---

## Current Distribution vs Band (28 May 2026)

| Domain | Count | % of 110 | Band status | Action required |
|---|---|---|---|---|
| ai_ethics_trust | 38 | 34.5% | **OVER BAND** | Reassign 5 scenarios to other domains (via Fix 3 review), or commission 15+ scenarios in thin domains to dilute the percentage |
| ai_output_evaluation | 26 | 23.6% | OK | None |
| ai_workflow_design | 17 | 15.5% | OK | None |
| ai_interaction | 13 | 11.8% | OK | None |
| ai_change_leadership | 8 | 7.3% | **UNDER BAND** | Commission ≥ 3 new scenarios |
| workforce_ai_readiness | 8 | 7.3% | **UNDER BAND** | Commission ≥ 3 new scenarios |

The minimum required to bring all domains within band (assuming no reassignments and no new content in over-band domains):

- `ai_change_leadership`: needs +3 scenarios (to reach 11 of 113 total = 9.7% — actually needs +4 to clear 10% of the new total)
- `workforce_ai_readiness`: needs +3 scenarios (same logic)

**Practical target:** Commission 5 new scenarios in each thin domain (total +10) to provide headroom. This brings the bank to 120 total, with thin domains at 13/120 = 10.8% each and `ai_ethics_trust` at 38/120 = 31.7% — still marginally over band. A further 3 reassignments from `ai_ethics_trust` (via Fix 3 review) would bring it to 35/120 = 29.2%, within band.

**Recommended combined action:** Commission 5 scenarios per thin domain (+10 total) AND reassign 3 `ai_ethics_trust` scenarios to `ai_interaction` or `ai_workflow_design` via Fix 3 review. This achieves balance without requiring a large content sprint.

---

## Thin Domain Definitions and Content Briefs

### Domain: `ai_change_leadership`

**Definition:** Leading AI-related change in an organisation — stakeholder engagement, resistance management, culture shift, readiness assessment, and building buy-in for AI adoption.

**Current count:** 8 scenarios  
**Target count:** ≥ 13 (after commissioning)  
**Gap:** 5 new scenarios required

**Suggested scenario themes (for content author):**

| # | Suggested title | Core dilemma |
|---|---|---|
| 1 | AI Rollout — Managing Resistance from Senior Managers | A CPO faces pushback from line managers who fear AI will replace their team. What is the right engagement approach? |
| 2 | AI Change Programme — Communicating to the Workforce | An HR director must communicate a major AI-driven restructuring. How should the message be framed? |
| 3 | AI Adoption — Measuring Readiness Before Launch | A team is asked to assess workforce AI readiness before a new tool goes live. What does a good readiness check look like? |
| 4 | AI Culture — Building Psychological Safety for Experimentation | Employees are reluctant to use AI tools for fear of making mistakes. What leadership actions build the right culture? |
| 5 | AI Governance — Embedding Accountability in Change Programmes | A large-scale AI deployment lacks clear accountability for outcomes. How should governance be structured? |

### Domain: `workforce_ai_readiness`

**Definition:** Assessing and building workforce AI capability — skills gap analysis, readiness diagnostics, learning and development strategy, and capability building at scale.

**Current count:** 8 scenarios  
**Target count:** ≥ 13 (after commissioning)  
**Gap:** 5 new scenarios required

**Suggested scenario themes (for content author):**

| # | Suggested title | Core dilemma |
|---|---|---|
| 1 | AI Skills Gap — Prioritising L&D Investment Across Roles | An L&D director has a limited budget. Which roles should be prioritised for AI upskilling and why? |
| 2 | AI Readiness — Interpreting a Workforce Diagnostic | A workforce readiness survey shows mixed results. How should the HR team interpret and act on the data? |
| 3 | AI Upskilling — Designing a Blended Learning Programme | A large retailer needs to upskill 5,000 frontline staff on AI tools. What does an effective programme look like? |
| 4 | AI Capability — Assessing Individual Readiness for a New Role | A manager is being considered for an AI-heavy role. What capability evidence should HR look for? |
| 5 | AI Workforce Planning — Forecasting Skill Demand | An HR analytics team must forecast which AI skills will be in demand in 3 years. What methodology should they use? |

---

## Commissioning Process

1. **Content author** writes each scenario following the existing scenario format (title, stem, 4 options, correct answer, rationale, difficulty, domain).
2. **Content owner** reviews each scenario against the domain definition and the assessment methodology.
3. **Technical lead** inserts the new scenarios into `content_scenarios` via the admin seed script.
4. **QA** re-runs `pnpm test server/content-balance-band.test.ts` to confirm the band is met.
5. **Fix 16** is closed when the test passes.

---

## Fix 3 Reassignment Contribution

The Fix 3 scenario label review (see `references/scenario-label-review-record.md`) may result in some `ai_ethics_trust` scenarios being reassigned to other domains. If 3 or more scenarios are reassigned out of `ai_ethics_trust`, the over-band condition may resolve without additional commissioning in that domain. The commissioning plan above is designed to be sufficient regardless of Fix 3 outcomes.

---

## Acceptance Criteria

Fix 16 is closed when:

1. `pnpm test server/content-balance-band.test.ts` passes (all 3 tests green).
2. The commissioning plan has been executed and reviewed.
3. The ground-truth record (`references/content-scenario-distribution-ground-truth.md`) has been updated with the new distribution.

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0 | 28 May 2026 | Initial plan — Fix 16 (P1) from Addendum R2 |
