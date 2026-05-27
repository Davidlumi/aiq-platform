import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys } from "../db";
import {
  reportJobs,
  users,
  userStates,
  credibilityScores,
  riskScores,
  assessmentSessions,
  assessmentScores,
  learningPlans,
  learningPlanItems,
  contentProgress,
  policyEvaluations,
  auditLogs,
} from "../../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

export const reportRouter = router({
  // List report jobs
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (
        !myRoles.some(r =>
          ["platform_super_admin", "tenant_admin", "hr_leader", "auditor"].includes(r)
        )
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const offset = (input.page - 1) * input.pageSize;
      const jobs = await db
        .select()
        .from(reportJobs)
        .where(eq(reportJobs.tenantId, ctx.user.tenantId))
        .orderBy(desc(reportJobs.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      return { jobs, page: input.page, pageSize: input.pageSize };
    }),

  // Request a report generation
  request: protectedProcedure
    .input(
      z.object({
        reportType: z.enum([
          "learner_report",
          "manager_team_report",
          "org_readiness_report",
          "audit_evidence_pack",
          "dual_audience_narrative",
          "capability_requirement_fit",
          "trajectory_report",
          "small_function_report",
        ]),
        parameters: z.record(z.string(), z.unknown()).default({}),
        format: z.enum(["pdf", "csv", "json"]).default("json"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);

      // Permission check per report type
      if (
        input.reportType === "audit_evidence_pack" &&
        !myRoles.some(r => ["platform_super_admin", "tenant_admin", "auditor"].includes(r))
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (
        input.reportType === "org_readiness_report" &&
        !myRoles.some(r =>
          ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r)
        )
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Generate report data synchronously (in production, this would be queued)
      const reportData = await generateReport(
        db,
        ctx.user.tenantId,
        ctx.user.id,
        input.reportType,
        input.parameters
      );

      const jobId = nanoid();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

      const manifest = {
        jobId,
        reportType: input.reportType,
        format: input.format,
        requestedBy: ctx.user.id,
        requestedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        recordCount: Array.isArray(reportData) ? reportData.length : 1,
        tenantId: ctx.user.tenantId,
        // Include the actual report data so the frontend can render it
        data: reportData,
      };

      // Store as JSON download URL (in production, upload to S3)
      const downloadUrl = `/api/reports/${jobId}/download`;

      await db.insert(reportJobs).values({
        id: jobId,
        tenantId: ctx.user.tenantId,
        reportType: input.reportType,
        requestedBy: ctx.user.id,
        parametersJson: JSON.stringify({ ...input.parameters, format: input.format }),
        status: "completed",
        downloadUrl,
        manifestJson: JSON.stringify(manifest),
        expiresAt,
        completedAt: new Date(),
      });

      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "report.generated",
        targetType: "report_job",
        targetId: jobId,
        metadataJson: JSON.stringify({ reportType: input.reportType, format: input.format }),
      });

      return {
        jobId,
        status: "completed",
        downloadUrl,
        manifest,
        data: reportData,
      };
    }),

  // Get a specific report job
  get: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const job = await db
        .select()
        .from(reportJobs)
        .where(
          and(
            eq(reportJobs.id, input.jobId),
            eq(reportJobs.tenantId, ctx.user.tenantId)
          )
        )
        .limit(1);

      if (!job[0]) throw new TRPCError({ code: "NOT_FOUND" });
      // PROD-1.1: Ownership check — only the requesting user or an admin/hr_leader can read the job
      const isOwner = job[0].requestedBy === ctx.user.id;
      if (!isOwner) {
        const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
        const canRead = myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r));
        if (!canRead) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to view this report" });
      }
      return job[0];
    }),
});

async function generateReport(
  db: any,
  tenantId: string,
  requestedBy: string,
  reportType: string,
  parameters: Record<string, unknown>
): Promise<unknown> {
  switch (reportType) {
    case "learner_report": {
      const userId = (parameters.userId as string) ?? requestedBy;
      const state = await db
        .select()
        .from(userStates)
        .where(and(eq(userStates.userId, userId), isNull(userStates.effectiveTo)))
        .limit(1);

      const credibility = await db
        .select()
        .from(credibilityScores)
        .where(eq(credibilityScores.userId, userId))
        .orderBy(desc(credibilityScores.generatedAt))
        .limit(1);

      const risk = await db
        .select()
        .from(riskScores)
        .where(eq(riskScores.userId, userId))
        .orderBy(desc(riskScores.generatedAt))
        .limit(1);

      const sessions = await db
        .select()
        .from(assessmentSessions)
        .where(and(eq(assessmentSessions.userId, userId), eq(assessmentSessions.state, "completed")))
        .orderBy(desc(assessmentSessions.completedAt))
        .limit(5);

      return {
        userId,
        state: state[0] ?? null,
        credibility: credibility[0] ?? null,
        risk: risk[0] ?? null,
        assessmentHistory: sessions,
      };
    }

    case "manager_team_report": {
      const allUsers = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
        .from(users)
        .where(eq(users.tenantId, tenantId));

      const teamData = await Promise.all(
        allUsers.map(async (u: any) => {
          const state = await db
            .select()
            .from(userStates)
            .where(and(eq(userStates.userId, u.id), isNull(userStates.effectiveTo)))
            .limit(1);
          return { ...u, state: state[0] ?? null };
        })
      );

      return teamData;
    }

    case "org_readiness_report": {
      const allUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.tenantId, tenantId));

      const states = await Promise.all(
        allUsers.map(async (u: any) => {
          const state = await db
            .select()
            .from(userStates)
            .where(and(eq(userStates.userId, u.id), isNull(userStates.effectiveTo)))
            .limit(1);
          return state[0] ?? null;
        })
      );

      const validStates = states.filter(Boolean);
      const distribution = {
        total: validStates.length,
        compliant: validStates.filter((s: any) => s.complianceState === "compliant").length,
        atRisk: validStates.filter((s: any) => s.complianceState === "at_risk").length,
        breach: validStates.filter((s: any) => s.complianceState === "breach").length,
        highCredibility: validStates.filter((s: any) => s.credibilityState === "high").length,
        highRisk: validStates.filter((s: any) => s.riskState === "high").length,
      };

      return { distribution, generatedAt: new Date().toISOString() };
    }

    case "audit_evidence_pack": {
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenantId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(500);

      const incidents = await db
        .select()
        .from(policyEvaluations)
        .orderBy(desc(policyEvaluations.createdAt))
        .limit(200);

      return {
        auditLogs: logs,
        policyIncidents: incidents.filter((e: any) => e.result !== "no_action"),
        generatedAt: new Date().toISOString(),
        tenantId,
      };
    }

    case "dual_audience_narrative": {
      const userId = (parameters.userId as string) ?? requestedBy;
      const state = await db.select().from(userStates)
        .where(and(eq(userStates.userId, userId), isNull(userStates.effectiveTo))).limit(1);
      const scores = await db.select({
        overallScore: assessmentScores.overallScore,
        scoreBreakdownJson: assessmentScores.scoreBreakdownJson,
        generatedAt: assessmentScores.generatedAt,
      }).from(assessmentScores)
        .innerJoin(assessmentSessions, eq(assessmentSessions.id, assessmentScores.sessionId))
        .where(eq(assessmentSessions.userId, userId))
        .orderBy(desc(assessmentScores.generatedAt)).limit(1);
      const credibility = await db.select().from(credibilityScores)
        .where(eq(credibilityScores.userId, userId))
        .orderBy(desc(credibilityScores.generatedAt)).limit(1);
      const s = state[0];
      const sc = scores[0];
      const cr = credibility[0];
      const overallScore = sc ? parseFloat(String(sc.overallScore ?? 0)) : 0;
      const readinessState = s?.primaryState ?? "not_assessed";
      const credBand = cr?.band ?? "low";
      return {
        userId,
        readinessState,
        overallScore,
        credibilityBand: credBand,
        narratives: {
          individual: generateIndividualNarrative(readinessState, overallScore, credBand),
          manager: generateManagerNarrative(readinessState, overallScore, credBand),
          board: generateBoardNarrative(readinessState, overallScore),
        },
        generatedAt: new Date().toISOString(),
      };
    }
    case "capability_requirement_fit": {
      const userId = (parameters.userId as string) ?? requestedBy;
      const scores = await db.select({
        overallScore: assessmentScores.overallScore,
        scoreBreakdownJson: assessmentScores.scoreBreakdownJson,
      }).from(assessmentScores)
        .innerJoin(assessmentSessions, eq(assessmentSessions.id, assessmentScores.sessionId))
        .where(eq(assessmentSessions.userId, userId))
        .orderBy(desc(assessmentScores.generatedAt)).limit(1);
      const sc = scores[0];
      const breakdown = sc ? (sc.scoreBreakdownJson as Record<string, any> ?? {}) : {};
      const V10_DOMAINS = [
        { key: "ai_interaction", label: "AI Interaction", threshold: 60 },
        { key: "ai_output_evaluation", label: "AI Output Evaluation", threshold: 60 },
        { key: "ai_ethics_trust", label: "AI Ethics & Trust", threshold: 65 },
        { key: "ai_workflow_design", label: "AI Workflow Design", threshold: 55 },
        { key: "workforce_ai_readiness", label: "Workforce AI Readiness", threshold: 55 },
        { key: "ai_change_leadership", label: "AI Change Leadership", threshold: 60 },
      ];
      const fitAnalysis = V10_DOMAINS.map(d => {
        const score = breakdown[d.key]?.score ?? 0;
        const gap = Math.max(0, d.threshold - score);
        return {
          capability: d.key,
          label: d.label,
          score: Math.round(score),
          threshold: d.threshold,
          gap: Math.round(gap),
          status: score >= d.threshold ? "meets" : score >= d.threshold * 0.8 ? "approaching" : "gap",
        };
      });
      return {
        userId,
        fitAnalysis,
        overallFit: fitAnalysis.filter(f => f.status === "meets").length / fitAnalysis.length,
        generatedAt: new Date().toISOString(),
      };
    }
    case "trajectory_report": {
      const userId = (parameters.userId as string) ?? requestedBy;
      const allSessions = await db.select({
        id: assessmentSessions.id,
        completedAt: assessmentSessions.completedAt,
      }).from(assessmentSessions)
        .where(and(eq(assessmentSessions.userId, userId), eq(assessmentSessions.state, "completed")))
        .orderBy(assessmentSessions.completedAt);
      const trajectory = await Promise.all(allSessions.map(async (sess: any) => {
        const sc = await db.select({
          overallScore: assessmentScores.overallScore,
          scoreBreakdownJson: assessmentScores.scoreBreakdownJson,
        }).from(assessmentScores).where(eq(assessmentScores.sessionId, sess.id)).limit(1);
        return {
          sessionId: sess.id,
          completedAt: sess.completedAt,
          overallScore: sc[0] ? parseFloat(String(sc[0].overallScore)) : null,
          breakdown: sc[0]?.scoreBreakdownJson ?? {},
        };
      }));
      const validPoints = trajectory.filter((t: any) => t.overallScore !== null);
      let trend: string = "insufficient_data";
      if (validPoints.length >= 2) {
        const first = validPoints[0].overallScore!;
        const last = validPoints[validPoints.length - 1].overallScore!;
        const delta = last - first;
        trend = delta > 5 ? "improving" : delta < -5 ? "declining" : "stable";
      }
      return { userId, trajectory, trend, dataPoints: validPoints.length, generatedAt: new Date().toISOString() };
    }
    case "small_function_report": {
      const allUsers = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.tenantId, tenantId));
      const summaries = await Promise.all((allUsers as any[]).map(async (u: any) => {
        const state = await db.select().from(userStates)
          .where(and(eq(userStates.userId, u.id), isNull(userStates.effectiveTo))).limit(1);
        const scores = await db.select({ overallScore: assessmentScores.overallScore })
          .from(assessmentScores)
          .innerJoin(assessmentSessions, eq(assessmentSessions.id, assessmentScores.sessionId))
          .where(eq(assessmentSessions.userId, u.id))
          .orderBy(desc(assessmentScores.generatedAt)).limit(1);
        return {
          userId: u.id,
          name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
          readinessState: state[0]?.primaryState ?? "not_assessed",
          overallScore: scores[0] ? parseFloat(String(scores[0].overallScore)) : null,
        };
      }));
      const assessed = summaries.filter((s: any) => s.overallScore !== null);
      return {
        totalHeadcount: summaries.length,
        assessed: assessed.length,
        assessmentRate: summaries.length > 0 ? assessed.length / summaries.length : 0,
        readinessDistribution: {
          ready: assessed.filter((s: any) => s.readinessState === "safe").length,
          developing: assessed.filter((s: any) => ["at_risk", "foundation_gap"].includes(s.readinessState)).length,
          notStarted: summaries.length - assessed.length,
        },
        teamSummaries: summaries,
        note: "Small HR Function Mode: simplified thresholds applied. Evidence requirements proportionally adjusted.",
        generatedAt: new Date().toISOString(),
      };
    }
    default:
      return {};
  }
}

// ─── Narrative Generators ─────────────────────────────────────────────────────

function generateIndividualNarrative(readinessState: string, score: number, credBand: string): string {
  if (readinessState === "safe") {
    return `Your AiQ assessment places you in the AI-Ready category with an overall score of ${Math.round(score)}. You demonstrate strong capability across the core AI competency domains. Your responses show consistent, calibrated judgement when working with AI tools and outputs. Continue building on this foundation by exploring advanced AI workflow design and change leadership scenarios.`;
  } else if (readinessState === "at_risk") {
    return `Your AiQ assessment places you in the Developing category with an overall score of ${Math.round(score)}. You show emerging capability in some areas but have identified gaps that could affect your effectiveness in high-stakes AI situations. Your personalised learning path targets these specific gaps. Reassessment is recommended after completing the prescribed modules.`;
  } else if (readinessState === "foundation_gap") {
    return `Your AiQ assessment identifies a Foundation Gap — your score of ${Math.round(score)} indicates that foundational AI interaction and output evaluation skills need strengthening. This is a starting point, not a ceiling. Your learning path begins with core prompt interaction and output validation modules.`;
  }
  return `Your AiQ assessment is in progress. Complete all required assessment items to receive your full capability profile and personalised learning prescription.`;
}

function generateManagerNarrative(readinessState: string, score: number, credBand: string): string {
  if (readinessState === "safe") {
    return `This team member has achieved AI-Ready status (score: ${Math.round(score)}, credibility: ${credBand}). They demonstrate reliable AI judgement and are suitable for roles requiring autonomous AI-assisted decision-making. Consider for AI champion or peer-coaching responsibilities.`;
  } else if (readinessState === "at_risk") {
    return `This team member is in Developing status (score: ${Math.round(score)}). Capability gaps identified in one or more domains. A structured learning plan has been generated. Recommend supervised AI tool usage until reassessment confirms improvement. Check-in conversation suggested within 30 days.`;
  } else if (readinessState === "foundation_gap") {
    return `This team member has a Foundation Gap (score: ${Math.round(score)}). Core AI interaction skills require development before independent AI tool use. Restrict unsupervised AI tool access. Prioritise foundational learning modules. Reassessment recommended in 60–90 days.`;
  }
  return `This team member has not yet completed their AiQ assessment. Please prompt them to complete the assessment.`;
}

function generateBoardNarrative(readinessState: string, score: number): string {
  const stateMap: Record<string, string> = {
    safe: "AI-Ready",
    at_risk: "Developing",
    foundation_gap: "Foundation Gap",
    not_assessed: "Not Assessed",
    insufficient_evidence: "Insufficient Evidence",
  };
  return `Status: ${stateMap[readinessState] ?? readinessState}. Score: ${Math.round(score)}/100.`;
}
