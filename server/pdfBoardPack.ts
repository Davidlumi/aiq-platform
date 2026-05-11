/**
 * AiQ Board Pack PDF Generator
 *
 * Produces a polished, board-ready 12-slide PDF export of the HR AI Strategy dashboard.
 * Each section includes AI-generated commentary via invokeLLM.
 *
 * Slide structure:
 *   S0  Cover / Executive Summary
 *   S1  Strategic Context — Ambition & Configuration
 *   S2  Vision & Guiding Principles
 *   S3  Capability Baseline vs Roadmap Targets
 *   S4  Initiative Portfolio — Phase Plan
 *   S5  Investment & Cost Envelope
 *   S6  Risk Register
 *   S7  Value Case — Quantified & Qualitative
 *   S8  Financial Model — NPV / Payback / Scenario Analysis
 *   S9  Reinvestment Plan & CEO Sponsorship
 *   S10 Measurement Framework
 *   S11 Methodology & Assumptions Appendix
 */

import PDFDocument from "pdfkit";
type PDFKitDoc = PDFKit.PDFDocument;
import { getDb, getTenantById } from "./db";
import {
  ailOrgContext,
  assessmentSessions,
  assessmentScores,
  users,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  DOMAIN_KEYS,
  DOMAIN_LABELS,
  roleFamilyFromUserField,
  type DomainKey,
  type RoleFamilyKey,
} from "../shared/dashboard";
import {
  getAllInitiatives,
  resolveInitiativeIds,
  getLibraryMeta,
} from "./contentLibrary";
import {
  calculateCostEnvelope,
  evaluateRiskRules,
  calculateValueEnvelope,
} from "./strategyEngine";
import { invokeLLM } from "./_core/llm";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy:    "#0A1628",
  navyMid: "#0F2040",
  gold:    "#C8A96E",
  goldPale:"#F5EDD8",
  teal:    "#2D6A5E",
  tealPale:"#E8F4F1",
  slate:   "#4A5568",
  muted:   "#718096",
  light:   "#F7F8FA",
  border:  "#E2E8F0",
  safe:    "#10B981",
  safePale:"#D1FAE5",
  warn:    "#F59E0B",
  warnPale:"#FEF3C7",
  danger:  "#DC2626",
  dangerPale: "#FEE2E2",
  white:   "#FFFFFF",
  black:   "#111827",
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const PAGE_W = 595.28;  // A4 points
const PAGE_H = 841.89;
const MARGIN  = 44;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H  = 40;
const CONTENT_BOTTOM = PAGE_H - FOOTER_H - 10;
const CONTENT_TOP = 80; // Below the 64px header band

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGBP(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1_000)     return `£${Math.round(n / 1_000)}k`;
  return `£${Math.round(n)}`;
}

function fmtPct(n: number): string {
  return `${Math.round(n)}%`;
}

function scoreColour(score: number): string {
  return score >= 75 ? C.safe : score >= 50 ? C.warn : C.danger;
}

function severityColour(sev: string): string {
  return sev === "very_high" || sev === "high" ? C.danger
       : sev === "medium" ? C.warn : C.safe;
}

// ─── Page helpers ─────────────────────────────────────────────────────────────

function drawFooter(doc: PDFKitDoc, pageNum: number, orgName: string, libVer?: string) {
  const y = PAGE_H - FOOTER_H;
  doc.rect(0, y, PAGE_W, FOOTER_H).fill(C.navy);
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const ver  = libVer ? ` · Library v${libVer}` : "";
  doc.fontSize(6.5).font("Helvetica").fillColor(C.gold)
     .text(`AiQ HR Capability Intelligence · ${orgName} · ${date}${ver} · CONFIDENTIAL`, MARGIN, y + 12, { width: CONTENT_W - 40 });
  doc.fontSize(6.5).font("Helvetica").fillColor(C.white)
     .text(`${pageNum}`, PAGE_W - MARGIN - 20, y + 12, { width: 20, align: "right" });
}

type HeaderCtx = { slideNum: string; title: string; subtitle: string; accentColour: string };

function newPage(
  doc: PDFKitDoc,
  counter: { n: number },
  orgName: string,
  libVer?: string,
  hdr?: HeaderCtx
) {
  drawFooter(doc, counter.n, orgName, libVer);
  doc.addPage();
  counter.n++;
  if (hdr) {
    // Re-draw the slide header on continuation pages so content is never behind the band
    slideHeader(doc, hdr.slideNum, hdr.title, hdr.subtitle + " (cont.)", hdr.accentColour);
  } else {
    // Draw a minimal navy band so doc.y is set correctly below it
    doc.rect(0, 0, PAGE_W, CONTENT_TOP - 16).fill(C.navy);
    doc.y = CONTENT_TOP;
  }
}

function needsPage(
  doc: PDFKitDoc,
  height: number,
  counter: { n: number },
  orgName: string,
  libVer?: string,
  hdr?: HeaderCtx
) {
  if (doc.y + height > CONTENT_BOTTOM) {
    newPage(doc, counter, orgName, libVer, hdr);
  }
}

// ─── Visual components ────────────────────────────────────────────────────────

/** Full-width slide header with coloured accent bar */
function slideHeader(doc: PDFKitDoc, slideNum: string, title: string, subtitle: string, accentColour: string) {
  // Accent bar top
  doc.rect(0, 0, PAGE_W, 6).fill(accentColour);
  // Header band
  doc.rect(0, 6, PAGE_W, 58).fill(C.navy);
  // Slide number badge
  doc.rect(MARGIN, 14, 28, 28).fill(accentColour);
  doc.fontSize(11).font("Helvetica-Bold").fillColor(C.navy)
     .text(slideNum, MARGIN, 21, { width: 28, align: "center" });
  // Title
  doc.fontSize(15).font("Helvetica-Bold").fillColor(C.white)
     .text(title, MARGIN + 36, 14, { width: CONTENT_W - 36 });
  // Subtitle
  doc.fontSize(8).font("Helvetica").fillColor(accentColour)
     .text(subtitle, MARGIN + 36, 34, { width: CONTENT_W - 36 });
  doc.y = 80;
}

/** AI commentary box with teal left border */
function aiCommentary(doc: PDFKitDoc, text: string, counter: { n: number }, orgName: string, libVer?: string, hdr?: HeaderCtx) {
  const lines = wrapText(text, 72);
  const boxH  = Math.max(44, lines.length * 11 + 16);
  needsPage(doc, boxH + 8, counter, orgName, libVer, hdr);
  const y = doc.y;
  // Background
  doc.rect(MARGIN, y, CONTENT_W, boxH).fill(C.tealPale);
  // Left accent
  doc.rect(MARGIN, y, 3, boxH).fill(C.teal);
  // "AI Commentary" label
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.teal)
     .text("AI COMMENTARY", MARGIN + 10, y + 5, { width: CONTENT_W - 20 });
  // Commentary text
  doc.fontSize(8).font("Helvetica").fillColor(C.navy)
     .text(text, MARGIN + 10, y + 16, { width: CONTENT_W - 20, lineGap: 2 });
  doc.y = y + boxH + 8;
}

/** KPI tile row */
function kpiRow(doc: PDFKitDoc, tiles: Array<{ label: string; value: string; sub?: string; colour?: string }>) {
  const tileW = CONTENT_W / tiles.length - 4;
  const tileH = 52;
  const y = doc.y;
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const x = MARGIN + i * (tileW + 4);
    const accent = t.colour ?? C.teal;
    doc.rect(x, y, tileW, tileH).fill(C.light).stroke(C.border);
    doc.rect(x, y, tileW, 3).fill(accent);
    doc.fontSize(6.5).font("Helvetica").fillColor(C.muted)
       .text(t.label.toUpperCase(), x + 8, y + 10, { width: tileW - 16 });
    doc.fontSize(16).font("Helvetica-Bold").fillColor(accent)
       .text(t.value, x + 8, y + 20, { width: tileW - 16 });
    if (t.sub) {
      doc.fontSize(6.5).font("Helvetica").fillColor(C.muted)
         .text(t.sub, x + 8, y + 40, { width: tileW - 16 });
    }
  }
  doc.y = y + tileH + 10;
}

/** Horizontal progress bar */
function progressBar(doc: PDFKitDoc, label: string, current: number | null, target: number | null, maxVal: number = 100) {
  const barX = MARGIN + 160;
  const barW = CONTENT_W - 160 - 50;
  const barH = 9;
  const y = doc.y;

  doc.fontSize(8).font("Helvetica").fillColor(C.slate)
     .text(label, MARGIN, y, { width: 155 });

  // Track
  doc.rect(barX, y + 1, barW, barH).fill(C.border);

  // Current fill
  if (current !== null) {
    const filled = Math.round((current / maxVal) * barW);
    const col = scoreColour(current);
    if (filled > 0) doc.rect(barX, y + 1, filled, barH).fill(col);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(scoreColour(current))
       .text(`${current}`, barX + barW + 6, y, { width: 30 });
  } else {
    doc.fontSize(7).font("Helvetica").fillColor(C.muted)
       .text("—", barX + barW + 6, y, { width: 30 });
  }

  // Target marker
  if (target !== null) {
    const tx = barX + Math.round((target / maxVal) * barW);
    doc.rect(tx - 1, y - 2, 2, barH + 4).fill(C.gold);
  }

  doc.y = y + 20;
}

/** Section divider line */
function sectionLabel(doc: PDFKitDoc, text: string) {
  doc.moveDown(0.4);
  const labelY = doc.y;
  doc.rect(MARGIN, labelY, CONTENT_W, 18).fill(C.navyMid);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(C.gold)
     .text(text.toUpperCase(), MARGIN + 8, labelY + 5, { width: CONTENT_W - 16 });
  doc.y = labelY + 24;
}

/** Bullet point */
function bullet(doc: PDFKitDoc, text: string, indent: number = 0) {
  doc.fontSize(8).font("Helvetica").fillColor(C.slate)
     .text(`•  ${text}`, MARGIN + indent, doc.y, { width: CONTENT_W - indent, lineGap: 1 });
  doc.moveDown(0.3);
}

/** Simple text wrapping estimator (chars per line) */
function wrapText(text: string, charsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).length > charsPerLine && line.length > 0) {
      lines.push(line);
      line = w;
    } else {
      line = line ? line + " " + w : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ─── AI Commentary Generator ──────────────────────────────────────────────────

async function generateCommentary(prompt: string): Promise<string> {
  try {
    const resp = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a senior HR strategy advisor writing concise, authoritative commentary for a board-level PDF presentation. 
Write in third person, present tense. Be specific, data-driven, and commercially astute. 
Maximum 3 sentences. No bullet points. No markdown. No em-dashes. Plain prose only.
Avoid vague language like "this is important" or "it is worth noting". Be direct and insightful.`,
        },
        { role: "user", content: prompt },
      ],
    });
    const raw = resp?.choices?.[0]?.message?.content ?? "";
    return typeof raw === "string" ? raw.trim() : "";
  } catch {
    return "";
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateBoardPackPDF(doc: PDFKitDoc, userId: string, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // ── 1. Fetch all data ──────────────────────────────────────────────────────

  const orgCtxRows = await db.select().from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, tenantId)).limit(1);
  const orgCtx = orgCtxRows[0] ?? null;

  const tenant = await getTenantById(tenantId);
  const orgName = tenant?.name ?? "Your Organisation";

  const businessAmbitionLevel: number = (orgCtx as any)?.businessAmbitionLevel ?? 3;
  const peopleAmbitionLevel:   number = (orgCtx as any)?.peopleAmbitionLevel   ?? 3;
  const ambitionTargetScore:   number | null = (orgCtx as any)?.ambitionTargetScore ?? null;
  const ambitionTargetDate:    string | null = (orgCtx as any)?.ambitionTargetDate  ?? null;
  const ambitionTargetLabel:   string | null = (orgCtx as any)?.ambitionTargetLabel ?? null;
  const strategyNarrative:     string | null = (orgCtx as any)?.strategyNarrative   ?? null;
  const visionStatement:       string | null = (orgCtx as any)?.visionStatement     ?? null;
  const sector:                string | null = (orgCtx as any)?.sector              ?? null;
  const headcount:             number | null = (orgCtx as any)?.headcount           ?? null;
  const orgSize:               string        = (orgCtx as any)?.orgSize             ?? "medium";
  const libVersion:            string | null = (orgCtx as any)?.libraryVersion      ?? null;

  let guidingPrinciples: Array<{ title: string; description: string }> = [];
  try { const r = (orgCtx as any)?.guidingPrinciplesJson; if (r) guidingPrinciples = typeof r === "string" ? JSON.parse(r) : r; } catch {}

  let wontDoItems: string[] = [];
  try { const r = (orgCtx as any)?.wontDoJson; if (r) wontDoItems = typeof r === "string" ? JSON.parse(r) : r; } catch {}

  let selectedInitiativeIds: string[] = [];
  try { const r = (orgCtx as any)?.selectedInitiativesJson; if (r) selectedInitiativeIds = typeof r === "string" ? JSON.parse(r) : r; } catch {}

  let operationalBaseline: Record<string, number | undefined> = {};
  try { const r = (orgCtx as any)?.operationalBaselineJson; if (r) operationalBaseline = typeof r === "string" ? JSON.parse(r) : r; } catch {}

  let structuredInputs: Record<string, any> = {};
  try { const r = (orgCtx as any)?.structuredInputsJson; if (r) structuredInputs = typeof r === "string" ? JSON.parse(r) : r; } catch {}

  let domainTargets: Record<DomainKey, number> = {} as Record<DomainKey, number>;
  try {
    const r = (orgCtx as any)?.domainTargetsJson;
    if (r) domainTargets = typeof r === "string" ? JSON.parse(r) : r;
  } catch {}
  if (!Object.keys(domainTargets).length) {
    const base = Math.round((businessAmbitionLevel * 0.55 + peopleAmbitionLevel * 0.45) * 20);
    for (const dk of DOMAIN_KEYS) domainTargets[dk] = Math.max(20, Math.min(100, base));
  }

  // Fetch assessment data
  const allUsers = await db.select({
    id: users.id,
    roleFamily: users.roleFamily,
    jobFunction: users.jobFunction,
    scoreBreakdownJson: assessmentScores.scoreBreakdownJson,
    overallScore: assessmentScores.overallScore,
    completedAt: assessmentSessions.completedAt,
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
  const userData: { id: string; overallScore: number; domainScores: Record<DomainKey, number>; roleFamily: string }[] = [];
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
      userData.push({ id: u.id, overallScore: parseFloat(String(u.overallScore)), domainScores, roleFamily: roleFamilyFromUserField(u.roleFamily ?? u.jobFunction) });
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

  // Resolve initiatives
  const allInitiatives = getAllInitiatives();
  const initiativeMap = new Map(allInitiatives.map(i => [i.initiative_id, i]));
  const resolvedIds = resolveInitiativeIds(selectedInitiativeIds);
  const selectedInits = resolvedIds.map(id => initiativeMap.get(id)).filter(Boolean) as typeof allInitiatives;

  // Financial calculations
  const ambitionTier: "cautious" | "progressive" | "transformative" =
    businessAmbitionLevel >= 4 ? "transformative" : businessAmbitionLevel >= 3 ? "progressive" : "cautious";
  const orgSizeSafe: "small" | "medium" | "large" | "enterprise" =
    ["small", "medium", "large", "enterprise"].includes(orgSize) ? orgSize as any : "medium";

  const costEnvelope   = selectedInits.length > 0 ? calculateCostEnvelope(selectedInitiativeIds, orgSizeSafe, ambitionTier) : null;
  const riskMatches    = selectedInits.length > 0 ? evaluateRiskRules({ selectedInitiativeIds, orgSize: orgSizeSafe, ambitionTier, hasExecSponsor: false, hasDataGovernanceInitiative: false }) : [];
  const valueEnvelope  = selectedInits.length > 0 ? calculateValueEnvelope(selectedInits, operationalBaseline, 36) : null;
  // financial_model, reinvestment_plan, and ceo_sponsorship are embedded in the ValueEnvelope return
  const financialModel = valueEnvelope?.financial_model ?? null;
  const reinvestment   = valueEnvelope?.reinvestment_plan ?? null;
  const ceoSponsorship = valueEnvelope?.ceo_sponsorship ?? null;

  const libMeta = getLibraryMeta();
  const libVer  = libVersion ?? libMeta.version;
  const reportDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const BUSINESS_LABELS: Record<number, string> = { 1: "Cautious", 2: "Exploratory", 3: "Progressive", 4: "Ambitious", 5: "Transformative" };
  const PEOPLE_LABELS:   Record<number, string> = { 1: "Followers", 2: "Adopters", 3: "Practitioners", 4: "Champions", 5: "Innovators" };
  const targetDateStr = ambitionTargetDate ? new Date(ambitionTargetDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "target date";

  const counter = { n: 1 };

  // ── Generate AI commentary in parallel ────────────────────────────────────
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
    // Cover
    generateCommentary(
      `Write a 2-sentence executive summary for a board presentation. Organisation: ${orgName}. Sector: ${sector ?? "not specified"}. Headcount: ${headcount ?? "not specified"}. Business AI ambition: ${BUSINESS_LABELS[businessAmbitionLevel]}. People AI ambition: ${PEOPLE_LABELS[peopleAmbitionLevel]}. Number of initiatives selected: ${selectedInits.length}. ${assessedCount} staff assessed. Current capability average: ${functionAvg ?? "not assessed"}. Target: ${ambitionTargetScore ?? "not set"}.`
    ),
    // Ambition
    generateCommentary(
      `Write a 2-sentence commentary on the strategic ambition for a board paper. Business AI ambition level: ${businessAmbitionLevel}/5 (${BUSINESS_LABELS[businessAmbitionLevel]}). People AI ambition: ${peopleAmbitionLevel}/5 (${PEOPLE_LABELS[peopleAmbitionLevel]}). Target capability score: ${ambitionTargetScore ?? "not set"} by ${targetDateStr}. Explain what this ambition level means in practice for the HR function and the business.`
    ),
    // Vision
    generateCommentary(
      `Write a 2-sentence commentary on the following AI People Strategy vision statement for a board presentation. Vision: "${visionStatement ?? "Not yet defined"}". Number of guiding principles: ${guidingPrinciples.length}. Number of exclusions defined: ${wontDoItems.length}. Comment on the clarity and strategic coherence of the vision.`
    ),
    // Capability
    generateCommentary(
      `Write a 2-sentence commentary on the HR function's AI capability baseline for a board paper. ${assessedCount} staff assessed. Overall average: ${functionAvg ?? "not assessed"}/100. Target: ${ambitionTargetScore ?? "not set"}. Gap: ${gap !== null ? gap : "unknown"}. ${gap !== null && gap > 15 ? "The gap is significant." : gap !== null && gap <= 0 ? "The function is on track." : "The gap is manageable."} Sector: ${sector ?? "not specified"}.`
    ),
    // Plan
    generateCommentary(
      `Write a 2-sentence commentary on the initiative portfolio for a board paper. ${selectedInits.length} initiatives selected across ${ambitionTier} ambition tier. Initiatives: ${selectedInits.slice(0, 5).map(i => (i as any).display_name).join(", ")}${selectedInits.length > 5 ? ` and ${selectedInits.length - 5} more` : ""}. Comment on the strategic coherence and phasing of the plan.`
    ),
    // Investment
    generateCommentary(
      `Write a 2-sentence commentary on the investment case for a board paper. Total estimated investment: ${costEnvelope ? `${fmtGBP(costEnvelope.totalMin * 1000)} to ${fmtGBP(costEnvelope.totalMax * 1000)}` : "not calculated"}. Organisation size: ${orgSizeSafe}. Ambition tier: ${ambitionTier}. Comment on whether this investment level is appropriate for the ambition and sector.`
    ),
    // Risk
    generateCommentary(
      `Write a 2-sentence commentary on the risk profile for a board paper. ${riskMatches.length} regulatory risks identified. ${riskMatches.filter(r => r.severity === "high" || r.severity === "very_high").length} high-severity risks. Key risks: ${riskMatches.slice(0, 3).map(r => r.displayName).join(", ") || "none identified"}. Comment on the risk posture and what the board should note.`
    ),
    // Value
    generateCommentary(
      `Write a 2-sentence commentary on the value case for a board paper. ${valueEnvelope ? `Quantified gross value over 3 years: ${fmtGBP(valueEnvelope.total_quantified_value_gbp.low)} to ${fmtGBP(valueEnvelope.total_quantified_value_gbp.high)}. Net value: ${fmtGBP(valueEnvelope.net_value_gbp.low)} to ${fmtGBP(valueEnvelope.net_value_gbp.high)}.` : "Value not yet calculated."} ${valueEnvelope?.qualitative_summary.bullet_points.length ?? 0} qualitative value items identified. Comment on the robustness of the value case.`
    ),
    // Financial model
    generateCommentary(
      `Write a 2-sentence commentary on the financial model for a board paper. ${financialModel ? `NPV range: ${fmtGBP(financialModel.npv_gbp.low)} to ${fmtGBP(financialModel.npv_gbp.high)}. IRR suppressed: ${financialModel.irr_suppressed ? "yes — use NPV and payback instead" : "no"}.` : "Financial model not yet calculated."} Comment on the financial attractiveness and what the board should focus on.`
    ),
    // Measurement
    generateCommentary(
      `Write a 2-sentence commentary on the measurement framework for a board paper. Measurement cadence: ${structuredInputs.measurement_cadence ?? "not specified"}. Pilot design: ${structuredInputs.pilot_design ?? "not specified"}. Comment on the governance and accountability arrangements for tracking AI strategy delivery.`
    ),
  ]);

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 0 — COVER
  // ══════════════════════════════════════════════════════════════════════════

  // Full-page navy background
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.navy);

  // Gold diagonal accent band
  doc.save();
  doc.polygon([0, PAGE_H * 0.55], [PAGE_W, PAGE_H * 0.42], [PAGE_W, PAGE_H * 0.58], [0, PAGE_H * 0.72]).fill(C.gold).opacity(0.12);
  doc.restore();

  // AiQ wordmark
  doc.fontSize(36).font("Helvetica-Bold").fillColor(C.white).text("AiQ", MARGIN, 80);
  doc.fontSize(10).font("Helvetica").fillColor(C.gold).text("Enterprise HR Capability Intelligence", MARGIN, 124);

  // Gold accent line
  doc.rect(MARGIN, 144, 60, 3).fill(C.gold);

  // Document title
  doc.fontSize(26).font("Helvetica-Bold").fillColor(C.white)
     .text("HR AI People Strategy", MARGIN, 164, { width: CONTENT_W });
  doc.fontSize(14).font("Helvetica").fillColor(C.gold)
     .text("Board Pack", MARGIN, 198, { width: CONTENT_W });

  // Org name + date
  doc.fontSize(11).font("Helvetica-Bold").fillColor(C.white)
     .text(orgName, MARGIN, 240, { width: CONTENT_W });
  doc.fontSize(9).font("Helvetica").fillColor("#A0AEC0")
     .text(reportDate, MARGIN, 258, { width: CONTENT_W });

  // Strategy label if set
  if (ambitionTargetLabel) {
    doc.rect(MARGIN, 290, CONTENT_W, 32).fill(C.teal);
    doc.fontSize(10).font("Helvetica-Bold").fillColor(C.white)
       .text(ambitionTargetLabel, MARGIN + 12, 302, { width: CONTENT_W - 24 });
  }

  // Executive summary box
  const summaryY = 345;
  doc.rect(MARGIN, summaryY, CONTENT_W, 120).fill(C.navyMid);
  doc.rect(MARGIN, summaryY, 3, 120).fill(C.gold);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(C.gold)
     .text("EXECUTIVE SUMMARY", MARGIN + 12, summaryY + 10);
  if (commentaryCover) {
    doc.fontSize(9).font("Helvetica").fillColor(C.white)
       .text(commentaryCover, MARGIN + 12, summaryY + 26, { width: CONTENT_W - 24, lineGap: 3 });
  }

  // Key stats row
  const statsY = summaryY + 136;
  const stats = [
    { label: "Initiatives", value: String(selectedInits.length) },
    { label: "Staff Assessed", value: assessedCount > 0 ? String(assessedCount) : "—" },
    { label: "Capability Avg", value: functionAvg !== null ? `${functionAvg}/100` : "—" },
    { label: "Ambition Target", value: ambitionTargetScore !== null ? `${ambitionTargetScore}/100` : "—" },
  ];
  const statW = CONTENT_W / stats.length;
  for (let i = 0; i < stats.length; i++) {
    const x = MARGIN + i * statW;
    doc.rect(x, statsY, statW - 4, 56).fill(C.navyMid);
    doc.fontSize(6.5).font("Helvetica").fillColor(C.gold)
       .text(stats[i].label.toUpperCase(), x + 8, statsY + 8, { width: statW - 16 });
    doc.fontSize(18).font("Helvetica-Bold").fillColor(C.white)
       .text(stats[i].value, x + 8, statsY + 22, { width: statW - 16 });
  }

  // Confidential footer
  doc.fontSize(7).font("Helvetica").fillColor("#718096")
     .text(`CONFIDENTIAL · ${reportDate} · AiQ HR Capability Intelligence · Content Library v${libVer}`,
       MARGIN, PAGE_H - 30, { width: CONTENT_W, align: "center" });

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 1 — STRATEGIC CONTEXT
  // ══════════════════════════════════════════════════════════════════════════
  newPage(doc, counter, orgName, libVer);
  slideHeader(doc, "01", "Strategic Context", "Ambition levels, configuration, and strategic intent", C.teal);
  const hdr01: HeaderCtx = { slideNum: "01", title: "Strategic Context", subtitle: "Ambition levels, configuration, and strategic intent", accentColour: C.teal };

  // Ambition tiles
  kpiRow(doc, [
    { label: "Business AI Ambition", value: `${businessAmbitionLevel}/5`, sub: BUSINESS_LABELS[businessAmbitionLevel], colour: C.teal },
    { label: "People AI Ambition",   value: `${peopleAmbitionLevel}/5`,   sub: PEOPLE_LABELS[peopleAmbitionLevel],   colour: C.gold },
    { label: "Capability Target",    value: ambitionTargetScore !== null ? `${ambitionTargetScore}` : "—", sub: `By ${targetDateStr}`, colour: C.navy },
    { label: "Sector",               value: sector ? sector.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "—", sub: headcount ? `${headcount.toLocaleString()} employees` : "", colour: C.slate },
  ]);

  // Strategy narrative
  if (strategyNarrative) {
    needsPage(doc, 60, counter, orgName, libVer, hdr01);
    sectionLabel(doc, "Strategic Intent");
    doc.rect(MARGIN, doc.y, CONTENT_W, 50).fill(C.goldPale);
    doc.rect(MARGIN, doc.y, 3, 50).fill(C.gold);
    doc.fontSize(9).font("Helvetica-BoldOblique").fillColor(C.navy)
       .text(`"${strategyNarrative}"`, MARGIN + 12, doc.y + 8, { width: CONTENT_W - 24, lineGap: 2 });
    doc.y += 60;
  }

  // Ambition matrix description
  needsPage(doc, 80, counter, orgName, libVer, hdr01);
  sectionLabel(doc, "What This Ambition Level Means");
  const ambitionDescriptions: Record<string, string> = {
    "1_1": "Conservative adoption — AI tools used selectively, HR team focused on compliance and risk management. Low disruption, low investment.",
    "2_2": "Exploratory adoption — piloting AI tools in 1–2 HR processes, HR team building foundational awareness.",
    "3_3": "Progressive adoption — AI embedded across core HR processes, HR team actively leading adoption and capability building.",
    "4_4": "Ambitious adoption — AI-first HR operating model, HR team as internal AI champions and change agents.",
    "5_5": "Transformative adoption — HR function fully reimagined around AI, leading organisation-wide AI workforce strategy.",
  };
  const ambKey = `${businessAmbitionLevel}_${peopleAmbitionLevel}`;
  const nearestKey = Object.keys(ambitionDescriptions).sort((a, b) => {
    const [ab, ap] = a.split("_").map(Number);
    const [bb, bp] = b.split("_").map(Number);
    return (Math.abs(ab - businessAmbitionLevel) + Math.abs(ap - peopleAmbitionLevel)) -
           (Math.abs(bb - businessAmbitionLevel) + Math.abs(bp - peopleAmbitionLevel));
  })[0];
  doc.fontSize(8.5).font("Helvetica").fillColor(C.slate)
     .text(ambitionDescriptions[ambKey] ?? ambitionDescriptions[nearestKey] ?? "", MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
  doc.moveDown(0.8);

  if (commentaryAmbition) aiCommentary(doc, commentaryAmbition, counter, orgName, libVer, hdr01);


  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 2 — VISION & GUIDING PRINCIPLES
  // ══════════════════════════════════════════════════════════════════════════
  newPage(doc, counter, orgName, libVer);
  slideHeader(doc, "02", "Vision & Guiding Principles", "Where we are going and how we will get there", C.gold);
  const hdr02: HeaderCtx = { slideNum: "02", title: "Vision & Guiding Principles", subtitle: "Where we are going and how we will get there", accentColour: C.gold };

  if (visionStatement) {
    needsPage(doc, 70, counter, orgName, libVer, hdr02);
    sectionLabel(doc, "AI People Strategy Vision");
    const visionH = Math.max(60, Math.ceil(visionStatement.length / 80) * 14 + 20);
    doc.rect(MARGIN, doc.y, CONTENT_W, visionH).fill(C.navy);
    doc.rect(MARGIN, doc.y, 4, visionH).fill(C.gold);
    doc.fontSize(10).font("Helvetica-BoldOblique").fillColor(C.white)
       .text(`"${visionStatement}"`, MARGIN + 14, doc.y + 10, { width: CONTENT_W - 28, lineGap: 3 });
    doc.y += visionH + 10;
  } else {
    sectionLabel(doc, "AI People Strategy Vision");
    doc.fontSize(8).font("Helvetica-Oblique").fillColor(C.muted)
       .text("Vision statement not yet defined.", MARGIN, doc.y);
    doc.moveDown(0.8);
  }

  if (commentaryVision) aiCommentary(doc, commentaryVision, counter, orgName, libVer, hdr02);

  if (guidingPrinciples.length > 0) {
    needsPage(doc, 40, counter, orgName, libVer, hdr02);
    sectionLabel(doc, "Guiding Principles");
    for (const p of guidingPrinciples) {
      needsPage(doc, 36, counter, orgName, libVer, hdr02);
      const pY = doc.y;
      doc.rect(MARGIN, pY, 3, 28).fill(C.teal);
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor(C.navy)
         .text(p.title, MARGIN + 10, pY, { width: CONTENT_W - 10 });
      doc.fontSize(7.5).font("Helvetica").fillColor(C.slate)
         .text(p.description, MARGIN + 10, pY + 14, { width: CONTENT_W - 10, lineGap: 1 });
      doc.y = pY + 34;
    }
  }

  if (wontDoItems.length > 0) {
    needsPage(doc, 30 + wontDoItems.length * 16, counter, orgName, libVer, hdr02);
    sectionLabel(doc, "What We Won't Do — Strategic Exclusions");
    for (const item of wontDoItems) {
      needsPage(doc, 18, counter, orgName, libVer, hdr02);
      doc.rect(MARGIN, doc.y, 14, 14).fill(C.danger);
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor(C.white)
         .text("✕", MARGIN + 3, doc.y - 10, { width: 14, align: "center" });
      doc.fontSize(8).font("Helvetica").fillColor(C.slate)
         .text(item, MARGIN + 20, doc.y - 14, { width: CONTENT_W - 20 });
      doc.moveDown(0.5);
    }
  }


  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 3 — CAPABILITY BASELINE
  // ══════════════════════════════════════════════════════════════════════════
  newPage(doc, counter, orgName, libVer);
  slideHeader(doc, "03", "Capability Baseline", "Current AI readiness vs roadmap targets by domain", C.teal);
  const hdr03: HeaderCtx = { slideNum: "03", title: "Capability Baseline", subtitle: "Current AI readiness vs roadmap targets by domain", accentColour: C.teal };

  kpiRow(doc, [
    { label: "Staff Assessed",   value: assessedCount > 0 ? String(assessedCount) : "—", colour: C.teal },
    { label: "Current Average",  value: functionAvg !== null ? `${functionAvg}` : "—",   colour: scoreColour(functionAvg ?? 0) },
    { label: "Ambition Target",  value: ambitionTargetScore !== null ? `${ambitionTargetScore}` : "—", colour: C.gold },
    { label: "Gap to Close",     value: gap !== null ? (gap > 0 ? `+${gap}` : `${gap}`) : "—", sub: gap !== null ? (gap <= 0 ? "On track" : "Action required") : "", colour: gap !== null && gap <= 0 ? C.safe : C.danger },
  ]);

  sectionLabel(doc, "Domain Capability vs Roadmap Targets");
  doc.fontSize(7).font("Helvetica").fillColor(C.muted)
     .text("Gold marker (|) = roadmap target score", MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.4);

  for (const dk of DOMAIN_KEYS) {
    needsPage(doc, 24, counter, orgName, libVer, hdr03);
    progressBar(doc, DOMAIN_LABELS[dk], domainAvgs[dk], domainTargets[dk] ?? null);
  }

  // Bar legend
  doc.moveDown(0.2);
  doc.fontSize(7).font("Helvetica").fillColor(C.muted)
     .text("Score guide: ", MARGIN, doc.y, { continued: true });
  doc.fillColor(C.safe).text("75+ Strong  ", { continued: true });
  doc.fillColor(C.warn).text("50–74 Developing  ", { continued: true });
  doc.fillColor(C.danger).text("0–49 Gap  ", { continued: true });
  doc.fillColor(C.gold).text("| Target");
  doc.moveDown(0.8);

  if (commentaryCapability) aiCommentary(doc, commentaryCapability, counter, orgName, libVer, hdr03);


  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 4 — INITIATIVE PORTFOLIO
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedInits.length > 0) {
    newPage(doc, counter, orgName, libVer);
    slideHeader(doc, "04", "Initiative Portfolio", `${selectedInits.length} initiatives across ${ambitionTier} ambition tier`, C.teal);
    const hdr04: HeaderCtx = { slideNum: "04", title: "Initiative Portfolio", subtitle: `${selectedInits.length} initiatives across ${ambitionTier} ambition tier`, accentColour: C.teal };

    if (commentaryPlan) aiCommentary(doc, commentaryPlan, counter, orgName, libVer, hdr04);

    const phases: Record<string, typeof allInitiatives> = { phase_1: [], phase_2: [], phase_3: [] };
    for (const init of selectedInits) {
      const typicalPhase = (init as any).typical_phase ?? "foundation";
      const ph = typicalPhase === "scale" || typicalPhase === "optimise" ? "phase_3"
               : typicalPhase === "build" ? "phase_2"
               : "phase_1";
      if (!phases[ph]) phases[ph] = [];
      phases[ph].push(init);
    }
    const phaseConfig = [
      { key: "phase_1", label: "Phase 1 — Foundation", period: "0–6 months",  colour: C.teal },
      { key: "phase_2", label: "Phase 2 — Build",      period: "6–12 months", colour: C.gold },
      { key: "phase_3", label: "Phase 3 — Scale",      period: "12–18 months",colour: C.navy },
    ];

    for (const ph of phaseConfig) {
      const inits = phases[ph.key];
      if (!inits || inits.length === 0) continue;
      needsPage(doc, 28 + inits.length * 30, counter, orgName, libVer, hdr04);
      sectionLabel(doc, `${ph.label} · ${ph.period}`);
      for (const init of inits) {
        needsPage(doc, 32, counter, orgName, libVer, hdr04);
        const iY = doc.y;
        doc.rect(MARGIN, iY, 3, 26).fill(ph.colour);
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor(C.navy)
           .text((init as any).display_name ?? init.initiative_id, MARGIN + 10, iY, { width: CONTENT_W - 10 });
        const desc = (init as any).short_description ?? (init as any).description ?? "";
        if (desc) {
          doc.fontSize(7.5).font("Helvetica").fillColor(C.slate)
             .text(desc.slice(0, 200) + (desc.length > 200 ? "\u2026" : ""), MARGIN + 10, iY + 13, { width: CONTENT_W - 10, lineGap: 1 });
        }
        doc.y = iY + 30;
      }
    }

  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 5 — INVESTMENT & COST ENVELOPE
  // ══════════════════════════════════════════════════════════════════════════
  if (costEnvelope) {
    newPage(doc, counter, orgName, libVer);
    slideHeader(doc, "05", "Investment & Cost Envelope", "Total cost of ownership by phase and category", C.gold);
    const hdr05: HeaderCtx = { slideNum: "05", title: "Investment & Cost Envelope", subtitle: "Total cost of ownership by phase and category", accentColour: C.gold };

    kpiRow(doc, [
      { label: "Total Investment (Low)",  value: fmtGBP(costEnvelope.totalMin * 1000), colour: C.teal },
      { label: "Total Investment (High)", value: fmtGBP(costEnvelope.totalMax * 1000), colour: C.gold },
      { label: "Phases",                  value: String(costEnvelope.byPhase.filter(p => p.maxGbk > 0).length), colour: C.slate },
      { label: "Initiatives",             value: String(selectedInits.length), colour: C.navy },
    ]);

    if (commentaryInvestment) aiCommentary(doc, commentaryInvestment, counter, orgName, libVer, hdr05);

    sectionLabel(doc, "Cost by Phase");
    for (const phase of costEnvelope.byPhase) {
      needsPage(doc, 22, counter, orgName, libVer, hdr05);
      const barX = MARGIN + 160;
      const barW = CONTENT_W - 160 - 80;
      const barH = 9;
      const y = doc.y;
      doc.fontSize(8).font("Helvetica").fillColor(C.slate)
         .text(phase.label, MARGIN, y, { width: 155 });
      doc.rect(barX, y + 1, barW, barH).fill(C.border);
      const maxK = costEnvelope.totalMax > 0 ? costEnvelope.totalMax : 1;
      const filled = Math.round((phase.maxGbk / maxK) * barW);
      if (filled > 0) doc.rect(barX, y + 1, filled, barH).fill(C.teal);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(C.navy)
         .text(`£${Math.round(phase.minGbk)}k – £${Math.round(phase.maxGbk)}k`, barX + barW + 6, y, { width: 80 });
      doc.y = y + 20;
    }

    // TCO breakdown if available
    if ((costEnvelope as any).tco) {
      const tco = (costEnvelope as any).tco;
      needsPage(doc, 80, counter, orgName, libVer, hdr05);
      sectionLabel(doc, "Total Cost of Ownership Breakdown");
      const tcoItems = [
        { label: "Implementation",    value: tco.implementation_gbp },
        { label: "Change Management", value: tco.change_management_gbp },
        { label: "Training",          value: tco.training_gbp },
        { label: "Internal Resource", value: tco.internal_resource_gbp },
        { label: "Ongoing Annual",    value: tco.ongoing_annual_gbp },
      ].filter(i => i.value);
      for (const item of tcoItems) {
        needsPage(doc, 18, counter, orgName, libVer, hdr05);
        doc.fontSize(8).font("Helvetica").fillColor(C.slate)
           .text(item.label, MARGIN, doc.y, { continued: true, width: 180 });
        doc.font("Helvetica-Bold").fillColor(C.navy)
           .text(fmtGBP(item.value), { width: 100 });
        doc.moveDown(0.3);
      }
    }

  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 6 — RISK REGISTER
  // ══════════════════════════════════════════════════════════════════════════
  if (riskMatches.length > 0) {
    newPage(doc, counter, orgName, libVer);
    slideHeader(doc, "06", "Risk Register", `${riskMatches.length} regulatory and implementation risks identified`, C.danger);
    const hdr06: HeaderCtx = { slideNum: "06", title: "Risk Register", subtitle: `${riskMatches.length} regulatory and implementation risks identified`, accentColour: C.danger };

    const highRisks = riskMatches.filter(r => r.severity === "high" || r.severity === "very_high").length;
    kpiRow(doc, [
      { label: "Total Risks",   value: String(riskMatches.length), colour: C.slate },
      { label: "High Severity", value: String(highRisks),          colour: highRisks > 0 ? C.danger : C.safe },
      { label: "Medium",        value: String(riskMatches.filter(r => r.severity === "medium").length), colour: C.warn },
      { label: "Low",           value: String(riskMatches.filter(r => r.severity === "low").length),    colour: C.safe },
    ]);

    if (commentaryRisk) aiCommentary(doc, commentaryRisk, counter, orgName, libVer, hdr06);

    sectionLabel(doc, "Risk Detail");
    for (const risk of riskMatches) {
      needsPage(doc, 50, counter, orgName, libVer, hdr06);
      const sevCol = severityColour(risk.severity);
      const rY = doc.y;
      // Severity badge
      doc.rect(MARGIN, rY, 48, 16).fill(sevCol);
      doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
         .text(risk.severity.replace("_", " ").toUpperCase(), MARGIN + 2, rY + 4, { width: 44, align: "center" });
      // Risk name
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor(C.navy)
         .text(risk.displayName, MARGIN + 54, rY, { width: CONTENT_W - 54 });
      doc.fontSize(7.5).font("Helvetica").fillColor(C.slate)
         .text(risk.riskStatement, MARGIN + 54, rY + 13, { width: CONTENT_W - 54, lineGap: 1 });
      doc.fontSize(7).font("Helvetica-Oblique").fillColor(C.teal)
         .text(`Recommended: ${risk.recommendedAction}`, MARGIN + 54, doc.y + 2, { width: CONTENT_W - 54 });
      doc.moveDown(0.8);
    }

  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 7 — VALUE CASE
  // ══════════════════════════════════════════════════════════════════════════
  if (valueEnvelope) {
    newPage(doc, counter, orgName, libVer);
    slideHeader(doc, "07", "Value Case", "Quantified and qualitative value over 3 years", C.safe);
    const hdr07: HeaderCtx = { slideNum: "07", title: "Value Case", subtitle: "Quantified and qualitative value over 3 years", accentColour: C.safe };

    const hasQ = valueEnvelope.total_quantified_value_gbp.high > 0;
    kpiRow(doc, [
      { label: "Gross Value (Low)",  value: hasQ ? fmtGBP(valueEnvelope.total_quantified_value_gbp.low)  : "—", colour: C.teal },
      { label: "Gross Value (High)", value: hasQ ? fmtGBP(valueEnvelope.total_quantified_value_gbp.high) : "—", colour: C.safe },
      { label: "Net Value (High)",   value: hasQ ? fmtGBP(valueEnvelope.net_value_gbp.high) : "—", colour: valueEnvelope.net_value_gbp.high >= 0 ? C.safe : C.danger },
      { label: "Qualitative Items",  value: String(valueEnvelope.qualitative_summary.capability_uplift_count + valueEnvelope.qualitative_summary.risk_avoidance_count + valueEnvelope.qualitative_summary.strategic_count), colour: C.gold },
    ]);

    if (commentaryValue) aiCommentary(doc, commentaryValue, counter, orgName, libVer, hdr07);

    sectionLabel(doc, "Per-Initiative Value Breakdown");
    for (const item of valueEnvelope.by_initiative) {
      needsPage(doc, 32, counter, orgName, libVer, hdr07);
      const iY = doc.y;
      const hasValue = !!item.quantified_value_gbp;
      doc.rect(MARGIN, iY, 3, 26).fill(hasValue ? C.safe : C.gold);
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor(C.navy)
         .text(item.display_name, MARGIN + 10, iY, { width: CONTENT_W - 120 });
      const valStr = item.quantified_value_gbp
        ? `${fmtGBP(item.quantified_value_gbp.low)} – ${fmtGBP(item.quantified_value_gbp.high)}`
        : "Qualitative";
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor(hasValue ? C.safe : C.gold)
         .text(valStr, MARGIN + CONTENT_W - 110, iY, { width: 110, align: "right" });
      if (item.monetisation_breakdown) {
        doc.fontSize(7).font("Helvetica-Oblique").fillColor(C.muted)
           .text(item.monetisation_breakdown, MARGIN + 10, iY + 14, { width: CONTENT_W - 10, lineGap: 1 });
      } else if (item.qualitative_value.length > 0) {
        doc.fontSize(7).font("Helvetica-Oblique").fillColor(C.muted)
           .text(item.qualitative_value.slice(0, 2).join(" · "), MARGIN + 10, iY + 14, { width: CONTENT_W - 10 });
      }
      doc.y = iY + 30;
    }

    if (valueEnvelope.qualitative_summary.bullet_points.length > 0) {
      needsPage(doc, 30, counter, orgName, libVer, hdr07);
      sectionLabel(doc, "Qualitative Value Highlights");
      for (const b of valueEnvelope.qualitative_summary.bullet_points.slice(0, 6)) {
        needsPage(doc, 18, counter, orgName, libVer, hdr07);
        bullet(doc, b);
      }
    }

    // Caveat
    needsPage(doc, 24, counter, orgName, libVer, hdr07);
    doc.moveDown(0.3);
    doc.rect(MARGIN, doc.y, CONTENT_W, 20).fill(C.warnPale);
    doc.fontSize(7).font("Helvetica-Oblique").fillColor(C.warn)
       .text(`Note: ${valueEnvelope.caveat}`, MARGIN + 8, doc.y + 5, { width: CONTENT_W - 16 });
    doc.y += 26;

  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 8 — FINANCIAL MODEL
  // ══════════════════════════════════════════════════════════════════════════
  if (financialModel) {
    newPage(doc, counter, orgName, libVer);
    slideHeader(doc, "08", "Financial Model", "NPV, payback period, and scenario analysis", C.navy);
    const hdr08: HeaderCtx = { slideNum: "08", title: "Financial Model", subtitle: "NPV, payback period, and scenario analysis", accentColour: C.navy };

    const pb = valueEnvelope?.payback_period_months ?? null;
    kpiRow(doc, [
      { label: "NPV (Optimistic)",  value: fmtGBP(financialModel.npv_gbp.high),    colour: C.safe },
      { label: "NPV (Pessimistic)", value: fmtGBP(financialModel.npv_gbp.low),     colour: financialModel.npv_gbp.low >= 0 ? C.safe : C.danger },
      { label: financialModel.irr_suppressed ? "Payback Period" : "IRR",
        value: financialModel.irr_suppressed
          ? (pb ? `${pb.low}–${pb.high} mo` : "—")
          : (financialModel.irr_pct ? `${Math.round(financialModel.irr_pct.low)}–${Math.round(financialModel.irr_pct.high)}%` : "—"),
        sub: financialModel.irr_suppressed ? "Use NPV for board" : undefined,
        colour: C.gold },
    ]);

    if (commentaryFinancial) aiCommentary(doc, commentaryFinancial, counter, orgName, libVer, hdr08);

    // IRR suppression notice
    if (financialModel.irr_suppressed) {
      needsPage(doc, 28, counter, orgName, libVer, hdr08);
      doc.rect(MARGIN, doc.y, CONTENT_W, 22).fill(C.warnPale);
      doc.rect(MARGIN, doc.y, 3, 22).fill(C.warn);
      doc.fontSize(7.5).font("Helvetica").fillColor(C.warn)
         .text("IRR exceeds 100% and has been suppressed. Use NPV and payback period for board presentations — these are more credible metrics for AI investment cases.", MARGIN + 10, doc.y + 5, { width: CONTENT_W - 20 });
      doc.y += 28;
    }

    // Scenario analysis
    const scenarioAnalysis = valueEnvelope?.scenario_analysis ?? null;
    if (scenarioAnalysis) {
      needsPage(doc, 60, counter, orgName, libVer, hdr08);
      sectionLabel(doc, "Scenario Analysis");
      const scenarios = [
        { label: "Pessimistic",  data: scenarioAnalysis.pessimistic, colour: C.danger },
        { label: "Base Case",    data: scenarioAnalysis.base,        colour: C.teal   },
        { label: "Optimistic",   data: scenarioAnalysis.optimistic,  colour: C.safe   },
      ];
      const scW = (CONTENT_W - 8) / 3;
      const scY = doc.y;
      for (let i = 0; i < scenarios.length; i++) {
        const sc = scenarios[i];
        const x = MARGIN + i * (scW + 4);
        doc.rect(x, scY, scW, 80).fill(C.light).stroke(C.border);
        doc.rect(x, scY, scW, 4).fill(sc.colour);
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(sc.colour)
           .text(sc.label.toUpperCase(), x + 8, scY + 10, { width: scW - 16 });
        if (sc.data) {
          const roiStr = sc.data.roi_pct >= 500 ? ">500%" : `${Math.round(sc.data.roi_pct)}%`;
          doc.fontSize(14).font("Helvetica-Bold").fillColor(C.navy)
             .text(roiStr, x + 8, scY + 24, { width: scW - 16 });
          doc.fontSize(7).font("Helvetica").fillColor(C.muted)
             .text("ROI", x + 8, scY + 44, { width: scW - 16 });
          doc.fontSize(8).font("Helvetica-Bold").fillColor(C.slate)
             .text(fmtGBP(sc.data.net_gbp), x + 8, scY + 56, { width: scW - 16 });
          doc.fontSize(7).font("Helvetica").fillColor(C.muted)
             .text("Net 3-yr value", x + 8, scY + 68, { width: scW - 16 });
        }
      }
      doc.y = scY + 88;

      // ROI cap note
      const hasCapped = scenarioAnalysis.optimistic?.roi_pct >= 500 || scenarioAnalysis.base?.roi_pct >= 500;
      if (hasCapped) {
        needsPage(doc, 20, counter, orgName, libVer, hdr08);
        doc.fontSize(7).font("Helvetica-Oblique").fillColor(C.muted)
           .text(">500% ROI reflects 3-year compounding of multiple initiatives. Validate with Finance before board presentation.", MARGIN, doc.y, { width: CONTENT_W });
        doc.moveDown(0.5);
      }
    }

  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 9 — REINVESTMENT PLAN & CEO SPONSORSHIP
  // ══════════════════════════════════════════════════════════════════════════
  if (reinvestment || ceoSponsorship?.required) {
    newPage(doc, counter, orgName, libVer);
    slideHeader(doc, "09", "Reinvestment Plan & Governance", "Value reinvestment strategy and executive sponsorship", C.teal);
    const hdr09: HeaderCtx = { slideNum: "09", title: "Reinvestment Plan & Governance", subtitle: "Value reinvestment strategy and executive sponsorship", accentColour: C.teal };

    if (reinvestment) {
      sectionLabel(doc, `Reinvestment Plan — ${reinvestment.case === "both_positive" ? "Value Reinvestment" : reinvestment.case === "straddles_zero" ? "Selective Reinvestment" : "Foundation Investment"}`);
      needsPage(doc, 60, counter, orgName, libVer, hdr09);
      const reinvY = doc.y;
      doc.rect(MARGIN, reinvY, CONTENT_W, 50).fill(C.tealPale);
      doc.rect(MARGIN, reinvY, 3, 50).fill(C.teal);
      doc.fontSize(9).font("Helvetica-Bold").fillColor(C.navy)
         .text(reinvestment.headline, MARGIN + 10, reinvY + 6, { width: CONTENT_W - 20 });
      doc.fontSize(7.5).font("Helvetica").fillColor(C.slate)
         .text(reinvestment.narrative, MARGIN + 10, reinvY + 22, { width: CONTENT_W - 20, lineGap: 2 });
      doc.y = reinvY + 56;

      if (reinvestment.suggested_reinvestment_gbp) {
        needsPage(doc, 24, counter, orgName, libVer, hdr09);
        doc.fontSize(8).font("Helvetica").fillColor(C.slate)
           .text("Suggested reinvestment: ", MARGIN, doc.y, { continued: true });
        doc.font("Helvetica-Bold").fillColor(C.teal)
           .text(fmtGBP(reinvestment.suggested_reinvestment_gbp));
        doc.moveDown(0.5);
      }

      if (reinvestment.phase2_focus_areas && reinvestment.phase2_focus_areas.length > 0) {
        needsPage(doc, 20 + reinvestment.phase2_focus_areas.length * 16, counter, orgName, libVer, hdr09);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(C.navy)
           .text("Phase 2 Focus Areas:", MARGIN, doc.y);
        doc.moveDown(0.3);
        for (const area of reinvestment.phase2_focus_areas) {
          needsPage(doc, 16, counter, orgName, libVer, hdr09);
          bullet(doc, area);
        }
      }
    }

    if (ceoSponsorship?.required) {
      needsPage(doc, 60, counter, orgName, libVer, hdr09);
      sectionLabel(doc, "CEO Sponsorship Recommendation");
      const ceoY = doc.y;
      doc.rect(MARGIN, ceoY, CONTENT_W, 50).fill(C.goldPale);
      doc.rect(MARGIN, ceoY, 3, 50).fill(C.gold);
      doc.fontSize(9).font("Helvetica-Bold").fillColor(C.navy)
         .text("CEO Sponsorship Recommended", MARGIN + 10, ceoY + 6, { width: CONTENT_W - 20 });
      doc.fontSize(7.5).font("Helvetica").fillColor(C.slate)
         .text(ceoSponsorship.rationale, MARGIN + 10, ceoY + 22, { width: CONTENT_W - 20, lineGap: 2 });
      doc.y = ceoY + 56;

      if (ceoSponsorship.suggested_framing) {
        needsPage(doc, 28, counter, orgName, libVer, hdr09);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(C.navy)
           .text("Suggested Framing for CEO:", MARGIN, doc.y);
        doc.moveDown(0.3);
        bullet(doc, ceoSponsorship.suggested_framing);
      }
      if (ceoSponsorship.trigger) {
        needsPage(doc, 16, counter, orgName, libVer, hdr09);
        doc.fontSize(7).font("Helvetica-Oblique").fillColor(C.muted)
           .text(`Trigger: ${ceoSponsorship.trigger}`, MARGIN, doc.y, { width: CONTENT_W });
        doc.moveDown(0.4);
      }
    }

  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 10 — MEASUREMENT FRAMEWORK
  // ══════════════════════════════════════════════════════════════════════════
  newPage(doc, counter, orgName, libVer);
  slideHeader(doc, "10", "Measurement Framework", "KPIs, cadence, and pilot design", C.teal);
  const hdr10: HeaderCtx = { slideNum: "10", title: "Measurement Framework", subtitle: "KPIs, cadence, and pilot design", accentColour: C.teal };

  if (commentaryMeasurement) aiCommentary(doc, commentaryMeasurement, counter, orgName, libVer, hdr10);

  const cadenceLabels: Record<string, string> = {
    monthly:   "Monthly — high-frequency tracking with monthly KPI reviews",
    quarterly: "Quarterly — standard cadence with quarterly business reviews",
    biannual:  "Bi-annual — twice-yearly deep-dive assessments",
    annual:    "Annual — yearly strategic review cycle",
  };
  const pilotLabels: Record<string, string> = {
    single_team:    "Single Team Pilot — validate with one team before broader rollout",
    department:     "Department Pilot — test across a full department",
    business_unit:  "Business Unit Pilot — pilot within a defined business unit",
    phased_rollout: "Phased Rollout — sequential deployment across the organisation",
    big_bang:       "Big Bang — organisation-wide simultaneous deployment",
  };

  sectionLabel(doc, "Governance Configuration");
  const govItems = [
    { label: "Measurement Cadence", value: cadenceLabels[structuredInputs.measurement_cadence] ?? structuredInputs.measurement_cadence ?? "Not specified" },
    { label: "Pilot Design",        value: pilotLabels[structuredInputs.pilot_design]           ?? structuredInputs.pilot_design           ?? "Not specified" },
    { label: "Risk Appetite",       value: structuredInputs.risk_appetite ?? "Not specified" },
    { label: "HR Leadership Position", value: structuredInputs.hr_leadership_position ?? "Not specified" },
  ];
  for (const item of govItems) {
    needsPage(doc, 20, counter, orgName, libVer, hdr10);
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(C.navy)
       .text(item.label + ": ", MARGIN, doc.y, { continued: true, width: 160 });
    doc.font("Helvetica").fillColor(C.slate)
       .text(item.value, { width: CONTENT_W - 160 });
    doc.moveDown(0.4);
  }

  sectionLabel(doc, "Recommended KPI Framework");
  const kpiFramework = [
    "Adoption rate: % of target users actively using AI tools within 90 days",
    "Quality delta: measurable improvement in output quality vs pre-AI baseline",
    "Time savings: hours saved per FTE per week on targeted processes",
    "Error reduction: % reduction in process errors or rework",
    "Capability score: quarterly AiQ assessment score trajectory vs target",
    "Employee sentiment: AI confidence index from pulse surveys",
    "Business outcome: primary business metric tied to each initiative",
  ];
  for (const kpi of kpiFramework) {
    needsPage(doc, 16, counter, orgName, libVer, hdr10);
    bullet(doc, kpi);
  }


  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 11 — METHODOLOGY & ASSUMPTIONS
  // ══════════════════════════════════════════════════════════════════════════
  newPage(doc, counter, orgName, libVer);
  slideHeader(doc, "11", "Methodology & Assumptions", "Data sources, calculation methodology, and key assumptions", C.slate);
  const hdr11: HeaderCtx = { slideNum: "11", title: "Methodology & Assumptions", subtitle: "Data sources, calculation methodology, and key assumptions", accentColour: C.slate };

  sectionLabel(doc, "Calculation Methodology");
  const methodItems = [
    "Value calculations use a 3-year horizon with an 8% discount rate (WACC proxy).",
    "Labour cost savings use UK 2026 benchmarks: HR Generalist £45,000/yr, Line Manager £55,000/yr, Employee average salary £37,500/yr.",
    "Per-employee-served cost (hr_cost_per_fte_gbp) = total HR function cost ÷ total headcount, benchmarked at £1,400.",
    "Improvement percentages sourced from CIPD, McKinsey, Deloitte, and Gartner research (2023–2025).",
    "Attrition attribution factor of 25% applied — HR AI is one of multiple retention levers.",
    "Onboarding productivity value uses employee daily salary rate (£212/day for £55k hire) × ramp-up days saved.",
    "AI Literacy Programme classified as qualitative/strategic value — L&D budget does not reduce in practice.",
    "IRR suppressed when > 100% — payback period is a more credible metric for AI investment cases.",
    "Scenario analysis: pessimistic = low value × 0.7 + high cost × 1.3; optimistic = high value × 1.2 + low cost × 0.85.",
    "ROI display capped at 500% — use NPV for board presentations.",
  ];
  for (const item of methodItems) {
    needsPage(doc, 16, counter, orgName, libVer, hdr11);
    bullet(doc, item);
  }

  sectionLabel(doc, "Data Sources");
  const dataSources = [
    `Content Library v${libVer} — ${libMeta.content_counts?.initiatives ?? 0} initiatives, built ${new Date(libMeta.built_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    `Assessment data: ${assessedCount} staff assessed as of ${reportDate}`,
    "CIPD People Profession Survey 2024 — HR capability benchmarks",
    "McKinsey Global Institute — AI productivity impact estimates",
    "Deloitte Global Human Capital Trends 2024 — HR AI adoption rates",
    "Gartner HR Technology Survey 2024 — implementation cost benchmarks",
    "ONS Annual Survey of Hours and Earnings 2024 — UK salary benchmarks",
  ];
  for (const src of dataSources) {
    needsPage(doc, 16, counter, orgName, libVer, hdr11);
    bullet(doc, src);
  }

  sectionLabel(doc, "Important Caveats");
  const caveats = [
    "All financial projections are indicative estimates based on sector benchmarks. Actual results will vary.",
    "Value realisation depends on change management quality, adoption rates, and sustained leadership commitment.",
    "Regulatory risk assessments reflect the state of UK/EU AI regulation as of the content library build date.",
    "This document is confidential and intended for board-level discussion only.",
  ];
  for (const c of caveats) {
    needsPage(doc, 16, counter, orgName, libVer, hdr11);
    bullet(doc, c);
  }

  drawFooter(doc, counter.n, orgName, libVer);

  // Final footer on last page
}
