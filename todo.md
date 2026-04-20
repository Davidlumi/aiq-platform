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
