/**
 * AiQ Coach — Main Page
 *
 * Full-screen conversational interface for the AiQ Coach.
 * Phase 1: Diagnostic mode (assessment via conversation).
 *
 * Layout:
 * - Left panel: Coach identity, mode indicator, progress, session controls
 * - Right panel: Chat interface (messages + input)
 * - Mobile: stacked, left panel collapses to a top bar
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Send,
  ChevronLeft,
  RotateCcw,
  HelpCircle,
  Pause,
  Play,
  CheckCircle2,
  Clock,
  Brain,
  MessageSquare,
  Shield,
  Zap,
  Users,
  TrendingUp,
  Loader2,
  BookOpen,
  BarChart2,
  ArrowRight,
  CircleDot,
  Circle,
  Target,
  Lightbulb,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";

// ─── Types ────────────────────────────────────────────────────────────────────

type CoachMode = "diagnostic" | "debrief" | "learning" | "practice" | "apply" | "strategy" | "manager";

type CoachAct =
  | "onboarding"
  | "baseline"
  | "adaptive"
  | "validation"
  | "closing"
  | "debrief_intro"
  | "debrief_domain"
  | "debrief_plan"
  | "apply_commitment"
  | "apply_checkin"
  | "apply_evidence";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODE_LABELS: Record<CoachMode, string> = {
  diagnostic: "AI Skills Check",
  debrief: "Results Debrief",
  learning: "Learning Coach",
  practice: "Practice & Apply",
  apply: "Apply Coaching",
  strategy: "Strategy Coach",
  manager: "Manager View",
};

const MODE_DESCRIPTIONS: Record<CoachMode, string> = {
  diagnostic: "I'll assess your AI capability through a focused conversation — 30 real-world scenarios.",
  debrief: "I'll walk you through your results and explain what they mean for your development.",
  learning: "I'll guide you through your personalised learning plan, one module at a time.",
  practice: "I'll give you practice scenarios to build and reinforce specific skills.",
  apply: "I'll help you commit to applying what you've learned and check in on your progress.",
  strategy: "I'll guide you through building your HR AI Strategy — vision, principles, and initiatives — through conversation.",
  manager: "I'll help you understand your team's AI capability and plan targeted development.",
};

const ACT_LABELS: Record<CoachAct, string> = {
  onboarding: "Getting to know you",
  baseline: "Baseline assessment",
  adaptive: "Deep assessment",
  validation: "Validation",
  closing: "Wrapping up",
  debrief_intro: "Results overview",
  debrief_domain: "Domain deep-dive",
  debrief_plan: "Learning plan",
  apply_commitment: "Setting commitments",
  apply_checkin: "Check-in",
  apply_evidence: "Evidence review",
};

const DOMAIN_ICONS = {
  ai_interaction: Brain,
  ai_output_evaluation: Shield,
  ai_workflow_design: Zap,
  workforce_ai_readiness: Users,
  ai_ethics_trust: Shield,
  ai_change_leadership: TrendingUp,
};

const TOTAL_ITEMS = 30;

const DEBRIEF_DOMAINS = [
  { key: "ai_interaction", label: "AI Interaction" },
  { key: "ai_output_evaluation", label: "Output Evaluation" },
  { key: "ai_workflow_design", label: "Workflow Design" },
  { key: "workforce_ai_readiness", label: "Workforce Readiness" },
  { key: "ai_ethics_trust", label: "Ethics & Trust" },
  { key: "ai_change_leadership", label: "Change Leadership" },
];

const TSDA_STAGES = [
  { key: "tell", label: "Tell", description: "Concept introduction" },
  { key: "show", label: "Show", description: "Worked example" },
  { key: "do", label: "Do", description: "Practice scenario" },
  { key: "apply", label: "Apply", description: "Real-work commitment" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-[var(--color-brand)] animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-[var(--color-brand)] animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-[var(--color-brand)] animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-[var(--color-neutral-400)] ml-2">AiQ Coach is thinking…</span>
    </div>
  );
}

function CoachAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center flex-shrink-0 font-semibold",
        "bg-[var(--color-brand-bg)] border border-[var(--color-brand-border)]",
        sizeClasses[size]
      )}
    >
      <Sparkles className="w-4 h-4 text-[var(--color-brand)]" />
    </div>
  );
}

function UserAvatar({ initials }: { initials: string }) {
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm bg-[var(--color-navy-muted)] border border-[var(--color-navy-border)] text-[var(--color-neutral-300)]">
      {initials}
    </div>
  );
}

function MessageBubble({
  message,
  userInitials,
}: {
  message: ChatMessage;
  userInitials: string;
}) {
  const isAssistant = message.role === "assistant";
  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3 group",
        isAssistant ? "items-start" : "items-start flex-row-reverse"
      )}
    >
      {isAssistant ? (
        <CoachAvatar size="md" />
      ) : (
        <UserAvatar initials={userInitials} />
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isAssistant
            ? "bg-[var(--color-navy-card)] border border-[var(--color-navy-border)] text-[var(--color-neutral-100)] rounded-tl-sm"
            : "bg-[var(--color-brand-bg)] border border-[var(--color-brand-border)] text-[var(--color-neutral-100)] rounded-tr-sm"
        )}
      >
        {isAssistant ? (
          <Streamdown>{message.content}</Streamdown>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}

function ProgressBar({
  answeredCount,
  totalTarget,
  currentAct,
}: {
  answeredCount: number;
  totalTarget: number;
  currentAct: CoachAct;
}) {
  const pct = Math.min(100, Math.round((answeredCount / totalTarget) * 100));
  const isOnboarding = currentAct === "onboarding";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[var(--color-neutral-400)]">
        <span>{isOnboarding ? "Getting started" : ACT_LABELS[currentAct]}</span>
        {!isOnboarding && (
          <span>
            {answeredCount}/{totalTarget}
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-[var(--color-navy-muted)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-brand)] transition-all duration-500"
          style={{ width: isOnboarding ? "5%" : `${Math.max(5, pct)}%` }}
        />
      </div>
    </div>
  );
}

function HelpDialog({
  open,
  onClose,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  mode: CoachMode;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[var(--color-navy-card)] border-[var(--color-navy-border)] text-[var(--color-neutral-100)] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--color-neutral-100)]">
            <HelpCircle className="w-5 h-5 text-[var(--color-brand)]" />
            About the AiQ Coach
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-[var(--color-neutral-300)]">
          <p>{MODE_DESCRIPTIONS[mode]}</p>
          <Separator className="bg-[var(--color-navy-border)]" />
          <div className="space-y-3">
            <p className="font-medium text-[var(--color-neutral-200)]">How it works</p>
            <ul className="space-y-2 list-none">
              {[
                "Respond naturally — there are no right or wrong answers.",
                "The coach listens to how you think, not just what you say.",
                "You can pause and resume at any time.",
                "Your responses are private and used only to personalise your development.",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-brand)] mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<CoachMode>("diagnostic");
  const [currentAct, setCurrentAct] = useState<CoachAct>("onboarding");
  const [answeredCount, setAnsweredCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [domainsDebriefed, setDomainsDebriefed] = useState(0);
  const [learningModuleIndex, setLearningModuleIndex] = useState(0);
  const [learningTsdaStage, setLearningTsdaStage] = useState<string>("tell");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);

  // UI state
  const [helpOpen, setHelpOpen] = useState(false);
  const [showNewSessionConfirm, setShowNewSessionConfirm] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // User initials
  const userInitials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "ME"
    : "ME";

  // tRPC mutations
  const createOrResumeMutation = trpc.coach.createOrResumeSession.useMutation();
  const getOpeningMessageQuery = trpc.coach.getOpeningMessage.useQuery(
    { sessionId: sessionId ?? "" },
    { enabled: false }
  );
  const sendMessageMutation = trpc.coach.sendMessage.useMutation();
  const pauseMutation = trpc.coach.pauseSession.useMutation();
  const resumeMutation = trpc.coach.resumeSession.useMutation();

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Initialise session on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setIsInitialising(true);

        // Create or resume session
        const result = await createOrResumeMutation.mutateAsync({ mode });
        if (cancelled) return;

        setSessionId(result.sessionId);
        setCurrentAct(result.isNew ? "onboarding" : (result.mode as CoachAct));

        if (!result.isNew && result.turnCount > 0) {
          // Resume — load history
          // History will be loaded via getHistory query
          setAnsweredCount(0); // Will be updated from history
          setIsInitialising(false);
          return;
        }

        // New session — get opening message
        // We need to send an empty "start" trigger to get the first message
        const openingResult = await sendMessageMutation.mutateAsync({
          sessionId: result.sessionId,
          message: "__init__",
        });
        if (cancelled) return;

        if (openingResult.responseText) {
          setMessages([
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: openingResult.responseText,
              createdAt: new Date(),
            },
          ]);
          if (openingResult.modeTransition) {
            setCurrentAct(openingResult.modeTransition as CoachAct);
          }
        }
      } catch (err) {
        console.error("Failed to initialise coach session:", err);
      } finally {
        if (!cancelled) setIsInitialising(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load history for resumed sessions
  const historyQuery = trpc.coach.getHistory.useQuery(
    { sessionId: sessionId ?? "" },
    {
      enabled: !!sessionId && !isInitialising,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (historyQuery.data && messages.length === 0) {
      const historyMessages: ChatMessage[] = historyQuery.data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));
      if (historyMessages.length > 0) {
        setMessages(historyMessages);
        setCurrentAct(historyQuery.data.session.currentAct as CoachAct);
      }
    }
  }, [historyQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Send message
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || !sessionId || isLoading || isPaused) return;

    // Don't send the init message
    if (text === "__init__") return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const result = await sendMessageMutation.mutateAsync({
        sessionId,
        message: text,
        clientTurnId: userMessage.id,
      });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.responseText,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (result.modeTransition) {
        // If the transition string contains a mode change (e.g. "debrief" or "learning")
        const knownModes: CoachMode[] = ["diagnostic", "debrief", "learning", "practice", "apply", "manager"];
        if (knownModes.includes(result.modeTransition as CoachMode)) {
          setMode(result.modeTransition as CoachMode);
          setCurrentAct("onboarding");
        } else {
          setCurrentAct(result.modeTransition as CoachAct);
        }
      }
      if (result.suggestedReplies && result.suggestedReplies.length > 0) {
        setSuggestedReplies(result.suggestedReplies);
      } else {
        setSuggestedReplies([]);
      }

      if (result.sessionComplete) {
        setSessionComplete(true);
        setCurrentAct("closing");
      }

      // Update answered count based on act transitions
      if (
        result.modeTransition &&
        ["baseline", "adaptive", "validation"].includes(result.modeTransition)
      ) {
        setAnsweredCount((prev) => prev + 1);
      }

      // Track debrief domain progress
      if (result.modeTransition && (result.modeTransition as string) === "debrief_domain") {
        setDomainsDebriefed((prev) => Math.min(prev + 1, DEBRIEF_DOMAINS.length));
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I'm sorry, I encountered an issue. Please try again in a moment.",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputValue, sessionId, isLoading, isPaused, sendMessageMutation]);

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Pause/resume
  const handlePause = async () => {
    if (!sessionId) return;
    try {
      await pauseMutation.mutateAsync({ sessionId });
      setIsPaused(true);
    } catch {}
  };

  const handleResume = async () => {
    if (!sessionId) return;
    try {
      await resumeMutation.mutateAsync({ sessionId });
      setIsPaused(false);
    } catch {}
  };

  // New session
  const handleNewSession = async () => {
    if (!sessionId) return;
    setShowNewSessionConfirm(false);
    try {
      const result = await createOrResumeMutation.mutateAsync({
        mode,
        forceNew: true,
      });
      setSessionId(result.sessionId);
      setMessages([]);
      setCurrentAct("onboarding");
      setAnsweredCount(0);
      setSessionComplete(false);
      setIsInitialising(true);

      // Get opening message for new session
      const openingResult = await sendMessageMutation.mutateAsync({
        sessionId: result.sessionId,
        message: "__init__",
      });

      if (openingResult.responseText) {
        setMessages([
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: openingResult.responseText,
            createdAt: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to start new session:", err);
    } finally {
      setIsInitialising(false);
    }
  };

  // Handle suggested reply click
  const handleSuggestedReply = useCallback((reply: string) => {
    setInputValue(reply);
    setSuggestedReplies([]);
    inputRef.current?.focus();
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isInitialising) {
    return (
      <div className="min-h-screen bg-[var(--color-navy-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--color-brand-bg)] border border-[var(--color-brand-border)] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-[var(--color-brand)] animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-[var(--color-neutral-200)] font-medium">Preparing your AiQ Coach</p>
            <p className="text-[var(--color-neutral-400)] text-sm mt-1">Setting up your session…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[var(--color-navy-bg)] flex flex-col">
        {/* ── Top Bar ─────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-navy-border)] bg-[var(--color-navy-sidebar)]">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-200)] gap-1.5 h-8"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5 bg-[var(--color-navy-border)]" />
            <div className="flex items-center gap-2">
              <CoachAvatar size="sm" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-neutral-100)]">AiQ Coach</p>
                <p className="text-xs text-[var(--color-neutral-400)] hidden sm:block">
                  {MODE_LABELS[mode]}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress pill */}
            {currentAct !== "onboarding" && !sessionComplete && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-navy-card)] border border-[var(--color-navy-border)]">
                <Clock className="w-3.5 h-3.5 text-[var(--color-neutral-400)]" />
                <span className="text-xs text-[var(--color-neutral-300)]">
                  {answeredCount}/{TOTAL_ITEMS} scenarios
                </span>
              </div>
            )}

            {sessionComplete && (
              <Badge className="bg-[var(--color-brand-bg)] text-[var(--color-brand)] border-[var(--color-brand-border)]">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Assessment complete
              </Badge>
            )}

            {/* Pause/resume */}
            {!sessionComplete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-200)]"
                    onClick={isPaused ? handleResume : handlePause}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isPaused ? "Resume session" : "Pause session"}</TooltipContent>
              </Tooltip>
            )}

            {/* Restart */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-200)]"
                  onClick={() => setShowNewSessionConfirm(true)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start new session</TooltipContent>
            </Tooltip>

            {/* Help */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-200)]"
                  onClick={() => setHelpOpen(true)}
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>About the AiQ Coach</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — context */}
          <aside className="hidden lg:flex flex-col w-72 border-r border-[var(--color-navy-border)] bg-[var(--color-navy-sidebar)] p-5 gap-6">
            {/* Coach identity */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <CoachAvatar size="lg" />
              <div className="text-center">
                <p className="font-semibold text-[var(--color-neutral-100)]">AiQ Coach</p>
                <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">
                  {MODE_LABELS[mode]}
                </p>
              </div>
            </div>

            <Separator className="bg-[var(--color-navy-border)]" />

            {/* Progress — diagnostic mode */}
            {mode === "diagnostic" && (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-[var(--color-neutral-400)] uppercase tracking-wider">
                  Assessment Progress
                </p>
                <ProgressBar
                  answeredCount={answeredCount}
                  totalTarget={TOTAL_ITEMS}
                  currentAct={currentAct}
                />
              </div>
            )}

            {/* Debrief domain tracker */}
            {mode === "debrief" && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[var(--color-neutral-400)] uppercase tracking-wider">
                  Results Debrief
                </p>
                <div className="space-y-2">
                  {DEBRIEF_DOMAINS.map((d, i) => {
                    const done = i < domainsDebriefed;
                    const active = i === domainsDebriefed;
                    return (
                      <div
                        key={d.key}
                        className={cn(
                          "flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 transition-colors",
                          done && "text-[var(--color-brand)]",
                          active && "text-[var(--color-neutral-100)] bg-[var(--color-navy-card)] border border-[var(--color-navy-border)]",
                          !done && !active && "text-[var(--color-neutral-500)]"
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : active ? (
                          <CircleDot className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-brand)]" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                        <span>{d.label}</span>
                        {active && (
                          <span className="ml-auto text-[10px] text-[var(--color-brand)] font-medium">Now</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Learning TSDA stage */}
            {mode === "learning" && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[var(--color-neutral-400)] uppercase tracking-wider">
                  Learning Stage
                </p>
                <div className="space-y-1.5">
                  {TSDA_STAGES.map((stage, i) => {
                    const stageIndex = TSDA_STAGES.findIndex((s) => s.key === learningTsdaStage);
                    const done = i < stageIndex;
                    const active = stage.key === learningTsdaStage;
                    return (
                      <div
                        key={stage.key}
                        className={cn(
                          "flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 transition-colors",
                          done && "text-[var(--color-brand)]",
                          active && "text-[var(--color-neutral-100)] bg-[var(--color-navy-card)] border border-[var(--color-navy-border)]",
                          !done && !active && "text-[var(--color-neutral-500)]"
                        )}
                      >
                        <span
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                            done && "bg-[var(--color-brand)] text-black",
                            active && "bg-[var(--color-brand-bg)] border border-[var(--color-brand-border)] text-[var(--color-brand)]",
                            !done && !active && "bg-[var(--color-navy-muted)] text-[var(--color-neutral-500)]"
                          )}
                        >
                          {stage.label[0]}
                        </span>
                        <div>
                          <p className="font-medium">{stage.label}</p>
                          <p className="text-[10px] opacity-70">{stage.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Apply mode panel */}
            {mode === "apply" && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[var(--color-neutral-400)] uppercase tracking-wider">
                  Apply Coaching
                </p>
                <div className="space-y-2">
                  {[
                    { key: "apply_commitment", label: "Commitment", icon: Target, desc: "What will you apply?" },
                    { key: "apply_checkin", label: "Check-in", icon: Clock, desc: "How did it go?" },
                    { key: "apply_evidence", label: "Evidence", icon: CheckCircle2, desc: "Reflecting on impact" },
                  ].map(({ key, label, icon: Icon, desc }) => {
                    const acts: CoachAct[] = ["apply_commitment", "apply_checkin", "apply_evidence"];
                    const idx = acts.indexOf(key as CoachAct);
                    const curIdx = acts.indexOf(currentAct as CoachAct);
                    const done = curIdx > idx;
                    const active = currentAct === key;
                    return (
                      <div
                        key={key}
                        className={cn(
                          "flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 transition-colors",
                          done && "text-[var(--color-brand)]",
                          active && "text-[var(--color-neutral-100)] bg-[var(--color-navy-card)] border border-[var(--color-navy-border)]",
                          !done && !active && "text-[var(--color-neutral-500)]"
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", active && "text-[var(--color-brand)]")} />
                        <div>
                          <p className="font-medium">{label}</p>
                          <p className="text-[10px] opacity-70">{desc}</p>
                        </div>
                        {active && (
                          <span className="ml-auto text-[10px] text-[var(--color-brand)] font-medium">Now</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Strategy mode panel */}
            {mode === "strategy" && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[var(--color-neutral-400)] uppercase tracking-wider">
                  Strategy Builder
                </p>
                <div className="space-y-2">
                  {[
                    { label: "Business Aspiration", icon: Lightbulb, desc: "What AI means for your org" },
                    { label: "HR's Role", icon: Users, desc: "How HR enables the vision" },
                    { label: "Vision & Principles", icon: Sparkles, desc: "Your AI strategy statement" },
                    { label: "Initiatives", icon: Map, desc: "Phased roadmap" },
                  ].map(({ label, icon: Icon, desc }) => (
                    <div key={label} className="flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 text-[var(--color-neutral-500)]">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-[10px] opacity-70">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--color-neutral-500)] leading-relaxed">
                  The coach will guide you through each section conversationally.
                </p>
              </div>
            )}

            {(mode === "diagnostic" || mode === "debrief" || mode === "learning" || mode === "apply" || mode === "strategy") && (
              <Separator className="bg-[var(--color-navy-border)]" />
            )}

            {/* Mode description */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-neutral-400)] uppercase tracking-wider">
                What to expect
              </p>
              <p className="text-sm text-[var(--color-neutral-300)] leading-relaxed">
                {MODE_DESCRIPTIONS[mode]}
              </p>
            </div>

            <Separator className="bg-[var(--color-navy-border)]" />

            {/* Tips */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[var(--color-neutral-400)] uppercase tracking-wider">
                Tips
              </p>
              <ul className="space-y-2">
                {[
                  "Respond naturally — no right answers.",
                  "Be specific about your context.",
                  "You can pause at any time.",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-neutral-400)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] mt-1.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Complete CTA */}
            {sessionComplete && (
              <>
                <Separator className="bg-[var(--color-navy-border)]" />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[var(--color-brand)]">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Assessment complete</span>
                  </div>
                  <Link href="/assessment/results">
                    <Button
                      size="sm"
                      className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-black font-medium"
                    >
                      View your results
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </aside>

          {/* Chat panel */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {/* Paused banner */}
            {isPaused && (
              <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-unsafe-bg)] border-b border-[var(--color-unsafe-border)]">
                <div className="flex items-center gap-2 text-sm text-[var(--color-unsafe-text)]">
                  <Pause className="w-4 h-4" />
                  Session paused — your progress is saved.
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-[var(--color-unsafe-border)] text-[var(--color-unsafe-text)] hover:bg-[var(--color-unsafe-bg)]"
                  onClick={handleResume}
                >
                  <Play className="w-3.5 h-3.5 mr-1" />
                  Resume
                </Button>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 overflow-y-auto" ref={scrollRef}>
              <div className="max-w-3xl mx-auto py-4">
                {messages.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <CoachAvatar size="lg" />
                    <div className="text-center">
                      <p className="text-[var(--color-neutral-200)] font-medium">
                        Starting your session…
                      </p>
                      <p className="text-[var(--color-neutral-400)] text-sm mt-1">
                        Your AiQ Coach is getting ready.
                      </p>
                    </div>
                    <Loader2 className="w-5 h-5 text-[var(--color-brand)] animate-spin" />
                  </div>
                )}

                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    userInitials={userInitials}
                  />
                ))}

                {isLoading && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <CoachAvatar size="md" />
                    <div className="bg-[var(--color-navy-card)] border border-[var(--color-navy-border)] rounded-2xl rounded-tl-sm px-4 py-3">
                      <TypingIndicator />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input area */}
            <div className="border-t border-[var(--color-navy-border)] bg-[var(--color-navy-sidebar)] p-4">
              {/* Suggested replies */}
              {suggestedReplies.length > 0 && !sessionComplete && !isPaused && (
                <div className="max-w-3xl mx-auto mb-3 flex flex-wrap gap-2">
                  {suggestedReplies.map((reply, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestedReply(reply)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-colors",
                        "border-[var(--color-navy-border)] bg-[var(--color-navy-card)]",
                        "text-[var(--color-neutral-300)] hover:text-[var(--color-neutral-100)]",
                        "hover:border-[var(--color-brand-border)] hover:bg-[var(--color-brand-bg)]"
                      )}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {sessionComplete ? (
                <div className="max-w-3xl mx-auto flex flex-col items-center gap-3 py-2">
                  {mode === "diagnostic" && (
                    <>
                      <p className="text-sm text-[var(--color-neutral-400)] text-center">
                        Your assessment is complete. View your personalised results and learning plan.
                      </p>
                      <div className="flex gap-3">
                        <Link href="/assessment/results">
                          <Button className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-black font-medium">
                            <BarChart2 className="w-4 h-4 mr-2" />
                            View results
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          className="border-[var(--color-navy-border)] text-[var(--color-neutral-300)]"
                          onClick={() => setShowNewSessionConfirm(true)}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Retake
                        </Button>
                      </div>
                    </>
                  )}
                  {mode === "debrief" && (
                    <>
                      <p className="text-sm text-[var(--color-neutral-400)] text-center">
                        Debrief complete. Your learning plan is ready.
                      </p>
                      <div className="flex gap-3">
                        <Link href="/learning">
                          <Button className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-black font-medium">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Start learning plan
                          </Button>
                        </Link>
                        <Link href="/assessment/results">
                          <Button variant="outline" className="border-[var(--color-navy-border)] text-[var(--color-neutral-300)]">
                            <BarChart2 className="w-4 h-4 mr-2" />
                            Full results
                          </Button>
                        </Link>
                      </div>
                    </>
                  )}
                  {mode === "learning" && (
                    <>
                      <p className="text-sm text-[var(--color-neutral-400)] text-center">
                        Module complete. Ready for the next one?
                      </p>
                      <div className="flex gap-3">
                        <Link href="/learning">
                          <Button className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-black font-medium">
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Continue learning
                          </Button>
                        </Link>
                      </div>
                    </>
                  )}
                  {mode === "apply" && (
                    <>
                      <p className="text-sm text-[var(--color-neutral-400)] text-center">
                        Apply cycle complete. Your evidence has been recorded.
                      </p>
                      <div className="flex gap-3">
                        <Link href="/learning">
                          <Button className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-black font-medium">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Back to learning
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          className="border-[var(--color-navy-border)] text-[var(--color-neutral-300)]"
                          onClick={() => setShowNewSessionConfirm(true)}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          New commitment
                        </Button>
                      </div>
                    </>
                  )}
                  {mode === "strategy" && (
                    <>
                      <p className="text-sm text-[var(--color-neutral-400)] text-center">
                        Your HR AI Strategy has been saved.
                      </p>
                      <div className="flex gap-3">
                        <Link href="/strategy">
                          <Button className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-black font-medium">
                            <BarChart2 className="w-4 h-4 mr-2" />
                            View strategy dashboard
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          className="border-[var(--color-navy-border)] text-[var(--color-neutral-300)]"
                          onClick={() => setShowNewSessionConfirm(true)}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Rebuild strategy
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="max-w-3xl mx-auto flex items-end gap-3">
                  <Textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isPaused
                        ? "Session paused — resume to continue"
                        : "Type your response… (Enter to send, Shift+Enter for new line)"
                    }
                    disabled={isLoading || isPaused}
                    rows={2}
                    className={cn(
                      "flex-1 resize-none bg-[var(--color-navy-card)] border-[var(--color-navy-border)]",
                      "text-[var(--color-neutral-100)] placeholder:text-[var(--color-neutral-500)]",
                      "focus-visible:ring-[var(--color-brand)] focus-visible:border-[var(--color-brand-border)]",
                      "min-h-[60px] max-h-[160px]"
                    )}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isLoading || isPaused}
                    className="h-[60px] w-12 p-0 bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-black disabled:opacity-40"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}

              {/* Mobile progress */}
              <div className="lg:hidden max-w-3xl mx-auto mt-3">
                <ProgressBar
                  answeredCount={answeredCount}
                  totalTarget={TOTAL_ITEMS}
                  currentAct={currentAct}
                />
              </div>
            </div>
          </main>
        </div>

        {/* ── Dialogs ──────────────────────────────────────────────────────── */}
        <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} mode={mode} />

        <Dialog open={showNewSessionConfirm} onOpenChange={setShowNewSessionConfirm}>
          <DialogContent className="bg-[var(--color-navy-card)] border-[var(--color-navy-border)] text-[var(--color-neutral-100)] max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-[var(--color-neutral-100)]">Start a new session?</DialogTitle>
              <DialogDescription className="text-[var(--color-neutral-400)]">
                Your current session progress will be saved, but you will start a fresh assessment. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-[var(--color-navy-border)] text-[var(--color-neutral-300)]"
                onClick={() => setShowNewSessionConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-black font-medium"
                onClick={handleNewSession}
              >
                Start new
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
