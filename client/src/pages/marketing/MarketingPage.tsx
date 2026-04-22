/**
 * AiQ Marketing Landing Page
 *
 * Public page — no authentication required.
 * Brand: Dark Slate (#1E293B) hero, Primary Green (#10B981) CTAs,
 *        Mint Accent (#34D399) highlights, AiQ logo with smile.
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Brain,
  Shield,
  BarChart3,
  Users,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Zap,
  Lock,
  ChevronRight,
  Star,
  Building2,
  Target,
  FlaskConical,
} from "lucide-react";

// ─── AiQ Logo SVG ─────────────────────────────────────────────────────────────

function AiQLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="AiQ logo">
      <circle cx="100" cy="100" r="90" fill="#1E293B" />
      <text
        x="100"
        y="120"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="64"
        fontWeight="800"
        fill="white"
        textAnchor="middle"
        letterSpacing="-3"
      >
        A<tspan fill="#34D399">i</tspan>Q
      </text>
      <path
        d="M 60 135 Q 100 150 140 135"
        stroke="#34D399"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CAPABILITIES = [
  {
    icon: Brain,
    name: "AI Judgement",
    description:
      "Identifies when AI outputs require human verification before acting on them — the single most critical skill for HR professionals using AI tools.",
    color: "#8B5CF6",
    bg: "#8B5CF615",
  },
  {
    icon: Shield,
    name: "Risk Governance",
    description:
      "Applies data protection, employment law, and organisational policy correctly when AI is involved in HR decisions.",
    color: "#EC4899",
    bg: "#EC489915",
  },
  {
    icon: AlertTriangle,
    name: "AI Literacy",
    description:
      "Detects and mitigates AI-amplified bias in recruitment, performance, and compensation workflows.",
    color: "#10B981",
    bg: "#10B98115",
  },
  {
    icon: TrendingUp,
    name: "AI Execution",
    description:
      "Selects the right AI tool for the right task and knows when not to use AI — avoiding over-reliance and misapplication.",
    color: "#3B82F6",
    bg: "#3B82F615",
  },
  {
    icon: Users,
    name: "Data Stewardship",
    description:
      "Maintains human-centred practice when AI mediates sensitive employee interactions, from wellbeing to disciplinary processes.",
    color: "#F59E0B",
    bg: "#F59E0B15",
  },
  {
    icon: Lock,
    name: "Workflow Collaboration",
    description:
      "Handles employee data correctly when feeding HR systems with AI — understanding consent, retention, and access controls.",
    color: "#06B6D4",
    bg: "#06B6D415",
  },
];

const FAILURE_MODES = [
  {
    label: "Blind AI acceptance",
    description: "Acting on AI output without verification",
    risk: "High",
  },
  {
    label: "Hallucination acceptance",
    description: "Treating fabricated AI content as factual",
    risk: "Critical",
  },
  {
    label: "Governance bypass",
    description: "Skipping policy steps because AI suggested it",
    risk: "High",
  },
  {
    label: "Unsafe HR decisioning",
    description: "Using AI output directly in employment decisions",
    risk: "Critical",
  },
  {
    label: "Over-reliance",
    description: "Delegating professional judgement entirely to AI",
    risk: "High",
  },
  {
    label: "Inappropriate AI usage",
    description: "Using AI in contexts where it should not be used",
    risk: "Medium",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Profile your team",
    description:
      "Each HR professional completes a 3-minute role profile. AiQ selects the right scenario bank for their function — HRBP, ER Specialist, Talent Acquisition, and more.",
  },
  {
    step: "02",
    title: "Adaptive assessment",
    description:
      "The engine generates role-specific scenarios in real time. Questions adapt based on each answer — probing deeper where gaps appear, validating where confidence is high.",
  },
  {
    step: "03",
    title: "Capability profile",
    description:
      "Each person receives a score across 6 capability domains with percentile context, failure mode detection, and a confidence-weighted readiness classification.",
  },
  {
    step: "04",
    title: "Team intelligence",
    description:
      "Managers and HR leaders see aggregate team capability maps, risk heat maps, and prioritised learning recommendations — not just individual scores.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "We had no idea three of our most experienced HRBPs were accepting AI-generated policy summaries without checking them against current legislation. AiQ surfaced that in the first cohort.",
    name: "Sarah Thornton",
    title: "Chief People Officer",
    company: "Meridian Group",
    size: "42-person HR team",
  },
  {
    quote:
      "The scenarios feel genuinely realistic — not generic 'AI quiz' questions. My team said it was the first assessment they'd done that actually reflected their day-to-day work.",
    name: "Priya Mehta",
    title: "VP People Operations",
    company: "NovaCare Health",
    size: "85-person HR team",
  },
  {
    quote:
      "We needed to demonstrate to our board that our HR function was AI-ready before rolling out Copilot. AiQ gave us the evidence base to do that — and the gaps to address first.",
    name: "James Okafor",
    title: "Head of HR",
    company: "Vertex Retail",
    size: "28-person HR team",
  },
];

const BETA_BENEFITS = [
  "Full platform access for your entire HR team — no per-seat limit during beta",
  "Dedicated onboarding session with the AiQ team",
  "Direct input into the product roadmap",
  "Founding customer pricing locked in at beta rates",
  "Priority access to the team intelligence dashboard and manager reports",
  "Co-authorship opportunity on published capability benchmarking research",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1E293B]/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AiQLogo size={36} />
          <div>
            <span className="font-bold text-lg text-white tracking-tight">HR AiQ</span>
            <Badge
              className="ml-2 text-xs font-medium"
              style={{ background: "#10B98120", color: "#34D399", border: "1px solid #10B98140" }}
            >
              Beta
            </Badge>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#capabilities" className="hover:text-white transition-colors">Capabilities</a>
          <a href="#beta" className="hover:text-white transition-colors">Beta programme</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-white/10"
            >
              Sign in
            </Button>
          </Link>
          <Link href="/beta">
            <Button
              size="sm"
              style={{ background: "#10B981", color: "white" }}
              className="hover:opacity-90 font-semibold"
            >
              Apply for beta
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section
      className="pt-32 pb-28 px-6"
      style={{
        background: "linear-gradient(135deg, #1E293B 0%, #0F172A 50%, #1E293B 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto text-center">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mb-8"
          style={{ background: "#10B98120", color: "#34D399", border: "1px solid #10B98140" }}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Free beta programme — limited to 25 organisations
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
          Does your HR team know{" "}
          <span style={{ color: "#34D399" }}>when not to trust AI?</span>
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
          AiQ is the first adaptive capability assessment built specifically for HR professionals.
          It identifies exactly where your team's AI judgement breaks down — before it causes a
          compliance failure, a biased decision, or a governance breach.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/beta">
            <Button
              size="lg"
              className="px-8 h-12 text-base font-bold shadow-lg hover:opacity-90"
              style={{ background: "#10B981", color: "white" }}
            >
              Apply for the free beta
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button
              size="lg"
              variant="outline"
              className="px-8 h-12 text-base font-semibold border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              See how it works
            </Button>
          </a>
        </div>
        <p className="mt-5 text-sm text-slate-400">
          Open to organisations with 10+ HR professionals · No credit card required
        </p>

        {/* Readiness indicator preview */}
        <div className="mt-16 flex flex-wrap justify-center gap-4">
          {[
            { label: "Safe", pct: "92%", color: "#10B981", bg: "#10B98120" },
            { label: "At Risk", pct: "68%", color: "#F59E0B", bg: "#F59E0B20" },
            { label: "Unsafe", pct: "42%", color: "#DC2626", bg: "#DC262620" },
          ].map((r) => (
            <div
              key={r.label}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
              style={{ background: r.bg, color: r.color, border: `1px solid ${r.color}40` }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: r.color }}
              />
              {r.label} — {r.pct}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="py-20 px-6" style={{ background: "#0F172A" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-4">
            The problem no one is measuring
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            HR teams are adopting AI tools faster than they are developing the judgement to use them safely.
            The consequences are not hypothetical.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {FAILURE_MODES.map((fm) => (
            <div
              key={fm.label}
              className="flex items-start gap-4 rounded-xl p-5"
              style={{ background: "#1E293B" }}
            >
              <div
                className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  background:
                    fm.risk === "Critical"
                      ? "#DC2626"
                      : fm.risk === "High"
                      ? "#F59E0B"
                      : "#FCD34D",
                }}
              />
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{fm.label}</p>
                <p className="text-slate-400 text-sm mt-0.5">{fm.description}</p>
              </div>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
                style={{
                  background:
                    fm.risk === "Critical"
                      ? "#DC262620"
                      : fm.risk === "High"
                      ? "#F59E0B20"
                      : "#FCD34D20",
                  color:
                    fm.risk === "Critical"
                      ? "#F87171"
                      : fm.risk === "High"
                      ? "#FCD34D"
                      : "#FDE68A",
                }}
              >
                {fm.risk}
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-slate-500 text-sm mt-8">
          AiQ detects all six failure modes — and eight sub-patterns within them — in a single adaptive session.
        </p>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4" style={{ color: "#0E1726" }}>
            How AiQ works
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Not a quiz. An adaptive engine that builds a capability profile unique to each person's role.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="flex gap-5">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "#10B981" }}
              >
                <span className="text-white font-bold text-sm">{step.step}</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: "#0E1726" }}>
                  {step.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div
          className="mt-16 rounded-2xl p-8 border"
          style={{ background: "#F7F8FA", borderColor: "#E5E7EB" }}
        >
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { value: "22", label: "Capability signals measured per session" },
              { value: "6", label: "Core capability domains assessed" },
              { value: "~35", label: "Minutes per assessment session" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-4xl font-bold mb-2" style={{ color: "#10B981" }}>
                  {stat.value}
                </p>
                <p className="text-slate-600 text-sm font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CapabilitiesSection() {
  return (
    <section id="capabilities" className="py-24 px-6" style={{ background: "#F7F8FA" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4" style={{ color: "#0E1726" }}>
            Six capability domains
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Every domain is assessed with role-specific scenarios — an HRBP sees different questions
            than a Talent Acquisition specialist or an ER advisor.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CAPABILITIES.map((cap) => (
            <Card
              key={cap.name}
              className="hover:shadow-md transition-shadow"
              style={{ borderColor: "#E5E7EB", background: "#FFFFFF" }}
            >
              <CardContent className="p-6">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: cap.bg }}
                >
                  <cap.icon className="w-5 h-5" style={{ color: cap.color }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: "#0E1726" }}>
                  {cap.name}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">{cap.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4" style={{ color: "#0E1726" }}>
            From our beta cohort
          </h2>
          <p className="text-lg text-slate-600">
            Three of the organisations already approved for the beta programme.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} style={{ borderColor: "#E5E7EB" }}>
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed flex-1 mb-5 italic">
                  "{t.quote}"
                </p>
                <div className="border-t pt-4" style={{ borderColor: "#F3F4F6" }}>
                  <p className="font-semibold text-sm" style={{ color: "#0E1726" }}>
                    {t.name}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {t.title} · {t.company}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                      style={{ background: "#F3F4F6", color: "#6B7280" }}
                    >
                      <Building2 className="w-3 h-3" />
                      {t.size}
                    </span>
                    <span
                      className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full"
                      style={{ background: "#10B98115", color: "#059669" }}
                    >
                      Beta participant
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function BetaSection() {
  return (
    <section
      id="beta"
      className="py-24 px-6"
      style={{ background: "#1E293B" }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mb-6"
            style={{ background: "#10B98120", color: "#34D399", border: "1px solid #10B98140" }}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Free beta programme
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-5">
            Join the founding cohort
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            We are accepting 25 organisations into the free beta programme. Places are allocated
            on a rolling basis. Applications from organisations with fewer than 10 HR professionals
            are not eligible for this cohort.
          </p>
        </div>
        <div
          className="rounded-2xl p-8 mb-10"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: "#34D399" }} />
            What beta participants receive
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {BETA_BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#34D399" }} />
                <p className="text-slate-300 text-sm leading-relaxed">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center">
          <Link href="/beta">
            <Button
              size="lg"
              className="px-10 h-14 text-base font-bold shadow-lg hover:opacity-90"
              style={{ background: "#10B981", color: "white" }}
            >
              Apply for the free beta
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <p className="mt-4 text-sm" style={{ color: "#6B7280" }}>
            Applications reviewed within 3 business days · No commitment required
          </p>
        </div>
      </div>
    </section>
  );
}

function EligibilitySection() {
  return (
    <section
      className="py-16 px-6 border-t"
      style={{ background: "#F7F8FA", borderColor: "#E5E7EB" }}
    >
      <div className="max-w-3xl mx-auto text-center">
        <h3 className="text-xl font-semibold mb-3" style={{ color: "#0E1726" }}>
          Beta eligibility criteria
        </h3>
        <p className="text-slate-600 mb-6">
          The free beta programme is designed for organisations with established HR functions.
          To qualify, your organisation must meet all of the following:
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Users, label: "10+ HR professionals", sub: "Minimum team size to qualify" },
            { icon: Target, label: "Active AI adoption", sub: "At least one AI tool in HR workflows" },
            { icon: Building2, label: "Any sector", sub: "Private, public, or third sector" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-5 border"
              style={{ background: "#FFFFFF", borderColor: "#E5E7EB" }}
            >
              <item.icon className="w-6 h-6 mx-auto mb-3" style={{ color: "#10B981" }} />
              <p className="font-semibold text-sm" style={{ color: "#0E1726" }}>
                {item.label}
              </p>
              <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                {item.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      className="py-10 px-6 border-t"
      style={{ background: "#0F172A", borderColor: "#1E293B" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AiQLogo size={28} />
          <span className="font-bold text-white">HR AiQ</span>
          <span className="text-slate-500 text-sm">· Enterprise HR Capability Intelligence</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <Link href="/beta" className="hover:text-slate-300 transition-colors">
            Apply for beta
          </Link>
          <Link href="/login" className="hover:text-slate-300 transition-colors">
            Sign in
          </Link>
        </div>
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} HR AiQ. Assessment results are diagnostic indicators, not employment decisions.
        </p>
      </div>
    </footer>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <NavBar />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <CapabilitiesSection />
        <TestimonialsSection />
        <BetaSection />
        <EligibilitySection />
      </main>
      <Footer />
    </div>
  );
}
