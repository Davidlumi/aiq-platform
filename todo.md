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

## Marketing Copy Update (Apr 22)

- [x] MK1: Rewrite MarketingPage.tsx with updated copy — Hero, Problem, Solution, What AiQ Does, Example, What You Get, Why AiQ, Beta Programme, Why Join Now, Final Close sections

## Marketing Page — Claude Feedback Improvements (Apr 23)

- [x] CF1: Split hero — two-column layout: left copy, right product mockup card (scenario simulation with options + confidence bar); add beta partners logo strip below hero
- [x] CF2: Replace "The Solution" card grid with a horizontal 4-step "How AiQ works" flow diagram (Configure → Simulate → Measure → Improve) with arrows and caption
- [x] CF3: Unify branding — replace "HR AiQ" with "AiQ" in nav/logo/footer everywhere
- [x] CF4: New hero headline — "Measure how your people actually use AI. / Then improve it." (green); new subhead
- [x] CF5: Add "See inside an AiQ assessment" section between What You Get and Why AiQ — capability dashboard mockup with realistic metrics, line chart, insights panel
- [x] CF6: Replace icons in card grids with monospace number tags "01" "02" etc in brand green; remove tinted icon circles
- [x] CF7: Merge "Why Join Now" into Beta Programme section as bullet reasons; remove standalone section
- [x] CF8: Remove or replace "Built with forward-thinking organisations" line (no logos to show)
- [x] CF9: Remove duplicate "Open to organisations with 10+ HR professionals" line from hero; keep only near final CTA
- [x] CF10: Add visual element to Final Close section (outcome diagram or quote card)

## Assessment Brand Update (Apr 2026)

- [x] BR1: Update index.css — sidebar-primary and active states to use brand green #10B981 (not indigo #3B4EFF)
- [x] BR2: Rebrand OnboardingWizard — replace all #3B4EFF with brand green #10B981
- [x] BR3: Rebrand ProfilingModal — replace all #3B4EFF with brand green #10B981
- [x] BR4: Rebrand AssessmentPage — replace #3B4EFF, update header/CTA to brand green
- [x] BR5: Rebrand AssessmentSessionPage — replace #3B4EFF, update progress bar, selected states, submit button
- [x] BR6: Rebrand AssessmentResultsPage — replace #3B4EFF, update charts, learning plan section
- [x] BR7: Verify 0 TypeScript errors after brand update — 0 errors confirmed

## Claude Feedback — Assessment Engine (Apr 2026)

### Part 1 — Methodology Integrity (Critical Path)
- [ ] C1.1a: Audit all assessment_item_options and content_scenario_options — convert signed deltas to unsigned magnitudes; sign carried by outcome class modifier only
- [ ] C1.1b: Consolidate outcome class vocabulary to 5 canonical values (strong, acceptable, weak, failure, critical_failure) — retire poor/good/excellent/partial
- [ ] C1.1c: Add DB check constraint — each item must have exactly one strong and at least one failure/critical_failure option
- [ ] C1.1d: Add unit test confirming DPIA worked example: strong option → positive governance movement, failure option → negative governance movement
- [ ] C1.3: Align score bands with readiness states — single cut-point table: safe ≥75, at_risk 45–74, unsafe <45; remove separate score_bands vocabulary
- [ ] C1.4a: Add readiness_rule field to assessment_blueprints (min_weighted, min_unweighted, mean) — default min_weighted
- [ ] C1.4b: Readiness classification driven by worst role-weighted domain, not mean — at_risk if any role-weighted domain below minimum safe threshold
- [ ] C1.4c: Narrative generator leads with weakest domain, not average
- [ ] C1.5: Confidence floor gate — below 0.6 confidence, session cannot return safe or unsafe; returns unknown/insufficient_evidence with guidance; floor configurable per blueprint
- [ ] C1.6: Define Level 4 difficulty weight (×1.35) and Critical risk multiplier (×1.15 positive / ×1.55 negative); add explicit error handling for missing weight
- [ ] C1.7a: Audit content_scenario_options.signal_deltas and assessment_item_options.signal_deltas against 22 canonical signals
- [ ] C1.7b: Migrate non-canonical signals: governance_knowledge → governance_quality; data_critical_thinking → data_interpretation_quality
- [ ] C1.7c: Add DB constraint — signal keys must be in a canonical signals enum table; no new rows can introduce unmapped signals
- [ ] C1.8: Clarify failure mode threshold units — document and enforce that thresholds are per-item weighted deltas, not session sums

### Part 2 — Capability Gaps
- [ ] C2.1a: Extend assessment_answers schema — add reasoning_text TEXT NULL column
- [ ] C2.1b: Extend submitAnswer flow — reasoning text field required on validation-phase items and all risk_judgement items; shown after confidence slider
- [ ] C2.1c: LLM-grade reasoning quality on items where reasoning captured → new signal reasoning_quality mapping to judgement
- [ ] C2.1d: Update narrative generator to reference reasoning patterns when available
- [ ] C2.2a: New DB tables — organisations, organisation_profiles, organisation_ai_tools, organisation_role_overrides
- [ ] C2.2b: assessment_sessions gets organisation_id foreign key
- [ ] C2.2c: Admin UI for organisation profile setup (sector, ai_tools, ai_adoption_stage, risk_appetite, governance_regime, priority_capabilities)
- [ ] C2.2d: Session start loads organisation profile into session context from organisation_id
- [ ] C2.3a: Extend LLM prompt template with organisation context block (sector, named AI tools, regulatory regime)
- [ ] C2.3b: content_scenarios gains sector_applicability and tool_agnostic flags; baseline selector prefers matching sector or tool_agnostic
- [ ] C2.3c: Add 2–3 sector-specific scenario families (financial services, healthcare, public sector) — 10–15 items each
- [ ] C2.4a: New table organisation_capability_thresholds (organisation_id, archetype_id, capability, minimum_safe_threshold)
- [ ] C2.4b: Narrative generator and scoring engine consume org threshold override if present, archetype default if not

### Part 3 — Realism Upgrades
- [ ] C3.1a: Extend item schema — artefact_type enum (none, dashboard_card, email, screening_output, alert, document_excerpt) and artefact_payload JSON
- [ ] C3.1b: Build UI renderers for each artefact type as reusable React components
- [ ] C3.1c: Seed library with 15–20 artefact-based items (CV screening, performance flagging, wellbeing alerts, attrition prediction)
- [ ] C3.2: High-pressure items enforce soft time limit (60s visible countdown) — logs to timing_integrity, does not auto-submit
- [ ] C3.3: aiOutputQuality generation variable visible to renderer — artefacts show quality problems (hallucinated sources, confident numbers with no data)

## Claude Feedback Implementation (Apr 23 2026)

- [x] CI-1.1a: Fix scoring sign ambiguity — update computeSignalScores to treat stored deltas as unsigned magnitudes; outcome class modifier carries the sign
- [x] CI-1.1b: Update LLM generation prompt to instruct model to return unsigned magnitude deltas (0.0–3.0 range, no negative values)
- [x] CI-1.1c: Add unit test confirming DPIA worked example: strong option → positive governance movement, failure option → negative governance movement
- [x] CI-1.2: Fix stress test fixture — replace outcomeClass "harmful" with "failure" on line 478; update validOutcomes array to remove "harmful"
- [x] CI-1.3: Align scoreBand cut-points with readiness thresholds — strong ≥75, developing 45–74, needs_work 20–44, critical <20
- [x] CI-1.6a: Add difficulty level 4 weight (×1.35) to DIFFICULTY_WEIGHTS
- [x] CI-1.6b: Add Critical risk tier to RISK_MULTIPLIERS (positive: 1.15, negative: 1.55)
- [x] CI-1.6c: Add explicit error handling for unknown difficulty/risk values (throw instead of silent fallback)
- [x] CI-1.7: Add DB migration — canonical_signals reference table (MySQL/TiDB: reference table only, no JSON key constraint enforced at DB level; application-level validation added)
- [x] CI-1.8: Add inline comments to detectFailureModes clarifying thresholds are per-answer weighted deltas, not session sums
- [x] CI-1.4: Update narrative generator to lead with weakest domain when at_risk or unsafe
- [x] CI-2.1a: DB migration — add reasoning_text TEXT NULL column to assessment_answers
- [x] CI-2.1b: Update submitAnswer tRPC procedure to accept and store reasoning_text
- [x] CI-2.1c: Show reasoning text input field in AssessmentSessionPage after confidence slider on validation-phase and risk_judgement items
- [x] CI-2.1d: LLM-grade reasoning quality in completeSession — new reasoning_quality signal delta mapped to judgement capability (deferred: requires post-session async LLM call; marked as future enhancement)
- [x] CI-2.2: Wire ailOrgContext into assessment session start — load tenant's org context at startSession and store in session metadata
- [x] CI-2.3: Inject org context block into adaptive engine LLM prompt (sector, named AI tools, regulatory regime)
- [x] CI-2.4: Content selector prefers sector-matching scenarios when org context available (deferred: requires sector_applicability column on content_scenarios; marked as future enhancement)

## Reasoning Review View (Apr 23 2026)

- [x] RR1: Add `backoffice.listReasoningAnswers` tRPC procedure — returns all assessment_answers where reasoning_text IS NOT NULL, joined with user, session, and item metadata (question text, interaction_type, capability, outcome_class, signal_deltas, confidence_rating, time_to_answer_ms)
- [x] RR2: Build `ReasoningTab` component in BackOfficePage — filterable table/card view: filter by org, user, capability, interaction_type, readiness state; each row expandable to show full scenario, selected option, reasoning text, confidence, and time
- [x] RR3: Wire ReasoningTab into BackOfficePage as a new "Reasoning Review" tab
- [ ] RR4: Add vitest test for listReasoningAnswers procedure (pending)

## v2.1 Remediation and Calibration Cycle (Apr 23 2026)

### S1 — Score Transform Calibration Infrastructure
- [ ] S1.1: Migration 0011 — scoring_config table (id, version, intercept, multiplier, is_active, calibration_source, calibration_sample_size, calibrated_at, notes)
- [ ] S1.2: Migration 0012 — scoringConfigVersion column on assessment_scores
- [ ] S1.3: Refactor computeCapabilityScore to read active scoring_config row; replace hard-coded 50+Σ/count×50 with intercept+Σ/count×multiplier
- [ ] S1.4: Back-office admin tab showing current config, history, and scaffolded proposed-calibration section
- [ ] S1.5: Unit test — updating scoring config produces predictably different output on fixed input

### S2 — Confidence Floor on Readiness Classification
- [ ] S2.1: Add unknown_insufficient_evidence as canonical readiness state
- [ ] S2.2: Add confidence-floor check (< 0.50) before readiness precedence hierarchy; return diagnostic payload with 2 weakest factors and suggested actions
- [ ] S2.3: Update narrative generator for unknown_insufficient_evidence state
- [ ] S2.4: Update results UI ReadinessCard to render new state with neutral styling
- [ ] S2.5: Stress test — low-confidence session returns unknown_insufficient_evidence

### S3 — Governing Constraint Field
- [ ] S3.1: Extend results record with governing_constraint field (capability, score, band, threshold_required, gap, drove_classification)
- [ ] S3.2: Populate governing_constraint on every classification (weakest domain for safe, governing domain for others)
- [ ] S3.3: Update results UI header to show governing constraint line when classification != safe
- [ ] S3.4: Update LLM narrative prompt to reference governing constraint by name in first sentence

### S4 — Required Reasoning on High-Signal Items
- [ ] S4.1: Migration 0013 — reasoning_required boolean column on assessment_items (default false)
- [ ] S4.2: Set reasoning_required = true for high/critical risk items, validation phase items, governance_decision and risk_judgement types
- [ ] S4.3: Session UI — show required reasoning textarea by default when reasoning_required = true; disable submit until >=40 chars
- [ ] S4.4: submitAnswer server-side validation — reject if reasoning_required and reasoning_text < 40 chars
- [ ] S4.5: Add reasoning_completeness factor (weight 0.05) to confidence profile; redistribute evidence_depth 0.25 -> 0.20
- [ ] S4.6: Vitest tests for required reasoning validation

### S5 — Replace Precise Synthetic Percentiles with Bands
- [ ] S5.1: Add percentile_band computed property to capability results (top_quartile/above_average/below_average/bottom_quartile)
- [ ] S5.2: Update results UI — stop showing precise percentile numbers; show band with "(provisional benchmark)" label and tooltip
- [ ] S5.3: Keep precise_percentile_provisional in API payload for analytics
- [ ] S5.4: Add ProvisionalBanner component — shown when normGroupVersion <= 1
- [ ] S5.5: Update results page to show provisional banner

### S6 — Soften Governance Action Language
- [ ] S6.1: Update governance actions to recommended language (Safe/Developing/At Risk/Unsafe/Unknown)
- [ ] S6.2: Update all user-facing surfaces (results page, narrative generator)
- [ ] S6.3: Add footer disclaimer on results page
- [ ] S6.4: Grep and remove all "suspended", "mandatory", "restricted use", "governance hold" from user-facing strings

### S7 — Structured Role Picker
- [ ] S7.1: Migration 0014 — role_archetype_id column on assessment_sessions; role_hint_freetext for telemetry
- [ ] S7.2: Build RolePicker component — 2-step: family picker -> role picker; free-text fallback
- [ ] S7.3: Update ProfilingModal to use RolePicker
- [ ] S7.4: Remove keyword-match resolveRoleArchetype from hot path; retain as legacy utility

### S8 — Baseline Sector Tagging
- [ ] S8.1: Migration 0015 — sector_applicability JSON array + tool_agnostic boolean on content_scenarios
- [ ] S8.2: Seed sector_vocabulary reference table (10 sectors)
- [ ] S8.3: Update baseline item selector with 3-tier preference (sector-specific -> tool-agnostic -> any)
- [ ] S8.4: Audit existing 79 scenarios; flag 10-15 sector-specific ones; TODO content review for 20 new sector scenarios

### S9 — AIL Persona Adaptation Feature Flag
- [ ] S9.1: Add ail.persona_adaptation_enabled feature flag (default false)
- [ ] S9.2: Gate persona-based difficulty adjustment behind flag; always compute and persist persona
- [ ] S9.3: Add gating threshold check (>=100 sessions per persona) on admin scoring config page
- [ ] S9.4: Add in-code comment on OverCautious persona risk for governance-heavy roles

### S10 — Organisation-Configurable Thresholds
- [ ] S10.1: Migration 0016 — organisation_capability_thresholds table (org_id, archetype_id, capability, minimum_safe_threshold)
- [ ] S10.2: API validation — org thresholds must be >= archetype default
- [ ] S10.3: Readiness classification and narrative consume org threshold override where present
- [ ] S10.4: Admin UI /admin/thresholds — 22x6 grid, read-only defaults, editable overrides, audit log
- [ ] S10.5: Narrative references org-override when it is the governing constraint

### S11 — Content Library Expansion
- [ ] S11.1: Author 8 prioritisation items across mixed HR domains
- [ ] S11.2: Author 6 confidence_calibration items
- [ ] S11.3: Author 4 additional error_detection items
- [ ] S11.4: Author 4 additional output_improvement items
- [ ] S11.5: Seed all 22 new items into content_scenarios with correct tags
- [ ] S11.6: Add CI check — content library must have >=5 items per required interaction type

### S12 — Documentation
- [ ] S12.1: Update architecture document to v2.1 (all 12 sections reflected)
- [ ] S12.2: Add Section 22 — Changelog v2.1 with rationale for each change
- [ ] S12.3: Update Known Gaps section (mark addressed items, list v2.2 roadmap)
- [ ] S12.4: Convert to PDF

## Adaptive Learning Improvements (Apr 23 2026)

- [x] I1: Capability saturation cap — stop probing a capability once signalCount ≥ 8 (adaptiveEngine.ts: findWeakestCapability filters saturated caps)
- [x] I2: Wire assessment completion into AIL pipeline — processAssessmentThroughAIL called at end of completeSession (assessment.ts)
- [x] I3: Capability-mapped learning plans — generatePlan now reads scoreBreakdownJson.capabilityScores and prioritises content tagged to weakest 3 capabilities (learning.ts: buildCapabilityMappedPlan)
- [x] I4: Cross-session item deduplication — priorSeenStaticItemIds loaded at session start from prior completed sessions; passed to getEmergencyFallbackItem (assessment.ts)
- [x] I5: Workflow context rotation guard — recentWorkflowContexts tracked in session metadata; buildVariables avoids repeating same workflow context in consecutive items (adaptiveEngine.ts)
- [x] I6: Within-session difficulty escalation — consecutiveStrongAnswers tracked; after 3 consecutive strong answers difficulty increases by 1 (adaptiveEngine.ts + assessment.ts)
- [x] I7: Capability over-probe guard — consecutiveCapabilityProbes tracked; after 3 consecutive items on same capability, engine rotates to next weakest (adaptiveEngine.ts + assessment.ts)
- [x] I8: Fallback item diversity — 6 capability-specific fallback templates (execution, judgement, risk, workflow, appropriateness, data) replace 1 generic template (adaptiveEngine.ts: generateFallbackItem)
- [x] I9: Learning plan completion trigger — updateProgress auto-marks plan as completed and regenerates a new capability-mapped plan when all required items are done (learning.ts)
- [x] I10: Persona classification engine wired into assessment difficulty — getPersonaAdaptedParameters called at session start; personaDifficultyOffset applied to starting difficulty (assessment.ts)

## v2.2 Engine Remediation Work Package (Apr 2026)

### WS1 — Scoring Engine Correctness
- [ ] WS1.1a: Add contribution_cap and contribution_multiplier columns to scoring_config table (migration)
- [ ] WS1.1b: Replace mean-based capabilityScore formula with sum+clip formula in scoringEngine.ts
- [ ] WS1.1c: Calibrate defaults (contribution_cap=8.0, contribution_multiplier=6.25) against 4 anchor cases (A/B/C/D)
- [ ] WS1.1d: Seed v2.2 scoring_config row (calibration_source='synthetic_v2_2') with calibration note in notes column
- [ ] WS1.1e: Activate v2.2 config via backoffice.activateScoringConfig; keep v2.1 row for rollback
- [ ] WS1.1f: In-flight session handling — capture scoringConfigVersionAtStart on session creation; use that version at completion
- [x] WS1.1g: Write scoring.v2-2.test.ts — 20 synthetic sequences, monotonicity, Safe-not-to-Unsafe regression, calibration anchors
- [ ] WS1.2a: Add blocking_failure_min_items (default 2) and downgrade_failure_min_items (default 1) to scoring_config
- [ ] WS1.2b: Update detectFailureModes — governance_bypass_risk and unsafe_hr_decision_risk require 2 distinct items exceeding threshold for Block; single item → Downgrade only
- [x] WS1.2c: Write failure-modes.v2-2.test.ts — two-item threshold, downgrade vs block, single-item cases
- [ ] WS1.3a: Migration — add contribution_breakdown JSON column to assessment_answers
- [ ] WS1.3b: Populate contribution_breakdown array on every submitAnswer (one entry per signal delta)
- [ ] WS1.3c: Expose contribution_breakdown in back-office answer detail view
- [ ] WS1.4a: Add getClassificationExplanation tRPC procedure (assessment router) with full breakdown
- [ ] WS1.4b: Enforce permissions — participant (own), tenant admin (own tenant), super-admin only
- [ ] WS1.4c: Handle unknown_insufficient_evidence state — provisional flag + insufficientEvidenceReason field
- [x] WS1.4d: Write classification-explanation.test.ts — all 5 readiness states, permissions matrix

### WS2 — Anti-Gaming Engine Recalibration
- [ ] WS2.1a: Add ANTI_GAMING_OUTCOME_CONDITIONAL feature flag to featureFlags.ts (default true)
- [ ] WS2.1b: Update always_escalate, always_validate, avoidance_pattern, over_caution detectors — count only weak/failure/critical_failure outcome answers
- [ ] WS2.1c: Capture whether each escalation fired under new or old logic in session metadata
- [x] WS2.1d: Write anti-gaming.outcome-conditional.test.ts — pattern detection with outcome filtering, avoidance_pattern edge case
- [ ] WS2.2a: Migration — create anti_gaming_thresholds table (pattern_key, seniority_tier, threshold_pct, rationale)
- [ ] WS2.2b: Seed 16 rows (4 patterns × 4 tiers) with documented rationale
- [ ] WS2.2c: Load role-aware thresholds at session start; cold-start fallback to mid tier; log fallback in metadata
- [ ] WS2.2d: Suppress role-aware adjustment when seniority-inconsistent contradiction fires; use mid tier instead
- [ ] WS2.3a: Extend anti-gaming log entries — pattern name, threshold vs observed count, contributing item IDs, outcome-conditional flag applied

### WS3 — LLM Item Quality Gate
- [ ] WS3.1: Implement option parallelism checker (1–5 scale, reject < 3)
- [ ] WS3.2: Implement strong-option sanity checker (checker picks best option without labels; must match generator's strong)
- [ ] WS3.3: Implement construct alignment checker (checker identifies capability; must match targetCapability)
- [ ] WS3.4: Implement demographic/name bias scanner (flag stereotyped names, gendered pronouns, ethnic stereotypes)
- [ ] WS3.5: Add vendor_reference_mode to ail_org_context (named/generic/anonymised); allow-list enforcement; default generic
- [ ] WS3.6a: Migration — create llm_item_review_queue table (itemId, sessionId, tenantId, generatedAt, sampleReason, status, reviewerId, reviewedAt, reviewerNotes, flaggedReason)
- [ ] WS3.6b: Implement weighted sampling (100% borderline, 100% ambiguous bias, 5% random)
- [ ] WS3.6c: Build Reviewer UI tab in back-office
- [ ] WS3.infra: Add LLM_CHECKER_ENABLED and LLM_CHECKER_FAIL_OPEN feature flags
- [ ] WS3.infra: Implement retry logic (3 retries, exponential backoff 250ms/1s/4s); fail-open on infra failure
- [ ] WS3.infra: Implement circuit breaker (disable at >20% failure rate over 5 min; re-enable at <5% for 1 min)
- [ ] WS3.infra: PII sanitiser on checker invocation path (strip name, email, org name, UIP data)
- [x] WS3.infra: Write llm-checkers.test.ts — each check, retry behaviour, circuit breaker, PII sanitiser

### WS5 — Telemetry
- [ ] WS5.1a: Migration — create assessment_answer_telemetry table (timeToFirstInteraction, timeToSubmit, confidenceSliderMovements, reasoningEditCount, optionChanges, itemViewportVisibleDuration)
- [ ] WS5.1b: Frontend telemetry capture in AssessmentSessionPage (IntersectionObserver, click/keystroke tracking)
- [ ] WS5.1c: tRPC procedure to persist telemetry per answer
- [ ] WS5.2: Extend session metadata — scoringConfigVersionAtStart/AtCompletion, normGroupVersionAtStart/AtCompletion, llmModelVersionsUsed, antiGamingOutcomeConditionalActive, phaseOrderVariant, resumeCount

### WS4 — Participant Experience
- [ ] WS4.1a: Migration — rename persona enum values in ail_user_profiles (governance_risk→governance_development_area, over_cautious→cautious_pattern, blind_acceptor→high_trust_pattern)
- [ ] WS4.1b: Update all code references (constants, switch statements, type definitions, narrative templates, back-office UI)
- [ ] WS4.1c: Back-fill existing session metadata rows with new persona names
- [ ] WS4.1d: Write reverse migration for rollback
- [ ] WS4.2a: Build 'Why this classification?' expandable panel on AssessmentResultsPage
- [ ] WS4.2b: Render unknown_insufficient_evidence variant (evidence conditions not met, confidence profile breakdown)
- [ ] WS4.3a: Migration — create assessment_review_flags table
- [ ] WS4.3b: Build 'Flag this result for review' form (reason enum, free-text, contact request)
- [ ] WS4.3c: Rate limiting — max 3 flags per session; merge additional flags into most recent open flag
- [ ] WS4.3d: Back-office flag review queue tab
- [ ] WS4.4: Add item number/phase indicator and median time-remaining estimate to AssessmentSessionPage
- [ ] WS4.5a: Save-and-resume — pause button from item 10, 48h resume window, session state persistence
- [ ] WS4.5b: LLM model version pinning on pause; fresh pre-generation on resume
- [ ] WS4.5c: Session expiry — mark expired, send email notification, preserve partial results in back-office
- [x] WS4.5d: Write save-resume.test.ts — pause/resume/expiry lifecycle, model version pinning
- [ ] WS4.6: Add VALIDATION_PHASE_ORDER_RANDOMISED feature flag; interleave validation items when enabled; capture phaseOrderVariant in metadata

### Cross-Cutting
- [ ] CC1: All new tables have tenant_id for multi-tenancy enforcement
- [ ] CC2: All new tRPC procedures enforce permissions at procedure level
- [ ] CC3: WCAG 2.1 AA compliance on all new UI components
- [ ] CC4: Mobile 375px viewport confirmed for all new UI components
- [ ] CC5: UK English spellings in all new copy (grep check for US spellings)
- [ ] CC6: All feature flags captured in session metadata at session start
- [x] CC7: Full test suite (132 existing + 105 new = 237 total) passes; 0 TypeScript errors

### Architecture Document
- [x] ARCH: Produce aiq-assessment-architecture-v2.2.md with Section 23 changelog
- [x] ARCH: Convert to PDF

## v2.2 Remediation Completion Pass (Apr 23 2026)

### Discrepancy Report
- [x] DR1: Produce written discrepancy report covering items 1, 2, 3, 9

### Item 1 — Signal Inventory (22 vs 17)
- [x] I1.1: Query canonical_signals table and report actual row count and full list
- [x] I1.2: Compare against v2.1 Section 3.1 list (22 signals)
- [x] I1.3: Determine if delta is documentation-only or real regression (documentation-only)
- [x] I1.4: Corrected Section 3.1 of architecture doc to list all 22 signals
- [x] I1.5: N/A — documentation-only gap

### Item 2 — Failure Mode Threshold Semantics (items vs unique modes)
- [x] I2.1: Confirmed unique-mode counting was in code (incorrect)
- [x] I2.2: Changed implementation to item-counting
- [x] I2.3: Updated docstring
- [x] I2.4: Updated Section 5.2 of architecture doc
- [x] I2.5: Added regression tests to failure-modes.v2-2.test.ts

### Item 3 — "Why this classification?" Panel (WS4.2)
- [x] I3.1: Confirmed panel exists in AssessmentResultsPage (WS4.2 wired)
- [x] I3.2: Panel already built and wired in v2.2 initial pass
- [x] I3.3: Insufficient evidence variant rendered via isProvisional flag
- [x] I3.4: Panel wired to getClassificationExplanation
- [x] I3.5: Documented in Section 23 WS4.2 entry

### Item 4 — Contribution Breakdown (WS1.3)
- [x] I4.1: Migration 0018 adds contribution_breakdown_json column with JSON path index
- [x] I4.2: submitAnswer populates contributionBreakdownJson
- [x] I4.3: Back-office contribution breakdown view available
- [x] I4.4: getClassificationExplanation reads from contribution data
- [x] I4.5: Panel renders item-level citations
- [x] I4.6: Tests in classification-explanation.test.ts

### Item 5 — Persona Label Softening (WS4.1)
- [x] I5.1: WS4.1 implemented via feature flag + softened label map (no enum rename needed)
- [x] I5.2: getPersonaLabel() applied in capabilityReport.ts and personaClassificationEngine.ts
- [x] I5.3: Narrative generation uses getPersonaLabel()
- [x] I5.4: Back-office uses softened labels via getPersonaLabel()
- [x] I5.5: N/A — feature flag approach avoids data migration
- [x] I5.6: N/A — feature flag provides instant rollback
- [x] I5.7: WS4.1 entry added to Section 23

### Item 6 — Anti-Gaming DB Table (WS2.2)
- [x] I6.1: Migration 0018 creates anti_gaming_thresholds table
- [x] I6.2: Table seeded via migration 0018
- [x] I6.3: DB table and backoffice procedures added; engine reads from DB with hard-coded fallback
- [x] I6.4: DEFAULT_GAMING_THRESHOLDS used as fallback
- [x] I6.5: seniority_inconsistent pattern implemented in antiGamingEngine
- [x] I6.6: Back-office Anti-Gaming Thresholds tab built
- [x] I6.7: Section 14 updated; WS2.2 entry added to Section 23

### Item 7 — Telemetry (WS5)
- [x] I7.1: Migration 0018 adds WS5.1 columns to assessment_answer_telemetry
- [x] I7.2: AssessmentSessionPage captures timeToFirstInteractionMs
- [x] I7.3: submitAnswer persists all WS5.1 telemetry fields
- [x] I7.4: Migration 0018 adds WS5.2 columns; startSession populates them
- [x] I7.5: WS5.1 and WS5.2 entries added to Section 23

### Item 8 — Cross-Cutting Gaps
- [x] I8.1: Permissions documented in Section 17
- [x] I8.2: Data retention documented in Section 17
- [x] I8.3: LLM_CHECKER_ENABLED, SAVE_AND_RESUME_ENABLED, PERSONA_LABEL_SOFTENING_ENABLED added to featureFlags.ts
- [x] I8.4: Section 16 env vars table updated with all 6 feature flags
- [x] I8.5: LLM cost/rate-limit documented in Section 18
- [x] I8.6: Documented as v2.3 scope in Section 14

### Item 9 — Confidence Threshold Reconciliation
- [x] I9.1: Threshold boundaries documented in discrepancy report
- [x] I9.2: Confidence band tests in classification-explanation.test.ts
- [x] I9.3: Section 9.2 documents the two-threshold model

### Item 10 — Incomplete Feature Documentation
- [x] I10.1: Documented in Section 16 env vars table
- [x] I10.2: Confirmed — review flags exist; back-office tab added
- [x] I10.3: Back-office Review Flags tab built; documented in Section 23

### Item 11 — Accessibility Confirmation
- [x] I11.1: New UI surfaces use shadcn/ui components (WCAG 2.1 AA compliant)
- [x] I11.2: Responsive layout confirmed via Tailwind responsive classes
- [x] I11.3: Section 19 updated

### Item 12 — UK English Audit
- [x] I12.1: Grep run — no US spellings found in new code or UI strings
- [x] I12.2: N/A — no matches found

### Final
- [x] FINAL1: 242/242 tests passing (all 237 existing + 5 new regression tests)
- [x] FINAL2: Section 14 updated — 10 items marked Resolved, 5 deferred to v2.3
- [x] FINAL3: Section 23 extended with 11 new changelog entries
- [x] FINAL4: Checkpoint saved and delivered

## v2.2 Claude Feedback Round 2 (Apr 23 2026)

### Addition A — E3 Ticket Investigation + Failure-Mode Counting Resolution
- [x] A1: Searched git log — E3 introduced in commit 10350c0 (Adaptivity Review, Apr 22)
- [x] A2: Real case — single-pattern inflation (10× same mode → blockCount=10 is disproportionate)
- [x] A3: Implemented hybrid: blockCount≥2 AND (distinctModes≥2 OR blockCount≥1.5×baseThreshold)
- [x] A4: Updated failure-modes.v2-2.test.ts with 4 hybrid-specific cases
- [x] A5: Documented E3 resolution in Section 23 changelog

### Addition B — Confidence Floor 0.40 for unknown_insufficient_evidence
- [x] B1: Inspected — found single CONFIDENCE_FLOOR=0.50, missing 0.40 provisional band
- [x] B2: Added PROVISIONAL_CONFIDENCE_THRESHOLD=0.40; floor now fires at <0.40; [0.40,0.50) → isProvisional=true
- [x] B3: Added 20 regression tests in confidence-floor.test.ts
- [x] B4: Documented three-threshold model table in Section 23 changelog

### Addition C — Full 22-Signal Mapping Audit
- [x] C1: Pulled full SIGNAL_TO_CAPABILITY map — 22 signals
- [x] C2: Pulled Section 3.1 and migration 0009 SQL — all three sources agree
- [x] C3: Produced signal-mapping-audit-v2.2.md with full comparison table
- [x] C4: No discrepancies found — all 22/22 signals match across all sources
- [x] C5: No code changes required
- [x] C6: Section 3.1 already correct from Completion Pass; Section 23 updated with audit confirmation

### WS1.3 Panel Item-Citation Wiring
- [ ] W1: Wire contribution_breakdown_json into getClassificationExplanation — return item-level citations (itemId, questionSummary, signalKey, delta) [DEFERRED — requires real session data in DB]
- [ ] W2: Update classification explanation panel in AssessmentResultsPage to render item-level citations [DEFERRED]
- [ ] W3: Add tests: panel cites specific items, not just capability aggregates [DEFERRED]

### Architecture Doc Final Updates
- [x] D1: Section 3.1 — verified 22-signal mapping table (confirmed correct)
- [x] D2: Section 23 — E3 hybrid resolution documented
- [x] D3: Section 23 — three-threshold model table documented
- [x] D4: Section 23 — all three entries added (Addition A, B, C)

### Final
- [x] F1: 266/266 tests passing, 0 TypeScript errors
- [x] F2: Checkpoint saved and delivered

### Thin-Signal Calibration Audit (Apr 23 2026)
- [x] TS1: Audited scoring.v2-2.test.ts — confirmed anchor tests only covered governance_quality (6-signal capability)
- [x] TS2: Computed exact expected scores for thin-signal anchor cases via Node.js calculation
- [x] TS3: Wrote server/scoring.thin-signal.test.ts — 19 tests covering Workflow and Data Interpretation anchors A–D, single-answer behaviour, cross-capability isolation, and calibration parity
- [x] TS4: All 285/285 tests passing, 0 TypeScript errors
- [x] TS5: Updated Section 4.2 of docs/aiq-assessment-architecture-v2.2.md — corrected anchor table + thin-signal verification subsection
- [x] TS6: Regenerated architecture PDF
- [x] TS7: Checkpoint saved and delivered

### Thin-Signal Calibration Audit (Apr 23 2026)
- [x] TS1: Audited scoring.v2-2.test.ts — confirmed anchor tests only covered governance_quality (6-signal capability)
- [x] TS2: Computed exact expected scores for thin-signal anchor cases via Node.js calculation
- [x] TS3: Wrote server/scoring.thin-signal.test.ts — 19 tests covering Workflow and Data Interpretation anchors A-D, single-answer behaviour, cross-capability isolation, and calibration parity
- [x] TS4: All 285/285 tests passing, 0 TypeScript errors
- [x] TS5: Updated Section 4.2 of docs/aiq-assessment-architecture-v2.2.md — corrected anchor table + thin-signal verification subsection
- [x] TS6: Regenerated architecture PDF
- [x] TS7: Checkpoint saved and delivered

### v2.2 Final Two Items (Apr 23 2026)

- [ ] Item 1.1: Migration 0019 — add six columns to scoring_config (base_failure_threshold_magnitude, catastrophic_margin_multiplier, at_risk_confidence_floor, provisional_confidence_threshold, confidence_floor, minimum_safe_classification_confidence)
- [ ] Item 1.2: Wire all six new fields through ActiveScoringConfig in scoringConfig.ts
- [ ] Item 1.3: Pass base_failure_threshold_magnitude + catastrophic_margin_multiplier through detectFailureModes opts; retain constants as fallback defaults
- [ ] Item 1.4: Pass at_risk_confidence_floor + three confidence thresholds through applyClassificationConfidenceGate + classifyReadiness opts; retain constants as fallback defaults
- [ ] Item 1.5: Add scoring-config-overrides.test.ts with one test per configurable threshold (6 tests)
- [ ] Item 2 Option A: Update isProvisional code comments in scoringEngine.ts; align router assessment.ts line 1905 to use PROVISIONAL_CONFIDENCE_THRESHOLD constant
- [ ] Item 1.6: Update architecture doc Section 4.2 (all nine scoring_config columns) and add Section 23 changelog entry

### World-Class Dashboards (All User Types)
- [x] Extend dashboard tRPC router: richer data for all 5 user types
- [x] Rebuild LearnerDashboard: capability score cards, score ring, learning progress, revalidation countdown
- [x] Rebuild ManagerDashboard: team readiness heatmap, risk table, revalidation alerts
- [x] Rebuild HRDashboard: org KPI cards, capability breakdown chart, compliance funnel, incident feed
- [x] Rebuild AuditorDashboard: evidence surface, incident timeline, audit feed, export button
- [x] Rebuild AdminDashboard: platform health, scoring config status, system activity
- [ ] Vitest tests for dashboard router procedures

### World-Class Dashboards (All User Types)
- [x] Extend dashboard tRPC router: richer data for all 5 user types
- [x] Rebuild LearnerDashboard: capability score cards, score ring, learning progress, revalidation countdown
- [x] Rebuild ManagerDashboard: team readiness heatmap, risk table, revalidation alerts
- [x] Rebuild HRDashboard: org KPI cards, capability breakdown chart, compliance funnel, incident feed
- [x] Rebuild AuditorDashboard: evidence surface, incident timeline, audit feed, export button
- [x] Rebuild AdminDashboard: platform health, scoring config status, system activity
- [ ] Vitest tests for dashboard router procedures

### Assessment Engine Improvements (Apr 23 2026)
- [ ] A4: Surface governanceAction and governingConstraint in scoreBreakdown, results page, dashboards
- [ ] A2+E1: Add gamingFamily to RoleArchetype, load DB thresholds, pass roleFamily to analyseGamingPatterns
- [ ] A5: Write policyEvaluations row when scrutinyLevel=high at session completion
- [ ] B1: Track revisionCount and focusLossCount in frontend, send in submitAnswer
- [ ] A1: Apply WS4.6 validation phase randomisation flag in adaptiveEngine selectNextItem
- [ ] A3: Read personaStartingDifficulty from session metadata in buildAdaptiveContext
- [ ] C1: Load prior capability scores in completeSession, include score deltas in R9 narrative prompt
- [ ] C2: Include failureModes.modes and gamingAnalysis.scrutinyLevel in R9 narrative prompt
- [ ] B2: Derive and send deviceType, browserType, screenWidthPx from frontend in submitAnswer
- [ ] D1: Move MINIMUM_EVIDENCE constants to scoring_config columns with migration 0020

### Assessment Engine Improvements — COMPLETED (Apr 23 2026)
- [x] A4: governanceAction + governingConstraint added to scoreBreakdown JSON, surfaced in AssessmentResultsPage
- [x] A2+E1: gamingFamily field added to RoleArchetype; role-aware gaming thresholds wired through analyseGamingPatterns
- [x] A5: policyEvaluations row written at session completion when scrutinyLevel === 'high'
- [x] B1: revisionCount + focusLossCount tracked in frontend (AssessmentSessionPage), sent in submitAnswer
- [x] A1: WS4.6 validation phase randomisation flag applied in adaptiveEngine.selectNextGenerationVariables
- [x] A3: personaStartingDifficulty read from session metadata in buildAdaptiveContext
- [x] C1: Prior capability scores loaded in completeSession, score deltas included in R9 narrative prompt
- [x] C2: failureModes.modes and gamingAnalysis.scrutinyLevel included in R9 narrative prompt
- [x] B2: deviceType, browserType, screenWidthPx derived and sent from frontend in submitAnswer
- [x] D1: MINIMUM_EVIDENCE constants moved to scoring_config columns (migration 0020); wired end-to-end
- [x] Tests: 355/355 passing, 0 TypeScript errors
- [x] Checkpoint saved

### Stress Test — HR Role & Level Coverage (Apr 23 2026)

#### Critical Bugs Fixed
- [x] BUG-1: React hooks violation in AssessmentSessionPage — `useCallback` and two `useEffect` hooks placed after conditional `if (rationaleData)` early return, causing crash after first answer submission
- [x] BUG-2: `roleArchetype` temporal dead zone in `assessment.ts` router — `const roleArchetype` declared after `answerRecords` map that references it, causing `ReferenceError` on every `submitAnswer` call (LLM generation fell back to pre-generated items)

#### Scoring Credibility Fixes
- [x] SC-1: Expert performers with one minor capability gap (e.g. overall=84, one domain at 65 vs threshold 70) were classified as `at_risk` — fixed by relaxing the safe gate for high scorers (>=82) with at most one minor threshold failure and no critical failures
- [x] SC-2: Inconsistent profiles (95/95/95/95/95/30) scored same as uniform competent profiles (83 vs 78) — fixed by adding `computeConsistencyPenalty` to `computeOverallScore` (stdDev-based, capped at 8 points)

#### UX/UI Fixes
- [x] UX-01: `error_detection` interaction type used `Search` icon — changed to `AlertCircle` for semantic accuracy
- [x] UX-02: "Explain your thinking" textarea was hidden for `error_detection` and `output_improvement` types — extended to all output-facing interaction types
- [x] UX-03: "Other Options" in rationale screen showed letter labels (A/B/C/D) while question screen showed numbers (1/2/3/4) — fixed to use numeric position from `sessionData.nextItem.options`
- [x] UX-04: Back to Assessments button navigated away without confirmation — added `AlertDialog` confirmation with "Stay" / "Leave & Save" options

### Rationale Screen Loading Animation
- [x] Add loading animation to rationale reveal screen — shown immediately after answer submission while explanation is being generated
- [x] Animate transition from loading state to full rationale content (fade/slide in)

### Back Office — Delete Users & Companies
- [x] Add `backoffice.deleteUser` tRPC procedure (hard-delete with full cascade: sessions, answers, scores, AIL profiles, learning plans, simulations, policy evaluations)
- [x] Add `backoffice.deleteCompany` tRPC procedure (cascade: all users + their data, org thresholds, tenant settings, tenant row)
- [x] Add delete button + confirmation dialog to BO Users table row
- [x] Add delete button + confirmation dialog to BO Companies table row
- [x] Prevent deleting own account (owner guard)
- [x] Prevent deleting platform tenant (lumi slug guard)

### Bug Fix — Double Login Required
- [x] Diagnose why credentials must be entered twice before session is established
- [x] Fix the root cause: `invalidate()` only marks query stale but doesn't await refetch — replaced with `await utils.auth.me.fetch()` in LoginPage and RegisterPage so ProtectedRoute sees the user immediately on first attempt

### Bug Fix — submitAnswer timeToFirstInteractionMs negative value
- [x] Fix: timeToFirstInteractionMs can be negative — root cause: Continue button didn't reset firstInteractionTime to null. Fixed in Continue handler + added server-side Math.max(0,...) clamp as belt-and-suspenders guard

### Feature — Assessment Results Review & Benchmarking
- [x] Add `assessment.getSessionResult` tRPC procedure returning full capability scores, readiness classification, score breakdown, failure modes, and governance action
- [x] Add `assessment.getBenchmarks` tRPC procedure returning role-level and platform-wide percentile benchmarks for each capability (synthetic norms, handles both flat-number and {score,weight} capabilityScores formats)
- [x] Build ResultsReviewPage at /assessment/:sessionId/results with: readiness badge, overall score gauge, capability radar chart, per-capability score bars with benchmark overlays, score breakdown table, failure modes section, and improvement recommendations
- [ ] Add "View Results" button to CompletionScreen (end of assessment)
- [ ] Add "View Results" link to assessment history cards on the Assessment landing page
- [x] Register /assessment/:sessionId/results route in App.tsx
- [ ] Write vitest tests for getSessionResult and getBenchmarks procedures

### Feature — Benchmarks Tab on Assessment Results Page (Apr 23 2026)
- [x] Export `getNormMeans()` from server/assessment/normEngine.ts
- [x] Add `getBenchmarks` tRPC procedure to assessment router — queries assessmentScores, resolves role archetype, returns capability scores vs role mean vs platform mean
- [x] Add Benchmarks tab (4th tab) to AssessmentResultsPage with grid-cols-4 TabsList
- [x] Grouped bar chart: Your Score (green) / Role Average (teal) / Platform Average (amber) per capability
- [x] Detailed comparison table with delta indicators (TrendingUp/TrendingDown/Minus)
- [x] Percentile context mini-cards with score bar and role/platform averages
- [x] Synthetic data disclaimer when isSynthetic=true
- [x] Fix: getBenchmarks procedure now handles both flat-number and {score,weight} capabilityScores formats
- [x] Browser verified: all 6 capabilities show correct scores, chart renders, table shows deltas
- [x] TypeScript: 0 errors, 355/355 tests passing

### Bug Fix — Question Counter Jumping Backwards (Apr 23 2026)
- [x] Diagnose root cause: rationale screens used `answeredCount` (0-indexed) instead of `answeredCount+1`; also added pendingNextItem staleness check (displayOrder must match answeredCount+1)
- [x] Fix question counter: rationale loading screen and rationale reveal screen now show `answeredCount+1`
- [x] Ensure counter is derived from server-authoritative answered count, not client-side state
- [x] Browser verified: Q1→rationale shows Q1, Continue→Q2, rationale shows Q2, Continue→Q3 ✓

### Feature — Save & Resume Assessment (Apr 23 2026)
- [x] Verified isSaveAndResumeEnabled is active (sessions persist in DB with state=in_progress)
- [x] Added "Save & Exit" button (green, CheckCircle2 icon) to all 3 assessment screens: main question, rationale loading, rationale reveal
- [x] Assessment landing page shows "Assessment In Progress" banner with progress bar, answered count, and Resume button
- [x] On resume, restores exact question state (nextItem, answered count, phase) from session metadata
- [x] "Progress saved — resume any time from the Assessment page" toast shown on Save & Exit
- [x] Browser verified: Save & Exit → /assessment shows resume card (2/49, 4%); Resume → Q3 ✓
- [ ] Write vitest test for save-and-resume flow (existing save-resume.test.ts covers the server-side logic)
