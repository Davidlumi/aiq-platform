/**
 * Gate Router — v3 Strategy Flow Stage Gate State Machine
 *
 * Manages the 4-stage gate state for the v3 strategy flow:
 *   Stage 1: Pre-work (validated by completePrework in backgroundInputs router)
 *   Stage 2: Vision
 *   Stage 3: Strategy
 *   Stage 4: Principles + Won't Do (triggers engine re-fire)
 *
 * Gate state is persisted in ailOrgContext.stageGateStateJson as:
 * {
 *   stage1: { completedAt: number | null, lastEditedAt: number | null },
 *   stage2: { completedAt: number | null, lastEditedAt: number | null },
 *   stage3: { completedAt: number | null, lastEditedAt: number | null },
 *   stage4: { completedAt: number | null, lastEditedAt: number | null },
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
import { ailOrgContext } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { evaluateAllInitiatives, type FitImpactEngineInputs } from "../services/fitImpactEngine";
import { invokeLLM } from "../_core/llm";

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
};

const DEFAULT_GATE_STATE: StageGateState = {
  stage1: { completedAt: null, lastEditedAt: null },
  stage2: { completedAt: null, lastEditedAt: null },
  stage3: { completedAt: null, lastEditedAt: null },
  stage4: { completedAt: null, lastEditedAt: null },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function freshEntry(): StageGateEntry {
  return { completedAt: null, lastEditedAt: null };
}
function parseGateState(json: string | null | undefined): StageGateState {
  if (!json) return { stage1: freshEntry(), stage2: freshEntry(), stage3: freshEntry(), stage4: freshEntry() };
  try {
    const parsed = JSON.parse(json) as Partial<StageGateState>;
    return {
      stage1: parsed.stage1 ? { ...parsed.stage1 } : freshEntry(),
      stage2: parsed.stage2 ? { ...parsed.stage2 } : freshEntry(),
      stage3: parsed.stage3 ? { ...parsed.stage3 } : freshEntry(),
      stage4: parsed.stage4 ? { ...parsed.stage4 } : freshEntry(),
    };
  } catch {
    return { stage1: freshEntry(), stage2: freshEntry(), stage3: freshEntry(), stage4: freshEntry() };
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

      const orgCtx = row[0];
      if (!orgCtx) {
        return {
          gateState: { stage1: freshEntry(), stage2: freshEntry(), stage3: freshEntry(), stage4: freshEntry() },
          isStage1Accessible: true,
          isStage2Accessible: false,
          isStage3Accessible: false,
          isStage4Accessible: false,
          stage1Cleared: false,
          stage2Cleared: false,
          stage3Cleared: false,
          stage4Cleared: false,
          stage1EditedAfterClearing: false,
          stage2EditedAfterClearing: false,
          stage3EditedAfterClearing: false,
          stage4EditedAfterClearing: false,
          visionStatement: null,
          visionInspirationSource: null,
          strategyArchetype: null,
          strategyStatement: null,
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

      return {
        gateState,
        isStage1Accessible: true,
        isStage2Accessible: stage1Cleared,
        isStage3Accessible: stage2Cleared,
        isStage4Accessible: stage3Cleared,
        stage1Cleared,
        stage2Cleared,
        stage3Cleared,
        stage4Cleared,
        stage1EditedAfterClearing: isStageEditedAfterClearing(gateState.stage1),
        stage2EditedAfterClearing: isStageEditedAfterClearing(gateState.stage2),
        stage3EditedAfterClearing: isStageEditedAfterClearing(gateState.stage3),
        stage4EditedAfterClearing: isStageEditedAfterClearing(gateState.stage4),
        visionStatement: orgCtx.visionStatement ?? null,
        visionInspirationSource: orgCtx.visionInspirationSource ?? null,
        strategyArchetype: orgCtx.strategyArchetype ?? null,
        strategyStatement: orgCtx.strategyStatement ?? null,
      };
    }),

  /**
   * Mark a stage as edited (sets lastEditedAt, which invalidates the gate).
   * Called whenever the CPO edits content in a cleared stage.
   */
  markEdited: protectedProcedure
    .input(z.object({
      stage: z.enum(["stage1", "stage2", "stage3", "stage4"]),
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
        })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);

      const orgCtx = row[0];
      if (!orgCtx) throw new TRPCError({ code: "NOT_FOUND" });

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
      try {
        const inputs = orgCtx.backgroundInputsJson ? JSON.parse(orgCtx.backgroundInputsJson) : {};
        const sectionI = orgCtx.sectionIJson ? JSON.parse(orgCtx.sectionIJson) : {};
        const sectionK = orgCtx.sectionKJson ? JSON.parse(orgCtx.sectionKJson) : {};
        const capAssessment = orgCtx.capabilityAssessmentJson ? JSON.parse(orgCtx.capabilityAssessmentJson) : {};

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
        };
        // Attach principle alignment context as extra fields for scorePrincipleAlignment evaluator
        (engineInputs as Record<string, unknown>).principles = principles.map(p => p.title);
        (engineInputs as Record<string, unknown>).wontDoItems = wontDoItems.map(w => w.text);

        const fitResults = evaluateAllInitiatives(engineInputs);
        updatedFitResultsJson = JSON.stringify(fitResults);
      } catch (engineErr) {
        console.error("[gate] Engine re-fire failed:", engineErr);
        // Non-fatal: gate still clears, but fit results not updated
      }

      // Update gate state
      const gateState = parseGateState(row[0]?.stageGateStateJson);
      const now = Date.now();
      gateState.stage4.completedAt = now;
      gateState.stage4.lastEditedAt = null;

      const patch: Record<string, unknown> = {
        stage4ConfirmedAt: new Date(),
        stageGateStateJson: JSON.stringify(gateState),
        updatedAt: new Date(),
      };
      if (updatedFitResultsJson) patch.fitImpactResultsJson = updatedFitResultsJson;

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
    }))
    .query(async ({ input }) => {
      const { sector, sizeBand, workforceComposition } = input;
      let filtered = PEER_VISION_LIBRARY;

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
   * Draft a strategy statement from archetype + vision using LLM.
   * Used by Stage 3 when the CPO selects an archetype.
   */
  draftStrategyStatement: protectedProcedure
    .input(z.object({
      archetype: z.enum(["augmentation", "transformation", "differentiation", "efficiency", "defensive"]),
      visionStatement: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const archetypeDescriptions: Record<string, string> = {
        augmentation: "AI enhances human judgement — HR professionals use AI to make better decisions but remain accountable for every significant outcome",
        transformation: "AI fundamentally reshapes HR processes, roles, and operating models — HR leads the organisation's AI adoption",
        differentiation: "AI creates a distinctive employee experience, talent brand, or people capability that competitors cannot easily replicate",
        efficiency: "AI automates routine HR tasks, reduces administrative burden, and frees HR capacity for higher-value work",
        defensive: "AI is deployed primarily to reduce legal, regulatory, and reputational risk — governance and audit trails take priority",
      };

      const systemPrompt = [
        "You are an expert HR strategy consultant.",
        "Write a concise strategy statement (20-40 words) for an HR AI strategy.",
        `The chosen archetype is: ${input.archetype} — ${archetypeDescriptions[input.archetype]}.`,
        input.visionStatement ? `The organisation's vision is: "${input.visionStatement}".` : "",
        "The statement should describe HOW the organisation will achieve its vision through this archetype.",
        "Be specific, active, and avoid generic phrases.",
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
