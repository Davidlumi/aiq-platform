# HR AIQ — Module Feedback Build Brief

## Context
Two module formats currently allow completion with no feedback:
- **Guided Reflection** (~20 modules): user types into textarea, clicks Next, advances. No engagement check, no coaching response.
- **Practical Exercise** (~30 modules): user produces an artefact (drafted policy, comms plan, decision tree), submits it, advances. Same gap.

Feedback is **coaching, not grading** — no right/wrong, no scores, no gating.

## Design Principles
1. **Coaching, not grading.** No "good response" or "you missed." Use mastery framing.
2. **Optional, not gating.** "Get coach feedback" button alongside "Next Prompt →", not in place of it.
3. **Specific, not generic.** Must reference user's actual strategy initiatives, sector, ambition.
4. **Mastery framing.** Use "build," "develop," "explore," "strengthen." Avoid "score," "rank," "compared to."

## Five Items to Build

### A1 — Schema additions
New table `module_feedback`:
```sql
CREATE TABLE module_feedback (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  module_id VARCHAR(100) NOT NULL,
  module_response_id UUID NOT NULL,  -- FK to existing response storage
  prompt_index INT,                   -- which prompt within the module (0 for single-response modules)
  feedback_text TEXT NOT NULL,
  format_type ENUM('reflection', 'practical_exercise') NOT NULL,
  user_response_snapshot TEXT NOT NULL,  -- snapshot at time of feedback
  model_used VARCHAR(100) NOT NULL,
  library_version VARCHAR(20) NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_module_feedback_user_module ON module_feedback(user_id, module_id);
CREATE INDEX idx_module_feedback_response ON module_feedback(module_response_id);
```
- Check if `module_responses` table already exists; if yes, extend; if no, create both.
- Multiple feedback messages per prompt allowed (each "Get a different perspective" creates a new row).
- Snapshot stored at feedback time (user may edit response after).

### A2 — System prompt for Reflection feedback (four-move pattern)
System prompt template variables:
- USER CONTEXT: name, role, organisation, sector, headcount_band, business_ambition, people_ambition, ai_philosophy
- THEIR STRATEGY: in_flight_initiatives_with_phase_and_status, planning_initiatives_with_phase, risk_appetite, wont_do_list_summary, solution_delivery_confidence/5
- THEIR JOURNEY: position of total in domain at level, completed_module_titles
- THE MODULE THEY'RE IN: title, description, domain
- THE PROMPT THEY ANSWERED: prompt_text
- THE HELP TEXT THAT ACCOMPANIED IT: prompt_help_text
- THEIR RESPONSE: user_response

Four-move structure:
1. ACKNOWLEDGE (1 sentence): Mirror back substance. Use specific language they used.
2. CONTEXTUALIZE (1-2 sentences): Connect to their specific situation. Reference at least one in-flight initiative by name, their sector, or their AI philosophy.
3. SURFACE (1-2 sentences): Add one angle, blind spot, or consideration they didn't mention. Specific to their context.
4. PROBE (1 sentence): Pose one further question. Frame as optional. End with "Continue when you're ready" or "Worth sitting with as you move on."

CRITICAL CONSTRAINTS:
- Do NOT grade, evaluate, or judge. No "good response", "well thought out", "you missed", "you should have."
- Do NOT surface capability scores, comparative metrics, or rankings.
- Do NOT use generic phrases ("change is hard", "AI is challenging", "this is an important topic").
- Do USE mastery framing — focus on capability they're building, not deficits.
- Do USE their name once, naturally.
- Keep total length to 4-6 sentences.

EDGE CASES:
- Empty/near-empty response (under 20 chars): gently invite to share more. Don't use four-move structure.
- Gibberish/not engaging: acknowledge gently, invite re-engagement without lecturing.
- Brief response (50-150 chars): apply four-move structure but keep to 3-4 sentences.

### A3 — UI affordance and inline rendering (Reflection modules)
**Target state:**
```
[Help text]
[Textarea: Reflect here - there are no right or wrong answers...]
[Get coach feedback]    [Next Prompt →]
```
- "Get coach feedback" = secondary styling (outline, not filled green)
- "Next Prompt →" = keeps current primary green styling

**Interaction flow:**
1. User types response
2. Two buttons: feedback (optional) or advance (primary)
3. If user clicks "Get coach feedback":
   - Button disabled, loading state: "Coach is reading your reflection..." (~3-10 seconds)
   - On response: feedback renders in panel below textarea, above buttons
   - Buttons re-enabled. "Next Prompt" still available. New affordance: "Get a different perspective"
4. "Next Prompt →" (with or without feedback): advances normally

**Feedback panel styling:**
- Subtle background fill (no heavy border per Change 7a). Sentence-case label (per Change 6a). No green accent.
- "Get a different perspective" = small text link below feedback. Generates new feedback with same context but slight prompt variation (instruct model to take a different angle). Multiple feedback messages stack vertically with separators.

**Persistence:**
- Feedback stored in `module_feedback` table per A1
- On user revisiting the prompt: previous feedback shown collapsed with "View previous coach feedback (2)" expandable
- Editing the response after feedback: keeps prior feedback visible but flags it as "Based on your earlier response"

**Mobile:** buttons stack vertically (feedback above advance) on viewports under 600px.

### B1 — System prompt for Practical Exercise feedback
Same as A2 but with different four-move structure:
1. ACKNOWLEDGE WHAT'S STRONG (1-2 sentences): Name TWO specific things this artefact does well. Quote a phrase or describe a structural choice.
2. CONTEXTUALIZE (1 sentence): Note how this artefact applies to their specific situation. Reference at least one in-flight initiative or their sector context.
3. STRENGTHEN (1-2 sentences): Identify ONE specific way to make this stronger. Be actionable — point to a specific change or addition.
4. INVITE ITERATION (1 sentence): Frame revision as optional. Example: "When you're ready, you could revise based on this, or continue."

Additional constraints for B1:
- Do show evidence of having read the actual artefact (quote a phrase or reference a specific structural choice).
- Do NOT give generic best-practice advice that could apply to any artefact.
- Do NOT prescribe a complete rewrite. Identify specific improvements.

### B2 — Apply UI pattern to Practical Exercise modules
Same UI affordance as A3 applied to Practical Exercise format.
- Practical Exercise modules have a single artefact submission rather than 6 sequential prompts.
- Feedback fires once per module on the artefact, not per prompt.

## End-state acceptance
When all five items complete, Sarah's experience on "Reflection: My Change Leadership Style":
1. Opens module
2. Reads prompt about AI-specific resistance
3. Types her response
4. Sees two buttons: "Get coach feedback" and "Next Prompt →"
5. Clicks "Get coach feedback"
6. Sees loading state for ~5 seconds
7. Sees inline feedback panel matching the four-move pattern, referencing her CV Screening initiative by name and her retail context
8. Has the option to "Get a different perspective"
9. Clicks "Next Prompt →" to advance
10. On returning to Prompt 1 later, sees her response and the prior feedback persisted

## Operating cost projection
- Average Reflection module: 5-6 prompts, 50% feedback usage rate
- Cost per module: £0.05-0.10
- 1,000 module completions/day: £50-100/day, £1,500-3,000/month
