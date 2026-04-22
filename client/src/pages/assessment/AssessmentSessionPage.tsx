/**
 * Assessment Session Page — AiQ Enterprise Platform
 *
 * Uses the session.nextItem from the assessment router which includes:
 * - title, scenario, constraint, capability, workflow, riskLevel
 * - options with label/value (scoring data stripped server-side)
 * - progress tracking via answeredCount / totalItems
 */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ExplanationDrawer, ScoreBreakdown } from "@/components/ExplanationDrawer";
import { toast } from "sonner";
import {
  Clock,
  ChevronRight,
  CheckCircle2,
  Award,
  Shield,
  AlertTriangle,
  Info,
  Briefcase,
  Target,
  ArrowLeft,
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
      {/* Hero */}
      <div className="text-center py-6">
        <div className="w-20 h-20 rounded-full bg-[#3B4EFF]/8 border-2 border-[#3B4EFF]/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-[#3B4EFF]" />
        </div>
        <h1 className="text-2xl font-bold text-foreground font-sora">Assessment Complete</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Your capability profile has been updated. Your learning plan will reflect these results.
        </p>
      </div>

      {/* Readiness State */}
      {result && (
        <div className={cn("rounded-2xl border-2 p-5 text-center", stateConfig.bg)}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Readiness State
          </p>
          <p className={cn("text-3xl font-bold font-sora", stateConfig.color)}>
            {stateConfig.label}
          </p>
          <p className={cn("text-5xl font-bold mt-2", stateConfig.color)}>
            {Math.round(result.overallScore)}
          </p>
          <p className="text-sm text-muted-foreground">overall score</p>
        </div>
      )}

      {/* Capability Breakdown */}
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
                  style={{
                    width: `${score}%`,
                    backgroundColor: CAPABILITY_COLOURS[key] ?? "#4477AA",
                  }}
                />
              </div>
              <span
                className="text-xs font-bold w-8 text-right"
                style={{ color: CAPABILITY_COLOURS[key] ?? "#4477AA" }}
              >
                {score as number}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Credibility + Risk */}
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

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => onNavigate("/learning")}
          className="flex-1 bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white"
        >
          View Learning Plan
        </Button>
        <Button
          onClick={() => onNavigate("/dashboard")}
          variant="outline"
          className="flex-1"
        >
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

  const { data: sessionData, isLoading, error: sessionError, refetch } = trpc.assessment.session.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, refetchOnWindowFocus: false, retry: false }
  );

  const [selectedValue, setSelectedValue] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(50);
  const [startTime] = useState<number>(Date.now());
  const [itemStartTime, setItemStartTime] = useState<number>(Date.now());
  const submitMutation = trpc.assessment.submitAnswer.useMutation({
    onSuccess: () => {
      setSelectedValue("");
      setConfidence(50);
      setItemStartTime(Date.now());
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  const completeMutation = trpc.assessment.completeSession.useMutation({
    onSuccess: () => {
      // Navigate to the dedicated results page
      navigate(`/assessment/${sessionId}/results`);
    },
    onError: err => toast.error(err.message),
  });

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

  // No next item loaded
  if (!nextItem) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Loading next question…</p>
      </div>
    );
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

  const capabilityColor = CAPABILITY_COLOURS[nextItem.capabilityKey] ?? "#4477AA";
  const riskLevel = nextItem.riskLevel as keyof typeof RISK_CONFIG;
  const riskConfig = RISK_CONFIG[riskLevel] ?? RISK_CONFIG.Medium;

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
            {nextItem.capability && (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                style={{
                  color: capabilityColor,
                  backgroundColor: `${capabilityColor}12`,
                  borderColor: `${capabilityColor}30`,
                }}
              >
                {nextItem.capability}
              </span>
            )}
            {nextItem.workflow && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Briefcase className="w-3 h-3" />
                {nextItem.workflow}
              </span>
            )}
            {nextItem.riskLevel && (
              <span className={cn("flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", riskConfig.color)}>
                <riskConfig.icon className="w-3 h-3" />
                {nextItem.riskLevel} Risk
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              Level {nextItem.difficulty}
            </span>
          </div>

          {/* Title */}
          {nextItem.title && (
            <h2 className="text-base font-bold text-foreground font-sora leading-snug">
              {nextItem.title}
            </h2>
          )}

          {/* Scenario */}
          {nextItem.scenario && (
            <div className="bg-muted/40 rounded-xl p-4 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Scenario
              </p>
              <p className="text-sm text-foreground leading-relaxed">{nextItem.scenario}</p>
            </div>
          )}

          {/* Constraint */}
          {nextItem.constraint && (
            <div className="bg-[#EE8866]/6 rounded-xl p-3 border border-[#EE8866]/20">
              <p className="text-xs font-semibold text-[#EE8866] uppercase tracking-wider mb-1">
                Constraint
              </p>
              <p className="text-sm text-foreground">{nextItem.constraint}</p>
            </div>
          )}

          {/* Question prompt */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {(nextItem as any).question || "What do you do?"}
            </p>
          </div>

          {/* Interaction type instruction */}
          {(() => {
            const iType = (nextItem as any).interactionType ?? "situational_judgement";
            const instructions: Record<string, string> = {
              situational_judgement:    "Select the response that best demonstrates sound professional judgement.",
              critique:                 "Evaluate the AI output below and select the most appropriate critique.",
              output_improvement:       "Identify the best way to improve the AI-generated output.",
              error_detection:          "Identify the most significant error or risk in the AI output.",
              prioritisation:           "Select the action that should be prioritised first given the constraints.",
              risk_judgement:           "Assess the level of risk and select the most appropriate response.",
              data_interpretation:      "Interpret the data or AI insight and select the most accurate conclusion.",
              governance:               "Select the response that best aligns with AI governance and compliance requirements.",
              multi_step:               "Consider the full sequence of steps and select the most appropriate next action.",
              contradiction_probe:      "Review your earlier response and select the most consistent answer.",
              confidence_calibration:   "Reflect on your certainty and select the response that best reflects your actual confidence level.",
            };
            const instruction = instructions[iType];
            if (!instruction) return null;
            return (
              <p className="text-xs text-muted-foreground italic border-l-2 border-[#3B4EFF]/30 pl-3 py-0.5">
                {instruction}
              </p>
            );
          })()}

          {/* Options */}
          {nextItem.options && nextItem.options.length > 0 && (
            <div className="space-y-2">
              {nextItem.options.map((option: any) => (
                <button
                  key={option.id}
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
                    {option.value}
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
            {submitMutation.isPending ? "Saving…" : answeredCount + 1 === totalItems ? "Submit Final Answer" : "Next Question"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
