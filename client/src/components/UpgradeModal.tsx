/**
 * UpgradeModal — shown when a free-tier user tries to access a PRO feature.
 *
 * Displays:
 *  - What feature they tried to access (featureName prop)
 *  - The full list of PRO features
 *  - Monthly / Annual pricing cards with Stripe checkout buttons
 *  - A "Maybe later" dismiss option
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  BookOpen,
  MessageSquare,
  Newspaper,
  HelpCircle,
  Hash,
  Download,
  Library,
  CheckCircle2,
  Loader2,
  Calendar,
  Lock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRO_FEATURES = [
  { icon: BookOpen,    label: "Learning plan modules",   desc: "Click into and complete any module in your personalised plan" },
  { icon: Library,     label: "Full modules library",    desc: "80+ micro-lessons, scenarios, simulations, and videos" },
  { icon: MessageSquare, label: "AiQ Coach",             desc: "AI-powered coaching conversations tailored to your capability gaps" },
  { icon: Newspaper,   label: "Knowledge articles",      desc: "Curated AI-in-HR articles and research summaries" },
  { icon: HelpCircle,  label: "Guides & frameworks",     desc: "Step-by-step implementation guides for HR teams" },
  { icon: Hash,        label: "Glossary",                desc: "Comprehensive AI terminology reference for HR professionals" },
  { icon: Download,    label: "Downloads & exports",     desc: "PDF reports, learning plans, and capability profiles" },
];

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Name of the feature the user tried to access, e.g. "AiQ Coach" */
  featureName?: string;
}

export function UpgradeModal({ open, onClose, featureName }: UpgradeModalProps) {
  const [, setLocation] = useLocation();
  const [checkoutLoading, setCheckoutLoading] = useState<"monthly" | "annual" | null>(null);

  const checkoutMutation = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => {
      toast.error(err.message || "Could not start checkout. Please try again.");
      setCheckoutLoading(null);
    },
  });

  const handleCheckout = (priceKey: "individualMonthly" | "individualAnnual") => {
    setCheckoutLoading(priceKey === "individualMonthly" ? "monthly" : "annual");
    checkoutMutation.mutate({ priceKey, origin: window.location.origin });
  };

  const handleViewBilling = () => {
    onClose();
    setLocation("/billing");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        {/* Header band */}
        <div className="bg-gradient-to-br from-[#0E1726] to-[#1a2a40] px-6 pt-6 pb-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 flex items-center justify-center">
              <Lock className="w-4 h-4 text-[#10B981]" />
            </div>
            <Badge className="bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 text-[11px] font-semibold uppercase tracking-wide">
              PRO Feature
            </Badge>
          </div>
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-white text-xl font-bold leading-tight">
              {featureName ? `${featureName} requires PRO` : "Upgrade to AiQ PRO"}
            </DialogTitle>
            <DialogDescription className="text-white/60 text-sm leading-relaxed">
              Your free assessment and results dashboard are always free.
              Upgrade to unlock learning, coaching, and knowledge resources.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5 bg-background">
          {/* PRO features list */}
          <div className="grid grid-cols-1 gap-2">
            {PRO_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">{f.label}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">{f.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Monthly */}
            <div className="border border-border rounded-xl p-4 space-y-3 bg-card">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Monthly</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  £50
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
              </div>
              <Button
                className="w-full h-9 text-sm"
                disabled={checkoutLoading === "monthly"}
                onClick={() => handleCheckout("individualMonthly")}
              >
                {checkoutLoading === "monthly"
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Zap className="w-3.5 h-3.5 mr-1.5" />Upgrade</>
                }
              </Button>
            </div>

            {/* Annual — highlighted */}
            <div className="border-2 border-[#10B981]/60 rounded-xl p-4 space-y-3 bg-card relative">
              <div className="absolute -top-2.5 left-3">
                <span className="text-[10px] font-bold bg-[#10B981] text-white px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Annual</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  £480
                  <span className="text-sm font-normal text-muted-foreground">/yr</span>
                </p>
                <p className="text-[11px] text-muted-foreground">£40/month effective</p>
              </div>
              <Button
                className="w-full h-9 text-sm bg-[#10B981] hover:bg-[#0d9e6e] text-white"
                disabled={checkoutLoading === "annual"}
                onClick={() => handleCheckout("individualAnnual")}
              >
                {checkoutLoading === "annual"
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Calendar className="w-3.5 h-3.5 mr-1.5" />Best value</>
                }
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              Secure payment via Stripe. Cancel any time.
            </p>
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
