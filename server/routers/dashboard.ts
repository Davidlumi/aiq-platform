import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys } from "../db";
import {
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
  revalidationSchedules,
  auditLogs,
} from "../../drizzle/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";

export const dashboardRouter = router({
  // Learner dashboard data
  learner: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const userId = ctx.user.id;

    // Current state
    const state = await db
      .select()
      .from(userStates)
      .where(and(eq(userStates.userId, userId), isNull(userStates.effectiveTo)))
      .orderBy(desc(userStates.effectiveFrom))
      .limit(1);

    // Latest credibility
    const credibility = await db
      .select()
      .from(credibilityScores)
      .where(eq(credibilityScores.userId, userId))
      .orderBy(desc(credibilityScores.generatedAt))
      .limit(1);

    // Latest risk
    const risk = await db
      .select()
      .from(riskScores)
      .where(eq(riskScores.userId, userId))
      .orderBy(desc(riskScores.generatedAt))
      .limit(1);

    // Active learning plan
    const plan = await db
      .select()
      .from(learningPlans)
      .where(and(eq(learningPlans.userId, userId), eq(learningPlans.state, "active")))
      .orderBy(desc(learningPlans.generatedAt))
      .limit(1);

    let planProgress = null;
    if (plan[0]) {
      const items = await db
        .select()
        .from(learningPlanItems)
        .where(eq(learningPlanItems.learningPlanId, plan[0].id));
      const completed = items.filter(i => i.status === "completed").length;
      planProgress = { total: items.length, completed, percent: items.length > 0 ? Math.round((completed / items.length) * 100) : 0 };
    }

    // Revalidation schedule
    const revalidation = await db
      .select()
      .from(revalidationSchedules)
      .where(and(eq(revalidationSchedules.userId, userId), eq(revalidationSchedules.status, "pending")))
      .orderBy(revalidationSchedules.dueAt)
      .limit(1);

    // Recent assessment
    const recentAssessment = await db
      .select()
      .from(assessmentSessions)
      .where(and(eq(assessmentSessions.userId, userId), eq(assessmentSessions.state, "completed")))
      .orderBy(desc(assessmentSessions.completedAt))
      .limit(1);

    let latestScore = null;
    if (recentAssessment[0]) {
      const score = await db
        .select()
        .from(assessmentScores)
        .where(eq(assessmentScores.sessionId, recentAssessment[0].id))
        .limit(1);
      latestScore = score[0] ?? null;
    }

    return {
      state: state[0] ?? null,
      credibility: credibility[0] ?? null,
      risk: risk[0] ?? null,
      planProgress,
      revalidation: revalidation[0] ?? null,
      latestScore,
    };
  }),

  // Manager team view
  manager: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader", "manager"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const allUsers = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, status: users.status })
      .from(users)
      .where(eq(users.tenantId, ctx.user.tenantId));

    const teamData = await Promise.all(
      allUsers.map(async u => {
        const state = await db
          .select()
          .from(userStates)
          .where(and(eq(userStates.userId, u.id), isNull(userStates.effectiveTo)))
          .limit(1);

        const credibility = await db
          .select()
          .from(credibilityScores)
          .where(eq(credibilityScores.userId, u.id))
          .orderBy(desc(credibilityScores.generatedAt))
          .limit(1);

        const risk = await db
          .select()
          .from(riskScores)
          .where(eq(riskScores.userId, u.id))
          .orderBy(desc(riskScores.generatedAt))
          .limit(1);

        return {
          ...u,
          state: state[0] ?? null,
          credibility: credibility[0] ?? null,
          risk: risk[0] ?? null,
        };
      })
    );

    // Readiness distribution
    const distribution = {
      total: teamData.length,
      proficient: teamData.filter(u => u.state?.primaryState === "proficient").length,
      developing: teamData.filter(u => u.state?.primaryState === "developing").length,
      needsSupport: teamData.filter(u => u.state?.primaryState === "needs_support").length,
      noData: teamData.filter(u => !u.state).length,
      highRisk: teamData.filter(u => u.risk?.band === "high").length,
      lowCredibility: teamData.filter(u => u.credibility?.band === "low").length,
    };

    return { team: teamData, distribution };
  }),

  // HR / Org dashboard
  hr: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const allUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, ctx.user.tenantId));

    const states = await Promise.all(
      allUsers.map(async u => {
        const state = await db
          .select()
          .from(userStates)
          .where(and(eq(userStates.userId, u.id), isNull(userStates.effectiveTo)))
          .limit(1);
        return state[0] ?? null;
      })
    );

    const validStates = states.filter(Boolean) as NonNullable<typeof states[0]>[];

    const capabilityDistribution = {
      proficient: validStates.filter(s => s.primaryState === "proficient").length,
      developing: validStates.filter(s => s.primaryState === "developing").length,
      needsSupport: validStates.filter(s => s.primaryState === "needs_support").length,
      activeLearner: validStates.filter(s => s.primaryState === "active_learner").length,
      noData: allUsers.length - validStates.length,
    };

    const complianceDistribution = {
      compliant: validStates.filter(s => s.complianceState === "compliant").length,
      atRisk: validStates.filter(s => s.complianceState === "at_risk").length,
      breach: validStates.filter(s => s.complianceState === "breach").length,
    };

    const credibilityDistribution = {
      high: validStates.filter(s => s.credibilityState === "high").length,
      medium: validStates.filter(s => s.credibilityState === "medium").length,
      low: validStates.filter(s => s.credibilityState === "low").length,
    };

    const riskDistribution = {
      low: validStates.filter(s => s.riskState === "low").length,
      medium: validStates.filter(s => s.riskState === "medium").length,
      high: validStates.filter(s => s.riskState === "high").length,
    };

    // Recent policy incidents
    const incidents = await db
      .select()
      .from(policyEvaluations)
      .orderBy(desc(policyEvaluations.createdAt))
      .limit(10);

    const triggeredIncidents = incidents.filter(e => e.result !== "no_action");

    // Recent audit activity
    const recentAudit = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, ctx.user.tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);

    return {
      totalUsers: allUsers.length,
      capabilityDistribution,
      complianceDistribution,
      credibilityDistribution,
      riskDistribution,
      recentIncidents: triggeredIncidents,
      recentAudit,
    };
  }),

  // Admin / Super admin view
  admin: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const allUsers = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, ctx.user.tenantId));
    const allTenants = await db.select({ tenantId: users.tenantId }).from(users);
    const uniqueTenants = new Set(allTenants.map(t => t.tenantId)).size;

    const incidents = await db.select().from(policyEvaluations).orderBy(desc(policyEvaluations.createdAt)).limit(5);
    const recentActivity = await db.select().from(auditLogs).where(eq(auditLogs.tenantId, ctx.user.tenantId)).orderBy(desc(auditLogs.createdAt)).limit(20);

    return {
      totalUsers: allUsers.length,
      totalTenants: uniqueTenants,
      activeSessions: 0,
      policyIncidents: incidents.filter(e => e.result !== "no_action").length,
      recentActivity,
    };
  }),

  // Auditor view - read-only audit surface
  auditor: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "auditor"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const recentLogs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, ctx.user.tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);

    const incidents = await db
      .select()
      .from(policyEvaluations)
      .orderBy(desc(policyEvaluations.createdAt))
      .limit(50);

    return {
      recentLogs,
      policyIncidents: incidents.filter(e => e.result !== "no_action"),
    };
  }),
});
