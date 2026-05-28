/**
 * D1 — Reward Value Engine Verification for DFS Pilot
 * 
 * Runs the reward business case engine with the 8 flagship reward initiatives
 * for a DFS-shaped retail profile and dumps the full financial model.
 * 
 * DFS profile:
 *   - Sector: retail
 *   - Headcount: 11,000
 *   - Payroll: £320m (avg £29k/head — UK retail)
 *   - Annual revenue: £2.1bn
 *   - Reward team: 8 FTE
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

// Load the reward initiative library and business case engine via tsx
import { execSync } from 'child_process';

const result = execSync(`cd /home/ubuntu/aiq-platform && npx tsx -e "
import { REWARD_INITIATIVE_LIBRARY } from './shared/rewardInitiativeLibrary';
import { computeBusinessCase, buildPortfolioRollup, buildBusinessCaseSummary } from './server/services/rewardBusinessCaseEngine';

// DFS profile
const profile = {
  headcount: 11000,
  payrollGbp: 320_000_000,
  annualRevenueGbp: 2_100_000_000,
  sector: 'retail',
  rewardTeamFte: 8,
  companyName: 'DFS Furniture plc',
};

// The 8 flagship reward initiatives from the brief
const flagshipIds = [
  'ai_compensation_recommendation_engine',
  'ai_driven_merit_cycle_orchestration',
  'ai_pay_equity_continuous_monitoring',
  'ai_multi_characteristic_pay_gap_reporting',
  'ai_pay_band_design',
  'ai_reward_operations_assistant',
  'ai_bonus_pool_optimisation',
  'ai_sales_compensation_plan_design',
];

const initiatives = REWARD_INITIATIVE_LIBRARY.filter(i => flagshipIds.includes(i.id));
console.log('Initiatives found:', initiatives.length, '/', flagshipIds.length);

if (initiatives.length !== flagshipIds.length) {
  const missing = flagshipIds.filter(id => !initiatives.find(i => i.id === id));
  console.log('Missing IDs:', missing);
}

// Compute per-initiative business cases
const perInitiative = initiatives.map(init => {
  const bc = computeBusinessCase(init, profile);
  return bc;
});

// Build portfolio rollup
const rollup = buildPortfolioRollup(perInitiative, profile);

// Build summary
const summary = buildBusinessCaseSummary(rollup, perInitiative, profile, {
  visionText: 'Build a data-led, AI-augmented reward function that delivers fair, competitive, and transparent pay across DFS\\'s 11,000-person workforce.',
  strategyShifts: [
    { title: 'From manual pay benchmarking to AI-driven market intelligence' },
    { title: 'From annual merit cycles to continuous pay equity monitoring' },
    { title: 'From opaque pay decisions to explainable, auditable reward' },
  ],
  confirmedPrincipleTitles: ['Pay equity at source', 'Transparency by design', 'Data-led decisions'],
});

// Dump full results
console.log('\\n=== D1: DFS REWARD VALUE ENGINE RESULTS ===');
console.log('Profile:', JSON.stringify(profile, null, 2));
console.log('\\n--- PER-INITIATIVE BREAKDOWN ---');
perInitiative.forEach((bc, idx) => {
  const init = initiatives[idx];
  console.log('\\n' + init.title);
  console.log('  Scenario:', bc.scenario);
  console.log('  Gross Value 3yr:', bc.grossValue3yr.toLocaleString('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:0}));
  console.log('  Net Value 3yr:', bc.netValue3yr.toLocaleString('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:0}));
  console.log('  TCO 3yr:', bc.tco3yr.toLocaleString('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:0}));
  console.log('  Annual Value:', bc.annualValue.toLocaleString('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:0}));
  console.log('  Payback (months):', bc.paybackMonths ?? 'beyond 3yr window');
  console.log('  ROI 3yr:', bc.roi3yr != null ? (bc.roi3yr * 100).toFixed(0) + '%' : 'n/a');
  const ratio = bc.tco3yr > 0 ? (bc.netValue3yr / bc.tco3yr).toFixed(1) : 'n/a';
  console.log('  Value/Cost Ratio:', ratio + 'x');
});

console.log('\\n--- PORTFOLIO ROLLUP (CONSERVATIVE / CENTRAL / OPTIMISTIC) ---');
['conservative', 'central', 'optimistic'].forEach(s => {
  const r = rollup[s];
  console.log('\\n' + s.toUpperCase());
  console.log('  Gross Value 3yr:', r.grossValue3yr.toLocaleString('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:0}));
  console.log('  Overlap Discount:', r.overlapDiscountTotal.toLocaleString('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:0}));
  console.log('  Net Value 3yr:', r.netValue3yr.toLocaleString('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:0}));
  console.log('  TCO 3yr:', r.tco3yr.toLocaleString('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:0}));
  console.log('  Net Benefit 3yr:', r.netBenefit3yr.toLocaleString('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:0}));
  console.log('  Annual Value:', r.annualValue.toLocaleString('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:0}));
  console.log('  Payback (months):', r.paybackMonths ?? 'beyond 3yr window');
  console.log('  ROI 3yr:', r.roi3yr != null ? (r.roi3yr * 100).toFixed(0) + '%' : 'n/a');
});

console.log('\\n--- SUMMARY ---');
console.log(JSON.stringify(summary.financials, null, 2));
console.log('\\nRecommended scenario:', summary.recommendedScenario);
if (summary.investmentAsRevenuePercent) {
  console.log('Investment as % of revenue:', summary.investmentAsRevenuePercent);
}
" 2>&1`, { encoding: 'utf8' });

console.log(result);
process.exit(0);
