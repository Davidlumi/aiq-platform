/**
 * PostAssessmentInterstitial
 *
 * Fullscreen animated screen shown immediately after a user completes their
 * FIRST assessment. It celebrates the completion, previews what PRO unlocks,
 * and gives them a clear CTA to upgrade before landing on the results page.
 *
 * Usage:
 *   <PostAssessmentInterstitial
 *     sessionId={sessionId}
 *     overallScore={score}          // optional — shown in the card
 *     onContinue={() => navigate(`/assessment/${sessionId}/results`)}
 *   />
 *
 * The component auto-advances to onContinue after AUTO_ADVANCE_MS if the user
 * does not interact. Clicking "View my results" also calls onContinue.
 * Clicking "Upgrade to PRO" opens the UpgradeModal.
 */
import { useState, useEffect, useRef } from "react";
import {
  Zap, BookOpen, MessageSquare, BookMarked, Download,
  CheckCircle2, ChevronRight, ArrowRight, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradeModal } from "./UpgradeModal";

const AUTO_ADVANCE_MS = 12_000; // 12 s before auto-navigating to results

interface PostAssessmentInterstitialProps {
  sessionId: string;
  overallScore?: number | null;
  onContinue: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpinRing({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("animate-spin", className)} fill="none">
      <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="4" strokeOpacity="0.15" />
      <path
        d="M50 6 A44 44 0 0 1 94 50"
        stroke="currentColor" strokeWidth="4" strokeLinecap="round"
      />
    </svg>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const colour =
    score >= 80 ? "#10B981" :
    score >= 65 ? "#3B82F6" :
    score >= 50 ? "#8B5CF6" : "#F59E0B";

  return (
    <div
      className="relative w-20 h-20 flex items-center justify-center rounded-full border-4"
      style={{ borderColor: colour, boxShadow: `0 0 24px ${colour}40` }}
    >
      <span className="text-2xl font-bold text-white tabular-nums">{score}</span>
      <span className="absolute -bottom-1 text-[10px] font-semibold text-white/50 uppercase tracking-wider">/ 100</span>
    </div>
  );
}

const PRO_FEATURES = [
  { icon: BookOpen,      label: "Personalised learning modules",  desc: "30+ micro-lessons mapped to your gaps" },
  { icon: MessageSquare, label: "AiQ Coach",                      desc: "AI coaching tailored to your profile" },
  { icon: BookMarked,    label: "Knowledge base",                 desc: "Articles, guides & frameworks" },
  { icon: Download,      label: "PDF downloads",                  desc: "Reports, plans & certificates" },
];

// ─── Main component ───────────────────────────────────────────────────────────

type Phase = "celebrating" | "revealing" | "cta";

export function PostAssessmentInterstitial({
  overallScore,
  onContinue,
}: PostAssessmentInterstitialProps) {
  const [phase, setPhase] = useState<Phase>("celebrating");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [countdown, setCountdown] = useState(Math.round(AUTO_ADVANCE_MS / 1000));

  // Phase transitions
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("revealing"), 1800);
    const t2 = setTimeout(() => setPhase("cta"), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Auto-advance countdown
  useEffect(() => {
    autoTimer.current = setTimeout(onContinue, AUTO_ADVANCE_MS);
    const tick = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      clearInterval(tick);
    };
  }, [onContinue]);

  const handleContinue = () => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    onContinue();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1628] flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#10B981]/8 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#3B82F6]/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#10B981]/4 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* ── Phase 1: Celebrating ─────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-col items-center gap-5 transition-all duration-500",
            phase === "celebrating"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 absolute inset-0 pointer-events-none",
          )}
        >
          <div className="relative w-24 h-24">
            <SpinRing className="w-24 h-24 text-[#10B981]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-[#10B981]/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-[#10B981]" />
              </div>
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-white text-xl font-bold tracking-tight">Assessment complete!</p>
            <p className="text-white/50 text-sm">Calculating your capability profile…</p>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#10B981]/60 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>

        {/* ── Phase 2: Revealing score ─────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-col items-center gap-5 transition-all duration-500",
            phase === "revealing"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 absolute inset-0 pointer-events-none",
          )}
        >
          {overallScore != null && <ScoreBadge score={overallScore} />}
          <div className="text-center space-y-1.5">
            <p className="text-white text-xl font-bold tracking-tight">Your results are ready</p>
            <p className="text-[#10B981] text-sm font-medium">See your full capability profile below</p>
          </div>
        </div>

        {/* ── Phase 3: PRO CTA card ─────────────────────────────────────── */}
        <div
          className={cn(
            "transition-all duration-700",
            phase === "cta"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8 pointer-events-none",
          )}
        >
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 bg-[#0E1726]">

            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#0E2A1F] via-[#0E1726] to-[#0A1628] px-7 pt-7 pb-5 overflow-hidden">
              {/* Sparkle dots */}
              {[
                { top: "15%", left: "6%",  size: "w-1 h-1",   delay: "0s"   },
                { top: "25%", right: "10%", size: "w-1.5 h-1.5", delay: "0.4s" },
                { top: "65%", left: "4%",  size: "w-1 h-1",   delay: "0.8s" },
                { top: "72%", right: "7%", size: "w-1 h-1",   delay: "1.2s" },
              ].map((dot, i) => (
                <div
                  key={i}
                  className={cn("absolute rounded-full bg-[#10B981] animate-ping", dot.size)}
                  style={{
                    top: dot.top,
                    left: (dot as any).left,
                    right: (dot as any).right,
                    animationDelay: dot.delay,
                    animationDuration: "2.5s",
                  }}
                />
              ))}
              <div className="relative flex items-start gap-4">
                {overallScore != null && (
                  <div className="shrink-0">
                    <ScoreBadge score={overallScore} />
                  </div>
                )}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="inline-flex items-center gap-1.5 bg-[#10B981]/15 border border-[#10B981]/25 rounded-full px-2.5 py-0.5 mb-2">
                    <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                    <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider">Assessment complete</span>
                  </div>
                  <h1 className="text-lg font-bold text-white leading-snug">
                    Unlock your full learning journey
                  </h1>
                  <p className="text-white/55 text-xs mt-1 leading-relaxed">
                    Your results are ready. Upgrade to PRO to turn them into a personalised development plan.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature list */}
            <div className="px-7 py-4 border-b border-white/8 space-y-2.5">
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-3">What PRO unlocks</p>
              {PRO_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-[#10B981]/12 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-[#10B981]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white">{label}</span>
                    <span className="text-[11px] text-white/40 ml-1.5">{desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="px-7 py-5 space-y-3">
              <button
                onClick={() => {
                  if (autoTimer.current) clearTimeout(autoTimer.current);
                  setUpgradeOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#0d9e6e] active:bg-[#0a8a5e] text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                <Zap className="w-4 h-4" />
                Upgrade to AiQ PRO
              </button>

              <button
                onClick={handleContinue}
                className="w-full flex items-center justify-center gap-1.5 text-white/50 hover:text-white/80 text-sm transition-colors py-1"
              >
                View my results first
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Auto-advance hint */}
              <p className="text-center text-[10px] text-white/25">
                Continuing to results in {countdown}s
                <button
                  onClick={handleContinue}
                  className="ml-1.5 underline underline-offset-2 hover:text-white/50 transition-colors"
                >
                  skip
                </button>
              </p>
            </div>

          </div>

          {/* Progress bar */}
          <div className="mt-3 h-0.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#10B981]/50 rounded-full transition-all ease-linear"
              style={{
                width: `${((AUTO_ADVANCE_MS / 1000 - countdown) / (AUTO_ADVANCE_MS / 1000)) * 100}%`,
                transitionDuration: "1s",
              }}
            />
          </div>
        </div>

      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => {
          setUpgradeOpen(false);
          // After upgrade modal closes, continue to results
          handleContinue();
        }}
        featureName="Learning Modules"
      />
    </div>
  );
}
