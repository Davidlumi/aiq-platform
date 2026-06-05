/**
 * AiQ - The Product page - v5.0 (Full Platform Overhaul)
 * Matches the new marketing page depth and visual style.
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "./MarketingPage";
import {
  ArrowRight, Users, BarChart3, Target, Shield, FileText,
  XCircle, CheckCircle2, ChevronRight, Brain, MessageSquare,
  BookOpen, Sparkles, TrendingUp, Layers, GitBranch,
  Lock, Zap, Award, LineChart, Eye, Compass, Building2,
} from "lucide-react";

const navy    = "#0F172A";
const slate   = "#1E293B";
const chalk   = "#F8FAFC";
const greenHex = "#22C55E";
const green   = "var(--primary)";
const indigo  = "#6366F1";
const amber   = "#F59E0B";
const cyan    = "#06B6D4";
const borderL = "#E2E8F0";
const borderD = "rgba(255,255,255,0.08)";

export default function ProductPage() {
  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />

      {/* Hero */}
      <section className="pt-24 pb-20 px-6 relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${navy} 0%, #0a1628 100%)` }}>
        <div className="absolute top-20 right-1/4 w-80 h-80 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #22C55E 0%, transparent 70%)" }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ background: "rgba(34,197,94,0.12)", color: greenHex, border: "1px solid rgba(34,197,94,0.25)" }}>
            The platform
          </div>
          <h1 className="text-4xl lg:text-6xl font-black text-white mb-6" style={{ letterSpacing: "-0.03em" }}>
            Strategy. Measurement. Development.{" "}
            <span style={{ color: greenHex }}>All in one loop.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto mb-4">
            AiQ connects your AI strategy to actual capability measurement, personalised development,
            and board-grade evidence — in a continuous loop that gets smarter with every cycle.
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto mb-10">
            Three views — <strong className="text-white">Individual</strong>, <strong className="text-white">Manager</strong>, and <strong className="text-white">Leader</strong> — each answering a different question, all connected to the same live intelligence.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/beta">
              <Button size="lg" className="font-semibold px-8" style={{ background: greenHex, color: "white" }}>
                Join the beta programme for free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 px-8">
                Watch demo <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Platform Architecture Overview */}
      <section style={{ background: slate }} className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
              Seven integrated modules.{" "}
              <span style={{ color: greenHex }}>One intelligence system.</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Each module feeds the others. Strategy informs assessment targets. Assessment reveals gaps. Gaps drive development. Development produces measurable change. Change updates the board report.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Target, color: greenHex, label: "AI Strategy Builder", sub: "11-stage guided process" },
              { icon: Brain, color: indigo, label: "Adaptive Assessment", sub: "79+ real-world scenarios" },
              { icon: MessageSquare, color: cyan, label: "AI Coach", sub: "Context-aware guidance" },
              { icon: BookOpen, color: amber, label: "Learning & Development", sub: "Gap-targeted plans" },
              { icon: Users, color: "#EC4899", label: "Team Intelligence", sub: "Manager & leader views" },
              { icon: FileText, color: "#8B5CF6", label: "Board Reporting", sub: "Evidence-grade outputs" },
              { icon: Layers, color: "#F97316", label: "Initiative Library", sub: "68 scored AI initiatives" },
            ].map(({ icon: Icon, color, label, sub }) => (
              <div key={label} className="rounded-xl p-5 border hover:border-green-500/30 transition-colors"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: borderD }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">{label}</h3>
                <p className="text-slate-500 text-xs">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Strategy Builder Deep Dive */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
                style={{ background: "rgba(34,197,94,0.12)", color: greenHex, border: "1px solid rgba(34,197,94,0.25)" }}>
                <Sparkles className="w-3 h-3" /> AI-assisted at every stage
              </div>
              <h2 className="text-3xl font-bold mb-6" style={{ color: navy, letterSpacing: "-0.02em" }}>
                Build your AI strategy in{" "}
                <span style={{ color: greenHex }}>11 guided stages.</span>
              </h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                Not a blank canvas. Not a template. A structured process that builds from diagnostic through to
                board-ready output — with AI suggesting at every step and you deciding.
              </p>
              <div className="flex flex-col gap-3 mb-8">
                {[
                  "Company diagnostic and AI readiness assessment",
                  "Vision definition with peer inspiration library",
                  "Strategic archetype selection (5 postures)",
                  "Principles and won't-do boundaries",
                  "Initiative selection from 68 scored options",
                  "Success measures and outcome criteria",
                  "Investment business case generation",
                  "Capability assessment across 6 domains",
                  "Stakeholder review with tension analysis",
                  "Board-ready report with full evidence chain",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
                      <span className="text-[10px] font-bold" style={{ color: greenHex }}>{i + 1}</span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="rounded-lg px-4 py-2 border" style={{ borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.05)" }}>
                  <p className="text-xs font-semibold" style={{ color: greenHex }}>CPO Mode</p>
                  <p className="text-xs text-slate-500">50 initiatives</p>
                </div>
                <div className="rounded-lg px-4 py-2 border" style={{ borderColor: "rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.05)" }}>
                  <p className="text-xs font-semibold" style={{ color: indigo }}>Reward Mode</p>
                  <p className="text-xs text-slate-500">52 initiatives</p>
                </div>
              </div>
            </div>
            {/* Strategy mockup */}
            <div className="rounded-2xl border p-6 shadow-xl" style={{ background: navy, borderColor: "rgba(34,197,94,0.2)" }}>
              <div className="flex items-center gap-2 mb-5">
                <Target className="w-4 h-4" style={{ color: greenHex }} />
                <span className="text-white text-sm font-semibold">Strategy Builder — Stage 5: Initiatives</span>
              </div>
              <div className="flex flex-col gap-3 mb-5">
                {[
                  { name: "AI-powered job evaluation", score: 87, tag: "Quick win" },
                  { name: "Predictive pay equity modelling", score: 82, tag: "Strategic" },
                  { name: "Automated market benchmarking", score: 79, tag: "Quick win" },
                  { name: "AI benefits personalisation", score: 74, tag: "Horizon 2" },
                ].map(({ name, score, tag }) => (
                  <div key={name} className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <p className="text-white text-sm font-medium">{name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
                        style={{ background: "rgba(34,197,94,0.12)", color: greenHex }}>{tag}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: greenHex }}>{score}</p>
                      <p className="text-[10px] text-slate-500">fit score</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>4 of 52 initiatives selected</span>
                <span style={{ color: greenHex }}>AI Suggest available</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Individual view */}
      <section style={{ background: navy }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.15)" }}>
                  <Users className="w-5 h-5" style={{ color: cyan }} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: cyan }}>Individual view</p>
                  <h2 className="font-bold text-xl text-white">What every HR person sees</h2>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed mb-6">
                Every HR person in your function has their own view. It shows them where they are now,
                what their specific gaps are, how they compare against anonymous peers in the same role,
                and what they're working on next.
              </p>
              <p className="text-slate-400 leading-relaxed mb-8">
                Their development plan is personalised to them — not selected from a catalogue, generated
                for their specific diagnosed gaps, role context, and seniority. Their AI Coach understands
                their profile and provides contextual guidance. Their reassessment shows whether the work is paying off.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  "Adaptive assessment across six capability domains",
                  "Personalised AI Coach with full profile context",
                  "Gap-targeted learning plan — sequenced and calibrated",
                  "Anonymous percentile context against role peers",
                  "Reassessment showing measurable capability change",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: cyan }} />
                    <p className="text-slate-400 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border p-6" style={{ background: "rgba(255,255,255,0.03)", borderColor: borderD }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: cyan }}>Individual dashboard</p>
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">Overall AI Readiness</span>
                  <span className="text-2xl font-black text-white">7.2 <span className="text-sm font-normal text-slate-400">/ 10</span></span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full" style={{ width: "72%", background: greenHex }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-500">Foundation</span>
                  <span className="text-xs font-medium" style={{ color: greenHex }}>72nd percentile for Senior HRBP</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 mb-5">
                {[
                  { domain: "AI Interaction", score: 8.1, pct: 81 },
                  { domain: "AI Output Evaluation", score: 6.4, pct: 64 },
                  { domain: "AI Workflow Design", score: 7.8, pct: 78 },
                  { domain: "Workforce AI Readiness", score: 6.9, pct: 69 },
                  { domain: "AI Ethics & Trust", score: 7.5, pct: 75 },
                  { domain: "AI Change Leadership", score: 6.8, pct: 68 },
                ].map(({ domain, score, pct }) => (
                  <div key={domain}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-400">{domain}</span>
                      <span className="text-xs font-semibold text-white">{score}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: greenHex, opacity: 0.7 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg p-4 border-l-4" style={{ background: "rgba(249,115,22,0.08)", borderColor: "#F97316" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#FB923C" }}>Priority gap: AI Output Evaluation</p>
                <p className="text-xs text-slate-400 leading-relaxed">Strong on bias detection, weaker on hallucination recognition in high-stakes workforce decisions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Manager view */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div className="order-2 lg:order-1 rounded-2xl border p-6 shadow-lg" style={{ background: "white", borderColor: borderL }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: "#047857" }}>Manager dashboard</p>
              <div className="flex flex-col gap-3">
                {[
                  { name: "Sarah Chen", role: "Senior HRBP", score: 7.2, status: "Progressing", color: "#047857" },
                  { name: "James Okafor", role: "Reward Specialist", score: 5.8, status: "Developing", color: "#D97706" },
                  { name: "Priya Patel", role: "L&D Manager", score: 8.4, status: "AI-Ready", color: greenHex },
                  { name: "Tom Bradley", role: "HR Business Partner", score: 4.9, status: "Foundation gap", color: "#DC2626" },
                ].map(({ name, role, score, status, color }) => (
                  <div key={name} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: borderL }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: navy }}>{name}</p>
                      <p className="text-slate-500 text-xs">{role}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold" style={{ color: navy }}>{score}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}15`, color }}>{status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg p-4 border-l-4" style={{ background: "#F0FDF4", borderColor: greenHex }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#047857" }}>1:1 prompt — Tom Bradley</p>
                <p className="text-xs text-slate-600 leading-relaxed">Foundation gap in AI Output Evaluation. Discuss the hallucination recognition module before Project Aurora kickoff.</p>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#04785718" }}>
                  <BarChart3 className="w-5 h-5" style={{ color: "#047857" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#047857" }}>Manager view</p>
                  <h2 className="font-bold text-xl" style={{ color: navy }}>What every line manager sees</h2>
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed mb-6">
                Every line manager sees their team's capability state — who's where, who's progressing,
                who's stalled, and what's worth discussing in next week's 1:1s.
              </p>
              <p className="text-slate-500 leading-relaxed mb-8">
                Not a heatmap. A briefing. Specific conversation prompts surface the development context
                that matters — the gap that's relevant to the project they're about to kick off, the
                module that's sitting incomplete, the reassessment that's showing the gap isn't closing.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  "Team capability heatmap across all six domains",
                  "Individual progress tracking — who's developing, who's stalled",
                  "1:1 conversation prompts calibrated to each person's context",
                  "Team-level gap against business AI initiative requirements",
                  "Full audit logging on every drill-down",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#047857" }} />
                    <p className="text-slate-600 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leader view */}
      <section style={{ background: navy }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                  <Target className="w-5 h-5" style={{ color: greenHex }} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: greenHex }}>Leader view</p>
                  <h2 className="font-bold text-xl text-white">What you see</h2>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed mb-6">
                The function-level view is built for the CPO. It shows where your function is against
                where it needs to be, updated continuously, with the strategic intelligence your CEO
                is asking for.
              </p>
              <p className="text-slate-400 leading-relaxed mb-8">
                You configure your business's AI initiatives — the specific projects, timelines, and
                capability requirements. AiQ translates these into HR capability targets and shows
                you the gap, the rate of closure, and the projected closure date for each commitment.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  "Function-level readiness against your business AI roadmap",
                  "Per-initiative gap analysis with trajectory and projected closure date",
                  "Development investment efficiency — which interventions produce measurable change",
                  "Regulatory exposure brief — capability gaps that affect specific regulatory commitments",
                  "Board-ready export artefacts designed for executive committee use",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: greenHex }} />
                    <p className="text-slate-400 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border p-6" style={{ background: "rgba(255,255,255,0.03)", borderColor: borderD }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: greenHex }}>Strategic intelligence view</p>
              <div className="mb-5">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold text-white">Project Aurora readiness</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(217,119,6,0.15)", color: amber }}>At risk</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full" style={{ width: "67%", background: "#D97706" }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-500">67% of target</span>
                  <span className="text-xs text-slate-500">Target: Q3 2027</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 mb-5">
                {[
                  { label: "Current pace closure", value: "Q2 2027", good: true },
                  { label: "Risk concentration", value: "Senior HRBPs — Workflow Design", good: false },
                  { label: "Stalled individuals", value: "3 of 24 assessed", good: false },
                  { label: "Development ROI", value: "0.8 pts per module completed", good: true },
                ].map(({ label, value, good }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b" style={{ borderColor: borderD }}>
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-xs font-semibold" style={{ color: good ? greenHex : "#F87171" }}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg p-4 border-l-4" style={{ background: "rgba(34,197,94,0.05)", borderColor: greenHex }}>
                <p className="text-xs font-semibold mb-1 text-white">Board finding</p>
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  "At current pace, Project Aurora capability requirement will be met by Q2 2027 — one quarter early.
                  Remaining risk is concentrated in workflow design among Senior HRBPs."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Coach & Learning */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4" style={{ color: navy, letterSpacing: "-0.02em" }}>
              Development that{" "}
              <span style={{ color: indigo }}>closes gaps, not just fills time.</span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Every development intervention in AiQ is preceded by a measurement that identifies the specific gap it's designed to close. And followed by a reassessment that proves whether it worked.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border p-7 bg-white" style={{ borderColor: borderL }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: "rgba(99,102,241,0.12)" }}>
                <MessageSquare className="w-6 h-6" style={{ color: indigo }} />
              </div>
              <h3 className="font-bold text-lg mb-3" style={{ color: navy }}>AI Coach</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Every user gets an AI coach that understands their capability profile, learning progress, role context, and development goals. Not a generic chatbot — a contextual guide that accelerates capability growth.
              </p>
              <div className="flex flex-col gap-2">
                {["Full profile context in every conversation", "Development goal tracking", "Scenario practice and feedback", "Connected to assessment findings"].map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: indigo }} />
                    <span className="text-xs text-slate-600">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border p-7 bg-white" style={{ borderColor: borderL }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: "rgba(245,158,11,0.12)" }}>
                <BookOpen className="w-6 h-6" style={{ color: amber }} />
              </div>
              <h3 className="font-bold text-lg mb-3" style={{ color: navy }}>Learning & Development</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Personalised learning plans generated from assessment gaps. Domain pathways, curated modules, and progress tracking — all connected to measurable capability change through reassessment.
              </p>
              <div className="flex flex-col gap-2">
                {["Gap-targeted content selection", "Domain-specific pathways", "Progress tracking with milestones", "Reassessment proves what worked"].map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: amber }} />
                    <span className="text-xs text-slate-600">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Board Exports */}
      <section style={{ background: slate }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6" style={{ color: greenHex }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: greenHex }}>Board reporting</p>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
              Board-ready artefacts.{" "}
              <span style={{ color: greenHex }}>Evidence, not estimates.</span>
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Every dashboard zone produces shareable export artefacts designed for board and executive committee use.
              Not screenshots — designed documents that translate function-level intelligence into
              briefing material your audience can read in five minutes and forward without explanation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[
              { title: "Function readiness summary", body: "Current state against business AI roadmap, with trajectory and projected closure dates" },
              { title: "Regulatory exposure brief", body: "Capability gaps that affect specific regulatory commitments — FCA, ICO, Equality Act" },
              { title: "Strategic mismatch report", body: "Where capability is misaligned with business AI strategy and the implications" },
              { title: "Investment efficiency review", body: "Which development investment is producing measurable change and which isn't" },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-xl p-6 border" style={{ background: "rgba(255,255,255,0.04)", borderColor: borderD }}>
                <Shield className="w-5 h-5 mb-3" style={{ color: greenHex }} />
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-sm">Each export is footer-stamped with version and date, methodology disclosures included, designed to survive scrutiny by anyone who reads it.</p>
        </div>
      </section>

      {/* What AiQ does not do */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: navy, letterSpacing: "-0.02em" }}>
              Honest about{" "}
              <span style={{ color: "#DC2626" }}>the boundary.</span>
            </h2>
            <p className="text-slate-600 leading-relaxed">
              AiQ measures HR people's AI capability and closes the gaps it identifies. It deliberately does not do
              several things that adjacent products do, and we think being explicit about this is part of what makes
              the product trustworthy.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            {[
              "AiQ does not assess AI capability across non-HR roles. It is built for HR functions specifically.",
              "AiQ does not replace your performance management system or your existing learning platforms. It is the diagnostic intelligence layer above them.",
              "AiQ does not predict who will succeed or who should be promoted. The methodology refuses to make predictive claims about individuals.",
              "AiQ does not produce comparative rankings of named individuals. The architecture forbids this.",
              "AiQ does not currently support multi-jurisdiction regulatory contexts. UK regulatory translation is built; international expansion is on the roadmap.",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-xl border bg-white" style={{ borderColor: borderL }}>
                <XCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#DC2626" }} />
                <p className="text-slate-600 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a2e1a 0%, #0F172A 40%, #0a2e1a 100%)" }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div className="w-96 h-96 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #22C55E 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>See it for yourself.</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Beta partners get full platform access plus direct access to the team building it.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            The conversation starts with understanding your specific situation — whether AiQ is right for you depends
            on your function size, your business AI commitments, and your appetite for working with a product that's still maturing.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/beta">
              <Button size="lg" className="font-semibold px-10" style={{ background: greenHex, color: "white" }}>
                Join the beta programme for free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/methodology">
              <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 px-8">
                Read the methodology <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
