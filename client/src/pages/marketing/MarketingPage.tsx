/**
 * AiQ Marketing Home Page — v3.0
 * Copy: AiQ_Marketing_Site_Copy_v3.docx
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ChevronRight, Target, TrendingUp, BarChart3,
  Users, Shield, Zap, BookOpen, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const navy   = "#0F172A";
const slate  = "#1E293B";
const chalk  = "#F8FAFC";
const muted  = "#64748B";
const border = "rgba(255,255,255,0.08)";
const borderL = "#E2E8F0";
const green  = "var(--primary)";

// ─── Shared components ────────────────────────────────────────────────────────
function AiQLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="AiQ">
      <circle cx="100" cy="100" r="90" fill={slate} />
      <text x="100" y="120" fontFamily="system-ui,-apple-system,sans-serif"
        fontSize="64" fontWeight="800" fill="white" textAnchor="middle" letterSpacing="-3">
        A<tspan fill={green}>i</tspan>Q
      </text>
      <path d="M 60 135 Q 100 150 140 135" stroke={green} strokeWidth="5"
        fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b h-16 flex items-center px-6"
      style={{ background: navy, borderColor: border }}>
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <AiQLogo size={30} />
            <span className="font-bold text-white text-lg tracking-tight">AiQ</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(34,197,94,0.15)", color: green, border: "1px solid rgba(34,197,94,0.3)" }}>
              Beta
            </span>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {([
            ["How it works", "/how-it-works"],
            ["The product", "/product"],
            ["Methodology", "/methodology"],
            ["About", "/about"],
          ] as [string, string][]).map(([label, href]) => (
            <Link key={href} href={href}>
              <span className="text-slate-300 hover:text-white text-sm transition-colors cursor-pointer">{label}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10">Sign in</Button>
          </Link>
          <Link href="/beta">
            <Button size="sm" className="font-semibold" style={{ background: green, color: "white" }}>Apply for beta</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer style={{ background: navy, borderTop: `1px solid ${border}` }} className="pt-16 pb-8 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <AiQLogo size={28} />
              <span className="font-bold text-white text-lg">AiQ</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">AI capability intelligence for HR functions delivering transformation.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Product</h4>
            <div className="flex flex-col gap-3">
              {([["How it works", "/how-it-works"], ["The product", "/product"], ["Methodology", "/methodology"], ["Beta programme", "/beta"]] as [string,string][]).map(([l, h]) => (
                <Link key={h} href={h}><span className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer">{l}</span></Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Company</h4>
            <div className="flex flex-col gap-3">
              {([["About", "/about"], ["Contact", "/about#contact"]] as [string,string][]).map(([l, h]) => (
                <Link key={h} href={h}><span className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer">{l}</span></Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Legal</h4>
            <div className="flex flex-col gap-3">
              {["Privacy policy", "Data processing addendum", "Accessibility statement", "Terms of service"].map((l) => (
                <span key={l} className="text-slate-400 text-sm cursor-pointer hover:text-white transition-colors">{l}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: border }}>
          <p className="text-slate-500 text-sm">© 2026 AiQ Ltd. Registered in England and Wales.</p>
          <p className="text-slate-500 text-sm">AiQ is a trading name of AiQ Ltd.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page sections ────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{ background: navy }} className="pt-24 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
              style={{ background: "rgba(34,197,94,0.12)", color: green, border: "1px solid rgba(34,197,94,0.25)" }}>
              Free beta programme — small cohort of UK CPOs
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6" style={{ letterSpacing: "-0.02em" }}>
              Your CEO keeps asking if HR is ready for AI.{" "}
              <span style={{ color: green }}>You keep saying yes.</span>
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-4">
              AiQ is the evidence behind an honest answer — and the platform that closes the gap when the answer is no.
            </p>
            <p className="text-slate-400 leading-relaxed mb-10">
              AiQ measures whether your HR function can deliver the AI capability your business is committing to,
              identifies the specific gaps at individual, team, and function level, and closes them through
              personalised development. So the next time your CEO asks, you have evidence — not estimates.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/beta">
                <Button size="lg" className="font-semibold px-8" style={{ background: green, color: "white" }}>
                  Apply for the beta <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline" className="font-semibold px-8 text-white border-white/20 hover:bg-white/10">
                  How AiQ works <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          {/* Product mockup */}
          <div className="hidden lg:block">
            <div className="rounded-2xl border p-6 shadow-2xl" style={{ background: slate, borderColor: "rgba(255,255,255,0.1)" }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: green }} />
                  <span className="text-white text-sm font-semibold">Scenario 3 of 12</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: "rgba(34,197,94,0.15)", color: green }}>
                  AI Output Evaluation
                </span>
              </div>
              <div className="mb-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Scenario</p>
                <p className="text-slate-200 text-sm leading-relaxed">
                  An AI tool flags an employee as{" "}
                  <span className="font-semibold" style={{ color: "#EE6677" }}>"high risk"</span>{" "}
                  for involuntary turnover. The data is 6 months old, the model confidence is 61%, and your manager is asking for immediate action.
                </p>
              </div>
              <div className="mb-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">What do you do?</p>
                <div className="flex flex-col gap-2">
                  {[
                    { key: "A", label: "Act on the flag immediately — schedule a retention conversation", sel: false },
                    { key: "B", label: "Validate the model output before taking action", sel: true },
                    { key: "C", label: "Escalate to HR leadership to decide", sel: false },
                    { key: "D", label: "Dismiss the flag — AI tools are often wrong", sel: false },
                  ].map(opt => (
                    <div key={opt.key} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                      style={{
                        background: opt.sel ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
                        border: opt.sel ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.06)",
                        color: opt.sel ? green : "#CBD5E1",
                      }}>
                      <span className="font-bold text-xs w-5 shrink-0">{opt.key}</span>
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400">Confidence</span>
                  <span className="text-xs font-semibold" style={{ color: green }}>Fairly sure</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full w-3/4" style={{ background: green }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-500">Guessing</span>
                  <span className="text-xs text-slate-500">Certain</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BoardQuestions() {
  const questions = [
    {
      num: "01", icon: BarChart3,
      q: "Where is HR now on AI capability?",
      body: "Not what people say in surveys. Not what your LMS reports. What your HR people actually demonstrate when probed — under realistic pressure, on scenarios that match their roles, with diagnoses calibrated to their seniority.",
    },
    {
      num: "02", icon: Target,
      q: "Where does HR need to be to deliver the AI strategy?",
      body: "The capability levels Project Aurora actually requires by Q3 2027. The capabilities Project Phoenix will need across customer-facing roles. The translation between the business's AI commitments and what HR specifically has to be capable of, with timelines and role-level specificity.",
    },
    {
      num: "03", icon: TrendingUp,
      q: "How fast is the gap closing?",
      body: "Whether the development your function is investing in is producing measurable capability change. Which interventions are working and which aren't. When the gap will close at current pace, and what would be required to close it faster if the timeline matters.",
    },
  ];
  return (
    <section style={{ background: chalk }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-16">
          <h2 className="text-3xl font-bold mb-4" style={{ color: navy, letterSpacing: "-0.02em" }}>
            Three things the board is going to ask.{" "}
            <span style={{ color: green }}>You need defensible answers to all three.</span>
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Most CPOs can answer the first question with a survey, the second with a consulting engagement,
            and the third only after the fact. AiQ answers all three continuously, with rigour,
            in evidence your General Counsel will defend.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {questions.map(({ num, q, body, icon: Icon }) => (
            <div key={num} className="rounded-2xl p-8 border" style={{ background: "white", borderColor: borderL }}>
              <div className="flex items-start gap-4 mb-5">
                <span className="text-3xl font-black" style={{ color: green, lineHeight: 1 }}>{num}</span>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.1)" }}>
                  <Icon className="w-5 h-5" style={{ color: green }} />
                </div>
              </div>
              <h3 className="font-bold text-lg mb-3" style={{ color: navy }}>{q}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MeasureDiagnoseClose() {
  const differentiators = [
    {
      title: "The assessment gets sharper with each session",
      body: "Most assessments produce a one-time score. AiQ's adaptive intelligence learns each user's response patterns across sessions, so each subsequent assessment is more precise about that person's actual capability. The measurement gets better the more your function uses it.",
    },
    {
      title: "The development is generated for the person, not selected from a library",
      body: "Most learning platforms recommend modules from a catalogue. AiQ's personalised development is built on a curated, expert-reviewed content base, then calibrated to each user's specific gaps, role context, and seniority. The intervention is for them, not for someone like them.",
    },
    {
      title: "The capability change is measured, not assumed",
      body: "Most learning platforms tell you who completed what. AiQ measures whether the development actually closed the gap it was designed to close. Reassessment connects intervention to outcome, so you know which development investment produced measurable capability change.",
    },
  ];
  return (
    <section style={{ background: navy }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
              Measure. <span style={{ color: green }}>Diagnose.</span> Close.
            </h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              AiQ is a continuous loop, not a one-off diagnostic. Every HR person in your function takes
              an adaptive assessment that probes their actual AI capability across six domains. The system
              diagnoses their specific gaps. They receive a personalised development plan that closes those
              gaps. They reassess. The system measures whether each intervention worked.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">Three things make this different from anything else in the market.</p>
            <Link href="/how-it-works">
              <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
                See how the loop works <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-col gap-6">
            {differentiators.map(({ title, body }, i) => (
              <div key={i} className="rounded-xl p-6 border" style={{ background: "rgba(255,255,255,0.04)", borderColor: border }}>
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: green }} />
                  <h3 className="font-semibold text-white leading-snug">{title}</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed pl-8">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ThreeAltitudes() {
  const views = [
    {
      audience: "Every HR person", subtitle: "sees their own journey", icon: Users, color: "#4477AA",
      body: "Where they are now, what their specific gaps are, how they compare against anonymous peers in the same role, and what they're working on next. Their development plan is personalised to them. Their reassessment shows them whether the work is paying off. They feel respected — not measured against, developed with.",
    },
    {
      audience: "Every line manager", subtitle: "sees their team's progress", icon: BarChart3, color: "#228833",
      body: "Who's where, who's progressing, who's stalled, and what's worth discussing in next week's 1:1s. Specific conversation prompts surface the development context that matters. Not a heatmap. A briefing.",
    },
    {
      audience: "You", subtitle: "see the function against your business AI roadmap", icon: Target, color: green,
      body: "Where your HR function is now. Where it needs to be by your business's AI initiative timelines. The specific gap. How fast it's closing. Which development investment is producing measurable return. The strategic intelligence your CEO is asking for, defensible to the General Counsel.",
    },
  ];
  return (
    <section style={{ background: chalk }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-16">
          <h2 className="text-3xl font-bold mb-4" style={{ color: navy, letterSpacing: "-0.02em" }}>
            Three views of the same loop,{" "}
            <span style={{ color: green }}>each answering a different question.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {views.map(({ audience, subtitle, body, icon: Icon, color }) => (
            <div key={audience} className="rounded-2xl p-8 border flex flex-col" style={{ background: "white", borderColor: borderL }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: `${color}18` }}>
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color }}>{audience}</p>
              <h3 className="font-bold text-lg mb-4" style={{ color: navy }}>{subtitle}</h3>
              <p className="text-slate-600 text-sm leading-relaxed flex-1">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StrategicLayer() {
  return (
    <section style={{ background: slate }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
              style={{ background: "rgba(34,197,94,0.15)", color: green, border: "1px solid rgba(34,197,94,0.3)" }}>
              The strategic intelligence layer
            </div>
            <h2 className="text-3xl font-bold text-white mb-6" style={{ letterSpacing: "-0.02em" }}>
              AiQ overlays your function's capability{" "}
              <span style={{ color: green }}>against your business AI roadmap.</span>
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">This is what makes AiQ board-grade rather than diagnostic-grade.</p>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              You capture your business's AI initiatives — Project Aurora launches Q3 2027 and requires
              advanced output evaluation across customer-facing roles. Project Phoenix needs ethics-under-pressure
              capability across operations leadership. The transformation programme requires baseline capability
              uplift across the function by year-end.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              AiQ translates these into specific HR capability targets per role family per timeline. Then it
              shows you the gap between current state and target state, the rate at which the gap is closing,
              and the projected closure date for each business commitment.
            </p>
            <Link href="/product">
              <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
                See the product <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="rounded-2xl border p-8" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-4 h-4" style={{ color: green }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: green }}>Example board finding</span>
            </div>
            <blockquote className="text-slate-200 text-sm leading-relaxed italic mb-6 border-l-2 pl-4" style={{ borderColor: green }}>
              "Currently 67% of target across affected role families. At current development pace, the gap
              will close by Q2 2027 — three months before launch. The remaining risk is concentrated in
              workflow design among Senior HRBPs."
            </blockquote>
            <p className="text-slate-400 text-xs mb-6">That's the conversation the board wants to be in. AiQ gives you the evidence to lead it.</p>
            <div className="pt-6 border-t grid grid-cols-3 gap-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              {[
                { label: "Current readiness", value: "67%", sub: "of target" },
                { label: "Projected closure", value: "Q2 2027", sub: "3 months early" },
                { label: "Risk concentration", value: "Senior HRBPs", sub: "Workflow design" },
              ].map(({ label, value, sub }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="font-bold text-white text-sm">{value}</p>
                  <p className="text-xs" style={{ color: green }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SixDomains() {
  const domains = [
    { name: "AI Interaction", tier: "Foundation", color: "#4477AA" },
    { name: "AI Output Evaluation", tier: "Foundation", color: "#AA3377" },
    { name: "AI Workflow Design", tier: "Operational", color: "#228833" },
    { name: "Workforce AI Readiness", tier: "Strategic", color: "#CCBB44" },
    { name: "AI Ethics & Employee Trust", tier: "Strategic", color: "#EE6677" },
    { name: "AI Change Leadership", tier: "Strategic", color: "#EE8866" },
  ];
  return (
    <section style={{ background: chalk, borderTop: `1px solid ${borderL}`, borderBottom: `1px solid ${borderL}` }} className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-sm font-semibold uppercase tracking-wider mb-8" style={{ color: muted }}>
          Six capability domains — foundation, operational, and strategic
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {domains.map(({ name, tier, color }) => (
            <div key={name} className="rounded-xl p-4 border text-center" style={{ background: "white", borderColor: borderL }}>
              <div className="w-8 h-8 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: `${color}18` }}>
                <Zap className="w-4 h-4" style={{ color }} />
              </div>
              <p className="font-semibold text-xs mb-1" style={{ color: navy }}>{name}</p>
              <p className="text-xs" style={{ color }}>{tier}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhoItsFor() {
  const fits = [
    "Your CEO has named AI as a strategic priority and your function has been told to deliver the people-side of the transformation",
    "Your General Counsel has asked specific questions about Article 22 implications, AI bias risk, or your function's readiness to govern AI deployment responsibly",
    "Your function is implementing AI tools and your people are making AI-informed decisions every day, with no measurement of whether those decisions are sound",
    "You're being asked for evidence — not estimates — about HR's AI capability state, and your existing assessment tools weren't built for this",
  ];
  return (
    <section style={{ background: chalk }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl font-bold mb-4" style={{ color: navy, letterSpacing: "-0.02em" }}>
              UK enterprise CPOs{" "}
              <span style={{ color: green }}>whose business has committed to AI.</span>
            </h2>
            <p className="text-slate-600 leading-relaxed mb-8">
              AiQ is built for Chief People Officers and HR Directors leading functions of 25+ HR people,
              in UK enterprises that have made specific AI commitments their HR function is responsible for delivering against.
            </p>
            <p className="font-semibold mb-5" style={{ color: navy }}>You'll recognise yourself if:</p>
            <div className="flex flex-col gap-4">
              {fits.map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: green }} />
                  <p className="text-slate-600 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl p-7 border" style={{ background: "white", borderColor: borderL }}>
              <h3 className="font-bold mb-4" style={{ color: navy }}>AiQ's current scope</h3>
              <div className="flex flex-col gap-4 text-sm text-slate-600">
                <p><strong className="text-slate-800">UK regulatory context.</strong>{" "}AiQ is built for UK GDPR, Equality Act, Employment Rights Act, ICO guidance, and sector regulators including FCA Consumer Duty and ICO AI Auditing Framework.</p>
                <p><strong className="text-slate-800">HR functions of 25+ people.</strong>{" "}Smaller functions may benefit from a different commercial model; we're happy to discuss what would make sense.</p>
                <p><strong className="text-slate-800">HR people's AI capability specifically.</strong>{" "}If you need to measure AI capability across your whole organisation, AiQ is not the right tool for that — but the methodology and design principles transfer.</p>
              </div>
            </div>
            <div className="rounded-2xl p-7 border" style={{ background: "white", borderColor: borderL }}>
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#EE6677" }} />
                <h3 className="font-bold" style={{ color: navy }}>Honest about limitations</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                AiQ's methodology is rigorous in its design. It is not yet empirically validated against real customer data at scale.
                Beta partners are buying into a methodology that is sound but still maturing — meaningful discount, direct influence
                on the platform's evolution, and the trust that comes from working with a vendor that doesn't pretend to certainty it doesn't yet have.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyNow() {
  return (
    <section style={{ background: navy }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-8"
            style={{ background: "rgba(34,197,94,0.15)", color: green, border: "1px solid rgba(34,197,94,0.3)" }}>
            <Clock className="w-3 h-3" /> Why now
          </div>
          <h2 className="text-3xl font-bold text-white mb-6" style={{ letterSpacing: "-0.02em" }}>
            The conversation about AI is moving from{" "}
            <span style={{ color: green }}>'are we adopting it'</span>{" "}
            to 'is HR ready to govern it.'
          </h2>
          <p className="text-slate-300 leading-relaxed mb-6">
            The first wave of HR AI adoption was about productivity tools. The second wave is about
            governance — whether HR is capable of evaluating AI-informed decisions, designing safe
            workflows, supporting workforce transitions, and standing up to regulator scrutiny when
            AI affects employment outcomes.
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            Most HR functions are not yet ready for the second wave. The capability gap is real, the
            timeline is short, and the consequences of getting it wrong are visible — Article 22
            challenges, ICO investigations, employment tribunal cases, board-level questions that
            nobody can answer credibly.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            AiQ exists because the assessment tools, learning platforms, and consulting engagements
            available today weren't built for this specific question. They measure other things.
            AiQ measures this thing — your HR function's actual AI capability — with the rigour the question deserves.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
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
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section style={{ background: slate }} className="py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
          Apply for the AiQ Beta Programme
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          We're working with a small cohort of UK CPOs to refine the platform with real customer signal before general availability.
        </p>
        <p className="text-slate-400 text-sm leading-relaxed mb-10">
          Beta partners get the platform at meaningful discount, direct access to the founders, and early influence on the product roadmap.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/beta">
            <Button size="lg" className="font-semibold px-10" style={{ background: green, color: "white" }}>
              Apply for beta access <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/methodology">
            <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 px-8">Read the methodology</Button>
          </Link>
          <Link href="/how-it-works">
            <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 px-8">How it works</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function MarketingPage() {
  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />
      <Hero />
      <BoardQuestions />
      <MeasureDiagnoseClose />
      <ThreeAltitudes />
      <StrategicLayer />
      <SixDomains />
      <WhoItsFor />
      <WhyNow />
      <FinalCTA />
      <MarketingFooter />
    </div>
  );
}
