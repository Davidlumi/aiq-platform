/**
 * AiQ Marketing Home Page — v6.0 (Skills Checker Self-Serve Launch)
 * Phase 1 positioning: individual AI skills checker, free → paid upgrade.
 * Strategy Builder, Reward Mode, and Company Assessment removed from public messaging.
 */
import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ChevronRight, Target, Brain, BookOpen, Shield,
  CheckCircle2, Sparkles, MessageSquare, Zap, Eye,
  Users, TrendingUp, Menu, X, Layers, RefreshCw, Search,
} from "lucide-react";

// --- Brand tokens -------------------------------------------------------------
const navy     = "#0F172A";
const slate    = "#1E293B";
const chalk    = "#F8FAFC";
const border   = "rgba(255,255,255,0.08)";
const borderL  = "#E2E8F0";
const greenHex = "#22C55E";
const indigo   = "#6366F1";
const amber    = "#F59E0B";
const cyan     = "#06B6D4";

// --- Nav links ----------------------------------------------------------------
const NAV_LINKS: [string, string][] = [
  ["How it works", "/how-it-works"],
  ["Pricing", "/pricing"],
  ["About", "/about"],
];

// --- Shared Nav ---------------------------------------------------------------
export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 border-b h-16 flex items-center px-6"
      style={{ background: navy, borderColor: border }}>
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer select-none">
            <img src="/manus-storage/aiq-logo-nav_dd4a0931.png" alt="AiQ" className="h-10 w-10 object-contain" />
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(([label, href]) => (
            <Link key={href} href={href}>
              <span className="text-slate-300 hover:text-white text-sm transition-colors cursor-pointer">{label}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10 hidden sm:inline-flex">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="font-semibold hidden sm:inline-flex" style={{ background: greenHex, color: "white" }}>
              Check your skills — free
            </Button>
          </Link>
          <button className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="absolute top-16 left-0 right-0 border-b z-50 py-4 px-6 flex flex-col gap-4"
          style={{ background: navy, borderColor: border }}>
          {NAV_LINKS.map(([label, href]) => (
            <Link key={href} href={href}>
              <span className="text-slate-300 hover:text-white text-sm transition-colors cursor-pointer block py-1" onClick={() => setMobileOpen(false)}>{label}</span>
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: border }}>
            <Link href="/login"><Button variant="ghost" size="sm" className="w-full text-slate-300 hover:text-white hover:bg-white/10 justify-start" onClick={() => setMobileOpen(false)}>Sign in</Button></Link>
            <Link href="/register"><Button size="sm" className="w-full font-semibold justify-center" style={{ background: greenHex, color: "white" }} onClick={() => setMobileOpen(false)}>Check your skills — free</Button></Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// --- Shared Footer ------------------------------------------------------------
export function MarketingFooter() {
  return (
    <footer className="py-16 px-6 border-t" style={{ background: slate, borderColor: border }}>
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div>
            <p className="text-white font-semibold text-lg mb-1">Know where you stand on AI. Start free.</p>
            <p className="text-slate-400 text-sm">Take the 15-minute assessment. Get your capability score. No credit card required.</p>
          </div>
          <Link href="/register">
            <Button className="font-semibold shrink-0 px-6" style={{ background: greenHex, color: "white" }}>
              Check your skills — free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/manus-storage/aiq-logo-nav_dd4a0931.png" alt="AiQ" className="h-9 w-9 object-contain" />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">The AI capability intelligence platform for HR professionals.</p>
            <p className="text-xs text-slate-500">Built for UK GDPR · ICO guidance</p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Product</h4>
            <div className="flex flex-col gap-3">
              {([["How it works", "/how-it-works"], ["Pricing", "/pricing"], ["Check your skills", "/register"]] as [string,string][]).map(([l, h]) => (
                <Link key={l} href={h}><span className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer">{l}</span></Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Company</h4>
            <div className="flex flex-col gap-3">
              {([["About", "/about"]] as [string,string][]).map(([l, h]) => (
                <Link key={l} href={h}><span className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer">{l}</span></Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Legal</h4>
            <div className="flex flex-col gap-3">
              {["Privacy policy", "Terms of service", "Accessibility statement"].map((l) => (
                <span key={l} className="text-slate-400 text-sm cursor-pointer hover:text-white transition-colors"
                  onClick={() => toast.info(`${l} — coming soon`, { description: "This page is being prepared and will be available shortly." })}>{l}</span>
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

// --- Hero Section -------------------------------------------------------------
function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        if (rect.bottom > 0) setScrollY(window.scrollY);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <section ref={heroRef} style={{ background: `linear-gradient(180deg, ${navy} 0%, #0a1628 100%)` }} className="pt-20 pb-28 px-6 relative overflow-hidden">
      <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-10 pointer-events-none transition-transform duration-100"
        style={{ background: "radial-gradient(circle, #22C55E 0%, transparent 70%)", transform: `translate(${scrollY * 0.02}px, ${scrollY * -0.04}px)` }} />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-[0.08] pointer-events-none transition-transform duration-100"
        style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)", transform: `translate(${scrollY * -0.03}px, ${scrollY * -0.02}px)` }} />
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{ background: "rgba(34,197,94,0.12)", color: greenHex, border: "1px solid rgba(34,197,94,0.25)" }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: greenHex }} />
          Free to start — no credit card required
        </div>
        <h1 className="text-5xl lg:text-7xl font-black text-white mb-6 leading-tight" style={{ letterSpacing: "-0.03em" }}>
          How capable are you<br />
          <span style={{ color: greenHex }}>with AI in HR?</span>
        </h1>
        <p className="text-xl text-slate-300 leading-relaxed mb-4 max-w-2xl mx-auto">
          15 minutes. 6 capability domains. A precise score that tells you exactly where you stand — and what to do about it.
        </p>
        <p className="text-slate-400 mb-10 max-w-xl mx-auto">
          Scenario-based assessment built for HR professionals. Not a quiz. Not a survey. Evidence-grade measurement.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <Link href="/register">
            <Button size="lg" className="font-semibold px-8 text-base" style={{ background: greenHex, color: "white" }}>
              Check your skills — free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button size="lg" variant="outline" className="font-semibold px-8 text-base text-white border-white/20 hover:bg-white/10">
              <Eye className="mr-2 h-4 w-4" /> See how it works
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-8 lg:gap-16">
          {[
            { value: "6", label: "Capability domains" },
            { value: "79+", label: "Real-world scenarios" },
            { value: "15 min", label: "To complete" },
            { value: "Free", label: "To start" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl lg:text-3xl font-black" style={{ color: greenHex }}>{value}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Six Domains Section ------------------------------------------------------
function SixDomains() {
  const domains = [
    { name: "AI Interaction", color: "#60A5FA", icon: MessageSquare, desc: "Prompting, context-setting, and iterative dialogue with AI systems in HR workflows." },
    { name: "AI Output Evaluation", color: "#C084FC", icon: Search, desc: "Critically assessing AI-generated content for accuracy, bias, and fitness for purpose." },
    { name: "Ethical & Responsible AI", color: greenHex, icon: Shield, desc: "Navigating fairness, transparency, and accountability in AI-assisted HR decisions." },
    { name: "AI Strategy & Planning", color: amber, icon: Target, desc: "Connecting AI tools to business outcomes and building a coherent capability roadmap." },
    { name: "Data & Systems Literacy", color: cyan, icon: Layers, desc: "Understanding data flows, model limitations, and integration with HR technology." },
    { name: "Change & Adoption", color: "#EC4899", icon: RefreshCw, desc: "Leading teams through AI adoption, managing resistance, and embedding new ways of working." },
  ];
  return (
    <section style={{ background: slate }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ background: "rgba(34,197,94,0.12)", color: greenHex, border: "1px solid rgba(34,197,94,0.25)" }}>
            <Sparkles className="w-3 h-3" /> Built for HR professionals
          </div>
          <h2 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
            Six domains. One <span style={{ color: greenHex }}>precise picture.</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            AiQ measures the six capability domains that determine whether an HR professional can use AI effectively, ethically, and strategically. Each domain is assessed through real-world scenarios — not multiple choice.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {domains.map(({ name, color, icon: Icon, desc }) => (
            <div key={name} className="rounded-xl p-6 border transition-all hover:border-opacity-60"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: `${color}30` }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: `${color}18` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="text-white font-semibold mb-2">{name}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- How It Works (3-step) ---------------------------------------------------
function HowItWorksStrip() {
  const steps = [
    { num: "01", icon: Brain, color: indigo, title: "Take the assessment", body: "15 minutes of scenario-based questions calibrated to your role and seniority. Adaptive difficulty. Anti-gaming detection. No self-reporting." },
    { num: "02", icon: Search, color: cyan, title: "Get your capability score", body: "A headline score plus a breakdown across all six domains — with a plain-English diagnosis of your specific strengths and gaps." },
    { num: "03", icon: BookOpen, color: greenHex, title: "Close the gaps", body: "Your results reveal a personalised learning plan. Free users see the full plan. Upgrade to PRO to click into modules, access the AI Coach, and track progress over time." },
  ];
  return (
    <section style={{ background: navy }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
            Assess. Diagnose. <span style={{ color: greenHex }}>Close. Prove.</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">Not a one-off quiz. A continuous intelligence loop that gets sharper with every cycle.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(({ num, icon: Icon, color, title, body }) => (
            <div key={num} className="rounded-2xl p-7 border h-full" style={{ background: "rgba(255,255,255,0.03)", borderColor: `${color}25` }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <span className="text-3xl font-black opacity-20 text-white">{num}</span>
              </div>
              <h3 className="text-white font-semibold text-lg mb-3">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href="/register">
            <Button size="lg" className="font-semibold px-10" style={{ background: greenHex, color: "white" }}>
              Start your assessment — free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// --- Free vs Paid Comparison --------------------------------------------------
function FreePaidComparison() {
  const freeFeatures = [
    "Full 15-minute scenario-based assessment",
    "Headline capability score (0–10)",
    "Per-domain scores across all 6 domains",
    "Full diagnostic narrative per domain",
    "Comparison to HR professional average",
    "Retake once per month",
  ];
  const paidFeatures = [
    "Everything in Free, plus:",
    "Click into personalised learning modules",
    "Full modules library (30+ lessons, simulations, videos)",
    "AiQ Coach — AI coaching for your capability gaps",
    "Knowledge base (articles, guides, frameworks)",
    "Progress tracking over time",
    "Downloadable capability report (PDF)",
  ];
  return (
    <section style={{ background: slate }} className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
            Start free. <span style={{ color: greenHex }}>Go deeper when you're ready.</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">The free assessment tells you where you stand. The paid plan tells you exactly what to do about it — and proves you did it.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl p-8 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: border }}>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: greenHex }}>Free</p>
              <p className="text-4xl font-black text-white mb-1">£0</p>
              <p className="text-slate-400 text-sm">No credit card. No time limit.</p>
            </div>
            <div className="flex flex-col gap-3 mb-8">
              {freeFeatures.map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: greenHex }} />
                  <span className="text-slate-300 text-sm">{f}</span>
                </div>
              ))}
            </div>
            <Link href="/register">
              <Button variant="outline" className="w-full text-white border-white/20 hover:bg-white/10 font-semibold">Start free assessment</Button>
            </Link>
          </div>
          <div className="rounded-2xl p-8 border relative overflow-hidden" style={{ background: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.4)" }}>
            <div className="absolute top-4 right-4">
              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.2)", color: greenHex, border: "1px solid rgba(34,197,94,0.4)" }}>Most popular</span>
            </div>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: greenHex }}>Individual</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-white">£50</p>
                <p className="text-slate-400 text-sm">/month</p>
              </div>
              <p className="text-slate-400 text-sm mt-1">or £480/year — save 20%</p>
            </div>
            <div className="flex flex-col gap-3 mb-8">
              {paidFeatures.map((f, i) => (
                <div key={f} className="flex items-start gap-3">
                  {i === 0
                    ? <span className="w-4 h-4 mt-0.5 shrink-0" />
                    : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: greenHex }} />}
                  <span className={`text-sm ${i === 0 ? "text-slate-500 italic" : "text-slate-300"}`}>{f}</span>
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
        <p className="text-center text-slate-500 text-xs mt-6">
          Team plans coming soon.{" "}
          <span className="text-slate-400 cursor-pointer hover:text-white transition-colors"
            onClick={() => toast.info("Team plans — coming soon", { description: "We'll notify you when team pricing is available." })}>
            Get notified →
          </span>
        </p>
      </div>
    </section>
  );
}

// --- Assessment Engine Preview -----------------------------------------------
function AssessmentPreview() {
  return (
    <section style={{ background: navy }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
              style={{ background: "rgba(99,102,241,0.15)", color: indigo, border: "1px solid rgba(99,102,241,0.3)" }}>
              <Sparkles className="w-3 h-3" /> Adaptive assessment engine
            </div>
            <h2 className="text-4xl font-bold text-white mb-6" style={{ letterSpacing: "-0.02em" }}>
              Not a quiz. <span style={{ color: indigo }}>Evidence-grade measurement.</span>
            </h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              AiQ uses scenario-based questions drawn from real HR situations — not abstract knowledge tests. The engine adapts to your role, seniority, and response patterns.
            </p>
            <div className="flex flex-col gap-4 mb-8">
              {[
                { title: "Role-calibrated", body: "Items are calibrated to your role and seniority — an HRBP sees different scenarios than a Reward Specialist." },
                { title: "Variance-probing", body: "The system probes deeper where your responses show inconsistency, surfacing exactly where your judgement breaks down." },
                { title: "Anti-gaming detection", body: "Contradiction probes and response-pattern analysis catch strategic answering. The score reflects genuine capability." },
              ].map(({ title, body }) => (
                <div key={title} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: indigo }} />
                  <div>
                    <p className="text-white text-sm font-semibold">{title}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border p-6" style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.25)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(99,102,241,0.15)", color: indigo }}>
                AI Output Evaluation · Q4 of 12
              </span>
              <span className="text-xs text-slate-500">Adaptive: Level 3/5</span>
            </div>
            <p className="text-white text-sm leading-relaxed mb-6">
              You ask an AI tool to draft a shortlisting rationale for 40 candidates. The output is fluent and well-structured. You notice it consistently ranks candidates from two universities higher. What do you do?
            </p>
            <div className="flex flex-col gap-2">
              {[
                "Use the output — the ranking is based on stated criteria",
                "Flag the pattern and investigate the training data before using",
                "Discard the output and shortlist manually",
                "Ask the AI to re-rank without university as a factor",
              ].map((opt, i) => (
                <div key={i} className="rounded-lg px-4 py-3 border text-sm text-slate-300 cursor-pointer hover:border-indigo-400/50 transition-colors"
                  style={{ borderColor: i === 1 ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", background: i === 1 ? "rgba(99,102,241,0.1)" : "transparent" }}>
                  {String.fromCharCode(65 + i)}. {opt}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <span className="text-xs text-slate-500">Anti-gaming: Clear</span>
              <span className="text-xs text-slate-500">Time remaining: 8:42</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Who It's For -------------------------------------------------------------
function WhoItsFor() {
  const personas = [
    { role: "HR Business Partner", pain: "Your business is rolling out AI tools. You need to demonstrate you can work with them — not just manage the change.", value: "Know your AI capability score before your next performance review.", color: greenHex },
    { role: "Reward & Compensation Specialist", pain: "AI is changing how pay decisions are made and audited. You need to stay ahead of the tools and the governance.", value: "Understand your AI Output Evaluation and Ethical AI capability before the tools arrive.", color: indigo },
    { role: "L&D Professional", pain: "You're designing AI capability programmes for others. You should know your own capability first.", value: "Get a credible baseline before you build the curriculum.", color: cyan },
    { role: "HR Leader / CPO", pain: "You need to know where your team stands on AI capability — and have evidence for the board.", value: "Start with your own score. Team plans coming soon.", color: amber },
  ];
  return (
    <section style={{ background: navy }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
            Built for <span style={{ color: greenHex }}>HR professionals.</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">Every scenario is drawn from real HR work. The domains reflect what actually matters in HR AI capability — not generic digital literacy.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {personas.map(({ role, pain, value, color }) => (
            <div key={role} className="rounded-2xl p-7 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: `${color}25` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Users className="w-4 h-4" style={{ color }} />
                </div>
                <h3 className="text-white font-semibold">{role}</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{pain}</p>
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
                <p className="text-sm font-medium" style={{ color }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Trust Section ------------------------------------------------------------
function TrustSection() {
  return (
    <section style={{ background: chalk }} className="py-16 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: greenHex }}>Built with integrity</p>
        <p className="text-slate-600 text-lg leading-relaxed mb-10 max-w-3xl mx-auto">
          UK GDPR compliant. ICO AI Auditing Framework aligned. Equality Act aware. Full audit trail. Evidence-grade outputs that withstand scrutiny.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "UK GDPR", sub: "Compliant" },
            { label: "ICO Framework", sub: "Aligned" },
            { label: "Audit Trail", sub: "Complete" },
            { label: "Decision Trace", sub: "Logged" },
          ].map(({ label, sub }) => (
            <div key={label} className="rounded-xl p-4 border bg-white" style={{ borderColor: borderL }}>
              <p className="font-bold text-sm" style={{ color: navy }}>{label}</p>
              <p className="text-xs mt-1" style={{ color: greenHex }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Final CTA ----------------------------------------------------------------
function FinalCTA() {
  return (
    <section className="py-28 px-6 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a2e1a 0%, #0F172A 40%, #0a2e1a 100%)" }}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <div className="w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #22C55E 0%, transparent 70%)" }} />
      </div>
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-8"
          style={{ background: "rgba(34,197,94,0.15)", color: greenHex, border: "1px solid rgba(34,197,94,0.3)" }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: greenHex }} />
          Free to start
        </div>
        <h2 className="text-4xl font-black text-white mb-4" style={{ letterSpacing: "-0.03em" }}>Know where you stand on AI.</h2>
        <p className="text-slate-300 leading-relaxed mb-4">15 minutes. A precise capability score. A clear picture of what to do next.</p>
        <p className="text-slate-400 text-sm leading-relaxed mb-10">Free to start. No credit card. Upgrade when you're ready for the full programme.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="font-semibold px-10" style={{ background: greenHex, color: "white" }}>
              Check your skills — free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 px-8">
              See how it works <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// --- Reveal on Scroll Wrapper -------------------------------------------------
function RevealOnScroll({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.08, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="transition-all duration-700 ease-out"
      style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0)" : "translateY(32px)", transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// --- Main Export --------------------------------------------------------------
export default function MarketingPage() {
  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />
      <Hero />
      <RevealOnScroll delay={50}><SixDomains /></RevealOnScroll>
      <RevealOnScroll delay={50}><HowItWorksStrip /></RevealOnScroll>
      <RevealOnScroll delay={50}><AssessmentPreview /></RevealOnScroll>
      <RevealOnScroll delay={50}><FreePaidComparison /></RevealOnScroll>
      <RevealOnScroll delay={50}><WhoItsFor /></RevealOnScroll>
      <RevealOnScroll delay={50}><TrustSection /></RevealOnScroll>
      <RevealOnScroll><FinalCTA /></RevealOnScroll>
      <MarketingFooter />
    </div>
  );
}
