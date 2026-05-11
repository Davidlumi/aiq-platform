/**
 * pdfBoardPackHtml.ts
 * HTML-to-PDF board pack generator using Puppeteer.
 * Produces a polished A4 board-quality PDF with AI commentary.
 */

import puppeteer from "puppeteer";
import { getDb, getTenantById } from "./db";
import { ailOrgContext, users, assessmentSessions, assessmentScores } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  calculateCostEnvelope,
  calculateValueEnvelope,
  evaluateRiskRules,
  type ValueEnvelopeInitiative,
  type RiskRuleMatch,
} from "./strategyEngine";
import {
  getAllInitiatives,
  resolveInitiativeIds,
  getLibraryMeta,
  type Initiative,
} from "./contentLibrary";
import { invokeLLM } from "./_core/llm";
import { DOMAIN_KEYS, DOMAIN_LABELS } from "../shared/dashboard";
import type { DomainKey } from "../shared/brand";
const BUSINESS_LABELS: Record<number, string> = {
  1: "Cautious", 2: "Exploratory", 3: "Progressive", 4: "Ambitious", 5: "Transformative",
};
const PEOPLE_LABELS: Record<number, string> = {
  1: "Followers", 2: "Adopters", 3: "Practitioners", 4: "Champions", 5: "Innovators",
};

function fmtGBP(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1_000) return `£${Math.round(n / 1_000)}k`;
  return `£${Math.round(n)}`;
}

async function generateCommentary(prompt: string): Promise<string> {
  try {
    const resp = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a senior HR transformation consultant writing commentary for a board-level strategy presentation. Write in a professional, concise, and confident tone. Avoid jargon. Be specific. Maximum 3 sentences.",
        },
        { role: "user", content: prompt },
      ],
    });
    return (resp as any)?.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

// ─── HTML generation helpers ─────────────────────────────────────────────────

function scoreColour(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function severityColour(s: string): string {
  if (s === "very_high" || s === "high") return "#ef4444";
  if (s === "medium") return "#f59e0b";
  return "#22c55e";
}

function progressBarHtml(label: string, current: number | null, target: number | null): string {
  const pct = current !== null ? Math.min(100, current) : 0;
  const targetPct = target !== null ? Math.min(100, target) : null;
  const col = current !== null ? scoreColour(current) : "#64748b";
  return `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
        <span style="font-size:8pt;color:#334155;font-weight:600;">${label}</span>
        <span style="font-size:8pt;font-weight:700;color:${col};">${current !== null ? current : "—"}</span>
      </div>
      <div style="position:relative;height:8px;background:#e2e8f0;border-radius:4px;overflow:visible;">
        <div style="height:8px;width:${pct}%;background:${col};border-radius:4px;transition:width 0.3s;"></div>
        ${targetPct !== null ? `<div style="position:absolute;top:-3px;left:${targetPct}%;width:2px;height:14px;background:#C8A96E;border-radius:1px;"></div>` : ""}
      </div>
      ${targetPct !== null ? `<div style="font-size:6.5pt;color:#94a3b8;margin-top:2px;">Target: ${target}</div>` : ""}
    </div>`;
}

function kpiCardHtml(label: string, value: string, sub: string, colour: string): string {
  return `
    <div style="flex:1;background:#f8fafc;border-radius:8px;padding:14px 12px 10px;border-top:3px solid ${colour};min-width:0;">
      <div style="font-size:6.5pt;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${label}</div>
      <div style="font-size:18pt;font-weight:800;color:${colour};line-height:1;">${value}</div>
      ${sub ? `<div style="font-size:7pt;color:#94a3b8;margin-top:4px;">${sub}</div>` : ""}
    </div>`;
}

function aiCommentaryHtml(text: string): string {
  if (!text) return "";
  return `
    <div style="background:#f0f9f6;border-left:3px solid #2D6A5E;border-radius:0 6px 6px 0;padding:10px 14px;margin:12px 0;page-break-inside:avoid;">
      <div style="font-size:6.5pt;color:#2D6A5E;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">⚡ AI Analysis</div>
      <div style="font-size:8.5pt;color:#1e293b;line-height:1.5;">${text}</div>
    </div>`;
}

function sectionLabelHtml(text: string): string {
  return `<div style="background:#0A1628;color:#C8A96E;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:5px 10px;border-radius:4px;margin:14px 0 8px;">${text}</div>`;
}

function slideHeaderHtml(num: string, title: string, subtitle: string, colour: string): string {
  return `
    <div style="background:#0A1628;padding:18px 28px 14px;margin:-28px -28px 20px;border-top:4px solid ${colour};">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="background:${colour};color:#0A1628;font-size:11pt;font-weight:800;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${num}</div>
        <div>
          <div style="font-size:16pt;font-weight:800;color:#ffffff;line-height:1.1;">${title}</div>
          <div style="font-size:8pt;color:${colour};margin-top:2px;">${subtitle}</div>
        </div>
      </div>
    </div>`;
}

function footerHtml(orgName: string, date: string, libVer: string): string {
  return `
    <div style="position:fixed;bottom:0;left:0;right:0;height:28px;background:#0A1628;display:flex;align-items:center;justify-content:space-between;padding:0 28px;">
      <span style="font-size:6pt;color:#C8A96E;">AiQ HR Capability Intelligence · ${orgName} · ${date} · Library v${libVer} · CONFIDENTIAL</span>
      <span style="font-size:6pt;color:#ffffff;" class="pagenum"></span>
    </div>`;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateBoardPackPDFHtml(userId: string, tenantId: string): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // ── Load org context ──────────────────────────────────────────────────────
  const orgCtxRows = await db.select().from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, tenantId))
    .limit(1);
  const orgCtx = orgCtxRows[0] ?? null;

  const tenant = await getTenantById(tenantId);
  const orgName = tenant?.name ?? "Your Organisation";

  const businessAmbitionLevel: number = (orgCtx as any)?.businessAmbitionLevel ?? 3;
  const peopleAmbitionLevel: number   = (orgCtx as any)?.peopleAmbitionLevel ?? 3;
  const sector: string | null         = (orgCtx as any)?.sector ?? null;
  const subSector: string | null      = (orgCtx as any)?.subSector ?? null;
  const headcount: number | null      = (orgCtx as any)?.headcount ?? null;
  const hrFteCount: number | null     = (orgCtx as any)?.hrFteCount ?? null;
  const orgSize: string               = (orgCtx as any)?.orgSize ?? "medium";
  const visionStatement: string | null = (orgCtx as any)?.visionStatement ?? null;
  const strategyNarrative: string | null = (orgCtx as any)?.strategyNarrative ?? null;
  const ambitionTargetScore: number | null = (orgCtx as any)?.ambitionTargetScore ?? null;
  const ambitionTargetDate: string | null  = (orgCtx as any)?.ambitionTargetDate ?? null;
  const libVersion: string | null          = (orgCtx as any)?.libVersion ?? null;

  let guidingPrinciples: Array<{ title: string; description: string }> = [];
  let wontDoItems: string[] = [];
  let selectedInitiativeIds: string[] = [];
  let operationalBaseline: Record<string, unknown> = {};
  let structuredInputs: Record<string, unknown> = {};
  let domainTargets: Record<DomainKey, number> = {} as Record<DomainKey, number>;

  try { const r = (orgCtx as any)?.guidingPrinciplesJson; if (r) guidingPrinciples = typeof r === "string" ? JSON.parse(r) : r; } catch {}
  try { const r = (orgCtx as any)?.wontDoJson; if (r) wontDoItems = typeof r === "string" ? JSON.parse(r) : r; } catch {}
  try { const r = (orgCtx as any)?.selectedInitiativesJson; if (r) selectedInitiativeIds = typeof r === "string" ? JSON.parse(r) : r; } catch {}
  try { const r = (orgCtx as any)?.operationalBaselineJson; if (r) operationalBaseline = typeof r === "string" ? JSON.parse(r) : r; } catch {}
  try { const r = (orgCtx as any)?.structuredInputsJson; if (r) structuredInputs = typeof r === "string" ? JSON.parse(r) : r; } catch {}
  try {
    const r = (orgCtx as any)?.domainTargetsJson;
    if (r) domainTargets = typeof r === "string" ? JSON.parse(r) : r;
  } catch {}
  if (!Object.keys(domainTargets).length) {
    const base = Math.round((businessAmbitionLevel * 0.55 + peopleAmbitionLevel * 0.45) * 20);
    for (const dk of DOMAIN_KEYS) domainTargets[dk] = Math.max(20, Math.min(100, base));
  }

  // ── Assessment data ───────────────────────────────────────────────────────
  const allUsers = await db.select({
    id: users.id,
    roleFamily: users.roleFamily,
    jobFunction: users.jobFunction,
    scoreBreakdownJson: assessmentScores.scoreBreakdownJson,
    overallScore: assessmentScores.overallScore,
  })
  .from(users)
  .innerJoin(assessmentSessions, and(
    eq(assessmentSessions.userId, users.id),
    eq(assessmentSessions.tenantId, users.tenantId),
    eq(assessmentSessions.state, "completed"),
  ))
  .innerJoin(assessmentScores, eq(assessmentScores.sessionId, assessmentSessions.id))
  .where(eq(users.tenantId, tenantId))
  .orderBy(desc(assessmentSessions.completedAt));

  const seenUsers = new Set<string>();
  const userData: { id: string; overallScore: number; domainScores: Record<DomainKey, number> }[] = [];
  for (const u of allUsers) {
    if (seenUsers.has(u.id)) continue;
    seenUsers.add(u.id);
    const domainScores: Record<DomainKey, number> = {} as Record<DomainKey, number>;
    try {
      const raw = u.scoreBreakdownJson;
      const breakdown = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
      const caps = (breakdown as any).capabilityScores ?? breakdown;
      for (const dk of DOMAIN_KEYS) domainScores[dk] = (caps as any)[dk] ?? 50;
    } catch { for (const dk of DOMAIN_KEYS) domainScores[dk] = 50; }
    if (u.overallScore !== null) {
      userData.push({ id: u.id, overallScore: parseFloat(String(u.overallScore)), domainScores });
    }
  }
  const assessedCount = userData.length;
  const functionAvg = assessedCount > 0 ? Math.round(userData.reduce((s, u) => s + u.overallScore, 0) / assessedCount) : null;
  const domainAvgs: Record<DomainKey, number | null> = {} as Record<DomainKey, number | null>;
  for (const dk of DOMAIN_KEYS) {
    const vals = userData.map(u => u.domainScores[dk]);
    domainAvgs[dk] = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  }
  const gap = (functionAvg !== null && ambitionTargetScore !== null) ? ambitionTargetScore - functionAvg : null;

  // ── Initiatives & financials ──────────────────────────────────────────────
  const allInitiatives = getAllInitiatives();
  const initiativeMap = new Map(allInitiatives.map((i: Initiative) => [i.initiative_id, i]));
  const resolvedIds = resolveInitiativeIds(selectedInitiativeIds);
  const selectedInits = resolvedIds.map((id: string) => initiativeMap.get(id)).filter(Boolean) as Initiative[];

  const ambitionTier: "cautious" | "progressive" | "transformative" =
    businessAmbitionLevel >= 4 ? "transformative" : businessAmbitionLevel >= 3 ? "progressive" : "cautious";
  const orgSizeSafe: "small" | "medium" | "large" | "enterprise" =
    ["small", "medium", "large", "enterprise"].includes(orgSize) ? orgSize as any : "medium";

  const costEnvelope   = selectedInits.length > 0 ? calculateCostEnvelope(selectedInitiativeIds, orgSizeSafe, ambitionTier) : null;
  const riskMatches    = selectedInits.length > 0 ? evaluateRiskRules({ selectedInitiativeIds, orgSize: orgSizeSafe, ambitionTier, hasExecSponsor: false, hasDataGovernanceInitiative: false }) : [];
  const valueEnvelope  = selectedInits.length > 0 ? calculateValueEnvelope(selectedInits, operationalBaseline, 36) : null;
  const financialModel = valueEnvelope?.financial_model ?? null;
  const reinvestment   = valueEnvelope?.reinvestment_plan ?? null;
  const ceoSponsorship = valueEnvelope?.ceo_sponsorship ?? null;

  const libMeta = getLibraryMeta();
  const libVer  = libVersion ?? libMeta.version;
  const reportDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const targetDateStr = ambitionTargetDate ? new Date(ambitionTargetDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "target date";

  // ── AI Commentary (parallel) ──────────────────────────────────────────────
  const [
    commentaryCover,
    commentaryAmbition,
    commentaryVision,
    commentaryCapability,
    commentaryPlan,
    commentaryInvestment,
    commentaryRisk,
    commentaryValue,
    commentaryFinancial,
    commentaryMeasurement,
  ] = await Promise.all([
    generateCommentary(`Write a 3-sentence executive summary for a board presentation. Organisation: ${orgName}. Sector: ${sector ?? "not specified"}. Headcount: ${headcount ?? "not specified"}. Business AI ambition: ${BUSINESS_LABELS[businessAmbitionLevel]}. People AI ambition: ${PEOPLE_LABELS[peopleAmbitionLevel]}. ${selectedInits.length} initiatives selected. ${assessedCount} staff assessed. Current capability average: ${functionAvg ?? "not assessed"}. Target: ${ambitionTargetScore ?? "not set"}. ${costEnvelope ? `Investment range: ${fmtGBP(costEnvelope.totalMin * 1000)} to ${fmtGBP(costEnvelope.totalMax * 1000)}.` : ""} ${valueEnvelope ? `3-year net value: ${fmtGBP(valueEnvelope.net_value_gbp.low)} to ${fmtGBP(valueEnvelope.net_value_gbp.high)}.` : ""}`),
    generateCommentary(`Write a 2-sentence commentary on the strategic ambition for a board paper. Business AI ambition: ${businessAmbitionLevel}/5 (${BUSINESS_LABELS[businessAmbitionLevel]}). People AI ambition: ${peopleAmbitionLevel}/5 (${PEOPLE_LABELS[peopleAmbitionLevel]}). Target capability score: ${ambitionTargetScore ?? "not set"} by ${targetDateStr}. Explain what this means in practice for the HR function.`),
    generateCommentary(`Write a 2-sentence commentary on the AI People Strategy vision statement. Vision: "${visionStatement ?? "Not yet defined"}". ${guidingPrinciples.length} guiding principles. ${wontDoItems.length} strategic exclusions. Comment on strategic coherence and clarity.`),
    generateCommentary(`Write a 2-sentence commentary on the HR function's AI capability baseline. ${assessedCount} staff assessed. Overall average: ${functionAvg ?? "not assessed"}/100. Target: ${ambitionTargetScore ?? "not set"}. Gap: ${gap !== null ? gap : "unknown"}. ${gap !== null && gap > 15 ? "The gap is significant and requires urgent action." : gap !== null && gap <= 0 ? "The function is on or ahead of target." : "The gap is manageable with the right interventions."} Sector: ${sector ?? "not specified"}.`),
    generateCommentary(`Write a 2-sentence commentary on the initiative portfolio. ${selectedInits.length} initiatives selected across ${ambitionTier} ambition tier. Key initiatives: ${selectedInits.slice(0, 5).map((i: Initiative) => i.display_name).join(", ")}${selectedInits.length > 5 ? ` and ${selectedInits.length - 5} more` : ""}. Comment on strategic coherence and phasing.`),
    generateCommentary(`Write a 2-sentence commentary on the investment case. Total estimated investment: ${costEnvelope ? `${fmtGBP(costEnvelope.totalMin * 1000)} to ${fmtGBP(costEnvelope.totalMax * 1000)}` : "not calculated"}. Organisation size: ${orgSizeSafe}. Ambition tier: ${ambitionTier}. Comment on whether this investment level is appropriate.`),
    generateCommentary(`Write a 2-sentence commentary on the risk profile. ${riskMatches.length} regulatory risks identified. ${riskMatches.filter(r => r.severity === "high" || r.severity === "very_high").length} high-severity risks. Key risks: ${riskMatches.slice(0, 3).map(r => r.displayName).join(", ") || "none identified"}. Comment on the risk posture and what the board should note.`),
    generateCommentary(`Write a 2-sentence commentary on the value case. ${valueEnvelope ? `Quantified gross value over 3 years: ${fmtGBP(valueEnvelope.total_quantified_value_gbp.low)} to ${fmtGBP(valueEnvelope.total_quantified_value_gbp.high)}. Net value: ${fmtGBP(valueEnvelope.net_value_gbp.low)} to ${fmtGBP(valueEnvelope.net_value_gbp.high)}.` : "Value not yet calculated."} Comment on the robustness of the value case and key value drivers.`),
    generateCommentary(`Write a 2-sentence commentary on the financial model. ${financialModel ? `NPV range: ${fmtGBP(financialModel.npv_gbp.low)} to ${fmtGBP(financialModel.npv_gbp.high)}. ${financialModel.irr_suppressed ? "IRR is very high — payback period is the more meaningful metric." : financialModel.irr_pct ? `IRR: ${financialModel.irr_pct.low}%–${financialModel.irr_pct.high}%.` : ""}` : "Financial model not yet calculated."} Comment on the financial attractiveness for the board.`),
    generateCommentary(`Write a 2-sentence commentary on the measurement framework. Measurement cadence: ${(structuredInputs as any).measurement_cadence ?? "not specified"}. Pilot design: ${(structuredInputs as any).pilot_design ?? "not specified"}. Comment on the governance and accountability arrangements.`),
  ]);

  // ── Build HTML ────────────────────────────────────────────────────────────
  const ambitionTargetLabel = ambitionTargetScore
    ? `${BUSINESS_LABELS[businessAmbitionLevel]} Business AI Ambition · ${PEOPLE_LABELS[peopleAmbitionLevel]} People AI Ambition · Target ${ambitionTargetScore}/100 by ${targetDateStr}`
    : null;

  const sectorDisplay = sector
    ? sector.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Not specified";

  // Phase groupings — use typical_phase field (foundation/build/scale/optimise)
  const phases: Record<string, typeof allInitiatives> = { foundation: [], build: [], scale: [], optimise: [] };
  for (const init of selectedInits) {
    const ph = (init as any).typical_phase ?? "foundation";
    if (!phases[ph]) phases[ph] = [];
    phases[ph].push(init);
  }
  // Determine timeline based on total duration from org context
  const totalMonths = (structuredInputs as any)?.timeline_months ?? 18;
  const phaseConfig = [
    { key: "foundation", label: "Foundation", period: `Months 1–${Math.round(totalMonths * 0.2)}`,   colour: "#2D6A5E" },
    { key: "build",      label: "Build",      period: `Months ${Math.round(totalMonths * 0.2) + 1}–${Math.round(totalMonths * 0.4)}`,  colour: "#C8A96E" },
    { key: "scale",      label: "Scale",      period: `Months ${Math.round(totalMonths * 0.4) + 1}–${Math.round(totalMonths * 0.7)}`, colour: "#0A1628" },
    { key: "optimise",   label: "Optimise",   period: `Months ${Math.round(totalMonths * 0.7) + 1}–${totalMonths}`, colour: "#7c3aed" },
  ];

  const pageStyle = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #ffffff; color: #1e293b; font-size: 9pt; line-height: 1.4; }
    .page { width: 210mm; min-height: 297mm; padding: 28px 28px 44px; position: relative; page-break-after: always; overflow: hidden; }
    .page:last-child { page-break-after: auto; }
    .cover-page { background: #0A1628; color: #ffffff; padding: 0; }
    .footer { position: absolute; bottom: 0; left: 0; right: 0; height: 28px; background: #0A1628; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; }
    .footer-text { font-size: 6pt; color: #C8A96E; }
    .footer-page { font-size: 6pt; color: #ffffff; }
    h2 { font-size: 11pt; font-weight: 700; color: #0A1628; margin-bottom: 8px; }
    h3 { font-size: 9pt; font-weight: 700; color: #334155; margin-bottom: 6px; }
    p { font-size: 8.5pt; color: #475569; line-height: 1.5; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
    th { background: #0A1628; color: #C8A96E; font-weight: 700; text-transform: uppercase; font-size: 6.5pt; letter-spacing: 0.05em; padding: 6px 8px; text-align: left; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .kpi-row { display: flex; gap: 10px; margin-bottom: 16px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .initiative-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .phase-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
    .risk-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px; border-radius: 6px; margin-bottom: 6px; }
    .value-bar-wrap { margin-bottom: 8px; }
    .value-bar-label { display: flex; justify-content: space-between; font-size: 7.5pt; margin-bottom: 2px; }
    .value-bar-track { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .value-bar-fill { height: 8px; border-radius: 4px; }
    .scenario-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 12px 0; }
    .scenario-card { border-radius: 8px; padding: 12px; text-align: center; }
    .qualitative-item { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
    .principle-card { background: #f8fafc; border-left: 3px solid #2D6A5E; padding: 10px 12px; border-radius: 0 6px 6px 0; margin-bottom: 8px; }
    .wont-do-item { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; }
    .exclusion-x { background: #ef4444; color: #ffffff; width: 16px; height: 16px; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 8pt; font-weight: 700; flex-shrink: 0; }
  `;

  // ── COVER PAGE ────────────────────────────────────────────────────────────
  const coverHtml = `
    <div class="page cover-page">
      <div style="height:6px;background:#2D6A5E;"></div>
      <div style="padding:40px 44px 0;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:60px;">
          <div style="background:#2D6A5E;color:#ffffff;font-size:14pt;font-weight:800;padding:8px 14px;border-radius:8px;letter-spacing:0.05em;">AiQ</div>
          <div style="color:#94a3b8;font-size:9pt;">HR Capability Intelligence</div>
        </div>
        <div style="color:#94a3b8;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:12px;">Board Strategy Pack</div>
        <div style="font-size:32pt;font-weight:800;color:#ffffff;line-height:1.1;margin-bottom:8px;">HR AI People<br>Strategy</div>
        <div style="height:3px;width:60px;background:#C8A96E;margin:20px 0;"></div>
        <div style="font-size:13pt;font-weight:600;color:#e2e8f0;margin-bottom:6px;">${orgName}</div>
        <div style="font-size:9pt;color:#94a3b8;margin-bottom:4px;">${sectorDisplay}${headcount ? ` · ${headcount.toLocaleString()} employees` : ""}${hrFteCount ? ` · ${hrFteCount} HR FTE` : ""}</div>
        <div style="font-size:9pt;color:#94a3b8;">${reportDate}</div>
        ${ambitionTargetLabel ? `<div style="background:#1e3a5f;border:1px solid #2D6A5E;border-radius:8px;padding:12px 16px;margin-top:24px;font-size:9pt;color:#93c5fd;">${ambitionTargetLabel}</div>` : ""}
        <div style="background:#0d2137;border-left:3px solid #C8A96E;border-radius:0 8px 8px 0;padding:16px 20px;margin-top:32px;">
          <div style="font-size:7pt;color:#C8A96E;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Executive Summary</div>
          <div style="font-size:9pt;color:#e2e8f0;line-height:1.6;">${commentaryCover || "This board pack presents the organisation's HR AI People Strategy, including capability baseline, initiative portfolio, investment case, and value projections."}</div>
        </div>
        <div style="display:flex;gap:12px;margin-top:28px;">
          ${kpiCardHtml("Initiatives Selected", String(selectedInits.length), ambitionTier.charAt(0).toUpperCase() + ambitionTier.slice(1) + " tier", "#2D6A5E")}
          ${costEnvelope ? kpiCardHtml("Total Investment", fmtGBP(costEnvelope.totalMin * 1000), `to ${fmtGBP(costEnvelope.totalMax * 1000)}`, "#C8A96E") : kpiCardHtml("Total Investment", "—", "Not calculated", "#64748b")}
          ${valueEnvelope ? kpiCardHtml("3-Year Net Value", fmtGBP(valueEnvelope.net_value_gbp.low), `to ${fmtGBP(valueEnvelope.net_value_gbp.high)}`, "#2D6A5E") : kpiCardHtml("3-Year Net Value", "—", "Not calculated", "#64748b")}
          ${valueEnvelope?.payback_period_months ? kpiCardHtml("Payback Period", `${valueEnvelope.payback_period_months.low}–${valueEnvelope.payback_period_months.high}mo`, "From go-live", "#C8A96E") : kpiCardHtml("Staff Assessed", assessedCount > 0 ? String(assessedCount) : "—", "Completed assessments", "#64748b")}
        </div>
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:28px;background:#050e1a;display:flex;align-items:center;justify-content:space-between;padding:0 44px;">
        <span style="font-size:6pt;color:#C8A96E;">CONFIDENTIAL · ${reportDate} · AiQ HR Capability Intelligence · Content Library v${libVer}</span>
        <span style="font-size:6pt;color:#64748b;">Page 1</span>
      </div>
    </div>`;

  // ── SLIDE 1 — STRATEGIC CONTEXT ───────────────────────────────────────────
  const slide1Html = `
    <div class="page">
      ${slideHeaderHtml("01", "Strategic Context", "Ambition levels, configuration, and strategic intent", "#2D6A5E")}
      <div class="kpi-row">
        ${kpiCardHtml("Business AI Ambition", `${businessAmbitionLevel}/5`, BUSINESS_LABELS[businessAmbitionLevel], "#2D6A5E")}
        ${kpiCardHtml("People AI Ambition", `${peopleAmbitionLevel}/5`, PEOPLE_LABELS[peopleAmbitionLevel], "#C8A96E")}
        ${kpiCardHtml("Capability Target", ambitionTargetScore !== null ? `${ambitionTargetScore}/100` : "—", `By ${targetDateStr}`, "#0A1628")}
        ${kpiCardHtml("Sector", sectorDisplay, headcount ? `${headcount.toLocaleString()} employees` : "", "#64748b")}
      </div>
      ${strategyNarrative ? `
        ${sectionLabelHtml("Strategic Intent")}
        <div style="background:#fefce8;border-left:3px solid #C8A96E;border-radius:0 6px 6px 0;padding:12px 16px;margin-bottom:12px;">
          <div style="font-size:9.5pt;font-style:italic;color:#1e293b;line-height:1.6;">"${strategyNarrative}"</div>
        </div>` : ""}
      ${sectionLabelHtml("Ambition Framework")}
      <table>
        <thead><tr><th>Dimension</th><th>Level</th><th>Description</th><th>Implication</th></tr></thead>
        <tbody>
          <tr><td><strong>Business AI Adoption</strong></td><td><span class="badge badge-green">${BUSINESS_LABELS[businessAmbitionLevel]}</span></td><td>${businessAmbitionLevel >= 4 ? "Aggressive AI adoption across business functions" : businessAmbitionLevel >= 3 ? "Selective AI adoption in key areas" : "Cautious, compliance-first AI adoption"}</td><td>${businessAmbitionLevel >= 4 ? "HR must be a strategic AI enabler" : businessAmbitionLevel >= 3 ? "HR leads in targeted capability areas" : "HR focuses on risk management and literacy"}</td></tr>
          <tr><td><strong>HR People AI Capability</strong></td><td><span class="badge badge-blue">${PEOPLE_LABELS[peopleAmbitionLevel]}</span></td><td>${peopleAmbitionLevel >= 4 ? "HR team drives AI innovation and best practice" : peopleAmbitionLevel >= 3 ? "HR team actively applies AI in daily work" : "HR team understands and safely uses AI tools"}</td><td>${peopleAmbitionLevel >= 4 ? "Significant upskilling and culture change investment" : peopleAmbitionLevel >= 3 ? "Structured learning programme required" : "Foundational literacy programme sufficient"}</td></tr>
        </tbody>
      </table>
      ${subSector ? `<p style="margin-top:10px;"><strong>Sub-sector:</strong> ${subSector.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>` : ""}
      ${aiCommentaryHtml(commentaryAmbition)}
      <div class="footer">
        <span class="footer-text">AiQ HR Capability Intelligence · ${orgName} · ${reportDate} · Library v${libVer} · CONFIDENTIAL</span>
        <span class="footer-page">2</span>
      </div>
    </div>`;

  // ── SLIDE 2 — VISION & GUIDING PRINCIPLES ─────────────────────────────────
  const slide2Html = `
    <div class="page">
      ${slideHeaderHtml("02", "Vision & Guiding Principles", "Strategic vision, principles, and boundaries", "#C8A96E")}
      ${visionStatement ? `
        ${sectionLabelHtml("AI People Strategy Vision")}
        <div style="background:#fefce8;border-left:4px solid #C8A96E;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:14px;">
          <div style="font-size:10.5pt;font-style:italic;font-weight:600;color:#1e293b;line-height:1.6;">"${visionStatement}"</div>
        </div>` : `
        <div style="background:#f8fafc;border-radius:8px;padding:14px;text-align:center;color:#94a3b8;margin-bottom:14px;">
          <div style="font-size:9pt;">Vision statement not yet defined. Complete the strategy builder to generate your vision.</div>
        </div>`}
      ${aiCommentaryHtml(commentaryVision)}
      ${guidingPrinciples.length > 0 ? `
        ${sectionLabelHtml(`Guiding Principles (${guidingPrinciples.length})`)}
        ${guidingPrinciples.map(p => `
          <div class="principle-card">
            <div style="font-size:8.5pt;font-weight:700;color:#0A1628;margin-bottom:3px;">${p.title}</div>
            <div style="font-size:7.5pt;color:#475569;line-height:1.5;">${p.description}</div>
          </div>`).join("")}` : ""}
      ${wontDoItems.length > 0 ? `
        ${sectionLabelHtml("Strategic Exclusions — What We Won't Do")}
        ${wontDoItems.map(item => `
          <div class="wont-do-item">
            <div class="exclusion-x">✕</div>
            <div style="font-size:8pt;color:#334155;line-height:1.4;padding-top:1px;">${item}</div>
          </div>`).join("")}` : ""}
      <div class="footer">
        <span class="footer-text">AiQ HR Capability Intelligence · ${orgName} · ${reportDate} · Library v${libVer} · CONFIDENTIAL</span>
        <span class="footer-page">3</span>
      </div>
    </div>`;

  // ── SLIDE 3 — CAPABILITY BASELINE ─────────────────────────────────────────
  const slide3Html = `
    <div class="page">
      ${slideHeaderHtml("03", "Capability Baseline", "Current AI readiness vs roadmap targets by domain", "#2D6A5E")}
      <div class="kpi-row">
        ${kpiCardHtml("Staff Assessed", assessedCount > 0 ? String(assessedCount) : "—", "Completed assessments", "#2D6A5E")}
        ${kpiCardHtml("Current Average", functionAvg !== null ? `${functionAvg}/100` : "—", "Across all domains", functionAvg !== null ? scoreColour(functionAvg) : "#64748b")}
        ${kpiCardHtml("Ambition Target", ambitionTargetScore !== null ? `${ambitionTargetScore}/100` : "—", `By ${targetDateStr}`, "#C8A96E")}
        ${kpiCardHtml("Gap to Close", gap !== null ? (gap > 0 ? `+${gap}` : `${gap}`) : "—", gap !== null ? (gap <= 0 ? "On track" : "Action required") : "", gap !== null && gap <= 0 ? "#22c55e" : "#ef4444")}
      </div>
      ${sectionLabelHtml("Domain Capability vs Roadmap Targets")}
      <div style="margin-bottom:6px;font-size:6.5pt;color:#94a3b8;">Gold marker (|) = roadmap target score</div>
      ${DOMAIN_KEYS.map(dk => progressBarHtml(DOMAIN_LABELS[dk], domainAvgs[dk], domainTargets[dk] ?? null)).join("")}
      <div style="display:flex;gap:16px;margin-top:8px;font-size:6.5pt;">
        <span style="color:#22c55e;">● 75+ Strong</span>
        <span style="color:#f59e0b;">● 50–74 Developing</span>
        <span style="color:#ef4444;">● 0–49 Gap</span>
        <span style="color:#C8A96E;">| Target</span>
      </div>
      ${aiCommentaryHtml(commentaryCapability)}
      ${assessedCount === 0 ? `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-top:12px;font-size:8pt;color:#92400e;">No assessments completed yet. Capability data will populate once team members complete their AI capability assessments.</div>` : ""}
      <div class="footer">
        <span class="footer-text">AiQ HR Capability Intelligence · ${orgName} · ${reportDate} · Library v${libVer} · CONFIDENTIAL</span>
        <span class="footer-page">4</span>
      </div>
    </div>`;

  // ── SLIDE 4 — INITIATIVE PORTFOLIO ────────────────────────────────────────
  const slide4Html = selectedInits.length > 0 ? `
    <div class="page">
      ${slideHeaderHtml("04", "Initiative Portfolio", `${selectedInits.length} initiatives across ${ambitionTier} ambition tier`, "#2D6A5E")}
      ${aiCommentaryHtml(commentaryPlan)}
      ${phaseConfig.map(ph => {
        const inits = phases[ph.key];
        if (!inits || inits.length === 0) return "";
        return `
          ${sectionLabelHtml(`${ph.label} · ${ph.period}`)}
          ${inits.map(init => {
            const aiType = (init as any).ai_type ?? "";
            const complexity = (init as any).complexity ?? "";
            const category = (init as any).category ?? "";
            return `
              <div class="initiative-row">
                <div class="phase-dot" style="background:${ph.colour};margin-top:4px;"></div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:8.5pt;font-weight:700;color:#0A1628;">${(init as any).display_name ?? init.initiative_id}</div>
                  <div style="font-size:7pt;color:#64748b;margin-top:2px;">${((init as any).short_description ?? (init as any).description ?? "").slice(0, 160)}${((init as any).short_description ?? (init as any).description ?? "").length > 160 ? "…" : ""}</div>
                  <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
                    ${category ? `<span class="badge badge-blue">${category.replace(/_/g, " ")}</span>` : ""}
                    ${aiType ? `<span class="badge badge-green">${aiType}</span>` : ""}
                    ${complexity ? `<span class="badge ${complexity === "high" ? "badge-red" : complexity === "medium" ? "badge-amber" : "badge-green"}">${complexity} complexity</span>` : ""}
                  </div>
                </div>
              </div>`;
          }).join("")}`;
      }).join("")}
      <div class="footer">
        <span class="footer-text">AiQ HR Capability Intelligence · ${orgName} · ${reportDate} · Library v${libVer} · CONFIDENTIAL</span>
        <span class="footer-page">5</span>
      </div>
    </div>` : "";

  // ── SLIDE 5 — INVESTMENT & COST ENVELOPE ──────────────────────────────────
  const slide5Html = costEnvelope ? `
    <div class="page">
      ${slideHeaderHtml("05", "Investment & Cost Envelope", "Total cost of ownership by phase and category", "#C8A96E")}
      <div class="kpi-row">
        ${kpiCardHtml("Total Investment (Low)", fmtGBP(costEnvelope.totalMin * 1000), "Conservative estimate", "#2D6A5E")}
        ${kpiCardHtml("Total Investment (High)", fmtGBP(costEnvelope.totalMax * 1000), "Optimistic estimate", "#C8A96E")}
        ${kpiCardHtml("Initiatives", String(selectedInits.length), `${orgSizeSafe} org · ${ambitionTier}`, "#0A1628")}
        ${valueEnvelope?.tco ? kpiCardHtml("Internal Resource", fmtGBP(valueEnvelope.tco.internal_resource_gbp.low), "0.5 FTE PM equivalent", "#64748b") : ""}
      </div>
      ${sectionLabelHtml("Cost Breakdown by Category")}
      ${valueEnvelope?.tco ? `
        <table>
          <thead><tr><th>Cost Category</th><th>Low Estimate</th><th>High Estimate</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td>Implementation</td><td>${fmtGBP(valueEnvelope.tco.implementation_gbp.low)}</td><td>${fmtGBP(valueEnvelope.tco.implementation_gbp.high)}</td><td>Software, setup, and configuration</td></tr>
            <tr><td>Change Management</td><td>${fmtGBP(valueEnvelope.tco.change_management_gbp.low)}</td><td>${fmtGBP(valueEnvelope.tco.change_management_gbp.high)}</td><td>Comms, engagement, adoption (12–15%)</td></tr>
            <tr><td>Training & Development</td><td>${fmtGBP(valueEnvelope.tco.training_gbp.low)}</td><td>${fmtGBP(valueEnvelope.tco.training_gbp.high)}</td><td>HR FTE upskilling (£200–400/FTE)</td></tr>
            <tr><td>Internal Resource</td><td>${fmtGBP(valueEnvelope.tco.internal_resource_gbp.low)}</td><td>${fmtGBP(valueEnvelope.tco.internal_resource_gbp.high)}</td><td>PM, integration, procurement (15%)</td></tr>
            <tr><td>Ongoing Annual</td><td>${fmtGBP(valueEnvelope.tco.ongoing_annual_gbp.low)}</td><td>${fmtGBP(valueEnvelope.tco.ongoing_annual_gbp.high)}</td><td>Licences, support, maintenance (18–20%/yr)</td></tr>
            <tr style="font-weight:700;"><td><strong>Total TCO (3yr)</strong></td><td><strong>${fmtGBP(valueEnvelope.tco.total_3yr_gbp.low)}</strong></td><td><strong>${fmtGBP(valueEnvelope.tco.total_3yr_gbp.high)}</strong></td><td></td></tr>
          </tbody>
        </table>` : `
        <table>
          <thead><tr><th>Phase</th><th>Initiatives</th><th>Low Estimate</th><th>High Estimate</th></tr></thead>
          <tbody>
            ${phaseConfig.map(ph => {
              const inits = phases[ph.key];
              if (!inits || inits.length === 0) return "";
              return `<tr><td>${ph.label}</td><td>${inits.length}</td><td>—</td><td>—</td></tr>`;
            }).join("")}
          </tbody>
        </table>`}
      ${aiCommentaryHtml(commentaryInvestment)}
      <div style="background:#f0f9f6;border-radius:6px;padding:10px 14px;margin-top:12px;font-size:7.5pt;color:#334155;">
        <strong>Assumptions:</strong> Costs are estimates based on UK 2026 market rates for ${orgSizeSafe}-sized organisations. Actual costs will vary based on vendor selection, internal capability, and implementation approach. All figures exclude VAT.
      </div>
      <div class="footer">
        <span class="footer-text">AiQ HR Capability Intelligence · ${orgName} · ${reportDate} · Library v${libVer} · CONFIDENTIAL</span>
        <span class="footer-page">6</span>
      </div>
    </div>` : "";

  // ── SLIDE 6 — RISK REGISTER ────────────────────────────────────────────────
  const slide6Html = `
    <div class="page">
      ${slideHeaderHtml("06", "Risk Register", `${riskMatches.length} risks identified across regulatory, operational, and strategic dimensions`, "#ef4444")}
      <div class="kpi-row">
        ${kpiCardHtml("Total Risks", String(riskMatches.length), "Identified risk items", "#64748b")}
        ${kpiCardHtml("High / Very High", String(riskMatches.filter(r => r.severity === "high" || r.severity === "very_high").length), "Require board attention", "#ef4444")}
        ${kpiCardHtml("Medium", String(riskMatches.filter(r => r.severity === "medium").length), "Monitor and manage", "#f59e0b")}
        ${kpiCardHtml("Low", String(riskMatches.filter(r => r.severity === "low").length), "Standard controls", "#22c55e")}
      </div>
      ${riskMatches.length > 0 ? `
        ${sectionLabelHtml("Risk Register")}
        <table>
          <thead><tr><th>Risk</th><th>Severity</th><th>Risk Statement</th><th>Recommended Action</th></tr></thead>
          <tbody>
            ${riskMatches.slice(0, 12).map((r: RiskRuleMatch) => `
              <tr>
                <td><strong>${r.displayName}</strong></td>
                <td><span class="badge ${r.severity === "very_high" || r.severity === "high" ? "badge-red" : r.severity === "medium" ? "badge-amber" : "badge-green"}">${r.severity.replace("_", " ")}</span></td>
                <td style="font-size:7pt;">${r.riskStatement.slice(0, 120)}${r.riskStatement.length > 120 ? "…" : ""}</td>
                <td style="font-size:7pt;">${r.recommendedAction.slice(0, 120)}${r.recommendedAction.length > 120 ? "…" : ""}</td>
              </tr>`).join("")}
          </tbody>
        </table>` : `
        <div style="background:#f0fdf4;border-radius:8px;padding:20px;text-align:center;margin-top:16px;">
          <div style="font-size:9pt;color:#166534;">No specific risks identified for this initiative combination. Standard organisational change management controls apply.</div>
        </div>`}
      ${aiCommentaryHtml(commentaryRisk)}
      <div class="footer">
        <span class="footer-text">AiQ HR Capability Intelligence · ${orgName} · ${reportDate} · Library v${libVer} · CONFIDENTIAL</span>
        <span class="footer-page">7</span>
      </div>
    </div>`;

  // ── SLIDE 7 — VALUE CASE ───────────────────────────────────────────────────
  const slide7Html = valueEnvelope ? `
    <div class="page">
      ${slideHeaderHtml("07", "Value Case", "Quantified and qualitative value over 3-year horizon", "#2D6A5E")}
      <div class="kpi-row">
        ${kpiCardHtml("Gross Value (3yr)", fmtGBP(valueEnvelope.total_quantified_value_gbp.low), `to ${fmtGBP(valueEnvelope.total_quantified_value_gbp.high)}`, "#2D6A5E")}
        ${kpiCardHtml("Net Value (3yr)", fmtGBP(valueEnvelope.net_value_gbp.low), `to ${fmtGBP(valueEnvelope.net_value_gbp.high)}`, valueEnvelope.net_value_gbp.low >= 0 ? "#22c55e" : "#ef4444")}
        ${valueEnvelope.payback_period_months ? kpiCardHtml("Payback Period", `${valueEnvelope.payback_period_months.low}–${valueEnvelope.payback_period_months.high} months`, "From go-live", "#C8A96E") : ""}
        ${kpiCardHtml("Qualitative Items", String(valueEnvelope.qualitative_summary.bullet_points.length), "Non-quantified benefits", "#64748b")}
      </div>
      ${sectionLabelHtml("Value by Initiative")}
      <table>
        <thead><tr><th>Initiative</th><th>Value Type</th><th>Annual Low</th><th>Annual High</th><th>Driver</th></tr></thead>
        <tbody>
          ${valueEnvelope.by_initiative.slice(0, 10).map((v: ValueEnvelopeInitiative) => `
            <tr>
              <td><strong>${v.display_name}</strong></td>
              <td><span class="badge ${v.value_type === "strategic" ? "badge-blue" : v.value_type === "effectiveness" ? "badge-green" : "badge-amber"}">${v.value_type}</span></td>
              <td>${v.quantified_value_gbp ? fmtGBP(v.quantified_value_gbp.low) : "Qualitative"}</td>
              <td>${v.quantified_value_gbp ? fmtGBP(v.quantified_value_gbp.high) : "—"}</td>
              <td style="font-size:7pt;">${v.monetisation_breakdown.slice(0, 80)}${v.monetisation_breakdown.length > 80 ? "…" : ""}</td>
            </tr>`).join("")}
        </tbody>
      </table>
      ${valueEnvelope.qualitative_summary.bullet_points.length > 0 ? `
        ${sectionLabelHtml("Qualitative & Strategic Value")}
        ${valueEnvelope.qualitative_summary.bullet_points.slice(0, 5).map(bp => `
          <div class="qualitative-item">
            <div style="color:#2D6A5E;font-size:10pt;flex-shrink:0;">✓</div>
            <div style="font-size:8pt;color:#334155;">${bp}</div>
          </div>`).join("")}` : ""}
      ${aiCommentaryHtml(commentaryValue)}
      <div class="footer">
        <span class="footer-text">AiQ HR Capability Intelligence · ${orgName} · ${reportDate} · Library v${libVer} · CONFIDENTIAL</span>
        <span class="footer-page">8</span>
      </div>
    </div>` : "";

  // ── SLIDE 8 — FINANCIAL MODEL ──────────────────────────────────────────────
  const slide8Html = financialModel ? `
    <div class="page">
      ${slideHeaderHtml("08", "Financial Model", "NPV, payback, and scenario analysis", "#C8A96E")}
      <div class="kpi-row">
        ${kpiCardHtml("NPV (Low)", fmtGBP(financialModel.npv_gbp.low), "Conservative 3yr NPV", financialModel.npv_gbp.low >= 0 ? "#22c55e" : "#ef4444")}
        ${kpiCardHtml("NPV (High)", fmtGBP(financialModel.npv_gbp.high), "Optimistic 3yr NPV", financialModel.npv_gbp.high >= 0 ? "#22c55e" : "#ef4444")}
        ${financialModel.irr_suppressed
          ? kpiCardHtml("Payback Period", valueEnvelope?.payback_period_months ? `${valueEnvelope.payback_period_months.low}–${valueEnvelope.payback_period_months.high}mo` : "—", "IRR >100% — use NPV", "#2D6A5E")
          : kpiCardHtml("IRR", financialModel.irr_pct ? `${financialModel.irr_pct.low}%–${financialModel.irr_pct.high}%` : "—", "Internal rate of return", "#2D6A5E")}
        ${kpiCardHtml("Discount Rate", `${financialModel.discount_rate_pct}%`, "Applied to NPV calc", "#64748b")}
      </div>
      ${financialModel.irr_suppressed ? `
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:7.5pt;color:#92400e;">
          <strong>Note:</strong> IRR exceeds 100% for this portfolio — this is mathematically valid but not a useful board metric. Use NPV and payback period as the primary financial indicators.
        </div>` : ""}
      ${valueEnvelope?.scenario_analysis ? `
        ${sectionLabelHtml("Scenario Analysis")}
        <div class="scenario-grid">
          <div class="scenario-card" style="background:#fef2f2;border:1px solid #fecaca;">
            <div style="font-size:7pt;font-weight:700;color:#991b1b;text-transform:uppercase;margin-bottom:6px;">Pessimistic</div>
            <div style="font-size:16pt;font-weight:800;color:#dc2626;">${valueEnvelope.scenario_analysis.pessimistic.roi_pct > 500 ? ">500%" : `${valueEnvelope.scenario_analysis.pessimistic.roi_pct}%`}</div>
            <div style="font-size:7pt;color:#64748b;margin-top:4px;">ROI</div>
            <div style="font-size:9pt;font-weight:700;color:#334155;margin-top:6px;">${fmtGBP(valueEnvelope.scenario_analysis.pessimistic.net_gbp)}</div>
            <div style="font-size:7pt;color:#64748b;">Net value</div>
          </div>
          <div class="scenario-card" style="background:#f0fdf4;border:2px solid #22c55e;">
            <div style="font-size:7pt;font-weight:700;color:#166534;text-transform:uppercase;margin-bottom:6px;">Base Case</div>
            <div style="font-size:16pt;font-weight:800;color:#16a34a;">${valueEnvelope.scenario_analysis.base.roi_pct > 500 ? ">500%" : `${valueEnvelope.scenario_analysis.base.roi_pct}%`}</div>
            <div style="font-size:7pt;color:#64748b;margin-top:4px;">ROI</div>
            <div style="font-size:9pt;font-weight:700;color:#334155;margin-top:6px;">${fmtGBP(valueEnvelope.scenario_analysis.base.net_gbp)}</div>
            <div style="font-size:7pt;color:#64748b;">Net value</div>
          </div>
          <div class="scenario-card" style="background:#eff6ff;border:1px solid #bfdbfe;">
            <div style="font-size:7pt;font-weight:700;color:#1e40af;text-transform:uppercase;margin-bottom:6px;">Optimistic</div>
            <div style="font-size:16pt;font-weight:800;color:#2563eb;">${valueEnvelope.scenario_analysis.optimistic.roi_pct > 500 ? ">500%" : `${valueEnvelope.scenario_analysis.optimistic.roi_pct}%`}</div>
            <div style="font-size:7pt;color:#64748b;margin-top:4px;">ROI</div>
            <div style="font-size:9pt;font-weight:700;color:#334155;margin-top:6px;">${fmtGBP(valueEnvelope.scenario_analysis.optimistic.net_gbp)}</div>
            <div style="font-size:7pt;color:#64748b;">Net value</div>
          </div>
        </div>
        ${valueEnvelope.scenario_analysis.base.roi_pct > 200 ? `
          <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:8px 12px;margin-top:8px;font-size:7.5pt;color:#92400e;">
            <strong>CFO Note:</strong> ROI figures reflect 3-year compounding value. Validate assumptions with Finance before board presentation. NPV is the more reliable metric for investment decisions.
          </div>` : ""}` : ""}
      ${aiCommentaryHtml(commentaryFinancial)}
      <div class="footer">
        <span class="footer-text">AiQ HR Capability Intelligence · ${orgName} · ${reportDate} · Library v${libVer} · CONFIDENTIAL</span>
        <span class="footer-page">9</span>
      </div>
    </div>` : "";

  // ── SLIDE 9 — REINVESTMENT PLAN & CEO SPONSORSHIP ─────────────────────────
  const slide9Html = (reinvestment || ceoSponsorship?.required) ? `
    <div class="page">
      ${slideHeaderHtml("09", "Reinvestment Plan & Governance", "Value reinvestment strategy and executive sponsorship", "#2D6A5E")}
      ${reinvestment ? `
        ${sectionLabelHtml("Reinvestment Plan")}
        <div style="background:${reinvestment.case === "both_negative" ? "#fef3c7" : "#f0f9f6"};border-left:3px solid ${reinvestment.case === "both_negative" ? "#f59e0b" : "#2D6A5E"};border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:12px;">
          <div style="font-size:8.5pt;font-weight:700;color:#0A1628;margin-bottom:4px;">${reinvestment.headline}</div>
          <div style="font-size:8pt;color:#475569;line-height:1.5;">${reinvestment.narrative}</div>
          ${reinvestment.suggested_reinvestment_gbp ? `<div style="margin-top:8px;font-size:8pt;"><strong>Suggested reinvestment:</strong> ${fmtGBP(reinvestment.suggested_reinvestment_gbp)}</div>` : ""}
        </div>
        ${reinvestment.phase2_focus_areas && reinvestment.phase2_focus_areas.length > 0 ? `
          ${sectionLabelHtml("Phase 2 Focus Areas")}
          ${reinvestment.phase2_focus_areas.map((area: string) => `
            <div class="qualitative-item">
              <div style="color:#2D6A5E;font-size:10pt;flex-shrink:0;">→</div>
              <div style="font-size:8pt;color:#334155;">${area}</div>
            </div>`).join("")}` : ""}` : ""}
      ${ceoSponsorship?.required ? `
        ${sectionLabelHtml("CEO Sponsorship Recommendation")}
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="background:#2563eb;color:#ffffff;font-size:8pt;font-weight:700;padding:4px 10px;border-radius:4px;">CEO SPONSORSHIP REQUIRED</div>
          </div>
          <div style="font-size:8pt;color:#334155;line-height:1.5;margin-bottom:8px;">${ceoSponsorship.rationale ?? ""}</div>
          ${ceoSponsorship.suggested_framing ? `
            <div style="font-size:7.5pt;font-weight:700;color:#1e40af;margin-bottom:4px;">Suggested Board Framing:</div>
            <div style="font-size:8pt;color:#334155;font-style:italic;">"${ceoSponsorship.suggested_framing}"</div>` : ""}
        </div>` : ""}
      <div class="footer">
        <span class="footer-text">AiQ HR Capability Intelligence · ${orgName} · ${reportDate} · Library v${libVer} · CONFIDENTIAL</span>
        <span class="footer-page">10</span>
      </div>
    </div>` : "";

  // ── SLIDE 10 — MEASUREMENT FRAMEWORK ──────────────────────────────────────
  const slide10Html = `
    <div class="page">
      ${slideHeaderHtml("10", "Measurement Framework", "KPIs, governance, and accountability", "#2D6A5E")}
      ${sectionLabelHtml("Measurement Configuration")}
      <table>
        <thead><tr><th>Dimension</th><th>Setting</th><th>Implication</th></tr></thead>
        <tbody>
          <tr><td>Measurement Cadence</td><td>${(structuredInputs as any).measurement_cadence ?? "Not specified"}</td><td>${(structuredInputs as any).measurement_cadence === "quarterly" ? "Quarterly board reporting cycle" : (structuredInputs as any).measurement_cadence === "monthly" ? "Monthly operational review" : "Define reporting cadence"}</td></tr>
          <tr><td>Pilot Design</td><td>${(structuredInputs as any).pilot_design ?? "Not specified"}</td><td>${(structuredInputs as any).pilot_design === "controlled" ? "A/B test with control group" : (structuredInputs as any).pilot_design === "phased" ? "Phased rollout with checkpoints" : "Define pilot approach"}</td></tr>
          <tr><td>Success Metrics</td><td>${(structuredInputs as any).success_metrics ?? "Not specified"}</td><td>Primary KPIs for board reporting</td></tr>
        </tbody>
      </table>
      ${sectionLabelHtml("Recommended KPIs by Initiative Type")}
      <table>
        <thead><tr><th>Category</th><th>KPI</th><th>Target</th><th>Measurement Method</th></tr></thead>
        <tbody>
          <tr><td>Talent Acquisition</td><td>Time-to-fill reduction</td><td>20–35%</td><td>ATS data comparison</td></tr>
          <tr><td>Learning & Development</td><td>AI literacy score improvement</td><td>+15 pts</td><td>AiQ assessment re-run</td></tr>
          <tr><td>HR Operations</td><td>Query resolution time</td><td>40% reduction</td><td>Helpdesk ticket data</td></tr>
          <tr><td>Performance & Dev</td><td>Manager time on admin</td><td>25% reduction</td><td>Manager survey</td></tr>
          <tr><td>Workforce Planning</td><td>Forecast accuracy</td><td>±10%</td><td>Actual vs plan variance</td></tr>
          <tr><td>Ethics & Governance</td><td>AI audit completion rate</td><td>100%</td><td>Governance dashboard</td></tr>
        </tbody>
      </table>
      ${aiCommentaryHtml(commentaryMeasurement)}
      <div class="footer">
        <span class="footer-text">AiQ HR Capability Intelligence · ${orgName} · ${reportDate} · Library v${libVer} · CONFIDENTIAL</span>
        <span class="footer-page">11</span>
      </div>
    </div>`;

  // ── SLIDE 11 — METHODOLOGY & ASSUMPTIONS ──────────────────────────────────
  const slide11Html = `
    <div class="page">
      ${slideHeaderHtml("11", "Methodology & Assumptions", "Calculation methodology, benchmarks, and disclaimer", "#64748b")}
      ${sectionLabelHtml("Calculation Methodology")}
      <table>
        <thead><tr><th>Metric</th><th>Methodology</th><th>Source</th></tr></thead>
        <tbody>
          <tr><td>Labour cost baseline</td><td>Per-employee-served metric: total HR spend ÷ headcount</td><td>CIPD HR Outlook 2026; Mercer UK Compensation Survey</td></tr>
          <tr><td>Productivity savings</td><td>Time saving × hourly rate × FTE count × improvement %</td><td>McKinsey Global Institute AI Impact Report 2024</td></tr>
          <tr><td>Attrition value</td><td>Replacement cost × prevented attrition × 25% attribution factor</td><td>CIPD Resourcing & Talent Planning Survey 2025</td></tr>
          <tr><td>Onboarding value</td><td>Ramp-up days saved × employee daily salary rate</td><td>Brandon Hall Group; Glassdoor Economic Research</td></tr>
          <tr><td>NPV discount rate</td><td>${financialModel?.discount_rate_pct ?? 8}% (${orgSizeSafe} org risk-adjusted)</td><td>UK corporate hurdle rate benchmarks 2026</td></tr>
          <tr><td>Implementation costs</td><td>UK 2026 market rates by org size and ambition tier</td><td>Gartner HR Technology Spending Survey 2025</td></tr>
        </tbody>
      </table>
      ${sectionLabelHtml("Key Assumptions")}
      <div style="font-size:8pt;color:#334155;line-height:1.6;">
        <p>• All financial figures are estimates based on UK 2026 market benchmarks. Actual results will vary based on implementation quality, change management effectiveness, and organisational context.</p>
        <p>• Improvement percentages are derived from published research and vendor case studies. A 25% attribution discount is applied to attrition savings to reflect that HR AI is one of multiple retention levers.</p>
        <p>• AI Literacy Programme and Ethics & Governance initiatives are classified as qualitative/strategic value — their benefits are real but not directly quantifiable as cash savings.</p>
        <p>• IRR is suppressed when it exceeds 100% as it is not a meaningful board metric at that level. NPV and payback period are the primary financial indicators.</p>
        <p>• Scenario analysis uses ±30% variance on improvement percentages for pessimistic/optimistic cases.</p>
      </div>
      ${sectionLabelHtml("Disclaimer")}
      <div style="background:#f8fafc;border-radius:6px;padding:10px 14px;font-size:7pt;color:#64748b;line-height:1.5;">
        This board pack has been generated by AiQ HR Capability Intelligence using the AiQ Strategy Engine (Content Library v${libVer}). All financial projections are estimates for planning purposes only and should not be relied upon as guarantees of future performance. The organisation should validate key assumptions with its Finance function before presenting to the board. AiQ accepts no liability for decisions made on the basis of these projections.
      </div>
      <div class="footer">
        <span class="footer-text">AiQ HR Capability Intelligence · ${orgName} · ${reportDate} · Library v${libVer} · CONFIDENTIAL</span>
        <span class="footer-page">12</span>
      </div>
    </div>`;

  // ── Assemble full HTML ────────────────────────────────────────────────────
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AiQ HR AI People Strategy — ${orgName}</title>
  <style>${pageStyle}</style>
</head>
<body>
  ${coverHtml}
  ${slide1Html}
  ${slide2Html}
  ${slide3Html}
  ${slide4Html}
  ${slide5Html}
  ${slide6Html}
  ${slide7Html}
  ${slide8Html}
  ${slide9Html}
  ${slide10Html}
  ${slide11Html}
</body>
</html>`;

  // ── Render to PDF via Puppeteer ───────────────────────────────────────────
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "load" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      displayHeaderFooter: false,
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
