# AiQ Platform Principles

This document records foundational design decisions for the AiQ platform. Reference it from future briefs rather than re-explaining each principle. Each principle is marked with its current status — **working hypothesis** or **validated** — so readers know how much confidence to place in it.

---

## 1. Cadence Principle

**Status: Working hypothesis — pending design partner validation**

### The principle

AiQ is built for two distinct user cadences:

| Cadence | Surface | Frequency | Primary action |
|---|---|---|---|
| **Strategy** | `/ai-strategy` | Quarterly | Generate, review, and refresh the AI strategy artefact |
| **Development** | `/learning` | Weekly | Complete a 15–20 minute learning module |

The structural insight — two cadences, two surfaces — is more robust than the specific frequencies (quarterly + weekly), which are starting values subject to revision after design partner observation.

### Why this matters

This principle resolves many open product questions:

**Weekly dashboard (`/learning`).** Anything genuinely weekly belongs here. Strategy review content lives in `/ai-strategy`; weekly progress lives in `/learning`. Strategy context is preserved through the personalised greeting and clickable domain card connects-to links — not through a dominant panel that competes for attention.

**Strategy artefact (`/ai-strategy`).** The artefact is dense because it is read deeply once per quarter, not skimmed daily. Cognitive density is appropriate for quarterly review. Collapsibles, sticky ToC, and per-initiative module links are appropriate for this surface.

**Module experiences.** Modules are weekly engagement units — 15–20 minutes, focused, complete-in-one-sitting. Coaching feedback compounds across the weekly cadence.

**Notification and email cadence.** Weekly development digest aligns with weekly cadence. Quarterly strategy reminder aligns with quarterly cadence. Daily notifications are wrong for this audience.

**Mobile expectations.** Weekly cadence means mobile is for occasional catch-up (commute, between meetings), not sustained daily use.

**Competitive positioning.** AiQ is not competing with LinkedIn Learning (daily consumption) or McKinsey reports (one-time deliverable). It is closer to a quarterly strategic advisory relationship combined with a weekly coaching practice.

### What this rules in (default-right patterns)

- Quarterly strategy refresh prompts
- Weekly recommended module surfacing
- Capability progression visible across quarters
- Strategy artefact density appropriate for deep read
- Mastery framing throughout development
- Coaching feedback on reflections (compounds across weekly cadence)
- Re-assessment with delta detection (quarterly trigger)

### What this rules out (default-wrong patterns)

The following patterns are explicitly wrong under this cadence, unless design partner data validates otherwise:

- Daily streaks, daily badges, daily check-in pressure
- Real-time strategy collaboration features
- Live activity feeds requiring daily engagement
- Push notifications outside weekly digest
- Dashboard widgets requiring daily-fresh data
- Dominant strategy content competing for attention on the weekly entry point (`/learning`)

### What this does NOT say

- **Not "users only engage at these cadences."** A user may dip in mid-week to check progress. The cadence is the *anchor*, not the only allowed engagement.
- **Not "strategy and development never intersect."** Strategy context appears on the weekly dashboard (via greeting reference and connects-to links). Development context appears on quarterly strategy review (via capability progression). The principle is about which surface is *primary* for each cadence.
- **Not "validated by user research."** This is a working hypothesis. Design partners may surface that actual cadences differ (e.g., monthly + biweekly) or that the structure itself needs revision.

### How to use this principle

When future design questions arise, ask:

1. *"Is this weekly content or quarterly content?"*
2. If weekly → it belongs on `/learning`
3. If quarterly → it belongs on `/ai-strategy` and accessed when the user enters strategy mode
4. If both → default to one primary surface; cross-link rather than duplicate

When evaluating a feature: *"Does this feature need the user to engage more often than the cadence supports?"* If yes, the feature is wrong for this audience or wrong for this product — unless design partner data invalidates the cadence assumption.

### Validation plan

Observe the following in design partner conversations:

1. *"How often would you log into this?"* — reveals whether quarterly + weekly fits, or different cadences emerge
2. *"What would you want to see when you log in?"* — reveals whether strategy presence on the dashboard is wanted or rejected
3. *"How would you use the strategy document?"* — reveals quarterly vs other cadences
4. *"When would you re-take the assessment?"* — reveals whether quarterly re-assessment fits

After 2–3 design partner conversations, the cadence principle is either validated, refined with adjusted frequencies, or substantially revised.

---

## 2. Design Language

**Status: Working hypothesis**

The platform targets a "premium executive coaching environment" aesthetic. Key characteristics:

- Dark-first theme with high-contrast typography
- Subtle domain colour tints on cards (not saturated fills)
- Score data demoted below progress indicators (mastery framing over numeric ranking)
- Micro-interactions and empty states that feel considered, not generic

---

## 3. Score Scale Standard

**Status: Established**

All capability scores are expressed on a 0–100 scale internally and displayed as `x.x / 10` in the UI (one decimal place). Raw scores are divided by 10 for display. This applies consistently across the assessment results page, domain cards, and strategy artefact.

---

## 4. Content Review Policy

**Status: Working hypothesis**

Assessment question flags (from users) and scenario feedback (star ratings) are surfaced in the Assessment Content admin page. Flagged items are reviewed by a content admin before any editorial action. The `question_flags` table tracks reason, comment, and reviewed status. See `server/routers/assessment.ts` for the `flagQuestion` and `getQuestionFlags` procedures.

---

*Document created: May 2026. Maintained by the AiQ product team. Add new principles here as they are established; update status from "working hypothesis" to "validated" after design partner confirmation.*
