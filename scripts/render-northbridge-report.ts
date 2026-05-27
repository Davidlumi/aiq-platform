/**
 * Render the Northbridge board report to HTML and verify all figures
 * match the golden master exactly.
 *
 * Northbridge locked figures (central):
 *   TCO 3yr:         £7,146,469
 *   Net value 3yr:   £12,964,485
 *   Net benefit 3yr: £5,818,016
 *   ROI:             81%
 *   Payback:         20 months
 *   Overlap:         £1,758,476
 *
 * Conservative:  ROI = −5%,  net benefit = −£269,295
 * Optimistic:    ROI = 133%, net benefit = £11,905,335
 */

import { writeFileSync } from "fs";
import { computeBusinessCase } from "../server/services/rewardBusinessCaseEngine";
import type { AssembledReport } from "../server/services/rewardOutputs";
import type { Audience } from "../server/services/rewardOutputs";

// ── Fixture ───────────────────────────────────────────────────────────────────
const MAYA_IDS = [
  "ai_compensation_recommendation_engine",
  "ai_driven_merit_cycle_orchestration",
  "ai_pay_equity_continuous_monitoring",
  "ai_multi_characteristic_pay_gap_reporting",
  "ai_pay_band_design",
  "ai_reward_operations_assistant",
  "ai_bonus_pool_optimisation",
  "ai_sales_compensation_plan_design",
];

const model = computeBusinessCase(
  MAYA_IDS,
  { sector: "financial_services", totalEmployeeHeadcount: 8_000, totalPayrollGbp: 95_000_000 },
  {},
  {}
);

// ── Verify figures ────────────────────────────────────────────────────────────
const LOCKED = {
  central: { tco3yr: 7_146_469, netValue3yr: 12_964_485, netBenefit3yr: 5_818_016, roi3yr: 0.81, paybackMonths: 20, overlapDiscountTotal: 1_758_476 },
  conservative: { roi3yr: -0.05, netBenefit3yr: -269_295 },
  optimistic: { roi3yr: 1.33, netBenefit3yr: 11_905_335 },
};

let errors: string[] = [];
function check(label: string, got: number | null, want: number | null) {
  if (got !== want) errors.push(`  ✗ ${label}: got ${got}, want ${want}`);
  else console.log(`  ✓ ${label}: ${got}`);
}

console.log("\n=== FIGURE VERIFICATION ===");
check("central.tco3yr",             model.rollup.central.tco3yr,             LOCKED.central.tco3yr);
check("central.netValue3yr",        model.rollup.central.netValue3yr,        LOCKED.central.netValue3yr);
check("central.netBenefit3yr",      model.rollup.central.netBenefit3yr,      LOCKED.central.netBenefit3yr);
check("central.roi3yr",             model.rollup.central.roi3yr,             LOCKED.central.roi3yr);
check("central.paybackMonths",      model.rollup.central.paybackMonths,      LOCKED.central.paybackMonths);
check("central.overlapDiscountTotal", model.rollup.central.overlapDiscountTotal, LOCKED.central.overlapDiscountTotal);
check("conservative.roi3yr",        model.rollup.conservative.roi3yr,        LOCKED.conservative.roi3yr);
check("conservative.netBenefit3yr", model.rollup.conservative.netBenefit3yr, LOCKED.conservative.netBenefit3yr);
check("optimistic.roi3yr",          model.rollup.optimistic.roi3yr,          LOCKED.optimistic.roi3yr);
check("optimistic.netBenefit3yr",   model.rollup.optimistic.netBenefit3yr,   LOCKED.optimistic.netBenefit3yr);

if (errors.length > 0) {
  console.error("\nFIGURE MISMATCHES DETECTED:");
  errors.forEach(e => console.error(e));
  process.exit(1);
}

console.log("\n✓ All figures match the golden master exactly.\n");

// ── Build a minimal AssembledReport for rendering ────────────────────────────
const initiatives = model.lines.map(l => ({
  id: l.initiativeId,
  title: l.title,
  shortDescription: "",
  fullDescription: "",
  subDomain: l.subDomain,
  phase: l.phase,
  complexity: "medium",
  primaryValueType: l.primaryValueType,
  principlesAlignment: [],
  risks: [],
  tco3yrCentral: l.tco3yrCentral,
  value3yrCentral: l.value3yrCentral,
  netBenefit3yrCentral: l.value3yrCentral - l.tco3yrCentral,
}));

const report: AssembledReport = {
  companyName: "Northbridge Financial",
  sector: "Financial Services",
  ownershipStructure: null,
  headcount: 8_000,
  annualPayrollGbp: 95_000_000,
  annualRevenueGbp: null,
  visionText: "To make Northbridge Financial's reward function a strategic enabler of AI-powered talent decisions — building the capability, tools, and governance needed to compete in a data-driven financial services landscape.",
  strategicShifts: [
    { id: "1", text: "From reactive pay administration to proactive, AI-augmented compensation intelligence." },
    { id: "2", text: "From annual merit cycles to continuous, data-driven pay equity monitoring." },
    { id: "3", text: "From manual pay band design to AI-assisted market-aligned structure optimisation." },
  ],
  principles: [
    { text: "Transparency first: every AI recommendation must be explainable to employees and regulators." },
    { text: "Human in the loop: AI augments reward decisions, it does not replace them." },
    { text: "Equity by design: pay equity monitoring is a non-negotiable foundation, not an afterthought." },
  ],
  wontDos: [
    { text: "We will not use AI to set individual pay without human review and approval." },
    { text: "We will not deploy AI tools that cannot be audited for bias." },
  ],
  primaryTrigger: "regulatory_compliance",
  selectedInitiativeIds: MAYA_IDS,
  initiatives,
  model,
  recommendedScenario: "central",
  stage7Narratives: {
    execSummary: null,
    investmentRationale: null,
    valueNarrative: null,
    riskAssumptions: null,
  },
  sections: [],
  charts: {
    portfolioByPhase: [],
    valueByCategory: [],
    costVsValue: [],
    paybackTimeline: [],
    investmentByPhase: [],
  },
  developmentPlans: [],
  stageCompleteness: {
    stage1: true, stage2: true, stage3: true, stage4: true,
    stage5: true, stage6: true, stage7: true, stage8: false, stage9: false,
  },
  assembledAt: Date.now(),
};

// ── Inline the buildPrintHtml logic (copy from client for server-side rendering)
function fmtGBP(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}£${Math.round(abs / 1_000).toLocaleString()}k`;
  return `${sign}£${Math.round(abs).toLocaleString()}`;
}
function fmtROI(r: number | null): string {
  if (r === null) return "N/A";
  return `${r >= 0 ? "" : "−"}${Math.abs(Math.round(r * 100))}%`;
}
function fmtPayback(m: number | null): string {
  if (m === null) return "No payback within 3 years";
  return `${m} months`;
}

const central = model.rollup.central;
const conservative = model.rollup.conservative;
const optimistic = model.rollup.optimistic;
const audience: Audience = "board";
const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const summaryText = `Northbridge Financial is proposing an eight-initiative Reward AI programme to transform its compensation and pay equity capabilities. The central-case business case delivers £${(central.netValue3yr / 1e6).toFixed(2)}M in adjusted 3-year value against a £${(central.tco3yr / 1e6).toFixed(2)}M investment — a net benefit of £${(central.netBenefit3yr / 1e6).toFixed(2)}M and ${fmtROI(central.roi3yr)} ROI, with payback in ${fmtPayback(central.paybackMonths)}. The board is asked to approve the programme and authorise Stage 1 (Foundation) delivery to begin in Q3 2026.`;

// Verify the summary contains the exact locked figures
const figureChecks = [
  { label: "summary contains net value £12.96M", ok: summaryText.includes("12.96") },
  { label: "summary contains investment £7.15M",  ok: summaryText.includes("7.15") },
  { label: "summary contains net benefit £5.82M", ok: summaryText.includes("5.82") },
  { label: "summary contains ROI 81%",             ok: summaryText.includes("81%") },
  { label: "summary contains payback 20 months",   ok: summaryText.includes("20 months") },
];
console.log("=== SUMMARY FIGURE CHECKS ===");
for (const fc of figureChecks) {
  if (fc.ok) console.log(`  ✓ ${fc.label}`);
  else { console.error(`  ✗ ${fc.label}`); errors.push(fc.label); }
}

if (errors.length > 0) {
  console.error("\nSUMMARY FIGURE CHECKS FAILED");
  process.exit(1);
}

// ── Write the HTML output ─────────────────────────────────────────────────────
// (Simplified inline render — the full buildPrintHtml is in the client)
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Northbridge Financial — Reward AI Strategy · Board</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #ffffff; color: #1e293b; font-size: 10px; line-height: 1.5; }
  .page { width: 210mm; min-height: 297mm; padding: 32px 40px 48px; position: relative; page-break-after: always; overflow: hidden; }
  .page:last-child { page-break-after: auto; }
  .cover-page { background: #0A1628; color: #ffffff; padding: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="page cover-page">
  <div style="height:6px;background:#2D6A5E;"></div>
  <div style="padding:48px 48px 0;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:56px;">
      <div style="background:#2D6A5E;color:#ffffff;font-size:13px;font-weight:800;padding:7px 13px;border-radius:6px;letter-spacing:0.06em;">AiQ</div>
      <div style="color:#94a3b8;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;">HR Capability Intelligence</div>
    </div>
    <div style="color:#C8A96E;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;margin-bottom:10px;">Board Strategy Pack</div>
    <div style="font-size:36px;font-weight:800;color:#ffffff;line-height:1.05;margin-bottom:8px;">Reward AI<br>People Strategy</div>
    <div style="height:3px;width:56px;background:#C8A96E;margin:22px 0;"></div>
    <div style="font-size:15px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">Northbridge Financial</div>
    <div style="font-size:10px;color:#94a3b8;">8 initiatives · ${date}</div>
    <div style="background:#0d2137;border-left:3px solid #C8A96E;border-radius:0 6px 6px 0;padding:18px 22px;margin-top:32px;">
      <div style="font-size:8px;color:#C8A96E;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;">Executive Summary</div>
      <div style="font-size:10px;color:#e2e8f0;line-height:1.7;">${summaryText}</div>
    </div>
    <div style="display:flex;gap:12px;margin-top:28px;">
      <div style="flex:1;background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid #C8A96E;border-radius:6px;padding:14px 16px;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:6px;">3yr Investment</div>
        <div style="font-size:20px;font-weight:800;color:#0A1628;">${fmtGBP(central.tco3yr)}</div>
        <div style="font-size:9px;color:#94a3b8;margin-top:4px;">Total cost of ownership</div>
      </div>
      <div style="flex:1;background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid #2D6A5E;border-radius:6px;padding:14px 16px;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:6px;">Net Value (central)</div>
        <div style="font-size:20px;font-weight:800;color:#0A1628;">${fmtGBP(central.netValue3yr)}</div>
        <div style="font-size:9px;color:#94a3b8;margin-top:4px;">Post overlap-discount</div>
      </div>
      <div style="flex:1;background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid #2D6A5E;border-radius:6px;padding:14px 16px;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:6px;">Net Benefit</div>
        <div style="font-size:20px;font-weight:800;color:#0A1628;">${fmtGBP(central.netBenefit3yr)}</div>
        <div style="font-size:9px;color:#94a3b8;margin-top:4px;">Value minus investment</div>
      </div>
      <div style="flex:1;background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid #0A1628;border-radius:6px;padding:14px 16px;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:6px;">ROI (central)</div>
        <div style="font-size:20px;font-weight:800;color:#0A1628;">${fmtROI(central.roi3yr)}</div>
        <div style="font-size:9px;color:#94a3b8;margin-top:4px;">Payback: ${fmtPayback(central.paybackMonths)}</div>
      </div>
    </div>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:24px;background:#050e1a;display:flex;align-items:center;justify-content:space-between;padding:0 40px;">
    <span style="font-size:8px;color:#C8A96E;font-weight:600;">CONFIDENTIAL · Northbridge Financial · Board · ${date}</span>
    <span style="font-size:8px;color:#94a3b8;">1</span>
  </div>
</div>

<!-- SECTION 2: FINANCIAL CASE -->
<div class="page">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #0A1628;">
    <div style="background:#0A1628;color:#C8A96E;font-size:10px;font-weight:800;padding:4px 10px;border-radius:4px;letter-spacing:0.1em;">02</div>
    <h2 style="font-size:14px;font-weight:800;color:#0A1628;margin:0;">Three-Scenario Financial Case</h2>
  </div>
  <p style="font-size:10px;color:#475569;margin-bottom:16px;">All figures are 3-year totals. The central scenario is the recommended planning baseline. The conservative case is presented honestly — including the downside — to give the board a complete picture.</p>
  <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:20px;">
    <thead>
      <tr style="background:#0A1628;">
        <th style="padding:10px 12px;text-align:left;color:#C8A96E;font-size:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Metric</th>
        <th style="padding:10px 12px;text-align:right;color:#94a3b8;font-size:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Conservative</th>
        <th style="padding:10px 12px;text-align:right;color:#ffffff;font-size:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">Central ★</th>
        <th style="padding:10px 12px;text-align:right;color:#94a3b8;font-size:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Optimistic</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#f8fafc;"><td style="padding:9px 12px;color:#334155;font-weight:600;">Gross Value (3yr)</td><td style="padding:9px 12px;text-align:right;color:#334155;">${fmtGBP(conservative.grossValue3yr)}</td><td style="padding:9px 12px;text-align:right;color:#0A1628;font-weight:700;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">${fmtGBP(central.grossValue3yr)}</td><td style="padding:9px 12px;text-align:right;color:#334155;">${fmtGBP(optimistic.grossValue3yr)}</td></tr>
      <tr><td style="padding:9px 12px;color:#334155;font-weight:600;">Overlap Discount</td><td style="padding:9px 12px;text-align:right;color:#64748b;">(${fmtGBP(conservative.overlapDiscountTotal)})</td><td style="padding:9px 12px;text-align:right;color:#64748b;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">(${fmtGBP(central.overlapDiscountTotal)})</td><td style="padding:9px 12px;text-align:right;color:#64748b;">(${fmtGBP(optimistic.overlapDiscountTotal)})</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:9px 12px;color:#334155;font-weight:600;">Adjusted Net Value</td><td style="padding:9px 12px;text-align:right;color:#334155;">${fmtGBP(conservative.netValue3yr)}</td><td style="padding:9px 12px;text-align:right;color:#0A1628;font-weight:700;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">${fmtGBP(central.netValue3yr)}</td><td style="padding:9px 12px;text-align:right;color:#334155;">${fmtGBP(optimistic.netValue3yr)}</td></tr>
      <tr><td style="padding:9px 12px;color:#334155;font-weight:600;">Total Investment (TCO)</td><td style="padding:9px 12px;text-align:right;color:#334155;">${fmtGBP(conservative.tco3yr)}</td><td style="padding:9px 12px;text-align:right;color:#0A1628;font-weight:700;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">${fmtGBP(central.tco3yr)}</td><td style="padding:9px 12px;text-align:right;color:#334155;">${fmtGBP(optimistic.tco3yr)}</td></tr>
      <tr style="background:#fef2f2;"><td style="padding:10px 12px;color:#0A1628;font-weight:800;">Net Benefit</td><td style="padding:10px 12px;text-align:right;font-weight:700;color:#dc2626;">${fmtGBP(conservative.netBenefit3yr)}</td><td style="padding:10px 12px;text-align:right;font-weight:800;color:#16a34a;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">${fmtGBP(central.netBenefit3yr)}</td><td style="padding:10px 12px;text-align:right;font-weight:700;color:#16a34a;">${fmtGBP(optimistic.netBenefit3yr)}</td></tr>
      <tr><td style="padding:9px 12px;color:#334155;font-weight:600;">ROI</td><td style="padding:9px 12px;text-align:right;color:#dc2626;font-weight:700;">${fmtROI(conservative.roi3yr)}</td><td style="padding:9px 12px;text-align:right;color:#0A1628;font-weight:800;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">${fmtROI(central.roi3yr)}</td><td style="padding:9px 12px;text-align:right;color:#334155;font-weight:700;">${fmtROI(optimistic.roi3yr)}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:9px 12px;color:#334155;font-weight:600;">Payback Period</td><td style="padding:9px 12px;text-align:right;color:#334155;">${fmtPayback(conservative.paybackMonths)}</td><td style="padding:9px 12px;text-align:right;color:#0A1628;font-weight:700;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">${fmtPayback(central.paybackMonths)}</td><td style="padding:9px 12px;text-align:right;color:#334155;">${fmtPayback(optimistic.paybackMonths)}</td></tr>
    </tbody>
  </table>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:0 6px 6px 0;padding:12px 16px;margin-bottom:16px;">
    <div style="font-size:9px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Conservative Downside — Board Note</div>
    <div style="font-size:10px;color:#7f1d1d;line-height:1.6;">The conservative scenario produces a negative net benefit of ${fmtGBP(conservative.netBenefit3yr)} (${fmtROI(conservative.roi3yr)} ROI). This reflects low-end value realisation combined with high-end costs. The board should note this is the pessimistic bound; the central case (${fmtROI(central.roi3yr)} ROI, ${fmtPayback(central.paybackMonths)} payback) is the recommended planning baseline. Mitigation: phased delivery with stage-gate reviews reduces exposure.</div>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:24px;background:#0A1628;display:flex;align-items:center;justify-content:space-between;padding:0 40px;">
    <span style="font-size:8px;color:#C8A96E;font-weight:600;">CONFIDENTIAL · Northbridge Financial · Board · ${date}</span>
    <span style="font-size:8px;color:#94a3b8;">2</span>
  </div>
</div>

<!-- SECTION 3: PORTFOLIO -->
<div class="page">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #0A1628;">
    <div style="background:#0A1628;color:#C8A96E;font-size:10px;font-weight:800;padding:4px 10px;border-radius:4px;letter-spacing:0.1em;">03</div>
    <h2 style="font-size:14px;font-weight:800;color:#0A1628;margin:0;">Initiative Portfolio & Sequencing</h2>
  </div>
  <p style="font-size:10px;color:#475569;margin-bottom:16px;">8 initiatives selected. Financial figures are central-scenario 3-year totals.</p>
  <table style="width:100%;border-collapse:collapse;font-size:9px;margin-bottom:16px;">
    <thead>
      <tr style="background:#0A1628;">
        <th style="padding:8px 10px;text-align:left;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">#</th>
        <th style="padding:8px 10px;text-align:left;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Initiative</th>
        <th style="padding:8px 10px;text-align:left;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Phase</th>
        <th style="padding:8px 10px;text-align:right;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">3yr TCO</th>
        <th style="padding:8px 10px;text-align:right;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">3yr Value</th>
        <th style="padding:8px 10px;text-align:right;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Net Benefit</th>
      </tr>
    </thead>
    <tbody>
      ${model.lines.map((l, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        <td style="padding:8px 10px;color:#64748b;">${l.number}</td>
        <td style="padding:8px 10px;color:#0A1628;font-weight:600;">${l.title}</td>
        <td style="padding:8px 10px;"><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:8px;font-weight:700;background:#e2e8f0;color:#334155;">${l.phase}</span></td>
        <td style="padding:8px 10px;text-align:right;color:#334155;">${fmtGBP(l.tco3yrCentral)}</td>
        <td style="padding:8px 10px;text-align:right;color:#334155;">${fmtGBP(l.value3yrCentral)}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;color:${l.value3yrCentral - l.tco3yrCentral >= 0 ? "#16a34a" : "#dc2626"};">${fmtGBP(l.value3yrCentral - l.tco3yrCentral)}</td>
      </tr>`).join("")}
      <tr style="background:#0A1628;">
        <td colspan="3" style="padding:9px 10px;color:#C8A96E;font-weight:800;font-size:9px;">Portfolio Total (central)</td>
        <td style="padding:9px 10px;text-align:right;color:#ffffff;font-weight:700;">${fmtGBP(central.tco3yr)}</td>
        <td style="padding:9px 10px;text-align:right;color:#ffffff;font-weight:700;">${fmtGBP(central.netValue3yr)}</td>
        <td style="padding:9px 10px;text-align:right;color:#86efac;font-weight:800;">${fmtGBP(central.netBenefit3yr)}</td>
      </tr>
    </tbody>
  </table>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 14px;">
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Overlap Discounts Applied</div>
    ${model.overlapDiscounts.map(d => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:9px;">
      <span style="color:#334155;font-weight:600;">${d.subDomain} (${Math.round(d.discountPct * 100)}% co-delivery discount)</span>
      <span style="color:#64748b;">${d.initiativeTitles.join(", ")} → <strong style="color:#0A1628;">(${fmtGBP(d.discountAmountCentral)})</strong></span>
    </div>`).join("")}
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:24px;background:#0A1628;display:flex;align-items:center;justify-content:space-between;padding:0 40px;">
    <span style="font-size:8px;color:#C8A96E;font-weight:600;">CONFIDENTIAL · Northbridge Financial · Board · ${date}</span>
    <span style="font-size:8px;color:#94a3b8;">3</span>
  </div>
</div>

<!-- SECTION 4: CAPABILITY GAP -->
<div class="page">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #0A1628;">
    <div style="background:#0A1628;color:#C8A96E;font-size:10px;font-weight:800;padding:4px 10px;border-radius:4px;letter-spacing:0.1em;">04</div>
    <h2 style="font-size:14px;font-weight:800;color:#0A1628;margin:0;">Capability Gap & Development Pathway</h2>
  </div>
  <p style="font-size:10px;color:#475569;margin-bottom:16px;">Derived from Stage 8 assessment data. Development plans are generated for people-dimensions with a confirmed gap.</p>
  <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:14px 16px;margin-bottom:16px;">
    <div style="font-size:9px;font-weight:700;color:#92400e;margin-bottom:4px;">Stage 8 not yet confirmed (Northbridge fixture)</div>
    <div style="font-size:10px;color:#78350f;">In a live deployment, this section would show the team capability levels, gaps, and development pathways derived from the Stage 8 assessment. Complete Stage 8 to populate this section.</div>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:24px;background:#0A1628;display:flex;align-items:center;justify-content:space-between;padding:0 40px;">
    <span style="font-size:8px;color:#C8A96E;font-weight:600;">CONFIDENTIAL · Northbridge Financial · Board · ${date}</span>
    <span style="font-size:8px;color:#94a3b8;">4</span>
  </div>
</div>

<!-- SECTION 5: STRATEGIC NARRATIVE -->
<div class="page">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #0A1628;">
    <div style="background:#0A1628;color:#C8A96E;font-size:10px;font-weight:800;padding:4px 10px;border-radius:4px;letter-spacing:0.1em;">05</div>
    <h2 style="font-size:14px;font-weight:800;color:#0A1628;margin:0;">Strategic Narrative</h2>
  </div>
  <div style="background:#f0fdf4;border-left:4px solid #2D6A5E;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:16px;">
    <div style="font-size:8px;font-weight:700;color:#2D6A5E;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Vision Statement</div>
    <div style="font-size:11px;font-style:italic;color:#0A1628;line-height:1.7;">"To make Northbridge Financial's reward function a strategic enabler of AI-powered talent decisions — building the capability, tools, and governance needed to compete in a data-driven financial services landscape."</div>
  </div>
  <div style="margin-bottom:16px;">
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Strategic Shifts</div>
    <div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;"><div style="width:6px;height:6px;border-radius:50%;background:#2D6A5E;flex-shrink:0;margin-top:4px;"></div><div style="font-size:10px;color:#334155;">From reactive pay administration to proactive, AI-augmented compensation intelligence.</div></div>
    <div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;"><div style="width:6px;height:6px;border-radius:50%;background:#2D6A5E;flex-shrink:0;margin-top:4px;"></div><div style="font-size:10px;color:#334155;">From annual merit cycles to continuous, data-driven pay equity monitoring.</div></div>
    <div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;"><div style="width:6px;height:6px;border-radius:50%;background:#2D6A5E;flex-shrink:0;margin-top:4px;"></div><div style="font-size:10px;color:#334155;">From manual pay band design to AI-assisted market-aligned structure optimisation.</div></div>
  </div>
  <div style="margin-bottom:16px;">
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Guiding Principles</div>
    <div style="background:#f8fafc;border-left:3px solid #C8A96E;border-radius:0 4px 4px 0;padding:8px 12px;margin-bottom:6px;font-size:10px;color:#334155;">Transparency first: every AI recommendation must be explainable to employees and regulators.</div>
    <div style="background:#f8fafc;border-left:3px solid #C8A96E;border-radius:0 4px 4px 0;padding:8px 12px;margin-bottom:6px;font-size:10px;color:#334155;">Human in the loop: AI augments reward decisions, it does not replace them.</div>
    <div style="background:#f8fafc;border-left:3px solid #C8A96E;border-radius:0 4px 4px 0;padding:8px 12px;margin-bottom:6px;font-size:10px;color:#334155;">Equity by design: pay equity monitoring is a non-negotiable foundation, not an afterthought.</div>
  </div>
  <div>
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Strategic Exclusions (Won't Do)</div>
    <div style="display:flex;align-items:flex-start;gap:10px;padding:5px 0;"><div style="background:#ef4444;color:#ffffff;width:14px;height:14px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0;margin-top:1px;">✕</div><div style="font-size:10px;color:#475569;">We will not use AI to set individual pay without human review and approval.</div></div>
    <div style="display:flex;align-items:flex-start;gap:10px;padding:5px 0;"><div style="background:#ef4444;color:#ffffff;width:14px;height:14px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0;margin-top:1px;">✕</div><div style="font-size:10px;color:#475569;">We will not deploy AI tools that cannot be audited for bias.</div></div>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:24px;background:#0A1628;display:flex;align-items:center;justify-content:space-between;padding:0 40px;">
    <span style="font-size:8px;color:#C8A96E;font-weight:600;">CONFIDENTIAL · Northbridge Financial · Board · ${date}</span>
    <span style="font-size:8px;color:#94a3b8;">5</span>
  </div>
</div>

<!-- SECTION 6: METHODOLOGY -->
<div class="page">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #0A1628;">
    <div style="background:#0A1628;color:#C8A96E;font-size:10px;font-weight:800;padding:4px 10px;border-radius:4px;letter-spacing:0.1em;">06</div>
    <h2 style="font-size:14px;font-weight:800;color:#0A1628;margin:0;">Methodology & Assumptions</h2>
  </div>
  <p style="font-size:10px;color:#475569;margin-bottom:16px;">This section explains how the financial figures in this report are derived. Boards trust numbers that show their working.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 16px;">
      <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Value Methodology</div>
      <ul style="font-size:9.5px;color:#334155;line-height:1.8;padding-left:16px;margin:0;">
        <li>Initiative values calibrated from UK 2025–26 market benchmarks by sub-domain.</li>
        <li>Each initiative carries a low / central / high value range.</li>
        <li>Overlap discounts (15–25%) applied where initiatives share delivery infrastructure.</li>
        <li>All values are gross 3-year totals before investment deduction.</li>
      </ul>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 16px;">
      <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Cost Methodology</div>
      <ul style="font-size:9.5px;color:#334155;line-height:1.8;padding-left:16px;margin:0;">
        <li>TCO = Year 1 implementation + 2 × annual ongoing cost.</li>
        <li>Costs scaled to organisation size (headcount and payroll) and sector.</li>
        <li>Internal resource (programme management) included in TCO.</li>
        <li>Programme funding shown separately where applicable.</li>
      </ul>
    </div>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 16px;margin-bottom:16px;">
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Scenario Definitions</div>
    <table style="width:100%;border-collapse:collapse;font-size:9px;">
      <thead><tr style="background:#e2e8f0;"><th style="padding:6px 8px;text-align:left;font-weight:700;color:#334155;">Scenario</th><th style="padding:6px 8px;text-align:left;font-weight:700;color:#334155;">Cost</th><th style="padding:6px 8px;text-align:left;font-weight:700;color:#334155;">Value</th><th style="padding:6px 8px;text-align:right;font-weight:700;color:#334155;">Net Benefit</th><th style="padding:6px 8px;text-align:right;font-weight:700;color:#334155;">ROI</th></tr></thead>
      <tbody>
        <tr><td style="padding:6px 8px;color:#334155;font-weight:600;">Conservative</td><td style="padding:6px 8px;color:#475569;">High-end</td><td style="padding:6px 8px;color:#475569;">Low-end</td><td style="padding:6px 8px;text-align:right;color:#dc2626;font-weight:700;">${fmtGBP(conservative.netBenefit3yr)}</td><td style="padding:6px 8px;text-align:right;color:#dc2626;font-weight:700;">${fmtROI(conservative.roi3yr)}</td></tr>
        <tr style="background:#f1f5f9;"><td style="padding:6px 8px;color:#334155;font-weight:600;">Central ★</td><td style="padding:6px 8px;color:#475569;">Midpoint</td><td style="padding:6px 8px;color:#475569;">Midpoint</td><td style="padding:6px 8px;text-align:right;color:#16a34a;font-weight:700;">${fmtGBP(central.netBenefit3yr)}</td><td style="padding:6px 8px;text-align:right;color:#16a34a;font-weight:700;">${fmtROI(central.roi3yr)}</td></tr>
        <tr><td style="padding:6px 8px;color:#334155;font-weight:600;">Optimistic</td><td style="padding:6px 8px;color:#475569;">Low-end</td><td style="padding:6px 8px;color:#475569;">High-end</td><td style="padding:6px 8px;text-align:right;color:#16a34a;font-weight:700;">${fmtGBP(optimistic.netBenefit3yr)}</td><td style="padding:6px 8px;text-align:right;color:#16a34a;font-weight:700;">${fmtROI(optimistic.roi3yr)}</td></tr>
      </tbody>
    </table>
  </div>
  <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-bottom:16px;">
    <div style="font-size:8px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Important Caveats</div>
    <div style="font-size:9.5px;color:#78350f;line-height:1.7;">These figures are indicative estimates based on calibrated benchmarks and Northbridge Financial's profile (8,000 employees, £95M payroll, Financial Services). Actual outcomes will depend on vendor selection, implementation quality, change management effectiveness, and adoption rates. All figures exclude VAT. This report does not constitute financial advice.</div>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;">
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Report Metadata</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:9px;color:#475569;">
      <div><strong style="color:#334155;">Generated:</strong> ${date}</div>
      <div><strong style="color:#334155;">Audience:</strong> Board</div>
      <div><strong style="color:#334155;">Initiatives:</strong> 8</div>
      <div><strong style="color:#334155;">Overlap groups:</strong> ${model.overlapDiscounts.length}</div>
      <div><strong style="color:#334155;">Overlap discount (central):</strong> ${fmtGBP(central.overlapDiscountTotal)}</div>
      <div><strong style="color:#334155;">Stage 7 confirmed:</strong> Yes</div>
    </div>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:24px;background:#0A1628;display:flex;align-items:center;justify-content:space-between;padding:0 40px;">
    <span style="font-size:8px;color:#C8A96E;font-weight:600;">CONFIDENTIAL · Northbridge Financial · Board · ${date}</span>
    <span style="font-size:8px;color:#94a3b8;">6</span>
  </div>
</div>

</body>
</html>`;

writeFileSync("/tmp/northbridge-board-report.html", html, "utf-8");
console.log("\n✓ Board report written to /tmp/northbridge-board-report.html");
console.log("\n=== ALL CHECKS PASSED ===");
