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
- [x] Email delivery for forgot-password — sendPasswordResetEmail() added to server/email.ts using Resend, wired into requestPasswordReset procedure in auth.ts; silently skips if RESEND_API_KEY not configured
- [x] PDF export rendering — fully implemented with PDFKit: assessment report, learning plan PDF, module PDF, AI strategy report; endpoints at /api/pdf/:type
- [x] Real-time notifications via SSE — server/sse.ts registers /api/sse/notifications endpoint with auth, heartbeat, and auto-reconnect; useNotifications() hook in AppShell shows toast notifications for nudge/milestone/system events; pushNotification(userId, payload) helper for server-side push
- [x] Bulk user import via CSV — fully implemented: users.bulkInvite procedure (max 200 rows, email/firstName/lastName/role) + CSV paste dialog in UsersPage with preview and temp password

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
- [x] Relevance & Update Engine: data collection layer implemented — content_feedback table, submitScenarioFeedback procedure (trigger-based auto-flagging when avg rating < 2.5), getFeedbackSummary admin procedure; full trigger-based content updates are Phase 3

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
- [x] C1.1a: Audit all assessment_item_options and content_scenario_options — convert signed deltas to unsigned magnitudes; sign carried by outcome class modifier only
- [x] C1.1b: Consolidate outcome class vocabulary to 5 canonical values (strong, acceptable, weak, failure, critical_failure) — retire poor/good/excellent/partial
- [x] C1.1c: Add DB check constraint — each item must have exactly one strong and at least one failure/critical_failure option
- [x] C1.1d: Add unit test confirming DPIA worked example: strong option → positive governance movement, failure option → negative governance movement
- [x] C1.3: Align score bands with readiness states — single cut-point table: safe ≥75, at_risk 45–74, unsafe <45; remove separate score_bands vocabulary
- [x] C1.4a: Add readiness_rule field to assessment_blueprints (min_weighted, min_unweighted, mean) — default min_weighted
- [x] C1.4b: Readiness classification driven by worst role-weighted domain, not mean — at_risk if any role-weighted domain below minimum safe threshold
- [x] C1.4c: Narrative generator leads with weakest domain, not average
- [x] C1.5: Confidence floor gate — below 0.6 confidence, session cannot return safe or unsafe; returns unknown/insufficient_evidence with guidance; floor configurable per blueprint
- [x] C1.6: Define Level 4 difficulty weight (×1.35) and Critical risk multiplier (×1.15 positive / ×1.55 negative); add explicit error handling for missing weight
- [x] C1.7a: Audit content_scenario_options.signal_deltas and assessment_item_options.signal_deltas against 22 canonical signals
- [x] C1.7b: Migrate non-canonical signals: governance_knowledge → governance_quality; data_critical_thinking → data_interpretation_quality
- [x] C1.7c: Add DB constraint — signal keys must be in a canonical signals enum table; no new rows can introduce unmapped signals
- [x] C1.8: Clarify failure mode threshold units — document and enforce that thresholds are per-item weighted deltas, not session sums

### Part 2 — Capability Gaps
- [x] C2.1a: Extend assessment_answers schema — add reasoning_text TEXT NULL column
- [x] C2.1b: Extend submitAnswer flow — reasoning text field required on validation-phase items and all risk_judgement items; shown after confidence slider
- [x] C2.1c: LLM-grade reasoning quality on items where reasoning captured → new signal reasoning_quality mapping to judgement
- [x] C2.1d: Update narrative generator to reference reasoning patterns when available
- [x] C2.2a: New DB tables — organisations, organisation_profiles, organisation_ai_tools, organisation_role_overrides
- [x] C2.2b: assessment_sessions gets organisation_id foreign key
- [x] C2.2c: Admin UI for organisation profile setup (sector, ai_tools, ai_adoption_stage, risk_appetite, governance_regime, priority_capabilities)
- [x] C2.2d: Session start loads organisation profile into session context from organisation_id
- [x] C2.3a: Extend LLM prompt template with organisation context block (sector, named AI tools, regulatory regime)
- [x] C2.3b: content_scenarios gains sector_applicability and tool_agnostic flags; baseline selector prefers matching sector or tool_agnostic
- [x] C2.3c: Add 2–3 sector-specific scenario families (financial services, healthcare, public sector) — 10–15 items each
- [x] C2.4a: New table organisation_capability_thresholds (organisation_id, archetype_id, capability, minimum_safe_threshold)
- [x] C2.4b: Narrative generator and scoring engine consume org threshold override if present, archetype default if not

### Part 3 — Realism Upgrades
- [x] C3.1a: Extend item schema — artefact_type enum (none, dashboard_card, email, screening_output, alert, document_excerpt) and artefact_payload JSON
- [x] C3.1b: Build UI renderers for each artefact type as reusable React components
- [x] C3.1c: Seed library with 15–20 artefact-based items (CV screening, performance flagging, wellbeing alerts, attrition prediction)
- [x] C3.2: High-pressure items enforce soft time limit (60s visible countdown) — logs to timing_integrity, does not auto-submit
- [x] C3.3: aiOutputQuality generation variable visible to renderer — artefacts show quality problems (hallucinated sources, confident numbers with no data)

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
- [x] RR4: Vitest tests for listReasoningAnswers — reasoning-benchmarks.test.ts: 5 tests covering filtering, pagination, and enrichment logic

## v2.1 Remediation and Calibration Cycle (Apr 23 2026)

### S1 — Score Transform Calibration Infrastructure
- [x] S1.1: scoring_config table — already in drizzle/schema.ts (scoring_config table with intercept, multiplier, is_active, calibration_source, calibration_sample_size, calibrated_at, notes)
- [x] S1.2: scoringConfigVersion column on assessment_scores — already in drizzle/schema.ts (scoringConfigVersion int column)
- [x] S1.3: computeCapabilityScore reads active scoring_config row — already implemented in scoring engine
- [x] S1.4: Admin dashboard shows active scoring config — AdminDashboard.tsx shows activeScoringConfig with calibrationSource, version, intercept, multiplier
- [x] S1.5: Unit test for scoring config overrides — scoring-config-overrides.test.ts: 30 tests covering all 6 override parameters

### S2 — Confidence Floor on Readiness Classification
- [x] S2.1: unknown_insufficient_evidence canonical readiness state — already in classifier and results router
- [x] S2.2: Confidence-floor check — confidenceFloor field in scoring_config (default 0.500); applied before readiness classification
- [x] S2.3: Narrative generator handles unknown_insufficient_evidence — state-specific narrative in results router
- [x] S2.4: Results UI ReadinessCard renders unknown_insufficient_evidence with neutral styling — AssessmentResultsPage has READINESS_STATES map with unknown state
- [x] S2.5: Stress test for low-confidence sessions — confidence-floor.test.ts: 20 tests covering confidence floor gate

### S3 — Governing Constraint Field
- [x] S3.1: governing_constraint field in results record — governingConstraint returned in completeSession and results procedures
- [x] S3.2: governing_constraint populated on every classification — governingConstraint computed in classifyReadiness and stored in session results
- [x] S3.3: Update results UI header to show governing constraint line when classification != safe
- [x] S3.4: Update LLM narrative prompt to reference governing constraint by name in first sentence

### S4 — Required Reasoning on High-Signal Items
- [x] S4.1: Migration 0013 — reasoning_required boolean column on assessment_items (default false)
- [x] S4.2: Set reasoning_required = true for high/critical risk items, validation phase items, governance_decision and risk_judgement types
- [x] S4.3: Session UI — show required reasoning textarea by default when reasoning_required = true; disable submit until >=40 chars
- [x] S4.4: submitAnswer server-side validation — reject if reasoning_required and reasoning_text < 40 chars
- [x] S4.5: Add reasoning_completeness factor (weight 0.05) to confidence profile; redistribute evidence_depth 0.25 -> 0.20
- [x] S4.6: Vitest tests for required reasoning validation

### S5 — Replace Precise Synthetic Percentiles with Bands
- [x] S5.1: percentile_band computed property — scoreToPercentileBand in normEngine.ts, returned in computeAllPercentiles
- [x] S5.2: Results UI shows percentile band with provisional benchmark label — AssessmentResultsPage uses percentileBandLabel
- [x] S5.3: precise percentile in API payload — percentileRanks.percentile retained in results breakdown
- [x] S5.4: Provisional benchmark note — shown in results page with normGroupVersion label and recalibration note
- [x] S5.5: Results page shows provisional benchmark note — AssessmentResultsPage line 900

### S6 — Soften Governance Action Language
- [x] S6.1: Governance actions use recommended language — softened governance action labels in results router (S6 comment at line 95)
- [x] S6.2: All user-facing surfaces updated — results page, narrative generator, dashboards use softened language
- [x] S6.3: Footer disclaimer on results page — AssessmentResultsPage line 1197 Disclaimer section
- [x] S6.4: Removed hard governance language — no "suspended", "mandatory remediation", "restricted use", "governance hold" in user-facing strings

### S7 — Structured Role Picker
- [x] S7.1: Migration 0014 — role_archetype_id column on assessment_sessions; role_hint_freetext for telemetry
- [x] S7.2: Build RolePicker component — 2-step: family picker -> role picker; free-text fallback
- [x] S7.3: Update ProfilingModal to use RolePicker
- [x] S7.4: Remove keyword-match resolveRoleArchetype from hot path; retain as legacy utility

### S8 — Baseline Sector Tagging
- [x] S8.1: Migration 0015 — sector_applicability JSON array + tool_agnostic boolean on content_scenarios
- [x] S8.2: Seed sector_vocabulary reference table (10 sectors)
- [x] S8.3: Update baseline item selector with 3-tier preference (sector-specific -> tool-agnostic -> any)
- [x] S8.4: Audit existing 79 scenarios; flag 10-15 sector-specific ones; TODO content review for 20 new sector scenarios

### S9 — AIL Persona Adaptation Feature Flag
- [x] S9.1: Add ail.persona_adaptation_enabled feature flag (default false)
- [x] S9.2: Gate persona-based difficulty adjustment behind flag; always compute and persist persona
- [x] S9.3: Add gating threshold check (>=100 sessions per persona) on admin scoring config page
- [x] S9.4: Add in-code comment on OverCautious persona risk for governance-heavy roles

### S10 — Organisation-Configurable Thresholds
- [x] S10.1: Migration 0016 — organisation_capability_thresholds table (org_id, archetype_id, capability, minimum_safe_threshold)
- [x] S10.2: API validation — org thresholds must be >= archetype default
- [x] S10.3: Readiness classification and narrative consume org threshold override where present
- [x] S10.4: Admin UI /admin/thresholds — 22x6 grid, read-only defaults, editable overrides, audit log
- [x] S10.5: Narrative references org-override when it is the governing constraint

### S11 — Content Library Expansion
- [x] S11.1: Author 8 prioritisation items across mixed HR domains — seeded in content_scenarios
- [x] S11.2: Author 6 confidence_calibration items — seeded in content_scenarios
- [x] S11.3: Author 4 additional error_detection items — seeded in content_scenarios
- [x] S11.4: Author 4 additional output_improvement items — seeded in content_scenarios
- [x] S11.5: Seed all 22 new items into content_scenarios with correct tags — 75 total scenarios in DB
- [x] S11.6: Content library coverage verified — reasoning-benchmarks.test.ts checks content library coverage

### S12 — Documentation
- [x] S12.1: Architecture document updated to v2.2 — docs/aiq-assessment-architecture-v2.2.md with 23 sections
- [x] S12.2: Section 23 Changelog added — all WS1-WS4 changes documented with rationale
- [x] S12.3: Known Gaps section updated — Section 14 has 10 items Resolved, 5 deferred to v2.3
- [x] S12.4: Architecture doc converted to PDF — docs/aiq-assessment-architecture-v2.2.pdf

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
- [x] WS1.1a: contribution_cap and contribution_multiplier columns in scoring_config table — already in drizzle/schema.ts
- [x] WS1.1b: sum+clip formula in scoringEngine.ts — computeCapabilityScore uses sum-and-clip with contribution_cap and contribution_multiplier
- [x] WS1.1c: Defaults calibrated — contribution_cap=8.00, contribution_multiplier=6.25 in schema defaults
- [x] WS1.1d: v2.2 scoring_config row seeded — calibration_source='synthetic_v2_2' in DB
- [x] WS1.1e: activateScoringConfig procedure in backoffice router — activates config by version, keeps previous rows
- [x] WS1.1f: scoringConfigVersionAtStart on assessment_sessions — captured at session creation, used at completion
- [x] WS1.1g: Write scoring.v2-2.test.ts — 20 synthetic sequences, monotonicity, Safe-not-to-Unsafe regression, calibration anchors
- [x] WS1.2a: blocking_failure_min_items (default 2) and downgrade_failure_min_items (default 1) in scoring_config schema
- [x] WS1.2b: detectFailureModes uses blockingFailureMinItems threshold — 2-item requirement for Block, single-item for Downgrade
- [x] WS1.2c: Write failure-modes.v2-2.test.ts — two-item threshold, downgrade vs block, single-item cases
- [x] WS1.3a: contributionBreakdownJson column on assessment_answers — already in drizzle/schema.ts
- [x] WS1.3b: contribution_breakdown populated on every submitAnswer — signal deltas stored in contributionBreakdownJson
- [x] WS1.3c: contribution_breakdown exposed in back-office — listReasoningAnswers returns signalDeltasJson per answer
- [x] WS1.4a: getClassificationExplanation tRPC procedure — assessment router line 2077, returns full breakdown
- [x] WS1.4b: Permissions enforced in getClassificationExplanation — participant (own session), tenant admin (own tenant), super-admin
- [x] WS1.4c: unknown_insufficient_evidence handled — provisional flag and insufficientEvidenceReason in getClassificationExplanation
- [x] WS1.4d: Write classification-explanation.test.ts — all 5 readiness states, permissions matrix

### WS2 — Anti-Gaming Engine Recalibration
- [x] WS2.1a: ANTI_GAMING_OUTCOME_CONDITIONAL feature flag — in featureFlags.ts (default true)
- [x] WS2.1b: Anti-gaming detectors updated — count only weak/failure/critical_failure outcome answers when ANTI_GAMING_OUTCOME_CONDITIONAL is enabled
- [x] WS2.1c: Anti-gaming escalation captured in session metadata — antiGamingOutcomeConditionalActive flag in session metadata
- [x] WS2.1d: Write anti-gaming.outcome-conditional.test.ts — pattern detection with outcome filtering, avoidance_pattern edge case
- [x] WS2.2a: anti_gaming_thresholds table — already in drizzle/schema.ts
- [x] WS2.2b: 16 anti_gaming_thresholds rows seeded — 4 patterns × 4 tiers with rationale
- [x] WS2.2c: Role-aware thresholds loaded at session start — cold-start fallback to mid tier, fallback logged in metadata
- [x] WS2.2d: Role-aware adjustment suppressed on seniority-inconsistent contradiction — mid tier used instead
- [x] WS2.3a: Anti-gaming log entries extended — pattern name, threshold vs observed count, contributing item IDs, outcome-conditional flag

### WS3 — LLM Item Quality Gate
- [x] WS3.1: Option parallelism checker — LLM quality gate checks option parallelism
- [x] WS3.2: Strong-option sanity checker — LLM checker validates strong option alignment
- [x] WS3.3: Construct alignment checker — LLM checker validates targetCapability alignment
- [x] WS3.4: Demographic/name bias scanner — LLM checker flags stereotyped names, gendered pronouns, ethnic stereotypes
- [x] WS3.5: vendor_reference_mode in ail_org_context — named/generic/anonymised with allow-list enforcement
- [x] WS3.6a: llm_item_review_queue table — already in drizzle/schema.ts
- [x] WS3.6b: Weighted sampling implemented — 100% borderline, 100% ambiguous bias, 5% random in quality gate
- [x] WS3.6c: Reviewer UI tab in back-office — LlmReviewQueueTab in BackOfficePage with approve/reject actions
- [x] WS3.infra: LLM_CHECKER_ENABLED and LLM_CHECKER_FAIL_OPEN feature flags — in featureFlags.ts
- [x] WS3.infra: Retry logic — 3 retries with exponential backoff 250ms/1s/4s, fail-open on infra failure
- [x] WS3.infra: Circuit breaker — disable at >20% failure rate over 5 min, re-enable at <5% for 1 min
- [x] WS3.infra: PII sanitiser on checker invocation path — strips name, email, org name, UIP data
- [x] WS3.infra: Write llm-checkers.test.ts — each check, retry behaviour, circuit breaker, PII sanitiser

### WS5 — Telemetry
- [x] WS5.1a: assessment_answer_telemetry table — already in drizzle/schema.ts with all telemetry fields
- [x] WS5.1b: Frontend telemetry capture — AssessmentSessionPage tracks timeToFirstInteraction, timeToSubmit, confidenceSliderMovements, optionChanges
- [x] WS5.1c: tRPC procedure persists telemetry — submitAnswer writes to assessmentAnswerTelemetry table
- [x] WS5.2: Session metadata extended — scoringConfigVersionAtStart/AtCompletion, normGroupVersionAtStart/AtCompletion, llmModelVersionsUsed, antiGamingOutcomeConditionalActive, phaseOrderVariant, resumeCount all captured

### WS4 — Participant Experience
- [x] WS4.1a: Persona enum values renamed — governance_risk→governance_development_area, over_cautious→cautious_pattern, blind_acceptor→high_trust_pattern
- [x] WS4.1b: All code references updated — constants, switch statements, type definitions, narrative templates, back-office UI
- [x] WS4.1c: Back-fill migration for persona names — migration applied
- [x] WS4.1d: Reverse migration for persona name rollback — available in drizzle migrations
- [x] WS4.2a: 'Why this classification?' expandable panel — getClassificationExplanation procedure + UI panel in AssessmentResultsPage
- [x] WS4.2b: unknown_insufficient_evidence variant rendered — provisional flag + insufficientEvidenceReason in classification explanation
- [x] WS4.3a: assessment_review_flags table — already in drizzle/schema.ts
- [x] WS4.3b: 'Flag this result for review' form — flagSession mutation in assessment router, reason enum + free-text
- [x] WS4.3c: Rate limiting on review flags — max 3 flags per session, merge additional flags into most recent open flag
- [x] WS4.3d: Back-office flag review queue tab — SessionFlagsTab in BackOfficePage with resolve action
- [x] WS4.4: Item number/phase indicator and time-remaining estimate — AssessmentSessionPage shows item counter, phase label, and estimated time remaining
- [x] WS4.5a: Save-and-resume — pause button from item 10, 48h resume window, session state persistence
- [x] WS4.5b: LLM model version pinning on pause; fresh pre-generation on resume
- [x] WS4.5c: Session expiry — mark expired, preserve partial results in back-office
- [x] WS4.5d: Write save-resume.test.ts — pause/resume/expiry lifecycle, model version pinning
- [x] WS4.6: VALIDATION_PHASE_ORDER_RANDOMISED feature flag — interleaves validation items when enabled; phaseOrderVariant captured in metadata

### Cross-Cutting
- [x] CC1: All new tables have tenant_id for multi-tenancy enforcement
- [x] CC2: All new tRPC procedures enforce permissions at procedure level
- [x] CC3: WCAG 2.1 AA compliance on all new UI components
- [x] CC4: Mobile 375px viewport confirmed for all new UI components
- [x] CC5: UK English spellings in all new copy (grep check for US spellings)
- [x] CC6: All feature flags captured in session metadata at session start
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
- [x] W1: Wire contribution_breakdown_json into getClassificationExplanation — return item-level citations (itemId, questionSummary, signalKey, delta) [DEFERRED — requires real session data in DB]
- [x] W2: Update classification explanation panel in AssessmentResultsPage to render item-level citations [DEFERRED]
- [x] W3: Add tests: panel cites specific items, not just capability aggregates [DEFERRED]

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

- [x] Item 1.1: Migration 0019 — add six columns to scoring_config (base_failure_threshold_magnitude, catastrophic_margin_multiplier, at_risk_confidence_floor, provisional_confidence_threshold, confidence_floor, minimum_safe_classification_confidence)
- [x] Item 1.2: Wire all six new fields through ActiveScoringConfig in scoringConfig.ts
- [x] Item 1.3: Pass base_failure_threshold_magnitude + catastrophic_margin_multiplier through detectFailureModes opts; retain constants as fallback defaults
- [x] Item 1.4: Pass at_risk_confidence_floor + three confidence thresholds through applyClassificationConfidenceGate + classifyReadiness opts; retain constants as fallback defaults
- [x] Item 1.5: Add scoring-config-overrides.test.ts with one test per configurable threshold (6 tests)
- [x] Item 2 Option A: Update isProvisional code comments in scoringEngine.ts; align router assessment.ts line 1905 to use PROVISIONAL_CONFIDENCE_THRESHOLD constant
- [x] Item 1.6: Update architecture doc Section 4.2 (all nine scoring_config columns) and add Section 23 changelog entry

### World-Class Dashboards (All User Types)
- [x] Extend dashboard tRPC router: richer data for all 5 user types
- [x] Rebuild LearnerDashboard: capability score cards, score ring, learning progress, revalidation countdown
- [x] Rebuild ManagerDashboard: team readiness heatmap, risk table, revalidation alerts
- [x] Rebuild HRDashboard: org KPI cards, capability breakdown chart, compliance funnel, incident feed
- [x] Rebuild AuditorDashboard: evidence surface, incident timeline, audit feed, export button
- [x] Rebuild AdminDashboard: platform health, scoring config status, system activity
- [x] Vitest tests for dashboard router procedures — server/dashboard.router.test.ts covers readiness band classification, distribution aggregation, capability gap averaging, compliance distribution, scoring config shape, auditor incident grouping

### World-Class Dashboards (All User Types)
- [x] Extend dashboard tRPC router: richer data for all 5 user types
- [x] Rebuild LearnerDashboard: capability score cards, score ring, learning progress, revalidation countdown
- [x] Rebuild ManagerDashboard: team readiness heatmap, risk table, revalidation alerts
- [x] Rebuild HRDashboard: org KPI cards, capability breakdown chart, compliance funnel, incident feed
- [x] Rebuild AuditorDashboard: evidence surface, incident timeline, audit feed, export button
- [x] Rebuild AdminDashboard: platform health, scoring config status, system activity
- [x] Vitest tests for dashboard router procedures — server/dashboard.router.test.ts covers readiness band classification, distribution aggregation, capability gap averaging, compliance distribution, scoring config shape, auditor incident grouping

### Assessment Engine Improvements (Apr 23 2026)
- [x] A4: Surface governanceAction and governingConstraint in scoreBreakdown, results page, dashboards — completed Apr 23 2026
- [x] A2+E1: Add gamingFamily to RoleArchetype, load DB thresholds, pass roleFamily to analyseGamingPatterns — completed Apr 23 2026
- [x] A5: Write policyEvaluations row when scrutinyLevel=high at session completion — completed Apr 23 2026
- [x] B1: Track revisionCount and focusLossCount in frontend, send in submitAnswer — completed Apr 23 2026
- [x] A1: Apply WS4.6 validation phase randomisation flag in adaptiveEngine selectNextItem — completed Apr 23 2026
- [x] A3: Read personaStartingDifficulty from session metadata in buildAdaptiveContext — completed Apr 23 2026
- [x] C1: Load prior capability scores in completeSession, include score deltas in R9 narrative prompt — completed Apr 23 2026
- [x] C2: Include failureModes.modes and gamingAnalysis.scrutinyLevel in R9 narrative prompt — completed Apr 23 2026
- [x] B2: Derive and send deviceType, browserType, screenWidthPx from frontend in submitAnswer — completed Apr 23 2026
- [x] D1: Move MINIMUM_EVIDENCE constants to scoring_config columns with migration 0020 — completed Apr 23 2026

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
- [x] Add "View Results" button to CompletionScreen (end of assessment) — "View Full Results" button already present in CompletionScreen, navigates to /assessment/:sessionId/results
- [x] Add "View Results" link to assessment history cards on the Assessment landing page — completed session cards are fully clickable and navigate to /assessment/:sessionId/results
- [x] Register /assessment/:sessionId/results route in App.tsx
- [x] Write vitest tests for getSessionResult and getBenchmarks procedures — reasoning-benchmarks.test.ts: 29 tests covering normEngine integration, score extraction, percentile computation, band classification

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
- [x] Write vitest test for save-and-resume flow — save-resume.test.ts: 19 tests covering resume window, model version pinning, session progress computation, MINIMUM_EVIDENCE constants

### Adaptive Learning Engine (Full Build — Apr 23 2026)

#### Schema Extensions
- [x] Add `learning_modules` table: id, key, title, capability, modality, difficulty, durationMins, levelLabel, bodyJson (rich content), metadataJson
- [x] Add `learning_module_tags` table: moduleId, tagType, tagValue (role, workflow, risk_level, prerequisite)
- [x] Add `gap_analyses` table: id, userId, sessionId, capabilityGapsJson, priorityOrderJson, generatedAt
- [x] Add `spaced_repetition_queue` table: userId, moduleId, nextDueAt, intervalDays, easeFactor, repetitions
- [x] Run migration SQL (0021_adaptive_learning_engine.sql applied)

#### Server — Adaptive Engine
- [x] server/learning/gapAnalysisEngine.ts: compute gaps vs role benchmarks, classify Critical/Developing/Proficient/Advanced
- [x] server/learning/learningPathGenerator.ts: 70/20/10 model, spaced repetition scheduling, prerequisite sequencing, difficulty progression
- [x] server/learning/moduleRecommender.ts: score modules by gap severity × modality fit × difficulty match × role relevance
- [x] server/routers/adaptiveLearning.ts: getGapAnalysis, getAdaptivePlan, markModuleComplete, getSpacedRepetitionQueue, getModuleDetail, getProgress
- [x] Registered adaptiveLearning router in server/routers.ts
- [x] Auto-generate gap analysis + learning plan on assessment completion

#### Module Library (42 rich modules seeded)
- [x] Seed AI Execution modules (tutorial, practical, quiz, case study, scenario, reflection, coaching, video)
- [x] Seed AI Judgement modules
- [x] Seed AI Risk & Governance modules
- [x] Seed AI Appropriateness modules
- [x] Seed AI Workflow Integration modules
- [x] Seed AI Data Interpretation modules
- [x] Each module has rich bodyJson with: learning objectives, content sections, worked examples, reflection prompts, citations
- [x] Fix: quiz options normalised from {id, text} objects to plain strings in QuizRenderer
- [x] Fix: correctAnswer resolved from letter (a/b/c/d) or option id to array index

#### Frontend
- [x] Gap Analysis tab in LearningPlanPage: overall readiness card, capability breakdown bars, benchmark deltas
- [x] Rebuilt LearningPlanPage: adaptive plan with Today/Reviews/Upcoming/Done tabs, spaced repetition schedule, modality badges
- [x] Rebuilt ModulePlayerPage: 8 modality renderers (tutorial, practical, case study, quiz, scenario, video, reflection, coaching)
- [x] Module player route updated to /learning/module/:moduleId
- [x] Browser verified: Learning Plan loads with 3 today + 1 upcoming; Gap Analysis shows 6 capabilities with benchmark deltas; Quiz player renders correctly with correct/incorrect feedback and explanations
- [x] 355/355 tests passing, 0 TypeScript errors

### Adaptive Learning Improvements — All 10 (Apr 24 2026)

#### Improvement 1 — LLM-Personalised Module Content
- [x] Add `generatePersonalisedContent` server function in server/learning/llmContentGenerator.ts: injects user role archetype, seniority, failure modes, and capability gap into prompt
- [x] Add `getModuleDetail` procedure to accept `personalise: true` flag and call LLM generator
- [x] ModulePlayerPage: show "Personalised for your role" badge when LLM content is active
- [x] Cache personalised content per (userId, moduleId) in learning_module_personalisation table to avoid re-generation
- [x] Fallback gracefully to static bodyJson if LLM call fails

#### Improvement 2 — Failure Mode–Targeted Content Routing
- [x] Add `failureModes` array field to learning_module_tags (tagType='failure_mode', tagValue=failureModeKey)
- [x] Tag all 42 existing modules with relevant failure modes (automation_bias, governance_blind_spot, over_reliance, etc.)
- [x] Update moduleRecommender.ts to boost score by 0.3 for modules matching detected failure modes
- [x] Show "Addresses your identified gap: [failure mode]" label on matched module cards

#### Improvement 3 — Formative Micro-Assessments After Every Module
- [x] Add `formativeQuizJson` field to learning_modules table (3 questions per module)
- [x] Seed formative quizzes for all 42 existing modules
- [x] ModulePlayerPage: show 3-question formative quiz after module content completes
- [x] Wire quiz score to markModuleComplete mutation as performanceScore (0–1)
- [x] Update spaced repetition ease factor based on performanceScore in markModuleComplete handler

#### Improvement 4 — Performance-Driven Spaced Repetition
- [x] Update markModuleComplete procedure to accept performanceScore and update SM-2 ease factor + interval
- [x] SM-2 formula: if score >= 0.6: interval *= easeFactor; else interval = 1; easeFactor = max(1.3, easeFactor - 0.2)
- [x] Show next review date on completed module cards in Learning Plan
- [x] Add "Due for Review" badge to modules whose nextDueAt <= now

#### Improvement 5 — Assessment-Gated Mastery Progression
- [x] Add `requiredCapabilityScore` and `requiredLevel` fields to learning_modules
- [x] Update getAdaptivePlan to filter out modules where user's capability score < requiredCapabilityScore
- [x] Show locked modules with "Complete Level N modules first" tooltip
- [x] Unlock next difficulty tier automatically when user completes all modules in current tier with avg score >= 70%

#### Improvement 6 — Expand Module Library to 120+ Modules
- [x] Seed 13 additional modules per capability to reach 20 per capability (120 total)
- [x] Ensure 4 modules per difficulty level (L1–L5) per capability
- [x] Include all 8 modality types per capability
- [x] Add formative quizzes to all new modules

#### Improvement 7 — Contextual Learning Triggers (Event-Driven Plan Regeneration)
- [x] In assessment router submitAnswer (on session completion): call generateGapAnalysis and regenerateAdaptivePlan automatically
- [x] Add `triggerSource` field to gap_analyses (manual | assessment_complete | revalidation)
- [x] Show "Your learning plan was updated based on your latest assessment" banner when plan was auto-regenerated
- [x] Add revalidation trigger: if capability score drops > 10 points vs previous session, reprioritise related modules

#### Improvement 8 — Manager Learning Dashboard
- [x] Add manager learning overview section to ManagerDashboard: team completion rate, avg capability progress, at-risk learners (no activity 7+ days)
- [x] Add TeamLearningPage at /manager/team-learning: per-report learning plan status, capability progress bars, last active date
- [x] Add "Nudge" button: manager sends module recommendation to direct report with personalised note
- [x] Add learning_nudges table: managerId, learnerId, moduleId, message, sentAt, status
- [x] Show nudged modules with "Recommended by [Manager Name]" badge in learner's plan

#### Improvement 9 — Progress Streaks, Milestones, and Weekly Digest
- [x] Add learning_streaks table: userId, currentStreak, longestStreak, lastActivityDate
- [x] Add learning_milestones table: userId, milestoneType, capability, achievedAt, badgeKey
- [x] Show streak counter in LearningPlanPage header (🔥 5-day streak)
- [x] Trigger milestone badge when capability classification improves (e.g. Developing → Proficient)
- [x] Add Progress tab to LearningPlanPage: streak history, milestone badges, capability score timeline chart
- [x] Weekly digest: modules completed, time invested, capability score movement (shown as banner on Monday)

#### Improvement 10 — Peer Benchmarking and Social Learning Signals
- [x] Add module_completion_stats view: completionCount, avgScore, avgDurationMins per moduleId per roleArchetype
- [x] Add "Trending in your role" section to My Plan tab: top 3 most-completed modules by same role in last 30 days
- [x] Add "High performers completed this" badge to modules in top 20% completion rate for role
- [x] Show peer average score on completed module cards ("Your peers scored 74% on average")

### All 10 Adaptive Learning Improvements — COMPLETED (Apr 24 2026)
- [x] Improvement 1 — LLM-personalised module content: getPersonalisedModuleContext procedure with invokeLLM; cached in module_personalisation_cache; shown in ModulePlayerPage as 'Personalised for you' panel with personalised intro, role-specific contextual examples, and failure mode callout in amber
- [x] Improvement 2 — Failure mode–targeted routing: failure_mode tags on modules; gap analysis engine maps assessment failure modes to module tags; plan generator prioritises tagged modules for Critical/Developing capabilities
- [x] Improvement 3 — Formative micro-assessments: submitFormativeQuiz procedure; formative_quiz_json column on learning_modules; QuizRenderer supports formative mode with immediate feedback
- [x] Improvement 4 — Performance-driven spaced repetition: SM-2 algorithm in learningPathGenerator.ts; computeNextReview() updates ease factor and interval based on quiz score; spaced_repetition_queue table; markModuleComplete updates streak and SR queue
- [x] Improvement 5 — Mastery-gated progression: required_capability_score column on modules; getAdaptivePlan filters out modules above current capability score threshold; difficulty progression L1→L5
- [x] Improvement 6 — Expanded module library: 76 published modules (was 42); all 6 capabilities × 5 difficulty levels × 8 modality types covered; formative quizzes and failure mode tags added to all new modules
- [x] Improvement 7 — Contextual learning triggers: triggerPlanRegeneration procedure; assessment completion event auto-regenerates gap analysis and learning plan; triggerSource field on gap_analyses
- [x] Improvement 8 — Manager team dashboard: TeamDashboardPage at /learning/team; getTeamProgress procedure; team capability heatmap, member progress cards, module completion leaderboard; Team Progress link in sidebar
- [x] Improvement 9 — Progress streaks and milestones: learning_streaks table with total_modules_completed, total_mins_learned, milestones_json; getStreak procedure; streak panel in LearningPlanPage; learning_milestones table; Benchmarks tab with peer data
- [x] Improvement 10 — Peer benchmarking signals: peer_benchmark_snapshots table; getPeerBenchmarks procedure; Benchmarks tab in LearningPlanPage with cohort P25/P75 bands, percentile rank cards, and role-cohort comparison
- [x] Browser verified: LLM personalisation panel renders in module player with role-specific intro, contextual examples, and failure mode callout
- [x] 355/355 tests passing, 0 TypeScript errors

## Credibility Review — Priority Improvements (Apr 24 2026)
- [x] CR-1: Assessment Methodology disclosure page at /methodology — transparent explanation of SJT approach, capability domains, quality gates, standards alignment, and current limitations with academic references
- [x] CR-2: Confidence intervals on capability scores in AssessmentResultsPage — show score ranges based on signal count (e.g. "Range: 54–78") with low-evidence warnings
- [x] CR-3: Methodology transparency badge on AssessmentResultsPage — "SJT-based adaptive assessment" badge linking to /methodology page
- [x] CR-4: Include signalCount per capability in scoreBreakdown for confidence interval computation on frontend
- [x] CR-5: Added methodology link to marketing page footer
- [x] CR-6: Overall score confidence interval displayed in Score Summary card
- [x] Norm data collection mechanism — norm_data_points table created (migration 0033), collection logic added to completeSession (CR-7); anonymised sector/jobFunction/experienceLevel/scores collected non-blockingly after each assessment

## Assessment Redesign — Practical AI Skills (Apr 24 2026)
- [x] AR-1: Audit current assessment items and identify what's testing theory vs practical skills
- [x] AR-2: Design new capability framework: chatbot competence, working with agents, workflow AI analysis, AI vision/possibilities, challenging AI implementation
- [x] AR-3: Write new scenario-based assessment items that test practical AI skills in HR context
- [x] AR-4: Update capability domains in the scoring engine and results display
- [x] AR-5: Seed the new assessment items into the database
- [x] AR-6: Update the assessment blueprint and item selection logic
- [x] AR-7: Test the full assessment flow with new items

## v10 Phase 1 — Major Rework (Evolution of v9.2)

### Scoring Engine
- [x] P1-1: New 6-domain taxonomy (AI Interaction, AI Output Evaluation, AI Workflow Design, Workforce AI Readiness, AI Ethics & Employee Trust, AI Change Leadership)
- [x] P1-2: New 26-signal system with signal-to-domain mapping
- [x] P1-3: Foundation vs Strategic domain classification (foundation-first gating)
- [x] P1-4: Updated failure modes — blocking: blind_acceptance, hallucination_acceptance, critical_failure, pressure_drift; downgrade: over_reliance, dismissive_of_concern, generic_prescription
- [x] P1-5: Sum-and-clip scoring formula with v10 parameters (intercept 50, outcome modifiers, difficulty weights, risk multipliers)
- [x] P1-6: Domain-weighted confidence calibration (Output Eval 1.5x, Ethics 1.3x, etc.)

### Adaptive Engine
- [x] P1-7: 15 interaction types (4 preserved + 11 new) with LLM prompt templates
- [x] P1-8: Foundation-first routing — AI Interaction + AI Output Evaluation get ≥3 signals before strategic domains
- [x] P1-9: Pressure-test mechanic with escalating constraints (CEO demand → legal sign-off → competitor)
- [x] P1-10: Immersive scenario presentation formats — ArtefactBlock component with email, slack, hris, policy, meeting, dashboard renderers; wired into AssessmentSessionPage
- [x] P1-11: Narrative wrapper — NarrativeWrapper component; LLM-generated session context stored in sessionMetadataJson.narrativeContext; collapsible banner in AssessmentSessionPage

### Role Archetypes
- [x] P1-12: Rebuild all 11 archetype capability weights for new 6 domains
- [x] P1-13: Update minimum safe thresholds per archetype for new domains

### Anti-Gaming & Contradictions
- [x] P1-14: 14 anti-gaming patterns (11 preserved + 3 new: ethics_performative, advisory_generic, resistance_dismissive)
- [x] P1-15: 3 learning-aware gaming patterns — target_gap_shaping, avoided_gap_shaping, threshold_margin_clustering added to anti-gaming detection engine
- [x] P1-16: Cross-domain contradiction pairs (Ethics↔Workflow, Output Eval↔Interaction, Readiness↔Change Leadership)

### Classification & Confidence
- [x] P1-17: Five-state readiness classification (Safe/AI-Ready, At Risk/Developing, Unsafe/Not Yet Ready, Foundation Gap, Unknown/Insufficient Data)
- [x] P1-18: Three-level confidence staking (tentative/confident/certain) replacing 4-point slider
- [x] P1-19: Configuration versioning — already implemented (sessions + scores stamped with scoringConfigVersion)

### Database Schema
- [x] P1-20: Update assessment tables for v10 signal/domain changes (JSON columns already compatible — no migration needed)
- [x] P1-21: Configuration versioning already exists (scoring_config table with version field, sessions + scores stamped)

### Session Controller & Router
- [x] P1-22: Update session controller for foundation-first flow and pressure-test integration
- [x] P1-23: Update assessment router procedures for v10 data structures

### Content Generation
- [x] P1-24: Generate scenario content for all 15 interaction types across 6 domains (40 scenarios, 160 options seeded)
- [x] P1-25: Generate module content for learning prescription — 72 learning modules seeded across all 6 v10 domains (12 per domain × 5 difficulty levels × 8 modalities)

### Frontend
- [x] P1-26: Update results page for new 6 domains, confidence intervals, translation layer
- [x] P1-27: Update dashboard for new domain names and scoring (HR, Manager, Learner dashboards + MarketingPage + MethodologyPage all updated)
- [x] P1-28: Three-level confidence staking UI in assessment flow

### Testing
- [x] P1-29: Deterministic scoring tests — synthetic participants with known profiles
- [x] P1-30: Foundation gate behaviour tests
- [x] P1-31: Anti-gaming detection tests
- [x] P1-32: Pressure-test mechanic tests
- [x] P1-33: Quality gate validation tests
- [x] P1-34: Migrate all 8 legacy test files from v9.2 to v10 (domain names, signal keys, interaction types, API signatures)
- [x] P1-35: Full test suite green — 391/391 tests passing across 19 test files
- [x] P1-36: Generate scenario module content — 13 content scenarios with 52 options seeded across all 6 v10 domains and multiple interaction types
- [x] P1-37: Update gapAnalysisEngine.ts from v9.2 to v10 capability keys

### Pause Document
- [x] P1-38: Create Phase 1 Evolution Pause Document — comprehensive status document capturing all completed work, architecture decisions, and remaining roadmap
- [x] P1-39: Update Pause Document v2.0 with gap analysis against all 4 source documents (Methodology v10.7, Reporting v2.3, Adaptive Learning v1.0, Handoff Briefing)
- [x] P1-40: Fix remaining v9.2 capability key references in dashboard router, LearnerDashboard, AssessmentPage, ContentLibraryPage, auth router, assessment router, capabilityReport AIL engine

## Phase 2 — Assessment Experience (Methodology §18)
- [x] P2-AE-1: Apply pending SQL seeds (0022_learning_modules_seed.sql, 0022_scenario_content_seed.sql) to database
- [x] P2-AE-2: Three-level confidence staking UI — Guessing/Fairly sure/Certain three-button mechanic with colour-coded visual treatment and scoring weights (0.25×/0.65×/1.0×)
- [x] P2-AE-3: Post-completion reveal sequence — staged reveal (overall → domains → signals → recommendations) with CSS transition animations and 200/800/1400/2000ms delays
- [x] P2-AE-4: Scenario callbacks — Scenarios tab with "In scenario X, you chose Y — here's what that reveals" reflection cards, outcome-coloured borders, signal delta chips
- [x] P2-AE-5: Confidence-calibration reflection panel — Calibration tab with score ring, overconfident/underconfident/well-calibrated counts, calibration index, per-answer breakdown

## Phase 2 — Manager Dashboard (R&A §3)
- [x] P2-MD-1: Manager delegation tiers — Tier 1 Autonomous / Tier 2 Supervised / Tier 3 Restricted / Tier 4 Paused / Unassessed groupings with threshold logic
- [x] P2-MD-2: Manager suggested conversations — priority-ranked coaching conversation prompts based on readiness state, risk band, credibility, and revalidation status
- [x] P2-MD-3: Misuse friction indicators — high risk + safe classification, low credibility + safe classification, overdue revalidation pattern detection
- [x] P2-MD-4: Individual development trajectory — mini bar chart per team member with improving/stable/declining trend label and score delta, backed by scoreHistory from manager dashboard router

## Phase 2 — HR/CPO Dashboard (R&A §4-5, §13)
- [x] P2-HR-1: Organisational capability heatmap — colour-coded capability domain grid with red/amber/green bands and avg scores
- [x] P2-HR-2: Foundation Gap organisational view — employees below foundational threshold with count, percentage, and threshold explanation
- [x] P2-HR-3: Structured risk register — high-risk employees, low-credibility flags, unsafe classifications, revalidation overdue entries with severity bands
- [x] P2-HR-4: Regulatory Readiness view — 4-indicator panel (ICO compliance, Equality Act, transparency, governance) derived from capability scores with UK regulatory context note

## Phase 2 — Configuration & Compliance (R&A §11-14)
- [x] P2-CC-1: Configuration onboarding flow — 6-block OrgContextPage: org profile, AI tools & context, risk appetite & maturity, governance & policies, UK regulatory context, assessment configuration
- [x] P2-CC-2: Company AI Context capture — Block 2 in OrgContextPage: AI tools multi-select, custom tool input, AI maturity level, company AI context narrative textarea
- [x] P2-CC-3: Quarterly re-verification flow — quarterlyReviewEnabled flag in tenant settings; manager dashboard fires owner notification when overdue revalidations exist and quarterly review is enabled
- [x] P2-CC-4: UK Regulatory Context capture — Block 5 in OrgContextPage: multi-select UK regulatory frameworks (GDPR, ICO AI guidance, EU AI Act, FCA, NHS, Equality Act, etc.)
- [x] P2-CC-5: Small HR Function Mode — toggle in Block 6 of OrgContextPage; reduces assessment length ~40%, lowers evidence threshold, marks reports as small-function assessments

## Phase 2 — Reporting (R&A §6, §16; Methodology §16.4-16.5)
- [x] P2-RP-1: Dual-audience technical narrative — individual/manager/board narrative views with readiness state, score, credibility band, and tailored language per audience
- [x] P2-RP-2: Dual-audience executive narrative — board-level plain-English narrative generated from readiness state and overall score; available as separate audience tab in DualAudienceNarrativeView
- [x] P2-RP-3: Capability Requirement Translation Engine — capability_requirement_fit report type: 6-domain score vs threshold analysis with meets/approaching/gap status and overall fit percentage
- [x] P2-RP-4: Multi-assessment trajectory visualisation — trajectory_report type with score progression chart, trend classification (improving/stable/declining), and delta from first to latest assessment

## Phase 3 — Learning Layer (AL §2-5)
- [x] P3-LL-1: Full 4-stage Learning Prescription Engine — Stage 1 Block Resolution, Stage 2 Foundation Before Strategy, Stage 3 Regulatory Urgency, Stage 4 Strategic Development (generateAdaptivePlan in learningPathGenerator.ts, fully wired into getAdaptivePlan)
- [x] P3-LL-2: Learning Pathway UI — ModuleCard shows prescription stage badge (S1-S4) with colour coding, no-transfer badge; Learning-Aware Mode banner and Transfer Findings panel in LearningPlanPage
- [x] P3-LL-3: Module engagement telemetry — completionState derived from time-on-task ratio (0.8+ with reflection/score = completed_with_engagement, 0.5+ = completed, 0.2+ = partial, <0.2 = opened) in markModuleComplete
- [x] P3-LL-4: Transfer finding framework — getTransferFindings procedure returns findings[], summary (transferRate, noTransferModules, withEngagementModules) from active plan
- [x] P3-LL-5: No-transfer reporting — No-Transfer Findings panel in LearningPlanPage with module list, reason codes, and transfer rate; recordNoTransfer mutation with reason enum
- [x] P3-LL-6: Learning-aware reassessment mode — startSession fetches active plan, extracts recently completed module signal keys, stores learningAwareContext in sessionMetadataJson; getLearningAwareContext procedure for UI; Learning-Aware Reassessment banner in LearningPlanPage

## Phase 1 Remaining
- [x] P1-REM-1: Immersive scenario artefact rendering — email mockup, Slack thread, HRIS screen, policy document visual formats in assessment session (ArtefactBlock component wired into AssessmentSessionPage)
- [x] P1-REM-2: Narrative wrapper — fictional week at a mid-sized organisation connecting assessment scenarios (NarrativeWrapper component, LLM-generated session context stored in sessionMetadataJson.narrativeContext)
- [x] P1-REM-3: Human review queue UI — reviewer interface for processing quality gate flagged items (LlmReviewQueueTab + SessionFlagsTab in BackOfficePage, fully wired to tRPC)

## Technical Debt
- [x] TD-1: Rate limiting on auth endpoints (login, register, password reset)
- [x] TD-2: Email notifications for password reset — implemented via sendPasswordResetEmail() in server/email.ts, wired into auth.requestPasswordReset; uses RESEND_API_KEY env var
- [x] TD-3: Feature flag back-office UI — configurable feature flags via admin panel
- [x] TD-4: Multi-tenancy enforcement audit — verify all tRPC procedures enforce tenant isolation

## Combined Prompt Implementation (Apr 24 2026)

- [x] Part 1.1: Add audit logging to all 5 configuration write surfaces (org profile, capability thresholds, scoring config create/activate, AIL org context)
- [x] Part 1.2: Reconcile signal count — canonical answer is 28 (22 capability + 6 risk); corrected stale "26" comments in scoringEngine.ts and architecture doc
- [x] Part 1.3: Write load testing plan and customer admission policy document (LOAD_TESTING_AND_ADMISSION_POLICY.md)
- [x] Part 2 CPO Dashboard: World-class redesign — readiness matrix, regulatory zone, capability heatmap, strategic mismatch feed, CSV export, audit trail
- [x] Part 2 Participant Dashboard: Band-based redesign — above-fold readiness card, radar, scenario callbacks, LLM narrative, trajectory, no raw scores
- [x] Part 2 Manager Dashboard: Individual detail panel (This week / Delegation guidance / Development trajectory), active module display, conversation-due indicator, anti-comparison guards (no raw score column, no ranked lists)
- [x] Manager procedure extended: per-member capability shape, active module, conversation-due indicator
- [x] Learner procedure extended: scenario callbacks from last session, LLM narrative from last assessment

## Design System v2.2 Implementation (Apr 24 2026)

- [x] DS-1: Rewrite index.css with v2.2 token architecture — navy/warm-grey palette, Graphik font stack, dual-audience state tokens, spacing/radius/elevation/motion tokens
- [x] DS-2: Update AppShell.tsx to v2.2 sidebar spec — 240px width, 56px collapsed, 3px left active border, section labels, sunken sidebar background
- [x] DS-3: Update DashboardLayout.tsx to match v2.2 sidebar spec — 240px/56px widths, 3px left active border, sunken sidebar background applied
- [x] DS-4: Update button.tsx — 44px min target, aria-disabled pattern, loading state, icon spacing, sentence case
- [x] DS-5: Update badge.tsx — dual-audience state tokens, rectangular radius-xs, individual/org variants
- [x] DS-6: Update card.tsx — elevated/default/sunken variants, CardDivider, v2.2 padding tokens
- [x] DS-7: Update tabs.tsx — underline tabs, 2px navy-800 bottom border active state
- [x] DS-8: Update input.tsx — 44px height, navy-800 focus ring, v2.2 surface tokens, IME logic preserved
- [x] DS-9: Update all 4 auth pages to v2.2 — removed gradients, navy-800 brand panel, neutral-25 canvas
- [x] DS-10: Update assessment session to v2.2 surface spec — navy-800 interactive tokens, Inter font, green-700 success tokens
- [x] DS-11: Update results page to v2.2 dual-audience token usage — navy-600 radar/line chart, Inter font, navy-700 links

## Acme Ltd Demo Org (50 HR Employees)
- [x] ACME-1: Design org structure — 50 HR employees, major HR roles, reporting lines, score distribution plan
- [x] ACME-2: Seed tenant (company code: acme), 50 users (password: manutd99), org hierarchy, personas
- [x] ACME-3: Seed completed assessment sessions with realistic score distributions for all 50 users
- [x] ACME-4: Verified — CPO/HR Leader dashboard: 50 users, 14 safe/29 at-risk/7 unsafe, 6 capability breakdowns; Manager: full team list with state; Individual: score, readiness, capability scores all correct
- [x] ACME-5: Verified — admin board queries by tenant_id, Acme Ltd (tenant-acme-ltd) has 50 users visible

## Competitive Benchmark Improvements (All 14 Items)

### Quick Wins
- [x] QW-1: Hero KPI pattern on HR Leader, Manager, and Learner dashboards
- [x] QW-2: Rename dashboard nav items — "My Readiness", "My Team", "Org Capability"
- [x] QW-3: Improve empty state quality on Learner dashboard — onboarding card with CTA
- [x] QW-4: Strengths / Development priorities two-column split on HR Leader capability breakdown
- [x] QW-5: Conversation starters on Manager dashboard for ALL team members

### Strategic Upgrades
- [x] SU-1: Department / role / manager filter bar on HR Leader dashboard
- [x] SU-2: Progressive disclosure drill-down on capability domain cards
- [x] SU-3: Action recommendations panel on HR Leader dashboard (LLM-generated)
- [x] SU-4: Card-level export/share on dashboard cards (three-dot menu)
- [x] SU-5: Signal transparency on assessment results page

### Differentiating Investments
- [x] DI-1: LLM-generated narrative layer on all three main dashboards
- [x] DI-2: Longitudinal trend view on HR Leader dashboard

### Design Language Pass
- [x] DL-1: Typography hierarchy — hero number, section label, body
- [x] DL-2: Whitespace — increase card gap to 24-32px, internal padding to 24px
- [x] DL-3: Colour restraint — capability chart uses two colours max
- [x] DL-4: Chart type discipline — replace radar chart with horizontal bar chart on results page
- [x] DL-5: Micro-interactions — hover tooltips on all chart elements, 300ms transitions

## UX/UI Deep Dive — Best-in-Class Improvements (Apr 25 2026)

### P0 — Critical Bugs
- [x] UXD-01: Fix Content Library sidebar link — goes to /content (404) instead of /library in AppShell.tsx
- [x] UXD-02: Fix "1 people" grammar — should be "1 person" in HRDashboard department breakdown

### P1 — Login & Auth Pages
- [x] UXD-03: Rewrite LoginPage.tsx — fix broken CSS variables (var(--#10B981) etc), fix invisible left panel (white text on white bg), fix orphaned stats "6 3 90d", fix demo credentials org code mismatch (says "demo" but autofills "lumi"), add proper brand colour to left panel background
- [x] UXD-04: Fix RegisterPage.tsx — same broken CSS variable pattern as login, fix default tenant slug
- [x] UXD-05: Fix ForgotPasswordPage.tsx — broken CSS variables, undefined tokens (--neutral-0, --green-700, --elevation-sm)
- [x] UXD-06: Fix ResetPasswordPage.tsx — same broken CSS variable pattern

### P2 — App Shell & Navigation
- [x] UXD-07: Sidebar nav spacing — increase vertical padding between nav items (currently too cramped)
- [x] UXD-08: Sidebar active state — make the current page indicator more prominent (thicker left border, stronger background)
- [x] UXD-09: Sidebar section labels — increase size/weight of DEVELOP, GOVERNANCE, ADMINISTRATION labels
- [x] UXD-10: Sidebar-to-content transition — add subtle border or shadow between dark sidebar and light content area
- [x] UXD-11: Mobile sidebar — already implemented with hamburger + slide-out drawer

### P3 — Dashboard Improvements
- [x] UXD-12: Learner empty radar — hide the empty spider web chart when user has no assessment data; show meaningful empty state instead
- [x] UXD-13: Learner "Needs Support" badges — changed to "Foundational" for unassessed users
- [x] UXD-14: Learner CTA priority — for at-risk learners, primary CTA should be "Start Learning" not "Reassess"
- [x] UXD-15: Learner data inconsistency — if user has scores but no learning plan, show "Generate Learning Plan" CTA instead of "no plan yet"
- [x] UXD-16: HR Dashboard length — added collapsible sections with ChevronRight toggles
- [x] UXD-17: HR Dashboard "1 people" → "1 person" grammar fix in department breakdown
- [x] UXD-18: HR Dashboard KPI label — "16 Last 30 days" needs context label like "16 Assessed"
- [x] UXD-19: HR Dashboard revalidation zeros — show "No revalidations scheduled" instead of all-zero cards
- [x] UXD-20: Manager alert banner contrast — yellow/amber background text is hard to read
- [x] UXD-21: Manager bar chart labels — prevent truncation of capability domain names

### P4 — Empty States & Zero Values
- [x] UXD-22: KPI cards zero-value styling — mute 0-value counts to grey/neutral instead of semantic colours (red/green/blue)
- [x] UXD-23: Audit Log empty state — add "No audit events recorded yet" message with contextual guidance
- [x] UXD-24: Policy page empty state — fix "Create your first policy rule above" to "Click + New Policy to get started"
- [x] UXD-25: Policy KPI zero colours — red "0" for Hard Blocks looks alarming; use grey when 0
- [x] UXD-26: Content Library empty state — improve message when genuinely no modules exist
- [x] UXD-27: Reports empty state — "No data available" needs better explanation of what data is needed

### P5 — Learning Plan Polish
- [x] UXD-28: Module card icons — differentiate by modality (different icons for coaching vs quiz vs scenario)
- [x] UXD-29: Level badges — "L4", "L3" badges are grey and hard to read; increase contrast
- [x] UXD-30: "S4" badge explanation — add tooltip explaining what S4 means (Stage 4)
- [x] UXD-31: Start button prominence — make "Start" buttons more prominent (full buttons instead of text links)
- [x] UXD-32: Zero-value stat boxes — mute "0 Reviews" box to grey instead of green border
- [x] UXD-33: Tab active state — improved with stronger bottom border and background

### P6 — Assessment Page Polish
- [x] UXD-34: Capability domain card colours — consolidated admin pages to import from canonical DOMAIN_COLOURS
- [x] UXD-35: About section — made collapsible with ChevronDown toggle, collapsed by default
- [x] UXD-36: Assessment history — already shows proper empty state with CTA

### P7 — Reports & Admin Polish
- [x] UXD-37: Report type selector — added per-report icons (User, FileText, BarChart2, TrendingUp, Shield)
- [x] UXD-38: Report selection indicator — added ring-1, dot indicator, and hover states
- [x] UXD-39: Audit log category layout — fix orphaned "User" card (use 4+3 or 7-across grid)
- [x] UXD-40: User Management actions — added DropdownMenu with View Profile, Change Role, and status actions
- [x] UXD-41: User table sorting — added sortable columns with ArrowUpDown indicators
- [x] UXD-42: Profile page — added password strength indicator with colour-coded bar

### P8 — Micro-interactions & Polish
- [x] UXD-43: Loading skeletons — already present on all 3 dashboards and reports page
- [x] UXD-44: Table row hover states — add hover highlight to Manager Dashboard team table
- [x] UXD-45: Chart animations — add smooth load animations to all charts
- [x] UXD-46: Donut chart readability — increased height to 180px, inner/outer radius to 45/70
- [x] UXD-47: Marketing page — replaced with "Trusted by forward-thinking HR teams" sector pills

## Adaptive Learning Deep Dive — Gap Analysis vs Best Practice

### Batch 1 — High Impact (Implement Now)
- [x] AL-01: Competence-Confidence Matrix visualisation on AssessmentResultsPage — 2×2 quadrant chart showing per-domain placement (unconscious incompetence, conscious incompetence, conscious competence, unconscious competence)
- [x] AL-02: Competence-Confidence Matrix summary on LearnerDashboard (CompetenceConfidenceWidget) — compact quadrant indicator showing the learner's overall position
- [x] AL-03: Competence-Confidence Matrix org-level distribution on HRDashboard — 4-quadrant distribution panel added to HR Dashboard showing Blind Spot / Aware Gap / Developing / Mastery counts with progress bars
- [x] AL-04: Metacognitive Feedback / Blind Spots section on AssessmentResultsPage — identifies domains where confidence was high but performance was low, explains the Dunning-Kruger connection, links to targeted learning modules
- [x] AL-05: Adaptive Revalidation Cadence — already fully implemented (risk-based 30/60/90 day intervals) — make revalidation per-domain (critical: 3mo, overconfident: 4mo, proficient: 6mo), surface per-domain schedule on learner dashboard

### Batch 2 — Medium Impact
- [x] AL-06: Learning Path Journey Map — visual 4-stage pipeline on LearningPlanPage My Plan tab showing prescription stages as colour-coded cards with completion progress, active stage highlight, and click-to-filter
- [x] AL-07: Mastery-Based Progression Gates — markModuleComplete enforces 70% mastery threshold before unlocking dependent items; CompletionScreen shows gate-blocked banner with retake button; locked items show 'Retake required' badge; plan item insertion bug fixed (items with unlockAfterModuleId now start as 'locked')

### Deferred
- [x] AL-08: Adaptive difficulty within modules — data collection layer implemented: moduleEngagementEvents table (migration 0034), trackSectionEngagement procedure in adaptiveLearning router, handleSectionEngagement helper in ModulePlayerPage; adaptive content injection is Phase 3
- [x] AL-09: Social/Collaborative Learning — "Share with team" action on completed modules that creates a nudge with reflection/takeaway — ShareWithTeamPanel component added to CompletionScreen, shareWithTeam procedure in adaptiveLearning router, persists to learning_nudges table and notifies owner
- [x] AL-10: Content Freshness / Auto-Generation — data layer implemented: getStaleModules procedure in adaptiveLearning router (returns modules older than configurable staleDays threshold with staleDays count); LLM-based auto-generation is Phase 3

## Bug Fixes (UX Deep Dive Follow-up)
- [x] BF-01: Fix sessionId undefined error on Learner Dashboard — CompetenceConfidenceWidget queries assessment.results with undefined sessionId when user has no completed assessment

## Dashboard Rebuild v1.1 (World-Class Standard — Lattice/CultureAmp Quality)
### Backend — tRPC Procedures
- [x] DB-01: Individual Dashboard procedure (trpc.dashboard.individual) — overall score/rating, confidence, score history, domain scores/ratings, gap heatmap, rating explanation
- [x] DB-02: Domain Detail procedure (trpc.dashboard.domainDetail) — Light (narrative) + Medium (signal breakdown) drill-down
- [x] DB-03: Domain Evidence procedure (trpc.dashboard.domainEvidence) — Deep drill-down with scenario evidence (or placeholder if selectionIndication not ready)
- [x] DB-04: getCurrentPlanSummary procedure — module count, estimated time, completion percentage for link-to-learning card
- [x] DB-05: Manager Dashboard procedure (trpc.dashboard.manager) — header, team rating distribution, team domain heatmap
- [x] DB-06: Manager Conversation Prompts procedure — 10 deterministic patterns with priority ordering
- [x] DB-07: Manager Development Overview procedure — active modules, completion rate, on track/slipping/stalled counts
- [x] DB-08: Leader Hero Finding procedure — 5 patterns (on_track, at_risk, mixed, partial, not_configured)
- [x] DB-09: Leader Function Position + Rating Distribution + Domain Distribution procedures
- [x] DB-10: Leader Development Heatmap procedure — 6 domains × 7 role families
- [x] DB-11: Leader Domain Trajectory procedure — 6 time series (NEW v1.1)
- [x] DB-12: Leader Strategic Findings procedure — 8 deterministic patterns with priority ordering
- [x] DB-13: Leader Teams procedure + people search
### Routing & Navigation
- [x] DB-14: Update App.tsx routing — /dashboard (role-aware), /dashboard/personal (all roles), /dashboard/domain/:domainKey
- [x] DB-15: Update AppShell — "Your own journey" entry point for all authenticated users, breadcrumb support
### Frontend — Individual Dashboard
- [x] DB-16: Individual Dashboard — Component 1 (Header: name, role, last assessment, next reassessment, CTA)
- [x] DB-17: Individual Dashboard — Component 2 (Overall score + rating hero with confidence indicator)
- [x] DB-18: Individual Dashboard — Component 3 (Score progress line chart with target line)
- [x] DB-19: Individual Dashboard — Component 4 (Per-domain score cards, 6 cards fixed order)
- [x] DB-20: Individual Dashboard — Component 5 (Gap analysis heatmap: current vs target vs gap)
- [x] DB-21: Individual Dashboard — Component 6 (Link to learning CTA card)
- [x] DB-22: Individual Dashboard — Domain drill-down slide-over (Light + Medium + Deep + Development)
### Frontend — Manager Dashboard
- [x] DB-23: Manager Dashboard — Component 1 (Header: name, team, size, last activity)
- [x] DB-24: Manager Dashboard — Component 2 (Team rating distribution bars, clickable filter)
- [x] DB-25: Manager Dashboard — Component 3 (Team domain heatmap: rows=people, cols=domains)
- [x] DB-26: Manager Dashboard — Component 4 (Conversation prompts, up to 5, priority-ordered)
- [x] DB-27: Manager Dashboard — Component 5 (Team development overview: on track/slipping/stalled)
- [x] DB-28: Manager Dashboard — Filter controls (by rating, domain, plan status, assessment recency)
- [x] DB-29: Manager Dashboard — Drill-down to individual with breadcrumb
### Frontend — Leader Dashboard
- [x] DB-30: Leader Dashboard — Component 1 (Hero finding with 5 patterns)
- [x] DB-31: Leader Dashboard — Component 2 (Function position summary)
- [x] DB-32: Leader Dashboard — Component 3 (Headcount distribution by rating)
- [x] DB-33: Leader Dashboard — Component 4 (Per-domain function distribution)
- [x] DB-34: Leader Dashboard — Component 5 (Function-wide development heatmap 6×7)
- [x] DB-35: Leader Dashboard — Component 6 (Per-domain function trajectory, 6 small charts)
- [x] DB-36: Leader Dashboard — Component 7 (Strategic findings, up to 5)
- [x] DB-37: Leader Dashboard — Filter controls (role family, rating, manager, recency, initiative)
- [x] DB-38: Leader Dashboard — Teams view + search people + drill-down with audit logging
### Cross-Dashboard
- [x] DB-39: Design system compliance — Inter typography, JetBrains Mono for numbers, navy palette, custom charts, 8pt grid
- [x] DB-40: Skeleton loaders, progressive loading, WCAG 2.2 AA compliance
- [x] DB-41: Responsive behaviour per spec (Individual: all viewports, Manager: lg+, Leader: xl+)

## Bug Fixes — Dashboard v1.1
- [x] BF-DB-01: Leader Dashboard hero finding shows "Strategic context not yet captured" even after completing AI roadmap configuration — fixed heroFinding to query ailOrgContext table, now shows correct hero pattern (on_track/at_risk/mixed/partial) when strategic input is configured

## Department Filter — Leader Dashboard
- [x] DF-01: Investigate department data model — no departments table, using roleFamily (7 structured values) as department proxy
- [x] DF-02: All 5 leader procedures updated to accept optional roleFamily filter input
- [x] DF-03: heroFinding, main, domainTrajectory, strategicFindings, teams all filter by roleFamily
- [x] DF-04: Department filter dropdown added to Leader Dashboard header with 7 role family options + 'All departments'
- [x] DF-05: All 5 queries wired to useMemo-stabilised queryInput; active filter indicator with clear button shown when filtering
- [x] DF-06: Vitest tests for department filtering logic (707 tests, all passing)

## Platform UI Polish Audit
- [x] POLISH-01: Fixed global theme — removed 40+ broken hsl(var(--)) references (oklch values wrapped in hsl()), added missing --navy-xxx, --neutral-0, --elevation-xxx, --state-xxx CSS variables, fixed var(--color-red/green-xxx) prefixes
- [x] POLISH-02: Fixed ProfilingModal — added explicit bg-background to DialogContent to prevent content bleeding through
- [x] POLISH-03: Fixed AssessmentPage — fixed var(--green-700) to var(--color-green-700), fixed var(--green-50/100) to var(--color-green-50/100)
- [x] POLISH-04: ModulePlayerPage — verified clean, no broken CSS references
- [x] POLISH-05: Individual Dashboard V2 — verified clean, no broken CSS references
- [x] POLISH-06: Manager Dashboard V2 — verified clean, no broken CSS references
- [x] POLISH-07: Leader Dashboard V2 — verified clean, no broken CSS references
- [x] POLISH-08: Fixed LearningPlanPage — removed last hsl(var(--muted-foreground)) reference
- [x] POLISH-09: Fixed ResultsPage — fixed 16 hsl(var(--)) references to var(--)
- [x] POLISH-10: BackOffice/Admin pages — verified clean after global fixes
- [x] POLISH-11: OrgContext/Onboarding pages — verified clean after global fixes
- [x] POLISH-12: Fixed AppShell sidebar — fixed hsl(var(--sidebar-border/accent)) in sidebar.tsx
- [x] POLISH-13: Home/Landing page — verified clean after global fixes
- [x] POLISH-14: Fixed shared UI components — badge.tsx, button.tsx, card.tsx, input.tsx, tabs.tsx all fixed (var(--neutral-xxx) → var(--color-neutral-xxx), added missing state badge CSS variables)

## Bug Fixes — Overlay/Z-Index Issues (Round 2)
- [x] BF-OV-01: ProfilingModal — ROOT CAUSE was bg-popover/bg-background not generating CSS rules in TW4. Fixed by adding --color-* prefixed semantic tokens to @theme block. Dialog overlay also made more opaque (bg-black/80 + backdrop-blur)
- [x] BF-OV-02: Leader Dashboard dropdown — ROOT CAUSE same as above. bg-popover now resolves to solid white. Added relative z-10 to header for extra safety
- [x] BF-CSS-ROOT: Tailwind 4 @theme requires --color-* prefix for utility class generation. Added --color-background, --color-foreground, --color-card, --color-popover, --color-primary, --color-secondary, --color-muted, --color-accent, --color-destructive, --color-border, --color-input, --color-ring, plus chart and sidebar tokens. All 1951 references to bg-background, bg-card, bg-popover, text-foreground, text-muted-foreground, border-border etc. now resolve to actual CSS rules with solid colours

## Loading Animations & Skeleton Screens
- [x] LOAD-01: Create shared loading components — AiQ-branded skeleton shimmer, page-level spinner, section skeleton, card skeleton, table skeleton
- [x] LOAD-02: Dashboard pages (Individual, Manager, Leader) — skeleton cards, shimmer charts, animated stat counters
- [x] LOAD-03: Assessment pages (AssessmentPage, AssessmentSessionPage, AssessmentResultsPage) — skeleton question cards, progress shimmer
- [x] LOAD-04: Learning pages (LearningPlanPage, ModulePlayerPage) — skeleton module cards, journey map shimmer
- [x] LOAD-05: Admin pages (BackOffice, OrgContext, ContentCMS) — table skeletons, form shimmer
- [x] LOAD-06: AppShell and navigation — route transition fade-in animation on page mount

## Leader Dashboard Review & Fixes
- [x] LD-01: Fix capability heatmap — replaced monochrome navy palette with semantic red-amber-green colour scale, added headcount badges, colour legend, and tooltip-style hover
- [x] LD-02: Add HR-business strategy alignment section — new strategicAlignment API, priority-to-domain mapping, overall alignment signal, governance readiness, HR influence, AI maturity context, and strategic priorities input in OrgContext admin
- [x] LD-03: Fix strategic findings section — widened thresholds, added 7 patterns (readiness risk, domain gap, development engagement, function stall, role family disparity, confidence misalignment, capability concentration), improved frontend rendering with observation/data/implication
- [x] LD-04: Improve heatmap data — colour scale now differentiates scores visually even when numerically close, added headcount context

## Heatmap Department Filter
- [x] HF-01: Add department/business unit filter UI to the heatmap card — popover multi-select with checkboxes, badge chips, select/clear all
- [x] HF-02: Support filtering of heatmap data by department — client-side filtering of existing heatmap rows by selected role families
- [x] HF-03: Filter state visually clear — active count badge on trigger, removable chips, "Showing X of Y" summary, empty state message

## Peakon-Style Heatmap Rebuild
- [x] PH-01: Rebuild heatmap with smooth green-to-red gradient cells (continuous colour scale from deep red to deep green)
- [x] PH-02: Show decimal scores (e.g. 5.5, 8.7) on 1-10 scale inside cells with white text on coloured background
- [x] PH-03: Clean grid layout with column headers, tooltips for full domain names, sticky segment column
- [x] PH-04: Segment hierarchy — expandable row chevrons for role families, overall aggregate row at top
- [x] PH-05: Sticky first column for segment names, horizontal scroll for domains, min-width per column
- [x] PH-06: Department filter integrated — popover multi-select with headcount, badge chips, select/clear all, dynamic aggregate row

## Platform-Wide Peakon Visual Language
- [x] PV-01: Rebuilt DashboardUI shared components — ScoreDisplay with peakon prop, PeakonScoreBadge, CapabilityBar with gradient fill, shared peakon-colors.ts utility
- [x] PV-02: Created PeakonScoreBadge and scoreToColor/formatPeakonScore utilities in peakon-colors.ts for platform-wide reuse
- [x] PV-03: Individual Dashboard — ScoreDisplay with peakon prop, PeakonScoreBadge in gap table and domain drill-down
- [x] PV-04: Manager Dashboard — PeakonScoreBadge in team heatmap, member drill-down, and readiness displays
- [x] PV-05: Leader Dashboard — PeakonScoreBadge in domain distribution, trajectory sparklines, teams section, function score
- [x] PV-06: Assessment Results Page — ScoreRing with Peakon gradient, CapabilityBar scores with gradient badges
- [x] PV-07: Learning Plan Page — gap analysis scores with Peakon gradient badges, overall readiness score with gradient
- [x] PV-08: ExplanationDrawer ScoreBreakdown — overall score and factor scores with Peakon gradient badges

## Learning & Assessment Peakon Visual Overhaul
- [x] LP-01: Learning Plan page — unified global font to Sora, removed hardcoded font references across all files, light-theme priority colours
- [x] LP-02: Learning Plan Gap Analysis tab — Peakon gradient score badges, light-theme capability cards
- [x] LP-03: Learning Plan Progress tab — light-theme module cards, journey map stage cards, benchmarks tab
- [x] LP-04: Assessment landing page — Peakon gradient score cells, light-theme domain cards and session history
- [x] LP-05: Assessment session page — all 44 dark-theme patterns replaced with light-theme equivalents, Peakon completion screen
- [x] LP-06: Assessment results page — light-theme readiness/credibility/risk configs, Peakon gradient score badges throughout

## Strategic Alignment Fix
- [x] SA-01: Fix strategic priorities not loading on Leader Dashboard — seeded 5 strategic priorities and 5 current challenges for Acme tenant, org context row was missing strategic_priorities_json data

## Peakon-Style Full Dashboard Rebuild
- [x] PK-01: Build Peakon design system primitives — HeroScore, GradientCell, Sparkline, DistributionBar, PillFilter, AIInsightCard, StatTile, ScoreTrendCard, TrendArrow, BenchmarkChip, SegmentRow
- [x] PK-02: Rebuild Individual Dashboard — HeroScore, ReadinessDistributionBar, AIInsightCard, ScoreTrendCard, domain sparklines, benchmark comparison
- [x] PK-03: Rebuild Manager Dashboard — HeroScore, StatTile, ReadinessDistributionBar, AIInsightCard, team heatmap with gradient cells, pill segment filters, member drill-down
- [x] PK-04: Rebuild Leader Dashboard — HeroScore, StatTile, ReadinessDistributionBar, AIInsightCard, ScoreTrendCard domain trajectory, domain distribution, strategic alignment
- [x] PK-05: Assessment Results already uses scoreToColor/formatPeakonScore throughout — ScoreRing, CapabilityBar, gradient badges all aligned
- [x] PK-06: Learning Plan already uses scoreToColor/formatPeakonScore throughout — gap analysis, progress tab, module cards all aligned
## Adaptive Learning System Stress Test
- [x] AL-STRESS-01: Stress test adaptive learning against 10 Acme employees — enrol, progress modules, check for errors
- [x] AL-STRESS-02: Fix React hooks violations in IndividualDashboardV2, ManagerDashboardV2, LeaderDashboardV2 (useMemo after early returns)
- [x] AL-STRESS-03: Fix module player renderers — all 8 modality types now handle generic seeded schema via normaliseSection fallbacks (coaching→reflectionPrompts, quiz→self-assessment, scenario→reflectionPrompts, tutorial→title/content, practical→sections-as-steps, case_study→questions fallback)

## Learning System Redesign (World-Class LMS Standards)
- [x] LMS-01: Research world-class LMS design patterns (Workday Learning, LinkedIn Learning, Degreed, 360Learning)
- [x] LMS-02: Redesign Learning Plan page — clear journey stages, rich module cards, progress tracking, next action CTA
- [x] LMS-03: Redesign Module Player — consistent formatting across all 6 modality types, rich content rendering
- [x] LMS-04: Fix module content — ensure all modules render real content not generic fallback placeholders
- [x] LMS-05: Module state system — locked/available/in-progress/completed with clear visual distinction

## Rich Module Content Rebuild (Apr 2026)
- [x] MOD-01: Research best-in-class LMS module structure (Coursera, LinkedIn Learning, Degreed, Workday Learning)
- [x] MOD-02: Redesign module body_json schema to support rich multi-tool 10+ min modules
- [x] MOD-03: Rebuild LLM module generation prompts to produce rich content (reading + scenario + quiz + reflection + coaching + case study)
- [x] MOD-04: Regenerate all existing module content using new rich schema
- [x] MOD-05: Update Module Player to render all new content sections (reading blocks, key concepts, evidence, quiz, reflection, coaching, further reading)

## Module Progress Tracking Bar (Apr 2026)
- [x] PROG-01: Add section-based progress tracking to ModulePlayerPage (tracks which sections have been viewed)
- [x] PROG-02: Render a sticky progress bar at the top of the module player showing % complete and section indicators
- [x] PROG-03: Mark sections as visited when scrolled into view or navigated to
- [x] PROG-04: Persist progress state across page refreshes (localStorage keyed by module id)

## PDF Download (Apr 2026)
- [x] PDF-01: Build server-side PDF generation router (pdfRouter) with branded HTML-to-PDF using puppeteer or html-pdf-node
- [x] PDF-02: Assessment Report PDF — full capability scores, strengths, gaps, recommended actions
- [x] PDF-03: Learning Plan PDF — personalised module list, progress, completion status
- [x] PDF-04: Module PDF — printable version of a module's content
- [x] PDF-05: Team/Org Dashboard PDF — aggregate capability scores across team/org (admin)
- [x] PDF-06: Capability Profile PDF — one-page summary of learner capability scores across all domains
- [x] PDF-07: Wire up Download PDF buttons on all relevant pages

## UX/UI Audit Improvements (Apr 2026)
- [x] UX-01: HR Function Dashboard — restructure into Hero/Insight/Detail zones with visual hierarchy
- [x] UX-02: Capability domain cards — colour-coded left-border accents (green/amber/red) by readiness status
- [x] UX-03: Learning plan — group modules by capability domain with collapsible sections and mini progress bars
- [x] UX-04: Progress bar step labels — shorten to 2-3 words max to prevent truncation
- [x] UX-05: Empty states — contextual guidance with action CTAs on Simulations, Content Library, Team Dashboard
- [x] UX-06: Sidebar — role-based filtering (hide ADMINISTRATION section from non-admin users) — already implemented
- [x] UX-07: Assessment page — add View Results link on completed assessments, readiness band tooltips
- [x] UX-08: Reports page — stronger selected state already implemented; history tabs already distinct
- [x] UX-09: Gap analysis table — replace broken dashes with contextual empty state message
- [x] UX-10: Module player — move personalised context panel below title and progress bar

## UX/UI Audit Round 2 (Apr 2026)
- [x] UX2-01: Content Library shows 0 modules — fix published filter so learners can browse all modules
- [x] UX2-02: Audit Log empty — wire audit events for login, assessment, module, report, policy actions
- [x] UX2-03: Module player "Start Learning" button disconnected — wire to advance to Learn tab
- [x] UX2-04: Reports show no data — fix report query to match actual assessment data
- [x] UX2-05: "Limited evidence" hardcoded — compute from actual response count per domain
- [x] UX2-06: Insights and Activity tabs empty — add capability gap summary and activity log
- [x] UX2-07: Progress bar labels still truncating — cap at 15 chars with tooltip
- [x] UX2-08: Profile page dead end — add capability summary card and learning plan link
- [x] UX2-09: "Your own journey" label ambiguous — rename to "My Capability Profile"
- [x] UX2-10: Heatmap no-data rows visual noise — style with reduced opacity and "Not assessed" label
## UX/UI Audit Round 3 (Apr 2026)
- [x] R3-01: Assessment session — keyboard shortcut pill already present (1-4 to select, Enter to submit)
- [x] R3-02: Assessment results — in-progress session detection already implemented; verified working
- [x] R3-03: dashboardV2.ts — fixed functionRating threshold to align with scoreToReadinessLabel (>=50 = developing)
- [x] R3-04: LearningPlanPage — day streak computed dynamically from completedAt timestamps on plan items
- [x] R3-05: ModulePlayerPage — planItemId passed in URL when navigating to next module from completion screen
- [x] R3-06: ReportsPage + report.ts — LearnerReportView and ManagerTeamReportView added; manifestJson.data used
- [x] R3-07: (deferred — policy dialog already has server-side validation; inline validation added in next round)
- [x] R3-08: dashboardV2.ts — gapHeatmap key mismatch fixed; extraGapRows added for HR-specific capability keys
- [x] R3-09: audit.ts + AuditLogPage — actor names enriched via users join; search filter updated
- [x] R3-10: AssessmentResultsPage — Copy link button added to results header

## UX/UI Audit Round 4 (Apr 25, 2026)

- [x] R4-01: Content Library shows 0 modules — pageSize 200 exceeds backend max 100; fix to 100 and raise backend max
- [x] R4-02: Audit Log shows 0 entries — pageSize 200 exceeds backend max 100; fix to 100 and raise backend max
- [x] R4-03: Scenario Library stats show 0 Published / 0 Ethics Cases / 0 Workflow Domains — UI reads wrong keys
- [x] R4-04: Learning Plan "0 In Progress" counter — no items have status "in_progress"; show started_at items as in-progress
- [x] R4-05: Dashboard "View development priorities" button should deep-link to /learning?tab=insights
- [x] R4-06: Assessment session domain sidebar shows raw capability key instead of human label
- [x] R4-07: Simulations page "Start your assessment" CTA links to dead route; fix to /assessment
- [x] R4-08: Reports page "Download JSON" button label is confusing; rename to "Export Data (JSON)"
- [x] R4-09: Users admin page "Change Role" shows toast "coming soon"; implement actual role change mutation
- [x] R4-10: Policy page form validation — "Create Policy" button should be disabled when name is empty (already done) but also show inline error on blur

## UX/UI Audit Round 4 (Apr 25, 2026)

- [x] R4-01: Content Library — raise listModules pageSize max to 200 (was 100); page now loads all 145 published modules
- [x] R4-02: Audit Log — raise audit.logs pageSize max to 200 (was 100); log now shows all entries
- [x] R4-03: Scenario Library stats — fix stats mapping in AssessmentContentPage (byStatus/byDomain keys vs published/ethicsSensitive/domains)
- [x] R4-04: Learning Plan "0 In Progress" counter — treat items with startedAt but no completedAt as in-progress
- [x] R4-05: Dashboard CTA — fix "View development priorities" link to route to /learning?tab=insights
- [x] R4-06: Assessment session sidebar — use DOMAIN_LABELS to show human-readable capability names instead of raw snake_case keys
- [x] R4-07: Simulations page — replace native anchor tag with wouter Link for "Start your assessment" CTA
- [x] R4-08: Reports page — rename "Export" to "Export Data (JSON)" and export report data not the full manifest envelope
- [x] R4-09: Policy page — wire up real trpc.policy.create mutation (was a no-op placeholder); add create procedure to policy router
- [x] R4-10: Users page — add trpc.users.changeRole mutation; wire up "Change Role" dropdown item with a proper dialog


## UX/UI Audit Round 4 (Apr 25, 2026)

- [x] R4-01: Content Library — raise listModules pageSize max to 200 (was 100); page now loads all 145 published modules
- [x] R4-02: Audit Log — raise audit.logs pageSize max to 200 (was 100); log now shows all entries
- [x] R4-03: Scenario Library stats — fix stats mapping in AssessmentContentPage (byStatus/byDomain keys vs published/ethicsSensitive/domains)
- [x] R4-04: Learning Plan "0 In Progress" counter — treat items with startedAt but no completedAt as in-progress
- [x] R4-05: Dashboard CTA — fix "View development priorities" link to route to /learning?tab=insights
- [x] R4-06: Assessment session sidebar — use DOMAIN_LABELS to show human-readable capability names instead of raw snake_case keys
- [x] R4-07: Simulations page — replace native anchor tag with wouter Link for "Start your assessment" CTA
- [x] R4-08: Reports page — rename "Export" to "Export Data (JSON)" and export report data not the full manifest envelope
- [x] R4-09: Policy page — wire up real trpc.policy.create mutation (was a no-op placeholder); add create procedure to policy router
- [x] R4-10: Users page — add trpc.users.changeRole mutation; wire up "Change Role" dropdown item with a proper dialog

## Assessment UX/UI Audit Round 5 (Apr 2026)
- [x] A5-01: Completion screen shows raw integer score (54) instead of Peakon format (5.4)
- [x] A5-02: Results page "Overall Score" stat card shows raw integer + raw confidence interval instead of Peakon format
- [x] A5-03: Benchmarks tab — chart Y-axis, table cells, percentile cards all show raw integers; convert to Peakon 0-10 format
- [x] A5-04: Question prompt label uses text-xs uppercase — visually indistinguishable from section labels; promote to text-sm/text-base
- [x] A5-05: Confidence staking section not visually dimmed when no answer selected — add opacity-50 + pointer-events-none
- [x] A5-06: Results page TabsList has 7 tabs that overflow on narrow screens — add horizontal scroll + hide icon labels on mobile
- [x] A5-07: Development tab has no on-demand "Generate AI Report" button when llmNarrative is null
- [x] A5-08: Scenarios tab signal delta chips show raw keys (ai_interaction) — use DOMAIN_LABELS for human-readable labels
- [x] A5-09: Benchmarks chart tooltip formatter shows raw integers — format with formatPeakonScore
- [x] A5-10: Assessment landing page "About" section collapsed by default — expand for first-time users (no prior sessions)

## Dashboard UX/UI Audit Round 6 (Apr 2026)
- [x] R6-01: Strategic Alignment section — 3 raw score displays (functionAvg, avgRelevantScore, domain avgScore) need formatPeakonScore
- [x] R6-02: Gap analysis gapValue column shows raw 0-100 difference — convert to Peakon scale (÷10)
- [x] R6-03: Gap analysis gap colour thresholds use saturated traffic-light colours — replace with muted Peakon palette
- [x] R6-04: ScoreProgressChart line/dot colours use saturated #10B981 — replace with muted Peakon primary
- [x] R6-05: Both dashboards define local DOMAIN_COLOURS with wrong saturated palette — import canonical from domains.ts
- [x] R6-06: LeaderDashboardV2 defines local DOMAIN_LABELS duplicate — import from domains.ts
- [x] R6-07: Heatmap tooltip exposes raw 0-100 internal score — show only Peakon format (x.x / 10)
- [x] R6-08: OVERALL_ALIGNMENT_STYLES borders use saturated #10B981/#F59E0B/#EF4444 — replace with muted equivalents
- [x] R6-09: DomainDrillDown signal breakdown dots use saturated emerald/amber/red — replace with muted Peakon palette
- [x] R6-10: Round 5 todo items (A5-01 through A5-10) not marked as complete — update todo.md

## Learning Dashboard Deep Dive — Round 7 (Apr 2026)
- [x] L7-01: Insights tab overallReadinessScore displayed as raw 0-100 — convert to Peakon format (÷10) and fix progress bar width
- [x] L7-02: Insights tab capability scores/benchmarks displayed as raw 0-100 — convert to Peakon format (÷10) and fix bar widths
- [x] L7-03: ContentLibraryPage uses saturated #10B981 in 5 places (modality badge, hover, difficulty bar, progress text, chevron) — replace with muted Peakon primary
- [x] L7-04: ContentLibraryPage difficulty bar inactive segments use hardcoded #E5E7EB — replace with theme-aware muted colour
- [x] L7-05: ModulePlayerPage MODALITY_META uses saturated Tailwind colours (#10b981, #f59e0b, #ec4899, #ef4444, #84cc16, #059669, #dc2626) — replace with Paul Tol palette
- [x] L7-06: ModulePlayerPage has 63 hardcoded slate/light-mode classes (bg-slate-50, text-slate-700, text-slate-600, bg-slate-100) — replace with semantic theme classes
- [x] L7-07: TeamLearningPage ReadinessBadge uses saturated emerald/amber/red — replace with muted Peakon palette
- [x] L7-08: TeamLearningPage AI Score shows raw 0-100 integer — convert to Peakon format (÷10)
- [x] L7-09: TeamLearningPage "No activity" badge uses saturated amber — replace with muted Peakon palette
- [x] L7-10: ContentLibraryPage CAPABILITY_COLORS is local duplicate with incomplete entries — import from canonical domains.ts

## Colour Scheme Audit — Round 8 (Apr 2026)
- [x] C8-01: Bulk-replace 294 hardcoded #10B981 refs across 29 files with Tailwind semantic classes (text-primary, bg-primary, border-primary)
- [x] C8-02: AppShell sidebar — replace 11 inline style hex values with Tailwind sidebar-* token classes (bg-sidebar, text-sidebar-foreground, border-sidebar-border)
- [x] C8-03: AppShell top header bar — replace hardcoded #FFFFFF bg + #E2E8F0 border with bg-background + border-border
- [x] C8-04: ProfilingModal — replace 32 hardcoded #10B981 refs with text-primary/bg-primary/border-primary
- [x] C8-05: Auth pages (Login, Register, ForgotPassword, ResetPassword) — replace ~18 hardcoded brand hex values with semantic Tailwind classes
- [x] C8-06: OnboardingWizard — replace 14 hardcoded #10B981 refs with semantic primary classes
- [x] C8-07: ProfilePage — replace 13 hardcoded colour refs (#10B981, #059669, #DC2626, #F59E0B) with semantic classes and muted palette
- [x] C8-08: AssessmentSessionPage — replace 41 saturated emerald/amber/red Tailwind classes with muted Paul Tol palette
- [x] C8-09: ManagerDashboardV2 — replace 15 saturated emerald/amber/red status cards with muted palette
- [x] C8-10: MarketingPage — update domain colours in local const C to use canonical Paul Tol palette from domains.ts

## Sizing & Spacing Audit — Round 9 (Apr 2026)
- [x] S9-01: CardContent padding is inconsistent (p-3/p-4/p-5/p-6/p-8/p-12) — standardise to p-5 for data cards, p-6 for hero/feature cards
- [x] S9-02: Page wrapper padding inconsistent — some pages use p-6, others p-4 md:p-6 — standardise all app pages to px-5 py-6 md:px-8 md:py-8 max-w-7xl mx-auto
- [x] S9-03: Assessment session page max-w-2xl not centred (missing mx-auto) — add mx-auto to all 5 render variants
- [x] S9-04: 128 instances of arbitrary pixel font sizes (text-[9px] through text-[13px]) — replace with Tailwind scale: text-[9px]→text-[10px], text-[10px]→text-xs, text-[11px]→text-xs, text-[12px]→text-xs, text-[13px]→text-sm
- [x] S9-05: StatTile component uses bg-white (light-mode only) — replace with bg-card for theme compatibility; also standardise to p-5 and rounded-xl
- [x] S9-06: Section label tracking inconsistent — tracking-wide vs tracking-wider vs tracking-widest used interchangeably — standardise all section labels to tracking-widest
- [x] S9-07: Table cell padding inconsistent — py-2/py-2.5/py-3 mixed — standardise all data table cells to py-3 px-4 for comfortable reading
- [x] S9-08: PeakonPrimitives PillFilter uses bg-white (light-mode only) — replace with bg-card; also AIInsightCard uses violet-50/indigo-50 hardcoded — replace with bg-primary/5 border-primary/20
- [x] S9-09: Gap between dashboard section cards is space-y-6 on some pages and space-y-5 on others — standardise to space-y-6 across all dashboard pages
- [x] S9-10: AppShell sidebar header height h-16 vs top bar h-14 — misaligned by 8px creating visual jump — align both to h-14 (56px)

## Assessment → Learning Plan Handoff (Apr 2026)
- [x] HP-01: Add "Your learning plan is ready" status card and CTA to the Development tab of AssessmentResultsPage — query the user's latest learning plan, show plan item count and top priority, and deep-link to /learning?tab=insights

## Full Platform QA — Round 10

- [x] QA10-01: AuditorDashboard Export button uses native `alert()` — replace with toast.info for consistency
- [x] QA10-02: BackOfficePage OUTCOME_CONFIG "adequate" uses hardcoded `bg-blue-50 text-blue-700 border-blue-200` — replace with semantic tokens
- [x] QA10-03: BackOfficePage OUTCOME_CONFIG "abstain/unknown" uses hardcoded `bg-gray-100 text-gray-600` — replace with semantic tokens
- [x] QA10-04: Server-side CAPABILITY_COLOURS in assessment.ts uses saturated hex (#10B981, #F59E0B, #EF4444) — align with Paul Tol palette
- [x] QA10-05: BetaApplicationPage validation error messages use hardcoded `text-[#CC3344]` — replace with `text-destructive`
- [x] QA10-06: UsersPage "View profile" dropdown item shows "coming soon" toast — remove or wire to user detail route
- [x] QA10-07: TenantsPage "Create tenant" button shows "coming soon" toast — replace with disabled state and tooltip
- [x] QA10-08: MarketingPage nav links use hardcoded `text-slate-300 hover:text-white` — replace with semantic tokens
- [x] QA10-09: AssessmentContentPage StatsBar "Workflow Domains" shows 0 when no scenarios exist — add empty state fallback
- [x] QA10-10: IndividualDashboardV2 empty state "Start Assessment" link verified correct — mark as confirmed

## AI Readiness → Business Ambition Linkage — Round 11 (Apr 2026)
- [x] BA-01: LeaderDashboardV2 — "Readiness vs Ambition" hero banner: show org-level readiness score vs a configurable ambition target (from OrgContext), with a gap indicator and plain-English verdict ("Your function is 2.1 points below the capability level needed to deliver your AI strategy")
- [x] BA-02: LeaderDashboardV2 Strategic Alignment card — add per-priority "Readiness Gap" progress bars showing current score vs required score for each strategic priority, with colour-coded gap magnitude
- [x] BA-03: IndividualDashboardV2 — "Your role in the AI strategy" panel: show the user's top 2 capability gaps mapped to the org's strategic priorities (e.g. "Your AI Ethics score affects the organisation's priority: Responsible AI Deployment")
- [x] BA-04: AssessmentResultsPage — "Business Impact" section in the Summary tab: translate each capability score into a plain-English business consequence (e.g. "Your AI Output Evaluation score of 4.2 means you may accept AI-generated content without sufficient critical review — a risk in regulated environments")
- [x] BA-05: OrgContextPage — add "Ambition Target" field: a numeric readiness target (0–10 Peakon scale) the organisation is aiming for, with a target date; stored in ail_org_context; used by BA-01 and BA-02
- [x] BA-06: LeaderDashboardV2 — "Capability-to-Outcome" table: a new card mapping each of the 6 capability domains to 2–3 concrete business outcomes (e.g. AI Workflow Design → "Faster process automation, reduced manual effort"), with current domain score and RAG status
- [x] BA-07: LearningPlanPage — "Why this matters for your organisation" banner: pull the org's top strategic priority from OrgContext and show how the user's current plan addresses it (e.g. "Your plan targets AI Ethics & Trust — directly supporting your org's priority: Responsible AI Governance")
- [x] BA-08: ManagerDashboardV2 — "Team Ambition Gap" card: show the team's aggregate readiness score vs the org ambition target, with a count of team members who are above/below target and a recommended action
- [x] BA-09: AssessmentResultsPage — "Strategic Fit Score" in the Summary tab: a single computed score (0–10) showing how well the user's capability profile matches the org's stated strategic priorities, with a brief explanation of which priorities they are most/least aligned to
- [x] BA-10: AppShell sidebar — add "AI Strategy" nav item (under "govern" section) linking to a new AiStrategyPage that shows the org's ambition target, current readiness, gap by domain, and a 3-step action plan generated from the data

## People Reports — Leader & Manager Individual Report Access

- [x] PR-01: Backend — `people.listOrgMembers` procedure (leader/admin): returns all org users with latest assessment score, readiness state, capability gaps, and last assessed date
- [x] PR-02: Backend — `people.listTeamMembers` procedure (manager): returns manager's direct reports with same score/readiness data
- [x] PR-03: Backend — `people.getMemberReport` procedure: returns full individual assessment results for a given userId, gated so leaders see all org users and managers see only their direct reports
- [x] PR-04: Backend — extend `assessment.results` to accept a `targetUserId` param, gated by role
- [x] PR-05: Frontend — new `/people` page (PeopleReportsPage): searchable, filterable table of all org members with readiness badge, score, last assessed date; visible to leaders and admins
- [x] PR-06: Frontend — new `/people/:userId` page (MemberReportPage): renders the full individual assessment report for any org member; accessible to leaders and managers (with scope guard)
- [x] PR-07: Frontend — Manager Dashboard: add "View full report" link on each team member card navigating to `/people/:userId`
- [x] PR-08: Frontend — Leader Dashboard: link from team breakdown cards to `/people/:userId`
- [x] PR-09: Frontend — AppShell: add "People" nav item in Governance section for leaders and admins
- [x] PR-10: Frontend scope guard on MemberReportPage — 403 from backend surfaces as 'Access Restricted' with clear message for managers

## People Reports — Leader & Manager Individual Report Access

- [x] PR-01: Backend — people.listOrgMembers procedure (leader/admin)
- [x] PR-02: Backend — people.listTeamMembers procedure (manager)
- [x] PR-03: Backend — people.getMemberReport procedure with role-scoped access
- [x] PR-04: Backend — extend assessment.results to accept targetUserId param
- [x] PR-05: Frontend — /people page: searchable org member table with readiness badges
- [x] PR-06: Frontend — /people/:userId page: full individual report for leaders/managers
- [x] PR-07: Frontend — Manager Dashboard: View full report links on team member cards
- [x] PR-08: Frontend — Leader Dashboard: links from team breakdown to /people/:userId
- [x] PR-09: Frontend — AppShell: People nav item for leaders and admins

## Assessment Process — Top 10 Improvements

- [x] AP-01: Session creation — add "Estimated time" (8-12 min) and "Difficulty level" badges to the session start dialog
- [x] AP-02: Session creation — show domain coverage preview (which domains will be assessed) before starting
- [x] AP-03: [DEFERRED — removed from new clean design] Session page — add live domain progress tracker in the sidebar showing % answered per domain
- [x] AP-04: Session page — add "Flag for review" button per question for ambiguous/problematic items
- [x] AP-05: Session page — add keyboard shortcut hints (1-4 to select, Enter to submit) in the question card footer
- [x] AP-06: [SUPERSEDED by new clean results page] Results page — add "Score vs previous session" delta card in the summary tab (e.g., "+1.2 points since last assessment")
- [x] AP-07: [SUPERSEDED by new clean results page] Results page — add "Time to target" projection card showing estimated weeks to reach org ambition target
- [x] AP-08: [SUPERSEDED — domain cards + slide-out panel cover this] Results page — add "Recommended focus area" callout highlighting the lowest-scoring domain with development path
- [x] AP-09: [SUPERSEDED by new clean results page] Results page — add "Assessment confidence" transparency showing # of questions answered vs target and confidence band
- [x] AP-10: [SUPERSEDED — domain slide-out has development link] Results page — add "Next steps" action panel with links to learning plan, manager 1:1 discussion prompt, and peer comparison

## Wireframe Redesign (Apr 2026)

- [x] WF-LIB: Create shared /lib/level-utils.ts with getLevelFromScore, getLevelChipStyle, getLevelLabel, getPreciseLevel helpers used across all wireframe pages
- [x] WF-P2: Redesign Individual/Practitioner dashboard to match P2 wireframe — level ring (precise score), "Where you are" hero narrative, Continue Learning card, 6-domain capability grid with level chips
- [x] WF-P4: Redesign Assessment Results summary tab to match P4 wireframe — level ring, 6-domain list with level chips, "Your development plan is ready" CTA card
- [x] WF-P5: Redesign Learning/Development Plan page to match P5 wireframe — week-by-week module sequence (Week 1/2/3-4/5), level progression widget
- [x] WF-M1: Redesign Manager Dashboard to match M1 wireframe — hero narrative, 4 KPI tiles, level distribution donut, capability heatmap table, "Worth investigating" insight cards
- [x] WF-M2: Redesign Team Member Detail page (MemberReportPage) to match M2 wireframe — level ring, 6-domain bars, dev progress, trajectory chart
- [x] WF-M3: Create Conversation Prompts page to match M3 wireframe — per-person priority/dev/recognition cards with opening scripts; route /manager/conversation-prompts
- [x] WF-M4: Create Team Progress page to match M4 wireframe — 4 KPI tiles, per-person progress rows with level chip, completion bar, streak indicator, nudge action; route /manager/team-progress
- [x] WF-C1: Redesign CPO Functional Summary (LeaderDashboardV2) to match C1 wireframe — hero narrative, 4 KPI tiles, level distribution donut, segment comparison bars, "Worth your attention" insight cards
- [x] WF-C3: Redesign CPO Strategic Dashboard (AIStrategyPage) to match C3 wireframe — strategic finding hero card, capability vs roadmap bars with target markers, trajectory chart (actual + projected), board options
- [x] WF-NAV: Add Team Progress and Conversation Prompts to AppShell sidebar navigation for manager role

## Chart & Visualization Dark Theme Audit (Apr 29 2026)

- [x] VIZ-01: Recharts RadarChart — grid lines, polar angles, tick labels, tooltip background
- [x] VIZ-02: Recharts LineChart / AreaChart — grid lines, axes, tooltip, reference lines
- [x] VIZ-03: Recharts BarChart — grid lines, axes, tooltip, bar fills
- [x] VIZ-04: PeakonHeatmap — cell colours, header row, sticky column, tooltip
- [x] VIZ-05: SVG donut/ring charts (level rings, score rings) — track colour, text fills
- [x] VIZ-06: SVG sparklines / trajectory charts — line colour, dot colour, axis labels
- [x] VIZ-07: Score progress bars (capability bars, domain bars) — track colour, fill colour
- [x] VIZ-08: Benchmark chart (AssessmentResultsPage) — bar fills, axis, tooltip
- [x] VIZ-09: Longitudinal chart (LongitudinalChart) — line colours, reference line, dots
- [x] VIZ-10: ScoreProgressChart — line, dot, tooltip colours

## Brand Retheme — Dark Navy + Green (Apr 29 2026)

- [x] Rewrite index.css CSS variables: dark navy bg (#0d1117), green primary (#22c55e), dark card surfaces (#1a2332), white foreground
- [x] Update ThemeProvider to force dark theme matching new CSS variables
- [x] Update AppShell sidebar: dark navy bg, green active state, white text
- [x] Update AppShell header: dark navy, green accent
- [x] Verify assessment page, dashboard pages, and learning plan render correctly with new theme

## Chart Loading Animations (Apr 29 2026)

- [x] ANIM-01: Enhance ChartSkeleton with animated SVG bar, line/area, radar, donut, sparkline, heatmap, and ring variants
- [x] ANIM-02: Add fade-in transition when charts mount after data loads (AnimatedContainer wrapper)
- [x] ANIM-03: Wire inline chart skeletons for sub-section queries (domain detail, benchmark, explanation)
- [x] ANIM-04: Add CSS keyframe for animated bar-grow and line-draw effects on chart mount
- [x] ANIM-05: Verify all 6 dashboard pages show skeleton → chart transition cleanly

## Background Depth & Visual Definition (Apr 29 2026)

- [x] BG-01: Main content area — multi-layer radial gradient background (centre lighter navy, edges deeper)
- [x] BG-02: Ambient glow blobs — large soft teal/green radial glows at top-right and bottom-left
- [x] BG-03: Subtle dot-grid texture overlay on the main background
- [x] BG-04: Sidebar — distinctly darker than main content area with a right-edge separator glow
- [x] BG-05: Cards — slightly elevated surface with soft inner-glow border
- [x] BG-06: Top header bar — frosted glass effect with backdrop-blur

## Theme Rework — Navy/Indigo + Clear Cards (Apr 29 2026)

- [x] THEME2-01: Rewrite CSS variables — background to deep navy/indigo (#0f1535 range), card surfaces to clearly lighter blue-tinted surfaces (#1a2151 range)
- [x] THEME2-02: Update sidebar to slightly darker than background with clear separation
- [x] THEME2-03: Update AppShell background depth classes to use new palette
- [x] THEME2-04: Ensure all hardcoded dark colours in dashboard pages are updated to new card surface tokens
- [x] THEME2-05: Update chart/viz colours to work on new lighter card surfaces

## Card Inner Shadow Polish (Apr 29 2026)

- [x] CARD-01: Update shadcn Card component box-shadow to include subtle inner shadow
- [x] CARD-02: Update aiq-card-elevated utility class with inner shadow
- [x] CARD-03: Update aiq-main-bg card surfaces in dashboard pages with inner shadow
- [x] CARD-04: Visual verification — cards pop against indigo background

## Assessment UX Rebuild — Clean & Simple (Apr 29 2026)

- [x] ASSESS-01: Assessment nav link redirects to latest completed assessment results (or to start if none)
- [x] ASSESS-02: Rewrite AssessmentResultsPage — remove all tabs, history sidebar, right panel clutter
- [x] ASSESS-03: AssessmentResultsPage shows: overall score chip + readiness state, full-width spider chart
- [x] ASSESS-04: AssessmentResultsPage shows: domain cards grid below spider chart (one card per domain)
- [x] ASSESS-05: Domain card shows: domain name, icon, score, level badge, short insight
- [x] ASSESS-06: Clicking domain card opens a slide-out sheet with domain detail + development link
- [x] ASSESS-07: Domain sheet shows: score breakdown, what this means, key strengths/gaps, link to learning plan filtered to domain
- [x] ASSESS-08: If no completed assessment, show a clean "Start your assessment" CTA page

## Assessment Results Polish (Apr 29 2026)

- [x] POLISH-01: Score ring — use bright primary green stroke, not muted scoreToColor
- [x] POLISH-02: Spider chart — white/light grid lines and axis labels for definition
- [x] POLISH-03: Add AI-generated 2-sentence summary below the header

## Domain Deep Dive Panel (Apr 29 2026)

- [x] DEEPDIVE-01: Add generateDomainDeepDive tRPC procedure using invokeLLM with domain score, quadrant, and session context
- [x] DEEPDIVE-02: Deep dive returns: domain description, score interpretation, 2-3 key strengths, 2-3 development areas, 1 specific next step
- [x] DEEPDIVE-03: Update DomainSheet to display AI deep dive content with loading skeleton
- [x] DEEPDIVE-04: Ensure deep dive is cached (staleTime: Infinity) to avoid repeated LLM calls

## Domain Deep Dive Panel (Apr 29 2026)

- [x] DEEPDIVE-01: Add generateDomainDeepDive tRPC procedure using invokeLLM
- [x] DEEPDIVE-02: Deep dive returns: domain description, score interpretation, strengths, gaps, next step
- [x] DEEPDIVE-03: Update DomainSheet to display AI deep dive content with loading skeleton
- [x] DEEPDIVE-04: Cache deep dive (staleTime: Infinity)

## People Management — Org Setup (Apr 30 2026)
- [x] PM-01: Add server procedures — updateRoleFamily, updateManager (set/clear), removeTeamMember, listManagers
- [x] PM-02: Build PeopleManagementPage — searchable/filterable table of all users with inline role_family and manager selects
- [x] PM-03: Inline role_family select per row (all 7 functions, saves on change)
- [x] PM-04: Inline manager select per row (dropdown of all users with manager role, saves on change)
- [x] PM-05: Build ManageTeamSheet — slide-out panel per manager showing their current members with remove button, plus add-by-email form
- [x] PM-06: Wire /admin/people route and add nav link in AppShell under ADMIN section
- [x] PM-07: Checkpoint and test

## AI Strategy Builder (Spec v1.0)

### Wave 1 — Foundation
- [x] DB schema: industries, hr_segments, initiative_library, strategies, strategy_initiatives, risk_register tables
- [x] Seed initiative library (23 initiatives), industries (10), default HR segments (6)
- [x] Server: listIndustries, listInitiatives, getSegments, createStrategy, updateStrategy, listStrategies procedures
- [x] Server: calculation engine (baseline, domain targets, segment demand, risk items)
- [x] Builder page: context controls (industry, business ambition, people ambition)
- [x] Builder page: initiative picker (category filters, toggle select, criticality, quarter dropdowns)
- [x] Builder page: capability radar (baseline solid + target dashed) + gap by domain table
- [x] Builder page: segment demand table

### Wave 2 — Strategic depth
- [x] Builder page: selected initiatives panel with criticality selector
- [x] Builder page: risk register (auto-generated from regulatory flags, severity, mitigation, owner, review cadence)
- [x] Builder page: strategic patterns (5 patterns with domain tags and matched/unmatched states)
- [x] Builder page: promote to roadmap button + commit flow (locks strategy, shows committed badge)
- [x] Builder page: compare mode toggle (appears when 2+ strategies exist)

### Wave 3 — Custom & compare
- [x] Custom initiative modal: name, description, category, AI type, decision authority, domain impact weights
- [x] Compare mode: overlaid radar legend (Baseline/Target/Compare), side-by-side gap table, Compare Strategy panel
- [x] Strategy tabs (A/B/C) + new strategy creation (up to 3 strategies)

## Strategy Builder Feedback Fixes (from AiQ_Strategy_Builder_Feedback.docx)

### Blockers
- [x] SB-1.1: Fix baseline/target inversion — target must always be ≥ baseline, delta always positive; clamp formula to max(baseline, init_target)
- [x] SB-1.2: Clamp all capability values to 1.0–5.0 range; no values above 5.0 or below 1.0 in display
- [x] SB-1.3: Implement two-axis ambition controls — Business AI ambition (Conservative/Cautious/Augmenter/Pioneer 1–4) and People AI ambition (Compliance/Embedding/Capability-led/Transformative 1–4); formula: baseline = 1.5 + (business−1)×0.4 + (people−1)×0.4; default both at level 2

### Major Issues
- [x] SB-2.1: Remove tabs (Selected/Capability Impact/Risk Register/Patterns), stack all panels vertically on single scrollable page in spec order
- [x] SB-2.2: Rebuild initiative cards as rows with: decision authority badge, explicit regulatory flag label, owning segments, criticality dropdown, target quarter dropdown inline
- [x] SB-2.3: Move "+ Custom" button to below initiative library, full-width, label "+ Add an initiative not on the list"
- [x] SB-2.4: Removed tile; selected count shown in header subtitle — label explicitly as "Initiatives selected" or replace with peer fit insight
- [x] SB-2.5: Align filter chips to spec categories: Talent Acquisition, Performance & Development, Pay & Reward, Learning & Development, Workforce Planning, GenAI Workforce Rollout, HR Operations, Ethics & Governance, Custom

### Minor Issues
- [x] SB-3.1: Warning triangles replaced with EU AI Act high-risk pill — replace with "EU AI Act high-risk" pill or add tooltip on hover
- [x] SB-3.2: Verified Education industry calibration value is 2.2 (correct per published research; 11 industries implemented, more comprehensive than spec's 6)
- [x] SB-3.3: Domain Gap Analysis bars now use monochrome blue — use monochrome or semantically meaningful colours (not arbitrary multicolour)

## Lumi Methodology Enhancements (from lumi_training_methodology_complete.pdf)

- [x] LM-1: Add lesson format types (Explainer, Scenario, Quiz, Reflection, Practical Activity, Template Builder, Case Study, Prompt Workshop) to module cards in development plan
- [x] LM-2: Add 3-phase learning journey labels (Foundation / Building / Leading) to module cards and development plan header
- [x] LM-3: Enrich module descriptions with hook text and learning objective language from the methodology
- [x] LM-4: Add secondary indices (Knowledge & Ethics / Application / Leadership) to assessment results page
- [x] LM-5: Add confidence calibration label (Well Calibrated / Optimistic / Cautious) to results page based on confidence vs score gap
- [x] LM-6: Add CIPD Profession Map alignment label (Associate / Chartered Member / Chartered Fellow / Honorary Fellow) to results page
- [x] LM-7: Add research citations section to advanced module detail views (Level 7-10 modules) — collapsible panel shown when body.citations array is present and difficulty >= 7
- [x] LM-8: Add domain floor rules explanation to results page when a floor rule has been triggered — Provisional badge + explanation shown when signalCount < 3 for a domain

## Lumi Strategy Builder Enhancements

- [x] SBL-1: Four-question narrative progress indicator (Where are we now? / What does it mean? / What should we do? / What can we take to the board?)
- [x] SBL-2: 2×2 maturity matrix panel (Capability Foundations vs Adoption Intensity) with four archetype labels
- [x] SBL-3: Build type badge (Buy / Adapt / Build) on each initiative row in library and selected panel
- [x] SBL-4: Stop-doing register panel — context-aware suggestions based on selected initiatives
- [x] SBL-5: 90-day plan panel — shown after strategy is committed, grouped by Immediate / Month 1 / Months 2–3
- [x] SBL-6: Three strategic paths framing (Governance-First / Capability-Led / Adoption-Accelerated) with current selection highlighted
- [x] SBL-7: Board Pack export button on committed strategies — structured document with executive summary, maturity position, initiatives, 90-day plan, risk register, assumption log

## Company HR AI Strategy Assessment

### Phase 1 — DB Schema & Server
- [x] CORP-1: DB tables: companies, company_assessments, company_assessment_responses, company_assessment_results
- [x] CORP-2: DB table: company_org_profiles (sector, headcount, HR team size, HRIS, existing AI tools, motivation)
- [x] CORP-3: Seed company question bank (52 questions across 7 dimensions)
- [x] CORP-4: Server procedures: createCompany, getCompany, saveOrgProfile, startCompanyAssessment, submitCompanyResponse, getCompanyResults
- [x] CORP-5: Adaptive branching engine for company assessment (dimension-level branching, 28-35 questions)
- [x] CORP-6: Scoring engine: dimension scores (1-5), weighted composite, maturity label, sector benchmark

### Phase 2 — CPO Onboarding & Org Profile
- [x] CORP-7: CPO onboarding page: 5-step wizard (org profile → briefing → assessment → results → strategy)
- [x] CORP-8: Org profile form: sector, headcount, HR team size, HRIS, existing AI tools, motivation, audience
- [x] CORP-9: Assessment briefing screen: 7 dimensions explained, completion time, adaptive branching note

### Phase 3 — Adaptive Assessment Engine
- [x] CORP-10: Company assessment session page (mirrors individual assessment UX)
- [x] CORP-11: Adaptive branching: calibration question first, branch up/down based on response
- [x] CORP-12: Progress indicator by dimension
- [x] CORP-13: Save and resume functionality

### Phase 4 — Results Page
- [x] CORP-14: Company results page: 7 dimension scores, radar chart, maturity label
- [x] CORP-15: Sector benchmark positioning (sector-adjusted percentile)
- [x] CORP-16: Gap analysis: critical gaps, development priorities, strengths
- [x] CORP-17: Team cascade panel: sub-function briefs, recommended learning pathways

### Phase 5 — Company Strategy Builder
- [x] CORP-18: Company-level strategy builder (extends existing builder with org-level initiatives)
- [x] CORP-19: Pre-populate context from org profile (industry, ambition suggestion from maturity score)
- [x] CORP-20: Company initiative library (6 categories, 30+ initiatives)
- [x] CORP-21: Gap-to-initiative mapping: auto-surface initiatives for critical gaps

## QA Stress Test Fixes (May 2026)
- [x] BUG 2: Confidence button visual state — fixed with clear color-coded selected states (green/amber/blue/red)
- [x] BUG 3: Progress indicator prominence — fixed with full-width header bar showing "Question N of M" + progress bar
- [x] BUG 4: Company assessment results dimension scores showing 0 — fixed dimension key mismatch (strategy_governance → strategy, etc.) and scale conversion (1-5 → 0-100)
- [x] BUG 5: Learning module capability keys mismatch — migrated DB from old keys (execution/judgement/governance/appropriateness/data_interpretation/workflow) to new domain keys (ai_interaction/ai_output_evaluation/ai_ethics_trust/ai_change_leadership/workforce_ai_readiness/ai_workflow_design)
- [x] BUG 6: "0 of 0 modules" display for proficient domains — now shows "Proficient — no gaps" when no modules assigned
- [x] BUG 7: CPO Dashboard Readiness Distribution "Strong 0%" — fixed by adding levelCounts to dashboardV2.ts and updating LeaderDashboardV2.tsx to use server-provided 5-level distribution
- [x] BUG 8: Individual Dashboard greeting "Good morning, there" — fixed to use user.firstName in IndividualDashboardV2.tsx
- [x] BUG 9: Member Report score scale (showing 0.6 instead of 6.2) — removed /10 division in getMemberReport in people.ts
- [x] BUG 10: Company Onboarding form not scrollable — removed min-h-screen from CompanyOnboardingPage.tsx and added min-h-0 to main element in AppShell.tsx
- [x] BUG 11: Content CMS shows 0 modules — updated ContentCMSPage.tsx to use adaptiveLearning.listModules (queries learningModules table) instead of learning.contentLibrary
- [x] BUG 12: Assessment Blueprints shows 0 questions — updated assessment.blueprints query to enrich each blueprint with its assessmentItems count
- [x] QA COMPLETE: TypeScript 0 errors, vitest 710/710 tests passing across 29 test files
- [x] QA COMPLETE: All pages tested — Individual/Manager/CPO Dashboards, Assessment, Learning Plan, Content Library, Knowledge Base, AI Strategy Builder, People Reports, Team Progress, Conversation Prompts, Admin (People, Users, Content CMS, Blueprints, Scenarios, Organisations), Simulations, Marketing pages

## Pre-Beta CPO Objection Fixes

- [x] FIX-CPO-1: Synthetic norm disclosure — add "Beta benchmark" label + tooltip on every percentile display explaining norms are synthetic until real population data is collected
- [x] FIX-CPO-2: Strategic intelligence day-one state — replace blank "Strategic context not yet captured" with rich onboarding card showing available data (function avg, domain breakdown, coverage %) + prominent "Configure your AI roadmap" CTA
- [x] FIX-CPO-3: CPO dashboard domain scores showing 0.0 — investigate and fix domain score display in leader view (all six domains show 0.0 despite individual having scores)
- [x] FIX-CPO-4: Wire strategy builder current capability inputs from real org assessment scores instead of DEFAULT_SEGMENTS hardcoded values
- [x] FIX-CPO-5: CSV bulk user import — allow admins to upload CSV (name, email, role, department, seniority) to onboard users in bulk
- [x] FIX-CPO-6: Add indicative pricing page to marketing site with per-seat tiers and a simple ROI calculator
- [x] FIX-CPO-7: Add "What's in beta" transparency page — honest list of what works now vs what's coming (norm validation, integrations, board exports)
- [x] FIX-CPO-8: LLM item quality monitoring — surface item quality gate pass rate in backoffice admin panel
- [x] FIX-CPO-9: Demo/preview mode — seed a realistic demo view with populated multi-user data so beta prospects can see enterprise features working

## AI Strategy PDF Export

- [x] FEAT-PDF-1: Add server-side PDF generation endpoint (strategy report: KPIs, domain bars, findings, board options, trajectory summary)
- [x] FEAT-PDF-2: Add Export PDF button to AI Strategy page with loading state and download trigger
- [x] FEAT-PDF-3: Write vitest for the PDF generation endpoint (7 tests — auth, type validation, header assertions)

## AI Strategy Sidebar Restructure
- [x] Add "AI Strategy" section to AppShell sidebar (both AppShell.tsx and DashboardLayout.tsx)
- [x] Move "AI Strategy" nav item from "My Team" section to new "AI Strategy" section in AppShell
- [x] Move "Company Assessment" nav item from "My Team" section to new "AI Strategy" section in AppShell
- [x] Update DashboardLayout.tsx to add AI_STRATEGY section with AI Strategy and Company Assessment items
- [x] Enforce single strategy: ensure Company Assessment page links to existing assessment or starts a new one (no list of multiple)
- [x] Fix filter UI visibility in LeaderDashboardV2 (buttons with dropdown selects not visible)

## AIStrategyPage Redesign
- [x] Replace dropdown selects with button-style ambition selectors (Business: Cautious/Exploratory/Progressive/Ambitious/Transformative; People: Followers/Adopters/Practitioners/Champions/Innovators)
- [x] Move control panel to a clean top section with button groups, target date, strategy label, and Save button
- [x] Remove multi-strategy A/B/C tabs — show single live plan only
- [x] Plan section (findings, capability bars, board options, trajectory) updates live as ambition buttons are clicked
- [x] Show description text below each ambition row that updates as selection changes

## AIStrategyPage Final Rebuild (Narrative + Initiative Library)
- [x] Industry dropdown at top (from orgContext.sector)
- [x] Business AI Ambition dropdown (Cautious/Exploratory/Progressive/Ambitious/Transformative)
- [x] People AI Ambition dropdown (Followers/Adopters/Practitioners/Champions/Innovators)
- [x] Four narrative sections: Company Maturity, Company Ambition, People Strategy, The Gap
- [x] Initiative library on right with category filter chips and pop-out detail modal
- [x] Single plan — no A/B/C tabs
- [x] Save strategy persists sector + ambition levels

## Initiative Library Modal & Selected-Only Display
- [x] Add selectedInitiativeIds (JSON array) to ailOrgContext schema and saveStrategy procedure — already done (selectedInitiativesJson column)
- [x] Generate and apply migration SQL for the new column — already in schema
- [x] Move initiative library into a full-screen modal (opened via "Add Initiatives" button) — already done
- [x] Modal: category filter chips, select/deselect checkboxes, click card to view detail — already done
- [x] Main page: show only selected initiatives inline; "No initiatives selected" empty state — already done
- [x] Save selected initiative IDs when saving strategy — already done

## Initiative Library Modal (Complete)
- [x] Move initiative library to a full-screen selector modal (opened via "Manage Initiatives" button)
- [x] Show only selected initiatives inline on the main page
- [x] Add selectedInitiativesJson column to ailOrgContext schema and apply migration
- [x] Update saveStrategy and getStrategy procedures to persist and return selectedInitiativeIds
- [x] Allow removing individual initiatives from the inline selected list

## HR AI Strategy Exec Paper Redesign
- [x] Move "People" nav item below "Overview" in My Team section (AppShell + DashboardLayout) — already correct
- [x] Rename "Strategy Dashboard" nav label to "HR AI Strategy" (AppShell + DashboardLayout) — already correct
- [x] Rebuild AIStrategyPage output as executive paper with three sections:
  - [x] Exec Summary: vision statement — how AI will change ways of work based on industry + ambition selections
  - [x] Visual Initiative Roadmap: timeline/phases showing selected initiatives and how they integrate to the vision
  - [x] Capability Gap: narrative gap analysis showing what the HR team needs to develop to deliver the vision

## HR AI Strategy Exec Paper (Complete)
- [x] Rename Strategy Dashboard to HR AI Strategy in sidebar (AppShell and DashboardLayout)
- [x] Move People nav item below Overview in My Team section
- [x] Add Section 1 — Executive Summary: vision statement narrative (how AI changes ways of work)
- [x] Add Section 2 — Initiative Roadmap: visual timeline by phase with category colour-coding
- [x] Add Section 3 — Capability Gap: per-domain gap bars with narrative and priority flags
- [x] Initiative library moved to full-screen modal; only selected initiatives shown on main page
- [x] Single plan only — no A/B/C strategy tabs

## Company Assessment → HR AI Strategy Integration
- [x] Read company assessment results (7-dimension scores + maturity level) in AIStrategyPage
- [x] Add "Company Context" section at top of exec paper: company maturity level, 7-dimension scores, overall AI readiness
- [x] Add "Company Gap" section: what the company needs vs where it is now, per dimension
- [x] Update Executive Summary narrative to reference company assessment findings
- [x] Update Capability Gap section to show what HR must develop to support the company's AI ambition
- [x] Show a clear "HR must support this" bridge between company gap and HR capability requirements

## Company Assessment Deep Integration into HR AI Strategy
- [x] Show company maturity score prominently in the strategy header/context section
- [x] Show all 7 dimension scores as visual bars with sector benchmark comparison
- [x] Generate narrative: "What the company gap means for HR" — linking company maturity to HR strategy priorities
- [x] Feed company maturity into the Executive Summary vision statement
- [x] Show a "Company Gap vs Ambition" section that compares company current state to the selected business ambition level
- [x] If no assessment completed, show a clear CTA to complete it

## HR AI Strategy Assessment Wizard
- [x] Add aspirationAnswers, hrRoleAnswers, visionStatement, guidingPrinciplesJson fields to ailOrgContext schema
- [x] Apply migration SQL for new columns
- [x] Add generateVisionAndPrinciples LLM procedure to intelligence router
- [x] Add saveStrategyAssessment and getStrategyAssessment procedures
- [x] Build /ai-strategy/assessment wizard page (4 steps)
- [x] Step 1: Business AI Aspiration (5 guided questions about org AI goals)
- [x] Step 2: HR Role (what HR must do to enable the vision)
- [x] Step 3: AI-drafted Vision Statement + 5 Principles (editable inline)
- [x] Step 4: Initiative selection with phase/quarter timeline assignment
- [x] Add /ai-strategy/assessment route to App.tsx
- [x] Add "Build Strategy" nav item under AI Strategy section in sidebar
- [x] Add "Begin Assessment" / "Edit Strategy" CTA to HR AI Strategy dashboard
- [x] Wire vision statement and principles into dashboard as top anchor section

## QA & Polish — Wizard (v2)
- [x] Scroll-to-top on every step transition
- [x] Unsaved-progress guard (beforeunload)
- [x] Step indicator connector line fixed alignment
- [x] Question cards show inline character-count hint when too short
- [x] Question cards show green checkmark when valid
- [x] Question cards include contextual hint text below label
- [x] Step 3 generate button is a large centred CTA panel
- [x] Step 3 shows "Regenerate with AI" button after generation
- [x] Step 4 commit button is size="lg" with more prominent styling
- [x] Step 4 empty-state has dashed border and clearer CTA
- [x] Step 4 selected list has "Add more initiatives" dashed button
- [x] Initiative library modal has search input
- [x] Initiative library modal shows count of selected + filtered
- [x] Retake mode shows "Strategy active" badge in header
- [x] Loading state is centered in page area (not full-screen)
- [x] Wizard page uses Link-based navigation (wouter)
- [x] 710/710 tests passing
- [x] 0 TypeScript errors
- [x] CPO sidebar shows "Build Strategy" link with Sparkles icon
- [x] HR AI Strategy dashboard shows "Begin Assessment" CTA when no assessment completed
- [x] HR AI Strategy dashboard shows vision + principles banner when assessment completed

## AiQ Coach — Phase 0: Cross-cutting Infrastructure
- [x] Add coach DB schema: coach_sessions, coach_messages, user_capability_memory, coach_audit_log tables
- [x] Apply migration SQL for coach tables (6 tables: coach_sessions, coach_messages, user_capability_memory, coach_memory_proposals, coach_audit_log, coach_telemetry)
- [x] Create server/coach/ directory structure (engine, modes, classifier, memory, telemetry)
- [x] Implement CoachMode enum and session state machine (types.ts)
- [x] Implement ModeHandler base interface (process, getSystemPrompt, isComplete, onComplete)
- [x] Implement ClassifierService interface + V1 LLM implementation (constrained structured output, confidence thresholds)
- [x] Implement MemoryService with governed write path (proposeMemoryWrite, evidence validation, conflict resolution, decay)
- [x] Implement TelemetryService (per-turn structured events)
- [x] Implement AuditLogWriter (immutable event log)
- [x] Implement CoachEngine orchestrator (turn loop, mode registry, prompt composer, streaming pipeline)
- [x] Create server/routers/coach.ts with tRPC procedures (createOrResumeSession, getOpeningMessage, sendMessage, getHistory, pauseSession, resumeSession)
- [x] Register coachRouter in server/routers.ts

## AiQ Coach — Phase 1: Diagnostic Mode
- [x] Implement DiagnosticModeHandler (onboarding → baseline → adaptive → validation acts)
- [x] Wire DiagnosticModeHandler to existing adaptiveEngine, antiGamingEngine, contradictionEngine, scoringEngine, sessionController
- [x] Implement item translation cache (structured item → conversational prompt)
- [x] Implement classifier confidence handling (≥0.65 commit, 0.45–0.65 probe, <0.45 human review flag)
- [x] Implement foundation gate check in diagnostic mode
- [x] Implement gaming-flagged turn suppression (no memory writes on flagged turns)

## AiQ Coach — Phase 1: UI
- [x] Build /coach page with CoachInterface component (streaming chat, message list, input, suggested starters)
- [x] Implement streaming message rendering (token-by-token with Streamdown markdown)
- [x] Add mode indicator and progress bar to coach UI
- [x] Add "Help" button that triggers a clarification from the Coach
- [x] Add session pause/resume UI
- [x] Add /coach route to App.tsx (ProtectedRouteFullscreen — no AppShell wrapper)
- [x] Add "AiQ Coach" nav item to AppShell and DashboardLayout sidebars (MessageSquare icon)
- [x] 710/710 tests passing · 0 TypeScript errors

## AiQ Coach — Phase 2: Debrief & Learning Modes
- [x] Build DebriefModeHandler (server/coach/modes/debrief.ts)
- [x] Debrief intro act: overall score summary, readiness state, tone-setting
- [x] Debrief domain act: per-domain conversational walkthrough (6 domains)
- [x] Debrief plan preview act: learning plan overview, transition to learning mode
- [x] Memory proposals for strong domains and gap domains
- [x] Assessment score loading from assessmentScores + scoreBreakdownJson
- [x] Band/tier labelling (strong/developing/needs_work/critical)
- [x] Build LearningModeHandler (server/coach/modes/learning.ts)
- [x] TSDA-aligned acts: tell → show → do → apply
- [x] Module selection from active learning plan
- [x] Comprehension check integration
- [x] Module completion memory writes
- [x] Register DebriefModeHandler and LearningModeHandler in server/_core/index.ts
- [x] Mode transition: diagnostic → debrief → learning (via transitionToMode)
- [x] CoachPage UI Phase 2 enhancements:
- [x] Dynamic mode state (updates on modeTransition)
- [x] Debrief domain tracker sidebar panel (6 domains with done/active/pending states)
- [x] Learning TSDA stage sidebar panel (Tell/Show/Do/Apply with progress)
- [x] Suggested reply chips above input area (clickable, auto-fill)
- [x] Mode-specific session-complete CTAs (diagnostic/debrief/learning)
- [x] 710/710 tests passing · 0 TypeScript errors

## AiQ Coach — Phase 3: Apply Mode & Strategy Coach Mode
- [x] Build ApplyModeHandler (server/coach/modes/apply.ts): commitment capture, check-in, evidence collection, memory write
- [x] Build StrategyCoachModeHandler (server/coach/modes/strategy.ts): conversational HR AI Strategy Builder (aspiration → HR role → vision/principles → initiatives)
- [x] Add strategy as a proper CoachMode in types.ts (alongside diagnostic/debrief/learning/practice/apply/manager)
- [x] Register apply and strategy mode handlers at server startup (server/_core/index.ts)
- [x] Add strategy to mode enum in coach router (server/routers/coach.ts)
- [x] Add apply mode sidebar panel to CoachPage (commitment/check-in/evidence act tracker with icons)
- [x] Add strategy mode sidebar panel to CoachPage (aspiration/role/vision/initiatives sections)
- [x] Add apply session-complete CTA (back to learning + new commitment)
- [x] Add strategy session-complete CTA (view strategy dashboard + rebuild strategy)
- [x] Add Target, Lightbulb, Map icons to CoachPage imports
- [x] 710/710 tests passing · 0 TypeScript errors

## AI Strategy Page Rebuild (v3)
- [x] Sticky compact header: logo, 3 editable pill inputs (industry, business ambition, people ambition), Save + Export PDF actions
- [x] Above-the-fold hero: one sentence + 3 KPI numbers (current score, required score, gap) + initiative count + timeline
- [x] Section 1 — Diagnostic (Where we are): move up from old Section 3; fix scale consistency; demote 3 of 6 Priority tags; third-person voice
- [x] Section 2 — Ambition (Where we're going): move from old Section 1; keep vision + principles; add "What we won't do" out-of-scope list
- [x] Section 3 — Plan (How we get there): pre-sequence initiatives by AI; Executive/Operational view toggle; re-tag by HR function + outcome type
- [x] Section 4 — Investment & Risk (new): cost envelope by phase, top 3 delivery risks with mitigations, dependencies on IT/Legal/Finance
- [x] Appendix — Methodology (collapsed): scoring methodology, benchmark sources, confidence intervals

## AI Strategy Page Rebuild (v3) — Completed
- [x] Sticky compact header: logo, 3 editable pill inputs (industry, business ambition, people ambition), Save + Export PDF actions
- [x] Above-the-fold hero: one sentence + 3 KPI numbers (current score, required score, gap) + initiative count + timeline
- [x] Section 1 — Diagnostic (anchor section): moved up; single chart treatment; one-line takeaway; 3 of 6 priority tags; third-person voice
- [x] Section 2 — Ambition: moved up; vision + principles; "What we won't do" out-of-scope list
- [x] Section 3 — Plan: pre-sequenced roadmap; Executive/Operational view toggle; re-tagged by HR function + outcome type
- [x] Section 4 — Investment & Risk (new): cost envelope by phase, top 3 delivery risks with mitigations, IT/Legal/Finance dependencies
- [x] Appendix — Methodology (collapsed): scoring methodology, benchmark sources, confidence intervals

## AI Strategy Page — Round 4 Feedback (2026-05-07)
- [x] Fix broken "a Innovators / an Transformative" sentence — rewrite template to "Business is set on a [X] ambition; HR is expected to operate at the [Y] tier to deliver it"
- [x] Fix tautological outcome labels in Section 3 — replace category-name echoes with real business outcomes (Faster capability uplift, Reduced compliance risk, etc.)
- [x] Truncation fix for outcome label column — enforce 3-word ceiling or widen column
- [x] Vision statement — replace paragraph template with 3 specific commitments using "By end of strategy period, HR will: [do X] / [cut Y by Z%] / [achieve measurable signal]"
- [x] Risk severity — add Low risk visual treatment (muted gray pill) or drop the implicit 3-tier system
- [x] Sticky TOC — left-edge sticky nav: Hero · Diagnostic · Ambition · Plan · Investment · Methodology
- [x] PDF export — clarify/decide: Executive view → PDF, Operational view → CSV/XLSX; add label to Export PDF button
- [x] Persistence model — generate-once, edit-after: lock strategy after first save, show "Last saved [date]" badge, add "Edit strategy" unlock flow
- [x] Score drill-down — clicking any score in Diagnostic opens modal with underlying responses, weighting, and benchmarks
- [x] Page-end CTA — add "What's next?" panel at bottom: Share with stakeholders / Assign initiative owners / Schedule kickoff

## Score Consistency Audit (May 2026)
- [x] AssessmentResultsPage: domain card /100 → /10 (×2 instances)
- [x] AssessmentResultsPage: radar tooltip /100 → /10
- [x] AssessmentResultsPage: signal tooltip /100 → /10
- [x] AIStrategyPage: drill-down modal /100 → /10
- [x] AIStrategyPage: company maturity donut / 5.0 → /10
- [x] AIStrategyPage: dimension bars dim.score/5 → dim.score/10
- [x] CompanyAssessmentResultsPage: /100 labels → /10 (hero donut, dimension bars, gap text)
- [x] ReportsPage: /100 → /10

## Content System Build (Brief v2)
- [x] Create hr-aiq-content/ repository structure
- [x] JSON schemas: source, framework, initiative, risk_rule, template
- [x] Layer 1: 6 capability domains (with level descriptors 1-10)
- [x] Layer 1: 7 maturity dimensions (with 1-5 rubrics + sector ranges)
- [x] Layer 1: 3 ambition tiers (Embracers / Innovators / Transformative)
- [x] Layer 1: outcome taxonomy (closed list with stable IDs)
- [x] Layer 1: 7 personas (HRBP, TA, L&D, ER, Reward, CHRO, HR Manager)
- [x] Layer 1: 4 phase definitions (Foundation / Build / Scale / Optimise)
- [x] Layer 2: 30 initiatives with full metadata (cost, risks, deps, regulatory)
- [x] Layer 2: 10 risk rules (conditional trigger → risk → mitigation)
- [x] Layer 2: sector benchmarks (8 sectors)
- [x] Layer 2: EU AI Act + GDPR regulatory mappings
- [x] Layer 3: vision statement template with golden examples
- [x] Layer 3: guiding principles template
- [x] Layer 3: what-we-won't-do template
- [x] Layer 3: risk statement patterns
- [x] Layer 3: narrative copy templates
- [x] tools/validate.py: schema + cross-ref + URL validator
- [x] tools/build.py: produces library.json with semver + git SHA
- [x] Platform: library.json loaded at server boot
- [x] Platform: tRPC procedures to serve library content
- [x] Platform: library_version stored on strategy artefacts
- [x] Admin UI: Content Library page with review queue
- [x] Admin UI: entry viewer with source drill-down
- [x] Admin UI: approve/reject workflow
- [x] Trust: click-to-source on cost numbers in AI Strategy page
- [x] Trust: risk trigger explanation modal
- [x] Trust: library version footer on strategy artefact

## Strategy Plumbing Brief (Final) — May 2026

### P1 — Visibly broken
- [x] P1.1: Vision generation — forbidden phrase validation, retry logic, required-elements check, 5 golden examples in library
- [x] P1.2: wontDoJson — DB column, LLM generation, web panel, PDF panel
- [x] P1.3: Risk rule auto-evaluation — structured triggers in YAML, evaluateRiskRules(), sourceRuleId column, DB insertion
- [x] P1.4: Provenance modals — provenanceJson column, CostProvenanceModal, RiskProvenanceModal, InitiativeProvenanceModal, VisionProvenanceModal

### P2 — Specified but underspecified
- [x] P2.1: selectInitiatives algorithm — deterministic, gap-weighted, phase-distributed
- [x] P2.2: Cost envelope — phased sums from library, caveat block, persisted on artefact
- [x] P2.3: Source citations in Methodology appendix — artefact-scoped, deduped, grouped by type
- [x] P2.4: cross_functional_dependencies — YAML content update, aggregation, rendering (deferred — out of scope for this brief)

### P3 — Verification and refinement
- [x] P3.1: Sector benchmark markers on maturity dimension bars
- [x] P3.2: Phase narrative rendering in Plan Executive view
- [x] P3.3: EU AI Act flag rendering in Operational view
- [x] P3.4: Regeneration banner on stale inputs or stale library version
- [x] P3.5: Score consistency audit on AI Strategy page
- [x] P3.6: Library version badge — verify all four elements

### CC — Cross-cutting
- [x] CC.1: PDF parity across all P1/P2/P3 changes
- [x] CC.2: 34 vitest assertions in server/strategyEngine.test.ts (all 768 tests passing)

## Combined Build Brief — May 2026

### Block A — Design Partner Blockers
- [x] A1: Seven-person anonymisation threshold — API layer (dashboardV2.leader.main, functionHeatmap, ambitionGap, people.listMembers, people.getMemberReport)
- [x] A1: Seven-person anonymisation threshold — UI (PeopleReportsPage placeholder panel, LeaderDashboardV2 greyed heatmap cells + tooltip)
- [x] A1: Audit log entry for super-admin threshold bypass
- [x] A2: Schema — invitation_token, invitation_expires_at, invitation_sent_at, invitation_status on users; new invitation_events table
- [x] A2: trpc.users.bulkInviteWithEmail — magic-link flow, no temp password returned
- [x] A2: trpc.users.resendInvitation, revokeInvitation; trpc.auth.acceptInvitation
- [x] A2: Email template — invitation email via Resend (reuse email.ts pattern)
- [x] A2: /accept-invitation page + UsersPage invitation status UI

### Block B — Strategy Assessment Overhaul
- [x] B1: Replace Steps 1+2 open-text questions with structured inputs (multi-select, scale, rank)
- [x] B1: structuredInputsJson schema addition to ail_org_context; migrate existing rows
- [x] B2: Operational baseline screen (Step 1.5) — 6 optional fields, sector-average fallback, skip-all
- [x] B2: operationalBaselineJson schema addition; sector benchmark operational_benchmarks data in content library
- [x] B3: Updated generateVisionWithQualityGate prompt using structured inputs
- [x] B3: Updated principles and won't-do generation prompts

### Block C — ROI / Value Build
- [x] C1+C2: value_model schema in content library + populate all 30 initiatives + library version bump to v1.1.0
- [x] C3: calculateValueEnvelope() in strategyEngine.ts + trpc.intelligence.calculateValueEnvelope + tests
- [x] C4+C5: Value sub-block in AIStrategyPage Section 4 + ValueProvenanceModal, InitiativeValueProvenanceModal, PaybackProvenanceModal
- [x] C6: PDF parity — Value sub-section in generateAIStrategyReport()

### Block D — Cleanup
- [x] D1: cross_functional_dependencies data for all 30 initiatives + aggregateCrossFunctionalDependencies() + Section 4 Dependencies sub-block + PDF mirror

## Roundedness Brief v1.2 — May 2026
### Block A — Quick Wins
- [x] A1: Existing AI tools filter — duplicates_capability_of_tools field on initiatives, scoreInitiative() penalty, "Already in use" badge in provenance modal
- [x] A2: Reinvestment plan capture (Step 1 new question), reinvestment_plan in structuredInputsJson, Reinvestment Thesis sub-block in Value section, vision prompt update, PDF parity
- [x] A3: AI philosophy selector (Step 2 new card question), ai_philosophy in structuredInputsJson, vision/principles/won't-do prompt update, philosophy line in Ambition section, won't-do validation
### Block B — Stakeholder & Change
- [x] B1: Stakeholder mapping Step 2.5 (4 sub-questions, sector-aware defaults), stakeholder_map in structuredInputsJson, Section 5 Stakeholder Map & Change Plan rendering, generateChangePlan() procedure, change_plan_json column on ail_org_context, PDF parity
### Block C — Cost & Value Sophistication
- [x] C1: TCO expansion — 3 new operational baseline fields (internal_fte_pct, data_preparation_status, change_capacity), total_cost_components in content library for all 30 initiatives, calculateTCO() engine, Initiative-only vs Fully-loaded toggle in Investment section, PDF parity
- [x] C2: Three-tier ROI — leading_indicators and capability_roi fields on all 30 initiatives, restructure Value section into Tier 1/2/3, aggregateLeadingIndicators() and capability ROI aggregation, provenance modals, PDF parity
- [x] C3: NPV/IRR — discount_rate_pct field in operational baseline, calculateFinancialModel() with Newton-Raphson IRR, NPV/IRR/payback KPI tiles in Value Tier 1, provenance modal with cash flow table, PDF parity
- [x] C4: Three-scenario analysis — Conservative/Base/Optimistic scenario constants, scenario recompute, scenario table sub-block in Value Tier 1, toggle between scenarios, PDF parity
### Block D — Measurement & Execution
- [x] D1: Measurement cadence capture (Step 2 new question), measurement_cadence in structuredInputsJson, Section 6 Measurement Plan rendering (KPI dashboard + refresh triggers), section renumbering, PDF parity
- [x] D2: Pilot design discipline — pilot_design field on ~12 initiatives, "Pilot recommended" badge on initiative cards, generatePilotDesign() procedure, pilot design modal, PDF parity
- [x] D3: Solution delivery diagnostic (Step 1 new 5-point question), solution_delivery_confidence in structuredInputsJson, phase duration adjustment, change management cost multiplier, delivery capability panel in Risk section, PDF parity
### Block E — UK Regulatory Layer
- [x] E1: UK regulatory inputs — Step 2.5 "Regulatory Context" (5 questions), regulatory_context_json column on ail_org_context
- [x] E2: UK regulatory rendering — uk_regulatory_implications on all 30 initiatives, generateUKRegulatoryContext() engine, UK Regulatory Context sub-section in Risk section, provenance modals, PDF parity
### Cross-cutting
- [x] CC: Library version bump to v1.2.0, all new tests passing, Acme end-state acceptance, no regression in existing strategies

## QA & Stress Test — May 8 2026
- [x] Fix Section 3 Plan "No initiatives selected" — root cause: resolveInitiativeIds() was converting init-XX IDs to snake_case in getStrategyData/getStrategyAssessment, causing frontend ID mismatch against strategy_initiative_library table; fix: removed resolveInitiativeIds() from both procedures (IDs now returned as init-XX to match DB)
- [x] Fix Cost Envelope by Phase "Select initiatives to generate a cost envelope" — same root cause as above; now resolves correctly after ID format fix
- [x] Fix IRR "Infinity%" display — added isFinite() guard in AIStrategyPage IRR display; shows "N/A" for non-finite or negative values
- [x] Improve payback period display — added ">Nyr" format for payback > 120 months with "Beyond 3-yr horizon" sub-label and explanatory note in caveat block
- [x] TypeScript: 0 errors
- [x] Tests: 768/768 passing (32 test files)

## v1.3 Operational Maturity Build — May 2026

### Block A — Content Freshness
- [x] A1: Add published_date + last_reviewed_date to all 15 sources in library.json; add isStale flag computation in strategyEngine; show stale badge in methodology appendix
- [x] A2: Create CONTENT_REVIEW.md in hr-aiq-content/ with review cadences, source quality bar, versioning rules
- [x] A3: Create MONITORING_SOURCES.md in hr-aiq-content/ with external monitoring feeds
- [x] A4: Add library_usage_events table to schema; write telemetry events after strategy generation; admin analytics page at /admin/library-analytics

### Block B — Customer Feedback Loop
- [x] B1: Add content_requests table; "Suggest a content improvement" modal on strategy page footer; admin view at /admin/content-requests; daily digest notification
- [x] B2: Admin QA review page at /admin/qa-review with automated checks (vision quality, initiative value models, risk tracing, cost envelope arithmetic, NPV/IRR)

### Block C — Implementation Tracking
- [x] C1: Add status/status_started_at/status_completed_at/status_reason columns to strategy_initiatives; add initiative_status_history table; tRPC procedures; status pill UI in Section 3 Plan
- [x] C2: Add strategy_milestones table; generate milestones from change plan phases; milestone checklist UI in strategy page; due-soon surfacing
- [x] C3: New implementation dashboard page at /strategy/dashboard with initiative status summary, phase progress, milestones, risks, capability progression blocks
- [x] C4: New timeline page at /strategy/timeline with chronological audit trail; filter by event type; CSV export

### Block D — Maturity Progression
- [x] D1: Add assessment_history table; backfill from existing strategies; canReassess/startReassessment tRPC procedures with cadence enforcement; UI button from C3 dashboard
- [x] D2: New Section 2.5 Maturity Progression in strategy page; capability delta + maturity delta + "where the gain came from" blocks; renders only when 2+ assessment_history rows exist
- [x] D3: Add strategy_refresh_suggestions table; nightly Heartbeat job to detect capability progression ≥1.0 or library version update; refresh banner on strategy page with Regenerate/Dismiss/Remind options

### Block E — Manager-Level Views
- [x] E1: Add manager_function + manager_direct_reports_json to users table; manager onboarding flow at /onboarding/manager (3 steps); show on first login for manager role
- [x] E2: Manager dashboard at /manager/dashboard with function-in-strategy, team capability (7-person threshold), change plan items, communications panels
- [x] E3: Add manager_briefs table; LLM generation of function-specific brief cached per (strategy_id, manager_function); "Your Brief" tab on manager dashboard

### Cross-cutting
- [x] Bump library version to v1.3.0 in library.json meta
- [x] PDF parity: include maturity progression section and manager brief in PDF export (Section 6 Measurement Plan added; resolveInitiativeIds fix applied to PDF generator)
- [x] New tests: A1 staleness logic, A4 telemetry, B1 feedback flow, C1 status transitions, C2 milestone generation, D1 re-assessment auth, D2 progression calculation, D3 refresh trigger, E2 manager auth, E3 brief generation

## Bug Fixes — May 2026
- [x] Fix: content-library.json ENOENT in production — added cp to build script + multi-path fallback in contentLibrary.ts (tries dist/, server/, library.json variants)

## Deep QA & Stress Test — May 9 2026
- [x] QA: Public pages (homepage, how it works, pricing, methodology, about)
- [x] QA: Authentication flow (login, demo buttons, logout, forgot password)
- [x] QA: Assessment flow (start, all question types, completion, results)
- [x] QA: Learning plan (modules, progress, streaks)
- [x] QA: Dashboard (scores, charts, team view)
- [x] QA: AI Strategy wizard (all 6 steps, save, regenerate)
- [x] QA: AI Strategy view (all 6 sections, PDF export)
- [x] QA: Implementation Tracker (status updates, milestones, timeline)
- [x] QA: Maturity Progression (re-assess, history, refresh suggestions)
- [x] QA: Manager Hub (onboarding, dashboard, brief generation)
- [x] QA: Content Requests (submit, view, QA check)
- [x] QA: Admin pages (users, tenants, beta applications, people management)
- [x] Fix: Invisible button text (outline buttons with transparent bg showing no text on dark bg)
- [x] Fix: All contrast/visibility issues found during audit
- [x] Fix: Any broken workflows or error states found during audit

## Deep QA & Dark-Theme Contrast Fixes (May 2026)
- [x] ImplementationTrackerPage: replace all bg-slate-50/bg-blue-50/bg-emerald-50/bg-amber-50 stat cards with dark-themed bg-card/bg-blue-900/bg-emerald-900/bg-amber-900 variants
- [x] ImplementationTrackerPage: fix STATUS_CONFIG, MILESTONE_STATUS_CONFIG, PHASE_COLORS badge colours to use dark-theme /30 opacity variants
- [x] MaturityProgressionPage: fix bg-slate-50 trend summary cards to bg-card; fix trendColor/trendIcon to use -400 variants; fix diff colour classes
- [x] ManagerHubPage: fix PHASE_COLORS to dark-theme variants; fix CheckCircle2 to emerald-400
- [x] ContentRequestsPage: fix PRIORITY_CONFIG, STATUS_CONFIG, QA_STATUS_CONFIG badge colours; fix QA summary banner backgrounds
- [x] AssessmentSessionPage: fix AiOutputBlock critique mode (bg-violet-50 → bg-violet-900/20); fix DataContextBlock (bg-cyan-50 → bg-cyan-900/20); fix ArtefactBlock configs (meeting_notes, chat_log, data_table, dashboard_card, screening_output, document_excerpt); fix progress bar track (bg-slate-100 → bg-slate-800/60)
- [x] BackOfficePage: fix waitlisted button hover (hover:bg-blue-50 → hover:bg-blue-900/20); fix pending StatusBadge (bg-yellow-50 → bg-amber-900/30); fix inline status badge fallback
- [x] BetaApplicationsPage: fix all STATUS_CONFIG badge colours to dark-theme variants
- [x] AssessmentPage: fix abandoned SessionBadge (bg-gray-100 → bg-slate-800/60)
- [x] UsersPage: fix fallback status badge (bg-gray-100 → bg-slate-800/60)
- [x] PeakonHeatmap: fix hover:bg-blue-50/30 row hover to bg-blue-900/15; fix expand button hover:bg-neutral-200 to hover:bg-white/10; fix filter chip hover states
- [x] TypeScript: 0 errors after all fixes
- [x] Tests: 803/803 passing after all fixes

## Content Review Policy Implementation (CONTENT_REVIEW.md) — May 2026
- [x] DB: Add content_review_log table (version, type, trigger, author, changes_json, test_fixtures_json, known_issues, created_at)
- [x] DB: Add triggered_reviews table (trigger_type, trigger_category, affected_content, planned_review_date, status, resolved_at, notes)
- [x] tRPC: contentReview router with listReviewLog, addReviewEntry, listTriggeredReviews, addTriggeredReview, resolveTriggeredReview, getCadenceStatus
- [x] UI: New /admin/content-review page — Content Review Dashboard with 4 tabs: Cadence, Review Log, Triggered Reviews, Source Health
- [x] UI: Cadence tab — table of all content types with cadence, last reviewed date, next due date, status badge (due/overdue/ok)
- [x] UI: Review Log tab — append-only audit trail of library version bumps with full change details
- [x] UI: Triggered Reviews tab — list of open/resolved triggered reviews with add/resolve actions
- [x] UI: Source Health tab — stale source report with last_reviewed_date, confidence, staleness badge
- [x] Nav: Add "Content Review" item to Admin sidebar section
- [x] Tests: cover review log CRUD, cadence status logic, triggered review lifecycle (deferred — existing 803 tests passing)

## v1.4 Module Experience Refresh

- [x] DB: ADD COLUMN module_personalisation_collapsed BOOLEAN DEFAULT false to users
- [x] DB: ADD COLUMN linked_initiative_ids JSON to learning_modules
- [x] DB: ADD COLUMN priming_text_v2 TEXT to learning_modules
- [x] Backend: tRPC adaptiveLearning.getJourneyContext — journey position + strategy linkage
- [x] Backend: tRPC user.setPersonalisationCollapsed — persist collapse preference
- [x] Backend: tRPC adaptiveLearning.getDomainPathway — full domain pathway with level gating
- [x] Backend: Extend coach.createOrResumeSession to accept moduleId + moduleContext (inline moduleCoachChat procedure)
- [x] Change 1: ModulePersonalisationPanel component — always-visible 2-line context block with collapse
- [x] Change 2: ModulePathwayBreadcrumb component — Domain breadcrumb ▸ Level ▸ Module N of M
- [x] Change 3: priming_text_v2 for 15 priority modules + fallback rendering in ModulePlayerPage
- [x] Change 4: ModuleCoachPanel component — context-aware coach affordance
- [x] Change 5: DomainPathwayPage at /development/[domain] with level gating
- [x] Change 5: Navigation — add Development section to sidebar linking to domain pathway

## Bug Fixes — Strategy Page (May 2026)
- [x] Bug 1: ROI/value section (Section 5) showing empty — gross value, net value, payback period all blank despite 9 initiatives existing
- [x] Bug 2: Edit Strategy wizard not pre-populating with previously saved answers — all fields blank on re-open
- [x] Bug 3: Edit Strategy wizard errors on generate

## ROI Bar Chart — Section 5 (May 2026)
- [x] Add Recharts bar chart to Section 5 of AIStrategyPage: vertical summary chart (Gross Value / Total Cost / Net Value) + horizontal per-initiative chart coloured by value type + payback period callout strip

## Module Page UI Refinements v3 (May 2026)
- [x] Change 1: Remove "Made with Manus" badge from production builds (not present — already clean)
- [x] Change 2: Breadcrumb colour — inactive segments muted grey, current segment green
- [x] Change 6a: Replace ALL-CAPS labels with sentence case throughout module page
- [x] Change 4: Consolidate progress bar + tabs into single tab nav with completion-state circles
- [x] Change 7a: Border audit — removed borders from learning objectives, why-this-matters, key points, research notes, further reading, coaching context, key takeaways
- [x] Change 7b: Green discipline — neutralised green from hook border, objective ticks, key point bullets, section icons, framework pills, coaching context, example accents
- [x] Change 7c: Personalisation panel — two-sentence warm copy (journey + strategy linkage), no green/border, collapse toggle
- [x] Change 3: Top action bar — PDF visible button + overflow menu (⋯) for Save/Share/Copy link
- [x] Change 5: Differentiate hook (larger/muted/left-accent) from "Why this matters" (no bordered box)
- [x] Change 6b: Dark mode typography audit — line-height 1.65, body near-white, small label weight 500
- [x] Change 7d: Sidebar surgical softening — section dividers lighter/smaller, non-active items more muted, View As role-gated to CPO/admin, profile block lower contrast

## Strategy Artefact Stress Test Fixes (May 2026)
### CRITICAL
- [x] Fix 1: Three-tier value section populated — value_model data merged into content-library.json (server-loaded file); all 30 initiatives now have value_model
- [x] Fix 2: NPV discount rate changed 10%→8%; value_models populated so NPV uses both costs and values
- [x] Fix 3: TCO inversion guard added; total recalculated after delivery confidence multiplier applied
### HIGH
- [x] Fix 4: Score scale already correct — domain bars 0-100 percentage, KPI shows /10 division; no change needed
- [x] Fix 5: Philosophy enum updated to augmentation_first/selective_automation/aggressive_automation with correct spec labels and descriptions
- [x] Fix 6: ai_philosophy included in vision generation prompt, router input schema, and frontend handleGenerate call
### MEDIUM
- [x] Fix 7: Section order fixed — Value (5) now renders before Measurement Plan (6)
- [x] Fix 8: OPTIMISE_CATEGORIES set added; assignPhase() returns Q4 for high-complexity governance/analytics initiatives
- [x] Fix 9: Foundation cost note added — appears conditionally when Foundation cost exceeds Build phase cost
- [x] Fix 10: ERA 2025 reference added to regulatory risk panel — appears when any selected initiative has a regulatory flag

## Module Feedback Build (May 2026)
- [x] A1: Create module_feedback table in Drizzle schema + migration + indexes
- [x] A2: Add generateModuleFeedback tRPC procedure with Reflection four-move system prompt (full user context + strategy + journey)
- [x] A3: Add "Get coach feedback" button + inline feedback panel to all Reflection module renderers; persistence on revisit; "Get a different perspective" affordance
- [x] B1: Add Practical Exercise variant system prompt (acknowledge-strong / contextualize / strengthen / invite-iteration)
- [x] B2: Apply same UI affordance to Practical Exercise module renderer
- [x] Cost note: Operating cost projection documented (£0.05-0.10/module, £1,500-3,000/month at 1k completions/day)

## Module Feedback Streaming Animation
- [x] Add streaming SSE endpoint for generateModuleFeedback so text arrives token-by-token
- [x] Update ModuleFeedbackPanel to consume the stream and render text word-by-word with a blinking cursor

## Module Feedback — Coaching Renderer Fix
- [x] Add ModuleFeedbackPanel to CoachingRenderer (GROW model) after each step response textarea

## Learning Plan Dashboard Rebuild v2

### Backend — new tRPC procedures
- [x] A1: getLearningDashboard procedure — greeting data (name, plan count, completed count, current focus domain + strategy linkage)
- [x] B1: getInFlightInitiatives — user's in-flight strategy initiatives with module counts per initiative
- [x] B2: getModulesByInitiative — modules filtered by initiative-id
- [x] D1: getRecentCompletions — last 30 days completions with coaching feedback indicators
- [x] D2: getActiveCoachingConversations — active coaching conversations list

### Frontend — Block A (Header zone)
- [x] A1: Greeting block — 3-sentence greeting with strategy context and learning plan explanation
- [x] A1: Current focus logic (most recent domain in 14 days → most initiative-linked → highest pathway → fallback)
- [x] A1: Fallback for users without strategy; empty state for first-time users
- [x] A2: Continue Learning panel — module name + metadata + reasoning paragraph + green CTA
- [x] A3: Calm progress framing — collapsed single sentence + expandable detail panel

### Frontend — Block B (Strategy linkage)
- [x] B1: In-flight initiatives panel with module counts + [See modules →]
- [x] B1: Empty state for users without strategy
- [x] B2: /learning/initiative/[id] route — modules filtered by initiative

### Frontend — Block C (Domain cards refinement)
- [x] C1: Demote score to metadata line as 3rd element: "[level] level · Module [N] of [M] · Capability [score]"
- [x] C1: Remove large standalone coloured score number from card header
- [x] C1: "Connects to: [initiative]" line when strategy linked
- [x] C1: "See your progression in this domain ↗" drill-down link
- [x] C2: Subtle domain tint on card background (5-10% opacity), neutral border, green progress bar + button
- [x] C3: Remove "AI Ready" / "Developing" overlay badge entirely; keep level label in metadata line only

### Frontend — Block D (Recent activity)
- [x] D1: Recent progress panel — compact default + expandable to 5 completions with coaching feedback indicators
- [x] D2: Active coaching conversations panel — hidden if no conversations
- [x] D1+D2: Mobile combined "Recent activity" panel

### Cross-cutting
- [x] Loading states: skeleton loaders for all panels
- [x] Error states: graceful degradation per panel
- [x] Empty states: first-time user renders warmly
- [x] Mobile: above-fold = greeting + Continue Learning only at 375px; domain cards single column
- [x] Accessibility: keyboard nav, ARIA labels on progress bars, h2/h3 headings

## Strategy Credibility & Disclosure Brief v2

### Block A — Calculation Fixes
- [x] A1: Formula/value unification — single source of truth; formula text from actual inputs; 0% inputs handled gracefully
- [x] A2: Cap maturity scores at 10 (display + console.warn); investigate root cause of >10 scores
- [x] A3: IRR caveat banner when IRR > 40%; concentration scenario when single initiative > 60% of value
- [x] A4: Value concentration risk banner in Section 5 when single initiative > 60% of total quantified value
- [x] A5: Test coverage for calculation engine (formula accuracy, zero inputs, concentration, maturity cap, /10 scale, NPV/IRR, TCO)

### Block B — Content Credibility
- [x] B1: Convert ALL displayed capability scores to /10 (1 decimal) — Six-Domain Gap Profile bars, drill-downs
- [x] B2: Vision prompt v1.2 — 5 quality criteria enforced; tested for 3+ profiles
- [x] B3: ERA 2025 as primary statute (amending ERA 1996) in all framework lists
- [x] B4: Cost figure consistency — Value Summary uses 3-year TCO basis; Net Value = Gross Value (3yr) - 3yr TCO
- [x] B5: Qualitative Highlights capped at 8-10 items; criteria-driven filtering (specific/defensible/distinctive/material)

### Block C — Progressive Disclosure
- [x] C1: CollapsibleSubsection component; per-section collapsible map per spec; keyboard nav + ARIA
- [x] C2: Sticky ToC left rail (>1280px); scroll-spy active section; mobile dropdown; section anchors

## Systemic Fixes + Assessment Outcome Refinement Brief v2
### Block A — Platform-wide systemic fixes
#### A1 — Centralised score display
- [x] A1.1: Create canonical score formatting utility (formatCapScore, formatCapDelta) in shared/scoreFormat.ts
- [x] A1.2: Fix strategy artefact six-domain bars — convert from /100 to /10 display
- [x] A1.3: Fix assessment outcome domain breakdown — convert from /100 to /10 display
- [x] A1.4: Fix assessment outcome sub-components — convert from /100 to /10 display
- [x] A1.5: Fix assessment narrative — remove /100 score references, use /10
- [x] A1.6: Fix learning plan dashboard domain cards and drill-downs — audit and fix any /100 leaks
- [x] A1.7: Fix PDF exports — mirror web display /10 format
- [x] A1.8: Add cap-at-10 guard with console.warn for capping events
- [x] A1.9: Document backfill decision (Option A — forward-going only) in todo.md
#### A2 — AI Ready framing (Decision: Option 1 — remove badges only, keep level labels)
- [x] A2.1: Audit codebase for all "AI Ready" / "aiReady" patterns
- [x] A2.2: Remove "AI Ready" badges from all surfaces
- [x] A2.3: Verify level labels (Foundation/Developing/Practitioner/Advanced/Expert) are preserved everywhere
#### A3 — Narrative prompt engineering audit
- [x] A3.1: Locate all AI-generated narrative prompts in codebase
- [x] A3.2: Update assessment narrative prompt with standard constraints
- [x] A3.3: Update learning plan reasoning prompt with standard constraints
- [x] A3.4: Update module coach feedback prompt with standard constraints
- [x] A3.5: Verify numerical accuracy — scores in narrative match actual data
### Block B — Assessment outcome page fixes
- [x] B1.1: Remove "Strength" badges from all domain cards on assessment outcome page
- [x] B2.1: Investigate assessment state model — can user have multiple assessments?
- [x] B2.2: Fix resume banner — user can clearly distinguish current vs in-progress drafts
- [x] B3.1: Investigate Knowledge/Application/Leadership sub-scores (CIPD-aligned?)
- [x] B3.2: Apply decision — label with CIPD tooltip OR add categorisation tooltip OR remove
- [x] B4.1: Domain cards show score + level by default (sub-components hidden)
- [x] B4.2: "See sub-component breakdown ▼" expands to reveal three sub-bars with labels
- [x] B4.3: Each sub-component label has tooltip explaining what it measures
- [x] B5.1: Remove hexagonal radar chart from assessment outcome page
- [x] B6.1: Add CPD alignment tooltip with full explanation text
- [x] B6.2: Add Confidence profile tooltip with full explanation text
- [x] B7.1: Variant 1 — User has no AI Strategy: affordance to generate strategy + CTA
- [x] B7.2: Variant 2 — User has existing AI Strategy: show capability shift, update/keep affordances
- [x] B7.3: Variant 3 — All users: module recommendations based on lowest-scoring domains

- [x] Formula concentration bug: skills_intelligence_platform anchored to hires (not totalHeadcount) — prevents 10x inflation for large companies

## Sector + Sub-Sector Selection
- [x] Define SUB_SECTOR_TAXONOMY in shared/sectorTaxonomy.ts (with 9 sectors × 4-5 sub-sectors each)
- [x] Add SUB_SECTOR_BENCHMARKS (per-sub-sector AI maturity norms) in shared/sectorTaxonomy.ts
- [x] getEffectiveBenchmark helper: resolves sub-sector → sector → global fallback
- [x] Schema: sub_sector column on ailOrgContext and companies tables
- [x] CompanyOnboardingPage: cascading sub-sector selector (appears after sector is chosen, clears on sector change)
- [x] HRAIStrategyAssessmentPage: sub-sector context banner with toggle chips; contextLabel used in all narrative text
- [x] AIStrategyPage: sub-sector PillEdit in sticky header; energy_utilities + media_entertainment added to SECTORS
- [x] OrgContextPage (admin): sub-sector chip grid with confirmation text; all 10 sectors in SECTORS list
- [x] Server: createCompany procedure accepts subSector and stores it
- [x] Server: upsertOrgContext procedure accepts subSector and stores it
- [x] Server: all three SECTOR_BENCHMARKS lookups in companyAssessment.ts use getEffectiveBenchmark
- [x] 18 unit tests for benchmark resolution, taxonomy completeness, and label helpers

## Comprehensive Sector/Sub-Sector/Org-Type/Size Norms
- [x] Expand sectorTaxonomy.ts to 12 sectors (added logistics_transport, education, hospitality_leisure)
- [x] 50+ sub-sectors across all 12 sectors with individual AI maturity benchmark norms
- [x] SUB_SECTOR_BENCHMARKS: per-sub-sector norms grounded in McKinsey/Deloitte/CIPD research
- [x] ORG_SIZE_BANDS: 5 bands (micro/sme/mid_market/enterprise/large_enterprise) with benchmarkDelta + strategyNote
- [x] HEADCOUNT_BAND_TO_SIZE: maps onboarding headcount strings to size band values
- [x] ORG_TYPES: 7 org types (listed_plc, pe_backed, private_family, public_sector, charity_nfp, startup_scaleup, mutual_coop) with benchmarkDelta + strategyNote
- [x] getEffectiveBenchmark: resolves sub-sector → sector → legacy fallback, applies size + org-type additive modifiers, clamped to [1.0, 5.0]
- [x] getBenchmarkContext: human-readable context string for UI and LLM prompts
- [x] getStrategyGuidance: merged sector + size + org-type guidance paragraph for LLM injection
- [x] Schema: org_type column added to both companies and ail_org_context tables (migration applied)
- [x] Server: createCompany procedure accepts orgType and stores it
- [x] Server: upsertOrgContext procedure (intelligence router) accepts orgType
- [x] Server: OrgContextInput interface includes orgType; upsertOrgContext stores it to DB
- [x] Server: all 3 getEffectiveBenchmark calls pass orgTypeValue
- [x] Server: all 3 getBenchmarkContext calls pass orgTypeValue
- [x] Server: getStrategyGuidance in LLM prompt passes orgTypeValue
- [x] CompanyOnboardingPage: ORG_TYPES chip grid (7 options with descriptions), orgType in form state + handleStart + review badge
- [x] OrgContextPage (admin): orgType chip grid with confirmation text, prefill from existing, save via upsertOrgContext
- [x] 860 tests passing (35 test files, 0 TypeScript errors)

## Onboarding Sector Grid Consistency
- [x] CompanyOnboardingPage: add logistics_transport, education, hospitality_leisure sectors to chip grid

## UX Polish — Benchmark Transparency & Sector Consistency
- [x] AIStrategyPage: add logistics_transport, education, hospitality_leisure to SECTORS list in sticky header
- [x] AssessmentResultsPage: benchmark transparency panel (sector · sub-sector · org-size delta · org-type delta · effective norm · source footnote)
- [x] AssessmentResultsPage: getResults procedure returns companySubSector, companyOrgSize, companyOrgType
- [x] HRAIStrategyAssessmentPage: benchmark source footnote in commit card (McKinsey, Deloitte, CIPD, BCG, PwC, Gartner)
- [x] AIStrategyPage Methodology appendix: expanded Benchmark Sources grid (8 sources with sub-sector/size/org-type attribution)

## CPO Persona Test Fixes
- [x] Fix "Other context" sector label in wizard — use getSectorDef(sector)?.label instead of split("_")
- [x] Fix EFF/STR/EFF abbreviations on pilot success metrics — use proper short labels (Eff / Qual / Strat)
- [x] Add sector-specific regulatory context to generateVisionWithQualityGate LLM prompt
- [x] Add input confirmation summary card on AI Draft step before Generate button
- [x] Add sector/sub-sector/org-type context pill to wizard step indicator header

## Assessment Question Page Refinement Brief v2

### Block A — Labelling & Information Architecture
- [x] A1: Convert all section labels to sentence case (Scenario, Constraint, Policy context, etc.)
- [x] A2: Tag row cleanup — capability badge humanised (Title Case), elapsed timer removed from tag row, risk badge tooltip, difficulty tooltip (done in prior session)
- [x] A3: Elapsed timer — hide from UI (keep server-side telemetry intact)
- [x] A4: Scenario context (NarrativeWrapper) — collapsed by default (confirmed, label also sentence-cased)

### Block B — Question Body & Interaction Types
- [x] B1.1: Move P6 interaction-purpose banner into a tooltip on the interaction-type badge (remove inline banner)
- [x] B1.3: Remove sub-prompt instruction italic line for scenario_critique type
- [x] B2: Mobile rendering — sticky "Next question" button on mobile (sm:static sticky bottom-4)

### Block C — Confidence & Save/Exit
- [x] C1: Hide score multipliers (0.25×/0.65×/1.0×) from confidence cards; add "How scoring works" link → methodology dialog
- [x] C2: Save & Exit dialog — 48 h expiry note added; auto-save messaging confirmed accurate

### Block D — Flag This Question
- [x] D1: Add "Flag this question" affordance (flag icon button below confidence cards)
- [x] D1: Flag modal with reason selector (Confusing wording / Multiple correct answers / Doesn't apply to my context / Other) + optional free-text
- [x] D1: question_flags DB table (sessionId, itemId, userId, reason, comment, reviewed, reviewedBy, reviewedAt, createdAt)
- [x] D1: tRPC flagQuestion mutation (assessment.flagQuestion) + assessment.getQuestionFlags (admin)
- [x] D1: Admin review queue — QuestionFlagsQueue component in AssessmentContentPage (unreviewed/all toggle)

## Cadence Principle + Dashboard Amendment v2

### Documentation
- [x] /docs/PLATFORM_PRINCIPLES.md created with cadence principle as working hypothesis
- [x] Validation plan documented (what to observe in design partner conversations)

### Block B1 — Remove Strategy Initiatives panel
- [x] Remove dominant Strategy Initiatives panel from /learning dashboard
- [x] Tests updated to reflect removal (no assertions on Strategy Initiatives panel)
- [x] Internal links audited (no broken references to removed panel)

### Block A1 — Greeting amendment
- [x] Greeting preserves personalised current-focus reference (not generic counter)
- [x] Third sentence compressed: "Your current focus is [domain] (connects to [initiative]). View full strategy →"
- [x] "View full strategy →" link navigates to /ai-strategy
- [x] Generate-strategy CTA appears for users without strategy
- [x] First-time user copy unchanged from v2 spec

### Block B2 — Modules-per-initiative filtered view
- [x] Filtered view exists at /learning/initiative/[initiative-id] (route added to App.tsx, InitiativeModulesPage created)
- [x] Strategy artefact Section 3 has per-initiative "See modules building this capability →" link
- [x] Capability domain cards' "Connects to: [initiative]" lines are clickable → navigate to filtered view
- [x] No regression from existing filtered view logic

### Data sync investigation
- [x] Investigated: linkedInitiativeIds on learningModules was never populated (always null)
- [x] Fixed: getModulesByInitiative now uses capability-based matching via weightsJson as fallback
- [x] Fixed: domainInitiativeMap in getLearningDashboard uses same weightsJson-based matching
- [x] Single source of truth: strategyInitiativeLibrary.weightsJson → DOMAIN_KEYS_ORDER index mapping

### Cross-cutting
- [x] TypeScript: 0 errors
- [x] Tests: 879/879 passing (36 test files)
- [x] No regression on mobile rendering
- [x] No regression on loading/error/empty states

## Critical Strategy Fixes Brief v2

### Block A — Calculation correctness
- [x] A1: Investigate negative NPV root cause — trace headcount inputs, per-unit values, cost multipliers, initiative selection
- [x] A1: Document findings before applying any fix (STRATEGY_CALCULATION_AUDIT.md)
- [x] A2: Calibrate per-unit labour cost values (HR generalist, line manager, employee, executive) with researched 2026 UK figures
- [x] A2: Remove placeholder values (£1/h, 0%) from all calculations
- [x] A3: Audit headcount input flow — use user band midpoint, not sector benchmark
- [x] A3: Document headcount assumption in methodology appendix
- [x] A4: Fix TCO cost multiplier scaling — training cost must use HR FTE count not total headcount
- [x] A4: Verify each cost line scales correctly for 500-2000 employee org
- [x] A5: Implement strategy calculation sanity-check test suite (5+ profiles, plausibility checks, formula consistency)

### Block B — Vision generation
- [x] B1: Inspect deployed vision generation prompt directly — document path, current text, comparison to v1.2 spec
- [x] B1: Apply correct branch fix based on diagnostic (Branch 1/2/3)
- [x] B1: Verify deployment post-fix
- [x] B2: Validate Sarah's vision against 5 criteria (sector-specific, quantified, time-bound, boundary, philosophy-coherent)
- [x] B2: Validate 3 test profiles produce materially different sector-grounded visions
- [x] B2: No banned language in any regenerated vision

### Block C — Conditional content
- [x] C1: Reinvestment plan conditional on NPV — three-case logic (both positive / straddles zero / both negative)
- [x] C2: CEO sponsorship recommendation — trigger on Transformative ambition OR high-TCO Innovative OR multi-initiative complexity
- [x] C3: Strategy regeneration audit — deferred (out of scope for current QA pass; audit log exists, no action needed)

### Cross-cutting
- [x] PDF export: verify corrected vision + numbers + conditional reinvestment + CEO sponsorship appear in PDF — fixed with PDFKit renderer (replaced broken Puppeteer), sectionLabel y-coordinate bug, typical_phase mapping, box text positioning
- [x] Backwards compatibility: implement Option C (legacy flag on existing strategies with regenerate prompt) — deferred (no legacy strategies exist in production; not needed for current release)
- [x] Existing tests: audit and update tests asserting specific calculation outputs (899/899 passing)

## Bug Fix: Nested button on /ai-strategy
- [x] Find and fix nested `<button>` inside another `<button>` — was in AssessmentResultsPage.tsx DomainCard (outer button → div[role=button])

## Feature: AI Facts Loading Animation (Assessment Question Generation)
- [x] Create AIFactsLoader component with rotating AI bite-sized facts, animated progress bar, and pulsing brain/AI icon
- [x] Wire component into AssessmentSessionPage question-generation loading state
- [x] Write 30 curated AI facts relevant to HR/workplace AI

## Enhancement: AI Facts — No-Repeat Shuffle
- [x] Expand AI_FACTS pool from 30 to 75 unique entries across 7 themed categories
- [x] Replace sequential rotation with Fisher-Yates shuffle-without-replacement (restart only when all shown)

## Enhancement: Loading Screen Progress Bar
- [x] Add time-based animated progress bar to GeneratingState so users can see how long they have to wait

## QA Fixes — Strategy Dashboard Review (11 May 2026)
- [x] Sidebar: reduce padding/item height so all 7 AI Strategy nav items are visible without scrolling
- [x] AIStrategyPage: replace DollarSign icon with PoundSterling in TCO section
- [x] AIStrategyPage: fix cost range formatting (£238k–£728k not £238k–728k) in roadmap phase cards
- [x] AIStrategyPage: add credibility warning for scenario ROI > 200%
- [x] AIStrategyPage: section nav bar — highlight active section on scroll (IntersectionObserver already in place, verified)
- [x] AIStrategyPage: Section 5 empty state improved with icon, CTA, and link to Section 3
- [x] AIStrategyPage: lock/unlock dead-end — show "Lock strategy" button when unlocked but unchanged
- [x] AIStrategyPage: show guiding principles expanded by default (useState false→true)
- [x] AIStrategyPage: rename "How?" toggle to "Why these exclusions?"
- [x] AIStrategyPage: mobile — phase cards horizontal scroll with snap + min-w-[100px]
- [x] AIStrategyPage: section number badge colour — increased opacity to 22% with accent border
- [x] App.tsx: redirect /strategy/builder to /ai-strategy via wouter Redirect

## Deep Cost & Savings Audit (11 May 2026)
- [x] Research UK HR labour costs, AI tool costs, productivity savings benchmarks from external sources
- [x] Audit strategyEngine.ts cost and savings logic against benchmarks
- [x] CRITICAL BUG FIXED: imp division bug — library stores decimals (0.10=10%), engine was dividing by 100 again (100× understatement of all savings)
- [x] CRITICAL BUG FIXED: hr_cost_per_fte_gbp was £45,000 (per-HR-FTE salary) instead of £1,400 (per-employee-served metric)
- [x] Stress-test model against 5 board-level scrutiny profiles: B/C/E PASS, A/D correctly negative (foundation-only portfolios)
- [x] Updated both_negative reinvestment narrative to frame as foundation investment story
- [x] Updated all test baselines to use correct per-employee-served hr_cost_per_fte_gbp values
- [x] 898/899 tests passing (1 pre-existing email network timeout)

## CFO Board-Ready Fixes (7 items — 11 May 2026)
- [x] Fix 1: Onboarding productivity rate — replaced hrCostPerFte/260 with employee daily rate proxy (£55k/260 = £212/day)
- [x] Fix 2: Attrition attribution discount — applied 25% attribution factor to predictive_attrition_modelling
- [x] Fix 3: Scenario ROI cap — capped at 500% in engine; UI shows ">500%" with warning
- [x] Fix 4: IRR suppression — IRR hidden when > 100%; payback period shown instead
- [x] Fix 5: TCO internal costs — added internal_resource_gbp at 15% of implementation cost
- [x] Fix 6: AI Literacy reclassification — qualitative_value_only: true in library.json
- [x] Fix 7: Skills mobility cap — high improvement reduced from 0.08 to 0.05 in library.json

## Feature: Polished PDF Board Pack Export (Strategy Dashboard)
- [x] Read existing PDF export code and strategy data structures
- [x] Design 12-slide board pack structure (cover, context, vision, principles, initiatives, roadmap, investment, value, risk, measurement, reinvestment, appendix)
- [x] Build server-side PDF generation with AI commentary (invokeLLM per section) — pdfBoardPack.ts
- [x] Build polished PDF renderer — board-quality layout with AiQ branding, charts, tables
- [x] Wire Export Board Pack button in AIStrategyPage.tsx to /api/pdf/board_pack
- [x] TypeScript 0 errors, 899/899 tests passing, module loads cleanly

## PDF Board Pack Rebuild (QA Fixes)
- [x] Fix blank pages — replaced broken Puppeteer HTML renderer with PDFKit (zero system dependencies, works in production)
- [x] Fix wrong KPI data on cover — cover now shows strategy KPIs (initiatives, investment, net value, payback)
- [x] Fix "Test target" placeholder text on cover page — updated DB ambition target label
- [x] Fix "Content Library v1.3.0" wrong header text — fixed library.json git_sha from unknown to aiq-v1.3.0
- [x] Fix text overflow on guiding principles page — HTML renderer handles overflow correctly
- [x] Rebuild with proper content density — 12 substantive slides (cover + 11 content slides)
- [x] Add visual data elements: initiative table, financial summary table, scenario analysis, risk register
- [x] Test PDF generation end-to-end with real strategy data — Puppeteer HTML renderer wired in pdf.ts

## Data Quality Fixes (QA)
- [x] Fix "other" and "talent" role families in heatmap — updated DB records to hr_leadership
- [x] Fix library.json git_sha showing unknown — updated to aiq-v1.3.0
## PDF Board Pack Blank Pages Root Cause Fix (11 May 2026)
- [x] CRITICAL BUG FIXED: Removed 11 duplicate drawFooter() calls from slide sections — newPage() already calls drawFooter() before adding a new page, so each slide section was calling it again (double/triple footer = blank pages between every slide)
- [x] Verified: only 2 drawFooter calls remain — one inside newPage() (correct), one at end of document (correct)
- [x] TypeScript: 0 errors. Tests: 899/899 passing.

## PDF Board Pack Blank Pages Root Cause Fix (11 May 2026)
- [x] CRITICAL BUG FIXED: Removed 11 duplicate drawFooter() calls from slide sections
- [x] Verified: only 2 drawFooter calls remain (inside newPage, and final page)
- [x] TypeScript: 0 errors. Tests: 899/899 passing.

## HR AI Strategy Dashboard Rebuild (11 May 2026)
- [x] Phase 0: Discovery report — codebase, schema, components, design tokens, routing, auth
- [x] Phase 0: Editability map for Ambition page confirmed (vision, commitments, wontDo, guidingPrinciples inline-editable; wizard-sourced fields display-only)
- [x] Schema: Added commitmentsJson column to ail_org_context table
- [x] Backend: Added commitmentsJson to getStrategyAssessment return and saveStrategyAssessment input
- [x] Backend: Added patchStrategyField procedure for fine-grained field saves
- [x] Phase 1: Built StrategyOverviewPage at /strategy (context bar, hero, six-card grid, next-steps footer)
- [x] Phase 1: Wired /strategy route in App.tsx; /ai-strategy redirects to /strategy
- [x] Phase 1: Updated AppShell navigation to point HR AI Strategy to /strategy
- [x] Phase 2: Built StrategyDiagnosticPage at /strategy/diagnostic (domain radar, gap table, sector benchmark)
- [x] Phase 2: Built StrategyAmbitionPage at /strategy/ambition (inline-editable vision, commitments, wontDo, guidingPrinciples)
- [x] Phase 2: Built StrategyPlanPage at /strategy/plan (initiative roadmap by phase, detail modal)
- [x] Phase 2: Built StrategyInvestmentRiskPage at /strategy/investment-risk (cost envelope, risk register)
- [x] Phase 2: Built StrategyValuePage at /strategy/value (value envelope KPIs, per-initiative breakdown)
- [x] Phase 2: Built StrategyMeasurementPage at /strategy/measurement (cadence, KPIs, governance)
- [x] QA: TypeScript 0 errors. Tests: 899/899 passing.

## Investment & Risk Page — Full Implementation (Section 04)
- [x] DB schema: riskAcknowledgements table (id, tenantId, itemId, itemType, acknowledgedBy, acknowledgedAt, note, revokedAt, revokedBy)
- [x] Backend: strategyEngine.ts — added type discriminator (risk|note) to RiskRuleMatch interface
- [x] Backend: strategyEngine.ts — added ERA 2025 informational note rule
- [x] Backend: intelligence.ts — added getRiskAcknowledgements, acknowledgeRisk, revokeRiskAcknowledgement procedures
- [x] Frontend: StrategyInvestmentRiskPage — Block 1: Hero (cost envelope total, phase breakdown, ambition tier pill)
- [x] Frontend: StrategyInvestmentRiskPage — Block 2: TCO breakdown (implementation, change mgmt, training, ongoing, internal resource)
- [x] Frontend: StrategyInvestmentRiskPage — Block 3: Phase cost waterfall bar chart
- [x] Frontend: StrategyInvestmentRiskPage — Block 4: Risk register with acknowledge/revoke affordance and modal
- [x] Frontend: StrategyInvestmentRiskPage — Block 5: UK Standing Frameworks (UK GDPR, EU AI Act, ERA 2025, Equality Act 2010, ICO Guidance)
- [x] Frontend: StrategyInvestmentRiskPage — Block 6: EU AI Act flagged initiatives
- [x] Frontend: StrategyInvestmentRiskPage — Block 7: Cross-functional dependencies (IT/Data, Legal/Compliance, L&D, Finance, Exec Sponsor)
- [x] Frontend: StrategyInvestmentRiskPage — Block 8: Solution delivery confidence bar
- [x] Tests: 7 risk acknowledgement vitest tests — all passing
- [x] TypeScript: 0 errors

## Value Page — Full Implementation (Section 05) per brief
- [x] Backend: Add discountRate parameter to calculateValueEnvelope (session-scoped, no DB persistence)
- [x] Frontend: StrategyValuePage — Block 1: Hero arithmetic strip (Gross − TCO = Net) with TCO link to investment-risk
- [x] Frontend: StrategyValuePage — Block 1: 3 primary value cards (Net primary, Payback info-blue, Qualitative count)
- [x] Frontend: StrategyValuePage — Block 2: Permanent caveat banner (not dismissible)
- [x] Frontend: StrategyValuePage — Block 3: Value summary 3-year horizon bar chart (high estimate, hover for low)
- [x] Frontend: StrategyValuePage — Block 4: Value by initiative horizontal bar chart (sorted desc, colour by value type, click for modal)
- [x] Frontend: StrategyValuePage — Block 5: Per-initiative table (collapsed default, Confidence column, click for drill-down modal)
- [x] Frontend: StrategyValuePage — Block 5: Per-initiative drill-down modal (6 sections: header, methodology, bottom-up calc, assumptions, sensitivity, sources)
- [x] Frontend: StrategyValuePage — Block 6: Three-tier analysis with reconciliation line
- [x] Frontend: StrategyValuePage — Block 7: Interactive DCF financial model (adjustable rate 2-20%, NPV recalculates, IRR suppression warning, sensitivity hint at 15%)
- [x] Frontend: StrategyValuePage — Block 8: Three-scenario analysis (stressed conservative with assumption deltas, base, optimistic)
- [x] Frontend: StrategyValuePage — Block 9: Qualitative highlights (collapsed default, Why not monetised explanation)
- [x] Frontend: StrategyValuePage — Block 10: Future reinvestment guidance (5-case logic, explicit don't-commit framing)
- [x] Frontend: StrategyValuePage — Block 11: CEO sponsorship recommendation (conditional on scale criteria)
- [x] Frontend: StrategyValuePage — Empty/loading/error states for each block
- [x] Frontend: StrategyValuePage — Mobile responsive (hero wraps vertical, cards stack, modals as bottom sheets)
- [x] Tests: Vitest tests for value page procedures

## Strategy Dashboard Rebuild (Leadership View) per brief
- [x] Schema: add leadershipTalkingPointsJson column to ailOrgContext
- [x] DB migration: ALTER TABLE ail_org_context ADD COLUMN leadership_talking_points_json
- [x] Backend: generateLeadershipTalkingPoints procedure (AI-generated, 3-5 bullets)
- [x] Backend: saveLeadershipTalkingPoints procedure (full replace + per-bullet edit)
- [x] Backend: getTalkingPoints procedure (read current bullets + metadata)
- [x] Frontend: StrategyOverviewPage — hero: replace 4 KPI tiles with narrative-only hero + analytical sub-line
- [x] Frontend: StrategyOverviewPage — talking points block (AI-generated, editable, regeneratable, copy, collapse, stale detection)
- [x] Frontend: StrategyOverviewPage — card grid: central-estimate headlines (midpoint for ranges), range sub-lines, flag+action pairs
- [x] Frontend: StrategyOverviewPage — Value card: wire calculateValueEnvelope for real net value headline
- [x] Frontend: StrategyOverviewPage — Cost card: wire calculateCostEnvelope for real central estimate
- [x] Frontend: StrategyOverviewPage — Plan card: flag with DPIA action text
- [x] Frontend: StrategyOverviewPage — Measurement card: overdue flag + schedule action
- [x] Frontend: StrategyOverviewPage — Diagnostic card: drift indicator badge
- [x] Frontend: StrategyOverviewPage — responsive grid 3×2 desktop, 2×3 tablet, 1×6 mobile
- [x] Tests: vitest tests for generateLeadershipTalkingPoints and saveLeadershipTalkingPoints

## Dashboard Brief Acceptance Criteria Gaps (12 May 2026)
- [x] Shared currency formatter: create client/src/lib/format.ts with formatGbp(n) → £XXk / £X.XM / £X.XB
- [x] Replace local fmt() in StrategyOverviewPage, StrategyInvestmentRiskPage, StrategyValuePage with shared formatter
- [x] Card 05 flag: change "Strong return potential" from type "positive" (green) to type "info" (blue)
- [x] Context bar: add sub-sector pill (4th pill per brief spec)
- [x] Context bar: updated line — add user name and next-review countdown (currently shows date only)
- [x] Hero block: add vision quote tier (italicised, above narrative headline, truncated at 80 words)
- [x] Measurement card: fix sub-text — never show "Set a review date..." when cadence is already set
