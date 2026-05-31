/**
 * Fix 16 Content Balance — seed 6 ai_change_leadership + 6 workforce_ai_readiness scenarios
 * Brings both domains from 8 to 14, well within the 10%–30% target band.
 */
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

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
      'published', 1,
    ]
  );
  for (let i = 0; i < s.options.length; i++) {
    const opt = s.options[i];
    await conn.execute(
      `INSERT IGNORE INTO content_scenario_options
       (id, scenario_id, option_order, label, value, outcome_class, signal_deltas_json, rationale_text, is_optimal)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        randomUUID(), id, i + 1,
        String.fromCharCode(65 + i),
        opt.text,
        opt.outcomeClass || 'neutral',
        JSON.stringify(opt.signals || {}),
        opt.rationale || null,
        opt.isOptimal ? 1 : 0,
      ]
    );
  }
  for (const anchor of (s.anchors || [])) {
    await conn.execute(
      `INSERT IGNORE INTO content_scenario_anchors
       (id, scenario_id, anchor_key, anchor_label, description, score_range)
       VALUES (?,?,?,?,?,?)`,
      [
        randomUUID(), id,
        anchor.capabilityKey + '_' + anchor.scoreBand,
        anchor.descriptor.substring(0, 120),
        anchor.descriptor,
        anchor.scoreBand,
      ]
    );
  }
  return id;
}

// ─── AI Change Leadership (6 scenarios) ──────────────────────────────────────

const changeLeadershipScenarios = [
  {
    interactionId: 'ACL-009',
    title: 'Managing Resistance to AI Adoption in a Tenured HR Team',
    domain: 'AI Change Leadership',
    capabilityKey: 'ai_change_leadership',
    interactionType: 'stakeholder_judgement',
    difficulty: 3,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'You have just introduced an AI-assisted performance calibration tool to your HR Business Partner team. Three of your five HRBPs — all with 10+ years of experience — are openly resistant. They argue the tool "removes human judgement" and worry that managers will defer to the AI score rather than having proper calibration conversations. Usage data confirms their concern: in the first two weeks, 60% of managers accepted the AI recommendation without discussion.',
    constraint: 'The tool is already live and the CHRO has publicly committed to it. You cannot roll it back. Your next calibration cycle starts in six weeks.',
    question: 'How do you address the resistance and the misuse pattern simultaneously?',
    workflowKey: 'performance_management',
    roleKeys: ['hr_business_partner', 'head_of_hr'],
    failureModes: ['automation_bias', 'change_resistance'],
    tags: ['change_management', 'ai_adoption', 'performance', 'stakeholder_management'],
    primarySignal: 'change_pace',
    ambiguityLevel: 'high',
    options: [
      {
        text: 'Acknowledge the HRBPs\' concern as legitimate evidence of a real problem, not just resistance. Co-design a "minimum conversation standard" with them — the AI score is a starting point, not a verdict. Retrain managers on the tool\'s intended use before the next cycle. Give the resistant HRBPs a formal role in monitoring conversation quality.',
        outcomeClass: 'strong_positive',
        signals: { change_leadership: 0.9, stakeholder_engagement: 0.85, execution: 0.7 },
        rationale: 'Converts resistance into ownership. Addresses the misuse pattern directly. Preserves the tool while restoring human judgement to its proper role.',
        isOptimal: true,
      },
      {
        text: 'Hold a team meeting to explain the business case for the tool again. Remind the HRBPs that the CHRO has committed to it and that resistance is not an option at this stage.',
        outcomeClass: 'negative',
        signals: { change_leadership: -0.5, stakeholder_engagement: -0.6, execution: 0.2 },
        rationale: 'Treats legitimate concern as insubordination. Increases disengagement and drives resistance underground without resolving the misuse problem.',
        isOptimal: false,
      },
      {
        text: 'Escalate the misuse data to the CHRO and ask for a formal directive requiring managers to document their reasoning when they deviate from the AI recommendation.',
        outcomeClass: 'partial_positive',
        signals: { change_leadership: 0.3, stakeholder_engagement: 0.2, execution: 0.5 },
        rationale: 'Addresses the symptom (undocumented acceptance) but bypasses the HRBPs and misses the opportunity to build genuine adoption.',
        isOptimal: false,
      },
      {
        text: 'Give the resistant HRBPs a three-month exemption from using the tool while the rest of the team continues. Review their performance data at the end of the period.',
        outcomeClass: 'negative',
        signals: { change_leadership: -0.4, stakeholder_engagement: -0.3, execution: -0.5 },
        rationale: 'Creates a two-tier team, signals that resistance is rewarded, and generates inconsistent calibration data across the organisation.',
        isOptimal: false,
      },
    ],
    anchors: [
      {
        capabilityKey: 'ai_change_leadership',
        scoreBand: 'advanced',
        descriptor: 'Reframes resistance as signal, co-designs guardrails with sceptics, and addresses both adoption and misuse simultaneously.',
        indicators: ['Distinguishes between emotional resistance and substantive concern', 'Involves critics in solution design', 'Monitors behavioural change, not just tool usage'],
      },
      {
        capabilityKey: 'ai_change_leadership',
        scoreBand: 'developing',
        descriptor: 'Focuses on compliance and communication rather than addressing the underlying concern.',
        indicators: ['Relies on authority or repetition of the business case', 'Does not address the misuse pattern', 'Treats resistance as a people problem rather than a design problem'],
      },
    ],
  },

  {
    interactionId: 'ACL-010',
    title: 'Communicating AI-Driven Redundancies Without Triggering Wider Anxiety',
    domain: 'AI Change Leadership',
    capabilityKey: 'ai_change_leadership',
    interactionType: 'communication_design',
    difficulty: 4,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your organisation is automating a back-office payroll processing function. Twelve roles will be made redundant. The affected employees have been told individually and are in a 30-day consultation period. However, a rumour has spread across the wider HR and Finance teams (200 people) that "AI is replacing everyone in operations." Engagement survey pulse scores have dropped 18 points in two weeks. Three high performers in unaffected roles have handed in their notice.',
    constraint: 'You cannot share the full restructuring plan publicly as it is still subject to board approval. Legal has advised against any communication that could be seen as pre-empting the consultation outcome.',
    question: 'What is your communication strategy for the next 30 days?',
    workflowKey: 'workforce_planning',
    roleKeys: ['head_of_hr', 'hr_director', 'hr_business_partner'],
    failureModes: ['change_resistance', 'communication_failure'],
    tags: ['change_management', 'redundancy', 'communication', 'ai_adoption', 'high_risk'],
    primarySignal: 'change_pace',
    ambiguityLevel: 'high',
    options: [
      {
        text: 'Issue a holding statement immediately: acknowledge the change, confirm the scope is limited to the 12 roles in consultation, commit to transparency about the broader automation roadmap once board approval is received, and schedule team-level conversations with managers in the next 48 hours. Brief managers on what they can and cannot say.',
        outcomeClass: 'strong_positive',
        signals: { change_leadership: 0.9, communication: 0.85, risk_management: 0.8 },
        rationale: 'Stops the rumour with facts, stays within legal constraints, and gives managers the tools to have honest conversations. Addresses the anxiety without pre-empting the consultation.',
        isOptimal: true,
      },
      {
        text: 'Say nothing publicly until the board has approved the plan. Issue a formal all-staff communication at that point with full details.',
        outcomeClass: 'negative',
        signals: { change_leadership: -0.7, communication: -0.8, risk_management: -0.3 },
        rationale: 'Silence amplifies rumour. The three resignations and 18-point engagement drop show that inaction has a measurable cost. Waiting 30 days will accelerate talent loss.',
        isOptimal: false,
      },
      {
        text: 'Ask the CHRO to record a short video message reassuring the wider team that their roles are safe and that the organisation is committed to responsible AI adoption.',
        outcomeClass: 'partial_positive',
        signals: { change_leadership: 0.4, communication: 0.5, risk_management: 0.3 },
        rationale: 'Better than silence but a single top-down message is insufficient. Without manager-level follow-up and a clear channel for questions, anxiety will persist.',
        isOptimal: false,
      },
      {
        text: 'Identify the three employees who resigned and offer retention bonuses to prevent further departures while the consultation period completes.',
        outcomeClass: 'negative',
        signals: { change_leadership: -0.4, communication: -0.5, risk_management: 0.2 },
        rationale: 'Treats the symptom, not the cause. Retention bonuses without addressing the underlying anxiety will not prevent further departures and may signal that the organisation is panicking.',
        isOptimal: false,
      },
    ],
    anchors: [
      {
        capabilityKey: 'ai_change_leadership',
        scoreBand: 'advanced',
        descriptor: 'Designs a layered communication strategy that contains rumour, respects legal constraints, and equips managers to lead locally.',
        indicators: ['Acts within 48 hours', 'Distinguishes between what can and cannot be shared', 'Activates manager network rather than relying solely on top-down messaging'],
      },
    ],
  },

  {
    interactionId: 'ACL-011',
    title: 'Building a Coalition for AI Adoption Across a Sceptical Leadership Team',
    domain: 'AI Change Leadership',
    capabilityKey: 'ai_change_leadership',
    interactionType: 'prioritisation',
    difficulty: 3,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'You are the HR Director at a 3,000-person professional services firm. The CEO has asked HR to lead the organisation\'s AI capability programme. Of the eight members of the Executive Committee, three are enthusiastic, two are cautious-but-open, and three are openly sceptical — including the CFO (who controls the budget) and the General Counsel (who has raised legal concerns). The programme needs ExCo sponsorship to proceed.',
    constraint: 'You have a 20-minute slot at next week\'s ExCo meeting to present the programme. You cannot run a pilot without CFO budget approval.',
    question: 'How do you approach the ExCo meeting and the pre-meeting stakeholder work?',
    workflowKey: 'organisational_development',
    roleKeys: ['hr_director', 'head_of_hr'],
    failureModes: ['change_resistance', 'stakeholder_misalignment'],
    tags: ['change_management', 'stakeholder_management', 'ai_strategy', 'leadership'],
    primarySignal: 'stakeholder_navigation',
    ambiguityLevel: 'medium',
    options: [
      {
        text: 'Before the meeting: have one-to-ones with the CFO and General Counsel to understand their specific concerns and incorporate their conditions into the programme design. In the meeting: present a phased proposal with a small, low-cost pilot that addresses the GC\'s legal concerns upfront. Frame the business case in financial terms for the CFO. Ask the three enthusiastic ExCo members to speak to their own use cases.',
        outcomeClass: 'strong_positive',
        signals: { change_leadership: 0.9, stakeholder_engagement: 0.9, execution: 0.7 },
        rationale: 'Converts the two most influential sceptics before the room vote. Uses peer voices to reduce the perception of an HR-driven agenda. Lowers the financial and legal risk threshold.',
        isOptimal: true,
      },
      {
        text: 'Present a comprehensive 12-month programme with full budget requirements. Provide detailed ROI projections and case studies from comparable firms. Ask for a decision in the meeting.',
        outcomeClass: 'negative',
        signals: { change_leadership: -0.3, stakeholder_engagement: -0.4, execution: 0.3 },
        rationale: 'Asking for a large commitment from a divided ExCo in a single meeting is likely to result in deferral or a split vote. Does not address the CFO\'s or GC\'s specific concerns.',
        isOptimal: false,
      },
      {
        text: 'Focus the 20 minutes entirely on the legal and financial risks of NOT investing in AI capability. Use competitor data to create urgency.',
        outcomeClass: 'partial_positive',
        signals: { change_leadership: 0.4, stakeholder_engagement: 0.3, execution: 0.2 },
        rationale: 'Fear-based framing can create short-term urgency but often generates defensive responses from sceptics. Does not build the coalition needed for sustained programme delivery.',
        isOptimal: false,
      },
      {
        text: 'Ask the CEO to mandate the programme without requiring ExCo consensus, given the strategic importance of AI capability.',
        outcomeClass: 'negative',
        signals: { change_leadership: -0.6, stakeholder_engagement: -0.7, execution: -0.3 },
        rationale: 'A mandated programme without ExCo buy-in will face passive resistance at every stage. The CFO can slow-walk budget releases; the GC can create legal blockers. Coalition is essential.',
        isOptimal: false,
      },
    ],
    anchors: [
      {
        capabilityKey: 'ai_change_leadership',
        scoreBand: 'advanced',
        descriptor: 'Invests in pre-meeting stakeholder work, designs the proposal around the sceptics\' conditions, and uses peer advocacy to reduce the HR-agenda perception.',
        indicators: ['Identifies the CFO and GC as the critical swing votes', 'Incorporates their conditions into the programme design before the meeting', 'Asks for a small, reversible commitment rather than full programme approval'],
      },
    ],
  },

  {
    interactionId: 'ACL-012',
    title: 'Sustaining AI Adoption Momentum After an Early High-Profile Failure',
    domain: 'AI Change Leadership',
    capabilityKey: 'ai_change_leadership',
    interactionType: 'risk_judgement',
    difficulty: 4,
    riskLevel: 'High',
    governanceSensitive: false,
    scenario: 'Six months into your organisation\'s AI capability programme, a high-profile AI tool deployed in the recruitment function produced a batch of interview shortlists that contained a statistically significant gender bias. The error was caught before any hiring decisions were made, but it was reported internally and has become widely known. The CHRO has asked you to decide whether to pause all AI tools across HR pending a full audit, or to continue the programme with enhanced controls.',
    constraint: 'Pausing all tools will delay three live projects by at least four months and cost approximately £180,000 in sunk investment. The programme has strong board-level support but that support is now fragile.',
    question: 'What is your recommended course of action?',
    workflowKey: 'ai_governance',
    roleKeys: ['hr_director', 'head_of_hr', 'talent_acquisition_specialist'],
    failureModes: ['automation_bias', 'governance_failure', 'fairness_blindspot'],
    tags: ['change_management', 'ai_governance', 'bias', 'risk_management', 'high_risk'],
    primarySignal: 'governance_sensitivity',
    ambiguityLevel: 'high',
    options: [
      {
        text: 'Pause the recruitment tool specifically (not all tools). Commission a targeted audit of the recruitment tool\'s training data and decision logic. Continue other tools with an enhanced monitoring protocol. Communicate transparently with the board: the programme caught the error before harm occurred, which is evidence the governance framework is working. Publish the audit findings and remediation plan.',
        outcomeClass: 'strong_positive',
        signals: { change_leadership: 0.85, governance_sensitivity: 0.9, risk_management: 0.85 },
        rationale: 'Proportionate response. Pausing only the affected tool limits cost and delay. Transparent communication with the board reframes the incident as a governance success. Maintains programme credibility.',
        isOptimal: true,
      },
      {
        text: 'Pause all AI tools across HR immediately pending a full audit of every tool in the programme.',
        outcomeClass: 'partial_positive',
        signals: { change_leadership: 0.2, governance_sensitivity: 0.6, risk_management: 0.5 },
        rationale: 'Demonstrates caution but is disproportionate. The £180,000 cost and four-month delay will damage board confidence and may permanently stall the programme. A blanket pause does not demonstrate that you understand which tools carry which risks.',
        isOptimal: false,
      },
      {
        text: 'Continue all tools as planned. Issue a statement that the error was caught by your governance process, demonstrating that the controls are working.',
        outcomeClass: 'negative',
        signals: { change_leadership: -0.3, governance_sensitivity: -0.5, risk_management: -0.6 },
        rationale: 'Continuing the recruitment tool without investigation is indefensible. If a second bias incident occurs, the programme will be terminated and the HR Director\'s credibility will be severely damaged.',
        isOptimal: false,
      },
      {
        text: 'Pause all AI tools and commission an external audit. Use the pause period to rebuild stakeholder confidence through a series of roadshows explaining the programme\'s governance framework.',
        outcomeClass: 'partial_positive',
        signals: { change_leadership: 0.3, governance_sensitivity: 0.5, risk_management: 0.4 },
        rationale: 'The external audit adds credibility but the blanket pause is still disproportionate. Roadshows are valuable but should accompany a proportionate response, not a maximally cautious one.',
        isOptimal: false,
      },
    ],
    anchors: [
      {
        capabilityKey: 'ai_change_leadership',
        scoreBand: 'advanced',
        descriptor: 'Applies proportionate risk response, communicates transparently, and reframes the incident as evidence of governance effectiveness.',
        indicators: ['Distinguishes between the affected tool and the wider programme', 'Frames the catch as a governance success, not a failure', 'Maintains programme momentum while addressing the specific risk'],
      },
    ],
  },

  {
    interactionId: 'ACL-013',
    title: 'Designing an AI Literacy Programme for a Diverse HR Function',
    domain: 'AI Change Leadership',
    capabilityKey: 'ai_change_leadership',
    interactionType: 'intervention_design',
    difficulty: 2,
    riskLevel: 'Low',
    governanceSensitive: false,
    scenario: 'You are designing an AI literacy programme for your 45-person HR function. The team spans a wide range of starting points: 8 people are already using AI tools daily and are frustrated by what they see as basic training; 20 people have limited exposure and moderate anxiety; 12 people have no current AI usage and significant anxiety; and 5 people are actively hostile to AI adoption, citing ethical concerns. You have a budget of £15,000 and six months.',
    constraint: 'Attendance at all programme elements must be voluntary. You cannot mandate participation.',
    question: 'How do you design the programme?',
    workflowKey: 'learning_development',
    roleKeys: ['head_of_hr', 'learning_development_specialist', 'hr_business_partner'],
    failureModes: ['change_resistance', 'one_size_fits_all'],
    tags: ['change_management', 'ai_literacy', 'learning_design', 'inclusion'],
    primarySignal: 'change_pace',
    ambiguityLevel: 'medium',
    options: [
      {
        text: 'Design three distinct tracks: (1) Advanced: peer-led AI application workshops where the 8 advanced users share real use cases and build new tools together — converts them from frustrated bystanders into programme advocates. (2) Foundation: structured 6-session cohort programme for the 20 moderate-exposure people, combining hands-on practice with psychological safety. (3) Exploration: low-stakes, opt-in "AI curiosity sessions" for the anxious and hostile groups — no tools, just conversations about what AI is and is not. Assign the 5 ethical sceptics a formal role as the programme\'s "ethics advisory panel."',
        outcomeClass: 'strong_positive',
        signals: { change_leadership: 0.9, learning_design: 0.85, inclusion: 0.9 },
        rationale: 'Differentiated design meets each group where they are. Converting advanced users into advocates and ethical sceptics into advisors are both high-leverage moves that generate internal credibility.',
        isOptimal: true,
      },
      {
        text: 'Run a single 2-day AI literacy workshop for the whole team, with breakout sessions for different levels. Use an external facilitator to ensure consistency.',
        outcomeClass: 'partial_positive',
        signals: { change_leadership: 0.3, learning_design: 0.2, inclusion: 0.1 },
        rationale: 'A single event is unlikely to shift behaviour for the anxious or hostile groups. The advanced users will disengage. A 2-day event also consumes most of the budget without building sustained capability.',
        isOptimal: false,
      },
      {
        text: 'Focus the budget on the 20 moderate-exposure people as they represent the highest ROI. Provide self-directed resources for the other groups.',
        outcomeClass: 'partial_positive',
        signals: { change_leadership: 0.4, learning_design: 0.4, inclusion: -0.2 },
        rationale: 'Prioritising the middle group is a reasonable resource decision but abandoning the anxious and hostile groups risks creating a divided team and losing the advanced users\' energy.',
        isOptimal: false,
      },
      {
        text: 'Make the programme entirely self-directed: curate a library of AI learning resources and let individuals choose what to engage with.',
        outcomeClass: 'negative',
        signals: { change_leadership: -0.4, learning_design: -0.3, inclusion: -0.4 },
        rationale: 'Self-directed learning without structure or social support is least effective for the anxious and hostile groups who most need intervention. Voluntary self-direction will widen the capability gap.',
        isOptimal: false,
      },
    ],
    anchors: [
      {
        capabilityKey: 'ai_change_leadership',
        scoreBand: 'advanced',
        descriptor: 'Designs differentiated tracks for each segment, converts sceptics into advocates, and builds sustained capability rather than a one-off event.',
        indicators: ['Segments the audience by starting point, not just seniority', 'Assigns active roles to advanced users and ethical sceptics', 'Designs for behaviour change, not just knowledge transfer'],
      },
    ],
  },

  {
    interactionId: 'ACL-014',
    title: 'Measuring the Impact of an AI Adoption Programme',
    domain: 'AI Change Leadership',
    capabilityKey: 'ai_change_leadership',
    interactionType: 'data_interpretation',
    difficulty: 3,
    riskLevel: 'Low',
    governanceSensitive: false,
    scenario: 'Your organisation has been running an AI adoption programme for 12 months. You are preparing a board update. The data shows: AI tool usage has increased from 12% to 68% of the target population. Time saved per user per week averages 2.3 hours (self-reported). Employee confidence in using AI tools has risen from 3.1 to 4.2 out of 5. However, three quality incidents involving AI-generated outputs have occurred (none resulted in external harm). Manager satisfaction with AI-assisted processes has not changed (3.8/5 pre and post).',
    constraint: 'The board will use this data to decide whether to extend the programme to the wider organisation (5,000 people) at a cost of £2.4 million.',
    question: 'How do you present and interpret this data?',
    workflowKey: 'ai_governance',
    roleKeys: ['hr_director', 'head_of_hr'],
    failureModes: ['data_misinterpretation', 'governance_failure'],
    tags: ['change_management', 'measurement', 'ai_governance', 'board_reporting'],
    primarySignal: 'data_literacy',
    ambiguityLevel: 'high',
    options: [
      {
        text: 'Present all five data points transparently. Highlight the strong adoption and confidence gains. Acknowledge the three quality incidents as evidence that your governance process is detecting issues. Explain that the flat manager satisfaction score suggests the programme has increased usage without yet improving outcomes — and propose that the wider rollout include a manager-experience workstream as a condition of approval.',
        outcomeClass: 'strong_positive',
        signals: { change_leadership: 0.9, data_literacy: 0.9, governance_sensitivity: 0.85 },
        rationale: 'Transparent presentation of mixed results builds board credibility. Proactively addressing the flat manager score and the quality incidents demonstrates analytical maturity and reduces the risk of the board discovering them independently.',
        isOptimal: true,
      },
      {
        text: 'Lead with the strong adoption and confidence data. Mention the quality incidents briefly in the appendix. Recommend full rollout approval.',
        outcomeClass: 'negative',
        signals: { change_leadership: -0.4, data_literacy: -0.3, governance_sensitivity: -0.6 },
        rationale: 'Burying the quality incidents in an appendix is a governance risk. If the board later discovers they were downplayed, the HR Director\'s credibility will be damaged and the programme may be terminated.',
        isOptimal: false,
      },
      {
        text: 'Recommend delaying the board decision until you have 6 more months of data to address the flat manager satisfaction score and understand the quality incidents better.',
        outcomeClass: 'partial_positive',
        signals: { change_leadership: 0.2, data_literacy: 0.4, governance_sensitivity: 0.5 },
        rationale: 'Caution is understandable but unnecessary. The data is sufficient to make a conditional recommendation. Delaying loses momentum and may signal a lack of confidence in the programme.',
        isOptimal: false,
      },
      {
        text: 'Present only the adoption and confidence data. The quality incidents are being managed through the governance process and do not need to be included in a board update.',
        outcomeClass: 'negative',
        signals: { change_leadership: -0.7, data_literacy: -0.5, governance_sensitivity: -0.8 },
        rationale: 'Omitting material information from a board report is a serious governance failure. The board has a right to know about quality incidents when making a £2.4 million investment decision.',
        isOptimal: false,
      },
    ],
    anchors: [
      {
        capabilityKey: 'ai_change_leadership',
        scoreBand: 'advanced',
        descriptor: 'Presents mixed data transparently, interprets the flat manager score as a programme design signal, and makes a conditional recommendation.',
        indicators: ['Does not cherry-pick positive metrics', 'Reframes quality incidents as governance evidence', 'Proposes a design response to the flat manager score rather than ignoring it'],
      },
    ],
  },
];

// ─── Workforce AI Readiness (6 scenarios) ────────────────────────────────────

const workforceReadinessScenarios = [
  {
    interactionId: 'WAR-009',
    title: 'Assessing AI Readiness Across a Heterogeneous Workforce',
    domain: 'Workforce AI Readiness',
    capabilityKey: 'workforce_ai_readiness',
    interactionType: 'data_interpretation',
    difficulty: 3,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'You have been asked to assess AI readiness across a 6,000-person retail organisation. The workforce spans: 4,200 store associates (average age 34, 60% part-time, low digital tool usage); 800 store managers (moderate digital literacy, high workload); 600 head office staff (high digital literacy, varied AI exposure); and 400 supply chain and logistics staff (high tool dependency, limited AI exposure). The CEO wants a readiness score and a prioritisation recommendation within four weeks.',
    constraint: 'You have no budget for external consultants. You can use internal survey tools and existing HR data.',
    question: 'How do you design the readiness assessment and what will you measure?',
    workflowKey: 'workforce_planning',
    roleKeys: ['head_of_hr', 'hr_director', 'learning_development_specialist'],
    failureModes: ['one_size_fits_all', 'data_misinterpretation'],
    tags: ['workforce_readiness', 'ai_literacy', 'assessment_design', 'workforce_planning'],
    primarySignal: 'data_literacy',
    ambiguityLevel: 'medium',
    options: [
      {
        text: 'Design a segmented assessment: (1) A 10-minute digital survey for head office and supply chain staff covering current AI tool usage, confidence, and learning appetite. (2) A 5-minute mobile-optimised pulse for store associates (accessible via their existing scheduling app) covering confidence and anxiety only. (3) Manager interviews (20 per segment) to understand operational AI use cases and barriers. Measure four dimensions: current usage, confidence, anxiety, and learning appetite. Report segment-level scores, not a single organisation score — a single score will mask the variation that matters for prioritisation.',
        outcomeClass: 'strong_positive',
        signals: { workforce_readiness: 0.9, data_literacy: 0.85, execution: 0.8 },
        rationale: 'Segmented design reflects the genuine heterogeneity of the workforce. Mobile-optimised pulse for store associates addresses the access barrier. Segment-level reporting gives the CEO actionable data.',
        isOptimal: true,
      },
      {
        text: 'Send a single 15-minute survey to all 6,000 employees covering digital literacy, AI awareness, and learning preferences. Aggregate the results into a single readiness score.',
        outcomeClass: 'negative',
        signals: { workforce_readiness: -0.4, data_literacy: -0.5, execution: 0.3 },
        rationale: 'A single survey with a single score will have low completion rates among store associates and will mask the variation between segments. The CEO will receive a number that is not actionable.',
        isOptimal: false,
      },
      {
        text: 'Focus the assessment on the 600 head office staff as they are most likely to be early AI adopters and will generate the most reliable data.',
        outcomeClass: 'negative',
        signals: { workforce_readiness: -0.6, data_literacy: -0.3, execution: 0.2 },
        rationale: 'Assessing only the most digitally literate segment produces a misleadingly positive readiness picture and ignores the 4,200 store associates who represent the largest change management challenge.',
        isOptimal: false,
      },
      {
        text: 'Use existing HR data (training completion rates, digital tool adoption, performance scores) as a proxy for AI readiness. Supplement with a short survey for senior leaders only.',
        outcomeClass: 'partial_positive',
        signals: { workforce_readiness: 0.3, data_literacy: 0.4, execution: 0.6 },
        rationale: 'Using existing data is efficient but training completion and performance scores are weak proxies for AI readiness. The senior-leader-only survey will miss the frontline perspective entirely.',
        isOptimal: false,
      },
    ],
    anchors: [
      {
        capabilityKey: 'workforce_ai_readiness',
        scoreBand: 'advanced',
        descriptor: 'Designs a segmented, accessible assessment that reflects workforce heterogeneity and produces actionable segment-level data.',
        indicators: ['Designs different instruments for different workforce segments', 'Addresses access barriers (mobile-optimised for store associates)', 'Reports segment-level data rather than a single aggregate score'],
      },
    ],
  },

  {
    interactionId: 'WAR-010',
    title: 'Prioritising AI Upskilling Investment Across Competing Business Units',
    domain: 'Workforce AI Readiness',
    capabilityKey: 'workforce_ai_readiness',
    interactionType: 'prioritisation',
    difficulty: 3,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'You have a £500,000 AI upskilling budget for the year. Four business unit heads have submitted requests totalling £1.2 million: (1) Finance: £200,000 for AI-assisted financial modelling training for 80 analysts — high ROI, low risk, 6-month payback. (2) Customer Operations: £350,000 for AI customer service tool training for 400 agents — medium ROI, high urgency (tool launches in 3 months). (3) Product: £400,000 for advanced AI/ML capability for 15 engineers — high strategic value, 18-month payback. (4) HR: £250,000 for AI literacy across the full HR function — foundational, no direct ROI metric.',
    constraint: 'You cannot split the budget equally. The CEO has asked you to make a recommendation, not present options.',
    question: 'How do you allocate the £500,000 and on what basis?',
    workflowKey: 'workforce_planning',
    roleKeys: ['hr_director', 'head_of_hr', 'learning_development_specialist'],
    failureModes: ['stakeholder_misalignment', 'one_size_fits_all'],
    tags: ['workforce_readiness', 'budget_allocation', 'prioritisation', 'ai_strategy'],
    primarySignal: 'strategic_alignment',
    ambiguityLevel: 'high',
    options: [
      {
        text: 'Allocate: Customer Operations £300,000 (reduced from £350,000 — prioritise the 3-month launch deadline, defer advanced modules to Year 2); Finance £150,000 (full request is high ROI but not time-critical — fund the core programme, defer specialist modules); HR £50,000 (foundational AI literacy only — HR must model the capability it is asking others to build); Product £0 in Year 1 (18-month payback and 15 people — high value but lowest urgency; negotiate a Year 2 commitment). Publish the prioritisation criteria transparently to all BU heads.',
        outcomeClass: 'strong_positive',
        signals: { workforce_readiness: 0.85, strategic_alignment: 0.9, stakeholder_engagement: 0.8 },
        rationale: 'Prioritises the time-critical deployment, funds the high-ROI programme, ensures HR models the capability it advocates, and defers the lowest-urgency request with a clear Year 2 commitment. Transparent criteria reduce stakeholder resentment.',
        isOptimal: true,
      },
      {
        text: 'Fund Customer Operations in full (£350,000) as it has the highest urgency. Allocate the remaining £150,000 to Finance. Decline Product and HR requests for this year.',
        outcomeClass: 'partial_positive',
        signals: { workforce_readiness: 0.5, strategic_alignment: 0.5, stakeholder_engagement: 0.3 },
        rationale: 'Defensible but misses the opportunity to fund HR\'s foundational programme, which will affect the quality of all future AI upskilling. Declining Product entirely without a Year 2 commitment risks losing strategic momentum.',
        isOptimal: false,
      },
      {
        text: 'Allocate £125,000 to each business unit. Each BU designs their own programme within their allocation.',
        outcomeClass: 'negative',
        signals: { workforce_readiness: -0.3, strategic_alignment: -0.5, stakeholder_engagement: 0.2 },
        rationale: 'Equal allocation ignores urgency, ROI, and strategic value. Customer Operations cannot deliver a meaningful programme for 400 agents on £125,000 in 3 months. This is a non-decision presented as fairness.',
        isOptimal: false,
      },
      {
        text: 'Ask the CEO to increase the budget to £1.2 million to fund all four requests in full. Present the business case for full funding.',
        outcomeClass: 'negative',
        signals: { workforce_readiness: -0.2, strategic_alignment: -0.3, stakeholder_engagement: -0.1 },
        rationale: 'The CEO asked for a recommendation within the existing budget. Returning with a request for 140% more funding without being asked signals an inability to make difficult prioritisation decisions.',
        isOptimal: false,
      },
    ],
    anchors: [
      {
        capabilityKey: 'workforce_ai_readiness',
        scoreBand: 'advanced',
        descriptor: 'Applies explicit prioritisation criteria (urgency, ROI, payback period, strategic value), makes a clear recommendation, and manages stakeholder expectations transparently.',
        indicators: ['Prioritises by urgency first, then ROI', 'Includes HR in the allocation to model the capability it advocates', 'Defers rather than declines the Product request, with a Year 2 commitment'],
      },
    ],
  },

  {
    interactionId: 'WAR-011',
    title: 'Addressing AI Anxiety in a Frontline Workforce',
    domain: 'Workforce AI Readiness',
    capabilityKey: 'workforce_ai_readiness',
    interactionType: 'intervention_design',
    difficulty: 2,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'A pulse survey of your 1,800-person logistics workforce reveals that 54% believe AI will reduce headcount in their team within two years. 38% say they would resist using AI tools if introduced. The organisation is planning to introduce AI-assisted route optimisation and predictive maintenance tools in the next 12 months — neither tool will reduce headcount, but both will change how work is done significantly. Engagement scores in the logistics function are already below the company average.',
    constraint: 'The tools are being implemented regardless of workforce sentiment. Your role is to prepare the workforce, not to delay the implementation.',
    question: 'What is your workforce readiness intervention?',
    workflowKey: 'change_management',
    roleKeys: ['hr_business_partner', 'learning_development_specialist', 'head_of_hr'],
    failureModes: ['change_resistance', 'communication_failure'],
    tags: ['workforce_readiness', 'change_management', 'frontline', 'ai_anxiety'],
    primarySignal: 'change_pace',
    ambiguityLevel: 'medium',
    options: [
      {
        text: 'Run a "What AI means for your job" session for all 1,800 employees before the tools launch — led by their own line managers (not HR), using concrete examples from their specific roles. Involve 20 frontline volunteers as "AI Champions" who trial the tools first and share their experience with peers. Publish a clear, signed commitment from the Operations Director that no roles will be cut as a result of these tools. Build a feedback channel so workers can report problems with the tools without fear.',
        outcomeClass: 'strong_positive',
        signals: { workforce_readiness: 0.9, change_leadership: 0.85, communication: 0.9 },
        rationale: 'Peer-led communication is more credible than HR-led for frontline workers. AI Champions create social proof. The signed commitment directly addresses the 54% job-loss fear. The feedback channel reduces the sense of powerlessness.',
        isOptimal: true,
      },
      {
        text: 'Run a mandatory 4-hour AI literacy training programme for all 1,800 employees before the tools launch. Cover what the tools do, how to use them, and the business case for AI adoption.',
        outcomeClass: 'partial_positive',
        signals: { workforce_readiness: 0.4, change_leadership: 0.3, communication: 0.3 },
        rationale: 'Training addresses capability but not anxiety. A mandatory programme that leads with the business case will feel like a management communication exercise, not genuine engagement. It does not address the 54% job-loss fear.',
        isOptimal: false,
      },
      {
        text: 'Focus on the 38% who say they would resist. Run targeted engagement sessions with this group to understand their concerns and address them individually.',
        outcomeClass: 'partial_positive',
        signals: { workforce_readiness: 0.4, change_leadership: 0.4, communication: 0.3 },
        rationale: 'Targeting resisters is valuable but insufficient. The 54% job-loss fear affects the whole workforce, not just the 38% who would actively resist. Ignoring the majority creates a two-tier communication approach.',
        isOptimal: false,
      },
      {
        text: 'Delay the workforce readiness intervention until after the tools have launched. Address concerns as they arise in real time rather than trying to pre-empt them.',
        outcomeClass: 'negative',
        signals: { workforce_readiness: -0.7, change_leadership: -0.6, communication: -0.7 },
        rationale: 'Launching tools into a workforce where 54% fear job loss and 38% plan to resist without any prior intervention will generate active sabotage, low adoption rates, and a further drop in engagement scores.',
        isOptimal: false,
      },
    ],
    anchors: [
      {
        capabilityKey: 'workforce_ai_readiness',
        scoreBand: 'advanced',
        descriptor: 'Addresses the emotional barrier (job-loss fear) before the capability barrier, uses peer-led communication, and builds a feedback mechanism.',
        indicators: ['Leads with the job security commitment, not the training programme', 'Uses frontline peers as change agents rather than relying on HR or management', 'Creates a two-way feedback channel, not just a one-way communication'],
      },
    ],
  },

  {
    interactionId: 'WAR-012',
    title: 'Identifying AI-Vulnerable Roles Before a Workforce Planning Cycle',
    domain: 'Workforce AI Readiness',
    capabilityKey: 'workforce_ai_readiness',
    interactionType: 'risk_judgement',
    difficulty: 4,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'You are preparing the annual workforce plan for a 2,500-person financial services firm. The CFO has asked HR to identify which roles are most at risk of AI-driven automation over the next three years, so the firm can plan its talent pipeline accordingly. You have access to: job descriptions for all 180 role types, a recent McKinsey automation potential dataset, your own HRIS data on skills and performance, and three months of AI tool usage data from a recent pilot.',
    constraint: 'The CFO wants a list of "high-risk" roles by the end of the month. You are aware that if this list leaks internally, it could trigger significant anxiety and attrition among the affected employees.',
    question: 'How do you approach this analysis and manage the confidentiality risk?',
    workflowKey: 'workforce_planning',
    roleKeys: ['hr_director', 'head_of_hr', 'workforce_planning_analyst'],
    failureModes: ['data_misinterpretation', 'communication_failure', 'fairness_blindspot'],
    tags: ['workforce_readiness', 'workforce_planning', 'automation_risk', 'confidentiality', 'high_risk'],
    primarySignal: 'strategic_alignment',
    ambiguityLevel: 'high',
    options: [
      {
        text: 'Conduct the analysis using a multi-factor framework: task automation potential (from McKinsey data), current AI tool substitution rate (from pilot data), strategic importance of the role, and replaceability timeline. Classify roles into three tiers: high, medium, and low transition risk. Present the analysis to the CFO with a clear recommendation that the output is used for pipeline planning only — not for individual performance management or redundancy decisions. Agree a strict access control protocol before sharing the document. Recommend proactive investment in transition pathways for high-risk roles rather than waiting for the roles to become redundant.',
        outcomeClass: 'strong_positive',
        signals: { workforce_readiness: 0.9, governance_sensitivity: 0.85, strategic_alignment: 0.9 },
        rationale: 'Multi-factor analysis is more accurate than single-metric automation potential scores. Proactive transition investment reduces the human cost of automation. Strict access controls manage the confidentiality risk.',
        isOptimal: true,
      },
      {
        text: 'Apply the McKinsey automation potential dataset directly to your 180 role types and produce a ranked list of high-risk roles. Share with the CFO as requested.',
        outcomeClass: 'partial_positive',
        signals: { workforce_readiness: 0.3, governance_sensitivity: -0.3, strategic_alignment: 0.4 },
        rationale: 'The McKinsey dataset is a useful input but was not designed for firm-specific workforce planning. Applying it directly without contextualisation will produce inaccurate classifications. No access control protocol is established.',
        isOptimal: false,
      },
      {
        text: 'Decline to produce the list on the grounds that it could cause harm if it leaked. Recommend instead that the firm invest in broad AI upskilling for all employees.',
        outcomeClass: 'negative',
        signals: { workforce_readiness: -0.4, governance_sensitivity: 0.3, strategic_alignment: -0.6 },
        rationale: 'Declining a legitimate business request is not a credible response. The CFO needs this data for pipeline planning. Refusing to engage with automation risk does not make it go away.',
        isOptimal: false,
      },
      {
        text: 'Produce the analysis and share it with the CFO, line managers, and the affected employees simultaneously to ensure transparency.',
        outcomeClass: 'negative',
        signals: { workforce_readiness: -0.5, governance_sensitivity: -0.7, strategic_alignment: -0.3 },
        rationale: 'Sharing automation risk classifications with affected employees before transition pathways are in place will trigger immediate anxiety and attrition. Transparency is important but must be sequenced — plan first, then communicate.',
        isOptimal: false,
      },
    ],
    anchors: [
      {
        capabilityKey: 'workforce_ai_readiness',
        scoreBand: 'advanced',
        descriptor: 'Applies a multi-factor framework, establishes access controls, and recommends proactive transition investment rather than passive risk identification.',
        indicators: ['Uses multiple data sources, not just automation potential scores', 'Establishes access control protocol before sharing', 'Frames the output as a planning tool, not a redundancy list'],
      },
    ],
  },

  {
    interactionId: 'WAR-013',
    title: 'Designing a Role Transition Pathway for Roles at High Automation Risk',
    domain: 'Workforce AI Readiness',
    capabilityKey: 'workforce_ai_readiness',
    interactionType: 'intervention_design',
    difficulty: 3,
    riskLevel: 'High',
    governanceSensitive: true,
    scenario: 'Your workforce planning analysis has identified 95 data entry and document processing roles that are likely to be substantially automated within 18 months. The employees in these roles are predominantly women (78%), have an average tenure of 7 years, and have limited formal qualifications. The organisation has committed publicly to "responsible AI adoption" and has a stated goal of no compulsory redundancies from AI automation. You have 18 months and a budget of £280,000.',
    constraint: 'The 18-month timeline is fixed by the technology implementation schedule. You cannot extend it.',
    question: 'Design the transition pathway.',
    workflowKey: 'workforce_planning',
    roleKeys: ['hr_director', 'head_of_hr', 'learning_development_specialist'],
    failureModes: ['fairness_blindspot', 'change_resistance', 'one_size_fits_all'],
    tags: ['workforce_readiness', 'role_transition', 'automation_risk', 'inclusion', 'high_risk'],
    primarySignal: 'change_pace',
    ambiguityLevel: 'high',
    options: [
      {
        text: 'Design a three-stage transition: Stage 1 (months 1-3): Individual skills assessment for all 95 employees — identify transferable skills, career aspirations, and learning barriers. Map to 15 target roles across the organisation that are growing and accessible without a degree. Stage 2 (months 4-14): Funded retraining for each employee\'s chosen target role, combining on-the-job shadowing with structured learning. Assign each employee a transition buddy in their target role. Stage 3 (months 15-18): Supported internal moves with a 6-month performance safety net. Publish progress quarterly to demonstrate the "responsible AI" commitment. Allocate 20% of the budget to childcare and travel support given the demographic profile.',
        outcomeClass: 'strong_positive',
        signals: { workforce_readiness: 0.9, inclusion: 0.9, change_leadership: 0.85 },
        rationale: 'Individual assessment respects the diversity of starting points. Transition buddies provide social support. The childcare/travel allocation addresses a real barrier for the predominantly female cohort. Quarterly reporting maintains accountability.',
        isOptimal: true,
      },
      {
        text: 'Run a 3-month digital skills bootcamp for all 95 employees covering Excel, data analysis, and basic AI tool usage. Then advertise internal vacancies and let employees apply.',
        outcomeClass: 'partial_positive',
        signals: { workforce_readiness: 0.4, inclusion: 0.3, change_leadership: 0.3 },
        rationale: 'A generic bootcamp does not address the diversity of career aspirations or the specific barriers (childcare, travel, confidence) facing this cohort. Advertising vacancies without supported transition is likely to result in a low internal move rate.',
        isOptimal: false,
      },
      {
        text: 'Offer voluntary redundancy with an enhanced package to all 95 employees. Those who wish to stay can apply for retraining.',
        outcomeClass: 'negative',
        signals: { workforce_readiness: -0.5, inclusion: -0.6, change_leadership: -0.4 },
        rationale: 'Voluntary redundancy contradicts the "no compulsory redundancies" commitment and is likely to result in the most mobile employees leaving (those the organisation most wants to retain). The "responsible AI" public commitment will be seen as hollow.',
        isOptimal: false,
      },
      {
        text: 'Negotiate with the technology vendor to delay the automation rollout by 6 months to give more time for transition.',
        outcomeClass: 'partial_positive',
        signals: { workforce_readiness: 0.2, inclusion: 0.3, change_leadership: 0.2 },
        rationale: 'A delay buys time but does not solve the design problem. If the transition pathway is poorly designed, 6 extra months will not produce a better outcome. The constraint states the timeline is fixed.',
        isOptimal: false,
      },
    ],
    anchors: [
      {
        capabilityKey: 'workforce_ai_readiness',
        scoreBand: 'advanced',
        descriptor: 'Designs an individualised, supported transition that addresses practical barriers specific to the demographic profile and maintains accountability through public reporting.',
        indicators: ['Starts with individual assessment, not a generic programme', 'Allocates budget to practical barriers (childcare, travel)', 'Builds in a performance safety net for internal movers', 'Publishes progress to maintain the "responsible AI" commitment'],
      },
    ],
  },

  {
    interactionId: 'WAR-014',
    title: 'Evaluating a Vendor\'s AI Readiness Assessment Tool',
    domain: 'Workforce AI Readiness',
    capabilityKey: 'workforce_ai_readiness',
    interactionType: 'output_evaluation',
    difficulty: 3,
    riskLevel: 'Medium',
    governanceSensitive: false,
    scenario: 'A vendor is pitching an AI readiness assessment platform to your organisation. The tool claims to measure "AI readiness" across five dimensions: digital literacy, data literacy, AI awareness, adaptability, and growth mindset. It produces an individual readiness score (0–100) and an organisational readiness heatmap. The vendor\'s case study shows that organisations with an average score above 65 achieve 40% faster AI tool adoption. The tool costs £85,000 per year for your 4,000-person organisation.',
    constraint: 'Your CHRO is enthusiastic about the tool and has asked you to make a recommendation by the end of the week.',
    question: 'What is your evaluation framework and what questions do you need answered before making a recommendation?',
    workflowKey: 'workforce_planning',
    roleKeys: ['hr_director', 'head_of_hr', 'learning_development_specialist'],
    failureModes: ['automation_bias', 'data_misinterpretation'],
    tags: ['workforce_readiness', 'vendor_evaluation', 'ai_tools', 'data_literacy'],
    primarySignal: 'data_literacy',
    ambiguityLevel: 'medium',
    options: [
      {
        text: 'Before recommending, ask: (1) What is the psychometric validity of the five dimensions — are they independently validated constructs or proprietary labels? (2) What is the evidence base for the "65 = 40% faster adoption" claim — correlation or causation, and what was the sample size and industry mix? (3) How are individual scores used — can managers see individual employee scores, and what are the data privacy implications? (4) What does the tool actually measure — self-report survey, behavioural data, or both? (5) What is the remediation pathway — does the tool tell you what to do with low scores, or just identify them? Present these questions to the CHRO as the conditions for a credible recommendation.',
        outcomeClass: 'strong_positive',
        signals: { workforce_readiness: 0.9, data_literacy: 0.9, governance_sensitivity: 0.85 },
        rationale: 'Rigorous vendor evaluation prevents purchase of a tool that produces misleading scores. The five questions cover validity, evidence quality, privacy, methodology, and actionability — the minimum standard for a £85,000 annual investment.',
        isOptimal: true,
      },
      {
        text: 'Run a pilot with 200 employees to test the tool before making a recommendation. Report back to the CHRO with pilot data.',
        outcomeClass: 'partial_positive',
        signals: { workforce_readiness: 0.5, data_literacy: 0.5, governance_sensitivity: 0.4 },
        rationale: 'A pilot is valuable but should come after the validity and privacy questions are answered. Running a pilot without understanding the psychometric basis of the tool risks generating misleading data that influences a £85,000 decision.',
        isOptimal: false,
      },
      {
        text: 'Recommend the tool based on the vendor\'s case study data and the CHRO\'s enthusiasm. The 40% faster adoption claim is compelling.',
        outcomeClass: 'negative',
        signals: { workforce_readiness: -0.5, data_literacy: -0.7, governance_sensitivity: -0.4 },
        rationale: 'Accepting a vendor\'s own case study as sufficient evidence is a data literacy failure. The 40% claim may be based on a small, self-selected sample. Recommending without scrutiny exposes the organisation to a poor investment and potentially misleading employee data.',
        isOptimal: false,
      },
      {
        text: 'Decline to recommend the tool on the grounds that readiness assessment should be done internally using existing HR data.',
        outcomeClass: 'partial_positive',
        signals: { workforce_readiness: 0.3, data_literacy: 0.4, governance_sensitivity: 0.3 },
        rationale: 'Scepticism of vendor tools is healthy but a blanket refusal is not a credible response to the CHRO\'s request. The right answer is to evaluate rigorously, not to refuse to engage.',
        isOptimal: false,
      },
    ],
    anchors: [
      {
        capabilityKey: 'workforce_ai_readiness',
        scoreBand: 'advanced',
        descriptor: 'Applies a structured evaluation framework covering validity, evidence quality, privacy, methodology, and actionability before making a recommendation.',
        indicators: ['Questions the psychometric validity of the dimensions', 'Scrutinises the evidence base for the adoption claim', 'Raises data privacy implications of individual scores', 'Asks what the tool recommends doing with low scores'],
      },
    ],
  },
];

// ─── Seed all scenarios ───────────────────────────────────────────────────────

console.log('Seeding ai_change_leadership scenarios...');
for (const s of changeLeadershipScenarios) {
  const id = await insertScenario(s);
  console.log(`  ✓ ${s.interactionId} — ${s.title} (${id})`);
}

console.log('Seeding workforce_ai_readiness scenarios...');
for (const s of workforceReadinessScenarios) {
  const id = await insertScenario(s);
  console.log(`  ✓ ${s.interactionId} — ${s.title} (${id})`);
}

// ─── Verify final counts ──────────────────────────────────────────────────────
const [counts] = await conn.query(
  "SELECT capability_key, COUNT(*) as cnt FROM content_scenarios GROUP BY capability_key ORDER BY cnt DESC"
);
console.log('\nFinal domain counts:');
for (const row of counts) {
  console.log(`  ${row.capability_key}: ${row.cnt}`);
}

await conn.end();
console.log('\nDone.');
