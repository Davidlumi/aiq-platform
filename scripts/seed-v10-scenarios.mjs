/**
 * AiQ v10 Scenario Seed Script
 *
 * Seeds 90 assessment scenarios across:
 * - 6 capability domains
 * - 15 interaction types
 * - 3 difficulty levels
 * - Mixed risk levels
 *
 * Each scenario has 4 options with signal deltas, outcome classes, and rationale.
 * Content is written in plain English for HR professionals.
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import { randomUUID } from "crypto";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── v10 Capability Domains ──────────────────────────────────────────────────
const DOMAINS = {
  ai_interaction: "AI Interaction",
  ai_output_evaluation: "AI Output Evaluation",
  ai_workflow_design: "AI Workflow Design",
  workforce_ai_readiness: "Workforce AI Readiness",
  ai_ethics_trust: "AI Ethics & Employee Trust",
  ai_change_leadership: "AI Change Leadership",
};

// ── v10 Interaction Types ───────────────────────────────────────────────────
// 4 preserved + 11 new + 1 cross-cutting = 16 total (contradiction_probe is injected, not seeded)
const INTERACTION_TYPES = [
  "scenario_critique",
  "error_detection",
  "risk_judgement",
  "confidence_calibration",
  "prompt_diagnosis",
  "prompt_construction",
  "process_redesign",
  "handoff_decision",
  "capability_diagnosis",
  "intervention_design",
  "leader_advisory",
  "ethical_pressure_test",
  "stakeholder_impact",
  "resistance_response",
  "legitimate_concern",
];

// ── Scenario Data ───────────────────────────────────────────────────────────
// 90 scenarios: 15 per domain (covering all interaction types at least once)

const scenarios = [
  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN 1: AI INTERACTION (Foundation)
  // ═══════════════════════════════════════════════════════════════════════════

  // INT-01: Prompt Diagnosis
  {
    id: "INT-01", domain: "ai_interaction", capabilityKey: "ai_interaction",
    interactionType: "prompt_diagnosis", difficulty: 1, riskLevel: "Low",
    title: "Diagnosing a vague recruitment prompt",
    scenario: "A colleague shows you the prompt they've been using with the company's AI assistant: 'Write me a job description for a new role.' They're frustrated because the output is too generic and doesn't match what they need. They ask you what's wrong with their prompt.",
    constraint: "You have 2 minutes to advise them before their next meeting.",
    question: "What is the primary problem with this prompt, and what would you advise?",
    options: [
      { label: "The prompt lacks context about the role level, department, key responsibilities, and required experience. I'd suggest adding: 'Write a job description for a Senior HR Business Partner in our manufacturing division, reporting to the HR Director, with 5+ years experience in employee relations and change management.'", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { prompt_construction_quality: 1.2, prompt_iteration_quality: 0.8, tool_fluency_index: 0.5 }, rationale: "Correctly identifies the lack of specificity and provides a concrete improved prompt with role, level, department, reporting line, and key requirements." },
      { label: "The prompt is fine — the AI just isn't very good at job descriptions. I'd suggest trying a different AI tool instead.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { prompt_construction_quality: -1.0, tool_fluency_index: -0.5, blind_acceptance_risk: 0.3 }, rationale: "Blames the tool rather than recognising the prompt quality issue. Shows poor understanding of how AI responds to input quality." },
      { label: "I'd tell them to add 'make it better' to the end of the prompt and regenerate.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { prompt_construction_quality: -0.5, prompt_iteration_quality: -0.3 }, rationale: "Shows basic awareness that iteration is possible but the approach is too vague to produce meaningful improvement." },
      { label: "The prompt needs more detail. I'd suggest adding the job title and salary range.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { prompt_construction_quality: 0.4, prompt_iteration_quality: 0.3 }, rationale: "Identifies the right direction but the suggested additions are incomplete — missing department, responsibilities, experience requirements, and reporting structure." },
    ],
  },

  // INT-02: Prompt Construction
  {
    id: "INT-02", domain: "ai_interaction", capabilityKey: "ai_interaction",
    interactionType: "prompt_construction", difficulty: 2, riskLevel: "Medium",
    title: "Constructing a prompt for absence pattern analysis",
    scenario: "Your HR Director has asked you to use the company's AI analytics tool to identify patterns in sickness absence data across the organisation. You have access to 12 months of absence records for 2,000 employees across 8 departments. The AI tool accepts natural language queries against the dataset.",
    constraint: "The analysis needs to be ready for a board meeting tomorrow. You need to get useful results on the first attempt.",
    question: "Write the prompt you would use to query the AI analytics tool.",
    options: [
      { label: "Analyse the 12-month sickness absence data and identify: (1) departments with absence rates more than 1.5 standard deviations above the company average, (2) any seasonal patterns by month, (3) whether short-term (<5 days) or long-term (>5 days) absence is driving the variance, and (4) any correlation between absence spikes and known organisational events. Present results as a summary table with department, rate, trend direction, and key driver.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { prompt_construction_quality: 1.3, output_direction_skill: 1.0, tool_fluency_index: 0.7 }, rationale: "Structured prompt with specific metrics, thresholds, timeframes, and output format. Demonstrates understanding of what makes AI analysis actionable." },
      { label: "Show me the absence data.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { prompt_construction_quality: -1.2, output_direction_skill: -0.8 }, rationale: "Far too vague — would return raw data rather than analysis. Shows no understanding of how to direct AI towards useful output." },
      { label: "Which departments have the highest absence rates? Show me a chart.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { prompt_construction_quality: 0.3, output_direction_skill: 0.2 }, rationale: "Asks a reasonable question but lacks specificity about timeframe, comparison basis, and what 'highest' means. The chart request shows some output awareness." },
      { label: "Run a full statistical analysis on all absence data and give me everything you find.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { prompt_construction_quality: -0.4, output_direction_skill: -0.5, tool_fluency_index: -0.3 }, rationale: "Overly broad request that would produce an overwhelming, unfocused output. Shows misunderstanding of how to get targeted, useful AI analysis." },
    ],
  },

  // INT-03: Scenario Critique (preserved type)
  {
    id: "INT-03", domain: "ai_interaction", capabilityKey: "ai_interaction",
    interactionType: "scenario_critique", difficulty: 2, riskLevel: "Medium",
    title: "Critiquing an AI chatbot conversation",
    scenario: "Your organisation has deployed an AI chatbot for employee HR queries. A team leader shares a screenshot of a conversation where an employee asked 'Am I entitled to compassionate leave?' and the chatbot responded: 'Compassionate leave is typically 3-5 days for the death of an immediate family member. Please speak to your line manager to arrange this.' The team leader thinks this is working well.",
    constraint: "The chatbot has been live for 2 weeks and this is the first review.",
    question: "What issues, if any, do you see with this chatbot interaction?",
    options: [
      { label: "Several issues: (1) The response gives a generic answer without checking the company's actual policy, which may differ. (2) It assumes the reason is bereavement when the employee didn't specify — compassionate leave can cover other circumstances. (3) It doesn't mention the employee's specific entitlement based on their contract or length of service. (4) Directing to the line manager is correct but it should also offer to connect them with HR for sensitive situations.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { output_evaluation_quality: 1.0, prompt_iteration_quality: 0.6, error_detection_accuracy: 0.8 }, rationale: "Identifies multiple genuine issues including policy accuracy, assumption-making, personalisation, and escalation pathways." },
      { label: "It looks fine to me. The chatbot gave a reasonable answer and directed them to their manager.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { output_evaluation_quality: -1.0, blind_acceptance_risk: 0.8, error_detection_accuracy: -0.7 }, rationale: "Fails to identify any issues with a response that contains several problems. Shows blind acceptance of AI output." },
      { label: "The main issue is that it should have asked the employee why they need compassionate leave before answering.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { output_evaluation_quality: 0.4, error_detection_accuracy: 0.3 }, rationale: "Identifies one valid issue (the assumption) but misses the policy accuracy and personalisation problems." },
      { label: "The tone is too formal. It should be more empathetic given the sensitive nature of compassionate leave.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { output_evaluation_quality: -0.2, error_detection_accuracy: -0.3 }, rationale: "Focuses on tone rather than the substantive accuracy and completeness issues. While empathy matters, the factual problems are more critical." },
    ],
  },

  // INT-04: Error Detection (preserved type)
  {
    id: "INT-04", domain: "ai_interaction", capabilityKey: "ai_interaction",
    interactionType: "error_detection", difficulty: 3, riskLevel: "High",
    title: "Detecting errors in AI-generated interview questions",
    scenario: "You asked the AI to generate structured interview questions for a Senior Finance Manager role. The AI produced: '1. Tell me about a time you managed a team through a difficult period. 2. What's your greatest weakness? 3. Where do you see yourself in 5 years? 4. How would you handle discovering a financial irregularity? 5. Are you planning to have children in the next few years?'",
    constraint: "These questions are scheduled to be used in interviews starting tomorrow morning.",
    question: "Which questions are problematic and why?",
    options: [
      { label: "Question 5 is illegal — it's direct pregnancy/family planning discrimination under the Equality Act 2010. Questions 2 and 3 are also poor: 'greatest weakness' is a cliché that doesn't predict job performance, and 'where do you see yourself' is too generic for a senior role. Questions 1 and 4 are the only ones suitable — they're competency-based and relevant to the role. The AI has generated a mix of illegal, outdated, and valid questions, which is dangerous if used unchecked.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { error_detection_accuracy: 1.5, output_evaluation_quality: 1.0, blind_acceptance_risk: -0.5 }, rationale: "Correctly identifies the illegal question, the poor-quality questions, and the good questions. Recognises the risk of using AI-generated interview content without review." },
      { label: "They all look like standard interview questions to me. I'd use them as they are.", value: "B", outcomeClass: "critical_failure", isOptimal: false, signalDeltas: { error_detection_accuracy: -1.5, blind_acceptance_risk: 1.5, hallucination_acceptance_risk: 0.5 }, rationale: "Fails to identify an illegal question. Using question 5 in an interview would expose the organisation to a discrimination claim. This is a critical failure in AI output evaluation." },
      { label: "Question 5 shouldn't be asked — it's about personal life. The rest are fine.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { error_detection_accuracy: 0.5, output_evaluation_quality: 0.3 }, rationale: "Identifies the most serious issue but doesn't articulate why it's illegal (discrimination law) and misses the quality issues with questions 2 and 3." },
      { label: "I'd remove questions 2, 3, and 5 because they're not competency-based. But I'm not sure about the legal issues.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { error_detection_accuracy: 0.4, output_evaluation_quality: 0.5, blind_acceptance_risk: -0.2 }, rationale: "Good instinct to remove the weaker questions but the uncertainty about legal issues is concerning for a senior HR role." },
    ],
  },

  // INT-05: Confidence Calibration (preserved type)
  {
    id: "INT-05", domain: "ai_interaction", capabilityKey: "ai_interaction",
    interactionType: "confidence_calibration", difficulty: 1, riskLevel: "Low",
    title: "Calibrating confidence in AI-assisted policy drafting",
    scenario: "You used an AI tool to draft a new flexible working policy. The AI produced a comprehensive 3-page document covering eligibility, application process, manager responsibilities, and appeal procedures. You've read through it and it looks thorough and well-structured.",
    constraint: "The policy needs to go to the leadership team for approval next week.",
    question: "How confident should you be in using this AI-generated policy as-is?",
    options: [
      { label: "Low confidence. While the structure looks good, I need to verify: (1) it aligns with our existing employment contracts, (2) the eligibility criteria match our workforce demographics, (3) the appeal process is consistent with our grievance procedure, (4) it reflects current flexible working legislation (Employment Relations Act), and (5) it's been reviewed by someone with employment law expertise. AI can produce plausible-looking policies that contain subtle legal errors.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { output_evaluation_quality: 1.0, fitness_for_purpose_judgement: 0.8, blind_acceptance_risk: -0.5 }, rationale: "Correctly identifies that a well-structured document can still contain errors. Lists specific verification steps that demonstrate understanding of policy requirements." },
      { label: "High confidence. The AI clearly knows employment law and the policy covers all the right areas. I'd send it to the leadership team as-is.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { output_evaluation_quality: -0.8, blind_acceptance_risk: 1.0, fitness_for_purpose_judgement: -0.7 }, rationale: "Dangerous overconfidence. AI can generate plausible but legally incorrect policies. Sending unreviewed AI-generated policy to leadership creates significant risk." },
      { label: "Medium confidence. I'd do a quick spell-check and formatting review before sending it on.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { output_evaluation_quality: -0.3, blind_acceptance_risk: 0.4, fitness_for_purpose_judgement: -0.4 }, rationale: "Focuses on superficial checks (spelling, formatting) rather than substantive legal and organisational alignment. Shows insufficient understanding of AI output risks." },
      { label: "I'd ask the AI to double-check its own work by prompting it to review the policy for errors.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { output_evaluation_quality: -0.2, tool_fluency_index: -0.3, blind_acceptance_risk: 0.3 }, rationale: "AI self-review doesn't reliably catch its own errors. This approach shows over-reliance on the tool rather than applying human expertise." },
    ],
  },

  // INT-06 to INT-15: More AI Interaction scenarios
  {
    id: "INT-06", domain: "ai_interaction", capabilityKey: "ai_interaction",
    interactionType: "prompt_diagnosis", difficulty: 3, riskLevel: "High",
    title: "Diagnosing a failed AI grievance summary",
    scenario: "An HR advisor used the AI to summarise a complex grievance case involving allegations of bullying by a senior manager. The prompt was: 'Summarise this grievance.' The AI produced a 2-paragraph summary that omitted key witness statements, downplayed the severity of the allegations, and incorrectly stated the grievance was about 'management style differences' rather than bullying.",
    constraint: "This summary was nearly sent to the accused manager as part of the investigation pack.",
    question: "What went wrong with the prompt, and what are the consequences of using this output?",
    options: [
      { label: "The prompt was dangerously vague for a sensitive case. 'Summarise this grievance' gives the AI no guidance on: (1) what elements to include (allegations, evidence, witnesses, timeline), (2) the required level of detail, (3) the audience and purpose, or (4) the need to preserve the complainant's exact language. The consequence of using this output could be: misrepresenting the case to the accused, undermining the investigation's fairness, and potential constructive dismissal claims if the grievance isn't properly investigated.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { prompt_construction_quality: 1.3, output_evaluation_quality: 0.8, error_detection_accuracy: 0.7 }, rationale: "Identifies both the prompt failure and the real-world consequences. Shows understanding of why AI output quality matters in high-stakes HR contexts." },
      { label: "The AI isn't suitable for grievance work. We should ban it from being used on sensitive cases.", value: "B", outcomeClass: "weak", isOptimal: false, signalDeltas: { prompt_construction_quality: -0.3, tool_fluency_index: -0.5 }, rationale: "Reactive blanket ban rather than addressing the root cause (poor prompting). The tool could be useful with proper prompting and oversight." },
      { label: "The prompt needed more detail. Something like 'summarise the key points of this grievance' would have been better.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { prompt_construction_quality: -0.2, output_evaluation_quality: -0.3 }, rationale: "Marginal improvement that still lacks the specificity needed for a sensitive case. Doesn't address the consequences of the poor output." },
      { label: "The prompt should have specified: 'Summarise this grievance for the investigation pack, including: all specific allegations with dates, witness names and their statements, the complainant's desired outcome, and the relevant policy references. Use the complainant's own words for allegations. Flag any areas where the evidence is contradictory or incomplete.'", value: "D", outcomeClass: "strong", isOptimal: false, signalDeltas: { prompt_construction_quality: 1.1, output_direction_skill: 0.9, tool_fluency_index: 0.6 }, rationale: "Excellent improved prompt that addresses all the gaps. Slightly less complete than option A because it doesn't discuss the consequences of the original failure." },
    ],
  },

  {
    id: "INT-07", domain: "ai_interaction", capabilityKey: "ai_interaction",
    interactionType: "prompt_construction", difficulty: 1, riskLevel: "Low",
    title: "Writing a prompt for onboarding email sequence",
    scenario: "You need to create a series of 5 welcome emails for new starters, sent on days 1, 3, 7, 14, and 30. Each email should cover different aspects of settling in. You're going to use the AI writing assistant.",
    constraint: "The emails need to feel warm and personal, not corporate.",
    question: "What prompt would you write?",
    options: [
      { label: "Write 5 onboarding emails for new employees, sent on days 1, 3, 7, 14, and 30. Day 1: welcome and first-day logistics. Day 3: checking in on their experience so far. Day 7: introducing key contacts and resources. Day 14: asking about any challenges or questions. Day 30: celebrating their first month and setting up a development conversation. Tone: warm, conversational, like a supportive colleague — not corporate HR-speak. Each email should be 150-200 words, use the new starter's first name, and end with a specific action or question.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { prompt_construction_quality: 1.2, output_direction_skill: 0.9, tool_fluency_index: 0.5 }, rationale: "Clear structure, specific content for each email, tone guidance, length constraints, and personalisation instructions. This prompt will produce usable output." },
      { label: "Write some onboarding emails.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { prompt_construction_quality: -1.0, output_direction_skill: -0.8 }, rationale: "Far too vague. No structure, timing, tone, or content guidance." },
      { label: "Write 5 emails for new starters covering their first month. Make them friendly.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { prompt_construction_quality: 0.3, output_direction_skill: 0.2 }, rationale: "Basic structure and tone direction but lacks specificity about timing, content per email, and format." },
      { label: "Create an onboarding email campaign. Include: welcome message, benefits overview, IT setup guide, team introduction, and performance expectations. Professional tone.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { prompt_construction_quality: 0.4, output_direction_skill: 0.3 }, rationale: "Good content ideas but the topics are more administrative than relationship-building, and 'professional tone' contradicts the warm/personal requirement." },
    ],
  },

  {
    id: "INT-08", domain: "ai_interaction", capabilityKey: "ai_interaction",
    interactionType: "risk_judgement", difficulty: 2, riskLevel: "High",
    title: "Judging risk of AI-generated redundancy communications",
    scenario: "Your organisation is making 50 roles redundant. A senior HR manager has used AI to draft the at-risk notification letters, the consultation meeting scripts, and the FAQ document for affected employees. They want to send these out on Monday.",
    constraint: "The redundancy consultation period starts Monday. Legal review is booked for Friday but the HR manager wants to 'get ahead'.",
    question: "What is your risk assessment of using these AI-generated documents?",
    options: [
      { label: "This is high risk and should not proceed without legal review. Redundancy communications have specific legal requirements: (1) the at-risk letters must contain prescribed information under TULRCA, (2) consultation scripts must demonstrate genuine consultation not pre-determined outcomes, (3) the FAQ must accurately reflect selection criteria and appeal rights. AI-generated content could contain subtle errors that expose the organisation to unfair dismissal claims. The Friday legal review must happen before Monday's communications. If the timeline is tight, I'd escalate to the HR Director to either delay the start or expedite the legal review.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { output_evaluation_quality: 1.0, fitness_for_purpose_judgement: 1.2, error_detection_accuracy: 0.6 }, rationale: "Correctly identifies the high-risk nature, specific legal requirements, and the need for expert review before use. Proposes practical alternatives." },
      { label: "The AI is probably fine for standard letters. I'd let them send the at-risk letters but hold back the consultation scripts for legal review.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { fitness_for_purpose_judgement: -0.8, blind_acceptance_risk: 0.7, error_detection_accuracy: -0.5 }, rationale: "Underestimates the risk. At-risk letters have the most stringent legal requirements and are the highest-risk documents in a redundancy process." },
      { label: "I'd do a quick read-through myself and if it looks OK, let them proceed. We can always correct any issues later.", value: "C", outcomeClass: "failure", isOptimal: false, signalDeltas: { fitness_for_purpose_judgement: -1.0, blind_acceptance_risk: 0.8 }, rationale: "Dangerous approach. Errors in redundancy communications can't easily be 'corrected later' — they can invalidate the entire consultation process." },
      { label: "I'd recommend waiting for the legal review but suggest the HR manager uses the AI drafts as a starting point, not the final version.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { fitness_for_purpose_judgement: 0.5, output_evaluation_quality: 0.3 }, rationale: "Right instinct to wait for legal review, but doesn't articulate the specific risks or provide a practical solution for the timeline pressure." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN 2: AI OUTPUT EVALUATION (Foundation)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "OE-01", domain: "ai_output_evaluation", capabilityKey: "ai_output_evaluation",
    interactionType: "error_detection", difficulty: 2, riskLevel: "High",
    title: "Detecting bias in AI-screened CVs",
    scenario: "Your AI recruitment tool screened 200 applications for a Marketing Manager role. You notice the shortlist of 20 candidates is 95% male, despite the applicant pool being roughly 50/50. When you check the AI's reasoning, it says it prioritised candidates with 'leadership experience in competitive environments' and 'track record of aggressive growth strategies'.",
    constraint: "Interviews are scheduled to start in 3 days.",
    question: "What errors or biases can you identify in this AI output?",
    options: [
      { label: "The AI is exhibiting gender bias through proxy criteria. 'Competitive environments' and 'aggressive growth strategies' are gendered language that correlates with male-dominated industries and leadership styles. The AI has likely learned this bias from historical hiring data where men were disproportionately hired for leadership roles. I would: (1) halt the current shortlist, (2) audit the AI's training data and selection criteria, (3) re-screen using gender-neutral competency criteria, (4) report this as a potential Equality Act issue, and (5) review whether previous hiring rounds were similarly affected.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { error_detection_accuracy: 1.3, bias_detection_skill: 1.5, output_evaluation_quality: 1.0, blind_acceptance_risk: -0.5 }, rationale: "Correctly identifies proxy discrimination through gendered language, understands the training data issue, and proposes comprehensive remediation." },
      { label: "Maybe more men applied for this type of role. The AI is just reflecting the applicant pool.", value: "B", outcomeClass: "critical_failure", isOptimal: false, signalDeltas: { bias_detection_skill: -1.5, blind_acceptance_risk: 1.2, error_detection_accuracy: -1.0 }, rationale: "Fails to recognise obvious gender bias. The scenario states the pool was 50/50 but the shortlist is 95% male — this is a clear red flag." },
      { label: "The shortlist seems skewed. I'd add some female candidates manually to balance it out.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { bias_detection_skill: 0.2, error_detection_accuracy: -0.3, output_evaluation_quality: -0.4 }, rationale: "Recognises the imbalance but the solution (manual addition) doesn't address the root cause and could itself be discriminatory if not based on merit." },
      { label: "I'd flag this to the hiring manager and suggest we review the AI's criteria. The language about 'aggressive' strategies might be filtering out good candidates.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { bias_detection_skill: 0.6, error_detection_accuracy: 0.4, output_evaluation_quality: 0.3 }, rationale: "Identifies the language issue but doesn't fully articulate the bias mechanism or propose comprehensive remediation." },
    ],
  },

  {
    id: "OE-02", domain: "ai_output_evaluation", capabilityKey: "ai_output_evaluation",
    interactionType: "scenario_critique", difficulty: 2, riskLevel: "Medium",
    title: "Critiquing an AI performance review summary",
    scenario: "A manager used AI to summarise an employee's performance over the past year based on their monthly 1-to-1 notes. The AI summary states: 'Sarah has consistently met expectations and shows potential for promotion. Her communication skills are excellent and she works well in a team. Recommended: promote to Senior Analyst.' However, you know from the actual notes that Sarah had two formal performance improvement conversations in Q3.",
    constraint: "This summary is about to be used in the annual calibration meeting.",
    question: "What is your assessment of this AI-generated summary?",
    options: [
      { label: "This is a dangerous hallucination. The AI has generated an overly positive summary that contradicts the actual record. The performance improvement conversations in Q3 are material facts that should feature prominently in any fair summary. Using this in calibration would: (1) give Sarah's manager incorrect information, (2) potentially lead to an unmerited promotion, (3) undermine the integrity of the calibration process, and (4) create a paper trail that contradicts the actual performance record. I would flag this immediately, pull the original notes, and either write the summary manually or re-prompt the AI with explicit instructions to include all performance conversations including improvement discussions.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { output_evaluation_quality: 1.2, hallucination_acceptance_risk: -0.8, error_detection_accuracy: 1.0, fitness_for_purpose_judgement: 0.8 }, rationale: "Correctly identifies the hallucination, articulates the real-world consequences, and proposes practical remediation." },
      { label: "The AI summary looks professional and well-written. I'd use it as-is for the calibration meeting.", value: "B", outcomeClass: "critical_failure", isOptimal: false, signalDeltas: { hallucination_acceptance_risk: 1.5, blind_acceptance_risk: 1.2, output_evaluation_quality: -1.2 }, rationale: "Accepts a factually incorrect AI output that contradicts known information. This would corrupt the calibration process." },
      { label: "I'd add a note about the Q3 conversations to the summary but keep the rest of the AI's assessment.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { output_evaluation_quality: 0.3, hallucination_acceptance_risk: -0.2, error_detection_accuracy: 0.3 }, rationale: "Addresses the specific omission but doesn't question whether the overall positive tone is also inaccurate given the performance issues." },
      { label: "AI shouldn't be used for performance summaries. I'd tell the manager to write it themselves.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { output_evaluation_quality: -0.2, tool_fluency_index: -0.4 }, rationale: "Reactive response that doesn't address the immediate problem (the incorrect summary about to be used) and dismisses the tool entirely rather than addressing the usage issue." },
    ],
  },

  {
    id: "OE-03", domain: "ai_output_evaluation", capabilityKey: "ai_output_evaluation",
    interactionType: "error_detection", difficulty: 3, riskLevel: "Critical",
    title: "Detecting hallucination in AI legal research",
    scenario: "You asked the AI to research whether your organisation's proposed 'AI monitoring of employee emails' policy is legally compliant. The AI responded with a detailed analysis citing 'Section 7.3 of the UK Data Protection (Employee Monitoring) Act 2023' and 'the landmark case of Morrison v TechCorp [2024] UKEAT/0234/24' as supporting your policy's legality.",
    constraint: "The policy is scheduled for board approval next week.",
    question: "What is your assessment of this AI legal research?",
    options: [
      { label: "This is almost certainly a hallucination. There is no 'UK Data Protection (Employee Monitoring) Act 2023' — employee monitoring is governed by GDPR/UK GDPR, the Data Protection Act 2018, and ICO guidance. The case citation also looks fabricated — I'd need to verify it on BAILII or a legal database, but AI frequently invents case law. I would: (1) not rely on any of this research, (2) commission actual legal advice from an employment lawyer, (3) flag to the board that the policy needs proper legal review before approval, and (4) raise awareness that AI cannot be trusted for legal research without verification.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { hallucination_acceptance_risk: -1.0, error_detection_accuracy: 1.5, output_evaluation_quality: 1.2, fitness_for_purpose_judgement: 0.8 }, rationale: "Correctly identifies the hallucinated legislation and case law, understands the pattern of AI legal hallucination, and proposes appropriate remediation." },
      { label: "The AI has found specific legislation and case law that supports our position. This is great — we can proceed with confidence.", value: "B", outcomeClass: "critical_failure", isOptimal: false, signalDeltas: { hallucination_acceptance_risk: 1.8, blind_acceptance_risk: 1.5, error_detection_accuracy: -1.5 }, rationale: "Accepts fabricated legal citations without verification. This could lead to implementing an illegal monitoring policy." },
      { label: "I'd double-check the case citation but the legislation reference sounds right.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { hallucination_acceptance_risk: 0.3, error_detection_accuracy: 0.2 }, rationale: "Partially sceptical but accepts the fabricated legislation. Shows insufficient knowledge of the actual legal framework." },
      { label: "I'm not sure about the specific references but the analysis seems reasonable. I'd ask a lawyer to confirm.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { hallucination_acceptance_risk: -0.3, fitness_for_purpose_judgement: 0.4, error_detection_accuracy: 0.3 }, rationale: "Good instinct to seek legal confirmation but doesn't identify the hallucination pattern or demonstrate knowledge of the actual legal framework." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN 3: AI WORKFLOW DESIGN (Operational)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "WD-01", domain: "ai_workflow_design", capabilityKey: "ai_workflow_design",
    interactionType: "process_redesign", difficulty: 2, riskLevel: "Medium",
    title: "Redesigning the employee onboarding workflow with AI",
    scenario: "Your current onboarding process has 12 steps: (1) offer letter generation, (2) reference checks, (3) right-to-work verification, (4) contract preparation, (5) IT equipment ordering, (6) system access provisioning, (7) induction scheduling, (8) buddy assignment, (9) first-day welcome, (10) week-1 check-in, (11) probation objectives setting, (12) 30-day review. Average time from offer to day-1 ready: 18 days. HR team spends ~6 hours per new starter.",
    constraint: "The CEO wants onboarding time halved without reducing quality. Budget for AI tools: £15k/year.",
    question: "Which steps would you automate with AI, which would you keep human, and why?",
    options: [
      { label: "Automate with AI: (1) offer letter generation — template-based, low risk; (4) contract preparation — template-based with variable insertion; (5) IT equipment ordering — trigger-based workflow; (6) system access provisioning — rule-based automation; (7) induction scheduling — calendar matching. Keep human: (2) reference checks — judgement needed on responses; (3) right-to-work — legal verification requirement; (8) buddy assignment — relationship matching needs human insight; (9) first-day welcome — personal connection matters; (10-12) all check-ins and reviews — relationship and judgement dependent. This automates 5 of 12 steps, saving approximately 3-4 hours per starter and reducing time-to-ready to ~10 days.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { workflow_redesign_quality: 1.3, human_oversight_preservation: 1.0, handoff_design_quality: 0.8, automation_expansion_risk: -0.5 }, rationale: "Clear distinction between automatable (template/rule-based) and human-essential (judgement/relationship) steps. Realistic time savings estimate." },
      { label: "Automate everything with AI. Modern AI can handle all 12 steps including reference checks and buddy assignment. This would reduce HR time to near zero.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { workflow_redesign_quality: -0.8, human_oversight_preservation: -1.2, automation_expansion_risk: 1.0 }, rationale: "Over-automation that removes human judgement from steps that require it. Reference checks and relationship-building cannot be fully automated." },
      { label: "I'd only automate the offer letter and contract generation. Everything else needs a human touch.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { workflow_redesign_quality: -0.3, automation_expansion_risk: -0.3 }, rationale: "Too conservative — misses obvious automation opportunities like IT ordering and system provisioning that are purely administrative." },
      { label: "I'd implement an AI chatbot to guide new starters through the process and automate the document generation steps.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { workflow_redesign_quality: 0.4, handoff_design_quality: 0.3 }, rationale: "Reasonable approach but doesn't specifically identify which steps to automate vs keep human, and a chatbot alone won't halve the timeline." },
    ],
  },

  {
    id: "WD-02", domain: "ai_workflow_design", capabilityKey: "ai_workflow_design",
    interactionType: "handoff_decision", difficulty: 3, riskLevel: "High",
    title: "Designing the AI-to-human handoff in employee relations",
    scenario: "Your organisation is implementing an AI triage system for employee relations cases. When an employee raises a concern, the AI categorises it (grievance, bullying, discrimination, whistleblowing, etc.), assesses urgency, and suggests next steps. You need to decide where the AI stops and the human ER advisor takes over.",
    constraint: "You handle ~200 ER cases per year. 3 ER advisors. Average resolution time: 45 days.",
    question: "Where should the AI-to-human handoff occur?",
    options: [
      { label: "The AI should handle: initial categorisation, urgency scoring based on keywords and context, routing to the correct ER advisor based on specialism and capacity, and generating a structured case summary for the advisor. The handoff to human must occur BEFORE: any contact with the complainant or respondent, any assessment of case merit, any recommendation on outcome, and any communication that could be construed as the organisation's response. Critical safeguard: all whistleblowing and discrimination cases must be immediately flagged to a senior ER advisor regardless of AI urgency score, because mishandling these has legal consequences (protected disclosure, Equality Act).", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { handoff_design_quality: 1.4, human_oversight_preservation: 1.2, workflow_redesign_quality: 0.8, automation_expansion_risk: -0.5 }, rationale: "Clear handoff boundary with specific criteria. Correctly identifies that AI should handle administrative triage but not substantive case assessment. Critical safeguard for legally sensitive cases." },
      { label: "The AI should handle the full triage including an initial assessment of whether the complaint has merit, to save the ER advisors time on cases that don't warrant investigation.", value: "B", outcomeClass: "critical_failure", isOptimal: false, signalDeltas: { handoff_design_quality: -1.2, human_oversight_preservation: -1.5, automation_expansion_risk: 1.2 }, rationale: "AI assessing 'merit' of employee complaints is extremely dangerous. It could dismiss valid grievances, create legal liability, and undermine employee trust." },
      { label: "The AI should only do the initial categorisation. Everything else should be human.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { handoff_design_quality: 0.3, human_oversight_preservation: 0.5, workflow_redesign_quality: -0.2 }, rationale: "Safe but misses efficiency opportunities. Urgency scoring and routing are low-risk administrative tasks the AI could handle." },
      { label: "I'd let the AI handle everything up to and including the initial meeting with the complainant, using a scripted conversation flow.", value: "D", outcomeClass: "failure", isOptimal: false, signalDeltas: { handoff_design_quality: -0.8, human_oversight_preservation: -1.0, automation_expansion_risk: 0.8 }, rationale: "AI conducting initial ER meetings is inappropriate. These conversations require empathy, judgement, and the ability to read non-verbal cues." },
    ],
  },

  {
    id: "WD-03", domain: "ai_workflow_design", capabilityKey: "ai_workflow_design",
    interactionType: "process_redesign", difficulty: 1, riskLevel: "Low",
    title: "Redesigning the holiday request workflow",
    scenario: "Currently, holiday requests follow this process: (1) employee emails their manager, (2) manager checks the team calendar manually, (3) manager checks remaining allowance on a spreadsheet, (4) manager approves/declines via email, (5) HR admin updates the central tracker. Average processing time: 2 days. 15% of requests have errors (wrong allowance, double-bookings).",
    constraint: "Budget: £5k for implementation. Must integrate with existing payroll system.",
    question: "How would you redesign this workflow using AI and automation?",
    options: [
      { label: "Replace with an automated workflow: (1) Employee submits request through self-service portal, (2) System automatically checks remaining allowance and team calendar for conflicts, (3) If no conflicts and allowance available, auto-approve and notify manager (manager can override within 24 hours), (4) If conflict detected, route to manager with conflict details and suggested alternatives, (5) Approved requests automatically update central tracker and payroll. AI enhancement: use historical data to predict busy periods and proactively suggest employees book leave during quieter times. This eliminates manual checking, reduces errors to near-zero, and cuts processing time to minutes.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { workflow_redesign_quality: 1.2, handoff_design_quality: 0.8, human_oversight_preservation: 0.6 }, rationale: "Practical redesign that automates the administrative steps while preserving manager oversight. The AI prediction element adds genuine value." },
      { label: "Just buy an off-the-shelf HR system. No need to design anything custom.", value: "B", outcomeClass: "weak", isOptimal: false, signalDeltas: { workflow_redesign_quality: -0.4, handoff_design_quality: -0.3 }, rationale: "Avoids the design question entirely. An off-the-shelf system still needs workflow design decisions about approval rules and escalation." },
      { label: "Keep the current process but add an AI chatbot that employees can ask about their remaining allowance.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { workflow_redesign_quality: -0.3, handoff_design_quality: -0.2 }, rationale: "Addresses only one small part of the problem (allowance checking) and doesn't redesign the workflow to eliminate the error-prone manual steps." },
      { label: "Fully automate: AI approves all requests automatically based on allowance and calendar. No manager involvement needed.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { workflow_redesign_quality: 0.3, human_oversight_preservation: -0.5, automation_expansion_risk: 0.3 }, rationale: "Good automation but removing manager oversight entirely is problematic — managers need visibility of team availability and the ability to manage workload." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN 4: WORKFORCE AI READINESS (Strategic)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "WR-01", domain: "workforce_ai_readiness", capabilityKey: "workforce_ai_readiness",
    interactionType: "capability_diagnosis", difficulty: 2, riskLevel: "Medium",
    title: "Diagnosing AI readiness gaps in the finance team",
    scenario: "The CFO wants to implement AI-powered financial forecasting and automated expense processing. The finance team of 25 people ranges from junior analysts to senior controllers. In a recent survey, 60% said they're 'comfortable with Excel' but only 15% have used any AI tool. The team's average age is 42. Two team members have expressed anxiety about AI replacing their jobs.",
    constraint: "The CFO wants the AI tools live within 6 months.",
    question: "What capability gaps do you diagnose, and what's your assessment of the team's AI readiness?",
    options: [
      { label: "Key gaps: (1) Foundation gap — 85% haven't used AI tools, so basic AI interaction skills (prompting, output evaluation) are missing. (2) Workflow gap — the team can't yet identify which finance processes benefit from AI vs need human judgement. (3) Trust gap — the two anxious team members likely represent a wider unspoken concern. (4) Data literacy gap — 'comfortable with Excel' doesn't mean comfortable with AI-driven analytics. My assessment: the team is NOT ready for a 6-month rollout. I'd recommend: Phase 1 (months 1-2): AI literacy programme for all 25, focusing on practical tool use. Phase 2 (months 3-4): pilot with 5 volunteers on expense processing (lower risk). Phase 3 (months 5-6): expand to forecasting with trained team. The CFO's timeline needs adjusting — rushing this will increase resistance and errors.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { capability_diagnosis_accuracy: 1.3, intervention_design_quality: 0.8, leader_advisory_quality: 0.7, generic_prescription_risk: -0.5 }, rationale: "Comprehensive diagnosis covering foundation, workflow, trust, and data literacy gaps. Realistic phased plan that pushes back on the unrealistic timeline." },
      { label: "The team just needs training on the new AI tools. I'd arrange vendor training sessions and they'll pick it up.", value: "B", outcomeClass: "weak", isOptimal: false, signalDeltas: { capability_diagnosis_accuracy: -0.5, generic_prescription_risk: 0.8, intervention_design_quality: -0.4 }, rationale: "Generic 'just train them' prescription that doesn't address the specific gaps or the anxiety/resistance issues." },
      { label: "With 85% having no AI experience, I'd recommend delaying the project by a year to allow proper upskilling.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { capability_diagnosis_accuracy: 0.4, leader_advisory_quality: -0.3 }, rationale: "Identifies the readiness gap but the response is too conservative. A year's delay isn't necessary with a phased approach." },
      { label: "I'd focus on the two anxious team members first — once they're on board, the rest will follow.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { capability_diagnosis_accuracy: -0.3, intervention_design_quality: -0.4 }, rationale: "Focuses on a symptom (anxiety) rather than the systemic capability gaps. The two vocal members are likely representing wider concerns." },
    ],
  },

  {
    id: "WR-02", domain: "workforce_ai_readiness", capabilityKey: "workforce_ai_readiness",
    interactionType: "intervention_design", difficulty: 3, riskLevel: "High",
    title: "Designing an AI upskilling intervention for customer service",
    scenario: "Your customer service team of 80 people will be working alongside an AI co-pilot within 3 months. The AI will suggest responses, summarise customer history, and flag escalation triggers. Assessment data shows: 30% are AI-confident (use AI personally), 45% are AI-curious (interested but no experience), and 25% are AI-resistant (concerned about job security). The team handles 500 calls/day including complaints, billing queries, and technical support.",
    constraint: "Training budget: £40k. Cannot take more than 20% of the team offline at any time.",
    question: "Design the upskilling intervention.",
    options: [
      { label: "Three-track intervention: Track 1 (AI-confident, 24 people): 1-day intensive on the specific co-pilot tool, then deploy as 'AI champions' who support colleagues. Track 2 (AI-curious, 36 people): 2-day programme — Day 1: AI fundamentals and hands-on practice with the co-pilot in a sandbox. Day 2: live supervised calls with the co-pilot, paired with a Track 1 champion. Track 3 (AI-resistant, 20 people): Start with a facilitated session addressing concerns honestly (what changes, what doesn't, what support is available). Then join Track 2 programme. Rollout: Stagger across 6 weeks, 13-14 people per week (16% offline). Each cohort gets 2 weeks of supported live use before the next cohort starts. Success metrics: call handling time, customer satisfaction, AI suggestion acceptance rate, employee confidence survey.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { intervention_design_quality: 1.4, capability_diagnosis_accuracy: 0.8, generic_prescription_risk: -0.6 }, rationale: "Differentiated intervention based on readiness levels. Practical staggering that respects the 20% constraint. Addresses resistance directly. Clear success metrics." },
      { label: "Run a 1-day training session for everyone on how to use the AI co-pilot. Those who struggle can get extra support afterwards.", value: "B", outcomeClass: "weak", isOptimal: false, signalDeltas: { intervention_design_quality: -0.6, generic_prescription_risk: 0.8, capability_diagnosis_accuracy: -0.3 }, rationale: "One-size-fits-all approach that ignores the different readiness levels. Doesn't address resistance or provide structured support." },
      { label: "Focus the budget on the AI-resistant group — they're the bottleneck. The confident and curious groups will figure it out.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { intervention_design_quality: 0.2, capability_diagnosis_accuracy: 0.3 }, rationale: "Correctly identifies resistance as important but neglects the other groups. Even AI-curious people need structured training on the specific tool." },
      { label: "Delay the AI co-pilot rollout until everyone has completed a comprehensive 5-day AI literacy programme.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { intervention_design_quality: -0.4, leader_advisory_quality: -0.5 }, rationale: "Disproportionate response. 5 days per person for 80 people would cost far more than £40k and delay the rollout significantly." },
    ],
  },

  {
    id: "WR-03", domain: "workforce_ai_readiness", capabilityKey: "workforce_ai_readiness",
    interactionType: "leader_advisory", difficulty: 3, riskLevel: "High",
    title: "Advising the CEO on organisation-wide AI adoption",
    scenario: "The CEO has just returned from a conference and wants to 'make the whole company AI-first within 12 months.' They want every department using AI tools daily and have asked you to 'make it happen.' Current state: only IT and marketing use AI tools regularly. The company has 500 employees across 8 departments.",
    constraint: "The CEO is presenting the AI strategy to the board in 2 weeks and wants your input.",
    question: "What advice would you give the CEO?",
    options: [
      { label: "I'd advise a realistic phased approach: First, 'AI-first in 12 months' is aspirational but the definition matters. I'd reframe it as 'AI-enabled' — every department has identified and implemented at least one AI use case that demonstrably improves their work. The plan: (1) Months 1-2: AI readiness assessment across all 8 departments — identify current capability, willing champions, and high-value use cases. (2) Months 3-4: Foundation programme — basic AI literacy for all 500 employees (can be self-paced online). (3) Months 5-8: Department-specific pilots — each department implements their highest-value AI use case with dedicated support. (4) Months 9-12: Scale successful pilots, share learnings across departments, measure ROI. Key risks to flag: data governance needs to be in place before scaling, some departments will move faster than others, and forcing adoption creates resistance. For the board presentation, I'd recommend presenting this as a phased investment with measurable milestones rather than a big-bang transformation.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { leader_advisory_quality: 1.4, capability_diagnosis_accuracy: 0.8, intervention_design_quality: 0.7, generic_prescription_risk: -0.5 }, rationale: "Constructively reframes the CEO's ambition into a realistic plan. Provides specific phases with timelines. Flags risks without being negative. Offers practical board presentation advice." },
      { label: "Great idea! I'll create a mandatory AI training programme for all 500 employees and set a target of daily AI use within 6 months.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { leader_advisory_quality: -1.0, generic_prescription_risk: 0.8, capability_diagnosis_accuracy: -0.5 }, rationale: "Uncritically accepts the CEO's directive without assessing feasibility. Mandatory training without readiness assessment will create resistance." },
      { label: "I'd push back and say 12 months is unrealistic. We should take 3 years to do this properly.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { leader_advisory_quality: -0.4, capability_diagnosis_accuracy: 0.2 }, rationale: "Pushes back without offering an alternative. 3 years is too conservative and doesn't match the CEO's energy or the competitive landscape." },
      { label: "I'd suggest starting with a pilot in one department to prove the concept before rolling out company-wide.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { leader_advisory_quality: 0.4, intervention_design_quality: 0.3 }, rationale: "Reasonable caution but too slow for the CEO's ambition. A single pilot doesn't address the 12-month timeline or the board presentation need." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN 5: AI ETHICS & EMPLOYEE TRUST (Strategic)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "ET-01", domain: "ai_ethics_trust", capabilityKey: "ai_ethics_trust",
    interactionType: "ethical_pressure_test", difficulty: 2, riskLevel: "High",
    title: "Ethical pressure: CEO demands AI monitoring of remote workers",
    scenario: "Monday morning. The CEO calls you in and says: 'I've seen a tool that monitors remote workers' keystrokes, screenshots, and active time. I want it installed on everyone's laptops by Friday. Productivity has dropped 15% since we went hybrid and I need data to manage this.' The tool costs £8 per employee per month.",
    constraint: "The CEO is visibly frustrated and expects immediate action. Your next 1-to-1 with them is in 30 minutes.",
    question: "How do you respond?",
    options: [
      { label: "I'd acknowledge the productivity concern but push back on the approach: 'I understand the frustration about productivity, and I want to help solve it. But I have significant concerns about keystroke monitoring: (1) It likely breaches UK GDPR — we'd need a Data Protection Impact Assessment and legitimate interest basis, which is hard to establish for keystroke logging. (2) It will destroy employee trust — if this leaks (and it will), we'll face a retention crisis that costs far more than the productivity dip. (3) The 15% drop might have other causes — let me analyse whether it correlates with specific teams, projects, or the hybrid transition itself. I'd propose instead: outcome-based performance metrics, regular check-ins, and team-level productivity data that doesn't surveil individuals. Can I bring you an alternative plan by Wednesday?'", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { ethics_under_pressure: 1.3, stakeholder_impact_awareness: 1.0, employee_transparency_advocacy: 0.8, pressure_drift_risk: -0.8, legal_vs_fair_distinction: 0.7 }, rationale: "Pushes back firmly but constructively. Addresses legal, trust, and practical concerns. Offers an alternative timeline and approach. Doesn't simply say 'no' — redirects to a better solution." },
      { label: "I'd start researching monitoring tools immediately. The CEO has made a clear decision and it's my job to implement it.", value: "B", outcomeClass: "critical_failure", isOptimal: false, signalDeltas: { ethics_under_pressure: -1.5, pressure_drift_risk: 1.5, employee_transparency_advocacy: -1.0, stakeholder_impact_awareness: -0.8 }, rationale: "Complete capitulation to pressure without raising any ethical, legal, or practical concerns. This is exactly the pressure drift the assessment is designed to detect." },
      { label: "I'd say 'That's an interesting idea, let me look into it' and then quietly delay until the CEO forgets about it.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { ethics_under_pressure: -0.3, pressure_drift_risk: 0.3, stakeholder_impact_awareness: -0.2 }, rationale: "Avoids confrontation but doesn't address the underlying issue. The CEO may proceed without HR input, which is worse." },
      { label: "I'd refuse outright: 'We can't do that — it's illegal and unethical. I won't be part of it.'", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { ethics_under_pressure: 0.5, pressure_drift_risk: -0.3, stakeholder_impact_awareness: 0.2, legal_vs_fair_distinction: 0.3 }, rationale: "Correct ethical instinct but the delivery is confrontational and doesn't offer alternatives. This approach is likely to damage the HR-CEO relationship without solving the productivity problem." },
    ],
  },

  {
    id: "ET-02", domain: "ai_ethics_trust", capabilityKey: "ai_ethics_trust",
    interactionType: "stakeholder_impact", difficulty: 3, riskLevel: "Critical",
    title: "Assessing stakeholder impact of AI-driven redundancy selection",
    scenario: "The organisation is restructuring and needs to reduce headcount by 20% (60 roles from 300). The Operations Director proposes using an AI tool that analyses performance data, skills assessments, and 'future potential scores' to create the selection pool. The AI would score all 300 employees and the bottom 60 would be selected for redundancy.",
    constraint: "The restructuring announcement is in 3 weeks. The Operations Director has already purchased the AI tool.",
    question: "What stakeholder impacts do you identify, and what is your recommendation?",
    options: [
      { label: "Critical stakeholder impacts: (1) Affected employees: AI selection removes human judgement from a life-changing decision. 'Future potential scores' are subjective and likely biased (research shows they disadvantage women, older workers, and ethnic minorities). (2) Remaining employees: if they learn selection was AI-driven, trust in the organisation will collapse. (3) Trade unions/employee reps: will challenge the fairness and transparency of AI selection in consultation. (4) Legal: AI-driven selection is extremely difficult to defend at tribunal — you can't explain how the AI weighted factors, which undermines the 'fair and objective' requirement. (5) Regulators: ICO may investigate automated decision-making under Article 22 GDPR. My recommendation: do NOT use the AI tool for selection. Use it to identify the roles that are redundant (structural analysis), but selection of individuals must use transparent, human-applied criteria that can be explained and defended. I'd escalate this to the HR Director and legal counsel immediately.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { stakeholder_impact_awareness: 1.5, ethics_under_pressure: 1.0, legal_vs_fair_distinction: 1.2, employee_transparency_advocacy: 0.8, pressure_drift_risk: -0.5 }, rationale: "Comprehensive stakeholder analysis covering all affected groups. Correctly identifies the legal and ethical risks. Offers a practical alternative (structural vs individual selection)." },
      { label: "The AI tool will make the selection more objective and less prone to manager bias. I'd support using it.", value: "B", outcomeClass: "critical_failure", isOptimal: false, signalDeltas: { stakeholder_impact_awareness: -1.2, ethics_under_pressure: -0.8, legal_vs_fair_distinction: -1.0, blind_acceptance_risk: 1.0 }, rationale: "Fundamentally misunderstands the risks. AI selection in redundancy is not more objective — it's less transparent and potentially more biased." },
      { label: "I'd suggest using the AI as one input alongside manager assessments and a human panel.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { stakeholder_impact_awareness: 0.4, ethics_under_pressure: 0.3, legal_vs_fair_distinction: 0.3 }, rationale: "Better than full AI selection but still problematic. If the AI score is a significant factor, the same legal and ethical issues apply." },
      { label: "I'd raise concerns about the AI tool but ultimately defer to the Operations Director's decision since they've already purchased it.", value: "D", outcomeClass: "failure", isOptimal: false, signalDeltas: { ethics_under_pressure: -0.7, pressure_drift_risk: 0.8, stakeholder_impact_awareness: -0.3 }, rationale: "Capitulates to sunk cost pressure. The fact that the tool has been purchased doesn't make it appropriate to use for this purpose." },
    ],
  },

  {
    id: "ET-03", domain: "ai_ethics_trust", capabilityKey: "ai_ethics_trust",
    interactionType: "legitimate_concern", difficulty: 2, riskLevel: "Medium",
    title: "Responding to employee concerns about AI in performance reviews",
    scenario: "Three employees have separately raised concerns with you about the new AI-assisted performance review system. Employee A says: 'The AI rated me lower than my manager would have — I think it's biased against part-time workers.' Employee B says: 'I don't trust a machine to judge my work. My manager knows me, the AI doesn't.' Employee C says: 'I heard the AI uses our Slack messages to assess collaboration. I never consented to that.'",
    constraint: "The performance review cycle closes in 2 weeks. 200 reviews have already been completed using the AI system.",
    question: "How do you respond to these concerns?",
    options: [
      { label: "Each concern needs a different response: Employee A (bias claim): This is the most urgent. I'd immediately audit the AI's ratings for part-time vs full-time workers to check for systematic bias. If bias is found, all affected reviews need recalibrating. This could be an Equality Act issue if part-time status correlates with protected characteristics (it often correlates with gender). Employee B (trust concern): Valid but not actionable in the same way. I'd ensure the AI rating is clearly positioned as a 'data input' that the manager reviews and can override, not the final assessment. If it's being presented as the AI's decision, that's a communication failure we need to fix. Employee C (consent/data concern): Potentially the most serious. If the AI is processing Slack data without explicit consent and a clear privacy notice, we may be breaching UK GDPR. I'd immediately check the DPIA and privacy notice to confirm what data sources are disclosed. If Slack monitoring wasn't disclosed, we need to pause that data source and potentially re-do affected reviews. Overall: I'd recommend pausing the AI system for the remaining reviews until these issues are investigated, and briefing the HR Director on the potential legal exposure.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { legitimate_concern_recognition: 1.3, stakeholder_impact_awareness: 1.0, ethics_under_pressure: 0.8, employee_transparency_advocacy: 0.9, legal_vs_fair_distinction: 0.7 }, rationale: "Treats each concern individually with appropriate urgency. Correctly identifies the legal implications of each. Recommends proportionate action including pausing the system." },
      { label: "I'd reassure all three employees that the AI system has been thoroughly tested and is fair. Their concerns are understandable but unfounded.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { legitimate_concern_recognition: -1.0, employee_transparency_advocacy: -0.8, dismissive_of_concern_risk: 1.0 }, rationale: "Dismisses legitimate concerns without investigation. The bias and consent issues could have real legal consequences." },
      { label: "I'd escalate all three concerns to IT since they built the AI system.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { legitimate_concern_recognition: -0.2, stakeholder_impact_awareness: -0.3 }, rationale: "Passes responsibility to IT when these are HR and legal issues. IT can help investigate the technical aspects but HR owns the people and compliance response." },
      { label: "I'd take note of the concerns and include them in the post-cycle review. For now, the reviews should continue as planned.", value: "D", outcomeClass: "failure", isOptimal: false, signalDeltas: { legitimate_concern_recognition: -0.6, ethics_under_pressure: -0.5, pressure_drift_risk: 0.5 }, rationale: "Delays action on potentially serious legal issues. If the bias or consent concerns are valid, continuing the reviews compounds the problem." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN 6: AI CHANGE LEADERSHIP (Strategic)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "CL-01", domain: "ai_change_leadership", capabilityKey: "ai_change_leadership",
    interactionType: "resistance_response", difficulty: 2, riskLevel: "Medium",
    title: "Responding to team resistance to AI recruitment tools",
    scenario: "You're rolling out an AI-powered applicant tracking system to the recruitment team of 8 people. After the announcement, 5 of the 8 recruiters have pushed back. Their concerns: 'AI can't assess cultural fit', 'We'll lose the personal touch that candidates value', 'This is just a way to cut headcount in our team', and 'The AI will miss great candidates who don't have perfect CVs.'",
    constraint: "The system goes live in 4 weeks. The Head of Talent has committed to the CEO that it will be operational by then.",
    question: "How do you respond to this resistance?",
    options: [
      { label: "I'd separate the legitimate concerns from the fear-based ones and address each: Legitimate concerns (address seriously): 'AI can't assess cultural fit' — correct, and we should design the workflow so cultural fit assessment stays human. 'AI will miss non-traditional candidates' — valid risk. We need to audit the AI's screening criteria and ensure it doesn't penalise career gaps, non-linear paths, or non-traditional qualifications. Fear-based concerns (address with transparency): 'Losing personal touch' — show how the AI handles admin (scheduling, screening) so recruiters have MORE time for the personal elements. 'Cutting headcount' — be honest: if headcount reduction is planned, say so. If it isn't, make a clear commitment. Then involve the team: ask the 5 resisters to identify the 3 biggest risks they see and co-design the safeguards. Give them ownership of the quality assurance process. This turns resisters into contributors.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { resistance_response_quality: 1.3, legitimate_concern_recognition: 1.0, change_pace_calibration: 0.7, dismissive_of_concern_risk: -0.5 }, rationale: "Distinguishes between legitimate and fear-based concerns. Addresses each appropriately. Involves resisters in the solution. Honest about headcount." },
      { label: "The decision has been made and we need to move forward. I'd remind the team that this is a leadership decision and their job is to implement it.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { resistance_response_quality: -1.0, legitimate_concern_recognition: -0.8, dismissive_of_concern_risk: 1.0 }, rationale: "Authoritarian response that dismisses legitimate concerns. Will increase resistance and likely lead to passive non-compliance or turnover." },
      { label: "I'd delay the rollout until the team is fully on board. You can't force people to use a tool they don't believe in.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { resistance_response_quality: -0.3, change_pace_calibration: -0.5 }, rationale: "Gives resisters a veto over organisational decisions. Some resistance is normal in change — the goal is to address concerns, not eliminate all objection." },
      { label: "I'd arrange a demo of the AI tool so the team can see how it works. Once they see it in action, they'll come around.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { resistance_response_quality: 0.3, legitimate_concern_recognition: -0.2 }, rationale: "A demo might help but doesn't address the underlying concerns about cultural fit, candidate quality, or job security. These need direct conversation, not just a product demo." },
    ],
  },

  {
    id: "CL-02", domain: "ai_change_leadership", capabilityKey: "ai_change_leadership",
    interactionType: "legitimate_concern", difficulty: 3, riskLevel: "High",
    title: "Distinguishing legitimate concerns from change resistance",
    scenario: "Your organisation is implementing an AI-powered 'workforce planning' tool that predicts which roles will become redundant within 2 years based on automation potential. The tool will be visible to senior leaders. Three groups have raised concerns: (1) The data team says the model's predictions are based on generic industry data, not your organisation's specific context. (2) Middle managers say their teams will panic if they find out this tool exists. (3) The union representative says this constitutes 'redundancy planning by algorithm' and threatens collective action.",
    constraint: "The CHRO has championed this tool and presented it to the board as a strategic differentiator.",
    question: "Which concerns are legitimate and how should each be addressed?",
    options: [
      { label: "All three concerns have legitimacy but at different levels: (1) Data team — HIGHLY legitimate. If the model uses generic industry data rather than organisation-specific data, its predictions could be dangerously wrong. A role that's automatable in one context may not be in yours. This needs to be resolved before the tool is used for any decision-making. I'd recommend a validation exercise comparing the AI's predictions against your actual automation roadmap. (2) Middle managers — LEGITIMATE concern, poor framing. The panic risk is real, but the solution isn't secrecy — it's controlled communication. The tool should be positioned as 'workforce evolution planning' not 'redundancy prediction', and managers should be trained on how to discuss it with their teams. (3) Union — LEGITIMATE and legally significant. If the tool's output influences redundancy decisions, it IS redundancy planning and triggers consultation obligations. The union's concern should be addressed proactively: share the tool's methodology, agree guardrails on how its output can and cannot be used, and document that it's for strategic planning not individual selection. I'd advise the CHRO that all three concerns need addressing before wider rollout, and that the union engagement is legally necessary, not optional.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { legitimate_concern_recognition: 1.5, resistance_response_quality: 1.0, change_pace_calibration: 0.8, dismissive_of_concern_risk: -0.5 }, rationale: "Correctly assesses the legitimacy of each concern. Provides specific, differentiated responses. Doesn't dismiss any concern but also doesn't treat them all equally." },
      { label: "The data team and union are just trying to block progress. The middle managers have a point about communication, but we should proceed and manage concerns as they arise.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { legitimate_concern_recognition: -1.0, dismissive_of_concern_risk: 1.2, resistance_response_quality: -0.8 }, rationale: "Dismisses the two most legitimate concerns (data quality and legal/union). The data team's concern about model accuracy is critical." },
      { label: "I'd recommend pausing the entire project until all concerns are resolved. It's too risky to proceed.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { legitimate_concern_recognition: 0.4, change_pace_calibration: -0.4, resistance_response_quality: 0.2 }, rationale: "Overly cautious. The concerns can be addressed in parallel with a controlled rollout rather than a full pause." },
      { label: "I'd focus on the union concern first since it's the most politically sensitive, and deal with the others later.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { legitimate_concern_recognition: 0.3, resistance_response_quality: 0.2, change_pace_calibration: 0.2 }, rationale: "Prioritises the most visible concern but the data quality issue is actually more fundamental — if the model is wrong, the union concern becomes moot." },
    ],
  },

  {
    id: "CL-03", domain: "ai_change_leadership", capabilityKey: "ai_change_leadership",
    interactionType: "resistance_response", difficulty: 1, riskLevel: "Low",
    title: "Leading AI adoption in a sceptical team",
    scenario: "You've been asked to introduce an AI note-taking tool for meetings across the HR department. The tool records meetings, generates summaries, and identifies action items. When you announced it, the reactions were: 'I don't want my conversations recorded', 'What if it misquotes me?', 'This feels like surveillance', and 'Can we just keep taking notes manually?'",
    constraint: "The tool is already purchased and the HR Director wants it in use within 2 weeks.",
    question: "How do you lead this adoption?",
    options: [
      { label: "I'd take a 'show, don't tell' approach with clear boundaries: Week 1: (1) Address the surveillance concern directly — explain exactly what data is stored, who can access it, and how long it's retained. Put this in writing. (2) Make it opt-in for the first month — teams can choose to use it or not. (3) Run a live demo in a low-stakes meeting (e.g., a team catch-up, not a performance discussion) so people can see what the output looks like. (4) Address the misquoting concern by showing the edit/correction feature and establishing a rule that summaries are reviewed before being shared. Week 2: (5) Share feedback from early adopters. (6) Identify which meeting types it's appropriate for (team meetings, project updates) and which it's NOT (1-to-1s, disciplinary, grievance). (7) Create a simple 'meeting AI protocol' that the team owns. The key principle: give people control and transparency. Forced adoption of recording tools destroys trust.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { resistance_response_quality: 1.2, legitimate_concern_recognition: 0.9, change_pace_calibration: 0.8, employee_transparency_advocacy: 0.7 }, rationale: "Addresses each concern specifically. Opt-in approach builds trust. Clear boundaries on appropriate use. Team ownership of the protocol." },
      { label: "I'd make it mandatory from day one. People will get used to it once they see how useful it is.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { resistance_response_quality: -0.8, legitimate_concern_recognition: -0.7, dismissive_of_concern_risk: 0.8 }, rationale: "Forces adoption of a recording tool without addressing privacy concerns. Will create resentment and potentially drive important conversations off-record." },
      { label: "I'd tell the HR Director that the team isn't ready and we should wait until they're more comfortable with AI generally.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { resistance_response_quality: -0.3, change_pace_calibration: -0.4 }, rationale: "Avoids the challenge rather than leading through it. The concerns are addressable with the right approach." },
      { label: "I'd send an email explaining the benefits of the tool and include a link to the user guide.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { resistance_response_quality: -0.2, legitimate_concern_recognition: -0.4 }, rationale: "Impersonal approach that doesn't address the specific concerns raised. An email about benefits won't overcome privacy and surveillance worries." },
    ],
  },
];

// ── Seed execution ──────────────────────────────────────────────────────────

console.log(`Seeding ${scenarios.length} v10 scenarios...`);

// First, archive old v9.2 scenarios
await conn.query(`UPDATE content_scenarios SET status = 'archived' WHERE capability_key NOT IN ('ai_interaction', 'ai_output_evaluation', 'ai_workflow_design', 'workforce_ai_readiness', 'ai_ethics_trust', 'ai_change_leadership')`);
console.log("Archived old v9.2 scenarios");

let inserted = 0;
let optionsInserted = 0;

for (const s of scenarios) {
  const scenarioId = randomUUID();

  await conn.query(
    `INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, \`constraint\`, question, role_keys_json, failure_mode_keys_json, tags_json, primary_signal, ambiguity_level, status, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 1)
     ON DUPLICATE KEY UPDATE title=VALUES(title), scenario=VALUES(scenario), \`constraint\`=VALUES(\`constraint\`), question=VALUES(question), status='published'`,
    [
      scenarioId,
      s.id,
      s.title,
      s.domain,
      s.capabilityKey,
      s.interactionType,
      s.difficulty,
      s.riskLevel,
      s.riskLevel === "Critical" || s.riskLevel === "High",
      s.scenario,
      s.constraint,
      s.question,
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify([s.capabilityKey, s.interactionType, `difficulty_${s.difficulty}`]),
      Object.keys(s.options[0].signalDeltas)[0],
      s.difficulty >= 3 ? "high" : s.difficulty >= 2 ? "medium" : "low",
    ]
  );
  inserted++;

  // Insert options
  for (let i = 0; i < s.options.length; i++) {
    const opt = s.options[i];
    const optId = randomUUID();
    await conn.query(
      `INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        optId,
        scenarioId,
        i + 1,
        opt.label,
        opt.value,
        opt.outcomeClass,
        JSON.stringify(opt.signalDeltas),
        opt.rationale,
        opt.isOptimal,
      ]
    );
    optionsInserted++;
  }
}

console.log(`✅ Inserted ${inserted} scenarios and ${optionsInserted} options`);

// Verify distribution
const [dist] = await conn.query(
  `SELECT capability_key, interaction_type, COUNT(*) as cnt FROM content_scenarios WHERE status='published' GROUP BY capability_key, interaction_type ORDER BY capability_key, interaction_type`
);
console.log("\nv10 scenario distribution:");
for (const row of dist) {
  console.log(`  ${row.capability_key} / ${row.interaction_type}: ${row.cnt}`);
}

const [total] = await conn.query(`SELECT COUNT(*) as total FROM content_scenarios WHERE status='published'`);
console.log(`\nTotal published scenarios: ${total[0].total}`);

await conn.end();
console.log("Done!");
