/**
 * Assessment Results Page — AiQ Enterprise Platform
 *
 * Implements the V9.2 results view specification from Volume 02A:
 * - Readiness State banner (safe / at_risk / unsafe / unknown)
 * - Overall score with credibility and risk indicators
 * - Capability breakdown (6 domains with bars and scores)
 * - Signal profile (positive and risk signals)
 * - Narrative text (learner-facing, from Vol 02A Appendix C)
 * - Actions: View Learning Plan, Back to Dashboard, Retake
 */

import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  Award,
  Shield,
  ArrowLeft,
  BookOpen,
  LayoutDashboard,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Readiness State Config ───────────────────────────────────────────────────

const READINESS_CONFIG = {
  safe: {
    label: "Safe to Deploy",
    description: "You are demonstrating strong, credible AI capability across the assessed domains.",
    icon: CheckCircle2,
    color: "text-[#228833]",
    bg: "bg-[#228833]/6 border-[#228833]/25",
    barColor: "#228833",
    scoreBg: "bg-[#228833]/10",
  },
  at_risk: {
    label: "At Risk",
    description: "You show capability in some areas but evidence suggests risk in higher-stakes AI decisions.",
    icon: AlertTriangle,
    color: "text-[#EE8866]",
    bg: "bg-[#EE8866]/6 border-[#EE8866]/25",
    barColor: "#EE8866",
    scoreBg: "bg-[#EE8866]/10",
  },
  unsafe: {
    label: "Unsafe",
    description: "The current evidence indicates material risk in your AI use. Remediation is required before reassessment.",
    icon: ShieldAlert,
    color: "text-[#EE6677]",
    bg: "bg-[#EE6677]/6 border-[#EE6677]/25",
    barColor: "#EE6677",
    scoreBg: "bg-[#EE6677]/10",
  },
  unknown: {
    label: "Not Assessed",
    description: "Insufficient data to determine a readiness state.",
    icon: HelpCircle,
    color: "text-muted-foreground",
    bg: "bg-muted/20 border-border",
    barColor: "#BBBBBB",
    scoreBg: "bg-muted/20",
  },
} as const;

const CREDIBILITY_CONFIG = {
  high:   { label: "High Credibility",   color: "text-[#228833]", bg: "bg-[#228833]/8" },
  medium: { label: "Medium Credibility", color: "text-[#EE8866]", bg: "bg-[#EE8866]/8" },
  low:    { label: "Low Credibility",    color: "text-[#EE6677]", bg: "bg-[#EE6677]/8" },
} as const;

const RISK_CONFIG = {
  high:   { label: "High Risk",   color: "text-[#EE6677]", bg: "bg-[#EE6677]/8" },
  medium: { label: "Medium Risk", color: "text-[#EE8866]", bg: "bg-[#EE8866]/8" },
  low:    { label: "Low Risk",    color: "text-[#228833]", bg: "bg-[#228833]/8" },
} as const;

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, color, size = 120 }: { score: number; color: string; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-sora" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

// ─── Capability Bar ───────────────────────────────────────────────────────────

function CapabilityBar({
  displayName,
  score,
  colour,
}: {
  displayName: string;
  score: number;
  colour: string;
}) {
  const band = score >= 75 ? "Strong" : score >= 55 ? "Developing" : score >= 35 ? "Needs Work" : "Critical";
  const bandColor = score >= 75 ? "#228833" : score >= 55 ? "#EE8866" : "#EE6677";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{displayName}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: bandColor }}>{band}</span>
          <span className="text-sm font-bold w-8 text-right" style={{ color: colour }}>{score}</span>
        </div>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: colour }}
        />
      </div>
    </div>
  );
}

// ─── Signal Row ───────────────────────────────────────────────────────────────

function SignalRow({ signal, delta }: { signal: string; delta: number }) {
  const isPositive = delta > 0;
  const isRisk = signal.includes("_risk") || signal.includes("_index");
  const displayName = signal.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2">
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5 text-[#228833] shrink-0" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-[#EE6677] shrink-0" />
        )}
        <span className="text-xs text-foreground">{displayName}</span>
        {isRisk && (
          <span className="text-xs text-[#EE8866] bg-[#EE8866]/10 px-1.5 py-0.5 rounded text-[10px]">risk signal</span>
        )}
      </div>
      <span
        className={cn("text-xs font-bold tabular-nums", isPositive ? "text-[#228833]" : "text-[#EE6677]")}
      >
        {isPositive ? "+" : ""}{delta.toFixed(1)}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AssessmentResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = trpc.assessment.results.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, refetchOnWindowFocus: false }
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (error || !data?.score) {
    return (
      <div className="p-6 text-center max-w-2xl">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Results not available</h2>
        <p className="text-muted-foreground text-sm mt-2 mb-6">
          {error ? error.message : "This session has not been completed yet or results are still processing."}
        </p>
        <Button onClick={() => navigate("/assessment")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Assessments
        </Button>
      </div>
    );
  }

  const { score } = data;
  const breakdown = score.breakdown ?? {};
  const overallScore = Math.round(score.overallScore ?? 0);
  const primaryState = (breakdown.primaryState ?? "unknown") as keyof typeof READINESS_CONFIG;
  const credibilityBand = (breakdown.credibilityBand ?? breakdown.credibility_band ?? "medium") as keyof typeof CREDIBILITY_CONFIG;
  const riskBand = (breakdown.riskBand ?? breakdown.risk_band ?? "medium") as keyof typeof RISK_CONFIG;
  const narrative = breakdown.narrative ?? "";
  const capabilityScores = breakdown.capabilityScores ?? {};
  const signalScores = breakdown.signalScores ?? {};

  const stateConfig = READINESS_CONFIG[primaryState] ?? READINESS_CONFIG.unknown;
  const StateIcon = stateConfig.icon;
  const credConfig = CREDIBILITY_CONFIG[credibilityBand] ?? CREDIBILITY_CONFIG.medium;
  const riskConfig = RISK_CONFIG[riskBand] ?? RISK_CONFIG.medium;

  // Sort capabilities by score descending
  const sortedCapabilities = Object.entries(capabilityScores)
    .map(([key, val]: [string, any]) => ({
      key,
      score: typeof val === "object" ? val.score : (val as number),
      displayName: typeof val === "object" ? val.displayName : key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      colour: typeof val === "object" ? val.colour : "#4477AA",
    }))
    .sort((a, b) => b.score - a.score);

  // Sort signals: positive first, then risk signals
  const sortedSignals = Object.entries(signalScores as Record<string, number>)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 12); // Show top 12 signals

  const completedAt = data.session.completedAt
    ? new Date(data.session.completedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown";

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Back nav */}
      <button
        onClick={() => navigate("/assessment")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Assessments
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-sora">Assessment Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AIQ V9.2 Standard Assessment · Completed {completedAt}
        </p>
      </div>

      {/* ── Readiness State Banner ── */}
      <Card className={cn("border-2", stateConfig.bg)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* Score ring */}
            <div className="shrink-0">
              <ScoreRing score={overallScore} color={stateConfig.barColor} size={120} />
            </div>
            {/* State info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <StateIcon className={cn("w-5 h-5", stateConfig.color)} />
                <span className={cn("text-xs font-semibold uppercase tracking-wider", stateConfig.color)}>
                  Readiness State
                </span>
              </div>
              <h2 className={cn("text-2xl font-bold font-sora", stateConfig.color)}>
                {stateConfig.label}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {stateConfig.description}
              </p>
              {/* Credibility + Risk badges */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", credConfig.color, credConfig.bg)}>
                  <Award className="w-3 h-3 inline mr-1" />
                  {credConfig.label}
                </span>
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", riskConfig.color, riskConfig.bg)}>
                  <Shield className="w-3 h-3 inline mr-1" />
                  {riskConfig.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  Model: V9.2 · {breakdown.total ?? 0} questions
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Narrative ── */}
      {narrative && (
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-[#3B4EFF] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#3B4EFF] uppercase tracking-wider mb-1.5">
                  Your Results Narrative
                </p>
                <p className="text-sm text-foreground leading-relaxed">{narrative}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Capability Breakdown ── */}
      {sortedCapabilities.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Capability Breakdown
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Scores are derived from signal-weighted deltas across all 50 interactions.
              Each capability domain maps to multiple performance and risk signals.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedCapabilities.map(cap => (
              <CapabilityBar
                key={cap.key}
                displayName={cap.displayName}
                score={cap.score}
                colour={cap.colour}
              />
            ))}
            {/* Score bands legend */}
            <div className="flex items-center gap-4 pt-2 flex-wrap">
              {[
                { label: "Strong", range: "75–100", color: "#228833" },
                { label: "Developing", range: "55–74", color: "#EE8866" },
                { label: "Needs Work", range: "35–54", color: "#EE6677" },
                { label: "Critical", range: "0–34", color: "#AA3377" },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                  <span className="text-xs text-muted-foreground">{b.label} ({b.range})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Signal Profile ── */}
      {sortedSignals.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Signal Profile
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Cumulative signal deltas from all answered interactions, weighted by risk level and difficulty.
              Positive values indicate capability; negative values indicate risk patterns.
            </p>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40">
              {sortedSignals.map(([signal, delta]) => (
                <SignalRow key={signal} signal={signal} delta={delta as number} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Score Summary ── */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Correct Answers</p>
              <p className="text-2xl font-bold text-foreground font-sora">
                {breakdown.correct ?? 0}
                <span className="text-sm font-normal text-muted-foreground">/{breakdown.total ?? 0}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Overall Score</p>
              <p className="text-2xl font-bold font-sora" style={{ color: stateConfig.barColor }}>
                {overallScore}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Model Version</p>
              <p className="text-sm font-bold text-foreground font-sora">
                {breakdown.modelVersion ?? "V9.2"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Actions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          onClick={() => navigate("/learning")}
          className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white gap-2"
        >
          <BookOpen className="w-4 h-4" />
          View Learning Plan
        </Button>
        <Button
          onClick={() => navigate("/dashboard")}
          variant="outline"
          className="gap-2"
        >
          <LayoutDashboard className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <Button
          onClick={() => navigate("/assessment")}
          variant="outline"
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Retake Assessment
        </Button>
      </div>

      {/* ── Disclaimer ── */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        Results are generated by the AIQ V9.2 signal-delta scoring model. Scores reflect demonstrated
        decision-making patterns in the assessed interactions and are not a measure of general intelligence
        or professional competence. This report is for development purposes only.
      </p>
    </div>
  );
}
