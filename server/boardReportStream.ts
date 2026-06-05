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
  context: "1. Context & Background",
  strategic_direction: "2. Strategic Direction",
  // T12: updated to reflect roadmap sequencing content
  initiative_portfolio: "3. Initiative Portfolio & Roadmap",
  investment_case: "4. Investment Case",
  capability_readiness: "5. Capability Readiness",
  // T12: updated to reflect governance sourcing from sign-off + risk register
  governance: "6. Governance & Accountability",
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
    // T12: new sourcing fields
    roadmapJson: string;
    riskRegisterJson: string;
    reviewSignOffJson: string;
    reviewTensionsJson: string;
  }
): string {
  const [minWords, maxWords] = SECTION_TARGET_WORDS[sectionId];
  const blacklistStr = VOCAB_BLACKLIST.join(", ");

  const initiativeList = context.selectedInitiativesWithDescriptions.length > 0
    ? context.selectedInitiativesWithDescriptions
        .map((i, idx) => `${idx + 1}. ${i.label} — ${i.description}`)
        .join("\n")
    : context.selectedInitiatives.join(", ") || "(none selected)";

  // T12: parse roadmap horizons for human-readable summary
  let roadmapSummary = "(no roadmap data)";
  try {
    const rm = JSON.parse(context.roadmapJson) as {
      horizons: Array<{ label: string; startDate?: string | null; endDate?: string | null; order: number }>;
      assignments: Array<{ initiativeId: string; horizonId: string }>;
    };
    if (rm.horizons && rm.horizons.length > 0) {
      const horizonLabels = rm.horizons
        .sort((a, b) => a.order - b.order)
        .map(h => h.label + (h.startDate ? ` (${h.startDate}${h.endDate ? ` – ${h.endDate}` : ""})` : ""))
        .join(" → ");
      roadmapSummary = `Horizons: ${horizonLabels}. Assignments: ${rm.assignments.length} initiatives mapped.`;
    }
  } catch { /* non-fatal */ }

  // T12: parse risk register for high-impact risks
  let riskSummary = "(no risk register data)";
  try {
    const rr = JSON.parse(context.riskRegisterJson) as { risks: Array<{ title: string; likelihood: number; impact: number; mitigation: string; status: string }> };
    const activeRisks = (rr.risks ?? []).filter(r => r.status !== "dismissed");
    if (activeRisks.length > 0) {
      const highImpact = activeRisks.filter(r => r.impact >= 4);
      const riskLines = activeRisks.slice(0, 6).map(r =>
        `- ${r.title} (likelihood ${r.likelihood}/5, impact ${r.impact}/5): ${r.mitigation || "mitigation TBD"}`
      ).join("\n");
      riskSummary = `${activeRisks.length} active risks (${highImpact.length} high-impact):\n${riskLines}`;
    }
  } catch { /* non-fatal */ }

  // T12: parse review sign-off for unresolved/conditions items
  let signOffSummary = "(no sign-off data)";
  try {
    const so = JSON.parse(context.reviewSignOffJson) as {
      elements: Array<{ id: string; label: string; status: string; notes?: string; isEmpty?: boolean }>;
      attendees?: string;
      dateHeld?: string;
      dissent?: Array<{ element: string; description: string }>;
    };
    if (so.elements && so.elements.length > 0) {
      const agreed = so.elements.filter(e => e.status === "agreed").length;
      const conditions = so.elements.filter(e => e.status === "agreed_with_conditions");
      const unresolved = so.elements.filter(e => e.status === "unresolved");
      const naCount = so.elements.filter(e => e.isEmpty || e.status === "na").length;
      let lines = `Review sign-off: ${agreed} agreed, ${conditions.length} with conditions, ${unresolved.length} unresolved, ${naCount} N/A.`;
      if (so.dateHeld) lines += ` Date held: ${so.dateHeld}.`;
      if (so.attendees) lines += ` Attendees: ${so.attendees}.`;
      if (conditions.length > 0) {
        lines += `\nAgreed with conditions: ${conditions.map(e => `${e.label}${e.notes ? ` (${e.notes})` : ""}`).join("; ")}.`;
      }
      if (unresolved.length > 0) {
        lines += `\nUnresolved: ${unresolved.map(e => `${e.label}${e.notes ? ` (${e.notes})` : ""}`).join("; ")}.`;
      }
      signOffSummary = lines;
    }
  } catch { /* non-fatal */ }

  // T12: parse review tensions
  let tensionsSummary = "";
  try {
    const tensions = JSON.parse(context.reviewTensionsJson) as Array<{ title: string; description?: string }>;
    if (tensions && tensions.length > 0) {
      tensionsSummary = `\nReview tensions/dissent: ${tensions.map(t => t.title).join("; ")}.`;
    }
  } catch { /* non-fatal */ }

  const sharedContext = `
Organisation: ${context.orgName}
HR Ambition: ${context.businessAmbitionLevel}/4, Business Ambition: ${context.businessAmbitionLevel}/4
Strategy archetype: ${context.strategyArchetype}
Strategy statement: ${context.strategyStatement}
Selected initiatives (${context.selectedInitiativesWithDescriptions.length} total):
${initiativeList}
Success measures (Stage 7): ${context.outcomesJson}
Roadmap (Stage 6): ${roadmapSummary}
Business case narrative (Stage 9): ${context.businessCaseNarrative}
Capability assessment (Stage 8): ${context.capabilityJson}
Risk register (Stage 8): ${riskSummary}
Leadership review sign-off (Stage 10): ${signOffSummary}${tensionsSummary}
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
    context: `Write the Context & Background section. Explain why the organisation is investing in AI-enabled HR capability now. Cover the business context, the HR function's current state, and the mandate for change. Ground this in the organisation's ambition levels and strategic archetype.`,
    strategic_direction: `Write the Strategic Direction section. Describe the chosen AI strategy archetype and what it means for the HR function. Explain the strategy statement in accessible terms for a board audience. Cover the principles that will guide decision-making and what the organisation has explicitly chosen not to do.`,
    initiative_portfolio: `Write the Initiative Portfolio & Roadmap section (Section 3). You MUST reference each of the selected initiatives by name (they are listed in the context above). Describe them as a coherent portfolio, not a list. Explain how they fit together and how they are sequenced across the delivery horizons from Stage 6 (the roadmap horizons are in the context). Reference the success measures. Do not invent initiatives that are not in the list.`,
    investment_case: `Write the Investment Case section (Section 4). Summarise the financial and qualitative case for investment. Draw on the Stage 9 business case narrative. Where the roadmap defines delivery horizons, phase the investment narrative accordingly — describe the cost and value across those horizons rather than as a single lump. Note that cost estimates are user-supplied estimates, not verified figures. Be honest about uncertainty while making a clear recommendation.`,
    capability_readiness: `Write the Capability Readiness section (Section 5). Source this from the Stage 8 capability assessment in the context. Describe the current capability gaps across the four dimensions (Skills, Capacity, Change readiness, Vendor ecosystem) and the tactics in place to close them. Assess overall delivery confidence. Reference the risk register where capability gaps create delivery risk.`,
    governance: `Write the Governance & Accountability section (Section 6). Source this from Stage 7 success measures, Stage 8 risk register, and Stage 10 leadership review sign-off and tensions — all of which are in the context. Include: (1) the success measures and how they will be tracked; (2) key risks from the risk register, especially high-impact ones; (3) the leadership review sign-off status — call out any elements agreed with conditions or left unresolved; (4) any tensions or dissent raised in the review. Do not omit unresolved items or conditions — they are exactly what the board needs to see.`,
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

    // T12 (bug fix): use user.tenantId, not user.userId — session payload carries both
    const [ctx] = await db
      .select()
      .from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, user.tenantId))
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
        // T12: new sourcing fields for resequenced stages
        roadmapJson: ctx.roadmapJson ?? "{}",
        riskRegisterJson: ctx.riskRegisterJson ?? "{}",
        reviewSignOffJson: ctx.reviewSignOffJson ?? "{}",
        reviewTensionsJson: ctx.reviewTensionsJson ?? "[]",
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
        // T12 (bug fix): use user.tenantId — same fix as the load path above
        .where(eq(ailOrgContext.tenantId, user.tenantId));

      sendEvent({ type: "done", wordCount });
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      sendEvent({ type: "error", message });
      res.end();
    }
  });
}
