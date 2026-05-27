/**
 * Auto-regeneration helper — triggered after assessment completion.
 *
 * Runs gap analysis + adaptive plan generation in the background (fire-and-forget).
 * Sets triggerSource = 'assessment_complete' on the new gap analysis.
 * Marks the active plan as superseded and creates a new one.
 */
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  adaptiveLearningPlans,
  adaptivePlanItems,
  assessmentScores,
  assessmentSessions,
  gapAnalyses,
  learningModules,
  learningModuleTags,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { computeGapAnalysis, type CapabilityKey } from "./gapAnalysisEngine";
import { generateAdaptivePlan, type ModuleCandidate } from "./learningPathGenerator";

function extractCapabilityScores(scoreRow: { scoreBreakdownJson: unknown }): Partial<Record<CapabilityKey, number>> {
  try {
    const breakdown = typeof scoreRow.scoreBreakdownJson === "string"
      ? JSON.parse(scoreRow.scoreBreakdownJson as string)
      : scoreRow.scoreBreakdownJson;
    if (!breakdown || typeof breakdown !== "object") return {};
    const result: Partial<Record<CapabilityKey, number>> = {};
    for (const [k, v] of Object.entries(breakdown as Record<string, unknown>)) {
      if (typeof v === "number") result[k as CapabilityKey] = v;
      else if (v && typeof v === "object" && "score" in v && typeof (v as { score: unknown }).score === "number") {
        result[k as CapabilityKey] = (v as { score: number }).score;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function resolveSeniorityTier(sessionMetaJson: unknown): string {
  try {
    const meta = typeof sessionMetaJson === "string" ? JSON.parse(sessionMetaJson as string) : sessionMetaJson;
    return (meta as Record<string, unknown>)?.seniorityTier as string ?? "mid";
  } catch {
    return "mid";
  }
}

/**
 * Fire-and-forget: regenerate gap analysis + adaptive plan after assessment completes.
 * Does NOT throw — all errors are logged and swallowed.
 */
export async function autoRegenerateAfterAssessment(params: {
  userId: string;
  tenantId: string;
  sessionId: string;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // Get assessment scores
    const scores = await db.select().from(assessmentScores)
      .where(eq(assessmentScores.sessionId, params.sessionId))
      .limit(1);
    if (!scores[0]) return;

    const capabilityScores = extractCapabilityScores(scores[0]);
    const overallScore = parseFloat(String(scores[0].overallScore));

    // Get session metadata for seniority tier
    const sessionRows = await db.select({ sessionMetadataJson: assessmentSessions.sessionMetadataJson })
      .from(assessmentSessions)
      .where(eq(assessmentSessions.id, params.sessionId))
      .limit(1);
    const seniorityTier = resolveSeniorityTier(sessionRows[0]?.sessionMetadataJson);

    // Check if a gap analysis for this session already exists
    const existing = await db.select({ id: gapAnalyses.id })
      .from(gapAnalyses)
      .where(and(eq(gapAnalyses.userId, params.userId), eq(gapAnalyses.sessionId, params.sessionId)))
      .limit(1);
    if (existing[0]) return; // Already generated (e.g. by manual trigger)

    // Compute gap analysis
    const analysis = computeGapAnalysis(capabilityScores, seniorityTier);
    const gapId = nanoid();
    await db.insert(gapAnalyses).values({
      id: gapId,
      userId: params.userId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      capabilityGapsJson: JSON.stringify(analysis.capabilityGaps) as any,
      priorityOrderJson: JSON.stringify(analysis.priorityOrder) as any,
      overallReadinessScore: analysis.overallReadinessScore.toFixed(2) as any,
      readinessBand: analysis.readinessBand,
      triggerSource: "assessment_complete",
      generatedAt: Date.now(),
    });

    // Supersede existing active plans
    await db.update(adaptiveLearningPlans)
      .set({ state: "superseded" })
      .where(and(
        eq(adaptiveLearningPlans.userId, params.userId),
        eq(adaptiveLearningPlans.state, "active"),
      ));

    // Get module candidates
    const allModules = await db.select().from(learningModules)
      .where(eq(learningModules.status, "published"));
    const allTags = await db.select().from(learningModuleTags);
    const moduleCandidates: ModuleCandidate[] = allModules.map(m => ({
      id: m.id,
      key: m.key,
      title: m.title,
      capability: m.capability,
      modality: m.modality as any,
      difficulty: m.difficulty,
      durationMins: m.durationMins,
      levelLabel: m.levelLabel,
    }));

    // Generate adaptive plan
    const planItems = generateAdaptivePlan(analysis, moduleCandidates, {
      maxModules: 18,
    });

    const planId = nanoid();
    const now = Date.now();
    await db.insert(adaptiveLearningPlans).values({
      id: planId,
      userId: params.userId,
      tenantId: params.tenantId,
      gapAnalysisId: gapId,
      sessionId: params.sessionId,
      state: "active",
      generatorVersion: "v3-adaptive",
      totalModules: planItems.length,
      completedModules: 0,
      estimatedTotalMins: planItems.reduce((s, _i) => s + 10, 0),
      summaryJson: JSON.stringify({ overallScore, readinessBand: analysis.readinessBand, autoGenerated: true }) as any,
      generatedAt: now,
      autoRegeneratedAt: now,
    });

    if (planItems.length > 0) {
      await db.insert(adaptivePlanItems).values(
        planItems.map((item, idx) => ({
          id: nanoid(),
          planId,
          moduleId: item.moduleId,
          orderIndex: idx,
          phase: item.phase as any,
          required: item.required ?? true,
          unlockAfterModuleId: item.unlockAfterModuleId ?? null,
          status: (idx === 0 ? "available" : "locked") as "available" | "locked",
          completionState: "not_started" as const,
          noTransferCount: 0,
          alternativeModalityPrescribed: false,
          honestDisclosureSent: false,
          prescriptionStage: 1,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    console.log(`[autoRegenerate] Generated gap analysis ${gapId} and plan ${planId} for user ${params.userId} after session ${params.sessionId}`);
    // Push real-time notification that learning plan has been updated
    const { pushNotification } = await import("../sse");
    pushNotification(params.userId, {
      type: "plan_updated",
      title: "Learning Plan Updated",
      body: `Your personalised learning plan has been refreshed with ${planItems.length} modules based on your latest assessment.`,
    });
  } catch (err) {
    console.warn("[autoRegenerate] Failed (non-fatal):", err);
  }
}
