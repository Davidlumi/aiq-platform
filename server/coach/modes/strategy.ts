/**
 * StrategyCoachModeHandler — AiQ Coach Phase 3
 *
 * Conversational HR AI Strategy Builder. Replaces the wizard form for coach users.
 *
 * Acts:
 *   strategy_intro        — Coach explains the strategy session, sets expectations
 *   strategy_aspiration   — 5 conversational questions about business AI aspiration
 *   strategy_hr_role      — 4 questions about HR's enabling role
 *   strategy_vision       — Coach drafts vision + 5 principles; user can edit/approve
 *   strategy_initiatives  — Coach recommends initiatives; user selects and assigns phases
 *   strategy_complete     — Summary, save, and next steps
 *
 * Saves to: ailOrgContext (via direct DB write, same as the wizard)
 * Memory writes: None (strategy is org-level, not individual capability memory)
 * Transitions: learning → strategy (on user request), strategy → learning (on complete)
 */

import { invokeLLM } from "../../_core/llm";
import { generateVisionWithQualityGate } from "../../strategyEngine";
import { getDb } from "../../db";
import {
  ailOrgContext,
  coachSessions,
  coachAuditLog,
  strategyInitiativeLibrary,
} from "../../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import type {
  ModeHandler,
  ModeHandlerInput,
  ModeHandlerOutput,
  CoachSessionContext,
  CoachAct,
} from "../types";
import { nanoid } from "nanoid";

// ─── Aspiration & HR Role Questions ──────────────────────────────────────────

const ASPIRATION_QUESTIONS = [
  "What is the single most important business outcome your organisation is trying to achieve with AI in the next 2–3 years?",
  "How would you describe your organisation's current AI ambition — cautious experimenter, fast follower, or bold innovator? What's driving that position?",
  "Which business functions or processes do you see AI having the biggest impact on?",
  "What does success look like for your organisation's AI transformation — how would you know in 3 years that it worked?",
  "What are the biggest risks or concerns your leadership has about AI adoption that your HR strategy needs to address?",
];

const HR_ROLE_QUESTIONS = [
  "Given that business direction, what do you see as HR's most important contribution to making it happen?",
  "Where are the biggest AI capability gaps in your workforce right now — and which roles are most critical to close first?",
  "How ready is your HR function itself to work with AI — in terms of skills, tools, and mindset?",
  "What would need to be true about your HR operating model in 3 years for it to be genuinely AI-enabled?",
];

// ─── State ────────────────────────────────────────────────────────────────────

interface StrategyModeContext {
  act: CoachAct;
  aspirationAnswers: Record<string, string>;
  hrRoleAnswers: Record<string, string>;
  currentAspirationQ: number;
  currentHrRoleQ: number;
  draftVision: string | null;
  draftPrinciples: Array<{ title: string; description: string }>;
  visionApproved: boolean;
  selectedInitiativeIds: string[];
  businessAmbitionLevel: number;
  peopleAmbitionLevel: number;
  saved: boolean;
  complete: boolean;
}

function defaultContext(): StrategyModeContext {
  return {
    act: "strategy_intro",
    aspirationAnswers: {},
    hrRoleAnswers: {},
    currentAspirationQ: 0,
    currentHrRoleQ: 0,
    draftVision: null,
    draftPrinciples: [],
    visionApproved: false,
    selectedInitiativeIds: [],
    businessAmbitionLevel: 3,
    peopleAmbitionLevel: 3,
    saved: false,
    complete: false,
  };
}

function getContext(session: CoachSessionContext): StrategyModeContext {
  const raw = session.modeContext as Record<string, unknown>;
  if (!raw || !raw.act) return defaultContext();
  return {
    act: (raw.act as CoachAct) || "strategy_intro",
    aspirationAnswers: (raw.aspirationAnswers as Record<string, string>) || {},
    hrRoleAnswers: (raw.hrRoleAnswers as Record<string, string>) || {},
    currentAspirationQ: Number(raw.currentAspirationQ) || 0,
    currentHrRoleQ: Number(raw.currentHrRoleQ) || 0,
    draftVision: (raw.draftVision as string | null) ?? null,
    draftPrinciples: (raw.draftPrinciples as Array<{ title: string; description: string }>) || [],
    visionApproved: Boolean(raw.visionApproved),
    selectedInitiativeIds: (raw.selectedInitiativeIds as string[]) || [],
    businessAmbitionLevel: Number(raw.businessAmbitionLevel) || 3,
    peopleAmbitionLevel: Number(raw.peopleAmbitionLevel) || 3,
    saved: Boolean(raw.saved),
    complete: Boolean(raw.complete),
  };
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
      ...history.slice(-12).map((m) => ({
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

function buildSystemPrompt(): string {
  return `You are the AiQ Coach — a strategic advisor and coach for senior HR leaders building their organisation's HR AI Strategy.

You are facilitating a strategy conversation, not conducting an assessment. Your role is to:
- Ask thoughtful, probing questions that surface genuine strategic thinking
- Listen carefully and reflect back what you hear
- Help the HR leader articulate their vision with clarity and ambition
- Draft strategy artefacts (vision statements, principles) that sound like them, not like a template

**Tone:** Senior, peer-to-peer, intellectually curious. Not a chatbot. Not a form. A strategic thinking partner.

**Format:** Keep responses concise — 2–4 short paragraphs. Ask one question at a time. Never list multiple questions in a single turn.`;
}

// ─── Generate vision and principles ──────────────────────────────────────────

async function generateVisionAndPrinciples(
  ctx: StrategyModeContext,
  orgInfo?: { sector?: string | null; subSector?: string | null; orgType?: string | null; orgSize?: string | null }
): Promise<{
  visionStatement: string;
  principles: Array<{ title: string; description: string }>;
  businessAmbitionLevel: number;
  peopleAmbitionLevel: number;
}> {
  // B1: Use the same quality-gate prompt as the wizard path for consistent, board-ready output
  const AMBITION_LABELS: Record<number, string> = {
    1: "Cautious", 2: "Selective", 3: "Balanced", 4: "Progressive", 5: "Transformative",
  };
  const bizLevel = Math.min(5, Math.max(1, ctx.businessAmbitionLevel ?? 3));
  const pplLevel = Math.min(5, Math.max(1, ctx.peopleAmbitionLevel ?? 3));
  const result = await generateVisionWithQualityGate({
    sector: orgInfo?.sector ?? "other",
    subSector: orgInfo?.subSector ?? null,
    orgType: orgInfo?.orgType ?? null,
    orgSize: orgInfo?.orgSize ?? null,
    businessAmbitionLabel: AMBITION_LABELS[bizLevel],
    peopleAmbitionLabel: AMBITION_LABELS[pplLevel],
    aiPhilosophy: undefined,
    aspirationAnswers: ctx.aspirationAnswers,
    hrRoleAnswers: ctx.hrRoleAnswers,
    maxAttempts: 3,
  });
  return {
    visionStatement: result.visionStatement,
    principles: result.principles,
    businessAmbitionLevel: bizLevel,
    peopleAmbitionLevel: pplLevel,
  };
}

// ─── Load recommended initiatives ────────────────────────────────────────────

async function loadRecommendedInitiatives(
  tenantId: string,
  _businessAmbitionLevel: number
): Promise<Array<{ id: string; title: string; category: string; description: string }>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: strategyInitiativeLibrary.id,
      name: strategyInitiativeLibrary.name,
      category: strategyInitiativeLibrary.category,
      description: strategyInitiativeLibrary.description,
    })
    .from(strategyInitiativeLibrary)
    .where(eq(strategyInitiativeLibrary.tenantId, tenantId))
    .limit(20);

  return rows.map((r) => ({
    id: r.id,
    title: r.name,
    category: r.category,
    description: r.description ?? "",
  }));
}

// ─── Save strategy ────────────────────────────────────────────────────────────

async function saveStrategy(
  userId: string,
  tenantId: string,
  ctx: StrategyModeContext
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const payload = {
    aspirationAnswersJson: JSON.stringify(ctx.aspirationAnswers),
    hrRoleAnswersJson: JSON.stringify(ctx.hrRoleAnswers),
    visionStatement: ctx.draftVision || "",
    guidingPrinciplesJson: JSON.stringify(ctx.draftPrinciples),
    businessAmbitionLevel: ctx.businessAmbitionLevel,
    peopleAmbitionLevel: ctx.peopleAmbitionLevel,
    selectedInitiativesJson: JSON.stringify(ctx.selectedInitiativeIds),
    strategyAssessmentCompletedAt: new Date(),
    strategySavedAt: new Date(),
    updatedAt: new Date(),
  };

  const existing = await db
    .select({ id: ailOrgContext.id })
    .from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) {
    await db.update(ailOrgContext).set(payload).where(eq(ailOrgContext.tenantId, tenantId));
  } else {
    await db.insert(ailOrgContext).values({
      id: nanoid(),
      tenantId,
      ...payload,
    });
  }

  await db.insert(coachAuditLog).values({
    id: nanoid(),
    tenantId,
    userId,
    eventType: "strategy.saved",
    sessionId: null,
    turnId: null,
    payloadJson: {
      visionStatement: ctx.draftVision,
      principleCount: ctx.draftPrinciples.length,
      initiativeCount: ctx.selectedInitiativeIds.length,
    },
    classifierVersion: null,
    promptVersion: "strategy-v1",
  });
}

// ─── Mode Handler ─────────────────────────────────────────────────────────────

export class StrategyCoachModeHandler implements ModeHandler {
  readonly mode = "strategy" as const;

  getSystemPrompt(_session: CoachSessionContext): string {
    return buildSystemPrompt();
  }

  isComplete(session: CoachSessionContext): boolean {
    return getContext(session).complete;
  }

  async onComplete(_session: CoachSessionContext): Promise<void> {
    // Already saved in strategy_complete act
  }

  async process(input: ModeHandlerInput): Promise<ModeHandlerOutput> {
    const { session, userMessage, messageHistory } = input;
    const db = await getDb();
    let ctx = getContext(session);
    // Fetch org context for sector/subSector/orgType/orgSize (used in vision generation)
    let orgInfo: { sector?: string | null; subSector?: string | null; orgType?: string | null; orgSize?: string | null } = {};
    if (db) {
      const orgRow = await db.select({
        sector: ailOrgContext.sector,
        subSector: ailOrgContext.subSector,
        orgType: ailOrgContext.orgType,
        headcount: ailOrgContext.headcount,
      }).from(ailOrgContext).where(eq(ailOrgContext.tenantId, session.tenantId)).limit(1);
      if (orgRow[0]) {
        orgInfo = {
          sector: orgRow[0].sector,
          subSector: orgRow[0].subSector,
          orgType: orgRow[0].orgType,
          orgSize: orgRow[0].headcount
            ? orgRow[0].headcount < 250 ? "small"
              : orgRow[0].headcount < 1000 ? "medium"
              : orgRow[0].headcount < 5000 ? "large"
              : "enterprise"
            : null,
        };
      }
    }
    const systemPrompt = buildSystemPrompt();

    let responseText = "";
    let updatedAct: CoachAct = ctx.act;
    let suggestedReplies: string[] = [];
    let transitionToMode: "learning" | undefined;
    let sessionComplete = false;

    try {
      switch (ctx.act) {

        // ── strategy_intro ───────────────────────────────────────────────────
        case "strategy_intro": {
          responseText = await chat(
            systemPrompt,
            messageHistory,
            userMessage,
            `This is the opening of the HR AI Strategy conversation. Explain that you're going to have a strategic conversation — not fill in a form — to help them articulate their organisation's HR AI Strategy. Tell them it will take about 15–20 minutes and result in a vision statement, 5 guiding principles, and a set of strategic initiatives. Ask them to start by telling you about their organisation — sector, size, and where they are on the AI journey. Keep it to 2 short paragraphs.`
          );
          updatedAct = "strategy_aspiration";
          suggestedReplies = [
            "We're a mid-size financial services firm, early in our AI journey",
            "We're a large retailer — AI is already transforming our operations",
            "We're a public sector organisation, cautiously exploring AI",
          ];
          break;
        }

        // ── strategy_aspiration ──────────────────────────────────────────────
        case "strategy_aspiration": {
          const qIndex = ctx.currentAspirationQ;

          // Save the answer to the previous question (if any)
          if (qIndex > 0) {
            const prevQ = ASPIRATION_QUESTIONS[qIndex - 1];
            ctx.aspirationAnswers[prevQ] = userMessage;
          } else {
            // First turn: save the intro context as answer to Q0
            ctx.aspirationAnswers["Organisation context"] = userMessage;
          }

          if (qIndex < ASPIRATION_QUESTIONS.length) {
            const question = ASPIRATION_QUESTIONS[qIndex];
            responseText = await chat(
              systemPrompt,
              messageHistory,
              userMessage,
              `Acknowledge what the user just said briefly (1 sentence), then ask this question naturally: "${question}". Do not number the question. Keep it conversational.`
            );
            ctx.currentAspirationQ = qIndex + 1;
            suggestedReplies = [];
          } else {
            // All aspiration questions answered — transition to HR role
            responseText = await chat(
              systemPrompt,
              messageHistory,
              userMessage,
              `The user has answered all the business aspiration questions. Briefly summarise the strategic direction you've heard in 2–3 sentences. Then transition to the next part: understanding HR's specific role in making this happen. Ask the first HR role question naturally: "${HR_ROLE_QUESTIONS[0]}"`
            );
            updatedAct = "strategy_hr_role";
            ctx.currentHrRoleQ = 1;
          }
          break;
        }

        // ── strategy_hr_role ─────────────────────────────────────────────────
        case "strategy_hr_role": {
          const qIndex = ctx.currentHrRoleQ;

          // Save the answer to the previous question
          const prevQ = HR_ROLE_QUESTIONS[qIndex - 1];
          ctx.hrRoleAnswers[prevQ] = userMessage;

          if (qIndex < HR_ROLE_QUESTIONS.length) {
            const question = HR_ROLE_QUESTIONS[qIndex];
            responseText = await chat(
              systemPrompt,
              messageHistory,
              userMessage,
              `Acknowledge what the user just said briefly (1 sentence), then ask this question naturally: "${question}". Keep it conversational.`
            );
            ctx.currentHrRoleQ = qIndex + 1;
          } else {
            // All HR role questions answered — generate vision
            responseText = await chat(
              systemPrompt,
              messageHistory,
              userMessage,
              `The user has answered all the HR role questions. Acknowledge their last answer briefly. Tell them you're now going to draft a vision statement and 5 guiding principles based on everything they've shared. Ask them to give you a moment while you draft it. Keep it to 2 sentences.`
            );
            updatedAct = "strategy_vision";
            suggestedReplies = ["Ready — show me the draft"];

            // Pre-generate the vision in the background (will be used next turn)
            try {
              const generated = await generateVisionAndPrinciples(ctx, orgInfo);
              ctx.draftVision = generated.visionStatement;
              ctx.draftPrinciples = generated.principles;
              ctx.businessAmbitionLevel = generated.businessAmbitionLevel;
              ctx.peopleAmbitionLevel = generated.peopleAmbitionLevel;
            } catch (err) {
              console.error("[StrategyCoach] Vision generation failed:", err);
            }
          }
          break;
        }

        // ── strategy_vision ──────────────────────────────────────────────────
        case "strategy_vision": {
          if (!ctx.draftVision) {
            // Generate if not already done
            try {
              const generated = await generateVisionAndPrinciples(ctx, orgInfo);
              ctx.draftVision = generated.visionStatement;
              ctx.draftPrinciples = generated.principles;
              ctx.businessAmbitionLevel = generated.businessAmbitionLevel;
              ctx.peopleAmbitionLevel = generated.peopleAmbitionLevel;
            } catch (err) {
              console.error("[StrategyCoach] Vision generation failed:", err);
              ctx.draftVision = "We will build an AI-ready HR function that enables our organisation to harness AI responsibly, at pace, and with our people at the centre.";
              ctx.draftPrinciples = [
                { title: "People First", description: "AI augments human capability; it does not replace human judgment in decisions that affect people's lives and careers." },
                { title: "Build Capability Deliberately", description: "We invest in AI literacy and skills across all levels, not just technical roles." },
                { title: "Lead with Trust", description: "We are transparent about how AI is used in people processes and give employees agency." },
                { title: "Move at Pace", description: "We experiment, learn, and scale quickly — accepting that not every initiative will succeed." },
                { title: "Measure What Matters", description: "We track the impact of AI on business outcomes, not just adoption metrics." },
              ];
            }
          }

          // Check if user is approving or requesting changes
          const lower = userMessage.toLowerCase();
          const isApproval = lower.includes("yes") || lower.includes("approve") || lower.includes("looks good") || lower.includes("perfect") || lower.includes("great") || lower.includes("love it") || lower.includes("happy") || lower.includes("proceed");
          const isEditRequest = lower.includes("change") || lower.includes("edit") || lower.includes("update") || lower.includes("different") || lower.includes("instead") || lower.includes("more") || lower.includes("less");

          if (ctx.visionApproved || isApproval) {
            ctx.visionApproved = true;
            responseText = await chat(
              systemPrompt,
              messageHistory,
              userMessage,
              `The user has approved the vision and principles. Celebrate briefly. Tell them the final step is selecting the strategic initiatives that will bring this vision to life. Explain that you'll suggest some based on their ambition level, and they can choose which to include and assign them to phases. Keep it to 2 sentences.`
            );
            updatedAct = "strategy_initiatives";
            suggestedReplies = ["Show me the recommended initiatives"];
          } else if (isEditRequest) {
            // User wants to edit — incorporate their feedback
            try {
              const editResponse = await invokeLLM({
                messages: [
                  { role: "system", content: `You are a strategic HR advisor. The user wants to edit the draft vision statement or principles. Incorporate their feedback and return the updated JSON.` },
                  { role: "user", content: `Current vision: "${ctx.draftVision}"\n\nUser feedback: "${userMessage}"\n\nReturn updated JSON with visionStatement and principles array.` },
                ],
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "strategy_edit",
                    strict: true,
                    schema: {
                      type: "object",
                      properties: {
                        visionStatement: { type: "string" },
                        principles: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: { title: { type: "string" }, description: { type: "string" } },
                            required: ["title", "description"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["visionStatement", "principles"],
                      additionalProperties: false,
                    },
                  },
                },
              } as Parameters<typeof invokeLLM>[0]);
              const content = (editResponse as { choices?: Array<{ message?: { content?: string } }> })
                ?.choices?.[0]?.message?.content || "{}";
              const edited = JSON.parse(content);
              ctx.draftVision = edited.visionStatement || ctx.draftVision;
              ctx.draftPrinciples = edited.principles || ctx.draftPrinciples;
            } catch {
              // keep existing
            }
            responseText = await chat(
              systemPrompt,
              messageHistory,
              userMessage,
              `Tell the user you've updated the vision and principles based on their feedback. Present the updated vision statement and principles clearly in markdown. Ask if they're happy to proceed.`
            );
            // Append the updated vision to the response
            responseText += `\n\n**Vision Statement**\n\n> ${ctx.draftVision}\n\n**Guiding Principles**\n\n${ctx.draftPrinciples.map((p, i) => `${i + 1}. **${p.title}** — ${p.description}`).join("\n")}`;
            suggestedReplies = ["Yes, this looks right — proceed", "One more change..."];
          } else {
            // First time showing the draft
            const principlesText = ctx.draftPrinciples
              .map((p, i) => `${i + 1}. **${p.title}** — ${p.description}`)
              .join("\n");
            responseText = `Here is your draft HR AI Strategy:\n\n**Vision Statement**\n\n> ${ctx.draftVision}\n\n**Guiding Principles**\n\n${principlesText}\n\nThis is your strategy — not mine. Does this capture what you've been describing? Tell me what you'd like to change, or say "approve" to proceed to initiatives.`;
            suggestedReplies = [
              "Yes, this captures it — let's proceed",
              "The vision needs to be bolder",
              "I'd like to change principle 2",
            ];
          }
          break;
        }

        // ── strategy_initiatives ─────────────────────────────────────────────
        case "strategy_initiatives": {
          const lower = userMessage.toLowerCase();
          const isDone = lower.includes("done") || lower.includes("complete") || lower.includes("save") || lower.includes("finish") || lower.includes("that's all") || lower.includes("ready");

          if (isDone || ctx.selectedInitiativeIds.length > 0) {
            // Save the strategy
            await saveStrategy(session.userId, session.tenantId, ctx);
            ctx.saved = true;

            responseText = await chat(
              systemPrompt,
              messageHistory,
              userMessage,
              `The user has completed their HR AI Strategy. Celebrate the work they've done. Summarise what they've created: a vision statement, 5 guiding principles, and ${ctx.selectedInitiativeIds.length} strategic initiatives. Tell them their strategy is now saved and visible on their HR AI Strategy dashboard. Suggest their next step is to share it with their team. Keep it to 3 short paragraphs.`
            );
            updatedAct = "strategy_complete";
            ctx.complete = true;
            sessionComplete = true;
            transitionToMode = "learning";
            suggestedReplies = ["View my strategy dashboard", "Start building my learning plan"];
          } else {
            // Load and present recommended initiatives
            const initiatives = await loadRecommendedInitiatives(session.tenantId, ctx.businessAmbitionLevel);
            const initiativeList = initiatives.length > 0
              ? initiatives.slice(0, 8).map((i, idx) => `${idx + 1}. **${i.title}** (${i.category}) — ${i.description}`).join("\n")
              : "No initiatives found in the library yet.";

            responseText = await chat(
              systemPrompt,
              messageHistory,
              userMessage,
              `Present the following recommended initiatives to the user. Tell them to tell you which ones they want to include and which phase (Foundation, Development, or Scale) to assign each to. Keep your intro to 1 sentence.\n\n${initiativeList}`
            );
            suggestedReplies = [
              "I'd like initiatives 1, 3, and 5 in Foundation phase",
              "Tell me more about initiative 2",
              "I want all of them — assign to phases for me",
            ];
          }
          break;
        }

        // ── strategy_complete ────────────────────────────────────────────────
        case "strategy_complete": {
          responseText = await chat(
            systemPrompt,
            messageHistory,
            userMessage,
            `The strategy session is complete. The user is asking a follow-up question. Answer it helpfully and briefly. Remind them they can always return to the coach to refine their strategy.`
          );
          suggestedReplies = ["View my strategy dashboard", "Start my learning journey"];
          break;
        }

        default: {
          responseText = "Let's continue building your HR AI Strategy. Where would you like to start?";
          updatedAct = "strategy_intro";
          break;
        }
      }
    } catch (err) {
      console.error("[StrategyCoachModeHandler] Error:", err);
      responseText = "I'm sorry, I encountered an issue. Let's continue — what were you saying?";
    }

    // Update act if changed
    if (updatedAct !== ctx.act) {
      ctx.act = updatedAct;
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

export const strategyCoachModeHandler = new StrategyCoachModeHandler();
