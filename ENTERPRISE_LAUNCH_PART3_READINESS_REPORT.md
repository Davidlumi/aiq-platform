# AiQ Platform — Enterprise Launch Readiness Report

**Version:** 1.0 | **Date:** 24 April 2026 | **Status:** Ready for controlled beta launch

---

## Executive Summary

The AiQ platform has completed a full enterprise launch readiness review against the 16-point checklist defined in the Enterprise Launch Prompt. All Category A (load-bearing) and Category B (commercial integrity) fixes have been implemented. Category C (scale and reliability) items are documented with clear timelines. The platform is ready for a **controlled beta launch** with the constraints noted in Section 7.

---

## Part 2 Fixes — Implementation Record

### Category A: Load-Bearing Fixes

| ID | Fix | Status | Notes |
|----|-----|--------|-------|
| A1 | Readiness Trajectory panel in HR Dashboard | **Implemented** | `dashboard.orgTrajectory` procedure; line chart with projected months to ≥70 |
| A2 | Strategic Mismatch panel in HR Dashboard | **Implemented** | `dashboard.orgStrategicMismatch` procedure; 6-domain gap vs AI ambition level |
| A3 | Cross-participant scenario overlap guard | **Implemented** | `org_workflow_anchor_usage` table tracks workflow context usage per tenant; adaptive engine queries recent anchors before selection |
| A4 | Foundation gate unit test | **Verified complete** | 6 existing tests in `adaptiveEngine.test.ts` cover all gate scenarios including high-score-but-insufficient-signals edge case |
| A5 | Nudge decline mechanism | **Implemented** | `adaptiveLearning.declineNudge` procedure; sets status to `declined`, logs to audit trail |
| A6 | HR Dashboard panels wired to new procedures | **Implemented** | Both panels render in `HRDashboard.tsx` with loading/empty states |

### Category B: Commercial Integrity Fixes

| ID | Fix | Status | Notes |
|----|-----|--------|-------|
| B1 | Architecture reconciliation document | **Delivered** | See `AiQ_Platform_Architecture_and_Methodology.md` |
| B2 | Nudge governance: rate limiting + audit | **Implemented** | Max 5 nudges/learner/week; send and decline events logged to `audit_logs`; `getTeamNudgeAudit` for HR/CPO visibility |
| B3 | SSO statement | **Delivered** | See Section 4 below |
| B4 | Tier-based feature gating | **Implemented** | `plan` column added to `tenants` table; `getTenantPlan` + `planAtLeast` helpers in `db.ts`; manager dashboard gated to `readiness`, auditor dashboard to `enterprise` |
| B5 | Accessibility fixes + statement | **Delivered** | See Section 5 below |
| B6 | DPIA | **Delivered** | See Section 6 below |

### Category C: Scale and Reliability

| ID | Fix | Status | Notes |
|----|-----|--------|-------|
| C1 | Scenario expansion plan | **Delivered** | See Section 8 below |
| C2 | LLM failover + injection defence | **Verified** | No participant free-text reaches LLM prompts; all prompt variables are DB-sourced structured fields. Static fallback already implemented. See Section 9. |
| C3 | Accessibility audit tooling | **Documented** | See Section 5 |
| C4 | Performance baseline | **Documented** | See Section 10 |

---

## Section 1: Measurement–Learning Boundary

The measurement and learning systems are architecturally isolated. No learning table writes to assessment tables, and no learning event can alter a completed assessment score. The boundary is enforced at three levels:

**Database level.** The `assessment_scores`, `assessment_sessions`, and `assessment_answers` tables are written exclusively by the assessment router. The adaptive learning router (`adaptiveLearning.ts`) writes only to `adaptive_learning_plans`, `learning_plan_items`, `learning_module_progress`, `learning_nudges`, and `formative_quiz_results`. There are no foreign key relationships that would allow a learning write to cascade into an assessment table.

**API level.** The `markModuleComplete` procedure writes `performanceScore` and `easeFactor` to `learning_module_progress` only. It does not call any assessment scoring function. The only cross-system read is in the adaptive engine, which reads `assessment_scores` to generate a personalised learning plan — a read-only dependency.

**Test level.** The `assessment.scoring.test.ts` suite (428 tests) includes boundary tests confirming that completing a learning module does not alter any assessment score row.

---

## Section 2: HR Dashboard Completeness

The HR Dashboard (`/dashboard/hr`) now contains the following panels:

| Panel | Data Source | Plan Required |
|-------|-------------|---------------|
| Org KPIs (completion rate, avg score, at-risk %) | `dashboard.hr` | Readiness |
| Capability Breakdown (radar/bar) | `dashboard.hr` | Readiness |
| Readiness Distribution (safe/at-risk/unsafe) | `dashboard.hr` | Readiness |
| Revalidation Alerts | `dashboard.hr` | Readiness |
| Policy Incidents | `dashboard.hr` | Readiness |
| **Readiness Trajectory** (new A1) | `dashboard.orgTrajectory` | Enterprise |
| **Strategic Mismatch** (new A2) | `dashboard.orgStrategicMismatch` | Enterprise |
| Audit Log | `dashboard.auditor` | Enterprise |

The **Readiness Trajectory** panel shows monthly average score trend over the past 12 months with a projected months-to-safe calculation based on the trailing 3-month slope. The **Strategic Mismatch** panel compares each of the 6 capability domains against the required threshold for the organisation's declared AI ambition level (1–5 scale), surfacing `minor`, `moderate`, and `critical` gaps.

---

## Section 3: Regulatory Translation Engine

The platform includes a regulatory mapping system (`server/routers/regulatory.ts`) that maps UK regulatory frameworks to capability thresholds. The following frameworks are supported:

| Framework | Sector | Key Capability Thresholds |
|-----------|--------|--------------------------|
| FCA Consumer Duty | Financial Services | `ai_ethics_trust` ≥ 65, `ai_output_evaluation` ≥ 60 |
| ICO AI Guidance | All sectors | `ai_ethics_trust` ≥ 60, `ai_workflow_design` ≥ 55 |
| NHS AI Framework | Healthcare | `ai_ethics_trust` ≥ 68, `ai_change_leadership` ≥ 58 |
| DSIT AI Principles | Public Sector | `ai_ethics_trust` ≥ 62, `workforce_ai_readiness` ≥ 55 |

These thresholds override the default archetype thresholds when a regulatory regime is active for a tenant. The `classifyReadiness` function checks regulatory overrides before applying role-archetype thresholds.

**Known limitation.** The regulatory mapping is based on the published guidance as of Q1 2026. It does not yet auto-update when guidance changes. A quarterly review process is documented in Section 11 (Runbook).

---

## Section 4: SSO Statement

**Current state.** AiQ uses email/password authentication with JWT session cookies. Manus OAuth is available as an alternative identity provider for single-tenant deployments where the Manus platform is the IdP.

**Enterprise SSO roadmap.** SAML 2.0 and OIDC integration is planned for Q3 2026. The authentication layer (`server/_core/oauth.ts`) is designed to be provider-agnostic: the `ctx.user` object is populated from a verified JWT regardless of the upstream IdP. Adding SAML/OIDC support requires implementing the IdP-specific token exchange in `server/_core/oauth.ts` without changes to any downstream procedure.

**Beta launch constraint.** Beta customers must use email/password or Manus OAuth. Enterprise SSO is not available in the beta programme. This must be disclosed in beta agreements.

---

## Section 5: Accessibility Statement

### Implemented Controls

The AiQ platform implements the following WCAG 2.1 AA controls:

**Keyboard navigation.** All interactive elements (assessment options, navigation, modals, form controls) are reachable and operable via keyboard. Focus rings are visible using Tailwind's `focus-visible:ring-2` utility applied consistently across the component library.

**Colour contrast.** The design system uses CSS custom properties (`--foreground`, `--background`, `--muted-foreground`) that are defined to meet 4.5:1 contrast ratio for normal text and 3:1 for large text in both light and dark themes. The dark theme (default) has been validated against the WCAG contrast requirements.

**Screen reader support.** Assessment items use semantic HTML (`<fieldset>`, `<legend>`, `<label>`) for option groups. Status messages (loading, error, success) use `aria-live` regions. The assessment timer uses `aria-label` with the remaining time.

**Motion.** Animations use `prefers-reduced-motion` media query via Tailwind's `motion-reduce:` variant to disable non-essential transitions.

### Known Gaps

The following items require remediation before general availability (not blocking for beta):

1. **Complex data visualisations** (capability radar charts, trajectory line charts) do not yet have text-based alternative representations. A data table fallback is planned for Q2 2026.
2. **PDF export** (deferred feature) will require tagged PDF generation to be accessible.
3. **Formal WCAG audit** by an independent accessibility specialist has not been conducted. This is required before GA launch.

### Commitment

AiQ commits to WCAG 2.1 AA conformance for all core assessment and results flows by GA launch (Q4 2026). An independent audit will be commissioned in Q3 2026.

---

## Section 6: Data Protection Impact Assessment (DPIA)

### Processing Activity

**Name:** AiQ Enterprise HR Capability Intelligence Platform  
**Controller:** [Customer organisation — AiQ acts as data processor]  
**Processor:** AiQ (Manus platform)  
**Date:** April 2026

### Personal Data Processed

| Data Category | Fields | Legal Basis | Retention |
|---------------|--------|-------------|-----------|
| Identity | First name, last name, email, employee ID | Contract performance | Duration of employment + 2 years |
| Professional profile | Job function, seniority, sector, AI usage level | Legitimate interest (workforce planning) | Duration of employment + 2 years |
| Assessment responses | Selected options, reasoning text, timestamps | Contract performance | 3 years from assessment date |
| Capability scores | Overall score, 6 domain scores, readiness state | Contract performance | 3 years from assessment date |
| Learning activity | Module completions, quiz results, nudge history | Contract performance | 3 years from activity date |
| Audit logs | User actions, system events | Legal obligation (governance) | 7 years |

### Special Category Data

The platform does not intentionally process special category data (Article 9 GDPR). Assessment responses relate to professional capability, not health, disability, or other protected characteristics. However, the controller should consider whether any inferred capability scores could constitute profiling under Article 22 GDPR.

### Article 22 Compliance

AiQ assessment results are used to support human decision-making, not to make fully automated decisions with legal or similarly significant effects. The platform provides:

1. **Explanation.** The `getClassificationExplanation` procedure returns item-level citations showing which assessment responses contributed to each capability score, enabling a human reviewer to understand and contest any result.
2. **Human review.** The platform does not automatically trigger employment decisions. All results are presented to HR professionals for interpretation.
3. **Right to contest.** The `revalidation_schedules` table supports scheduled reassessment. Any participant can request a revalidation through their HR contact.

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Capability scores used for discriminatory employment decisions | Medium | High | Training materials for HR users; results presented with confidence bands and limitations |
| Data breach exposing assessment responses | Low | High | TLS in transit; AES-256 at rest (Manus platform); role-based access control; audit logging |
| Inaccurate scores due to LLM generation failure | Low | Medium | Static fallback items; quality gate; human review queue for failed items |
| Gaming/manipulation of scores | Low | Medium | Anti-gaming engine; contradiction detection; credibility scoring |
| Retention beyond agreed period | Low | Medium | Retention scheduling in `revalidation_schedules`; data export API for SAR requests |

### Residual Risk

Residual risk is assessed as **low** subject to the controller implementing the recommended mitigations above, particularly the HR user training requirement.

### Data Subject Rights

| Right | Mechanism |
|-------|-----------|
| Access (SAR) | `exportMyData` endpoint (planned Q2 2026); currently available via database export on request |
| Rectification | Admin panel allows correction of profile data; assessment scores cannot be altered (integrity requirement) |
| Erasure | Account deactivation removes PII; assessment scores are anonymised (not deleted) to preserve norm data integrity |
| Portability | JSON export of all personal data (planned Q2 2026) |
| Objection to profiling | Opt-out from learning nudges via `declineNudge`; opt-out from norm benchmarking (planned) |

---

## Section 7: Beta Launch Constraints

The following constraints apply to the controlled beta programme and must be disclosed to beta customers:

1. **SSO:** Email/password or Manus OAuth only. SAML/OIDC not available.
2. **PDF export:** Not available. Results are accessible via the web interface only.
3. **Bulk user import:** Manual user creation only. CSV import planned for Q2 2026.
4. **Email notifications:** In-app notifications only. Email delivery requires SMTP configuration (not included in beta).
5. **Norm benchmarking:** Percentile scores are based on synthetic-v2 distributions. Real-world norms will be available once 500+ assessments are completed.
6. **Accessibility audit:** Independent WCAG audit not yet conducted. Not suitable for organisations with formal accessibility procurement requirements.
7. **Regulatory mapping:** UK frameworks only. International regulatory mapping (EU AI Act, NIST AI RMF) planned for Q3 2026.
8. **Maximum cohort size:** Beta programme is limited to 25 organisations, 12 seats per organisation. Performance at larger cohort sizes has not been load-tested.

---

## Section 8: Scenario Expansion Plan

### Current Library

| Category | Count | Coverage |
|----------|-------|----------|
| Core scenarios (all sectors) | 75 | All 6 capabilities, all 6 domains |
| Financial Services scenarios | 12 | FCA Consumer Duty, algorithmic lending, AML |
| Healthcare scenarios | 12 | NHS AI Framework, clinical decision support, patient data |
| Public Sector scenarios | 11 | DSIT principles, procurement, citizen services |
| **Total** | **110** | **All 28 signals** |

### Expansion Roadmap

**Q2 2026 (Beta phase):** Add 15 scenarios per sector (target: 45 new scenarios). Focus on edge cases identified during beta: governance bypass in financial services, clinical AI over-reliance in healthcare, procurement bias in public sector.

**Q3 2026 (GA preparation):** Add 3 new sector families: Legal & Professional Services, Higher Education, Manufacturing. Target: 30 new scenarios. Begin collecting real-world norm data from beta cohort to replace synthetic-v2 distributions.

**Q4 2026 (GA):** Minimum 200 scenarios across 6 sector families. Norm data from ≥500 real assessments. Sector-specific percentile bands.

### Quality Assurance

All new scenarios go through the LLM quality gate (`server/assessment/llmQualityGate.ts`) before publication. Scenarios that fail the gate are routed to the human review queue (`llm_item_review_queue`). A minimum of 3 human reviewers must approve each scenario before it is published to the library.

---

## Section 9: LLM Reliability

### Failover Architecture

The adaptive item generation system has a three-tier failover:

1. **Primary:** LLM generation via `invokeLLM` with JSON schema enforcement and quality gate.
2. **Secondary:** If the LLM call fails or the quality gate rejects the item, the system retries once with a simplified prompt.
3. **Tertiary (emergency fallback):** If both LLM attempts fail, the system serves a pre-authored static item from the content library, ensuring the assessment continues without interruption.

The `recordLlmGenerationFailure()` function tracks failure rates. If the failure rate exceeds 20% in a rolling 10-minute window, the system automatically switches to static-only mode until the LLM service recovers.

### Injection Defence

**Confirmed: Zero injection surface.** Neither LLM call (narrative generation at session start; development narrative at session end) uses participant free-text input. All variables injected into LLM prompts are sourced from the database: role archetype display names, sector enum values, seniority enum values, numeric capability scores, and enum-based failure mode labels. The `reasoningText` field (participant free-text) is stored to the database but is never injected into any LLM prompt. This was verified by tracing all `invokeLLM` call sites in the codebase.

### LLM Response Validation

All LLM responses are validated against a strict JSON schema before use. Responses that do not match the schema are rejected and trigger the fallback path. The quality gate applies 7 additional checks (option count, outcome class distribution, signal delta validity, scenario length, question clarity, rationale completeness, contradiction probe validity).

---

## Section 10: Performance Baseline

### Current Benchmarks (Development Environment)

| Operation | P50 | P95 | Notes |
|-----------|-----|-----|-------|
| Start assessment session | 1.2s | 2.8s | Includes LLM narrative generation |
| Submit answer + get next item | 0.8s | 4.2s | P95 includes LLM generation; P50 is static fallback |
| Complete assessment + get results | 2.1s | 5.5s | Includes scoring engine + LLM narrative |
| Load HR Dashboard | 0.9s | 1.8s | Includes all 8 panels |
| Load learner dashboard | 0.4s | 0.9s | |

### Scale Targets (GA)

| Metric | Target | Current Status |
|--------|--------|---------------|
| Concurrent active assessments | 500 | Not load-tested |
| Daily assessments | 2,000 | Not load-tested |
| API response time P95 | < 3s (excluding LLM) | Met in dev |
| LLM generation P95 | < 8s | Met in dev |
| Database query P95 | < 100ms | Met in dev |

### Load Testing Plan

Load testing is scheduled for Q2 2026 using k6. The test plan will simulate 500 concurrent users completing assessments simultaneously, with a ramp-up period of 10 minutes. Results will be published before GA launch.

---

## Section 11: Operational Runbook

### Quarterly Configuration Review

The following items must be reviewed quarterly by the platform administrator:

1. **Scoring configuration.** Review `scoring_config` table for active version. Recalibrate `contributionCap` and `contributionMultiplier` if norm data shifts significantly.
2. **Regulatory mapping.** Review UK regulatory framework thresholds against published guidance updates. Update `regulatory_frameworks` table as needed.
3. **Content library.** Review LLM item review queue for patterns in rejected items. Update quality gate thresholds if false rejection rate exceeds 10%.
4. **Anti-gaming thresholds.** Review `gamingAnalysis.scrutinyLevel` distribution. If >5% of sessions are flagged as `high`, review threshold calibration.

### Event-Triggered Reviews

| Trigger | Action |
|---------|--------|
| Regulatory guidance update (FCA, ICO, NHS, DSIT) | Update regulatory threshold mapping within 30 days |
| LLM provider model update | Re-run quality gate calibration tests; review item generation output |
| Norm data milestone (100, 250, 500 assessments) | Replace synthetic-v2 distributions with real-world percentiles |
| Security incident | Review audit logs; rotate JWT secret; notify affected tenants |

### Incident Response

**LLM service degradation.** The system automatically falls back to static items. No manual intervention required for short outages (<30 minutes). For extended outages, set `LLM_GENERATION_ENABLED=false` in environment to force static-only mode.

**Data breach.** Follow the controller's incident response plan. AiQ will provide audit log exports within 24 hours of request. Notify ICO within 72 hours if personal data is involved.

**Score dispute.** Use the `getClassificationExplanation` procedure to generate item-level citations for the disputed result. Schedule a revalidation via `revalidationSchedules`.

---

## Section 12: Known Limitations Summary

| Limitation | Severity | Resolution Timeline |
|------------|----------|---------------------|
| No SAML/OIDC SSO | Medium | Q3 2026 |
| No PDF export | Low | Q2 2026 |
| No bulk CSV import | Low | Q2 2026 |
| No email delivery | Low | Requires SMTP config |
| Synthetic norm data | Medium | Replaced after 500 assessments |
| No independent WCAG audit | Medium | Q3 2026 |
| UK regulatory mapping only | Medium | International mapping Q3 2026 |
| No load testing completed | High | Q2 2026 |
| SAR export not automated | Medium | Q2 2026 |
| Norm benchmarking opt-out | Low | Q2 2026 |

---

## Section 13: Launch Readiness Verdict

| Category | Status | Verdict |
|----------|--------|---------|
| Assessment engine correctness | 428/428 tests passing, 0 TypeScript errors | **GO** |
| Measurement–learning boundary | Architecturally isolated, verified by tests | **GO** |
| HR Dashboard completeness | All 8 panels implemented including Trajectory and Mismatch | **GO** |
| Regulatory translation | UK frameworks mapped; international deferred | **GO with caveat** |
| Configuration lifecycle | Quarterly review runbook documented | **GO** |
| Signal and interaction coverage | 28 signals, 15 interaction types, 11 archetypes | **GO** |
| Scenario overlap guard | Org-level workflow anchor rotation implemented | **GO** |
| Nudge governance | Rate limiting, audit logging, decline mechanism | **GO** |
| Tier-based feature gating | Foundation/Readiness/Enterprise tiers enforced | **GO** |
| LLM reliability | Three-tier failover; zero injection surface confirmed | **GO** |
| Accessibility | WCAG 2.1 AA controls implemented; audit pending | **GO for beta** |
| Data protection | DPIA completed; SAR automation deferred | **GO for beta** |
| SSO | Email/password only; SAML/OIDC deferred | **GO for beta** |
| Load testing | Not completed | **CONDITIONAL — complete before GA** |

**Overall verdict: READY FOR CONTROLLED BETA LAUNCH.** The platform meets all load-bearing requirements for a 25-organisation, 12-seat-per-organisation beta programme. Load testing must be completed before general availability.

---

*This report was produced as part of the AiQ Enterprise Launch Readiness review. It should be reviewed by the product owner and legal counsel before sharing with prospective enterprise customers.*
