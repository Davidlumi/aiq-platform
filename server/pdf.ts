/**
 * AiQ PDF Generation
 *
 * Provides branded PDF exports for:
 *   - assessment_report  : full capability scores, strengths, gaps, recommended actions
 *   - learning_plan      : personalised module list with progress
 *   - module             : printable module content
 *   - team_dashboard     : aggregate capability scores across team/org
 *   - capability_profile : one-page capability score summary
 *
 * Mounted at /api/pdf/:type via Express (not tRPC — we stream binary data).
 * Authentication uses the same session cookie as tRPC.
 */

import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { generateBoardPackPDF } from "./pdfBoardPack";
import { generateStrategicFramingPDF } from "./pdfStrategicFraming";
import { parse as parseCookies } from "cookie";
import { COOKIE_NAME } from "../shared/const";
import { verifySessionToken } from "./auth";
import { getUserById, getDb, getTenantById } from "./db";
import { getLibraryMeta, getAllInitiatives, resolveInitiativeIds } from "./contentLibrary";
import { calculateCostEnvelope, evaluateRiskRules, calculateValueEnvelope, type ValueEnvelope } from "./strategyEngine";
import {
  assessmentSessions,
  assessmentScores,
  adaptiveLearningPlans,
  adaptivePlanItems,
  learningModules,
  gapAnalyses,
  managerTeamMembers,
  learningStreaks,
  users,
  ailOrgContext,
  riskAcknowledgements,
} from "../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  DOMAIN_KEYS,
  DOMAIN_LABELS,
  roleFamilyFromUserField,
  ROLE_FAMILY_LABELS,
  type DomainKey,
  type RoleFamilyKey,
} from "../shared/dashboard";

// ─── Colours ──────────────────────────────────────────────────────────────────
const BRAND = {
  navy:   "#0A1628",
  gold:   "#C8A96E",
  teal:   "#2D6A5E",
  slate:  "#4A5568",
  light:  "#F7F8FA",
  border: "#E2E8F0",
  safe:   "#10B981",
  risk:   "#F59E0B",
  unsafe: "#DC2626",
  white:  "#FFFFFF",
};

const CAPABILITY_LABELS: Record<string, string> = {
  ai_interaction:         "AI Interaction",
  ai_output_evaluation:   "AI Output Evaluation",
  ai_ethics_trust:        "AI Ethics & Trust",
  ai_change_leadership:   "AI Change Leadership",
  ai_workflow_design:     "AI Workflow Design",
  workforce_ai_readiness: "Workforce AI Readiness",
  execution:              "Execution",
  judgement:              "Judgement",
  governance:             "Governance",
  appropriateness:        "Appropriateness",
  workflow:               "Workflow",
  data_interpretation:    "Data Interpretation",
};

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function getAuthenticatedUser(req: Request) {
  const rawCookies = req.headers.cookie ?? "";
  const cookies = parseCookies(rawCookies);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return getUserById(payload.userId);
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────

function addBrandedHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  // Navy header bar
  doc.rect(0, 0, doc.page.width, 72).fill(BRAND.navy);
  // Gold accent line
  doc.rect(0, 72, doc.page.width, 3).fill(BRAND.gold);

  // AiQ wordmark
  doc.fontSize(22).font("Helvetica-Bold").fillColor(BRAND.white).text("AiQ", 40, 22);
  doc.fontSize(8).font("Helvetica").fillColor(BRAND.gold).text("Enterprise HR Capability Intelligence", 40, 48);

  // Document title (right-aligned)
  doc.fontSize(13).font("Helvetica-Bold").fillColor(BRAND.white)
     .text(title, 200, 22, { width: doc.page.width - 240, align: "right" });
  if (subtitle) {
    doc.fontSize(8).font("Helvetica").fillColor("#A0AEC0")
       .text(subtitle, 200, 44, { width: doc.page.width - 240, align: "right" });
  }

  doc.moveDown(0);
  doc.y = 95;
}

function addSectionHeading(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.5);
  doc.rect(40, doc.y, doc.page.width - 80, 22).fill(BRAND.navy);
  doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.white)
     .text(text.toUpperCase(), 48, doc.y - 16, { width: doc.page.width - 96 });
  doc.moveDown(0.8);
}

function addCapabilityBar(doc: PDFKit.PDFDocument, label: string, score: number, x: number, y: number, width: number) {
  const barW = width - 130;
  const barH = 10;
  const filled = Math.round((score / 100) * barW);
  const colour = score >= 75 ? BRAND.safe : score >= 50 ? BRAND.risk : BRAND.unsafe;

  doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate).text(label, x, y, { width: 120 });
  // Background track
  doc.rect(x + 125, y + 1, barW, barH).fill(BRAND.border);
  // Filled portion
  if (filled > 0) doc.rect(x + 125, y + 1, filled, barH).fill(colour);
  // Score label
  doc.fontSize(8).font("Helvetica-Bold").fillColor(colour)
     .text(`${Math.round(score)}`, x + 125 + barW + 6, y, { width: 30 });
}

function addFooter(doc: PDFKit.PDFDocument, pageNum: number, libraryVersion?: string) {
  const y = doc.page.height - 36;
  doc.rect(0, y - 6, doc.page.width, 42).fill(BRAND.light);
  doc.rect(0, y - 6, doc.page.width, 1).fill(BRAND.border);
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const versionSuffix = libraryVersion ? ` · Content Library v${libraryVersion}` : "";
  doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
     .text(`Generated ${date} · AiQ Enterprise HR Capability Intelligence · Confidential${versionSuffix}`, 40, y + 4, { width: doc.page.width - 120 });
  doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
     .text(`Page ${pageNum}`, doc.page.width - 80, y + 4, { width: 40, align: "right" });
}

function checkPageBreak(doc: PDFKit.PDFDocument, neededHeight: number, pageCounter: { n: number }) {
  if (doc.y + neededHeight > doc.page.height - 60) {
    addFooter(doc, pageCounter.n);
    doc.addPage();
    pageCounter.n++;
    doc.y = 40;
  }
}

// ─── PDF generators ───────────────────────────────────────────────────────────

async function generateAssessmentReport(doc: PDFKit.PDFDocument, userId: string, sessionId?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Fetch session
  let sessions;
  if (sessionId) {
    sessions = await db.select().from(assessmentSessions)
      .where(and(eq(assessmentSessions.id, sessionId), eq(assessmentSessions.userId, userId))).limit(1);
  } else {
    sessions = await db.select().from(assessmentSessions)
      .where(and(eq(assessmentSessions.userId, userId), eq(assessmentSessions.state, "completed")))
      .orderBy(desc(assessmentSessions.completedAt)).limit(1);
  }
  const session = sessions[0];
  if (!session) throw new Error("No completed assessment found");

  const scores = await db.select().from(assessmentScores)
    .where(eq(assessmentScores.sessionId, session.id)).limit(1);
  const score = scores[0];

  let breakdown: any = {};
  if (score?.scoreBreakdownJson) {
    try { breakdown = typeof score.scoreBreakdownJson === "string" ? JSON.parse(score.scoreBreakdownJson as string) : score.scoreBreakdownJson; } catch {}
  }

  const capScores: Record<string, number> = breakdown.capabilityScores ?? {};
  const overallScore: number = breakdown.overallScore ?? score?.overallScore ?? 0;
  const readinessBand: string = (breakdown.readinessBand as string) ?? "unknown";
  const completedAt = session.completedAt ? new Date(session.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Unknown";

  const readinessLabel = readinessBand === "safe" ? "AI-Ready" : readinessBand === "at_risk" ? "Developing" : readinessBand === "unsafe" ? "Not Yet Ready" : "Insufficient Data";
  const readinessColour = readinessBand === "safe" ? BRAND.safe : readinessBand === "at_risk" ? BRAND.risk : BRAND.unsafe;

  const pageCounter = { n: 1 };
  addBrandedHeader(doc, "Assessment Report", `Completed ${completedAt}`);

  // Overall score hero
  doc.rect(40, doc.y, doc.page.width - 80, 64).fill(BRAND.light).stroke(BRAND.border);
  doc.fontSize(32).font("Helvetica-Bold").fillColor(BRAND.navy)
     .text(`${Math.round(overallScore)}`, 60, doc.y - 52, { width: 80, align: "center" });
  doc.fontSize(9).font("Helvetica").fillColor(BRAND.slate)
     .text("Overall AI Readiness Score", 60, doc.y - 18, { width: 80, align: "center" });
  doc.fontSize(11).font("Helvetica-Bold").fillColor(readinessColour)
     .text(readinessLabel, 160, doc.y - 44, { width: 200 });
  doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
     .text("Readiness classification based on AiQ methodology", 160, doc.y - 26);
  doc.moveDown(1.2);

  // Capability scores
  addSectionHeading(doc, "Capability Scores");
  const capEntries = Object.entries(capScores).sort((a, b) => b[1] - a[1]);
  for (const [key, val] of capEntries) {
    checkPageBreak(doc, 20, pageCounter);
    addCapabilityBar(doc, CAPABILITY_LABELS[key] ?? key, val, 40, doc.y, doc.page.width - 80);
    doc.moveDown(1.1);
  }

  // Strengths & gaps
  const strengths = capEntries.filter(([, v]) => v >= 70).map(([k]) => CAPABILITY_LABELS[k] ?? k);
  const gaps = capEntries.filter(([, v]) => v < 55).map(([k]) => CAPABILITY_LABELS[k] ?? k);

  checkPageBreak(doc, 80, pageCounter);
  addSectionHeading(doc, "Strengths");
  if (strengths.length > 0) {
    strengths.forEach(s => {
      doc.fontSize(9).font("Helvetica").fillColor(BRAND.teal).text(`✓  ${s}`, 48, doc.y, { width: doc.page.width - 96 });
      doc.moveDown(0.5);
    });
  } else {
    doc.fontSize(9).font("Helvetica").fillColor(BRAND.slate).text("No dominant strengths identified yet. Continue building evidence.", 48, doc.y);
    doc.moveDown(0.5);
  }

  checkPageBreak(doc, 80, pageCounter);
  addSectionHeading(doc, "Development Priorities");
  if (gaps.length > 0) {
    gaps.forEach(g => {
      doc.fontSize(9).font("Helvetica").fillColor(BRAND.unsafe).text(`⚠  ${g}`, 48, doc.y, { width: doc.page.width - 96 });
      doc.moveDown(0.5);
    });
  } else {
    doc.fontSize(9).font("Helvetica").fillColor(BRAND.slate).text("No critical gaps identified. Focus on maintaining and advancing current capability.", 48, doc.y);
    doc.moveDown(0.5);
  }

  // Recommended actions
  checkPageBreak(doc, 80, pageCounter);
  addSectionHeading(doc, "Recommended Actions");
  const actions = [
    gaps.length > 0 ? `Complete targeted learning modules for: ${gaps.slice(0, 3).join(", ")}` : "Pursue advanced modules to deepen existing strengths",
    "Re-assess in 4–6 weeks after completing your learning plan",
    "Discuss development priorities with your line manager",
    "Apply learning in real AI-assisted work tasks to build evidence",
  ];
  actions.forEach((a, i) => {
    checkPageBreak(doc, 18, pageCounter);
    doc.fontSize(9).font("Helvetica").fillColor(BRAND.navy).text(`${i + 1}.  ${a}`, 48, doc.y, { width: doc.page.width - 96 });
    doc.moveDown(0.6);
  });

  addFooter(doc, pageCounter.n);
}

async function generateLearningPlanPDF(doc: PDFKit.PDFDocument, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const plans = await db.select().from(adaptiveLearningPlans)
    .where(and(eq(adaptiveLearningPlans.userId, userId), eq(adaptiveLearningPlans.state, "active")))
    .orderBy(desc(adaptiveLearningPlans.generatedAt)).limit(1);
  const plan = plans[0];
  if (!plan) throw new Error("No active learning plan found");

  const items = await db.select().from(adaptivePlanItems)
    .where(eq(adaptivePlanItems.planId, plan.id));
  const moduleIds = items.map(i => i.moduleId);
  const modules = moduleIds.length > 0
    ? await db.select().from(learningModules).where(inArray(learningModules.id, moduleIds))
    : [];
  const moduleMap = new Map(modules.map(m => [m.id, m]));

  const completed = items.filter(i => i.status === "completed").length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const pageCounter = { n: 1 };
  addBrandedHeader(doc, "Learning Plan", `${completed} of ${total} modules completed · ${pct}% progress`);

  // Progress summary
  doc.rect(40, doc.y, doc.page.width - 80, 48).fill(BRAND.light).stroke(BRAND.border);
  const barW = doc.page.width - 200;
  doc.rect(60, doc.y - 36, barW, 12).fill(BRAND.border);
  if (pct > 0) doc.rect(60, doc.y - 36, Math.round((pct / 100) * barW), 12).fill(BRAND.teal);
  doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.navy)
     .text(`${pct}% Complete`, 60, doc.y - 18, { width: 120 });
  doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
     .text(`${completed} completed · ${total - completed} remaining`, 200, doc.y - 18);
  doc.moveDown(1.2);

  // Group by capability
  const byCapability: Record<string, typeof items> = {};
  for (const item of items) {
    const mod = moduleMap.get(item.moduleId);
    const cap = mod?.capability ?? "other";
    if (!byCapability[cap]) byCapability[cap] = [];
    byCapability[cap].push(item);
  }

  for (const [cap, capItems] of Object.entries(byCapability)) {
    checkPageBreak(doc, 40, pageCounter);
    addSectionHeading(doc, CAPABILITY_LABELS[cap] ?? cap);

    for (const item of capItems) {
      checkPageBreak(doc, 22, pageCounter);
      const mod = moduleMap.get(item.moduleId);
      if (!mod) continue;
      const statusIcon = item.status === "completed" ? "✓" : item.status === "in_progress" ? "▶" : "○";
      const statusColour = item.status === "completed" ? BRAND.safe : item.status === "in_progress" ? BRAND.gold : BRAND.slate;
      doc.fontSize(8).font("Helvetica-Bold").fillColor(statusColour).text(statusIcon, 48, doc.y, { width: 16 });
      doc.fontSize(8).font("Helvetica").fillColor(BRAND.navy).text(mod.title, 68, doc.y - 10, { width: doc.page.width - 200 });
      doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
         .text(`${mod.modality?.replace("_", " ")} · ${mod.durationMins ?? 10} min · Level ${mod.difficulty ?? 1}`, 68, doc.y - 2);
      doc.moveDown(0.9);
    }
  }

  addFooter(doc, pageCounter.n);
}

async function generateModulePDF(doc: PDFKit.PDFDocument, moduleId: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const mods = await db.select().from(learningModules)
    .where(eq(learningModules.id, moduleId)).limit(1);
  const mod = mods[0];
  if (!mod) throw new Error("Module not found");

  let body: any = {};
  try { body = typeof mod.bodyJson === "string" ? JSON.parse(mod.bodyJson as string) : (mod.bodyJson ?? {}); } catch {}

  const sections: any[] = body?.conceptSections ?? body?.sections ?? [];
  const intro = body?.introduction;
  const keyTakeaways: string[] = body?.keyTakeaways ?? body?.keyPoints ?? [];
  const quizQuestions: any[] = body?.quizQuestions ?? body?.questions ?? [];
  const furtherReading: any[] = body?.furtherReading ?? [];

  const pageCounter = { n: 1 };
  addBrandedHeader(doc, mod.title, `${CAPABILITY_LABELS[mod.capability] ?? mod.capability} · ${mod.modality?.replace("_", " ")} · ${mod.durationMins ?? 10} min`);

  // Subtitle
  if (mod.subtitle) {
    doc.fontSize(10).font("Helvetica").fillColor(BRAND.slate).text(mod.subtitle, 40, doc.y, { width: doc.page.width - 80 });
    doc.moveDown(0.8);
  }

  // Introduction
  if (intro?.hook) {
    doc.rect(40, doc.y, doc.page.width - 80, 1).fill(BRAND.gold);
    doc.moveDown(0.4);
    doc.fontSize(9).font("Helvetica-BoldOblique").fillColor(BRAND.navy)
       .text(intro.hook, 40, doc.y, { width: doc.page.width - 80 });
    doc.moveDown(0.8);
  }

  if (intro?.learningObjectives?.length > 0) {
    addSectionHeading(doc, "Learning Objectives");
    intro.learningObjectives.forEach((obj: string) => {
      checkPageBreak(doc, 16, pageCounter);
      doc.fontSize(8).font("Helvetica").fillColor(BRAND.navy).text(`•  ${obj}`, 48, doc.y, { width: doc.page.width - 96 });
      doc.moveDown(0.5);
    });
  }

  // Concept sections
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    checkPageBreak(doc, 60, pageCounter);
    addSectionHeading(doc, section.heading ?? `Section ${i + 1}`);
    const bodyText: string = section.body ?? section.content ?? "";
    if (bodyText) {
      doc.fontSize(9).font("Helvetica").fillColor(BRAND.slate)
         .text(bodyText, 40, doc.y, { width: doc.page.width - 80, lineGap: 2 });
      doc.moveDown(0.6);
    }
    const kps: string[] = section.keyPoints ?? section.tips ?? [];
    if (kps.length > 0) {
      doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND.navy).text("Key Points", 40, doc.y);
      doc.moveDown(0.3);
      kps.forEach(kp => {
        checkPageBreak(doc, 14, pageCounter);
        doc.fontSize(8).font("Helvetica").fillColor(BRAND.teal).text(`›  ${kp}`, 48, doc.y, { width: doc.page.width - 96 });
        doc.moveDown(0.4);
      });
    }
  }

  // Key takeaways
  if (keyTakeaways.length > 0) {
    checkPageBreak(doc, 60, pageCounter);
    addSectionHeading(doc, "Key Takeaways");
    keyTakeaways.forEach(t => {
      checkPageBreak(doc, 16, pageCounter);
      doc.fontSize(8).font("Helvetica").fillColor(BRAND.navy).text(`★  ${t}`, 48, doc.y, { width: doc.page.width - 96 });
      doc.moveDown(0.5);
    });
  }

  // Quiz questions
  if (quizQuestions.length > 0) {
    checkPageBreak(doc, 60, pageCounter);
    addSectionHeading(doc, "Knowledge Check Questions");
    quizQuestions.forEach((q: any, i: number) => {
      checkPageBreak(doc, 40, pageCounter);
      doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.navy)
         .text(`${i + 1}. ${q.question}`, 40, doc.y, { width: doc.page.width - 80 });
      doc.moveDown(0.3);
      (q.options ?? []).forEach((opt: string, j: number) => {
        const isCorrect = j === q.correctIndex;
        doc.fontSize(8).font(isCorrect ? "Helvetica-Bold" : "Helvetica")
           .fillColor(isCorrect ? BRAND.teal : BRAND.slate)
           .text(`  ${String.fromCharCode(65 + j)}.  ${opt}`, 48, doc.y, { width: doc.page.width - 96 });
        doc.moveDown(0.35);
      });
      if (q.explanation) {
        doc.fontSize(7).font("Helvetica-Oblique").fillColor(BRAND.slate)
           .text(`Explanation: ${q.explanation}`, 48, doc.y, { width: doc.page.width - 96 });
        doc.moveDown(0.5);
      }
      doc.moveDown(0.3);
    });
  }

  // Further reading
  if (furtherReading.length > 0) {
    checkPageBreak(doc, 60, pageCounter);
    addSectionHeading(doc, "Further Reading");
    furtherReading.forEach((item: any) => {
      checkPageBreak(doc, 24, pageCounter);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND.navy).text(item.title, 48, doc.y, { width: doc.page.width - 96 });
      doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
         .text(`${item.author ?? ""} · ${item.source ?? ""} · ${item.year ?? ""}`, 48, doc.y, { width: doc.page.width - 96 });
      if (item.relevance) {
        doc.fontSize(7).font("Helvetica-Oblique").fillColor(BRAND.slate)
           .text(item.relevance, 48, doc.y, { width: doc.page.width - 96 });
      }
      doc.moveDown(0.6);
    });
    addFooter(doc, pageCounter.n);
  }
}
async function generateTeamDashboardPDF(doc: PDFKit.PDFDocument, userId: string, _tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Replicate the getTeamLearningProgress query inline
  const memberRows = await db.select().from(managerTeamMembers)
    .where(eq(managerTeamMembers.managerId, userId));
  const memberIds = memberRows.map(m => m.memberId);

  const memberProgress = await Promise.all(memberIds.map(async (memberId) => {
    const userRow = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users).where(eq(users.id, memberId)).limit(1);
    const plan = await db.select().from(adaptiveLearningPlans)
      .where(and(eq(adaptiveLearningPlans.userId, memberId), eq(adaptiveLearningPlans.state, "active")))
      .orderBy(desc(adaptiveLearningPlans.generatedAt)).limit(1);
    const streak = await db.select().from(learningStreaks)
      .where(eq(learningStreaks.userId, memberId)).limit(1);
    const gap = await db.select().from(gapAnalyses)
      .where(eq(gapAnalyses.userId, memberId))
      .orderBy(desc(gapAnalyses.generatedAt)).limit(1);
    return {
      name: userRow[0] ? `${userRow[0].firstName} ${userRow[0].lastName}`.trim() : "Unknown",
      overallProgress: plan[0]?.totalModules > 0
        ? Math.round((plan[0].completedModules / plan[0].totalModules) * 100)
        : 0,
      readinessScore: gap[0]?.overallReadinessScore ? parseFloat(String(gap[0].overallReadinessScore)) : 0,
      completedModules: plan[0]?.completedModules ?? 0,
      totalModules: plan[0]?.totalModules ?? 0,
      streakDays: streak[0]?.currentStreak ?? 0,
    };
  }));

  const teamData = { members: memberProgress };

  const pageCounter = { n: 1 };
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  addBrandedHeader(doc, "Team Learning Dashboard", `Generated ${date}`);

  if (!teamData || teamData.members.length === 0) {
    doc.fontSize(10).font("Helvetica").fillColor(BRAND.slate)
       .text("No team members found. Invite team members to start tracking progress.", 40, doc.y);
    addFooter(doc, 1);
    return;
  }

  // Summary stats
  const totalMembers = teamData.members.length;
  const avgProgress = Math.round(teamData.members.reduce((s: number, m: any) => s + (m.overallProgress ?? 0), 0) / totalMembers);
  const readyCount = teamData.members.filter((m: any) => (m.readinessScore ?? 0) >= 75).length;

  doc.rect(40, doc.y, doc.page.width - 80, 52).fill(BRAND.light).stroke(BRAND.border);
  const statW = (doc.page.width - 80) / 3;
  [
    { label: "Team Members", value: String(totalMembers) },
    { label: "Avg. Progress", value: `${avgProgress}%` },
    { label: "AI-Ready", value: `${readyCount} / ${totalMembers}` },
  ].forEach((stat, i) => {
    const x = 40 + i * statW;
    doc.fontSize(20).font("Helvetica-Bold").fillColor(BRAND.navy)
       .text(stat.value, x + 10, doc.y - 40, { width: statW - 20, align: "center" });
    doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
       .text(stat.label, x + 10, doc.y - 16, { width: statW - 20, align: "center" });
  });
  doc.moveDown(1.2);

  // Member table
  addSectionHeading(doc, "Team Member Progress");

  // Table header
  const cols = { name: 40, progress: 200, readiness: 310, modules: 400, streak: 470 };
  doc.fontSize(7).font("Helvetica-Bold").fillColor(BRAND.white);
  doc.rect(40, doc.y - 2, doc.page.width - 80, 16).fill(BRAND.slate);
  doc.fillColor(BRAND.white)
     .text("Name", cols.name + 4, doc.y - 14)
     .text("Progress", cols.progress, doc.y - 14)
     .text("Readiness", cols.readiness, doc.y - 14)
     .text("Modules", cols.modules, doc.y - 14)
     .text("Streak", cols.streak, doc.y - 14);
  doc.moveDown(0.6);

  for (let idx = 0; idx < teamData.members.length; idx++) {
    const member = teamData.members[idx];
    checkPageBreak(doc, 18, pageCounter);
    const rowY = doc.y;
    if (idx % 2 === 0) doc.rect(40, rowY - 2, doc.page.width - 80, 16).fill("#F9FAFB");
    const readinessScore = member.readinessScore ?? 0;
    const readinessColour = readinessScore >= 75 ? BRAND.safe : readinessScore >= 50 ? BRAND.risk : BRAND.unsafe;
    doc.fontSize(8).font("Helvetica").fillColor(BRAND.navy)
       .text(member.name ?? "Unknown", cols.name + 4, rowY, { width: 150 });
    doc.fontSize(8).font("Helvetica").fillColor(BRAND.teal)
       .text(`${member.overallProgress ?? 0}%`, cols.progress, rowY, { width: 80 });
    doc.fontSize(8).font("Helvetica-Bold").fillColor(readinessColour)
       .text(`${Math.round(readinessScore)}`, cols.readiness, rowY, { width: 80 });
    doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
       .text(`${member.completedModules ?? 0} / ${member.totalModules ?? 0}`, cols.modules, rowY, { width: 60 });
    doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
       .text(`${member.streakDays ?? 0}d`, cols.streak, rowY, { width: 40 });
    doc.moveDown(0.9);
  }

  addFooter(doc, pageCounter.n);
}

async function generateCapabilityProfilePDF(doc: PDFKit.PDFDocument, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Get latest assessment scores
  const sessions = await db.select().from(assessmentSessions)
    .where(and(eq(assessmentSessions.userId, userId), eq(assessmentSessions.state, "completed")))
    .orderBy(desc(assessmentSessions.completedAt)).limit(1);
  const session = sessions[0];

  let capScores: Record<string, number> = {};
  let overallScore = 0;
  let readinessBand = "unknown";

  if (session) {
    const scores = await db.select().from(assessmentScores)
      .where(eq(assessmentScores.sessionId, session.id)).limit(1);
    if (scores[0]) {
      let breakdown: any = {};
      try { breakdown = typeof scores[0].scoreBreakdownJson === "string" ? JSON.parse(scores[0].scoreBreakdownJson as string) : (scores[0].scoreBreakdownJson ?? {}); } catch {}
      capScores = breakdown.capabilityScores ?? {};
      overallScore = breakdown.overallScore ?? parseFloat(String(scores[0].overallScore)) ?? 0;
      readinessBand = (breakdown.readinessBand as string) ?? "unknown";
    }
  }

  // Get learning plan progress
  const plans = await db.select().from(adaptiveLearningPlans)
    .where(and(eq(adaptiveLearningPlans.userId, userId), eq(adaptiveLearningPlans.state, "active")))
    .orderBy(desc(adaptiveLearningPlans.generatedAt)).limit(1);
  const plan = plans[0];
  let learningProgress = 0;
  if (plan) {
    const items = await db.select().from(adaptivePlanItems).where(eq(adaptivePlanItems.planId, plan.id));
    const completed = items.filter(i => i.status === "completed").length;
    learningProgress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
  }

  const readinessLabel = readinessBand === "safe" ? "AI-Ready" : readinessBand === "at_risk" ? "Developing" : readinessBand === "unsafe" ? "Not Yet Ready" : "Insufficient Data";
  const readinessColour = readinessBand === "safe" ? BRAND.safe : readinessBand === "at_risk" ? BRAND.risk : BRAND.unsafe;

  const pageCounter = { n: 1 };
  addBrandedHeader(doc, "Capability Profile", "AI Readiness Summary");

  // Hero row
  doc.rect(40, doc.y, doc.page.width - 80, 72).fill(BRAND.light).stroke(BRAND.border);

  // Overall score circle (simulated with text)
  doc.rect(52, doc.y - 60, 80, 60).fill(BRAND.navy);
  doc.fontSize(28).font("Helvetica-Bold").fillColor(BRAND.white)
     .text(`${Math.round(overallScore)}`, 52, doc.y - 52, { width: 80, align: "center" });
  doc.fontSize(7).font("Helvetica").fillColor(BRAND.gold)
     .text("AI READINESS", 52, doc.y - 20, { width: 80, align: "center" });

  doc.fontSize(14).font("Helvetica-Bold").fillColor(readinessColour)
     .text(readinessLabel, 148, doc.y - 52, { width: 200 });
  doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
     .text(`Learning Plan Progress: ${learningProgress}%`, 148, doc.y - 32);
  const assessedDate = session?.completedAt
    ? new Date(session.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "Not yet assessed";
  doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
     .text(`Last Assessed: ${assessedDate}`, 148, doc.y - 18);
  doc.moveDown(1.4);

  // Capability scores
  addSectionHeading(doc, "Capability Scores");

  const allCaps = Object.keys(CAPABILITY_LABELS);
  for (const cap of allCaps) {
    checkPageBreak(doc, 20, pageCounter);
    const score = capScores[cap] ?? 0;
    addCapabilityBar(doc, CAPABILITY_LABELS[cap], score, 40, doc.y, doc.page.width - 80);
    doc.moveDown(1.1);
  }

  // Legend
  checkPageBreak(doc, 50, pageCounter);
  doc.moveDown(0.5);
  doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
     .text("Score guide: ", 40, doc.y, { continued: true });
  doc.fillColor(BRAND.safe).text("75+ AI-Ready  ", { continued: true });
  doc.fillColor(BRAND.risk).text("50–74 Developing  ", { continued: true });
  doc.fillColor(BRAND.unsafe).text("0–49 Not Yet Ready");
  doc.moveDown(0.5);
  doc.fontSize(7).font("Helvetica-Oblique").fillColor(BRAND.slate)
     .text("Scores are based on observed behaviour patterns in assessment scenarios. A score of 0 indicates insufficient evidence has been collected for that capability.", 40, doc.y, { width: doc.page.width - 80 });

  addFooter(doc, pageCounter.n);
}

// ─── AI Strategy Report ─────────────────────────────────────────────────────

async function generateAIStrategyReport(doc: PDFKit.PDFDocument, userId: string, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // ── Fetch org context (strategy config) ──────────────────────────────────
  const orgCtxRows = await db.select().from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, tenantId)).limit(1);
  const orgCtx = orgCtxRows[0] ?? null;

  const businessAmbitionLevel: number = (orgCtx as any)?.businessAmbitionLevel ?? 3;
  const peopleAmbitionLevel: number = (orgCtx as any)?.peopleAmbitionLevel ?? 3;
  const ambitionTargetScore: number | null = (orgCtx as any)?.ambitionTargetScore ?? null;
  const ambitionTargetDate: string | null = (orgCtx as any)?.ambitionTargetDate ?? null;
  const ambitionTargetLabel: string | null = (orgCtx as any)?.ambitionTargetLabel ?? null;
  const strategyNarrative: string | null = (orgCtx as any)?.strategyNarrative ?? null;

  let domainTargets: Record<DomainKey, number> = {} as Record<DomainKey, number>;
  try {
    const raw = (orgCtx as any)?.domainTargetsJson;
    if (raw) domainTargets = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {}
  // Fall back to computed targets if not stored
  if (!Object.keys(domainTargets).length) {
    const base = Math.round((businessAmbitionLevel * 0.55 + peopleAmbitionLevel * 0.45) * 20);
    for (const dk of DOMAIN_KEYS) domainTargets[dk] = Math.max(20, Math.min(100, base));
  }

  // ── Fetch tenant name ─────────────────────────────────────────────────────
  const tenant = await getTenantById(tenantId);
  const orgName = tenant?.name ?? "Your Organisation";

  // ── Compute function averages from latest assessment per user ─────────────
  const allUsers = await db
    .select({
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
  const userData: { id: string; overallScore: number; domainScores: Record<DomainKey, number>; roleFamily: RoleFamilyKey }[] = [];
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
      userData.push({
        id: u.id,
        overallScore: parseFloat(String(u.overallScore)),
        domainScores,
        roleFamily: roleFamilyFromUserField(u.roleFamily ?? u.jobFunction),
      });
    }
  }

  const assessedCount = userData.length;
  const functionAvgRaw = assessedCount > 0
    ? Math.round(userData.reduce((s, u) => s + u.overallScore, 0) / assessedCount)
    : null;
  const domainAvgs: Record<DomainKey, number | null> = {} as Record<DomainKey, number | null>;
  for (const dk of DOMAIN_KEYS) {
    const vals = userData.map(u => u.domainScores[dk]);
    domainAvgs[dk] = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  }
  const gapRaw = (functionAvgRaw !== null && ambitionTargetScore !== null)
    ? ambitionTargetScore - functionAvgRaw : null;

  // ── Compute strategic findings (top 3) ────────────────────────────────────
  type FindingPriority = "critical" | "high" | "medium" | "low";
  const findings: Array<{ observation: string; supportingData: string; strategicImplication: string; priority: FindingPriority }> = [];

  if (assessedCount > 0) {
    const notReadyCount = userData.filter(u => u.overallScore < 40).length;
    const notReadyPct = Math.round((notReadyCount / assessedCount) * 100);
    if (notReadyPct > 10) {
      findings.push({
        observation: `${notReadyPct}% of assessed HR professionals (${notReadyCount} people) are below the minimum readiness threshold.`,
        supportingData: `${notReadyCount} of ${assessedCount} assessed staff score below 40/100.`,
        strategicImplication: "Prioritise these individuals for immediate foundation-level development before expanding AI tool access.",
        priority: "high",
      });
    }
    // Weakest domain
    const domainRanked = DOMAIN_KEYS.map(dk => ({ dk, avg: domainAvgs[dk] ?? 0 })).sort((a, b) => a.avg - b.avg);
    const weakest = domainRanked[0];
    const strongest = domainRanked[domainRanked.length - 1];
    if (weakest && strongest && strongest.avg - weakest.avg > 3) {
      findings.push({
        observation: `${DOMAIN_LABELS[weakest.dk]} is the weakest domain at ${weakest.avg} avg — ${strongest.avg - weakest.avg} points below ${DOMAIN_LABELS[strongest.dk]} (${strongest.avg}).`,
        supportingData: `Domain averages range from ${weakest.avg} (${DOMAIN_LABELS[weakest.dk]}) to ${strongest.avg} (${DOMAIN_LABELS[strongest.dk]}).`,
        strategicImplication: `If ${DOMAIN_LABELS[weakest.dk]} is critical to your AI roadmap, this gap requires targeted intervention.`,
        priority: "high",
      });
    }
    // Gap vs target
    if (gapRaw !== null && gapRaw > 10) {
      findings.push({
        observation: `The function average (${functionAvgRaw}) is ${gapRaw} points below the ambition target (${ambitionTargetScore}).`,
        supportingData: `Assessed: ${assessedCount} people. Function avg: ${functionAvgRaw}. Target: ${ambitionTargetScore}.`,
        strategicImplication: "Accelerated development investment is required to meet the AI roadmap timeline.",
        priority: gapRaw > 20 ? "high" : "medium",
      });
    }
    // Role family disparity
    const rfScores: Record<string, { total: number; count: number }> = {};
    for (const u of userData) {
      if (!rfScores[u.roleFamily]) rfScores[u.roleFamily] = { total: 0, count: 0 };
      rfScores[u.roleFamily].total += u.overallScore;
      rfScores[u.roleFamily].count++;
    }
    const rfAvgs = Object.entries(rfScores)
      .filter(([, v]) => v.count >= 2)
      .map(([rf, v]) => ({ rf, avg: Math.round(v.total / v.count) }))
      .sort((a, b) => a.avg - b.avg);
    if (rfAvgs.length >= 2) {
      const lo = rfAvgs[0]; const hi = rfAvgs[rfAvgs.length - 1];
      const gap = hi.avg - lo.avg;
      if (gap > 5) {
        findings.push({
          observation: `${gap}-point gap between highest role family (${ROLE_FAMILY_LABELS[lo.rf as RoleFamilyKey] ?? lo.rf}: ${hi.avg}) and lowest (${ROLE_FAMILY_LABELS[lo.rf as RoleFamilyKey] ?? lo.rf}: ${lo.avg}).`,
          supportingData: `${hi.rf}: ${hi.avg} avg. ${lo.rf}: ${lo.avg} avg.`,
          strategicImplication: "Investigate whether the lower-performing role family has different development needs or less access to AI tools.",
          priority: gap > 10 ? "high" : "medium",
        });
      }
    }
  }
  findings.sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.priority] - { critical: 0, high: 1, medium: 2, low: 3 }[b.priority]));

  // ── Board options ─────────────────────────────────────────────────────────
  const targetDateStr = ambitionTargetDate
    ? new Date(ambitionTargetDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "the target date";
  const boardOptions = gapRaw !== null && gapRaw > 0 ? [
    `Invest in accelerated development to meet the ${targetDateStr} target`,
    "Extend the AI roadmap timeline to align with the current learning pace",
    "Reduce capability bar for non-customer-facing roles and focus investment on high-impact functions",
  ] : [];

  // ── Ambition level labels ─────────────────────────────────────────────────
  const BUSINESS_LEVEL_LABELS: Record<number, string> = {
    1: "Cautious", 2: "Exploratory", 3: "Progressive", 4: "Ambitious", 5: "Transformative",
  };
  const PEOPLE_LEVEL_LABELS: Record<number, string> = {
    1: "Followers", 2: "Adopters", 3: "Practitioners", 4: "Champions", 5: "Innovators",
  };

  // ── Content library version ──────────────────────────────────────────────
  const libMeta = getLibraryMeta();
  const libVersion = libMeta.version;
  const libBuiltAt = new Date(libMeta.built_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  // ── PDF generation ────────────────────────────────────────────────────────
  const pageCounter = { n: 1 };
  const reportDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  // Page 1: Cover / executive summary
  addBrandedHeader(doc, "AI Strategy Report", `${orgName} · ${reportDate}`);

  // Library version badge (small, below header)
  doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
     .text(`Content Library v${libVersion} · Built ${libBuiltAt} · ${libMeta.content_counts?.initiatives ?? 0} initiatives`, 40, doc.y, { width: doc.page.width - 80 });
  doc.moveDown(0.4);

  // Strategy label banner
  if (ambitionTargetLabel) {
    doc.rect(40, doc.y, doc.page.width - 80, 28).fill(BRAND.navy);
    doc.fontSize(10).font("Helvetica-Bold").fillColor(BRAND.gold)
       .text(ambitionTargetLabel, 52, doc.y - 20, { width: doc.page.width - 104 });
    doc.moveDown(0.8);
  }

  // Strategy configuration summary
  addSectionHeading(doc, "Strategy Configuration");
  const configY = doc.y;
  const colW = (doc.page.width - 80) / 2 - 8;
  // Left column
  doc.rect(40, configY, colW, 64).fill(BRAND.light).stroke(BRAND.border);
  doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
     .text("BUSINESS AMBITION", 52, configY + 6, { width: colW - 24 });
  doc.fontSize(14).font("Helvetica-Bold").fillColor(BRAND.navy)
     .text(`${businessAmbitionLevel} — ${BUSINESS_LEVEL_LABELS[businessAmbitionLevel] ?? ""}`, 52, configY + 18, { width: colW - 24 });
  doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
     .text("How aggressively the business adopts AI", 52, configY + 38, { width: colW - 24 });
  // Right column
  const rColX = 40 + colW + 16;
  doc.rect(rColX, configY, colW, 64).fill(BRAND.light).stroke(BRAND.border);
  doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
     .text("PEOPLE AMBITION", rColX + 12, configY + 6, { width: colW - 24 });
  doc.fontSize(14).font("Helvetica-Bold").fillColor(BRAND.navy)
     .text(`${peopleAmbitionLevel} — ${PEOPLE_LEVEL_LABELS[peopleAmbitionLevel] ?? ""}`, rColX + 12, configY + 18, { width: colW - 24 });
  doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
     .text("How much HR people lead vs follow AI adoption", rColX + 12, configY + 38, { width: colW - 24 });
  doc.y = configY + 72;

  // Strategy narrative
  if (strategyNarrative) {
    doc.moveDown(0.5);
    doc.fontSize(8).font("Helvetica-Oblique").fillColor(BRAND.slate)
       .text(`"${strategyNarrative}"`, 48, doc.y, { width: doc.page.width - 96 });
    doc.moveDown(0.5);
  }

  // KPI tiles: Current / Target / Gap
  checkPageBreak(doc, 80, pageCounter);
  addSectionHeading(doc, "Readiness KPIs");
  const kpiY = doc.y;
  const kpiW = (doc.page.width - 80) / 3 - 6;
  const kpis = [
    { label: "Current Avg", value: functionAvgRaw !== null ? `${functionAvgRaw}` : "—", sub: `${assessedCount} assessed`, colour: BRAND.teal },
    { label: "Target Score", value: ambitionTargetScore !== null ? `${ambitionTargetScore}` : "—", sub: ambitionTargetDate ? `By ${targetDateStr}` : "No date set", colour: BRAND.navy },
    { label: "Gap", value: gapRaw !== null ? (gapRaw > 0 ? `+${gapRaw}` : `${gapRaw}`) : "—", sub: gapRaw !== null ? (gapRaw <= 0 ? "On track" : "Behind target") : "No target set", colour: gapRaw !== null && gapRaw <= 0 ? BRAND.safe : BRAND.risk },
  ];
  for (let i = 0; i < kpis.length; i++) {
    const kpi = kpis[i];
    const kpiX = 40 + i * (kpiW + 9);
    doc.rect(kpiX, kpiY, kpiW, 56).fill(BRAND.light).stroke(BRAND.border);
    doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
       .text(kpi.label.toUpperCase(), kpiX + 10, kpiY + 6, { width: kpiW - 20 });
    doc.fontSize(22).font("Helvetica-Bold").fillColor(kpi.colour)
       .text(kpi.value, kpiX + 10, kpiY + 18, { width: kpiW - 20 });
    doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
       .text(kpi.sub, kpiX + 10, kpiY + 42, { width: kpiW - 20 });
  }
  doc.y = kpiY + 64;

  // Domain capability vs target bars
  checkPageBreak(doc, 180, pageCounter);
  addSectionHeading(doc, "Domain Capability vs Roadmap Targets");
  for (const dk of DOMAIN_KEYS) {
    checkPageBreak(doc, 32, pageCounter);
    const current = domainAvgs[dk];
    const target = domainTargets[dk] ?? null;
    const barY = doc.y;
    const barAreaW = doc.page.width - 80;
    const trackW = barAreaW - 160;
    // Label
    doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
       .text(DOMAIN_LABELS[dk], 40, barY, { width: 150 });
    // Target label
    if (target !== null) {
      doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
         .text(`Target: ${target}`, 40, barY + 12, { width: 150 });
    }
    // Bar track
    const barX = 200;
    doc.rect(barX, barY + 2, trackW, 8).fill(BRAND.border);
    // Current fill
    if (current !== null) {
      const filled = Math.round((current / 100) * trackW);
      const colour = current >= 75 ? BRAND.safe : current >= 50 ? BRAND.risk : BRAND.unsafe;
      if (filled > 0) doc.rect(barX, barY + 2, filled, 8).fill(colour);
      // Current score label
      doc.fontSize(8).font("Helvetica-Bold").fillColor(current >= 75 ? BRAND.safe : current >= 50 ? BRAND.risk : BRAND.unsafe)
         .text(`${current}`, barX + trackW + 6, barY, { width: 30 });
    } else {
      doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
         .text("No data", barX + trackW + 6, barY, { width: 40 });
    }
    // Target marker line
    if (target !== null) {
      const targetX = barX + Math.round((target / 100) * trackW);
      doc.rect(targetX - 1, barY - 2, 2, 14).fill(BRAND.gold);
    }
    doc.y = barY + 26;
  }

  // Legend for bars
  doc.moveDown(0.3);
  doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
     .text("Score guide: ", 40, doc.y, { continued: true });
  doc.fillColor(BRAND.safe).text("75+ Strong  ", { continued: true });
  doc.fillColor(BRAND.risk).text("50–74 Developing  ", { continued: true });
  doc.fillColor(BRAND.unsafe).text("0–49 Gap  ", { continued: true });
  doc.fillColor(BRAND.gold).text("| Target");
  doc.moveDown(0.5);

  // Strategic findings
  if (findings.length > 0) {
    checkPageBreak(doc, 60, pageCounter);
    addSectionHeading(doc, "Strategic Findings");
    const priorityColour: Record<FindingPriority, string> = {
      critical: BRAND.unsafe, high: BRAND.risk, medium: BRAND.teal, low: BRAND.slate,
    };
    for (const f of findings.slice(0, 5)) {
      checkPageBreak(doc, 70, pageCounter);
      const fY = doc.y;
      doc.rect(40, fY, doc.page.width - 80, 4).fill(priorityColour[f.priority]);
      doc.y = fY + 8;
      doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.navy)
         .text(f.observation, 48, doc.y, { width: doc.page.width - 96 });
      doc.moveDown(0.3);
      doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
         .text(f.strategicImplication, 48, doc.y, { width: doc.page.width - 96 });
      doc.moveDown(0.3);
      doc.fontSize(7).font("Helvetica-Oblique").fillColor(BRAND.slate)
         .text(`Data: ${f.supportingData}`, 48, doc.y, { width: doc.page.width - 96 });
      doc.moveDown(0.8);
    }
  }

  // Board options
  if (boardOptions.length > 0) {
    checkPageBreak(doc, 80, pageCounter);
    addSectionHeading(doc, "Board Options");
    doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
       .text("Three strategic options for board consideration:", 48, doc.y, { width: doc.page.width - 96 });
    doc.moveDown(0.5);
    boardOptions.forEach((opt, i) => {
      checkPageBreak(doc, 24, pageCounter);
      doc.rect(48, doc.y, 16, 16).fill(BRAND.navy);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND.white)
         .text(`${i + 1}`, 48, doc.y - 12, { width: 16, align: "center" });
      doc.fontSize(9).font("Helvetica").fillColor(BRAND.navy)
         .text(opt, 72, doc.y - 12, { width: doc.page.width - 120 });
      doc.moveDown(0.9);
    });
  }

  // ── SECTION 2: Ambition ────────────────────────────────────────────────────
  // Fetch vision statement, guiding principles, wontDo from ailOrgContext
  const visionStatement: string | null = (orgCtx as any)?.visionStatement ?? null;
  let guidingPrinciples: Array<{ title: string; description: string }> = [];
  try {
    const raw = (orgCtx as any)?.guidingPrinciplesJson;
    if (raw) guidingPrinciples = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {}
  let wontDoItems: string[] = [];
  try {
    const raw = (orgCtx as any)?.wontDoJson;
    if (raw) wontDoItems = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {}
  const libraryVersion: string | null = (orgCtx as any)?.libraryVersion ?? null;

  if (visionStatement || guidingPrinciples.length > 0 || wontDoItems.length > 0) {
    addFooter(doc, pageCounter.n, libraryVersion ?? undefined);
    doc.addPage();
    pageCounter.n++;
    doc.y = 40;
    addSectionHeading(doc, "Section 2 — Ambition: Where We Are Going");

    if (visionStatement) {
      checkPageBreak(doc, 60, pageCounter);
      doc.rect(40, doc.y, doc.page.width - 80, 4).fill(BRAND.teal);
      doc.y += 8;
      doc.fontSize(10).font("Helvetica-BoldOblique").fillColor(BRAND.navy)
         .text(`"${visionStatement}"`, 48, doc.y, { width: doc.page.width - 96 });
      doc.moveDown(0.8);
    }

    if (guidingPrinciples.length > 0) {
      checkPageBreak(doc, 40, pageCounter);
      doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.navy)
         .text("Guiding Principles", 40, doc.y);
      doc.moveDown(0.4);
      for (const p of guidingPrinciples) {
        checkPageBreak(doc, 30, pageCounter);
        doc.rect(40, doc.y, 3, 18).fill(BRAND.teal);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND.navy)
           .text(p.title, 50, doc.y, { width: doc.page.width - 90 });
        doc.moveDown(0.2);
        doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
           .text(p.description, 50, doc.y, { width: doc.page.width - 90 });
        doc.moveDown(0.7);
      }
    }

    if (wontDoItems.length > 0) {
      checkPageBreak(doc, 40, pageCounter);
      doc.rect(40, doc.y, doc.page.width - 80, 22).fill(BRAND.unsafe);
      doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.white)
         .text("WHAT WE WON'T DO", 48, doc.y - 16, { width: doc.page.width - 96 });
      doc.moveDown(0.8);
      for (const item of wontDoItems) {
        checkPageBreak(doc, 18, pageCounter);
        doc.fontSize(8).font("Helvetica").fillColor(BRAND.unsafe)
           .text(`✕  ${item}`, 48, doc.y, { width: doc.page.width - 96 });
        doc.moveDown(0.5);
      }
    }
  }

  // ── SECTION 3: Plan ────────────────────────────────────────────────────────
  let selectedInitiativeIds: string[] = [];
  try {
    const raw = (orgCtx as any)?.selectedInitiativesJson;
    if (raw) selectedInitiativeIds = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {}

  const allInitiatives = getAllInitiatives();
  const initiativeMap = new Map(allInitiatives.map(i => [i.initiative_id, i]));
  // Resolve init-XX format IDs to snake_case initiative_ids used by the content library
  const resolvedInitiativeIds = resolveInitiativeIds(selectedInitiativeIds);
  const selectedInits = resolvedInitiativeIds
    .map(id => initiativeMap.get(id))
    .filter(Boolean) as typeof allInitiatives;

  if (selectedInits.length > 0) {
    checkPageBreak(doc, 60, pageCounter);
    addFooter(doc, pageCounter.n, libraryVersion ?? undefined);
    doc.addPage();
    pageCounter.n++;
    doc.y = 40;
    addSectionHeading(doc, "Section 3 — Plan: How We Will Get There");

    const phases: Record<string, typeof allInitiatives> = { phase_1: [], phase_2: [], phase_3: [] };
    for (const init of selectedInits) {
      const phase = (init as any).phase ?? "phase_1";
      if (!phases[phase]) phases[phase] = [];
      phases[phase].push(init);
    }
    const phaseLabels: Record<string, string> = {
      phase_1: "Phase 1 — Foundation (0–6 months)",
      phase_2: "Phase 2 — Build (6–12 months)",
      phase_3: "Phase 3 — Scale (12–18 months)",
    };
    for (const [phaseKey, inits] of Object.entries(phases)) {
      if (inits.length === 0) continue;
      checkPageBreak(doc, 30, pageCounter);
      doc.rect(40, doc.y, doc.page.width - 80, 18).fill(BRAND.navy);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND.gold)
         .text(phaseLabels[phaseKey] ?? phaseKey, 48, doc.y - 13, { width: doc.page.width - 96 });
      doc.moveDown(0.6);
      for (const init of inits) {
        checkPageBreak(doc, 28, pageCounter);
        doc.rect(40, doc.y, 3, 20).fill(BRAND.teal);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND.navy)
           .text((init as any).display_name ?? init.initiative_id, 50, doc.y, { width: doc.page.width - 90 });
        doc.moveDown(0.2);
        const desc = (init as any).description ?? "";
        if (desc) {
          doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
             .text(desc.slice(0, 180) + (desc.length > 180 ? "…" : ""), 50, doc.y, { width: doc.page.width - 90 });
        }
        doc.moveDown(0.7);
      }
    }
  }

  // ── SECTION 4: Investment & Risk ───────────────────────────────────────────
  if (selectedInits.length > 0) {
    // Determine org size and ambition tier for cost envelope
    const orgSizeRaw = (orgCtx as any)?.orgSize ?? "medium";
    const orgSize: "small" | "medium" | "large" | "enterprise" =
      ["small", "medium", "large", "enterprise"].includes(orgSizeRaw) ? orgSizeRaw : "medium";
    const ambitionTierRaw = businessAmbitionLevel >= 4 ? "transformative" : businessAmbitionLevel >= 3 ? "progressive" : "cautious";
    const ambitionTier: "cautious" | "progressive" | "transformative" = ambitionTierRaw;

    const costEnvelope = calculateCostEnvelope(
      selectedInitiativeIds,
      orgSize,
      ambitionTier,
    );
    const riskMatches = evaluateRiskRules({
      selectedInitiativeIds,
      orgSize,
      ambitionTier,
      hasExecSponsor: false,
      hasDataGovernanceInitiative: false,
    });

    checkPageBreak(doc, 60, pageCounter);
    addFooter(doc, pageCounter.n, libraryVersion ?? undefined);
    doc.addPage();
    pageCounter.n++;
    doc.y = 40;
    addSectionHeading(doc, "Section 4 — Investment & Risk");

    // Cost envelope
    doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.navy)
       .text("Cost Envelope by Phase", 40, doc.y);
    doc.moveDown(0.4);
    doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
       .text(`Total estimated investment: £${Math.round(costEnvelope.totalMin)}k – £${Math.round(costEnvelope.totalMax)}k`, 40, doc.y);
    doc.moveDown(0.4);
    for (const phase of costEnvelope.byPhase) {
      checkPageBreak(doc, 22, pageCounter);
      const barW = doc.page.width - 200;
      const barX = 160;
      const barY = doc.y;
      doc.fontSize(8).font("Helvetica").fillColor(BRAND.slate)
         .text(phase.label, 40, barY, { width: 115 });
      doc.rect(barX, barY + 2, barW, 8).fill(BRAND.border);
      const filled = phase.maxGbk > 0 ? Math.round((phase.minGbk / phase.maxGbk) * barW) : 0;
      if (filled > 0) doc.rect(barX, barY + 2, filled, 8).fill(BRAND.teal);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND.navy)
         .text(`£${Math.round(phase.minGbk)}k–£${Math.round(phase.maxGbk)}k`, barX + barW + 6, barY, { width: 80 });
      doc.y = barY + 18;
    }
    doc.moveDown(0.5);

    // Risks
    if (riskMatches.length > 0) {
      checkPageBreak(doc, 40, pageCounter);
      doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.navy)
         .text(`${riskMatches.length} Regulatory Risk${riskMatches.length > 1 ? "s" : ""} Identified`, 40, doc.y);
      doc.moveDown(0.4);
      for (const risk of riskMatches) {
        checkPageBreak(doc, 40, pageCounter);
        const sevColour = risk.severity === "very_high" || risk.severity === "high" ? BRAND.unsafe :
                          risk.severity === "medium" ? BRAND.risk : BRAND.safe;
        doc.rect(40, doc.y, 3, 24).fill(sevColour);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND.navy)
           .text(risk.displayName, 50, doc.y, { width: doc.page.width - 90 });
        doc.moveDown(0.2);
        doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
           .text(risk.riskStatement, 50, doc.y, { width: doc.page.width - 90 });
        doc.moveDown(0.2);
        doc.fontSize(7).font("Helvetica-Oblique").fillColor(BRAND.teal)
           .text(`Recommended: ${risk.recommendedAction}`, 50, doc.y, { width: doc.page.width - 90 });
        doc.moveDown(0.7);
      }
    }
  }

  // ── SECTION 5: Value Envelope ─────────────────────────────────────────────
  {
    let operationalBaseline: Record<string, number | undefined> = {};
    try {
      const raw = (orgCtx as any)?.operationalBaselineJson;
      if (raw) operationalBaseline = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch { /* ignore */ }

    if (selectedInits.length > 0) {
      checkPageBreak(doc, 60, pageCounter);
      addSectionHeading(doc, "Section 5 — Value");

      const ve = calculateValueEnvelope(selectedInits, operationalBaseline, 36);
      const fmt = (n: number) => n < 0 ? `-£${Math.abs(n).toLocaleString()}` : `£${n.toLocaleString()}`;
      const hasQ = ve.total_quantified_value_gbp.high > 0;

      // KPI row
      const kpis = [
        { label: "Gross Value (High)", value: hasQ ? `£${ve.total_quantified_value_gbp.high.toLocaleString()}` : "—" },
        { label: "Net Value (High)",   value: hasQ ? (ve.net_value_gbp.high >= 0 ? `£${ve.net_value_gbp.high.toLocaleString()}` : `-£${Math.abs(ve.net_value_gbp.high).toLocaleString()}`) : "—" },
        { label: "Payback",            value: ve.payback_period_months ? `${ve.payback_period_months.low}–${ve.payback_period_months.high} months` : "—" },
        { label: "Qualitative Items",  value: String(ve.qualitative_summary.capability_uplift_count + ve.qualitative_summary.risk_avoidance_count + ve.qualitative_summary.strategic_count) },
      ];
      const kpiW = (doc.page.width - 80) / kpis.length;
      const kpiY = doc.y;
      for (let i = 0; i < kpis.length; i++) {
        const x = 40 + i * kpiW;
        doc.rect(x, kpiY, kpiW - 4, 36).fill(BRAND.light);
        doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
           .text(kpis[i].label, x + 4, kpiY + 4, { width: kpiW - 8 });
        doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.navy)
           .text(kpis[i].value, x + 4, kpiY + 16, { width: kpiW - 8 });
      }
      doc.y = kpiY + 44;
      doc.moveDown(0.5);

      // Per-initiative breakdown
      doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND.navy)
         .text("Per-Initiative Value Breakdown", 40, doc.y);
      doc.moveDown(0.3);
      for (const item of ve.by_initiative) {
        checkPageBreak(doc, 30, pageCounter);
        const valueStr = item.quantified_value_gbp
          ? `£${item.quantified_value_gbp.high.toLocaleString()} (low £${item.quantified_value_gbp.low.toLocaleString()})`
          : "Qualitative";
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(BRAND.navy)
           .text(item.display_name, 40, doc.y, { continued: true });
        doc.fontSize(7.5).font("Helvetica").fillColor(BRAND.teal)
           .text(`  ${valueStr}`, { width: doc.page.width - 80 });
        if (item.monetisation_breakdown) {
          doc.fontSize(6.5).font("Helvetica-Oblique").fillColor(BRAND.slate)
             .text(item.monetisation_breakdown, 50, doc.y, { width: doc.page.width - 90 });
        } else if (item.qualitative_value.length > 0) {
          doc.fontSize(6.5).font("Helvetica-Oblique").fillColor(BRAND.slate)
             .text(item.qualitative_value.slice(0, 2).join(" · "), 50, doc.y, { width: doc.page.width - 90 });
        }
        doc.moveDown(0.4);
      }

      // Qualitative bullets
      if (ve.qualitative_summary.bullet_points.length > 0) {
        checkPageBreak(doc, 30, pageCounter);
        doc.moveDown(0.3);
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(BRAND.navy)
           .text("Qualitative Value Highlights", 40, doc.y);
        doc.moveDown(0.2);
        for (const b of ve.qualitative_summary.bullet_points) {
          checkPageBreak(doc, 18, pageCounter);
          doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
             .text(`• ${b}`, 50, doc.y, { width: doc.page.width - 90 });
          doc.moveDown(0.3);
        }
      }

      // Caveat
      checkPageBreak(doc, 30, pageCounter);
      doc.moveDown(0.3);
      doc.fontSize(6.5).font("Helvetica-Oblique").fillColor(BRAND.risk)
         .text(`Note: ${ve.caveat}`, 40, doc.y, { width: doc.page.width - 80 });
      doc.moveDown(0.5);
    }
  }

  // ── D1: Cross-functional Dependencies ──────────────────────────────────────
  {
    const depsMap: Record<string, string[]> = {};
    for (const init of selectedInits) {
      const cfd = (init as any).cross_functional_dependencies as Array<{ function: string; dependency_type: string; description: string }> | undefined;
      if (!cfd || cfd.length === 0) continue;
      for (const dep of cfd) {
        if (!depsMap[dep.function]) depsMap[dep.function] = [];
        depsMap[dep.function].push(`${init.display_name}: ${dep.description}`);
      }
    }
    const functions = Object.keys(depsMap);
    if (functions.length > 0) {
      checkPageBreak(doc, 50, pageCounter);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND.navy)
         .text("Cross-Functional Dependencies", 40, doc.y);
      doc.moveDown(0.3);
      for (const fn of functions) {
        checkPageBreak(doc, 30, pageCounter);
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(BRAND.teal)
           .text(fn, 40, doc.y);
        doc.moveDown(0.2);
        for (const d of depsMap[fn]) {
          checkPageBreak(doc, 16, pageCounter);
          doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
             .text(`• ${d}`, 50, doc.y, { width: doc.page.width - 90 });
          doc.moveDown(0.3);
        }
        doc.moveDown(0.2);
      }
    }
  }

  // ── SECTION 6: Measurement Plan ─────────────────────────────────────────────
  {
    let structuredInputs: Record<string, any> = {};
    try {
      const raw = (orgCtx as any)?.structuredInputsJson;
      if (raw) structuredInputs = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {}
    const measurementCadence: string | undefined = structuredInputs.measurement_cadence;
    const pilotDesign: string | undefined = structuredInputs.pilot_design;
    if (measurementCadence || pilotDesign) {
      checkPageBreak(doc, 60, pageCounter);
      addFooter(doc, pageCounter.n, libraryVersion ?? undefined);
      doc.addPage();
      pageCounter.n++;
      doc.y = 40;
      addSectionHeading(doc, "Section 6 — Measurement & Pilot Design");
      if (measurementCadence) {
        checkPageBreak(doc, 40, pageCounter);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND.navy)
           .text("Measurement Cadence", 40, doc.y);
        doc.moveDown(0.3);
        const cadenceLabels: Record<string, string> = {
          monthly: "Monthly — high-frequency tracking with monthly KPI reviews",
          quarterly: "Quarterly — standard cadence with quarterly business reviews",
          biannual: "Bi-annual — twice-yearly deep-dive assessments",
          annual: "Annual — yearly strategic review cycle",
        };
        doc.fontSize(7.5).font("Helvetica").fillColor(BRAND.slate)
           .text(cadenceLabels[measurementCadence] ?? measurementCadence, 50, doc.y, { width: doc.page.width - 90 });
        doc.moveDown(0.5);
      }
      if (pilotDesign) {
        checkPageBreak(doc, 40, pageCounter);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND.navy)
           .text("Pilot Design Approach", 40, doc.y);
        doc.moveDown(0.3);
        const pilotLabels: Record<string, string> = {
          single_team: "Single Team Pilot — validate with one team before broader rollout",
          department: "Department Pilot — test across a full department",
          business_unit: "Business Unit Pilot — pilot within a defined business unit",
          phased_rollout: "Phased Rollout — sequential deployment across the organisation",
          big_bang: "Big Bang — organisation-wide simultaneous deployment",
        };
        doc.fontSize(7.5).font("Helvetica").fillColor(BRAND.slate)
           .text(pilotLabels[pilotDesign] ?? pilotDesign, 50, doc.y, { width: doc.page.width - 90 });
        doc.moveDown(0.5);
      }
      // KPI framework note
      checkPageBreak(doc, 40, pageCounter);
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor(BRAND.navy)
         .text("Recommended KPI Framework", 40, doc.y);
      doc.moveDown(0.3);
      const kpiFramework = [
        "Adoption rate: % of target users actively using the AI tool within 90 days",
        "Quality delta: measurable improvement in output quality vs. baseline",
        "Time-to-value: weeks from deployment to first measurable business outcome",
        "Employee sentiment: quarterly pulse score on AI tool usefulness (1–5)",
        "ROI realisation: % of projected value envelope achieved at 12 months",
      ];
      for (const kpi of kpiFramework) {
        checkPageBreak(doc, 16, pageCounter);
        doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
           .text(`• ${kpi}`, 50, doc.y, { width: doc.page.width - 90 });
        doc.moveDown(0.3);
      }
    }
  }
  // Disclosure note
  checkPageBreak(doc, 40, pageCounter);
  doc.moveDown(0.5);
  doc.fontSize(7).font("Helvetica-Oblique").fillColor(BRAND.slate)
     .text("Capability scores are derived from AiQ adaptive assessments. Benchmarks are based on synthetic norms calibrated against the AiQ question bank. This report is confidential and intended for internal strategic planning purposes only.", 40, doc.y, { width: doc.page.width - 80 });
  addFooter(doc, pageCounter.n, libraryVersion ?? undefined);
}

// ─── Business Case Intermediate Export ──────────────────────────────────────

async function generateBusinessCasePDF(
  doc: PDFKit.PDFDocument,
  userId: string,
  tenantId: string,
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const orgCtxRows = await db.select().from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, tenantId)).limit(1);
  const ctx = orgCtxRows[0] ?? null;

  const tenant = await getTenantById(tenantId);
  const orgName = tenant?.name ?? "Your Organisation";

  const narrative: string = (ctx as any)?.businessCaseNarrative ?? "";
  const strategyStatement: string = (ctx as any)?.strategyStatement ?? "";
  const strategyArchetype: string = (ctx as any)?.strategyArchetype ?? "";

  // Parse selected initiatives
  let selectedIds: string[] = [];
  try {
    const raw = (ctx as any)?.selectedInitiativesJson;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      selectedIds = parsed.map((e: any) => (typeof e === "string" ? e : e?.id ?? e?.initiativeId ?? "")).filter(Boolean);
    }
  } catch {}

  // Parse outcomes
  type Outcome = { title?: string; baseline_value?: string; target_value?: string; target_date?: string; primary_measure?: string };
  let outcomes: Outcome[] = [];
  try {
    const raw = (ctx as any)?.outcomesJson;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) outcomes = parsed;
  } catch {}

  // Parse capability assessment
  type CapDim = { current?: number; needed?: number; tactics?: string[] };
  type CapAssessment = { skills?: CapDim; capacity?: CapDim; changeReadiness?: CapDim; vendorEcosystem?: CapDim };
  let capAssessment: CapAssessment = {};
  try {
    const raw = (ctx as any)?.capabilityAssessmentJson;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === "object") capAssessment = parsed;
  } catch {}

  // Fetch risk acknowledgements
  const riskAcks = await db.select().from(riskAcknowledgements)
    .where(and(eq(riskAcknowledgements.tenantId, tenantId), eq(riskAcknowledgements.itemType, "risk")));
  const activeRisks = riskAcks.filter(r => !r.revokedAt);

  // Compute value envelope
  const allInitiatives = getAllInitiatives();
  const initiativeMap = new Map(allInitiatives.map(i => [i.initiative_id, i]));
  const resolvedIds = resolveInitiativeIds(selectedIds);
  const selectedInits = resolvedIds.map(id => initiativeMap.get(id)).filter(Boolean) as typeof allInitiatives;
  let valueEnvelope: ValueEnvelope | null = null;
  try {
    let baseline: Record<string, number> = {};
    try {
      const raw = (ctx as any)?.operationalBaselineJson;
      baseline = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
    } catch {}
    if (selectedInits.length > 0) {
      valueEnvelope = calculateValueEnvelope(selectedInits, baseline, 36);
    }
  } catch {}

  // ── Layout helpers ─────────────────────────────────────────────────────────
  const W = doc.page.width;
  const MARGIN = 44;
  const CONTENT_W = W - MARGIN * 2;
  const pageCounter = { n: 1 };

  function checkBreak(needed: number) {
    if (doc.y + needed > doc.page.height - 60) {
      doc.addPage();
      pageCounter.n++;
    }
  }

  function sectionHeader(title: string) {
    checkBreak(30);
    doc.moveDown(0.8);
    doc.fontSize(11).font("Helvetica-Bold").fillColor(BRAND.navy)
       .text(title.toUpperCase(), MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.2);
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y)
       .strokeColor(BRAND.gold).lineWidth(1).stroke();
    doc.moveDown(0.4);
  }

  function bodyText(text: string, indent = 0) {
    checkBreak(20);
    doc.fontSize(9).font("Helvetica").fillColor(BRAND.slate)
       .text(text, MARGIN + indent, doc.y, { width: CONTENT_W - indent, lineGap: 2 });
    doc.moveDown(0.3);
  }

  function tableRow(cols: string[], widths: number[], isHeader = false) {
    checkBreak(18);
    const rowY = doc.y;
    let x = MARGIN;
    const font = isHeader ? "Helvetica-Bold" : "Helvetica";
    const color = isHeader ? BRAND.navy : BRAND.slate;
    const size = isHeader ? 8 : 8;
    cols.forEach((col, i) => {
      doc.fontSize(size).font(font).fillColor(color)
         .text(col, x + 3, rowY + 3, { width: widths[i] - 6, lineBreak: false });
      x += widths[i];
    });
    doc.moveTo(MARGIN, rowY).lineTo(MARGIN + CONTENT_W, rowY)
       .strokeColor(BRAND.border).lineWidth(0.5).stroke();
    doc.y = rowY + 18;
  }

  // ── Cover header ───────────────────────────────────────────────────────────
  doc.rect(0, 0, W, 90).fill(BRAND.navy);
  doc.fontSize(20).font("Helvetica-Bold").fillColor(BRAND.gold)
     .text("Business Case", MARGIN, 22, { width: CONTENT_W });
  doc.fontSize(10).font("Helvetica").fillColor(BRAND.white)
     .text(`${orgName}  ·  Intermediate Export  ·  ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, MARGIN, 52, { width: CONTENT_W });
  doc.y = 105;

  // Intermediate export notice
  doc.rect(MARGIN, doc.y, CONTENT_W, 28).fill("#FEF3C7");
  doc.fontSize(8).font("Helvetica-Oblique").fillColor("#92400E")
     .text("⚠  This is an intermediate export for internal review. The final board report will be produced at Stage 10 of the strategy process.", MARGIN + 8, doc.y + 8, { width: CONTENT_W - 16 });
  doc.y += 36;

  // ── Strategy context ───────────────────────────────────────────────────────
  if (strategyStatement || strategyArchetype) {
    sectionHeader("Strategy Context");
    if (strategyArchetype) {
      bodyText(`Archetype: ${strategyArchetype.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`);
    }
    if (strategyStatement) {
      bodyText(strategyStatement);
    }
  }

  // ── Business case narrative ────────────────────────────────────────────────
  sectionHeader("Business Case Narrative");
  if (narrative) {
    // Split into paragraphs
    const paras = narrative.split(/\n+/).filter(p => p.trim());
    for (const para of paras) {
      bodyText(para);
    }
  } else {
    bodyText("No narrative has been drafted yet. Complete Stage 7 to generate the business case narrative.");
  }

  // ── Value summary ──────────────────────────────────────────────────────────
  sectionHeader("Value Summary (3-Year Horizon)");
  if (valueEnvelope) {
    const fmt = (v: number) => `£${(v / 1_000_000).toFixed(1)}M`;
    bodyText(`Estimated value range: ${fmt(valueEnvelope.total_quantified_value_gbp.low)} – ${fmt(valueEnvelope.total_quantified_value_gbp.high)}`);
    bodyText(`Net value (after costs): ${fmt(valueEnvelope.net_value_gbp.low)} – ${fmt(valueEnvelope.net_value_gbp.high)}`);
    if (valueEnvelope.payback_period_months) {
      bodyText(`Payback period: ${valueEnvelope.payback_period_months.low}–${valueEnvelope.payback_period_months.high} months`);
    }
    if (valueEnvelope.qualitative_summary.bullet_points.length) {
      doc.moveDown(0.3);
      bodyText("Qualitative highlights:");
      for (const bp of valueEnvelope.qualitative_summary.bullet_points.slice(0, 5)) {
        bodyText(`• ${bp}`, 10);
      }
    }
    // Per-initiative table
    if (valueEnvelope.by_initiative.length) {
      doc.moveDown(0.5);
      const colW = [CONTENT_W * 0.45, CONTENT_W * 0.28, CONTENT_W * 0.27];
      tableRow(["Initiative", "Value (3yr)", "Payback"], colW, true);
      for (const init of valueEnvelope.by_initiative.slice(0, 12)) {
        const valStr = init.quantified_value_gbp
          ? `${fmt(init.quantified_value_gbp.low)} – ${fmt(init.quantified_value_gbp.high)}`
          : "Qualitative";
        const payStr = init.payback_months
          ? `${init.payback_months.low}–${init.payback_months.high} mo`
          : "—";
        tableRow([init.display_name, valStr, payStr], colW);
      }
    }
    doc.moveDown(0.3);
    doc.fontSize(7).font("Helvetica-Oblique").fillColor(BRAND.slate)
       .text(valueEnvelope.caveat, MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.3);
  } else {
    bodyText("Value data unavailable. Ensure initiatives have been selected and operational baseline data has been entered.");
  }

  // ── Outcomes ───────────────────────────────────────────────────────────────
  if (outcomes.length) {
    sectionHeader("Strategy Outcomes");
    const colW = [CONTENT_W * 0.4, CONTENT_W * 0.2, CONTENT_W * 0.2, CONTENT_W * 0.2];
    tableRow(["Outcome", "Baseline", "Target", "Target Date"], colW, true);
    for (const o of outcomes) {
      tableRow([
        o.title ?? "",
        o.baseline_value ?? "—",
        o.target_value ?? "—",
        o.target_date ?? "—",
      ], colW);
    }
  }

  // ── Risk acknowledgements ─────────────────────────────────────────────────
  sectionHeader("Risk Acknowledgements");
  if (activeRisks.length) {
    const colW = [CONTENT_W * 0.5, CONTENT_W * 0.3, CONTENT_W * 0.2];
    tableRow(["Risk Item", "Note", "Acknowledged"], colW, true);
    for (const r of activeRisks) {
      const date = new Date(r.acknowledgedAt).toLocaleDateString("en-GB");
      tableRow([r.itemId.replace(/_/g, " "), r.note ?? "—", date], colW);
    }
  } else {
    bodyText("No risks have been formally acknowledged yet.");
  }

  // ── Capability gap summary ────────────────────────────────────────────────
  const capDims = [
    { key: "skills",          label: "Skills" },
    { key: "capacity",        label: "Capacity" },
    { key: "changeReadiness", label: "Change Readiness" },
    { key: "vendorEcosystem", label: "Vendor Ecosystem" },
  ] as const;
  const scoredDims = capDims.filter(d => (capAssessment as any)[d.key]?.current != null);
  if (scoredDims.length) {
    sectionHeader("Capability Gap Summary");
    const colW = [CONTENT_W * 0.35, CONTENT_W * 0.15, CONTENT_W * 0.15, CONTENT_W * 0.15, CONTENT_W * 0.2];
    tableRow(["Dimension", "Current", "Needed", "Gap", "Tactics"], colW, true);
    for (const d of capDims) {
      const dim = (capAssessment as any)[d.key] as CapDim | undefined;
      if (!dim) continue;
      const gap = (dim.needed ?? 0) - (dim.current ?? 0);
      const gapStr = gap > 0 ? `+${gap}` : gap < 0 ? `${gap} (ahead)` : "0 (met)";
      const tactics = dim.tactics?.length ? `${dim.tactics.length} listed` : "None";
      tableRow([d.label, String(dim.current ?? "—"), String(dim.needed ?? "—"), gapStr, tactics], colW);
    }
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.moveDown(1);
  doc.fontSize(7).font("Helvetica-Oblique").fillColor(BRAND.slate)
     .text(`Generated by AiQ HR Capability Intelligence Platform  ·  Confidential  ·  ${new Date().toLocaleDateString("en-GB")}`, MARGIN, doc.y, { width: CONTENT_W, align: "center" });
}

// ─── Board Report PDF ────────────────────────────────────────────────────────

async function generateBoardReportPDF(
  doc: PDFKit.PDFDocument,
  _userId: string,
  tenantId: string,
) {
  const MARGIN = 44;
  const CONTENT_W = doc.page.width - MARGIN * 2;

  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const orgCtxRows = await db.select().from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, tenantId)).limit(1);
  const ctx = orgCtxRows[0] ?? null;
  const tenant = await getTenantById(tenantId);
  const orgName = tenant?.name ?? "Your Organisation";

  let sectionsMap: Record<string, { content?: string; isAiGenerated?: boolean; editedAt?: number | null }> = {};
  try {
    const raw = (ctx as any)?.boardReportSectionsJson;
    if (raw) sectionsMap = JSON.parse(raw);
  } catch {}

  const includeNotes = (ctx as any)?.boardReportIncludeNotes ?? false;
  const reviewNotes: string = (ctx as any)?.reviewSessionNotes ?? "";

  const SECTION_ORDER = [
    "context", "strategic_direction", "initiative_portfolio",
    "investment_case", "capability_readiness", "governance",
  ];
  const SECTION_TITLES: Record<string, string> = {
    context: "1. Context & Mandate",
    strategic_direction: "2. Strategic Direction",
    initiative_portfolio: "3. Initiative Portfolio",
    investment_case: "4. Investment Case",
    capability_readiness: "5. Capability Readiness",
    governance: "6. Governance & Next Steps",
  };

  // Cover page
  doc.rect(0, 0, doc.page.width, 80).fill(BRAND.navy);
  doc.rect(0, 80, doc.page.width, 3).fill(BRAND.gold);
  doc.fontSize(24).font("Helvetica-Bold").fillColor(BRAND.white)
     .text(orgName, MARGIN, 100, { width: CONTENT_W, align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(16).font("Helvetica").fillColor(BRAND.gold)
     .text("AI-Enabled HR Strategy", { width: CONTENT_W, align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor(BRAND.white)
     .text("Board Report — Intermediate Export", { width: CONTENT_W, align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#A0AEC0")
     .text(new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }), { width: CONTENT_W, align: "center" });

  // Sections
  for (const sectionId of SECTION_ORDER) {
    doc.addPage();
    const title = SECTION_TITLES[sectionId] ?? sectionId;
    const section = sectionsMap[sectionId];
    const content = section?.content?.trim() ?? "";

    doc.rect(0, 0, doc.page.width, 48).fill(BRAND.navy);
    doc.rect(0, 48, doc.page.width, 2).fill(BRAND.gold);
    doc.fontSize(14).font("Helvetica-Bold").fillColor(BRAND.white)
       .text(title, MARGIN, 16, { width: CONTENT_W });

    doc.y = 64;

    if (section?.isAiGenerated && !section?.editedAt) {
      doc.fontSize(8).font("Helvetica-Oblique").fillColor("#D97706")
         .text("AI-generated — please review before submission", MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.4);
    } else if (section?.editedAt) {
      doc.fontSize(8).font("Helvetica-Oblique").fillColor("#2563EB")
         .text(`Edited ${new Date(section.editedAt).toLocaleDateString("en-GB")}`, MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.4);
    }

    if (content) {
      doc.fontSize(10).font("Helvetica").fillColor(BRAND.navy)
         .text(content, MARGIN, doc.y, { width: CONTENT_W, lineGap: 4 });
    } else {
      doc.fontSize(10).font("Helvetica-Oblique").fillColor(BRAND.slate)
         .text("[Section not yet generated]", MARGIN, doc.y, { width: CONTENT_W });
    }

    // Page footer
    const fy = doc.page.height - 32;
    doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
       .text(`${orgName}  ·  Board Report  ·  Intermediate Export  ·  ${new Date().toLocaleDateString("en-GB")}`, MARGIN, fy, { width: CONTENT_W });
  }

  // Appendix: review session notes (opt-in)
  if (includeNotes && reviewNotes.trim()) {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, 48).fill(BRAND.navy);
    doc.rect(0, 48, doc.page.width, 2).fill(BRAND.gold);
    doc.fontSize(14).font("Helvetica-Bold").fillColor(BRAND.white)
       .text("Appendix: Review Session Notes", MARGIN, 16, { width: CONTENT_W });
    doc.y = 64;
    doc.fontSize(10).font("Helvetica").fillColor(BRAND.navy)
       .text(reviewNotes.trim(), MARGIN, doc.y, { width: CONTENT_W, lineGap: 4 });
  }
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerPdfRoutes(app: Express) {
  app.get("/api/pdf/:type", async (req: Request, res: Response) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorised" });
        return;
      }

      const type = req.params.type;
      const { sessionId, moduleId } = req.query as Record<string, string>;

      // Filename map
      const filenames: Record<string, string> = {
        assessment_report:  "aiq-assessment-report.pdf",
        learning_plan:      "aiq-learning-plan.pdf",
        module:             `aiq-module-${moduleId ?? "content"}.pdf`,
        team_dashboard:     "aiq-team-dashboard.pdf",
        capability_profile: "aiq-capability-profile.pdf",
        ai_strategy:        "aiq-ai-strategy-report.pdf",
        board_pack:         "aiq-hr-ai-strategy-board-pack.pdf",
        strategic_framing:  "aiq-strategic-framing.pdf",
        business_case:      "aiq-business-case-intermediate.pdf",
        board_report:       "aiq-board-report-intermediate.pdf",
      };

      const filename = filenames[type];
      if (!filename) {
        res.status(400).json({ error: "Unknown PDF type" });
        return;
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      // board_pack and strategic_framing manage their own margins (MARGIN=44 constant).
      // Using margin: 0 prevents PDFKit from auto-paginating when footer text is drawn
      // near the bottom of the page (y > PAGE_H - margin), which caused extra blank pages.
      const docMargin = (type === "board_pack" || type === "strategic_framing") ? 0 : 40;
      const doc = new PDFDocument({ size: "A4", margin: docMargin, bufferPages: true });
      doc.pipe(res);

      switch (type) {
        case "assessment_report":
          await generateAssessmentReport(doc, user.id, sessionId);
          break;
        case "learning_plan":
          await generateLearningPlanPDF(doc, user.id);
          break;
        case "module":
          if (!moduleId) { doc.text("Module ID required"); break; }
          await generateModulePDF(doc, moduleId);
          break;
        case "team_dashboard":
          await generateTeamDashboardPDF(doc, user.id, user.tenantId);
          break;
        case "capability_profile":
          await generateCapabilityProfilePDF(doc, user.id);
          break;
        case "ai_strategy":
          await generateAIStrategyReport(doc, user.id, user.tenantId);
          break;
        case "board_pack":
          await generateBoardPackPDF(doc, user.id, user.tenantId);
          break;
        case "strategic_framing":
          await generateStrategicFramingPDF(doc, user.id, user.tenantId);
          break;
        case "business_case":
          await generateBusinessCasePDF(doc, user.id, user.tenantId);
          break;
        case "board_report":
          await generateBoardReportPDF(doc, user.id, user.tenantId);
          break;
      }

      doc.end();
    } catch (err: any) {
      console.error("[PDF] Error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message ?? "PDF generation failed" });
      }
    }
  });
}
