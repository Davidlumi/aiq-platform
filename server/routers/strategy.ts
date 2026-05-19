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
import { INITIATIVE_LIBRARY } from "../../shared/initiativeLibrary";

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

// ─── Build type derivation (Lumi V4 Decision & Investment System) ────────────
function deriveBuildType(aiType: string, complexity: number, decisionAuthority: string): "buy" | "adapt" | "build" {
  if (decisionAuthority === "full_automation" && complexity <= 2) return "buy";
  if (aiType === "automation" && complexity <= 3) return "buy";
  if (complexity >= 4 || decisionAuthority === "full_automation") return "build";
  return "adapt";
}
const BUILD_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  buy:   { label: "Buy",   description: "Standard off-the-shelf solution — low customisation, fast to deploy" },
  adapt: { label: "Adapt", description: "Configured platform — existing vendor, significant configuration required" },
  build: { label: "Build", description: "Bespoke development — custom build, highest investment and longest lead time" },
};

// ─── 2x2 Maturity matrix ──────────────────────────────────────────────────────
function computeMaturityMatrix(
  baselineScores: number[],
  selectedInitiatives: Array<{ category: string; complexity: number }>,
  businessAmbition: number,
  peopleAmbition: number,
): {
  capabilityFoundations: number;
  adoptionIntensity: number;
  archetype: string;
  archetypeDescription: string;
} {
  const cfScore = (baselineScores[4] + baselineScores[5] + baselineScores[3]) / 3;
  const cfNorm = Math.round(((cfScore - 1) / 4) * 100);
  const adoptionBase = Math.min(100, (selectedInitiatives.length / 23) * 80 + (businessAmbition - 1) * 7);
  const aiNorm = Math.round(adoptionBase);
  const highCF = cfNorm >= 50;
  const highAI = aiNorm >= 50;
  let archetype: string;
  let archetypeDescription: string;
  if (highCF && highAI) {
    archetype = "AI Leader";
    archetypeDescription = "High capability foundations and strong adoption — a benchmark organisation. Focus on sustaining governance and scaling best practice.";
  } else if (highCF && !highAI) {
    archetype = "Solid Foundation";
    archetypeDescription = "Strong governance and capability foundations with lower adoption intensity — ready to scale. Prioritise use case deployment with confidence.";
  } else if (!highCF && highAI) {
    archetype = "Fast Mover";
    archetypeDescription = "High adoption intensity but weaker capability foundations — a governance risk. Invest in ethics, oversight, and HR AI literacy before scaling further.";
  } else {
    archetype = "Emerging";
    archetypeDescription = "Early stage on both dimensions. Build foundations first: governance, literacy, and a small number of high-confidence use cases to generate momentum.";
  }
  return { capabilityFoundations: cfNorm, adoptionIntensity: aiNorm, archetype, archetypeDescription };
}

// ─── Three strategic paths ────────────────────────────────────────────────────
function computeStrategicPaths(
  archetype: string,
  businessAmbition: number,
  peopleAmbition: number,
  _selectedInitiativeIds: string[],
): Array<{ id: string; name: string; rationale: string; isCurrentPath: boolean; initiatives: string[] }> {
  const paths = [
    {
      id: "governance_first",
      name: "Governance-First",
      rationale: "Establish AI governance, ethics frameworks, and bias monitoring before scaling adoption. Reduces regulatory risk and builds board confidence. Ideal for regulated industries or organisations with low AI maturity.",
      initiatives: ["init-19", "init-20", "init-21", "init-22"],
    },
    {
      id: "capability_led",
      name: "Capability-Led",
      rationale: "Invest in HR team AI literacy and skills before deploying use cases. Ensures sustainable adoption and reduces change management risk. Ideal for organisations where HR capability gaps are the primary constraint.",
      initiatives: ["init-06", "init-13", "init-22", "init-04"],
    },
    {
      id: "adoption_accelerated",
      name: "Adoption-Accelerated",
      rationale: "Deploy high-impact, low-risk use cases quickly to generate momentum and demonstrate ROI. Ideal for organisations with strong foundations that need to show business value fast.",
      initiatives: ["init-01", "init-03", "init-07", "init-16", "init-17"],
    },
  ];
  let currentPathId = "capability_led";
  if (archetype === "Fast Mover") currentPathId = "governance_first";
  else if (archetype === "AI Leader" || archetype === "Solid Foundation") currentPathId = "adoption_accelerated";
  else if (businessAmbition >= 3 && peopleAmbition >= 3) currentPathId = "adoption_accelerated";
  else if (peopleAmbition >= 3) currentPathId = "capability_led";
  return paths.map(p => ({ ...p, isCurrentPath: p.id === currentPathId }));
}

// ─── Stop-doing register ──────────────────────────────────────────────────────
const STOP_DOING_MAP: Record<string, Array<{ practice: string; reason: string }>> = {
  "init-01": [{ practice: "Manual CV sifting as a standalone process", reason: "AI-assisted screening replaces the need for unstructured manual review at the top of the funnel." }],
  "init-02": [{ practice: "Reactive job board posting without talent intelligence", reason: "Predictive sourcing identifies passive candidates before roles are open." }],
  "init-03": [{ practice: "Manual interview scheduling via email chains", reason: "AI scheduling eliminates coordination overhead entirely." }],
  "init-04": [{ practice: "Generic L&D catalogues assigned by job title", reason: "Personalised learning paths replace one-size-fits-all content allocation." }],
  "init-05": [{ practice: "Outsourcing all L&D content creation to external vendors", reason: "AI content generation enables in-house production at scale." }],
  "init-06": [{ practice: "Annual skills audits as a standalone exercise", reason: "Continuous skills intelligence replaces point-in-time snapshots." }],
  "init-07": [{ practice: "Exit interviews as the primary attrition signal", reason: "Predictive modelling surfaces flight risk before resignation." }],
  "init-08": [{ practice: "Performance reviews without data-informed preparation", reason: "AI-augmented conversations give managers evidence before they walk in the room." }],
  "init-13": [{ practice: "Spreadsheet-based people analytics reporting", reason: "Automated analytics platforms replace manual data aggregation." }],
  "init-16": [{ practice: "Tier 0 HR queries handled by HR advisors", reason: "AI self-service handles routine queries, freeing HR for higher-value work." }],
  "init-17": [{ practice: "Paper-based or manual onboarding checklists", reason: "Automated onboarding workflows replace manual coordination." }],
  "init-19": [{ practice: "Ad hoc AI governance decisions made case-by-case", reason: "A formal AI ethics framework replaces reactive, inconsistent governance." }],
  "init-20": [{ practice: "Manual bias monitoring or no monitoring at all", reason: "Automated bias detection provides continuous, systematic oversight." }],
};

function computeStopDoing(
  selectedInitiativeIds: string[],
): Array<{ practice: string; reason: string; initiativeId: string }> {
  const items: Array<{ practice: string; reason: string; initiativeId: string }> = [];
  for (const id of selectedInitiativeIds) {
    const mapped = STOP_DOING_MAP[id];
    if (mapped) {
      for (const item of mapped) {
        items.push({ ...item, initiativeId: id });
      }
    }
  }
  return items;
}

// ─── 90-day plan ──────────────────────────────────────────────────────────────
function computeNinetyDayPlan(
  selectedInitiatives: Array<{ id: string; name: string; targetQuarter: string; complexity: number; category: string }>,
): Array<{ wave: string; label: string; actions: Array<{ action: string; owner: string; initiativeId: string }> }> {
  const immediate: Array<{ action: string; owner: string; initiativeId: string }> = [];
  const month1: Array<{ action: string; owner: string; initiativeId: string }> = [];
  const months23: Array<{ action: string; owner: string; initiativeId: string }> = [];

  for (const init of selectedInitiatives) {
    if (init.complexity <= 2) {
      immediate.push({ action: `Kick off vendor selection for ${init.name}`, owner: "HR Technology Lead", initiativeId: init.id });
      month1.push({ action: `Pilot ${init.name} with a single team or cohort`, owner: "HR Project Lead", initiativeId: init.id });
    } else if (init.complexity === 3) {
      immediate.push({ action: `Define business case and success metrics for ${init.name}`, owner: "HRBP / CPO", initiativeId: init.id });
      month1.push({ action: `Complete vendor shortlist and stakeholder alignment for ${init.name}`, owner: "HR Technology Lead", initiativeId: init.id });
      months23.push({ action: `Begin phased rollout of ${init.name}`, owner: "HR Project Lead", initiativeId: init.id });
    } else {
      immediate.push({ action: `Appoint programme lead and steering group for ${init.name}`, owner: "CPO / HR Director", initiativeId: init.id });
      months23.push({ action: `Complete discovery and architecture design for ${init.name}`, owner: "HR Technology Lead", initiativeId: init.id });
    }
  }

  immediate.push({ action: "Establish AI governance working group with HR, Legal, and IT", owner: "CPO / General Counsel", initiativeId: "governance" });
  month1.push({ action: "Publish internal AI in HR policy and acceptable use guidelines", owner: "HR Compliance Lead", initiativeId: "governance" });
  months23.push({ action: "Conduct first AI ethics and bias review across all live initiatives", owner: "AI Ethics Lead", initiativeId: "governance" });

  return [
    { wave: "immediate", label: "Immediate (Weeks 1-2)", actions: immediate.slice(0, 6) },
    { wave: "month1", label: "Month 1", actions: month1.slice(0, 5) },
    { wave: "months23", label: "Months 2-3", actions: months23.slice(0, 5) },
  ];
}

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
      // Merge shared in-memory library entries that are not already in the DB.
      // This ensures selectedInitiativeIds (which reference shared library IDs like
      // 'on_documentation_automation', 'ld_content_creation', etc.) can be resolved
      // to their names and metadata by the overview and other pages.
      const dbIds = new Set(rows.map((r: any) => r.id));
      const sharedRows = INITIATIVE_LIBRARY
        .filter(i => !dbIds.has(i.id))
        .map(i => ({
          id: i.id,
          tenantId: null as string | null,
          name: i.label,
          description: i.description ?? null,
          category: i.category,
          aiType: null as string | null,
          decisionAuthority: null as string | null,
          regulatoryFlag: null as string | null,
          owningSegmentsJson: [] as string[],
          weightsJson: [] as number[],
          baseTarget: 3,
          complexity: i.y1CostRange
            ? Math.max(1, Math.min(5, Math.round((i.y1CostRange.low + i.y1CostRange.high) / 2 / 50)))
            : 3,
          keywordsJson: [] as string[],
          forkedFromId: null as string | null,
          isUserDefined: 0,
          createdAt: null as Date | null,
          updatedAt: null as Date | null,
        }));
      return [...rows, ...sharedRows];
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
          aiType: strategyInitiativeLibrary.aiType,
          category: strategyInitiativeLibrary.category,
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

      // Build type per initiative
      const initiativesWithBuildType = items.map((i: any) => ({
        id: i.initiativeId,
        name: i.name,
        buildType: deriveBuildType(i.aiType ?? "generative", i.complexity, i.decisionAuthority),
        buildTypeLabel: BUILD_TYPE_LABELS[deriveBuildType(i.aiType ?? "generative", i.complexity, i.decisionAuthority)],
        targetQuarter: i.targetQuarter,
        category: i.category,
        complexity: i.complexity,
      }));

      // 2×2 maturity matrix
      const maturityMatrix = computeMaturityMatrix(
        effectiveBaseline,
        items.map((i: any) => ({ category: i.category, complexity: i.complexity })),
        strategy.businessAmbition,
        strategy.peopleAmbition,
      );

      // Three strategic paths
      const strategicPaths = computeStrategicPaths(
        maturityMatrix.archetype,
        strategy.businessAmbition,
        strategy.peopleAmbition,
        items.map((i: any) => i.initiativeId),
      );

      // Stop-doing register
      const stopDoing = computeStopDoing(items.map((i: any) => i.initiativeId));

      // 90-day plan
      const ninetyDayPlan = computeNinetyDayPlan(
        items.map((i: any) => ({
          id: i.initiativeId,
          name: i.name,
          targetQuarter: i.targetQuarter,
          complexity: i.complexity,
          category: i.category,
        }))
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
        // Lumi enhancements
        initiativesWithBuildType,
        maturityMatrix,
        strategicPaths,
        stopDoing,
        ninetyDayPlan,
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
