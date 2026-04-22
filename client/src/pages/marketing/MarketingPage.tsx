/**
 * AiQ Marketing Landing Page
 *
 * Public page — no authentication required.
 * Routes: / (when unauthenticated) and /about
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

// ─── Data ─────────────────────────────────────────────────────────────────────

const CAPABILITIES = [
  {
    icon: Brain,
    name: "AI Judgement",
    description:
      "Identifies when AI outputs require human verification before acting on them — the single most critical skill for HR professionals using AI tools.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: Shield,
    name: "Governance & Compliance",
    description:
      "Applies data protection, employment law, and organisational policy correctly when AI is involved in HR decisions.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: AlertTriangle,
    name: "Bias & Fairness",
    description:
      "Detects and mitigates AI-amplified bias in recruitment, performance, and compensation workflows.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: TrendingUp,
    name: "Strategic Application",
    description:
      "Selects the right AI tool for the right task and knows when not to use AI — avoiding over-reliance and misapplication.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Users,
    name: "Employee Experience",
    description:
      "Maintains human-centred practice when AI mediates sensitive employee interactions, from wellbeing to disciplinary processes.",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    icon: Lock,
    name: "Data & Privacy",
    description:
      "Handles employee data correctly when feeding HR systems with AI — understanding consent, retention, and access controls.",
    color: "text-slate-600",
    bg: "bg-slate-50",
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
    status: "Beta participant",
  },
  {
    quote:
      "The scenarios feel genuinely realistic — not generic 'AI quiz' questions. My team said it was the first assessment they'd done that actually reflected their day-to-day work.",
    name: "Priya Mehta",
    title: "VP People Operations",
    company: "NovaCare Health",
    size: "85-person HR team",
    status: "Beta participant",
  },
  {
    quote:
      "We needed to demonstrate to our board that our HR function was AI-ready before rolling out Copilot. AiQ gave us the evidence base to do that — and the gaps to address first.",
    name: "James Okafor",
    title: "Head of HR",
    company: "Vertex Retail",
    size: "28-person HR team",
    status: "Beta participant",
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">AiQ</span>
          <Badge variant="secondary" className="text-xs font-medium ml-1">Beta</Badge>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a>
          <a href="#capabilities" className="hover:text-slate-900 transition-colors">Capabilities</a>
          <a href="#beta" className="hover:text-slate-900 transition-colors">Beta programme</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
              Sign in
            </Button>
          </Link>
          <Link href="/beta">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
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
    <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto text-center">
        <Badge className="mb-6 bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100">
          <FlaskConical className="w-3 h-3 mr-1.5" />
          Free beta programme — limited to 25 organisations
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-6">
          Does your HR team know{" "}
          <span className="text-violet-600">when not to trust AI?</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10">
          AiQ is the first adaptive capability assessment built specifically for HR professionals.
          It identifies exactly where your team's AI judgement breaks down — before it causes a
          compliance failure, a biased decision, or a governance breach.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/beta">
            <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white px-8 h-12 text-base font-semibold">
              Apply for the free beta
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="outline" className="px-8 h-12 text-base font-semibold border-slate-300 text-slate-700 hover:bg-slate-50">
              See how it works
            </Button>
          </a>
        </div>
        <p className="mt-5 text-sm text-slate-500">
          Open to organisations with 10+ HR professionals · No credit card required
        </p>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="py-20 px-6 bg-slate-900">
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
              className="flex items-start gap-4 bg-slate-800 rounded-xl p-5"
            >
              <div
                className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  fm.risk === "Critical"
                    ? "bg-red-500"
                    : fm.risk === "High"
                    ? "bg-amber-500"
                    : "bg-yellow-400"
                }`}
              />
              <div>
                <p className="font-semibold text-white text-sm">{fm.label}</p>
                <p className="text-slate-400 text-sm mt-0.5">{fm.description}</p>
              </div>
              <Badge
                className={`ml-auto flex-shrink-0 text-xs ${
                  fm.risk === "Critical"
                    ? "bg-red-900/50 text-red-300 border-red-800"
                    : fm.risk === "High"
                    ? "bg-amber-900/50 text-amber-300 border-amber-800"
                    : "bg-yellow-900/50 text-yellow-300 border-yellow-800"
                }`}
                variant="outline"
              >
                {fm.risk}
              </Badge>
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
          <h2 className="text-3xl font-bold text-slate-900 mb-4">How AiQ works</h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Not a quiz. An adaptive engine that builds a capability profile unique to each person's role.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="flex gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{step.step}</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-16 bg-slate-50 rounded-2xl p-8 border border-slate-200">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-violet-600 mb-2">22</p>
              <p className="text-slate-600 text-sm font-medium">Capability signals measured per session</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-violet-600 mb-2">6</p>
              <p className="text-slate-600 text-sm font-medium">Core capability domains assessed</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-violet-600 mb-2">~35</p>
              <p className="text-slate-600 text-sm font-medium">Minutes per assessment session</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CapabilitiesSection() {
  return (
    <section id="capabilities" className="py-24 px-6 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Six capability domains</h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Every domain is assessed with role-specific scenarios — an HRBP sees different questions
            than a Talent Acquisition specialist or an ER advisor.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CAPABILITIES.map((cap) => (
            <Card key={cap.name} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className={`w-10 h-10 rounded-lg ${cap.bg} flex items-center justify-center mb-4`}>
                  <cap.icon className={`w-5 h-5 ${cap.color}`} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{cap.name}</h3>
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
          <h2 className="text-3xl font-bold text-slate-900 mb-4">From our beta cohort</h2>
          <p className="text-lg text-slate-600">
            Three of the organisations already approved for the beta programme.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="border-slate-200">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed flex-1 mb-5 italic">
                  "{t.quote}"
                </p>
                <div className="border-t border-slate-100 pt-4">
                  <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{t.title} · {t.company}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <Building2 className="w-3 h-3 mr-1" />
                      {t.size}
                    </Badge>
                    <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                      {t.status}
                    </Badge>
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
    <section id="beta" className="py-24 px-6 bg-violet-600">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="mb-5 bg-white/20 text-white border-white/30 hover:bg-white/20">
            <FlaskConical className="w-3 h-3 mr-1.5" />
            Free beta programme
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-5">
            Join the founding cohort
          </h2>
          <p className="text-lg text-violet-100 max-w-2xl mx-auto leading-relaxed">
            We are accepting 25 organisations into the free beta programme. Places are allocated
            on a rolling basis. Applications from organisations with fewer than 10 HR professionals
            are not eligible for this cohort.
          </p>
        </div>
        <div className="bg-white/10 rounded-2xl p-8 mb-10 border border-white/20">
          <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            What beta participants receive
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {BETA_BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-violet-200 flex-shrink-0 mt-0.5" />
                <p className="text-violet-100 text-sm leading-relaxed">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center">
          <Link href="/beta">
            <Button
              size="lg"
              className="bg-white text-violet-700 hover:bg-violet-50 px-10 h-14 text-base font-bold shadow-lg"
            >
              Apply for the free beta
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <p className="mt-4 text-violet-200 text-sm">
            Applications reviewed within 3 business days · No commitment required
          </p>
        </div>
      </div>
    </section>
  );
}

function EligibilitySection() {
  return (
    <section className="py-16 px-6 bg-slate-50 border-t border-slate-200">
      <div className="max-w-3xl mx-auto text-center">
        <h3 className="text-xl font-semibold text-slate-900 mb-3">Beta eligibility criteria</h3>
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
            <div key={item.label} className="bg-white rounded-xl p-5 border border-slate-200">
              <item.icon className="w-6 h-6 text-violet-600 mx-auto mb-3" />
              <p className="font-semibold text-slate-900 text-sm">{item.label}</p>
              <p className="text-slate-500 text-xs mt-1">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10 px-6 bg-slate-900 border-t border-slate-800">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">AiQ</span>
          <span className="text-slate-500 text-sm">· Enterprise HR Capability Intelligence</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <Link href="/beta" className="hover:text-slate-300 transition-colors">Apply for beta</Link>
          <Link href="/login" className="hover:text-slate-300 transition-colors">Sign in</Link>
        </div>
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} AiQ. Assessment results are diagnostic indicators, not employment decisions.
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
