# ROI Calculator — Benchmark Sourcing Register

**Document:** `references/roi-calculator-sourcing-register.md`
**Version:** 1.0 — 28 May 2026
**Owner:** Product / Commercial
**Status:** Draft — pending founder review and sign-off before any regulated or contractual use

---

## Purpose

This register documents the source and basis for each benchmark constant in the AiQ ROI Calculator (`client/src/pages/marketing/ROICalculatorPage.tsx`). All constants are **indicative** — they represent reasonable industry estimates or internal case study data. They must not be presented as guaranteed outcomes.

---

## Benchmark Constants

| Constant | Value | Category | Source / Basis | Confidence | Review Date |
|---|---|---|---|---|---|
| `avgAttritionRate` | 18% | Attrition | CIPD Resourcing & Talent Planning Survey 2024; LinkedIn Talent Trends 2024. Sector range 15–22% for AI-capable roles. | Medium | Q1 2026 |
| `attritionReductionFactor` | 55% | Attrition | AiQ internal case studies, n=4 beta partners (2024–25). Range 40–65% across cohorts. | Low–Medium (small n) | Q1 2026 |
| `replacementCostMultiplier` | 75% of salary | Attrition | SHRM 2023 "The Real Costs of Recruitment" benchmark. Widely cited range 50–200% depending on seniority. | High (published) | Q1 2026 |
| `genericTrainingWasteRate` | 65% | Training | Bersin by Deloitte "High-Impact Learning Organisation" 2023; McKinsey L&D survey 2022. Range 60–70%. | Medium (published) | Q1 2026 |
| `targetedEfficiencyGain` | 60% | Training | AiQ internal case studies, n=4 beta partners (2024–25). | Low–Medium (small n) | Q1 2026 |
| `avgProductivityLiftPerPoint` | 0.3%/pt | Productivity | Derived from AiQ pilot cohort data (2024–25). Methodology: revenue-per-FTE delta vs readiness score delta. | Low (internal) | Q1 2026 |
| `avgReadinessImprovement` | 37pp | Productivity | AiQ internal case studies, n=4 beta partners (2024–25). Range 28–45pp. | Low–Medium (small n) | Q1 2026 |
| `hrTimePerEmployeePerYear` | 4 hrs | HR time | AiQ time-study estimate based on structured interviews with 6 HR managers (2024). | Low (internal) | Q1 2026 |
| `hrHourlyCost` | £65/hr | HR time | ONS Annual Survey of Hours and Earnings (ASHE) 2024, HR professional median salary + 30% oncosts. | High (published) | Q1 2026 |
| `platformCostPerEmployee` | £18/emp/month | Platform cost | AiQ list price as of May 2026. Subject to commercial terms and volume discounts. | High (internal) | Rolling |

---

## Disclosure Requirements

When the ROI calculator output is shared with prospects or clients, the following disclosure must be included:

> *Projections are based on indicative industry benchmarks and AiQ internal case study data from a small number of beta partners. Actual results will vary by organisation size, sector, maturity, and implementation approach. These figures do not constitute a guarantee of outcomes.*

This disclosure is already present in the calculator UI (`client/src/pages/marketing/ROICalculatorPage.tsx`, line ~335).

---

## Review Schedule

This register should be reviewed and updated:
- When any MODEL constant is changed in the source code
- When new case study data becomes available (target: quarterly)
- Before any regulated, contractual, or investor-facing use of ROI figures

---

## Version History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 28 May 2026 | AiQ Platform | Initial register created (Fix 10, Product Integrity Brief v2) |
