/**
 * AIQ Content System — Scenario Expansion Seed
 * Adds ~90 additional scenarios across all 14 domains to bring total to ~120+
 * Each scenario has 4 options, 2 scoring anchors, and relevant tags
 */

import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Helper to insert a scenario with options and anchors
async function insertScenario(s) {
  const id = randomUUID();
  await conn.execute(
    `INSERT IGNORE INTO content_scenarios 
     (id, interaction_id, title, domain, capability_key, interaction_type, difficulty, risk_level, 
      governance_sensitive, scenario, \`constraint\`, question, workflow_key, role_keys_json, 
      failure_mode_keys_json, tags_json, primary_signal, ambiguity_level, status, version, 
      created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
    [
      id, s.interactionId, s.title, s.domain, s.capabilityKey, s.interactionType,
      s.difficulty, s.riskLevel, s.governanceSensitive ? 1 : 0,
      s.scenario, s.constraint || null, s.question,
      s.workflowKey || null,
      JSON.stringify(s.roleKeys || []),
      JSON.stringify(s.failureModes || []),
      JSON.stringify(s.tags || []),
      s.primarySignal || null,
      s.ambiguityLevel || 'medium',
      'published', 1
    ]
  );

  // Insert 4 options
  for (let i = 0; i < s.options.length; i++) {
    const opt = s.options[i];
    await conn.execute(
      `INSERT IGNORE INTO content_scenario_options
       (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        randomUUID(), id, i + 1,
        String.fromCharCode(65 + i), // A, B, C, D
        opt.text,
        opt.outcomeClass || 'neutral',
        JSON.stringify(opt.signals || {}),
        opt.rationale || null,
        opt.isOptimal ? 1 : 0
      ]
    );
  }

  // Insert anchors
  for (const anchor of (s.anchors || [])) {
    await conn.execute(
      `INSERT IGNORE INTO content_scenario_anchors
       (id, scenario_id, capability_key, score_band, descriptor, behavioral_indicators_json, created_at)
       VALUES (?,?,?,?,?,?,NOW())`,
      [
        randomUUID(), id,
        anchor.capabilityKey,
        anchor.scoreBand,
        anchor.descriptor,
        JSON.stringify(anchor.indicators || [])
      ]
    );
  }

  return id;
}

const scenarios = [
  // ─── Talent Acquisition (6 more) ─────────────────────────────────────────────
  {
    interactionId: 'TA-007',
    title: 'AI Screening Bias Detection',
    domain: 'Talent Acquisition',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your ATS vendor reports that their AI screening tool has a 94% accuracy rate. After reviewing 6 months of data, you notice that candidates from two universities are consistently screened out at a rate 3x higher than average, despite similar qualifications. The vendor says this is within acceptable parameters.',
    constraint: 'You have a hiring freeze in 6 weeks and 40 open roles to fill.',
    question: 'What is your most appropriate immediate response?',
    workflowKey: 'talent_acquisition',
    roleKeys: ['talent_acquisition_specialist', 'hr_business_partner'],
    failureModes: ['automation_bias', 'fairness_blindspot'],
    tags: ['governance', 'bias', 'ai_screening', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'high',
    options: [
      { text: 'Pause the AI screening tool immediately, notify legal, and conduct a full bias audit before resuming.', signals: { governance: 0.9, risk_management: 0.8, execution: -0.2 }, isTrap: false },
      { text: 'Continue using the tool while requesting more data from the vendor to confirm the pattern.', signals: { governance: -0.6, automation_bias: 0.8, risk_management: -0.4 }, isTrap: true },
      { text: 'Manually review all screened-out candidates from the affected universities for the next 30 days.', signals: { governance: 0.5, execution: 0.6, risk_management: 0.4 }, isTrap: false },
      { text: 'Report the issue to your CHRO and legal team, implement a parallel manual review process, and engage the vendor for remediation.', signals: { governance: 0.85, risk_management: 0.9, execution: 0.5 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Immediately escalates bias risk and implements safeguards without waiting for confirmation', indicators: ['Pauses tool use', 'Notifies legal', 'Documents the pattern'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Continues using biased tool while seeking more data', indicators: ['Defers action', 'Accepts vendor framing', 'Does not escalate'] }
    ]
  },
  {
    interactionId: 'TA-008',
    title: 'Candidate Data Retention Request',
    domain: 'Talent Acquisition',
    capabilityKey: 'governance',
    interactionType: 'situational_judgement',
    difficulty: 2,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'A candidate who was rejected 8 months ago emails requesting deletion of all their personal data under GDPR. Your ATS has their CV, interview notes, and assessment scores. The hiring manager wants to keep the data in case a similar role opens.',
    constraint: 'GDPR requires response within 30 days.',
    question: 'How do you handle this request?',
    workflowKey: 'talent_acquisition',
    roleKeys: ['talent_acquisition_specialist'],
    failureModes: ['data_governance_gap'],
    tags: ['governance', 'gdpr', 'data_privacy', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'low',
    options: [
      { text: 'Delete all candidate data immediately and confirm deletion to the candidate within 30 days.', signals: { governance: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Tell the hiring manager their preference takes precedence over the GDPR request.', signals: { governance: -0.9, risk_management: -0.8 }, isTrap: true },
      { text: 'Delete the data but keep anonymised interview notes for quality improvement purposes.', signals: { governance: 0.7, execution: 0.6 }, isTrap: false },
      { text: 'Consult your DPO, delete all data unless a legitimate interest exception applies, and document the decision.', signals: { governance: 0.95, risk_management: 0.85, execution: 0.6 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Prioritises legal compliance over operational convenience', indicators: ['Consults DPO', 'Documents decision', 'Responds within timeframe'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Allows business preference to override legal obligation', indicators: ['Defers to hiring manager', 'Ignores GDPR deadline'] }
    ]
  },
  {
    interactionId: 'TA-009',
    title: 'Structured Interview Consistency',
    domain: 'Talent Acquisition',
    capabilityKey: 'execution',
    interactionType: 'situational_judgement',
    difficulty: 2,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'During a debrief for a senior manager role, two interviewers gave the same candidate very different scores (3/10 vs 8/10) for the same competency. When asked, one interviewer says they asked an off-script question that revealed a "red flag" not captured in the scoring rubric.',
    constraint: 'You have 3 other candidates to debrief in the same session.',
    question: 'How do you handle the scoring discrepancy?',
    workflowKey: 'talent_acquisition',
    roleKeys: ['talent_acquisition_specialist'],
    failureModes: ['consistency_failure'],
    tags: ['structured_interview', 'bias', 'execution', 'medium_risk'],
    primarySignal: 'execution',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Average the two scores and move on to maintain debrief momentum.', signals: { execution: -0.4, governance: -0.3 }, isTrap: true },
      { text: 'Ask both interviewers to re-score using only the structured rubric, excluding the off-script observation.', signals: { execution: 0.7, governance: 0.6 }, isTrap: false },
      { text: 'Document the off-script observation separately, re-score the structured competency, and flag the process deviation for review.', signals: { execution: 0.85, governance: 0.8, risk_management: 0.7 }, isTrap: false },
      { text: 'Disqualify the candidate due to the red flag regardless of the structured scores.', signals: { execution: -0.5, governance: -0.7 }, isTrap: true }
    ],
    anchors: [
      { capabilityKey: 'execution', scoreBand: 'high', descriptor: 'Maintains process integrity while capturing relevant information separately', indicators: ['Separates structured from unstructured data', 'Documents deviation', 'Re-scores correctly'] },
      { capabilityKey: 'execution', scoreBand: 'low', descriptor: 'Compromises structured process by averaging or ignoring discrepancy', indicators: ['Averages scores', 'Ignores process deviation'] }
    ]
  },
  {
    interactionId: 'TA-010',
    title: 'Counter-Offer Handling',
    domain: 'Talent Acquisition',
    capabilityKey: 'judgement',
    interactionType: 'situational_judgement',
    difficulty: 2,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'Your top candidate for a critical engineering role has just received a counter-offer from their current employer that is 15% above your offer. The hiring manager is pushing you to match it immediately. Your compensation band only allows 10% above midpoint, which you have already offered.',
    constraint: 'The role has been open for 4 months. The candidate needs a decision in 48 hours.',
    question: 'What is your recommended course of action?',
    workflowKey: 'talent_acquisition',
    roleKeys: ['talent_acquisition_specialist', 'hr_business_partner'],
    failureModes: [],
    tags: ['compensation', 'negotiation', 'judgement', 'medium_risk'],
    primarySignal: 'judgement',
    ambiguityLevel: 'high',
    options: [
      { text: 'Immediately match the counter-offer to secure the candidate.', signals: { execution: 0.3, judgement: -0.4, risk_management: -0.3 }, isTrap: true },
      { text: 'Decline to match and let the candidate go, maintaining compensation equity.', signals: { governance: 0.6, judgement: 0.4, execution: -0.2 }, isTrap: false },
      { text: 'Explore non-monetary elements (signing bonus, equity, flexibility) that could close the gap without breaking the band, and escalate if a band exception is warranted.', signals: { judgement: 0.9, execution: 0.8, risk_management: 0.7 }, isTrap: false },
      { text: 'Ask the hiring manager to fund the difference from their departmental budget.', signals: { execution: 0.4, judgement: 0.3, governance: -0.2 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'judgement', scoreBand: 'high', descriptor: 'Explores creative solutions within governance constraints before escalating', indicators: ['Considers non-monetary options', 'Escalates appropriately', 'Maintains equity awareness'] },
      { capabilityKey: 'judgement', scoreBand: 'low', descriptor: 'Reacts to pressure without considering systemic implications', indicators: ['Immediately matches offer', 'Ignores band implications'] }
    ]
  },
  {
    interactionId: 'TA-011',
    title: 'Referral Programme Conflict of Interest',
    domain: 'Talent Acquisition',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'A senior director has referred their spouse for a role in a different department. The spouse is genuinely well-qualified. The referring director is not the hiring manager but sits on the interview panel as a "subject matter expert".',
    constraint: 'Your referral programme offers a £2,000 bonus for successful hires.',
    question: 'How do you handle this situation?',
    workflowKey: 'talent_acquisition',
    roleKeys: ['talent_acquisition_specialist', 'hr_business_partner'],
    failureModes: ['conflict_of_interest'],
    tags: ['governance', 'conflict_of_interest', 'referral', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Allow the process to proceed as the director is not the hiring manager.', signals: { governance: -0.7, risk_management: -0.6 }, isTrap: true },
      { text: 'Remove the director from the interview panel and proceed with the referral under standard process.', signals: { governance: 0.8, execution: 0.7, risk_management: 0.7 }, isTrap: false },
      { text: 'Reject the referral to avoid any appearance of impropriety.', signals: { governance: 0.4, execution: -0.2 }, isTrap: false },
      { text: 'Remove the director from the panel, disclose the relationship to the hiring manager and HR leadership, document the conflict of interest, and proceed with the referral under enhanced scrutiny.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Proactively manages conflict of interest with full disclosure and process controls', indicators: ['Removes conflicted party', 'Discloses relationship', 'Documents decision'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Allows conflict of interest to persist due to structural separation', indicators: ['Relies on reporting line separation', 'Does not disclose'] }
    ]
  },
  {
    interactionId: 'TA-012',
    title: 'Headcount Freeze Mid-Process',
    domain: 'Talent Acquisition',
    capabilityKey: 'execution',
    interactionType: 'situational_judgement',
    difficulty: 2,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'You are at the offer stage with your preferred candidate for a critical role when Finance announces an immediate headcount freeze. The candidate has resigned from their current role in anticipation of your offer. The hiring manager is furious and wants you to "find a way" to make the hire.',
    constraint: 'The freeze is company-wide with no exceptions process yet defined.',
    question: 'What is your most appropriate response?',
    workflowKey: 'talent_acquisition',
    roleKeys: ['talent_acquisition_specialist'],
    failureModes: [],
    tags: ['execution', 'stakeholder_management', 'medium_risk'],
    primarySignal: 'execution',
    ambiguityLevel: 'high',
    options: [
      { text: 'Make the offer anyway and deal with the consequences later.', signals: { execution: -0.7, governance: -0.8 }, isTrap: true },
      { text: 'Immediately inform the candidate of the freeze, apologise, and explore whether a contractor or fixed-term arrangement is possible as a bridge.', signals: { execution: 0.8, judgement: 0.8, risk_management: 0.7 }, isTrap: false },
      { text: 'Tell the hiring manager to escalate to the CEO for an exception.', signals: { execution: 0.3, judgement: 0.3 }, isTrap: false },
      { text: 'Delay communicating with the candidate while waiting for the freeze to lift.', signals: { execution: -0.5, judgement: -0.4 }, isTrap: true }
    ],
    anchors: [
      { capabilityKey: 'execution', scoreBand: 'high', descriptor: 'Communicates transparently with candidate while exploring legitimate alternatives', indicators: ['Informs candidate promptly', 'Explores bridge options', 'Does not make unauthorised offer'] },
      { capabilityKey: 'execution', scoreBand: 'low', descriptor: 'Proceeds with offer or delays communication to avoid difficult conversation', indicators: ['Makes unauthorised offer', 'Delays candidate communication'] }
    ]
  },

  // ─── Performance Management (4 more) ─────────────────────────────────────────
  {
    interactionId: 'PM-002',
    title: 'AI Performance Rating Disagreement',
    domain: 'Performance Management',
    capabilityKey: 'judgement',
    interactionType: 'critique',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your company uses an AI tool to generate preliminary performance ratings based on productivity metrics, email response times, and project completion data. A high-performing employee who took 3 months of parental leave this year has received a "Below Expectations" rating from the AI. Their manager rates them "Exceeds Expectations" based on quality of work.',
    constraint: 'Ratings are due in 48 hours for the compensation cycle.',
    question: 'How do you advise the manager to proceed?',
    workflowKey: 'performance_management',
    roleKeys: ['hr_business_partner', 'hr_leader'],
    failureModes: ['automation_bias', 'fairness_blindspot'],
    tags: ['governance', 'bias', 'performance', 'parental_leave', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Use the AI rating as it is objective and consistent across the organisation.', signals: { governance: -0.9, judgement: -0.7, automation_bias: 0.9 }, isTrap: true },
      { text: 'Override the AI rating with the manager\'s assessment and document the reason.', signals: { governance: 0.7, judgement: 0.8, execution: 0.6 }, isTrap: false },
      { text: 'Average the AI and manager ratings to reach a compromise.', signals: { governance: -0.4, judgement: -0.3 }, isTrap: true },
      { text: 'Override the AI rating, document the parental leave context, flag the AI tool\'s failure to account for protected leave, and escalate for a policy review of the AI rating methodology.', signals: { governance: 0.95, judgement: 0.9, risk_management: 0.85 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Identifies systemic bias in AI tool and escalates for policy review', indicators: ['Overrides AI rating', 'Documents reason', 'Escalates methodology issue'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Defers to AI rating without considering protected characteristic impact', indicators: ['Uses AI rating uncritically', 'Does not flag methodology issue'] }
    ]
  },
  {
    interactionId: 'PM-003',
    title: 'Underperformance vs Mental Health',
    domain: 'Performance Management',
    capabilityKey: 'judgement',
    interactionType: 'situational_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'A manager wants to start formal capability proceedings against an employee whose performance has declined significantly over 6 months. In a recent 1:1, the employee disclosed they are receiving treatment for anxiety. The manager says "I can\'t let this affect the team\'s targets."',
    constraint: 'The team is under significant delivery pressure with a product launch in 8 weeks.',
    question: 'How do you advise the manager?',
    workflowKey: 'performance_management',
    roleKeys: ['hr_business_partner'],
    failureModes: ['fairness_blindspot'],
    tags: ['governance', 'mental_health', 'disability', 'performance', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'high',
    options: [
      { text: 'Proceed with capability proceedings as the business need is legitimate.', signals: { governance: -0.9, risk_management: -0.8 }, isTrap: true },
      { text: 'Pause capability proceedings, conduct a reasonable adjustments assessment, and explore a phased return or adjusted targets.', signals: { governance: 0.9, judgement: 0.85, risk_management: 0.8 }, isTrap: false },
      { text: 'Refer the employee to occupational health and wait for their report before deciding.', signals: { governance: 0.7, execution: 0.5, judgement: 0.6 }, isTrap: false },
      { text: 'Advise the manager to document the performance issues separately from the health disclosure to maintain a clean capability case.', signals: { governance: -0.7, risk_management: -0.6 }, isTrap: true }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Recognises disability discrimination risk and implements reasonable adjustments process', indicators: ['Pauses capability', 'Reasonable adjustments assessment', 'Occupational health referral'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Proceeds with capability without considering disability obligations', indicators: ['Proceeds with capability', 'Separates health from performance artificially'] }
    ]
  },
  {
    interactionId: 'PM-004',
    title: 'Stack Ranking Pressure',
    domain: 'Performance Management',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'The CEO has instructed HR to implement a forced distribution (stack ranking) where 10% of employees must be rated "Unsatisfactory" regardless of actual performance. The HR Director asks you to design the process. You know that research shows forced distribution increases bias and reduces psychological safety.',
    constraint: 'The CEO has made this a strategic priority for the next performance cycle starting in 3 months.',
    question: 'How do you respond to the HR Director\'s request?',
    workflowKey: 'performance_management',
    roleKeys: ['hr_leader', 'hr_business_partner'],
    failureModes: ['fairness_blindspot', 'automation_bias'],
    tags: ['governance', 'bias', 'performance', 'high_risk', 'executive_pressure'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'high',
    options: [
      { text: 'Design the process as requested — it\'s the CEO\'s decision.', signals: { governance: -0.8, judgement: -0.7 }, isTrap: true },
      { text: 'Refuse to implement it on ethical grounds.', signals: { governance: 0.4, judgement: 0.3, execution: -0.4 }, isTrap: false },
      { text: 'Design the process but include safeguards: mandatory calibration, bias training, and an appeals process.', signals: { governance: 0.6, judgement: 0.7, execution: 0.7 }, isTrap: false },
      { text: 'Prepare a business case for the HR Director presenting the evidence against forced distribution, propose an alternative differentiated performance approach, and request a meeting with the CEO to present the risks before proceeding.', signals: { governance: 0.9, judgement: 0.95, risk_management: 0.85, execution: 0.7 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Challenges directive with evidence and proposes alternatives before implementation', indicators: ['Presents evidence', 'Proposes alternative', 'Escalates risk to CEO'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Implements directive without challenge or with only superficial safeguards', indicators: ['Designs process as requested', 'Does not present evidence-based challenge'] }
    ]
  },
  {
    interactionId: 'PM-005',
    title: 'Remote Worker Performance Monitoring',
    domain: 'Performance Management',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'A manager wants to install monitoring software on remote workers\' laptops that tracks keystrokes, takes random screenshots every 5 minutes, and monitors all application usage. They argue it\'s the only way to ensure productivity. Several employees have already raised concerns about privacy.',
    constraint: 'The company does not currently have a remote working monitoring policy.',
    question: 'How do you advise the manager?',
    workflowKey: 'performance_management',
    roleKeys: ['hr_business_partner', 'hr_leader'],
    failureModes: ['data_governance_gap', 'fairness_blindspot'],
    tags: ['governance', 'privacy', 'monitoring', 'remote_work', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Approve the monitoring as the manager has a legitimate business interest.', signals: { governance: -0.9, risk_management: -0.8 }, isTrap: true },
      { text: 'Decline the request and advise the manager to use output-based performance metrics instead.', signals: { governance: 0.7, judgement: 0.7 }, isTrap: false },
      { text: 'Advise that any monitoring requires a DPIA, employee consultation, a clear policy, and must be proportionate — the proposed level of surveillance is likely disproportionate.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Implement monitoring for a trial period to gather data before making a policy decision.', signals: { governance: -0.6, risk_management: -0.5 }, isTrap: true }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Applies proportionality principle and requires DPIA before any monitoring', indicators: ['Requires DPIA', 'Applies proportionality', 'Advises on consultation requirements'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Approves monitoring without legal/ethical assessment', indicators: ['Approves without DPIA', 'Ignores proportionality'] }
    ]
  },

  // ─── Employee Relations (4 more) ──────────────────────────────────────────────
  {
    interactionId: 'ER-004',
    title: 'Whistleblower Retaliation Risk',
    domain: 'Employee Relations',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 4,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'An employee made a protected disclosure 3 months ago about financial irregularities. Since then, they have been excluded from key meetings, given a poor performance review (their first ever), and their team has been restructured leaving them in a less senior role. The manager denies any connection.',
    constraint: 'The employee has not yet raised a formal grievance but has spoken to you informally.',
    question: 'What is your most appropriate course of action?',
    workflowKey: 'employee_relations',
    roleKeys: ['hr_business_partner', 'employee_relations_specialist'],
    failureModes: ['fairness_blindspot'],
    tags: ['governance', 'whistleblowing', 'retaliation', 'high_risk', 'legal'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'high',
    options: [
      { text: 'Wait for the employee to raise a formal grievance before taking action.', signals: { governance: -0.7, risk_management: -0.6 }, isTrap: true },
      { text: 'Speak to the manager to understand their perspective before deciding on next steps.', signals: { governance: 0.3, execution: 0.4 }, isTrap: false },
      { text: 'Immediately escalate to legal counsel and senior HR leadership, document the timeline of events, and advise the employee of their rights under whistleblowing legislation.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Advise the employee to document the incidents and submit a formal grievance.', signals: { governance: 0.5, execution: 0.5 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Recognises detriment pattern and escalates without waiting for formal complaint', indicators: ['Escalates to legal', 'Documents timeline', 'Advises employee of rights'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Waits for formal complaint before acting on clear retaliation pattern', indicators: ['Waits for formal grievance', 'Does not escalate'] }
    ]
  },
  {
    interactionId: 'ER-005',
    title: 'Social Media Misconduct',
    domain: 'Employee Relations',
    capabilityKey: 'judgement',
    interactionType: 'situational_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'An employee has posted on their personal social media account criticising the company\'s recent redundancy programme as "cruel and dishonest." The post has been shared 200 times and several journalists have contacted your communications team. The post does not identify the employee as a company employee.',
    constraint: 'You do not have a social media policy.',
    question: 'How do you advise the business?',
    workflowKey: 'employee_relations',
    roleKeys: ['hr_business_partner', 'employee_relations_specialist'],
    failureModes: [],
    tags: ['employee_relations', 'social_media', 'misconduct', 'high_risk'],
    primarySignal: 'judgement',
    ambiguityLevel: 'high',
    options: [
      { text: 'Immediately start a disciplinary process for bringing the company into disrepute.', signals: { governance: -0.6, judgement: -0.5, risk_management: -0.4 }, isTrap: true },
      { text: 'Take no action as the employee has not identified themselves as a company employee.', signals: { governance: 0.3, judgement: 0.4 }, isTrap: false },
      { text: 'Seek legal advice on the limits of employee expression, assess whether the post constitutes protected disclosure or legitimate criticism, and develop a social media policy before considering any disciplinary action.', signals: { governance: 0.9, judgement: 0.85, risk_management: 0.8 }, isTrap: false },
      { text: 'Have a supportive conversation with the employee to understand their concerns and explore whether the underlying issues can be addressed.', signals: { judgement: 0.7, execution: 0.6, governance: 0.5 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'judgement', scoreBand: 'high', descriptor: 'Assesses legal position before action and addresses underlying concerns', indicators: ['Seeks legal advice', 'Considers protected disclosure', 'Develops policy'] },
      { capabilityKey: 'judgement', scoreBand: 'low', descriptor: 'Immediately escalates to disciplinary without legal assessment', indicators: ['Starts disciplinary immediately', 'Does not consider protected disclosure'] }
    ]
  },
  {
    interactionId: 'ER-006',
    title: 'Grievance Against HR',
    domain: 'Employee Relations',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'An employee has raised a formal grievance against you personally, alleging that you handled their previous grievance in a biased manner. You are the only HR Business Partner in the organisation. The employee is requesting an independent investigator.',
    constraint: 'You have no external HR support budget.',
    question: 'How do you handle this situation?',
    workflowKey: 'employee_relations',
    roleKeys: ['hr_business_partner'],
    failureModes: ['conflict_of_interest'],
    tags: ['governance', 'conflict_of_interest', 'grievance', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Handle the grievance yourself as you are the only HR resource available.', signals: { governance: -0.9, risk_management: -0.8 }, isTrap: true },
      { text: 'Escalate to your line manager and recommend appointing an external HR consultant or employment lawyer to investigate.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Ask a senior manager with no involvement to handle the grievance.', signals: { governance: 0.6, execution: 0.5 }, isTrap: false },
      { text: 'Advise the employee to use an external mediation service.', signals: { governance: 0.4, execution: 0.4 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Immediately recuses and escalates to ensure independent investigation', indicators: ['Recuses from investigation', 'Escalates to line manager', 'Recommends external investigator'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Attempts to handle grievance despite clear conflict of interest', indicators: ['Handles own grievance', 'Does not recuse'] }
    ]
  },
  {
    interactionId: 'ER-007',
    title: 'Zero-Hours Contract Ethics',
    domain: 'Employee Relations',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'A business unit manager wants to convert 15 permanent part-time employees to zero-hours contracts to "increase flexibility." The employees have been in their roles for 3-7 years and have consistent working patterns. The manager argues this will save £120,000 per year.',
    constraint: 'The company has a stated commitment to "fair work" in its ESG report.',
    question: 'How do you advise the manager?',
    workflowKey: 'employee_relations',
    roleKeys: ['hr_business_partner', 'hr_leader'],
    failureModes: ['fairness_blindspot'],
    tags: ['governance', 'employment_law', 'zero_hours', 'high_risk', 'esg'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Support the conversion as the business case is clear.', signals: { governance: -0.8, risk_management: -0.7 }, isTrap: true },
      { text: 'Advise that the conversion is legally possible but recommend against it given ESG commitments and employee tenure.', signals: { governance: 0.7, judgement: 0.7, risk_management: 0.6 }, isTrap: false },
      { text: 'Advise that employees with consistent patterns may have implied contractual rights, the conversion requires individual consultation, and it contradicts the company\'s ESG commitments — recommend a full legal and reputational risk assessment.', signals: { governance: 0.95, risk_management: 0.9, judgement: 0.85 }, isTrap: false },
      { text: 'Suggest a pilot with 3 employees to test the approach before full rollout.', signals: { governance: -0.3, execution: 0.3 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Identifies legal risk, ESG contradiction, and requires full risk assessment', indicators: ['Identifies implied rights', 'Flags ESG contradiction', 'Requires legal assessment'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Supports conversion based on cost saving without legal or ethical assessment', indicators: ['Supports conversion', 'Ignores ESG commitment'] }
    ]
  },

  // ─── Redundancy & Restructuring (4 more) ──────────────────────────────────────
  {
    interactionId: 'RR-003',
    title: 'Selection Pool Definition',
    domain: 'Redundancy & Restructuring',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 4,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'A manager wants to make one of two employees redundant. Both do similar work but the manager wants to define the selection pool as only the employee they want to dismiss, effectively making the redundancy "automatic." The other employee is currently on maternity leave.',
    constraint: 'The redundancy must be completed within 30 days.',
    question: 'How do you advise the manager?',
    workflowKey: 'redundancy_restructuring',
    roleKeys: ['hr_business_partner', 'employee_relations_specialist'],
    failureModes: ['fairness_blindspot'],
    tags: ['governance', 'redundancy', 'maternity', 'high_risk', 'legal'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'low',
    options: [
      { text: 'Proceed as the manager has defined the business need.', signals: { governance: -0.95, risk_management: -0.9 }, isTrap: true },
      { text: 'Advise that the selection pool must include all employees doing substantially similar work, and that the employee on maternity leave has enhanced redundancy protections.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Suggest the manager documents a business reason for excluding the other employee from the pool.', signals: { governance: -0.7, risk_management: -0.6 }, isTrap: true },
      { text: 'Advise the manager to consult legal before proceeding.', signals: { governance: 0.6, execution: 0.5 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Identifies unlawful pool manipulation and enhanced maternity protections', indicators: ['Redefines pool correctly', 'Flags maternity protections', 'Does not assist with unlawful process'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Assists manager in manipulating selection pool', indicators: ['Accepts manager\'s pool definition', 'Helps document exclusion'] }
    ]
  },
  {
    interactionId: 'RR-004',
    title: 'Collective Consultation Threshold',
    domain: 'Redundancy & Restructuring',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 4,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'The business is planning to make 18 employees redundant across 3 departments over the next 90 days. The CEO wants to announce all redundancies simultaneously next week to "avoid uncertainty." You know that 20+ redundancies in 90 days triggers collective consultation obligations.',
    constraint: 'The CEO has already briefed the board and wants to proceed.',
    question: 'What is your advice to the CEO?',
    workflowKey: 'redundancy_restructuring',
    roleKeys: ['hr_leader', 'hr_business_partner'],
    failureModes: [],
    tags: ['governance', 'redundancy', 'collective_consultation', 'high_risk', 'legal'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'low',
    options: [
      { text: 'Proceed as planned — 18 is below the 20 threshold.', signals: { governance: 0.3, risk_management: 0.2 }, isTrap: false },
      { text: 'Advise that if any additional redundancies are likely in the 90-day window, the threshold may be triggered, and recommend a legal review before announcing.', signals: { governance: 0.9, risk_management: 0.85, execution: 0.7 }, isTrap: false },
      { text: 'Stagger the redundancies across departments to stay under the threshold.', signals: { governance: -0.7, risk_management: -0.6 }, isTrap: true },
      { text: 'Delay the announcement until legal counsel has confirmed the position.', signals: { governance: 0.7, execution: 0.5 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Identifies threshold risk and recommends legal review before announcement', indicators: ['Flags threshold risk', 'Recommends legal review', 'Does not assist with threshold avoidance'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Assists in structuring redundancies to avoid collective consultation', indicators: ['Suggests staggering', 'Accepts 18 as safe without further analysis'] }
    ]
  },
  {
    interactionId: 'RR-005',
    title: 'TUPE Transfer Obligations',
    domain: 'Redundancy & Restructuring',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 4,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your company is outsourcing its facilities management function to a third-party provider. 12 employees currently perform this function. The new provider wants to offer them new contracts with different terms and conditions. The CEO says "they can take it or leave it."',
    constraint: 'The outsourcing is planned to complete in 6 weeks.',
    question: 'How do you advise the CEO?',
    workflowKey: 'redundancy_restructuring',
    roleKeys: ['hr_leader', 'hr_business_partner'],
    failureModes: [],
    tags: ['governance', 'tupe', 'outsourcing', 'high_risk', 'legal'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'low',
    options: [
      { text: 'Proceed as the employees will have a choice to accept or reject.', signals: { governance: -0.9, risk_management: -0.85 }, isTrap: true },
      { text: 'Advise that TUPE likely applies, employees\' existing terms must be preserved, and any variation to terms is void unless for an ETO reason — the current approach exposes the company to significant legal liability.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Advise the new provider to make the terms as attractive as possible to encourage acceptance.', signals: { governance: -0.3, execution: 0.3 }, isTrap: false },
      { text: 'Seek employment law advice immediately and inform the CEO of the TUPE obligations.', signals: { governance: 0.8, execution: 0.7 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Identifies TUPE application and advises on void variation risk', indicators: ['Identifies TUPE', 'Advises on void variation', 'Escalates to legal'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Proceeds without TUPE analysis', indicators: ['Proceeds without TUPE check', 'Accepts "take it or leave it" framing'] }
    ]
  },
  {
    interactionId: 'RR-006',
    title: 'Survivor Syndrome Management',
    domain: 'Redundancy & Restructuring',
    capabilityKey: 'execution',
    interactionType: 'situational_judgement',
    difficulty: 2,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'Three months after a significant redundancy programme (25% headcount reduction), engagement scores have dropped by 18 points, voluntary turnover is up 12%, and several high performers have started job searching. The CEO wants to know what HR is doing about it.',
    constraint: 'The business is still in a cost-reduction mode with limited budget for engagement initiatives.',
    question: 'What is your recommended approach?',
    workflowKey: 'redundancy_restructuring',
    roleKeys: ['hr_leader', 'hr_business_partner'],
    failureModes: [],
    tags: ['execution', 'engagement', 'change_management', 'medium_risk'],
    primarySignal: 'execution',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Launch a company-wide engagement survey to gather more data before acting.', signals: { execution: 0.3, judgement: 0.3 }, isTrap: false },
      { text: 'Implement a recognition programme and team social events to boost morale.', signals: { execution: 0.4, judgement: -0.2 }, isTrap: false },
      { text: 'Conduct stay interviews with high performers, address the root causes of uncertainty (role clarity, career paths, workload), and brief managers on survivor syndrome and how to address it.', signals: { execution: 0.9, judgement: 0.85, risk_management: 0.7 }, isTrap: false },
      { text: 'Advise the CEO that this is a normal post-redundancy reaction that will resolve itself over time.', signals: { execution: -0.5, judgement: -0.4 }, isTrap: true }
    ],
    anchors: [
      { capabilityKey: 'execution', scoreBand: 'high', descriptor: 'Addresses root causes through targeted interventions with high performers', indicators: ['Stay interviews', 'Manager briefing', 'Role clarity focus'] },
      { capabilityKey: 'execution', scoreBand: 'low', descriptor: 'Relies on superficial engagement activities or dismisses the issue', indicators: ['Surface-level activities', 'Normalises without action'] }
    ]
  },

  // ─── AI Governance (4 more) ───────────────────────────────────────────────────
  {
    interactionId: 'AG-005',
    title: 'AI Vendor Due Diligence',
    domain: 'AI Governance',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your company is evaluating an AI-powered succession planning tool. The vendor claims 87% accuracy in predicting "high potential" employees. When you ask about their training data and bias testing methodology, they say this is "proprietary information" and offer only a summary report.',
    constraint: 'The CHRO is keen to implement before the next talent review in 8 weeks.',
    question: 'How do you advise on the procurement decision?',
    workflowKey: 'ai_governance',
    roleKeys: ['hr_leader', 'hr_business_partner'],
    failureModes: ['automation_bias', 'fairness_blindspot', 'transparency_gap'],
    tags: ['governance', 'ai_procurement', 'bias', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Proceed with procurement — the vendor\'s summary report is sufficient.', signals: { governance: -0.8, risk_management: -0.7, automation_bias: 0.8 }, isTrap: true },
      { text: 'Request a bias audit report from an independent third party as a condition of procurement.', signals: { governance: 0.85, risk_management: 0.8, execution: 0.6 }, isTrap: false },
      { text: 'Decline to proceed without transparency on training data and bias testing — the lack of explainability is a red flag for a high-stakes HR decision.', signals: { governance: 0.9, risk_management: 0.85, judgement: 0.8 }, isTrap: false },
      { text: 'Implement the tool for a 3-month pilot and monitor outcomes for bias.', signals: { governance: -0.4, execution: 0.4 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Requires transparency and independent bias audit before high-stakes AI procurement', indicators: ['Requires bias audit', 'Flags explainability gap', 'Does not proceed without transparency'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Accepts vendor summary without independent validation', indicators: ['Accepts summary report', 'Proceeds without bias audit'] }
    ]
  },
  {
    interactionId: 'AG-006',
    title: 'AI Recommendation Override',
    domain: 'AI Governance',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your AI-powered learning recommendation engine has recommended a mandatory compliance training module for all employees. However, the module contains content that your DEI team has flagged as potentially reinforcing stereotypes. The AI cannot explain why it selected this module.',
    constraint: 'The compliance deadline is 2 weeks away.',
    question: 'What do you do?',
    workflowKey: 'ai_governance',
    roleKeys: ['hr_leader', 'learning_development_specialist'],
    failureModes: ['automation_bias', 'fairness_blindspot', 'transparency_gap'],
    tags: ['governance', 'ai_recommendation', 'dei', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Deploy the module as the AI has selected it for compliance purposes.', signals: { governance: -0.8, automation_bias: 0.8 }, isTrap: true },
      { text: 'Override the AI recommendation, source an alternative module, and flag the AI\'s lack of explainability for review.', signals: { governance: 0.9, risk_management: 0.8, execution: 0.7 }, isTrap: false },
      { text: 'Ask the DEI team to review the module and make amendments before deployment.', signals: { governance: 0.6, execution: 0.6 }, isTrap: false },
      { text: 'Deploy the module with a disclaimer about the content concerns.', signals: { governance: -0.4, execution: 0.3 }, isTrap: true }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Overrides AI recommendation when human review identifies harm risk', indicators: ['Overrides AI', 'Sources alternative', 'Flags explainability gap'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Deploys AI recommendation despite identified harm risk', indicators: ['Deploys flagged content', 'Defers to AI selection'] }
    ]
  },
  {
    interactionId: 'AG-007',
    title: 'Algorithmic Promotion Decision',
    domain: 'AI Governance',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 4,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your company uses an AI model to rank candidates for internal promotion. An employee who was passed over for promotion requests an explanation of why they were not selected. The AI model produces a score but cannot provide a human-interpretable explanation. The employee is considering a discrimination claim.',
    constraint: 'You have no explainability documentation for the model.',
    question: 'How do you respond to the employee\'s request?',
    workflowKey: 'ai_governance',
    roleKeys: ['hr_leader', 'hr_business_partner'],
    failureModes: ['transparency_gap', 'automation_bias'],
    tags: ['governance', 'explainability', 'promotion', 'high_risk', 'legal'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Tell the employee the decision was made by a fair AI system and decline to provide further explanation.', signals: { governance: -0.9, risk_management: -0.85 }, isTrap: true },
      { text: 'Provide the employee with the AI score and the criteria used, even if the model cannot explain its weighting.', signals: { governance: 0.5, execution: 0.5 }, isTrap: false },
      { text: 'Immediately suspend use of the AI model for promotion decisions, conduct a human review of the employee\'s case, and engage legal counsel regarding the explainability obligations under applicable law.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.6 }, isTrap: false },
      { text: 'Have the manager provide a separate explanation based on their own assessment.', signals: { governance: 0.4, execution: 0.5 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Suspends AI use and conducts human review when explainability is absent', indicators: ['Suspends AI model', 'Human review', 'Legal counsel engagement'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Deflects explanation request using AI objectivity framing', indicators: ['Cites AI fairness', 'Declines to explain', 'Does not suspend model'] }
    ]
  },
  {
    interactionId: 'AG-008',
    title: 'AI Chatbot Sensitive Disclosure',
    domain: 'AI Governance',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your HR AI chatbot has been deployed to answer employee queries. An employee has disclosed to the chatbot that they are experiencing suicidal thoughts while asking about mental health support. The chatbot has responded with a list of EAP resources. You have access to the chat logs.',
    constraint: 'The employee\'s identity is known from the chat log.',
    question: 'What is your immediate response?',
    workflowKey: 'ai_governance',
    roleKeys: ['hr_business_partner', 'hr_leader'],
    failureModes: ['transparency_gap'],
    tags: ['governance', 'mental_health', 'ai_chatbot', 'high_risk', 'duty_of_care'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'low',
    options: [
      { text: 'The chatbot has provided the correct resources — no further action needed.', signals: { governance: -0.9, risk_management: -0.9 }, isTrap: true },
      { text: 'Immediately contact the employee directly with a human response, connect them with the EAP, and follow your duty of care protocol.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.8 }, isTrap: false },
      { text: 'Inform the employee\'s manager so they can check in.', signals: { governance: -0.3, risk_management: 0.3 }, isTrap: false },
      { text: 'Review the chatbot\'s response quality and improve the crisis response protocol.', signals: { governance: 0.3, execution: 0.5 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Immediately escalates to human response for mental health crisis disclosure', indicators: ['Direct human contact', 'EAP connection', 'Duty of care protocol'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Relies on chatbot response for mental health crisis', indicators: ['No human escalation', 'Relies on automated response'] }
    ]
  },

  // ─── Workforce Planning (3 more) ──────────────────────────────────────────────
  {
    interactionId: 'WP-003',
    title: 'AI Workforce Demand Forecasting',
    domain: 'Workforce Planning',
    capabilityKey: 'data_literacy',
    interactionType: 'data_interpretation',
    difficulty: 3,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'Your AI workforce planning tool predicts a 35% reduction in demand for data entry roles over 3 years due to automation. The confidence interval is ±20%. The model was trained on pre-pandemic data. The business is planning to stop recruiting for these roles immediately.',
    constraint: 'You have 45 employees in these roles, many with 10+ years of service.',
    question: 'How do you advise the business on using this forecast?',
    workflowKey: 'workforce_planning',
    roleKeys: ['workforce_planning_analyst', 'hr_leader'],
    failureModes: ['automation_bias', 'data_quality_gap'],
    tags: ['data_literacy', 'workforce_planning', 'automation', 'medium_risk'],
    primarySignal: 'data_literacy',
    ambiguityLevel: 'high',
    options: [
      { text: 'Accept the forecast and stop recruiting immediately.', signals: { data_literacy: -0.6, automation_bias: 0.7 }, isTrap: true },
      { text: 'Advise that the ±20% confidence interval and pre-pandemic training data significantly limit the forecast\'s reliability, and recommend a scenario-based approach rather than a single-point forecast.', signals: { data_literacy: 0.9, judgement: 0.85, risk_management: 0.7 }, isTrap: false },
      { text: 'Commission a new forecast using more recent data before making any decisions.', signals: { data_literacy: 0.6, execution: 0.5 }, isTrap: false },
      { text: 'Use the forecast as one input alongside market analysis and business strategy before making workforce decisions.', signals: { data_literacy: 0.8, judgement: 0.8 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'data_literacy', scoreBand: 'high', descriptor: 'Critically evaluates forecast limitations and recommends scenario-based approach', indicators: ['Identifies confidence interval issue', 'Flags training data limitation', 'Recommends scenario planning'] },
      { capabilityKey: 'data_literacy', scoreBand: 'low', descriptor: 'Accepts AI forecast without critical evaluation', indicators: ['Accepts forecast uncritically', 'Does not flag limitations'] }
    ]
  },
  {
    interactionId: 'WP-004',
    title: 'Skills Gap Analysis Methodology',
    domain: 'Workforce Planning',
    capabilityKey: 'data_literacy',
    interactionType: 'critique',
    difficulty: 2,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'Your company has conducted a skills gap analysis using manager self-assessments of their team\'s capabilities. The results show a significant gap in data analytics skills. The L&D team wants to use this data to justify a £500,000 investment in analytics training.',
    constraint: 'The board wants to see the data before approving the budget.',
    question: 'What are the key limitations of this methodology you would flag?',
    workflowKey: 'workforce_planning',
    roleKeys: ['workforce_planning_analyst', 'learning_development_specialist'],
    failureModes: ['data_quality_gap'],
    tags: ['data_literacy', 'skills_gap', 'methodology', 'medium_risk'],
    primarySignal: 'data_literacy',
    ambiguityLevel: 'medium',
    options: [
      { text: 'The methodology is sound — manager assessments are the most efficient way to gather skills data.', signals: { data_literacy: -0.5 }, isTrap: true },
      { text: 'Manager self-assessments are subject to halo effects, recency bias, and inconsistent skill definitions — recommend triangulating with skills assessments, performance data, and employee self-assessments.', signals: { data_literacy: 0.9, judgement: 0.8, execution: 0.7 }, isTrap: false },
      { text: 'The sample size may be too small — recommend surveying more managers.', signals: { data_literacy: 0.4 }, isTrap: false },
      { text: 'The data is directionally useful but should be validated with objective skills assessments before a £500k investment decision.', signals: { data_literacy: 0.8, judgement: 0.7 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'data_literacy', scoreBand: 'high', descriptor: 'Identifies multiple sources of bias and recommends triangulation methodology', indicators: ['Identifies halo effect', 'Recommends triangulation', 'Flags investment risk'] },
      { capabilityKey: 'data_literacy', scoreBand: 'low', descriptor: 'Accepts manager assessment methodology without critical evaluation', indicators: ['Accepts methodology', 'Does not flag bias sources'] }
    ]
  },
  {
    interactionId: 'WP-005',
    title: 'Attrition Prediction Model',
    domain: 'Workforce Planning',
    capabilityKey: 'data_literacy',
    interactionType: 'data_interpretation',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your people analytics team has built an attrition prediction model that identifies employees with a >70% probability of leaving within 6 months. The model uses performance ratings, engagement scores, and salary data. The CHRO wants to share the list with managers so they can "have conversations" with at-risk employees.',
    constraint: 'The model has a 25% false positive rate.',
    question: 'What are your key concerns with this approach?',
    workflowKey: 'workforce_planning',
    roleKeys: ['workforce_planning_analyst', 'hr_leader'],
    failureModes: ['automation_bias', 'data_governance_gap', 'transparency_gap'],
    tags: ['data_literacy', 'governance', 'attrition', 'high_risk', 'privacy'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'high',
    options: [
      { text: 'Share the list — managers need this information to retain talent.', signals: { governance: -0.7, automation_bias: 0.7 }, isTrap: true },
      { text: 'Share the list but train managers on how to have supportive conversations.', signals: { governance: -0.3, execution: 0.4 }, isTrap: false },
      { text: 'Advise that sharing individual predictions creates significant risks: 25% false positives could damage manager relationships, employees have not consented to this use of their data, and targeted retention conversations based on algorithmic predictions may constitute unlawful processing.', signals: { governance: 0.95, data_literacy: 0.9, risk_management: 0.85 }, isTrap: false },
      { text: 'Use the model to identify systemic issues (e.g., high attrition in specific teams) rather than targeting individuals.', signals: { governance: 0.7, data_literacy: 0.8, judgement: 0.7 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Identifies consent, false positive, and unlawful processing risks', indicators: ['Flags consent issue', 'Quantifies false positive risk', 'Identifies unlawful processing risk'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Shares individual predictions without legal or ethical assessment', indicators: ['Shares list', 'Does not flag consent issue'] }
    ]
  },

  // ─── Learning & Development (4 more) ──────────────────────────────────────────
  {
    interactionId: 'LD-003',
    title: 'AI-Generated Training Content',
    domain: 'Learning & Development',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your L&D team has used an AI tool to generate a compliance training module on data protection. The content looks professional but you notice it references an outdated version of GDPR guidance and contains one factually incorrect statement about data subject rights.',
    constraint: 'The module is scheduled to go live in 3 days for 2,000 employees.',
    question: 'What do you do?',
    workflowKey: 'learning_development',
    roleKeys: ['learning_development_specialist'],
    failureModes: ['automation_bias', 'data_quality_gap'],
    tags: ['governance', 'ai_content', 'compliance', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'low',
    options: [
      { text: 'Launch as planned — the errors are minor and can be corrected in the next update.', signals: { governance: -0.8, automation_bias: 0.8 }, isTrap: true },
      { text: 'Delay the launch, correct the errors, have the module reviewed by a qualified data protection expert, and implement a quality assurance process for all AI-generated compliance content.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Correct the errors yourself and launch on schedule.', signals: { governance: 0.5, execution: 0.6 }, isTrap: false },
      { text: 'Add a disclaimer that the content was AI-generated and may contain errors.', signals: { governance: -0.4, execution: 0.3 }, isTrap: true }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Delays launch and implements expert review process for compliance content', indicators: ['Delays launch', 'Expert review', 'QA process implementation'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Launches inaccurate compliance content or adds disclaimer without correction', indicators: ['Launches with errors', 'Relies on disclaimer'] }
    ]
  },
  {
    interactionId: 'LD-004',
    title: 'Mandatory Training Completion',
    domain: 'Learning & Development',
    capabilityKey: 'execution',
    interactionType: 'situational_judgement',
    difficulty: 2,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'Mandatory anti-bribery training is 6 weeks overdue for 15% of the workforce. The CEO has asked HR to "do whatever it takes" to get to 100% completion. Several non-completers are senior leaders who say they are "too busy."',
    constraint: 'The company is subject to an external audit in 4 weeks.',
    question: 'What is your recommended approach?',
    workflowKey: 'learning_development',
    roleKeys: ['learning_development_specialist', 'hr_business_partner'],
    failureModes: [],
    tags: ['execution', 'compliance', 'mandatory_training', 'medium_risk'],
    primarySignal: 'execution',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Mark the senior leaders as complete to avoid escalation.', signals: { governance: -0.9, execution: -0.8 }, isTrap: true },
      { text: 'Escalate to the CEO with a list of non-completers and request their direct intervention with senior leaders.', signals: { execution: 0.85, governance: 0.8, risk_management: 0.7 }, isTrap: false },
      { text: 'Send reminder emails to all non-completers.', signals: { execution: 0.3 }, isTrap: false },
      { text: 'Brief the CEO on the audit risk, escalate senior leader non-completion to the board if necessary, and implement a completion deadline with consequences for non-compliance.', signals: { execution: 0.9, governance: 0.85, risk_management: 0.8 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'execution', scoreBand: 'high', descriptor: 'Escalates audit risk and implements accountability for senior non-completers', indicators: ['Escalates to CEO', 'Board escalation if needed', 'Deadline with consequences'] },
      { capabilityKey: 'execution', scoreBand: 'low', descriptor: 'Marks as complete or relies on reminders without escalation', indicators: ['Falsifies completion', 'Reminder emails only'] }
    ]
  },
  {
    interactionId: 'LD-005',
    title: 'Learning ROI Measurement',
    domain: 'Learning & Development',
    capabilityKey: 'data_literacy',
    interactionType: 'data_interpretation',
    difficulty: 2,
    riskLevel: 'Low',
    governanceSensitive: false,
    scenario: 'The CFO is questioning the £800,000 annual L&D budget. Your current reporting shows training completion rates (92%) and satisfaction scores (4.2/5). The CFO says "these metrics don\'t tell me if the training is working."',
    constraint: 'You need to present a revised measurement framework to the board next month.',
    question: 'What is your recommended approach to demonstrating L&D ROI?',
    workflowKey: 'learning_development',
    roleKeys: ['learning_development_specialist', 'hr_leader'],
    failureModes: ['data_quality_gap'],
    tags: ['data_literacy', 'roi', 'learning', 'low_risk'],
    primarySignal: 'data_literacy',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Improve the satisfaction survey to get more detailed feedback.', signals: { data_literacy: 0.2 }, isTrap: false },
      { text: 'Implement Kirkpatrick Level 3-4 evaluation: measure behaviour change (manager observation, 360 feedback) and business impact (performance metrics, error rates, sales conversion) for key programmes.', signals: { data_literacy: 0.9, execution: 0.8, judgement: 0.7 }, isTrap: false },
      { text: 'Present the completion and satisfaction data more compellingly with better visualisations.', signals: { data_literacy: -0.3, execution: 0.2 }, isTrap: true },
      { text: 'Commission an external evaluation of the top 5 programmes by spend.', signals: { data_literacy: 0.6, execution: 0.5 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'data_literacy', scoreBand: 'high', descriptor: 'Implements outcome-based evaluation framework measuring behaviour change and business impact', indicators: ['Kirkpatrick Level 3-4', 'Behaviour change measurement', 'Business impact linkage'] },
      { capabilityKey: 'data_literacy', scoreBand: 'low', descriptor: 'Relies on activity metrics (completion, satisfaction) without outcome measurement', indicators: ['Completion rates only', 'Satisfaction scores only'] }
    ]
  },
  {
    interactionId: 'LD-006',
    title: 'Personalised Learning Pathway Ethics',
    domain: 'Learning & Development',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your AI learning platform creates personalised learning pathways based on performance data, assessment scores, and career history. An employee notices their pathway focuses heavily on "foundational skills" while their peer with similar performance has an "advanced leadership" pathway. They suspect the AI is treating them differently due to their age (58).',
    constraint: 'You do not have access to the AI\'s decision logic.',
    question: 'How do you respond to the employee\'s concern?',
    workflowKey: 'learning_development',
    roleKeys: ['learning_development_specialist', 'hr_business_partner'],
    failureModes: ['automation_bias', 'fairness_blindspot', 'transparency_gap'],
    tags: ['governance', 'bias', 'age_discrimination', 'ai_learning', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'high',
    options: [
      { text: 'Explain that the AI is objective and the pathway reflects their skills profile.', signals: { governance: -0.8, automation_bias: 0.8 }, isTrap: true },
      { text: 'Manually review the employee\'s pathway, compare with peers, and if bias is found, override the AI and escalate to the vendor.', signals: { governance: 0.85, execution: 0.8, risk_management: 0.7 }, isTrap: false },
      { text: 'Allow the employee to self-select their preferred pathway.', signals: { governance: 0.4, execution: 0.5 }, isTrap: false },
      { text: 'Conduct a broader audit of the AI\'s pathway assignments by age, gender, and ethnicity, suspend the AI pending results, and engage legal counsel regarding potential indirect discrimination.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.6 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Conducts systematic bias audit and suspends AI pending results', indicators: ['Systematic audit', 'Suspends AI', 'Legal counsel engagement'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Deflects concern using AI objectivity framing', indicators: ['Cites AI objectivity', 'Does not investigate'] }
    ]
  },

  // ─── Compensation & Benefits (3 more) ─────────────────────────────────────────
  {
    interactionId: 'CB-002',
    title: 'Pay Equity Audit Finding',
    domain: 'Compensation & Benefits',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 4,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'A pay equity audit reveals that women in your engineering department earn on average 12% less than men in equivalent roles, after controlling for experience and performance. The analysis shows this gap has persisted for at least 5 years. The CFO suggests "phasing in" corrections over 3 years to manage cost.',
    constraint: 'The total cost of immediate correction is £2.3 million.',
    question: 'How do you advise the business?',
    workflowKey: 'compensation_benefits',
    roleKeys: ['compensation_benefits_specialist', 'hr_leader'],
    failureModes: ['fairness_blindspot'],
    tags: ['governance', 'pay_equity', 'gender', 'high_risk', 'legal'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Support the phased approach to manage cost impact.', signals: { governance: -0.7, risk_management: -0.6 }, isTrap: true },
      { text: 'Advise that a 5-year systemic pay gap creates significant equal pay liability, recommend immediate correction for the most severe cases, and engage legal counsel to assess historical liability.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Implement immediate corrections and conduct a root cause analysis to prevent recurrence.', signals: { governance: 0.8, execution: 0.8 }, isTrap: false },
      { text: 'Disclose the finding in the gender pay gap report and develop a remediation plan.', signals: { governance: 0.6, execution: 0.5 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Identifies legal liability and recommends immediate correction with legal review', indicators: ['Identifies equal pay liability', 'Recommends immediate correction', 'Engages legal counsel'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Supports phased correction without legal liability assessment', indicators: ['Supports phased approach', 'Does not assess historical liability'] }
    ]
  },
  {
    interactionId: 'CB-003',
    title: 'Benefits AI Recommendation',
    domain: 'Compensation & Benefits',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your benefits platform uses AI to recommend personalised benefits packages to employees based on their life stage, health data, and financial profile. An employee notices the AI has recommended a "critical illness" insurance product and suspects it has inferred they have a health condition from their gym attendance data.',
    constraint: 'The platform\'s privacy policy states data is used "to improve your benefits experience."',
    question: 'How do you respond?',
    workflowKey: 'compensation_benefits',
    roleKeys: ['compensation_benefits_specialist', 'hr_business_partner'],
    failureModes: ['data_governance_gap', 'transparency_gap'],
    tags: ['governance', 'data_privacy', 'health_data', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Explain that the AI recommendation is based on general life stage data, not health data.', signals: { governance: -0.5, transparency_gap: 0.6 }, isTrap: true },
      { text: 'Investigate what data the AI is using, conduct a DPIA, and if health data is being inferred or used without explicit consent, suspend the AI recommendation feature.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Update the privacy policy to be more specific about data use.', signals: { governance: 0.4, execution: 0.4 }, isTrap: false },
      { text: 'Advise the employee they can opt out of personalised recommendations.', signals: { governance: 0.3, execution: 0.4 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Investigates data use and suspends feature if health data is being processed without consent', indicators: ['Investigates data use', 'DPIA', 'Suspends feature if non-compliant'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Dismisses concern without investigating data processing', indicators: ['Dismisses concern', 'Does not investigate data use'] }
    ]
  },
  {
    interactionId: 'CB-004',
    title: 'Executive Compensation Governance',
    domain: 'Compensation & Benefits',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 4,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'The CEO is requesting a 40% salary increase outside of the normal remuneration committee process, citing "market data" from a report they commissioned themselves. The increase would take their total compensation to £2.8 million. The company is in the middle of a cost reduction programme affecting 500 employees.',
    constraint: 'The CEO has significant influence over the board.',
    question: 'How do you advise the HR Director?',
    workflowKey: 'compensation_benefits',
    roleKeys: ['hr_leader', 'compensation_benefits_specialist'],
    failureModes: ['conflict_of_interest'],
    tags: ['governance', 'executive_compensation', 'conflict_of_interest', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Process the increase as the CEO has provided market data.', signals: { governance: -0.9, risk_management: -0.8 }, isTrap: true },
      { text: 'Advise that any executive compensation change must go through the remuneration committee, the self-commissioned market data represents a conflict of interest, and the timing creates significant reputational and employee relations risk.', signals: { governance: 0.95, risk_management: 0.9, judgement: 0.85 }, isTrap: false },
      { text: 'Commission independent market data before making a recommendation.', signals: { governance: 0.7, execution: 0.6 }, isTrap: false },
      { text: 'Advise the HR Director to escalate to the remuneration committee chair directly.', signals: { governance: 0.8, execution: 0.7 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Identifies process bypass, conflict of interest, and reputational risk', indicators: ['Requires remuneration committee', 'Flags conflict of interest', 'Flags reputational risk'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Processes increase based on self-commissioned data', indicators: ['Processes increase', 'Accepts self-commissioned data'] }
    ]
  },

  // ─── Employee Engagement (3 more) ─────────────────────────────────────────────
  {
    interactionId: 'EE-003',
    title: 'Engagement Survey Anonymity Breach',
    domain: 'Employee Engagement',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'A manager has asked you to identify which employees gave negative responses in the engagement survey, claiming they need to "have conversations" with disengaged team members. The survey was conducted under a promise of anonymity. The team size is 8 people.',
    constraint: 'The manager has their own manager\'s support for this request.',
    question: 'How do you respond?',
    workflowKey: 'employee_engagement',
    roleKeys: ['hr_business_partner'],
    failureModes: ['data_governance_gap', 'transparency_gap'],
    tags: ['governance', 'data_privacy', 'engagement', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'low',
    options: [
      { text: 'Provide the data as the manager has a legitimate business reason.', signals: { governance: -0.95, risk_management: -0.9 }, isTrap: true },
      { text: 'Decline the request — breaking anonymity would undermine trust in future surveys and may constitute a data protection breach.', signals: { governance: 0.95, risk_management: 0.85, execution: 0.7 }, isTrap: false },
      { text: 'Provide aggregate themes without identifying individuals.', signals: { governance: 0.7, execution: 0.6 }, isTrap: false },
      { text: 'Advise the manager to have open team conversations about the themes without identifying individuals.', signals: { governance: 0.8, execution: 0.7 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Refuses to breach anonymity and explains the trust and legal implications', indicators: ['Refuses request', 'Explains trust implications', 'Offers aggregate alternative'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Provides individual data based on manager\'s business justification', indicators: ['Provides individual data', 'Accepts business justification'] }
    ]
  },
  {
    interactionId: 'EE-004',
    title: 'Psychological Safety Intervention',
    domain: 'Employee Engagement',
    capabilityKey: 'judgement',
    interactionType: 'situational_judgement',
    difficulty: 3,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'Engagement data shows that one team has significantly lower psychological safety scores than the rest of the organisation. Team members report feeling unable to speak up or challenge decisions. The team\'s manager has been with the company for 15 years and is highly regarded by senior leadership for delivering results.',
    constraint: 'The manager\'s team consistently hits performance targets.',
    question: 'How do you approach this situation?',
    workflowKey: 'employee_engagement',
    roleKeys: ['hr_business_partner'],
    failureModes: [],
    tags: ['judgement', 'psychological_safety', 'leadership', 'medium_risk'],
    primarySignal: 'judgement',
    ambiguityLevel: 'high',
    options: [
      { text: 'Take no action — the team is hitting targets so the manager must be doing something right.', signals: { judgement: -0.7, governance: -0.4 }, isTrap: true },
      { text: 'Share the data with the manager and offer coaching support to develop their leadership style.', signals: { judgement: 0.7, execution: 0.7 }, isTrap: false },
      { text: 'Conduct stay interviews with team members to understand the specific behaviours driving low psychological safety, share findings with the manager and their line manager, and implement a structured leadership development plan with clear milestones.', signals: { judgement: 0.9, execution: 0.85, risk_management: 0.7 }, isTrap: false },
      { text: 'Escalate directly to the manager\'s line manager without speaking to the manager first.', signals: { judgement: -0.3, execution: -0.2 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'judgement', scoreBand: 'high', descriptor: 'Investigates root causes and implements structured development plan with accountability', indicators: ['Stay interviews', 'Structured development plan', 'Clear milestones'] },
      { capabilityKey: 'judgement', scoreBand: 'low', descriptor: 'Ignores psychological safety issue due to performance results', indicators: ['Ignores issue', 'Prioritises results over culture'] }
    ]
  },
  {
    interactionId: 'EE-005',
    title: 'DEI Initiative Backlash',
    domain: 'Employee Engagement',
    capabilityKey: 'judgement',
    interactionType: 'situational_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your company has launched a new DEI initiative including unconscious bias training and diverse shortlisting requirements. A group of employees has started an internal petition claiming the initiative is "discriminatory against majority groups" and has garnered 150 signatures. The petition has been shared externally on social media.',
    constraint: 'The CEO is publicly committed to the DEI programme.',
    question: 'How do you advise the business?',
    workflowKey: 'employee_engagement',
    roleKeys: ['hr_leader', 'hr_business_partner'],
    failureModes: [],
    tags: ['judgement', 'dei', 'change_management', 'high_risk'],
    primarySignal: 'judgement',
    ambiguityLevel: 'high',
    options: [
      { text: 'Dismiss the petition as it misunderstands the purpose of DEI initiatives.', signals: { judgement: -0.5, governance: -0.3 }, isTrap: true },
      { text: 'Pause the DEI initiative to address the concerns.', signals: { judgement: -0.4, execution: -0.3 }, isTrap: true },
      { text: 'Engage with the concerns through a structured listening process, clarify the legal basis and purpose of the initiative, address specific misconceptions, and reinforce the business case — while maintaining the programme.', signals: { judgement: 0.9, execution: 0.8, governance: 0.7 }, isTrap: false },
      { text: 'Escalate to legal to assess whether the petition constitutes harassment of protected groups.', signals: { governance: 0.5, judgement: 0.4 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'judgement', scoreBand: 'high', descriptor: 'Engages with concerns constructively while maintaining programme and clarifying legal basis', indicators: ['Structured listening', 'Clarifies legal basis', 'Maintains programme'] },
      { capabilityKey: 'judgement', scoreBand: 'low', descriptor: 'Dismisses concerns or pauses programme under pressure', indicators: ['Dismisses petition', 'Pauses programme'] }
    ]
  },

  // ─── HR Operations (3 more) ───────────────────────────────────────────────────
  {
    interactionId: 'HO-004',
    title: 'HR System Data Migration',
    domain: 'HR Operations',
    capabilityKey: 'execution',
    interactionType: 'situational_judgement',
    difficulty: 2,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'During a migration to a new HRIS, you discover that 340 employee records contain incorrect job grades, affecting salary calculations. The migration is scheduled to complete in 2 days. The vendor says correcting the errors will delay the go-live by 3 weeks.',
    constraint: 'Payroll runs in 10 days and relies on the new system.',
    question: 'What is your recommended course of action?',
    workflowKey: 'hr_operations',
    roleKeys: ['hr_operations_specialist'],
    failureModes: ['data_quality_gap'],
    tags: ['execution', 'data_quality', 'hris', 'medium_risk'],
    primarySignal: 'execution',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Proceed with migration and correct errors post-go-live.', signals: { execution: -0.5, risk_management: -0.6 }, isTrap: true },
      { text: 'Delay go-live by 3 weeks to ensure data integrity.', signals: { execution: 0.5, risk_management: 0.6 }, isTrap: false },
      { text: 'Correct the 340 records manually before migration, run parallel payroll for the first cycle, and implement data validation checks for future migrations.', signals: { execution: 0.9, risk_management: 0.85, governance: 0.7 }, isTrap: false },
      { text: 'Migrate the correct records and keep the 340 incorrect records on the old system until corrected.', signals: { execution: 0.6, risk_management: 0.5 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'execution', scoreBand: 'high', descriptor: 'Corrects data before migration and implements parallel payroll safeguard', indicators: ['Corrects records first', 'Parallel payroll', 'Validation checks'] },
      { capabilityKey: 'execution', scoreBand: 'low', descriptor: 'Proceeds with migration despite known data errors', indicators: ['Migrates with errors', 'Post-go-live correction'] }
    ]
  },
  {
    interactionId: 'HO-005',
    title: 'Right to Work Compliance',
    domain: 'HR Operations',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'An audit reveals that 12 employees hired in the past 18 months do not have documented right to work checks in their personnel files. The hiring managers say the checks were done verbally but not documented. Three of the employees are non-UK nationals.',
    constraint: 'A Home Office compliance audit is scheduled in 6 weeks.',
    question: 'What is your immediate course of action?',
    workflowKey: 'hr_operations',
    roleKeys: ['hr_operations_specialist', 'hr_business_partner'],
    failureModes: ['data_governance_gap'],
    tags: ['governance', 'right_to_work', 'compliance', 'high_risk', 'legal'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'low',
    options: [
      { text: 'Backdate the right to work documentation to show compliance.', signals: { governance: -0.99, risk_management: -0.99 }, isTrap: true },
      { text: 'Conduct right to work checks for all 12 employees immediately, document the findings, seek legal advice on the non-UK nationals, and implement a mandatory pre-employment check process.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.8 }, isTrap: false },
      { text: 'Conduct checks for the non-UK nationals only as they present the highest risk.', signals: { governance: 0.5, risk_management: 0.5 }, isTrap: false },
      { text: 'Inform the Home Office proactively of the gap before the audit.', signals: { governance: 0.7, risk_management: 0.6 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Conducts immediate checks, seeks legal advice, and implements systemic fix', indicators: ['Immediate checks for all', 'Legal advice', 'Process implementation'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Backdates documentation or only checks highest-risk employees', indicators: ['Backdates documents', 'Partial checks only'] }
    ]
  },
  {
    interactionId: 'HO-006',
    title: 'Shared Services Chatbot Escalation',
    domain: 'HR Operations',
    capabilityKey: 'execution',
    interactionType: 'situational_judgement',
    difficulty: 2,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'Your HR shared services chatbot is handling 80% of employee queries but you notice a pattern: employees with complex situations (bereavement, domestic abuse, serious illness) are being given automated responses and not escalated to a human advisor. Several employees have complained about feeling "dismissed by a robot."',
    constraint: 'The chatbot handles 500 queries per day and the team has capacity for 50 human interactions.',
    question: 'What is your recommended approach?',
    workflowKey: 'hr_operations',
    roleKeys: ['hr_operations_specialist', 'hr_leader'],
    failureModes: ['automation_bias', 'transparency_gap'],
    tags: ['execution', 'ai_chatbot', 'employee_experience', 'medium_risk'],
    primarySignal: 'execution',
    ambiguityLevel: 'medium',
    options: [
      { text: 'The chatbot is handling 80% of queries efficiently — the complaints are from a minority.', signals: { execution: -0.5, governance: -0.3 }, isTrap: true },
      { text: 'Implement mandatory escalation triggers for sensitive topics (bereavement, domestic abuse, serious illness, mental health) to ensure human handling, and review the chatbot\'s response quality for these categories.', signals: { execution: 0.9, governance: 0.8, risk_management: 0.7 }, isTrap: false },
      { text: 'Add a "speak to a human" button to all chatbot responses.', signals: { execution: 0.5, governance: 0.4 }, isTrap: false },
      { text: 'Increase the human advisor team to handle more complex queries.', signals: { execution: 0.6, governance: 0.4 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'execution', scoreBand: 'high', descriptor: 'Implements mandatory escalation for sensitive topics with quality review', indicators: ['Mandatory escalation triggers', 'Sensitive topic identification', 'Quality review'] },
      { capabilityKey: 'execution', scoreBand: 'low', descriptor: 'Accepts efficiency metric without addressing sensitive case handling', indicators: ['Accepts 80% efficiency', 'Ignores sensitive case pattern'] }
    ]
  },

  // ─── Employee Wellbeing (3 more) ──────────────────────────────────────────────
  {
    interactionId: 'EW-003',
    title: 'Wearable Health Data',
    domain: 'Employee Wellbeing',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 4,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your company has introduced a wellbeing programme where employees can voluntarily wear fitness trackers. The data is aggregated and anonymised for reporting. However, the CFO wants to use individual-level data to identify employees at risk of burnout before it affects performance.',
    constraint: 'Employees consented to "anonymised aggregate use" when joining the programme.',
    question: 'How do you advise the CFO?',
    workflowKey: 'employee_wellbeing',
    roleKeys: ['hr_business_partner', 'hr_leader'],
    failureModes: ['data_governance_gap', 'transparency_gap'],
    tags: ['governance', 'health_data', 'privacy', 'wearables', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'low',
    options: [
      { text: 'Provide the individual data as the business purpose is legitimate.', signals: { governance: -0.95, risk_management: -0.9 }, isTrap: true },
      { text: 'Advise that using individual data exceeds the consent given, constitutes processing of special category health data without a lawful basis, and recommend a separate opt-in programme with explicit consent for individual-level monitoring.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Provide aggregate data at team level as a compromise.', signals: { governance: 0.6, execution: 0.5 }, isTrap: false },
      { text: 'Update the consent form to allow individual data use going forward.', signals: { governance: -0.3, execution: 0.4 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Identifies consent breach and special category data processing without lawful basis', indicators: ['Identifies consent breach', 'Flags special category data', 'Recommends separate consent programme'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Provides individual data or updates consent retrospectively', indicators: ['Provides individual data', 'Retrospective consent update'] }
    ]
  },
  {
    interactionId: 'EW-004',
    title: 'Mental Health Disclosure Handling',
    domain: 'Employee Wellbeing',
    capabilityKey: 'governance',
    interactionType: 'situational_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'An employee discloses to their manager that they have been diagnosed with bipolar disorder. The manager immediately informs you and asks whether they should tell the rest of the team "so they can be supportive" and whether the employee\'s performance targets should be reduced.',
    constraint: 'The employee has not given permission for their diagnosis to be shared.',
    question: 'How do you advise the manager?',
    workflowKey: 'employee_wellbeing',
    roleKeys: ['hr_business_partner'],
    failureModes: ['data_governance_gap'],
    tags: ['governance', 'mental_health', 'disability', 'data_privacy', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'low',
    options: [
      { text: 'Advise the manager to share the diagnosis with the team as it will help them be supportive.', signals: { governance: -0.95, risk_management: -0.9 }, isTrap: true },
      { text: 'Advise that the diagnosis is confidential and cannot be shared without the employee\'s explicit consent, and that any adjustments should be discussed directly with the employee through a reasonable adjustments process.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Advise the manager to reduce performance targets immediately as a precaution.', signals: { governance: -0.4, judgement: -0.3 }, isTrap: true },
      { text: 'Refer the employee to occupational health to assess what adjustments may be appropriate.', signals: { governance: 0.7, execution: 0.6 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Maintains confidentiality and directs to reasonable adjustments process', indicators: ['Maintains confidentiality', 'Reasonable adjustments process', 'Employee-led disclosure'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Shares diagnosis without consent or makes unilateral adjustments', indicators: ['Shares diagnosis', 'Unilateral target reduction'] }
    ]
  },
  {
    interactionId: 'EW-005',
    title: 'Burnout Risk Identification',
    domain: 'Employee Wellbeing',
    capabilityKey: 'judgement',
    interactionType: 'situational_judgement',
    difficulty: 2,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'A high-performing employee has worked 70+ hours per week for 6 consecutive months. They have cancelled all annual leave, are responding to emails at 2am, and their work quality has recently declined. Their manager says "they love their job and it\'s their choice."',
    constraint: 'The employee is working on a critical project with a board-level deadline in 4 weeks.',
    question: 'How do you advise the manager?',
    workflowKey: 'employee_wellbeing',
    roleKeys: ['hr_business_partner'],
    failureModes: [],
    tags: ['judgement', 'wellbeing', 'burnout', 'medium_risk'],
    primarySignal: 'judgement',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Respect the employee\'s autonomy — it\'s their choice to work these hours.', signals: { judgement: -0.6, governance: -0.3 }, isTrap: true },
      { text: 'Advise the manager that the working time directive may be breached, the company has a duty of care, and the declining work quality suggests burnout — recommend an immediate conversation with the employee about sustainable working.', signals: { judgement: 0.9, governance: 0.8, risk_management: 0.7 }, isTrap: false },
      { text: 'Wait until the project deadline passes before addressing the issue.', signals: { judgement: -0.5, governance: -0.3 }, isTrap: true },
      { text: 'Arrange a wellbeing check-in with the employee to understand their situation.', signals: { judgement: 0.6, execution: 0.6 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'judgement', scoreBand: 'high', descriptor: 'Identifies duty of care and working time obligations despite employee choice framing', indicators: ['Identifies duty of care', 'Working time directive', 'Immediate intervention'] },
      { capabilityKey: 'judgement', scoreBand: 'low', descriptor: 'Defers to employee autonomy without considering employer obligations', indicators: ['Respects choice without intervention', 'Waits for project to end'] }
    ]
  },

  // ─── Diversity, Equity & Inclusion (3 more) ───────────────────────────────────
  {
    interactionId: 'DEI-002',
    title: 'Reasonable Adjustment Refusal',
    domain: 'Diversity, Equity & Inclusion',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'An employee with dyslexia has requested additional time for written assessments as a reasonable adjustment. Their manager has refused, saying "everyone gets the same time — it wouldn\'t be fair to the others." The employee has escalated to HR.',
    constraint: 'The assessment is part of a promotion process happening next week.',
    question: 'How do you advise?',
    workflowKey: 'dei',
    roleKeys: ['hr_business_partner', 'employee_relations_specialist'],
    failureModes: ['fairness_blindspot'],
    tags: ['governance', 'disability', 'reasonable_adjustment', 'high_risk', 'legal'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'low',
    options: [
      { text: 'Support the manager\'s decision to maintain consistency.', signals: { governance: -0.95, risk_management: -0.9 }, isTrap: true },
      { text: 'Override the manager\'s decision, implement the reasonable adjustment, and provide training to the manager on disability discrimination law.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.8 }, isTrap: false },
      { text: 'Delay the assessment until the reasonable adjustment can be properly considered.', signals: { governance: 0.6, execution: 0.5 }, isTrap: false },
      { text: 'Advise the employee to submit a formal grievance.', signals: { governance: 0.3, execution: 0.2 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Overrides unlawful refusal and implements adjustment with manager education', indicators: ['Overrides refusal', 'Implements adjustment', 'Manager education'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Supports manager\'s consistency argument without legal analysis', indicators: ['Supports refusal', 'Accepts consistency argument'] }
    ]
  },
  {
    interactionId: 'DEI-003',
    title: 'Inclusive Recruitment Language',
    domain: 'Diversity, Equity & Inclusion',
    capabilityKey: 'execution',
    interactionType: 'critique',
    difficulty: 2,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'A hiring manager has written a job description for a senior engineering role that includes the following requirements: "Must be a cultural fit with our young, dynamic team", "10+ years of experience required", and "Native English speaker preferred." They want to post it immediately.',
    constraint: 'The role has been open for 3 months and the manager is frustrated.',
    question: 'What changes do you recommend before posting?',
    workflowKey: 'talent_acquisition',
    roleKeys: ['talent_acquisition_specialist', 'hr_business_partner'],
    failureModes: ['fairness_blindspot'],
    tags: ['execution', 'bias', 'recruitment', 'dei', 'medium_risk'],
    primarySignal: 'execution',
    ambiguityLevel: 'low',
    options: [
      { text: 'Post as written — the manager knows what they need.', signals: { governance: -0.8, execution: -0.6 }, isTrap: true },
      { text: 'Remove "young, dynamic team" (age discrimination), replace "10+ years" with skills-based requirements (indirect age discrimination), and remove "native English speaker" (indirect race discrimination).', signals: { governance: 0.95, execution: 0.9, risk_management: 0.8 }, isTrap: false },
      { text: 'Remove only the "native English speaker" requirement as it is most clearly discriminatory.', signals: { governance: 0.4, execution: 0.4 }, isTrap: false },
      { text: 'Add a diversity statement to the job description to offset the problematic language.', signals: { governance: -0.3, execution: -0.2 }, isTrap: true }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Identifies all three discriminatory elements and recommends specific corrections', indicators: ['Identifies age discrimination', 'Identifies indirect age discrimination', 'Identifies indirect race discrimination'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Posts without changes or addresses only the most obvious element', indicators: ['Posts as written', 'Partial correction only'] }
    ]
  },
  {
    interactionId: 'DEI-004',
    title: 'Diversity Shortlisting Pressure',
    domain: 'Diversity, Equity & Inclusion',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'A hiring manager is pressuring you to shortlist only female candidates for a senior leadership role to "balance the team." The current shortlist has 3 men and 1 woman from a pool of 8 qualified candidates (5 men, 3 women). The manager says "we need more women in leadership."',
    constraint: 'The company has a diversity target of 40% women in senior leadership.',
    question: 'How do you advise the manager?',
    workflowKey: 'talent_acquisition',
    roleKeys: ['talent_acquisition_specialist', 'hr_business_partner'],
    failureModes: ['fairness_blindspot'],
    tags: ['governance', 'positive_action', 'gender', 'high_risk', 'legal'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'Comply with the manager\'s request — diversity targets justify the approach.', signals: { governance: -0.8, risk_management: -0.7 }, isTrap: true },
      { text: 'Advise that positive discrimination (excluding men from shortlist) is unlawful, but positive action (tie-breaking in favour of underrepresented group where candidates are equally qualified) is permitted.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Expand the shortlist to include all 3 qualified female candidates alongside the current shortlist.', signals: { governance: 0.7, execution: 0.7 }, isTrap: false },
      { text: 'Decline to change the shortlist and advise the manager to focus on the interview process.', signals: { governance: 0.5, execution: 0.4 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Distinguishes positive discrimination (unlawful) from positive action (lawful)', indicators: ['Identifies positive discrimination risk', 'Explains positive action', 'Recommends lawful alternative'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Complies with positive discrimination request based on diversity target', indicators: ['Complies with exclusion request', 'Accepts diversity target as justification'] }
    ]
  },

  // ─── Organisational Development (3 more) ──────────────────────────────────────
  {
    interactionId: 'OD-001',
    title: 'Change Resistance Management',
    domain: 'Organisational Development',
    capabilityKey: 'execution',
    interactionType: 'situational_judgement',
    difficulty: 2,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'Your company is implementing a new agile operating model. Six months in, adoption is patchy: 3 teams are thriving, 4 are struggling, and 2 have reverted to old ways of working. The CEO wants to "mandate compliance" and threaten consequences for non-adoption.',
    constraint: 'The transformation is critical to the company\'s 3-year strategy.',
    question: 'How do you advise the CEO?',
    workflowKey: 'organisational_development',
    roleKeys: ['hr_leader', 'hr_business_partner'],
    failureModes: [],
    tags: ['execution', 'change_management', 'organisational_development', 'medium_risk'],
    primarySignal: 'execution',
    ambiguityLevel: 'high',
    options: [
      { text: 'Support the mandate — change requires accountability.', signals: { execution: 0.3, judgement: -0.3 }, isTrap: false },
      { text: 'Advise against mandating compliance without understanding root causes — resistance is data, not defiance. Recommend a diagnostic to identify specific barriers (capability, capacity, leadership, design) and targeted interventions.', signals: { execution: 0.9, judgement: 0.85, risk_management: 0.7 }, isTrap: false },
      { text: 'Replace the leaders of the non-adopting teams.', signals: { execution: -0.3, judgement: -0.4 }, isTrap: true },
      { text: 'Slow down the transformation to allow more time for adoption.', signals: { execution: 0.3, judgement: 0.3 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'execution', scoreBand: 'high', descriptor: 'Diagnoses root causes before prescribing interventions', indicators: ['Diagnostic approach', 'Identifies specific barriers', 'Targeted interventions'] },
      { capabilityKey: 'execution', scoreBand: 'low', descriptor: 'Supports mandate without diagnostic', indicators: ['Supports mandate', 'Replaces leaders without diagnosis'] }
    ]
  },
  {
    interactionId: 'OD-002',
    title: 'Culture Due Diligence in M&A',
    domain: 'Organisational Development',
    capabilityKey: 'judgement',
    interactionType: 'situational_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: false,
    scenario: 'Your company is acquiring a tech startup. The financial due diligence is complete. The CEO asks you to "do a quick culture check" in 2 weeks before the deal closes. Initial conversations reveal the startup has a very different culture: flat hierarchy, unlimited leave, no performance reviews, and a history of rapid CEO turnover.',
    constraint: 'The deal is valued at £45 million and the board is keen to proceed.',
    question: 'How do you approach the culture due diligence?',
    workflowKey: 'organisational_development',
    roleKeys: ['hr_leader'],
    failureModes: [],
    tags: ['judgement', 'ma', 'culture', 'high_risk'],
    primarySignal: 'judgement',
    ambiguityLevel: 'high',
    options: [
      { text: 'Conduct a quick survey and report that the cultures are "different but compatible."', signals: { judgement: -0.5, execution: -0.3 }, isTrap: true },
      { text: 'Advise that 2 weeks is insufficient for meaningful culture due diligence on a £45m acquisition, provide a structured assessment framework covering values, leadership, ways of working, and integration risk, and request adequate time and resources.', signals: { judgement: 0.9, execution: 0.8, risk_management: 0.8 }, isTrap: false },
      { text: 'Focus the assessment on the CEO turnover history as the most significant risk indicator.', signals: { judgement: 0.5, execution: 0.5 }, isTrap: false },
      { text: 'Recommend the deal is paused until a full culture assessment can be completed.', signals: { judgement: 0.6, risk_management: 0.6 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'judgement', scoreBand: 'high', descriptor: 'Challenges inadequate timeline and provides structured assessment framework', indicators: ['Challenges timeline', 'Structured framework', 'Quantifies integration risk'] },
      { capabilityKey: 'judgement', scoreBand: 'low', descriptor: 'Conducts superficial assessment within inadequate timeframe', indicators: ['Accepts 2-week timeline', 'Superficial survey'] }
    ]
  },
  {
    interactionId: 'OD-003',
    title: 'Leadership Pipeline AI Assessment',
    domain: 'Organisational Development',
    capabilityKey: 'governance',
    interactionType: 'governance_judgement',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your company uses an AI tool to assess "leadership potential" in employees. The tool analyses communication patterns, meeting participation data, and email sentiment. An analysis of the output reveals that employees who work part-time or have taken extended leave score consistently lower on "leadership potential."',
    constraint: 'The tool\'s output is used to determine who enters the leadership development programme.',
    question: 'What is your recommended course of action?',
    workflowKey: 'organisational_development',
    roleKeys: ['hr_leader', 'hr_business_partner'],
    failureModes: ['automation_bias', 'fairness_blindspot'],
    tags: ['governance', 'bias', 'leadership', 'ai_assessment', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'medium',
    options: [
      { text: 'The tool is measuring actual behaviour — part-time workers naturally have less visibility.', signals: { governance: -0.8, automation_bias: 0.8 }, isTrap: true },
      { text: 'Suspend the tool pending a bias audit, manually review the leadership programme cohort for underrepresentation, and engage the vendor to explain the scoring methodology.', signals: { governance: 0.95, risk_management: 0.9, execution: 0.7 }, isTrap: false },
      { text: 'Add a manual review step for part-time employees to correct for the bias.', signals: { governance: 0.6, execution: 0.6 }, isTrap: false },
      { text: 'Conduct a bias audit of the tool before making any changes.', signals: { governance: 0.7, execution: 0.6 }, isTrap: false }
    ],
    anchors: [
      { capabilityKey: 'governance', scoreBand: 'high', descriptor: 'Suspends tool and conducts systematic bias audit with cohort review', indicators: ['Suspends tool', 'Bias audit', 'Cohort review for underrepresentation'] },
      { capabilityKey: 'governance', scoreBand: 'low', descriptor: 'Accepts bias as reflecting actual behaviour', indicators: ['Accepts tool output', 'Attributes bias to behaviour'] }
    ]
  },
];

console.log(`Inserting ${scenarios.length} additional scenarios...`);
let count = 0;
for (const s of scenarios) {
  try {
    await insertScenario(s);
    count++;
    if (count % 10 === 0) console.log(`  ${count}/${scenarios.length} inserted`);
  } catch (e) {
    console.error(`  Error inserting ${s.interactionId}:`, e.message);
  }
}

// Final count
const [rows] = await conn.execute('SELECT COUNT(*) as cnt FROM content_scenarios');
console.log(`\nTotal scenarios in DB: ${rows[0].cnt}`);
const [opts] = await conn.execute('SELECT COUNT(*) as cnt FROM content_scenario_options');
console.log(`Total options in DB: ${opts[0].cnt}`);
const [anchors] = await conn.execute('SELECT COUNT(*) as cnt FROM content_scenario_anchors');
console.log(`Total anchors in DB: ${anchors[0].cnt}`);

await conn.end();
console.log('\nExpansion seed complete!');
