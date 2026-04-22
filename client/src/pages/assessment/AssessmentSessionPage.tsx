/**
 * Assessment Session Page — AiQ Enterprise Platform (v2)
 *
 * Renders each of the 8 interaction types with a distinct visual treatment:
 *
 * 1. situational_judgement  — scenario + constraint + MCQ
 * 2. prioritisation         — scenario + constraint + ranked MCQ (coloured priority badge)
 * 3. risk_judgement         — scenario + red risk framing + MCQ
 * 4. governance_decision    — scenario + policy framing + MCQ
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

import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ExplanationDrawer, ScoreBreakdown } from "@/components/ExplanationDrawer";
import { toast } from "sonner";
import {
  ChevronRight,
  CheckCircle2,
  Award,
  Shield,
  AlertTriangle,
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

// ─── Capability colours ───────────────────────────────────────────────────────

const CAPABILITY_COLOURS: Record<string, string> = {
  execution:           "#4477AA",
  judgement:           "#AA3377",
  governance:          "#228833",
  appropriateness:     "#EE6677",
  validation:          "#EE8866",
  prioritisation:      "#66CCEE",
  data_interpretation: "#BBBBBB",
  workflow_application:"#4477AA",
};

const RISK_CONFIG = {
  High:   { color: "text-[#EE6677] bg-[#EE6677]/8 border-[#EE6677]/30", icon: AlertTriangle },
  Medium: { color: "text-[#EE8866] bg-[#EE8866]/8 border-[#EE8866]/30", icon: AlertTriangle },
  Low:    { color: "text-[#228833] bg-[#228833]/8 border-[#228833]/30", icon: Target },
} as const;

// ─── Interaction type config ──────────────────────────────────────────────────

type InteractionTypeKey =
  | "situational_judgement"
  | "prioritisation"
  | "risk_judgement"
  | "governance_decision"
  | "scenario_critique"
  | "output_improvement"
  | "error_detection"
  | "data_interpretation"
  | "multi_step_workflow"
  | "contradiction_probe"
  | "confidence_calibration";

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

const INTERACTION_CONFIGS: Record<string, InteractionConfig> = {
  situational_judgement: {
    label: "Situational Judgement",
    instruction: "Select the response that best demonstrates sound professional judgement.",
    questionLabel: "What do you do?",
    hasAiOutput: false,
    hasDataContext: false,
    accent: "#4477AA",
    icon: Scale,
  },
  prioritisation: {
    label: "Prioritisation",
    instruction: "Select the action that should be prioritised first given the constraints.",
    questionLabel: "What do you prioritise?",
    hasAiOutput: false,
    hasDataContext: false,
    accent: "#66CCEE",
    icon: Layers,
  },
  risk_judgement: {
    label: "Risk Judgement",
    instruction: "Assess the level of risk and select the most appropriate response.",
    questionLabel: "What is the most appropriate response to this risk?",
    hasAiOutput: false,
    hasDataContext: false,
    accent: "#EE6677",
    icon: AlertTriangle,
  },
  governance_decision: {
    label: "Governance Decision",
    instruction: "Select the response that best aligns with AI governance and compliance requirements.",
    questionLabel: "What is the correct governance action?",
    hasAiOutput: false,
    hasDataContext: false,
    accent: "#228833",
    icon: Shield,
  },
  scenario_critique: {
    label: "AI Output Critique",
    instruction: "Evaluate the AI-generated output below. Select the most significant problem with it.",
    questionLabel: "What is the most significant problem with this AI output?",
    hasAiOutput: true,
    hasDataContext: false,
    accent: "#AA3377",
    icon: Search,
  },
  output_improvement: {
    label: "Output Improvement",
    instruction: "Review the AI-generated output below. Select the best way to improve it.",
    questionLabel: "How should this output be improved?",
    hasAiOutput: true,
    hasDataContext: false,
    accent: "#CCBB44",
    icon: Sparkles,
  },
  error_detection: {
    label: "Error Detection",
    instruction: "Examine the AI output below carefully. Identify the most significant error or risk.",
    questionLabel: "What is the most significant error in this AI output?",
    hasAiOutput: true,
    hasDataContext: false,
    accent: "#EE6677",
    icon: Search,
  },
  data_interpretation: {
    label: "Data Interpretation",
    instruction: "Interpret the data or AI-generated insight below. Select the most accurate conclusion.",
    questionLabel: "What does this data tell you?",
    hasAiOutput: false,
    hasDataContext: true,
    accent: "#66CCEE",
    icon: BarChart3,
  },
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
  confidence_calibration: {
    label: "Confidence Calibration",
    instruction: "Reflect on your certainty and select the response that best reflects your actual confidence level.",
    questionLabel: "How certain are you about this?",
    hasAiOutput: false,
    hasDataContext: false,
    accent: "#4477AA",
    icon: Target,
  },
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

function GeneratingState({ answeredCount, totalItems }: { answeredCount: number; totalItems: number }) {
  const progress = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;
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
        <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#3B4EFF]/8 border border-[#3B4EFF]/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#3B4EFF] animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Preparing your next question</p>
            <p className="text-xs text-muted-foreground mt-1">
              The adaptive engine is generating a question tailored to your profile and responses so far.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bot className="w-3 h-3" />
            <span>Adaptive AI assessment engine</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Completion Screen ────────────────────────────────────────────────────────

function CompletionScreen({
  result,
  onNavigate,
}: {
  result: any;
  onNavigate: (path: string) => void;
}) {
  const primaryState = result?.primaryState ?? "unknown";
  const STATE_CONFIGS: Record<string, { label: string; color: string; bg: string }> = {
    safe:     { label: "Safe to Deploy", color: "text-[#228833]", bg: "bg-[#228833]/8 border-[#228833]/30" },
    at_risk:  { label: "At Risk",        color: "text-[#EE8866]", bg: "bg-[#EE8866]/8 border-[#EE8866]/30" },
    unsafe:   { label: "Unsafe",         color: "text-[#EE6677]", bg: "bg-[#EE6677]/8 border-[#EE6677]/30" },
    unknown:  { label: "Not Assessed",   color: "text-muted-foreground", bg: "bg-muted/20 border-border" },
  };
  const stateConfig = STATE_CONFIGS[primaryState] ?? { label: "Assessed", color: "text-foreground", bg: "bg-muted/20 border-border" };
  const capabilityScores = result?.capabilityScores ?? {};

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="text-center py-6">
        <div className="w-20 h-20 rounded-full bg-[#3B4EFF]/8 border-2 border-[#3B4EFF]/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-[#3B4EFF]" />
        </div>
        <h1 className="text-2xl font-bold text-foreground font-sora">Assessment Complete</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Your capability profile has been updated. Your learning plan will reflect these results.
        </p>
      </div>

      {result && (
        <div className={cn("rounded-2xl border-2 p-5 text-center", stateConfig.bg)}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Readiness State</p>
          <p className={cn("text-3xl font-bold font-sora", stateConfig.color)}>{stateConfig.label}</p>
          <p className={cn("text-5xl font-bold mt-2", stateConfig.color)}>{Math.round(result.overallScore)}</p>
          <p className="text-sm text-muted-foreground">overall score</p>
        </div>
      )}

      {result && Object.keys(capabilityScores).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Capability Breakdown</h3>
            <ExplanationDrawer
              trigger={
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Info className="w-3 h-3" />
                  How scores are calculated
                </button>
              }
              title="Signal-Weighted Capability Scoring"
              subtitle="Each answer carries signal deltas that accumulate across the assessment"
            >
              <ScoreBreakdown
                overallScore={Math.round(result.overallScore)}
                confidenceLevel={result.credibilityBand}
                dataPoints={Object.keys(capabilityScores).length}
                lastUpdated={new Date().toLocaleDateString()}
                factors={Object.entries(capabilityScores).map(([key, score]) => ({
                  name: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                  score: score as number,
                  weight: 1 / Object.keys(capabilityScores).length,
                  description: `Signal-weighted score for ${key.replace(/_/g, " ")}`,
                  color: CAPABILITY_COLOURS[key] ?? "#4477AA",
                }))}
              />
            </ExplanationDrawer>
          </div>
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

      {result && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border p-3 text-center">
            <Award className="w-5 h-5 text-[#3B4EFF] mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Credibility</p>
            <p className="text-sm font-bold capitalize text-foreground">{result.credibilityBand}</p>
          </div>
          <div className="rounded-xl border border-border p-3 text-center">
            <Shield className="w-5 h-5 text-[#3B4EFF] mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Risk Level</p>
            <p className="text-sm font-bold capitalize text-foreground">{result.riskBand}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={() => onNavigate("/learning")} className="flex-1 bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white">
          View Learning Plan
        </Button>
        <Button onClick={() => onNavigate("/dashboard")} variant="outline" className="flex-1">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AssessmentSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();

  // Poll every 3 seconds while generating (no nextItem) to pick up pre-generated item
  const [isGenerating, setIsGenerating] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // T2-5: Rationale reveal state — shown after answer submission
  const [rationaleData, setRationaleData] = useState<{
    rationaleText: string | null;
    allOptionsRationale: Array<{ value: string; rationaleText: string | null; outcomeClass: string | null }>;
    selectedValue: string;
    outcomeClass: string | null;
  } | null>(null);

  const { data: sessionData, isLoading, error: sessionError, refetch } = trpc.assessment.session.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, refetchOnWindowFocus: false, retry: false }
  );

  const [selectedValue, setSelectedValue] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(50);
  const [itemStartTime, setItemStartTime] = useState<number>(Date.now());

  const submitMutation = trpc.assessment.submitAnswer.useMutation({
    onSuccess: (data) => {
      // T2-5: Show rationale if available before advancing to next question
      const hasRationale = data.allOptionsRationale?.some((o: any) => o.rationaleText);
      if (hasRationale) {
        setRationaleData({
          rationaleText: data.rationaleText ?? null,
          allOptionsRationale: data.allOptionsRationale ?? [],
          selectedValue: selectedValue,
          outcomeClass: data.outcomeClass ?? null,
        });
        // Pre-fetch next item in background while user reads rationale
        setIsGenerating(true);
        refetch();
      } else {
        setSelectedValue("");
        setConfidence(50);
        setItemStartTime(Date.now());
        setIsGenerating(true);
        refetch();
      }
    },
    onError: err => toast.error(err.message),
  });

  const completeMutation = trpc.assessment.completeSession.useMutation({
    onSuccess: () => {
      navigate(`/assessment/${sessionId}/results`);
    },
    onError: err => toast.error(err.message),
  });

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

  // All answered — show complete button
  if (isComplete && answeredCount > 0) {
    return (
      <div className="p-6 space-y-6 max-w-2xl">
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-[#228833] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground font-sora">All questions answered</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Click below to calculate your capability scores and update your learning plan.
          </p>
          <Button
            onClick={() => completeMutation.mutate({ sessionId: sessionId! })}
            disabled={completeMutation.isPending}
            className="mt-6 bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white"
          >
            {completeMutation.isPending ? "Calculating scores…" : "Complete Assessment"}
          </Button>
        </div>
      </div>
    );
  }

  // T2-5: Rationale reveal — show after answer, before next question
  if (rationaleData) {
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
      <div className="p-6 space-y-5 max-w-2xl">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Question {answeredCount} <span className="text-muted-foreground font-normal">of {totalItems}</span>
            </span>
            <span className="text-xs text-muted-foreground">{progress}% complete</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 space-y-4">
            {/* Outcome badge */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold"
              style={{ color: outcomeColor, backgroundColor: `${outcomeColor}12`, borderColor: `${outcomeColor}30` }}
            >
              <CheckCircle2 className="w-4 h-4" />
              {outcomeLabel}
            </div>
            {/* Selected option rationale */}
            {rationaleData.rationaleText && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Why this matters</p>
                <p className="text-sm text-foreground leading-relaxed">{rationaleData.rationaleText}</p>
              </div>
            )}
            {/* All options rationale */}
            {rationaleData.allOptionsRationale.filter(o => o.rationaleText && o.value !== rationaleData.selectedValue).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Other options</p>
                {rationaleData.allOptionsRationale
                  .filter(o => o.rationaleText && o.value !== rationaleData.selectedValue)
                  .map(o => (
                    <div
                      key={o.value}
                      className="p-3 rounded-lg border border-border bg-muted/30 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {o.value?.toUpperCase?.()}
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
                  ))}
              </div>
            )}
            <Button
              onClick={() => {
                setRationaleData(null);
                setSelectedValue("");
                setConfidence(50);
                setItemStartTime(Date.now());
              }}
              className="w-full bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white gap-2"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generating state — waiting for LLM to produce next item
  if (isGenerating || !nextItem) {
    return <GeneratingState answeredCount={answeredCount} totalItems={totalItems} />;
  }

  const handleSubmit = () => {
    if (!selectedValue) {
      toast.error("Please select an answer before continuing");
      return;
    }
    const timeTaken = Math.round(Date.now() - itemStartTime);
    submitMutation.mutate({
      sessionId: sessionId!,
      itemId: nextItem.id,
      selectedValue,
      confidenceScore: confidence / 100,
      timeToAnswerMs: timeTaken,
    });
  };

  const interactionType = (nextItem as any).interactionType ?? "situational_judgement";
  const iConfig = getInteractionConfig(interactionType);
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
        <button
          onClick={() => navigate("/assessment")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Assessments
        </button>

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
            {/* Interaction type badge */}
            <span
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border"
              style={{
                color: iConfig.accent,
                backgroundColor: `${iConfig.accent}12`,
                borderColor: `${iConfig.accent}30`,
              }}
            >
              <iConfig.icon className="w-3 h-3" />
              {iConfig.label}
            </span>

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

            <span className="text-xs text-muted-foreground ml-auto">
              Level {(nextItem as any).difficulty}
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

          {/* Risk framing for risk_judgement */}
          {interactionType === "risk_judgement" && (nextItem as any).constraint && (
            <div className="bg-[#EE6677]/6 rounded-xl p-3 border border-[#EE6677]/20">
              <p className="text-xs font-semibold text-[#EE6677] uppercase tracking-wider mb-1">
                Risk Factor
              </p>
              <p className="text-sm text-foreground">{(nextItem as any).constraint}</p>
            </div>
          )}

          {/* Governance framing */}
          {interactionType === "governance_decision" && (nextItem as any).constraint && (
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

          {/* Options */}
          {nextItem.options && nextItem.options.length > 0 && (
            <div className="space-y-2">
              {nextItem.options.map((option: any, idx: number) => (
                <button
                  key={option.id ?? idx}
                  onClick={() => setSelectedValue(option.value)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all text-sm",
                    selectedValue === option.value
                      ? "border-[#3B4EFF] bg-[#3B4EFF]/5 ring-1 ring-[#3B4EFF]/20"
                      : "border-border hover:border-[#3B4EFF]/40 hover:bg-muted/30"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5",
                      selectedValue === option.value
                        ? "border-[#3B4EFF] bg-[#3B4EFF] text-white"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {option.value?.toUpperCase?.() ?? String.fromCharCode(65 + idx)}
                  </span>
                  <span className="leading-relaxed">{option.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Confidence slider */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                How confident are you in this answer?
              </Label>
              <span className="text-sm font-bold text-[#3B4EFF]">{confidence}%</span>
            </div>
            <Slider
              value={[confidence]}
              onValueChange={([v]) => setConfidence(v)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Not confident</span>
              <span>Very confident</span>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || !selectedValue}
            className="w-full bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white gap-2"
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
