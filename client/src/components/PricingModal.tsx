/**
 * PricingModal — a sleek, animated pricing overlay triggered from the PRO
 * upsell card on the assessment results page.
 *
 * Entrance: backdrop fades in while the panel slides up + scales from 96% → 100%.
 * Exit:     panel slides down + fades out, backdrop fades out.
 * Transition is CSS-only (no external animation library required).
 */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import {
  Zap,
  Calendar,
  CheckCircle2,
  Loader2,
  X,
  BookOpen,
  MessageSquare,
  Newspaper,
  Download,
  Library,
  HelpCircle,
  Hash,
  Star,
  Shield,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Feature list ──────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Library,       label: "30+ learning modules",    desc: "Micro-lessons, scenarios, simulations & videos" },
  { icon: BookOpen,      label: "Personalised learning plan", desc: "Click into every module in your tailored plan" },
  { icon: MessageSquare, label: "AiQ Coach",               desc: "AI coaching conversations for your capability gaps" },
  { icon: Newspaper,     label: "Knowledge base",          desc: "Articles, guides, frameworks & glossary" },
  { icon: Download,      label: "PDF downloads",           desc: "Reports, learning plans & capability profiles" },
  { icon: Shield,        label: "Progress tracking",       desc: "Track completion and improvement over time" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional context label shown in the header, e.g. "AiQ Coach" */
  featureName?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PricingModal({ open, onClose, featureName }: PricingModalProps) {
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [visible, setVisible] = useState(false);      // controls CSS class
  const [mounted, setMounted] = useState(false);      // controls DOM presence
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkoutMutation = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => {
      toast.error(err.message || "Could not start checkout. Please try again.");
    },
  });

  // Mount → next tick → set visible (triggers CSS enter transition)
  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setMounted(true);
      // Defer to next paint so the initial CSS state is applied first
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      // Wait for exit transition before unmounting
      closeTimerRef.current = setTimeout(() => setMounted(false), 320);
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleCheckout = () => {
    const priceKey = plan === "monthly" ? "individualMonthly" : "individualAnnual";
    checkoutMutation.mutate({ priceKey, origin: window.location.origin });
  };

  if (!mounted) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to AiQ PRO"
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full sm:max-w-[520px] mx-auto sm:mx-4 rounded-t-2xl sm:rounded-2xl overflow-hidden",
          "shadow-2xl shadow-black/50",
          "transition-all duration-300 ease-out",
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-6 scale-[0.96]"
        )}
      >
        {/* ── Dark header ─────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-[#0A1628] via-[#0E1F38] to-[#0E2A1F] px-6 pt-6 pb-5 overflow-hidden">
          {/* Ambient glows */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[#10B981]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-[#3B82F6]/8 blur-3xl" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors rounded-md p-1 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badge + headline */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 border border-[#10B981]/25 flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#10B981]" />
              </div>
              <span className="inline-flex items-center gap-1 bg-[#10B981]/15 border border-[#10B981]/25 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#10B981] uppercase tracking-wider">
                AiQ PRO
              </span>
            </div>
            <h2 className="text-white text-xl font-bold leading-tight">
              {featureName ? `${featureName} requires PRO` : "Unlock your full capability journey"}
            </h2>
            <p className="text-white/55 text-sm mt-1 leading-relaxed">
              Your assessment and results are always free. PRO unlocks everything that turns insight into action.
            </p>
          </div>

          {/* Plan toggle */}
          <div className="relative flex items-center gap-1 mt-4 bg-white/8 rounded-lg p-1 w-fit">
            {(["monthly", "annual"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={cn(
                  "relative px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                  plan === p
                    ? "bg-white text-[#0A1628] shadow-sm"
                    : "text-white/60 hover:text-white"
                )}
              >
                {p === "monthly" ? "Monthly" : "Annual"}
                {p === "annual" && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 bg-[#10B981]/20 text-[#10B981] text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    <Star className="w-2 h-2 fill-current" /> Save 20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="bg-[#0E1726] px-6 py-5 space-y-5">
          {/* Price display */}
          <div
            className={cn(
              "flex items-end gap-2 transition-all duration-200",
              plan === "annual" ? "opacity-100" : "opacity-100"
            )}
          >
            <span className="text-4xl font-extrabold text-white leading-none">
              {plan === "monthly" ? "£50" : "£40"}
            </span>
            <div className="pb-1">
              <span className="text-white/40 text-sm">/month</span>
              {plan === "annual" && (
                <p className="text-[11px] text-white/35 leading-none mt-0.5">billed as £480/year</p>
              )}
            </div>
          </div>

          {/* Feature checklist — 2 columns */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                  <span className="text-xs text-white/70 leading-snug">{f.label}</span>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <button
            onClick={handleCheckout}
            disabled={checkoutMutation.isPending}
            className={cn(
              "btn-pro-pulse w-full flex items-center justify-center gap-2",
              "bg-[#10B981] hover:bg-[#0d9e6e] disabled:opacity-60 disabled:cursor-not-allowed",
              "text-white font-bold text-sm rounded-xl py-3 px-6",
              "transition-colors duration-150"
            )}
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {plan === "monthly" ? "Start PRO — £50/month" : "Start PRO — £480/year"}
                <ArrowRight className="w-4 h-4 ml-auto" />
              </>
            )}
          </button>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-white/30 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Secure payment via Stripe · Cancel any time
            </p>
            <button
              onClick={onClose}
              className="text-[11px] text-white/30 hover:text-white/60 underline underline-offset-2 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
