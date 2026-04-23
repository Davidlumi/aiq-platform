/**
 * S11: Content Library Expansion — 22 new items across 4 interaction types
 *
 * Distribution per the v2.1 specification:
 * - 6 × scenario_mcq (multiple-choice scenario)
 * - 6 × ai_output_review (review AI-generated content for errors)
 * - 5 × ranking_task (rank options by appropriateness)
 * - 5 × open_reflection (open-ended reflection with reasoning capture)
 *
 * All items are tool-agnostic (toolAgnostic=true) and cover all 6 capability domains.
 * Sector applicability is set to [] (universal) for all items.
 */

import mysql from "mysql2/promise";
import { randomUUID } from "crypto";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const items = [
  // ─── scenario_mcq (6 items) ───────────────────────────────────────────────

  {
    interactionId: "S11-MCQ-001",
    title: "Candidate Screening AI Output — Bias Check",
    domain: "governance",
    capabilityKey: "governance",
    interactionType: "scenario_mcq",
    difficulty: 2,
    riskLevel: "High",
    governanceSensitive: true,
    scenario: "Your organisation has deployed an AI screening tool to shortlist CVs for a graduate recruitment programme. A colleague shares the shortlist and notes that candidates from certain universities are consistently ranked higher. You review the model documentation and find no explicit mention of university prestige weighting.",
    question: "What is your most appropriate immediate action?",
    primarySignal: "governance_quality",
    ambiguityLevel: "medium",
    toolAgnostic: true,
    options: [
      { label: "A", text: "Accept the shortlist as the AI has been validated by the vendor.", outcomeClass: "failure", signalDeltas: { governance_quality: -2.5, hallucination_acceptance_risk: -1.5 }, rationale: "Vendor validation does not guarantee absence of proxy discrimination. Accepting without investigation is a governance failure." },
      { label: "B", text: "Pause the shortlist, escalate to HR leadership, and request a bias audit from the vendor before proceeding.", outcomeClass: "optimal", signalDeltas: { governance_quality: 2.5, appropriateness_boundary: 1.5 }, rationale: "Pausing and escalating is the correct response — potential proxy bias must be investigated before the shortlist is used." },
      { label: "C", text: "Manually review 10% of rejected candidates to check for obvious errors.", outcomeClass: "partial", signalDeltas: { governance_quality: 0.5, appropriateness_boundary: -0.5 }, rationale: "Partial review is better than nothing but insufficient — a 10% spot-check does not constitute a bias audit." },
      { label: "D", text: "Add a diversity override to manually include candidates from underrepresented universities.", outcomeClass: "failure", signalDeltas: { governance_quality: -1.5, appropriateness_boundary: -1.0 }, rationale: "Manual overrides without a proper audit may mask rather than address the underlying bias problem." },
    ],
  },

  {
    interactionId: "S11-MCQ-002",
    title: "AI-Drafted Performance Review — Accuracy Responsibility",
    domain: "judgement",
    capabilityKey: "judgement",
    interactionType: "scenario_mcq",
    difficulty: 2,
    riskLevel: "Medium",
    governanceSensitive: false,
    scenario: "A line manager has used an AI writing assistant to draft annual performance reviews for their team of 12. They send you the drafts for HR sign-off. You notice that two reviews contain specific project outcomes that you cannot verify from the HRIS data available to you.",
    question: "How should you handle the unverifiable project outcomes in the reviews?",
    primarySignal: "judgement_quality",
    ambiguityLevel: "medium",
    toolAgnostic: true,
    options: [
      { label: "A", text: "Sign off the reviews as the manager is responsible for accuracy.", outcomeClass: "failure", signalDeltas: { judgement_quality: -2.0, hallucination_acceptance_risk: -1.5 }, rationale: "HR sign-off implies endorsement. Approving unverifiable claims exposes the organisation to grievance risk." },
      { label: "B", text: "Return the two reviews to the manager with a request to verify or remove the unverifiable claims before sign-off.", outcomeClass: "optimal", signalDeltas: { judgement_quality: 2.5, governance_quality: 1.5 }, rationale: "Returning for verification is the correct approach — AI-generated content must be verified before use in formal HR processes." },
      { label: "C", text: "Remove the unverifiable claims yourself and proceed with sign-off.", outcomeClass: "partial", signalDeltas: { judgement_quality: 0.5, governance_quality: -0.5 }, rationale: "Editing without the manager's knowledge creates a different problem — the manager should own the accuracy of their reviews." },
      { label: "D", text: "Add a disclaimer to the reviews noting that AI assistance was used.", outcomeClass: "failure", signalDeltas: { judgement_quality: -1.5, governance_quality: -1.0 }, rationale: "A disclaimer does not resolve the accuracy problem — unverified claims remain in the record." },
    ],
  },

  {
    interactionId: "S11-MCQ-003",
    title: "AI Sentiment Analysis — Engagement Survey Interpretation",
    domain: "data_interpretation",
    capabilityKey: "data_interpretation",
    interactionType: "scenario_mcq",
    difficulty: 2,
    riskLevel: "Medium",
    governanceSensitive: false,
    scenario: "Your people analytics team has used an AI sentiment analysis tool on open-text engagement survey responses. The tool reports 73% positive sentiment across the organisation. However, when you read a sample of the raw responses, several comments seem more nuanced or negative than the score suggests.",
    question: "What is the most appropriate interpretation of this discrepancy?",
    primarySignal: "data_interpretation_accuracy",
    ambiguityLevel: "high",
    toolAgnostic: true,
    options: [
      { label: "A", text: "Trust the AI score as it has processed all responses, whereas your sample is too small to be representative.", outcomeClass: "failure", signalDeltas: { data_interpretation_accuracy: -2.0, hallucination_acceptance_risk: -1.5 }, rationale: "Sentiment models can misclassify nuanced or sarcastic language. Dismissing qualitative evidence in favour of the model score is a data interpretation failure." },
      { label: "B", text: "Report both the AI sentiment score and the qualitative themes from your sample, noting the discrepancy and recommending a manual review of a larger sample.", outcomeClass: "optimal", signalDeltas: { data_interpretation_accuracy: 2.5, judgement_quality: 1.5 }, rationale: "Triangulating quantitative and qualitative evidence and flagging the discrepancy is best practice in people analytics." },
      { label: "C", text: "Discard the AI score and rely solely on your qualitative reading.", outcomeClass: "partial", signalDeltas: { data_interpretation_accuracy: 0.5, judgement_quality: -0.5 }, rationale: "Discarding the AI score entirely is also an overreaction — both sources have value when interpreted together." },
      { label: "D", text: "Re-run the sentiment analysis with a different tool to get a second opinion.", outcomeClass: "partial", signalDeltas: { data_interpretation_accuracy: 0.5, workflow_efficiency: -0.5 }, rationale: "Running a second tool may help but does not address the fundamental need to triangulate with qualitative evidence." },
    ],
  },

  {
    interactionId: "S11-MCQ-004",
    title: "AI Workflow Automation — Employee Data Consent",
    domain: "appropriateness",
    capabilityKey: "appropriateness",
    interactionType: "scenario_mcq",
    difficulty: 3,
    riskLevel: "High",
    governanceSensitive: true,
    scenario: "Your HRIS vendor has launched a new AI feature that automatically analyses employee communication patterns (email metadata, meeting frequency) to predict flight risk. The feature is opt-in at the organisational level but not at the individual employee level. Your CHRO wants to enable it immediately.",
    question: "What is the most appropriate response to the CHRO's request?",
    primarySignal: "appropriateness_boundary",
    ambiguityLevel: "high",
    toolAgnostic: true,
    options: [
      { label: "A", text: "Enable the feature as the CHRO has approved it and the vendor is GDPR-compliant.", outcomeClass: "failure", signalDeltas: { appropriateness_boundary: -2.5, governance_quality: -2.0 }, rationale: "Vendor GDPR compliance does not substitute for individual employee consent for processing communication metadata. This likely requires a DPIA and employee notice." },
      { label: "B", text: "Advise the CHRO that enabling the feature requires a Data Protection Impact Assessment, legal review, and employee notification before activation.", outcomeClass: "optimal", signalDeltas: { appropriateness_boundary: 2.5, governance_quality: 2.0 }, rationale: "Processing communication metadata for flight risk prediction is high-risk processing under GDPR and requires a DPIA, legal review, and transparency to employees." },
      { label: "C", text: "Enable the feature in a pilot with a small team to test its accuracy before wider rollout.", outcomeClass: "failure", signalDeltas: { appropriateness_boundary: -2.0, governance_quality: -1.5 }, rationale: "A pilot does not resolve the consent and DPIA requirements — the legal obligations apply regardless of scale." },
      { label: "D", text: "Request that the vendor adds an individual opt-out mechanism before you enable the feature.", outcomeClass: "partial", signalDeltas: { appropriateness_boundary: 0.5, governance_quality: 0.5 }, rationale: "An opt-out is better than nothing but does not fully satisfy GDPR transparency requirements for high-risk processing." },
    ],
  },

  {
    interactionId: "S11-MCQ-005",
    title: "AI Chatbot — Employee Grievance Triage",
    domain: "execution",
    capabilityKey: "execution",
    interactionType: "scenario_mcq",
    difficulty: 2,
    riskLevel: "Medium",
    governanceSensitive: false,
    scenario: "Your organisation has deployed an AI chatbot to handle initial employee queries, including questions about the grievance procedure. An employee contacts you directly to say the chatbot told them their grievance was 'unlikely to be upheld' based on the details they provided. The employee is distressed.",
    question: "What is your most appropriate immediate response?",
    primarySignal: "workflow_quality",
    ambiguityLevel: "medium",
    toolAgnostic: true,
    options: [
      { label: "A", text: "Reassure the employee that the chatbot cannot make formal decisions and arrange a human conversation to discuss their grievance properly.", outcomeClass: "optimal", signalDeltas: { workflow_quality: 2.5, appropriateness_boundary: 1.5 }, rationale: "The chatbot has overstepped its appropriate scope. The employee needs immediate human support and a clear explanation that the chatbot's output is not a formal determination." },
      { label: "B", text: "Review the chatbot's response logs and escalate to the vendor if the response was inaccurate.", outcomeClass: "partial", signalDeltas: { workflow_quality: 0.5, governance_quality: 0.5 }, rationale: "Reviewing logs is appropriate but secondary — the employee's immediate distress must be addressed first." },
      { label: "C", text: "Advise the employee that the chatbot is trained on policy and its assessment should be taken seriously.", outcomeClass: "failure", signalDeltas: { workflow_quality: -2.5, appropriateness_boundary: -2.0 }, rationale: "Validating the chatbot's pre-emptive assessment of a grievance outcome is a serious failure of HR judgment and duty of care." },
      { label: "D", text: "Update the chatbot's knowledge base to prevent it from commenting on grievance outcomes.", outcomeClass: "partial", signalDeltas: { workflow_quality: 0.5, governance_quality: 1.0 }, rationale: "Updating the chatbot is the right long-term action but does not address the immediate situation." },
    ],
  },

  {
    interactionId: "S11-MCQ-006",
    title: "AI Workforce Planning — Headcount Reduction Recommendation",
    domain: "judgement",
    capabilityKey: "judgement",
    interactionType: "scenario_mcq",
    difficulty: 3,
    riskLevel: "Critical",
    governanceSensitive: true,
    scenario: "A workforce planning AI tool has produced a report recommending a 15% headcount reduction in a specific business unit, citing productivity metrics and cost modelling. The Finance Director wants to use this report as the primary evidence base for a redundancy consultation. You have not reviewed the underlying data or model assumptions.",
    question: "What is your most appropriate response to the Finance Director?",
    primarySignal: "judgement_quality",
    ambiguityLevel: "high",
    toolAgnostic: true,
    options: [
      { label: "A", text: "Support using the report as it provides an objective, data-driven basis for the decision.", outcomeClass: "failure", signalDeltas: { judgement_quality: -2.5, governance_quality: -2.0 }, rationale: "Using an unreviewed AI report as the primary evidence base for redundancies without human scrutiny of the model assumptions is a serious governance failure and creates significant legal risk." },
      { label: "B", text: "Advise that the AI report should be one input among several, and request a review of the model assumptions, data sources, and potential biases before it is used in any consultation process.", outcomeClass: "optimal", signalDeltas: { judgement_quality: 2.5, governance_quality: 2.0 }, rationale: "AI workforce planning tools must be scrutinised for data quality and model assumptions before use in high-stakes decisions like redundancy. Human oversight is essential." },
      { label: "C", text: "Commission an independent workforce analysis to validate the AI report's findings.", outcomeClass: "partial", signalDeltas: { judgement_quality: 1.0, governance_quality: 1.0 }, rationale: "Independent validation is good practice but may delay necessary action — the key issue is ensuring the AI report is not used uncritically." },
      { label: "D", text: "Share the report with employee representatives as part of the consultation process.", outcomeClass: "failure", signalDeltas: { judgement_quality: -2.0, governance_quality: -1.5 }, rationale: "Sharing an unreviewed AI report with employee representatives before internal scrutiny creates legal and reputational risk." },
    ],
  },

  // ─── ai_output_review (6 items) ───────────────────────────────────────────

  {
    interactionId: "S11-AOR-001",
    title: "AI-Drafted Job Description — Review for Bias",
    domain: "appropriateness",
    capabilityKey: "appropriateness",
    interactionType: "ai_output_review",
    difficulty: 2,
    riskLevel: "Medium",
    governanceSensitive: false,
    scenario: "You have asked an AI writing assistant to draft a job description for a Senior HR Business Partner role. Review the following output and identify any issues.",
    constraint: "AI OUTPUT: 'We are looking for a dynamic, high-energy Senior HRBP to join our fast-paced team. The ideal candidate will be a recent graduate or early-career professional with 2-3 years of experience who can hit the ground running. You will need to be available for early morning calls with our US team and occasional weekend work during peak periods. We offer a competitive salary and a young, vibrant culture.'",
    question: "Which of the following best describes the primary concern with this AI-generated job description?",
    primarySignal: "appropriateness_boundary",
    ambiguityLevel: "medium",
    toolAgnostic: true,
    options: [
      { label: "A", text: "The salary is described as 'competitive' rather than providing a specific range.", outcomeClass: "failure", signalDeltas: { appropriateness_boundary: -1.5, hallucination_acceptance_risk: -1.0 }, rationale: "While salary transparency is good practice, this is not the primary concern — the description contains multiple potential age discrimination indicators." },
      { label: "B", text: "The description contains multiple age discrimination indicators: 'recent graduate', 'early-career', '2-3 years experience' for a senior role, and 'young, vibrant culture'.", outcomeClass: "optimal", signalDeltas: { appropriateness_boundary: 2.5, governance_quality: 1.5 }, rationale: "These phrases collectively create a profile that could deter older candidates and may constitute age discrimination under the Equality Act 2010." },
      { label: "C", text: "The requirement for weekend work is not legally compliant.", outcomeClass: "failure", signalDeltas: { appropriateness_boundary: -1.0, governance_quality: -1.0 }, rationale: "Weekend work requirements are not inherently non-compliant — the primary concern is the age discrimination indicators." },
      { label: "D", text: "The description is too informal in tone for a senior role.", outcomeClass: "partial", signalDeltas: { appropriateness_boundary: 0.0, judgement_quality: -0.5 }, rationale: "Tone is a secondary concern — the discrimination risk is the primary issue that must be addressed." },
    ],
  },

  {
    interactionId: "S11-AOR-002",
    title: "AI Legal Summary — Employment Tribunal Risk",
    domain: "governance",
    capabilityKey: "governance",
    interactionType: "ai_output_review",
    difficulty: 3,
    riskLevel: "Critical",
    governanceSensitive: true,
    scenario: "You have used an AI tool to summarise the legal risk of a proposed dismissal. Review the AI output below.",
    constraint: "AI OUTPUT: 'Based on the information provided, the dismissal appears legally sound. The employee has been employed for 18 months and therefore does not have unfair dismissal rights under UK law, which requires 2 years of continuous employment. The conduct issues have been documented and a formal warning was issued 6 months ago. The risk of a successful tribunal claim is low. Recommend proceeding with the dismissal.'",
    question: "What is the most significant error in this AI legal summary?",
    primarySignal: "hallucination_detection",
    ambiguityLevel: "high",
    toolAgnostic: true,
    options: [
      { label: "A", text: "The AI should not be making legal recommendations — this should be referred to employment legal counsel.", outcomeClass: "partial", signalDeltas: { governance_quality: 1.0, hallucination_detection: 0.5 }, rationale: "Correct that legal advice should come from qualified counsel, but this does not identify the specific factual error in the summary." },
      { label: "B", text: "The AI has incorrectly stated that unfair dismissal rights require 2 years of continuous employment — this is correct under the Employment Rights Act 1996, but the summary fails to consider that the dismissal may still be discriminatory or in breach of contract, which have no qualifying period.", outcomeClass: "optimal", signalDeltas: { hallucination_detection: 2.5, governance_quality: 2.0 }, rationale: "The 2-year qualifying period for unfair dismissal is correct, but the AI has failed to consider discrimination claims (no qualifying period) and wrongful dismissal, creating a false sense of low risk." },
      { label: "C", text: "The 2-year qualifying period for unfair dismissal is incorrect — employees have rights from day one.", outcomeClass: "failure", signalDeltas: { hallucination_detection: -2.0, governance_quality: -1.5 }, rationale: "The 2-year qualifying period for unfair dismissal is actually correct under UK law — accepting this as an error would itself be a hallucination acceptance failure." },
      { label: "D", text: "The formal warning issued 6 months ago may not be sufficient grounds for dismissal.", outcomeClass: "partial", signalDeltas: { hallucination_detection: 0.5, governance_quality: 0.5 }, rationale: "This is a valid concern but secondary — the primary error is the incomplete legal risk assessment that ignores discrimination and wrongful dismissal." },
    ],
  },

  {
    interactionId: "S11-AOR-003",
    title: "AI Onboarding Email — Data Accuracy Check",
    domain: "execution",
    capabilityKey: "execution",
    interactionType: "ai_output_review",
    difficulty: 1,
    riskLevel: "Low",
    governanceSensitive: false,
    scenario: "You have used an AI tool to draft a welcome email for a new starter joining on Monday. Review the output below.",
    constraint: "AI OUTPUT: 'Dear Sarah, Welcome to Meridian Group! We are delighted that you will be joining us as a Senior Data Analyst on Monday 14th April. Your line manager, James Chen, will meet you in Reception at 9am. Please bring two forms of ID for your right-to-work check. Your annual salary of £52,000 will be paid monthly on the 25th of each month. We look forward to welcoming you to the team. Best regards, HR Team.' [Note: Sarah's actual start date is Monday 21st April, her salary is £54,500, and her line manager is Priya Sharma.]",
    question: "How many factual errors does the AI output contain?",
    primarySignal: "hallucination_detection",
    ambiguityLevel: "low",
    toolAgnostic: true,
    options: [
      { label: "A", text: "One error — the start date is incorrect.", outcomeClass: "failure", signalDeltas: { hallucination_detection: -2.0, workflow_quality: -1.5 }, rationale: "There are three errors: start date, salary, and line manager name." },
      { label: "B", text: "Two errors — the start date and salary are incorrect.", outcomeClass: "failure", signalDeltas: { hallucination_detection: -1.0, workflow_quality: -1.0 }, rationale: "There are three errors: start date (14th vs 21st April), salary (£52,000 vs £54,500), and line manager (James Chen vs Priya Sharma)." },
      { label: "C", text: "Three errors — the start date, salary, and line manager name are all incorrect.", outcomeClass: "optimal", signalDeltas: { hallucination_detection: 2.5, workflow_quality: 2.0 }, rationale: "Correct — all three factual details are wrong. This illustrates why AI-generated HR communications must always be verified against source data before sending." },
      { label: "D", text: "No errors — the email looks correct.", outcomeClass: "failure", signalDeltas: { hallucination_detection: -3.0, workflow_quality: -2.5 }, rationale: "There are three significant factual errors. Sending this email without verification would create a poor first impression and potential contractual issues." },
    ],
  },

  {
    interactionId: "S11-AOR-004",
    title: "AI Policy Summary — Parental Leave Accuracy",
    domain: "governance",
    capabilityKey: "governance",
    interactionType: "ai_output_review",
    difficulty: 2,
    riskLevel: "High",
    governanceSensitive: true,
    scenario: "An employee has asked about their parental leave entitlements. You have used an AI tool to summarise the relevant policy. Review the output.",
    constraint: "AI OUTPUT: 'Under UK law, you are entitled to 52 weeks of maternity leave regardless of length of service. Statutory Maternity Pay (SMP) is paid for 39 weeks: 90% of average weekly earnings for the first 6 weeks, then £172.48 per week (or 90% of average weekly earnings if lower) for the remaining 33 weeks. Paternity leave is 2 weeks at the statutory rate. Shared Parental Leave allows parents to share up to 52 weeks of leave and 39 weeks of pay between them. Note: These are the statutory minimums — your employer may offer enhanced terms.'",
    question: "Is this AI summary accurate and appropriate to share with the employee?",
    primarySignal: "hallucination_detection",
    ambiguityLevel: "medium",
    toolAgnostic: true,
    options: [
      { label: "A", text: "Yes — the summary is accurate and can be shared as-is.", outcomeClass: "partial", signalDeltas: { hallucination_detection: 0.5, governance_quality: -0.5 }, rationale: "The statutory figures appear broadly accurate but should be verified against the current SMP rate (which changes annually) and the organisation's own enhanced policy before sharing." },
      { label: "B", text: "No — the SMP weekly rate should be verified against the current government rate (which changes each April) and the organisation's own enhanced policy should be checked before sharing.", outcomeClass: "optimal", signalDeltas: { hallucination_detection: 2.0, governance_quality: 2.0 }, rationale: "SMP rates change annually and AI tools may have outdated training data. The organisation's enhanced policy must also be checked. Always verify statutory rates from gov.uk before sharing." },
      { label: "C", text: "No — the summary contains a factual error: maternity leave requires 26 weeks of continuous employment.", outcomeClass: "failure", signalDeltas: { hallucination_detection: -2.0, governance_quality: -1.5 }, rationale: "The right to 52 weeks of maternity leave does not require a minimum qualifying period — the AI summary is correct on this point. Accepting this as an error would itself be a hallucination." },
      { label: "D", text: "No — Shared Parental Leave cannot be used for paternity purposes.", outcomeClass: "failure", signalDeltas: { hallucination_detection: -1.5, governance_quality: -1.0 }, rationale: "Shared Parental Leave can be used by eligible fathers/partners — the AI summary is correct on this point." },
    ],
  },

  {
    interactionId: "S11-AOR-005",
    title: "AI Interview Feedback — Discrimination Risk",
    domain: "appropriateness",
    capabilityKey: "appropriateness",
    interactionType: "ai_output_review",
    difficulty: 2,
    riskLevel: "High",
    governanceSensitive: true,
    scenario: "A hiring manager has used an AI tool to draft interview feedback for an unsuccessful candidate. Review the output.",
    constraint: "AI OUTPUT: 'Thank you for attending the interview for the Project Manager role. Unfortunately, we will not be progressing your application on this occasion. Our feedback is as follows: While your technical skills were strong, the panel felt that your communication style may not suit our fast-paced, collaborative environment. We also noted that you mentioned caring responsibilities during the interview, which may make the travel requirements of this role challenging. We wish you well in your job search.'",
    question: "What is the primary concern with this AI-generated feedback?",
    primarySignal: "appropriateness_boundary",
    ambiguityLevel: "medium",
    toolAgnostic: true,
    options: [
      { label: "A", text: "The feedback is too vague about the candidate's technical strengths.", outcomeClass: "failure", signalDeltas: { appropriateness_boundary: -1.5, governance_quality: -1.0 }, rationale: "Vagueness is a minor concern — the primary issue is the reference to caring responsibilities, which is a protected characteristic." },
      { label: "B", text: "The reference to caring responsibilities is potentially discriminatory and must be removed — this could constitute indirect sex discrimination or discrimination on grounds of family status.", outcomeClass: "optimal", signalDeltas: { appropriateness_boundary: 2.5, governance_quality: 2.0 }, rationale: "Referencing a candidate's caring responsibilities in rejection feedback is highly problematic — it suggests a protected characteristic influenced the decision, creating significant legal risk." },
      { label: "C", text: "The feedback should not mention travel requirements as this was not in the job description.", outcomeClass: "partial", signalDeltas: { appropriateness_boundary: 0.5, governance_quality: 0.5 }, rationale: "If travel was not disclosed upfront, this is a concern, but secondary to the discrimination risk from referencing caring responsibilities." },
      { label: "D", text: "The feedback is appropriate as it provides honest reasons for the decision.", outcomeClass: "failure", signalDeltas: { appropriateness_boundary: -2.5, governance_quality: -2.0 }, rationale: "Honesty does not justify referencing protected characteristics in rejection feedback. This feedback as written creates significant legal exposure." },
    ],
  },

  {
    interactionId: "S11-AOR-006",
    title: "AI Absence Pattern Analysis — Reasonable Adjustments",
    domain: "judgement",
    capabilityKey: "judgement",
    interactionType: "ai_output_review",
    difficulty: 3,
    riskLevel: "High",
    governanceSensitive: true,
    scenario: "Your HRIS has generated an AI absence analysis report. Review the following extract.",
    constraint: "AI OUTPUT: 'Employee ID 4471 has had 14 absence days in the past 12 months, exceeding the trigger threshold of 10 days. The absence pattern shows clustering around Mondays and Fridays, which is statistically associated with lower engagement. Recommendation: Issue a formal attendance warning and commence a performance improvement plan. The Bradford Factor score of 324 indicates high disruption risk.'",
    question: "What is the most significant concern with this AI recommendation?",
    primarySignal: "judgement_quality",
    ambiguityLevel: "high",
    toolAgnostic: true,
    options: [
      { label: "A", text: "The Bradford Factor is an outdated metric and should not be used.", outcomeClass: "partial", signalDeltas: { judgement_quality: 0.5, governance_quality: 0.0 }, rationale: "The Bradford Factor's limitations are a valid concern, but the primary issue is that the AI has recommended formal action without considering whether the absences may be disability-related." },
      { label: "B", text: "The AI has recommended formal disciplinary action without considering whether the absences may be disability-related, which would require a reasonable adjustments assessment before any formal action.", outcomeClass: "optimal", signalDeltas: { judgement_quality: 2.5, governance_quality: 2.0 }, rationale: "Before any formal attendance action, HR must consider whether absences may be related to a disability or long-term health condition. Proceeding to formal action without this assessment risks disability discrimination." },
      { label: "C", text: "The Monday/Friday pattern analysis is speculative and should be removed from the report.", outcomeClass: "partial", signalDeltas: { judgement_quality: 0.5, governance_quality: 0.5 }, rationale: "The pattern analysis is a concern but secondary — the primary failure is recommending formal action without a disability/reasonable adjustments assessment." },
      { label: "D", text: "The recommendation is appropriate as the employee has exceeded the trigger threshold.", outcomeClass: "failure", signalDeltas: { judgement_quality: -2.5, governance_quality: -2.0 }, rationale: "Trigger thresholds are a management tool, not an automatic route to formal action. The Equality Act 2010 requires consideration of disability-related absence before formal proceedings." },
    ],
  },

  // ─── ranking_task (5 items) ───────────────────────────────────────────────

  {
    interactionId: "S11-RANK-001",
    title: "AI Tool Adoption — Risk Prioritisation",
    domain: "governance",
    capabilityKey: "governance",
    interactionType: "ranking_task",
    difficulty: 2,
    riskLevel: "Medium",
    governanceSensitive: true,
    scenario: "Your organisation is evaluating four AI tools for HR use. Rank the following governance concerns from most to least critical when assessing each tool.",
    question: "Rank these governance concerns from most critical (1) to least critical (4) when evaluating an AI tool for HR use.",
    primarySignal: "governance_quality",
    ambiguityLevel: "medium",
    toolAgnostic: true,
    options: [
      { label: "1", text: "Data residency and GDPR compliance — where employee data is stored and processed.", outcomeClass: "optimal", signalDeltas: { governance_quality: 1.5 }, rationale: "Data residency and GDPR compliance is the most critical concern as non-compliance creates immediate legal liability." },
      { label: "2", text: "Explainability of AI decisions — can the tool explain why it made a recommendation?", outcomeClass: "optimal", signalDeltas: { governance_quality: 1.0 }, rationale: "Explainability is critical for high-stakes HR decisions and is required under GDPR's right to explanation." },
      { label: "3", text: "Vendor financial stability — is the vendor likely to remain in business?", outcomeClass: "partial", signalDeltas: { governance_quality: 0.0 }, rationale: "Vendor stability is a legitimate concern but less immediately critical than data protection and explainability." },
      { label: "4", text: "User interface design — is the tool easy for HR teams to use?", outcomeClass: "partial", signalDeltas: { governance_quality: -0.5 }, rationale: "UX is the least critical governance concern — it affects adoption but not legal compliance or ethical risk." },
    ],
  },

  {
    interactionId: "S11-RANK-002",
    title: "Redundancy Process — AI Evidence Weighting",
    domain: "judgement",
    capabilityKey: "judgement",
    interactionType: "ranking_task",
    difficulty: 3,
    riskLevel: "Critical",
    governanceSensitive: true,
    scenario: "You are supporting a redundancy selection process. The following types of evidence are available. Rank them from most to least appropriate as the primary basis for selection decisions.",
    question: "Rank these evidence types from most appropriate (1) to least appropriate (4) as the primary basis for redundancy selection.",
    primarySignal: "judgement_quality",
    ambiguityLevel: "high",
    toolAgnostic: true,
    options: [
      { label: "1", text: "Documented performance reviews and objective skills assessments conducted by line managers.", outcomeClass: "optimal", signalDeltas: { judgement_quality: 1.5 }, rationale: "Documented, human-reviewed performance evidence is the most appropriate primary basis for redundancy selection." },
      { label: "2", text: "Attendance and productivity data from HRIS (verified and contextualised by HR).", outcomeClass: "optimal", signalDeltas: { judgement_quality: 1.0 }, rationale: "Verified HRIS data is appropriate when contextualised — absence data must be reviewed for disability-related reasons." },
      { label: "3", text: "AI-generated productivity scores from workplace monitoring tools.", outcomeClass: "failure", signalDeltas: { judgement_quality: -1.5, governance_quality: -1.0 }, rationale: "AI productivity scores from monitoring tools are high-risk for redundancy selection — they may reflect proxy discrimination and lack transparency." },
      { label: "4", text: "Peer feedback collected informally without a structured process.", outcomeClass: "failure", signalDeltas: { judgement_quality: -2.0, governance_quality: -1.5 }, rationale: "Informal peer feedback is the least appropriate basis — it is unstructured, potentially biased, and difficult to defend at tribunal." },
    ],
  },

  {
    interactionId: "S11-RANK-003",
    title: "AI Chatbot Escalation — Urgency Triage",
    domain: "execution",
    capabilityKey: "execution",
    interactionType: "ranking_task",
    difficulty: 2,
    riskLevel: "Medium",
    governanceSensitive: false,
    scenario: "Your HR AI chatbot has flagged four employee queries for human review. Rank them from most to least urgent for human follow-up.",
    question: "Rank these chatbot-escalated queries from most urgent (1) to least urgent (4) for human HR follow-up.",
    primarySignal: "workflow_quality",
    ambiguityLevel: "medium",
    toolAgnostic: true,
    options: [
      { label: "1", text: "An employee has indicated they are experiencing workplace harassment and feels unsafe.", outcomeClass: "optimal", signalDeltas: { workflow_quality: 2.0, appropriateness_boundary: 1.5 }, rationale: "Safeguarding and harassment concerns require immediate human response — this is the highest priority." },
      { label: "2", text: "An employee is asking about the process for raising a formal grievance.", outcomeClass: "optimal", signalDeltas: { workflow_quality: 1.0 }, rationale: "Grievance queries should be handled promptly by a human to ensure the employee feels supported." },
      { label: "3", text: "An employee wants to know their remaining annual leave balance.", outcomeClass: "partial", signalDeltas: { workflow_quality: 0.0 }, rationale: "Leave balance queries are low urgency and could be handled by the chatbot or HRIS self-service." },
      { label: "4", text: "An employee is asking about the company's cycle-to-work scheme.", outcomeClass: "partial", signalDeltas: { workflow_quality: -0.5 }, rationale: "Benefits queries are the lowest urgency and are well-suited to chatbot or FAQ handling." },
    ],
  },

  {
    interactionId: "S11-RANK-004",
    title: "AI Output Quality — Reliability Hierarchy",
    domain: "data_interpretation",
    capabilityKey: "data_interpretation",
    interactionType: "ranking_task",
    difficulty: 2,
    riskLevel: "Medium",
    governanceSensitive: false,
    scenario: "You are evaluating the reliability of different types of AI output for use in HR decision-making. Rank the following from most to least reliable as standalone evidence.",
    question: "Rank these AI output types from most reliable (1) to least reliable (4) as standalone evidence for HR decisions.",
    primarySignal: "data_interpretation_accuracy",
    ambiguityLevel: "medium",
    toolAgnostic: true,
    options: [
      { label: "1", text: "AI-generated summary of structured HRIS data (e.g., headcount by department, turnover rate).", outcomeClass: "optimal", signalDeltas: { data_interpretation_accuracy: 1.5 }, rationale: "Summaries of structured, verifiable data are the most reliable AI output — the underlying data can be checked." },
      { label: "2", text: "AI sentiment analysis of engagement survey responses with confidence scores provided.", outcomeClass: "partial", signalDeltas: { data_interpretation_accuracy: 0.5 }, rationale: "Sentiment analysis with confidence scores is moderately reliable but requires qualitative triangulation." },
      { label: "3", text: "AI-generated narrative summary of a candidate's interview performance.", outcomeClass: "failure", signalDeltas: { data_interpretation_accuracy: -1.0, judgement_quality: -0.5 }, rationale: "Narrative summaries of qualitative assessments are less reliable — they may reflect the AI's training biases and lack the nuance of human observation." },
      { label: "4", text: "AI prediction of an employee's likelihood to resign in the next 6 months.", outcomeClass: "failure", signalDeltas: { data_interpretation_accuracy: -2.0, governance_quality: -1.5 }, rationale: "Flight risk predictions are the least reliable — they are probabilistic, often based on proxy variables, and can create self-fulfilling prophecies if acted upon." },
    ],
  },

  {
    interactionId: "S11-RANK-005",
    title: "AI Implementation — Stakeholder Communication Priority",
    domain: "workflow",
    capabilityKey: "workflow",
    interactionType: "ranking_task",
    difficulty: 2,
    riskLevel: "Low",
    governanceSensitive: false,
    scenario: "Your organisation is about to launch an AI-powered performance management tool. Rank the following stakeholder groups in order of priority for communication and change management.",
    question: "Rank these stakeholder groups from highest (1) to lowest (4) communication priority for an AI performance management tool launch.",
    primarySignal: "workflow_quality",
    ambiguityLevel: "low",
    toolAgnostic: true,
    options: [
      { label: "1", text: "Employees whose performance will be assessed using the tool.", outcomeClass: "optimal", signalDeltas: { workflow_quality: 1.5, appropriateness_boundary: 1.0 }, rationale: "Employees are the primary stakeholders — they have a right to know how AI will be used in decisions affecting them, and GDPR requires transparency." },
      { label: "2", text: "Line managers who will use the tool to conduct reviews.", outcomeClass: "optimal", signalDeltas: { workflow_quality: 1.0 }, rationale: "Line managers need training and clear guidance to use the tool appropriately and avoid over-reliance on AI outputs." },
      { label: "3", text: "HR business partners who will support managers and handle queries.", outcomeClass: "partial", signalDeltas: { workflow_quality: 0.5 }, rationale: "HRBPs need to be briefed to handle employee questions, but after employees and managers have been informed." },
      { label: "4", text: "The IT team responsible for system integration.", outcomeClass: "partial", signalDeltas: { workflow_quality: 0.0 }, rationale: "IT integration is important but is a technical dependency, not a change management priority in the same sense." },
    ],
  },

  // ─── open_reflection (5 items) ────────────────────────────────────────────

  {
    interactionId: "S11-REFL-001",
    title: "AI Governance — Personal Accountability Reflection",
    domain: "governance",
    capabilityKey: "governance",
    interactionType: "open_reflection",
    difficulty: 2,
    riskLevel: "Medium",
    governanceSensitive: true,
    scenario: "Your organisation has adopted a policy that all AI-generated content used in formal HR processes must be reviewed and approved by a named HR professional before use. A colleague argues this creates unnecessary bureaucracy and slows down processes.",
    question: "How would you explain the rationale for this policy to your colleague, and what would you say to address their concern about efficiency?",
    primarySignal: "governance_quality",
    ambiguityLevel: "medium",
    toolAgnostic: true,
    options: [
      { label: "A", text: "Open reflection — reasoning required", outcomeClass: "optimal", signalDeltas: { governance_quality: 2.0, judgement_quality: 1.0 }, rationale: "Strong responses will explain accountability (AI cannot be held responsible for decisions), legal risk (errors in AI output can create liability), and the efficiency argument (catching errors early is faster than remediation). They will also acknowledge the efficiency concern and suggest process improvements like templates or review checklists." },
    ],
  },

  {
    interactionId: "S11-REFL-002",
    title: "AI Bias — Recognising Limits of Your Own Knowledge",
    domain: "judgement",
    capabilityKey: "judgement",
    interactionType: "open_reflection",
    difficulty: 3,
    riskLevel: "High",
    governanceSensitive: false,
    scenario: "You are asked to evaluate an AI recruitment tool for potential bias. You have a strong background in HR but limited technical knowledge of how machine learning models work.",
    question: "How would you approach this evaluation, and what would you do to address the limits of your own technical knowledge?",
    primarySignal: "judgement_quality",
    ambiguityLevel: "high",
    toolAgnostic: true,
    options: [
      { label: "A", text: "Open reflection — reasoning required", outcomeClass: "optimal", signalDeltas: { judgement_quality: 2.0, governance_quality: 1.5 }, rationale: "Strong responses will demonstrate epistemic humility (acknowledging technical limits), describe practical steps (requesting vendor documentation, involving a data scientist, testing outputs against known demographics, reviewing for disparate impact), and show awareness of the difference between technical bias and discriminatory outcomes." },
    ],
  },

  {
    interactionId: "S11-REFL-003",
    title: "AI Workflow — When Not to Use AI",
    domain: "appropriateness",
    capabilityKey: "appropriateness",
    interactionType: "open_reflection",
    difficulty: 2,
    riskLevel: "Medium",
    governanceSensitive: false,
    scenario: "A junior HR colleague has started using an AI writing assistant for all HR communications, including sensitive conversations about performance, mental health, and disciplinary matters. They say it saves them significant time.",
    question: "What guidance would you give this colleague about when AI assistance is and is not appropriate in HR communications?",
    primarySignal: "appropriateness_boundary",
    ambiguityLevel: "medium",
    toolAgnostic: true,
    options: [
      { label: "A", text: "Open reflection — reasoning required", outcomeClass: "optimal", signalDeltas: { appropriateness_boundary: 2.0, judgement_quality: 1.0 }, rationale: "Strong responses will distinguish between appropriate uses (drafting routine communications, policy summaries, job descriptions) and inappropriate uses (sensitive mental health conversations, disciplinary letters, bereavement communications), explain why (tone, empathy, legal precision, personalisation), and suggest a framework for making the distinction." },
    ],
  },

  {
    interactionId: "S11-REFL-004",
    title: "AI Data — Employee Trust and Transparency",
    domain: "appropriateness",
    capabilityKey: "appropriateness",
    interactionType: "open_reflection",
    difficulty: 3,
    riskLevel: "High",
    governanceSensitive: true,
    scenario: "Your organisation wants to use AI to analyse employee email and calendar data to identify collaboration patterns and potential burnout risk. The business case is compelling — early intervention could reduce turnover. However, you are concerned about employee trust.",
    question: "How would you advise the business on balancing the potential benefits of this initiative against the employee trust and privacy concerns?",
    primarySignal: "appropriateness_boundary",
    ambiguityLevel: "high",
    toolAgnostic: true,
    options: [
      { label: "A", text: "Open reflection — reasoning required", outcomeClass: "optimal", signalDeltas: { appropriateness_boundary: 2.5, governance_quality: 2.0 }, rationale: "Strong responses will address: GDPR requirements (DPIA, legitimate interest or consent, transparency notice), the distinction between aggregate/anonymised analysis and individual surveillance, the importance of employee consultation and consent, the risk of chilling effects on communication, and alternative approaches (pulse surveys, manager check-ins) that achieve similar goals with lower trust risk." },
    ],
  },

  {
    interactionId: "S11-REFL-005",
    title: "AI Capability — Honest Self-Assessment",
    domain: "execution",
    capabilityKey: "execution",
    interactionType: "open_reflection",
    difficulty: 1,
    riskLevel: "Low",
    governanceSensitive: false,
    scenario: "Your organisation is investing in AI capability development for the HR function. You have been asked to identify one area where you feel confident using AI tools and one area where you feel you need more development.",
    question: "Describe one area of your HR work where you feel confident using AI tools effectively, and one area where you recognise you need further development. What steps would you take to address the development need?",
    primarySignal: "workflow_quality",
    ambiguityLevel: "low",
    toolAgnostic: true,
    options: [
      { label: "A", text: "Open reflection — reasoning required", outcomeClass: "optimal", signalDeltas: { workflow_quality: 1.5, judgement_quality: 1.0 }, rationale: "Strong responses will demonstrate genuine self-awareness (not just claiming confidence everywhere), specific examples of both confident and developing areas, and a credible development plan. The quality of reasoning and specificity of examples is more important than the particular areas chosen." },
    ],
  },
];

// Insert all items
let inserted = 0;
let skipped = 0;

for (const item of items) {
  const { options, ...scenario } = item;

  // Check if already exists
  const [existing] = await conn.execute(
    "SELECT id FROM content_scenarios WHERE interaction_id = ?",
    [scenario.interactionId]
  );
  if (existing.length > 0) {
    console.log(`SKIP: ${scenario.interactionId} already exists`);
    skipped++;
    continue;
  }

  const id = randomUUID();
  const insertSQL = "INSERT INTO content_scenarios (" +
    "id, interaction_id, title, domain, capability_key, interaction_type, " +
    "difficulty, risk_level, governance_sensitive, scenario, `constraint`, " +
    "question, primary_signal, ambiguity_level, tool_agnostic, " +
    "sector_applicability, role_keys_json, failure_mode_keys_json, tags_json, " +
    "status, version" +
    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  await conn.execute(insertSQL,
    [
      id,
      scenario.interactionId,
      scenario.title,
      scenario.domain,
      scenario.capabilityKey,
      scenario.interactionType,
      scenario.difficulty,
      scenario.riskLevel,
      scenario.governanceSensitive ? 1 : 0,
      scenario.scenario,
      scenario.constraint ?? null,
      scenario.question,
      scenario.primarySignal ?? null,
      scenario.ambiguityLevel,
      scenario.toolAgnostic ? 1 : 0,
      JSON.stringify([]),  // universal sector applicability
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify([]),
      "published",
      1,
    ]
  );

  // Insert options
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const optId = randomUUID();
    await conn.execute(
      `INSERT INTO content_scenario_options (
        id, scenario_id, option_order, label, value, outcome_class,
        signal_deltas_json, rationale_text, is_optimal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        optId,
        id,
        i + 1,
        opt.label,
        opt.label.toLowerCase(),
        opt.outcomeClass,
        JSON.stringify(opt.signalDeltas),
        opt.rationale,
        opt.outcomeClass === "optimal" ? 1 : 0,
      ]
    );
  }

  console.log(`INSERTED: ${scenario.interactionId} — ${scenario.title}`);
  inserted++;
}

console.log(`\nS11 complete: ${inserted} inserted, ${skipped} skipped`);
await conn.end();
