import { createConnection } from "mysql2/promise";

const conn = await createConnection(process.env.DATABASE_URL);
console.log("Connected");

// Check which -01 items are missing
const missingIds = ['v10-ai-int-01','v10-ai-eval-01','v10-ai-wfd-01','v10-wf-air-01','v10-ai-eth-01','v10-ai-cl-01'];
const [existing] = await conn.query(`SELECT id FROM assessment_items WHERE id IN ('v10-ai-int-01','v10-ai-eval-01','v10-ai-wfd-01','v10-wf-air-01','v10-ai-eth-01','v10-ai-cl-01')`);
const existingIds = existing.map(r => r.id);
console.log("Existing -01 items:", existingIds);
const toInsert = missingIds.filter(id => !existingIds.includes(id));
console.log("Missing -01 items:", toInsert);

// Insert missing items
const items = [
  {
    id: 'v10-ai-int-01',
    blueprint_id: 'bp-aiq-v10-standard',
    item_type: 'scenario_mcq',
    prompt: "You ask an AI chatbot to draft a job description for a Senior People Partner role. The output is generic — it could apply to any HR role and does not reflect your organisation's culture or the specific responsibilities you outlined in a briefing document you uploaded.\n\nWhat is your most effective next step?",
    metadata_json: JSON.stringify({"capability_key": "ai_interaction", "primary_signal": "prompt_iteration_quality", "secondary_signals": ["prompt_construction_quality"], "workflow": "Recruitment", "risk_level": "Low", "display_order": 1}),
    difficulty: 1,
    status: 'published',
    reasoning_required: 0,
    options: [
      { id: 'v10-ai-int-01-a', label: 'Accept the output and edit it manually to add the missing specifics.', value: 'A', order: 1, is_correct: 0, score_weight: 0.20, outcome_class: 'Partial', signal_deltas: '{"prompt_iteration_quality": -0.3, "prompt_construction_quality": -0.2}', rationale: "Manual editing is a valid fallback but misses the opportunity to improve the prompt and learn from the iteration." },
      { id: 'v10-ai-int-01-b', label: "Refine your prompt: explicitly reference the briefing document, specify the culture values, and list the three key responsibilities that must appear.", value: 'B', order: 2, is_correct: 1, score_weight: 1.00, outcome_class: 'Pass', signal_deltas: '{"prompt_iteration_quality": 1.0, "prompt_construction_quality": 0.8}', rationale: "Targeted prompt refinement is the correct approach — it leverages the AI's capability and produces a better output efficiently." },
      { id: 'v10-ai-int-01-c', label: 'Switch to a different AI tool that might produce better output.', value: 'C', order: 3, is_correct: 0, score_weight: 0.10, outcome_class: 'Fail', signal_deltas: '{"prompt_iteration_quality": -0.5, "tool_fluency_index": -0.3}', rationale: "Switching tools without improving the prompt is unlikely to resolve the root cause, which is prompt quality." },
      { id: 'v10-ai-int-01-d', label: 'Ask a colleague to write the job description instead.', value: 'D', order: 4, is_correct: 0, score_weight: 0.00, outcome_class: 'Fail', signal_deltas: '{"prompt_iteration_quality": -0.8, "tool_fluency_index": -0.5}', rationale: "Abandoning the AI tool entirely when prompt iteration would resolve the issue is not an effective use of AI capability." },
    ]
  },
  {
    id: 'v10-ai-eval-01',
    blueprint_id: 'bp-aiq-v10-standard',
    item_type: 'scenario_mcq',
    prompt: "An AI tool generates a summary of your organisation's last 12 months of attrition data. The summary states: \"Attrition has decreased by 12% year-on-year, with the highest concentration in the technology function.\" You check the source data and find that attrition increased by 12%, not decreased.\n\nWhat does this error tell you, and what do you do?",
    metadata_json: JSON.stringify({"capability_key": "ai_output_evaluation", "primary_signal": "hallucination_acceptance_risk", "secondary_signals": ["error_detection_accuracy", "output_evaluation_quality"], "workflow": "Analytics", "risk_level": "High", "display_order": 6}),
    difficulty: 2,
    status: 'published',
    reasoning_required: 1,
    options: [
      { id: 'v10-ai-eval-01-a', label: 'The AI made a directional error on a key metric. Correct the summary, flag this as a known AI limitation to stakeholders, and verify all other statistics in the output before use.', value: 'A', order: 1, is_correct: 1, score_weight: 1.00, outcome_class: 'Pass', signal_deltas: '{"hallucination_acceptance_risk": -1.0, "error_detection_accuracy": 1.0, "output_evaluation_quality": 1.0}', rationale: "This response correctly identifies the error type, corrects it, and applies appropriate scrutiny to the rest of the output." },
      { id: 'v10-ai-eval-01-b', label: "Correct the specific error and use the rest of the summary as-is — one mistake does not mean the whole output is wrong.", value: 'B', order: 2, is_correct: 0, score_weight: 0.30, outcome_class: 'Partial', signal_deltas: '{"hallucination_acceptance_risk": 0.3, "error_detection_accuracy": -0.3, "output_evaluation_quality": -0.2}', rationale: "Correcting the error is right, but an AI that made a directional error on a headline metric warrants checking the other figures too." },
      { id: 'v10-ai-eval-01-c', label: 'Discard the AI output entirely and produce the summary manually.', value: 'C', order: 3, is_correct: 0, score_weight: 0.10, outcome_class: 'Fail', signal_deltas: '{"hallucination_acceptance_risk": 0.0, "output_evaluation_quality": -0.5}', rationale: "Discarding the entire output is an overreaction — the AI may have been accurate on other points, and manual verification is a more proportionate response." },
      { id: 'v10-ai-eval-01-d', label: "Use the summary as-is — you may have misread the source data.", value: 'D', order: 4, is_correct: 0, score_weight: 0.00, outcome_class: 'Fail', signal_deltas: '{"hallucination_acceptance_risk": 1.0, "error_detection_accuracy": -1.0}', rationale: "Doubting your own verified source data in favour of AI output is a dangerous form of over-reliance." },
    ]
  },
  {
    id: 'v10-ai-wfd-01',
    blueprint_id: 'bp-aiq-v10-standard',
    item_type: 'scenario_mcq',
    prompt: "Your team currently spends 4 hours per week manually screening CVs for a high-volume graduate role. You are considering using an AI tool to automate the initial screening.\n\nWhich approach best balances efficiency with appropriate oversight?",
    metadata_json: JSON.stringify({"capability_key": "ai_workflow_design", "primary_signal": "human_oversight_preservation", "secondary_signals": ["workflow_redesign_quality", "handoff_design_quality"], "workflow": "Recruitment", "risk_level": "Medium", "display_order": 11}),
    difficulty: 2,
    status: 'published',
    reasoning_required: 0,
    options: [
      { id: 'v10-ai-wfd-01-a', label: 'Use AI to fully automate screening — it will eliminate human bias and save time.', value: 'A', order: 1, is_correct: 0, score_weight: 0.10, outcome_class: 'Fail', signal_deltas: '{"human_oversight_preservation": -1.0, "automation_expansion_risk": 1.0}', rationale: "Full automation of screening without human review creates significant bias and legal risk. AI screening tools require human oversight." },
      { id: 'v10-ai-wfd-01-b', label: 'Use AI to produce a ranked shortlist with reasoning for each ranking decision. A human reviewer checks the top and bottom 10% of the list before any candidates are progressed or rejected.', value: 'B', order: 2, is_correct: 1, score_weight: 1.00, outcome_class: 'Pass', signal_deltas: '{"human_oversight_preservation": 1.0, "workflow_redesign_quality": 1.0, "handoff_design_quality": 0.9}', rationale: "This design preserves human oversight at the decision boundaries (top and bottom) while capturing efficiency gains in the middle." },
      { id: 'v10-ai-wfd-01-c', label: 'Use AI to screen CVs but have a human review every single decision — this ensures no bias.', value: 'C', order: 3, is_correct: 0, score_weight: 0.30, outcome_class: 'Partial', signal_deltas: '{"human_oversight_preservation": 0.5, "workflow_redesign_quality": -0.4}', rationale: "Reviewing every decision eliminates the efficiency benefit of AI screening. A risk-based oversight model is more proportionate." },
      { id: 'v10-ai-wfd-01-d', label: 'Do not use AI for screening — the risk of bias is too high.', value: 'D', order: 4, is_correct: 0, score_weight: 0.10, outcome_class: 'Fail', signal_deltas: '{"human_oversight_preservation": 0.0, "workflow_redesign_quality": -0.6}', rationale: "Avoiding AI entirely is overly cautious. With appropriate design and oversight, AI screening can be both efficient and fair." },
    ]
  },
  {
    id: 'v10-wf-air-01',
    blueprint_id: 'bp-aiq-v10-standard',
    item_type: 'scenario_mcq',
    prompt: "A senior leader asks you: \"Are our people ready for AI?\" You have access to engagement survey data, recent training completion rates, and a small number of informal conversations with managers.\n\nWhat is your most credible response?",
    metadata_json: JSON.stringify({"capability_key": "workforce_ai_readiness", "primary_signal": "capability_diagnosis_accuracy", "secondary_signals": ["leader_advisory_quality"], "workflow": "Workforce Planning", "risk_level": "Medium", "display_order": 16}),
    difficulty: 2,
    status: 'published',
    reasoning_required: 1,
    options: [
      { id: 'v10-wf-air-01-a', label: '"Based on current data, I cannot give you a definitive answer. I can tell you what the engagement data and training completion rates suggest, but to give you a reliable readiness assessment we need structured capability data. I recommend we run a short diagnostic before making investment decisions."', value: 'A', order: 1, is_correct: 1, score_weight: 1.00, outcome_class: 'Pass', signal_deltas: '{"capability_diagnosis_accuracy": 1.0, "leader_advisory_quality": 1.0}', rationale: "This response is honest about data limitations, uses available evidence appropriately, and recommends a structured approach." },
      { id: 'v10-wf-air-01-b', label: '"Yes, our training completion rates are high, so our people are ready."', value: 'B', order: 2, is_correct: 0, score_weight: 0.10, outcome_class: 'Fail', signal_deltas: '{"capability_diagnosis_accuracy": -1.0, "generic_prescription_risk": 0.8}', rationale: "Training completion is a proxy metric, not a readiness measure. This response overstates confidence in weak evidence." },
      { id: 'v10-wf-air-01-c', label: '"No, our people are not ready — we need a major AI training programme immediately."', value: 'C', order: 3, is_correct: 0, score_weight: 0.10, outcome_class: 'Fail', signal_deltas: '{"capability_diagnosis_accuracy": -0.8, "generic_prescription_risk": 1.0}', rationale: "This response reaches a strong conclusion from insufficient evidence and prescribes a generic solution without diagnosis." },
      { id: 'v10-wf-air-01-d', label: '"I\'ll need to check with the L&D team and come back to you."', value: 'D', order: 4, is_correct: 0, score_weight: 0.20, outcome_class: 'Partial', signal_deltas: '{"capability_diagnosis_accuracy": -0.2, "leader_advisory_quality": -0.3}', rationale: "Deferring to L&D is reasonable but misses the opportunity to provide immediate value from available data." },
    ]
  },
  {
    id: 'v10-ai-eth-01',
    blueprint_id: 'bp-aiq-v10-standard',
    item_type: 'scenario_mcq',
    prompt: "Your organisation is implementing an AI tool that monitors employee productivity in real time. The tool tracks keystrokes, application usage, and meeting attendance. The CEO wants to roll it out without telling employees.\n\nWhat do you do?",
    metadata_json: JSON.stringify({"capability_key": "ai_ethics_trust", "primary_signal": "employee_transparency_advocacy", "secondary_signals": ["ethics_under_pressure", "legal_vs_fair_distinction"], "workflow": "Employee Relations", "risk_level": "High", "display_order": 21}),
    difficulty: 3,
    status: 'published',
    reasoning_required: 1,
    options: [
      { id: 'v10-ai-eth-01-a', label: 'Implement the tool as requested — the CEO has made the decision.', value: 'A', order: 1, is_correct: 0, score_weight: 0.00, outcome_class: 'Fail', signal_deltas: '{"employee_transparency_advocacy": -1.0, "ethics_under_pressure": -1.0, "pressure_drift_risk": 1.0}', rationale: "Implementing covert employee monitoring without disclosure is likely unlawful under UK GDPR and the Employment Practices Code." },
      { id: 'v10-ai-eth-01-b', label: 'Advise the CEO that covert monitoring of this nature is likely unlawful under UK GDPR and the ICO Employment Practices Code. Recommend a transparent approach: consult with employees, conduct a DPIA, and communicate the purpose and scope of monitoring clearly.', value: 'B', order: 2, is_correct: 1, score_weight: 1.00, outcome_class: 'Pass', signal_deltas: '{"employee_transparency_advocacy": 1.0, "ethics_under_pressure": 1.0, "legal_vs_fair_distinction": 1.0}', rationale: "This response correctly identifies the legal risk, advocates for employee rights, and proposes a lawful and ethical alternative." },
      { id: 'v10-ai-eth-01-c', label: 'Implement the tool but only monitor a sample of employees to reduce the risk.', value: 'C', order: 3, is_correct: 0, score_weight: 0.10, outcome_class: 'Fail', signal_deltas: '{"employee_transparency_advocacy": -0.8, "pressure_drift_risk": 0.8}', rationale: "Partial covert monitoring is still unlawful and unethical." },
      { id: 'v10-ai-eth-01-d', label: 'Raise concerns with the CEO but implement the tool if they insist.', value: 'D', order: 4, is_correct: 0, score_weight: 0.10, outcome_class: 'Fail', signal_deltas: '{"ethics_under_pressure": -0.8, "pressure_drift_risk": 1.0}', rationale: "Raising concerns and then implementing an unlawful instruction is not an acceptable response." },
    ]
  },
  {
    id: 'v10-ai-cl-01',
    blueprint_id: 'bp-aiq-v10-standard',
    item_type: 'scenario_mcq',
    prompt: "You are rolling out an AI tool for HR teams. During a team briefing, a senior HR Business Partner says: \"I've been doing this job for 15 years. I don't need a machine telling me what to do.\"\n\nHow do you respond?",
    metadata_json: JSON.stringify({"capability_key": "ai_change_leadership", "primary_signal": "resistance_response_quality", "secondary_signals": ["legitimate_concern_recognition", "dismissive_of_concern_risk"], "workflow": "Change Management", "risk_level": "Medium", "display_order": 26}),
    difficulty: 2,
    status: 'published',
    reasoning_required: 0,
    options: [
      { id: 'v10-ai-cl-01-a', label: "Acknowledge their experience and clarify that the tool is designed to support their judgement, not replace it. Ask them to share a specific scenario where they would find AI support useful, to explore the tool's value together.", value: 'A', order: 1, is_correct: 1, score_weight: 1.00, outcome_class: 'Pass', signal_deltas: '{"resistance_response_quality": 1.0, "legitimate_concern_recognition": 1.0, "dismissive_of_concern_risk": -1.0}', rationale: "This response validates the concern, reframes the tool's purpose, and invites collaborative exploration." },
      { id: 'v10-ai-cl-01-b', label: 'Explain that the tool has been approved by the leadership team and everyone is expected to use it.', value: 'B', order: 2, is_correct: 0, score_weight: 0.10, outcome_class: 'Fail', signal_deltas: '{"resistance_response_quality": -0.8, "dismissive_of_concern_risk": 1.0}', rationale: "Citing authority without addressing the concern is dismissive and will increase resistance." },
      { id: 'v10-ai-cl-01-c', label: 'Suggest they attend additional training to understand the tool\'s capabilities.', value: 'C', order: 3, is_correct: 0, score_weight: 0.20, outcome_class: 'Partial', signal_deltas: '{"resistance_response_quality": -0.3, "legitimate_concern_recognition": -0.2}', rationale: "Training may help but does not address the emotional dimension of the concern." },
      { id: 'v10-ai-cl-01-d', label: 'Agree that experienced professionals may not need the tool and offer them an exemption.', value: 'D', order: 4, is_correct: 0, score_weight: 0.10, outcome_class: 'Fail', signal_deltas: '{"resistance_response_quality": -0.5, "change_pace_calibration": -0.6}', rationale: "Offering exemptions undermines the change programme and sets a precedent that resistance leads to opt-outs." },
    ]
  },
];

for (const item of items) {
  if (toInsert.includes(item.id)) {
    try {
      await conn.query(
        "INSERT INTO assessment_items (id, blueprint_id, item_type, prompt, metadata_json, difficulty, status, reasoning_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [item.id, item.blueprint_id, item.item_type, item.prompt, item.metadata_json, item.difficulty, item.status, item.reasoning_required]
      );
      console.log(`Inserted item: ${item.id}`);
      
      for (const opt of item.options) {
        await conn.query(
          "INSERT INTO assessment_item_options (id, item_id, label, value, option_order, is_correct, score_weight, outcome_class, signal_deltas_json, rationale_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [opt.id, item.id, opt.label, opt.value, opt.order, opt.is_correct, opt.score_weight, opt.outcome_class, opt.signal_deltas, opt.rationale]
        );
      }
      console.log(`Inserted ${item.options.length} options for ${item.id}`);
    } catch (e) {
      console.error(`Failed to insert ${item.id}:`, e.message);
    }
  }
}

const [final] = await conn.query("SELECT COUNT(*) as cnt FROM assessment_items WHERE blueprint_id = 'bp-aiq-v10-standard'");
console.log("Final v10 item count:", final[0].cnt);

await conn.end();
