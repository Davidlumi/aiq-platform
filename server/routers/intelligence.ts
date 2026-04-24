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
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertOrgContext({ tenantId: ctx.user.tenantId, ...input });
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
