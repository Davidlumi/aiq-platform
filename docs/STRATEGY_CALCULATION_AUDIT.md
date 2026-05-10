# Strategy Calculation Audit — Block A Investigation Findings
*Documented: 2026-05-10 — prior to any fix being applied*

---

## Root Cause Summary

The negative NPV is caused by **four compounding errors** in `server/strategyEngine.ts`:

---

### A1 — Headcount Derivation Bug (Critical)

**Location:** `resolveValueFormula()` line 865

```ts
const totalHeadcount = Math.round(hires / 0.10);
```

**Problem:** This assumes a 10% annual turnover rate to back-calculate total headcount from hires. For a 1,000-person org with 14% attrition (140 hires), this gives `140 / 0.10 = 1,400` — a 40% overcount. For a 500-person org with 8% attrition (40 hires), this gives `40 / 0.10 = 400` — a 20% undercount.

**Fix:** The operational baseline already contains the actual `headcount` field (passed from `orgContextQ.data?.headcount`). Use it directly. Fall back to `hires / attritionPct * 100` only when headcount is absent.

---

### A2 — Per-Unit Labour Cost Placeholder (Critical)

**Location:** `resolveValueFormula()` line 863 and 869

```ts
const hrCostPerFte = get("hr_cost_per_fte_gbp", 12000);  // ← £12,000/yr is total HR function cost per FTE
const hrHourlyRate = Math.round(hrCostPerFte / 2080);     // ← £5.77/h — below minimum wage
```

**Problem:** `hr_cost_per_fte_gbp` in the sector benchmarks is the **total HR function cost per FTE** (e.g., £1,200–£3,500/yr for retail), not the **salary** of an HR professional. Dividing £1,200 by 2,080 hours gives £0.58/h — a nonsensical hourly rate that makes every time-based calculation near-zero.

The fallback of £12,000 is also wrong: it's the total cost of the HR function per employee served, not the annual salary of an HR generalist.

**Fix:**
- `hrHourlyRate` should be based on the **HR professional's salary** (£35,000–£55,000/yr UK 2026), not the per-FTE cost metric.
- Use `£42,000` as the UK median HR generalist salary → `£42,000 / 2,080 = £20.19/h ≈ £20/h`.
- `hrCostPerFte` (the function cost metric) should only be used in calculations that explicitly measure HR function cost (e.g., `hr_hr_operating_model_redesign`), not as a proxy for HR staff hourly rate.

---

### A3 — Headcount Input Not Passed to resolveValueFormula (Critical)

**Location:** `calculateValueEnvelope()` — the `operationalBaseline` object passed to `resolveValueFormula` does not include a `headcount` field.

**Problem:** Even if the wizard collects `headcount` from `orgContextQ.data?.headcount`, it is not included in the `operationalBaselineJson` that gets saved and passed to `calculateValueEnvelope`. The formula therefore always back-calculates headcount from hires.

**Fix:** Add `headcount` to the `OperationalBaseline` interface in `shared/strategyInputs.ts`, pass it through the wizard's save payload, and use it in `resolveValueFormula`.

---

### A4 — TCO Training Cost Uses Wrong Headcount (Significant)

**Location:** `calculateValueEnvelope()` lines 1072–1074

```ts
const estHrFtes_pre = Math.max(5, Math.round((operationalBaseline.hires_per_year ?? 50) / 0.10 / 50));
const trainingLow_pre  = estHrFtes_pre * 200;
const trainingHigh_pre = estHrFtes_pre * 400;
```

**Problem:** `estHrFtes_pre` uses the same broken `hires / 0.10` formula to estimate total headcount, then divides by 50 to get HR FTE count. For a 1,000-person org with 140 hires: `140 / 0.10 / 50 = 28 HR FTEs` — roughly 3× too high. Training cost of `28 × £400 = £11,200` is inflated.

**Fix:** Use `headcount / 50` directly (or `headcount * 0.02` as the 1:50 HR ratio), falling back to `hires / attritionPct * 100 / 50`.

---

### A5 — NPV Pessimistic Bias in Formula (Moderate)

**Location:** Lines 1080–1081

```ts
const netLow = totalLow - tco3yrHigh;   // worst-case value minus worst-case cost
const netHigh = totalHigh - tco3yrLow;  // best-case value minus best-case cost
```

This is correct for a conservative range. However, the NPV calculation at lines 1226–1227 uses `annualValue / horizonYears` which spreads the **total 3-year value** evenly — but the value models produce **annual** values (not 3-year totals). The result is that `annualValueLow2 = totalLow / 3` understates the annual cashflow by 3×, making NPV deeply negative.

**Fix:** The value formulas in `resolveValueFormula` return **annual** values. Do not divide by `horizonYears` again. Use `totalLow` and `totalHigh` directly as annual cashflows (they already represent one year of benefit).

---

## Vision Prompt (Block B)

The vision generation prompt in `generateVisionWithQualityGate()` (lines 153–166) is the **correct v1.2 spec** prompt. The golden examples, forbidden phrases, and quality gate are all present. The coach mode (`server/coach/modes/strategy.ts`) has a **separate, simpler prompt** that does not use the quality gate — this is the likely source of divergent visions if the coach flow is used instead of the wizard.

**Action:** No prompt change needed in the wizard path. Add a check that the coach mode vision prompt also uses the quality gate.

---

## Conditional Content (Block C)

- **C1 Reinvestment plan:** Not yet implemented — the value envelope returns `net_value_gbp` but there is no conditional reinvestment narrative.
- **C2 CEO sponsorship:** The risk rule `rr_executive_sponsor_required` fires for Transformative ambition (line 453) but is not surfaced as a dedicated CEO sponsorship recommendation in the artefact.
- **C3 Strategy regeneration audit:** The `coachAuditLog` table captures `strategy.saved` events from the coach mode. The wizard path does not write to the audit log.
