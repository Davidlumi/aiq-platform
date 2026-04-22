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

import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Brain,
  Target,
  FileText,
  Lightbulb,
  User,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

// ─── Radar Chart Component ────────────────────────────────────────────────────

function RadarCapabilityChart({
  capabilities,
}: {
  capabilities: Array<{ key: string; displayName: string; score: number; colour: string }>;
}) {
  const data = capabilities.map(cap => ({
    subject: cap.displayName.replace("AI ", ""),
    score: cap.score,
    fullMark: 100,
  }));
  return (
    <div className="w-full" style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value}`, "Score"]}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#3B4EFF"
            fill="#3B4EFF"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ r: 4, fill: "#3B4EFF", strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Longitudinal Tracking Chart (T3-9) ─────────────────────────────────────

interface LongitudinalEntry {
  sessionId: string;
  completedAt: number | null;
  overallScore: number;
  capabilityScores: Record<string, number>;
  readinessState: string;
}

function LongitudinalChart({ data }: { data: LongitudinalEntry[] }) {
  if (data.length < 2) {
    return (
      <Card className="border-border">
        <CardContent className="p-5 text-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">Longitudinal Tracking</p>
          <p className="text-xs text-muted-foreground mt-1">
            Complete at least 2 assessments to see your capability trend over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((s, i) => ({
    name: s.completedAt
      ? new Date(s.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      : `S${i + 1}`,
    score: Math.round(s.overallScore),
  }));

  const capKeys = Array.from(new Set(data.flatMap(s => Object.keys(s.capabilityScores))));
  const capColors = ["#3B4EFF", "#228833", "#EE6677", "#CCBB44", "#66CCEE", "#AA3377"];

  const capChartData = data.map((s, i) => {
    const entry: Record<string, string | number> = {
      name: s.completedAt
        ? new Date(s.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : `S${i + 1}`,
    };
    capKeys.forEach(k => { entry[k] = Math.round(s.capabilityScores[k] ?? 0); });
    return entry;
  });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#3B4EFF]" />
          Capability Trend
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Overall score and capability scores across your {data.length} completed assessments.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Overall Score</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <ReferenceLine y={70} stroke="#228833" strokeDasharray="4 2" strokeWidth={1}
                label={{ value: "Safe", position: "right", fontSize: 9, fill: "#228833" }} />
              <ReferenceLine y={50} stroke="#CCBB44" strokeDasharray="4 2" strokeWidth={1}
                label={{ value: "At Risk", position: "right", fontSize: 9, fill: "#CCBB44" }} />
              <Line type="monotone" dataKey="score" stroke="#3B4EFF" strokeWidth={2}
                dot={{ r: 4, fill: "#3B4EFF" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {capKeys.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Capability Domains</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={capChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                {capKeys.map((k, i) => (
                  <Line key={k} type="monotone" dataKey={k} stroke={capColors[i % capColors.length]}
                    strokeWidth={1.5} dot={{ r: 3 }}
                    name={k.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2">
              {capKeys.map((k, i) => (
                <div key={k} className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded" style={{ backgroundColor: capColors[i % capColors.length] }} />
                  <span className="text-xs text-muted-foreground">
                    {k.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


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
  const longitudinalData = ((data as any).longitudinalData ?? []) as LongitudinalEntry[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const breakdown = (score.breakdown ?? {}) as any;
  const overallScore = Math.round(score.overallScore ?? 0);
  const readiness = breakdown.readiness as { state?: string; label?: string; description?: string } | undefined;
  const primaryState = (readiness?.state ?? breakdown.primaryState ?? "unknown") as keyof typeof READINESS_CONFIG;
  const credibilityBand = (breakdown.credibilityBand ?? breakdown.credibility_band ?? (breakdown.confidenceProfile as any)?.band ?? "medium") as keyof typeof CREDIBILITY_CONFIG;
  const riskBand = (breakdown.riskBand ?? breakdown.risk_band ?? "medium") as keyof typeof RISK_CONFIG;
  const narrative = (typeof breakdown.narrative === "string" ? breakdown.narrative : (breakdown.narrative as any)?.text) ?? "";
  const llmNarrative = (breakdown.llmNarrative ?? null) as { strengths: string; gaps: string; priorities: string } | null;
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
      {/* ── Three-Layer Tabs ── */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="summary" className="gap-1.5 text-xs">
            <Target className="w-3.5 h-3.5" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="deepdive" className="gap-1.5 text-xs">
            <Brain className="w-3.5 h-3.5" />
            Deep Dive
          </TabsTrigger>
          <TabsTrigger value="development" className="gap-1.5 text-xs">
            <Lightbulb className="w-3.5 h-3.5" />
            Development
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: SUMMARY ── */}
        <TabsContent value="summary" className="space-y-6">

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
                    Model: V9.2 · {breakdown.totalAnswers ?? 0} questions
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
                {/* T2-6: Radar chart overview */}
                {sortedCapabilities.length >= 3 && (
                  <RadarCapabilityChart capabilities={sortedCapabilities} />
                )}
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

          {/* ── Contradiction Profile ── */}
          {breakdown.contradictionProfile && (breakdown.contradictionProfile as any).detected > 0 && (
            <Card className="border-[#EE6677]/30 bg-[#EE6677]/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#EE6677] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground font-sora mb-1">Contradiction Profile</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {(breakdown.contradictionProfile as any).detected} inconsistenc{(breakdown.contradictionProfile as any).detected === 1 ? 'y' : 'ies'} detected across your responses.
                      Contradictions reduce credibility and may indicate uncertainty or inconsistent application of judgement.
                    </p>
                    {(breakdown.contradictionProfile as any).pairs?.length > 0 && (
                      <div className="space-y-2">
                        {(breakdown.contradictionProfile as any).pairs.slice(0, 3).map((pair: any, i: number) => (
                          <div key={i} className="text-xs bg-background/60 rounded-lg p-2.5 border border-[#EE6677]/20">
                            <span className="font-medium text-[#EE6677]">Inconsistency {i + 1}:</span>{" "}
                            {pair.description ?? `Responses to items ${pair.itemA} and ${pair.itemB} were inconsistent.`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Governance Profile ── */}
          {breakdown.governanceProfile && (
            <Card className="border-border">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground font-sora mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#3B4EFF]" />
                  Governance Profile
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Governance Score</p>
                    <p className="text-xl font-bold font-sora text-foreground">
                      {Math.round((breakdown.governanceProfile as any).score ?? 0)}
                      <span className="text-sm font-normal text-muted-foreground">/100</span>
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Governance Band</p>
                    <p className="text-sm font-bold font-sora text-foreground capitalize">
                      {(breakdown.governanceProfile as any).band ?? "Not assessed"}
                    </p>
                  </div>
                </div>
                {(breakdown.governanceProfile as any).bypasses > 0 && (
                  <p className="text-xs text-[#EE6677] mt-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {(breakdown.governanceProfile as any).bypasses} governance bypass{(breakdown.governanceProfile as any).bypasses === 1 ? '' : 'es'} detected.
                    These are flagged for review by your HR governance team.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Score Summary ── */}
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Questions Answered</p>
                  <p className="text-2xl font-bold text-foreground font-sora">
                    {breakdown.totalAnswers ?? 0}
                    <span className="text-sm font-normal text-muted-foreground">/50</span>
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
        </TabsContent>

        {/* ── TAB 2: DEEP DIVE ── */}
        <TabsContent value="deepdive" className="space-y-6">
          {/* T3-9: Longitudinal Tracking Chart */}
          <LongitudinalChart data={longitudinalData} />

          {/* R9: LLM-generated personalised development narrative */}
          {llmNarrative && (
            <Card className="border-[#3B4EFF]/30 bg-[#3B4EFF]/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#3B4EFF]" />
                  Your Development Narrative
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  AI-generated personalised feedback based on your assessment responses and capability profile.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-[#228833] uppercase tracking-wide">Strengths</h4>
                  <p className="text-sm text-foreground leading-relaxed">{llmNarrative.strengths}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-[#EE8866] uppercase tracking-wide">Development Areas</h4>
                  <p className="text-sm text-foreground leading-relaxed">{llmNarrative.gaps}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-[#3B4EFF] uppercase tracking-wide">Priorities</h4>
                  <p className="text-sm text-foreground leading-relaxed">{llmNarrative.priorities}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Capability Breakdown (already rendered in summary, re-render here with more detail) */}
          {sortedCapabilities.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">Capability Breakdown</CardTitle>
                <p className="text-xs text-muted-foreground">Signal-weighted scores across all 6 capability domains.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedCapabilities.map(cap => (
                  <CapabilityBar key={cap.key} displayName={cap.displayName} score={cap.score} colour={cap.colour} />
                ))}
              </CardContent>
            </Card>
          )}
          {/* Signal Profile */}
          {sortedSignals.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">Signal Profile</CardTitle>
                <p className="text-xs text-muted-foreground">Top signals detected across all interactions.</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortedSignals.map(([signal, value]) => {
                    const isPositive = value > 0;
                    return (
                      <div key={signal} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          {isPositive
                            ? <TrendingUp className="w-3.5 h-3.5 text-[#228833]" />
                            : <TrendingDown className="w-3.5 h-3.5 text-[#EE6677]" />}
                          <span className="text-xs text-foreground">{signal.replace(/_/g, " ")}</span>
                        </div>
                        <span className={cn("text-xs font-bold tabular-nums", isPositive ? "text-[#228833]" : "text-[#EE6677]")}
                        >{isPositive ? "+" : ""}{typeof value === "number" ? value.toFixed(1) : value}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Governance Profile */}
          {breakdown.governanceProfile && (
            <Card className="border-border">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground font-sora mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#3B4EFF]" />
                  Governance Profile
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Governance Score</p>
                    <p className="text-xl font-bold font-sora text-foreground">
                      {Math.round((breakdown.governanceProfile as any).score ?? 0)}
                      <span className="text-sm font-normal text-muted-foreground">/100</span>
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Governance Band</p>
                    <p className="text-sm font-bold font-sora text-foreground capitalize">
                      {(breakdown.governanceProfile as any).band ?? "Not assessed"}
                    </p>
                  </div>
                </div>
                {(breakdown.governanceProfile as any).bypasses > 0 && (
                  <p className="text-xs text-[#EE6677] mt-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {(breakdown.governanceProfile as any).bypasses} governance bypass{(breakdown.governanceProfile as any).bypasses === 1 ? '' : 'es'} detected.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── TAB 3: DEVELOPMENT ── */}
        <TabsContent value="development" className="space-y-6">
          {/* Narrative */}
          {narrative && (
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-[#3B4EFF] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#3B4EFF] uppercase tracking-wider mb-1.5">Your Results Narrative</p>
                    <p className="text-sm text-foreground leading-relaxed">{narrative}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Development Recommendations */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#3B4EFF]" />
                Development Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedCapabilities.slice(-3).map(cap => (
                <div key={cap.key} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: cap.colour }} />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{cap.displayName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Score: {cap.score}/100 — Focus area for development. Review governance and validation practices in this domain.
                    </p>
                  </div>
                </div>
              ))}
              {sortedCapabilities.length === 0 && (
                <p className="text-sm text-muted-foreground">Complete more assessments to unlock personalised development recommendations.</p>
              )}
            </CardContent>
          </Card>
          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={() => navigate("/learning")} className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white gap-2">
              <BookOpen className="w-4 h-4" />
              View Learning Plan
            </Button>
            <Button onClick={() => navigate("/assessment")} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Retake Assessment
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
