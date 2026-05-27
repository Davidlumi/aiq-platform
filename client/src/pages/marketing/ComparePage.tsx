/**
 * Compare Page — AiQ vs alternatives feature matrix
 */
import { useEffect } from "react";
import { Link } from "wouter";
import { MarketingNav, MarketingFooter } from "./MarketingPage";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Check, X, Minus, Target, Brain, Users,
  BookOpen, FileText, Shield, Sparkles, TrendingUp,
  MessageSquare, BarChart3, Clock, Zap,
} from "lucide-react";

const navy = "#0a1628";
const greenHex = "#22c55e";
const indigo = "#6366f1";
const amber = "#f59e0b";

type CellValue = "full" | "partial" | "none" | string;

interface FeatureRow {
  feature: string;
  tooltip?: string;
  aiq: CellValue;
  lms: CellValue;
  competency: CellValue;
  manual: CellValue;
}

const CATEGORIES: { title: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; features: FeatureRow[] }[] = [
  {
    title: "Strategy & Planning",
    icon: Target,
    color: greenHex,
    features: [
      { feature: "AI-guided strategy builder (10 stages)", aiq: "full", lms: "none", competency: "none", manual: "partial" },
      { feature: "Board-ready strategy documents", aiq: "full", lms: "none", competency: "none", manual: "partial" },
      { feature: "Dual mode (CPO + Reward specialist)", aiq: "full", lms: "none", competency: "none", manual: "none" },
      { feature: "Initiative library (68+ AI initiatives)", aiq: "full", lms: "none", competency: "partial", manual: "none" },
      { feature: "Value/ROI modelling per initiative", aiq: "full", lms: "none", competency: "none", manual: "partial" },
      { feature: "Peer vision benchmarks by sector", aiq: "full", lms: "none", competency: "partial", manual: "none" },
    ],
  },
  {
    title: "Assessment & Measurement",
    icon: Brain,
    color: indigo,
    features: [
      { feature: "Adaptive scenario-based assessment", aiq: "full", lms: "partial", competency: "partial", manual: "none" },
      { feature: "79+ real-world AI scenarios", aiq: "full", lms: "none", competency: "none", manual: "none" },
      { feature: "Anti-gaming & contradiction detection", aiq: "full", lms: "none", competency: "none", manual: "none" },
      { feature: "Role-aware difficulty calibration", aiq: "full", lms: "none", competency: "partial", manual: "none" },
      { feature: "6-domain capability scoring", aiq: "full", lms: "partial", competency: "full", manual: "partial" },
      { feature: "Evidence-grade confidence scoring", aiq: "full", lms: "none", competency: "none", manual: "none" },
      { feature: "Industry benchmark comparison", aiq: "full", lms: "none", competency: "partial", manual: "none" },
    ],
  },
  {
    title: "Development & Learning",
    icon: BookOpen,
    color: amber,
    features: [
      { feature: "Personalised learning plans from gaps", aiq: "full", lms: "partial", competency: "none", manual: "none" },
      { feature: "AI Coach (contextual conversations)", aiq: "full", lms: "none", competency: "none", manual: "none" },
      { feature: "Domain-specific learning pathways", aiq: "full", lms: "full", competency: "none", manual: "none" },
      { feature: "Progress tracking linked to capability change", aiq: "full", lms: "partial", competency: "none", manual: "none" },
      { feature: "Manager conversation prompts", aiq: "full", lms: "none", competency: "none", manual: "partial" },
      { feature: "Content request workflow", aiq: "full", lms: "partial", competency: "none", manual: "none" },
    ],
  },
  {
    title: "Team & Organisational Intelligence",
    icon: Users,
    color: "#EC4899",
    features: [
      { feature: "Real-time team readiness heatmap", aiq: "full", lms: "none", competency: "partial", manual: "partial" },
      { feature: "Manager hub with coaching tools", aiq: "full", lms: "none", competency: "none", manual: "none" },
      { feature: "Leader dashboard (function-wide view)", aiq: "full", lms: "partial", competency: "partial", manual: "partial" },
      { feature: "Risk identification & alerts", aiq: "full", lms: "none", competency: "none", manual: "partial" },
      { feature: "Implementation tracker", aiq: "full", lms: "none", competency: "none", manual: "partial" },
      { feature: "Cross-team benchmark comparison", aiq: "full", lms: "none", competency: "partial", manual: "none" },
    ],
  },
  {
    title: "Reporting & Governance",
    icon: FileText,
    color: "#8B5CF6",
    features: [
      { feature: "Auto-generated board reports", aiq: "full", lms: "none", competency: "none", manual: "partial" },
      { feature: "PDF export (strategy + assessment)", aiq: "full", lms: "partial", competency: "none", manual: "partial" },
      { feature: "Maturity progression tracking", aiq: "full", lms: "none", competency: "partial", manual: "partial" },
      { feature: "UK GDPR / ICO compliance built-in", aiq: "full", lms: "partial", competency: "none", manual: "none" },
      { feature: "Audit trail & data governance", aiq: "full", lms: "partial", competency: "none", manual: "none" },
      { feature: "ROI evidence for investment cases", aiq: "full", lms: "none", competency: "none", manual: "partial" },
    ],
  },
  {
    title: "Platform & Experience",
    icon: Sparkles,
    color: "#06B6D4",
    features: [
      { feature: "AI-assisted at every step", aiq: "full", lms: "partial", competency: "none", manual: "none" },
      { feature: "Single platform (strategy → report)", aiq: "full", lms: "none", competency: "none", manual: "none" },
      { feature: "Time to value (< 10 weeks)", aiq: "full", lms: "partial", competency: "partial", manual: "none" },
      { feature: "No implementation consultancy required", aiq: "full", lms: "partial", competency: "none", manual: "none" },
      { feature: "Continuous measurement (not point-in-time)", aiq: "full", lms: "none", competency: "none", manual: "none" },
      { feature: "Evidence-based (not self-report)", aiq: "full", lms: "none", competency: "none", manual: "none" },
    ],
  },
];

function CellIcon({ value }: { value: CellValue }) {
  if (value === "full") return <Check className="w-4.5 h-4.5 mx-auto" style={{ color: greenHex }} />;
  if (value === "partial") return <Minus className="w-4.5 h-4.5 mx-auto text-amber-400" />;
  if (value === "none") return <X className="w-4.5 h-4.5 mx-auto text-slate-600" />;
  return <span className="text-xs text-slate-400">{value}</span>;
}

export default function ComparePage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />

      {/* Hero */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ background: "rgba(34,197,94,0.1)", color: greenHex, border: "1px solid rgba(34,197,94,0.2)" }}>
            Comparison
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            Why AiQ is{" "}
            <span style={{ color: greenHex }}>fundamentally different</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8">
            Most organisations try to solve AI capability with tools designed for something else.
            Here's how AiQ compares to the alternatives HR teams typically consider.
          </p>

          {/* Legend */}
          <div className="inline-flex items-center gap-6 px-5 py-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4" style={{ color: greenHex }} />
              <span className="text-xs text-slate-300">Full support</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Minus className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-300">Partial / workaround</span>
            </div>
            <div className="flex items-center gap-1.5">
              <X className="w-4 h-4 text-slate-600" />
              <span className="text-xs text-slate-300">Not available</span>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Sticky header */}
          <div className="sticky top-16 z-40 rounded-xl mb-1 hidden md:grid grid-cols-[1fr_100px_100px_100px_100px] gap-0 p-4"
            style={{ background: "rgba(15,23,42,0.95)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-sm font-semibold text-slate-400">Feature</div>
            <div className="text-center">
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: greenHex }}>AiQ</span>
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-400">Generic LMS</span>
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-400">Competency Frameworks</span>
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-400">Manual Assessment</span>
            </div>
          </div>

          {/* Categories */}
          {CATEGORIES.map(({ title, icon: Icon, color, features }) => (
            <div key={title} className="mb-8">
              <div className="flex items-center gap-3 mb-3 px-4 pt-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <h3 className="text-base font-bold" style={{ color }}>{title}</h3>
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                {features.map((row, i) => (
                  <div key={row.feature}
                    className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_100px_100px] gap-0 px-4 py-3 items-center"
                    style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="text-sm text-slate-300 mb-2 md:mb-0">{row.feature}</div>
                    {/* Mobile labels */}
                    <div className="md:hidden grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-[9px] text-slate-500 mb-0.5">AiQ</p>
                        <CellIcon value={row.aiq} />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 mb-0.5">LMS</p>
                        <CellIcon value={row.lms} />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 mb-0.5">Comp.</p>
                        <CellIcon value={row.competency} />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 mb-0.5">Manual</p>
                        <CellIcon value={row.manual} />
                      </div>
                    </div>
                    {/* Desktop cells */}
                    <div className="hidden md:block text-center"><CellIcon value={row.aiq} /></div>
                    <div className="hidden md:block text-center"><CellIcon value={row.lms} /></div>
                    <div className="hidden md:block text-center"><CellIcon value={row.competency} /></div>
                    <div className="hidden md:block text-center"><CellIcon value={row.manual} /></div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Score summary */}
          <div className="mt-12 rounded-2xl p-8" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 className="text-lg font-bold text-white mb-6 text-center">Coverage summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { name: "AiQ", score: 37, total: 37, color: greenHex },
                { name: "Generic LMS", score: 7, total: 37, color: amber },
                { name: "Competency Frameworks", score: 6, total: 37, color: indigo },
                { name: "Manual Assessment", score: 5, total: 37, color: "#94A3B8" },
              ].map(({ name, score, total, color }) => {
                const pct = (score / total) * 100;
                return (
                  <div key={name} className="text-center">
                    <p className="text-xs font-semibold text-slate-400 mb-2">{name}</p>
                    <p className="text-3xl font-black mb-1" style={{ color }}>{score}/{total}</p>
                    <div className="w-full h-1.5 rounded-full overflow-hidden mx-auto max-w-24" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">features fully supported</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Why the gap exists */}
      <section className="pb-24 px-6" style={{ background: "rgba(255,255,255,0.01)" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">
            Why existing tools <span style={{ color: amber }}>fall short</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Generic LMS",
                icon: BookOpen,
                color: amber,
                problems: [
                  "Delivers content, doesn't measure capability",
                  "No connection between learning and business AI strategy",
                  "Completion ≠ competence",
                  "Can't adapt to individual gaps",
                ],
              },
              {
                title: "Competency Frameworks",
                icon: BarChart3,
                color: indigo,
                problems: [
                  "Static snapshots, not continuous measurement",
                  "Self-report bias (people overestimate)",
                  "No anti-gaming or evidence validation",
                  "Disconnected from development actions",
                ],
              },
              {
                title: "Manual Assessment",
                icon: Clock,
                color: "#94A3B8",
                problems: [
                  "Doesn't scale beyond 50 people",
                  "Subjective and inconsistent scoring",
                  "No real-time visibility for leaders",
                  "Months to produce a single report",
                ],
              },
            ].map(({ title, icon: Icon, color, problems }) => (
              <div key={title} className="rounded-xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="w-5 h-5" style={{ color }} />
                  <h3 className="font-bold text-white text-sm">{title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {problems.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-400/70" />
                      <span className="text-xs text-slate-400 leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-2xl p-10" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <Zap className="w-8 h-8 mx-auto mb-4" style={{ color: greenHex }} />
            <h2 className="text-2xl font-bold text-white mb-3">Ready to move beyond workarounds?</h2>
            <p className="text-slate-400 mb-6 max-w-lg mx-auto">
              AiQ replaces the patchwork of LMS, spreadsheets, and consultancy with a single intelligence platform purpose-built for HR AI capability.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/beta">
                <Button size="lg" className="gap-2 font-semibold px-6" style={{ background: greenHex, color: navy }}>
                  Apply for beta <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/roi-calculator">
                <Button size="lg" variant="outline" className="gap-2 font-semibold px-6 border-slate-600 text-slate-200 hover:text-white">
                  <TrendingUp className="w-4 h-4" /> Calculate your ROI
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
