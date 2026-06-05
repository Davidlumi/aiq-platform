/**
 * Board Report Stream — AiQ Platform
 *
 * POST /api/board-report/stream-section
 *
 * Streams AI-generated board report section content token-by-token using SSE.
 * Authenticates via session cookie (same as tRPC context).
 * Persists the assembled section text to boardReportSectionsJson on completion.
 *
 * Request body (JSON):
 *   sectionId: "context" | "strategic_direction" | "initiative_portfolio" |
 *              "investment_case" | "capability_readiness" | "governance"
 *   regenerate?: boolean  — force regeneration even if section is locked
 *
 * Response: text/event-stream
 *   data: {"type":"token","content":"..."}          — each token chunk
 *   data: {"type":"done","wordCount":N}              — completion signal
 *   data: {"type":"error","message":"..."}           — error signal
 */
import type { Express, Request, Response } from "express";
import { assertLLMStreamRateLimit } from "./_core/llmRateLimit";
import { parse as parseCookies } from "cookie";
import { verifySessionToken } from "./auth";
import { COOKIE_NAME } from "../shared/const";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { ailOrgContext } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { INITIATIVE_LIBRARY } from "../shared/initiativeLibrary";
import { VOCAB_BLACKLIST, sanitizeOutput } from "../shared/vocabBlacklist";

// ─── Section IDs ─────────────────────────────────────────────────────────────
export type BoardReportSectionId =
  | "context"
  | "strategic_direction"
  | "initiative_portfolio"
  | "investment_case"
  | "capability_readiness"
  | "governance";

export const SECTION_LABELS: Record<BoardReportSectionId, string> = {
  context: "1. Context & Mandate",
  strategic_direction: "2. Strategic Direction",
  initiative_portfolio: "3. Initiative Portfolio",
  investment_case: "4. Investment Case",
  capability_readiness: "5. Capability Readiness",
  governance: "6. Governance & Next Steps",
};

export const SECTION_TARGET_WORDS: Record<BoardReportSectionId, [number, number]> = {
  context: [150, 250],
  strategic_direction: [200, 300],
  initiative_portfolio: [250, 350],
  investment_case: [200, 300],
  capability_readiness: [150, 250],
  governance: [150, 250],
};

// ─── Vocabulary blacklist — imported from shared/vocabBlacklist.ts ─────────────

// ─── Build section prompt ─────────────────────────────────────────────────────
function buildSectionPrompt(
  sectionId: BoardReportSectionId,
  context: {
    orgName: string;
    strategyStatement: string;
    strategyArchetype: string;
    hrAmbitionLevel: number;
    businessAmbitionLevel: number;
    selectedInitiatives: string[];
    selectedInitiativesWithDescriptions: Array<{ label: string; description: string }>;
    outcomesJson: string;
    businessCaseNarrative: string;
    capabilityJson: string;
    reviewNotes: string;
    includeNotes: boolean;
  }
): string {
  const [minWords, maxWords] = SECTION_TARGET_WORDS[sectionId];
  const blacklistStr = VOCAB_BLACKLIST.join(", ");

  const initiativeList = context.selectedInitiativesWithDescriptions.length > 0
    ? context.selectedInitiativesWithDescriptions
        .map((i, idx) => `${idx + 1}. ${i.label} — ${i.description}`)
        .join("\n")
    : context.selectedInitiatives.join(", ") || "(none selected)";

  const sharedContext = `
Organisation: ${context.orgName}
HR Ambition: ${context.businessAmbitionLevel}/4, Business Ambition: ${context.businessAmbitionLevel}/4
Strategy archetype: ${context.strategyArchetype}
Strategy statement: ${context.strategyStatement}
Selected initiatives (${context.selectedInitiativesWithDescriptions.length} total):
${initiativeList}
Outcomes: ${context.outcomesJson}
Business case narrative: ${context.businessCaseNarrative}
Capability assessment: ${context.capabilityJson}
${context.includeNotes && context.reviewNotes ? `Review session notes: ${context.reviewNotes}` : ""}
`.trim();

  const systemPrompt = `You are a senior HR strategy advisor writing a board-level report for ${context.orgName}. 
Write in clear, direct, professional prose suitable for a board audience. 
Avoid jargon. Do not use bullet points — write in flowing paragraphs.
Target length: ${minWords}–${maxWords} words for this section.
Vocabulary blacklist — never use these words or phrases: ${blacklistStr}
Do not include a section heading — the heading will be added by the UI.
Write only the section content.`;

  const sectionInstructions: Record<BoardReportSectionId, string> = {
    context: `Write the Context & Mandate section. Explain why the organisation is investing in AI-enabled HR capability now. Cover the business context, the HR function's current state, and the mandate for change. Ground this in the organisation's ambition levels and strategic archetype.`,
    strategic_direction: `Write the Strategic Direction section. Describe the chosen AI strategy archetype and what it means for the HR function. Explain the strategy statement in accessible terms for a board audience. Cover the principles that will guide decision-making and what the organisation has explicitly chosen not to do.`,
    initiative_portfolio: `Write the Initiative Portfolio section. You MUST reference each of the selected initiatives by name (they are listed in the context above). Describe them as a coherent portfolio, not a list. Explain how they fit together, what sequencing logic underpins them, and how they connect to the strategic direction. Reference the outcomes and success measures. Do not invent initiatives that are not in the list.`,
    investment_case: `Write the Investment Case section. Summarise the financial and qualitative case for investment. Draw on the business case narrative, value envelope estimates, and risk acknowledgements. Be honest about uncertainty while making a clear recommendation.`,
    capability_readiness: `Write the Capability Readiness section. Describe the current capability gaps across the four dimensions (Skills, Capacity, Change readiness, Vendor ecosystem) and the tactics in place to close them. Assess overall delivery confidence.`,
    governance: `Write the Governance & Next Steps section. Describe the governance model, review cadence, and escalation path. Outline the immediate next steps the board is being asked to approve or note. Include any conditions or dependencies that must be met for the strategy to succeed.`,
  };

  return `${systemPrompt}\n\nContext:\n${sharedContext}\n\nInstruction:\n${sectionInstructions[sectionId]}`;
}

// ─── Route registration ───────────────────────────────────────────────────────
export function registerBoardReportStreamRoute(app: Express): void {
  app.post("/api/board-report/stream-section", async (req: Request, res: Response) => {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const rawCookies = req.headers.cookie ?? "";
    const cookies = parseCookies(rawCookies);
    const sessionId = cookies[COOKIE_NAME];
    if (!sessionId) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }
    const user = await verifySessionToken(sessionId);
    if (!user) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }

    // PROD-2.1: Per-user LLM stream rate limit
    try {
      assertLLMStreamRateLimit(user.userId);
    } catch {
      res.status(429).json({ error: "LLM stream rate limit reached. Please wait before generating more content." });
      return;
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const { sectionId, regenerate = false } = req.body as {
      sectionId: BoardReportSectionId;
      regenerate?: boolean;
    };

    const validSections: BoardReportSectionId[] = [
      "context", "strategic_direction", "initiative_portfolio",
      "investment_case", "capability_readiness", "governance",
    ];
    if (!sectionId || !validSections.includes(sectionId)) {
      res.status(400).json({ error: "Invalid sectionId" });
      return;
    }

    // ── Load org context ──────────────────────────────────────────────────────
    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database unavailable" });
      return;
    }

    const [ctx] = await db
      .select()
      .from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, user.userId))
      .limit(1);

    if (!ctx) {
      res.status(404).json({ error: "No strategy context found" });
      return;
    }

    // ── Check if section is locked ────────────────────────────────────────────
    let sectionsMap: Record<string, {
      content: string;
      lockedAt?: number | null;
      generatedAt?: number | null;
      editedAt?: number | null;
      isAiGenerated?: boolean;
      wordCount?: number;
    }> = {};
    try {
      sectionsMap = ctx.boardReportSectionsJson
        ? JSON.parse(ctx.boardReportSectionsJson)
        : {};
    } catch {
      sectionsMap = {};
    }

    const existingSection = sectionsMap[sectionId];
    if (existingSection?.lockedAt && !regenerate) {
      res.status(409).json({ error: "Section is locked. Pass regenerate:true to override." });
      return;
    }

    // ── Set SSE headers ───────────────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const sendEvent = (data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // ── Build context ─────────────────────────────────────────────────────
      let selectedInitiatives: string[] = [];
      try {
        const selectedJson = ctx.selectedInitiativesJson
          ? JSON.parse(ctx.selectedInitiativesJson)
          : [];
        selectedInitiatives = selectedJson
          .map((entry: { initiativeId: string }) => {
            const lib = INITIATIVE_LIBRARY.find(i => i.id === entry.initiativeId);
            return lib?.label ?? entry.initiativeId;
          })
          .filter(Boolean);
      } catch {
        selectedInitiatives = [];
      }

      // Get org name from tenants table
      const { tenants } = await import("../drizzle/schema");
      const [tenant] = await db
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId))
        .limit(1);
      const orgName = tenant?.name ?? "the organisation";

      // Build rich initiative list with descriptions for the portfolio section
      let selectedInitiativesWithDescriptions: Array<{ label: string; description: string }> = [];
      try {
        const selectedJson2 = ctx.selectedInitiativesJson
          ? JSON.parse(ctx.selectedInitiativesJson)
          : [];
        selectedInitiativesWithDescriptions = selectedJson2
          .map((entry: { initiativeId: string }) => {
            const lib = INITIATIVE_LIBRARY.find(i => i.id === entry.initiativeId);
            if (!lib) return null;
            return { label: lib.label, description: lib.description };
          })
          .filter(Boolean);
      } catch {
        selectedInitiativesWithDescriptions = [];
      }

      const sectionContext = {
        orgName,
        strategyStatement: ctx.strategyStatement ?? "",
        strategyArchetype: ctx.strategyArchetype ?? "augmentation",
        hrAmbitionLevel: ctx.businessAmbitionLevel ?? 2,
        businessAmbitionLevel: ctx.businessAmbitionLevel ?? 2,
        selectedInitiatives,
        selectedInitiativesWithDescriptions,
        // T4: read from successMeasuresJson (canonical); fall back to outcomesJson with loud log
        outcomesJson: (() => {
          if (ctx.successMeasuresJson) return ctx.successMeasuresJson;
          if (ctx.outcomesJson) {
            console.warn(`[T4-FALLBACK] boardReportStream: tenant=${ctx.tenantId} reading from dormant outcomesJson`);
            return ctx.outcomesJson;
          }
          return "[]";
        })(),
        businessCaseNarrative: ctx.businessCaseNarrative ?? "",
        capabilityJson: ctx.stage8CapabilityJson ?? "{}",
        reviewNotes: ctx.reviewSessionNotes ?? "",
        includeNotes: ctx.boardReportIncludeNotes ?? false,
      };

      const prompt = buildSectionPrompt(sectionId, sectionContext);

      const apiUrl = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
        ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
        : "https://api.openai.com/v1/chat/completions";

      // ── Call LLM with stream: true ──────────────────────────────────────────
      const llmRes = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          stream: true,
          messages: [
            { role: "user", content: prompt },
          ],
          max_tokens: 2048,
        }),
      });

      if (!llmRes.ok) {
        const errText = await llmRes.text();
        sendEvent({ type: "error", message: `LLM error: ${llmRes.status} ${errText.slice(0, 200)}` });
        res.end();
        return;
      }

      // ── Stream tokens to client ─────────────────────────────────────────────
      const reader = llmRes.body?.getReader();
      if (!reader) {
        sendEvent({ type: "error", message: "No response body from LLM" });
        res.end();
        return;
      }

      const decoder = new TextDecoder();
      let assembled = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json?.choices?.[0]?.delta?.content;
            if (typeof content === "string" && content.length > 0) {
              assembled += content;
              sendEvent({ type: "token", content });
            }
          } catch {
            // Malformed chunk — skip
          }
        }
      }

      // ── Persist section to DB ───────────────────────────────────────────────
      // Apply deterministic post-processing: replace any blacklisted words that
      // slipped through the LLM instruction before persisting and emitting done.
      const finalContent = sanitizeOutput(assembled.trim());
      const wordCount = finalContent.split(/\s+/).filter(Boolean).length;

      sectionsMap[sectionId] = {
        content: finalContent,
        generatedAt: Date.now(),
        editedAt: null,
        lockedAt: existingSection?.lockedAt ?? null,
        isAiGenerated: true,
        wordCount,
      };

      await db
        .update(ailOrgContext)
        .set({ boardReportSectionsJson: JSON.stringify(sectionsMap) })
        .where(eq(ailOrgContext.tenantId, user.userId));

      sendEvent({ type: "done", wordCount });
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      sendEvent({ type: "error", message });
      res.end();
    }
  });
}
