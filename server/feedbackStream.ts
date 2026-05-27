/**
 * Feedback Stream — AiQ Platform
 *
 * POST /api/feedback/stream
 *
 * Streams AI coaching feedback token-by-token using SSE.
 * Authenticates via session cookie (same as tRPC context).
 * Persists the assembled feedback text to module_feedback table on completion.
 *
 * Request body (JSON):
 *   moduleId, moduleTitle, moduleDomain, formatType, promptIndex,
 *   promptText, userResponse, strategyLinkage?, journeyPosition?
 *
 * Response: text/event-stream
 *   data: {"type":"token","content":"..."}   — each token chunk
 *   data: {"type":"done","feedbackId":"..."}  — completion signal
 *   data: {"type":"error","message":"..."}    — error signal
 */
import type { Express, Request, Response } from "express";
import { parse as parseCookies } from "cookie";
import { verifySessionToken } from "./auth";
import { COOKIE_NAME } from "../shared/const";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { moduleFeedback } from "../drizzle/schema";
import { nanoid } from "nanoid";
import { assertLLMStreamRateLimit } from "./_core/llmRateLimit";

// ─── Build system prompt (mirrors generateModuleFeedback tRPC procedure) ──────
function buildSystemPrompt(
  formatType: "reflection" | "practical_exercise",
  moduleTitle: string,
  moduleDomain: string,
  strategyLinkage?: { initiativeName: string; phase: string; status?: string } | null,
  journeyPosition?: string | null,
): string {
  const strategyContext = strategyLinkage
    ? `\n\nStrategy context: This module supports the learner's active AI strategy initiative "${strategyLinkage.initiativeName}" (${strategyLinkage.phase} phase). Where relevant, connect your feedback to how this skill will be applied in that initiative.`
    : "";
  const journeyContext = journeyPosition
    ? `\n\nLearner journey: ${journeyPosition}`
    : "";

  if (formatType === "reflection") {
    return `You are an expert HR leadership coach and AI capability advisor. Your role is to provide personalised, constructive feedback on a learner's reflection response within the AiQ HR capability development platform.

Module: "${moduleTitle}" (Domain: ${moduleDomain})${strategyContext}${journeyContext}

Feedback principles:
- Acknowledge what the learner has identified well — be specific, not generic
- Offer one or two genuinely novel angles or considerations they may not have thought of
- Connect their reflection to real-world HR practice or their organisation's AI journey where possible
- Ask one forward-looking question to deepen their thinking (do not demand an answer)
- Keep the tone warm, direct, and collegial — like a trusted senior colleague, not a marking rubric
- Length: 150–220 words. No bullet points. Use flowing prose.
- Do not repeat the question back to the learner
- Do not use phrases like "Great reflection!" or "Well done" — start with substance`;
  } else {
    return `You are an expert HR leadership coach and AI capability advisor. Your role is to provide personalised, constructive feedback on a learner's practical exercise response within the AiQ HR capability development platform.

Module: "${moduleTitle}" (Domain: ${moduleDomain})${strategyContext}${journeyContext}

Feedback principles:
- Assess whether the learner's approach is likely to work in practice — be honest but constructive
- Identify the strongest element of their response and explain why it matters
- Highlight one specific gap, risk, or missed consideration that would improve the outcome
- Where relevant, suggest a concrete next action they could take in their own organisation
- Keep the tone direct and practical — like a senior practitioner reviewing a colleague's work plan
- Length: 180–250 words. No bullet points. Use flowing prose.
- Do not restate the exercise instructions
- Do not use generic praise — start with a substantive observation about their specific response`;
  }
}

// ─── Route registration ───────────────────────────────────────────────────────
export function registerFeedbackStreamRoute(app: Express): void {
  app.post("/api/feedback/stream", async (req: Request, res: Response) => {
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
    const {
      moduleId,
      moduleTitle,
      moduleDomain,
      formatType,
      promptIndex = 0,
      promptText,
      userResponse,
      strategyLinkage,
      journeyPosition,
    } = req.body as {
      moduleId: string;
      moduleTitle: string;
      moduleDomain: string;
      formatType: "reflection" | "practical_exercise";
      promptIndex?: number;
      promptText: string;
      userResponse: string;
      strategyLinkage?: { initiativeName: string; phase: string; status?: string } | null;
      journeyPosition?: string | null;
    };

    if (!moduleId || !moduleTitle || !moduleDomain || !formatType || !promptText || !userResponse) {
      res.status(400).json({ error: "Missing required fields" });
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
      // ── Build prompt ────────────────────────────────────────────────────────
      const systemPrompt = buildSystemPrompt(formatType, moduleTitle, moduleDomain, strategyLinkage, journeyPosition);
      const userMessage = `Reflection prompt: "${promptText}"\n\nLearner's response:\n${userResponse}`;

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
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: 1024,
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
        buffer = lines.pop() ?? ""; // keep incomplete last line

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

      // ── Persist to DB ───────────────────────────────────────────────────────
      const feedbackText = assembled.trim() || "Thank you for your thoughtful response. Keep reflecting on how these ideas apply in your context.";
      const db = await getDb();
      let feedbackId = nanoid();
      if (db) {
        await db.insert(moduleFeedback).values({
          id: feedbackId,
          userId: user.userId,
          moduleId,
          promptIndex,
          feedbackText,
          formatType,
          userResponseSnapshot: userResponse.slice(0, 2000),
          modelUsed: "default",
          libraryVersion: "v1.4",
          generatedAt: Date.now(),
        });
      }

      sendEvent({ type: "done", feedbackId });
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      sendEvent({ type: "error", message });
      res.end();
    }
  });
}
