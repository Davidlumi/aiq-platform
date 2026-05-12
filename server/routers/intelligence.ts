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
      guidingPrinciplesJson: ailOrgContext.guidingPrinciplesJson,
      strategyAssessmentCompletedAt: ailOrgContext.strategyAssessmentCompletedAt,
      businessAmbitionLevel: ailOrgContext.businessAmbitionLevel,
      peopleAmbitionLevel: ailOrgContext.peopleAmbitionLevel,
      selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
      wontDoJson: ailOrgContext.wontDoJson,
      commitmentsJson: ailOrgContext.commitmentsJson,
      structuredInputsJson: ailOrgContext.structuredInputsJson,
      operationalBaselineJson: ailOrgContext.operationalBaselineJson,
    }).from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    const row = rows[0] ?? null;
    if (!row) return { completed: false, aspirationAnswers: null, hrRoleAnswers: null, visionStatement: null, guidingPrinciples: null, completedAt: null, businessAmbitionLevel: null, peopleAmbitionLevel: null, selectedInitiativeIds: [] as string[], commitments: null as string[] | null };
    const parse = (j: string | null) => { try { return j ? JSON.parse(j) : null; } catch { return null; } };
    return {
      completed: !!row.strategyAssessmentCompletedAt,
      aspirationAnswers: parse(row.aspirationAnswersJson),
      hrRoleAnswers: parse(row.hrRoleAnswersJson),
      visionStatement: row.visionStatement ?? null,
      guidingPrinciples: parse(row.guidingPrinciplesJson) as Array<{ title: string; description: string }> | null,
      completedAt: row.strategyAssessmentCompletedAt ?? null,
      businessAmbitionLevel: row.businessAmbitionLevel ?? null,
      peopleAmbitionLevel: row.peopleAmbitionLevel ?? null,
      selectedInitiativeIds: (parse(row.selectedInitiativesJson) as string[] ?? []),
      wontDo: parse(row.wontDoJson ?? null) as string[] | null,
      commitments: parse(row.commitmentsJson ?? null) as string[] | null,
      structuredInputs: parse(row.structuredInputsJson ?? null),
      operationalBaseline: parse(row.operationalBaselineJson ?? null),
    };
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
    // Get the tenant's strategy context to find selectedInitiativeIds
    const ctxRows = await db.select({
      selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
    }).from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    if (!ctxRows[0]) return [];
    let selectedIds: string[] = [];
    try { selectedIds = JSON.parse(ctxRows[0].selectedInitiativesJson ?? "[]") as string[]; } catch {}
    if (!selectedIds.length) return [];
    // Fetch all library entries for selected IDs
    const libRows = await db.select().from(strategyInitiativeLibrary);
    const libMap = new Map(libRows.map(r => [r.id, r]));
    // Fetch per-initiative state rows for this tenant's users' strategies
    // We use a simple approach: get all strategyInitiatives rows where initiativeId is in selectedIds
    // and the strategy belongs to this tenant (via ailOrgContext)
    // Since strategyInitiatives is linked to a strategyId (from the strategies table),
    // we fall back to returning library data with null state for now if no rows exist.
    // The Plan page will upsert state rows on first status/phase edit.
    const stateRows = await db.select().from(strategyInitiatives)
      .where(eq(strategyInitiatives.strategyId, ctx.user.tenantId)); // use tenantId as strategyId proxy for AIL context
    const stateMap = new Map(stateRows.map(r => [r.initiativeId, r]));
    return selectedIds.map(id => {
      const lib = libMap.get(id);
      const state = stateMap.get(id);
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
        visionStatement: ctx2.visionStatement ?? null,
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
      const systemPrompt = `You are generating talking points a CPO will use to brief their CEO about an HR AI strategy. Each bullet must be a data-grounded brief, not a paraphrase of the strategy's topic.

REQUIREMENTS:
- 3-5 bullets total. Choose 3 for simple strategies, up to 5 for complex ones with multiple material dependencies.
- Each bullet: 20-35 words, plain English, speakable aloud.
- EVERY bullet must contain at least one specific number, date, or named entity from the strategy data: capability score, gap points, initiative count, timeline in months, phase name, value range, cost range, named regulation, named dependency, named ambition tier.
- Bullet 1 must open with the vision (quoted directly or tightly paraphrased), tied to capability state.
- Vary sentence starters. Do not start multiple bullets with "We're..." or "This strategy...".
- Honest about uncertainty (use "indicative", "confirm with Finance" where appropriate).
- Executive sponsorship recommendation, if needed, goes in bullet 6 or is omitted — never bullet 4.

COVERAGE ORDER (when applicable):
1. Vision lead — opens the brief with the user's vision
2. Capability state — score, gap, what's needed
3. Strategy summary — initiative count, timeline, current phase
4. Value vs cost — estimated + range, with caveats
5. Key dependency — named, with action required
6. Optional: second dependency or executive sponsorship

ANTI-PATTERN (do not generate output like this):
"We're building an AI-fluent HR function, integrating AI into critical people processes over the next 18 months to reduce admin burden and enhance employee experience."
— generic prose, paraphrased from topic, no specific numbers, could apply to any HR AI strategy.

GOOD PATTERN:
"Our vision: transform the retail experience and internal operations through AI, reducing administrative burden and enabling HR to operate as strategic partners."
"Acme has built foundational HR capability at 5.2/10. A 2.1-point gap separates us from the 7.3 needed to deliver our Transformative ambition."

Return format: JSON array of 3-6 strings, no other text.`;
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
      } catch {
        const capScore = (ctx2.ambitionTargetScore ?? 55) / 10;
        const leadClause = capScore < 3.1 ? `${promptData.orgName} is in the early stages of HR capability build.`
          : capScore < 5.6 ? `${promptData.orgName} has built foundational HR capability.`
          : capScore < 7.6 ? `${promptData.orgName} has solid HR capability across most domains.`
          : `${promptData.orgName} has mature HR capability.`;
        bullets = [
          leadClause,
          `This strategy closes the capability gap through ${promptData.initiativeCount} initiatives over ${promptData.timelineMonths} months. Foundation phase is active.`,
          `Indicative cost and value estimates are available in the Investment & Risk and Value sections. Confirm with Finance before committing.`,
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
      const payload = JSON.stringify({ bullets: input.bullets, generatedAt: Date.now(), userEdited: input.userEdited, strategyHash });
      await db.update(ailOrgContext)
        .set({ leadershipTalkingPointsJson: payload })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { success: true };
    }),
});
