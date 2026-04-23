/**
 * AiQ Assessment Stress Test
 * Simulates assessments across all HR roles and seniority levels
 * Tests: scoring credibility, role differentiation, edge cases
 */

import { ROLE_ARCHETYPES } from './assessment/roleArchetypes';
import {
  computeSignalScores,
  computeCapabilityScores,
  computeOverallScore,
  classifyReadiness,
  detectFailureModes,
} from './assessment/scoringEngine';
import { analyseGamingPatterns } from './assessment/antiGamingEngine';

// ─── Answer factory ───────────────────────────────────────────────────────────
// Produces answers in the format expected by computeSignalScores (signalDeltasJson)
// and analyseGamingPatterns (signalDeltas)

type AnswerBias = 'strong' | 'moderate' | 'weak' | 'critical_failure';

const SIGNAL_DELTAS: Record<AnswerBias, Record<string, number>> = {
  strong: {
    judgement_quality: 1.5, execution_quality: 1.2, governance_quality: 1.0,
    appropriateness_boundary: 0.8, workflow_application_quality: 0.6, data_interpretation_quality: 0.5,
  },
  moderate: {
    judgement_quality: 0.3, execution_quality: 0.2, governance_quality: 0.1,
    appropriateness_boundary: 0.1, workflow_application_quality: 0.1, data_interpretation_quality: 0.1,
  },
  weak: {
    judgement_quality: -0.8, execution_quality: -0.5, governance_quality: -0.3,
    appropriateness_boundary: -0.4, workflow_application_quality: -0.3, data_interpretation_quality: -0.2,
  },
  critical_failure: {
    judgement_quality: -3.0, execution_quality: -2.5, governance_quality: -2.8,
    appropriateness_boundary: -2.0, workflow_application_quality: -1.5, data_interpretation_quality: -1.8,
  },
};

const OUTCOME_CLASS: Record<AnswerBias, string> = {
  strong: 'strong',
  moderate: 'acceptable',
  weak: 'weak',
  critical_failure: 'critical_failure',
};

function makeAnswer(bias: AnswerBias, timeMs = 8000, pos = 0) {
  const deltas = SIGNAL_DELTAS[bias];
  return {
    // For computeSignalScores
    signalDeltasJson: deltas,
    outcomeClass: OUTCOME_CLASS[bias],
    riskLevel: 'High',
    difficulty: 2,
    confidenceScore: 0.7,
    timeToAnswerMs: timeMs,
    interactionType: 'scenario',
    // For detectFailureModes
    eventCodes: [] as string[],
    // For analyseGamingPatterns
    selectedValue: String.fromCharCode(65 + pos),
    optionPosition: pos,
    signalDeltas: deltas,
  };
}

function makeAnswerSet(
  profile: Array<{ bias: AnswerBias; count: number }>,
  timeMs = 8000
) {
  const answers: ReturnType<typeof makeAnswer>[] = [];
  let pos = 0;
  for (const { bias, count } of profile) {
    for (let i = 0; i < count; i++) {
      answers.push(makeAnswer(bias, timeMs, pos % 4));
      pos++;
    }
  }
  return answers;
}

// ─── Test Scenarios ───────────────────────────────────────────────────────────

interface TestResult {
  role: string;
  seniority: string;
  scenario: string;
  overallScore: number;
  readinessState: string;
  governanceAction: string | null;
  credibilityIssues: string[];
  capabilityScores: Record<string, number>;
  gamingScrutiny: string;
}

const results: TestResult[] = [];
const roles = Object.keys(ROLE_ARCHETYPES);

const scenarios = [
  { name: 'Expert performer (all strong)',            profile: [{ bias: 'strong' as AnswerBias, count: 20 }],                                                    timeMs: 9000  },
  { name: 'Competent mid-level (strong+moderate)',    profile: [{ bias: 'strong' as AnswerBias, count: 10 }, { bias: 'moderate' as AnswerBias, count: 10 }],     timeMs: 8000  },
  { name: 'Developing (mostly moderate)',             profile: [{ bias: 'moderate' as AnswerBias, count: 15 }, { bias: 'weak' as AnswerBias, count: 5 }],         timeMs: 7000  },
  { name: 'At-risk (mostly weak)',                    profile: [{ bias: 'weak' as AnswerBias, count: 15 }, { bias: 'moderate' as AnswerBias, count: 5 }],         timeMs: 6000  },
  { name: 'Critical failure (governance collapse)',   profile: [{ bias: 'critical_failure' as AnswerBias, count: 5 }, { bias: 'weak' as AnswerBias, count: 15 }], timeMs: 5000  },
  { name: 'Inconsistent (strong then weak)',          profile: [{ bias: 'strong' as AnswerBias, count: 10 }, { bias: 'weak' as AnswerBias, count: 10 }],          timeMs: 8000  },
  { name: 'Speed-gaming (all fast 400ms)',            profile: [{ bias: 'moderate' as AnswerBias, count: 20 }],                                                   timeMs: 400   },
  { name: 'Minimal evidence (5 answers)',             profile: [{ bias: 'strong' as AnswerBias, count: 5 }],                                                      timeMs: 9000  },
  { name: 'Junior-level (weak+moderate)',             profile: [{ bias: 'weak' as AnswerBias, count: 8 }, { bias: 'moderate' as AnswerBias, count: 12 }],         timeMs: 10000 },
  { name: 'Senior expert (strong, thoughtful)',       profile: [{ bias: 'strong' as AnswerBias, count: 18 }, { bias: 'moderate' as AnswerBias, count: 2 }],       timeMs: 15000 },
];

for (const roleKey of roles) {
  const archetype = ROLE_ARCHETYPES[roleKey];

  for (const scenario of scenarios) {
    const answers = makeAnswerSet(scenario.profile, scenario.timeMs);
    const evidenceSufficient = answers.length >= 20;

    // Compute signal scores → capability scores → overall score
    const signalScores = computeSignalScores(answers);
    const capScores = computeCapabilityScores(signalScores);
    const overallScore = computeOverallScore(capScores, archetype.capabilityWeights);

    // Failure modes (needs eventCodes field)
    const answersForFailure = answers.map(a => ({
      outcomeClass: a.outcomeClass,
      signalDeltas: a.signalDeltas,
      eventCodes: a.eventCodes,
    }));
    const failureModes = detectFailureModes(answersForFailure);

    // Gaming analysis
    const answersForGaming = answers.map(a => ({
      selectedValue: a.selectedValue,
      optionPosition: a.optionPosition,
      timeToAnswerMs: a.timeToAnswerMs,
      outcomeClass: a.outcomeClass,
      confidenceScore: a.confidenceScore,
      signalDeltas: a.signalDeltas,
      interactionType: a.interactionType,
      riskLevel: a.riskLevel,
    }));
    const gamingAnalysis = analyseGamingPatterns(answersForGaming, archetype.gamingFamily);

    const riskBand: 'low' | 'medium' | 'high' = overallScore >= 70 ? 'low' : overallScore >= 50 ? 'medium' : 'high';

    const readiness = classifyReadiness(
      overallScore,
      riskBand,
      failureModes,
      evidenceSufficient,
      capScores,
      archetype.minimumSafeThresholds,
      0.75
    );

    const credibilityIssues: string[] = [];

    // C1: Expert should score ≥70
    if (scenario.name.includes('Expert') && overallScore < 70) {
      credibilityIssues.push(`LOW_EXPERT_SCORE: Expert scored only ${overallScore} (expected ≥70)`);
    }
    // C2: At-risk should score ≤55
    if (scenario.name.includes('At-risk') && overallScore > 55) {
      credibilityIssues.push(`HIGH_ATRISK_SCORE: At-risk scored ${overallScore} (expected ≤55)`);
    }
    // C3: Critical failure should never be safe
    if (scenario.name.includes('Critical failure') && readiness.state === 'safe') {
      credibilityIssues.push(`WRONG_STATE: Critical failure classified as safe`);
    }
    // C4: Minimal evidence should never be safe
    if (scenario.name.includes('Minimal') && readiness.state === 'safe') {
      credibilityIssues.push(`EVIDENCE_GATE_FAIL: 5-answer session classified as safe`);
    }
    // C5: Score range sanity
    if (overallScore < 0 || overallScore > 100) {
      credibilityIssues.push(`SCORE_OUT_OF_RANGE: ${overallScore}`);
    }
    // C6: NaN check
    if (isNaN(overallScore)) {
      credibilityIssues.push(`NAN_SCORE: overallScore is NaN`);
    }
    // C7: Capability weight sum
    const weightSum = Object.values(archetype.capabilityWeights).reduce((s, v) => s + v, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      credibilityIssues.push(`WEIGHT_SUM_ERROR: ${roleKey} weights sum to ${weightSum.toFixed(3)}`);
    }
    // C8: Expert should score higher than at-risk for same role
    // (checked in summary below cross-scenario)

    results.push({
      role: archetype.displayName,
      seniority: archetype.seniority,
      scenario: scenario.name,
      overallScore,
      readinessState: readiness.state,
      governanceAction: readiness.governanceAction,
      credibilityIssues,
      capabilityScores: Object.fromEntries(
        Object.entries(capScores).map(([k, v]) => [k, (v as any).score])
      ),
      gamingScrutiny: gamingAnalysis.scrutinyLevel,
    });
  }
}

// ─── Cross-scenario monotonicity check ────────────────────────────────────────
// Expert should always score higher than at-risk for the same role
for (const roleKey of roles) {
  const archetype = ROLE_ARCHETYPES[roleKey];
  const expertResult = results.find(r => r.role === archetype.displayName && r.scenario.includes('Expert'));
  const atRiskResult = results.find(r => r.role === archetype.displayName && r.scenario.includes('At-risk'));
  if (expertResult && atRiskResult && expertResult.overallScore <= atRiskResult.overallScore) {
    expertResult.credibilityIssues.push(
      `MONOTONICITY_FAIL: Expert (${expertResult.overallScore}) ≤ At-risk (${atRiskResult.overallScore}) for ${archetype.displayName}`
    );
  }
}

// ─── Summary Output ───────────────────────────────────────────────────────────

console.log('\n=== AiQ Assessment Stress Test Results ===\n');
console.log(`Total test cases: ${results.length} (${roles.length} roles × ${scenarios.length} scenarios)\n`);

// Score distribution by scenario
console.log('--- Score Distribution by Scenario (avg across all roles) ---');
const scenarioNames = scenarios.map(s => s.name);
for (const scenName of scenarioNames) {
  const scores = results.filter(r => r.scenario === scenName).map(r => r.overallScore);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const spread = max - min;
  console.log(`  ${scenName.padEnd(48)} avg=${String(avg).padStart(3)} min=${String(min).padStart(3)} max=${String(max).padStart(3)} spread=${spread}`);
}

// Role differentiation for Expert scenario
console.log('\n--- Role Score Differentiation (Expert scenario) ---');
for (const r of results.filter(r => r.scenario.includes('Expert performer'))) {
  const capStr = Object.entries(r.capabilityScores)
    .map(([k, v]) => `${k.slice(0, 4)}=${v}`)
    .join(' ');
  console.log(`  ${r.role.padEnd(32)} seniority=${r.seniority.padEnd(7)} score=${String(r.overallScore).padStart(3)} state=${r.readinessState.padEnd(30)} ${capStr}`);
}

// Readiness state distribution
console.log('\n--- Readiness State Distribution (all scenarios) ---');
const stateCounts: Record<string, number> = {};
for (const r of results) {
  stateCounts[r.readinessState] = (stateCounts[r.readinessState] ?? 0) + 1;
}
for (const [state, count] of Object.entries(stateCounts).sort((a, b) => b[1] - a[1])) {
  const pct = Math.round((count / results.length) * 100);
  console.log(`  ${state.padEnd(35)} count=${count} (${pct}%)`);
}

// Gaming detection
console.log('\n--- Gaming Detection (Speed-gaming scenario) ---');
for (const r of results.filter(r => r.scenario.includes('Speed-gaming'))) {
  console.log(`  ${r.role.padEnd(32)} scrutiny=${r.gamingScrutiny}`);
}

// Credibility issues
const issueResults = results.filter(r => r.credibilityIssues.length > 0);
console.log(`\n--- Credibility Issues Found: ${issueResults.length} ---`);
if (issueResults.length === 0) {
  console.log('  ✓ No credibility issues detected');
} else {
  for (const r of issueResults) {
    console.log(`  Role: ${r.role}, Scenario: ${r.scenario}`);
    for (const issue of r.credibilityIssues) {
      console.log(`    ⚠ ${issue}`);
    }
  }
}

// Role weight analysis
console.log('\n--- Role Capability Weight Analysis ---');
for (const roleKey of roles) {
  const a = ROLE_ARCHETYPES[roleKey];
  const weights = a.capabilityWeights;
  const sorted = Object.entries(weights).sort((x, y) => y[1] - x[1]);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const weightSum = Object.values(weights).reduce((s, v) => s + v, 0);
  const sumOk = Math.abs(weightSum - 1.0) < 0.01;
  console.log(`  ${a.displayName.padEnd(32)} top=${top[0].padEnd(22)} (${top[1].toFixed(2)}) bottom=${bottom[0].padEnd(22)} (${bottom[1].toFixed(2)}) sum=${weightSum.toFixed(2)} ${sumOk ? '✓' : '✗ WEIGHT_SUM_ERROR'}`);
}

// Seniority monotonicity check
console.log('\n--- Seniority Monotonicity Check (Expert scenario) ---');
const seniorityOrder = ['junior', 'mid', 'senior', 'lead'];
const familyGroups: Record<string, TestResult[]> = {};
for (const r of results.filter(r => r.scenario.includes('Expert performer'))) {
  const archKey = Object.keys(ROLE_ARCHETYPES).find(k => ROLE_ARCHETYPES[k].displayName === r.role)!;
  const family = ROLE_ARCHETYPES[archKey].gamingFamily;
  if (!familyGroups[family]) familyGroups[family] = [];
  familyGroups[family].push(r);
}
for (const [family, fResults] of Object.entries(familyGroups)) {
  const sorted = fResults.sort((a, b) => seniorityOrder.indexOf(a.seniority) - seniorityOrder.indexOf(b.seniority));
  console.log(`  Family: ${family}`);
  for (const r of sorted) {
    console.log(`    ${r.role.padEnd(32)} seniority=${r.seniority.padEnd(7)} score=${r.overallScore}`);
  }
}

// Capability score breakdown for all roles (expert scenario)
console.log('\n--- Capability Score Breakdown (Expert scenario, all roles) ---');
for (const r of results.filter(r => r.scenario.includes('Expert performer'))) {
  const caps = r.capabilityScores;
  console.log(`  ${r.role.padEnd(32)} exec=${String(caps.execution).padStart(3)} judg=${String(caps.judgement).padStart(3)} gove=${String(caps.governance).padStart(3)} appr=${String(caps.appropriateness).padStart(3)} work=${String(caps.workflow).padStart(3)} data=${String(caps.data_interpretation).padStart(3)}`);
}

console.log('\n=== Stress Test Complete ===\n');
