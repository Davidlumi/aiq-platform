# AiQ Platform — Testing Guide

**Prepared:** June 2026  
**Environment:** Development / Staging  
**Universal password for all test accounts:** `TestAiQ2025!`

---

## Overview

This document covers all eight user scenarios on the AiQ platform, from a brand-new registrant through to an expert-level PRO subscriber. Each scenario has a dedicated test account pre-seeded in the database. Use this guide to verify that every gate, upgrade prompt, and content surface behaves correctly.

The platform operates on a **freemium model**:

| Tier | What is included |
|---|---|
| **Free** | One full capability assessment, full domain scores, diagnostic narrative, view-only learning plan |
| **PRO** | Everything in Free, plus: learning modules, AI Coach, knowledge base (articles, guides, frameworks), PDF download |

---

## Test Accounts

All accounts use the password `TestAiQ2025!` and are pre-verified (no email confirmation required).

| # | Scenario | Email | PRO? | Assessment | Learning Plan |
|---|---|---|---|---|---|
| S1 | Brand new user | `test.new@aiqtest.dev` | No | Not started | None |
| S2 | Free — assessment in progress | `test.inprogress@aiqtest.dev` | No | In progress | None |
| S3 | Free — assessment complete, no plan | `test.free.noplan@aiqtest.dev` | No | Complete (5.2) | Not generated |
| S4 | Free — assessment complete, plan locked | `test.free.plan@aiqtest.dev` | No | Complete (4.7) | Generated, locked |
| S5 | PRO — fresh, no modules started | `test.pro.fresh@aiqtest.dev` | Yes | Complete (6.3) | Generated, 0/8 done |
| S6 | PRO — learning in progress | `test.pro.progress@aiqtest.dev` | Yes | Complete (5.8) | 4 of 10 modules done |
| S7 | PRO — all modules complete | `test.pro.complete@aiqtest.dev` | Yes | Complete (7.8) | All 8 done |
| S8 | PRO — AI Expert level | `test.expert@aiqtest.dev` | Yes | Complete (9.1) | Generated, 0/4 done |

---

## Scenario S1 — Brand New User

**Account:** `test.new@aiqtest.dev`  
**State:** Registered, email verified, no assessment started.

### What to test

This account represents the very first experience after sign-up. The platform should guide the user towards taking their first assessment.

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in | Redirected to the dashboard. Onboarding prompt or "Start your assessment" CTA visible. |
| 2 | Click **Coach** in the sidebar | Full-page PRO gate shown: "AiQ Coach is a PRO feature". Upgrade modal can be opened. |
| 3 | Click **Modules** in the sidebar | Full-page PRO gate shown. |
| 4 | Click **Knowledge** in the sidebar | Full-page PRO gate shown. |
| 5 | Navigate to `/learning` | Learning plan page shown. Hero card displays "UPGRADE TO START" with a lock icon. Module domain cards show a green PRO lock badge. |
| 6 | Hover any domain card's PRO badge | Tooltip: "PRO feature — Upgrade to AiQ PRO to start modules in this domain." |
| 7 | Click the PRO badge or any module CTA | Upgrade modal opens. |
| 8 | Click any download button | Lock icon shown; clicking opens upgrade modal. |

---

## Scenario S2 — Free User: Assessment In Progress

**Account:** `test.inprogress@aiqtest.dev`  
**State:** Assessment session created but not yet submitted.

### What to test

The assessment should be resumable. All PRO gates remain active.

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in | Dashboard shown. "Continue your assessment" or resume prompt visible. |
| 2 | Navigate to `/assessment` | Assessment session resumes from the last answered question. |
| 3 | Complete all questions and submit | **Post-assessment interstitial fires** (first-completion animation). After 12 seconds or clicking "View my results first", redirected to results page. |
| 4 | On the results page | PRO upsell card visible between domain scores and development plan. Pulsing "Upgrade to PRO" button present. |

---

## Scenario S3 — Free User: Assessment Complete, No Learning Plan

**Account:** `test.free.noplan@aiqtest.dev`  
**State:** Assessment completed (overall score 5.2), gap analysis generated, but no adaptive learning plan yet.

### What to test

Results page should show full scores. Learning plan page should prompt plan generation. All PRO gates active.

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in | Dashboard shows assessment score (5.2) and domain breakdown. |
| 2 | Navigate to `/assessment/results` | Full results page: overall score, 6 domain scores, diagnostic narrative, cross-cutting patterns. PRO upsell card visible. |
| 3 | Click "Upgrade to PRO" on the upsell card | Pricing modal opens with smooth slide-up animation. Monthly (£50) and Annual (£480) options. |
| 4 | Navigate to `/learning` | Learning plan page shown. "Generate my plan" or similar CTA visible (plan not yet generated). |
| 5 | Attempt to access Coach, Modules, Knowledge | PRO gate shown on each. |

---

## Scenario S4 — Free User: View-Only Learning Plan

**Account:** `test.free.plan@aiqtest.dev`  
**State:** Assessment complete (4.7), full adaptive learning plan generated with 8 modules assigned. PRO not active.

### What to test

This is the primary view-only state. The plan is fully visible but all module interactions are locked.

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in | Dashboard shows score (4.7) and a learning plan CTA. |
| 2 | Click the learning plan CTA on the dashboard | Upgrade modal opens (dashboard is PRO-aware for free users). |
| 3 | Navigate to `/learning` directly | Learning plan page loads. All 6 domain cards visible. |
| 4 | Inspect domain card footers | Each shows a green **PRO** lock badge instead of "View ›". |
| 5 | Hover a domain card PRO badge | Tooltip: "PRO feature — Upgrade to AiQ PRO to start modules in this domain." |
| 6 | Click a domain card | Domain modal opens showing the module list. |
| 7 | Inspect module rows in the modal | Each row is slightly dimmed. CTA shows a lock icon. |
| 8 | Hover a module row CTA | Tooltip: "PRO feature — Upgrade to AiQ PRO to start this module and access your full learning programme." |
| 9 | Click a module row CTA | Upgrade modal opens. |
| 10 | Navigate to `/learning/modules/[any-id]` directly | Full-page PRO gate shown. |
| 11 | Navigate to `/learning/coach` | Full-page PRO gate shown. |
| 12 | Navigate to `/knowledge` | Full-page PRO gate shown. |
| 13 | Navigate to `/knowledge/articles` | Full-page PRO gate shown (tab pre-selected to Articles). |
| 14 | Navigate to `/knowledge/guides` | Full-page PRO gate shown (tab pre-selected to Guides). |
| 15 | Navigate to `/knowledge/glossary` | Full-page PRO gate shown (tab pre-selected to Frameworks). |

---

## Scenario S5 — PRO User: Fresh Start

**Account:** `test.pro.fresh@aiqtest.dev`  
**State:** Assessment complete (6.3), learning plan generated (8 modules), PRO active, no modules started.

### What to test

Full PRO access. No lock gates anywhere. Learning plan is fully interactive.

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in | Dashboard shows score (6.3). No upgrade prompts visible. |
| 2 | Navigate to `/learning` | Learning plan page loads. Domain cards show "View ›" (no lock badges). |
| 3 | Click a domain card | Domain modal opens. Module rows show "Start" or "Begin" CTAs (no lock). |
| 4 | Click a module CTA | Module player launches. |
| 5 | Navigate to `/learning/coach` | AI Coach interface loads (no PRO gate). |
| 6 | Navigate to `/knowledge` | Knowledge base loads (no PRO gate). |
| 7 | Navigate to `/knowledge/articles` | Articles tab pre-selected. Content visible. |
| 8 | Navigate to `/knowledge/guides` | Guides tab pre-selected. Content visible. |
| 9 | Click any download button | PDF download initiates (no lock). |
| 10 | Navigate to `/billing` | Billing page shows active PRO subscription. |

---

## Scenario S6 — PRO User: Learning In Progress

**Account:** `test.pro.progress@aiqtest.dev`  
**State:** Assessment complete (5.8), 4 of 10 modules completed, PRO active.

### What to test

Progress tracking, module completion states, and the dashboard progress widgets.

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in | Dashboard shows progress: 4/10 modules complete, progress bar at 40%. |
| 2 | Navigate to `/learning` | Learning plan shows completed modules with a checkmark or "Done" state. |
| 3 | Open a domain with completed modules | Completed module rows show a distinct visual state (e.g., green tick, greyed-out). |
| 4 | Open a domain with pending modules | Pending modules show "Start" or "Continue" CTAs. |
| 5 | Navigate to `/learning/coach` | AI Coach loads. Previous session history (if any) visible. |
| 6 | Navigate to `/knowledge` | Knowledge base loads. All content accessible. |

---

## Scenario S7 — PRO User: All Modules Complete

**Account:** `test.pro.complete@aiqtest.dev`  
**State:** Assessment complete (7.8), all 8 modules done, PRO active.

### What to test

The "programme complete" state — reassessment prompt, completion celebration, and continued access.

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in | Dashboard shows 8/8 modules complete. Reassessment or "Retake assessment" prompt visible. |
| 2 | Navigate to `/learning` | All modules shown as completed. A "Programme complete" or "Reassess" banner may appear. |
| 3 | Click "Retake assessment" (if shown) | Navigates to the assessment start page. |
| 4 | Navigate to `/learning/coach` | Coach accessible. |
| 5 | Navigate to `/knowledge` | Knowledge base accessible. |

---

## Scenario S8 — PRO User: AI Expert Level

**Account:** `test.expert@aiqtest.dev`  
**State:** Assessment complete (9.1 overall — highest band), PRO active, 4 modules assigned.

### What to test

The highest score band. Verify the results page renders the "AI Expert" or equivalent badge correctly and that the score display does not overflow or clip at high values.

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in | Dashboard shows score 9.1. Score badge reflects the highest tier. |
| 2 | Navigate to `/assessment/results` | Results page shows 9.1 overall and all domain scores above 8.8. No layout overflow. |
| 3 | Verify PRO upsell card is **not** shown | User is PRO — no upsell card should appear on the results page. |
| 4 | Navigate to `/learning` | Learning plan shows 4 assigned modules. All interactive. |
| 5 | Navigate to `/knowledge` | Knowledge base accessible. |

---

## Upgrade Flow Testing

Use any free account (S1–S4) to test the full upgrade journey.

| Step | Action | Expected result |
|---|---|---|
| 1 | Trigger any PRO gate | Upgrade modal or PRO gate page appears. |
| 2 | Click "Upgrade to AiQ PRO" | Pricing modal opens with smooth slide-up animation. |
| 3 | Toggle between Monthly and Annual | Price updates: £50/mo ↔ £40/mo (billed £480/yr). Annual shows "Save 20%" badge. |
| 4 | Click "Upgrade — £50/month" or annual equivalent | New browser tab opens to Stripe Checkout. |
| 5 | In Stripe, use test card `4242 4242 4242 4242`, any future expiry, any CVC | Payment accepted. |
| 6 | Stripe redirects to `/pro-success` | PRO success page loads. Animation plays (Activating → Confirmed → Welcome card). |
| 7 | Welcome card shows unlocked features | Modules, Coach, Knowledge Base, Downloads, Personalised Plan listed with green ticks. |
| 8 | Click "Start my first module" | Navigates to the recommended module. No lock gate. |
| 9 | Return to any previously locked page | PRO gate is gone. Content is accessible. |

---

## Sidebar Navigation Lock States

Verify the sidebar shows correct lock indicators for free vs PRO users.

| Nav item | Free user | PRO user |
|---|---|---|
| Dashboard | Accessible | Accessible |
| Assessment | Accessible | Accessible |
| Learning Plan | Accessible (view-only) | Accessible (fully interactive) |
| Modules | PRO lock badge in sidebar | No lock |
| Coach | PRO lock badge in sidebar | No lock |
| Knowledge — Articles | PRO lock badge | No lock |
| Knowledge — Guides | PRO lock badge | No lock |
| Knowledge — Frameworks | PRO lock badge | No lock |
| Billing | Accessible | Accessible |

---

## Known Limitations & Notes

**Stripe test mode.** The Stripe integration is in test mode. Use card `4242 4242 4242 4242` for successful payments. The sandbox must be claimed at the Stripe dashboard before the test environment activates (deadline shown in Settings → Payment).

**Webhook propagation delay.** After a successful Stripe checkout, the PRO flag is set via webhook. The `/pro-success` page automatically invalidates the auth session after 1.5 seconds to pick up the new entitlement. If the PRO gate is still visible after returning from checkout, a hard refresh (`Ctrl+Shift+R`) will resolve it.

**Assessment retake window.** Free users can retake the assessment once per calendar month. The interstitial only fires on the **first** completion — subsequent completions go directly to results.

**Learning plan generation.** For S3 (free, no plan), the adaptive plan is generated automatically after assessment completion. The plan may take a few seconds to appear on the learning plan page.
