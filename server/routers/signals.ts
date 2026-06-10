/**
 * Phase D — Signals Router
 *
 * Implements the signal matching engine:
 *   - createSignal: founder-side ingestion of external developments
 *   - approveSignal: founder sets founderApproved=true (gate before client surfacing)
 *   - matchSignalToTenant: runs the matching engine for one signal × one tenant's assumptions
 *   - listActiveMatches: returns active (non-dismissed) signal matches for the current tenant
 *   - dismissMatch: marks a match dismissed with a reason
 *   - listSignals: founder-side list of all signals
 *
 * Architecture (three-part, locked):
 *   1. LLM targeted-precondition pass — surfaces common regulatory/legal baseline
 *   2. Founder-curated library — initiative-specific killers the LLM reliably misses
 *   3. Mandatory human review — no match reaches a board-facing context unconfirmed
 *
 * The founderApproved gate: no client (tenant) ever sees a signal with founderApproved=false.
 * The dedup rule: application-level, not a UNIQUE constraint (to support re-fire after
 * assumption text change). See dedupCheck() below.
 */

import { z } from "zod";
import { router, cpoProcedure as protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { nanoid } from "nanoid";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import {
  signal,
  signalMatch,
  assumption,
  initiative,
  strategyRefreshSuggestions,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchedAssumption {
  assumptionId: string;
  initiativeId: string;
  assumptionStatement: string;
  matchRationale: string;
  citedSourceUrl: string | null;
  confidenceLevel: "high" | "medium" | "low";
}

interface MatchingResult {
  matched: MatchedAssumption[];
  rawResponse: string;
  jurisdictionSilent: boolean;
  jurisdictionNote: string | null;
}

// ─── Matching engine ──────────────────────────────────────────────────────────

/**
 * runMatchingEngine — calls the LLM with the signal + all tenant assumptions.
 *
 * The system prompt is the "targeted precondition pass" configuration from Phase C:
 * explicit precondition-hunting, jurisdiction-aware, rationale-quality enforced.
 *
 * Returns only fired matches (affected assumptions). Absence = no impact.
 */
async function runMatchingEngine(
  signalTitle: string,
  signalSummary: string,
  signalCategory: string,
  signalSourceUrl: string | null,
  tenantAssumptions: Array<{
    id: string;
    initiativeId: string;
    initiativeTitle: string;
    type: string;
    statement: string;
  }>,
  tenantJurisdiction: string
): Promise<MatchingResult> {
  if (tenantAssumptions.length === 0) {
    return {
      matched: [],
      rawResponse: "No assumptions to match against.",
      jurisdictionSilent: false,
      jurisdictionNote: null,
    };
  }

  const assumptionList = tenantAssumptions
    .map(
      (a, i) =>
        `[${i + 1}] ID:${a.id} | Initiative:"${a.initiativeTitle}" | Type:${a.type}\n    Statement: ${a.statement}`
    )
    .join("\n\n");

  const systemPrompt = `You are a senior HR strategy analyst performing a signal-to-assumption matching review.

Your task: given an external development (signal) and a list of named assumptions from an organisation's HR AI strategy, identify ONLY the assumptions whose BASIS is directly changed by this signal.

THE DIRECTNESS THRESHOLD — this is the single gate every potential match must pass:

  Fire ONLY when the signal changes the basis of the named assumption — the regulatory obligation, the legal fact, the contractual condition, or the specific input the assumption is actually ABOUT.

  Do NOT fire when you can construct a multi-hop chain: "this signal → could affect X → which could affect Y → which could affect the assumption." Adjacency plus a plausible causal chain is NOT a match. The signal must bear directly on what the assumption is about.

Examples of the threshold applied:
  PASS: Union-access law strengthened → directly changes the probability landscape of an assumption about union agreement being obtainable. The assumption IS about union agreement.
  PASS: ICO guidance on automated decision-making → directly changes the regulatory obligation an assumption is about. The assumption IS about that obligation.
  FAIL: Interest rate hold → "rates → budget pressure → team capacity" chain. The assumption is about team capacity, not about interest rates. The signal does not change what the assumption is about.
  FAIL: Rail timetable change → "commute disruption → employee resistance" chain. The assumption is about scheduling constraints, not about rail timetables. The signal does not change what the assumption is about.
  FAIL: LLM failure rate research → "model reliability → data quality assumptions." Model reliability is not data quality. The signal does not change what a data quality assumption is about. (Exception: if the assumption is explicitly about model output reliability, it may pass.)

ADDITIONAL RULES:
1. JURISDICTION FIRST. The organisation is ${tenantJurisdiction}. Before firing on any regulatory or legal signal, confirm the signal applies to this jurisdiction. If it is EU-only, US-only, or otherwise out of scope, return an empty matches array with a jurisdictionNote explaining why. Do NOT fire a flat threat with no jurisdiction check.
2. SPECIFICITY. A match must name the specific assumption text and explain the specific mechanism by which this signal changes its basis. "GDPR compliance" is not a rationale. "UK GDPR Art. 22 meaningful human review requirement now requires override authority, which directly changes the basis of the assumption that [specific text]" is a rationale.
3. FIRED-ONLY. Return only assumptions that pass the directness threshold. If no assumption passes, return an empty matches array. Silence is the correct answer for topically-adjacent but non-direct signals.
4. CONFIDENCE. Assign confidenceLevel: "high" (signal directly changes the assumption's basis with no inferential steps), "medium" (one clear inferential step, still direct), "low" (two inferential steps — consider whether this passes the threshold at all).
5. citedSourceUrl: use the signal's source URL if the match is specific to that source. Leave null if not applicable.

Return a JSON object with this exact shape:
{
  "jurisdictionSilent": false,
  "jurisdictionNote": null,
  "matches": [
    {
      "assumptionId": "uuid-string",
      "matchRationale": "string — specific mechanism, names the assumption and the signal's specific effect",
      "citedSourceUrl": "string or null",
      "confidenceLevel": "high" | "medium" | "low"
    }
  ]
}

If the signal is out of jurisdiction, return:
{
  "jurisdictionSilent": true,
  "jurisdictionNote": "string — why this signal does not apply to ${tenantJurisdiction}",
  "matches": []
}

No other text. No markdown fences.`;

  const userContent = `Signal: ${signalTitle}
Category: ${signalCategory}
Summary: ${signalSummary}
Source: ${signalSourceUrl ?? "not provided"}

Assumptions to evaluate (${tenantAssumptions.length} total):
${assumptionList}`;

  let rawResponse = "";
  let matched: MatchedAssumption[] = [];
  let jurisdictionSilent = false;
  let jurisdictionNote: string | null = null;

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

    jurisdictionSilent = parsed?.jurisdictionSilent === true;
    jurisdictionNote = typeof parsed?.jurisdictionNote === "string" ? parsed.jurisdictionNote : null;

    const rawMatches: unknown[] = Array.isArray(parsed?.matches) ? parsed.matches : [];

    // Validate and enrich each match with the full assumption context
    for (const m of rawMatches) {
      if (
        typeof m !== "object" ||
        m === null ||
        typeof (m as Record<string, unknown>).assumptionId !== "string" ||
        typeof (m as Record<string, unknown>).matchRationale !== "string"
      ) {
        continue;
      }
      const raw = m as Record<string, unknown>;
      const assumptionId = raw.assumptionId as string;
      const found = tenantAssumptions.find((a) => a.id === assumptionId);
      if (!found) continue; // LLM hallucinated an ID — discard

      matched.push({
        assumptionId,
        initiativeId: found.initiativeId,
        assumptionStatement: found.statement,
        matchRationale: raw.matchRationale as string,
        citedSourceUrl: typeof raw.citedSourceUrl === "string" ? raw.citedSourceUrl : null,
        confidenceLevel: (["high", "medium", "low"].includes(raw.confidenceLevel as string)
          ? raw.confidenceLevel
          : "medium") as "high" | "medium" | "low",
      });
    }
  } catch {
    rawResponse = "Matching engine LLM call failed";
  }

  return { matched, rawResponse, jurisdictionSilent, jurisdictionNote };
}

/**
 * dedupCheck — application-level dedup before inserting a signal_match row.
 *
 * Rules (locked in Phase D schema spec):
 *   - No prior match → allow insert
 *   - Active match exists (dismissedAt IS NULL) → suppress
 *   - Dismissed match, assumption text unchanged → suppress (same class)
 *   - Dismissed match, assumption text changed → allow (materially new situation)
 */
async function dedupCheck(
  db: Awaited<ReturnType<typeof getDb>>,
  signalId: string,
  assumptionId: string,
  tenantId: string,
  currentAssumptionText: string
): Promise<"allow" | "suppress_active" | "suppress_same_class"> {
  if (!db) return "allow";

  const existing = await db
    .select({
      id: signalMatch.id,
      dismissedAt: signalMatch.dismissedAt,
      assumptionTextAtMatch: signalMatch.assumptionTextAtMatch,
    })
    .from(signalMatch)
    .where(
      and(
        eq(signalMatch.signalId, signalId),
        eq(signalMatch.assumptionId, assumptionId),
        eq(signalMatch.tenantId, tenantId)
      )
    )
    .orderBy(desc(signalMatch.createdAt))
    .limit(1);

  if (existing.length === 0) return "allow";

  const prior = existing[0];

  // Active match — suppress
  if (!prior.dismissedAt) return "suppress_active";

  // Dismissed — check if assumption text has changed
  if (prior.assumptionTextAtMatch === currentAssumptionText) {
    return "suppress_same_class";
  }

  // Dismissed + assumption text changed → allow re-fire
  return "allow";
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const signalsRouter = router({

  /**
   * createSignal — founder ingests an external development.
   * founderApproved defaults to false; must be explicitly approved before client surfacing.
   */
  createSignal: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        summary: z.string().min(1),
        sourceUrl: z.string().url().optional(),
        sourceLabel: z.string().max(300).optional(),
        asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
        category: z.enum(["regulatory", "market", "research", "technology", "geopolitical", "other"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const id = nanoid();
      await db.insert(signal).values({
        id,
        title: input.title,
        summary: input.summary,
        sourceUrl: input.sourceUrl ?? null,
        sourceLabel: input.sourceLabel ?? null,
        asOfDate: input.asOfDate ?? null,
        category: input.category,
        founderApproved: false,
      });

      return { id, ok: true };
    }),

  /**
   * approveSignal — founder approves a signal for client surfacing.
   * This is the founderApproved gate: no tenant sees a signal until this is called.
   */
  approveSignal: protectedProcedure
    .input(z.object({ signalId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .update(signal)
        .set({ founderApproved: true, updatedAt: new Date() })
        .where(eq(signal.id, input.signalId));

      return { ok: true };
    }),

  /**
   * listSignals — founder-side list of all signals (approved and unapproved).
   * Clients only see approved signals via listActiveMatches.
   */
  listSignals: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const rows = await db
        .select()
        .from(signal)
        .orderBy(desc(signal.createdAt));

      return rows;
    }),

  /**
   * matchSignalToTenant — runs the matching engine for one signal × one tenant's assumptions.
   *
   * Steps:
   *   1. Load the signal (must be founderApproved)
   *   2. Load all confirmed/active assumptions for the tenant
   *   3. Run the LLM matching engine
   *   4. For each fired match: run dedup check, insert if allowed
   *   5. For each inserted match: create a strategy_refresh_suggestion (external_signal type)
   *   6. Return the full result including raw LLM output (for gate pasting)
   */
  matchSignalToTenant: protectedProcedure
    .input(
      z.object({
        signalId: z.string(),
        tenantJurisdiction: z.string().default("UK-domestic"),
        // For gate testing: allow passing a specific tenantId override (admin only)
        tenantIdOverride: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const tenantId = input.tenantIdOverride ?? ctx.user.tenantId;

      // 1. Load and validate the signal
      const [signalRow] = await db
        .select()
        .from(signal)
        .where(eq(signal.id, input.signalId))
        .limit(1);

      if (!signalRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Signal not found" });
      }
      if (!signalRow.founderApproved) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Signal has not been founder-approved. Approve it before running the matcher.",
        });
      }

      // 2. Load all assumptions for this tenant, joined with initiative title
      const assumptionRows = await db
        .select({
          id: assumption.id,
          initiativeId: assumption.initiativeId,
          type: assumption.type,
          statement: assumption.statement,
          initiativeTitle: initiative.title,
        })
        .from(assumption)
        .innerJoin(initiative, eq(assumption.initiativeId, initiative.id))
        .where(eq(assumption.tenantId, tenantId));

      // 3. Run matching engine
      const result = await runMatchingEngine(
        signalRow.title,
        signalRow.summary,
        signalRow.category,
        signalRow.sourceUrl ?? null,
        assumptionRows.map((r) => ({
          id: r.id,
          initiativeId: r.initiativeId,
          initiativeTitle: r.initiativeTitle ?? "Unknown initiative",
          type: r.type,
          statement: r.statement,
        })),
        input.tenantJurisdiction
      );

      // 4. Process fired matches with dedup
      const now = new Date();
      const insertedMatches: Array<{
        matchId: string;
        assumptionId: string;
        initiativeId: string;
        dedupResult: string;
        confidenceLevel: string;
      }> = [];

      for (const m of result.matched) {
        const dedupResult = await dedupCheck(db, input.signalId, m.assumptionId, tenantId, m.assumptionStatement);

        if (dedupResult !== "allow") {
          insertedMatches.push({
            matchId: "(suppressed)",
            assumptionId: m.assumptionId,
            initiativeId: m.initiativeId,
            dedupResult,
            confidenceLevel: m.confidenceLevel,
          });
          continue;
        }

        // 5. Create a refresh suggestion for this match
        const suggestionId = nanoid();
        await db.insert(strategyRefreshSuggestions).values({
          id: suggestionId,
          tenantId,
          triggerType: "external_signal",
          triggerDetail: `Signal: ${signalRow.title} — ${m.matchRationale.slice(0, 200)}`,
          status: "pending",
        });

        // 6. Insert the signal_match row
        const matchId = nanoid();
        await db.insert(signalMatch).values({
          id: matchId,
          signalId: input.signalId,
          assumptionId: m.assumptionId,
          initiativeId: m.initiativeId,
          tenantId,
          matchRationale: m.matchRationale,
          assumptionTextAtMatch: m.assumptionStatement,
          citedSourceUrl: m.citedSourceUrl ?? null,
          confidenceLevel: m.confidenceLevel,
          refreshSuggestionId: suggestionId,
          dismissedAt: null,
          dismissReason: null,
          dismissedByUserId: null,
          createdAt: now,
          updatedAt: now,
        });

        insertedMatches.push({
          matchId,
          assumptionId: m.assumptionId,
          initiativeId: m.initiativeId,
          dedupResult: "inserted",
          confidenceLevel: m.confidenceLevel,
        });
      }

      return {
        signalId: input.signalId,
        signalTitle: signalRow.title,
        tenantId,
        jurisdictionSilent: result.jurisdictionSilent,
        jurisdictionNote: result.jurisdictionNote,
        firedMatchCount: result.matched.length,
        insertedMatchCount: insertedMatches.filter((m) => m.dedupResult === "inserted").length,
        suppressedMatchCount: insertedMatches.filter((m) => m.dedupResult !== "inserted").length,
        matches: insertedMatches,
        // Raw LLM output — included for gate pasting and audit
        rawLLMOutput: result.rawResponse,
      };
    }),

  /**
   * listActiveMatches — returns active (non-dismissed) signal matches for the current tenant.
   * Only returns matches where the signal is founderApproved.
   */
  listActiveMatches: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const rows = await db
        .select({
          matchId: signalMatch.id,
          signalId: signalMatch.signalId,
          signalTitle: signal.title,
          signalCategory: signal.category,
          signalSourceUrl: signal.sourceUrl,
          signalAsOfDate: signal.asOfDate,
          assumptionId: signalMatch.assumptionId,
          initiativeId: signalMatch.initiativeId,
          matchRationale: signalMatch.matchRationale,
          confidenceLevel: signalMatch.confidenceLevel,
          citedSourceUrl: signalMatch.citedSourceUrl,
          refreshSuggestionId: signalMatch.refreshSuggestionId,
          createdAt: signalMatch.createdAt,
        })
        .from(signalMatch)
        .innerJoin(signal, eq(signalMatch.signalId, signal.id))
        .where(
          and(
            eq(signalMatch.tenantId, ctx.user.tenantId),
            isNull(signalMatch.dismissedAt),
            // founderApproved gate: clients never see unapproved signals
            eq(signal.founderApproved, true)
          )
        )
        .orderBy(desc(signalMatch.createdAt));

      return rows;
    }),

  /**
   * dismissMatch — marks a match dismissed with a reason.
   * The dismissReason is stored for the dedup re-fire check.
   */
  dismissMatch: protectedProcedure
    .input(
      z.object({
        matchId: z.string(),
        dismissReason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .update(signalMatch)
        .set({
          dismissedAt: new Date(),
          dismissReason: input.dismissReason,
          dismissedByUserId: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(signalMatch.id, input.matchId),
            eq(signalMatch.tenantId, ctx.user.tenantId),
            isNull(signalMatch.dismissedAt) // only dismiss active matches
          )
        );

      return { ok: true };
    }),

  /**
   * getMatchesForSignal — returns all matches (active + dismissed) for a signal.
   * Founder-side audit view.
   */
  getMatchesForSignal: protectedProcedure
    .input(z.object({ signalId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const rows = await db
        .select()
        .from(signalMatch)
        .where(eq(signalMatch.signalId, input.signalId))
        .orderBy(desc(signalMatch.createdAt));

      return rows;
    }),
});
