/**
 * AiQ Marketing Landing Page — v3
 *
 * Claude feedback improvements applied:
 *  P1 — Split hero with product mockup card + logo strip
 *  P2 — "How AiQ Works" horizontal flow diagram (replaces Solution card grid)
 *  P3 — Unified "AiQ" branding (removed "HR AiQ")
 *  P4 — New headline: "Measure how your people actually use AI. Then improve it."
 *  P5 — "See inside an AiQ assessment" section with dashboard mockup
 *  P6 — Numbered tags (01/02/03/04) replace generic icons in card grids
 *  P7 — "Why Join Now" merged into Beta Programme section
 *  P8 — Removed "Built with forward-thinking organisations" line
 *  P9 — Removed duplicate eligibility line from hero
 *  P10 — Final Close has a visual outcome diagram
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  TrendingUp,
  ChevronRight,
  TrendingDown,
  Minus,
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
  interaction: "#2563EB",
  outputEval: "#7C3AED",
  workflow: "#0D9488",
  ethics: "#DB2777",
  change: "#D97706",
  readiness: "#059669",

};

// ─── AiQ Logo ─────────────────────────────────────────────────────────────────

function AiQLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="AiQ logo">
      <circle cx="100" cy="100" r="90" fill={C.darkSlate} />
      <text
        x="100" y="120"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="64" fontWeight="800"
        fill="white" textAnchor="middle" letterSpacing="-3"
      >
        A<tspan fill={C.mintAccent}>i</tspan>Q
      </text>
      <path d="M 60 135 Q 100 150 140 135" stroke={C.mintAccent} strokeWidth="5" fill="none" strokeLinecap="round" />
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
          <AiQLogo size={30} />
          <span className="font-bold text-white text-lg tracking-tight">AiQ</span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${C.primaryGreen}20`, color: C.mintAccent, border: `1px solid ${C.primaryGreen}40` }}
          >
            Beta
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-slate-300 hover:text-white text-sm transition-colors">How it works</a>
          <a href="#inside" className="text-slate-300 hover:text-white text-sm transition-colors">The product</a>
          <a href="#beta" className="text-slate-300 hover:text-white text-sm transition-colors">Beta programme</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10">
              Sign in
            </Button>
          </Link>
          <Link href="/beta">
            <Button size="sm" className="font-semibold hover:opacity-90" style={{ background: C.primaryGreen, color: "white" }}>
              Apply for beta
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Product Mockup Card ──────────────────────────────────────────────────────

function ProductMockup() {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: "#1a2744", border: "1px solid rgba(255,255,255,0.12)" }}
    >
      {/* Card header */}
      <div
        className="px-5 py-3 flex items-center justify-between border-b"
        style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: C.mintAccent }} />
          <span className="text-xs font-semibold text-slate-300">Scenario 3 of 12</span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: `${C.outputEval}30`, color: "#C4B5FD" }}
        >
          AI Output Evaluation
        </span>
      </div>

      {/* Scenario */}
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: C.muted }}>
          Scenario
        </p>
        <p className="text-white text-sm leading-relaxed mb-5">
          An AI tool flags an employee as <span style={{ color: "#FCA5A5" }}>"high risk"</span> for
          involuntary turnover. The data is 6 months old, the model confidence is 61%, and your
          manager is asking for immediate action.
        </p>

        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: C.muted }}>
          What do you do?
        </p>

        <div className="space-y-2 mb-5">
          {[
            { label: "Act on the flag immediately — schedule a retention conversation", selected: false, quality: "risk" },
            { label: "Validate the model output before taking action", selected: true, quality: "strong" },
            { label: "Escalate to HR leadership to decide", selected: false, quality: "weak" },
            { label: "Dismiss the flag — AI tools are often wrong", selected: false, quality: "risk" },
          ].map((opt, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg px-4 py-3 text-sm transition-all"
              style={{
                background: opt.selected
                  ? `${C.primaryGreen}20`
                  : "rgba(255,255,255,0.04)",
                border: opt.selected
                  ? `1px solid ${C.primaryGreen}60`
                  : "1px solid rgba(255,255,255,0.08)",
                color: opt.selected ? C.mintAccent : "#CBD5E1",
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{
                  background: opt.selected ? C.primaryGreen : "rgba(255,255,255,0.1)",
                  color: opt.selected ? "white" : "#94A3B8",
                }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              {opt.label}
            </div>
          ))}
        </div>

        {/* Confidence bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-400">Confidence</span>
            <span className="text-xs font-semibold" style={{ color: C.mintAccent }}>Fairly sure</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-2 rounded-full" style={{ background: C.primaryGreen, width: "68%" }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-500">Guessing</span>
            <span className="text-xs text-slate-500">Certain</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative overflow-hidden py-20 px-6"
      style={{ background: `linear-gradient(160deg, ${C.deepDark} 0%, ${C.darkSlate} 60%, #1a3a2a 100%)` }}
    >
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(${C.mintAccent} 1px, transparent 1px), linear-gradient(90deg, ${C.mintAccent} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mb-8"
              style={{ background: `${C.primaryGreen}15`, color: C.mintAccent, border: `1px solid ${C.primaryGreen}30` }}
            >
              <FlaskConical className="w-4 h-4" />
              Free beta programme — limited to 25 organisations
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              Measure how your people actually use AI.{" "}
              <span style={{ color: C.mintAccent }}>Then improve it.</span>
            </h1>

            <p className="text-lg text-slate-300 mb-10 leading-relaxed">
              AiQ simulates real AI decisions, reveals where capability falls short, and closes
              the gap — at scale across your organisation.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/beta">
                <Button
                  size="lg"
                  className="h-13 px-7 text-base font-bold hover:opacity-90 gap-2"
                  style={{ background: C.primaryGreen, color: "white" }}
                >
                  Apply for beta
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-13 px-7 text-base font-semibold hover:bg-white/10"
                  style={{ borderColor: "rgba(255,255,255,0.25)", color: "white", background: "transparent" }}
                >
                  See how it works
                </Button>
              </a>
            </div>

            <p className="text-slate-500 text-sm mt-5">
              Open to organisations with 10+ HR professionals · No credit card required
            </p>
          </div>

          {/* Right: product mockup */}
          <div className="lg:pl-6">
            <ProductMockup />
          </div>
        </div>

        {/* Beta partners strip */}
        <div className="mt-16 pt-10 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-center text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: C.muted }}>
            Beta partners revealed on announcement
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-8 rounded"
                style={{ background: "rgba(255,255,255,0.08)", width: `${80 + i * 12}px` }}
              />
            ))}
          </div>
        </div>
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
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#F59E0B" }}>
            The Problem
          </span>
        </div>

        <h2 className="text-4xl font-extrabold mb-6" style={{ color: C.text }}>
          AI adoption is outpacing capability
        </h2>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-lg text-slate-600 mb-6 leading-relaxed">Most organisations don't know:</p>
            <div className="space-y-4 mb-8">
              {[
                "How well AI is being used",
                "Whether decisions are sound",
                "Where capability gaps exist",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: "#F59E0B" }} />
                  <p className="text-slate-700 text-lg">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-8" style={{ background: C.darkSlate }}>
            <p className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-4">
              The real issue isn't knowledge
            </p>
            <p className="text-2xl font-bold text-white mb-4 leading-snug">
              It's <span style={{ color: C.mintAccent }}>practical AI capability</span>.
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

// ─── How AiQ Works (flow diagram) ────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Configure",
      desc: "Your context, sector, roles, and AI tools",
      color: "#64748B",
      bg: "rgba(100,116,139,0.12)",
    },
    {
      num: "02",
      title: "Simulate",
      desc: "Real-world decisions your people actually face",
      color: C.interaction,
      bg: `${C.interaction}15`,
    },
    {
      num: "03",
      title: "Measure",
      desc: "Judgement, confidence, and capability gaps",
      color: C.primaryGreen,
      bg: `${C.primaryGreen}15`,
    },
    {
      num: "04",
      title: "Improve",
      desc: "Adaptive learning plans that close the gap",
      color: C.change,
      bg: `${C.change}15`,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6" style={{ background: "white" }}>
      <div className="max-w-5xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.primaryGreen }}>
          How AiQ Works
        </span>

        <h2 className="text-4xl font-extrabold mt-3 mb-4" style={{ color: C.text }}>
          From context to continuous improvement
        </h2>
        <p className="text-lg text-slate-600 mb-14 max-w-xl leading-relaxed">
          AiQ evaluates real-world AI decision-making, identifies gaps, and delivers targeted
          development to improve performance over time.
        </p>

        {/* Flow diagram */}
        <div className="relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0">
            {steps.map((step, i) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                {/* Connector arrow (desktop) */}
                {i < steps.length - 1 && (
                  <div
                    className="hidden lg:flex absolute top-10 left-[calc(50%+48px)] right-0 items-center z-10"
                    style={{ width: "calc(100% - 48px)" }}
                  >
                    <div className="flex-1 h-px" style={{ background: C.border }} />
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: C.muted }} />
                  </div>
                )}

                {/* Step circle */}
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 relative z-20"
                  style={{ background: step.bg, border: `2px solid ${step.color}30` }}
                >
                  <span className="text-2xl font-black" style={{ color: step.color, fontVariantNumeric: "tabular-nums" }}>
                    {step.num}
                  </span>
                </div>

                <h3 className="font-bold text-lg mb-2" style={{ color: C.text }}>{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed px-2">{step.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm mt-10" style={{ color: C.muted }}>
            Runs continuously — each <span className="font-semibold" style={{ color: C.change }}>Improve</span> cycle feeds the next{" "}
            <span className="font-semibold" style={{ color: C.interaction }}>Simulate</span>.
          </p>
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
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.outputEval }}>
          Example
        </span>

        <div className="grid md:grid-cols-2 gap-12 items-center mt-4">
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

          <div className="rounded-2xl p-8" style={{ background: C.darkSlate }}>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold mb-6"
              style={{ background: `${C.primaryGreen}20`, color: C.mintAccent }}
            >
              AiQ evaluates
            </div>
            <p className="text-white text-xl font-bold mb-4 leading-snug">
              How decisions are made — not just what people say.
            </p>
            <p className="text-slate-400 leading-relaxed">
              AiQ simulates real scenarios like this one and measures how your people
              actually respond — capturing the capability, confidence, and reasoning
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
  const items = [
    {
      num: "01",
      color: C.primaryGreen,
      title: "A clear baseline of AI capability",
      desc: "Understand exactly where your organisation stands today.",
    },
    {
      num: "02",
      color: "#F59E0B",
      title: "Visibility into gaps and risks",
      desc: "Know where decisions are most likely to go wrong.",
    },
    {
      num: "03",
      color: C.outputEval,
      title: "Insight into how decisions are made",
      desc: "See the reasoning and confidence behind every choice.",
    },
    {
      num: "04",
      color: C.interaction,
      title: "A path to improve capability over time",
      desc: "Targeted development that moves the needle on real behaviour.",
    },
  ];

  return (
    <section className="py-24 px-6" style={{ background: "white" }}>
      <div className="max-w-5xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.interaction }}>
          What You Get
        </span>

        <h2 className="text-4xl font-extrabold mt-3 mb-4" style={{ color: C.text }}>
          A clear picture of where you are — and a path to where you need to be
        </h2>
        <p className="text-lg text-slate-600 mb-12 max-w-xl leading-relaxed">
          So you can improve performance, reduce risk, and move faster with AI.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.num}
              className="rounded-xl p-6"
              style={{ background: C.chalk, border: `1px solid ${C.border}` }}
            >
              <span
                className="text-3xl font-black block mb-4"
                style={{ color: item.color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
              >
                {item.num}
              </span>
              <h3 className="font-bold mb-2 leading-snug" style={{ color: C.text }}>{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── See Inside an AiQ Assessment ────────────────────────────────────────────

function SeeInside() {
  return (
    <section id="inside" className="py-24 px-6" style={{ background: C.chalk }}>
      <div className="max-w-5xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.primaryGreen }}>
          The Product
        </span>

        <div className="grid lg:grid-cols-2 gap-12 items-start mt-4">
          <div>
            <h2 className="text-4xl font-extrabold mb-4" style={{ color: C.text }}>
              See inside an AiQ assessment
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Every assessment produces a capability dashboard showing exactly where your
              people's AI capability is strong, where it breaks down, and how it compares
              to what your organisation needs.
            </p>
          </div>

          {/* Dashboard mockup */}
          <div
            className="rounded-2xl overflow-hidden shadow-xl"
            style={{ background: "#1a2744", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            {/* Header */}
            <div
              className="px-5 py-3 flex items-center justify-between border-b"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <span className="text-sm font-semibold text-white">Capability Dashboard</span>
              <span className="text-xs text-slate-400">Sarah T. · HR Business Partner</span>
            </div>

            <div className="p-5 space-y-5">
              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Judgement quality", value: "62", unit: "/100", trend: "up", color: "#F59E0B" },
                  { label: "Model validation rate", value: "34", unit: "%", trend: "down", color: "#EF4444" },
                  { label: "Capability gap", value: "−18", unit: "pts", trend: "neutral", color: "#8B5CF6" },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <p className="text-xs text-slate-400 mb-1 leading-tight">{m.label}</p>
                    <p className="text-xl font-black" style={{ color: m.color }}>
                      {m.value}<span className="text-xs font-normal text-slate-400">{m.unit}</span>
                    </p>
                    <div className="flex justify-center mt-1">
                      {m.trend === "up" && <TrendingUp className="w-3 h-3" style={{ color: C.primaryGreen }} />}
                      {m.trend === "down" && <TrendingDown className="w-3 h-3" style={{ color: "#EF4444" }} />}
                      {m.trend === "neutral" && <Minus className="w-3 h-3" style={{ color: C.muted }} />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Capability bars */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: C.muted }}>
                  Capability breakdown
                </p>
                <div className="space-y-2.5">
                  {[
                    { cap: "AI Interaction", score: 74, color: C.interaction },
                    { cap: "Output Evaluation", score: 62, color: C.outputEval },
                    { cap: "Workflow Design", score: 55, color: C.workflow },
                    { cap: "Ethics & Trust", score: 48, color: C.ethics },
                    { cap: "Change Leadership", score: 58, color: C.change },
                  ].map((c) => (
                    <div key={c.cap}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-300">{c.cap}</span>
                        <span className="text-xs font-semibold" style={{ color: c.color }}>{c.score}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div className="h-1.5 rounded-full" style={{ background: c.color, width: `${c.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flagged insight */}
              <div
                className="rounded-xl p-4"
                style={{ background: "#EF444410", border: "1px solid #EF444430" }}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: "#FCA5A5" }}>
                      Flagged finding
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Model validation rate (34%) is 28 points below benchmark for this role.
                      High-confidence incorrect answers detected on 3 ethics scenarios.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Why AiQ ──────────────────────────────────────────────────────────────────

function WhyAiQ() {
  const items = [
    {
      num: "01",
      title: "Measures real behaviour — not self-assessment",
      desc: "Surveys tell you what people think they do. AiQ shows what they actually do.",
    },
    {
      num: "02",
      title: "Simulates real decisions with AI",
      desc: "Scenarios are generated from your sector, roles, and AI tools — not generic case studies.",
    },
    {
      num: "03",
      title: "Improves capability, not just diagnoses it",
      desc: "Adaptive learning plans close the gaps AiQ identifies — continuously.",
    },
    {
      num: "04",
      title: "Aligns capability to your organisation's goals",
      desc: "Configured to your strategy, risk appetite, and AI adoption roadmap.",
    },
  ];

  return (
    <section className="py-24 px-6" style={{ background: C.darkSlate }}>
      <div className="max-w-5xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.mintAccent }}>
          Why AiQ
        </span>

        <h2 className="text-4xl font-extrabold text-white mt-3 mb-12">
          Built differently — because the problem is different
        </h2>

        <div className="grid sm:grid-cols-2 gap-6">
          {items.map((item) => (
            <div
              key={item.num}
              className="rounded-xl p-6 flex items-start gap-5"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <span
                className="text-3xl font-black flex-shrink-0"
                style={{ color: C.mintAccent, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
              >
                {item.num}
              </span>
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

// ─── Beta Programme (with Why Join Now merged in) ─────────────────────────────

function BetaProgramme() {
  return (
    <section id="beta" className="py-24 px-6" style={{ background: C.chalk }}>
      <div className="max-w-5xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.primaryGreen }}>
          Beta Programme
        </span>

        <h2 className="text-4xl font-extrabold mt-3 mb-4" style={{ color: C.text }}>
          Join the AiQ Beta Programme
        </h2>
        <p className="text-lg text-slate-600 mb-12 max-w-2xl leading-relaxed">
          We're partnering with a select group of organisations to define how AI capability
          is measured and improved.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* What beta partners receive */}
          <div
            className="md:col-span-1 rounded-2xl p-8"
            style={{ background: "white", border: `1px solid ${C.border}` }}
          >
            <h3 className="font-bold text-lg mb-6" style={{ color: C.text }}>
              What you receive
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
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.primaryGreen }} />
                  <span className="text-slate-700 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Who should apply + Why join now */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-2xl p-8" style={{ background: C.darkSlate }}>
              <h3 className="font-bold text-lg text-white mb-5">Who should apply</h3>
              <p className="text-slate-400 text-sm mb-4">Organisations that are:</p>
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {[
                  "Actively adopting AI",
                  "Serious about capability and performance",
                  "Aligning AI to business outcomes",
                  "Interested in shaping how this evolves",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.mintAccent }} />
                    <span className="text-slate-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: `${C.primaryGreen}15`, border: `1px solid ${C.primaryGreen}30` }}
              >
                <p className="text-sm font-semibold mb-1" style={{ color: C.mintAccent }}>
                  Limited cohort — once full, access closes
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We are onboarding a small number of partners to ensure close collaboration,
                  meaningful insight, and real impact.
                </p>
              </div>
            </div>

            {/* Why join now — as bullets inside the beta section */}
            <div
              className="rounded-2xl p-8"
              style={{ background: "white", border: `1px solid ${C.border}` }}
            >
              <h3 className="font-bold text-lg mb-5" style={{ color: C.text }}>
                Why join now
              </h3>
              <div className="space-y-3">
                {[
                  "See how AI decisions are actually being made in your organisation",
                  "Identify gaps before they become constraints",
                  "Improve decision-making across your teams",
                  "Build capability ahead of competitors",
                ].map((item, i) => (
                  <div key={item} className="flex items-start gap-3">
                    <span
                      className="text-sm font-black flex-shrink-0 w-6"
                      style={{ color: C.primaryGreen }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-slate-700 text-sm">{item}</span>
                  </div>
                ))}
              </div>
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

// ─── Final Close ──────────────────────────────────────────────────────────────

function FinalClose() {
  const outcomes = [
    { label: "Measure", desc: "Real AI decision behaviour across your organisation", color: C.interaction },
    { label: "Identify", desc: "Capability gaps and behavioural risks before they cause harm", color: "#F59E0B" },
    { label: "Improve", desc: "Targeted learning that closes the gap — continuously", color: C.primaryGreen },
    { label: "Align", desc: "AI capability to your strategy and risk appetite", color: C.outputEval },
  ];

  return (
    <section
      className="py-28 px-6"
      style={{ background: `linear-gradient(160deg, ${C.deepDark} 0%, ${C.darkSlate} 60%, #1a3a2a 100%)` }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
              Build the AI capability your organisation{" "}
              <span style={{ color: C.mintAccent }}>actually needs</span>
            </h2>
            <p className="text-xl text-slate-300 mb-4 leading-relaxed">
              Understand where you are, improve how your people use AI, and ensure your
              organisation is ready to deliver on its strategy.
            </p>
            <p className="text-lg font-semibold mb-10" style={{ color: C.mintAccent }}>
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
            <p className="text-slate-500 text-sm mt-5">
              Open to organisations with 10+ HR professionals · No credit card required
            </p>
          </div>

          {/* Outcome diagram */}
          <div className="space-y-3">
            {outcomes.map((o) => (
              <div
                key={o.label}
                className="flex items-start gap-4 rounded-xl p-5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span
                  className="text-sm font-black flex-shrink-0 w-20"
                  style={{ color: o.color }}
                >
                  {o.label}
                </span>
                <p className="text-slate-300 text-sm leading-relaxed">{o.desc}</p>
              </div>
            ))}
          </div>
        </div>
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
          <span className="font-bold text-white tracking-tight">AiQ</span>
        </div>
        <p className="text-slate-500 text-sm text-center">
          © {new Date().getFullYear()} AiQ. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/login">
            <span className="text-slate-500 hover:text-slate-300 text-sm transition-colors cursor-pointer">Sign in</span>
          </Link>
          <Link href="/beta">
            <span className="text-slate-500 hover:text-slate-300 text-sm transition-colors cursor-pointer">Apply for beta</span>
          </Link>
          <Link href="/methodology">
            <span className="text-slate-500 hover:text-slate-300 text-sm transition-colors cursor-pointer">Methodology</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <TheProblem />
      <HowItWorks />
      <Example />
      <WhatYouGet />
      <SeeInside />
      <WhyAiQ />
      <BetaProgramme />
      <FinalClose />
      <Footer />
    </div>
  );
}
