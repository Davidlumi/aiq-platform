/**
 * Seed: Add canonical "Handling a Policy-Sensitive Complaint" simulation
 * from the AiQ build pack seed_data/simulation_definition.json
 *
 * Run: node scripts/seed-canonical-simulation.mjs
 */

import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL not set');

const conn = await mysql.createConnection(dbUrl);

// ─── Check if already seeded ──────────────────────────────────────────────────

const [existing] = await conn.execute(
  "SELECT id FROM simulations WHERE `key` = ?",
  ['policy_sensitive_complaint']
);
if (existing.length > 0) {
  console.log('Already seeded. Skipping.');
  await conn.end();
  process.exit(0);
}

const simId = 'sim-004';

// ─── Simulation ───────────────────────────────────────────────────────────────

await conn.execute(
  `INSERT INTO simulations (id, tenant_id, \`key\`, title, version, status, metadata_json, pass_conditions_json, created_at)
   VALUES (?, 'tenant-demo-001', ?, ?, 1, 'published', ?, ?, NOW())`,
  [
    simId,
    'policy_sensitive_complaint',
    'Handling a Policy-Sensitive Complaint',
    JSON.stringify({ description: 'Navigate a sensitive employee complaint with appropriate discretion, empathy, and policy compliance.', difficulty: 3, guided_mode: { trigger_after_failures: 2 } }),
    JSON.stringify({ min_total_score: 75, must_avoid_outcomes: ['public_disclosure'] }),
  ]
);
console.log('✓ Simulation inserted');

// ─── Nodes ────────────────────────────────────────────────────────────────────

const nodes = [
  ['sn-c01', simId, 'intro', 'decision',
   'An employee reports a concern during a team meeting. They seem distressed and mention that a colleague has been making comments that make them uncomfortable. What do you do first?',
   JSON.stringify({ setting: 'Team meeting, 8 people present', stakes: 'Employee wellbeing, team dynamics, potential policy breach', capability: 'appropriateness' }),
   1.0, 1, 1, 0],
  ['sn-c02', simId, 'private_followup', 'decision',
   'You\'ve moved to a private space with the employee. They seem hesitant and say "I don\'t want to make a big deal of this." What do you say next?',
   JSON.stringify({ setting: 'Private meeting room', stakes: 'Building trust, encouraging disclosure, avoiding minimisation', capability: 'appropriateness' }),
   1.5, 2, 0, 0],
  ['sn-c03', simId, 'escalation_decision', 'decision',
   'The employee has shared details of the incident. It appears to involve a pattern of behaviour over several weeks. What is your next step?',
   JSON.stringify({ setting: 'After initial disclosure', stakes: 'Proper escalation, documentation, protecting the employee', capability: 'governance' }),
   2.0, 3, 0, 0],
  ['sn-c04', simId, 'terminal_pass', 'outcome',
   'You handled the complaint with appropriate discretion and followed the correct escalation pathway. The employee feels supported and the matter has been referred to HR for formal investigation.',
   JSON.stringify({ outcome: 'pass', consequence: 'Employee feels supported. Proper investigation initiated. Policy complied with.' }),
   2.0, 10, 0, 1],
  ['sn-c05', simId, 'terminal_fail_public', 'outcome',
   'By discussing the complaint publicly, you have breached confidentiality requirements. The employee is now reluctant to cooperate with any investigation, and the organisation faces a potential grievance.',
   JSON.stringify({ outcome: 'fail', consequence: 'Confidentiality breach. Employee disengaged. Grievance risk elevated.', avoidedOutcome: 'public_disclosure' }),
   0.0, 11, 0, 1],
  ['sn-c06', simId, 'terminal_fail_dismiss', 'outcome',
   'By minimising the concern, you have failed to take appropriate action. The employee has now raised a formal grievance against the organisation for failing to act on a harassment complaint.',
   JSON.stringify({ outcome: 'fail', consequence: 'Formal grievance filed. Regulatory exposure. Employee trust destroyed.' }),
   0.0, 12, 0, 1],
];

for (const [id, simId_, key, type, prompt, ctx, weight, order, isStart, isEnd] of nodes) {
  await conn.execute(
    'INSERT INTO simulation_nodes (id, simulation_id, node_key, node_type, prompt, context_json, scoring_weight, node_order, is_start, is_end) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, simId_, key, type, prompt, ctx, weight, order, isStart, isEnd]
  );
}
console.log(`✓ ${nodes.length} nodes inserted`);

// ─── Choices ──────────────────────────────────────────────────────────────────

const choices = [
  // From intro
  ['sc-c01', 'sn-c01', 'c1_private',
   'Acknowledge the concern, pause the meeting briefly, and ask the employee to speak with you privately afterwards',
   1, 'positive', 20, -10,
   JSON.stringify({ feedback: 'Good. You\'ve protected the employee\'s dignity and created a safe space for disclosure.', next_node_id: 'sn-c02' })],
  ['sc-c02', 'sn-c01', 'c2_public',
   'Ask the employee to explain exactly what happened in front of the team so everyone understands the situation',
   2, 'negative', -30, 25,
   JSON.stringify({ feedback: 'Discussing a sensitive complaint in front of colleagues breaches confidentiality.', next_node_id: 'sn-c05' })],
  ['sc-c03', 'sn-c01', 'c3_redirect',
   'Suggest the employee speak to HR directly and continue the meeting',
   3, 'neutral', -10, 5,
   JSON.stringify({ feedback: 'Redirecting to HR is appropriate, but you\'ve missed an opportunity to provide immediate support.', next_node_id: 'sn-c02' })],
  // From private_followup
  ['sc-c04', 'sn-c02', 'c4_validate',
   '"I\'m glad you felt able to tell me. Whatever you share stays between us for now. Can you tell me more about what happened?"',
   1, 'positive', 20, -10,
   JSON.stringify({ feedback: 'Excellent. You\'ve validated their concern, clarified confidentiality, and created space to share more.', next_node_id: 'sn-c03' })],
  ['sc-c05', 'sn-c02', 'c5_minimise',
   '"I\'m sure it wasn\'t intentional. These things happen in teams. Maybe just try to move past it?"',
   2, 'negative', -25, 20,
   JSON.stringify({ feedback: 'Minimising the concern is a serious failure. The employee now feels unsupported.', next_node_id: 'sn-c06' })],
  ['sc-c06', 'sn-c02', 'c6_document',
   '"Let me take notes as you speak so we have a record of this conversation."',
   3, 'neutral', 10, -5,
   JSON.stringify({ feedback: 'Documenting is good practice, though leading with note-taking before building rapport can feel clinical.', next_node_id: 'sn-c03' })],
  // From escalation_decision
  ['sc-c07', 'sn-c03', 'c7_escalate_hr',
   'Inform the employee you are required to refer this to HR, explain the process, and make the referral with their knowledge',
   1, 'positive', 25, -15,
   JSON.stringify({ feedback: 'Correct. You\'ve followed the proper escalation pathway and kept the employee informed.', next_node_id: 'sn-c04' })],
  ['sc-c08', 'sn-c03', 'c8_handle_yourself',
   'Speak directly to the colleague mentioned and ask them to stop the behaviour',
   2, 'negative', -15, 15,
   JSON.stringify({ feedback: 'Handling this informally without HR involvement bypasses proper process.', next_node_id: 'sn-c06' })],
  ['sc-c09', 'sn-c03', 'c9_wait',
   'Tell the employee you\'ll monitor the situation and see if it happens again before taking action',
   3, 'negative', -20, 20,
   JSON.stringify({ feedback: 'Waiting is not appropriate when a pattern of behaviour has been disclosed.', next_node_id: 'sn-c06' })],
];

for (const [id, nodeId, key, text, order, outcomeType, scoreDelta, riskDelta, meta] of choices) {
  await conn.execute(
    `INSERT INTO simulation_choices (id, node_id, choice_key, label, choice_order, outcome_type, score_delta, risk_delta, metadata_json) VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, nodeId, key, text, order, outcomeType, scoreDelta, riskDelta, meta]
  );
}
console.log(`✓ ${choices.length} choices inserted`);

// ─── Transitions ──────────────────────────────────────────────────────────────

const transitions = [
  ['st-c01', simId, 'sn-c01', 'sc-c01', 'sn-c02'],
  ['st-c02', simId, 'sn-c01', 'sc-c02', 'sn-c05'],
  ['st-c03', simId, 'sn-c01', 'sc-c03', 'sn-c02'],
  ['st-c04', simId, 'sn-c02', 'sc-c04', 'sn-c03'],
  ['st-c05', simId, 'sn-c02', 'sc-c05', 'sn-c06'],
  ['st-c06', simId, 'sn-c02', 'sc-c06', 'sn-c03'],
  ['st-c07', simId, 'sn-c03', 'sc-c07', 'sn-c04'],
  ['st-c08', simId, 'sn-c03', 'sc-c08', 'sn-c06'],
  ['st-c09', simId, 'sn-c03', 'sc-c09', 'sn-c06'],
];

for (const [id, simId_, fromNodeId, choiceId, toNodeId] of transitions) {
  await conn.execute(
    `INSERT INTO simulation_transitions (id, simulation_id, from_node_id, choice_id, to_node_id, condition_json) VALUES (?,?,?,?,?,'{}')`,
    [id, simId_, fromNodeId, choiceId, toNodeId]
  );
}
console.log(`✓ ${transitions.length} transitions inserted`);

console.log('\n✓ Canonical simulation seeded successfully');
await conn.end();
