/**
 * Company HR AI Assessment — Adaptive Session Page
 * Renders questions one at a time, handles confidence selection, submits answers
 */
import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useParams, useLocation } from "wouter";
import {
  Building2,
  ChevronRight,
  CheckCircle2,
  Loader2,
  BarChart3,
  Target,
  Users,
  Layers,
  Shield,
  Lightbulb,
} from "lucide-react";

const DIMENSION_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  strategy: { label: "AI Strategy", color: "dark:text-violet-400 text-violet-600", icon: Target },
  governance: { label: "Governance & Ethics", color: "dark:text-rose-400 text-rose-600", icon: Shield },
  data: { label: "Data & Infrastructure", color: "dark:text-blue-400 text-blue-600", icon: Layers },
  technology: { label: "Technology & Tools", color: "dark:text-cyan-400 text-cyan-600", icon: BarChart3 },
  workforce: { label: "Workforce Capability", color: "dark:text-emerald-400 text-emerald-600", icon: Users },
  hr_function: { label: "HR Function Readiness", color: "dark:text-amber-400 text-amber-600", icon: Lightbulb },
  culture: { label: "Culture & Change", color: "dark:text-pink-400 text-pink-600", icon: BarChart3 },
};

const CONFIDENCE_OPTIONS = [
  {
    value: "guessing",
    label: "Guessing",
    sub: "Not sure at all",
    multiplier: "score 0.25×",
    ringColor: "ring-rose-500",
    bgSelected: "dark:bg-rose-500/20 bg-rose-100 border-rose-500 ring-2 ring-rose-500/40",
    textSelected: "dark:text-rose-300 text-rose-700",
  },
  {
    value: "fairly_sure",
    label: "Fairly sure",
    sub: "I think this is right",
    multiplier: "score 0.65×",
    ringColor: "ring-amber-500",
    bgSelected: "dark:bg-amber-500/20 bg-amber-100 border-amber-500 ring-2 ring-amber-500/40",
    textSelected: "dark:text-amber-300 text-amber-700",
  },
  {
    value: "certain",
    label: "Certain",
    sub: "Confident in my answer",
    multiplier: "score 1.0×",
    ringColor: "ring-emerald-500",
    bgSelected: "dark:bg-emerald-500/20 bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/40",
    textSelected: "dark:text-emerald-300 text-emerald-700",
  },
];

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export default function CompanyAssessmentSessionPage() {
  const params = useParams<{ assessmentId: string }>();
  const assessmentId = params.assessmentId;
  const [, navigate] = useLocation();

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<"guessing" | "fairly_sure" | "certain" | null>(null);
  const [evidence, setEvidence] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: nextQ, refetch, isLoading } = trpc.companyAssessment.getNextQuestion.useQuery(
    { assessmentId },
    { enabled: !!assessmentId, refetchOnWindowFocus: false }
  );

  const submitResponse = trpc.companyAssessment.submitResponse.useMutation();
  const completeAssessment = trpc.companyAssessment.completeAssessment.useMutation();

  // Reset selection when question changes
  useEffect(() => {
    setSelectedIdx(null);
    setConfidence(null);
    setEvidence("");
  }, [nextQ?.question?.id]);

  const handleSubmit = async () => {
    if (selectedIdx === null || !nextQ?.question) return;
    const finalConfidence = confidence ?? "fairly_sure";
    setIsSubmitting(true);
    try {
      await submitResponse.mutateAsync({
        assessmentId,
        questionId: nextQ.question.id,
        selectedOption: OPTION_KEYS[selectedIdx],
        confidence: finalConfidence,
        evidence: evidence.trim() || undefined,
      });

      // Refetch to get next question
      const refreshed = await refetch();
      if (refreshed.data?.done) {
        // All questions answered — complete and go to results
        await completeAssessment.mutateAsync({ assessmentId });
        navigate(`/company-assessment/${assessmentId}/results`);
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 dark:text-violet-400 text-violet-600 animate-spin" />
      </div>
    );
  }

  if (!nextQ || nextQ.done || !nextQ.question) {
    // Shouldn't normally reach here — completeAssessment handles redirect
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <CheckCircle2 className="w-10 h-10 dark:text-emerald-400 text-emerald-600" />
        <p className="text-foreground/60">Assessment complete. Generating results…</p>
        <Button
          onClick={async () => {
            await completeAssessment.mutateAsync({ assessmentId });
            navigate(`/company-assessment/${assessmentId}/results`);
          }}
          className="bg-violet-600 hover:bg-violet-700 text-white"
        >
          View Results
        </Button>
      </div>
    );
  }

  const { question, progress } = nextQ;
  const dimMeta = DIMENSION_META[question.dimension] || {
    label: question.dimensionLabel,
    color: "dark:text-violet-400 text-violet-600",
    icon: BarChart3,
  };
  const DimIcon = dimMeta.icon;

  const progressPct = progress
    ? Math.round((progress.answered / Math.max(progress.total, 1)) * 100)
    : 0;

  return (
    <div className="text-white space-y-0">
      {/* Progress header bar */}
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-5 py-3 mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Building2 className="w-4 h-4 dark:text-violet-400 text-violet-600 shrink-0" />
          <span className="text-sm font-medium text-foreground/70 truncate">Company HR AI Assessment</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold text-white">
            Question {(progress?.answered ?? 0) + 1}
            <span className="text-foreground/40 font-normal"> of {progress?.total ?? 14}</span>
          </span>
          <div className="w-36 h-2 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-semibold dark:text-violet-400 text-violet-600 w-8 text-right">{progressPct}%</span>
        </div>
      </div>

      {/* Dimension progress dots */}
      {progress?.dimensionProgress && (
        <div className="flex items-center gap-1.5 mb-6">
          {progress.dimensionProgress.map((dp) => {
            const isActive = dp.key === progress.currentDimension;
            const isDone = dp.answered >= dp.total;
            return (
              <div
                key={dp.key}
                title={`${dp.label}: ${dp.answered}/${dp.total}`}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  isDone
                    ? "bg-emerald-500"
                    : isActive
                    ? "bg-violet-500"
                    : "bg-foreground/10"
                }`}
              />
            );
          })}
        </div>
      )}

      {/* Main question card */}
      <div className="rounded-2xl border border-foreground/10 bg-foreground/3 p-6 md:p-8 space-y-6">
        {/* Dimension badge */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center">
            <DimIcon className={`w-3.5 h-3.5 ${dimMeta.color}`} />
          </div>
          <span className={`text-xs font-semibold uppercase tracking-wider ${dimMeta.color}`}>
            {dimMeta.label}
          </span>
        </div>

        {/* Question */}
        <h2 className="text-xl font-semibold leading-relaxed text-foreground">{question.stem}</h2>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
                selectedIdx === i
                  ? "dark:bg-violet-500/15 bg-violet-100/80 border-violet-500 text-white ring-2 ring-violet-500/30"
                  : "bg-foreground/5 border-foreground/10 text-foreground/70 hover:border-foreground/20 hover:bg-foreground/8"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    selectedIdx === i
                      ? "border-violet-500 bg-violet-500"
                      : "border-foreground/20"
                  }`}
                >
                  {selectedIdx === i && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <span className="text-sm leading-relaxed">{opt.text}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Confidence selector — shown after an answer is selected */}
      {selectedIdx !== null && (
        <div className="rounded-2xl border border-foreground/10 bg-foreground/3 p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground/70 uppercase tracking-wider text-xs">
              How confident are you in this answer?
            </span>
            {confidence === null && (
              <span className="text-xs dark:text-amber-400 text-amber-600/80 italic">Select your confidence level</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {CONFIDENCE_OPTIONS.map((c) => {
              const isSelected = confidence === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setConfidence(c.value as typeof confidence)}
                  className={`px-3 py-4 rounded-xl border text-center transition-all duration-150 ${
                    isSelected
                      ? c.bgSelected
                      : "bg-foreground/5 border-foreground/10 hover:bg-foreground/10 hover:border-foreground/20"
                  }`}
                >
                  <div className={`font-semibold text-sm mb-0.5 ${isSelected ? c.textSelected : "text-foreground/70"}`}>
                    {c.label}
                  </div>
                  <div className="text-xs text-foreground/40">{c.sub}</div>
                  <div className={`text-[11px] mt-1.5 font-mono ${isSelected ? c.textSelected : "text-foreground/25"}`}>
                    {c.multiplier}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional evidence */}
      {selectedIdx !== null && (
        <div className="rounded-2xl border border-foreground/10 bg-foreground/3 p-6 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 mt-4">
          <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">
            Add evidence{" "}
            <span className="text-foreground/30 font-normal normal-case">(optional — enriches your results narrative)</span>
          </div>
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="What evidence, data, or examples support this answer?"
            rows={3}
            className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-foreground/25 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
          />
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSubmit}
          disabled={selectedIdx === null || isSubmitting}
          className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-2.5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              Next question
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
