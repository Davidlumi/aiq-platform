/**
 * AiQ How It Works Page — v6.0 (Skills Checker Self-Serve Launch)
 * 4-phase loop: Assess → Diagnose → Develop → Prove.
 * Strategy Builder section removed.
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "./MarketingPage";
import {
  ArrowRight, ChevronRight, Brain, Search, BookOpen,
  RefreshCw, Target, Shield, BarChart3, CheckCircle2,
  Sparkles, Layers, TrendingUp, Eye,
} from "lucide-react";

const navy     = "#0F172A";
const slate    = "#1E293B";
const chalk    = "#F8FAFC";
const border   = "rgba(255,255,255,0.08)";
const borderL  = "#E2E8F0";
const greenHex = "#22C55E";
const indigo   = "#6366F1";
const amber    = "#F59E0B";
const cyan     = "#06B6D4";
const pink     = "#EC4899";

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
            Assess. Diagnose.{" "}
            <span style={{ color: greenHex }}>Close. Prove.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto mb-4">
            AiQ is a continuous intelligence loop. It measures your AI capability, diagnoses specific gaps, closes them with targeted development, and proves the change with reassessment.
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Each cycle gets sharper. The measurement improves. The development gets more precise. The evidence chain gets stronger.
          </p>
        </div>
      </section>

      {/* Phase 1: Assess */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(99,102,241,0.12)" }}>
                  <Brain className="w-7 h-7" style={{ color: indigo }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: indigo }}>Phase 1</p>
                <h2 className="text-2xl font-bold mb-3" style={{ color: navy }}>Adaptive assessment</h2>
                <p className="text-5xl font-black" style={{ color: "rgba(99,102,241,0.08)", lineHeight: 1 }}>01</p>
              </div>
            </div>
            <div className="lg:col-span-8">
              <p className="text-slate-600 leading-relaxed mb-6">
                The assessment is 15 minutes of scenario-based questions calibrated to your role and seniority. It covers all six capability domains and adapts based on your responses — probing deeper where your judgement shows variance.
              </p>
              <p className="text-slate-600 leading-relaxed mb-6">
                This is not a quiz or a self-report survey. It presents real HR situations and asks what you would do. Anti-gaming detection catches strategic answering. The score reflects genuine capability.
              </p>
              <div className="rounded-xl border p-6 mb-6 bg-white" style={{ borderColor: borderL }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: indigo }}>Adaptive in three specific ways</p>
                <div className="flex flex-col gap-4">
                  {[
                    { title: "Role-calibrated", body: "Items are calibrated to your role and seniority — a Senior HRBP at a financial services firm doesn't see the same items as a Reward Specialist at a manufacturer." },
                    { title: "Variance-probing", body: "The system probes deeper on capabilities where you've shown variance, surfacing specifically where your judgement breaks down." },
                    { title: "Learning across sessions", body: "Across multiple sessions, the system learns your response patterns, so each subsequent assessment is more precise." },
                  ].map(({ title, body }) => (
                    <div key={title} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: indigo }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: navy }}>{title}</p>
                        <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border p-5" style={{ background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.2)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4" style={{ color: indigo }} />
                  <span className="text-xs font-semibold" style={{ color: indigo }}>Assessment engine</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-xl font-bold text-white">79+</p><p className="text-[10px] text-slate-500">Real-world scenarios</p></div>
                  <div><p className="text-xl font-bold text-white">6</p><p className="text-[10px] text-slate-500">Capability domains</p></div>
                  <div><p className="text-xl font-bold text-white">3</p><p className="text-[10px] text-slate-500">Adaptive dimensions</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 2: Diagnose */}
      <section style={{ background: navy }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(6,182,212,0.12)" }}>
                  <Search className="w-7 h-7" style={{ color: cyan }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: cyan }}>Phase 2</p>
                <h2 className="text-2xl font-bold mb-3 text-white">Specific diagnosis</h2>
                <p className="text-5xl font-black" style={{ color: "rgba(6,182,212,0.08)", lineHeight: 1 }}>02</p>
              </div>
            </div>
            <div className="lg:col-span-8">
              <p className="text-slate-300 leading-relaxed mb-6">
                Most assessment platforms produce numerical scores. AiQ produces diagnoses — articulated capability findings that explain the specific failure mode, the context where it surfaces, and what closing the gap requires.
              </p>
              <blockquote className="rounded-xl p-6 border-l-4 my-6" style={{ background: "rgba(6,182,212,0.06)", borderLeftColor: cyan }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: cyan }}>Example diagnosis</p>
                <p className="text-slate-300 text-sm leading-relaxed italic">
                  "Your AI Output Evaluation is driven primarily by strong performance on bias detection and weaker performance on hallucination recognition. This pattern suggests you are appropriately sceptical about the politics of AI outputs but more trusting about their factual claims. The pattern is common in HR generalists — and it matters because it affects your ability to use AI-generated candidate assessments reliably."
                </p>
              </blockquote>
              <p className="text-slate-400 leading-relaxed mb-6">
                The free tier gives you a headline score and names your weak domains. The paid tier gives you the full diagnostic narrative per domain — the specific failure mode, the pattern, and what to do about it.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Free", detail: "Headline score + named weak domains" },
                  { label: "Paid", detail: "Full diagnostic narrative per domain — specific failure mode, context, and what to do about it" },
                ].map(({ label, detail }) => (
                  <div key={label} className="flex items-start gap-3 rounded-lg p-4 border"
                    style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                      style={{ background: label === "Paid" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)", color: label === "Paid" ? greenHex : "#94a3b8" }}>
                      {label}
                    </span>
                    <p className="text-slate-300 text-sm">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 3: Develop */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(34,197,94,0.12)" }}>
                  <BookOpen className="w-7 h-7" style={{ color: greenHex }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: greenHex }}>Phase 3</p>
                <h2 className="text-2xl font-bold mb-3" style={{ color: navy }}>Targeted development</h2>
                <p className="text-5xl font-black" style={{ color: "rgba(34,197,94,0.08)", lineHeight: 1 }}>03</p>
              </div>
            </div>
            <div className="lg:col-span-8">
              <p className="text-slate-600 leading-relaxed mb-6">
                The learning programme is generated from your diagnostic — not selected from a generic catalogue. Each module addresses a specific failure mode identified in your assessment. The AI Coach provides conversational practice for the scenarios where your judgement is weakest.
              </p>
              <div className="rounded-xl border p-6 mb-6 bg-white" style={{ borderColor: borderL }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: greenHex }}>What the programme includes</p>
                <div className="flex flex-col gap-3">
                  {[
                    { title: "Targeted modules", body: "Short, scenario-based learning modules that address the specific failure modes in your diagnostic." },
                    { title: "AI Coach sessions", body: "Conversational practice with an AI Coach that presents the scenarios where your judgement is weakest." },
                    { title: "Spaced repetition", body: "The programme spaces learning across weeks to maximise retention and transfer to real work." },
                  ].map(({ title, body }) => (
                    <div key={title} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: greenHex }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: navy }}>{title}</p>
                        <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed border-l-2 pl-4" style={{ borderColor: borderL }}>
                The learning programme is a paid feature. Free users get their headline score and named weak domains — enough to know where to focus. Paid users get the full programme.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 4: Prove */}
      <section style={{ background: navy }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(236,72,153,0.12)" }}>
                  <TrendingUp className="w-7 h-7" style={{ color: pink }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: pink }}>Phase 4</p>
                <h2 className="text-2xl font-bold mb-3 text-white">Prove the change</h2>
                <p className="text-5xl font-black" style={{ color: "rgba(236,72,153,0.08)", lineHeight: 1 }}>04</p>
              </div>
            </div>
            <div className="lg:col-span-8">
              <p className="text-slate-300 leading-relaxed mb-6">
                Monthly reassessment measures whether capability actually changed — not whether the user completed a module. The score reflects genuine capability, not completion rate.
              </p>
              <p className="text-slate-400 leading-relaxed mb-6">
                This produces the evidence chain your performance review needs: the gap was X, the intervention was Y, the gap is now Z. Development investment is attributable to capability outcome. The loop is closed.
              </p>
              <div className="rounded-xl border p-6" style={{ background: "rgba(236,72,153,0.05)", borderColor: "rgba(236,72,153,0.2)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: pink }}>Evidence chain</p>
                <div className="flex flex-col gap-4">
                  {[
                    { step: "Gap identified", detail: "AI Output Evaluation — hallucination recognition (score: 4.2/10)" },
                    { step: "Intervention delivered", detail: "3 targeted modules + 2 AI Coach sessions over 4 weeks" },
                    { step: "Reassessment result", detail: "Hallucination recognition improved to 7.1/10 (+2.9 points)" },
                    { step: "Evidence produced", detail: "Development investment of 6 hours produced measurable capability change" },
                  ].map(({ step, detail }, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(236,72,153,0.12)" }}>
                        <span className="text-[10px] font-bold" style={{ color: pink }}>{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{step}</p>
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

      {/* CTA */}
      <section style={{ background: slate }} className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
            Ready to start the loop?
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-10">
            Free to start. 15 minutes. A precise capability score and a clear picture of what to do next.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="font-semibold px-8" style={{ background: greenHex, color: "white" }}>
                Check your skills — free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 px-8">
                See pricing <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
