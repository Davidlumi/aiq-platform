import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

// `key` is a reserved word in TiDB — must be backtick-quoted
await conn.query(`INSERT IGNORE INTO simulations (id, tenant_id, \`key\`, title, version, status, metadata_json, pass_conditions_json, created_at) VALUES
  ('sim-001', 'tenant-demo-001', 'risk-assessment-sim', 'Risk Assessment Scenario', 1, 'published', '{}', '{}', NOW()),
  ('sim-002', 'tenant-demo-001', 'data-governance-sim', 'Data Governance Decision Tree', 1, 'published', '{}', '{}', NOW()),
  ('sim-003', 'tenant-demo-001', 'ai-ethics-sim', 'AI Ethics in Practice', 1, 'published', '{}', '{}', NOW())`);

await conn.query(`INSERT IGNORE INTO simulation_nodes (id, simulation_id, node_key, node_type, prompt, context_json, scoring_weight, node_order, is_start, is_end) VALUES
  ('sn-001', 'sim-001', 'start', 'decision', 'You are reviewing a new AI-powered hiring tool. The vendor claims it reduces bias. What is your first action?', '{}', 1.0, 1, 1, 0),
  ('sn-002', 'sim-001', 'audit-path', 'decision', 'You requested an independent audit. The audit reveals a 15% disparity in outcomes for one demographic group. What do you recommend?', '{}', 1.5, 2, 0, 0),
  ('sn-003', 'sim-001', 'end-good', 'outcome', 'Excellent. You identified the bias risk and recommended remediation before deployment. Strong AI governance demonstrated.', '{}', 2.0, 3, 0, 1),
  ('sn-004', 'sim-001', 'end-poor', 'outcome', 'The tool was deployed without adequate review. Six months later a bias complaint was filed. This is a governance failure.', '{}', 0.0, 4, 0, 1),
  ('sn-005', 'sim-002', 'start', 'decision', 'A colleague asks you to share a customer dataset with a third-party analytics vendor without a formal data sharing agreement. What do you do?', '{}', 1.0, 1, 1, 0),
  ('sn-006', 'sim-002', 'end-good', 'outcome', 'Correct. You escalated to the DPO and ensured a data processing agreement was in place before sharing. Excellent data governance.', '{}', 2.0, 2, 0, 1),
  ('sn-007', 'sim-002', 'end-poor', 'outcome', 'Sharing without a DPA is a data protection violation. This could result in regulatory action.', '{}', 0.0, 3, 0, 1),
  ('sn-008', 'sim-003', 'start', 'decision', 'Your team is deploying an AI model to screen job applications. A team member raises concerns about potential bias. What is your response?', '{}', 1.0, 1, 1, 0),
  ('sn-009', 'sim-003', 'end-good', 'outcome', 'You paused deployment, commissioned a bias audit, and documented the decision. This is exemplary AI ethics practice.', '{}', 2.0, 2, 0, 1),
  ('sn-010', 'sim-003', 'end-poor', 'outcome', 'Dismissing bias concerns without investigation is an ethics failure. The model was later found to discriminate against protected groups.', '{}', 0.0, 3, 0, 1)`);

// simulation_choices: id, node_id, choice_key, label, choice_order, outcome_type, score_delta, risk_delta, metadata_json
await conn.query(`INSERT IGNORE INTO simulation_choices (id, node_id, choice_key, label, choice_order, outcome_type, score_delta, risk_delta, metadata_json) VALUES
  ('sc-001', 'sn-001', 'request-audit', 'Request an independent algorithmic audit before deployment', 1, 'positive', 2.0, -0.5, '{"feedback":"Good thinking — independent validation is critical for AI tools.","next_node_id":"sn-002"}'),
  ('sc-002', 'sn-001', 'accept-vendor', 'Accept the vendor certification and proceed to deployment', 2, 'negative', -1.0, 1.0, '{"feedback":"Vendor self-certification is insufficient for high-stakes decisions.","next_node_id":"sn-004"}'),
  ('sc-003', 'sn-001', 'pilot-only', 'Run a small pilot with monitoring before full deployment', 3, 'neutral', 1.0, 0.0, '{"feedback":"Pilots are useful but you need audit data first.","next_node_id":"sn-002"}'),
  ('sc-004', 'sn-002', 'halt-remediate', 'Halt deployment and require vendor remediation of the disparity', 1, 'positive', 3.0, -1.0, '{"feedback":"Correct. A 15% disparity requires remediation before use in hiring.","next_node_id":"sn-003"}'),
  ('sc-005', 'sn-002', 'accept-disparity', 'Accept the disparity as within tolerance and proceed', 2, 'negative', -2.0, 2.0, '{"feedback":"A 15% disparity is not within acceptable tolerance for hiring decisions.","next_node_id":"sn-004"}'),
  ('sc-006', 'sn-005', 'escalate-dpo', 'Escalate to the Data Protection Officer and request a formal DPA', 1, 'positive', 3.0, -1.0, '{"feedback":"Correct. Always ensure legal agreements are in place before sharing personal data.","next_node_id":"sn-006"}'),
  ('sc-007', 'sn-005', 'share-anyway', 'Share the dataset as the business need is urgent', 2, 'negative', -2.0, 2.0, '{"feedback":"Urgency does not override data protection obligations.","next_node_id":"sn-007"}'),
  ('sc-008', 'sn-008', 'pause-audit', 'Pause deployment and commission an independent bias audit', 1, 'positive', 3.0, -1.0, '{"feedback":"Correct. Bias concerns must be investigated before deployment.","next_node_id":"sn-009"}'),
  ('sc-009', 'sn-008', 'dismiss-concern', 'Dismiss the concern and proceed — the model was validated by the vendor', 2, 'negative', -2.0, 2.0, '{"feedback":"Vendor validation does not cover all bias scenarios.","next_node_id":"sn-010"}')`);

// simulation_transitions to link choices to next nodes
await conn.query(`INSERT IGNORE INTO simulation_transitions (id, simulation_id, from_node_id, choice_id, to_node_id, condition_json) VALUES
  ('st-001', 'sim-001', 'sn-001', 'sc-001', 'sn-002', '{}'),
  ('st-002', 'sim-001', 'sn-001', 'sc-002', 'sn-004', '{}'),
  ('st-003', 'sim-001', 'sn-001', 'sc-003', 'sn-002', '{}'),
  ('st-004', 'sim-001', 'sn-002', 'sc-004', 'sn-003', '{}'),
  ('st-005', 'sim-001', 'sn-002', 'sc-005', 'sn-004', '{}'),
  ('st-006', 'sim-002', 'sn-005', 'sc-006', 'sn-006', '{}'),
  ('st-007', 'sim-002', 'sn-005', 'sc-007', 'sn-007', '{}'),
  ('st-008', 'sim-003', 'sn-008', 'sc-008', 'sn-009', '{}'),
  ('st-009', 'sim-003', 'sn-008', 'sc-009', 'sn-010', '{}')`);

console.log('Simulations seeded successfully');
await conn.end();
