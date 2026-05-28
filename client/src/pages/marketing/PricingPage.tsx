/**
 * AiQ Pricing Page
 * Indicative beta pricing with transparent ROI framing and honest beta disclosure.
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarketingNav, MarketingFooter } from "./MarketingPage";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Users,
  BarChart3,
  Brain,
  Shield,
  Building2,
  HelpCircle,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";

const navy = "#0F172A";
const slate = "#1E293B";
const chalk = "#F8FAFC";
const greenHex = "#10B981";
const border = "rgba(255,255,255,0.08)";

const PLANS = [
  {
    name: "Beta Access",
    badge: "Free during beta",
    badgeColor: greenHex,
    price: "Free",
    priceNote: "No credit card required",
    description: "Full platform access for HR teams willing to provide structured feedback during our beta programme.",
    highlight: true,
    features: [
      { label: "Up to 25 users", included: true },
      { label: "Individual capability assessments", included: true },
      { label: "Personalised learning plans", included: true },
      { label: "Manager & CPO dashboards", included: true },
      { label: "Company HR AI maturity assessment", included: true },
      { label: "AI Strategy Builder", included: true },
      { label: "Content library (200+ modules)", included: true },
      { label: "CSV user import", included: true },
      { label: "Quarterly feedback sessions with AiQ team", included: true },
      { label: "HRIS integration (Workday, SAP, BambooHR)", included: false },
      { label: "SSO / SAML", included: false },
      { label: "Custom branding", included: false },
      { label: "SLA / enterprise support", included: false },
    ],
    cta: "Join the beta programme for free",
    ctaHref: "/beta",
    ctaStyle: { background: greenHex, color: "white" },
  },
  {
    name: "Growth",
    badge: "Post-beta · 2026",
    badgeColor: "#6366F1",
    price: "£18",
    priceNote: "per user / month (indicative)",
    description: "For HR functions scaling AI capability across their organisation. Full platform with integrations.",
    highlight: false,
    features: [
      { label: "Up to 200 users", included: true },
      { label: "Individual capability assessments", included: true },
      { label: "Personalised learning plans", included: true },
      { label: "Manager & CPO dashboards", included: true },
      { label: "Company HR AI maturity assessment", included: true },
      { label: "AI Strategy Builder", included: true },
      { label: "Content library (200+ modules)", included: true },
      { label: "CSV user import", included: true },
      { label: "HRIS integration (Workday, SAP, BambooHR)", included: true },
      { label: "SSO / SAML", included: true },
      { label: "Custom branding", included: false },
      { label: "SLA / enterprise support", included: false },
      { label: "Dedicated customer success manager", included: false },
    ],
    cta: "Join waitlist",
    ctaHref: "/beta",
    ctaStyle: { background: "#6366F1", color: "white" },
  },
  {
    name: "Enterprise",
    badge: "Post-beta · 2026",
    badgeColor: "#8B5CF6",
    price: "Custom",
    priceNote: "annual contract",
    description: "For large HR functions requiring enterprise-grade security, integrations, and strategic partnership.",
    highlight: false,
    features: [
      { label: "Unlimited users", included: true },
      { label: "Individual capability assessments", included: true },
      { label: "Personalised learning plans", included: true },
      { label: "Manager & CPO dashboards", included: true },
      { label: "Company HR AI maturity assessment", included: true },
      { label: "AI Strategy Builder", included: true },
      { label: "Content library (200+ modules)", included: true },
      { label: "CSV user import", included: true },
      { label: "HRIS integration (Workday, SAP, BambooHR)", included: true },
      { label: "SSO / SAML", included: true },
      { label: "Custom branding", included: true },
      { label: "SLA / enterprise support", included: true },
      { label: "Dedicated customer success manager", included: true },
    ],
    cta: "Talk to us",
    ctaHref: "/about#contact",
    ctaStyle: { background: "#8B5CF6", color: "white" },
  },
];

const ROI_ITEMS = [
  {
    icon: Clock,
    color: "#10B981",
    title: "Reduce time-to-competence",
    stat: "40%",
    desc: "Organisations with structured AI capability programmes report 40% faster time-to-competence versus ad-hoc training.",
  },
  {
    icon: TrendingUp,
    color: "#6366F1",
    title: "Prioritise learning spend",
    stat: "3×",
    desc: "Targeted gap-based learning delivers 3× the capability uplift of generic AI training catalogues at the same budget.",
  },
  {
    icon: Users,
    color: "#F59E0B",
    title: "Retain AI-capable talent",
    stat: "28%",
    desc: "HR professionals with clear AI development pathways show 28% lower attrition than those without structured progression.",
  },
  {
    icon: BarChart3,
    color: "#EC4899",
    title: "Board-ready reporting",
    stat: "1 day",
    desc: "CPOs using AiQ can produce a board-ready AI readiness report in under a day versus weeks of manual benchmarking.",
  },
];

const BETA_HONEST = [
  { label: "Empirical norm data", status: "in-progress", note: "Benchmarks are currently synthetic reference data. Real norms will replace them once we have 200+ completions per role family." },
  { label: "Psychometric validation study", status: "planned", note: "Criterion validity study planned for Q3 2026 with an independent academic partner." },
  { label: "HRIS integrations", status: "planned", note: "Workday, SAP SuccessFactors, and BambooHR integrations are on the roadmap for the Growth tier." },
  { label: "SSO / SAML", status: "planned", note: "Enterprise SSO is planned for the Enterprise tier post-beta." },
  { label: "Email notifications", status: "in-progress", note: "In-app notifications are live. Email delivery is being configured." },
  { label: "PDF report export", status: "planned", note: "Downloadable PDF reports for individual and company assessments are on the roadmap." },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: navy, color: chalk }}>
      <MarketingNav />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <Badge className="mb-6 text-xs font-semibold px-3 py-1" style={{ background: "rgba(16,185,129,0.15)", color: greenHex, border: `1px solid rgba(16,185,129,0.3)` }}>
          Beta programme open now
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-lg dark:text-slate-400 text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Free during beta. No credit card. No lock-in. We want your feedback more than your money right now.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-2xl p-6 flex flex-col"
              style={{
                background: plan.highlight ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.04)",
                border: plan.highlight ? `1.5px solid rgba(16,185,129,0.4)` : `1px solid ${border}`,
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block"
                    style={{ background: `${plan.badgeColor}22`, color: plan.badgeColor, border: `1px solid ${plan.badgeColor}44` }}
                  >
                    {plan.badge}
                  </span>
                </div>
                {plan.highlight && <Sparkles className="w-5 h-5 mt-1" style={{ color: greenHex }} />}
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                {plan.price !== "Custom" && (
                  <span className="text-sm dark:text-slate-400 text-slate-600 ml-2">{plan.priceNote}</span>
                )}
                {plan.price === "Custom" && (
                  <p className="text-sm dark:text-slate-400 text-slate-600 mt-0.5">{plan.priceNote}</p>
                )}
              </div>

              <p className="text-sm dark:text-slate-400 text-slate-600 leading-relaxed mb-6">{plan.description}</p>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5">
                    {f.included ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: greenHex }} />
                    ) : (
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-slate-600" />
                    )}
                    <span className={`text-sm ${f.included ? "dark:text-slate-300 text-slate-700" : "text-slate-600"}`}>{f.label}</span>
                  </li>
                ))}
              </ul>

              <Link href={plan.ctaHref}>
                <Button className="w-full font-semibold" style={plan.ctaStyle}>
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Indicative post-beta pricing. Final pricing will be confirmed before general availability. Beta participants receive preferential rates.
        </p>
      </section>

      {/* ROI section */}
      <section className="border-t py-16" style={{ borderColor: border }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">The business case</h2>
            <p className="dark:text-slate-400 text-slate-600 max-w-xl mx-auto text-sm leading-relaxed">
              AI capability gaps are costing HR functions in productivity, talent retention, and strategic credibility. AiQ makes the gap visible and actionable.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ROI_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl p-5"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${border}` }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${item.color}22` }}>
                  <item.icon className="w-4.5 h-4.5" style={{ color: item.color }} />
                </div>
                <div className="text-2xl font-bold mb-1" style={{ color: item.color }}>{item.stat}</div>
                <div className="text-sm font-semibold text-white mb-1">{item.title}</div>
                <p className="text-xs dark:text-slate-400 text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-600 mt-6">
            Statistics are indicative industry benchmarks from published research. AiQ-specific outcome data will be published from beta programme results.
          </p>
        </div>
      </section>

      {/* Honest beta disclosure */}
      <section className="border-t py-16" style={{ borderColor: border }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}>
              <Shield className="w-3.5 h-3.5" />
              Honest about what's in beta
            </div>
            <h2 className="text-2xl font-bold mb-3">What we're still building</h2>
            <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed max-w-xl mx-auto">
              We believe in being transparent with beta partners. Here is exactly what is live, what is in progress, and what is planned.
            </p>
          </div>
          <div className="space-y-3">
            {BETA_HONEST.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-4 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${border}` }}
              >
                <div className="shrink-0 mt-0.5">
                  {item.status === "in-progress" ? (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(245,158,11,0.2)" }}>
                      <Zap className="w-3 h-3" style={{ color: "#F59E0B" }} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(99,102,241,0.2)" }}>
                      <Clock className="w-3 h-3" style={{ color: "#6366F1" }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-white">{item.label}</span>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={
                        item.status === "in-progress"
                          ? { background: "rgba(245,158,11,0.15)", color: "#F59E0B" }
                          : { background: "rgba(99,102,241,0.15)", color: "#6366F1" }
                      }
                    >
                      {item.status === "in-progress" ? "In progress" : "Planned"}
                    </span>
                  </div>
                  <p className="text-xs dark:text-slate-400 text-slate-600 leading-relaxed">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t py-16" style={{ borderColor: border }}>
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Common questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "What happens to our data at the end of beta?",
                a: "All assessment data, scores, and learning progress are yours. We will provide a full data export before any pricing transition. We will never delete your data without 90 days' notice.",
              },
              {
                q: "How does the beta feedback commitment work?",
                a: "We ask for one structured feedback session per quarter (45 minutes) and occasional async responses to specific questions. That's it. No mandatory feature reviews or sales calls.",
              },
              {
                q: "Are the benchmarks reliable enough to use with our board?",
                a: "The individual capability benchmarks are currently based on synthetic reference data, not empirical norms. We label this clearly in the platform. We recommend framing results as directional diagnostics rather than statistically validated percentiles until our empirical validation study is complete in Q3 2026.",
              },
              {
                q: "Can we import our existing HR team from our HRIS?",
                a: "Yes — the admin panel includes CSV import (email, first name, last name, role). Native HRIS integrations (Workday, SAP, BambooHR) are on the roadmap for the Growth tier post-beta.",
              },
              {
                q: "What is the post-beta pricing commitment for beta participants?",
                a: "Beta participants will receive at least 30% off the first year of any paid plan, and will be given 60 days' notice before any pricing changes take effect.",
              },
            ].map((faq) => (
              <div key={faq.q} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${border}` }}>
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#6366F1" }} />
                  <div>
                    <p className="text-sm font-semibold text-white mb-1.5">{faq.q}</p>
                    <p className="text-sm dark:text-slate-400 text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-16 text-center" style={{ borderColor: border }}>
        <div className="max-w-xl mx-auto px-6">
          <Brain className="w-10 h-10 mx-auto mb-4" style={{ color: greenHex }} />
          <h2 className="text-2xl font-bold mb-3">Ready to join the beta?</h2>
          <p className="dark:text-slate-400 text-slate-600 text-sm mb-6 leading-relaxed">
            We're accepting a limited number of HR functions for the beta programme. Apply now to secure your place and shape the product.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/beta">
              <Button className="font-semibold px-6" style={{ background: greenHex, color: "white" }}>
                Join the beta programme for free
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/about#contact">
              <Button variant="outline" className="font-semibold px-6 border-white/20 text-white hover:bg-white/10">
                Talk to the team
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
