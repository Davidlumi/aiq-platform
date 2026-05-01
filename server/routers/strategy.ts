/**
 * Strategy Builder Router
 * Handles all tRPC procedures for the AiQ AI People Strategy Builder.
 */
import { z } from "zod";
import { eq, and, isNull, or } from "drizzle-orm";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import {
  strategyIndustries,
  strategyHrSegments,
  strategyInitiativeLibrary,
  strategies,
  strategyInitiatives,
  strategyRiskRegister,
} from "../../drizzle/schema";
import { randomUUID } from "crypto";

// ─── Domain config ─────────────────────────────────────────────────────────
const DOMAINS = [
  { key: "interaction", label: "AI Interaction" },
  { key: "output_eval", label: "AI Output Evaluation" },
  { key: "workflow", label: "AI Workflow Design" },
  { key: "workforce", label: "Workforce AI Readiness" },
  { key: "ethics", label: "AI Ethics & Trust" },
  { key: "change", label: "AI Change Leadership" },
];

const DEFAULT_SEGMENTS = [
  { name: "HR Business Partners", slug: "bp", size: 12, currentCapability: 2.0, sortOrder: 0 },
  { name: "Talent Acquisition", slug: "ta", size: 8, currentCapability: 2.5, sortOrder: 1 },
  { name: "Reward & Compensation", slug: "reward", size: 5, currentCapability: 1.8, sortOrder: 2 },
  { name: "Learning & Development", slug: "ld", size: 6, currentCapability: 2.2, sortOrder: 3 },
  { name: "People Analytics", slug: "analytics", size: 4, currentCapability: 3.0, sortOrder: 4 },
  { name: "HR Operations", slug: "ops", size: 10, currentCapability: 2.0, sortOrder: 5 },
];

// ─── Calculation engine ─────────────────────────────────────────────────────

/**
 * Compute ambition-adjusted baseline from two-axis ambition.
 * Business AI ambition: 1=Conservative, 2=Cautious, 3=Augmenter, 4=Pioneer
 * People AI ambition:   1=Compliance, 2=Embedding, 3=Capability-led, 4=Transformative
 * Formula: baseline = clamp(1.5 + (business-1)*0.4 + (people-1)*0.4, 1.0, 5.0)
 */
function computeAmbitionBaseline(businessAmbition: number, peopleAmbition: number): number[] {
  const base = 1.5 + (businessAmbition - 1) * 0.4 + (peopleAmbition - 1) * 0.4;
  const domainMods = [
    (peopleAmbition - 1) * 0.05,   // AI Interaction — people-led
    (peopleAmbition - 1) * 0.04,   // AI Output Evaluation — people-led
    (businessAmbition - 1) * 0.06, // AI Workflow Design — business-led
    (businessAmbition - 1) * 0.05, // Workforce AI Readiness — business-led
    (peopleAmbition - 1) * 0.03 + (businessAmbition - 1) * 0.03, // Ethics — both
    (businessAmbition - 1) * 0.06, // AI Change Leadership — business-led
  ];
  return domainMods.map(mod =>
    Math.round(Math.max(1.0, Math.min(5.0, base + mod)) * 10) / 10
  );
}

function computeTargets(
  baselineScores: number[],
  selectedInitiatives: Array<{ weightsJson: number[]; baseTarget: number; criticality: number }>,
  businessAmbition: number, // 1-4
  peopleAmbition: number,   // 1-4
): number[] {
  // Ambition multiplier: 0.85 (Conservative) → 1.15 (Pioneer)
  const ambitionMultiplier = 0.85 + ((businessAmbition + peopleAmbition - 2) / 6) * 0.30;
  const targets = [...baselineScores];

  for (const init of selectedInitiatives) {
    const critMultiplier = 0.85 + (init.criticality - 1) * 0.15; // 0.85–1.15
    for (let i = 0; i < 6; i++) {
      const weight = (init.weightsJson[i] ?? 0) * critMultiplier * ambitionMultiplier;
      // Delta always positive: target moves toward baseTarget, never below baseline
      const delta = weight * Math.max(0, init.baseTarget - baselineScores[i]);
      targets[i] = Math.max(targets[i], baselineScores[i] + delta);
    }
  }
  // Clamp to 1.0–5.0 and ensure target >= baseline
  return targets.map((t, i) => {
    const clamped = Math.max(1.0, Math.min(5.0, t));
    return Math.round(Math.max(baselineScores[i], clamped) * 10) / 10;
  });
}

function computeSegmentDemand(
  segments: Array<{ name: string; slug: string; size: number; currentCapability: number }>,
  selectedInitiatives: Array<{ owningSegmentsJson: string[]; name: string; complexity: number }>,
): Array<{ segment: string; initiatives: number; totalSize: number; avgComplexity: number }> {
  return segments.map(seg => {
    const relevant = selectedInitiatives.filter(i => i.owningSegmentsJson.includes(seg.slug));
    const avgComplexity = relevant.length
      ? relevant.reduce((s, i) => s + i.complexity, 0) / relevant.length
      : 0;
    return {
      segment: seg.name,
      initiatives: relevant.length,
      totalSize: seg.size,
      avgComplexity: Math.round(avgComplexity * 10) / 10,
    };
  });
}

function computeRiskItems(
  selectedInitiatives: Array<{
    id: string;
    name: string;
    regulatoryFlag: string | null;
    decisionAuthority: string;
    targetQuarter: string;
  }>,
  industryIsRegulated: boolean,
): Array<{
  initiativeId: string;
  initiativeName: string;
  regulatoryFlag: string;
  severity: "high" | "medium";
  mitigation: string;
  ownerRole: string;
  reviewCadence: string;
  launchQuarter: string;
}> {
  const items = [];
  for (const init of selectedInitiatives) {
    if (init.regulatoryFlag) {
      items.push({
        initiativeId: init.id,
        initiativeName: init.name,
        regulatoryFlag: init.regulatoryFlag,
        severity: (industryIsRegulated ? "high" : "medium") as "high" | "medium",
        mitigation: `Establish human oversight protocol and document decision audit trail for ${init.name}.`,
        ownerRole: "Chief People Officer / Legal Counsel",
        reviewCadence: "Quarterly",
        launchQuarter: init.targetQuarter,
      });
    }
    if (init.decisionAuthority === "full_automation" && industryIsRegulated) {
      items.push({
        initiativeId: init.id,
        initiativeName: init.name,
        regulatoryFlag: "Full automation in regulated industry – requires human-in-the-loop review",
        severity: "high" as "high",
        mitigation: `Add human review checkpoint before automated decisions take effect for ${init.name}.`,
        ownerRole: "HR Compliance Lead",
        reviewCadence: "Monthly",
        launchQuarter: init.targetQuarter,
      });
    }
  }
  return items;
}

const STRATEGIC_PATTERNS = [
  { id: "p01", name: "AI-First TA", description: "Automate sourcing, screening and scheduling to reduce time-to-hire by 40%.", domains: ["interaction", "workflow"], minInitiatives: ["init-01", "init-02", "init-03"] },
  { id: "p02", name: "Predictive Retention", description: "Combine attrition modelling with personalised interventions to cut regrettable attrition.", domains: ["output_eval", "workforce"], minInitiatives: ["init-07", "init-15"] },
  { id: "p03", name: "Skills-Led Organisation", description: "Build a continuous skills intelligence layer to underpin all talent decisions.", domains: ["workforce", "change"], minInitiatives: ["init-06", "init-13", "init-22"] },
  { id: "p04", name: "Ethical AI Foundation", description: "Establish governance, bias monitoring and consent management before scaling AI.", domains: ["ethics", "output_eval"], minInitiatives: ["init-19", "init-20", "init-21"] },
  { id: "p05", name: "HR Productivity Leap", description: "Automate Tier 0 queries, onboarding and document processing to free HR capacity.", domains: ["workflow", "interaction"], minInitiatives: ["init-16", "init-17", "init-18"] },
  { id: "p06", name: "People Analytics Maturity", description: "Build the data platform and forecasting capability to move from reporting to prediction.", domains: ["output_eval", "workforce"], minInitiatives: ["init-13", "init-14"] },
  { id: "p07", name: "Manager AI Augmentation", description: "Equip managers with AI-generated insights to improve performance and engagement conversations.", domains: ["change", "interaction"], minInitiatives: ["init-08", "init-22"] },
  { id: "p08", name: "Pay Equity & Reward Intelligence", description: "Continuously audit pay equity and model reward scenarios to stay competitive and compliant.", domains: ["ethics", "output_eval"], minInitiatives: ["init-10", "init-11", "init-12"] },
];

// ─── Router ─────────────────────────────────────────────────────────────────

export const strategyRouter = router({
  // List all industries
  listIndustries: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    if (!db) throw new Error("DB unavailable");
    return db.select().from(strategyIndustries).orderBy(strategyIndustries.name);
  }),

  // List initiative library (global + tenant-specific)
  listInitiatives: protectedProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("DB unavailable");
      if (!db) throw new Error("DB unavailable");
      const rows = await db
        .select()
        .from(strategyInitiativeLibrary)
        .where(
          or(
            isNull(strategyInitiativeLibrary.tenantId),
            input.tenantId ? eq(strategyInitiativeLibrary.tenantId, input.tenantId) : isNull(strategyInitiativeLibrary.tenantId),
          )
        )
        .orderBy(strategyInitiativeLibrary.category, strategyInitiativeLibrary.name);
      return rows;
    }),

  // Get or create HR segments for a tenant
  getSegments: protectedProcedure
    .input(z.object({ tenantId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("DB unavailable");
      if (!db) throw new Error("DB unavailable");
      const existing = await db
        .select()
        .from(strategyHrSegments)
        .where(eq(strategyHrSegments.tenantId, input.tenantId))
        .orderBy(strategyHrSegments.sortOrder);

      if (existing.length > 0) return existing;

      // Seed defaults
      const toInsert = DEFAULT_SEGMENTS.map(s => ({
        id: randomUUID(),
        tenantId: input.tenantId,
        name: s.name,
        slug: s.slug,
        size: s.size,
        currentCapability: s.currentCapability,
        isDefault: 1,
        sortOrder: s.sortOrder,
      }));
      await db.insert(strategyHrSegments).values(toInsert);
      return db
        .select()
        .from(strategyHrSegments)
        .where(eq(strategyHrSegments.tenantId, input.tenantId))
        .orderBy(strategyHrSegments.sortOrder);
    }),

  // List strategies for a user
  listStrategies: protectedProcedure
    .input(z.object({ tenantId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
    if (!db) throw new Error("DB unavailable");
      if (!db) throw new Error("DB unavailable");
      return db
        .select()
        .from(strategies)
        .where(
          and(
            eq(strategies.tenantId, input.tenantId),
            eq(strategies.createdByUserId, ctx.user.id),
          )
        )
        .orderBy(strategies.updatedAt);
    }),

  // Get a single strategy with its initiatives
  getStrategy: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
    if (!db) throw new Error("DB unavailable");
      if (!db) throw new Error("DB unavailable");
      const [strategy] = await db
        .select()
        .from(strategies)
        .where(
          and(
            eq(strategies.id, input.strategyId),
            eq(strategies.createdByUserId, ctx.user.id),
          )
        );
      if (!strategy) throw new Error("Strategy not found");

      const items = await db
        .select({
          id: strategyInitiatives.id,
          strategyId: strategyInitiatives.strategyId,
          initiativeId: strategyInitiatives.initiativeId,
          criticality: strategyInitiatives.criticality,
          targetQuarter: strategyInitiatives.targetQuarter,
          targetQuarterOffset: strategyInitiatives.targetQuarterOffset,
          notes: strategyInitiatives.notes,
          createdAt: strategyInitiatives.createdAt,
          // initiative details
          name: strategyInitiativeLibrary.name,
          description: strategyInitiativeLibrary.description,
          category: strategyInitiativeLibrary.category,
          aiType: strategyInitiativeLibrary.aiType,
          decisionAuthority: strategyInitiativeLibrary.decisionAuthority,
          regulatoryFlag: strategyInitiativeLibrary.regulatoryFlag,
          owningSegmentsJson: strategyInitiativeLibrary.owningSegmentsJson,
          weightsJson: strategyInitiativeLibrary.weightsJson,
          baseTarget: strategyInitiativeLibrary.baseTarget,
          complexity: strategyInitiativeLibrary.complexity,
          keywordsJson: strategyInitiativeLibrary.keywordsJson,
          isUserDefined: strategyInitiativeLibrary.isUserDefined,
        })
        .from(strategyInitiatives)
        .innerJoin(
          strategyInitiativeLibrary,
          eq(strategyInitiatives.initiativeId, strategyInitiativeLibrary.id)
        )
        .where(eq(strategyInitiatives.strategyId, input.strategyId));

      const [industry] = await db
        .select()
        .from(strategyIndustries)
        .where(eq(strategyIndustries.id, strategy.industryId));

      return { strategy, initiatives: items, industry };
    }),

  // Create a new strategy
  createStrategy: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      name: z.string().default("Strategy A"),
      industryId: z.string(),
      businessAmbition: z.number().int().min(1).max(4).default(2),
      peopleAmbition: z.number().int().min(1).max(4).default(2),
      slot: z.enum(["A", "B", "C"]).default("A"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
    if (!db) throw new Error("DB unavailable");
      if (!db) throw new Error("DB unavailable");
      const id = randomUUID();
      await db.insert(strategies).values({
        id,
        tenantId: input.tenantId,
        createdByUserId: ctx.user.id,
        name: input.name,
        industryId: input.industryId,
        businessAmbition: input.businessAmbition,
        peopleAmbition: input.peopleAmbition,
        slot: input.slot,
        status: "draft",
      });
      return { id };
    }),

  // Update strategy context (industry, ambitions, name)
  updateStrategy: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      name: z.string().optional(),
      industryId: z.string().optional(),
      businessAmbition: z.number().int().min(1).max(4).optional(),
      peopleAmbition: z.number().int().min(1).max(4).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
    if (!db) throw new Error("DB unavailable");
      if (!db) throw new Error("DB unavailable");
      const { strategyId, ...updates } = input;
      await db
        .update(strategies)
        .set({ ...updates, updatedAt: new Date() })
        .where(
          and(
            eq(strategies.id, strategyId),
            eq(strategies.createdByUserId, ctx.user.id),
          )
        );
      return { ok: true };
    }),

  // Toggle an initiative in/out of a strategy
  toggleInitiative: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      initiativeId: z.string(),
      criticality: z.number().int().min(1).max(3).default(1),
      targetQuarter: z.string().default("Q2 26"),
      targetQuarterOffset: z.number().int().default(6),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("DB unavailable");
      if (!db) throw new Error("DB unavailable");
      const existing = await db
        .select()
        .from(strategyInitiatives)
        .where(
          and(
            eq(strategyInitiatives.strategyId, input.strategyId),
            eq(strategyInitiatives.initiativeId, input.initiativeId),
          )
        );

      if (existing.length > 0) {
        // Remove
        await db
          .delete(strategyInitiatives)
          .where(eq(strategyInitiatives.id, existing[0].id));
        return { action: "removed" };
      } else {
        // Add
        await db.insert(strategyInitiatives).values({
          id: randomUUID(),
          strategyId: input.strategyId,
          initiativeId: input.initiativeId,
          criticality: input.criticality,
          targetQuarter: input.targetQuarter,
          targetQuarterOffset: input.targetQuarterOffset,
        });
        return { action: "added" };
      }
    }),

  // Update initiative settings (criticality, quarter)
  updateInitiative: protectedProcedure
    .input(z.object({
      strategyInitiativeId: z.string(),
      criticality: z.number().int().min(1).max(3).optional(),
      targetQuarter: z.string().optional(),
      targetQuarterOffset: z.number().int().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("DB unavailable");
      if (!db) throw new Error("DB unavailable");
      const { strategyInitiativeId, ...updates } = input;
      await db
        .update(strategyInitiatives)
        .set(updates)
        .where(eq(strategyInitiatives.id, strategyInitiativeId));
      return { ok: true };
    }),

  // Compute strategy output (targets, gaps, segment demand, risks, patterns)
  computeOutput: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      baselineScores: z.array(z.number()).length(6),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
    if (!db) throw new Error("DB unavailable");
      if (!db) throw new Error("DB unavailable");
      const [strategy] = await db
        .select()
        .from(strategies)
        .where(
          and(
            eq(strategies.id, input.strategyId),
            eq(strategies.createdByUserId, ctx.user.id),
          )
        );
      if (!strategy) throw new Error("Strategy not found");

      const [industry] = await db
        .select()
        .from(strategyIndustries)
        .where(eq(strategyIndustries.id, strategy.industryId));

      const items = await db
        .select({
          id: strategyInitiatives.id,
          initiativeId: strategyInitiatives.initiativeId,
          criticality: strategyInitiatives.criticality,
          targetQuarter: strategyInitiatives.targetQuarter,
          name: strategyInitiativeLibrary.name,
          weightsJson: strategyInitiativeLibrary.weightsJson,
          baseTarget: strategyInitiativeLibrary.baseTarget,
          owningSegmentsJson: strategyInitiativeLibrary.owningSegmentsJson,
          complexity: strategyInitiativeLibrary.complexity,
          regulatoryFlag: strategyInitiativeLibrary.regulatoryFlag,
          decisionAuthority: strategyInitiativeLibrary.decisionAuthority,
        })
        .from(strategyInitiatives)
        .innerJoin(
          strategyInitiativeLibrary,
          eq(strategyInitiatives.initiativeId, strategyInitiativeLibrary.id)
        )
        .where(eq(strategyInitiatives.strategyId, input.strategyId));

      const segments = await db
        .select()
        .from(strategyHrSegments)
        .where(eq(strategyHrSegments.tenantId, strategy.tenantId))
        .orderBy(strategyHrSegments.sortOrder);

      // Ambition-adjusted baseline: use higher of passed-in scores or ambition floor
      const ambitionBaseline = computeAmbitionBaseline(strategy.businessAmbition, strategy.peopleAmbition);
      const effectiveBaseline = input.baselineScores.map((s, i) =>
        Math.round(Math.max(s, ambitionBaseline[i]) * 10) / 10
      );

      const targetScores = computeTargets(
        effectiveBaseline,
        items.map((i: any) => ({
          weightsJson: i.weightsJson as number[],
          baseTarget: i.baseTarget,
          criticality: i.criticality,
        })),
        strategy.businessAmbition,
        strategy.peopleAmbition,
      );

      const gaps = DOMAINS.map((d, i) => ({
        domain: d.label,
        key: d.key,
        baseline: effectiveBaseline[i],
        target: targetScores[i],
        gap: Math.round(Math.max(0, targetScores[i] - effectiveBaseline[i]) * 10) / 10,
      }));

      const segmentDemand = computeSegmentDemand(
        segments.map((s: any) => ({
          name: s.name,
          slug: s.slug,
          size: s.size,
          currentCapability: s.currentCapability,
        })),
        items.map((i: any) => ({
          owningSegmentsJson: i.owningSegmentsJson as string[],
          name: i.name,
          complexity: i.complexity,
        })),
      );

      const riskItems = computeRiskItems(
        items.map((i: any) => ({
          id: i.initiativeId,
          name: i.name,
          regulatoryFlag: i.regulatoryFlag,
          decisionAuthority: i.decisionAuthority,
          targetQuarter: i.targetQuarter,
        })),
        Boolean(industry?.isRegulated),
      );

      // Match strategic patterns
      const selectedIds = new Set(items.map((i: any) => i.initiativeId));
      const matchedPatterns = STRATEGIC_PATTERNS.filter(p =>
        p.minInitiatives.every(id => selectedIds.has(id))
      );

      return {
        domains: DOMAINS,
        baselineScores: effectiveBaseline,
        targetScores,
        gaps,
        segmentDemand,
        riskItems,
        matchedPatterns,
        initiativeCount: items.length,
        riskCount: riskItems.length,
      };
    }),

  // Commit strategy to roadmap
  commitStrategy: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
    if (!db) throw new Error("DB unavailable");
      if (!db) throw new Error("DB unavailable");
      await db
        .update(strategies)
        .set({
          status: "committed",
          committedAt: new Date(),
          committedByUserId: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(strategies.id, input.strategyId),
            eq(strategies.createdByUserId, ctx.user.id),
          )
        );
      return { ok: true };
    }),

  // Get strategic patterns library
  getPatterns: protectedProcedure.query(async () => {
    return STRATEGIC_PATTERNS;
  }),

  // Create custom initiative
  createCustomInitiative: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      name: z.string().min(3).max(200),
      description: z.string().optional(),
      category: z.string(),
      aiType: z.string(),
      decisionAuthority: z.string().default("recommends_to_human"),
      regulatoryFlag: z.string().optional(),
      owningSegments: z.array(z.string()),
      weights: z.array(z.number()).length(6),
      baseTarget: z.number().min(1).max(5).default(3.0),
      complexity: z.number().int().min(1).max(5).default(3),
      keywords: z.array(z.string()).default([]),
      forkedFromId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("DB unavailable");
      if (!db) throw new Error("DB unavailable");
      const id = randomUUID();
      await db.insert(strategyInitiativeLibrary).values({
        id,
        tenantId: input.tenantId,
        name: input.name,
        description: input.description,
        category: input.category,
        aiType: input.aiType,
        decisionAuthority: input.decisionAuthority,
        regulatoryFlag: input.regulatoryFlag,
        owningSegmentsJson: input.owningSegments,
        weightsJson: input.weights,
        baseTarget: input.baseTarget,
        complexity: input.complexity,
        keywordsJson: input.keywords,
        forkedFromId: input.forkedFromId,
        isUserDefined: 1,
      });
      return { id };
    }),
});
