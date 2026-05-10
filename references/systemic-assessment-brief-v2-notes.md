# HR AIQ — Platform-Wide Systemic Fixes + Assessment Outcome Refinement (v2)

## BLOCK A — Platform-wide systemic fixes

### A1 — Centralised score display
- **Symptom:** Score scale leaks across multiple surfaces. /100 raw scores appearing where /10 should be standard.
- **Instances observed:**
  - Strategy artefact six-domain bars: "45 → 81, -36" ❌ (should be /10)
  - Assessment outcome domain breakdown: "82, 81, 80, 79, 76, 74" ❌
  - Assessment outcome sub-components: "65, 64, 79, 87, 84, 81..." ❌
  - Assessment narrative: "AI Interaction (82/100)" ❌
- **Fix outcomes:**
  1. Single canonical formatting for capability scores used by every component
  2. Capability scores display as /10 with one decimal place by default (configurable)
  3. Capability scores cap at 10 at the display layer (no 10.8/10 bugs)
  4. Maturity scores display as /10 consistent with capability scores
  5. Capability deltas display as /10 with sign prefix (e.g., "+0.6", "-3.6")
  6. The formatting layer is the only place /100 → /10 conversion occurs
  7. Capping events are logged for engineering review
- **Audit scope:**
  - Strategy artefact: top tiles, six-domain bars, capability progression view, drill-downs, methodology
  - Assessment outcome: top score, sub-scores, domain breakdown, domain cards, sub-components, narrative
  - Learning plan dashboard: domain cards, drill-downs, recent activity score references
  - Module pages: any score references in personalisation panels or breadcrumbs
  - Manager dashboards: team capability views
  - Admin views: analytics or summary surfaces displaying scores
  - PDF exports: mirror the web display
  - Email content: if scores appear in notifications
- **Backfill decision:** Option A (forward-going fix only) recommended

### A2 — Decide and apply "AI Ready" framing platform-wide
- **Decision required from David before work starts**
- **Option 1 (Recommended):** Remove "AI Ready" badges only, keep level labels (Foundation/Developing/Practitioner/Advanced/Expert)
- **Option 2:** Keep "AI Ready" with explicit threshold (≥ 7.5/10 across all 6 domains) and consistent application
- **Option 3:** Remove all binary status framing entirely (strip "AI Ready", "Strength" badges, similar binary labels)
- **Acceptance:** David's decision documented in todo.md before work starts

### A3 — Narrative prompt engineering audit
- **Symptom:** AI-generated narrative content shares patronising/templated language patterns
- **Standard constraints for all AI-generated narrative content:**
  ```
  CRITICAL CONSTRAINTS:
  - Do NOT use encouragement-machine language: avoid "fantastic", "impressive", "excellent", "well done", "great job", "you're doing amazing".
  - Do NOT use templated openings: avoid "It's wonderful to see...", "I'm delighted to note...", "Building on your strong foundation...".
  - Do NOT make generic recommendations: avoid "consider exploring", "perhaps starting with", "you might want to look into".
  - DO reference user's specific context: sector, role, organisational size, in-flight strategy initiatives, recent activity.
  - DO use specific names: name initiatives, sectors, frameworks where relevant.
  - DO use mastery framing: "build", "develop", "strengthen" — avoid "score", "rank", "compared to others".
  - KEEP responses to specified length per surface.
  ```
- **Surface-specific requirements:**
  - Strategy vision: sector-specific, quantified, time-bound, philosophy-coherent, includes "we will not" boundary
  - Assessment narrative: three sections (Strengths, Development Areas, Next Priorities), references user's actual domain scores, connects Development Areas to in-flight strategy initiatives, sector-specific Next Priorities
  - Learning Plan reasoning: 2-3 sentences, references strategy initiatives by name, explains why this module specifically
  - Module Coach feedback: four-move pattern, references strategy initiative + sector, 4-6 sentences
- **Numerical accuracy:** scores referenced in narrative must match actual data (not hallucinated)

## BLOCK B — Assessment outcome page fixes

### B1 — Resolve "Strength" badge contradiction
- **Symptom:** Every domain card has a "Strength" badge — including domains identified as "Development Areas" in the narrative below. Same page contradicts itself.
- **Fix:** Remove "Strength" badges from all domain cards.
- **Note:** If A2 chooses Option 3, this is redundant. If A2 chooses Option 1 or 2, this fix is still needed.

### B2 — Resume banner / assessment state clarity (investigation-led)
- **Symptom:** Top of page shows "Assessment in Progress · 4 of 49 questions answered · 8% complete · Resume" while page below shows a completed assessment from 27 April.
- **Investigation needed first:**
  1. Can a user have multiple assessments simultaneously? How are they distinguished in storage?
  2. What happens when a user starts a re-assessment while an active one exists?
  3. Is there an existing UX pattern for in-progress vs completed states?
  4. Does the platform need to preserve assessment history?
- **Likely options:** Single assessment overwrite / Version history / Active + draft model
- **User must be able to tell:** which assessment is displayed, whether they have a draft in progress, what "Resume" takes, whether previous assessments are accessible

### B3 — Three sub-scores: investigate then decide
- **Symptom:** Top of page shows "Knowledge & Ethics: 7.6/10 · Application: 8.2/10 · Leadership: 8.0/10" — different categorisation than the six capability domains. Unexplained.
- **Investigation:** Are they CIPD-aligned? Derived from same questions? Vestigial?
- **Decision branches:**
  - If CIPD-aligned: label as such ("CIPD Profession Map alignment: Knowledge & Ethics 7.6/10...")
  - If derived from same data, different categorisation: add tooltip explaining categorisation
  - If vestigial/unclear value: consider removing

### B4 — Sub-component breakdowns: drill-down (default)
- **Symptom:** Each domain card shows three sub-components with cryptic labels and unexplained scores.
- **Default approach:** Progressive disclosure — sub-components hidden behind drill-down
  - Domain cards show domain score + level by default
  - "See sub-component breakdown ▼" expands to reveal the three sub-bars with labels
  - Each sub-component label has tooltip explaining what it measures
  - No new feature build required (no module linkage, no filtered views)
- **Optional v2 extension (NOT in this brief):** Making sub-components actionable (linking each to filtered modules)

### B5 — Hexagonal radar chart: remove
- **Fix:** Remove the radar chart. Bars are more readable, mobile-friendly, accessible, and convey identical information.

### B6 — CPD alignment + Confidence profile explanation
- **Fix:** Add tooltips with explanation.
- **CPD alignment tooltip:** "Your performance aligns with the [Chartered Fellow] level of the CIPD Profession Map. Levels: Foundation, Associate, Chartered Member, Chartered Fellow. See methodology for how alignment is calculated."
- **Confidence profile tooltip:** "Comparison of your self-assessed confidence against your demonstrated capability. Profiles: Well Calibrated (confidence matches capability), Under-Confident (capability exceeds confidence), Over-Confident (confidence exceeds capability). Well Calibrated indicates accurate self-awareness."

### B7 — Strategy and learning plan linkage (acknowledged larger scope)
- **Scope:** 2-3 days of work. Three UI variants.
- **Variant 1 — User has no AI Strategy yet:** Affordance to generate strategy from this assessment, brief explanation, clear primary CTA
- **Variant 2 — User has existing AI Strategy:** Show capability shift since strategy was generated, affordance to update strategy with new results, affordance to keep current strategy, display previous capability scores vs current
- **Variant 3 — All users (always visible):** Module recommendations based on lowest-scoring domains, connect to filtered learning plan view, 3-5 specific module suggestions with reasoning

## Sequencing
- Block A must complete before Block B starts
- A1 (score display) cascades to assessment outcome automatically
- A2 ("AI Ready" decision) affects B1 (Strength badges may be redundant if A2 chooses Option 3)
- A3 (narrative prompts) updates the assessment narrative directly
- If timing forces partial ship: ship Block A only
