# AiQ Platform — Load Testing Plan & Customer Admission Policy

**Version:** 1.0 | **Date:** April 2026 | **Status:** Pre-GA Beta

---

## Part A: Load Testing Plan

### A.1 Context and Objectives

The AiQ assessment engine is computationally non-trivial: each adaptive item generation involves a database read (capability scores, org context, workflow anchor history), an LLM call (median latency ~4 s), and a write-back (answer, updated scores, anchor usage). The goal of load testing is to establish a **safe concurrent user ceiling** before general availability and to identify the first bottleneck in the stack (LLM throughput, DB connection pool, or Express thread pool).

The three test objectives are:

1. Confirm that a single assessment session completes end-to-end within the SLA of 90 seconds per item under normal load.
2. Identify the concurrent session count at which p95 latency exceeds 15 seconds per item (the "degradation threshold").
3. Confirm that the DB connection pool and LLM rate limits are the binding constraints, not the application server itself.

### A.2 Test Scenarios

| Scenario | Concurrent Sessions | Duration | Pass Criterion |
|----------|-------------------|----------|----------------|
| **Smoke** | 5 | 10 min | 0 errors, p95 < 8 s per item |
| **Baseline** | 25 | 30 min | Error rate < 0.5%, p95 < 12 s per item |
| **Stress** | 75 | 30 min | Error rate < 2%, p95 < 20 s per item |
| **Soak** | 25 | 4 h | Memory stable ±10%, no connection leaks |
| **Spike** | 0 → 100 in 60 s | 15 min | Graceful degradation, no 500 errors |

Each "concurrent session" represents a participant completing a full 20-item assessment, including baseline items (pre-authored) and adaptive items (LLM-generated). The mix is approximately 6 baseline + 14 adaptive per session.

### A.3 Tooling

**Recommended tool:** [k6](https://k6.io/) (open source, TypeScript-native scripting, built-in HTTP/WebSocket support).

**Alternative:** Artillery (YAML-based, simpler for REST-only scenarios).

The test script should simulate the full participant journey:

```
1. POST /api/trpc/assessment.startSession → get sessionId
2. GET  /api/trpc/assessment.getNextItem  → get item
3. POST /api/trpc/assessment.submitAnswer → submit answer (repeat 20×)
4. GET  /api/trpc/assessment.getResults   → retrieve final scores
```

Each step should include realistic think-time (5–15 s between items) to simulate human reading time. The LLM call latency should be measured separately from the tRPC handler latency.

### A.4 Infrastructure Requirements for Load Testing

Load testing **must not** be run against the production database. A dedicated staging environment with the following configuration is required:

- Identical application code to production
- Seeded with 500+ synthetic participants (realistic score distributions)
- DB connection pool set to `max: 20` (same as production)
- LLM API key with a rate limit of at least 100 RPM (requests per minute)

### A.5 Monitoring During Tests

The following metrics must be captured during each test run:

| Metric | Tool | Alert Threshold |
|--------|------|----------------|
| p50/p95/p99 item latency | k6 | p95 > 15 s |
| DB connection pool utilisation | MySQL `SHOW STATUS LIKE 'Threads_connected'` | > 18/20 |
| LLM API rate limit errors (429) | Application logs | > 1% of requests |
| Express heap memory | `process.memoryUsage()` endpoint | > 512 MB |
| Error rate (4xx/5xx) | k6 | > 1% |

### A.6 Acceptance Criteria for GA

The platform is considered load-tested and ready for GA when all of the following are true:

1. Baseline scenario (25 concurrent) passes with p95 < 12 s and error rate < 0.5%.
2. Stress scenario (75 concurrent) passes with graceful degradation (no 500 errors, p95 < 20 s).
3. Soak scenario shows no memory leak over 4 hours.
4. The binding constraint has been identified and documented (expected: LLM rate limit at ~60 concurrent sessions).

### A.7 Known Risk: LLM Rate Limiting

The current implementation calls the LLM synchronously per item. At 75 concurrent sessions with a 14-item adaptive phase, the peak LLM request rate is approximately 75 × (1 item / 10 s) = **7.5 LLM requests per second** (450 RPM). This is likely to exceed the default rate limit of most LLM API tiers.

**Mitigation options (in priority order):**

1. **Request queuing with exponential backoff** — implement a server-side queue that retries 429 responses with jitter. This is the lowest-effort mitigation.
2. **LLM response caching** — cache generated items by (capability, domain, workflow_context, seniority) tuple with a 24-hour TTL. Reduces LLM calls by an estimated 40–60% at scale.
3. **Pre-generation** — generate a pool of items per org context nightly and serve from the pool during peak hours.

**Recommended for beta:** Option 1 (request queuing). Options 2 and 3 are Q3 2026 items.

---

## Part B: Customer Admission Policy

### B.1 Purpose

This policy defines the criteria for admitting organisations into the AiQ beta programme and the conditions under which access may be suspended or terminated. It is designed to protect data integrity, ensure a representative norm cohort, and manage LLM API costs during the pre-GA period.

### B.2 Admission Criteria

An organisation may be admitted to the beta programme if it meets **all** of the following criteria:

| Criterion | Requirement |
|-----------|-------------|
| **Minimum cohort size** | ≥ 12 participants completing assessments within the first 60 days |
| **HR sponsor identified** | A named HR Director or CPO who accepts the beta terms |
| **Data processing agreement** | Signed DPA covering UK GDPR Article 28 obligations |
| **Sector representation** | Preference for organisations in Financial Services, Healthcare, or Public Sector to build sector-specific norm data |
| **AI adoption stage** | Any stage (exploring through embedded) — diversity of stages is desirable for norm calibration |
| **Technical readiness** | SSO not required for beta; email/password authentication is sufficient |

### B.3 Cohort Size Limits

During the beta period, the following limits apply:

| Tier | Max Organisations | Max Participants per Org | Max Concurrent Sessions |
|------|-----------------|------------------------|------------------------|
| **Beta** | 25 | 500 | 10 per org (50 total) |
| **GA (planned Q3 2026)** | Unlimited | Unlimited | Subject to load test results |

The 25-organisation / 50 concurrent session limit is set conservatively based on the current LLM API rate limit and the absence of a request queue. It will be revised upward once load testing is complete and the request queue is implemented.

### B.4 Onboarding Process

1. **Application** — HR sponsor completes the beta application form (available at `/beta/apply`).
2. **Review** — AiQ team reviews within 5 business days. Criteria: cohort size commitment, sector fit, DPA readiness.
3. **DPA signature** — Digital signature via DocuSign. No access granted until DPA is countersigned.
4. **Tenant provisioning** — AiQ team creates the tenant record, sets the `plan` to `foundation` or `readiness` as agreed, and sends the HR sponsor an admin invitation.
5. **Configuration call** — 30-minute call to configure org context (sector, AI tools, regulatory regime, strategic priorities).
6. **Participant invitations** — HR sponsor sends invitations to participants via the platform's invitation flow.

### B.5 Suspension and Termination Conditions

Access may be suspended without notice if:

- The organisation exceeds the concurrent session limit (automatic rate limiting will apply first).
- A participant attempts to manipulate the assessment (detected by the anti-gaming engine; three strikes triggers account suspension).
- The DPA is found to be invalid or the data processing relationship changes materially.
- The organisation fails to meet the minimum cohort size commitment within 90 days.

Access will be terminated with 30 days' notice if:

- The organisation chooses not to transition to a paid plan at GA.
- The beta programme is closed (anticipated Q3 2026).

### B.6 Data Retention During Beta

All assessment data collected during the beta period will be retained for a minimum of 24 months from the date of collection, subject to the DPA. Participants may request deletion of their individual data at any time via the platform's data export and deletion flow (`/settings/data`). Aggregate, anonymised norm data derived from beta assessments will be retained indefinitely and will not be subject to individual deletion requests.

### B.7 Beta-to-GA Transition

Organisations that complete the beta programme in good standing will be offered a preferred pricing arrangement for GA. The transition will involve:

1. A new commercial agreement replacing the beta DPA.
2. Migration of all assessment data to the GA tenant structure (no data loss).
3. Enablement of SSO (SAML/OIDC) if required.
4. Access to the full enterprise tier feature set (audit log, regulatory mapping, org analytics).

---

## Appendix: Load Testing Runbook

### Prerequisites

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt-get install k6  # Ubuntu

# Set environment variables
export AIQ_BASE_URL=https://staging.aiq.example.com
export AIQ_TEST_USER_EMAIL=loadtest@example.com
export AIQ_TEST_USER_PASSWORD=<staging_password>
```

### Running the Smoke Test

```bash
k6 run --vus 5 --duration 10m scripts/load-test-assessment.js
```

### Running the Baseline Test

```bash
k6 run --vus 25 --duration 30m scripts/load-test-assessment.js
```

### Interpreting Results

A passing result will show:

```
✓ item_latency_p95 < 12000ms
✓ error_rate < 0.005
✓ checks: 100%
```

A failing result indicating LLM rate limiting will show:

```
✗ item_latency_p95 < 12000ms  (actual: 18500ms)
  → Check application logs for 429 responses from LLM API
  → Implement request queue before increasing concurrent session limit
```

---

*This document should be reviewed and updated after each load test run. The next scheduled review is prior to GA launch (Q3 2026).*
