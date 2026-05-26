/**
 * Reward Stage 4 — Principles + Won't-dos Router
 *
 * Procedures:
 *   get                   — fetch current principles state
 *   getStatus             — returns { strategyConfirmed, principlesState, canStart }
 *   save                  — autosave principles + wont_dos arrays
 *   generate              — AI-generate initial set from Stage 1+2+3 inputs
 *   affordance            — apply affordance to a specific principle or won't-do
 *   suggestPrinciple      — suggest an additional principle
 *   suggestWontDo         — suggest an additional won't-do
 *   regenerateSuggestions — regenerate full canonical set, preserving edited/custom items
 *   confirm               — mark principles as confirmed
 *   markStale             — called when Stage 3 changes
 *   keepAsIs              — resolve stale banner without changes
 *   getTemplates          — return canonical principle + won't-do templates for selector
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  rewardPrework,
  companyProfile,
  rewardVision,
  rewardStrategy,
  rewardPrinciples,
  rewardPrincipleTemplates,
  rewardWontDoTemplates,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import { VOCAB_BLACKLIST, sanitizeOutput as enforceVocab } from "../../shared/vocabBlacklist";

// ── Token overlap similarity (for unlink threshold §5.8) ─────────────────────
function tokenOverlap(a: string, b: string): number {
  const tokenize = (s: string): Set<string> =>
    new Set<string>(s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean));
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (!setA.size || !setB.size) return 0;
  let overlap = 0;
  setA.forEach(t => { if (setB.has(t)) overlap++; });
  return overlap / Math.max(setA.size, setB.size);
}

// ── Principle/won't-do item types ─────────────────────────────────────────────
interface PrincipleItem {
  id: string;
  principleId: string | null;
  text: string;
  source: "ai_suggested" | "canonical_selected" | "custom";
  aiGeneratedOriginal: string;
  selected: boolean;
}
interface WontDoItem {
  id: string;
  wontDoId: string | null;
  text: string;
  source: "ai_suggested" | "canonical_selected" | "custom";
  aiGeneratedOriginal: string;
  selected: boolean;
}

// ── Build context string ──────────────────────────────────────────────────────
async function buildContext(tenantId: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

  const [profile] = await db.select().from(companyProfile).where(eq(companyProfile.tenantId, tenantId));
  const [prework] = await db.select().from(rewardPrework).where(eq(rewardPrework.tenantId, tenantId));
  const [vision] = await db.select({ visionText: rewardVision.visionText }).from(rewardVision).where(eq(rewardVision.tenantId, tenantId));
  const [strategy] = await db.select({ strategicShiftsJson: rewardStrategy.strategicShiftsJson }).from(rewardStrategy).where(eq(rewardStrategy.tenantId, tenantId));

  const parts: string[] = [];

  if (profile) {
    parts.push(`Company: ${profile.companyName ?? "Unknown"}`);
    if (profile.sector) parts.push(`Sector: ${profile.sector}`);
    if (profile.ownershipStructure) parts.push(`Ownership: ${profile.ownershipStructure}`);
    if (profile.ukEmployeeHeadcount) parts.push(`Headcount: ~${profile.ukEmployeeHeadcount}`);
  }
  if (prework) {
    if (prework.rewardAiAmbition) parts.push(`Reward AI ambition: ${prework.rewardAiAmbition}/4`);
    if (prework.aiMaturityInRewardToday) parts.push(`AI maturity today: ${prework.aiMaturityInRewardToday}/4`);
    if (prework.primaryTriggerForRewardAiStrategy) parts.push(`Primary trigger: ${prework.primaryTriggerForRewardAiStrategy}`);
    const prio = prework.topRewardPrioritiesNext12Months as string[] | null;
    if (prio?.length) parts.push(`Top priorities: ${prio.join(", ")}`);
    if (prework.unionWorksCouncilCoverage) parts.push(`Union/works council: ${prework.unionWorksCouncilCoverage}`);
  }
  if (vision?.visionText) {
    parts.push(`\nConfirmed vision:\n${vision.visionText}`);
  }
  if (strategy?.strategicShiftsJson) {
    const shifts = strategy.strategicShiftsJson as Array<{ text: string }>;
    if (shifts.length) {
      parts.push(`\nConfirmed strategic shifts:\n${shifts.map(s => `- ${s.text}`).join("\n")}`);
    }
  }

  return parts.join("\n");
}

// ── Router ────────────────────────────────────────────────────────────────────

export const rewardPrinciplesRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const [principles] = await db
      .select()
      .from(rewardPrinciples)
      .where(eq(rewardPrinciples.tenantId, ctx.user.tenantId));
    return principles ?? null;
  }),

  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    const [strategy] = await db
      .select({ state: rewardStrategy.state })
      .from(rewardStrategy)
      .where(eq(rewardStrategy.tenantId, tenantId));

    const [principles] = await db
      .select({ state: rewardPrinciples.state })
      .from(rewardPrinciples)
      .where(eq(rewardPrinciples.tenantId, tenantId));

    const strategyConfirmed = strategy?.state === "confirmed" || strategy?.state === "stale";
    const principlesState = principles?.state ?? "unconfirmed";

    return {
      strategyConfirmed,
      principlesState,
      canStart: strategyConfirmed,
      canStartMessage: strategyConfirmed
        ? null
        : "Stage 3 Strategy must be confirmed before you can build your Principles.",
    };
  }),

  getTemplates: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const principles = await db.select().from(rewardPrincipleTemplates);
    const wontDos = await db.select().from(rewardWontDoTemplates);

    return { principles, wontDos };
  }),

  save: protectedProcedure
    .input(z.object({
      principles: z.array(z.object({
        id: z.string(),
        principleId: z.string().nullable(),
        text: z.string().max(500),
        source: z.enum(["ai_suggested", "canonical_selected", "custom"]),
        aiGeneratedOriginal: z.string().max(500),
        selected: z.boolean().default(false),
      })),
      wontDos: z.array(z.object({
        id: z.string(),
        wontDoId: z.string().nullable(),
        text: z.string().max(500),
        source: z.enum(["ai_suggested", "canonical_selected", "custom"]),
        aiGeneratedOriginal: z.string().max(500),
        selected: z.boolean().default(false),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;
      const now = Date.now();

      // Apply unlink threshold: if a principle's text has drifted < 40% token overlap
      // from its aiGeneratedOriginal, clear the principleId mapping
      const processedPrinciples = input.principles.map(p => {
        if (p.principleId && p.aiGeneratedOriginal) {
          const overlap = tokenOverlap(p.text, p.aiGeneratedOriginal);
          if (overlap < 0.4) {
            return { ...p, principleId: null, source: "custom" as const };
          }
        }
        return p;
      });

      const processedWontDos = input.wontDos.map(w => {
        if (w.wontDoId && w.aiGeneratedOriginal) {
          const overlap = tokenOverlap(w.text, w.aiGeneratedOriginal);
          if (overlap < 0.4) {
            return { ...w, wontDoId: null, source: "custom" as const };
          }
        }
        return w;
      });

      const [existing] = await db
        .select({ tenantId: rewardPrinciples.tenantId })
        .from(rewardPrinciples)
        .where(eq(rewardPrinciples.tenantId, tenantId));

      if (existing) {
        await db
          .update(rewardPrinciples)
          .set({ principlesJson: processedPrinciples, wontDosJson: processedWontDos, updatedAt: now })
          .where(eq(rewardPrinciples.tenantId, tenantId));
      } else {
        await db.insert(rewardPrinciples).values({
          tenantId,
          userId: ctx.user.id,
          principlesJson: processedPrinciples,
          wontDosJson: processedWontDos,
          state: "unconfirmed",
          updatedAt: now,
        });
      }

      // Return which items were unlinked (for UI transparency message)
      const unlinked = [
        ...processedPrinciples.filter((p, i) => p.principleId === null && input.principles[i].principleId !== null).map(p => p.id),
        ...processedWontDos.filter((w, i) => w.wontDoId === null && input.wontDos[i].wontDoId !== null).map(w => w.id),
      ];

      return { ok: true, unlinkedIds: unlinked };
    }),

  generate: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const context = await buildContext(tenantId);

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const principleTemplates = await db.select().from(rewardPrincipleTemplates);
    const wontDoTemplates = await db.select().from(rewardWontDoTemplates);

    const templateList = principleTemplates
      .map(t => `- [${t.principleId}] ${t.text}`)
      .join("\n");
    const wontDoList = wontDoTemplates
      .map(t => `- [${t.wontDoId}] ${t.text}`)
      .join("\n");

    const systemPrompt = `You are a senior Reward Director writing governance principles for a Reward AI strategy.
Write in direct, confident prose. Each principle is one clear sentence.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY a JSON object — no preamble, no markdown fences.
IMPORTANT: Do not restate the strategic shifts or vision. Express the governing rules they imply.`;

    const userPrompt = `Generate 4-6 principles and 2-4 won't-dos for this Reward AI strategy.

Context:
${context}

Available canonical principles (prefer these where they fit — use the exact principle_id):
${templateList}

Available canonical won't-dos (prefer these where they fit — use the exact wont_do_id):
${wontDoList}

Rules:
1. Each principle is one clear, direct sentence starting with "We" or a verb
2. Each won't-do starts with "We won't" or "We will not"
3. Where a canonical item fits, use its principle_id/wont_do_id and its text (you may adapt slightly)
4. Where no canonical item fits, create a custom item (principle_id: null)
5. Do NOT restate the vision or strategic shifts — express the governing rules they imply
6. Do NOT use blacklisted vocabulary

Output as JSON:
{
  "principles": [
    { "principleId": "pay_explainability" | null, "text": "...", "source": "ai_suggested" }
  ],
  "wontDos": [
    { "wontDoId": "no_full_automation" | null, "text": "...", "source": "ai_suggested" }
  ]
}`;

    let principles: PrincipleItem[] = [];
    let wontDos: WontDoItem[] = [];

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });
      const raw = (response.choices?.[0]?.message?.content as string | undefined) ?? "{}";
      const parsed = JSON.parse(raw);

      principles = (parsed.principles ?? []).map((p: { principleId?: string | null; text?: string; source?: string }) => ({
        id: randomUUID(),
        principleId: p.principleId ?? null,
        text: enforceVocab(p.text ?? ""),
        source: (p.source as PrincipleItem["source"]) ?? "ai_suggested",
        aiGeneratedOriginal: enforceVocab(p.text ?? ""),
        selected: false,
      }));

      wontDos = (parsed.wontDos ?? []).map((w: { wontDoId?: string | null; text?: string; source?: string }) => ({
        id: randomUUID(),
        wontDoId: w.wontDoId ?? null,
        text: enforceVocab(w.text ?? ""),
        source: (w.source as WontDoItem["source"]) ?? "ai_suggested",
        aiGeneratedOriginal: enforceVocab(w.text ?? ""),
        selected: false,
      }));
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AI generation failed. You can add principles manually.",
      });
    }

    if (!principles.length) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AI generation returned empty content. You can add principles manually.",
      });
    }

    const now = Date.now();
    const [existing] = await db
      .select({ tenantId: rewardPrinciples.tenantId })
      .from(rewardPrinciples)
      .where(eq(rewardPrinciples.tenantId, tenantId));

    if (existing) {
      await db
        .update(rewardPrinciples)
        .set({ principlesJson: principles, wontDosJson: wontDos, state: "unconfirmed", updatedAt: now })
        .where(eq(rewardPrinciples.tenantId, tenantId));
    } else {
      await db.insert(rewardPrinciples).values({
        tenantId,
        userId: ctx.user.id,
        principlesJson: principles,
        wontDosJson: wontDos,
        state: "unconfirmed",
        updatedAt: now,
      });
    }

    return { principles, wontDos };
  }),

  regenerateSuggestions: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    // Get current state to preserve edited/custom items
    const [current] = await db
      .select({ principlesJson: rewardPrinciples.principlesJson, wontDosJson: rewardPrinciples.wontDosJson })
      .from(rewardPrinciples)
      .where(eq(rewardPrinciples.tenantId, tenantId));

    const existingPrinciples = (current?.principlesJson as PrincipleItem[] | null) ?? [];
    const existingWontDos = (current?.wontDosJson as WontDoItem[] | null) ?? [];

    // Preserve items that have been edited (text differs from aiGeneratedOriginal) or are custom
    const preservedPrinciples = existingPrinciples.filter(p =>
      p.source === "custom" ||
      (p.aiGeneratedOriginal && p.text !== p.aiGeneratedOriginal)
    );
    const preservedWontDos = existingWontDos.filter(w =>
      w.source === "custom" ||
      (w.aiGeneratedOriginal && w.text !== w.aiGeneratedOriginal)
    );

    const context = await buildContext(tenantId);
    const principleTemplates = await db.select().from(rewardPrincipleTemplates);
    const wontDoTemplates = await db.select().from(rewardWontDoTemplates);

    const templateList = principleTemplates.map(t => `- [${t.principleId}] ${t.text}`).join("\n");
    const wontDoList = wontDoTemplates.map(t => `- [${t.wontDoId}] ${t.text}`).join("\n");

    const preservedPrincipleTexts = preservedPrinciples.map(p => `- ${p.text}`).join("\n");
    const preservedWontDoTexts = preservedWontDos.map(w => `- ${w.text}`).join("\n");

    const systemPrompt = `You are a senior Reward Director writing governance principles.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY a JSON object — no preamble, no markdown fences.
Do not restate the strategic shifts or vision.`;

    const userPrompt = `Regenerate principles and won't-dos for this Reward AI strategy.

Context:
${context}

${preservedPrincipleTexts ? `Already confirmed/edited principles (do NOT duplicate these):\n${preservedPrincipleTexts}\n` : ""}
${preservedWontDoTexts ? `Already confirmed/edited won't-dos (do NOT duplicate these):\n${preservedWontDoTexts}\n` : ""}

Available canonical principles:
${templateList}

Available canonical won't-dos:
${wontDoList}

Generate 4-6 principles and 2-4 won't-dos that complement the preserved items.
Output as JSON: { "principles": [...], "wontDos": [...] }`;

    let newPrinciples: PrincipleItem[] = [];
    let newWontDos: WontDoItem[] = [];

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });
      const raw = (response.choices?.[0]?.message?.content as string | undefined) ?? "{}";
      const parsed = JSON.parse(raw);

      newPrinciples = (parsed.principles ?? []).map((p: { principleId?: string | null; text?: string; source?: string }) => ({
        id: randomUUID(),
        principleId: p.principleId ?? null,
        text: enforceVocab(p.text ?? ""),
        source: "ai_suggested" as const,
        aiGeneratedOriginal: enforceVocab(p.text ?? ""),
        selected: false,
      }));

      newWontDos = (parsed.wontDos ?? []).map((w: { wontDoId?: string | null; text?: string }) => ({
        id: randomUUID(),
        wontDoId: w.wontDoId ?? null,
        text: enforceVocab(w.text ?? ""),
        source: "ai_suggested" as const,
        aiGeneratedOriginal: enforceVocab(w.text ?? ""),
        selected: false,
      }));
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AI regeneration failed. Your existing principles are preserved.",
      });
    }

    const mergedPrinciples = [...preservedPrinciples, ...newPrinciples];
    const mergedWontDos = [...preservedWontDos, ...newWontDos];

    const now = Date.now();
    const [existing] = await db
      .select({ tenantId: rewardPrinciples.tenantId })
      .from(rewardPrinciples)
      .where(eq(rewardPrinciples.tenantId, tenantId));

    if (existing) {
      await db
        .update(rewardPrinciples)
        .set({ principlesJson: mergedPrinciples, wontDosJson: mergedWontDos, updatedAt: now })
        .where(eq(rewardPrinciples.tenantId, tenantId));
    } else {
      await db.insert(rewardPrinciples).values({
        tenantId,
        userId: ctx.user.id,
        principlesJson: mergedPrinciples,
        wontDosJson: mergedWontDos,
        state: "unconfirmed",
        updatedAt: now,
      });
    }

    return { principles: mergedPrinciples, wontDos: mergedWontDos };
  }),

  affordance: protectedProcedure
    .input(z.object({
      affordance: z.enum(["expand", "refine", "challenge", "suggest"]),
      itemId: z.string(),
      currentText: z.string().max(500),
      itemType: z.enum(["principle", "wont_do"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const context = await buildContext(tenantId);

      const affordanceInstructions: Record<string, string> = {
        expand: input.itemType === "principle"
          ? "Elaborate on this principle — add specificity and make it more actionable."
          : "Elaborate on this won't-do — add specificity about what this means in practice.",
        refine: "Tighten this statement without changing its meaning. Make it more direct.",
        challenge: "Offer a constructive counter-perspective. What might be missing or overstated? Be constructive, not adversarial.",
        suggest: "Propose an alternative version that takes a different angle while staying true to the context.",
      };

      const systemPrompt = `You are a senior Reward Director reviewing governance principles.
Write in direct, confident prose. One sentence only.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY the result — no preamble, no labels, no markdown.`;

      const userPrompt = `Context:
${context}

Current ${input.itemType === "principle" ? "principle" : "won't-do"}:
${input.currentText}

Task: ${affordanceInstructions[input.affordance]}

Output the result now:`;

      let result: string;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        result = enforceVocab(((response.choices?.[0]?.message?.content as string | undefined) ?? "").trim());
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Couldn't apply that — please retry.",
        });
      }

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Couldn't apply that — please retry.",
        });
      }

      return { result };
    }),

  suggestPrinciple: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const context = await buildContext(tenantId);
    const [current] = await db
      .select({ principlesJson: rewardPrinciples.principlesJson })
      .from(rewardPrinciples)
      .where(eq(rewardPrinciples.tenantId, tenantId));

    const existing = (current?.principlesJson as PrincipleItem[] | null) ?? [];
    const existingTexts = existing.map(p => `- ${p.text}`).join("\n");

    const principleTemplates = await db.select().from(rewardPrincipleTemplates);
    const templateList = principleTemplates.map(t => `- [${t.principleId}] ${t.text}`).join("\n");

    const systemPrompt = `You are a senior Reward Director writing governance principles.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY a JSON object — no preamble, no markdown fences.`;

    const userPrompt = `Context:
${context}

Existing principles (do NOT repeat these):
${existingTexts}

Available canonical principles:
${templateList}

Suggest one additional principle that is meaningfully different from the existing ones.
Output as JSON: { "principleId": "..." | null, "text": "..." }`;

    let result: PrincipleItem;
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });
      const raw = (response.choices?.[0]?.message?.content as string | undefined) ?? "{}";
      const parsed = JSON.parse(raw);
      const text = enforceVocab(parsed.text ?? "");
      result = {
        id: randomUUID(),
        principleId: parsed.principleId ?? null,
        text,
        source: "ai_suggested",
        aiGeneratedOriginal: text,
        selected: false,
      };
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Couldn't suggest a principle — please retry.",
      });
    }

    return { principle: result };
  }),

  suggestWontDo: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const context = await buildContext(tenantId);
    const [current] = await db
      .select({ wontDosJson: rewardPrinciples.wontDosJson })
      .from(rewardPrinciples)
      .where(eq(rewardPrinciples.tenantId, tenantId));

    const existing = (current?.wontDosJson as WontDoItem[] | null) ?? [];
    const existingTexts = existing.map(w => `- ${w.text}`).join("\n");

    const wontDoTemplates = await db.select().from(rewardWontDoTemplates);
    const templateList = wontDoTemplates.map(t => `- [${t.wontDoId}] ${t.text}`).join("\n");

    const systemPrompt = `You are a senior Reward Director writing governance constraints.
Vocabulary blacklist (never use): ${VOCAB_BLACKLIST.join(", ")}.
Output ONLY a JSON object — no preamble, no markdown fences.`;

    const userPrompt = `Context:
${context}

Existing won't-dos (do NOT repeat these):
${existingTexts}

Available canonical won't-dos:
${templateList}

Suggest one additional won't-do that is meaningfully different from the existing ones.
Output as JSON: { "wontDoId": "..." | null, "text": "..." }`;

    let result: WontDoItem;
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });
      const raw = (response.choices?.[0]?.message?.content as string | undefined) ?? "{}";
      const parsed = JSON.parse(raw);
      const text = enforceVocab(parsed.text ?? "");
      result = {
        id: randomUUID(),
        wontDoId: parsed.wontDoId ?? null,
        text,
        source: "ai_suggested",
        aiGeneratedOriginal: text,
        selected: false,
      };
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Couldn't suggest a won't-do — please retry.",
      });
    }

    return { wontDo: result };
  }),

  confirm: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    const [current] = await db
      .select({ principlesJson: rewardPrinciples.principlesJson })
      .from(rewardPrinciples)
      .where(eq(rewardPrinciples.tenantId, tenantId));

    const principles = (current?.principlesJson as unknown[]) ?? [];
    if (!principles.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "At least one principle is required before confirming.",
      });
    }

    await db
      .update(rewardPrinciples)
      .set({ state: "confirmed", updatedAt: Date.now() })
      .where(eq(rewardPrinciples.tenantId, tenantId));

    return { ok: true };
  }),

  markStale: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;

    const [current] = await db
      .select({ state: rewardPrinciples.state })
      .from(rewardPrinciples)
      .where(eq(rewardPrinciples.tenantId, tenantId));

    if (current?.state === "confirmed") {
      await db
        .update(rewardPrinciples)
        .set({ state: "stale", updatedAt: Date.now() })
        .where(eq(rewardPrinciples.tenantId, tenantId));
    }

    return { ok: true };
  }),

  keepAsIs: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    await db
      .update(rewardPrinciples)
      .set({ state: "confirmed", updatedAt: Date.now() })
      .where(eq(rewardPrinciples.tenantId, ctx.user.tenantId));

    return { ok: true };
  }),
});
