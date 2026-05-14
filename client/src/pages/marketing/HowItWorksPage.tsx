/**
 * AiQ - How It Works page - v3.0
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "./MarketingPage";
import {
  ArrowRight, ChevronRight, Zap, Search, BookOpen,
  RefreshCw, Target, Shield, BarChart3, CheckCircle2,
} from "lucide-react";

const navy  = "#0F172A";
const slate = "#1E293B";
const chalk = "#F8FAFC";
const green = "var(--primary)";
const borderL = "#E2E8F0";
const borderD = "rgba(255,255,255,0.08)";

export default function HowItWorksPage() {
  const steps = [
    {
      num: "01",
      icon: Zap,
      label: "STEP ONE - ASSESS",
      title: "An adaptive assessment that probes actual capability",
      body: [
        "Each HR person takes a structured assessment generated for their specific role and seniority. The scenarios use real workflow contexts - workforce planning under uncertainty, AI-informed performance decisions, employee relations cases involving AI tools, governance questions where the right answer depends on judgement under pressure.",
        "The assessment is adaptive in three specific ways:",
      ],
      bullets: [
        "Items are calibrated to the user's role and seniority - a Senior HRBP at a financial services firm doesn't see the same items as a Reward Specialist at a manufacturer",
        "The system probes deeper on capabilities where the user has shown variance, surfacing specifically where their judgement breaks down rather than just confirming where it's strong",
        "Across multiple sessions, the system learns each user's response patterns, so each subsequent assessment is more precise about their actual capability",
      ],
      footnote: "This is fundamentally different from a one-time diagnostic. The measurement gets better the more your function uses the system.",
    },
    {
      num: "02",
      icon: Search,
      label: "STEP TWO - DIAGNOSE",
      title: "Specific gaps articulated, not just scores reported",
      body: [
        "Most assessment platforms produce numerical scores. AiQ produces diagnoses - articulated capability findings that explain the specific failure mode, the context where it surfaces, and what closing the gap requires.",
      ],
      quote: {
        text: "Your AI Output Evaluation is driven primarily by strong performance on bias detection and weaker performance on hallucination recognition. This pattern suggests you are appropriately sceptical about the politics of AI outputs but more trusting about their factual claims. The pattern is common in HR generalists - and it matters because Project Aurora's customer-facing decisions depend specifically on hallucination recognition.",
        label: "Example diagnosis",
      },
      footnote: "The diagnosis is what the development plan responds to. The diagnosis is what the manager conversation references. The diagnosis is the bridge between what the assessment measured and what the user does about it.",
    },
    {
      num: "03",
      icon: BookOpen,
      label: "STEP THREE - CLOSE",
      title: "Personalised development that closes the specific gap",
      body: [
        "Each user receives a development plan generated for them - not selected from a library. The plan addresses their specific diagnosed gaps, calibrated to their role context, sequenced so foundation capabilities are addressed before dependent ones, and bounded to respect their time.",
        "AiQ's development content is built on a hybrid model:",
      ],
      bullets: [
        "A curated content base produced by AiQ - modules written and reviewed by HR-AI subject matter experts, version-controlled, methodologically defensible",
        "Adaptive personalisation that calibrates each module to the specific user - the scenarios use their workflow context, the examples match their sector, the exercises probe the specific failure mode their assessment surfaced",
      ],
      footnote: "Development happens in the platform. Users don't have to switch to your existing LMS. The intervention, the practice, the application all happen where the assessment happened - so the loop closes cleanly.",
    },
    {
      num: "04",
      icon: RefreshCw,
      label: "STEP FOUR - REASSESS",
      title: "Measurable capability change, attributable to specific interventions",
      body: [
        "After development, the user reassesses. The system measures whether the gap that was diagnosed has closed. Not whether they completed the module - whether their capability changed.",
        "This produces the evidence chain your board needs: the gap was X, the intervention was Y, the gap is now Z. Development investment is attributable to capability outcome. The loop is closed.",
      ],
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />

      {/* Hero */}
      <section style={{ background: navy }} className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ background: "rgba(34,197,94,0.12)", color: green, border: "1px solid rgba(34,197,94,0.25)" }}>
            How AiQ works
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6" style={{ letterSpacing: "-0.02em" }}>
            Assess. Diagnose. Close. <span style={{ color: green }}>Reassess.</span>
          </h1>
          <p className="text-lg dark:text-slate-300 text-slate-700 leading-relaxed max-w-2xl mx-auto">
            AiQ is a continuous loop. Each cycle produces measurable capability change. Each cycle gets sharper than the last.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-20">
            {steps.map(({ num, icon: Icon, label, title, body, bullets, quote, footnote }, idx) => (
              <div key={num} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-3 flex flex-col items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: slate }}>
                    <Icon className="w-7 h-7" style={{ color: green }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: green }}>{label}</p>
                    <p className="text-5xl font-black" style={{ color: "rgba(255,255,255,0.06)", lineHeight: 1 }}>{num}</p>
                  </div>
                </div>
                <div className="lg:col-span-9">
                  <h2 className="text-2xl font-bold mb-5" style={{ color: navy, letterSpacing: "-0.01em" }}>{title}</h2>
                  {body.map((p, i) => (
                    <p key={i} className="text-slate-600 leading-relaxed mb-4">{p}</p>
                  ))}
                  {bullets && (
                    <div className="flex flex-col gap-3 mb-4 pl-2">
                      {bullets.map((b, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: green }} />
                          <p className="text-slate-600 text-sm leading-relaxed">{b}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {quote && (
                    <blockquote className="rounded-xl p-6 border-l-4 my-6"
                      style={{ background: "white", borderColor: green, borderLeftWidth: 4 }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: green }}>{quote.label}</p>
                      <p className="text-slate-700 text-sm leading-relaxed italic">"{quote.text}"</p>
                    </blockquote>
                  )}
                  {footnote && (
                    <p className="text-slate-500 text-sm leading-relaxed border-l-2 pl-4" style={{ borderColor: borderL }}>{footnote}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategic layer */}
      <section style={{ background: slate }} className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-8"
            style={{ background: "rgba(34,197,94,0.15)", color: green, border: "1px solid rgba(34,197,94,0.3)" }}>
            The strategic intelligence layer
          </div>
          <h2 className="text-3xl font-bold text-white mb-6" style={{ letterSpacing: "-0.02em" }}>
            The loop runs against your <span style={{ color: green }}>business AI roadmap.</span>
          </h2>
          <p className="dark:text-slate-300 text-slate-700 leading-relaxed mb-6">
            The four steps above describe what happens for each HR person. The strategic layer is what happens at function level.
          </p>
          <p className="dark:text-slate-400 text-slate-600 leading-relaxed mb-6">
            You capture your business's AI initiatives - the specific projects, timelines, and capability requirements.
            AiQ translates these into HR capability targets per role family per timeline. Every assessment, diagnosis,
            and development plan runs against those targets. Every reassessment updates the function-level view.
          </p>
          <p className="dark:text-slate-400 text-slate-600 leading-relaxed mb-10">
            The result is a live view of where your function is against where it needs to be, updated every time
            someone in your function completes an assessment or a development module.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              { icon: BarChart3, title: "Function-level readiness", body: "Current state against your business AI roadmap, with trajectory and projected closure date" },
              { icon: Target, title: "Per-initiative gap analysis", body: "Which business AI commitments are on track, which are at risk, and where the capability gap is concentrated" },
              { icon: Shield, title: "Board-ready exports", body: "Designed documents that translate function-level intelligence into briefing material your audience can read in five minutes" },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl p-6 border" style={{ background: "rgba(255,255,255,0.04)", borderColor: borderD }}>
                <Icon className="w-6 h-6 mb-4" style={{ color: green }} />
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/beta">
              <Button size="lg" className="font-semibold px-8" style={{ background: green, color: "white" }}>
                Apply for beta access <ArrowRight className="ml-2 h-4 w-4" />
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
