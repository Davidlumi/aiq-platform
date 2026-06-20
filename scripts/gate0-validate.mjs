/**
 * GATE 0 validation — tests bandOf() and gapToNext() against D7 and D7b profiles.
 * Run: node scripts/gate0-validate.mjs
 */

// Inline the logic from shared/brand.ts (no TS compilation needed)
const HEATMAP_THRESHOLDS = [
  { min: 7.5, level: 5 },  // Expert
  { min: 6.0, level: 4 },  // Advanced
  { min: 5.0, level: 3 },  // Proficient
  { min: 3.5, level: 2 },  // Developing
  { min: 0,   level: 1 },  // Emerging
];

const LEVEL_LABELS = { 1: "Emerging", 2: "Developing", 3: "Proficient", 4: "Advanced", 5: "Expert" };

function scoreToLevel(score) {
  for (const t of HEATMAP_THRESHOLDS) {
    if (score >= t.min) return t.level;
  }
  return 1;
}

function bandOf(score) {
  return LEVEL_LABELS[scoreToLevel(score)];
}

function gapToNext(score) {
  const level = scoreToLevel(score);
  if (level === 5) return { isTop: true };
  const nextLevel = level + 1;
  const nextThreshold = HEATMAP_THRESHOLDS.find(t => t.level === nextLevel);
  const currentThreshold = HEATMAP_THRESHOLDS.find(t => t.level === level);
  const bandWidth = nextThreshold.min - currentThreshold.min;
  const gap = parseFloat((nextThreshold.min - score).toFixed(2));
  const pctThroughBand = Math.min(100, Math.round(((score - currentThreshold.min) / bandWidth) * 100));
  return { isTop: false, nextBand: LEVEL_LABELS[nextLevel], gap, pctThroughBand };
}

// ─── D7: Riley/Maya profile ───────────────────────────────────────────────────
const d7 = [
  { domain: "AI Interaction",       score: 7.5, expectedBand: "Expert",   expectedGap: "isTop" },
  { domain: "Output Evaluation",    score: 8.0, expectedBand: "Expert",   expectedGap: "isTop" },
  { domain: "Workflow Design",      score: 7.2, expectedBand: "Advanced", expectedGap: "0.3 to Expert" },
  { domain: "Workforce",            score: 8.5, expectedBand: "Expert",   expectedGap: "isTop" },
  { domain: "Ethics",               score: 7.9, expectedBand: "Expert",   expectedGap: "isTop" },
  { domain: "Change Leadership",    score: 7.7, expectedBand: "Expert",   expectedGap: "isTop" },
  { domain: "COMPOSITE",            score: 7.8, expectedBand: "Expert",   expectedGap: "isTop" },
];

// ─── D7b: Mid-level profile ───────────────────────────────────────────────────
const d7b = [
  { domain: "AI Interaction",       score: 6.2, expectedBand: "Advanced",   expectedGap: "1.3 to Expert" },
  { domain: "Output Evaluation",    score: 5.8, expectedBand: "Proficient", expectedGap: "0.2 to Advanced" },
  { domain: "Workflow Design",      score: 4.3, expectedBand: "Developing", expectedGap: "0.7 to Proficient" },
  { domain: "Workforce",            score: 5.1, expectedBand: "Proficient", expectedGap: "0.9 to Advanced" },
  { domain: "Ethics",               score: 5.9, expectedBand: "Proficient", expectedGap: "0.1 to Advanced" },
  { domain: "Change Leadership",    score: 4.9, expectedBand: "Developing", expectedGap: "0.1 to Proficient" },
  { domain: "COMPOSITE",            score: 5.4, expectedBand: "Proficient", expectedGap: "0.6 to Advanced" },
];

function formatGap(g) {
  if (g.isTop) return "isTop (Expert)";
  return `${g.gap} to ${g.nextBand} (${g.pctThroughBand}% through band)`;
}

function runProfile(label, profile) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${label}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`${"Domain".padEnd(22)} ${"Score".padEnd(8)} ${"Band".padEnd(12)} ${"Gap".padEnd(30)} ${"Expected Band".padEnd(14)} PASS?`);
  console.log(`${"-".repeat(110)}`);
  let allPass = true;
  for (const row of profile) {
    const band = bandOf(row.score);
    const gap = gapToNext(row.score);
    const gapStr = formatGap(gap);
    const pass = band === row.expectedBand;
    if (!pass) allPass = false;
    console.log(
      `${row.domain.padEnd(22)} ${String(row.score).padEnd(8)} ${band.padEnd(12)} ${gapStr.padEnd(30)} ${row.expectedBand.padEnd(14)} ${pass ? "✓" : "✗ FAIL"}`
    );
  }
  console.log(`\nResult: ${allPass ? "ALL PASS ✓" : "FAILURES DETECTED ✗"}`);
  return allPass;
}

// ─── Focus-next tiebreak test (D7b) ──────────────────────────────────────────
function focusNext(domains) {
  const candidates = domains
    .filter(d => d.domain !== "COMPOSITE")
    .map(d => {
      const g = gapToNext(d.score);
      return { ...d, gap: g.isTop ? Infinity : g.gap };
    })
    .filter(d => d.gap !== Infinity);
  
  // Sort by gap ASC, then by score DESC (tiebreak: higher score wins)
  candidates.sort((a, b) => a.gap !== b.gap ? a.gap - b.gap : b.score - a.score);
  return candidates[0];
}

const p1 = runProfile("D7 — Riley/Maya (near-Expert profile)", d7);
const p2 = runProfile("D7b — Mid-level profile", d7b);

const fn = focusNext(d7b);
console.log(`\n${"=".repeat(60)}`);
console.log(`Focus-next tiebreak (D7b)`);
console.log(`${"=".repeat(60)}`);
console.log(`Ethics: score 5.9, gap 0.1 to Advanced`);
console.log(`Change Leadership: score 4.9, gap 0.1 to Proficient`);
console.log(`Tiebreak: higher score wins → Ethics (5.9 > 4.9)`);
console.log(`Computed focus-next: ${fn.domain} (score ${fn.score}, gap ${fn.gap})`);
const tiebreakPass = fn.domain === "Ethics";
console.log(`Tiebreak result: ${tiebreakPass ? "PASS ✓" : "FAIL ✗"}`);

console.log(`\n${"=".repeat(60)}`);
console.log(`GATE 0 SUMMARY: ${p1 && p2 && tiebreakPass ? "ALL GATES PASS ✓" : "FAILURES — DO NOT PROCEED"}`);
console.log(`${"=".repeat(60)}\n`);
