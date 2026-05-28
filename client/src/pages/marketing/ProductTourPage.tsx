/**
 * AiQ Interactive Product Tour — Guided Walkthrough
 * A step-by-step visual tour showing the platform in action without requiring sign-up.
 * Uses simulated UI mockups with animated transitions between steps.
 */
import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ArrowLeft, X, Target, Brain, Search,
  BookOpen, FileText, Sparkles, CheckCircle2, MessageSquare,
  BarChart3, Users, Shield, Layers, TrendingUp, Award,
  ChevronRight, Play, Eye, Compass, LineChart, Building2,
} from "lucide-react";

const navy     = "#0F172A";
const slate    = "#1E293B";
const greenHex = "#22C55E";
const indigo   = "#6366F1";
const amber    = "#F59E0B";
const cyan     = "#06B6D4";
const pink     = "#EC4899";

interface TourStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  highlight: string;
  color: string;
  icon: React.ElementType;
  mockup: React.ReactNode;
}

// --- Simulated UI Mockups for each tour step ---

function StrategyMockup() {
  const stages = [
    "Diagnostic", "Vision", "Strategy", "Principles", "Initiatives",
    "Success Measures", "Business Case", "Capability", "Review", "Board Report"
  ];
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: slate, borderColor: "rgba(255,255,255,0.08)" }}>
      {/* Simulated sidebar + content */}
      <div className="flex">
        <div className="w-48 border-r p-4 hidden md:block" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
              <Target className="w-3 h-3" style={{ color: greenHex }} />
            </div>
            <span className="text-xs text-white font-semibold">Build Strategy</span>
          </div>
          {stages.map((s, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded text-xs"
              style={{ background: i === 4 ? "rgba(34,197,94,0.12)" : "transparent", color: i < 4 ? greenHex : i === 4 ? "white" : "rgba(255,255,255,0.4)" }}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold"
                style={{ background: i < 4 ? greenHex : i === 4 ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)", color: i < 4 ? "white" : i === 4 ? greenHex : "rgba(255,255,255,0.4)" }}>
                {i < 4 ? "✓" : i + 1}
              </div>
              <span>{s}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: greenHex }}>Stage 5 of 10</p>
              <h3 className="text-lg font-bold text-white">Initiative Selection</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 rounded text-[10px] font-semibold" style={{ background: "rgba(34,197,94,0.12)", color: greenHex }}>
                CPO Mode
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-4">Select AI initiatives from the scored library. Each initiative shows value, effort, and risk ratings.</p>
          {/* Initiative cards mockup */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "AI-Powered Talent Matching", score: 8.7, domain: "Talent" },
              { name: "Predictive Attrition Modelling", score: 7.9, domain: "Analytics" },
              { name: "Automated Job Architecture", score: 8.2, domain: "Reward" },
              { name: "AI Performance Calibration", score: 7.4, domain: "Performance" },
            ].map(({ name, score, domain }) => (
              <div key={name} className="rounded-lg p-3 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-white text-xs font-semibold">{name}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: greenHex }}>{score}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">{domain}</span>
                  <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${score * 10}%`, background: greenHex }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Sparkles className="w-3 h-3" style={{ color: indigo }} />
            <span className="text-[10px] text-slate-400">AI Suggest recommends 12 initiatives based on your diagnostic</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssessmentMockup() {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: slate, borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="p-6">
        {/* Progress header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5" style={{ color: indigo }} />
            <span className="text-white font-semibold text-sm">Adaptive Assessment</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Question 7 of 15</span>
            <div className="w-24 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: "47%", background: indigo }} />
            </div>
          </div>
        </div>
        {/* Scenario */}
        <div className="rounded-lg p-5 mb-4 border" style={{ background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.15)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: indigo }}>Scenario</p>
          <p className="text-white text-sm leading-relaxed">
            Your organisation has deployed an AI tool for initial CV screening. A hiring manager reports that the tool appears to be filtering out candidates from certain universities. The tool's vendor says the algorithm is "proprietary and cannot be audited."
          </p>
        </div>
        <div className="rounded-lg p-4 mb-4 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-semibold text-slate-400 mb-2">Constraint</p>
          <p className="text-slate-300 text-sm">You have a board meeting in 48 hours where AI governance will be discussed. The CEO has publicly committed to "responsible AI."</p>
        </div>
        {/* Options */}
        <div className="flex flex-col gap-2">
          {[
            "Immediately suspend the tool and notify affected candidates",
            "Request an independent audit of the algorithm before taking action",
            "Escalate to legal and pause new screening while investigating",
            "Document the concern and raise at the board meeting for guidance",
          ].map((opt, i) => (
            <div key={i} className="rounded-lg p-3 border cursor-pointer transition-all"
              style={{ background: i === 2 ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)", borderColor: i === 2 ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)" }}>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5"
                  style={{ borderColor: i === 2 ? indigo : "rgba(255,255,255,0.2)", background: i === 2 ? indigo : "transparent" }}>
                  {i === 2 && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <p className="text-sm" style={{ color: i === 2 ? "white" : "rgba(255,255,255,0.6)" }}>{opt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiagnosisMockup() {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: slate, borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Search className="w-5 h-5" style={{ color: cyan }} />
          <span className="text-white font-semibold text-sm">Capability Diagnosis</span>
        </div>
        {/* Capability radar mockup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Domain Scores</p>
            {[
              { domain: "AI Output Evaluation", score: 7.2, color: greenHex },
              { domain: "Governance & Ethics", score: 8.1, color: greenHex },
              { domain: "Workflow Integration", score: 5.4, color: amber },
              { domain: "Data Interpretation", score: 6.8, color: greenHex },
              { domain: "Risk Assessment", score: 4.2, color: pink },
              { domain: "Strategic Application", score: 6.1, color: amber },
            ].map(({ domain, score, color }) => (
              <div key={domain} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300">{domain}</span>
                  <span className="text-xs font-bold" style={{ color }}>{score}/10</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${score * 10}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Key Finding</p>
            <div className="rounded-lg p-4 border-l-3" style={{ background: "rgba(6,182,212,0.05)", borderLeftColor: cyan, borderLeftWidth: 3 }}>
              <p className="text-slate-300 text-xs leading-relaxed italic">
                "Your Risk Assessment capability shows a specific gap in hallucination recognition. You correctly identify bias in AI outputs but are more trusting of factual claims. This matters because your role involves validating AI-generated workforce planning recommendations."
              </p>
            </div>
            <div className="mt-4 rounded-lg p-3 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-semibold text-slate-400 mb-1">READINESS STATE</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: amber }} />
                <span className="text-sm text-white font-semibold">Developing</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">2 domains require targeted development before AI initiative deployment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DevelopmentMockup() {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: slate, borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="w-5 h-5" style={{ color: amber }} />
          <span className="text-white font-semibold text-sm">Personalised Development</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Learning pathway */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Your Learning Pathway</p>
            {[
              { title: "Hallucination Recognition Fundamentals", status: "completed", duration: "25 min" },
              { title: "Evaluating AI Workforce Recommendations", status: "in-progress", duration: "30 min" },
              { title: "Risk Assessment in AI-Augmented Decisions", status: "locked", duration: "35 min" },
              { title: "Governance Frameworks for HR AI Tools", status: "locked", duration: "20 min" },
            ].map(({ title, status, duration }, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: status === "completed" ? greenHex : status === "in-progress" ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)" }}>
                  {status === "completed" ? <CheckCircle2 className="w-3 h-3 text-white" /> :
                   status === "in-progress" ? <Play className="w-3 h-3" style={{ color: amber }} /> :
                   <span className="text-[8px] text-slate-500">{i + 1}</span>}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white">{title}</p>
                  <p className="text-[10px] text-slate-500">{duration}</p>
                </div>
              </div>
            ))}
          </div>
          {/* AI Coach */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">AI Coach</p>
            <div className="rounded-lg border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
                    <MessageSquare className="w-3 h-3" style={{ color: amber }} />
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: "rgba(245,158,11,0.05)" }}>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      I notice you scored well on bias detection but struggled with hallucination recognition. Let's explore why factual claims from AI feel more trustworthy than they should...
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 justify-end">
                  <div className="rounded-lg p-2.5" style={{ background: "rgba(99,102,241,0.08)" }}>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      I think it's because the data looks so precise — numbers feel factual even when they're generated.
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.15)" }}>
                    <span className="text-[10px] font-bold" style={{ color: indigo }}>ST</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardReportMockup() {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: slate, borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-5 h-5" style={{ color: greenHex }} />
          <span className="text-white font-semibold text-sm">Board-Ready Report</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Function Readiness", value: "67%", trend: "+12% from baseline", color: greenHex },
            { label: "Critical Gaps", value: "3", trend: "Down from 7", color: amber },
            { label: "On-Track Initiatives", value: "8/12", trend: "2 at risk", color: indigo },
          ].map(({ label, value, trend, color }) => (
            <div key={label} className="rounded-lg p-4 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-[10px] mt-1" style={{ color }}>{trend}</p>
            </div>
          ))}
        </div>
        {/* Report preview */}
        <div className="rounded-lg border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-white">Executive Summary</p>
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.12)", color: greenHex }}>Auto-generated</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            "The HR function's AI readiness has improved from 55% to 67% over the past quarter. Three critical capability gaps remain concentrated in Risk Assessment and Workflow Integration domains. Eight of twelve planned AI initiatives are on track for deployment, with two requiring additional capability development before the Q3 milestone..."
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-500">12 pages</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-500">Evidence-backed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-500">Board-ready format</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamIntelligenceMockup() {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: slate, borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-5 h-5" style={{ color: pink }} />
          <span className="text-white font-semibold text-sm">Team Intelligence</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team heatmap */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Capability Heatmap</p>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 30 }).map((_, i) => {
                const intensity = [0.2, 0.4, 0.6, 0.8, 1.0][Math.floor(Math.random() * 5)];
                const hue = intensity > 0.6 ? greenHex : intensity > 0.3 ? amber : pink;
                return (
                  <div key={i} className="aspect-square rounded-sm" style={{ background: `${hue}${Math.round(intensity * 60).toString(16).padStart(2, "0")}` }} />
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ background: `${pink}60` }} />
                <span className="text-[9px] text-slate-500">Gap</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ background: `${amber}60` }} />
                <span className="text-[9px] text-slate-500">Developing</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ background: `${greenHex}60` }} />
                <span className="text-[9px] text-slate-500">Ready</span>
              </div>
            </div>
          </div>
          {/* Risk alerts */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Risk Alerts</p>
            {[
              { alert: "3 team members below threshold for Project Aurora", severity: "high" },
              { alert: "Governance capability declining in HRBP cohort", severity: "medium" },
              { alert: "New hire onboarding gap in AI output evaluation", severity: "low" },
            ].map(({ alert, severity }, i) => (
              <div key={i} className="flex items-start gap-2 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ background: severity === "high" ? pink : severity === "medium" ? amber : "rgba(255,255,255,0.3)" }} />
                <p className="text-xs text-slate-300">{alert}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Tour Page ---
export default function ProductTourPage() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const steps: TourStep[] = [
    {
      id: 0,
      title: "Build Your AI Strategy",
      subtitle: "10-Stage Strategy Builder",
      description: "Start with a company diagnostic, define your AI vision, select from 68 scored initiatives, and build a board-ready strategy. AI suggests at every stage — you decide.",
      highlight: "Choose CPO mode for whole-function strategy or Reward mode for specialist compensation AI.",
      color: greenHex,
      icon: Target,
      mockup: <StrategyMockup />,
    },
    {
      id: 1,
      title: "Measure Actual Capability",
      subtitle: "Adaptive Assessment Engine",
      description: "Each team member takes a role-calibrated assessment using real-world scenarios. The system adapts in real-time — probing deeper where it detects variance in judgement.",
      highlight: "79+ scenarios across 6 capability domains. Gets more precise with each session.",
      color: indigo,
      icon: Brain,
      mockup: <AssessmentMockup />,
    },
    {
      id: 2,
      title: "Get Specific Diagnoses",
      subtitle: "Articulated Capability Findings",
      description: "Not just scores — specific diagnoses that explain the failure mode, the context where it surfaces, and what closing the gap requires. Each diagnosis is linked to your business AI initiatives.",
      highlight: "The diagnosis drives everything: development plans, manager conversations, and board reporting.",
      color: cyan,
      icon: Search,
      mockup: <DiagnosisMockup />,
    },
    {
      id: 3,
      title: "Close Gaps with Targeted Development",
      subtitle: "AI Coach + Learning Pathways",
      description: "Personalised development plans generated for each person's specific gaps. An AI Coach provides context-aware guidance. Learning modules are calibrated to role, sector, and failure mode.",
      highlight: "Development happens in the platform. No LMS switching. The loop closes cleanly.",
      color: amber,
      icon: BookOpen,
      mockup: <DevelopmentMockup />,
    },
    {
      id: 4,
      title: "See Your Team's Intelligence",
      subtitle: "Function-Level Readiness View",
      description: "A live view of where your function is against where it needs to be. Capability heatmaps, risk alerts, and per-initiative gap analysis — updated every time someone completes an assessment or module.",
      highlight: "Identify exactly which team members need support for which AI initiatives.",
      color: pink,
      icon: Users,
      mockup: <TeamIntelligenceMockup />,
    },
    {
      id: 5,
      title: "Report to Your Board with Evidence",
      subtitle: "Board-Ready Output",
      description: "Generate board-grade reports with real capability data, gap analysis, investment recommendations, and projected closure timelines. Evidence-backed. Defensible. Designed for a 5-minute read.",
      highlight: "The evidence chain: gap was X, intervention was Y, gap is now Z. Development ROI proven.",
      color: greenHex,
      icon: FileText,
      mockup: <BoardReportMockup />,
    },
  ];

  const goToStep = useCallback((step: number) => {
    if (step === currentStep || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(step);
      setIsTransitioning(false);
    }, 200);
  }, [currentStep, isTransitioning]);

  const next = () => {
    if (currentStep < steps.length - 1) goToStep(currentStep + 1);
  };
  const prev = () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") setLocation("/");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const step = steps[currentStep];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: navy }}>
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b px-4 py-3 flex items-center justify-between"
        style={{ background: navy, borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-sm font-semibold text-white">Product Tour</span>
          <span className="text-xs text-slate-500">Step {currentStep + 1} of {steps.length}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Step dots */}
          <div className="hidden md:flex items-center gap-1.5">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => goToStep(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: i === currentStep ? step.color : i < currentStep ? `${step.color}60` : "rgba(255,255,255,0.15)",
                  transform: i === currentStep ? "scale(1.5)" : "scale(1)",
                }}
              />
            ))}
          </div>
          <Link href="/beta">
            <Button size="sm" className="font-semibold text-xs" style={{ background: greenHex, color: "white" }}>
              Join the beta programme for free <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left panel - step info */}
        <div className="lg:w-[380px] p-6 lg:p-8 flex flex-col justify-center border-r"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className={`transition-all duration-300 ${isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ background: `${step.color}15` }}>
              <step.icon className="w-6 h-6" style={{ color: step.color }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: step.color }}>
              {step.subtitle}
            </p>
            <h2 className="text-2xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
              {step.title}
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              {step.description}
            </p>
            <div className="rounded-lg p-3 border mb-6" style={{ background: `${step.color}08`, borderColor: `${step.color}20` }}>
              <p className="text-xs leading-relaxed" style={{ color: step.color }}>
                {step.highlight}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={prev}
                disabled={currentStep === 0}
                className="text-white border-white/20 hover:bg-white/10 disabled:opacity-30">
                <ArrowLeft className="h-3 w-3 mr-1" /> Back
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button
                  size="sm"
                  onClick={next}
                  className="font-semibold"
                  style={{ background: step.color, color: "white" }}>
                  Next <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                <Link href="/beta">
                  <Button size="sm" className="font-semibold" style={{ background: greenHex, color: "white" }}>
                    Join the beta programme for free <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right panel - mockup */}
        <div className="flex-1 p-6 lg:p-8 flex items-center justify-center overflow-auto">
          <div className={`w-full max-w-3xl transition-all duration-300 ${isTransitioning ? "opacity-0 scale-98" : "opacity-100 scale-100"}`}>
            {step.mockup}
          </div>
        </div>
      </div>

      {/* Bottom progress bar */}
      <div className="h-1" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${((currentStep + 1) / steps.length) * 100}%`,
            background: `linear-gradient(90deg, ${step.color}, ${steps[Math.min(currentStep + 1, steps.length - 1)].color})`,
          }}
        />
      </div>
    </div>
  );
}
