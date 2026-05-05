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
import { parse as parseCookies } from "cookie";
import { COOKIE_NAME } from "../shared/const";
import { verifySessionToken } from "./auth";
import { getUserById, getDb, getTenantById } from "./db";
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

function addFooter(doc: PDFKit.PDFDocument, pageNum: number) {
  const y = doc.page.height - 36;
  doc.rect(0, y - 6, doc.page.width, 42).fill(BRAND.light);
  doc.rect(0, y - 6, doc.page.width, 1).fill(BRAND.border);
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.fontSize(7).font("Helvetica").fillColor(BRAND.slate)
     .text(`Generated ${date} · AiQ Enterprise HR Capability Intelligence · Confidential`, 40, y + 4, { width: doc.page.width - 120 });
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
  }

  addFooter(doc, pageCounter.n);
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

  // ── PDF generation ────────────────────────────────────────────────────────
  const pageCounter = { n: 1 };
  const reportDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  // Page 1: Cover / executive summary
  addBrandedHeader(doc, "AI Strategy Report", `${orgName} · ${reportDate}`);

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

  // Disclosure note
  checkPageBreak(doc, 40, pageCounter);
  doc.moveDown(0.5);
  doc.fontSize(7).font("Helvetica-Oblique").fillColor(BRAND.slate)
     .text("Capability scores are derived from AiQ adaptive assessments. Benchmarks are based on synthetic norms calibrated against the AiQ question bank. This report is confidential and intended for internal strategic planning purposes only.", 40, doc.y, { width: doc.page.width - 80 });

  addFooter(doc, pageCounter.n);
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
      };

      const filename = filenames[type];
      if (!filename) {
        res.status(400).json({ error: "Unknown PDF type" });
        return;
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
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
