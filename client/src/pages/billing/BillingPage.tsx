/**
 * BillingPage — /billing
 * Shows subscription status, upgrade CTAs, and links to the Stripe Customer Portal.
 *
 * States handled:
 *   1. Free tier (no paid subscription) — upgrade CTA
 *   2. Active paid subscription — plan details, portal link, cancel-at-period-end notice
 *   3. In grace period (payment failed, subscription deleted) — urgent upgrade CTA
 *   4. Post-checkout success redirect (?status=success) — confirmation banner
 *   5. Post-checkout cancel redirect (?status=cancelled) — soft message
 */
import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Zap,
  Calendar,
  ExternalLink,
  Loader2,
  XCircle,
  RefreshCw,
  BookOpen,
  Brain,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const PAID_FEATURES = [
  { icon: Brain, label: "Full per-domain capability scores", desc: "All 6 domain breakdowns with percentile rankings" },
  { icon: BookOpen, label: "Personalised 30-module learning plan", desc: "Matched to your specific skill gaps" },
  { icon: Shield, label: "AI-generated diagnostic narrative", desc: "Plain-English explanation of your capability profile" },
  { icon: RefreshCw, label: "Unlimited reassessments", desc: "Retake any time to track your progress" },
];

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function BillingPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const checkoutStatus = params.get("status");

  const [checkoutLoading, setCheckoutLoading] = useState<"monthly" | "annual" | null>(null);

  const { data: sub, isLoading, refetch } = trpc.stripe.getSubscriptionStatus.useQuery();

  const checkoutMutation = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => {
      if (url) window.open(url, "_blank");
      else toast.error("Could not open checkout. Please try again.");
      setCheckoutLoading(null);
    },
    onError: (err) => {
      toast.error(err.message ?? "Checkout failed");
      setCheckoutLoading(null);
    },
  });

  const portalMutation = trpc.stripe.createPortalSession.useMutation({
    onSuccess: ({ url }) => {
      window.open(url, "_blank");
    },
    onError: (err) => {
      toast.error(err.message ?? "Could not open billing portal");
    },
  });

  const handleCheckout = (priceKey: "individualMonthly" | "individualAnnual") => {
    setCheckoutLoading(priceKey === "individualMonthly" ? "monthly" : "annual");
      toast("Opening checkout…", { description: "A new tab will open shortly." });
    checkoutMutation.mutate({ priceKey, origin: window.location.origin });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isActive = sub?.isActive ?? false;
  const inGrace = sub?.inGracePeriod ?? false;
  const cancelScheduled = sub?.cancelAtPeriodEnd ?? false;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Billing & Subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your AiQ subscription and payment details.</p>
      </div>

      {/* Post-checkout banners */}
      {checkoutStatus === "success" && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            Payment confirmed. Your paid access is now active — full domain scores and learning plan are unlocked.
          </AlertDescription>
        </Alert>
      )}
      {checkoutStatus === "cancelled" && (
        <Alert>
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Checkout was cancelled. Your free account is still active — upgrade any time.
          </AlertDescription>
        </Alert>
      )}

      {/* Grace period warning */}
      {inGrace && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your last payment failed. Your access will be suspended on{" "}
            <strong>{formatDate(sub?.currentPeriodEnd)}</strong>. Please update your payment method to avoid losing access.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Active subscription ─────────────────────────────────────────────── */}
      {isActive && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">{sub?.planLabel ?? "AiQ Individual"}</span>
                {cancelScheduled ? (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[11px]">Cancels {formatDate(sub?.currentPeriodEnd)}</Badge>
                ) : (
                  <Badge variant="outline" className="text-green-500 border-green-500/30 text-[11px]">Active</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {cancelScheduled
                  ? `Access continues until ${formatDate(sub?.currentPeriodEnd)}`
                  : `Next renewal: ${formatDate(sub?.currentPeriodEnd)}`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              disabled={portalMutation.isPending}
              onClick={() => portalMutation.mutate({ origin: window.location.origin })}
            >
              {portalMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
              Manage subscription
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PAID_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40">
                  <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground leading-tight">{f.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-1 border-t border-border">
            <p className="text-xs text-muted-foreground">
              To cancel, change plan, or update payment details, use the{" "}
              <button
                className="text-primary underline underline-offset-2 hover:text-primary/80"
                onClick={() => portalMutation.mutate({ origin: window.location.origin })}
              >
                Stripe billing portal
              </button>
              . Changes take effect at the end of the current billing period.
            </p>
          </div>
        </div>
      )}

      {/* ── Free / upgrade CTA ─────────────────────────────────────────────── */}
      {!isActive && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">Free tier</span>
              <Badge variant="outline" className="text-[11px]">Current plan</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              You have access to the headline capability score and named weak domains.
              Upgrade to unlock the full assessment results and personalised learning plan.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PAID_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 opacity-60">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground leading-tight">{f.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Monthly */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">£50<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
              <Button
                className="w-full h-9 text-sm"
                disabled={checkoutLoading === "monthly"}
                onClick={() => handleCheckout("individualMonthly")}
              >
                {checkoutLoading === "monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-3.5 h-3.5 mr-1.5" />Upgrade monthly</>}
              </Button>
            </div>
            {/* Annual */}
            <div className="border border-primary/40 rounded-lg p-4 space-y-3 relative">
              <div className="absolute -top-2.5 left-3">
                <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Save 20%</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Annual</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">£480<span className="text-sm font-normal text-muted-foreground">/yr</span></p>
                <p className="text-[11px] text-muted-foreground">£40/month effective</p>
              </div>
              <Button
                className="w-full h-9 text-sm"
                disabled={checkoutLoading === "annual"}
                onClick={() => handleCheckout("individualAnnual")}
              >
                {checkoutLoading === "annual" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Calendar className="w-3.5 h-3.5 mr-1.5" />Upgrade annual</>}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment via Stripe. Cancel any time. Team plans coming soon.
          </p>
        </div>
      )}

      {/* Payment method / invoices link */}
      {isActive && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CreditCard className="w-3.5 h-3.5" />
          <span>
            View invoices and update payment details in the{" "}
            <button
              className="text-primary underline underline-offset-2 hover:text-primary/80"
              onClick={() => portalMutation.mutate({ origin: window.location.origin })}
            >
              Stripe billing portal
            </button>
            .
          </span>
        </div>
      )}
    </div>
  );
}
