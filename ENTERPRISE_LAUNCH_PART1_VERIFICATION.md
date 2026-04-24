# AiQ Enterprise Launch Readiness — Part 1: Verification Report

**Date:** 24 April 2026  
**Codebase version:** `136475b3` (post-stress-test checkpoint)  
**Test suite:** 428 / 428 passing · TypeScript: 0 errors

---

## 1.1 — Measurement–Learning Boundary

**Question:** Does any learning-layer write touch the assessment scoring tables, or vice versa?

**Verdict: PASS — boundary is clean.**

The `markModuleComplete` procedure (lines 378–560, `server/routers/adaptiveLearning.ts`) writes exclusively to learning-layer tables: `adaptive_plan_items`, `adaptive_learning_plans`, `spaced_repetition_queue`, `learning_streaks`, and `learning_milestones`. It reads `assessment_scores` and `user_states` in read-only mode only — to seed the gap analysis — and never issues an `INSERT` or `UPDATE` against either table. The assessment router (`server/routers/assessment.ts`) has no imports from any learning router.

The only coupling is intentional and one-directional: the learning gap analysis engine reads the most recent `assessment_scores` row to derive capability gaps, but the learning layer has no write path back into the measurement layer.

---

## 1.2 — CPO / HR Dashboard Completeness

**Question:** Does the HR Dashboard contain all five CPO-facing views specified in the prompt?

| View | Status | Notes |
|------|--------|-------|
| Org Capability Heatmap | **Present** | Line 192 — 6-domain colour-coded grid with assessed-count per domain |
| Foundation Gap View | **Present** | Line 226 — counts employees below the ≥55 threshold on `ai_interaction` + `ai_output_evaluation` |
| Risk Register | **Present** | Line 284 — high-risk band count, at-risk count, critical-failure flag count |
| Regulatory Readiness Panel | **Present** | Line 349 — 4 UK regulatory indicators (EU AI Act, Algorithmic Accountability, Change Governance, Workforce Disclosure) with per-indicator progress bars and a legal disclaimer |
| Readiness Trajectory | **ABSENT** | No org-level projected readiness date or trajectory chart exists in `HRDashboard.tsx` or `dashboard.ts` router. Individual trajectory exists in `ReportsPage.tsx` but is user-scoped, not org-scoped. |
| Strategic Mismatch | **ABSENT** | No ambition-vs-capability gap view exists anywhere in the codebase. |

**Verdict: PARTIAL FAIL.** Three of five views are present. Readiness Trajectory and Strategic Mismatch are missing from the CPO dashboard. These are **Category A fixes** (A1, A2).

---

## 1.3 — Regulatory Translation Engine

**Question:** Does a regulatory translation engine exist that maps UK regulatory frameworks to capability score thresholds?

**Verdict: PARTIAL — contextual labels exist; threshold translation does not.**

The `organisationContextLayer.ts` file maps 8 UK sectors to their relevant legislation (UK GDPR, Equality Act 2010, Financial Services and Markets Act 2000, NHS Constitution, etc.) and exposes a `regulatoryReferences` array on the org context object. The scoring engine accepts `orgThresholdOverrides` (a `Partial<Record<CapabilityKey, number>>`) which are applied per-capability during classification. These overrides are loaded from `capability_thresholds` rows in the database (assessment.ts lines 1403–1459).

However, there is no engine that automatically translates a regulatory regime (e.g., "Financial Services") into a set of capability threshold overrides. The `orgThresholdOverrides` must be manually configured per tenant via the `OrgContextPage` admin UI. The regulatory readiness panel on the HR Dashboard uses fixed thresholds (60 for Ethics & Trust, 60 for Output Evaluation, 55 for Change Leadership, 55 for Workforce Readiness) regardless of sector.

**Gap:** No automated regulatory-to-threshold translation rule set. This is **Category B fix B1**.

---

## 1.4 — Configuration Lifecycle

**Question:** Is there a quarterly re-verification trigger, event-triggered revalidation, and config versioning?

| Mechanism | Status | Evidence |
|-----------|--------|---------|
| Scoring config versioning | **Present** | `scoring_config_version_at_start` (schema line 180) and `scoring_config_version` (line 230) are stamped on every session and result row. |
| Quarterly re-verification notification | **Present** | `dashboard.ts` lines 322–336 — if `quarterlyReviewEnabled` is true and overdue revalidations exist, `notifyOwner` is called. |
| Event-triggered revalidation | **Present** | `autoRegenerate.ts` — detects stale plans and queues regeneration. `ailRetestQueue` table tracks pending retests. |
| Admin Configuration UI | **Present** | `OrgContextPage.tsx` — Block 6 exposes quarterly review toggle, revalidation interval, and Small HR Function Mode. |
| Config change audit log | **ABSENT** | Changes to `org_context` or `capability_thresholds` are not written to the `audit_logs` table. |

**Verdict: MOSTLY PASS.** The three core mechanisms are present. Config change auditing is missing. This is **Category B fix B2**.

---

## 1.5 — Measurement Instrument Accuracy

**Question:** Are signal count, interaction type count, and role archetype model consistent with the specification?

| Dimension | Spec | Actual | Status |
|-----------|------|--------|--------|
| Signals | 26 | 26 (comment says "28 total but spec says 26" — the 4th Change Leadership signal `dismissive_of_concern_risk` is the 28th) | **DISCREPANCY** — code comment contradicts itself; actual union has 26 named signals + 2 risk signals = 28 total |
| Interaction types | 15 | 16 (15 named + `contradiction_probe`) | **PASS** — `contradiction_probe` is a cross-cutting type, not a primary type |
| Role archetypes | 11 | 11 (`ROLE_ARCHETYPES` in `roleArchetypes.ts` line 47) | **PASS** |
| Content roles | 22 | 22 (seed script lines 33–96) | **PASS** |
| Beta cohort size | Not specified in code | Marketing copy says "founding cohort" with no numeric cap | **PASS** — no false numeric claim |

**Verdict: MINOR DISCREPANCY.** The signal count comment is internally inconsistent (says "26 signals" in the header but "28 total" in the inline comment). The actual union type has 28 entries. The architecture document should be corrected to say 28 signals. This is **Category C fix C1** (documentation only, no logic change needed).

---

## 1.6 — Scenario Overlap Risk

**Question:** Is there a mechanism to prevent participants from seeing the same scenarios, and what is the overlap risk at scale?

**Verdict: RISK IDENTIFIED — no cross-participant deduplication.**

The assessment engine generates items via LLM (`generateAdaptiveItem`) using a scenario context drawn from the 110-item content library. Each session uses `answeredCount % workflowPool.length` to cycle through workflow contexts, which provides per-session variation. However:

- There is no mechanism to track which content scenario IDs have been used by other participants in the same organisation.
- Two participants with the same role archetype and seniority will receive items generated from the same workflow pool in the same rotation order.
- The pre-authored library has 110 scenarios. At 49 items per session (the `targetItems` default), a participant sees approximately 44% of the library per session.
- With 23+ participants in the same role archetype, scenario context overlap becomes near-certain.

The LLM generation layer provides surface-level variation (different fictional company names, different narrative contexts), but the underlying scenario anchors — the capability being tested, the interaction type, the difficulty level, the risk level — are drawn from the same pool in the same order.

**This is a commercial risk for enterprise cohorts.** It is **Category A fix A3**.

---

## 1.7 — Test Coverage Gaps

**Question:** Are there test gaps in the 7 enterprise-critical areas?

| Area | Coverage | Gap |
|------|----------|-----|
| Gaming pattern detection | 19 test cases across `anti-gaming.outcome-conditional.test.ts` and `assessment.stress.test.ts` | **Adequate** |
| Foundation gate enforcement | No dedicated test confirming that a user below the foundation threshold cannot receive an adaptive-phase item | **GAP** |
| Config versioning | No test confirming that a result row carries the correct `scoringConfigVersion` | **GAP** |
| Classification explanation + item citations | Tests exist in `classification-explanation.test.ts` and `assessment-engine-improvements.test.ts` | **Adequate** |
| RBAC / access control | Tests in `aiq.test.ts` lines 181–256 cover UNAUTHORIZED and FORBIDDEN for audit logs and user creation | **Adequate** |
| Nudge governance (rate limiting, decline) | `sendNudge` has no rate-limit guard and no decline mechanism | **GAP — both test and implementation** |
| Small HR Function Mode | No test for the `smallHrFunctionMode` flag affecting norm calculation | **GAP** |

**Verdict: 4 test gaps identified.** Foundation gate, config versioning, nudge rate-limiting, and Small HR Function Mode tests are missing. These are **Category A fix A4** (foundation gate test), **Category B fix B3** (config versioning test), **Category A fix A5** (nudge rate-limiting implementation + test), and **Category B fix B4** (Small HR Function Mode test).

---

## Part 1 Summary

| Question | Verdict | Fix Category |
|----------|---------|-------------|
| 1.1 Measurement–learning boundary | **PASS** | — |
| 1.2 CPO dashboard completeness | **PARTIAL FAIL** | A1 (Trajectory), A2 (Mismatch) |
| 1.3 Regulatory translation engine | **PARTIAL** | B1 |
| 1.4 Configuration lifecycle | **MOSTLY PASS** | B2 (config audit log) |
| 1.5 Measurement instrument accuracy | **MINOR DISCREPANCY** | C1 (doc fix) |
| 1.6 Scenario overlap risk | **RISK IDENTIFIED** | A3 |
| 1.7 Test coverage gaps | **4 GAPS** | A4, A5, B3, B4 |

**Total fixes required: 8** (3 Category A load-bearing, 3 Category B commercial integrity, 1 Category C documentation)

---

*Proceeding to Part 2: implementing all fixes.*
