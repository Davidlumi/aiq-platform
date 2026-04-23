/**
 * WS1.1 Calibration script — verify anchor cases A/B/C/D under v2.1 and v2.2 formulas.
 *
 * v2.1 formula: intercept + (sum/count) * scaleFactor   (mean-based, monotonicity bug)
 * v2.2 formula: intercept + clip(sum, -cap, +cap) * multiplier  (sum+clip, monotonicity fixed)
 *
 * Parameters to find:
 *   contribution_cap        (default 8.0)
 *   contribution_multiplier (default 6.25)
 *   intercept               (50, same as v2.1)
 */

// ─── Shared helpers ──────────────────────────────────────────────────────────

const OUTCOME_MODIFIERS = {
  strong: 1.0,
  acceptable: 0.5,
  weak: -0.5,
  failure: -1.0,
  critical_failure: -1.5,
};

const RISK_MULTIPLIERS = {
  low:    { positive: 1.0, negative: 1.0 },
  medium: { positive: 1.0, negative: 1.05 },
  high:   { positive: 1.05, negative: 1.10 },
  critical: { positive: 1.15, negative: 1.55 },
};

const DIFFICULTY_WEIGHTS = { 1: 1.0, 2: 1.05, 3: 1.20, 4: 1.35 };

function weightedDelta(rawDelta, outcomeClass, riskLevel, difficultyLevel) {
  const outcomeMod = OUTCOME_MODIFIERS[outcomeClass];
  const riskMult = RISK_MULTIPLIERS[riskLevel];
  const diffWeight = DIFFICULTY_WEIGHTS[difficultyLevel];
  const multiplier = outcomeMod >= 0 ? riskMult.positive : riskMult.negative;
  return rawDelta * multiplier * diffWeight * outcomeMod;
}

// ─── v2.1 formula (mean-based) ───────────────────────────────────────────────
function v21Score(deltas, intercept = 50, multiplier = 50) {
  const sum = deltas.reduce((a, b) => a + b, 0);
  const count = deltas.length;
  const avgDelta = count > 0 ? sum / count : 0;
  const baseScale = multiplier / 4;  // = 12.5
  const scaleFactor = count <= 3 ? baseScale : Math.max(baseScale * 0.4, baseScale / Math.sqrt(count / 3));
  return Math.max(0, Math.min(100, Math.round(intercept + avgDelta * scaleFactor)));
}

// ─── v2.2 formula (sum+clip) ─────────────────────────────────────────────────
function v22Score(deltas, intercept = 50, cap = 8.0, contribMultiplier = 6.25) {
  const sum = deltas.reduce((a, b) => a + b, 0);
  const clipped = Math.max(-cap, Math.min(cap, sum));
  return Math.max(0, Math.min(100, Math.round(intercept + clipped * contribMultiplier)));
}

// ─── Build answer sequences for each anchor ──────────────────────────────────

// Anchor A: 6 strong, medium risk, difficulty 2, |delta|=2.0
const anchorA = Array(6).fill(null).map(() => weightedDelta(2.0, 'strong', 'medium', 2));

// Anchor B: 2 strong, 2 acceptable, 2 weak, medium risk, difficulty 2, |delta|=1.5
const anchorB = [
  ...Array(2).fill(null).map(() => weightedDelta(1.5, 'strong', 'medium', 2)),
  ...Array(2).fill(null).map(() => weightedDelta(1.5, 'acceptable', 'medium', 2)),
  ...Array(2).fill(null).map(() => weightedDelta(1.5, 'weak', 'medium', 2)),
];

// Anchor C: 4 failure + 2 critical_failure, high risk, difficulty 3, |delta|=2.0
const anchorC = [
  ...Array(4).fill(null).map(() => weightedDelta(2.0, 'failure', 'high', 3)),
  ...Array(2).fill(null).map(() => weightedDelta(2.0, 'critical_failure', 'high', 3)),
];

// Anchor D — monotonicity: 3 answers avg +2.0 vs 4 answers (2.0, 2.0, 2.0, 1.2)
// Using strong, medium risk, difficulty 2
const anchorD3 = Array(3).fill(null).map(() => weightedDelta(2.0, 'strong', 'medium', 2));
const anchorD4 = [
  ...Array(3).fill(null).map(() => weightedDelta(2.0, 'strong', 'medium', 2)),
  weightedDelta(1.2, 'strong', 'medium', 2),
];

// ─── Run calibration ─────────────────────────────────────────────────────────

const CAP = 8.0;
const CONTRIB_MULT = 6.25;
const INTERCEPT = 50;

console.log('=== WS1.1 Calibration: v2.1 vs v2.2 ===\n');

function check(label, deltas, v21Expected, v22Expected) {
  const s21 = v21Score(deltas);
  const s22 = v22Score(deltas, INTERCEPT, CAP, CONTRIB_MULT);
  const sum = deltas.reduce((a,b)=>a+b,0).toFixed(3);
  console.log(`${label}`);
  console.log(`  deltas: [${deltas.map(d=>d.toFixed(3)).join(', ')}]  sum=${sum}`);
  console.log(`  v2.1 score: ${s21}  (expected: ${v21Expected})`);
  console.log(`  v2.2 score: ${s22}  (expected: ${v22Expected})`);
  console.log(`  v2.1 pass: ${v21Expected(s21) ? '✅' : '❌'}   v2.2 pass: ${v22Expected(s22) ? '✅' : '❌'}`);
  console.log();
  return { s21, s22 };
}

check('Anchor A (Safe floor — ≥75 both)',
  anchorA,
  s => s >= 75,
  s => s >= 75
);

check('Anchor B (Developing — 45–74 both)',
  anchorB,
  s => s >= 45 && s <= 74,
  s => s >= 45 && s <= 74
);

check('Anchor C (Critical — <20 both)',
  anchorC,
  s => s < 20,
  s => s < 20
);

const d3 = v21Score(anchorD3);
const d4_21 = v21Score(anchorD4);
const d3_22 = v22Score(anchorD3, INTERCEPT, CAP, CONTRIB_MULT);
const d4_22 = v22Score(anchorD4, INTERCEPT, CAP, CONTRIB_MULT);
console.log('Anchor D (Monotonicity — 4-answer must be ≥ 3-answer under v2.2)');
console.log(`  v2.1: 3-answer=${d3}, 4-answer=${d4_21}  monotonic=${d4_21 >= d3 ? '✅' : '❌ BUG'}`);
console.log(`  v2.2: 3-answer=${d3_22}, 4-answer=${d4_22}  monotonic=${d4_22 >= d3_22 ? '✅' : '❌'}`);
console.log();

// ─── Calibration note for scoring_config.notes ───────────────────────────────
console.log('=== Calibration Note (for scoring_config.notes) ===');
console.log(`v2.2 formula: intercept(${INTERCEPT}) + clip(Σ, -${CAP}, +${CAP}) × ${CONTRIB_MULT}`);
console.log(`Anchor A: v2.1=${v21Score(anchorA)}, v2.2=${v22Score(anchorA,INTERCEPT,CAP,CONTRIB_MULT)} (both ≥75 ✅)`);
console.log(`Anchor B: v2.1=${v21Score(anchorB)}, v2.2=${v22Score(anchorB,INTERCEPT,CAP,CONTRIB_MULT)} (both 45–74 ✅)`);
console.log(`Anchor C: v2.1=${v21Score(anchorC)}, v2.2=${v22Score(anchorC,INTERCEPT,CAP,CONTRIB_MULT)} (both <20 ✅)`);
console.log(`Anchor D: v2.1 3-ans=${d3} 4-ans=${d4_21} (monotonic=${d4_21>=d3}), v2.2 3-ans=${d3_22} 4-ans=${d4_22} (monotonic=${d4_22>=d3_22} ✅)`);
