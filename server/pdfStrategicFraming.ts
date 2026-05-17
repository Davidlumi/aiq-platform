/**
 * Strategic Framing One-Pager PDF Generator
 *
 * Produces a single-page A4 PDF export of the Increment 1 strategy framing:
 *   - Vision statement + inspiration source
 *   - Strategy archetype + statement
 *   - Guiding Principles (up to 6)
 *   - What We Won't Do (up to 5)
 *   - Gate status footer (stages 1–4)
 *
 * Used as a mid-flow "share before Stage 5" export.
 */

import PDFDocument from "pdfkit";
type PDFKitDoc = PDFKit.PDFDocument;
import { getDb, getTenantById } from "./db";
import { ailOrgContext } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy:      "#0A1628",
  navyMid:   "#0F2040",
  gold:      "#C8A96E",
  teal:      "#2D6A5E",
  tealPale:  "#E8F4F1",
  slate:     "#4A5568",
  muted:     "#718096",
  light:     "#F7F9FC",
  white:     "#FFFFFF",
  emerald:   "#059669",
  amber:     "#D97706",
};

// ─── Archetype labels ─────────────────────────────────────────────────────────
const ARCHETYPE_LABELS: Record<string, string> = {
  augmentation:     "Human + AI Augmentation",
  transformation:   "Full HR Transformation",
  differentiation:  "Talent Differentiation",
  efficiency:       "Operational Efficiency",
  defensive:        "Risk & Compliance First",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function drawRect(doc: PDFKitDoc, x: number, y: number, w: number, h: number, fill: string, radius = 0) {
  doc.save().roundedRect(x, y, w, h, radius).fill(fill).restore();
}

function drawLine(doc: PDFKitDoc, x1: number, y1: number, x2: number, y2: number, color: string, width = 0.5) {
  doc.save().moveTo(x1, y1).lineTo(x2, y2).strokeColor(color).lineWidth(width).stroke().restore();
}

function label(doc: PDFKitDoc, text: string, x: number, y: number, opts: {
  size?: number; color?: string; bold?: boolean; width?: number; align?: "left" | "center" | "right";
} = {}) {
  const { size = 9, color = C.slate, bold = false, width = 400, align = "left" } = opts;
  doc.save()
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor(color)
    .text(text, x, y, { width, align, lineBreak: true })
    .restore();
}

// ─── Main generator ───────────────────────────────────────────────────────────
export async function generateStrategicFramingPDF(doc: PDFKitDoc, userId: string, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // ── 1. Fetch data ──────────────────────────────────────────────────────────
  const orgCtxRows = await db.select().from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, tenantId)).limit(1);
  const orgCtx = orgCtxRows[0] ?? null;
  const tenant = await getTenantById(tenantId);
  const orgName = tenant?.name ?? "Your Organisation";

  // Gate state
  let gateState: Record<string, any> = {};
  try {
    const raw = (orgCtx as any)?.gateStateJson;
    if (raw) gateState = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {}

  // Vision
  const visionStatement: string = (orgCtx as any)?.visionStatement ?? "";
  let visionInspirationSource = "";
  try {
    const raw = (orgCtx as any)?.visionInspirationSourceJson;
    if (raw) visionInspirationSource = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {}

  // Strategy
  const strategyArchetype: string = (orgCtx as any)?.strategyArchetype ?? "";
  const strategyStatement: string = (orgCtx as any)?.strategyStatement ?? "";

  // Principles
  let principles: Array<{ title: string; description?: string; number?: number }> = [];
  try {
    const raw = (orgCtx as any)?.guidingPrinciplesJson;
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      // Support both old array format and new { principles, wontDoItems } format
      if (Array.isArray(parsed)) {
        principles = parsed;
      } else if (parsed?.principles) {
        principles = parsed.principles;
      }
    }
  } catch {}

  // Won't Do
  let wontDoItems: Array<{ title?: string; reason?: string } | string> = [];
  try {
    const raw = (orgCtx as any)?.wontDoJson;
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) wontDoItems = parsed;
    }
  } catch {}

  // Gate status
  const stage1Cleared = !!(gateState?.stage1?.clearedAt);
  const stage2Cleared = !!(gateState?.stage2?.clearedAt);
  const stage3Cleared = !!(gateState?.stage3?.clearedAt);
  const stage4Cleared = !!(gateState?.stage4?.clearedAt);

  // ── 2. Page layout ─────────────────────────────────────────────────────────
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // Header bar
  drawRect(doc, 0, 0, PAGE_W, 72, C.navy);

  // Logo / eyebrow
  doc.save()
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(C.gold)
    .text("AiQ — HR AI STRATEGY", MARGIN, 18, { width: CONTENT_W })
    .restore();

  // Title
  doc.save()
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(C.white)
    .text("Strategic Framing", MARGIN, 32, { width: CONTENT_W })
    .restore();

  // Org name + date
  const exportDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.save()
    .font("Helvetica")
    .fontSize(9)
    .fillColor(C.gold)
    .text(`${orgName}  ·  ${exportDate}`, PAGE_W - MARGIN - 200, 56, { width: 200, align: "right" })
    .restore();

  let y = 90;

  // ── 3. Vision section ──────────────────────────────────────────────────────
  drawRect(doc, MARGIN, y, CONTENT_W, 14, C.teal, 3);
  doc.save()
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(C.white)
    .text("VISION", MARGIN + 8, y + 3, { width: CONTENT_W - 16 })
    .restore();
  y += 20;

  if (visionStatement) {
    doc.save()
      .font("Helvetica-BoldOblique")
      .fontSize(11)
      .fillColor(C.navy)
      .text(`"${visionStatement}"`, MARGIN, y, { width: CONTENT_W, lineBreak: true })
      .restore();
    y = doc.y + 6;
    if (visionInspirationSource) {
      doc.save()
        .font("Helvetica")
        .fontSize(8)
        .fillColor(C.muted)
        .text(`Inspired by: ${visionInspirationSource}`, MARGIN, y, { width: CONTENT_W })
        .restore();
      y = doc.y + 4;
    }
  } else {
    label(doc, "Vision not yet confirmed.", MARGIN, y, { color: C.muted, size: 9 });
    y += 16;
  }

  y += 8;
  drawLine(doc, MARGIN, y, PAGE_W - MARGIN, y, "#E2E8F0");
  y += 12;

  // ── 4. Strategy section ────────────────────────────────────────────────────
  drawRect(doc, MARGIN, y, CONTENT_W, 14, C.teal, 3);
  doc.save()
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(C.white)
    .text("STRATEGY", MARGIN + 8, y + 3, { width: CONTENT_W - 16 })
    .restore();
  y += 20;

  if (strategyArchetype) {
    const archetypeLabel = ARCHETYPE_LABELS[strategyArchetype] ?? strategyArchetype;
    // Archetype pill
    drawRect(doc, MARGIN, y, 160, 18, C.tealPale, 9);
    doc.save()
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(C.teal)
      .text(archetypeLabel, MARGIN + 8, y + 5, { width: 144 })
      .restore();
    y += 26;
  }

  if (strategyStatement) {
    doc.save()
      .font("Helvetica")
      .fontSize(10)
      .fillColor(C.navy)
      .text(strategyStatement, MARGIN, y, { width: CONTENT_W, lineBreak: true })
      .restore();
    y = doc.y + 6;
  } else {
    label(doc, "Strategy statement not yet confirmed.", MARGIN, y, { color: C.muted, size: 9 });
    y += 16;
  }

  y += 8;
  drawLine(doc, MARGIN, y, PAGE_W - MARGIN, y, "#E2E8F0");
  y += 12;

  // ── 5. Principles section ──────────────────────────────────────────────────
  drawRect(doc, MARGIN, y, CONTENT_W, 14, C.teal, 3);
  doc.save()
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(C.white)
    .text("GUIDING PRINCIPLES", MARGIN + 8, y + 3, { width: CONTENT_W - 16 })
    .restore();
  y += 20;

  if (principles.length > 0) {
    const displayPrinciples = principles.slice(0, 6);
    const COL_W = (CONTENT_W - 8) / 2;
    const leftPrinciples = displayPrinciples.filter((_, i) => i % 2 === 0);
    const rightPrinciples = displayPrinciples.filter((_, i) => i % 2 !== 0);
    const maxRows = Math.max(leftPrinciples.length, rightPrinciples.length);
    let principleY = y;

    for (let row = 0; row < maxRows; row++) {
      const rowStartY = principleY;
      let leftH = 0;
      let rightH = 0;

      // Left column
      if (leftPrinciples[row]) {
        const p = leftPrinciples[row];
        const title = p.title ?? String(p);
        const desc = p.description ?? "";
        drawRect(doc, MARGIN, principleY, COL_W, 12, C.light, 2);
        doc.save()
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(C.teal)
          .text(title, MARGIN + 6, principleY + 3, { width: COL_W - 12 })
          .restore();
        let ph = 18;
        if (desc) {
          doc.save()
            .font("Helvetica")
            .fontSize(7.5)
            .fillColor(C.slate)
            .text(desc, MARGIN + 6, principleY + 16, { width: COL_W - 12, lineBreak: true })
            .restore();
          ph = doc.y - principleY + 4;
        }
        leftH = ph;
      }

      // Right column
      if (rightPrinciples[row]) {
        const p = rightPrinciples[row];
        const title = p.title ?? String(p);
        const desc = p.description ?? "";
        const rx = MARGIN + COL_W + 8;
        drawRect(doc, rx, rowStartY, COL_W, 12, C.light, 2);
        doc.save()
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(C.teal)
          .text(title, rx + 6, rowStartY + 3, { width: COL_W - 12 })
          .restore();
        let ph = 18;
        if (desc) {
          doc.save()
            .font("Helvetica")
            .fontSize(7.5)
            .fillColor(C.slate)
            .text(desc, rx + 6, rowStartY + 16, { width: COL_W - 12, lineBreak: true })
            .restore();
          ph = doc.y - rowStartY + 4;
        }
        rightH = ph;
      }

      principleY += Math.max(leftH, rightH) + 6;
    }
    y = principleY + 4;
  } else {
    label(doc, "Principles not yet confirmed.", MARGIN, y, { color: C.muted, size: 9 });
    y += 16;
  }

  y += 4;
  drawLine(doc, MARGIN, y, PAGE_W - MARGIN, y, "#E2E8F0");
  y += 12;

  // ── 6. Won't Do section ────────────────────────────────────────────────────
  drawRect(doc, MARGIN, y, CONTENT_W, 14, C.navy, 3);
  doc.save()
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(C.gold)
    .text("WHAT WE WON'T DO", MARGIN + 8, y + 3, { width: CONTENT_W - 16 })
    .restore();
  y += 20;

  if (wontDoItems.length > 0) {
    const displayItems = wontDoItems.slice(0, 5);
    for (const item of displayItems) {
      const title = typeof item === "string" ? item : (item.title ?? "");
      const reason = typeof item === "object" ? (item.reason ?? "") : "";

      // Bullet
      doc.save()
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(C.amber)
        .text("✕", MARGIN, y + 1, { width: 12 })
        .restore();

      doc.save()
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(C.navy)
        .text(title, MARGIN + 16, y, { width: CONTENT_W - 16, lineBreak: true })
        .restore();
      let itemH = doc.y - y + 2;
      if (reason) {
        doc.save()
          .font("Helvetica")
          .fontSize(8)
          .fillColor(C.muted)
          .text(reason, MARGIN + 16, doc.y, { width: CONTENT_W - 16, lineBreak: true })
          .restore();
        itemH = doc.y - y + 2;
      }
      y += itemH + 6;
    }
  } else {
    label(doc, "No exclusions defined yet.", MARGIN, y, { color: C.muted, size: 9 });
    y += 16;
  }

  // ── 7. Gate status footer ──────────────────────────────────────────────────
  const footerY = PAGE_H - 50;
  drawRect(doc, 0, footerY, PAGE_W, 50, C.light);
  drawLine(doc, 0, footerY, PAGE_W, footerY, "#E2E8F0");

  const stages = [
    { label: "Pre-work",   cleared: stage1Cleared },
    { label: "Vision",     cleared: stage2Cleared },
    { label: "Strategy",   cleared: stage3Cleared },
    { label: "Principles", cleared: stage4Cleared },
  ];

  const stageW = PAGE_W / stages.length;
  stages.forEach((s, i) => {
    const sx = i * stageW;
    const icon = s.cleared ? "✓" : "○";
    const iconColor = s.cleared ? C.emerald : C.muted;
    const textColor = s.cleared ? C.emerald : C.muted;

    doc.save()
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(iconColor)
      .text(icon, sx + stageW / 2 - 20, footerY + 10, { width: 40, align: "center" })
      .restore();

    doc.save()
      .font(s.cleared ? "Helvetica-Bold" : "Helvetica")
      .fontSize(7.5)
      .fillColor(textColor)
      .text(`Stage ${i + 1} — ${s.label}`, sx + 4, footerY + 26, { width: stageW - 8, align: "center" })
      .restore();
  });

  // Confidentiality footer
  doc.save()
    .font("Helvetica")
    .fontSize(6.5)
    .fillColor(C.muted)
    .text("CONFIDENTIAL — Generated by AiQ. For internal strategic planning use only.", MARGIN, footerY + 40, {
      width: CONTENT_W, align: "center",
    })
    .restore();
}
