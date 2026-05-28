/**
 * AiQ - How It Works page - v5.0 (Full Platform Overhaul)
 * Matches the new marketing page depth and visual style.
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "./MarketingPage";
import {
  ArrowRight, ChevronRight, Zap, Search, BookOpen,
  RefreshCw, Target, Shield, BarChart3, CheckCircle2,
  Brain, MessageSquare, Sparkles, GitBranch, Layers,
  TrendingUp, Users, Lock, Eye, Compass,
} from "lucide-react";

const navy     = "#0F172A";
const slate    = "#1E293B";
const chalk    = "#F8FAFC";
const greenHex = "#22C55E";
const green    = "var(--primary)";
const indigo   = "#6366F1";
const amber    = "#F59E0B";
const cyan     = "#06B6D4";
const borderL  = "#E2E8F0";
const borderD  = "rgba(255,255,255,0.08)";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />

      {/* Hero */}
      <section className="pt-24 pb-20 px-6 relative overflow-hidden"
        style={{ background: `linear-gradient(180deg, ${navy} 0%, #0a1628 100%)` }}>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full opacity-8 pointer-events-none"
          style={{ background: "radial-gradient(circle, #22C55E 0%, transparent 70%)" }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ background: "rgba(34,197,94,0.12)", color: greenHex, border: "1px solid rgba(34,197,94,0.25)" }}>
            How AiQ works
          </div>
          <h1 className="text-4xl lg:text-6xl font-black text-white mb-6" style={{ letterSpacing: "-0.03em" }}>
            Strategy. Assess. Diagnose.{" "}
            <span style={{ color: greenHex }}>Close. Prove.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto mb-4">
            AiQ is a continuous intelligence loop. It starts with your AI strategy, measures capability against it,
            diagnoses specific gaps, closes them with targeted development, and proves the change with reassessment.
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Each cycle gets sharper. The measurement improves. The development gets more precise. The evidence chain gets stronger.
          </p>
        </div>
      </section>

      {/* The Loop Visual */}
      <section style={{ background: slate }} className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white mb-3" style={{ letterSpacing: "-0.02em" }}>
              The continuous intelligence loop
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">
              Five phases. One continuous cycle. Each feeds the next.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { num: "1", label: "Strategise", icon: Target, color: greenHex },
              { num: "2", label: "Assess", icon: Brain, color: indigo },
              { num: "3", label: "Diagnose", icon: Search, color: cyan },
              { num: "4", label: "Develop", icon: BookOpen, color: amber },
              { num: "5", label: "Prove", icon: RefreshCw, color: "#EC4899" },
            ].map(({ num, label, icon: Icon, color }, idx) => (
              <div key={num} className="relative">
                <div className="rounded-xl p-5 border text-center"
                  style={{ background: "rgba(255,255,255,0.03)", borderColor: `${color}30` }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3"
                    style={{ background: `${color}15` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Phase {num}</p>
                </div>
                {idx < 4 && (
                  <div className="hidden md:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw className="w-3 h-3" />
              <span>Loop repeats — each cycle is more precise than the last</span>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 1: Strategy */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(34,197,94,0.12)" }}>
                  <Target className="w-7 h-7" style={{ color: greenHex }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: greenHex }}>Phase 1</p>
                <h2 className="text-2xl font-bold mb-3" style={{ color: navy }}>Build your AI strategy</h2>
                <p className="text-5xl font-black" style={{ color: "rgba(34,197,94,0.08)", lineHeight: 1 }}>01</p>
              </div>
            </div>
            <div className="lg:col-span-8">
              <p className="text-slate-600 leading-relaxed mb-6">
                Before you can measure capability, you need to know what capability you need. AiQ's 10-stage Strategy Builder
                guides you from diagnostic through to board-ready output — with AI suggesting at every step and you deciding.
              </p>
              <p className="text-slate-600 leading-relaxed mb-6">
                The strategy defines your AI ambition, your principles and boundaries, your chosen initiatives (from a library of 68 scored options),
                your success measures, and your investment case. It produces the targets that everything else in the platform measures against.
              </p>
              <div className="rounded-xl border p-6 mb-6 bg-white" style={{ borderColor: borderL }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: greenHex }}>10-stage process</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Company Diagnostic", "Vision & Ambition", "Strategic Posture",
                    "Principles & Boundaries", "Initiative Selection", "Success Measures",
                    "Business Case", "Capability Assessment", "Stakeholder Review", "Board Report"
                  ].map((stage, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                        style={{ background: "rgba(34,197,94,0.12)", color: greenHex }}>{i + 1}</span>
                      <span className="text-xs text-slate-600">{stage}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mb-6">
                <div className="rounded-lg px-4 py-2 border" style={{ borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.05)" }}>
                  <p className="text-xs font-semibold" style={{ color: greenHex }}>CPO / HR Leader Mode</p>
                  <p className="text-[10px] text-slate-500">Full function strategy</p>
                </div>
                <div className="rounded-lg px-4 py-2 border" style={{ borderColor: "rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.05)" }}>
                  <p className="text-xs font-semibold" style={{ color: indigo }}>Reward Mode</p>
                  <p className="text-[10px] text-slate-500">Compensation & benefits focus</p>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed border-l-2 pl-4" style={{ borderColor: borderL }}>
                AI Suggest is available at every stage — it drafts, you decide. Peer vision starters show how other organisations have approached the same questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 2: Assess */}
      <section style={{ background: navy }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(99,102,241,0.12)" }}>
                  <Brain className="w-7 h-7" style={{ color: indigo }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: indigo }}>Phase 2</p>
                <h2 className="text-2xl font-bold text-white mb-3">Adaptive assessment</h2>
                <p className="text-5xl font-black" style={{ color: "rgba(99,102,241,0.1)", lineHeight: 1 }}>02</p>
              </div>
            </div>
            <div className="lg:col-span-8">
              <p className="text-slate-300 leading-relaxed mb-6">
                Each HR person takes a structured assessment generated for their specific role and seniority. The scenarios use real workflow contexts —
                workforce planning under uncertainty, AI-informed performance decisions, employee relations cases involving AI tools, governance questions where the right answer depends on judgement under pressure.
              </p>
              <p className="text-slate-300 leading-relaxed mb-6">
                The assessment is adaptive in three specific ways:
              </p>
              <div className="flex flex-col gap-4 mb-6">
                {[
                  { title: "Role-calibrated", body: "Items are calibrated to the user's role and seniority — a Senior HRBP at a financial services firm doesn't see the same items as a Reward Specialist at a manufacturer" },
                  { title: "Variance-probing", body: "The system probes deeper on capabilities where the user has shown variance, surfacing specifically where their judgement breaks down" },
                  { title: "Learning across sessions", body: "Across multiple sessions, the system learns each user's response patterns, so each subsequent assessment is more precise" },
                ].map(({ title, body }) => (
                  <div key={title} className="rounded-lg p-4 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: borderD }}>
                    <p className="text-sm font-semibold text-white mb-1">{title}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border p-5" style={{ background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.2)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4" style={{ color: indigo }} />
                  <span className="text-xs font-semibold" style={{ color: indigo }}>Assessment engine</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-white">79+</p>
                    <p className="text-[10px] text-slate-500">Real-world scenarios</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">6</p>
                    <p className="text-[10px] text-slate-500">Capability domains</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">3</p>
                    <p className="text-[10px] text-slate-500">Adaptive dimensions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 3: Diagnose */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(6,182,212,0.12)" }}>
                  <Search className="w-7 h-7" style={{ color: cyan }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: cyan }}>Phase 3</p>
                <h2 className="text-2xl font-bold mb-3" style={{ color: navy }}>Specific diagnosis</h2>
                <p className="text-5xl font-black" style={{ color: "rgba(6,182,212,0.08)", lineHeight: 1 }}>03</p>
              </div>
            </div>
            <div className="lg:col-span-8">
              <p className="text-slate-600 leading-relaxed mb-6">
                Most assessment platforms produce numerical scores. AiQ produces diagnoses — articulated capability findings that explain the specific failure mode, the context where it surfaces, and what closing the gap requires.
              </p>
              <blockquote className="rounded-xl p-6 border-l-4 my-6 bg-white shadow-sm"
                style={{ borderLeftColor: cyan }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: cyan }}>Example diagnosis</p>
                <p className="text-slate-700 text-sm leading-relaxed italic">
                  "Your AI Output Evaluation is driven primarily by strong performance on bias detection and weaker performance on hallucination recognition. This pattern suggests you are appropriately sceptical about the politics of AI outputs but more trusting about their factual claims. The pattern is common in HR generalists — and it matters because Project Aurora's customer-facing decisions depend specifically on hallucination recognition."
                </p>
              </blockquote>
              <p className="text-slate-600 leading-relaxed mb-6">
                The diagnosis is what the development plan responds to. The diagnosis is what the manager conversation references.
                The diagnosis is the bridge between what the assessment measured and what the user does about it.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  "Articulated findings, not just scores",
                  "Specific failure modes identified per domain",
                  "Context-aware — references the user's role and business AI initiatives",
                  "Feeds directly into personalised development plan",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: cyan }} />
                    <p className="text-slate-600 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 4: Develop */}
      <section style={{ background: navy }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(245,158,11,0.12)" }}>
                  <BookOpen className="w-7 h-7" style={{ color: amber }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: amber }}>Phase 4</p>
                <h2 className="text-2xl font-bold text-white mb-3">Targeted development</h2>
                <p className="text-5xl font-black" style={{ color: "rgba(245,158,11,0.08)", lineHeight: 1 }}>04</p>
              </div>
            </div>
            <div className="lg:col-span-8">
              <p className="text-slate-300 leading-relaxed mb-6">
                Each user receives a development plan generated for them — not selected from a library. The plan addresses their specific diagnosed gaps, calibrated to their role context, sequenced so foundation capabilities are addressed before dependent ones, and bounded to respect their time.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl p-5 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: borderD }}>
                  <MessageSquare className="w-5 h-5 mb-3" style={{ color: amber }} />
                  <h3 className="text-white font-semibold text-sm mb-2">AI Coach</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">Context-aware guidance that understands the user's profile, gaps, and learning progress. Not a generic chatbot.</p>
                </div>
                <div className="rounded-xl p-5 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: borderD }}>
                  <BookOpen className="w-5 h-5 mb-3" style={{ color: amber }} />
                  <h3 className="text-white font-semibold text-sm mb-2">Learning Pathways</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">Domain-specific modules curated by HR-AI subject matter experts, personalised to each user's specific failure modes.</p>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed mb-6">
                AiQ's development content is built on a hybrid model: a curated content base produced by subject matter experts, plus adaptive personalisation that calibrates each module to the specific user — the scenarios use their workflow context, the examples match their sector, the exercises probe the specific failure mode their assessment surfaced.
              </p>
              <p className="text-slate-500 text-sm leading-relaxed border-l-2 pl-4" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
                Development happens in the platform. Users don't have to switch to your existing LMS. The intervention, the practice, the application all happen where the assessment happened — so the loop closes cleanly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 5: Prove */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(236,72,153,0.12)" }}>
                  <RefreshCw className="w-7 h-7" style={{ color: "#EC4899" }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#EC4899" }}>Phase 5</p>
                <h2 className="text-2xl font-bold mb-3" style={{ color: navy }}>Prove the change</h2>
                <p className="text-5xl font-black" style={{ color: "rgba(236,72,153,0.08)", lineHeight: 1 }}>05</p>
              </div>
            </div>
            <div className="lg:col-span-8">
              <p className="text-slate-600 leading-relaxed mb-6">
                After development, the user reassesses. The system measures whether the gap that was diagnosed has closed.
                Not whether they completed the module — whether their capability changed.
              </p>
              <p className="text-slate-600 leading-relaxed mb-6">
                This produces the evidence chain your board needs: the gap was X, the intervention was Y, the gap is now Z.
                Development investment is attributable to capability outcome. The loop is closed.
              </p>
              <div className="rounded-xl border p-6 bg-white shadow-sm" style={{ borderColor: borderL }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#EC4899" }}>Evidence chain</p>
                <div className="flex flex-col gap-4">
                  {[
                    { step: "Gap identified", detail: "AI Output Evaluation — hallucination recognition (score: 4.2/10)" },
                    { step: "Intervention delivered", detail: "3 targeted modules + 2 AI Coach sessions over 4 weeks" },
                    { step: "Reassessment result", detail: "Hallucination recognition improved to 7.1/10 (+2.9 points)" },
                    { step: "Board attribution", detail: "Development investment of 6 hours produced measurable capability change" },
                  ].map(({ step, detail }, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(236,72,153,0.12)" }}>
                        <span className="text-[10px] font-bold" style={{ color: "#EC4899" }}>{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: navy }}>{step}</p>
                        <p className="text-xs text-slate-500">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic layer */}
      <section style={{ background: slate }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
              style={{ background: "rgba(34,197,94,0.15)", color: greenHex, border: "1px solid rgba(34,197,94,0.3)" }}>
              The strategic intelligence layer
            </div>
            <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
              The loop runs against your{" "}
              <span style={{ color: greenHex }}>business AI roadmap.</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              The five phases above describe what happens for each HR person. The strategic layer is what happens at function level — connecting individual capability to business AI commitments.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: BarChart3, title: "Function-level readiness", body: "Current state against your business AI roadmap, with trajectory and projected closure date for each commitment" },
              { icon: Target, title: "Per-initiative gap analysis", body: "Which business AI commitments are on track, which are at risk, and where the capability gap is concentrated" },
              { icon: Shield, title: "Board-ready exports", body: "Designed documents that translate function-level intelligence into briefing material your audience can read in five minutes" },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl p-6 border" style={{ background: "rgba(255,255,255,0.04)", borderColor: borderD }}>
                <Icon className="w-6 h-6 mb-4" style={{ color: greenHex }} />
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/beta">
                <Button size="lg" className="font-semibold px-8" style={{ background: greenHex, color: "white" }}>
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
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
