# AiQ Platform — Architecture and Methodology

**Document type:** Technical reference for AI-assisted development context  
**Version:** `136475b3` (24 April 2026)  
**Purpose:** Provides Claude (or any AI collaborator) with accurate, code-verified context about the AiQ platform so that subsequent development conversations are grounded in the actual implementation rather than assumptions.

---

## 1. What AiQ Is

AiQ is an **Enterprise HR Capability Intelligence Platform** that measures, classifies, and develops the AI capability of HR professionals. It is not a generic LMS or competency framework tool. Its core claim is that it can distinguish between HR practitioners who *understand* AI and those who merely *appear to* — using a psychometrically-grounded adaptive assessment engine, not self-report surveys.

The platform is live at [hraiq.co.uk](https://hraiq.co.uk) and is in a closed beta programme limited to 25 organisations.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19 + Vite + Tailwind CSS 4 | SPA with client-side routing via Wouter |
| UI components | shadcn/ui + Radix UI | Customised with AiQ brand tokens |
| API layer | tRPC 11 + Superjson | End-to-end type safety; no REST routes |
| Backend | Node.js + Express 4 | tRPC mounted at `/api/trpc` |
| Database | MySQL / TiDB (via Drizzle ORM) | 87 tables; schema-first migrations |
| Auth | Manus OAuth + JWT session cookies | `protectedProcedure` / `adminProcedure` guards |
| LLM integration | `invokeLLM()` helper (server-side only) | Used for item generation and narrative |
| File storage | S3-compatible via `storagePut()` / `storageGet()` | No local file storage |
| Testing | Vitest | 428 tests across 20 test files |
| Language | TypeScript throughout | 0 compilation errors |

The project root is `/home/ubuntu/aiq-platform`. Key directories:

```
server/
  assessment/          ← All assessment engine modules
  learning/            ← Gap analysis + learning path generator
  routers/             ← 19 tRPC router files
  _core/               ← Auth, context, LLM, storage helpers
drizzle/
  schema.ts            ← Single source of truth for all 87 tables
client/src/
  pages/               ← 37 page components across 9 feature areas
  components/          ← Shared UI including DashboardLayout, AIChatBox
```

---

## 3. Capability Taxonomy

The entire platform is built around a **six-domain capability taxonomy** for HR AI capability. All scoring, assessment, learning, and reporting is anchored to these six domains.

| Domain | Key | Type | Description |
|--------|-----|------|-------------|
| AI Interaction | `ai_interaction` | Foundation | Prompting quality, iteration, tool fluency |
| AI Output Evaluation | `ai_output_evaluation` | Foundation | Error detection, bias identification, fitness-for-purpose judgement |
| AI Workflow Design | `ai_workflow_design` | Operational | Workflow redesign, human-AI handoff design, oversight preservation |
| Workforce AI Readiness | `workforce_ai_readiness` | Strategic | Capability diagnosis, intervention design, leader advisory |
| AI Ethics & Employee Trust | `ai_ethics_trust` | Strategic | Ethics under pressure, transparency, legal vs fair distinction |
| AI Change Leadership | `ai_change_leadership` | Strategic | Resistance response, legitimate concern recognition, change pace calibration |

**Foundation-first routing** is enforced: the assessment engine will not probe Strategic domains until the two Foundation domains (`ai_interaction`, `ai_output_evaluation`) have received at least three signal contributions each. A `foundation_gap` readiness state is issued if Foundation domains are below threshold.

### 3.1 Signal System

Each domain is measured through **named behavioural signals** — 28 signals in total across the six domains. Signals are the atomic unit of evidence; they are not directly observable but are inferred from how a participant responds to assessment items.

| Domain | Signals |
|--------|---------|
| AI Interaction (4) | `prompt_construction_quality`, `prompt_iteration_quality`, `output_direction_skill`, `tool_fluency_index` |
| AI Output Evaluation (7) | `output_evaluation_quality`, `error_detection_accuracy`, `fitness_for_purpose_judgement`, `blind_acceptance_risk`, `hallucination_acceptance_risk`, `bias_detection_skill`, `data_interpretation_quality` |
| AI Workflow Design (4) | `workflow_redesign_quality`, `handoff_design_quality`, `human_oversight_preservation`, `automation_expansion_risk` |
| Workforce AI Readiness (4) | `capability_diagnosis_accuracy`, `intervention_design_quality`, `leader_advisory_quality`, `generic_prescription_risk` |
| AI Ethics & Employee Trust (5) | `ethics_under_pressure`, `stakeholder_impact_awareness`, `employee_transparency_advocacy`, `pressure_drift_risk`, `legal_vs_fair_distinction` |
| AI Change Leadership (4) | `resistance_response_quality`, `legitimate_concern_recognition`, `change_pace_calibration`, `dismissive_of_concern_risk` |

Six signals are designated **risk signals** (prefixed `*_risk`): `blind_acceptance_risk`, `hallucination_acceptance_risk`, `automation_expansion_risk`, `generic_prescription_risk`, `pressure_drift_risk`, `dismissive_of_concern_risk`. These signals carry asymmetric risk multipliers — negative deltas on risk signals are penalised more heavily than positive deltas are rewarded.

---

## 4. Assessment Engine Architecture

The assessment engine is composed of six cooperating modules, all located in `server/assessment/`.

### 4.1 Session Controller (`sessionController.ts`)

The `SessionController` class is the orchestration layer. It computes the current `SessionState` from the full answer history on every item submission. Key responsibilities:

- **Phase determination:** Sessions progress through three phases based on `answeredCount / totalTarget` — `baseline` (0–30%), `adaptive` (30–75%), `validation` (75–100%).
- **Evidence sufficiency:** Checks that the session has collected the minimum evidence required to permit classification: ≥20 total items, ≥3 signal contributions per capability domain, ≥5 distinct interaction types, ≥25% high-risk items.
- **Role-aware thresholds:** When a `userRoleHint` is provided, the `SessionController` resolves the user's `RoleArchetype` and applies that archetype's `minimumSafeThresholds` instead of global defaults. For example, an HRBP requires ≥3 signals in `workforce_ai_readiness`, `ai_ethics_trust`, and `ai_change_leadership` before evidence is considered sufficient.
- **Contradiction tracking:** Delegates to the `ContradictionEngine` and records the count and penalty.
- **Gaming scrutiny:** Delegates to the `AntiGamingEngine` and records the current `scrutinyLevel`.

### 4.2 Adaptive Engine (`adaptiveEngine.ts`)

The adaptive engine selects the **generation variables** for the next item and then calls the LLM to generate the item in real time. It is fully LLM-driven — there is no pre-authored item bank for the adaptive phase.

**Generation variables** include: target capability domain, interaction type, difficulty level (1–3), risk level (Low/Medium/High/Critical), scenario context (role, sector, AI tool, workflow), and any injection specification from the anti-gaming engine.

**Interaction types (15 in v10):**

| Category | Types |
|----------|-------|
| Preserved from v9.2 | `scenario_critique`, `error_detection`, `risk_judgement`, `confidence_calibration` |
| New in v10 | `prompt_diagnosis`, `prompt_construction`, `process_redesign`, `handoff_decision`, `capability_diagnosis`, `intervention_design`, `leader_advisory`, `ethical_pressure_test`, `stakeholder_impact`, `resistance_response`, `legitimate_concern` |
| Cross-cutting | `contradiction_probe` |

Five interaction types are **required** to appear at least once per session: `scenario_critique`, `risk_judgement`, `prompt_diagnosis`, `ethical_pressure_test`, `contradiction_probe`. The engine tracks usage and forces required types before the validation phase ends.

**Foundation-first routing:** During the baseline phase, the engine selects only Foundation domain items until each Foundation domain has ≥3 signal contributions. Strategic domains are unlocked only after this gate is passed.

**Pressure-test mechanic:** For `ai_ethics_trust` items, the engine applies escalating constraint pressure — each successive ethics item increases the organisational or managerial pressure framing, making it progressively harder to maintain an ethical position.

### 4.3 Scoring Engine (`scoringEngine.ts`)

The scoring engine converts raw answer data into capability scores and a readiness classification.

**Score computation formula:**

```
capability_score = intercept(50) + clip(Σ weighted_deltas, -40, +40) × contribution_multiplier
```

Each answer contributes signal deltas. Deltas are **unsigned magnitudes** — direction is encoded by the `outcome_class` of the selected option, not by the sign of the delta. The `outcome_class` multiplier converts the unsigned delta into a signed contribution:

| Outcome Class | Multiplier |
|---------------|-----------|
| `strong` | +1.0 |
| `acceptable` | +0.5 |
| `weak` | −0.5 |
| `failure` | −1.0 |
| `critical_failure` | −1.5 |

Before applying the outcome multiplier, each delta is weighted by the item's **risk multiplier** and **difficulty weight**:

| Risk Level | Positive multiplier | Negative multiplier |
|------------|--------------------|--------------------|
| Low | 1.00× | 1.00× |
| Medium | 1.00× | 1.15× |
| High | 1.30× | 1.50× |
| Critical | 1.30× | 1.60× |

| Difficulty | Weight |
|-----------|--------|
| Level 1 | 1.0× |
| Level 2 | 1.3× |
| Level 3 | 1.6× |

**Capability score bands:**

| Band | Score range |
|------|------------|
| `strong` | ≥75 |
| `developing` | 55–74 |
| `needs_work` | 35–54 |
| `critical` | <35 |

### 4.4 Readiness Classification

The `classifyReadiness()` function maps capability scores to one of six readiness states:

| State | Label | Trigger condition |
|-------|-------|------------------|
| `safe` | AI-Ready | Overall ≥75, all domains assessed, no threshold failures, risk band low/medium |
| `at_risk` | Developing | Failure mode downgrade, or high risk band, or ≥1 critical threshold failure |
| `unsafe` | Not Yet Ready | Failure mode block, or ≥2 critical threshold failures, or high risk + overall <45 |
| `foundation_gap` | Foundation Capability In Progress | Foundation domain below threshold gate |
| `unknown` | Assessment In Progress | Evidence not yet sufficient |
| `unknown_insufficient_evidence` | More Evidence Needed | Composite confidence below provisional threshold (0.40) |

The **governing constraint** is computed for every non-`safe` classification: the capability domain with the largest gap from its role-specific threshold is identified and surfaced as the primary driver of the classification. This is exposed in the results UI and in the classification explanation API.

**Confidence gating:** A `compositeConfidence` score (0–1) is computed from five factors: evidence depth, evidence breadth, interaction diversity, risk coverage, and response consistency. If `compositeConfidence < 0.40`, the result is withheld entirely. If `0.40 ≤ compositeConfidence < 0.50`, the result is issued as provisional. A `safe` classification requires `compositeConfidence ≥ 0.55` — a false safe result is treated as the highest-stakes error.

### 4.5 Contradiction Engine (`contradictionEngine.ts`)

The contradiction engine detects four types of inconsistency:

- **Within-capability:** Strong answer in one item, failure answer in another item for the same capability.
- **Cross-capability:** Inconsistency between paired domains (Ethics ↔ Workflow Design; Output Evaluation ↔ Interaction; Workforce Readiness ↔ Change Leadership).
- **Time-pressure:** Inconsistent responses between low-pressure and high-pressure variants of the same scenario.
- **Calibration:** High stated confidence on items where the selected option was `failure` or `critical_failure`.

When contradictions are detected, the engine generates a `ContradictionProbeSpec` — a targeted follow-up item designed to resolve the inconsistency. Up to three contradiction probes are injected per session (raised from two when `scrutinyLevel = "high"`). Unresolved contradictions apply a `confidencePenalty` multiplier (0–1) to the composite confidence score.

### 4.6 Anti-Gaming Engine (`antiGamingEngine.ts`)

The anti-gaming engine detects 14 gaming patterns:

**Preserved from v9.2 (11):** `always_safe_choice`, `always_escalate`, `always_cautious`, `option_position_bias`, `speed_gaming`, `inconsistent_responses`, `polished_shallow`, `pattern_cycling`, `outcome_cycling`, `outcome_conditional_safe`, `seniority_inconsistent`.

**New in v10 (3):** `ethics_performative` (strong ethics language but weak ethical action under pressure), `advisory_generic` (generic advisory responses without role specificity), `resistance_dismissive` (dismisses legitimate employee concerns about AI).

Speed thresholds are **per interaction type** — a `scenario_critique` item requires at least 12 seconds; a `confidence_calibration` item requires at least 8 seconds. Speed gaming on high-risk items triggers immediate scrutiny escalation.

When gaming is detected, the engine generates `InjectionSpec` objects — trap items, clean cases, comparable scenarios, or format variations — which are passed to the adaptive engine to generate the next item.

---

## 5. Content System

### 5.1 Pre-authored Content Library

The baseline phase of each assessment draws from a pre-authored content library stored in the database. This library contains:

| Table | Count |
|-------|-------|
| `content_scenarios` | 110 scenarios |
| `content_scenario_options` | 424 options |
| `content_roles` | 22 HR roles across 8 families |
| `content_workflows` | 13 workflow domains |
| `content_failure_modes` | 10 AI failure types |
| `content_tags` | 34 tags |

Scenarios are tagged with `sector_applicability` (general, `financial_services`, `healthcare`, `public_sector`) and `tool_agnostic` (boolean). The baseline selector prefers sector-matching or tool-agnostic scenarios when an organisation profile is available.

**Sector-specific families (35 scenarios):**

| Sector | Count | Governance focus |
|--------|-------|-----------------|
| Financial Services | 12 | FCA Consumer Duty, algorithmic bias, credit decisioning |
| Healthcare | 12 | NHS AI governance, clinical AI oversight, patient data |
| Public Sector | 11 | GDPR Article 22, judicial independence, child protection |

### 5.2 LLM-Generated Items (Adaptive Phase)

From item 15 onwards (adaptive phase), all items are generated in real time by the LLM using the `generateAdaptiveItem()` function. The LLM prompt includes:

- The user's role archetype, seniority, sector, and AI usage patterns.
- The current capability gap profile (which domains are under-evidenced).
- The selected interaction type and its structural requirements.
- The organisation context block (sector, named AI tools, regulatory regime).
- Any injection specification from the anti-gaming engine.
- Any contradiction probe specification from the contradiction engine.

Generated items are reviewed asynchronously by the `llm_item_review_queue` table and can be flagged for human review.

### 5.3 Role Architecture

11 role archetypes are defined in `server/assessment/roleArchetypes.ts`:

| Archetype | Family | Seniority | Governance sensitivity |
|-----------|--------|-----------|----------------------|
| `hrbp` | Business Partnering | Senior | High |
| `hr_generalist` | Generalist | Mid | Medium |
| `hr_advisor` | Advisory | Mid | High |
| `talent_acquisition` | Talent | Mid | Medium |
| `learning_development` | L&D | Mid | Medium |
| `reward_specialist` | Reward | Senior | Medium |
| `hr_analytics` | Analytics | Senior | High |
| `hr_director` | Leadership | Lead | Critical |
| `people_ops` | Operations | Mid | Low |
| `change_manager` | Change | Senior | High |
| `er_specialist` | Employee Relations | Senior | Critical |

Each archetype carries: capability weights (summing to 1.0), minimum safe thresholds per domain, typical workflows, gaming family, decision authority, risk exposure, AI usage patterns, and scenario context tags.

---

## 6. Adaptive Learning Engine

### 6.1 Gap Analysis (`server/learning/gapAnalysisEngine.ts`)

After an assessment is completed, the gap analysis engine computes a `GapAnalysisResult` by comparing each capability score against role-level benchmarks. Severity bands:

| Band | Condition |
|------|-----------|
| `critical` | Score <50 OR gap >25 points below benchmark |
| `developing` | Gap 10–25 points below benchmark |
| `proficient` | Gap <10 points below benchmark |
| `advanced` | Score ≥ benchmark + 5 |

### 6.2 Learning Path Generator (`server/learning/learningPathGenerator.ts`)

The learning path generator implements a **4-Stage Prescription Engine**:

| Stage | Priority | Content |
|-------|----------|---------|
| 1 | Highest | Block resolution — modules targeting blocking failure modes (`blind_acceptance`, `hallucination_acceptance`, `critical_failure`) |
| 2 | High | Foundation before strategy — Foundation domain gaps addressed before Strategic domain gaps; `foundation_gap` state stops here |
| 3 | Medium | Regulatory and operational urgency — UK regulatory requirements before strategic development |
| 4 | Standard | Strategic development — remaining gaps ordered by gap magnitude × role weight × strategic importance |

Each plan item carries a structured `reasonJson` explaining: the capability gap it addresses, the gap severity, why this modality was chosen, the role relevance, the difficulty rationale, and the prescription stage.

**Modalities supported:** `tutorial`, `video`, `quiz`, `reflection`, `coaching`, `practical`, `case_study`, `scenario`.

**Transfer evidence tracking:** Each module completion records a `completionState` (`not_started | opened | partial | completed | completed_with_engagement`). If a module is completed but the subsequent assessment shows no improvement in the targeted capability, a `no_transfer` finding is recorded. After two no-transfer findings, the plan triggers an `honest_disclosure` — informing the learner that the module may not be the right fit.

**Spaced repetition:** The `spaced_repetition_queue` table tracks each module's next review date using an ease factor (SM-2 algorithm variant). Performance scores from formative quizzes update the ease factor.

### 6.3 Learning Nudges

The `learning_nudges` table stores manager-initiated nudges directing team members to specific modules. Nudged modules appear in the learner's plan with a "Recommended by [Manager name]" badge.

---

## 7. Organisation Context System

The organisation context system (`server/routers/organisation.ts`) allows the assessment engine to personalise items and scoring to a specific organisation's context.

The `organisation_profiles` table stores: sector, named AI tools in use, regulatory regime, organisation size, and maturity level. The `organisation_capability_thresholds` table allows organisations to set capability thresholds that override (raise) the archetype defaults — ensuring that high-risk sectors can enforce stricter minimum safe thresholds.

When an assessment session starts, the organisation profile is loaded into the session context and injected into the LLM prompt template as an **organisation context block**, making scenario details (tool names, regulatory references, sector-specific constraints) concrete rather than generic.

---

## 8. Norm Engine (`server/assessment/normEngine.ts`)

Every capability score is contextualised against a **norm group** — a reference distribution parameterised by role family × seniority tier × domain. The current norm group version is `synthetic-v2`, which uses synthetic bootstrap distributions derived from the scoring model's expected range.

Distributions are normal approximations (mean, stdDev) from which percentile is computed analytically using the error function. The norm group version is stamped on every result for traceability. Real empirical norms will replace the synthetic distributions once 200+ completions per role family × seniority tier are available.

---

## 9. Governance and Audit

### 9.1 Decision Trace Logging

Every classification decision is recorded to the `decision_logs` table with a full precedence hierarchy: which capability triggered the governing constraint, which failure modes were detected, what the composite confidence was, and what governance action was recommended.

### 9.2 Classification Explanation

The `getClassificationExplanation` procedure returns a structured explanation of why a participant received their classification, including:

- The governing constraint (the capability domain that drove the classification).
- Item-level citations: for each contributing assessment answer, the scenario reference, the option selected, its outcome class, and the signal contribution it made.
- The confidence diagnostic: which confidence factors were weakest and what actions would improve reliability.

This is designed to satisfy GDPR Article 22 requirements for meaningful information about automated decision-making.

### 9.3 Policy Rules Engine

The `policy_rules` table supports five action types: `hard_block`, `warning`, `remediation_trigger`, `escalate`, `force_revalidation`. Policy evaluations are recorded to `policy_evaluations` with the full rule match context. Admin overrides are recorded to `admin_overrides` with the overriding user, reason, and timestamp.

### 9.4 Revalidation Schedules

The `revalidation_schedules` table tracks when each user's assessment result expires. Cadence is 30/60/90 days by risk band. A countdown is surfaced on the Learner Dashboard.

---

## 10. tRPC API Surface

The application exposes 19 tRPC routers:

| Router | Key procedures |
|--------|---------------|
| `auth` | `register`, `login`, `logout`, `me`, `forgotPassword`, `resetPassword` |
| `assessment` | `getSession`, `generateItem`, `submitAnswer`, `completeSession`, `getResults`, `getClassificationExplanation` |
| `adaptiveLearning` | `getAdaptivePlan`, `generateAdaptivePlan`, `markModuleComplete`, `submitFormativeQuiz`, `getLearningStreaks`, `nudgeTeamMember` |
| `organisation` | `getProfile`, `upsertProfile`, `getCapabilityThresholds`, `upsertCapabilityThreshold` |
| `dashboard` | `getLearnerDashboard`, `getManagerDashboard`, `getHRDashboard`, `getAdminDashboard` |
| `content` | `listScenarios`, `getScenario`, `createScenario`, `updateScenario`, `listModules`, `getModule` |
| `intelligence` | `getUserIntelligenceProfile`, `getNarrativeState`, `getPeerBenchmarks` |
| `simulation` | `listSimulations`, `startSession`, `submitChoice`, `getResults` |
| `scoring` | `getCapabilityScores`, `getConfidenceProfile`, `getFailureModes` |
| `policy` | `listRules`, `evaluatePolicy`, `createOverride` |
| `report` | `generateReport`, `getReportJob`, `downloadReport` |
| `audit` | `listEvents`, `getDecisionTrace` |
| `backoffice` | `getScoringConfig`, `updateScoringConfig`, `getAntiGamingThresholds` |
| `waitlist` | `apply`, `listApplications`, `updateStatus` |
| `users` | `list`, `create`, `update`, `suspend`, `activate` |
| `tenant` | `getCurrent`, `updateSettings` |
| `learning` | `getLearningPlan`, `getContentLibrary`, `markProgress` |
| `system` | `notifyOwner`, `healthCheck` |
| `organisation` | `getProfile`, `upsertProfile`, `getThresholds` |

All procedures use `protectedProcedure` (requires authenticated session) or `publicProcedure`. Admin-only operations use an inline `adminProcedure` pattern that checks `ctx.user.role === "admin"`.

---

## 11. Frontend Architecture

### 11.1 Page Structure

The frontend has 37 page components organised into 9 feature areas:

| Area | Pages |
|------|-------|
| Auth | Login, Register, ForgotPassword, ResetPassword |
| Dashboard | Learner, Manager, HR, Admin, Auditor |
| Assessment | AssessmentPage (landing), AssessmentSessionPage, AssessmentResultsPage |
| Learning | LearningPlanPage, ModulePlayerPage, ContentLibraryPage, TeamDashboardPage, TeamLearningPage |
| Simulation | SimulationListPage, SimulationSessionPage |
| Admin | UsersPage, TenantsPage, OrganisationsPage, ContentCMSPage, AssessmentContentPage, AssessmentBlueprintsPage, OrgContextPage |
| Governance | AuditLogPage, PolicyPage |
| Reports | ReportsPage |
| Marketing | MarketingPage, BetaApplicationPage, MethodologyPage |

### 11.2 Assessment Session UI

The `AssessmentSessionPage` renders 15 distinct interaction type formats:

- **Scenario critique / Error detection:** AI output block displayed above the question, requiring the participant to identify errors or critique the output.
- **Prompt diagnosis / construction:** Prompt/conversation context block displayed; participant diagnoses or constructs a prompt.
- **Capability diagnosis:** Data/table context block displayed; participant interprets capability data.
- **Ethical pressure test:** Escalating constraint framing; participant must maintain ethical position under increasing pressure.
- **Contradiction probe:** Targeted follow-up referencing a specific prior answer.
- All other types: Standard scenario + constraint + question + four options layout.

All types include: a confidence slider (Guessing → Certain), a time tracker, a progress header showing phase and item count, and animated transitions between items.

### 11.3 Assessment Results UI

The `AssessmentResultsPage` renders a 7-profile output:

1. **Readiness state card** — classification, governing constraint, confidence band, governance action.
2. **Capability radar** — six-domain radar chart with role benchmark overlay.
3. **Signal profile** — per-signal bar chart showing accumulated delta contributions.
4. **Confidence profile** — five-factor breakdown (depth, breadth, diversity, risk coverage, consistency).
5. **Contradiction summary** — detected pairs, resolution status, confidence penalty applied.
6. **Failure mode analysis** — detected failure modes, classification impact (block/downgrade/none).
7. **Classification explanation** — governing constraint narrative, item-level evidence citations, confidence diagnostic.

### 11.4 Design System

| Token | Value |
|-------|-------|
| Primary colour | Indigo `#3B4EFF` |
| Background | White `#ffffff` sidebar, `#F7F8FA` content |
| Font | Sora (headings), DM Mono (data/code) |
| Capability colours | Colorblind-safe 7-colour palette per domain |

---

## 12. Database Schema Summary

The 87-table schema is organised into functional groups:

| Group | Tables | Purpose |
|-------|--------|---------|
| Auth & Users | `users`, `roles`, `user_roles`, `tenants`, `tenant_settings`, `personas`, `user_personas` | Identity, RBAC, multi-tenancy |
| Assessment | `assessment_blueprints`, `assessment_sessions`, `assessment_items`, `assessment_item_options`, `assessment_answers`, `assessment_scores`, `assessment_answer_telemetry`, `assessment_review_flags` | Full assessment lifecycle |
| Content | `content_scenarios`, `content_scenario_options`, `content_scenario_anchors`, `content_roles`, `content_workflows`, `content_failure_modes`, `content_tags`, `content_versions`, `content_items`, `content_item_tags`, `content_policy_links`, `content_prerequisites` | Pre-authored content library |
| Learning | `learning_modules`, `learning_plans`, `learning_plan_items`, `adaptive_learning_plans`, `adaptive_plan_items`, `learning_objectives`, `content_progress`, `spaced_repetition_queue`, `learning_streaks`, `learning_nudges`, `learning_milestones`, `formative_quiz_results` | Adaptive learning lifecycle |
| Scoring | `assessment_scores`, `credibility_scores`, `risk_scores`, `user_states`, `gap_analyses`, `scoring_config`, `canonical_signals`, `canonical_signal_keys` | Score storage and configuration |
| Organisation | `organisations`, `organisation_profiles`, `organisation_capability_thresholds`, `sector_vocabulary`, `peer_benchmark_snapshots` | Org context and benchmarking |
| Intelligence | `ail_user_intelligence_profiles`, `ail_signal_ledger`, `ail_narrative_state`, `ail_narrative_threads`, `ail_narrative_events`, `ail_persona_profiles`, `ail_org_context`, `ail_difficulty_profiles`, `ail_failure_mode_registry`, `ail_retest_queue`, `ail_stakeholder_relationships` | Longitudinal intelligence layer |
| Governance | `audit_logs`, `decision_logs`, `events`, `policy_rules`, `policy_evaluations`, `admin_overrides`, `revalidation_schedules` | Audit trail and policy engine |
| Simulation | `simulations`, `simulation_nodes`, `simulation_choices`, `simulation_transitions`, `simulation_sessions`, `simulation_session_events`, `simulation_results` | Branching scenario simulations |
| Anti-gaming | `anti_gaming_thresholds`, `llm_item_review_queue` | Gaming detection configuration |
| Reporting | `report_jobs` | Async report generation |
| Marketing | `beta_applications` | Beta programme management |

---

## 13. Test Coverage

| Test file | Tests | What it covers |
|-----------|-------|---------------|
| `server/aiq.test.ts` | 21 | Core session lifecycle, answer submission, classification |
| `server/assessment.stress.test.ts` | 60+ | Scoring engine, signal deltas, DPIA governance, outcome classes |
| `server/content.test.ts` | 28 | Content library integrity, option validation |
| `server/confidence-floor.test.ts` | 20 | Confidence floor enforcement, provisional classification |
| `server/scoring.v2-2.test.ts` | 7 | V9.2→V10 scoring multiplier correctness |
| `server/debug.test.ts` | 5 | Session state computation, role-aware evidence thresholds |
| `server/anti-gaming.outcome-conditional.test.ts` | 16 | Anti-gaming patterns, trap injection, outcome-conditional detection |
| `server/save-resume.test.ts` | 19 | Session persistence, resume flow |
| `server/dashboard.router.test.ts` | 19 | Dashboard data aggregation across all 5 roles |
| `server/classification.explanation.test.ts` | 20+ | Classification explanation, item-level citations, signal contribution sums |
| `server/auth.logout.test.ts` | 1 | Auth session teardown |
| *(9 additional files)* | 212 | Adaptive engine, contradiction, policy, learning, simulation |
| **Total** | **428** | **20 test files, 0 failures** |

---

## 14. Known Deferred Items

The following items are explicitly deferred — they are not missing implementations but are blocked on infrastructure or scheduled for a future sprint:

| Item | Blocker |
|------|---------|
| Email delivery for forgot-password | Requires SMTP server configuration |
| PDF export rendering | Requires server-side PDF library (Puppeteer) |
| Real-time notifications | Requires persistent WebSocket infrastructure |
| Bulk user import via CSV | Future sprint |
| Relevance & Update Engine | Future sprint — trigger-based content feedback loop |
| Norm data collection table | Next sprint — replace synthetic norms with real completions |
| Email notifications for password reset | Requires SMTP (same as above) |

---

## 15. Key Design Decisions

**Why LLM-generated items rather than a fixed item bank?** A fixed item bank of sufficient size to cover 22 HR roles × 6 domains × 15 interaction types × 3 difficulty levels × 4 risk levels would require approximately 23,760 pre-authored items. LLM generation allows the engine to produce contextually appropriate items for any combination of variables while maintaining the psychometric structure (signal deltas, outcome classes, anchors) through a structured prompt template and post-generation validation.

**Why unsigned signal deltas?** Direction is encoded by `outcome_class`, not by the sign of the delta. This makes the content authoring interface unambiguous — content authors specify the magnitude of the signal contribution and the outcome class separately, rather than having to remember which signals are "positive" and which are "risk" signals when entering values.

**Why a confidence gate rather than always issuing a result?** A false `safe` classification is the highest-stakes error in this domain — it would certify an HR professional as AI-ready when they are not, potentially leading to unsupervised AI use in high-risk HR decisions (redundancy, disciplinary, hiring). The confidence gate deliberately withholds a `safe` result when evidence is unreliable, preferring a `developing` or `unknown` result that prompts further assessment.

**Why role-specific minimum safe thresholds?** A generic threshold (e.g., "score ≥60 in all domains") fails to account for the fact that an ER Specialist faces much higher governance risk from AI errors than a People Operations Coordinator. Role-specific thresholds encode this risk differentiation directly into the classification logic, ensuring that high-risk roles require demonstrably higher capability before receiving a `safe` classification.
