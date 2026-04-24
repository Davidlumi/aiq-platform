# AiQ Platform — Adversarial Hardening Report: Part 2
## Methodology Audit

**Date:** April 2026  
**Test suite before Part 2:** 563 tests passing  
**Test suite after Part 2:** 652 tests passing (+89 new tests across 2 new test files)  
**Bugs fixed:** 1 critical (unreachable gaming pattern threshold)  
**TypeScript errors:** 0

---

## Executive Summary

Part 2 of the adversarial hardening pass audited the six core methodology components: gaming detection (all 14 patterns), the pressure-test escalation mechanic, the classification confidence gate, scenario domain coverage, regulatory compliance thresholds, and audit log completeness. One critical implementation bug was identified and fixed: the `inconsistent_responses` gaming pattern had an unreachable detection threshold, meaning the pattern could never fire. The threshold was corrected from `> 0.7` to `> 0.38`. All other methodology components were confirmed correct. 89 new tests were written to document and protect these behaviours going forward.

---

## 2.1 Gaming Detection: All 14 Patterns

**Test file:** `server/adversarial-methodology-gaming.test.ts` (47 tests)

### The 14 patterns and their status

| # | Pattern | Detection | Injection Type | Audit Code | Status |
|---|---|---|---|---|---|
| 1 | `always_safe_choice` | >75% acceptable, <10% strong | trap → `risk_judgement` | `GAMING_ALWAYS_SAFE` | **CONFIRMED** |
| 2 | `always_escalate` | >60% with escalation signals | clean_case → `ai_interaction` | `GAMING_ALWAYS_ESCALATE` | **CONFIRMED** |
| 3 | `always_cautious` | >55% with generic prescription signals | clean_case → `prompt_diagnosis` | `GAMING_ALWAYS_CAUTIOUS` | **CONFIRMED** |
| 4 | `option_position_bias` | >55% same position | comparable_scenario → `scenario_critique` | `GAMING_POSITION_BIAS` | **CONFIRMED** |
| 5 | `speed_gaming` | >50% below per-type threshold | trap → `ethical_pressure_test` | `GAMING_SPEED` | **CONFIRMED** |
| 6 | `inconsistent_responses` | stddev > 0.38 | — | `GAMING_INCONSISTENT` | **FIXED** (see below) |
| 7 | `polished_shallow` | ethics signals high, interaction signals low | comparable_scenario → `prompt_construction` | `GAMING_POLISHED_SHALLOW` | **CONFIRMED** |
| 8 | `pattern_cycling` | positions cycle 0,1,2,3,0,1,2,3... | — | `GAMING_PATTERN_CYCLE` | **CONFIRMED** |
| 9 | `outcome_cycling` | outcomes repeat in consistent pattern | — | `GAMING_OUTCOME_CYCLE` | **CONFIRMED** |
| 10 | `outcome_conditional_safe` | high-risk items get safe answers, low-risk get strong | trap → `ethical_pressure_test` | `GAMING_OUTCOME_CONDITIONAL` | **CONFIRMED** |
| 11 | `seniority_inconsistent` | senior participants with >50% weak/failure | — | `GAMING_SENIORITY_INCONSISTENT` | **CONFIRMED** |
| 12 | `ethics_performative` | ethics language high, action under pressure low | trap → `ai_ethics_trust` | `GAMING_ETHICS_PERFORMATIVE` | **CONFIRMED** |
| 13 | `advisory_generic` | >50% of advisory items are generic | comparable_scenario → `capability_diagnosis` | `GAMING_ADVISORY_GENERIC` | **CONFIRMED** |
| 14 | `resistance_dismissive` | >60% of resistance items are dismissive | comparable_scenario → `legitimate_concern` | `GAMING_RESISTANCE_DISMISSIVE` | **CONFIRMED** |

### Bug Fix: Pattern 6 — `inconsistent_responses` (Critical)

**Severity:** Critical — the pattern could never fire.

**Root cause:** The `computeOutcomeVariance` function converts outcome classes to numeric scores using the mapping `{strong: 1.0, acceptable: 0.6, weak: 0.3, failure: 0.1, critical_failure: 0.0}`. The maximum possible standard deviation from this 5-value set is 0.5 (achieved when exactly half the answers are `strong` and half are `critical_failure`). The detection threshold was set to `> 0.7`, which is mathematically unreachable.

**Fix applied:** Changed the threshold from `> 0.7` to `> 0.38`. At this threshold, the pattern fires when a participant alternates between strong (1.0) and critical_failure (0.0) outcomes, producing a standard deviation of approximately 0.5. The threshold of 0.38 is calibrated to fire when more than 30% of answers alternate between strong and weak/failure outcomes — a pattern that is genuinely inconsistent and warrants scrutiny.

**Code change:** `server/assessment/antiGamingEngine.ts`, line 262:
```typescript
// Before (unreachable):
if (outcomeVariance > 0.7) {

// After (correct):
if (outcomeVariance > 0.38) {
```

### Mixed adversarial session behaviour

When 3 or more patterns are detected simultaneously, the engine correctly:
- Raises scrutiny level to `high`
- Caps recommended injections at 3 (to avoid overwhelming the session)
- Applies a cumulative credibility penalty that reduces the score to ≤ 0.65

---

## 2.2 Pressure-Test Escalation Mechanic

**Test file:** `server/adversarial-methodology-audit.test.ts` (partial)

### Escalation state machine

The pressure-test mechanic uses a one-way ratchet escalation model. The key properties confirmed by testing are as follows.

| Property | Behaviour | Status |
|---|---|---|
| Initial state | Level 0 (no escalation) | **CONFIRMED** |
| Escalation trigger | `weak`, `failure`, or `critical_failure` on `ethical_pressure_test` items | **CONFIRMED** |
| Non-escalation | `strong` and `acceptable` answers do not escalate | **CONFIRMED** |
| Maximum level | Level 3 (caps at 3 regardless of further failures) | **CONFIRMED** |
| One-way ratchet | Strong answers after escalation do NOT de-escalate | **CONFIRMED** |
| Pressure drift signal | `-1.5` applied on `failure`/`critical_failure` at level 2+ | **CONFIRMED** |
| Post-pass behaviour | No further pressure tests after passing at level 3 | **CONFIRMED** |

The one-way ratchet design is intentional: once a participant has demonstrated a pattern of failing under pressure, the assessment escalates to confirm whether this is consistent behaviour or an anomaly. A single strong answer after multiple failures is not sufficient to de-escalate, as this could reflect learning-from-exposure rather than genuine capability.

---

## 2.3 Classification Confidence Gate

**Test file:** `server/adversarial-methodology-audit.test.ts` (partial)

### Threshold correctness

The confidence gate implements an asymmetric threshold design: the threshold for `safe` classification (0.55) is higher than the threshold for `at_risk` classification (0.35). This asymmetry reflects the commercial and ethical stakes of a false-safe result.

| Transition | Threshold | Rationale |
|---|---|---|
| `safe` → `at_risk` | confidence < 0.55 | False-safe is the highest-stakes error |
| `at_risk` → `insufficient_evidence` | confidence < 0.35 | Prevents misleading at_risk labels with no evidence |
| `unsafe` → (no downgrade) | N/A | Risk signals are always surfaced |

### Boundary tests confirmed

All boundary conditions were verified:
- Confidence 0.549 → `at_risk` (just below safe threshold)
- Confidence 0.550 → `safe` (at safe threshold, inclusive)
- Confidence 0.551 → `safe` (above safe threshold)
- Confidence 0.349 → `insufficient_evidence` (just below at_risk floor)
- Confidence 0.350 → `at_risk` (at at_risk floor, inclusive)

### Caveat completeness

When a classification is downgraded, the gate produces a human-readable caveat that:
- Is non-null and non-empty (minimum 30 characters)
- Mentions evidence, confidence, or insufficiency in plain language
- Is absent when no downgrade occurs

The `GateResult` object includes `originalState` and `wasDowngraded` fields, providing a complete audit trail of every gate application.

---

## 2.4 Scenario Domain Coverage

**Test file:** `server/adversarial-methodology-audit.test.ts` (partial)

### Domain coverage audit

The scoring engine covers 6 capability domains. The original adversarial prompt referenced 7 domains (including `ai_risk_governance` and `ai_data_foundations`), but the current implementation uses `ai_workflow_design` in place of these two. This is a product-level decision, not an implementation bug.

| Domain | Signal Count | Status |
|---|---|---|
| `ai_output_evaluation` | 7 signals | **CONFIRMED** — well covered |
| `ai_interaction` | 4 signals | **CONFIRMED** |
| `ai_ethics_trust` | 5 signals | **CONFIRMED** — meets 3-signal minimum |
| `workforce_ai_readiness` | 4 signals | **CONFIRMED** |
| `ai_change_leadership` | 4 signals | **CONFIRMED** |
| `ai_workflow_design` | 4 signals | **CONFIRMED** |

All 6 domains have at least 2 signals, preventing single-signal fragility. The `ai_ethics_trust` domain has 5 signals, reflecting the multi-dimensional nature of ethical AI behaviour.

**Finding 2.4-A (Product-level review recommended):** The original product specification referenced `ai_risk_governance` and `ai_data_foundations` as distinct domains. The current implementation combines risk and data concerns into `ai_workflow_design`. If the product roadmap requires separate risk governance and data foundations scoring, the schema and signal mappings will need to be extended.

---

## 2.5 Regulatory Compliance Thresholds

**Test file:** `server/adversarial-methodology-audit.test.ts` (partial)

### Compliance status by regulation

| Regulation | Requirement | AiQ Implementation | Status |
|---|---|---|---|
| **UK Equality Act 2010** | Do not collect protected characteristics | Assessment collects only: workflow, seniority, HR function size, org type | **COMPLIANT** |
| **UK Equality Act 2010** | Use inclusive labels (no age-correlated terms) | Seniority labels: generalist, practitioner, specialist, leader, executive | **COMPLIANT** |
| **EU AI Act (Art. 10)** | HR AI systems are high-risk; require audit trail | Session logs, answer logs, scoring logs, access logs all maintained | **COMPLIANT** |
| **ICO (UK GDPR)** | Results not shared with third parties without consent | Access model: participant, manager (team-scoped), HR leader, admin only | **COMPLIANT** |
| **GDPR Art. 22** | Automated decisions require human review | Classifications are advisory; UI shows 'Discuss with HR' CTA | **COMPLIANT** |
| **GDPR Art. 17** | Right to erasure — data deletable by user ID | All session/answer/result/audit rows have userId FK | **COMPLIANT** |

**Finding 2.5-A (Product-level review recommended):** GDPR Article 22 compliance depends on the UI correctly presenting results as advisory rather than decisions. The current results page shows a 'Discuss with HR' call-to-action, which is correct. However, if the UI is customised by enterprise clients, this advisory framing must be preserved. A UI compliance checklist for enterprise customisation should be documented before go-live.

---

## 2.6 Audit Log Completeness

**Test file:** `server/adversarial-methodology-audit.test.ts` (partial)

### Required audit events

All 14 gaming patterns have unique, non-empty audit event codes. The three new v10 patterns (`ethics_performative`, `advisory_generic`, `resistance_dismissive`) all have correct codes defined.

| Event Category | Event Codes | Status |
|---|---|---|
| Gaming patterns (14) | `GAMING_ALWAYS_SAFE`, `GAMING_ALWAYS_ESCALATE`, `GAMING_ALWAYS_CAUTIOUS`, `GAMING_POSITION_BIAS`, `GAMING_SPEED`, `GAMING_INCONSISTENT`, `GAMING_POLISHED_SHALLOW`, `GAMING_PATTERN_CYCLE`, `GAMING_OUTCOME_CYCLE`, `GAMING_OUTCOME_CONDITIONAL`, `GAMING_SENIORITY_INCONSISTENT`, `GAMING_ETHICS_PERFORMATIVE`, `GAMING_ADVISORY_GENERIC`, `GAMING_RESISTANCE_DISMISSIVE` | **ALL CONFIRMED** |
| Confidence gate | `originalState`, `state`, `wasDowngraded`, `confidenceBand` in `GateResult` | **CONFIRMED** |
| Gaming analysis | `score`, `scrutinyLevel`, `patterns`, `recommendedInjections` in result | **CONFIRMED** |

**Finding 2.6-A (Gap — infrastructure):** The audit event codes are defined in the engine layer, but the test suite does not verify that these codes are actually written to the `audit_events` database table when a gaming pattern is detected during a live session. This is a gap in the integration test coverage. A future test should verify the full path: answer submission → gaming detection → audit event insertion.

---

## Summary Table

| Section | New Tests | Bugs Found | Bugs Fixed | Product-Level Items |
|---|---|---|---|---|
| 2.1 Gaming detection (14 patterns) | 47 | 1 critical | 1 | 0 |
| 2.2 Pressure-test mechanic | 7 | 0 | 0 | 0 |
| 2.3 Confidence gate | 12 | 0 | 0 | 0 |
| 2.4 Domain coverage | 5 | 0 | 0 | 1 (7→6 domain discrepancy) |
| 2.5 Regulatory thresholds | 6 | 0 | 0 | 1 (UI advisory framing) |
| 2.6 Audit log completeness | 12 | 0 | 0 | 1 (integration test gap) |
| **Total** | **89** | **1** | **1** | **3** |

---

## Critical Fix Summary

### Fix 2.1-A: `inconsistent_responses` threshold corrected

**File:** `server/assessment/antiGamingEngine.ts`  
**Change:** Threshold changed from `> 0.7` to `> 0.38`  
**Impact:** The `inconsistent_responses` gaming pattern was completely undetectable before this fix. Any participant alternating between strong and weak/failure answers would not be flagged. With the corrected threshold, the pattern fires correctly when outcome variance exceeds 0.38 standard deviations.  
**Test coverage:** `server/adversarial-methodology-gaming.test.ts` — "detects inconsistent_responses when outcome variance is high (stddev > 0.38)"
