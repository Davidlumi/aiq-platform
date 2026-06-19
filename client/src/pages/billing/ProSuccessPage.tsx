/**
 * ProSuccessPage — /pro-success
 *
 * Shown after a successful Stripe checkout (success_url redirect).
 * Plays a 3-phase animation:
 *   Phase 1 (0–1.2s)  — spinning ring + "Activating your PRO account…"
 *   Phase 2 (1.2–2.8s) — checkmark burst + "PRO Activated!"
 *   Phase 3 (2.8s+)   — full welcome card with first-module CTA
 *
 * The page also invalidates auth.me so useIsPro() updates immediately.
 */
import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap, BookOpen, Brain, MessageSquare, FileText,
  ArrowRight, Sparkles, CheckCircle2, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Animated ring SVG ─────────────────────────────────────────────────────────
function SpinRing({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={cn("animate-spin", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="40" cy="40" r="34" stroke="#10B981" strokeWidth="4" strokeOpacity="0.15" />
      <path
        d="M40 6 A34 34 0 0 1 74 40"
        stroke="#10B981"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Burst checkmark ───────────────────────────────────────────────────────────
function CheckBurst({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center transition-all duration-700",
        visible ? "opacity-100 scale-100" : "opacity-0 scale-50",
      )}
    >
      {/* Glow ring */}
      <div className="absolute inset-0 rounded-full bg-[#10B981]/20 blur-xl scale-150" />
      {/* Outer pulse ring */}
      <div
        className={cn(
          "absolute w-28 h-28 rounded-full border-2 border-[#10B981]/40",
          visible && "animate-ping",
        )}
        style={{ animationDuration: "1.2s", animationIterationCount: 2 }}
      />
      {/* Icon circle */}
      <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10B981]/30">
        <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
      </div>
    </div>
  );
}

// ── PRO feature pills ─────────────────────────────────────────────────────────
const UNLOCKED = [
  { icon: Brain, label: "Learning Modules" },
  { icon: MessageSquare, label: "AiQ Coach" },
  { icon: BookOpen, label: "Knowledge Base" },
  { icon: FileText, label: "PDF Downloads" },
  { icon: Sparkles, label: "Personalised Plan" },
];

// ── Main page ─────────────────────────────────────────────────────────────────
type Phase = "activating" | "confirmed" | "welcome";

export default function ProSuccessPage() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("activating");
  const utils = trpc.useUtils();

  // Fetch the user's adaptive plan to surface the first recommended module
  const { data: plan } = trpc.adaptiveLearning.getAdaptivePlan.useQuery(
    {},
    { staleTime: 0, retry: 2 },
  );

  // Invalidate auth.me so isPro updates across the app immediately
  const invalidatedRef = useRef(false);
  useEffect(() => {
    if (!invalidatedRef.current) {
      invalidatedRef.current = true;
      // Small delay to let Stripe webhook propagate before refetching
      const t = setTimeout(() => utils.auth.me.invalidate(), 1500);
      return () => clearTimeout(t);
    }
  }, [utils]);

  // Phase transitions
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("confirmed"), 1200);
    const t2 = setTimeout(() => setPhase("welcome"), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Derive first recommended module from plan
  const nextItem = plan?.items?.find((i: any) => i.status !== "completed") ?? plan?.items?.[0];
  const nextModule = nextItem?.module ?? null;

  const handleStartModule = () => {
    if (nextItem) {
      navigate(`/learning/module/${nextItem.moduleId}?planItemId=${nextItem.id}`);
    } else {
      navigate("/learning/plan");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#10B981]/8 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#3B82F6]/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#10B981]/4 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">

        {/* ── Phase 1: Activating ─────────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-col items-center gap-6 transition-all duration-500",
            phase === "activating" ? "opacity-100 scale-100" : "opacity-0 scale-95 absolute inset-0 pointer-events-none",
          )}
        >
          <div className="relative w-24 h-24">
            <SpinRing className="w-24 h-24 text-[#10B981]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#10B981]" />
              </div>
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-white/80 text-lg font-medium tracking-tight">Activating your PRO account…</p>
            <p className="text-white/40 text-sm">Unlocking your personalised learning plan</p>
          </div>
          {/* Animated dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#10B981]/60 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>

        {/* ── Phase 2: Confirmed ──────────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-col items-center gap-6 transition-all duration-500",
            phase === "confirmed" ? "opacity-100 scale-100" : "opacity-0 scale-95 absolute inset-0 pointer-events-none",
          )}
        >
          <CheckBurst visible={phase === "confirmed"} />
          <div className="text-center space-y-2">
            <p className="text-white text-2xl font-bold tracking-tight">PRO Activated!</p>
            <p className="text-[#10B981] text-sm font-medium">Welcome to AiQ PRO</p>
          </div>
        </div>

        {/* ── Phase 3: Welcome card ───────────────────────────────────────── */}
        <div
          className={cn(
            "transition-all duration-700",
            phase === "welcome" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none",
          )}
        >
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 bg-[#0E1726]">

            {/* Header band */}
            <div className="relative bg-gradient-to-br from-[#0E2A1F] via-[#0E1726] to-[#0A1628] px-8 pt-8 pb-6 text-center overflow-hidden">
              {/* Sparkle dots */}
              {[
                { top: "12%", left: "8%", size: "w-1 h-1", delay: "0s" },
                { top: "20%", right: "12%", size: "w-1.5 h-1.5", delay: "0.3s" },
                { top: "60%", left: "5%", size: "w-1 h-1", delay: "0.6s" },
                { top: "70%", right: "8%", size: "w-1 h-1", delay: "0.9s" },
              ].map((dot, i) => (
                <div
                  key={i}
                  className={cn("absolute rounded-full bg-[#10B981] animate-ping", dot.size)}
                  style={{ top: dot.top, left: (dot as any).left, right: (dot as any).right, animationDelay: dot.delay, animationDuration: "2s" }}
                />
              ))}

              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#10B981]/30">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <Badge className="bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 text-[11px] font-bold uppercase tracking-widest mb-3">
                  PRO Member
                </Badge>
                <h1 className="text-2xl font-bold text-white leading-tight">
                  Welcome to AiQ PRO
                </h1>
                <p className="text-white/60 text-sm mt-2 leading-relaxed max-w-sm mx-auto">
                  Your personalised learning journey is ready. Everything is unlocked — start with your first recommended module below.
                </p>
              </div>
            </div>

            {/* Unlocked features strip */}
            <div className="px-6 py-4 border-b border-white/8">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-3 text-center">
                Now unlocked
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {UNLOCKED.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20"
                  >
                    <Icon className="w-3 h-3 text-[#10B981]" />
                    <span className="text-[11px] font-medium text-[#10B981]">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* First module CTA */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest text-center">
                Your first recommended module
              </p>

              {nextModule ? (
                <button
                  onClick={handleStartModule}
                  className="w-full group rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 hover:bg-[#10B981]/10 hover:border-[#10B981]/50 transition-all duration-200 p-4 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
                        {nextModule.title ?? "Your first module"}
                      </p>
                      {nextModule.durationMins && (
                        <p className="text-xs text-white/40 mt-0.5">
                          {nextModule.durationMins} min · {nextModule.modality ?? "Module"}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ) : (
                /* Fallback if plan not yet loaded */
                <button
                  onClick={() => navigate("/learning/plan")}
                  className="w-full group rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 hover:bg-[#10B981]/10 hover:border-[#10B981]/50 transition-all duration-200 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">View your learning plan</p>
                      <p className="text-xs text-white/40 mt-0.5">Personalised to your capability gaps</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#10B981] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              )}

              {/* Secondary actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs border-white/10 text-white/70 hover:text-white hover:border-white/20 bg-transparent"
                  onClick={() => navigate("/learning/plan")}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  Full Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs border-white/10 text-white/70 hover:text-white hover:border-white/20 bg-transparent"
                  onClick={() => navigate("/dashboard")}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Dashboard
                </Button>
              </div>
            </div>

          </div>

          {/* Fine print */}
          <p className="text-center text-xs text-white/30 mt-4">
            Manage your subscription any time in{" "}
            <button
              onClick={() => navigate("/billing")}
              className="underline underline-offset-2 hover:text-white/60 transition-colors"
            >
              Billing settings
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
