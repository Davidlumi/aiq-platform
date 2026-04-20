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

    default:
      return {};
  }
}
