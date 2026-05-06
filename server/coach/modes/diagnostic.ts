/**
 * AiQ Coach — Diagnostic Mode Handler
 * Phase 1 capability: conversational assessment
 *
 * Architecture:
 * - Conversational LLM presents items as natural dialogue
 * - Constrained classifier maps free-text responses to structured options
 * - Anti-gaming and contradiction engines run on every turn
 * - Three acts: onboarding → assessment (baseline/adaptive/validation) → closing
 *
 * The conversational LLM NEVER sees option labels or signal deltas.
 * Only the classifier maps responses to scoring outcomes.
 * Addendum v1.1 §4, §5, §6
 */

import { randomUUID } from "crypto";
import { invokeLLM } from "../../_core/llm";
import {
  generateAdaptiveItem,
  selectNextGenerationVariables,
  determineSessionPhase,
  type GeneratedItem,
  type GenerationVariables,
} from "../../assessment/adaptiveEngine";
import { resolveRoleArchetype } from "../../assessment/roleArchetypes";
import { analyseGamingPatterns } from "../../assessment/antiGamingEngine";
import {
  detectContradictions,
  generateContradictionProbeSpec,
  type AnswerRecord,
  type ContradictionPair,
} from "../../assessment/contradictionEngine";
import { classifierService } from "../classifier";
import type {
  ModeHandler,
  ModeHandlerInput,
  ModeHandlerOutput,
  CoachSessionContext,
  CoachAct,
  TurnFlags,
  MemoryWriteProposal,
} from "../types";

// ─── Mode Context Shape ───────────────────────────────────────────────────────

interface DiagnosticModeContext {
  // Onboarding collected fields
  role?: string;
  seniority?: string;
  sector?: string;
  aiUsageLevel?: string;
  orgSize?: string;
  onboardingComplete?: boolean;

  // Assessment state
  answeredCount: number;
  totalTarget: number;
  currentItem?: GeneratedItem;
  currentItemId?: string;
  pendingClassification?: boolean;

  // Answer history for anti-gaming and contradiction detection
  answerHistory: Array<{
    itemId: string;
    capabilityKey: string;
    interactionType: string;
    selectedOption: string;
    signalDeltas: Record<string, number>;
    riskLevel: string;
    difficulty: number;
    confidence: number;
  }>;

  // Interaction type tracking
  interactionTypesUsed: Record<string, number>;
  capabilitySignalCounts: Record<string, number>;
  highRiskAnswerCount: number;
  contradictionCount: number;
  gamingScrutinyLevel: "normal" | "elevated" | "high";

  // Contradiction probes
  pendingContradictionProbe?: {
    probeText: string;
    targetCapability: string;
    targetSignal: string;
  };
}

function emptyContext(): DiagnosticModeContext {
  return {
    answeredCount: 0,
    totalTarget: 30, // Default; adjusted after onboarding
    answerHistory: [],
    interactionTypesUsed: {},
    capabilitySignalCounts: {},
    highRiskAnswerCount: 0,
    contradictionCount: 0,
    gamingScrutinyLevel: "normal",
  };
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const COACH_PERSONA = `You are the AiQ Coach — a warm, intellectually rigorous diagnostic coach for HR professionals.

Your role is to assess the user's AI capability through natural conversation. You are NOT a chatbot or a form. You are a trusted coach who:
- Asks one focused question at a time
- Listens carefully and acknowledges what the user says before moving on
- Uses brief, professional language — no filler, no excessive praise
- Never reveals that you are scoring or classifying responses
- Never mentions "options A, B, C, D" or any scoring system
- Adapts your tone to the user's seniority and role
- Probes gently when a response is vague or inconsistent
- Maintains a calm, confident, slightly challenging tone — like a respected peer

CRITICAL RULES:
1. Ask ONLY ONE question per turn
2. Never reveal the assessment structure, scoring, or option labels
3. Never say "great answer" or give evaluative feedback — just acknowledge and move on
4. Keep responses under 120 words unless presenting a scenario
5. When presenting a scenario, keep it under 200 words`;

function buildSystemPrompt(ctx: DiagnosticModeContext): string {
  const roleContext = ctx.role
    ? `\nThe user is a ${ctx.seniority ?? ""} ${ctx.role} in the ${ctx.sector ?? "HR"} sector.`
    : "";

  const progressContext =
    ctx.onboardingComplete && ctx.answeredCount > 0
      ? `\nAssessment progress: ${ctx.answeredCount}/${ctx.totalTarget} scenarios completed.`
      : "";

  return `${COACH_PERSONA}${roleContext}${progressContext}`;
}

// ─── Onboarding Act ───────────────────────────────────────────────────────────

const ONBOARDING_QUESTIONS = [
  {
    field: "role" as const,
    prompt: "To get started, could you tell me your current HR role? For example: HR Business Partner, L&D Manager, Chief People Officer, or something else.",
  },
  {
    field: "seniority" as const,
    prompt: "And what level would you say you're at — early career, mid-level, senior, or executive/C-suite?",
  },
  {
    field: "sector" as const,
    prompt: "What sector does your organisation operate in? For example: financial services, healthcare, technology, retail, or public sector.",
  },
  {
    field: "aiUsageLevel" as const,
    prompt: "How would you describe your current use of AI tools in your work? Rarely or never, occasionally for specific tasks, regularly as part of your workflow, or extensively across most of your work?",
  },
];

function getNextOnboardingQuestion(ctx: DiagnosticModeContext): string | null {
  for (const q of ONBOARDING_QUESTIONS) {
    if (!ctx[q.field]) {
      return q.prompt;
    }
  }
  return null;
}

function extractOnboardingField(
  message: string,
  field: string
): string {
  // Simple extraction — the LLM will handle nuanced parsing
  return message.trim().substring(0, 100);
}

async function parseOnboardingResponse(
  field: string,
  userMessage: string,
  history: Array<{ role: string; content: string }>
): Promise<string> {
  // Use LLM to extract the relevant field value from natural language
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Extract the ${field} from the user's message. Return ONLY the extracted value as a short phrase (2-5 words max). If unclear, return "unknown".`,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "field_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              value: { type: "string", description: "The extracted field value" },
            },
            required: ["value"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return parsed.value || "unknown";
    }
  } catch {}
  return extractOnboardingField(userMessage, field);
}

// ─── Assessment Act ───────────────────────────────────────────────────────────

async function generateNextItem(ctx: DiagnosticModeContext): Promise<GeneratedItem> {
  const roleArchetype = resolveRoleArchetype(ctx.role ?? "hr_generalist");
  const phase = determineSessionPhase(ctx.answeredCount, ctx.totalTarget);

  const selectionCtx = {
    answeredCount: ctx.answeredCount,
    totalTarget: ctx.totalTarget,
    interactionTypesUsed: ctx.interactionTypesUsed,
    capabilitySignalCounts: ctx.capabilitySignalCounts,
    highRiskAnswerCount: ctx.highRiskAnswerCount,
    gamingScrutinyLevel: ctx.gamingScrutinyLevel,
    contradictionCount: ctx.contradictionCount,
    roleArchetype,
    seniority: ctx.seniority ?? "mid",
    sector: ctx.sector ?? "general",
    aiUsageLevel: ctx.aiUsageLevel ?? "occasional",
    orgIntent: "improve_ai_capability",
  };

  const vars = selectNextGenerationVariables(selectionCtx as any);
  return generateAdaptiveItem(vars);
}

function formatItemAsConversation(item: GeneratedItem, turnCount: number): string {
  const parts: string[] = [];

  // Brief transition (not on first item)
  if (turnCount > 0) {
    parts.push("Let me give you another scenario.");
  }

  // Scenario
  parts.push(item.scenario);

  // AI output block if present
  if (item.aiOutput) {
    parts.push(`\nHere's the AI output in question:\n\n"${item.aiOutput}"`);
  }

  // Data context if present
  if (item.dataContext) {
    parts.push(`\nContext:\n${item.dataContext}`);
  }

  // Constraint
  if (item.constraint) {
    parts.push(`\n${item.constraint}`);
  }

  // The actual question
  parts.push(`\n${item.question}`);

  return parts.join("\n");
}

// ─── Anti-gaming Check ────────────────────────────────────────────────────────

function checkForGaming(ctx: DiagnosticModeContext): TurnFlags {
  if (ctx.answerHistory.length < 3) {
    return {
      gamingDetected: false,
      contradictionDetected: false,
      suppressMemoryWrite: false,
      scrutinyLevel: "normal",
    };
  }

  // Build answer records for the anti-gaming engine (shape matches analyseGamingPatterns)
  const gamingRecords = ctx.answerHistory.map((a) => ({
    selectedValue: a.selectedOption,
    optionPosition: null as number | null,
    timeToAnswerMs: 5000,
    outcomeClass: "acceptable" as string | null,
    confidenceScore: a.confidence,
    signalDeltas: a.signalDeltas,
    interactionType: a.interactionType,
    riskLevel: a.riskLevel,
  }));

  const gamingAnalysis = analyseGamingPatterns(gamingRecords, ctx.gamingScrutinyLevel);

  // GamingAnalysis has: score, patterns, scrutinyLevel, injectionRequired, recommendedInjections
  const gamingDetected = gamingAnalysis.patterns.length > 0 && gamingAnalysis.score < 0.5;

  return {
    gamingDetected,
    gamingPatterns: gamingAnalysis.patterns,
    contradictionDetected: false,
    suppressMemoryWrite: gamingDetected,
    scrutinyLevel: gamingAnalysis.scrutinyLevel,
  };
}

// ─── Contradiction Check ──────────────────────────────────────────────────────

function checkForContradictions(ctx: DiagnosticModeContext): {
  detected: boolean;
  probeText?: string;
  targetCapability?: string;
  targetSignal?: string;
} {
  if (ctx.answerHistory.length < 5) return { detected: false };

  const answerRecords: AnswerRecord[] = ctx.answerHistory.map((a) => ({
    itemId: a.itemId,
    capabilityKey: a.capabilityKey,
    outcomeClass: "acceptable",
    signalDeltas: a.signalDeltas,
    confidenceScore: a.confidence,
    interactionType: a.interactionType,
    riskLevel: a.riskLevel,
  }));

  const result = detectContradictions(answerRecords);

  if (!result.requiresProbe || result.pairs.length === 0) return { detected: false };

  const firstPair = result.pairs[0];
  const probe = generateContradictionProbeSpec(firstPair, "hr_generalist");
  return {
    detected: true,
    // ContradictionProbeSpec has: type, targetCapability, roleArchetypeId, reason, mustInclude etc.
    // We use reason as the probe text since probeText is not a field
    probeText: `I'd like to revisit something. ${probe.reason}`,
    targetCapability: probe.targetCapability,
    targetSignal: probe.mustInclude[0],
  };
}

// ─── Closing Act ──────────────────────────────────────────────────────────────

async function generateClosingMessage(ctx: DiagnosticModeContext): Promise<string> {
  const domainsAssessed = Object.keys(ctx.capabilitySignalCounts).length;
  return `Thank you — that's everything I need. I've assessed your AI capability across ${domainsAssessed} domains through ${ctx.answeredCount} scenarios. Your personalised results and learning plan are being prepared now. I'll have them ready for you in a moment.`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export class DiagnosticModeHandler implements ModeHandler {
  mode = "diagnostic" as const;

  getSystemPrompt(session: CoachSessionContext): string {
    const ctx = (session.modeContext as unknown as DiagnosticModeContext) ?? emptyContext();
    return buildSystemPrompt(ctx);
  }
  isComplete(session: CoachSessionContext): boolean {
    const ctx = (session.modeContext as unknown as DiagnosticModeContext) ?? emptyContext();;
    return ctx.answeredCount >= ctx.totalTarget && ctx.onboardingComplete === true;
  }

  async onComplete(session: CoachSessionContext): Promise<void> {
    // Trigger assessment completion — the router will handle results generation
    // This is a hook for future integration with the scoring engine
  }

  async process(input: ModeHandlerInput): Promise<ModeHandlerOutput> {
    const { session, userMessage, messageHistory } = input;
    const ctx: DiagnosticModeContext = {
      ...emptyContext(),
      ...(session.modeContext as unknown as DiagnosticModeContext),
    };

    // ── Act: Onboarding ──────────────────────────────────────────────────────
    if (!ctx.onboardingComplete) {
      return this.handleOnboarding(ctx, session, userMessage, messageHistory);
    }

    // ── Act: Assessment ──────────────────────────────────────────────────────
    if (ctx.answeredCount < ctx.totalTarget) {
      return this.handleAssessment(ctx, session, userMessage, messageHistory);
    }

    // ── Act: Closing ─────────────────────────────────────────────────────────
    const closingMessage = await generateClosingMessage(ctx);
    return {
      responseText: closingMessage,
      updatedAct: "closing",
      updatedModeContext: ctx as unknown as Record<string, unknown>,
      sessionComplete: true,
    };
  }

  private async handleOnboarding(
    ctx: DiagnosticModeContext,
    session: CoachSessionContext,
    userMessage: string,
    history: Array<{ role: string; content: string }>
  ): Promise<ModeHandlerOutput> {
    // First turn — send the welcome message
    if (history.filter((m) => m.role === "user").length === 0) {
      const welcomeMessage = `Hello! I'm your AiQ Coach. I'm going to have a conversation with you to understand your current AI capability as an HR professional — not a quiz, just a focused dialogue.

Before we dive into some real-world scenarios, I'd like to learn a little about you. ${ONBOARDING_QUESTIONS[0].prompt}`;

      return {
        responseText: welcomeMessage,
        updatedAct: "onboarding",
        updatedModeContext: ctx as unknown as Record<string, unknown>,
      };
    }

    // Parse the user's response to extract the relevant field
    const nextQuestion = getNextOnboardingQuestion(ctx);
    const currentField = ONBOARDING_QUESTIONS.find((q) => !ctx[q.field])?.field;

    if (currentField && userMessage.trim().length > 0) {
      const extractedValue = await parseOnboardingResponse(
        currentField,
        userMessage,
        history as any
      );
      // Safe cast: DiagnosticModeContext has string-keyed onboarding fields
      (ctx as unknown as Record<string, unknown>)[currentField] = extractedValue;
    }

    // Check if onboarding is complete
    const nextQ = getNextOnboardingQuestion(ctx);
    if (!nextQ) {
      // All onboarding fields collected — transition to assessment
      ctx.onboardingComplete = true;
      ctx.totalTarget = 30; // Standard session length

      // Generate the first assessment item
      const firstItem = await generateNextItem(ctx);
      ctx.currentItem = firstItem;
      ctx.currentItemId = randomUUID();
      ctx.pendingClassification = false;

      const transitionMessage = await this.generateTransitionToAssessment(ctx, firstItem);
      return {
        responseText: transitionMessage,
        updatedAct: "baseline",
        updatedModeContext: ctx as unknown as Record<string, unknown>,
      };
    }

    // Continue onboarding — use LLM to craft a natural acknowledgement + next question
    const acknowledgement = await this.generateOnboardingAcknowledgement(
      userMessage,
      nextQ,
      history as any
    );

    return {
      responseText: acknowledgement,
      updatedAct: "onboarding",
      updatedModeContext: ctx as unknown as Record<string, unknown>,
    };
  }

  private async generateOnboardingAcknowledgement(
    userMessage: string,
    nextQuestion: string,
    history: Array<{ role: string; content: string }>
  ): Promise<string> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `${COACH_PERSONA}

You are in the onboarding phase. The user has just answered a question about themselves.
Acknowledge their answer briefly (1 sentence, no evaluation), then ask the next question exactly as written.
Keep the total response under 60 words.`,
          },
          ...history.slice(-4).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          {
            role: "user",
            content: userMessage,
          },
          {
            role: "system",
            content: `Next question to ask: "${nextQuestion}"`,
          },
        ],
      });

      const content = response?.choices?.[0]?.message?.content;
      if (typeof content === "string") return content;
    } catch {}

    // Fallback
    return `Got it. ${nextQuestion}`;
  }

  private async generateTransitionToAssessment(
    ctx: DiagnosticModeContext,
    firstItem: GeneratedItem
  ): Promise<string> {
    const roleLabel = ctx.role ?? "HR professional";
    const transition = `Thanks — that gives me a good picture. Now let's get into some real scenarios. I'll present you with ${ctx.totalTarget} situations that HR professionals like you encounter when working with AI. There are no right or wrong answers — I'm interested in how you think, not what you know.

Here's the first one.

${formatItemAsConversation(firstItem, 0)}`;

    return transition;
  }

  private async handleAssessment(
    ctx: DiagnosticModeContext,
    session: CoachSessionContext,
    userMessage: string,
    history: Array<{ role: string; content: string }>
  ): Promise<ModeHandlerOutput> {
    const flags = checkForGaming(ctx);
    const memoryProposals: MemoryWriteProposal[] = [];

    // ── Handle contradiction probe response ──────────────────────────────────
    if (ctx.pendingContradictionProbe) {
      const probe = ctx.pendingContradictionProbe;
      ctx.pendingContradictionProbe = undefined;
      ctx.contradictionCount++;

      // Classify the contradiction probe response
      if (ctx.currentItem) {
        const classification = await classifierService.classify({
          itemId: ctx.currentItemId ?? randomUUID(),
          itemPrompt: probe.probeText,
          options: ctx.currentItem.options.map((o) => ({
            label: o.label as "A" | "B" | "C" | "D",
            text: o.text,
            signalDeltas: o.signalDeltas,
          })),
          userResponse: userMessage,
        });

        if (!flags.gamingDetected && classification.confidence >= 0.45) {
          // Record memory proposal for the contradiction resolution
          memoryProposals.push({
            capabilityDomain: ctx.currentItem.capabilityKey,
            signalKey: probe.targetSignal ?? "general",
            memoryType: "confidence_shift",
            confidence: Math.round(classification.confidence * 100),
            summary: `Contradiction probe resolved: ${classification.rationale}`,
            evidence: {
              turnId: randomUUID(),
              sessionId: session.sessionId,
              mode: "diagnostic",
              classificationResult: classification,
            },
          });
        }
      }
    }

    // ── Classify the current item response ───────────────────────────────────
    if (ctx.currentItem && ctx.pendingClassification !== false) {
      const item = ctx.currentItem;
      const classification = await classifierService.classify({
        itemId: ctx.currentItemId ?? randomUUID(),
        itemPrompt: item.question,
        options: item.options.map((o) => ({
          label: o.label as "A" | "B" | "C" | "D",
          text: o.text,
          signalDeltas: o.signalDeltas,
        })),
        userResponse: userMessage,
        conversationContext: history
          .slice(-4)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n"),
      });

      // Record in answer history
      ctx.answerHistory.push({
        itemId: ctx.currentItemId ?? randomUUID(),
        capabilityKey: item.capabilityKey,
        interactionType: item.interactionType,
        selectedOption: classification.selectedOption,
        signalDeltas: classification.signalDeltas,
        riskLevel: item.riskLevel,
        difficulty: item.difficulty,
        confidence: classification.confidence,
      });

      ctx.answeredCount++;
      ctx.interactionTypesUsed[item.interactionType] =
        (ctx.interactionTypesUsed[item.interactionType] ?? 0) + 1;
      ctx.capabilitySignalCounts[item.capabilityKey] =
        (ctx.capabilitySignalCounts[item.capabilityKey] ?? 0) + 1;
      if (item.riskLevel === "High") ctx.highRiskAnswerCount++;

      // Update gaming scrutiny level
      if (flags.gamingDetected) {
        ctx.gamingScrutinyLevel =
          ctx.gamingScrutinyLevel === "normal"
            ? "elevated"
            : "high";
      }

      // Memory proposal for this classification
      if (!flags.gamingDetected && classification.confidence >= 0.65) {
        const signalKey = Object.keys(classification.signalDeltas)[0] ?? "general";
        const delta = classification.signalDeltas[signalKey] ?? 0;
        memoryProposals.push({
          capabilityDomain: item.capabilityKey,
          signalKey,
          memoryType: delta > 0 ? "strength" : "gap",
          confidence: Math.round(classification.confidence * 100),
          summary: `${item.interactionType}: ${classification.rationale}`,
          evidence: {
            turnId: randomUUID(),
            sessionId: session.sessionId,
            mode: "diagnostic",
            classificationResult: classification,
          },
        });
      }
    }

    // ── Check if assessment is complete ──────────────────────────────────────
    if (ctx.answeredCount >= ctx.totalTarget) {
      const closingMessage = await generateClosingMessage(ctx);
      return {
        responseText: closingMessage,
        updatedAct: "closing",
        updatedModeContext: ctx as unknown as Record<string, unknown>,
        flags,
        memoryProposals,
        sessionComplete: true,
      };
    }

    // ── Check for contradiction probe ────────────────────────────────────────
    const contradictionCheck = checkForContradictions(ctx);
    if (contradictionCheck.detected && ctx.contradictionCount < 3) {
      ctx.pendingContradictionProbe = {
        probeText: contradictionCheck.probeText ?? "",
        targetCapability: contradictionCheck.targetCapability ?? "",
        targetSignal: contradictionCheck.targetSignal ?? "",
      };

      // Use the contradiction probe as the next message
      const probeMessage = await this.generateProbeTransition(
        contradictionCheck.probeText ?? "",
        history as any
      );

      return {
        responseText: probeMessage,
        updatedAct: this.getCurrentAct(ctx),
        updatedModeContext: ctx as unknown as Record<string, unknown>,
        flags: { ...flags, contradictionDetected: true },
        memoryProposals,
      };
    }

    // ── Generate next item ────────────────────────────────────────────────────
    const nextItem = await generateNextItem(ctx);
    ctx.currentItem = nextItem;
    ctx.currentItemId = randomUUID();
    ctx.pendingClassification = true;

    const nextMessage = await this.generateItemTransition(
      nextItem,
      userMessage,
      ctx,
      history as any
    );

    return {
      responseText: nextMessage,
      updatedAct: this.getCurrentAct(ctx),
      updatedModeContext: ctx as unknown as Record<string, unknown>,
      flags,
      memoryProposals,
    };
  }

  private getCurrentAct(ctx: DiagnosticModeContext): CoachAct {
    const phase = determineSessionPhase(ctx.answeredCount, ctx.totalTarget);
    if (phase === "baseline") return "baseline";
    if (phase === "adaptive") return "adaptive";
    return "validation";
  }

  private async generateItemTransition(
    item: GeneratedItem,
    userMessage: string,
    ctx: DiagnosticModeContext,
    history: Array<{ role: string; content: string }>
  ): Promise<string> {
    // Use LLM to craft a brief acknowledgement + present the next scenario
    const itemText = formatItemAsConversation(item, ctx.answeredCount);

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `${buildSystemPrompt(ctx)}

You are transitioning between assessment scenarios.
1. Acknowledge the user's previous response in 1 sentence (no evaluation, no "great answer").
2. Then present the next scenario exactly as provided.
Keep the acknowledgement under 15 words.`,
          },
          ...history.slice(-2).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          {
            role: "user",
            content: userMessage,
          },
          {
            role: "system",
            content: `Next scenario to present:\n\n${itemText}`,
          },
        ],
      });

      const content = response?.choices?.[0]?.message?.content;
      if (typeof content === "string") return content;
    } catch {}

    // Fallback — just present the item directly
    return `Understood. ${itemText}`;
  }

  private async generateProbeTransition(
    probeText: string,
    history: Array<{ role: string; content: string }>
  ): Promise<string> {
    // Use LLM to present the contradiction probe naturally
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `${COACH_PERSONA}

Present the following follow-up probe naturally, as if you noticed something interesting in the conversation. Do not say "I noticed a contradiction" or anything evaluative. Just ask the question conversationally. Keep it under 60 words.`,
          },
          ...history.slice(-2).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          {
            role: "system",
            content: `Probe to ask: "${probeText}"`,
          },
        ],
      });

      const content = response?.choices?.[0]?.message?.content;
      if (typeof content === "string") return content;
    } catch {}

    return probeText;
  }
}
