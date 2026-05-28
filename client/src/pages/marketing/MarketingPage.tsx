/**
 * AiQ Marketing Home Page — v5.0 (Complete Platform Overhaul)
 * Reflects the full platform: AI Strategy Builder (10-stage, dual CPO/Reward modes),
 * Adaptive Assessment, AI Coach, Personalised Learning, Team Intelligence, Board Reporting.
 */
import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ChevronRight, Target, TrendingUp, BarChart3,
  Users, CheckCircle2, Clock, Play, Sparkles,
  MessageSquare, Brain, BookOpen, Shield, Layers,
  Building2, Compass, Zap, LineChart, Award,
  GitBranch, FileText, Eye, Lock, LayoutDashboard,
  Menu, X,
} from "lucide-react";

// --- Brand tokens -------------------------------------------------------------
const navy    = "#0F172A";
const slate   = "#1E293B";
const chalk   = "#F8FAFC";
const border  = "rgba(255,255,255,0.08)";
const borderL = "#E2E8F0";
const green   = "var(--primary)";
const greenHex = "#22C55E";
const indigo  = "#6366F1";
const amber   = "#F59E0B";
const cyan    = "#06B6D4";

// --- Shared components --------------------------------------------------------
const NAV_LINKS: [string, string][] = [
  ["Platform", "/product"],
  ["How it works", "/how-it-works"],
  ["Pricing", "/pricing"],
  ["Case studies", "/case-studies"],
  ["Compare", "/compare"],
  ["ROI calculator", "/roi-calculator"],
  ["About", "/about"],
];

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b h-16 flex items-center px-6"
      style={{ background: navy, borderColor: border }}>
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer select-none">
            <img
              src="/manus-storage/aiq-logo-nav_dd4a0931.png"
              alt="AiQ"
              className="h-10 w-10 object-contain"
            />
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(34,197,94,0.15)", color: greenHex, border: "1px solid rgba(34,197,94,0.3)" }}>
              Beta
            </span>
          </div>
        </Link>
        {/* Desktop nav */}
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
          <Link href="/beta">
            <Button size="sm" className="font-semibold hidden sm:inline-flex" style={{ background: greenHex, color: "white" }}>Join beta — free</Button>
          </Link>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="absolute top-16 left-0 right-0 border-b md:hidden"
          style={{ background: navy, borderColor: border }}>
          <div className="flex flex-col px-6 py-4 gap-1">
            {NAV_LINKS.map(([label, href]) => (
              <Link key={href} href={href}>
                <span
                  className="block py-2.5 px-3 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-sm transition-colors cursor-pointer"
                  onClick={() => setMobileOpen(false)}
                >{label}</span>
              </Link>
            ))}
            <div className="border-t my-2" style={{ borderColor: border }} />
            <Link href="/login">
              <span className="block py-2.5 px-3 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-sm cursor-pointer" onClick={() => setMobileOpen(false)}>Sign in</span>
            </Link>
            <Link href="/beta">
              <span className="block py-2.5 px-3 rounded-lg font-semibold text-sm cursor-pointer" style={{ color: greenHex }} onClick={() => setMobileOpen(false)}>Join beta — free →</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer style={{ background: navy, borderTop: `1px solid ${border}` }} className="pt-16 pb-8 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Footer CTA strip */}
        <div className="rounded-2xl p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div>
            <p className="text-white font-semibold text-lg mb-1">Ready to build your HR AI strategy with evidence?</p>
            <p className="text-slate-400 text-sm">Join the first cohort of UK HR leaders using AiQ to build board-grade AI capability intelligence.</p>
          </div>
          <Link href="/beta">
            <Button className="font-semibold shrink-0 px-6" style={{ background: greenHex, color: "white" }}>
              Join the beta programme for free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/manus-storage/aiq-logo-nav_dd4a0931.png" alt="AiQ" className="h-9 w-9 object-contain" />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">The AI capability intelligence platform for HR functions delivering transformation.</p>
            <p className="text-xs text-slate-500">Built for UK GDPR · ICO guidance · FCA Consumer Duty</p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Platform</h4>
            <div className="flex flex-col gap-3">
              {([["AI Strategy Builder", "/product"], ["Adaptive Assessment", "/how-it-works"], ["AI Coach", "/product"], ["Learning & Development", "/product"], ["See demo", "/demo"]] as [string,string][]).map(([l, h]) => (
                <Link key={l} href={h}><span className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer">{l}</span></Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Company</h4>
            <div className="flex flex-col gap-3">
              {([["About", "/about"], ["Pricing", "/pricing"], ["Beta programme", "/beta"]] as [string,string][]).map(([l, h]) => (
                <Link key={l} href={h}><span className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer">{l}</span></Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Legal</h4>
            <div className="flex flex-col gap-3">
              {["Privacy policy", "Data processing addendum", "Accessibility statement", "Terms of service"].map((l) => (
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
        // Only update when hero is in viewport
        if (rect.bottom > 0) {
          setScrollY(window.scrollY);
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section ref={heroRef} style={{ background: `linear-gradient(180deg, ${navy} 0%, #0a1628 100%)` }} className="pt-20 pb-28 px-6 relative overflow-hidden">
      {/* Parallax background glow effects */}
      <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-10 pointer-events-none transition-transform duration-100"
        style={{ background: "radial-gradient(circle, #22C55E 0%, transparent 70%)", transform: `translate(${scrollY * 0.02}px, ${scrollY * -0.04}px)` }} />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-[0.08] pointer-events-none transition-transform duration-100"
        style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)", transform: `translate(${scrollY * -0.03}px, ${scrollY * -0.02}px)` }} />

      {/* Additional parallax floating elements */}
      <div className="absolute top-32 right-[10%] w-2 h-2 rounded-full pointer-events-none"
        style={{ background: greenHex, opacity: 0.3, transform: `translateY(${scrollY * -0.08}px)` }} />
      <div className="absolute top-48 left-[8%] w-1.5 h-1.5 rounded-full pointer-events-none"
        style={{ background: "#6366F1", opacity: 0.4, transform: `translateY(${scrollY * -0.12}px)` }} />
      <div className="absolute top-64 right-[20%] w-3 h-3 rounded-full pointer-events-none"
        style={{ background: "#C8A96E", opacity: 0.15, transform: `translateY(${scrollY * -0.06}px) rotate(${scrollY * 0.1}deg)` }} />
      <div className="absolute top-16 left-[15%] w-1 h-1 rounded-full pointer-events-none"
        style={{ background: "#06B6D4", opacity: 0.5, transform: `translateY(${scrollY * -0.15}px)` }} />
      <div className="absolute bottom-32 left-[30%] w-2.5 h-2.5 rounded-full pointer-events-none"
        style={{ background: greenHex, opacity: 0.2, transform: `translateY(${scrollY * -0.1}px)` }} />
      <div className="absolute bottom-20 right-[35%] w-1.5 h-1.5 rounded-full pointer-events-none"
        style={{ background: "#F59E0B", opacity: 0.25, transform: `translateY(${scrollY * -0.07}px)` }} />

      {/* Parallax grid lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.03 }}>
        <div className="absolute inset-0" style={{ transform: `translateY(${scrollY * -0.02}px)`, backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`, backgroundSize: "80px 80px" }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Centred pill badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
            style={{ background: "rgba(34,197,94,0.12)", color: greenHex, border: "1px solid rgba(34,197,94,0.3)" }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: greenHex }} />
            Now in beta — UK HR leaders building AI strategy with evidence
          </div>
        </div>

        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl lg:text-6xl font-black text-white leading-tight mb-6" style={{ letterSpacing: "-0.03em" }}>
            The complete AI capability
            <br />
            <span style={{ color: greenHex }}>intelligence platform</span> for HR.
          </h1>
          <p className="text-lg lg:text-xl text-slate-300 leading-relaxed mb-4 max-w-3xl mx-auto">
            Build your HR AI strategy in 10 guided stages. Measure actual capability through adaptive assessment.
            Close gaps with personalised development. Report to your board with evidence.
          </p>
          <p className="text-slate-400 mb-10 max-w-2xl mx-auto">
            Two modes — <strong className="text-white">CPO</strong> for whole-function strategy and <strong className="text-white">Reward</strong> for specialist compensation AI — both powered by the same rigorous methodology.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Link href="/beta">
              <Button size="lg" className="font-semibold px-8 text-base" style={{ background: greenHex, color: "white" }}>
                Join the beta programme for free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/tour">
              <Button size="lg" variant="outline" className="font-semibold px-8 text-base text-white border-white/20 hover:bg-white/10">
                <Eye className="mr-2 h-4 w-4" /> Take the product tour
              </Button>
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8 lg:gap-16">
            {[
              { value: "10", label: "Strategy stages" },
              { value: "68", label: "AI initiatives" },
              { value: "6", label: "Capability domains" },
              { value: "79+", label: "Assessment scenarios" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl lg:text-3xl font-black" style={{ color: greenHex }}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Platform Video Section ---------------------------------------------------
function PlatformVideo() {
  return (
    <section style={{ background: navy }} className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-xs font-semibold tracking-widest uppercase mb-6" style={{ color: greenHex }}>
          See the platform in action
        </p>
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 0 0 1px rgba(34,197,94,0.25), 0 0 60px rgba(34,197,94,0.1)" }}
        >
          <video
            className="w-full block"
            controls
            preload="metadata"
            poster="/manus-storage/aiq-platform-hero-v5_ca2a091c.png"
            style={{ background: "#0F172A" }}
          >
            <source src="/manus-storage/aiq-marketing-video-v6_f431cd9c.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        <p className="text-center text-slate-400 text-sm mt-4">
          68-second platform overview — Strategy Builder, Adaptive Assessment, AI Coach, and Board Reporting. Voiceover narration included.
        </p>
      </div>
    </section>
  );
}

// --- Core Platform Pillars ----------------------------------------------------
function PlatformPillars() {
  const pillars = [
    {
      icon: Target,
      color: greenHex,
      title: "AI Strategy Builder",
      subtitle: "10-stage guided process",
      desc: "Build a board-grade HR AI strategy through 10 structured stages — from diagnostic and vision through to business case, capability assessment, and board report. AI-assisted at every step.",
    },
    {
      icon: Brain,
      color: indigo,
      title: "Adaptive Assessment",
      subtitle: "79+ real-world scenarios",
      desc: "Measure actual AI capability through scenario-based assessment that adapts to each person's role, seniority, and response patterns. Anti-gaming detection. Contradiction probes. Evidence-grade scoring.",
    },
    {
      icon: MessageSquare,
      color: cyan,
      title: "AI Coach",
      subtitle: "Personalised guidance",
      desc: "Every user gets an AI coach that understands their capability profile, learning progress, and development goals. Context-aware conversations that accelerate capability growth.",
    },
    {
      icon: BookOpen,
      color: amber,
      title: "Learning & Development",
      subtitle: "Gap-targeted content",
      desc: "Personalised learning plans generated from assessment gaps. Domain pathways, curated modules, and progress tracking — all connected to measurable capability change.",
    },
    {
      icon: Users,
      color: "#EC4899",
      title: "Team Intelligence",
      subtitle: "Manager & leader views",
      desc: "Managers see team readiness, conversation prompts, and progress. Leaders see function-wide capability against business AI roadmap deadlines. Everyone sees what matters to them.",
    },
    {
      icon: FileText,
      color: "#8B5CF6",
      title: "Board Reporting",
      subtitle: "Evidence, not estimates",
      desc: "Generate board-ready reports with real capability data, gap analysis, investment recommendations, and projected closure timelines. Share with your General Counsel with confidence.",
    },
  ];

  return (
    <section style={{ background: chalk }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ background: "rgba(34,197,94,0.12)", color: greenHex, border: "1px solid rgba(34,197,94,0.25)" }}>
            Complete platform
          </div>
          <h2 className="text-4xl font-bold mb-4" style={{ color: navy, letterSpacing: "-0.02em" }}>
            Six integrated capabilities.{" "}
            <span style={{ color: greenHex }}>One platform.</span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
            AiQ is not a point solution. It is a complete intelligence system that connects strategy, measurement, development, and reporting into a single continuous loop.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map(({ icon: Icon, color, title, subtitle, desc }) => (
            <div key={title} className="rounded-2xl p-7 border bg-white hover:shadow-lg transition-all duration-300 group"
              style={{ borderColor: borderL, ["--hover-color" as string]: `${color}60` }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${color}60`)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = borderL)}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${color}15` }}>
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <h3 className="font-bold text-lg mb-1" style={{ color: navy }}>{title}</h3>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color }}>{subtitle}</p>
              <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- 10-Stage Strategy Builder (Scroll-Triggered Animations) ------------------
function StrategyBuilder() {
  const stages = [
    { num: 1, label: "Diagnostic", desc: "Company profile & AI readiness assessment", icon: ScanIcon },
    { num: 2, label: "Vision", desc: "Define your HR AI vision with peer inspiration", icon: Eye },
    { num: 3, label: "Strategy", desc: "Choose strategic archetype & direction", icon: Compass },
    { num: 4, label: "Principles", desc: "Set AI principles and won't-do boundaries", icon: Shield },
    { num: 5, label: "Initiatives", desc: "Select from 68 AI initiatives with value scoring", icon: Layers },
    { num: 6, label: "Success Measures", desc: "Define outcomes and measurement criteria", icon: LineChart },
    { num: 7, label: "Business Case", desc: "Generate investment justification", icon: Building2 },
    { num: 8, label: "Capability", desc: "Assess team readiness across dimensions", icon: Award },
    { num: 9, label: "Review", desc: "Stakeholder review with tension analysis", icon: Users },
    { num: 10, label: "Board Report", desc: "Board-ready output with full evidence", icon: FileText },
  ];

  const sectionRef = useRef<HTMLDivElement>(null);
  const [visibleStages, setVisibleStages] = useState<number[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-stage-idx"));
            setVisibleStages((prev) => prev.includes(idx) ? prev : [...prev, idx]);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    );

    const cards = sectionRef.current?.querySelectorAll("[data-stage-idx]");
    cards?.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section style={{ background: navy }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto" ref={sectionRef}>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ background: "rgba(99,102,241,0.15)", color: indigo, border: "1px solid rgba(99,102,241,0.3)" }}>
            <Sparkles className="w-3 h-3" /> AI-assisted at every stage
          </div>
          <h2 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
            Build your AI strategy in{" "}
            <span style={{ color: greenHex }}>10 guided stages.</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            From initial diagnostic through to board-ready report. Each stage builds on the last. AI suggests, you decide. The output is yours — rigorous, evidenced, and defensible.
          </p>
        </div>

        {/* Stage timeline with scroll-triggered reveal */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stages.map(({ num, label, desc, icon: Icon }, idx) => (
            <div
              key={num}
              data-stage-idx={idx}
              className="rounded-xl p-4 border text-center group hover:border-green-500/40 transition-all duration-700 ease-out"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: visibleStages.includes(idx) ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.08)",
                opacity: visibleStages.includes(idx) ? 1 : 0,
                transform: visibleStages.includes(idx) ? "translateY(0)" : "translateY(24px)",
                transitionDelay: `${idx * 100}ms`,
              }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-500"
                style={{
                  background: visibleStages.includes(idx) ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  transform: visibleStages.includes(idx) ? "scale(1)" : "scale(0.8)",
                  transitionDelay: `${idx * 100 + 200}ms`,
                }}>
                <span className="text-sm font-bold" style={{ color: greenHex }}>{num}</span>
              </div>
              <h4 className="text-white font-semibold text-sm mb-1">{label}</h4>
              <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Progress connector line (animated) */}
        <div className="mt-6 mb-12 relative h-1 rounded-full overflow-hidden mx-auto max-w-4xl"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${(visibleStages.length / 10) * 100}%`,
              background: `linear-gradient(90deg, ${greenHex}, ${indigo})`,
            }}
          />
        </div>

        {/* Dual mode callout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl p-6 border" style={{ background: "rgba(34,197,94,0.05)", borderColor: "rgba(34,197,94,0.2)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                <LayoutDashboard className="w-4 h-4" style={{ color: greenHex }} />
              </div>
              <h4 className="text-white font-semibold">CPO Mode</h4>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Whole-function AI strategy. Covers all HR domains — talent, L&D, employee relations, operations. 50 initiatives tailored to the CPO agenda.
            </p>
          </div>
          <div className="rounded-xl p-6 border" style={{ background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.2)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)" }}>
                <TrendingUp className="w-4 h-4" style={{ color: indigo }} />
              </div>
              <h4 className="text-white font-semibold">Reward Mode</h4>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Specialist compensation AI strategy. Pay equity, job architecture, total comp philosophy. 52 initiatives specific to the Reward function.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Placeholder icon component for stages that don't have a perfect lucide match
function ScanIcon(props: React.SVGProps<SVGSVGElement>) {
  return <BarChart3 {...props} />;
}

// --- Assessment Engine Section ------------------------------------------------
function AssessmentEngine() {
  return (
    <section style={{ background: chalk }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
              style={{ background: "rgba(99,102,241,0.12)", color: indigo, border: "1px solid rgba(99,102,241,0.25)" }}>
              Adaptive intelligence
            </div>
            <h2 className="text-4xl font-bold mb-6" style={{ color: navy, letterSpacing: "-0.02em" }}>
              Assessment that gets{" "}
              <span style={{ color: indigo }}>smarter with every session.</span>
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Not a quiz. Not a survey. A scenario-based assessment engine that adapts in real-time to each person's
              responses, probes for contradictions, detects gaming patterns, and produces evidence-grade capability scores
              across six domains.
            </p>
            <div className="flex flex-col gap-4 mb-8">
              {[
                { icon: GitBranch, text: "Adaptive difficulty — scenarios adjust to demonstrated capability level" },
                { icon: Shield, text: "Anti-gaming engine — detects pattern matching, random clicking, and social desirability bias" },
                { icon: Zap, text: "Contradiction probes — follow-up questions when responses are inconsistent" },
                { icon: Lock, text: "Confidence calibration — measures whether people know what they don't know" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: indigo }} />
                  <p className="text-slate-600 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
            <Link href="/how-it-works">
              <Button variant="outline" className="font-semibold" style={{ borderColor: borderL, color: navy }}>
                See how assessment works <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Assessment mockup */}
          <div className="rounded-2xl border p-6 shadow-xl"
            style={{ background: slate, borderColor: "rgba(255,255,255,0.1)", boxShadow: "0 0 60px rgba(99,102,241,0.08)" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: indigo }} />
                <span className="text-white text-sm font-semibold">Scenario 7 of 12</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: "rgba(99,102,241,0.15)", color: indigo }}>
                AI Ethics & Trust
              </span>
            </div>
            <div className="mb-5">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Scenario</p>
              <p className="text-slate-200 text-sm leading-relaxed">
                Your organisation's AI recruitment tool has been flagging candidates from certain postcodes at a higher rate.
                A hiring manager asks you whether this constitutes indirect discrimination under the Equality Act 2010.
              </p>
            </div>
            <div className="mb-5">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Constraint</p>
              <p className="text-slate-300 text-xs leading-relaxed" style={{ color: amber }}>
                The tool vendor says the model is "bias-tested" but won't share the methodology.
              </p>
            </div>
            <div className="mb-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Your response</p>
              <div className="flex flex-col gap-2">
                {[
                  { key: "A", label: "Request the vendor's bias testing methodology before proceeding", sel: false },
                  { key: "B", label: "Commission an independent algorithmic impact assessment", sel: true },
                  { key: "C", label: "Accept the vendor's assurance and continue using the tool", sel: false },
                  { key: "D", label: "Pause the tool immediately pending legal review", sel: false },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                    style={{
                      background: opt.sel ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                      border: opt.sel ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.06)",
                      color: opt.sel ? indigo : "#CBD5E1",
                    }}>
                    <span className="font-bold text-xs w-5 shrink-0">{opt.key}</span>
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Adaptive difficulty: <span style={{ color: indigo }}>Level 4/5</span></span>
              <span className="text-xs text-slate-500">Anti-gaming: <span style={{ color: greenHex }}>Clear</span></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Continuous Loop ----------------------------------------------------------
function ContinuousLoop() {
  return (
    <section style={{ background: navy }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Loop visual */}
          <div className="flex flex-col items-center">
            <div className="relative w-80 h-80">
              {/* Orbit ring */}
              <div className="absolute inset-8 rounded-full border-2 border-dashed"
                style={{ borderColor: "rgba(34,197,94,0.3)" }} />
              {/* Centre */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full flex flex-col items-center justify-center"
                style={{ background: "rgba(34,197,94,0.08)", border: "1.5px solid rgba(34,197,94,0.35)" }}>
                <span className="font-black text-xs text-center" style={{ color: greenHex }}>Continuous<br/>Loop</span>
              </div>
              {/* Four nodes */}
              {([
                { label: "Assess", sub: "Adaptive scenarios", top: "5%", left: "50%", tx: "-50%", ty: "0" },
                { label: "Diagnose", sub: "Gap identification", top: "50%", left: "95%", tx: "-50%", ty: "-50%" },
                { label: "Develop", sub: "Personalised plan", top: "95%", left: "50%", tx: "-50%", ty: "-100%" },
                { label: "Reassess", sub: "Measure change", top: "50%", left: "5%", tx: "-50%", ty: "-50%" },
              ] as const).map(({ label, sub, top, left, tx, ty }) => (
                <div key={label} className="absolute flex flex-col items-center justify-center w-20 h-20 rounded-full text-center"
                  style={{
                    top, left,
                    transform: `translate(${tx || "0"}, ${ty || "0"})`,
                    background: slate,
                    border: "2px solid rgba(34,197,94,0.5)",
                  }}>
                  <span className="font-bold text-white text-xs">{label}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1">{sub}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-white mb-6" style={{ letterSpacing: "-0.02em" }}>
              Measure. <span style={{ color: greenHex }}>Diagnose.</span> Close. Repeat.
            </h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              AiQ is not a one-off diagnostic. It is a continuous intelligence loop. Each cycle produces more precise
              measurement, more targeted development, and clearer evidence of capability change.
            </p>
            <div className="flex flex-col gap-4 mb-8">
              {[
                "Assessment gets sharper with each session — the system learns response patterns",
                "Development is generated for the person, not selected from a generic catalogue",
                "Capability change is measured, not assumed — reassessment proves what worked",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: greenHex }} />
                  <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/beta">
                <Button className="font-semibold" style={{ background: greenHex, color: "white" }}>
                  Join the beta programme for free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
                  See how the loop works <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Six Capability Domains ---------------------------------------------------
function SixDomains() {
  const domains = [
    { name: "AI Interaction", color: "#60A5FA", desc: "Prompting, context-setting, and iterative dialogue with AI systems in HR workflows." },
    { name: "AI Output Evaluation", color: "#C084FC", desc: "Critically assessing AI-generated content for accuracy, bias, and fitness for purpose." },
    { name: "AI Workflow Design", color: "#34D399", desc: "Redesigning HR processes to integrate AI with appropriate human oversight." },
    { name: "Workforce AI Readiness", color: "#FBBF24", desc: "Developing the wider workforce's AI capability as a strategic people priority." },
    { name: "AI Ethics & Trust", color: "#F87171", desc: "Governing AI deployment to protect rights, maintain trust, and satisfy regulators." },
    { name: "AI Change Leadership", color: "#FB923C", desc: "Leading the human side of AI transformation — resistance, confidence, adoption." },
  ];

  return (
    <section style={{ background: chalk }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: navy, letterSpacing: "-0.02em" }}>
            Six capability domains.{" "}
            <span style={{ color: greenHex }}>Every HR role. Every level.</span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
            From foundation literacy through to strategic governance — measured through real scenarios, not self-assessment.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {domains.map((d) => (
            <div key={d.name} className="rounded-2xl p-6 border bg-white"
              style={{ borderColor: `${d.color}35` }}>
              <div className="w-3 h-3 rounded-full mb-4" style={{ background: d.color }} />
              <h3 className="font-bold text-base mb-2" style={{ color: navy }}>{d.name}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Who It's For -------------------------------------------------------------
function WhoItsFor() {
  return (
    <section style={{ background: navy }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
            Built for HR leaders{" "}
            <span style={{ color: greenHex }}>whose business has committed to AI.</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            CPOs, Heads of HR, Heads of Reward, and specialist HR leaders in UK enterprises with 25+ HR people.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              role: "CPO / HR Director",
              desc: "Build whole-function AI strategy. See capability against business AI roadmap. Report to board with evidence.",
              color: greenHex,
            },
            {
              role: "Head of Reward",
              desc: "Build specialist compensation AI strategy. Pay equity, job architecture, total comp. Reward-specific initiatives and assessment.",
              color: indigo,
            },
            {
              role: "HR Team Members",
              desc: "Take adaptive assessments. Get personalised development. Track progress. Use AI Coach for guidance. See capability grow.",
              color: cyan,
            },
          ].map(({ role, desc, color }) => (
            <div key={role} className="rounded-2xl p-7 border"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: `${color}30` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                style={{ background: `${color}15` }}>
                <Users className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="text-white font-bold text-lg mb-3">{role}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Trust & Governance -------------------------------------------------------
function TrustSection() {
  return (
    <section style={{ background: chalk }} className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-8"
          style={{ background: "rgba(34,197,94,0.12)", color: greenHex, border: "1px solid rgba(34,197,94,0.25)" }}>
          <Lock className="w-3 h-3" /> Enterprise-grade governance
        </div>
        <h2 className="text-3xl font-bold mb-6" style={{ color: navy, letterSpacing: "-0.02em" }}>
          Built for the regulatory environment{" "}
          <span style={{ color: greenHex }}>your General Counsel expects.</span>
        </h2>
        <p className="text-slate-600 leading-relaxed mb-8 text-lg max-w-3xl mx-auto">
          UK GDPR compliant. ICO AI Auditing Framework aligned. Equality Act aware. FCA Consumer Duty ready.
          Full audit trail. Decision trace logging. Evidence-grade outputs that withstand scrutiny.
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

// --- Testimonials / Social Proof -----------------------------------------------
function Testimonials() {
  const quotes = [
    {
      quote: "For the first time, I can show the board exactly where our capability gaps are against our AI roadmap — with evidence, not estimates. The strategy builder gave us a framework that our CEO actually engaged with.",
      name: "Sarah Thornton",
      role: "Chief People Officer",
      org: "Northbridge Financial Services",
      color: greenHex,
    },
    {
      quote: "The adaptive assessment is genuinely different. It found specific gaps in my team's AI output evaluation that a generic survey would never have surfaced. The 1:1 prompts it generates save me hours of preparation.",
      name: "Marcus Chen",
      role: "Head of HR Business Partnering",
      org: "Meridian Group",
      color: indigo,
    },
    {
      quote: "We went from 'we probably need some AI training' to a fully costed, board-approved capability strategy in six weeks. The 10-stage process kept us honest — no shortcuts, no hand-waving.",
      name: "Rachel Okafor",
      role: "VP People & Culture",
      org: "Atlas Technologies",
      color: cyan,
    },
    {
      quote: "The Reward mode is exactly what we needed. Our compensation team now has a clear AI strategy that connects to measurable capability targets. The initiative library saved us months of research.",
      name: "James Whitfield",
      role: "Director of Reward",
      org: "Harrington plc",
      color: amber,
    },
  ];

  return (
    <section style={{ background: navy }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ background: "rgba(34,197,94,0.12)", color: greenHex, border: "1px solid rgba(34,197,94,0.25)" }}>
            Beta partner feedback
          </div>
          <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
            What early adopters are{" "}
            <span style={{ color: greenHex }}>saying.</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            From our first cohort of UK HR leaders building AI capability intelligence.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quotes.map(({ quote, name, role, org, color }) => (
            <div key={name} className="rounded-2xl border p-7 relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: `${color}25` }}>
              <div className="absolute top-4 right-6 text-5xl font-black opacity-10" style={{ color }}>
                &ldquo;
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6 relative z-10">
                "{quote}"
              </p>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
                  style={{ background: `${color}25` }}>
                  {name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{name}</p>
                  <p className="text-slate-500 text-xs">{role} — {org}</p>
                </div>
              </div>
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
        <div className="w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #22C55E 0%, transparent 70%)" }} />
      </div>
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-8"
          style={{ background: "rgba(34,197,94,0.15)", color: greenHex, border: "1px solid rgba(34,197,94,0.3)" }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: greenHex }} />
          First cohort — limited places
        </div>
        <h2 className="text-4xl font-black text-white mb-4" style={{ letterSpacing: "-0.03em" }}>
          Build your HR AI strategy with evidence.
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Join the first cohort of UK HR leaders using AiQ to build board-grade AI capability intelligence — from strategy through to measurable capability change.
        </p>
        <p className="text-slate-400 text-sm leading-relaxed mb-10">
          Beta partners get meaningful discount, direct access to the founders, and early influence on the product roadmap.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/beta">
            <Button size="lg" className="font-semibold px-10" style={{ background: greenHex, color: "white" }}>
              Join the beta programme for free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/demo">
            <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 px-8">
              <Play className="mr-2 h-4 w-4" /> Watch platform demo
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// --- Reveal on Scroll Wrapper --------------------------------------------------
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
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(32px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// --- Main Export ---------------------------------------------------------------
export default function MarketingPage() {
  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />
      <Hero />
      <RevealOnScroll><PlatformVideo /></RevealOnScroll>
      <RevealOnScroll delay={50}><PlatformPillars /></RevealOnScroll>
      <RevealOnScroll delay={50}><StrategyBuilder /></RevealOnScroll>
      <RevealOnScroll delay={50}><AssessmentEngine /></RevealOnScroll>
      <RevealOnScroll delay={50}><ContinuousLoop /></RevealOnScroll>
      <RevealOnScroll delay={50}><SixDomains /></RevealOnScroll>
      <RevealOnScroll delay={50}><WhoItsFor /></RevealOnScroll>
      <RevealOnScroll delay={50}><TrustSection /></RevealOnScroll>
      <RevealOnScroll delay={50}><Testimonials /></RevealOnScroll>
      <RevealOnScroll><FinalCTA /></RevealOnScroll>
      <MarketingFooter />
    </div>
  );
}
