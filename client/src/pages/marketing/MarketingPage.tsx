/**
 * AiQ Marketing Home Page — v3.1 (Sprint 1 visual improvements)
 * Adds: loop diagram, dashboard mockup, hex grid, mid-page CTAs, hero pill + social proof, enhanced footer
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ChevronRight, Target, TrendingUp, BarChart3,
  Users, CheckCircle2, AlertCircle, Clock,
  MessagesSquare, ScanSearch, Workflow, ShieldCheck, Compass } from "lucide-react";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const navy    = "#0F172A";
const slate   = "#1E293B";
const chalk   = "#F8FAFC";
const muted   = "#64748B";
const border  = "rgba(255,255,255,0.08)";
const borderL = "#E2E8F0";
const green   = "var(--primary)";
const greenHex = "#22C55E";

// ─── Shared components ────────────────────────────────────────────────────────
function AiQLogo({ size = 32 }: { size?: number }) {
  // Official AiQ logo — uses the uploaded PNG asset for pixel-perfect rendering
  return (
    <img
      src="/manus-storage/aiq-logo-nav_dd4a0931.png"
      alt="AiQ"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

export function MarketingNav() {
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
            <Button size="sm" className="font-semibold" style={{ background: greenHex, color: "white" }}>Apply for beta</Button>
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
        {/* Footer CTA strip */}
        <div className="rounded-2xl p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div>
            <p className="text-white font-semibold text-lg mb-1">Ready to lead the conversation with evidence?</p>
            <p className="text-slate-400 text-sm">Join the first cohort of UK CPOs building board-grade AI capability intelligence.</p>
          </div>
          <Link href="/beta">
            <Button className="font-semibold shrink-0 px-6" style={{ background: greenHex, color: "white" }}>
              Apply for beta <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/manus-storage/aiq-logo-nav_dd4a0931.png" alt="AiQ" className="h-9 w-9 object-contain" />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">AI capability intelligence for HR functions delivering transformation.</p>
            <p className="text-xs text-slate-500">Built for UK GDPR · ICO guidance · FCA Consumer Duty</p>
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

// ─── Illustration components ──────────────────────────────────────────────────

/** Continuous loop diagram: Assess → Diagnose → Develop → Reassess */
/**
 * Loop diagram — pure CSS/HTML, no SVG text wrapping issues.
 * Four nodes positioned absolutely around a central circle.
 * The orbiting dot uses a CSS keyframe rotate trick so it always works.
 */
/**
 * Loop diagram — pure CSS/HTML.
 * Container: 480×480px. Orbit radius: 160px. Node size: 100px.
 * All nodes fully inside the container (no overflow).
 * Orbiting dot uses CSS keyframe rotate+translateX (reliable cross-browser).
 */
function LoopDiagram() {
  // [label, sub, topPx, leftPx] — node top-left corner in 480px container
  // Centre = (240,240), orbit radius = 160px, node size = 100px
  // Node centre positions: top=(240,80), right=(400,240), bottom=(240,400), left=(80,240)
  // top-left = centre - 50 → (190,30), (350,190), (190,350), (30,190)
  const nodes: [string, string, number, number][] = [
    ["Assess",   "Adaptive scenarios", 30,  190],
    ["Diagnose", "Gap identification",  190, 350],
    ["Develop",  "Personalised plan",   350, 190],
    ["Reassess", "Measure change",      190,  30],
  ];
  return (
    <div className="flex flex-col items-center w-full" aria-hidden="true">
      <style>{`
        @keyframes aiq-orbit {
          from { transform: rotate(0deg)   translateX(160px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(160px) rotate(-360deg); }
        }
        .aiq-orbit-dot { animation: aiq-orbit 6s linear infinite; }
      `}</style>

      {/* Fixed 480×480 container */}
      <div className="relative mx-auto" style={{ width: 480, height: 480 }}>

        {/* Dashed orbit ring — centred at 240,240, radius 160 */}
        <div className="absolute rounded-full pointer-events-none"
          style={{
            top: 80, left: 80, width: 320, height: 320,
            border: "2px dashed rgba(34,197,94,0.3)",
          }} />

        {/* Orbiting dot anchored at centre (240,240) */}
        <div className="absolute aiq-orbit-dot rounded-full pointer-events-none"
          style={{
            top: 240, left: 240,
            width: 14, height: 14,
            marginTop: -7, marginLeft: -7,
            background: greenHex,
            boxShadow: `0 0 10px ${greenHex}, 0 0 20px ${greenHex}55`,
          }} />

        {/* Centre label circle */}
        <div className="absolute flex flex-col items-center justify-center rounded-full"
          style={{
            top: 180, left: 180, width: 120, height: 120,
            background: "rgba(34,197,94,0.08)",
            border: "1.5px solid rgba(34,197,94,0.35)",
          }}>
          <span className="font-black text-sm leading-tight text-center" style={{ color: greenHex }}>
            Continuous<br />Loop
          </span>
        </div>

        {/* Four step nodes */}
        {nodes.map(([label, sub, top, left]) => (
          <div key={label}
            className="absolute flex flex-col items-center justify-center rounded-full text-center"
            style={{
              top, left, width: 100, height: 100,
              background: slate,
              border: "2px solid rgba(34,197,94,0.5)",
            }}>
            <span className="font-bold text-white" style={{ fontSize: 13, lineHeight: 1.2 }}>{label}</span>
            <span className="mt-1 px-2" style={{ fontSize: 10, lineHeight: 1.3, color: "rgba(148,163,184,0.85)" }}>{sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
/** Dashboard mockup for StrategicLayer */
function DashboardMockup() {
  const domains = ["AI Interaction", "AI Output Eval", "Workflow Design", "Workforce Ready", "Ethics & Trust", "Change Leadership"];
  const scores  = [7.2, 6.8, 5.9, 6.4, 7.0, 6.1];
  const target  = 8.0;
  const barW    = 180;
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(15,23,42,0.9)", borderColor: "rgba(34,197,94,0.2)" }} aria-hidden="true">
      <div className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(30,41,59,0.8)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: greenHex }} />
          <span className="text-white text-xs font-semibold">CPO Strategic View</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: "rgba(34,197,94,0.15)", color: greenHex }}>Live</span>
      </div>
      <div className="px-5 py-4 border-b grid grid-cols-3 gap-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {[
          { label: "Current readiness",  value: "67%",       sub: "of target",      color: "#CCBB44" },
          { label: "Projected closure",  value: "Q2 2027",   sub: "3 months early", color: greenHex  },
          { label: "Risk concentration", value: "Sr. HRBPs", sub: "Workflow design", color: "#EE6677" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="text-center">
            <p className="text-xs mb-1" style={{ color: "rgba(148,163,184,0.7)" }}>{label}</p>
            <p className="font-bold text-sm text-white">{value}</p>
            <p className="text-xs mt-0.5" style={{ color }}>{sub}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(148,163,184,0.6)" }}>
          Domain capability vs. target
        </p>
        <div className="flex flex-col gap-2.5">
          {domains.map((d, i) => {
            const pct  = (scores[i] / 10) * 100;
            const tpct = (target / 10) * 100;
            const color = scores[i] >= target ? greenHex : scores[i] >= 6.5 ? "#CCBB44" : "#EE6677";
            return (
              <div key={d}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">{d}</span>
                  <span className="text-xs font-semibold" style={{ color }}>{scores[i].toFixed(1)}</span>
                </div>
                <div className="relative h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", width: barW }}>
                  <div className="absolute h-full rounded-full" style={{ width: `${pct}%`, background: color, opacity: 0.85 }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full"
                    style={{ left: `${tpct}%`, background: "rgba(255,255,255,0.4)" }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-0.5 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
          <span className="text-xs" style={{ color: "rgba(148,163,184,0.6)" }}>Target: {target.toFixed(1)}</span>
        </div>
      </div>
      <div className="px-5 pb-4">
        <div className="rounded-xl p-3 border-l-2" style={{ background: "rgba(34,197,94,0.06)", borderColor: greenHex }}>
          <p className="text-xs italic leading-relaxed" style={{ color: "rgba(226,232,240,0.85)" }}>
            "Gap will close by Q2 2027 — 3 months before launch. Remaining risk concentrated in workflow design among Senior HRBPs."
          </p>
        </div>
      </div>
    </div>
  );
}

/** Floating score card overlay for hero */
function FloatingScoreCard() {
  return (
    <div className="absolute -bottom-4 -left-6 rounded-xl border px-4 py-3 shadow-xl hidden lg:block"
      style={{ background: slate, borderColor: "rgba(34,197,94,0.3)", minWidth: 180 }} aria-hidden="true">
      <p className="text-xs text-slate-400 mb-1">AI Output Evaluation</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black" style={{ color: greenHex }}>7.2</span>
        <span className="text-xs text-slate-400">/ 10</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <TrendingUp className="w-3 h-3" style={{ color: greenHex }} />
        <span className="text-xs" style={{ color: greenHex }}>+1.4 pts since last assessment</span>
      </div>
    </div>
  );
}

// ─── Page sections ────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{ background: navy }} className="pt-20 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Centred pill badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
            style={{ background: "rgba(34,197,94,0.12)", color: greenHex, border: "1px solid rgba(34,197,94,0.3)" }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: greenHex }} />
            Now in beta — first cohort of UK HR leaders open now
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6" style={{ letterSpacing: "-0.03em" }}>
              HR AiQ measures how good your HR people actually are at AI.
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-4">
              <span style={{ color: greenHex, fontWeight: 700 }}>Built for HR. Nothing else like it exists.</span>
            </p>
            <p className="text-slate-400 leading-relaxed mb-10">
              HR AiQ measures your HR people's actual AI capability across six domains. It identifies the specific gaps at individual, team, and function level. It closes them through personalised development. And it measures whether the development worked. So the next time your board asks, you have evidence — not estimates.
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              <Link href="/beta">
                <Button size="lg" className="font-semibold px-8" style={{ background: greenHex, color: "white" }}>
                  Apply for the beta <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline" className="font-semibold px-8 text-white border-white/20 hover:bg-white/10">
                  How AiQ works <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            {/* Social proof */}
            <p className="text-xs text-slate-500 uppercase tracking-wider">Built with input from 40+ UK HR leaders</p>
          </div>
          {/* Product mockup with floating score card */}
          <div className="hidden lg:block relative">
            <FloatingScoreCard />
            <div className="rounded-2xl border p-6 shadow-2xl"
              style={{ background: slate, borderColor: "rgba(255,255,255,0.1)", boxShadow: "0 0 60px rgba(34,197,94,0.08)" }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: greenHex }} />
                  <span className="text-white text-sm font-semibold">Scenario 3 of 12</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: "rgba(34,197,94,0.15)", color: greenHex }}>
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
                    { key: "B", label: "Validate the model output before taking action",                 sel: true  },
                    { key: "C", label: "Escalate to HR leadership to decide",                            sel: false },
                    { key: "D", label: "Dismiss the flag — AI tools are often wrong",                    sel: false },
                  ].map(opt => (
                    <div key={opt.key} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                      style={{
                        background: opt.sel ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
                        border:     opt.sel ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.06)",
                        color:      opt.sel ? greenHex : "#CBD5E1",
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
                  <span className="text-xs font-semibold" style={{ color: greenHex }}>Fairly sure</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full w-3/4" style={{ background: greenHex }} />
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


function WhatItIs() {
  return (
    <section style={{ background: chalk }} className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6" style={{ color: navy, letterSpacing: "-0.02em" }}>
          What HR AiQ is —{" "}
          <span style={{ color: greenHex }}>and what it isn't.</span>
        </h2>
        <p className="text-slate-600 leading-relaxed mb-5 text-lg">
          HR AiQ is a capability intelligence platform built specifically for HR functions. It measures
          your HR people's actual AI capability — not their self-reported confidence, not their training
          completion, not their job title. What they can actually do, under realistic conditions, on
          scenarios that match their role and seniority.
        </p>
        <p className="text-slate-600 leading-relaxed mb-5">
          If you lead a specialist HR area — reward, talent acquisition, L&D, employee relations — HR AiQ
          measures the AI capability that matters for your specific domain. Not generic digital literacy.
          Not a broad AI awareness score. The capability your function needs to govern AI-informed decisions
          in your area of HR, with the rigour your General Counsel and your regulators will expect.
        </p>
        <p className="text-slate-600 leading-relaxed mb-5">
          It is not a learning platform. It is not a survey tool. It is not a consulting engagement.
          It is not an AI tool that assesses your whole organisation. It is not a replacement for your
          existing HR systems. It is the thing that tells you whether your HR function is actually capable
          of doing what your business has committed to — and closes the gap when the answer is no.
        </p>
        <p className="text-slate-700 font-semibold leading-relaxed">
          No other platform does what HR AiQ does. We checked carefully before building it.
        </p>
      </div>
    </section>
  );
}
function BoardQuestions() {
  const questions = [
    {
      num: "01", icon: BarChart3,
      q: "Where is HR right now?",
      body: "Not what people say in surveys. Not what your learning system reports. What your HR people can actually do — tested through real scenarios that match their roles and their seniority.",
    },
    {
      num: "02", icon: Target,
      q: "Where does HR need to be?",
      body: "The skill levels Project Aurora actually needs by Q3 2027. The capabilities Project Phoenix will need across customer-facing roles. The link between what your business has committed to and what HR specifically needs to be good at — with deadlines and role-by-role detail.",
    },
    {
      num: "03", icon: TrendingUp,
      q: "How fast is the gap closing?",
      body: "Whether the development you're paying for is actually working. Which programmes are moving the needle and which aren't. When you'll get there at current pace — and what would be needed to get there faster if the timeline matters.",
    },
  ];
  return (
    <section style={{ background: chalk }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-16">
          <h2 className="text-4xl font-bold mb-4" style={{ color: navy, letterSpacing: "-0.02em" }}>
            Your board will ask three things about HR and AI.{" "}
            <span style={{ color: greenHex }}>Each needs a real answer.</span>
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Most HR leaders can answer the first question with a survey, the second with consultants, and the third only after the fact. HR AiQ answers all three continuously — with evidence solid enough to share with your General Counsel.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {questions.map(({ num, q, body, icon: Icon }) => (
            <div key={num} className="rounded-2xl p-8 border" style={{ background: "white", borderColor: borderL }}>
              <div className="flex items-start gap-4 mb-5">
                <span className="text-3xl font-black" style={{ color: greenHex, lineHeight: 1 }}>{num}</span>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(34,197,94,0.1)" }}>
                  <Icon className="w-5 h-5" style={{ color: greenHex }} />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Loop diagram */}
          <div className="flex flex-col items-center">
            <LoopDiagram />
            <p className="text-slate-400 text-sm text-center mt-6 max-w-sm">
              AiQ is a continuous loop, not a one-off diagnostic. Each cycle produces more precise measurement.
            </p>
          </div>
          <div>
            <h2 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
              Measure. <span style={{ color: greenHex }}>Diagnose.</span> Close.
            </h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              Every HR person in your function takes an adaptive assessment that probes their actual AI capability
              across six domains. The system diagnoses their specific gaps. They receive a personalised development
              plan that closes those gaps. They reassess. The system measures whether each intervention worked.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">Three things make this different from anything else in the market.</p>
            <div className="flex flex-col gap-5 mb-10">
              {differentiators.map(({ title, body }, i) => (
                <div key={i} className="rounded-xl p-5 border" style={{ background: "rgba(255,255,255,0.04)", borderColor: border }}>
                  <div className="flex items-start gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: greenHex }} />
                    <h3 className="font-semibold text-white leading-snug">{title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed pl-8">{body}</p>
                </div>
              ))}
            </div>
            {/* Mid-page CTA */}
            <div className="flex flex-wrap gap-3">
              <Link href="/beta">
                <Button className="font-semibold" style={{ background: greenHex, color: "white" }}>
                  Apply for beta <ArrowRight className="ml-2 h-4 w-4" />
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
      audience: "You", subtitle: "see the function against your business AI roadmap", icon: Target, color: greenHex,
      body: "Where your HR function is now. Where it needs to be by your business's AI initiative deadlines. The specific gap, how fast it's closing, when each business commitment will be met. Which development is actually working and which isn't. The findings that matter, in language your board will understand. Solid enough to share with your General Counsel. Structured for the board.",
    },
  ];
  return (
    <section style={{ background: chalk }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-16">
          <h2 className="text-4xl font-bold mb-4" style={{ color: navy, letterSpacing: "-0.02em" }}>
            Three views of the same loop,{" "}
            <span style={{ color: greenHex }}>each answering a different question.</span>
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
              style={{ background: "rgba(34,197,94,0.15)", color: greenHex, border: "1px solid rgba(34,197,94,0.3)" }}>
              The strategic intelligence layer
            </div>
            <h2 className="text-4xl font-bold text-white mb-6" style={{ letterSpacing: "-0.02em" }}>
              AiQ overlays your function's capability{" "}
              <span style={{ color: greenHex }}>against your business AI roadmap.</span>
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
            <div className="flex flex-wrap gap-3">
              <Link href="/beta">
                <Button className="font-semibold" style={{ background: greenHex, color: "white" }}>
                  Apply for beta <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/product">
                <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
                  See the product <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

function SixDomains() {
  const domains = [
    {
      name: "AI Interaction",
      tier: "Foundation",
      color: "#60A5FA",
      desc: "Prompting, context-setting, and iterative dialogue with AI systems to get reliable, useful outputs in HR workflows.",
      Icon: MessagesSquare,
    },
    {
      name: "AI Output Evaluation",
      tier: "Foundation",
      color: "#C084FC",
      desc: "Critically assessing AI-generated content for accuracy, bias, and fitness for purpose before acting on it.",
      Icon: ScanSearch,
    },
    {
      name: "AI Workflow Design",
      tier: "Operational",
      color: "#34D399",
      desc: "Redesigning HR processes to integrate AI tools safely, with appropriate human oversight at each decision point.",
      Icon: Workflow,
    },
    {
      name: "Workforce AI Readiness",
      tier: "Strategic",
      color: "#FBBF24",
      desc: "Assessing and developing the AI capability of the wider workforce — not just HR — as a strategic people priority.",
      Icon: Users,
    },
    {
      name: "AI Ethics & Employee Trust",
      tier: "Strategic",
      color: "#F87171",
      desc: "Governing AI deployment in ways that protect employee rights, maintain trust, and satisfy regulatory obligations.",
      Icon: ShieldCheck,
    },
    {
      name: "AI Change Leadership",
      tier: "Strategic",
      color: "#FB923C",
      desc: "Leading the human side of AI transformation — managing resistance, building confidence, and sustaining adoption.",
      Icon: Compass,
    },
  ];
  const tierColors: Record<string, string> = {
    Foundation:  "#60A5FA",
    Operational: "#34D399",
    Strategic:   "#FBBF24",
  };
  return (
    <section style={{ background: navy }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ background: "rgba(34,197,94,0.15)", color: greenHex, border: "1px solid rgba(34,197,94,0.3)" }}>
            The measurement framework
          </div>
          <h2 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
            Six capability domains.{" "}
            <span style={{ color: greenHex }}>Every HR role. Every seniority level.</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            AiQ's framework covers the full spectrum of AI capability your HR function needs — from foundation literacy through to strategic governance.
          </p>
        </div>
        {/* Tier legend */}
        <div className="flex flex-wrap justify-center gap-8 mb-10">
          {Object.entries(tierColors).map(([tier, color]) => (
            <div key={tier} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-sm font-semibold" style={{ color }}>{tier}</span>
            </div>
          ))}
        </div>
        {/* Domain cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {domains.map((d) => (
            <div key={d.name} className="rounded-2xl p-6 border flex flex-col gap-4"
              style={{
                background: `${d.color}0F`,
                border: `1px solid ${d.color}35`,
              }}>
              <div className="flex items-start justify-between">
                <d.Icon className="w-6 h-6" style={{ color: d.color, strokeWidth: 1.5 }} />
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: `${tierColors[d.tier]}20`, color: tierColors[d.tier] }}>
                  {d.tier}
                </span>
              </div>
              <h3 className="font-bold text-white text-base leading-snug">{d.name}</h3>
              <p className="text-slate-300 text-sm leading-relaxed flex-1">{d.desc}</p>
              <div className="h-0.5 w-10 rounded-full" style={{ background: d.color }} />
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
            <h2 className="text-4xl font-bold mb-4" style={{ color: navy, letterSpacing: "-0.02em" }}>
              UK enterprise HR leaders{" "}
              <span style={{ color: greenHex }}>whose business has committed to AI.</span>
            </h2>
            <p className="text-slate-600 leading-relaxed mb-8">
              HR AiQ is built for CPOs, Heads of HR, and Heads of specialist HR areas — reward, talent, L&D, and employee relations — leading functions of 25+ HR people in UK enterprises that have made specific AI commitments their HR function is responsible for delivering against.
            </p>
            <p className="font-semibold mb-5" style={{ color: navy }}>You'll recognise yourself if:</p>
            <div className="flex flex-col gap-4">
              {fits.map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: greenHex }} />
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

          </div>
        </div>
      </div>
    </section>
  );
}

function HonestySection() {
  return (
    <section style={{ background: chalk }} className="py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-8"
          style={{ background: "rgba(238,102,119,0.12)", color: "#EE6677", border: "1px solid rgba(238,102,119,0.3)" }}>
          <AlertCircle className="w-3 h-3" /> Honest about limitations
        </div>
        <h2 className="text-3xl font-bold mb-6" style={{ color: navy, letterSpacing: "-0.02em" }}>
          The methodology is rigorous.{" "}
          <span style={{ color: "#EE6677" }}>It is not yet empirically validated at scale.</span>
        </h2>
        <p className="text-slate-600 leading-relaxed mb-6 text-lg">
          AiQ's methodology is rigorous in its design. It is not yet empirically validated against real customer data at scale.
          Beta partners are buying into a methodology that is sound but still maturing — meaningful discount, direct influence
          on the platform's evolution, and the trust that comes from working with a vendor that doesn't pretend to certainty it doesn't yet have.
        </p>
        <p className="text-slate-500 leading-relaxed text-sm">
          We say this upfront because the CPOs and HR Directors we're building for are senior enough to see through
          overclaiming. We'd rather earn trust through honesty than lose it through hype.
        </p>
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
            style={{ background: "rgba(34,197,94,0.15)", color: greenHex, border: "1px solid rgba(34,197,94,0.3)" }}>
            <Clock className="w-3 h-3" /> Why now
          </div>
          <h2 className="text-4xl font-bold text-white mb-6" style={{ letterSpacing: "-0.02em" }}>
            The conversation about AI is moving from{" "}
            <span style={{ color: greenHex }}>'are we adopting it'</span>{" "}
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
              <Button size="lg" className="font-semibold px-8" style={{ background: greenHex, color: "white" }}>
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
    <section className="py-28 px-6 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a2e1a 0%, #0F172A 40%, #0a2e1a 100%)" }}>
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <div className="w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #22C55E 0%, transparent 70%)" }} />
      </div>
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-8"
          style={{ background: "rgba(34,197,94,0.15)", color: greenHex, border: "1px solid rgba(34,197,94,0.3)" }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: greenHex }} />
          First cohort — limited places
        </div>
        <h2 className="text-4xl font-black text-white mb-4" style={{ letterSpacing: "-0.03em" }}>
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
            <Button size="lg" className="font-semibold px-10" style={{ background: greenHex, color: "white" }}>
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

/** Explainer video section — sits between Hero and BoardQuestions */
function ExplainerVideo() {
  return (
    <section style={{ background: navy }} className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Section label */}
        <p className="text-center text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: greenHex }}>
          See how it works
        </p>
        {/* Video container with green glow border */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 0 0 1px rgba(34,197,94,0.25), 0 0 40px rgba(34,197,94,0.08)" }}
        >
          <video
            className="w-full block"
            controls
            preload="metadata"
            style={{ background: "#0F172A" }}
          >
            <source src="/manus-storage/aiq_explainer_v2_1964cbcf.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        {/* Caption */}
        <p className="text-center text-slate-400 text-sm mt-4">
          30 seconds. What AiQ measures, why it matters, and how it works.
        </p>
      </div>
    </section>
  );
}

export default function MarketingPage() {
  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />
      <Hero />
      <ExplainerVideo />
      <WhatItIs />
      <BoardQuestions />
      <MeasureDiagnoseClose />
      <ThreeAltitudes />
      <StrategicLayer />
      <SixDomains />
      <WhoItsFor />
      <WhyNow />
      <HonestySection />
      <FinalCTA />
      <MarketingFooter />
    </div>
  );
}
