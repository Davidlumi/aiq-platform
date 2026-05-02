/**
 * Company HR AI Assessment — Adaptive Session Page
 * Renders questions one at a time, handles confidence selection, submits answers
 */
import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  strategy: { label: "AI Strategy", color: "text-violet-400", icon: Target },
  governance: { label: "Governance & Ethics", color: "text-rose-400", icon: Shield },
  data: { label: "Data & Infrastructure", color: "text-blue-400", icon: Layers },
  technology: { label: "Technology & Tools", color: "text-cyan-400", icon: BarChart3 },
  workforce: { label: "Workforce Capability", color: "text-emerald-400", icon: Users },
  hr_function: { label: "HR Function Readiness", color: "text-amber-400", icon: Lightbulb },
  culture: { label: "Culture & Change", color: "text-pink-400", icon: BarChart3 },
};

const CONFIDENCE_OPTIONS = [
  {
    value: "guessing",
    label: "Guessing",
    sub: "Not sure at all",
    multiplier: "0.25×",
    color: "text-rose-400",
    selectedBg: "bg-rose-500/10 border-rose-500",
  },
  {
    value: "fairly_sure",
    label: "Fairly sure",
    sub: "I think this is right",
    multiplier: "0.65×",
    color: "text-white/70",
    selectedBg: "bg-white/10 border-white/40",
  },
  {
    value: "certain",
    label: "Certain",
    sub: "Confident in my answer",
    multiplier: "1.0×",
    color: "text-emerald-400",
    selectedBg: "bg-emerald-500/10 border-emerald-500",
  },
];

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export default function CompanyAssessmentSessionPage() {
  const params = useParams<{ assessmentId: string }>();
  const assessmentId = params.assessmentId;
  const [, navigate] = useLocation();

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<"guessing" | "fairly_sure" | "certain">("fairly_sure");
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
    setConfidence("fairly_sure");
    setEvidence("");
  }, [nextQ?.question?.id]);

  const handleSubmit = async () => {
    if (selectedIdx === null || !nextQ?.question) return;
    setIsSubmitting(true);
    try {
      await submitResponse.mutateAsync({
        assessmentId,
        questionId: nextQ.question.id,
        selectedOption: OPTION_KEYS[selectedIdx],
        confidence,
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
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!nextQ || nextQ.done || !nextQ.question) {
    // Shouldn't normally reach here — completeAssessment handles redirect
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        <p className="text-white/60">Assessment complete. Generating results…</p>
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
    color: "text-violet-400",
    icon: BarChart3,
  };
  const DimIcon = dimMeta.icon;

  const progressPct = progress
    ? Math.round((progress.answered / Math.max(progress.total, 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4 text-violet-400" />
          <span className="text-sm text-white/60">Company HR AI Assessment</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">
            {progress?.answered ?? 0} of {progress?.total ?? 14} questions
          </span>
          <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-violet-400 font-medium">{progressPct}%</span>
        </div>
      </div>

      {/* Dimension progress bar */}
      {progress?.dimensionProgress && (
        <div className="border-b border-white/5 px-6 py-2 flex items-center gap-1.5">
          {progress.dimensionProgress.map((dp) => {
            const meta = DIMENSION_META[dp.key];
            const isActive = dp.key === progress.currentDimension;
            const isDone = dp.answered >= dp.total;
            return (
              <div
                key={dp.key}
                title={dp.label}
                className={`flex-1 h-1 rounded-full transition-all ${
                  isDone
                    ? "bg-emerald-500"
                    : isActive
                    ? "bg-violet-500"
                    : "bg-white/10"
                }`}
              />
            );
          })}
        </div>
      )}

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Dimension badge */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
            <DimIcon className={`w-3.5 h-3.5 ${dimMeta.color}`} />
          </div>
          <span className={`text-xs font-semibold uppercase tracking-wider ${dimMeta.color}`}>
            {dimMeta.label}
          </span>
        </div>

        {/* Question */}
        <div>
          <h2 className="text-xl font-semibold leading-relaxed text-white">{question.stem}</h2>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
                selectedIdx === i
                  ? "bg-violet-500/15 border-violet-500 text-white"
                  : "bg-white/5 border-white/10 text-white/70 hover:border-white/20 hover:bg-white/8"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    selectedIdx === i
                      ? "border-violet-500 bg-violet-500"
                      : "border-white/20"
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

        {/* Confidence */}
        {selectedIdx !== null && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              How confident are you in this answer?
            </div>
            <div className="grid grid-cols-3 gap-3">
              {CONFIDENCE_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setConfidence(c.value as typeof confidence)}
                  className={`px-3 py-3 rounded-xl border text-center transition-all ${
                    confidence === c.value ? c.selectedBg : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className={`font-semibold text-sm ${confidence === c.value ? c.color : "text-white/70"}`}>
                    {c.label}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">{c.sub}</div>
                  <div className="text-[10px] text-white/30 mt-1">score {c.multiplier}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Optional evidence */}
        {selectedIdx !== null && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Add evidence{" "}
              <span className="text-white/30 font-normal normal-case">(optional — enriches your results narrative)</span>
            </div>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="What evidence, data, or examples support this answer?"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
            />
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-2">
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
    </div>
  );
}
