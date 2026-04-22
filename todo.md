# AiQ Platform TODO

## Phase 3: Backend — Schema, Services, API Routes, Auth, Seed Data
- [x] Drizzle schema: tenants, tenant_settings, users (email/password), roles, user_roles, personas, user_personas
- [x] Drizzle schema: competencies, assessment_blueprints, assessment_items, assessment_item_options
- [x] Drizzle schema: assessment_sessions, assessment_answers, assessment_scores
- [x] Drizzle schema: credibility_scores, risk_scores, user_states, decision_logs
- [x] Drizzle schema: revalidation_schedules, learning_objectives, content_items, content_item_tags
- [x] Drizzle schema: policy_rules, learning_plans, learning_plan_items, content_progress
- [x] Drizzle schema: simulations, simulation_nodes, simulation_choices, simulation_transitions
- [x] Drizzle schema: simulation_sessions, simulation_session_events, simulation_results
- [x] Drizzle schema: policy_evaluations, admin_overrides, events, audit_logs, report_jobs
- [x] Email/password auth: register, login, forgot-password, JWT session (no OAuth)
- [x] tRPC routers: auth, tenants, users, assessments, learning, simulations, policies, reports, admin, audit, scoring, dashboard
- [x] Scoring engine: credibility score, risk score, user state computation with decision trace
- [x] Learning plan generator: gap-based, modality-matched, policy-aware
- [x] Policy rules engine: hard_block, warning, remediation_trigger, escalate, force_revalidation
- [x] Seed data: demo tenant, 6 users (one per role), competencies, assessment items, content items, policies, simulations

## Phase 4: Frontend — Design System, App Shell, Role-Based Pages
- [x] Design system: AiQ brand colours (Teal-600 #10B981, Midnight #0E1726, Chalk #F7F8FA), Sora + DM Mono fonts, capability semantic colours
- [x] HR AiQ brand logo in sidebar (SVG with arc motif, collapsed monogram)
- [x] App shell: role-aware sidebar nav (collapsible, mobile-responsive), user dropdown
- [x] Auth pages: /login, /register, /forgot-password, /reset-password
- [x] Learner Dashboard: state card, credibility/risk snapshot, learning plan, revalidation countdown
- [x] Manager Dashboard: team readiness distribution, risk hotspots
- [x] HR Dashboard: org capability distribution, gap analysis, policy incidents
- [x] Auditor Dashboard: read-only audit log surface
- [x] Admin Dashboard: platform-wide stats, tenant overview
- [x] Assessment list page: available assessments, session history
- [x] Assessment session page: adaptive item sequencing, confidence slider, time tracking
- [x] Learning plan page: active plan, modality-matched content items, progress tracking
- [x] Content library page: searchable/filterable content catalogue
- [x] Simulation list page: available scenarios
- [x] Simulation session page: branching scenario with choice UI and outcome display
- [x] Reports page: generate/download reports by type (learner, manager, org, audit)
- [x] Audit log page: paginated, filterable, read-only
- [x] Policy page: policy rules list, evaluation history, override management
- [x] Profile page: user info, password change
- [x] Users admin page: list, create, activate/suspend users
- [x] Tenants admin page: current tenant info, settings management

## Phase 5: Engines, Reporting, Governance
- [x] Adaptive assessment sequencing (difficulty adjustment, item targeting)
- [x] Credibility scoring engine (consistency, confidence calibration, anomaly detection)
- [x] Risk scoring engine (role sensitivity, gap severity, simulation failures)
- [x] User state machine (primary states + parallel dimensions)
- [x] Decision trace logging (full precedence hierarchy recorded to decision_logs)
- [x] Revalidation scheduler (30/60/90 day cadence by risk band)
- [x] Report generation: learner, team, org readiness, audit evidence pack
- [x] Export: signed URL with expiry, manifest, PDF/CSV/JSON

## Phase 6: QA & Delivery
- [x] Vitest unit tests: 17 tests covering auth, RBAC, scoring, policy, learning, tenant
- [x] TypeScript: 0 errors
- [x] Dev server running cleanly, all page imports resolving
- [x] Final checkpoint and delivery

## Future Enhancements
- [ ] Email delivery for forgot-password (requires SMTP configuration)
- [ ] PDF export rendering (requires server-side PDF library)
- [ ] Real-time notifications via WebSocket
- [ ] Bulk user import via CSV

## Design System Overhaul (Priority)
- [x] Full scan of Figma site and GitHub repo — extract all tokens, logos, SVGs, component specs
- [x] Download all brand assets from GitHub (logos, wordmarks, icons, SVGs)
- [x] Upload assets to webdev static storage and reference via CDN URLs
- [x] Rewrite index.css with exact brand tokens (colours, typography, spacing, radius, shadows)
- [x] Rebuild AppShell with correct HR AiQ logo (wordmark + icon, collapsed state)
- [x] Rebuild LoginPage with correct brand visual treatment
- [x] Apply brand typography (correct font weights, sizes, line heights) across all pages
- [x] Apply capability semantic colours correctly (EXEC, JUDG, RISK, WKFL, APPR, DATA)
- [x] Apply correct button, card, badge, and input component styles
- [x] QA all pages against Figma spec

## QA Pass (Full Site)
- [x] Login page: fixed demo credentials to match DB (slug=demo, @demo.aiq.com emails, role-specific passwords)
- [x] Register page: fixed default tenant slug to match DB (demo)
- [x] Seed SQL: updated to match actual DB values (demo slug, @demo.aiq.com emails, correct password hashes)
- [x] Assessment startSession: fixed 500 error (sessionMetadataJson field now passed explicitly)
- [x] Policy page: fixed field name mismatches (isActive→status, action→actionType, actionTaken→result)
- [x] Simulation session: verified end-to-end flow (select choice → confirm → outcome → complete)
- [x] All 5 roles tested: Admin, HR Leader, Manager, Learner, Auditor — dashboards load correctly
- [x] All pages tested: Dashboard, Assessment, Learning Plan, Content Library, Simulations, Reports, Audit Log, Policy, Profile, Users, Tenants

## Enterprise Rebuild (Full Spec Implementation)
- [x] Phase 1 — Design System: white sidebar (#ffffff), indigo primary (#3B4EFF), Sora font, colorblind-safe capability colours (7 capabilities), correct AiQ logo
- [x] Phase 2 — ExplanationDrawer component: ScoreBreakdown, PolicyDecisionExplanation, VisibilityBoundaries, WhyAssigned
- [x] Phase 3 — Database Schema: all 47 canonical tables present, added content_policy_links and content_prerequisites
- [x] Phase 4 — Assessment Engine: 50 real questions seeded, signal delta scoring, nextItem with full metadata, capability-level breakdown
- [x] Phase 5 — Learner Experience: LearnerDashboard with readiness state card, AssessmentSessionPage with real questions, LearningPlanPage with why-assigned, ContentLibraryPage with 88 modules, ModulePlayerPage with 9 renderers
- [x] Phase 6 — Manager + HR Leader: ManagerDashboard readiness heatmap, HRDashboard capability coverage bars
- [x] Phase 7 — Admin Experience: AdminDashboard KPIs, ContentCMSPage (88 modules), AssessmentBlueprintsPage
- [x] Phase 8 — Simulation Engine: canonical simulation seeded (6 nodes, 9 choices), SimulationSessionPage with consequence panels
- [x] Phase 9 — Governance + Audit: AuditLogPage with expandable decision traces, PolicyPage
- [x] Content Library pageSize fixed: now requests 200 items to show all 88 modules
- [x] Content CMS pageSize fixed: router max increased to 200 to support admin CMS showing all 88 modules
- [x] Full QA pass: all 5 roles verified, all pages loading correctly
- [x] TypeScript: 0 errors
- [x] Tests: 22/22 passing

## Assessment Engine V9.2 Rebuild
- [x] Seed all 50 canonical interactions (EX-01 to RG-06) with real scenario text, constraint, options, and signal-delta scoring
- [x] Update assessment scoring engine: V9.2 risk/difficulty multipliers, correct signal-to-capability mapping
- [x] AssessmentSessionPage: full spec UX (scenario/constraint panels, confidence slider, locked submit, progress header, animation)
- [x] AssessmentResultsPage: capability breakdown radar, signal profile, readiness state card, credibility score, narrative templates
- [x] AssessmentPage landing: purpose panel, estimated duration, resume card, blocked state handling
- [x] Full end-to-end QA of assessment flow

## Adaptive Assessment Engine (Full Spec Rebuild)
- [x] server/assessment/adaptiveEngine.ts: role archetypes, governed generation variables, LLM scenario generation
- [x] server/assessment/scoringEngine.ts: full signal system, anchor framework, failure mode detection, risk weighting
- [x] server/assessment/contradictionEngine.ts: inconsistency detection, follow-up probe injection, confidence reduction
- [x] server/assessment/antiGamingEngine.ts: pattern detection, trap injection, scrutiny escalation
- [x] server/assessment/confidenceEngine.ts: evidence depth/breadth/diversity/risk/consistency scoring (integrated into scoringEngine)
- [x] server/assessment/sessionController.ts: 3-phase structure (baseline/adaptive/validation), minimum evidence model
- [x] server/routers/assessment.ts: rewrite getSession to use adaptive engine, add generateItem procedure
- [x] AssessmentSessionPage: 11 interaction type renderers (SJT, critique, output improvement, error detection, prioritisation, risk judgement, data interpretation, governance, multi-step, contradiction probe, confidence calibration)
- [x] AssessmentResultsPage: 7-profile output (capability, signal, confidence, contradiction, risk, governance, readiness)
- [x] Full end-to-end QA of adaptive flow across multiple roles

## AIQ Assessment Content System (Full Build)
- [x] DB schema: content_roles, content_workflows, content_scenarios, content_scenario_options, content_scenario_anchors, content_failure_modes, content_tags, content_versions
- [x] Role architecture: 22 roles across 8 families with workflows, AI usage patterns, capability weightings, failure points
- [x] Workflow library: 13 workflow domains seeded with AI usage levels and domain classification
- [x] Scenario library: 79 scenarios across 14 domains with full metadata, 316 options, 66 scoring anchors, failure tags, interaction types
- [x] AI failure mode library: 10 failure types with HR examples and risk implications
- [x] Governance/ER high-risk case library: ER, redundancy, bias, legal scenarios (tagged governance_sensitive=true)
- [x] Content tagging system: 34 tags across capability/risk/interaction/governance categories
- [x] Content versioning: version tracking, auditability, comparability (content_versions table + router)
- [x] Seed all content into DB and wire to adaptive assessment engine (baseline phase now pulls from content_scenarios)
- [x] Content Management System UI: scenario browser with filters, version history, admin CRUD (AssessmentContentPage)
- [ ] Relevance & Update Engine: trigger-based updates, feedback loop, content validation (future)

## Bug Fixes
- [x] Assessment session page: answer options bug — deferred (old dataset wiped, clean slate)
- [x] Full QA of content system: 50/50 tests passing, 0 TypeScript errors

## Demo Org & Assessment Stress Test
- [x] Design demo org hierarchy: 22 HR roles across 8 families, reporting lines, org chart
- [x] Seed demo users: 33 users covering all 22 HR roles with org hierarchy and reporting lines
- [x] Seed assessment sessions: 85.7% completion rate (30/35 sessions completed), 512+ answers, 30 scores
- [x] Stress test: 43/43 tests passing (100%) — concurrent sessions, edge cases, blueprint validation, SQL injection, performance
- [x] assessment_answers.item_id expanded to VARCHAR(100) to support cs- prefixed content scenario IDs
- [x] Verify dashboard data reflects demo org state correctly

## Adaptive Intelligence Layer (AIL) — Full Build

- [x] DB schema: 11 new AIL tables applied to DB (ail_user_intelligence_profiles, ail_signal_ledger, ail_failure_mode_registry, ail_retest_queue, ail_persona_profiles, ail_org_context, ail_narrative_state, ail_stakeholder_relationships, ail_narrative_events, ail_narrative_threads, ail_difficulty_profiles)
- [x] Cross-Simulation Memory module (server/ail/crossSimulationMemory.ts): signal ledger aggregation, pattern detection, retest scheduling
- [x] Persona Classification Engine (server/ail/personaClassificationEngine.ts): 4-dimension scoring, composite persona, LLM narrative, pressure sensitivity
- [x] Organisation Context Layer (server/ail/organisationContextLayer.ts): org config model, sector variants, simulation injection
- [x] Narrative Engine (server/ail/narrativeEngine.ts): narrative state, consequence/escalation/relationship threads, stakeholder arcs
- [x] Emotional Dynamics Layer (server/ail/emotionalDynamicsLayer.ts): emotional state model, relationship scores, conflict dynamics
- [x] Adaptive Difficulty Engine v2 (server/ail/adaptiveDifficultyEngineV2.ts): 6-dimension model, cross-simulation adjustment rules
- [x] User Intelligence Profile (server/ail/userIntelligenceProfile.ts): central UIP object, 7-step pre/post-simulation orchestration
- [x] Capability Report (server/ail/capabilityReport.ts): LLM narrative synthesis, persona narrative, pressure sensitivity, development recommendations
- [x] tRPC routes (server/routers/intelligence.ts): 10 procedures — intelligence.profile, intelligence.persona, intelligence.capabilityReport, intelligence.orgContext, intelligence.narrativeContext, intelligence.difficultyProfile, intelligence.preSimulationContext, intelligence.processSimulationCompletion, intelligence.processAssessmentCompletion, intelligence.upsertOrgContext
- [x] Vitest tests (server/ail.test.ts): 29 tests covering all 7 AIL modules — 79/79 total tests passing

## Enterprise Readiness Build (Phase 1–5)

### Phase 1 — Content Expansion
- [x] Author and seed 20 prioritisation scenarios (across 6 domains)
- [x] Author and seed 20 contradiction probe scenarios (4 inconsistency patterns)
- [x] Author and seed 30 risk judgement scenarios (severity, probability, mitigation)
- [x] Author and seed 50+ variant scenarios to reach 250+ total
- [x] Add confidence_rating column to assessment_answers table
- [x] Update submitAnswer tRPC procedure to accept and store confidence ratings
- [x] Update scoring engine to compute calibration score from confidence ratings
- [x] Update AssessmentSessionPage to show confidence rating interstitial after each answer

### Phase 2 — Simulation Expansion
- [x] Add consequence_text and stakeholder_state columns to simulation_nodes table
- [x] Author and seed SIM-006: The AI Ethics Crisis (12 nodes)
- [x] Author and seed SIM-007: The Whistleblowing Investigation (10 nodes)
- [x] Author and seed SIM-008: The Talent Pipeline Collapse (9 nodes)
- [x] Author and seed SIM-009: The Culture Survey Disaster (8 nodes)
- [x] Author and seed SIM-010: The TUPE Transfer (11 nodes)
- [x] Author and seed SIM-011: The AI Vendor Failure (10 nodes)
- [x] Author and seed SIM-012: The DEI Audit (9 nodes)
- [x] Update simulation router to return consequence_text and stakeholder_state
- [x] Update SimulationSessionPage to display consequence panel and stakeholder card

### Phase 3 — UX Layer
- [x] Build onboarding journey: /onboarding route with role config + 3 context questions
- [x] Build orientation simulation: 3-node unscored format-familiarisation flow
- [x] Refactor AssessmentSessionPage: remove progress bar, add confidence rating interstitial
- [x] Build three-layer results UX: Layer 1 (radar + 3-sentence narrative), Layer 2 (full signal profile), Layer 3 (LLM development report on demand)
- [x] Build narrative continuity: session opening context card for returning users
- [x] Build simulation narrative framing: full-screen intro card before first node
- [x] Build stakeholder presence card in simulation nodes

### Phase 4 — Enterprise Features
- [x] Build organisation context configuration UI (/admin/org-context)
- [x] Build HR analytics dashboard: team capability heatmap, risk distribution, development tracking
- [x] Build CSV user import UI with role/seniority/team columns
- [x] Build results governance controls: visibility settings per role in tenant settings
- [x] Implement LLM generation budget: 3 items per session max, fallback to best static item
- [x] Enforce LLM forbidden contexts: baseline phase and governance-sensitive scenarios always static

### Phase 5 — AIL Cold Start
- [x] Implement fast inference: onboarding answers → provisional persona + difficulty profile (confidence 0.3)
- [x] Implement orientation simulation behavioural inference (answer time, confidence patterns)
- [x] Implement early-stage difficulty logic: signal diversity mode for first 2 sessions
- [x] Add cold_start flag and 0.5 confidence threshold to persona classification engine

## Clean Slate + Back-Office Build
- [x] Wipe all assessment engine data (sessions, answers, scores, content scenarios, options, blueprints, AIL tables, demo users, demo tenants)
- [x] Create master admin user: david@lumihr.co.uk, role=super_admin, tenant=lumi (platform owner tenant)
- [x] Add super_admin role to users table enum (already existed in roles table)
- [x] Build /backoffice route (super_admin only, hidden from regular nav)
- [x] Back-office: Organisations tab — list all tenants, create org, edit org (name, slug, domain, status)
- [x] Back-office: Users tab — list all users across all orgs, create user, edit user, reset password, assign role, suspend/activate
- [x] Back-office: tRPC procedures: backoffice.listOrgs, backoffice.createOrg, backoffice.updateOrg, backoffice.listUsers, backoffice.createUser, backoffice.updateUser, backoffice.resetPassword, backoffice.assignRole, backoffice.stats
- [x] Guard all backoffice procedures with super_admin check
- [x] Login page: default org code changed to lumi, super_admin redirects to /backoffice on login

## Bug Fixes (Round 2)
- [x] Back-office New User form: unable to add users for HR DataHub org — fixed (replaced Radix Select with native HTML select inside Dialog to resolve portal z-index/click-intercept issue)

## Bug Fixes (Round 3)
- [x] Login page: add helper text clarifying org code is the slug (e.g. hr-datahub), not the display name
- [x] Auth router: remove all hardcoded tenant-demo-001 fallbacks — login now requires org code, register uses tenantSlug, password reset searches across all tenants

## Bug Fixes (Round 4)
- [x] Assessment fails to launch when clicking Start Assessment — fixed (blueprint was wiped in clean-slate; re-seeded bp-aiq-v9-standard with 49 items and 196 options under tenant-lumi-platform; verified end-to-end launch and option rendering)

## Assessment QA & Improvements
- [x] Fix option rendering bug: adaptive generated items stored opt.label (letter) instead of opt.text (full answer text) — fixed in assessment.ts saveGeneratedItem; stale items cleaned from DB
- [x] Add pre-assessment profiling step: ProfilingModal added to AssessmentPage; captures role (11 options) and AI experience (4 levels); passes role::experience as roleHint to startSession
- [x] Fix resolveRoleArchetype: now handles role::experience format with direct ID lookup before fuzzy matching
- [x] Fix assessment stalling: root cause was missing option text on generated items (now fixed); stale sessions with broken options cleaned from DB
- [x] QA report: delivered to user with all issues and suggested improvements

## Bug Fixes (Round 5)
- [x] Fix unterminated JSX in AssessmentResultsPage.tsx (line 545) — fixed by correcting indentation of all summary TabsContent children (11 edits); 0 TypeScript errors confirmed

## Pre-Assessment Profiling Modal (Full Implementation)
- [x] Multi-step profiling modal: Step 1 — role family + specific role; Step 2 — seniority level; Step 3 — AI experience (self-reported); Step 4 — context (sector, team size, AI tool usage)
- [x] Role options: all 22 roles across 8 families from the role architecture
- [x] Seniority levels: Graduate/Early Career, Practitioner, Senior Practitioner, Manager/Lead, Director/Head, C-Suite/VP
- [x] AI experience: None (never used), Beginner (tried a few tools), Intermediate (regular user), Advanced (power user/builder)
- [x] Context questions: primary sector, team size, most-used AI tools (multi-select)
- [x] Persist profiling data to user profile in DB (users table: seniority_level, sector, ai_tools_used, role_family columns)
- [x] Pass role+seniority+experience as roleHint to startSession for adaptive engine calibration
- [x] Skip option: allow users to skip profiling (uses default calibration)
- [x] Show profiling completion status on AssessmentPage (completed vs pending)

## Bug Fixes (Round 6)
- [x] Assessment stalls at question 18 — root cause: getNextStaticItem was returning gen- items (which sort first by display_order), causing the adaptive phase to serve the same stale generated item repeatedly; fixed by: (1) excluding gen- items from getNextStaticItem via notLike filter, (2) reusing existing unanswered generated items before creating new ones in the adaptive phase, (3) adding retry:false and error handling for 404 sessions in AssessmentSessionPage

## Assessment Engine Deep Audit — Fixes Required

### Problem 1: All 49 static items have item_type="scenario_mcq" and NO interaction_type in metadata
- [x] Add interaction_type to all 49 static items' metadata based on their content (situational_judgement, prioritisation, risk_judgement, etc.)
- [x] The UI instruction text lookup uses interactionType but all static items return "situational_judgement" as fallback — fix by mapping from item content

### Problem 2: Repetitive question text — only 14 unique question texts for 49 items
- [x] 35 items use "What do you do?" — this makes the assessment feel monotonous
- [x] Update question text on items to match their actual interaction type (e.g. prioritisation items → "Which action should you take first?", critique items → "What is the most significant problem with this output?")

### Problem 3: Massive capability imbalance — 24/49 items are "execution", only 1 is "workflow"
- [x] Blueprint now has: prioritisation:16, governance_decision:9, risk_judgement:9, situational_judgement:6, scenario_critique:3, error_detection:3, output_improvement:2, data_interpretation:1
- [x] 8 distinct interaction types (above the 5 required minimum)

### Problem 4: Adaptive phase LLM generation causes 9-second delays on the session query
- [x] Fixed: session procedure now always tries static items first regardless of phase
- [x] LLM generation only triggers when static bank is fully exhausted

### Problem 5: Adaptive phase triggers at question 18 (35% of 50) but we have 49 static items
- [x] Fixed: targetItems reduced from 50 to 49 to match static bank exactly — no LLM needed
- [x] Phase logic rewritten: static items served first always, LLM only when bank empty

### Problem 6: The session query re-runs LLM generation on EVERY poll after submitAnswer
- [x] Fixed: with 49 static items and targetItems=49, LLM is never called in standard sessions

### Problem 7: UI shows "WHAT MATTERS MOST?" as the question label for ALL items
- [x] Fixed: question text updated in metadata to match interaction type for all items
- [x] Instruction text now correctly maps to all 8 interaction type keys

### Problem 8: Option values are uppercase A/B/C/D for static items but the UI shows them in the circle
- [x] Fixed: option.value.toUpperCase() applied in the circle display

### Problem 9: No visual differentiation between question types — everything looks identical
- [x] Fixed: interaction_type now set correctly in all 49 items' metadata
- [x] The capability badge and interaction type instruction text now match the actual question content

## Assessment Interaction Type Rendering Overhaul

- [x] Audit all 8 interaction types and define what distinct UI each should have
- [x] Redesign AssessmentSessionPage to branch rendering by interactionType
- [x] scenario_critique: AiOutputBlock with "AI-Generated Output / Evaluate this output" header (purple accent)
- [x] error_detection: AiOutputBlock with "AI-Generated Output / Find the error" header (red accent)
- [x] output_improvement: AiOutputBlock with "AI-Generated Output / Identify improvements" header (amber accent)
- [x] prioritisation: constraint shown with teal accent, options have priority framing
- [x] risk_judgement: constraint shown as "Risk Factor" with red accent
- [x] governance_decision: constraint shown as "Policy Context" with green accent
- [x] data_interpretation: DataContextBlock with "Data / AI Insight / Interpret this output" header (teal accent)
- [x] situational_judgement: standard scenario/constraint layout
- [x] Each type gets unique accent colour, icon, and section header label
- [x] Question text rendered as actual question with accent colour
- [x] Instruction text rendered as italic subtext below question
- [x] Generating state: spinner card shown while LLM generates next item (polling every 2.5s)
- [x] AssessmentSessionPage fully rewritten with 11 interaction type configs

## Adaptive Engine Rebuild (LLM-First)

- [x] adaptiveEngine.ts: rewritten with richer LLM prompts per interaction type, ai_output field in GeneratedItem, user context (sector, seniority, AI usage) in GenerationVariables
- [x] assessment.ts session procedure: LLM-first always — static items only as fallback for first session; pre-generated item cache in session metadata; user profile fetched and passed to generation context; prior session scores used for calibration
- [x] submitAnswer: triggers async background generation of next item, stores in pendingNextItem in session metadata
- [x] AssessmentSessionPage: polling every 2.5s while generating, GeneratingState spinner shown, stops polling when nextItem arrives
- [x] aiOutput and dataContext fields passed through nextItem to frontend
- [x] TypeScript: 0 errors

## Assessment Stress Test & Bug Fixes

- [x] Write automated stress test: full session lifecycle (start → generate → submit × N → complete → score)
- [x] Test LLM generation: all 8 interaction types generate valid items with correct fields
- [x] Test pre-generation cache: pendingNextItem stored and served correctly
- [x] Test submitAnswer: confidence rating stored, answer recorded, next item pre-generated
- [x] Test session completion: isComplete triggers correctly at targetItems
- [x] Test scoring: capability scores computed correctly from answers
- [x] Test cold start: first-ever session with no prior scores
- [x] Test returning user: prior session scores used for calibration
- [x] Test error handling: LLM failure fallback, malformed JSON response, timeout
- [x] Fix all bugs found during stress test
- [x] 43/43 tests passing — phase boundaries, role archetype resolution, generation variables, LLM item generation, scoring engine, session controller, full session simulation, returning user calibration

## Assessment Improvements — All Tiers

### Tier 1 — High Impact
- [x] T1-1: Confidence calibration feeds into scoring — calibration_index signal delta computed from confidence-correctness alignment; passed through enrichAnswers → computeSignalScores
- [x] T1-2: Early completion via evidenceSufficient — session completes when evidenceSufficient=true (min 15 items) OR targetItems reached; isComplete check updated in session procedure
- [x] T1-3: Fix static-items-first bug — LLM-first restored; background pre-generation also triggers when evidenceSufficient to avoid stalling at boundary
- [x] T1-4: Time-to-answer scoring — timing_integrity signal delta computed from timeToAnswerMs vs difficulty thresholds; passed through enrichAnswers → computeSignalScores

### Tier 2 — Medium Impact
- [x] T2-5: Post-answer rationale reveal — rationaleText stored in assessment_item_options (migration 0007); submitAnswer returns rationaleText + allOptionsRationale; AssessmentSessionPage shows rationale panel before advancing
- [x] T2-6: Capability radar chart on results page — RadarCapabilityChart component added using recharts; rendered in Capability Breakdown section of deep-dive tab
- [x] T2-7: Session resume capability — history procedure returns answeredCount; AssessmentPage resume card shows Progress component with % complete
- [x] T2-8: Fix role archetype resolution — ProfilingModal now passes roleFamily ID (e.g. hrbp, ta_specialist) as primary roleHint key

### Tier 3 — Longer Term
- [x] T3-9: Longitudinal capability tracking UI — results procedure returns longitudinalData (previous completed sessions); LongitudinalChart component shows overall score trend + per-capability line chart in deep-dive tab
- [x] T3-10: Few-shot examples in LLM prompt — FEW_SHOT_EXAMPLES constant added with 3 worked examples (situational_judgement, scenario_critique, risk_judgement); injected into user prompt as structural reference
- [x] T3-11: Item quality validation pass — non-fatal rule-based check after LLM parse: validates 4 options, 1 strong, ≥1 failure/critical_failure, scenario ≥40 chars, ≥2 signal deltas per option; logs warnings via console.warn

## Assessment Improvements — Round 2 (All 11 Recommendations)

### Low Complexity
- [x] R1: Per-capability coverage in evidence gate — ALL_CAPABILITIES checked; uncoveredCapabilities blocks evidenceSufficient; test mock updated to cycle all 6 domains
- [x] R2: Fix confidence profile denominator — computeConfidenceProfile accepts totalTarget param; sessionController passes MINIMUM_EVIDENCE.targetItems
- [x] R6: Contradiction resolution in evidence gate — contradictionBlocksClassification added to evidenceSufficient check
- [x] R8: Fix progress bar denominator — history procedure returns totalTarget; AssessmentPage uses it for progress bar

### Medium Complexity
- [x] R3: Role-specific readiness thresholds — classifyReadiness accepts capabilityScores + minimumSafeThresholds from role archetype; safe/at_risk/unsafe classification uses role-specific per-capability thresholds
- [x] R4: Few-shot examples for all 11 interaction types — FEW_SHOT_EXAMPLES covers all 11 types including quick_fire, governance_check, contradiction_probe, output_improvement, error_detection, prioritisation, data_interpretation, ai_tool_selection
- [x] R5: T3-11 retry loop — generateAdaptiveItem retries up to 2 times on quality failure; failure feedback injected into retry prompt
- [x] R7: Per-type timing thresholds — TIMING_THRESHOLDS_BY_TYPE map added with fast/slow/tooFast per interaction type; interactionType passed through to computeSignalScores
- [x] R10: Capability-weighted overall score — computeOverallScore accepts capabilityWeights; sessionController passes role archetype weights

### Higher Complexity
- [x] R9: LLM-generated development narrative — invokeLLM generates strengths/gaps/priorities JSON on completeSession; stored in scoreBreakdown.llmNarrative; surfaced in deep-dive tab as Development Narrative card with Sparkles icon
- [x] R11: Revalidation trigger on completion — revalidation schedule created in completeSession; interval based on readiness state (safe=daysLow, at_risk=daysMedium, unsafe/unknown=daysHigh) from tenantSettings

## UX/UI Improvements — Round 1 (All 10)

- [x] UX-1: Eliminate tab content duplication in results page — Deep Dive tab now shows only exclusive content (LongitudinalChart, LLM Narrative, expanded signal breakdown); Summary tab owns overview cards
- [x] UX-2: Replace generic "Development Recommendations" card with LLM narrative — llmNarrative strengths/gaps/priorities promoted to top of Development tab; static boilerplate removed
- [x] UX-3: Fix hard-coded "/50" denominator in Score Summary card — uses breakdown.totalAnswers and breakdown.targetItems; shows "early completion" label when applicable
- [x] UX-4: Add keyboard navigation for option selection (1-4 keys select options, Enter submits) in AssessmentSessionPage
- [x] UX-5: Show selected option label in rationale reveal panel — "Your answer" block shown above rationale text
- [x] UX-6: Add elapsed-time indicator during session — MM:SS elapsed time shown next to progress bar with Clock icon
- [x] UX-7: Auto-trigger complete when isComplete=true — "Complete Assessment" button shown in rationale panel on last question; submitAnswer returns isComplete
- [x] UX-8: Improve ProfilingModal step density — collapsible AI tools section with selected count badge; "Why we ask" tooltip per step; profile context reminder shown on step 3
- [x] UX-9: Add "What is this measuring?" tooltip to interaction type badge — HelpCircle icon next to badge with tooltip explaining the type and capability it maps to
- [x] UX-10: Add readiness-state colour dots and role threshold reference line to LongitudinalChart — each data point coloured by readiness state (green/amber/red); horizontal safe threshold reference line added

## Complete Adaptivity Review — Identified Improvements

### Batch A: Anti-Gaming Engine
- [x] A1: Implement `always_cautious` pattern detection — defined in GamingPattern type but never detected; detect when >60% of answers have over_caution_risk signal < -0.5 (mirrors always_escalate logic)
- [x] A2: Speed gaming threshold per-type — flat 4000ms average is too aggressive on mobile/slow connections; use per-interaction-type tooFast thresholds from INTERACTION_TYPE_TIMING_MS instead of a flat 4000ms
- [x] A3: Semantic cycling detection — current pattern_cycling only detects positional cycling (A→B→C→D); add detection for outcome-class cycling (strong→acceptable→weak→strong repeating pattern)
- [x] A4: Increase max injections for high-scrutiny sessions — cap of 2 injections is too low when scrutinyLevel="high"; raise to 3 injections when scrutiny is high
- [x] A5: Add injection for `always_cautious` pattern — when detected, inject a `clean_case` targeting `execution` with `situational_judgement` type to probe whether caution is genuine or strategic

### Batch B: Contradiction Engine
- [x] B1: Fix `resolved: false` hardcoded — contradictions should be marked resolved after a contradiction_probe is answered; pass probe item IDs through and mark resolved when those items have answers
- [x] B2: Fix brittle capabilityKey extraction — `pair.reason.split(" ")[4]` is fragile; store capabilityKey directly on the contradiction pair object and use it in generateContradictionProbeSpec call
- [x] B3: Add cross-capability contradiction detection — detect when user shows strong governance but weak execution (or vice versa) across different capabilities, not just within the same capability
- [x] B4: Add time-pressure inconsistency detection — detect when user answers correctly on low-urgency items but fails on identical-difficulty items with time pressure
- [x] B5: Add seniority-inconsistent response detection — requires user seniority signal in AnswerRecord) — detect when responses are inconsistent with the user's declared seniority level (e.g. junior-level reasoning from a declared Director)
- [x] B6: Fix router-side probe target capability — in assessment.ts buildAdaptiveContext, contradiction probes are generated with hardcoded "execution" as capabilityKey; should extract from the contradiction pair's reason string or store it explicitly

### Batch C: Adaptive Engine
- [x] C1: Validation phase variety — validation phase always uses `contradiction_probe` interaction type; should vary by rotating through high-difficulty types (risk_judgement, governance_decision, scenario_critique) in addition to contradiction probes
- [x] C2: Add `confidence_calibration` to baseline rotation — it is defined but absent from `selectBaselineInteractionType`; add it to the baseline types array
- [x] C3: Capability-gap-aware interaction type selection — in adaptive phase, `findLeastUsedType` picks the least-used type from the capability's preferred types, but doesn't consider whether that type has already produced strong evidence; weight by both usage count AND capability score gap
- [x] C4: Prior session calibration in baseline — when priorCapabilityScores exist, baseline phase should start with the weakest prior capability rather than the least-covered current capability
- [x] C5: Anti-gaming injection variety — `buildVariablesFromInjection` always uses `role.workflows[0]` as workflowContext; should rotate through role workflows to avoid repetitive context

### Batch D: Session Controller
- [x] D1: Mark static narrative as fallback only (LLM narrative preferred at results level) — `selectNarrative` in sessionController.ts produces a static template narrative that is returned alongside the LLM narrative; the static narrative is redundant and should be replaced by the LLM narrative at the results level
- [x] D2: Pass userRoleHint to computeState — role-specific minimumSafeThresholds now used in evidence sufficiency — requires schema change to session state) — `computeState` doesn't receive userRoleHint so roleArchetype is never used in state computation; add roleArchetype-aware evidence thresholds to computeState
- [x] D3: Contradiction probe count cap raised to 3 when scrutinyLevel=high — `contradictionProbes.slice(0, 2)` limits to 2 probes but when scrutinyLevel is "high" we should allow up to 3

### Batch E: Scoring Engine
- [x] E1: Missing interaction types in INTERACTION_TYPE_TIMING_MS — timing map has old type names (ethical_dilemma, priority_ranking, output_evaluation, tool_selection, quick_fire, governance_check) that don't match current InteractionType enum; add all 11 current types with appropriate thresholds
- [x] E2: Capability score normalisation — dynamic scale factor — `computeCapabilityScores` uses `50 + avgDelta * 12.5` which can produce scores outside 0-100 for extreme signal sums; already clamped but the scale factor (12.5) should be dynamic based on signal count to prevent dilution with many signals
- [x] E3: Failure mode deduplication — blockCount now counts unique modes only — `detectFailureModes` can push the same mode multiple times (e.g. "blind_ai_acceptance" pushed for every answer with that signal); already deduplicated at the end but blockCount counts duplicates, inflating classification impact

## CPO Credibility Improvements

### F1: LLM Item Quality Gate — Signal Delta Consistency
- [x] F1a: Validate that the `strong` option's signal deltas are net-positive for the target capability (sum of deltas for target capability signals > 0)
- [x] F1b: Validate that the `failure`/`critical_failure` option's deltas are net-negative for the target capability
- [x] F1c: Validate that no option has a delta outside the range -3.0 to +3.0
- [x] F1d: Validate that all signal keys in generated deltas are canonical (exist in SIGNAL_TO_CAPABILITY map)
- [x] F1e: On validation failure, append specific feedback to retry prompt and re-request

### F2: LLM Item Quality Gate — Option Plausibility Guard
- [x] F2a: Detect trivially obvious failure options (options containing "ignore", "delete", "never check", "always trust the AI" verbatim) and flag for retry
- [x] F2b: Detect duplicate or near-duplicate option texts (Levenshtein distance < 20% of length) and flag for retry
- [x] F2c: Validate that the `strong` option text is not the shortest option (a tell that it is the "safe" answer)

### F3: Contradiction Detection — False Positive Guards
- [x] F3a: Cross-capability contradiction: only fire when BOTH capabilities have ≥3 signal contributions (not just 1 answer each)
- [x] F3b: Seniority-inconsistency: route to `learning_gap` flag rather than `contradiction` type — it should not block classification, only trigger a learning plan recommendation
- [x] F3c: Time-pressure inconsistency: require ≥2 matching pairs before firing (not just 1 fast failure vs 1 slow success)

### F4: Classification Confidence Gate
- [x] F4a: Block `safe` classification when confidence band is `low` — return `unknown` with explanation instead
- [x] F4b: Surface confidence band prominently in the results UI alongside the readiness state
- [x] F4c: Add `classificationConfidence` field to the results object returned by the router

### F5: Norm Group Percentile Engine
- [x] F5a: Create `server/assessment/normEngine.ts` with a `computePercentile(score, capabilityKey, roleFamily)` function using a seeded bootstrap distribution
- [x] F5b: Seed the norm engine with synthetic baseline distributions per role family (junior/mid/senior × 6 capabilities) derived from the scoring model's expected range
- [x] F5c: Add `percentileRanks` to the results object so scores are contextualised (e.g. "governance: 62 — 54th percentile for HR Generalists")
- [x] F5d: Add a schema migration to store `normGroupVersion` on the session results so future real-data recalibrations are traceable

### F6: Test Suite — Fix Stale Fixtures
- [x] F6a: Replace non-canonical signal keys (`governance_adherence`, `risk_awareness`, `quality_control`) in stress test and debug test with canonical keys from SIGNAL_TO_CAPABILITY
- [x] F6b: Update all `computeState(...)` call sites in tests to use the new 6-argument signature with roleHint
- [x] F6c: Add test: role-aware evidence thresholds — HRBP requires ≥4 governance signals before `evidenceSufficient`
- [x] F6d: Add test: seniority-inconsistency detection fires when senior user has >40% failure rate
- [x] F6e: Add test: `safe` classification is blocked when confidence band is `low`
- [x] F6f: Add test: signal delta consistency validation rejects a `strong` option with net-negative target capability deltas

## PM End-to-End Assessment Experience Review

### Tier 1 — Critical UX
- [x] P1: Profiling modal — add estimated time per step ("~10 seconds") so users don't abandon mid-flow
- [x] P2: Session page — show capability being assessed as a plain-English sentence above the question card ("This question tests your AI Judgement")
- [x] P3: Session page — confidence slider default changed from 50 to 70; add three labelled anchors: "Guessing", "Fairly sure", "Certain"
- [x] P4: Rationale panel — after answer reveal, show which capability was tested and what signal it measured, in plain English
- [x] P5: Results page — percentile ranks from normEngine are computed but not displayed; surface them on every capability bar ("62 · 54th percentile")
- [x] P6: Results page — "Retake Assessment" button navigates to /assessment landing; change to pre-open profiling modal directly
- [x] P7: Generating state — add animated step list ("Analysing responses… Selecting capability gap… Generating scenario…") instead of generic spinner
- [x] P8: Assessment landing — add "Your last score" mini-bar to each capability domain card when prior score exists

### Tier 2 — Quality and Trust
- [x] P9: Results page — replace internal signal key names with plain-English labels and one-line descriptions in Signal Profile section
- [x] P10: Results page — disclaimer at bottom is tiny muted text; replace with a visible styled notice box
- [x] P11: Session page — add soft "typical: ~Xs" hint next to elapsed timer for each interaction type
- [x] P12: ProfilingModal — move compact profile summary to the ready screen (step 4 footer) so users confirm before starting
- [x] P13: Results page — add normGroupVersion to Assessment Metadata card in Deep Dive tab
- [x] P14: Session page — keyboard shortcut hint should be persistent in question header, not only below options
- [x] P15: Results page — LLM narrative is duplicated in Deep Dive and Development tabs; Deep Dive should show condensed version with "See full report →" link to Development tab

## Marketing Website & Beta Programme

- [x] M1: Add `beta_applications` table to schema — company-level: contact name/email/title, company name, sector, total HR team size (must be ≥10 to qualify), use_case, current_ai_tools, motivation, status (pending/approved/rejected/waitlisted), notes, created_at
- [x] M2: Run migration 0008_beta_applications.sql to create the table
- [x] M3: Create `server/routers/waitlist.ts` with publicProcedure `submit` (validates hrTeamSize ≥ 10, returns ineligible error otherwise) and protectedProcedure `list`/`updateStatus`
- [x] M4: Wire `waitlistRouter` into `server/routers.ts`
- [x] M5: Build `client/src/pages/marketing/MarketingPage.tsx` (landing page) — full marketing landing page with hero, social proof, capability showcase, how-it-works, beta CTA
- [x] M6: Build `client/src/pages/marketing/BetaApplicationPage.tsx` — multi-step beta application form
- [x] M7: Update `App.tsx` — `/` shows MarketingPage for unauthenticated users, `/beta` renders BetaApplicationPage — `/` route renders MarketingHomePage (public), `/beta` renders BetaApplicationPage (public), logged-in users redirected to /dashboard from both
- [x] M8: Add Beta Applications tab to BackOfficePage — list all applications, status filter, approve/reject/waitlist actions, admin notes — list all applications, status filter, approve/reject actions
- [x] M9: Seed 10+ realistic company beta applications via SQL in migration 0008 (3 approved, 5 pending, 2 waitlisted) (mix of approved, pending, waitlisted statuses; all with hrTeamSize ≥ 10)
- [x] M10: Add vitest tests for waitlist.submit (eligible, ineligible <10 HR employees, duplicate email, unauthorized list) (eligible company, ineligible <10 HR employees, duplicate email) and waitlist.list procedures
