/**
 * Phase C — Assumptions Router
 *
 * Implements the two-layer decomposition engine:
 *   Layer 1 — LLM derives cost/capability/market/pressure assumptions from org context.
 *   Layer 2 — Deterministic library lookup for preconditions (founder-curated).
 *
 * The no-coverage flag fires when the library has no entry for an initiative's preconditions,
 * INDEPENDENT of whether Layer 1 produced cost/capability/market/pressure assumptions.
 * This is the tightening required by the gate: the flag is about the precondition slot being
 * empty/uncurated, not about the overall decomposition being empty.
 */

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { cpoProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { assumption, initiative, ailOrgContext } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import {
  getPreconditionsForInitiative,
  hasPreconditionCoverage,
} from "../../shared/preconditionLibrary";
import { getInitiative as getLibraryInitiative } from "../../shared/initiativeLibrary";
import { randomUUID } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssumptionType = "cost" | "capability" | "market" | "pressure" | "precondition";
export type AssumptionBasis =
  | "self_declared"
  | "assessed"
  | "benchmark_default"
  | "calculated"
  | "ai_drafted"
  | "user_confirmed";
export type AssumptionStrength = "strong" | "moderate" | "weak" | "unverified";
export type AssumptionConfidence = "high" | "medium" | "low";

interface Layer1Assumption {
  type: Exclude<AssumptionType, "precondition">;
  statement: string;
  basis: AssumptionBasis;
  sourceRef: string;
  strength: AssumptionStrength;
  confidence: AssumptionConfidence;
}

interface Layer1Result {
  assumptions: Layer1Assumption[];
  rawResponse: string;
}

// ─── Layer 1 — LLM derivation ─────────────────────────────────────────────────

async function runLayer1(
  initiativeId: string,
  initiativeTitle: string,
  initiativeDescription: string,
  orgContextSummary: string
): Promise<Layer1Result> {
  const systemPrompt = `You are a senior HR strategy analyst decomposing an AI initiative into its underlying assumptions.

Your task: given an AI initiative and an organisation's context, produce a structured set of assumptions across four types.

ASSUMPTION TYPES:
- cost: What does this initiative cost to deploy and sustain? (vendor fees, implementation, change management, internal resource)
- capability: What HR/people capability does the organisation need to have or build to make this initiative succeed?
- market: What does the external market or sector context need to be true for this initiative to deliver its projected value?
- pressure: What internal organisational pressure or strategic driver must exist for this initiative to maintain momentum?

RULES:
1. Produce 1–3 assumptions per type. Do not pad with generic claims.
2. Every assumption must reference a specific fact from the org context provided, OR cite a sector benchmark. Do not invent.
3. For each assumption, assess:
   - basis: one of "self_declared" (org told us), "assessed" (derived from what org told us), "benchmark_default" (sector average used because org did not provide), "calculated" (derived from formula)
   - sourceRef: which field or benchmark this comes from (e.g. "sectionC.dataQualityRating", "sector benchmark: retail HRIS integration maturity")
   - strength: "strong" (directly evidenced), "moderate" (reasonably inferred), "weak" (thin evidence), "unverified" (no evidence)
   - confidence: "high" (reliable), "medium" (reasonable), "low" (uncertain — surface for user confirmation)
4. Do NOT produce precondition-type assumptions. Layer 1 covers cost/capability/market/pressure only.
5. Do NOT produce generic platitudes. "Executive sponsorship is important" is not an assumption — it is a truism.

Return a JSON object with this exact shape:
{
  "assumptions": [
    {
      "type": "cost" | "capability" | "market" | "pressure",
      "statement": "string — the assumption in plain English",
      "basis": "self_declared" | "assessed" | "benchmark_default" | "calculated",
      "sourceRef": "string — specific field or benchmark",
      "strength": "strong" | "moderate" | "weak" | "unverified",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

No other text. No markdown fences.`;

  const userContent = `Initiative: ${initiativeTitle}
Description: ${initiativeDescription}

Organisation context:
${orgContextSummary}`;

  let rawResponse = "";
  let assumptions: Layer1Assumption[] = [];

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });
    const rawContent = response.choices?.[0]?.message?.content;
    rawResponse = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "");
    const cleaned = rawResponse.replace(/```json?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const raw: unknown[] = Array.isArray(parsed?.assumptions) ? parsed.assumptions : [];

    assumptions = raw
      .filter(
        (a): a is Layer1Assumption =>
          typeof a === "object" &&
          a !== null &&
          ["cost", "capability", "market", "pressure"].includes((a as Layer1Assumption).type) &&
          typeof (a as Layer1Assumption).statement === "string"
      )
      .slice(0, 12); // hard cap: max 3 per type × 4 types
  } catch {
    // Layer 1 failure is non-fatal: the engine proceeds to Layer 2 with empty Layer 1 output.
    // The no-coverage flag still fires if the library also has no entry.
    rawResponse = "Layer 1 LLM call failed";
  }

  return { assumptions, rawResponse };
}

// ─── Layer 2 — Precondition library lookup ────────────────────────────────────

function runLayer2(initiativeId: string): {
  preconditionAssumptions: Array<{
    statement: string;
    rationale: string;
    sourceRef: string;
    strength: AssumptionStrength;
    severity: string;
  }>;
  hasCoverage: boolean;
} {
  const entries = getPreconditionsForInitiative(initiativeId);
  const hasCoverage = hasPreconditionCoverage(initiativeId);

  const preconditionAssumptions = entries.map((entry) => ({
    statement: entry.statement,
    rationale: entry.whyItKills,
    sourceRef: `precondition_library:${entry.id}`,
    // Preconditions are always "unverified" until the user confirms them.
    // They are retrieved from the library, not derived from org context.
    strength: "unverified" as AssumptionStrength,
    severity: entry.severity,
  }));

  return { preconditionAssumptions, hasCoverage };
}

// ─── Org context summary builder ─────────────────────────────────────────────

function buildOrgContextSummary(backgroundInputs: Record<string, unknown>): string {
  // Extract the most relevant fields for assumption derivation.
  // This is a condensed summary — not the full JSON dump.
  const lines: string[] = [];

  const si = backgroundInputs as Record<string, Record<string, unknown>>;

  const sectionA = si.sectionA ?? {};
  if (sectionA.totalHeadcount) lines.push(`Headcount: ${sectionA.totalHeadcount}`);
  if (sectionA.sector) lines.push(`Sector: ${sectionA.sector}`);
  if (sectionA.ukSitesCount) lines.push(`UK sites: ${sectionA.ukSitesCount}`);
  if (sectionA.sectorSpecificRegulation) lines.push(`Regulatory environment: ${sectionA.sectorSpecificRegulation}`);

  const sectionB = si.sectionB ?? {};
  if (sectionB.hrSubFunctions) lines.push(`HR sub-functions in scope: ${JSON.stringify(sectionB.hrSubFunctions)}`);

  const sectionC = si.sectionC ?? {};
  if (sectionC.dataQualityRating) lines.push(`HR data quality: ${sectionC.dataQualityRating}`);
  if (sectionC.hrSystemIntegrationMaturity) lines.push(`HR system integration: ${sectionC.hrSystemIntegrationMaturity}`);
  if (sectionC.yearsOfHrisData) lines.push(`Years of HRIS data: ${sectionC.yearsOfHrisData}`);
  if (sectionC.atsSystem) lines.push(`ATS system: ${sectionC.atsSystem}`);
  if (sectionC.workforceDigitalAccess) lines.push(`Workforce digital access: ${sectionC.workforceDigitalAccess}`);

  const sectionD = si.sectionD ?? {};
  if (sectionD.annualHires) lines.push(`Annual hires: ${sectionD.annualHires}`);
  if (sectionD.attritionRate) lines.push(`Attrition rate: ${sectionD.attritionRate}%`);
  if (sectionD.annualLDSpend) lines.push(`Annual L&D spend: £${sectionD.annualLDSpend}k`);
  if (sectionD.costPerExternalHire) lines.push(`Cost per external hire: £${sectionD.costPerExternalHire}`);

  const sectionF = si.sectionF ?? {};
  if (sectionF.changeReadiness) lines.push(`Change readiness: ${sectionF.changeReadiness}`);

  const sectionI = si.sectionI ?? {};
  if (sectionI.businessDirectionType) lines.push(`Business direction: ${sectionI.businessDirectionType}`);
  if (sectionI.skillsFrameworkStatus) lines.push(`Skills framework: ${sectionI.skillsFrameworkStatus}`);
  if (sectionI.workforceComposition) lines.push(`Workforce composition: ${sectionI.workforceComposition}`);
  if (sectionI.managerCapabilityForInsights) lines.push(`Manager capability: ${sectionI.managerCapabilityForInsights}`);
  if (sectionI.pivotalJobFamilies) lines.push(`Pivotal job families: ${sectionI.pivotalJobFamilies}`);

  return lines.length > 0 ? lines.join("\n") : "No detailed org context available.";
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const assumptionsRouter = router({

  /**
   * decomposeInitiative — runs Layer 1 + Layer 2 for a given initiative.
   *
   * Layer 1: LLM derives cost/capability/market/pressure assumptions from org context.
   * Layer 2: Deterministic library lookup for preconditions.
   *
   * If the library has no entry for the initiative's preconditions, emits a
   * PRECONDITION_COVERAGE_GAP marker — independent of Layer 1 output.
   *
   * Writes all assumptions to the `assumption` table and returns the full set.
   */
  decomposeInitiative: cpoProcedure
    .input(
      z.object({
        initiativeId: z.string().uuid(),   // initiative.id (the DB row UUID)
        sourceSlug: z.string().optional(), // e.g. "cr_pay_equity" — used for library lookup
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. Load the initiative row
      const [initiativeRow] = await db
        .select()
        .from(initiative)
        .where(
          and(
            eq(initiative.id, input.initiativeId),
            eq(initiative.tenantId, ctx.user.tenantId)
          )
        )
        .limit(1);

      if (!initiativeRow) {
        throw new Error("Initiative not found");
      }

      // 2. Determine the library slug for lookup
      const slug = input.sourceSlug ?? initiativeRow.sourceSlug ?? "";

      // 3. Load library definition for title/description if available
      const libraryDef = slug ? getLibraryInitiative(slug) : null;
      const title = initiativeRow.title ?? libraryDef?.label ?? "Unknown initiative";
      const description = initiativeRow.description ?? libraryDef?.description ?? "";

      // 4. Load org context (background inputs JSON from the tenant's strategy)
      const [orgContextRow] = await db
        .select({ backgroundInputsJson: ailOrgContext.backgroundInputsJson })
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);

      const backgroundInputs: Record<string, unknown> =
        orgContextRow?.backgroundInputsJson
          ? JSON.parse(orgContextRow.backgroundInputsJson)
          : {};

      const orgContextSummary = buildOrgContextSummary(backgroundInputs);

      // 5. Layer 1 — LLM derivation
      const layer1 = await runLayer1(slug, title, description, orgContextSummary);

      // 6. Layer 2 — Precondition library lookup
      const layer2 = runLayer2(slug);

      // 7. Delete any existing assumptions for this initiative (idempotent re-decompose)
      await db
        .delete(assumption)
        .where(
          and(
            eq(assumption.initiativeId, input.initiativeId),
            eq(assumption.tenantId, ctx.user.tenantId)
          )
        );

      // 8. Insert Layer 1 assumptions
      const now = new Date();
      const insertedAssumptions = [];

      for (const a of layer1.assumptions) {
        const id = randomUUID();
        await db.insert(assumption).values({
          id,
          tenantId: ctx.user.tenantId,
          initiativeId: input.initiativeId,
          type: a.type,
          statement: a.statement,
          basis: a.basis,
          sourceRef: a.sourceRef ?? null,
          strength: a.strength,
          confidence: a.confidence,
          aiDrafted: true,
          rationale: null,
          createdAt: now,
          updatedAt: now,
        });
        insertedAssumptions.push({ id, type: a.type, statement: a.statement, confidence: a.confidence });
      }

      // 9. Insert Layer 2 precondition assumptions
      for (const p of layer2.preconditionAssumptions) {
        const id = randomUUID();
        await db.insert(assumption).values({
          id,
          tenantId: ctx.user.tenantId,
          initiativeId: input.initiativeId,
          type: "precondition",
          statement: p.statement,
          basis: "ai_drafted",
          sourceRef: p.sourceRef,
          strength: "unverified",
          confidence: "low",  // preconditions always start at low confidence — user must confirm
          aiDrafted: true,
          rationale: p.rationale,
          createdAt: now,
          updatedAt: now,
        });
        insertedAssumptions.push({ id, type: "precondition", statement: p.statement, confidence: "low" });
      }

      // 10. Determine the no-coverage flag
      // TIGHTENING: the flag fires on absent precondition-type coverage specifically,
      // independent of whether Layer 1 produced cost/capability/market/pressure assumptions.
      const preconditionCoverageGap = !layer2.hasCoverage;

      return {
        initiativeId: input.initiativeId,
        initiativeTitle: title,
        layer1AssumptionCount: layer1.assumptions.length,
        layer2PreconditionCount: layer2.preconditionAssumptions.length,
        preconditionCoverageGap,
        // When true: the library has no entry for this initiative's preconditions.
        // This must be surfaced to the user as an explicit gap — NOT as "no preconditions required."
        preconditionCoverageGapMessage: preconditionCoverageGap
          ? `No precondition coverage exists in the library for this initiative (${slug || input.initiativeId}). ` +
            `This does not mean no preconditions exist — it means the library has not yet been curated for this initiative. ` +
            `Review the initiative's prerequisites manually before proceeding.`
          : null,
        assumptions: insertedAssumptions,
        // The assumption with the lowest confidence — surfaced first for user confirmation.
        leastConfidentAssumptionId:
          insertedAssumptions.find((a) => a.confidence === "low")?.id ??
          insertedAssumptions.find((a) => a.confidence === "medium")?.id ??
          insertedAssumptions[0]?.id ??
          null,
      };
    }),

  /**
   * getAssumptions — returns all assumptions for an initiative,
   * ordered by type then confidence ascending (least confident first).
   */
  getAssumptions: cpoProcedure
    .input(z.object({ initiativeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(assumption)
        .where(
          and(
            eq(assumption.initiativeId, input.initiativeId),
            eq(assumption.tenantId, ctx.user.tenantId)
          )
        );

      // Sort: preconditions first (they are the most critical), then by confidence ascending
      const confidenceOrder: Record<string, number> = { low: 0, medium: 1, high: 2 };
      const typeOrder: Record<string, number> = {
        precondition: 0,
        cost: 1,
        capability: 2,
        market: 3,
        pressure: 4,
      };

      return rows.sort((a, b) => {
        const typeA = typeOrder[a.type] ?? 99;
        const typeB = typeOrder[b.type] ?? 99;
        if (typeA !== typeB) return typeA - typeB;
        return (confidenceOrder[a.confidence] ?? 99) - (confidenceOrder[b.confidence] ?? 99);
      });
    }),

  /**
   * confirmAssumption — sets ownedAt, optionally updates statement, sets basis to user_confirmed.
   */
  confirmAssumption: cpoProcedure
    .input(
      z.object({
        assumptionId: z.string().uuid(),
        statement: z.string().optional(), // if provided, replaces the engine-drafted statement
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const now = new Date();

      await db
        .update(assumption)
        .set({
          ownedAt: now,
          basis: "user_confirmed",
          aiDrafted: false,
          ...(input.statement ? { statement: input.statement } : {}),
          updatedAt: now,
        })
        .where(
          and(
            eq(assumption.id, input.assumptionId),
            eq(assumption.tenantId, ctx.user.tenantId)
          )
        );

      return { assumptionId: input.assumptionId, confirmedAt: now };
    }),

  /**
   * getDecompositionStatus — returns a summary of assumption coverage for an initiative,
   * including whether a precondition coverage gap exists.
   * Used by the gate test to inspect engine output without running a full decompose.
   */
  getDecompositionStatus: cpoProcedure
    .input(z.object({ initiativeId: z.string().uuid(), sourceSlug: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rows = await db
        .select()
        .from(assumption)
        .where(
          and(
            eq(assumption.initiativeId, input.initiativeId),
            eq(assumption.tenantId, ctx.user.tenantId)
          )
        );

      const slug = input.sourceSlug ?? "";
      const preconditionCoverageGap = slug ? !hasPreconditionCoverage(slug) : false;

      const byType = {
        cost: rows.filter((r) => r.type === "cost"),
        capability: rows.filter((r) => r.type === "capability"),
        market: rows.filter((r) => r.type === "market"),
        pressure: rows.filter((r) => r.type === "pressure"),
        precondition: rows.filter((r) => r.type === "precondition"),
      };

      return {
        initiativeId: input.initiativeId,
        sourceSlug: slug,
        totalAssumptions: rows.length,
        byType: {
          cost: byType.cost.length,
          capability: byType.capability.length,
          market: byType.market.length,
          pressure: byType.pressure.length,
          precondition: byType.precondition.length,
        },
        preconditionCoverageGap,
        preconditionCoverageGapMessage: preconditionCoverageGap
          ? `No precondition coverage exists in the library for initiative "${slug}". ` +
            `This does not mean no preconditions exist — it means the library has not yet been curated for this initiative. ` +
            `Review the initiative's prerequisites manually before proceeding.`
          : null,
        confirmedCount: rows.filter((r) => r.ownedAt !== null).length,
        unconfirmedCount: rows.filter((r) => r.ownedAt === null).length,
        leastConfidentUnconfirmed: rows
          .filter((r) => r.ownedAt === null)
          .sort((a, b) => {
            const order: Record<string, number> = { low: 0, medium: 1, high: 2 };
            return (order[a.confidence] ?? 99) - (order[b.confidence] ?? 99);
          })[0] ?? null,
      };
    }),
});
