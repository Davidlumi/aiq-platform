# AiQ Platform — Phase 1 Evolution Pause Document

**Document status:** Released (v2.0 — with gap analysis)
**Date:** 24 April 2026
**Platform version:** f8a3c5b9 (latest checkpoint)
**Preceding version:** v2.2 Engine Remediation (checkpoint 059d15b8, 23 April 2026)
**Author:** AiQ Engineering

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Evolution Context — From v9.2 to v10](#2-evolution-context--from-v92-to-v10)
3. [v10 Capability Architecture](#3-v10-capability-architecture)
4. [Signal System (26 Signals)](#4-signal-system-26-signals)
5. [Interaction Types (15 + 1 Cross-Cutting)](#5-interaction-types-15--1-cross-cutting)
6. [Scoring Engine](#6-scoring-engine)
7. [Failure Mode Detection](#7-failure-mode-detection)
8. [Anti-Gaming Engine (14 Patterns)](#8-anti-gaming-engine-14-patterns)
9. [Adaptive Engine — Foundation-First Routing](#9-adaptive-engine--foundation-first-routing)
10. [Readiness Classification (6 States)](#10-readiness-classification-6-states)
11. [Confidence Staking (3 Levels)](#11-confidence-staking-3-levels)
12. [Content Library](#12-content-library)
13. [Learning Prescription Engine](#13-learning-prescription-engine)
14. [Test Suite](#14-test-suite)
15. [Platform Architecture Summary](#15-platform-architecture-summary)
16. [Completed Work Items](#16-completed-work-items)
17. [Remaining Work Items](#17-remaining-work-items)
18. [Gap Analysis Against Source Documents](#18-gap-analysis-against-source-documents)
19. [Summary Scorecard](#19-summary-scorecard)
20. [Known Technical Gaps and Risks](#20-known-technical-gaps-and-risks)
21. [Decision Log](#21-decision-log)
22. [Appendix A — File Inventory](#22-appendix-a--file-inventory)

---

## 1. Executive Summary

Phase 1 of the AiQ v10 evolution is a major rework of the assessment engine, transitioning from the v9.2 capability taxonomy (6 domains: execution, judgement, governance, appropriateness, workflow, data_interpretation) to a new v10 taxonomy designed around **practical AI skills** rather than theoretical AI judgement.

The v10 framework answers the question **"Can you work with AI?"** rather than the v9.2 question **"Can you judge AI?"**. This shift is reflected across every layer of the platform: the scoring engine, adaptive engine, anti-gaming engine, contradiction engine, session controller, role archetypes, content library, learning prescription engine, frontend results pages, dashboards, and marketing materials.

### Key Metrics at Pause

| Metric | Value |
|--------|-------|
| Total TypeScript/TSX lines | ~51,000 |
| Server-side engine files | 43 |
| Client-side files | 109 |
| Test files | 19 |
| Total tests passing | 391/391 (100%) |
| Database tables | 76 |
| Migration SQL files | 19 |
| Schema definition lines | 1,287 |
| tRPC routers | 18 |
| Frontend pages | 36 |
| v10 capability domains | 6 |
| v10 signals | 26 |
| v10 interaction types | 16 (15 + 1 cross-cutting) |
| Anti-gaming patterns | 14 |
| Role archetypes | 16 |
| Learning modules seeded | 72 |
| Content scenarios seeded | 53+ (40 original + 13 new) |
| Readiness states | 6 |

---

## 2. Evolution Context — From v9.2 to v10

### Why the Rework

The v9.2 framework measured whether HR professionals could **review and evaluate AI outputs** — spotting errors, assessing governance compliance, evaluating appropriateness. While important, this tested only one dimension of AI capability. Real-world HR professionals need to **interact with AI tools**, **design AI-augmented workflows**, **lead AI change programmes**, and **build workforce AI readiness** — not just judge outputs.

### What Changed

The v10 rework touched every layer of the assessment engine. The following table summarises the mapping from v9.2 to v10:

| v9.2 Domain | v10 Domain | Key |
|-------------|------------|-----|
| Execution | AI Interaction | `ai_interaction` |
| Judgement | AI Output Evaluation | `ai_output_evaluation` |
| Appropriateness | AI Workflow Design | `ai_workflow_design` |
| Workflow | Workforce AI Readiness | `workforce_ai_readiness` |
| Governance | AI Ethics & Employee Trust | `ai_ethics_trust` |
| Data Interpretation | AI Change Leadership | `ai_change_leadership` |

### What Was Preserved

The v10 rework preserved the core architectural patterns from v9.2:

- **Sum-and-clip scoring formula** (intercept + weighted signal contributions, clamped 0–100)
- **Outcome class modifiers** (strong/acceptable/weak/failure/critical_failure carrying the sign)
- **Difficulty weights and risk multipliers** (L1–L3 difficulty, Low–Critical risk)
- **Foundation-first gating** (renamed from "baseline-first" but same principle)
- **Anti-gaming injection mechanic** (probe items injected when patterns detected)
- **Contradiction detection and resolution** (cross-domain pairs updated for v10 domains)
- **Classification confidence gate** (three-threshold model: 0.40 provisional, 0.50 floor, 0.60 safe gate)
- **Session controller state machine** (baseline → adaptive → validation → complete)

---

## 3. v10 Capability Architecture

### 6 Domains

The v10 framework defines six capability domains, split into two tiers:

**Foundation Domains** (must establish ≥3 signal contributions before strategic domains are probed):

| Domain | Key | Description |
|--------|-----|-------------|
| AI Interaction | `ai_interaction` | Can you talk to AI effectively? Prompting, iteration, output direction, tool fluency. |
| AI Output Evaluation | `ai_output_evaluation` | Can you judge what AI gives you? Error detection, bias detection, fitness-for-purpose, hallucination awareness. |

**Strategic Domains** (probed after foundation evidence is established):

| Domain | Key | Description |
|--------|-----|-------------|
| AI Workflow Design | `ai_workflow_design` | Can you redesign processes around AI? Workflow redesign, handoff design, human oversight, automation boundaries. |
| Workforce AI Readiness | `workforce_ai_readiness` | Can you build AI capability in others? Capability diagnosis, intervention design, leader advisory, prescription quality. |
| AI Ethics & Employee Trust | `ai_ethics_trust` | Can you navigate AI ethics under pressure? Ethics under pressure, stakeholder impact, transparency advocacy, legal vs fair. |
| AI Change Leadership | `ai_change_leadership` | Can you lead AI change? Resistance response, legitimate concern recognition, change pace calibration, dismissive-of-concern risk. |

### Domain Weights by Role Archetype

Each of the 16 role archetypes has a custom weight profile across the 6 domains. Weights are used in overall score computation and readiness classification. Example:

| Archetype | AI Interaction | AI Output Eval | AI Workflow | Workforce Readiness | AI Ethics | AI Change |
|-----------|---------------|----------------|-------------|--------------------|-----------|-----------| 
| HRBP | 1.0 | 1.2 | 1.1 | 1.3 | 1.2 | 1.0 |
| People Analytics | 1.3 | 1.5 | 1.0 | 0.8 | 1.0 | 0.8 |
| HR Leader | 0.8 | 1.0 | 1.2 | 1.3 | 1.3 | 1.5 |

---

## 4. Signal System (26 Signals)

Each signal maps to exactly one capability domain. Signal deltas are stored as unsigned magnitudes (0.0–3.0); the sign is carried by the outcome class modifier.

### AI Interaction (4 signals)

| Signal Key | Display Name |
|-----------|-------------|
| `prompt_construction_quality` | Prompt Construction Quality |
| `prompt_iteration_quality` | Prompt Iteration Quality |
| `output_direction_skill` | Output Direction Skill |
| `tool_fluency_index` | Tool Fluency |

### AI Output Evaluation (7 signals)

| Signal Key | Display Name |
|-----------|-------------|
| `output_evaluation_quality` | Output Evaluation Quality |
| `error_detection_accuracy` | Error Detection Accuracy |
| `fitness_for_purpose_judgement` | Fitness-for-Purpose Judgement |
| `blind_acceptance_risk` | Blind Acceptance Risk |
| `hallucination_acceptance_risk` | Hallucination Acceptance Risk |
| `bias_detection_skill` | Bias Detection Skill |
| `data_interpretation_quality` | Data Interpretation Quality |

### AI Workflow Design (4 signals)

| Signal Key | Display Name |
|-----------|-------------|
| `workflow_redesign_quality` | Workflow Redesign Quality |
| `handoff_design_quality` | Handoff Design Quality |
| `human_oversight_preservation` | Human Oversight Preservation |
| `automation_expansion_risk` | Automation Expansion Risk |

### Workforce AI Readiness (4 signals)

| Signal Key | Display Name |
|-----------|-------------|
| `capability_diagnosis_accuracy` | Capability Diagnosis Accuracy |
| `intervention_design_quality` | Intervention Design Quality |
| `leader_advisory_quality` | Leader Advisory Quality |
| `generic_prescription_risk` | Generic Prescription Risk |

### AI Ethics & Employee Trust (5 signals)

| Signal Key | Display Name |
|-----------|-------------|
| `ethics_under_pressure` | Ethics Under Pressure |
| `stakeholder_impact_awareness` | Stakeholder Impact Awareness |
| `employee_transparency_advocacy` | Employee Transparency Advocacy |
| `pressure_drift_risk` | Pressure Drift Risk |
| `legal_vs_fair_distinction` | Legal vs Fair Distinction |

### AI Change Leadership (4 signals)

| Signal Key | Display Name |
|-----------|-------------|
| `resistance_response_quality` | Resistance Response Quality |
| `legitimate_concern_recognition` | Legitimate Concern Recognition |
| `change_pace_calibration` | Change Pace Calibration |
| `dismissive_of_concern_risk` | Dismissive of Concern Risk |

### Risk Signals

Six signals are classified as risk signals (negative deltas indicate risk behaviours): `blind_acceptance_risk`, `hallucination_acceptance_risk`, `automation_expansion_risk`, `generic_prescription_risk`, `pressure_drift_risk`, `dismissive_of_concern_risk`.

---

## 5. Interaction Types (15 + 1 Cross-Cutting)

The v10 framework defines 15 interaction types plus 1 cross-cutting type, organised by the domain they primarily assess:

### Preserved from v9.2 (4 types)

| Type | Primary Domain | Description |
|------|---------------|-------------|
| `scenario_critique` | AI Output Evaluation | Evaluate an AI-generated output for quality and fitness |
| `error_detection` | AI Output Evaluation | Find specific errors in AI output |
| `risk_judgement` | AI Ethics & Trust | Assess risk severity and recommend mitigation |
| `confidence_calibration` | AI Output Evaluation | Calibrate confidence in AI output reliability |

### New in v10 (11 types)

| Type | Primary Domain | Description |
|------|---------------|-------------|
| `prompt_diagnosis` | AI Interaction | Diagnose why a prompt produced poor output and fix it |
| `prompt_construction` | AI Interaction | Construct an effective prompt for a given HR task |
| `process_redesign` | AI Workflow Design | Redesign an HR process to incorporate AI effectively |
| `handoff_decision` | AI Workflow Design | Decide where human oversight is needed in an AI workflow |
| `capability_diagnosis` | Workforce AI Readiness | Diagnose AI capability gaps in a team or individual |
| `intervention_design` | Workforce AI Readiness | Design an intervention to build AI capability |
| `leader_advisory` | Workforce AI Readiness | Advise a leader on AI adoption strategy |
| `ethical_pressure_test` | AI Ethics & Trust | Navigate an ethical dilemma under organisational pressure |
| `stakeholder_impact` | AI Ethics & Trust | Assess impact of AI decisions on employees and stakeholders |
| `resistance_response` | AI Change Leadership | Respond to resistance to AI change |
| `legitimate_concern` | AI Change Leadership | Distinguish legitimate concerns from change resistance |

### Cross-Cutting (1 type)

| Type | Purpose |
|------|---------|
| `contradiction_probe` | Resolve detected contradictions in prior responses |

---

## 6. Scoring Engine

### Formula

The v10 scoring engine uses the **sum-and-clip** formula:

```
capabilityScore = intercept + Σ(signalDelta × outcomeModifier × difficultyWeight × riskMultiplier) / signalCount × scaleFactor
```

Where:
- **Intercept** = 50 (configurable via `scoring_config` table)
- **Outcome modifiers**: strong (+1.0), acceptable (+0.6), weak (−0.3), failure (−0.7), critical_failure (−1.5)
- **Difficulty weights**: L1 (1.0×), L2 (1.3×), L3 (1.6×)
- **Risk multipliers**: Low (1.0/1.0), Medium (1.0/1.15), High (1.3/1.5), Critical (1.3/1.6)
- **Scale factor** = 50 / max(signalCount, 1)
- **Clamp** = [0, 100]

### Overall Score

The overall score is computed as a **capability-weighted mean** using role archetype weights, with a **consistency penalty** (standard-deviation-based, capped at 8 points) applied to penalise highly inconsistent profiles.

### Configuration Versioning

All scoring parameters are stored in the `scoring_config` table with version tracking. Sessions are stamped with `scoringConfigVersionAtStart` and `scoringConfigVersionAtCompletion` for auditability.

---

## 7. Failure Mode Detection

The v10 engine detects 7 failure modes, classified as blocking or downgrade:

### Blocking Modes (prevent `safe` classification)

| Mode | Trigger |
|------|---------|
| `blind_acceptance` | High blind_acceptance_risk signal across multiple items |
| `hallucination_acceptance` | High hallucination_acceptance_risk signal |
| `critical_failure` | Multiple critical_failure outcome class answers |
| `pressure_drift` | Ethics under pressure signal degrades under escalating constraints |

### Downgrade Modes (downgrade from `safe` to `at_risk`)

| Mode | Trigger |
|------|---------|
| `over_reliance` | Consistently high trust in AI output without verification |
| `dismissive_of_concern` | Dismisses legitimate employee concerns about AI |
| `generic_prescription` | Provides generic, non-contextualised AI adoption advice |

### Hybrid Counting

Failure mode detection uses a hybrid counting model: `blockCount ≥ 2 AND (distinctModes ≥ 2 OR blockCount ≥ 1.5 × baseThreshold)`. This prevents single-pattern inflation while still catching genuine multi-item failures.

---

## 8. Anti-Gaming Engine (14 Patterns)

The v10 anti-gaming engine detects 14 patterns and injects probe items when patterns are detected:

| Pattern | Description | Injection |
|---------|-------------|-----------|
| `always_escalate` | Always chooses the most extreme/escalatory option | Comparable scenario targeting same capability |
| `always_cautious` | Always chooses the most cautious/conservative option | Clean case targeting AI Interaction |
| `always_safe_choice` | Always picks the "safe" middle-ground option | Format variation probe |
| `speed_gaming` | Answers too quickly (per-interaction-type thresholds) | Comparable scenario |
| `pattern_cycling` | Positional cycling (A→B→C→D repeating) | Format variation |
| `outcome_cycling` | Outcome class cycling (strong→acceptable→weak repeating) | Comparable scenario |
| `inconsistent_responses` | Contradictory answers on similar items | Contradiction probe |
| `option_position_bias` | Consistently selects same position (e.g. always "B") | Format variation |
| `polished_shallow` | Articulate but substance-free reasoning | Comparable scenario |
| `seniority_inconsistent` | Responses inconsistent with declared seniority | Comparable scenario |
| `ethics_performative` | Performs ethics awareness without genuine ethical reasoning | Ethical pressure test |
| `advisory_generic` | Generic advice without contextual adaptation | Capability diagnosis |
| `resistance_dismissive` | Dismisses change resistance without engagement | Legitimate concern probe |
| `outcome_conditional_safe` | Safe answers only when outcome is visible | Ethical pressure test |

### Scrutiny Levels

The engine assigns a scrutiny level (normal, elevated, high) based on the number and severity of detected patterns. At `high` scrutiny, up to 3 injection items are permitted per session (vs 2 at normal/elevated), and a `policyEvaluations` row is written at session completion.

---

## 9. Adaptive Engine — Foundation-First Routing

The v10 adaptive engine implements a **foundation-first routing strategy**:

1. **Baseline phase** (items 1–15, ~30% of session): Targets foundation domains (AI Interaction, AI Output Evaluation) exclusively. Rotates through foundation interaction types (prompt_diagnosis, prompt_construction, confidence_calibration, scenario_critique, error_detection).

2. **Adaptive phase** (items 16–44): Targets strategic domains based on capability gap analysis. Uses a priority cascade:
   - Priority 1: Anti-gaming injections (if patterns detected)
   - Priority 2: Contradiction probes (if contradictions detected)
   - Priority 3: Pressure-test escalation (if pressure-test active)
   - Priority 4: Foundation gap fill (if foundation domains still under-evidenced)
   - Priority 5: Required interaction type coverage
   - Priority 6: Weakest capability targeting
   - Priority 7: Least-used interaction type for target capability

3. **Validation phase** (items 45–49): High-difficulty items targeting weakest capabilities, with contradiction probes interleaved.

### Pressure-Test Mechanic

The v10 engine introduces a **pressure-test mechanic** that escalates constraints across consecutive items targeting the same ethical domain. Constraints escalate through: CEO demand → legal sign-off → competitor pressure → board directive. This tests whether participants maintain ethical positions under increasing organisational pressure.

---

## 10. Readiness Classification (6 States)

The v10 classification system defines 6 readiness states with participant-facing labels:

| State | Internal Label | Participant Label | Colour | Trigger |
|-------|---------------|-------------------|--------|---------|
| `safe` | AI-Ready | AI-Ready | Green | All weighted domains ≥ threshold, no blocking failures |
| `at_risk` | Developing | Developing | Amber | One or more domains below threshold, no blocking failures |
| `unsafe` | Not Yet Ready | Foundation Development Required | Red | Multiple domains critically below threshold or blocking failures |
| `foundation_gap` | Foundation Gap | Foundation Capability In Progress | Orange | Foundation domains (AI Interaction, AI Output Evaluation) below minimum |
| `unknown` | Result Unavailable | More Evidence Needed | Grey | Confidence below floor (0.50) |
| `unknown_insufficient_evidence` | Insufficient Evidence | Assessment In Progress | Slate | Confidence below provisional threshold (0.40) |

### Governing Constraint

Every classification includes a `governingConstraint` field identifying the single domain that drove the classification decision (weakest weighted domain for `safe`, governing domain for others).

---

## 11. Confidence Staking (3 Levels)

The v10 framework replaces the v9.2 4-point confidence slider with a **three-level confidence staking system**:

| Level | Label | Numeric Value | Meaning |
|-------|-------|--------------|---------|
| `tentative` | Tentative | 0.3 | "I'm not sure about this" |
| `confident` | Confident | 0.6 | "I'm fairly sure" |
| `certain` | Certain | 0.9 | "I'm very sure about this" |

Confidence stakes feed into the **calibration index** signal, which measures the alignment between a participant's confidence and the quality of their answers. Over-confident wrong answers and under-confident right answers both reduce the calibration score.

---

## 12. Content Library

### Assessment Scenarios

The v10 content library contains 53+ assessment scenarios across all 6 domains and 15 interaction types, each with 4 options (one strong, one or more failure/critical_failure):

| Source | Count | Description |
|--------|-------|-------------|
| Original v10 seed (P1-24) | 40 scenarios, 160 options | Generated for all 15 interaction types across 6 domains |
| New v10 seed (P1-36) | 13 scenarios, 52 options | Additional scenarios covering all 6 domains with diverse interaction types |

Each scenario includes: title, domain, capability key, interaction type, difficulty level, risk level, governance sensitivity flag, scenario text, constraint, question, primary signal, ambiguity level, sector applicability, tool-agnostic flag, role keys, failure mode keys, and tags.

Each option includes: label text, outcome class, signal deltas (unsigned magnitudes), rationale text, and is_optimal flag.

### Learning Modules

The v10 learning module library contains **72 modules** across all 6 domains:

| Domain | Modules | Modalities | Difficulty Levels |
|--------|---------|-----------|-------------------|
| AI Interaction | 12 | tutorial, practical, quiz, case_study, scenario, reflection, coaching, video | L1–L5 |
| AI Output Evaluation | 12 | tutorial, practical, quiz, case_study, scenario, reflection, coaching, video | L1–L5 |
| AI Workflow Design | 12 | tutorial, practical, quiz, case_study, scenario, reflection, coaching, video | L1–L5 |
| Workforce AI Readiness | 12 | tutorial, practical, quiz, case_study, scenario, reflection, coaching, video | L1–L5 |
| AI Ethics & Employee Trust | 12 | tutorial, practical, quiz, case_study, scenario, reflection, coaching, video | L1–L5 |
| AI Change Leadership | 12 | tutorial, practical, quiz, case_study, scenario, reflection, coaching, video | L1–L5 |

Each module includes rich `body_json` content with: overview, learning objectives, content sections (with worked examples and tips), reflection prompts, citations, and key takeaways. Metadata includes role relevance, prerequisites, tags, and research basis.

---

## 13. Learning Prescription Engine

The v10 learning prescription engine was updated from v9.2 capability keys to v10 keys. It comprises:

### Gap Analysis Engine (`server/learning/gapAnalysisEngine.ts`)

- Computes capability gaps against role-tier benchmarks (junior/mid/senior)
- Classifies gaps as Critical (score < 40), Developing (40–59), Proficient (60–79), Advanced (≥80)
- Produces priority-ordered gap list, weighted overall readiness score, and up to 3 recommended focus areas
- Uses v10 capability keys and domain metadata

### Learning Path Generator (`server/learning/learningPathGenerator.ts`)

- Implements 70/20/10 learning model (70% experiential, 20% social, 10% formal)
- SM-2 spaced repetition scheduling with performance-driven ease factor adjustment
- Prerequisite sequencing and difficulty progression (L1→L5)
- Module recommendation scoring: gap severity × modality fit × difficulty match × role relevance
- Failure mode–targeted content routing (modules tagged with failure modes get boosted scores)

### Adaptive Learning tRPC Router

6 procedures: `getGapAnalysis`, `getAdaptivePlan`, `markModuleComplete`, `getSpacedRepetitionQueue`, `getModuleDetail`, `getProgress`

---

## 14. Test Suite

The v10 test suite comprises **391 tests across 19 test files**, all passing:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `scoringEngine.test.ts` | Core scoring engine unit tests |
| `scoring.v2-2.test.ts` | v2.2 scoring formula anchors, monotonicity, cross-capability isolation |
| `scoring.thin-signal.test.ts` | Thin-signal calibration (Workflow, Data Interpretation anchors A–D) |
| `scoring-config-overrides.test.ts` | Configurable threshold overrides (6 scoring_config fields) |
| `failure-modes.v2-2.test.ts` | Failure mode detection: two-item threshold, hybrid counting, downgrade vs block |
| `anti-gaming.outcome-conditional.test.ts` | Outcome-conditional anti-gaming pattern detection |
| `assessment-engine-improvements.test.ts` | Governance action, consistency penalty, governing constraint |
| `assessment.stress.test.ts` | Full session lifecycle, concurrent sessions, edge cases, blueprint validation |
| `debug.test.ts` | Debug utilities and diagnostic output |
| `confidence-floor.test.ts` | Three-threshold confidence model (20 regression tests) |
| `classification-explanation.test.ts` | Classification explanation: all 5 readiness states, permissions matrix |
| `save-resume.test.ts` | Save-and-resume lifecycle, model version pinning, session expiry |
| `llm-checkers.test.ts` | LLM quality gate: parallelism, sanity, construct alignment, bias, PII |
| `auth.logout.test.ts` | Authentication logout flow |
| `ail.test.ts` | Adaptive Intelligence Layer: 29 tests across 7 AIL modules |
| `waitlist.test.ts` | Beta waitlist: eligible/ineligible submissions |
| `backoffice.test.ts` | Back-office procedures |
| `assessment.test.ts` | Assessment router procedures |
| `dashboard.test.ts` | Dashboard router procedures |

### Test Migration

All 8 legacy test files were migrated from v9.2 to v10 as part of Phase 1. The migration involved:

- Updating all capability domain keys (execution → ai_interaction, etc.)
- Updating all signal keys to v10 canonical signals
- Updating all interaction type references
- Updating function signatures (computeSignalScores, computeCapabilityScores, classifyReadiness, detectFailureModes)
- Updating the FailureModeResult interface (pressureDriftDetected/pressureDriftMagnitude replacing hasBlockingFailure)
- Updating mock data to use v10 domain/signal mappings for proper foundation domain coverage

---

## 15. Platform Architecture Summary

### Server-Side Architecture

```
server/
├── _core/                    # Framework plumbing (OAuth, context, LLM, storage)
├── assessment/               # 12 engine modules
│   ├── scoringEngine.ts      # Signal system, scoring formula, failure modes, classification
│   ├── adaptiveEngine.ts     # Item generation, foundation-first routing, pressure-test
│   ├── antiGamingEngine.ts   # 14 pattern detectors, injection mechanic
│   ├── contradictionEngine.ts # Cross-domain contradiction detection
│   ├── sessionController.ts  # State machine, evidence sufficiency, session lifecycle
│   ├── classificationConfidenceGate.ts # Three-threshold confidence model
│   ├── llmQualityGate.ts     # Signal delta consistency, option plausibility, bias scan
│   ├── normEngine.ts         # Percentile computation (synthetic bootstrap)
│   ├── roleArchetypes.ts     # 16 role archetypes with v10 domain weights
│   ├── scoringConfig.ts      # Configuration versioning and DB-backed parameters
│   └── featureFlags.ts       # Feature flag definitions
├── ail/                      # 9 Adaptive Intelligence Layer modules
│   ├── userIntelligenceProfile.ts
│   ├── personaClassificationEngine.ts
│   ├── crossSimulationMemory.ts
│   ├── organisationContextLayer.ts
│   ├── narrativeEngine.ts
│   ├── emotionalDynamicsLayer.ts
│   ├── adaptiveDifficultyEngineV2.ts
│   ├── capabilityReport.ts
│   └── coldStart.ts
├── learning/                 # 2 learning engine modules
│   ├── gapAnalysisEngine.ts  # v10 capability gap analysis
│   └── learningPathGenerator.ts # 70/20/10 model, SM-2 spaced repetition
├── routers/                  # 16 tRPC routers
│   ├── assessment.ts         # Assessment session lifecycle
│   ├── adaptiveLearning.ts   # Learning prescription
│   ├── intelligence.ts       # AIL procedures
│   ├── dashboard.ts          # 5 role-specific dashboards
│   ├── backoffice.ts         # Super-admin operations
│   ├── waitlist.ts           # Beta programme
│   └── ... (auth, tenant, users, learning, simulation, scoring, policy, report, audit, content)
├── db.ts                     # Query helpers
├── routers.ts                # Router aggregation (18 routers)
└── storage.ts                # S3 file storage
```

### Client-Side Architecture

```
client/src/
├── pages/                    # 36 page components
│   ├── assessment/           # Assessment flow (landing, session, results)
│   ├── dashboard/            # 5 role-specific dashboards
│   ├── learning/             # Learning plan, module player, team dashboard
│   ├── marketing/            # Marketing page, beta application
│   ├── methodology/          # Assessment methodology disclosure
│   ├── simulation/           # Simulation list and session
│   ├── admin/                # Admin panels (blueprints, content, org context, tenants, users)
│   ├── backoffice/           # Super-admin back office
│   ├── auth/                 # Login, register, password reset
│   ├── onboarding/           # Onboarding wizard
│   └── ...
├── components/               # Reusable UI components (shadcn/ui based)
├── contexts/                 # React contexts (auth, theme)
├── hooks/                    # Custom hooks
├── lib/                      # tRPC client, utilities
└── App.tsx                   # Route definitions and layout
```

### Database Schema (76 tables)

Key table groups:

| Group | Tables | Purpose |
|-------|--------|---------|
| Core | tenants, tenant_settings, users, roles, user_roles | Multi-tenant user management |
| Assessment | assessment_blueprints, assessment_items, assessment_item_options, assessment_sessions, assessment_answers, assessment_scores, assessment_answer_telemetry, assessment_review_flags | Assessment lifecycle |
| Content | content_scenarios, content_scenario_options, content_scenario_anchors, content_failure_modes, content_tags, content_versions, content_items, content_item_tags, content_roles, content_workflows | Content library |
| AIL | ail_user_intelligence_profiles, ail_signal_ledger, ail_failure_mode_registry, ail_retest_queue, ail_persona_profiles, ail_org_context, ail_narrative_state, ail_stakeholder_relationships, ail_narrative_events, ail_narrative_threads, ail_difficulty_profiles | Adaptive Intelligence Layer |
| Learning | learning_modules, learning_module_tags, gap_analyses, adaptive_learning_plans, adaptive_plan_items, spaced_repetition_queue, module_personalisation_cache, formative_quiz_results, learning_streaks, manager_team_members | Learning prescription |
| Simulation | simulations, simulation_nodes, simulation_choices, simulation_transitions, simulation_sessions, simulation_session_events, simulation_results | Simulation engine |
| Configuration | scoring_config, organisation_capability_thresholds, anti_gaming_thresholds, sector_vocabulary, llm_item_review_queue | Engine configuration |
| Platform | beta_applications, policy_evaluations, admin_overrides, events, audit_logs, report_jobs | Platform operations |

---

## 16. Completed Work Items

### Phase 1 — v10 Rework (38 items, all complete)

| ID | Item | Status |
|----|------|--------|
| P1-1 | New 6-domain taxonomy | Done |
| P1-2 | New 26-signal system with signal-to-domain mapping | Done |
| P1-3 | Foundation vs Strategic domain classification | Done |
| P1-4 | Updated failure modes (4 blocking + 3 downgrade) | Done |
| P1-5 | Sum-and-clip scoring formula with v10 parameters | Done |
| P1-7 | 15 interaction types with LLM prompt templates | Done |
| P1-8 | Foundation-first routing | Done |
| P1-9 | Pressure-test mechanic with escalating constraints | Done |
| P1-12 | Rebuild all 11→16 archetype capability weights | Done |
| P1-13 | Update minimum safe thresholds per archetype | Done |
| P1-14 | 14 anti-gaming patterns (11 preserved + 3 new) | Done |
| P1-16 | Cross-domain contradiction pairs | Done |
| P1-17 | Five-state readiness classification (+ unknown_insufficient_evidence = 6) | Done |
| P1-18 | Three-level confidence staking | Done |
| P1-19 | Configuration versioning | Done |
| P1-20 | Update assessment tables for v10 | Done |
| P1-21 | Configuration versioning in DB | Done |
| P1-22 | Update session controller | Done |
| P1-23 | Update assessment router procedures | Done |
| P1-24 | Generate scenario content (40 scenarios, 160 options) | Done |
| P1-25 | Generate learning module content (72 modules) | Done |
| P1-26 | Update results page for new 6 domains | Done |
| P1-27 | Update dashboards for new domain names | Done |
| P1-28 | Three-level confidence staking UI | Done |
| P1-29 | Deterministic scoring tests | Done |
| P1-30 | Foundation gate behaviour tests | Done |
| P1-31 | Anti-gaming detection tests | Done |
| P1-32 | Pressure-test mechanic tests | Done |
| P1-33 | Quality gate validation tests | Done |
| P1-34 | Migrate all 8 legacy test files to v10 | Done |
| P1-35 | Full test suite green (391/391) | Done |
| P1-36 | Generate scenario module content (13 scenarios, 52 options) | Done |
| P1-37 | Update gapAnalysisEngine.ts to v10 capability keys | Done |
| P1-38 | Create Phase 1 Evolution Pause Document | Done |

### Not Started in Phase 1

| ID | Item | Status | Notes |
|----|------|--------|-------|
| P1-10 | Immersive scenario presentation formats | Not started | Email chains, Slack, dashboards, documents, meetings, HRIS |
| P1-11 | Narrative wrapper (fictional week) | Not started | Parameterised by participant profile |
| P1-15 | 3 learning-aware gaming patterns | Not started | target_gap_shaping, avoided_gap_shaping, threshold_margin_clustering |

---

## 17. Remaining Work Items

### From v2.1 Remediation (Deferred)

These items were identified in the v2.1 remediation cycle but deferred:

| Category | Items | Description |
|----------|-------|-------------|
| S1 — Score Transform Calibration | 5 items | scoring_config table migration, configurable intercept/multiplier, back-office admin tab |
| S2 — Confidence Floor | 5 items | unknown_insufficient_evidence state, diagnostic payload, narrative, UI |
| S3 — Governing Constraint | 4 items | governing_constraint field, results UI, narrative |
| S4 — Required Reasoning | 6 items | reasoning_required column, UI, server validation, confidence factor |
| S5 — Percentile Bands | 5 items | Replace precise percentiles with bands, provisional banner |
| S6 — Soften Governance Language | 4 items | Recommended language, remove "suspended"/"mandatory" |
| S7 — Structured Role Picker | 4 items | role_archetype_id column, RolePicker component |
| S8 — Baseline Sector Tagging | 4 items | sector_applicability, tool_agnostic, sector preference |
| S9 — AIL Persona Feature Flag | 4 items | persona_adaptation_enabled flag, gating threshold |
| S10 — Org-Configurable Thresholds | 5 items | organisation_capability_thresholds table, admin UI |
| S11 — Content Library Expansion | 6 items | 22 new items (8 prioritisation, 6 confidence_calibration, 4 error_detection, 4 output_improvement) |
| S12 — Documentation | 4 items | Architecture doc v2.1 update, changelog, PDF |

### From v2.2 Engine Remediation (Partially Complete)

| Category | Remaining Items | Description |
|----------|----------------|-------------|
| WS1 — Scoring | 8 items | contribution_cap/multiplier columns, sum+clip formula refactor, contribution_breakdown, classification explanation |
| WS2 — Anti-Gaming | 6 items | Feature flag, outcome-conditional detectors, role-aware thresholds, seniority suppression |
| WS3 — LLM Quality Gate | 10 items | Parallelism checker, sanity checker, construct alignment, bias scanner, review queue, circuit breaker |
| WS4 — Participant Experience | 10 items | Persona label softening, "Why this classification?" panel, review flags, save-and-resume |
| WS5 — Telemetry | 3 items | Telemetry table, frontend capture, session metadata |
| Cross-Cutting | 6 items | Multi-tenancy, permissions, WCAG, mobile, UK English, feature flags |

### From Adaptive Learning Improvements (Deferred)

| Improvement | Status | Description |
|-------------|--------|-------------|
| 1 — LLM-Personalised Content | Done | |
| 2 — Failure Mode Routing | Done | |
| 3 — Formative Micro-Assessments | Done | |
| 4 — Performance-Driven SR | Done | |
| 5 — Mastery-Gated Progression | Done | |
| 6 — Expanded Module Library | Done (76 modules) | |
| 7 — Contextual Learning Triggers | Done | |
| 8 — Manager Team Dashboard | Done | |
| 9 — Progress Streaks | Done | |
| 10 — Peer Benchmarking | Done | |

### Phase 1 Remaining (3 items)

| ID | Item | Priority | Description |
|----|------|----------|-------------|
| P1-10 | Immersive scenario formats | Medium | Email chains, Slack threads, dashboard screenshots, document excerpts, meeting transcripts, HRIS screens |
| P1-11 | Narrative wrapper | Medium | Fictional week at a mid-sized org, parameterised by participant profile |
| P1-15 | Learning-aware gaming patterns | Low | target_gap_shaping, avoided_gap_shaping, threshold_margin_clustering |

---

## 18. Gap Analysis Against Source Documents

This section provides an honest, item-by-item accounting of what is specified in the four source documents versus what is actually implemented. Items are rated as **Done**, **Partial** (some code exists but does not meet the specification), or **Not Done**.

### 18.1 AiQ Methodology v10.7 — Assessment Experience (§18)

| Ref | Specification | Status | Detail |
|-----|--------------|--------|--------|
| §18.1 | Immersive scenario presentation — email mockups, dashboard screenshots, meeting transcripts, policy documents rendered as visual artefacts | **Partial** | Assessment session renders text-based scenarios with multiple-choice options. No visual artefact rendering (email UI, Slack thread UI, HRIS screen mockups). |
| §18.2 | Narrative wrapper — fictional week at a mid-sized organisation, connecting all scenarios into a coherent story parameterised by participant profile | **Not Done** | Scenarios are presented independently without a connecting narrative thread. |
| §18.3 | Three-level confidence staking — tentative/confident/certain with distinct visual treatment and scoring weight | **Partial** | Confidence slider exists (0-1 continuous). The three-level staking mechanic with distinct UI treatment is partially implemented. |
| §18.4 | Save and resume — participants can pause and return | **Done** | Feature flag `isSaveAndResumeEnabled` and session state persistence implemented. |
| §18.5 | Post-completion reveal sequence — staged reveal (overall → domains → signals → recommendations) with narrative pacing | **Not Done** | Results page shows all scores simultaneously. No staged reveal or narrative pacing. |

### 18.2 AiQ Methodology v10.7 — Scoring & Classification (§6, §14)

| Ref | Specification | Status | Detail |
|-----|--------------|--------|--------|
| §6 | Sum-and-clip scoring formula with 28 signals across 6 domains | **Done** | `scoringEngine.ts` — fully implemented and tested. |
| §14.1 | Five readiness states: safe, at_risk, unsafe, foundation_gap, unknown | **Done** | `classifyReadiness` in `scoringEngine.ts`. |
| §14.2 | Confidence-gated classification with three thresholds | **Done** | `classificationConfidenceGate.ts`. |
| §14.3 | Failure mode blocking/downgrade logic | **Done** | 4 blocking + 2 downgrade modes in `detectFailureModes`. |

### 18.3 AiQ Reporting & Analytics v2.3 — Participant Dashboard (§2)

| Ref | Specification | Status | Detail |
|-----|--------------|--------|--------|
| §2.1 | Capability snapshot — radar chart, readiness badge, domain scores | **Done** | LearnerDashboard shows radar chart, readiness badge, capability scores with v10 keys. |
| §2.2 | Scenario callbacks — "In scenario X, you chose Y — here's what that reveals" reflection cards | **Not Done** | No scenario callback cards on participant dashboard. |
| §2.3 | Three prioritised next steps with action buttons | **Partial** | Learning plan link exists. Missing specific three prioritised next steps. |
| §2.4 | Confidence-calibration reflection — where confidence matched/mismatched performance | **Not Done** | No confidence calibration reflection panel. |

### 18.4 AiQ Reporting & Analytics v2.3 — Manager Dashboard (§3)

| Ref | Specification | Status | Detail |
|-----|--------------|--------|--------|
| §3.1.1 | Development view — individual development trajectory for each team member | **Partial** | Team member table with scores exists. No individual trajectory visualisation. |
| §3.1.2 | Delegation tiers — full autonomy / supervised / restricted / blocked per team member | **Not Done** | No delegation tier recommendations. |
| §3.1.3 | Suggested conversations — coaching prompts generated from assessment data | **Not Done** | No conversation starters or coaching prompts. |
| §3.1.4 | Misuse friction indicators — where team members may be misusing AI tools | **Not Done** | No misuse friction indicators. |

### 18.5 AiQ Reporting & Analytics v2.3 — HR/CPO Dashboard (§4)

| Ref | Specification | Status | Detail |
|-----|--------------|--------|--------|
| §4.1.1 | Organisational capability heatmap with department/function drill-down | **Partial** | HR dashboard has capability bar charts. No full heatmap with drill-down. |
| §4.1.2 | Risk register with access controls and escalation workflows | **Partial** | Risk scores and policy evaluations exist. No structured risk register with access controls. |
| §4.3 | Risk register audit trail | **Partial** | Audit log table exists. No risk-register-specific audit trail. |
| §5.3 | Foundation Gap organisational view — which teams have foundation gaps | **Not Done** | Foundation gap state exists in classification but no dedicated organisational view. |
| §13.4 | Regulatory Readiness view — compliance posture against UK AI regulations | **Not Done** | No regulatory readiness panel. |

### 18.6 AiQ Reporting & Analytics v2.3 — Configuration & Compliance (§11-14)

| Ref | Specification | Status | Detail |
|-----|--------------|--------|--------|
| §11.2 | Company AI Context capture — AI tools inventory, deployment maturity, governance framework status | **Partial** | `OrgContextPage` admin page exists with basic fields. Missing structured onboarding block. |
| §11.3 | Capability Requirement Translation Engine — map org AI tools to required capabilities | **Not Done** | No translation engine. |
| §12.2 | Configuration onboarding flow — 30-45 min structured capture with 6 blocks | **Partial** | Basic 4-step personal onboarding wizard exists. Not the full org-level structured capture. |
| §12.3 | Quarterly re-verification flow — scheduled re-assessment prompting | **Not Done** | No re-verification scheduling. |
| §13 | UK Regulatory Context capture and translation | **Not Done** | No regulatory context capture. |
| §14 | Small HR Function Mode — simplified mode for organisations with <50 employees | **Not Done** | No simplified mode. |

### 18.7 AiQ Reporting & Analytics v2.3 — Reporting (§6, §16)

| Ref | Specification | Status | Detail |
|-----|--------------|--------|--------|
| §6 | Trajectory reporting — improving/stable/declining across multiple assessments | **Partial** | Trend field exists in types. No multi-assessment trajectory visualisation. |
| §16.4 | Dual-audience technical narrative | **Partial** | Results page has softened language (S6 labels). No full technical narrative. |
| §16.5 | Dual-audience executive narrative | **Not Done** | No executive-audience report generation. |

### 18.8 AiQ Adaptive Learning v1.0 (§2-5)

| Ref | Specification | Status | Detail |
|-----|--------------|--------|--------|
| §2.2 | Learning Prescription Engine — 4-stage logic (immediate intervention → targeted development → consolidation → mastery pathway) | **Partial** | Gap analysis engine and learning path generator exist. Not the full 4-stage prescription logic. |
| §3 | Module architecture — 8 modalities across 5 difficulty levels | **Done** | 72 modules seeded across 8 modalities and 5 difficulty levels. |
| §3.4 | Module engagement telemetry — time-on-task, interaction depth, completion quality | **Partial** | Basic progress tracking exists. No detailed engagement telemetry. |
| §4 | Transfer finding framework — measuring whether learning translated to behaviour change | **Not Done** | No transfer finding assessment. |
| §4.1 | Learning Pathway UI on participant dashboard | **Partial** | LearningPlanPage exists as separate page. Not integrated into participant dashboard as primary panel. |
| §4.3 | No-transfer reporting — modules that failed to produce behavioural transfer | **Not Done** | No no-transfer reporting. |
| §5 | Learning-aware reassessment mode — reassessment that accounts for completed learning | **Not Done** | No learning-aware reassessment. |

---

## 19. Summary Scorecard

| Phase | Scope | Done | Partial | Not Done | Completion |
|-------|-------|------|---------|----------|------------|
| Phase 1 — Foundations | 16 items | 15 | 1 | 0 | **94%** |
| Phase 2 — Assessment Experience (§18) | 5 items | 1 | 2 | 2 | **30%** |
| Phase 2 — Participant Dashboard (§2) | 4 items | 1 | 1 | 2 | **25%** |
| Phase 2 — Manager Dashboard (§3) | 4 items | 0 | 1 | 3 | **6%** |
| Phase 2 — HR/CPO Dashboard (§4-5) | 5 items | 0 | 3 | 2 | **15%** |
| Phase 2 — Config & Compliance (§11-14) | 6 items | 0 | 2 | 4 | **8%** |
| Phase 2 — Reporting (§6, §16) | 3 items | 0 | 2 | 1 | **17%** |
| Phase 3 — Learning Layer (AL §2-5) | 7 items | 1 | 3 | 3 | **21%** |
| **Overall** | **50 items** | **18** | **15** | **17** | **~51%** |

The platform has a solid Phase 1 foundation with comprehensive test coverage (391/391 passing). The primary gap is in Phase 2 user-facing features — particularly the assessment experience refinements (narrative wrapper, reveal sequence), manager/HR dashboard depth (delegation tiers, suggested conversations, heatmap), and reporting sophistication (dual-audience narrative, regulatory readiness, capability-to-requirement fit) specified in the source documents.

---

## 20. Known Technical Gaps and Risks

### Technical Gaps

1. **Norm data is synthetic.** All percentile benchmarks are based on synthetic bootstrap distributions, not real assessment data. A norm data collection mechanism is needed to replace synthetic norms as real completions accumulate.

2. **No real-world calibration.** The scoring formula parameters (intercept=50, scale factor, outcome modifiers) have been calibrated against synthetic anchor cases but not against real participant data. A calibration cycle with real data is required before production deployment.

3. **LLM dependency.** The adaptive engine relies on LLM generation for scenario items. LLM failures fall back to static items, but the quality and diversity of the assessment degrades without LLM availability.

4. **Content volume.** While 53+ scenarios and 72 learning modules provide a solid foundation, production deployment to large organisations will require content expansion to prevent item repetition across multiple assessment sessions.

5. **Human review queue has no UI.** The quality gate flags items for human review but no reviewer interface exists to process the queue.

6. **Report router is basic.** Only 4 report types exist. No dual-audience narrative, no regulatory readiness, no capability-to-requirement fit.

### Architectural Risks

1. **v9.2 → v10 data compatibility.** Any existing v9.2 assessment data (sessions, scores, answers) uses old capability keys. A data migration strategy is needed if historical data must be preserved.

2. **Feature flag coverage.** Several v2.2 features are gated behind feature flags but the flags are not yet configurable via the back-office UI.

3. **Multi-tenancy enforcement.** While all tables have `tenant_id` columns, not all tRPC procedures enforce tenant isolation at the procedure level. A systematic audit is needed.

4. **No rate limiting on auth endpoints.** Login, register, and password reset have no rate limiting.

5. **No email notifications.** Password reset returns token in response rather than sending email.

---

## 21. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Apr 24, 2026 | Map v9.2 domains to v10 domains 1:1 rather than restructuring | Preserves existing scoring infrastructure, role archetype weights, and test coverage |
| Apr 24, 2026 | Keep 26 signals (not reduce to 22 as in v9.2) | More signals per domain enables finer-grained measurement, especially for the 7-signal AI Output Evaluation domain |
| Apr 24, 2026 | Foundation domains = AI Interaction + AI Output Evaluation | These are prerequisite skills — you must be able to talk to AI and evaluate its output before you can design workflows or lead change |
| Apr 24, 2026 | Preserve sum-and-clip formula from v2.2 | Formula was extensively calibrated and tested; changing it would invalidate all anchor tests |
| Apr 24, 2026 | Three-level confidence staking (tentative/confident/certain) | Simpler than 4-point slider, maps cleanly to calibration index computation |
| Apr 24, 2026 | 6 readiness states including foundation_gap | Distinguishes "you haven't demonstrated foundation skills" from "you demonstrated them poorly" |
| Apr 24, 2026 | Pressure-test mechanic targets AI Ethics domain | Ethics under pressure is the highest-stakes capability for HR professionals working with AI |
| Apr 24, 2026 | 72 learning modules (12 per domain) | Provides sufficient variety for the 70/20/10 learning model across all difficulty levels and modalities |

---

## 22. Appendix A — File Inventory

### Assessment Engine (12 files)

| File | Lines | Purpose |
|------|-------|---------|
| `server/assessment/scoringEngine.ts` | ~750 | Signal system, scoring formula, failure modes, classification |
| `server/assessment/adaptiveEngine.ts` | ~730 | Item generation, foundation-first routing, pressure-test |
| `server/assessment/antiGamingEngine.ts` | ~400 | 14 pattern detectors, injection mechanic |
| `server/assessment/contradictionEngine.ts` | ~350 | Cross-domain contradiction detection |
| `server/assessment/sessionController.ts` | ~300 | State machine, evidence sufficiency |
| `server/assessment/classificationConfidenceGate.ts` | ~150 | Three-threshold confidence model |
| `server/assessment/llmQualityGate.ts` | ~250 | Signal delta consistency, option plausibility |
| `server/assessment/normEngine.ts` | ~200 | Percentile computation |
| `server/assessment/roleArchetypes.ts` | ~400 | 16 role archetypes with v10 weights |
| `server/assessment/scoringConfig.ts` | ~100 | Configuration versioning |
| `server/assessment/featureFlags.ts` | ~50 | Feature flag definitions |

### Test Files (19 files, 391 tests, ~5,300 lines)

| File | Focus |
|------|-------|
| `scoringEngine.test.ts` | Core scoring unit tests |
| `scoring.v2-2.test.ts` | v2.2 anchor cases and monotonicity |
| `scoring.thin-signal.test.ts` | Thin-signal calibration |
| `scoring-config-overrides.test.ts` | Configurable thresholds |
| `failure-modes.v2-2.test.ts` | Failure mode detection |
| `anti-gaming.outcome-conditional.test.ts` | Anti-gaming patterns |
| `assessment-engine-improvements.test.ts` | Governance, consistency, constraints |
| `assessment.stress.test.ts` | Full session lifecycle stress |
| `debug.test.ts` | Debug utilities |
| `confidence-floor.test.ts` | Three-threshold confidence |
| `classification-explanation.test.ts` | Classification explanation |
| `save-resume.test.ts` | Save-and-resume lifecycle |
| `llm-checkers.test.ts` | LLM quality gate |
| `auth.logout.test.ts` | Authentication |
| `ail.test.ts` | Adaptive Intelligence Layer |
| `waitlist.test.ts` | Beta waitlist |
| `backoffice.test.ts` | Back-office procedures |
| `assessment.test.ts` | Assessment router |
| `dashboard.test.ts` | Dashboard router |

---

**End of Phase 1 Evolution Pause Document**
