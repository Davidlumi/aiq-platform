/**
 * AiQ Pricing Page — v6.0 (Skills Checker Self-Serve Launch)
 * Two tiers: Free (headline score) and Individual Paid (£50/mo or £480/yr).
 * Team plans shown as coming soon.
 */
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight, Sparkles, Users } from "lucide-react";
import { MarketingNav, MarketingFooter } from "./MarketingPage";

const navy     = "#0F172A";
const slate    = "#1E293B";
const chalk    = "#F8FAFC";
const border   = "rgba(255,255,255,0.08)";
const borderL  = "#E2E8F0";
const greenHex = "#22C55E";
const indigo   = "#6366F1";
const amber    = "#F59E0B";

const FREE_FEATURES: { label: string; included: boolean }[] = [
  { label: "Full 15-minute scenario-based assessment", included: true },
  { label: "Headline capability score (0–10)", included: true },
  { label: "Per-domain scores across all 6 domains", included: true },
  { label: "Full diagnostic narrative per domain", included: true },
  { label: "Comparison to HR professional average", included: true },
  { label: "Retake once per month", included: true },
  { label: "Personalised learning plan (view only)", included: true },
  { label: "Click into learning modules", included: false },
  { label: "AiQ Coach access", included: false },
  { label: "Knowledge base (articles, guides, frameworks)", included: false },
  { label: "Progress tracking over time", included: false },
  { label: "Downloadable capability report (PDF)", included: false },
];

const PAID_FEATURES: { label: string; included: boolean }[] = [
  { label: "Full 15-minute scenario-based assessment", included: true },
  { label: "Headline capability score (0–10)", included: true },
  { label: "Per-domain scores across all 6 domains", included: true },
  { label: "Full diagnostic narrative per domain", included: true },
  { label: "Comparison to HR professional average", included: true },
  { label: "Retake once per month", included: true },
  { label: "Personalised learning plan (view only)", included: true },
  { label: "Click into learning modules", included: true },
  { label: "AiQ Coach access", included: true },
  { label: "Knowledge base (articles, guides, frameworks)", included: true },
  { label: "Progress tracking over time", included: true },
  { label: "Downloadable capability report (PDF)", included: true },
];

const BETA_HONEST = [
  { label: "Empirical norm data", status: "in-progress", note: "Benchmarks are currently synthetic reference data. Real norms will replace them once we have 200+ completions per role family." },
  { label: "Psychometric validation study", status: "planned", note: "Criterion validity study planned for Q3 2026 with an independent academic partner." },
  { label: "Team plans", status: "planned", note: "Team pricing with aggregated capability dashboards is on the roadmap. Get notified when it launches." },
  { label: "PDF report export", status: "in-progress", note: "Downloadable PDF capability reports are available for PRO subscribers. Richer formatting and branding options are on the roadmap." },
  { label: "Email notifications", status: "in-progress", note: "In-app notifications are live. Email delivery is being configured." },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: navy, color: chalk }}>
      <MarketingNav />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{ background: "rgba(34,197,94,0.12)", color: greenHex, border: "1px solid rgba(34,197,94,0.25)" }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: greenHex }} />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight text-white">
          Start free. Go deeper when you're ready.
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          The free assessment tells you where you stand. The paid plan tells you exactly what to do about it — and proves you did it.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="rounded-2xl p-8 flex flex-col" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${border}` }}>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white mb-1">Free</h2>
              <p className="text-sm text-slate-400 mb-4">Know where you stand.</p>
              <p className="text-4xl font-black text-white mb-1">£0</p>
              <p className="text-slate-400 text-sm">No credit card. No time limit.</p>
            </div>
            <div className="flex flex-col gap-3 flex-1 mb-8">
              {FREE_FEATURES.map(({ label, included }) => (
                <div key={label} className="flex items-start gap-3">
                  {included
                    ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: greenHex }} />
                    : <XCircle className="w-4 h-4 mt-0.5 shrink-0 opacity-30" style={{ color: chalk }} />}
                  <span className={`text-sm ${included ? "text-slate-300" : "text-slate-500"}`}>{label}</span>
                </div>
              ))}
            </div>
            <Link href="/register">
              <Button variant="outline" className="w-full text-white border-white/20 hover:bg-white/10 font-semibold">
                Start free assessment
              </Button>
            </Link>
          </div>

          {/* Individual Paid */}
          <div className="rounded-2xl p-8 flex flex-col relative overflow-hidden"
            style={{ background: "rgba(34,197,94,0.06)", border: "1.5px solid rgba(34,197,94,0.4)" }}>
            <div className="absolute top-4 right-4">
              <span className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{ background: "rgba(34,197,94,0.2)", color: greenHex, border: "1px solid rgba(34,197,94,0.4)" }}>
                <Sparkles className="w-3 h-3 inline mr-1" />Most popular
              </span>
            </div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white mb-1">Individual</h2>
              <p className="text-sm text-slate-400 mb-4">Know what to do about it.</p>
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-4xl font-black text-white">£50</p>
                <p className="text-slate-400 text-sm">/month</p>
              </div>
              <p className="text-slate-400 text-sm">or £480/year — save 20%</p>
            </div>
            <div className="flex flex-col gap-3 flex-1 mb-8">
              {PAID_FEATURES.map(({ label, included }) => (
                <div key={label} className="flex items-start gap-3">
                  {included
                    ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: greenHex }} />
                    : <XCircle className="w-4 h-4 mt-0.5 shrink-0 opacity-30" style={{ color: chalk }} />}
                  <span className={`text-sm ${included ? "text-slate-300" : "text-slate-500"}`}>{label}</span>
                </div>
              ))}
            </div>
            <Link href="/register">
              <Button className="w-full font-semibold" style={{ background: greenHex, color: "white" }}>
                Start free — upgrade anytime <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Team plans coming soon */}
        <div className="mt-6 rounded-xl p-6 border flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.25)" }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.15)" }}>
              <Users className="w-5 h-5" style={{ color: indigo }} />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Team plans — coming soon</p>
              <p className="text-slate-400 text-xs mt-0.5">Aggregated capability dashboards, seat management, and team-level gap analysis.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 text-white border-white/20 hover:bg-white/10"
            onClick={() => toast.info("Team plans — coming soon", { description: "We'll notify you when team pricing is available." })}>
            Get notified
          </Button>
        </div>
      </section>

      {/* Beta honesty box */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl p-8 border" style={{ background: "rgba(245,158,11,0.05)", borderColor: "rgba(245,158,11,0.25)" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
              <Sparkles className="w-4 h-4" style={{ color: amber }} />
            </div>
            <div>
              <p className="text-white font-semibold">What's live, what's coming</p>
              <p className="text-slate-400 text-xs">We'd rather be honest than oversell.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {BETA_HONEST.map(({ label, status, note }) => (
              <div key={label} className="flex items-start gap-4">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                  status === "in-progress"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                    : "bg-slate-500/15 text-slate-400 border border-slate-500/25"
                }`}>
                  {status === "in-progress" ? "In progress" : "Planned"}
                </span>
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-slate-400 text-xs leading-relaxed mt-0.5">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
