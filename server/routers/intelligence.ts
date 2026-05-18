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
import { auditLogs, ailOrgContext, assessmentScores, assessmentSessions, users, strategyInitiatives, strategyInitiativeLibrary, riskAcknowledgements } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { nanoid } from "nanoid";
import { eq, desc, and } from "drizzle-orm";
import {
  generateVisionWithQualityGate,
  evaluateRiskRules,
  selectInitiatives,
  calculateCostEnvelope,
  buildProvenanceMap,
  calculateValueEnvelope,
  type ValueEnvelope,
  type RiskEvalInput,
  type SelectInitiativesInput,
} from "../strategyEngine";
import { getLibraryMeta, getContentLibrary, getAllInitiatives, resolveInitiativeIds } from "../contentLibrary";

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
        "energy_utilities", "media_entertainment",
        "logistics_transport", "education", "hospitality_leisure",
      ]).optional(),
      subSector: z.string().max(100).nullable().optional(),
      orgType: z.string().max(100).nullable().optional(),
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
      selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
      wontDoJson: ailOrgContext.wontDoJson,
      provenanceJson: ailOrgContext.provenanceJson,
      libraryVersion: ailOrgContext.libraryVersion,
      snapshotDomainScoresJson: ailOrgContext.snapshotDomainScoresJson,
      preworkCompletedAt: ailOrgContext.preworkCompletedAt,
    }).from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    const row = rows[0] ?? null;
    if (!row) return {
      configured: false, businessAmbitionLevel: null, peopleAmbitionLevel: null,
      domainTargets: null, strategyNarrative: null, strategySavedAt: null,
      ambitionTargetScore: null, ambitionTargetDate: null, ambitionTargetLabel: null,
      selectedInitiativeIds: [] as string[],
      wontDo: [] as string[], provenanceJson: null as string | null, libraryVersion: null as string | null,
      snapshotDomainScores: null as Record<string, number | null> | null,
      currentDomainScores: {} as Record<string, number | null>,
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
    let snapshotDomainScores: Record<string, number | null> | null = null;
    if (row.snapshotDomainScoresJson) {
      try { snapshotDomainScores = typeof row.snapshotDomainScoresJson === "string" ? JSON.parse(row.snapshotDomainScoresJson) : row.snapshotDomainScoresJson as Record<string, number | null>; } catch {}
    }
    return {
      configured: !!(row.preworkCompletedAt || (row.businessAmbitionLevel && row.peopleAmbitionLevel)),
      businessAmbitionLevel: row.businessAmbitionLevel,
      peopleAmbitionLevel: row.peopleAmbitionLevel,
      domainTargets,
      strategyNarrative: row.strategyNarrative,
      strategySavedAt: row.strategySavedAt,
      ambitionTargetScore: row.ambitionTargetScore,
      ambitionTargetDate: row.ambitionTargetDate,
      ambitionTargetLabel: row.ambitionTargetLabel,
      currentDomainScores,
      snapshotDomainScores,
      selectedInitiativeIds: (() => { try { return JSON.parse(row.selectedInitiativesJson ?? "[]") as string[]; } catch { return [] as string[]; } })(),
      wontDo: (() => { try { return row.wontDoJson ? JSON.parse(row.wontDoJson) as string[] : [] as string[]; } catch { return [] as string[]; } })(),
      provenanceJson: row.provenanceJson ?? null,
      libraryVersion: row.libraryVersion ?? null,
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
      selectedInitiativeIds: z.array(z.string()).optional(),
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
      const selectedInitiativesJson = JSON.stringify(input.selectedInitiativeIds ?? []);
      // Capture current domain scores as snapshot at strategy save time (for drift detection)
      const DOMAIN_KEYS_SNAP = ["ai_interaction","ai_output_evaluation","ai_workflow_design","workforce_ai_readiness","ai_ethics_trust","ai_change_leadership"] as const;
      const snapTotals: Record<string, { total: number; count: number }> = {};
      for (const k of DOMAIN_KEYS_SNAP) snapTotals[k] = { total: 0, count: 0 };
      const tenantUsersSnap = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, ctx.user.tenantId));
      for (const u of tenantUsersSnap) {
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
        for (const k of DOMAIN_KEYS_SNAP) {
          const v = cap[k];
          const num = typeof v === "number" ? v : (v && typeof v === "object" && "score" in (v as any)) ? Number((v as any).score) : null;
          if (num !== null && !isNaN(num)) { snapTotals[k].total += num; snapTotals[k].count++; }
        }
      }
      const snapshotScores: Record<string, number | null> = {};
      for (const k of DOMAIN_KEYS_SNAP) {
        snapshotScores[k] = snapTotals[k].count > 0 ? Math.round(snapTotals[k].total / snapTotals[k].count) : null;
      }
      const snapshotDomainScoresJson = JSON.stringify(snapshotScores);
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
          selectedInitiativesJson,
          snapshotDomainScoresJson,
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
          selectedInitiativesJson,
          snapshotDomainScoresJson,
        });
      }
      return { success: true };
    }),

  /**
   * Get the strategy assessment (vision, principles, answers).
   */
  getStrategyAssessment: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({
      aspirationAnswersJson: ailOrgContext.aspirationAnswersJson,
      hrRoleAnswersJson: ailOrgContext.hrRoleAnswersJson,
      visionStatement: ailOrgContext.visionStatement,
      userVisionInput: ailOrgContext.userVisionInput,
      guidingPrinciplesJson: ailOrgContext.guidingPrinciplesJson,
      strategyAssessmentCompletedAt: ailOrgContext.strategyAssessmentCompletedAt,
      businessAmbitionLevel: ailOrgContext.businessAmbitionLevel,
      peopleAmbitionLevel: ailOrgContext.peopleAmbitionLevel,
      selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
      wontDoJson: ailOrgContext.wontDoJson,
      commitmentsJson: ailOrgContext.commitmentsJson,
      structuredInputsJson: ailOrgContext.structuredInputsJson,
      operationalBaselineJson: ailOrgContext.operationalBaselineJson,
      visionInputsJson: ailOrgContext.visionInputsJson,
      visionInputsUpdatedAt: ailOrgContext.visionInputsUpdatedAt,
      sector: ailOrgContext.sector,
      headcount: ailOrgContext.headcount,
      businessCaseNarrative: ailOrgContext.businessCaseNarrative,
      strategyStatement: ailOrgContext.strategyStatement,
      strategyArchetype: ailOrgContext.strategyArchetype,
    }).from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    const row = rows[0] ?? null;
    if (!row) return { completed: false, aspirationAnswers: null, hrRoleAnswers: null, visionStatement: null, userVisionInput: null, guidingPrinciples: null, completedAt: null, businessAmbitionLevel: null, peopleAmbitionLevel: null, selectedInitiativeIds: [] as string[], commitments: null as string[] | null, visionInputs: null, visionInputsUpdatedAt: null, sector: null, headcount: null, businessCaseNarrative: null, strategyStatement: null, strategyArchetype: null };
    const parse = (j: string | null) => { try { return j ? JSON.parse(j) : null; } catch { return null; } };
    return {
      completed: !!row.strategyAssessmentCompletedAt,
      aspirationAnswers: parse(row.aspirationAnswersJson),
      hrRoleAnswers: parse(row.hrRoleAnswersJson),
      visionStatement: row.visionStatement ?? null,
      userVisionInput: row.userVisionInput ?? null,
      guidingPrinciples: parse(row.guidingPrinciplesJson) as Array<{ title: string; description: string }> | null,
      completedAt: row.strategyAssessmentCompletedAt ?? null,
      businessAmbitionLevel: row.businessAmbitionLevel ?? null,
      peopleAmbitionLevel: row.peopleAmbitionLevel ?? null,
      selectedInitiativeIds: (parse(row.selectedInitiativesJson) as string[] ?? []),
      wontDo: parse(row.wontDoJson ?? null) as string[] | null,
      commitments: parse(row.commitmentsJson ?? null) as string[] | null,
      structuredInputs: parse(row.structuredInputsJson ?? null),
      operationalBaseline: parse(row.operationalBaselineJson ?? null),
      visionInputs: parse(row.visionInputsJson ?? null),
      visionInputsUpdatedAt: row.visionInputsUpdatedAt ?? null,
      sector: row.sector ?? null,
      headcount: row.headcount ?? null,
      businessCaseNarrative: row.businessCaseNarrative ?? null,
      strategyStatement: row.strategyStatement ?? null,
      strategyArchetype: row.strategyArchetype ?? null,
    };
  }),

  /**
   * Save the business case narrative (auto-save from Stage 7).
   */
  saveBusinessCaseNarrative: protectedProcedure
    .input(z.object({ narrative: z.string().max(10000) }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(ailOrgContext)
        .set({ businessCaseNarrative: input.narrative, updatedAt: new Date() })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { ok: true };
    }),

  /**
   * Generate AI-drafted vision statement and guiding principles from assessment answers.
   */
  generateVisionAndPrinciples: protectedProcedure
    .input(z.object({
      sector: z.string(),
      businessAmbitionLabel: z.string(),
      peopleAmbitionLabel: z.string(),
      aspirationAnswers: z.record(z.string(), z.string()),
      hrRoleAnswers: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const prompt = `You are an expert HR strategy consultant writing for a CHRO audience. Based on the following inputs, generate:
1. A board-ready AI vision statement (2-3 sentences) that is SPECIFIC to this sector and ambition level. It must name the specific outcomes AI will deliver for this organisation — not generic phrases like "reduce administrative burden" or "speed up decision-making". Make a real claim about what will be different.
2. Exactly 5 guiding principles. Each principle must:
   - Have a short title (3-5 words) that is specific and falsifiable — NOT generic values-poster language like "People-Centric AI Innovation"
   - Force a real trade-off or be specific enough to be falsifiable (e.g. "We will prefer accuracy over speed when triaging ER cases" or "Every model in employment decisions passes an annual external bias audit")
   - Have a 1-2 sentence description that explains the trade-off or commitment in concrete terms

INPUTS:
Sector: ${input.sector}
Business AI Ambition: ${input.businessAmbitionLabel}
People AI Ambition: ${input.peopleAmbitionLabel}

Business AI Aspiration Answers:
${Object.entries(input.aspirationAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}

HR Role Answers:
${Object.entries(input.hrRoleAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}

Return JSON with this exact structure:
{
  "visionStatement": "string",
  "principles": [
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" }
  ]
}`;
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert HR strategy consultant. Always respond with valid JSON only, no markdown fences." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "vision_and_principles",
            strict: true,
            schema: {
              type: "object",
              properties: {
                visionStatement: { type: "string" },
                principles: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["title", "description"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["visionStatement", "principles"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices[0].message.content;
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content)) as { visionStatement: string; principles: Array<{ title: string; description: string }> };
      return parsed;
    }),

  /**
   * Save the strategy assessment answers, vision statement, and guiding principles.
   * Also persists wontDoJson, provenanceJson, and libraryVersion.
   */
  saveStrategyAssessment: protectedProcedure
    .input(z.object({
      aspirationAnswers: z.record(z.string(), z.string()),
      hrRoleAnswers: z.record(z.string(), z.string()),
      visionStatement: z.string(),
      guidingPrinciples: z.array(z.object({ title: z.string(), description: z.string() })),
      wontDo: z.array(z.string()).optional(),
      commitments: z.array(z.string()).optional(),
      businessAmbitionLevel: z.number().int().min(1).max(5),
      peopleAmbitionLevel: z.number().int().min(1).max(5),
      selectedInitiativeIds: z.array(z.string()).optional(),
      provenanceJson: z.string().optional(),
      structuredInputsJson: z.string().optional(),
      operationalBaselineJson: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const libMeta = getLibraryMeta();
      const existing = await db.select({ id: ailOrgContext.id })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      const payload = {
        aspirationAnswersJson: JSON.stringify(input.aspirationAnswers),
        hrRoleAnswersJson: JSON.stringify(input.hrRoleAnswers),
        visionStatement: input.visionStatement,
        guidingPrinciplesJson: JSON.stringify(input.guidingPrinciples),
        wontDoJson: input.wontDo ? JSON.stringify(input.wontDo) : null,
        commitmentsJson: input.commitments !== undefined ? JSON.stringify(input.commitments) : undefined,
        provenanceJson: input.provenanceJson ?? null,
        structuredInputsJson: input.structuredInputsJson ?? null,
        operationalBaselineJson: input.operationalBaselineJson ?? null,
        libraryVersion: libMeta?.version ?? null,
        businessAmbitionLevel: input.businessAmbitionLevel,
        peopleAmbitionLevel: input.peopleAmbitionLevel,
        selectedInitiativesJson: JSON.stringify(input.selectedInitiativeIds ?? []),
        strategyAssessmentCompletedAt: new Date(),
        strategySavedAt: new Date(),
        updatedAt: new Date(),
      };
      if (existing.length > 0) {
        await db.update(ailOrgContext).set(payload).where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      } else {
        await db.insert(ailOrgContext).values({ id: nanoid(), tenantId: ctx.user.tenantId, ...payload });
      }
      return { success: true };
    }),

  /**
   * Patch a single editable field on the strategy assessment.
   * Used for auto-save on blur from section pages.
   * Supported fields: visionStatement, wontDo, commitments, guidingPrinciples.
   */
  patchStrategyField: protectedProcedure
    .input(z.discriminatedUnion("field", [
      z.object({ field: z.literal("visionStatement"), value: z.string() }),
      z.object({ field: z.literal("userVisionInput"), value: z.string() }),
      z.object({ field: z.literal("wontDo"), value: z.array(z.string()) }),
      z.object({ field: z.literal("commitments"), value: z.array(z.string()) }),
      z.object({ field: z.literal("guidingPrinciples"), value: z.array(z.object({ title: z.string(), description: z.string() })) }),
    ]))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select({ id: ailOrgContext.id })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "No strategy found for this tenant" });
      let patch: Partial<typeof ailOrgContext.$inferInsert> = { updatedAt: new Date() };
      if (input.field === "visionStatement") patch.visionStatement = input.value;
      else if (input.field === "userVisionInput") patch.userVisionInput = input.value;
      else if (input.field === "wontDo") patch.wontDoJson = JSON.stringify(input.value);
      else if (input.field === "commitments") patch.commitmentsJson = JSON.stringify(input.value);
      else if (input.field === "guidingPrinciples") patch.guidingPrinciplesJson = JSON.stringify(input.value);
      await db.update(ailOrgContext).set(patch).where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { success: true };
    }),

  /**
   * P1.1 — Generate vision with quality gate (retry + forbidden phrase check + wontDo).
   * Replaces the bare generateVisionAndPrinciples call.
   */
  generateVisionWithQualityGate: protectedProcedure
    .input(z.object({
      sector: z.string(),
      subSector: z.string().nullable().optional(),
      orgType: z.string().nullable().optional(),
      orgSize: z.string().nullable().optional(),
      businessAmbitionLabel: z.string(),
      peopleAmbitionLabel: z.string(),
      aiPhilosophy: z.string().optional(),
      aspirationAnswers: z.record(z.string(), z.string()),
      hrRoleAnswers: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Enrich with org context if not provided
      const orgCtx = await getOrgContext(ctx.user.tenantId);
      return generateVisionWithQualityGate({
        ...input,
        subSector: input.subSector ?? orgCtx?.subSector ?? null,
        orgType: input.orgType ?? orgCtx?.orgType ?? null,
        orgSize: input.orgSize ?? null,
      });
    }),

  /**
   * Vision Modal - Save the 8 structured vision inputs from the modal.
   */
  saveVisionInputs: protectedProcedure
    .input(z.object({
      // Section 1 — Your ambition
      outcomeChased: z.enum(["cost", "growth", "talent_supply", "customer_experience", "employee_experience"]).nullable(),
      // Accept 1–5 to be tolerant of assessment-scale values; clamp to 1–4 before persisting
      businessAmbitionTier: z.number().int().min(1).max(5),
      hrDeliveryTier: z.number().int().min(1).max(5),
      augmentationPhilosophy: z.enum(["amplify", "automate", "substitute"]).nullable(),
      // Section 2 — Where AI plays
      painAreas: z.array(z.string()),
      painAreasOther: z.array(z.string()),
      reinvestmentTargets: z.array(z.string()),
      reinvestmentTargetsOther: z.array(z.string()),
      // Section 3 — Time and boundaries
      timeHorizonYears: z.number().int().refine(v => [1, 3, 5].includes(v), { message: "Must be 1, 3, or 5" }),
      governanceLocks: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select({ id: ailOrgContext.id })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "No strategy found for this tenant" });
      // Clamp tiers to 1–4 before persisting (frontend also clamps, this is belt-and-suspenders)
      const clamped = {
        ...input,
        businessAmbitionTier: Math.min(Math.max(input.businessAmbitionTier, 1), 4),
        hrDeliveryTier: Math.min(Math.max(input.hrDeliveryTier, 1), 4),
      };
      await db.update(ailOrgContext)
        .set({
          visionInputsJson: JSON.stringify(clamped),
          visionInputsUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { success: true };
    }),

  /**
   * Vision Modal - Generate an AI vision draft from the brief-spec structured inputs.
   * Prompt follows vision_modal_build_brief.md § 6 requirements.
   */
  generateVisionDraft: protectedProcedure
    .input(z.object({
      outcomeChased: z.enum(["cost", "growth", "talent_supply", "customer_experience", "employee_experience"]).nullable(),
      // Accept 1–5 to be tolerant of assessment-scale values; clamp to 1–4 before use
      businessAmbitionTier: z.number().int().min(1).max(5),
      hrDeliveryTier: z.number().int().min(1).max(5),
      augmentationPhilosophy: z.enum(["amplify", "automate", "substitute"]).nullable(),
      painAreas: z.array(z.string()),
      painAreasOther: z.array(z.string()),
      reinvestmentTargets: z.array(z.string()),
      reinvestmentTargetsOther: z.array(z.string()),
      timeHorizonYears: z.number().int().refine(v => [1, 3, 5].includes(v), { message: "Must be 1, 3, or 5" }),
      governanceLocks: z.array(z.string()),
      // Context
      orgDescriptor: z.string().nullable().optional(),
      capabilityScore: z.number().nullable().optional(),
      capabilityLabel: z.string().nullable().optional(),
       capabilityCount: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Map enums to human-readable labels
      const OUTCOME_LABELS: Record<string, string> = {
        cost: "cost reduction", growth: "business growth", talent_supply: "talent supply",
        customer_experience: "customer experience", employee_experience: "employee experience",
      };
      const BUSINESS_TIER_LABELS: Record<number, string> = { 1: "Foundational", 2: "Measured", 3: "Bold", 4: "Transformative" };
      const HR_TIER_LABELS: Record<number, string> = { 1: "AI-aware", 2: "AI-using", 3: "AI-enabled", 4: "Innovator" };
      const PHILOSOPHY_VERBS: Record<string, string> = {
        amplify: "use AI to amplify what our people do",
        automate: "automate routine processes end-to-end",
        substitute: "replace headcount in areas where AI can do the work",
      };

      const outcomeLabel = input.outcomeChased ? OUTCOME_LABELS[input.outcomeChased] : "strategic improvement";
      const philosophyVerb = input.augmentationPhilosophy ? PHILOSOPHY_VERBS[input.augmentationPhilosophy] : "apply AI thoughtfully";
      const allPainAreas = [...input.painAreas, ...input.painAreasOther];
      const allReinvestment = [...input.reinvestmentTargets, ...input.reinvestmentTargetsOther];
      const timeLabel = input.timeHorizonYears === 1 ? "1 year" : `${input.timeHorizonYears} years`;
      const govLocks = input.governanceLocks.length > 0 ? input.governanceLocks.join(", ") : "hiring, firing, pay and promotion";

      const systemPrompt = [
        "You are an expert HR strategy consultant writing for a CHRO audience.",
        "Write a single board-ready AI vision statement: 2-3 sentences, max 80 words.",
        "Requirements:",
        "- Open with a concrete outcome claim. NEVER start with: We will, Our vision, Our goal, We aim, We seek, We aspire, Our ambition",
        "- Reference the org descriptor (sector and scale) if provided",
        "- Name the time horizon explicitly",
        "- Use the augmentation philosophy as a plain-English verb phrase",
        "- Name the strategic outcome being chased",
        "- Reference at least 2 pain areas and 1 reinvestment target",
        "- State the governance posture (people sign off on: " + govLocks + ")",
        "- End with the HR function's specific role",
        "FORBIDDEN WORDS: AI-fluent workforce, responsible AI adoption, championing, fundamentally reshape, transformative AI capabilities, strategic partner, strategic enabler",
        "FORBIDDEN: any percentage or number not present in the inputs",
        "Return ONLY the vision statement text. No quotes, no preamble, no JSON.",
      ].join("\n");

      const userPrompt = [
        input.orgDescriptor ? `Organisation: ${input.orgDescriptor}` : "Organisation: not specified",
        `Time horizon: ${timeLabel}`,
        `Strategic outcome: ${outcomeLabel}`,
        `Business ambition tier: ${BUSINESS_TIER_LABELS[input.businessAmbitionTier] ?? input.businessAmbitionTier}`,
        `HR delivery tier: ${HR_TIER_LABELS[input.hrDeliveryTier] ?? input.hrDeliveryTier}`,
        `Augmentation philosophy: ${philosophyVerb}`,
        `Pain areas: ${allPainAreas.length > 0 ? allPainAreas.join(", ") : "not specified"}`,
        `Reinvestment targets: ${allReinvestment.length > 0 ? allReinvestment.join(", ") : "not specified"}`,
        `Governance locks (humans must sign off): ${govLocks}`,
        input.capabilityScore != null ? `HR AI capability score: ${input.capabilityScore.toFixed(1)}/10 (${input.capabilityLabel ?? ""})` : "",
      ].filter(Boolean).join("\n");

      const resp = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const draft = resp?.choices?.[0]?.message?.content;
      if (!draft || typeof draft !== "string") {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM did not return a vision draft" });
      }
      return { visionDraft: draft.trim() };
    }),

  /**
   * Ambition Rebuild — Get all section content for the Ambition page.
   * Returns the 7 sections with their current content and built status.
   */
  getAmbitionSections: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select({
        visionStatement: ailOrgContext.visionStatement,
        visionAiFirstDraft: ailOrgContext.visionAiFirstDraft,
        visionLastEditedBy: ailOrgContext.visionLastEditedBy,
        visionLastEditedAt: ailOrgContext.visionLastEditedAt,
        guidingPrinciplesJson: ailOrgContext.guidingPrinciplesJson,
        wontDoJson: ailOrgContext.wontDoJson,
        outcomesJson: ailOrgContext.outcomesJson,
        approachLine: ailOrgContext.approachLine,
        businessAmbitionLevel: ailOrgContext.businessAmbitionLevel,
        peopleAmbitionLevel: ailOrgContext.peopleAmbitionLevel,
        visionInputsJson: ailOrgContext.visionInputsJson,
        lastReviewedAt: ailOrgContext.lastReviewedAt,
        lastReviewedBy: ailOrgContext.lastReviewedBy,
      })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      const parse = (s: string | null | undefined) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
      if (!rows.length) return {
        vision: null, visionAiFirstDraft: null, visionLastEditedBy: null, visionLastEditedAt: null,
        principles: null, wontDo: null, outcomes: null, approachLine: null,
        businessAmbitionLevel: null, peopleAmbitionLevel: null,
        lastReviewedAt: null, lastReviewedBy: null,
      };
      const r = rows[0];
      // Auto-migrate: principles from old {title,description}[] to new {title,description,capability_tags,ai_drafted}[]
      const rawPrinciples = parse(r.guidingPrinciplesJson) as Array<{ title: string; description: string; capability_tags?: string[]; ai_drafted?: boolean }> | null;
      const principles = rawPrinciples ? rawPrinciples.map((p, i) => ({
        number: i + 1,
        title: p.title,
        description: p.description,
        capability_tags: p.capability_tags ?? [],
        ai_drafted: p.ai_drafted ?? false,
      })) : null;
      // Auto-migrate: wontDo from old string[] to new {text,ai_drafted}[]
      const rawWontDo = parse(r.wontDoJson);
      const wontDo = rawWontDo ? (Array.isArray(rawWontDo)
        ? rawWontDo.map((item: unknown) => typeof item === "string" ? { text: item, ai_drafted: false } : item)
        : null) : null;
      return {
        vision: r.visionStatement ?? null,
        visionAiFirstDraft: r.visionAiFirstDraft ?? null,
        visionLastEditedBy: r.visionLastEditedBy ?? null,
        visionLastEditedAt: r.visionLastEditedAt ?? null,
        principles,
        wontDo: wontDo as Array<{ text: string; ai_drafted: boolean }> | null,
        outcomes: parse(r.outcomesJson) as Array<{
          number: number; title: string; unit: string;
          baseline_value: number | null; baseline_status: "measured" | "not_measured";
          baseline_study_date: string | null; target_value: number; target_date: string;
          derived_summary: string; tests_principle: number | null; ai_drafted: boolean;
        }> | null,
        approachLine: r.approachLine ?? null,
        businessAmbitionLevel: r.businessAmbitionLevel ?? null,
        peopleAmbitionLevel: r.peopleAmbitionLevel ?? null,
        lastReviewedAt: r.lastReviewedAt ?? null,
        lastReviewedBy: r.lastReviewedBy ?? null,
      };
    }),

  /**
   * Ambition Rebuild — Save a single section's content.
   * Supported sections: outcomes, waysOfWork, principles, aiLandscape, wontDo, stakeholderMap.
   * Vision is handled by patchStrategyField + saveVisionInputs.
   */
  saveAmbitionSection: protectedProcedure
    .input(z.discriminatedUnion("section", [
      z.object({ section: z.literal("principles"), value: z.array(z.object({
        number: z.number().int(),
        title: z.string(),
        description: z.string(),
        capability_tags: z.array(z.string()).default([]),
        ai_drafted: z.boolean().default(false),
      })) }),
      z.object({ section: z.literal("wontDo"), value: z.array(z.object({
        text: z.string(),
        ai_drafted: z.boolean().default(false),
      })) }),
      z.object({ section: z.literal("outcomes"), value: z.array(z.object({
        number: z.number().int(),
        title: z.string(),
        unit: z.string(),
        baseline_value: z.number().nullable(),
        baseline_status: z.enum(["measured", "not_measured"]),
        baseline_study_date: z.string().nullable(),
        target_value: z.number(),
        target_date: z.string(),
        derived_summary: z.string(),
        tests_principle: z.number().int().nullable(),
        ai_drafted: z.boolean().default(false),
      })) }),
      z.object({ section: z.literal("approachLine"), value: z.string() }),
      z.object({ section: z.literal("markReviewed"), value: z.object({ reviewerName: z.string() }) }),
    ]))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select({ id: ailOrgContext.id })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "No strategy found for this tenant" });
      const patch: Partial<typeof ailOrgContext.$inferInsert> = { updatedAt: new Date() };
      if (input.section === "principles") patch.guidingPrinciplesJson = JSON.stringify(input.value);
      else if (input.section === "wontDo") patch.wontDoJson = JSON.stringify(input.value);
      else if (input.section === "outcomes") patch.outcomesJson = JSON.stringify(input.value);
      else if (input.section === "approachLine") patch.approachLine = input.value;
      else if (input.section === "markReviewed") {
        patch.lastReviewedAt = new Date();
        patch.lastReviewedBy = input.value.reviewerName;
      }
      await db.update(ailOrgContext).set(patch).where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { success: true };
    }),

  /**
   * Ambition Rebuild — AI-draft a single section.
   * Returns the drafted content for the section.
   */
  draftAmbitionSection: protectedProcedure
    .input(z.object({
      section: z.enum(["principles", "wontDo", "outcomes", "approachLine"]),
      orgDescriptor: z.string().nullable().optional(),
      businessAmbitionTier: z.number().int().min(1).max(4).nullable().optional(),
      hrDeliveryTier: z.number().int().min(1).max(4).nullable().optional(),
      visionStatement: z.string().nullable().optional(),
      existingPrinciples: z.array(z.object({ title: z.string(), description: z.string() })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const BUSINESS_TIER_LABELS: Record<number, string> = { 1: "Foundational", 2: "Measured", 3: "Bold", 4: "Transformative" };
      const HR_TIER_LABELS: Record<number, string> = { 1: "AI-aware", 2: "AI-using", 3: "AI-enabled", 4: "Innovator" };
      const bLabel = input.businessAmbitionTier ? BUSINESS_TIER_LABELS[input.businessAmbitionTier] ?? "" : "";
      const hrLabel = input.hrDeliveryTier ? HR_TIER_LABELS[input.hrDeliveryTier] ?? "" : "";
      const orgCtx = input.orgDescriptor ?? "an HR function";
      const visionCtx = input.visionStatement ? `Vision: ${input.visionStatement}` : "";
      const principlesCtx = input.existingPrinciples?.length
        ? `Guiding principles: ${input.existingPrinciples.map(p => p.title).join("; ")}`
        : "";

      const PROMPTS: Record<string, { system: string; user: string }> = {
        principles: {
          system: `You are an HR strategy consultant writing guiding principles for an HR AI strategy. Principles must be CONSTRAINT-SHAPED — each title rules something IN or OUT and describes specific behaviour. They are NOT category labels or values.

Good examples:
- "Human-in-the-loop on consequential decisions" (rules in human oversight on hiring, promotion, termination)
- "Reshape work, then add AI" (rules out bolting AI onto existing processes)
- "Build skills first, deploy second" (rules in sequencing: literacy before deployment)

Bad examples (do NOT produce these):
- "People-Centric AI Innovation" (category label, not a constraint)
- "Responsible AI" (too vague, not a behavioural rule)

Write exactly 5 principles. Each has:
- number (1-based integer, 1-5)
- title (3-8 words, constraint-shaped — rules something in or out)
- description (1-2 sentences specifying the exact behaviour this principle mandates or prohibits)
- capability_tags (array of 1-3 tags from EXACTLY this list: ["Output evaluation", "AI interaction", "Ethics & trust", "Workflow design", "Workforce readiness", "Change leadership"])
- ai_drafted: true

Return a JSON array of exactly 5 objects with these exact fields only. No markdown fences.`,
          user: `Org: ${orgCtx}. Business ambition: ${bLabel}. HR delivery tier: ${hrLabel}. ${visionCtx}`,
        },
        wontDo: {
          system: `You are an HR strategy consultant writing strategic exclusions for an HR AI strategy. Exclusions are REAL strategic choices a peer CPO could plausibly debate — specific things being deferred or ruled out for this period.

Good examples:
- "We will not let any vendor's AI make shortlist cuts without HR review." (specific, some CPOs would disagree)
- "We will not use generative AI for performance reviews this fiscal year." (specific time-bound deferral)
- "We will not deploy AI in payroll, benefits, or compensation in this period." (specific domain exclusion)

Bad examples (do NOT produce these):
- "We will not use AI for biased hiring decisions." (anti-strawman — nobody plans to)
- "We will not ignore employee concerns." (not a real strategic choice)
- "We will not deploy AI without proper governance." (too vague)

Write exactly 5 exclusions. Each is one sentence (max 20 words) naming a specific thing being deferred or ruled out. Return a JSON array of objects with fields: text (string), ai_drafted: true. No markdown fences.`,
          user: `Org: ${orgCtx}. Business ambition: ${bLabel}. HR delivery tier: ${hrLabel}. ${visionCtx}`,
        },
        outcomes: {
          system: `You are an HR strategy consultant writing measurable outcomes for an HR AI strategy. Outcomes are COMMITMENTS with a specific baseline (or scheduled baseline study), a specific target, and a specific date.

Good examples:
- "Reduce admin time per hire — 6h today → 3h by Q4 2026" (specific baseline, specific target, specific date)
- "HR team at AI Practitioner level — 22% today → 85% by Q4 2026" (measurable progression)
- "Employee trust in HR's AI use — 48% today → 80% by Q3 2027" (survey-based, measurable)

Bad examples (do NOT produce these):
- "Increase HR Team Productivity" (no baseline, no target, no date)
- "Improve AI adoption" (not measurable)

Write exactly 4 outcomes. At least 3 must have a measured baseline (baseline_status: "measured", baseline_value set to a real number). At most 1 may have baseline_status: "not_measured" (with a scheduled baseline study date). Each outcome has:
- number (1-based integer, 1-4)
- title (specific change being committed to, 4-8 words)
- unit (e.g. "h", "%", "days", "score", "£")
- baseline_value (number if measured, null if not_measured)
- baseline_status ("measured" or "not_measured")
- baseline_study_date ("Q4 2025" format if not_measured, null if measured)
- target_value (realistic number)
- target_date ("Q4 2026" format)
- derived_summary (one sentence summarising the change, e.g. "50% reduction" or "~4× growth")
- tests_principle (null — will be set by user)
- ai_drafted: true

Return a JSON array of exactly 4 objects with these exact fields only. No markdown fences.`,
          user: `Org: ${orgCtx}. Business ambition: ${bLabel}. HR delivery tier: ${hrLabel}. ${visionCtx}`,
        },
        approachLine: {
          system: `You are an HR strategy consultant. Write a single sentence (max 25 words) describing the organisation's AI posture in HR — the strategic stance that anchors all decisions. Start with the org name if provided. Return plain text only.`,
          user: `Org: ${orgCtx}. Business ambition: ${bLabel}. HR delivery tier: ${hrLabel}. ${visionCtx}. ${principlesCtx}`,
        },
      };

      const prompt = PROMPTS[input.section];
      if (!prompt) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid section" });

      const resp = await invokeLLM({
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      });
      const raw = resp?.choices?.[0]?.message?.content;
      if (!raw || typeof raw !== "string") {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM did not return a draft" });
      }

      if (input.section === "approachLine") return { draft: raw.trim() };

      // Parse JSON sections
      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        return { draft: parsed };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned invalid JSON" });
      }
    }),

  /**
   * P1.3 — Evaluate risk rules against current strategy context.
   * Returns auto-populated risk register entries with sourceRuleId.
   */
  evaluateRiskRules: protectedProcedure
    .input(z.object({
      ambitionTier: z.enum(["cautious", "progressive", "transformative"]),
      orgSize: z.enum(["small", "medium", "large", "enterprise"]),
      selectedInitiativeIds: z.array(z.string()),
      hasExecSponsor: z.boolean().optional(),
      hasDataGovernanceInitiative: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const riskInput: RiskEvalInput = {
        ambitionTier: input.ambitionTier,
        orgSize: input.orgSize,
        selectedInitiativeIds: resolveInitiativeIds(input.selectedInitiativeIds),
        hasExecSponsor: input.hasExecSponsor ?? false,
        hasDataGovernanceInitiative: input.hasDataGovernanceInitiative ?? false,
      };
      return evaluateRiskRules(riskInput);
    }),

  /**
   * P2.1 — Auto-select initiatives based on capability gaps, sector, and ambition tier.
   */
  selectInitiatives: protectedProcedure
    .input(z.object({
      ambitionTier: z.enum(["cautious", "progressive", "transformative"]),
      sector: z.string(),
      orgSize: z.enum(["small", "medium", "large", "enterprise"]),
      orgSizeHeadcount: z.number().int().positive().optional(),
      priorityDomains: z.array(z.string()),
      targetCount: z.number().int().min(1).max(30),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const selectInput: SelectInitiativesInput = {
        ambitionTier: input.ambitionTier,
        sector: input.sector,
        orgSize: input.orgSize,
        orgSizeHeadcount: input.orgSizeHeadcount ?? 300,
        priorityDomains: input.priorityDomains,
        targetCount: input.targetCount,
      };
      return selectInitiatives(selectInput);
    }),

  /**
   * P2.2 — Calculate cost envelope for selected initiatives.
   */
  calculateCostEnvelope: protectedProcedure
    .input(z.object({
      selectedInitiativeIds: z.array(z.string()),
      orgSize: z.enum(["small", "medium", "large", "enterprise"]),
      ambitionTier: z.enum(["cautious", "progressive", "transformative"]),
    }))
    .query(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const resolvedCostIds = resolveInitiativeIds(input.selectedInitiativeIds);
      return calculateCostEnvelope(
        resolvedCostIds,
        input.orgSize,
        input.ambitionTier,
      );
    }),

  /**
   * P1.4 / P2.3 — Build provenance map for a strategy artefact.
   */
  buildProvenanceMap: protectedProcedure
    .input(z.object({
      selectedInitiativeIds: z.array(z.string()),
      visionStatement: z.string(),
      sector: z.string(),
      ambitionTier: z.enum(["cautious", "progressive", "transformative"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Evaluate risk rules first to pass to provenance map
      const resolvedProvenanceIds = resolveInitiativeIds(input.selectedInitiativeIds);
      const riskMatches = evaluateRiskRules({
        ambitionTier: input.ambitionTier,
        orgSize: "medium", // default — provenance map doesn't gate on org size
        selectedInitiativeIds: resolvedProvenanceIds,
        hasExecSponsor: false,
        hasDataGovernanceInitiative: false,
      });
      return buildProvenanceMap({
        selectedInitiativeIds: resolvedProvenanceIds,
        riskMatches,
        orgSize: "medium",
        ambitionTier: input.ambitionTier,
      });
    }),


  /**
   * C3 — Calculate the value envelope for a set of selected initiatives.
   * Uses the operational baseline from the strategy assessment to monetise
   * quantifiable initiatives and summarise qualitative value.
   */
  calculateValueEnvelope: protectedProcedure
    .input(z.object({
      selectedInitiativeIds: z.array(z.string()),
      operationalBaseline: z.object({
        headcount: z.number().optional(),
        hires_per_year: z.number().optional(),
        cost_per_hire_gbp: z.number().optional(),
        time_to_fill_days: z.number().optional(),
        voluntary_attrition_rate_pct: z.number().optional(),
        l_and_d_spend_per_fte_gbp: z.number().optional(),
        hr_cost_per_fte_gbp: z.number().optional(),
        _sector_default_used: z.record(z.string(), z.boolean()).optional(),
      }).optional(),
      planHorizonMonths: z.number().min(6).max(60).default(36),
      solutionDeliveryConfidence: z.number().min(1).max(5).optional(),
      /** Session-scoped DCF discount rate override (0.02–0.20). Defaults to 0.08 in engine. */
      discountRate: z.number().min(0.02).max(0.20).optional(),
    }))
    .query(({ input }) => {
      const lib = getContentLibrary();
      const allInits = getAllInitiatives();
      const resolvedValueIds = resolveInitiativeIds(input.selectedInitiativeIds);
      const selected = allInits.filter(i => resolvedValueIds.includes(i.initiative_id));
      return calculateValueEnvelope(
        selected,
        input.operationalBaseline ?? {},
        input.planHorizonMonths,
        input.solutionDeliveryConfidence,
        input.discountRate
      ) as ValueEnvelope;
    }),
  /**
   * Get per-initiative state (status, phase, functionOverride) joined with library data.
   * Used by the Plan page to show initiative list with inline editing.
   */
  getStrategyInitiatives: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    // Get the tenant's strategy context to find selectedInitiativeIds + fitImpactResultsJson
    const ctxRows = await db.select({
      selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
      fitImpactResultsJson: ailOrgContext.fitImpactResultsJson,
    }).from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    if (!ctxRows[0]) return [];
    let selectedIds: string[] = [];
    try { selectedIds = JSON.parse(ctxRows[0].selectedInitiativesJson ?? "[]") as string[]; } catch {}
    if (!selectedIds.length) return [];
    // Parse fit+impact results into a map keyed by initiative id
    type FitCard = {
      id: string; fitStatus: string; fitScore: number; fitRationale: string;
      valueRange: { low: number; high: number; currency: string } | null;
      valueNarrative: string; isIndicative: boolean; confidence: string;
      timeToValueMonths: { min: number; max: number }; phase: number;
      caseStudyAnchor: string; riskFlags: string[]; hardGateFailReasons: string[];
      scoredFactors: Array<{ key: string; label: string; score: number; maxScore: number }>;
      hardGatesPassed: string[];
      y1CostRange: { low: number; high: number };
    };
    const fitMap = new Map<string, FitCard>();
    try {
      const raw = ctxRows[0].fitImpactResultsJson ? JSON.parse(ctxRows[0].fitImpactResultsJson) : [];
      for (const r of raw as FitCard[]) { fitMap.set(r.id, r); }
    } catch {}
    // Fetch all library entries for selected IDs
    const libRows = await db.select().from(strategyInitiativeLibrary);
    const libMap = new Map(libRows.map(r => [r.id, r]));
    // Fetch per-initiative state rows for this tenant's users' strategies
    const stateRows = await db.select().from(strategyInitiatives)
      .where(eq(strategyInitiatives.strategyId, ctx.user.tenantId));
    const stateMap = new Map(stateRows.map(r => [r.initiativeId, r]));
    return selectedIds.map(id => {
      const lib = libMap.get(id);
      const state = stateMap.get(id);
      const fit = fitMap.get(id) ?? null;
      return {
        id,
        name: lib?.name ?? id,
        description: lib?.description ?? null,
        category: lib?.category ?? null,
        aiType: lib?.aiType ?? null,
        decisionAuthority: lib?.decisionAuthority ?? null,
        regulatoryFlag: lib?.regulatoryFlag ?? null,
        complexity: lib?.complexity ?? 3,
        isUserDefined: lib?.isUserDefined === 1,
        // per-initiative mutable state
        stateId: state?.id ?? null,
        status: state?.status ?? "not_started",
        statusReason: state?.statusReason ?? null,
        targetQuarter: state?.targetQuarter ?? "Q2",
        functionOverride: state?.functionOverride ?? null,
        criticality: state?.criticality ?? 1,
        notes: state?.notes ?? null,
        // fit+impact engine output
        fitStatus: fit?.fitStatus ?? null,
        fitScore: fit?.fitScore ?? null,
        fitRationale: fit?.fitRationale ?? null,
        valueRange: fit?.valueRange ?? null,
        valueNarrative: fit?.valueNarrative ?? null,
        isIndicative: fit?.isIndicative ?? true,
        confidence: fit?.confidence ?? null,
        timeToValueMonths: fit?.timeToValueMonths ?? null,
        caseStudyAnchor: fit?.caseStudyAnchor ?? null,
        riskFlags: fit?.riskFlags ?? [],
        hardGateFailReasons: fit?.hardGateFailReasons ?? [],
        scoredFactors: fit?.scoredFactors ?? [],
        hardGatesPassed: fit?.hardGatesPassed ?? [],
        y1CostRange: fit?.y1CostRange ?? null,
      };
    });
  }),

  /**
   * Patch a single initiative's mutable state (status, phase, functionOverride, notes).
   * Upserts a strategyInitiatives row keyed by tenantId+initiativeId.
   */
  patchStrategyInitiative: protectedProcedure
    .input(z.object({
      initiativeId: z.string(),
      status: z.enum(["not_started", "in_progress", "paused", "completed", "cancelled"]).optional(),
      statusReason: z.string().nullable().optional(),
      targetQuarter: z.string().optional(),
      functionOverride: z.string().nullable().optional(),
      criticality: z.number().int().min(1).max(5).optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select({ id: strategyInitiatives.id })
        .from(strategyInitiatives)
        .where(and(
          eq(strategyInitiatives.strategyId, ctx.user.tenantId),
          eq(strategyInitiatives.initiativeId, input.initiativeId),
        ))
        .limit(1);
      const patch: Partial<typeof strategyInitiatives.$inferInsert> = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.statusReason !== undefined) patch.statusReason = input.statusReason;
      if (input.targetQuarter !== undefined) patch.targetQuarter = input.targetQuarter;
      if (input.functionOverride !== undefined) patch.functionOverride = input.functionOverride;
      if (input.criticality !== undefined) patch.criticality = input.criticality;
      if (input.notes !== undefined) patch.notes = input.notes;
      if (existing.length > 0) {
        await db.update(strategyInitiatives).set(patch)
          .where(and(
            eq(strategyInitiatives.strategyId, ctx.user.tenantId),
            eq(strategyInitiatives.initiativeId, input.initiativeId),
          ));
      } else {
        await db.insert(strategyInitiatives).values({
          id: nanoid(),
          strategyId: ctx.user.tenantId,
          initiativeId: input.initiativeId,
          status: input.status ?? "not_started",
          statusReason: input.statusReason ?? null,
          targetQuarter: input.targetQuarter ?? "Q2",
          functionOverride: input.functionOverride ?? null,
          criticality: input.criticality ?? 1,
          notes: input.notes ?? null,
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

  /**
   * Get all active (non-revoked) risk acknowledgements for the tenant.
   */
  getRiskAcknowledgements: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(riskAcknowledgements)
      .where(and(
        eq(riskAcknowledgements.tenantId, ctx.user.tenantId),
      ));
    // Return all acks (both active and revoked) so UI can show audit log
    return rows.map(r => ({
      id: r.id,
      itemId: r.itemId,
      itemType: r.itemType,
      acknowledgedBy: r.acknowledgedBy,
      acknowledgedAt: r.acknowledgedAt,
      note: r.note,
      revokedAt: r.revokedAt,
      revokedBy: r.revokedBy,
    }));
  }),

  /**
   * Acknowledge a risk or framework item.
   */
  acknowledgeRisk: protectedProcedure
    .input(z.object({
      itemId: z.string().max(128),
      itemType: z.enum(["risk", "framework"]),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Check if already acknowledged (active)
      const existing = await db.select({ id: riskAcknowledgements.id })
        .from(riskAcknowledgements)
        .where(and(
          eq(riskAcknowledgements.tenantId, ctx.user.tenantId),
          eq(riskAcknowledgements.itemId, input.itemId),
        ))
        .limit(1);
      if (existing.length > 0) {
        // Already acknowledged — update note if provided
        await db.update(riskAcknowledgements).set({
          note: input.note ?? null,
          revokedAt: null,
          revokedBy: null,
          acknowledgedBy: ctx.user.id,
          acknowledgedAt: Date.now(),
        }).where(eq(riskAcknowledgements.id, existing[0].id));
        return { id: existing[0].id, created: false };
      }
      const id = nanoid();
      await db.insert(riskAcknowledgements).values({
        id,
        tenantId: ctx.user.tenantId,
        itemId: input.itemId,
        itemType: input.itemType,
        acknowledgedBy: ctx.user.id,
        acknowledgedAt: Date.now(),
        note: input.note ?? null,
      });
      return { id, created: true };
    }),

  /**
   * Revoke (un-acknowledge) a risk or framework item.
   */
  revokeRiskAcknowledgement: protectedProcedure
    .input(z.object({
      itemId: z.string().max(128),
    }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(riskAcknowledgements).set({
        revokedAt: Date.now(),
        revokedBy: ctx.user.id,
      }).where(and(
        eq(riskAcknowledgements.tenantId, ctx.user.tenantId),
        eq(riskAcknowledgements.itemId, input.itemId),
      ));
      return { success: true };
    }),

  // ─── Leadership Talking Points ───────────────────────────────────────────────

  /**
   * Get the current leadership talking points for the org.
   */
  getTalkingPoints: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select({ leadershipTalkingPointsJson: ailOrgContext.leadershipTalkingPointsJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!rows.length || !rows[0].leadershipTalkingPointsJson) return null;
      try {
        return JSON.parse(rows[0].leadershipTalkingPointsJson) as {
          bullets: string[];
          generatedAt: number;
          userEdited: boolean;
          strategyHash: string;
        };
      } catch { return null; }
    }),

  /**
   * Generate (or regenerate) leadership talking points using the LLM.
   * Stores the result in ail_org_context.leadership_talking_points_json.
   */
  generateLeadershipTalkingPoints: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "No strategy found" });
      const ctx2 = rows[0];
      const businessLevel = ctx2.businessAmbitionLevel ?? 3;
      const peopleLevel   = ctx2.peopleAmbitionLevel ?? 3;
      const BUSINESS_LABELS: Record<number, string> = { 1: "Cautious", 2: "Exploratory", 3: "Progressive", 4: "Ambitious", 5: "Transformative" };
      const PEOPLE_LABELS:   Record<number, string> = { 1: "Followers", 2: "Adopters", 3: "Practitioners", 4: "Champions", 5: "Innovators" };
      const bLabel = BUSINESS_LABELS[businessLevel] ?? "Progressive";
      const selectedIds: string[] = ctx2.selectedInitiativesJson ? JSON.parse(ctx2.selectedInitiativesJson) : [];
      const structuredInputs = ctx2.structuredInputsJson ? JSON.parse(ctx2.structuredInputsJson) : {};
      const timelineMonths = structuredInputs.timeline_months ?? 18;
      const hashSource = JSON.stringify({ selectedIds, businessLevel, peopleLevel, timelineMonths });
      const strategyHash = Buffer.from(hashSource).toString("base64").slice(0, 32);
      // ── Enrich prompt data with capability scores, cost/value ranges, initiative names, risks ──
      const orgName = (ctx2 as any).companyName ?? "The HR function";
      // Get latest capability score from assessmentScores via assessmentSessions
      let capabilityScoreRaw: number | null = null;
      try {
        const latestUser = await db.select({ id: users.id }).from(users)
          .where(eq(users.tenantId, ctx.user.tenantId)).limit(1);
        if (latestUser.length) {
          const latestSession = await db.select({ id: assessmentSessions.id }).from(assessmentSessions)
            .where(and(eq(assessmentSessions.userId, latestUser[0].id), eq(assessmentSessions.state, "completed")))
            .orderBy(desc(assessmentSessions.completedAt)).limit(1);
          if (latestSession.length) {
            const scoreRow = await db.select({ overallScore: assessmentScores.overallScore }).from(assessmentScores)
              .where(eq(assessmentScores.sessionId, latestSession[0].id)).limit(1);
            if (scoreRow.length) capabilityScoreRaw = Number(scoreRow[0].overallScore);
          }
        }
      } catch { /* non-blocking */ }
      // Derive capability on 0-10 scale (overallScore is 0-1)
      const capNow = capabilityScoreRaw != null ? Math.round(capabilityScoreRaw * 100) / 10 : null;
      const capTarget = ctx2.ambitionTargetScore != null ? ctx2.ambitionTargetScore / 10 : null;
      const capGap = capNow != null && capTarget != null ? Math.round((capTarget - capNow) * 10) / 10 : null;
      // Get initiative names from content library
      let initiativeNames: string[] = [];
      try {
        const allLibInits = getAllInitiatives();
        const nameMap = new Map(allLibInits.map(i => [i.initiative_id, i.display_name ?? i.initiative_id]));
        initiativeNames = selectedIds.map(id => nameMap.get(id) ?? id).slice(0, 10);
      } catch { /* non-blocking */ }
      // Get cost envelope
      let costMin: number | null = null, costMax: number | null = null;
      try {
        const resolvedCostIds = resolveInitiativeIds(selectedIds);
        const costEnv = calculateCostEnvelope(
          resolvedCostIds,
          "medium",
          businessLevel >= 4 ? "transformative" : businessLevel >= 2 ? "progressive" : "cautious",
        );
        costMin = costEnv.totalMin; costMax = costEnv.totalMax;
      } catch { /* non-blocking */ }
      // Get value envelope
      let valueMin: number | null = null, valueMax: number | null = null;
      try {
        const allInits = getAllInitiatives();
        const resolvedValIds = resolveInitiativeIds(selectedIds);
        const selected = allInits.filter(i => resolvedValIds.includes(i.initiative_id));
        const valEnv = calculateValueEnvelope(
          selected,
          {},
          36,
          null,
          0.08,
        );
        valueMin = valEnv.net_value_gbp?.low ?? null;
        valueMax = valEnv.net_value_gbp?.high ?? null;
      } catch { /* non-blocking */ }
      // Get top risks
      let topRisks: string[] = [];
      try {
        const risks = evaluateRiskRules({
          ambitionTier: businessLevel >= 4 ? "transformative" : businessLevel >= 2 ? "progressive" : "cautious",
          orgSize: "medium",
          selectedInitiativeIds: selectedIds,
          hasExecSponsor: false,
          hasDataGovernanceInitiative: selectedIds.some(id => id.includes("data_governance") || id.includes("data_quality")),
        });
        topRisks = risks.filter(r => r.severity === "high").map(r => r.displayName).slice(0, 3);
      } catch { /* non-blocking */ }
      const fmtGbp = (n: number) => {
        if (n >= 1_000_000) return `\u00a3${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `\u00a3${Math.round(n / 1_000)}k`;
        return `\u00a3${Math.round(n)}`;
      };
      const promptData = {
        orgName,
        businessAmbition: bLabel,
        peopleAmbition: PEOPLE_LABELS[peopleLevel] ?? "Practitioners",
        initiativeCount: selectedIds.length,
        initiativeNames,
        timelineMonths,
        // Prefer user's verbatim input over AI-generated vision for TP1 anchor
        visionStatement: ctx2.userVisionInput ?? ctx2.visionStatement ?? null,
        capabilityScore: capNow != null ? `${capNow}/10` : null,
        capabilityTarget: capTarget != null ? `${capTarget}/10` : null,
        capabilityGap: capGap != null ? `${capGap} points` : null,
        costEstimated: costMin != null && costMax != null ? fmtGbp((costMin + costMax) / 2 * 1000) : null,
        costRange: costMin != null && costMax != null ? `${fmtGbp(costMin * 1000)}\u2013${fmtGbp(costMax * 1000)}` : null,
        valueEstimated: valueMin != null && valueMax != null ? fmtGbp((valueMin + valueMax) / 2) : null,
        valueRange: valueMin != null && valueMax != null ? `${fmtGbp(valueMin)}\u2013${fmtGbp(valueMax)}` : null,
        topRisks,
        sector: ctx2.sector ?? null,
      };
      const systemPrompt = `You are generating exactly 5 talking points for a CPO to use when briefing their CEO about an HR AI strategy. This is a STRATEGIC DOCUMENT briefing — not an operational update. Each bullet must be grounded in the specific strategy data provided.

PRODUCE EXACTLY 5 BULLETS in this MANDATORY FIXED ORDER (order matters — render position is fixed):

1. VISION-LED OPENING. Anchor to the verbatim vision statement. Pick up the vision's key terms and themes in punchy first-person language. Do NOT quote the vision directly. Do NOT invent themes that aren't in it. Must feel like the CPO's own words, not a summary.

2. AMBITION FRAMING. Name the strategic tier (Transformative / Ambitious / Progressive / Exploratory / Cautious) and articulate WHY this tier is the right choice for the business context. Reference the sector and the HR-as-innovator / HR-as-champion framing where present. One clause reason tied to business context — not a generic platitude.

3. CAPABILITY GAP. Include ALL FOUR of: today's capability score, target capability score, the point gap, and the score-level descriptor (foundational / proficient / solid / mature). Frame as "what HR needs to be able to do to deliver this." All four data points must be present.

4. FINANCIAL IMPACT. Reference BOTH the specific cost figure AND the specific value figure with their abbreviated formats (£k / £M) as they appear on the dashboard. Translate the financial value into 2–3 specific drivers — these drivers MUST be pulled from the vision statement and/or the named initiatives, not generated freely. Place the finance-confirmation caveat at the END (so it reads as due diligence, not hedging).

5. STRATEGIC DEPENDENCY. ONE key risk, blocker, or precondition — the single most material one. If multiple dependencies exist (cross-functional alignment, executive sponsorship, regulatory approval, data governance), pick the most material one and frame it specifically. Do NOT list multiple dependencies.

EACH BULLET: one paragraph, 25–45 words, plain English, speakable aloud. Each must reference at least one specific fact from the dashboard data.

CALIBRATION EXAMPLE (for a retail HR strategy with 9 initiatives, 5.2/10 capability, £660k cost, £21.5M value):
1. We're building an AI-fluent HR function, integrating AI into critical people processes over the next 18 months to reduce admin burden, speed up decision-making, and enable HR to operate as strategic partners.
2. We're committing to Transformative ambition — the top tier — because retail's pace and our role in the customer experience require HR to be an active innovator, not a fast follower.
3. Today HR's AI capability scores 5.2 out of 10, at foundational level. To deliver this strategy we need to be at 7.3 — a 2.1 point gap to close over 18 months, with capability development running alongside the 9 initiatives.
4. We're investing roughly £660k over three years to unlock an estimated £21.5M in business value — driven by efficiency gains, faster decisions, and reduced admin burden. Finance will confirm the model as pilots progress.
5. This is contingent on strong cross-functional alignment with IT and Legal for data governance. Without it, ambition outpaces capacity to deliver responsibly.

ANTI-PATTERNS — NEVER produce output like these:
BAD: Generic prose with no strategy-specific numbers — "We're building an AI-fluent HR function to reduce admin burden." (missing scores, cost, value)
BAD: Operational task — "Need to assign owners to Foundation initiatives."
BAD: Generic platitude — "Executive sponsorship will be crucial to champion this transformative shift." (not tied to this strategy's specifics)
BAD: Execution tracking — "Foundation phase is active" or "2 of 9 underway"
BAD: Multiple dependencies in bullet 5 — "This depends on IT alignment, Legal sign-off, and executive sponsorship." (pick ONE)
BAD: Bullet 3 missing any of the four data points — "HR needs to improve its capability to deliver this strategy." (no scores, no gap, no descriptor)

Return format: JSON array of exactly 5 strings, no other text.`;
      let bullets: string[];
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: `Strategy data:\n${JSON.stringify(promptData, null, 2)}` },
          ],
        });
        const rawContent = response.choices?.[0]?.message?.content;
        const raw = typeof rawContent === "string" ? rawContent : "[]";
        const cleaned = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        bullets = Array.isArray(parsed) ? parsed : (parsed.bullets ?? []);
        if (!Array.isArray(bullets) || bullets.length === 0) throw new Error("Empty");
        // Enforce exactly 5 bullets — LLM occasionally returns 4
        bullets = bullets.slice(0, 5);
        // If LLM returned fewer than 5, pad with a strategic dependency fallback
        if (bullets.length < 5) {
          const fallbackFifth = `The strategy assumes cross-functional alignment — particularly Legal engagement on responsible-AI commitments and data governance.`;
          while (bullets.length < 5) bullets.push(fallbackFifth);
        }
      } catch {
        const capScore = (ctx2.ambitionTargetScore ?? 55) / 10;
        const leadClause = capScore < 3.1 ? `${promptData.orgName} is in the early stages of HR capability build.`
          : capScore < 5.6 ? `${promptData.orgName} has built foundational HR capability.`
          : capScore < 7.6 ? `${promptData.orgName} has solid HR capability across most domains.`
          : `${promptData.orgName} has mature HR capability.`;
        const capNowFallback = promptData.capabilityScore ?? "(not yet assessed)";  
        const capTargetFallback = promptData.capabilityTarget ?? "(target not set)";
        const capGapFallback = promptData.capabilityGap ?? "(gap not calculated)";
        bullets = [
          leadClause,
          `HR capability today is at ${capNowFallback}; a ${capGapFallback} gap separates us from the ${capTargetFallback} needed to deliver this strategy.`,
          `The strategy closes this gap through ${promptData.initiativeCount} initiative${promptData.initiativeCount !== 1 ? "s" : ""} over ${promptData.timelineMonths} months.`,
          promptData.costRange && promptData.valueRange
            ? `Indicative investment: ${promptData.costRange} over 3 years. Estimated value: ${promptData.valueRange} net. Confirm with Finance before committing.`
            : `Cost and value estimates are available once initiatives are confirmed. Confirm with Finance before committing.`,
          `The strategy assumes cross-functional alignment — particularly Legal engagement on responsible-AI commitments and data governance.`,
        ];
      }
      const payload = JSON.stringify({ bullets, generatedAt: Date.now(), userEdited: false, strategyHash });
      await db.update(ailOrgContext)
        .set({ leadershipTalkingPointsJson: payload })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { bullets, generatedAt: Date.now(), userEdited: false, strategyHash };
    }),

  /**
   * Save (update) leadership talking points.
   * userEdited=false: full replace after regenerate.
   * userEdited=true: inline edit by user.
   */
  saveLeadershipTalkingPoints: protectedProcedure
    .input(z.object({
      bullets: z.array(z.string().max(500)).min(1).max(10),
      userEdited: z.boolean(),
      dismissedStaleNotice: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select({ leadershipTalkingPointsJson: ailOrgContext.leadershipTalkingPointsJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      let strategyHash = "";
      if (rows.length && rows[0].leadershipTalkingPointsJson) {
        try { strategyHash = JSON.parse(rows[0].leadershipTalkingPointsJson).strategyHash ?? ""; } catch {}
      }
      const payload = JSON.stringify({
        bullets: input.bullets,
        generatedAt: Date.now(),
        userEdited: input.userEdited,
        strategyHash,
        dismissedStaleNotice: input.dismissedStaleNotice ?? false,
      });
      await db.update(ailOrgContext)
        .set({ leadershipTalkingPointsJson: payload })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { success: true };
    }),

  // ─── Strategy Draft ────────────────────────────────────────────────────────

  /**
   * Get the current strategy draft (all 7 sections).
   */
  getStrategyDraft: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({ strategyDraftJson: (ailOrgContext as any).strategyDraftJson })
      .from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    if (!rows[0] || !(rows[0] as any).strategyDraftJson) return null;
    try { return JSON.parse((rows[0] as any).strategyDraftJson); } catch { return null; }
  }),

  /**
   * Generate a single section of the strategy draft using the LLM.
   */
  generateStrategyDraftSection: protectedProcedure
    .input(z.object({
      sectionId: z.enum(["exec_summary", "where_we_are", "where_going", "what_well_do", "success_measures", "what_requires", "what_wont_do"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db.select({
        visionStatement: ailOrgContext.visionStatement,
        guidingPrinciplesJson: ailOrgContext.guidingPrinciplesJson,
        wontDoJson: ailOrgContext.wontDoJson,
        outcomesJson: ailOrgContext.outcomesJson,
        selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
        fitImpactResultsJson: (ailOrgContext as any).fitImpactResultsJson,
        backgroundInputsJson: ailOrgContext.backgroundInputsJson,
        sector: ailOrgContext.sector,
        headcount: ailOrgContext.headcount,
        orgName: (ailOrgContext as any).orgName,
        strategyDraftJson: (ailOrgContext as any).strategyDraftJson,
        structuredInputsJson: ailOrgContext.structuredInputsJson,
        operationalBaselineJson: ailOrgContext.operationalBaselineJson,
      }).from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "No strategy context found" });

      const parse = (j: string | null | undefined) => { try { return j ? JSON.parse(j) : null; } catch { return null; } };
      const bgInputs = parse(row.backgroundInputsJson) ?? {};
      const principles = parse(row.guidingPrinciplesJson) ?? [];
      const wontDo = parse(row.wontDoJson) ?? [];
      const outcomes = parse(row.outcomesJson) ?? [];
      const baseline = parse(row.operationalBaselineJson) ?? {};
      const selectedIds: string[] = parse(row.selectedInitiativesJson) ?? [];
      const fitResults: Array<{ id: string; fitStatus: string; phase: number; valueRange?: { low: number; high: number }; fitRationale?: string; y1CostRange?: { low: number; high: number } }> = parse((row as any).fitImpactResultsJson) ?? [];

      const selectedFit = fitResults.filter(r => selectedIds.includes(r.id));
      const phaseMap: Record<number, string[]> = {};
      for (const f of selectedFit) {
        const p = f.phase ?? 4;
        if (!phaseMap[p]) phaseMap[p] = [];
        phaseMap[p].push(f.id.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()));
      }
      const initiativeSummary = Object.entries(phaseMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([phase, names]) => {
          const pLabel = ["Foundation", "Build", "Scale", "Optimise"][Number(phase) - 1] ?? `Phase ${phase}`;
          return `${pLabel}: ${names.join(", ")}`;
        }).join("\n");

      const totalCostLow = selectedFit.reduce((s, f) => s + (f.y1CostRange?.low ?? 0), 0);
      const totalCostHigh = selectedFit.reduce((s, f) => s + (f.y1CostRange?.high ?? 0), 0);
      const fmtCost = (k: number) => k >= 1000 ? `£${(k / 1000).toFixed(1)}M` : `£${k}k`;

      const orgCtx = [
        row.orgName ? `Organisation: ${row.orgName}` : "",
        row.sector ? `Sector: ${row.sector}` : "",
        row.headcount ? `Headcount: ${row.headcount.toLocaleString()}` : "",
        bgInputs.sectionA?.ukSitesCount ? `UK sites: ${bgInputs.sectionA.ukSitesCount}` : "",
        bgInputs.sectionB?.hrSubFunctions ? `HR sub-functions: ${bgInputs.sectionB.hrSubFunctions.join(", ")}` : "",
        baseline.hires_per_year ? `Annual hires: ${baseline.hires_per_year}` : "",
        baseline.voluntary_attrition_rate_pct ? `Attrition rate: ${baseline.voluntary_attrition_rate_pct}%` : "",
        baseline.time_to_fill_days ? `Time to fill: ${baseline.time_to_fill_days} days` : "",
      ].filter(Boolean).join("\n");

      const vision = row.visionStatement ?? "";
      const principlesList = principles.map((p: any) => `- ${p.title}: ${p.description}`).join("\n");
      const wontDoList = wontDo.map((w: any) => `- ${typeof w === "string" ? w : w.text}`).join("\n");
      const outcomesList = outcomes.map((o: any) => `- ${o.title}: ${o.derived_summary ?? ""}`).join("\n");

      const SECTION_PROMPTS: Record<string, string> = {
        where_we_are: `Write the "Where we are" section (2-3 paragraphs, ~200 words). Cover: the scale and shape of the org, the current HR function and systems, the pressure points (what's slow, expensive, or broken), and why AI is relevant now. Use first-person plural ("we", "our"). Be specific — name the sector, headcount, key metrics. No bullet lists in the prose.`,
        where_going: `Write the "Where we're going" section (3-4 paragraphs, ~250 words). Cover: the ambition in a single plain-language sentence, the 3-5 guiding principles (weave them into prose, don't list them), and the human outcomes we're aiming for. Use first-person plural. Reference the vision statement provided.`,
        what_well_do: `Write the "What we'll do" section (4-5 paragraphs, ~350 words). Structure: brief framing of phases, then one paragraph per phase (Foundation, Build, Scale, Optimise). Name each initiative in plain English and give a sentence on why it's right for this org. Prose only — no bullet lists.`,
        success_measures: `Write the "How we'll know it's working" section (2-3 paragraphs + 3-5 specific outcomes, ~200 words). Lead with how the CPO will know the strategy is working. Make each outcome concrete with a specific metric. Be honest about what's measurable now vs what needs new measurement.`,
        what_requires: `Write the "What this requires" section (2-3 paragraphs, ~180 words). Cover: the investment envelope (narrative, not a table), what it includes (vendor costs, internal capacity), and the key dependencies (sponsorship, change capacity, technical readiness). Light framing only — not a budget breakdown.`,
        what_wont_do: `Write the "What we won't do" section (1 paragraph + 3-5 explicit exclusions, ~150 words). List specific non-commitments with brief reasoning. Show the strategy is chosen, not maximalist.`,
        exec_summary: `Write the executive summary (1 paragraph, 80-120 words). Structure: situation → ambition → approach → confidence. Distil the whole document into a single paragraph a CEO could read in 30 seconds. Use first-person plural.`,
      };

      const SECTION_TITLES: Record<string, string> = {
        exec_summary: "Executive summary",
        where_we_are: "Where we are",
        where_going: "Where we're going",
        what_well_do: "What we'll do",
        success_measures: "How we'll know it's working",
        what_requires: "What this requires",
        what_wont_do: "What we won't do",
      };

      const systemPrompt = `You are drafting a section of an AI strategy document for the CPO of a ${row.sector ?? "large"} organisation. Write in first-person plural ("we", "our"). Be specific, grounded, and direct. Avoid consultant-speak: do not use words like "leverage", "synergy", "transformative", "game-changing", "holistic", "robust", "empower", "best practice", "ROI", "talent pipeline", "future-proof", "operational excellence", or "best-in-class". Write in plain English. No bullet lists in prose sections. Length targets are approximate — quality over quantity.`;

      const userPrompt = `${SECTION_PROMPTS[input.sectionId]}\n\nOrg context:\n${orgCtx}\n\nVision statement: ${vision}\n\nGuiding principles:\n${principlesList}\n\nSelected initiatives by phase:\n${initiativeSummary}\n\nEstimated investment: ${fmtCost(totalCostLow)}–${fmtCost(totalCostHigh)} (year 1)\n\nOutcomes:\n${outcomesList}\n\nWhat we won't do:\n${wontDoList}\n\nReturn only the prose text for this section. No headers, no markdown formatting, no preamble.`;

      const resp = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const rawContent = resp?.choices?.[0]?.message?.content ?? "";
      const content: string = typeof rawContent === "string" ? rawContent : (Array.isArray(rawContent) ? (rawContent as Array<{text?: string} | string>).map(c => (typeof c === "string" ? c : (c as any)?.text ?? "")).join("") : "");
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned empty content" });

      const existingDraft = parse((row as any).strategyDraftJson) ?? { sections: [], generatedAt: null, lockedSections: [] };
      const sections: Array<{ id: string; title: string; content: string; generatedAt: number; version: number; lockedAt?: number }> = existingDraft.sections ?? [];
      const idx = sections.findIndex((s: any) => s.id === input.sectionId);
      const newSection = {
        id: input.sectionId,
        title: SECTION_TITLES[input.sectionId],
        content,
        generatedAt: Date.now(),
        version: idx >= 0 ? (sections[idx].version ?? 0) + 1 : 1,
      };
      if (idx >= 0) sections[idx] = newSection;
      else sections.push(newSection);

      const updatedDraft = { ...existingDraft, sections, generatedAt: Date.now() };
      await db.update(ailOrgContext)
        .set({ strategyDraftJson: JSON.stringify(updatedDraft) } as any)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

      return { sectionId: input.sectionId, content, title: SECTION_TITLES[input.sectionId] };
    }),

  /**
   * Save an edited section of the strategy draft.
   */
  saveStrategyDraftSection: protectedProcedure
    .input(z.object({
      sectionId: z.enum(["exec_summary", "where_we_are", "where_going", "what_well_do", "success_measures", "what_requires", "what_wont_do"]),
      content: z.string().max(10000),
      locked: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select({ strategyDraftJson: (ailOrgContext as any).strategyDraftJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      const parse = (j: string | null | undefined) => { try { return j ? JSON.parse(j) : null; } catch { return null; } };
      const existingDraft = parse((rows[0] as any)?.strategyDraftJson) ?? { sections: [], generatedAt: null, lockedSections: [] };
      const sections: Array<{ id: string; title: string; content: string; generatedAt: number; version: number; lockedAt?: number }> = existingDraft.sections ?? [];
      const lockedSections: string[] = existingDraft.lockedSections ?? [];
      const idx = sections.findIndex((s: any) => s.id === input.sectionId);
      const existing = idx >= 0 ? sections[idx] : null;
      const updated = {
        id: input.sectionId,
        title: existing?.title ?? input.sectionId,
        content: input.content,
        generatedAt: existing?.generatedAt ?? Date.now(),
        version: existing?.version ?? 1,
        lockedAt: input.locked ? Date.now() : existing?.lockedAt,
      };
      if (idx >= 0) sections[idx] = updated;
      else sections.push(updated);
      if (input.locked === true && !lockedSections.includes(input.sectionId)) {
        lockedSections.push(input.sectionId);
      } else if (input.locked === false) {
        const li = lockedSections.indexOf(input.sectionId);
        if (li >= 0) lockedSections.splice(li, 1);
      }
      const updatedDraft = { ...existingDraft, sections, lockedSections };
      await db.update(ailOrgContext)
        .set({ strategyDraftJson: JSON.stringify(updatedDraft) } as any)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { success: true };
    }),

  /**
   * Generate a business case narrative for Stage 7.
   * Uses Vision + Strategy + Principles + selected initiatives + cost/value envelope.
   */
  generateBusinessCaseNarrative: protectedProcedure
    .input(z.object({
      orgName: z.string().optional(),
      sector: z.string().optional(),
      headcount: z.number().optional(),
      vision: z.string().optional(),
      strategy: z.string().optional(),
      archetype: z.string().optional(),
      principles: z.array(z.string()).optional(),
      selectedInitiatives: z.array(z.string()).optional(),
      totalCostLow: z.number().optional(),
      totalCostHigh: z.number().optional(),
      totalValueLow: z.number().optional(),
      totalValueHigh: z.number().optional(),
      topRisks: z.array(z.string()).optional(),
      keyDependencies: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const fmt = (n: number | undefined) => n ? `£${(n / 1000).toFixed(1)}M` : "N/A";
      const VOCAB_BLACKLIST = [
        "leverage", "synergy", "synergise", "synergize", "strategic imperative",
        "best-in-class", "cutting-edge", "holistic", "transformative", "game-changing",
        "ROI", "human capital", "bandwidth", "ecosystem", "deliverables",
      ];
      const systemPrompt = [
        "You are drafting the business case section of an HR AI strategy document, written for the CEO and board.",
        "The case should be 400–600 words. It should reference specific numbers, specific risks, and specific business outcomes.",
        "It should NOT be defensive or hedging. Write in plain, direct English.",
        `FORBIDDEN WORDS — never use these: ${VOCAB_BLACKLIST.join(", ")}.`,
        "Open with why this matters now, then the approach, then the investment, then the value, then the risks honestly stated. Close with the ask of the board.",
        "Return ONLY the narrative text. No headings, no markdown fences, no preamble.",
      ].join(" ");
      const userPrompt = [
        input.orgName ? `Organisation: ${input.orgName}` : "",
        input.sector ? `Sector: ${input.sector}` : "",
        input.headcount ? `Headcount: ~${input.headcount.toLocaleString()}` : "",
        input.vision ? `Vision: ${input.vision}` : "",
        input.strategy ? `Strategy: ${input.strategy}` : "",
        input.archetype ? `Archetype: ${input.archetype}` : "",
        input.principles?.length ? `Principles (top 3): ${input.principles.slice(0, 3).join(" | ")}` : "",
        input.selectedInitiatives?.length ? `Selected initiatives: ${input.selectedInitiatives.join(", ")}` : "",
        `Total 3-year cost: ${fmt(input.totalCostLow)}–${fmt(input.totalCostHigh)}`,
        `Estimated 3-year value: ${fmt(input.totalValueLow)}–${fmt(input.totalValueHigh)}`,
        input.topRisks?.length ? `Top risks: ${input.topRisks.join(" | ")}` : "",
        input.keyDependencies?.length ? `Key dependencies: ${input.keyDependencies.join(" | ")}` : "",
        "Draft the business case narrative.",
      ].filter(Boolean).join("\n");
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const text = (response as any)?.choices?.[0]?.message?.content ?? "";
      return { text: typeof text === "string" ? text.trim() : "" };
    }),

  /**
   * Transform text using AI — supports Expand / Refine / Challenge / Suggest actions.
   * Used by the AITextActions component for inline AI editing.
   */
  transformText: protectedProcedure
    .input(z.object({
      text: z.string().min(1).max(5000),
      action: z.enum(["expand", "refine", "challenge", "suggest"]),
      stage: z.enum(["vision", "strategy_statement", "principle", "wont_do", "general", "business_case", "capability_narrative"]),
      orgContext: z.object({
        sector: z.string().optional(),
        headcount: z.number().optional(),
        strategyArchetype: z.string().optional(),
        visionStatement: z.string().optional(),
      }).optional(),
      additionalContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { text, action, stage, orgContext, additionalContext } = input;

      const stageDescriptions: Record<string, string> = {
        vision: "an HR AI strategy vision statement",
        strategy_statement: "an HR AI strategy statement",
        principle: "a guiding principle for an HR AI strategy",
        wont_do: "a strategic exclusion (what we won't do) for an HR AI strategy",
        general: "strategic text for an HR AI strategy",
        business_case: "a board-ready business case narrative for an HR AI strategy",
        capability_narrative: "a capability delivery narrative for an HR AI strategy",
      };

      const actionInstructions: Record<string, string> = {
        expand: "Expand this text by adding more specific detail, concrete examples, or measurable outcomes. Keep the same core intent. Return only the expanded text, no preamble.",
        refine: "Refine this text to be sharper, more specific, and less vague. Remove generic phrases and replace with concrete language. Return only the refined text, no preamble.",
        challenge: "Rewrite this text to be more ambitious, bold, or contrarian. Push the thinking further. Return only the rewritten text, no preamble.",
        suggest: "Generate a fresh alternative to this text that takes a different angle or framing. Keep the same purpose but offer a genuinely different perspective. Return only the new text, no preamble.",
      };

      const orgCtxParts: string[] = [];
      if (orgContext?.sector) orgCtxParts.push(`Sector: ${orgContext.sector}`);
      if (orgContext?.headcount) orgCtxParts.push(`Headcount: ${orgContext.headcount.toLocaleString()}`);
      if (orgContext?.strategyArchetype) orgCtxParts.push(`Strategy archetype: ${orgContext.strategyArchetype}`);
      if (orgContext?.visionStatement) orgCtxParts.push(`Vision: ${orgContext.visionStatement}`);
      const orgCtxStr = orgCtxParts.join(". ");

      const VOCAB_BLACKLIST = [
        "leverage", "synergy", "synergise", "synergize", "strategic imperative",
        "best-in-class", "cutting-edge", "holistic", "transformative", "game-changing",
        "ROI", "human capital", "bandwidth", "ecosystem", "deliverables",
      ];

      const systemPrompt = [
        `You are an expert HR strategy consultant helping a CPO refine ${stageDescriptions[stage] ?? "strategic text"}.`,
        orgCtxStr ? `Organisation context: ${orgCtxStr}.` : "",
        additionalContext ?? "",
        actionInstructions[action],
        `FORBIDDEN WORDS — never use these in your output: ${VOCAB_BLACKLIST.join(", ")}.`,
        "Return ONLY the transformed text. No explanations, no preamble, no markdown fences.",
      ].filter(Boolean).join(" ");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
      });

      const resultText = (response as any)?.choices?.[0]?.message?.content ?? text;
      return { text: typeof resultText === "string" ? resultText.trim() : text };
    }),

  /**
   * Get the Stage 8 capability assessment for the current tenant.
   */
  getCapabilityAssessment: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({ stage8CapabilityJson: ailOrgContext.stage8CapabilityJson })
      .from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    if (!rows[0]) return null;
    const parse = (j: string | null) => { try { return j ? JSON.parse(j) : null; } catch { return null; } };
    return parse(rows[0].stage8CapabilityJson);
  }),

  /**
   * Save (auto-save) the Stage 8 capability assessment draft.
   */
  saveCapabilityAssessment: protectedProcedure
    .input(z.object({ capabilityJson: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(ailOrgContext)
        .set({ stage8CapabilityJson: input.capabilityJson, updatedAt: new Date() })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { ok: true };
    }),

  /**
   * Suggest tactics to close a capability gap for a specific dimension.
   */
  suggestCapabilityTactics: protectedProcedure
    .input(z.object({
      dimension: z.enum(["skills", "capacity", "changeReadiness", "vendorEcosystem"]),
      current: z.number().int().min(1).max(5),
      needed: z.number().int().min(1).max(5),
      sector: z.string().optional(),
      ambitionTier: z.enum(["cautious", "progressive", "transformative"]).optional(),
      selectedInitiatives: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const DIMENSION_LABELS: Record<string, string> = {
        skills: "HR team AI skills and literacy",
        capacity: "HR team capacity and headcount",
        changeReadiness: "organisational change readiness",
        vendorEcosystem: "vendor and partner ecosystem",
      };
      const VOCAB_BLACKLIST = [
        "leverage", "synergy", "synergise", "synergize", "strategic imperative",
        "best-in-class", "cutting-edge", "holistic", "transformative", "game-changing",
        "ROI", "human capital", "bandwidth", "ecosystem", "deliverables",
      ];
      const gap = input.needed - input.current;
      const dimLabel = DIMENSION_LABELS[input.dimension] ?? input.dimension;
      const ctxParts = [
        input.sector ? `Sector: ${input.sector}` : "",
        input.ambitionTier ? `Ambition tier: ${input.ambitionTier}` : "",
        input.selectedInitiatives?.length ? `Selected initiatives: ${input.selectedInitiatives.slice(0, 8).join(", ")}` : "",
      ].filter(Boolean).join(". ");
      const systemPrompt = [
        `You are an expert HR transformation consultant advising a CPO on how to close a capability gap.`,
        ctxParts ? `Context: ${ctxParts}.` : "",
        `The CPO has rated their current ${dimLabel} as ${input.current}/5 and needs ${input.needed}/5 for their strategy — a gap of ${gap} point${gap !== 1 ? "s" : ""}.`,
        `Generate 3–5 specific, actionable tactics to close this gap. Each tactic should be a single sentence (max 20 words). Return as a JSON array of strings.`,
        `FORBIDDEN WORDS — never use these: ${VOCAB_BLACKLIST.join(", ")}.`,
        `Return ONLY the JSON array, no preamble, no markdown fences.`,
      ].filter(Boolean).join(" ");
      const response = await invokeLLM({
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Suggest tactics to close the ${dimLabel} gap.` }],
      });
      const raw = (response as any)?.choices?.[0]?.message?.content ?? "[]";
      let tactics: string[] = [];
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw.trim() : "[]");
        tactics = Array.isArray(parsed) ? parsed.filter((t: unknown) => typeof t === "string") : [];
      } catch { tactics = []; }
      return { tactics };
    }),

  /**
   * Generate a 400-word delivery narrative for Stage 8.
   */
  generateCapabilityNarrative: protectedProcedure
    .input(z.object({
      capabilityData: z.object({
        skills: z.object({ current: z.number(), needed: z.number(), tactics: z.array(z.string()) }).optional(),
        capacity: z.object({ current: z.number(), needed: z.number(), tactics: z.array(z.string()) }).optional(),
        changeReadiness: z.object({ current: z.number(), needed: z.number(), tactics: z.array(z.string()) }).optional(),
        vendorEcosystem: z.object({ current: z.number(), needed: z.number(), tactics: z.array(z.string()) }).optional(),
      }),
      sector: z.string().optional(),
      ambitionTier: z.enum(["cautious", "progressive", "transformative"]).optional(),
      selectedInitiatives: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const VOCAB_BLACKLIST = [
        "leverage", "synergy", "synergise", "synergize", "strategic imperative",
        "best-in-class", "cutting-edge", "holistic", "transformative", "game-changing",
        "ROI", "human capital", "bandwidth", "ecosystem", "deliverables",
      ];
      const SCALE_LABELS: Record<number, string> = { 1: "significant gap", 2: "below requirement", 3: "adequate", 4: "strong", 5: "exceptional" };
      const dims = [
        { key: "skills", label: "HR team AI skills", data: input.capabilityData.skills },
        { key: "capacity", label: "HR team capacity", data: input.capabilityData.capacity },
        { key: "changeReadiness", label: "change readiness", data: input.capabilityData.changeReadiness },
        { key: "vendorEcosystem", label: "vendor ecosystem", data: input.capabilityData.vendorEcosystem },
      ].filter(d => d.data);
      const dimSummary = dims.map(d => {
        const gap = (d.data!.needed - d.data!.current);
        const gapStr = gap > 0 ? `gap of ${gap}` : gap < 0 ? "ahead of requirement" : "at requirement";
        const tactics = d.data!.tactics.length ? `Tactics: ${d.data!.tactics.join("; ")}` : "No tactics listed";
        return `${d.label}: current ${SCALE_LABELS[d.data!.current] ?? d.data!.current}/5, needed ${SCALE_LABELS[d.data!.needed] ?? d.data!.needed}/5 (${gapStr}). ${tactics}.`;
      }).join(" ");
      const ctxParts = [
        input.sector ? `Sector: ${input.sector}` : "",
        input.ambitionTier ? `Ambition tier: ${input.ambitionTier}` : "",
        input.selectedInitiatives?.length ? `Selected initiatives: ${input.selectedInitiatives.slice(0, 8).join(", ")}` : "",
      ].filter(Boolean).join(". ");
      const systemPrompt = [
        `You are an expert HR transformation consultant writing a delivery capability narrative for a CPO's AI strategy.`,
        ctxParts ? `Context: ${ctxParts}.` : "",
        `Capability assessment: ${dimSummary}`,
        `Write a 400-word narrative (no more than 450 words) that: (1) honestly acknowledges the current capability gaps, (2) explains how the listed tactics will close each gap, (3) gives the CPO and board confidence that the strategy is executable. Write in first-person plural ("we"). Be specific and concrete — no vague reassurances.`,
        `FORBIDDEN WORDS — never use these: ${VOCAB_BLACKLIST.join(", ")}.`,
        `Return ONLY the narrative text. No headings, no bullet points, no preamble.`,
      ].filter(Boolean).join(" ");
      const response = await invokeLLM({
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Generate the delivery capability narrative." }],
      });
      const text = (response as any)?.choices?.[0]?.message?.content ?? "";
      return { text: typeof text === "string" ? text.trim() : "" };
    }),

  // ─── Stage 9: Review session ──────────────────────────────────────────────────

  /** Generate tensions/hard questions for the review session */
  generateReviewTensions: protectedProcedure
    .input(z.object({
      strategyStatement: z.string().optional(),
      strategyArchetype: z.string().optional(),
      selectedInitiatives: z.array(z.string()).optional(),
      outcomesJson: z.string().optional(),
      businessCaseNarrative: z.string().optional(),
      capabilityJson: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const VOCAB_BLACKLIST = [
        "leverage", "synergy", "paradigm shift", "best-in-class", "world-class",
        "cutting-edge", "state-of-the-art", "game-changing", "revolutionary",
        "disruptive", "holistic", "robust", "scalable", "agile", "innovative",
        "transformative", "seamless", "ecosystem", "stakeholder alignment",
        "value-add", "low-hanging fruit", "move the needle", "boil the ocean",
        "circle back", "deep dive", "bandwidth", "ideate", "learnings",
      ];
      const ctxParts = [
        input.strategyStatement ? `Strategy statement: ${input.strategyStatement}` : "",
        input.strategyArchetype ? `Archetype: ${input.strategyArchetype}` : "",
        input.selectedInitiatives?.length ? `Initiatives: ${input.selectedInitiatives.slice(0, 8).join(", ")}` : "",
        input.businessCaseNarrative ? `Business case: ${input.businessCaseNarrative.slice(0, 500)}` : "",
      ].filter(Boolean).join(". ");
      const systemPrompt = [
        `You are a senior board advisor preparing a CPO for a strategy review session.`,
        `Context: ${ctxParts}`,
        `Generate exactly 5 tensions or hard questions that a board member or CEO might raise about this AI HR strategy.`,
        `Each tension should: (1) be grounded in the specific strategy content, (2) be genuinely challenging — not softballs, (3) include a suggested talking point the CPO could use to address it.`,
        `FORBIDDEN WORDS — never use these: ${VOCAB_BLACKLIST.join(", ")}.`,
        `Return JSON object with key "tensions" containing array of exactly 5 items: [{"title":"...","description":"...","talkingPoint":"..."}].`,
      ].filter(Boolean).join(" ");
      const response = await invokeLLM({
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Generate the 5 tensions." }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "review_tensions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                tensions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      talkingPoint: { type: "string" },
                    },
                    required: ["title", "description", "talkingPoint"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["tensions"],
              additionalProperties: false,
            },
          },
        },
      });
      const raw = (response as any)?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
        return { tensions: (parsed.tensions ?? []) as Array<{ title: string; description: string; talkingPoint: string }> };
      } catch {
        return { tensions: [] as Array<{ title: string; description: string; talkingPoint: string }> };
      }
    }),

  /** Get review session state */
  getReviewSession: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db.select({
        reviewHeldAt: ailOrgContext.reviewHeldAt,
        reviewSessionNotes: ailOrgContext.reviewSessionNotes,
        reviewTensionsJson: ailOrgContext.reviewTensionsJson,
        stage9ConfirmedAt: ailOrgContext.stage9ConfirmedAt,
        strategyStatement: ailOrgContext.strategyStatement,
        strategyArchetype: ailOrgContext.strategyArchetype,
        selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
        outcomesJson: ailOrgContext.outcomesJson,
        businessCaseNarrative: ailOrgContext.businessCaseNarrative,
        stage8CapabilityJson: ailOrgContext.stage8CapabilityJson,
      }).from(ailOrgContext).where(eq(ailOrgContext.tenantId, ctx.user.tenantId)).limit(1);
      return row ?? null;
    }),

  /** Save review session notes and tensions */
  saveReviewSession: protectedProcedure
    .input(z.object({
      reviewSessionNotes: z.string().optional(),
      reviewTensionsJson: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const updates: Record<string, unknown> = {};
      if (input.reviewSessionNotes !== undefined) updates.reviewSessionNotes = input.reviewSessionNotes;
      if (input.reviewTensionsJson !== undefined) updates.reviewTensionsJson = input.reviewTensionsJson;
      if (Object.keys(updates).length === 0) return { success: true };
      await db.update(ailOrgContext).set(updates).where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { success: true };
    }),

  // ─── Stage 10: Board report ───────────────────────────────────────────────────

  /** Get board report state */
  getBoardReport: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db.select({
        boardReportSectionsJson: ailOrgContext.boardReportSectionsJson,
        boardReportIncludeNotes: ailOrgContext.boardReportIncludeNotes,
        stage10ConfirmedAt: ailOrgContext.stage10ConfirmedAt,
        reviewSessionNotes: ailOrgContext.reviewSessionNotes,
      }).from(ailOrgContext).where(eq(ailOrgContext.tenantId, ctx.user.tenantId)).limit(1);
      return row ?? null;
    }),

  /** Update a single board report section (manual edit) */
  saveBoardReportSection: protectedProcedure
    .input(z.object({
      sectionId: z.enum(["context", "strategic_direction", "initiative_portfolio", "investment_case", "capability_readiness", "governance"]),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const [row] = await db.select({ boardReportSectionsJson: ailOrgContext.boardReportSectionsJson })
        .from(ailOrgContext).where(eq(ailOrgContext.tenantId, ctx.user.tenantId)).limit(1);
      let sectionsMap: Record<string, unknown> = {};
      try { sectionsMap = row?.boardReportSectionsJson ? JSON.parse(row.boardReportSectionsJson) : {}; } catch { sectionsMap = {}; }
      const existing = (sectionsMap[input.sectionId] as Record<string, unknown>) ?? {};
      const wordCount = input.content.split(/\s+/).filter(Boolean).length;
      sectionsMap[input.sectionId] = {
        ...existing,
        content: input.content,
        editedAt: Date.now(),
        isAiGenerated: false,
        wordCount,
      };
      await db.update(ailOrgContext)
        .set({ boardReportSectionsJson: JSON.stringify(sectionsMap) })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { success: true };
    }),

  /** Toggle lock on a board report section */
  toggleBoardReportSectionLock: protectedProcedure
    .input(z.object({
      sectionId: z.enum(["context", "strategic_direction", "initiative_portfolio", "investment_case", "capability_readiness", "governance"]),
      locked: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const [row] = await db.select({ boardReportSectionsJson: ailOrgContext.boardReportSectionsJson })
        .from(ailOrgContext).where(eq(ailOrgContext.tenantId, ctx.user.tenantId)).limit(1);
      let sectionsMap: Record<string, unknown> = {};
      try { sectionsMap = row?.boardReportSectionsJson ? JSON.parse(row.boardReportSectionsJson) : {}; } catch { sectionsMap = {}; }
      const existing = (sectionsMap[input.sectionId] as Record<string, unknown>) ?? {};
      sectionsMap[input.sectionId] = {
        ...existing,
        lockedAt: input.locked ? Date.now() : null,
      };
      await db.update(ailOrgContext)
        .set({ boardReportSectionsJson: JSON.stringify(sectionsMap) })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { success: true };
    }),

  /** Update board report include-notes preference */
  saveBoardReportPreferences: protectedProcedure
    .input(z.object({
      includeNotes: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(ailOrgContext)
        .set({ boardReportIncludeNotes: input.includeNotes })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { success: true };
    }),
});
