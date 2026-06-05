/**
 * Board Report Word Export — AiQ Platform
 *
 * GET /api/export/board-report-docx
 *
 * Generates a Word (.docx) document from the board report sections.
 * Uses the `docx` npm package (Node-native, no binary dependencies).
 */
import type { Express, Request, Response } from "express";
import { parse as parseCookies } from "cookie";
import { verifySessionToken } from "./auth";
import { COOKIE_NAME } from "../shared/const";
import { getDb } from "./db";
import { validateBoardReportRubric } from "./boardReportRubric";
import { ailOrgContext, tenants } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";

const SECTION_TITLES: Record<string, string> = {
  context: "1. Context & Mandate",
  strategic_direction: "2. Strategic Direction",
  // T12: updated to match new section sourcing
  initiative_portfolio: "3. Initiative Portfolio & Roadmap",
  investment_case: "4. Investment Case",
  capability_readiness: "5. Capability Readiness",
  // T12: updated to match new section sourcing
  governance: "6. Governance & Accountability",
};

const SECTION_ORDER = [
  "context",
  "strategic_direction",
  "initiative_portfolio",
  "investment_case",
  "capability_readiness",
  "governance",
];

function textToParagraphs(text: string): Paragraph[] {
  const paras = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  return paras.map(para => new Paragraph({
    children: [new TextRun({ text: para.trim(), size: 22 })],
    spacing: { after: 160 },
  }));
}

export function registerBoardReportDocxRoute(app: Express): void {
  app.get("/api/export/board-report-docx", async (req: Request, res: Response) => {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const rawCookies = req.headers.cookie ?? "";
    const cookies = parseCookies(rawCookies);
    const sessionId = cookies[COOKIE_NAME];
    if (!sessionId) { res.status(401).json({ error: "Unauthenticated" }); return; }
    const user = await verifySessionToken(sessionId);
    if (!user) { res.status(401).json({ error: "Invalid session" }); return; }

    // ── Load data ─────────────────────────────────────────────────────────────
    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }

    // T12 (bug fix): use user.tenantId, not user.userId — session payload carries both
    const [ctx] = await db.select().from(ailOrgContext).where(eq(ailOrgContext.tenantId, user.tenantId)).limit(1);
    if (!ctx) { res.status(404).json({ error: "No strategy context found" }); return; }

    const [tenant] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, ctx.tenantId)).limit(1);
    const orgName = tenant?.name ?? "Organisation";

    let sectionsMap: Record<string, { content?: string }> = {};
    try { sectionsMap = ctx.boardReportSectionsJson ? JSON.parse(ctx.boardReportSectionsJson) : {}; } catch { /* ignore */ }

    // Fix 5 (P1): Validate rubric before serving the DOCX export
    const rubricResult = validateBoardReportRubric(sectionsMap);
    if (!rubricResult.passed) {
      res.status(422).json({
        error: "Board report does not meet the acceptance rubric",
        summary: rubricResult.summary,
        failures: rubricResult.failures,
      });
      return;
    }
    const includeNotes = ctx.boardReportIncludeNotes ?? false;
    const reviewNotes = ctx.reviewSessionNotes ?? "";

    // ── Build document ────────────────────────────────────────────────────────
    const children: (Paragraph | Table)[] = [];

    // Cover
    children.push(
      new Paragraph({
        text: `${orgName}`,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "AI-Enabled HR Strategy", size: 32, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Board Report — Intermediate Export", size: 24, color: "888888" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }), size: 22, color: "888888" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "" })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
        spacing: { after: 400 },
      }),
    );

    // Sections
    for (const sectionId of SECTION_ORDER) {
      const section = sectionsMap[sectionId];
      const content = section?.content?.trim() ?? "";
      const title = SECTION_TITLES[sectionId] ?? sectionId;

      children.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 160 },
        }),
      );

      if (content) {
        children.push(...textToParagraphs(content));
      } else {
        children.push(new Paragraph({
          children: [new TextRun({ text: "[Section not yet generated]", italics: true, color: "AAAAAA", size: 22 })],
          spacing: { after: 160 },
        }));
      }
    }

    // Appendix: review session notes (opt-in)
    if (includeNotes && reviewNotes.trim()) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "" })],
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: "Appendix: Review Session Notes",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 160 },
        }),
        ...textToParagraphs(reviewNotes),
      );
    }

    // Footer note
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "" })],
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
        spacing: { before: 400, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({
          text: "This is an intermediate export generated by the AiQ Platform. Content has been AI-assisted and should be reviewed before board submission.",
          size: 18,
          italics: true,
          color: "888888",
        })],
        spacing: { after: 80 },
      }),
    );

    const doc = new Document({
      sections: [{ children }],
      styles: {
        default: {
          document: {
            run: { font: "Calibri", size: 22 },
          },
        },
      },
    });

    const buffer = await Packer.toBuffer(doc);

    const safeOrgName = orgName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${safeOrgName}-hr-strategy-board-report-${dateStr}.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  });
}
