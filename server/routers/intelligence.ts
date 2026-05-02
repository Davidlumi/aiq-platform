/**
 * Intelligence Router
 * tRPC procedures for the Adaptive Intelligence Layer (AIL).
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

import {
  preSimulationOrchestration,
  postSimulationOrchestration,
  getUserIntelligenceProfile,
  processAssessmentThroughAIL,
} from "../ail/userIntelligenceProfile";

import {
  upsertOrgContext,
  getOrgContext,
} from "../ail/organisationContextLayer";

import {
  getNarrativeContext,
} from "../ail/narrativeEngine";
import { getDb, getUserRoleKeys } from "../db";
import { auditLogs, ailOrgContext, assessmentScores, assessmentSessions, users } from "../../drizzle/schema";
import { nanoid } from "nanoid";
import { eq, desc, and } from "drizzle-orm";

import {
  generateCapabilityReport,
} from "../ail/capabilityReport";

import {
  getPersonaProfile,
} from "../ail/personaClassificationEngine";

import {
  getDifficultyProfile,
} from "../ail/adaptiveDifficultyEngineV2";

export const intelligenceRouter = router({

  // ── Profile ─────────────────────────────────────────────────────────────────

  /**
   * Get the full User Intelligence Profile for the current user.
   */
  profile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserIntelligenceProfile(ctx.user.id, ctx.user.tenantId);
    return profile;
  }),

  /**
   * Get the persona profile for the current user.
   */
  persona: protectedProcedure.query(async ({ ctx }) => {
    return getPersonaProfile(ctx.user.id);
  }),

  /**
   * Get the difficulty profile for the current user.
   */
  difficultyProfile: protectedProcedure.query(async ({ ctx }) => {
    return getDifficultyProfile(ctx.user.id, ctx.user.tenantId);
  }),

  // ── Narrative ───────────────────────────────────────────────────────────────

  /**
   * Get the narrative context for the current user.
   */
  narrativeContext: protectedProcedure.query(async ({ ctx }) => {
    return getNarrativeContext(ctx.user.id);
  }),

  // ── Capability Report ───────────────────────────────────────────────────────

  /**
   * Generate a full capability report for the current user.
   * Uses LLM for narrative synthesis — may take 3-8 seconds.
   */
  capabilityReport: protectedProcedure.query(async ({ ctx }) => {
    const report = await generateCapabilityReport(ctx.user.id, ctx.user.tenantId);
    if (!report) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No intelligence profile found. Complete at least one simulation or assessment to generate a report.",
      });
    }
    return report;
  }),

  // ── Organisation Context ────────────────────────────────────────────────────

  /**
   * Get the organisation context for the current tenant.
   */
  orgContext: protectedProcedure.query(async ({ ctx }) => {
    return getOrgContext(ctx.user.tenantId);
  }),

  /**
   * Upsert the organisation context for the current tenant.
   * Admin-only in production; open for demo purposes.
   */
  upsertOrgContext: protectedProcedure
    .input(z.object({
      sector: z.enum([
        "financial_services", "healthcare", "technology", "retail",
        "public_sector", "professional_services", "manufacturing", "other",
      ]).optional(),
      primaryRegulator: z.string().optional(),
      additionalRegulators: z.array(z.string()).optional(),
      headcount: z.number().int().positive().optional(),
      structure: z.enum(["centralised", "decentralised", "matrix", "holding_company"]).optional(),
      geographies: z.array(z.string()).optional(),
      strategicPriorities: z.array(z.string()).optional(),
      currentChallenges: z.array(z.string()).optional(),
      recentEvents: z.array(z.string()).optional(),
      riskAppetiteOverall: z.enum(["risk_averse", "moderate", "risk_tolerant"]).optional(),
      riskAppetiteLegal: z.enum(["risk_averse", "moderate", "risk_tolerant"]).optional(),
      aiMaturityLevel: z.enum(["early_adopter", "scaling", "mature", "cautious"]).optional(),
      currentAiTools: z.array(z.string()).optional(),
      aiGovernanceFramework: z.boolean().optional(),
      aiEthicsCommittee: z.boolean().optional(),
      hierarchyLevel: z.enum(["flat", "moderate", "hierarchical"]).optional(),
      decisionMakingStyle: z.enum(["consensus", "top_down", "data_driven"]).optional(),
      hrInfluence: z.enum(["strategic_partner", "operational", "administrative"]).optional(),
      ceoStyle: z.enum(["collaborative", "directive", "data_driven", "charismatic"]).optional(),
      cfoStyle: z.enum(["risk_averse", "growth_focused", "cost_focused"]).optional(),
      hasAiUsagePolicy: z.boolean().optional(),
      hasDataProtectionPolicy: z.boolean().optional(),
      hasRedundancyPolicy: z.boolean().optional(),
      hasWhistleblowingPolicy: z.boolean().optional(),
      hasEdiPolicy: z.boolean().optional(),
      // Phase 2 additions
      aiToolsInUse: z.array(z.string()).optional(),
      ukRegulatoryFrameworks: z.array(z.string()).optional(),
      aiPolicyStatus: z.enum(["none", "draft", "approved", "embedded"]).optional(),
      quarterlyReviewEnabled: z.boolean().optional(),
      revalidationCycleMonths: z.number().int().min(1).max(60).optional(),
      smallHRFunctionMode: z.boolean().optional(),
      companyAiContextNarrative: z.string().max(2000).optional(),
      // Phase 3: Business Ambition Linkage
      ambitionTargetScore: z.number().int().min(0).max(100).nullable().optional(),
      ambitionTargetDate: z.string().max(10).nullable().optional(),
      ambitionTargetLabel: z.string().max(200).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertOrgContext({ tenantId: ctx.user.tenantId, ...input });
      const db = await getDb();
      if (db) {
        await db.insert(auditLogs).values({
          id: nanoid(),
          tenantId: ctx.user.tenantId,
          actorUserId: ctx.user.id,
          action: "config.org_context.updated",
          targetType: "ail_org_context",
          targetId: ctx.user.tenantId,
          metadataJson: JSON.stringify({
            fields: Object.keys(input),
            timestamp: new Date().toISOString(),
          }),
        });
      }
      return { success: true };
    }),

  // ── Simulation Orchestration ────────────────────────────────────────────────

  /**
   * Get pre-simulation context — call this before starting a simulation
   * to get difficulty config, persona parameters, org context, and narrative state.
   */
  preSimulationContext: protectedProcedure.query(async ({ ctx }) => {
    return preSimulationOrchestration(ctx.user.id, ctx.user.tenantId);
  }),

  /**
   * Process post-simulation outcomes — call this after a simulation completes
   * to update all AIL subsystems.
   */
  processSimulationCompletion: protectedProcedure
    .input(z.object({
      simulationId: z.string(),
      signalDeltas: z.record(z.string(), z.number()),
      failureModesTriggered: z.array(z.string()),
      performance: z.object({
        signalDetectionRate: z.number().min(0).max(1),
        ambiguityHandlingScore: z.number().min(0).max(1),
        pressureResistanceScore: z.number().min(0).max(1),
        dataInterpretationScore: z.number().min(0).max(1),
        timeDecisionQuality: z.number().min(0).max(1),
        consequenceAwarenessScore: z.number().min(0).max(1),
        overallScore: z.number().min(0).max(1),
        failureModesTriggered: z.array(z.string()),
      }),
      narrativeStateUpdate: z.object({
        legalRiskDelta: z.number().int().min(-3).max(3).optional(),
        employeeRelationsDelta: z.number().int().min(-20).max(20).optional(),
        regulatoryStandingDelta: z.number().int().min(-20).max(20).optional(),
        csuiteConfidenceDelta: z.number().int().min(-20).max(20).optional(),
        boardConfidenceDelta: z.number().int().min(-20).max(20).optional(),
      }).optional(),
      stakeholderUpdates: z.array(z.object({
        stakeholderId: z.string(),
        stakeholderName: z.string(),
        stakeholderRole: z.string(),
        relationshipDelta: z.number().int().min(-5).max(5),
        historyEntry: z.string().optional(),
      })).optional(),
      narrativeEvents: z.array(z.object({
        eventType: z.enum(["decision", "consequence", "external_event"]),
        description: z.string(),
        stakeholdersInvolved: z.array(z.string()).optional(),
        consequenceForFuture: z.string().optional(),
      })).optional(),
      narrativeThreads: z.array(z.object({
        threadName: z.string(),
        threadType: z.enum(["consequence", "escalation", "relationship"]),
        nextExpectedEvent: z.string().optional(),
        status: z.enum(["active", "resolved", "escalated"]).optional(),
      })).optional(),
      userStoodFirm: z.boolean().optional(),
      userCommunicatedWell: z.boolean().optional(),
      pathTaken: z.string().optional(),
      finalScore: z.number().min(0).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      await postSimulationOrchestration({
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
        ...input,
      });
      return { success: true };
    }),

  /**
   * Dedicated procedure to save the ambition target independently.
   * Allows HR leaders to set/update the target without touching other org context fields.
   */
  setAmbitionTarget: protectedProcedure
    .input(z.object({
      ambitionTargetScore: z.number().int().min(0).max(100).nullable(),
      ambitionTargetDate: z.string().max(10).nullable().optional(),
      ambitionTargetLabel: z.string().max(200).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Check if org context row exists
      const existing = await db.select({ id: ailOrgContext.id })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (existing.length > 0) {
        await db.update(ailOrgContext)
          .set({
            ambitionTargetScore: input.ambitionTargetScore,
            ambitionTargetDate: input.ambitionTargetDate ?? null,
            ambitionTargetLabel: input.ambitionTargetLabel ?? null,
            updatedAt: new Date(),
          })
          .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      } else {
        await db.insert(ailOrgContext).values({
          id: nanoid(),
          tenantId: ctx.user.tenantId,
          ambitionTargetScore: input.ambitionTargetScore,
          ambitionTargetDate: input.ambitionTargetDate ?? null,
          ambitionTargetLabel: input.ambitionTargetLabel ?? null,
        });
      }
      return { success: true };
    }),

  /**
   * Get the full AI People Strategy (ambition levels + domain targets + narrative).
   */
  getStrategy: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({
      businessAmbitionLevel: ailOrgContext.businessAmbitionLevel,
      peopleAmbitionLevel: ailOrgContext.peopleAmbitionLevel,
      domainTargetsJson: ailOrgContext.domainTargetsJson,
      strategyNarrative: ailOrgContext.strategyNarrative,
      strategySavedAt: ailOrgContext.strategySavedAt,
      ambitionTargetScore: ailOrgContext.ambitionTargetScore,
      ambitionTargetDate: ailOrgContext.ambitionTargetDate,
      ambitionTargetLabel: ailOrgContext.ambitionTargetLabel,
    }).from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    const row = rows[0] ?? null;
    if (!row) return {
      configured: false, businessAmbitionLevel: null, peopleAmbitionLevel: null,
      domainTargets: null, strategyNarrative: null, strategySavedAt: null,
      ambitionTargetScore: null, ambitionTargetDate: null, ambitionTargetLabel: null,
    };
    let domainTargets: Record<string, number> | null = null;
    if (row.domainTargetsJson) {
      try { domainTargets = typeof row.domainTargetsJson === "string" ? JSON.parse(row.domainTargetsJson) : row.domainTargetsJson as Record<string, number>; } catch {}
    }
    // Compute current function-level domain scores from real assessment data
    const DOMAIN_KEYS_STRAT = ["ai_interaction","ai_output_evaluation","ai_workflow_design","workforce_ai_readiness","ai_ethics_trust","ai_change_leadership"] as const;
    const domainTotals: Record<string, { total: number; count: number }> = {};
    for (const k of DOMAIN_KEYS_STRAT) domainTotals[k] = { total: 0, count: 0 };
    const tenantUsers = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, ctx.user.tenantId));
    for (const u of tenantUsers) {
      const latestSession = await db.select({ id: assessmentSessions.id }).from(assessmentSessions)
        .where(and(eq(assessmentSessions.userId, u.id), eq(assessmentSessions.state, "completed")))
        .orderBy(desc(assessmentSessions.completedAt)).limit(1);
      if (!latestSession[0]) continue;
      const score = await db.select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson }).from(assessmentScores)
        .where(eq(assessmentScores.sessionId, latestSession[0].id)).limit(1);
      if (!score[0]?.scoreBreakdownJson) continue;
      const bd = score[0].scoreBreakdownJson as Record<string, unknown>;
      const cap = bd.capabilityScores as Record<string, unknown> | undefined;
      if (!cap) continue;
      for (const k of DOMAIN_KEYS_STRAT) {
        const v = cap[k];
        const num = typeof v === "number" ? v : (v && typeof v === "object" && "score" in (v as any)) ? Number((v as any).score) : null;
        if (num !== null && !isNaN(num)) { domainTotals[k].total += num; domainTotals[k].count++; }
      }
    }
    const currentDomainScores: Record<string, number | null> = {};
    for (const k of DOMAIN_KEYS_STRAT) {
      currentDomainScores[k] = domainTotals[k].count > 0 ? Math.round(domainTotals[k].total / domainTotals[k].count) : null;
    }
    return {
      configured: !!(row.businessAmbitionLevel && row.peopleAmbitionLevel),
      businessAmbitionLevel: row.businessAmbitionLevel,
      peopleAmbitionLevel: row.peopleAmbitionLevel,
      domainTargets,
      strategyNarrative: row.strategyNarrative,
      strategySavedAt: row.strategySavedAt,
      ambitionTargetScore: row.ambitionTargetScore,
      ambitionTargetDate: row.ambitionTargetDate,
      ambitionTargetLabel: row.ambitionTargetLabel,
      currentDomainScores,
    };
  }),

  /**
   * Save the full AI People Strategy.
   */
  saveStrategy: protectedProcedure
    .input(z.object({
      businessAmbitionLevel: z.number().int().min(1).max(5),
      peopleAmbitionLevel: z.number().int().min(1).max(5),
      domainTargets: z.record(z.string(), z.number().min(0).max(100)),
      strategyNarrative: z.string().max(2000).optional(),
      ambitionTargetScore: z.number().int().min(0).max(100),
      ambitionTargetDate: z.string().max(10).nullable().optional(),
      ambitionTargetLabel: z.string().max(200).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const domainTargetsJson = JSON.stringify(input.domainTargets);
      const existing = await db.select({ id: ailOrgContext.id })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (existing.length > 0) {
        await db.update(ailOrgContext).set({
          businessAmbitionLevel: input.businessAmbitionLevel,
          peopleAmbitionLevel: input.peopleAmbitionLevel,
          domainTargetsJson,
          strategyNarrative: input.strategyNarrative ?? null,
          strategySavedAt: new Date(),
          ambitionTargetScore: input.ambitionTargetScore,
          ambitionTargetDate: input.ambitionTargetDate ?? null,
          ambitionTargetLabel: input.ambitionTargetLabel ?? null,
          updatedAt: new Date(),
        }).where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      } else {
        await db.insert(ailOrgContext).values({
          id: nanoid(),
          tenantId: ctx.user.tenantId,
          businessAmbitionLevel: input.businessAmbitionLevel,
          peopleAmbitionLevel: input.peopleAmbitionLevel,
          domainTargetsJson,
          strategyNarrative: input.strategyNarrative ?? null,
          strategySavedAt: new Date(),
          ambitionTargetScore: input.ambitionTargetScore,
          ambitionTargetDate: input.ambitionTargetDate ?? null,
          ambitionTargetLabel: input.ambitionTargetLabel ?? null,
        });
      }
      return { success: true };
    }),

  /**
   * Process assessment completion through the AIL.
   */
  processAssessmentCompletion: protectedProcedure
    .input(z.object({
      assessmentId: z.string(),
      signalDeltas: z.record(z.string(), z.number()),
      failureModesTriggered: z.array(z.string()),
      finalScore: z.number().min(0).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      await processAssessmentThroughAIL({
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
        ...input,
      });
      return { success: true };
    }),
});
