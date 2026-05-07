/**
 * ApplyModeHandler — AiQ Coach Phase 3
 *
 * Implements the Apply coaching loop (Addendum v1.1 §4.2):
 *
 *   Acts: apply_intro → apply_commit → apply_refine → apply_checkin
 *         → apply_evidence → apply_reflect → apply_complete
 *
 *   DB: applyCommitments, applyEvidence, userCapabilityMemory, coachAuditLog
 *   Classifier: Not used (free-text capture only)
 *   Memory writes: apply_commitment, apply_evidence
 *   Completion: Evidence submitted or user returns to learning
 */

import { invokeLLM } from "../../_core/llm";
import { getDb } from "../../db";
import {
  applyCommitments,
  applyEvidence,
  userCapabilityMemory,
  coachAuditLog,
  coachSessions,
} from "../../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import type {
  ModeHandler,
  ModeHandlerInput,
  ModeHandlerOutput,
  CoachSessionContext,
  CoachAct,
} from "../types";
import { nanoid } from "nanoid";

// ─── State ────────────────────────────────────────────────────────────────────

interface ApplyModeContext {
  act: CoachAct;
  targetDomain: string;
  targetGap: string;
  commitmentId: string | null;
  commitmentText: string | null;
  commitmentRefined: boolean;
  dueAt: string | null; // ISO date string
  checkinAttempts: number;
  checkinResponse: string | null;
  evidenceText: string | null;
  evidenceSubmitted: boolean;
  evidenceMissed: boolean;
  reflectionText: string | null;
  actTurnCount: number;
  complete: boolean;
}

function defaultContext(): ApplyModeContext {
  return {
    act: "apply_intro",
    targetDomain: "",
    targetGap: "",
    commitmentId: null,
    commitmentText: null,
    commitmentRefined: false,
    dueAt: null,
    checkinAttempts: 0,
    checkinResponse: null,
    evidenceText: null,
    evidenceSubmitted: false,
    evidenceMissed: false,
    reflectionText: null,
    actTurnCount: 0,
    complete: false,
  };
}

function getContext(session: CoachSessionContext): ApplyModeContext {
  const raw = session.modeContext as Record<string, unknown>;
  if (!raw || !raw.act) return defaultContext();
  return {
    act: (raw.act as CoachAct) || "apply_intro",
    targetDomain: (raw.targetDomain as string) || "",
    targetGap: (raw.targetGap as string) || "",
    commitmentId: (raw.commitmentId as string | null) ?? null,
    commitmentText: (raw.commitmentText as string | null) ?? null,
    commitmentRefined: Boolean(raw.commitmentRefined),
    dueAt: (raw.dueAt as string | null) ?? null,
    checkinAttempts: Number(raw.checkinAttempts) || 0,
    checkinResponse: (raw.checkinResponse as string | null) ?? null,
    evidenceText: (raw.evidenceText as string | null) ?? null,
    evidenceSubmitted: Boolean(raw.evidenceSubmitted),
    evidenceMissed: Boolean(raw.evidenceMissed),
    reflectionText: (raw.reflectionText as string | null) ?? null,
    actTurnCount: Number(raw.actTurnCount) || 0,
    complete: Boolean(raw.complete),
  };
}

function fiveWorkingDaysFromNow(): Date {
  const d = new Date();
  let added = 0;
  while (added < 5) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

function formatDueDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function domainLabel(domain: string): string {
  return domain.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Load top gap from capability memory ─────────────────────────────────────

async function loadTopGap(userId: string): Promise<{ domain: string; gap: string }> {
  const db = await getDb();
  if (!db) return { domain: "ai_output_evaluation", gap: "evaluating AI-generated outputs critically" };

  const memories = await db
    .select()
    .from(userCapabilityMemory)
    .where(
      and(
        eq(userCapabilityMemory.userId, userId),
        eq(userCapabilityMemory.memoryType, "gap")
      )
    )
    .orderBy(desc(userCapabilityMemory.confidence))
    .limit(1);

  if (memories.length > 0) {
    const m = memories[0];
    return {
      domain: m.capabilityDomain,
      gap: m.signalKey || "AI capability application",
    };
  }
  return { domain: "ai_output_evaluation", gap: "evaluating AI-generated outputs critically" };
}

// ─── LLM helper ──────────────────────────────────────────────────────────────

async function chat(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  instruction: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...history.slice(-8).map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      { role: "user", content: userMessage },
      { role: "system", content: instruction },
    ],
  });
  return (
    (response as { choices?: Array<{ message?: { content?: string } }> })
      ?.choices?.[0]?.message?.content || ""
  );
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: ApplyModeContext): string {
  const label = domainLabel(ctx.targetDomain || "AI capability");
  return `You are the AiQ Coach — a professional, warm, and direct AI coach for HR professionals building AI capability.

You are in the **Apply phase** of the coaching journey. Your job is to help the user translate what they have learned about ${label} into a specific, real-world commitment they will act on in the next 5 working days — and then support them in reflecting on what happened.

**Coaching style:**
- Be specific, not generic. Push for concrete actions, not intentions.
- Use SMART criteria gently: Specific, Measurable, Achievable, Relevant, Time-bound.
- Celebrate effort and learning, not just success. A missed commitment with good reflection is valuable.
- Keep responses concise — 2–4 short paragraphs maximum.
- Do not moralize or over-explain.

**Current focus:** ${label}${ctx.targetGap ? ` — specifically: ${ctx.targetGap}` : ""}`;
}

// ─── DB writes ────────────────────────────────────────────────────────────────

async function saveCommitment(
  userId: string,
  tenantId: string,
  sessionId: string,
  ctx: ApplyModeContext
): Promise<string> {
  const db = await getDb();
  const id = nanoid();
  if (!db) return id;
  const dueDate = fiveWorkingDaysFromNow();
  await db.insert(applyCommitments).values({
    id,
    tenantId,
    userId,
    sessionId,
    capabilityDomain: ctx.targetDomain || "general",
    commitmentText: ctx.commitmentText || "",
    dueDate,
    status: "active",
  });
  return id;
}

async function saveEvidence(
  userId: string,
  tenantId: string,
  commitmentId: string,
  ctx: ApplyModeContext
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(applyEvidence).values({
    id: nanoid(),
    commitmentId,
    userId,
    tenantId,
    evidenceText: ctx.evidenceText || (ctx.evidenceMissed ? "[missed]" : ""),
    qualityScore: ctx.evidenceSubmitted ? 70 : 30,
  });
}

async function saveCapabilityMemory(
  userId: string,
  tenantId: string,
  sessionId: string,
  ctx: ApplyModeContext,
  memType: "apply_commitment" | "apply_evidence"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const content = memType === "apply_commitment"
    ? `Committed to: ${ctx.commitmentText}`
    : `Evidence: ${ctx.evidenceText || "[missed]"}. Reflection: ${ctx.reflectionText || ""}`;

  await db.insert(userCapabilityMemory).values({
    id: nanoid(),
    tenantId,
    userId,
    capabilityDomain: ctx.targetDomain || "general",
    signalKey: memType,
    memoryType: memType,
    confidence: memType === "apply_commitment" ? 90 : (ctx.evidenceSubmitted ? 85 : 50),
    sourceTurnId: null,
    sourceSessionId: sessionId,
    sourceMode: "apply",
    summary: content,
    evidenceJson: {
      commitmentText: ctx.commitmentText,
      evidenceText: ctx.evidenceText,
      reflectionText: ctx.reflectionText,
      evidenceMissed: ctx.evidenceMissed,
    },
    conflictStatus: "none",
    supersededById: null,
  });
}

async function writeAudit(
  userId: string,
  tenantId: string,
  sessionId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(coachAuditLog).values({
    id: nanoid(),
    tenantId,
    userId,
    eventType,
    sessionId,
    turnId: null,
    payloadJson: payload,
    classifierVersion: null,
    promptVersion: "apply-v1",
  });
}

// ─── Mode Handler ─────────────────────────────────────────────────────────────

export class ApplyModeHandler implements ModeHandler {
  readonly mode = "apply" as const;

  getSystemPrompt(session: CoachSessionContext): string {
    return buildSystemPrompt(getContext(session));
  }

  isComplete(session: CoachSessionContext): boolean {
    return getContext(session).complete;
  }

  async onComplete(session: CoachSessionContext): Promise<void> {
    const ctx = getContext(session);
    if (ctx.commitmentId && (ctx.evidenceText || ctx.evidenceMissed)) {
      await saveEvidence(session.userId, session.tenantId, ctx.commitmentId, ctx);
      await saveCapabilityMemory(session.userId, session.tenantId, session.sessionId, ctx, "apply_evidence");
    }
    await writeAudit(session.userId, session.tenantId, session.sessionId, "apply.complete", {
      commitmentText: ctx.commitmentText,
      evidenceSubmitted: ctx.evidenceSubmitted,
      evidenceMissed: ctx.evidenceMissed,
    });
  }

  async process(input: ModeHandlerInput): Promise<ModeHandlerOutput> {
    const { session, userMessage, messageHistory } = input;
    const db = await getDb();
    let ctx = getContext(session);
    const systemPrompt = buildSystemPrompt(ctx);

    let responseText = "";
    let updatedAct: CoachAct = ctx.act;
    let suggestedReplies: string[] = [];
    let transitionToMode: "learning" | undefined;
    let sessionComplete = false;

    try {
      switch (ctx.act) {

        // ── apply_intro ──────────────────────────────────────────────────────
        case "apply_intro": {
          if (!ctx.targetDomain) {
            const gap = await loadTopGap(session.userId);
            ctx.targetDomain = gap.domain;
            ctx.targetGap = gap.gap;
          }
          const label = domainLabel(ctx.targetDomain);
          responseText = await chat(
            buildSystemPrompt(ctx),
            messageHistory,
            userMessage,
            `This is the opening of the Apply phase. Briefly explain what Apply coaching is (turning learning into real practice), reference the user's focus area (${label} — ${ctx.targetGap}), and ask them to think of one specific situation in the next week where they could apply this skill. Keep it to 2–3 short paragraphs. End with a clear, single question.`
          );
          updatedAct = "apply_commit";
          suggestedReplies = [
            "I have a specific situation in mind",
            "Tell me more about what a good commitment looks like",
            "I'm not sure — can you give me an example?",
          ];
          break;
        }

        // ── apply_commit ─────────────────────────────────────────────────────
        case "apply_commit": {
          let isSpecific = false;
          let isMeasurable = false;
          let extractedCommitment = userMessage;
          try {
            const extraction = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `Extract the user's stated commitment. Return JSON: { "commitment": "...", "isSpecific": true/false, "isMeasurable": true/false }. If no clear commitment, return { "commitment": null, "isSpecific": false, "isMeasurable": false }.`,
                },
                { role: "user", content: userMessage },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "commitment_extract",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      commitment: { type: ["string", "null"] },
                      isSpecific: { type: "boolean" },
                      isMeasurable: { type: "boolean" },
                    },
                    required: ["commitment", "isSpecific", "isMeasurable"],
                    additionalProperties: false,
                  },
                },
              },
            } as Parameters<typeof invokeLLM>[0]);
            const content = (extraction as { choices?: Array<{ message?: { content?: string } }> })
              ?.choices?.[0]?.message?.content || "{}";
            const parsed = JSON.parse(content);
            extractedCommitment = parsed.commitment || userMessage;
            isSpecific = parsed.isSpecific;
            isMeasurable = parsed.isMeasurable;
          } catch {
            // fallback: treat as-is
          }

          ctx.commitmentText = extractedCommitment;
          const needsRefinement = !isSpecific || !isMeasurable;

          responseText = await chat(
            buildSystemPrompt(ctx),
            messageHistory,
            userMessage,
            needsRefinement
              ? `The user has stated a commitment but it could be more specific or measurable. Acknowledge what they've said warmly, then ask one focused question to make it more concrete. Do not list all SMART criteria — just ask one thing.`
              : `The user has stated a clear, specific commitment. Affirm it enthusiastically, confirm the commitment back to them in one sentence, and tell them you'll check in with them in 5 working days. Ask if they're ready to set the reminder.`
          );

          updatedAct = needsRefinement ? "apply_refine" : "apply_checkin";
          suggestedReplies = needsRefinement
            ? ["I'll specifically...", "The measurable outcome will be...", "Let me rephrase: I commit to..."]
            : ["Yes, set the reminder — I'm ready", "Let me add one more detail first"];

          if (!needsRefinement && !ctx.commitmentId) {
            const dueDate = fiveWorkingDaysFromNow();
            ctx.dueAt = dueDate.toISOString();
            ctx.commitmentId = await saveCommitment(session.userId, session.tenantId, session.sessionId, ctx);
            await saveCapabilityMemory(session.userId, session.tenantId, session.sessionId, ctx, "apply_commitment");
            await writeAudit(session.userId, session.tenantId, session.sessionId, "commitment.created", {
              commitmentId: ctx.commitmentId,
              commitmentText: ctx.commitmentText,
              dueAt: ctx.dueAt,
            });
          }
          break;
        }

        // ── apply_refine ─────────────────────────────────────────────────────
        case "apply_refine": {
          ctx.commitmentText = `${ctx.commitmentText || ""} — ${userMessage}`;
          ctx.commitmentRefined = true;

          responseText = await chat(
            buildSystemPrompt(ctx),
            messageHistory,
            userMessage,
            `The user has refined their commitment. Synthesise the original commitment with their refinement into one clear sentence, confirm it back to them, and tell them you'll check in in 5 working days. Be warm and brief.`
          );

          updatedAct = "apply_checkin";
          suggestedReplies = ["That's exactly right — set the reminder", "Let me tweak it one more time"];

          if (!ctx.commitmentId) {
            const dueDate = fiveWorkingDaysFromNow();
            ctx.dueAt = dueDate.toISOString();
            ctx.commitmentId = await saveCommitment(session.userId, session.tenantId, session.sessionId, ctx);
            await saveCapabilityMemory(session.userId, session.tenantId, session.sessionId, ctx, "apply_commitment");
          }
          break;
        }

        // ── apply_checkin ────────────────────────────────────────────────────
        case "apply_checkin": {
          if (ctx.checkinAttempts === 0) {
            const dueLabel = ctx.dueAt ? formatDueDate(ctx.dueAt) : "recently";
            responseText = await chat(
              buildSystemPrompt(ctx),
              messageHistory,
              userMessage,
              `This is the check-in. The user committed to: "${ctx.commitmentText}". The due date was ${dueLabel}. Ask them warmly and directly: did they do it? Keep it to 1–2 sentences.`
            );
            ctx.checkinAttempts = 1;
            suggestedReplies = ["Yes, I did it!", "Partially — I made a start", "No, I didn't manage it this time"];
          } else {
            ctx.checkinResponse = userMessage;
            const lower = userMessage.toLowerCase();
            const missed = lower.includes("no") || lower.includes("didn't") || lower.includes("not manage");
            ctx.evidenceMissed = missed;

            responseText = await chat(
              buildSystemPrompt(ctx),
              messageHistory,
              userMessage,
              missed
                ? `The user didn't complete their commitment. Respond with zero judgment. Ask them what got in the way. Keep it to 2 sentences.`
                : `The user completed (or partially completed) their commitment. Celebrate briefly. Ask them to describe what happened — what specifically did they do, what was the reaction or outcome?`
            );
            updatedAct = "apply_evidence";
            suggestedReplies = missed
              ? ["What got in the way was...", "I ran out of time because...", "I'll try again next week"]
              : ["Here's what happened...", "The outcome was...", "My colleague's reaction was..."];
          }
          break;
        }

        // ── apply_evidence ───────────────────────────────────────────────────
        case "apply_evidence": {
          ctx.evidenceText = userMessage;
          ctx.evidenceSubmitted = true;
          const label = domainLabel(ctx.targetDomain);

          responseText = await chat(
            buildSystemPrompt(ctx),
            messageHistory,
            userMessage,
            `The user has shared their evidence. Acknowledge what they've shared specifically — reference something they said. Then ask one reflective question: what did this experience teach them about ${label}? Keep it to 2–3 sentences.`
          );
          updatedAct = "apply_reflect";
          suggestedReplies = ["What I learned was...", "I realised that...", "Next time I would..."];
          break;
        }

        // ── apply_reflect ────────────────────────────────────────────────────
        case "apply_reflect": {
          ctx.reflectionText = userMessage;

          responseText = await chat(
            buildSystemPrompt(ctx),
            messageHistory,
            userMessage,
            `The user has reflected on their experience. Synthesise their learning in 1–2 sentences — what capability shift does this represent? Then offer two paths: (1) make a new, more ambitious commitment in the same domain, or (2) return to the learning journey to build on this. Ask which they'd prefer. Be warm and energising.`
          );
          updatedAct = "apply_complete";
          suggestedReplies = [
            "I'd like to make a new commitment",
            "Take me back to my learning plan",
            "I want to try a different domain",
          ];

          // Write evidence memory on reflection
          if (ctx.commitmentId) {
            await saveEvidence(session.userId, session.tenantId, ctx.commitmentId, ctx);
          }
          await saveCapabilityMemory(session.userId, session.tenantId, session.sessionId, ctx, "apply_evidence");
          break;
        }

        // ── apply_complete ───────────────────────────────────────────────────
        case "apply_complete": {
          const lower = userMessage.toLowerCase();
          const wantsNew = lower.includes("new commitment") || lower.includes("another") || lower.includes("again") || lower.includes("different");

          responseText = await chat(
            buildSystemPrompt(ctx),
            messageHistory,
            userMessage,
            wantsNew
              ? `The user wants to make a new commitment. Transition back to the commitment phase with energy. Reference what they learned from the last cycle.`
              : `The user wants to return to their learning plan. Celebrate the Apply cycle they've completed. Let them know they can return to the coach any time to start a new Apply cycle. Sign off warmly.`
          );

          if (wantsNew) {
            ctx.commitmentId = null;
            ctx.commitmentText = null;
            ctx.commitmentRefined = false;
            ctx.dueAt = null;
            ctx.checkinAttempts = 0;
            ctx.checkinResponse = null;
            ctx.evidenceText = null;
            ctx.evidenceSubmitted = false;
            ctx.evidenceMissed = false;
            ctx.reflectionText = null;
            updatedAct = "apply_commit";
            suggestedReplies = ["Here's my new commitment...", "I want to focus on something different"];
          } else {
            ctx.complete = true;
            sessionComplete = true;
            transitionToMode = "learning";
            suggestedReplies = ["Go to my learning plan", "See my progress"];
          }
          break;
        }

        default: {
          responseText = "Let's continue with your Apply coaching. What would you like to focus on?";
          break;
        }
      }
    } catch (err) {
      console.error("[ApplyModeHandler] Error:", err);
      responseText = "I'm sorry, I encountered an issue. Let's continue — what were you saying?";
    }

    // Update act if changed
    if (updatedAct !== ctx.act) {
      ctx.act = updatedAct;
      ctx.actTurnCount = 0;
    } else {
      ctx.actTurnCount = (ctx.actTurnCount || 0) + 1;
    }

    // Persist context
    if (db) {
      await db
        .update(coachSessions)
        .set({
          modeContextJson: ctx as unknown as Record<string, unknown>,
          currentAct: updatedAct,
          updatedAt: new Date(),
        })
        .where(eq(coachSessions.id, session.sessionId));
    }

    return {
      responseText,
      updatedAct,
      updatedModeContext: ctx as unknown as Record<string, unknown>,
      transitionToMode,
      sessionComplete,
      suggestedReplies,
    };
  }
}

export const applyModeHandler = new ApplyModeHandler();
