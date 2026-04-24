/**
 * Assessment Session Page — AiQ Enterprise Platform (v2)
 *
 * Renders each of the 8 interaction types with a distinct visual treatment:
 *
 * 1. prompt_refinement     — refine a weak prompt into an effective one
 * 2. prioritisation         — scenario + constraint + ranked MCQ (coloured priority badge)
 * 3. agent_oversight       — evaluate and correct an AI agent's actions
 * 4. ethical_dilemma       — navigate ethical tensions in AI deployment
 * 5. scenario_critique      — scenario + AI OUTPUT block (evaluate this) + MCQ
 * 6. output_improvement     — scenario + AI OUTPUT block (improve this) + MCQ
 * 7. error_detection        — scenario + AI OUTPUT block (find the error) + MCQ
 * 8. data_interpretation    — scenario + DATA CONTEXT block + MCQ
 *
 * The nextItem from the server includes:
 * - title, scenario, constraint, question, interactionType
 * - aiOutput (for critique/improvement/error types)
 * - dataContext (for data_interpretation)
 * - options with label/value (scoring data stripped server-side)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExplanationDrawer, ScoreBreakdown } from "@/components/ExplanationDrawer";
import { toast } from "sonner";
import {
  ChevronRight,
  CheckCircle2,
  Award,
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  Briefcase,
  Target,
  ArrowLeft,
  Bot,
  BarChart3,
  Scale,
  Layers,
  Search,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Capability colours ───────────────────────────────────────────────────────

// v10 domain colours — imported from shared constants
import { DOMAIN_COLOURS, DOMAIN_LABELS, INTERACTION_TYPE_META, INTERACTION_TYPE_DESCRIPTIONS, READINESS_STATES } from "@/lib/domains";
import type { CapabilityKey, InteractionType } from "@/lib/domains";

const CAPABILITY_COLOURS: Record<string, string> = DOMAIN_COLOURS;

const RISK_CONFIG = {
  High:   { color: "text-[#EE6677] bg-[#EE6677]/8 border-[#EE6677]/30", icon: AlertTriangle },
  Medium: { color: "text-[#EE8866] bg-[#EE8866]/8 border-[#EE8866]/30", icon: AlertTriangle },
  Low:    { color: "text-[#228833] bg-[#228833]/8 border-[#228833]/30", icon: Target },
} as const;

// ─── Interaction type config ──────────────────────────────────────────────────

type InteractionTypeKey = InteractionType | "contradiction_probe" | "multi_step_workflow";

interface InteractionConfig {
  label: string;
  instruction: string;
  questionLabel: string;
  /** Whether this type shows an AI Output block */
  hasAiOutput: boolean;
  /** Whether this type shows a Data Context block */
  hasDataContext: boolean;
  /** Visual accent for the question section */
  accent: string;
  icon: React.ElementType;
}

// v10 interaction type configs — built from shared constants + legacy types
const INTERACTION_CONFIGS: Record<string, InteractionConfig> = {
  // v10 interaction types from shared constants
  ...Object.fromEntries(
    Object.entries(INTERACTION_TYPE_META).map(([key, meta]) => [
      key,
      {
        label: meta.label,
        instruction: meta.instruction,
        questionLabel: meta.questionLabel,
        hasAiOutput: ["error_detection", "scenario_critique", "confidence_calibration", "prompt_diagnosis"].includes(key),
        hasDataContext: false,
        accent: key.includes("error") ? "#EE6677" : key.includes("ethic") ? "#AA3377" : key.includes("risk") ? "#EE6677" : key.includes("change") || key.includes("resistance") ? "#66CCEE" : key.includes("workflow") || key.includes("handoff") || key.includes("process") ? "#228833" : "#4477AA",
        icon: key.includes("error") ? AlertCircle : key.includes("risk") ? AlertTriangle : key.includes("ethic") || key.includes("pressure") ? Shield : key.includes("critique") || key.includes("diagnosis") ? Search : key.includes("prompt") ? Sparkles : key.includes("workflow") || key.includes("handoff") || key.includes("process") ? Layers : key.includes("leader") || key.includes("advisory") ? Briefcase : key.includes("resist") || key.includes("concern") || key.includes("stakeholder") ? Scale : Target,
      },
    ])
  ),
  // Legacy types preserved for backward compatibility
  multi_step_workflow: {
    label: "Workflow Sequencing",
    instruction: "Consider the full sequence of steps and select the most appropriate next action.",
    questionLabel: "What is the next step in this workflow?",
    hasAiOutput: false,
    hasDataContext: false,
    accent: "#4477AA",
    icon: Layers,
  },
  contradiction_probe: {
    label: "Consistency Check",
    instruction: "Review your earlier response and select the most consistent answer.",
    questionLabel: "Which answer is most consistent with your earlier response?",
    hasAiOutput: false,
    hasDataContext: false,
    accent: "#AA3377",
    icon: Scale,
  },
};

// v10 interaction type purpose explanations — built from shared constants
const INTERACTION_PURPOSE: Record<string, string> = {
  ...INTERACTION_TYPE_DESCRIPTIONS,
  // Legacy types
  multi_step_workflow:    "Evaluates your ability to sequence AI-assisted HR workflows correctly and safely.",
  contradiction_probe:    "Checks the consistency of your responses across related scenarios.",
};

function getInteractionConfig(interactionType: string): InteractionConfig {
  return INTERACTION_CONFIGS[interactionType] ?? {
    label: "Assessment Question",
    instruction: "Select the most appropriate response.",
    questionLabel: "What is the most appropriate action?",
    hasAiOutput: false,
    hasDataContext: false,
    accent: "#4477AA",
    icon: Scale,
  };
}

// ─── AI Output Block ──────────────────────────────────────────────────────────

function AiOutputBlock({ content, mode }: { content: string; mode: "critique" | "improvement" | "error" }) {
  const configs = {
    critique: {
      label: "AI-Generated Output",
      sublabel: "Evaluate this output",
      borderColor: "border-[#AA3377]/30",
      bgColor: "bg-[#AA3377]/4",
      labelColor: "text-[#AA3377]",
      iconColor: "text-[#AA3377]",
    },
    improvement: {
      label: "AI-Generated Output",
      sublabel: "Identify improvements",
      borderColor: "border-[#CCBB44]/30",
      bgColor: "bg-[#CCBB44]/4",
      labelColor: "text-[#CCBB44]",
      iconColor: "text-[#CCBB44]",
    },
    error: {
      label: "AI-Generated Output",
      sublabel: "Find the error",
      borderColor: "border-[#EE6677]/30",
      bgColor: "bg-[#EE6677]/4",
      labelColor: "text-[#EE6677]",
      iconColor: "text-[#EE6677]",
    },
  };
  const cfg = configs[mode];

  return (
    <div className={cn("rounded-xl border-2 p-4", cfg.borderColor, cfg.bgColor)}>
      <div className="flex items-center gap-2 mb-3">
        <Bot className={cn("w-4 h-4", cfg.iconColor)} />
        <div>
          <p className={cn("text-xs font-bold uppercase tracking-wider", cfg.labelColor)}>
            {cfg.label}
          </p>
          <p className="text-xs text-muted-foreground">{cfg.sublabel}</p>
        </div>
      </div>
      <div className="bg-background/60 rounded-lg p-3 border border-border/50">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono text-xs">
          {content}
        </p>
      </div>
    </div>
  );
}

// ─── Data Context Block ───────────────────────────────────────────────────────

function DataContextBlock({ content }: { content: string }) {
  return (
    <div className="rounded-xl border-2 border-[#66CCEE]/30 bg-[#66CCEE]/4 p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-[#66CCEE]" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#66CCEE]">
            Data / AI Insight
          </p>
          <p className="text-xs text-muted-foreground">Interpret this output</p>
        </div>
      </div>
      <div className="bg-background/60 rounded-lg p-3 border border-border/50">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono text-xs">
          {content}
        </p>
      </div>
    </div>
  );
}

// ─── Generating State ─────────────────────────────────────────────────────────

const GENERATING_STEPS = [
  { label: "Analysing your response pattern",      delay: 0    },
  { label: "Identifying capability gaps",           delay: 900  },
  { label: "Selecting optimal question type",       delay: 1800 },
  { label: "Generating scenario for your role",     delay: 2800 },
  { label: "Validating item quality",               delay: 4000 },
];

function GeneratingState({ answeredCount, totalItems }: { answeredCount: number; totalItems: number }) {
  const progress = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers = GENERATING_STEPS.slice(1).map((step, i) =>
      setTimeout(() => setActiveStep(i + 1), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            Question {answeredCount + 1} <span className="text-muted-foreground font-normal">of {totalItems}</span>
          </span>
          <span className="text-xs text-muted-foreground">{progress}% complete</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
      <Card className="border-border shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#10B981]/8 border border-[#10B981]/20 flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 text-[#10B981] animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Preparing your next question</p>
              <p className="text-xs text-muted-foreground">Tailored to your profile and responses so far</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {GENERATING_STEPS.map((step, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 text-xs transition-all duration-500",
                  i < activeStep ? "text-[#228833]" :
                  i === activeStep ? "text-foreground" :
                  "text-muted-foreground/40"
                )}
              >
                {i < activeStep ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#228833]" />
                ) : i === activeStep ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-[#10B981]" />
                ) : (
                  <div className="w-3.5 h-3.5 shrink-0 rounded-full border border-muted-foreground/20" />
                )}
                <span className={i === activeStep ? "font-medium" : ""}>{step.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-t border-border pt-3">
            <Bot className="w-3 h-3" />
            <span>Adaptive AI assessment engine · Each question is unique to you</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Completion Screen ────────────────────────────────────────────────────────

function CompletionScreen({
  result,
  sessionId,
  onNavigate,
}: {
  result: any;
  sessionId: string;
  onNavigate: (path: string) => void;
}) {
  const primaryState = result?.primaryState ?? "unknown";
  // v10 five-state readiness classification
  const STATE_CONFIGS: Record<string, { label: string; color: string; bg: string; description: string }> = {
    ...READINESS_STATES,
    insufficient_evidence: READINESS_STATES.unknown,
  };
  const stateConfig = STATE_CONFIGS[primaryState] ?? { label: "Assessed", color: "text-foreground", bg: "bg-muted/20 border-border", description: "" };
  const capabilityScores = result?.capabilityScores ?? {};
  const confidenceBand = result?.classificationConfidence?.band;
  const confidenceLabel = result?.classificationConfidence?.label;
  const caveat = result?.classificationConfidence?.caveat;

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="text-center py-5">
        <div className="w-16 h-16 rounded-full bg-[#10B981]/8 border-2 border-[#10B981]/20 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
        </div>
        <h1 className="text-xl font-bold text-foreground font-sora">Assessment Complete</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Your capability profile has been updated.
        </p>
      </div>

      {result && (
        <div className={cn("rounded-2xl border-2 p-5", stateConfig.bg)}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Readiness Classification</p>
          <div className="flex items-baseline gap-3">
            <p className={cn("text-2xl font-bold font-sora", stateConfig.color)}>{stateConfig.label}</p>
            <p className={cn("text-4xl font-bold", stateConfig.color)}>{Math.round(result.overallScore)}</p>
          </div>
          {stateConfig.description && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{stateConfig.description}</p>
          )}
          {caveat && (
            <div className="flex items-start gap-1.5 mt-3 text-xs text-[#EE8866]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{caveat}</span>
            </div>
          )}
        </div>
      )}

      {/* P8: Confidence band */}
      {confidenceBand && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
          <Award className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Classification confidence: <span className="font-semibold text-foreground capitalize">{confidenceLabel ?? confidenceBand}</span>
          </p>
        </div>
      )}

      {result && Object.keys(capabilityScores).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Capability Breakdown</h3>
          {Object.entries(capabilityScores).map(([key, score]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-40 truncate capitalize">
                {key.replace(/_/g, " ")}
              </span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${score}%`, backgroundColor: CAPABILITY_COLOURS[key] ?? "#4477AA" }}
                />
              </div>
              <span className="text-xs font-bold w-8 text-right" style={{ color: CAPABILITY_COLOURS[key] ?? "#4477AA" }}>
                {score as number}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Button
          onClick={() => onNavigate(`/assessment/${sessionId}/results`)}
          className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
        >
          View Full Results <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => onNavigate("/learning")} variant="outline" className="text-sm">
            Learning Plan
          </Button>
          <Button onClick={() => onNavigate("/dashboard")} variant="outline" className="text-sm">
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// B2: Device and browser detection helpers
function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  if (/iPad|Tablet|PlayBook/i.test(ua)) return "tablet";
  return "desktop";
}
function detectBrowserType(): string {
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return "edge";
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "chrome";
  if (/Firefox\//i.test(ua)) return "firefox";
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "safari";
  if (/OPR\//i.test(ua)) return "opera";
  return "other";
}

export default function AssessmentSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  // Rationale loading: true from submit click until rationale content is ready to reveal
  const [rationaleLoading, setRationaleLoading] = useState(false);

  // Poll every 3 seconds while generating (no nextItem) to pick up pre-generated item
  const [isGenerating, setIsGenerating] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // T2-5: Rationale reveal state — shown after answer submission
  const [rationaleData, setRationaleData] = useState<{
    rationaleText: string | null;
    allOptionsRationale: Array<{ value: string; rationaleText: string | null; outcomeClass: string | null }>;
    selectedValue: string;
    selectedLabel: string; // UX-5: label of the chosen option
    outcomeClass: string | null;
    isLastQuestion: boolean; // UX-7: auto-trigger complete after rationale
  } | null>(null);

  const { data: sessionData, isLoading, error: sessionError, refetch } = trpc.assessment.session.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, refetchOnWindowFocus: false, retry: false }
  );

  const [selectedValue, setSelectedValue] = useState<string>("");
  // v10: Three-level confidence staking (tentative/confident/certain)
  type ConfidenceStake = "tentative" | "confident" | "certain";
  const STAKE_VALUES: Record<ConfidenceStake, number> = { tentative: 0.33, confident: 0.66, certain: 1.0 };
  const [confidenceStake, setConfidenceStake] = useState<ConfidenceStake | null>(null);
  const confidence = confidenceStake ? STAKE_VALUES[confidenceStake] * 100 : 50;
  // C2.1: Optional reasoning capture
  const [reasoningText, setReasoningText] = useState<string>("");
  const [itemStartTime, setItemStartTime] = useState<number>(Date.now());
  // WS5.1: Track first interaction time for telemetry
  const [firstInteractionTime, setFirstInteractionTime] = useState<number | null>(null);
  // B1: Track revision count (option changes after first selection) and focus loss count
  const [revisionCount, setRevisionCount] = useState<number>(0);
  const [focusLossCount, setFocusLossCount] = useState<number>(0);
  // UX-6: Elapsed timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const submitMutation = trpc.assessment.submitAnswer.useMutation({
    onSuccess: (data) => {
      // T2-5: Show rationale if available before advancing to next question
      const hasRationale = data.allOptionsRationale?.some((o: any) => o.rationaleText);
      if (hasRationale) {
        const chosenOption = sessionData?.nextItem?.options?.find((o: any) => o.value === selectedValue);
        // Brief artificial delay so the skeleton is visible for at least 600ms
        // This prevents a jarring instant snap from loading to content
        setTimeout(() => {
          setRationaleData({
            rationaleText: data.rationaleText ?? null,
            allOptionsRationale: data.allOptionsRationale ?? [],
            selectedValue: selectedValue,
            selectedLabel: chosenOption?.label ?? "",
            outcomeClass: data.outcomeClass ?? null,
            isLastQuestion: data.isComplete === true,
          });
          setRationaleLoading(false);
        }, 600);
        // Pre-fetch next item in background while user reads rationale
        setIsGenerating(true);
        refetch();
      } else {
        setSelectedValue("");
        setConfidenceStake(null);
        setReasoningText(""); // C2.1: reset reasoning
        setItemStartTime(Date.now());
        setFirstInteractionTime(null);
        setRevisionCount(0); // B1: reset per-item counters
        setFocusLossCount(0);
        setIsGenerating(true);
        refetch();
      }
    },
    onError: (err) => {
      setRationaleLoading(false);
      toast.error(err.message);
    },
  });

  const completeMutation = trpc.assessment.completeSession.useMutation({
    onSuccess: () => {
      navigate(`/assessment/${sessionId}/results`);
    },
    onError: err => toast.error(err.message),
  });

  // UX-6: Start/reset elapsed timer when a new item appears
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsedSeconds(0);
    if (sessionData?.nextItem && !rationaleData) {
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.nextItem?.id]);

  // Stop timer when rationale is shown
  useEffect(() => {
    if (rationaleData && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [rationaleData]);

  // When we get a nextItem, stop the generating state
  useEffect(() => {
    if (sessionData?.nextItem) {
      setIsGenerating(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [sessionData?.nextItem]);

  // Poll every 2.5s while generating to pick up the pre-generated item
  useEffect(() => {
    if (isGenerating && !sessionData?.nextItem) {
      pollingRef.current = setInterval(() => {
        refetch();
      }, 2500);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isGenerating, sessionData?.nextItem, refetch]);

  // ─── ALL REMAINING HOOKS — must be declared before any early return ───────────

  // handleSubmit — declared before any early return to satisfy Rules of Hooks
  const handleSubmit = useCallback(() => {
    if (!selectedValue) {
      toast.error("Please select an answer before continuing");
      return;
    }
    const currentItem = sessionData?.nextItem;
    if (!currentItem) return;
    const timeTaken = Math.round(Date.now() - itemStartTime);
    setRationaleLoading(true);
    submitMutation.mutate({
      sessionId: sessionId!,
      itemId: currentItem.id,
      selectedValue,
      reasoningText: reasoningText.trim() || undefined,
      confidenceScore: confidence / 100,
      timeToAnswerMs: timeTaken,
      timeToFirstInteractionMs: firstInteractionTime !== null ? Math.round(firstInteractionTime - itemStartTime) : undefined,
      confidenceRatingRaw: confidence / 100,
      revisionCount,
      focusLossCount,
      deviceType: detectDeviceType(),
      browserType: detectBrowserType(),
      screenWidthPx: window.screen.width,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValue, confidence, itemStartTime, firstInteractionTime, revisionCount, focusLossCount, sessionId, sessionData?.nextItem?.id]);

  // B1: Track focus loss via visibilitychange
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setFocusLossCount(c => c + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // UX-4: Keyboard navigation — 1-4 to select option, Enter to submit
  useEffect(() => {
    const currentItem = sessionData?.nextItem;
    if (!currentItem || rationaleData) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const options = currentItem.options ?? [];
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= options.length) {
        setSelectedValue(options[num - 1].value);
      } else if (e.key === "Enter" && selectedValue) {
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [sessionData?.nextItem, rationaleData, selectedValue, handleSubmit]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!sessionData || sessionError) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-muted-foreground font-medium">Session not found or has expired.</p>
        <p className="text-sm text-muted-foreground">This can happen if the session was reset. Please start a new assessment.</p>
        <Button onClick={() => navigate("/assessment")} className="mt-4">Back to Assessments</Button>
      </div>
    );
  }

  const session = sessionData.session;
  const totalItems = sessionData.totalItems ?? 0;
  const answeredCount = sessionData.answeredCount ?? 0;
  const nextItem = sessionData.nextItem;
  const isComplete = sessionData.isComplete;
  const progress = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;

  // Completed state — redirect to results page
  if (session.state === "completed") {
    navigate(`/assessment/${sessionId}/results`);
    return null;
  }

  // All answered — show completion screen
  if (isComplete && answeredCount > 0) {
    if (!completeMutation.isSuccess) {
      return (
        <div className="p-6 space-y-6 max-w-2xl">
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-[#228833] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground font-sora">You've answered all {answeredCount} questions</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto leading-relaxed">
              The engine is ready to compute your capability profile across all six domains. This takes a few seconds.
            </p>
            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#228833]" /> {answeredCount} responses recorded</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#228833]" /> 6 capability domains</span>
            </div>
            <Button
              onClick={() => completeMutation.mutate({ sessionId: sessionId! })}
              disabled={completeMutation.isPending}
              className="mt-6 bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2 min-w-[200px]"
            >
              {completeMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Calculating scores…</>
              ) : (
                <>Generate My Results <ChevronRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <CompletionScreen
        result={completeMutation.data}
        sessionId={sessionId!}
        onNavigate={navigate}
      />
    );
  }

  // T2-5a: Rationale loading skeleton — shown immediately after submit, before rationale arrives
  if (rationaleLoading && !rationaleData) {
    return (
      <div className="p-6 space-y-5 max-w-2xl animate-in fade-in duration-200">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Question {answeredCount + 1} <span className="text-muted-foreground font-normal">of {totalItems}</span>
            </span>
            <button
              onClick={() => { toast.success("Progress saved — resume any time from the Assessment page."); navigate("/assessment"); }}
              className="flex items-center gap-1.5 text-xs font-medium text-[#10B981] hover:text-[#10B981]/80 border border-[#10B981]/30 rounded-md px-2.5 py-1 transition-colors bg-[#10B981]/5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save &amp; Exit
            </button>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 space-y-5">
            {/* Pulsing analysis indicator */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border bg-muted/20">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-20" />
                <span className="relative inline-flex h-5 w-5 rounded-full bg-[#10B981]/30 items-center justify-center">
                  <Bot className="w-3 h-3 text-[#10B981]" />
                </span>
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">Analysing your response…</p>
                <p className="text-xs text-muted-foreground">Generating personalised explanation</p>
              </div>
            </div>
            {/* Skeleton lines */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
              <Skeleton className="h-4 w-3/5 rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // T2-5: Rationale reveal — show after answer, before next question
  if (rationaleData) {
    // Stagger delays for section cascade animation
    const stagger = (i: number) => ({ style: { animationDelay: `${i * 80}ms` } });
    const outcomeColors: Record<string, string> = {
      strong: "#228833",
      acceptable: "#CCBB44",
      weak: "#EE8866",
      failure: "#EE6677",
      critical_failure: "#AA0000",
    };
    const outcomeLabels: Record<string, string> = {
      strong: "Strong response",
      acceptable: "Acceptable response",
      weak: "Weak response",
      failure: "Incorrect response",
      critical_failure: "Critical failure",
    };
    const outcomeColor = outcomeColors[rationaleData.outcomeClass ?? ""] ?? "#4477AA";
    const outcomeLabel = outcomeLabels[rationaleData.outcomeClass ?? ""] ?? "Response recorded";
    return (
      <div className="p-6 space-y-5 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Question {answeredCount + 1} <span className="text-muted-foreground font-normal">of {totalItems}</span>
            </span>
            <button
              onClick={() => { toast.success("Progress saved — resume any time from the Assessment page."); navigate("/assessment"); }}
              className="flex items-center gap-1.5 text-xs font-medium text-[#10B981] hover:text-[#10B981]/80 border border-[#10B981]/30 rounded-md px-2.5 py-1 transition-colors bg-[#10B981]/5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save &amp; Exit
            </button>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 space-y-4">
            {/* UX-5: Outcome badge + selected option label */}
            <div
              className="animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold"
              style={{ color: outcomeColor, backgroundColor: `${outcomeColor}12`, borderColor: `${outcomeColor}30`, ...stagger(0).style }}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{outcomeLabel}</span>
            </div>
            {rationaleData.selectedLabel && (
              <div
                className="animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm"
                {...stagger(1)}
              >
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Your answer</span>
                <span className="text-foreground">{rationaleData.selectedLabel}</span>
              </div>
            )}
            {/* Selected option rationale */}
            {rationaleData.rationaleText && (
              <div
                className="animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both space-y-1.5"
                {...stagger(2)}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Why this matters</p>
                <p className="text-sm text-foreground leading-relaxed">{rationaleData.rationaleText}</p>
              </div>
            )}
            {/* All options rationale */}
            {rationaleData.allOptionsRationale.filter(o => o.rationaleText && o.value !== rationaleData.selectedValue).length > 0 && (
              <div
                className="animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both space-y-2"
                {...stagger(3)}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Other options</p>
                {rationaleData.allOptionsRationale
                  .filter(o => o.rationaleText && o.value !== rationaleData.selectedValue)
                  .map(o => {
                    // UX-10: Use numeric position (1-based) to match question screen numbering
                    const optionIdx = (sessionData?.nextItem?.options ?? []).findIndex((opt: any) => opt.value === o.value);
                    const optionNum = optionIdx >= 0 ? optionIdx + 1 : o.value?.toUpperCase?.();
                    return (
                    <div
                      key={o.value}
                      className="p-3 rounded-lg border border-border bg-muted/30 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {optionNum}
                        </span>
                        <span
                          className="text-xs font-medium"
                          style={{ color: outcomeColors[o.outcomeClass ?? ""] ?? "#888" }}
                        >
                          {outcomeLabels[o.outcomeClass ?? ""] ?? ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-7">{o.rationaleText}</p>
                    </div>
                  );
                  })}
              </div>
            )}
            {/* UX-7: if last question, show Complete Assessment instead of Continue */}
            <div
              className="animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both"
              {...stagger(4)}
            >
              {rationaleData.isLastQuestion ? (
                <Button
                  onClick={() => {
                    setRationaleData(null);
                    completeMutation.mutate({ sessionId: sessionId! });
                  }}
                  disabled={completeMutation.isPending}
                  className="w-full bg-[#228833] hover:bg-[#228833]/90 text-white gap-2"
                >
                  {completeMutation.isPending ? "Calculating scores…" : "Complete Assessment"}
                  {!completeMutation.isPending && <CheckCircle2 className="w-4 h-4" />}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setRationaleData(null);
                    setRationaleLoading(false);
                    setSelectedValue("");
                    setConfidenceStake(null);
                    setReasoningText(""); // C2.1: reset reasoning
                    setItemStartTime(Date.now());
                    setFirstInteractionTime(null); // Fix: reset so next question doesn't inherit stale timestamp
                    setRevisionCount(0); // B1: reset per-item counters
                    setFocusLossCount(0);
                  }}
                  className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generating state — waiting for LLM to produce next item
  if (isGenerating || !nextItem) {
    return <GeneratingState answeredCount={answeredCount} totalItems={totalItems} />;
  }

  const interactionType = (nextItem as any).interactionType ?? "prompt_refinement";
  const iConfig = getInteractionConfig(interactionType);
  const formatElapsed = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  const capabilityColor = CAPABILITY_COLOURS[(nextItem as any).capabilityKey] ?? "#4477AA";
  const riskLevel = (nextItem as any).riskLevel as keyof typeof RISK_CONFIG;
  const riskConfig = RISK_CONFIG[riskLevel] ?? RISK_CONFIG.Medium;
  const aiOutput = (nextItem as any).aiOutput as string | undefined;
  const dataContext = (nextItem as any).dataContext as string | undefined;

  // Determine AI output mode for visual framing
  const aiOutputMode: "critique" | "improvement" | "error" =
    interactionType === "output_improvement" ? "improvement" :
    interactionType === "error_detection" ? "error" : "critique";

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      {/* Back + Progress header */}
      <div className="space-y-3">
        {/* Top row: back link + Save & Exit button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowLeaveDialog(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          {/* Save & Exit — always visible so users know they can leave safely */}
          <button
            onClick={() => setShowLeaveDialog(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-[#10B981] hover:text-[#10B981]/80 border border-[#10B981]/30 hover:border-[#10B981]/60 rounded-md px-2.5 py-1 transition-colors bg-[#10B981]/5 hover:bg-[#10B981]/10"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Save &amp; Exit
          </button>
        </div>

        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Save &amp; Exit</AlertDialogTitle>
              <AlertDialogDescription>
                Your progress is automatically saved. You are on question {answeredCount + 1} of {totalItems} ({progress}% complete). You can resume from exactly where you left off from the Assessment page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Assessment</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  toast.success("Progress saved — resume any time from the Assessment page.");
                  navigate("/assessment");
                }}
              >
                Save &amp; Exit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Question counter + progress bar */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            Question {answeredCount + 1} <span className="text-muted-foreground font-normal">of {totalItems}</span>
          </span>
          <span className="text-xs text-muted-foreground">{progress}% complete</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Question card */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6 space-y-5">

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* UX-9: Interaction type badge with tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border cursor-help"
                    style={{
                      color: iConfig.accent,
                      backgroundColor: `${iConfig.accent}12`,
                      borderColor: `${iConfig.accent}30`,
                    }}
                  >
                    <iConfig.icon className="w-3 h-3" />
                    {iConfig.label}
                    <Info className="w-3 h-3 opacity-60" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p className="font-semibold mb-0.5">{iConfig.label}</p>
                  <p className="text-muted-foreground">{iConfig.instruction}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Capability badge */}
            {(nextItem as any).capability && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full border"
                style={{
                  color: capabilityColor,
                  backgroundColor: `${capabilityColor}10`,
                  borderColor: `${capabilityColor}25`,
                }}
              >
                {(nextItem as any).capability}
              </span>
            )}

            {/* Workflow */}
            {(nextItem as any).workflow && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Briefcase className="w-3 h-3" />
                {(nextItem as any).workflow}
              </span>
            )}

            {/* Risk level */}
            {(nextItem as any).riskLevel && (
              <span className={cn("flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", riskConfig.color)}>
                <riskConfig.icon className="w-3 h-3" />
                {(nextItem as any).riskLevel} Risk
              </span>
            )}

            {/* UX-6: Elapsed timer */}
            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
              <span className="opacity-60">⏱</span> {formatElapsed(elapsedSeconds)} · Level {(nextItem as any).difficulty}
            </span>
          </div>

          {/* Title */}
          {(nextItem as any).title && (
            <h2 className="text-base font-bold text-foreground font-sora leading-snug">
              {(nextItem as any).title}
            </h2>
          )}

          {/* Scenario */}
          {(nextItem as any).scenario && (
            <div className="bg-muted/40 rounded-xl p-4 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Scenario
              </p>
              <p className="text-sm text-foreground leading-relaxed">{(nextItem as any).scenario}</p>
            </div>
          )}

          {/* Constraint — only for non-AI-output types */}
          {(nextItem as any).constraint && !iConfig.hasAiOutput && !iConfig.hasDataContext && (
            <div className="bg-[#EE8866]/6 rounded-xl p-3 border border-[#EE8866]/20">
              <p className="text-xs font-semibold text-[#EE8866] uppercase tracking-wider mb-1">
                Constraint
              </p>
              <p className="text-sm text-foreground">{(nextItem as any).constraint}</p>
            </div>
          )}

          {/* Risk framing for pressure_test */}
          {interactionType === "pressure_test" && (nextItem as any).constraint && (
            <div className="bg-[#EE6677]/6 rounded-xl p-3 border border-[#EE6677]/20">
              <p className="text-xs font-semibold text-[#EE6677] uppercase tracking-wider mb-1">
                Risk Factor
              </p>
              <p className="text-sm text-foreground">{(nextItem as any).constraint}</p>
            </div>
          )}

          {/* Governance framing */}
          {interactionType === "ethical_dilemma" && (nextItem as any).constraint && (
            <div className="bg-[#228833]/6 rounded-xl p-3 border border-[#228833]/20">
              <p className="text-xs font-semibold text-[#228833] uppercase tracking-wider mb-1">
                Policy Context
              </p>
              <p className="text-sm text-foreground">{(nextItem as any).constraint}</p>
            </div>
          )}

          {/* AI Output block — for critique/improvement/error types */}
          {iConfig.hasAiOutput && aiOutput && (
            <AiOutputBlock content={aiOutput} mode={aiOutputMode} />
          )}

          {/* Fallback if AI output type but no aiOutput field */}
          {iConfig.hasAiOutput && !aiOutput && (nextItem as any).constraint && (
            <AiOutputBlock content={(nextItem as any).constraint} mode={aiOutputMode} />
          )}

          {/* Data Context block */}
          {iConfig.hasDataContext && dataContext && (
            <DataContextBlock content={dataContext} />
          )}

          {/* Fallback if data type but no dataContext */}
          {iConfig.hasDataContext && !dataContext && (nextItem as any).constraint && (
            <DataContextBlock content={(nextItem as any).constraint} />
          )}

          {/* P6: Interaction purpose banner */}
          {INTERACTION_PURPOSE[interactionType] && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {INTERACTION_PURPOSE[interactionType]}
              </p>
            </div>
          )}

          {/* Question prompt */}
          <div>
            <p
              className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: iConfig.accent }}
            >
              {(nextItem as any).question || iConfig.questionLabel}
            </p>
            <p className="text-xs text-muted-foreground italic border-l-2 pl-3 py-0.5" style={{ borderColor: `${iConfig.accent}50` }}>
              {iConfig.instruction}
            </p>
          </div>

          {/* Options — UX-4: keyboard hint shown below */}
          {nextItem.options && nextItem.options.length > 0 && (
            <div className="space-y-2">
              {nextItem.options.map((option: any, idx: number) => (
                <button
                  key={option.id ?? idx}
                  onClick={() => { if (selectedValue && selectedValue !== option.value) setRevisionCount(c => c + 1); setSelectedValue(option.value); if (firstInteractionTime === null) setFirstInteractionTime(Date.now()); }}
                  className={cn(
                    "w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all text-sm",
                    selectedValue === option.value
                      ? "border-[#10B981] bg-[#10B981]/5 ring-1 ring-[#10B981]/20"
                      : "border-border hover:border-[#10B981]/40 hover:bg-muted/30"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5",
                      selectedValue === option.value
                        ? "border-[#10B981] bg-[#10B981] text-white"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{option.label}</span>
                </button>
              ))}
              <p className="text-xs text-muted-foreground pt-1 pl-1">Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-xs font-mono">1</kbd>–<kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-xs font-mono">{nextItem.options.length}</kbd> to select · <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-xs font-mono">Enter</kbd> to submit</p>
            </div>
          )}

          {/* C2.1: Optional reasoning capture — shown for all output-facing types */}
          {["prompt_refinement", "pressure_test", "ethical_dilemma", "output_critique", "error_detection", "chatbot_dialogue"].includes(interactionType) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Explain your thinking <span className="font-normal normal-case">(optional)</span>
                </Label>
                <span className={cn(
                  "text-xs tabular-nums",
                  reasoningText.length > 1800 ? "text-amber-500" : "text-muted-foreground"
                )}>
                  {reasoningText.length}/2000
                </span>
              </div>
              <Textarea
                value={reasoningText}
                onChange={e => setReasoningText(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="What factors shaped your decision? What would you want to verify or challenge?"
                className="text-sm resize-none"
              />
            </div>
          )}

          {/* v10: Three-level confidence staking */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              How confident are you in this answer?
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(["tentative", "confident", "certain"] as ConfidenceStake[]).map((stake) => {
                const isSelected = confidenceStake === stake;
                const labels: Record<ConfidenceStake, { label: string; desc: string; icon: string }> = {
                  tentative: { label: "Tentative", desc: "I'm not sure about this", icon: "\u{1F914}" },
                  confident: { label: "Confident", desc: "I believe this is right", icon: "\u{1F44D}" },
                  certain:   { label: "Certain", desc: "I'm sure this is correct", icon: "\u{2705}" },
                };
                const { label, desc } = labels[stake];
                return (
                  <button
                    key={stake}
                    type="button"
                    onClick={() => setConfidenceStake(stake)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition-all ${
                      isSelected
                        ? "border-[#10B981] bg-[#10B981]/10 text-[#10B981]"
                        : "border-border hover:border-[#10B981]/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs opacity-70">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || !selectedValue}
            className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : answeredCount + 1 === totalItems ? "Submit Final Answer" : "Next Question"}
            {!submitMutation.isPending && <ChevronRight className="w-4 h-4" />}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
