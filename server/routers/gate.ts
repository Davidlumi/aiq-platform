/**
 * Gate Router — v4 Strategy Flow Stage Gate State Machine
 *
 * Manages the 11-stage gate state for the v4 strategy flow:
 *   Stage 1:  Data Input / Pre-work (validated by completePrework in backgroundInputs router)
 *   Stage 2:  Vision
 *   Stage 3:  Strategy
 *   Stage 4:  Principles + Won't Do (triggers engine re-fire)
 *   Stage 5:  Initiatives (plan curation)
 *   Stage 6:  Roadmap (NEW — horizons, initiative sequencing)
 *   Stage 7:  Success Measures (was Stage 6)
 *   Stage 8:  Capability & Risk (was Stage 8, now before Business Case)
 *   Stage 9:  Business Case (was Stage 7, now after Capability)
 *   Stage 10: Leadership Review (was Stage 9)
 *   Stage 11: Board Report (was Stage 10)
 *
 * Gate state is persisted in ailOrgContext.stageGateStateJson as:
 * {
 *   stage1: { completedAt: number | null, lastEditedAt: number | null },
 *   ...stage8: { completedAt: number | null, lastEditedAt: number | null },
 * }
 *
 * A stage is "cleared" when completedAt is set and lastEditedAt is null or < completedAt.
 * A stage is "edited after clearing" when lastEditedAt > completedAt.
 * A stage is "accessible" when the previous stage is cleared.
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { ailOrgContext, tenants, companyProfile, rewardPrework } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { evaluateAllInitiatives, evaluateAllInitiativesWithSemanticAlignment, type FitImpactEngineInputs } from "../services/fitImpactEngine";
import { computeAlignmentCacheKey } from "../services/semanticPrincipleAlignment";
import { invokeLLM } from "../_core/llm";
import { assertLLMRateLimit } from "../_core/llmRateLimit";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StageGateEntry = {
  completedAt: number | null;
  lastEditedAt: number | null;
};

export type StageGateState = {
  stage1: StageGateEntry;
  stage2: StageGateEntry;
  stage3: StageGateEntry;
  stage4: StageGateEntry;
  stage5: StageGateEntry;
  stage6: StageGateEntry;
  stage7: StageGateEntry;
  stage8: StageGateEntry;
  stage9: StageGateEntry;
  stage10: StageGateEntry;
  stage11: StageGateEntry;
};

export const DEFAULT_GATE_STATE: StageGateState = {
  stage1: { completedAt: null, lastEditedAt: null },
  stage2: { completedAt: null, lastEditedAt: null },
  stage3: { completedAt: null, lastEditedAt: null },
  stage4: { completedAt: null, lastEditedAt: null },
  stage5: { completedAt: null, lastEditedAt: null },
  stage6: { completedAt: null, lastEditedAt: null },
  stage7: { completedAt: null, lastEditedAt: null },
  stage8: { completedAt: null, lastEditedAt: null },
  stage9: { completedAt: null, lastEditedAt: null },
  stage10: { completedAt: null, lastEditedAt: null },
  stage11: { completedAt: null, lastEditedAt: null },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function freshEntry(): StageGateEntry {
  return { completedAt: null, lastEditedAt: null };
}
function parseGateState(json: string | null | undefined): StageGateState {
  const empty = () => ({ stage1: freshEntry(), stage2: freshEntry(), stage3: freshEntry(), stage4: freshEntry(), stage5: freshEntry(), stage6: freshEntry(), stage7: freshEntry(), stage8: freshEntry(), stage9: freshEntry(), stage10: freshEntry(), stage11: freshEntry() });
  if (!json) return empty();
  try {
    const parsed = JSON.parse(json) as Partial<StageGateState>;
    return {
      stage1: parsed.stage1 ? { ...parsed.stage1 } : freshEntry(),
      stage2: parsed.stage2 ? { ...parsed.stage2 } : freshEntry(),
      stage3: parsed.stage3 ? { ...parsed.stage3 } : freshEntry(),
      stage4: parsed.stage4 ? { ...parsed.stage4 } : freshEntry(),
      stage5: parsed.stage5 ? { ...parsed.stage5 } : freshEntry(),
      stage6: parsed.stage6 ? { ...parsed.stage6 } : freshEntry(),
      stage7: parsed.stage7 ? { ...parsed.stage7 } : freshEntry(),
      stage8: parsed.stage8 ? { ...parsed.stage8 } : freshEntry(),
      stage9: parsed.stage9 ? { ...parsed.stage9 } : freshEntry(),
      stage10: parsed.stage10 ? { ...parsed.stage10 } : freshEntry(),
      stage11: parsed.stage11 ? { ...parsed.stage11 } : freshEntry(),
    };
  } catch {
    return empty();
  }
}

function isStageCleared(entry: StageGateEntry): boolean {
  if (!entry.completedAt) return false;
  if (!entry.lastEditedAt) return true;
  return entry.completedAt >= entry.lastEditedAt;
}

function isStageEditedAfterClearing(entry: StageGateEntry): boolean {
  if (!entry.completedAt) return false;
  if (!entry.lastEditedAt) return false;
  return entry.lastEditedAt > entry.completedAt;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Peer Vision Library ──────────────────────────────────────────────────────
// Imported from shared library (seeded content)
import { PEER_VISION_LIBRARY } from "../../shared/peerVisionLibrary";
import { INITIATIVE_LIBRARY } from "../../shared/initiativeLibrary";

// ─── Router ───────────────────────────────────────────────────────────────────

export const gateRouter = router({
  /**
   * Get the current stage gate state for the tenant.
   * Also returns derived accessibility flags and upstream-edit flags.
   */
  getState: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const row = await db
        .select({
          stageGateStateJson: ailOrgContext.stageGateStateJson,
          preworkCompletedAt: ailOrgContext.preworkCompletedAt,
          visionStatement: ailOrgContext.visionStatement,
          visionConfirmedAt: ailOrgContext.visionConfirmedAt,
          visionInspirationSource: ailOrgContext.visionInspirationSource,
          strategyArchetype: ailOrgContext.strategyArchetype,
          strategyStatement: ailOrgContext.strategyStatement,
          strategyConfirmedAt: ailOrgContext.strategyConfirmedAt,
          stage4ConfirmedAt: ailOrgContext.stage4ConfirmedAt,
        })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);

      // Fetch tenant mode for mode-aware UI
      const tenantRow = await db.select({ mode: tenants.mode }).from(tenants).where(eq(tenants.id, ctx.user.tenantId)).limit(1);
      const tenantMode: "cpo" | "reward" = tenantRow[0]?.mode ?? "cpo";

      const orgCtx = row[0];
      if (!orgCtx) {
        return {
          gateState: parseGateState(null),
          isStage1Accessible: true,
          isStage2Accessible: false,
          isStage3Accessible: false,
          isStage4Accessible: false,
          isStage5Accessible: false,
          isStage6Accessible: false,
          isStage7Accessible: false,
          isStage8Accessible: false,
          isStage9Accessible: false,
          isStage10Accessible: false,
          isStage11Accessible: false,
          stage1Cleared: false, stage2Cleared: false, stage3Cleared: false, stage4Cleared: false,
          stage5Cleared: false, stage6Cleared: false, stage7Cleared: false, stage8Cleared: false,
          stage9Cleared: false, stage10Cleared: false, stage11Cleared: false,
          stage1EditedAfterClearing: false, stage2EditedAfterClearing: false,
          stage3EditedAfterClearing: false, stage4EditedAfterClearing: false,
          stage5EditedAfterClearing: false, stage6EditedAfterClearing: false,
          stage7EditedAfterClearing: false, stage8EditedAfterClearing: false,
          stage9EditedAfterClearing: false, stage10EditedAfterClearing: false,
          stage11EditedAfterClearing: false,
          visionStatement: null,
          visionInspirationSource: null,
          strategyArchetype: null,
          strategyStatement: null,
          tenantMode,
        };
      }

      const gateState = parseGateState(orgCtx.stageGateStateJson);

      // Stage 1 is cleared when prework is completed
      if (orgCtx.preworkCompletedAt && !gateState.stage1.completedAt) {
        gateState.stage1.completedAt = orgCtx.preworkCompletedAt.getTime();
      }

      const stage1Cleared = isStageCleared(gateState.stage1);
      const stage2Cleared = isStageCleared(gateState.stage2);
      const stage3Cleared = isStageCleared(gateState.stage3);
      const stage4Cleared = isStageCleared(gateState.stage4);
      const stage5Cleared = isStageCleared(gateState.stage5);
      const stage6Cleared = isStageCleared(gateState.stage6);
      const stage7Cleared = isStageCleared(gateState.stage7);
      const stage8Cleared = isStageCleared(gateState.stage8);
      const stage9Cleared = isStageCleared(gateState.stage9);
      const stage10Cleared = isStageCleared(gateState.stage10);
      const stage11Cleared = isStageCleared(gateState.stage11);

      // v4 11-stage unlock chain:
      // 1→2→3→4→5→6(Roadmap)→7(Measures)→8(Capability)→9(BusinessCase)→10(Review)→11(BoardReport)
      return {
        gateState,
        isStage1Accessible: true,
        isStage2Accessible: stage1Cleared,
        isStage3Accessible: stage2Cleared,
        isStage4Accessible: stage3Cleared,
        isStage5Accessible: stage4Cleared,
        isStage6Accessible: stage5Cleared,
        isStage7Accessible: stage6Cleared,
        isStage8Accessible: stage7Cleared,
        isStage9Accessible: stage8Cleared,
        isStage10Accessible: stage9Cleared,
        isStage11Accessible: stage10Cleared,
        stage1Cleared, stage2Cleared, stage3Cleared, stage4Cleared,
        stage5Cleared, stage6Cleared, stage7Cleared, stage8Cleared,
        stage9Cleared, stage10Cleared, stage11Cleared,
        stage1EditedAfterClearing: isStageEditedAfterClearing(gateState.stage1),
        stage2EditedAfterClearing: isStageEditedAfterClearing(gateState.stage2),
        stage3EditedAfterClearing: isStageEditedAfterClearing(gateState.stage3),
        stage4EditedAfterClearing: isStageEditedAfterClearing(gateState.stage4),
        stage5EditedAfterClearing: isStageEditedAfterClearing(gateState.stage5),
        stage6EditedAfterClearing: isStageEditedAfterClearing(gateState.stage6),
        stage7EditedAfterClearing: isStageEditedAfterClearing(gateState.stage7),
        stage8EditedAfterClearing: isStageEditedAfterClearing(gateState.stage8),
        stage9EditedAfterClearing: isStageEditedAfterClearing(gateState.stage9),
        stage10EditedAfterClearing: isStageEditedAfterClearing(gateState.stage10),
        stage11EditedAfterClearing: isStageEditedAfterClearing(gateState.stage11),
        visionStatement: orgCtx.visionStatement ?? null,
        visionInspirationSource: orgCtx.visionInspirationSource ?? null,
        strategyArchetype: orgCtx.strategyArchetype ?? null,
        strategyStatement: orgCtx.strategyStatement ?? null,
        tenantMode,
      };
    }),

  /**
   * Mark a stage as edited (sets lastEditedAt, which invalidates the gate).
   * Called whenever the CPO edits content in a cleared stage.
   */
  markEdited: protectedProcedure
    .input(z.object({
      stage: z.enum(["stage1", "stage2", "stage3", "stage4", "stage5", "stage6", "stage7", "stage8", "stage9", "stage10", "stage11"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const row = await db
        .select({ stageGateStateJson: ailOrgContext.stageGateStateJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const gateState = parseGateState(row[0].stageGateStateJson);
      gateState[input.stage].lastEditedAt = Date.now();

      await db.update(ailOrgContext)
        .set({ stageGateStateJson: JSON.stringify(gateState), updatedAt: new Date() })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

      return { ok: true };
    }),

  /**
   * Complete Stage 2 (Vision).
   * Validates: visionStatement exists and word count >= 10.
   * Sets visionConfirmedAt and clears stage2 gate.
   */
  completeStage2: protectedProcedure
    .input(z.object({
      visionStatement: z.string().min(1),
      visionInspirationSource: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const wordCount = countWords(input.visionStatement);
      if (wordCount < 10) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Vision must be at least 10 words (currently ${wordCount}).`,
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const row = await db
        .select({ stageGateStateJson: ailOrgContext.stageGateStateJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const gateState = parseGateState(row[0].stageGateStateJson);
      const now = Date.now();
      gateState.stage2.completedAt = now;
      gateState.stage2.lastEditedAt = null;

      await db.update(ailOrgContext)
        .set({
          visionStatement: input.visionStatement,
          visionConfirmedAt: new Date(),
          visionInspirationSource: input.visionInspirationSource ?? null,
          stageGateStateJson: JSON.stringify(gateState),
          updatedAt: new Date(),
        })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

      return { ok: true, gateState };
    }),

  /**
   * Complete Stage 3 (Strategy).
   * Validates: strategyArchetype set AND strategyStatement word count >= 15.
   * Sets strategyConfirmedAt and clears stage3 gate.
   */
  completeStage3: protectedProcedure
    .input(z.object({
      strategyArchetype: z.enum(["augmentation", "transformation", "differentiation", "efficiency", "defensive"]),
      strategyStatement: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const wordCount = countWords(input.strategyStatement);
      if (wordCount < 15) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Strategy statement must be at least 15 words (currently ${wordCount}).`,
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const row = await db
        .select({ stageGateStateJson: ailOrgContext.stageGateStateJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const gateState = parseGateState(row[0].stageGateStateJson);
      const now = Date.now();
      gateState.stage3.completedAt = now;
      gateState.stage3.lastEditedAt = null;

      await db.update(ailOrgContext)
        .set({
          strategyArchetype: input.strategyArchetype,
          strategyStatement: input.strategyStatement,
          strategyConfirmedAt: new Date(),
          stageGateStateJson: JSON.stringify(gateState),
          updatedAt: new Date(),
        })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

      return { ok: true, gateState };
    }),

  /**
   * Complete Stage 4 (Principles + Won't Do).
   * Validates: principles.length >= 3 AND wontDoItems.length >= 2.
   * Triggers engine re-fire with principle alignment scoring.
   * Sets stage4ConfirmedAt and clears stage4 gate.
   */
  completeStage4: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const row = await db
        .select({
          stageGateStateJson: ailOrgContext.stageGateStateJson,
          guidingPrinciplesJson: ailOrgContext.guidingPrinciplesJson,
          wontDoJson: ailOrgContext.wontDoJson,
          backgroundInputsJson: ailOrgContext.backgroundInputsJson,
          sectionIJson: ailOrgContext.sectionIJson,
          sectionKJson: ailOrgContext.sectionKJson,
          capabilityAssessmentJson: ailOrgContext.capabilityAssessmentJson,
          fitImpactResultsJson: ailOrgContext.fitImpactResultsJson,
          visionStatement: ailOrgContext.visionStatement,
          strategyArchetype: ailOrgContext.strategyArchetype,
          strategyStatement: ailOrgContext.strategyStatement,
          semanticAlignmentCacheKey: ailOrgContext.semanticAlignmentCacheKey,
          semanticAlignmentCacheJson: ailOrgContext.semanticAlignmentCacheJson,
        })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);

      const orgCtx = row[0];
      if (!orgCtx) throw new TRPCError({ code: "NOT_FOUND" });

      // Fetch tenant mode for engine filtering
      const tenantModeRow = await db.select({ mode: tenants.mode }).from(tenants).where(eq(tenants.id, ctx.user.tenantId)).limit(1);
      const tenantMode: "cpo" | "reward" = tenantModeRow[0]?.mode ?? "cpo";

      // Parse and validate principles
      let principles: Array<{ title: string; description: string }> = [];
      try {
        const raw = orgCtx.guidingPrinciplesJson ? JSON.parse(orgCtx.guidingPrinciplesJson) : [];
        principles = Array.isArray(raw) ? raw : [];
      } catch { /* empty */ }

      if (principles.length < 3) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `At least 3 guiding principles are required (currently ${principles.length}).`,
        });
      }

      // Parse and validate won't-do items
      let wontDoItems: Array<{ text: string }> = [];
      try {
        const raw = orgCtx.wontDoJson ? JSON.parse(orgCtx.wontDoJson) : [];
        wontDoItems = Array.isArray(raw) ? raw : [];
      } catch { /* empty */ }

      if (wontDoItems.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `At least 2 "What we won't do" items are required (currently ${wontDoItems.length}).`,
        });
      }

      // Re-fire the engine with principle alignment
      let updatedFitResultsJson: string | null = null;
      let updatedAlignmentCacheKey: string | undefined;
      let updatedAlignmentJson: string | undefined;
      try {
        const inputs = orgCtx.backgroundInputsJson ? JSON.parse(orgCtx.backgroundInputsJson) : {};
        const sectionI = orgCtx.sectionIJson ? JSON.parse(orgCtx.sectionIJson) : {};
        const sectionK = orgCtx.sectionKJson ? JSON.parse(orgCtx.sectionKJson) : {};
        const capAssessment = orgCtx.capabilityAssessmentJson ? JSON.parse(orgCtx.capabilityAssessmentJson) : {};

        // Fetch Company Profile and Reward Pre-work for engine context
        const [cpRow] = await db
          .select()
          .from(companyProfile)
          .where(eq(companyProfile.tenantId, ctx.user.tenantId));
        const [rpRow] = tenantMode === "reward" ? await db
          .select()
          .from(rewardPrework)
          .where(eq(rewardPrework.tenantId, ctx.user.tenantId)) : [null];

        const engineInputs: FitImpactEngineInputs = {
          sectionA: {
            totalHeadcount: inputs.sectionA?.totalHeadcount ?? (() => {
              const bandMap: Record<string, number> = { lt500: 250, "500_5k": 2750, "5k_25k": 15000, "25k_plus": 50000 };
              return bandMap[inputs.sectionA?.headcountBand ?? ""] ?? 0;
            })(),
            ukSitesCount: inputs.sectionA?.ukSitesCount,
            sectorSpecificRegulation: inputs.sectionA?.sectorSpecificRegulations ?? [],
            sectorSpecificRegulations: inputs.sectionA?.sectorSpecificRegulations ?? [],
            ownershipStructure: inputs.sectionA?.ownershipStructure ?? inputs.sectionA?.orgType,
            sector: inputs.sectionA?.sector,
          },
          sectionB: { hrSubFunctions: inputs.sectionB?.hrSubFunctions ?? [] },
          sectionC: {
            hrisSystem: inputs.sectionC?.hrisSystem,
            atsSystem: inputs.sectionC?.atsSystem,
            lmsSystem: inputs.sectionC?.lmsSystem,
            dataQualityRating: inputs.sectionC?.dataQualityRating,
            hrSystemIntegrationMaturity: inputs.sectionC?.hrSystemIntegrationMaturity,
            yearsOfHrisData: inputs.sectionC?.yearsOfHrisData,
            workforceDigitalAccess: inputs.sectionC?.workforceDigitalAccess,
            engagementSurveyTool: inputs.sectionC?.engagementSurveyTool,
          },
          sectionD: {
            annualHires: inputs.sectionD?.annualHiresLow,
            annualHiresHigh: inputs.sectionD?.annualHiresHigh,
            adminTimePerHire: inputs.sectionD?.adminTimePerHireHours,
            attritionRate: inputs.sectionD?.voluntaryAttritionPct,
            annualApplicationVolume: inputs.sectionD?.annualApplicationVolumeLow ?? inputs.sectionD?.annualApplicationVolumeHigh,
            annualApplicationVolumeHigh: inputs.sectionD?.annualApplicationVolumeHigh,
            costPerExternalHire: inputs.sectionD?.costPerExternalHire,
            monthlyHrQueryVolume: inputs.sectionD?.monthlyHrQueryVolumeLow ?? inputs.sectionD?.monthlyHrQueryVolumeHigh,
            annualLDSpend: inputs.sectionD?.annualLDSpend,
            annualRevenue: inputs.sectionD?.annualRevenue,
            currentEngagementScore: inputs.sectionD?.currentEngagementScore,
            hrFteCount: inputs.sectionB?.hrTeamSize,
            avgTimeToFill: inputs.sectionD?.avgTimeToFillDays,
          },
          sectionI: {
            workforceWorkType: sectionI.workforceWorkType,
            workforceComposition: sectionI.workforceComposition,
            workforceEmploymentMix: sectionI.workforceEmploymentMix,
            businessDirectionType: sectionI.businessDirectionType,
            geographicDistribution: sectionI.geographicDistribution,
            managerCapabilityForInsights: sectionI.managerCapabilityForInsights,
            skillsFrameworkStatus: sectionI.skillsFrameworkStatus,
            skillsInventoryCompleteness: sectionI.skillsInventoryCompleteness,
            pivotalJobFamilies: sectionI.pivotalJobFamilies,
            employeeExperienceState: sectionI.employeeExperienceState,
            frontlineHeadcountPercent: sectionI.frontlineHeadcountPercent,
            topBusinessPriorities: sectionI.topBusinessPriorities,
          },
          sectionK: {
            performanceReviewCadence: sectionK.performanceReviewCadence,
            internalMobilityApproach: sectionK.internalMobilityApproach,
            onboardingModel: sectionK.onboardingModel,
            hrHelpdeskModel: sectionK.hrHelpdeskModel,
            hiringProcessStructure: sectionK.hiringProcessStructure,
            hiringVolumeProfile: sectionK.hiringVolumeProfile,
            lAndDDeliveryModel: sectionK.lAndDDeliveryModel,
            rewardCycleModel: sectionK.rewardCycleModel,
          },
          sectionF: { changeReadiness: inputs.sectionF?.changeReadiness },
          sectionG: { ai_ethics_trust: capAssessment.ai_ethics_trust?.score },
          // Company Profile — shared org facts
          ...(cpRow ? {
            companyProfile: {
              sector: cpRow.sector ?? undefined,
              headcount: cpRow.headcount ?? undefined,
              geographicFootprint: cpRow.geographicFootprint ?? undefined,
              ownershipStructure: cpRow.ownershipStructure ?? undefined,
              businessAiAmbition: cpRow.businessAiAmbition ?? undefined,
              hris: cpRow.hris ?? undefined,
              workforceKnowledgePct: cpRow.workforceKnowledgePct ?? undefined,
              workforceFrontlinePct: cpRow.workforceFrontlinePct ?? undefined,
              annualPayrollCostGbp: cpRow.annualPayrollCostGbp ?? undefined,
              fcaSysc19InScope: cpRow.fcaSysc19InScope ?? undefined,
            },
          } : {}),
          // Reward Pre-work — Reward-mode-specific context
          ...(rpRow ? {
            rewardPrework: {
              rewardFunctionSize: rpRow.rewardFunctionSize ?? undefined,
              rewardFunctionMaturityRating: rpRow.rewardFunctionMaturityRating ?? undefined,
              aiMaturityInRewardToday: rpRow.aiMaturityInRewardToday ?? undefined,
              rewardAiAmbition: rpRow.rewardAiAmbition ?? undefined,
              payEquityCapability: rpRow.payEquityCapability ?? undefined,
              payStructureMaturity: rpRow.payStructureMaturity ?? undefined,
              ukGenderPayGapStatus: rpRow.ukGenderPayGapStatus ?? undefined,
              pensionSchemeArchitecture: rpRow.pensionSchemeArchitecture ?? undefined,
              externalCompDataSources: rpRow.externalCompDataSources ?? undefined,
              aiToolsCurrentlyInRewardUse: rpRow.aiToolsCurrentlyInRewardUse ?? undefined,
              compManagementPlatform: rpRow.compManagementPlatform ?? undefined,
              unionWorksCouncilCoverage: rpRow.unionWorksCouncilCoverage ?? undefined,
              primaryTriggerForRewardAiStrategy: rpRow.primaryTriggerForRewardAiStrategy ?? undefined,
              topRewardPrioritiesNext12Months: rpRow.topRewardPrioritiesNext12Months ?? undefined,
              strategicTimeline: rpRow.strategicTimeline ?? undefined,
              existingProgrammesToCoexistWith: rpRow.existingProgrammesToCoexistWith ?? undefined,
              aiTalentRetentionConcern: rpRow.aiTalentRetentionConcern ?? undefined,
              recentRemunerationVoteConcerns: rpRow.recentRemunerationVoteConcerns ?? undefined,
              nationalLivingWageExposure: rpRow.nationalLivingWageExposure ?? undefined,
            },
          } : {}),
        };
        // Attach principle alignment context and mode as extra fields for engine
        (engineInputs as Record<string, unknown>).principles = principles.map(p => p.title);
        (engineInputs as Record<string, unknown>).wontDoItems = wontDoItems.map(w => w.text);
        (engineInputs as Record<string, unknown>).mode = tenantMode;

        // Compute cache key to check if we can skip the LLM call
        // Include mode + library version so cache invalidates when either changes
        const newCacheKey = computeAlignmentCacheKey(
          principles.map(p => p.title),
          wontDoItems.map(w => w.text),
          tenantMode,
          1, // tenantLibraryVersion — bump when initiative library is updated
        );
        const cachedKey = orgCtx.semanticAlignmentCacheKey ?? undefined;
        const cachedJson = orgCtx.semanticAlignmentCacheJson ?? undefined;

        // Use async semantic alignment engine (falls back to keyword engine on LLM failure)
        const { results: fitResults, alignmentCacheKey, alignmentJson } =
          await evaluateAllInitiativesWithSemanticAlignment(
            engineInputs,
            cachedKey === newCacheKey ? newCacheKey : undefined,
            cachedKey === newCacheKey ? cachedJson : undefined,
          );

        updatedFitResultsJson = JSON.stringify(fitResults);
        updatedAlignmentCacheKey = alignmentCacheKey;
        updatedAlignmentJson = alignmentJson;
      } catch (engineErr) {
        console.error("[gate] Engine re-fire failed:", engineErr);
        // Non-fatal: gate still clears, but fit results not updated
      }

      // Update gate state
      const gateState = parseGateState(row[0]?.stageGateStateJson);
      const now = Date.now();
      gateState.stage4.completedAt = now;
      gateState.stage4.lastEditedAt = null;

      // Phase-balanced auto-selection: ensure at least 2 Scale + 1 Optimise initiatives are included
      let updatedSelectedInitiativesJson: string | null = null;
      if (updatedFitResultsJson) {
        try {
          type FitResult = { id: string; fitStatus: string; fitScore: number };
          const fitResults: FitResult[] = JSON.parse(updatedFitResultsJson);
          const phaseMap = new Map(INITIATIVE_LIBRARY.map(i => [i.id, i.phaseV3]));
          const eligible = fitResults
            .filter(r => r.fitStatus === "STRONG_FIT" || r.fitStatus === "POSSIBLE_FIT")
            .sort((a, b) => b.fitScore - a.fitScore);
          const byPhase: Record<string, FitResult[]> = { foundation: [], build: [], scale: [], optimise: [] };
          for (const r of eligible) {
            const ph = phaseMap.get(r.id) ?? "build";
            if (byPhase[ph]) byPhase[ph].push(r);
          }
          const guaranteed: string[] = [
            ...byPhase.scale.slice(0, 2).map(r => r.id),
            ...byPhase.optimise.slice(0, 1).map(r => r.id),
          ];
          const guaranteedSet = new Set(guaranteed);
          const remaining = eligible
            .filter(r => !guaranteedSet.has(r.id))
            .slice(0, 12 - guaranteed.length)
            .map(r => r.id);
          const autoSelected = [...guaranteed, ...remaining];
          if (autoSelected.length > 0) updatedSelectedInitiativesJson = JSON.stringify(autoSelected);
        } catch { /* non-fatal */ }
      }

      const patch: Record<string, unknown> = {
        stage4ConfirmedAt: new Date(),
        stageGateStateJson: JSON.stringify(gateState),
        updatedAt: new Date(),
      };
      if (updatedFitResultsJson) patch.fitImpactResultsJson = updatedFitResultsJson;
      if (updatedAlignmentCacheKey) patch.semanticAlignmentCacheKey = updatedAlignmentCacheKey;
      if (updatedAlignmentJson) patch.semanticAlignmentCacheJson = updatedAlignmentJson;
      if (updatedSelectedInitiativesJson) patch.selectedInitiativesJson = updatedSelectedInitiativesJson;

      await db.update(ailOrgContext)
        .set(patch as any)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

      return { ok: true, gateState, engineRefired: !!updatedFitResultsJson };
    }),

  /**
   * Get peer vision starting points filtered by sector and size.
   */
  getPeerVisionStarters: protectedProcedure
    .input(z.object({
      sector: z.string().optional(),
      sizeBand: z.enum(["lt500", "500_5k", "5k_25k", "25k_plus"]).optional(),
      workforceComposition: z.string().optional(),
      mode: z.enum(["cpo", "reward"]).optional(),
    }))
    .query(async ({ input }) => {
      const { sector, sizeBand, workforceComposition, mode } = input;
      let filtered = PEER_VISION_LIBRARY;

      // Filter by mode if provided (entries without mode are available to both)
      if (mode) {
        filtered = filtered.filter(e => !e.mode || e.mode === mode || e.mode === "both");
      }

      // Filter by sector if provided
      if (sector) {
        const sectorMatches = filtered.filter(e => e.sectors.includes(sector));
        if (sectorMatches.length >= 3) filtered = sectorMatches;
      }

      // Filter by sizeBand if provided
      if (sizeBand) {
        const sizeMatches = filtered.filter(e => e.sizeBands.includes(sizeBand));
        if (sizeMatches.length >= 3) filtered = sizeMatches;
      }

      // Filter by workforceComposition if provided
      if (workforceComposition) {
        const compMatches = filtered.filter(e =>
          !e.workforceCompositions || e.workforceCompositions.includes(workforceComposition)
        );
        if (compMatches.length >= 3) filtered = compMatches;
      }

      // Return up to 6 entries, shuffled
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 6);
    }),

  /**
   * Complete Stage 5 (Initiatives / Plan Curation).
   * Validates: at least 1 initiative selected.
   * Sets stage5ConfirmedAt and clears stage5 gate.
   */
  completeStage5: protectedProcedure
    .input(z.object({
      selectedInitiativeIds: z.array(z.string()).min(1, "Select at least one initiative."),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const row = await db
        .select({ stageGateStateJson: ailOrgContext.stageGateStateJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const gateState = parseGateState(row[0].stageGateStateJson);
      gateState.stage5.completedAt = Date.now();
      gateState.stage5.lastEditedAt = null;

      await db.update(ailOrgContext)
        .set({
          selectedInitiativesJson: JSON.stringify(input.selectedInitiativeIds),
          stage5ConfirmedAt: new Date(),
          stageGateStateJson: JSON.stringify(gateState),
          updatedAt: new Date(),
        })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

      return { ok: true, gateState };
    }),

  /**
   * Complete Stage 6 (Roadmap) — NEW in v4.
   * Validates: every selected initiative has a horizon assigned.
   * Dependencies are optional — zero is a valid confirmable state.
   * Sets stage6RoadmapConfirmedAt and clears stage6 gate.
   */
  completeStage6: protectedProcedure
    .input(z.object({
      roadmapJson: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Parse and validate the roadmap payload
      let roadmap: {
        horizons: Array<{ id: string; label: string; startDate?: string | null; endDate?: string | null; order: number }>;
        assignments: Array<{ initiativeId: string; horizonId: string }>;
        dependencies: Array<{ fromId: string; toId: string; reason?: string }>;
      };
      try {
        roadmap = JSON.parse(input.roadmapJson);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid roadmapJson — could not parse." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Fetch the tenant's selected initiatives to validate all are assigned
      const row = await db
        .select({
          stageGateStateJson: ailOrgContext.stageGateStateJson,
          selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
        })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND" });

      // Parse selected initiative IDs
      let selectedIds: string[] = [];
      try {
        const parsed = JSON.parse(row[0].selectedInitiativesJson ?? "[]");
        selectedIds = Array.isArray(parsed) ? parsed.map((x: unknown) => typeof x === "string" ? x : (x as { id: string }).id) : [];
      } catch { /* empty */ }

      // Gate: every selected initiative must have a horizon assigned
      const assignedIds = new Set(roadmap.assignments.map(a => a.initiativeId));
      const unassigned = selectedIds.filter(id => !assignedIds.has(id));
      if (unassigned.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `All initiatives must be assigned to a horizon. Unassigned: ${unassigned.join(", ")}.`,
        });
      }

      // Gate: at least one horizon must exist
      if (!roadmap.horizons || roadmap.horizons.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "At least one horizon must be defined." });
      }

      const gateState = parseGateState(row[0].stageGateStateJson);
      gateState.stage6.completedAt = Date.now();
      gateState.stage6.lastEditedAt = null;

      await db.update(ailOrgContext)
        .set({
          roadmapJson: input.roadmapJson,
          stage6RoadmapConfirmedAt: new Date(),
          stageGateStateJson: JSON.stringify(gateState),
          updatedAt: new Date(),
        })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

      return { ok: true, gateState };
    }),

  /**
   * Complete Stage 7 (Success Measures) — was Stage 6 in v3.
   * Validates: at least 1 outcome with a primary measure defined.
   * Sets stage6ConfirmedAt (DB col kept for compat) and clears stage7 gate.
   */
  completeStage7: protectedProcedure
    .input(z.object({
      outcomesJson: z.string().min(1), // field name kept for API compatibility; data written to successMeasuresJson
    }))
    .mutation(async ({ ctx, input }) => {
      let outcomes: Array<{ primary_measure?: string; title?: string }> = [];
      try { outcomes = JSON.parse(input.outcomesJson); } catch { /* empty */ }

      const withMeasure = outcomes.filter(o => o.primary_measure && o.primary_measure.trim().length > 0);
      if (withMeasure.length < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "At least one outcome must have a primary measure defined." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const row = await db
        .select({ stageGateStateJson: ailOrgContext.stageGateStateJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const gateState = parseGateState(row[0].stageGateStateJson);
      gateState.stage7.completedAt = Date.now();
      gateState.stage7.lastEditedAt = null;

      // T4: write to successMeasuresJson (canonical); outcomesJson is dormant
      await db.update(ailOrgContext)
        .set({
          successMeasuresJson: input.outcomesJson,
          stage6ConfirmedAt: new Date(),
          stageGateStateJson: JSON.stringify(gateState),
          updatedAt: new Date(),
        })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

      return { ok: true, gateState };
    }),

  /**
   * Complete Stage 9 (Business Case) — was Stage 7 in v3.
   * Validates: businessCaseNarrative is at least 50 words.
   * Sets stage7ConfirmedAt (DB column kept for compatibility) and clears stage9 gate.
   */
  completeStage9: protectedProcedure
    .input(z.object({
      businessCaseNarrative: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const wordCount = countWords(input.businessCaseNarrative);
      if (wordCount < 50) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Business case narrative must be at least 50 words (currently ${wordCount}).` });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const row = await db
        .select({ stageGateStateJson: ailOrgContext.stageGateStateJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const gateState = parseGateState(row[0].stageGateStateJson);
      gateState.stage9.completedAt = Date.now();
      gateState.stage9.lastEditedAt = null;

      await db.update(ailOrgContext)
        .set({
          businessCaseNarrative: input.businessCaseNarrative,
          stage7ConfirmedAt: new Date(), // DB column kept for backward compat
          stageGateStateJson: JSON.stringify(gateState),
          updatedAt: new Date(),
        })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

      return { ok: true, gateState };
    }),

  /**
   * Complete Stage 8 (Capability & Risk) — position unchanged in v4.
   * Validates: stage8CapabilityJson is present with at least one dimension filled.
   * Sets stage8ConfirmedAt and clears stage8 gate.
   */
  completeStage8: protectedProcedure
    .input(z.object({
      stage8CapabilityJson: z.string().min(1),
      riskRegisterJson: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let cap: Record<string, unknown> = {};
      try { cap = JSON.parse(input.stage8CapabilityJson); } catch { /* empty */ }

      const dims = ["skills", "capacity", "changeReadiness", "vendorEcosystem"];
      const filled = dims.filter(d => cap[d] && typeof cap[d] === "object");
      if (filled.length < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "At least one capability dimension must be completed." });
      }

      // T8: Validate risk register
      type RiskEntry = { id: string; title: string; mitigation?: string; status: string; aiSuggested: boolean };
      let risks: RiskEntry[] = [];
      if (input.riskRegisterJson) {
        try {
          const parsed = JSON.parse(input.riskRegisterJson) as { risks: RiskEntry[] };
          risks = parsed.risks ?? [];
        } catch { /* empty */ }
      }
      // Rule 1: At least one risk with a mitigation must be present
      const risksWithMitigation = risks.filter(r => r.status !== "dismissed" && r.mitigation && r.mitigation.trim().length > 0);
      if (risksWithMitigation.length < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "At least one risk with a mitigation is required before confirming Stage 8." });
      }
      // Rule 2: Every AI-suggested risk must be explicitly actioned (accepted, edited, or dismissed — not pending)
      const unactionedAiRisks = risks.filter(r => r.aiSuggested && r.status === "pending");
      if (unactionedAiRisks.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${unactionedAiRisks.length} AI-suggested risk${unactionedAiRisks.length !== 1 ? "s" : ""} must be actioned (accept, edit, or dismiss) before confirming.`,
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const row = await db
        .select({ stageGateStateJson: ailOrgContext.stageGateStateJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const gateState = parseGateState(row[0].stageGateStateJson);
      gateState.stage8.completedAt = Date.now();
      gateState.stage8.lastEditedAt = null;

      await db.update(ailOrgContext)
        .set({
          stage8CapabilityJson: input.stage8CapabilityJson,
          ...(input.riskRegisterJson ? { riskRegisterJson: input.riskRegisterJson } : {}),
          stage8ConfirmedAt: new Date(),
          stageGateStateJson: JSON.stringify(gateState),
          updatedAt: new Date(),
        })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

      return { ok: true, gateState };
    }),

  /**
   * Complete Stage 10 — mark review as held (soft gate: self-attestation). Was Stage 9 in v3.
   * Sets reviewHeldAt, stage9ConfirmedAt (DB col kept for compat), and stageGateState.stage10.completedAt.
   */
  completeStage10: protectedProcedure
    .input(z.object({
      reviewHeldAt: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const row = await db.select({ stageGateStateJson: ailOrgContext.stageGateStateJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const gateState = parseGateState(row[0].stageGateStateJson);
      gateState.stage10 = { completedAt: Date.now(), lastEditedAt: null };
      const heldAt = input.reviewHeldAt ? new Date(input.reviewHeldAt) : new Date();
      await db.update(ailOrgContext)
        .set({
          reviewHeldAt: heldAt,
          stage9ConfirmedAt: heldAt, // DB column kept for backward compat
          stageGateStateJson: JSON.stringify(gateState),
          updatedAt: new Date(),
        })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { ok: true, gateState };
    }),

  /**
   * Complete Stage 11 — confirm board report is ready. Was Stage 10 in v3.
   * Validates: all 6 sections present, total word count 1200-4000.
   * Sets stage10ConfirmedAt (DB col kept for compat) and stageGateState.stage11.completedAt.
   */
  completeStage11: protectedProcedure
    .input(z.object({
      boardReportSectionsJson: z.string(),
      boardReportIncludeNotes: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let sections: Record<string, { content: string; wordCount?: number }> = {};
      try { sections = JSON.parse(input.boardReportSectionsJson); } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid boardReportSectionsJson" });
      }
      const REQUIRED_SECTIONS = ["context", "strategic_direction", "initiative_portfolio", "investment_case", "capability_readiness", "governance"];
      const missingSections = REQUIRED_SECTIONS.filter(s => !sections[s]?.content?.trim());
      if (missingSections.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Missing sections: ${missingSections.join(", ")}` });
      }
      const totalWords = REQUIRED_SECTIONS.reduce((sum, s) => {
        const wc = sections[s]?.wordCount ?? sections[s]?.content?.split(/\s+/).filter(Boolean).length ?? 0;
        return sum + wc;
      }, 0);
      if (totalWords < 1200) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Report too short: ${totalWords} words (minimum 1200)` });
      }
      if (totalWords > 4000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Report too long: ${totalWords} words (maximum 4000)` });
      }
      const row = await db.select({ stageGateStateJson: ailOrgContext.stageGateStateJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const gateState = parseGateState(row[0].stageGateStateJson);
      gateState.stage11 = { completedAt: Date.now(), lastEditedAt: null };
      const updates: Record<string, unknown> = {
        boardReportSectionsJson: input.boardReportSectionsJson,
        stage10ConfirmedAt: new Date(), // DB column kept for backward compat
        stageGateStateJson: JSON.stringify(gateState),
        updatedAt: new Date(),
      };
      if (input.boardReportIncludeNotes !== undefined) {
        updates.boardReportIncludeNotes = input.boardReportIncludeNotes;
      }
      await db.update(ailOrgContext)
        .set(updates)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { ok: true, gateState, totalWords };
    }),

  /**
   * Draft a strategy statement from archetype + vision using LLM.
   * Used by Stage 3 when the CPO selects an archetype.
   */
  draftStrategyStatement: protectedProcedure
    .input(z.object({
      archetype: z.enum(["augmentation", "transformation", "differentiation", "efficiency", "defensive"]),
      visionStatement: z.string().optional(),
      mode: z.enum(["cpo", "reward"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertLLMRateLimit(ctx.user.id); // PROD-2.1
      const isReward = input.mode === "reward";
      const archetypeDescriptions: Record<string, string> = isReward ? {
        augmentation: "AI enhances Reward professionals' judgement — compensation analysts use AI to make better pay decisions but remain accountable for equity and fairness outcomes",
        transformation: "AI fundamentally reshapes reward processes, pay cycles, and compensation operating models — the Reward function leads AI-driven total reward innovation",
        differentiation: "AI creates a distinctive total reward experience and employer value proposition that competitors cannot easily replicate",
        efficiency: "AI automates routine reward administration, reduces pay cycle burden, and frees Reward capacity for strategic compensation design",
        defensive: "AI is deployed primarily to ensure pay equity compliance, reduce regulatory risk, and maintain audit trails across all compensation decisions",
      } : {
        augmentation: "AI enhances human judgement — HR professionals use AI to make better decisions but remain accountable for every significant outcome",
        transformation: "AI fundamentally reshapes HR processes, roles, and operating models — HR leads the organisation's AI adoption",
        differentiation: "AI creates a distinctive employee experience, talent brand, or people capability that competitors cannot easily replicate",
        efficiency: "AI automates routine HR tasks, reduces administrative burden, and frees HR capacity for higher-value work",
        defensive: "AI is deployed primarily to reduce legal, regulatory, and reputational risk — governance and audit trails take priority",
      };

      const systemPrompt = [
        `You are an expert ${isReward ? "Reward" : "HR"} strategy consultant.`,
        `Write a concise strategy statement (20-40 words) for ${isReward ? "a Reward AI strategy" : "an HR AI strategy"}.`,
        `The chosen archetype is: ${input.archetype} — ${archetypeDescriptions[input.archetype]}.`,
        input.visionStatement ? `The organisation's vision is: "${input.visionStatement}".` : "",
        "The statement should describe HOW the organisation will achieve its vision through this archetype.",
        "Be specific, active, and avoid generic phrases.",
        "FORBIDDEN WORDS — never use these: leverage, synergy, synergise, strategic imperative, best-in-class, cutting-edge, holistic, transformative, game-changing, ROI, human capital, bandwidth, ecosystem, deliverables.",
        "Return ONLY the statement text. No preamble, no quotes, no markdown.",
      ].filter(Boolean).join(" ");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Draft a strategy statement for the ${input.archetype} archetype.` },
        ],
      });

      const statement = (response as any)?.choices?.[0]?.message?.content ?? "";
      return { statement: typeof statement === "string" ? statement.trim() : "" };
    }),
});
