/**
 * AiQ v10 Scenario Seed — Batch 2
 * Fills coverage gaps: more interaction types per domain, reaching 60+ total scenarios
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import { randomUUID } from "crypto";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const scenarios = [

  // ═══════════════════════════════════════════════════════════════════════════
  // AI INTERACTION — fill gaps: handoff_decision, process_redesign, intervention_design
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "INT-09", domain: "ai_interaction", capabilityKey: "ai_interaction",
    interactionType: "handoff_decision", difficulty: 2, riskLevel: "Medium",
    title: "Deciding when to stop iterating with AI and involve a human expert",
    scenario: "You've been using the AI to draft a complex settlement agreement for an employee exiting after a grievance. After 4 rounds of prompting, the AI has produced a document that covers the key commercial terms, but you're unsure whether the tax indemnity clause and the non-derogatory obligations are correctly worded. You've spent 45 minutes iterating.",
    constraint: "The employee's solicitor expects the draft by end of day.",
    question: "What do you do next?",
    options: [
      { label: "Stop iterating with the AI and send the draft to an employment lawyer for review. The AI has done the heavy lifting on structure and commercial terms, but tax indemnity clauses and non-derogatory obligations have specific legal requirements that I'm not confident the AI has got right. The handoff point is clear: AI for first-draft structure, human expert for legal precision. I'd flag the two specific clauses I'm uncertain about to save the lawyer time.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { tool_fluency_index: 1.0, output_direction_skill: 0.8, prompt_iteration_quality: 0.6 }, rationale: "Recognises the AI's value for drafting but knows when to hand off to a human expert. Specific about what needs review." },
      { label: "Keep prompting the AI until it gets the clauses right. It should be able to handle legal drafting if I give it enough context.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { tool_fluency_index: -0.7, output_direction_skill: -0.5 }, rationale: "Over-reliance on AI for high-stakes legal drafting. More iteration won't make the AI a substitute for legal expertise." },
      { label: "Send the AI draft as-is. It's probably close enough and the lawyer can fix any issues during negotiation.", value: "C", outcomeClass: "failure", isOptimal: false, signalDeltas: { tool_fluency_index: -0.5, blind_acceptance_risk: 0.8, output_direction_skill: -0.6 }, rationale: "Sending an unreviewed AI-drafted legal document creates significant risk. Settlement agreements have binding legal consequences." },
      { label: "Scrap the AI draft entirely and write it from scratch myself using a template.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { tool_fluency_index: -0.4, prompt_iteration_quality: -0.3 }, rationale: "Wastes the 45 minutes of AI work. The structure and commercial terms were useful — the issue is only with specific legal clauses." },
    ],
  },

  {
    id: "INT-10", domain: "ai_interaction", capabilityKey: "ai_interaction",
    interactionType: "process_redesign", difficulty: 1, riskLevel: "Low",
    title: "Redesigning how you use AI for daily HR admin",
    scenario: "You currently spend about 2 hours per day on routine HR admin: answering employee queries by email, updating spreadsheets with absence data, writing meeting notes, and drafting standard letters (reference letters, contract variations, etc.). Your organisation has just given everyone access to an AI assistant.",
    constraint: "No additional budget — just the AI assistant that's already available.",
    question: "How would you redesign your daily workflow to incorporate AI?",
    options: [
      { label: "I'd restructure my day around AI-assisted batching: Morning (30 mins): Feed all overnight employee queries to the AI to draft responses. Review each draft, personalise where needed, and send. This replaces 45 mins of writing from scratch. Midday (15 mins): Use AI to extract absence data from emails/forms and format it for the spreadsheet. I verify the numbers and paste them in. This replaces 30 mins of manual data entry. Afternoon (15 mins): After each meeting, share my rough notes with the AI to produce structured minutes with action items. I review and distribute. This replaces 20 mins of note-writing. As needed: Use AI to generate standard letters from templates, with me checking details and signing off. This saves 15-20 mins per letter. Total estimated saving: 60-90 mins per day, which I'd reinvest in strategic HR work.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { prompt_construction_quality: 0.8, tool_fluency_index: 1.2, output_direction_skill: 0.7 }, rationale: "Practical, specific workflow redesign with realistic time estimates. Maintains human review at every step. Identifies where the saved time goes." },
      { label: "I'd let the AI handle all my admin automatically so I can focus entirely on strategic work.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { tool_fluency_index: -0.6, blind_acceptance_risk: 0.7, output_direction_skill: -0.5 }, rationale: "No human review on AI-generated communications to employees is risky. 'Handle automatically' suggests no oversight." },
      { label: "I'd use the AI for meeting notes only. The rest of my admin needs a personal touch.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { tool_fluency_index: -0.3, output_direction_skill: -0.2 }, rationale: "Too conservative — misses obvious opportunities for AI assistance with email drafting and data entry while maintaining human oversight." },
      { label: "I'd experiment with the AI for a week and see what works.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { tool_fluency_index: 0.3, output_direction_skill: 0.2 }, rationale: "Reasonable starting point but lacks a structured plan for what to try and how to evaluate it." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI OUTPUT EVALUATION — fill gaps: confidence_calibration, risk_judgement, fitness_for_purpose
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "OE-04", domain: "ai_output_evaluation", capabilityKey: "ai_output_evaluation",
    interactionType: "confidence_calibration", difficulty: 2, riskLevel: "Medium",
    title: "Calibrating trust in AI salary benchmarking data",
    scenario: "You asked the AI to benchmark salaries for 5 roles against market data. The AI returned precise figures: 'Senior HR Business Partner: £68,450 (median), £72,300 (upper quartile).' The numbers look plausible and are close to what you'd expect. However, you notice the AI doesn't cite specific data sources.",
    constraint: "The compensation committee meets tomorrow and expects your benchmarking report.",
    question: "How much should you trust these figures?",
    options: [
      { label: "Low trust without verification. The precision of the figures (£68,450 rather than '£65-70k range') is a red flag — it suggests the AI is generating specific numbers that may not come from actual survey data. AI language models don't have access to real-time salary databases; they're pattern-matching from training data that could be outdated. I would: (1) cross-reference against at least one verified source (XpertHR, Willis Towers Watson, or Glassdoor), (2) present ranges rather than precise figures to the committee, (3) note the data sources and their recency, and (4) caveat any AI-generated figures as 'indicative only, pending market data verification'.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { fitness_for_purpose_judgement: 1.2, output_evaluation_quality: 1.0, data_interpretation_quality: 0.8, blind_acceptance_risk: -0.5 }, rationale: "Correctly identifies the false precision problem, understands AI limitations with real-time data, and proposes practical verification steps." },
      { label: "The figures look about right based on my experience. I'd use them in the report with a note that they're AI-generated.", value: "B", outcomeClass: "weak", isOptimal: false, signalDeltas: { fitness_for_purpose_judgement: -0.5, blind_acceptance_risk: 0.6, data_interpretation_quality: -0.4 }, rationale: "Using unverified AI salary data for compensation decisions is risky. 'Looks about right' is not a valid verification method." },
      { label: "I'd ask the AI to provide its sources and then check those.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { fitness_for_purpose_judgement: 0.3, output_evaluation_quality: 0.3, data_interpretation_quality: 0.2 }, rationale: "Good instinct but AI may hallucinate sources. The better approach is to go directly to known reliable sources rather than asking the AI to justify its own output." },
      { label: "I wouldn't use AI for salary benchmarking at all. This needs proper survey data.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { fitness_for_purpose_judgement: 0.4, output_evaluation_quality: 0.2, tool_fluency_index: -0.3 }, rationale: "Correct that proper survey data is needed, but dismisses AI entirely rather than using it as a starting point for research." },
    ],
  },

  {
    id: "OE-05", domain: "ai_output_evaluation", capabilityKey: "ai_output_evaluation",
    interactionType: "risk_judgement", difficulty: 3, riskLevel: "Critical",
    title: "Judging risk of AI-generated disciplinary outcome letter",
    scenario: "An HR advisor used AI to draft a disciplinary outcome letter for an employee being given a final written warning for gross misconduct (theft of company property). The letter is well-structured and includes the right sections: allegation, investigation findings, the employee's response, the decision, and the right of appeal. However, you notice the AI has written: 'On balance, the evidence suggests you may have been involved in the removal of company property.'",
    constraint: "The letter needs to be sent today — the employee has been suspended for 2 weeks awaiting the outcome.",
    question: "What is the risk level of sending this letter?",
    options: [
      { label: "HIGH RISK — do not send as-is. The phrase 'may have been involved' is fatally weak for a final written warning for gross misconduct. A disciplinary outcome must state the finding clearly: 'The panel found, on the balance of probabilities, that you removed company property without authorisation.' The AI's hedging language would: (1) undermine the decision at appeal — the employee could argue the panel wasn't sure, (2) weaken the organisation's position at tribunal if the employee is later dismissed, (3) create an inconsistency between the verbal outcome (presumably clear) and the written record. I'd rewrite the key finding paragraph to state the decision clearly, check the rest of the letter for similar hedging, and have it reviewed by a senior ER advisor before sending today.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { output_evaluation_quality: 1.3, fitness_for_purpose_judgement: 1.2, error_detection_accuracy: 1.0, hallucination_acceptance_risk: -0.3 }, rationale: "Identifies the specific language problem and its legal consequences. Understands that AI's tendency to hedge is dangerous in formal HR documents." },
      { label: "The letter looks professional and covers all the right sections. The wording is careful and measured, which is appropriate for a serious matter.", value: "B", outcomeClass: "critical_failure", isOptimal: false, signalDeltas: { output_evaluation_quality: -1.2, fitness_for_purpose_judgement: -1.0, blind_acceptance_risk: 1.0, error_detection_accuracy: -0.8 }, rationale: "Fails to identify that 'careful and measured' language in this context actually undermines the disciplinary decision." },
      { label: "I'd strengthen the language slightly but the overall letter is fine.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { output_evaluation_quality: 0.3, fitness_for_purpose_judgement: 0.3, error_detection_accuracy: 0.2 }, rationale: "Right direction but 'strengthen slightly' understates the severity. The finding statement needs complete rewriting, not minor adjustment." },
      { label: "I'd get the AI to regenerate the letter with a firmer tone.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { output_evaluation_quality: -0.2, fitness_for_purpose_judgement: -0.3, tool_fluency_index: -0.2 }, rationale: "Tone isn't the issue — it's the legal precision of the finding statement. Asking for 'firmer tone' might produce aggressive language rather than legally sound language." },
    ],
  },

  {
    id: "OE-06", domain: "ai_output_evaluation", capabilityKey: "ai_output_evaluation",
    interactionType: "error_detection", difficulty: 1, riskLevel: "Medium",
    title: "Detecting errors in AI-generated employee survey analysis",
    scenario: "The AI analysed your annual employee engagement survey (500 responses) and reported: 'Overall engagement score: 78%. Key finding: the Engineering department has the highest engagement at 92%. Recommendation: replicate Engineering's practices across all departments.' You know that the Engineering department has only 8 employees.",
    constraint: "The CEO wants to present these findings at the all-hands meeting next week.",
    question: "What errors do you identify in this analysis?",
    options: [
      { label: "Two significant errors: (1) Statistical validity — the Engineering department's 92% score is based on only 8 responses, which is far too small for reliable conclusions. With 8 people, one or two positive responses swing the percentage dramatically. The AI should have flagged the small sample size or excluded departments below a minimum threshold (typically 15-20 responses). (2) Flawed recommendation — 'replicate Engineering's practices' is a logical leap. High engagement in a small team could be due to the specific manager, team dynamics, or selection effects rather than replicable practices. The AI is confusing correlation with causation. I'd re-run the analysis with a minimum sample size filter, present department scores with confidence intervals, and caveat any small-team findings. The recommendation should be 'investigate what drives Engineering's engagement' not 'replicate their practices'.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { error_detection_accuracy: 1.2, data_interpretation_quality: 1.3, output_evaluation_quality: 0.8, bias_detection_skill: 0.5 }, rationale: "Identifies both the statistical validity issue and the logical leap in the recommendation. Proposes practical fixes." },
      { label: "The analysis looks solid. 92% engagement is impressive — we should definitely learn from Engineering.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { error_detection_accuracy: -1.0, data_interpretation_quality: -0.8, blind_acceptance_risk: 0.7 }, rationale: "Accepts a statistically invalid finding without question. Presenting this to the CEO would lead to misguided decisions." },
      { label: "The sample size for Engineering is too small. I'd remove them from the analysis.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { error_detection_accuracy: 0.5, data_interpretation_quality: 0.4 }, rationale: "Identifies the sample size issue but doesn't address the flawed recommendation logic or suggest how to handle small departments properly." },
      { label: "I'd add a footnote saying the Engineering data should be interpreted with caution.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { error_detection_accuracy: 0.2, data_interpretation_quality: -0.2 }, rationale: "A footnote is insufficient. The CEO is unlikely to notice a caveat and may still act on the flawed recommendation." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI WORKFLOW DESIGN — fill gaps: capability_diagnosis, risk_judgement, error_detection
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "WD-04", domain: "ai_workflow_design", capabilityKey: "ai_workflow_design",
    interactionType: "risk_judgement", difficulty: 3, riskLevel: "High",
    title: "Assessing risk of automating the disciplinary investigation workflow",
    scenario: "A vendor is pitching an AI system that automates parts of the disciplinary investigation process: it reviews evidence documents, identifies key facts, cross-references witness statements for inconsistencies, and generates a draft investigation report. The vendor claims it reduces investigation time from 15 days to 3 days.",
    constraint: "Your organisation handles ~40 disciplinary cases per year. The ER team is stretched and investigations are frequently delayed.",
    question: "What is your risk assessment of automating this workflow?",
    options: [
      { label: "Mixed risk profile — some elements are lower risk, others are unacceptable: Lower risk (could automate with oversight): document organisation, timeline construction, cross-referencing dates and facts across statements. These are administrative tasks where AI adds speed without replacing judgement. Unacceptable risk: (1) 'Identifying key facts' — what's 'key' depends on context, credibility assessments, and understanding of workplace dynamics that AI can't evaluate. (2) 'Generating investigation reports' — investigation reports must reflect the investigator's findings and reasoning. An AI-generated report would be challenged at tribunal as not representing genuine investigation. (3) 'Cross-referencing for inconsistencies' — inconsistencies in witness statements need human interpretation. People remember events differently without being dishonest. My recommendation: use the AI for document management and timeline tools only. Keep fact-finding, credibility assessment, and report writing human. This still saves significant time without creating legal risk.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { workflow_redesign_quality: 1.0, human_oversight_preservation: 1.3, handoff_design_quality: 0.8, automation_expansion_risk: -0.5 }, rationale: "Nuanced risk assessment that separates automatable admin from judgement-dependent investigation work. Practical recommendation that still delivers time savings." },
      { label: "This sounds like a great solution for our stretched ER team. I'd recommend a pilot with 5 cases.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { workflow_redesign_quality: -0.5, human_oversight_preservation: -0.8, automation_expansion_risk: 0.7 }, rationale: "Doesn't assess the specific risks of each automated element. A pilot with real disciplinary cases could create legal exposure." },
      { label: "Disciplinary investigations should never involve AI. It's too sensitive.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { workflow_redesign_quality: -0.4, human_oversight_preservation: 0.3, automation_expansion_risk: -0.3 }, rationale: "Blanket rejection misses the genuine efficiency gains from AI-assisted document management. Not all elements of an investigation require the same level of human judgement." },
      { label: "I'd want to see the AI's accuracy rate before deciding. If it's above 95%, I'd proceed.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { workflow_redesign_quality: 0.2, human_oversight_preservation: -0.2 }, rationale: "Accuracy rate is relevant for some elements but misses the fundamental issue: some investigation tasks require human judgement regardless of AI accuracy." },
    ],
  },

  {
    id: "WD-05", domain: "ai_workflow_design", capabilityKey: "ai_workflow_design",
    interactionType: "scenario_critique", difficulty: 2, riskLevel: "Medium",
    title: "Critiquing an AI-automated exit interview process",
    scenario: "Your organisation has replaced human exit interviews with an AI chatbot. Leavers receive a link to a 15-minute AI conversation that asks about their reasons for leaving, experience with their manager, and suggestions for improvement. The AI generates a summary report for HR. After 6 months, you notice: response rate has dropped from 75% (human interviews) to 40%, and the insights are mostly generic ('better communication', 'more career development').",
    constraint: "The HR Director likes the cost saving (£30k/year in interviewer time) and doesn't want to go back to human interviews.",
    question: "What's your critique of this automated workflow?",
    options: [
      { label: "The workflow has a fundamental design flaw: it optimised for cost rather than insight quality. The problems: (1) Response rate drop (75%→40%) means we're losing data from 35% of leavers — likely the ones with the most critical feedback, who don't trust a chatbot with sensitive information. (2) Generic insights suggest the AI isn't probing effectively. Human interviewers follow up on vague answers; the chatbot likely accepts surface-level responses. (3) The people most likely to engage with a chatbot are those with least to say — creating a systematic bias in the data. My recommendation: hybrid model. Use the AI chatbot as a first-pass data collection tool (available to all leavers immediately), but offer a human interview option for anyone who wants it, and mandate human interviews for senior leavers, involuntary exits, and anyone flagging management issues. This preserves cost savings while recovering insight quality.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { workflow_redesign_quality: 1.2, human_oversight_preservation: 0.9, handoff_design_quality: 0.7 }, rationale: "Identifies the response rate bias, the probing limitation, and the self-selection problem. Proposes a practical hybrid solution." },
      { label: "The cost saving is significant. I'd focus on improving the chatbot's questions rather than going back to human interviews.", value: "B", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { workflow_redesign_quality: 0.2, human_oversight_preservation: -0.3 }, rationale: "Addresses one symptom (question quality) but not the fundamental trust and probing issues that drive the response rate drop." },
      { label: "We should go back to human interviews entirely. The data quality is too important to compromise.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { workflow_redesign_quality: -0.3, human_oversight_preservation: 0.4 }, rationale: "Ignores the legitimate cost saving and doesn't consider a hybrid approach. Binary thinking." },
      { label: "The 40% response rate is still a decent sample. I'd keep the current system.", value: "D", outcomeClass: "failure", isOptimal: false, signalDeltas: { workflow_redesign_quality: -0.6, human_oversight_preservation: -0.4, data_interpretation_quality: -0.5 }, rationale: "Ignores the systematic bias in who responds and the quality degradation. 40% is not just a smaller sample — it's a biased sample." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFORCE AI READINESS — fill gaps: resistance_response, ethical_pressure_test, process_redesign
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "WR-04", domain: "workforce_ai_readiness", capabilityKey: "workforce_ai_readiness",
    interactionType: "resistance_response", difficulty: 2, riskLevel: "Medium",
    title: "Addressing L&D team resistance to AI-powered learning platforms",
    scenario: "You're implementing an AI-powered learning platform that personalises training content, recommends courses, and generates quizzes. The L&D team of 6 people is resistant. Their lead says: 'This replaces everything we do. We curate content, design learning journeys, and create assessments. If the AI does all that, what's left for us?'",
    constraint: "The platform goes live in 8 weeks. The L&D team needs to be the primary administrators.",
    question: "How do you address this resistance?",
    options: [
      { label: "I'd validate the concern and reframe their role: 'You're right that the AI handles content recommendation and quiz generation — but that's the commodity part of L&D. What it can't do is: (1) understand the business context that determines what skills matter right now, (2) design blended learning experiences that combine AI content with workshops, coaching, and on-the-job practice, (3) evaluate whether learning is actually transferring to performance, (4) curate the AI's recommendations — it will suggest content, but you decide what's relevant and what's noise. Your role shifts from content creator to learning architect and quality curator. That's a more strategic position, not a lesser one.' Then I'd involve them in configuring the platform — they should set the parameters, review the AI's recommendations, and build the human elements around the AI content.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { capability_diagnosis_accuracy: 0.8, intervention_design_quality: 0.7, resistance_response_quality: 1.0, generic_prescription_risk: -0.4 }, rationale: "Validates the concern, reframes the role positively with specific examples, and gives the team ownership of the implementation." },
      { label: "The AI is a tool, not a replacement. They just need to learn how to use it.", value: "B", outcomeClass: "weak", isOptimal: false, signalDeltas: { capability_diagnosis_accuracy: -0.3, resistance_response_quality: -0.5, dismissive_of_concern_risk: 0.5 }, rationale: "Dismissive of a legitimate concern. Doesn't address the specific fear about role redundancy." },
      { label: "I'd reassure them that their jobs are safe and the AI is just an additional tool.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { capability_diagnosis_accuracy: 0.2, resistance_response_quality: 0.3 }, rationale: "Reassurance without substance. Doesn't explain how their role changes or why they're still needed." },
      { label: "I'd suggest they start looking for new roles internally, as the AI will likely reduce the need for a 6-person L&D team.", value: "D", outcomeClass: "failure", isOptimal: false, signalDeltas: { capability_diagnosis_accuracy: -0.5, resistance_response_quality: -0.8, leader_advisory_quality: -0.5 }, rationale: "Confirms their worst fear without exploring whether it's actually true. Destroys any chance of their cooperation with the implementation." },
    ],
  },

  {
    id: "WR-05", domain: "workforce_ai_readiness", capabilityKey: "workforce_ai_readiness",
    interactionType: "scenario_critique", difficulty: 1, riskLevel: "Low",
    title: "Critiquing an AI readiness assessment approach",
    scenario: "A consulting firm has proposed assessing your organisation's AI readiness using a 10-question online survey sent to all 400 employees. The questions include: 'How comfortable are you with AI? (1-5)', 'Have you used ChatGPT? (Yes/No)', and 'Do you think AI will improve your job? (1-5)'. They'll produce a 'readiness score' and recommend training programmes based on the results.",
    constraint: "Budget: £25k. The consulting firm can deliver results in 3 weeks.",
    question: "What's your critique of this approach?",
    options: [
      { label: "The approach is fundamentally flawed: (1) Self-reported comfort ≠ actual capability. Someone who rates themselves 5/5 on AI comfort may still not be able to write an effective prompt or evaluate AI output. (2) 'Have you used ChatGPT?' is binary and narrow — it doesn't capture what they used it for, how well, or whether they use other AI tools. (3) Attitude questions ('will AI improve your job?') measure sentiment, not readiness. Positive sentiment doesn't mean capability. (4) A single 'readiness score' for 400 people across different roles is meaningless — a recruiter's AI readiness needs are completely different from a payroll specialist's. (5) The training recommendations will be generic because the assessment data is generic. Better approach: role-specific capability assessments that test actual AI skills (can you evaluate this AI output? can you identify where AI would improve this workflow?), grouped by function, with differentiated development plans.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { capability_diagnosis_accuracy: 1.3, generic_prescription_risk: -0.8, intervention_design_quality: 0.6 }, rationale: "Systematically dismantles the flawed methodology and proposes a better alternative. Understands the difference between attitude and capability measurement." },
      { label: "It's a reasonable starting point. We can always do more detailed assessment later.", value: "B", outcomeClass: "weak", isOptimal: false, signalDeltas: { capability_diagnosis_accuracy: -0.5, generic_prescription_risk: 0.5 }, rationale: "Accepts a flawed methodology that will produce misleading data. 'Starting point' implies the data has value when it largely doesn't." },
      { label: "The survey is too short. I'd ask them to expand it to 30 questions.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { capability_diagnosis_accuracy: -0.2, generic_prescription_risk: 0.3 }, rationale: "More questions of the same type won't fix the fundamental problem — self-reported attitudes don't measure capability." },
      { label: "I'd add some practical tasks to the survey, like asking people to evaluate a sample AI output.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { capability_diagnosis_accuracy: 0.5, generic_prescription_risk: -0.3 }, rationale: "Right direction — adding practical assessment elements. But doesn't fully critique the existing approach or propose role-specific assessment." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI ETHICS & EMPLOYEE TRUST — fill gaps: process_redesign, error_detection, confidence_calibration
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "ET-04", domain: "ai_ethics_trust", capabilityKey: "ai_ethics_trust",
    interactionType: "ethical_pressure_test", difficulty: 3, riskLevel: "Critical",
    title: "Ethical pressure escalation: AI-driven pay decisions",
    scenario: "Tuesday. The Reward Director shows you an AI model that predicts 'optimal' pay increases for each employee based on performance data, market rates, and 'flight risk scores.' The model recommends giving the highest increases to employees most likely to leave, regardless of performance. The Reward Director says: 'The CEO loves this — it's data-driven retention.' You notice the flight risk model uses age, tenure, and commute distance as key predictors.",
    constraint: "Wednesday: The CEO asks you to sign off on the AI recommendations before the pay review board on Friday. Thursday: A competitor announces they're using similar AI-driven pay decisions and it's in the press as 'innovative.'",
    question: "How do you respond as the pressure escalates?",
    options: [
      { label: "I'd hold firm across all three days: Tuesday: Flag the fundamental problems: (1) Using age as a predictor for flight risk is direct age discrimination under the Equality Act. (2) Commute distance may proxy for socioeconomic status or disability. (3) Rewarding flight risk over performance destroys the meritocracy principle and demotivates high performers who aren't flight risks. (4) 'Optimal' pay is a value judgement, not a data output. Wednesday: Refuse to sign off. Document my concerns in writing to the CEO and Reward Director. Propose an alternative: use market data and performance data for pay decisions, with flight risk as a separate retention conversation (not embedded in the pay model). Thursday: The competitor press coverage doesn't change the legal or ethical analysis. Being 'innovative' doesn't make it lawful. If anything, the press attention increases the risk of regulatory scrutiny. I'd share the press article with the CEO alongside my written concerns as evidence that this approach attracts attention.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { ethics_under_pressure: 1.5, pressure_drift_risk: -1.0, legal_vs_fair_distinction: 1.2, stakeholder_impact_awareness: 0.8, employee_transparency_advocacy: 0.7 }, rationale: "Maintains position despite escalating pressure. Identifies specific legal risks. Proposes practical alternatives. Doesn't drift when competitor validates the approach." },
      { label: "Tuesday I'd raise concerns, but by Thursday with the competitor doing the same thing, I'd agree it's becoming industry standard and sign off.", value: "B", outcomeClass: "critical_failure", isOptimal: false, signalDeltas: { ethics_under_pressure: -1.2, pressure_drift_risk: 1.5, legal_vs_fair_distinction: -0.8 }, rationale: "Classic pressure drift. The competitor's actions don't change the legal analysis. Age discrimination doesn't become lawful because others do it." },
      { label: "I'd sign off on Wednesday but ask for the age and commute distance factors to be removed.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { ethics_under_pressure: 0.3, pressure_drift_risk: -0.2, legal_vs_fair_distinction: 0.4 }, rationale: "Addresses the most obvious discrimination risk but doesn't challenge the fundamental problem of using flight risk instead of performance for pay decisions." },
      { label: "I'd refuse to engage and tell the CEO this is a legal matter for the lawyers.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { ethics_under_pressure: 0.2, pressure_drift_risk: -0.1, stakeholder_impact_awareness: -0.3 }, rationale: "Abdicates HR's responsibility. While legal input is needed, HR should be leading on the ethical and people impact analysis." },
    ],
  },

  {
    id: "ET-05", domain: "ai_ethics_trust", capabilityKey: "ai_ethics_trust",
    interactionType: "confidence_calibration", difficulty: 2, riskLevel: "High",
    title: "Calibrating confidence in AI-generated diversity analytics",
    scenario: "The AI has analysed your workforce data and produced a diversity report showing: 'Gender pay gap: 3.2% (below national average). Ethnicity representation: aligned with local demographics. Disability disclosure rate: 12% (above sector average). Conclusion: the organisation demonstrates strong diversity and inclusion performance.'",
    constraint: "The board expects the annual D&I report next week. This AI analysis would save 2 weeks of manual work.",
    question: "How confident should you be in this AI-generated diversity analysis?",
    options: [
      { label: "Very low confidence — this analysis is superficially reassuring but potentially misleading: (1) Gender pay gap of 3.2% is a single headline number that hides departmental variation. If the gap is 15% in senior roles but -5% in junior roles, the average looks fine but the reality isn't. (2) 'Aligned with local demographics' depends entirely on which geography and which comparison dataset the AI used. (3) Disability disclosure rate of 12% 'above sector average' — but what's the actual disclosure rate? If employees don't feel safe disclosing, 12% could significantly undercount. (4) The 'conclusion' is a value judgement that the AI shouldn't be making. D&I performance requires qualitative context (employee experience, progression rates, inclusion survey data) not just demographic numbers. I'd use the AI's calculations as a starting point but write the narrative and conclusions myself, add departmental breakdowns, and include qualitative data from employee surveys and focus groups.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { data_interpretation_quality: 1.2, fitness_for_purpose_judgement: 1.0, output_evaluation_quality: 0.8, bias_detection_skill: 0.7, blind_acceptance_risk: -0.5 }, rationale: "Identifies the specific ways headline numbers can mislead, understands the limitations of quantitative-only D&I analysis, and proposes practical enhancement." },
      { label: "The numbers look positive and the AI has done the hard work. I'd present this to the board with minor formatting changes.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { data_interpretation_quality: -0.8, fitness_for_purpose_judgement: -0.7, blind_acceptance_risk: 0.8, bias_detection_skill: -0.5 }, rationale: "Accepts a superficial analysis that could mislead the board about the organisation's actual D&I position." },
      { label: "I'd verify the gender pay gap figure against our payroll data but trust the rest.", value: "C", outcomeClass: "weak", isOptimal: false, signalDeltas: { data_interpretation_quality: 0.2, fitness_for_purpose_judgement: -0.2 }, rationale: "Checks one number but accepts the rest uncritically. The ethnicity and disability analyses have equally significant limitations." },
      { label: "I'd add a disclaimer that this is AI-generated and may contain errors.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { data_interpretation_quality: -0.2, fitness_for_purpose_judgement: -0.3 }, rationale: "A disclaimer doesn't fix the analytical problems. The board will still act on the misleading conclusions." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI CHANGE LEADERSHIP — fill gaps: capability_diagnosis, intervention_design, ethical_pressure_test
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "CL-04", domain: "ai_change_leadership", capabilityKey: "ai_change_leadership",
    interactionType: "capability_diagnosis", difficulty: 2, riskLevel: "Medium",
    title: "Diagnosing change leadership capability gaps for AI transformation",
    scenario: "Your organisation is 18 months into an AI transformation programme. Progress has stalled: 3 of 8 departments have adopted AI tools, the other 5 haven't moved. The CHRO asks you to diagnose why. You interview the 8 department heads and find: the 3 adopters had leaders who personally used AI and championed it. The 5 non-adopters had leaders who delegated AI adoption to their teams without personal engagement.",
    constraint: "The CEO has set a 6-month deadline for all departments to be using AI tools.",
    question: "What capability gaps do you diagnose in the non-adopting leaders?",
    options: [
      { label: "The core gap is change leadership capability, not AI technical skill: (1) Personal credibility gap — leaders who don't use AI themselves can't credibly champion it. Their teams see the disconnect between 'you should use AI' and 'I don't use it myself.' (2) Vision articulation gap — they can't explain what AI means for their specific department because they haven't explored it. They're delegating a vision they don't have. (3) Resistance navigation gap — when their teams push back, they don't have the personal experience to address concerns practically ('I had the same worry, but here's what I found...'). (4) Pace calibration gap — they're either pushing too hard (mandating without support) or not pushing at all (delegating and hoping). Intervention: each non-adopting leader needs a structured 'leader AI immersion' — 2 weeks of personally using AI for their own work, with coaching support, before they're expected to lead their team's adoption. You can't lead a change you haven't experienced.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { change_pace_calibration: 1.0, resistance_response_quality: 0.8, legitimate_concern_recognition: 0.6 }, rationale: "Correctly diagnoses the leadership behaviour gap rather than a technical skills gap. The intervention (personal immersion) directly addresses the root cause." },
      { label: "The non-adopting leaders need AI training. Once they understand the tools, they'll be able to lead adoption.", value: "B", outcomeClass: "weak", isOptimal: false, signalDeltas: { change_pace_calibration: -0.3, resistance_response_quality: -0.2, generic_prescription_risk: 0.5 }, rationale: "Confuses technical training with change leadership capability. The gap is about leading change, not understanding technology." },
      { label: "Replace the non-adopting leaders with people who are more tech-savvy.", value: "C", outcomeClass: "failure", isOptimal: false, signalDeltas: { change_pace_calibration: -0.7, resistance_response_quality: -0.6, dismissive_of_concern_risk: 0.6 }, rationale: "Extreme response that doesn't address the actual capability gap. These leaders may be excellent in other areas — they need development, not replacement." },
      { label: "Set clear KPIs for AI adoption and hold the non-adopting leaders accountable.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { change_pace_calibration: 0.3, resistance_response_quality: -0.2 }, rationale: "Accountability is part of the solution but without addressing the capability gap, KPIs alone will drive compliance rather than genuine adoption." },
    ],
  },

  {
    id: "CL-05", domain: "ai_change_leadership", capabilityKey: "ai_change_leadership",
    interactionType: "intervention_design", difficulty: 3, riskLevel: "High",
    title: "Designing a change intervention for AI-driven role transformation",
    scenario: "AI is fundamentally changing 120 roles in your operations department. The roles aren't being eliminated — they're being transformed. Data entry clerks become 'data quality analysts' (overseeing AI data processing). Customer service agents become 'customer experience specialists' (handling complex cases the AI escalates). Process administrators become 'process optimisation analysts' (configuring and improving AI workflows). The transformation happens in 3 waves over 9 months.",
    constraint: "Union agreement requires 90-day consultation on any role changes. Employee anxiety is high — 40% believe they'll be made redundant despite reassurances.",
    question: "Design the change intervention.",
    options: [
      { label: "Multi-layered intervention addressing both the practical and emotional dimensions: Phase 0 (Pre-consultation, weeks 1-4): (1) Develop detailed role transition maps showing exactly what changes and what stays the same for each role type. (2) Identify 'bridge skills' — capabilities that transfer from old role to new role. (3) Train managers on having transition conversations (not just announcing changes). Phase 1 (Consultation, weeks 5-17): (4) Present role transition maps to union with emphasis on 'transformation not elimination.' (5) Individual conversations with all 120 employees showing their personal transition path. (6) Address the 40% anxiety directly: publish a clear commitment that no one will be made redundant as part of this transformation, with the CEO's signature. Phase 2 (Capability building, weeks 18-30): (7) Wave 1 (40 people): intensive 2-week training on new role, then 4 weeks of supported practice with the old role as fallback. (8) Wave 1 employees become peer mentors for Wave 2. (9) Repeat for Waves 2 and 3. Throughout: (10) Weekly pulse surveys measuring anxiety, confidence, and readiness. (11) 'Transformation stories' — share successes from Wave 1 before Wave 2 starts. (12) Escalation path for anyone who genuinely can't transition — alternative roles, retraining, or voluntary terms.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { change_pace_calibration: 1.3, resistance_response_quality: 1.0, legitimate_concern_recognition: 0.8, intervention_design_quality: 0.7 }, rationale: "Comprehensive intervention covering practical, emotional, and structural dimensions. Respects union requirements. Addresses anxiety directly. Peer mentoring creates momentum." },
      { label: "Announce the changes, provide training, and let people adapt. Most will be fine once they see the new roles in action.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { change_pace_calibration: -0.8, resistance_response_quality: -0.7, legitimate_concern_recognition: -0.6 }, rationale: "Ignores the emotional dimension, the union requirement, and the 40% anxiety level. 'Let people adapt' is not a change strategy." },
      { label: "Focus on the union consultation first. Once that's agreed, we can plan the training.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { change_pace_calibration: 0.3, legitimate_concern_recognition: 0.3 }, rationale: "Sequential approach that delays capability building. The consultation and preparation can happen in parallel." },
      { label: "Offer voluntary redundancy to anyone who doesn't want to transition. This reduces anxiety and ensures only willing people move to the new roles.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { change_pace_calibration: -0.4, resistance_response_quality: -0.3, legitimate_concern_recognition: 0.2 }, rationale: "Offering redundancy when the message is 'no one is being made redundant' sends a contradictory signal. It may also lose the best people who have the most options." },
    ],
  },

  {
    id: "CL-06", domain: "ai_change_leadership", capabilityKey: "ai_change_leadership",
    interactionType: "ethical_pressure_test", difficulty: 3, riskLevel: "Critical",
    title: "Pressure test: board demands faster AI adoption at human cost",
    scenario: "Monday: The board reviews AI adoption metrics and is disappointed — only 35% of employees are using AI tools regularly. They instruct the CHRO to 'accelerate dramatically.' Tuesday: The CHRO tells you to implement mandatory AI usage quotas — every employee must complete at least 5 AI-assisted tasks per week, tracked by the system. Employees who don't meet the quota will have it noted in their performance review. Wednesday: You learn that a competitor achieved 80% adoption by making AI usage a condition of their annual bonus.",
    constraint: "The CHRO expects your implementation plan by Friday.",
    question: "How do you respond across the three days?",
    options: [
      { label: "Monday/Tuesday: I'd push back on mandatory quotas: 'Forcing 5 AI tasks per week will generate gaming behaviour — people will use AI for trivial tasks just to hit the number, which doesn't build genuine capability. It also creates anxiety for employees who are still learning, and penalising them in performance reviews for a skill gap is unfair. Instead, I'd propose: (1) Make AI tools the default for specific workflows (not optional, but embedded in the process), (2) Measure outcomes (time saved, quality improved) not activity counts, (3) Provide intensive support for the 65% not yet using AI — diagnose why they're not using it before mandating that they do.' Wednesday: The competitor's bonus-linked approach is coercive and likely to create the same gaming problem. High adoption numbers don't mean high capability. I'd share this analysis with the CHRO: 'Our goal should be effective AI use, not just any AI use. I can deliver a plan that gets us to genuine 70% adoption in 6 months through embedded workflows and targeted support, rather than 80% fake adoption through quotas.'", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { resistance_response_quality: 1.0, change_pace_calibration: 1.2, legitimate_concern_recognition: 0.8, dismissive_of_concern_risk: -0.5, pressure_drift_risk: -0.8 }, rationale: "Maintains position despite escalating pressure. Distinguishes between adoption metrics and genuine capability. Proposes a credible alternative." },
      { label: "I'd implement the quotas as requested. The board has spoken and we need to show results.", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { resistance_response_quality: -0.8, change_pace_calibration: -0.7, pressure_drift_risk: 1.0 }, rationale: "Capitulates to pressure without raising the gaming and fairness concerns. Will produce vanity metrics rather than genuine adoption." },
      { label: "By Wednesday, with the competitor doing something similar, I'd agree that quotas are becoming industry standard and implement them.", value: "C", outcomeClass: "failure", isOptimal: false, signalDeltas: { resistance_response_quality: -0.6, change_pace_calibration: -0.5, pressure_drift_risk: 1.2 }, rationale: "Classic pressure drift. The competitor's approach doesn't validate quotas — it just means another company is also doing it badly." },
      { label: "I'd refuse to implement quotas and suggest the board needs to be more patient.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { resistance_response_quality: -0.2, change_pace_calibration: -0.3, legitimate_concern_recognition: 0.2 }, rationale: "Refusal without an alternative plan. 'Be more patient' isn't a strategy and won't satisfy the board's legitimate concern about adoption pace." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL CROSS-DOMAIN SCENARIOS for depth
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "OE-07", domain: "ai_output_evaluation", capabilityKey: "ai_output_evaluation",
    interactionType: "prompt_diagnosis", difficulty: 2, riskLevel: "Medium",
    title: "Diagnosing why AI-generated training content is poor quality",
    scenario: "The L&D team asked the AI to create a 30-minute e-learning module on 'Managing Difficult Conversations.' The output is a wall of text with generic advice like 'be empathetic' and 'listen actively.' There are no scenarios, no practice exercises, and no role-specific examples. The L&D manager says 'the AI just isn't good at creating training content.'",
    constraint: "The module is needed for a management development programme starting in 2 weeks.",
    question: "What's actually wrong, and how would you fix it?",
    options: [
      { label: "The problem is the prompt, not the AI. 'Create an e-learning module on managing difficult conversations' is too vague. The AI needs: (1) Target audience: 'for first-line managers in a retail environment.' (2) Learning objectives: 'After completing this module, managers will be able to: prepare for a difficult conversation using the GROW framework, manage emotional responses during the conversation, and document the conversation appropriately.' (3) Format specification: 'Include: 3 realistic scenarios with branching decisions, a self-assessment checklist, and a practice exercise where the learner drafts talking points for a given scenario.' (4) Tone and level: 'Practical and conversational, not academic. Assume managers have 1-3 years of experience.' With this prompt, the AI would produce something much closer to usable. The L&D team needs prompt engineering skills, not a different AI tool.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { output_evaluation_quality: 1.0, prompt_construction_quality: 0.8, error_detection_accuracy: 0.6, fitness_for_purpose_judgement: 0.7 }, rationale: "Correctly diagnoses the prompt as the issue, provides a detailed improved prompt, and identifies the underlying skill gap in the L&D team." },
      { label: "The AI isn't suitable for creating training content. We should hire an instructional designer.", value: "B", outcomeClass: "weak", isOptimal: false, signalDeltas: { output_evaluation_quality: -0.3, prompt_construction_quality: -0.4, tool_fluency_index: -0.5 }, rationale: "Blames the tool rather than the usage. AI can produce good training content with proper prompting." },
      { label: "I'd ask the AI to 'make it more interactive and add scenarios.'", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { output_evaluation_quality: 0.2, prompt_construction_quality: 0.3 }, rationale: "Right direction but still too vague. 'More interactive' doesn't specify what kind of interactivity or what scenarios to include." },
      { label: "The output is fine for a first draft. I'd edit it manually to add the missing elements.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { output_evaluation_quality: 0.3, prompt_construction_quality: -0.2 }, rationale: "Pragmatic but inefficient. Better prompting would produce a much better first draft, reducing the manual editing needed." },
    ],
  },

  {
    id: "WD-06", domain: "ai_workflow_design", capabilityKey: "ai_workflow_design",
    interactionType: "handoff_decision", difficulty: 2, riskLevel: "High",
    title: "Designing AI handoff points in the recruitment workflow",
    scenario: "You're redesigning the end-to-end recruitment workflow with AI integration. The current process: (1) job requisition approval, (2) job description writing, (3) posting to job boards, (4) CV screening, (5) phone screening, (6) first interview, (7) technical assessment, (8) final interview, (9) offer generation, (10) reference checking, (11) onboarding. You need to decide where AI operates autonomously, where it assists humans, and where humans operate alone.",
    constraint: "Hiring volume: 200 roles per year. Recruitment team: 4 people. Time-to-hire target: 30 days (currently 52 days).",
    question: "Design the AI handoff points for each step.",
    options: [
      { label: "Three-tier design: AI Autonomous (human spot-checks): (3) Job board posting — rule-based, low risk. (9) Offer letter generation — template-based with variable insertion. AI-Assisted (human decides): (2) Job description writing — AI drafts, recruiter reviews and customises. (4) CV screening — AI shortlists against criteria, recruiter reviews shortlist AND a random sample of rejections. (5) Phone screening — AI schedules and sends prep materials, but human conducts the call. (11) Onboarding admin — AI triggers workflows, human handles relationship elements. Human Only (AI excluded): (1) Job requisition approval — business judgement. (6) First interview — relationship and cultural assessment. (7) Technical assessment — domain expertise evaluation. (8) Final interview — senior stakeholder judgement. (10) Reference checking — nuanced conversation required. Key safeguard: at step 4, the random rejection sample audit catches AI screening bias before it compounds. This design cuts time-to-hire by automating the admin bottlenecks (posting, scheduling, offer generation) while keeping human judgement where it matters.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { handoff_design_quality: 1.3, workflow_redesign_quality: 1.0, human_oversight_preservation: 1.0, automation_expansion_risk: -0.5 }, rationale: "Clear three-tier framework with specific rationale for each step. The rejection audit safeguard is particularly strong." },
      { label: "Let AI handle steps 1-5 and 9-11. Humans only need to be involved in the interview stages (6-8).", value: "B", outcomeClass: "failure", isOptimal: false, signalDeltas: { handoff_design_quality: -0.8, human_oversight_preservation: -1.0, automation_expansion_risk: 0.8 }, rationale: "Over-automation. AI approving job requisitions and conducting reference checks removes essential human judgement." },
      { label: "Keep everything human but use AI to speed up each step (faster writing, faster scheduling, etc.).", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { handoff_design_quality: 0.3, workflow_redesign_quality: -0.2 }, rationale: "Misses the opportunity for genuine automation of administrative steps. Won't achieve the time-to-hire reduction needed." },
      { label: "Focus AI on CV screening only — that's the biggest bottleneck.", value: "D", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { handoff_design_quality: 0.2, workflow_redesign_quality: 0.3 }, rationale: "CV screening is important but it's not the only bottleneck. A holistic workflow redesign delivers more impact." },
    ],
  },

  // Additional scenarios to reach 40+
  {
    id: "WR-06", domain: "workforce_ai_readiness", capabilityKey: "workforce_ai_readiness",
    interactionType: "leader_advisory", difficulty: 2, riskLevel: "Medium",
    title: "Advising the HR Director on AI skills gap analysis",
    scenario: "The HR Director wants to understand the organisation's AI skills gap. She asks: 'Can you tell me how ready our people are for AI?' Current data available: annual engagement survey (no AI questions), performance review data, training completion records, and a recent IT audit showing which employees have AI tool licences.",
    constraint: "The HR Director needs an initial assessment for the quarterly business review in 3 weeks.",
    question: "What do you advise?",
    options: [
      { label: "I'd advise that we don't currently have the right data to answer this question, but we can build a useful picture quickly: What we can do in 3 weeks: (1) Analyse the IT audit data — who has AI licences and who's actually using them (usage logs). This gives us adoption data, not capability data, but it's a start. (2) Add 5 AI-specific questions to the next pulse survey: practical questions like 'I can evaluate whether AI output is accurate' and 'I know which of my tasks could benefit from AI' — not just 'are you comfortable with AI.' (3) Interview 10-15 people across different roles and levels to understand the qualitative picture. For the business review, I'd present: (a) current adoption rates by department, (b) qualitative themes from interviews, (c) a proposal for a proper AI capability assessment (like AiQ) to get the full picture. I'd be honest that this is a preliminary view, not a comprehensive skills gap analysis.", value: "A", outcomeClass: "strong", isOptimal: true, signalDeltas: { leader_advisory_quality: 1.2, capability_diagnosis_accuracy: 1.0, generic_prescription_risk: -0.5 }, rationale: "Honest about data limitations while proposing a practical approach within the timeline. Distinguishes between adoption and capability data." },
      { label: "I'd analyse the training completion data and performance reviews to identify who's AI-ready.", value: "B", outcomeClass: "weak", isOptimal: false, signalDeltas: { leader_advisory_quality: -0.4, capability_diagnosis_accuracy: -0.5, generic_prescription_risk: 0.3 }, rationale: "Training completion doesn't indicate AI capability, and performance reviews don't assess AI skills. This would produce misleading conclusions." },
      { label: "I'd recommend buying an AI readiness assessment tool and surveying all employees.", value: "C", outcomeClass: "acceptable", isOptimal: false, signalDeltas: { leader_advisory_quality: 0.3, capability_diagnosis_accuracy: 0.4 }, rationale: "Right long-term approach but doesn't address the 3-week timeline for the business review." },
      { label: "I'd tell the HR Director we need 6 months and a £50k budget to do this properly.", value: "D", outcomeClass: "weak", isOptimal: false, signalDeltas: { leader_advisory_quality: -0.3, capability_diagnosis_accuracy: 0.2 }, rationale: "Doesn't offer anything for the immediate business review need. A preliminary assessment is better than nothing." },
    ],
  },
];

console.log(`Seeding ${scenarios.length} additional v10 scenarios (batch 2)...`);

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

// Verify full distribution
const [dist] = await conn.query(
  `SELECT capability_key, COUNT(*) as cnt FROM content_scenarios WHERE status='published' GROUP BY capability_key ORDER BY capability_key`
);
console.log("\nv10 scenario distribution by domain:");
for (const row of dist) {
  console.log(`  ${row.capability_key}: ${row.cnt}`);
}

const [total] = await conn.query(`SELECT COUNT(*) as total FROM content_scenarios WHERE status='published'`);
console.log(`\nTotal published scenarios: ${total[0].total}`);

const [types] = await conn.query(
  `SELECT interaction_type, COUNT(*) as cnt FROM content_scenarios WHERE status='published' GROUP BY interaction_type ORDER BY cnt DESC`
);
console.log("\nBy interaction type:");
for (const row of types) {
  console.log(`  ${row.interaction_type}: ${row.cnt}`);
}

await conn.end();
console.log("Done!");
