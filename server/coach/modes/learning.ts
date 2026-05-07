/**
 * AiQ Coach — Learning Mode Handler
 * Phase 2 — Addendum v1.1 §3.3
 *
 * Implements the Tell-Show-Do-Apply (TSDA) pedagogical model within a conversational interface.
 * Memory budget: 1,200 tokens (active gaps + recent misconceptions + last apply outcomes)
 *
 * Acts: onboarding → tell → show → do → apply_commitment
 * Transitions: debrief → learning (auto), learning → apply (on commitment)
 */

import { invokeLLM } from "../../_core/llm";
import { getDb } from "../../db";
import {
  learningPlans,
  learningPlanItems,
  contentItems,
  contentProgress,
  userCapabilityMemory,
} from "../../../drizzle/schema";
import { eq, asc, and } from "drizzle-orm";
import { DOMAIN_DISPLAY } from "../../assessment/scoringEngine";
import type {
  ModeHandler,
  ModeHandlerInput,
  ModeHandlerOutput,
  CoachSessionContext,
  CoachAct,
  MemoryWriteProposal,
} from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LearningModule {
  id: string;
  title: string;
  contentType: string;
  durationSeconds: number;
  difficulty: number;
  capabilityDomain?: string;
  tsdaStage?: "tell" | "show" | "do" | "apply";
  orderIndex: number;
  status: string; // assigned, in_progress, completed
}

interface LearningModeContext {
  // Plan
  planId?: string;
  modules: LearningModule[];
  currentModuleIndex: number;

  // TSDA progress within current module
  tsdaStage: "tell" | "show" | "do" | "apply_commitment";
  tsdaComplete: {
    tell: boolean;
    show: boolean;
    do: boolean;
  };

  // Comprehension
  comprehensionChecksPassed: number;
  comprehensionChecksTotal: number;
  lastComprehensionQuestion?: string;
  awaitingComprehensionAnswer: boolean;

  // Apply commitment
  applyCommitmentMade: boolean;
  applyCommitmentText?: string;

  // Session state
  introComplete: boolean;
  allModulesComplete: boolean;

  // Active gaps from memory (injected at session start)
  activeGaps: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getContext(session: CoachSessionContext): LearningModeContext {
  const ctx = session.modeContext as Partial<LearningModeContext>;
  return {
    planId: ctx.planId,
    modules: (ctx.modules as LearningModule[] | undefined) ?? [],
    currentModuleIndex: ctx.currentModuleIndex ?? 0,
    tsdaStage: ctx.tsdaStage ?? "tell",
    tsdaComplete: ctx.tsdaComplete ?? { tell: false, show: false, do: false },
    comprehensionChecksPassed: ctx.comprehensionChecksPassed ?? 0,
    comprehensionChecksTotal: ctx.comprehensionChecksTotal ?? 0,
    lastComprehensionQuestion: ctx.lastComprehensionQuestion,
    awaitingComprehensionAnswer: ctx.awaitingComprehensionAnswer ?? false,
    applyCommitmentMade: ctx.applyCommitmentMade ?? false,
    applyCommitmentText: ctx.applyCommitmentText,
    introComplete: ctx.introComplete ?? false,
    allModulesComplete: ctx.allModulesComplete ?? false,
    activeGaps: (ctx.activeGaps as string[] | undefined) ?? [],
  };
}

async function loadLearningPlan(userId: string, tenantId: string): Promise<LearningModule[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get active plan
    const plans = await db
      .select()
      .from(learningPlans)
      .where(and(eq(learningPlans.userId, userId), eq(learningPlans.state, "active")))
      .limit(1);

    if (!plans[0]) return [];

    // Get plan items with content
    const items = await db
      .select({
        id: learningPlanItems.id,
        contentItemId: learningPlanItems.contentItemId,
        orderIndex: learningPlanItems.orderIndex,
        status: learningPlanItems.status,
        title: contentItems.title,
        contentType: contentItems.contentType,
        durationSeconds: contentItems.durationSeconds,
        difficulty: contentItems.difficulty,
        metadataJson: contentItems.metadataJson,
      })
      .from(learningPlanItems)
      .innerJoin(contentItems, eq(learningPlanItems.contentItemId, contentItems.id))
      .where(eq(learningPlanItems.learningPlanId, plans[0].id))
      .orderBy(asc(learningPlanItems.orderIndex));

    return items.map((item) => {
      const meta = (
        typeof item.metadataJson === "string"
          ? JSON.parse(item.metadataJson as string)
          : item.metadataJson ?? {}
      ) as Record<string, unknown>;

      return {
        id: item.id,
        title: item.title,
        contentType: item.contentType,
        durationSeconds: item.durationSeconds,
        difficulty: item.difficulty,
        capabilityDomain: meta.capabilityDomain as string | undefined,
        tsdaStage: inferTsdaStage(item.contentType),
        orderIndex: item.orderIndex,
        status: item.status,
      };
    });
  } catch {
    return [];
  }
}

function inferTsdaStage(contentType: string): "tell" | "show" | "do" | "apply" {
  switch (contentType) {
    case "video":
    case "article":
    case "micro_lesson":
      return "tell";
    case "walkthrough":
    case "worked_example":
      return "show";
    case "quiz":
    case "scenario":
    case "scenario_practice":
    case "simulation":
      return "do";
    case "reflection":
    case "checklist":
    case "nudge":
    case "coach_prompt":
      return "apply";
    default:
      return "tell";
  }
}

async function loadActiveGaps(userId: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const gaps = await db
      .select({ capabilityDomain: userCapabilityMemory.capabilityDomain })
      .from(userCapabilityMemory)
      .where(and(eq(userCapabilityMemory.userId, userId), eq(userCapabilityMemory.memoryType, "gap")))
      .limit(6);

    return gaps.map((g) => g.capabilityDomain);
  } catch {
    return [];
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.round(seconds / 60);
  return `${mins} min${mins !== 1 ? "s" : ""}`;
}

function difficultyLabel(level: number): string {
  switch (level) {
    case 1: return "Foundational";
    case 2: return "Intermediate";
    case 3: return "Advanced";
    case 4: return "Expert";
    default: return "Intermediate";
  }
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(session: CoachSessionContext, ctx: LearningModeContext): string {
  const currentModule = ctx.modules[ctx.currentModuleIndex];
  const domainDisplay = currentModule?.capabilityDomain
    ? (DOMAIN_DISPLAY[currentModule.capabilityDomain as keyof typeof DOMAIN_DISPLAY] ?? currentModule.capabilityDomain)
    : "AI capability";

  const activeGapsList = ctx.activeGaps
    .map((g) => DOMAIN_DISPLAY[g as keyof typeof DOMAIN_DISPLAY] ?? g)
    .join(", ");

  return `You are the AiQ Coach, an expert AI capability development coach for HR professionals.

You are in LEARNING mode. Your role is to guide the user through their personalised learning journey using the Tell-Show-Do-Apply (TSDA) pedagogical model.

Current module: ${currentModule?.title ?? "Introduction to AI Capability"}
Module type: ${currentModule?.contentType ?? "lesson"}
Capability domain: ${domainDisplay}
TSDA stage: ${ctx.tsdaStage}
Module ${ctx.currentModuleIndex + 1} of ${ctx.modules.length}

Active capability gaps: ${activeGapsList || "general AI capability development"}

TSDA Stage Guidance:
- TELL: Explain the concept clearly. Use concrete examples relevant to HR. Keep it focused — one key idea at a time. End with a comprehension check question.
- SHOW: Walk through a worked example or case study. Make your reasoning visible. Show HOW an expert HR professional would approach this. Then ask: "How would you approach this differently?"
- DO: Present a scenario for the user to work through. Give specific, actionable feedback on their response. Identify what they got right and what they missed.
- APPLY_COMMITMENT: Help the user identify a specific, near-term, observable action they can take in their real work. Be concrete — "I will..." not "I should..."

Tone guidelines:
- Conversational, not lecture-like
- Use real HR examples (performance reviews, workforce planning, recruitment, L&D)
- Celebrate progress without being sycophantic
- Be specific in feedback — "That's correct because..." not just "Well done"
- Keep responses to 2-4 paragraphs
- Always end with either a question or a clear next action`;
}

// ─── Response Generators ──────────────────────────────────────────────────────

async function generateTellResponse(
  module: LearningModule,
  ctx: LearningModeContext,
  messageHistory: Array<{ role: string; content: string }>,
  systemPrompt: string,
  userMessage: string,
  isFirstTurn: boolean
): Promise<{ text: string; comprehensionQuestion?: string }> {
  const domainDisplay = module.capabilityDomain
    ? (DOMAIN_DISPLAY[module.capabilityDomain as keyof typeof DOMAIN_DISPLAY] ?? module.capabilityDomain)
    : "AI capability";

  const context = isFirstTurn
    ? `Introduce the module "${module.title}" in the ${domainDisplay} domain. Explain the core concept clearly with a concrete HR example. Then ask a comprehension check question to verify understanding.`
    : `The user responded: "${userMessage}". Continue the Tell stage — deepen the explanation or address their question. End with a comprehension check if not done yet.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...messageHistory.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: `[SYSTEM: ${context}]` },
    ],
  });

  const text =
    (response.choices?.[0]?.message?.content as string) ??
    `Let's explore **${module.title}**. This module focuses on ${domainDisplay} — one of your priority development areas. The core idea here is...`;

  return { text };
}

async function generateShowResponse(
  module: LearningModule,
  ctx: LearningModeContext,
  messageHistory: Array<{ role: string; content: string }>,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const domainDisplay = module.capabilityDomain
    ? (DOMAIN_DISPLAY[module.capabilityDomain as keyof typeof DOMAIN_DISPLAY] ?? module.capabilityDomain)
    : "AI capability";

  const context = ctx.tsdaComplete.tell
    ? `Now move to the SHOW stage. Walk through a concrete worked example of ${domainDisplay} in an HR context. Make your expert reasoning visible step-by-step. After showing the example, ask: "How would you approach a similar situation?"`
    : `The user said: "${userMessage}". Continue the Show stage — elaborate on the worked example or answer their question. Then ask them to try a similar scenario.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...messageHistory.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: `[SYSTEM: ${context}]` },
    ],
  });

  return (
    (response.choices?.[0]?.message?.content as string) ??
    `Let me show you how an experienced HR leader would approach this. Here's a real scenario...`
  );
}

async function generateDoResponse(
  module: LearningModule,
  ctx: LearningModeContext,
  messageHistory: Array<{ role: string; content: string }>,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const domainDisplay = module.capabilityDomain
    ? (DOMAIN_DISPLAY[module.capabilityDomain as keyof typeof DOMAIN_DISPLAY] ?? module.capabilityDomain)
    : "AI capability";

  const isFirstDoTurn = !ctx.tsdaComplete.show;
  const context = isFirstDoTurn
    ? `Move to the DO stage. Present a realistic HR scenario that requires the user to apply ${domainDisplay} skills. Be specific — give them a concrete situation to work through. Ask them to respond with what they would do.`
    : `The user attempted the scenario: "${userMessage}". Provide specific, detailed feedback. Identify what they got right, what they missed, and why it matters. If their answer was strong, acknowledge it specifically. Then either present a follow-up scenario or transition to the Apply Commitment stage.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...messageHistory.slice(-8).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: `[SYSTEM: ${context}]` },
    ],
  });

  return (
    (response.choices?.[0]?.message?.content as string) ??
    `Now it's your turn. Here's a scenario for you to work through...`
  );
}

async function generateApplyCommitmentResponse(
  module: LearningModule,
  ctx: LearningModeContext,
  messageHistory: Array<{ role: string; content: string }>,
  systemPrompt: string,
  userMessage: string
): Promise<{ text: string; commitmentExtracted?: string }> {
  const domainDisplay = module.capabilityDomain
    ? (DOMAIN_DISPLAY[module.capabilityDomain as keyof typeof DOMAIN_DISPLAY] ?? module.capabilityDomain)
    : "AI capability";

  const hasCommitment =
    userMessage.toLowerCase().includes("i will") ||
    userMessage.toLowerCase().includes("i'll") ||
    userMessage.toLowerCase().includes("i plan") ||
    userMessage.toLowerCase().includes("i'm going to") ||
    userMessage.toLowerCase().includes("next week") ||
    userMessage.toLowerCase().includes("tomorrow") ||
    userMessage.toLowerCase().includes("monday");

  const context = !ctx.applyCommitmentMade
    ? `Move to the APPLY COMMITMENT stage. Help the user identify one specific, near-term, observable action they can take in their real work to apply what they've learned about ${domainDisplay}. Ask them: "What's one thing you'll do differently in the next week as a result of this?" Encourage specificity — who, what, when.`
    : hasCommitment
    ? `The user has made a commitment: "${userMessage}". Acknowledge it warmly and specifically. Confirm the commitment back to them. Tell them you'll check in on their progress. Then offer to move to the next module or take a break.`
    : `The user responded: "${userMessage}". Gently push for more specificity. A good commitment is: specific (what exactly), time-bound (when), and observable (how they'll know they did it). Help them refine their commitment.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...messageHistory.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: `[SYSTEM: ${context}]` },
    ],
  });

  const text =
    (response.choices?.[0]?.message?.content as string) ??
    `Before we move on, I'd like you to make one commitment. What's one specific thing you'll do differently in the next week as a result of what you've just learned?`;

  return {
    text,
    commitmentExtracted: hasCommitment ? userMessage : undefined,
  };
}

// ─── Mode Handler ─────────────────────────────────────────────────────────────

export class LearningModeHandler implements ModeHandler {
  readonly mode = "learning" as const;

  async process(input: ModeHandlerInput): Promise<ModeHandlerOutput> {
    const { session, userMessage, messageHistory } = input;
    let ctx = getContext(session);

    // ── Load plan on first turn ───────────────────────────────────────────────
    if (ctx.modules.length === 0) {
      const modules = await loadLearningPlan(session.userId, session.tenantId);
      const gaps = await loadActiveGaps(session.userId);
      ctx = { ...ctx, modules, activeGaps: gaps };
    }

    const systemPrompt = buildSystemPrompt(session, ctx);
    let responseText = "";
    let updatedAct: CoachAct = session.currentAct;
    const memoryProposals: MemoryWriteProposal[] = [];
    let transitionToMode: "apply" | undefined;
    let sessionComplete = false;
    let suggestedReplies: string[] = [];

    const currentModule = ctx.modules[ctx.currentModuleIndex];

    // ── Intro (no plan or first message) ─────────────────────────────────────
    if (!ctx.introComplete) {
      if (ctx.modules.length === 0) {
        responseText = `Welcome to your learning journey! I've noticed you don't have a learning plan set up yet. Let me help you get started. Based on your assessment results, I'll guide you through the most important concepts for your development. What capability area would you like to explore first?`;
        suggestedReplies = ["AI Interaction skills", "AI Output Evaluation", "AI Ethics & Trust", "Show me all areas"];
      } else {
        const firstModule = ctx.modules[0];
        const domainDisplay = firstModule?.capabilityDomain
          ? (DOMAIN_DISPLAY[firstModule.capabilityDomain as keyof typeof DOMAIN_DISPLAY] ?? firstModule.capabilityDomain)
          : "AI capability";

        responseText = `Welcome to your learning journey! I've got ${ctx.modules.length} module${ctx.modules.length !== 1 ? "s" : ""} lined up for you, starting with **${firstModule?.title ?? "your first module"}** — a ${formatDuration(firstModule?.durationSeconds ?? 0)}, ${difficultyLabel(firstModule?.difficulty ?? 2)} exploration of ${domainDisplay}.

I'll guide you through each module using a structured approach: first I'll explain the concept (Tell), then show you how it works in practice (Show), then give you a scenario to try yourself (Do), and finally help you commit to applying it in your real work (Apply).

Ready to begin with your first module?`;
        suggestedReplies = ["Yes, let's start", "Tell me more about the first module", "What's the full plan?"];
      }
      ctx.introComplete = true;
      updatedAct = "onboarding";
    }

    // ── TSDA Learning Loop ────────────────────────────────────────────────────
    else if (currentModule) {
      switch (ctx.tsdaStage) {
        case "tell": {
          const isFirstTurn = !ctx.tsdaComplete.tell;
          const result = await generateTellResponse(
            currentModule,
            ctx,
            messageHistory,
            systemPrompt,
            userMessage,
            isFirstTurn
          );
          responseText = result.text;

          // Check if user's response indicates understanding → advance to Show
          const showsUnderstanding =
            !isFirstTurn &&
            (userMessage.length > 30 ||
              userMessage.toLowerCase().includes("understand") ||
              userMessage.toLowerCase().includes("makes sense") ||
              userMessage.toLowerCase().includes("got it") ||
              userMessage.toLowerCase().includes("yes") ||
              userMessage.toLowerCase().includes("clear"));

          if (showsUnderstanding && !ctx.tsdaComplete.tell) {
            ctx.tsdaComplete = { ...ctx.tsdaComplete, tell: true };
            ctx.tsdaStage = "show";
            suggestedReplies = ["Show me an example", "I'd like to see how this works", "What does this look like in practice?"];
          } else {
            suggestedReplies = ["Can you explain that differently?", "Give me an example", "I understand, what's next?"];
          }
          updatedAct = "onboarding";
          break;
        }

        case "show": {
          responseText = await generateShowResponse(
            currentModule,
            ctx,
            messageHistory,
            systemPrompt,
            userMessage
          );

          // Advance to Do after Show if user responds substantively
          const readyForDo =
            userMessage.length > 20 &&
            !userMessage.toLowerCase().includes("confused") &&
            !userMessage.toLowerCase().includes("don't understand");

          if (readyForDo && !ctx.tsdaComplete.show) {
            ctx.tsdaComplete = { ...ctx.tsdaComplete, show: true };
            ctx.tsdaStage = "do";
            suggestedReplies = ["I'm ready to try", "Give me the scenario", "Let me practise this"];
          } else {
            suggestedReplies = ["Show me another example", "I'm ready to try this myself", "How does this apply to my role?"];
          }
          updatedAct = "onboarding";
          break;
        }

        case "do": {
          responseText = await generateDoResponse(
            currentModule,
            ctx,
            messageHistory,
            systemPrompt,
            userMessage
          );

          // Advance to Apply Commitment after Do if user has attempted the scenario
          const hasAttempted = userMessage.length > 40;
          if (hasAttempted && !ctx.tsdaComplete.do) {
            ctx.tsdaComplete = { ...ctx.tsdaComplete, do: true };
            ctx.tsdaStage = "apply_commitment";
            suggestedReplies = ["I'm ready to commit to applying this", "What should I commit to?", "Move to the apply stage"];
          } else {
            suggestedReplies = ["Let me try again", "I'm not sure — can you give me a hint?", "I'm ready to move on"];
          }
          updatedAct = "onboarding";
          break;
        }

        case "apply_commitment": {
          const result = await generateApplyCommitmentResponse(
            currentModule,
            ctx,
            messageHistory,
            systemPrompt,
            userMessage
          );
          responseText = result.text;

          if (result.commitmentExtracted) {
            ctx.applyCommitmentMade = true;
            ctx.applyCommitmentText = result.commitmentExtracted;

            // Write apply commitment to memory
            if (currentModule.capabilityDomain) {
              memoryProposals.push({
                capabilityDomain: currentModule.capabilityDomain,
                signalKey: `${currentModule.capabilityDomain}_apply_commitment`,
                memoryType: "apply_commitment",
                confidence: 85,
                summary: `Apply commitment for ${currentModule.title}: "${result.commitmentExtracted.slice(0, 200)}"`,
                evidence: {
                  turnId: "learning_apply",
                  sessionId: session.sessionId,
                  mode: "learning",
                },
              });
            }

            // Check if more modules remain
            const nextModuleIndex = ctx.currentModuleIndex + 1;
            if (nextModuleIndex >= ctx.modules.length) {
              ctx.allModulesComplete = true;
              sessionComplete = true;
              suggestedReplies = ["View my progress", "Go to my dashboard", "Start the next session"];
            } else {
              // Advance to next module
              ctx.currentModuleIndex = nextModuleIndex;
              ctx.tsdaStage = "tell";
              ctx.tsdaComplete = { tell: false, show: false, do: false };
              ctx.applyCommitmentMade = false;
              ctx.applyCommitmentText = undefined;

              const nextModule = ctx.modules[nextModuleIndex];
              suggestedReplies = [
                `Start ${nextModule?.title ?? "next module"}`,
                "Take a break and come back later",
                "Show me my overall progress",
              ];
            }
          } else {
            suggestedReplies = [
              "I will try this in my next team meeting",
              "I'll apply this when reviewing AI outputs this week",
              "I commit to testing this approach by Friday",
            ];
          }
          updatedAct = "apply_commitment";
          break;
        }
      }
    }

    // ── All modules complete ──────────────────────────────────────────────────
    else if (ctx.allModulesComplete) {
      responseText = `You've completed all ${ctx.modules.length} module${ctx.modules.length !== 1 ? "s" : ""} in your current learning plan. That's a significant achievement. You've made ${ctx.modules.length} apply commitments — I'll check in with you on your progress. Your capability scores will be updated when you complete your next assessment. Well done.`;
      sessionComplete = true;
      suggestedReplies = ["View my progress", "What's next?", "Go to my dashboard"];
    }

    // ── Fallback ──────────────────────────────────────────────────────────────
    if (!responseText) {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          ...messageHistory.slice(-6).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: userMessage },
        ],
      });
      responseText =
        (response.choices?.[0]?.message?.content as string) ??
        "Let's continue with your learning. What would you like to explore?";
    }

    return {
      responseText,
      updatedAct,
      updatedModeContext: ctx as unknown as Record<string, unknown>,
      memoryProposals,
      transitionToMode,
      sessionComplete,
      suggestedReplies,
    };
  }

  getSystemPrompt(session: CoachSessionContext): string {
    const ctx = getContext(session);
    return buildSystemPrompt(session, ctx);
  }

  isComplete(session: CoachSessionContext): boolean {
    const ctx = getContext(session);
    return ctx.allModulesComplete;
  }

  async onComplete(session: CoachSessionContext): Promise<void> {
    console.log(`[LearningModeHandler] Session ${session.sessionId} learning complete`);
  }
}

export const learningModeHandler = new LearningModeHandler();
