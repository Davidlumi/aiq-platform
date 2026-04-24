# AiQ v10 — Practical AI Skills Framework

## Design Philosophy

The previous framework (v9.2) tested whether HR professionals could **review AI outputs** — spot errors, assess governance, evaluate appropriateness. That's important, but it's only one dimension.

The v10 framework tests whether HR professionals can **actually work with AI** — use chatbots effectively, design agentic workflows, identify AI opportunities, envision possibilities, and constructively challenge implementation decisions.

The shift is from **"Can you judge AI?"** to **"Can you work with AI?"**

---

## New 6 Capability Domains

### 1. AI Communication (key: `ai_communication`)
**Can you talk to AI effectively?**

Tests: prompting skill, iterative refinement, knowing when to rephrase, understanding what makes a good vs bad prompt, ability to get useful outputs from conversational AI.

Signals:
- `prompt_quality` — Can they construct clear, specific prompts?
- `iteration_skill` — Can they refine and improve AI responses?
- `context_setting` — Do they provide appropriate context and constraints?
- `output_direction` — Can they steer AI toward the format/depth they need?

Example scenario: "You need to draft a restructuring communication. You've typed 'write me an email about restructuring' into your AI assistant and got a generic, unhelpful response. What do you do next?"

### 2. AI Agents & Automation (key: `ai_agents`)
**Can you work with AI agents and automated workflows?**

Tests: understanding of agentic AI, ability to set up and monitor AI workflows, knowing when to intervene, understanding handoff points between AI and human.

Signals:
- `agent_design` — Can they design effective AI agent workflows?
- `monitoring_judgement` — Do they know when to check on and correct agents?
- `handoff_awareness` — Do they understand where human oversight is needed?
- `automation_boundary` — Can they identify what should and shouldn't be automated?

Example scenario: "Your team has set up an AI agent to screen initial job applications and send automated acknowledgement emails. After a week, you notice the agent has been rejecting candidates who mention career breaks. What do you do?"

### 3. AI Opportunity Recognition (key: `ai_opportunity`)
**Can you look at a workflow and see where AI adds value?**

Tests: ability to analyse existing processes, identify bottlenecks and repetitive tasks, map AI capabilities to real problems, distinguish high-value from low-value AI applications.

Signals:
- `process_analysis` — Can they break down a workflow and spot AI opportunities?
- `value_assessment` — Can they distinguish high-impact from low-impact AI use?
- `feasibility_judgement` — Do they understand what AI can and can't do today?
- `prioritisation_skill` — Can they prioritise which processes to automate first?

Example scenario: "Here's your team's current employee onboarding process (8 steps listed). Which steps would benefit most from AI, and why?"

### 4. AI Vision & Possibilities (key: `ai_vision`)
**Can you see what AI could do for your area?**

Tests: understanding of emerging AI capabilities, ability to envision future applications, strategic thinking about AI's impact on HR, awareness of what's possible vs what's hype.

Signals:
- `capability_awareness` — Do they understand current AI capabilities?
- `future_thinking` — Can they anticipate how AI will change their work?
- `strategic_application` — Can they connect AI capabilities to business needs?
- `hype_discrimination` — Can they distinguish real potential from vendor hype?

Example scenario: "A vendor presents an 'AI-powered employee wellbeing platform' that claims to predict burnout 6 months in advance using email metadata. Your CHRO is excited. How do you evaluate this?"

### 5. AI Challenge & Governance (key: `ai_challenge`)
**Can you constructively challenge AI implementation?**

Tests: ability to push back on inappropriate AI use, ask the right questions about AI systems, identify risks that others miss, advocate for responsible implementation.

Signals:
- `critical_questioning` — Can they ask the right questions about AI systems?
- `risk_identification` — Can they spot risks others might miss?
- `constructive_pushback` — Can they challenge without blocking progress?
- `governance_application` — Do they apply appropriate governance frameworks?

Example scenario: "Your organisation is about to deploy an AI tool that monitors employee productivity by tracking keystrokes and screen time. The project sponsor says it's 'just data collection' and has board approval. What questions do you ask?"

### 6. AI Output Evaluation (key: `ai_evaluation`)
**Can you assess whether AI outputs are good enough to use?**

Tests: ability to evaluate AI-generated content for accuracy, bias, and appropriateness; knowing when AI output needs human editing vs when it's ready to use; understanding AI limitations.

Signals:
- `accuracy_assessment` — Can they identify factual errors in AI output?
- `bias_detection` — Can they spot bias in AI-generated content?
- `fitness_judgement` — Can they judge if AI output is fit for purpose?
- `limitation_awareness` — Do they understand what AI gets wrong and why?

Example scenario: "Your AI assistant has drafted a redundancy consultation letter. It looks professional and covers all the legal requirements. But something feels off. Review the letter and identify any concerns."

---

## New Interaction Types

Keep existing types that work well, add new ones that test practical skills:

### New Types
- `prompt_crafting` — Given a task, write/select the best prompt (tests ai_communication)
- `workflow_mapping` — Given a process, identify where AI fits (tests ai_opportunity)
- `agent_monitoring` — Given an AI agent's actions, decide when to intervene (tests ai_agents)
- `vendor_evaluation` — Evaluate an AI product/pitch for substance vs hype (tests ai_vision)
- `implementation_challenge` — Challenge a proposed AI implementation (tests ai_challenge)

### Retained Types (renamed/refocused)
- `output_review` (was scenario_critique) — Review AI output for quality (tests ai_evaluation)
- `situational_judgement` — Real-world decision-making with AI (tests multiple)
- `prioritisation` — Prioritise competing AI-related actions (tests multiple)
- `risk_judgement` — Assess risk in AI scenarios (tests ai_challenge)
- `contradiction_probe` — Consistency check (tests all)
- `confidence_calibration` — Self-awareness check (tests all)

---

## Signal Mapping

| Signal | Capability |
|--------|-----------|
| prompt_quality | ai_communication |
| iteration_skill | ai_communication |
| context_setting | ai_communication |
| output_direction | ai_communication |
| agent_design | ai_agents |
| monitoring_judgement | ai_agents |
| handoff_awareness | ai_agents |
| automation_boundary | ai_agents |
| process_analysis | ai_opportunity |
| value_assessment | ai_opportunity |
| feasibility_judgement | ai_opportunity |
| prioritisation_skill | ai_opportunity |
| capability_awareness | ai_vision |
| future_thinking | ai_vision |
| strategic_application | ai_vision |
| hype_discrimination | ai_vision |
| critical_questioning | ai_challenge |
| risk_identification | ai_challenge |
| constructive_pushback | ai_challenge |
| governance_application | ai_challenge |
| accuracy_assessment | ai_evaluation |
| bias_detection | ai_evaluation |
| fitness_judgement | ai_evaluation |
| limitation_awareness | ai_evaluation |
| calibration_index | (cross-cutting) |
| consistency_index | (cross-cutting) |
| contradiction_index | (cross-cutting) |

---

## Frontend Labels & Colours

| Key | Label | Short | Colour | Icon |
|-----|-------|-------|--------|------|
| ai_communication | AI Communication | COMM | #4477AA (Blue) | MessageSquare |
| ai_agents | AI Agents & Automation | AGNT | #AA3377 (Purple) | Bot |
| ai_opportunity | AI Opportunity Recognition | OPPR | #228833 (Green) | Lightbulb |
| ai_vision | AI Vision & Possibilities | VISN | #66CCEE (Cyan) | Eye |
| ai_challenge | AI Challenge & Governance | CHAL | #EE6677 (Red) | ShieldAlert |
| ai_evaluation | AI Output Evaluation | EVAL | #EE8866 (Orange) | CheckCircle |

---

## Migration Plan

### Backend Changes
1. Update `CapabilityKey` type in `roleArchetypes.ts`
2. Update `SignalKey` type and `SIGNAL_TO_CAPABILITY` in `scoringEngine.ts`
3. Update `INTERACTION_TYPE_INSTRUCTIONS` and few-shot examples in `adaptiveEngine.ts`
4. Add new interaction types
5. Update role archetype capability weights
6. Update content_scenarios with new items
7. Update assessment_items with new items

### Frontend Changes
1. Update capability labels/colours in AssessmentPage, AssessmentResultsPage, LearningPlanPage, DashboardLayout, BackOfficePage, MethodologyPage
2. Update CSS variables for capability colours
3. Update radar chart labels
4. Update ProfilingModal capability descriptions
