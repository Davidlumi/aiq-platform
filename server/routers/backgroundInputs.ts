/**
 * Background Input Section — tRPC router (Patch v2)
 *
 * 9-section wizard (A–I) capturing org context for the strategy builders.
 * CPO completes all 9 sections at their own pace.
 * Facilitator (platform_super_admin) adds private notes during the 1:1 session.
 *
 * Draft generation lifecycle:
 *   none → generating → initial_draft → curated
 *
 * Option C edit preservation:
 *   builderSectionStates: { [builderKey]: "initial_draft" | "curated" | "edited" }
 *   On second draft pass (completeSession), only sections in "initial_draft" are regenerated.
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { ailOrgContext } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../\_core/llm";
import { evaluateAllInitiatives, type FitImpactEngineInputs } from "../services/fitImpactEngine";

// ── Zod schemas for each section ─────────────────────────────────────────────

const SectionASchema = z.object({
  companyName: z.string().max(200).optional(),
  sector: z.string().optional(),
  subSector: z.string().optional(),
  headcountBand: z.enum(["lt500", "500_5k", "5k_25k", "25k_plus"]).optional(), // kept for backward compat
  totalHeadcount: z.number().int().min(1).max(1000000).optional(),
  totalHeadcountIsEstimate: z.boolean().optional(),
  ukSitesCount: z.number().int().min(1).max(100000).optional(),
  primaryGeography: z.string().optional(),
  orgType: z.string().optional(),
  ownershipStructure: z.enum(["private_equity", "listed_plc", "private_company", "public_sector", "ngo_charity", "family_owned"]).optional(),
  primaryRegulator: z.string().optional(),
  sectorSpecificRegulations: z.array(z.string().max(100)).optional(),
});

const SectionBSchema = z.object({
  hrTeamSize: z.number().int().min(0).max(9999).optional(),
  hrSubFunctions: z.array(z.string()).optional(),
  reportsTo: z.string().optional(),
  hrReportsToOther: z.string().max(100).optional(),
  hrInfluence: z.string().max(100).optional(),
  hrBudgetOwnership: z.enum(["full", "partial", "none"]).optional(),
});

const SectionCSchema = z.object({
  hrisSystem: z.string().max(100).optional(),
  atsSystem: z.string().max(100).optional(),
  lmsSystem: z.string().max(100).optional(),
  engagementSurveyTool: z.string().max(100).optional(),
  payrollSystem: z.string().max(100).optional(),
  existingAiTools: z.array(z.object({
    hrFunction: z.string().max(50),
    toolName: z.string().max(100),
    status: z.string().max(50),
  })).optional(),
  dataQualityRating: z.enum(["poor", "fair", "good", "excellent"]).optional(),
  hasDataWarehouse: z.boolean().optional(),
  hrSystemIntegrationMaturity: z.enum(["siloed", "partial", "integrated", "unified"]).optional(),
  yearsOfHrisData: z.enum(["lt_1_year", "1_to_2_years", "2_to_5_years", "5_plus_years", "unknown"]).optional(),
  workforceDigitalAccess: z.enum(["all_laptops", "mixed_access", "frontline_mobile", "limited"]).optional(),
});

const SectionDSchema = z.object({
  annualHiresLow: z.number().int().min(0).optional(),
  annualHiresHigh: z.number().int().min(0).optional(),
  annualHiresIsEstimate: z.boolean().optional(),
  adminTimePerHireHours: z.number().min(0).optional(),
  adminTimeIsEstimate: z.boolean().optional(),
  topHrTimePlaces: z.array(z.string().max(100)).optional(),
  hrBudgetGbp: z.number().min(0).optional(),
  hrBudgetIsEstimate: z.boolean().optional(),
  loadedFteCostGbp: z.number().min(0).optional(),
  loadedFteIsEstimate: z.boolean().optional(),
  aiInvestmentEnvelopeGbp: z.number().min(0).optional(),
  aiEnvelopeIsEstimate: z.boolean().optional(),
  voluntaryAttritionPct: z.number().min(0).max(100).optional(),
  attritionIsEstimate: z.boolean().optional(),
  timeToFillDays: z.number().min(0).optional(),
  timeToFillIsEstimate: z.boolean().optional(),
  annualApplicationVolumeLow: z.number().int().min(0).optional(),
  annualApplicationVolumeHigh: z.number().int().min(0).optional(),
  annualApplicationVolumeIsEstimate: z.boolean().optional(),
  costPerExternalHire: z.number().min(0).optional(),
  costPerExternalHireIsEstimate: z.boolean().optional(),
  annualContractorSpend: z.number().min(0).optional(),
  annualContractorSpendIsEstimate: z.boolean().optional(),
  monthlyHrQueryVolumeLow: z.number().int().min(0).optional(),
  monthlyHrQueryVolumeHigh: z.number().int().min(0).optional(),
  monthlyHrQueryVolumeIsEstimate: z.boolean().optional(),
  internalHirePercent: z.number().min(0).max(100).optional(),
  annualLDSpend: z.number().min(0).optional(),
  annualLDSpendIsEstimate: z.boolean().optional(),
  annualRevenue: z.number().min(0).optional(),
  annualRevenueIsEstimate: z.boolean().optional(),
  currentEngagementScore: z.number().min(0).max(10).optional(),
  avgTimeToFillDays: z.number().min(0).optional(),
});

const SectionESchema = z.object({
  ambitionTier: z.enum(["conservative", "pragmatic", "innovator", "transformative"]).optional(),
  hrPosture: z.enum(["following", "pacing", "leading", "transformative"]).optional(),
  timeHorizonMonths: z.union([z.number().int().min(6).max(60), z.string()]).optional(),
  riskAppetite: z.enum(["conservative", "balanced", "aggressive"]).optional(),
  successNarrative: z.string().max(1000).optional(),
  topPainPoints: z.array(z.string().max(200)).max(3).optional(),
  strategicPriorities: z.array(z.string().max(200)).max(5).optional(),
});

const SectionFSchema = z.object({
  cultureDescriptors: z.array(z.string().max(100)).max(3).optional(),
  nonNegotiables: z.array(z.string().max(200)).max(5).optional(),
  changeReadiness: z.string().max(100).optional(),
  decisionMakingStyle: z.string().max(100).optional(),
  ceoStyle: z.string().max(100).optional(),
  cfoStyle: z.string().max(100).optional(),
});

const DomainRatingSchema = z.object({
  score: z.number().min(0).max(10),
  rationaleNotes: z.string().max(500).optional(),
});

const SectionGSchema = z.object({
  ai_interaction: DomainRatingSchema.optional(),
  ai_output_evaluation: DomainRatingSchema.optional(),
  ai_workflow_design: DomainRatingSchema.optional(),
  workforce_ai_readiness: DomainRatingSchema.optional(),
  ai_ethics_trust: DomainRatingSchema.optional(),
  ai_change_leadership: DomainRatingSchema.optional(),
  overallScore: z.number().min(0).max(10).optional(),
  maturityLabel: z.string().max(50).optional(),
});

const SectionHSchema = z.object({
  keyApprovers: z.array(z.object({
    name: z.string().max(100),
    role: z.string().max(100),
    influence: z.enum(["high", "medium", "low"]).optional(),
  })).max(10).optional(),
  aiLiteracyLevel: z.enum(["low", "mixed", "moderate", "high"]).optional(),
  languageResonates: z.array(z.string().max(100)).max(5).optional(),
  keyStakeholderConcerns: z.array(z.string().max(200)).max(5).optional(),
  boardAiInterest: z.enum(["none", "low", "moderate", "high"]).optional(),
});

// Section K — Ways of Working
const SectionKSchema = z.object({
  onboardingModel: z.enum(["structured_programme", "buddy_led", "self_directed", "minimal"]).optional(),
  internalMobilityApproach: z.enum(["open_marketplace", "manager_nominated", "limited", "none"]).optional(),
  performanceReviewCadence: z.enum(["annual", "bi_annual", "quarterly", "continuous", "light_touch"]).optional(),
  hrHelpdeskModel: z.enum(["shared_service_centre", "hrbp_direct", "ticketing_system", "informal"]).optional(),
  hiringProcessStructure: z.enum(["highly_structured", "semi_structured", "informal", "varies_by_team"]).optional(),
  hiringVolumeProfile: z.array(z.enum(["graduate_apprentice", "frontline_operative", "experienced_hires", "executive_search", "seasonal_surge"])).optional(),
  lAndDDeliveryModel: z.enum(["blended", "mostly_digital", "mostly_classroom", "on_the_job", "minimal"]).optional(),
  rewardCycleModel: z.enum(["annual_cycle", "biannual_cycle", "continuous", "project_based"]).optional(),
});

// Section J — Constraints & Preferences
const SectionJSchema = z.object({
  budgetCeiling: z.enum(["lt50k", "50k_150k", "150k_500k", "500k_1m", "gt1m", "unknown"]).optional(),
  timelineConstraint: z.enum(["3_months", "6_months", "12_months", "18_24_months", "no_constraint"]).optional(),
  vendorPreferences: z.string().max(500).optional(),                       // Free text: preferred/excluded vendors
  riskTolerance: z.enum(["low", "moderate", "high"]).optional(),
  quickWinsPreference: z.enum(["foundations_first", "balanced", "quick_wins_first"]).optional(),
  excludedInitiatives: z.string().max(500).optional(),                     // Free text: areas off the table
  additionalContext: z.string().max(800).optional(),                       // Free text: anything else
});

// Section I — Business & Workforce Context
const SectionISchema = z.object({
  businessDirection: z.string().max(1000).optional(),
  businessDirectionType: z.enum(["transforming", "growing", "optimising", "defending", "mixed"]).optional(),
  topBusinessPriorities: z.array(z.string().max(200)).max(5).optional(),
  workforceWorkType: z.enum(["fully_remote", "hybrid", "mostly_onsite", "fully_onsite"]).optional(),
  workforceComposition: z.enum(["knowledge_heavy", "mixed", "frontline_heavy", "unknown"]).optional(),
  workforceEmploymentMix: z.enum(["mostly_permanent", "significant_contingent", "majority_contingent"]).optional(),
  geographicDistribution: z.enum(["single_site", "multi_site_single_country", "multi_country", "global"]).optional(),
  pivotalJobFamilies: z.array(z.string().max(100)).max(5).optional(),
  peopleChallenges: z.array(z.string().max(200)).max(3).optional(),
  employeeExperienceState: z.string().max(500).optional(),
  managerCapabilityForInsights: z.enum(["Strong", "Mixed", "Weak", "Variable"]).optional(),
  skillsFrameworkStatus: z.enum(["formal_taxonomy", "informal_role_based", "in_development", "none", "unknown"]).optional(),
  skillsInventoryCompleteness: z.enum(["comprehensive", "partial", "minimal", "none"]).optional(),
  frontlineHeadcountPercent: z.number().int().min(0).max(100).optional(),
});

const BackgroundInputsSchema = z.object({
  sectionA: SectionASchema.optional(),
  sectionB: SectionBSchema.optional(),
  sectionC: SectionCSchema.optional(),
  sectionD: SectionDSchema.optional(),
  sectionE: SectionESchema.optional(),
  sectionF: SectionFSchema.optional(),
  sectionH: SectionHSchema.optional(),
  sectionI: SectionISchema.optional(),
  sectionJ: SectionJSchema.optional(),
  sectionK: SectionKSchema.optional(),
});

const FacilitatorNoteSchema = z.object({
  sectionId: z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "general"]),
  content: z.string().max(5000),
});

// ── Builder section state type ────────────────────────────────────────────────

type BuilderSectionState = "initial_draft" | "curated" | "edited";
type BuilderSectionStates = Record<string, BuilderSectionState>;

// ── Helper: get or create ailOrgContext row ───────────────────────────────────

async function getOrCreateOrgContext(tenantId: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

  const [existing] = await db
    .select()
    .from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, tenantId))
    .limit(1);

  if (existing) return { db, row: existing };

  const id = randomUUID();
  await db.insert(ailOrgContext).values({
    id,
    tenantId,
    sector: "other",
  });
  const [created] = await db
    .select()
    .from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, tenantId))
    .limit(1);
  return { db, row: created };
}

// ── Draft generation helper ───────────────────────────────────────────────────

/**
 * Build a rich org context string for LLM prompts from all background input sections.
 * Facilitator notes are included as INTERNAL ONLY context (not shown to CPO).
 */
function buildOrgContextString(
  inputs: Record<string, unknown>,
  capAssessment: Record<string, unknown>,
  facilitatorNotes: Record<string, { content: string }> | null,
  sectionI: Record<string, unknown>,
): string {
  const a = (inputs.sectionA as any) ?? {};
  const b = (inputs.sectionB as any) ?? {};
  const c = (inputs.sectionC as any) ?? {};
  const d = (inputs.sectionD as any) ?? {};
  const e = (inputs.sectionE as any) ?? {};
  const f = (inputs.sectionF as any) ?? {};
  const h = (inputs.sectionH as any) ?? {};

  const headcountLabel: Record<string, string> = {
    lt500: "< 500 employees", "500_5k": "500–5,000 employees",
    "5k_25k": "5,000–25,000 employees", "25k_plus": "25,000+ employees",
  };
  const j = (inputs.sectionJ as any) ?? {};
  const k = (inputs.sectionK as any) ?? {};
  const ambitionLabel: Record<string, string> = {
    conservative: "Conservative (efficiency-first, low risk)",
    pragmatic: "Pragmatic (selective AI adoption, moderate risk)",
    innovator: "Innovator (proactive AI integration, higher risk tolerance)",
    transformative: "Transformative (AI-native HR, high ambition)",
  };
  const postureLabel: Record<string, string> = {
    following: "Following (reactive, catching up)",
    pacing: "Pacing (keeping up with peers)",
    leading: "Leading (ahead of sector)",
    transformative: "Transformative (redefining HR in the sector)",
  };

  const domainScores = ["ai_interaction", "ai_output_evaluation", "ai_workflow_design",
    "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership"]
    .map(d => `${d}: ${(capAssessment as any)[d]?.score ?? "not rated"}/10`)
    .join(", ");

  let ctx = `
ORGANISATION: ${a.companyName ?? "Unknown"} | Sector: ${a.sector ?? "Unknown"} | Sub-sector: ${a.subSector ?? "n/a"}
Size: ${headcountLabel[a.headcountBand] ?? "Unknown"} | Geography: ${a.primaryGeography ?? "UK"}
Regulatory context: ${(a.sectorSpecificRegulations ?? []).join(", ") || "Standard"}

HR FUNCTION: Team of ${b.hrTeamSize ?? "?"} | Reports to: ${b.reportsTo ?? "?"} | Budget ownership: ${b.hrBudgetOwnership ?? "?"}
Sub-functions: ${(b.hrSubFunctions ?? []).join(", ") || "Not specified"}

TECH STACK: HRIS: ${c.hrisSystem ?? "?"} | ATS: ${c.atsSystem ?? "?"} | LMS: ${c.lmsSystem ?? "?"}
Engagement survey: ${c.engagementSurveyTool ?? "None"} | Data quality: ${c.dataQualityRating ?? "?"}
Existing AI tools: ${(c.existingAiTools ?? []).map((t: any) => `${t.toolName} (${t.hrFunction})`).join(", ") || "None"}

OPERATIONAL BASELINES: Annual hires: ${d.annualHiresLow ?? "?"}–${d.annualHiresHigh ?? "?"} | Admin time/hire: ${d.adminTimePerHireHours ?? "?"}h
HR budget: £${d.hrBudgetGbp ?? "?"} | AI investment envelope: £${d.aiInvestmentEnvelopeGbp ?? "?"}
Attrition: ${d.voluntaryAttritionPct ?? "?"}% | Time to fill: ${d.timeToFillDays ?? "?"} days
Top HR time sinks: ${(d.topHrTimePlaces ?? []).join(", ") || "Not specified"}

STRATEGIC DIRECTION: Ambition: ${ambitionLabel[e.ambitionTier] ?? "Not set"} | HR posture: ${postureLabel[e.hrPosture] ?? "Not set"}
Time horizon: ${e.timeHorizonMonths ?? "?"} months | Risk appetite: ${e.riskAppetite ?? "?"}
Success narrative: ${e.successNarrative ?? "Not provided"}
Strategic priorities: ${(e.strategicPriorities ?? []).join("; ") || "Not specified"}
Top pain points: ${(e.topPainPoints ?? []).join("; ") || "Not specified"}

CULTURE: Descriptors: ${(f.cultureDescriptors ?? []).join(", ") || "Not specified"} | Change readiness: ${f.changeReadiness ?? "?"}
Decision style: ${f.decisionMakingStyle ?? "?"} | CEO style: ${f.ceoStyle ?? "?"} | CFO style: ${f.cfoStyle ?? "?"}
Non-negotiables: ${(f.nonNegotiables ?? []).join("; ") || "None specified"}

CAPABILITY ASSESSMENT (CPO self-rating): ${domainScores}
Overall maturity: ${(capAssessment as any).maturityLabel ?? "Not assessed"}

STAKEHOLDER CONTEXT: AI literacy: ${h.aiLiteracyLevel ?? "?"} | Board AI interest: ${h.boardAiInterest ?? "?"}
Language resonates: ${(h.languageResonates ?? []).join(", ") || "Not specified"}
Key concerns: ${(h.keyStakeholderConcerns ?? []).join("; ") || "None specified"}

BUSINESS & WORKFORCE CONTEXT (Section I):
Business direction: ${sectionI.businessDirection ?? "Not provided"}
Top business priorities: ${(sectionI.topBusinessPriorities as string[] ?? []).join("; ") || "Not specified"}
Work type: ${sectionI.workforceWorkType ?? "?"} | Employment mix: ${sectionI.workforceEmploymentMix ?? "?"}
Workforce composition: ${sectionI.workforceComposition ?? "?"} | Frontline headcount: ${sectionI.frontlineHeadcountPercent != null ? `${sectionI.frontlineHeadcountPercent}% of total workforce` : "Not specified"}
Geographic distribution: ${sectionI.geographicDistribution ?? "?"}
Pivotal job families: ${(sectionI.pivotalJobFamilies as string[] ?? []).join(", ") || "Not specified"}
People challenges: ${(sectionI.peopleChallenges as string[] ?? []).join("; ") || "Not specified"}
Employee experience: ${sectionI.employeeExperienceState ?? "Not provided"}

CONSTRAINTS & PREFERENCES (Section J):
Budget ceiling: ${j.budgetCeiling ?? "Not specified"} | Timeline: ${j.timelineConstraint ?? "Not specified"} | Risk tolerance: ${j.riskTolerance ?? "Not specified"} | Quick wins: ${j.quickWinsPreference ?? "Not specified"}
Vendor preferences: ${j.vendorPreferences || "None specified"}
Excluded areas: ${j.excludedInitiatives || "None specified"}
Additional context: ${j.additionalContext || "None"}

WAYS OF WORKING (Section K):
Onboarding: ${k.onboardingModel ?? "?"} | Internal mobility: ${k.internalMobilityApproach ?? "?"} | Performance review: ${k.performanceReviewCadence ?? "?"}
HR helpdesk: ${k.hrHelpdeskModel ?? "?"} | Hiring structure: ${k.hiringProcessStructure ?? "?"} | L&D model: ${k.lAndDDeliveryModel ?? "?"} | Reward cycle: ${k.rewardCycleModel ?? "?"}
`.trim();

  // Append facilitator notes as INTERNAL ONLY context (never shown to CPO)
  if (facilitatorNotes && Object.keys(facilitatorNotes).length > 0) {
    const noteLines = Object.entries(facilitatorNotes)
      .filter(([, v]) => v.content?.trim())
      .map(([k, v]) => `Section ${k}: ${v.content}`);
    if (noteLines.length > 0) {
      ctx += `\n\n[FACILITATOR INTERNAL NOTES — NOT FOR CPO VIEW]\n${noteLines.join("\n")}\n[END FACILITATOR NOTES]`;
    }
  }

  return ctx;
}

/**
 * Generate all strategy builder drafts using the org context.
 * Runs all LLM calls in parallel. Partial failures are logged but don't abort.
 * Returns a map of builderKey → generated content.
 */
async function generateAllBuilderDrafts(
  orgCtx: string,
  ambitionTier: string,
  hrPosture: string,
): Promise<Record<string, unknown>> {
  const ambitionLabel = {
    conservative: "cautious efficiency-first",
    pragmatic: "pragmatic selective adoption",
    innovator: "proactive AI integration",
    transformative: "AI-native transformation",
  }[ambitionTier] ?? "pragmatic";

  const hrLabel = {
    following: "reactive follower",
    pacing: "sector pacer",
    leading: "sector leader",
    transformative: "sector transformer",
  }[hrPosture] ?? "sector pacer";

  const baseSystem = `You are an expert HR AI strategy consultant. You are generating a first draft of an HR AI strategy for a CPO. Use the org context provided to make the content specific and credible. Return only valid JSON, no markdown fences.`;

  const prompts: Record<string, { system: string; user: string }> = {
    vision: {
      system: `${baseSystem} Write a vision statement for this organisation's HR AI strategy. It should be 2–3 sentences, specific to their sector and ambition, aspirational but grounded. Return: {"vision": "..."}`,
      user: `Org context:\n${orgCtx}\n\nAmbition: ${ambitionLabel}. HR posture: ${hrLabel}.`,
    },
    principles: {
      system: `${baseSystem} Write 5 guiding principles for this organisation's HR AI strategy. Each principle should be specific, actionable, and reflect the org's culture and ambition. Return a JSON array: [{"number":1,"title":"...","description":"...","capability_tags":[],"ai_drafted":true}, ...]`,
      user: `Org context:\n${orgCtx}\n\nAmbition: ${ambitionLabel}. HR posture: ${hrLabel}.`,
    },
    wontDo: {
      system: `${baseSystem} Write 5 strategic exclusions — specific things this HR function is deliberately NOT doing with AI in this period. These should be real strategic choices that a peer CPO could plausibly debate. Return a JSON array: [{"text":"...","ai_drafted":true}, ...]`,
      user: `Org context:\n${orgCtx}\n\nAmbition: ${ambitionLabel}. HR posture: ${hrLabel}.`,
    },
    outcomes: {
      system: `${baseSystem} Write 4 measurable outcomes for this HR AI strategy. At least 3 must have a measured baseline. Return a JSON array: [{"number":1,"title":"...","unit":"...","baseline_value":null,"baseline_status":"not_measured","baseline_study_date":"Q4 2025","target_value":0,"target_date":"Q4 2026","derived_summary":"...","tests_principle":null,"ai_drafted":true}, ...]`,
      user: `Org context:\n${orgCtx}\n\nAmbition: ${ambitionLabel}. HR posture: ${hrLabel}.`,
    },
    approachLine: {
      system: `${baseSystem} Write a single sentence (max 25 words) describing this organisation's AI posture in HR — the strategic stance that anchors all decisions. Return: {"approachLine": "..."}`,
      user: `Org context:\n${orgCtx}\n\nAmbition: ${ambitionLabel}. HR posture: ${hrLabel}.`,
    },
    initiatives: {
      system: `${baseSystem} Suggest 6 HR AI initiatives for this organisation, organised across 3 phases (Foundation, Scale, Optimise). Each initiative should be specific to their sector, tech stack, and ambition. Return a JSON array: [{"id":"init-draft-1","name":"...","description":"...","phase":"foundation","domains":[],"rationale":"...","ai_drafted":true}, ...]`,
      user: `Org context:\n${orgCtx}\n\nAmbition: ${ambitionLabel}. HR posture: ${hrLabel}.`,
    },
    talkingPoints: {
      system: `${baseSystem} Write 5 leadership talking points for this CPO to use when presenting the HR AI strategy to their CEO and board. Each should be specific, evidence-grounded, and address likely concerns. Return a JSON array: [{"id":"tp-draft-1","headline":"...","body":"...","audience":"ceo","ai_drafted":true}, ...]`,
      user: `Org context:\n${orgCtx}\n\nAmbition: ${ambitionLabel}. HR posture: ${hrLabel}.`,
    },
    costEnvelope: {
      system: `${baseSystem} Estimate the cost envelope for this HR AI strategy. Provide year 1, year 2, year 3 estimates with breakdown by category (technology, people, change management, external support). Return: {"year1":{"total":0,"breakdown":{"technology":0,"people":0,"change_management":0,"external_support":0}},"year2":{"total":0,"breakdown":{...}},"year3":{"total":0,"breakdown":{...}},"ai_drafted":true}`,
      user: `Org context:\n${orgCtx}\n\nAmbition: ${ambitionLabel}. HR posture: ${hrLabel}. AI investment envelope: see org context.`,
    },
    valueEnvelope: {
      system: `${baseSystem} Estimate the value envelope for this HR AI strategy. Provide year 1, year 2, year 3 value estimates with breakdown by value driver (efficiency savings, quality improvements, strategic enablement). Return: {"year1":{"total":0,"breakdown":{"efficiency":0,"quality":0,"strategic":0}},"year2":{"total":0,"breakdown":{...}},"year3":{"total":0,"breakdown":{...}},"roi_narrative":"...","ai_drafted":true}`,
      user: `Org context:\n${orgCtx}\n\nAmbition: ${ambitionLabel}. HR posture: ${hrLabel}. Operational baselines: see org context.`,
    },
  };

  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  // Run all in parallel
  await Promise.allSettled(
    Object.entries(prompts).map(async ([key, prompt]) => {
      try {
        const resp = await invokeLLM({
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
        });
        const rawContent = resp?.choices?.[0]?.message?.content;
        if (!rawContent) throw new Error("Empty LLM response");
        const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        // Strip markdown fences if present
        const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
        results[key] = JSON.parse(cleaned);
      } catch (err) {
        errors[key] = err instanceof Error ? err.message : String(err);
        results[key] = null; // Mark as failed
      }
    })
  );

  if (Object.keys(errors).length > 0) {
    console.error("[backgroundInputs] Draft generation partial failures:", errors);
  }

  return results;
}

// ── Router ────────────────────────────────────────────────────────────────────

export const backgroundInputsRouter = router({

  /**
   * Get all background inputs + facilitator notes for the current tenant.
   * Facilitator notes are only returned if the caller is platform_super_admin.
   */
  getInputs: protectedProcedure.query(async ({ ctx }) => {
    const { row } = await getOrCreateOrgContext(ctx.user.tenantId);
    const isSuperAdmin = (ctx.user as any).role === "platform_super_admin";

    const backgroundInputs = row.backgroundInputsJson
      ? JSON.parse(row.backgroundInputsJson)
      : {};

    const capabilityAssessment = row.capabilityAssessmentJson
      ? JSON.parse(row.capabilityAssessmentJson)
      : {};

    const facilitatorNotes = isSuperAdmin && row.facilitatorNotesJson
      ? JSON.parse(row.facilitatorNotesJson)
      : {};

    const sectionI = (row as any).sectionIJson
      ? JSON.parse((row as any).sectionIJson)
      : {};
    const sectionJ = (row as any).sectionJJson
      ? JSON.parse((row as any).sectionJJson)
      : {};
    const sectionK = (row as any).sectionKJson
      ? JSON.parse((row as any).sectionKJson)
      : {};
    const builderSectionStates: BuilderSectionStates = (row as any).builderSectionStatesJson
      ? JSON.parse((row as any).builderSectionStatesJson)
      : {};

    const fitImpactResultsJson = (row as any).fitImpactResultsJson;
    const fitImpactResults = fitImpactResultsJson ? JSON.parse(fitImpactResultsJson) : null;

    return {
      backgroundInputs,
      capabilityAssessment,
      sectionI,
      sectionJ,
      sectionK,
      fitImpactResults,
      facilitatorNotes: isSuperAdmin ? facilitatorNotes : null,
      preworkCompletedAt: row.preworkCompletedAt,
      sessionCompletedAt: row.sessionCompletedAt,
      draftGenerationState: row.draftGenerationState ?? "none",
      builderSectionStates,
      isSuperAdmin,
      lastDraftSavedAt: (row as any).lastDraftSavedAt ?? null,
      lastActiveSectionId: (row as any).lastActiveSectionId ?? null,
    };
  }),

  /**
   * Save one or more sections of background inputs.
   * All sections are editable by any authenticated user.
   * Section G (capability assessment) and Section I are stored separately.
   */
  saveInputs: protectedProcedure
    .input(z.object({
      sections: BackgroundInputsSchema,
      capabilityAssessment: SectionGSchema.optional(),
      sectionI: SectionISchema.optional(),
      sectionJ: SectionJSchema.optional(),
      sectionK: SectionKSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, row } = await getOrCreateOrgContext(ctx.user.tenantId);

      // Merge sections with existing
      const existing = row.backgroundInputsJson ? JSON.parse(row.backgroundInputsJson) : {};
      const merged = { ...existing };
      for (const [key, val] of Object.entries(input.sections)) {
        if (val !== undefined) {
          merged[key] = { ...(merged[key] ?? {}), ...val };
        }
      }

      const updates: Record<string, unknown> = {
        backgroundInputsJson: JSON.stringify(merged),
      };

      // Capability assessment stored separately
      if (input.capabilityAssessment) {
        const existingCap = row.capabilityAssessmentJson
          ? JSON.parse(row.capabilityAssessmentJson)
          : {};
        updates.capabilityAssessmentJson = JSON.stringify({
          ...existingCap,
          ...input.capabilityAssessment,
        });
      }

      // Section I stored separately
      if (input.sectionI) {
        const existingI = (row as any).sectionIJson
          ? JSON.parse((row as any).sectionIJson)
          : {};
        updates.sectionIJson = JSON.stringify({ ...existingI, ...input.sectionI });
      }

      // Section J stored separately
      if (input.sectionJ) {
        const existingJ = (row as any).sectionJJson
          ? JSON.parse((row as any).sectionJJson)
          : {};
        updates.sectionJJson = JSON.stringify({ ...existingJ, ...input.sectionJ });
      }

      // Section K stored separately
      if (input.sectionK) {
        const existingK = (row as any).sectionKJson
          ? JSON.parse((row as any).sectionKJson)
          : {};
        updates.sectionKJson = JSON.stringify({ ...existingK, ...input.sectionK });
      }

      // Mirror key fields into top-level ailOrgContext columns for LLM context
      if (input.sections.sectionA) {
        const a = input.sections.sectionA;
        if (a.sector) updates.sector = a.sector;
        if (a.subSector) updates.subSector = a.subSector;
        if (a.orgType) updates.orgType = a.orgType;
        if (a.primaryRegulator) updates.primaryRegulator = a.primaryRegulator;
        if (a.headcountBand) {
          const bandMap: Record<string, number> = {
            "lt500": 250, "500_5k": 2500, "5k_25k": 15000, "25k_plus": 50000,
          };
          updates.headcount = bandMap[a.headcountBand] ?? null;
        }
      }
      if (input.sections.sectionB) {
        const b = input.sections.sectionB;
        if (b.hrInfluence) updates.hrInfluence = b.hrInfluence;
      }
      if (input.sections.sectionE) {
        const e = input.sections.sectionE;
        if (e.riskAppetite) updates.riskAppetiteOverall = e.riskAppetite;
        if (e.strategicPriorities)
          updates.strategicPrioritiesJson = JSON.stringify(e.strategicPriorities);
      }
      if (input.sections.sectionF) {
        const f = input.sections.sectionF;
        if (f.decisionMakingStyle) updates.decisionMakingStyle = f.decisionMakingStyle;
        if (f.ceoStyle) updates.ceoStyle = f.ceoStyle;
        if (f.cfoStyle) updates.cfoStyle = f.cfoStyle;
      }

      await db.update(ailOrgContext)
        .set(updates as any)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { ok: true };
    }),

  /**
   * Explicit Save as Draft — persists all sections plus the user's current
   * section position and a timestamp so they can resume exactly where they
   * left off.
   */
  saveDraft: protectedProcedure
    .input(z.object({
      sections: BackgroundInputsSchema,
      capabilityAssessment: SectionGSchema.optional(),
      sectionI: SectionISchema.optional(),
      sectionJ: SectionJSchema.optional(),
      sectionK: SectionKSchema.optional(),
      activeSectionId: z.string().max(4).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, row } = await getOrCreateOrgContext(ctx.user.tenantId);
      const existing = row.backgroundInputsJson ? JSON.parse(row.backgroundInputsJson) : {};
      const merged = { ...existing };
      for (const [key, val] of Object.entries(input.sections)) {
        if (val !== undefined) {
          merged[key] = { ...(merged[key] ?? {}), ...val };
        }
      }
      const savedAt = Date.now();
      const draftUpdates: Record<string, unknown> = {
        backgroundInputsJson: JSON.stringify(merged),
        lastDraftSavedAt: savedAt,
      };
      if (input.activeSectionId) {
        draftUpdates.lastActiveSectionId = input.activeSectionId;
      }
      if (input.capabilityAssessment) {
        const existingCap = row.capabilityAssessmentJson
          ? JSON.parse(row.capabilityAssessmentJson) : {};
        draftUpdates.capabilityAssessmentJson = JSON.stringify({ ...existingCap, ...input.capabilityAssessment });
      }
      if (input.sectionI) {
        const existingI = (row as any).sectionIJson ? JSON.parse((row as any).sectionIJson) : {};
        draftUpdates.sectionIJson = JSON.stringify({ ...existingI, ...input.sectionI });
      }
      if (input.sectionJ) {
        const existingJ = (row as any).sectionJJson ? JSON.parse((row as any).sectionJJson) : {};
        draftUpdates.sectionJJson = JSON.stringify({ ...existingJ, ...input.sectionJ });
      }
      if (input.sectionK) {
        const existingK = (row as any).sectionKJson ? JSON.parse((row as any).sectionKJson) : {};
        draftUpdates.sectionKJson = JSON.stringify({ ...existingK, ...input.sectionK });
      }
      // Mirror key fields (same as saveInputs)
      if (input.sections.sectionA) {
        const a = input.sections.sectionA;
        if (a.sector) draftUpdates.sector = a.sector;
        if (a.subSector) draftUpdates.subSector = a.subSector;
        if (a.orgType) draftUpdates.orgType = a.orgType;
        if (a.primaryRegulator) draftUpdates.primaryRegulator = a.primaryRegulator;
        if (a.totalHeadcount) draftUpdates.headcount = a.totalHeadcount;
      }
      if (input.sections.sectionB) {
        const b = input.sections.sectionB;
        if (b.hrInfluence) draftUpdates.hrInfluence = b.hrInfluence;
      }
      if (input.sections.sectionE) {
        const e = input.sections.sectionE;
        if (e.riskAppetite) draftUpdates.riskAppetiteOverall = e.riskAppetite;
        if (e.strategicPriorities)
          draftUpdates.strategicPrioritiesJson = JSON.stringify(e.strategicPriorities);
      }
      if (input.sections.sectionF) {
        const f = input.sections.sectionF;
        if (f.decisionMakingStyle) draftUpdates.decisionMakingStyle = f.decisionMakingStyle;
        if (f.ceoStyle) draftUpdates.ceoStyle = f.ceoStyle;
        if (f.cfoStyle) draftUpdates.cfoStyle = f.cfoStyle;
      }
      await db.update(ailOrgContext)
        .set(draftUpdates as any)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { ok: true, savedAt };
    }),

  /**
   * Mark pre-work as complete. Validates required fields across all sections.
   * On success, triggers async draft generation for all 9 strategy builders.
   */
  completePrework: protectedProcedure.mutation(async ({ ctx }) => {
    const { db, row } = await getOrCreateOrgContext(ctx.user.tenantId);
    const inputs = row.backgroundInputsJson ? JSON.parse(row.backgroundInputsJson) : {};
    const capAssessment = row.capabilityAssessmentJson
      ? JSON.parse(row.capabilityAssessmentJson)
      : {};
    const sectionI = (row as any).sectionIJson ? JSON.parse((row as any).sectionIJson) : {};

    // ── Required field validation (raised threshold per brief §7) ──────────────
    const missing: string[] = [];

    // Section A — Company snapshot
    if (!inputs.sectionA?.sector) missing.push("Industry (Section A)");
    if (!inputs.sectionA?.totalHeadcount && !inputs.sectionA?.headcountBand) missing.push("Organisation size (Section A)");

    // Section B — HR shape
    if (inputs.sectionB?.hrTeamSize === undefined || inputs.sectionB?.hrTeamSize === null)
      missing.push("HR team size (Section B)");

    // Section C — Tech footprint
    if (!inputs.sectionC?.hrisSystem) missing.push("HRIS system (Section C)");

    // Section D — Operational baselines
    if (!inputs.sectionD?.annualHiresLow && inputs.sectionD?.annualHiresLow !== 0)
      missing.push("Annual hires (Section D)");

    // Section E — Strategic direction
    if (!inputs.sectionE?.ambitionTier) missing.push("Business AI ambition tier (Section E)");
    if (!inputs.sectionE?.hrPosture) missing.push("HR AI posture (Section E)");
    if (!inputs.sectionE?.riskAppetite) missing.push("Risk appetite (Section E)");

    // Section G — Capability assessment (at least 3 domains rated)
    const DOMAINS = ["ai_interaction", "ai_output_evaluation", "ai_workflow_design",
      "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership"];
    const ratedDomains = DOMAINS.filter(d => capAssessment[d]?.score > 0);
    if (ratedDomains.length < 3)
      missing.push("At least 3 capability domain ratings (Section G)");

    // Section I — Business & Workforce Context
    if (!sectionI.businessDirection) missing.push("Business direction (Section I)");
    if (!sectionI.peopleChallenges?.length) missing.push("Top people challenges (Section I)");

    if (missing.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Please complete required fields before finishing: ${missing.join(", ")}`,
      });
    }

    // Mark pre-work complete and set state to "generating"
    await db.update(ailOrgContext)
      .set({
        preworkCompletedAt: new Date(),
        draftGenerationState: "generating",
      })
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

    // ── Async draft generation (fire and forget) ──────────────────────────────
    // We don't await this — it runs in the background and updates the DB when done.
    // The UI polls getDraftState every 3 seconds to detect completion.
    const tenantId = ctx.user.tenantId;
    setImmediate(async () => {
      try {
        const facilitatorNotes = row.facilitatorNotesJson
          ? JSON.parse(row.facilitatorNotesJson)
          : null;
        const sectionJ = (row as any).sectionJJson ? JSON.parse((row as any).sectionJJson) : {};
        const sectionK = (row as any).sectionKJson ? JSON.parse((row as any).sectionKJson) : {};
        const orgCtx = buildOrgContextString(inputs, capAssessment, facilitatorNotes, sectionI);

        // ── Fit+Impact engine evaluation ─────────────────────────────────────
        let fitImpactResultsJson: string | null = null;
        try {
          const engineInputs: FitImpactEngineInputs = {
            sectionA: {
              totalHeadcount: inputs.sectionA?.totalHeadcount ?? (() => {
                // Fallback: derive from headcountBand for backward compat
                const bandMap: Record<string, number> = { lt500: 250, "500_5k": 2750, "5k_25k": 15000, "25k_plus": 50000 };
                return bandMap[inputs.sectionA?.headcountBand ?? ""] ?? 0;
              })(),
              ukSitesCount: inputs.sectionA?.ukSitesCount,
              sectorSpecificRegulation: inputs.sectionA?.sectorSpecificRegulations ?? [],
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
            },
            sectionD: {
              annualHires: inputs.sectionD?.annualHiresLow,
              adminTimePerHire: inputs.sectionD?.adminTimePerHireHours,
              adminTimePerHireIsEstimate: inputs.sectionD?.adminTimeIsEstimate,
              totalHrBudget: inputs.sectionD?.hrBudgetGbp,
              totalHrBudgetIsEstimate: inputs.sectionD?.hrBudgetIsEstimate,
              attritionRate: inputs.sectionD?.voluntaryAttritionPct,
              attritionRateIsEstimate: inputs.sectionD?.attritionIsEstimate,
              annualApplicationVolume: inputs.sectionD?.annualApplicationVolumeLow ?? inputs.sectionD?.annualApplicationVolumeHigh,
              costPerExternalHire: inputs.sectionD?.costPerExternalHire,
              costPerExternalHireIsEstimate: inputs.sectionD?.costPerExternalHireIsEstimate,
              annualContractorSpend: inputs.sectionD?.annualContractorSpend,
              annualContractorSpendIsEstimate: inputs.sectionD?.annualContractorSpendIsEstimate,
              monthlyHrQueryVolume: inputs.sectionD?.monthlyHrQueryVolumeLow ?? inputs.sectionD?.monthlyHrQueryVolumeHigh,
              internalHirePercent: inputs.sectionD?.internalHirePercent,
              annualLDSpend: inputs.sectionD?.annualLDSpend,
              annualLDSpendIsEstimate: inputs.sectionD?.annualLDSpendIsEstimate,
              annualRevenue: inputs.sectionD?.annualRevenue,
              annualRevenueIsEstimate: inputs.sectionD?.annualRevenueIsEstimate,
              currentEngagementScore: inputs.sectionD?.currentEngagementScore,
              hrFteCount: inputs.sectionB?.hrTeamSize,
              avgTimeToFill: inputs.sectionD?.avgTimeToFillDays,
            },
            sectionI: {
              workforceWorkType: sectionI.workforceWorkType,
              workforceComposition: sectionI.workforceComposition,
              businessDirectionType: sectionI.businessDirectionType,
              managerCapabilityForInsights: sectionI.managerCapabilityForInsights,
              skillsFrameworkStatus: sectionI.skillsFrameworkStatus,
              skillsInventoryCompleteness: sectionI.skillsInventoryCompleteness,
              pivotalJobFamilies: sectionI.pivotalJobFamilies,
              employeeExperienceState: sectionI.employeeExperienceState,
              frontlineHeadcountPercent: sectionI.frontlineHeadcountPercent,
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
            sectionJ: {
              budgetCeiling: sectionJ.budgetCeiling,
              timelineConstraint: sectionJ.timelineConstraint,
              riskTolerance: sectionJ.riskTolerance,
              quickWinsPreference: sectionJ.quickWinsPreference,
            },
            sectionF: { changeReadiness: inputs.sectionF?.changeReadiness },
            sectionG: {
              ai_ethics_trust: capAssessment.ai_ethics_trust?.score,
            },
          };
          const fitResults = evaluateAllInitiatives(engineInputs);
          fitImpactResultsJson = JSON.stringify(fitResults);
        } catch (fitErr) {
          console.error("[backgroundInputs] Fit+Impact engine failed:", fitErr);
        }

        const drafts = await generateAllBuilderDrafts(
          orgCtx,
          inputs.sectionE?.ambitionTier ?? "pragmatic",
          inputs.sectionE?.hrPosture ?? "pacing",
        );

        // Build initial builder section states (all sections start as "initial_draft")
        const builderSectionStates: BuilderSectionStates = {};
        for (const key of Object.keys(drafts)) {
          if (drafts[key] !== null) builderSectionStates[key] = "initial_draft";
        }

        // Write drafts to ailOrgContext
        const db2 = await getDb();
        if (!db2) return;

        const patch: Record<string, unknown> = {
          draftGenerationState: "initial_draft",
          builderSectionStatesJson: JSON.stringify(builderSectionStates),
          ...(fitImpactResultsJson ? { fitImpactResultsJson } : {}),
        };

        // Map builder keys to ailOrgContext columns
        if (drafts.vision) {
          const v = drafts.vision as any;
          patch.visionStatement = v.vision ?? null;
          patch.visionAiFirstDraft = v.vision ?? null;
        }
        if (drafts.principles) patch.guidingPrinciplesJson = JSON.stringify(drafts.principles);
        if (drafts.wontDo) patch.wontDoJson = JSON.stringify(drafts.wontDo);
        if (drafts.outcomes) patch.outcomesJson = JSON.stringify(drafts.outcomes);
        if (drafts.approachLine) {
          const al = drafts.approachLine as any;
          patch.approachLine = al.approachLine ?? null;
        }
        if (drafts.talkingPoints) patch.talkingPointsJson = JSON.stringify(drafts.talkingPoints);

        await db2.update(ailOrgContext)
          .set(patch as any)
          .where(eq(ailOrgContext.tenantId, tenantId));
      } catch (err) {
        console.error("[backgroundInputs] Draft generation failed:", err);
        // Set state back to "none" so CPO can retry
        const db2 = await getDb();
        if (db2) {
          await db2.update(ailOrgContext)
            .set({ draftGenerationState: "none" })
            .where(eq(ailOrgContext.tenantId, tenantId));
        }
      }
    });

    return { ok: true, generating: true };
  }),

  /**
   * Mark session as complete. Only platform_super_admin can call this.
   * Triggers a second draft pass for any sections still in "initial_draft" state.
   */
  completeSession: protectedProcedure.mutation(async ({ ctx }) => {
    if ((ctx.user as any).role !== "platform_super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only facilitators can complete a session." });
    }
    const { db, row } = await getOrCreateOrgContext(ctx.user.tenantId);

    await db.update(ailOrgContext)
      .set({ sessionCompletedAt: new Date() })
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));

    // ── Second draft pass (fire and forget) ───────────────────────────────────
    // Only regenerate sections still in "initial_draft" state (Option C preservation).
    const tenantId = ctx.user.tenantId;
    const inputs = row.backgroundInputsJson ? JSON.parse(row.backgroundInputsJson) : {};
    const capAssessment = row.capabilityAssessmentJson
      ? JSON.parse(row.capabilityAssessmentJson)
      : {};
    const sectionI = (row as any).sectionIJson ? JSON.parse((row as any).sectionIJson) : {};
    const builderSectionStates: BuilderSectionStates = (row as any).builderSectionStatesJson
      ? JSON.parse((row as any).builderSectionStatesJson)
      : {};

    const sectionsToRegenerate = Object.entries(builderSectionStates)
      .filter(([, state]) => state === "initial_draft")
      .map(([key]) => key);

    if (sectionsToRegenerate.length > 0) {
      setImmediate(async () => {
        try {
          const facilitatorNotes = row.facilitatorNotesJson
            ? JSON.parse(row.facilitatorNotesJson)
            : null;
          const orgCtx = buildOrgContextString(inputs, capAssessment, facilitatorNotes, sectionI);
          const drafts = await generateAllBuilderDrafts(
            orgCtx,
            inputs.sectionE?.ambitionTier ?? "pragmatic",
            inputs.sectionE?.hrPosture ?? "pacing",
          );

          const db2 = await getDb();
          if (!db2) return;

          const patch: Record<string, unknown> = {};

          // Only update sections that were in "initial_draft" state
          if (sectionsToRegenerate.includes("vision") && drafts.vision) {
            const v = drafts.vision as any;
            patch.visionStatement = v.vision ?? null;
            patch.visionAiFirstDraft = v.vision ?? null;
          }
          if (sectionsToRegenerate.includes("principles") && drafts.principles)
            patch.guidingPrinciplesJson = JSON.stringify(drafts.principles);
          if (sectionsToRegenerate.includes("wontDo") && drafts.wontDo)
            patch.wontDoJson = JSON.stringify(drafts.wontDo);
          if (sectionsToRegenerate.includes("outcomes") && drafts.outcomes)
            patch.outcomesJson = JSON.stringify(drafts.outcomes);
          if (sectionsToRegenerate.includes("approachLine") && drafts.approachLine) {
            const al = drafts.approachLine as any;
            patch.approachLine = al.approachLine ?? null;
          }
          if (sectionsToRegenerate.includes("talkingPoints") && drafts.talkingPoints)
            patch.talkingPointsJson = JSON.stringify(drafts.talkingPoints);

          if (Object.keys(patch).length > 0) {
            await db2.update(ailOrgContext)
              .set(patch as any)
              .where(eq(ailOrgContext.tenantId, tenantId));
          }
        } catch (err) {
          console.error("[backgroundInputs] Second draft pass failed:", err);
        }
      });
    }

    return { ok: true };
  }),

  /**
   * Save a facilitator note for a specific section. platform_super_admin only.
   */
  saveFacilitatorNote: protectedProcedure
    .input(FacilitatorNoteSchema)
    .mutation(async ({ ctx, input }) => {
      if ((ctx.user as any).role !== "platform_super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only facilitators can add notes." });
      }
      const { db, row } = await getOrCreateOrgContext(ctx.user.tenantId);
      const existing = row.facilitatorNotesJson ? JSON.parse(row.facilitatorNotesJson) : {};
      existing[input.sectionId] = {
        content: input.content,
        updatedAt: new Date().toISOString(),
        tagged_private: true,
      };
      await db.update(ailOrgContext)
        .set({ facilitatorNotesJson: JSON.stringify(existing) })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { ok: true };
    }),

  /**
   * Update builder section state (curated/edited). Used by strategy builder pages.
   */
  setBuilderSectionState: protectedProcedure
    .input(z.object({
      builderKey: z.string().max(50),
      state: z.enum(["initial_draft", "curated", "edited"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, row } = await getOrCreateOrgContext(ctx.user.tenantId);
      const states: BuilderSectionStates = (row as any).builderSectionStatesJson
        ? JSON.parse((row as any).builderSectionStatesJson)
        : {};
      states[input.builderKey] = input.state;
      await db.update(ailOrgContext)
        .set({ builderSectionStatesJson: JSON.stringify(states) } as any)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { ok: true };
    }),

  /**
   * Update draft generation state. platform_super_admin only.
   */
  setDraftState: protectedProcedure
    .input(z.object({
      state: z.enum(["none", "generating", "initial_draft", "curated"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if ((ctx.user as any).role !== "platform_super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only facilitators can update draft state." });
      }
      const { db } = await getOrCreateOrgContext(ctx.user.tenantId);
      await db.update(ailOrgContext)
        .set({ draftGenerationState: input.state })
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
      return { ok: true };
    }),

  /**
   * Get the draft generation state for the current tenant (polling endpoint).
   */
  getDraftState: protectedProcedure.query(async ({ ctx }) => {
    const { row } = await getOrCreateOrgContext(ctx.user.tenantId);
    const builderSectionStates: BuilderSectionStates = (row as any).builderSectionStatesJson
      ? JSON.parse((row as any).builderSectionStatesJson)
      : {};
    return {
      draftGenerationState: row.draftGenerationState ?? "none",
      preworkCompletedAt: row.preworkCompletedAt,
      sessionCompletedAt: row.sessionCompletedAt,
      builderSectionStates,
    };
  }),
});
