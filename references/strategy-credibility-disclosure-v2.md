# HR AIQ — Strategy Artefact: Credibility Fixes + Progressive Disclosure (v2)

## Overview
Three blocks to fix before design partner conversations:
- **Block A — Calculation engine and number credibility** (5 items: A1–A5)
- **Block B — Content credibility** (5 items: B1–B5)
- **Block C — Progressive disclosure** (2 items: C1–C2)

## Block A — Calculation Engine and Number Credibility

### A1 — Resolve value calculation formula/result mismatches
**Symptom:** Per-Initiative Value Breakdown shows formulas that don't compute to stated results.
- Examples: "1120 × 1200 × 0% = £2,688" (should be £0), "5% × 1% × £25k × 560 = £6,600" (actual = £7,000, displayed = £5,600)
**Fix:**
- Single source of truth: calculation engine produces both formula string AND value from same computation
- Formula text generated FROM actual inputs, not authored separately
- Validation: formula text must parse to same value being displayed (±5%)
- For initiatives with 0% placeholder inputs: drop from quantified breakdown OR display "Insufficient data to quantify — see Methodology"
**Acceptance:** Every formula evaluates to within ±5% of displayed value; 0% inputs handled gracefully

### A2 — Cap maturity scores at 10 + investigate why scores exceed maximum
**Symptom:** Maturity Gap Analysis shows "AI Governance, Ethics... 10.8/10". Score above maximum is mathematically impossible.
**Fix (two-part):**
- A2.1: Apply display cap: `Math.min(rawScore, 10)` with console.warn if rawScore > 10
- A2.2: Investigate root cause — trace where 10.8 comes from (assessment producing >10, or normalisation error)
**Acceptance:** No maturity score above 10/10; no capability score above 10/10; warning logged for any capped score

### A3 — Address IRR/ROI credibility
**Symptom:** Financial Model shows 257.0% IRR. Three-Scenario Analysis shows 2,297%/734%/196% ROI. Not credible.
**Research-backed thresholds:** Typical transformation IRR 15–40%; high-performing 40–60%; above 60% is rare.
**Fix (three-part):**
- A3.1: Investigate per-initiative value assumptions for plausibility (volume assumptions vs org size, per-unit savings vs benchmarks)
- A3.2: Add caveat banner when IRR > 40%: "△ Indicative figure — sanity check before relying. IRR of {value}% is materially higher than typical transformation programme returns (15–40%). Possible reasons: [concentration / assumptions / costs understated]. Recommended: review with Finance before relying on this figure for capital decisions."
- A3.3: Add concentration scenario when single initiative > 60% of value: "What if [largest initiative] delivers 50% of projected value?"
**Acceptance:** IRR figures above 40% display caveat banner; concentration scenario added when applicable; IRR after recalibration likely 30–60%

### A4 — Surface value concentration risk explicitly
**Symptom:** ~£6.4M of £6.5M total quantified value (98%) comes from a single initiative.
**Fix:** Add to Section 5 (Value) when single initiative > 60% of total quantified value:
```
┌─ Value concentration risk ──────────────────────────────────┐
│ △ {percentage}% of this strategy's quantified value depends  │
│   on a single initiative: {initiative name}.                  │
│                                                               │
│ If this initiative is delayed or under-delivers, the          │
│ strategy's measurable case weakens significantly.             │
│                                                               │
│ Mitigation options:                                           │
│ • Review the value assumptions for this initiative against    │
│   your operational baseline                                   │
│ • Consider earlier-phase commitment to additional value-      │
│   generating initiatives to diversify                         │
│ • Phased value recognition rather than full Year-1 attribution│
└───────────────────────────────────────────────────────────────┘
```
**Threshold:** 60% (configurable). **Acceptance:** Acme test profile triggers banner (98%); banner shows initiative name and percentage; strategies with <60% concentration don't trigger banner

### A5 — Add test coverage for the calculation engine
**Goal:** Prevent regression. Test coverage requirements:
- formula displayed matches result computed (±5%) for every initiative
- zero-input formulas produce zero output (0% × £1000 × 100 = £0)
- value concentration calculated correctly
- maturity scores cap at 10
- all displayed capability scores use /10 scale
- NPV uses both value and cost inputs
- IRR calculation flags extreme values above 40%
- phase costs sum to total envelope
- TCO range has low < high
**Test against MULTIPLE profiles:** different sectors, ambitions, headcount bands, AI philosophies
**Acceptance:** Test suite covers all calculation paths; all tests pass against minimum 5 test profiles

## Block B — Content Credibility

### B1 — Score scale consistency
**Symptom:** Top of artefact shows "5.2/10". Six-Domain Gap Profile bars show "45 → 81, -36". Two scales on same page.
**Fix:** Convert ALL displayed capability scores to /10 with one decimal place.
- Before: "AI Workflow Design  45 → 81  -36"
- After:  "AI Workflow Design  4.5 → 8.1  -3.6"
**Audit scope:** Six-Domain Gap Profile (convert /100 to /10), Capability progression view, Drill-downs and detail views, PDF export
**Acceptance:** No raw 0-100 numbers visible in user-facing strategy artefact; all capability scores /10 one decimal; PDF mirrors web display

### B2 — Vision regeneration with deployment verification
**Symptom:** Current vision is generic v1.0: "Our vision is to transform the retail experience and internal operations through AI..."
**Fix:**
1. Confirm v1.2 vision generation prompt is actually deployed in production (inspect deployed prompt directly)
2. If deployed and matches spec: regenerate and verify output passes validation criteria
3. If NOT deployed: deploy correct prompt first, then regenerate
4. If deployed but output still generic: investigate prompt engineering issue
**Validation criteria for new vision:**
- Sector-specific: mentions retail, frontline workers, hiring volume, store operations, customer experience, OR similar sector-grounded language
- Quantified commitment: at least one specific number (e.g., "30% reduction", "by Q4 2027", "every people decision")
- Time-bound: explicit time horizon stated
- Boundary statement: explicit "we will not" or equivalent
- Philosophy-coherent: consistent with stated philosophy (augmentation-first should reference human capability/judgment)
**Acceptance:** v1.2 prompt confirmed deployed; Sarah's regenerated vision passes all 5 criteria; tested for at least 3 different profiles producing materially different outputs

### B3 — ERA 1996/2025 consistency
**Symptom:** ERA 2025 callout shipped but ERA 1996 still listed in framework table. Mixed references confuse readers.
**Fix:** Reference ERA 2025 as primary statute with explicit acknowledgment of ERA 1996 as underlying statute being amended.
```
Employment Rights Act 2025 (amending ERA 1996)

ERA 2025 modernises the 1996 base statute, adding worker rights to
request human review of AI-assisted employment decisions. Implements
alongside existing ERA 1996 protections for dismissal, redundancy,
and employment terms.

AI-assisted performance and workforce planning tools must:
• Allow human review of AI-assisted employment decisions
• Not undermine statutory rights under either statute
• Document the AI involvement in employment decisions per the
  AI Register requirement
```
**Acceptance:** ERA 2025 referenced as primary in all framework lists; ERA 1996 acknowledged where relevant; source citations updated to current 2025/2026 publications

### B4 — Cost figure consistency
**Symptom:** Value Summary bar chart implies cost ~£363k. TCO box shows £827k–£2,548k 3-year cost. Different cost figures in same section.
**Investigation:** Bar chart might be Year 1 implementation only; TCO might be 3-year fully-loaded cost. Investigate before fixing.
**Fix:** Pick ONE cost basis (recommended: 3-year TCO to match financial model's 3-year DCF horizon). Update Value Summary chart to use this basis explicitly. Recalculate Net Value using consistent cost basis: Gross Value (3-year) – 3-year TCO = Net Value.
**Acceptance:** Cost figure in Value Summary matches cost figure in TCO box; Net Value calculation uses same cost basis throughout; all cost figures use clear time-horizon labels

### B5 — Qualitative Value Highlights cleanup (criteria-driven)
**Symptom:** 20 qualitative items, many overlapping or fluffy.
**Selection criteria (apply per-profile, not Acme-specific):**
- Specific: "Reduced gender pay gap claim risk" (specific) vs "Employee trust" (vague)
- Defensible: can be tied to a specific initiative in the strategy
- Distinctive: doesn't substantially overlap with another item
- Material: would be cited in a board paper, not just a vendor brochure
**Implementation:**
- Generate qualitative items per-initiative from library (already done)
- Apply filtering criteria to generated set
- Cap at 8-10 items in displayed list
- If more than 10 items pass criteria, prioritise by initiative phase (Foundation phase items first)
- If fewer than 5 items pass criteria, flag for content review
**Acceptance:** Qualitative Highlights list capped at 8-10 items; each item meets specific/defensible/distinctive/material criteria; selection works across multiple test profiles

## Block C — Progressive Disclosure (trimmed)

### C1 — Collapsible sub-sections within each Section
**Goal:** Reduce initial cognitive load without removing content. Expand-on-demand for users who want depth.
**Default state principle:** Visible by default if the item is part of the headline thesis (user must see it to understand the strategy). Collapsed by default if it's supporting detail (depth on demand).

**Per-section collapsible map:**
- Section 1 (Diagnostic): Maturity dial + 6-domain profile VISIBLE; Maturity Gap Analysis priority dimensions (top 3) VISIBLE; on-track dimensions COLLAPSED "See 4 on-track dimensions ▼"
- Section 2 (Ambition): Vision + 3 commitments + ways of work VISIBLE; Guiding Principles (5 cards) COLLAPSED "See guiding principles ▼"; AI Philosophy VISIBLE; Current AI Landscape VISIBLE; What We Won't Do VISIBLE; Stakeholder Map VISIBLE
- Section 3 (Plan): 4 phase tiles VISIBLE; Initiative pillars chart VISIBLE; Edit initiative selection VISIBLE
- Section 4 (Investment & Risk): Cost Envelope by Phase VISIBLE; 4 Regulatory Risks (titles + risk levels) VISIBLE; Each risk's full description COLLAPSED; TCO breakdown VISIBLE; Cross-functional Dependencies COLLAPSED "See cross-functional dependencies ▼"; Solution Delivery Confidence VISIBLE; UK Regulatory Readiness framework names + risk levels VISIBLE, full descriptions COLLAPSED; Action required callout VISIBLE
- Section 5 (Value): 4 KPI tiles VISIBLE; Value Summary bar chart VISIBLE; Value by Initiative chart VISIBLE; Three-Tier Value Analysis VISIBLE; Financial Model (NPV/IRR) VISIBLE; Three-Scenario Analysis VISIBLE; Reinvestment Plan VISIBLE; Per-Initiative Value Breakdown COLLAPSED "See per-initiative calculations ▼"; Qualitative Value Highlights COLLAPSED "See qualitative outcomes ▼"; Value concentration risk banner VISIBLE when triggered
- Section 6 (Measurement): Review cadence VISIBLE
- What's Next: 3 action cards VISIBLE
- Methodology Appendix: Already collapsed — keep current behaviour

**Implementation:**
- New `<CollapsibleSubsection>` component with header + content + toggle
- Smooth animation on expand/collapse (200ms ease-out)
- Collapsed state reflected in URL hash for permalink support (e.g., `#expand=qualitative-value`)
- Accessibility: keyboard-navigable (Tab to toggle, Enter/Space to expand/collapse); aria-expanded updates correctly; screen readers announce state change; focus stays on toggle when expanding; heading hierarchy preserved when collapsed
- Mobile: same behaviour as desktop; touch targets meet WCAG AA (minimum 44×44px)
- PDF export: always exports FULL artefact (all sections expanded)

**Acceptance:** All listed collapsibles work per spec; default-collapsed items reduce initial scroll length by ~40-50%; keyboard navigation works; ARIA attributes correct; PDF exports full content regardless of collapse state

### C2 — Sticky table of contents
**Goal:** Navigation aid — let user jump between sections without scrolling. Stays visible as user scrolls.
**Layout:** Left rail sticky TOC + right main content area
**TOC content:**
```
On this page
  Where we are
  Where we're going
  How we get there
  What it costs and what could go wrong
  What this strategy is worth
  How we will measure progress
  Turn this strategy into action
  Methodology
```
**Behaviour:**
- Sticky on left rail at viewport widths >1280px
- Currently-active section visually highlighted (left border accent + bolder text)
- Click any section → smooth-scroll to that section
- On mobile (<768px): collapses to top dropdown ("Jump to section ▼")
- Section anchors use stable IDs (e.g., `#section-1-diagnostic`) for permalink support
**Accessibility:** Keyboard-navigable; screen reader navigation landmark with appropriate ARIA labels; click navigation announces destination
**Acceptance:** ToC visible on viewports >1280px, fixed position as user scrolls; active section indicator updates as user scrolls; click navigation smooth and accurate; mobile dropdown implemented; section anchors permalink-stable; keyboard and screen reader navigation work
