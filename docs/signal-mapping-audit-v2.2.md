# AiQ v2.2 — Signal Mapping Audit (Addition C)

**Date:** 23 April 2026  
**Scope:** Full comparison of the 22 canonical signal keys across three sources of truth: (1) the TypeScript `SIGNAL_TO_CAPABILITY` map in `server/assessment/scoringEngine.ts`, (2) the DB migration `drizzle/0009_signal_key_constraints.sql`, and (3) Section 3.1 of the architecture document `docs/aiq-assessment-architecture-v2.2.md`.

---

## Audit Result: PASS — All Three Sources Are in Agreement

No discrepancy was found. All 22 signals are present in all three sources with identical capability mappings and risk flags.

---

## Full Comparison Table

| Signal Key | Code Mapping | DB Migration Mapping | Doc Section 3.1 Mapping | Risk Signal | Match |
|---|---|---|---|---|---|
| `execution_quality` | execution | execution | execution | No | ✓ |
| `prioritisation_quality` | execution | execution | execution | No | ✓ |
| `validation_accuracy` | execution | execution | execution | No | ✓ |
| `timing_integrity` | execution | execution | execution | No | ✓ |
| `consistency_index` | execution | execution | execution | No | ✓ |
| `judgement_quality` | judgement | judgement | judgement | No | ✓ |
| `discrimination_quality` | judgement | judgement | judgement | No | ✓ |
| `over_caution_risk` | judgement | judgement | judgement | **Yes** | ✓ |
| `avoidance_risk` | judgement | judgement | judgement | **Yes** | ✓ |
| `calibration_index` | judgement | judgement | judgement | No | ✓ |
| `governance_quality` | governance | governance | governance | No | ✓ |
| `over_reliance_risk` | governance | governance | governance | **Yes** | ✓ |
| `blind_acceptance_risk` | governance | governance | governance | **Yes** | ✓ |
| `contradiction_index` | governance | governance | governance | **Yes** | ✓ |
| `governance_bypass_risk` | governance | governance | governance | **Yes** | ✓ |
| `hallucination_acceptance_risk` | governance | governance | governance | **Yes** | ✓ |
| `appropriateness_boundary` | appropriateness | appropriateness | appropriateness | No | ✓ |
| `automation_expansion_risk` | appropriateness | appropriateness | appropriateness | **Yes** | ✓ |
| `cosmetic_focus_risk` | appropriateness | appropriateness | appropriateness | **Yes** | ✓ |
| `unsafe_hr_decision_risk` | appropriateness | appropriateness | appropriateness | **Yes** | ✓ |
| `workflow_application_quality` | workflow | workflow | workflow | No | ✓ |
| `data_interpretation_quality` | data_interpretation | data_interpretation | data_interpretation | No | ✓ |

**Total: 22/22 signals match across all three sources.**

---

## Historical Note

The v2.2 initial pass (before the Completion Pass) had two discrepancies in the architecture document:
1. Section 3.1 listed only 16 signals (6 were missing).
2. A phantom signal `validation_bypass_risk` was listed but does not exist in the codebase.

Both were corrected in the Completion Pass (checkpoint `83fb62b8`). The code and DB were always correct; the documentation was the only source of error.

---

## Capability Distribution

| Capability | Signal Count | Signal Keys |
|---|---|---|
| execution | 5 | execution_quality, prioritisation_quality, validation_accuracy, timing_integrity, consistency_index |
| judgement | 5 | judgement_quality, discrimination_quality, over_caution_risk, avoidance_risk, calibration_index |
| governance | 6 | governance_quality, over_reliance_risk, blind_acceptance_risk, contradiction_index, governance_bypass_risk, hallucination_acceptance_risk |
| appropriateness | 4 | appropriateness_boundary, automation_expansion_risk, cosmetic_focus_risk, unsafe_hr_decision_risk |
| workflow | 1 | workflow_application_quality |
| data_interpretation | 1 | data_interpretation_quality |

**Note:** `governance` has 6 signals (the most of any capability) because it covers both quality signals and multiple risk signals. `workflow` and `data_interpretation` each have only 1 signal, reflecting their narrower scope in the v2.2 assessment framework. This distribution is intentional and documented in the architecture.
