/**
 * AiQ Coach — Debrief Mode Handler
 * Phase 2 — Addendum v1.1 §3.2
 *
 * Acts: debrief_intro → debrief_domain (×N) → debrief_plan
 * Memory budget: 800 tokens (top strengths + top gaps from current session)
 * Transitions: diagnostic → debrief (auto), debrief → learning (on user confirmation)
 */

import { invokeLLM } from "../../_core/llm";
import { getDb } from "../../db";
import { assessmentScores, assessmentSessions, learningPlans } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import {
  DOMAIN_DISPLAY,
  FOUNDATION_DOMAINS,
  STRATEGIC_DOMAINS,
  ALL_DOMAINS,
} from "../../assessment/scoringEngine";
import type {
  ModeHandler,
  ModeHandlerInput,
  ModeHandlerOutput,
  CoachSessionContext,
  CoachAct,
  MemoryWriteProposal,
} from "../types";

// ─── Domain Score Shape ───────────────────────────────────────────────────────

interface DomainScore {
  domain: string;
  displayName: string;
  score: number;
  band: "strong" | "developing" | "needs_work" | "critical";
  signalCount: number;
  tier: "foundation" | "strategic" | "operational";
}

interface DebriefModeContext {
  // Assessment data
  assessmentSessionId?: string;
  overallScore?: number;
  domainScores?: DomainScore[];
  readinessState?: string;

  // Progress through domains
  domainsDebriefed: string[];
  currentDomainIndex: number;

  // Debrief state
  introComplete: boolean;
  allDomainsComplete: boolean;
  planPreviewShown: boolean;

  // Confidence shift tracking
  userSelfRatedConfidence?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreBand(score: number): "strong" | "developing" | "needs_work" | "critical" {
  if (score >= 75) return "strong";
  if (score >= 55) return "developing";
  if (score >= 35) return "needs_work";
  return "critical";
}

function bandLabel(band: string): string {
  switch (band) {
    case "strong": return "a clear strength";
    case "developing": return "developing — on the right track but with room to grow";
    case "needs_work": return "an area that needs focused attention";
    case "critical": return "a critical gap that needs immediate focus";
    default: return "assessed";
  }
}

function tierLabel(tier: string): string {
  switch (tier) {
    case "foundation": return "Foundation";
    case "strategic": return "Strategic";
    case "operational": return "Operational";
    default: return "";
  }
}

async function loadAssessmentScores(
  userId: string,
  assessmentSessionId?: string
): Promise<{ domainScores: DomainScore[]; overallScore: number; readinessState: string } | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    let sessionId = assessmentSessionId;

    // If no specific session, get the latest completed one for this user
    if (!sessionId) {
      const sessions = await db
        .select({ id: assessmentSessions.id })
        .from(assessmentSessions)
        .where(eq(assessmentSessions.userId, userId))
        .orderBy(desc(assessmentSessions.createdAt))
        .limit(1);

      if (!sessions[0]) return null;
      sessionId = sessions[0].id;
    }

    const scores = await db
      .select()
      .from(assessmentScores)
      .where(eq(assessmentScores.sessionId, sessionId))
      .limit(1);

    if (!scores[0]) return null;

    const breakdown = (
      typeof scores[0].scoreBreakdownJson === "string"
        ? JSON.parse(scores[0].scoreBreakdownJson as string)
        : scores[0].scoreBreakdownJson ?? {}
    ) as Record<string, unknown>;

    const capabilityScores = (breakdown.capabilityScores ?? {}) as Record<
      string,
      { score: number; signalCount: number }
    >;

    const domainScores: DomainScore[] = ALL_DOMAINS.map((domain) => {
      const ds = capabilityScores[domain];
      const score = ds?.score ?? 0;
      const tier: "foundation" | "strategic" | "operational" =
        FOUNDATION_DOMAINS.includes(domain as (typeof FOUNDATION_DOMAINS)[number])
          ? "foundation"
          : STRATEGIC_DOMAINS.includes(domain as (typeof STRATEGIC_DOMAINS)[number])
          ? "strategic"
          : "operational";

      return {
        domain,
        displayName: DOMAIN_DISPLAY[domain as keyof typeof DOMAIN_DISPLAY] ?? domain,
        score,
        band: scoreBand(score),
        signalCount: ds?.signalCount ?? 0,
        tier,
      };
    }).filter((d) => d.signalCount > 0);

    const overallScore = parseFloat(scores[0].overallScore as string) || 0;
    const readinessState = (breakdown.readinessState as string) ?? "unknown";

    return { domainScores, overallScore, readinessState };
  } catch {
    return null;
  }
}

function getContext(session: CoachSessionContext): DebriefModeContext {
  const ctx = session.modeContext as Partial<DebriefModeContext>;
  return {
    assessmentSessionId: ctx.assessmentSessionId,
    overallScore: ctx.overallScore,
    domainScores: (ctx.domainScores as DomainScore[] | undefined) ?? [],
    readinessState: ctx.readinessState ?? "unknown",
    domainsDebriefed: (ctx.domainsDebriefed as string[] | undefined) ?? [],
    currentDomainIndex: ctx.currentDomainIndex ?? 0,
    introComplete: ctx.introComplete ?? false,
    allDomainsComplete: ctx.allDomainsComplete ?? false,
    planPreviewShown: ctx.planPreviewShown ?? false,
    userSelfRatedConfidence: ctx.userSelfRatedConfidence,
  };
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(session: CoachSessionContext, ctx: DebriefModeContext): string {
  const domainSummary = (ctx.domainScores ?? [])
    .map((d) => `  • ${d.displayName} (${tierLabel(d.tier)}): ${d.score.toFixed(0)}/100 — ${d.band}`)
    .join("\n");

  return `You are the AiQ Coach, an expert AI capability development coach for HR professionals.

You are now in DEBRIEF mode. The user has just completed their AI capability assessment.

Your role in this mode:
- Walk the user through their results with honesty, warmth, and specificity
- Avoid flattery — be direct about gaps while remaining encouraging
- Connect results to their specific role and context
- Help them understand what their scores mean in practice
- Build commitment to their learning journey
- Transition naturally to the Learning Journey when they're ready

Assessment Results Summary:
  Overall Score: ${ctx.overallScore?.toFixed(0) ?? "N/A"}/100
  Readiness State: ${ctx.readinessState}

Domain Scores:
${domainSummary || "  (Loading...)"}

Current Act: ${session.currentAct}
Domains debriefed so far: ${ctx.domainsDebriefed.join(", ") || "none yet"}

Tone guidelines:
- Be conversational, not report-like
- Use "you" and "your" — make it personal
- Be specific about what the score means in practice
- When discussing gaps, frame them as opportunities, not failures
- Ask follow-up questions to gauge the user's reaction and self-awareness
- Keep responses to 2-4 paragraphs maximum
- Do NOT repeat the score as a number more than once per domain — describe what it means instead`;
}

// ─── Memory Proposals ─────────────────────────────────────────────────────────

function buildMemoryProposals(
  ctx: DebriefModeContext,
  turnId: string,
  sessionId: string
): MemoryWriteProposal[] {
  const proposals: MemoryWriteProposal[] = [];
  const domains = ctx.domainScores ?? [];

  for (const d of domains) {
    if (d.signalCount < 3) continue; // Insufficient evidence

    if (d.band === "strong") {
      proposals.push({
        capabilityDomain: d.domain,
        signalKey: `${d.domain}_strength`,
        memoryType: "strength",
        confidence: Math.min(95, d.score),
        summary: `Demonstrated strength in ${d.displayName} (score: ${d.score.toFixed(0)}/100, ${d.signalCount} signals)`,
        evidence: {
          turnId,
          sessionId,
          mode: "debrief",
        },
      });
    } else if (d.band === "needs_work" || d.band === "critical") {
      proposals.push({
        capabilityDomain: d.domain,
        signalKey: `${d.domain}_gap`,
        memoryType: "gap",
        confidence: Math.min(90, 100 - d.score),
        summary: `Identified gap in ${d.displayName} (score: ${d.score.toFixed(0)}/100, ${d.signalCount} signals)`,
        evidence: {
          turnId,
          sessionId,
          mode: "debrief",
        },
      });
    }
  }

  return proposals;
}

// ─── Response Generators ──────────────────────────────────────────────────────

async function generateIntroResponse(
  ctx: DebriefModeContext,
  messageHistory: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string> {
  const overallScore = ctx.overallScore ?? 0;
  const domains = ctx.domainScores ?? [];
  const strengths = domains.filter((d) => d.band === "strong");
  const gaps = domains.filter((d) => d.band === "needs_work" || d.band === "critical");

  const contextNote = `
Assessment complete. Overall score: ${overallScore.toFixed(0)}/100.
Strengths: ${strengths.map((d) => d.displayName).join(", ") || "none yet identified"}.
Priority gaps: ${gaps.map((d) => d.displayName).join(", ") || "none identified"}.
Total domains assessed: ${domains.length}.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...messageHistory.slice(-4).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role: "user",
        content: `[SYSTEM: Assessment just completed. Generate the debrief introduction. Context: ${contextNote}]`,
      },
    ],
  });

  return (
    (response.choices?.[0]?.message?.content as string) ??
    `Your assessment is complete. Let me walk you through what I found. Overall, you scored ${overallScore.toFixed(0)} out of 100 across ${domains.length} capability domains. I'll take you through each one — starting with your foundation capabilities, then your strategic and operational areas. Ready to dive in?`
  );
}

async function generateDomainDebriefResponse(
  domain: DomainScore,
  ctx: DebriefModeContext,
  messageHistory: Array<{ role: string; content: string }>,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const isLast = ctx.currentDomainIndex >= (ctx.domainScores?.length ?? 1) - 1;

  const domainContext = `
Domain to debrief: ${domain.displayName} (${tierLabel(domain.tier)})
Score: ${domain.score.toFixed(0)}/100
Band: ${bandLabel(domain.band)}
Signal count: ${domain.signalCount} data points
User's last message: "${userMessage}"
${isLast ? "This is the LAST domain — after this, transition to the plan preview." : `Next domain will be: ${ctx.domainScores?.[ctx.currentDomainIndex + 1]?.displayName ?? "the next area"}`}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...messageHistory.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role: "user",
        content: `[SYSTEM: Debrief this domain now. ${domainContext}]`,
      },
    ],
  });

  return (
    (response.choices?.[0]?.message?.content as string) ??
    `Let's look at your **${domain.displayName}** results. This is ${bandLabel(domain.band)}. ${isLast ? "That covers all your domains. Let me now show you what your personalised learning journey looks like." : "Shall we move on to the next area?"}`
  );
}

async function generatePlanPreviewResponse(
  ctx: DebriefModeContext,
  userId: string,
  messageHistory: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string> {
  const gaps = (ctx.domainScores ?? []).filter(
    (d) => d.band === "needs_work" || d.band === "critical"
  );

  // Check if a learning plan already exists
  const db = await getDb();
  let planExists = false;
  if (db) {
    try {
      const plans = await db
        .select({ id: learningPlans.id })
        .from(learningPlans)
        .where(eq(learningPlans.userId, userId))
        .limit(1);
      planExists = plans.length > 0;
    } catch {
      // ignore
    }
  }

  const planContext = `
Priority gaps to address: ${gaps.map((d) => `${d.displayName} (${d.score.toFixed(0)}/100)`).join(", ") || "none — excellent overall performance"}.
Learning plan status: ${planExists ? "A personalised learning plan has already been generated for you." : "A personalised learning plan is ready to be generated."}
User's last message: (transitioning from domain debrief)`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...messageHistory.slice(-4).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role: "user",
        content: `[SYSTEM: Present the learning plan preview and ask if the user is ready to start. ${planContext}]`,
      },
    ],
  });

  return (
    (response.choices?.[0]?.message?.content as string) ??
    `Based on everything we've just discussed, I've mapped out a personalised learning journey for you. It focuses on your priority areas — ${gaps.map((d) => d.displayName).join(" and ") || "building on your existing strengths"}. Your plan is structured in phases, starting with the foundations and building towards strategic application. Shall we take a look at your first learning module?`
  );
}

// ─── Mode Handler ─────────────────────────────────────────────────────────────

export class DebriefModeHandler implements ModeHandler {
  readonly mode = "debrief" as const;

  async process(input: ModeHandlerInput): Promise<ModeHandlerOutput> {
    const { session, userMessage, messageHistory } = input;
    let ctx = getContext(session);

    // ── Load assessment scores on first turn ──────────────────────────────────
    if (!ctx.domainScores || ctx.domainScores.length === 0) {
      const scoreData = await loadAssessmentScores(
        session.userId,
        session.assessmentSessionId
      );
      if (scoreData) {
        ctx = {
          ...ctx,
          domainScores: scoreData.domainScores,
          overallScore: scoreData.overallScore,
          readinessState: scoreData.readinessState,
        };
      }
    }

    const systemPrompt = buildSystemPrompt(session, ctx);
    let responseText = "";
    let updatedAct: CoachAct = session.currentAct;
    let memoryProposals: MemoryWriteProposal[] = [];
    let transitionToMode: "learning" | undefined;
    let sessionComplete = false;
    let suggestedReplies: string[] = [];

    // ── Act: debrief_intro ────────────────────────────────────────────────────
    if (!ctx.introComplete || session.currentAct === "debrief_intro") {
      responseText = await generateIntroResponse(ctx, messageHistory, systemPrompt);
      ctx.introComplete = true;
      updatedAct = "debrief_domain";
      suggestedReplies = ["Let's start", "Tell me more about my overall score", "Where should I focus first?"];
    }

    // ── Act: debrief_domain ───────────────────────────────────────────────────
    else if (session.currentAct === "debrief_domain" && !ctx.allDomainsComplete) {
      const domains = ctx.domainScores ?? [];
      const currentDomain = domains[ctx.currentDomainIndex];

      if (!currentDomain) {
        // All domains done
        ctx.allDomainsComplete = true;
        updatedAct = "debrief_plan";
      } else {
        responseText = await generateDomainDebriefResponse(
          currentDomain,
          ctx,
          messageHistory,
          systemPrompt,
          userMessage
        );

        ctx.domainsDebriefed.push(currentDomain.domain);
        ctx.currentDomainIndex += 1;

        if (ctx.currentDomainIndex >= domains.length) {
          ctx.allDomainsComplete = true;
          updatedAct = "debrief_plan";
          suggestedReplies = ["Show me my learning plan", "What should I focus on first?", "How long will this take?"];
        } else {
          const nextDomain = domains[ctx.currentDomainIndex];
          suggestedReplies = [
            `Tell me more about ${currentDomain.displayName}`,
            `Move on to ${nextDomain?.displayName ?? "the next area"}`,
            "How does this compare to others in my role?",
          ];
        }
      }
    }

    // ── Act: debrief_plan ─────────────────────────────────────────────────────
    if (session.currentAct === "debrief_plan" || ctx.allDomainsComplete) {
      if (!ctx.planPreviewShown) {
        responseText = await generatePlanPreviewResponse(ctx, session.userId, messageHistory, systemPrompt);
        ctx.planPreviewShown = true;
        updatedAct = "debrief_plan";
        suggestedReplies = [
          "Yes, let's start learning",
          "Tell me more about the plan",
          "How long will the first module take?",
        ];
      } else {
        // User has seen the plan — check if they want to transition to learning
        const lowerMsg = userMessage.toLowerCase();
        const wantsToLearn =
          lowerMsg.includes("start") ||
          lowerMsg.includes("learn") ||
          lowerMsg.includes("yes") ||
          lowerMsg.includes("let's go") ||
          lowerMsg.includes("ready") ||
          lowerMsg.includes("begin") ||
          lowerMsg.includes("module");

        if (wantsToLearn) {
          // Write memory proposals before transitioning
          memoryProposals = buildMemoryProposals(ctx, "debrief_complete", session.sessionId);
          transitionToMode = "learning";
          responseText =
            "Excellent — let's get started. I'm taking you to your first learning module now. Remember, the goal isn't to rush through content — it's to genuinely build capability you can apply in your work. I'll be here throughout to help you understand, practise, and apply what you learn.";
        } else {
          // Answer their question about the plan
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
            "Your learning plan is personalised to your specific gaps and role. It's structured in phases — starting with foundation concepts and building to strategic application. Each module takes 15–30 minutes. Ready to begin?";
          suggestedReplies = ["Yes, let's start", "How is the plan structured?", "Can I change the order?"];
        }
      }
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
        "I'm here to walk you through your results. What would you like to explore?";
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
    return ctx.planPreviewShown && ctx.allDomainsComplete;
  }

  async onComplete(session: CoachSessionContext): Promise<void> {
    // Telemetry hook — debrief complete
    console.log(`[DebriefModeHandler] Session ${session.sessionId} debrief complete`);
  }
}

export const debriefModeHandler = new DebriefModeHandler();
