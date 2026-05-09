# HR AIQ — Learning Plan Dashboard Rebuild v2 (QA-revised)

## Summary
Targeted refinement of /learning page. Architecture stays (top progress → Continue Learning → domain cards). Execution changes.

## What changed from v1
- Block C revised: scores demoted (kept visible smaller), subtle domain tints retained, only "AI Ready" badge removed
- NEW: explicit mobile design specs per block
- NEW: loading, error, empty states per panel
- NEW: pathway count handling for variable module counts per domain x level
- NEW: "known unknowns" section

## What we're NOT doing
- Not changing the route (/learning)
- Not changing sidebar navigation
- Not eliminating score data — scores remain visible, just demoted
- Not removing all domain colour treatment — tints retained, toned down
- Not removing all status framing — level labels kept (Foundation/Developing/Practitioner/Advanced/Expert), only "AI Ready" overlay dropped
- Not gamifying (no badges, points, streaks, leaderboards, time pressure)
- Not adding new module formats
- Not changing assessment or strategy generation

## Strategic framing principle
"premium executive coaching environment." Does the page communicate journey-toward-strategy, or measurement-of-capability?
Default to coaching framing.

---

## BLOCK A — Header zone redesign

### A1 — Greeting with strategy context and learning plan explanation
Target state:
- "Welcome back, [name]."
- "You're [N] modules into your strategy-aligned learning plan — [M] modules curated from the full library based on your assessment and AI Strategy."
- "Your current focus is [domain], which connects to your [initiative] initiative ([phase], [status])."

Logic for "current focus":
1. Pick domain with most recent activity in last 14 days
2. If tied or no recent activity: pick domain with most modules linked to user's in-flight initiatives
3. If no strategy: pick domain with highest pathway position
4. Hardcoded fallback: "AI Workflow Design"

For users without strategy: third sentence becomes "Your current focus is [domain]. Generate your AI Strategy to see how these modules connect to specific initiatives in your function."

First-time user (no completions): "Welcome to your learning plan, [name]. We've curated [M] modules from the full library based on your assessment. Your first module is [name] — it builds the foundation for [domain capability]."

### A2 — Continue Learning panel with reasoning
Same as v1: Module name + metadata + reasoning paragraph + single green CTA.
Content: "Continue learning" heading, module name, format/duration/domain/level metadata, reasoning paragraph connecting to strategy initiatives, [Continue →] button.
Reasoning generation logic unchanged from v1.
Mobile: reasoning text moves below CTA, format/level metadata drops to single line.

### A3 — Calm progress framing
Default state: "Your progress / You're [X]% through your current learning plan ([N] of [M] modules). [See full plan ▼]"
Expanded state: "16 modules curated for your assessment and strategy / Total estimated time: ~[X] hours / Time invested so far: ~[Y] hours / Last activity: [date] ([module name]) / Most recent re-assessment: [date] ([N] months ago)"

---

## BLOCK B — Strategy linkage section (NEW)

### B1 — In-flight initiatives panel
Shows user's in-flight strategy initiatives with module counts and click-through.
Each initiative card: initiative name, phase, status, module count for this initiative, [See modules →] link.
If no strategy: empty state "Your learning becomes more powerful when connected to a strategy. Generate your AI Strategy to see which modules build capability for your specific initiatives. [Generate AI Strategy →]"
Error state: panel hidden entirely (no error message).
Mobile: initiatives stack vertically, each collapsed to single line: "► [name] / [phase] · [status] · [N] modules ([X] complete) / [See modules →]"

### B2 — Modules-per-initiative filtered view
Route: /learning/initiative/[initiative-id]
Shows modules filtered to those linked to the selected initiative.
Click-through from B1 initiative cards.

---

## BLOCK C — Capability domain cards refinement (REVISED)

### C1 — Demote scores (do not remove)
Target state per card:
- Card header: domain name only (no badge)
- Metadata line: "[level] level · Module [N] of [M] · Capability [score]"
- Progress bar (green)
- "Connects to: [initiative name]" (if strategy linked)
- "► Next: [module name] [Start →]"
- "See your progression in this domain ↗"

Score appears as third element in metadata line, after level and module position.
Smaller font weight than level/position elements.
No standalone large coloured number.

Pathway count: call getDomainPathwayCount(domainId, levelId) to get real M value. Don't hardcode.

For users without recent assessment: score shows last-known value with date qualifier ("Capability 7.4 as of 8 January").

### C2 — Domain colour tints retained, toned down
Colour discipline:
- Card background: subtle domain tint (5-10% opacity, distinguishable but quiet)
- Card border: neutral (consistent across cards)
- Domain icon: strongly coloured (kept — primary differentiator)
- Domain heading text: neutral
- Score number: small, quiet colour treatment
- Status badge: removed (per C3)
- Progress bar: green
- Start button: green

Reference: Notion's dark theme — different page categories have very subtle background hints.

### C3 — Remove "AI Ready" badge only; keep level labels
Remove: "AI Ready" / "Developing" overlay badge entirely
Keep: Level label as part of the metadata line ("Developing level · Module 3 of 8 · Capability 7.4")
Audit: search codebase for "AI Ready" or aiReady — should be removed from card components.

---

## BLOCK D — Recent activity and coaching presence

### D1 — Recent completions panel (compact by default)
Default (compact) state: "Recent progress — Last 30 days: [N] modules completed, [X] with coaching feedback. / Most recent: [module name] ([date]). / [See all completed ▼]"
Expanded state: full list of 5 most recent completions with coaching feedback indicators.
Click any completion → navigate to that module.
Mobile: D1 and D2 combine into single "Recent activity" panel, items interleaved by date, max 5 shown.

### D2 — Active coaching conversations panel
Same as v1: list of active Coach conversations.
Each item: conversation title, message count, last active date, [Continue →] link.
Hidden if no conversations.
Mobile: combined with D1 (see above).

---

## CROSS-CUTTING REQUIREMENTS

### Mobile design specifications
Above-the-fold priorities (375px viewport):
1. Greeting (A1, three sentences max)
2. Continue Learning panel (A2, abbreviated)
Everything else requires scroll.

Continue Learning panel mobile abbreviation:
- Module name
- [Continue →]
- "Connects to [initiative]" (below CTA)
- Format/level metadata drops to single line

Strategy linkage panel (B1) mobile: initiatives stack vertically, single line each.
Capability domain cards mobile: single column (not 2-column).
Recent activity (D1+D2) combined on mobile: single panel, interleaved by date, max 5 items.
Sidebar collapses to overlay menu on mobile (existing behaviour, confirm not regressed).

### Loading states
- Greeting (A1): placeholder "Welcome back..." with skeleton loaders for 2nd and 3rd sentences
- Continue Learning (A2): card outline with skeleton loaders for module name, metadata, reasoning, button
- Strategy linkage (B1): panel header visible, skeleton rows for each initiative
- Domain cards (C): all six card outlines render immediately with skeleton loaders for metadata and progress
- Recent activity (D1+D2): panel headers visible, skeleton rows for items
Implementation: use bg-muted animate-pulse divs.

### Error states
- Greeting (A1): if strategy data fails, 3rd sentence falls back to "Your current focus is [domain from completion data]." If completion data also fails, just first two sentences.
- Continue Learning (A2): if recommendation engine fails, fall back to "Pick any module from your capability domains below to continue." with no specific module surfaced.
- Strategy linkage (B1): if strategy data fails, panel hidden entirely. No error message.
- Domain cards (C): if any individual card's data fails, that card shows "Unable to load this domain right now. [Retry]" Other cards render normally.
- Recent activity (D1+D2): if data fails, panel hidden entirely.

### Empty states (first-time user)
Brand-new user (took assessment, no strategy, zero completions):
- A1: "Welcome to your learning plan, [name]. We've curated [M] modules from the full library based on your assessment. Your first module is [name] — it builds the foundation for [domain capability]."
- A2: points to first-recommended module with reasoning "Start here because [reason — typically lowest-scored capability domain]."
- B1: empty state "Your learning becomes more powerful when connected to a strategy. Generate your AI Strategy to see which modules build capability for your specific initiatives. [Generate AI Strategy →]"
- C: all six render but with "Not started yet" instead of progress data. Module count shows as "0 of [N]".
- D1, D2: hidden entirely until user has activity.

User with strategy but no module completions yet:
- A1: "Welcome to your learning plan, [name]. We've curated [M] modules connected to your [initiative] initiative and [N] other initiatives in your strategy. Your first recommended module is [name]."
- B1: renders normally (strategy is present)
- C: cards show "Not started yet" status
- D1, D2: hidden

### Accessibility requirements
- All interactive elements keyboard-navigable
- All images and icons have alt text
- Colour contrast meets WCAG AA on all text against backgrounds (especially domain tint backgrounds in C2)
- Screen reader: panel headings use proper h2/h3 semantic structure
- Skip-to-content link for keyboard users
- All progress bars have ARIA labels with text equivalent

---

## End-state acceptance
When all four blocks complete plus cross-cutting requirements, Sarah's experience opening /learning:
- Greeting renders with strategy context and learning plan explanation
- Continue Learning shows specific reasoning tied to her strategy
- Strategy linkage panel surfaces her in-flight initiatives with module counts
- Six capability domain cards render with: level + position + score (demoted), subtle domain tint, no "AI Ready" badge
- Recent activity panel (compact by default, expandable)
- Coaching conversations panel
- "Made with Manus" not present
- Mobile rendering tested and working
- Loading, error, and empty states defined
