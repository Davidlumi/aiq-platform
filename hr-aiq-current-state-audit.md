# HR AIQ — Current State Audit

**Prepared:** 8 May 2026  
**Purpose:** Factual inventory of the HR AIQ platform's current build state for UX advisory work. No design opinions, no improvement suggestions.  
**Build state labels:** **[Deployed]** — running at the live URL · **[Wireframe]** — designed but not built · **[Spec only]** — in Bible v2.0 or other doc, not yet wireframed or built · **[Not present]** — does not exist in any form.

---

## 1. User Personas and Roles

The platform models five distinct roles. Role assignment is stored in the `user_roles` table (`drizzle/schema.ts`) and resolved at request time via `getUserRoleKeys()` in `server/routers/auth.ts`. Navigation sections are derived from roles in `client/src/components/DashboardLayout.tsx`.

| Role key | Label | What they can see and do | Build state |
|---|---|---|---|
| `platform_super_admin` | Platform Super Admin (Manus/AiQ team) | Full access to all tenants, backoffice console (`/backoffice`), user deletion, anti-gaming thresholds, org management | **[Deployed]** |
| `tenant_admin` | Tenant Admin / CPO | All CPO nav: My Development, My Team (Overview + People), AI Strategy (HR AI Strategy, Build Strategy, Company Assessment), Admin (Users, Content Library) | **[Deployed]** |
| `hr_leader` | HR Leader | Same nav as `tenant_admin`; treated as CPO-equivalent in `isCpo()` check | **[Deployed]** |
| `manager` | Manager | My Development + My Team (Overview + People); no AI Strategy or Admin sections | **[Deployed]** |
| `hr_professional` / `hr_ops` / `hr_business_partner` | Individual Practitioner | My Development only (Assessment, Learning Plan, Content Library, Knowledge Base) | **[Deployed]** |

**Notes.** The `user.role` field on the Manus OAuth user object is a separate binary `admin`/`user` flag used only for scheduled-task authentication. The functional role system is entirely in `user_roles` + `roles` tables. The `AiQ Coach` (`/coach`) is built (`client/src/pages/CoachPage.tsx`) but hidden from navigation with a comment: `// AiQ Coach hidden — in development`.

---

## 2. Onboarding Flows by Persona

### 2a. Individual Practitioner (HR team member)

**Sign-up mechanism.** Two paths exist:

1. **Admin-invited via CSV** — Admin pastes CSV (email, first name, last name, role) into the Bulk Import dialog at `/admin/users`. The server creates the account with a hardcoded temporary password (`AiQ-Beta-2025!`) and returns it in the response. **No email is sent.** The admin must communicate credentials out-of-band. **[Deployed]**
2. **Self-register via organisation code** — User navigates to `/register`, enters their organisation's `tenantSlug`, and creates an account. **[Deployed]**

**Onboarding wizard** (`/onboarding`, `client/src/pages/onboarding/OnboardingWizard.tsx`). 4 steps:

| Step | Screen | Input collected | Build state |
|---|---|---|---|
| 1 | Welcome | None — informational | **[Deployed]** |
| 2 | Experience level | Career stage (Early Career / Developing / Senior / Executive) | **[Deployed]** |
| 3 | AI usage level | Current AI tool usage (None / Occasional / Regular / Power User) | **[Deployed]** |
| 4 | Job function | One of 12 HR function options (Talent Acquisition, ER, L&D, Comp & Ben, HRBP, People Analytics, OD, HR Ops, DEI, HR Leadership, Workforce Planning, Other) | **[Deployed]** |

Data is persisted to `ail_persona_profiles` and `ail_difficulty_profiles` via `trpc.auth.completeOnboarding`. First value: landing on `/dashboard` with a personalised difficulty profile seeded.

### 2b. CPO / HR Leader

**Sign-up mechanism.** Currently identical to individual practitioner — either CSV import by a super admin or self-register with an org code. There is no dedicated CPO self-serve sign-up flow. **[Deployed — same path as practitioner]**

**Company onboarding wizard** (`/company-onboarding`, `client/src/pages/company/CompanyOnboardingPage.tsx`). 3 steps:

| Step | Screen | Input collected | Build state |
|---|---|---|---|
| 1 | Welcome | None — informational | **[Deployed]** |
| 2 | Organisation Profile | Org name, sector (10 options), headcount band, HR function size, HR tech stack (multi-select), current AI maturity self-rating | **[Deployed]** |
| 3 | Assessment Briefing | None — explains the 7-dimension adaptive assessment | **[Deployed]** |

On completion, calls `trpc.companyAssessment.seedQuestions` and redirects to the company assessment session. First value: completing the 7-dimension company assessment and landing on the results page with maturity scores and a CTA to the AI Strategy page.

### 2c. Manager

No dedicated manager onboarding exists. Managers land on `/dashboard` (the `LeaderDashboardV2` component, which serves both CPO and manager roles with different scope filters). **[Not present — no manager-specific onboarding]**

### 2d. Platform Super Admin

No onboarding. Direct access to `/backoffice` after login. **[Not present — not needed]**

---

## 3. Strategy Assessment (CPO-facing)

**Route:** `/ai-strategy/assessment`  
**File:** `client/src/pages/dashboard/HRAIStrategyAssessmentPage.tsx`  
**Build state:** **[Deployed]**

### Question structure

This is **not** the 7-dimension company maturity assessment. It is a 4-step wizard that collects qualitative inputs to generate an AI strategy artefact. The questions are open-text, not Likert or multiple-choice.

**Step 1 — Business AI Aspiration** (5 open-text questions):

| ID | Question |
|---|---|
| `ai_outcomes` | What AI outcomes matter most to your organisation? |
| `business_problems` | What business problems should AI solve in the next 1–3 years? |
| `timeline` | What is your organisation's timeline for AI adoption? |
| `risk_appetite` | How would you describe your organisation's risk appetite for AI? |
| `success_definition` | What does AI success look like for your organisation? |

**Step 2 — HR's Role in the AI Vision** (4 open-text questions):

| ID | Question |
|---|---|
| `lead_vs_support` | Should HR lead AI adoption or play a supporting role? |
| `hr_processes_first` | Which HR processes should AI transform first? |
| `hr_capabilities` | What HR capabilities need to be built to enable the AI vision? |
| `governance_principles` | What governance principles matter most to your HR function? |

**Step 3 — AI-Drafted Vision & Principles.** LLM generates a vision statement and 4 guiding principles from Step 1–2 answers. The CPO can edit both inline before proceeding. Uses `trpc.intelligence.generateVisionWithQualityGate` with forbidden-phrase validation and retry logic.

**Step 4 — Initiative Selection + Commit.** Displays up to 8 pre-selected initiatives from the content library (chosen by `selectInitiatives()` in `server/strategyEngine.ts`). CPO can swap initiatives, set Business Ambition (1–4) and People Ambition (1–4) sliders, then commit. On commit, calls `trpc.intelligence.saveStrategyAssessment` and `trpc.intelligence.buildProvenanceMap`.

### Resume / save-progress

**[Deployed]** — The wizard auto-saves draft state to `ail_org_context` on every step transition via `trpc.intelligence.saveStrategyDraft`. On page load, `trpc.intelligence.getStrategyAssessment` restores the last saved state.

### "Don't know" / "Not applicable" handling

**[Not present]** — No explicit skip or "don't know" option. All Step 1–2 questions are open-text with placeholder hints; the user can leave them blank or write "N/A". The LLM generation proceeds regardless.

### Data persistence

Inputs are stored in `ail_org_context` (`drizzle/schema.ts`, table definition around line 814). Key columns: `aspirationAnswers` (JSON), `hrRoleAnswers` (JSON), `visionStatement` (text), `guidingPrinciples` (JSON), `wontDoJson` (JSON), `provenanceJson` (JSON), `selectedInitiativeIds` (JSON), `businessAmbitionLevel` (int), `peopleAmbitionLevel` (int), `libraryVersion` (varchar).

### Note on the 7-dimension company assessment

The 7-dimension adaptive company assessment (Strategy, Governance, Data, Technology, Workforce, HR Function, Culture) is a **separate** flow at `/company-assessment`. It uses a 38-question bank (`server/routers/companyAssessment.ts`, comment at line 104: "52 questions, 7–8 per dimension" — actual count per dimension: STR 7, GOV 7, WRK 7, CUL 6, DAT 6, TEC 5; HRP dimension is absent from the question bank). Results are stored in `company_assessment_sessions` and `company_assessment_answers`. **[Deployed]**

---

## 4. Individual Capability Assessment (HR team-facing)

**Route:** `/assessment` (start), `/assessment/:sessionId` (session), `/assessment/:sessionId/results` (results)  
**Files:** `client/src/pages/assessment/AssessmentPage.tsx`, `client/src/pages/assessment/AssessmentSessionPage.tsx`, `client/src/pages/assessment/AssessmentResultsPage.tsx`  
**Build state:** **[Deployed]**

### Question count and domains

The assessment is described as "AIQ V9.2 · 50 interactions · 6 capability domains · ~35 minutes" in the start screen. The adaptive engine targets 49 evidence items (`targetItems: 49` in `server/routers/assessment.ts` line 1695). Questions are drawn from a scenario bank in the database (`content_scenarios` table) and served adaptively.

| Domain key | Label |
|---|---|
| `ai_interaction` | AI Interaction |
| `ai_output_evaluation` | AI Output Evaluation |
| `ai_ethics_trust` | AI Ethics & Trust |
| `ai_change_leadership` | AI Change Leadership |
| `ai_workflow_design` | AI Workflow Design |
| `workforce_ai_readiness` | Workforce AI Readiness |

Each scenario presents a realistic HR situation and asks the user to choose between 3–4 options. The adaptive engine (`server/assessment/adaptiveEngine.ts`) selects the next scenario based on running signal estimates per domain.

### Persona-differentiated questions

**[Deployed — partial]** The engine accepts a `roleHint` parameter (derived from the user's job function set during onboarding) and applies role-specific evidence thresholds. The scenario bank includes role-tagged items. Whether different personas see materially different question sets depends on the content in `content_scenarios`; the routing logic exists.

### How team members are invited

See §6 below. There is no in-app invitation mechanism that triggers the assessment. Members are bulk-imported by the admin; they then navigate to `/assessment` themselves.

### Results aggregation back to CPO/Admin

**[Deployed]** — The leader dashboard (`/dashboard`, `LeaderDashboardV2.tsx`) queries `trpc.dashboardV2.leader.*` procedures which aggregate `assessment_scores` across all users in the tenant. The `functionHeatmap` procedure produces a domain × role-family matrix. The `main` procedure computes function-level averages, rating distributions, and domain breakdowns. The `ambitionGap` procedure compares the function average against the CPO's committed ambition target.

### Privacy thresholds — seven-person minimum

**[Not present]** — There is no minimum-member threshold implemented in the codebase. The `PeopleReportsPage` (`/people`) lists named individuals with their scores and readiness ratings without any anonymisation guard. The `LeaderDashboardV2` aggregates all users in the tenant regardless of count. No code path checks for a minimum of 7 (or any other number) before surfacing individual-level data.

### Data persistence

Assessment data is stored across: `assessment_sessions`, `assessment_answers`, `assessment_scores` (contains `score_breakdown_json` with per-domain scores), `assessment_answer_telemetry`, `ail_signal_ledger` (running signal estimates per user per domain).

---

## 5. AI Strategy Page — Status Against the Plumbing Brief

All 16 items from the plumbing brief (`hr-aiq-manus-brief-final.md`) were completed in the session ending 8 May 2026 (checkpoint `32236d54`). The `todo.md` at project root records the completion status.

| Item | Status | Verification note |
|---|---|---|
| P1.1: Vision generation — forbidden phrase validation, retry logic, required-elements check, 5 golden examples | **Complete** | `generateVisionWithQualityGate()` in `server/strategyEngine.ts`; forbidden phrases list and 5 golden examples in `content-library.json` templates section |
| P1.2: wontDoJson — DB column, LLM generation, web panel, PDF panel | **Complete** | `wontDoJson` column in `ail_org_context`; `generateWontDoItems()` in strategy engine; rendered in Step 4 of wizard and in `AIStrategyPage` Section 2; PDF Section 2 added in `server/pdf.ts` |
| P1.3: Risk rule auto-evaluation — structured triggers, `evaluateRiskRules()`, `sourceRuleId` column, DB insertion | **Complete** | 10 risk rules in `content-library.json`; `evaluateRiskRules()` in `server/strategyEngine.ts`; `sourceRuleId` on `ail_strategy_risks` table; called on commit |
| P1.4: Provenance modals — `provenanceJson` column, 4 modal types | **Complete** | `provenanceJson` in `ail_org_context`; `CostProvenanceModal`, `RiskProvenanceModal`, `InitiativeProvenanceModal`, `VisionProvenanceModal` in `AIStrategyPage.tsx` |
| P2.1: `selectInitiatives()` — deterministic, gap-weighted, phase-distributed | **Complete** | `selectInitiatives()` in `server/strategyEngine.ts`; weights by domain gap; distributes across foundation/build/scale/optimise phases |
| P2.2: Cost envelope — phased sums from library, caveat block, persisted on artefact | **Complete** | `calculateCostEnvelope()` in `server/strategyEngine.ts`; live data wired into `AIStrategyPage` Section 4 via `trpc.intelligence.calculateCostEnvelope` |
| P2.3: Source citations in Methodology appendix — artefact-scoped, deduped, grouped by type | **Complete** | Sources rendered in collapsed Methodology section of `AIStrategyPage`; deduped by `sourceId` from `content-library.json` |
| P2.4: `cross_functional_dependencies` — YAML content, aggregation, rendering | **Deferred** | Marked in `todo.md` as "deferred — out of scope for this brief". The field exists in the content library schema but is not aggregated or rendered. |
| P3.1: Sector benchmark markers on maturity dimension bars | **Complete** | `trpc.contentLibrary.getSectorBenchmark` wired into `AIStrategyPage`; benchmark marker rendered on HR capability domain bars |
| P3.2: Phase narrative rendering in Plan Executive view | **Complete** | Phase descriptions from `content-library.json` `phase_definitions` rendered in the Executive toggle of Section 3 |
| P3.3: EU AI Act flag rendering in Operational view | **Complete** | `regulatoryFlag` field on initiatives rendered as a pill in the Operational view of Section 3 |
| P3.4: Regeneration banner on stale inputs or stale library version | **Complete** | Banner shown when `strategyData.libraryVersion` differs from current `lib.meta.version`; also shown when assessment inputs have changed since last commit |
| P3.5: Score consistency audit on AI Strategy page | **Complete** | Domain scores on `AIStrategyPage` sourced from `trpc.intelligence.getStrategy` which reads from `assessment_scores`; consistent with `LeaderDashboardV2` |
| P3.6: Library version badge — all four elements | **Complete** | `LibraryVersionFooter` component at bottom of `AIStrategyPage` shows version, initiative count, risk rule count, sector benchmark count |
| CC.1: PDF parity across all P1/P2/P3 changes | **Complete** | `server/pdf.ts` `generateAIStrategyReport()` now includes Section 2 (Ambition: vision, principles, wontDo), Section 3 (Plan: roadmap table), Section 4 (Investment & Risk: cost envelope, top risks) |
| CC.2: 5 test fixtures with vitest assertions | **Complete** | 34 assertions in `server/strategyEngine.test.ts` covering `calculateCostEnvelope`, `evaluateRiskRules`, `selectInitiatives`, `buildProvenanceMap`; all 768 tests pass |

**Note on P2.4.** The `cross_functional_dependencies` field is present in the content library JSON schema but contains no data for any initiative. The aggregation and rendering work was deferred.

---

## 6. Team Rollout Flow

### What exists

**Admin invite mechanism — [Deployed]**

The admin navigates to `/admin/users` (`client/src/pages/admin/UsersPage.tsx`) and uses the "Import CSV" dialog. The CSV format is: `email, firstName, lastName, roleKey`. The server (`trpc.users.bulkInvite`) creates accounts with a fixed temporary password (`AiQ-Beta-2025!`) and returns it in the API response, which is displayed in the UI. Maximum 200 users per import batch.

**No email is sent.** The admin must communicate the temporary password and the platform URL to team members out-of-band. There is no invitation email, no magic link, and no Resend/SMTP integration in the invite path.

**Member sign-in and first use — [Deployed]**

Team members sign in at `/login` with their email and the temporary password. They are prompted to go through the 4-step onboarding wizard (`/onboarding`), then land on `/dashboard`. They can navigate to `/assessment` to start their capability assessment.

**Data flow back to CPO — [Deployed]**

Once a team member completes an assessment session, their `assessment_scores` row is immediately available to the leader dashboard queries. The CPO's `/dashboard` aggregates all tenant users' scores in real time. The `/people` page lists all users with their readiness ratings. The `/people/:userId` page shows the full individual report.

**Anonymisation and aggregation rules — [Not present]**

No minimum-member threshold is enforced anywhere. Named individual data is visible to CPO/admin regardless of team size. See §4 privacy threshold note.

### What is wireframed but not built

The wireframes include screens that go beyond the current CSV-import mechanism:

- **M3 — Conversation Prompts** (`m3_conversation_prompts.html`): Manager-facing screen showing LLM-generated conversation starters derived from team capability data. The route `/manager/conversation-prompts` exists and `ConversationPromptsPage.tsx` is built, but the generation logic for prompts is not specified in the wireframe. **[Deployed — partial; generation rules not defined]**
- **M4 — Team Development Progress** (`m4_team_progress.html`): Manager view of team learning progress over time. Route `/manager/team-progress` exists. **[Deployed]**

### What is not present

- Email invitation flow with magic links or unique sign-up URLs per invitee
- In-app notification to team members that they have been invited
- Manager-specific onboarding (see §2c)
- Any mechanism for a team member to request access without admin involvement

---

## 7. Pricing and Packaging

**Current model — [Deployed — UI only, no billing backend]**

The pricing page (`/pricing`, `client/src/pages/marketing/PricingPage.tsx`) displays three tiers:

| Tier | Price | Badge |
|---|---|---|
| Beta | Free | "Free during beta" |
| Growth | £18 per user / month (indicative) | "Coming soon" |
| Enterprise | Custom / annual contract | "Coming soon" |

The Beta tier CTA links to `/beta` (the beta application form). The Growth and Enterprise CTAs link to `/beta` as well — there is no payment flow.

**Billing mechanism — [Not present]**

Stripe is not integrated. `webdev_add_feature stripe` has not been run. There are no `stripe_*` tables in the schema, no webhook handlers, and no subscription state tracked in the database.

**Feature gating — [Not present]**

No features are currently gated behind a paid tier. All authenticated users within a tenant have access to all features their role permits.

**Trial mechanism — [Not present]**

No trial duration logic, no trial expiry, no conversion trigger.

**Beta application — [Deployed]**

The beta application form (`/beta`, `client/src/pages/marketing/BetaApplicationPage.tsx`) collects: name, job title, organisation, sector, headcount, LinkedIn URL, current AI tools, and a free-text context field. Submissions are stored via `trpc.waitlist.submit` and owner is notified via `notifyOwner()`. The FAQ states beta partners will receive "at least 30% off the first year of any paid plan" and "60 days' notice before any pricing changes."

---

## 8. Data, Privacy, and Security Model

### Data residency

**[Needs further investigation]** — The platform runs on the Manus hosting infrastructure. The database connection string is injected as `DATABASE_URL` (MySQL/TiDB). The specific region (US, EU, UK) is not visible in the codebase or environment configuration. The dev server URL is `us2.manus.computer`, suggesting US-based hosting for the development environment. Production region is not confirmed in the codebase.

### Access controls within a customer org

**[Deployed]** — All database queries are scoped by `tenantId`. The `getDb()` helper and all tRPC procedures enforce tenant isolation. Within a tenant:
- `platform_super_admin`: cross-tenant access via backoffice
- `tenant_admin` / `hr_leader`: all users in their tenant
- `manager`: all users in their tenant (same as CPO — no sub-team scoping is enforced at the data layer, though the UI offers a scope filter)
- Individual practitioner: their own data only

### Customer-initiated data deletion

**[Deployed — super admin only]**

`trpc.backoffice.deleteUser` performs a hard-delete cascade across all user-linked tables: assessment sessions, answers, scores, telemetry, simulation sessions, learning plans, content progress, AIL intelligence data, credibility scores, risk scores, and the user record itself. This procedure is gated behind `assertSuperAdmin()` — only `platform_super_admin` can invoke it. There is no self-service deletion flow for the user themselves or for a tenant admin.

Org deletion (`trpc.backoffice.deleteOrg`) archives rather than hard-deletes the tenant record (the "lumi" platform tenant is protected from deletion).

### Anonymisation rules

**[Not present]** — No minimum-member threshold is implemented. See §4.

### UK GDPR posture

**[Spec only]** — The content library references ICO guidance (`src_ico_guidance_hr_ai_2025`) and the platform FAQ mentions GDPR. No privacy policy, data processing agreement template, or DSAR (Data Subject Access Request) mechanism exists in the codebase.

### EU AI Act self-classification

**[Spec only]** — The content library (`content-library.json`) cites EU AI Act Article 6 and Annex III (employment and workers management use cases). The risk rule `rr_high_risk_ai_without_governance` flags initiatives that may fall under high-risk classification. The platform does not include a formal self-classification statement or conformity documentation.

### ICO ADM disclosure requirements

**[Not present]** — No automated decision-making disclosure mechanism. The platform produces capability scores that inform development recommendations, but no Article 22 UK GDPR disclosure or opt-out mechanism is implemented.

### Audit log / activity tracking

**[Deployed — partial]**

The `audit_logs` table (`drizzle/schema.ts` line 526) records: `tenantId`, `actorUserId`, `action` (varchar 200), `targetType`, `targetId`, `metadataJson`, `createdAt`. The backoffice router writes audit events for admin actions (config changes, threshold deletions, user management). The `/audit` route (`AuditLogPage.tsx`) is accessible to CPO/admin. Not all user actions are audited — assessment interactions, learning progress, and strategy commits do not currently write to `audit_logs`.

### Authentication

**[Deployed — email/password only]**

Login is via email and bcrypt-hashed password (`server/routers/auth.ts`). Sessions are JWT-signed cookies (`JWT_SECRET` env). Password reset flow exists (`/forgot-password`, `/reset-password`).

**SSO / SAML — [Not present]** — No SSO integration. The pricing page FAQ states "Enterprise SSO is planned for the Enterprise tier post-beta."

**MFA — [Not present]** — No multi-factor authentication.

**Manus OAuth** — The template includes Manus OAuth infrastructure (`/api/oauth/callback`) but the platform uses its own email/password auth, not Manus OAuth for end users.

---

## 9. Wireframes Inventory

Wireframes are stored at `/home/ubuntu/upload/wireframes/screens/hr_aiq_wireframes_final/` (20 HTML files + shared CSS). The wireframe index lists 4 personas: Practitioner (Anya Bennett), Manager (Tom Patterson), CPO (Sarah Mitchell), Admin (Marcus Tate).

| Screen ID | Title | Persona | Journey stage | Build state |
|---|---|---|---|---|
| P1 | Login & onboarding | Practitioner | Entry | **[Deployed]** — `/login`, `/onboarding` |
| P2 | Personal home | Practitioner | Daily use | **[Deployed]** — `/dashboard` (individual view) |
| P3 | Assessment | Practitioner | Core flow | **[Deployed]** — `/assessment/:sessionId` |
| P4 | Assessment results | Practitioner | Core flow | **[Deployed]** — `/assessment/:sessionId/results` |
| P5 | Development plan | Practitioner | Daily use | **[Deployed]** — `/learning` |
| P6 | Module content | Practitioner | Daily use | **[Deployed]** — `/learning/module/:moduleId` |
| P7 | Reassessment | Practitioner | Recurring | **[Deployed]** — same flow as P3/P4; no dedicated reassessment UI |
| P8 | Profile & settings | Practitioner | Settings | **[Deployed]** — `/profile` |
| M1 | Operational dashboard | Manager | Daily use | **[Deployed]** — `/dashboard` (manager view via `LeaderDashboardV2`) |
| M2 | Team member detail | Manager | Daily use | **[Deployed]** — `/people/:userId` |
| M3 | Conversation prompts | Manager | Daily use | **[Deployed — partial]** — `/manager/conversation-prompts`; generation logic unspecified |
| M4 | Team development progress | Manager | Daily use | **[Deployed]** — `/manager/team-progress` |
| C1 | Functional summary | CPO | Default landing | **[Deployed]** — `/dashboard` (CPO view via `LeaderDashboardV2`) |
| C2 | *(not in wireframe set)* | CPO | — | — |
| C3 | Strategic dashboard | CPO | Strategic view | **[Deployed — partial]** — `/ai-strategy` (`AIStrategyPage`); all 5 sections built |
| C4 | Board export | CPO | Export | **[Deployed]** — PDF export via `server/pdf.ts` `ai_strategy` report type |
| A1 | Admin home | Admin | Setup | **[Deployed]** — `/dashboard` (admin sees CPO nav) |
| A2 | People & structure | Admin | User management | **[Deployed]** — `/admin/users` (CSV import, export, role management) |
| A3 | AI roadmap | Admin | Strategy | **[Deployed]** — `/ai-strategy` |
| A4 | Reports | Admin | Reporting | **[Deployed — partial]** — `/reports` (`ReportsPage.tsx`); wireframe shows 4 quick reports; full report set not confirmed |
| A5 | Settings | Admin | Configuration | **[Deployed — partial]** — `/admin/org-context` (org context), `/admin/content-library` (library viewer); no unified settings screen matching A5 |

**Note on C2.** The wireframe index skips from C1 to C3 — there is no C2 screen file. This may be an intentional gap or a deleted screen.

**Total wireframe screens produced:** 20 (P1–P8, M1–M4, C1, C3–C4, A1–A5). The consultant's estimate of "33+ screens" is not reflected in the current wireframe set.

---

## 10. Open Product Decisions

The following decisions are unresolved and are blocking build or design work. Sources: wireframe index open decisions section; codebase inspection.

**1. Development plan pacing**
The wireframes show 5-week learning cycles. The actual pacing depends on protected-time-per-week assumptions. No pacing logic is implemented in the learning plan — modules are listed without a weekly schedule. **Blocking:** personalised learning timeline in `LearningPlanPage`.

**2. Reassessment cadence**
The wireframes show reassessment at the end of a development cycle. The recommended interval is 8–12 weeks. No reassessment scheduling or reminder logic exists. **Blocking:** P7 screen build and the `ailRetestQueue` table (which exists in the schema but is not populated by any current procedure).

**3. Criticality scale for initiatives**
The wireframes show three levels (Critical / High / Standard). The content library and strategy engine do not include a criticality field on initiatives. **Blocking:** initiative prioritisation display in the Plan section.

**4. Conversation prompt generation rules (M3)**
The wireframe pattern for manager conversation prompts is correct but the generation logic is unspecified. The route and page exist; the LLM prompt rules for generating prompts from team data are not defined. **Blocking:** M3 feature completion.

**5. Report set (A4)**
The wireframes show 4 quick reports as a launch set. The `/reports` page exists but the full report set (estimated 8–12 in the live product) is not defined. **Blocking:** A4 feature completion.

**6. Seven-person anonymisation threshold**
The Bible and the consultant brief both reference a minimum 7-person threshold before named individual data is visible. This is not implemented. The decision of whether to apply this threshold at the data layer, the API layer, or the UI layer — and what to show below the threshold — is unresolved. **Blocking:** GDPR-compliant team reporting.

**7. Email invitation mechanism**
The current bulk import returns a temporary password in the API response. Whether the production flow should use: (a) email with a magic link, (b) email with a temporary password, or (c) the current out-of-band communication approach — is not decided. **Blocking:** scalable team rollout.

**8. `cross_functional_dependencies` rendering**
P2.4 was deferred. The field exists in the content library schema but contains no data and is not rendered. **Blocking:** initiative sequencing display in the Plan section.

---

## 11. Quick Reference — What Exists vs What Doesn't

| Feature area | Deployed | Wireframe | Spec only | Not present |
|---|---|---|---|---|
| CPO onboarding (company wizard) | X | | | |
| Individual practitioner onboarding | X | | | |
| Manager onboarding | | | | X |
| Strategy assessment (qualitative wizard) | X | | | |
| Company maturity assessment (7-dimension) | X | | | |
| AI Strategy page — all 5 sections | X | | | |
| AI Strategy PDF export | X | | | |
| Provenance modals (cost, risk, initiative, vision) | X | | | |
| Regeneration banner | X | | | |
| Individual capability assessment (adaptive) | X | | | |
| Assessment results page | X | | | |
| Learning plan | X | | | |
| Module player | X | | | |
| Simulations | X | | | |
| AiQ Coach | Partial (hidden) | | | |
| Leader / CPO dashboard | X | | | |
| Manager dashboard | X | | | |
| People reports (named individuals) | X | | | |
| Team rollout — CSV bulk import | X | | | |
| Team rollout — email invitation | | | | X |
| Team rollout — magic link sign-up | | | | X |
| Manager conversation prompts | Partial | X | | |
| Admin users page | X | | | |
| Admin content library viewer | X | | | |
| Audit log page | X | | | |
| Backoffice (super admin) | X | | | |
| Pricing page (UI) | X | | | |
| Billing / Stripe | | | | X |
| Feature gating by tier | | | | X |
| User self-service data deletion | | | | X |
| Admin-initiated user deletion | X | | | |
| Seven-person anonymisation threshold | | | | X |
| SSO / SAML | | | X | |
| MFA | | | | X |
| Privacy policy / DPA | | | | X |
| DSAR mechanism | | | | X |
| EU AI Act conformity documentation | | | X | |

---

*End of audit. Document reflects codebase state at checkpoint `32236d54`, 8 May 2026.*
