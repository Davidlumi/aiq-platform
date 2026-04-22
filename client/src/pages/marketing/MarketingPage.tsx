/**
 * AiQ Marketing Landing Page
 *
 * Public page — no authentication required.
 * Route: /
 *
 * Sections:
 *  1. Nav
 *  2. Hero
 *  3. The Problem
 *  4. The Solution
 *  5. What AiQ Does
 *  6. Example
 *  7. What You Get
 *  8. Why AiQ
 *  9. Beta Programme
 * 10. Why Join Now
 * 11. Final Close / Footer
 *
 * Brand: Dark Slate (#1E293B) nav/hero, Primary Green (#10B981) CTAs,
 *        Mint Accent (#34D399) highlights, AiQ logo with smile.
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Brain,
  Shield,
  Zap,
  Target,
  TrendingUp,
  CheckCircle2,
  Users,
  FlaskConical,
  ChevronRight,
  Eye,
  GitBranch,
  Layers,
} from "lucide-react";

// ─── Brand colours ────────────────────────────────────────────────────────────

const C = {
  darkSlate: "#1E293B",
  deepDark: "#0F172A",
  primaryGreen: "#10B981",
  mintAccent: "#34D399",
  chalk: "#F7F8FA",
  text: "#0E1726",
  muted: "#64748B",
  border: "#E5E7EB",
  // Capability colours
  judgement: "#7C3AED",
  execution: "#2563EB",
  literacy: "#10B981",
  governance: "#DB2777",
  data: "#D97706",
  workflow: "#0891B2",
};

// ─── AiQ Logo ─────────────────────────────────────────────────────────────────

function AiQLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="AiQ logo">
      <circle cx="100" cy="100" r="90" fill={C.darkSlate} />
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
        A<tspan fill={C.mintAccent}>i</tspan>Q
      </text>
      <path
        d="M 60 135 Q 100 150 140 135"
        stroke={C.mintAccent}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav
      className="sticky top-0 z-50 border-b px-6 h-16 flex items-center"
      style={{ background: C.darkSlate, borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AiQLogo size={32} />
          <span className="font-bold text-white text-lg">HR AiQ</span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${C.primaryGreen}20`, color: C.mintAccent, border: `1px solid ${C.primaryGreen}40` }}
          >
            Beta
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-slate-300 hover:text-white text-sm transition-colors">How it works</a>
          <a href="#capabilities" className="text-slate-300 hover:text-white text-sm transition-colors">Capabilities</a>
          <a href="#beta" className="text-slate-300 hover:text-white text-sm transition-colors">Beta programme</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10">
              Sign in
            </Button>
          </Link>
          <Link href="/beta">
            <Button
              size="sm"
              className="font-semibold hover:opacity-90"
              style={{ background: C.primaryGreen, color: "white" }}
            >
              Apply for beta
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative overflow-hidden py-28 px-6"
      style={{ background: `linear-gradient(160deg, ${C.deepDark} 0%, ${C.darkSlate} 60%, #1a3a2a 100%)` }}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(${C.mintAccent} 1px, transparent 1px), linear-gradient(90deg, ${C.mintAccent} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative max-w-4xl mx-auto text-center">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mb-8"
          style={{ background: `${C.primaryGreen}15`, color: C.mintAccent, border: `1px solid ${C.primaryGreen}30` }}
        >
          <FlaskConical className="w-4 h-4" />
          Free beta programme — limited to 25 organisations
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
          See how your people actually{" "}
          <span style={{ color: C.mintAccent }}>make decisions with AI</span>
          {" "}— in the moments that matter
        </h1>

        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-4 leading-relaxed">
          AI is already shaping decisions across your organisation.
        </p>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          AiQ shows how your people use it, where capability falls short, and how to improve it —
          aligned to what your organisation needs.
        </p>

        <p className="text-sm text-slate-500 mb-8">
          Built with forward-thinking organisations adopting AI across HR and operations
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/beta">
            <Button
              size="lg"
              className="h-14 px-8 text-base font-bold hover:opacity-90 gap-2"
              style={{ background: C.primaryGreen, color: "white" }}
            >
              Apply to join the Beta Programme
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-semibold hover:bg-white/10"
              style={{ borderColor: "rgba(255,255,255,0.25)", color: "white", background: "transparent" }}
            >
              Get your organisation's AI capability baseline
            </Button>
          </a>
        </div>

        <p className="text-slate-500 text-sm mt-6">
          Open to organisations with 10+ HR professionals · No credit card required
        </p>
      </div>
    </section>
  );
}

// ─── The Problem ──────────────────────────────────────────────────────────────

function TheProblem() {
  return (
    <section className="py-24 px-6" style={{ background: C.chalk }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#F59E0B20" }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: "#F59E0B" }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#F59E0B" }}>
            The Problem
          </span>
        </div>

        <h2 className="text-4xl font-extrabold mb-6" style={{ color: C.text }}>
          AI adoption is outpacing capability
        </h2>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
              Most organisations don't know:
            </p>
            <div className="space-y-4 mb-8">
              {[
                "How well AI is being used",
                "Whether decisions are sound",
                "Where capability gaps exist",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "#F59E0B20" }}
                  >
                    <span className="w-2 h-2 rounded-full block" style={{ background: "#F59E0B" }} />
                  </div>
                  <p className="text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl p-8"
            style={{ background: C.darkSlate }}
          >
            <p className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-4">
              The real issue isn't knowledge
            </p>
            <p className="text-2xl font-bold text-white mb-4 leading-snug">
              It's <span style={{ color: C.mintAccent }}>judgement</span>.
            </p>
            <p className="text-slate-300 leading-relaxed mb-6">
              How people interpret, trust, and act on AI outputs.
            </p>
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <p className="text-slate-400 text-sm leading-relaxed">
                Most organisations are making AI-driven decisions without ever measuring their quality.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── The Solution ─────────────────────────────────────────────────────────────

function TheSolution() {
  return (
    <section id="how-it-works" className="py-24 px-6" style={{ background: "white" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${C.primaryGreen}20` }}
          >
            <Lightbulb className="w-4 h-4" style={{ color: C.primaryGreen }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.primaryGreen }}>
            The Solution
          </span>
        </div>

        <h2 className="text-4xl font-extrabold mb-4" style={{ color: C.text }}>
          Understand how AI decisions are made, where they fail, and how to improve them — at scale
        </h2>

        <p className="text-lg text-slate-600 mb-12 max-w-2xl leading-relaxed">
          AiQ evaluates real-world AI decision-making, identifies gaps, and delivers targeted
          development to improve performance over time.
        </p>

        {/* What AiQ Does */}
        <div id="capabilities" className="grid sm:grid-cols-2 gap-6">
          {[
            {
              icon: Eye,
              color: C.judgement,
              title: "Reveals how AI is actually being used in real decisions",
            },
            {
              icon: Target,
              color: C.governance,
              title: "Identifies gaps in judgement, execution, and governance",
            },
            {
              icon: BarChart3,
              color: C.execution,
              title: "Shows the gap between current capability and what's needed",
            },
            {
              icon: TrendingUp,
              color: C.primaryGreen,
              title: "Delivers adaptive learning to improve performance",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl p-6 flex items-start gap-4"
              style={{ background: C.chalk, border: `1px solid ${C.border}` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${item.color}15` }}
              >
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <p className="font-semibold leading-snug" style={{ color: C.text }}>
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Example ──────────────────────────────────────────────────────────────────

function Example() {
  return (
    <section className="py-24 px-6" style={{ background: C.chalk }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${C.judgement}20` }}
          >
            <GitBranch className="w-4 h-4" style={{ color: C.judgement }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.judgement }}>
            Example
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-extrabold mb-6" style={{ color: C.text }}>
              An AI tool flags an employee as "high risk."
            </h2>

            <div className="space-y-3 mb-8">
              {[
                { label: "The data is incomplete", color: "#F59E0B" },
                { label: "The model has limitations", color: "#EF4444" },
                { label: "The manager wants immediate action", color: "#8B5CF6" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg px-4 py-3"
                  style={{ background: `${item.color}10`, border: `1px solid ${item.color}30` }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="font-medium text-slate-700">{item.label}</span>
                </div>
              ))}
            </div>

            <p className="text-xl font-bold mb-2" style={{ color: C.text }}>
              Do you trust it, challenge it, or pause?
            </p>
            <p className="text-slate-600 leading-relaxed">
              Most teams would act quickly. Few would validate the model.
            </p>
          </div>

          <div
            className="rounded-2xl p-8"
            style={{ background: C.darkSlate }}
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold mb-6"
              style={{ background: `${C.primaryGreen}20`, color: C.mintAccent }}
            >
              <Brain className="w-3.5 h-3.5" />
              AiQ evaluates
            </div>
            <p className="text-white text-xl font-bold mb-4 leading-snug">
              How decisions are made — not just what people say.
            </p>
            <p className="text-slate-400 leading-relaxed">
              AiQ simulates real scenarios like this one and measures how your people
              actually respond — capturing the judgement, confidence, and reasoning
              behind each choice.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── What You Get ─────────────────────────────────────────────────────────────

function WhatYouGet() {
  return (
    <section className="py-24 px-6" style={{ background: "white" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${C.execution}20` }}
          >
            <BarChart3 className="w-4 h-4" style={{ color: C.execution }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.execution }}>
            What You Get
          </span>
        </div>

        <h2 className="text-4xl font-extrabold mb-4" style={{ color: C.text }}>
          A clear picture of where you are — and a path to where you need to be
        </h2>

        <p className="text-lg text-slate-600 mb-12 max-w-xl leading-relaxed">
          So you can improve performance, reduce risk, and move faster with AI.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Target,
              color: C.primaryGreen,
              title: "A clear baseline of AI capability",
              desc: "Understand exactly where your organisation stands today.",
            },
            {
              icon: AlertTriangle,
              color: "#F59E0B",
              title: "Visibility into gaps and risks",
              desc: "Know where decisions are most likely to go wrong.",
            },
            {
              icon: Brain,
              color: C.judgement,
              title: "Insight into how decisions are made",
              desc: "See the reasoning and confidence behind every choice.",
            },
            {
              icon: TrendingUp,
              color: C.execution,
              title: "A path to improve capability over time",
              desc: "Targeted development that moves the needle on real behaviour.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl p-6"
              style={{ background: C.chalk, border: `1px solid ${C.border}` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${item.color}15` }}
              >
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <h3 className="font-bold mb-2 leading-snug" style={{ color: C.text }}>
                {item.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Why AiQ ──────────────────────────────────────────────────────────────────

function WhyAiQ() {
  return (
    <section className="py-24 px-6" style={{ background: C.darkSlate }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.mintAccent }}>
            Why AiQ
          </span>
        </div>

        <h2 className="text-4xl font-extrabold text-white mb-12">
          Built differently — because the problem is different
        </h2>

        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              icon: Eye,
              title: "Measures real behaviour — not self-assessment",
              desc: "Surveys tell you what people think they do. AiQ shows what they actually do.",
            },
            {
              icon: Zap,
              title: "Simulates real decisions with AI",
              desc: "Scenarios are generated from your sector, roles, and AI tools — not generic case studies.",
            },
            {
              icon: TrendingUp,
              title: "Improves capability, not just diagnoses it",
              desc: "Adaptive learning plans close the gaps AiQ identifies — continuously.",
            },
            {
              icon: Layers,
              title: "Aligns capability to your organisation's goals",
              desc: "Configured to your strategy, risk appetite, and AI adoption roadmap.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl p-6 flex items-start gap-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${C.primaryGreen}20` }}
              >
                <item.icon className="w-5 h-5" style={{ color: C.mintAccent }} />
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Beta Programme ───────────────────────────────────────────────────────────

function BetaProgramme() {
  return (
    <section id="beta" className="py-24 px-6" style={{ background: C.chalk }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${C.primaryGreen}20` }}
          >
            <FlaskConical className="w-4 h-4" style={{ color: C.primaryGreen }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.primaryGreen }}>
            Beta Programme
          </span>
        </div>

        <h2 className="text-4xl font-extrabold mb-4" style={{ color: C.text }}>
          Join the AiQ Beta Programme
        </h2>

        <p className="text-lg text-slate-600 mb-12 max-w-2xl leading-relaxed">
          We're partnering with a select group of organisations to define how AI capability
          is measured and improved.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* What beta partners receive */}
          <div
            className="rounded-2xl p-8"
            style={{ background: "white", border: `1px solid ${C.border}` }}
          >
            <h3 className="font-bold text-lg mb-6" style={{ color: C.text }}>
              What beta partners receive
            </h3>
            <div className="space-y-4">
              {[
                "Full access to the AiQ platform",
                "Organisation-wide assessment of AI decision-making",
                "Insight into capability gaps and behavioural risks",
                "Early access to adaptive learning features",
                "Direct input into product development",
                "Dedicated onboarding and support",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: C.primaryGreen }} />
                  <span className="text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Who should apply */}
          <div
            className="rounded-2xl p-8"
            style={{ background: C.darkSlate }}
          >
            <h3 className="font-bold text-lg text-white mb-6">
              Who should apply
            </h3>
            <p className="text-slate-400 text-sm mb-4">Organisations that are:</p>
            <div className="space-y-3 mb-8">
              {[
                "Actively adopting AI",
                "Serious about capability and performance",
                "Aligning AI to business outcomes",
                "Interested in shaping how this evolves",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.mintAccent }} />
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>
            <div
              className="rounded-xl p-4"
              style={{ background: `${C.primaryGreen}15`, border: `1px solid ${C.primaryGreen}30` }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: C.mintAccent }}>
                Limited beta cohort
              </p>
              <p className="text-slate-400 text-sm leading-relaxed">
                We are onboarding a small number of partners to ensure close collaboration,
                meaningful insight, and real impact. Once the cohort is full, access will close.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mb-6"
            style={{ background: "#F59E0B15", color: "#F59E0B", border: "1px solid #F59E0B30" }}
          >
            <AlertTriangle className="w-4 h-4" />
            Requires 10+ HR professionals · Once the cohort is full, access will close
          </div>
          <br />
          <Link href="/beta">
            <Button
              size="lg"
              className="h-14 px-10 text-base font-bold hover:opacity-90 gap-2"
              style={{ background: C.primaryGreen, color: "white" }}
            >
              Apply to join the Beta Programme
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Why Join Now ─────────────────────────────────────────────────────────────

function WhyJoinNow() {
  return (
    <section className="py-24 px-6" style={{ background: "white" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${C.execution}20` }}
          >
            <Zap className="w-4 h-4" style={{ color: C.execution }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.execution }}>
            Why Join Now
          </span>
        </div>

        <h2 className="text-4xl font-extrabold mb-12" style={{ color: C.text }}>
          Get ahead of the capability curve
        </h2>

        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              icon: Eye,
              color: C.judgement,
              title: "See how AI decisions are actually being made in your organisation",
            },
            {
              icon: Shield,
              color: "#EF4444",
              title: "Identify gaps before they become constraints",
            },
            {
              icon: TrendingUp,
              color: C.primaryGreen,
              title: "Improve decision-making across your teams",
            },
            {
              icon: Users,
              color: C.execution,
              title: "Build capability ahead of competitors",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl p-6 flex items-center gap-4"
              style={{ background: C.chalk, border: `1px solid ${C.border}` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${item.color}15` }}
              >
                <item.icon className="w-6 h-6" style={{ color: item.color }} />
              </div>
              <p className="font-semibold leading-snug" style={{ color: C.text }}>
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final Close ──────────────────────────────────────────────────────────────

function FinalClose() {
  return (
    <section
      className="py-28 px-6 text-center"
      style={{ background: `linear-gradient(160deg, ${C.deepDark} 0%, ${C.darkSlate} 60%, #1a3a2a 100%)` }}
    >
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
          Build the AI capability your organisation{" "}
          <span style={{ color: C.mintAccent }}>actually needs</span>
        </h2>
        <p className="text-xl text-slate-300 mb-4 leading-relaxed">
          Understand where you are, improve how your people use AI, and ensure your
          organisation is ready to deliver on its strategy.
        </p>
        <p className="text-lg text-slate-400 mb-10 font-medium">
          If you don't measure AI capability, you can't improve it.
        </p>
        <Link href="/beta">
          <Button
            size="lg"
            className="h-14 px-10 text-base font-bold hover:opacity-90 gap-2"
            style={{ background: C.primaryGreen, color: "white" }}
          >
            Apply to join the Beta Programme
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <p className="text-slate-500 text-sm mt-6">
          Open to organisations with 10+ HR professionals · No credit card required
        </p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      className="border-t py-10 px-6"
      style={{ background: C.deepDark, borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <AiQLogo size={28} />
          <span className="font-bold text-white">HR AiQ</span>
        </div>
        <p className="text-slate-500 text-sm text-center">
          © {new Date().getFullYear()} AiQ. All rights reserved. Built for forward-thinking HR organisations.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/login">
            <span className="text-slate-500 hover:text-slate-300 text-sm transition-colors cursor-pointer">
              Sign in
            </span>
          </Link>
          <Link href="/beta">
            <span className="text-slate-500 hover:text-slate-300 text-sm transition-colors cursor-pointer">
              Apply for beta
            </span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  return (
    <div className="min-h-screen" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Nav />
      <Hero />
      <TheProblem />
      <TheSolution />
      <Example />
      <WhatYouGet />
      <WhyAiQ />
      <BetaProgramme />
      <WhyJoinNow />
      <FinalClose />
      <Footer />
    </div>
  );
}
