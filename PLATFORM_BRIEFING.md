# AiQ Platform — Technical Briefing Document

**Prepared:** June 2026  
**Codebase state:** `8c105a70` (HEAD → main)  
**Test suite:** 2,089 passed · 2 todo · 0 failed · 85 test files  
**TypeScript errors:** 0  
**Live domain:** [hraiq.co.uk](https://hraiq.co.uk)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Architecture](#2-product-architecture)
3. [CPO Strategy Builder](#3-cpo-strategy-builder)
4. [Reward Strategy Builder](#4-reward-strategy-builder)
5. [AI Skills Assessment](#5-ai-skills-assessment)
6. [Reward Readiness Assessment](#6-reward-readiness-assessment)
7. [Initiative Libraries](#7-initiative-libraries)
8. [Intelligence Layer](#8-intelligence-layer)
9. [Adaptive Intelligence Layer (AIL)](#9-adaptive-intelligence-layer-ail)
10. [Database Schema](#10-database-schema)
11. [Server Architecture](#11-server-architecture)
12. [Client Architecture](#12-client-architecture)
13. [Test Suite](#13-test-suite)
14. [Open Work](#14-open-work)
15. [Recent Sprint History](#15-recent-sprint-history)

---

## 1. Executive Summary

AiQ is an enterprise HR Capability Intelligence Platform designed for Chief People Officers, Reward Directors, and HR teams operating in organisations undergoing AI-driven transformation. The platform delivers three distinct but integrated products — a CPO strategy builder, a Reward strategy builder, and an AI skills assessment — all gated by per-tenant entitlements and served from a single multi-tenant codebase.

The platform is built on a React 19 + Tailwind 4 + Express 4 + tRPC 11 stack, with Drizzle ORM over MySQL/TiDB and Vitest for testing. The codebase spans approximately 205,000 lines of TypeScript across 145 database tables, 44 server routers, 95 client pages, and 85 test files. As of this briefing, the test suite is fully green (0 failures), TypeScript compiles without errors, and the two most recent sprints — removal of the deprecated `tenants.mode` column and resolution of 30 pre-existing test failures — are both committed and live.

The platform is deployed at [hraiq.co.uk](https://hraiq.co.uk) and [www.hraiq.co.uk](https://www.hraiq.co.uk) via Manus Autoscale hosting.

---

## 2. Product Architecture

### 2.1 Entitlement-Gated Modules

Access to each product module is controlled by three boolean columns on the `tenants` table. These are set permanently by the founder via the back-office entitlements panel and cannot be changed by tenants themselves.

| Column | Product | Guard Procedure |
|---|---|---|
| `entitlementStrategyCompany` | CPO Strategy Builder (11-stage gate) | `strategyCompanyProcedure` (alias: `cpoProcedure`) |
| `entitlementStrategyReward` | Reward Strategy Builder (10-stage flow) | `strategyRewardProcedure` |
| `entitlementAssessment` | AI Skills Assessment + Adaptive Learning | `assessmentProcedure` |

A tenant may hold any combination of these three entitlements. The `mode` column that previously existed on the `tenants` table has been fully removed (Sprint 1, migration `0050_drop_tenants_mode.sql`). Mode is now derived at runtime: `isReward = entitlementStrategyReward && !entitlementStrategyCompany`. Tenants with both `strategyCompany` and `strategyReward` enabled receive combined access to both strategy builders.

### 2.2 Procedure Guards

The tRPC middleware layer (`server/_core/trpc.ts`) exposes the following procedure constructors, each enforcing a different access level:

| Procedure | Access Requirement |
|---|---|
| `publicProcedure` | No authentication required |
| `protectedProcedure` | Valid session (any authenticated user) |
| `adminProcedure` | Alias for `protectedProcedure` (role checks inline) |
| `strategyCompanyProcedure` | `entitlementStrategyCompany === true` |
| `strategyRewardProcedure` | `entitlementStrategyReward === true` |
| `assessmentProcedure` | `entitlementAssessment === true` |
| `superUserProcedure` | Platform super-user flag (founder/admin only) |

### 2.3 Route-Level Guards (Client)

In addition to server-side procedure guards, the React router in `client/src/App.tsx` enforces entitlement checks at the route level via three guard components:

- `EntitlementProtectedRoute` — wraps all CPO strategy pages; redirects if `entitlementStrategyCompany` is absent.
- `AssessmentRoute` — wraps all assessment and adaptive learning pages.
- `PeopleRoute` — wraps the `/dashboard` people analytics section.
- `KnowledgeRoute` — wraps the knowledge base and learning module pages.

This dual enforcement (server + client) ensures that neither API calls nor direct URL navigation can bypass entitlement checks.

---

## 3. CPO Strategy Builder

### 3.1 Overview

The CPO Strategy Builder guides a Chief People Officer through an 11-stage structured gate process, from diagnostic background inputs through to a board-ready report. Each stage produces a persistent JSON artefact stored against the tenant's strategy record. The gate enforces sequential progression: a stage cannot be completed until its predecessor is satisfied.

The primary router is `server/routers/gate.ts` (1,128 lines). All procedures use `protectedProcedure` with entitlement enforcement applied at the router level via the `strategyCompanyProcedure` guard.

### 3.2 Stage Sequence

| Stage | Name | Gate Procedure | Key Artefact |
|---|---|---|---|
| 1 | Pre-work / Diagnostic | (background inputs, no gate advance) | `backgroundInputsJson` (Sections A–K) |
| 2 | Vision | `completeStage2` | `visionJson` |
| 3 | Strategy | `completeStage3` | `strategyJson` |
| 4 | Principles + Won't Do | `completeStage4` | `principlesJson` |
| 5 | Initiatives | `completeStage5` | `initiativesJson` |
| 6 | Roadmap | `completeStage6` | `roadmapJson` |
| 7 | Success Measures | `completeStage7` | `outcomesJson` |
| 8 | Capability + Risk Register | `completeStage8` | `capabilityJson` + `riskRegisterJson` |
| 9 | Business Case | `completeStage9` | `businessCaseNarrative` |
| 10 | Leadership Review Gate | `completeStage10` | `reviewGateJson` |
| 11 | Board Report | `completeStage11` | `boardReportJson` |

### 3.3 Background Inputs (Stage 1)

Stage 1 is handled by a dedicated router, `server/routers/backgroundInputs.ts` (1,284 lines, 4 procedures). It covers eleven diagnostic sections (A through K) capturing organisational context, workforce data, HR maturity, digital maturity, strategic priorities, and the employee experience landscape. The Section I wiring (business direction, people challenges, employee experience state, geographic distribution) uses the Priority 0 component kit — `KeywordExpand`, `ChipSelect`, and `BenchmarkNumeric` — which provides §4b provenance tracking (distinguishing AI-drafted content from founder-owned content).

### 3.4 Supporting Services

The CPO strategy builder draws on two core services:

**`fitImpactEngine.ts`** (1,137 lines) scores each initiative in the library against the tenant's diagnostic profile, producing fit and impact scores that drive the initiative recommendation ranking in Stage 5.

**`cpoBusinessCaseEngine.ts`** (443 lines) generates the financial narrative for Stage 9, synthesising initiative costs, expected outcomes, and risk-adjusted ROI into a structured business case document.

---

## 4. Reward Strategy Builder

### 4.1 Overview

The Reward Strategy Builder is a 10-stage flow for Reward Directors and Total Reward teams. It mirrors the structural logic of the CPO builder but is scoped to compensation, benefits, pay equity, and reward governance. All 10 reward routers use `strategyRewardProcedure` as their guard.

### 4.2 Stage Sequence and Routes

| Stage | Route Path | Router |
|---|---|---|
| 1 — Pre-work | `/strategy/reward-prework` | `rewardPrework` |
| 2 — Vision | `/strategy/reward-vision` | `rewardVision` |
| 3 — Strategy | `/strategy/reward-strategy` | `rewardStrategy` |
| 4 — Principles | `/strategy/reward-principles` | `rewardPrinciples` |
| 5 — Initiatives | `/strategy/reward-initiatives` | `rewardInitiatives` |
| 6 — Success Measures | `/strategy/reward-success-measures` | `rewardSuccessMeasures` |
| 7 — Business Case | `/strategy/reward-business-case` | `rewardBusinessCase` |
| 8 — Capability | `/strategy/reward-capability` | `rewardCapabilityAssessment` |
| 9 — Review | `/strategy/reward-review` | `rewardReview` |
| 10 — Outputs | `/strategy/reward-outputs` | `rewardOutputs` |

### 4.3 Supporting Services

**`rewardRecommendationEngine.ts`** (661 lines) scores and ranks reward initiatives from the library against the tenant's reward profile, applying sub-domain weighting and capability gap penalties.

**`rewardBusinessCaseEngine.ts`** (674 lines) generates the financial narrative for Stage 7, including three-year cost modelling and ROI projections.

**`rewardReviewService.ts`** (573 lines) handles the Stage 9 leadership review gate, including stakeholder sign-off tracking and review commentary.

**`rewardOutputs.ts`** (754 lines) assembles the final Stage 10 output pack — a structured document combining vision, strategy, principles, initiatives, success measures, business case, and capability plan.

---

## 5. AI Skills Assessment

### 5.1 Overview

The AI Skills Assessment measures an individual's capability across six domains of AI literacy and application. It is the platform's most technically complex module, incorporating an adaptive item-selection engine (the AIL system), a credibility scoring layer, and a full reporting pipeline. All assessment procedures use `assessmentProcedure` as their guard.

### 5.2 Capability Domains

The six assessment domains, each with a distinct brand colour, are:

| Domain Key | Display Name | Brand Colour |
|---|---|---|
| `ai_interaction` | AI Interaction | Blue (#3B82F6) |
| `ai_output_evaluation` | AI Output Evaluation | Amber (#F59E0B) |
| `ai_workflow_design` | AI Workflow Design | Emerald (#10B981) |
| `workforce_ai_readiness` | Workforce AI Readiness | Rose (#F43F5E) |
| `ai_ethics_trust` | AI Ethics & Trust | Purple (#A855F7) |
| `ai_change_leadership` | AI Change Leadership | Indigo (#6366F1) |

### 5.3 Assessment Architecture

The assessment engine (`server/routers/assessment.ts`) operates as follows. An initial assessment establishes a baseline score across all six domains. Subsequent sessions are fully adaptive: item difficulty and domain focus are adjusted in real time by the AIL system based on the user's response pattern, confidence signals, and cross-session memory. Two primary signals per domain are used at unsigned magnitude 0.9 to drive the adaptive difficulty model.

The scoring pipeline produces per-domain competence scores, behavioural pattern analysis (strong/acceptable/weak/poor response rates), and a narrative capability report. The report engine applies a strict acceptance test before finalising any sentence: removing all numerical references must leave a specific, falsifiable behavioural claim; vague sentences are rewritten.

### 5.4 Company-Level Assessment

A parallel company-level assessment (`server/routers/companyAssessment.ts`) aggregates individual scores across a team or function to produce an organisational AI readiness profile. This feeds into the CPO strategy builder's Stage 1 diagnostic.

---

## 6. Reward Readiness Assessment

### 6.1 Overview

The Reward Readiness Assessment (`server/routers/rewardCapabilityAssessment.ts`) evaluates a Reward team's operational capability across five dimensions. It is distinct from the AI Skills Assessment: it is a structured self-assessment rather than an adaptive psychometric instrument, and it feeds directly into Stage 8 of the Reward Strategy Builder.

### 6.2 Capability Dimensions

| Dimension Key | Display Label |
|---|---|
| `data_foundations` | Data Foundations |
| `change_management` | Change Management |
| `systems_integration` | Systems Integration |
| `reward_governance` | Governance & Compliance |
| `team_skills` | Team & Skills |

The `rewardCapabilityService.ts` (445 lines) derives a required capability level for each dimension from the tenant's selected initiative portfolio — the maximum demand across all selected initiatives — and compares it against the assessed current capability to produce a gap analysis and development plan.

---

## 7. Initiative Libraries

### 7.1 CPO Initiative Library

The CPO initiative library (`shared/initiativeLibrary.ts`, v3.2.0) contains **69 initiatives** across **14 categories**. Each initiative carries fit/impact scoring parameters consumed by the `fitImpactEngine`.

| Category | Initiative Count |
|---|---|
| Compensation & Reward | 12 |
| Talent Acquisition | 9 |
| Learning & Development | 6 |
| Employee Experience | 6 |
| Workforce Planning | 5 |
| Retention | 4 |
| Onboarding | 4 |
| Frontline Workforce | 4 |
| Performance Management | 3 |
| Manager Effectiveness | 3 |
| Internal Mobility | 3 |
| HR Operations | 3 |
| Governance | 3 |
| AI Capability | 3 |
| **Total** | **69** |

### 7.2 Reward Initiative Library

The Reward initiative library (`shared/rewardInitiativeLibrary.ts`) contains **31 initiatives** across **7 sub-domains**. Each initiative includes three-year cost modelling (low/median/high), capability demand ratings across the five reward dimensions, and implementation complexity scores.

| Sub-Domain | Initiative Count |
|---|---|
| Compensation | 10 |
| Reward Operations | 7 |
| Benefits | 4 |
| Pay Transparency | 3 |
| Pay Equity | 3 |
| Executive Compensation | 2 |
| Sales Compensation | 1 |
| **Total** | **31** |

---

## 8. Intelligence Layer

### 8.1 Overview

The intelligence layer (`server/routers/intelligence.ts`, 3,138 lines) is the platform's LLM orchestration hub. It exposes **15 procedures** that generate, synthesise, and narrate content across all three product modules. Following Sprint 1, all `mode` input parameters have been removed; mode is now derived from `ctx.entitlements` within each procedure.

### 8.2 Procedures

| Procedure | Purpose |
|---|---|
| `getStrategy` | Generate CPO strategy narrative from diagnostic inputs |
| `getStrategyDraft` | Draft iterative strategy refinements |
| `getStrategyAssessment` | Assess strategy quality against best-practice criteria |
| `getStrategyInitiatives` | Recommend and rank CPO initiatives |
| `getRoadmap` | Generate phased implementation roadmap |
| `getCapabilityAssessment` | Assess CPO capability gaps against initiative demands |
| `getRiskRegister` | Generate risk register entries for Stage 8 |
| `getRiskAcknowledgements` | Generate risk acknowledgement statements |
| `capabilityReport` | Generate individual AI capability narrative report |
| `difficultyProfile` | Compute adaptive difficulty profile for assessment |
| `getCapabilityAssessment` | Reward capability gap narrative |
| `narrativeContext` | Generate simulation narrative context |
| `orgContext` | Derive organisational context for AIL modules |
| `persona` | Classify user persona for adaptive personalisation |
| `preSimulationContext` | Generate pre-simulation briefing |
| `profile` | Generate user intelligence profile summary |

### 8.3 Fit/Impact Engine

The `fitImpactEngine.ts` (1,137 lines) is the most substantial service in the codebase. It scores each of the 69 CPO initiatives against a tenant's diagnostic profile using a multi-factor model that considers sector fit, HR maturity, digital maturity, workforce size, strategic priorities, and employee experience signals. The output is a ranked list of initiatives with fit scores (0–1), impact scores (0–1), and a combined priority score used to pre-populate Stage 5.

---

## 9. Adaptive Intelligence Layer (AIL)

### 9.1 Overview

The Adaptive Intelligence Layer (`server/ail/`) is a suite of nine modules that together implement the platform's adaptive assessment and simulation intelligence. The AIL operates as a stateful, session-aware system: it reads from and writes to a set of dedicated AIL tables in the database, maintaining persistent profiles across sessions.

### 9.2 Modules

| Module | File | Lines | Responsibility |
|---|---|---|---|
| Capability Report | `capabilityReport.ts` | 393 | Generates structured capability narrative from scored domain data |
| Cold Start | `coldStart.ts` | 389 | Bootstraps adaptive parameters for new users with no history |
| Cross-Simulation Memory | `crossSimulationMemory.ts` | 372 | Persists behavioural signals across simulation sessions |
| Narrative Engine | `narrativeEngine.ts` | 357 | Generates contextualised scenario narratives for simulations |
| Persona Classification | `personaClassificationEngine.ts` | 353 | Classifies users into behavioural personas for content personalisation |
| Organisation Context | `organisationContextLayer.ts` | 347 | Injects tenant-specific organisational context into item generation |
| User Intelligence Profile | `userIntelligenceProfile.ts` | 272 | Maintains a longitudinal intelligence profile per user |
| Adaptive Difficulty Engine v2 | `adaptiveDifficultyEngineV2.ts` | 265 | Adjusts item difficulty in real time based on response patterns |
| Emotional Dynamics Layer | `emotionalDynamicsLayer.ts` | 254 | Models emotional state signals to modulate simulation narrative tone |
| **Total** | | **3,002** | |

### 9.3 AIL Database Tables

The AIL system uses eight dedicated database tables: `ailDifficultyProfiles`, `ailFailureModeRegistry`, `ailNarrativeEvents`, `ailNarrativeState`, `ailNarrativeThreads`, `ailOrgContext`, `ailPersonaProfiles`, `ailRetestQueue`, `ailSignalLedger`, `ailStakeholderRelationships`, and `ailUserIntelligenceProfiles`.

---

## 10. Database Schema

### 10.1 Overview

The database schema (`drizzle/schema.ts`) defines **145 tables** across MySQL/TiDB. The schema has evolved through **47 SQL migrations**, with the most recent (`0050_drop_tenants_mode.sql`) removing the deprecated `mode` column from the `tenants` table.

### 10.2 Table Groups

The tables can be grouped into the following functional domains:

| Domain | Key Tables |
|---|---|
| **Multi-tenancy** | `tenants`, `tenantSettings`, `organisations`, `organisationProfiles` |
| **Users & Auth** | `users`, `userRoles`, `userStates`, `roles`, `invitations` |
| **CPO Strategy** | `strategies`, `strategyInitiatives`, `strategyMilestones`, `strategyRiskRegister`, `strategyHrSegments`, `strategyIndustries`, `strategyInitiativeLibrary`, `strategyRefreshSuggestions` |
| **Reward Strategy** | `rewardPrework`, `rewardVision`, `rewardStrategy`, `rewardPrinciples`, `rewardInitiativePortfolio`, `rewardCustomInitiative`, `rewardSuccessMeasures`, `rewardSuccessMeasuresStage`, `rewardBusinessCase`, `rewardCapabilityDimensions`, `rewardCapabilityStage`, `rewardCapabilityDevelopmentPlans`, `rewardTeamCapabilitySnapshots`, `rewardReview`, `rewardOutputs`, `rewardRecommendationRun`, `rewardWontDoTemplates`, `rewardPrincipleTemplates` |
| **Assessment** | `assessmentSessions`, `assessmentItems`, `assessmentItemOptions`, `assessmentAnswers`, `assessmentAnswerTelemetry`, `assessmentScores`, `assessmentHistory`, `assessmentBlueprints`, `assessmentReviewFlags` |
| **Company Assessment** | `companyAssessments`, `companyAssessmentResponses`, `companyAssessmentResults`, `companyQuestions` |
| **AIL** | `ailDifficultyProfiles`, `ailFailureModeRegistry`, `ailNarrativeEvents`, `ailNarrativeState`, `ailNarrativeThreads`, `ailOrgContext`, `ailPersonaProfiles`, `ailRetestQueue`, `ailSignalLedger`, `ailStakeholderRelationships`, `ailUserIntelligenceProfiles` |
| **Learning** | `learningModules`, `learningPlans`, `learningPlanItems`, `learningObjectives`, `learningMilestones`, `learningStreaks`, `learningNudges`, `learningModuleTags`, `adaptiveLearningPlans`, `adaptivePlanItems` |
| **Content** | `contentItems`, `contentVersions`, `contentTags`, `contentItemTags`, `contentProgress`, `contentFeedback`, `contentRequests`, `contentRoles`, `contentScenarios`, `contentScenarioAnchors`, `contentScenarioOptions`, `contentWorkflows`, `contentReviewLog`, `contentFailureModes` |
| **Simulation** | `simulations`, `simulationSessions`, `simulationNodes`, `simulationChoices`, `simulationTransitions`, `simulationResults`, `simulationSessionEvents` |
| **Scoring & Credibility** | `assessmentScores`, `credibilityScores`, `riskScores`, `scoringConfig`, `normDataPoints`, `antiGamingThresholds` |
| **People & Org** | `companyProfile`, `companyProfileAudit`, `companyProfileFlag`, `personas`, `userPersonas`, `userCapabilityMemory`, `managerBriefs`, `managerTeamMembers` |
| **Governance & Audit** | `auditLogs`, `decisionLogs`, `policyRules`, `policyEvaluations`, `riskAcknowledgements`, `revalidationSchedules`, `triggeredReviews` |
| **Initiatives** | `initiative`, `initiativeRisk`, `initiativeStatusHistory`, `hwgtInitiatives`, `discoveryCandidates`, `discoveryScans`, `assumption`, `signalMatch` |
| **Signals** | `signal`, `canonicalSignals` |
| **Backoffice & Admin** | `betaApplications`, `marketingLeads`, `waitlist` (via leads router) |

### 10.3 Tenants Table (Current State)

The `tenants` table is the root of the multi-tenancy model. Following the mode column removal, its current structure is:

```
id            VARCHAR(36) PRIMARY KEY
name          TEXT NOT NULL
slug          VARCHAR(100) UNIQUE NOT NULL
primaryDomain VARCHAR(255)
status        ENUM('active','trial','suspended','archived') DEFAULT 'trial'
plan          ENUM('foundation','readiness','enterprise') DEFAULT 'foundation'
entitlementStrategyCompany  BOOLEAN DEFAULT false
entitlementStrategyReward   BOOLEAN DEFAULT false
entitlementAssessment       BOOLEAN DEFAULT false
createdAt     TIMESTAMP
updatedAt     TIMESTAMP
```

The `mode` column is permanently removed. No code in the codebase references it.

---

## 11. Server Architecture

### 11.1 Overview

The server is an Express 4 application with tRPC 11 mounted at `/api/trpc`. The entry point is `server/_core/index.ts`. All business logic is organised into 44 router files under `server/routers/`, each exporting a tRPC router that is merged into the root app router.

### 11.2 Router Inventory

| Router | Domain |
|---|---|
| `auth` | Authentication, session, user profile |
| `gate` | CPO 11-stage strategy gate |
| `intelligence` | LLM orchestration (15 procedures) |
| `backgroundInputs` | Stage 1 diagnostic sections A–K |
| `dashboardV2` | Dashboard analytics (12 procedures, 2,473 lines) |
| `dashboard` | Legacy dashboard procedures |
| `assessment` | AI skills assessment engine |
| `adaptiveLearning` | Adaptive learning plan generation |
| `companyAssessment` | Company-level AI readiness assessment |
| `rewardPrework` | Reward Stage 1 |
| `rewardVision` | Reward Stage 2 |
| `rewardStrategy` | Reward Stage 3 |
| `rewardPrinciples` | Reward Stage 4 |
| `rewardInitiatives` | Reward Stage 5 |
| `rewardSuccessMeasures` | Reward Stage 6 |
| `rewardBusinessCase` | Reward Stage 7 |
| `rewardCapabilityAssessment` | Reward Stage 8 |
| `rewardReview` | Reward Stage 9 |
| `rewardOutputs` | Reward Stage 10 |
| `initiativeDiscovery` | Initiative discovery and scanning |
| `strategy` | CPO strategy procedures |
| `assumptions` | Assumption tracking |
| `hwgt` | How We Get There (HWGT) initiatives |
| `signals` | Signal watch and canonical signals |
| `learning` | Learning module delivery |
| `contentLibrary` | Content library browsing |
| `content` | Content management |
| `contentReview` | Content review workflow |
| `coach` | AI coaching conversations |
| `simulation` | Simulation session management |
| `scoring` | Scoring and credibility computation |
| `operationalMaturity` | Operational maturity assessment |
| `people` | People analytics and member reports |
| `organisation` | Organisation profile management |
| `companyProfile` | Company profile management |
| `users` | User management |
| `tenant` | Tenant settings |
| `backoffice` | Super-user back-office operations |
| `report` | Report generation |
| `audit` | Audit log access |
| `policy` | Policy rule management |
| `waitlist` | Beta waitlist management |
| `leads` | Marketing lead capture |

### 11.3 Key Infrastructure Files

| File | Purpose |
|---|---|
| `server/_core/trpc.ts` | tRPC initialisation, procedure guards, context injection |
| `server/_core/context.ts` | Request context builder — injects `ctx.user`, `ctx.entitlements` |
| `server/_core/llm.ts` | LLM invocation helper (wraps Manus Forge API) |
| `server/_core/env.ts` | Environment variable registry |
| `server/_core/notification.ts` | Owner notification helper |
| `server/db.ts` | Drizzle ORM query helpers |
| `server/storage.ts` | S3 file storage helpers (`storagePut`, `storageGet`) |

---

## 12. Client Architecture

### 12.1 Overview

The client is a React 19 single-page application built with Vite and styled with Tailwind 4 using the AiQ v1.4 light design system (IBM Plex Sans, AiQ blue `#1D6FD0` primary, light-mode only). It contains **95 pages** across **12 subdirectories**, plus top-level pages.

### 12.2 Page Inventory by Subdirectory

| Subdirectory | Page Count | Domain |
|---|---|---|
| `strategy/` | 24 | CPO strategy stages + reward strategy stages |
| `dashboard/` | 13 | Role-based dashboards and analytics |
| `learning/` | 9 | Learning modules, pathways, team learning |
| `marketing/` | 11 | Public marketing site |
| `admin/` | 10 | Admin panel (tenants, users, content, assessments) |
| `assessment/` | 4 | AI skills assessment flow |
| `company/` | 5 | Company-level assessment |
| `manager/` | 2 | Manager conversation prompts and team progress |
| `people/` | 2 | Member reports and people analytics |
| `auth/` | 4 | Login, register, forgot/reset password |
| `backoffice/` | 2 | Back-office and initiative discovery |
| `simulation/` | 2 | Simulation list and session |
| Top-level | 7 | Home, Coach, Onboarding, Profile, Audit, Policy, Reports |
| **Total** | **95** | |

### 12.3 Key Components and Contexts

| Component / Context | Purpose |
|---|---|
| `GateContext.tsx` | Provides CPO gate state and `tenantMode` (derived from entitlements) to all strategy pages |
| `AppShell.tsx` | Authenticated app shell — sidebar navigation filtered by entitlements |
| `StrategyTopNav.tsx` | Stage-aware top navigation for the CPO strategy builder |
| `DashboardLayout.tsx` | Reusable sidebar layout for admin/dashboard pages |
| `AIChatBox.tsx` | Full-featured AI chat interface with streaming support |
| `ChipSelect.tsx` | Single/multi-select chip component with §4b provenance tracking |
| `KeywordExpand.tsx` | Keyword-seed → AI-draft → owned text component with provenance |
| `BenchmarkNumeric.tsx` | Numeric input with benchmark pre-fill and basis tracking |

### 12.4 Design System

The platform uses the AiQ v1.4 light design system, applied via `aiq-tokens.css` and `aiq-components.css` imported into `client/src/index.css`. Key design decisions:

- **Font:** IBM Plex Sans (body) + IBM Plex Mono (code/data)
- **Primary colour:** AiQ Blue `#1D6FD0`
- **Theme:** Light mode only (`ThemeProvider defaultTheme="light"`, dark switching disabled for authenticated app)
- **Root wrapper:** `class="aiq"` on the App root enables AiQ token scoping
- **Utility classes:** `aiq-page-header`, `aiq-section-card`, `aiq-stat-card` for consistent page structure

---

## 13. Test Suite

### 13.1 Current State

| Metric | Value |
|---|---|
| Test files | 85 |
| Tests passing | 2,089 |
| Tests failing | 0 |
| Tests todo | 2 |
| TypeScript errors | 0 |
| SQL migrations | 47 |

### 13.2 Test File Coverage

The test suite covers all major server-side domains. Key test files include:

| Test File | Coverage Area |
|---|---|
| `canonical-facts.test.ts` | Gate stage key enumeration (11 stages verified) |
| `stage8-capability.test.ts` | Stage 8 capability + risk register procedures |
| `stage9-10-gate.test.ts` | Stages 9–11 gate procedures (business case, review, board report) |
| `increment3-stage9-10.test.ts` | Increment 3 integration tests for stages 9–11 |
| `qa-acme-walkthrough.test.ts` | Full end-to-end walkthrough of the ACME tenant scenario |
| `entitlements.guards.test.ts` | 12 entitlement guard tests (all three procedure guards) |
| `server/auth.logout.test.ts` | Authentication and session management |

### 13.3 Testing Infrastructure

Tests use Vitest with a custom mock database pattern (`makeMockDb`) that injects controlled Drizzle query results without requiring a live database connection. The `gateStateJson` helper provides standardised gate state fixtures. All tRPC procedures are tested via direct caller invocation, bypassing HTTP transport.

---

## 14. Open Work

The `todo.md` file tracks **49 open items** across five thematic areas. All items are non-blocking for the current production deployment.

### 14.1 Content Audit and Module Regeneration (13 items)

The learning module corpus (145 modules) has been audited against six quality checks. The audit identified systemic issues in 17 modules (low scenario ratio — too many definitional questions) and 12 modules (mode clarity — quiz modules that should be labelled as Lesson or split). A pilot regeneration of the `ai_workflow_design` capability domain is pending, followed by a full corpus regeneration and re-audit. Additionally, the expert-authored item bank (replacing LLM-first for scored assessment content) is awaiting implementation, along with calibration sampling, adverse-impact analysis, and a one-page scoring explainer for users.

### 14.2 Section I Wiring (12 items)

The Section I fields in `StrategyDiagnosticPage` (business direction, people challenges, employee experience state, geographic distribution) are partially wired to the Priority 0 component kit. The remaining wiring tasks cover completing the `ChipSelect` and `KeywordExpand` integrations for each field, calibrating AI draft prompts to plain/specific/honest tone, and verifying provenance state transitions (AI-drafted → owned → re-generated).

### 14.3 Theme Migration Verification (9 items)

The AiQ v1.4 light theme migration is functionally complete but requires final verification: CSS variable remapping confirmation, `ThemeProvider` lock confirmation, and screenshot capture of key pages after migration. Several component-level dark-mode remnants may still exist in less-visited pages.

### 14.4 Entitlement Gate Evidence (5 items)

The entitlement system is fully implemented but formal evidence artefacts have not yet been captured: screenshots of company-only nav, reward-only nav, and dual nav; denial proofs (reward route blocked, `/people` redirected, `/assessment` blocked); and a compiled list of all mode-reader locations in the codebase.

### 14.5 Dual-Write Cleanup (1 item)

Item A-5.8 (Phase B): six dual-write calls and `selectedInitiativesJson` blob writes remain in the codebase, pending migration of all 16 readers to the normalised `initiative` table. This cleanup is deferred until all readers are confirmed migrated.

### 14.6 Library Content Curation (4 items)

Three governance library entries (H1: score-use-protocol, H2: EU AI Act Annex III, H3: Art. 15 SAR on succession rankings) are awaiting founder curation. The library launch scope decision (which 8–12 initiatives receive full curation) is also pending.

### 14.7 Schema and Role (1 item)

The `aiqRole` enum in the database schema requires a `"learner"` value to be added, enabling explicit learner role assignment separate from the default user role.

---

## 15. Recent Sprint History

### Sprint 1 — Remove `tenants.mode` Column (Committed: `3a7245b`)

The `mode` column was a legacy string field on the `tenants` table that had been superseded by the three-boolean entitlement system. Sprint 1 removed all 14 references across the codebase:

The server-side changes replaced all `tenants.mode` database queries with runtime derivation from `ctx.entitlements`. The `gate.ts` router's `getState` and `advanceStage` procedures, the `intelligence.ts` router's five procedures that accepted `mode` as an input parameter, and the `backoffice.ts` router's `createOrg` mutation were all updated. The `auth.ts` router's `tenantMode` derivation was moved to use entitlements directly.

The client-side changes updated `GateContext.tsx` to derive `tenantMode` from `useAuth().user.entitlements` rather than from the `gate.getState` response. Ten additional client pages (`StrategyTopNav.tsx`, `InitiativeDiscoveryPage.tsx`, `BoardReportPage.tsx`, `ReviewSessionPage.tsx`, `StrategyOverviewPage.tsx`, `BusinessCasePage.tsx`, `CapabilityPage.tsx`, `RewardVisionPage.tsx`, `BackOfficePage.tsx`) were updated to remove `mode:` from tRPC mutation calls and to derive `isReward` locally.

The migration file `drizzle/0050_drop_tenants_mode.sql` was generated and applied to the live database via `ALTER TABLE tenants DROP COLUMN mode`.

### Sprint 2 — Fix 30 Pre-existing Test Failures (Committed: `8c105a70`)

Thirty test failures across five test files were resolved. These were pre-existing failures that predated Sprint 1 — the test suite had not been kept in sync with the gate procedure renaming that occurred when Stage 11 (Board Report) was added as a distinct stage.

The fixes were: `canonical-facts.test.ts` updated to expect 11 stage keys (`stage1` through `stage11`) rather than 10; `stage8-capability.test.ts` given a `VALID_RISK_JSON` fixture and `riskRegisterJson` added to three failing test cases; `stage9-10-gate.test.ts` fully rewritten with correct procedure names (`completeStage9` = business case, `completeStage10` = review gate, `completeStage11` = board report); `increment3-stage9-10.test.ts` given the same procedure renaming throughout; and `qa-acme-walkthrough.test.ts` fully rewritten with corrected stage mock patterns, dual-query mock for stage 5, and `makeMockDb` / `gateStateJson` helpers to eliminate boilerplate.

The result was a clean test suite: 2,089 passed, 2 todo, 0 failed across 85 test files.

---

*This document reflects the state of the AiQ platform at commit `8c105a70` (June 2026). For the latest state, refer to the live codebase at `/home/ubuntu/aiq-platform` or the GitHub repository.*
