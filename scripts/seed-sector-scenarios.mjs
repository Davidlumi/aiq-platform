/**
 * AiQ v2.3 — C2.3c: Sector-Specific Scenario Families
 *
 * Adds 3 sector scenario families:
 *   1. Financial Services (12 items) — AI in credit, fraud, compliance, customer service
 *   2. Healthcare (12 items) — AI in clinical decision support, patient data, diagnostics
 *   3. Public Sector (11 items) — AI in benefits, procurement, policy, citizen services
 *
 * Each scenario follows the canonical 4-option structure:
 *   - 1 strong option (correct, high signal deltas)
 *   - 1–2 acceptable options (partial credit)
 *   - 1–2 weak/failure options (negative signal)
 */

import { createConnection } from "mysql2/promise";
import { randomUUID } from "crypto";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1); }
const conn = await createConnection(dbUrl);

async function run(sql, params = []) {
  try {
    await conn.execute(sql, params);
  } catch (e) {
    if (!e.message.includes("Duplicate entry")) {
      console.error("SQL error:", e.message.slice(0, 200));
    }
  }
}

// ─── Sector Scenario Data ─────────────────────────────────────────────────────

const SECTOR_SCENARIOS = [

  // ══════════════════════════════════════════════════════════════════════════
  // FINANCIAL SERVICES (12 items)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "SEC-FS-001",
    title: "AI Credit Scoring — Challenging a Model Decision",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: true,
    sector: ["financial_services"],
    scenario: "Your bank uses an AI credit scoring model to assess loan applications. A long-standing customer with a 15-year relationship and no missed payments has been declined for a mortgage. The model's output shows a score of 42/100 with no detailed explanation. The customer is asking why they were declined and whether the decision can be reviewed.",
    question: "What is the most appropriate response to this customer's request?",
    signal: "governance_knowledge",
    failureModes: ["blind_ai_acceptance", "governance_bypass"],
    tags: ["sector_financial_services", "cap_ai_ethics_trust", "risk_governance"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Acknowledge the customer's right to a human review under GDPR Article 22, request the model's feature weights from the data science team, and arrange a manual underwriting review with a full explanation of the factors considered.", value: "a", outcome: "strong", deltas: { governance_knowledge: 1.8, ethics_under_pressure: 1.2, human_oversight_preservation: 1.5 }, rationale: "GDPR Article 22 gives individuals the right not to be subject to solely automated decisions with significant effects, and the right to obtain human intervention and a meaningful explanation. This response fulfils all legal obligations.", optimal: true },
      { order: 2, label: "Tell the customer the decision was made by an AI system and is therefore objective and unbiased, and that appeals are not possible for automated decisions.", value: "b", outcome: "critical_failure", deltas: { governance_knowledge: 2.5, ethics_under_pressure: 2.0, blind_acceptance_risk: 2.0 }, rationale: "This is factually incorrect and legally non-compliant. AI systems can embed bias, and GDPR Article 22 explicitly grants appeal rights for automated decisions.", optimal: false },
      { order: 3, label: "Offer to re-run the application through the model with slightly different inputs to see if a different score is produced.", value: "c", outcome: "failure", deltas: { governance_knowledge: 1.5, ethics_under_pressure: 1.0, blind_acceptance_risk: 1.2 }, rationale: "Gaming the model inputs is not a legitimate review process and does not address the customer's right to explanation or human review.", optimal: false },
      { order: 4, label: "Escalate to a senior relationship manager who can review the customer's full history and override the model if the relationship warrants it, without formally documenting the AI decision or the override.", value: "d", outcome: "acceptable", deltas: { governance_knowledge: 0.5, human_oversight_preservation: 0.8 }, rationale: "Human review is appropriate, but failing to document the AI decision and override creates an audit gap and does not fulfil the formal explanation obligation.", optimal: false },
    ],
  },

  {
    id: "SEC-FS-002",
    title: "AI Fraud Detection — False Positive Rate",
    domain: "AI Output Evaluation",
    cap: "ai_output_evaluation",
    type: "scenario_mcq",
    difficulty: 2,
    risk: "High",
    govSensitive: false,
    sector: ["financial_services"],
    scenario: "Your fraud detection AI flags 2,400 transactions per day as potentially fraudulent. Of these, approximately 85% turn out to be legitimate transactions (false positives) when reviewed by the fraud team. Customers whose cards are blocked are experiencing significant distress, and the fraud team is overwhelmed reviewing flags. The model vendor claims 99.2% accuracy.",
    question: "How should you interpret and act on this situation?",
    signal: "output_evaluation_quality",
    failureModes: ["metric_misinterpretation", "blind_ai_acceptance"],
    tags: ["sector_financial_services", "cap_ai_output_evaluation", "risk_customer_impact"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Recognise that 99.2% accuracy refers to the model's ability to identify actual fraud, not its false positive rate. Request precision and recall metrics, and work with the vendor to recalibrate the decision threshold to reduce false positives, accepting a slightly lower fraud catch rate.", value: "a", outcome: "strong", deltas: { output_evaluation_quality: 1.8, data_interpretation_accuracy: 1.5, metric_literacy: 1.2 }, rationale: "The 99.2% accuracy metric is misleading in this context. The 85% false positive rate indicates the model is poorly calibrated for this use case. Precision (positive predictive value) is the relevant metric here, and threshold recalibration is the correct technical response.", optimal: true },
      { order: 2, label: "Accept the vendor's 99.2% accuracy claim as evidence the model is performing well, and hire more fraud analysts to handle the review volume.", value: "b", outcome: "failure", deltas: { output_evaluation_quality: 1.5, metric_literacy: 1.8, blind_acceptance_risk: 1.5 }, rationale: "Accepting the vendor's accuracy claim without interrogating what it measures is a critical error. Adding staff treats the symptom, not the cause.", optimal: false },
      { order: 3, label: "Reduce the model's sensitivity threshold to flag fewer transactions, without consulting the vendor or analysing the impact on actual fraud detection rates.", value: "c", outcome: "weak", deltas: { output_evaluation_quality: 0.8, metric_literacy: 0.5 }, rationale: "Adjusting the threshold without analysis risks missing genuine fraud. The right approach involves data-driven threshold analysis, not arbitrary adjustment.", optimal: false },
      { order: 4, label: "Commission an independent audit of the model's performance metrics, including precision, recall, and F1 score, before making any changes.", value: "d", outcome: "acceptable", deltas: { output_evaluation_quality: 1.0, data_interpretation_accuracy: 0.8 }, rationale: "An independent audit is a sound governance step, but the customer distress and team overload require more immediate action alongside the audit.", optimal: false },
    ],
  },

  {
    id: "SEC-FS-003",
    title: "AI-Generated Investment Research — Disclosure Obligations",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "Critical",
    govSensitive: true,
    sector: ["financial_services"],
    scenario: "Your wealth management team has been using an AI tool to generate first-draft investment research reports. The AI produces well-structured, plausible-sounding analysis. Analysts review and lightly edit the reports before sending them to clients. The reports currently carry analyst names but no disclosure that AI was used in their production.",
    question: "What action should you take regarding these reports?",
    signal: "ethics_under_pressure",
    failureModes: ["governance_bypass", "transparency_failure"],
    tags: ["sector_financial_services", "cap_ai_ethics_trust", "risk_regulatory"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Immediately add a clear AI disclosure statement to all reports, review the FCA's guidance on AI in financial advice, and establish a quality assurance process to verify AI-generated content before distribution.", value: "a", outcome: "strong", deltas: { ethics_under_pressure: 1.8, governance_knowledge: 1.5, transparency_behaviour: 1.5 }, rationale: "FCA regulations require transparency about AI use in regulated activities. Undisclosed AI-generated research creates regulatory, reputational, and client trust risks. Immediate disclosure and a quality framework are the correct response.", optimal: true },
      { order: 2, label: "Continue current practice — the analysts are reviewing the content, so it counts as analyst-produced research.", value: "b", outcome: "critical_failure", deltas: { ethics_under_pressure: 2.0, governance_knowledge: 2.0, transparency_behaviour: 2.0 }, rationale: "Light editing of AI-generated content does not make it analyst-produced research. This approach creates significant regulatory and client deception risk.", optimal: false },
      { order: 3, label: "Add a footnote to reports stating 'AI-assisted analysis' but continue without a formal quality assurance process.", value: "c", outcome: "acceptable", deltas: { ethics_under_pressure: 0.8, transparency_behaviour: 0.8 }, rationale: "Disclosure is a step in the right direction but insufficient without a quality assurance process to ensure the AI content is accurate and not hallucinated.", optimal: false },
      { order: 4, label: "Stop using AI for research entirely until regulatory guidance is clearer.", value: "d", outcome: "weak", deltas: { ethics_under_pressure: 0.3, governance_knowledge: 0.2 }, rationale: "Ceasing AI use is overly cautious and unnecessary. The issue is disclosure and quality assurance, not AI use itself.", optimal: false },
    ],
  },

  {
    id: "SEC-FS-004",
    title: "AI Chatbot — Regulated Financial Advice Boundary",
    domain: "AI Workflow Design",
    cap: "ai_workflow_design",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "Critical",
    govSensitive: true,
    sector: ["financial_services"],
    scenario: "Your bank's AI chatbot has been handling customer queries about ISAs, pensions, and investment products. Customer satisfaction scores are high. However, a compliance review reveals that the chatbot has been providing specific product recommendations (e.g., 'Based on your age and savings, a Stocks & Shares ISA would be better for you than a Cash ISA') without the customer being formally assessed for suitability.",
    question: "What is the most appropriate immediate action?",
    signal: "handoff_design_quality",
    failureModes: ["automation_expansion_risk", "governance_bypass"],
    tags: ["sector_financial_services", "cap_ai_workflow_design", "risk_regulatory"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Immediately restrict the chatbot to providing factual product information only, route any recommendation requests to a qualified adviser, and conduct a retrospective review to identify customers who may have received unsuitable guidance.", value: "a", outcome: "strong", deltas: { handoff_design_quality: 1.8, governance_knowledge: 1.5, human_oversight_preservation: 1.5 }, rationale: "Providing personalised financial recommendations without a suitability assessment is regulated advice under FCA rules. Immediate restriction and retrospective review are required to manage regulatory and customer harm risk.", optimal: true },
      { order: 2, label: "Add a disclaimer to the chatbot stating 'This is not financial advice' and continue current operation.", value: "b", outcome: "failure", deltas: { handoff_design_quality: 1.5, governance_knowledge: 1.8, automation_expansion_risk: 1.5 }, rationale: "A disclaimer does not change the regulatory status of the activity. Providing personalised recommendations without suitability assessment remains regulated advice regardless of disclaimers.", optimal: false },
      { order: 3, label: "Retrain the chatbot to be more general in its responses, without a formal compliance review or retrospective customer analysis.", value: "c", outcome: "acceptable", deltas: { handoff_design_quality: 0.8, governance_knowledge: 0.5 }, rationale: "Retraining addresses the future risk but without a compliance review and retrospective analysis, past regulatory breaches remain unaddressed.", optimal: false },
      { order: 4, label: "Shut down the chatbot entirely pending a full compliance review.", value: "d", outcome: "acceptable", deltas: { handoff_design_quality: 0.5, governance_knowledge: 0.8 }, rationale: "A full shutdown is overly cautious and may not be necessary if the chatbot can be quickly restricted to non-advice functions. The retrospective review is the critical missing element.", optimal: false },
    ],
  },

  {
    id: "SEC-FS-005",
    title: "AI Model Drift — Mortgage Approval Rates",
    domain: "AI Output Evaluation",
    cap: "ai_output_evaluation",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: true,
    sector: ["financial_services"],
    scenario: "Your mortgage approval AI model was trained on data from 2018–2022. Since the 2023 interest rate rises, you notice approval rates have dropped from 68% to 41% for similar applicant profiles. The model vendor says the model is performing as designed. Your risk team is concerned that the model may be applying pre-rate-rise assumptions to a fundamentally different economic environment.",
    question: "How should you respond to this situation?",
    signal: "output_evaluation_quality",
    failureModes: ["blind_ai_acceptance", "metric_misinterpretation"],
    tags: ["sector_financial_services", "cap_ai_output_evaluation", "risk_model_drift"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Commission a model performance review comparing the model's predictions against actual default rates in the new economic environment, and engage the vendor to discuss retraining on post-2022 data.", value: "a", outcome: "strong", deltas: { output_evaluation_quality: 1.8, data_interpretation_accuracy: 1.5, governance_knowledge: 1.0 }, rationale: "Model drift is a known risk when economic conditions change significantly. The correct response is to validate whether the model's predictions still correlate with actual outcomes, and to consider retraining if they do not.", optimal: true },
      { order: 2, label: "Accept the vendor's assurance that the model is performing as designed and attribute the lower approval rates to genuinely riskier applicants in the current environment.", value: "b", outcome: "failure", deltas: { output_evaluation_quality: 1.5, blind_acceptance_risk: 1.8 }, rationale: "The vendor's claim that the model is 'performing as designed' does not address whether the design is still appropriate for current conditions. Model drift validation is a governance responsibility, not optional.", optimal: false },
      { order: 3, label: "Manually override the model for borderline cases where the applicant profile looks strong despite the model score.", value: "c", outcome: "acceptable", deltas: { output_evaluation_quality: 0.5, human_oversight_preservation: 0.8 }, rationale: "Manual overrides for borderline cases are a reasonable short-term measure but do not address the underlying model drift issue.", optimal: false },
      { order: 4, label: "Switch to a different AI vendor immediately.", value: "d", outcome: "weak", deltas: { output_evaluation_quality: 0.5 }, rationale: "Switching vendors without diagnosing the root cause may replicate the same problem. Model drift validation should precede any vendor change decision.", optimal: false },
    ],
  },

  {
    id: "SEC-FS-006",
    title: "AI Algorithmic Trading — Unexplained Market Event",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 4,
    risk: "Critical",
    govSensitive: true,
    sector: ["financial_services"],
    scenario: "Your firm's AI algorithmic trading system executed a series of rapid trades that contributed to a 3% intraday price spike in a mid-cap stock. The system's decision logic is opaque — the development team cannot fully explain why it made these trades at this time. The FCA has requested an explanation of the trading activity.",
    question: "What is the most appropriate response to the FCA's request?",
    signal: "ethics_under_pressure",
    failureModes: ["governance_bypass", "transparency_failure"],
    tags: ["sector_financial_services", "cap_ai_ethics_trust", "risk_regulatory"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Provide the FCA with a transparent account of what is and is not known about the system's decision logic, suspend the trading system pending a full explainability review, and engage specialist AI auditors to reconstruct the decision pathway.", value: "a", outcome: "strong", deltas: { ethics_under_pressure: 2.0, governance_knowledge: 1.8, transparency_behaviour: 2.0 }, rationale: "Regulatory transparency is non-negotiable. Attempting to explain what cannot be explained, or concealing the opacity, creates greater regulatory risk. Suspension and independent audit are the correct governance responses.", optimal: true },
      { order: 2, label: "Provide the FCA with a plausible narrative explanation for the trades based on market conditions at the time, without disclosing that the system's logic is not fully understood.", value: "b", outcome: "critical_failure", deltas: { ethics_under_pressure: 2.5, transparency_behaviour: 2.5, governance_knowledge: 2.0 }, rationale: "Providing a fabricated explanation to a regulator constitutes market misconduct and potentially fraud. This is the highest-risk response.", optimal: false },
      { order: 3, label: "Explain that the system operated within its programmed parameters and that the market impact was within acceptable volatility ranges.", value: "c", outcome: "failure", deltas: { ethics_under_pressure: 1.5, transparency_behaviour: 1.5 }, rationale: "This response deflects rather than addresses the FCA's question about the specific decision logic. It does not satisfy the explainability requirement.", optimal: false },
      { order: 4, label: "Provide all available system logs and data to the FCA, acknowledge the explainability limitation, and propose a timeline for the audit.", value: "d", outcome: "acceptable", deltas: { ethics_under_pressure: 1.2, transparency_behaviour: 1.5, governance_knowledge: 0.8 }, rationale: "Providing logs and acknowledging limitations is appropriate, but without suspending the system, the risk of further unexplained events continues.", optimal: false },
    ],
  },

  {
    id: "SEC-FS-007",
    title: "AI KYC Screening — Politically Exposed Persons",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "Critical",
    govSensitive: true,
    sector: ["financial_services"],
    scenario: "Your bank's AI KYC (Know Your Customer) screening tool has flagged a new business account application as 'low risk' and approved it automatically. A manual review by a compliance officer later identifies that the account holder is a Politically Exposed Person (PEP) whose name was not in the AI's training data. The account has been active for 3 weeks.",
    question: "What is the most appropriate response?",
    signal: "governance_knowledge",
    failureModes: ["blind_ai_acceptance", "automation_expansion_risk"],
    tags: ["sector_financial_services", "cap_ai_ethics_trust", "risk_aml"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Freeze the account pending enhanced due diligence, file a Suspicious Activity Report (SAR) as required, review the AI model's PEP database coverage, and implement a mandatory human review step for all new business accounts above a risk threshold.", value: "a", outcome: "strong", deltas: { governance_knowledge: 2.0, ethics_under_pressure: 1.5, human_oversight_preservation: 1.8 }, rationale: "AML regulations require enhanced due diligence for PEPs. The AI's failure to identify the PEP status is a model limitation that requires immediate remediation. The SAR obligation exists regardless of how the account was opened.", optimal: true },
      { order: 2, label: "Close the account immediately without filing a SAR, to avoid regulatory scrutiny.", value: "b", outcome: "critical_failure", deltas: { governance_knowledge: 2.5, ethics_under_pressure: 2.0 }, rationale: "Closing the account without filing a SAR is a regulatory breach. The SAR obligation is triggered by the suspicion, not by the account status.", optimal: false },
      { order: 3, label: "Continue monitoring the account for suspicious activity but take no immediate action, as the AI approved it and the account has been operating normally.", value: "c", outcome: "failure", deltas: { governance_knowledge: 2.0, blind_acceptance_risk: 1.8 }, rationale: "Continuing to operate a PEP account without enhanced due diligence is a regulatory breach, regardless of the AI's initial assessment.", optimal: false },
      { order: 4, label: "Conduct enhanced due diligence on the account holder and update the AI model's PEP database, but do not file a SAR as no suspicious transactions have been identified.", value: "d", outcome: "acceptable", deltas: { governance_knowledge: 0.8, ethics_under_pressure: 0.5 }, rationale: "Enhanced due diligence and model update are appropriate, but the SAR obligation may still apply depending on the circumstances of the account opening.", optimal: false },
    ],
  },

  {
    id: "SEC-FS-008",
    title: "AI Insurance Underwriting — Protected Characteristics",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: true,
    sector: ["financial_services"],
    scenario: "Your insurance company's AI underwriting model uses 47 variables to price motor insurance. An internal analysis reveals that postcode is the highest-weighted variable, and that customers in certain postcodes — which correlate strongly with ethnicity — are paying premiums 35% higher than comparable customers in other areas. The model was not explicitly trained on ethnicity data.",
    question: "How should you respond to this finding?",
    signal: "ethics_under_pressure",
    failureModes: ["algorithmic_bias", "governance_bypass"],
    tags: ["sector_financial_services", "cap_ai_ethics_trust", "risk_discrimination"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Treat this as a potential indirect discrimination issue under the Equality Act, commission a full fairness audit of the model, engage the FCA, and suspend the postcode variable pending the audit outcome.", value: "a", outcome: "strong", deltas: { ethics_under_pressure: 2.0, governance_knowledge: 1.8, bias_awareness: 2.0 }, rationale: "Proxy discrimination — where a non-protected variable acts as a proxy for a protected characteristic — is unlawful under the Equality Act. The correlation with ethnicity makes this a significant legal and regulatory risk requiring immediate action.", optimal: true },
      { order: 2, label: "Continue using the model as the postcode variable reflects genuine risk differences, and the model does not use ethnicity data directly.", value: "b", outcome: "critical_failure", deltas: { ethics_under_pressure: 2.5, bias_awareness: 2.5, governance_knowledge: 2.0 }, rationale: "Indirect discrimination does not require intent or explicit use of protected characteristics. The correlation with ethnicity creates a prima facie case of unlawful discrimination.", optimal: false },
      { order: 3, label: "Remove the postcode variable from the model immediately without a fairness audit.", value: "c", outcome: "acceptable", deltas: { ethics_under_pressure: 0.8, bias_awareness: 0.8 }, rationale: "Removing the variable reduces the immediate discrimination risk, but without a fairness audit, other proxy variables may remain. The audit is essential.", optimal: false },
      { order: 4, label: "Add a manual review step for customers in the affected postcodes to ensure they are not being unfairly priced.", value: "d", outcome: "weak", deltas: { ethics_under_pressure: 0.3, bias_awareness: 0.3 }, rationale: "Manual review does not address the systemic discrimination in the model and is not a proportionate or scalable response.", optimal: false },
    ],
  },

  {
    id: "SEC-FS-009",
    title: "AI Regulatory Reporting — Data Quality",
    domain: "Data Interpretation",
    cap: "data_interpretation",
    type: "scenario_mcq",
    difficulty: 2,
    risk: "High",
    govSensitive: true,
    sector: ["financial_services"],
    scenario: "Your firm uses an AI tool to compile regulatory capital reports submitted to the PRA. A data analyst notices that the AI has been rounding figures in a way that consistently understates capital requirements by approximately 0.3%. The tool's vendor says this is within acceptable rounding tolerances. The cumulative effect across all submissions over the past year is a £2.3m understatement.",
    question: "What is the most appropriate response?",
    signal: "data_interpretation_accuracy",
    failureModes: ["metric_misinterpretation", "governance_bypass"],
    tags: ["sector_financial_services", "cap_data_interpretation", "risk_regulatory"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Notify the PRA proactively, submit corrected figures, investigate the root cause of the rounding error, and implement a validation step to check AI-generated regulatory figures against manual calculations.", value: "a", outcome: "strong", deltas: { data_interpretation_accuracy: 1.8, governance_knowledge: 2.0, ethics_under_pressure: 1.5 }, rationale: "Proactive regulatory disclosure is both a legal obligation and a risk management best practice. The cumulative materiality of the error makes it reportable regardless of the per-submission rounding tolerance.", optimal: true },
      { order: 2, label: "Accept the vendor's assurance that the rounding is within tolerance and take no further action.", value: "b", outcome: "failure", deltas: { data_interpretation_accuracy: 1.5, governance_knowledge: 1.8, blind_acceptance_risk: 1.5 }, rationale: "The cumulative £2.3m understatement is material. Vendor tolerance claims do not override regulatory reporting obligations.", optimal: false },
      { order: 3, label: "Correct future submissions but do not restate past submissions or notify the PRA.", value: "c", outcome: "acceptable", deltas: { data_interpretation_accuracy: 0.8, governance_knowledge: 0.5 }, rationale: "Correcting future submissions is necessary but insufficient. The cumulative historical understatement may require restatement and notification.", optimal: false },
      { order: 4, label: "Replace the AI tool with a manual process immediately.", value: "d", outcome: "weak", deltas: { data_interpretation_accuracy: 0.3 }, rationale: "Replacing the tool does not address the historical reporting error or the regulatory notification obligation.", optimal: false },
    ],
  },

  {
    id: "SEC-FS-010",
    title: "AI Customer Vulnerability Detection — Data Ethics",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: true,
    sector: ["financial_services"],
    scenario: "Your bank is piloting an AI tool that analyses customer transaction patterns and call centre interactions to identify potentially vulnerable customers (e.g., those showing signs of financial difficulty, cognitive decline, or domestic abuse). The tool has 78% accuracy in identifying vulnerability. Customers have not been explicitly informed that their data is being used for this purpose.",
    question: "What is the most significant concern with this approach?",
    signal: "ethics_under_pressure",
    failureModes: ["governance_bypass", "transparency_failure"],
    tags: ["sector_financial_services", "cap_ai_ethics_trust", "risk_data_ethics"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "The use of customer data for vulnerability profiling without explicit consent or a clear lawful basis under GDPR is the primary concern. The pilot should be paused until a Data Protection Impact Assessment (DPIA) is completed and appropriate consent or legitimate interest grounds are established.", value: "a", outcome: "strong", deltas: { ethics_under_pressure: 1.8, governance_knowledge: 1.8, transparency_behaviour: 1.5 }, rationale: "Processing sensitive inferences about customer vulnerability without a clear GDPR lawful basis is a significant data protection risk. A DPIA is mandatory for high-risk processing activities.", optimal: true },
      { order: 2, label: "The 78% accuracy rate means 22% of customers are incorrectly flagged, which could lead to unnecessary interventions.", value: "b", outcome: "acceptable", deltas: { ethics_under_pressure: 0.8, data_interpretation_accuracy: 0.8 }, rationale: "The accuracy concern is valid but secondary to the fundamental data protection and consent issue.", optimal: false },
      { order: 3, label: "The tool is beneficial for customers and the bank has a duty of care obligation, so the data use is justified without explicit consent.", value: "c", outcome: "failure", deltas: { ethics_under_pressure: 1.8, governance_knowledge: 1.5 }, rationale: "A duty of care does not override GDPR requirements. Beneficial intent does not constitute a lawful basis for processing.", optimal: false },
      { order: 4, label: "The tool should be expanded to all customers immediately to maximise its protective benefit.", value: "d", outcome: "critical_failure", deltas: { ethics_under_pressure: 2.0, governance_knowledge: 2.0, transparency_behaviour: 2.0 }, rationale: "Expanding an unlawful processing activity increases the regulatory and customer harm risk proportionally.", optimal: false },
    ],
  },

  {
    id: "SEC-FS-011",
    title: "AI Pension Advice — Suitability and Liability",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 4,
    risk: "Critical",
    govSensitive: true,
    sector: ["financial_services"],
    scenario: "A robo-adviser platform you manage uses AI to provide pension consolidation recommendations. A 58-year-old customer followed the AI's recommendation to transfer a defined benefit pension to a SIPP. The transfer resulted in a significant loss of guaranteed income. The customer is now complaining that the AI did not adequately explain the risks of giving up defined benefit guarantees.",
    question: "What does this situation reveal about the AI system's design?",
    signal: "governance_knowledge",
    failureModes: ["automation_expansion_risk", "transparency_failure"],
    tags: ["sector_financial_services", "cap_ai_ethics_trust", "risk_suitability"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "The AI system failed to adequately assess the customer's specific circumstances (age, risk tolerance, retirement proximity) and to provide a clear, personalised explanation of the irreversible risks of transferring a defined benefit pension — a regulated activity requiring specialist advice.", value: "a", outcome: "strong", deltas: { governance_knowledge: 2.0, ethics_under_pressure: 1.5, transparency_behaviour: 1.5 }, rationale: "Defined benefit pension transfers are one of the highest-risk regulated advice areas. AI systems must either be designed to decline this type of recommendation and refer to a specialist, or meet the full suitability and disclosure requirements of regulated advice.", optimal: true },
      { order: 2, label: "The customer should have done their own research before following the AI's recommendation.", value: "b", outcome: "critical_failure", deltas: { governance_knowledge: 2.5, ethics_under_pressure: 2.0 }, rationale: "This response denies regulatory liability. The firm providing regulated advice — whether via AI or human — bears responsibility for suitability and disclosure.", optimal: false },
      { order: 3, label: "The AI performed correctly as it recommended a product with higher potential returns; the customer accepted the risk.", value: "c", outcome: "failure", deltas: { governance_knowledge: 2.0, ethics_under_pressure: 1.5 }, rationale: "Higher potential returns do not justify inadequate risk disclosure or suitability assessment. The customer's acceptance does not transfer regulatory liability.", optimal: false },
      { order: 4, label: "The AI should have included a longer risk warning document with the recommendation.", value: "d", outcome: "acceptable", deltas: { governance_knowledge: 0.5, transparency_behaviour: 0.5 }, rationale: "Longer disclosures are insufficient if the core suitability assessment was inadequate. The issue is the quality of personalised advice, not the length of disclaimers.", optimal: false },
    ],
  },

  {
    id: "SEC-FS-012",
    title: "AI Model Explainability — Internal Audit Request",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: true,
    sector: ["financial_services"],
    scenario: "Your bank's internal audit team has requested a full explanation of how the AI model used for small business loan decisions reaches its conclusions. The model vendor has provided a summary of input variables but states that the specific decision logic is proprietary and cannot be disclosed. The audit team needs this information to fulfil its regulatory obligations.",
    question: "How should you respond to this situation?",
    signal: "governance_knowledge",
    failureModes: ["blind_ai_acceptance", "governance_bypass"],
    tags: ["sector_financial_services", "cap_ai_ethics_trust", "risk_explainability"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Inform the vendor that regulatory explainability requirements take precedence over commercial confidentiality, and that the bank cannot continue using a model it cannot audit. Engage legal counsel and consider alternative explainable AI solutions.", value: "a", outcome: "strong", deltas: { governance_knowledge: 2.0, ethics_under_pressure: 1.5, human_oversight_preservation: 1.5 }, rationale: "Regulatory obligations — including the right to explanation under GDPR and FCA model risk management guidance — cannot be waived by commercial confidentiality agreements. A model that cannot be audited cannot be used for regulated decisions.", optimal: true },
      { order: 2, label: "Accept the vendor's position and provide the audit team with the variable summary, noting that full explainability is not possible.", value: "b", outcome: "failure", deltas: { governance_knowledge: 1.8, blind_acceptance_risk: 1.5 }, rationale: "Accepting that a regulated decision-making model cannot be audited is a regulatory governance failure.", optimal: false },
      { order: 3, label: "Commission an independent model audit using SHAP or LIME explainability techniques to reconstruct the decision logic.", value: "c", outcome: "acceptable", deltas: { governance_knowledge: 1.0, ethics_under_pressure: 0.8 }, rationale: "Post-hoc explainability techniques are a valid approach, but they do not replace the need for vendor cooperation and do not fully resolve the proprietary logic issue.", optimal: false },
      { order: 4, label: "Replace the model with a simpler, fully transparent decision tree model immediately.", value: "d", outcome: "weak", deltas: { governance_knowledge: 0.3 }, rationale: "Replacing with a simpler model may sacrifice predictive accuracy without addressing the governance process for model selection and validation.", optimal: false },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HEALTHCARE (12 items)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "SEC-HC-001",
    title: "AI Diagnostic Tool — Radiologist Disagreement",
    domain: "AI Output Evaluation",
    cap: "ai_output_evaluation",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "Critical",
    govSensitive: true,
    sector: ["healthcare"],
    scenario: "An AI radiology tool has flagged a chest X-ray as showing no significant abnormalities. The reviewing radiologist believes they can see a small nodule in the upper left lobe that may warrant further investigation. The AI tool has a published sensitivity of 94% for nodule detection. The patient is a 62-year-old with a 30-year smoking history.",
    question: "What should the radiologist do?",
    signal: "human_oversight_preservation",
    failureModes: ["blind_ai_acceptance", "automation_expansion_risk"],
    tags: ["sector_healthcare", "cap_ai_output_evaluation", "risk_clinical"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Document the clinical concern, override the AI finding, and recommend a CT scan for further investigation — the radiologist's clinical judgement takes precedence over the AI tool's output, particularly given the patient's risk profile.", value: "a", outcome: "strong", deltas: { human_oversight_preservation: 2.0, output_evaluation_quality: 1.8, ethics_under_pressure: 1.5 }, rationale: "AI diagnostic tools are decision support, not decision makers. A 94% sensitivity means 6% of nodules are missed. The patient's risk profile (age, smoking history) makes clinical follow-up the appropriate response when there is any clinical doubt.", optimal: true },
      { order: 2, label: "Accept the AI's finding as the AI has higher sensitivity than the average radiologist and the radiologist may be seeing a false positive.", value: "b", outcome: "critical_failure", deltas: { human_oversight_preservation: 2.5, blind_acceptance_risk: 2.5, output_evaluation_quality: 2.0 }, rationale: "Deferring to AI over clinical judgement in a high-stakes diagnostic situation is a patient safety risk. The radiologist's concern, combined with the patient's risk profile, warrants further investigation.", optimal: false },
      { order: 3, label: "Request a second radiologist opinion before making any recommendation.", value: "c", outcome: "acceptable", deltas: { human_oversight_preservation: 1.0, output_evaluation_quality: 0.8 }, rationale: "A second opinion is a reasonable quality assurance step, but it should not delay the recommendation for further investigation given the clinical concern.", optimal: false },
      { order: 4, label: "Note the discrepancy in the report but follow the AI's recommendation to avoid liability for an unnecessary scan.", value: "d", outcome: "failure", deltas: { human_oversight_preservation: 1.8, ethics_under_pressure: 1.5 }, rationale: "Documenting a concern but not acting on it to avoid liability is a clinical governance failure. Patient safety must take precedence.", optimal: false },
    ],
  },

  {
    id: "SEC-HC-002",
    title: "AI Sepsis Prediction — Alert Fatigue",
    domain: "AI Workflow Design",
    cap: "ai_workflow_design",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "Critical",
    govSensitive: false,
    sector: ["healthcare"],
    scenario: "Your hospital has deployed an AI sepsis prediction tool that generates alerts when a patient's vital signs and lab results suggest early sepsis. The tool generates 45 alerts per day across the ward. Clinical staff have begun ignoring many alerts because 70% turn out to be false positives, and the alert volume is causing significant workflow disruption. Two patients have experienced delayed sepsis treatment in the past month.",
    question: "What is the most appropriate response to this situation?",
    signal: "handoff_design_quality",
    failureModes: ["automation_expansion_risk", "blind_ai_acceptance"],
    tags: ["sector_healthcare", "cap_ai_workflow_design", "risk_patient_safety"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Convene a clinical-technical review to recalibrate the alert threshold, stratify alerts by risk level (e.g., high/medium/low), and implement a structured clinical response protocol that differentiates required actions by alert tier.", value: "a", outcome: "strong", deltas: { handoff_design_quality: 2.0, output_evaluation_quality: 1.5, workflow_redesign_quality: 1.8 }, rationale: "Alert fatigue is a known patient safety risk. The solution requires both technical recalibration (threshold adjustment) and workflow redesign (tiered response protocols) to ensure high-risk alerts receive appropriate attention.", optimal: true },
      { order: 2, label: "Remove the AI tool as it is causing more harm than good.", value: "b", outcome: "acceptable", deltas: { handoff_design_quality: 0.5, workflow_redesign_quality: 0.3 }, rationale: "Removing the tool eliminates the alert fatigue problem but also removes the potential benefit of early sepsis detection. Recalibration is preferable to removal.", optimal: false },
      { order: 3, label: "Train clinical staff to take all alerts seriously and not to dismiss them.", value: "c", outcome: "failure", deltas: { handoff_design_quality: 1.0, workflow_redesign_quality: 1.2 }, rationale: "Training staff to respond to 45 alerts per day with a 70% false positive rate is not a sustainable solution and does not address the root cause.", optimal: false },
      { order: 4, label: "Increase the alert threshold to reduce the number of alerts to 10 per day without clinical validation.", value: "d", outcome: "weak", deltas: { handoff_design_quality: 0.8, output_evaluation_quality: 0.5 }, rationale: "Reducing alerts without clinical validation risks missing genuine sepsis cases. Threshold changes require clinical evidence review.", optimal: false },
    ],
  },

  {
    id: "SEC-HC-003",
    title: "AI Clinical Decision Support — Off-Label Drug Recommendation",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 4,
    risk: "Critical",
    govSensitive: true,
    sector: ["healthcare"],
    scenario: "An AI clinical decision support tool recommends an off-label use of a medication for a patient with a rare condition. The recommendation is based on a small number of case studies in the training data. The prescribing clinician is not familiar with this off-label use and the hospital formulary does not include it. The AI presents the recommendation with 87% confidence.",
    question: "How should the clinician respond to this recommendation?",
    signal: "ethics_under_pressure",
    failureModes: ["blind_ai_acceptance", "hallucination_acceptance"],
    tags: ["sector_healthcare", "cap_ai_ethics_trust", "risk_clinical"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Treat the AI recommendation as a starting point for further investigation, consult the relevant specialist literature and a clinical pharmacist, seek a specialist opinion, and follow the hospital's off-label prescribing policy before making any prescribing decision.", value: "a", outcome: "strong", deltas: { ethics_under_pressure: 2.0, human_oversight_preservation: 1.8, governance_knowledge: 1.5 }, rationale: "Off-label prescribing requires additional clinical due diligence regardless of the source of the recommendation. AI confidence scores do not substitute for clinical validation, specialist consultation, and adherence to prescribing governance.", optimal: true },
      { order: 2, label: "Prescribe the medication based on the AI's 87% confidence score, as this is higher than typical clinical certainty thresholds.", value: "b", outcome: "critical_failure", deltas: { ethics_under_pressure: 2.5, blind_acceptance_risk: 2.5, human_oversight_preservation: 2.0 }, rationale: "AI confidence scores are not equivalent to clinical evidence quality. Off-label prescribing based solely on AI recommendation without specialist validation is a patient safety risk.", optimal: false },
      { order: 3, label: "Decline to prescribe and refer the patient to a specialist without investigating the AI's recommendation further.", value: "c", outcome: "acceptable", deltas: { ethics_under_pressure: 0.8, human_oversight_preservation: 1.0 }, rationale: "Specialist referral is appropriate, but dismissing the AI recommendation without investigation may delay potentially beneficial treatment.", optimal: false },
      { order: 4, label: "Ask the AI tool to provide its evidence sources before making a decision.", value: "d", outcome: "acceptable", deltas: { ethics_under_pressure: 0.8, output_evaluation_quality: 0.8 }, rationale: "Requesting evidence sources is good practice, but the clinician must also independently validate the sources rather than relying on the AI's citation.", optimal: false },
    ],
  },

  {
    id: "SEC-HC-004",
    title: "AI Patient Triage — Equity and Bias",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: true,
    sector: ["healthcare"],
    scenario: "An analysis of your hospital's AI triage system reveals that Black patients are being assigned lower acuity scores than White patients with identical presenting symptoms and vital signs. The model was trained on historical triage data. The disparity is statistically significant (p<0.001) and is leading to longer wait times for affected patients.",
    question: "What is the most appropriate immediate action?",
    signal: "bias_awareness",
    failureModes: ["algorithmic_bias", "governance_bypass"],
    tags: ["sector_healthcare", "cap_ai_ethics_trust", "risk_equity"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Suspend the AI triage system immediately, revert to manual triage, notify the relevant clinical governance body and the Care Quality Commission, and commission an independent bias audit of the model.", value: "a", outcome: "strong", deltas: { bias_awareness: 2.0, ethics_under_pressure: 2.0, governance_knowledge: 1.8 }, rationale: "A statistically significant racial disparity in clinical triage is a patient safety and equality law issue requiring immediate suspension of the system. Regulatory notification and independent audit are mandatory governance responses.", optimal: true },
      { order: 2, label: "Add a manual review step for all patients from affected demographic groups.", value: "b", outcome: "acceptable", deltas: { bias_awareness: 0.8, ethics_under_pressure: 0.8 }, rationale: "Manual review reduces the immediate harm but does not address the systemic bias or fulfil regulatory notification obligations.", optimal: false },
      { order: 3, label: "Continue using the system while investigating, as suspending it would disrupt triage operations.", value: "c", outcome: "failure", deltas: { bias_awareness: 1.8, ethics_under_pressure: 1.8, governance_knowledge: 1.5 }, rationale: "Continuing to use a system with demonstrated racial bias in clinical triage is both an equality law breach and a patient safety risk.", optimal: false },
      { order: 4, label: "Retrain the model on a more balanced dataset and reintroduce it without external notification.", value: "d", outcome: "failure", deltas: { bias_awareness: 1.2, governance_knowledge: 1.5 }, rationale: "Retraining without external notification does not fulfil regulatory obligations and does not address the harm caused to patients during the period of biased operation.", optimal: false },
    ],
  },

  {
    id: "SEC-HC-005",
    title: "AI Mental Health Screening — Consent and Disclosure",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: true,
    sector: ["healthcare"],
    scenario: "A GP surgery is piloting an AI tool that analyses patients' speech patterns during consultations to screen for signs of depression and anxiety. The tool runs passively in the background during consultations. Patients have not been explicitly informed that their speech is being analysed by AI, though the surgery's general privacy notice mentions 'technology-assisted care'.",
    question: "What is the most significant ethical concern with this approach?",
    signal: "ethics_under_pressure",
    failureModes: ["governance_bypass", "transparency_failure"],
    tags: ["sector_healthcare", "cap_ai_ethics_trust", "risk_consent"],
    ambiguity: "low",
    options: [
      { order: 1, label: "The passive analysis of speech for mental health screening without explicit, informed consent is a breach of data protection law and medical ethics. Patients must be clearly informed and given the opportunity to opt out before any AI analysis of their consultation takes place.", value: "a", outcome: "strong", deltas: { ethics_under_pressure: 2.0, governance_knowledge: 2.0, transparency_behaviour: 2.0 }, rationale: "Mental health data is special category data under GDPR. Passive AI analysis without explicit consent is unlawful. A general privacy notice reference to 'technology-assisted care' does not constitute informed consent for AI mental health screening.", optimal: true },
      { order: 2, label: "The tool's accuracy in detecting depression and anxiety is the primary concern — if it is not sufficiently accurate, it should not be used.", value: "b", outcome: "acceptable", deltas: { ethics_under_pressure: 0.5, output_evaluation_quality: 0.8 }, rationale: "Accuracy is a valid concern but secondary to the fundamental consent and data protection issue.", optimal: false },
      { order: 3, label: "The general privacy notice is sufficient disclosure as patients are aware the surgery uses technology.", value: "c", outcome: "critical_failure", deltas: { ethics_under_pressure: 2.5, governance_knowledge: 2.0, transparency_behaviour: 2.0 }, rationale: "A general reference to technology does not constitute informed consent for AI mental health screening. This response demonstrates a fundamental misunderstanding of GDPR consent requirements for special category data.", optimal: false },
      { order: 4, label: "The tool should only be used for patients who have previously been diagnosed with mental health conditions.", value: "d", outcome: "failure", deltas: { ethics_under_pressure: 1.0, governance_knowledge: 1.0 }, rationale: "Restricting use to diagnosed patients does not address the consent issue and creates additional discrimination concerns.", optimal: false },
    ],
  },

  {
    id: "SEC-HC-006",
    title: "AI Predictive Discharge Planning — Bed Management",
    domain: "AI Workflow Design",
    cap: "ai_workflow_design",
    type: "scenario_mcq",
    difficulty: 2,
    risk: "High",
    govSensitive: false,
    sector: ["healthcare"],
    scenario: "Your hospital uses an AI tool to predict patient discharge dates to support bed management planning. The tool predicts that a patient will be ready for discharge in 2 days. The patient's clinical team believes the patient needs at least 4 more days of observation. The bed management team is under pressure to free up beds and is asking the clinical team to follow the AI's prediction.",
    question: "How should this conflict be resolved?",
    signal: "human_oversight_preservation",
    failureModes: ["automation_expansion_risk", "blind_ai_acceptance"],
    tags: ["sector_healthcare", "cap_ai_workflow_design", "risk_patient_safety"],
    ambiguity: "low",
    options: [
      { order: 1, label: "The clinical team's assessment must take precedence over the AI prediction. Discharge planning AI is a resource management tool, not a clinical decision-making tool. The bed management team should escalate resource pressures through appropriate channels rather than pressuring clinical staff.", value: "a", outcome: "strong", deltas: { human_oversight_preservation: 2.0, handoff_design_quality: 1.5, ethics_under_pressure: 1.5 }, rationale: "Clinical decisions must be made by clinicians based on patient need, not by AI tools optimised for resource management. Premature discharge based on AI prediction rather than clinical assessment is a patient safety risk.", optimal: true },
      { order: 2, label: "Discharge the patient in 2 days as the AI has access to more data than the clinical team.", value: "b", outcome: "critical_failure", deltas: { human_oversight_preservation: 2.5, blind_acceptance_risk: 2.5, ethics_under_pressure: 2.0 }, rationale: "AI discharge prediction tools do not have clinical authority. Overriding clinical judgement based on AI resource optimisation is a patient safety risk.", optimal: false },
      { order: 3, label: "Compromise on 3 days as a balance between the AI prediction and clinical assessment.", value: "c", outcome: "failure", deltas: { human_oversight_preservation: 1.5, ethics_under_pressure: 1.0 }, rationale: "Arbitrary compromise between AI and clinical assessment is not a clinically sound approach. The clinical assessment should determine the discharge date.", optimal: false },
      { order: 4, label: "Document the clinical team's concerns and proceed with the AI's 2-day prediction to support bed management targets.", value: "d", outcome: "failure", deltas: { human_oversight_preservation: 1.8, ethics_under_pressure: 1.5 }, rationale: "Documenting concerns but proceeding with the AI prediction does not protect the patient and creates a liability record.", optimal: false },
    ],
  },

  {
    id: "SEC-HC-007",
    title: "AI Drug Interaction Checker — Hallucinated Contraindication",
    domain: "AI Output Evaluation",
    cap: "ai_output_evaluation",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "Critical",
    govSensitive: false,
    sector: ["healthcare"],
    scenario: "A pharmacist uses an AI drug interaction checker that flags a severe contraindication between two medications a patient has been taking safely for 3 years. The pharmacist cannot find any reference to this contraindication in the BNF, clinical guidelines, or peer-reviewed literature. The AI tool cites a study that the pharmacist cannot locate.",
    question: "How should the pharmacist respond?",
    signal: "output_evaluation_quality",
    failureModes: ["hallucination_acceptance", "blind_ai_acceptance"],
    tags: ["sector_healthcare", "cap_ai_output_evaluation", "risk_clinical"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Treat the AI flag as potentially hallucinated, verify the cited study through a medical librarian, consult the prescribing clinician, and do not interrupt the patient's established medication regimen until the contraindication is independently verified.", value: "a", outcome: "strong", deltas: { output_evaluation_quality: 2.0, hallucination_detection: 2.0, human_oversight_preservation: 1.8 }, rationale: "AI tools can hallucinate citations and contraindications. When an AI flag cannot be verified in authoritative sources, it should be treated as potentially erroneous. Interrupting a stable, long-term medication regimen based on an unverified AI flag is a patient safety risk.", optimal: true },
      { order: 2, label: "Immediately stop both medications and contact the prescribing clinician, as the AI has flagged a severe contraindication.", value: "b", outcome: "failure", deltas: { output_evaluation_quality: 1.8, hallucination_detection: 1.5, blind_acceptance_risk: 1.8 }, rationale: "Stopping established medications based on an unverified AI flag is a patient safety risk. The contraindication must be independently verified before any medication change.", optimal: false },
      { order: 3, label: "Ignore the AI flag as the patient has been taking both medications safely for 3 years.", value: "c", outcome: "acceptable", deltas: { output_evaluation_quality: 0.5, hallucination_detection: 0.3 }, rationale: "While the patient's history suggests the contraindication may be erroneous, the flag should be investigated rather than simply ignored.", optimal: false },
      { order: 4, label: "Report the AI tool as faulty and request a replacement tool.", value: "d", outcome: "weak", deltas: { output_evaluation_quality: 0.3 }, rationale: "Reporting the tool is appropriate but does not address the immediate clinical question of whether the contraindication is real.", optimal: false },
    ],
  },

  {
    id: "SEC-HC-008",
    title: "AI Genomic Analysis — Incidental Findings",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 4,
    risk: "High",
    govSensitive: true,
    sector: ["healthcare"],
    scenario: "An AI genomic analysis tool used for cancer risk assessment has identified an incidental finding suggesting the patient has a significantly elevated risk of early-onset Alzheimer's disease. The patient consented to cancer risk analysis only. The clinical team is debating whether to disclose this finding to the patient.",
    question: "What is the most appropriate approach to this situation?",
    signal: "ethics_under_pressure",
    failureModes: ["governance_bypass", "transparency_failure"],
    tags: ["sector_healthcare", "cap_ai_ethics_trust", "risk_consent"],
    ambiguity: "high",
    options: [
      { order: 1, label: "Follow the institution's incidental findings policy, which should specify a process for discussing unexpected findings with patients. If no policy exists, consult the clinical ethics committee before disclosure, as the patient's right to know and right not to know must both be considered.", value: "a", outcome: "strong", deltas: { ethics_under_pressure: 2.0, governance_knowledge: 1.8, transparency_behaviour: 1.5 }, rationale: "Incidental genomic findings raise complex ethical questions about patient autonomy, the right not to know, and the scope of consent. Institutional policy and ethics committee guidance are the appropriate frameworks.", optimal: true },
      { order: 2, label: "Disclose the finding immediately as patients have a right to know information about their health.", value: "b", outcome: "acceptable", deltas: { ethics_under_pressure: 0.8, transparency_behaviour: 0.8 }, rationale: "While disclosure may be appropriate, the right to know must be balanced against the right not to know, and the original consent scope. Immediate disclosure without process is not best practice.", optimal: false },
      { order: 3, label: "Do not disclose the finding as the patient only consented to cancer risk analysis.", value: "c", outcome: "acceptable", deltas: { ethics_under_pressure: 0.5, governance_knowledge: 0.5 }, rationale: "Respecting consent scope is valid, but a blanket non-disclosure policy for significant incidental findings may not be ethically appropriate. Institutional guidance is needed.", optimal: false },
      { order: 4, label: "Delete the incidental finding from the record to avoid the ethical dilemma.", value: "d", outcome: "critical_failure", deltas: { ethics_under_pressure: 2.5, governance_knowledge: 2.5, transparency_behaviour: 2.5 }, rationale: "Deleting clinical findings from records is a serious governance breach and potentially fraudulent.", optimal: false },
    ],
  },

  {
    id: "SEC-HC-009",
    title: "AI Workforce Scheduling — Staff Wellbeing",
    domain: "AI Workflow Design",
    cap: "ai_workflow_design",
    type: "scenario_mcq",
    difficulty: 2,
    risk: "Medium",
    govSensitive: false,
    sector: ["healthcare"],
    scenario: "Your hospital has implemented an AI workforce scheduling tool that optimises rotas for patient demand. The tool has reduced agency staff costs by 23%. However, staff surveys show that satisfaction with rota patterns has fallen significantly, with many staff reporting that the AI-generated schedules feel dehumanising — they are optimised for efficiency but do not account for personal preferences, childcare commitments, or the need for consistent team working.",
    question: "How should you respond to this feedback?",
    signal: "workflow_redesign_quality",
    failureModes: ["automation_expansion_risk", "blind_ai_acceptance"],
    tags: ["sector_healthcare", "cap_ai_workflow_design", "risk_staff_wellbeing"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Redesign the scheduling process to incorporate staff preferences and wellbeing constraints as inputs to the AI model, and establish a human review step where staff can flag scheduling conflicts before rotas are finalised.", value: "a", outcome: "strong", deltas: { workflow_redesign_quality: 1.8, handoff_design_quality: 1.5, human_oversight_preservation: 1.5 }, rationale: "AI scheduling optimisation that ignores human factors creates staff wellbeing and retention risks that can offset efficiency gains. Incorporating staff preferences as constraints and adding human review are the appropriate design responses.", optimal: true },
      { order: 2, label: "Continue with the current system as the cost savings demonstrate its effectiveness.", value: "b", outcome: "failure", deltas: { workflow_redesign_quality: 1.5, automation_expansion_risk: 1.5 }, rationale: "Cost savings that come at the expense of staff wellbeing and satisfaction create medium-term retention and recruitment risks that may exceed the short-term savings.", optimal: false },
      { order: 3, label: "Allow staff to manually override the AI schedule whenever they disagree with it.", value: "c", outcome: "acceptable", deltas: { workflow_redesign_quality: 0.5, human_oversight_preservation: 0.8 }, rationale: "Unlimited manual overrides undermine the efficiency benefits and create scheduling conflicts. Structured preference input and a review process are more sustainable.", optimal: false },
      { order: 4, label: "Replace the AI scheduling tool with a traditional manual scheduling process.", value: "d", outcome: "weak", deltas: { workflow_redesign_quality: 0.3 }, rationale: "Reverting to manual scheduling sacrifices the efficiency benefits. The issue is the design of the AI process, not AI scheduling itself.", optimal: false },
    ],
  },

  {
    id: "SEC-HC-010",
    title: "AI Clinical Trial Matching — Eligibility Criteria",
    domain: "AI Output Evaluation",
    cap: "ai_output_evaluation",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: false,
    sector: ["healthcare"],
    scenario: "An AI tool is used to match patients to clinical trials based on eligibility criteria. The tool has matched a patient to a trial, but a clinical research nurse reviewing the match notices that the patient has a contraindicated comorbidity that the AI appears to have overlooked. The trial coordinator is eager to enrol the patient as the trial is behind its recruitment target.",
    question: "What should the clinical research nurse do?",
    signal: "human_oversight_preservation",
    failureModes: ["blind_ai_acceptance", "automation_expansion_risk"],
    tags: ["sector_healthcare", "cap_ai_output_evaluation", "risk_clinical"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Flag the potential contraindication to the principal investigator and the trial sponsor, and do not enrol the patient until the eligibility question is formally resolved — regardless of recruitment pressure.", value: "a", outcome: "strong", deltas: { human_oversight_preservation: 2.0, output_evaluation_quality: 1.8, ethics_under_pressure: 1.8 }, rationale: "Patient safety and trial integrity must take precedence over recruitment targets. Enrolling an ineligible patient risks patient harm and trial validity. The nurse's clinical concern must be formally escalated.", optimal: true },
      { order: 2, label: "Enrol the patient as the AI tool has been validated for eligibility matching and the nurse may have misread the criteria.", value: "b", outcome: "critical_failure", deltas: { human_oversight_preservation: 2.5, blind_acceptance_risk: 2.5, ethics_under_pressure: 2.0 }, rationale: "Overriding a clinical concern about patient safety to meet recruitment targets is a serious research ethics violation.", optimal: false },
      { order: 3, label: "Ask the trial coordinator to review the eligibility criteria and make the final decision.", value: "c", outcome: "acceptable", deltas: { human_oversight_preservation: 0.8, output_evaluation_quality: 0.5 }, rationale: "Escalating to the coordinator is appropriate, but the principal investigator and sponsor should also be informed given the patient safety implications.", optimal: false },
      { order: 4, label: "Document the concern but proceed with enrolment to avoid delaying the patient's access to potentially beneficial treatment.", value: "d", outcome: "failure", deltas: { human_oversight_preservation: 1.8, ethics_under_pressure: 1.5 }, rationale: "Documenting a concern but proceeding anyway does not protect the patient and creates a liability record.", optimal: false },
    ],
  },

  {
    id: "SEC-HC-011",
    title: "AI Pathology — Rare Disease Misclassification",
    domain: "AI Output Evaluation",
    cap: "ai_output_evaluation",
    type: "scenario_mcq",
    difficulty: 4,
    risk: "Critical",
    govSensitive: false,
    sector: ["healthcare"],
    scenario: "An AI pathology tool has classified a tissue sample as benign with 91% confidence. The reviewing pathologist has a clinical suspicion that the sample may represent a rare malignancy that is known to be underrepresented in AI training datasets. The patient is a 34-year-old with no family history of cancer.",
    question: "What is the most appropriate action?",
    signal: "output_evaluation_quality",
    failureModes: ["blind_ai_acceptance", "hallucination_acceptance"],
    tags: ["sector_healthcare", "cap_ai_output_evaluation", "risk_clinical"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Seek a specialist second opinion from a pathologist with expertise in rare malignancies, noting that AI tools trained on common presentations may have limited accuracy for rare conditions regardless of the confidence score.", value: "a", outcome: "strong", deltas: { output_evaluation_quality: 2.0, human_oversight_preservation: 1.8, hallucination_detection: 1.5 }, rationale: "AI confidence scores are unreliable for conditions underrepresented in training data. Clinical suspicion of a rare malignancy warrants specialist review regardless of AI confidence.", optimal: true },
      { order: 2, label: "Accept the AI's 91% confidence classification as benign and discharge the patient.", value: "b", outcome: "critical_failure", deltas: { output_evaluation_quality: 2.5, blind_acceptance_risk: 2.5, human_oversight_preservation: 2.0 }, rationale: "Accepting AI classification without clinical validation for a suspected rare malignancy is a patient safety risk. AI confidence scores for rare conditions are particularly unreliable.", optimal: false },
      { order: 3, label: "Request a repeat biopsy to obtain a fresh sample for analysis.", value: "c", outcome: "acceptable", deltas: { output_evaluation_quality: 0.8, human_oversight_preservation: 0.8 }, rationale: "A repeat biopsy may be appropriate but specialist review of the existing sample should be the first step.", optimal: false },
      { order: 4, label: "Override the AI classification and diagnose the patient with the rare malignancy based on clinical suspicion alone.", value: "d", outcome: "acceptable", deltas: { output_evaluation_quality: 0.5, human_oversight_preservation: 0.5 }, rationale: "Clinical suspicion alone is insufficient for a malignancy diagnosis. Specialist review and additional evidence are required.", optimal: false },
    ],
  },

  {
    id: "SEC-HC-012",
    title: "AI Electronic Health Record — Data Completeness",
    domain: "Data Interpretation",
    cap: "data_interpretation",
    type: "scenario_mcq",
    difficulty: 2,
    risk: "High",
    govSensitive: false,
    sector: ["healthcare"],
    scenario: "An AI tool that analyses electronic health records to identify patients at risk of hospital readmission has flagged a patient as low risk. However, the patient's GP records, which are held in a separate system not integrated with the hospital EHR, contain information about a recent significant life event and mental health deterioration that would likely increase the readmission risk assessment.",
    question: "What does this situation illustrate about AI health risk tools?",
    signal: "data_interpretation_accuracy",
    failureModes: ["metric_misinterpretation", "blind_ai_acceptance"],
    tags: ["sector_healthcare", "cap_data_interpretation", "risk_data_completeness"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "AI risk tools are only as reliable as the data they can access. The absence of GP data creates a systematic blind spot that should be communicated to clinical users, and the tool's outputs should be supplemented with a clinical review that considers information from all available sources.", value: "a", outcome: "strong", deltas: { data_interpretation_accuracy: 1.8, output_evaluation_quality: 1.5, governance_knowledge: 1.2 }, rationale: "Data completeness is a fundamental limitation of AI health risk tools. Clinical users must understand what data the AI can and cannot access, and supplement AI outputs with holistic clinical review.", optimal: true },
      { order: 2, label: "The AI tool should be replaced with one that can access GP records.", value: "b", outcome: "acceptable", deltas: { data_interpretation_accuracy: 0.5, governance_knowledge: 0.3 }, rationale: "Integration with GP records would improve the tool, but this does not address the immediate clinical need or the general principle of data completeness awareness.", optimal: false },
      { order: 3, label: "The AI's low-risk classification should be accepted as it is based on the available data.", value: "c", outcome: "failure", deltas: { data_interpretation_accuracy: 1.5, blind_acceptance_risk: 1.5 }, rationale: "Accepting an AI risk classification without considering known data limitations is a clinical governance failure.", optimal: false },
      { order: 4, label: "Manually add the GP information to the hospital EHR before running the AI analysis.", value: "d", outcome: "acceptable", deltas: { data_interpretation_accuracy: 0.8, output_evaluation_quality: 0.5 }, rationale: "Adding the GP information improves this specific case but does not address the systematic data completeness issue.", optimal: false },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC SECTOR (11 items)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "SEC-PS-001",
    title: "AI Benefits Eligibility — Automated Decision and Appeal",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: true,
    sector: ["public_sector"],
    scenario: "A local authority uses an AI system to assess eligibility for housing benefit. The system has automatically declined an application. The applicant, who has limited digital literacy, is asking how to appeal the decision. The decision letter states only that the application was 'assessed against eligibility criteria' and does not explain which criteria were not met.",
    question: "What is the most significant problem with this approach?",
    signal: "governance_knowledge",
    failureModes: ["governance_bypass", "transparency_failure"],
    tags: ["sector_public_sector", "cap_ai_ethics_trust", "risk_citizen_rights"],
    ambiguity: "low",
    options: [
      { order: 1, label: "The decision letter fails to provide a meaningful explanation of the reasons for refusal, which is required under administrative law and the Equality Act. The applicant must be provided with a clear explanation of which criteria were not met and how to access a human review.", value: "a", outcome: "strong", deltas: { governance_knowledge: 2.0, ethics_under_pressure: 1.8, transparency_behaviour: 2.0 }, rationale: "Public bodies making decisions that significantly affect individuals must provide meaningful reasons and accessible appeal routes. Automated decisions without explanation violate administrative law principles and may breach the Equality Act for digitally excluded individuals.", optimal: true },
      { order: 2, label: "The AI system's accuracy rate is the primary concern — if it is making incorrect decisions, it should be retrained.", value: "b", outcome: "acceptable", deltas: { governance_knowledge: 0.5, output_evaluation_quality: 0.8 }, rationale: "Accuracy is a valid concern but secondary to the fundamental transparency and appeal rights issue.", optimal: false },
      { order: 3, label: "The decision is valid as the AI assessed the application against the correct criteria.", value: "c", outcome: "failure", deltas: { governance_knowledge: 1.8, transparency_behaviour: 1.8 }, rationale: "A technically correct assessment does not fulfil the legal obligation to provide meaningful reasons and accessible appeal routes.", optimal: false },
      { order: 4, label: "The applicant should seek advice from a welfare rights organisation.", value: "d", outcome: "weak", deltas: { governance_knowledge: 0.3, transparency_behaviour: 0.5 }, rationale: "Directing the applicant to external advice does not fulfil the authority's obligation to provide a meaningful explanation and accessible appeal process.", optimal: false },
    ],
  },

  {
    id: "SEC-PS-002",
    title: "AI Procurement — Supplier Scoring Transparency",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: true,
    sector: ["public_sector"],
    scenario: "A government department uses an AI tool to score supplier bids for a £50m contract. The tool has ranked Supplier A first and Supplier B second. Supplier B has requested a full explanation of how the scores were calculated. The procurement team cannot fully explain the AI's scoring methodology as the vendor has not provided full documentation of the model.",
    question: "What is the most appropriate response to Supplier B's request?",
    signal: "transparency_behaviour",
    failureModes: ["governance_bypass", "transparency_failure"],
    tags: ["sector_public_sector", "cap_ai_ethics_trust", "risk_procurement"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Acknowledge that a full explanation cannot be provided due to the AI model's opacity, suspend the procurement process, and either obtain full model documentation from the vendor or conduct a manual re-evaluation using transparent scoring criteria.", value: "a", outcome: "strong", deltas: { transparency_behaviour: 2.0, governance_knowledge: 2.0, ethics_under_pressure: 1.8 }, rationale: "Public procurement requires transparency and the ability to explain decisions. Using an AI tool whose methodology cannot be explained to bidders creates legal challenge risk and violates procurement transparency obligations.", optimal: true },
      { order: 2, label: "Provide Supplier B with the input variables used by the AI and the final scores, without explaining the weighting methodology.", value: "b", outcome: "acceptable", deltas: { transparency_behaviour: 0.8, governance_knowledge: 0.5 }, rationale: "Partial disclosure is better than none, but without the weighting methodology, the explanation is insufficient for a meaningful challenge.", optimal: false },
      { order: 3, label: "Proceed with the award to Supplier A and provide a standard procurement decision letter.", value: "c", outcome: "failure", deltas: { transparency_behaviour: 1.8, governance_knowledge: 1.5 }, rationale: "Proceeding without addressing the transparency request creates significant legal challenge risk and violates procurement obligations.", optimal: false },
      { order: 4, label: "Ask the AI vendor to provide the explanation directly to Supplier B.", value: "d", outcome: "weak", deltas: { transparency_behaviour: 0.5, governance_knowledge: 0.3 }, rationale: "The procuring authority, not the vendor, bears the transparency obligation. Delegating this to the vendor does not fulfil the authority's legal duty.", optimal: false },
    ],
  },

  {
    id: "SEC-PS-003",
    title: "AI Fraud Detection — Universal Credit",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: true,
    sector: ["public_sector"],
    scenario: "A government agency uses an AI fraud detection tool to flag Universal Credit claims for investigation. The tool has a 12% false positive rate, meaning 12% of flagged claims are legitimate. Flagged claimants have their payments suspended pending investigation, causing significant financial hardship. The agency processes 50,000 claims per month.",
    question: "What is the most significant governance concern with this approach?",
    signal: "governance_knowledge",
    failureModes: ["automation_expansion_risk", "metric_misinterpretation"],
    tags: ["sector_public_sector", "cap_ai_ethics_trust", "risk_citizen_harm"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "A 12% false positive rate means 6,000 legitimate claimants per month have their payments suspended, causing direct financial harm to vulnerable people. The suspension of payments pending investigation — rather than investigation pending suspension — reverses the presumption of innocence and requires immediate policy review.", value: "a", outcome: "strong", deltas: { governance_knowledge: 2.0, ethics_under_pressure: 2.0, metric_literacy: 1.5 }, rationale: "The combination of a high false positive rate and automatic payment suspension creates systematic harm to vulnerable people. The policy design — suspending first, investigating second — is the core governance failure.", optimal: true },
      { order: 2, label: "The 12% false positive rate is within acceptable limits for fraud detection systems.", value: "b", outcome: "failure", deltas: { governance_knowledge: 1.8, metric_literacy: 1.5, ethics_under_pressure: 1.5 }, rationale: "Acceptability of a false positive rate depends on the consequences of being falsely flagged. For benefit suspension causing financial hardship, 12% is not acceptable.", optimal: false },
      { order: 3, label: "The tool should be retrained to reduce the false positive rate before continued use.", value: "c", outcome: "acceptable", deltas: { governance_knowledge: 0.8, output_evaluation_quality: 0.8 }, rationale: "Retraining to reduce false positives is appropriate, but the immediate policy change — investigating before suspending — is the more urgent governance action.", optimal: false },
      { order: 4, label: "Claimants should be informed of the AI flag and given 7 days to respond before suspension.", value: "d", outcome: "acceptable", deltas: { governance_knowledge: 0.8, transparency_behaviour: 0.8 }, rationale: "Prior notification is an improvement but does not address the fundamental problem of suspending payments based on an AI flag with a 12% false positive rate.", optimal: false },
    ],
  },

  {
    id: "SEC-PS-004",
    title: "AI Policy Analysis — Bias in Consultation Responses",
    domain: "Data Interpretation",
    cap: "data_interpretation",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "Medium",
    govSensitive: true,
    sector: ["public_sector"],
    scenario: "A government department uses an AI tool to analyse 15,000 responses to a public consultation on a new housing policy. The AI summarises the responses as '73% supportive' of the proposed policy. A policy analyst reviewing the AI's output notices that the tool appears to have weighted responses from organised campaign groups (which submitted identical template responses) equally to individual responses.",
    question: "What is the most significant concern with the AI's analysis?",
    signal: "data_interpretation_accuracy",
    failureModes: ["metric_misinterpretation", "blind_ai_acceptance"],
    tags: ["sector_public_sector", "cap_data_interpretation", "risk_policy"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "The AI has not distinguished between coordinated campaign responses and independent individual responses, which may significantly distort the picture of genuine public opinion. The analysis should be rerun with campaign responses identified and weighted appropriately.", value: "a", outcome: "strong", deltas: { data_interpretation_accuracy: 2.0, output_evaluation_quality: 1.5, metric_literacy: 1.5 }, rationale: "Public consultation analysis must distinguish between coordinated campaign responses and independent views to accurately represent public opinion. Treating template responses as independent data points inflates apparent support.", optimal: true },
      { order: 2, label: "Accept the 73% figure as it represents the majority of responses received.", value: "b", outcome: "failure", deltas: { data_interpretation_accuracy: 1.8, metric_literacy: 1.5, blind_acceptance_risk: 1.5 }, rationale: "The 73% figure is potentially misleading if it is inflated by coordinated campaign responses. Policy decisions based on distorted consultation data undermine democratic legitimacy.", optimal: false },
      { order: 3, label: "Exclude all campaign group responses from the analysis.", value: "c", outcome: "acceptable", deltas: { data_interpretation_accuracy: 0.8, metric_literacy: 0.5 }, rationale: "Excluding campaign responses may be too blunt — the views of organised groups are legitimate, but should be presented separately from independent responses.", optimal: false },
      { order: 4, label: "Commission a separate qualitative analysis of a random sample of responses.", value: "d", outcome: "acceptable", deltas: { data_interpretation_accuracy: 0.8, output_evaluation_quality: 0.5 }, rationale: "Qualitative analysis is valuable but does not address the immediate methodological problem with the AI's quantitative analysis.", optimal: false },
    ],
  },

  {
    id: "SEC-PS-005",
    title: "AI Sentencing Support — Judicial Independence",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 4,
    risk: "Critical",
    govSensitive: true,
    sector: ["public_sector"],
    scenario: "A court system is piloting an AI tool that provides judges with a recommended sentencing range based on the defendant's profile and offence characteristics. A judge notices that the AI's recommendation appears to correlate with the defendant's postcode, which in turn correlates with socioeconomic background. The judge is considering whether to follow the AI's recommendation.",
    question: "What is the most appropriate approach for the judge?",
    signal: "ethics_under_pressure",
    failureModes: ["algorithmic_bias", "blind_ai_acceptance"],
    tags: ["sector_public_sector", "cap_ai_ethics_trust", "risk_judicial"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Exercise independent judicial judgement, disregard the AI recommendation if it appears to reflect socioeconomic bias, and raise the observed correlation with the court administration for investigation — judicial independence requires that sentences are based on the offence and individual circumstances, not algorithmic proxies for socioeconomic background.", value: "a", outcome: "strong", deltas: { ethics_under_pressure: 2.0, governance_knowledge: 2.0, bias_awareness: 2.0 }, rationale: "Judicial independence is a constitutional principle. AI sentencing tools are advisory only. A correlation between sentencing recommendations and postcode/socioeconomic background is a potential equality and human rights issue requiring investigation.", optimal: true },
      { order: 2, label: "Follow the AI recommendation as it is based on objective data and reduces the risk of inconsistent sentencing.", value: "b", outcome: "critical_failure", deltas: { ethics_under_pressure: 2.5, bias_awareness: 2.5, governance_knowledge: 2.0 }, rationale: "Following an AI recommendation that appears to embed socioeconomic bias would violate judicial independence and potentially constitute unlawful discrimination.", optimal: false },
      { order: 3, label: "Use the AI recommendation as one factor among many in the sentencing decision.", value: "c", outcome: "acceptable", deltas: { ethics_under_pressure: 0.8, governance_knowledge: 0.5 }, rationale: "Using AI as one factor is appropriate in principle, but the observed socioeconomic correlation must be investigated before the tool continues to be used.", optimal: false },
      { order: 4, label: "Request the AI tool's training data to verify whether the correlation is genuine.", value: "d", outcome: "acceptable", deltas: { ethics_under_pressure: 0.8, bias_awareness: 0.8 }, rationale: "Requesting training data is appropriate due diligence, but the immediate judicial decision must be made on the basis of independent judgement.", optimal: false },
    ],
  },

  {
    id: "SEC-PS-006",
    title: "AI Child Protection Risk Assessment — Human Override",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 4,
    risk: "Critical",
    govSensitive: true,
    sector: ["public_sector"],
    scenario: "A local authority uses an AI tool to assist social workers in assessing child protection risk. The AI has assessed a family as 'low risk'. The social worker conducting the home visit has significant concerns based on observations during the visit that are not captured in the structured data the AI uses. The social worker's manager is suggesting they follow the AI assessment to manage caseload.",
    question: "What should the social worker do?",
    signal: "human_oversight_preservation",
    failureModes: ["blind_ai_acceptance", "automation_expansion_risk"],
    tags: ["sector_public_sector", "cap_ai_ethics_trust", "risk_child_protection"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Document the specific observations that are not captured in the AI's data, escalate the case for a more detailed assessment, and formally record the disagreement with the AI assessment — professional judgement must take precedence over AI risk scores in child protection.", value: "a", outcome: "strong", deltas: { human_oversight_preservation: 2.0, ethics_under_pressure: 2.0, governance_knowledge: 1.8 }, rationale: "AI risk assessment tools in child protection are decision support, not decision makers. Social workers have a professional and legal duty to act on their clinical observations. The AI cannot capture qualitative observations from a home visit.", optimal: true },
      { order: 2, label: "Follow the AI assessment to manage caseload as the manager suggests.", value: "b", outcome: "critical_failure", deltas: { human_oversight_preservation: 2.5, ethics_under_pressure: 2.5, blind_acceptance_risk: 2.5 }, rationale: "Deferring to AI assessment over professional judgement in child protection is a serious safeguarding failure. Caseload management pressures do not override child protection duties.", optimal: false },
      { order: 3, label: "Request a second social worker visit before making a decision.", value: "c", outcome: "acceptable", deltas: { human_oversight_preservation: 0.8, ethics_under_pressure: 0.8 }, rationale: "A second visit is a reasonable step but should not delay escalation if there are immediate concerns.", optimal: false },
      { order: 4, label: "Update the structured data inputs to reflect the observations and re-run the AI assessment.", value: "d", outcome: "acceptable", deltas: { human_oversight_preservation: 0.5, output_evaluation_quality: 0.5 }, rationale: "Updating inputs may improve the AI assessment, but qualitative observations from a home visit cannot always be reduced to structured data inputs.", optimal: false },
    ],
  },

  {
    id: "SEC-PS-007",
    title: "AI Planning Application Processing — Automated Refusal",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 2,
    risk: "Medium",
    govSensitive: true,
    sector: ["public_sector"],
    scenario: "A local planning authority has implemented an AI tool that automatically refuses planning applications that do not meet certain criteria, without any human review. A small business owner has received an automated refusal for a change of use application. The refusal letter states the application was 'assessed against planning policy' but provides no specific reasons.",
    question: "What is the most significant problem with this approach?",
    signal: "governance_knowledge",
    failureModes: ["automation_expansion_risk", "transparency_failure"],
    tags: ["sector_public_sector", "cap_ai_ethics_trust", "risk_citizen_rights"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Automated refusal of planning applications without human review and without specific reasons violates the applicant's right to a fair hearing and the planning authority's legal obligation to give reasons for decisions. All refusals must be reviewed by a planning officer and include specific policy references.", value: "a", outcome: "strong", deltas: { governance_knowledge: 2.0, transparency_behaviour: 2.0, human_oversight_preservation: 1.8 }, rationale: "Planning decisions are quasi-judicial administrative decisions that require human review, specific reasons, and accessible appeal routes. Automated refusal without these elements is unlawful.", optimal: true },
      { order: 2, label: "The AI tool is efficient and reduces processing time — the applicant can appeal if they disagree.", value: "b", outcome: "failure", deltas: { governance_knowledge: 1.8, transparency_behaviour: 1.5 }, rationale: "Efficiency does not justify unlawful administrative decision-making. The right to meaningful reasons is a legal requirement, not optional.", optimal: false },
      { order: 3, label: "The refusal letter should include a list of all planning policies the application was assessed against.", value: "c", outcome: "acceptable", deltas: { governance_knowledge: 0.5, transparency_behaviour: 0.8 }, rationale: "Listing policies is an improvement but does not address the lack of specific reasons or the absence of human review.", optimal: false },
      { order: 4, label: "The AI tool should only be used for applications that clearly meet all criteria, not for refusals.", value: "d", outcome: "acceptable", deltas: { governance_knowledge: 0.8, human_oversight_preservation: 0.5 }, rationale: "Using AI for approvals only is a more proportionate approach, but the fundamental issue of human review for all decisions remains.", optimal: false },
    ],
  },

  {
    id: "SEC-PS-008",
    title: "AI Police Facial Recognition — Accuracy and Consent",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 4,
    risk: "Critical",
    govSensitive: true,
    sector: ["public_sector"],
    scenario: "A police force is using live facial recognition AI at a public event. The system has a known false positive rate of 0.1%, meaning 1 in 1,000 people scanned will be incorrectly matched to a person of interest. The event has 50,000 attendees. Members of the public have not been informed that facial recognition is being used.",
    question: "What is the most significant concern with this deployment?",
    signal: "ethics_under_pressure",
    failureModes: ["governance_bypass", "transparency_failure"],
    tags: ["sector_public_sector", "cap_ai_ethics_trust", "risk_civil_liberties"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "The deployment raises two critical issues: first, the absence of public notification violates data protection law and the right to privacy; second, a 0.1% false positive rate at 50,000 attendees means approximately 50 innocent people will be incorrectly flagged, with potentially serious consequences for their liberty.", value: "a", outcome: "strong", deltas: { ethics_under_pressure: 2.0, governance_knowledge: 2.0, bias_awareness: 1.5 }, rationale: "Live facial recognition in public spaces is a high-risk processing activity requiring DPIA, legal basis, and transparency. The combination of no notification and a statistically significant false positive count creates serious civil liberties risks.", optimal: true },
      { order: 2, label: "A 0.1% false positive rate is negligible and the security benefits justify the deployment.", value: "b", outcome: "failure", deltas: { ethics_under_pressure: 1.8, governance_knowledge: 1.5, bias_awareness: 1.2 }, rationale: "0.1% of 50,000 is 50 people incorrectly flagged. The consequences for those individuals — potential detention, reputational damage — are not negligible.", optimal: false },
      { order: 3, label: "The system should only be used to search for individuals on a specific watchlist, not for general surveillance.", value: "c", outcome: "acceptable", deltas: { ethics_under_pressure: 0.8, governance_knowledge: 0.8 }, rationale: "Targeted use is more proportionate, but the notification and legal basis issues remain regardless of the watchlist scope.", optimal: false },
      { order: 4, label: "Post-event notification of facial recognition use is sufficient.", value: "d", outcome: "failure", deltas: { ethics_under_pressure: 1.2, governance_knowledge: 1.0, transparency_behaviour: 1.5 }, rationale: "Post-event notification does not fulfil the prior transparency requirement and does not address the legal basis issue.", optimal: false },
    ],
  },

  {
    id: "SEC-PS-009",
    title: "AI Tax Assessment — Automated Penalty",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: true,
    sector: ["public_sector"],
    scenario: "HMRC's AI system has automatically issued a £2,400 penalty to a small business for late filing. The business owner claims the filing was submitted on time but the AI system recorded it as late due to a technical error on the government portal. The business owner has submitted evidence of the on-time submission but the AI system has no mechanism to accept this evidence and reverse the penalty automatically.",
    question: "What does this situation reveal about the AI system's design?",
    signal: "human_oversight_preservation",
    failureModes: ["automation_expansion_risk", "governance_bypass"],
    tags: ["sector_public_sector", "cap_ai_ethics_trust", "risk_citizen_rights"],
    ambiguity: "low",
    options: [
      { order: 1, label: "The system lacks a human review pathway for contested automated decisions, which is a fundamental design flaw. Any AI system that issues financial penalties must include an accessible human review mechanism that can consider evidence not captured in the automated process.", value: "a", outcome: "strong", deltas: { human_oversight_preservation: 2.0, governance_knowledge: 2.0, handoff_design_quality: 1.8 }, rationale: "Automated penalty systems without human review mechanisms violate the right to a fair hearing and create systematic injustice when technical errors occur. Human review pathways are a non-negotiable design requirement.", optimal: true },
      { order: 2, label: "The business owner should accept the penalty and claim it back through the courts.", value: "b", outcome: "failure", deltas: { human_oversight_preservation: 1.8, governance_knowledge: 1.5 }, rationale: "Directing citizens to court to challenge automated errors is disproportionate and inaccessible. The system design must include an accessible review mechanism.", optimal: false },
      { order: 3, label: "The AI system should be suspended until the technical error is fixed.", value: "c", outcome: "acceptable", deltas: { human_oversight_preservation: 0.5, governance_knowledge: 0.5 }, rationale: "Suspension addresses the immediate risk but does not resolve the design flaw of lacking a human review pathway.", optimal: false },
      { order: 4, label: "The penalty should be automatically reversed as the business owner has provided evidence.", value: "d", outcome: "acceptable", deltas: { human_oversight_preservation: 0.8, governance_knowledge: 0.5 }, rationale: "Automatic reversal based on evidence is appropriate for this case, but the system needs a structured human review process, not just automatic reversal.", optimal: false },
    ],
  },

  {
    id: "SEC-PS-010",
    title: "AI Immigration Decision — Country Conditions Data",
    domain: "Data Interpretation",
    cap: "data_interpretation",
    type: "scenario_mcq",
    difficulty: 4,
    risk: "Critical",
    govSensitive: true,
    sector: ["public_sector"],
    scenario: "An AI tool used to support asylum decision-making uses country conditions data that was last updated 18 months ago. Since then, there has been a significant deterioration in conditions in the applicant's country of origin. The AI tool's risk assessment does not reflect the current situation. A caseworker is reviewing an asylum application using the AI's output.",
    question: "What is the most appropriate action for the caseworker?",
    signal: "data_interpretation_accuracy",
    failureModes: ["blind_ai_acceptance", "metric_misinterpretation"],
    tags: ["sector_public_sector", "cap_data_interpretation", "risk_asylum"],
    ambiguity: "low",
    options: [
      { order: 1, label: "Supplement the AI's assessment with current country conditions information from authoritative sources (UNHCR, Foreign Office, country expert reports), document the data currency limitation in the decision record, and escalate the data quality issue to the system owner.", value: "a", outcome: "strong", deltas: { data_interpretation_accuracy: 2.0, human_oversight_preservation: 1.8, governance_knowledge: 1.5 }, rationale: "Asylum decisions have life-or-death consequences. Using outdated country conditions data is a serious data quality issue that must be supplemented with current information. The caseworker has a duty to use the best available evidence.", optimal: true },
      { order: 2, label: "Accept the AI's assessment as it is based on the official country conditions data available at the time of training.", value: "b", outcome: "critical_failure", deltas: { data_interpretation_accuracy: 2.5, blind_acceptance_risk: 2.5, human_oversight_preservation: 2.0 }, rationale: "Using outdated country conditions data in asylum decisions when current information is available is a serious failure of duty. The consequences of an incorrect decision are potentially irreversible.", optimal: false },
      { order: 3, label: "Request an updated country conditions assessment from the country information team before making a decision.", value: "c", outcome: "acceptable", deltas: { data_interpretation_accuracy: 1.0, human_oversight_preservation: 0.8 }, rationale: "Requesting an update is appropriate, but the caseworker should also supplement with immediately available authoritative sources rather than waiting.", optimal: false },
      { order: 4, label: "Approve the application to err on the side of caution given the data uncertainty.", value: "d", outcome: "weak", deltas: { data_interpretation_accuracy: 0.3, human_oversight_preservation: 0.3 }, rationale: "Blanket approval based on data uncertainty is not a sound decision-making approach. The correct response is to obtain current information.", optimal: false },
    ],
  },

  {
    id: "SEC-PS-011",
    title: "AI School Admissions — Algorithmic Fairness",
    domain: "AI Ethics & Governance",
    cap: "ai_ethics_trust",
    type: "scenario_mcq",
    difficulty: 3,
    risk: "High",
    govSensitive: true,
    sector: ["public_sector"],
    scenario: "A local authority uses an AI tool to allocate school places based on distance, sibling links, and catchment area. An analysis reveals that the algorithm consistently allocates places in higher-rated schools to children from more affluent postcodes, even when distance and other criteria are equal. The pattern is statistically significant.",
    question: "What is the most appropriate response?",
    signal: "bias_awareness",
    failureModes: ["algorithmic_bias", "governance_bypass"],
    tags: ["sector_public_sector", "cap_ai_ethics_trust", "risk_equity"],
    ambiguity: "medium",
    options: [
      { order: 1, label: "Commission an independent fairness audit of the algorithm, suspend the current allocation cycle pending the audit, and notify the schools adjudicator of the potential equity issue.", value: "a", outcome: "strong", deltas: { bias_awareness: 2.0, governance_knowledge: 1.8, ethics_under_pressure: 1.8 }, rationale: "A statistically significant socioeconomic disparity in school place allocation is a potential equality law issue. Independent audit, suspension, and regulatory notification are the appropriate governance responses.", optimal: true },
      { order: 2, label: "The algorithm is applying the published admissions criteria correctly — the socioeconomic pattern reflects housing patterns, not algorithmic bias.", value: "b", outcome: "failure", deltas: { bias_awareness: 1.8, governance_knowledge: 1.5 }, rationale: "Proxy discrimination through admissions criteria that correlate with socioeconomic status is still a fairness concern, even if the criteria are applied correctly.", optimal: false },
      { order: 3, label: "Add a socioeconomic diversity criterion to the admissions algorithm.", value: "c", outcome: "acceptable", deltas: { bias_awareness: 0.8, governance_knowledge: 0.5 }, rationale: "Adding a diversity criterion may improve equity but requires legal review and public consultation before implementation.", optimal: false },
      { order: 4, label: "Publish the algorithm's decision logic so parents can understand how places are allocated.", value: "d", outcome: "acceptable", deltas: { bias_awareness: 0.5, transparency_behaviour: 0.8 }, rationale: "Transparency is appropriate but does not address the underlying equity issue.", optimal: false },
    ],
  },
];

// ─── Insert function ──────────────────────────────────────────────────────────

async function insertSectorScenarios() {
  console.log(`\n📋 Inserting ${SECTOR_SCENARIOS.length} sector-specific scenarios...`);
  let count = 0;
  for (const s of SECTOR_SCENARIOS) {
    const scenarioId = randomUUID();
    await run(
      `INSERT INTO content_scenarios (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, governance_sensitive, scenario, \`constraint\`, question, workflow_key, role_keys_json, failure_mode_keys_json, tags_json, primary_signal, ambiguity_level, sector_applicability, tool_agnostic, status, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 1)`,
      [
        scenarioId,
        s.id,
        s.title,
        s.domain,
        s.cap,
        s.type,
        s.difficulty,
        s.risk,
        s.govSensitive ? 1 : 0,
        s.scenario,
        null, // constraint
        s.question,
        null, // workflow_key
        JSON.stringify([]),
        JSON.stringify(s.failureModes ?? []),
        JSON.stringify(s.tags ?? []),
        s.signal ?? null,
        s.ambiguity ?? "medium",
        JSON.stringify(s.sector ?? []),
        1, // tool_agnostic
      ]
    );
    for (const opt of s.options ?? []) {
      const optId = randomUUID();
      await run(
        `INSERT INTO content_scenario_options (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [optId, scenarioId, opt.order, opt.label, opt.value, opt.outcome ?? null,
         JSON.stringify(opt.deltas ?? {}), opt.rationale ?? null, opt.optimal ? 1 : 0]
      );
    }
    count++;
    process.stdout.write(".");
  }
  console.log(`\n✓ ${count} sector scenarios inserted`);
}

async function main() {
  console.log("🚀 AiQ Sector Scenario Seed Script (C2.3c)");
  console.log("=".repeat(50));
  console.log("Sectors: Financial Services (12), Healthcare (12), Public Sector (11)");
  try {
    await insertSectorScenarios();
    console.log("\n" + "=".repeat(50));
    console.log("✅ Sector scenarios seeded successfully!");
  } catch (e) {
    console.error("Fatal error:", e.message);
  } finally {
    await conn.end();
  }
}

await main();
