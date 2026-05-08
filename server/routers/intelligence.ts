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
      selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
      wontDoJson: ailOrgContext.wontDoJson,
      provenanceJson: ailOrgContext.provenanceJson,
      libraryVersion: ailOrgContext.libraryVersion,
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
    }).from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    const row = rows[0] ?? null;
    if (!row) return { completed: false, aspirationAnswers: null, hrRoleAnswers: null, visionStatement: null, guidingPrinciples: null, completedAt: null, businessAmbitionLevel: null, peopleAmbitionLevel: null, selectedInitiativeIds: [] as string[] };
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
      wontDo: parse((row as Record<string, unknown>).wontDoJson as string | null) as string[] | null,
      structuredInputs: parse((row as Record<string, unknown>).structuredInputsJson as string | null),
      operationalBaseline: parse((row as Record<string, unknown>).operationalBaselineJson as string | null),
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
   * P1.1 — Generate vision with quality gate (retry + forbidden phrase check + wontDo).
   * Replaces the bare generateVisionAndPrinciples call.
   */
  generateVisionWithQualityGate: protectedProcedure
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
      return generateVisionWithQualityGate(input);
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
        input.solutionDeliveryConfidence
      ) as ValueEnvelope;
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
